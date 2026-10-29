/**
 * NetMap 3D — Система Raycasting и 3D Drag-and-Drop
 * Обеспечивает интерактивный выбор узлов, перемещение устройств мышью в 3D и всплывающие подсказки.
 */

import { sounds } from '../audio/sound-effects.js';

export class SceneRaycaster {
    constructor(sceneManager, networkGraph, connectionMeshManager, deviceMeshesMap) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;
        this.camera = sceneManager.camera;
        this.domElement = sceneManager.getDomElement();
        this.networkGraph = networkGraph;
        this.connectionMeshManager = connectionMeshManager;
        this.deviceMeshesMap = deviceMeshesMap; // Map: nodeId -> THREE.Group

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Параметры перетаскивания (Drag & Drop)
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // горизонтальная плоскость Y=0
        this.planeIntersect = new THREE.Vector3();
        this.isDragging = false;
        this.draggedNodeGroup = null;
        this.dragOffset = new THREE.Vector3();

        // Состояние выбора и наведения
        this.selectedNodeId = null;
        this.hoveredNodeId = null;

        // Callback слушатели событий
        this.onNodeSelectedCallback = null;
        this.onNodeHoverCallback = null;
        this.onEmptyClickCallback = null;

        // Всплывающая подсказка (Tooltip) в DOM
        this.tooltipEl = document.getElementById('node-tooltip');

        this.initEvents();
    }

    initEvents() {
        this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
        window.addEventListener('pointerup', this.onPointerUp.bind(this));
    }

    setNodeSelectedCallback(cb) {
        this.onNodeSelectedCallback = cb;
    }

    setNodeHoverCallback(cb) {
        this.onNodeHoverCallback = cb;
    }

    setEmptyClickCallback(cb) {
        this.onEmptyClickCallback = cb;
    }

    updateMousePosition(event) {
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    onPointerMove(event) {
        this.updateMousePosition(event);

        // 1. Если сейчас происходит перетаскивание узла
        if (this.isDragging && this.draggedNodeGroup) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersect)) {
                const newX = Math.round((this.planeIntersect.x - this.dragOffset.x) * 10) / 10;
                const newZ = Math.round((this.planeIntersect.z - this.dragOffset.z) * 10) / 10;

                // Обновляем позицию 3D-группы узла
                this.draggedNodeGroup.position.x = newX;
                this.draggedNodeGroup.position.z = newZ;

                // Обновляем все подключенные 3D кабели в реальном времени
                const nodeId = this.draggedNodeGroup.userData.nodeId;
                const nodeData = this.networkGraph.getNode(nodeId);
                if (nodeData) {
                    nodeData.x = newX;
                    nodeData.z = newZ;
                }
                this.connectionMeshManager.updateLinksForNode(nodeId);
            }
            return;
        }

        // 2. Определение наведения (Hover)
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectable = Array.from(this.deviceMeshesMap.values());
        const intersects = this.raycaster.intersectObjects(intersectable, true);

        if (intersects.length > 0) {
            const hitGroup = this.findParentDeviceGroup(intersects[0].object);
            if (hitGroup) {
                const nodeId = hitGroup.userData.nodeId;
                if (this.hoveredNodeId !== nodeId) {
                    this.hoveredNodeId = nodeId;
                    this.domElement.style.cursor = 'grab';
                    this.showTooltip(event, nodeId);
                } else {
                    this.updateTooltipPos(event);
                }
                return;
            }
        }

        if (this.hoveredNodeId !== null) {
            this.hoveredNodeId = null;
            this.domElement.style.cursor = 'default';
            this.hideTooltip();
        }
    }

    onPointerDown(event) {
        if (event.button !== 0) return; // только левая кнопка мыши

        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersectable = Array.from(this.deviceMeshesMap.values());
        const intersects = this.raycaster.intersectObjects(intersectable, true);

        if (intersects.length > 0) {
            const hitGroup = this.findParentDeviceGroup(intersects[0].object);
            if (hitGroup) {
                const nodeId = hitGroup.userData.nodeId;

                // Начинаем перетаскивание
                this.isDragging = true;
                this.draggedNodeGroup = hitGroup;
                this.domElement.style.cursor = 'grabbing';
                this.sceneManager.controls.setEnabled(false); // отключаем вращение камеры

                // Вычисляем смещение точки клика относительно центра объекта
                if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersect)) {
                    this.dragOffset.set(
                        this.planeIntersect.x - hitGroup.position.x,
                        0,
                        this.planeIntersect.z - hitGroup.position.z
                    );
                }

                // Выделяем узел
                this.selectNode(nodeId);
                return;
            }
        }

        // Клик по пустому пространству
        this.deselectNode();
        if (typeof this.onEmptyClickCallback === 'function') {
            this.onEmptyClickCallback();
        }
    }

    onPointerUp(event) {
        if (this.isDragging && this.draggedNodeGroup) {
            const nodeId = this.draggedNodeGroup.userData.nodeId;
            const finalPos = this.draggedNodeGroup.position;

            // Сохраняем итоговые координаты в NetworkGraph
            this.networkGraph.updateNode(nodeId, {
                x: Math.round(finalPos.x * 10) / 10,
                z: Math.round(finalPos.z * 10) / 10
            });

            this.isDragging = false;
            this.draggedNodeGroup = null;
            this.domElement.style.cursor = this.hoveredNodeId ? 'grab' : 'default';
            this.sceneManager.controls.setEnabled(true);
        }
    }

    findParentDeviceGroup(object) {
        let curr = object;
        while (curr) {
            if (curr.userData && curr.userData.isDeviceNode) {
                return curr;
            }
            curr = curr.parent;
        }
        return null;
    }

    selectNode(nodeId) {
        if (this.selectedNodeId === nodeId) return;

        // Снимаем выделение с предыдущего
        if (this.selectedNodeId) {
            const prevGroup = this.deviceMeshesMap.get(this.selectedNodeId);
            if (prevGroup) {
                const ring = prevGroup.getObjectByName('selection_ring');
                if (ring) ring.visible = false;
            }
        }

        this.selectedNodeId = nodeId;
        const group = this.deviceMeshesMap.get(nodeId);
        if (group) {
            const ring = group.getObjectByName('selection_ring');
            if (ring) ring.visible = true;
            sounds.playSelect();

            if (typeof this.onNodeSelectedCallback === 'function') {
                const nodeData = this.networkGraph.getNode(nodeId);
                this.onNodeSelectedCallback(nodeData);
            }
        }
    }

    deselectNode() {
        if (this.selectedNodeId) {
            const prevGroup = this.deviceMeshesMap.get(this.selectedNodeId);
            if (prevGroup) {
                const ring = prevGroup.getObjectByName('selection_ring');
                if (ring) ring.visible = false;
            }
            this.selectedNodeId = null;
            if (typeof this.onNodeSelectedCallback === 'function') {
                this.onNodeSelectedCallback(null);
            }
        }
    }

    showTooltip(event, nodeId) {
        if (!this.tooltipEl) return;
        const node = this.networkGraph.getNode(nodeId);
        if (!node) return;

        this.tooltipEl.innerHTML = `
            <div class="tt-header">
                <span class="tt-status-dot ${node.status}"></span>
                <span class="tt-name">${this.escapeHTML(node.name)}</span>
            </div>
            <div class="tt-row"><span>IP:</span> <strong>${node.ip}</strong></div>
            <div class="tt-row"><span>Тип:</span> <strong>${this.formatType(node.type)}</strong></div>
            <div class="tt-hint">Клик для настройки | Зажмите для перемещения</div>
        `;

        this.tooltipEl.style.display = 'block';
        this.updateTooltipPos(event);
    }

    updateTooltipPos(event) {
        if (!this.tooltipEl) return;
        this.tooltipEl.style.left = `${event.clientX + 16}px`;
        this.tooltipEl.style.top = `${event.clientY + 16}px`;
    }

    hideTooltip() {
        if (this.tooltipEl) {
            this.tooltipEl.style.display = 'none';
        }
    }

    formatType(type) {
        const types = {
            computer: 'Компьютер',
            laptop: 'Ноутбук',
            router: 'Маршрутизатор',
            switch: 'Коммутатор',
            server: 'Сервер',
            firewall: 'Межсетевой экран',
            cloud: 'Облако',
            database: 'База данных'
        };
        return types[type] || type;
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag));
    }
}

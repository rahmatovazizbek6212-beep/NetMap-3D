/**
 * NetMap 3D — Инструмент визуального интерактивного соединения устройств
 */

import { sounds } from '../audio/sound-effects.js';

export class ConnectTool {
    constructor(sceneManager, networkGraph, raycaster) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;
        this.camera = sceneManager.camera;
        this.domElement = sceneManager.getDomElement();
        this.networkGraph = networkGraph;
        this.raycaster = raycaster;

        this.isActive = false;
        this.sourceNodeId = null;

        // Временная 3D-направляющая линия от узла к курсору мыши
        this.guideLine = null;
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.planeIntersect = new THREE.Vector3();

        // UI-панель режима соединения
        this.bannerEl = document.getElementById('connect-mode-banner');
        this.bannerTextEl = document.getElementById('connect-mode-text');

        this.initGuideLine();
        this.initEvents();
    }

    initGuideLine() {
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(),
            new THREE.Vector3()
        ]);
        const mat = new THREE.LineDashedMaterial({
            color: 0x00ff9d,
            dashSize: 1,
            gapSize: 0.5,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });
        this.guideLine = new THREE.Line(geo, mat);
        this.guideLine.computeLineDistances();
        this.guideLine.visible = false;
        this.scene.add(this.guideLine);
    }

    initEvents() {
        this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.deactivate();
            }
        });
    }

    activate() {
        this.isActive = true;
        this.sourceNodeId = null;
        this.guideLine.visible = false;

        if (this.bannerEl) {
            this.bannerEl.style.display = 'flex';
            this.bannerTextEl.textContent = 'Режим соединения: Выберите первое устройство (источник)';
        }

        this.domElement.style.cursor = 'crosshair';
        sounds.playClick();
    }

    deactivate() {
        this.isActive = false;
        this.sourceNodeId = null;
        this.guideLine.visible = false;

        if (this.bannerEl) {
            this.bannerEl.style.display = 'none';
        }

        this.domElement.style.cursor = 'default';
        sounds.playClick();
    }

    toggle() {
        if (this.isActive) this.deactivate();
        else this.activate();
    }

    onPointerMove(event) {
        if (!this.isActive || !this.sourceNodeId) return;

        const rect = this.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const ray = new THREE.Raycaster();
        ray.setFromCamera(mouse, this.camera);

        if (ray.ray.intersectPlane(this.dragPlane, this.planeIntersect)) {
            const srcNode = this.networkGraph.getNode(this.sourceNodeId);
            if (srcNode) {
                const posAttr = this.guideLine.geometry.attributes.position;
                posAttr.setXYZ(0, srcNode.x, 1.2, srcNode.z);
                posAttr.setXYZ(1, this.planeIntersect.x, 1.2, this.planeIntersect.z);
                posAttr.needsUpdate = true;
                this.guideLine.computeLineDistances();
            }
        }
    }

    /**
     * Обработка клика по узлу в режиме соединения
     * @returns {boolean} true если клик был обработан инструментом соединения
     */
    handleNodeClick(nodeData) {
        if (!this.isActive || !nodeData) return false;

        if (!this.sourceNodeId) {
            // Выбран источник
            this.sourceNodeId = nodeData.id;
            this.guideLine.visible = true;

            const posAttr = this.guideLine.geometry.attributes.position;
            posAttr.setXYZ(0, nodeData.x, 1.2, nodeData.z);
            posAttr.setXYZ(1, nodeData.x, 1.2, nodeData.z);
            posAttr.needsUpdate = true;

            if (this.bannerTextEl) {
                this.bannerTextEl.textContent = `Соединение: выберите целевое устройство для связи с [${nodeData.name}]`;
            }
            sounds.playSelect();
            return true;
        }

        // Выбран второй узел (Target)
        const targetNodeId = nodeData.id;

        if (this.sourceNodeId === targetNodeId) {
            if (window.showToast) {
                window.showToast('Нельзя соединить устройство само с собой', 'warning');
            }
            sounds.playError();
            return true;
        }

        try {
            const link = this.networkGraph.addLink({
                source: this.sourceNodeId,
                target: targetNodeId,
                speed: '1 Гбит/с',
                status: 'active',
                type: 'ethernet'
            });

            sounds.playConnect();
            if (window.showToast) {
                const src = this.networkGraph.getNode(this.sourceNodeId);
                window.showToast(`Успешно соединено: ${src.name} ↔ ${nodeData.name}`, 'success');
            }

            // Завершаем режим или остаемся в режиме для продолжения
            this.deactivate();
        } catch (e) {
            sounds.playError();
            if (window.showToast) {
                window.showToast(e.message || 'Ошибка создания соединения', 'error');
            }
        }

        return true;
    }
}

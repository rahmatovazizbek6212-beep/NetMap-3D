/**
 * NetMap 3D — Визуализация 3D-соединений (кабелей и линков)
 * Создает анимированные неоновые линии и обновляет их координаты при перемещении узлов.
 */

export class ConnectionMeshManager {
    constructor(scene, networkGraph) {
        this.scene = scene;
        this.networkGraph = networkGraph;

        this.linksGroup = new THREE.Group();
        this.linksGroup.name = 'network_links_group';
        this.scene.add(this.linksGroup);

        this.linkMeshes = new Map(); // linkId -> { line, points, sourceId, targetId, ... }
        this.pulseTime = 0;

        // Создание текстуры неонового импульса для анимации бегущих огней
        this.initPulseTexture();
    }

    initPulseTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 128, 0);
        grad.addColorStop(0, 'rgba(0, 243, 255, 0.2)');
        grad.addColorStop(0.5, 'rgba(0, 255, 255, 1)');
        grad.addColorStop(1, 'rgba(0, 243, 255, 0.2)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 16);

        this.pulseTexture = new THREE.CanvasTexture(canvas);
        this.pulseTexture.wrapS = THREE.RepeatWrapping;
        this.pulseTexture.wrapT = THREE.ClampToEdgeWrapping;
        this.pulseTexture.repeat.set(4, 1);
    }

    /**
     * Построение 3D-меша для одного соединения
     */
    createLinkMesh(linkData) {
        const sourceNode = this.networkGraph.getNode(linkData.source);
        const targetNode = this.networkGraph.getNode(linkData.target);

        if (!sourceNode || !targetNode) return null;

        const isBroken = linkData.status === 'broken';
        const isFiber = linkData.speed && linkData.speed.includes('10 Гбит');
        const isWifi = linkData.type === 'wifi';

        // Базовые точки кабеля с легким провисанием или дугой в 3D
        const p1 = new THREE.Vector3(sourceNode.x, 1.2, sourceNode.z);
        const p2 = new THREE.Vector3(targetNode.x, 1.2, targetNode.z);

        // Расчет средней контрольной точки для гладкой дуги
        const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const dist = p1.distanceTo(p2);
        // Небольшая дуга вверх или в бок
        midPoint.y += Math.min(2.5, dist * 0.08);

        const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
        const points = curve.getPoints(24);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        let color = isBroken ? 0xef4444 : (isFiber ? 0xa855f7 : (isWifi ? 0x3b82f6 : 0x00f3ff));
        let opacity = isBroken ? 0.45 : 0.85;

        // Линия соединения
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: isFiber ? 3 : 2,
            transparent: true,
            opacity: opacity
        });

        const line = new THREE.Line(geometry, material);
        line.name = `link_${linkData.id}`;
        line.userData = {
            linkId: linkData.id,
            isLink: true,
            curve: curve,
            linkData: linkData,
            baseColor: color,
            baseOpacity: opacity
        };

        // Внутренний контейнер для линка
        const linkContainer = new THREE.Group();
        linkContainer.add(line);

        // Если линк разорван — добавляем красный маркер-индикатор по центру
        if (isBroken) {
            const warnGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            const warnMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
            const warnBox = new THREE.Mesh(warnGeo, warnMat);
            warnBox.position.copy(midPoint);
            warnBox.name = 'broken_indicator';
            linkContainer.add(warnBox);
        }

        this.linksGroup.add(linkContainer);

        const record = {
            container: linkContainer,
            line: line,
            curve: curve,
            linkData: linkData,
            sourceId: linkData.source,
            targetId: linkData.target
        };

        this.linkMeshes.set(linkData.id, record);
        return record;
    }

    /**
     * Удаление 3D-меша соединения
     */
    removeLinkMesh(linkId) {
        const record = this.linkMeshes.get(linkId);
        if (!record) return;

        this.linksGroup.remove(record.container);
        if (record.line.geometry) record.line.geometry.dispose();
        if (record.line.material) record.line.material.dispose();
        this.linkMeshes.delete(linkId);
    }

    /**
     * Обновление геометрии линка при перемещении узла
     */
    updateLinkCoordinates(linkId) {
        const record = this.linkMeshes.get(linkId);
        if (!record) return;

        const sourceNode = this.networkGraph.getNode(record.sourceId);
        const targetNode = this.networkGraph.getNode(record.targetId);
        if (!sourceNode || !targetNode) return;

        const p1 = new THREE.Vector3(sourceNode.x, 1.2, sourceNode.z);
        const p2 = new THREE.Vector3(targetNode.x, 1.2, targetNode.z);

        const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const dist = p1.distanceTo(p2);
        midPoint.y += Math.min(2.5, dist * 0.08);

        record.curve.v0.copy(p1);
        record.curve.v1.copy(midPoint);
        record.curve.v2.copy(p2);

        const newPoints = record.curve.getPoints(24);
        record.line.geometry.setFromPoints(newPoints);
        record.line.geometry.attributes.position.needsUpdate = true;

        const brokenBox = record.container.getObjectByName('broken_indicator');
        if (brokenBox) {
            brokenBox.position.copy(midPoint);
        }
    }

    /**
     * Обновление всех линков, подключенных к конкретному узлу
     */
    updateLinksForNode(nodeId) {
        for (const record of this.linkMeshes.values()) {
            if (record.sourceId === nodeId || record.targetId === nodeId) {
                this.updateLinkCoordinates(record.linkData.id);
            }
        }
    }

    /**
     * Перерисовка всех соединений в графе
     */
    syncWithGraph() {
        // Удаляем устаревшие
        const existingIds = new Set(this.networkGraph.getAllLinks().map(l => l.id));
        for (const [id] of this.linkMeshes) {
            if (!existingIds.has(id)) {
                this.removeLinkMesh(id);
            }
        }

        // Добавляем или обновляем
        const links = this.networkGraph.getAllLinks();
        links.forEach(l => {
            if (!this.linkMeshes.has(l.id)) {
                this.createLinkMesh(l);
            } else {
                // Обновляем визуальный стиль при изменении статуса
                this.refreshLinkStyle(l.id);
                this.updateLinkCoordinates(l.id);
            }
        });
    }

    refreshLinkStyle(linkId) {
        const record = this.linkMeshes.get(linkId);
        if (!record) return;

        const linkData = this.networkGraph.getLink(linkId);
        if (!linkData) return;

        record.linkData = linkData;
        const isBroken = linkData.status === 'broken';
        const isFiber = linkData.speed && linkData.speed.includes('10 Гбит');
        const isWifi = linkData.type === 'wifi';

        const color = isBroken ? 0xef4444 : (isFiber ? 0xa855f7 : (isWifi ? 0x3b82f6 : 0x00f3ff));
        const opacity = isBroken ? 0.45 : 0.85;

        record.line.material.color.setHex(color);
        record.line.material.opacity = opacity;
        record.line.userData.baseColor = color;
        record.line.userData.baseOpacity = opacity;

        // Индикатор разрыва
        let warnBox = record.container.getObjectByName('broken_indicator');
        if (isBroken && !warnBox) {
            const warnGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            const warnMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
            warnBox = new THREE.Mesh(warnGeo, warnMat);
            warnBox.position.copy(record.curve.v1);
            warnBox.name = 'broken_indicator';
            record.container.add(warnBox);
        } else if (!isBroken && warnBox) {
            record.container.remove(warnBox);
            warnBox.geometry.dispose();
            warnBox.material.dispose();
        }
    }

    /**
     * Подсветка маршрута симуляции пакетов
     */
    highlightRoute(linkIds, active = true) {
        const linkIdSet = new Set(linkIds);
        this.linkMeshes.forEach((record, id) => {
            if (active && linkIdSet.has(id)) {
                record.line.material.color.setHex(0x00ff9d); // Неоновый зеленый для активного пути
                record.line.material.opacity = 1.0;
            } else {
                record.line.material.color.setHex(record.line.userData.baseColor);
                record.line.material.opacity = active ? 0.25 : record.line.userData.baseOpacity;
            }
        });
    }

    clearHighlight() {
        this.linkMeshes.forEach(record => {
            record.line.material.color.setHex(record.line.userData.baseColor);
            record.line.material.opacity = record.line.userData.baseOpacity;
        });
    }

    update(delta = 0.016) {
        this.pulseTime += delta * 2.0;
        // Легкая пульсация прозрачности для динамичности кабелей
        const pulse = 0.8 + Math.sin(this.pulseTime) * 0.15;
        this.linkMeshes.forEach(record => {
            if (record.linkData.status === 'active') {
                record.line.material.opacity = record.line.userData.baseOpacity * pulse;
            }
        });
    }

    getCurveForLink(linkId) {
        const record = this.linkMeshes.get(linkId);
        return record ? record.curve : null;
    }
}

/**
 * NetMap 3D — Генератор 3D-моделей сетевых устройств
 * Создает детализированные процедурные модели для 8 типов оборудования:
 * 1. Компьютер (Computer)
 * 2. Ноутбук (Laptop)
 * 3. Маршрутизатор (Router)
 * 4. Коммутатор (Switch)
 * 5. Сервер (Server)
 * 6. Межсетевой экран (Firewall)
 * 7. Облако (Cloud)
 * 8. База данных (Database)
 */

import { cyberMaterials } from './materials.js';

export class DeviceBuilder {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Создание полного составного узла (Mesh-группы) для Three.js сцены
     */
    buildDeviceMesh(nodeData) {
        const group = new THREE.Group();
        group.name = `node_${nodeData.id}`;
        group.userData = {
            nodeId: nodeData.id,
            isDeviceNode: true,
            nodeData: nodeData
        };

        const isOffline = nodeData.status === 'offline';
        const modelGroup = new THREE.Group();
        modelGroup.name = 'model_geometry';

        // 1. Построение специфической 3D-модели в зависимости от типа
        switch (nodeData.type) {
            case 'computer':
                this.buildComputer(modelGroup, isOffline);
                break;
            case 'laptop':
                this.buildLaptop(modelGroup, isOffline);
                break;
            case 'router':
                this.buildRouter(modelGroup, isOffline);
                break;
            case 'switch':
                this.buildSwitch(modelGroup, isOffline);
                break;
            case 'server':
                this.buildServer(modelGroup, isOffline);
                break;
            case 'firewall':
                this.buildFirewall(modelGroup, isOffline);
                break;
            case 'cloud':
                this.buildCloud(modelGroup, isOffline);
                break;
            case 'database':
                this.buildDatabase(modelGroup, isOffline);
                break;
            default:
                this.buildComputer(modelGroup, isOffline);
        }
        group.add(modelGroup);

        // 2. Голографическое основание на полу
        const pedestal = this.createHoloPedestal(nodeData.type, isOffline);
        group.add(pedestal);

        // 3. Кольцо выделения (по умолчанию скрыто)
        const selectionRing = this.createSelectionRing();
        selectionRing.name = 'selection_ring';
        selectionRing.visible = false;
        group.add(selectionRing);

        // 4. Текстовый 3D-бейдж (название и IP)
        const labelSprite = this.createLabelSprite(nodeData.name, nodeData.ip, nodeData.type, isOffline);
        labelSprite.name = 'label_sprite';
        labelSprite.position.set(0, this.getLabelHeight(nodeData.type), 0);
        group.add(labelSprite);

        // 5. Установка позиции
        group.position.set(nodeData.x || 0, nodeData.y || 0, nodeData.z || 0);

        return group;
    }

    getLabelHeight(type) {
        switch (type) {
            case 'server': return 5.8;
            case 'cloud': return 6.0;
            case 'database': return 5.5;
            case 'firewall': return 5.2;
            case 'computer': return 4.5;
            case 'router': return 4.2;
            case 'laptop': return 3.8;
            case 'switch': return 3.5;
            default: return 4.5;
        }
    }

    /**
     * Создание текстового спрайта с названием и IP
     */
    createLabelSprite(name, ip, type, isOffline) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');

        // Фон с закругленными углами и неоновым бордером
        ctx.fillStyle = isOffline ? 'rgba(15, 23, 42, 0.85)' : 'rgba(8, 14, 28, 0.88)';
        ctx.strokeStyle = isOffline ? 'rgba(239, 68, 68, 0.6)' : 'rgba(0, 243, 255, 0.6)';
        ctx.lineWidth = 4;

        this.roundRect(ctx, 8, 8, 496, 144, 20);
        ctx.fill();
        ctx.stroke();

        // Верхний статус-индикатор (точка)
        ctx.fillStyle = isOffline ? '#ef4444' : '#00ff9d';
        ctx.beginPath();
        ctx.arc(42, 50, 10, 0, Math.PI * 2);
        ctx.fill();

        // Название устройства
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px "Inter", "Segoe UI", sans-serif';
        const displayTitle = name.length > 22 ? name.substring(0, 20) + '...' : name;
        ctx.fillText(displayTitle, 65, 58);

        // IP-адрес и тип
        ctx.fillStyle = isOffline ? '#94a3b8' : '#00f3ff';
        ctx.font = '22px "JetBrains Mono", monospace';
        ctx.fillText(`IP: ${ip}`, 65, 105);

        // Бейдж статуса
        ctx.font = 'bold 18px "Inter", sans-serif';
        ctx.fillStyle = isOffline ? '#ef4444' : '#00ff9d';
        ctx.fillText(isOffline ? '[ОФЛАЙН]' : '[В СЕТИ]', 370, 105);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(6.4, 2.0, 1.0);
        return sprite;
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Обновление текстового спрайта при изменении имени или IP
     */
    updateLabelSprite(deviceGroup, name, ip, type, isOffline) {
        const oldSprite = deviceGroup.getObjectByName('label_sprite');
        if (oldSprite) {
            deviceGroup.remove(oldSprite);
            if (oldSprite.material.map) oldSprite.material.map.dispose();
            oldSprite.material.dispose();
        }
        const newSprite = this.createLabelSprite(name, ip, type, isOffline);
        newSprite.name = 'label_sprite';
        newSprite.position.set(0, this.getLabelHeight(type), 0);
        deviceGroup.add(newSprite);
    }

    /**
     * Создание подставки с голографическим свечением
     */
    createHoloPedestal(type, isOffline) {
        const pedestal = new THREE.Group();
        pedestal.position.y = 0.04;

        let color = isOffline ? 0xef4444 : 0x00f3ff;
        if (type === 'firewall') color = isOffline ? 0xef4444 : 0xff2a5f;
        if (type === 'server' || type === 'database') color = isOffline ? 0xef4444 : 0x0088ff;
        if (type === 'cloud') color = isOffline ? 0xef4444 : 0x00e5ff;

        // Внутреннее светящееся кольцо
        const ringGeo1 = new THREE.RingGeometry(1.6, 1.8, 32);
        const ringMat1 = cyberMaterials.getHoloRingMaterial(color, 0.6);
        const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
        ring1.rotation.x = -Math.PI / 2;
        pedestal.add(ring1);

        // Внешнее тонкое кольцо
        const ringGeo2 = new THREE.RingGeometry(2.1, 2.2, 32);
        const ringMat2 = cyberMaterials.getHoloRingMaterial(color, 0.3);
        const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
        ring2.rotation.x = -Math.PI / 2;
        pedestal.add(ring2);

        // Центровой диск
        const circleGeo = new THREE.CircleGeometry(1.5, 32);
        const circleMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.12,
            depthWrite: false
        });
        const circle = new THREE.Mesh(circleGeo, circleMat);
        circle.rotation.x = -Math.PI / 2;
        pedestal.add(circle);

        return pedestal;
    }

    /**
     * Кольцо выделения активного узла
     */
    createSelectionRing() {
        const group = new THREE.Group();
        group.position.y = 0.08;

        const geo = new THREE.RingGeometry(2.35, 2.55, 36);
        const mat = cyberMaterials.getSelectionRingMaterial();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        group.add(mesh);

        // 4 угловых маркера-скобки
        for (let i = 0; i < 4; i++) {
            const markerGeo = new THREE.BoxGeometry(0.5, 0.06, 0.12);
            const marker = new THREE.Mesh(markerGeo, mat);
            const angle = (i * Math.PI) / 2;
            marker.position.set(Math.cos(angle) * 2.7, 0, Math.sin(angle) * 2.7);
            marker.rotation.y = -angle;
            group.add(marker);
        }

        return group;
    }

    // ==========================================
    // 1. КОМПЬЮТЕР (Computer / Workstation)
    // ==========================================
    buildComputer(group, isOffline) {
        const chassisMat = cyberMaterials.getChassisMaterial(isOffline);
        const screenMat = cyberMaterials.getScreenMaterial(isOffline);
        const neonMat = isOffline ? cyberMaterials.getGlowMaterial(0x555555) : cyberMaterials.getGlowMaterial(0x00f3ff);

        // Стол-подставка
        const tableGeo = new THREE.BoxGeometry(3.6, 0.12, 2.0);
        const tableMesh = new THREE.Mesh(tableGeo, chassisMat);
        tableMesh.position.set(0, 0.06, 0);
        group.add(tableMesh);

        // Ножка монитора
        const standGeo = new THREE.BoxGeometry(0.3, 0.9, 0.2);
        const standMesh = new THREE.Mesh(standGeo, chassisMat);
        standMesh.position.set(-0.5, 0.55, -0.2);
        group.add(standMesh);

        // Корпус монитора
        const monitorGeo = new THREE.BoxGeometry(2.4, 1.4, 0.15);
        const monitorMesh = new THREE.Mesh(monitorGeo, chassisMat);
        monitorMesh.position.set(-0.5, 1.6, -0.2);
        group.add(monitorMesh);

        // Экран
        const displayGeo = new THREE.PlaneGeometry(2.2, 1.25);
        const displayMesh = new THREE.Mesh(displayGeo, screenMat);
        displayMesh.position.set(-0.5, 1.6, -0.12);
        group.add(displayMesh);

        // Системный блок ПК (Tower Case)
        const towerGeo = new THREE.BoxGeometry(0.8, 1.9, 1.6);
        const towerMesh = new THREE.Mesh(towerGeo, chassisMat);
        towerMesh.position.set(1.1, 1.0, 0);
        group.add(towerMesh);

        // Неоновая светодиодная полоса на корпусе ПК
        const stripGeo = new THREE.BoxGeometry(0.04, 1.6, 0.04);
        const stripMesh = new THREE.Mesh(stripGeo, neonMat);
        stripMesh.position.set(0.69, 1.0, 0.81);
        group.add(stripMesh);

        // Клавиатура
        const kbGeo = new THREE.BoxGeometry(1.4, 0.05, 0.5);
        const kbMesh = new THREE.Mesh(kbGeo, chassisMat);
        kbMesh.position.set(-0.5, 0.14, 0.45);
        group.add(kbMesh);
    }

    // ==========================================
    // 2. НОУТБУК (Laptop)
    // ==========================================
    buildLaptop(group, isOffline) {
        const chassisMat = cyberMaterials.getChassisMaterial(isOffline);
        const screenMat = cyberMaterials.getScreenMaterial(isOffline);
        const neonMat = isOffline ? cyberMaterials.getGlowMaterial(0x555555) : cyberMaterials.getGlowMaterial(0x00f3ff);

        // Нижняя часть (база с клавиатурой)
        const baseGeo = new THREE.BoxGeometry(2.0, 0.12, 1.5);
        const baseMesh = new THREE.Mesh(baseGeo, chassisMat);
        baseMesh.position.set(0, 0.06, 0.2);
        group.add(baseMesh);

        // Клавиатурное углубление
        const kbGeo = new THREE.BoxGeometry(1.6, 0.02, 0.8);
        const kbMat = new THREE.MeshStandardMaterial({ color: 0x0a0f1d, metalness: 0.5 });
        const kbMesh = new THREE.Mesh(kbGeo, kbMat);
        kbMesh.position.set(0, 0.13, 0.05);
        group.add(kbMesh);

        // Тачпад
        const tpGeo = new THREE.BoxGeometry(0.6, 0.02, 0.35);
        const tpMesh = new THREE.Mesh(tpGeo, chassisMat);
        tpMesh.position.set(0, 0.13, 0.65);
        group.add(tpMesh);

        // Верхняя крышка с экраном (наклонена назад на 25 градусов)
        const screenLid = new THREE.Group();
        screenLid.position.set(0, 0.12, -0.5);
        screenLid.rotation.x = -Math.PI * 0.15;

        const lidGeo = new THREE.BoxGeometry(2.0, 1.35, 0.08);
        const lidMesh = new THREE.Mesh(lidGeo, chassisMat);
        lidMesh.position.set(0, 0.65, 0);
        screenLid.add(lidMesh);

        // Матрица экрана
        const scrGeo = new THREE.PlaneGeometry(1.85, 1.2);
        const scrMesh = new THREE.Mesh(scrGeo, screenMat);
        scrMesh.position.set(0, 0.65, 0.045);
        screenLid.add(scrMesh);

        group.add(screenLid);

        // Индикатор питания / Wi-Fi
        const ledGeo = new THREE.BoxGeometry(0.12, 0.02, 0.04);
        const ledMesh = new THREE.Mesh(ledGeo, neonMat);
        ledMesh.position.set(0.8, 0.13, 0.85);
        group.add(ledMesh);
    }

    // ==========================================
    // 3. МАРШРУТИЗАТОР (Router)
    // ==========================================
    buildRouter(group, isOffline) {
        const chassisMat = cyberMaterials.getChassisMaterial(isOffline);
        const cyanMat = isOffline ? cyberMaterials.getGlowMaterial(0x555555) : cyberMaterials.getGlowMaterial(0x00f3ff);
        const greenMat = isOffline ? cyberMaterials.getGlowMaterial(0x555555) : cyberMaterials.getGlowMaterial(0x00ff9d);

        // Корпус с футуристическими скосами
        const bodyGeo = new THREE.CylinderGeometry(1.5, 1.7, 0.5, 6);
        const bodyMesh = new THREE.Mesh(bodyGeo, chassisMat);
        bodyMesh.position.set(0, 0.35, 0);
        group.add(bodyMesh);

        // Верхняя вентиляционная крышка
        const topGeo = new THREE.CylinderGeometry(1.1, 1.3, 0.15, 6);
        const topMesh = new THREE.Mesh(topGeo, chassisMat);
        topMesh.position.set(0, 0.65, 0);
        group.add(topMesh);

        // Центральный неоновый световод-шестиугольник
        const lightGeo = new THREE.TorusGeometry(0.8, 0.04, 8, 6);
        const lightMesh = new THREE.Mesh(lightGeo, cyanMat);
        lightMesh.rotation.x = Math.PI / 2;
        lightMesh.position.set(0, 0.74, 0);
        group.add(lightMesh);

        // 4 антенны по углам с небольшим расхождением
        const antennaCoords = [
            { x: -1.0, z: -1.0, rotZ: 0.15, rotX: -0.15 },
            { x: 1.0, z: -1.0, rotZ: -0.15, rotX: -0.15 },
            { x: -1.2, z: 0.5, rotZ: 0.18, rotX: 0.1 },
            { x: 1.2, z: 0.5, rotZ: -0.18, rotX: 0.1 }
        ];

        antennaCoords.forEach(c => {
            const antGroup = new THREE.Group();
            antGroup.position.set(c.x, 0.55, c.z);
            antGroup.rotation.z = c.rotZ;
            antGroup.rotation.x = c.rotX;

            // Стержень антенны
            const rodGeo = new THREE.CylinderGeometry(0.04, 0.06, 1.8, 8);
            const rodMesh = new THREE.Mesh(rodGeo, chassisMat);
            rodMesh.position.y = 0.9;
            antGroup.add(rodMesh);

            // Светящийся наконечник антенны
            const tipGeo = new THREE.SphereGeometry(0.07, 8, 8);
            const tipMesh = new THREE.Mesh(tipGeo, cyanMat);
            tipMesh.position.y = 1.8;
            antGroup.add(tipMesh);

            group.add(antGroup);
        });

        // Передний ряд индикаторов портов
        for (let i = 0; i < 5; i++) {
            const ledGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
            const ledMat = i === 0 ? greenMat : cyanMat;
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(-0.4 + i * 0.2, 0.35, 1.45);
            group.add(led);
        }
    }

    // ==========================================
    // 4. КОММУТАТОР (Switch)
    // ==========================================
    buildSwitch(group, isOffline) {
        const chassisMat = cyberMaterials.getChassisMaterial(isOffline);
        const greenMat = isOffline ? cyberMaterials.getGlowMaterial(0x555555) : cyberMaterials.getGlowMaterial(0x00ff9d);
        const cyanMat = isOffline ? cyberMaterials.getGlowMaterial(0x555555) : cyberMaterials.getGlowMaterial(0x00f3ff);

        // Корпус 1U rackmount коммутатора
        const rackGeo = new THREE.BoxGeometry(3.6, 0.6, 1.8);
        const rackMesh = new THREE.Mesh(rackGeo, chassisMat);
        rackMesh.position.set(0, 0.4, 0);
        group.add(rackMesh);

        // Боковые «уши» крепления в стойку
        const earLGeo = new THREE.BoxGeometry(0.12, 0.6, 0.3);
        const earLMesh = new THREE.Mesh(earLGeo, chassisMat);
        earLMesh.position.set(-1.85, 0.4, 0.6);
        group.add(earLMesh);

        const earRMesh = earLMesh.clone();
        earRMesh.position.set(1.85, 0.4, 0.6);
        group.add(earRMesh);

        // Лицевая панель с портами RJ-45 (2 ряда по 12 портов = 24 порта)
        const frontPanelGeo = new THREE.BoxGeometry(3.0, 0.45, 0.05);
        const frontPanelMat = new THREE.MeshStandardMaterial({ color: 0x050914, metalness: 0.9 });
        const frontPanel = new THREE.Mesh(frontPanelGeo, frontPanelMat);
        frontPanel.position.set(0, 0.4, 0.92);
        group.add(frontPanel);

        // Индикаторы портов (светящиеся зеленые и бирюзовые пиксели портов)
        const portCount = 12;
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < portCount; col++) {
                const portGeo = new THREE.BoxGeometry(0.12, 0.1, 0.02);
                const isHighActivity = (col + row) % 3 === 0;
                const portMat = isOffline ? cyberMaterials.getGlowMaterial(0x444444) : (isHighActivity ? cyanMat : greenMat);
                const portMesh = new THREE.Mesh(portGeo, portMat);
                portMesh.position.set(-1.2 + col * 0.22, 0.48 - row * 0.16, 0.95);
                group.add(portMesh);
            }
        }
    }

    // ==========================================
    // 5. СЕРВЕР (Server / Rack Tower)
    // ==========================================
    buildServer(group, isOffline) {
        const chassisMat = cyberMaterials.getChassisMaterial(isOffline);
        const blueMat = isOffline ? cyberMaterials.getGlowMaterial(0x444444) : cyberMaterials.getGlowMaterial(0x0088ff);
        const cyanMat = isOffline ? cyberMaterials.getGlowMaterial(0x444444) : cyberMaterials.getGlowMaterial(0x00f3ff);

        // Высокий 4U серверный шкаф-стойка
        const cabinetGeo = new THREE.BoxGeometry(1.8, 3.4, 2.0);
        const cabinetMesh = new THREE.Mesh(cabinetGeo, chassisMat);
        cabinetMesh.position.set(0, 1.75, 0);
        group.add(cabinetMesh);

        // 4 горизонтальных блейд-модуля (Blade units)
        for (let i = 0; i < 4; i++) {
            const bladeGeo = new THREE.BoxGeometry(1.6, 0.65, 0.1);
            const bladeMesh = new THREE.Mesh(bladeGeo, chassisMat);
            bladeMesh.position.set(0, 0.6 + i * 0.78, 1.02);
            group.add(bladeMesh);

            // Дисковые корзины (HDD/SSD bays) с синими огоньками
            for (let j = 0; j < 4; j++) {
                const bayGeo = new THREE.BoxGeometry(0.24, 0.12, 0.04);
                const bayMat = (i + j) % 2 === 0 ? blueMat : cyanMat;
                const bayMesh = new THREE.Mesh(bayGeo, bayMat);
                bayMesh.position.set(-0.55 + j * 0.38, 0.6 + i * 0.78, 1.08);
                group.add(bayMesh);
            }
        }

        // Вертикальные неоновые направляющие по углам шкафа
        const railGeo = new THREE.BoxGeometry(0.05, 3.4, 0.05);
        [-0.88, 0.88].forEach(x => {
            const rail = new THREE.Mesh(railGeo, cyanMat);
            rail.position.set(x, 1.75, 0.99);
            group.add(rail);
        });
    }

    // ==========================================
    // 6. МЕЖСЕТЕВОЙ ЭКРАН (Firewall / Shield Appliance)
    // ==========================================
    buildFirewall(group, isOffline) {
        const chassisMat = cyberMaterials.getChassisMaterial(isOffline);
        const redMat = isOffline ? cyberMaterials.getGlowMaterial(0x555555) : cyberMaterials.getGlowMaterial(0xff2a5f);
        const shieldMat = isOffline ? cyberMaterials.getGlowMaterial(0x333333, 0.2) : cyberMaterials.getShieldMaterial();

        // Главный бронированный блок
        const coreGeo = new THREE.OctahedronGeometry(1.2, 0);
        const coreMesh = new THREE.Mesh(coreGeo, chassisMat);
        coreMesh.position.set(0, 1.6, 0);
        group.add(coreMesh);

        // Внутреннее светящееся энергетическое ядро безопасности
        const innerCoreGeo = new THREE.IcosahedronGeometry(0.7, 1);
        const innerCoreMesh = new THREE.Mesh(innerCoreGeo, redMat);
        innerCoreMesh.position.set(0, 1.6, 0);
        group.add(innerCoreMesh);

        // Защитный голографический щит (полусфера / шестиугольный купол)
        const shieldGeo = new THREE.SphereGeometry(1.9, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.75);
        const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        shieldMesh.position.set(0, 1.5, 0);
        group.add(shieldMesh);

        // Вращающееся защитное кольцо с маркерными лучами
        const ringGeo = new THREE.TorusGeometry(2.1, 0.05, 8, 32);
        const ringMesh = new THREE.Mesh(ringGeo, redMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.set(0, 1.6, 0);
        group.add(ringMesh);

        // Массивная база-пьедестал безопасности
        const baseGeo = new THREE.CylinderGeometry(1.6, 1.9, 0.4, 8);
        const baseMesh = new THREE.Mesh(baseGeo, chassisMat);
        baseMesh.position.set(0, 0.2, 0);
        group.add(baseMesh);
    }

    // ==========================================
    // 7. ОБЛАКО (Cloud Gateway)
    // ==========================================
    buildCloud(group, isOffline) {
        const cyanMat = isOffline ? cyberMaterials.getGlowMaterial(0x444444) : cyberMaterials.getGlowMaterial(0x00f3ff);
        const cloudCoreMat = isOffline ? cyberMaterials.getGlowMaterial(0x222222, 0.3) : cyberMaterials.getCloudCoreMaterial();

        const cloudGroup = new THREE.Group();
        cloudGroup.position.set(0, 2.2, 0);

        // Стилизованное облако из пересекающихся неоновых сфер
        const sphereCoords = [
            { x: 0, y: 0.2, z: 0, r: 1.1 },
            { x: -0.9, y: -0.1, z: 0.1, r: 0.85 },
            { x: 0.9, y: -0.1, z: -0.1, r: 0.85 },
            { x: -0.5, y: -0.2, z: 0.7, r: 0.75 },
            { x: 0.5, y: -0.2, z: 0.7, r: 0.75 },
            { x: 0, y: -0.2, z: -0.8, r: 0.8 }
        ];

        sphereCoords.forEach(c => {
            const sGeo = new THREE.IcosahedronGeometry(c.r, 2);
            const sMesh = new THREE.Mesh(sGeo, cloudCoreMat);
            sMesh.position.set(c.x, c.y, c.z);
            cloudGroup.add(sMesh);

            // Тонкий каркасный контур для кибер-эффекта
            const wireGeo = new THREE.WireframeGeometry(sGeo);
            const wireLine = new THREE.LineSegments(wireGeo, cyanMat);
            wireLine.position.set(c.x, c.y, c.z);
            cloudGroup.add(wireLine);
        });

        // Орбитальное наклонное кольцо данных (Data Orbit Ring)
        const orbitGeo = new THREE.TorusGeometry(2.3, 0.04, 8, 36);
        const orbitMesh = new THREE.Mesh(orbitGeo, cyanMat);
        orbitMesh.rotation.x = Math.PI * 0.35;
        orbitMesh.rotation.y = Math.PI * 0.15;
        cloudGroup.add(orbitMesh);

        group.add(cloudGroup);
    }

    // ==========================================
    // 8. БАЗА ДАННЫХ (Database Storage Array)
    // ==========================================
    buildDatabase(group, isOffline) {
        const chassisMat = cyberMaterials.getChassisMaterial(isOffline);
        const purpleMat = isOffline ? cyberMaterials.getGlowMaterial(0x444444) : cyberMaterials.getGlowMaterial(0xb026ff);
        const cyanMat = isOffline ? cyberMaterials.getGlowMaterial(0x444444) : cyberMaterials.getGlowMaterial(0x00f3ff);

        // Стопка из 3 цилиндрических дисковых платеров (SAN Storage Platters)
        for (let i = 0; i < 3; i++) {
            const cylinderGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.75, 24);
            const cylinderMesh = new THREE.Mesh(cylinderGeo, chassisMat);
            cylinderMesh.position.set(0, 0.5 + i * 0.95, 0);
            group.add(cylinderMesh);

            // Неоновое кольцо уровня активности данных между секциями
            const ringGeo = new THREE.TorusGeometry(1.32, 0.05, 8, 24);
            const ringMat = i % 2 === 0 ? purpleMat : cyanMat;
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = Math.PI / 2;
            ringMesh.position.set(0, 0.5 + i * 0.95, 0);
            group.add(ringMesh);
        }

        // Вертикальные шины передачи данных (Data Bus Bars)
        for (let j = 0; j < 4; j++) {
            const angle = (j * Math.PI) / 2;
            const busGeo = new THREE.BoxGeometry(0.1, 2.8, 0.1);
            const busMesh = new THREE.Mesh(busGeo, purpleMat);
            busMesh.position.set(Math.cos(angle) * 1.35, 1.45, Math.sin(angle) * 1.35);
            group.add(busMesh);
        }
    }
}

export const deviceBuilder = new DeviceBuilder();

/**
 * NetMap 3D — Система симуляции и анимации пакетов данных
 * Анимирует перемещение неоновых пакетов по 3D-траекториям кабелей с расчетом задержек и ACK-ответов.
 */

import { sounds } from '../audio/sound-effects.js';

export class PacketSystem {
    constructor(scene, connectionMeshManager, networkGraph) {
        this.scene = scene;
        this.connectionMeshManager = connectionMeshManager;
        this.networkGraph = networkGraph;

        this.packetsGroup = new THREE.Group();
        this.packetsGroup.name = 'packet_system_group';
        this.scene.add(this.packetsGroup);

        this.activePackets = [];
        this.activeSparks = [];
        this.simulationSpeed = 1.0;
        this.onEventCallback = null;
    }

    setSpeed(multiplier = 1.0) {
        this.simulationSpeed = Math.max(0.2, Math.min(10, multiplier));
    }

    onEvent(cb) {
        this.onEventCallback = cb;
    }

    emitEvent(type, payload) {
        if (typeof this.onEventCallback === 'function') {
            this.onEventCallback(type, payload);
        }
    }

    /**
     * Запуск симуляции передачи пакета от Source к Target
     */
    sendPacket(sourceId, targetId, packetType = 'ICMP Echo') {
        const route = this.networkGraph.findShortestPath(sourceId, targetId);

        if (!route.success) {
            sounds.playError();
            this.emitEvent('packet_error', {
                sourceId,
                targetId,
                error: route.error || 'Маршрут не найден',
                timestamp: new Date().toLocaleTimeString()
            });
            return route;
        }

        // Подсвечиваем маршрут в 3D
        const linkIds = route.links.map(l => l.id);
        this.connectionMeshManager.highlightRoute(linkIds, true);

        this.emitEvent('simulation_start', {
            route,
            packetType,
            timestamp: new Date().toLocaleTimeString()
        });

        // Создаем физический пакет в сцене
        this.spawnPacketHop(route, 0, false, packetType);
        return route;
    }

    /**
     * Создание визуального меша пакета и запуск перемещения по конкретному хопу
     */
    spawnPacketHop(route, hopIndex, isAck = false, packetType = 'ICMP') {
        if (hopIndex >= route.links.length) {
            // Пакет дошел до конца!
            if (!isAck) {
                // Достиг адресата: генерируем ACK-ответ обратно
                sounds.playPacketSuccess();
                this.emitEvent('destination_reached', {
                    node: route.targetNode,
                    timestamp: new Date().toLocaleTimeString()
                });

                // Создаем ответный пакет ACK обратно к источнику с небольшой паузой
                setTimeout(() => {
                    this.spawnPacketHop(route, route.links.length - 1, true, 'ICMP Reply (ACK)');
                }, 180 / this.simulationSpeed);
            } else {
                // ACK вернулся к источнику
                this.emitEvent('simulation_complete', {
                    route,
                    totalLatency: route.totalLatencyMs,
                    timestamp: new Date().toLocaleTimeString()
                });
                setTimeout(() => {
                    this.connectionMeshManager.clearHighlight();
                }, 1200);
            }
            return;
        }

        const link = route.links[hopIndex];
        const curve = this.connectionMeshManager.getCurveForLink(link.id);

        if (!curve || link.status === 'broken') {
            // Обрыв на данном этапе
            sounds.playError();
            this.emitEvent('packet_drop', {
                link,
                hopIndex,
                timestamp: new Date().toLocaleTimeString(),
                reason: 'Кабель разорван или интерфейс отключен'
            });
            this.connectionMeshManager.clearHighlight();
            return;
        }

        // Определяем направление движения по кривой (от source к target или наоборот)
        const fromNodeId = isAck ? route.nodeIds[hopIndex + 1] : route.nodeIds[hopIndex];
        const toNodeId = isAck ? route.nodeIds[hopIndex] : route.nodeIds[hopIndex + 1];
        const reverse = link.source !== fromNodeId;

        // Создание меша светящегося пакета
        const packetMesh = this.createPacketMesh(isAck);
        this.packetsGroup.add(packetMesh);

        // Звук отправки хопа
        sounds.playPacketHop();

        const fromNode = this.networkGraph.getNode(fromNodeId);
        const toNode = this.networkGraph.getNode(toNodeId);

        this.emitEvent('hop_step', {
            hopNumber: isAck ? `ACK-${route.links.length - hopIndex}` : hopIndex + 1,
            totalHops: route.links.length,
            from: fromNode,
            to: toNode,
            speed: link.speed,
            isAck,
            timestamp: new Date().toLocaleTimeString()
        });

        // Базовая длительность прохождения хопа (зависит от скорости кабеля)
        let baseDuration = 0.55;
        if (link.speed.includes('10 Гбит')) baseDuration = 0.35;
        if (link.speed.includes('100 Мбит')) baseDuration = 0.85;
        if (link.type === 'wifi') baseDuration = 0.7;

        const duration = baseDuration / this.simulationSpeed;

        this.activePackets.push({
            mesh: packetMesh,
            curve: curve,
            reverse: reverse,
            progress: 0,
            duration: duration,
            route: route,
            hopIndex: hopIndex,
            isAck: isAck,
            packetType: packetType
        });
    }

    createPacketMesh(isAck = false) {
        const group = new THREE.Group();
        const color = isAck ? 0x00ff9d : 0x00f3ff;

        // Центральная яркая сфера
        const coreGeo = new THREE.SphereGeometry(0.4, 16, 16);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        group.add(coreMesh);

        // Внешняя неоновая светящаяся оболочка
        const haloGeo = new THREE.SphereGeometry(0.75, 16, 16);
        const haloMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        group.add(haloMesh);

        // Внешнее вращающееся колечко пакета
        const ringGeo = new THREE.RingGeometry(0.85, 1.05, 16);
        const ringMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.name = 'packet_ring';
        group.add(ringMesh);

        return group;
    }

    createSparkBurst(position, colorHex = 0x00ff9d) {
        const count = 16;
        for (let i = 0; i < count; i++) {
            const geo = new THREE.SphereGeometry(0.12, 6, 6);
            const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 });
            const spark = new THREE.Mesh(geo, mat);
            spark.position.copy(position);

            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 3 + 1,
                (Math.random() - 0.5) * 4
            );

            this.packetsGroup.add(spark);
            this.activeSparks.push({ mesh: spark, vel: vel, life: 0.5 });
        }
    }

    update(delta = 0.016) {
        // Обновление активных пакетов
        for (let i = this.activePackets.length - 1; i >= 0; i--) {
            const pkt = this.activePackets[i];
            pkt.progress += delta / pkt.duration;

            // Вращение кольца пакета
            const ring = pkt.mesh.getObjectByName('packet_ring');
            if (ring) {
                ring.rotation.x += delta * 6;
                ring.rotation.y += delta * 4;
            }

            const t = Math.min(1.0, pkt.progress);
            const curveT = pkt.reverse ? 1.0 - t : t;

            const pos = pkt.curve.getPoint(curveT);
            pkt.mesh.position.copy(pos);

            if (t >= 1.0) {
                // Хоп завершен
                this.createSparkBurst(pos, pkt.isAck ? 0x00ff9d : 0x00f3ff);
                this.packetsGroup.remove(pkt.mesh);
                this.activePackets.splice(i, 1);

                // Запуск следующего хопа
                if (!pkt.isAck) {
                    this.spawnPacketHop(pkt.route, pkt.hopIndex + 1, false, pkt.packetType);
                } else {
                    this.spawnPacketHop(pkt.route, pkt.hopIndex - 1, true, pkt.packetType);
                }
            }
        }

        // Обновление искр (sparks)
        for (let j = this.activeSparks.length - 1; j >= 0; j--) {
            const spk = this.activeSparks[j];
            spk.life -= delta;
            spk.mesh.position.addScaledVector(spk.vel, delta);
            spk.mesh.material.opacity = spk.life / 0.5;

            if (spk.life <= 0) {
                this.packetsGroup.remove(spk.mesh);
                spk.mesh.geometry.dispose();
                spk.mesh.material.dispose();
                this.activeSparks.splice(j, 1);
            }
        }
    }

    clear() {
        this.activePackets.forEach(p => this.packetsGroup.remove(p.mesh));
        this.activePackets = [];
        this.activeSparks.forEach(s => this.packetsGroup.remove(s.mesh));
        this.activeSparks = [];
        this.connectionMeshManager.clearHighlight();
    }
}

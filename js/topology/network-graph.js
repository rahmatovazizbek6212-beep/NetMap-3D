/**
 * NetMap 3D — Модель сетевого графа и топологии
 * Управляет состоянием узлов, соединений и алгоритмами маршрутизации (Dijkstra/BFS).
 */

import { IPUtils } from '../utils/ip-validator.js';

export class NetworkGraph {
    constructor() {
        this.nodes = new Map(); // id -> nodeData
        this.links = new Map(); // id -> linkData
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => {
                try {
                    cb(data);
                } catch (e) {
                    console.error(`Ошибка в обработчике события ${event}:`, e);
                }
            });
        }
    }

    clear() {
        this.nodes.clear();
        this.links.clear();
        this.emit('cleared');
    }

    loadPreset(preset) {
        this.clear();
        if (preset.nodes && Array.isArray(preset.nodes)) {
            preset.nodes.forEach(n => this.addNode(n, false));
        }
        if (preset.links && Array.isArray(preset.links)) {
            preset.links.forEach(l => this.addLink(l, false));
        }
        this.emit('loaded', preset);
    }

    // ==========================================
    // УПРАВЛЕНИЕ УЗЛАМИ (NODES)
    // ==========================================
    addNode(nodeData, emitEvent = true) {
        const id = nodeData.id || `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const node = {
            id: id,
            type: nodeData.type || 'computer',
            name: nodeData.name || 'Новое устройство',
            ip: nodeData.ip || IPUtils.generateNextIP(Array.from(this.nodes.values()), nodeData.type),
            mac: nodeData.mac || IPUtils.generateMAC(),
            status: nodeData.status || 'online',
            x: typeof nodeData.x === 'number' ? nodeData.x : (Math.random() - 0.5) * 30,
            y: typeof nodeData.y === 'number' ? nodeData.y : 0,
            z: typeof nodeData.z === 'number' ? nodeData.z : (Math.random() - 0.5) * 30
        };

        this.nodes.set(id, node);
        if (emitEvent) {
            this.emit('nodeAdded', node);
            this.emit('stateChanged');
        }
        return node;
    }

    updateNode(id, fields) {
        const node = this.nodes.get(id);
        if (!node) return null;

        Object.assign(node, fields);
        this.emit('nodeUpdated', node);
        this.emit('stateChanged');
        return node;
    }

    removeNode(id) {
        const node = this.nodes.get(id);
        if (!node) return false;

        // Удаление всех прикрепленных связей
        const attachedLinks = this.getLinksForNode(id);
        attachedLinks.forEach(link => {
            this.removeLink(link.id, false);
        });

        this.nodes.delete(id);
        this.emit('nodeRemoved', { id, node, removedLinks: attachedLinks });
        this.emit('stateChanged');
        return true;
    }

    getNode(id) {
        return this.nodes.get(id) || null;
    }

    getAllNodes() {
        return Array.from(this.nodes.values());
    }

    toggleNodeStatus(id) {
        const node = this.nodes.get(id);
        if (!node) return null;
        node.status = node.status === 'online' ? 'offline' : 'online';
        this.emit('nodeUpdated', node);
        this.emit('stateChanged');
        return node;
    }

    // ==========================================
    // УПРАВЛЕНИЕ СОЕДИНЕНИЯМИ (LINKS)
    // ==========================================
    addLink(linkData, emitEvent = true) {
        const sourceId = linkData.source;
        const targetId = linkData.target;

        // Защита от соединения с самим собой
        if (sourceId === targetId) {
            throw new Error('Устройство не может быть соединено само с собой.');
        }

        // Проверка существования обоих узлов
        if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
            throw new Error('Один из узлов соединения не найден.');
        }

        // Проверка на дубликат соединения
        for (const existingLink of this.links.values()) {
            if (
                (existingLink.source === sourceId && existingLink.target === targetId) ||
                (existingLink.source === targetId && existingLink.target === sourceId)
            ) {
                throw new Error('Данные устройства уже соединены.');
            }
        }

        const id = linkData.id || `link_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const link = {
            id: id,
            source: sourceId,
            target: targetId,
            speed: linkData.speed || '1 Гбит/с',
            status: linkData.status || 'active',
            type: linkData.type || 'ethernet'
        };

        this.links.set(id, link);
        if (emitEvent) {
            this.emit('linkAdded', link);
            this.emit('stateChanged');
        }
        return link;
    }

    updateLink(id, fields) {
        const link = this.links.get(id);
        if (!link) return null;

        Object.assign(link, fields);
        this.emit('linkUpdated', link);
        this.emit('stateChanged');
        return link;
    }

    removeLink(id, emitEvent = true) {
        const link = this.links.get(id);
        if (!link) return false;

        this.links.delete(id);
        if (emitEvent) {
            this.emit('linkRemoved', link);
            this.emit('stateChanged');
        }
        return true;
    }

    getLink(id) {
        return this.links.get(id) || null;
    }

    getAllLinks() {
        return Array.from(this.links.values());
    }

    getLinksForNode(nodeId) {
        const result = [];
        for (const link of this.links.values()) {
            if (link.source === nodeId || link.target === nodeId) {
                result.push(link);
            }
        }
        return result;
    }

    getNeighbors(nodeId) {
        const neighbors = [];
        for (const link of this.links.values()) {
            if (link.source === nodeId) {
                neighbors.push({ nodeId: link.target, link });
            } else if (link.target === nodeId) {
                neighbors.push({ nodeId: link.source, link });
            }
        }
        return neighbors;
    }

    toggleLinkStatus(id) {
        const link = this.links.get(id);
        if (!link) return null;
        link.status = link.status === 'active' ? 'broken' : 'active';
        this.emit('linkUpdated', link);
        this.emit('stateChanged');
        return link;
    }

    // ==========================================
    // АЛГОРИТМ МАРШРУТИЗАЦИИ (DIJKSTRA / BFS)
    // ==========================================
    /**
     * Поиск кратчайшего маршрута от источника к приёмнику с учётом статуса узлов и линков
     */
    findShortestPath(sourceId, targetId) {
        const source = this.nodes.get(sourceId);
        const target = this.nodes.get(targetId);

        if (!source || !target) {
            return { success: false, error: 'Узлы не найдены', hops: [] };
        }

        if (source.status === 'offline') {
            return {
                success: false,
                error: `Исходный узел [${source.name}] отключен (Офлайн).`,
                brokenNodeId: sourceId,
                hops: []
            };
        }

        if (target.status === 'offline') {
            return {
                success: false,
                error: `Целевой узел [${target.name}] отключен (Офлайн).`,
                brokenNodeId: targetId,
                hops: []
            };
        }

        // Алгоритм Дейкстры с учетом веса (задержка линка)
        const distances = new Map();
        const previous = new Map(); // nodeId -> { prevNodeId, link }
        const unvisited = new Set(this.nodes.keys());

        for (const id of this.nodes.keys()) {
            distances.set(id, Infinity);
        }
        distances.set(sourceId, 0);

        while (unvisited.size > 0) {
            // Находим узел с минимальной дистанцией среди непосещенных
            let currentId = null;
            let minDistance = Infinity;

            for (const id of unvisited) {
                const dist = distances.get(id);
                if (dist < minDistance) {
                    minDistance = dist;
                    currentId = id;
                }
            }

            if (currentId === null || minDistance === Infinity) break;
            if (currentId === targetId) break;

            unvisited.delete(currentId);
            const currentNode = this.nodes.get(currentId);

            // Пропускаем офлайн-узлы (они не могут маршрутизировать трафик)
            if (currentNode.status === 'offline' && currentId !== sourceId) {
                continue;
            }

            const neighbors = this.getNeighbors(currentId);
            for (const { nodeId: neighborId, link } of neighbors) {
                if (!unvisited.has(neighborId)) continue;

                // Если линк разорван, пропуск
                if (link.status === 'broken') continue;

                const neighborNode = this.nodes.get(neighborId);
                if (neighborNode && neighborNode.status === 'offline' && neighborId !== targetId) {
                    continue;
                }

                // Расчет веса ребра: базовая задержка обратно пропорциональна скорости
                const mbps = IPUtils.speedToMbps(link.speed);
                const linkLatency = 1000 / mbps + (Math.random() * 0.4); // мс

                const alt = distances.get(currentId) + linkLatency;
                if (alt < distances.get(neighborId)) {
                    distances.set(neighborId, alt);
                    previous.set(neighborId, { prevNodeId: currentId, link, latency: linkLatency });
                }
            }
        }

        // Восстановление пути
        if (!previous.has(targetId) && sourceId !== targetId) {
            return {
                success: false,
                error: `Маршрут между [${source.name}] и [${target.name}] отсутствует или разорван.`,
                hops: []
            };
        }

        const pathNodeIds = [];
        const pathLinks = [];
        let curr = targetId;
        let totalLatency = 0;

        pathNodeIds.unshift(curr);
        while (previous.has(curr)) {
            const step = previous.get(curr);
            pathLinks.unshift(step.link);
            totalLatency += step.latency;
            curr = step.prevNodeId;
            pathNodeIds.unshift(curr);
        }

        return {
            success: true,
            sourceNode: source,
            targetNode: target,
            nodeIds: pathNodeIds,
            links: pathLinks,
            hopCount: pathLinks.length,
            totalLatencyMs: Math.round(totalLatency * 10) / 10,
            jitterMs: (Math.random() * 0.8).toFixed(1)
        };
    }

    // ==========================================
    // СТАТИСТИКА СЕТИ
    // ==========================================
    getStatistics() {
        const totalDevices = this.nodes.size;
        let onlineDevices = 0;
        let offlineDevices = 0;

        for (const node of this.nodes.values()) {
            if (node.status === 'online') onlineDevices++;
            else offlineDevices++;
        }

        const totalLinks = this.links.size;
        let activeLinks = 0;
        let brokenLinks = 0;
        let totalThroughputMbps = 0;

        for (const link of this.links.values()) {
            if (link.status === 'active') {
                activeLinks++;
                totalThroughputMbps += IPUtils.speedToMbps(link.speed);
            } else {
                brokenLinks++;
            }
        }

        return {
            totalDevices,
            onlineDevices,
            offlineDevices,
            totalLinks,
            activeLinks,
            brokenLinks,
            totalThroughputGbps: (totalThroughputMbps / 1000).toFixed(1),
            networkHealthPercent: totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 100
        };
    }

    toJSON() {
        return {
            nodes: this.getAllNodes(),
            links: this.getAllLinks()
        };
    }
}

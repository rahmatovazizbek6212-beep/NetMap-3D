/**
 * NetMap 3D — Панель конфигурации устройства
 * Отображает и позволяет редактировать параметры выбранного узла в реальном времени.
 */

import { IPUtils } from '../utils/ip-validator.js';
import { sounds } from '../audio/sound-effects.js';
import { terminal } from './terminal-log.js';

export class ConfigPanel {
    constructor(networkGraph, deviceBuilder, connectionMeshManager, deviceMeshesMap, sceneManager) {
        this.networkGraph = networkGraph;
        this.deviceBuilder = deviceBuilder;
        this.connectionMeshManager = connectionMeshManager;
        this.deviceMeshesMap = deviceMeshesMap;
        this.sceneManager = sceneManager;

        this.panelEl = document.getElementById('device-config-panel');
        this.closeBtn = document.getElementById('btn-close-config');
        this.currentNodeId = null;

        // Элементы формы
        this.nameInput = document.getElementById('cfg-name');
        this.typeSelect = document.getElementById('cfg-type');
        this.ipInput = document.getElementById('cfg-ip');
        this.ipErrorEl = document.getElementById('cfg-ip-error');
        this.macInput = document.getElementById('cfg-mac');
        this.statusSwitch = document.getElementById('cfg-status-toggle');
        this.statusLabel = document.getElementById('cfg-status-text');
        this.coordXInput = document.getElementById('cfg-pos-x');
        this.coordZInput = document.getElementById('cfg-pos-z');
        this.connectionsListEl = document.getElementById('cfg-connections-list');
        this.deleteBtn = document.getElementById('btn-delete-node');
        this.pingFromBtn = document.getElementById('btn-ping-from-node');

        this.initEvents();
    }

    initEvents() {
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }

        // Изменение имени
        if (this.nameInput) {
            this.nameInput.addEventListener('input', (e) => {
                if (!this.currentNodeId) return;
                const newName = e.target.value.trim() || 'Устройство';
                this.networkGraph.updateNode(this.currentNodeId, { name: newName });
                this.update3DSprite(this.currentNodeId);
            });
        }

        // Изменение IP с валидацией
        if (this.ipInput) {
            this.ipInput.addEventListener('input', (e) => {
                if (!this.currentNodeId) return;
                const newIP = e.target.value.trim();

                if (IPUtils.isValidIPv4(newIP)) {
                    this.ipErrorEl.style.display = 'none';
                    this.ipInput.classList.remove('input-invalid');
                    this.networkGraph.updateNode(this.currentNodeId, { ip: newIP });
                    this.update3DSprite(this.currentNodeId);
                } else {
                    this.ipErrorEl.textContent = 'Некорректный IPv4 адрес (0.0.0.0 — 255.255.255.255)';
                    this.ipErrorEl.style.display = 'block';
                    this.ipInput.classList.add('input-invalid');
                }
            });
        }

        // Изменение MAC
        if (this.macInput) {
            this.macInput.addEventListener('change', (e) => {
                if (!this.currentNodeId) return;
                this.networkGraph.updateNode(this.currentNodeId, { mac: e.target.value.trim() });
            });
        }

        // Переключение статуса Онлайн/Офлайн
        if (this.statusSwitch) {
            this.statusSwitch.addEventListener('change', (e) => {
                if (!this.currentNodeId) return;
                const isOnline = e.target.checked;
                const newStatus = isOnline ? 'online' : 'offline';
                this.statusLabel.textContent = isOnline ? 'В сети (Онлайн)' : 'Отключено (Офлайн)';
                this.statusLabel.className = `status-badge ${newStatus}`;

                this.networkGraph.updateNode(this.currentNodeId, { status: newStatus });
                this.rebuildNodeMesh(this.currentNodeId);
                terminal.log('DEVICE', `Узел ${this.nameInput.value} переведен в статус: ${newStatus.toUpperCase()}`, isOnline ? 'success' : 'warn');
            });
        }

        // Координаты X и Z
        if (this.coordXInput) {
            this.coordXInput.addEventListener('input', (e) => {
                if (!this.currentNodeId) return;
                const x = parseFloat(e.target.value) || 0;
                this.moveNodeIn3D(this.currentNodeId, x, null);
            });
        }
        if (this.coordZInput) {
            this.coordZInput.addEventListener('input', (e) => {
                if (!this.currentNodeId) return;
                const z = parseFloat(e.target.value) || 0;
                this.moveNodeIn3D(this.currentNodeId, null, z);
            });
        }

        // Удаление узла
        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', () => {
                if (!this.currentNodeId) return;
                const node = this.networkGraph.getNode(this.currentNodeId);
                if (!node) return;

                if (confirm(`Удалить устройство "${node.name}" и все связанные кабели?`)) {
                    sounds.playDisconnect();
                    this.networkGraph.removeNode(this.currentNodeId);
                    terminal.log('TOPOLOGY', `Устройство [${node.name}] удалено из сети.`, 'warn');
                    if (window.showToast) {
                        window.showToast(`Устройство "${node.name}" удалено`, 'info');
                    }
                    this.hide();
                }
            });
        }

        // Быстрый пинг
        if (this.pingFromBtn) {
            this.pingFromBtn.addEventListener('click', () => {
                if (!this.currentNodeId) return;
                const simSrc = document.getElementById('sim-source');
                if (simSrc) {
                    simSrc.value = this.currentNodeId;
                    simSrc.dispatchEvent(new Event('change'));
                }
                const simDrawer = document.getElementById('simulation-hud');
                if (simDrawer) simDrawer.classList.remove('collapsed');
                if (window.showToast) {
                    window.showToast(`Устройство выбрано как источник симуляции`, 'info');
                }
            });
        }
    }

    show(nodeData) {
        if (!nodeData) {
            this.hide();
            return;
        }

        this.currentNodeId = nodeData.id;
        this.nameInput.value = nodeData.name || '';
        this.ipInput.value = nodeData.ip || '';
        this.macInput.value = nodeData.mac || '';
        this.ipErrorEl.style.display = 'none';
        this.ipInput.classList.remove('input-invalid');

        const isOnline = nodeData.status === 'online';
        this.statusSwitch.checked = isOnline;
        this.statusLabel.textContent = isOnline ? 'В сети (Онлайн)' : 'Отключено (Офлайн)';
        this.statusLabel.className = `status-badge ${nodeData.status}`;

        this.coordXInput.value = nodeData.x || 0;
        this.coordZInput.value = nodeData.z || 0;

        // Тип устройства
        const typeBadge = document.getElementById('cfg-type-badge');
        if (typeBadge) {
            typeBadge.textContent = this.formatType(nodeData.type);
        }

        this.renderConnectedLinks(nodeData.id);

        this.panelEl.classList.add('open');
    }

    hide() {
        this.currentNodeId = null;
        if (this.panelEl) {
            this.panelEl.classList.remove('open');
        }
    }

    renderConnectedLinks(nodeId) {
        if (!this.connectionsListEl) return;
        this.connectionsListEl.innerHTML = '';

        const links = this.networkGraph.getLinksForNode(nodeId);
        if (links.length === 0) {
            this.connectionsListEl.innerHTML = '<div class="cfg-no-links">Нет активных подключений</div>';
            return;
        }

        links.forEach(link => {
            const otherId = link.source === nodeId ? link.target : link.source;
            const otherNode = this.networkGraph.getNode(otherId);
            if (!otherNode) return;

            const item = document.createElement('div');
            item.className = 'cfg-link-item';
            item.innerHTML = `
                <div class="cfg-link-info">
                    <span class="cfg-link-name">${this.escapeHTML(otherNode.name)}</span>
                    <span class="cfg-link-sub">${otherNode.ip} | ${link.speed}</span>
                </div>
                <button class="btn-disconnect-link" title="Разорвать кабель">&times;</button>
            `;

            const disconnectBtn = item.querySelector('.btn-disconnect-link');
            disconnectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.networkGraph.removeLink(link.id);
                sounds.playDisconnect();
                terminal.log('TOPOLOGY', `Кабель между [${otherNode.name}] и текущим узлом отключен.`, 'warn');
                this.renderConnectedLinks(nodeId);
            });

            this.connectionsListEl.appendChild(item);
        });
    }

    update3DSprite(nodeId) {
        const group = this.deviceMeshesMap.get(nodeId);
        const node = this.networkGraph.getNode(nodeId);
        if (group && node) {
            this.deviceBuilder.updateLabelSprite(group, node.name, node.ip, node.type, node.status === 'offline');
        }
    }

    rebuildNodeMesh(nodeId) {
        const oldGroup = this.deviceMeshesMap.get(nodeId);
        const nodeData = this.networkGraph.getNode(nodeId);
        if (oldGroup && nodeData) {
            this.sceneManager.scene.remove(oldGroup);
            const newGroup = this.deviceBuilder.buildDeviceMesh(nodeData);
            const isSelected = this.currentNodeId === nodeId;
            const ring = newGroup.getObjectByName('selection_ring');
            if (ring) ring.visible = isSelected;

            this.sceneManager.scene.add(newGroup);
            this.deviceMeshesMap.set(nodeId, newGroup);
            this.connectionMeshManager.updateLinksForNode(nodeId);
        }
    }

    moveNodeIn3D(nodeId, x, z) {
        const group = this.deviceMeshesMap.get(nodeId);
        const node = this.networkGraph.getNode(nodeId);
        if (group && node) {
            if (x !== null) {
                group.position.x = x;
                node.x = x;
            }
            if (z !== null) {
                group.position.z = z;
                node.z = z;
            }
            this.connectionMeshManager.updateLinksForNode(nodeId);
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

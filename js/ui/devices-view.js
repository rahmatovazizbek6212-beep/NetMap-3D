/**
 * NetMap 3D — Табличный вид устройств (Devices View)
 * Позволяет фильтровать, искать, переключать статус и фокусировать камеру на устройствах.
 */

import { sounds } from '../audio/sound-effects.js';
import { terminal } from './terminal-log.js';

export class DevicesView {
    constructor(networkGraph, appController) {
        this.networkGraph = networkGraph;
        this.appController = appController;

        this.tableBody = document.getElementById('devices-table-body');
        this.searchInput = document.getElementById('devices-search-input');
        this.filterSelect = document.getElementById('devices-status-filter');
        this.countBadge = document.getElementById('devices-count-badge');

        this.initEvents();
    }

    initEvents() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.render());
        }
        if (this.filterSelect) {
            this.filterSelect.addEventListener('change', () => this.render());
        }

        this.networkGraph.on('stateChanged', () => this.render());
    }

    render() {
        if (!this.tableBody) return;

        const query = (this.searchInput ? this.searchInput.value : '').toLowerCase().trim();
        const filter = this.filterSelect ? this.filterSelect.value : 'all';

        const nodes = this.networkGraph.getAllNodes();
        if (this.countBadge) this.countBadge.textContent = nodes.length;

        const filtered = nodes.filter(node => {
            // Фильтр по статусу
            if (filter !== 'all' && node.status !== filter) return false;

            // Поиск по названию, IP, MAC или типу
            if (query) {
                const matchName = node.name.toLowerCase().includes(query);
                const matchIp = node.ip.toLowerCase().includes(query);
                const matchMac = (node.mac || '').toLowerCase().includes(query);
                const matchType = node.type.toLowerCase().includes(query);
                return matchName || matchIp || matchMac || matchType;
            }
            return true;
        });

        this.tableBody.innerHTML = '';

        if (filtered.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-empty">
                        <div class="table-empty-box">
                            <span>Устройства не найдены</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(node => {
            const tr = document.createElement('tr');
            const isOnline = node.status === 'online';
            const linksCount = this.networkGraph.getLinksForNode(node.id).length;

            tr.innerHTML = `
                <td>
                    <span class="status-indicator ${node.status}" title="${isOnline ? 'В сети' : 'Офлайн'}"></span>
                </td>
                <td>
                    <div class="device-cell">
                        <span class="device-cell-name">${this.escapeHTML(node.name)}</span>
                        <span class="device-cell-type">${this.formatType(node.type)}</span>
                    </div>
                </td>
                <td><code class="code-ip">${node.ip}</code></td>
                <td><span class="code-mac">${node.mac || '--'}</span></td>
                <td><span class="badge-links">${linksCount} линк(ов)</span></td>
                <td><span class="text-coords">X:${Math.round(node.x)} Z:${Math.round(node.z)}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-tbl-action btn-toggle-state" title="Переключить статус (Онлайн/Офлайн)">
                            ${isOnline ? 'Отключить' : 'Включить'}
                        </button>
                        <button class="btn-tbl-action btn-focus-3d" title="Найти и показать в 3D">
                            3D Фокус
                        </button>
                        <button class="btn-tbl-action btn-edit" title="Параметры">
                            ⚙
                        </button>
                        <button class="btn-tbl-action btn-delete-row" title="Удалить">
                            ✕
                        </button>
                    </div>
                </td>
            `;

            // Обработчики кнопок
            const btnToggle = tr.querySelector('.btn-toggle-state');
            btnToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.networkGraph.toggleNodeStatus(node.id);
                sounds.playClick();
                terminal.log('DEVICE', `Статус [${node.name}] изменен на: ${node.status.toUpperCase()}`, 'info');
            });

            const btnFocus = tr.querySelector('.btn-focus-3d');
            btnFocus.addEventListener('click', (e) => {
                e.stopPropagation();
                this.appController.focusNodeIn3D(node.id);
            });

            const btnEdit = tr.querySelector('.btn-edit');
            btnEdit.addEventListener('click', (e) => {
                e.stopPropagation();
                this.appController.openNodeConfig(node.id);
            });

            const btnDelete = tr.querySelector('.btn-delete-row');
            btnDelete.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Удалить устройство "${node.name}"?`)) {
                    this.networkGraph.removeNode(node.id);
                    sounds.playDisconnect();
                    if (window.showToast) window.showToast(`Устройство "${node.name}" удалено`, 'info');
                }
            });

            tr.addEventListener('click', () => {
                this.appController.focusNodeIn3D(node.id);
            });

            this.tableBody.appendChild(tr);
        });
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

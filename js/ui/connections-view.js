/**
 * NetMap 3D — Табличный вид соединений (Connections View)
 * Отображает список кабелей, их скорость, статус и позволяет разрывать линки.
 */

import { sounds } from '../audio/sound-effects.js';
import { terminal } from './terminal-log.js';

export class ConnectionsView {
    constructor(networkGraph, appController) {
        this.networkGraph = networkGraph;
        this.appController = appController;

        this.tableBody = document.getElementById('connections-table-body');
        this.countBadge = document.getElementById('connections-count-badge');
        this.btnAddLink = document.getElementById('btn-add-connection-modal');

        this.initEvents();
    }

    initEvents() {
        if (this.btnAddLink) {
            this.btnAddLink.addEventListener('click', () => {
                this.appController.activateConnectMode();
            });
        }

        this.networkGraph.on('stateChanged', () => this.render());
    }

    render() {
        if (!this.tableBody) return;

        const links = this.networkGraph.getAllLinks();
        if (this.countBadge) this.countBadge.textContent = links.length;

        this.tableBody.innerHTML = '';

        if (links.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-empty">
                        <div class="table-empty-box">
                            <span>Соединения отсутствуют. Перейдите в 3D Топологию и нажмите «Соединить».</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        links.forEach(link => {
            const src = this.networkGraph.getNode(link.source);
            const tgt = this.networkGraph.getNode(link.target);
            if (!src || !tgt) return;

            const tr = document.createElement('tr');
            const isActive = link.status === 'active';

            tr.innerHTML = `
                <td>
                    <span class="status-indicator ${isActive ? 'online' : 'offline'}" title="${isActive ? 'Активен' : 'Разорван'}"></span>
                </td>
                <td>
                    <div class="link-peer">
                        <strong>${this.escapeHTML(src.name)}</strong>
                        <code>${src.ip}</code>
                    </div>
                </td>
                <td class="text-center">
                    <span class="link-arrow">⇄</span>
                </td>
                <td>
                    <div class="link-peer">
                        <strong>${this.escapeHTML(tgt.name)}</strong>
                        <code>${tgt.ip}</code>
                    </div>
                </td>
                <td>
                    <select class="select-link-speed">
                        <option value="100 Мбит/с" ${link.speed === '100 Мбит/с' ? 'selected' : ''}>100 Мбит/с (Fast Ethernet)</option>
                        <option value="1 Гбит/с" ${link.speed === '1 Гбит/с' ? 'selected' : ''}>1 Гбит/с (Gigabit)</option>
                        <option value="10 Гбит/с" ${link.speed === '10 Гбит/с' ? 'selected' : ''}>10 Гбит/с (10G Fiber)</option>
                        <option value="300 Мбит/с" ${link.speed === '300 Мбит/с' ? 'selected' : ''}>300 Мбит/с (Wi-Fi 802.11n)</option>
                    </select>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-tbl-action btn-toggle-link" title="Симулировать разрыв/восстановление кабеля">
                            ${isActive ? 'Разорвать' : 'Восстановить'}
                        </button>
                        <button class="btn-tbl-action btn-delete-row" title="Удалить соединение">
                            ✕
                        </button>
                    </div>
                </td>
            `;

            // Изменение скорости
            const speedSel = tr.querySelector('.select-link-speed');
            speedSel.addEventListener('change', (e) => {
                this.networkGraph.updateLink(link.id, { speed: e.target.value });
                terminal.log('LINK', `Скорость соединения ${src.name} ↔ ${tgt.name} изменена на: ${e.target.value}`, 'info');
                if (window.showToast) window.showToast('Скорость линка обновлена', 'info');
            });

            // Разрыв / восстановление
            const toggleBtn = tr.querySelector('.btn-toggle-link');
            toggleBtn.addEventListener('click', () => {
                this.networkGraph.toggleLinkStatus(link.id);
                sounds.playClick();
                terminal.log('LINK', `Линк ${src.name} ↔ ${tgt.name} переведен в: ${link.status.toUpperCase()}`, isActive ? 'warn' : 'success');
            });

            // Удаление
            const deleteBtn = tr.querySelector('.btn-delete-row');
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Удалить кабель между "${src.name}" и "${tgt.name}"?`)) {
                    this.networkGraph.removeLink(link.id);
                    sounds.playDisconnect();
                    terminal.log('LINK', `Кабель между [${src.name}] и [${tgt.name}] удален.`, 'warn');
                    if (window.showToast) window.showToast('Соединение удалено', 'info');
                }
            });

            this.tableBody.appendChild(tr);
        });
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

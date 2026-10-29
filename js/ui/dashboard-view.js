/**
 * NetMap 3D — Панель аналитики (Dashboard View)
 * Отображает высокоуровневую статистику сети, здоровье топологии и быстрые действия.
 */

import { sounds } from '../audio/sound-effects.js';
import { terminal } from './terminal-log.js';

export class DashboardView {
    constructor(networkGraph, appController) {
        this.networkGraph = networkGraph;
        this.appController = appController;

        this.initElements();
        this.initEvents();
    }

    initElements() {
        this.statTotalDevices = document.getElementById('dash-stat-devices');
        this.statActiveLinks = document.getElementById('dash-stat-links');
        this.statOnlineDevices = document.getElementById('dash-stat-online');
        this.statOfflineDevices = document.getElementById('dash-stat-offline');
        this.statThroughput = document.getElementById('dash-stat-bandwidth');
        this.statHealthPercent = document.getElementById('dash-health-percent');
        this.healthProgress = document.getElementById('dash-health-progress');
        this.deviceBreakdownList = document.getElementById('dash-device-breakdown');
        this.isolatedAlertList = document.getElementById('dash-isolated-alert');
    }

    initEvents() {
        this.networkGraph.on('stateChanged', () => this.updateMetrics());

        // Быстрые диагностические кнопки
        const btnCheckHealth = document.getElementById('btn-dash-check-health');
        if (btnCheckHealth) {
            btnCheckHealth.addEventListener('click', () => this.runHealthDiagnostic());
        }

        const btnFixIsolated = document.getElementById('btn-dash-find-isolated');
        if (btnFixIsolated) {
            btnFixIsolated.addEventListener('click', () => this.findIsolatedNodes());
        }
    }

    updateMetrics() {
        const stats = this.networkGraph.getStatistics();

        if (this.statTotalDevices) this.statTotalDevices.textContent = stats.totalDevices;
        if (this.statActiveLinks) this.statActiveLinks.textContent = `${stats.activeLinks} / ${stats.totalLinks}`;
        if (this.statOnlineDevices) this.statOnlineDevices.textContent = stats.onlineDevices;
        if (this.statOfflineDevices) this.statOfflineDevices.textContent = stats.offlineDevices;
        if (this.statThroughput) this.statThroughput.textContent = `${stats.totalThroughputGbps} Гбит/с`;

        if (this.statHealthPercent) this.statHealthPercent.textContent = `${stats.networkHealthPercent}%`;
        if (this.healthProgress) {
            this.healthProgress.style.width = `${stats.networkHealthPercent}%`;
            this.healthProgress.style.background = stats.networkHealthPercent > 80 ? 'var(--neon-green)' : (stats.networkHealthPercent > 50 ? 'var(--neon-orange)' : 'var(--neon-red)');
        }

        // Обновление распределения типов устройств
        this.renderDeviceBreakdown();
        this.checkIsolatedDevices();
    }

    renderDeviceBreakdown() {
        if (!this.deviceBreakdownList) return;
        this.deviceBreakdownList.innerHTML = '';

        const nodes = this.networkGraph.getAllNodes();
        const counts = {};
        nodes.forEach(n => {
            counts[n.type] = (counts[n.type] || 0) + 1;
        });

        const typeLabels = {
            computer: 'Компьютеры (PC)',
            laptop: 'Ноутбуки',
            router: 'Маршрутизаторы',
            switch: 'Коммутаторы',
            server: 'Серверы',
            firewall: 'Межсетевые экраны',
            cloud: 'Облачные шлюзы',
            database: 'Базы данных'
        };

        const total = nodes.length || 1;

        Object.entries(counts).forEach(([type, count]) => {
            const percent = Math.round((count / total) * 100);
            const row = document.createElement('div');
            row.className = 'dash-breakdown-row';
            row.innerHTML = `
                <div class="dash-breakdown-label">
                    <span>${typeLabels[type] || type}</span>
                    <strong>${count} (${percent}%)</strong>
                </div>
                <div class="dash-bar-bg">
                    <div class="dash-bar-fill" style="width: ${percent}%;"></div>
                </div>
            `;
            this.deviceBreakdownList.appendChild(row);
        });
    }

    checkIsolatedDevices() {
        if (!this.isolatedAlertList) return;
        const nodes = this.networkGraph.getAllNodes();
        const isolated = nodes.filter(n => this.networkGraph.getLinksForNode(n.id).length === 0);

        if (isolated.length === 0) {
            this.isolatedAlertList.innerHTML = `
                <div class="dash-diagnostic-item success">
                    <span>✓ Все узлы сети корректно соединены кабелями</span>
                </div>
            `;
        } else {
            this.isolatedAlertList.innerHTML = `
                <div class="dash-diagnostic-item warning">
                    <span>⚠️ Обнаружено ${isolated.length} изолированных устройств без кабельных линков (${isolated.map(n => n.name).slice(0, 2).join(', ')}${isolated.length > 2 ? '...' : ''})</span>
                </div>
            `;
        }
    }

    runHealthDiagnostic() {
        sounds.playClick();
        const stats = this.networkGraph.getStatistics();
        terminal.log('DIAGNOSTIC', `=== ЗАПУСК ДИАГНОСТИКИ ЗДОРОВЬЯ СЕТИ ===`, 'info');
        terminal.log('DIAGNOSTIC', `Всего узлов: ${stats.totalDevices} | В сети: ${stats.onlineDevices} | Офлайн: ${stats.offlineDevices}`, 'info');
        terminal.log('DIAGNOSTIC', `Активных линков: ${stats.activeLinks} | Разорванных: ${stats.brokenLinks}`, stats.brokenLinks > 0 ? 'warn' : 'success');
        terminal.log('DIAGNOSTIC', `Общая пропускная способность: ${stats.totalThroughputGbps} Гбит/с`, 'info');
        terminal.log('DIAGNOSTIC', `Индекс здоровья топологии: ${stats.networkHealthPercent}%`, stats.networkHealthPercent > 80 ? 'success' : 'warn');

        if (window.showToast) {
            window.showToast(`Диагностика завершена: Здоровье сети ${stats.networkHealthPercent}%`, 'success');
        }
    }

    findIsolatedNodes() {
        sounds.playClick();
        const nodes = this.networkGraph.getAllNodes();
        const isolated = nodes.filter(n => this.networkGraph.getLinksForNode(n.id).length === 0);

        if (isolated.length === 0) {
            if (window.showToast) window.showToast('Изолированных узлов нет! Сеть полностью скоммутирована.', 'success');
        } else {
            terminal.log('WARNING', `Изолированные узлы без соединений: ${isolated.map(n => `[${n.name}]`).join(', ')}`, 'warn');
            if (window.showToast) window.showToast(`Найдено ${isolated.length} изолированных узлов. Подробности в консоли.`, 'warning');
        }
    }
}

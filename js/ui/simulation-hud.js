/**
 * NetMap 3D — Панель управления симуляцией пакетов (Simulation HUD)
 */

import { terminal } from './terminal-log.js';

export class SimulationHUD {
    constructor(networkGraph, packetSystem) {
        this.networkGraph = networkGraph;
        this.packetSystem = packetSystem;

        this.hudEl = document.getElementById('simulation-hud');
        this.sourceSelect = document.getElementById('sim-source');
        this.targetSelect = document.getElementById('sim-target');
        this.protocolSelect = document.getElementById('sim-protocol');
        this.speedSelect = document.getElementById('sim-speed');
        this.btnRun = document.getElementById('btn-run-sim');
        this.btnRandom = document.getElementById('btn-random-sim');
        this.btnClear = document.getElementById('btn-clear-sim');

        // Телеметрия
        this.valStatus = document.getElementById('telemetry-status');
        this.valHops = document.getElementById('telemetry-hops');
        this.valLatency = document.getElementById('telemetry-latency');
        this.valLoss = document.getElementById('telemetry-loss');

        this.initEvents();
        this.updateDeviceDropdowns();
    }

    initEvents() {
        if (this.btnRun) {
            this.btnRun.addEventListener('click', () => this.runSimulation());
        }

        if (this.btnRandom) {
            this.btnRandom.addEventListener('click', () => this.runRandomPing());
        }

        if (this.btnClear) {
            this.btnClear.addEventListener('click', () => this.clearSimulation());
        }

        if (this.speedSelect) {
            this.speedSelect.addEventListener('change', (e) => {
                const speed = parseFloat(e.target.value) || 1.0;
                this.packetSystem.setSpeed(speed);
                terminal.log('SIMULATION', `Скорость симуляции изменена: ${speed}x`, 'info');
            });
        }

        // Подписка на события сетевого графа для обновления списков
        this.networkGraph.on('stateChanged', () => this.updateDeviceDropdowns());

        // Подписка на события системы пакетов
        this.packetSystem.onEvent((type, payload) => this.handlePacketEvent(type, payload));
    }

    updateDeviceDropdowns() {
        if (!this.sourceSelect || !this.targetSelect) return;

        const currentSource = this.sourceSelect.value;
        const currentTarget = this.targetSelect.value;

        const nodes = this.networkGraph.getAllNodes();

        let optionsHtml = '<option value="">-- Выберите устройство --</option>';
        nodes.forEach(node => {
            const statusLabel = node.status === 'offline' ? ' [ОФЛАЙН]' : '';
            optionsHtml += `<option value="${node.id}">${this.escapeHTML(node.name)} (${node.ip})${statusLabel}</option>`;
        });

        this.sourceSelect.innerHTML = optionsHtml;
        this.targetSelect.innerHTML = optionsHtml;

        if (currentSource && this.networkGraph.getNode(currentSource)) {
            this.sourceSelect.value = currentSource;
        }
        if (currentTarget && this.networkGraph.getNode(currentTarget)) {
            this.targetSelect.value = currentTarget;
        }
    }

    runSimulation() {
        const sourceId = this.sourceSelect.value;
        const targetId = this.targetSelect.value;
        const protocol = this.protocolSelect ? this.protocolSelect.value : 'ICMP Echo (Ping)';

        if (!sourceId || !targetId) {
            if (window.showToast) {
                window.showToast('Выберите источник и назначение для симуляции', 'warning');
            }
            return;
        }

        if (sourceId === targetId) {
            if (window.showToast) {
                window.showToast('Источник и назначение не могут совпадать (Localhost loopback)', 'warning');
            }
            return;
        }

        this.updateTelemetry('Передача...', '--', '--', '0%');
        this.packetSystem.sendPacket(sourceId, targetId, protocol);
    }

    runRandomPing() {
        const nodes = this.networkGraph.getAllNodes().filter(n => n.status === 'online');
        if (nodes.length < 2) {
            if (window.showToast) {
                window.showToast('Требуется как минимум 2 активных устройства в сети', 'warning');
            }
            return;
        }

        const idx1 = Math.floor(Math.random() * nodes.length);
        let idx2 = Math.floor(Math.random() * nodes.length);
        while (idx2 === idx1) {
            idx2 = Math.floor(Math.random() * nodes.length);
        }

        this.sourceSelect.value = nodes[idx1].id;
        this.targetSelect.value = nodes[idx2].id;
        this.runSimulation();
    }

    clearSimulation() {
        this.packetSystem.clear();
        this.updateTelemetry('В ожидании', '0', '0 мс', '0%');
        terminal.log('SIMULATION', 'Симуляция пакетов остановлена.', 'info');
    }

    handlePacketEvent(type, payload) {
        switch (type) {
            case 'simulation_start':
                this.updateTelemetry('В пути...', `${payload.route.hopCount}`, `${payload.route.totalLatencyMs} мс`, '0%');
                terminal.log('ROUTER', `[PING START] Отправка ${payload.packetType} от [${payload.route.sourceNode.ip}] к [${payload.route.targetNode.ip}] (Хопов: ${payload.route.hopCount})`, 'info');
                break;

            case 'hop_step':
                terminal.log('PACKET', `Хоп ${payload.hopNumber}/${payload.totalHops}: ${payload.from.ip} -> ${payload.to.ip} (${payload.speed})`, 'info');
                break;

            case 'destination_reached':
                terminal.log('ROUTER', `Пакет достиг адресата [${payload.node.name}]. Отправка подтверждения (ACK)...`, 'success');
                break;

            case 'simulation_complete':
                this.updateTelemetry('Доставлено ✓', `${payload.route.hopCount}`, `${payload.totalLatency} мс`, '0%');
                terminal.log('PING', `✓ Успех: 1/1 пакетов доставлено. Среднее RTT: ${payload.totalLatency} мс. Потери: 0%`, 'success');
                if (window.showToast) {
                    window.showToast(`Пакет успешно доставлен! Задержка: ${payload.totalLatency} мс`, 'success');
                }
                break;

            case 'packet_error':
            case 'packet_drop':
                this.updateTelemetry('Ошибка ✗', '--', 'Таймаут', '100%');
                terminal.log('ERROR', `✗ Потеря пакета: ${payload.error || payload.reason}`, 'error');
                if (window.showToast) {
                    window.showToast(`Ошибка маршрутизации: ${payload.error || payload.reason}`, 'error');
                }
                break;
        }
    }

    updateTelemetry(status, hops, latency, loss) {
        if (this.valStatus) this.valStatus.textContent = status;
        if (this.valHops) this.valHops.textContent = hops;
        if (this.valLatency) this.valLatency.textContent = latency;
        if (this.valLoss) this.valLoss.textContent = loss;
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

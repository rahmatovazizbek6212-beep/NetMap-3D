/**
 * NetMap 3D — Главный управляющий модуль приложения
 */

import { SceneManager } from './scene/scene-manager.js';
import { deviceBuilder } from './models/device-builder.js';
import { NetworkGraph } from './topology/network-graph.js';
import { ConnectionMeshManager } from './topology/connection-mesh.js';
import { PacketSystem } from './topology/packet-system.js';
import { SceneRaycaster } from './interaction/raycaster.js';
import { ConnectTool } from './interaction/connect-tool.js';

import { notifications } from './ui/notifications.js';
import { terminal } from './ui/terminal-log.js';
import { ConfigPanel } from './ui/config-panel.js';
import { SimulationHUD } from './ui/simulation-hud.js';
import { DashboardView } from './ui/dashboard-view.js';
import { DevicesView } from './ui/devices-view.js';
import { ConnectionsView } from './ui/connections-view.js';
import { ProjectsManager } from './ui/projects-manager.js';
import { SettingsView } from './ui/settings-view.js';

import { exportSceneToPNG } from './utils/export-png.js';
import { sounds } from './audio/sound-effects.js';

export class AppController {
    constructor() {
        this.deviceMeshes = new Map(); // nodeId -> THREE.Group
        this.currentTab = 'topology';

        this.initCore();
        this.initUI();
        this.bindEvents();

        // Загрузка начального проекта (университетская топология)
        this.projectsManager.loadProject('preset-university');
    }

    initCore() {
        // 1. Контейнер 3D холста
        const canvasContainer = document.getElementById('canvas-container');
        this.sceneManager = new SceneManager(canvasContainer);

        // 2. Сетевой граф
        this.networkGraph = new NetworkGraph();

        // 3. Менеджер 3D кабелей
        this.connectionMeshManager = new ConnectionMeshManager(this.sceneManager.scene, this.networkGraph);

        // 4. Система пакетов данных
        this.packetSystem = new PacketSystem(this.sceneManager.scene, this.connectionMeshManager, this.networkGraph);

        // 5. Интерактивный Raycaster и Drag-and-Drop
        this.raycaster = new SceneRaycaster(
            this.sceneManager,
            this.networkGraph,
            this.connectionMeshManager,
            this.deviceMeshes
        );

        // 6. Инструмент интерактивного соединения
        this.connectTool = new ConnectTool(this.sceneManager, this.networkGraph, this.raycaster);

        // Регистрация цикла обновлений анимации
        this.sceneManager.registerAnimationCallback((delta) => {
            this.connectionMeshManager.update(delta);
            this.packetSystem.update(delta);
        });

        // Реакция на события сетевого графа
        this.networkGraph.on('nodeAdded', (node) => this.onNodeAdded(node));
        this.networkGraph.on('nodeRemoved', (data) => this.onNodeRemoved(data));
        this.networkGraph.on('linkAdded', () => this.connectionMeshManager.syncWithGraph());
        this.networkGraph.on('linkRemoved', () => this.connectionMeshManager.syncWithGraph());
        this.networkGraph.on('stateChanged', () => this.updateHeaderMetrics());
    }

    initUI() {
        // Панель конфигурации устройства
        this.configPanel = new ConfigPanel(
            this.networkGraph,
            deviceBuilder,
            this.connectionMeshManager,
            this.deviceMeshes,
            this.sceneManager
        );

        // HUD симуляции
        this.simulationHUD = new SimulationHUD(this.networkGraph, this.packetSystem);

        // Вкладки интерфейса
        this.dashboardView = new DashboardView(this.networkGraph, this);
        this.devicesView = new DevicesView(this.networkGraph, this);
        this.connectionsView = new ConnectionsView(this.networkGraph, this);
        this.projectsManager = new ProjectsManager(this.networkGraph, this);
        this.settingsView = new SettingsView(this.sceneManager, this);

        // Обработка выбора узла мышью в 3D
        this.raycaster.setNodeSelectedCallback((nodeData) => {
            if (this.connectTool.isActive && nodeData) {
                // Если активен инструмент соединения — передаем клик ему
                this.connectTool.handleNodeClick(nodeData);
                return;
            }
            if (nodeData) {
                this.configPanel.show(nodeData);
            } else {
                this.configPanel.hide();
            }
        });
    }

    bindEvents() {
        // 1. Переключение вкладок в сайдбаре и шапке
        const navButtons = document.querySelectorAll('[data-view-target]');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = btn.getAttribute('data-view-target');
                this.switchTab(target);
            });
        });

        // 2. Кнопки панели добавления устройств (Toolbar)
        const addDeviceButtons = document.querySelectorAll('[data-add-device]');
        addDeviceButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-add-device');
                this.addNewDevice(type);
            });
        });

        // 3. Быстрые действия в топбаре и HUD
        const btnConnect = document.getElementById('btn-tool-connect');
        if (btnConnect) {
            btnConnect.addEventListener('click', () => this.activateConnectMode());
        }

        const btnCancelConnect = document.getElementById('btn-cancel-connect');
        if (btnCancelConnect) {
            btnCancelConnect.addEventListener('click', () => this.connectTool.deactivate());
        }

        const btnResetView = document.getElementById('btn-reset-view');
        if (btnResetView) {
            btnResetView.addEventListener('click', () => {
                this.sceneManager.controls.resetView();
                sounds.playClick();
            });
        }

        const btnTopDown = document.getElementById('btn-view-top');
        if (btnTopDown) {
            btnTopDown.addEventListener('click', () => {
                this.sceneManager.controls.setTopDownView();
                sounds.playClick();
            });
        }

        const btnIso = document.getElementById('btn-view-iso');
        if (btnIso) {
            btnIso.addEventListener('click', () => {
                this.sceneManager.controls.setIsometricView();
                sounds.playClick();
            });
        }

        const btnAutoRotate = document.getElementById('btn-view-rotate');
        if (btnAutoRotate) {
            btnAutoRotate.addEventListener('click', () => {
                const active = this.sceneManager.controls.toggleAutoRotate();
                btnAutoRotate.classList.toggle('active', active);
                sounds.playClick();
            });
        }

        const btnExportPNG = document.getElementById('btn-export-png');
        if (btnExportPNG) {
            btnExportPNG.addEventListener('click', () => {
                exportSceneToPNG(this.sceneManager, this.networkGraph);
            });
        }

        const btnFullscreen = document.getElementById('btn-fullscreen');
        if (btnFullscreen) {
            btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
        }

        const btnQuickSave = document.getElementById('btn-quick-save');
        if (btnQuickSave) {
            btnQuickSave.addEventListener('click', () => {
                this.projectsManager.saveCurrentProjectPrompt();
            });
        }

        const btnAudioToggle = document.getElementById('btn-quick-audio');
        if (btnAudioToggle) {
            btnAudioToggle.addEventListener('click', () => {
                const isMuted = !sounds.isMuted();
                sounds.setMuted(isMuted);
                btnAudioToggle.classList.toggle('muted', isMuted);
                btnAudioToggle.innerHTML = isMuted ? '🔇' : '🔊';
            });
        }

        // Горячие клавиши (Keyboard shortcuts)
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С') {
                this.activateConnectMode();
            } else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
                this.sceneManager.controls.resetView();
            } else if (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З') {
                this.simulationHUD.runRandomPing();
            }
        });
    }

    switchTab(tabId) {
        this.currentTab = tabId;
        sounds.playClick();

        // Обновляем активный класс в меню
        document.querySelectorAll('[data-view-target]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view-target') === tabId);
        });

        // Скрываем / показываем секции
        const views = document.querySelectorAll('.app-view');
        views.forEach(v => {
            const isTarget = v.id === `view-${tabId}`;
            v.classList.toggle('active', isTarget);
        });

        // Если перешли в 3D Топологию — обновляем размер рендерера
        if (tabId === 'topology') {
            setTimeout(() => {
                this.sceneManager.onWindowResize();
            }, 50);
        } else if (tabId === 'dashboard') {
            this.dashboardView.updateMetrics();
        } else if (tabId === 'devices') {
            this.devicesView.render();
        } else if (tabId === 'connections') {
            this.connectionsView.render();
        } else if (tabId === 'projects') {
            this.projectsManager.render();
        }
    }

    addNewDevice(type) {
        sounds.playClick();

        // Размещаем новое устройство с небольшим случайным смещением около центра
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 15 + 10;
        const x = Math.round(Math.cos(angle) * radius * 10) / 10;
        const z = Math.round(Math.sin(angle) * radius * 10) / 10;

        const defaultNames = {
            computer: 'Рабочая станция (ПК)',
            laptop: 'Ноутбук инженера',
            router: 'Маршрутизатор доступа',
            switch: 'Коммутатор уровня доступа',
            server: 'Вычислительный сервер',
            firewall: 'Шлюз безопасности',
            cloud: 'Облачная сеть',
            database: 'Сервер баз данных'
        };

        const node = this.networkGraph.addNode({
            type: type,
            name: defaultNames[type] || 'Новое устройство',
            x: x,
            y: 0,
            z: z,
            status: 'online'
        });

        terminal.log('TOPOLOGY', `Добавлено устройство [${node.name}] (${node.ip})`, 'success');
        if (window.showToast) {
            window.showToast(`Добавлено: ${node.name}`, 'success');
        }

        // Если находимся не в 3D Топологии — переключаем туда
        if (this.currentTab !== 'topology') {
            this.switchTab('topology');
        }

        // Выделяем добавленный узел
        setTimeout(() => {
            this.raycaster.selectNode(node.id);
            this.sceneManager.controls.focusNode(new THREE.Vector3(node.x, 0, node.z));
        }, 100);
    }

    activateConnectMode() {
        if (this.currentTab !== 'topology') {
            this.switchTab('topology');
        }
        this.connectTool.activate();
    }

    focusNodeIn3D(nodeId) {
        const node = this.networkGraph.getNode(nodeId);
        if (!node) return;

        if (this.currentTab !== 'topology') {
            this.switchTab('topology');
        }

        setTimeout(() => {
            this.raycaster.selectNode(nodeId);
            this.sceneManager.controls.focusNode(new THREE.Vector3(node.x, 0, node.z));
        }, 50);
    }

    openNodeConfig(nodeId) {
        this.focusNodeIn3D(nodeId);
    }

    onNodeAdded(node) {
        const mesh = deviceBuilder.buildDeviceMesh(node);
        this.sceneManager.scene.add(mesh);
        this.deviceMeshes.set(node.id, mesh);
    }

    onNodeRemoved(data) {
        const mesh = this.deviceMeshes.get(data.id);
        if (mesh) {
            this.sceneManager.scene.remove(mesh);
            this.deviceMeshes.delete(data.id);
        }
    }

    sync3DScene() {
        // Очищаем существующие 3D меши узлов
        this.deviceMeshes.forEach(mesh => {
            this.sceneManager.scene.remove(mesh);
        });
        this.deviceMeshes.clear();

        // Создаем новые меши для всех узлов в графе
        const nodes = this.networkGraph.getAllNodes();
        nodes.forEach(node => {
            const mesh = deviceBuilder.buildDeviceMesh(node);
            this.sceneManager.scene.add(mesh);
            this.deviceMeshes.set(node.id, mesh);
        });

        // Синхронизируем кабели
        this.connectionMeshManager.syncWithGraph();

        // Сбрасываем выделение и скрываем панель
        this.raycaster.deselectNode();
        this.configPanel.hide();
        this.updateHeaderMetrics();
    }

    updateHeaderMetrics() {
        const stats = this.networkGraph.getStatistics();

        const badgeDevices = document.getElementById('hdr-stat-devices');
        if (badgeDevices) badgeDevices.textContent = `${stats.totalDevices} узлов`;

        const badgeLinks = document.getElementById('hdr-stat-links');
        if (badgeLinks) badgeLinks.textContent = `${stats.activeLinks} линков`;

        const badgeOnline = document.getElementById('hdr-stat-online');
        if (badgeOnline) badgeOnline.textContent = `${stats.onlineDevices} онлайн`;

        const badgeSpeed = document.getElementById('hdr-stat-speed');
        if (badgeSpeed) badgeSpeed.textContent = `${stats.totalThroughputGbps} Gbps`;
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Fullscreen error:', err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
}

// Запуск приложения при загрузке DOM
window.addEventListener('DOMContentLoaded', () => {
    window.app = new AppController();
});

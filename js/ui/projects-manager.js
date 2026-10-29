/**
 * NetMap 3D — Менеджер проектов топологий (Projects Manager)
 * Сохранение, загрузка, экспорт и импорт в LocalStorage и JSON-файлы.
 */

import { universityNetworkPreset } from '../../presets/university-network.js';
import { sounds } from '../audio/sound-effects.js';
import { terminal } from './terminal-log.js';

export class ProjectsManager {
    constructor(networkGraph, appController) {
        this.networkGraph = networkGraph;
        this.appController = appController;
        this.storageKey = 'netmap3d_saved_projects';
        this.currentProjectId = 'preset-university';

        this.projectsListEl = document.getElementById('projects-grid');
        this.btnNewProject = document.getElementById('btn-new-project');
        this.btnSaveCurrent = document.getElementById('btn-save-project');
        this.btnExportJson = document.getElementById('btn-export-json');
        this.inputImportJson = document.getElementById('input-import-json');

        this.init();
    }

    init() {
        this.ensurePresetsExist();
        this.initEvents();
        this.render();
    }

    initEvents() {
        if (this.btnNewProject) {
            this.btnNewProject.addEventListener('click', () => this.createNewProject());
        }

        if (this.btnSaveCurrent) {
            this.btnSaveCurrent.addEventListener('click', () => this.saveCurrentProjectPrompt());
        }

        if (this.btnExportJson) {
            this.btnExportJson.addEventListener('click', () => this.exportCurrentProjectJSON());
        }

        if (this.inputImportJson) {
            this.inputImportJson.addEventListener('change', (e) => this.handleImportJSON(e));
        }
    }

    getSavedProjects() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Ошибка чтения проектов из LocalStorage:', e);
            return [];
        }
    }

    saveProjectsToStorage(projects) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(projects));
        } catch (e) {
            console.error('Ошибка сохранения проектов в LocalStorage:', e);
        }
    }

    ensurePresetsExist() {
        let projects = this.getSavedProjects();
        const hasUniv = projects.some(p => p.id === 'preset-university');

        if (!hasUniv) {
            projects.unshift(universityNetworkPreset);
            // Добавим также пресет дата-центра
            projects.push(this.createDatacenterPreset());
            this.saveProjectsToStorage(projects);
        }
    }

    createDatacenterPreset() {
        return {
            id: 'preset-datacenter',
            name: 'Дата-центр Enterprise (Spine-Leaf)',
            description: 'Высокоскоростная инфраструктура ЦОД: Spine-коммутаторы, Leaf-коммутаторы, балансировщик нагрузки и кластер серверов.',
            createdAt: '2026-10-29T10:00:00Z',
            updatedAt: '2026-10-29T10:00:00Z',
            nodes: [
                { id: 'dc-spine1', type: 'switch', name: 'Spine Switch 01', ip: '10.254.0.1', mac: '00:50:56:01:00:01', status: 'online', x: -15, y: 0, z: -20 },
                { id: 'dc-spine2', type: 'switch', name: 'Spine Switch 02', ip: '10.254.0.2', mac: '00:50:56:01:00:02', status: 'online', x: 15, y: 0, z: -20 },
                { id: 'dc-leaf1', type: 'switch', name: 'Leaf Switch A (Rack 1)', ip: '10.254.1.1', mac: '00:50:56:01:00:03', status: 'online', x: -22, y: 0, z: 0 },
                { id: 'dc-leaf2', type: 'switch', name: 'Leaf Switch B (Rack 2)', ip: '10.254.1.2', mac: '00:50:56:01:00:04', status: 'online', x: 22, y: 0, z: 0 },
                { id: 'dc-srv1', type: 'server', name: 'App Server Node 1', ip: '172.20.1.11', mac: '00:50:56:01:00:05', status: 'online', x: -28, y: 0, z: 22 },
                { id: 'dc-srv2', type: 'server', name: 'App Server Node 2', ip: '172.20.1.12', mac: '00:50:56:01:00:06', status: 'online', x: -16, y: 0, z: 22 },
                { id: 'dc-db1', type: 'database', name: 'Primary DB Master', ip: '172.20.2.21', mac: '00:50:56:01:00:07', status: 'online', x: 16, y: 0, z: 22 },
                { id: 'dc-db2', type: 'database', name: 'Replica DB Slave', ip: '172.20.2.22', mac: '00:50:56:01:00:08', status: 'online', x: 28, y: 0, z: 22 }
            ],
            links: [
                { id: 'dc-l1', source: 'dc-spine1', target: 'dc-leaf1', speed: '10 Гбит/с', status: 'active', type: 'fiber' },
                { id: 'dc-l2', source: 'dc-spine1', target: 'dc-leaf2', speed: '10 Гбит/с', status: 'active', type: 'fiber' },
                { id: 'dc-l3', source: 'dc-spine2', target: 'dc-leaf1', speed: '10 Гбит/с', status: 'active', type: 'fiber' },
                { id: 'dc-l4', source: 'dc-spine2', target: 'dc-leaf2', speed: '10 Гбит/с', status: 'active', type: 'fiber' },
                { id: 'dc-l5', source: 'dc-leaf1', target: 'dc-srv1', speed: '10 Гбит/с', status: 'active', type: 'ethernet' },
                { id: 'dc-l6', source: 'dc-leaf1', target: 'dc-srv2', speed: '10 Гбит/с', status: 'active', type: 'ethernet' },
                { id: 'dc-l7', source: 'dc-leaf2', target: 'dc-db1', speed: '10 Гбит/с', status: 'active', type: 'ethernet' },
                { id: 'dc-l8', source: 'dc-leaf2', target: 'dc-db2', speed: '10 Гбит/с', status: 'active', type: 'ethernet' }
            ]
        };
    }

    render() {
        if (!this.projectsListEl) return;
        this.projectsListEl.innerHTML = '';

        const projects = this.getSavedProjects();

        projects.forEach(project => {
            const card = document.createElement('div');
            const isCurrent = project.id === this.currentProjectId;
            card.className = `project-card ${isCurrent ? 'active' : ''}`;

            const nodeCount = project.nodes ? project.nodes.length : 0;
            const linkCount = project.links ? project.links.length : 0;
            const isPreset = project.id.startsWith('preset-');

            card.innerHTML = `
                <div class="project-card-header">
                    <span class="project-badge ${isPreset ? 'preset' : 'custom'}">${isPreset ? 'Шаблон' : 'Проект'}</span>
                    ${isCurrent ? '<span class="project-current-badge">Активен</span>' : ''}
                </div>
                <h3 class="project-card-title">${this.escapeHTML(project.name)}</h3>
                <p class="project-card-desc">${this.escapeHTML(project.description || 'Пользовательский проект топологии сети')}</p>
                <div class="project-card-meta">
                    <span>Узлов: <strong>${nodeCount}</strong></span>
                    <span>Линей: <strong>${linkCount}</strong></span>
                </div>
                <div class="project-card-actions">
                    <button class="btn-proj-action btn-load-proj">Загрузить</button>
                    ${!isPreset ? `
                        <button class="btn-proj-action btn-rename-proj" title="Переименовать">✎</button>
                        <button class="btn-proj-action btn-delete-proj" title="Удалить">🗑</button>
                    ` : ''}
                </div>
            `;

            // Загрузка проекта
            const loadBtn = card.querySelector('.btn-load-proj');
            loadBtn.addEventListener('click', () => {
                this.loadProject(project.id);
            });

            // Переименование
            const renameBtn = card.querySelector('.btn-rename-proj');
            if (renameBtn) {
                renameBtn.addEventListener('click', () => {
                    const newName = prompt('Новое название проекта:', project.name);
                    if (newName && newName.trim()) {
                        project.name = newName.trim();
                        this.saveProjectsToStorage(projects);
                        this.render();
                        terminal.log('PROJECT', `Проект переименован: "${project.name}"`, 'info');
                    }
                });
            }

            // Удаление с подтверждением
            const deleteBtn = card.querySelector('.btn-delete-proj');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`Вы уверены, что хотите удалить проект "${project.name}"?`)) {
                        const updated = projects.filter(p => p.id !== project.id);
                        this.saveProjectsToStorage(updated);
                        this.render();
                        sounds.playDisconnect();
                        terminal.log('PROJECT', `Проект "${project.name}" удален.`, 'warn');
                        if (window.showToast) window.showToast('Проект удален', 'info');
                    }
                });
            }

            this.projectsListEl.appendChild(card);
        });
    }

    loadProject(projectId) {
        const projects = this.getSavedProjects();
        const found = projects.find(p => p.id === projectId);
        if (!found) return;

        this.currentProjectId = projectId;
        this.networkGraph.loadPreset(found);
        this.appController.sync3DScene();
        this.render();

        sounds.playConnect();
        terminal.log('PROJECT', `Проект "${found.name}" успешно загружен (${found.nodes.length} устройств).`, 'success');
        if (window.showToast) {
            window.showToast(`Загружен проект: "${found.name}"`, 'success');
        }

        // Переключаемся в вид 3D топологии
        this.appController.switchTab('topology');
    }

    saveCurrentProjectPrompt() {
        const name = prompt('Введите название для сохранения проекта:', 'Моя топология');
        if (!name || !name.trim()) return;

        const currentData = this.networkGraph.toJSON();
        const newProj = {
            id: `proj_${Date.now()}`,
            name: name.trim(),
            description: `Сохранено пользователем ${new Date().toLocaleDateString()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            nodes: currentData.nodes,
            links: currentData.links
        };

        const projects = this.getSavedProjects();
        projects.unshift(newProj);
        this.saveProjectsToStorage(projects);
        this.currentProjectId = newProj.id;
        this.render();

        sounds.playConnect();
        terminal.log('PROJECT', `Проект "${name}" сохранен в память браузера (LocalStorage).`, 'success');
        if (window.showToast) {
            window.showToast(`Проект "${name}" успешно сохранен!`, 'success');
        }
    }

    createNewProject() {
        if (confirm('Создать новый пустой проект? Текущая несохраненная топология будет очищена.')) {
            this.networkGraph.clear();
            this.appController.sync3DScene();
            this.currentProjectId = null;
            terminal.log('PROJECT', 'Создан новый пустой проект сети.', 'info');
            if (window.showToast) window.showToast('Новый проект создан', 'info');
            this.appController.switchTab('topology');
        }
    }

    exportCurrentProjectJSON() {
        const data = this.networkGraph.toJSON();
        data.metadata = {
            exportedAt: new Date().toISOString(),
            application: 'NetMap 3D v2.5'
        };

        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `netmap3d_export_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        terminal.log('PROJECT', 'Конфигурация топологии экспортирована в JSON-файл.', 'success');
        if (window.showToast) window.showToast('Файл JSON скачан', 'success');
    }

    handleImportJSON(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
                    throw new Error('Некорректная структура JSON: отсутствует массив узлов (nodes)');
                }

                const importedProj = {
                    id: `import_${Date.now()}`,
                    name: file.name.replace('.json', ''),
                    description: 'Импортировано из JSON файла',
                    createdAt: new Date().toISOString(),
                    nodes: parsed.nodes,
                    links: parsed.links || []
                };

                const projects = this.getSavedProjects();
                projects.unshift(importedProj);
                this.saveProjectsToStorage(projects);

                this.loadProject(importedProj.id);
                terminal.log('PROJECT', `Проект успешно импортирован из файла ${file.name}.`, 'success');
            } catch (err) {
                terminal.log('ERROR', `Ошибка импорта JSON: ${err.message}`, 'error');
                if (window.showToast) window.showToast(`Ошибка импорта: ${err.message}`, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // сброс поля выбора файла
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

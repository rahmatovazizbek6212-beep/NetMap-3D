/**
 * NetMap 3D — Настройки приложения (Settings View)
 * Управление эффектами пост-процессинга (Bloom), качеством графики и звуком.
 */

import { sounds } from '../audio/sound-effects.js';
import { terminal } from './terminal-log.js';

export class SettingsView {
    constructor(sceneManager, appController) {
        this.sceneManager = sceneManager;
        this.appController = appController;

        this.toggleBloom = document.getElementById('setting-bloom-toggle');
        this.selectParticles = document.getElementById('setting-particles-density');
        this.toggleGrid = document.getElementById('setting-grid-toggle');
        this.toggleSound = document.getElementById('setting-sound-toggle');
        this.sliderVolume = document.getElementById('setting-sound-volume');
        this.btnResetStorage = document.getElementById('btn-reset-storage');

        this.init();
    }

    init() {
        // Загрузка начальных значений
        if (this.toggleBloom) {
            this.toggleBloom.checked = this.sceneManager.bloomEnabled;
            this.toggleBloom.addEventListener('change', (e) => {
                this.sceneManager.setBloomEnabled(e.target.checked);
                terminal.log('SETTINGS', `Эффект Bloom (неоновое свечение): ${e.target.checked ? 'ВКЛ' : 'ВЫКЛ'}`, 'info');
            });
        }

        if (this.selectParticles) {
            this.selectParticles.addEventListener('change', (e) => {
                const val = e.target.value;
                if (this.sceneManager.grid) {
                    this.sceneManager.grid.setParticlesVisible(val !== 'off');
                }
                terminal.log('SETTINGS', `Плотность частиц окружения: ${val.toUpperCase()}`, 'info');
            });
        }

        if (this.toggleGrid) {
            this.toggleGrid.addEventListener('change', (e) => {
                if (this.sceneManager.grid) {
                    this.sceneManager.grid.setGridVisible(e.target.checked);
                }
                terminal.log('SETTINGS', `Сетка пола: ${e.target.checked ? 'ВКЛ' : 'ВЫКЛ'}`, 'info');
            });
        }

        if (this.toggleSound) {
            this.toggleSound.checked = !sounds.isMuted();
            this.toggleSound.addEventListener('change', (e) => {
                sounds.setMuted(!e.target.checked);
                terminal.log('SETTINGS', `Звуковые эффекты: ${e.target.checked ? 'ВКЛ' : 'ВЫКЛ'}`, 'info');
            });
        }

        if (this.sliderVolume) {
            this.sliderVolume.value = sounds.getVolume();
            this.sliderVolume.addEventListener('input', (e) => {
                sounds.setVolume(parseFloat(e.target.value));
            });
        }

        if (this.btnResetStorage) {
            this.btnResetStorage.addEventListener('click', () => {
                if (confirm('Сбросить все сохраненные проекты и вернуть заводские настройки?')) {
                    localStorage.removeItem('netmap3d_saved_projects');
                    localStorage.removeItem('netmap3d_muted');
                    localStorage.removeItem('netmap3d_volume');
                    window.location.reload();
                }
            });
        }
    }
}

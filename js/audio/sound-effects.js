/**
 * NetMap 3D — Модуль звуковых эффектов (Web Audio API)
 * Полностью процедурный синтез звуков без необходимости во внешних MP3-файлах.
 */

class SoundEffects {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.volume = 0.3;
        this.initialized = false;

        // Восстановление настроек из LocalStorage
        try {
            const savedMute = localStorage.getItem('netmap3d_muted');
            if (savedMute !== null) this.muted = JSON.parse(savedMute);
            const savedVol = localStorage.getItem('netmap3d_volume');
            if (savedVol !== null) this.volume = parseFloat(savedVol);
        } catch (e) {
            console.warn('LocalStorage недоступен для звука:', e);
        }
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.initialized = true;
            }
        } catch (e) {
            console.warn('Web Audio API не поддерживается:', e);
        }
    }

    ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.muted = !!muted;
        try {
            localStorage.setItem('netmap3d_muted', JSON.stringify(this.muted));
        } catch (e) {}
    }

    isMuted() {
        return this.muted;
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        try {
            localStorage.setItem('netmap3d_volume', this.volume.toString());
        } catch (e) {}
    }

    getVolume() {
        return this.volume;
    }

    /**
     * Быстрый клик / выбор
     */
    playClick() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

        gain.gain.setValueAtTime(this.volume * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.04);
    }

    /**
     * Выбор узла (кибернетический акцент)
     */
    playSelect() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

        gain.gain.setValueAtTime(this.volume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    /**
     * Успешное соединение двух узлов
     */
    playConnect() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = now + i * 0.05;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(this.volume * 0.22, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(start);
            osc.stop(start + 0.12);
        });
    }

    /**
     * Разрыв соединения / удаление узла
     */
    playDisconnect() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

        gain.gain.setValueAtTime(this.volume * 0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    /**
     * Прыжок пакета данных (хоп)
     */
    playPacketHop() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200 + Math.random() * 200, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.05);

        gain.gain.setValueAtTime(this.volume * 0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    /**
     * Успешная доставка пакета адресату
     */
    playPacketSuccess() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const freqs = [880, 1108.73, 1318.51, 1760];

        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + idx * 0.04;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(this.volume * 0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.18);
        });
    }

    /**
     * Ошибка маршрутизации / потеря пакета
     */
    playError() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.setValueAtTime(140, now + 0.08);

        gain.gain.setValueAtTime(this.volume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
    }
}

export const sounds = new SoundEffects();

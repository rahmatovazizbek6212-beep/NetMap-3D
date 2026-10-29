/**
 * NetMap 3D — Модуль материалов и шейдеров (Three.js)
 * Футуристическая палитра Cyber-Tech с неоновым свечением.
 */

export class CyberMaterials {
    constructor() {
        this.cache = new Map();
        this.initCommonTextures();
    }

    initCommonTextures() {
        // Создание процедурной текстуры терминальной сетки для экранов
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Темный фон терминала
        ctx.fillStyle = '#060d1a';
        ctx.fillRect(0, 0, 256, 128);

        // Неоновая сетка и строки кода
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 256; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 128);
            ctx.stroke();
        }
        for (let y = 0; y < 128; y += 16) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(256, y);
            ctx.stroke();
        }

        // Кибер-графика и текст
        ctx.fillStyle = '#00f3ff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('SYS.ONLINE [NET-01]', 12, 22);

        ctx.fillStyle = 'rgba(0, 243, 255, 0.7)';
        ctx.font = '10px monospace';
        ctx.fillText('IP: 192.168.1.100', 12, 42);
        ctx.fillText('PACKETS: 45,829 RX', 12, 58);
        ctx.fillText('PORT 443 / ACTIVE', 12, 74);

        // График активности
        ctx.strokeStyle = '#00ff9d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(12, 110);
        ctx.lineTo(40, 95);
        ctx.lineTo(80, 115);
        ctx.lineTo(130, 90);
        ctx.lineTo(180, 105);
        ctx.lineTo(240, 85);
        ctx.stroke();

        this.screenTexture = new THREE.CanvasTexture(canvas);
        this.screenTexture.wrapS = THREE.ClampToEdgeWrapping;
        this.screenTexture.wrapT = THREE.ClampToEdgeWrapping;
    }

    /**
     * Основной темный металлический материал корпусов устройств
     */
    getChassisMaterial(offline = false) {
        const key = `chassis_${offline}`;
        if (!this.cache.has(key)) {
            const mat = new THREE.MeshStandardMaterial({
                color: offline ? 0x1a1e26 : 0x0f172a,
                metalness: 0.85,
                roughness: 0.25,
                emissive: offline ? 0x05070a : 0x020617,
                emissiveIntensity: 0.2
            });
            this.cache.set(key, mat);
        }
        return this.cache.get(key);
    }

    /**
     * Неоновый светящийся материал (MeshBasicMaterial для максимальной яркости в Bloom)
     */
    getGlowMaterial(colorHex = 0x00f3ff, opacity = 1.0) {
        const key = `glow_${colorHex}_${opacity}`;
        if (!this.cache.has(key)) {
            const mat = new THREE.MeshBasicMaterial({
                color: colorHex,
                transparent: opacity < 1.0,
                opacity: opacity
            });
            this.cache.set(key, mat);
        }
        return this.cache.get(key);
    }

    /**
     * Экран монитора / ноутбука с терминальной матрицей
     */
    getScreenMaterial(offline = false) {
        if (offline) {
            return new THREE.MeshBasicMaterial({ color: 0x090d16 });
        }
        const mat = new THREE.MeshBasicMaterial({
            map: this.screenTexture,
            transparent: false
        });
        return mat;
    }

    /**
     * Голографическое кольцо подставки
     */
    getHoloRingMaterial(colorHex = 0x00f3ff, opacity = 0.45) {
        const key = `holoring_${colorHex}_${opacity}`;
        if (!this.cache.has(key)) {
            const mat = new THREE.MeshBasicMaterial({
                color: colorHex,
                transparent: true,
                opacity: opacity,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            this.cache.set(key, mat);
        }
        return this.cache.get(key);
    }

    /**
     * Материал выделенного узла
     */
    getSelectionRingMaterial() {
        return new THREE.MeshBasicMaterial({
            color: 0x00f3ff,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
    }

    /**
     * Полупрозрачный стеклянный щит (для Межсетевого экрана / Firewall)
     */
    getShieldMaterial() {
        return new THREE.MeshPhysicalMaterial({
            color: 0xff2a5f,
            emissive: 0x990022,
            emissiveIntensity: 0.7,
            metalness: 0.1,
            roughness: 0.15,
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
    }

    /**
     * Энергетическое ядро облака (Cloud)
     */
    getCloudCoreMaterial() {
        return new THREE.MeshBasicMaterial({
            color: 0x00c8ff,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
        });
    }
}

export const cyberMaterials = new CyberMaterials();

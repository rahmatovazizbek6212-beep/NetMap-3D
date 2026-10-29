/**
 * NetMap 3D — Главный менеджер 3D-сцены Three.js
 */

import { CyberGrid } from './grid.js';
import { CameraControls } from './controls.js';

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.width = container.clientWidth || window.innerWidth;
        this.height = container.clientHeight || window.innerHeight;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.grid = null;

        // Пост-обработка (Bloom)
        this.composer = null;
        this.bloomPass = null;
        this.bloomEnabled = true;

        this.clock = new THREE.Clock();
        this.animationCallbacks = [];
        this.isDestroyed = false;

        this.init();
    }

    init() {
        // 1. Создание Three.js Сцены
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x060913);
        this.scene.fog = new THREE.FogExp2(0x060913, 0.008);

        // 2. Перспективная камера
        this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.5, 500);

        // 3. WebGL Рендерер
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true // необходимо для экспорта скриншотов
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.container.appendChild(this.renderer.domElement);

        // 4. Освещение сцены
        this.setupLighting();

        // 5. Управление камерой OrbitControls
        this.controls = new CameraControls(this.camera, this.renderer.domElement);

        // 6. Кибернетический пол и частицы
        this.grid = new CyberGrid(this.scene);

        // 7. Пост-процессинг свечения (Bloom)
        this.setupBloom();

        // 8. Обработчик изменения размеров окна
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // 9. Запуск цикла рендеринга
        this.animate();
    }

    setupLighting() {
        // Мягкий базовый синий свет окружения
        const ambientLight = new THREE.AmbientLight(0x0f2347, 1.8);
        this.scene.add(ambientLight);

        // Основной верхний ключевой свет
        const keyLight = new THREE.DirectionalLight(0xd0e8ff, 1.4);
        keyLight.position.set(30, 60, 40);
        this.scene.add(keyLight);

        // Вторичный акцентный свет
        const fillLight = new THREE.DirectionalLight(0x00f3ff, 0.8);
        fillLight.position.set(-40, 30, -30);
        this.scene.add(fillLight);

        // Нижний фиолетовый контровой свет
        const rimLight = new THREE.DirectionalLight(0x9d4edd, 0.6);
        rimLight.position.set(0, -20, 0);
        this.scene.add(rimLight);
    }

    setupBloom() {
        if (!THREE.EffectComposer || !THREE.UnrealBloomPass) {
            console.warn('Three.js UnrealBloomPass не найден, используется стандартный рендеринг.');
            this.bloomEnabled = false;
            return;
        }

        try {
            const renderScene = new THREE.RenderPass(this.scene, this.camera);
            this.bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(this.width, this.height),
                0.85, // сила свечения (strength)
                0.4,  // радиус (radius)
                0.82  // порог яркости (threshold)
            );

            this.composer = new THREE.EffectComposer(this.renderer);
            this.composer.addPass(renderScene);
            this.composer.addPass(this.bloomPass);
        } catch (e) {
            console.warn('Ошибка настройки Bloom эффекта:', e);
            this.bloomEnabled = false;
        }
    }

    setBloomEnabled(enabled) {
        this.bloomEnabled = !!enabled && !!this.composer;
    }

    onWindowResize() {
        if (!this.container) return;
        this.width = this.container.clientWidth || window.innerWidth;
        this.height = this.container.clientHeight || window.innerHeight;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
        if (this.composer) {
            this.composer.setSize(this.width, this.height);
        }
    }

    registerAnimationCallback(cb) {
        if (typeof cb === 'function') {
            this.animationCallbacks.push(cb);
        }
    }

    animate() {
        if (this.isDestroyed) return;
        requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();

        // Обновление контролов и сетки
        this.controls.update(delta);
        this.grid.update(delta);

        // Обновление зарегистрированных систем (линии, пакеты, анимации)
        for (let i = 0; i < this.animationCallbacks.length; i++) {
            this.animationCallbacks[i](delta);
        }

        // Рендеринг сцены
        if (this.bloomEnabled && this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    getDomElement() {
        return this.renderer.domElement;
    }
}

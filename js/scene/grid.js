/**
 * NetMap 3D — Модуль сетки и частиц окружения
 * Создает неоновый кибернетический пол с координатной сеткой и парящие частицы данных.
 */

export class CyberGrid {
    constructor(scene) {
        this.scene = scene;
        this.gridGroup = new THREE.Group();
        this.gridGroup.name = 'cyber_grid_system';
        this.scene.add(this.gridGroup);

        this.particles = null;
        this.particleCount = 400;

        this.initGrid();
        this.initParticles();
    }

    initGrid() {
        // 1. Основная большая координатная сетка пола (160x160 единиц)
        const size = 160;
        const divisions = 80;
        const gridHelper = new THREE.GridHelper(size, divisions, 0x00f3ff, 0x142845);
        gridHelper.position.y = 0;
        this.gridGroup.add(gridHelper);

        // 2. Вторичная более редкая сетка для глубины
        const majorGrid = new THREE.GridHelper(size, 16, 0x00a8ff, 0x183055);
        majorGrid.position.y = 0.01;
        this.gridGroup.add(majorGrid);

        // 3. Центральные неоновые концентрические круги
        const centerRings = [8, 16, 32, 48];
        centerRings.forEach((r, idx) => {
            const ringGeo = new THREE.RingGeometry(r - 0.08, r + 0.08, 64);
            const ringMat = new THREE.MeshBasicMaterial({
                color: idx === 0 ? 0x00f3ff : 0x0066cc,
                transparent: true,
                opacity: 0.25 - idx * 0.04,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = -Math.PI / 2;
            ringMesh.position.y = 0.02;
            this.gridGroup.add(ringMesh);
        });

        // 4. Тонкие перекрестные лучи осей X и Z
        const axisMat = new THREE.LineBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.35 });
        const xPoints = [new THREE.Vector3(-80, 0.02, 0), new THREE.Vector3(80, 0.02, 0)];
        const zPoints = [new THREE.Vector3(0, 0.02, -80), new THREE.Vector3(0, 0.02, 80)];

        const xGeo = new THREE.BufferGeometry().setFromPoints(xPoints);
        const zGeo = new THREE.BufferGeometry().setFromPoints(zPoints);

        this.gridGroup.add(new THREE.Line(xGeo, axisMat));
        this.gridGroup.add(new THREE.Line(zGeo, axisMat));
    }

    initParticles() {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const velocities = [];

        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 140;
            positions[i * 3 + 1] = Math.random() * 35 + 0.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 140;

            velocities.push({
                x: (Math.random() - 0.5) * 0.02,
                y: Math.random() * 0.02 + 0.005,
                z: (Math.random() - 0.5) * 0.02
            });
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Текстура круглой светящейся точки
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(0, 243, 255, 1)');
        grad.addColorStop(0.3, 'rgba(0, 243, 255, 0.6)');
        grad.addColorStop(1, 'rgba(0, 243, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);

        const pTex = new THREE.CanvasTexture(canvas);
        const pMat = new THREE.PointsMaterial({
            size: 0.8,
            map: pTex,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(geo, pMat);
        this.particles.userData.velocities = velocities;
        this.gridGroup.add(this.particles);
    }

    update(delta = 0.016) {
        if (!this.particles || !this.particles.visible) return;

        const positions = this.particles.geometry.attributes.position.array;
        const vels = this.particles.userData.velocities;

        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3] += vels[i].x;
            positions[i * 3 + 1] += vels[i].y;
            positions[i * 3 + 2] += vels[i].z;

            // Сброс частиц при выходе за пределы
            if (positions[i * 3 + 1] > 35) {
                positions[i * 3 + 1] = 0.5;
                positions[i * 3] = (Math.random() - 0.5) * 140;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 140;
            }
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
    }

    setParticlesVisible(visible) {
        if (this.particles) this.particles.visible = visible;
    }

    setGridVisible(visible) {
        this.gridGroup.visible = visible;
    }
}

/**
 * NetMap 3D — Управление камерой и навигация в 3D
 */

export class CameraControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        // Инициализация OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 8;
        this.controls.maxDistance = 180;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Предотвращение ухода под пол

        // Параметры плавной интерполяции камеры (Tweening)
        this.isTransitioning = false;
        this.targetCamPos = new THREE.Vector3();
        this.targetLookAt = new THREE.Vector3();
        this.startCamPos = new THREE.Vector3();
        this.startLookAt = new THREE.Vector3();
        this.transitionProgress = 0;
        this.transitionDuration = 1.0; // секунды

        // Исходные координаты по умолчанию
        this.defaultPosition = new THREE.Vector3(0, 42, 58);
        this.defaultTarget = new THREE.Vector3(0, 0, 0);

        this.camera.position.copy(this.defaultPosition);
        this.controls.target.copy(this.defaultTarget);
    }

    update(delta = 0.016) {
        if (this.isTransitioning) {
            this.transitionProgress += delta / this.transitionDuration;
            const t = Math.min(1.0, this.transitionProgress);

            // Плавная кубическая функция easing (easeOutCubic)
            const ease = 1 - Math.pow(1 - t, 3);

            this.camera.position.lerpVectors(this.startCamPos, this.targetCamPos, ease);
            this.controls.target.lerpVectors(this.startLookAt, this.targetLookAt, ease);

            if (t >= 1.0) {
                this.isTransitioning = false;
                this.controls.enabled = true;
            }
        }

        this.controls.update();
    }

    /**
     * Плавный перелёт камеры к заданной позиции и точке фокуса
     */
    flyTo(newCamPos, newTarget, duration = 1.0) {
        this.startCamPos.copy(this.camera.position);
        this.startLookAt.copy(this.controls.target);
        this.targetCamPos.copy(newCamPos);
        this.targetLookAt.copy(newTarget);

        this.transitionProgress = 0;
        this.transitionDuration = duration;
        this.isTransitioning = true;
        this.controls.enabled = false;
    }

    /**
     * Сброс вида камеры к центру сети
     */
    resetView() {
        this.flyTo(this.defaultPosition, this.defaultTarget, 0.9);
    }

    /**
     * Фокусировка камеры на конкретном узле
     */
    focusNode(nodePos) {
        const offset = new THREE.Vector3(0, 16, 24);
        const camPos = new THREE.Vector3().copy(nodePos).add(offset);
        this.flyTo(camPos, nodePos, 0.8);
    }

    /**
     * Вид сверху (2D план)
     */
    setTopDownView() {
        const target = this.controls.target.clone();
        const camPos = new THREE.Vector3(target.x, target.y + 70, target.z + 0.01);
        this.flyTo(camPos, target, 0.8);
    }

    /**
     * Изометрический вид
     */
    setIsometricView() {
        const target = this.controls.target.clone();
        const camPos = new THREE.Vector3(target.x + 45, target.y + 40, target.z + 45);
        this.flyTo(camPos, target, 0.8);
    }

    /**
     * Включение / отключение авто-вращения
     */
    toggleAutoRotate() {
        this.controls.autoRotate = !this.controls.autoRotate;
        this.controls.autoRotateSpeed = 0.8;
        return this.controls.autoRotate;
    }

    setEnabled(enabled) {
        this.controls.enabled = enabled;
    }
}

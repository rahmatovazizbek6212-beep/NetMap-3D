/**
 * NetMap 3D — Модуль экспорта скриншота 3D-топологии (PNG)
 */

import { terminal } from '../ui/terminal-log.js';
import { sounds } from '../audio/sound-effects.js';

export function exportSceneToPNG(sceneManager, networkGraph) {
    sounds.playClick();

    const renderer = sceneManager.renderer;
    // Принудительный рендер одного кадра для гарантии заполнения буфера
    if (sceneManager.bloomEnabled && sceneManager.composer) {
        sceneManager.composer.render();
    } else {
        renderer.render(sceneManager.scene, sceneManager.camera);
    }

    const webglCanvas = renderer.domElement;
    const width = webglCanvas.width;
    const height = webglCanvas.height;

    // Создаем 2D холст для наложения водяного знака и метаданных
    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const ctx = outCanvas.getContext('2d');

    // Рисуем снимок 3D сцены
    ctx.drawImage(webglCanvas, 0, 0, width, height);

    // Добавляем фирменный кибернетический колонтитул
    const stats = networkGraph.getStatistics();
    const dateStr = new Date().toLocaleString();

    // Градиентная плашка снизу
    const barGrad = ctx.createLinearGradient(0, height - 70, 0, height);
    barGrad.addColorStop(0, 'rgba(6, 9, 19, 0)');
    barGrad.addColorStop(1, 'rgba(6, 9, 19, 0.9)');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, height - 70, width, 70);

    // Заголовок водяного знака
    ctx.fillStyle = '#00f3ff';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillText('NETMAP 3D // INTERACTIVE TOPOLOGY SIMULATOR', 24, height - 28);

    // Метаданные справа
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '14px "JetBrains Mono", monospace';
    const infoText = `УЗЛОВ: ${stats.totalDevices} | ЛИНКОВ: ${stats.activeLinks} | ДАТА: ${dateStr}`;
    const textWidth = ctx.measureText(infoText).width;
    ctx.fillText(infoText, width - textWidth - 24, height - 28);

    // Создаем ссылку для скачивания
    outCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NetMap-3D_Topology_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        terminal.log('EXPORT', `Снимок 3D-топологии успешно экспортирован в высоком разрешении.`, 'success');
        if (window.showToast) {
            window.showToast('Снимок PNG успешно сохранен!', 'success');
        }
    }, 'image/png');
}

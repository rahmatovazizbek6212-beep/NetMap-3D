/**
 * NetMap 3D — Кибер-терминал сетевых событий и логов
 */

export class TerminalLogger {
    constructor() {
        this.container = document.getElementById('terminal-content');
        this.wrapper = document.getElementById('terminal-drawer');
        this.toggleBtn = document.getElementById('btn-toggle-terminal');
        this.clearBtn = document.getElementById('btn-clear-terminal');
        this.isCollapsed = false;

        this.init();
    }

    init() {
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clear());
        }

        this.log('NET.CORE', 'Инициализация ядра сетевого симулятора NetMap 3D v2.5...', 'info');
        this.log('SYSTEM', 'Топология загружена. WebGL-контекст активен.', 'success');
    }

    log(category, message, level = 'info') {
        if (!this.container) return;

        const entry = document.createElement('div');
        entry.className = `term-line term-${level}`;

        const time = new Date().toLocaleTimeString();
        entry.innerHTML = `
            <span class="term-time">[${time}]</span>
            <span class="term-cat">[${category}]</span>
            <span class="term-msg">${this.escapeHTML(message)}</span>
        `;

        this.container.appendChild(entry);
        this.container.scrollTop = this.container.scrollHeight;

        // Ограничение на 150 записей для производительности
        while (this.container.children.length > 150) {
            this.container.removeChild(this.container.firstChild);
        }
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '';
            this.log('SYSTEM', 'Лог терминала очищен.', 'info');
        }
    }

    toggle() {
        if (!this.wrapper) return;
        this.isCollapsed = !this.isCollapsed;
        if (this.isCollapsed) {
            this.wrapper.classList.add('collapsed');
            if (this.toggleBtn) this.toggleBtn.innerHTML = '▲ Развернуть';
        } else {
            this.wrapper.classList.remove('collapsed');
            if (this.toggleBtn) this.toggleBtn.innerHTML = '▼ Свернуть';
        }
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

export const terminal = new TerminalLogger();

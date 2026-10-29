/**
 * NetMap 3D — Система всплывающих уведомлений (Toasts)
 */

export class NotificationSystem {
    constructor() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }

        window.showToast = this.show.bind(this);
    }

    show(message, type = 'info', duration = 3500) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} animate-slide-in`;

        let icon = 'ℹ️';
        if (type === 'success') icon = '✓';
        if (type === 'warning') icon = '⚠️';
        if (type === 'error') icon = '✗';

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-body">
                <div class="toast-message">${this.escapeHTML(message)}</div>
            </div>
            <button class="toast-close" title="Закрыть">&times;</button>
            <div class="toast-progress"></div>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.dismiss(toast));

        this.container.appendChild(toast);

        // Авто-закрытие
        const timer = setTimeout(() => {
            this.dismiss(toast);
        }, duration);

        toast.addEventListener('mouseenter', () => clearTimeout(timer));
    }

    dismiss(toast) {
        toast.classList.remove('animate-slide-in');
        toast.classList.add('animate-slide-out');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
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

export const notifications = new NotificationSystem();

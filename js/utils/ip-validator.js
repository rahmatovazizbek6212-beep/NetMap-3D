/**
 * NetMap 3D — Модуль валидации и сетевых утилит
 */

export const IPUtils = {
    /**
     * Проверка валидности IPv4 адреса (0.0.0.0 — 255.255.255.255)
     */
    isValidIPv4(ip) {
        if (typeof ip !== 'string') return false;
        const trimmed = ip.trim();
        const parts = trimmed.split('.');
        if (parts.length !== 4) return false;

        for (let i = 0; i < 4; i++) {
            const p = parts[i];
            if (!/^\d+$/.test(p)) return false;
            const num = parseInt(p, 10);
            if (num < 0 || num > 255) return false;
            if (p.length > 1 && p.startsWith('0')) return false; // Запрет ведущих нулей (e.g. 01)
        }
        return true;
    },

    /**
     * Проверка валидности MAC-адреса
     */
    isValidMAC(mac) {
        if (typeof mac !== 'string') return false;
        const regex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        return regex.test(mac.trim());
    },

    /**
     * Генерация случайного красивого MAC-адреса
     */
    generateMAC(prefix = '52:54:00') {
        const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
        return `${prefix}:${hex()}:${hex()}:${hex()}`;
    },

    /**
     * Автоматический подбор уникального IP для нового устройства
     */
    generateNextIP(existingNodes = [], deviceType = 'computer') {
        const usedIPs = new Set(existingNodes.map(n => n.ip));

        let subnet = '192.168.1.';
        let startHost = 10;

        if (deviceType === 'router' || deviceType === 'firewall') {
            subnet = '10.0.0.';
            startHost = 1;
        } else if (deviceType === 'server' || deviceType === 'database') {
            subnet = '172.16.1.';
            startHost = 10;
        } else if (deviceType === 'cloud') {
            return '8.8.8.8';
        } else if (deviceType === 'switch') {
            subnet = '10.0.1.';
            startHost = 1;
        }

        for (let host = startHost; host < 254; host++) {
            const candidate = `${subnet}${host}`;
            if (!usedIPs.has(candidate)) {
                return candidate;
            }
        }

        // Если все заняты, пробуем случайный
        return `192.168.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 250) + 2}`;
    },

    /**
     * Форматирование скорости передачи данных
     */
    formatSpeed(speed) {
        if (!speed) return '1 Гбит/с';
        if (typeof speed === 'number') {
            if (speed >= 1000) return `${(speed / 1000).toFixed(1)} Гбит/с`;
            return `${speed} Мбит/с`;
        }
        return speed;
    },

    /**
     * Преобразование скорости в числовой эквивалент Мбит/с для расчёта задержек
     */
    speedToMbps(speedStr) {
        if (!speedStr) return 1000;
        if (speedStr.includes('10 Гбит')) return 10000;
        if (speedStr.includes('1 Гбит')) return 1000;
        if (speedStr.includes('100 Мбит')) return 100;
        if (speedStr.includes('300 Мбит')) return 300;
        return 1000;
    }
};

/**
 * NetMap 3D — Пресет топологии: «Корпоративная сеть университета»
 */

export const universityNetworkPreset = {
    id: 'preset-university',
    name: 'Кампусная сеть университета',
    description: 'Иерархическая трёхуровневая топология кампуса: ядро (Core), распределение (Distribution), доступ (Access), серверная зона DMZ и выход в Интернет.',
    createdAt: '2026-10-29T10:00:00Z',
    updatedAt: '2026-10-29T10:00:00Z',
    nodes: [
        {
            id: 'node-cloud',
            type: 'cloud',
            name: 'Внешний шлюз Интернет (ISP)',
            ip: '8.8.8.8',
            mac: '00:1A:2B:3C:4D:01',
            status: 'online',
            x: 0,
            y: 0,
            z: -42
        },
        {
            id: 'node-firewall',
            type: 'firewall',
            name: 'Межсетевой экран DMZ',
            ip: '10.0.0.254',
            mac: '00:1A:2B:3C:4D:02',
            status: 'online',
            x: 0,
            y: 0,
            z: -26
        },
        {
            id: 'node-web-srv',
            type: 'server',
            name: 'Веб-сервер портала вуза',
            ip: '172.16.10.10',
            mac: '00:1A:2B:3C:4D:03',
            status: 'online',
            x: 20,
            y: 0,
            z: -26
        },
        {
            id: 'node-db-srv',
            type: 'database',
            name: 'Кластер БД деканата',
            ip: '172.16.10.5',
            mac: '00:1A:2B:3C:4D:04',
            status: 'online',
            x: -20,
            y: 0,
            z: -26
        },
        {
            id: 'node-core-router',
            type: 'router',
            name: 'Магистральный роутер ядра',
            ip: '10.0.0.1',
            mac: '00:1A:2B:3C:4D:05',
            status: 'online',
            x: 0,
            y: 0,
            z: -10
        },
        {
            id: 'node-core-switch',
            type: 'switch',
            name: 'Центральный коммутатор ядра',
            ip: '10.0.1.1',
            mac: '00:1A:2B:3C:4D:06',
            status: 'online',
            x: 0,
            y: 0,
            z: 6
        },
        {
            id: 'node-it-switch',
            type: 'switch',
            name: 'Коммутатор IT-факультета',
            ip: '192.168.10.1',
            mac: '00:1A:2B:3C:4D:07',
            status: 'online',
            x: -26,
            y: 0,
            z: 20
        },
        {
            id: 'node-lib-switch',
            type: 'switch',
            name: 'Коммутатор научной библиотеки',
            ip: '192.168.20.1',
            mac: '00:1A:2B:3C:4D:08',
            status: 'online',
            x: 26,
            y: 0,
            z: 20
        },
        {
            id: 'node-pc-lab1',
            type: 'computer',
            name: 'ПК Лаборатории ИИ №1',
            ip: '192.168.10.101',
            mac: '00:1A:2B:3C:4D:09',
            status: 'online',
            x: -36,
            y: 0,
            z: 34
        },
        {
            id: 'node-pc-lab2',
            type: 'computer',
            name: 'ПК Лаборатории ИИ №2',
            ip: '192.168.10.102',
            mac: '00:1A:2B:3C:4D:0A',
            status: 'online',
            x: -18,
            y: 0,
            z: 34
        },
        {
            id: 'node-prof-laptop',
            type: 'laptop',
            name: 'Ноутбук заведующего кафедрой',
            ip: '192.168.10.55',
            mac: '00:1A:2B:3C:4D:0B',
            status: 'online',
            x: -27,
            y: 0,
            z: 46
        },
        {
            id: 'node-lib-pc1',
            type: 'computer',
            name: 'Терминал электронного каталога',
            ip: '192.168.20.101',
            mac: '00:1A:2B:3C:4D:0C',
            status: 'online',
            x: 18,
            y: 0,
            z: 34
        },
        {
            id: 'node-student-laptop',
            type: 'laptop',
            name: 'Ноутбук читального зала (Wi-Fi)',
            ip: '192.168.20.102',
            mac: '00:1A:2B:3C:4D:0D',
            status: 'online',
            x: 36,
            y: 0,
            z: 34
        }
    ],
    links: [
        {
            id: 'link-1',
            source: 'node-cloud',
            target: 'node-firewall',
            speed: '10 Гбит/с',
            status: 'active',
            type: 'fiber'
        },
        {
            id: 'link-2',
            source: 'node-firewall',
            target: 'node-core-router',
            speed: '10 Гбит/с',
            status: 'active',
            type: 'fiber'
        },
        {
            id: 'link-3',
            source: 'node-firewall',
            target: 'node-web-srv',
            speed: '10 Гбит/с',
            status: 'active',
            type: 'ethernet'
        },
        {
            id: 'link-4',
            source: 'node-firewall',
            target: 'node-db-srv',
            speed: '10 Гбит/с',
            status: 'active',
            type: 'ethernet'
        },
        {
            id: 'link-5',
            source: 'node-core-router',
            target: 'node-core-switch',
            speed: '10 Гбит/с',
            status: 'active',
            type: 'fiber'
        },
        {
            id: 'link-6',
            source: 'node-core-switch',
            target: 'node-it-switch',
            speed: '1 Гбит/с',
            status: 'active',
            type: 'ethernet'
        },
        {
            id: 'link-7',
            source: 'node-core-switch',
            target: 'node-lib-switch',
            speed: '1 Гбит/с',
            status: 'active',
            type: 'ethernet'
        },
        {
            id: 'link-8',
            source: 'node-it-switch',
            target: 'node-pc-lab1',
            speed: '1 Гбит/с',
            status: 'active',
            type: 'ethernet'
        },
        {
            id: 'link-9',
            source: 'node-it-switch',
            target: 'node-pc-lab2',
            speed: '1 Гбит/с',
            status: 'active',
            type: 'ethernet'
        },
        {
            id: 'link-10',
            source: 'node-it-switch',
            target: 'node-prof-laptop',
            speed: '300 Мбит/с',
            status: 'active',
            type: 'wifi'
        },
        {
            id: 'link-11',
            source: 'node-lib-switch',
            target: 'node-lib-pc1',
            speed: '1 Гбит/с',
            status: 'active',
            type: 'ethernet'
        },
        {
            id: 'link-12',
            source: 'node-lib-switch',
            target: 'node-student-laptop',
            speed: '300 Мбит/с',
            status: 'active',
            type: 'wifi'
        }
    ]
};

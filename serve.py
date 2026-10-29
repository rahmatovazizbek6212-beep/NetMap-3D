#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NetMap 3D — Локальный веб-сервер для запуска приложения.
Запуск: python serve.py
"""

import http.server
import socketserver
import webbrowser
import os
import sys

DEFAULT_PORT = 8080

def find_free_port(start_port):
    import socket
    port = start_port
    while port < 65535:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
            port += 1
    return start_port

def main():
    # Переход в директорию скрипта
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    port = find_free_port(DEFAULT_PORT)
    url = f"http://localhost:{port}"

    handler = http.server.SimpleHTTPRequestHandler
    # Добавление правильных MIME типов для JS модулей
    handler.extensions_map.update({
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.html': 'text/html'
    })

    print("=" * 60)
    print("   🌐 NetMap 3D — 3D-симулятор топологии сетей")
    print("=" * 60)
    print(f"Сервер успешно запущен: {url}")
    print("Открытие браузера...")
    print("Для остановки сервера нажмите Ctrl + C")
    print("=" * 60)

    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"Не удалось автоматически открыть браузер: {e}")

    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nСервер остановлен пользователем.")
        sys.exit(0)

if __name__ == "__main__":
    main()

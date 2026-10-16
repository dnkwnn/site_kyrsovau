@echo off
chcp 65001 > nul
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Виртуальное окружение не найдено.
    echo Выполните: python -m venv .venv
    echo Затем: .venv\Scripts\python.exe -m pip install -r requirements.txt
    pause
    exit /b 1
)

echo Сайт: http://127.0.0.1:5000
echo Проверка API: http://127.0.0.1:5000/api/health
echo Для остановки нажмите Ctrl+C.
start "" http://127.0.0.1:5000
".venv\Scripts\python.exe" server.py
pause

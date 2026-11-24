@echo off
chcp 65001 >nul
cd /d "%~dp0"
python -m pip install --user --quiet -r requirements.txt
python server.py
pause

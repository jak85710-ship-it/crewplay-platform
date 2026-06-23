@echo off

chcp 65001 >nul

cd /d "%~dp0"

title CrewPlay backend status

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-backend-status.ps1"

pause


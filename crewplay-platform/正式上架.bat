@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
title CrewPlay 正式上架準備
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\prepare-production.ps1"
echo.
pause

@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CrewPlay 觸發 LINE 同步
echo ========================================
echo   觸發 CrewPlay LINE 同步
echo ========================================
echo.
echo 這會呼叫 api.crewplay.tw 讀取試算表並更新 LINE
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0trigger-line-sync.ps1"
echo.
pause

@echo off

chcp 65001 >nul

cd /d "%~dp0"

title CrewPlay 測試 Google 連線

echo ========================================

echo   測試 Google OAuth 連線

echo ========================================

echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0test-auth.ps1"

echo.

pause


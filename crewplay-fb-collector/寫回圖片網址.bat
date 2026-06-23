@echo off

chcp 65001 >nul

cd /d "%~dp0"

title 寫回試算表 photo 網址

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-photo-urls.ps1"

pause


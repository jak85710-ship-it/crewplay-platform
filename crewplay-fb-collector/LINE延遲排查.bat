@echo off

chcp 65001 >nul

cd /d "%~dp0"

title LINE 即時預約 延遲排查

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0measure-line-latency.ps1"

pause


@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CrewPlay LINE 羽球選項排查
echo ========================================
echo   LINE 羽球選項排查
echo ========================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%~dp0check-badminton-line.ps1'; $c=[IO.File]::ReadAllText($p,[Text.UTF8Encoding]::new($false)); [IO.File]::WriteAllText($p,$c,(New-Object Text.UTF8Encoding $true)); & $p"
echo.
echo 詳見 badminton-line-diag.txt
pause

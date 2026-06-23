@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CrewPlay 排查（第81列起）
echo ========================================
echo   排查第 81 列起（新資料區）
echo ========================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%~dp0check-sheet.ps1'; $c=[IO.File]::ReadAllText($p,[Text.UTF8Encoding]::new($false)); [IO.File]::WriteAllText($p,$c,(New-Object Text.UTF8Encoding $true)); & $p -FromRow 81"
echo.
pause

@echo off
chcp 65001 >nul
cd /d "%~dp0"
title LINE 同步完整診斷
echo ========================================
echo   LINE 同步完整診斷
echo   試算表 + 強制同步 + 告訴你去哪看結果
echo ========================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%~dp0sync-diagnose.ps1'; $c=[IO.File]::ReadAllText($p,[Text.UTF8Encoding]::new($false)); [IO.File]::WriteAllText($p,$c,(New-Object Text.UTF8Encoding $true)); & $p"
echo.
pause

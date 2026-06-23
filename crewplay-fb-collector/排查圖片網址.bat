@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CrewPlay 圖片網址排查
echo ========================================
echo   排查試算表 photo 欄（404 會像亂碼）
echo ========================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%~dp0check-photo-urls.ps1'; $c=[IO.File]::ReadAllText($p,[Text.UTF8Encoding]::new($false)); [IO.File]::WriteAllText($p,$c,(New-Object Text.UTF8Encoding $true)); & $p"
echo.
echo 開啟圖片檢查網頁：storage\index.html
start "" "%~dp0storage\index.html"
pause

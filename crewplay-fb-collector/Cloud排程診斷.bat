@echo off

chcp 65001 >nul

cd /d "%~dp0"

title CrewPlay Cloud Scheduler 診斷（GET vs POST）

color 0E

echo.

echo  ╔══════════════════════════════════════════════╗

echo  ║   Cloud Scheduler 診斷：GET vs POST          ║

echo  ╚══════════════════════════════════════════════╝

echo.

echo  用途：證明 Cloud Scheduler 必須用 POST 才會成功

echo  Cloud 預設 GET 會回 405，所以 job 顯示「失敗」

echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%~dp0test-get-post.ps1'; $c=[IO.File]::ReadAllText($p,[Text.UTF8Encoding]::new($false)); [IO.File]::WriteAllText($p,$c,(New-Object Text.UTF8Encoding $true)); & $p"

echo.

echo  若 POST 顯示 200 成功，請到 Google Cloud 把

echo  sync-google-excel 的 HTTP 方法改成 POST

echo.

echo  詳細圖文步驟請開：Cloud排程POST修正完整指南.txt

echo.

pause


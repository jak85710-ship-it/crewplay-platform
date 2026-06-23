@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CrewPlay 試算表 LINE 連結排查
echo ========================================
echo   CrewPlay 試算表 LINE 連結排查
echo ========================================
echo.
echo 正在讀取試算表並檢查每一列...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%~dp0check-sheet.ps1'; $c=[IO.File]::ReadAllText($p,[Text.UTF8Encoding]::new($false)); [IO.File]::WriteAllText($p,$c,(New-Object Text.UTF8Encoding $true)); & $p"
set ERR=%ERRORLEVEL%
echo.
if %ERR%==2 (
    echo 發現格式錯誤，詳見 check-report.txt
) else if %ERR%==1 (
    echo 執行失敗，請看上方錯誤訊息。
) else (
    echo 排查完成，詳見 check-report.txt
)
echo.
echo 提示：只查第 81 列起可執行
echo   powershell -File check-sheet.ps1 -FromRow 81
echo.
pause

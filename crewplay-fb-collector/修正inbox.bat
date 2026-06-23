@echo off

chcp 65001 >nul

cd /d "%~dp0"

title CrewPlay 修正 inbox JSON

echo ========================================

echo   修正 inbox JSON（上架前自動清理）

echo ========================================

echo.

echo 會自動：修正球館名/團名/introduce/photo/region

echo       剔除無法修正的列，產生 fix-inbox-report.json

echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%~dp0fix-inbox.ps1'; $c=[IO.File]::ReadAllText($p,[Text.UTF8Encoding]::new($false)); [IO.File]::WriteAllText($p,$c,(New-Object Text.UTF8Encoding $true)); & $p"

set ERR=%ERRORLEVEL%

echo.

if %ERR%==0 (

    echo 修正完成！請接著雙擊「執行同步.bat」寫入試算表。

) else (

    echo 修正失敗，請截圖上方錯誤訊息。

)

echo.

pause


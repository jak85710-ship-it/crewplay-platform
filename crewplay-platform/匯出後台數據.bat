@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo CrewPlay 後台數據匯出...
node scripts\export-analytics.mjs
if errorlevel 1 (
  echo 匯出失敗
  pause
  exit /b 1
)
echo.
echo 完成。請開啟資料夾：data-export
explorer "%~dp0data-export"
pause

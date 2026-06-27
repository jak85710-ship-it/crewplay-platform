@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo CrewPlay 流量數據匯出...
node scripts\export-traffic-dashboard.mjs
if errorlevel 1 (
  echo 匯出失敗
  pause
  exit /b 1
)
echo.
echo 完成。雙擊開啟：data-export\流量儀表板.html
start "" "%~dp0data-export\流量儀表板.html"
pause

@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CrewPlay 強制同步 LINE（不需 Google Cloud）
color 0B
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   強制同步 LINE（本機版，取代 Google Cloud） ║
echo  ╚══════════════════════════════════════════════╝
echo.
echo  說明：Google Cloud 按「立即執行」本來就不會有畫面，
echo        成功只會寫在 Cloud 的「記錄」裡。
echo        你用這支 bat 效果完全相同，而且會直接顯示結果。
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0trigger-line-sync.ps1"
set ERR=%ERRORLEVEL%
echo.
if %ERR%==0 (
    echo  [完成] 後台已讀取試算表。請到 LINE 官方帳號內搜尋球館測試。
) else (
    echo  [失敗] 請截圖上方錯誤訊息。
)
echo.
pause

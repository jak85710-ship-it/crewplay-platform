@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CrewPlay 寫入 Google 試算表
echo ========================================
echo   CrewPlay 寫入 Google 試算表
echo ========================================
echo.
echo 步驟 1：把 FB 下載的 JSON 檔放進 inbox 資料夾
echo   %~dp0inbox
echo.
echo 步驟 2：開始同步（同名球館/團會更新，不重複追加）...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-to-sheet.ps1"
echo.
if errorlevel 1 (
    echo 同步失敗，請看上方錯誤訊息。
) else (
    echo 同步完成！可到 Google 試算表確認資料。
)
echo.
pause

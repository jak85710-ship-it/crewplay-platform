@echo off

chcp 65001 >nul

cd /d "%~dp0"

title 清掉非 JPG 圖片網址（webp / FB 圖示 → 預設圖）

echo.

echo  會把試算表 photo 欄中：

echo    - static.xx.fbcdn.net / .webp 圖示  → 改成預設 a1.jpg

echo    - 空白 / 錯誤網址                  → 改成預設 a1.jpg

echo    - FB 貼文大圖 (scontent)           → 保留，請再跑「轉圖片上傳JPG.bat」

echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-photo-urls.ps1"

pause


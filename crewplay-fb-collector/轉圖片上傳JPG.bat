@echo off

chcp 65001 >nul

cd /d "%~dp0"

title CrewPlay 圖片轉 JPG 並上傳

color 0E

echo.

echo  ╔══════════════════════════════════════════════╗

echo  ║   圖片轉 JPG（試算表 photo 欄用）            ║

echo  ╚══════════════════════════════════════════════╝

echo.

echo  規則：photo 必須是 GCS 上的 .jpg 網址

echo        https://storage.googleapis.com/crewplay-arena-storage/photo/r列號.jpg

echo.

echo  用法：

echo    1. 把圖片放到 storage\photos-inbox\

echo       檔名 = 試算表列號，例如 72.jpg 或 72.png

echo    2. 本程式會轉成 JPG 存到 storage\photos-jpg\

echo    3. 若有安裝 gsutil，會詢問是否上傳並寫回試算表

echo.

set /p MODE=先預覽不處理？(Y=預覽 / N=開始轉檔) [Y]:

if /i "%MODE%"=="N" goto RUN

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0convert-upload-photos.ps1" -DryRun

echo.

pause

exit /b 0



:RUN

set /p UP=已安裝 Google Cloud SDK (gsutil) 要上傳嗎？(Y/N) [N]:

if /i "%UP%"=="Y" (

    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0convert-upload-photos.ps1" -Upload -UpdateSheet

) else (

    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0convert-upload-photos.ps1"

    echo.

    echo  JPG 已產生。請管理員用 gsutil 上傳後，再執行「寫回圖片網址.bat」

)

echo.

pause


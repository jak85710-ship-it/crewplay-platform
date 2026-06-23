@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "GCLOUD=%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin"
set "GSUTIL=%GCLOUD%\gsutil.cmd"
set "GCLOUD_CMD=%GCLOUD%\gcloud.cmd"

if not exist "%GSUTIL%" (
  echo [錯誤] 找不到 gsutil，請確認已安裝 Google Cloud SDK
  pause
  exit /b 1
)

echo ========================================
echo   上傳 inbox 圖片到 GCS
echo ========================================
echo.

"%GCLOUD_CMD%" auth list 2>nul | findstr /C:"ACTIVE" >nul
if errorlevel 1 (
  echo [提示] 尚未登入 Google Cloud，即將開啟登入視窗...
  "%GCLOUD_CMD%" auth login
  if errorlevel 1 (
    echo [錯誤] 登入失敗，請用有 crewplay-arena-storage 權限的帳號重試
    pause
    exit /b 1
  )
)

set JPG=storage\photos-jpg
set BUCKET=gs://crewplay-arena-storage/photo
set OK=0
set FAIL=0

for %%R in (2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 33 34 35 282) do (
  if exist "%JPG%\r%%R.jpg" (
    echo [UPLOAD] r%%R.jpg
    "%GSUTIL%" -h "Content-Type:image/jpeg" cp "%JPG%\r%%R.jpg" %BUCKET%/r%%R.jpg
    if errorlevel 1 (
      echo [FAIL] r%%R.jpg
      set /a FAIL+=1
    ) else (
      "%GSUTIL%" acl ch -u AllUsers:R %BUCKET%/r%%R.jpg 2>nul
      set /a OK+=1
    )
  )
)

echo.
echo 完成：成功 %OK% 張，失敗 %FAIL% 張
echo 下一步：雙擊「發布到網站.bat」更新網站資料
pause

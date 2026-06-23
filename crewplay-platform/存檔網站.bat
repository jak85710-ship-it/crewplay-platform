@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   CrewPlay 網站存檔（打包原始碼）
echo ========================================
echo.

set STAMP=%date:~0,4%%date:~5,2%%date:~8,2%-%time:~0,2%%time:~3,2%
set STAMP=%STAMP: =0%
set OUT=..\crewplay-platform-%STAMP%.zip
set STAGE=%TEMP%\crewplay-archive-%STAMP%

echo [1/3] 建置正式版...
call npm run build
if errorlevel 1 (
  echo 建置失敗，存檔中止
  pause
  exit /b 1
)

echo.
echo [2/3] 打包檔案（不含 node_modules、.env.local）...
mkdir "%STAGE%" 2>nul
robocopy "%~dp0" "%STAGE%" /E /XD node_modules .next .git /XF .env.local *.tsbuildinfo /NFL /NDL /NJH /NJS /nc /ns /np >nul
powershell -NoProfile -Command "Compress-Archive -Path '%STAGE%\*' -DestinationPath '%OUT%' -Force"
rmdir /s /q "%STAGE%" 2>nul

echo.
echo [3/3] 完成
echo 存檔位置：%OUT%
echo.
pause

@echo off

chcp 65001 >nul

cd /d "%~dp0"

title CrewPlay full sync

echo ========================================

echo   CrewPlay full sync

echo   Sheet write + LINE backend trigger

echo ========================================

echo.



set "HAS_INBOX=0"

for %%F in ("%~dp0inbox\*.json") do set "HAS_INBOX=1"



if "%HAS_INBOX%"=="1" goto DO_SHEET

goto SKIP_SHEET



:DO_SHEET

echo [1/2] Writing Google Sheet...

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-to-sheet.ps1"

if errorlevel 1 (

    echo.

    echo Sheet sync failed. Stopped.

    pause

    exit /b 1

)

goto STEP2



:SKIP_SHEET

echo [1/2] No new JSON in inbox. Skip sheet write.

echo       Old batches are in the done folder.

echo       Put new FB JSON into inbox to write again.

echo.



:STEP2

echo [2/2] Trigger CrewPlay backend sheet_sync...

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0trigger-line-sync.ps1"

echo.

if errorlevel 1 (

    echo Backend sync failed. See message above.

    echo If HTTP 503 / no healthy upstream: CrewPlay server is down.

    echo Run check-backend-status.bat or contact admin.

) else (

    echo Done. Test in LINE official account.

)

echo.

pause


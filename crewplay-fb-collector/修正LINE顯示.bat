@echo off

chcp 65001 >nul

cd /d "%~dp0"

title CrewPlay 修正 LINE 搜尋顯示

echo ========================================

echo   修正 LINE 搜尋（arena_name 改團名）

echo ========================================

echo.

echo 原因：LINE 搜尋用「團名」，不是「球館-團名」

echo 範例：新手互戳羽球團（可搜到）

echo       鳳西羽球館-高雄大裕隊（搜不到）

echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%~dp0fix-arena-names.ps1'; $c=[IO.File]::ReadAllText($p,[Text.UTF8Encoding]::new($false)); [IO.File]::WriteAllText($p,$c,(New-Object Text.UTF8Encoding $true)); & $p"

if errorlevel 1 (

    echo 修正失敗

    pause

    exit /b 1

)

echo.

echo [2/2] 觸發 LINE 後台重新讀取...

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0trigger-line-sync.ps1"

pause


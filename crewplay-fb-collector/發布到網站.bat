@echo off

chcp 65001 >nul

cd /d "%~dp0"

title Publish sheet to CrewPlay website

echo.

echo  Publish Google Sheet to crewplay-platform

echo  Output: crewplay-platform\public\data\teams.json

echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish-to-api.ps1"

echo.

pause


# CrewPlay 正式站 Gmail 通知 — Netlify 環境變數設定助手
# 用法：在 PowerShell 執行 .\scripts\setup-netlify-email.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env.local"

Write-Host ""
Write-Host "=== CrewPlay Gmail / Netlify 設定 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 檢查本地 .env.local
if (-not (Test-Path $envFile)) {
    Write-Host "❌ 找不到 .env.local，請先複製 .env.example 並填入 Gmail 應用程式密碼" -ForegroundColor Red
    exit 1
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([A-Z_][A-Z0-9_]*)=(.*)$') {
        $vars[$matches[1]] = $matches[2].Trim().Trim('"')
    }
}

$required = @("GMAIL_USER", "GMAIL_APP_PASSWORD", "GMAIL_NOTIFY_TO")
$missing = $required | Where-Object { -not $vars[$_] }
if ($missing.Count -gt 0) {
    Write-Host "❌ .env.local 缺少：$($missing -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 本地 .env.local 已有所需 Gmail 變數" -ForegroundColor Green
Write-Host ""

# 2. 測試 SMTP
Write-Host "正在測試 Gmail SMTP..." -ForegroundColor Yellow
Push-Location $root
node scripts/test-gmail.mjs
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    exit 1
}
Pop-Location
Write-Host ""

# 3. Netlify 指引
Write-Host "=== 下一步：Netlify 正式站 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 開啟 Netlify 後台（站名可能是 crewplay）："
Write-Host "   https://app.netlify.com/sites/crewplay/configuration/env" -ForegroundColor White
Write-Host ""
Write-Host "2. 新增或更新以下 Environment variables（Production）："
Write-Host ""
Write-Host "   GMAIL_USER          = $($vars.GMAIL_USER)"
Write-Host "   GMAIL_APP_PASSWORD  = （與 .env.local 相同的 16 碼應用程式密碼）"
Write-Host "   GMAIL_NOTIFY_TO     = $($vars.GMAIL_NOTIFY_TO)"
Write-Host "   NEXT_PUBLIC_SITE_URL = https://www.crewplay.tw"
Write-Host ""
Write-Host "3. Deploys → Trigger deploy → Clear cache and deploy site"
Write-Host ""
Write-Host "4. 測試：完成一筆揪團報名，成功頁 URL 應含 mail=sent"
Write-Host "   例：https://www.crewplay.tw/book/result?status=ok&mail=sent"
Write-Host ""

# 4. 可選：Netlify CLI 一鍵上傳（需先 netlify login + netlify link）
$netlify = Get-Command netlify -ErrorAction SilentlyContinue
if (-not $netlify) {
    Write-Host "（選用）若要 CLI 自動上傳變數，請先：" -ForegroundColor DarkGray
    Write-Host "   npx netlify-cli login" -ForegroundColor DarkGray
    Write-Host "   npx netlify-cli link   # 選 crewplay 站" -ForegroundColor DarkGray
    Write-Host "   再重新執行本腳本" -ForegroundColor DarkGray
    exit 0
}

$linkFile = Join-Path $root ".netlify\state.json"
if (-not (Test-Path $linkFile)) {
    Write-Host "（選用）尚未 netlify link，請手動在網頁後台設定，或執行：netlify link" -ForegroundColor DarkGray
    exit 0
}

Write-Host "偵測到 Netlify 已 link，是否上傳 Gmail 變數到 Production？(Y/N)" -ForegroundColor Yellow
$ans = Read-Host
if ($ans -notmatch '^[Yy]') { exit 0 }

Push-Location $root
netlify env:set GMAIL_USER $vars.GMAIL_USER --context production
netlify env:set GMAIL_APP_PASSWORD $vars.GMAIL_APP_PASSWORD --context production
netlify env:set GMAIL_NOTIFY_TO $vars.GMAIL_NOTIFY_TO --context production
netlify env:set NEXT_PUBLIC_SITE_URL "https://www.crewplay.tw" --context production
Pop-Location

Write-Host ""
Write-Host "✅ 已寫入 Netlify Production 環境變數" -ForegroundColor Green
Write-Host "請到 Netlify → Deploys → Clear cache and deploy" -ForegroundColor Yellow

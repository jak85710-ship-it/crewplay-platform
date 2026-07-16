# Production prep: sync spreadsheet, validate data, build
param(
    [switch]$SkipPublish,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$Platform = Split-Path $PSScriptRoot -Parent
$RepoRoot = Split-Path $Platform -Parent
$Collector = Join-Path $RepoRoot "crewplay-fb-collector"
$TeamsFile = Join-Path $Platform "public\data\teams.json"
$PhotoDir = Join-Path $Platform "public\photo"

Write-Host ""
Write-Host "========================================"
Write-Host "  CrewPlay production prep"
Write-Host "  Site: https://www.crewplay.tw"
Write-Host "========================================"
Write-Host ""

if (-not $SkipPublish) {
    $publishScript = Join-Path $Collector "publish-to-api.ps1"
    if (Test-Path $publishScript) {
        Write-Host "[1/4] Sync Google Sheet -> teams.json ..."
        & powershell -NoProfile -ExecutionPolicy Bypass -File $publishScript -JsonOnly
    } else {
        Write-Host "[1/4] Skip sync (publish-to-api.ps1 not found)" -ForegroundColor Yellow
    }
} else {
    Write-Host "[1/4] Skip sync (-SkipPublish)"
}

Write-Host ""
Write-Host "[2/4] Check teams.json ..."
if (-not (Test-Path $TeamsFile)) {
    throw "Missing $TeamsFile"
}
$json = Get-Content $TeamsFile -Raw -Encoding UTF8 | ConvertFrom-Json
$teams = @($json.teams)
$published = @($teams | Where-Object { $_.status -ne "hidden" })
$withPhoto = @($teams | Where-Object { $_.photo -match "/photo/r\d+\.jpg" })
$localPhotos = @(Get-ChildItem $PhotoDir -Filter "*.jpg" -ErrorAction SilentlyContinue)

Write-Host "  Total teams: $($teams.Count)"
Write-Host "  Published: $($published.Count)"
Write-Host "  With photo: $($withPhoto.Count)"
Write-Host "  Local public/photo: $($localPhotos.Count) files"

if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "[3/4] npm run build ..."
    Push-Location $Platform
    npm install 2>&1 | Out-Null
    npm run build 2>&1
    if ($LASTEXITCODE -ne 0) { throw "build failed" }
    Pop-Location
} else {
    Write-Host ""
    Write-Host "[3/4] Skip build (-SkipBuild)"
}

Write-Host ""
Write-Host "[4/4] Netlify checklist"
Write-Host "----------------------------------------"
Write-Host "A. Connect Git repo; build uses root netlify.toml"
Write-Host "B. Custom domains: crewplay.tw + www.crewplay.tw"
Write-Host "C. DNS (follow Netlify):"
Write-Host "   www -> CNAME -> <your-site>.netlify.app"
Write-Host "   @   -> ALIAS/ANAME or Netlify DNS"
Write-Host "D. Env vars from .env.production.example"
Write-Host "   Required: NEXT_PUBLIC_SITE_URL=https://www.crewplay.tw"
Write-Host "E. LINE callback: https://www.crewplay.tw/api/auth/line/callback"
Write-Host "F. ECPay notify: https://www.crewplay.tw/api/payment/ecpay/notify"
Write-Host "G. Mitake SMS (VPS proxy — do NOT put Mitake password on Netlify):"
Write-Host "   VPS .env: MITAKE_USERNAME, MITAKE_PASSWORD, SMS_PROXY_SECRET"
Write-Host "   Netlify: MITAKE_PROXY_URL, SMS_PROXY_SECRET, SMS_PROVIDER=mitake, AUTH_DEV_OTP=false"
Write-Host "   Run: powershell -File scripts/print-mitake-setup.ps1"
Write-Host "----------------------------------------"
Write-Host ""
Write-Host "Done. Push Git to trigger Netlify deploy to www.crewplay.tw"
Write-Host ""

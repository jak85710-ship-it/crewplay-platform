# Deploy CrewPlay Mitake sms-proxy to VPS (103.144.33.38)
# Prerequisites: crewplay-platform/sms-proxy/.env with MITAKE_USERNAME, MITAKE_PASSWORD
param(
    [string]$VpsHost = "103.144.33.38",
    [string]$VpsUser = "root",
    [string]$Domain = "sms.crewplay.tw",
    [SecureString]$VpsPassword
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Platform = Split-Path $PSScriptRoot -Parent
$SmsDir = Join-Path $Platform "sms-proxy"
$EnvFile = Join-Path $SmsDir ".env"
$EnvExample = Join-Path $SmsDir ".env.example"

function Read-PlainEnv([string]$Path) {
    $map = @{}
    if (-not (Test-Path $Path)) { return $map }
    foreach ($line in Get-Content $Path -Encoding UTF8) {
        $t = $line.Trim()
        if (-not $t -or $t.StartsWith("#")) { continue }
        $i = $t.IndexOf("=")
        if ($i -lt 1) { continue }
        $map[$t.Substring(0, $i).Trim()] = $t.Substring($i + 1).Trim()
    }
    return $map
}

function ConvertTo-Plain([SecureString]$Secure) {
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

Write-Host ""
Write-Host "========================================"
Write-Host "  CrewPlay SMS Proxy VPS Deploy"
Write-Host "  Target: ${VpsUser}@${VpsHost}"
Write-Host "========================================"
Write-Host ""

if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvExample) { Copy-Item $EnvExample $EnvFile }
    throw "Edit $EnvFile — set MITAKE_USERNAME, MITAKE_PASSWORD, SMS_PROXY_SECRET then re-run."
}

$envMap = Read-PlainEnv $EnvFile
if (-not $envMap["MITAKE_USERNAME"] -or -not $envMap["MITAKE_PASSWORD"]) {
    throw "Missing MITAKE_USERNAME or MITAKE_PASSWORD in $EnvFile"
}
if (-not $envMap["SMS_PROXY_SECRET"] -or $envMap["SMS_PROXY_SECRET"] -match "choose-a-long") {
    $secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
    $envMap["SMS_PROXY_SECRET"] = $secret
    Write-Host "Generated SMS_PROXY_SECRET (also save to Netlify):"
    Write-Host $secret
}

$envMap["PORT"] = "8787"
$envMap["SMS_BRAND_NAME"] = if ($envMap["SMS_BRAND_NAME"]) { $envMap["SMS_BRAND_NAME"] } else { "CrewPlay" }
$envMap["MITAKE_API_URL"] = if ($envMap["MITAKE_API_URL"]) {
    $envMap["MITAKE_API_URL"]
} else {
    "https://smsapi.mitake.com.tw/api/mtk/SmSend?CharsetURL=UTF-8"
}

$envLines = @(
    "PORT=$($envMap['PORT'])",
    "SMS_PROXY_SECRET=$($envMap['SMS_PROXY_SECRET'])",
    "MITAKE_USERNAME=$($envMap['MITAKE_USERNAME'])",
    "MITAKE_PASSWORD=$($envMap['MITAKE_PASSWORD'])",
    "SMS_BRAND_NAME=$($envMap['SMS_BRAND_NAME'])",
    "MITAKE_API_URL=$($envMap['MITAKE_API_URL'])"
)
$envLines | Set-Content $EnvFile -Encoding UTF8

if (-not $VpsPassword) {
    $VpsPassword = Read-Host "VPS root password ($VpsHost)" -AsSecureString
}
$plainPass = ConvertTo-Plain $VpsPassword

$pyScript = Join-Path $PSScriptRoot "deploy-sms-vps.py"
if (-not (Test-Path $pyScript)) { throw "Missing $pyScript" }

python $pyScript `
    --host $VpsHost `
    --user $VpsUser `
    --password $plainPass `
    --domain $Domain `
    --sms-dir $SmsDir

Write-Host ""
Write-Host "========================================"
Write-Host "  Netlify environment variables"
Write-Host "========================================"
Write-Host "SMS_PROVIDER=mitake"
Write-Host "SMS_BRAND_NAME=CrewPlay"
Write-Host "MITAKE_PROXY_URL=https://${Domain}/api/sms/login-otp"
Write-Host "SMS_PROXY_SECRET=$($envMap['SMS_PROXY_SECRET'])"
Write-Host "AUTH_DEV_OTP=false"
Write-Host ""
Write-Host "Add these in Netlify -> Site configuration -> Environment variables"
Write-Host "Then Trigger deploy (clear cache)."
Write-Host ""

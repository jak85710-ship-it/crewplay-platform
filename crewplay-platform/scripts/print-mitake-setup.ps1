# Print Mitake production setup checklist (no secrets stored)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })

Write-Host ''
Write-Host '========================================'
Write-Host '  CrewPlay Mitake 正式串接設定'
Write-Host '========================================'
Write-Host ''
Write-Host '【三竹 API】'
Write-Host '  https://smsapi.mitake.com.tw/api/mtk/SmSend?CharsetURL=UTF-8'
Write-Host '  IP: 211.72.227.230 / 60.250.14.104 :443'
Write-Host ''
Write-Host '【VPS /opt/crewplay-sms-proxy/.env】'
Write-Host '  PORT=8787'
Write-Host ('  SMS_PROXY_SECRET=' + $secret)
Write-Host '  MITAKE_USERNAME=(三竹帳號)'
Write-Host '  MITAKE_PASSWORD=(三竹密碼)'
Write-Host '  SMS_BRAND_NAME=CrewPlay'
Write-Host '  MITAKE_API_URL=https://smsapi.mitake.com.tw/api/mtk/SmSend?CharsetURL=UTF-8'
Write-Host ''
Write-Host '【Netlify 環境變數】'
Write-Host '  SMS_PROVIDER=mitake'
Write-Host '  SMS_BRAND_NAME=CrewPlay'
Write-Host '  MITAKE_PROXY_URL=https://sms.crewplay.tw/api/sms/login-otp'
Write-Host ('  SMS_PROXY_SECRET=' + $secret)
Write-Host '  AUTH_DEV_OTP=false'
Write-Host ''
Write-Host '【GoDaddy DNS】'
Write-Host '  sms.crewplay.tw  A  →  VPS 公網 IP'
Write-Host ''
Write-Host '詳細步驟: crewplay-platform/sms-proxy/README.md'
Write-Host ''

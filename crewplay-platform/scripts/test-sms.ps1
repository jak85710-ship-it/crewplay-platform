# 測試三竹 / Twilio 簡訊設定（需先在 .env.local 填入帳密）
param(
  [Parameter(Mandatory = $true)]
  [string]$Phone,
  [string]$Code = "123456"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$EnvFile = Join-Path $Root ".env.local"

function Read-DotEnv([string]$path) {
  if (-not (Test-Path $path)) { return @{} }
  $map = @{}
  Get-Content $path -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -lt 1) { return }
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim()
    if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
    $map[$k] = $v
  }
  return $map
}

$env = Read-DotEnv $EnvFile
foreach ($k in $env.Keys) {
  Set-Item -Path "Env:$k" -Value $env[$k]
}

$body = @{ phone = $Phone } | ConvertTo-Json -Compress
Write-Host "POST /api/auth/phone/send -> $Phone"
Write-Host "請先執行 npm run dev，再於另一個終端機執行本腳本。"
Write-Host ""

try {
  $resp = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/phone/send" `
    -Method Post -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($body))
  $resp | ConvertTo-Json -Depth 4
} catch {
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host $reader.ReadToEnd()
  } else {
    Write-Host $_.Exception.Message
  }
  exit 1
}

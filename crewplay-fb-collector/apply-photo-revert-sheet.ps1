# Write a1.jpg or r{row}.jpg to sheet photo column from revert-duplicate-photos-report.json
param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$ReportPath = Join-Path $Root 'revert-duplicate-photos-report.json'
$ConfigPath = Join-Path $Root 'config.json'
$BaseUrl = 'https://storage.googleapis.com/crewplay-arena-storage/photo'
$DefaultPhoto = $BaseUrl + '/a1.jpg'

if (-not (Test-Path $ReportPath)) { throw 'Run revert-duplicate-photos.mjs first.' }

$report = Get-Content $ReportPath -Raw -Encoding UTF8 | ConvertFrom-Json
$config = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json

$body = 'client_id=' + [uri]::EscapeDataString([string]$config.client_id) +
        '&client_secret=' + [uri]::EscapeDataString([string]$config.client_secret) +
        '&refresh_token=' + [uri]::EscapeDataString([string]$config.refresh_token) +
        '&grant_type=refresh_token'
$token = (Invoke-RestMethod -Uri 'https://oauth2.googleapis.com/token' -Method Post `
    -ContentType 'application/x-www-form-urlencoded' -Body $body).access_token

$sheetName = if ($config.sheet_name) { [string]$config.sheet_name } else { '工作表1' }
$name = $sheetName
if ($sheetName -match "[\s'!]") { $name = "'" + ($sheetName -replace "'", "''") + "'" }

$data = @()
foreach ($row in @($report.revertedRows)) {
    $data += @{
        range  = $name + '!D' + $row
        values = @(,@($DefaultPhoto))
    }
}
foreach ($row in @($report.keptRows)) {
    $data += @{
        range  = $name + '!D' + $row
        values = @(,@($BaseUrl + '/r' + $row + '.jpg'))
    }
}

Write-Host ('Sheet updates: ' + $data.Count + ' (revert=' + $report.revertedRows.Count + ', keep=' + $report.keptRows.Count + ')')
if ($DryRun) { exit 0 }

$uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + $config.sheet_id + '/values:batchUpdate'
$headers = @{ Authorization = 'Bearer ' + $token; 'Content-Type' = 'application/json; charset=utf-8' }
$batchSize = 40
for ($start = 0; $start -lt $data.Count; $start += $batchSize) {
    $end = [Math]::Min($start + $batchSize - 1, $data.Count - 1)
    $payload = @{ valueInputOption = 'USER_ENTERED'; data = $data[$start..$end] }
    $json = $payload | ConvertTo-Json -Depth 6 -Compress
    Invoke-RestMethod -Uri $uri -Headers $headers -Method Post -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
    if ($end -lt ($data.Count - 1)) { Start-Sleep -Seconds 2 }
}
Write-Host 'Sheet photo column updated.'

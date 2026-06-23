# Update sheet photo column for specific inbox rows (after JPG conversion)
param([int[]]$Rows = @(18, 20, 24, 282))

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$config = Get-Content (Join-Path $Root 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$body = 'client_id=' + [uri]::EscapeDataString([string]$config.client_id) +
        '&client_secret=' + [uri]::EscapeDataString([string]$config.client_secret) +
        '&refresh_token=' + [uri]::EscapeDataString([string]$config.refresh_token) +
        '&grant_type=refresh_token'
$token = (Invoke-RestMethod -Uri 'https://oauth2.googleapis.com/token' -Method Post `
    -ContentType 'application/x-www-form-urlencoded' -Body $body).access_token

$BaseUrl = 'https://storage.googleapis.com/crewplay-arena-storage'
$sheetName = if ($config.sheet_name) { [string]$config.sheet_name } else { '工作表1' }
$name = $sheetName
if ($sheetName -match "[\s'!]") { $name = "'" + ($sheetName -replace "'", "''") + "'" }

$data = @()
foreach ($r in $Rows) {
    $data += @{
        range  = $name + '!D' + $r
        values = @(,@($BaseUrl + '/photo/r' + $r + '.jpg'))
    }
}

$payload = @{ valueInputOption = 'USER_ENTERED'; data = $data }
$json = $payload | ConvertTo-Json -Depth 6 -Compress
$uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + $config.sheet_id + '/values:batchUpdate'
Invoke-RestMethod -Uri $uri -Headers @{
    Authorization = 'Bearer ' + $token
    'Content-Type' = 'application/json; charset=utf-8'
} -Method Post -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null

Write-Host ('Updated sheet photo URLs for rows: ' + ($Rows -join ', '))

# Update sheet photo column for specific inbox rows (after JPG conversion)
param([int[]]$Rows = @(), [int]$FromRow = 0, [int]$ToRow = 0)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$JpgDir = Join-Path $Root 'storage/photos-jpg'
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
$targetRows = @($Rows)
if ($FromRow -gt 0 -and $ToRow -ge $FromRow) {
    $targetRows = @($FromRow..$ToRow)
}
if ($targetRows.Count -eq 0) {
    Get-ChildItem $JpgDir -Filter 'r*.jpg' | ForEach-Object {
        if ($_.BaseName -match '^r(\d+)$') { $targetRows += [int]$Matches[1] }
    }
}
foreach ($r in ($targetRows | Sort-Object -Unique)) {
    $jpg = Join-Path $JpgDir ('r' + $r + '.jpg')
    if (-not (Test-Path $jpg)) { continue }
    $data += @{
        range  = $name + '!D' + $r
        values = @(,@($BaseUrl + '/photo/r' + $r + '.jpg'))
    }
}

$payload = @{ valueInputOption = 'USER_ENTERED'; data = $data }
$json = $payload | ConvertTo-Json -Depth 6 -Compress
$uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + $config.sheet_id + '/values:batchUpdate'
$headers = @{
    Authorization = 'Bearer ' + $token
    'Content-Type' = 'application/json; charset=utf-8'
}
$batchSize = 40
for ($start = 0; $start -lt $data.Count; $start += $batchSize) {
    $end = [Math]::Min($start + $batchSize - 1, $data.Count - 1)
    $batchPayload = @{ valueInputOption = 'USER_ENTERED'; data = $data[$start..$end] }
    $batchJson = $batchPayload | ConvertTo-Json -Depth 6 -Compress
    Invoke-RestMethod -Uri $uri -Headers $headers -Method Post -Body ([Text.Encoding]::UTF8.GetBytes($batchJson)) | Out-Null
    if ($end -lt ($data.Count - 1)) { Start-Sleep -Seconds 2 }
}

$updatedRows = @()
foreach ($r in ($targetRows | Sort-Object -Unique)) {
    if (Test-Path (Join-Path $JpgDir ('r' + $r + '.jpg'))) { $updatedRows += $r }
}
Write-Host ('Updated sheet photo URLs for ' + $updatedRows.Count + ' rows')

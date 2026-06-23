# After JPG files are uploaded to GCS, write gcsUrl into sheet photo column
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$ConfigPath = Join-Path $Root 'config.json'
$JpgDir = Join-Path $Root 'storage/photos-jpg'
$BaseUrl = 'https://storage.googleapis.com/crewplay-arena-storage'

function Read-Config {
    if (-not (Test-Path $ConfigPath)) { throw 'config.json not found.' }
    return Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Get-AccessToken($config) {
    $body = 'client_id=' + [uri]::EscapeDataString([string]$config.client_id) +
            '&client_secret=' + [uri]::EscapeDataString([string]$config.client_secret) +
            '&refresh_token=' + [uri]::EscapeDataString([string]$config.refresh_token) +
            '&grant_type=refresh_token'
    $resp = Invoke-WebRequest -Uri 'https://oauth2.googleapis.com/token' -Method Post `
        -ContentType 'application/x-www-form-urlencoded' -Body $body -UseBasicParsing
    return ([string]($resp.Content | ConvertFrom-Json).access_token)
}

function Format-SheetRange($sheetTitle, $cellRange) {
    $name = $sheetTitle
    if ($sheetTitle -match "[\s'!]") { $name = "'" + ($sheetTitle -replace "'", "''") + "'" }
    if ($cellRange) { return $name + '!' + $cellRange }
    return $name
}

function Update-PhotosBatch($token, $sheetId, $sheetTitle, $updates) {
    if (-not $updates -or $updates.Count -eq 0) { return }
    $uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + $sheetId + '/values:batchUpdate'
    $headers = @{ Authorization = 'Bearer ' + $token; 'Content-Type' = 'application/json; charset=utf-8' }
    $data = @()
    foreach ($u in $updates) {
        $data += @{
            range  = (Format-SheetRange $sheetTitle ('D' + $u.row))
            values = @(,@($u.photo))
        }
    }
    $payload = @{ valueInputOption = 'USER_ENTERED'; data = $data }
    $body = $payload | ConvertTo-Json -Depth 6 -Compress
    Invoke-RestMethod -Uri $uri -Headers $headers -Method Post -Body ([Text.Encoding]::UTF8.GetBytes($body)) | Out-Null
}

if (-not (Test-Path $JpgDir)) {
    Write-Host 'No photos-jpg folder. Run convert-upload-photos.ps1 first.'
    exit 1
}

$updates = New-Object System.Collections.Generic.List[object]
Get-ChildItem $JpgDir -Filter 'r*.jpg' | ForEach-Object {
    if ($_.BaseName -match '^r(\d+)$') {
        $row = [int]$Matches[1]
        $url = $BaseUrl + '/photo/' + $_.Name
        $updates.Add([PSCustomObject]@{ row = $row; photo = $url })
    }
}

if ($updates.Count -eq 0) {
    Write-Host 'No r{row}.jpg files found in photos-jpg.'
    exit 0
}

$config = Read-Config
$token = Get-AccessToken $config
$sheetName = if ($config.sheet_name) { [string]$config.sheet_name } else { '工作表1' }

Write-Host ('Updating ' + $updates.Count + ' photo URLs in sheet...')
$batchSize = 40
for ($start = 0; $start -lt $updates.Count; $start += $batchSize) {
    $end = [Math]::Min($start + $batchSize - 1, $updates.Count - 1)
    Update-PhotosBatch $token $config.sheet_id $sheetName $updates[$start..$end]
    if ($end -lt ($updates.Count - 1)) { Start-Sleep -Seconds 2 }
}

Write-Host 'Done.'

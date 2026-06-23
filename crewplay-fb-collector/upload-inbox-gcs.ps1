# Upload only inbox row JPGs (r{row}.jpg) to GCS and update sheet photo column
param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$ConfigPath = Join-Path $Root 'config.json'
$InboxDir = Join-Path $Root 'storage/photos-inbox'
$JpgDir = Join-Path $Root 'storage/photos-jpg'
$Bucket = 'crewplay-arena-storage'
$BaseUrl = 'https://storage.googleapis.com/crewplay-arena-storage'

function Read-Config {
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

function Get-InboxRows {
    $rows = New-Object System.Collections.Generic.List[int]
    Get-ChildItem $InboxDir -File | ForEach-Object {
        if ($_.Name -match '^(\d+)\.(jpg|jpeg|png|webp|gif|bmp)$') {
            $rows.Add([int]$Matches[1]) | Out-Null
        }
    }
    return ($rows | Sort-Object -Unique)
}

function Invoke-GcsUpload($token, [string]$localPath, [string]$objectName) {
    $uri = 'https://storage.googleapis.com/upload/storage/v1/b/' + $Bucket + '/o?uploadType=media&name=' + [uri]::EscapeDataString($objectName)
    $bytes = [IO.File]::ReadAllBytes($localPath)
    $headers = @{
        Authorization = 'Bearer ' + $token
        'Content-Type' = 'image/jpeg'
    }
    Invoke-RestMethod -Uri $uri -Headers $headers -Method Post -Body $bytes | Out-Null

    $patchUri = 'https://storage.googleapis.com/storage/v1/b/' + $Bucket + '/o/' + [uri]::EscapeDataString($objectName)
    $aclBody = @{ entity = 'allUsers'; role = 'READER' } | ConvertTo-Json -Compress
    try {
        Invoke-RestMethod -Uri ($patchUri + '/acl') -Headers @{ Authorization = 'Bearer ' + $token; 'Content-Type' = 'application/json' } `
            -Method Post -Body $aclBody | Out-Null
    } catch {
        $patch = @{ predefinedAcl = 'publicRead' } | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri ($patchUri + '?predefinedAcl=publicRead') -Headers @{ Authorization = 'Bearer ' + $token; 'Content-Type' = 'application/json' } `
            -Method Patch -Body $patch | Out-Null
    }
}

$config = Read-Config
$token = Get-AccessToken $config
$sheetName = if ($config.sheet_name) { [string]$config.sheet_name } else { '工作表1' }
$rows = Get-InboxRows
$updates = New-Object System.Collections.Generic.List[object]
$ok = 0; $fail = 0

foreach ($row in $rows) {
    $jpg = Join-Path $JpgDir ('r' + $row + '.jpg')
    $object = 'photo/r' + $row + '.jpg'
    $url = $BaseUrl + '/' + $object
    $line = 'Row ' + $row + ' -> ' + $object

    if (-not (Test-Path $jpg)) {
        Write-Host ('[SKIP] ' + $line + ' (no r' + $row + '.jpg)') -ForegroundColor Yellow
        continue
    }

    if ($DryRun) {
        Write-Host ('[DRY] ' + $line)
        $updates.Add([PSCustomObject]@{ row = $row; photo = $url })
        continue
    }

    try {
        Write-Host ('[UPLOAD] ' + $line)
        Invoke-GcsUpload $token $jpg $object
        $updates.Add([PSCustomObject]@{ row = $row; photo = $url })
        $ok++
    } catch {
        Write-Host ('[FAIL] ' + $line + ' | ' + $_.Exception.Message) -ForegroundColor Red
        $fail++
    }
}

if (-not $DryRun -and $updates.Count -gt 0) {
    Write-Host ''
    Write-Host ('Updating sheet: ' + $updates.Count + ' rows')
    $batchSize = 40
    for ($start = 0; $start -lt $updates.Count; $start += $batchSize) {
        $end = [Math]::Min($start + $batchSize - 1, $updates.Count - 1)
        Update-PhotosBatch $token $config.sheet_id $sheetName $updates[$start..$end]
        if ($end -lt ($updates.Count - 1)) { Start-Sleep -Seconds 2 }
    }
}

Write-Host ''
Write-Host ('Done. uploaded=' + $ok + ' failed=' + $fail + ' sheetRows=' + $updates.Count)

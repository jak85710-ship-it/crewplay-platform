# Check and fix broken photo URLs in Google Sheet
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$ConfigPath = Join-Path $Root 'config.json'
$PhotoConfigPath = Join-Path $Root 'storage/photo-config.json'
$DefaultPhoto = 'https://storage.googleapis.com/crewplay-arena-storage/photo/a1.jpg'
$BrokenPattern = 'crewplay_arena_storage|photo_example\.jpg'

if (Test-Path $PhotoConfigPath) {
    $pc = Get-Content $PhotoConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($pc.defaultPhoto) { $DefaultPhoto = [string]$pc.defaultPhoto }
}

function Read-Config { return Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json }

function Get-AccessToken($config) {
    $body = 'client_id=' + [uri]::EscapeDataString([string]$config.client_id) +
            '&client_secret=' + [uri]::EscapeDataString([string]$config.client_secret) +
            '&refresh_token=' + [uri]::EscapeDataString([string]$config.refresh_token) +
            '&grant_type=refresh_token'
    $resp = Invoke-WebRequest -Uri 'https://oauth2.googleapis.com/token' -Method Post -ContentType 'application/x-www-form-urlencoded' -Body $body -UseBasicParsing
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
    for ($try = 1; $try -le 5; $try++) {
        try {
            Invoke-RestMethod -Uri $uri -Headers $headers -Method Post -Body ([Text.Encoding]::UTF8.GetBytes($body)) | Out-Null
            return
        } catch {
            $status = 0
            if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
            if ($status -eq 429 -and $try -lt 5) {
                Start-Sleep -Seconds (3 * $try)
                continue
            }
            throw
        }
    }
}

function Get-PhotoIssue([string]$photo) {
    if ([string]::IsNullOrWhiteSpace($photo)) { return 'empty' }
    if ($photo -match 'crewplay-arena-storage/photo/.+\.jpg($|\?)') { return 'ok' }
    if ($photo -match $BrokenPattern) { return 'broken_pattern' }
    if ($photo -match 'static\.|rsrc\.php') { return 'fb_icon' }
    if ($photo -match '\.webp') { return 'webp' }
    if ($photo -match 'scontent.*/v/') { return 'fb_post' }
    if ($photo -match 'fbcdn|facebook') { return 'fb_url' }
    if ($photo -notmatch '^https?://') { return 'bad_path' }
    return 'not_gcs_jpg'
}

function Needs-Fix([string]$photo) {
    return (Get-PhotoIssue $photo) -ne 'ok'
}

function Fix-PhotoValue([string]$photo, [string]$defaultPhoto) {
    $issue = Get-PhotoIssue $photo
    switch ($issue) {
        'ok' { return $photo }
        'fb_post' { return $photo }
        default { return $defaultPhoto }
    }
}

$config = Read-Config
$token = Get-AccessToken $config
$sheetName = [string]$config.sheet_name
$range = [uri]::EscapeDataString((Format-SheetRange $sheetName 'A2:G'))
$url = 'https://sheets.googleapis.com/v4/spreadsheets/' + $config.sheet_id + '/values/' + $range
$data = Invoke-RestMethod -Uri $url -Headers @{ Authorization = 'Bearer ' + $token } -Method Get

$broken = @()
$pending = New-Object System.Collections.Generic.List[object]
$okCount = 0
$fbPostCount = 0

for ($i = 0; $i -lt $data.values.Count; $i++) {
    $row = @($data.values[$i])
    $sheetRow = $i + 2
    while ($row.Count -lt 7) { $row += '' }
    $arena = [string]$row[1]
    $photo = [string]$row[3]
    if ([string]::IsNullOrWhiteSpace($arena)) { continue }

    if (Needs-Fix $photo) {
        $reason = Get-PhotoIssue $photo
        $fixedPhoto = Fix-PhotoValue $photo $DefaultPhoto
        if ($reason -eq 'fb_post') {
            $fbPostCount++
            continue
        }
        $broken += [PSCustomObject]@{ row = $sheetRow; arena = $arena; photo = $photo; reason = $reason }
        $pending.Add([PSCustomObject]@{ row = $sheetRow; photo = $fixedPhoto })
    } else {
        $okCount++
    }
}

$fixed = $pending.Count
$batchSize = 40
for ($start = 0; $start -lt $pending.Count; $start += $batchSize) {
    $end = [Math]::Min($start + $batchSize - 1, $pending.Count - 1)
    Write-Host ('  批次修正 photo ' + ($start + 1) + '～' + ($end + 1) + ' / ' + $pending.Count)
    Update-PhotosBatch $token $config.sheet_id $sheetName $pending[$start..$end]
    if ($end -lt ($pending.Count - 1)) { Start-Sleep -Seconds 2 }
}

Write-Host ''
Write-Host '========================================'
Write-Host '  圖片網址排查完成'
Write-Host '========================================'
Write-Host ('正常 GCS JPG：' + $okCount)
Write-Host ('FB 貼文圖（待轉 JPG）：' + $fbPostCount)
Write-Host ('已修正：' + $fixed + ' 列 → ' + $DefaultPhoto)
Write-Host ('預設圖工具：' + (Join-Path $Root 'storage/index.html'))
if ($fbPostCount -gt 0) {
    Write-Host ''
    Write-Host '仍有 FB 貼文圖網址，請執行「轉圖片上傳JPG.bat」轉成 JPG 後上傳 GCS'
}
Write-Host ''
if ($broken.Count -gt 0) {
    Write-Host '修正範例（前 10）：'
    $broken | Select-Object -First 10 | ForEach-Object {
        Write-Host ('  第' + $_.row + '列 ' + $_.arena + ' | ' + $_.reason)
    }
}

$report = @{ ok = $okCount; fixed = $fixed; defaultPhoto = $DefaultPhoto; broken = $broken }
$report | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $Root 'photo-url-report.json') -Encoding UTF8

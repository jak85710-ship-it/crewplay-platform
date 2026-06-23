# Batch-fix Google Sheet rows for LINE display (photo + fee label)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$ConfigPath = Join-Path $Root 'config.json'
$DefaultPhoto = 'https://storage.googleapis.com/crewplay-arena-storage/photo/a1.jpg'

function Read-Config {
    if (-not (Test-Path $ConfigPath)) { throw 'config.json not found.' }
    return Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
}

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

function Update-RowsBatch($token, $sheetId, $sheetTitle, $updates) {
    if (-not $updates -or $updates.Count -eq 0) { return }
    $uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + $sheetId + '/values:batchUpdate'
    $headers = @{
        Authorization  = 'Bearer ' + $token
        'Content-Type' = 'application/json; charset=utf-8'
    }
    $data = @()
    foreach ($u in $updates) {
        $data += @{
            range  = (Format-SheetRange $sheetTitle ('A' + $u.sheetRow + ':G' + $u.sheetRow))
            values = @(,$u.values)
        }
    }
    $payload = @{
        valueInputOption = 'USER_ENTERED'
        data             = $data
    }
    $body = $payload | ConvertTo-Json -Depth 10 -Compress
    for ($try = 1; $try -le 5; $try++) {
        try {
            Invoke-RestMethod -Uri $uri -Headers $headers -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) | Out-Null
            return
        } catch {
            $status = 0
            if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
            if ($status -eq 429 -and $try -lt 5) {
                $wait = 3 * $try
                Write-Host ('  API 速率限制，等待 ' + $wait + ' 秒後重試...')
                Start-Sleep -Seconds $wait
                continue
            }
            throw
        }
    }
}

$config = Read-Config
$token = Get-AccessToken $config
$sheetId = [string]$config.sheet_id
$sheetName = if ($config.sheet_name) { [string]$config.sheet_name } else { '工作表1' }

$range = [uri]::EscapeDataString((Format-SheetRange $sheetName 'A2:G'))
$url = 'https://sheets.googleapis.com/v4/spreadsheets/' + $sheetId + '/values/' + $range
$headers = @{ Authorization = 'Bearer ' + $token }
$data = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

if (-not $data.values -or $data.values.Count -eq 0) {
    Write-Host '試算表沒有資料列。'
    exit 0
}

$photoFixed = 0
$feeFixed = 0
$skippedEmpty = 0
$pending = New-Object System.Collections.Generic.List[object]

for ($i = 0; $i -lt $data.values.Count; $i++) {
    $row = @($data.values[$i])
    $sheetRow = $i + 2

    while ($row.Count -lt 7) { $row += '' }

    $sport = [string]$row[0]
    $arena = [string]$row[1]
    $intro = [string]$row[2]
    $photo = [string]$row[3]
    $assign = [string]$row[4]
    $region = [string]$row[5]
    $location = [string]$row[6]

    if ([string]::IsNullOrWhiteSpace($arena) -and [string]::IsNullOrWhiteSpace($intro)) {
        $skippedEmpty++
        continue
    }

    $changed = $false

    if ([string]::IsNullOrWhiteSpace($photo) -or $photo -notmatch '^https?://') {
        $photo = $DefaultPhoto
        $changed = $true
        $photoFixed++
    }

    if ($intro -match '臨打費：') {
        $intro = $intro -replace '臨打費：', '費用：'
        $changed = $true
        $feeFixed++
    }

    if ($changed) {
        $pending.Add([PSCustomObject]@{
            sheetRow = $sheetRow
            values   = @($sport, $arena, $intro, $photo, $assign, $region, $location)
        })
    }
}

$updated = $pending.Count
$batchSize = 50
for ($start = 0; $start -lt $pending.Count; $start += $batchSize) {
    $end = [Math]::Min($start + $batchSize - 1, $pending.Count - 1)
    $chunk = $pending[$start..$end]
    Write-Host ('  批次寫入第 ' + ($start + 1) + '～' + ($end + 1) + ' 筆...')
    Update-RowsBatch $token $sheetId $sheetName $chunk
    if ($end -lt ($pending.Count - 1)) { Start-Sleep -Seconds 2 }
}

Write-Host ''
Write-Host '========================================'
Write-Host '  試算表 LINE 顯示修正完成'
Write-Host '========================================'
Write-Host ('資料列總數：' + $data.values.Count)
Write-Host ('補 photo：' + $photoFixed + ' 列')
Write-Host ('臨打費改費用：' + $feeFixed + ' 列')
Write-Host ('實際寫入：' + $updated + ' 列')
Write-Host ('跳過空白列：' + $skippedEmpty + ' 列')
Write-Host ''
Write-Host '請接著執行「強制同步LINE.bat」讓後台重新讀取。'

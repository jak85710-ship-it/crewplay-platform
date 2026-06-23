# Fix arena_name for LINE search (use team name, not venue-team)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$ConfigPath = Join-Path $Root 'config.json'
$DefaultPhoto = 'https://storage.googleapis.com/crewplay-arena-storage/photo/a1.jpg'

function Read-Config {
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
    $payload = @{ valueInputOption = 'USER_ENTERED'; data = $data }
    $body = $payload | ConvertTo-Json -Depth 10 -Compress
    for ($try = 1; $try -le 5; $try++) {
        try {
            Invoke-RestMethod -Uri $uri -Headers $headers -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) | Out-Null
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

function Get-VenueFromIntro([string]$intro) {
    if ($intro -match '地點[：:]\s*([^\n]+)') { return ($matches[1]).Trim() }
    return ''
}

function Set-IntroVenue([string]$intro, [string]$venue) {
    if (-not $venue) { return $intro }
    if ($intro -match '地點[：:]') {
        return ($intro -replace '地點[：:]\s*[^\n]+', "地點：$venue")
    }
    return "地點：$venue`n$intro"
}

function Resolve-ArenaDisplayName([string]$arena, [string]$intro) {
    $arena = ($arena -replace '^[［\[\(（]+', '' -replace '[］\]\)）]+$', '').Trim()
    $venue = Get-VenueFromIntro $intro
    $changed = $false
    $newArena = $arena

    if ($arena -match '^(.+)-(.+)-(.+)$') {
        $newArena = $matches[3].Trim()
        if (-not $venue) { $venue = "$($matches[1])-$($matches[2])" }
        $changed = $true
    }
    elseif ($arena -match '^(.+)-(.+)$') {
        $left = $matches[1].Trim()
        $right = $matches[2].Trim()
        if ($right.Length -ge 2 -and $left -ne $right) {
            $newArena = $right
            if (-not $venue) { $venue = $left }
            $changed = $true
        }
    }

    if ($newArena -match '超速羽球館超速羽球館') {
        $newArena = ($newArena -replace '超速羽球館超速羽球館大社館', '羽Vi同樂')
        $changed = $true
    }

    return @{ arena = $newArena; venue = $venue; changed = $changed }
}

$config = Read-Config
$token = Get-AccessToken $config
$sheetId = [string]$config.sheet_id
$sheetName = if ($config.sheet_name) { [string]$config.sheet_name } else { '工作表1' }

$range = [uri]::EscapeDataString((Format-SheetRange $sheetName 'A2:G'))
$url = 'https://sheets.googleapis.com/v4/spreadsheets/' + $sheetId + '/values/' + $range
$headers = @{ Authorization = 'Bearer ' + $token }
$data = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

$pending = New-Object System.Collections.Generic.List[object]
$renamed = 0
$photoFixed = 0
$samples = @()

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

    if ([string]::IsNullOrWhiteSpace($arena)) { continue }

    $resolved = Resolve-ArenaDisplayName $arena $intro
    $changed = $resolved.changed

    if ($resolved.changed) {
        $arena = $resolved.arena
        if ($resolved.venue) { $intro = Set-IntroVenue $intro $resolved.venue }
        $renamed++
        if ($samples.Count -lt 8) {
            $samples += [PSCustomObject]@{ row = $sheetRow; old = [string]$row[1]; new = $arena }
        }
    }

    if ([string]::IsNullOrWhiteSpace($photo) -or $photo -notmatch '^https?://') {
        $photo = $DefaultPhoto
        $changed = $true
        $photoFixed++
    }

    if ($intro -match '臨打費：') {
        $intro = $intro -replace '臨打費：', '費用：'
        $changed = $true
    }

    if ($changed) {
        $pending.Add([PSCustomObject]@{
            sheetRow = $sheetRow
            values   = @($sport, $arena, $intro, $photo, $assign, $region, $location)
        })
    }
}

$batchSize = 40
for ($start = 0; $start -lt $pending.Count; $start += $batchSize) {
    $end = [Math]::Min($start + $batchSize - 1, $pending.Count - 1)
    Write-Host ('  批次寫入 ' + ($start + 1) + '～' + ($end + 1) + ' / ' + $pending.Count)
    Update-RowsBatch $token $sheetId $sheetName $pending[$start..$end]
    if ($end -lt ($pending.Count - 1)) { Start-Sleep -Seconds 2 }
}

Write-Host ''
Write-Host '========================================'
Write-Host '  arena_name 已改為 LINE 搜尋格式'
Write-Host '========================================'
Write-Host ('重新命名：' + $renamed + ' 列')
Write-Host ('補 photo：' + $photoFixed + ' 列')
Write-Host ('總更新：' + $pending.Count + ' 列')
Write-Host ''
Write-Host '範例（舊名稱 → 新名稱）：'
foreach ($s in $samples) { Write-Host ('  第' + $s.row + '列：' + $s.old + ' → ' + $s.new) }
Write-Host ''
Write-Host '請在 LINE「即時預約」搜尋「團名」，例如：'
Write-Host '  高雄大裕隊、晴風羽球隊、羽Vi同樂'
Write-Host ''

$report = @{
    renamed = $renamed
    photoFixed = $photoFixed
    updated = $pending.Count
    samples = $samples
}
$report | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $Root 'fix-arena-report.json') -Encoding UTF8

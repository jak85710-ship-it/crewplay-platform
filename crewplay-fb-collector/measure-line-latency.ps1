# Diagnose factors affecting LINE "即時預約" response time
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$ConfigPath = Join-Path $Root 'config.json'
$ReportPath = Join-Path $Root 'line-latency-report.json'
$TxtPath = Join-Path $Root 'line-latency-report.txt'
$SyncUri = 'https://api.crewplay.tw/arena/sheet_sync'
$LineCarouselMax = 10

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

function Test-LineReady($row) {
    if (-not $row.sport -or -not $row.arena -or -not $row.intro) { return $false }
    if ($row.intro -notmatch '地點：|時間：|費用：') { return $false }
    if (-not $row.photo -or $row.photo -notmatch '^https?://') { return $false }
    return $true
}

function Measure-SheetSync {
    $results = @()
    foreach ($i in 1..3) {
        $sw = [Diagnostics.Stopwatch]::StartNew()
        $item = [PSCustomObject]@{ run = $i; ms = 0; status = 0; ok = $false; message = '' }
        try {
            $resp = Invoke-WebRequest -Uri $SyncUri -Method POST -UseBasicParsing -TimeoutSec 120
            $sw.Stop()
            $item.ms = $sw.ElapsedMilliseconds
            $item.status = [int]$resp.StatusCode
            $item.ok = ($resp.StatusCode -eq 200)
            $item.message = $resp.Content
        } catch {
            $sw.Stop()
            $item.ms = $sw.ElapsedMilliseconds
            $item.message = $_.Exception.Message
            if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
                $item.message = $_.ErrorDetails.Message
            }
        }
        $results += $item
        Start-Sleep -Milliseconds 500
    }
    return $results
}

Write-Host ''
Write-Host '========================================'
Write-Host '  LINE 即時預約 延遲排查'
Write-Host '========================================'
Write-Host ''

$config = Read-Config
$token = Get-AccessToken $config
$sheetName = if ($config.sheet_name) { [string]$config.sheet_name } else { '工作表1' }
$range = [uri]::EscapeDataString((Format-SheetRange $sheetName 'A2:G'))
$url = 'https://sheets.googleapis.com/v4/spreadsheets/' + $config.sheet_id + '/values/' + $range
$data = Invoke-RestMethod -Uri $url -Headers @{ Authorization = 'Bearer ' + $token } -Method Get

$rows = @()
$sportStats = @{}
$arenaDup = @{}
$photoDefault = 0
$photoGcs = 0
$introTotal = 0

for ($i = 0; $i -lt $data.values.Count; $i++) {
    $r = @($data.values[$i])
    while ($r.Count -lt 7) { $r += '' }
    $arena = [string]$r[1]
    if ([string]::IsNullOrWhiteSpace($arena)) { continue }

    $sport = ([string]$r[0]).Trim()
    $photo = ([string]$r[3]).Trim()
    $intro = [string]$r[2]

    if (-not $sportStats.ContainsKey($sport)) {
        $sportStats[$sport] = @{ total = 0; lineReady = 0 }
    }
    $sportStats[$sport].total++

    $rowObj = [PSCustomObject]@{
        row    = $i + 2
        sport  = $sport
        arena  = $arena
        intro  = $intro
        photo  = $photo
    }
    if (Test-LineReady $rowObj) { $sportStats[$sport].lineReady++ }

    if ($photo -match '/a1\.jpg') { $photoDefault++ }
    elseif ($photo -match 'crewplay-arena-storage/photo/.+\.jpg') { $photoGcs++ }

    $introTotal += $intro.Length
    if (-not $arenaDup.ContainsKey($arena)) { $arenaDup[$arena] = 0 }
    $arenaDup[$arena]++
    $rows += $rowObj
}

$totalRows = $rows.Count
$avgIntro = if ($totalRows -gt 0) { [int]($introTotal / $totalRows) } else { 0 }
$dupArenaGroups = @($arenaDup.GetEnumerator() | Where-Object { $_.Value -gt 1 }).Count

Write-Host '[1/2] 試算表資料量（影響 LINE 查詢速度）'
Write-Host ('  總列數：' + $totalRows)
Write-Host ('  平均 introduce 字數：' + $avgIntro)
Write-Host ('  重複 arena_name 組數：' + $dupArenaGroups)
Write-Host ('  photo 預設 a1.jpg：' + $photoDefault)
Write-Host ('  photo 專屬 GCS jpg：' + $photoGcs)
Write-Host ''
Write-Host ('  各運動 LINE 合格筆數（carousel 上限 ' + $LineCarouselMax + '）：')
$overLimit = @()
foreach ($kv in ($sportStats.GetEnumerator() | Sort-Object { $_.Value.lineReady } -Descending)) {
    $name = $kv.Key
    $ready = $kv.Value.lineReady
    $flag = if ($ready -gt $LineCarouselMax) { ' << 超過上限，可能變慢或失敗' } else { '' }
    Write-Host ('    ' + $name + '：合格 ' + $ready + ' / 總 ' + $kv.Value.total + $flag)
    if ($ready -gt $LineCarouselMax) {
        $overLimit += [PSCustomObject]@{ sport = $name; lineReady = $ready; overBy = ($ready - $LineCarouselMax) }
    }
}

Write-Host ''
Write-Host '[2/2] 後台 sheet_sync API 連線（管理員同步用，非使用者按鈕）'
$syncRuns = Measure-SheetSync
foreach ($run in $syncRuns) {
    $line = '  Run ' + $run.run + '：' + $run.ms + ' ms'
    if ($run.status -gt 0) { $line += ' | HTTP ' + $run.status }
    if ($run.message) {
        $msg = [string]$run.message
        if ($msg.Length -gt 80) { $msg = $msg.Substring(0, 80) + '...' }
        $line += ' | ' + $msg
    }
    Write-Host $line
}

$avgSyncMs = [int](($syncRuns | Measure-Object -Property ms -Average).Average)

Write-Host ''
Write-Host '========================================'
Write-Host '  結論（按鈕約 3 秒延遲）'
Write-Host '========================================'
Write-Host ''
Write-Host '  使用者按 LINE「即時預約」→ 後台 webhook 查資料 → 回傳畫面'
Write-Host '  這段延遲發生在 CrewPlay 伺服器 + LINE，不是本機 bat 同步。'
Write-Host ''
Write-Host '  從試算表可改善的因素：'
if ($overLimit.Count -gt 0) {
    foreach ($o in $overLimit) {
        Write-Host ('    - ' + $o.sport + ' 合格 ' + $o.lineReady + ' 筆，建議主表只留 ' + $LineCarouselMax + ' 筆')
    }
} else {
    Write-Host '    - 各運動未明顯超過 carousel 10 筆上限'
}
Write-Host ('    - 總列 ' + $totalRows + ' 筆，後台每次查詢負擔偏大')
Write-Host '    - 建議實作「主表每運動最多 10 筆 + 其餘放待上架分頁」'
Write-Host ''
if ($syncRuns.message -match 'no healthy upstream' -or ($syncRuns | Where-Object { $_.message -match 'no healthy upstream' })) {
    Write-Host '  [!] API 回 no healthy upstream → 後台可能過載或服務異常，請通知管理員' -ForegroundColor Red
}
Write-Host '  正常 LINE webhook 往返約 1~2 秒；資料量大時 3~5 秒常見。'
Write-Host ''

$report = @{
    at           = (Get-Date).ToString('s')
    totalRows    = $totalRows
    avgIntroLen  = $avgIntro
    dupArenaGroups = $dupArenaGroups
    sportStats   = $sportStats
    overCarousel = $overLimit
    syncRuns     = $syncRuns
    avgSyncMs    = $avgSyncMs
    lineCarouselMax = $LineCarouselMax
}
$report | ConvertTo-Json -Depth 6 | Set-Content $ReportPath -Encoding UTF8

$txt = @()
$txt += 'LINE 即時預約 延遲排查報告'
$txt += '時間：' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
$txt += '總列數：' + $totalRows
$txt += '平均 introduce 字數：' + $avgIntro
$txt += 'sheet_sync 平均：' + $avgSyncMs + ' ms'
foreach ($o in $overLimit) {
    $txt += ($o.sport + ' 合格 ' + $o.lineReady + ' 筆 > carousel ' + $LineCarouselMax)
}
$txt += ''
$txt += '給管理員：若 no healthy upstream 或延遲 >3s，請查 webhook 日誌、DB 索引、快取。'
$txt += '給資料維護：主表每運動 <=10 筆可明顯改善 LINE 選單速度。'
$txt -join "`n" | Set-Content $TxtPath -Encoding UTF8

Write-Host ('報告：' + $TxtPath)

# Diagnose why LINE 羽球 option may not trigger
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$config = Get-Content (Join-Path $Root 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$tokenBody = @{
    client_id     = $config.client_id
    client_secret = $config.client_secret
    refresh_token = $config.refresh_token
    grant_type    = 'refresh_token'
}
$tokenResp = Invoke-RestMethod -Uri 'https://oauth2.googleapis.com/token' -Method POST -Body $tokenBody
$headers = @{ Authorization = "Bearer $($tokenResp.access_token)" }

function Format-SheetRange($sheetTitle, $cellRange) {
    $name = $sheetTitle
    if ($sheetTitle -match "[\s'!]") { $name = "'" + ($sheetTitle -replace "'", "''") + "'" }
    if ($cellRange) { return $name + '!' + $cellRange }
    return $name
}

$sheetName = [string]$config.sheet_name
$range = [uri]::EscapeDataString((Format-SheetRange $sheetName 'A:G'))
$url = 'https://sheets.googleapis.com/v4/spreadsheets/' + $config.sheet_id + '/values/' + $range
$data = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

$rows = @()
for ($i = 1; $i -lt $data.values.Count; $i++) {
    $r = @($data.values[$i])
    while ($r.Count -lt 7) { $r += '' }
    $rows += [PSCustomObject]@{
        row      = $i + 1
        sport    = ([string]$r[0]).Trim()
        arena    = ([string]$r[1]).Trim()
        intro    = [string]$r[2]
        photo    = ([string]$r[3]).Trim()
        assign   = ([string]$r[4]).Trim()
        region   = ([string]$r[5]).Trim()
        location = ([string]$r[6]).Trim()
    }
}

function Test-LineReady($row) {
    $issues = @()
    if (-not $row.sport) { $issues += 'no_sport' }
    if (-not $row.arena) { $issues += 'no_arena' }
    if (-not $row.intro) { $issues += 'no_intro' }
    else {
        if ($row.intro -notmatch '地點：') { $issues += 'no_place' }
        if ($row.intro -notmatch '時間：') { $issues += 'no_time' }
        if ($row.intro -notmatch '程度：') { $issues += 'no_level' }
        if ($row.intro -notmatch '用球：') { $issues += 'no_balls' }
        if ($row.intro -notmatch '費用：' -and $row.intro -notmatch '臨打費：') { $issues += 'no_fee' }
    }
    if (-not $row.photo -or $row.photo -notmatch '^https?://') { $issues += 'no_photo' }
    if (-not $row.region) { $issues += 'no_region' }
    return $issues
}

$badmintonKeys = @('羽球', '羽毛球', 'badminton', 'Badminton')
$badmintonRows = @($rows | Where-Object {
    $s = $_.sport
    ($badmintonKeys | Where-Object { $s -eq $_ }).Count -gt 0 -or $s -match '羽球'
})

$sportGroups = $rows | Group-Object sport | Sort-Object Count -Descending | ForEach-Object {
    [PSCustomObject]@{ sport = $_.Name; count = $_.Count }
}

$badmintonReady = @()
$badmintonNotReady = @()
foreach ($b in $badmintonRows) {
    $issues = Test-LineReady $b
    if ($issues.Count -eq 0) { $badmintonReady += $b }
    else {
        $badmintonNotReady += [PSCustomObject]@{
            row = $b.row
            arena = $b.arena
            issues = ($issues -join ',')
        }
    }
}

$otherSportReady = @($rows | Where-Object {
    $s = $_.sport
    -not ($s -match '羽球') -and $s -ne '羽毛球'
} | Where-Object { (Test-LineReady $_).Count -eq 0 })

$syncResult = $null
try {
    $resp = Invoke-WebRequest -Uri 'https://api.crewplay.tw/arena/sheet_sync' -Method POST -UseBasicParsing -TimeoutSec 120
    $syncResult = @{
        status = [int]$resp.StatusCode
        body   = $resp.Content
    }
} catch {
    $syncResult = @{ status = 0; error = $_.Exception.Message }
}

$report = [PSCustomObject]@{
    checkedAt           = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    sheetId             = $config.sheet_id
    sheetName           = $sheetName
    totalRows           = $rows.Count
    sportBreakdown      = @($sportGroups)
    badmintonTotal      = $badmintonRows.Count
    badmintonLineReady  = $badmintonReady.Count
    badmintonNotReady   = $badmintonNotReady.Count
    otherSportLineReady = $otherSportReady.Count
    lineCarouselLimit   = 10
    badmintonOverLimit  = ($badmintonReady.Count -gt 10)
    likelyCauses        = @()
    badmintonReadySample = @($badmintonReady | Select-Object -First 12 | ForEach-Object { "$($_.row)|$($_.arena)" })
    badmintonIssuesTop   = @($badmintonNotReady | Select-Object -First 15)
    syncApi              = $syncResult
}

if ($badmintonRows.Count -eq 0) {
    $report.likelyCauses += '試算表沒有任何 sport=羽球 的列（或 sport 欄寫錯）'
}
if ($badmintonReady.Count -eq 0 -and $badmintonRows.Count -gt 0) {
    $report.likelyCauses += '有羽球列但全部不符合 LINE 顯示條件（缺 photo / introduce 格式）'
}
if ($badmintonReady.Count -gt 10) {
    $report.likelyCauses += "羽球合格列 $($badmintonReady.Count) 筆 > LINE carousel 上限 10，可能整段羽球選項渲染失敗"
}
if ($badmintonRows.Count -gt 0) {
    $wrongSport = @($rows | Where-Object { $_.sport -match '羽' -and $_.sport -ne '羽球' })
    if ($wrongSport.Count -gt 0) {
        $report.likelyCauses += "sport 欄非標準「羽球」的列：$(@($wrongSport | ForEach-Object { $_.sport } | Select-Object -Unique) -join '、')"
    }
}
if ($syncResult.status -ne 200) {
    $report.likelyCauses += 'sheet_sync API 未成功，後台可能沒有最新羽球資料'
}

$outJson = Join-Path $Root 'badminton-line-diag.json'
$outTxt  = Join-Path $Root 'badminton-line-diag.txt'

$txt = @()
$txt += 'CrewPlay LINE 羽球選項排查報告'
$txt += "時間：$($report.checkedAt)"
$txt += "試算表：$($report.sheetName) ($($report.sheetId))"
$txt += ''
$txt += "總列數：$($report.totalRows)"
$txt += "羽球列數：$($report.badmintonTotal)"
$txt += "羽球 LINE 合格：$($report.badmintonLineReady)"
$txt += "羽球 LINE 不合格：$($report.badmintonNotReady)"
$txt += "其他運動合格：$($report.otherSportLineReady)"
$txt += "是否超過 10 筆上限：$($report.badmintonOverLimit)"
$txt += ''
$txt += '--- sport 分布 ---'
foreach ($g in $sportGroups) { $txt += "  $($g.sport) : $($g.count)" }
$txt += ''
$txt += '--- 可能原因 ---'
foreach ($c in $report.likelyCauses) { $txt += "  * $c" }
$txt += ''
$txt += '--- 合格羽球範例（前 12）---'
foreach ($s in $report.badmintonReadySample) { $txt += "  $s" }
$txt += ''
$txt += '--- 不合格羽球（前 15）---'
foreach ($n in $report.badmintonIssuesTop) { $txt += "  第$($n.row)列 $($n.arena) -> $($n.issues)" }
$txt += ''
$txt += '--- sheet_sync ---'
if ($syncResult.status -eq 200) { $txt += "  HTTP 200 | $($syncResult.body)" }
else { $txt += "  失敗 | $($syncResult.error)" }

$report | ConvertTo-Json -Depth 8 | Set-Content $outJson -Encoding UTF8
($txt -join "`n") | Set-Content $outTxt -Encoding UTF8

Write-Host ($txt -join "`n")
Write-Host ''
Write-Host "報告：$outTxt"

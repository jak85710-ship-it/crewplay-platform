# CrewPlay 試算表 LINE 連結排查工具
# 用法：check-sheet.ps1 [-FromRow 81]
param(
    [int]$FromRow = 2
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8
$OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$configPath = Join-Path $Root 'config.json'
if (-not (Test-Path $configPath)) {
    Write-Host '找不到 config.json，請先完成 OAuth 設定。' -ForegroundColor Red
    exit 1
}

$config = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
$tokenBody = @{
    client_id     = $config.client_id
    client_secret = $config.client_secret
    refresh_token = $config.refresh_token
    grant_type    = 'refresh_token'
}
Write-Host '正在連線 Google 試算表...' -ForegroundColor Cyan
$tokenResp = Invoke-RestMethod -Uri 'https://oauth2.googleapis.com/token' -Method POST -Body $tokenBody
$headers = @{ Authorization = "Bearer $($tokenResp.access_token)" }
$range = [uri]::EscapeDataString("'$($config.sheet_name)'!A:G")
$url = "https://sheets.googleapis.com/v4/spreadsheets/$($config.sheet_id)/values/$range"
$data = Invoke-RestMethod -Uri $url -Headers $headers

if (-not $data.values -or $data.values.Count -lt 2) {
    Write-Host '試算表沒有資料列。' -ForegroundColor Yellow
    exit 0
}

function Test-IntroField {
    param([string]$Intro, [string]$Pattern, [string]$Label)
    if ($Intro -match $Pattern) { return $null }
    return $Label
}

function Get-RowIssues {
    param(
        [int]$SheetRow,
        [array]$Row
    )
    $sport    = if ($Row.Count -gt 0) { [string]$Row[0] } else { '' }
    $arena    = if ($Row.Count -gt 1) { [string]$Row[1] } else { '' }
    $intro    = if ($Row.Count -gt 2) { [string]$Row[2] } else { '' }
    $photo    = if ($Row.Count -gt 3) { [string]$Row[3] } else { '' }
    $assign   = if ($Row.Count -gt 4) { [string]$Row[4] } else { '' }
    $region   = if ($Row.Count -gt 5) { [string]$Row[5] } else { '' }
    $location = if ($Row.Count -gt 6) { [string]$Row[6] } else { '' }

    $errors = @()
    $warnings = @()

    if ([string]::IsNullOrWhiteSpace($sport)) { $errors += '缺少 sport（運動類型）' }
    if ([string]::IsNullOrWhiteSpace($arena)) { $errors += '缺少 arena_name（球館名）' }
    if ([string]::IsNullOrWhiteSpace($intro)) {
        $errors += 'introduce 空白'
    } else {
        foreach ($check in @(
            @{ Pattern = '\u5730\u9EDE\uFF1A'; Label = 'introduce 缺少「地點：」' }
            @{ Pattern = '\u6642\u9593\uFF1A'; Label = 'introduce 缺少「時間：」' }
            @{ Pattern = '\u7A0B\u5EA6\uFF1A'; Label = 'introduce 缺少「程度：」' }
            @{ Pattern = '\u7528\u7403\uFF1A'; Label = 'introduce 缺少「用球：」' }
        )) {
            $miss = Test-IntroField -Intro $intro -Pattern $check.Pattern -Label $check.Label
            if ($miss) { $errors += $miss }
        }
        $hasFee = $intro -match '\u8CBB\u7528\uFF1A'
        $hasLinDa = $intro -match '\u81E8\u6253\u8CBB\uFF1A'
        if (-not $hasFee -and -not $hasLinDa) {
            $errors += 'introduce 缺少「費用：」或「臨打費：」'
        } elseif (-not $hasFee -and $hasLinDa) {
            $warnings += '使用「臨打費：」建議改為「費用：」'
        }
        if ($intro -match '\u4FDD\u6301\u767C\u8A00') {
            $errors += 'introduce 含 FB「保持發言的成員」雜訊'
        }
        $lineCount = ($intro -split "`n" | Where-Object { $_.Length -gt 0 }).Count
        if ($lineCount -gt 8) {
            $warnings += 'introduce 行數過多（建議只留 5 行，其餘放工作表2）'
        }
    }

    if ([string]::IsNullOrWhiteSpace($photo)) {
        $warnings += '缺少 photo（照片網址）'
    } elseif ($photo -notmatch '^https?://') {
        $warnings += 'photo 不是 http 開頭的網址'
    }

    if ([string]::IsNullOrWhiteSpace($region)) { $warnings += '缺少 region（縣市）' }
    if ([string]::IsNullOrWhiteSpace($location)) { $warnings += '缺少 location（地址）' }

    [PSCustomObject]@{
        sheetRow = $SheetRow
        sport    = $sport
        arena    = $arena
        errors   = $errors
        warnings = $warnings
        ok       = ($errors.Count -eq 0)
        assign   = $assign
    }
}

$results = @()
$arenaRows = @{}

for ($i = 1; $i -lt $data.values.Count; $i++) {
    $sheetRow = $i + 1
    if ($sheetRow -lt $FromRow) { continue }
    $item = Get-RowIssues -SheetRow $sheetRow -Row $data.values[$i]
    $results += $item
    if (-not [string]::IsNullOrWhiteSpace($item.arena)) {
        if (-not $arenaRows.ContainsKey($item.arena)) {
            $arenaRows[$item.arena] = @()
        }
        $arenaRows[$item.arena] += $sheetRow
    }
}

$total = $results.Count
$okRows = @($results | Where-Object { $_.ok })
$badRows = @($results | Where-Object { -not $_.ok })
$warnOnlyRows = @($results | Where-Object { $_.ok -and $_.warnings.Count -gt 0 })
$dupArenas = @($arenaRows.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 })

$errorCounts = @{}
foreach ($r in $results) {
    foreach ($e in $r.errors) {
        if (-not $errorCounts.ContainsKey($e)) { $errorCounts[$e] = 0 }
        $errorCounts[$e]++
    }
}
$warnCounts = @{}
foreach ($r in $results) {
    foreach ($w in $r.warnings) {
        if (-not $warnCounts.ContainsKey($w)) { $warnCounts[$w] = 0 }
        $warnCounts[$w]++
    }
}

Write-Host ''
Write-Host '========================================' -ForegroundColor White
Write-Host '  CrewPlay 試算表 LINE 連結排查報告' -ForegroundColor White
Write-Host "  分頁：$($config.sheet_name)" -ForegroundColor Gray
if ($FromRow -gt 2) {
    Write-Host "  檢查範圍：第 $FromRow 列起" -ForegroundColor Gray
}
Write-Host '========================================' -ForegroundColor White
Write-Host ''
Write-Host "檢查列數：$total"
Write-Host "introduce 格式正確：$($okRows.Count)" -ForegroundColor Green
Write-Host "introduce 格式錯誤（需優先修正）：$($badRows.Count)" -ForegroundColor Red
Write-Host "僅警告（格式可改進）：$($warnOnlyRows.Count)" -ForegroundColor Yellow
Write-Host "不重複球館名：$($arenaRows.Count)"
Write-Host "重複球館名組數：$($dupArenas.Count)" -ForegroundColor Yellow
Write-Host ''

if ($errorCounts.Count -gt 0) {
    Write-Host '--- 錯誤統計（優先處理）---' -ForegroundColor Red
    foreach ($k in ($errorCounts.Keys | Sort-Object { $errorCounts[$_] } -Descending)) {
        Write-Host "  $($errorCounts[$k]) 列 → $k"
    }
    Write-Host ''
}

if ($warnCounts.Count -gt 0) {
    Write-Host '--- 警告統計 ---' -ForegroundColor Yellow
    foreach ($k in ($warnCounts.Keys | Sort-Object { $warnCounts[$_] } -Descending)) {
        Write-Host "  $($warnCounts[$k]) 列 → $k"
    }
    Write-Host ''
}

if ($badRows.Count -gt 0) {
    Write-Host '--- introduce 格式錯誤明細 ---' -ForegroundColor Red
    foreach ($r in $badRows) {
        Write-Host ''
        Write-Host "第 $($r.sheetRow) 列 | $($r.sport) | $($r.arena)" -ForegroundColor Red
        foreach ($e in $r.errors) { Write-Host "  [錯誤] $e" -ForegroundColor Red }
    }
    Write-Host ''
}

$noPhotoRows = @($results | Where-Object { $_.warnings -contains '缺少 photo（照片網址）' })
if ($noPhotoRows.Count -gt 0 -and $badRows.Count -eq 0) {
    Write-Host "--- 缺 photo 的列（共 $($noPhotoRows.Count) 列，建議補圖）---" -ForegroundColor Yellow
    $nums = ($noPhotoRows | ForEach-Object { $_.sheetRow }) -join ', '
    if ($nums.Length -gt 120) {
        Write-Host "  第 $($nums.Substring(0, 120))..."
    } else {
        Write-Host "  第 $nums 列"
    }
    Write-Host ''
}

if ($dupArenas.Count -gt 0) {
    Write-Host '--- 重複球館名（LINE 通常只顯示一間）---' -ForegroundColor Yellow
    foreach ($d in ($dupArenas | Sort-Object { $_.Value.Count } -Descending | Select-Object -First 10)) {
        $rows = $d.Value -join ', '
        Write-Host "  $($d.Key) → 第 $rows 列"
    }
    Write-Host ''
}

$report = [PSCustomObject]@{
    checkedAt = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    sheetName = $config.sheet_name
    fromRow   = $FromRow
    summary   = [PSCustomObject]@{
        checkedRows   = $total
        okRows        = $okRows.Count
        errorRows     = $badRows.Count
        warningOnly   = $warnOnlyRows.Count
        uniqueArenas  = $arenaRows.Count
        duplicateArenaGroups = $dupArenas.Count
        errorCounts   = $errorCounts
        warnCounts    = $warnCounts
    }
    errorRows = $badRows | ForEach-Object {
        [PSCustomObject]@{
            sheetRow = $_.sheetRow
            sport    = $_.sport
            arena    = $_.arena
            errors   = $_.errors
            warnings = $_.warnings
        }
    }
    allRows = $results | ForEach-Object {
        [PSCustomObject]@{
            sheetRow = $_.sheetRow
            sport    = $_.sport
            arena    = $_.arena
            ok       = $_.ok
            errors   = $_.errors
            warnings = $_.warnings
        }
    }
    duplicateArenas = $dupArenas | ForEach-Object {
        [PSCustomObject]@{
            arena     = $_.Key
            sheetRows = $_.Value
            count     = $_.Value.Count
        }
    }
}

$jsonPath = Join-Path $Root 'check-report.json'
$txtPath = Join-Path $Root 'check-report.txt'
$report | ConvertTo-Json -Depth 6 | Set-Content $jsonPath -Encoding UTF8

$txt = @()
$txt += 'CrewPlay 試算表 LINE 連結排查報告'
$txt += "檢查時間：$($report.checkedAt)"
$txt += "分頁：$($config.sheet_name)"
if ($FromRow -gt 2) { $txt += "檢查範圍：第 $FromRow 列起" }
$txt += ''
$txt += "檢查列數：$total | 格式正確：$($okRows.Count) | 格式錯誤：$($badRows.Count)"
$txt += ''
if ($errorCounts.Count -gt 0) {
    $txt += '=== 錯誤統計 ==='
    foreach ($k in ($errorCounts.Keys | Sort-Object { $errorCounts[$_] } -Descending)) {
        $txt += "$($errorCounts[$k]) 列 → $k"
    }
    $txt += ''
}
if ($badRows.Count -gt 0) {
    $txt += '=== 格式錯誤明細 ==='
    foreach ($r in $badRows) {
        $txt += ''
        $txt += "第 $($r.sheetRow) 列 | $($r.sport) | $($r.arena)"
        foreach ($e in $r.errors) { $txt += "  [錯誤] $e" }
    }
}
$txt += ''
$txt += '修正後請執行「觸發LINE同步.bat」'
$txt -join "`r`n" | Set-Content $txtPath -Encoding UTF8

Write-Host '報告已儲存：' -ForegroundColor Cyan
Write-Host "  $txtPath"
Write-Host "  $jsonPath"
Write-Host ''
if ($badRows.Count -gt 0) {
    Write-Host '請優先修正上方「格式錯誤」列，完成後執行「觸發LINE同步.bat」。' -ForegroundColor Yellow
    exit 2
}
Write-Host 'introduce 格式全部通過！若 LINE 仍異常，補 photo 後執行「觸發LINE同步.bat」。' -ForegroundColor Green
exit 0

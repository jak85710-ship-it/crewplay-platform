# 一鍵診斷：試算表 + 強制同步 + 告訴你在哪裡看結果
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8
$OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$configPath = Join-Path $Root 'config.json'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  LINE 同步完整診斷' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# --- 1. 讀試算表 ---
if (-not (Test-Path $configPath)) {
    Write-Host '[失敗] 找不到 config.json' -ForegroundColor Red
    exit 1
}

$config = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
$tokenBody = @{
    client_id     = $config.client_id
    client_secret = $config.client_secret
    refresh_token = $config.refresh_token
    grant_type    = 'refresh_token'
}

Write-Host '[1/3] 讀取試算表...' -ForegroundColor Yellow
try {
    $tokenResp = Invoke-RestMethod -Uri 'https://oauth2.googleapis.com/token' -Method POST -Body $tokenBody
    $headers = @{ Authorization = "Bearer $($tokenResp.access_token)" }
    $range = [uri]::EscapeDataString("'$($config.sheet_name)'!A:G")
    $url = "https://sheets.googleapis.com/v4/spreadsheets/$($config.sheet_id)/values/$range"
    $data = Invoke-RestMethod -Uri $url -Headers $headers
    $rows = $data.values.Count - 1
    $withPhoto = 0
    $unique = @{}
    for ($i = 1; $i -lt $data.values.Count; $i++) {
        $row = $data.values[$i]
        $photo = if ($row.Count -gt 3) { $row[3] } else { '' }
        $arena = if ($row.Count -gt 1) { $row[1] } else { '' }
        if (-not [string]::IsNullOrWhiteSpace($photo)) { $withPhoto++ }
        if ($arena) { $unique[$arena] = $true }
    }
    Write-Host "  試算表資料列：$rows" -ForegroundColor Green
    Write-Host "  有 photo 的列：$withPhoto" -ForegroundColor $(if ($withPhoto -lt 10) { 'Red' } else { 'Green' })
    Write-Host "  不重複球館：$($unique.Count)" -ForegroundColor Green
    if ($withPhoto -lt 10) {
        Write-Host '  >> 警告：幾乎都沒 photo，LINE 常不顯示卡片！' -ForegroundColor Red
    }
} catch {
    Write-Host "  試算表讀取失敗：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ''
Write-Host '[2/3] 強制同步到 CrewPlay 後台（POST）...' -ForegroundColor Yellow
try {
    $resp = Invoke-WebRequest -Uri 'https://api.crewplay.tw/arena/sheet_sync' -Method POST -UseBasicParsing -TimeoutSec 120
    $json = $resp.Content | ConvertFrom-Json
    Write-Host "  HTTP $($resp.StatusCode) | $($json.message)" -ForegroundColor Green
    Write-Host "  後台同步筆數：$($json.count)" -ForegroundColor Green
} catch {
    Write-Host "  同步失敗：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ''
Write-Host '[3/3] 你要在哪裡看「有沒有成功」？' -ForegroundColor Yellow
Write-Host ''
Write-Host '  [有畫面] 的地方：' -ForegroundColor Green
Write-Host '    -> LINE App 裡的 CrewPlay 官方帳號'
Write-Host '    -> 找「場地列表 / 我要預約 / 搜尋球館」'
Write-Host ''
Write-Host '  [沒有畫面] 的地方（正常，不是壞掉）：' -ForegroundColor Gray
Write-Host '    -> Google Cloud Scheduler 按「立即執行」'
Write-Host '    -> 只會寫入 Cloud 的「記錄/Logs」，不會跳視窗'
Write-Host '    -> 你不需要用 Google Cloud，用「強制同步LINE.bat」即可'
Write-Host ''
Write-Host '  若同步成功但 LINE 仍看不到新場地：' -ForegroundColor Yellow
Write-Host '    1. 補 photo 欄（圖片網址）'
Write-Host '    2. 執行「排查試算表.bat」'
Write-Host '    3. 再執行「強制同步LINE.bat」'
Write-Host ''
exit 0

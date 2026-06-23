# LINE 即時預約 修復檢查（2026-06）
# 用法: powershell -File scripts/check-line-status.ps1

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

Write-Host ''
Write-Host '========================================'
Write-Host '  CrewPlay LINE 即時預約 檢查'
Write-Host '========================================'
Write-Host ''

$checks = @(
    @{
        Name = '新站 API（揪團列表）'
        Url  = 'https://www.crewplay.tw/api/teams?sport=羽球'
    },
    @{
        Name = '新站 sheet_sync 相容端點'
        Url  = 'https://www.crewplay.tw/api/arena/sheet_sync'
        Method = 'POST'
    },
    @{
        Name = 'LIFF 入口'
        Url  = 'https://www.crewplay.tw/liff/bootstrap?path=/teams'
    },
    @{
        Name = '舊後台 api.crewplay.tw（LINE 內建搜尋）'
        Url  = 'https://api.crewplay.tw/arena/sheet_sync'
        Method = 'POST'
    }
)

foreach ($c in $checks) {
    $method = if ($c.Method) { $c.Method } else { 'GET' }
    Write-Host ('[' + $method + '] ' + $c.Name)
    Write-Host ('  ' + $c.Url)
    try {
        $sw = [Diagnostics.Stopwatch]::StartNew()
        if ($method -eq 'POST') {
            $resp = Invoke-WebRequest -Uri $c.Url -Method POST -UseBasicParsing -TimeoutSec 25
        } else {
            $resp = Invoke-WebRequest -Uri $c.Url -UseBasicParsing -TimeoutSec 25
        }
        $sw.Stop()
        Write-Host ('  OK  HTTP ' + $resp.StatusCode + '  ' + $sw.ElapsedMilliseconds + ' ms') -ForegroundColor Green
        if ($resp.Content -and $resp.Content.Length -lt 300) {
            Write-Host ('  ' + $resp.Content)
        }
    } catch {
        Write-Host ('  FAIL  ' + $_.Exception.Message) -ForegroundColor Red
    }
    Write-Host ''
}

Write-Host '----------------------------------------'
Write-Host '結論'
Write-Host '  若「舊後台」FAIL 503 → LINE 聊天室內「即時預約搜尋」無法用'
Write-Host '  解法：到 LINE 官方帳號後台，把圖文選單「即時預約」改成開啟網址：'
Write-Host '        https://www.crewplay.tw/teams'
Write-Host '  或 LIFF：https://liff.line.me/{你的LIFF_ID}?path=/teams'
Write-Host '  詳見 docs/LINE-DUAL-SETUP.md'
Write-Host ''

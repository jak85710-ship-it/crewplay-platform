# Compare GET vs POST for sheet_sync (Cloud Scheduler diagnosis)
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$uri = 'https://api.crewplay.tw/arena/sheet_sync'

Write-Host ''
Write-Host '========================================'
Write-Host '  Cloud Scheduler 診斷：GET vs POST'
Write-Host '========================================'
Write-Host ''
Write-Host 'API：' $uri
Write-Host ''

Write-Host '[GET] Cloud Scheduler 預設方法' -ForegroundColor Yellow
try {
    $g = Invoke-WebRequest -Uri $uri -Method GET -UseBasicParsing -TimeoutSec 30
    Write-Host ('  HTTP ' + $g.StatusCode) -ForegroundColor Green
    Write-Host ('  Body: ' + $g.Content)
} catch {
    $code = ''
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    Write-Host ('  HTTP ' + $code + ' 失敗') -ForegroundColor Red
    Write-Host ('  原因: ' + $_.Exception.Message) -ForegroundColor Red
    if ($code -eq 405) {
        Write-Host '  >> 這就是 Cloud Scheduler 顯示「失敗」的原因！' -ForegroundColor Red
    }
}

Write-Host ''
Write-Host '[POST] 正確方法（強制同步LINE.bat 用的）' -ForegroundColor Yellow
try {
    $p = Invoke-WebRequest -Uri $uri -Method POST -UseBasicParsing -TimeoutSec 120
    Write-Host ('  HTTP ' + $p.StatusCode) -ForegroundColor Green
    Write-Host ('  Body: ' + $p.Content) -ForegroundColor Green
} catch {
    $code = ''
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    Write-Host ('  HTTP ' + $code + ' 失敗') -ForegroundColor Red
    Write-Host ('  原因: ' + $_.Exception.Message) -ForegroundColor Red
}

Write-Host ''
Write-Host '結論：Cloud Scheduler 必須改成 POST' -ForegroundColor Cyan
Write-Host '詳細步驟請看：Cloud排程POST修正完整指南.txt'
Write-Host ''

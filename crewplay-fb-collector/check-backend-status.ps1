# Check CrewPlay backend APIs (old + new)
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$oldUri = 'https://api.crewplay.tw/arena/sheet_sync'
$newUri = 'https://www.crewplay.tw/api/arena/sheet_sync'

Write-Host ''
Write-Host '========================================'
Write-Host '  CrewPlay backend status check'
Write-Host '========================================'
Write-Host ''

function Test-SyncEndpoint($label, $uri) {
    Write-Host ('--- ' + $label + ' ---')
    Write-Host ('Target: ' + $uri)
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try {
        $resp = Invoke-WebRequest -Uri $uri -Method POST -UseBasicParsing -TimeoutSec 30
        $sw.Stop()
        Write-Host ('OK  HTTP ' + $resp.StatusCode + '  ' + $sw.ElapsedMilliseconds + ' ms') -ForegroundColor Green
        if ($resp.Content) { Write-Host $resp.Content }
        return $true
    } catch {
        $sw.Stop()
        $msg = $_.Exception.Message
        $detail = ''
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            $detail = [string]$_.ErrorDetails.Message
        }
        Write-Host ('FAIL  ' + $sw.ElapsedMilliseconds + ' ms') -ForegroundColor Red
        Write-Host $msg
        if ($detail) { Write-Host $detail }
        return $false
    } finally {
        Write-Host ''
    }
}

$newOk = Test-SyncEndpoint '新站 Netlify' $newUri
$oldOk = Test-SyncEndpoint '舊 api.crewplay.tw（LINE 內建搜尋）' $oldUri

if ($newOk) {
    Write-Host '新站資料 OK。LINE「即時預約」請改圖文選單連到 https://www.crewplay.tw/teams' -ForegroundColor Green
}

if (-not $oldOk) {
    Write-Host '舊後台仍掛載 → LINE 聊天室內「搜尋框」版即時預約無法用，除非修復 api.crewplay.tw 或改圖文選單 URL。' -ForegroundColor Yellow
}

if ($newOk) { exit 0 }
exit 1

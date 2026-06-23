# Trigger CrewPlay backend to sync Google Sheet -> LINE
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8
$OutputEncoding = [Text.UTF8Encoding]::UTF8

$uri = 'https://api.crewplay.tw/arena/sheet_sync'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  Force sync: Sheet -> CrewPlay -> LINE' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Calling API (POST)...' -ForegroundColor Gray
Write-Host $uri
Write-Host ''

try {
    $resp = Invoke-WebRequest -Uri $uri -Method POST -UseBasicParsing -TimeoutSec 120
    Write-Host ('HTTP ' + $resp.StatusCode) -ForegroundColor Green

    $json = $null
    if ($resp.Content) {
        try {
            $json = $resp.Content | ConvertFrom-Json
        } catch {
            Write-Host $resp.Content
        }
    }

    if ($json) {
        if ($json.message) {
            Write-Host ''
            Write-Host ('Message: ' + $json.message) -ForegroundColor Green
        }
        if ($json.count) {
            Write-Host ('Count: ' + $json.count) -ForegroundColor Green
        }
        if ($json.success -eq $false) {
            Write-Host 'Backend returned success=false' -ForegroundColor Red
            exit 1
        }
    }

    Write-Host ''
    Write-Host 'Sync sent. Test in LINE app:' -ForegroundColor Yellow
    Write-Host '  1. Open CrewPlay official account'
    Write-Host '  2. Tap booking / venue list'
    Write-Host '  3. Search by team name (arena_name), e.g. team name not venue-team'
    Write-Host ''
    exit 0
} catch {
    Write-Host ''
    Write-Host 'Sync failed!' -ForegroundColor Red
    Write-Host $_.Exception.Message
    $detail = ''
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
        $detail = [string]$_.ErrorDetails.Message
        Write-Host $detail
    }
    Write-Host ''
    if ($_.Exception.Message -match '503' -or $detail -match 'no healthy upstream') {
        Write-Host 'HTTP 503: CrewPlay backend is DOWN (no healthy upstream).' -ForegroundColor Yellow
        Write-Host 'LINE booking UI will not work until admin fixes the server.'
        Write-Host 'Your Google Sheet is OK. Retry later or run check-backend-status.bat'
    } elseif ($_.Exception.Message -match '405') {
        Write-Host 'HTTP 405: must use POST not GET'
    }
    exit 1
}

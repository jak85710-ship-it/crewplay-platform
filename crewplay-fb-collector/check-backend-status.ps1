# Check if CrewPlay backend API is reachable
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$uri = 'https://api.crewplay.tw/arena/sheet_sync'

Write-Host ''
Write-Host '========================================'
Write-Host '  CrewPlay backend status check'
Write-Host '========================================'
Write-Host ''
Write-Host ('Target: ' + $uri)
Write-Host ''

$sw = [Diagnostics.Stopwatch]::StartNew()
try {
    $resp = Invoke-WebRequest -Uri $uri -Method POST -UseBasicParsing -TimeoutSec 30
    $sw.Stop()
    Write-Host ('OK  HTTP ' + $resp.StatusCode + '  ' + $sw.ElapsedMilliseconds + ' ms') -ForegroundColor Green
    if ($resp.Content) { Write-Host $resp.Content }
    Write-Host ''
    Write-Host 'Backend is up. You can run sync bat again.'
    exit 0
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

    Write-Host ''
    if ($msg -match '503' -or $detail -match 'no healthy upstream') {
        Write-Host 'Diagnosis: CrewPlay server is DOWN or overloaded.' -ForegroundColor Yellow
        Write-Host '  - sheet_sync cannot run'
        Write-Host '  - LINE booking UI may not respond'
        Write-Host '  - This is NOT a problem with your PC or Google Sheet'
        Write-Host ''
        Write-Host 'What to do:'
        Write-Host '  1. Wait 10-30 min and run this check again'
        Write-Host '  2. Tell CrewPlay admin: api.crewplay.tw returns 503 no healthy upstream'
        Write-Host '  3. Your sheet data is safe; sync again when backend is back'
    } elseif ($msg -match '405') {
        Write-Host 'Diagnosis: Wrong HTTP method. Must use POST not GET.'
    } else {
        Write-Host 'Diagnosis: Network or unknown error. Check internet connection.'
    }
    exit 1
}

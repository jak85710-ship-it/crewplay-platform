# Test Google OAuth credentials only (no sheet write)
$ErrorActionPreference = 'Stop'
$ConfigPath = Join-Path $PSScriptRoot 'config.json'

function Read-GoogleError($err) {
    if ($err.ErrorDetails -and $err.ErrorDetails.Message) {
        return $err.ErrorDetails.Message
    }
    if ($err.Exception.Response) {
        try {
            $stream = $err.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $text = $reader.ReadToEnd()
                $reader.Close()
                if ($text.Trim()) { return $text }
            }
        } catch {}
    }
    return $err.Exception.Message
}

if (-not (Test-Path $ConfigPath)) {
    Write-Host 'config.json not found.'
    exit 1
}

$config = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$clientId = [string]$config.client_id
$clientSecret = [string]$config.client_secret
$refreshToken = [string]$config.refresh_token

Write-Host 'Testing Google OAuth...'
Write-Host ('client_id: ' + $clientId)
Write-Host ('refresh_token length: ' + $refreshToken.Length)

if ($clientId -match '貼上|your|example|xxx') {
    Write-Host 'FAIL: client_id still looks like placeholder text.'
    exit 1
}
if ($clientSecret -match '貼上|your|example|xxx') {
    Write-Host 'FAIL: client_secret still looks like placeholder text.'
    exit 1
}
if ($refreshToken -match '貼上|your|example|xxx') {
    Write-Host 'FAIL: refresh_token still looks like placeholder text.'
    exit 1
}

$body = 'client_id=' + [uri]::EscapeDataString($clientId) +
        '&client_secret=' + [uri]::EscapeDataString($clientSecret) +
        '&refresh_token=' + [uri]::EscapeDataString($refreshToken) +
        '&grant_type=refresh_token'

try {
    $resp = Invoke-WebRequest `
        -Uri 'https://oauth2.googleapis.com/token' `
        -Method Post `
        -ContentType 'application/x-www-form-urlencoded' `
        -Body $body `
        -UseBasicParsing
    $json = $resp.Content | ConvertFrom-Json
    Write-Host 'OK: access token received.'
    Write-Host ('expires_in: ' + $json.expires_in + ' seconds')
    exit 0
} catch {
    Write-Host 'FAIL:'
    $raw = Read-GoogleError $_
    Write-Host $raw
    Write-Host ''
    try {
        $parsed = $raw | ConvertFrom-Json
        if ($parsed.error -eq 'invalid_grant') {
            Write-Host 'Cause: refresh_token expired/revoked, or client_id/secret do not match the token.'
            Write-Host 'Fix: get a NEW refresh_token in OAuth Playground using crewplay-web credentials.'
        } elseif ($parsed.error -eq 'invalid_client') {
            Write-Host 'Cause: client_id or client_secret is wrong.'
            Write-Host 'Fix: copy client_id + client_secret from crewplay-web in Google Cloud.'
        }
    } catch {}
    exit 1
}

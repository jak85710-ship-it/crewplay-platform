# Publish Google Sheet teams to crewplay-platform (JSON + optional Supabase)
param(
    [switch]$SupabaseOnly,
    [switch]$JsonOnly
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$ConfigPath = Join-Path $Root 'config.json'
$PlatformConfigPath = Join-Path $Root 'config.platform.json'
$DefaultPhoto = 'https://storage.googleapis.com/crewplay-arena-storage/photo/a1.jpg'
$OutDir = Join-Path (Split-Path $Root -Parent) 'crewplay-platform\public\data'
$OutFile = Join-Path $OutDir 'teams.json'

function Read-Config {
    if (-not (Test-Path $ConfigPath)) { throw 'config.json not found.' }
    return Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Read-PlatformConfig {
    if (-not (Test-Path $PlatformConfigPath)) { return $null }
    return Get-Content $PlatformConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
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

function Parse-Fee($introduce) {
    if ([string]::IsNullOrWhiteSpace($introduce)) { return @{ amount = $null; label = '' } }
    if ($introduce -match '費用[：:]\s*([^\r\n]+)') {
        $label = $Matches[1].Trim()
        $amount = $null
        if ($label -match '(\d+)') { $amount = [int]$Matches[1] }
        return @{ amount = $amount; label = $label }
    }
    return @{ amount = $null; label = '' }
}

function Normalize-TaichungText([string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) { return '' }
    return ([string]$value).Replace('台中市', '臺中市').Replace('台中', '臺中')
}

function Normalize-Region([string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) { return '' }
    $from = [string][char]0x53F0
    $to = [string][char]0x81FA
    return ([string]$value).Trim().Replace($from, $to)
}

function Infer-RegionFromLocation([string]$location) {
    if ([string]::IsNullOrWhiteSpace($location)) { return '' }
    if ($location -match '臺中|台中') { return '臺中市' }
    if ($location -match '臺北|台北') { return '臺北市' }
    if ($location -match '臺南|台南') { return '臺南市' }
    if ($location -match '高雄') { return '高雄市' }
    if ($location -match '新北') { return '新北市' }
    if ($location -match '桃園|中壢') { return '桃園市' }
    if ($location -match '竹北') { return '新竹縣' }
    if ($location -match '花蓮') { return '花蓮縣' }
    return ''
}

function Canonical-Region([string]$region) {
    if ([string]::IsNullOrWhiteSpace($region)) { return '' }
    $r = Normalize-Region $region
    if ($r -match '花蓮') { return '花蓮縣' }
    if ($r -match '竹北') { return '新竹縣' }
    if ($r -match '中壢') { return '桃園市' }
    return $r
}

function Normalize-Photo([string]$photo) {
    if ([string]::IsNullOrWhiteSpace($photo)) { return $DefaultPhoto }
    if ($photo -match 'crewplay-arena-storage/photo/.+\.jpg') { return $photo }
    if ($photo -match '^https?://') { return $DefaultPhoto }
    return $DefaultPhoto
}

function New-TeamId([int]$sheetRow) {
    $bytes = New-Object byte[] 16
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $bytes[6] = ($bytes[6] -band 0x0F) -bor 0x40
    $bytes[8] = ($bytes[8] -band 0x3F) -bor 0x80
    return ([guid]::NewGuid().ToString())
}

function Write-Utf8NoBom([string]$Path, [string]$Content) {
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

$config = Read-Config
$platform = Read-PlatformConfig
$token = Get-AccessToken $config
$sheetName = if ($config.sheet_name) { [string]$config.sheet_name } else { '工作表1' }

$mainRange = [uri]::EscapeDataString((Format-SheetRange $sheetName 'A2:G'))
$mainUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + $config.sheet_id + '/values/' + $mainRange
$mainData = Invoke-RestMethod -Uri $mainUrl -Headers @{ Authorization = 'Bearer ' + $token } -Method Get

$teams = New-Object System.Collections.Generic.List[object]
$rowIndex = 2
$idMapPath = Join-Path $OutDir 'row-id-map.json'
$idMap = @{}
if (Test-Path $idMapPath) {
    $rawMap = Get-Content $idMapPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($rawMap) {
        $rawMap.PSObject.Properties | ForEach-Object { $idMap[$_.Name] = [string]$_.Value }
    }
}

if ($mainData.values) {
    foreach ($row in @($mainData.values)) {
        while ($row.Count -lt 7) { $row += '' }
        $arena = [string]$row[1]
        if ([string]::IsNullOrWhiteSpace($arena)) {
            $rowIndex++
            continue
        }
        $fee = Parse-Fee ([string]$row[2])
        $rowKey = [string]$rowIndex
        $id = if ($idMap.ContainsKey($rowKey)) { [string]$idMap[$rowKey] } else { (New-TeamId $rowIndex) }
        $idMap[$rowKey] = $id

        $location = Normalize-TaichungText ([string]$row[6])
        $region = Canonical-Region (Normalize-Region (Normalize-TaichungText ([string]$row[5])))
        if ([string]::IsNullOrWhiteSpace($region)) {
            $region = Infer-RegionFromLocation $location
        }
        if (-not [string]::IsNullOrWhiteSpace($region)) {
            $region = Canonical-Region $region
        }

        $teams.Add([PSCustomObject]@{
            id          = $id
            sheet_row   = $rowIndex
            sport       = Normalize-TaichungText ([string]$row[0])
            arena_name  = Normalize-TaichungText $arena
            introduce   = Normalize-TaichungText ([string]$row[2])
            photo       = (Normalize-Photo ([string]$row[3]))
            assign_url  = [string]$row[4]
            region      = $region
            location    = $location
            fee_amount  = $fee.amount
            fee_label   = $fee.label
            status      = 'published'
        })
        $rowIndex++
    }
}

Write-Host ''
Write-Host '========================================'
Write-Host '  Publish teams to web platform'
Write-Host '========================================'
Write-Host ('Teams: ' + $teams.Count)

if (-not $SupabaseOnly) {
    if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
    $idMapJson = $idMap | ConvertTo-Json
    Write-Utf8NoBom $idMapPath $idMapJson
    $manifest = @{
        exportedAt = (Get-Date).ToString('o')
        count      = $teams.Count
        teams      = $teams
    }
    $manifestJson = $manifest | ConvertTo-Json -Depth 6 -Compress:$false
    Write-Utf8NoBom $OutFile $manifestJson
    Write-Host ('JSON: ' + $OutFile)
}

$supabaseUrl = $null
$supabaseKey = $null
if ($platform) {
    if ($platform.supabase_url) { $supabaseUrl = [string]$platform.supabase_url }
    if ($platform.supabase_service_key) { $supabaseKey = [string]$platform.supabase_service_key }
}
if (-not $supabaseUrl) { $supabaseUrl = $env:SUPABASE_URL }
if (-not $supabaseKey) { $supabaseKey = $env:SUPABASE_SERVICE_ROLE_KEY }

if (-not $JsonOnly -and $supabaseUrl -and $supabaseKey) {
    Write-Host 'Upserting to Supabase...'
    $headers = @{
        apikey         = $supabaseKey
        Authorization  = 'Bearer ' + $supabaseKey
        'Content-Type' = 'application/json'
        Prefer         = 'resolution=merge-duplicates'
    }
    $uri = ($supabaseUrl.TrimEnd('/') + '/rest/v1/teams?on_conflict=sheet_row')
    $batchSize = 50
    for ($i = 0; $i -lt $teams.Count; $i += $batchSize) {
        $end = [Math]::Min($i + $batchSize - 1, $teams.Count - 1)
        $batch = @($teams[$i..$end])
        $body = $batch | ConvertTo-Json -Depth 5 -Compress
        Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body ([Text.Encoding]::UTF8.GetBytes($body)) | Out-Null
        Write-Host ('  batch ' + ($i + 1) + '-' + ($end + 1))
    }
    Write-Host 'Supabase upsert done.'
} elseif (-not $JsonOnly) {
    Write-Host 'Supabase skipped (copy config.platform.example.json to config.platform.json)'
}

Write-Host ''
Write-Host 'Next: cd crewplay-platform && npm install && npm run dev'
Write-Host ''

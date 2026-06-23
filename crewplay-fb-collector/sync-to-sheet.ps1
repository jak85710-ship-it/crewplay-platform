# CrewPlay: sync inbox JSON to Google Sheet (main + archive sheet)
$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Inbox = Join-Path $Root 'inbox'
$Done = Join-Path $Root 'done'
$ConfigPath = Join-Path $Root 'config.json'

$MainColumns = @('sport', 'arena_name', 'introduce', 'photo', 'assign_url', 'region', 'location')
$ArchiveColumns = @('arena_name', 'assign_url', 'official_url', 'other_urls', 'extra_notes', 'contact', 'raw_text', 'region')
$DefaultPhoto = 'https://storage.googleapis.com/crewplay-arena-storage/photo/a1.jpg'

function Read-Config {
    if (-not (Test-Path $ConfigPath)) {
        throw 'config.json not found. Copy config.example.json and fill it in.'
    }
    return Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
}

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
                if ($text -and $text.Trim()) { return $text }
            }
        } catch {}
    }
    return $err.Exception.Message
}

function Get-AccessToken($config) {
    $clientId = [string]$config.client_id
    $clientSecret = [string]$config.client_secret
    $refreshToken = [string]$config.refresh_token

    if (-not $clientId.Trim()) { throw 'config.json: client_id is empty.' }
    if (-not $clientSecret.Trim()) { throw 'config.json: client_secret is empty.' }
    if (-not $refreshToken.Trim()) { throw 'config.json: refresh_token is empty.' }

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
        return [string]$json.access_token
    } catch {
        $detail = Read-GoogleError $_
        try {
            $err = $detail | ConvertFrom-Json
            if ($err.error) {
                $detail = $err.error
                if ($err.error_description) {
                    $detail += ': ' + $err.error_description
                }
            }
        } catch {}
        throw ('Google OAuth failed: ' + $detail)
    }
}

function New-UrlSet { return @{} }

function Add-UrlToSet($set, $url) {
    if (-not $set) { return }
    $key = ([string]$url).Trim().ToLowerInvariant()
    if ($key) { $set[$key] = $true }
}

function Test-UrlInSet($set, $url) {
    if (-not $set) { return $false }
    $key = ([string]$url).Trim().ToLowerInvariant()
    if (-not $key) { return $false }
    return $set.ContainsKey($key)
}

function Get-FieldValue($item, $name) {
    if ($null -eq $item) { return '' }
    $val = $item.$name
    if ($null -eq $val) { return '' }
    return [string]$val
}

function Sanitize-PhotoValue([string]$photo) {
    if ($photo -match 'crewplay-arena-storage/photo/.+\.jpg($|\?)') { return $photo }
    return $DefaultPhoto
}

function Build-MainRow($item) {
    $mainRow = New-Object System.Collections.Generic.List[string]
    foreach ($col in $MainColumns) {
        $val = Get-FieldValue $item $col
        if ($col -eq 'photo') { $val = Sanitize-PhotoValue $val }
        [void]$mainRow.Add($val)
    }
    return ,$mainRow.ToArray()
}

function Get-ArchiveObject($item) {
    if ($item.archive) { return $item.archive }
    return [pscustomobject]@{
        assign_url   = (Get-FieldValue $item 'assign_url')
        official_url = ''
        other_urls   = ''
        extra_notes  = ''
        contact      = ''
        raw_text     = ''
        region       = (Get-FieldValue $item 'region')
    }
}

function Get-SheetTitles($token, $sheetId, $config) {
    $uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + $sheetId + '?fields=sheets.properties.title'
    $headers = @{ Authorization = 'Bearer ' + $token }
    $resp = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
    if (-not $resp.sheets -or $resp.sheets.Count -eq 0) {
        throw 'Spreadsheet has no sheets.'
    }

    $main = ''
    if ($config.sheet_name -and [string]$config.sheet_name.Trim()) {
        $main = [string]$config.sheet_name.Trim()
    } else {
        $main = [string]$resp.sheets[0].properties.title
    }

    $archive = ''
    if ($config.archive_sheet_name -and [string]$config.archive_sheet_name.Trim()) {
        $archive = [string]$config.archive_sheet_name.Trim()
    } elseif ($resp.sheets.Count -gt 1) {
        $archive = [string]$resp.sheets[1].properties.title
    }

    return @{ Main = $main; Archive = $archive }
}

function Format-SheetRange($sheetTitle, $cellRange) {
    $needsQuotes = $sheetTitle -match "[\s'!]"
    $name = $sheetTitle
    if ($needsQuotes) {
        $name = "'" + ($sheetTitle -replace "'", "''") + "'"
    }
    if ($cellRange) {
        return $name + '!' + $cellRange
    }
    return $name
}

function Get-ExistingUrls($token, $sheetId, $sheetTitle, $column) {
    $set = New-UrlSet
    if (-not $sheetTitle) { return $set }

    $range = [uri]::EscapeDataString((Format-SheetRange $sheetTitle ($column + '2:' + $column)))
    $uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + $sheetId + '/values/' + $range
    $headers = @{ Authorization = 'Bearer ' + $token }
    try {
        $resp = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
        if ($resp -and $resp.values) {
            foreach ($row in $resp.values) {
                if ($null -eq $row) { continue }
                $cell = ''
                if ($row -is [System.Array] -and $row.Length -gt 0) {
                    $cell = [string]$row[0]
                }
                Add-UrlToSet $set $cell
            }
        }
    } catch {
        Write-Host ('Note: could not read existing URLs from ' + $sheetTitle)
    }
    return $set
}

function Append-Rows($token, $sheetId, $sheetTitle, $rows) {
    if (-not $rows -or $rows.Count -eq 0) { return 0 }

    $appendRange = [uri]::EscapeDataString((Format-SheetRange $sheetTitle ''))
    $query = 'valueInputOption=USER_ENTERED' + [char]38 + 'insertDataOption=INSERT_ROWS'
    $uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + $sheetId + '/values/' + $appendRange + ':append?' + $query
    $headers = @{
        Authorization  = 'Bearer ' + $token
        'Content-Type' = 'application/json; charset=utf-8'
    }
    $payload = @{ values = $rows }
    $body = $payload | ConvertTo-Json -Depth 10 -Compress
    try {
        Invoke-RestMethod -Uri $uri -Headers $headers -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) | Out-Null
        return $rows.Count
    } catch {
        $detail = Read-GoogleError $_
        throw ('Google Sheets append failed (' + $sheetTitle + '): ' + $detail)
    }
}

function Normalize-ArenaKey($name) {
    return ([string]$name).Trim().ToLowerInvariant()
}

function Find-ArenaSheetRow($arenaRows, $arenaName, $venueBase) {
    $key = Normalize-ArenaKey $arenaName
    if ($key -and $arenaRows.ContainsKey($key)) {
        return [int]$arenaRows[$key]
    }
    if ($arenaName -notmatch '-') {
        $baseKey = Normalize-ArenaKey $venueBase
        if ($baseKey -and $arenaRows.ContainsKey($baseKey)) {
            return [int]$arenaRows[$baseKey]
        }
    }
    return 0
}

function Register-ArenaRow($arenaRows, [ref]$nextRow, $arenaName, $sheetRow) {
    $key = Normalize-ArenaKey $arenaName
    if ($key) {
        $arenaRows[$key] = $sheetRow
        if ($arenaName -match '-') {
            $baseKey = Normalize-ArenaKey (($arenaName -split '-', 2)[0])
            if ($baseKey -and $arenaRows.ContainsKey($baseKey)) {
                $arenaRows.Remove($baseKey)
            }
        }
        if ($sheetRow -ge $nextRow.Value) {
            $nextRow.Value = $sheetRow + 1
        }
    }
}

function Get-MainSheetState($token, $sheetId, $sheetTitle) {
    $state = @{
        ArenaRows = @{}
        RowCount  = 1
        Rows      = @()
    }
    if (-not $sheetTitle) { return $state }

    $range = [uri]::EscapeDataString((Format-SheetRange $sheetTitle 'A2:G'))
    $uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + $sheetId + '/values/' + $range
    $headers = @{ Authorization = 'Bearer ' + $token }
    try {
        $resp = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
        if ($resp -and $resp.values) {
            $sheetRow = 2
            foreach ($row in $resp.values) {
                $state.Rows += ,@($row)
                $state.RowCount = $sheetRow
                $arena = ''
                if ($row -is [System.Array] -and $row.Length -gt 1) {
                    $arena = [string]$row[1]
                }
                $key = Normalize-ArenaKey $arena
                if ($key -and -not $state.ArenaRows.ContainsKey($key)) {
                    $state.ArenaRows[$key] = $sheetRow
                }
                $sheetRow++
            }
        }
    } catch {
        Write-Host ('Note: could not read main sheet rows from ' + $sheetTitle)
    }
    return $state
}

function Merge-MainRow($existingRow, $newRow) {
    $merged = New-Object System.Collections.Generic.List[string]
    for ($i = 0; $i -lt $MainColumns.Count; $i++) {
        $newVal = if ($i -lt $newRow.Count) { [string]$newRow[$i] } else { '' }
        $oldVal = if ($existingRow -and $i -lt $existingRow.Count) { [string]$existingRow[$i] } else { '' }
        if ($MainColumns[$i] -eq 'photo') {
            $newVal = Sanitize-PhotoValue $newVal
            $oldVal = Sanitize-PhotoValue $oldVal
            if ([string]::IsNullOrWhiteSpace($newVal) -and -not [string]::IsNullOrWhiteSpace($oldVal)) {
                $newVal = $oldVal
            }
        }
        [void]$merged.Add($newVal)
    }
    return ,$merged.ToArray()
}

function Update-MainRow($token, $sheetId, $sheetTitle, $sheetRow, $rowValues) {
    $cellRange = 'A' + $sheetRow + ':G' + $sheetRow
    $range = [uri]::EscapeDataString((Format-SheetRange $sheetTitle $cellRange))
    $uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + $sheetId + '/values/' + $range + '?valueInputOption=USER_ENTERED'
    $headers = @{
        Authorization  = 'Bearer ' + $token
        'Content-Type' = 'application/json; charset=utf-8'
    }
    $cells = [object[]]@($rowValues)
    $payload = @{ values = @(,$cells) }
    $body = $payload | ConvertTo-Json -Depth 10 -Compress
    try {
        Invoke-RestMethod -Uri $uri -Headers $headers -Method Put -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) | Out-Null
        return 1
    } catch {
        $detail = Read-GoogleError $_
        throw ('Google Sheets update failed (' + $sheetTitle + ' row ' + $sheetRow + '): ' + $detail)
    }
}

function Process-File($path, $token, $sheetId, $mainTitle, $archiveTitle, $existingUrls, $mainState) {
    $json = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $json -or -not $json.rows) {
        throw 'JSON has no rows array.'
    }

    $added = 0
    $updated = 0
    $skipped = 0
    $mainBatch = New-Object System.Collections.Generic.List[object]
    $archiveBatch = New-Object System.Collections.Generic.List[object]
    $arenaRows = $mainState.ArenaRows
    $nextRow = $mainState.RowCount + 1

    foreach ($item in @($json.rows)) {
        if ($null -eq $item) { continue }
        $archive = Get-ArchiveObject $item
        $url = Get-FieldValue $archive 'assign_url'
        if ($url.Trim() -and (Test-UrlInSet $existingUrls $url)) {
            $skipped++
            continue
        }

        $newMainRow = Build-MainRow $item
        $arenaName = Get-FieldValue $item 'arena_name'
        $venueBase = Get-FieldValue $item 'venue'
        if (-not $venueBase.Trim()) {
            $parts = $arenaName -split '-', 2
            $venueBase = $parts[0]
        }
        $sheetRow = Find-ArenaSheetRow $arenaRows $arenaName $venueBase

        if ($sheetRow -gt 0) {
            $existingRow = $null
            $idx = $sheetRow - 2
            if ($idx -ge 0 -and $idx -lt $mainState.Rows.Count) {
                $existingRow = $mainState.Rows[$idx]
            }
            $mergedRow = Merge-MainRow $existingRow $newMainRow
            Update-MainRow $token $sheetId $mainTitle $sheetRow $mergedRow | Out-Null
            if ($idx -ge 0 -and $idx -lt $mainState.Rows.Count) {
                $mainState.Rows[$idx] = $mergedRow
            }
            Register-ArenaRow $arenaRows ([ref]$nextRow) $arenaName $sheetRow | Out-Null
            $updated++
        } else {
            [void]$mainBatch.Add($newMainRow)
            Register-ArenaRow $arenaRows ([ref]$nextRow) $arenaName $nextRow | Out-Null
            $added++
        }

        if ($archiveTitle) {
            $archiveRow = New-Object System.Collections.Generic.List[string]
            [void]$archiveRow.Add((Get-FieldValue $item 'arena_name'))
            foreach ($col in $ArchiveColumns) {
                if ($col -eq 'arena_name') { continue }
                [void]$archiveRow.Add((Get-FieldValue $archive $col))
            }
            [void]$archiveBatch.Add($archiveRow.ToArray())
        }

        Add-UrlToSet $existingUrls $url
    }

    $mainCount = Append-Rows $token $sheetId $mainTitle $mainBatch.ToArray()
    $archiveCount = 0
    if ($archiveTitle -and $archiveBatch.Count -gt 0) {
        $archiveCount = Append-Rows $token $sheetId $archiveTitle $archiveBatch.ToArray()
    }

    $mainState.RowCount = $nextRow - 1
    return @{ Added = $added; Updated = $updated; Skipped = $skipped; Main = $mainCount; Archive = $archiveCount }
}

New-Item -ItemType Directory -Force -Path $Inbox, $Done | Out-Null

$files = @(Get-ChildItem $Inbox -Filter '*.json' | Sort-Object Name)
if ($files.Count -eq 0) {
    Write-Host ''
    Write-Host 'inbox folder is empty.'
    Write-Host 'Please put your JSON file into:'
    Write-Host $Inbox
    Write-Host ''
    exit 1
}

$config = Read-Config
$token = Get-AccessToken $config
$sheetId = [string]$config.sheet_id
$titles = Get-SheetTitles $token $sheetId $config
Write-Host ('Main sheet: ' + $titles.Main)
if ($titles.Archive) {
    Write-Host ('Archive sheet: ' + $titles.Archive)
} else {
    Write-Host 'Warning: no archive sheet found. Create 工作表2 or set archive_sheet_name in config.json'
}

$existingUrls = Get-ExistingUrls $token $sheetId $titles.Main 'E'
if ($existingUrls.Count -eq 0 -and $titles.Archive) {
    $existingUrls = Get-ExistingUrls $token $sheetId $titles.Archive 'B'
}

$mainState = Get-MainSheetState $token $sheetId $titles.Main
Write-Host ('Main sheet rows loaded: ' + $mainState.RowCount)

$totalAdded = 0
$totalUpdated = 0
$totalSkipped = 0
$hadFailure = $false

foreach ($file in $files) {
    try {
        $result = Process-File $file.FullName $token $sheetId $titles.Main $titles.Archive $existingUrls $mainState
        Move-Item $file.FullName (Join-Path $Done $file.Name) -Force
        Write-Host ('OK ' + $file.Name + ': new ' + $result.Added + ', updated ' + $result.Updated + ', archive ' + $result.Archive + ', skipped ' + $result.Skipped)
        $totalAdded += $result.Added
        $totalUpdated += $result.Updated
        $totalSkipped += $result.Skipped
    } catch {
        $hadFailure = $true
        Write-Host ('FAIL ' + $file.Name + ': ' + $_.Exception.Message)
    }
}

Write-Host ''
Write-Host ('Done. New rows: ' + $totalAdded + ', updated rows: ' + $totalUpdated + ', skipped: ' + $totalSkipped)
if ($hadFailure) { exit 1 }

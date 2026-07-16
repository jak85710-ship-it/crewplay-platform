$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$desktopLabel = ([char]0x684c).ToString() + ([char]0x9762).ToString()
$productKeyword = ([char]0x5546).ToString() + ([char]0x54c1).ToString()
$oneDrive = Join-Path $env:USERPROFILE 'OneDrive'
$desktop = Get-ChildItem $oneDrive -Directory | Where-Object { $_.Name -eq $desktopLabel -or $_.Name -eq 'Desktop' } | Select-Object -First 1
if (-not $desktop) { throw 'Desktop folder not found under OneDrive' }
$sourceRoot = Get-ChildItem $desktop.FullName -Directory | Where-Object { $_.Name -like ('*' + $productKeyword + '*') } | Select-Object -First 1
$map = Get-Content (Join-Path $root 'category-map.json') -Raw -Encoding UTF8 | ConvertFrom-Json

function Get-NameAndPrice {
    param(
        [string]$RawName,
        [int]$FallbackPrice
    )

    $m = [regex]::Match($RawName, '(?<price>\d[\d,]*)\s*$')
    if (-not $m.Success) {
        return [ordered]@{ Name = $RawName; Price = $FallbackPrice }
    }

    $name = $RawName.Substring(0, $m.Index).Trim()
    $name = [regex]::Replace($name, '[\s\-_()\[\]]+$', '')
    $name = ($name -replace '價格', '').Trim()
    $name = [regex]::Replace($name, '[:：]\s*$', '')
    if (-not $name) { $name = $RawName }

    $priceText = $m.Groups['price'].Value -replace ',', ''
    $price = $FallbackPrice
    if ([int]::TryParse($priceText, [ref]$price)) {
        return [ordered]@{ Name = $name; Price = $price }
    }
    return [ordered]@{ Name = $name; Price = $FallbackPrice }
}

if (-not $sourceRoot) { throw 'Source image folder not found' }

$categories = @(@{ id = 'all'; name = ([char]0x5168).ToString() + ([char]0x90e8).ToString() })
$plants = @()

foreach ($entry in $map) {
    $categories += @{ id = $entry.id; name = $entry.folder }
    $srcDir = Join-Path $sourceRoot.FullName $entry.folder
    $destDir = Join-Path $root ("assets\plants\" + $entry.id)
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    if (-not (Test-Path $srcDir)) { continue }

    $i = 0
    Get-ChildItem $srcDir -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png|webp)$' } | Sort-Object Name | ForEach-Object {
        $i++
        $ext = $_.Extension.ToLower()
        $destName = ($entry.id + '_' + $i.ToString('000') + $ext)
        Copy-Item $_.FullName (Join-Path $destDir $destName) -Force
        $rawName = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
        $parsed = Get-NameAndPrice -RawName $rawName -FallbackPrice ([int]$entry.price)
        $displayName = $parsed.Name
        $plants += @{
            id           = ($entry.id + '_' + $i.ToString('000'))
            name         = $displayName
            category     = $entry.id
            categoryName = $entry.folder
            brand        = $entry.brand
            desc         = ($entry.brand + ' - ' + $displayName)
            rarity       = [int]$entry.rarity
            price        = [int]$parsed.Price
            img          = ('assets/plants/' + $entry.id + '/' + $destName)
            emoji        = 'leaf'
        }
    }
}

@{
    source     = $sourceRoot.FullName
    updated    = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    categories = $categories
    plants     = $plants
} | ConvertTo-Json -Depth 6 | Out-File (Join-Path $root 'catalog.json') -Encoding utf8

Write-Host ('Synced ' + $plants.Count + ' plants with ASCII-safe filenames')

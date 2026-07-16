$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$src = Join-Path (Join-Path $env:USERPROFILE 'OneDrive') "桌面\上板配件"
if (-not (Test-Path $src)) { throw "Source folder not found: $src" }

$dst = Join-Path $project 'assets\parts'
New-Item -ItemType Directory -Force -Path $dst | Out-Null

$files = Get-ChildItem $src -Recurse -File | Where-Object { $_.Extension -match '^\.(webp|png|jpg|jpeg)$' } | Sort-Object Name
if ($files.Count -eq 0) { throw 'No accessory images found' }

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

$parts = @()
$parts += [ordered]@{
  id='none'; name='無配件'; desc='保持純粹，讓植物自然呈現'; price=0; visualClass='none-vis'; emoji='○'; previewEmoji=$null; img=$null
}

$i = 0
foreach ($f in $files) {
  $i++
  $id = ('sync_part_' + $i.ToString('000'))
  $rawName = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
  $parsed = Get-NameAndPrice -RawName $rawName -FallbackPrice 0
  $name = $parsed.Name
  $ext = $f.Extension.ToLower()
  $destName = ($id + $ext)
  Copy-Item $f.FullName (Join-Path $dst $destName) -Force

  $parts += [ordered]@{
    id=$id
    name=$name
    desc='上板配件'
    price=[int]$parsed.Price
    visualClass='none-vis'
    emoji='🧩'
    previewEmoji='🧩'
    img=('assets/parts/' + $destName)
  }
  Write-Host ('[PartSync] ' + $destName + ' <= ' + $f.Name)
}

$catalogPath = Join-Path $project 'catalog.json'
$catalog = Get-Content $catalogPath -Raw -Encoding UTF8 | ConvertFrom-Json
$catalog | Add-Member -NotePropertyName parts -NotePropertyValue $parts -Force
$catalog.updated = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
$catalog | ConvertTo-Json -Depth 8 | Set-Content $catalogPath -Encoding UTF8

Write-Host ('Synced ' + ($parts.Count - 1) + ' accessories')


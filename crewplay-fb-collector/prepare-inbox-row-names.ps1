# Map photos-inbox/a{row}.jpg.* -> photos-inbox/{row}.{ext} for convert-upload-photos.ps1
$ErrorActionPreference = 'Stop'
$InboxDir = Join-Path $PSScriptRoot 'storage/photos-inbox'
$mapped = @()

Get-ChildItem $InboxDir -File | ForEach-Object {
    if ($_.Name -eq '.gitkeep') { return }
    if ($_.Name -match '^a(\d+)\.jpg\.(.+)$') {
        $row = $Matches[1]
        $ext = $Matches[2].ToLower()
        if ($ext -eq 'jpeg') { $ext = 'jpg' }
        $dest = Join-Path $InboxDir ($row + '.' + $ext)
        Copy-Item $_.FullName $dest -Force
        $mapped += [PSCustomObject]@{ row = [int]$row; from = $_.Name; to = (Split-Path $dest -Leaf) }
    } elseif ($_.Name -match '^a(\d+)\.jpg \(\d+\)\.(.+)$') {
        $row = $Matches[1]
        $ext = $Matches[2].ToLower()
        if ($ext -eq 'jpeg') { $ext = 'jpg' }
        $dest = Join-Path $InboxDir ($row + '.' + $ext)
        Copy-Item $_.FullName $dest -Force
        $mapped += [PSCustomObject]@{ row = [int]$row; from = $_.Name; to = (Split-Path $dest -Leaf) }
    } elseif ($_.Name -match '^(\d+)\.jpg\.jpg$') {
        $row = $Matches[1]
        $dest = Join-Path $InboxDir ($row + '.jpg')
        Copy-Item $_.FullName $dest -Force
        $mapped += [PSCustomObject]@{ row = [int]$row; from = $_.Name; to = (Split-Path $dest -Leaf) }
    } elseif ($_.Name -match '^(\d+)\.(jpg|jpeg|png|webp|gif|bmp)$') {
        $mapped += [PSCustomObject]@{ row = [int]$Matches[1]; from = $_.Name; to = $_.Name; note = 'already row name' }
    }
}

Write-Host ('Mapped ' + $mapped.Count + ' inbox files to row-based names.')
$mapped | Sort-Object row | Format-Table -AutoSize

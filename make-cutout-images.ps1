$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$proj = $PSScriptRoot
$catalogPath = Join-Path $proj 'catalog.json'
if (-not (Test-Path $catalogPath)) {
  throw "catalog.json not found: $catalogPath"
}

$catalog = Get-Content $catalogPath -Raw -Encoding UTF8 | ConvertFrom-Json
$ok = 0
$fail = 0
foreach ($plant in $catalog.plants) {
  if (-not $plant.img) { continue }
  $src = Join-Path $proj $plant.img
  if (-not (Test-Path $src)) {
    $fail++
    Write-Host "[MISS] $($plant.img)"
    continue
  }

  $dst = [System.IO.Path]::Combine(
    [System.IO.Path]::GetDirectoryName($src),
    ([System.IO.Path]::GetFileNameWithoutExtension($src) + ".cut.png")
  )

  try {
    $srcBmp = New-Object System.Drawing.Bitmap($src)
    try {
      $w = $srcBmp.Width
      $h = $srcBmp.Height
      $bg1 = $srcBmp.GetPixel(0, 0)
      $bg2 = $srcBmp.GetPixel($w - 1, 0)
      $bg3 = $srcBmp.GetPixel(0, $h - 1)
      $bg4 = $srcBmp.GetPixel($w - 1, $h - 1)

      $r = [int](($bg1.R + $bg2.R + $bg3.R + $bg4.R) / 4)
      $g = [int](($bg1.G + $bg2.G + $bg3.G + $bg4.G) / 4)
      $b = [int](($bg1.B + $bg2.B + $bg3.B + $bg4.B) / 4)
      # Conservative tolerance: reduce accidental plant erosion
      $tol = 20

      $lowR = [Math]::Max(0, $r - $tol)
      $lowG = [Math]::Max(0, $g - $tol)
      $lowB = [Math]::Max(0, $b - $tol)
      $highR = [Math]::Min(255, $r + $tol)
      $highG = [Math]::Min(255, $g + $tol)
      $highB = [Math]::Min(255, $b + $tol)

      $low = [System.Drawing.Color]::FromArgb(255, $lowR, $lowG, $lowB)
      $high = [System.Drawing.Color]::FromArgb(255, $highR, $highG, $highB)

      $outBmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try {
        $g2 = [System.Drawing.Graphics]::FromImage($outBmp)
        try {
          $ia = New-Object System.Drawing.Imaging.ImageAttributes
          $ia.SetColorKey($low, $high)
          $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
          $g2.DrawImage($srcBmp, $rect, 0, 0, $w, $h, [System.Drawing.GraphicsUnit]::Pixel, $ia)
        } finally {
          $g2.Dispose()
        }
        $outBmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
      } finally {
        $outBmp.Dispose()
      }
    } finally {
      $srcBmp.Dispose()
    }
    $ok++
    Write-Host "[OK] $([System.IO.Path]::GetFileName($dst))"
  } catch {
    $fail++
    Write-Host "[FAIL] $($plant.img) - $($_.Exception.Message)"
  }
}

Write-Host "DONE ok=$ok fail=$fail"

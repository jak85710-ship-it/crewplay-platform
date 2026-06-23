$port = 8080
$syncScript = Join-Path $PSScriptRoot "sync-catalog.ps1"
$lastSyncAt = [DateTime]::MinValue

function Sync-CatalogIfNeeded {
    param([switch]$Force)
    if (-not (Test-Path $syncScript -PathType Leaf)) { return }

    $desktopLabel = ([char]0x684c).ToString() + ([char]0x9762).ToString()
    $productKeyword = ([char]0x5546).ToString() + ([char]0x54c1).ToString()
    $oneDrive = Join-Path $env:USERPROFILE "OneDrive"
    if (-not (Test-Path $oneDrive)) { return }

    $desktop = Get-ChildItem $oneDrive -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq $desktopLabel -or $_.Name -eq "Desktop" } | Select-Object -First 1
    if (-not $desktop) { return }

    $sourceRoot = Get-ChildItem $desktop.FullName -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like ("*" + $productKeyword + "*") } | Select-Object -First 1
    if (-not $sourceRoot) { return }

    $latest = (Get-ChildItem $sourceRoot.FullName -Recurse -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
    if (-not $latest) { return }

    if ($Force -or $latest -gt $lastSyncAt) {
        try {
            & powershell -ExecutionPolicy Bypass -File $syncScript | Out-Null
            $script:lastSyncAt = $latest
            Write-Host ("[AutoSync] catalog updated at " + (Get-Date).ToString("HH:mm:ss"))
        } catch {
            Write-Host ("[AutoSync] failed: " + $_.Exception.Message)
        }
    }
}

Sync-CatalogIfNeeded -Force
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
$listener.Start()
Write-Host "Server successfully started directly on your machine!"
Write-Host "Please open this URL in your browser: http://localhost:$port"
while ($true) {
    Sync-CatalogIfNeeded
    if (!$listener.Pending()) { Start-Sleep -Milliseconds 100; continue }
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream)
    $req = $reader.ReadLine()
    if ($null -eq $req -or $req.Trim() -eq "") { $client.Close(); continue }
    
    $path = $req.Split(' ')[1].TrimStart('/')
    $path = $path.Split('?')[0]
    if ($path -eq '') { $path = 'index.html' }

    try {
        $path = [System.Uri]::UnescapeDataString($path)
    } catch {}

    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $path))
    $rootFull = [System.IO.Path]::GetFullPath($PSScriptRoot)
    if (-not $fullPath.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
        $fullPath = Join-Path $PSScriptRoot 'index.html'
    }
    
    $mimeMap = @{
        '.html' = 'text/html; charset=utf-8'
        '.css'  = 'text/css; charset=utf-8'
        '.js'   = 'application/javascript; charset=utf-8'
        '.png'  = 'image/png'
        '.jpg'  = 'image/jpeg'
        '.jpeg' = 'image/jpeg'
        '.webp' = 'image/webp'
        '.json' = 'application/json; charset=utf-8'
        '.svg'  = 'image/svg+xml; charset=utf-8'
    }
    $ext = [System.IO.Path]::GetExtension($fullPath)
    $ct = if ($mimeMap[$ext]) { $mimeMap[$ext] } else { 'application/octet-stream' }
    
    $writer = [System.IO.StreamWriter]::new($stream)
    if (Test-Path $fullPath -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $writer.WriteLine("HTTP/1.1 200 OK")
        $writer.WriteLine("Content-Type: $ct")
        $writer.WriteLine("Content-Length: $($bytes.Length)")
        $writer.WriteLine("Access-Control-Allow-Origin: *")
        $writer.WriteLine("Connection: close")
        $writer.WriteLine("")
        $writer.Flush()
        $stream.Write($bytes, 0, $bytes.Length)
    } else {
        $writer.WriteLine("HTTP/1.1 404 Not Found")
        $writer.WriteLine("Content-Length: 9")
        $writer.WriteLine("Connection: close")
        $writer.WriteLine("")
        $writer.Write("Not Found")
        $writer.Flush()
    }
    $client.Close()
}

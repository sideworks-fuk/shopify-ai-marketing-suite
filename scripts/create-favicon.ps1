# Create favicon.ico from a PNG and place Next.js App Router icons
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/create-favicon.ps1

param(
    [string]$Src = "icon.png",
    [string]$DstIco = "frontend/public/favicon.ico",
    [string]$DstAppIcon = "frontend/src/app/icon.png"
)

Write-Host "Source: $Src"
if (-not (Test-Path $Src)) {
    Write-Error "Source PNG not found: $Src"
    exit 1
}

# Ensure target folders exist
$publicDir = Split-Path $DstIco -Parent
$appDir = Split-Path $DstAppIcon -Parent
if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Path $publicDir | Out-Null }
if (-not (Test-Path $appDir)) { New-Item -ItemType Directory -Path $appDir | Out-Null }

# Copy App Router icon.png (Next.js will auto-generate link tags)
Copy-Item -Path $Src -Destination $DstAppIcon -Force
Write-Host "App icon placed: $DstAppIcon"

# Create 32x32 favicon.ico from PNG
Add-Type -AssemblyName System.Drawing
$srcBmp = [System.Drawing.Bitmap]::FromFile($Src)
try {
    $size = 32
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($srcBmp, 0, 0, $size, $size)
    } finally {
        $g.Dispose()
    }

    $hIcon = $bmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    try {
        $fs = [System.IO.File]::Create($DstIco)
        try { $icon.Save($fs) } finally { $fs.Dispose() }
        Write-Host "Favicon created: $DstIco"
    } finally {
        $icon.Dispose()
        $bmp.Dispose()
    }
} finally {
    $srcBmp.Dispose()
}

Write-Host "Done."



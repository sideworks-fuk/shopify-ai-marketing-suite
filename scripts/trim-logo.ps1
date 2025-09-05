param(
  [string]$Src = "logo.png",
  [string]$Dst = "logo-trimmed.png",
  [ValidateSet("alpha","white")][string]$Mode = "alpha",
  [int]$PaddingPx = 4,
  [int]$WhiteThreshold = 245,   # Mode=white のみ使用（0..255）
  [int]$TargetHeight = 0        # 0=リサイズなし。例: 64 で高さ64pxに
)
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $Src)) { Write-Error "Source not found: $Src"; exit 1 }
$bmp = [System.Drawing.Bitmap]::FromFile($Src)
try {
  $minX=$bmp.Width; $minY=$bmp.Height; $maxX=-1; $maxY=-1
  for ($y=0; $y -lt $bmp.Height; $y++) {
    for ($x=0; $x -lt $bmp.Width; $x++) {
      $c = $bmp.GetPixel($x,$y)
      $isContent = $false
      if ($Mode -eq "alpha") {
        $isContent = ($c.A -gt 0)
      } else {
        # ほぼ白なら余白扱い、閾値は可変
        $isWhite = ($c.R -ge $WhiteThreshold -and $c.G -ge $WhiteThreshold -and $c.B -ge $WhiteThreshold)
        $isContent = -not $isWhite
      }
      if ($isContent) {
        if ($x -lt $minX) { $minX=$x }
        if ($y -lt $minY) { $minY=$y }
        if ($x -gt $maxX) { $maxX=$x }
        if ($y -gt $maxY) { $maxY=$y }
      }
    }
  }
  if ($maxX -lt 0 -or $maxY -lt 0) { Write-Error "Content not found. Check Mode/Threshold."; exit 1 }

  $minX = [math]::Max(0, $minX - $PaddingPx)
  $minY = [math]::Max(0, $minY - $PaddingPx)
  $maxX = [math]::Min($bmp.Width-1,  $maxX + $PaddingPx)
  $maxY = [math]::Min($bmp.Height-1, $maxY + $PaddingPx)

  $cropW = $maxX - $minX + 1
  $cropH = $maxY - $minY + 1

  $crop = New-Object System.Drawing.Bitmap $cropW, $cropH
  $g = [System.Drawing.Graphics]::FromImage($crop)
  try {
    $srcRect = New-Object System.Drawing.Rectangle $minX,$minY,$cropW,$cropH
    $g.DrawImage($bmp, 0,0, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  } finally { $g.Dispose() }

  $outBmp = $crop
  if ($TargetHeight -gt 0) {
    $newW = [int]([double]$cropW * $TargetHeight / [double]$cropH)
    $resized = New-Object System.Drawing.Bitmap $newW, $TargetHeight
    $g2 = [System.Drawing.Graphics]::FromImage($resized)
    try { $g2.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $g2.DrawImage($crop, 0,0,$newW,$TargetHeight) }
    finally { $g2.Dispose() }
    $outBmp.Dispose()
    $outBmp = $resized
  }

  $dstDir = Split-Path $Dst -Parent
  if ($dstDir -and -not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir | Out-Null }
  $outBmp.Save($Dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $outBmp.Dispose()
  Write-Host "Saved -> $Dst"
} finally { $bmp.Dispose() }
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$assetDir = Join-Path $root 'public\prd\genuine-game-distribution-phase1\developer-backend-final\03'
$sources = Get-ChildItem -LiteralPath $assetDir -File -Filter '03-v20-*-feishu.png' | Sort-Object Name

if ($sources.Count -ne 19) {
    throw "Expected 19 v20 source images, got $($sources.Count)."
}

Add-Type -AssemblyName System.Drawing

function Get-PngMetadata {
    param([Parameter(Mandatory)][string]$Path)

    $bytes = [IO.File]::ReadAllBytes($Path)
    $chunks = [Collections.Generic.List[string]]::new()
    $offset = 8
    while ($offset + 12 -le $bytes.Length) {
        $length = [Net.IPAddress]::NetworkToHostOrder([BitConverter]::ToInt32($bytes, $offset))
        $type = [Text.Encoding]::ASCII.GetString($bytes, $offset + 4, 4)
        $chunks.Add($type)
        $offset += 12 + $length
        if ($type -eq 'IEND') { break }
    }

    return [PSCustomObject]@{
        Width = [Net.IPAddress]::NetworkToHostOrder([BitConverter]::ToInt32($bytes, 16))
        Height = [Net.IPAddress]::NetworkToHostOrder([BitConverter]::ToInt32($bytes, 20))
        BitDepth = $bytes[24]
        ColorType = $bytes[25]
        Chunks = @($chunks | Select-Object -Unique)
        Bytes = $bytes.Length
    }
}

$results = foreach ($source in $sources) {
    $targetName = $source.Name.Replace('03-v20-', '03-v21-')
    $targetPath = Join-Path $assetDir $targetName
    $sourceImage = [Drawing.Image]::FromFile($source.FullName)
    try {
        $targetWidth = if ($source.Name -eq '03-v20-release-flow-feishu.png') {
            1760
        } else {
            [Math]::Min(1200, $sourceImage.Width)
        }
        $targetHeight = [int][Math]::Round($sourceImage.Height * $targetWidth / $sourceImage.Width)
        $bitmap = [Drawing.Bitmap]::new(
            $targetWidth,
            $targetHeight,
            [Drawing.Imaging.PixelFormat]::Format32bppArgb
        )
        try {
            $graphics = [Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.Clear([Drawing.Color]::White)
                $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
                $graphics.DrawImage($sourceImage, 0, 0, $targetWidth, $targetHeight)
            } finally {
                $graphics.Dispose()
            }
            $bitmap.Save($targetPath, [Drawing.Imaging.ImageFormat]::Png)
        } finally {
            $bitmap.Dispose()
        }
    } finally {
        $sourceImage.Dispose()
    }

    $metadata = Get-PngMetadata -Path $targetPath
    foreach ($requiredChunk in 'sRGB', 'gAMA', 'pHYs') {
        if ($requiredChunk -notin $metadata.Chunks) {
            throw "$targetName is missing PNG chunk $requiredChunk."
        }
    }
    if ($metadata.BitDepth -ne 8 -or $metadata.ColorType -ne 6) {
        throw "$targetName has unexpected PNG encoding: bit depth $($metadata.BitDepth), color type $($metadata.ColorType)."
    }

    [PSCustomObject]@{
        Name = $targetName
        Width = $metadata.Width
        Height = $metadata.Height
        Bytes = $metadata.Bytes
        Encoding = 'RGBA8+sRGB/gAMA/pHYs'
    }
}

$results | Format-Table -AutoSize
Write-Host "Prepared $($results.Count) v21 Feishu images."

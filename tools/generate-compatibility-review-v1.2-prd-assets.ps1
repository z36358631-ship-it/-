[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Add-Type -AssemblyName System.Drawing

function ConvertFrom-CodePoints {
    param(
        [Parameter(Mandatory = $true)]
        [int[]] $CodePoints
    )

    return -join ($CodePoints | ForEach-Object { [char] $_ })
}

function Get-FittedRectangle {
    param(
        [Parameter(Mandatory = $true)]
        [int] $ImageWidth,

        [Parameter(Mandatory = $true)]
        [int] $ImageHeight,

        [Parameter(Mandatory = $true)]
        [System.Drawing.Rectangle] $Bounds
    )

    $scale = [Math]::Min(
        $Bounds.Width / [double] $ImageWidth,
        $Bounds.Height / [double] $ImageHeight
    )
    $width = [Math]::Max(1, [int] [Math]::Round($ImageWidth * $scale))
    $height = [Math]::Max(1, [int] [Math]::Round($ImageHeight * $scale))
    $x = $Bounds.X + [int] [Math]::Floor(($Bounds.Width - $width) / 2)
    $y = $Bounds.Y + [int] [Math]::Floor(($Bounds.Height - $height) / 2)

    return [System.Drawing.Rectangle]::new($x, $y, $width, $height)
}

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$sourceDirectory = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot 'test-results\compatibility-review-v1.2'))
$safePrdRoot = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot 'public\prd'))
$expectedOutputDirectory = [System.IO.Path]::GetFullPath((Join-Path $safePrdRoot 'compatibility-review-v1.2'))
$outputDirectory = $expectedOutputDirectory

$safePrefix = $safePrdRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
if (-not $outputDirectory.StartsWith($safePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe output directory outside public/prd: $outputDirectory"
}
if (-not [System.StringComparer]::OrdinalIgnoreCase.Equals($outputDirectory, $expectedOutputDirectory)) {
    throw "Unexpected output directory: $outputDirectory"
}

$assetMap = [ordered]@{
    '01-c-game-detail-wireframe-390x844.png'          = 'c01-game-detail.png'
    '11-c-guest-review-states-390x844.png'           = 'c02-review-list.png'
    '03-c-solution-detail-390x844.png'                = 'c03-config-detail.png'
    '06-c-gameplay-device-1440x900.png'               = 'c04-game-running.png'
    '07-c-exit-confirm-device-1440x900.png'           = 'c05-exit-confirm.png'
    '08-c-proactive-review-390x844.png'                = 'c06-review-dialog.png'
    '09-c-my-linked-review-390x844.png'                = 'c07-my-review.png'
    '10-b-linked-filter-solution-drawer-1440x900.png' = 'b01-review-snapshot.png'
}

$flowFileName = 'flow-compatibility-review-v1.2.png'
$expectedFileNames = @($assetMap.Values) + $flowFileName

foreach ($sourceFileName in $assetMap.Keys) {
    $sourcePath = Join-Path $sourceDirectory $sourceFileName
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Missing source image: $sourcePath"
    }
}

if (Test-Path -LiteralPath $outputDirectory -PathType Container) {
    $unexpectedPngFiles = Get-ChildItem -LiteralPath $outputDirectory -Filter '*.png' -File |
        Where-Object { $_.Name -notin $expectedFileNames }
    if ($unexpectedPngFiles) {
        $unexpectedList = ($unexpectedPngFiles.Name | Sort-Object) -join ', '
        throw "Output directory contains unexpected PNG files; no files were deleted: $unexpectedList"
    }
}
else {
    [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
}

foreach ($entry in $assetMap.GetEnumerator()) {
    $sourcePath = Join-Path $sourceDirectory $entry.Key
    $destinationPath = Join-Path $outputDirectory $entry.Value
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
}

$steps = @(
    @{ Title = '1 ' + (ConvertFrom-CodePoints @(0x6E38, 0x620F, 0x8BE6, 0x60C5)); File = 'c01-game-detail.png' },
    @{ Title = '2 ' + (ConvertFrom-CodePoints @(0x67E5, 0x770B, 0x8BC4, 0x4EF7)); File = 'c02-review-list.png' },
    @{ Title = '3 ' + (ConvertFrom-CodePoints @(0x5E94, 0x7528, 0x914D, 0x7F6E)); File = 'c03-config-detail.png' },
    @{ Title = '4 ' + (ConvertFrom-CodePoints @(0x542F, 0x52A8, 0x6E38, 0x620F)); File = 'c04-game-running.png' },
    @{ Title = '5 ' + (ConvertFrom-CodePoints @(0x9000, 0x51FA, 0x6E38, 0x620F)); File = 'c05-exit-confirm.png' },
    @{ Title = '6 ' + (ConvertFrom-CodePoints @(0x63D0, 0x4EA4, 0x8BC4, 0x4EF7)); File = 'c06-review-dialog.png' },
    @{ Title = '7 ' + (ConvertFrom-CodePoints @(0x67E5, 0x770B, 0x6211, 0x7684, 0x8BC4, 0x4EF7)); File = 'c07-my-review.png' }
)

$canvasWidth = 3040
$canvasHeight = 940
$cardWidth = 360
$cardHeight = 780
$cardTop = 80
$cardLeft = 50
$cardGap = 70
$headerHeight = 68
$imagePadding = 12

$canvas = $null
$graphics = $null
$backgroundBrush = $null
$cardBrush = $null
$shadowBrush = $null
$borderPen = $null
$dividerPen = $null
$arrowPen = $null
$arrowBrush = $null
$titleBrush = $null
$titleFont = $null
$titleFormat = $null

try {
    $canvas = [System.Drawing.Bitmap]::new($canvasWidth, $canvasHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $canvas.SetResolution(144, 144)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    $backgroundBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(246, 247, 249))
    $cardBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(26, 20, 28, 40))
    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(216, 220, 226), 2)
    $dividerPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(232, 235, 240), 2)
    $arrowPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(79, 89, 105), 5)
    $arrowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(79, 89, 105))
    $titleBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(24, 28, 36))
    $titleFont = [System.Drawing.Font]::new('Microsoft YaHei', 30, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $titleFormat = [System.Drawing.StringFormat]::new()
    $titleFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $titleFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

    $graphics.FillRectangle($backgroundBrush, 0, 0, $canvasWidth, $canvasHeight)

    for ($index = 0; $index -lt $steps.Count; $index++) {
        $x = $cardLeft + ($index * ($cardWidth + $cardGap))
        $cardRectangle = [System.Drawing.Rectangle]::new($x, $cardTop, $cardWidth, $cardHeight)
        $shadowRectangle = [System.Drawing.Rectangle]::new($x + 6, $cardTop + 8, $cardWidth, $cardHeight)
        $graphics.FillRectangle($shadowBrush, $shadowRectangle)
        $graphics.FillRectangle($cardBrush, $cardRectangle)
        $graphics.DrawRectangle($borderPen, $cardRectangle)

        $titleRectangle = [System.Drawing.RectangleF]::new(
            [single] ($x + 8),
            [single] ($cardTop + 4),
            [single] ($cardWidth - 16),
            [single] ($headerHeight - 8)
        )
        $graphics.DrawString($steps[$index].Title, $titleFont, $titleBrush, $titleRectangle, $titleFormat)
        $graphics.DrawLine(
            $dividerPen,
            $x + $imagePadding,
            $cardTop + $headerHeight,
            $x + $cardWidth - $imagePadding,
            $cardTop + $headerHeight
        )

        $imageBounds = [System.Drawing.Rectangle]::new(
            $x + $imagePadding,
            $cardTop + $headerHeight + $imagePadding,
            $cardWidth - (2 * $imagePadding),
            $cardHeight - $headerHeight - (2 * $imagePadding)
        )
        $imagePath = Join-Path $outputDirectory $steps[$index].File
        $stepImage = $null
        try {
            $stepImage = [System.Drawing.Image]::FromFile($imagePath)
            $destinationRectangle = Get-FittedRectangle -ImageWidth $stepImage.Width -ImageHeight $stepImage.Height -Bounds $imageBounds
            $graphics.DrawImage($stepImage, $destinationRectangle)
        }
        finally {
            if ($null -ne $stepImage) {
                $stepImage.Dispose()
            }
        }

        if ($index -lt ($steps.Count - 1)) {
            $nextCardX = $cardLeft + (($index + 1) * ($cardWidth + $cardGap))
            $centerY = $cardTop + [int] ($cardHeight / 2)
            $lineStartX = $x + $cardWidth + 12
            $arrowTipX = $nextCardX - 12
            $graphics.DrawLine($arrowPen, $lineStartX, $centerY, $arrowTipX - 14, $centerY)
            $arrowPoints = [System.Drawing.Point[]] @(
                [System.Drawing.Point]::new($arrowTipX, $centerY),
                [System.Drawing.Point]::new($arrowTipX - 18, $centerY - 12),
                [System.Drawing.Point]::new($arrowTipX - 18, $centerY + 12)
            )
            $graphics.FillPolygon($arrowBrush, $arrowPoints)
        }
    }

    $flowPath = Join-Path $outputDirectory $flowFileName
    $canvas.Save($flowPath, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
    foreach ($disposable in @(
        $titleFormat,
        $titleFont,
        $titleBrush,
        $arrowBrush,
        $arrowPen,
        $dividerPen,
        $borderPen,
        $shadowBrush,
        $cardBrush,
        $backgroundBrush,
        $graphics,
        $canvas
    )) {
        if ($null -ne $disposable) {
            $disposable.Dispose()
        }
    }
}

$outputFiles = Get-ChildItem -LiteralPath $outputDirectory -Filter '*.png' -File | Sort-Object Name
if ($outputFiles.Count -ne $expectedFileNames.Count) {
    throw "Expected $($expectedFileNames.Count) PNG files but found $($outputFiles.Count)."
}

foreach ($expectedFileName in $expectedFileNames) {
    $outputFile = Get-Item -LiteralPath (Join-Path $outputDirectory $expectedFileName)
    if ($outputFile.Length -le 0) {
        throw "Generated empty image: $($outputFile.FullName)"
    }
}

$outputFiles | Select-Object Name, Length, FullName

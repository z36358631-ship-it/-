param(
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$outputsRoot = Join-Path $workspace "_outputs"
$sourceDir = Get-ChildItem -LiteralPath $outputsRoot -Directory | ForEach-Object {
  $candidate = Get-ChildItem -LiteralPath $_.FullName -Recurse -File -Filter "*.png" -ErrorAction SilentlyContinue
  if ($candidate.Count -eq 45 -and ($candidate.Name -match '^01-').Count -eq 1 -and ($candidate.Name -match '^45-').Count -eq 1) {
    $candidate[0].Directory.FullName
  }
} | Select-Object -First 1
if (-not $sourceDir) { throw "A directory containing the 45 V6.1.1 PNG files was not found under _outputs." }
if (-not $OutputPath) {
  $OutputPath = Join-Path $PSScriptRoot "..\assets\source-manifest.json"
}

Add-Type -AssemblyName System.Drawing

$figmaPath = Join-Path $PSScriptRoot "..\assets\figma-pages.json"
$figmaPages = @((Get-Content -Raw -Encoding UTF8 -LiteralPath $figmaPath | ConvertFrom-Json) | ForEach-Object { $_ })

function Get-Category([int]$index) {
  if ($index -le 7) { return "onboarding-auth" }
  if ($index -le 10) { return "home-discovery" }
  if ($index -le 17) { return "play-ranking" }
  if ($index -le 29) { return "library-management" }
  if ($index -le 35) { return "profile-system" }
  return "handheld-landscape"
}

$screens = @()
$files = Get-ChildItem -LiteralPath $sourceDir -File -Filter "*.png" | Sort-Object Name
foreach ($file in $files) {
  if ($file.BaseName -notmatch '^(\d{2})-') { continue }
  $index = [int]$Matches[1]
  $image = [System.Drawing.Image]::FromFile($file.FullName)
  try {
    $width = $image.Width
    $height = $image.Height
  } finally {
    $image.Dispose()
  }
  $relative = $file.FullName.Substring($workspace.Length + 1).Replace('\','/')
  $screens += [ordered]@{
    id = "screen-{0:d2}" -f $index
    index = $index
    name = $file.Name
    path = $relative
    width = $width
    height = $height
    orientation = if ($width -gt $height) { "landscape" } else { "portrait" }
    category = Get-Category $index
    disposition = "page-recipe+component-evidence"
    productVersion = "V6.1.1"
    sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
  }
}

$manifest = [ordered]@{
  schemaVersion = 1
  product = "GameHub APP"
  platform = "app"
  sourceAuditedAt = "2026-08-14"
  workspaceRelativeSourceRoot = $sourceDir.Substring($workspace.Length + 1).Replace('\','/')
  figma = [ordered]@{
    fileKey = "MZmfinxCqrfQUlDou1uB1N"
    fileName = "GH portrait 6.0.1 and later"
    apiCredentialPolicy = "Do not store tokens. Use a currently authorized browser session or user-provided export."
    pages = $figmaPages
  }
  deviceScreens = $screens
}

$json = $manifest | ConvertTo-Json -Depth 12
$parent = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $parent | Out-Null
[System.IO.File]::WriteAllText($OutputPath, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
Write-Output "WROTE $OutputPath"
Write-Output "Figma pages: $($figmaPages.Count)"
Write-Output "Device screens: $($screens.Count)"

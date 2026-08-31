[CmdletBinding()]
param(
    [string]$SkillPath,
    [string]$InstalledPath
)

$ErrorActionPreference = 'Stop'

if (-not $SkillPath) {
    $scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
    $SkillPath = Split-Path -Parent $scriptDirectory
}

$requiredFiles = @(
    'SKILL.md',
    'references/MERGED-PRD-TEMPLATE.md',
    'references/PRD-QUALITY-STANDARD.md',
    'references/PRD-QUALITY-PATTERNS.md',
    'references/FEISHU-MARKDOWN-IMAGES.md',
    'scripts/validate-prd-images.ps1',
    'scripts/validate-prd-quality.ps1',
    'scripts/validate-skill-package.ps1'
)

$mojibakeMarkers = @(
    [char]0xFFFD,
    (-join @([char]0x95C7, [char]0x20AC)),
    (-join @([char]0x9428, [char]0x52EB)),
    (-join @([char]0x951F, [char]0x65A4, [char]0x62F7))
)

$textExtensions = @('.md', '.ps1', '.yaml', '.yml', '.json', '.txt')
$utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
$errors = New-Object System.Collections.Generic.List[string]

function Get-NormalizedRoot {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        return $null
    }

    return (Resolve-Path -LiteralPath $Path).Path.TrimEnd('\', '/')
}

$sourceRoot = Get-NormalizedRoot -Path $SkillPath
if (-not $sourceRoot) {
    $errors.Add("SKILL_PATH_NOT_FOUND: $SkillPath")
}

if ($sourceRoot) {
    foreach ($relative in $requiredFiles) {
        $fullPath = Join-Path $sourceRoot $relative
        if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
            $errors.Add("MISSING_REQUIRED_FILE: $relative")
        }
    }

    Get-ChildItem -LiteralPath $sourceRoot -Recurse -File | Where-Object {
        $textExtensions -contains $_.Extension.ToLowerInvariant()
    } | ForEach-Object {
        $relative = $_.FullName.Substring($sourceRoot.Length).TrimStart('\', '/').Replace('\', '/')
        try {
            $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
            $text = $utf8Strict.GetString($bytes)
        }
        catch {
            $errors.Add("INVALID_UTF8: $relative")
            return
        }

        foreach ($marker in $mojibakeMarkers) {
            if ($text.Contains([string]$marker)) {
                $errors.Add("MOJIBAKE: $relative contains '$marker'")
            }
        }
    }
}

if ($InstalledPath) {
    $installedRoot = Get-NormalizedRoot -Path $InstalledPath
    if (-not $installedRoot) {
        $errors.Add("INSTALLED_PATH_NOT_FOUND: $InstalledPath")
    }
    elseif ($sourceRoot) {
        foreach ($relative in $requiredFiles) {
            $sourceFile = Join-Path $sourceRoot $relative
            $installedFile = Join-Path $installedRoot $relative

            if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
                continue
            }
            if (-not (Test-Path -LiteralPath $installedFile -PathType Leaf)) {
                $errors.Add("INSTALLED_MISSING_FILE: $relative")
                continue
            }

            $sourceHash = (Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256).Hash
            $installedHash = (Get-FileHash -LiteralPath $installedFile -Algorithm SHA256).Hash
            if ($sourceHash -ne $installedHash) {
                $errors.Add("HASH_MISMATCH: $relative")
            }
        }
    }
}

if ($errors.Count -gt 0) {
    $errors | Sort-Object -Unique | ForEach-Object { Write-Error $_ }
    exit 1
}

[PSCustomObject]@{
    status = 'PASS'
    skillPath = $sourceRoot
    installedPath = if ($InstalledPath) { (Get-NormalizedRoot -Path $InstalledPath) } else { $null }
    requiredFiles = $requiredFiles.Count
} | ConvertTo-Json -Compress


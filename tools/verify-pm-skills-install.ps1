param(
    [string]$InstalledRoot = 'C:\Users\z3635\.codex\skills',
    [string]$WorkspaceToPrd = '.agents\skills\to-prd',
    [string]$OutputPath = 'test-results\pm-skills-install\verification.json'
)

$ErrorActionPreference = 'Stop'
$InstalledRoot = [System.IO.Path]::GetFullPath($InstalledRoot)
$WorkspaceToPrd = (Resolve-Path -LiteralPath $WorkspaceToPrd).Path

$expected = @(
    'pm-master',
    'pm-analytics',
    'pm-competitor-deconstructor',
    'pm-experiment-designer',
    'pm-image2pencil',
    'pm-image2proto',
    'pm-postmortem-writer',
    'pm-prd-writer',
    'pm-prioritization-engine',
    'pm-review-board',
    'pm-roadmap-planner',
    'pm-survey-designer',
    'pm-tracking-spec-writer',
    'pm-url2proto',
    'pm-advisory-board',
    'pm-advisor-cagan',
    'pm-advisor-torres',
    'pm-advisor-yujun',
    'pm-method-build-trap',
    'pm-method-mom-test',
    'pm-method-story-mapping'
)

$excluded = @('space-image2proto', 'space-url2proto')
$checks = [System.Collections.Generic.List[object]]::new()

function Add-Check {
    param(
        [string]$Name,
        [bool]$Passed,
        [string]$Detail
    )

    $checks.Add([PSCustomObject]@{
        name = $Name
        passed = $Passed
        detail = $Detail
    })
}

foreach ($skill in $expected) {
    $skillPath = Join-Path $InstalledRoot $skill
    $skillFile = Join-Path $skillPath 'SKILL.md'
    Add-Check "installed:$skill" (Test-Path -LiteralPath $skillFile) $skillFile

    if (Test-Path -LiteralPath $skillFile) {
        $lines = Get-Content -Encoding utf8 -LiteralPath $skillFile
        $nameLine = $lines | Where-Object { $_ -match '^name:\s*(.+)$' } | Select-Object -First 1
        $actualName = if ($nameLine -and $nameLine -match '^name:\s*(.+)$') {
            $Matches[1].Trim()
        } else {
            ''
        }
        Add-Check "frontmatter-name:$skill" ($actualName -eq $skill) "expected=$skill actual=$actualName"
    }
}

foreach ($skill in $excluded) {
    $skillPath = Join-Path $InstalledRoot $skill
    Add-Check "excluded:$skill" (-not (Test-Path -LiteralPath $skillPath)) $skillPath
}

$bridge = Join-Path $InstalledRoot 'pm-prd-writer\SKILL.md'
if (Test-Path -LiteralPath $bridge) {
    $bridgeText = Get-Content -Raw -Encoding utf8 -LiteralPath $bridge
    Add-Check 'bridge:reads-to-prd' ($bridgeText.Contains('../to-prd/SKILL.md')) '../to-prd/SKILL.md'
    Add-Check 'bridge:no-second-template' (-not $bridgeText.Contains('references/prd-template.md')) 'no independent PRD template'
}

$globalToPrd = Join-Path $InstalledRoot 'to-prd'
$globalFiles = @{}
$workspaceFiles = @{}

Get-ChildItem -File -Recurse -LiteralPath $globalToPrd | ForEach-Object {
    $relative = $_.FullName.Substring($globalToPrd.Length + 1)
    $globalFiles[$relative] = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
}

Get-ChildItem -File -Recurse -LiteralPath $WorkspaceToPrd | ForEach-Object {
    $relative = $_.FullName.Substring($WorkspaceToPrd.Length + 1)
    $workspaceFiles[$relative] = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
}

$allRelative = @($globalFiles.Keys + $workspaceFiles.Keys | Sort-Object -Unique)
foreach ($relative in $allRelative) {
    $same = $globalFiles.ContainsKey($relative) -and
        $workspaceFiles.ContainsKey($relative) -and
        $globalFiles[$relative] -eq $workspaceFiles[$relative]
    Add-Check "sync:$relative" $same $relative
}

$requiredToPrdFiles = @(
    'SKILL.md',
    'references\MERGED-PRD-TEMPLATE.md',
    'scripts\validate-prd-images.ps1'
)
foreach ($relative in $requiredToPrdFiles) {
    Add-Check "to-prd-required:$relative" (Test-Path -LiteralPath (Join-Path $globalToPrd $relative)) $relative
}

function ConvertFrom-Utf8Base64 {
    param([string]$Value)

    [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Value))
}

$scenarioChecks = @(
    [PSCustomObject]@{
        name = 'c-end-only'
        requiredRules = @(
            '5LuFIEMg56uv5pe25LiN6L6T5Ye656m655qEIEIg56uv56ug6IqC',
            '6aqM5pS25qCH5YeG',
            '5b6F56Gu6K6k6aG5'
        )
    },
    [PSCustomObject]@{
        name = 'c-and-b-complex'
        requiredRules = @(
            '6KeS6Imy5p2D6ZmQ',
            '54q25oCB5rWB6L2s',
            '5pWw5o2u5a2X5YW4',
            '57O757uf6ZuG5oiQ'
        )
    },
    [PSCustomObject]@{
        name = 'existing-prd-with-images'
        requiredRules = @(
            '54mI5pys6KGo6L+95Yqg5paw6KGM',
            '5Zu65a6aIFNIQQ==',
            'SFRUUCAyMDA=',
            'Q29udGVudC1UeXBl'
        )
    }
)

$toPrdContract = (
    Get-Content -Raw -Encoding utf8 (Join-Path $globalToPrd 'SKILL.md')
) + "`n" + (
    Get-Content -Raw -Encoding utf8 (Join-Path $globalToPrd 'references\MERGED-PRD-TEMPLATE.md')
)

foreach ($scenario in $scenarioChecks) {
    $requiredRules = @($scenario.requiredRules | ForEach-Object { ConvertFrom-Utf8Base64 $_ })
    $missing = @($requiredRules | Where-Object { -not $toPrdContract.Contains($_) })
    Add-Check "scenario:$($scenario.name)" ($missing.Count -eq 0) ("missing=" + ($missing -join ','))
}

$failed = @($checks | Where-Object { -not $_.passed })
$result = [PSCustomObject]@{
    generatedAt = (Get-Date).ToString('o')
    expectedSkillCount = $expected.Count
    passed = $failed.Count -eq 0
    checks = $checks
    failureCount = $failed.Count
}

$outputFull = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath
} else {
    Join-Path (Get-Location) $OutputPath
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outputFull) | Out-Null
$result | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 -LiteralPath $outputFull
$result | ConvertTo-Json -Depth 6

if (-not $result.passed) {
    exit 1
}

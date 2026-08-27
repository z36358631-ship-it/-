[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [ValidateSet('Pass', 'Fail')]
    [string]$ExpectedResult,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'
$resolvedPath = (Resolve-Path -LiteralPath $Path).Path
$errors = New-Object System.Collections.Generic.List[object]
$warnings = New-Object System.Collections.Generic.List[object]
$utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)

function Add-Issue {
    param(
        [System.Collections.Generic.List[object]]$List,
        [string]$Code,
        [string]$Message
    )
    $List.Add([pscustomobject]@{ code = $Code; message = $Message })
}

function Split-MarkdownRow {
    param([string]$Line)
    return @($Line.Trim().Trim('|').Split('|') | ForEach-Object { $_.Trim() })
}

function Get-HeaderKey {
    param([string[]]$Headers)
    return (($Headers -join '|') -replace '\s+', '' -replace [char]0xFF0F, '/')
}

function Get-MarkdownTables {
    param([string[]]$Lines)

    $tables = @()
    for ($i = 0; $i -lt ($Lines.Count - 1); $i++) {
        if ($Lines[$i] -notmatch '\|' -or $Lines[$i + 1] -notmatch '^\s*\|?\s*:?-{3,}') {
            continue
        }

        $headers = Split-MarkdownRow -Line $Lines[$i]
        $rows = @()
        $j = $i + 2
        while ($j -lt $Lines.Count -and $Lines[$j] -match '\|') {
            if (-not [string]::IsNullOrWhiteSpace($Lines[$j])) {
                $rows += ,(Split-MarkdownRow -Line $Lines[$j])
            }
            $j++
        }
        $tables += [pscustomobject]@{
            headers = $headers
            headerKey = Get-HeaderKey -Headers $headers
            rows = $rows
            line = $i + 1
            endLine = $j
        }
        $i = $j - 1
    }
    return $tables
}

function Get-RowValue {
    param(
        [object]$Table,
        [string]$LabelPattern
    )
    foreach ($row in $Table.rows) {
        if ($row.Count -ge 2 -and $row[0] -match $LabelPattern) {
            return [string]$row[1]
        }
    }
    return ''
}

try {
    $bytes = [System.IO.File]::ReadAllBytes($resolvedPath)
    $content = $utf8Strict.GetString($bytes)
}
catch {
    Add-Issue -List $errors -Code 'INVALID_UTF8' -Message 'The file is not valid UTF-8.'
    $content = ''
}

$mojibakeMarkers = @(
    [char]0xFFFD,
    (-join @([char]0x95C7, [char]0x20AC)),
    (-join @([char]0x9428, [char]0x52EB)),
    (-join @([char]0x951F, [char]0x65A4, [char]0x62F7))
)
foreach ($marker in $mojibakeMarkers) {
    if ($content.Contains([string]$marker)) {
        Add-Issue -List $errors -Code 'MOJIBAKE' -Message 'The file contains corrupted text encoding.'
        break
    }
}

$contentWithoutFences = [regex]::Replace($content, '(?s)```.*?```', '')
$lines = @($content -split "`r?`n")
$tables = @(Get-MarkdownTables -Lines $lines)

$patterns = @{
    RevisionHeader = '^\u4FEE\u8BA2\u65E5\u671F\|\u4FEE\u8BA2\u5185\u5BB9\|\u7248\u672C\|\u4FEE\u8BA2\u4EBA$'
    RevisionNote = '(?m)\*{0,2}\u5907\u6CE8\*{0,2}\s*[:\uFF1A].*(\u65E0|\u641C\d{4}\.\d{1,2}\.\d{1,2}\u4FEE\u6539)'
    PageHeader = '^\u8981\u7D20\|\u5185\u5BB9\u8BF4\u660E$'
    SubFeatureHeader = '^\u7C7B\u578B\|\u56FE\u793A\|\u5185\u5BB9\|\u8BF4\u660E$'
    EventHeader = '^\u4E8B\u4EF6\u540D\u79F0\|\u7C7B\u578B\|\u5BF9\u5E94\u9875\u9762\|\u89E6\u53D1\u65F6\u673A\u4E0E\u6210\u529F\u5224\u5B9A\|\u53C2\u6570$'
    ParameterHeader = '^\u53C2\u6570\u540D\|\u7C7B\u578B\|\u5FC5\u586B\|\u8BF4\u660E\|\u679A\u4E3E/\u793A\u4F8B$'
    Placeholder = 'TBD|TODO|XXX|YYYY/M/D|\u5F85\u8865\u5145|\u5F85\u5B9A|\[\u9875\u9762\u540D\u79F0\]|\[\u586B\u5199\]'
    CurrentAlternative = '\u5F53\u524D\u65B9\u5F0F|\u5F53\u524D\u89E3\u51B3|\u73B0\u72B6'
    SuccessMeasure = '\u6307\u6807\u53E3\u5F84|\u6210\u529F\u6307\u6807|\u6570\u636E\u7ED3\u8BBA'
    Image = '!\[[^\]]*\]\([^)]+\)'
}

$revisionTables = @($tables | Where-Object { $_.headerKey -match $patterns.RevisionHeader })
if ($revisionTables.Count -ne 1) {
    Add-Issue -List $errors -Code 'REVISION_TABLE_INVALID' -Message 'Exactly one four-column revision table is required: date, change, version, editor.'
}
$revisionNoteLine = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $patterns.RevisionNote) {
        $revisionNoteLine = $i + 1
        break
    }
}
if ($revisionNoteLine -lt 0) {
    Add-Issue -List $errors -Code 'REVISION_SEARCH_NOTE_MISSING' -Message 'A note after the revision table must be either none or a searchable change marker.'
}
elseif ($revisionTables.Count -eq 1 -and $revisionNoteLine -le $revisionTables[0].endLine) {
    Add-Issue -List $errors -Code 'REVISION_SEARCH_NOTE_POSITION_INVALID' -Message 'The searchable change note must appear after the revision table.'
}

$requiredSections = @(
    @{ code = 'BACKGROUND_MISSING'; pattern = '\u80CC\u666F\u6982\u8FF0'; message = 'The background summary is missing.' },
    @{ code = 'BOUNDARY_MISSING'; pattern = '\u9700\u6C42\u8FB9\u754C'; message = 'The requirement boundary is missing.' },
    @{ code = 'TERMS_MISSING'; pattern = '\u672F\u8BED\u5B9A\u4E49'; message = 'The term definition section is missing.' },
    @{ code = 'SOLUTION_MISSING'; pattern = '\u4EA7\u54C1[\uFF0F/]\u65B9\u6848\u7B80\u4ECB'; message = 'The product or solution summary is missing.' },
    @{ code = 'DATA_CONCLUSION_MISSING'; pattern = '\u6570\u636E\u7ED3\u8BBA\s*[:\uFF1A]'; message = 'The tracking data conclusion is missing.' },
    @{ code = 'PENDING_SECTION_MISSING'; pattern = '(?m)^#{2,4}\s*(?:\u4E94[\u3001.]|5[.\u3001])?\s*\u5F85\u786E\u8BA4\u9879'; message = 'The pending-items section is missing.' }
)
foreach ($section in $requiredSections) {
    if ($content -notmatch $section.pattern) {
        Add-Issue -List $errors -Code $section.code -Message $section.message
    }
}

$boundaryRows = @('\u4EA7\u54C1\u8FB9\u754C', '\u4E1A\u52A1\u8FB9\u754C', '\u8FD0\u8425\u8FB9\u754C', '\u4EBA\u529B\u8FB9\u754C')
foreach ($rowPattern in $boundaryRows) {
    if ($content -notmatch $rowPattern) {
        Add-Issue -List $errors -Code 'BOUNDARY_ROW_MISSING' -Message "A required boundary row is missing: $rowPattern"
    }
}

foreach ($line in ($contentWithoutFences -split "`r?`n")) {
    if ($line -match $patterns.Placeholder) {
        Add-Issue -List $errors -Code 'UNRESOLVED_PLACEHOLDER' -Message "Unresolved placeholder: $($line.Trim())"
    }
}

$forbidden = @(
    @{ code = 'TOC_FORBIDDEN'; pattern = '(?m)^#{1,6}\s*(\u6587\u6863)?\u76EE\u5F55\s*$'; message = 'Do not generate a manual table of contents.' },
    @{ code = 'FEATURE_PRIORITY_FORBIDDEN'; pattern = '\u529F\u80FD\u4F18\u5148\u7EA7'; message = 'Feature priority is not part of the PRD template.' },
    @{ code = 'OLD_MASTER_TABLE_FORBIDDEN'; pattern = '\|\s*\u6A21\u5757\u540D\u79F0\s*\|\s*\u56FE\u793A\s*\|\s*\u5C55\u793A&\u4EA4\u4E92\u8BF4\u660E\s*\|'; message = 'The old C/B three-column master table is forbidden.' },
    @{ code = 'PUBLIC_RULE_REFERENCE_FORBIDDEN'; pattern = '(?im)\bR-\d{2,}\b|\u89C4\u5219\u7F16\u53F7|\u8BE6\u89C1\s*[CB]\s*\u7AEF|\u540C\s*[CB]\s*\u7AEF'; message = 'Public rule IDs and cross-end remote references are forbidden.' },
    @{ code = 'ACCEPTANCE_SECTION_FORBIDDEN'; pattern = '(?m)^#{1,6}[^\r\n]*\u9A8C\u6536[^\r\n]*$'; message = 'An independent acceptance chapter is forbidden.' },
    @{ code = 'DATA_VALIDATION_SECTION_FORBIDDEN'; pattern = '(?m)^#{1,6}[^\r\n]*\u6570\u636E\u6821\u9A8C[^\r\n]*$|\|[^\r\n]*\u6570\u636E\u6821\u9A8C[^\r\n]*\|'; message = 'An independent data-validation section or table is forbidden.' },
    @{ code = 'PROJECT_FIELD_FORBIDDEN'; pattern = '\u8BE6\u7EC6\u5F00\u53D1\u8BA1\u5212\u94FE\u63A5|\u7814\u53D1\u8BC4\u4F30\u72B6\u6001|\u6267\u884C\u51C6\u5907\u5EA6|\u76EE\u6807\u4E0A\u7EBF\u65F6\u95F4'; message = 'Project-management fields are forbidden in the PRD.' },
    @{ code = 'AUTHOR_PROCESS_FORBIDDEN'; pattern = '\u81EA\u68C0\u8BB0\u5F55|AI\s*\u8BC4\u5BA1\u8FC7\u7A0B|\u6A21\u62DF\u8BC4\u5BA1\u7ED3\u679C'; message = 'Author self-check or AI-review process must not appear in the PRD.' },
    @{ code = 'TEMPLATE_INSTRUCTION_LEAK'; pattern = '\u6A21\u677F\u4F7F\u7528\u8BF4\u660E|PRD\s*\u6210\u7A3F\u4E2D\u5220\u9664|\u6A21\u677F\u751F\u6210\u7EA6\u5B9A|(?m)^#{1,6}[^\r\n]*[\uFF08(]\u6309\u9700[\uFF09)]\s*$'; message = 'Template-only instructions or optional markers leaked into the final PRD.' },
    @{ code = 'AI_STYLE_LANGUAGE'; pattern = '\u65E8\u5728|\u8D4B\u80FD|\u52A9\u529B|\u6C89\u6D78\u5F0F'; message = 'AI-style filler language is forbidden.' },
    @{ code = 'DESIGN_REFERENCE_AMBIGUOUS'; pattern = '\u6309\u8BBE\u8BA1\u7A3F|\u540C\u4E0A|\u505A\u517C\u5BB9|\u6309\u914D\u7F6E\u5C55\u793A'; message = 'Ambiguous remote-reference language is forbidden.' }
)
foreach ($rule in $forbidden) {
    if ($contentWithoutFences -match $rule.pattern) {
        Add-Issue -List $errors -Code $rule.code -Message $rule.message
    }
}

$pageTables = @($tables | Where-Object { $_.headerKey -match $patterns.PageHeader })
if ($pageTables.Count -eq 0) {
    Add-Issue -List $errors -Code 'PAGE_REQUIREMENT_TABLE_MISSING' -Message 'At least one page-level six-element requirement table is required.'
}

$requiredRows = [ordered]@{
    '\u529F\u80FD\u7B80\u4ECB' = 'feature summary'
    '\u573A\u666F\u63CF\u8FF0' = 'scenario'
    '\u8F93\u5165[\uFF0F/]\u524D\u7F6E\u6761\u4EF6' = 'input or precondition'
    '\u9700\u6C42\u63CF\u8FF0' = 'requirement description'
    '\u8F93\u51FA[\uFF0F/]\u540E\u7F6E\u6761\u4EF6' = 'output or postcondition'
    '\u8865\u5145\u8BF4\u660E' = 'supplement'
}

foreach ($table in $pageTables) {
    foreach ($entry in $requiredRows.GetEnumerator()) {
        $value = Get-RowValue -Table $table -LabelPattern $entry.Key
        if ([string]::IsNullOrWhiteSpace($value)) {
            Add-Issue -List $errors -Code 'PAGE_REQUIREMENT_ELEMENT_MISSING' -Message "Page table at line $($table.line) lacks $($entry.Value)."
        }
    }

    $detail = Get-RowValue -Table $table -LabelPattern '\u9700\u6C42\u63CF\u8FF0'
    foreach ($part in @('\u56FE\u793A', '\u8BE6\u7EC6\u8BF4\u660E', '\u5C55\u793A\u8BF4\u660E', '\u4EA4\u4E92\u8BF4\u660E')) {
        if ($detail -notmatch $part) {
            Add-Issue -List $errors -Code 'PAGE_DESCRIPTION_PART_MISSING' -Message "Page description at line $($table.line) lacks a required part."
        }
    }

    $pageImageCount = [regex]::Matches($detail, $patterns.Image).Count
    if ($pageImageCount -lt 1 -or $pageImageCount -gt 3) {
        Add-Issue -List $errors -Code 'PAGE_IMAGE_COUNT_INVALID' -Message "Page table at line $($table.line) must contain one to three page images; found $pageImageCount."
    }
}

$cSection = [regex]::Match($content, '(?ms)^###\s*3\.1[^\r\n]*\r?\n(.*?)(?=^###\s*3\.2|^##\s|\z)')
if ($cSection.Success -and $cSection.Groups[1].Value -notmatch '\|\s*\u8981\u7D20\s*\|\s*\u5185\u5BB9\u8BF4\u660E\s*\|') {
    Add-Issue -List $errors -Code 'C_END_PAGE_TABLE_MISSING' -Message 'The C-end section exists without a page-level requirement table.'
}
$bSection = [regex]::Match($content, '(?ms)^###\s*3\.2[^\r\n]*\r?\n(.*?)(?=^##\s|\z)')
if ($bSection.Success -and $bSection.Groups[1].Value -notmatch '\|\s*\u8981\u7D20\s*\|\s*\u5185\u5BB9\u8BF4\u660E\s*\|') {
    Add-Issue -List $errors -Code 'B_END_PAGE_TABLE_MISSING' -Message 'The B-end section exists without a page-level requirement table.'
}

$subFeatureHeadingCount = [regex]::Matches($content, '(?m)^#{4,6}\s*\u9875\u9762\u5B50\u529F\u80FD\u6C47\u603B').Count
$subFeatureTables = @($tables | Where-Object { $_.headerKey -match $patterns.SubFeatureHeader })
if ($subFeatureHeadingCount -ne $subFeatureTables.Count) {
    Add-Issue -List $errors -Code 'SUBFEATURE_TABLE_INVALID' -Message 'Each page subfeature heading requires one four-column summary table.'
}
foreach ($table in $subFeatureTables) {
    if ($table.rows.Count -eq 0) {
        Add-Issue -List $errors -Code 'EMPTY_SUBFEATURE_TABLE' -Message "The subfeature table at line $($table.line) is empty."
    }
}

$flowMatch = [regex]::Match($content, '(?ms)^#{2,4}\s*(?:2\.2\s*)?\u4EA7\u54C1\u6D41\u7A0B[^\r\n]*\r?\n(.*?)(?=^#{2,3}\s|\z)')
if ($flowMatch.Success) {
    $flowImageCount = [regex]::Matches($flowMatch.Groups[1].Value, $patterns.Image).Count
    if ($flowImageCount -ne 1) {
        Add-Issue -List $errors -Code 'PRODUCT_FLOW_IMAGE_COUNT_INVALID' -Message "The product flow section must contain exactly one combined horizontal image; found $flowImageCount."
    }
}

$eventTables = @($tables | Where-Object { $_.headerKey -match $patterns.EventHeader })
$parameterTables = @($tables | Where-Object { $_.headerKey -match $patterns.ParameterHeader })
$dataConclusionMatch = [regex]::Match($content, '\u6570\u636E\u7ED3\u8BBA\s*[:\uFF1A]\s*([^\r\n]+)')
$trackingNotApplicable = $dataConclusionMatch.Success -and $dataConclusionMatch.Groups[1].Value -match '\u4E0D\u6D89\u53CA'

if ($trackingNotApplicable) {
    if ($eventTables.Count -gt 0 -or $parameterTables.Count -gt 0) {
        Add-Issue -List $errors -Code 'TRACKING_TABLE_REDUNDANT' -Message 'Tracking tables must be removed when the data conclusion is not applicable.'
    }
}
elseif ($dataConclusionMatch.Success) {
    if ($eventTables.Count -eq 0) {
        Add-Issue -List $errors -Code 'TRACKING_EVENT_TABLE_MISSING' -Message 'A tracking event table is required for new, changed, or reused tracking.'
    }
    if ($parameterTables.Count -eq 0) {
        Add-Issue -List $errors -Code 'TRACKING_PARAMETER_TABLE_MISSING' -Message 'The fixed five-column tracking parameter table is required.'
    }
}

if ($eventTables.Count -gt 0 -and $parameterTables.Count -gt 0) {
    $eventParameters = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($table in $eventTables) {
        foreach ($row in $table.rows) {
            if ($row.Count -lt 5) { continue }
            $raw = $row[4] -replace '<br\s*/?>', ',' -replace '`', ''
            foreach ($name in ($raw -split '[,;\uFF0C\uFF1B\u3001\s]+')) {
                $clean = $name.Trim()
                if ($clean -and $clean -notmatch '^(-|N/A|none|\u65E0)$') {
                    [void]$eventParameters.Add($clean)
                }
            }
        }
    }

    $definedParameters = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($table in $parameterTables) {
        foreach ($row in $table.rows) {
            if ($row.Count -lt 5) { continue }
            $name = ($row[0] -replace '`', '').Trim()
            if (-not $name) { continue }
            [void]$definedParameters.Add($name)

            $type = $row[1]
            $enumValue = $row[4]
            if ($type -match 'enum|\u679A\u4E3E') {
                $segments = @($enumValue -split '(?:<br\s*/?>|[;\uFF1B])' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
                if ($segments.Count -eq 0) {
                    Add-Issue -List $errors -Code 'ENUM_MEANING_MISSING' -Message "Enum parameter has no values: $name"
                }
                foreach ($segment in $segments) {
                    if ($segment -notmatch '[=\uFF1D]') {
                        Add-Issue -List $errors -Code 'ENUM_MEANING_MISSING' -Message "Enum value lacks a business definition: $name"
                    }
                }
            }
        }
    }

    foreach ($name in $eventParameters) {
        if (-not $definedParameters.Contains($name)) {
            Add-Issue -List $errors -Code 'TRACKING_PARAMETER_MISSING' -Message "Event parameter is not defined: $name"
        }
    }
    foreach ($name in $definedParameters) {
        if (-not $eventParameters.Contains($name)) {
            Add-Issue -List $errors -Code 'TRACKING_PARAMETER_UNUSED' -Message "Defined parameter is not referenced by an event: $name"
        }
    }
}

if ($content -match '(\.\./|file://|localhost|data:image/|[A-Za-z]:\\|@master/|@main/|github\.com/.+/blob/)') {
    Add-Issue -List $errors -Code 'LOCAL_OR_MUTABLE_IMAGE_SOURCE' -Message 'The document contains a local or mutable image source.'
}
$imageMatches = [regex]::Matches($content, '!\[[^\]]*\]\(([^)]+)\)')
foreach ($match in $imageMatches) {
    $url = $match.Groups[1].Value
    if ($url -notmatch '^https://cdn\.jsdelivr\.net/gh/z36358631-ship-it/-@[0-9a-fA-F]{40}/public/prd/[A-Za-z0-9._/-]+\.(png|jpg|jpeg|webp|gif)$') {
        Add-Issue -List $errors -Code 'INVALID_IMAGE_URL' -Message "Invalid PRD image URL: $url"
    }
}

$plainLines = @($contentWithoutFences -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object {
    $_.Length -ge 20 -and $_ -notmatch '^[#|>!\-`]' -and $_ -notmatch '^\d+[.\u3001]'
})
$duplicateGroups = @($plainLines | Group-Object | Where-Object { $_.Count -gt 1 })
foreach ($group in $duplicateGroups) {
    Add-Issue -List $warnings -Code 'DUPLICATE_PROSE' -Message "Repeated prose should be reviewed: $($group.Name)"
}

if ($content -notmatch $patterns.CurrentAlternative) {
    Add-Issue -List $warnings -Code 'CURRENT_ALTERNATIVE_NOT_EXPLICIT' -Message 'The current user or business workaround is not explicit.'
}
if ($content -notmatch $patterns.SuccessMeasure) {
    Add-Issue -List $warnings -Code 'SUCCESS_MEASURE_NOT_EXPLICIT' -Message 'No data conclusion or success measure is explicit.'
}

$uniqueErrors = @($errors | Group-Object code, message | ForEach-Object { $_.Group[0] })
$uniqueWarnings = @($warnings | Group-Object code, message | ForEach-Object { $_.Group[0] })
$actualResult = if ($uniqueErrors.Count -eq 0) { 'Pass' } else { 'Fail' }
$expectationMet = if ($ExpectedResult) { $ExpectedResult -eq $actualResult } else { $uniqueErrors.Count -eq 0 }

$result = [pscustomobject]@{
    path = $resolvedPath
    result = $actualResult
    expectedResult = if ($ExpectedResult) { $ExpectedResult } else { $null }
    expectationMet = $expectationMet
    errorCount = $uniqueErrors.Count
    warningCount = $uniqueWarnings.Count
    errors = $uniqueErrors
    warnings = $uniqueWarnings
}

if ($Json) {
    $result | ConvertTo-Json -Depth 5 -Compress
}
else {
    $result | ConvertTo-Json -Depth 5
}

if (-not $expectationMet) { exit 1 }

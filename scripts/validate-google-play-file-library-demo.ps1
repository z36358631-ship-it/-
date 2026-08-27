param(
    [string]$HtmlPath = 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
)

$html = Get-Content -Raw -Encoding UTF8 -LiteralPath $HtmlPath
$failures = [System.Collections.Generic.List[string]]::new()

function Require-Text([string]$needle, [string]$message) {
    if (-not $html.Contains($needle)) { $failures.Add($message) }
}

function Forbid-Pattern([string]$pattern, [string]$message) {
    if ($html -match $pattern) { $failures.Add($message) }
}

$fixedNavigation = [regex]::Unescape('\u9996\u9875\uff5c\u73a9\u6e38\u620f\uff5c\u6392\u884c\u699c\uff5c\u6587\u4ef6\u5e93\uff5c\u6211\u7684')
$pcGameMetadata = [regex]::Unescape('PC \u6e38\u620f')
$retroGame = [regex]::Unescape('\u590d\u53e4\u6e38\u620f')

Require-Text $fixedNavigation 'Missing fixed five-tab navigation semantics'
Require-Text 'data-library-tab="files"' 'Missing Files tab'
Require-Text 'data-library-tab="pc"' 'Missing PC Games tab'
Require-Text 'data-library-tab="retro"' 'Missing Retro Games tab'
Require-Text "type:'game'" 'Game file data was removed'
Require-Text $pcGameMetadata 'PC game file metadata was removed'
Require-Text $retroGame 'Retro game semantics were removed'
Require-Text 'add-game' 'Add-game capability was removed'
Require-Text "permission:'granted'" 'Manager is missing persistent permission state'

Forbid-Pattern 'data-option=|function\s+setOption|location\.hash|\u65b9\u6848\s*[AB]|\u53cc\u65b9\u6848' 'A/B or hash mode is still present'
Forbid-Pattern 'data-filter="game"' 'Game Files filter is still present'
Forbid-Pattern '\u5ba1\u6838\u6a21\u5f0f|\u6b63\u5f0f\u6a21\u5f0f|\u901a\u8fc7\u540e\u9690\u85cf|\u8fdc\u7a0b\u5f00\u5173' 'Review-only behavior text is still present'
Forbid-Pattern 'https?://|<iframe\b|<canvas\b|<script\b[^>]*\bsrc=|<link\b[^>]*\brel=' 'Demo is not a fully offline single file'

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host 'PASS: Google Play file library demo static validation passed'

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

Require-Text $fixedNavigation 'Missing fixed five-tab navigation semantics'
Require-Text 'data-library-tab="files"' 'Missing Files tab'
Require-Text 'data-library-tab="pc"' 'Missing PC Games tab'
Require-Text 'data-library-tab="retro"' 'Missing Retro Games tab'
Require-Text 'data-component-id="C-CAPACITY"' 'Missing internal storage capacity card'
Require-Text 'data-permission-state="denied"' 'Missing denied permission state'
Require-Text 'data-system-settings-sim' 'Missing Android system settings simulation'
Require-Text 'data-file-action="copy"' 'Missing Copy action'
Require-Text 'data-file-action="rename"' 'Missing Rename action'
Require-Text 'data-file-action="delete"' 'Missing Delete action'
Require-Text 'id="nameActionDialog"' 'Missing copy/rename naming dialog'
Require-Text 'id="deleteConfirmDialog"' 'Missing delete confirmation dialog'
Require-Text "permission:'unknown'" 'Initial permission is not unknown'
Require-Text 'pathStack:[]' 'Missing directory stack'
Require-Text 'function enterFolder' 'Missing folder navigation'
Require-Text 'function confirmCopy' 'Missing copy implementation'
Require-Text 'function confirmRename' 'Missing rename implementation'
Require-Text 'function confirmDelete' 'Missing delete implementation'
Require-Text 'isMobileLandscape' 'Missing portrait-only orientation rule'
Require-Text 'recent:true' 'Demo data is missing explicit recent=true state'
Require-Text 'recent:false' 'Demo data is missing explicit recent=false state'
Require-Text 'item.recent===true' 'Recent filter is not based on explicit recent state'
Require-Text 'copy.recent=true' 'Copied item is not marked as recently modified'
Require-Text 'state.actionTarget.recent=true' 'Renamed item is not marked as recently modified'

Forbid-Pattern 'data-storage="sd"|data-storage="usb"' 'SD or USB storage is still present'
Forbid-Pattern 'i-sd|i-usb' 'Unused SD or USB icon symbol is still present'
Forbid-Pattern 'count-label|\d+\s*\u9879' 'File count copy is still present'
Forbid-Pattern 'action-bar|data-file-action="move"|add-game' 'Removed file actions are still present'
Forbid-Pattern 'GAMEHUB LOCAL|permission-chip' 'Legacy file header is still present'
Forbid-Pattern 'data-option=|function\s+setOption|location\.hash' 'A/B or hash mode is still present'
Forbid-Pattern '(?is)<input\b(?=[^>]*\bid="nameActionInput")(?=[^>]*\bmaxlength\s*=\s*["'']?50(?:["'']|\s|>))[^>]*>' 'Naming input still hard-truncates at 50 characters'
Forbid-Pattern 'state\.filter\s*===\s*[''"]recent[''"]\s*\?\s*item\.type\s*!==\s*[''"]folder[''"]' 'Recent filter still treats every non-folder as recently modified'
Forbid-Pattern 'https?://|<iframe\b|<canvas\b|<script\b[^>]*\bsrc=|<link\b[^>]*\brel=' 'Demo is not a fully offline single file'

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host 'PASS: Google Play file library demo static validation passed'

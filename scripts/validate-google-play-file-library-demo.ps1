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
$moreMenuTitle = [regex]::Unescape('\u66f4\u591a\u83dc\u5355')
Require-Text "<h3 id=`"sheetTitle`">$moreMenuTitle</h3>" 'More menu title is not fixed'
Require-Text 'data-sheet-close' 'More menu close button is missing'
Require-Text '.sheet-actions{border-top:0}' 'Divider still appears between menu title and first action'
Require-Text 'data-sort="modified"' 'Modified-time sort button is missing'
Require-Text 'data-sort="size"' 'Size sort button is missing'
Require-Text "typeFilter:'all'" 'Default type filter is not all'
Require-Text "sortBy:'modified'" 'Default sort is not modified time'
Require-Text "sortOrder:'desc'" 'Default sort order is not descending'
Require-Text "name:'示例文件'" 'Root-level sample folder is missing'
Require-Text "name:'示例图片.jpg'" 'Sample image is missing'
Require-Text "name:'示例文本.txt'" 'Sample text is missing'
Require-Text "name:'示例网页.html'" 'Sample HTML is missing'
Require-Text "name:'示例文档.pdf'" 'Sample PDF is missing'
Require-Text "name:'示例视频.mp4'" 'Sample video is missing'
Require-Text "name:'示例压缩包.zip'" 'Sample ZIP is missing'
Require-Text 'id="fileViewer"' 'Unified file viewer is missing'
Require-Text 'id="viewerClose"' 'Viewer close control is missing'
Require-Text 'function openFileViewer' 'Viewer open behavior is missing'
Require-Text 'function renderViewerContent' 'Viewer renderer is missing'
Require-Text 'id="extractConfirmDialog"' 'ZIP extraction confirmation is missing'
Require-Text 'function openExtractConfirm' 'ZIP extraction open behavior is missing'
Require-Text 'function confirmExtract' 'ZIP extraction implementation is missing'
Require-Text 'data:image/jpeg;base64,' 'Offline sample image was not embedded'
Require-Text 'data:video/mp4;base64,' 'Offline sample video was not embedded'
Require-Text 'modifiedAt:' 'Demo items are missing modified-time metadata'
Require-Text 'sizeBytes:' 'Demo items are missing size metadata'
Require-Text 'function sortDirectoryItems' 'Directory sorting implementation is missing'
Require-Text 'function renderFilterSortControls' 'Filter/sort state rendering is missing'
Require-Text 'copy.modifiedAt=new Date().toISOString()' 'Copied item is not marked as newest'
Require-Text 'state.actionTarget.modifiedAt=new Date().toISOString()' 'Renamed item is not marked as newest'

Forbid-Pattern 'data-storage="sd"|data-storage="usb"' 'SD or USB storage is still present'
Forbid-Pattern 'i-sd|i-usb' 'Unused SD or USB icon symbol is still present'
Forbid-Pattern 'count-label|\d+\s*\u9879' 'File count copy is still present'
Forbid-Pattern 'action-bar|data-file-action="move"|add-game' 'Removed file actions are still present'
Forbid-Pattern 'GAMEHUB LOCAL|permission-chip' 'Legacy file header is still present'
Forbid-Pattern 'data-option=|function\s+setOption|location\.hash' 'A/B or hash mode is still present'
Forbid-Pattern '(?is)<input\b(?=[^>]*\bid="nameActionInput")(?=[^>]*\bmaxlength\s*=\s*["'']?50(?:["'']|\s|>))[^>]*>' 'Naming input still hard-truncates at 50 characters'
Forbid-Pattern 'state\.filter\s*===\s*[''"]recent[''"]\s*\?\s*item\.type\s*!==\s*[''"]folder[''"]' 'Recent filter still treats every non-folder as recently modified'
Forbid-Pattern 'document\.getElementById\([''"]sheetTitle[''"]\)\.textContent' 'More menu title is still dynamic'
Forbid-Pattern '(?is)data-file-action="(?:copy|rename|delete)"[^>]*>\s*<svg\b' 'More menu actions still contain icons'
Forbid-Pattern 'requestAnimationFrame\(\(\)=>sheet\.querySelector' 'More menu still autofocuses the first action'
Forbid-Pattern "filter:'(?:all|recent|archive|folder)'" 'Legacy single filter state is still present'
Forbid-Pattern 'data-filter="recent"' 'Recent modified is still implemented as a filter'
Forbid-Pattern '\.recent\b|recent:' 'Legacy recent boolean state is still present'
Forbid-Pattern '<iframe\b|<canvas\b' 'Viewer uses a forbidden iframe or canvas'
Forbid-Pattern 'data-viewer-action="(?:copy|rename|delete|share)"' 'Viewer contains a forbidden file action'
Forbid-Pattern 'https?://|<iframe\b|<canvas\b|<script\b[^>]*\bsrc=|<link\b[^>]*\brel=' 'Demo is not a fully offline single file'

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host 'PASS: Google Play file library demo static validation passed'

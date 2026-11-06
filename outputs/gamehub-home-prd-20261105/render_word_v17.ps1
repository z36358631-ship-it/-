$ErrorActionPreference='Stop'
$taskOut=$PSScriptRoot
$taskRoot=[IO.Path]::GetFullPath((Join-Path $taskOut '..\..'))
$taskDoc=Join-Path $taskRoot 'prd\最终文档\【PRD】《盖世游戏》7.0首页改版需求\盖世游戏7.0首页改版PRD_V1.7_飞书导入版.docx'
$renderOut=Join-Path $taskOut 'render-v17'
[IO.Directory]::CreateDirectory($renderOut)|Out-Null
$taskPdf=Join-Path $renderOut '盖世游戏7.0首页改版PRD_V1.7_飞书导入版.pdf'
$word=$null
$doc=$null
try {
  $word=New-Object -ComObject Word.Application
  $word.Visible=$false
  $word.DisplayAlerts=0
  $doc=$word.Documents.Open($taskDoc,$false,$true)
  $doc.ExportAsFixedFormat($taskPdf,17)
  $pageCount=$doc.ComputeStatistics(2)
  [ordered]@{renderer='Microsoft Word COM hidden read-only PDF export';canonicalRenderer='failed: LibreOffice soffice.exe is unavailable in bundled runtime';source=$taskDoc;pdf=$taskPdf;pages=$pageCount;sourceSha256=(Get-FileHash -LiteralPath $taskDoc -Algorithm SHA256).Hash.ToLowerInvariant()} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $renderOut 'word-render.json') -Encoding utf8
  Write-Output "Exported $pageCount pages"
} finally {
  if ($null -ne $doc) {$doc.Close($false);[Runtime.InteropServices.Marshal]::FinalReleaseComObject($doc)|Out-Null}
  if ($null -ne $word) {$word.Quit();[Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)|Out-Null}
}

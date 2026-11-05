param([string]$DocName='盖世游戏MacSteam接入产品需求-V1.3.docx')
$ErrorActionPreference='Stop'
$docPath=Join-Path $PSScriptRoot $DocName
$renderDir=Join-Path $PSScriptRoot 'prd-render'
[IO.Directory]::CreateDirectory($renderDir) | Out-Null
$pdfPath=Join-Path $renderDir 'prd.pdf'
$word=$null
$document=$null
try {
  $word=New-Object -ComObject Word.Application
  $word.Visible=$false
  $word.DisplayAlerts=0
  $document=$word.Documents.Open($docPath,$false,$true)
  $document.Repaginate()
  $document.ExportAsFixedFormat($pdfPath,17)
  Write-Output ('Rendered pages: '+$document.ComputeStatistics(2))
} finally {
  if($document){$document.Close(0);[void][Runtime.InteropServices.Marshal]::ReleaseComObject($document)}
  if($word){$word.Quit();[void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)}
}

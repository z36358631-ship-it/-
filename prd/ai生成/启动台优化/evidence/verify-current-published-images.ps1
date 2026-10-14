$ErrorActionPreference='Stop'
$launchpadRoot=Split-Path $PSScriptRoot -Parent
$commit='44322d5358cd5ed423d79c46e749f14fc64341ae'
$results=@()
foreach($file in Get-ChildItem -LiteralPath (Join-Path $launchpadRoot 'images') -Filter '*.png' -File){
 $url="https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$commit/public/prd/guanwanggaid-57-launchpad-20261014/$($file.Name)"
 $response=Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
 $bytes=$response.RawContentStream.ToArray()
 $algorithm=[System.Security.Cryptography.SHA256]::Create()
 try { $actual=[BitConverter]::ToString($algorithm.ComputeHash($bytes)).Replace('-','') } finally { $algorithm.Dispose() }
 $expected=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
 $type=[string]$response.Headers['Content-Type']
 $ok=([int]$response.StatusCode -eq 200 -and $type.StartsWith('image/png') -and $actual -eq $expected)
 $results+= [pscustomobject]@{name=$file.Name;url=$url;status=[int]$response.StatusCode;contentType=$type;bytes=$bytes.Length;sha256=$actual;ok=$ok}
 if(!$ok){throw "Image validation failed: $($file.Name)"}
 Write-Output "PASS $($file.Name)"
}
$report=[pscustomobject]@{status='PASS';commit=$commit;imageCount=$results.Count;results=$results;time=[DateTime]::UtcNow.ToString('o');feishuImportVerified=$false;scope='Public status, MIME and exact SHA-256 against current local images; Feishu transfer not verified.'}
$report | ConvertTo-Json -Depth 8 | Out-File -LiteralPath (Join-Path $PSScriptRoot 'published-images-20261014.json') -Encoding utf8

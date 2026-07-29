[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$TestedSourceCommit,

  [string]$PackageCommit = 'HEAD',

  [string]$AllowlistPath = 'games/wechat-h5-v2/delivery-allowlist.json',

  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (& git -C $scriptDirectory rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0 -or -not $repoRoot) {
  throw 'TRUSTED_REPOSITORY_REQUIRED'
}
$repoRoot = [System.IO.Path]::GetFullPath($repoRoot)
$exportTool = Join-Path $repoRoot 'games/wechat-h5-v2/tools/export-git-snapshot.mjs'
$verifyTool = Join-Path $repoRoot 'games/wechat-h5-v2/tools/verify-delivery.mjs'

$resolvedPackageCommit = (& git -C $repoRoot rev-parse --verify "$PackageCommit`^{commit}").Trim()
if ($LASTEXITCODE -ne 0 -or $resolvedPackageCommit -notmatch '^[0-9a-f]{40}$') {
  throw "PACKAGE_COMMIT_INVALID:$PackageCommit"
}
$resolvedTestedCommit = (& git -C $repoRoot rev-parse --verify "$TestedSourceCommit`^{commit}").Trim()
if ($LASTEXITCODE -ne 0 -or $resolvedTestedCommit -notmatch '^[0-9a-f]{40}$') {
  throw "TESTED_SOURCE_COMMIT_INVALID:$TestedSourceCommit"
}

if (-not $OutputDirectory) {
  $OutputDirectory = Join-Path $repoRoot 'dist/v2'
}
$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$shortCommit = $resolvedPackageCommit.Substring(0, 12)
$archiveName = "wechat-h5-high-fidelity-games-review-$shortCommit.zip"
$finalArchive = Join-Path $OutputDirectory $archiveName
$finalSidecar = "$finalArchive.sha256"
if ((Test-Path -LiteralPath $finalArchive) -or (Test-Path -LiteralPath $finalSidecar)) {
  throw "DELIVERY_OUTPUT_EXISTS:$archiveName"
}

$tempBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$tempRoot = Join-Path $tempBase ("wechat-h5-v2-delivery-" + [guid]::NewGuid().ToString('N'))
$payload = Join-Path $tempRoot 'payload'
$candidateArchive = Join-Path $tempRoot $archiveName
$candidateSidecar = "$candidateArchive.sha256"
$verificationDirectory = Join-Path $tempRoot 'verified'
$sidecarPublished = $false

New-Item -ItemType Directory -Path $tempRoot | Out-Null
try {
  & node $exportTool `
    --repo $repoRoot `
    --allowlist $AllowlistPath `
    --commit $resolvedPackageCommit `
    --tested-source-commit $resolvedTestedCommit `
    --output $payload
  if ($LASTEXITCODE -ne 0) {
    throw "GIT_SNAPSHOT_EXPORT_FAILED:$LASTEXITCODE"
  }

  Compress-Archive -Path (Join-Path $payload '*') -DestinationPath $candidateArchive -CompressionLevel Optimal
  Expand-Archive -LiteralPath $candidateArchive -DestinationPath $verificationDirectory

  & node $verifyTool --package-dir $verificationDirectory --trusted-repo $repoRoot
  if ($LASTEXITCODE -ne 0) {
    throw "TRUSTED_DELIVERY_VERIFICATION_FAILED:$LASTEXITCODE"
  }

  $sha256 = (Get-FileHash -LiteralPath $candidateArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  [System.IO.File]::WriteAllText(
    $candidateSidecar,
    "$sha256  $archiveName`n",
    [System.Text.UTF8Encoding]::new($false)
  )
  & node $verifyTool `
    --package-dir $verificationDirectory `
    --trusted-repo $repoRoot `
    --zip $candidateArchive `
    --sha256 $candidateSidecar
  if ($LASTEXITCODE -ne 0) {
    throw "SHA256_SIDECAR_VERIFICATION_FAILED:$LASTEXITCODE"
  }

  Move-Item -LiteralPath $candidateSidecar -Destination $finalSidecar
  $sidecarPublished = $true
  Move-Item -LiteralPath $candidateArchive -Destination $finalArchive
  $sidecarPublished = $false

  Write-Output 'AUTHENTICATED DELIVERY PASS'
  Write-Output "ZIP SHA-256: $sha256"
  Write-Output "Archive: $finalArchive"
  Write-Output "Sidecar: $finalSidecar"
}
catch {
  if ($sidecarPublished -and -not (Test-Path -LiteralPath $finalArchive)) {
    Remove-Item -LiteralPath $finalSidecar -Force -ErrorAction SilentlyContinue
  }
  throw
}
finally {
  $resolvedTempRoot = [System.IO.Path]::GetFullPath($tempRoot)
  if (
    $resolvedTempRoot.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase) -and
    (Test-Path -LiteralPath $resolvedTempRoot)
  ) {
    Remove-Item -LiteralPath $resolvedTempRoot -Recurse -Force
  }
}

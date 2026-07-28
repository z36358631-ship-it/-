param(
  [string]$OutputDirectory = "dist"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Assert-SafeOutputDirectory([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "OutputDirectory 不能为空"
  }
  if ([IO.Path]::IsPathRooted($Value)) {
    throw "OutputDirectory 只能是工作区内的 dist 或其安全子目录，不能使用绝对路径"
  }
  $forward = $Value.Replace("\", "/").TrimEnd("/")
  $segments = @($forward.Split("/"))
  if (
    ($forward -ne "dist" -and -not $forward.StartsWith("dist/", [StringComparison]::Ordinal)) -or
    $segments.Count -eq 0 -or
    @($segments | Where-Object { $_ -eq "" -or $_ -eq "." -or $_ -eq ".." }).Count -gt 0
  ) {
    throw "OutputDirectory 只能是工作区内的 dist 或其安全子目录，且不能包含 . 或 .."
  }
  $resolved = [IO.Path]::GetFullPath((Join-Path $root $forward))
  $distRoot = [IO.Path]::GetFullPath((Join-Path $root "dist"))
  $distPrefix = $distRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  if (
    -not $resolved.Equals($distRoot, [StringComparison]::OrdinalIgnoreCase) -and
    -not $resolved.StartsWith($distPrefix, [StringComparison]::OrdinalIgnoreCase)
  ) {
    throw "OutputDirectory 解析后越出工作区 dist：$resolved"
  }
  return $resolved
}

function Assert-TemporaryPath([string]$Candidate, [string]$TempRoot) {
  $fullCandidate = [IO.Path]::GetFullPath($Candidate)
  $fullTempRoot = [IO.Path]::GetFullPath($TempRoot)
  $prefix = $fullTempRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  if (-not $fullCandidate.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "拒绝操作系统临时目录之外的路径：$fullCandidate"
  }
  return $fullCandidate
}

function Convert-ToForwardRelativePath([string]$Base, [string]$AbsolutePath) {
  $basePath = [IO.Path]::GetFullPath($Base).TrimEnd(
    [IO.Path]::DirectorySeparatorChar,
    [IO.Path]::AltDirectorySeparatorChar
  ) + [IO.Path]::DirectorySeparatorChar
  $baseUri = New-Object Uri($basePath)
  $pathUri = New-Object Uri([IO.Path]::GetFullPath($AbsolutePath))
  return [Uri]::UnescapeDataString($baseUri.MakeRelativeUri($pathUri).ToString())
}

$outputRoot = Assert-SafeOutputDirectory $OutputDirectory
$packageCommit = (& git -C $root rev-parse HEAD).Trim().ToLowerInvariant()
if ($LASTEXITCODE -ne 0 -or $packageCommit -notmatch "^[0-9a-f]{40}$") {
  throw "无法取得固定的 40 位 packageCommit"
}
$packageShortCommit = $packageCommit.Substring(0, 8)

$allowlistRelative = "tools/wechat-h5-delivery-allowlist.json"
$allowlistFile = Join-Path $root $allowlistRelative
if (-not (Test-Path -LiteralPath $allowlistFile)) {
  throw "工作区缺少版本化交付白名单"
}
$allowlist = Get-Content -Raw -Encoding utf8 -LiteralPath $allowlistFile | ConvertFrom-Json
if ($allowlist.schemaVersion -ne 1) {
  throw "不支持的交付白名单版本：$($allowlist.schemaVersion)"
}
$files = @($allowlist.files)
$reportPaths = @($allowlist.reports)
$runtimePaths = @($allowlist.runtimePaths)
if ($files.Count -eq 0 -or $reportPaths.Count -ne 5 -or $runtimePaths.Count -eq 0) {
  throw "交付白名单 files/reports/runtimePaths 不完整"
}

$dirty = @(& git -C $root status --porcelain -- @files)
if ($LASTEXITCODE -ne 0) {
  throw "git status 执行失败"
}
if ($dirty.Count -gt 0) {
  throw "交付白名单存在未提交变更，拒绝打包：`n$($dirty -join "`n")"
}

$distRoot = Join-Path $root "dist"
if (Test-Path -LiteralPath $distRoot) {
  $distItem = Get-Item -LiteralPath $distRoot -Force
  if ($distItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw "dist 不能是重解析点：$distRoot"
  }
}
$outputSegments = @($OutputDirectory.Replace("\", "/").TrimEnd("/").Split("/") | Select-Object -Skip 1)
$currentOutputPath = $distRoot
foreach ($segment in $outputSegments) {
  $currentOutputPath = Join-Path $currentOutputPath $segment
  if (Test-Path -LiteralPath $currentOutputPath) {
    $currentOutputItem = Get-Item -LiteralPath $currentOutputPath -Force
    if ($currentOutputItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      throw "OutputDirectory 的现有路径段不能是重解析点：$currentOutputPath"
    }
  }
}
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$zipPath = Join-Path $outputRoot "wechat-h5-premium-games-review-$packageShortCommit.zip"
$zipDigestPath = "$zipPath.sha256"
foreach ($artifact in @($zipPath, $zipDigestPath)) {
  if (Test-Path -LiteralPath $artifact) {
    throw "拒绝覆盖已有交付物：$artifact"
  }
}

$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$stage = Assert-TemporaryPath (Join-Path $tempRoot ("wechat-h5-stage-" + [guid]::NewGuid())) $tempRoot
$verify = Assert-TemporaryPath (Join-Path $tempRoot ("wechat-h5-verify-" + [guid]::NewGuid())) $tempRoot
$candidateZip = Assert-TemporaryPath (Join-Path $tempRoot ("wechat-h5-review-" + [guid]::NewGuid() + ".zip")) $tempRoot
$candidateDigest = Assert-TemporaryPath (Join-Path $tempRoot ("wechat-h5-review-" + [guid]::NewGuid() + ".sha256")) $tempRoot

try {
  New-Item -ItemType Directory -Path $stage | Out-Null
  $exportOutput = @(
    & node (Join-Path $root "tools/export-wechat-h5-git-snapshot.mjs") `
      $root `
      $packageCommit `
      $stage
  )
  if (
    $LASTEXITCODE -ne 0 -or
    -not ($exportOutput -match "^EXPORTED [0-9]+ GIT BLOBS FROM")
  ) {
    throw "无法从 packageCommit 导出严格 Git blob 快照：`n$($exportOutput -join "`n")"
  }

  $snapshotFiles = @(
    Get-ChildItem -LiteralPath $stage -Recurse -Force -File |
      ForEach-Object { Convert-ToForwardRelativePath $stage $_.FullName } |
      Sort-Object
  )
  $expectedFiles = @($files | Sort-Object)
  if (Compare-Object -ReferenceObject $expectedFiles -DifferenceObject $snapshotFiles) {
    throw "Git 快照文件集合与严格白名单不一致"
  }

  $verificationReports = @()
  $testedCommits = @()
  foreach ($relative in $reportPaths) {
    $reportFile = Join-Path $stage $relative
    $report = Get-Content -Raw -Encoding utf8 -LiteralPath $reportFile | ConvertFrom-Json
    foreach ($requiredProperty in @(
      "schemaVersion",
      "generatedAt",
      "gitCommit",
      "command",
      "environment",
      "sourceState",
      "summary",
      "exitCode"
    )) {
      if (-not ($report.PSObject.Properties.Name -contains $requiredProperty)) {
        throw "$relative 缺少报告字段：$requiredProperty"
      }
    }
    if ($report.schemaVersion -ne 1) {
      throw "$relative schemaVersion 不是 1"
    }
    if ($report.gitCommit -notmatch "^[0-9a-f]{40}$") {
      throw "$relative gitCommit 必须是 40 位 testedSourceCommit，不能 unavailable"
    }
    if ($report.exitCode -ne 0) {
      throw "$relative 退出码不是 0"
    }
    if (
      $report.sourceState.testedPathsDirty -ne $false -or
      $report.sourceState.testedPathCount -le 0 -or
      $report.sourceState.statusCheck -ne "git-status-porcelain-v1"
    ) {
      throw "$relative 的 sourceState 不是已验证干净状态"
    }
    $testedCommits += $report.gitCommit.ToLowerInvariant()
    $verificationReports += [ordered]@{
      path = $relative
      schemaVersion = $report.schemaVersion
      generatedAt = $report.generatedAt
      gitCommit = $report.gitCommit.ToLowerInvariant()
      command = $report.command
      exitCode = $report.exitCode
      sourceState = $report.sourceState
      summary = $report.summary
    }
  }
  $uniqueTestedCommits = @($testedCommits | Sort-Object -Unique)
  if ($uniqueTestedCommits.Count -ne 1) {
    throw "五份报告未绑定同一个 testedSourceCommit：$($uniqueTestedCommits -join ', ')"
  }
  $testedSourceCommit = $uniqueTestedCommits[0]

  & git -C $root cat-file -e "${testedSourceCommit}^{commit}"
  if ($LASTEXITCODE -ne 0) {
    throw "testedSourceCommit 不存在于当前 Git 仓库：$testedSourceCommit"
  }
  & git -C $root diff --quiet $testedSourceCommit $packageCommit -- @runtimePaths
  $sourceDiffExit = $LASTEXITCODE
  if ($sourceDiffExit -eq 1) {
    throw "[STALE_REPORT] 报告已过期：testedSourceCommit 与 packageCommit 的运行时源码或工具存在差异"
  }
  if ($sourceDiffExit -ne 0) {
    throw "无法比较 testedSourceCommit 与 packageCommit"
  }

  $manifestFiles = @(
    foreach ($relative in $files) {
      $file = Get-Item -LiteralPath (Join-Path $stage $relative)
      [ordered]@{
        path = $relative
        bytes = $file.Length
        sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant()
      }
    }
  )
  $manifest = [ordered]@{
    schemaVersion = 1
    scope = "non-production-review-package"
    disclaimer = "浏览器非生产评审包；不代表微信生产 GO"
    packageCommit = $packageCommit
    packageShortCommit = $packageShortCommit
    testedSourceCommit = $testedSourceCommit
    buildTime = [DateTimeOffset]::UtcNow.ToString("o")
    sourceDiff = [ordered]@{
      checked = $true
      baseCommit = $testedSourceCommit
      headCommit = $packageCommit
      runtimePathCount = $runtimePaths.Count
    }
    verificationReports = $verificationReports
    files = $manifestFiles
  }
  $manifestPath = Join-Path $stage "DELIVERY-MANIFEST.json"
  $manifestJson = $manifest | ConvertTo-Json -Depth 12
  [IO.File]::WriteAllText($manifestPath, "$manifestJson`n", $utf8NoBom)

  $sumLines = @(
    foreach ($relative in @($files) + @("DELIVERY-MANIFEST.json") | Sort-Object) {
      $file = Get-Item -LiteralPath (Join-Path $stage $relative)
      $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant()
      "$hash  $relative"
    }
  )
  [IO.File]::WriteAllText(
    (Join-Path $stage "SHA256SUMS.txt"),
    "$($sumLines -join "`n")`n",
    $utf8NoBom
  )

  Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $candidateZip -CompressionLevel Optimal
  New-Item -ItemType Directory -Path $verify | Out-Null
  Expand-Archive -LiteralPath $candidateZip -DestinationPath $verify
  $verifyOutput = @(
    & node (Join-Path $root "tools/verify-wechat-h5-delivery.mjs") `
      $verify `
      --trusted-repo `
      $root
  )
  if (
    $LASTEXITCODE -ne 0 -or
    -not ($verifyOutput -match "^AUTHENTICATED DELIVERY PASS")
  ) {
    throw "交付包可信 Git 解压复验失败：`n$($verifyOutput -join "`n")"
  }
  $verifyOutput | ForEach-Object { Write-Output $_ }

  $zipHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $candidateZip).Hash.ToLowerInvariant()
  [IO.File]::WriteAllText(
    $candidateDigest,
    "$zipHash  $([IO.Path]::GetFileName($zipPath))`n",
    $utf8NoBom
  )
  $zipMoved = $false
  try {
    Move-Item -LiteralPath $candidateZip -Destination $zipPath
    $zipMoved = $true
    Move-Item -LiteralPath $candidateDigest -Destination $zipDigestPath
  } catch {
    if ($zipMoved -and (Test-Path -LiteralPath $zipPath)) {
      Remove-Item -LiteralPath $zipPath -Force
    }
    throw
  }
  Write-Output "交付包：$zipPath"
  Write-Output "包外 SHA-256：$zipDigestPath"
  Write-Output "ZIP SHA-256：$zipHash"
  Write-Output "packageCommit：$packageCommit"
  Write-Output "testedSourceCommit：$testedSourceCommit"
} finally {
  foreach ($candidate in @($stage, $verify)) {
    if (Test-Path -LiteralPath $candidate) {
      $safePath = Assert-TemporaryPath $candidate $tempRoot
      Remove-Item -LiteralPath $safePath -Recurse -Force
    }
  }
  foreach ($candidate in @($candidateZip, $candidateDigest)) {
    if (Test-Path -LiteralPath $candidate) {
      $safeZip = Assert-TemporaryPath $candidate $tempRoot
      Remove-Item -LiteralPath $safeZip -Force
    }
  }
}

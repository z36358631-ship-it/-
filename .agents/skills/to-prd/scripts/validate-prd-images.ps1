[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$PrdPath,
    [switch]$VerifyRemote
)

$ErrorActionPreference = 'Stop'
$resolvedPath = (Resolve-Path -LiteralPath $PrdPath).Path
$utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
$content = $utf8Strict.GetString([System.IO.File]::ReadAllBytes($resolvedPath))
$matches = [regex]::Matches($content, '!\[([^\]]*)\]\(([^)]+)\)')
$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$urls = @()

foreach ($match in $matches) {
    $alt = $match.Groups[1].Value
    $url = $match.Groups[2].Value
    $urls += $url

    if ([string]::IsNullOrWhiteSpace($alt) -or $alt.Length -gt 16 -or $alt -match '(:|\uFF1A)' -or $alt -match '^\u56FE' -or $alt -match '^\d+(\.\d+)+') {
        $errors.Add("IMAGE_ALT_NOT_FEISHU_SHORT_TITLE: $alt")
    }

    if ($url -notmatch '^https://cdn\.jsdelivr\.net/gh/z36358631-ship-it/-@[0-9a-fA-F]{40}/public/prd/[A-Za-z0-9._/-]+\.(png|jpg|jpeg|webp|gif)$') {
        $errors.Add("INVALID_IMAGE_URL: $url")
    }
}

if ($content -match '(\.\./|file://|localhost|data:image/|[A-Za-z]:\\|@master/|@main/|github\.com/.+/blob/)') {
    $errors.Add('LOCAL_OR_MUTABLE_IMAGE_SOURCE')
}

$remoteResults = @()
if ($VerifyRemote) {
    foreach ($url in ($urls | Sort-Object -Unique)) {
        try {
            $response = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 30
            $contentType = [string]$response.Headers['Content-Type']
            $extension = [System.IO.Path]::GetExtension(([uri]$url).AbsolutePath).ToLowerInvariant()
            $expectedType = switch ($extension) {
                '.png' { 'image/png' }
                '.jpg' { 'image/jpeg' }
                '.jpeg' { 'image/jpeg' }
                '.webp' { 'image/webp' }
                '.gif' { 'image/gif' }
            }
            $ok = ([int]$response.StatusCode -eq 200 -and $contentType.StartsWith($expectedType))
            $remoteResults += [pscustomobject]@{
                url = $url
                status = [int]$response.StatusCode
                contentType = $contentType
                ok = $ok
            }
            if (-not $ok) {
                $errors.Add("REMOTE_IMAGE_FAILED: $url")
            }
        }
        catch {
            $errors.Add("REMOTE_IMAGE_REQUEST_FAILED: $url")
        }
    }
}

$result = [pscustomobject]@{
    status = if ($errors.Count -eq 0) { 'PASS' } else { 'FAIL' }
    prdPath = $resolvedPath
    imageCount = $urls.Count
    uniqueImageCount = ($urls | Sort-Object -Unique).Count
    remoteVerified = if ($VerifyRemote) { ($remoteResults | Where-Object ok).Count } else { 0 }
    publicLinksVerified = if ($VerifyRemote) { ($remoteResults | Where-Object ok).Count } else { 0 }
    feishuImportVerified = $false
    verificationScope = 'Remote validation checks only public HTTP status and MIME type; it does not verify Feishu image transfer.'
    warnings = @($warnings | Sort-Object -Unique)
    errors = @($errors | Sort-Object -Unique)
}

$result | ConvertTo-Json -Depth 4
if ($errors.Count -gt 0) { exit 1 }

[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$repoRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$paths=@('public/steam-mac-integration/demo.html','public/steam-mac-integration/review.html')
Push-Location $repoRoot
$previousIndex=$env:GIT_INDEX_FILE
$publishIndex=Join-Path ([IO.Path]::GetTempPath()) ('steam-pages-'+[guid]::NewGuid().ToString('N')+'.index')
try {
    git fetch origin refs/heads/master:refs/remotes/origin/master
    if($LASTEXITCODE -ne 0){throw 'Cannot fetch Pages source'}
    $base=(git rev-parse refs/remotes/origin/master).Trim()
    $env:GIT_INDEX_FILE=$publishIndex
    git read-tree $base
    if($LASTEXITCODE -ne 0){throw 'Cannot create isolated publication index'}
    foreach($file in $paths){
        if(-not (Test-Path -LiteralPath $file -PathType Leaf)){throw "Missing publication file: $file"}
        $blob=(git hash-object -w -- $file).Trim()
        if($LASTEXITCODE -ne 0){throw "Cannot stage $file"}
        git update-index --add --cacheinfo "100644,$blob,$file"
        if($LASTEXITCODE -ne 0){throw "Cannot index $file"}
    }
    $tree=(git write-tree).Trim()
    $changed=@(git diff-tree --no-commit-id --name-only -r $base $tree)
    if(@($changed | Where-Object {$_ -notin $paths}).Count){throw 'Publication diff exceeds approved Mac Steam files'}
    if(-not $changed.Count){Write-Output "Already published at $base";exit 0}
    $commit=(git commit-tree $tree -p $base -m 'Publish Mac rebuilt Steam integration demo and page review').Trim()
    if($LASTEXITCODE -ne 0){throw 'Cannot create publication commit'}
    git push origin "${commit}:refs/heads/master"
    if($LASTEXITCODE -ne 0){throw 'Publication rejected; no force push used. Refresh and retry.'}
    [ordered]@{commit=$commit;base=$base;files=$paths;review='https://z36358631-ship-it.github.io/-/public/steam-mac-integration/review.html';demo='https://z36358631-ship-it.github.io/-/public/steam-mac-integration/demo.html'} | ConvertTo-Json | Set-Content (Join-Path $PSScriptRoot 'Pages发布记录.json') -Encoding utf8
    Write-Output "Published $commit"
} finally {
    $env:GIT_INDEX_FILE=$previousIndex
    if(Test-Path -LiteralPath $publishIndex){Remove-Item -LiteralPath $publishIndex}
    Pop-Location
}

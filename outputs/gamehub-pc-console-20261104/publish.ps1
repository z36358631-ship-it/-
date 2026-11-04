$ErrorActionPreference='Stop'
$repoRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$publicationFiles=@(
 'public/gamehub-pc-console-demo/index.html',
 'outputs/gamehub-pc-console-20261104/homeplay.js',
 'outputs/gamehub-pc-console-20261104/homeplay.css',
 'outputs/gamehub-pc-console-20261104/verify-homeplay.cjs',
 'outputs/gamehub-pc-console-20261104/homeplay-verification.json',
 'outputs/gamehub-pc-console-20261104/homeplay-review.md',
 'outputs/gamehub-pc-console-20261104/assets/homeplay/hades-gameplay.mp4',
 'outputs/gamehub-pc-console-20261104/assets/homeplay/hades-frame-0.jpg',
 'outputs/gamehub-pc-console-20261104/assets/homeplay/source.json',
 'outputs/gamehub-pc-console-20261104/assets/homeplay/verification.json',
 'outputs/gamehub-pc-console-20261104/assets/homeplay/prepare.py',
 'docs/superpowers/specs/2026-11-04-home-play-first-design.md',
 'docs/superpowers/plans/2026-11-04-home-play-first-plan.md',
 'outputs/gamehub-pc-console-20261104/console.js',
 'outputs/gamehub-pc-console-20261104/console.css',
 'outputs/gamehub-pc-console-20261104/immersive.js',
 'outputs/gamehub-pc-console-20261104/immersive.css',
 'outputs/gamehub-pc-console-20261104/device.js',
 'outputs/gamehub-pc-console-20261104/device.css',
 'outputs/gamehub-pc-console-20261104/header.js',
 'outputs/gamehub-pc-console-20261104/header.css',
 'outputs/gamehub-pc-console-20261104/scene-sources.json',
 'outputs/gamehub-pc-console-20261104/fetch-scenes.py',
 'outputs/gamehub-pc-console-20261104/assets/scenes/elden.jpg',
 'outputs/gamehub-pc-console-20261104/assets/scenes/hades.jpg',
 'outputs/gamehub-pc-console-20261104/assets/scenes/cyber.jpg',
 'outputs/gamehub-pc-console-20261104/assets/scenes/wukong.jpg',
 'outputs/gamehub-pc-console-20261104/review.css',
 'outputs/gamehub-pc-console-20261104/shell.html',
 'outputs/gamehub-pc-console-20261104/panel.js',
 'outputs/gamehub-pc-console-20261104/baseline.json',
 'outputs/gamehub-pc-console-20261104/build.py',
 'outputs/gamehub-pc-console-20261104/build-manifest.json',
 'outputs/gamehub-pc-console-20261104/change-scope.json',
 'outputs/gamehub-pc-console-20261104/review-panel-decision.json',
 'outputs/gamehub-pc-console-20261104/revision-scope.json',
 'outputs/gamehub-pc-console-20261104/revision-review.md',
 'outputs/gamehub-pc-console-20261104/review.md',
 'outputs/gamehub-pc-console-20261104/verify.cjs',
 'outputs/gamehub-pc-console-20261104/verify-revision.cjs',
 'outputs/gamehub-pc-console-20261104/verify-publication.py',
 'outputs/gamehub-pc-console-20261104/capture-baseline.cjs',
 'outputs/gamehub-pc-console-20261104/verification.json',
 'outputs/gamehub-pc-console-20261104/publish.ps1',
 'docs/superpowers/plans/2026-11-04-gamehub-pc-console.md',
 'docs/superpowers/plans/2026-11-04-gamehub-multidevice-revision.md',
 'docs/superpowers/specs/2026-11-04-gamehub-play-now-revision-design.md'
)
$previousIndex=$env:GIT_INDEX_FILE
$publishIndex=Join-Path ([IO.Path]::GetTempPath()) ('gh-pc-console-'+[guid]::NewGuid().ToString('N')+'.index')
Push-Location $repoRoot
try {
 $originalHead=(git rev-parse HEAD).Trim()
 $realIndex=(git rev-parse --git-path index).Trim()
 $originalIndexHash=(Get-FileHash -LiteralPath $realIndex).Hash
 $baselineHash=(Get-FileHash -LiteralPath 'public/gamehub-70-home-demo/index.html').Hash
 git fetch origin refs/heads/master:refs/remotes/origin/master
 if($LASTEXITCODE -ne 0){throw 'Cannot fetch Pages source'}
 $base=(git rev-parse refs/remotes/origin/master).Trim()
 $known='95ec86ac9008575f4a8f9bacf6b0d973c8377e7a'
 $remoteChanges=@(git diff --name-only $known $base -- $publicationFiles)
 if($remoteChanges.Count){throw ('Scoped remote changes require reconciliation: '+($remoteChanges -join ', '))}
 $env:GIT_INDEX_FILE=$publishIndex
 git read-tree $base
 if($LASTEXITCODE -ne 0){throw 'Cannot initialize isolated index'}
 foreach($file in $publicationFiles){
  if(!(Test-Path -LiteralPath $file)){throw "Missing publication file: $file"}
  $blob=(git hash-object -w -- $file).Trim()
  if($LASTEXITCODE -ne 0){throw "Cannot create blob: $file"}
  git update-index --add --cacheinfo "100644,$blob,$file"
  if($LASTEXITCODE -ne 0){throw "Cannot stage: $file"}
 }
 $tree=(git write-tree).Trim()
 $changed=@(git diff-tree --no-commit-id --name-only -r $base $tree)
 if(!$changed.Count -or @($changed | Where-Object {$_ -notin $publicationFiles}).Count){throw 'Publication scope check failed'}
 $commit=(git commit-tree $tree -p $base -m 'Make homepage play-first with official gameplay and library-first wide navigation').Trim()
 if($LASTEXITCODE -ne 0){throw 'Cannot create publication commit'}
 git push origin "${commit}:refs/heads/master"
 if($LASTEXITCODE -ne 0){throw 'Normal push rejected; reconcile without force push'}
 $env:GIT_INDEX_FILE=$previousIndex
 if((git rev-parse HEAD).Trim() -ne $originalHead){throw 'Workspace HEAD changed unexpectedly'}
 if((Get-FileHash -LiteralPath $realIndex).Hash -ne $originalIndexHash){throw 'Workspace index changed unexpectedly'}
 if((Get-FileHash -LiteralPath 'public/gamehub-70-home-demo/index.html').Hash -ne $baselineHash){throw 'Primary demo changed unexpectedly'}
 $record=[ordered]@{commit=$commit;base=$base;files=$changed;headPreserved=$true;indexPreserved=$true;primaryDemoPreserved=$true;url='https://z36358631-ship-it.github.io/-/public/gamehub-pc-console-demo/'}
 $record | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'publication.json') -Encoding utf8
 $record | ConvertTo-Json -Compress
} finally {
 $env:GIT_INDEX_FILE=$previousIndex
 if(Test-Path -LiteralPath $publishIndex){Remove-Item -LiteralPath $publishIndex}
 Pop-Location
}

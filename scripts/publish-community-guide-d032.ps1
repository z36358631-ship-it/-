param([ValidateSet('Images','Release')][string]$Phase='Release')
$ErrorActionPreference='Stop'
$taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $taskRoot
$taskOut=Join-Path $taskRoot 'outputs/community-guide-prd-20261021'
$taskPrd='public/prd/community-guide-20261020/guide-prd.md'
$taskAudit=Get-Content -LiteralPath "$taskOut/public-audit.json" -Raw | ConvertFrom-Json
if(-not $taskAudit.ok -or $taskAudit.total -ne $taskAudit.passed){throw 'Public audit must pass.'}
if((Get-FileHash -LiteralPath 'previews/community-guide/index.html').Hash.ToLowerInvariant() -ne $taskAudit.publicHtmlSha256){throw 'HTML differs from audit.'}
$taskMarkdown=Get-Content -LiteralPath $taskPrd -Raw
$taskImages=@([regex]::Matches($taskMarkdown,'!\[[^\]]*\]\(([^)]+)\)') | ForEach-Object {
 $taskName=($_.Groups[1].Value -split '/')[-1]
 if($taskName -notmatch '^[a-z0-9-]+\.png$'){throw 'Invalid image filename.'}
 "public/prd/community-guide-20261020/images/$taskName"
} | Sort-Object -Unique)
if($taskImages.Count -lt 20){throw 'Incomplete PRD images.'}
foreach($taskFile in $taskImages){if(-not(Test-Path -LiteralPath $taskFile)){throw "Missing image: $taskFile"}}
$taskBeforeHead=git rev-parse HEAD
$taskIndexPath=git rev-parse --git-path index
$taskBeforeIndex=(Get-FileHash -LiteralPath $taskIndexPath).Hash
$taskOldIndex=$env:GIT_INDEX_FILE
function Invoke-TaskGit {
 param([string[]]$Arguments)
 $taskGitResult=& git -c http.proxy=http://127.0.0.1:7890 -c http.version=HTTP/1.1 -c http.sslBackend=openssl @Arguments
 if($LASTEXITCODE -ne 0){throw "Git failed: $($Arguments[0])"}
 return $taskGitResult
}
try{
 $env:GIT_INDEX_FILE=Join-Path $taskOut "publish-$($Phase.ToLower()).index"
 if($Phase -eq 'Images'){
  Invoke-TaskGit @('read-tree','--empty') | Out-Null
  Invoke-TaskGit (@('-c','core.autocrlf=false','add','--')+$taskImages) | Out-Null
  $taskTree=Invoke-TaskGit @('write-tree')
  $taskTreeFiles=@(Invoke-TaskGit @('ls-tree','-r','--name-only',$taskTree))
  if($taskTreeFiles.Count -ne $taskImages.Count -or @($taskTreeFiles | Where-Object {$_ -notin $taskImages}).Count){throw 'Unexpected image snapshot files.'}
  $taskCommit=Invoke-TaskGit @('commit-tree',$taskTree,'-m','docs: snapshot current community guide PRD images')
  $taskBranch='refs/heads/codex/community-guide-images-d032-20261021'
  Invoke-TaskGit @('push','origin',"${taskCommit}:$taskBranch") | Out-Null
  $taskImageResult=@{commit=$taskCommit;files=$taskTreeFiles;imageBase="https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$taskCommit/public/prd/community-guide-20261020/images/";time=(Get-Date).ToUniversalTime().ToString('o')}
  $taskImageResult | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath "$taskOut/publish-images.json" -Encoding utf8
  $taskImageResult | ConvertTo-Json -Depth 5
 }else{
  if($taskMarkdown -match 'IMAGE_BASE|DOC_COMMIT'){throw 'Unresolved publication placeholders.'}
  $taskQuality=Get-Content -LiteralPath "$taskOut/prd-quality-review.json" -Raw | ConvertFrom-Json
  if($taskQuality.errors.Count -or $taskQuality.result -ne 'Pass'){throw 'PRD review-draft structural quality errors remain.'}
  if(-not $taskMarkdown.Contains('评审稿')){throw 'The document must remain explicitly a review draft.'}
  $taskVerification=Get-Content -LiteralPath "$taskOut/document-render.json" -Raw | ConvertFrom-Json
  if($taskVerification.total -ne $taskVerification.passed){throw 'Document verification must pass.'}
  $taskImageRelease=Get-Content -LiteralPath "$taskOut/publish-images.json" -Raw | ConvertFrom-Json
  if(-not $taskMarkdown.Contains($taskImageRelease.imageBase)){throw 'PRD must use current immutable image snapshot.'}
  foreach($taskFile in $taskAudit.files){
   if((Get-FileHash -LiteralPath $taskFile.file).Hash.ToLowerInvariant() -ne $taskFile.sha256){throw "File differs from audit: $($taskFile.file)"}
  }
  $taskDocuments=@('prd/社区三期/20261020/【PRD】盖世游戏-攻略站共建V1.0.md',$taskPrd,'public/prd/community-guide-20261020/index.html','public/prd/community-guide-20261020/README.md','scripts/publish-community-guide-d032.ps1')
  $taskFiles=@($taskAudit.allowlist)+$taskImages+$taskDocuments | Sort-Object -Unique
  Invoke-TaskGit @('fetch','origin','master') | Out-Null
  $taskParent=Invoke-TaskGit @('rev-parse','FETCH_HEAD')
  $taskRemote=Invoke-TaskGit @('ls-remote','origin','refs/heads/master')
  if(($taskRemote -split '\s+')[0] -ne $taskParent){throw 'Remote changed; recheck before publishing.'}
  Invoke-TaskGit @('read-tree',$taskParent) | Out-Null
  Invoke-TaskGit (@('-c','core.autocrlf=false','add','--')+$taskFiles) | Out-Null
  $taskChanged=@(Invoke-TaskGit @('-c','core.quotepath=false','diff','--cached','--name-only',$taskParent))
  if(-not $taskChanged.Count -or @($taskChanged | Where-Object {$_ -notin $taskFiles}).Count){throw 'Changes escaped publication allowlist.'}
  $taskTree=Invoke-TaskGit @('write-tree')
  $taskCommit=Invoke-TaskGit @('commit-tree',$taskTree,'-p',$taskParent,'-m','feat: update community guide editor and illustrated PRD V1.1')
  Invoke-TaskGit @('push','--atomic','origin',"${taskCommit}:refs/heads/master","${taskCommit}:refs/heads/codex/community-guide-d032-20261021") | Out-Null
  $taskRelease=@{commit=$taskCommit;parent=$taskParent;files=$taskChanged;imageCommit=$taskImageRelease.commit;demoSha256=$taskAudit.publicHtmlSha256;demoUrl='https://z36358631-ship-it.github.io/-/previews/community-guide/';prdUrl='https://z36358631-ship-it.github.io/-/public/prd/community-guide-20261020/';time=(Get-Date).ToUniversalTime().ToString('o')}
  $taskRelease | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath "$taskOut/publish-release.json" -Encoding utf8
  $taskRelease | ConvertTo-Json -Depth 5
 }
}finally{
 if($null -eq $taskOldIndex){Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue}else{$env:GIT_INDEX_FILE=$taskOldIndex}
 if((git rev-parse HEAD) -ne $taskBeforeHead -or (Get-FileHash -LiteralPath $taskIndexPath).Hash -ne $taskBeforeIndex){throw 'Original checkout or staging index changed.'}
}

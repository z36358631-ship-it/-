param([ValidateSet('assets','documents')][string]$Phase='assets')
$ErrorActionPreference='Stop'
$guideRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $guideRoot
$guideEvidence=Join-Path $guideRoot 'outputs/community-guide-prd-20261020'
$guideAudit=Get-Content -LiteralPath "$guideEvidence/public-audit.json" -Raw | ConvertFrom-Json
if($guideAudit.total -ne $guideAudit.passed -or (Get-FileHash -LiteralPath 'previews/community-guide/index.html').Hash.ToLowerInvariant() -ne $guideAudit.publicHtmlSha256){throw '公开文件未绑定通过的当前检查。'}
if($Phase -eq 'assets'){
 $guideFiles=@(Get-ChildItem -LiteralPath 'previews/community-guide' -Recurse -File | ForEach-Object {[IO.Path]::GetRelativePath($guideRoot,$_.FullName).Replace('\','/')})+@(Get-ChildItem -LiteralPath 'public/prd/community-guide-20261020/images' -File | ForEach-Object {[IO.Path]::GetRelativePath($guideRoot,$_.FullName).Replace('\','/')})+@('scripts/publish-community-guide.ps1')
}else{
 $guideFiles=@('prd/社区三期/20261020/【PRD】盖世游戏-攻略站共建V1.0.md','public/prd/community-guide-20261020/guide-prd.md','public/prd/community-guide-20261020/index.html','public/prd/community-guide-20261020/README.md')
}
git -c http.proxy=http://127.0.0.1:7890 -c http.version=HTTP/1.1 -c http.sslBackend=openssl fetch origin master
if($LASTEXITCODE -ne 0){throw 'fetch失败。'}
$guideParent=git rev-parse FETCH_HEAD
$guideRemote=git -c http.proxy=http://127.0.0.1:7890 -c http.version=HTTP/1.1 -c http.sslBackend=openssl ls-remote origin refs/heads/master
if($LASTEXITCODE -ne 0 -or ($guideRemote -split '\s+')[0] -ne $guideParent){throw '远端变化，停止发布。'}
foreach($guideFile in $guideFiles){
 $guidePrior=git ls-tree $guideParent -- $guideFile
 if($guidePrior){throw "目标已存在，请先核对既有内容：$guideFile"}
}
$guideIndexBefore=$env:GIT_INDEX_FILE
try{
 $env:GIT_INDEX_FILE=Join-Path $guideEvidence "publish-$Phase.index"
 git read-tree $guideParent
 if($LASTEXITCODE -ne 0){throw 'read-tree失败。'}
 git -c core.autocrlf=false add -- $guideFiles
 if($LASTEXITCODE -ne 0){throw 'add失败。'}
 $guideChanged=@(git -c core.quotepath=false diff --cached --name-only $guideParent)
 if(@($guideChanged | Where-Object {$_ -notin $guideFiles}).Count){throw '含非白名单路径。'}
 if($guideChanged.Count -ne $guideFiles.Count){throw '白名单数量与实际变化不一致。'}
 $guideTree=git write-tree
 if($LASTEXITCODE -ne 0){throw 'write-tree失败。'}
 $guideCommit=git commit-tree $guideTree -p $guideParent -m "docs: publish community guide demo and illustrated PRD $Phase"
 if($LASTEXITCODE -ne 0){throw 'commit-tree失败。'}
 git update-ref refs/heads/codex/community-guide-prd-20261020 $guideCommit
 if($LASTEXITCODE -ne 0){throw 'update-ref失败。'}
 git -c http.proxy=http://127.0.0.1:7890 -c http.version=HTTP/1.1 -c http.sslBackend=openssl push --atomic origin "${guideCommit}:refs/heads/master" "${guideCommit}:refs/heads/codex/community-guide-prd-20261020"
 if($LASTEXITCODE -ne 0){throw '推送失败，不强推。'}
 $guideResult=@{phase=$Phase;commit=$guideCommit;parent=$guideParent;files=$guideChanged;demoSha256=$guideAudit.publicHtmlSha256;demoUrl='https://z36358631-ship-it.github.io/-/previews/community-guide/';prdUrl='https://z36358631-ship-it.github.io/-/public/prd/community-guide-20261020/';imageBase="https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$guideCommit/public/prd/community-guide-20261020/images/";time=(Get-Date).ToUniversalTime().ToString('o')}
 $guideResult | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath "$guideEvidence/publish-$Phase.json" -Encoding utf8
 $guideResult | ConvertTo-Json -Depth 5
}finally{
 if($null -eq $guideIndexBefore){Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue}else{$env:GIT_INDEX_FILE=$guideIndexBefore}
}

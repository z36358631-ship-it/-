param(
  [ValidateSet('assets','documents')][string]$Phase='assets',
  [Parameter(Mandatory=$true)][string]$EvidenceDirectory,
  [string]$VerifiedSha256
)
$ErrorActionPreference='Stop'
$platformRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $platformRoot
$platformEvidence=[IO.Path]::GetFullPath((Join-Path $platformRoot $EvidenceDirectory))
New-Item -ItemType Directory -Force -Path $platformEvidence | Out-Null
$platformDestination='previews/developer-platform'
$platformImageDestination='public/prd/developer-platform'
$platformSource='prd/发行平台专项/完整开发者与运营管理平台-合并版.html'
if($Phase -eq 'assets'){
  if($VerifiedSha256 -notmatch '^[a-fA-F0-9]{64}$' -or (Get-FileHash -LiteralPath $platformSource).Hash -ne $VerifiedSha256){throw '提供与已验收源文件一致的SHA256后再发布。'}
  New-Item -ItemType Directory -Force -Path $platformDestination | Out-Null
  New-Item -ItemType Directory -Force -Path $platformImageDestination | Out-Null
  Copy-Item -LiteralPath $platformSource -Destination "$platformDestination/index.html"
  $platformImages=@('00-flow.png','01-records.png','02-records-exceptions.png')
  foreach($platformImage in $platformImages){Copy-Item -LiteralPath (Join-Path $platformEvidence $platformImage) -Destination "$platformImageDestination/$platformImage"}
  $platformFiles=@($platformSource,'demos/开发者后台一期/src/runtime/publisher-redemption-records.js','demos/开发者后台一期/src/styles/publisher-redemption-records.css',"$platformDestination/index.html","$platformDestination/README.md",'scripts/publish-developer-platform.ps1')+@($platformImages | ForEach-Object {"$platformImageDestination/$_"})
}else{
  $platformFiles=@('prd/发行平台专项/运营后台PRD/11-兑换码兑换记录PRD.md','prd/发行平台专项/c端/【PRD】发行平台-桌面客户端（macOS _ Windows）V1.0/【PRD】发行平台-桌面客户端（macOS _ Windows）V1.1-评审修订版.md')
}
git -c http.proxy=http://127.0.0.1:7890 -c http.version=HTTP/1.1 -c http.sslBackend=openssl fetch origin master
if($LASTEXITCODE -ne 0){throw '无法读取发布分支。'}
$platformParent=git rev-parse refs/remotes/origin/master
$platformRemote=git -c http.proxy=http://127.0.0.1:7890 -c http.version=HTTP/1.1 -c http.sslBackend=openssl ls-remote origin refs/heads/master
if($LASTEXITCODE -ne 0 -or ($platformRemote -split '\s+')[0] -ne $platformParent){throw '远端已更新，需重新核对后发布。'}
$platformOriginalIndex=$env:GIT_INDEX_FILE
try{
  $env:GIT_INDEX_FILE=Join-Path $platformEvidence "publish-$Phase.index"
  git read-tree $platformParent
  if($LASTEXITCODE -ne 0){throw '无法准备发布快照。'}
  git -c core.autocrlf=false add -- $platformFiles
  if($LASTEXITCODE -ne 0){throw '无法加入指定发布文件。'}
  $platformChanged=@(git -c core.quotepath=false diff --cached --name-only $platformParent)
  if(@($platformChanged | Where-Object {$_ -notin $platformFiles}).Count){throw '发布快照含未授权路径。'}
  if($platformChanged.Count){
    $platformTree=git write-tree
    if($LASTEXITCODE -ne 0){throw '无法生成发布文件树。'}
    $platformCommit=git commit-tree $platformTree -p $platformParent -m "docs: update unified developer and operations demo $Phase"
    if($LASTEXITCODE -ne 0){throw '无法生成发布提交。'}
    git update-ref refs/heads/codex/developer-platform-publish $platformCommit
    if($LASTEXITCODE -ne 0){throw '无法保存发布引用。'}
    git -c http.proxy=http://127.0.0.1:7890 -c http.version=HTTP/1.1 -c http.sslBackend=openssl push --atomic origin "${platformCommit}:refs/heads/master" "${platformCommit}:refs/heads/codex/developer-platform-publish"
    if($LASTEXITCODE -ne 0){throw '发布推送失败；未尝试强制推送。'}
  }else{$platformCommit=$platformParent}
  $platformResult=@{phase=$Phase;commit=$platformCommit;parent=$platformParent;files=$platformChanged;noChanges=($platformChanged.Count -eq 0);demoUrl='https://z36358631-ship-it.github.io/-/previews/developer-platform/';operationsUrl='https://z36358631-ship-it.github.io/-/previews/developer-platform/#ops/operations/P01-11';imageBase="https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$platformCommit/public/prd/developer-platform/";pushedAt=(Get-Date).ToUniversalTime().ToString('o')}
  $platformResult | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $platformEvidence "publish-$Phase.json") -Encoding utf8
  $platformResult | ConvertTo-Json -Depth 5
}finally{
  if($null -eq $platformOriginalIndex){Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue}else{$env:GIT_INDEX_FILE=$platformOriginalIndex}
}

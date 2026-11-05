param([ValidateSet('init','implementation','machine','review','delivery')][string]$Stage='init')
$ErrorActionPreference='Stop'
$runner='C:/Users/z3635/.codex/skills/gamehub-product-workflow/scripts/workflow-run.ps1'
$run=Join-Path $PSScriptRoot 'run.json'
$card=Join-Path $PSScriptRoot 'state.md'
function Step([string]$Id,[string]$Message,[string[]]$Evidence) {
 & $runner -Action start-step -RunPath $run -StepId $Id | Out-Null
 & $runner -Action pass -RunPath $run -StepId $Id -Message $Message -Evidence $Evidence -Reviewer 'root，主管核验' | Out-Null
}
if($Stage -eq 'init') {
 $contract=@{goal='首页三个内容方向实现、模拟场景走查和调优';inScope=@('首页概念Demo','四类用户场景','横竖与平板','模拟反馈调优','Git与Pages固定实验地址');outOfScope=@('7.0内核','真实用户招募','真实支付','正式PRD替换');inputs=@('用户批准的三方向','现有暗色Demo','screen-08/15/36');deliverables=@('public/gamehub-home-lab/index.html','场景反馈与验证记录');changes=@('D058','D059','D060','D061','D062')} | ConvertTo-Json -Compress
 & $runner -Action start -RunPath $run -RequirementId 'GUANWANGGAID-64-home-lab' -CardPath $card -ContractJson $contract -RequiredSteps @('S1','S2','S3','S4','S5','S6','S7','S8') | Out-Null
 Step 'S1' '已定位父需求与当前方向实验' @($card)
 Step 'S2' '恢复最新用户决定、真实素材和商业边界' @($card,(Join-Path $PSScriptRoot 'sources.json'))
 Step 'S3' '三方向与交叉场景编译为实施计划' @('docs/superpowers/plans/2026-11-05-gamehub-home-lab.md')
 Step 'S4' '已截图当前HTML，核对暗色骨架与导航；新概念非实机逐像素复刻' @((Join-Path $PSScriptRoot 'baseline.json'),(Join-Path $PSScriptRoot 'baseline-current.png'))
 & $runner -Action start-step -RunPath $run -StepId 'S5' | Out-Null
} elseif($Stage -eq 'implementation') {
 & $runner -Action pass -RunPath $run -StepId 'S5' -Message '四方向可操作内容、价格来源与离线HTML已生成' -Evidence @((Join-Path $PSScriptRoot 'build-manifest.json')) -Reviewer 'root' | Out-Null
} elseif($Stage -eq 'machine') {
 Step 'S6' '浏览器场景/交互/布局/素材验证通过' @((Join-Path $PSScriptRoot 'verification.json'))
} elseif($Stage -eq 'review') {
 Step 'S7' '主管审图与独立模拟用户场景走查完成，具体问题已处理' @((Join-Path $PSScriptRoot 'review.md'))
} else {
 Step 'S8' '各层级验证与发布结果独立记录，真实用户反馈未执行' @((Join-Path $PSScriptRoot 'publication.json'),(Join-Path $PSScriptRoot 'live-verification.json'))
}
$result=Get-Content -LiteralPath $run -Raw | ConvertFrom-Json
@{stage=$Stage;status=$result.status;revision=$result.revision} | ConvertTo-Json -Compress

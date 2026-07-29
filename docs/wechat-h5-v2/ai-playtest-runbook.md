# 正式 AI 试玩运行手册

## 适用范围

本手册用于 `6 类 AI 玩家 × 3 款游戏 × 每款 3 局` 的正式 browser-touch 证据采集。runner 只采集机器事实；外部 AI 玩家必须按 [正式 AI 玩家提示词](./ai-player-prompts.md) 在打开的浏览器中完成操作并填写主观报告。

runner 不会自动玩游戏，不会调用 debug API，不会生成分数，也不会把 `report-draft.json` 冒充正式 `report.json`。

## 1. 冻结源码

在干净、detached 的工作树中运行。记下 40 位小写 commit：

```powershell
$Repo = 'C:\Users\z3635\官网改动'
$Commit = (git -C $Repo rev-parse HEAD).Trim()
$Worktree = "C:\ai-playtest-worktrees\$Commit"
$EvidenceRoot = "C:\ai-playtests\$Commit"

git -C $Repo worktree add --detach $Worktree $Commit
Set-Location "$Worktree\games\wechat-h5-v2"

if ((git rev-parse HEAD).Trim() -ne $Commit) { throw 'SHA_MISMATCH' }
if (@(git status --porcelain --untracked-files=all -- .).Count -ne 0) {
  throw 'GAME_SOURCE_NOT_CLEAN'
}
```

runner 启动前会再次检查 `--expected-commit` 与 `HEAD` 完全一致，并拒绝源码脏工作树。`test-results/ai-playtests/` 下的既有证据不计为源码修改。

runner 在试玩结束、写入最终证据前会再次执行同一 HEAD/clean 检查。首尾任一门禁失败，或两次 HEAD 不一致，整个单元均为 `INCOMPLETE`。

## 2. 安装、验收和单一服务

```powershell
Set-Location "$Worktree\games\wechat-h5-v2"
npm.cmd ci
npm.cmd run verify
$env:PORT = '4173'
node tools/assets/serve-dist.mjs
```

固定普通入口：

- `http://127.0.0.1:4173/ricochet-crew/`
- `http://127.0.0.1:4173/monster-night-market/`
- `http://127.0.0.1:4173/three-lane-squad/`

不得添加查询参数。不要同时启动 Vite 开发服务器参与正式证据。

runner 只接受上述精确 URL：协议、主机、端口、路径和末尾 `/` 必须一致，不允许 search、hash、额外路径或跳转。启动后及每次遥测轮询都会重新核对当前 URL。

在打开浏览器前，runner 会从 `--expected-commit` 的 Git tree 列举 `dist/<gameId>/` 的全部 blob，逐个读取 Git blob 并与 4173 服务返回的字节计算 SHA-256。试玩结束后再次执行同一证明；任一文件缺失、跳转、状态异常、内容不一致或首尾 aggregate 不一致都会作废。证明写入 `session-evidence.json.servedDist`，不依赖页面自行声明的 commit 字段。

### 端口冲突

先确认 4173 的占用者：

```powershell
Get-NetTCPConnection -LocalPort 4173 -State Listen |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

只停止本轮自己启动且 PID 已确认的服务。未知进程占用时暂停，不得直接终止或静默换端口。服务结束后验证：

```powershell
Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue
```

预期无输出。

## 3. 执行一个矩阵单元

每个输出目录必须是 `<root>/<round>/<reviewer>-<game>`，且运行前不存在。示例：

```powershell
$Role = 'action'
$Game = 'ricochet-crew'
$Cell = Join-Path $EvidenceRoot "baseline\$Role-$Game"
$DescriptorRoot = Join-Path $EvidenceRoot 'descriptors'
$DraftRoot = Join-Path $EvidenceRoot 'drafts'
$InvalidRoot = Join-Path $EvidenceRoot 'invalid'
$OperatorCaptureRoot = Join-Path $EvidenceRoot "operator-captures\$Role-$Game"
$Descriptor = Join-Path $DescriptorRoot "$Role-$Game.json"
$Draft = Join-Path $DraftRoot "$Role-$Game-report-draft.json"

New-Item -ItemType Directory -Force `
  -Path $DescriptorRoot,$DraftRoot,$InvalidRoot,$OperatorCaptureRoot |
  Out-Null

node tools/run-ai-playtest-session.mjs `
  --round baseline `
  --reviewer $Role `
  --game $Game `
  --expected-commit $Commit `
  --output $Cell `
  --driver-enabled true `
  --driver-descriptor-path $Descriptor `
  --draft-output $Draft `
  --invalid-root $InvalidRoot `
  --timeout-ms 1800000 `
  --headed true
```

在终端 A 保持 runner 运行。等 `$Descriptor` 出现后，在终端 B 重新执行上方从 `$Role` 到 `$Descriptor` 的变量定义，再启动 heartbeat：

```powershell
node tools/ai-playtest-heartbeat.mjs --descriptor $Descriptor
```

协议没有 `disconnect` 命令。完成或作废时停止 heartbeat；runner 的 watchdog 会判定连接结束。不要伪造 `disconnect` 请求。

runner 默认根据 `$Game` 打开 4173 下对应路径。`--headed` 只显示页面，不会自动产生输入。玩家必须在终端 C 通过受限 CLI 发送 browser touch，完成恰好三局：

```powershell
node tools/ai-playtest-driver-cli.mjs --descriptor $Descriptor ready
node tools/ai-playtest-driver-cli.mjs --descriptor $Descriptor capture --out (Join-Path $OperatorCaptureRoot 'frame-001.png')
node tools/ai-playtest-driver-cli.mjs --descriptor $Descriptor visible
node tools/ai-playtest-driver-cli.mjs --descriptor $Descriptor tap --x 195 --y 730 --frame 1
node tools/ai-playtest-driver-cli.mjs --descriptor $Descriptor begin --x 195 --y 730 --frame 2
node tools/ai-playtest-driver-cli.mjs --descriptor $Descriptor move --gesture <gestureId> --x 195 --y 790
node tools/ai-playtest-driver-cli.mjs --descriptor $Descriptor end --gesture <gestureId> --x 195 --y 790
```

每次操作必须按 `capture → 实际检查新图片 → visible → touch` 循环。`capture` 输出的 `frameSeq` 是后续 `tap`/`begin --frame` 的依据；每张人工检查图使用新的文件名，因为 CLI 以 `wx` 创建且拒绝覆盖。检查图保存在 `$OperatorCaptureRoot`，不得放入正式 `$Cell`。

玩家操作只允许 `capture`、`visible` 和 touch（`tap`、`begin`、`move`、`end`）；`ready`、`heartbeat` 只是连接与状态控制命令，不算玩家操作。禁止使用 debug、CDP、`evaluate`、storage 读写、固定 seed、改 speed 或 solver，也不得绕过 CLI 直接调用协议。

CLI 与 heartbeat 共用以下状态文件：

- `<descriptor>.sequence.json`：严格非负 safe integer 的纯文本 request sequence；
- `<descriptor>.frame.json`：严格非负 safe integer 的纯文本 frame；
- `<descriptor>.sequence.lock/owner.json`：`pid`、UUID `ownerToken` 和 `createdAt`。

同一 owner 锁覆盖两个 sidecar 的读取、序号分配、完整 POST、响应处理，以及两个 same-directory 临时文件的分别原子提交。对象 JSON、浮点数、负数、尾随字符或只有一个 sidecar 都会 fail closed。只有成功的 `ready`/`capture` 响应能更新 frame；其他命令仍提交已使用的 request sequence，但不更新 frame。显式 `--frame` 只与共享 frame 比对，不能覆盖或推进它。

不得手工修改或删除 sidecar、临时文件、owner 元数据或锁目录。正常释放会复核 `ownerToken`，进程只能删除自己的锁。runner cleanup 不按固定超时强拆：锁存在时，只有 owner 元数据有效、达到最小年龄且 `process.kill(pid, 0)` 明确返回 `ESRCH` 的死 owner 才会在二次 token 核验后原子移入 cleanup quarantine 并删除；owner 活跃、`EPERM`/未知状态、锁过新、元数据缺失或损坏均产生稳定 cleanup error，使整个单元为 `INCOMPLETE`。随后 cleanup 必须取得自己的 owner 锁，才能删除两个 sidecar及两类同目录临时文件。

每局结算后停止 touch，等待 runner/driver 返回 `runRecorded(N)`；未收到该确认不得开始下一局，也不得用截图、`visible` 或自行计数代替。第三局收到 `runRecorded(3)` 后立即停止，不发送第四局 touch；heartbeat 随 runner 结束或失败停止。

启动后 runner 会：

1. 在创建输出目录前校验 commit 和源码 clean。
2. 导航后记录页面实际 URL。
3. 只读检查测试/debug 全局变量不存在。
4. 检查生产遥测中的 `testMode` 全为 `false`。
5. 页面未公开 `testMode` 或 `timeScale` 时记录 `unavailable`，不注入探针；公开时强制 `false` 和 `1`。
6. 将 `won/win` 规范为 `win`，将 `lost/loss` 规范为 `loss`；`unknown` 会使会话为 `INCOMPLETE`。
7. 从明确的 `first_input`、`first_payoff` 生产事件计算时间；缺失时保留 `null` 并写明不推断。任一局缺失 `first_input` 会使整个单元为 `INCOMPLETE`，`first_payoff` 可缺失。
8. 按生产遥测顺序强制恰好三组 `run_start → run_end`。同一次轮询首次看到同一局 start+end、重复、乱序、重叠或出现第四局都会立即作废；不会截断为前三局。

## 4. 输出与报告

runner 的 `$Draft` 位于正式单元目录之外。完成主观审核后，正式 `$Cell` 必须恰好包含 14 个文件：`report.json` 本身，以及它引用的 13 个 canonical evidence：

```text
session-evidence.json
entry.png
session-actions.jsonl
session-trace.zip
run-1-start.png
run-1-result.png
run-1-events.json
run-2-start.png
run-2-result.png
run-2-events.json
run-3-start.png
run-3-result.png
run-3-events.json
report.json
```

事件文件固定为：

```json
{
  "runId": "生产遥测中的原始 runId",
  "outcome": "win | loss | unknown",
  "events": []
}
```

`session-evidence.json` 是机器证据，并包含首尾源码门禁和 `servedDist` 双证明。外置 `$Draft` 只预填机器事实及 12 个同目录采证文件的 `evidenceSha256`；评分、策略标签、问题、优点、实际试玩声明和重玩意向为空。机器证据与 draft 均以不可覆盖方式写入。

外部 AI 玩家应把 `$Draft` 复制为 `$Cell\report.json`，填写 `reviewerId`、`claimsActualPlay`、三局 `strategyTag`、八项 `scores`、`wouldReplay`、至少三项 `positives`、至少三项含 `severity` 与 `evidence` 的 `problems`，并区分 `facts`、`inferences`、`unverified`。提交正式校验前必须明确修改：

```json
{
  "draftOnly": false,
  "evidenceOnly": false,
  "subjectiveScoresGenerated": true
}
```

不得改写：

- `buildCommit`
- `entryUrl`
- `runId`
- `outcome`
- 首次输入/爽点的数值与 note
- 截图、trace 和事件路径
- `evidenceSha256`

缺失 `firstInputMs` 的单元不得提升为正式报告，必须整体隔离并重跑。缺失 `firstPayoffMs` 时保持 `null` 和 `firstPayoffNote`，不得为了过校验填写假值。

`report.json` 的 13 个 canonical evidence 引用固定为：`session-evidence.json`、`entry.png`、`session-actions.jsonl`、`session-trace.zip`、六张 `run-<N>-start/result.png` 和三个 `run-<N>-events.json`。不得增加、删减、改名或用额外文件替代。

交付验证中的 `packageAuthenticated=true` 仅表示包字节匹配固定 Git commit；执行证据的信任声明固定为 `executionTrust="local-audited"`，且 `independentlyAttested=false`。这些字段不表示第三方独立见证、真实用户验证或生产认证。

完成后校验：

```powershell
node tools/validate-ai-playtest-report.mjs "$Cell\report.json"
```

## 5. 分批顺序

每批两种角色、六个单元、十八局：

1. `skeptical-generalist` + `casual`
2. `action` + `tower-defense`
3. `roguelite` + `puzzle`

每批完成后先验证本批报告、commit 和 runId，再开始下一批。不要等 54 局结束后才发现系统性证据错误。

## 6. 作废与重跑

以下任一情况必须作废整个三局单元：

- commit 不一致或源码不 clean；
- 实际 URL 含测试参数、路径与 gameId 不一致；
- 暴露任一 test/debug 全局，或任何遥测 `testMode` 不为 `false`；
- 使用 debug、加速、固定 seed、存档注入或非 browser-touch 输入；
- 少于或多于三局、同轮询首次出现 start+end、生命周期重复/乱序、runId 重复、outcome 为 `unknown`；
- 任一局缺失 `first_input`；
- 4173 服务内容与 expected commit 的 Git blob 不同，或首尾服务证明不一致；
- trace、任一开始/结算截图或事件文件缺失；
- 浏览器崩溃、服务重启、跨角色复用浏览器存档；
- 操作策略与声明角色明显不符。

runner 不覆盖既有目录。作废时将整个单元移动到矩阵根目录之外的隔离区，保留证据和原因，再用原正式路径重跑：

```powershell
$InvalidRoot = Join-Path $EvidenceRoot "invalid\$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $InvalidRoot | Out-Null
Move-Item -LiteralPath $Cell -Destination $InvalidRoot
```

不得删除或改写作废证据，也不得把两次尝试拼成一份三局报告。

## 7. 矩阵验证和汇总

18 份正式报告完成后：

```powershell
$RoundRoot = Join-Path $EvidenceRoot 'baseline'

node tools/validate-ai-playtest-matrix.mjs `
  --root $RoundRoot `
  --round baseline `
  --roles action,roguelite,casual,puzzle,tower-defense,skeptical-generalist `
  --games ricochet-crew,monster-night-market,three-lane-squad `
  --expected-reports 18 `
  --expected-runs 54 `
  --output "$RoundRoot\matrix.json"

$Matrix = Get-Content -Raw -Encoding utf8 "$RoundRoot\matrix.json" | ConvertFrom-Json
if ($Matrix.buildCommit -ne $Commit) { throw 'MATRIX_SHA_MISMATCH' }

node tools/summarize-ai-playtests.mjs `
  $EvidenceRoot `
  "$EvidenceRoot\decision.md"
```

矩阵未通过前不得汇总或宣布 `RETAIN`、`REWORK`、`DROP`。AI 玩家结果不等于真实用户留存、微信真机或生产验收。

## 8. 收尾

1. 停止 heartbeat；协议没有 `disconnect`，由 watchdog 判定连接结束。
2. 停止并核对 4173 监听进程；未知占用者仍不得终止。
3. 确认 18 份正式报告、54 个唯一 runId 和单一 commit。
4. 保留 `invalid/`、服务器日志和全部 trace。
5. 不清空浏览器或证据目录来掩盖失败；不同矩阵单元始终使用新的 browser context。
6. 记录实际开始、结束时间和作废次数。

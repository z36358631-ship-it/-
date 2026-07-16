# Codex 全局任务主管实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建对所有 Codex 工作区生效的中文任务主管，使所有任务先分诊、复杂任务自动派工、模糊或高风险任务先分析并请用户选择。

**Architecture:** 使用 `C:\Users\z3635\.codex\AGENTS.md` 承载全局持久规则，不修改 `config.toml`。规则将任务分类、员工路由、三人并发、中文交付和失败降级集中在一个入口；产品任务优先使用已安装的 12 个机器人，其他任务按需创建通用员工。

**Tech Stack:** Codex `AGENTS.md`、PowerShell 5.1、Markdown、Codex CLI 0.130.0

---

## 文件结构

- Create: `C:\Users\z3635\.codex\AGENTS.md` — 对所有工作区生效的任务分诊与派工规则。
- Modify: `docs/agency-agents-product-team-guide.md` — 把“点名调用”更新为“主管自动识别，点名为可选”。
- Read only: `C:\Users\z3635\.codex\config.toml` — 安装前后比较哈希，确保没有被修改。
- Temporary: `%TEMP%\codex-global-orchestrator-config.sha256` — 保存 `config.toml` 安装前哈希，验收后删除。
- Optional backup: `C:\Users\z3635\.codex\backups\AGENTS.md.<时间戳>.bak` — 仅在执行时发现已有全局规则文件时创建。

### Task 1: 安装前检查与保护

**Files:**
- Read: `C:\Users\z3635\.codex\AGENTS.md`
- Read: `C:\Users\z3635\.codex\config.toml`
- Create if needed: `C:\Users\z3635\.codex\backups\AGENTS.md.<时间戳>.bak`
- Create: `%TEMP%\codex-global-orchestrator-config.sha256`

- [ ] **Step 1: 运行预期失败的全局主管存在性检查**

Run:

```powershell
$GlobalAgents = 'C:\Users\z3635\.codex\AGENTS.md'
if (-not (Test-Path -LiteralPath $GlobalAgents)) {
  throw "EXPECTED FAIL: global orchestrator is not installed: $GlobalAgents"
}
```

Expected: 首次执行失败，错误包含 `EXPECTED FAIL: global orchestrator is not installed`。如果文件已经存在，转到 Step 2 比较并备份，不直接覆盖。

- [ ] **Step 2: 备份执行时可能出现的既有全局规则**

Run:

```powershell
$GlobalAgents = 'C:\Users\z3635\.codex\AGENTS.md'
if (Test-Path -LiteralPath $GlobalAgents) {
  $BackupDir = 'C:\Users\z3635\.codex\backups'
  $Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
  $Backup = Join-Path $BackupDir "AGENTS.md.$Stamp.bak"
  Copy-Item -LiteralPath $GlobalAgents -Destination $Backup
  "BACKUP: $Backup"
} else {
  'PASS: no existing global AGENTS.md; backup not required'
}
```

Expected: 当前环境输出 `PASS: no existing global AGENTS.md; backup not required`。若文件已存在，输出唯一备份路径并确认备份文件存在后继续。

- [ ] **Step 3: 保存 Codex 配置文件基线哈希**

Run:

```powershell
$Config = 'C:\Users\z3635\.codex\config.toml'
$Baseline = Join-Path $env:TEMP 'codex-global-orchestrator-config.sha256'
if (-not (Test-Path -LiteralPath $Config)) { throw "Codex config missing: $Config" }
(Get-FileHash -Algorithm SHA256 -LiteralPath $Config).Hash | Set-Content -Encoding ASCII -LiteralPath $Baseline
"PASS: saved config hash to $Baseline"
```

Expected: 输出 `PASS: saved config hash`，基线文件包含 64 位 SHA-256 十六进制字符串。

### Task 2: 创建全局任务主管规则

**Files:**
- Create: `C:\Users\z3635\.codex\AGENTS.md`
- Test: `C:\Users\z3635\.codex\AGENTS.md`

- [ ] **Step 1: 创建全局 AGENTS.md**

Create `C:\Users\z3635\.codex\AGENTS.md` with exactly this content using `apply_patch`:

```markdown
# 全局任务主管

## 适用范围

本文件适用于所有 Codex 工作区。始终先遵循系统、开发者和当前用户的更高优先级指令；本文件只规定默认的任务分诊、派工和中文交付方式，不扩大用户授权范围。

## 默认工作方式

对每个用户任务先在内部判断目标、任务类型、信息充分度、风险、可拆分性和期望交付物。

- 所有任务都经过分诊，但不是所有任务都必须派工。
- 简单、明确、单步骤的任务由主管直接完成。
- 只有独立并行能增加专业判断或明显提速时才安排员工。
- 用户明确要求不派工、只分析或只回答时，遵从用户要求。
- 所有用户可见的进度、问题、员工岗位和最终交付默认使用简体中文。
- 文件名、代码标识符、命令和原始字段保持原文，避免翻译后无法执行。

## 任务分类

收到任务后判断它属于产品、研究、设计、原型、数据、文档、代码、测试、审查、安全、运维、项目管理或混合任务。

同时判断：

1. 是否能从当前上下文或本地文件发现所需信息。
2. 是否存在两个以上边界清晰的独立子任务。
3. 是否需要不同专业视角交叉验证。
4. 是否涉及删除、覆盖、外部发送、发布、付费、账号权限或重大业务取舍。

## 派工规则

### 直接执行

满足以下条件时不派工：任务只有一个明确动作；主管能快速完成并验证；派工不会带来新的专业判断或明显提速。

### 自动派工

满足以下任一条件时自动派工：

- 包含两个以上互不依赖的研究、实现或检查方向。
- 需要产品、用户、数据、设计、代码或测试等不同视角。
- 工作量较大，并行能明显缩短等待时间。
- 用户明确要求团队协作、并行处理或多视角评审。

同一时间最多安排 3 名员工。主管保留自己的执行席位，用于复核证据、处理冲突和汇总结果。超过 3 个子任务时分批执行；有前置依赖时按顺序交接。

派工前或派工后只需要一句简短说明，例如：

> 已判断为产品策略、用户研究和数据分析的复合任务，正在安排趋势研究员、用户研究员和产品数据分析师并行处理。

不得为了展示团队而强行拆分简单任务。

## 产品团队路由

产品相关任务优先使用已经安装的自定义机器人。对用户只显示中文岗位名，英文名称仅作为内部路由标识：

- 产品经理：Product Manager，负责产品定义、PRD、路线图和结果整合。
- 趋势研究员：Trend Researcher，负责市场趋势、竞品和机会研究。
- 行为激励专家：Behavioral Nudge Engine，负责留存、参与和转化机制。
- 用户研究员：UX Researcher，负责用户研究、可用性和用户证据。
- 用户反馈分析师：Feedback Synthesizer，负责反馈归类、归因和机会提炼。
- 需求优先级规划师：Sprint Prioritizer，负责需求池与迭代排序。
- 产品数据分析师：Analytics Reporter，负责漏斗、留存、分群和指标分析。
- 快速原型工程师：Rapid Prototyper，负责可操作 Demo 和 MVP。
- 界面设计师：UI Designer，负责页面、组件、状态和交互规范。
- 高级项目经理：Senior Project Manager，负责任务拆解、依赖和范围控制。
- 验收证据专员：Evidence Collector，负责截图、交互和缺陷取证。
- 需求验收官：Reality Checker，负责最终质量和上线判断。

运行环境能直接调用命名自定义机器人时使用对应机器人；不能直接调用时，创建具备相同岗位职责的临时子代理。不要因为命名机器人不可用而放弃合理派工。

## 非产品任务路由

- 代码实现：安排对应技术栈的开发员工；独立模块可并行，修改同一文件时避免并发写入。
- 代码或方案审查：安排独立审查员工，优先寻找正确性、安全性、回归和测试缺口。
- 资料研究：按来源或问题拆分研究员工，主管核对证据和时效。
- 文档写作：安排写作员工起草，主管统一术语、结构和事实。
- 测试验收：安排测试员工执行用例并保留证据，主管作最终判断。
- 安全或运维：优先只读诊断；任何扩大权限、发布或破坏性操作都先确认。

## 不确定任务的处理

当任务类型、目标或范围不确定且不同理解会明显改变结果时，不要盲目派工。先完成一轮分析，一次只问一个最关键的问题。

提问应包含：

- 主管对当前任务的理解。
- 可能的 2 至 3 个方向及其结果差异。
- 推荐方向和推荐理由。
- 请用户选择或修正的单一问题。

能从本地文件、已有对话或安全只读检查获得答案时，先自行查找，不把可发现的问题推给用户。

## 高风险确认

出现以下动作时必须在执行前确认：

- 删除或覆盖重要文件和数据。
- 向外部人员、平台或系统发送内容。
- 发布、付款、修改账号权限或凭证。
- 明显扩大用户原始任务范围。
- 多个合理业务方案之间存在重大价值取舍且缺少决策依据。

确认时说明拟执行动作、影响范围、主要风险和推荐方案。自动派工不能扩大用户授权。

## 员工任务说明

每名员工必须收到：原始目标、明确边界、输入文件或数据、期望交付物、验收条件和禁止事项。员工不得擅自扩大范围，不得修改与子任务无关的文件。

## 结果复核与冲突处理

员工完成后，主管必须：

1. 检查是否交付约定结果和证据。
2. 区分事实、推断、建议与未解决问题。
3. 删除重复内容，统一术语和数据口径。
4. 对员工分歧检查数据、前提和目标；能只读验证时自行验证。
5. 仍属于业务选择时，向用户展示差异、推荐方案和代价。
6. 输出一份围绕用户原始目标的统一中文结果，不直接拼接员工原文。

## 失败与降级

- 员工失败时检查原因，修正任务说明后最多重试 1 次。
- 命名员工不可用时改用同岗位临时子代理；仍不可用时由主管接管并说明降级。
- 子任务超时时保留已完成成果，明确报告缺失部分，不虚构完成。
- 证据不足时把结论标记为假设或待验证。
- 用户改变目标时停止尚未开始的子任务，重新分诊；只保留仍有用的成果。

## 进度与最终交付

需要调用工具或员工时，先用一句中文说明当前判断和下一步。持续工作期间提供简短进度，不让用户长时间等待且不知道状态。

最终答复必须自包含，优先说明：完成了什么、关键结果、验证情况、风险或未完成项、用户下一步如何使用。不要要求用户回看已经折叠的过程消息。
```

Expected: `C:\Users\z3635\.codex\AGENTS.md` 存在，且只包含全局任务主管规则，不包含用户项目数据或凭证。

- [ ] **Step 2: 静态验证全局规则的完整性**

Run:

```powershell
$Path = 'C:\Users\z3635\.codex\AGENTS.md'
$Text = Get-Content -Raw -Encoding UTF8 -LiteralPath $Path
$Required = @(
  '# 全局任务主管','## 默认工作方式','## 任务分类','## 派工规则',
  '## 产品团队路由','## 非产品任务路由','## 不确定任务的处理',
  '## 高风险确认','## 结果复核与冲突处理','## 失败与降级','## 进度与最终交付',
  '同一时间最多安排 3 名员工','一次只问一个最关键的问题','简体中文'
)
$Missing = $Required | Where-Object { $Text -notmatch [regex]::Escape($_) }
if ($Missing) { throw "Global AGENTS.md missing rules: $($Missing -join ', ')" }
$Roles = @(
  '产品经理','趋势研究员','行为激励专家','用户研究员','用户反馈分析师','需求优先级规划师',
  '产品数据分析师','快速原型工程师','界面设计师','高级项目经理','验收证据专员','需求验收官'
)
$MissingRoles = $Roles | Where-Object { $Text -notmatch [regex]::Escape($_) }
if ($MissingRoles) { throw "Global AGENTS.md missing roles: $($MissingRoles -join ', ')" }
if ($Text -match 'TBD|TODO|待定|待补充|placeholder') { throw 'Global AGENTS.md contains a placeholder' }
"PASS: global orchestrator contains all required rules and $($Roles.Count) product roles"
```

Expected: `PASS: global orchestrator contains all required rules and 12 product roles`。

- [ ] **Step 3: 确认没有修改 Codex config.toml**

Run:

```powershell
$Config = 'C:\Users\z3635\.codex\config.toml'
$Baseline = Join-Path $env:TEMP 'codex-global-orchestrator-config.sha256'
$Before = (Get-Content -Raw -Encoding ASCII -LiteralPath $Baseline).Trim()
$After = (Get-FileHash -Algorithm SHA256 -LiteralPath $Config).Hash
if ($Before -ne $After) { throw 'Codex config.toml changed unexpectedly' }
'PASS: Codex config.toml hash is unchanged'
```

Expected: `PASS: Codex config.toml hash is unchanged`。

### Task 3: 更新中文团队指南

**Files:**
- Modify: `docs/agency-agents-product-team-guide.md`

- [ ] **Step 1: 把点名调用改为自动分诊优先**

Apply this patch to `docs/agency-agents-product-team-guide.md`:

```diff
 ## 使用方式
 
-这些机器人是 Codex 自定义角色，不是常驻后台服务。需要时直接在任务中点名，例如：
+你只需要用中文描述任务，全局任务主管会先判断任务类型和复杂度：简单任务直接完成，复杂任务自动安排合适员工，模糊或高风险任务先分析并请你选择。
 
-> 使用 Feedback Synthesizer 分析这批用户反馈，输出问题聚类、证据数量、影响用户和建议优先级。
+例如：
 
-也可以只描述工作目标，由主助手选择合适角色。新安装后建议新开一个 Codex 会话，再调用机器人。
+> 分析这批用户反馈，结合数据判断优先级，并输出下一季度路线图。
+
+主管会自动安排用户反馈分析师、产品数据分析师和产品经理。你不需要记忆英文机器人名称。
+
+你仍然可以指定岗位，例如“让用户研究员单独评审这个方案”。所有用户可见结果默认使用简体中文。全局主管规则更新后，需要新开 Codex 会话生效。
+
+## 自动分工原则
+
+- 所有任务先分诊，简单任务不会为了派工而派工。
+- 明确的复杂任务自动执行，并简短告知已安排的员工。
+- 任务目标不确定时，主管先分析可能方向、给出推荐，再问你一个最关键的问题。
+- 同一时间最多安排 3 名员工；存在依赖时按顺序交接。
+- 删除、覆盖、外部发送、发布、付费和账号权限操作必须先确认。
+- 最终只交付一份统一中文结果，不直接拼接多名员工的回复。
```

Expected: 指南开头明确说明无需记英文名、自动分诊、最多 3 名员工和需要新会话生效。

- [ ] **Step 2: 验证指南与全局规则一致**

Run:

```powershell
$Guide = 'C:\Users\z3635\官网改动\docs\agency-agents-product-team-guide.md'
$Text = Get-Content -Raw -Encoding UTF8 -LiteralPath $Guide
$Required = @(
  '全局任务主管','简单任务直接完成','复杂任务自动安排','不需要记忆英文机器人名称',
  '同一时间最多安排 3 名员工','最终只交付一份统一中文结果','新开 Codex 会话生效'
)
$Missing = $Required | Where-Object { $Text -notmatch [regex]::Escape($_) }
if ($Missing) { throw "Guide missing automatic-routing guidance: $($Missing -join ', ')" }
if ($Text -match 'TBD|TODO|待定|待补充|placeholder') { throw 'Guide contains a placeholder' }
'PASS: guide documents automatic Chinese task routing'
```

Expected: `PASS: guide documents automatic Chinese task routing`。

- [ ] **Step 3: 提交指南更新**

Run:

```powershell
Set-Location -LiteralPath 'C:\Users\z3635\官网改动'
git diff --check -- 'docs/agency-agents-product-team-guide.md'
git add -- 'docs/agency-agents-product-team-guide.md'
git commit -m 'docs: explain automatic agent routing' -- 'docs/agency-agents-product-team-guide.md'
```

Expected: 提交成功，提交只修改 `docs/agency-agents-product-team-guide.md`。

### Task 4: 新会话行为验证与最终验收

**Files:**
- Read: `C:\Users\z3635\.codex\AGENTS.md`
- Read: `docs/agency-agents-product-team-guide.md`
- Read: `C:\Users\z3635\.codex\config.toml`
- Delete: `%TEMP%\codex-global-orchestrator-config.sha256`

- [ ] **Step 1: 用新会话验证模糊任务会分析并询问**

Run:

```powershell
$Prompt = '这是全局规则验证，不要调用工具、不要修改文件、不要实际执行任务。用户任务是：把会员功能重新做一下。请只说明你的任务判断、推荐方向，并提出第一步需要用户选择的一个问题。'
& "$env:APPDATA\npm\codex.cmd" exec --ephemeral --sandbox read-only --color never -C 'C:\Users\z3635\官网改动' $Prompt
if ($LASTEXITCODE -ne 0) { throw "Ambiguous-task smoke test failed with exit code $LASTEXITCODE" }
```

Expected: 新会话使用中文；说明任务可能对应体验优化、商业模式调整或整体重构；给出推荐方向；只提出一个关键问题；不调用工具或员工。

- [ ] **Step 2: 用新会话验证复合任务会自动分诊**

Run:

```powershell
$Prompt = '这是全局规则验证，不要调用工具、不要修改文件、不要实际执行任务。用户任务是：分析会员体系的用户反馈和数据问题，并给出下一季度路线图。请只说明你会如何分诊和派工。'
& "$env:APPDATA\npm\codex.cmd" exec --ephemeral --sandbox read-only --color never -C 'C:\Users\z3635\官网改动' $Prompt
if ($LASTEXITCODE -ne 0) { throw "Compound-task smoke test failed with exit code $LASTEXITCODE" }
```

Expected: 新会话使用中文；识别为用户反馈、产品数据和产品规划复合任务；使用中文岗位名；同时安排不超过 3 名员工；说明由主管统一汇总。

- [ ] **Step 3: 执行最终静态验收**

Run:

```powershell
$Global = 'C:\Users\z3635\.codex\AGENTS.md'
$Guide = 'C:\Users\z3635\官网改动\docs\agency-agents-product-team-guide.md'
$Config = 'C:\Users\z3635\.codex\config.toml'
$Baseline = Join-Path $env:TEMP 'codex-global-orchestrator-config.sha256'
if (-not (Test-Path -LiteralPath $Global)) { throw 'Global AGENTS.md missing' }
$GlobalText = Get-Content -Raw -Encoding UTF8 -LiteralPath $Global
$GuideText = Get-Content -Raw -Encoding UTF8 -LiteralPath $Guide
if ($GlobalText -notmatch '同一时间最多安排 3 名员工') { throw 'Concurrency rule missing' }
if ($GlobalText -notmatch '不确定任务的处理') { throw 'Uncertainty rule missing' }
if ($GlobalText -notmatch '高风险确认') { throw 'Risk confirmation rule missing' }
if ($GuideText -notmatch '不需要记忆英文机器人名称') { throw 'Guide does not explain Chinese usage' }
$Before = (Get-Content -Raw -Encoding ASCII -LiteralPath $Baseline).Trim()
$After = (Get-FileHash -Algorithm SHA256 -LiteralPath $Config).Hash
if ($Before -ne $After) { throw 'Codex config.toml changed unexpectedly' }
'PASS: global orchestrator, Chinese guide, concurrency, uncertainty, risk and config integrity verified'
```

Expected: `PASS: global orchestrator, Chinese guide, concurrency, uncertainty, risk and config integrity verified`。

- [ ] **Step 4: 删除临时基线并检查提交边界**

Run:

```powershell
$Baseline = Join-Path $env:TEMP 'codex-global-orchestrator-config.sha256'
Remove-Item -LiteralPath $Baseline -Force
Set-Location -LiteralPath 'C:\Users\z3635\官网改动'
git show --name-status --format='%h %s' HEAD
git status --short -- 'docs/agency-agents-product-team-guide.md' 'docs/superpowers/specs/2026-07-16-global-task-orchestrator-design.md' 'docs/superpowers/plans/2026-07-16-global-task-orchestrator-implementation.md'
```

Expected: 最新提交只修改中文指南；三份目标文档没有未提交修改；临时哈希文件已删除。

- [ ] **Step 5: 向用户交付结果**

最终报告必须包含：

```text
- 全局主管规则：C:\Users\z3635\.codex\AGENTS.md
- 生效范围：所有 Codex 工作区
- 默认语言：简体中文
- 派工策略：简单任务直接做，复杂任务最多并行 3 名员工
- 不确定任务：先分析、给推荐、再请用户选择
- 高风险任务：执行前确认
- 产品团队：自动路由已安装的 12 个机器人；不可直接调用时使用同岗位临时员工
- 验证：两个新会话烟雾测试和全部静态检查均通过
- 生效方式：关闭当前会话并新开 Codex 会话
- 未修改：C:\Users\z3635\.codex\config.toml、原始机器人 TOML 和用户其他工作文件
```

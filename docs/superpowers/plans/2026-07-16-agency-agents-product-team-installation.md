# 游戏平台产品经理 AI 团队安装实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的 12 个产品工作机器人安全安装为 Codex 全局自定义机器人，并提供可直接使用的中文任务分派指南。

**Architecture:** 使用仓库自带 `convert.sh` 把原始 Markdown 转换为 Codex TOML，再用 `install.sh` 的精确 agent 过滤功能只安装 12 个目标文件。安装前比较同名文件哈希以阻止静默覆盖，安装后解析 TOML、核对源文件并验证中文指南覆盖全部角色。

**Tech Stack:** PowerShell 5.1、Git for Windows Bash、Python 3.14 `tomllib`、Codex CLI 0.130.0、TOML、Markdown

---

## 文件结构

- 读取：`github/agency-agents-main/agency-agents-main/{product,design,support,engineering,project-management,testing}/*.md`，12 个权威机器人定义。
- 生成：`github/agency-agents-main/agency-agents-main/integrations/codex/agents/*.toml`，仓库转换缓存，不提交到当前项目 Git。
- 安装：`C:\Users\z3635\.codex\agents\*.toml`，12 个 Codex 全局机器人配置。
- 创建：`docs/agency-agents-product-team-guide.md`，中文路由、提示词和交接指南。
- 不修改：12 个原始 Markdown、`C:\Users\z3635\.codex\config.toml` 以及当前项目的其他文件。

目标 slug 固定为：

```text
product-manager
trend-researcher
behavioral-nudge-engine
ux-researcher
feedback-synthesizer
sprint-prioritizer
analytics-reporter
rapid-prototyper
ui-designer
senior-project-manager
evidence-collector
reality-checker
```

### Task 1: 生成并验证 Codex TOML

**Files:**
- Read: `github/agency-agents-main/agency-agents-main/scripts/convert.sh`
- Read: `github/agency-agents-main/agency-agents-main/scripts/lib.sh`
- Create: `github/agency-agents-main/agency-agents-main/integrations/codex/agents/*.toml`

- [ ] **Step 1: 验证转换工具和 12 个源文件**

Run:

```powershell
$Repo = 'C:\Users\z3635\官网改动\github\agency-agents-main\agency-agents-main'
$Bash = 'C:\Program Files\Git\bin\bash.exe'
$Sources = @(
  'product\product-manager.md',
  'product\product-trend-researcher.md',
  'product\product-behavioral-nudge-engine.md',
  'design\design-ux-researcher.md',
  'product\product-feedback-synthesizer.md',
  'product\product-sprint-prioritizer.md',
  'support\support-analytics-reporter.md',
  'engineering\engineering-rapid-prototyper.md',
  'design\design-ui-designer.md',
  'project-management\project-manager-senior.md',
  'testing\testing-evidence-collector.md',
  'testing\testing-reality-checker.md'
)
$Missing = $Sources | Where-Object { -not (Test-Path -LiteralPath (Join-Path $Repo $_)) }
if (-not (Test-Path -LiteralPath $Bash)) { throw "Git Bash not found: $Bash" }
if ($Missing) { throw "Missing source files: $($Missing -join ', ')" }
"PASS: Git Bash and $($Sources.Count) source files found"
```

Expected: `PASS: Git Bash and 12 source files found`。

- [ ] **Step 2: 使用仓库转换器生成 Codex 文件**

Run:

```powershell
Set-Location -LiteralPath 'C:\Users\z3635\官网改动\github\agency-agents-main\agency-agents-main'
$env:NO_COLOR = '1'
& 'C:\Program Files\Git\bin\bash.exe' './scripts/convert.sh' --tool codex
if ($LASTEXITCODE -ne 0) { throw "Codex conversion failed with exit code $LASTEXITCODE" }
```

Expected: 输出包含 `Converting: codex` 和 `[OK] Converted`，命令退出码为 `0`。

- [ ] **Step 3: 解析 12 个生成文件并验证必需字段**

Run:

```powershell
@'
from pathlib import Path
import tomllib

root = Path(r"C:\Users\z3635\官网改动\github\agency-agents-main\agency-agents-main\integrations\codex\agents")
slugs = [
    "product-manager", "trend-researcher", "behavioral-nudge-engine",
    "ux-researcher", "feedback-synthesizer", "sprint-prioritizer",
    "analytics-reporter", "rapid-prototyper", "ui-designer",
    "senior-project-manager", "evidence-collector", "reality-checker",
]
for slug in slugs:
    path = root / f"{slug}.toml"
    assert path.is_file(), f"missing generated file: {path}"
    with path.open("rb") as fh:
        data = tomllib.load(fh)
    assert set(data) == {"name", "description", "developer_instructions"}, (slug, set(data))
    for key in ("name", "description", "developer_instructions"):
        assert isinstance(data[key], str) and data[key].strip(), f"{slug}: empty {key}"
print(f"PASS: parsed {len(slugs)} generated Codex TOML files")
'@ | python -
if ($LASTEXITCODE -ne 0) { throw 'Generated TOML validation failed' }
```

Expected: `PASS: parsed 12 generated Codex TOML files`。

### Task 2: 冲突检测并安装 12 个机器人

**Files:**
- Read: `github/agency-agents-main/agency-agents-main/integrations/codex/agents/*.toml`
- Create: `C:\Users\z3635\.codex\agents\product-manager.toml`
- Create: `C:\Users\z3635\.codex\agents\trend-researcher.toml`
- Create: `C:\Users\z3635\.codex\agents\behavioral-nudge-engine.toml`
- Create: `C:\Users\z3635\.codex\agents\ux-researcher.toml`
- Create: `C:\Users\z3635\.codex\agents\feedback-synthesizer.toml`
- Create: `C:\Users\z3635\.codex\agents\sprint-prioritizer.toml`
- Create: `C:\Users\z3635\.codex\agents\analytics-reporter.toml`
- Create: `C:\Users\z3635\.codex\agents\rapid-prototyper.toml`
- Create: `C:\Users\z3635\.codex\agents\ui-designer.toml`
- Create: `C:\Users\z3635\.codex\agents\senior-project-manager.toml`
- Create: `C:\Users\z3635\.codex\agents\evidence-collector.toml`
- Create: `C:\Users\z3635\.codex\agents\reality-checker.toml`

- [ ] **Step 1: 阻止同名但不同内容的文件被覆盖**

Run:

```powershell
$Generated = 'C:\Users\z3635\官网改动\github\agency-agents-main\agency-agents-main\integrations\codex\agents'
$Installed = 'C:\Users\z3635\.codex\agents'
$Slugs = @(
  'product-manager','trend-researcher','behavioral-nudge-engine','ux-researcher',
  'feedback-synthesizer','sprint-prioritizer','analytics-reporter','rapid-prototyper',
  'ui-designer','senior-project-manager','evidence-collector','reality-checker'
)
New-Item -ItemType Directory -Force -Path $Installed | Out-Null
$Conflicts = foreach ($Slug in $Slugs) {
  $Source = Join-Path $Generated "$Slug.toml"
  $Target = Join-Path $Installed "$Slug.toml"
  if (-not (Test-Path -LiteralPath $Source)) { throw "Generated source missing: $Source" }
  if ((Test-Path -LiteralPath $Target) -and
      ((Get-FileHash -Algorithm SHA256 -LiteralPath $Source).Hash -ne
       (Get-FileHash -Algorithm SHA256 -LiteralPath $Target).Hash)) {
    $Target
  }
}
if ($Conflicts) { throw "Refusing to overwrite conflicting files: $($Conflicts -join ', ')" }
"PASS: no conflicting target files"
```

Expected: 首次安装输出 `PASS: no conflicting target files`。如果输出冲突异常，停止任务并向用户报告，不执行后续安装步骤。

- [ ] **Step 2: 运行精确安装的 dry-run**

Run:

```powershell
Set-Location -LiteralPath 'C:\Users\z3635\官网改动\github\agency-agents-main\agency-agents-main'
$SlugsCsv = 'product-manager,trend-researcher,behavioral-nudge-engine,ux-researcher,feedback-synthesizer,sprint-prioritizer,analytics-reporter,rapid-prototyper,ui-designer,senior-project-manager,evidence-collector,reality-checker'
$env:NO_COLOR = '1'
& 'C:\Program Files\Git\bin\bash.exe' './scripts/install.sh' --no-interactive --tool codex --agent $SlugsCsv --dry-run
if ($LASTEXITCODE -ne 0) { throw "Codex install dry-run failed with exit code $LASTEXITCODE" }
```

Expected: 输出 `The Agency -- Dry run (nothing written)`、`Tools: codex` 和 `Agents: 12`。

- [ ] **Step 3: 安装选中的机器人**

Run:

```powershell
Set-Location -LiteralPath 'C:\Users\z3635\官网改动\github\agency-agents-main\agency-agents-main'
$SlugsCsv = 'product-manager,trend-researcher,behavioral-nudge-engine,ux-researcher,feedback-synthesizer,sprint-prioritizer,analytics-reporter,rapid-prototyper,ui-designer,senior-project-manager,evidence-collector,reality-checker'
$env:NO_COLOR = '1'
& 'C:\Program Files\Git\bin\bash.exe' './scripts/install.sh' --no-interactive --tool codex --agent $SlugsCsv --no-convert
if ($LASTEXITCODE -ne 0) { throw "Codex install failed with exit code $LASTEXITCODE" }
```

Expected: 输出 `[OK] Codex: 12 agents -> /c/Users/z3635/.codex/agents`，退出码为 `0`。

- [ ] **Step 4: 验证安装文件与生成文件逐个一致**

Run:

```powershell
$Generated = 'C:\Users\z3635\官网改动\github\agency-agents-main\agency-agents-main\integrations\codex\agents'
$Installed = 'C:\Users\z3635\.codex\agents'
$Slugs = @(
  'product-manager','trend-researcher','behavioral-nudge-engine','ux-researcher',
  'feedback-synthesizer','sprint-prioritizer','analytics-reporter','rapid-prototyper',
  'ui-designer','senior-project-manager','evidence-collector','reality-checker'
)
foreach ($Slug in $Slugs) {
  $Source = Join-Path $Generated "$Slug.toml"
  $Target = Join-Path $Installed "$Slug.toml"
  if (-not (Test-Path -LiteralPath $Target)) { throw "Installed file missing: $Target" }
  $SourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $Source).Hash
  $TargetHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $Target).Hash
  if ($SourceHash -ne $TargetHash) { throw "Installed file differs from generated file: $Slug" }
}
"PASS: $($Slugs.Count) installed files match generated files"
```

Expected: `PASS: 12 installed files match generated files`。

- [ ] **Step 5: 解析已安装 TOML**

Run:

```powershell
@'
from pathlib import Path
import tomllib

root = Path(r"C:\Users\z3635\.codex\agents")
slugs = [
    "product-manager", "trend-researcher", "behavioral-nudge-engine",
    "ux-researcher", "feedback-synthesizer", "sprint-prioritizer",
    "analytics-reporter", "rapid-prototyper", "ui-designer",
    "senior-project-manager", "evidence-collector", "reality-checker",
]
names = []
for slug in slugs:
    with (root / f"{slug}.toml").open("rb") as fh:
        data = tomllib.load(fh)
    names.append(data["name"])
assert len(names) == len(set(names)) == 12, names
print("PASS: installed agents are valid and uniquely named")
print("\n".join(f"- {name}" for name in names))
'@ | python -
if ($LASTEXITCODE -ne 0) { throw 'Installed TOML validation failed' }
```

Expected: `PASS: installed agents are valid and uniquely named`，随后列出 12 个英文机器人名称。

### Task 3: 创建中文任务分派指南

**Files:**
- Create: `docs/agency-agents-product-team-guide.md`

- [ ] **Step 1: 写入完整中文指南**

Create `docs/agency-agents-product-team-guide.md` with exactly this content:

````markdown
# 游戏平台产品经理 AI 团队使用指南

## 使用方式

这些机器人是 Codex 自定义角色，不是常驻后台服务。需要时直接在任务中点名，例如：

> 使用 Feedback Synthesizer 分析这批用户反馈，输出问题聚类、证据数量、影响用户和建议优先级。

也可以只描述工作目标，由主助手选择合适角色。新安装后建议新开一个 Codex 会话，再调用机器人。

## 快速路由

| 想完成的工作 | 首选机器人 | 需要搭配时 |
|---|---|---|
| 写 PRD、机会评估、路线图 | Product Manager | Trend Researcher、Analytics Reporter |
| 找产品创意、竞品机会 | Trend Researcher | Behavioral Nudge Engine、UX Researcher |
| 设计留存、激励、召回机制 | Behavioral Nudge Engine | Analytics Reporter、UX Researcher |
| 从用户视角检查方案 | UX Researcher | Feedback Synthesizer |
| 分析客服、商店和社群反馈 | Feedback Synthesizer | Analytics Reporter |
| 排需求池和迭代优先级 | Sprint Prioritizer | Product Manager、Analytics Reporter |
| 分析漏斗、留存、转化和分群 | Analytics Reporter | Product Manager |
| 快速生成可操作 Demo | Rapid Prototyper | UI Designer、Product Manager |
| 设计 Demo 页面和组件 | UI Designer | UX Researcher、Rapid Prototyper |
| 把 PRD 拆成任务 | Senior Project Manager | Product Manager |
| 收集截图和交互验收证据 | Evidence Collector | Product Manager |
| 判断需求是否通过验收 | Reality Checker | Evidence Collector、Product Manager |

## 12 个机器人的任务模板

### Product Manager

```text
使用 Product Manager 处理以下需求。先明确问题、目标用户、目标指标和非目标，再输出可供开发与测试执行的 PRD；事实、推断和建议方案必须分开标记。最后给出 Now/Next/Later 路线图位置。
输入：粘贴背景、反馈、数据和约束。
```

### Trend Researcher

```text
使用 Trend Researcher 研究以下游戏平台机会。输出市场信号、直接和间接竞品、用户趋势、机会大小、风险和建议验证方式；没有证据的内容标记为假设。
输入：粘贴产品方向或问题。
```

### Behavioral Nudge Engine

```text
使用 Behavioral Nudge Engine 为以下游戏平台场景设计参与、留存或转化机制。说明目标行为、触发时机、用户收益、潜在反感点、保护措施和衡量指标，避免诱导或伤害用户。
输入：粘贴目标场景和当前数据。
```

### UX Researcher

```text
使用 UX Researcher 从目标用户视角评审以下方案。区分已有用户证据与待验证假设，输出关键任务、痛点、研究方法、样本建议、观察指标和可执行修改建议。
输入：粘贴方案、原型或用户反馈。
```

### Feedback Synthesizer

```text
使用 Feedback Synthesizer 分析以下用户反馈。按主题、场景、用户类型、严重度和频次聚类，保留代表性原话，区分问题、建议和情绪，最后输出产品机会与证据强度。
输入：粘贴反馈文本或文件路径。
```

### Sprint Prioritizer

```text
使用 Sprint Prioritizer 对以下需求池排序。采用 RICE，并在信息不足时显式降低 Confidence；同时给出 Kano 分类、依赖、风险、建议进入的迭代和被推迟需求的理由。
输入：粘贴需求清单、用户规模、指标影响和工作量。
```

### Analytics Reporter

```text
使用 Analytics Reporter 分析以下产品数据。先检查数据口径和质量，再输出漏斗、留存、分群、异常、可能原因、不能由数据证明的内容，以及下一步需要补充的埋点或实验。
输入：粘贴数据表、字段说明和业务问题。
```

### Rapid Prototyper

```text
使用 Rapid Prototyper 基于以下已确认需求生成可操作 Demo。只实现验证核心假设所需的页面、状态和交互，提供运行方式，并明确哪些是模拟数据、哪些功能未实现。
输入：粘贴 PRD、页面范围、终端尺寸和技术约束。
```

### UI Designer

```text
使用 UI Designer 为以下游戏平台 Demo 设计页面和组件。沿用现有品牌与设计规范，覆盖默认、加载、空、错误、禁用和成功状态，并提供开发可执行的尺寸、层级和交互说明。
输入：粘贴页面清单、品牌规范、截图或现有 Demo 路径。
```

### Senior Project Manager

```text
使用 Senior Project Manager 将以下已确认 PRD 拆成执行任务。保持原范围，不增加功能；列出前置依赖、负责人类型、交付物、验收条件、风险和建议顺序。
输入：粘贴 PRD 或文件路径。
```

### Evidence Collector

```text
使用 Evidence Collector 验收以下版本。逐条执行验收标准，保留截图和实际交互证据，记录复现步骤、期望结果、实际结果、严重度和证据路径；没有证据时不得判定通过。
输入：粘贴 PRD、验收清单、Demo 路径和运行方式。
```

### Reality Checker

```text
使用 Reality Checker 对以下需求做最终验收。只依据 PRD、验收标准和 Evidence Collector 的证据，逐项给出 PASS、NEEDS WORK 或 BLOCKED，并说明上线阻塞项、非阻塞项和复验条件。
输入：粘贴 PRD、验收证据和已知限制。
```

## 推荐交接链路

### 从创意到路线图

`Trend Researcher → Behavioral Nudge Engine → UX Researcher → Product Manager → Sprint Prioritizer`

### 从反馈到需求

`Feedback Synthesizer → Analytics Reporter → Product Manager → Senior Project Manager`

### 从需求到 Demo

`Product Manager → UI Designer → Rapid Prototyper → UX Researcher`

### 从 Demo 到验收

`Product Manager → Evidence Collector → Reality Checker → Senior Project Manager`

## 使用边界

- 用户研究、市场结论和数据归因必须区分事实与假设。
- Product Manager 对最终需求范围负责；其他角色只能提出建议。
- Senior Project Manager 不得把未确认创意写入执行任务。
- Evidence Collector 负责取证，Reality Checker 负责作出验收判断。
- 同一任务通常先调用 1 个主责机器人；只有存在清晰交接物时再调用下一个。
- 机器人不会自动持续工作，也不会替代真实用户调研、业务数据或负责人决策。
````

Expected: 新文件完整包含快速路由、12 个任务模板、4 条交接链路和使用边界。

- [ ] **Step 2: 验证指南覆盖全部机器人且无占位符**

Run:

```powershell
$Guide = 'C:\Users\z3635\官网改动\docs\agency-agents-product-team-guide.md'
$Names = @(
  'Product Manager','Trend Researcher','Behavioral Nudge Engine','UX Researcher',
  'Feedback Synthesizer','Sprint Prioritizer','Analytics Reporter','Rapid Prototyper',
  'UI Designer','Senior Project Manager','Evidence Collector','Reality Checker'
)
if (-not (Test-Path -LiteralPath $Guide)) { throw "Guide missing: $Guide" }
$Text = Get-Content -Raw -Encoding UTF8 -LiteralPath $Guide
$Missing = $Names | Where-Object { $Text -notmatch [regex]::Escape($_) }
if ($Missing) { throw "Guide is missing agents: $($Missing -join ', ')" }
if ($Text -match 'TBD|TODO|待定|待补充|placeholder') { throw 'Guide contains a placeholder' }
"PASS: guide covers all $($Names.Count) agents with no placeholders"
```

Expected: `PASS: guide covers all 12 agents with no placeholders`。

- [ ] **Step 3: 提交中文指南**

Run:

```powershell
Set-Location -LiteralPath 'C:\Users\z3635\官网改动'
git add -- 'docs/agency-agents-product-team-guide.md'
git commit -m 'docs: add product agent team usage guide' -- 'docs/agency-agents-product-team-guide.md'
```

Expected: 提交成功，提交只包含 `docs/agency-agents-product-team-guide.md`。

### Task 4: 最终验收和交付报告

**Files:**
- Read: `C:\Users\z3635\.codex\agents\*.toml`
- Read: `docs/agency-agents-product-team-guide.md`
- Read: `docs/superpowers/specs/2026-07-16-agency-agents-product-team-design.md`

- [ ] **Step 1: 对照设计文档执行最终自动检查**

Run:

```powershell
@'
from pathlib import Path
import tomllib

agent_root = Path(r"C:\Users\z3635\.codex\agents")
guide = Path(r"C:\Users\z3635\官网改动\docs\agency-agents-product-team-guide.md")
slugs = [
    "product-manager", "trend-researcher", "behavioral-nudge-engine",
    "ux-researcher", "feedback-synthesizer", "sprint-prioritizer",
    "analytics-reporter", "rapid-prototyper", "ui-designer",
    "senior-project-manager", "evidence-collector", "reality-checker",
]
guide_text = guide.read_text(encoding="utf-8")
for slug in slugs:
    path = agent_root / f"{slug}.toml"
    assert path.is_file(), path
    with path.open("rb") as fh:
        data = tomllib.load(fh)
    assert data["name"] in guide_text, data["name"]
    assert data["description"].strip()
    assert data["developer_instructions"].strip()
print("PASS: installation and guide satisfy the 12-agent design")
'@ | python -
if ($LASTEXITCODE -ne 0) { throw 'Final acceptance failed' }
```

Expected: `PASS: installation and guide satisfy the 12-agent design`。

- [ ] **Step 2: 确认 Codex CLI 可用并记录生效方式**

Run:

```powershell
& "$env:APPDATA\npm\codex.cmd" --version
if ($LASTEXITCODE -ne 0) { throw 'Codex CLI check failed' }
```

Expected: 输出 `codex-cli 0.130.0` 或更新版本。交付报告明确说明：机器人文件已经全局安装，建议新开 Codex 会话后按英文名称调用。

- [ ] **Step 3: 确认本次 Git 提交没有夹带用户现有改动**

Run:

```powershell
Set-Location -LiteralPath 'C:\Users\z3635\官网改动'
git show --name-status --format='%h %s' HEAD
git status --short -- 'docs/agency-agents-product-team-guide.md' 'docs/superpowers/specs/2026-07-16-agency-agents-product-team-design.md'
```

Expected: 最新提交只新增中文使用指南；两份目标文档没有未提交修改。工作区中其他既有修改保持原状。

- [ ] **Step 4: 向用户交付安装结果**

报告必须包含：

```text
- 成功安装数量：12
- 安装目录：C:\Users\z3635\.codex\agents
- 中文指南：C:\Users\z3635\官网改动\docs\agency-agents-product-team-guide.md
- 验证结果：生成 TOML、安装哈希、TOML 解析、指南覆盖均通过
- 生效方式：新开 Codex 会话后，直接使用英文机器人名称调用
- 未执行事项：未安装候补机器人，未修改 Codex 配置，未改动原始机器人定义
```

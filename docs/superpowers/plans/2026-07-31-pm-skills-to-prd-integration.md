# PM Skills 安装与 to-prd 单一入口整合实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 安装 21 个正式 PM Skills，将 `to-prd` 建成唯一 PRD 主入口，并用兼容桥接保留 `pm-master → pm-prd-writer` 工作流。

**Architecture:** 工作区 `.agents/skills/to-prd` 作为可版本控制的维护源，全局 `.codex/skills/to-prd` 作为运行副本；先备份两处旧版本，再修改维护源并同步。除 `pm-prd-writer` 外的正式 Skills 按原目录安装，`pm-prd-writer` 使用只转交 `to-prd` 的轻量适配器，避免第二套模板。

**Tech Stack:** Markdown、PowerShell、Python 3（Skill 结构校验器）、Git、SHA-256 文件一致性校验

---

## 文件结构

### 新建

- `docs/superpowers/plans/2026-07-31-pm-skills-to-prd-integration.md`
  - 本实施计划。
- `.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md`
  - 盖世游戏八章结构和通用 PRD 增强项的唯一合并模板。
- `tools/verify-pm-skills-install.ps1`
  - 检查安装数量、排除项、frontmatter、桥接规则、双副本同步和必需引用。
- `test-results/pm-skills-install/verification.json`
  - 安装验证脚本生成的机器可读结果。
- `C:\Users\z3635\.codex\skills\pm-prd-writer\SKILL.md`
  - PRD 兼容桥接 Skill。
- `C:\Users\z3635\.codex\backups\pm-skills-to-prd-<时间戳>\global-to-prd\`
  - 全局 `to-prd` 修改前备份。
- `C:\Users\z3635\.codex\backups\pm-skills-to-prd-<时间戳>\workspace-to-prd\`
  - 工作区 `to-prd` 修改前备份。

### 修改

- `.agents/skills/to-prd/SKILL.md`
  - 加入需求体检、信息缺口、复杂度裁剪、验收清单、兜底输出和合并模板引用。
- `C:\Users\z3635\.codex\skills\to-prd\SKILL.md`
  - 由工作区维护源同步生成。
- `C:\Users\z3635\.codex\skills\to-prd\references\*`
  - 由工作区维护源同步生成。
- `C:\Users\z3635\.codex\skills\to-prd\scripts\*`
  - 由工作区维护源同步生成。

### 安装但不修改内容

- `C:\Users\z3635\.codex\skills\pm-master\`
- `C:\Users\z3635\.codex\skills\pm-analytics\`
- `C:\Users\z3635\.codex\skills\pm-competitor-deconstructor\`
- `C:\Users\z3635\.codex\skills\pm-experiment-designer\`
- `C:\Users\z3635\.codex\skills\pm-image2pencil\`
- `C:\Users\z3635\.codex\skills\pm-image2proto\`
- `C:\Users\z3635\.codex\skills\pm-postmortem-writer\`
- `C:\Users\z3635\.codex\skills\pm-prioritization-engine\`
- `C:\Users\z3635\.codex\skills\pm-review-board\`
- `C:\Users\z3635\.codex\skills\pm-roadmap-planner\`
- `C:\Users\z3635\.codex\skills\pm-survey-designer\`
- `C:\Users\z3635\.codex\skills\pm-tracking-spec-writer\`
- `C:\Users\z3635\.codex\skills\pm-url2proto\`
- `C:\Users\z3635\.codex\skills\pm-advisory-board\`
- `C:\Users\z3635\.codex\skills\pm-advisor-cagan\`
- `C:\Users\z3635\.codex\skills\pm-advisor-torres\`
- `C:\Users\z3635\.codex\skills\pm-advisor-yujun\`
- `C:\Users\z3635\.codex\skills\pm-method-build-trap\`
- `C:\Users\z3635\.codex\skills\pm-method-mom-test\`
- `C:\Users\z3635\.codex\skills\pm-method-story-mapping\`

---

### Task 1: 建立安装前基线并创建备份

**Files:**

- Read: `分享skills/pm-skills-main/pm-skills-main/**`
- Read: `.agents/skills/to-prd/**`
- Read: `C:\Users\z3635\.codex\skills\to-prd\**`
- Create: `C:\Users\z3635\.codex\backups\pm-skills-to-prd-<时间戳>\**`

- [ ] **Step 1: 确认 21 个目标目录尚未安装**

Run:

```powershell
$dest = 'C:\Users\z3635\.codex\skills'
$expected = @(
  'pm-master',
  'pm-analytics',
  'pm-competitor-deconstructor',
  'pm-experiment-designer',
  'pm-image2pencil',
  'pm-image2proto',
  'pm-postmortem-writer',
  'pm-prd-writer',
  'pm-prioritization-engine',
  'pm-review-board',
  'pm-roadmap-planner',
  'pm-survey-designer',
  'pm-tracking-spec-writer',
  'pm-url2proto',
  'pm-advisory-board',
  'pm-advisor-cagan',
  'pm-advisor-torres',
  'pm-advisor-yujun',
  'pm-method-build-trap',
  'pm-method-mom-test',
  'pm-method-story-mapping'
)
$conflicts = $expected | Where-Object { Test-Path -LiteralPath (Join-Path $dest $_) }
$conflicts
```

Expected: 无输出。若有输出，停止安装并比较现有目录，不能覆盖。

- [ ] **Step 2: 记录两份 to-prd 的安装前文件清单和 SHA-256**

Run:

```powershell
$global = 'C:\Users\z3635\.codex\skills\to-prd'
$workspace = 'C:\Users\z3635\官网改动\.agents\skills\to-prd'
Get-ChildItem -File -Recurse -LiteralPath $global |
  ForEach-Object {
    [PSCustomObject]@{
      Root = 'global'
      Relative = $_.FullName.Substring($global.Length + 1)
      SHA256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
    }
  }
Get-ChildItem -File -Recurse -LiteralPath $workspace |
  ForEach-Object {
    [PSCustomObject]@{
      Root = 'workspace'
      Relative = $_.FullName.Substring($workspace.Length + 1)
      SHA256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
    }
  }
```

Expected: 两份 `SKILL.md` 的 SHA-256 一致；工作区副本比全局副本包含更多 `references`。

- [ ] **Step 3: 创建不会覆盖既有备份的时间戳目录**

Run:

```powershell
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "C:\Users\z3635\.codex\backups\pm-skills-to-prd-$stamp"
New-Item -ItemType Directory -Path $backup | Out-Null
Copy-Item -Recurse -LiteralPath 'C:\Users\z3635\.codex\skills\to-prd' -Destination (Join-Path $backup 'global-to-prd')
Copy-Item -Recurse -LiteralPath 'C:\Users\z3635\官网改动\.agents\skills\to-prd' -Destination (Join-Path $backup 'workspace-to-prd')
$backup
```

Expected: 输出唯一备份目录；其中存在 `global-to-prd\SKILL.md` 和 `workspace-to-prd\SKILL.md`。

- [ ] **Step 4: 验证备份完整性**

Run:

```powershell
$backup = Get-ChildItem -Directory -LiteralPath 'C:\Users\z3635\.codex\backups' |
  Where-Object Name -like 'pm-skills-to-prd-*' |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
Test-Path -LiteralPath (Join-Path $backup.FullName 'global-to-prd\SKILL.md')
Test-Path -LiteralPath (Join-Path $backup.FullName 'workspace-to-prd\SKILL.md')
```

Expected:

```text
True
True
```

---

### Task 2: 先创建会失败的安装验证器

**Files:**

- Create: `tools/verify-pm-skills-install.ps1`
- Create on execution: `test-results/pm-skills-install/verification.json`

- [ ] **Step 1: 创建验证脚本**

Create `tools/verify-pm-skills-install.ps1` with:

```powershell
param(
    [string]$InstalledRoot = 'C:\Users\z3635\.codex\skills',
    [string]$WorkspaceToPrd = 'C:\Users\z3635\官网改动\.agents\skills\to-prd',
    [string]$OutputPath = 'test-results\pm-skills-install\verification.json'
)

$ErrorActionPreference = 'Stop'

$expected = @(
    'pm-master',
    'pm-analytics',
    'pm-competitor-deconstructor',
    'pm-experiment-designer',
    'pm-image2pencil',
    'pm-image2proto',
    'pm-postmortem-writer',
    'pm-prd-writer',
    'pm-prioritization-engine',
    'pm-review-board',
    'pm-roadmap-planner',
    'pm-survey-designer',
    'pm-tracking-spec-writer',
    'pm-url2proto',
    'pm-advisory-board',
    'pm-advisor-cagan',
    'pm-advisor-torres',
    'pm-advisor-yujun',
    'pm-method-build-trap',
    'pm-method-mom-test',
    'pm-method-story-mapping'
)

$excluded = @('space-image2proto', 'space-url2proto')
$checks = [System.Collections.Generic.List[object]]::new()

function Add-Check {
    param(
        [string]$Name,
        [bool]$Passed,
        [string]$Detail
    )
    $checks.Add([PSCustomObject]@{
        name = $Name
        passed = $Passed
        detail = $Detail
    })
}

foreach ($skill in $expected) {
    $skillPath = Join-Path $InstalledRoot $skill
    $skillFile = Join-Path $skillPath 'SKILL.md'
    Add-Check "installed:$skill" (Test-Path -LiteralPath $skillFile) $skillFile

    if (Test-Path -LiteralPath $skillFile) {
        $lines = Get-Content -Encoding utf8 -LiteralPath $skillFile
        $nameLine = $lines | Where-Object { $_ -match '^name:\s*(.+)$' } | Select-Object -First 1
        $actualName = if ($nameLine -and $nameLine -match '^name:\s*(.+)$') { $Matches[1].Trim() } else { '' }
        Add-Check "frontmatter-name:$skill" ($actualName -eq $skill) "expected=$skill actual=$actualName"
    }
}

foreach ($skill in $excluded) {
    $skillPath = Join-Path $InstalledRoot $skill
    Add-Check "excluded:$skill" (-not (Test-Path -LiteralPath $skillPath)) $skillPath
}

$bridge = Join-Path $InstalledRoot 'pm-prd-writer\SKILL.md'
if (Test-Path -LiteralPath $bridge) {
    $bridgeText = Get-Content -Raw -Encoding utf8 -LiteralPath $bridge
    Add-Check 'bridge:reads-to-prd' ($bridgeText.Contains('../to-prd/SKILL.md')) '../to-prd/SKILL.md'
    Add-Check 'bridge:no-second-template' (-not $bridgeText.Contains('references/prd-template.md')) 'no independent PRD template'
}

$globalToPrd = Join-Path $InstalledRoot 'to-prd'
$globalFiles = @{}
$workspaceFiles = @{}

Get-ChildItem -File -Recurse -LiteralPath $globalToPrd | ForEach-Object {
    $relative = $_.FullName.Substring($globalToPrd.Length + 1)
    $globalFiles[$relative] = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
}

Get-ChildItem -File -Recurse -LiteralPath $WorkspaceToPrd | ForEach-Object {
    $relative = $_.FullName.Substring($WorkspaceToPrd.Length + 1)
    $workspaceFiles[$relative] = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
}

$allRelative = @($globalFiles.Keys + $workspaceFiles.Keys | Sort-Object -Unique)
foreach ($relative in $allRelative) {
    $same = $globalFiles.ContainsKey($relative) -and
        $workspaceFiles.ContainsKey($relative) -and
        $globalFiles[$relative] -eq $workspaceFiles[$relative]
    Add-Check "sync:$relative" $same $relative
}

$requiredToPrdFiles = @(
    'SKILL.md',
    'references\MERGED-PRD-TEMPLATE.md',
    'scripts\validate-prd-images.ps1'
)
foreach ($relative in $requiredToPrdFiles) {
    Add-Check "to-prd-required:$relative" (Test-Path -LiteralPath (Join-Path $globalToPrd $relative)) $relative
}

$failed = @($checks | Where-Object { -not $_.passed })
$result = [PSCustomObject]@{
    generatedAt = (Get-Date).ToString('o')
    expectedSkillCount = $expected.Count
    passed = $failed.Count -eq 0
    checks = $checks
    failureCount = $failed.Count
}

$outputFull = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath
} else {
    Join-Path (Get-Location) $OutputPath
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outputFull) | Out-Null
$result | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 -LiteralPath $outputFull
$result | ConvertTo-Json -Depth 6

if (-not $result.passed) {
    exit 1
}
```

- [ ] **Step 2: 运行验证器并确认它先失败**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tools\verify-pm-skills-install.ps1
```

Expected: exit code `1`；失败项包含 `installed:pm-master` 和 `to-prd-required:references\MERGED-PRD-TEMPLATE.md`。

- [ ] **Step 3: 检查失败结果文件已生成**

Run:

```powershell
Get-Content -Raw -Encoding utf8 'test-results\pm-skills-install\verification.json' |
  ConvertFrom-Json |
  Select-Object passed,expectedSkillCount,failureCount
```

Expected: `passed=False`、`expectedSkillCount=21`、`failureCount` 大于 `0`。

---

### Task 3: 创建合并 PRD 模板

**Files:**

- Create: `.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md`
- Test: `tools/verify-pm-skills-install.ps1`

- [ ] **Step 1: 写入合并模板的固定结构**

Create `.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md` with these exact top-level sections and rules:

```markdown
# 盖世游戏标准 PRD 合并模板

本模板是 `to-prd` 的唯一主模板。保留盖世游戏和飞书规范，并按需求复杂度启用通用 PRD 扩展块。说明文字用于指导写作，不原样复制进最终 PRD。

## 使用顺序

1. 先执行需求体检和范围确认。
2. 再生成“核心必填”章节。
3. 根据触发条件加入扩展块。
4. 最后生成待确认项、自检和模拟评审结果。

## 需求体检

|检查项|通过标准|未通过处理|
|---|---|---|
|需求来源|存在用户、业务或数据证据|标记 `[高风险假设]`，给出验证建议|
|用户价值|能说明用户当前替代方案及其问题|写入背景；无法说明时标记 `[高风险假设]`|
|成功定义|至少有一个可观测指标|列为必须确认项，并提供建议口径|

## 信息澄清

输出“已知信息”和“信息缺口”。信息缺口按“必须、建议、可后补”排序。用户允许自行判断时，所有推断使用 `[假设]`。

## 核心必填结构

# 【Prd】《盖世游戏》XXX需求

## 一、版本信息

|时间|版本|变更人|主要变更内容|备注|
|---|---|---|---|---|

## 二、背景与目标

### 2.1 需求背景

说明问题、证据、用户当前解决方式及为什么现在做。

### 2.2 目标与成功指标

|目标类型|目标|指标口径|基线|目标值|观察周期|
|---|---|---|---|---|---|

### 2.3 范围与不做事项

|类型|内容|
|---|---|
|本期范围||
|不做事项||
|硬性约束||

## 三、故事介绍

### 3.1 用户与运营场景

### 3.2 价值分析

### 3.3 核心体验路径

### 3.4 产品指标预测

### 3.5 路径规划

## 四、概要设计

### 4.1 模块设计

|模块|目标用户|核心能力|依赖|优先级|
|---|---|---|---|---|

### 4.2 详细设计（C端）

仅涉及 C 端或 C+B 端时输出。

|模块名称|图示|展示&交互说明|
|---|---|---|

每个模块的“展示&交互说明”至少覆盖入口、元素、操作反馈、状态、异常和验收条件。

### 4.3 详细设计（B端）

仅涉及 B 端或 C+B 端时输出。

|模块名称|图示|展示&交互说明|
|---|---|---|

#### 4.3.1 边界条件-内容侧

|场景|触发条件|处理方式|提示文案|
|---|---|---|---|

#### 4.3.2 边界条件-用户侧

|场景|触发条件|处理方式|提示文案|
|---|---|---|---|

## 五、非功能需求

|需求类型|详细要求|验收方式|
|---|---|---|
|性能|||
|兼容性|||
|安全与合规|||
|容错与降级|||
|数据生命周期|||

## 六、埋点需求

### 6.1 埋点事件表

|事件ID|事件名称|触发时机|关键参数|指标用途|
|---|---|---|---|---|

### 6.2 埋点参数表

|参数名|类型|必填|说明|枚举/示例|
|---|---|---|---|---|

## 七、运营需求

|优先级|准备事项|负责人角色|完成条件|最晚时间|
|---|---|---|---|---|

## 八、来自功能上线后的更新

记录上线后规则、数据和问题变化。

## 九、验收与待确认项

### 9.1 验收标准

|功能|前置条件|操作|预期结果|优先级|
|---|---|---|---|---|

### 9.2 待确认项

#### 必须确认（阻塞开发）

#### 建议确认（影响完整度）

#### 可后续补充

每条待确认项必须包含默认建议、影响范围和正文引用位置。

## 条件扩展块

### 多角色或后台系统：角色权限

|角色|功能权限|数据范围|禁止操作|
|---|---|---|---|

### 存在复杂状态：状态流转

|当前状态|触发事件|条件|下一状态|失败处理|
|---|---|---|---|---|

必要时增加 Mermaid `stateDiagram-v2`。

### 存在重要业务对象：数据字典

|字段名|类型|必填|业务含义|校验规则|示例值|
|---|---|---|---|---|---|

### 存在跨系统依赖：系统集成

|系统|方向|数据/接口|触发方式|失败降级|责任方|
|---|---|---|---|---|---|

### 单个复杂功能：用户故事与条件

- 用户故事：作为 `[角色]`，我希望 `[操作]`，以便 `[目的]`。
- 前置条件：进入功能前必须成立的权限、数据和状态条件。
- 后置条件：成功、失败和取消后产生的数据与状态变化。

## 兜底输出

当“问题、目标用户、核心流程、成功定义”中有两个以上不明确时，不输出完整 PRD，改为：

# [功能名] 需求梳理

## 当前理解

## 待回答的关键问题

## 可能的方案方向

## 建议下一步

## 自检要求

- 没有空泛的“提升体验”“优化性能”。
- 核心功能都有异常处理和验收条件。
- 国内/海外差异按实际范围检查。
- C/B 端结构按范围裁剪，不保留空章节。
- 所有假设和待确认项均汇总。
- 图片全部通过固定 SHA、HTTP 200 和 Content-Type 校验。
```

- [ ] **Step 2: 检查模板没有占位工作项**

Run:

```powershell
rg -n 'TBD|TODO|稍后补充|待编写' '.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md'
```

Expected: exit code `1`，无匹配。

- [ ] **Step 3: 检查模板包含核心和扩展结构**

Run:

```powershell
rg -n '需求体检|核心必填结构|条件扩展块|角色权限|状态流转|数据字典|系统集成|兜底输出|验收标准|待确认项' '.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md'
```

Expected: 每个关键词至少匹配一次。

---

### Task 4: 将 to-prd 更新为单一 PRD 执行核心

**Files:**

- Modify: `.agents/skills/to-prd/SKILL.md`
- Reference: `.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md`
- Test: `tools/verify-pm-skills-install.ps1`

- [ ] **Step 1: 扩展 to-prd frontmatter 触发说明**

Change `description` to:

```yaml
description: "将文字、截图、会议纪要或口述需求转化为开发和测试可直接执行、可导入飞书的盖世游戏标准 PRD；支持需求体检、范围澄清、复杂度裁剪、异常边界、验收标准、待确认项和既有 PRD 修订，并校验飞书图片使用固定 Git 提交的公开 HTTPS 地址。用户输入 /to-prd，或要求输出、创建、完善、评审 PRD、需求文档、产品规划、功能说明、验收标准和产品指标时使用。普通 PRD 请求统一由本 Skill 处理。"
```

- [ ] **Step 2: 在执行流程开始加入需求体检**

Insert before existing input collection:

```markdown
1. **需求体检**：
   - 需求来源是否有用户、业务或数据证据
   - 是否能说明用户当前替代方案及其问题
   - 是否有至少一个可观测的成功指标
   - 未通过项标记为 `[高风险假设]`；用户明确要求继续时不阻断写作
2. **提取已知信息与缺口**：
   - 已知信息：目标、用户、场景、路径、约束、端侧、地区
   - 信息缺口按“必须、建议、可后补”排序
   - 用户允许自行判断时使用 `[假设]`，不得把推断写成事实
```

Renumber the remaining workflow steps sequentially.

- [ ] **Step 3: 将模板加载指向唯一合并模板**

Add to “加载规范”:

```markdown
- `references/MERGED-PRD-TEMPLATE.md`（唯一 PRD 主模板，按复杂度裁剪）
```

Replace the duplicated inline full template with this concise overview:

```markdown
## PRD 输出结构

严格读取 `references/MERGED-PRD-TEMPLATE.md`：

- 固定保留盖世游戏八章主体，并增加“九、验收与待确认项”
- 仅 C 端时不输出空的 B 端章节
- 仅 B 端时不输出空的 C 端章节
- 多角色、复杂状态、重要业务对象和跨系统依赖分别触发对应扩展块
- 需求关键要素中有两个以上不明确时，输出需求梳理文档，不伪造完整 PRD
```

- [ ] **Step 4: 加入待确认项规则**

Add after the writing rules:

```markdown
### 待确认项

- 使用 `[待确认]`、`[假设]`、`[高风险假设]`
- 每条提供默认建议值
- 每条注明不确认会影响开发、测试还是上线
- 每条引用正文位置
- 按“必须确认、建议确认、可后续补充”排序
```

- [ ] **Step 5: 加入复杂度裁剪规则**

Add:

```markdown
### 复杂度裁剪

- 多角色或后台系统：增加角色权限表
- 存在复杂状态：增加状态流转表或 Mermaid 状态图
- 存在重要业务对象：增加数据字典
- 存在跨系统依赖：增加系统集成和降级说明
- 单个复杂功能：增加用户故事、前置条件和后置条件
- 不满足触发条件时不输出空表和空章节
```

- [ ] **Step 6: 修正自检清单路径**

Replace:

```text
prd/PRD自查清单-前端展示易遗漏项.md
```

with:

```text
prd/Skills/输出规范/PRD自查清单-前端展示易遗漏项.md
```

- [ ] **Step 7: 加入兜底模式**

Add before output location:

```markdown
## 信息不足时的兜底

当“问题、目标用户、核心流程、成功定义”中有两个以上不明确时：

1. 不输出完整 PRD
2. 输出“需求梳理文档”
3. 包含当前理解、关键问题、2–3 个方案方向和下一步建议
4. 用户补齐信息后再进入完整 PRD 流程
```

- [ ] **Step 8: 运行静态检查**

Run:

```powershell
rg -n 'MERGED-PRD-TEMPLATE|需求体检|高风险假设|复杂度裁剪|待确认项|兜底' '.agents/skills/to-prd/SKILL.md'
```

Expected: 所有关键词均存在。

- [ ] **Step 9: 运行 Skill 结构校验**

Run:

```powershell
python 'C:\Users\z3635\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'C:\Users\z3635\官网改动\.agents\skills\to-prd'
```

Expected: validation passed。

---

### Task 5: 安装 20 个原样 PM Skills

**Files:**

- Copy: `分享skills/pm-skills-main/pm-skills-main/pm-*/**`
- Copy: `分享skills/pm-skills-main/pm-skills-main/pm-advisory-suite/pm-*/**`
- Exclude: `pm-prd-writer`
- Exclude: `space-image2proto`
- Exclude: `space-url2proto`

- [ ] **Step 1: 校验 20 个原样源 Skill**

Run:

```powershell
$validator = 'C:\Users\z3635\.codex\skills\.system\skill-creator\scripts\quick_validate.py'
$source = 'C:\Users\z3635\官网改动\分享skills\pm-skills-main\pm-skills-main'
$top = Get-ChildItem -Directory -LiteralPath $source |
  Where-Object { $_.Name -like 'pm-*' -and $_.Name -notin @('pm-advisory-suite', 'pm-prd-writer') }
$advisors = Get-ChildItem -Directory -LiteralPath (Join-Path $source 'pm-advisory-suite') |
  Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') }
$sourceSkills = @($top + $advisors)
$sourceSkills.Count
foreach ($skill in $sourceSkills) {
  python $validator $skill.FullName
  if ($LASTEXITCODE -ne 0) { throw "Skill validation failed: $($skill.FullName)" }
}
```

Expected: count `20`；所有 Skill validation passed。

- [ ] **Step 2: 将顶层 13 个非 PRD Skill 安装到全局目录**

Run:

```powershell
$source = 'C:\Users\z3635\官网改动\分享skills\pm-skills-main\pm-skills-main'
$dest = 'C:\Users\z3635\.codex\skills'
$top = Get-ChildItem -Directory -LiteralPath $source |
  Where-Object { $_.Name -like 'pm-*' -and $_.Name -notin @('pm-advisory-suite', 'pm-prd-writer') }
foreach ($skill in $top) {
  $target = Join-Path $dest $skill.Name
  if (Test-Path -LiteralPath $target) { throw "Destination exists: $target" }
  Copy-Item -Recurse -LiteralPath $skill.FullName -Destination $target
}
$top.Count
```

Expected: count `13`。

- [ ] **Step 3: 将七个顾问 Skill 平铺安装**

Run:

```powershell
$source = 'C:\Users\z3635\官网改动\分享skills\pm-skills-main\pm-skills-main\pm-advisory-suite'
$dest = 'C:\Users\z3635\.codex\skills'
$advisors = Get-ChildItem -Directory -LiteralPath $source |
  Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') }
foreach ($skill in $advisors) {
  $target = Join-Path $dest $skill.Name
  if (Test-Path -LiteralPath $target) { throw "Destination exists: $target" }
  Copy-Item -Recurse -LiteralPath $skill.FullName -Destination $target
}
$advisors.Count
```

Expected: count `7`。

- [ ] **Step 4: 确认遗留目录没有被安装**

Run:

```powershell
Test-Path 'C:\Users\z3635\.codex\skills\space-image2proto'
Test-Path 'C:\Users\z3635\.codex\skills\space-url2proto'
```

Expected:

```text
False
False
```

---

### Task 6: 创建并安装 pm-prd-writer 兼容桥接

**Files:**

- Create: `C:\Users\z3635\.codex\skills\pm-prd-writer\SKILL.md`
- Test: `tools/verify-pm-skills-install.ps1`

- [ ] **Step 1: 创建兼容桥接 Skill**

Create `C:\Users\z3635\.codex\skills\pm-prd-writer\SKILL.md` with:

```markdown
---
name: pm-prd-writer
description: "PM Skills 工作流中的 PRD 兼容桥接。仅在 pm-master 明确路由到 pm-prd-writer、用户明确输入 /pm-prd-writer，或需要承接 PM Skills 上游产出继续生成 PRD 时使用。普通“写 PRD”“需求文档”请求直接使用 to-prd；本 Skill 不维护第二套模板。"
---

# pm-prd-writer 兼容桥接

## 目标

保持 `pm-master` 和其他 PM Skills 的既有链路可用，同时确保所有 PRD 都执行同一套 `to-prd` 规则。

## 执行

1. 读取 `../to-prd/SKILL.md` 的完整内容。
2. 按 `to-prd` 执行需求体检、范围确认、模板裁剪、PRD 生成、自检、模拟评审和图片校验。
3. 不读取或维护独立 PRD 模板。
4. 不弱化盖世游戏、国内/海外、飞书和固定 Git 提交图片规则。

## PM Skills 链路输入

若上游来自其他 PM Skill，先提取：

- 上游结论和证据。
- 已确定的用户、场景、目标、指标和约束。
- 仍未解决的分歧和假设。
- 本次 PRD 需要覆盖的端侧和地区。

将这些内容作为 `to-prd` 的输入，不要求用户重复说明已经明确的信息。

## 交接摘要

PRD 完成后追加不超过 10 行的交接摘要：

- 本步结论。
- 必须确认项。
- 建议进入 `pm-review-board` 评审的重点。
- `pm-tracking-spec-writer` 所需的核心链路和指标。
- 需要实验时交给 `pm-experiment-designer` 的假设与判定指标。
```

- [ ] **Step 2: 校验桥接 Skill**

Run:

```powershell
python 'C:\Users\z3635\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'C:\Users\z3635\.codex\skills\pm-prd-writer'
```

Expected: validation passed。

- [ ] **Step 3: 检查桥接没有第二套模板**

Run:

```powershell
rg -n '../to-prd/SKILL.md|不维护第二套模板|普通.*to-prd' 'C:\Users\z3635\.codex\skills\pm-prd-writer\SKILL.md'
rg -n 'references/prd-template.md' 'C:\Users\z3635\.codex\skills\pm-prd-writer'
```

Expected: 第一条命令匹配三个规则；第二条命令 exit code `1`。

---

### Task 7: 将工作区 to-prd 同步到全局安装副本

**Files:**

- Source: `.agents/skills/to-prd/**`
- Replace installed copy: `C:\Users\z3635\.codex\skills\to-prd\**`
- Backup: `C:\Users\z3635\.codex\backups\pm-skills-to-prd-<时间戳>\global-to-prd\**`

- [ ] **Step 1: 再次确认备份存在**

Run:

```powershell
$backup = Get-ChildItem -Directory -LiteralPath 'C:\Users\z3635\.codex\backups' |
  Where-Object Name -like 'pm-skills-to-prd-*' |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (-not $backup) { throw 'Backup not found' }
if (-not (Test-Path (Join-Path $backup.FullName 'global-to-prd\SKILL.md'))) { throw 'Global backup incomplete' }
if (-not (Test-Path (Join-Path $backup.FullName 'workspace-to-prd\SKILL.md'))) { throw 'Workspace backup incomplete' }
$backup.FullName
```

Expected: 输出本次完整备份目录。

- [ ] **Step 2: 只替换全局 to-prd 安装副本**

Run:

```powershell
$source = 'C:\Users\z3635\官网改动\.agents\skills\to-prd'
$target = 'C:\Users\z3635\.codex\skills\to-prd'
$resolvedTarget = [System.IO.Path]::GetFullPath($target)
if ($resolvedTarget -ne 'C:\Users\z3635\.codex\skills\to-prd') {
  throw "Unexpected target: $resolvedTarget"
}
Remove-Item -Recurse -LiteralPath $resolvedTarget
Copy-Item -Recurse -LiteralPath $source -Destination $resolvedTarget
```

Expected: 全局 `to-prd` 重新创建，包含工作区全部 `references` 和 `scripts`。

- [ ] **Step 3: 运行全局 to-prd 结构校验**

Run:

```powershell
python 'C:\Users\z3635\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'C:\Users\z3635\.codex\skills\to-prd'
```

Expected: validation passed。

- [ ] **Step 4: 比较两份 to-prd 文件清单和 SHA-256**

Run:

```powershell
$global = 'C:\Users\z3635\.codex\skills\to-prd'
$workspace = 'C:\Users\z3635\官网改动\.agents\skills\to-prd'
$g = Get-ChildItem -File -Recurse -LiteralPath $global | ForEach-Object {
  $relative = $_.FullName.Substring($global.Length + 1)
  "$relative|$((Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash)"
}
$w = Get-ChildItem -File -Recurse -LiteralPath $workspace | ForEach-Object {
  $relative = $_.FullName.Substring($workspace.Length + 1)
  "$relative|$((Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash)"
}
Compare-Object ($g | Sort-Object) ($w | Sort-Object)
```

Expected: 无输出。

---

### Task 8: 运行完整安装验证

**Files:**

- Test: `tools/verify-pm-skills-install.ps1`
- Generate: `test-results/pm-skills-install/verification.json`

- [ ] **Step 1: 运行完整验证器**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tools\verify-pm-skills-install.ps1
```

Expected: exit code `0`；JSON 中 `passed=true`、`expectedSkillCount=21`、`failureCount=0`。

- [ ] **Step 2: 汇总 21 个 Skill 校验结果**

Run:

```powershell
$validator = 'C:\Users\z3635\.codex\skills\.system\skill-creator\scripts\quick_validate.py'
$result = Get-Content -Raw -Encoding utf8 'test-results\pm-skills-install\verification.json' | ConvertFrom-Json
$skills = $result.checks |
  Where-Object { $_.name -like 'installed:*' -and $_.passed } |
  ForEach-Object { $_.name.Substring('installed:'.Length) }
foreach ($skill in $skills) {
  python $validator "C:\Users\z3635\.codex\skills\$skill"
  if ($LASTEXITCODE -ne 0) { throw "Validation failed: $skill" }
}
$skills.Count
```

Expected: count `21`；全部 validation passed。

- [ ] **Step 3: 检查 PRD 普通触发仅属于 to-prd**

Run:

```powershell
Get-Content -Encoding utf8 'C:\Users\z3635\.codex\skills\to-prd\SKILL.md' | Select-Object -First 8
Get-Content -Encoding utf8 'C:\Users\z3635\.codex\skills\pm-prd-writer\SKILL.md' | Select-Object -First 8
```

Expected:

- `to-prd` description 包含普通 PRD、需求文档和评审触发词。
- `pm-prd-writer` description 明确只用于 `pm-master`、显式命令和 PM 链路。

---

### Task 9: 验证三个 PRD 场景规则

**Files:**

- Read: `C:\Users\z3635\.codex\skills\to-prd\SKILL.md`
- Read: `C:\Users\z3635\.codex\skills\to-prd\references\MERGED-PRD-TEMPLATE.md`
- Record in: `test-results/pm-skills-install/verification.json`

- [ ] **Step 1: 验证仅 C 端场景**

Synthetic request:

```text
为盖世游戏 App 增加 MOD 收藏功能，仅 C 端、国内包。用户可在 MOD 详情收藏，并在“我的收藏”查看。
```

Assertions:

- 使用 C 端详细设计。
- 不保留空 B 端章节。
- 包含收藏与取消收藏、登录差异、重复点击、网络失败和空收藏状态。
- 包含收藏成功率或收藏后使用转化指标。
- 包含可执行验收条件和待确认项。

- [ ] **Step 2: 验证 C+B 端复杂场景**

Synthetic request:

```text
为国内和海外版增加 MOD 举报与后台审核功能。用户在 App 举报，运营在后台审核，举报单有待审核、通过、驳回和关闭状态。
```

Assertions:

- 同时使用 C 端和 B 端详细设计。
- 触发角色权限、状态流转、数据字典和系统集成扩展块。
- 区分国内与海外文案、登录和合规差异。
- 包含审核失败、重复举报、内容下架和通知失败的降级处理。
- 包含 C/B 两端验收条件。

- [ ] **Step 3: 验证已有带图 PRD 修改场景**

Synthetic request:

```text
修改一份已有的带图 PRD：增加横屏交互说明，保留历史版本，并导入飞书。
```

Assertions:

- 版本记录只追加。
- 原内容不删除。
- 新增内容按现有修改标记规则呈现。
- 图片必须是固定 40 位 SHA 的公开 HTTPS 地址。
- 图片数、固定 URL 数、HTTP 200 数和正确 Content-Type 数一致后才能交付。

- [ ] **Step 4: 将场景检查结果写入验证 JSON**

Extend the result object in `tools/verify-pm-skills-install.ps1` with:

```powershell
$scenarioChecks = @(
    [PSCustomObject]@{
        name = 'c-end-only'
        requiredRules = @('仅 C 端时不输出空的 B 端章节', '验收标准', '待确认项')
    },
    [PSCustomObject]@{
        name = 'c-and-b-complex'
        requiredRules = @('角色权限', '状态流转', '数据字典', '系统集成')
    },
    [PSCustomObject]@{
        name = 'existing-prd-with-images'
        requiredRules = @('版本表追加新行', '固定 SHA', 'HTTP 200', 'Content-Type')
    }
)

$toPrdContract = (
    Get-Content -Raw -Encoding utf8 (Join-Path $globalToPrd 'SKILL.md')
) + "`n" + (
    Get-Content -Raw -Encoding utf8 (Join-Path $globalToPrd 'references\MERGED-PRD-TEMPLATE.md')
)

foreach ($scenario in $scenarioChecks) {
    $missing = @($scenario.requiredRules | Where-Object { -not $toPrdContract.Contains($_) })
    Add-Check "scenario:$($scenario.name)" ($missing.Count -eq 0) ("missing=" + ($missing -join ','))
}
```

Place this block before `$failed` is calculated so scenario failures affect the final exit code.

- [ ] **Step 5: 再次运行验证器**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tools\verify-pm-skills-install.ps1
```

Expected: exit code `0`；三个 `scenario:*` 检查均为 `passed=true`。

---

### Task 10: 复核工作区改动并提交维护源

**Files:**

- Modify: `.agents/skills/to-prd/SKILL.md`
- Create: `.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md`
- Create: `tools/verify-pm-skills-install.ps1`
- Create: `test-results/pm-skills-install/verification.json`

- [ ] **Step 1: 扫描计划外改动**

Run:

```powershell
git status --short -- `
  '.agents/skills/to-prd' `
  'tools/verify-pm-skills-install.ps1' `
  'test-results/pm-skills-install' `
  'docs/superpowers/plans/2026-07-31-pm-skills-to-prd-integration.md'
```

Expected: 只显示本计划明确列出的文件。

- [ ] **Step 2: 检查 Markdown 和 PowerShell 差异**

Run:

```powershell
git diff --check -- `
  '.agents/skills/to-prd/SKILL.md' `
  '.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md' `
  'tools/verify-pm-skills-install.ps1'
```

Expected: 无输出。

- [ ] **Step 3: 最终运行安装验证**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tools\verify-pm-skills-install.ps1
```

Expected: exit code `0`，`passed=true`，`failureCount=0`。

- [ ] **Step 4: 只提交维护源和验证证据**

Run:

```powershell
git add -- `
  '.agents/skills/to-prd/SKILL.md' `
  '.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md' `
  'tools/verify-pm-skills-install.ps1' `
  'test-results/pm-skills-install/verification.json'
git commit -m 'feat: install unified pm skill workflow'
```

Expected: 新提交只包含以上四个路径，不包含当前工作区的其他修改。

- [ ] **Step 5: 记录最终状态**

Run:

```powershell
$result = Get-Content -Raw -Encoding utf8 'test-results\pm-skills-install\verification.json' | ConvertFrom-Json
[PSCustomObject]@{
  Passed = $result.passed
  Installed = @($result.checks | Where-Object { $_.name -like 'installed:*' -and $_.passed }).Count
  Failures = $result.failureCount
  Backup = (
    Get-ChildItem -Directory -LiteralPath 'C:\Users\z3635\.codex\backups' |
      Where-Object Name -like 'pm-skills-to-prd-*' |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
  ).FullName
}
```

Expected:

```text
Passed   : True
Installed: 21
Failures : 0
Backup   : C:\Users\z3635\.codex\backups\pm-skills-to-prd-<本次时间戳>
```

# to-prd vNext Skill Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的盖世游戏 PRD vNext 模板写入全局与工作区 `/to-prd` Skill，并用机械校验阻止旧结构回归。

**Architecture:** 全局 `C:\Users\z3635\.codex\skills\to-prd` 作为维护源，工作区 `.agents\skills\to-prd` 同步核心文件。`SKILL.md` 负责强制工作流，`MERGED-PRD-TEMPLATE.md` 负责唯一成稿结构，质量标准和问题模式负责条件规则，PowerShell 校验器负责可机械判断的硬约束。

**Tech Stack:** Markdown、PowerShell、Python Skill 校验器、taskctl CLI

---

### Task 1: 锁定任务与文件边界

**Files:**
- Create: `docs/superpowers/plans/2026-08-27-to-prd-vnext-skill-sync.md`
- Read: `C:\Users\z3635\.codex\skills\to-prd\**`
- Read: `.agents\skills\to-prd\**`

- [x] **Step 1: 读取任务最新版本与评论**

Run: `taskctl issue get GUANWANGGAID-42 --json` 和 `taskctl comment list GUANWANGGAID-42 --json`

Expected: 当前状态、版本、全部确认要求可见。

- [x] **Step 2: 将任务移回进行中**

Run: `taskctl issue move GUANWANGGAID-42 --status in_progress --if-version <latest-version> --json`

Expected: 状态为 `in_progress`，版本递增。

### Task 2: 更新唯一模板与入口规则

**Files:**
- Modify: `C:\Users\z3635\.codex\skills\to-prd\SKILL.md`
- Modify: `C:\Users\z3635\.codex\skills\to-prd\references\MERGED-PRD-TEMPLATE.md`

- [x] **Step 1: 将 vNext 写成唯一成稿模板**

保留四列修订记录、第一章文档概述、第二章产品说明、第三章 C/B 分端页面六要素、第四章埋点与按需非功能、第五章待确认、按需第六章附录。删除目录、功能优先级、公共规则编号、独立验收、独立数据校验和项目管理字段。

- [x] **Step 2: 加入页面和流程图约束**

页面图最多三张，按前置→当前→后续；产品流程优先将各步骤页面合成一张由左到右的横向图。页面内子功能固定使用 `类型｜图示｜内容｜说明` 汇总表。

- [x] **Step 3: 加入简洁写作门禁**

删除 AI 腔、无用章节、重复定义和无决策价值内容；能短则短，但不得省略触发、条件、结果、异常、恢复和数据口径。

### Task 3: 更新质量规则和问题模式

**Files:**
- Modify: `C:\Users\z3635\.codex\skills\to-prd\references\PRD-QUALITY-STANDARD.md`
- Modify: `C:\Users\z3635\.codex\skills\to-prd\references\PRD-QUALITY-PATTERNS.md`

- [x] **Step 1: 替换单一真相源规则**

取消公共规则编号和 C/B 三列大表，改为每页六要素表；C/B 各自写清完整关系并做一致性检查。

- [x] **Step 2: 修订旧问题模式**

更新 P04、P08、P13，并新增去 AI 腔、内容重复和流程图散乱的可复用模式。

### Task 4: 升级机械校验并回归

**Files:**
- Modify: `C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1`
- Create temporarily outside repository: positive and negative PRD fixtures

- [x] **Step 1: 校验新结构硬约束**

检查四列修订记录与表后搜索备注、页面六要素、图示上限、子功能四列表、埋点五列表和事件参数一致性。

- [x] **Step 2: 阻止旧结构回归**

拒绝公共规则编号、C/B 三列主表、独立验收章、独立数据校验表和项目管理字段；检测常见 AI 腔并提示重复风险。

- [x] **Step 3: 执行正反例回归**

Run: `powershell -ExecutionPolicy Bypass -File scripts/validate-prd-quality.ps1 -Path <fixture> -ExpectedResult Pass|Fail -Json`

Expected: 合格样例通过，旧模板与缺字段样例失败。

### Task 5: 同步工作区副本并验证

**Files:**
- Modify: `.agents\skills\to-prd\SKILL.md`
- Modify/Create: `.agents\skills\to-prd\references\MERGED-PRD-TEMPLATE.md`
- Create: `.agents\skills\to-prd\references\PRD-QUALITY-STANDARD.md`
- Create: `.agents\skills\to-prd\references\PRD-QUALITY-PATTERNS.md`
- Create: `.agents\skills\to-prd\scripts\validate-prd-quality.ps1`

- [x] **Step 1: 同步核心文件**

以全局版为源同步五个核心文件，不删除工作区其他历史参考文件。

- [x] **Step 2: 验证 Skill 结构**

Run: `python C:\Users\z3635\.codex\skills\.system\skill-creator\scripts\quick_validate.py <skill-path>`

Expected: 全局版和工作区版均通过。

- [x] **Step 3: 核对文件哈希**

Run: `Get-FileHash` 比较两份核心文件。

Expected: 五个核心文件哈希逐一相同。

### Task 6: 交付任务板审核

**Files:**
- No repository file changes

- [ ] **Step 1: 添加验证评论**

评论说明模板、入口规则、校验脚本、同步结果、验证证据和剩余风险。

- [ ] **Step 2: 移回待审核**

Run: `taskctl issue move GUANWANGGAID-42 --status in_review --if-version <latest-version> --json`

Expected: 状态为 `in_review`；未获用户确认前不标记 `done`。

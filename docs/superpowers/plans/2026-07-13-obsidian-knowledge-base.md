# Obsidian Knowledge Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable structure in `D:\大超个人仓库`, keeping product work central, personal material separate, raw sources isolated, and future AI maintenance traceable.

**Architecture:** The vault will use a control-plane folder (`00-控制台`), a product strategy layer, a single `盖世游戏` project hub, a personal layer, an AI collaboration layer, and a raw archive layer. Existing source files under `C:\Users\z3635\官网改动` remain unchanged; selected canonical documents are copied into the vault and recorded in a maintenance log.

**Tech Stack:** Obsidian, UTF-8 Markdown, ordinary Markdown links and embeds, PowerShell for safe directory creation/copying, no community plugins.

---

### Task 1: Create the vault directory skeleton

**Files:**
- Create directories under `D:\大超个人仓库`: `00-控制台`, `10-战略与规划`, `20-项目\盖世游戏`, `30-方法与规范`, `40-复盘与周报`, `50-个人`, `60-AI协作`, `90-模板`, `90-原始档案` and their documented subdirectories.
- Do not modify any file under `D:\大超个人仓库\.obsidian`.

- [ ] **Step 1: Create the approved directory tree**

Run a PowerShell `New-Item -ItemType Directory -Force` command for each approved directory. Expected result: all directories exist and no existing file is removed.

- [ ] **Step 2: Verify the tree**

Run `Get-ChildItem -Recurse -Directory 'D:\大超个人仓库'` and confirm the result contains every directory listed in the revised design.

### Task 2: Create the control plane and AI collaboration notes

**Files:**
- Create: `D:\大超个人仓库\00-控制台\首页.md`
- Create: `D:\大超个人仓库\00-控制台\收件箱.md`
- Create: `D:\大超个人仓库\00-控制台\当前工作.md`
- Create: `D:\大超个人仓库\00-控制台\待确认.md`
- Create: `D:\大超个人仓库\00-控制台\维护日志.md`
- Create: `D:\大超个人仓库\60-AI协作\个人偏好.md`
- Create: `D:\大超个人仓库\60-AI协作\当前项目背景.md`
- Create: `D:\大超个人仓库\60-AI协作\稳定结论.md`
- Create: `D:\大超个人仓库\60-AI协作\待确认记忆.md`
- Create: `D:\大超个人仓库\60-AI协作\常用提示词.md`

- [ ] **Step 1: Write the control-plane notes**

Use ordinary Markdown links to the major areas. `维护日志.md` must record the source scan date, the 692-file inventory, the excluded tool directories, this implementation batch, and all copied/moved files.

- [ ] **Step 2: Write the AI collaboration boundaries**

State that only user-confirmed information enters `个人偏好.md` or `稳定结论.md`; uncertain inferences go to `待确认记忆.md`; raw conversations stay in `90-原始档案/AI会话原文/`.

- [ ] **Step 3: Verify navigation links**

Check every link in `首页.md` points to an existing file or directory entry created in this plan.

### Task 3: Create the project hub, strategy hub, and templates

**Files:**
- Create: `D:\大超个人仓库\20-项目\盖世游戏\00-项目主页.md`
- Create: `D:\大超个人仓库\90-原始档案\来源映射.md`
- Create: `D:\大超个人仓库\90-原始档案\重复待清理\候选清单.md`
- Create: `D:\大超个人仓库\90-模板\日记模板.md`
- Create: `D:\大超个人仓库\90-模板\项目模板.md`
- Create: `D:\大超个人仓库\90-模板\资料摘录模板.md`
- Create: `D:\大超个人仓库\90-模板\复盘模板.md`

- [ ] **Step 1: Build the 盖世游戏 project hub**

Add links to requirements, data/feedback, testing/acceptance, demos/design, meetings/decisions, current strategy, the current work note, and the maintenance log. Add a short project status section without inventing project facts not present in the source materials.

- [ ] **Step 2: Add source mapping and duplicate tracking**

Record source path, target path, status, and reason for every item copied in this batch. Record exact duplicate groups and filename-based duplicate candidates without deleting them.

- [ ] **Step 3: Create the four reusable templates**

Each template must include date/title, lifecycle status, source, linked project, and the content sections approved in the revised design.

### Task 4: Migrate the three existing vault notes safely

**Files:**
- Move: `D:\大超个人仓库\欢迎.md` to `D:\大超个人仓库\90-原始档案\外部导入\欢迎-原始.md`
- Move: `D:\大超个人仓库\2026-07-13.md` to `D:\大超个人仓库\40-复盘与周报\日记\2026-07-13.md`
- Move: `D:\大超个人仓库\【Prd】《盖世游戏》个性化推荐需求.md` to `D:\大超个人仓库\20-项目\盖世游戏\01-需求与方案\【Prd】《盖世游戏》个性化推荐需求.md`

- [ ] **Step 1: Verify all three source files exist and capture their hashes**

Run `Get-FileHash` before moving. Expected result: three hashes are recorded in the maintenance log.

- [ ] **Step 2: Move files within the vault**

Use `Move-Item -LiteralPath` with exact paths. Do not use recursive deletion or wildcard paths.

- [ ] **Step 3: Repair the daily-note embed**

The migrated daily note must embed `20-项目/盖世游戏/01-需求与方案/【Prd】《盖世游戏》个性化推荐需求` using an Obsidian path-aware embed.

- [ ] **Step 4: Verify destination hashes and link targets**

Confirm destination hashes match the pre-move hashes, the three original root paths no longer exist, and the daily note contains the new embed target.

### Task 5: Copy representative canonical source materials

**Files:**
- Copy strategy materials to `D:\大超个人仓库\10-战略与规划\`:
  - `盖世游戏-近期产品功能规划.md`
  - `APP核心优化\核心用户心智与产品战略规划.md`
  - `APP核心优化\差异化竞争策略与核心优化方案.md`
  - `APP核心优化\Q3产品路线图.md`
  - `APP核心优化\数据分析\核心链路数据分析报告.md`
- Copy project materials to `D:\大超个人仓库\20-项目\盖世游戏\`:
  - `prd\ai生成\云游戏组队玩需求.md` to `01-需求与方案\云游戏组队玩需求.md`
  - `prd\ai生成\云游戏组队玩-CTO确认框架.md` to `05-会议与决策\云游戏组队玩-CTO确认框架.md`
  - `意见反馈\反馈归纳_2026-06-22.md` to `02-数据与反馈\反馈归纳_2026-06-22.md`
  - `功能验收\验收prd\【Prd】《盖世游戏》APP&MAC云游戏组队玩需求.md` to `03-测试与验收\【Prd】《盖世游戏》APP&MAC云游戏组队玩需求.md`
  - `测试用例\需求prd\【Prd】《盖世游戏》社区首页需求.md` to `03-测试与验收\【Prd】《盖世游戏》社区首页需求.md`
  - `demos\DEMO目录汇总.md` to `04-Demo与设计\DEMO目录汇总.md`
  - `demos\社区\社区游戏详情页改动demo-时序图.md` to `04-Demo与设计\社区游戏详情页改动demo-时序图.md`
- Copy process records to `D:\大超个人仓库\90-原始档案\AI会话原文\`:
  - `聊天记录.md`
  - `prd\ai生成\云游戏组队玩-完整会话记录.md`
  - `prd\ai生成\历史会话记录汇总.md`
- Copy one relevant standards pair to `D:\大超个人仓库\30-方法与规范\`:
  - `prd\Skills\UI规范\盖世游戏APP-UI设计规范.md`
  - `prd\Skills\输出规范\PRD自查清单-前端展示易遗漏项.md`

- [ ] **Step 1: Verify every source file exists**

Run `Test-Path -LiteralPath` for every source path. Stop the copy batch if any required source is missing.

- [ ] **Step 2: Copy without changing the source workspace**

Use `Copy-Item -LiteralPath` to the exact destination paths. Expected result: source files remain byte-for-byte unchanged.

- [ ] **Step 3: Record each copy in `来源映射.md` and `维护日志.md`**

Include source path, destination path, source hash, destination hash, and lifecycle status `已确认` or `原始档案`.

- [ ] **Step 4: Verify copied hashes**

Run `Get-FileHash` on every source/destination pair and confirm equality.

### Task 6: Isolate duplicate candidates and complete validation

**Files:**
- Create: `D:\大超个人仓库\90-原始档案\重复待清理\` copies of exact duplicate or backup candidates only when they are part of the selected initial batch.
- Modify: `D:\大超个人仓库\00-控制台\维护日志.md`
- Modify: `D:\大超个人仓库\90-原始档案\来源映射.md`

- [ ] **Step 1: Record exact duplicate groups**

Record the exact duplicate groups already found: the two `vivo` PRD copies and the two `产品规划会` copies. Do not delete or overwrite either source.

- [ ] **Step 2: Validate vault invariants**

Run checks for: no files under `.obsidian` changed, all destination files exist, all source files remain unchanged except the three explicitly moved vault notes, no copied file is zero bytes, and all core links resolve by matching destination paths.

- [ ] **Step 3: Append a maintenance entry**

Record completion date, files created/moved/copied, unresolved items, and the next maintenance batch: classify the remaining non-tool Markdown files by project module and lifecycle status.

- [ ] **Step 4: Report the result**

Provide the user with the vault entry point, migration summary, verification results, and the exact remaining backlog. Do not claim the whole source workspace is fully migrated until the backlog is processed.

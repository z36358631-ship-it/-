# Mac QR Login Feishu Table Format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除扫码登录 PRD 的正文重复标题，统一优化 9 张表的内容格式和飞书列宽，同时保持现有产品规则、图片和 Demo 不变。

**Architecture:** Markdown 是内容源，只保存标题、编号、加粗、换行和固定图片链接；飞书是最终阅读版，手动保存 9 张表的整体宽度和列宽。先完成 Markdown 与自动校验，再提交并推送 Git，最后导入飞书、调整列宽并逐表验收。

**Tech Stack:** Markdown、PowerShell、Node.js、Git、taskctl、飞书云文档、Chrome

---

### Task 1: 建立修改基线

**Files:**
- Read: `docs/superpowers/specs/2026-08-06-mac-qr-login-feishu-table-format-design.md`
- Read: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`
- Test: `tools/verify-mac-qr-login-result-states.mjs`

- [ ] **Step 1: 检查目标文件和工作区**

Run:

```powershell
git status --short
git log -3 --oneline
```

Expected: 干净工作区；最近提交记录中包含格式设计说明 `a3986aba` 和本实施计划。

- [ ] **Step 2: 记录 Markdown 基线**

Run:

```powershell
$prd='prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
$raw=Get-Content -Raw -Encoding utf8 -LiteralPath $prd
$section42=[regex]::Match($raw,'(?s)### 4\.2 .*?(?=### 4\.3 )').Value
[pscustomobject]@{
  FirstLine=(Get-Content -Encoding utf8 -LiteralPath $prd -TotalCount 1)
  H1=([regex]::Matches($raw,'(?m)^# ')).Count
  TableHeaders=([regex]::Matches($raw,'(?m)^\|---')).Count
  PageRows=([regex]::Matches($section42,'(?m)^\|\*\*(?:App|Mac)')).Count
  CircledTrigger=([regex]::Matches($section42,'\*\*① 触发条件：\*\*')).Count
  Images=([regex]::Matches($raw,'!\[[^\]]*\]\(https://[^)]+\)')).Count
}
```

Expected: `FirstLine=# 【Prd】《盖世游戏》移动端扫码登录Mac端需求`、`H1=1`、`TableHeaders=9`、`PageRows=15`、`CircledTrigger=15`、`Images=14`。

- [ ] **Step 3: 验证当前交互契约**

Run:

```powershell
node tools/verify-mac-qr-login-result-states.mjs
```

Expected: `mac qr login result states: PASS`。

### Task 2: 修改 Markdown 内容格式

**Files:**
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`

- [ ] **Step 1: 删除正文一级标题**

删除文件首行：

```markdown
# 【Prd】《盖世游戏》移动端扫码登录Mac端需求
```

删除后文件从以下内容开始：

```markdown
## 一、版本信息
```

- [ ] **Step 2: 将 4.2 五类标签改为自然编号**

在 4.2 的 15 行中执行以下一一替换，保留每项之间的 `<br>`：

```markdown
**① 触发条件：** → 1. **触发条件：**
**② 页面展示：** → 2. **页面展示：**
**③ 操作流程：** → 3. **操作流程：**
**④ 状态反馈：** → 4. **状态反馈：**
**⑤ 异常处理：** → 5. **异常处理：**
```

不得修改编号后的正文内容、模块名称、图片链接或表格结构。

- [ ] **Step 3: 检查只发生允许的内容变化**

Run:

```powershell
git diff --word-diff=plain -- 'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
```

Expected: 仅删除首行 H1，并将 75 个带圈序号标签替换为 `1.` 至 `5.`；产品规则正文没有变化。

### Task 3: 验证 Markdown、图片和 Demo

**Files:**
- Test: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`
- Test: `tools/verify-mac-qr-login-result-states.mjs`

- [ ] **Step 1: 运行结构检查**

Run:

```powershell
$prd='prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
$raw=Get-Content -Raw -Encoding utf8 -LiteralPath $prd
$section42=[regex]::Match($raw,'(?s)### 4\.2 .*?(?=### 4\.3 )').Value
[pscustomobject]@{
  FirstLine=(Get-Content -Encoding utf8 -LiteralPath $prd -TotalCount 1)
  H1=([regex]::Matches($raw,'(?m)^# ')).Count
  TableHeaders=([regex]::Matches($raw,'(?m)^\|---')).Count
  PageRows=([regex]::Matches($section42,'(?m)^\|\*\*(?:App|Mac)')).Count
  Trigger=([regex]::Matches($section42,'1\. \*\*触发条件：\*\*')).Count
  Display=([regex]::Matches($section42,'2\. \*\*页面展示：\*\*')).Count
  Flow=([regex]::Matches($section42,'3\. \*\*操作流程：\*\*')).Count
  Feedback=([regex]::Matches($section42,'4\. \*\*状态反馈：\*\*')).Count
  Exception=([regex]::Matches($section42,'5\. \*\*异常处理：\*\*')).Count
  CircledLabels=([regex]::Matches($section42,'\*\*[①②③④⑤]')).Count
  Images=([regex]::Matches($raw,'!\[[^\]]*\]\(https://[^)]+\)')).Count
}
```

Expected: `FirstLine=## 一、版本信息`、`H1=0`、`TableHeaders=9`、`PageRows=15`、五类自然编号均为 `15`、`CircledLabels=0`、`Images=14`。

- [ ] **Step 2: 验证固定链接与远程资源**

Run:

```powershell
$prd='prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
$raw=Get-Content -Raw -Encoding utf8 -LiteralPath $prd
$urls=[regex]::Matches($raw,'https://[^)]+') | ForEach-Object {$_.Value} | Sort-Object -Unique
$urls | ForEach-Object {
  $response=Invoke-WebRequest -Uri $_ -Method Head -UseBasicParsing
  [pscustomobject]@{Url=$_;Status=$response.StatusCode;ContentType=$response.Headers['Content-Type']}
}
```

Expected: 14 张图片均返回 `200` 和 `image/png`；Demo 返回 `200` 和 `text/html`；不存在本地路径、`@master`、`@main` 或浮动分支链接。

- [ ] **Step 3: 运行行为与 Markdown 检查**

Run:

```powershell
node tools/verify-mac-qr-login-result-states.mjs
git diff --check
```

Expected: 行为契约 `PASS`；`git diff --check` 无输出。

### Task 4: 提交并推送 Git

**Files:**
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`

- [ ] **Step 1: 暂存并检查提交范围**

Run:

```powershell
git add -- 'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
git diff --cached --check
git diff --cached --stat
```

Expected: 暂存区仅包含目标 PRD；设计说明和实施计划已在前序提交中；检查无错误。

- [ ] **Step 2: 提交内容修改**

Run:

```powershell
git commit -m 'docs: optimize Mac QR login Feishu tables'
```

Expected: 提交成功，工作区干净。

- [ ] **Step 3: 更新并推送远端 master**

Run:

```powershell
git fetch origin master
git rebase refs/remotes/origin/master
git push origin HEAD:master
```

Expected: 推送成功，远端 `master` 包含设计说明、实施计划和更新后的 PRD。

### Task 5: 导入飞书并调整 9 张表

**Files:**
- Upload: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`
- Read: `docs/superpowers/specs/2026-08-06-mac-qr-login-feishu-table-format-design.md`

- [ ] **Step 1: 导入更新后的 Markdown**

在飞书云盘选择“上传 → 导入为在线文档 → Markdown”，上传目标 PRD。导入完成后确认顶部标题为“【Prd】《盖世游戏》移动端扫码登录Mac端需求”。

Expected: 生成新的飞书在线文档；正文第一项为“一、版本信息”，不再重复显示文档标题。

- [ ] **Step 2: 调整前 4 张表**

将表格整体放宽，并按以下比例拖动列边界：

```text
版本信息：16 / 12 / 16 / 40 / 16
范围：22 / 78
模块职责：22 / 78
4.2 页面与状态：21 / 38 / 41
```

Expected: “主要变更内容”“内容”“职责”列明显更宽；4.2 图示完整，说明列少换行。

- [ ] **Step 3: 调整后 5 张表**

按以下比例拖动列边界：

```text
服务端状态：16 / 29 / 18 / 37
非功能需求：17 / 55 / 28
埋点：31 / 29 / 40
指标：24 / 52 / 24
验收标准：18 / 27 / 45 / 10
```

Expected: 状态和优先级等短字段列保持紧凑，条件、要求、参数、口径和预期结果列获得主要空间。

### Task 6: 验收飞书成品

**Files:**
- Verify: 新生成的飞书在线文档

- [ ] **Step 1: 验收标题、目录和正文**

检查顶部标题、目录和正文首屏。

Expected: 顶部标题只出现一次；目录从“一、版本信息”开始；章节结构仍为八章。

- [ ] **Step 2: 验收 4.2**

导航至“4.2 C 端页面与状态”，检查 15 行页面状态。

Expected: 表头为“模块名称｜图示｜展示&交互说明”；每行包含 1—5 自然编号、换行和加粗标签；13 张页面图正常显示；没有带圈序号。

- [ ] **Step 3: 验收全部表格列宽**

逐章检查 9 张表，使用 DOM 读取各表首行单元格宽度并计算占比。

Expected: 各表比例与设计值方向一致，允许约 ±5% 目视微调；不存在机械等宽分列；图片和长说明无明显挤压。

- [ ] **Step 4: 验收图片和链接**

检查流程图、13 张页面图和 Demo 链接。

Expected: 14 张图片均可见；Demo 可打开；链接继续使用固定提交 SHA `3af87cfa41fc7236c240c230d54d56713256379a`。

### Task 7: 回写任务板并提交评审

**Files:**
- Read: `GUANWANGGAID-1`

- [ ] **Step 1: 读取最新任务和评论**

Run:

```powershell
$issue=taskctl.cmd issue get GUANWANGGAID-1 --json | ConvertFrom-Json
$issue.task.version
taskctl.cmd comment list GUANWANGGAID-1 --json
```

Expected: 获得最新 `version`、状态和评论。

- [ ] **Step 2: 添加交付评论**

Run:

```powershell
taskctl.cmd comment add GUANWANGGAID-1 --body '飞书格式优化已完成：删除正文重复标题；4.2 改为自然编号、换行和加粗标签；全文 9 张表按内容调整列宽；产品逻辑、页面、Toast、弹窗、图片和协议未变。已验证 9 张表、15 个页面状态、14 张固定 SHA 图片、Demo、Markdown 和行为契约。Git 提交与飞书文档链接见本轮交付。' --json
```

Expected: 评论创建成功。

- [ ] **Step 3: 移至评审**

重新读取最新版本号后执行移动：

```powershell
$version=(taskctl.cmd issue get GUANWANGGAID-1 --json | ConvertFrom-Json).task.version
taskctl.cmd issue move GUANWANGGAID-1 --status in_review --if-version $version --json
```

Expected: 状态为 `in_review`；不得直接移至 `done`。

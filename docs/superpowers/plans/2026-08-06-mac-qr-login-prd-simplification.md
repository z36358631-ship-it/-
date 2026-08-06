# Mac QR Login PRD Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将扫码登录 PRD 从 536 行压缩到 180–220 行，把全部 App、Mac 页面与结果状态统一归入 4.2 表格，同时保留开发、测试所需规则。

**Architecture:** 只修改 PRD 和本次实施计划，不改 Demo、截图和产品逻辑。PRD 按“范围 → 流程 → 4.2 C 端主表 → 服务端关键规则 → 非功能 → 埋点 → 发布 → 验收”组织，所有内容以当前 V1.2 最终规则为准。

**Tech Stack:** Markdown、PowerShell、Node.js、Git、taskctl

---

### Task 1: 建立精简前基线

**Files:**
- Read: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`
- Test: `tools/verify-mac-qr-login-result-states.mjs`

- [ ] **Step 1: 记录现有结构与链接基线**

Run:

```powershell
$prd='prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
(Get-Content -LiteralPath $prd -Encoding utf8).Count
rg -n '^#{1,4} |图片和附件/|@master|@main|/master/|/main/' -- $prd
```

Expected: 行数为 536；不存在本地图片路径和浮动分支链接。

- [ ] **Step 2: 验证当前产品行为契约**

Run:

```powershell
node tools/verify-mac-qr-login-result-states.mjs
```

Expected: `mac qr login result states: PASS`。

### Task 2: 重写 PRD

**Files:**
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`

- [ ] **Step 1: 更新版本信息与正文结构**

保留 V1.0–V1.3 版本行，新增 V1.4“精简结构、合并重复规则、C 端页面统一归入 4.2”。正文改为八章：

1. 版本信息。
2. 背景、目标与范围。
3. 核心流程。
4. 功能设计。
5. 非功能需求。
6. 埋点。
7. 发布与指标。
8. 验收与待确认项。

- [ ] **Step 2: 将全部 C 端页面与状态归入 4.2**

4.2 使用统一表头：

```markdown
|端|页面或状态|图示|触发条件|展示与交互|异常处理|
|---|---|---|---|---|---|
```

按以下 15 行写入最终规则：Mac 等待扫码、App 扫码入口、App 相机权限、App 扫码页、App 登录确认、Mac 等待确认、App 授权中与待领取、App 成功、App 失败、App 取消、App 过期、Mac 成功返回、Mac 失败、Mac 取消、Mac 过期。

13 张页面图必须放在对应表格行，一张流程图放在第三章。

- [ ] **Step 3: 压缩服务端规则和配套章节**

4.3 只保留状态、有效期、账号与设备绑定、独立设备会话、平台继承真值源、原子激活、鉴权拒绝、Outbox 回收、30 秒幂等领取和 ACK 核销。

第五至第八章只保留能改变开发、测试或上线结论的内容。删除故事与价值分析、历史规则、删除线、4.4/4.5 增补章节、重复状态表、自检和模拟评审。

### Task 3: 结构与内容验收

**Files:**
- Test: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`
- Test: `tools/verify-mac-qr-login-result-states.mjs`

- [ ] **Step 1: 检查长度、章节和去重结果**

Run:

```powershell
$prd='prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
$raw=Get-Content -Raw -LiteralPath $prd -Encoding utf8
$lines=(Get-Content -LiteralPath $prd -Encoding utf8).Count
$forbidden=[regex]::Matches($raw,'<del>|4\.4 |4\.5 |自检记录|模拟评审|图片和附件/|@master|@main|/master/|/main/').Count
[pscustomobject]@{Lines=$lines;Forbidden=$forbidden}
```

Expected: `Lines` 在 180–220 之间；`Forbidden=0`。

- [ ] **Step 2: 检查图片和 4.2 覆盖**

Run:

```powershell
$prd='prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
$raw=Get-Content -Raw -LiteralPath $prd -Encoding utf8
$section42=[regex]::Match($raw,'(?s)### 4\.2 .*?(?=### 4\.3 )').Value
[pscustomobject]@{
  PageRows=([regex]::Matches($section42,'^\|(?:App|Mac)\|','Multiline')).Count
  PageImages=([regex]::Matches($section42,'!\[[^\]]*\]\(https://[^)]+\)')).Count
  FlowImages=([regex]::Matches($raw,'14-qr-login-flow\.png')).Count
  TotalImageRefs=([regex]::Matches($raw,'!\[[^\]]*\]\(https://[^)]+\)')).Count
  UniqueImages=@([regex]::Matches($raw,'!\[[^\]]*\]\((https://[^)]+)\)') | ForEach-Object {$_.Groups[1].Value} | Sort-Object -Unique).Count
}
```

Expected: `PageRows=15`、`PageImages=13`、`FlowImages=1`、`TotalImageRefs=14`、`UniqueImages=14`。

- [ ] **Step 3: 运行行为契约与 Markdown 检查**

Run:

```powershell
node tools/verify-mac-qr-login-result-states.mjs
git diff --check -- 'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
```

Expected: 自动验证 `PASS`；`git diff --check` 无输出。

- [ ] **Step 4: 验证公开链接**

逐一请求 PRD 中的 14 张唯一图片与 Demo 链接。图片必须返回 HTTP 200 和 `image/png`；Demo 必须返回 HTTP 200 和 `text/html`。

### Task 4: 发布与任务板收口

**Files:**
- Modify: `docs/superpowers/plans/2026-08-06-mac-qr-login-prd-simplification.md`
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`

- [ ] **Step 1: 在干净工作区提交**

Run:

```powershell
git add -- docs/superpowers/specs/2026-08-06-mac-qr-login-prd-simplification-design.md docs/superpowers/plans/2026-08-06-mac-qr-login-prd-simplification.md 'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
git diff --cached --check
git commit -m 'docs: simplify Mac QR login PRD'
```

Expected: 只提交设计说明、实施计划和目标 PRD。

- [ ] **Step 2: 快进推送到远端 master**

Run:

```powershell
git fetch origin master
git rebase refs/remotes/origin/master
git push origin HEAD:master
```

Expected: 远端 `master` 指向新提交。

- [ ] **Step 3: 更新任务板**

向 `GUANWANGGAID-1` 添加精简结果、提交、验证和剩余风险评论，随后使用最新版本号移至 `in_review`。

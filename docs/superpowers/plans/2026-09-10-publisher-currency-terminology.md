# Publisher Currency Terminology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改“发行人计划”名称和既有流程的前提下，用“盖世积分／盖世币”区分任务中心与发行人计划，并确保只有发行任务奖励来源的盖世币可兑换京东卡。

**Architecture:** 保持当前 C/B Demo 结构与 `wallet.totalBalance / rechargeBalance / redeemableBalance` 来源模型，新增跨体系术语定义和更精确的资格文案。任务中心积分与盖世币账逻辑隔离；京东卡兑换继续只读服务端可兑换盖世币，不新增换算或转移能力。

**Tech Stack:** 离线 HTML/CSS/JavaScript Demo、Node.js + Playwright 验收脚本、Markdown PRD、PowerShell 工作流与 PRD 校验脚本、Git、taskctl。

---

## 文件结构

- 修改 `tools/verify-publisher-plan-v2.mjs`：增加术语、资格和禁用候选名的静态合同。
- 修改 `tools/verify-publisher-plan-v2-ui.mjs`：验证 C/B 页面可见的新规则文案并重截页面证据。
- 修改 `demos/Mod与发行人/发行人计划demo.html`：玩法说明、钱包与兑换商城静态规则文案。
- 修改 `demos/Mod与发行人/发行人计划demo.js`：兑换确认、任务结算和来源提示文案。
- 修改 `demos/Mod与发行人/发行人计划-后台demo.js`：兑换订单来源说明。
- 修改 `prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md`：追加 V2.2 修订，更新术语、页面规则、数据和验收口径。
- 修改 `public/prd/publisher-plan-v2/*.png`：由 UI 验收脚本重生成受影响截图。
- 修改 `docs/evidence/publisher-plan-v2/verification.json`：保存本轮机器与人工验证结果。
- 修改 `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md` 与 `.run.json`：记录 D-010、产物状态和 S3—S8 证据。

### Task 1: 先收紧静态与 UI 合同

**Files:**
- Modify: `tools/verify-publisher-plan-v2.mjs`
- Modify: `tools/verify-publisher-plan-v2-ui.mjs`

- [ ] **Step 1: 在静态合同中加入新口径**

```js
mustContain(cHtml + cJs, [
  '任务中心获得的是盖世积分，与盖世币分开计算',
  '只有参与发行任务并结算获得的盖世币可兑换京东电子卡',
]);

mustNotContain(cHtml + cJs + bJs + prd, [
  '发行积分',
  '发行币',
  '共创币',
  '创作者计划',
]);
```

- [ ] **Step 2: 在 UI 合同中验证可见文案**

```js
assert.equal(
  await page.getByText('任务中心获得的是盖世积分，与盖世币分开计算', { exact: false }).count() > 0,
  true,
);
```

后台兑换订单页增加：

```js
assert.equal(
  await page.getByText('只扣减参与发行任务并结算获得的盖世币', { exact: false }).count() > 0,
  true,
);
```

- [ ] **Step 3: 运行合同并确认先失败**

Run: `node tools/verify-publisher-plan-v2.mjs`

Expected: FAIL，指出新术语或新资格文案尚未出现在 Demo／PRD 中。

### Task 2: 修改 C/B Demo 的资产明文与资格说明

**Files:**
- Modify: `demos/Mod与发行人/发行人计划demo.html`
- Modify: `demos/Mod与发行人/发行人计划demo.js`
- Modify: `demos/Mod与发行人/发行人计划-后台demo.js`

- [ ] **Step 1: 更新 C 端规则说明**

规则页使用以下最终文案：

```html
任务中心获得的是盖世积分，与盖世币分开计算，不计入盖世币总余额或兑换余额。充值获得的盖世币仅可用于发布任务，不可兑换京东卡；任务取消、审核驳回或结算后退回的未消耗预算沿用原来源，不计入兑换余额。只有参与发行任务并结算获得的盖世币可兑换京东电子卡。
```

钱包入口副文案统一为：

```html
只有参与发行任务并结算获得的盖世币可兑换
```

- [ ] **Step 2: 更新动态提示**

兑换确认提示改为：

```js
'只有参与发行任务并结算获得的盖世币可兑换；充值获得的盖世币不可兑换。'
```

不修改充值、预算冻结和 `redeemableBalance` 扣减逻辑。

- [ ] **Step 3: 更新 B 端兑换订单来源说明**

```html
兑换订单只扣减参与发行任务并结算获得的盖世币；充值获得的盖世币和任务中心盖世积分均不会进入京东卡兑换流程。
```

- [ ] **Step 4: 精确提交 Demo 与合同**

```powershell
git add -- 'tools/verify-publisher-plan-v2.mjs' 'tools/verify-publisher-plan-v2-ui.mjs' 'demos/Mod与发行人/发行人计划demo.html' 'demos/Mod与发行人/发行人计划demo.js' 'demos/Mod与发行人/发行人计划-后台demo.js'
git commit -m "feat: clarify publisher coin eligibility"
```

### Task 3: 同步 V2.2 PRD

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md`

- [ ] **Step 1: 追加修订记录和术语**

```markdown
| 2026/9/10 | 区分任务中心盖世积分与发行人计划盖世币；明确仅发行任务奖励来源盖世币可兑换京东卡 | V2.2 | 郑群超 |
```

术语表增加“盖世积分”和“盖世币”，并保留“可兑换盖世币”“充值盖世币”“来源继承”。

- [ ] **Step 2: 同步页面与数据口径**

更新背景、业务边界、玩法说明、钱包、充值、兑换商城、B 端兑换订单、指标、埋点、数据存储、兼容、运营和法务段落，统一满足：

```text
盖世积分＝任务中心普通任务奖励，不进入盖世币与京东卡兑换链路。
盖世币＝充值或参与发行任务所得；只有参与发行任务并结算获得的盖世币可兑换京东卡。
```

- [ ] **Step 3: 运行 PRD 质量校验**

Run: `powershell -ExecutionPolicy Bypass -File scripts/validate-prd-quality.ps1 -Path 'prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md'`

Expected: `Pass`，0 个错误；原有必要重述提示允许保留，但不得新增术语冲突。

### Task 4: 重生成截图并固定图片提交

**Files:**
- Modify: `public/prd/publisher-plan-v2/*.png`
- Modify: `docs/evidence/publisher-plan-v2/verification.json`
- Modify: `prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md`

- [ ] **Step 1: 运行离线 UI 验收并重截 24 张图**

Run: `node tools/verify-publisher-plan-v2-ui.mjs`

Expected: PASS；24 张图片存在，`externalRequests`、`pageErrors`、`consoleErrors` 均为 0。

- [ ] **Step 2: 人工查看受影响原尺寸截图**

检查：

```text
public/prd/publisher-plan-v2/02-play-rules.png
public/prd/publisher-plan-v2/07-wallet.png
public/prd/publisher-plan-v2/09-card-store.png
public/prd/publisher-plan-v2/22-card-orders.png
```

Expected: 新文案无裁切、重叠和溢出；其余结构无变化。

- [ ] **Step 3: 提交截图和证据**

```powershell
git add -- 'public/prd/publisher-plan-v2' 'docs/evidence/publisher-plan-v2/verification.json'
git commit -m "test: refresh publisher currency evidence"
git rev-parse HEAD
```

- [ ] **Step 4: 用上一步 40 位提交 SHA 更新 PRD 全部图片链接**

只替换 `public/prd/publisher-plan-v2/` 链接中的旧提交 SHA，不改图片路径。

- [ ] **Step 5: 精确提交 PRD**

```powershell
git add -- 'prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md'
git commit -m "docs: distinguish gamehub points and coins"
```

### Task 5: 全量验证、工作流回写与送审

**Files:**
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md`
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json`

- [ ] **Step 1: 运行全量机器验证**

```powershell
node tools/verify-publisher-plan-v2.mjs
node tools/verify-publisher-plan-v2-ui.mjs
powershell -ExecutionPolicy Bypass -File scripts/validate-prd-quality.ps1 -Path 'prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md'
powershell -ExecutionPolicy Bypass -File scripts/validate-prd-images.ps1 -PrdPath 'prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md'
```

Expected: 全部为 PASS；24 图哈希在第二次 UI 复验后保持不变。

- [ ] **Step 2: 回写 D-010 与 S3—S8**

```text
D-010：任务中心普通任务奖励称“盖世积分”；发行人计划继续使用“盖世币”。充值盖世币不可兑换，只有参与发行任务并结算获得的盖世币可兑换京东电子卡。
```

工作流 S6、S7 分别记录机器日志和原尺寸审图证据；S8 继续明确未推送、未发布、未验证公网图片和飞书转存。

- [ ] **Step 3: 精确提交状态与验证记录**

```powershell
git add -- 'prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md' 'prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json' 'docs/evidence/publisher-plan-v2/verification.json'
git commit -m "docs: record publisher currency terminology decision"
```

- [ ] **Step 4: 追加任务板评论并移到待评审**

先读取最新版本，再执行：

```powershell
taskctl comment add GUANWANGGAID-41 --body '已完成盖世积分／盖世币口径修订：发行人计划名称不变；任务中心奖励称盖世积分；发行任务与充值继续使用盖世币；只有参与发行任务并结算获得的盖世币可兑换京东卡。C/B Demo、V2.2 PRD、截图和本地验证已同步。未推送、未发布。' --json
$publisherIssue = taskctl issue get GUANWANGGAID-41 --json | ConvertFrom-Json
taskctl issue move GUANWANGGAID-41 --status in_review --if-version $publisherIssue.task.version --json
```

Expected: 评论成功，事项回到 `in_review`。

## 自检清单

- [ ] “发行人计划”名称未改变。
- [ ] “盖世积分”只代表任务中心普通任务奖励。
- [ ] “盖世币”继续覆盖充值与发行任务奖励，但兑换资格按来源区分。
- [ ] 充值盖世币及其原来源退回不可兑换京东卡。
- [ ] 只有参与发行任务并结算获得的盖世币可兑换京东电子卡。
- [ ] 未新增积分换币、余额合并、页面、弹窗、Toast 或流程。
- [ ] 未暂存或提交用户的其他工作区改动。
- [ ] 未执行 `git push`、线上发布、真实飞书请求或真实支付。

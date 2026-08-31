# Publisher Plan V2 JD Card Redemption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将发行人计划的现金提现改为“按盖世币来源计算可兑换余额，用户自主兑换京东电子卡并自动获得卡密”，同步完成 C/B 端可操作 Demo、完整 V2 PRD、流程图和验证证据。

**Architecture:** 前台继续统一使用“盖世币”名称，但账务按流水来源计算 `redeemableBalance`；充值与充值预算退回不进入兑换页，发行人任务奖励进入可兑换余额。C 端复用现有钱包、商城确认弹窗和兑换记录结构；B 端复用奖品配置和订单思路，在发行人后台加入京东卡商品、卡密库存和兑换订单页面。卡密预占、扣减和订单创建按同一兑换事务展示，明确失败回退，结果不确定进入待核对。

**Tech Stack:** 单文件 HTML/CSS、原生 JavaScript、Node.js 24、`playwright-core`、PowerShell、Markdown、`to-prd` 质量校验脚本。

---

## 文件结构

- Modify: `demos/Mod与发行人/发行人计划demo.html` — C 端页面、样式和京东卡兑换容器。
- Modify: `demos/Mod与发行人/发行人计划demo.js` — C 端余额来源、兑换、卡密和记录交互。
- Modify: `demos/Mod与发行人/发行人计划-后台demo.html` — B 端菜单、页面样式和通用弹窗容器。
- Modify: `demos/Mod与发行人/发行人计划-后台demo.js` — 京东卡商品、卡密库存、订单和状态交互。
- Modify: `prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md` — 按当前 `to-prd` 唯一模板重写为 V2 最终规则。
- Create: `tools/verify-publisher-plan-v2.mjs` — 静态契约与内容一致性检查。
- Create: `tools/verify-publisher-plan-v2-ui.mjs` — C/B 端 Playwright 交互验收与截图生成。
- Create: `public/prd/publisher-plan-v2/*.png` — 页面图与单张横向产品流程图。
- Create: `docs/evidence/publisher-plan-v2/verification.json` — 机器验证结果与截图清单。
- Create: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md` — 当前有效决定和产物状态。
- Create: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json` — S1—S8 运行状态和证据。

## Task 1: 建立工作流状态和本轮合同

**Files:**
- Create: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md`
- Create: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json`

- [ ] **Step 1: 创建状态卡**

Run:

```powershell
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\init-state-card.ps1' `
  -RequirementId 'GUANWANGGAID-41' `
  -Slug 'publisher-plan-v2' `
  -Title '发行人计划v2版' `
  -WorkspaceRoot 'C:\Users\z3635\官网改动'
```

Expected: JSON 返回 `created: true` 和状态卡绝对路径。

- [ ] **Step 2: 启动 S1—S8 运行状态**

Run:

```powershell
$contract = @{
  goal = '取消现金提现，改为符合兑换资格的盖世币自主兑换京东电子卡并自动发卡密'
  inScope = @('发行人计划C端Demo','发行人计划B端Demo','发行人计划V2 PRD','页面截图与横向流程图')
  outOfScope = @('实体京东卡','收货地址与物流','其他礼品卡','线上发布','真实卡密与真实资金')
  inputs = @('GUANWANGGAID-41','已确认设计稿','V1 C/B Demo','V1 PRD','任务中心兑换商城Demo')
  deliverables = @('可操作C/B Demo','V2 PRD','流程图与页面图','机器与人工验证证据')
  changes = @('充值盖世币不进入兑换余额','兑换页不显示充值部分','规则说明新增来源限制','电子卡密自动发放')
} | ConvertTo-Json -Compress
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1' `
  -Action start `
  -RunPath 'prd\workflow-state\GUANWANGGAID-41-publisher-plan-v2.run.json' `
  -RequirementId 'GUANWANGGAID-41' `
  -CardPath 'prd\workflow-state\GUANWANGGAID-41-publisher-plan-v2.md' `
  -ContractJson $contract `
  -RequiredSteps S1,S2,S3,S4,S5,S6,S7,S8
```

Expected: `status` 为 `in_progress`，S4—S7 均为 `required: true`。

- [ ] **Step 3: 登记活动需求索引**

Run:

```powershell
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\requirement-index.ps1' `
  -Action touch `
  -RequirementId 'GUANWANGGAID-41' `
  -Title '发行人计划v2版' `
  -Aliases @('发行人计划V2','京东卡兑换') `
  -WorkspacePath 'C:\Users\z3635\官网改动' `
  -StateCardPath 'C:\Users\z3635\官网改动\prd\workflow-state\GUANWANGGAID-41-publisher-plan-v2.md' `
  -TaskboardId 'GUANWANGGAID-41' `
  -Artifacts @('demos\Mod与发行人\发行人计划demo.html','demos\Mod与发行人\发行人计划-后台demo.html','prd\ai生成\【Prd】《盖世游戏》发行人计划需求.md') `
  -Status in_progress
```

Expected: 索引返回该需求和递增后的 `revision`。

## Task 2: 先写静态契约测试

**Files:**
- Create: `tools/verify-publisher-plan-v2.mjs`
- Test: `tools/verify-publisher-plan-v2.mjs`

- [ ] **Step 1: 写入会在 V1 基线上失败的验证脚本**

Create `tools/verify-publisher-plan-v2.mjs`:

```javascript
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const cHtml = read('demos/Mod与发行人/发行人计划demo.html');
const cJs = read('demos/Mod与发行人/发行人计划demo.js');
const bHtml = read('demos/Mod与发行人/发行人计划-后台demo.html');
const bJs = read('demos/Mod与发行人/发行人计划-后台demo.js');
const prd = read('prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md');

const mustContain = (source, values, label) => {
  for (const value of values) assert(source.includes(value), `${label} missing: ${value}`);
};
const mustNotContain = (source, values, label) => {
  for (const value of values) assert(!source.includes(value), `${label} still contains: ${value}`);
};

mustContain(cHtml + cJs, [
  '可兑换盖世币', '充值获得的盖世币仅可用于发布任务',
  'view-card-store', 'card-redeem-modal', 'card-history-modal',
  '自动发放卡密', '查看卡密', '复制卡密'
], 'C demo');
mustNotContain(cHtml + cJs, [
  'handleWithdraw', '确认提现', '提现到支付宝', '可提现金额', '已提现'
], 'C demo');

mustContain(bHtml + bJs, [
  "switchPage('jd-cards')", "switchPage('card-orders')",
  '京东卡管理', '卡密库存', '兑换订单',
  '未使用', '已预占', '已发放', '待核对', '作废'
], 'B demo');

mustContain(prd, [
  '| 修订日期 | 修订内容 | 版本 | 修订人 |',
  '### 2.2 产品流程', '### 3.1 C 端功能需求', '### 3.2 B 端功能需求',
  '充值获得的盖世币仅可用于发布任务，不可兑换京东卡',
  '![产品流程]', '## 五、待确认项'
], 'PRD');

const eventNames = [...prd.matchAll(/\| `([a-z][a-z0-9_]+)` \|/g)].map(match => match[1]);
assert.equal(new Set(eventNames).size, eventNames.length, 'PRD contains duplicate event names');
assert(!/旨在|赋能|助力|沉浸式/.test(prd), 'PRD contains banned AI phrasing');

console.log('PASS: publisher plan V2 static contract');
```

- [ ] **Step 2: 运行测试并确认 V1 失败**

Run:

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: FAIL，第一处为 C Demo 缺少“可兑换盖世币”或仍含 `handleWithdraw`。

- [ ] **Step 3: 只提交验证合同**

```powershell
git add -- tools/verify-publisher-plan-v2.mjs
git commit -m "test: define publisher plan v2 contract"
```

## Task 3: 修改 C 端钱包与京东卡兑换

**Files:**
- Modify: `demos/Mod与发行人/发行人计划demo.html:78-105,158-221`
- Modify: `demos/Mod与发行人/发行人计划demo.js:47-59,108-136,170-185`
- Test: `tools/verify-publisher-plan-v2.mjs`

- [ ] **Step 1: 在 C 端脚本定义来源余额、卡商品和订单**

在 `earnRecords` 后新增并统一使用以下模型：

```javascript
const wallet = {
  totalBalance: 3650,
  redeemableBalance: 2650,
  rechargeBalance: 1000
};

const jdCards = [
  { id: 'JD10', name: '京东E卡 10元', faceValue: 10, cost: 1000, stock: 8, limit: 2 },
  { id: 'JD20', name: '京东E卡 20元', faceValue: 20, cost: 2000, stock: 5, limit: 1 },
  { id: 'JD50', name: '京东E卡 50元', faceValue: 50, cost: 5000, stock: 0, limit: 1 },
  { id: 'JD100', name: '京东E卡 100元', faceValue: 100, cost: 10000, stock: 2, limit: 1 }
];

const cardOrders = [
  {
    id: 'EX20260830001', cardId: 'JD10', cardName: '京东E卡 10元',
    cost: 1000, time: '2026-08-30 18:20', status: '已发放',
    code: 'JDE8-K2M9-P4Q7-X6W3'
  }
];

let selectedCardId = null;
let currentEarnTab = 'all';
```

说明：示例面额只用于 Demo；页面必须从 `jdCards` 读取，不在 DOM 重复硬编码业务逻辑。

- [ ] **Step 2: 替换钱包可提现区域**

在 `发行人计划demo.html` 保留 `view-earnings`，将核心区改成：

```html
<div class="earn-header">
  <div class="eh-label">盖世币总余额</div>
  <div class="eh-row"><div class="eh-amount" id="wallet-total">3,650</div></div>
  <div class="redeem-card-entry" onclick="showView('card-store')">
    <div><strong>兑换京东卡</strong><span>完成发行人任务获得的盖世币可兑换</span></div>
    <span>›</span>
  </div>
  <div class="wallet-rule">充值获得的盖世币仅可用于发布任务，不计入兑换余额。</div>
</div>
<div class="earn-tabs">
  <div class="earn-tab active" data-et="all">全部</div>
  <div class="earn-tab" data-et="income">收入</div>
  <div class="earn-tab" data-et="expense">消耗</div>
  <div class="earn-tab" data-et="recharge">充值</div>
</div>
```

删除提现按钮、人民币金额、已提现统计和提现 Tab；保留充值入口与原任务发布流程。

- [ ] **Step 3: 新增兑换页和复用式弹窗容器**

在充值页之前加入：

```html
<div class="view" id="view-card-store">
  <div class="header">
    <span class="back" onclick="showView('earnings')">‹</span>
    <span class="title">兑换京东卡</span>
    <span class="right-btn" onclick="openCardHistory()">兑换记录</span>
  </div>
  <div class="content">
    <div class="redeem-balance-card">
      <span>可兑换盖世币</span><strong id="redeemable-balance">2,650</strong>
      <button onclick="showView('rules')">规则说明</button>
    </div>
    <div id="jd-card-grid" class="jd-card-grid"></div>
  </div>
</div>

<div class="modal" id="card-redeem-modal">
  <div class="modal-box card-modal-box">
    <div id="card-redeem-content"></div>
  </div>
</div>

<div class="modal" id="card-history-modal">
  <div class="modal-box card-history-box">
    <div class="modal-title">兑换记录</div>
    <div id="card-history-list"></div>
    <button class="modal-cancel" onclick="closeCardHistory()">关闭</button>
  </div>
</div>
```

- [ ] **Step 4: 实现兑换、发放、查看和复制闭环**

在 `发行人计划demo.js` 新增：

```javascript
function renderCardStore() {
  document.getElementById('redeemable-balance').textContent = wallet.redeemableBalance.toLocaleString();
  document.getElementById('jd-card-grid').innerHTML = jdCards.map(card => {
    const soldOut = card.stock <= 0;
    const insufficient = wallet.redeemableBalance < card.cost;
    const disabled = soldOut || insufficient;
    const reason = soldOut ? '已兑完' : insufficient ? `还差 ${(card.cost - wallet.redeemableBalance).toLocaleString()}` : '立即兑换';
    return `<button class="jd-card-item${disabled ? ' disabled' : ''}" ${disabled ? 'disabled' : ''} onclick="openCardRedeem('${card.id}')">
      <span class="jd-brand">京东E卡</span><strong>¥${card.faceValue}</strong>
      <span>${CI}${card.cost.toLocaleString()}</span><em>${reason}</em>
    </button>`;
  }).join('');
}

function openCardRedeem(cardId) {
  const card = jdCards.find(item => item.id === cardId);
  if (!card || card.stock <= 0 || wallet.redeemableBalance < card.cost) return;
  selectedCardId = cardId;
  document.getElementById('card-redeem-content').innerHTML = `<div class="modal-title">确认兑换</div>
    <div class="card-confirm-name">${card.name}</div>
    <div class="card-confirm-row"><span>所需盖世币</span><strong>${card.cost.toLocaleString()}</strong></div>
    <div class="card-confirm-row"><span>当前可兑换</span><strong>${wallet.redeemableBalance.toLocaleString()}</strong></div>
    <p>兑换成功后自动发放卡密；充值获得的盖世币不可用于兑换。</p>
    <div class="modal-actions"><button class="modal-cancel" onclick="closeCardRedeem()">取消</button><button id="confirm-card-redeem" class="modal-confirm" onclick="confirmCardRedeem()">确认兑换</button></div>`;
  document.getElementById('card-redeem-modal').classList.add('show');
}

function confirmCardRedeem() {
  const card = jdCards.find(item => item.id === selectedCardId);
  const button = document.getElementById('confirm-card-redeem');
  if (!card || !button || button.disabled) return;
  button.disabled = true;
  if (card.stock <= 0 || wallet.redeemableBalance < card.cost) {
    button.disabled = false;
    renderCardStore();
    return;
  }
  wallet.redeemableBalance -= card.cost;
  wallet.totalBalance -= card.cost;
  card.stock -= 1;
  const order = {
    id: `EX${Date.now()}`, cardId: card.id, cardName: card.name,
    cost: card.cost, time: '2026-08-31 10:30', status: '已发放',
    code: `JDE8-${card.id}-P4Q7-X6W3`
  };
  cardOrders.unshift(order);
  document.getElementById('wallet-total').textContent = wallet.totalBalance.toLocaleString();
  document.getElementById('card-redeem-content').innerHTML = `<div class="card-success-icon">✓</div><div class="modal-title">发放成功</div>
    <p>${order.cardName}已发放，可在兑换记录中再次查看。</p>
    <div class="card-code" id="current-card-code" data-code="${order.code}">****-****-****-X6W3</div>
    <div class="modal-actions"><button class="modal-cancel" onclick="revealCardCode('current-card-code')">查看卡密</button><button class="modal-confirm" onclick="copyCardCode('current-card-code')">复制卡密</button></div>
    <button class="result-close" onclick="closeCardRedeem()">完成</button>`;
  renderCardStore();
}

function revealCardCode(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = element.dataset.code;
}

async function copyCardCode(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;
  revealCardCode(elementId);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(element.dataset.code);
    } else {
      const input = document.createElement('textarea');
      input.value = element.dataset.code;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand('copy');
      input.remove();
      if (!copied) throw new Error('copy command rejected');
    }
    showToast('卡密已复制');
  } catch {
    showToast('复制失败，请长按卡密复制');
  }
}

function closeCardRedeem() {
  selectedCardId = null;
  document.getElementById('card-redeem-modal').classList.remove('show');
}

function openCardHistory() {
  document.getElementById('card-history-list').innerHTML = cardOrders.map((order, index) => `<div class="card-order-item">
    <div><strong>${order.cardName}</strong><span>${order.time} · ${CI}${order.cost.toLocaleString()}</span></div>
    <em>${order.status}</em><div class="card-code" id="history-code-${index}" data-code="${order.code}">****-****-****-${order.code.slice(-4)}</div>
    <button onclick="revealCardCode('history-code-${index}')">查看卡密</button><button onclick="copyCardCode('history-code-${index}')">复制卡密</button>
  </div>`).join('');
  document.getElementById('card-history-modal').classList.add('show');
}

function closeCardHistory() {
  document.getElementById('card-history-modal').classList.remove('show');
}
```

在 `showView(name)` 中加入：

```javascript
if (name === 'card-store') renderCardStore();
```

- [ ] **Step 5: 更新规则说明与结算文案**

规则页固定加入：

```html
<div class="section">
  <div class="section-title">盖世币兑换规则</div>
  <div class="rule-copy">兑换页展示的盖世币余额仅包含可兑换部分。充值获得的盖世币仅可用于发布任务，不可兑换京东卡；任务取消、审核驳回或结算后退回的未消耗预算沿用原来源，不计入可兑换余额。完成发行人任务获得的盖世币可用于兑换京东电子卡。</div>
</div>
```

将“盖世币可提现或兑换平台权益”改为“任务结算所得盖世币可兑换京东电子卡”，删除固定人民币汇率和到账说明。

- [ ] **Step 6: 运行静态测试，预期仍因 B 端和 PRD 未改而失败**

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: C Demo 相关断言通过，B Demo 首个断言失败。

- [ ] **Step 7: 提交 C 端 Demo**

```powershell
git add -- 'demos/Mod与发行人/发行人计划demo.html' 'demos/Mod与发行人/发行人计划demo.js'
git commit -m "feat: replace publisher withdrawals with jd card redemption"
```

## Task 4: 修改 B 端京东卡和订单管理

**Files:**
- Modify: `demos/Mod与发行人/发行人计划-后台demo.html:76-92`
- Modify: `demos/Mod与发行人/发行人计划-后台demo.js:1-55,110-122`
- Test: `tools/verify-publisher-plan-v2.mjs`

- [ ] **Step 1: 增加后台菜单和页面路由**

在结算管理之后加入：

```html
<div class="menu-item" onclick="switchPage('jd-cards')"><span class="mi-icon">🎁</span>京东卡管理</div>
<div class="menu-item" onclick="switchPage('card-orders')"><span class="mi-icon">🧾</span>兑换订单</div>
```

在 `pageTitles` 和 `renderPage` 中分别增加：

```javascript
'jd-cards': '京东卡管理',
'card-orders': '兑换订单'
```

```javascript
case 'jd-cards': c.innerHTML = renderJdCards(); break;
case 'card-orders': c.innerHTML = renderCardOrders(); break;
```

- [ ] **Step 2: 定义商品、库存和订单示例数据**

```javascript
const jdCardProducts = [
  { id:'JD10', name:'京东E卡 10元', faceValue:10, cost:1000, stock:8, warning:3, limit:2, status:'已上架' },
  { id:'JD20', name:'京东E卡 20元', faceValue:20, cost:2000, stock:5, warning:3, limit:1, status:'已上架' },
  { id:'JD50', name:'京东E卡 50元', faceValue:50, cost:5000, stock:0, warning:5, limit:1, status:'已下架' },
  { id:'JD100', name:'京东E卡 100元', faceValue:100, cost:10000, stock:2, warning:3, limit:1, status:'已上架' }
];

const cardInventory = [
  { id:'KC0001', productId:'JD10', code:'JDE8-****-****-X6W3', status:'已发放', orderId:'EX20260830001' },
  { id:'KC0002', productId:'JD10', code:'JDE8-****-****-A2B5', status:'未使用', orderId:'—' },
  { id:'KC0003', productId:'JD20', code:'JDE8-****-****-C7D9', status:'已预占', orderId:'EX20260831002' },
  { id:'KC0004', productId:'JD20', code:'JDE8-****-****-Q1R4', status:'待核对', orderId:'EX20260831003' },
  { id:'KC0005', productId:'JD50', code:'JDE8-****-****-Z8K2', status:'作废', orderId:'—' }
];

const cardExchangeOrders = [
  { id:'EX20260830001', uid:'u30001', card:'京东E卡 10元', cost:1000, time:'2026-08-30 18:20', status:'已发放', codeId:'KC0001' },
  { id:'EX20260831002', uid:'u30150', card:'京东E卡 20元', cost:2000, time:'2026-08-31 09:18', status:'待发放', codeId:'KC0003' },
  { id:'EX20260831003', uid:'u30200', card:'京东E卡 20元', cost:2000, time:'2026-08-31 09:40', status:'待核对', codeId:'KC0004' },
  { id:'EX20260829006', uid:'u30055', card:'京东E卡 10元', cost:1000, time:'2026-08-29 12:10', status:'已退回', codeId:'—' }
];
```

- [ ] **Step 3: 实现京东卡商品与卡密库存页**

`renderJdCards()` 必须输出两个页内 Tab：商品配置、卡密库存。商品表列为商品 ID、名称、面额、兑换价格、库存、预警、单人限兑、状态、操作；库存表列为卡密 ID、所属商品、脱敏卡密、状态、关联订单、操作。

关键渲染片段：

```javascript
function renderJdCards() {
  return `<div class="page-tabs"><button class="active" onclick="switchCardAdminTab(this,'products')">商品配置</button><button onclick="switchCardAdminTab(this,'inventory')">卡密库存</button></div>
    <div id="card-products-panel" class="card-admin-panel">${renderCardProducts()}</div>
    <div id="card-inventory-panel" class="card-admin-panel" style="display:none">${renderCardInventory()}</div>`;
}

function renderCardProducts() {
  return `<div class="card"><div class="card-title">京东电子卡商品<button class="btn btn-primary" style="float:right" onclick="showToast('打开新增京东卡配置')">+ 新增商品</button></div>
    <table><tr><th>商品ID</th><th>名称</th><th>面额</th><th>兑换价格</th><th>库存</th><th>预警</th><th>单人限兑</th><th>状态</th><th>操作</th></tr>
    ${jdCardProducts.map(item => `<tr><td>${item.id}</td><td>${item.name}</td><td>¥${item.faceValue}</td><td>${item.cost.toLocaleString()} 盖世币</td><td>${item.stock}</td><td>${item.warning}</td><td>${item.limit}次</td><td><span class="tag ${item.status === '已上架' ? 'tag-green' : 'tag-gray'}">${item.status}</span></td><td><button class="btn btn-sm" onclick="showToast('打开商品配置')">编辑</button></td></tr>`).join('')}</table></div>`;
}

function renderCardInventory() {
  return `<div class="card"><div class="card-title">卡密库存<button class="btn btn-primary" style="float:right" onclick="showToast('打开批量导入')">批量导入卡密</button></div>
    <div class="filter-bar"><select><option>全部商品</option>${jdCardProducts.map(item => `<option>${item.name}</option>`).join('')}</select><select><option>全部状态</option><option>未使用</option><option>已预占</option><option>已发放</option><option>待核对</option><option>作废</option></select><button class="btn">查询</button></div>
    <table><tr><th>卡密ID</th><th>所属商品</th><th>脱敏卡密</th><th>状态</th><th>关联订单</th><th>操作</th></tr>
    ${cardInventory.map(item => `<tr><td>${item.id}</td><td>${item.productId}</td><td class="mono">${item.code}</td><td><span class="tag">${item.status}</span></td><td>${item.orderId}</td><td><button class="btn btn-sm" onclick="showToast('查看行为已记录')">查看</button></td></tr>`).join('')}</table></div>`;
}

function switchCardAdminTab(button, tab) {
  document.querySelectorAll('.page-tabs button').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  document.getElementById('card-products-panel').style.display = tab === 'products' ? 'block' : 'none';
  document.getElementById('card-inventory-panel').style.display = tab === 'inventory' ? 'block' : 'none';
}
```

- [ ] **Step 4: 实现兑换订单页和状态边界**

```javascript
function renderCardOrders() {
  return `<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
    <div class="stat-card"><div class="sc-num">${cardExchangeOrders.filter(item => item.status === '已发放').length}</div><div class="sc-label">已发放</div></div>
    <div class="stat-card"><div class="sc-num">${cardExchangeOrders.filter(item => item.status === '待发放').length}</div><div class="sc-label">待发放</div></div>
    <div class="stat-card"><div class="sc-num">${cardExchangeOrders.filter(item => item.status === '待核对').length}</div><div class="sc-label">待核对</div></div>
    <div class="stat-card"><div class="sc-num">${cardExchangeOrders.filter(item => item.status === '已退回').length}</div><div class="sc-label">已退回</div></div>
  </div><div class="card"><div class="card-title">京东卡兑换订单</div>
    <div class="filter-bar"><input placeholder="订单号/UID"><select><option>全部面额</option>${jdCardProducts.map(item => `<option>${item.name}</option>`).join('')}</select><select><option>全部状态</option><option>待发放</option><option>已发放</option><option>发放失败</option><option>已退回</option><option>待核对</option></select><button class="btn">查询</button><button class="btn" style="margin-left:auto">导出</button></div>
    <table><tr><th>订单号</th><th>UID</th><th>兑换内容</th><th>消耗盖世币</th><th>兑换时间</th><th>状态</th><th>卡密</th><th>操作</th></tr>
    ${cardExchangeOrders.map(order => `<tr><td>${order.id}</td><td>${order.uid}</td><td>${order.card}</td><td>${order.cost.toLocaleString()}</td><td>${order.time}</td><td><span class="tag">${order.status}</span></td><td>${order.codeId}</td><td>${order.status === '待核对' ? '<button class="btn btn-sm btn-primary" onclick="showToast(\'进入人工核对，禁止自动退款或补发\')">核对</button>' : '—'}</td></tr>`).join('')}</table></div>`;
}
```

- [ ] **Step 5: 运行静态测试，预期仅 PRD 断言失败**

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: C/B Demo 断言通过，PRD 修订表或 2.2 产品流程断言失败。

- [ ] **Step 6: 提交 B 端 Demo**

```powershell
git add -- 'demos/Mod与发行人/发行人计划-后台demo.html' 'demos/Mod与发行人/发行人计划-后台demo.js'
git commit -m "feat: add jd card inventory and redemption orders"
```

## Task 5: 建立交互验收和 PRD 截图

**Files:**
- Create: `tools/verify-publisher-plan-v2-ui.mjs`
- Create: `public/prd/publisher-plan-v2/00-product-flow.png`
- Create: `public/prd/publisher-plan-v2/01-task-plaza.png`
- Create: `public/prd/publisher-plan-v2/02-play-rules.png`
- Create: `public/prd/publisher-plan-v2/03-task-detail.png`
- Create: `public/prd/publisher-plan-v2/04-my-tasks.png`
- Create: `public/prd/publisher-plan-v2/05-submit-work.png`
- Create: `public/prd/publisher-plan-v2/06-create-task.png`
- Create: `public/prd/publisher-plan-v2/07-wallet.png`
- Create: `public/prd/publisher-plan-v2/08-recharge.png`
- Create: `public/prd/publisher-plan-v2/09-card-store.png`
- Create: `public/prd/publisher-plan-v2/10-card-confirm.png`
- Create: `public/prd/publisher-plan-v2/11-card-success.png`
- Create: `public/prd/publisher-plan-v2/12-card-history.png`
- Create: `public/prd/publisher-plan-v2/13-dashboard.png`
- Create: `public/prd/publisher-plan-v2/14-task-management.png`
- Create: `public/prd/publisher-plan-v2/15-task-review.png`
- Create: `public/prd/publisher-plan-v2/16-video-review.png`
- Create: `public/prd/publisher-plan-v2/17-settlement.png`
- Create: `public/prd/publisher-plan-v2/18-risk.png`
- Create: `public/prd/publisher-plan-v2/19-creator-review.png`
- Create: `public/prd/publisher-plan-v2/20-card-products.png`
- Create: `public/prd/publisher-plan-v2/21-card-inventory.png`
- Create: `public/prd/publisher-plan-v2/22-card-orders.png`
- Create: `docs/evidence/publisher-plan-v2/verification.json`

- [ ] **Step 1: 创建 Playwright 验收脚本**

脚本使用 `pathToFileURL` 打开两个本地 HTML，执行以下断言：

```javascript
assert.equal(await page.locator('#wallet-total').innerText(), '3,650');
await page.evaluate(() => showView('card-store'));
assert.equal(await page.locator('#redeemable-balance').innerText(), '2,650');
assert.equal(await page.getByText('充值获得的盖世币仅可用于发布任务').count() > 0, true);
await page.getByRole('button', { name: /京东E卡.*20元/ }).click();
assert.equal(await page.getByText('当前可兑换').count(), 1);
await page.locator('#confirm-card-redeem').click();
assert.equal(await page.getByText('发放成功').count(), 1);
assert.equal(await page.locator('#redeemable-balance').innerText(), '650');
assert.equal(await page.locator('#wallet-total').innerText(), '1,650');
await page.getByText('查看卡密').click();
assert.match(await page.locator('#current-card-code').innerText(), /^JDE8-/);
```

B 端断言：

```javascript
await adminPage.evaluate(() => switchPage('jd-cards'));
assert.equal(await adminPage.getByText('京东电子卡商品').count(), 1);
await adminPage.getByRole('button', { name: '卡密库存' }).click();
assert.equal(await adminPage.getByText('待核对').count() > 0, true);
await adminPage.evaluate(() => switchPage('card-orders'));
assert.equal(await adminPage.getByText('京东卡兑换订单').count(), 1);
assert.equal(await adminPage.getByText('禁止自动退款或补发').count(), 0);
```

完成断言后，对 PRD 保留的每个 C 端页面截取 `.phone`，对每个 B 端页面截取后台内容区域，并单独保存兑换确认、发放成功和兑换记录三个状态。截图前固定视口、等待页面字体与交互状态稳定，并检查每张图宽高和文件大小均大于 0。将“钱包 → 兑换页 → 确认兑换 → 发放成功”等关键 C 端图片以 Data URL 放入临时横向 HTML，步骤标题固定为“1 任务奖励到账 → 2 查看可兑换余额 → 3 选择面额 → 4 确认兑换 → 5 自动发放卡密”，再用 Playwright 截取为 `00-product-flow.png`。脚本最后写入：

```javascript
fs.writeFileSync(evidencePath, JSON.stringify({
  status: 'pass',
  checkedAt: new Date().toISOString(),
  redeemableBefore: 2650,
  redeemableAfter: 650,
  rechargeExcluded: 1000,
  screenshots
}, null, 2));
```

- [ ] **Step 2: 运行 UI 验收和截图**

```powershell
node tools/verify-publisher-plan-v2-ui.mjs
```

Expected: 输出 `PASS: publisher plan V2 UI, 23 screenshots captured`，证据 JSON 为 `status: pass`，截图清单与上述 23 个文件一一对应。

- [ ] **Step 3: 人工查看二十三张原尺寸图片**

检查：无文字溢出、按钮遮挡、卡密明文默认泄露、旧提现内容、充值余额出现在兑换页、后台表格截断。任一项存在则修复 Demo 后重新运行脚本。

- [ ] **Step 4: 提交验证脚本和图片**

```powershell
git add -- tools/verify-publisher-plan-v2-ui.mjs public/prd/publisher-plan-v2 docs/evidence/publisher-plan-v2/verification.json
git commit -m "test: verify publisher jd card redemption flow"
```

记录该提交的 40 位 SHA：

```powershell
$imageCommit = git rev-parse HEAD
$imageCommit
```

## Task 6: 按唯一模板重写发行人计划 V2 PRD

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md`
- Test: `tools/verify-publisher-plan-v2.mjs`
- Test: `C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1`

- [ ] **Step 1: 重写修订记录和边界**

修订记录固定为：

```markdown
| 修订日期 | 修订内容 | 版本 | 修订人 |
|---|---|---|---|
| 2026/5/25 | 创建文档 | V1.0 | 郑群超 |
| 2026/8/31 | 取消提现，增加按来源计算可兑换余额、京东电子卡自动发放和后台卡密管理 | V2.0 | 郑群超 |

**备注：** 搜2026.8.31修改
```

第一章只保留背景、需求边界和术语。术语必须定义“盖世币总余额、可兑换盖世币、充值盖世币、京东电子卡、待核对”。业务边界明确不含实体卡、地址、物流、其他卡种和真实税务结论。

- [ ] **Step 2: 写产品说明和单张横向流程图**

`2.2` 只插入：

```markdown
![产品流程](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@<IMAGE_COMMIT_SHA>/public/prd/publisher-plan-v2/00-product-flow.png)
```

执行时将 `<IMAGE_COMMIT_SHA>` 替换为 Task 5 的实际 40 位提交 SHA；不得保留尖括号或占位符。

- [ ] **Step 3: 写 C 端页面级六要素**

保留并改写 V1 已有页面：找任务、玩法说明、任务详情、提交投稿、做任务、创建发行任务、钱包、充值。新增京东卡兑换页；兑换确认、发放结果和兑换记录作为京东卡兑换页最末的页面子功能，不另建页面主表。

钱包页必须写清：

```markdown
**展示说明：**<br>1. 顶部标题为“我的钱包”，右上角保留“充值”。<br>2. 核心区域展示盖世币总余额和“兑换京东卡”入口，不展示人民币可提现金额、累计人民币收益或已提现金额。<br>3. 入口下方显示“兑换余额按盖世币来源计算”；流水 Tab 为“全部／收入／消耗／充值”。<br>**交互说明：**<br>1. 用户点击“兑换京东卡”后进入京东卡兑换页；系统在下一页重新计算并只展示可兑换盖世币。<br>2. 用户点击“充值”后进入原充值页；充值到账只增加总余额和充值来源余额，不增加可兑换余额。
```

京东卡兑换页必须写清：

```markdown
**展示说明：**<br>1. 顶部展示“可兑换盖世币”，不展示盖世币总余额和充值所得部分，并提供“兑换记录”和“规则说明”。<br>2. 商品卡展示京东卡面额、所需盖世币、库存或售罄状态、单用户限兑次数；按后台有效配置顺序展示。<br>3. 可兑换余额不足的商品显示所差盖世币并禁用；售罄或已下架商品不可兑换。<br>**交互说明：**<br>1. 用户点击可兑换商品后打开确认弹窗，看到面额、所需盖世币、当前可兑换余额和“兑换成功后自动发放卡密”。<br>2. 用户确认后，系统预占唯一卡密、扣减可兑换余额并创建订单；成功时当前弹窗切换为“发放成功”，卡密默认脱敏，用户可查看或复制。<br>3. 用户点击“兑换记录”后看到历史订单、状态和卡密入口；刷新或重新登录后仍读取服务端订单结果。
```

规则说明必须逐字包含：

> 兑换页展示的盖世币余额仅包含可兑换部分。充值获得的盖世币仅可用于发布任务，不可兑换京东卡；任务取消、审核驳回或结算后退回的未消耗预算沿用原来源，不计入可兑换余额。完成发行人任务获得的盖世币可用于兑换京东电子卡。

- [ ] **Step 4: 写 B 端页面级六要素**

保留并改写 V1 已有页面：数据看板、任务管理、任务审核、视频审核、结算管理、风控中心、创作者审核。新增京东卡管理、兑换订单；商品配置和卡密库存作为京东卡管理页内 Tab。

后台导入规则必须包含：文件格式、必填列、单次数量上限由研发评估后配置、导入前校验、重复卡密拒绝、部分成功清单、取消不入库、失败可重试、卡密加密存储、明文不进入普通日志或导出。

订单状态表固定覆盖：待发放、已发放、发放失败、已退回、待核对。待核对状态明确“不得自动退款或再次发卡；有权限人员核对卡密是否已暴露后处理”。

- [ ] **Step 5: 写数据、技术、运营与合规**

事件表至少包含以下新增或改造事件，并逐一在参数表定义参数：

```text
publisher_wallet_view
publisher_card_store_view
publisher_card_click
publisher_card_redeem_submit
publisher_card_redeem_result
publisher_card_code_action
publisher_card_history_view
```

公共参数：`uid, redeemable_balance, card_product_id, face_value, point_cost, order_id, result_status, fail_reason, action_type`。枚举必须写成：

```text
result_status＝success（已发放）／failed（明确失败）／refunded（已退回）／pending_review（待核对）
fail_reason＝insufficient_redeemable_balance（可兑换余额不足）／out_of_stock（库存不足）／product_offline（商品下架）／delivery_failed（明确发放失败）／result_unknown（发放结果不确定）
action_type＝reveal（查看卡密）／copy（复制卡密）
```

财务和法务写为上线前确认项，不把京东卡替代提现写成自动免税或免责。

- [ ] **Step 6: 替换页面图链接**

每个页面六要素的“需求描述”使用 Task 5 实际图片提交 SHA，短标题不超过 16 字。所有保留页面和新增状态必须对应：

```text
C 端：
找任务 → 01-task-plaza.png
玩法说明 → 02-play-rules.png
任务详情 → 03-task-detail.png
做任务 → 04-my-tasks.png
提交投稿 → 05-submit-work.png
创建发行任务 → 06-create-task.png
钱包 → 07-wallet.png
充值 → 08-recharge.png
京东卡兑换 → 09-card-store.png、10-card-confirm.png、11-card-success.png、12-card-history.png

B 端：
数据看板 → 13-dashboard.png
任务管理 → 14-task-management.png
任务审核 → 15-task-review.png
视频审核 → 16-video-review.png
结算管理 → 17-settlement.png
风控中心 → 18-risk.png
创作者审核 → 19-creator-review.png
京东卡管理 → 20-card-products.png、21-card-inventory.png
兑换订单 → 22-card-orders.png
```

任一页面或状态缺图、图与当前 Demo 不一致、链接仍指向旧版本时，不得声称 PRD 完成；必须回到 Task 5 重新生成并审图。

- [ ] **Step 7: 运行静态和 PRD 质量测试**

```powershell
node tools/verify-publisher-plan-v2.mjs
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1' `
  -Path 'prd\ai生成\【Prd】《盖世游戏》发行人计划需求.md'
```

Expected: 静态合同 `PASS`；PRD 质量脚本退出码 0，无六要素、产品流程、图片标题、埋点参数或禁项错误。

- [ ] **Step 8: 校验图片地址的本地结构**

在未获得推送授权前只运行不带 `-VerifyRemote` 的结构检查：

```powershell
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-images.ps1' `
  -PrdPath 'prd\ai生成\【Prd】《盖世游戏》发行人计划需求.md'
```

Expected: 图片数量、短标题、固定 40 位 SHA 和 `.png` 扩展名全部通过。不得把该结果表述为公网或飞书转存通过。

- [ ] **Step 9: 提交 PRD**

```powershell
git add -- 'prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md'
git commit -m "docs: revise publisher plan for jd card fulfillment"
```

## Task 7: 完成专业判断、状态回写和任务板评审

**Files:**
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md`
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json`

- [ ] **Step 1: 运行全量确定性检查**

```powershell
node tools/verify-publisher-plan-v2.mjs
node tools/verify-publisher-plan-v2-ui.mjs
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1' -Path 'prd\ai生成\【Prd】《盖世游戏》发行人计划需求.md'
git diff --check HEAD~4..HEAD
git status --short -- 'demos/Mod与发行人' 'prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md' 'public/prd/publisher-plan-v2' 'tools/verify-publisher-plan-v2.mjs' 'tools/verify-publisher-plan-v2-ui.mjs' 'docs/evidence/publisher-plan-v2' 'prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2*'
```

Expected: 三项验证退出码 0；无空截图；目标文件无未提交改动。

- [ ] **Step 2: 人工按原尺寸审图并记录 S7**

审核者写 `Codex 产品与视觉复核`；证据写二十三张截图路径、静态验证输出和 PRD 质量输出。检查钱包总余额与可兑换余额差异是否清楚、兑换页是否完全隐藏充值部分、弹窗是否无需地址、卡密是否默认脱敏、后台是否没有物流状态，以及旧页面是否因本轮样式修改出现回归。

- [ ] **Step 3: 回写状态卡**

记录以下当前决定：

```text
D-001：取消现金提现，改为京东电子卡自动发卡密。
D-002：前台继续称盖世币，按流水来源计算可兑换余额。
D-003：充值、充值预算退回不进入兑换页；发行人任务奖励可兑换。
D-004：明确失败回退；结果不确定进入待核对，禁止自动退款或补发。
```

产物登记写实际文件、提交 SHA、验证命令和真实状态；公网预览、远程图片、飞书转存均写“未执行”，不得省略。

- [ ] **Step 4: 提交状态卡**

```powershell
git add -- 'prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md' 'prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json'
git commit -m "docs: record publisher plan v2 evidence"
```

- [ ] **Step 5: 如需公网图片，先请求用户授权再推送**

推送属于外部写入，不包含在“修改本地文件”的默认授权中。只有用户明确同意后才运行：

```powershell
git push origin HEAD
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-images.ps1' `
  -PrdPath 'prd\ai生成\【Prd】《盖世游戏》发行人计划需求.md' `
  -VerifyRemote
```

Expected after authorized push: 每张图片 HTTP 200 且 MIME 与 PNG 匹配。该结果仍不能称为飞书转存通过。

- [ ] **Step 6: 回写任务板并转评审**

先读取最新版本：

```powershell
$issue = taskctl issue get GUANWANGGAID-41 --json | ConvertFrom-Json
taskctl comment add GUANWANGGAID-41 --body '已完成发行人计划V2本地实现：取消提现；充值盖世币不进入兑换余额；新增京东电子卡自动发放、卡密库存和兑换订单；C/B Demo、PRD、流程图和验证证据已同步。静态、交互和PRD质量检查通过；公网图片、飞书转存与远程发布按实际执行状态记录。' --json
taskctl issue move GUANWANGGAID-41 --status in_review --if-version $issue.task.version --json
```

如果加评论后任务版本发生变化，重新读取 issue，再以最新 `version` 执行 move。未经用户验收不得移到 `done`。

## 自检清单

- [ ] 设计稿每一条核心规则均有对应 Task。
- [ ] 充值盖世币在 C 端兑换余额、交互测试、PRD 和埋点中均被排除。
- [ ] 任务退回预算继承原来源，未打开充值兑卡通道。
- [ ] C/B Demo 无提现、支付宝、实体卡地址或物流语义。
- [ ] 京东卡默认脱敏，查看和复制有明确入口；后台普通日志不出现明文。
- [ ] 明确失败与结果不确定采用不同恢复策略。
- [ ] PRD 只有一张 `2.2` 横向产品流程图；页面图放在对应六要素表内。
- [ ] 事件参数和参数表一一对应，无未定义枚举。
- [ ] 本地、机器、专业判断、Git、公开预览、远程资源分别记录真实状态。

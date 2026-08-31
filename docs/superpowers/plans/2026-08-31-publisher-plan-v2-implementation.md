# Publisher Plan V2 Mall Naming and Global Inventory Alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在已完成的发行人计划 V2 基础上，将 C 端入口和页面统一命名为“兑换商城”，并把 B 端京东卡商品级库存阈值改成按 SKU 独立判断的全局库存告警配置，随后同步 Demo、PRD、截图和验证证据。

**Architecture:** C 端只改用户可见命名，商品、规则和订单仍使用“京东卡”语义。B 端删除 `jdCardProducts.warning`，新增一份全局 `cardAlertSettings` 与按 SKU 维护的 `cardAlertState`；卡密库存页通过现有通用弹窗编辑阈值、飞书机器人 Webhook、重复提醒间隔并预览消息，Demo 只模拟保存、去重和告警判定，不发起网络请求。现有 V2 账务隔离、卡密履约和订单异常流程保持不变。

**Tech Stack:** 单文件 HTML/CSS、原生 JavaScript、Node.js 24、`playwright-core`、PowerShell、Markdown、Python/Pillow/scikit-image、`to-prd` 校验脚本、`gamehub-product-workflow` 状态脚本、`taskctl`。

---

## 文件结构

- Modify: `tools/verify-publisher-plan-v2.mjs` — 增量静态合同，先锁定新命名、全局配置、禁止 SKU 阈值和 PRD 图片数量。
- Modify: `demos/Mod与发行人/发行人计划demo.html:245-264` — 钱包入口和商城标题统一为“兑换商城”。
- Modify: `demos/Mod与发行人/发行人计划-后台demo.html:55-87` — 告警弹窗所需的按钮组、错误提示和消息预览样式。
- Modify: `demos/Mod与发行人/发行人计划-后台demo.js:29-54,168-200,262-276` — 删除商品级 `warning`，增加全局设置、按 SKU 告警状态、校验、保存和预览交互。
- Modify: `tools/verify-publisher-plan-v2-ui.mjs:118-241,274-358` — 增加新命名、告警设置、去重、频控、恢复后再跌破和 24 张截图验收。
- Modify: `public/prd/publisher-plan-v2/00-product-flow.png`、`07-wallet.png`、`09-card-store.png`、`20-card-products.png`、`21-card-inventory.png` — 重拍受本轮变化影响的现有图片；验收脚本仍会确定性重建全套图片。
- Create: `public/prd/publisher-plan-v2/23-card-alert-settings.png` — B 端库存告警设置弹窗。
- Modify: `docs/evidence/publisher-plan-v2/verification.json`、`docs/evidence/publisher-plan-v2/visual/**` — 24 张截图、离线运行和视觉复核证据。
- Modify: `prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md:1-390` — 修订记录、C/B 六要素、全局告警规则、监控指标和图片提交 SHA。
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md` — 记录 D-007 至 D-009 的实施结果和新证据。
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json` — 重跑并通过 S4—S8。

## Task 1: 先把增量要求写成失败合同

**Files:**
- Modify: `tools/verify-publisher-plan-v2.mjs:25-78`
- Test: `tools/verify-publisher-plan-v2.mjs`

- [ ] **Step 1: 扩展 C/B Demo 和 PRD 静态断言**

在现有合同中保留来源余额、卡密状态和禁用物流的断言，并加入以下完整增量断言：

```javascript
mustContain(cHtml + cJs, [
  '可兑换盖世币',
  '充值获得的盖世币仅可用于发布任务',
  'view-card-store',
  'card-redeem-modal',
  'card-history-modal',
  '自动发放卡密',
  '查看卡密',
  '复制卡密',
  '<strong>兑换商城</strong>',
  '<span class="title">兑换商城</span>'
], 'C demo');
mustNotContain(cHtml + cJs, [
  'handleWithdraw',
  '确认提现',
  '提现到支付宝',
  '可提现金额',
  '已提现',
  '<strong>兑换京东卡</strong>',
  '<span class="title">兑换京东卡</span>'
], 'C demo');

mustContain(bHtml + bJs, [
  "switchPage('jd-cards')",
  "switchPage('card-orders')",
  '京东卡管理',
  '卡密库存',
  '兑换订单',
  '库存告警设置',
  '全局库存预警阈值',
  '飞书机器人 Webhook',
  '重复提醒间隔',
  '消息预览',
  'cardAlertSettings',
  'cardAlertState',
  'simulateCardInventoryAlerts',
  '未使用',
  '已预占',
  '已发放',
  '待核对',
  '作废'
], 'B demo');
mustNotContain(bJs, [
  'warning:',
  '<th>预警</th>',
  '<label>库存预警阈值</label>'
], 'B demo');
mustNotContain(bHtml + bJs, ['收货地址', '物流单号', '已发货'], 'B demo');

mustContain(prd, [
  '| 修订日期 | 修订内容 | 版本 | 修订人 |',
  '### 2.2 产品流程',
  '### 3.1 C 端功能需求',
  '### 3.2 B 端功能需求',
  '#### 3.1.9 兑换商城',
  '所有已上架京东卡 SKU 共用一个全局库存预警阈值',
  '按 SKU 独立判断',
  '飞书机器人 Webhook',
  '重复提醒间隔',
  '消息预览',
  'Webhook 服务端加密保存',
  '23-card-alert-settings.png',
  '充值获得的盖世币仅可用于发布任务，不可兑换京东卡',
  '![产品流程]',
  '## 五、待确认项'
], 'PRD');
mustNotContain(prd, [
  '__' + 'IMAGE_COMMIT_SHA' + '__',
  '<' + 'IMAGE_COMMIT_SHA' + '>',
  '库存、预警阈值、单人限兑',
  '单用户限兑次数、库存预警阈值'
], 'PRD');

const imagePaths = [...prd.matchAll(/publisher-plan-v2\/(\d{2}-[a-z0-9-]+\.png)/g)].map(match => match[1]);
assert.equal(new Set(imagePaths).size, 24, 'PRD must reference exactly 24 unique publisher-plan-v2 images');
```

- [ ] **Step 2: 运行合同并确认它因本轮功能尚未实现而失败**

Run:

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: 非零退出；第一个错误为 `C demo missing: <strong>兑换商城</strong>`。如果直接通过，说明合同没有锁住本轮变化，先修正断言再继续。

- [ ] **Step 3: 只提交失败合同**

```powershell
git add -- 'tools/verify-publisher-plan-v2.mjs'
git commit -m "test: define publisher mall alert contract"
```

Expected: 提交只包含 `tools/verify-publisher-plan-v2.mjs`，不暂存工作区其他修改。

## Task 2: 统一 C 端“兑换商城”命名并恢复页面基线

**Files:**
- Modify: `demos/Mod与发行人/发行人计划demo.html:245-264`
- Test: `tools/verify-publisher-plan-v2.mjs`
- State: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json`

- [ ] **Step 1: 重跑并通过 S4 原页面基线**

打开并按原尺寸核对当前 `07-wallet.png`、`09-card-store.png`、`20-card-products.png`、`21-card-inventory.png` 与对应 Demo 页面，确认本轮只改命名和库存告警，不改 C 端页面层级、B 端侧栏或卡密库存 Tab。然后运行：

```powershell
$runPath = 'prd\workflow-state\GUANWANGGAID-41-publisher-plan-v2.run.json'
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1' -Action rerun -RunPath $runPath -StepId S4
$revision = (Get-Content -Raw $runPath | ConvertFrom-Json).revision
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1' -Action start-step -RunPath $runPath -StepId S4 -ExpectedRevision $revision
$revision = (Get-Content -Raw $runPath | ConvertFrom-Json).revision
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1' `
  -Action pass -RunPath $runPath -StepId S4 -ExpectedRevision $revision `
  -Outputs '确认钱包、兑换页、京东卡商品和卡密库存现有结构' `
  -Evidence 'public/prd/publisher-plan-v2/07-wallet.png','public/prd/publisher-plan-v2/09-card-store.png','public/prd/publisher-plan-v2/20-card-products.png','public/prd/publisher-plan-v2/21-card-inventory.png' `
  -Message '只在现有页面内修改命名并增加库存告警设置入口'
```

Expected: S4 为 `passed`，S5—S8 保持 `stale`。

- [ ] **Step 2: 只替换两个用户可见名称**

将钱包入口和 `view-card-store` 顶部标题替换为：

```html
<button class="redeem-card-entry" type="button" onclick="showView('card-store')"><span><strong>兑换商城</strong><span>完成发行人任务获得的盖世币可兑换</span></span><span class="entry-arrow">›</span></button>
```

```html
<div class="header" data-component-id="C-TOPBAR"><span class="back" onclick="showView('earnings')">‹</span><span class="title">兑换商城</span><button type="button" class="right-btn" onclick="openCardHistory()">兑换记录</button></div>
```

保留玩法说明中的“可兑换京东电子卡”、规则中的“不可兑换京东卡”以及商品名称；它们描述的是兑换对象，不属于页面名称。

- [ ] **Step 3: 运行静态合同，确认 C 端断言已通过且仍因 B 端缺失失败**

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: 非零退出；不再出现 C Demo 命名错误，下一项错误为 `B demo missing: 库存告警设置`。

- [ ] **Step 4: 精确提交 C 端改动**

```powershell
git add -- 'demos/Mod与发行人/发行人计划demo.html'
git commit -m "feat: rename publisher redemption mall"
```

## Task 3: 把 B 端商品级阈值改为全局库存告警

**Files:**
- Modify: `demos/Mod与发行人/发行人计划-后台demo.html:55-87`
- Modify: `demos/Mod与发行人/发行人计划-后台demo.js:29-54,168-200,262-276`
- Test: `tools/verify-publisher-plan-v2.mjs`

- [ ] **Step 1: 增加告警弹窗的局部样式**

在后台 HTML 的通用组件样式中加入：

```css
.setting-actions{display:flex;align-items:center;gap:8px}
.form-help{margin-top:6px;color:#999;font-size:12px;line-height:1.6}
.form-error{display:none;margin-top:8px;color:#ff4d4f;font-size:12px;line-height:1.6}
.form-error.show{display:block}
.alert-preview{padding:12px 14px;border-left:4px solid #ff8c00;border-radius:6px;background:#f5f5f5;color:#333;font-size:13px;line-height:1.7}
```

- [ ] **Step 2: 删除四个商品的 `warning` 字段并定义全局配置**

用以下数据替换 `jdCardProducts`，并在 `currentCardAdminTab` 前增加告警状态：

```javascript
const jdCardProducts=[
{id:'JD10',name:'京东E卡 10元',faceValue:10,cost:1000,stock:8,limit:2,status:'已上架',image:'已配置',instructions:'兑换成功后自动发放电子卡密，请在京东账户内绑定使用。'},
{id:'JD20',name:'京东E卡 20元',faceValue:20,cost:2000,stock:5,limit:1,status:'已上架',image:'已配置',instructions:'兑换成功后自动发放电子卡密，请在京东账户内绑定使用。'},
{id:'JD50',name:'京东E卡 50元',faceValue:50,cost:5000,stock:0,limit:1,status:'已下架',image:'已配置',instructions:'兑换成功后自动发放电子卡密，请在京东账户内绑定使用。'},
{id:'JD100',name:'京东E卡 100元',faceValue:100,cost:10000,stock:2,limit:1,status:'已上架',image:'已配置',instructions:'兑换成功后自动发放电子卡密，请在京东账户内绑定使用。'},
];

const cardAlertSettings={
  threshold:3,
  repeatHours:24,
  maskedWebhooks:['https://open.feishu.cn/open-apis/bot/v2/hook/****lert']
};
const cardAlertState=new Map();
let lastCardAlertSimulation={lowProductIds:[],notifyProductIds:[],reason:'尚未检查'};
```

`stock` 在 Demo 中表示当前可用库存汇总，口径为未使用、未预占、未发放、未作废的卡密；不把不同 SKU 的 `stock` 相加。

- [ ] **Step 3: 增加按 SKU 判断、重复提醒和恢复重置函数**

在 `productName()` 后加入：

```javascript
function getLowStockProducts(threshold=cardAlertSettings.threshold){
  return jdCardProducts.filter(item=>item.status==='已上架'&&item.stock<=threshold);
}

function simulateCardInventoryAlerts(nowMs=Date.now(),reason='库存变化'){
  const lowProducts=getLowStockProducts();
  const lowIds=new Set(lowProducts.map(item=>item.id));
  const notifyProductIds=[];
  for(const product of jdCardProducts){
    const previous=cardAlertState.get(product.id);
    if(!lowIds.has(product.id)){
      cardAlertState.set(product.id,{low:false,lastNotifiedAt:null});
      continue;
    }
    const repeatMs=cardAlertSettings.repeatHours*60*60*1000;
    const shouldNotify=!previous||!previous.low||nowMs-previous.lastNotifiedAt>=repeatMs;
    if(shouldNotify)notifyProductIds.push(product.id);
    cardAlertState.set(product.id,{low:true,lastNotifiedAt:shouldNotify?nowMs:previous.lastNotifiedAt});
  }
  lastCardAlertSimulation={reason,lowProductIds:[...lowIds],notifyProductIds};
  return lastCardAlertSimulation;
}

function isFeishuWebhook(value){
  if(cardAlertSettings.maskedWebhooks.includes(value))return true;
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&['open.feishu.cn','open.larksuite.com'].includes(url.hostname)&&/^\/open-apis\/bot\/v2\/hook\/[^/]+$/.test(url.pathname);
  }catch{
    return false;
  }
}

function maskWebhook(value){
  const prefix=value.slice(0,Math.max(0,value.length-8));
  return `${prefix}****${value.slice(-4)}`;
}

function buildCardAlertPreview(threshold=cardAlertSettings.threshold){
  const product=[...jdCardProducts].filter(item=>item.status==='已上架').sort((a,b)=>a.stock-b.stock)[0];
  return `<strong>【京东卡库存告警】</strong><br>${product.name} 当前可用卡密剩余 <strong>${product.stock}</strong> 张，已达到全局预警阈值 <strong>${threshold}</strong> 张，请及时补充库存。<br><span style="color:#1677ff">[进入后台]</span>`;
}
```

`cardAlertState` 必须以 `product.id` 为键；下架商品进入非低库存状态，补货超过阈值后清空其低库存状态，再次跌至阈值时立即进入 `notifyProductIds`。

- [ ] **Step 4: 删除商品列表和编辑表单中的 SKU 阈值**

用以下函数替换 `renderCardProducts()`：

```javascript
function renderCardProducts(){
  return `<div class="card">
    <div class="card-title-row"><div class="card-title">京东电子卡商品</div><button class="btn btn-primary" onclick="openCardProductModal()">+ 新增商品</button></div>
    <div class="status-note info">库存高亮使用卡密库存页的全局阈值，并按每个已上架 SKU 的可用库存分别判断。</div>
    <div class="table-wrap"><table><thead><tr><th>商品ID</th><th>名称</th><th>面额</th><th>兑换价格</th><th>可用库存</th><th>单人限兑</th><th>状态</th><th>操作</th></tr></thead><tbody>
    ${jdCardProducts.map(item=>`<tr><td>${item.id}</td><td>${item.name}</td><td>¥${item.faceValue}</td><td>${item.cost.toLocaleString()} 盖世币</td><td style="color:${item.status==='已上架'&&item.stock<=cardAlertSettings.threshold?'#ff4d4f':'inherit'}">${item.stock}</td><td>${item.limit}次</td><td><span class="tag ${item.status==='已上架'?'tag-green':'tag-gray'}">${item.status}</span></td><td><button class="btn btn-sm" onclick="openCardProductModal('${item.id}')">编辑</button></td></tr>`).join('')}
    </tbody></table></div>
  </div>`;
}
```

将 `openCardProductModal()` 中“单用户限兑次数”后的下一行直接改为“上下架状态”，完整保留名称、主图、面额、兑换价格、限兑、上下架和使用说明，不再渲染任何阈值输入。

- [ ] **Step 5: 在卡密库存页增加全局设置入口**

将 `renderCardInventory()` 的标题行替换为：

```javascript
<div class="card-title-row"><div class="card-title">卡密库存</div><div class="setting-actions"><button id="card-alert-settings" class="btn" onclick="openCardAlertSettings()">库存告警设置</button><button class="btn btn-primary" onclick="openCardImportModal()">批量导入卡密</button></div></div>
```

在标题行下保留原卡密安全说明，并补充：

```html
<div class="status-note info">全局阈值作用于所有已上架京东卡 SKU，但分别判断每个 SKU 的可用库存，不汇总不同面额。</div>
```

- [ ] **Step 6: 实现设置弹窗、输入校验、去重和模拟保存**

在 `openCardProductModal()` 前加入以下完整函数：

```javascript
function openCardAlertSettings(){
  document.getElementById('modal-box').innerHTML=`
    <div class="modal-header"><span>库存告警设置</span><span class="modal-close" onclick="closeModal()">×</span></div>
    <div class="form-row"><label>全局库存预警阈值</label><input id="card-alert-threshold" type="number" min="1" step="1" value="${cardAlertSettings.threshold}" oninput="refreshCardAlertPreview()"><div class="form-help">所有已上架京东卡 SKU 共用，库存小于或等于该值时按 SKU 独立告警。</div></div>
    <div class="form-row"><label>飞书机器人 Webhook</label><textarea id="card-alert-webhooks" rows="4" placeholder="每行一个 HTTPS 飞书机器人地址"></textarea><div class="form-help">保存时去重并脱敏展示；全部清空并保存后停止外部告警。Demo 不会真实请求飞书。</div></div>
    <div class="form-row"><label>重复提醒间隔</label><input id="card-alert-repeat-hours" type="number" min="1" step="1" value="${cardAlertSettings.repeatHours}"><div class="form-help">单位：小时。同一 SKU 持续低库存时按该间隔去重，默认 24 小时。</div></div>
    <div class="form-row"><label>消息预览</label><div id="card-alert-preview" class="alert-preview"></div></div>
    <div id="card-alert-error" class="form-error" role="alert"></div>
    <div class="form-actions"><button class="btn" onclick="closeModal()">取消</button><button id="save-card-alert-settings" class="btn btn-primary" onclick="saveCardAlertSettings()">保存设置</button></div>`;
  document.getElementById('card-alert-webhooks').value=cardAlertSettings.maskedWebhooks.join('\n');
  document.getElementById('modal').classList.add('show');
  refreshCardAlertPreview();
}

function refreshCardAlertPreview(){
  const input=document.getElementById('card-alert-threshold');
  const preview=document.getElementById('card-alert-preview');
  if(preview)preview.innerHTML=buildCardAlertPreview(Number(input&&input.value)||cardAlertSettings.threshold);
}

function showCardAlertError(message){
  const error=document.getElementById('card-alert-error');
  error.textContent=message;
  error.classList.add('show');
}

function saveCardAlertSettings(){
  const threshold=Number(document.getElementById('card-alert-threshold').value);
  const repeatHours=Number(document.getElementById('card-alert-repeat-hours').value);
  const webhooks=[...new Set(document.getElementById('card-alert-webhooks').value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean))];
  if(!Number.isInteger(threshold)||threshold<1){
    showCardAlertError('全局库存预警阈值必须为大于 0 的整数');
    return;
  }
  if(!Number.isInteger(repeatHours)||repeatHours<1){
    showCardAlertError('重复提醒间隔必须为大于 0 的整数小时');
    return;
  }
  const invalidWebhook=webhooks.find(value=>!isFeishuWebhook(value));
  if(invalidWebhook){
    showCardAlertError('Webhook 必须是有效的 HTTPS 飞书机器人地址');
    return;
  }
  cardAlertSettings.threshold=threshold;
  cardAlertSettings.repeatHours=repeatHours;
  cardAlertSettings.maskedWebhooks=webhooks.map(value=>cardAlertSettings.maskedWebhooks.includes(value)?value:maskWebhook(value));
  const result=simulateCardInventoryAlerts(Date.now(),'保存设置后立即检查');
  closeModal();
  renderPage('jd-cards');
  const suffix=cardAlertSettings.maskedWebhooks.length?`检测到 ${result.lowProductIds.length} 个低库存 SKU，Demo 未发送飞书消息`:'外部告警已停用';
  showToast(`库存告警设置已保存；${suffix}`);
}
```

Demo 源码中只保存脱敏后的示例地址；真实系统的服务端加密、权限校验、发送失败日志和定时重试由 PRD定义，不在前端 Demo 内伪造网络行为。

- [ ] **Step 7: 运行静态合同，确认只剩 PRD 断言失败**

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: 非零退出；C/B Demo 断言均通过，下一项错误为 `PRD missing: #### 3.1.9 兑换商城`。

- [ ] **Step 8: 精确提交 B 端 Demo**

```powershell
git add -- 'demos/Mod与发行人/发行人计划-后台demo.html' 'demos/Mod与发行人/发行人计划-后台demo.js'
git commit -m "feat: add global jd card inventory alerts"
```

## Task 4: 扩展浏览器验收并重建 24 张证据图

**Files:**
- Modify: `tools/verify-publisher-plan-v2-ui.mjs:118-241,274-358`
- Modify: `public/prd/publisher-plan-v2/*.png`
- Modify: `docs/evidence/publisher-plan-v2/verification.json`
- Modify: `docs/evidence/publisher-plan-v2/visual/**`
- Test: `tools/build-publisher-plan-v2-visual-evidence.py`

- [ ] **Step 1: 增加 C 端命名断言**

在进入钱包和商城后分别加入：

```javascript
assert.equal(await page.locator('#view-earnings .redeem-card-entry strong').innerText(), '兑换商城');
await page.evaluate(() => showView('card-store'));
assert.equal(await page.locator('#view-card-store .header .title').innerText(), '兑换商城');
```

把 `captureC(page, '09-card-store', '京东卡兑换')` 的标题参数改为 `兑换商城`；商品、确认、发放和记录断言不改。

- [ ] **Step 2: 增加商品级阈值已删除的交互断言**

在后台打开京东卡商品页后加入：

```javascript
assert.equal(await adminPage.locator('th').filter({ hasText: /^预警$/ }).count(), 0);
await adminPage.evaluate(() => openCardProductModal('JD10'));
assert.equal(await adminPage.getByText('库存预警阈值', { exact: true }).count(), 0);
await adminPage.evaluate(() => closeModal());
```

- [ ] **Step 3: 验收告警弹窗、错误保留、Webhook 去重和即时检查**

在卡密库存截图之后执行：

```javascript
await adminPage.getByRole('button', { name: '库存告警设置' }).click();
assert.equal(await adminPage.locator('#card-alert-threshold').inputValue(), '3');
assert.equal(await adminPage.locator('#card-alert-repeat-hours').inputValue(), '24');
assert.match(await adminPage.locator('#card-alert-webhooks').inputValue(), /\*{4}/);
assert.match(await adminPage.locator('#card-alert-preview').innerText(), /京东E卡 100元/);
await capture(
  adminPage.locator('#modal'),
  path.join(outputDir, '23-card-alert-settings.png'),
  screenshots,
  '23-card-alert-settings',
  '库存告警设置'
);

await adminPage.locator('#card-alert-threshold').fill('0');
await adminPage.locator('#save-card-alert-settings').click();
assert.equal(await adminPage.getByText('全局库存预警阈值必须为大于 0 的整数', { exact: true }).count(), 1);
await adminPage.locator('#card-alert-threshold').fill('3');
await adminPage.locator('#card-alert-repeat-hours').fill('0');
await adminPage.locator('#save-card-alert-settings').click();
assert.equal(await adminPage.getByText('重复提醒间隔必须为大于 0 的整数小时', { exact: true }).count(), 1);
await adminPage.locator('#card-alert-repeat-hours').fill('24');
await adminPage.locator('#card-alert-webhooks').fill('http://example.com/hook');
await adminPage.locator('#save-card-alert-settings').click();
assert.equal(await adminPage.locator('#modal').evaluate(element => element.classList.contains('show')), true);
assert.equal(await adminPage.getByText('Webhook 必须是有效的 HTTPS 飞书机器人地址', { exact: true }).count(), 1);

const demoWebhook='https://open.feishu.cn/open-apis/bot/v2/hook/demo-inventory-alert';
await adminPage.locator('#card-alert-webhooks').fill(`${demoWebhook}\n${demoWebhook}`);
await adminPage.locator('#save-card-alert-settings').click();
assert.equal(await adminPage.evaluate(() => cardAlertSettings.maskedWebhooks.length), 1);
assert.deepEqual(await adminPage.evaluate(() => lastCardAlertSimulation.lowProductIds), ['JD100']);
assert.deepEqual(await adminPage.evaluate(() => lastCardAlertSimulation.notifyProductIds), ['JD100']);

await adminPage.evaluate(() => openCardAlertSettings());
await adminPage.locator('#card-alert-webhooks').fill('');
await adminPage.locator('#save-card-alert-settings').click();
assert.equal(await adminPage.evaluate(() => cardAlertSettings.maskedWebhooks.length), 0);
```

该地址只作为输入校验样例，浏览器请求监听仍必须证明没有对它发起请求。

- [ ] **Step 4: 验收同 SKU 频控、补货重置、再次跌破和下架排除**

加入确定性时间测试：

```javascript
const alertSequence=await adminPage.evaluate(() => {
  cardAlertState.clear();
  const first=simulateCardInventoryAlerts(0,'首次跌破');
  const repeated=simulateCardInventoryAlerts(60*60*1000,'持续低库存');
  const afterInterval=simulateCardInventoryAlerts(24*60*60*1000,'达到重复间隔');
  const jd100=jdCardProducts.find(item=>item.id==='JD100');
  jd100.stock=4;
  const recovered=simulateCardInventoryAlerts(25*60*60*1000,'补货恢复');
  jd100.stock=2;
  const droppedAgain=simulateCardInventoryAlerts(26*60*60*1000,'恢复后再次跌破');
  return { first, repeated, afterInterval, recovered, droppedAgain };
});
assert.deepEqual(alertSequence.first.notifyProductIds, ['JD100']);
assert.deepEqual(alertSequence.repeated.notifyProductIds, []);
assert.deepEqual(alertSequence.afterInterval.notifyProductIds, ['JD100']);
assert.deepEqual(alertSequence.recovered.lowProductIds, []);
assert.deepEqual(alertSequence.droppedAgain.notifyProductIds, ['JD100']);
assert.equal(alertSequence.first.lowProductIds.includes('JD50'), false, '已下架 SKU 不得触发告警');
```

- [ ] **Step 5: 把截图总数和证据合同更新为 24**

将精确数量断言和结束日志改为：

```javascript
assert.equal(screenshots.length, 24, 'Expected exactly 24 PRD screenshots');
```

```javascript
console.log('PASS: publisher plan V2 UI, 24 screenshots captured');
```

在 `verification.contract` 中补充：

```javascript
mallTitle: '兑换商城',
globalAlertThreshold: 3,
alertScope: 'per-sku',
repeatHours: 24,
webhookRequestsSent: 0
```

- [ ] **Step 6: 运行离线浏览器验收并重建视觉证据**

```powershell
node tools/verify-publisher-plan-v2-ui.mjs
python tools/build-publisher-plan-v2-visual-evidence.py
```

Expected: 依次输出 `PASS: publisher plan V2 UI, 24 screenshots captured` 和 `PASS: visual evidence generated; strict component passed`；`verification.json` 中 `externalRequests`、`pageErrors`、`consoleErrors` 均为 0，`visualComparison.manualReview.status` 为 `pending`。

- [ ] **Step 7: 人工按原尺寸检查五张受影响图片和新增弹窗**

依次查看：

```text
public/prd/publisher-plan-v2/07-wallet.png
public/prd/publisher-plan-v2/09-card-store.png
public/prd/publisher-plan-v2/20-card-products.png
public/prd/publisher-plan-v2/21-card-inventory.png
public/prd/publisher-plan-v2/23-card-alert-settings.png
```

验收：两处 C 端名称均为“兑换商城”；商品表没有“预警”列；编辑商品没有阈值输入；库存页入口位于“批量导入卡密”同一标题行；弹窗字段、脱敏 Webhook、消息预览、按钮和错误区域无溢出或遮挡；页面未出现独立告警中心或真实敏感地址。

- [ ] **Step 8: 提交验收脚本、图片和证据**

```powershell
git add -- 'tools/verify-publisher-plan-v2-ui.mjs' 'public/prd/publisher-plan-v2' 'docs/evidence/publisher-plan-v2'
git commit -m "test: verify publisher mall inventory alerts"
git rev-parse HEAD
```

Expected: 得到图片所在提交的 40 位 SHA，供 Task 5 固定所有 PRD 图片链接；不推送该提交。

## Task 5: 按 `to-prd` 规则同步 V2.1 PRD

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md:1-390`
- Test: `tools/verify-publisher-plan-v2.mjs`
- Test: `C:/Users/z3635/.codex/skills/to-prd/scripts/validate-prd-quality.ps1`
- Test: `C:/Users/z3635/.codex/skills/to-prd/scripts/validate-prd-images.ps1`

- [ ] **Step 1: 读取并执行 `to-prd`，增加修订记录**

保留 V2.0 记录并新增：

```markdown
| 2026/8/31 | C 端统一命名为兑换商城；京东卡商品级阈值改为全局阈值，增加飞书 Webhook、重复提醒间隔和消息预览 | V2.1 | 郑群超 |
```

把文档检索提示改为：

```markdown
**备注：** 搜2026.8.31修改；本次增量见 V2.1。
```

- [ ] **Step 2: 同步 C 端第 3.1.9 节**

将标题和功能名称改为：

```markdown
#### 3.1.9 兑换商城
```

```markdown
| 功能名称 | 兑换商城 |
```

钱包六要素中的入口和页面标题统一写“兑换商城”；商品类型、兑换规则、订单内容继续称“京东电子卡”或“京东卡”。完整规则说明保持逐字不变：

> 兑换页展示的盖世币余额仅包含可兑换部分。充值获得的盖世币仅可用于发布任务，不可兑换京东卡；任务取消、审核驳回或结算后退回的未消耗预算沿用原来源，不计入可兑换余额。完成发行人任务获得的盖世币可用于兑换京东电子卡。

- [ ] **Step 3: 重写 B 端第 3.2.8 节的商品和库存说明**

商品配置展示说明改为：

```markdown
1. “商品配置”列表展示商品 ID、名称、面额、兑换价格、可用库存、单人限兑、上下架状态和操作；已上架 SKU 的库存小于或等于全局预警阈值时高亮数量。
2. 新增或编辑表单包含商品名称、主图配置状态、卡面额、兑换所需盖世币、单用户限兑次数、上下架状态和使用说明；商品数据不再配置 SKU 级库存预警阈值。
3. 所有已上架京东卡 SKU 共用一个全局库存预警阈值，但按 SKU 独立判断，不汇总不同面额库存。
```

“输出／后置条件”改为：

```markdown
商品配置保存并同步 C 端可见性、顺序和兑换条件；卡密库存变化刷新商品可用库存，并按全局阈值重新判断对应 SKU 的告警状态。
```

- [ ] **Step 4: 在卡密库存子功能后增加告警设置子功能**

先取得并打印本轮图片提交的固定 URL：

```powershell
$imageCommit = git rev-parse HEAD
$alertImageUrl = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$imageCommit/public/prd/publisher-plan-v2/23-card-alert-settings.png"
$alertImageUrl
```

Expected: `$imageCommit` 为 Task 4 刚提交的 40 位 SHA，`$alertImageUrl` 不含分支名或可变标签。用下列命令生成完整 Markdown 行：

```powershell
$alertRow = "| 弹窗 | ![库存告警设置]($alertImageUrl) | 库存告警设置：全局库存预警阈值、飞书机器人 Webhook、重复提醒间隔和只读消息预览。 | **展示说明：**<br>1. 全局阈值为大于 0 的整数，当前初始值为 3；所有已上架 SKU 共用，但按 SKU 可用库存分别判断。<br>2. Webhook 支持每行一个 HTTPS 飞书机器人地址，保存时去重；保存后脱敏展示，服务端加密保存，仅具备库存告警配置权限的人员可查看和修改。<br>3. 重复提醒间隔为大于 0 的整数小时，默认 24 小时；消息预览展示商品名称、面额、当前可用库存、全局阈值和后台入口，不发送真实消息。<br>**交互说明：**<br>1. 用户保存后系统立即检查所有已上架 SKU；任一 SKU 可用库存小于或等于阈值时立即告警，不汇总不同面额。<br>2. 同一 SKU 持续低库存按间隔去重；补货超过阈值后重置，再次跌至阈值立即提醒。商品下架停止新增告警，重新上架立即检查。<br>3. Webhook 重复填写时去重；全部清空并保存后停止外部告警。阈值、间隔或地址不合法时不保存并保留输入，提示具体字段错误。<br>4. Webhook 发送失败写入现有操作日志，在下一次允许提醒时重试；失败不阻断兑换、发卡或卡密入库。 |"
$alertRow
```

将 `$alertRow` 打印出的完整一行原样加入 `##### 页面子功能汇总` 表。文档落盘后运行 `rg -n '\$alertImageUrl|\$alertRow' 'prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md'`，Expected: 无输出，证明变量名没有被误写进 PRD。

- [ ] **Step 5: 补齐告警触发、安全、运营和数据口径**

在技术需求中写清：

```markdown
- 可用库存只统计未使用、未预占、未发放、未作废的卡密；导入、预占、发放、释放、作废、上下架或保存设置后，重新判断受影响的已上架 SKU。
- 每个 SKU 独立保存低库存状态和上次提醒时间；持续低库存按重复提醒间隔去重，恢复到阈值以上后重置。
- Webhook 服务端加密保存、响应脱敏、权限受控且不进入普通日志；发送失败记录现有操作日志，不参与兑换事务。
```

在运营需求中把配置项改为：

```markdown
维护京东卡商品名称、主图、面额、所需盖世币、限兑、上下架、排序和使用说明；在卡密库存页维护唯一全局预警阈值、飞书机器人 Webhook 和重复提醒间隔。真实线上旧 SKU 阈值不一致时，启用前由运营确认唯一全局值，不取平均值或静默覆盖。
```

在数据报表中增加“京东卡库存告警监控”，指标为低库存 SKU 数、告警发送成功数、发送失败数和去重拦截数；维度为商品、面额和告警结果。不要新增发行人后台看板卡片。

- [ ] **Step 6: 固定全套 24 张图片到 Task 4 提交**

将文档内 `publisher-plan-v2/00-product-flow.png` 至 `22-card-orders.png` 的旧提交 `5223f07cd73f9b66285897700dca9807b0e0eed9` 全部替换为 Task 4 输出的同一个 40 位 SHA，并给 `23-card-alert-settings.png` 使用相同 SHA。使用 `apply_patch` 修改 Markdown，不用会误伤其他文件的全仓替换命令。

- [ ] **Step 7: 运行静态、PRD 质量和图片结构验证**

```powershell
node tools/verify-publisher-plan-v2.mjs
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1' -Path 'prd\ai生成\【Prd】《盖世游戏》发行人计划需求.md'
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-images.ps1' -PrdPath 'prd\ai生成\【Prd】《盖世游戏》发行人计划需求.md'
```

Expected: 静态合同输出 `PASS: publisher plan V2 static contract`；质量脚本 0 errors / 0 warnings；图片脚本识别 24 张、24 个唯一文件、同一个固定 40 位 SHA，`RemoteVerified=0`。未获推送授权，因此不能加入 `-VerifyRemote`，也不能称公网或飞书转存通过。

- [ ] **Step 8: 精确提交 PRD**

```powershell
git add -- 'prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md'
git commit -m "docs: revise publisher mall alert rules"
```

## Task 6: 全量验证、状态回写和任务板评审

**Files:**
- Modify: `docs/evidence/publisher-plan-v2/verification.json`
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md`
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json`
- External in scope: taskboard issue `GUANWANGGAID-41`

- [ ] **Step 1: 运行全量确定性检查**

```powershell
node tools/verify-publisher-plan-v2.mjs
node tools/verify-publisher-plan-v2-ui.mjs
python tools/build-publisher-plan-v2-visual-evidence.py
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1' -Path 'prd\ai生成\【Prd】《盖世游戏》发行人计划需求.md'
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-images.ps1' -PrdPath 'prd\ai生成\【Prd】《盖世游戏》发行人计划需求.md'
git diff --check aed27237..HEAD
git status --short -- 'demos/Mod与发行人/发行人计划demo.html' 'demos/Mod与发行人/发行人计划-后台demo.html' 'demos/Mod与发行人/发行人计划-后台demo.js' 'prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md' 'public/prd/publisher-plan-v2' 'tools/verify-publisher-plan-v2.mjs' 'tools/verify-publisher-plan-v2-ui.mjs' 'docs/evidence/publisher-plan-v2'
```

Expected: 两个 Node 脚本、视觉脚本和两个 PRD 脚本均通过；`git diff --check` 无输出；列出的实施文件没有未提交修改。全仓其他用户修改不在本任务范围内，不得暂存或还原。

- [ ] **Step 2: 完成 S7 人工专业复核并更新证据 JSON**

再次按原尺寸检查 24 张图片，重点确认：C 端命名一致；充值余额仍不进入兑换；B 端全局阈值不汇总 SKU；JD100 触发、JD50 下架不触发；商品编辑无 SKU 阈值；Webhook 脱敏；错误输入保留在弹窗；无外部请求。把 `verification.json` 的 `visualComparison.manualReview` 更新为：

```json
{
  "status": "pass",
  "reviewer": "Codex 产品与视觉复核",
  "evidence": [
    "24 张原尺寸截图",
    "C 端兑换商城命名一致",
    "B 端全局阈值按 SKU 独立判断",
    "Webhook 脱敏且 externalRequests=0"
  ]
}
```

- [ ] **Step 3: 依次通过 S5、S6 和 S7**

```powershell
$runPath = 'prd\workflow-state\GUANWANGGAID-41-publisher-plan-v2.run.json'
$revision = (Get-Content -Raw $runPath | ConvertFrom-Json).revision
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1' -Action start-step -RunPath $runPath -StepId S5 -ExpectedRevision $revision
$revision = (Get-Content -Raw $runPath | ConvertFrom-Json).revision
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1' -Action pass -RunPath $runPath -StepId S5 -ExpectedRevision $revision -Outputs 'C/B Demo、V2.1 PRD、24 张页面图已同步' -Evidence '本轮 C/B/截图/PRD 提交记录' -Message 'D-007 至 D-009 已实施'
$revision = (Get-Content -Raw $runPath | ConvertFrom-Json).revision
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1' -Action start-step -RunPath $runPath -StepId S6 -ExpectedRevision $revision
$revision = (Get-Content -Raw $runPath | ConvertFrom-Json).revision
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1' -Action pass -RunPath $runPath -StepId S6 -ExpectedRevision $revision -Outputs '静态合同、UI、视觉、PRD 质量与图片结构验证通过' -Evidence 'tools/verify-publisher-plan-v2.mjs','tools/verify-publisher-plan-v2-ui.mjs','docs/evidence/publisher-plan-v2/verification.json' -Message '24 张截图；externalRequests/pageErrors/consoleErrors 均为 0'
$revision = (Get-Content -Raw $runPath | ConvertFrom-Json).revision
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1' -Action start-step -RunPath $runPath -StepId S7 -ExpectedRevision $revision
$revision = (Get-Content -Raw $runPath | ConvertFrom-Json).revision
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1' -Action pass -RunPath $runPath -StepId S7 -ExpectedRevision $revision -Outputs '产品规则、文档语义和 24 张原尺寸图片复核通过' -Evidence 'docs/evidence/publisher-plan-v2/verification.json','public/prd/publisher-plan-v2/23-card-alert-settings.png' -Reviewer 'Codex 产品与视觉复核' -Message '全局阈值、按 SKU 判断、频控和 Webhook 安全口径一致'
```

Expected: S5、S6、S7 均为 `passed`，S8 仍为 `stale`。

- [ ] **Step 4: 按 `gamehub-product-workflow` 更新状态卡**

将当前阶段改为“增量实施完成，待用户验收”，并把产物登记中的 C/B Demo、PRD、24 张图片、静态合同和机器与视觉证据改为“已同步”。在“修改与验证”追加一行，记录：

```text
2026-08-31｜“兑换商城”命名与京东卡全局库存告警｜C 端统一命名；删除 SKU warning；增加阈值、Webhook、重复间隔、消息预览及按 SKU 模拟告警｜C/B Demo、PRD、24 张截图、静态与 UI 合同｜全量本地验证和原尺寸审图通过，未推送、未真实请求飞书
```

保留风险：真实线上阈值迁移需运营确认唯一值；Webhook 服务端加密和权限需研发落实；公网图片、飞书转存、Git 推送和线上发布均未执行。

- [ ] **Step 5: 回写任务板并移到 `in_review`**

按 `manage-taskboard` 读取最新版本后执行：

```powershell
$issue = taskctl issue get GUANWANGGAID-41 --json | ConvertFrom-Json
taskctl comment add GUANWANGGAID-41 --body '已完成本轮增量：C 端统一命名为“兑换商城”；B 端删除商品级库存预警阈值，新增全局阈值、飞书机器人 Webhook、重复提醒间隔和消息预览，并按已上架 SKU 独立判断。C/B Demo、V2.1 PRD、24 张图片和验证证据已同步；静态、交互、视觉和 PRD 校验通过。未执行 Git 推送、线上发布、真实飞书请求或飞书转存。' --json
$latest = taskctl issue get GUANWANGGAID-41 --json | ConvertFrom-Json
taskctl issue move GUANWANGGAID-41 --status in_review --if-version $latest.task.version --json
```

Expected: 评论成功，任务状态为 `in_review`；未经用户验收不得移到 `done`。

- [ ] **Step 6: 通过 S8 并精确提交状态证据**

```powershell
$runPath = 'prd\workflow-state\GUANWANGGAID-41-publisher-plan-v2.run.json'
$revision = (Get-Content -Raw $runPath | ConvertFrom-Json).revision
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1' -Action start-step -RunPath $runPath -StepId S8 -ExpectedRevision $revision
$revision = (Get-Content -Raw $runPath | ConvertFrom-Json).revision
& 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1' -Action pass -RunPath $runPath -StepId S8 -ExpectedRevision $revision -Outputs 'C/B Demo、V2.1 PRD、24 张图片、验证证据和任务板已对账' -Evidence 'GUANWANGGAID-41=in_review','本地提交记录','docs/evidence/publisher-plan-v2/verification.json' -Message '本地交付通过；推送、发布、真实飞书和远程图片验证未执行'
git add -- 'docs/evidence/publisher-plan-v2/verification.json' 'prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md' 'prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json'
git commit -m "docs: record publisher mall alert evidence"
```

Expected: run 总状态为 `passed`；最终提交只包含验证 JSON、状态卡和 run JSON。

- [ ] **Step 7: 最终边界检查**

```powershell
git status --short
git log --oneline -6
```

确认没有运行 `git push`，没有真实飞书请求，没有新增独立告警中心、看板指标、SKU 级阈值、其他卡种或物流流程；用户原有未提交文件保持不变。

## 自检清单

- [ ] D-007 在 C 端 Demo、UI 验收、PRD 标题和截图中都统一为“兑换商城”。
- [ ] D-008 在数据结构、商品表、编辑表单、按 SKU 判断、频控测试和 PRD 中都有对应步骤。
- [ ] D-009 的阈值、Webhook、重复提醒间隔、消息预览、加密／脱敏／权限口径和不真实发送边界均被覆盖。
- [ ] 已上架 JD100 在阈值 3 时触发；已下架 JD50 不触发；不同 SKU 不汇总。
- [ ] 持续低库存、达到重复间隔、补货恢复、再次跌破四种状态均有确定性测试。
- [ ] C 端来源余额隔离、卡密履约和订单异常流程未被改写。
- [ ] PRD 使用 24 张唯一图片，全部固定到同一个实际 40 位图片提交 SHA。
- [ ] 本地源文件、机器验证、人工判断、Git、任务板、公开预览和远程资源分别记录真实状态。
- [ ] 所有 Git 操作都使用精确路径暂存，不触碰工作区其他用户修改。
- [ ] 全程不推送、不发布、不请求真实飞书、不把本地通过表述为公网或飞书转存通过。

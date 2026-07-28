# Cloud Save Rental-Style Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将云存档购买改为租号式单页收银台，默认 ¥6 永久购买，支持切换 ¥18 月套餐、支付宝/微信支付和支付拉起，并把“月包存档/已购存档”合并为“已获得存档”。

**Architecture:** 保持现有单文件 HTML 架构，在 `云存档付费demo.html` 内增加独立的收银台状态、订单确认层和模拟支付层，复用现有存档与套餐数据。主界面和游戏中面板统一调用同一收银台函数；PRD 与截图在交互验证通过后同步。

**Tech Stack:** HTML、CSS、原生 JavaScript、Node.js、Playwright Core、Markdown。

---

## 文件结构

- Modify: `demos/充值与商城/云存档付费demo.html` — C 端页面、收银台、支付模拟和存档列表。
- Create: `tools/verify-cloud-save-checkout.mjs` — 自动验证购买、支付、权益与列表合并。
- Create: `tools/capture-cloud-save-checkout.mjs` — 生成 PRD 所需的新截图。
- Modify: `demos/【Prd】《盖世游戏》云存档付费需求/【Prd】《盖世游戏》云存档付费需求.md` — 更新 C 端交互和状态规则。
- Modify: `public/prd/cloud-save-monthly/01-save-plaza.png` — 无顶部套餐卡的存档广场。
- Modify: `public/prd/cloud-save-monthly/04-monthly-pass-detail.png` — 单一“购买”入口和订单确认页。
- Modify: `public/prd/cloud-save-monthly/06-monthly-pass-my-saves.png` — “已获得存档”与有效期。
- Modify: `public/prd/cloud-save-monthly/08-ingame-save-market.png` — 游戏中单一购买入口。
- Modify: `public/prd/cloud-save-monthly/09-ingame-my-saves.png` — 游戏中合并列表。
- Modify: `public/prd/cloud-save-monthly/10-monthly-pass-expired.png` — 到期存档保留和“续费后使用”。

### Task 1: 先写购买链路验收测试

**Files:**
- Create: `tools/verify-cloud-save-checkout.mjs`
- Test: `demos/充值与商城/云存档付费demo.html`

- [ ] **Step 1: 创建失败测试**

创建 `tools/verify-cloud-save-checkout.mjs`，完整内容：

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'demos', '充值与商城', '云存档付费demo.html');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);
assert(executablePath, 'Local Chrome not found');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
await page.goto(pathToFileURL(file).href);
await page.waitForSelector('#app');

assert.equal(await page.locator('#packageSlot').count(), 0, '存档广场仍保留顶部套餐卡容器');
assert.equal((await page.locator('#sec-plaza .sc-btn').first().innerText()).trim(), '购买');

await page.locator('#sec-plaza .sc-btn').first().click();
await page.waitForSelector('#checkoutLayer.show');
assert.equal(await page.locator('[data-checkout-plan="single"].selected').count(), 1, '普通购买未默认选择 ¥6');
assert.equal(await page.locator('[data-checkout-plan="monthly"]').count(), 1, '缺少 ¥18 月套餐');
assert.equal(await page.locator('[data-checkout-payment="alipay"]').count(), 1, '缺少支付宝');
assert.equal(await page.locator('[data-checkout-payment="wechat"]').count(), 1, '缺少微信支付');
assert((await page.locator('[data-action="checkout-confirm"]').innerText()).includes('¥6'));

await page.locator('[data-checkout-plan="monthly"]').click();
assert.equal(await page.locator('[data-checkout-plan="monthly"].selected').count(), 1);
assert((await page.locator('[data-action="checkout-confirm"]').innerText()).includes('¥18'));
await page.locator('[data-checkout-payment="wechat"]').click();
await page.locator('[data-action="checkout-confirm"]').click();
await page.waitForSelector('#paymentLayer.show');
assert((await page.locator('#paymentLayer').innerText()).includes('微信支付'));
assert((await page.locator('#paymentLayer').innerText()).includes('¥18'));

await page.locator('[data-action="payment-cancel"]').click();
assert.equal(await page.locator('#paymentLayer.show').count(), 0);
assert.equal(await page.locator('#checkoutLayer.show').count(), 1, '取消支付后未返回订单确认页');
assert.equal(await page.locator('[data-checkout-plan="monthly"].selected').count(), 1, '取消支付后方案丢失');

await page.locator('[data-action="checkout-confirm"]').click();
await page.locator('[data-action="payment-success"]').click();
assert.equal(await page.locator('#checkoutLayer.show').count(), 0);
assert.equal(await page.locator('#paymentLayer.show').count(), 0);

await page.locator('.stab').nth(1).click();
assert.equal(await page.locator('#sec-mine .status-card').count(), 0, '我的存档仍显示顶部套餐卡');
assert.equal(await page.locator('#sec-mine').getByText(/月度套餐有效至/).count(), 1, '未显示套餐有效期');
assert.equal(await page.locator('#sec-mine').getByText(/已获得存档/).count(), 1, '未合并存档分区');
assert.equal(await page.locator('#sec-mine').getByText(/月包存档/).count(), 0);
assert.equal(await page.locator('#sec-mine').getByText(/已购存档/).count(), 0);

await page.evaluate(() => window.CloudSaveDemo.setDemoState('expired'));
assert.equal(await page.locator('#sec-mine').getByText(/月度套餐已于/).count(), 1);
assert.equal(await page.locator('#sec-mine').getByText('续费后使用').count() > 0, true);

assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join(' | ')}`);
await browser.close();
console.log('PASS cloud save checkout');
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
node tools/verify-cloud-save-checkout.mjs
```

Expected: FAIL，首个失败为“存档广场仍显示顶部套餐卡”或找不到 `#checkoutLayer`。

- [ ] **Step 3: 提交测试**

```powershell
git add -- tools/verify-cloud-save-checkout.mjs
git commit -m "test: add cloud save checkout verification"
```

### Task 2: 实现租号式订单确认与支付层

**Files:**
- Modify: `demos/充值与商城/云存档付费demo.html:54-72`
- Modify: `demos/充值与商城/云存档付费demo.html:197-199`
- Modify: `demos/充值与商城/云存档付费demo.html:224-233`
- Modify: `demos/充值与商城/云存档付费demo.html:451-554`
- Test: `tools/verify-cloud-save-checkout.mjs`

- [ ] **Step 1: 增加收银台和支付层样式**

在现有弹窗样式后加入以下组件样式：

```css
.checkout-layer,.payment-layer{position:absolute;inset:0;z-index:420;display:none;background:rgba(0,0,0,.72);align-items:flex-end}
.checkout-layer.show,.payment-layer.show{display:flex}
.checkout-sheet{width:100%;max-height:92%;overflow-y:auto;background:#17181e;border-radius:22px 22px 0 0;padding:18px 16px 20px}
.checkout-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.checkout-save{display:flex;gap:10px;padding:12px;margin-top:12px;border:1px solid var(--border);border-radius:12px;background:var(--card)}
.checkout-save img{width:72px;height:48px;border-radius:8px;object-fit:cover}
.checkout-section{margin-top:16px}.checkout-section h4{font-size:12px;margin-bottom:8px}
.checkout-options{display:grid;gap:8px}
.checkout-option{padding:11px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:#fff;text-align:left;cursor:pointer}
.checkout-option.selected{border-color:var(--primary);background:rgba(212,180,115,.11)}
.checkout-option strong{display:flex;justify-content:space-between;font-size:12px}.checkout-option span{display:block;margin-top:5px;color:var(--sub);font-size:10px;line-height:1.5}
.payment-methods{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.payment-method{padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:#fff;cursor:pointer}
.payment-method.selected{border-color:var(--primary)}
.checkout-summary{margin-top:14px;padding-top:12px;border-top:1px solid var(--border);font-size:11px}
.checkout-total{display:flex;justify-content:space-between;align-items:end;margin-top:8px}.checkout-total strong{color:var(--primary);font-size:20px}
.checkout-confirm{width:100%;margin-top:14px;padding:12px;border:0;border-radius:12px;background:var(--primary);color:#171208;font-weight:bold;cursor:pointer}
.payment-dialog{width:82%;margin:auto;background:#1e1e24;border-radius:16px;padding:18px;text-align:center}
.payment-dialog .channel{font-size:14px;font-weight:bold}.payment-dialog .amount{font-size:26px;color:var(--primary);margin:14px 0}
.payment-actions{display:flex;gap:8px}.payment-actions button{flex:1;padding:10px;border:0;border-radius:10px;cursor:pointer}
```

- [ ] **Step 2: 增加两个独立容器**

在现有 `#modal` 后加入：

```html
<div class="checkout-layer" id="checkoutLayer"></div>
<div class="payment-layer" id="paymentLayer"></div>
```

- [ ] **Step 3: 增加收银台状态与入口函数**

在数据状态区加入：

```js
var checkoutState={saveId:null,source:'plaza',plan:'single',payment:'alipay',orderId:'',processing:false};
function openCheckout(saveId,options){
  var opts=options||{};
  curIdx=saveId;
  checkoutState.saveId=saveId;
  checkoutState.source=opts.source||'plaza';
  checkoutState.plan=opts.preferredPlan||'single';
  checkoutState.payment=checkoutState.payment||'alipay';
  checkoutState.orderId='';
  checkoutState.processing=false;
  renderCheckout();
  document.getElementById('checkoutLayer').classList.add('show');
}
function closeCheckout(){document.getElementById('checkoutLayer').classList.remove('show')}
```

- [ ] **Step 4: 渲染租号式订单确认页**

实现 `renderCheckout()`，要求输出以下稳定选择器：

```js
function renderCheckout(){
  var s=saves[checkoutState.saveId];
  var monthly=checkoutState.plan==='monthly';
  var amount=monthly?18:6;
  var title=monthly?'云存档月度套餐':'永久拥有当前存档';
  document.getElementById('checkoutLayer').innerHTML=
    '<section class="checkout-sheet" role="dialog" aria-modal="true">'+
      '<div class="checkout-head"><div><h3>确认订单</h3><p>选择购买方案并完成支付</p></div><button onclick="closeCheckout()">×</button></div>'+
      '<div class="checkout-save"><img src="'+s.cover+'"><div><strong>'+s.title+'</strong><span>GTA V · '+sourceLabel(s)+'</span></div></div>'+
      '<div class="checkout-section"><h4>购买方案</h4><div class="checkout-options">'+
        '<button class="checkout-option '+(!monthly?'selected':'')+'" data-checkout-plan="single" onclick="selectCheckoutPlan(\'single\')"><strong><b>永久拥有当前存档</b><em>¥6</em></strong><span>一次购买，永久使用当前存档</span></button>'+
        '<button class="checkout-option '+(monthly?'selected':'')+'" data-checkout-plan="monthly" onclick="selectCheckoutPlan(\'monthly\')"><strong><b>云存档月度套餐</b><em>¥18</em></strong><span>30 天内全部存档不限次使用 · 非自动续费</span></button>'+
      '</div></div>'+
      '<div class="checkout-section"><h4>支付方式</h4><div class="payment-methods">'+
        '<button class="payment-method '+(checkoutState.payment==='alipay'?'selected':'')+'" data-checkout-payment="alipay" onclick="selectCheckoutPayment(\'alipay\')">支付宝</button>'+
        '<button class="payment-method '+(checkoutState.payment==='wechat'?'selected':'')+'" data-checkout-payment="wechat" onclick="selectCheckoutPayment(\'wechat\')">微信支付</button>'+
      '</div></div>'+
      '<div class="checkout-summary"><div>商品：'+title+'</div><div class="checkout-total"><span>实付金额</span><strong>¥'+amount+'</strong></div></div>'+
      '<button class="checkout-confirm" data-action="checkout-confirm" onclick="launchCheckoutPayment()">确认支付 · ¥'+amount+'</button>'+
    '</section>';
}
function selectCheckoutPlan(plan){checkoutState.plan=plan;renderCheckout()}
function selectCheckoutPayment(payment){checkoutState.payment=payment;renderCheckout()}
```

- [ ] **Step 5: 点击确认支付后拉起支付层**

实现支付创建、取消和成功：

```js
function launchCheckoutPayment(){
  if(checkoutState.processing)return;
  checkoutState.processing=true;
  if(!checkoutState.orderId)checkoutState.orderId='SAVE-'+Date.now();
  var amount=checkoutState.plan==='monthly'?18:6;
  var channel=checkoutState.payment==='wechat'?'微信支付':'支付宝';
  document.getElementById('paymentLayer').innerHTML=
    '<section class="payment-dialog" role="dialog" aria-modal="true">'+
      '<div class="channel">'+channel+'</div><div class="amount">¥'+amount+'</div>'+
      '<p>'+(checkoutState.plan==='monthly'?'云存档月度套餐':'永久拥有当前存档')+'</p>'+
      '<div class="payment-actions"><button data-action="payment-cancel" onclick="cancelCheckoutPayment()">取消支付</button><button data-action="payment-success" onclick="completeCheckoutPayment()">模拟支付成功</button></div>'+
    '</section>';
  document.getElementById('paymentLayer').classList.add('show');
}
function cancelCheckoutPayment(){
  checkoutState.processing=false;
  document.getElementById('paymentLayer').classList.remove('show');
}
function completeCheckoutPayment(){
  document.getElementById('paymentLayer').classList.remove('show');
  if(checkoutState.plan==='monthly')confirmPackagePurchaseFromCheckout();
  else confirmPermanentPurchaseFromCheckout();
  closeCheckout();
}
```

- [ ] **Step 6: 将权益发放从旧通用弹窗中拆出**

实现：

```js
function confirmPermanentPurchaseFromCheckout(){
  bought.add(checkoutState.saveId);
  saves[checkoutState.saveId].buyers++;
  refreshAll();
  showToast('购买成功，已永久拥有此存档');
}
function confirmPackagePurchaseFromCheckout(){
  pendingPackageMode=getPackageState()==='none'?'buy':'renew';
  confirmPackagePurchase();
}
```

删除 `doBuy()` 对旧“确认永久购买”弹窗的依赖；将它改为：

```js
function doBuy(){openCheckout(curIdx,{preferredPlan:'single',source:currentDetailType==='system'?'detail':'plaza'})}
```

- [ ] **Step 7: 运行测试**

```powershell
node tools/verify-cloud-save-checkout.mjs
```

Expected: 测试继续在顶部套餐卡或存档分区合并断言处失败，收银台相关断言通过。

- [ ] **Step 8: 提交收银台**

```powershell
git add -- demos/充值与商城/云存档付费demo.html tools/verify-cloud-save-checkout.mjs
git commit -m "feat: add rental-style cloud save checkout"
```

### Task 3: 收敛购买入口并合并“已获得存档”

**Files:**
- Modify: `demos/充值与商城/云存档付费demo.html:269-365`
- Modify: `demos/充值与商城/云存档付费demo.html:390-444`
- Modify: `demos/充值与商城/云存档付费demo.html:640-721`
- Test: `tools/verify-cloud-save-checkout.mjs`

- [ ] **Step 1: 移除顶部销售卡**

- 从页面结构删除 `#packageSlot`，同时删除 `renderPackageCard()` 及相关调用，避免空容器继续占据首屏空间。
- 删除不再使用的 `.package-slot`、`.package-card`、`.package-main`、`.package-side`、`.package-promo`、`.package-name`、`.package-copy`、`.package-price` 和 `.package-action` 样式。
- 将 `refreshAll()` 改为只调用 `renderPlaza()`、`renderMine()` 和游戏中面板渲染。
- `renderIgPlaza()`、`renderIgMine()` 不再拼接 `renderIgPackageStatus()`。

- [ ] **Step 2: 所有无权益入口只显示“购买”**

将存档广场无权益按钮改为：

```js
btn='<button class="sc-btn buy" onclick="event.stopPropagation();openCheckout('+i+',{preferredPlan:\'single\',source:\'plaza\'})">购买</button>';
```

将无权益详情页底部改为：

```js
footer.innerHTML='<div class="tip">可选择永久购买或 30 天月度套餐</div><button class="d-buy" onclick="openCheckout('+idx+',{preferredPlan:\'single\',source:\'detail\'})">购买</button>';
```

将到期状态改为单按钮：

```js
footer.innerHTML='<div class="tip">月度套餐已到期，本地游戏进度不受影响</div><button class="d-buy" onclick="openCheckout('+idx+',{preferredPlan:\'monthly\',source:\'expired\'})">续费后使用</button>';
```

游戏中面板使用相同的 `openCheckout()`，不再并列显示 ¥6/¥18。

- [ ] **Step 3: 合并主页面存档集合**

增加：

```js
function getAcquiredSaveIds(){
  return Array.from(new Set([].concat(Array.from(bought),Array.from(monthlySaveIds))));
}
function getAcquiredLabel(idx){
  if(bought.has(idx))return'永久拥有';
  return canUseByPackage()?'套餐可用':'套餐已到期';
}
function getPackageStatusLine(){
  var state=getPackageState(),cycle=getActiveCycle(),future=getFutureCycle();
  if(state==='none'&&!cycle&&!monthlySaveIds.size)return'';
  var end=future?future.endAt:cycle?cycle.endAt:getLastEndedCycle().endAt;
  if(isActivePackageState(state))return state.indexOf('expiring')===0?'月度套餐将于 '+formatDateTime(end)+' 到期':'月度套餐有效至 '+formatDateTime(end);
  return'月度套餐已于 '+formatDateTime(end)+' 到期';
}
```

`renderMine()` 在本地存档后只渲染一个分区：

```js
var acquiredIds=getAcquiredSaveIds();
h+='<div class="section-label">已获得存档（'+acquiredIds.length+'）</div>';
var packageLine=getPackageStatusLine();
if(packageLine)h+='<div class="package-status-line">'+packageLine+'</div>';
h+='<div class="save-grid">';
```

每张卡显示 `getAcquiredLabel(idx)`；永久权益优先；套餐到期时按钮为“续费后使用”并调用 `openCheckout(idx,{preferredPlan:'monthly',source:'mine-expired'})`。

- [ ] **Step 4: 合并游戏中“我的存档”**

`renderIgMine()` 使用 `getAcquiredSaveIds()`，标题改为“已获得存档”，复用同一标签优先级和到期操作；删除“月包存档”“已购存档”两段。

- [ ] **Step 5: 暴露测试 API**

在脚本末尾加入：

```js
window.CloudSaveDemo={
  setDemoState:setDemoState,
  openCheckout:openCheckout,
  getCheckoutState:function(){return Object.assign({},checkoutState)}
};
```

- [ ] **Step 6: 运行测试**

```powershell
node tools/verify-cloud-save-checkout.mjs
```

Expected: `PASS cloud save checkout`。

- [ ] **Step 7: 提交列表与入口调整**

```powershell
git add -- demos/充值与商城/云存档付费demo.html tools/verify-cloud-save-checkout.mjs
git commit -m "feat: merge acquired cloud saves and remove pass card"
```

### Task 4: 更新 PRD 规则

**Files:**
- Modify: `demos/【Prd】《盖世游戏》云存档付费需求/【Prd】《盖世游戏》云存档付费需求.md`
- Test: `tools/verify-cloud-save-checkout.mjs`

- [ ] **Step 1: 追加版本记录**

在版本表追加：

```markdown
|2026.07.28|V1.3|产品组|购买改为租号式订单确认页；默认 ¥6，支持切换 ¥18 月套餐、支付宝/微信支付与支付拉起；移除顶部套餐卡；合并“已获得存档”并展示套餐有效期|C 端购买与存档展示调整|
```

- [ ] **Step 2: 替换存档广场和详情说明**

将 C 端表格对应说明明确改为：

```markdown
- **顶部套餐卡**：移除，不提供独立“开通套餐”入口
- **无权益按钮**：卡片、详情页和游戏中面板统一显示“购买”
- **购买交互**：点击“购买” → 打开租号式订单确认页 → 默认选中 ¥6 永久购买 → 可切换 ¥18/30 天月度套餐 → 选择支付宝或微信支付 → 点击“确认支付” → 拉起所选支付渠道
- **支付取消**：返回订单确认页并保留方案和支付方式
```

- [ ] **Step 3: 替换“我的存档”说明**

写入：

```markdown
- 删除独立“月包存档”和“已购存档”，合并为“已获得存档”
- 同一存档只显示一次，优先级为：永久拥有 > 套餐可用 > 套餐已到期
- 月套餐有效时显示“月度套餐有效至 YYYY-MM-DD HH:mm”；剩余不超过 3 天显示“将于…到期”；到期显示“已于…到期”
- 套餐到期后存档继续保留，按钮显示“续费后使用”
```

- [ ] **Step 4: 更新支付异常说明**

补充支付失败、取消、结果未知、重复回调、重复点击和横竖屏状态保持，且删除“通用确认弹窗直接发放权益”的旧描述。

- [ ] **Step 5: 检查矛盾**

```powershell
rg -n "顶部套餐|开通套餐|月包存档|已购存档|默认选中|支付宝|微信支付|确认支付" "demos/【Prd】《盖世游戏》云存档付费需求/【Prd】《盖世游戏》云存档付费需求.md"
```

Expected: 旧规则仅出现在版本历史或“移除/删除”说明中；正文不再要求顶部套餐卡或独立月包分区。

- [ ] **Step 6: 提交 PRD 文本**

```powershell
git add -- "demos/【Prd】《盖世游戏》云存档付费需求/【Prd】《盖世游戏》云存档付费需求.md"
git commit -m "docs: update cloud save checkout requirements"
```

### Task 5: 生成并审查 PRD 截图

**Files:**
- Create: `tools/capture-cloud-save-checkout.mjs`
- Modify: `public/prd/cloud-save-monthly/01-save-plaza.png`
- Modify: `public/prd/cloud-save-monthly/04-monthly-pass-detail.png`
- Modify: `public/prd/cloud-save-monthly/06-monthly-pass-my-saves.png`
- Modify: `public/prd/cloud-save-monthly/08-ingame-save-market.png`
- Modify: `public/prd/cloud-save-monthly/09-ingame-my-saves.png`
- Modify: `public/prd/cloud-save-monthly/10-monthly-pass-expired.png`

- [ ] **Step 1: 创建截图脚本**

`tools/capture-cloud-save-checkout.mjs` 复用验证脚本的 Chrome 查找方式，按以下状态截图：

```js
const shots = [
  ['01-save-plaza.png', async page => {}],
  ['04-monthly-pass-detail.png', async page => {
    await page.locator('#sec-plaza .sc-btn').first().click();
  }],
  ['06-monthly-pass-my-saves.png', async page => {
    await page.evaluate(() => window.CloudSaveDemo.setDemoState('active'));
    await page.locator('.stab').nth(1).click();
  }],
  ['08-ingame-save-market.png', async page => {
    await page.getByRole('button', { name: /游戏中模式/ }).click();
  }],
  ['09-ingame-my-saves.png', async page => {
    await page.getByRole('button', { name: /游戏中模式/ }).click();
    await page.locator('.ig-tab').nth(1).click();
  }],
  ['10-monthly-pass-expired.png', async page => {
    await page.evaluate(() => window.CloudSaveDemo.setDemoState('expired'));
    await page.locator('.stab').nth(1).click();
  }],
];
```

每个状态重新载入页面，执行动作后截取 `#app`，输出到 `public/prd/cloud-save-monthly/`。

- [ ] **Step 2: 执行截图**

```powershell
node tools/capture-cloud-save-checkout.mjs
```

Expected: 六张 PNG 均存在且文件大小大于 10 KB。

- [ ] **Step 3: 人工检查**

使用 `view_image` 逐张检查：

- 无顶部套餐销售卡。
- 订单确认页默认选择 ¥6。
- 支付宝、微信支付和“确认支付 · ¥6”完整可见。
- “已获得存档”和有效期没有重叠。
- 到期卡片仍存在并显示“续费后使用”。
- 游戏中面板没有双购买按钮。

- [ ] **Step 4: 提交截图和脚本**

```powershell
git add -- tools/capture-cloud-save-checkout.mjs public/prd/cloud-save-monthly
git commit -m "docs: refresh cloud save checkout screenshots"
```

### Task 6: 发布并替换固定图片地址

**Files:**
- Modify: `demos/充值与商城/云存档付费demo.html`
- Modify: `public/prd/cloud-save-monthly/*.png`
- Modify: `demos/【Prd】《盖世游戏》云存档付费需求/【Prd】《盖世游戏》云存档付费需求.md`

- [ ] **Step 1: 发布权限检查**

如果用户尚未明确授权推送 Git，说明仅推送本次云存档 Demo 和六张截图，并等待确认。不得带入当前工作区其他修改。

- [ ] **Step 2: 使用干净 worktree 发布**

基于最新 `refs/remotes/origin/master` 创建独立 worktree，只复制：

```text
demos/充值与商城/云存档付费demo.html
public/prd/cloud-save-monthly/01-save-plaza.png
public/prd/cloud-save-monthly/04-monthly-pass-detail.png
public/prd/cloud-save-monthly/06-monthly-pass-my-saves.png
public/prd/cloud-save-monthly/08-ingame-save-market.png
public/prd/cloud-save-monthly/09-ingame-my-saves.png
public/prd/cloud-save-monthly/10-monthly-pass-expired.png
```

提交并推送到 `origin/master`。

- [ ] **Step 3: 替换 PRD 图片地址**

推送完成后执行：

```powershell
$assetCommit = git -C $publishPath rev-parse HEAD
$imageUrl = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$assetCommit/public/prd/cloud-save-monthly/01-save-plaza.png"
```

把 `$imageUrl` 写入对应 Markdown 图片语法，并用同一 `$assetCommit` 生成其余五张图的地址。同批六张图必须使用同一个提交 SHA，不使用本地相对路径、分支名或旧提交。

- [ ] **Step 4: 逐张远程验证**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-images.ps1" -PrdPath "demos\【Prd】《盖世游戏》云存档付费需求\【Prd】《盖世游戏》云存档付费需求.md" -VerifyRemote
```

Expected: 图片总数与远程通过数相等，`Errors` 为空。

### Task 7: 最终验收

**Files:**
- Test: `demos/充值与商城/云存档付费demo.html`
- Test: `tools/verify-cloud-save-checkout.mjs`
- Test: `demos/【Prd】《盖世游戏》云存档付费需求/【Prd】《盖世游戏》云存档付费需求.md`

- [ ] **Step 1: 自动交互验收**

```powershell
node tools/verify-cloud-save-checkout.mjs
```

Expected: `PASS cloud save checkout`。

- [ ] **Step 2: 静态规则检查**

```powershell
rg -n "¥6 购买|¥6 永久购买</button>.*¥18|月包存档（|已购存档（|package-card" "demos/充值与商城/云存档付费demo.html"
```

Expected: 不存在旧的双购买按钮、独立月包/已购分区或顶部套餐卡渲染。

- [ ] **Step 3: 浏览器手动路径**

依次验证：

1. 普通购买默认 ¥6。
2. 切换 ¥18 后金额和权益同步。
3. 支付宝/微信切换。
4. 确认支付后才拉起支付弹窗。
5. 取消支付保留选择。
6. ¥6 成功后显示“永久拥有”。
7. ¥18 成功后显示有效期和“套餐可用”。
8. 到期后卡片保留并显示“续费后使用”。
9. 游戏中面板复用同一购买链路。

- [ ] **Step 4: 最终提交**

仅暂存本计划涉及文件，检查后提交：

```powershell
git add -- "demos/充值与商城/云存档付费demo.html" "demos/【Prd】《盖世游戏》云存档付费需求/【Prd】《盖世游戏》云存档付费需求.md" tools/verify-cloud-save-checkout.mjs tools/capture-cloud-save-checkout.mjs public/prd/cloud-save-monthly
git diff --cached --name-only
git commit -m "feat: complete cloud save checkout and entitlement merge"
```

Expected: 暂存区不包含其他项目文件；提交完成后目标文件无未提交修改。

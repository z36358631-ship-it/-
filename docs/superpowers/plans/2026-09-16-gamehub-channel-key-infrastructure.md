# GameHub Channel Key Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将渠道分销 Demo 从不可验证的销售结算模型改为真实的 CDKEY 生成、交付、兑换和审计模型。

**Architecture:** 保留单游戏控制台已有路由和离线单文件构建方式，继续使用 `channel-supply` 与 `channel-revenue` 内部 section ID 兼容旧状态，但把对外名称改为“渠道与供货／分销数据”。渠道页使用 `supplyTab` 管理横向子 Tab；运行时只持久化 Key 指纹和审计数据，不持久化明文 Key。帮助中心三份数据源保持相同文章 ID。

**Tech Stack:** 原生 JavaScript、CSS、JSON fixture、Node.js 单文件构建、Playwright 浏览器测试、Node test runner。

---

## 文件职责

- `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`：渠道状态、横向子 Tab、渠道列表、文件批次和分销数据渲染。
- `demos/开发者后台一期/src/runtime/app.js`：渠道交互、文件生成下载、暂停恢复、停止合作和持久化清洗。
- `demos/开发者后台一期/src/runtime/templates.js`：单游戏控制台左侧入口名称和搜索词。
- `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`：横向子 Tab、精简页头、表格和移动端布局。
- `demos/开发者后台一期/src/fixtures.json`：中英文帮助文章及中文兜底。
- `tests/developer-backend/publisher-channel-integration.browser.test.mjs`：业务、交互、下载、安全和响应式回归。
- `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`：构建后的离线单文件 Demo。
- `tests/developer-backend/evidence/gamehub-channel-key-infrastructure/`：本轮视觉证据。

### Task 1: 先锁定新的信息架构和数据口径

**Files:**
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 将入口和子 Tab 写成失败用例**

```js
test('渠道模块只保留渠道与供货和分销数据，供货页使用横向子 Tab',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);
  const sidebar=page.locator('.publisher-game-nav');
  for(const label of ['渠道与供货','分销数据']) await sidebar.getByRole('button',{name:label,exact:true}).waitFor();
  assert.equal(await sidebar.getByRole('button',{name:'销售与收益',exact:true}).count(),0);
  await openSection(page,'渠道与供货');
  const tabs=page.getByRole('tablist',{name:'渠道与供货'});
  await tabs.getByRole('tab',{name:'渠道管理',exact:true}).waitFor();
  await tabs.getByRole('tab',{name:'文件批次',exact:true}).waitFor();
  assert.equal(await page.getByText('按渠道管理销售项、供货方式和合作状态。',{exact:true}).count(),0);
  assert.equal(await page.getByText('企业认证通过后可直接创建渠道',{exact:true}).count(),0);
  await page.close();
});
```

- [ ] **Step 2: 将分销数据字段写成失败用例**

```js
test('分销数据只展示平台可验证的 Key 数据',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);
  await openSection(page,'分销数据');
  for(const value of ['发放量','兑换量','未兑换量','兑换率']) await page.getByText(value,{exact:true}).first().waitFor();
  const table=page.locator('.publisher-channel-table--distribution');
  for(const heading of ['渠道','销售项','商品名称','SKU','供货方式','发放量','兑换量','未兑换量','兑换率','最近兑换时间']) {
    await table.getByRole('columnheader',{name:heading,exact:true}).waitFor();
  }
  const body=await page.locator('.publisher-channel').innerText();
  for(const removed of ['销售额','预估收益','退款量','拒付量','导入销售清单']) assert.doesNotMatch(body,new RegExp(removed));
  await page.close();
});
```

- [ ] **Step 3: 运行两条测试并确认失败**

Run:

```powershell
node --test --test-name-pattern="横向子 Tab|平台可验证" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: FAIL，页面仍显示“销售与收益”，且没有“渠道管理／文件批次”子 Tab。

- [ ] **Step 4: 提交测试基线**

```powershell
git add -- "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
git commit -m "test: define channel key infrastructure views"
```

### Task 2: 重写渠道页面渲染

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/templates.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 把 `supplyTab` 加入规范化状态**

```js
const createState = value => {
  const source=value&&typeof value==='object'?value:{};
  const {sales,salesEvents,...rest}=copy(source);
  return {
    ...copy(fixture),
    ...rest,
    supplyTab:['channels','batches'].includes(source.supplyTab)?source.supplyTab:'channels',
    channels:Array.isArray(source.channels)?copy(source.channels):copy(fixture.channels),
    fileBatches:Array.isArray(source.fileBatches)?copy(source.fileBatches):copy(fixture.fileBatches),
    downloads:Array.isArray(source.downloads)?copy(source.downloads):copy(fixture.downloads),
    keyMetrics:Array.isArray(source.keyMetrics)?copy(source.keyMetrics):copy(fixture.keyMetrics),
  };
};
```

从 fixture 和状态中删除 `sales`、`salesEvents`、币种、销售额、退款、拒付和预估收益字段。新增 `keyMetrics`，每项固定包含 `channelId`、`skuId`、`issued`、`redeemed`、`lastRedeemedAt`，避免把渠道汇总量重复到多个 SKU。

- [ ] **Step 2: 新增横向子 Tab 渲染器**

```js
const supplyTabs=(language,active)=>`<nav class="publisher-channel-subtabs" role="tablist" aria-label="${tx(language,'渠道与供货','Channels & supply')}">
  <button type="button" role="tab" aria-selected="${active==='channels'}" class="${active==='channels'?'is-active':''}" data-portal-action="channel-supply-tab" data-channel-supply-tab="channels">${tx(language,'渠道管理','Channel management')}</button>
  <button type="button" role="tab" aria-selected="${active==='batches'}" class="${active==='batches'?'is-active':''}" data-portal-action="channel-supply-tab" data-channel-supply-tab="batches">${tx(language,'文件批次','File batches')}</button>
</nav>`;
```

渠道管理只渲染渠道列表；文件批次只渲染批次列表。两个列表不再同时堆在一页。

- [ ] **Step 3: 精简渠道管理列表**

```js
const channelRows=state.channels.map(channel=>{
  const partnership=channelStatusMeta(language,channel.status);
  const supply=channel.delivery==='api'?credentialStatusMeta(language,channel.credentialStatus):[tx(language,'文件批次','File batches'),'neutral'];
  const productLabels=channel.productIds.map(id=>productById(id)[language==='en'?'labelEn':'label']);
  const latestDownloaded=state.downloads.filter(item=>item.channelId===channel.id).sort((a,b)=>String(b.downloadedAt).localeCompare(String(a.downloadedAt)))[0];
  const supplyState=channel.delivery==='file'&&latestDownloaded?status(tx(language,'已下载','Downloaded'),'success'):status(supply[0],supply[1]);
  return [
    `<span class="publisher-channel-row-title"><strong>${e(channel.name)}</strong><small>${e(channel.id)}</small></span>`,
    `<span class="publisher-channel-product-list">${productLabels.map(label=>`<span>${e(label)}</span>`).join('')}</span>`,
    e(channel.delivery==='api'?tx(language,'接口自动发码','Automatic Key API'):tx(language,'下载兑换码文件','Download Key file')),
    status(partnership[0],partnership[1]),
    supplyState,
    e(channel.lastDeliveredAt||'—'),
    renderChannelActions(language,channel,state),
  ];
});
```

表头固定为“渠道名称／编号、销售项、供货方式、合作状态、API或文件状态、最近供货时间、操作”。移除页级副标题、蓝色说明条、渠道数和发放/销售/兑换卡片、列表说明。

- [ ] **Step 4: 用分销数据替代销售收益渲染器**

```js
const distributionRow=item=>{
  const channel=channelById(state,item.channelId);
  const product=productById(item.skuId);
  const issued=Number(item.issued||0);
  const redeemed=Number(item.redeemed||0);
  const unredeemed=Math.max(issued-redeemed,0);
  const rate=issued?`${(redeemed/issued*100).toFixed(1)}%`:'—';
  const productType=product.type==='dlc'?'DLC':tx(language,'本体','Base game');
  const productName=language==='en'?(product.nameEn||product.name):product.name;
  const delivery=channel.delivery==='api'?tx(language,'接口自动发码','Automatic Key API'):tx(language,'下载兑换码文件','Download Key file');
  return [
    `<span class="publisher-channel-row-title"><strong>${e(channel.name)}</strong><small>${e(channel.id)}</small></span>`,
    e(productType),e(productName),`<code>${e(product.id)}</code>`,e(delivery),
    formatNumber(issued),formatNumber(redeemed),formatNumber(unredeemed),rate,e(item.lastRedeemedAt||'—'),
  ];
};
const totals=state.keyMetrics.reduce((result,item)=>({issued:result.issued+Number(item.issued||0),redeemed:result.redeemed+Number(item.redeemed||0)}),{issued:0,redeemed:0});
const totalUnredeemed=Math.max(totals.issued-totals.redeemed,0);
const totalRate=totals.issued?`${(totals.redeemed/totals.issued*100).toFixed(1)}%`:'—';
const metricCards=`<div class="publisher-channel-metrics">${metric(tx(language,'发放量','Issued'),formatNumber(totals.issued))}${metric(tx(language,'兑换量','Redeemed'),formatNumber(totals.redeemed))}${metric(tx(language,'未兑换量','Unredeemed'),formatNumber(totalUnredeemed))}${metric(tx(language,'兑换率','Redemption rate'),totalRate)}</div>`;
```

顶部只显示发放量、兑换量、未兑换量和兑换率。列表 class 使用 `publisher-channel-table--distribution`。标题操作区只保留“数据口径”帮助入口，不显示副标题或说明条。

- [ ] **Step 5: 更新左侧入口名称但保留内部 ID**

```js
const publisherChannelConsoleSections = [
  ['channel-supply','渠道与供货','key','渠道 供货 API 文件 Key 合作'],
  ['channel-revenue','分销数据','chart','渠道 Key 发放 兑换 未兑换 兑换率'],
];
```

英文映射将“分销数据”显示为 `Distribution data`。保留 `channel-revenue` 内部 ID，避免破坏已保存工作区状态。

- [ ] **Step 6: 运行信息架构测试**

Run:

```powershell
node --check "demos\开发者后台一期\src\runtime\publisher-channel-distribution.js"
node --check "demos\开发者后台一期\src\runtime\templates.js"
node --test --test-name-pattern="渠道模块只保留|分销数据只展示" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: PASS。

- [ ] **Step 7: 提交页面结构**

```powershell
git add -- "demos/开发者后台一期/src/runtime/publisher-channel-distribution.js" "demos/开发者后台一期/src/runtime/templates.js" "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
git commit -m "feat: simplify channel supply and distribution data"
```

### Task 3: 完成横向子 Tab 和精简响应式样式

**Files:**
- Modify: `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 增加子 Tab 的桌面和移动端样式**

```css
.publisher-channel-subtabs{display:flex;gap:28px;min-width:0;border-bottom:1px solid var(--line)}
.publisher-channel-subtabs button{position:relative;padding:0 2px 12px;border:0;background:transparent;color:var(--text-secondary);font-weight:600;cursor:pointer}
.publisher-channel-subtabs button.is-active{color:var(--text-primary)}
.publisher-channel-subtabs button.is-active::after{content:"";position:absolute;right:0;bottom:-1px;left:0;height:2px;border-radius:2px;background:var(--brand)}
.publisher-channel-subtabs button:focus-visible{outline:3px solid rgba(57,118,217,.22);outline-offset:3px}
@media(max-width:620px){
  .publisher-channel-subtabs{gap:22px;overflow-x:auto;scrollbar-width:none}
  .publisher-channel-subtabs::-webkit-scrollbar{display:none}
  .publisher-channel-subtabs button{flex:0 0 auto}
}
```

- [ ] **Step 2: 删除不再使用的说明样式**

删除 `.publisher-channel-head p`、普通 `.publisher-channel-notice` 及 revenue filter/import control 的专用样式；保留弹窗内 `.publisher-channel-dialog__note.is-warning` 和 `.is-danger` 必要风险提示。最终页头和卡片标题样式为：

```css
.publisher-channel-head{display:flex;align-items:center;justify-content:space-between;gap:20px;min-width:0}
.publisher-channel-head>div:first-child{min-width:0}
.publisher-channel-head h1{margin:0;font-size:26px;line-height:1.2}
.publisher-channel-card{padding:20px;overflow:hidden}
.publisher-channel-card>header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}
.publisher-channel-card>header h2{margin:0;font-size:17px}
```

- [ ] **Step 3: 增加移动端子 Tab 回归**

```js
for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  await page.getByRole('tab',{name:'文件批次',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false);
  await page.getByRole('columnheader',{name:'批次编号',exact:true}).waitFor();
  await page.close();
}
```

- [ ] **Step 4: 运行响应式用例**

Run:

```powershell
node --test --test-name-pattern="宽度无根节点溢出|移动端子 Tab" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: PASS。

- [ ] **Step 5: 提交样式**

```powershell
git add -- "demos/开发者后台一期/src/styles/publisher-channel-distribution.css" "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
git commit -m "style: add responsive channel subtabs"
```

### Task 4: 将文件生成改为同步下载并修正文件语义

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 更新真实下载测试**

```js
test('文件渠道同步生成兑换码文件且不留下生成中状态',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
  await openGame(page);await openSection(page,'渠道与供货');
  await page.getByRole('tab',{name:'文件批次',exact:true}).click();
  await page.getByRole('button',{name:'渠道管理',exact:true}).click();
  const row=page.locator('tbody tr').filter({hasText:'ArcadeX 文件渠道'});
  await row.getByRole('button',{name:'创建文件',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建兑换码文件'});
  await dialog.getByLabel('生成数量').fill('12');
  const [download]=await Promise.all([page.waitForEvent('download'),dialog.getByRole('button',{name:'生成并下载',exact:true}).click()]);
  assert.match(download.suggestedFilename(),/^盖世游戏兑换码_ArcadeX文件渠道_FB-\d{8}-\d{4}\.csv$/);
  const csv=fs.readFileSync(await download.path(),'utf8');
  assert.equal(csv.trim().split(/\r?\n/).length,13);
  assert.match(csv,/^cdkey,sku_id,valid_until\r?\nGH26-/);
  await page.getByRole('tab',{name:'文件批次',exact:true}).click();
  assert.equal(await page.getByText('生成中',{exact:true}).count(),0);
  assert.match(await page.locator('tbody').innerText(),/已下载/);
  await page.close();
});
```

- [ ] **Step 2: 增加安全文件名函数并更新 CSV 表头**

```js
const safeFilePart=value=>String(value||'渠道').replace(/[\\/:*?"<>|\s]+/g,'').slice(0,32)||'渠道';
const createKeyFile=async({quantity,skuId,validUntil})=>{
  const keys=Array.from({length:quantity},createDemoKey);
  const content=['cdkey,sku_id,valid_until',...keys.map(key=>`${key},${skuId},${validUntil}`)].join('\r\n');
  const keyFingerprints=await Promise.all(keys.map(fingerprintKey));
  return {content,keyFingerprints};
};
```

- [ ] **Step 3: 删除持久化 `generating` 过程态**

`channel-file-generate` 点击后只在当前按钮显示加载态：

```js
const submit=event.currentTarget;
const idleLabel=submit.textContent;
submit.disabled=true;
submit.textContent='生成中…';
try{
  const generated=await createKeyFile({quantity,skuId,validUntil});
  const fileName=`盖世游戏兑换码_${safeFilePart(channel.name)}_${batchId}.csv`;
  downloadTextFile(fileName,generated.content,'text/csv;charset=utf-8');
  const downloadedAt=nowText();
  const nextBatch={id:batchId,channelId,skuId,quantity,validUntil,status:'downloaded',createdAt:retryBatch?.createdAt||downloadedAt,downloadedAt};
  updateChannelDistribution({
    ...current,
    dialog:'',dialogChannelId:'',dialogBatchId:'',
    fileBatches:retryBatch?current.fileBatches.map(item=>item.id===batchId?nextBatch:item):[nextBatch,...current.fileBatches],
    downloads:[...(current.downloads||[]),{id:`DL-${dateToken}-${String((current.downloads||[]).length+1).padStart(4,'0')}`,channelId,batchId,skuId,fileName,quantity,keyFingerprints:generated.keyFingerprints,downloadedAt,downloadedBy:'当前开发者',downloadCount:1}],
    keyMetrics:upsertKeyMetric(current.keyMetrics,{channelId,skuId,issuedDelta:quantity,lastDeliveredAt:downloadedAt}),
  });
}catch(error){
  const failedAt=nowText();
  const failedBatch={id:batchId,channelId,skuId,quantity,validUntil,status:'failed',createdAt:retryBatch?.createdAt||failedAt,failureReason:error?.message||'文件生成失败，请重试'};
  updateChannelDistribution({
    ...current,
    dialog:'file-create',dialogChannelId:channelId,dialogBatchId:batchId,
    fileBatches:retryBatch?current.fileBatches.map(item=>item.id===batchId?failedBatch:item):[failedBatch,...current.fileBatches],
  });
  resultMessage(route.id,'文件生成失败',failedBatch.failureReason,'danger');
}
```

在同一任务内定义增量函数：

```js
const upsertKeyMetric=(items=[],change)=>{
  const found=items.find(item=>item.channelId===change.channelId&&item.skuId===change.skuId);
  if(!found) return [...items,{channelId:change.channelId,skuId:change.skuId,issued:Number(change.issuedDelta||0),redeemed:0,lastDeliveredAt:change.lastDeliveredAt,lastRedeemedAt:''}];
  return items.map(item=>item===found?{...item,issued:Number(item.issued||0)+Number(change.issuedDelta||0),lastDeliveredAt:change.lastDeliveredAt}:item);
};
```

失败批次仍保留原 `skuId`、`quantity`、`validUntil` 和 `failureReason`。默认 fixture 删除 `generating` 批次。

- [ ] **Step 4: 删除异步批次遗留状态**

从 fixture、`fileStatusMeta()` 和操作分支删除 `generating`、`ready`；删除 `channel-file-download` 和 `channel-file-cancel` 处理。当前 Demo 只保留 `downloaded`、`cancelled`、`expired`、`failed` 历史状态，新操作只会产生 `downloaded` 或 `failed`。

- [ ] **Step 5: 运行下载和安全用例**

Run:

```powershell
node --check "demos\开发者后台一期\src\runtime\app.js"
node --test --test-name-pattern="同步生成兑换码文件|静态交付文件" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: PASS；HTML 和持久化状态仍无固定明文 Key 或 Secret。

- [ ] **Step 6: 提交文件交付**

```powershell
git add -- "demos/开发者后台一期/src/runtime/app.js" "demos/开发者后台一期/src/runtime/publisher-channel-distribution.js" "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
git commit -m "feat: download clearly named key files synchronously"
```

### Task 5: 删除销售导入与结算状态机

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 写入禁止旧口径的回归测试**

```js
test('渠道业务不包含销售回传和清算能力',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);
  await openSection(page,'分销数据');
  const html=await page.locator('.publisher-channel').innerText();
  for(const removed of ['销售与收益','导入销售清单','退款','拒付','预估收益','清算中','30 个自然日']) assert.doesNotMatch(html,new RegExp(removed));
  assert.equal(await page.locator('[data-channel-sales-file],[data-channel-sales-target]').count(),0);
  await page.close();
});
```

- [ ] **Step 2: 删除销售状态与事件监听**

从 `app.js` 删除：

- `aggregateChannelSales()`。
- `channel-sales-import` 点击处理。
- `[data-channel-sales-file]` change 监听。
- `salesEvents` 的持久化和迁移。

持久化白名单增加 `keyMetrics`，每项只包含渠道、SKU、发放和兑换汇总，不包含明文 Key。

从 `publisher-channel-distribution.js` 删除 `sales`、`salesEvents`、`salesStatusMeta()`、文件渠道销售导入控件和销售聚合逻辑。

- [ ] **Step 3: 将停止合作改为直接停止**

```js
const nextChannel={
  ...channel,
  status:'stopped',
  stoppedAt:nowText(),
  credentialStatus:channel.delivery==='api'?'disabled':channel.credentialStatus,
};
const nextBatches=current.fileBatches||[];
```

删除 `clearingUntil`、30天清算和待补报/待调整字段。停止弹窗的汇总按 `keyMetrics` 计算：

```js
const keySummary=state.keyMetrics.filter(item=>item.channelId===channel.id).reduce((result,item)=>({issued:result.issued+Number(item.issued||0),redeemed:result.redeemed+Number(item.redeemed||0)}),{issued:0,redeemed:0});
const body=`<dl class="publisher-channel-summary">
  <div><dt>${tx(language,'已发放','Issued')}</dt><dd>${formatNumber(keySummary.issued)}</dd></div>
  <div><dt>${tx(language,'已兑换','Redeemed')}</dt><dd>${formatNumber(keySummary.redeemed)}</dd></div>
  <div><dt>${tx(language,'未兑换','Unredeemed')}</dt><dd>${formatNumber(Math.max(keySummary.issued-keySummary.redeemed,0))}</dd></div>
</dl><p class="publisher-channel-dialog__note is-warning">${tx(language,'停止后不再生成或发放新 Key；已下载 Key 不回库，仍按原有效期兑换。','Stopping blocks all new Key generation and issuance. Downloaded Keys do not return to inventory and remain redeemable until their original expiration date.')}</p><label class="publisher-channel-check"><input type="checkbox" data-channel-stop-ack><span>${tx(language,'我已了解停止合作后的影响','I understand the impact of stopping cooperation')}</span></label>`;
```

确认后状态直接为“已停止”。

- [ ] **Step 4: 更新合作状态枚举**

渠道状态只保留 `active`、`paused`、`stopped`、`risk_paused`。删除 fixture 和 UI 中的 `clearing` 示例。已停止渠道不显示管理接入、创建文件、暂停或恢复按钮。

- [ ] **Step 5: 运行渠道状态回归**

Run:

```powershell
node --test --test-name-pattern="不包含销售回传|停止合作" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: PASS；停止后无“清算中”。

- [ ] **Step 6: 提交业务边界调整**

```powershell
git add -- "demos/开发者后台一期/src/runtime/app.js" "demos/开发者后台一期/src/runtime/publisher-channel-distribution.js" "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
git commit -m "refactor: remove unsupported channel sales settlement"
```

### Task 6: 重写帮助中心三份数据源

**Files:**
- Modify: `demos/开发者后台一期/src/fixtures.json`
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 更新文章 ID 一致性测试**

```js
const ids=[
  'channel-distribution-overview',
  'channel-api-integration',
  'channel-api-reference',
  'channel-file-delivery',
  'channel-key-metrics',
  'channel-file-records',
  'channel-stop-delivery',
  'channel-responsibility-boundary',
];
for(const articles of [fixtures.managedContent.zh.help.faq,fixtures.managedContent.en.help.faq,fixtures.helpCenter.faq]){
  assert.deepEqual(articles.filter(item=>ids.includes(item.id)).map(item=>item.id),ids);
}
```

- [ ] **Step 2: 用新口径替换8篇文章**

中文标题固定为：

1. 渠道投放使用说明。
2. 接口自动发码接入指南。
3. API 鉴权、发码、查询与错误码。
4. 下载兑换码文件教程。
5. Key 状态与兑换数据口径。
6. 文件批次和下载记录说明。
7. 停止合作与已交付 Key 处理。
8. 三方责任与渠道结算边界。

英文托管内容使用相同 ID；中文 `helpCenter.faq` 同步兜底。删除销售事件、销售清单导入、渠道收益和30天清算文案。

中文托管内容和中文兜底使用以下完整对象：

```json
[
  {"id":"channel-distribution-overview","category":"发行与供给","question":"渠道投放使用说明","answer":"企业开发者可为外部渠道配置本体或 DLC，并通过 API 或兑换码文件交付 Key。","steps":["创建渠道并选择销售项。","选择一种供货方式；同一渠道不混用 API 和文件。","在分销数据查看发放、兑换、未兑换和兑换率。"]},
  {"id":"channel-api-integration","category":"发行与供给","question":"接口自动发码接入指南","answer":"接口渠道在需要 Key 时按渠道订单号请求，平台负责幂等、发码和结果查询。","steps":["创建接口渠道并生成 client_id 和一次性 Secret。","渠道用同一订单号重试；超时后先查询原订单。","凭证泄露时暂停渠道并轮换 Secret。"]},
  {"id":"channel-api-reference","category":"发行与供给","question":"API 鉴权、发码、查询与错误码","answer":"接口提供鉴权、按单发码和原订单查询；渠道订单号用于幂等，不代表平台确认销售。","steps":["发码请求提交 channel_id、channel_order_id、sku_id 和 request_id。","查询请求提交 channel_id 和原 channel_order_id。","凭证无效、重复订单异参、渠道暂停、SKU 无效、频控或风险限制时按错误码处理，不换订单号重复发码。"]},
  {"id":"channel-file-delivery","category":"发行与供给","question":"下载兑换码文件教程","answer":"文件渠道按销售项、数量和有效期同步生成兑换码文件，成功后立即下载。","steps":["在渠道管理为文件渠道选择创建文件。","填写销售项、数量和有效期。","点击生成并下载，文件名包含渠道名和批次号。"]},
  {"id":"channel-key-metrics","category":"发行与供给","question":"Key 状态与兑换数据口径","answer":"分销数据只展示平台可验证的发放和兑换结果，不推算渠道销量或收入。","steps":["发放量为 API 成功发码量加文件成功交付量。","未兑换量为发放量减兑换量，不代表渠道库存。","兑换率为兑换量除以发放量；发放量为零时显示“—”。"]},
  {"id":"channel-file-records","category":"发行与供给","question":"文件批次和下载记录说明","answer":"文件批次记录销售项、数量、有效期、结果、下载账号和时间；平台不在页面回显明文 Key。","steps":["已下载 Key 视为已交付，不回库也不重复分配。","生成失败保留原参数，可重新生成。","下载记录用于审计，不是结算表。"]},
  {"id":"channel-stop-delivery","category":"发行与供给","question":"停止合作与已交付 Key 处理","answer":"停止合作会立即关闭新发码和新文件，历史数据继续保留。","steps":["确认停止后 API 凭证立即停用。","未完成的生成操作不新增文件记录。","已下载 Key 不回库，仍按原有效期兑换。"]},
  {"id":"channel-responsibility-boundary","category":"发行与供给","question":"三方责任与渠道结算边界","answer":"盖世提供 Key 生成、交付、兑换和审计；开发者与渠道自行约定销售、售后和结算。","steps":["开发者负责选择渠道并约定价格和结算方式。","渠道负责终端销售、收款、退款、拒付和用户服务。","盖世不展示渠道销量、销售额、收益或结算结果。"]}
]
```

英文托管内容使用以下完整对象：

```json
[
  {"id":"channel-distribution-overview","category":"Publishing & supply","question":"Channel distribution guide","answer":"Enterprise developers can assign base games or DLC to external channels and deliver Keys through an API or a downloadable file.","steps":["Create a channel and select products.","Choose one supply method; a channel cannot mix API and file delivery.","Use Distribution data to review issued, redeemed, unredeemed, and redemption rate metrics."]},
  {"id":"channel-api-integration","category":"Publishing & supply","question":"Automatic Key API integration","answer":"API channels request a Key with a channel order ID. The platform provides idempotent issuance and order lookup.","steps":["Create an API channel and generate a client_id and one-time Secret.","Retry with the same order ID and query the original order after a timeout.","Pause the channel and rotate the Secret if credentials leak."]},
  {"id":"channel-api-reference","category":"Publishing & supply","question":"API authentication, issuance, lookup, and errors","answer":"The API supports authentication, per-order Key issuance, and original-order lookup. A channel order ID is for idempotency and is not a platform-confirmed sale.","steps":["Send channel_id, channel_order_id, sku_id, and request_id when issuing a Key.","Send channel_id and the original channel_order_id when querying.","Handle invalid credentials, mismatched duplicate orders, paused channels, invalid SKUs, rate limits, and risk restrictions by error code; never create a replacement order to retry."]},
  {"id":"channel-file-delivery","category":"Publishing & supply","question":"Download a Key file","answer":"File channels synchronously generate a Key file for a selected product, quantity, and expiration date, then download it immediately.","steps":["Open Create file for a file channel.","Choose the product, quantity, and expiration date.","Select Generate and download; the file name contains the channel name and batch ID."]},
  {"id":"channel-key-metrics","category":"Publishing & supply","question":"Key status and redemption metrics","answer":"Distribution data contains only verifiable issuance and redemption results. It does not estimate channel sales or revenue.","steps":["Issued equals successful API issuance plus successfully delivered file Keys.","Unredeemed equals issued minus redeemed and does not represent channel inventory.","Redemption rate equals redeemed divided by issued; show an em dash when issued is zero."]},
  {"id":"channel-file-records","category":"Publishing & supply","question":"File batches and download records","answer":"A file batch records product, quantity, expiration, result, downloading account, and time. Plaintext Keys are not displayed in the portal.","steps":["Downloaded Keys are delivered and cannot return to inventory or be allocated again.","A failed generation keeps its original parameters for retry.","A download record is an audit record, not a settlement statement."]},
  {"id":"channel-stop-delivery","category":"Publishing & supply","question":"Stop cooperation and handle delivered Keys","answer":"Stopping cooperation immediately blocks new issuance and new files while retaining historical records.","steps":["API credentials are disabled after confirmation.","Incomplete generation creates no file record.","Downloaded Keys do not return to inventory and remain redeemable until their original expiration date."]},
  {"id":"channel-responsibility-boundary","category":"Publishing & supply","question":"Responsibilities and settlement boundary","answer":"GameHub provides Key generation, delivery, redemption, and audit records. Developers and channels agree on sales, support, and settlement independently.","steps":["Developers select channels and agree on pricing and settlement.","Channels handle end-customer sales, payment, refunds, chargebacks, and support.","GameHub does not present channel sales, revenue, earnings, or settlement results."]}
]
```

- [ ] **Step 3: 更新帮助深链**

“分销数据”的“数据口径”打开 `channel-key-metrics`；停止合作弹窗的帮助入口打开 `channel-stop-delivery`；创建渠道的责任说明链接打开 `channel-responsibility-boundary`。

- [ ] **Step 4: 运行 JSON 与帮助中心测试**

Run:

```powershell
node -e "JSON.parse(require('fs').readFileSync('demos/开发者后台一期/src/fixtures.json','utf8')); console.log('fixtures ok')"
node --test --test-name-pattern="帮助中心|三份数据源" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: PASS，输出 `fixtures ok`。

- [ ] **Step 5: 提交帮助内容**

```powershell
git add -- "demos/开发者后台一期/src/fixtures.json" "demos/开发者后台一期/src/runtime/publisher-channel-distribution.js" "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
git commit -m "docs: align channel help with key infrastructure"
```

### Task 7: 更新视觉证据并完成全量回归

**Files:**
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`
- Create: `tests/developer-backend/evidence/gamehub-channel-key-infrastructure/*.png`
- Modify: `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`

- [ ] **Step 1: 输出新口径截图**

测试固定生成：

- `channel-management-1440.png`
- `channel-file-batches-1440.png`
- `channel-create-file-390.png`
- `channel-key-download-390.png`
- `channel-stop-1280.png`
- `channel-distribution-1440.png`
- `channel-distribution-320.png`
- `channel-help-boundary-390.png`

- [ ] **Step 2: 覆盖四种宽度**

```js
for(const width of [320,390,1280,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await openGame(page);
  for(const section of ['渠道与供货','分销数据']){
    await openSection(page,section);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,`${width}px ${section} 根节点溢出`);
  }
  await page.close();
}
```

- [ ] **Step 3: 重建离线 HTML**

Run:

```powershell
node "demos\开发者后台一期\build-developer-channel.mjs"
```

Expected: `Built 13-开发者平台与渠道分销demo.html with the committed stable data-dashboard runtime.`

- [ ] **Step 4: 运行完整回归**

Run:

```powershell
node --check "demos\开发者后台一期\src\runtime\publisher-channel-distribution.js"
node --check "demos\开发者后台一期\src\runtime\app.js"
node --test "tests\developer-backend\publisher-channel-integration.browser.test.mjs" "tests\developer-backend\publisher-access-policy.test.mjs" "tests\developer-backend\publisher-account-context.test.mjs"
```

Expected: 0 failures。

- [ ] **Step 5: 做静态边界检查**

Run:

```powershell
rg -n "销售与收益|导入销售清单|销售额|预估收益|退款量|拒付量|清算中|30 个自然日" "demos\开发者后台一期\src\runtime\publisher-channel-distribution.js"
rg -n "channel-sales-events|channel-sales-import|channel-revenue-metrics" "demos\开发者后台一期\src\fixtures.json"
rg -n "<script[^>]+src=|<iframe|sec_[0-9a-fA-F]{16,}|GH26-[A-Z0-9-]{10,}" "demos\开发者后台一期\13-开发者平台与渠道分销demo.html"
git diff --check -- "demos/开发者后台一期/src/runtime/publisher-channel-distribution.js" "demos/开发者后台一期/src/runtime/templates.js" "demos/开发者后台一期/src/runtime/app.js" "demos/开发者后台一期/src/styles/publisher-channel-distribution.css" "demos/开发者后台一期/src/fixtures.json" "demos/开发者后台一期/13-开发者平台与渠道分销demo.html" "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
```

Expected: 三条命令均无匹配或错误。

- [ ] **Step 6: 提交构建产物与视觉证据**

```powershell
git add -- "demos/开发者后台一期/13-开发者平台与渠道分销demo.html" "tests/developer-backend/publisher-channel-integration.browser.test.mjs" "tests/developer-backend/evidence/gamehub-channel-key-infrastructure"
git commit -m "test: verify channel key infrastructure demo"
```

## 最终验收

- `渠道与供货`只展示当前任务内容，并通过横向子 Tab 切换渠道管理和文件批次。
- `分销数据`只展示发放、兑换、未兑换和兑换率。
- 文件下载名称和内容明确为兑换码文件。
- 页面不存在无法验证的销售、收益和结算数据。
- 停止合作不再进入清算状态。
- 桌面端和手机端均无根节点溢出。
- 静态 HTML 不包含固定明文 Key、Secret、外部脚本或 iframe。

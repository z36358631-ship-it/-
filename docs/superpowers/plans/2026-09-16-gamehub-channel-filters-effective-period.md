# GameHub Channel Filters And Effective Period Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为渠道 Key 投放 Demo 增加可验证的渠道与时间筛选、渠道生效期、下载记录抽屉和单批 100,000 个 Key 上限。

**Architecture:** 继续沿用 `PublisherChannelDistribution` 的状态对象和原生 HTML 渲染，在 `channelDistribution` 中增加三组筛选状态和固定 Demo 基准日。渠道有效状态由原始合作状态与生效区间派生，并由同一辅助函数控制列表展示和供货门禁。文件交付仍是同步下载，仅将下载记录容器改为独立右侧抽屉。

**Tech Stack:** 原生 JavaScript、CSS、JSON fixture、Node.js 单文件构建、Playwright、Node test runner。

---

## 文件职责

- `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`：渠道、文件批次和分销数据的 fixture、筛选、时间状态与页面渲染。
- `demos/开发者后台一期/src/runtime/app.js`：筛选提交／重置、渠道创建、时间校验、供货门禁和文件数量校验。
- `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`：筛选条、时间字段、右侧抽屉及手机端全屏样式。
- `tests/developer-backend/publisher-channel-integration.browser.test.mjs`：数据口径、筛选、生效期、抽屉、文件上限和响应式回归。
- `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`：重新构建的离线单文件 Demo。
- `tests/developer-backend/evidence/gamehub-channel-key-infrastructure/*.png`：更新后的桌面端和手机端视觉证据。
- `prd/workflow-state/LOCAL-20260901-developer-backend-prd.md`：同步本轮已确认的产品口径。

### Task 1: 用失败用例锁定筛选、时间和展示口径

**Files:**
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 更新分销数据列并增加默认近 30 天断言**

```js
test('分销数据默认近 30 天且不重复商品和最近兑换列',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'分销数据');
  assert.equal(await page.getByLabel('Key 发放开始日期').inputValue(),'2026-08-18');
  assert.equal(await page.getByLabel('Key 发放结束日期').inputValue(),'2026-09-16');
  const table=page.locator('.publisher-channel-table--distribution');
  for(const heading of ['渠道','销售项','SKU','供货方式','发放量','兑换量','未兑换量','兑换率']) await table.getByRole('columnheader',{name:heading,exact:true}).waitFor();
  assert.equal(await table.getByRole('columnheader',{name:'商品名称',exact:true}).count(),0);
  assert.equal(await table.getByRole('columnheader',{name:'最近兑换时间',exact:true}).count(),0);
  await page.close();
});
```

- [ ] **Step 2: 增加渠道、批次和分销数据筛选用例**

```js
test('三个列表按渠道和各自时间口径筛选',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  await page.getByLabel('渠道名称或编号').fill('CH-240902');
  await page.getByRole('button',{name:'查询',exact:true}).click();
  assert.match(await page.locator('.publisher-channel-table--channels tbody').innerText(),/ArcadeX 文件渠道/);
  assert.doesNotMatch(await page.locator('.publisher-channel-table--channels tbody').innerText(),/NovaPlay Store/);
  await page.getByRole('tab',{name:'文件批次',exact:true}).click();
  await page.getByLabel('渠道名称或编号').fill('ArcadeX');
  await page.getByLabel('创建开始日期').fill('2026-09-10');
  await page.getByLabel('创建结束日期').fill('2026-09-12');
  await page.getByRole('button',{name:'查询',exact:true}).click();
  assert.match(await page.locator('.publisher-channel-table--batches tbody').innerText(),/FB-20260912-0004/);
  assert.doesNotMatch(await page.locator('.publisher-channel-table--batches tbody').innerText(),/FB-20260908-0001/);
  await openSection(page,'分销数据');
  await page.getByLabel('渠道名称或编号').fill('NovaPlay');
  await page.getByRole('button',{name:'查询',exact:true}).click();
  assert.match(await page.locator('.publisher-channel-table--distribution tbody').innerText(),/NovaPlay Store/);
  assert.doesNotMatch(await page.locator('.publisher-channel-table--distribution tbody').innerText(),/ArcadeX/);
  await page.close();
});
```

- [ ] **Step 3: 增加创建渠道时间校验、状态和供货门禁用例**

```js
test('渠道生效期决定待生效与已结束状态',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  await page.getByRole('button',{name:'创建渠道',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建渠道'});
  await dialog.getByLabel('渠道名称').fill('未来渠道');
  await dialog.getByLabel('供货方式').selectOption('file');
  await dialog.getByLabel('生效开始时间').fill('2026-09-20T09:00');
  await dialog.getByLabel('生效结束时间').fill('2026-09-19T09:00');
  await dialog.getByRole('button',{name:'创建渠道',exact:true}).click();
  assert.match(await dialog.innerText(),/结束时间必须晚于开始时间/);
  await dialog.getByLabel('生效结束时间').fill('');
  await dialog.getByRole('button',{name:'创建渠道',exact:true}).click();
  const row=channelRow(page,'未来渠道');
  assert.match(await row.innerText(),/待生效/);
  assert.equal(await row.getByRole('button',{name:'创建文件',exact:true}).count(),0);
  await page.close();
});
```

- [ ] **Step 4: 增加下载抽屉和 100,000 上限用例**

```js
test('下载记录使用右侧抽屉且单批上限为十万',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  const row=channelRow(page,'ArcadeX 文件渠道');
  await row.getByRole('button',{name:'查看下载记录',exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'下载记录'});
  assert.equal(await drawer.getAttribute('data-channel-drawer'),'download-record');
  assert.match(await drawer.getAttribute('class'),/publisher-channel-drawer/);
  assert.doesNotMatch(await drawer.innerText(),/页面不保存或回显明文 Key/);
  await page.getByRole('button',{name:'关闭抽屉',exact:true}).click();
  await row.getByRole('button',{name:'创建文件',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建兑换码文件'});
  assert.equal(await dialog.getByLabel('生成数量').getAttribute('max'),'100000');
  await dialog.getByLabel('生成数量').fill('100001');
  await dialog.getByRole('button',{name:'生成并下载',exact:true}).click();
  assert.match(await dialog.innerText(),/单批最多生成 100,000 个/);
  await page.close();
});
```

- [ ] **Step 5: 运行新用例并确认失败**

Run:

```powershell
node --test --test-name-pattern="默认近 30 天|三个列表|渠道生效期|下载记录使用" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: FAIL，当前尚无筛选条、生效期和抽屉，且文件上限仍是 10,000。

### Task 2: 扩展状态、时间 fixture 和纯函数

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 为 fixture 增加生效期和发放分段**

```js
const DEMO_NOW = '2026-09-16T15:00';
const DEFAULT_DISTRIBUTION_START = '2026-08-18';
const DEFAULT_DISTRIBUTION_END = '2026-09-16';

// 渠道数据统一增加 effectiveStart/effectiveEnd。
// Key 数据用 periods 按发放 cohort 分段，兑换数为该 cohort 截至 Demo 基准日的累计值。
{ channelId:'CH-240901', skuId:'BASE-GLOBAL', periods:[
  { issuedAt:'2026-08-25', issued:500, redeemed:390 },
  { issuedAt:'2026-09-05', issued:420, redeemed:336 },
  { issuedAt:'2026-09-16', issued:480, redeemed:374 },
]}
```

- [ ] **Step 2: 在 `createState` 中规范化三组筛选值**

```js
const emptyRange = { channelId:'', start:'', end:'' };
const defaultDistributionRange = { channelId:'', start:DEFAULT_DISTRIBUTION_START, end:DEFAULT_DISTRIBUTION_END };
const normalizeFilter = (source, fallback) => ({
  channelId:String(source?.channelId || fallback.channelId),
  start:String(source?.start || fallback.start),
  end:String(source?.end || fallback.end),
});

return {
  ...copy(fixture),
  ...rest,
  channelFilters:normalizeFilter(value.channelFilters,emptyRange),
  batchFilters:normalizeFilter(value.batchFilters,emptyRange),
  distributionFilters:normalizeFilter(value.distributionFilters,defaultDistributionRange),
};
```

- [ ] **Step 3: 实现日期范围和派生状态函数**

```js
const dateValue = value => value ? new Date(String(value).includes('T') ? value : `${value}T00:00`).getTime() : null;
const rangeOverlaps = (itemStart,itemEnd,filterStart,filterEnd) => {
  const start=dateValue(itemStart) ?? Number.NEGATIVE_INFINITY;
  const end=dateValue(itemEnd) ?? Number.POSITIVE_INFINITY;
  const queryStart=dateValue(filterStart) ?? Number.NEGATIVE_INFINITY;
  const queryEnd=filterEnd ? dateValue(`${filterEnd}T23:59`) : Number.POSITIVE_INFINITY;
  return start<=queryEnd && end>=queryStart;
};
const effectiveChannelStatus = (channel, now=DEMO_NOW) => {
  if(['paused','stopped','risk_paused'].includes(channel.status)) return channel.status;
  const current=dateValue(now);
  if(channel.effectiveStart && current<dateValue(channel.effectiveStart)) return 'scheduled';
  if(channel.effectiveEnd && current>=dateValue(channel.effectiveEnd)) return 'ended';
  return 'active';
};
const canSupply = channel => effectiveChannelStatus(channel)==='active';
```

- [ ] **Step 4: 导出可测试辅助函数并运行语法检查**

```js
window.PublisherChannelDistribution = { fixture, createState, render, effectiveChannelStatus, rangeOverlaps, canSupply };
```

Run:

```powershell
node --check "demos\开发者后台一期\src\runtime\publisher-channel-distribution.js"
```

Expected: 退出码 0。

### Task 3: 实现三组筛选 UI 和统一数据口径

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 新增可复用筛选条**

```js
const filterBar = ({ language, scope, values, startLabel, endLabel }) => `<form class="publisher-channel-filters" data-channel-filter-form="${e(scope)}">
  <label><span>${tx(language,'渠道名称或编号','Channel name or ID')}</span><input value="${e(values.channelId)}" data-channel-filter-keyword aria-label="${tx(language,'渠道名称或编号','Channel name or ID')}"></label>
  <label><span>${e(startLabel)}</span><input type="date" value="${e(values.start)}" data-channel-filter-start aria-label="${e(startLabel)}"></label>
  <label><span>${e(endLabel)}</span><input type="date" value="${e(values.end)}" data-channel-filter-end aria-label="${e(endLabel)}"></label>
  <div class="publisher-channel-filters__actions">${button(tx(language,'查询','Search'),'channel-filter-submit',{filterScope:scope})}${button(tx(language,'重置','Reset'),'channel-filter-reset',{secondary:true,filterScope:scope})}</div>
</form>`;
```

`button()` 同步输出 `data-filter-scope`。

- [ ] **Step 2: 分别过滤渠道、批次和发放 cohort**

```js
const keywordMatches = (channel,keyword) => !keyword || `${channel.name} ${channel.id}`.toLocaleLowerCase().includes(keyword.toLocaleLowerCase());
const filteredChannels = state.channels.filter(channel => keywordMatches(channel,state.channelFilters.channelId)
  && rangeOverlaps(channel.effectiveStart,channel.effectiveEnd,state.channelFilters.start,state.channelFilters.end));
const filteredBatches = state.fileBatches.filter(batch => keywordMatches(channelById(state,batch.channelId),state.batchFilters.channelId)
  && rangeOverlaps(batch.createdAt,batch.createdAt,state.batchFilters.start,state.batchFilters.end));
const filteredMetrics = state.keyMetrics.map(item => ({
  ...item,
  periods:(item.periods || []).filter(period => rangeOverlaps(period.issuedAt,period.issuedAt,state.distributionFilters.start,state.distributionFilters.end)),
})).filter(item => keywordMatches(channelById(state,item.channelId),state.distributionFilters.channelId));
```

分销数据顶部卡和列表都从 `filteredMetrics` 汇总；列表只保留渠道、销售项、SKU、供货方式、发放量、兑换量、未兑换量和兑换率。

- [ ] **Step 3: 在 `app.js` 中处理查询和重置**

```js
if(route.id==='P02-01' && ['channel-filter-submit','channel-filter-reset'].includes(action)){
  const scope=event.currentTarget.dataset.filterScope;
  const key={channels:'channelFilters',batches:'batchFilters',distribution:'distributionFilters'}[scope];
  if(!key) return;
  const defaults=scope==='distribution'?{channelId:'',start:'2026-08-18',end:'2026-09-16'}:{channelId:'',start:'',end:''};
  const form=root.querySelector(`[data-channel-filter-form="${scope}"]`);
  const filters=action==='channel-filter-reset'?defaults:{
    channelId:String(form?.querySelector('[data-channel-filter-keyword]')?.value||'').trim(),
    start:String(form?.querySelector('[data-channel-filter-start]')?.value||''),
    end:String(form?.querySelector('[data-channel-filter-end]')?.value||''),
  };
  updateChannelDistribution(state=>({...state,[key]:filters}));
  return;
}
```

- [ ] **Step 4: 增加筛选条响应式样式**

```css
.publisher-channel-filters{display:grid;grid-template-columns:minmax(220px,1.2fr) repeat(2,minmax(160px,.8fr)) auto;gap:12px;align-items:end;margin-bottom:16px;padding:14px;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--surface-soft)}
.publisher-channel-filters label{display:grid;gap:6px;min-width:0}
.publisher-channel-filters label span{color:var(--text-secondary);font-size:12px;font-weight:600}
.publisher-channel-filters input{width:100%;min-width:0;min-height:38px;padding:0 10px;border:1px solid var(--line-strong);border-radius:var(--radius-sm);background:var(--surface)}
.publisher-channel-filters__actions{display:flex;gap:8px}
@media(max-width:820px){.publisher-channel-filters{grid-template-columns:1fr 1fr}.publisher-channel-filters label:first-child,.publisher-channel-filters__actions{grid-column:1/-1}}
@media(max-width:620px){.publisher-channel-filters{grid-template-columns:1fr}.publisher-channel-filters label:first-child,.publisher-channel-filters__actions{grid-column:auto}.publisher-channel-filters__actions>*{flex:1}}
```

- [ ] **Step 5: 运行筛选与数据口径用例**

Run:

```powershell
node --test --test-name-pattern="默认近 30 天|三个列表" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: PASS。

### Task 4: 实现渠道生效时间、派生状态和供货门禁

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 在创建渠道表单加入开始和结束时间**

```js
<label><span>${tx(language,'生效开始时间','Effective from')}</span><input type="datetime-local" value="2026-09-16T15:00" aria-label="${tx(language,'生效开始时间','Effective from')}" data-channel-effective-start><em data-channel-effective-start-error></em></label>
<label><span>${tx(language,'生效结束时间','Effective until')}</span><input type="datetime-local" aria-label="${tx(language,'生效结束时间','Effective until')}" data-channel-effective-end><small>${tx(language,'不填表示长期有效','Leave blank for no end date')}</small><em data-channel-effective-end-error></em></label>
```

- [ ] **Step 2: 提交时校验区间并保存**

```js
const effectiveStart=String(root.querySelector('[data-channel-effective-start]')?.value||'');
const effectiveEnd=String(root.querySelector('[data-channel-effective-end]')?.value||'');
const endError=root.querySelector('[data-channel-effective-end-error]');
if(!effectiveStart){
  root.querySelector('[data-channel-effective-start-error]').textContent='请选择生效开始时间。';
  return;
}
if(effectiveEnd && new Date(effectiveEnd).getTime()<=new Date(effectiveStart).getTime()){
  endError.textContent='结束时间必须晚于开始时间。';
  return;
}
const channel={
  id:createChannelId(current.channels),name,delivery:delivery==='file'?'file':'api',productIds:[productId],
  status:'active',effectiveStart,effectiveEnd,credentialStatus:delivery==='file'?'not_applicable':'pending',
  clientId:'',secretLast4:'',lastDeliveredAt:'',createdAt:nowText(),
};
```

- [ ] **Step 3: 列表显示生效期和派生状态**

```js
const effectiveStatus=effectiveChannelStatus(channel);
const partnership=channelStatusMeta(language,effectiveStatus);
const effectivePeriod=channel.effectiveEnd
  ? `${formatDateTime(channel.effectiveStart)} — ${formatDateTime(channel.effectiveEnd)}`
  : `${formatDateTime(channel.effectiveStart)} — ${tx(language,'长期有效','No end date')}`;
```

渠道列表在“API 或文件状态”后新增“生效时间”列。`scheduled` 显示“待生效”，`ended` 显示“已结束”。

- [ ] **Step 4: 把所有新供货操作改为 `canSupply()` 门禁**

```js
const channelCanSupply = channel => window.PublisherChannelDistribution?.canSupply(channel) === true;

if(action==='channel-api-generate' && !channelCanSupply(channel)){
  resultMessage(route.id,'当前不可供货','渠道未生效、已结束或已停止。','warning');
  return;
}
if((action==='channel-file-create'||action==='channel-file-retry') && !channelCanSupply(channel)){
  resultMessage(route.id,'当前不可创建文件','请检查渠道生效时间和合作状态。','warning');
  return;
}
```

`channel-file-generate` 的生成前和生成后二次检查同样使用 `channelCanSupply()`。

- [ ] **Step 5: 运行生效期用例**

Run:

```powershell
node --test --test-name-pattern="渠道生效期|暂停文件渠道|停止合作" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: PASS。

### Task 5: 将下载记录改为右侧抽屉

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 新增抽屉容器并仅用于下载记录**

```js
const drawerShell=(language,id,title,body)=>`<div class="publisher-channel-drawer-layer"><button type="button" class="publisher-channel-dialog-backdrop" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭抽屉','Close drawer')}"></button><aside class="publisher-channel-drawer" role="dialog" aria-modal="true" aria-labelledby="${e(id)}" data-channel-drawer="download-record"><header><h2 id="${e(id)}">${e(title)}</h2><button type="button" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭抽屉','Close drawer')}">×</button></header><div class="publisher-channel-drawer__body">${body}</div></aside></div>`;
```

- [ ] **Step 2: 精简下载记录内容**

```js
const renderDownloadRecordDialog=(language,state)=>{
  const channel=channelById(state,state.dialogChannelId);
  const rows=state.downloads.filter(item=>item.channelId===channel.id).map(item=>[
    e(item.fileName),e(item.batchId),formatNumber(item.quantity),e(item.downloadedBy||'—'),e(item.downloadedAt||'—'),formatNumber(item.downloadCount||1),
  ]);
  return drawerShell(language,'channel-download-record-title',tx(language,'下载记录','Download records'),`<div class="publisher-channel-dialog-context"><strong>${e(channel.name)}</strong><span>${e(channel.id)}</span></div>${table(['文件名','批次','数量','下载账号','下载时间','次数'],rows,{compact:true})}`);
};
```

- [ ] **Step 3: 增加桌面端右侧和手机端全屏样式**

```css
.publisher-channel-drawer-layer{position:fixed;inset:0;z-index:80;display:flex;justify-content:flex-end}
.publisher-channel-drawer{position:relative;display:grid;grid-template-rows:auto minmax(0,1fr);width:min(760px,calc(100% - 48px));height:100%;background:var(--surface);box-shadow:-18px 0 52px rgba(11,18,32,.2)}
.publisher-channel-drawer>header{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid var(--line)}
.publisher-channel-drawer>header h2{margin:0;font-size:20px}
.publisher-channel-drawer>header button{width:32px;height:32px;border:0;border-radius:50%;background:none;font-size:24px}
.publisher-channel-drawer__body{min-height:0;padding:20px 22px;overflow:auto}
@media(max-width:620px){.publisher-channel-drawer{width:100%;max-width:none}.publisher-channel-drawer__body{padding:17px}}
```

- [ ] **Step 4: 运行抽屉和移动端用例**

Run:

```powershell
node --test --test-name-pattern="下载记录使用|320、390、1280、1440" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: PASS；1440px 为右侧抽屉，390px 为全屏面板，根节点无溢出。

### Task 6: 将文件数量上限改为 100,000

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 更新输入属性和辅助文案**

```html
<input type="number" min="1" max="100000" step="1" value="100" aria-label="生成数量" data-channel-file-quantity>
<small>单批可生成 1—100,000 个；用完可再创建新批次。</small>
```

- [ ] **Step 2: 更新提交校验**

```js
if(!Number.isInteger(quantity)||quantity<1||quantity>100000){
  quantityInput?.setAttribute('aria-invalid','true');
  if(error) error.textContent=quantity>100000?'单批最多生成 100,000 个。':'请输入 1—100,000 的整数。';
  quantityInput?.focus();
  return;
}
```

- [ ] **Step 3: 运行数量上限与真实下载用例**

Run:

```powershell
node --test --test-name-pattern="下载记录使用|同步生成兑换码文件" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: PASS；12 个 Key 的真实 CSV 仍正常下载，100,001 被阻止。

### Task 7: 构建、视觉验收、PRD 同步和全量回归

**Files:**
- Modify: `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`
- Modify: `tests/developer-backend/evidence/gamehub-channel-key-infrastructure/*.png`
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.md`

- [ ] **Step 1: 更新视觉证据用例**

```js
await supply.screenshot({path:path.join(evidenceDir,'channel-management-filter-1440.png'),fullPage:true});
await supply.getByRole('tab',{name:'文件批次',exact:true}).click();
await supply.screenshot({path:path.join(evidenceDir,'channel-file-filter-1440.png'),fullPage:true});
await channelRow(supply,'ArcadeX 文件渠道').getByRole('button',{name:'查看下载记录',exact:true}).click();
await supply.screenshot({path:path.join(evidenceDir,'channel-download-drawer-1440.png'),fullPage:true});
```

并保留 390px 创建渠道时间表单、320px 分销筛选及既有停止合作、帮助中心证据。

- [ ] **Step 2: 构建单文件 Demo**

Run:

```powershell
node "demos\开发者后台一期\build-next.mjs"
```

Expected: 退出码 0，`13-开发者平台与渠道分销demo.html` 更新。

- [ ] **Step 3: 在 PRD 的渠道分销段更新口径**

```markdown
- 渠道管理支持按渠道及生效时间筛选；时间区间相交即命中。
- 文件批次支持按渠道及创建时间筛选。
- 分销数据默认近 30 天，按 Key 发放时间圈定 cohort，兑换量取该 cohort 截至查询时的累计值。
- 创建渠道必须填开始时间，结束时间可空；未开始或已结束时停止新供货。
- 文件单批可生成 1—100,000 个 Key，不设渠道累计额度。
- 下载记录在桌面端用右侧抽屉，手机端用全屏面板。
```

- [ ] **Step 4: 运行完整回归**

Run:

```powershell
node --check "demos\开发者后台一期\src\runtime\publisher-channel-distribution.js"
node --check "demos\开发者后台一期\src\runtime\app.js"
node --test "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: 全部 PASS；视觉证据文件都大于 10 KB。

- [ ] **Step 5: 只提交本轮文件**

```powershell
git add -- "demos/开发者后台一期/src/runtime/publisher-channel-distribution.js" "demos/开发者后台一期/src/runtime/app.js" "demos/开发者后台一期/src/styles/publisher-channel-distribution.css" "demos/开发者后台一期/13-开发者平台与渠道分销demo.html" "tests/developer-backend/publisher-channel-integration.browser.test.mjs" "tests/developer-backend/evidence/gamehub-channel-key-infrastructure" "prd/workflow-state/LOCAL-20260901-developer-backend-prd.md"
git commit -m "feat: add channel periods and list filters"
```

Expected: 新提交不包含工作区内其他已有改动。

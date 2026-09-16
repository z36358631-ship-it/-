# GameHub Channel and Batch Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将渠道分销 Demo 改为“先建渠道、再建供给批次”的两层模型，并补齐渠道与批次的增删查改、启停、文件下载和 API 接入交互。

**Architecture:** 保留现有单文件 Demo 构建方式，由 `publisher-channel-distribution.js` 负责领域状态、状态计算和 HTML 渲染，`app.js` 负责事件、校验、持久化与真实下载，`publisher-channel-distribution.css` 负责桌面和手机布局。渠道只存合作资料；文件和 API 批次统一存入 `batches`，凭证挂到 API 批次，历史记录通过软删除字段保留。

**Tech Stack:** 原生 JavaScript、CSS、JSON fixture、Node.js 构建脚本、Playwright Core、Node Test Runner。

---

## 文件结构

- `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`：渠道／批次状态模型、筛选、列表、弹窗和状态计算。
- `demos/开发者后台一期/src/runtime/app.js`：CRUD、启停、软删除、文件生成下载、API Secret 和表单校验。
- `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`：筛选器、列表、表单、确认弹窗及响应式布局。
- `demos/开发者后台一期/src/fixtures.json`：帮助中心“发行与供给”文章及对外中英文内容。
- `tests/developer-backend/publisher-channel-integration.browser.test.mjs`：完整业务链路、下载、权限、状态和响应式验收。
- `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`：构建产物，不直接手改。

### Task 1: 先用浏览器测试锁定两层模型

**Files:**
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs:41-430`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 更新测试定位器与信息架构断言**

把旧“文件批次”Tab 和按渠道配置供给方式的断言改为“批次管理”，并增加编辑、启停、删除按钮定位器：

```js
const channelRow=(page,name)=>page.locator('.publisher-channel-table--channels tbody tr').filter({hasText:name});
const batchRow=(page,name)=>page.locator('.publisher-channel-table--batches tbody tr').filter({hasText:name});

test('渠道与供给采用渠道管理和批次管理两层模型',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供给');
  const tabs=page.getByRole('tablist',{name:'渠道与供给'});
  await tabs.getByRole('tab',{name:'渠道管理',exact:true}).waitFor();
  await tabs.getByRole('tab',{name:'批次管理',exact:true}).waitFor();
  const headers=await page.locator('.publisher-channel-table--channels thead').innerText();
  assert.match(headers,/渠道名称/);
  assert.match(headers,/合作时间/);
  assert.doesNotMatch(headers,/销售项|供给方式|API 凭证|数量/);
  await page.close();
});
```

- [ ] **Step 2: 增加渠道 CRUD 与启停测试**

```js
test('渠道支持新增编辑停用启用和删除',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('button',{name:'创建渠道',exact:true}).click();
  const create=page.getByRole('dialog',{name:'创建渠道'});
  await create.getByLabel('渠道名称').fill('测试合作渠道');
  await create.getByLabel('备注').fill('线下合作');
  await create.getByRole('button',{name:'创建',exact:true}).click();
  const row=channelRow(page,'测试合作渠道');
  await row.waitFor();
  await row.getByRole('button',{name:'编辑',exact:true}).click();
  const edit=page.getByRole('dialog',{name:'编辑渠道'});
  await edit.getByLabel('渠道名称').fill('测试渠道已编辑');
  await edit.getByRole('button',{name:'保存',exact:true}).click();
  const edited=channelRow(page,'测试渠道已编辑');
  await edited.getByRole('button',{name:'停用',exact:true}).click();
  await page.getByRole('dialog',{name:'停用渠道'}).getByRole('button',{name:'确认停用',exact:true}).click();
  assert.match(await edited.innerText(),/已停用/);
  await edited.getByRole('button',{name:'启用',exact:true}).click();
  assert.match(await edited.innerText(),/合作中/);
  await edited.getByRole('button',{name:'删除',exact:true}).click();
  await page.getByRole('dialog',{name:'删除渠道'}).getByRole('button',{name:'确认删除',exact:true}).click();
  assert.equal(await channelRow(page,'测试渠道已编辑').count(),0);
  await page.close();
});
```

- [ ] **Step 3: 增加文件批次和 API 批次测试**

```js
test('文件批次先创建再下载且单批最多十万',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  await page.getByRole('button',{name:'创建批次',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建批次'});
  await dialog.getByLabel('批次名称').fill('ArcadeX 九月文件批次');
  await dialog.getByLabel('所属渠道').selectOption('CH-240902');
  await dialog.getByLabel('销售项').selectOption('BASE-GLOBAL');
  await dialog.getByLabel('供给方式').selectOption('file');
  await dialog.getByLabel('Key 数量').fill('100001');
  await dialog.getByRole('button',{name:'创建',exact:true}).click();
  assert.match(await dialog.innerText(),/单批最多 100,000/);
  await dialog.getByLabel('Key 数量').fill('12');
  await dialog.getByRole('button',{name:'创建',exact:true}).click();
  const row=batchRow(page,'ArcadeX 九月文件批次');
  await row.waitFor();
  const [download]=await Promise.all([page.waitForEvent('download'),row.getByRole('button',{name:'下载文件',exact:true}).click()]);
  assert.match(download.suggestedFilename(),/^盖世游戏兑换码_ArcadeX文件渠道_BT-/);
  const csv=fs.readFileSync(await download.path(),'utf8');
  assert.equal(csv.trim().split(/\r?\n/).length,13);
  assert.match(await row.innerText(),/已下载/);
  assert.equal(await row.getByRole('button',{name:'下载文件',exact:true}).count(),0);
  await page.close();
});

test('API 批次无数量并按批次管理接入',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  await page.getByRole('button',{name:'创建批次',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建批次'});
  await dialog.getByLabel('供给方式').selectOption('api');
  assert.equal(await dialog.getByLabel('Key 数量').count(),0);
  assert.doesNotMatch(await dialog.innerText(),/额度|补量/);
  await page.close();
});
```

- [ ] **Step 4: 增加批次编辑限制、启停、删除和渠道联动测试**

```js
test('已供给批次锁定核心字段且渠道停用阻断批次',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  const supplied=batchRow(page,'ArcadeX 已下载批次');
  await supplied.getByRole('button',{name:'编辑',exact:true}).click();
  const edit=page.getByRole('dialog',{name:'编辑批次'});
  for(const label of ['所属渠道','销售项','供给方式','Key 数量']) assert.equal(await edit.getByLabel(label).isDisabled(),true);
  await edit.getByRole('button',{name:'取消',exact:true}).click();
  await page.getByRole('tab',{name:'渠道管理',exact:true}).click();
  await channelRow(page,'ArcadeX 文件渠道').getByRole('button',{name:'停用',exact:true}).click();
  await page.getByRole('dialog',{name:'停用渠道'}).getByRole('button',{name:'确认停用',exact:true}).click();
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  assert.match(await batchRow(page,'ArcadeX 待下载批次').innerText(),/受渠道限制/);
  await page.close();
});

test('待供给批次可编辑启停和删除且 API 批次保持唯一',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  const pending=batchRow(page,'ArcadeX 待下载批次');
  await pending.getByRole('button',{name:'查看',exact:true}).click();
  await page.getByRole('dialog',{name:'批次详情'}).getByRole('button',{name:'关闭',exact:true}).click();
  await pending.getByRole('button',{name:'编辑',exact:true}).click();
  await page.getByRole('dialog',{name:'编辑批次'}).getByLabel('批次名称').fill('ArcadeX 待下载批次已编辑');
  await page.getByRole('dialog',{name:'编辑批次'}).getByRole('button',{name:'保存',exact:true}).click();
  const edited=batchRow(page,'ArcadeX 待下载批次已编辑');
  await edited.getByRole('button',{name:'停用',exact:true}).click();
  await page.getByRole('dialog',{name:'停用批次'}).getByRole('button',{name:'确认停用',exact:true}).click();
  await edited.getByRole('button',{name:'启用',exact:true}).click();
  await edited.getByRole('button',{name:'删除',exact:true}).click();
  await page.getByRole('dialog',{name:'删除批次'}).getByRole('button',{name:'确认删除',exact:true}).click();
  assert.equal(await batchRow(page,'ArcadeX 待下载批次已编辑').count(),0);
  await page.close();
});
```

- [ ] **Step 5: 运行测试并确认先失败**

Run:

```powershell
node --test --test-concurrency=1 tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: FAIL，至少包含“批次管理”Tab 不存在、渠道表仍有销售项、CRUD 按钮不存在。

- [ ] **Step 6: 提交测试基线**

```powershell
git add -- tests/developer-backend/publisher-channel-integration.browser.test.mjs
git commit -m "test: define channel and batch management flows"
```

### Task 2: 将 fixture 和状态统一为渠道与批次两层

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js:8-116`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 把渠道 fixture 收敛为合作资料**

渠道不再保存 `delivery`、`productIds`、`credentialStatus`、`clientId` 或 `apiStats`：

```js
channels:[
  {id:'CH-240901',name:'NovaPlay Store',enabled:true,deleted:false,effectiveStart:'2026-01-01T00:00',effectiveEnd:'',note:'海外合作渠道',createdAt:'2026-01-01 10:00',updatedAt:'2026-09-12 09:20'},
  {id:'CH-240902',name:'ArcadeX 文件渠道',enabled:true,deleted:false,effectiveStart:'2026-06-01T00:00',effectiveEnd:'',note:'文件交付',createdAt:'2026-06-01 09:00',updatedAt:'2026-09-12 10:06'},
  {id:'CH-240903',name:'北美线下渠道',enabled:false,deleted:false,effectiveStart:'2026-06-01T00:00',effectiveEnd:'',note:'暂停合作',createdAt:'2026-06-01 10:00',updatedAt:'2026-09-08 18:40'},
]
```

- [ ] **Step 2: 用统一 `batches` 替代 `fileBatches`**

```js
batches:[
  {id:'BT-20260912-0004',name:'ArcadeX 已下载批次',channelId:'CH-240902',skuId:'BASE-GLOBAL',delivery:'file',quantity:300,validUntil:'2027-03-31',enabled:true,deleted:false,supplyState:'downloaded',effectiveStart:'2026-09-12T00:00',effectiveEnd:'',createdAt:'2026-09-12 10:02',downloadedAt:'2026-09-12 10:06'},
  {id:'BT-20260916-0005',name:'ArcadeX 待下载批次',channelId:'CH-240902',skuId:'BASE-GLOBAL',delivery:'file',quantity:100,validUntil:'2027-03-31',enabled:true,deleted:false,supplyState:'pending',effectiveStart:'2026-09-16T00:00',effectiveEnd:'',createdAt:'2026-09-16 09:00'},
  {id:'BT-20260901-0001',name:'NovaPlay 本体 API',channelId:'CH-240901',skuId:'BASE-GLOBAL',delivery:'api',quantity:null,enabled:true,deleted:false,supplyState:'active',effectiveStart:'2026-09-01T00:00',effectiveEnd:'',clientId:'cli_np_20260901',secretLast4:'7Q4X',createdAt:'2026-09-01 09:00',lastSuppliedAt:'2026-09-16 14:22'},
]
```

`keyMetrics` 同步增加 `delivery`，统计键使用 `channelId + skuId + delivery`，避免同一渠道和 SKU 同时存在文件与 API 供给时合并错误：

```js
keyMetrics:[
  {channelId:'CH-240901',skuId:'BASE-GLOBAL',delivery:'api',issued:1400,redeemed:1100,periods:[{issuedAt:'2026-09-16',issued:480,redeemed:374}]},
  {channelId:'CH-240902',skuId:'BASE-GLOBAL',delivery:'file',issued:300,redeemed:42,periods:[{issuedAt:'2026-09-12',issued:300,redeemed:42}]},
]
```

- [ ] **Step 3: 规范旧本地状态迁移**

`createState()` 读取旧 `fileBatches` 时转成 `batches`，并从旧渠道记录拆出 API 批次；输出状态只写 `batches`：

```js
const normalizeBatch=(batch,index)=>({
  id:String(batch.id||`BT-MIGRATED-${index+1}`),
  name:String(batch.name||`历史批次 ${index+1}`),
  delivery:batch.delivery==='api'?'api':'file',
  enabled:batch.enabled!==false,
  deleted:Boolean(batch.deleted),
  supplyState:batch.supplyState||batch.status||'pending',
  ...batch,
});
const sourceBatches=Array.isArray(value.batches)?value.batches:Array.isArray(value.fileBatches)?value.fileBatches:fixture.batches;
return {
  ...copy(fixture),...rest,
  dialogTargetType:String(value.dialogTargetType||''),
  channelFilters:{keyword:'',status:'',start:'',end:'',...(value.channelFilters||{})},
  batchFilters:{keyword:'',channelId:'',delivery:'',status:'',start:'',end:'',...(value.batchFilters||{})},
  batches:sourceBatches.map(normalizeBatch),
  fileBatches:undefined,
};
```

- [ ] **Step 4: 增加最终生效与编辑限制函数**

```js
const effectiveChannelStatus=(channel,now=DEMO_NOW)=>{
  if(channel.deleted)return 'deleted';
  if(!channel.enabled)return 'disabled';
  if(channel.effectiveStart&&dateValue(now)<dateValue(channel.effectiveStart))return 'scheduled';
  if(channel.effectiveEnd&&dateValue(now)>dateValue(channel.effectiveEnd))return 'ended';
  return 'active';
};
const effectiveBatchStatus=(batch,channel,now=DEMO_NOW)=>{
  if(batch.deleted)return 'deleted';
  if(effectiveChannelStatus(channel,now)!=='active')return 'channel_blocked';
  if(!batch.enabled)return 'disabled';
  if(batch.effectiveStart&&dateValue(now)<dateValue(batch.effectiveStart))return 'scheduled';
  if(batch.effectiveEnd&&dateValue(now)>dateValue(batch.effectiveEnd))return 'ended';
  if(batch.delivery==='file'&&batch.supplyState==='downloaded')return 'downloaded';
  return 'active';
};
const batchCoreLocked=batch=>batch.delivery==='file'?batch.supplyState==='downloaded':Number(batch.apiStats?.succeeded||0)>0;
const canSupplyBatch=(batch,channel)=>effectiveBatchStatus(batch,channel)==='active';
window.PublisherChannelDistribution={fixture,createState,render,renderDatePopover,effectiveChannelStatus,effectiveBatchStatus,rangeOverlaps,canSupplyBatch,batchCoreLocked};
```

- [ ] **Step 5: 运行测试，确认数据层错误减少但界面测试仍失败**

Run:

```powershell
node --test --test-concurrency=1 tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: FAIL，fixture 相关旧状态断言已消失，剩余失败集中在列表、弹窗和事件尚未实现。

- [ ] **Step 6: 提交状态模型**

```powershell
git add -- demos/开发者后台一期/src/runtime/publisher-channel-distribution.js
git commit -m "refactor: separate channels from supply batches"
```

### Task 3: 重做渠道与批次的列表和弹窗

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js:150-315`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 扩展筛选条并替换子 Tab**

```js
const supplyTabs=(language,active)=>`<nav class="publisher-channel-subtabs" role="tablist" aria-label="${tx(language,'渠道与供给','Channels & supply')}">
  <button type="button" role="tab" aria-selected="${active==='channels'}" class="${active==='channels'?'is-active':''}" data-portal-action="channel-supply-tab" data-channel-supply-tab="channels">${tx(language,'渠道管理','Channel management')}</button>
  <button type="button" role="tab" aria-selected="${active==='batches'}" class="${active==='batches'?'is-active':''}" data-portal-action="channel-supply-tab" data-channel-supply-tab="batches">${tx(language,'批次管理','Batch management')}</button>
</nav>`;
```

渠道筛选增加状态；批次筛选增加批次关键词、渠道、时间、供给方式和状态。筛选表单使用明确的 `data-channel-filter-*` 属性，供 `app.js` 读取。

- [ ] **Step 2: 实现渠道创建／编辑弹窗**

```js
const renderChannelFormDialog=(language,state,mode)=>{
  const channel=mode==='edit'?channelById(state,state.dialogChannelId):null;
  const title=mode==='edit'?tx(language,'编辑渠道','Edit channel'):tx(language,'创建渠道','Create channel');
  const body=`<form class="publisher-channel-form" data-channel-form data-channel-form-mode="${mode}">
    <label><span>${tx(language,'渠道名称','Channel name')}</span><input maxlength="50" value="${e(channel?.name||'')}" aria-label="${tx(language,'渠道名称','Channel name')}" data-channel-name><em data-channel-name-error></em></label>
    ${dateRangeField({language,label:tx(language,'合作时间','Cooperation period'),start:channel?.effectiveStart||DEMO_NOW,end:channel?.effectiveEnd||'',mode:'effective',showPresets:false,allowOpenEnd:true,startAttribute:'data-channel-effective-start',endAttribute:'data-channel-effective-end',dialogLabel:tx(language,'选择合作时间','Select cooperation period')})}
    <label><span>${tx(language,'状态','Status')}</span><select aria-label="${tx(language,'状态','Status')}" data-channel-enabled><option value="true">${tx(language,'启用','Enabled')}</option><option value="false"${channel?.enabled===false?' selected':''}>${tx(language,'停用','Disabled')}</option></select></label>
    <label><span>${tx(language,'备注','Note')}</span><textarea maxlength="200" aria-label="${tx(language,'备注','Note')}" data-channel-note>${e(channel?.note||'')}</textarea></label>
  </form>`;
  return dialogShell(language,`channel-${mode}-title`,title,body,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(mode==='edit'?tx(language,'保存','Save'):tx(language,'创建','Create'),mode==='edit'?'channel-edit-submit':'channel-create-submit',{channelId:channel?.id})}`);
};
```

- [ ] **Step 3: 实现统一的批次创建／编辑弹窗**

弹窗字段为批次名称、渠道、销售项、供给方式、生效时间、状态；选择文件后显示数量和 Key 有效期，选择 API 时隐藏并清空数量。

```js
const renderBatchFormDialog=(language,state,mode)=>{
  const batch=mode==='edit'?state.batches.find(item=>item.id===state.dialogBatchId):null;
  const locked=batchCoreLocked(batch||{});
  const delivery=batch?.delivery||'file';
  return dialogShell(language,`batch-${mode}-title`,mode==='edit'?tx(language,'编辑批次','Edit batch'):tx(language,'创建批次','Create batch'),`<form class="publisher-channel-form" data-channel-batch-form data-batch-core-locked="${locked}">
    <label><span>${tx(language,'批次名称','Batch name')}</span><input value="${e(batch?.name||'')}" aria-label="${tx(language,'批次名称','Batch name')}" data-channel-batch-name></label>
    <label><span>${tx(language,'所属渠道','Channel')}</span><select aria-label="${tx(language,'所属渠道','Channel')}" data-channel-batch-channel ${locked?'disabled':''}>${state.channels.filter(item=>!item.deleted).map(item=>`<option value="${e(item.id)}"${item.id===batch?.channelId?' selected':''}>${e(item.name)} · ${e(item.id)}</option>`).join('')}</select></label>
    <label><span>${tx(language,'销售项','Product')}</span><select aria-label="${tx(language,'销售项','Product')}" data-channel-batch-sku ${locked?'disabled':''}>${fixture.products.map(item=>`<option value="${e(item.id)}"${item.id===batch?.skuId?' selected':''}>${e(language==='en'?item.labelEn:item.label)}</option>`).join('')}</select></label>
    <label><span>${tx(language,'供给方式','Supply method')}</span><select aria-label="${tx(language,'供给方式','Supply method')}" data-channel-batch-delivery ${locked?'disabled':''}><option value="file">${tx(language,'下载兑换码文件','Download Key file')}</option><option value="api"${delivery==='api'?' selected':''}>${tx(language,'接口取码','Key API')}</option></select><em data-channel-batch-delivery-error></em></label>
    <div data-channel-batch-file-fields ${delivery==='api'?'hidden':''}></div>
    <label><span>${tx(language,'备注','Note')}</span><textarea maxlength="200" aria-label="${tx(language,'备注','Note')}" data-channel-batch-note>${e(batch?.note||'')}</textarea></label>
  </form>`,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(mode==='edit'?tx(language,'保存','Save'):tx(language,'创建','Create'),mode==='edit'?'channel-batch-edit-submit':'channel-batch-create-submit',{batchId:batch?.id})}`);
};
```

- [ ] **Step 4: 实现查看详情、启停和删除确认弹窗**

渠道详情展示编号、名称、合作时间、状态、备注和更新时间；批次详情展示编号、渠道、SKU、供给方式、数量、生效时间、供给状态和备注。统一确认弹窗必须显示对象名称、影响和明确操作文案；渠道停用／删除说明会阻止全部批次，批次停用／删除说明已发 Key 不回收。

```js
const renderConfirmDialog=(language,state)=>{
  const isChannel=state.dialogTargetType==='channel';
  const target=isChannel?channelById(state,state.dialogChannelId):state.batches.find(item=>item.id===state.dialogBatchId);
  const deleting=state.dialog==='delete-confirm';
  const title=deleting?(isChannel?'删除渠道':'删除批次'):(isChannel?'停用渠道':'停用批次');
  const impact=isChannel?'其全部批次将停止新供给；已发 Key 继续有效。':'该批次将停止新供给；已发 Key 继续有效。';
  return dialogShell(language,'channel-confirm-title',title,`<p class="publisher-channel-confirm-title">${e(target?.name||'')}</p><p class="publisher-channel-dialog__note is-warning">${impact}</p>`,`${button('取消','channel-dialog-close',{secondary:true})}${button(deleting?'确认删除':'确认停用',deleting?'channel-delete-confirm':'channel-disable-confirm',{danger:true})}`);
};
```

- [ ] **Step 5: 重写两张列表**

渠道表只显示名称／编号、合作时间、状态、备注、更新时间和操作。批次表显示名称／编号、渠道、销售项／SKU、供给方式、数量、生效时间、状态、最近供给和操作。两张列表默认过滤 `deleted:true` 的记录；空列表使用现有空态组件，不增加说明条。

`分销数据`列表不再读取 `channel.delivery`，改读 `keyMetrics.delivery`；文件和 API 数据继续按渠道、SKU、供给方式分别归类。

- [ ] **Step 6: 运行浏览器测试**

Run:

```powershell
node --test --test-concurrency=1 tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: CRUD 弹窗已能定位，失败集中在事件未写入状态或下载尚未迁移。

- [ ] **Step 7: 提交渲染层**

```powershell
git add -- demos/开发者后台一期/src/runtime/publisher-channel-distribution.js
git commit -m "feat: render channel and batch management"
```

### Task 4: 实现渠道与批次 CRUD、启停和供给

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/app.js:1820-2169`
- Modify: `demos/开发者后台一期/src/runtime/app.js:3378-3499`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 移除渠道创建时的供给和首批下载逻辑**

`channel-create-submit` 只校验并创建渠道：

```js
const channel={
  id:createChannelId(current.channels),name,note,
  enabled:enabledInput?.value!=='false',deleted:false,
  effectiveStart,effectiveEnd,
  createdAt:nowText(),updatedAt:nowText(),
};
updateChannelDistribution({...current,dialog:'',dialogChannelId:'',channels:[channel,...current.channels]});
resultMessage(route.id,'渠道已创建','可前往“批次管理”创建供给批次。');
```

- [ ] **Step 2: 实现渠道编辑、启用、停用和软删除**

```js
const patchChannel=(state,id,patch)=>({...state,channels:state.channels.map(item=>item.id===id?{...item,...patch,updatedAt:nowText()}:item)});

if(action==='channel-edit-submit'){
  updateChannelDistribution(state=>patchChannel(state,state.dialogChannelId,{name,note,enabled,effectiveStart,effectiveEnd}));
}
if(action==='channel-disable-confirm'){
  updateChannelDistribution(state=>({...patchChannel(state,state.dialogChannelId,{enabled:false}),dialog:'',dialogChannelId:''}));
}
if(action==='channel-enable'){
  updateChannelDistribution(state=>patchChannel(state,event.currentTarget.dataset.channelId,{enabled:true}));
}
if(action==='channel-delete-confirm'){
  updateChannelDistribution(state=>({...patchChannel(state,state.dialogChannelId,{enabled:false,deleted:true,deletedAt:nowText()}),dialog:'',dialogChannelId:''}));
}
```

- [ ] **Step 3: 实现批次创建和 API 唯一性校验**

```js
const deliveryInput=root.querySelector('[data-channel-batch-delivery]');
const deliveryError=root.querySelector('[data-channel-batch-delivery-error]');
const duplicateApi=current.batches.some(item=>!item.deleted&&item.enabled&&item.delivery==='api'&&item.channelId===channelId&&item.skuId===skuId);
if(delivery==='api'&&duplicateApi){
  deliveryInput?.setAttribute('aria-invalid','true');
  if(deliveryError)deliveryError.textContent='同一渠道和销售项已有启用中的 API 批次。';
  deliveryInput?.focus();
  return;
}
const createBatchId=batches=>`BT-${localDateToken()}-${String((batches||[]).length+1).padStart(4,'0')}`;
const batch={
  id:createBatchId(current.batches),name,channelId,skuId,delivery,
  quantity:delivery==='file'?quantity:null,
  validUntil:delivery==='file'?validUntil:'',
  enabled,deleted:false,supplyState:delivery==='file'?'pending':'pending_credentials',
  effectiveStart,effectiveEnd,note,createdAt:nowText(),updatedAt:nowText(),
};
updateChannelDistribution({...current,supplyTab:'batches',dialog:'',dialogBatchId:'',batches:[batch,...current.batches]});
```

- [ ] **Step 4: 实现批次编辑、启停和删除**

编辑前用 `batchCoreLocked()` 控制核心字段；服务端式事件处理也要忽略被禁用字段的传值。启用 API 批次前再次执行“渠道＋SKU”唯一性检查。未供给批次硬删，已供给批次写入 `deleted:true` 和 `deletedAt`。

```js
const supplied=window.PublisherChannelDistribution.batchCoreLocked(batch);
const batches=supplied
  ? current.batches.map(item=>item.id===batch.id?{...item,enabled:false,deleted:true,deletedAt:nowText()}:item)
  : current.batches.filter(item=>item.id!==batch.id);
```

- [ ] **Step 5: 把文件生成迁到批次的“下载文件”操作**

只允许 `delivery==='file'`、`supplyState==='pending'` 且 `canSupplyBatch(batch,channel)` 的批次下载。生成成功后更新原批次，不创建第二条批次：

先把 `upsertKeyMetric` 的查找键改为三字段组合：

```js
const metricIndex=next.findIndex(item=>item.channelId===change.channelId&&item.skuId===change.skuId&&item.delivery===change.delivery);
```

```js
const generated=await createKeyFile({quantity:batch.quantity,skuId:batch.skuId,validUntil:batch.validUntil});
downloadTextFile(fileName,generated.content,'text/csv;charset=utf-8');
const downloadedAt=nowText();
const createDownloadId=downloads=>`DL-${localDateToken()}-${String((downloads||[]).length+1).padStart(4,'0')}`;
updateChannelDistribution({
  ...latest,
  batches:latest.batches.map(item=>item.id===batch.id?{...item,supplyState:'downloaded',downloadedAt,lastSuppliedAt:downloadedAt}:item),
  downloads:[...latest.downloads,{id:createDownloadId(latest.downloads),channelId:batch.channelId,batchId:batch.id,skuId:batch.skuId,fileName,quantity:batch.quantity,keyFingerprintDigest:generated.keyFingerprintDigest,fingerprintCount:generated.fingerprintCount,downloadedAt,downloadedBy:'当前开发者',downloadCount:1}],
  keyMetrics:upsertKeyMetric(latest.keyMetrics,{channelId:batch.channelId,skuId:batch.skuId,delivery:'file',issuedDelta:batch.quantity,lastDeliveredAt:downloadedAt}),
});
```

- [ ] **Step 6: 把 API 凭证和调用审计迁到批次**

`channel-api-access` 改为 `channel-batch-api-access`，所有 `clientId`、`secretLast4`、`apiStats` 和 `apiCalls` 读写 `state.batches`。接入弹窗展示批次编号、渠道编号、SKU、API 地址和帮助中心文章入口。API 成功发码时调用 `upsertKeyMetric(...,{channelId,skuId,delivery:'api',issuedDelta:1})`，确保分销数据不再依赖渠道层供给方式。

- [ ] **Step 7: 同步表单联动**

把旧 `data-channel-delivery`／`data-channel-first-batch-slot` 监听改成 `data-channel-batch-delivery`／`data-channel-batch-file-fields`；API 模式清空数量和有效期错误，文件模式插入数量 1～100,000 与 Key 有效期字段。

- [ ] **Step 8: 运行渠道浏览器测试**

Run:

```powershell
node --test --test-concurrency=1 tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: PASS，所有渠道／批次 CRUD、启停、软删除、CSV 下载、API 唯一性和编辑限制通过。

- [ ] **Step 9: 提交交互实现**

```powershell
git add -- demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/src/runtime/publisher-channel-distribution.js tests/developer-backend/publisher-channel-integration.browser.test.mjs
git commit -m "feat: complete channel and batch lifecycle"
```

### Task 5: 更新帮助中心和响应式样式

**Files:**
- Modify: `demos/开发者后台一期/src/fixtures.json:helpCenter.faq`
- Modify: `demos/开发者后台一期/src/styles/publisher-channel-distribution.css:1-246`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 将帮助中心文章改为两层模型**

保留稳定 ID，文章标题和正文改为：

```json
{
  "id":"channel-distribution-overview",
  "category":"发行与供给",
  "question":"渠道与批次使用说明",
  "answer":"先创建合作渠道，再按渠道和销售项创建文件或 API 供给批次。",
  "steps":["创建渠道并设置合作时间。","在批次管理选择渠道、销售项和供给方式。","启用批次后下载文件或完成 API 接入。"],
  "details":["渠道和批次均可停用或删除。","停用或删除不回收已发 Key。"]
}
```

同时更新 API 鉴权、下载教程、数据口径、启停删除和三方责任文章；英文文章保持相同 ID，后台操作标签仍使用中文。

- [ ] **Step 2: 调整桌面筛选和表格宽度**

```css
.publisher-channel-filters.is-batches{grid-template-columns:minmax(180px,1fr) minmax(180px,1fr) minmax(250px,1.1fr) 150px 140px auto}
.publisher-channel-table--channels{min-width:1040px}
.publisher-channel-table--batches{min-width:1320px}
.publisher-channel-form textarea{width:100%;min-height:88px;padding:10px 11px;resize:vertical;border:1px solid var(--line-strong);border-radius:var(--radius-sm)}
```

- [ ] **Step 3: 保证手机端可操作**

在 `820px` 下筛选改两列，在 `620px` 下改一列；卡片式表格保留首列和操作列全宽；弹窗底部按钮单列；日期选择器继续使用现有全屏底部布局。

- [ ] **Step 4: 增加帮助中心和响应式断言**

```js
test('帮助中心包含渠道与批次及 API 接入说明',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('button',{name:'使用说明',exact:true}).click();
  const nav=await page.locator('[data-help-results]').innerText();
  for(const title of ['渠道与批次使用说明','接口取码接入指南','API 鉴权、发码、查询和错误码','下载兑换码文件教程','启停、删除与已发 Key 处理']) assert.match(nav,new RegExp(title));
  await page.close();
});

test('渠道和批次在 320 与 390 宽度无根节点溢出',async()=>{
  for(const width of [320,390]){
    const page=await browser.newPage({viewport:{width,height:844}});
    await openGame(page);await openSection(page,'渠道与供给');
    for(const tab of ['渠道管理','批次管理']){
      await page.getByRole('tab',{name:tab,exact:true}).click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
    }
    await page.close();
  }
});
```

- [ ] **Step 5: 运行测试**

Run:

```powershell
node --test --test-concurrency=1 tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: PASS，帮助文章、桌面宽度和 320／390px 响应式断言通过。

- [ ] **Step 6: 提交帮助和样式**

```powershell
git add -- demos/开发者后台一期/src/fixtures.json demos/开发者后台一期/src/styles/publisher-channel-distribution.css tests/developer-backend/publisher-channel-integration.browser.test.mjs
git commit -m "feat: align channel help and responsive layout"
```

### Task 6: 构建、回归和视觉验收

**Files:**
- Modify: `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`
- Verify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Verify: `demos/开发者后台一期/src/runtime/app.js`
- Verify: `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`
- Verify: `demos/开发者后台一期/src/fixtures.json`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`
- Test: `tests/developer-backend/publisher-account-context.test.mjs`
- Test: `tests/developer-backend/publisher-access-policy.test.mjs`

- [ ] **Step 1: 扫描旧口径**

Run:

```powershell
rg -n "风险暂停|密钥待重置|由平台处理|创建文件|首批兑换码数量|创建并下载|已取消|渠道凭证属于渠道|计划额度|剩余额度" -- demos/开发者后台一期/src/runtime/publisher-channel-distribution.js demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/src/fixtures.json
```

Expected: 无匹配。若帮助文章需要解释旧入口，改用当前词汇，不保留旧文案。

- [ ] **Step 2: 构建离线单文件 Demo**

Run:

```powershell
node demos/开发者后台一期/build-developer-channel.mjs
```

Expected: `Built 13-开发者平台与渠道分销demo.html with the committed stable data-dashboard runtime.`

- [ ] **Step 3: 运行渠道与权限回归**

Run:

```powershell
node --test --test-concurrency=1 tests/developer-backend/publisher-channel-integration.browser.test.mjs tests/developer-backend/publisher-account-context.test.mjs tests/developer-backend/publisher-access-policy.test.mjs
```

Expected: 全部 PASS，无失败和跳过。

- [ ] **Step 4: 检查构建产物不含明文演示 Key**

Run:

```powershell
rg -n "GH-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}|cdkey,sku_id,valid_until" -- demos/开发者后台一期/13-开发者平台与渠道分销demo.html
```

Expected: 允许匹配 CSV 表头生成模板，不允许出现预生成的完整 Key 行；测试下载时才在内存生成随机 Key。

- [ ] **Step 5: 手动检查四种宽度**

在本地预览页分别检查 320、390、1280 和 1440px：

- 渠道表和批次表无页面级横向溢出。
- 弹窗不超出视口，底部操作始终可见。
- 子 Tab 可横向滚动且选中态下标清晰。
- 文件下载、API 接入、编辑、停用和删除均可完成。

- [ ] **Step 6: 仅提交本任务文件**

```powershell
git add -- demos/开发者后台一期/src/runtime/publisher-channel-distribution.js demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/src/styles/publisher-channel-distribution.css demos/开发者后台一期/src/fixtures.json demos/开发者后台一期/13-开发者平台与渠道分销demo.html tests/developer-backend/publisher-channel-integration.browser.test.mjs
git diff --cached --check
git commit -m "feat: deliver channel and batch management demo"
```

- [ ] **Step 7: 输出交付信息**

交付本地 Demo 路径、预览地址、提交号、测试通过数，并说明未修改工作区中其他任务的文件。

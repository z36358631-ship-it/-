# Channel Distribution Form, Filter, and Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复渠道分销表单与筛选布局，解除文件下载对启停状态的依赖，并为 API 批次增加单次 10 万上限的可追加数量模型。

**Architecture:** 保留现有单文件 Demo 的状态与渲染架构，在 `publisher-channel-distribution.js` 内统一批次数量、表单结构和页面渲染，在 `app.js` 内处理表单读取、日期关闭、下载、API 取码和数量追加。用浏览器集成测试覆盖旧数据迁移、凭证不变、状态解耦和响应式布局，再由现有构建脚本重建离线 HTML。

**Tech Stack:** 原生 JavaScript、CSS Grid/Flex、LocalStorage/SessionStorage、Node.js test runner、Playwright Core、单文件 HTML 构建脚本。

---

## 文件分工

- `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`：批次标准化、状态计算、渠道/批次表单、筛选区、列表操作、数量追加抽屉。
- `demos/开发者后台一期/src/runtime/app.js`：表单读取与校验、日期点外关闭、文件生成下载、API 取码与追加数量事件。
- `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`：表单网格、平铺单选、筛选控件宽度、追加数量抽屉与响应式。
- `demos/开发者后台一期/src/fixtures.json`：帮助文章中启停、文件下载和 API 数量口径。
- `tests/developer-backend/publisher-channel-integration.browser.test.mjs`：本轮全部行为和视觉几何回归。
- `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`：由构建脚本生成的最终离线 Demo。

### Task 1: 表单、日期、入口与筛选区

**Files:**
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`

- [ ] **Step 1: 写失败测试**

在渠道集成测试中新增以下断言：

```js
test('创建表单默认停用、状态平铺且字段不重叠', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await openGame(page); await openSection(page,'渠道与供给');
  await page.getByRole('button',{ name:'创建渠道', exact:true }).click();
  let drawer = page.getByRole('dialog',{ name:'创建渠道', exact:true });
  assert.equal(await drawer.getByRole('radio',{ name:'停用', exact:true }).isChecked(), true);
  const channelState = await drawer.getByText('状态',{ exact:true }).locator('..').boundingBox();
  const channelNote = await drawer.getByLabel('备注').locator('..').boundingBox();
  assert.equal(Math.round(channelState.width), Math.round(channelNote.width));
  await drawer.getByRole('button',{ name:'取消', exact:true }).click();

  await page.getByRole('tab',{ name:'批次管理', exact:true }).click();
  await page.getByRole('button',{ name:'创建批次', exact:true }).click();
  drawer = page.getByRole('dialog',{ name:'创建批次', exact:true });
  assert.equal(await drawer.getByRole('radio',{ name:'停用', exact:true }).isChecked(), true);
  const quantity = await drawer.getByLabel('Key 数量').boundingBox();
  const expiry = await drawer.getByLabel('Key 有效期').boundingBox();
  assert.ok(quantity.bottom <= expiry.top || expiry.bottom <= quantity.top || quantity.right <= expiry.left || expiry.right <= quantity.left);
  await page.close();
});

test('日期浮层点外和 Escape 均按取消处理', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await openGame(page); await openSection(page,'渠道与供给');
  await page.getByRole('button',{ name:'创建渠道', exact:true }).click();
  const field = page.getByLabel('合作时间');
  const before = await field.innerText();
  await field.click();
  await page.getByRole('dialog',{ name:'选择合作时间' }).getByRole('button',{ name:'2026-09-20', exact:true }).click();
  await page.getByRole('heading',{ name:'创建渠道', exact:true }).click();
  assert.equal(await field.innerText(), before);
  await field.click();
  await page.getByRole('dialog',{ name:'选择合作时间' }).press('Escape');
  assert.equal(await field.innerText(), before);
  await page.close();
});

test('页面移除使用说明入口且三类筛选使用稳定内容宽度', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await openGame(page); await openSection(page,'渠道与供给');
  assert.equal(await page.getByRole('button',{ name:'使用说明', exact:true }).count(), 0);
  const channelWidths = await page.locator('.publisher-channel-filters.is-channels label').evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().width)));
  assert.ok(channelWidths[0] <= 320 && channelWidths[1] <= 340 && channelWidths[2] <= 180);
  await page.getByRole('tab',{ name:'批次管理', exact:true }).click();
  const batchWidth = await page.getByLabel('供给方式').locator('..').evaluate(node => Math.round(node.getBoundingClientRect().width));
  assert.ok(batchWidth <= 180);
  await openSection(page,'分销数据');
  const dataWidth = await page.getByLabel('Key 发放时间').locator('..').evaluate(node => Math.round(node.getBoundingClientRect().width));
  assert.ok(dataWidth <= 340);
  await page.close();
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
node --test --test-name-pattern="创建表单默认停用|日期浮层点外|页面移除使用说明" tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: FAIL，原因分别为状态仍是下拉框、日期点外不关闭、页面仍有“使用说明”、筛选项仍使用 `fr` 拉伸。

- [ ] **Step 3: 重构表单结构并改为平铺状态**

在渲染文件中使用稳定字段类，不再依赖 `label:first-child`：

```js
const statusRadios = (language, name, selected = false, attribute = '') => `
  <fieldset class="publisher-channel-form__full publisher-channel-radio-group">
    <legend>${tx(language,'状态','Status')}</legend>
    <label><input type="radio" name="${e(name)}" value="false" ${selected ? '' : 'checked'} ${attribute}>${tx(language,'停用','Disabled')}</label>
    <label><input type="radio" name="${e(name)}" value="true" ${selected ? 'checked' : ''} ${attribute}>${tx(language,'启用','Enabled')}</label>
  </fieldset>`;
```

渠道和批次创建传 `selected=false`，编辑传原 `enabled`。数量字段保持一个明确的双列容器，生效时间、状态、备注加 `publisher-channel-form__full`。

在 `app.js` 中读取选中单选项：

```js
const formValue = selector => String(root.querySelector(selector)?.value || '').trim();
const checkedValue = selector => String(root.querySelector(`${selector}:checked`)?.value || '').trim();

enabled:checkedValue('[data-channel-enabled]') === 'true'
enabled:checkedValue('[data-channel-batch-enabled]') === 'true'
```

切换供给方式时只切换静态字段的 `hidden` 和文案，不再用 `innerHTML` 复制第二份数量/有效期结构。

- [ ] **Step 4: 实现日期点外与 Escape 关闭**

在现有 `channelRoot` 事件委托中增加统一关闭函数：

```js
const closeChannelDatePickers = except => {
  channelRoot?.querySelectorAll('[data-channel-date-popover]').forEach(node => {
    if (node !== except) node.hidden = true;
  });
};

channelRoot?.addEventListener('click', event => {
  const control = event.target.closest('[data-channel-date-action]');
  if (!control) {
    if (!event.target.closest('[data-channel-date-popover]')) closeChannelDatePickers();
    return;
  }
  const wrapper = control.closest('[data-channel-date-range]');
  const popover = wrapper?.querySelector('[data-channel-date-popover]');
  if (!wrapper || !popover) return;
  event.preventDefault();
  const action = control.dataset.channelDateAction;
});

channelRoot?.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  closeChannelDatePickers();
});
```

关闭时不改 hidden input，临时 `draftStart/draftEnd` 会在下次打开时从原值重置。

- [ ] **Step 5: 移除顶部入口并收紧筛选宽度**

`renderSupply` 不再给 `head()` 传 `helpAction`，保留 `channel-help-open` 事件和 API 抽屉内的文档入口。

筛选项增加 `is-keyword`、`is-channel`、`is-date`、`is-compact` 类，CSS 改为：

```css
.publisher-channel-filters{display:flex;flex-wrap:wrap;align-items:end;gap:12px}
.publisher-channel-filter.is-keyword{flex:0 1 300px}
.publisher-channel-filter.is-channel{flex:0 1 260px}
.publisher-channel-filter.is-date{flex:0 1 320px}
.publisher-channel-filter.is-compact{flex:0 1 160px}
.publisher-channel-filters__actions{flex:0 0 auto;margin-left:auto}
.publisher-channel-form__full{grid-column:1/-1}
.publisher-channel-form__pair{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.publisher-channel-radio-group{display:flex;align-items:center;gap:24px;margin:0;padding:0;border:0}
.publisher-channel-radio-group legend{margin-bottom:8px;font-size:13px;font-weight:650}
```

在 `max-width:620px` 下将筛选项、双列字段和按钮组改为 `width:100%`、单列显示。

- [ ] **Step 6: 运行目标和响应式测试**

Run:

```powershell
node --test --test-name-pattern="创建表单默认停用|日期浮层点外|页面移除使用说明|320、390、1280、1440" tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: 4 tests PASS。

- [ ] **Step 7: 提交**

```powershell
git add -- "demos/开发者后台一期/src/runtime/publisher-channel-distribution.js" "demos/开发者后台一期/src/runtime/app.js" "demos/开发者后台一期/src/styles/publisher-channel-distribution.css" "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
git commit -m "feat: refine channel supply forms and filters"
```

### Task 2: API 批次数量与追加

**Files:**
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`

- [ ] **Step 1: 写 API 数量迁移与追加失败测试**

将旧测试“API 批次无数量或额度并按批次管理接入”改为以下口径，并新增旧数据迁移测试：

```js
test('API 批次支持十万上限和原批次追加数量', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:1000 } });
  await openGame(page); await openSection(page,'渠道与供给');
  await page.getByRole('tab',{ name:'批次管理', exact:true }).click();
  await page.getByRole('button',{ name:'创建批次', exact:true }).click();
  const create = page.getByRole('dialog',{ name:'创建批次' });
  await create.getByLabel('批次名称').fill('ArcadeX API 数量批次');
  await create.getByLabel('所属渠道').selectOption('CH-240902');
  await create.getByLabel('销售项').selectOption('BASE-GLOBAL');
  await create.getByLabel('供给方式').selectOption('api');
  const initial = create.getByLabel('初始可取数量');
  assert.equal(await initial.getAttribute('max'),'100000');
  await initial.fill('100001');
  await create.getByRole('button',{ name:'创建', exact:true }).click();
  assert.match(await create.innerText(),/1[^\n]*100,000/);
  await initial.fill('100000');
  await create.getByRole('button',{ name:'创建', exact:true }).click();

  const row = batchRow(page,'ArcadeX API 数量批次');
  await row.waitFor();
  assert.match(await row.innerText(),/100,000\s*\/\s*100,000/);
  await row.getByRole('button',{ name:'追加数量', exact:true }).click();
  const topup = page.getByRole('dialog',{ name:'追加数量', exact:true });
  assert.match(await topup.innerText(),/当前剩余[^\n]*100,000/);
  await topup.getByLabel('本次追加数量').fill('25000');
  await topup.getByRole('button',{ name:'确认追加', exact:true }).click();
  assert.match(await row.innerText(),/125,000\s*\/\s*125,000/);
  await page.close();
});

test('API 追加不改变接口凭证且旧数据不产生虚构库存', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await openGame(page); await openSection(page,'渠道与供给');
  await page.getByRole('tab',{ name:'批次管理', exact:true }).click();
  const row = batchRow(page,'NovaPlay 本体 API');
  await row.getByRole('button',{ name:'管理接入', exact:true }).click();
  const before = await page.getByRole('dialog',{ name:'API 接入信息' }).innerText();
  await page.getByRole('button',{ name:'关闭', exact:true }).click();
  await row.getByRole('button',{ name:'追加数量', exact:true }).click();
  await page.getByLabel('本次追加数量').fill('10000');
  await page.getByRole('button',{ name:'确认追加', exact:true }).click();
  await row.getByRole('button',{ name:'管理接入', exact:true }).click();
  const after = await page.getByRole('dialog',{ name:'API 接入信息' }).innerText();
  assert.match(before,/client_id\s*cli_np_base_202609/i);
  assert.match(after,/client_id\s*cli_np_base_202609/i);
  assert.match(await publisherStateText(page),/"quantityAdditions"/);
  await page.close();
});

test('旧 API 批次缺少数量时以已成功取码量迁移', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  await page.goto(demoUrl('/P02-01'),{ waitUntil:'load' });
  const migrated = await page.evaluate(() => window.PublisherChannelDistribution.createState({
    batches:[{
      id:'BT-LEGACY', name:'旧接口批次', channelId:'CH-240901', skuId:'BASE-GLOBAL',
      delivery:'api', clientId:'cli_legacy', apiStats:{ requests:7, succeeded:5, failed:2 },
    }],
  }).batches[0]);
  assert.equal(migrated.quantity,5);
  assert.equal(migrated.apiStats.succeeded,5);
  await page.close();
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
node --test --test-name-pattern="API 批次支持十万上限|API 追加不改变" tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: FAIL，当前 API 数量被标准化为 `null`，表单没有数量，列表显示 `—`，也没有追加入口。

- [ ] **Step 3: 升级 API 数量模型并迁移旧数据**

在 `normalizeBatch` 中统一数量：

```js
const apiSucceeded = batch => Math.max(0,Number(batch?.apiStats?.succeeded || 0));
const normalizedQuantity = batch => {
  const supplied = apiSucceeded(batch);
  const explicit = Number(batch?.quantity);
  if (batch?.delivery === 'api') return Number.isFinite(explicit) && explicit >= supplied ? explicit : supplied;
  return Math.max(0,Number(batch?.quantity || 0));
};
const apiRemaining = batch => Math.max(0,Number(batch?.quantity || 0) - apiSucceeded(batch));
```

fixture 中每个 API 批次显式设置 `quantity:100000`；旧持久化对象缺数量时按成功取码量迁移，剩余为 0。标准化并保留：

```js
quantity:normalizedQuantity(batch),
quantityAdditions:Array.isArray(batch.quantityAdditions) ? copy(batch.quantityAdditions) : [],
```

API 成功取码前检查 `apiRemaining(batch) > 0`；成功后同时增加 `requests` 和 `succeeded`：

```js
apiStats:{
  ...(batch.apiStats || {}),
  requests:Number(batch.apiStats?.requests || 0) + 1,
  succeeded:Number(batch.apiStats?.succeeded || 0) + 1,
}
```

数量用尽时 `effectiveBatchStatus` 返回 `exhausted`，列表展示“已用完”。

- [ ] **Step 4: 增加 API 数量表单、列表和追加抽屉**

供给方式为 API 时将数量字段文案切换为“初始可取数量”，仍使用 `min=1 max=100000`；文件方式继续使用“Key 数量”和有效期。

列表数量单元格：

```js
const quantityLabel = batch.delivery === 'api'
  ? `${formatNumber(apiRemaining(batch))} / ${formatNumber(batch.quantity)}`
  : formatNumber(batch.quantity);
```

API 操作区增加：

```js
actionLink(tx(language,'追加数量','Add quantity'),'batch-api-topup-open',{ batchId:batch.id })
```

仅当批次未删除且未结束时展示并响应“追加数量”；待生效和停用批次仍可追加。

`renderDialog` 增加 `api-topup`，使用右侧抽屉：

```js
const body = `<div class="publisher-channel-topup-summary"><span>当前剩余</span><strong>${formatNumber(apiRemaining(batch))}</strong></div>
  <label class="publisher-channel-topup-field"><span>${tx(language,'本次追加数量','Quantity to add')}</span>
    <input type="number" min="1" max="100000" step="1" aria-label="${tx(language,'本次追加数量','Quantity to add')}" data-channel-api-topup-quantity>
    <small>${tx(language,'追加后接口凭证与取码地址不变。','The API credentials and endpoint remain unchanged.')}</small>
    <em data-channel-api-topup-error></em>
  </label>`;
```

提交处理只做累计增加并写入记录：

```js
if (!batch || batch.deleted) return;
const status = window.PublisherChannelDistribution?.effectiveBatchStatus?.(batch,findChannel(current,batch.channelId));
if (status === 'ended') return;
const delta = Number(formValue('[data-channel-api-topup-quantity]'));
if (!Number.isInteger(delta) || delta < 1 || delta > 100000) {
  setFormError('[data-channel-api-topup-quantity]','[data-channel-api-topup-error]','请输入 1—100,000 的整数。');
  return;
}
const next = patchBatch(current,batchId,{
  quantity:Number(batch.quantity || 0) + delta,
  quantityAdditions:[...(batch.quantityAdditions || []),{ quantity:delta, createdAt:nowText(), createdBy:'当前开发者' }],
});
```

不修改 `clientId`、`secretLast4`、`rotatedAt`、`enabled`、`effectiveStart`、`effectiveEnd`。

- [ ] **Step 5: 运行 API 测试**

Run:

```powershell
node --test --test-name-pattern="API 批次支持十万上限|API 追加不改变|API Secret" tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: 3 tests PASS。

- [ ] **Step 6: 提交**

```powershell
git add -- "demos/开发者后台一期/src/runtime/publisher-channel-distribution.js" "demos/开发者后台一期/src/runtime/app.js" "demos/开发者后台一期/src/styles/publisher-channel-distribution.css" "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
git commit -m "feat: add replenishable API batch inventory"
```

### Task 3: 文件下载与启停状态解耦

**Files:**
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`

- [ ] **Step 1: 修改下载规则测试并确认旧行为失败**

把“待供给批次可编辑”和“渠道停用会阻止所属批次新供给”中的禁用断言改为可下载，并新增实际下载：

```js
test('未启用、待生效和渠道停用的文件批次仍可首次下载', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:1000 }, acceptDownloads:true });
  await openGame(page); await openSection(page,'渠道与供给');
  await page.getByRole('tab',{ name:'批次管理', exact:true }).click();
  for (const name of ['ArcadeX 十月预备批次','ArcadeX 停用批次']) {
    const row = batchRow(page,name);
    assert.equal(await row.getByRole('button',{ name:'下载文件', exact:true }).isEnabled(), true);
  }
  const stopped = batchRow(page,'ArcadeX 停用批次');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    stopped.getByRole('button',{ name:'下载文件', exact:true }).click(),
  ]);
  assert.match(download.suggestedFilename(),/ArcadeX文件渠道/);
  assert.match(await stopped.innerText(),/已下载/);
  assert.equal(await stopped.getByRole('button',{ name:'下载文件', exact:true }).count(),0);
  assert.equal(await stopped.getByRole('button',{ name:'下载记录', exact:true }).count(),1);
  await page.close();
});
```

Run:

```powershell
node --test --test-name-pattern="未启用、待生效和渠道停用" tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: FAIL，按钮当前被 `canSupplyBatch` 禁用。

- [ ] **Step 2: 增加只判断文件本身的下载资格**

渲染和运行时统一使用：

```js
const canDownloadFileBatch = batch => Boolean(
  batch && !batch.deleted && batch.delivery === 'file' && batch.supplyState === 'pending'
);
```

列表不再向“下载文件”传 `disabled:!canSupplyBatch(...)`。`batch-download` 首次判断和异步生成后的复核均只调用 `canDownloadFileBatch`，不再检查渠道、批次启停或生效时间。

已下载批次继续只显示“下载记录”；删除批次无下载入口；生成失败保持 `pending`，允许再次点击。

- [ ] **Step 3: 运行下载、安全与渠道状态测试**

Run:

```powershell
node --test --test-name-pattern="文件批次先创建再下载|未启用、待生效和渠道停用|静态交付文件不含固定明文" tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: 3 tests PASS；生成文件仍有 1 行表头和指定数量数据，LocalStorage 不出现明文 Key。

- [ ] **Step 4: 提交**

```powershell
git add -- "demos/开发者后台一期/src/runtime/publisher-channel-distribution.js" "demos/开发者后台一期/src/runtime/app.js" "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
git commit -m "feat: allow file generation across batch states"
```

### Task 4: 帮助文章、构建与完整验收

**Files:**
- Modify: `demos/开发者后台一期/src/fixtures.json`
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`
- Regenerate: `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`

- [ ] **Step 1: 调整帮助中心测试入口和文案断言**

帮助测试不再点击页面内“使用说明”，改为顶部“帮助中心”：

```js
await page.getByRole('button',{ name:'帮助中心', exact:true }).click();
const nav = await page.locator('.help-library__nav').innerText();
for (const title of ['渠道与批次使用说明','接口取码接入指南','下载兑换码文件教程']) {
  assert.match(nav,new RegExp(title));
}
await page.getByPlaceholder('搜索帮助文章').fill('追加数量');
await page.getByRole('button',{ name:'搜索', exact:true }).click();
assert.match(await page.locator('.help-library').innerText(),/单次 1[^\n]*100,000|接口凭证与取码地址不变/);
```

Run:

```powershell
node --test --test-name-pattern="帮助中心包含渠道与批次" tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: FAIL，现有文章仍写 API 无数量或停用阻止文件下载。

- [ ] **Step 2: 更新中英文及兜底文章**

在 `managedContent.zh.help.faq`、`managedContent.en.help.faq`、`helpCenter.faq` 的相同文章 ID 中统一以下口径：

```text
channel-distribution-overview：文件批次和 API 批次均有数量；API 可在原批次追加。
channel-api-integration：初始和单次追加均为 1—100,000，追加不改接口或凭证。
channel-file-delivery：待生效、未启用、停用不阻止首次文件生成下载；平台不保留明文。
channel-stop-delivery：停用阻止 API 新取码和 Key 使用，但不阻止文件生成下载。
```

文章 ID、分类和顺序保持不变。

- [ ] **Step 3: 重建离线 Demo**

Run:

```powershell
node "demos/开发者后台一期/build-developer-channel.mjs"
```

Expected: 更新 `13-开发者平台与渠道分销demo.html`，命令退出码为 0。

- [ ] **Step 4: 运行完整回归**

Run:

```powershell
node --test --test-concurrency=1 "tests/developer-backend/publisher-channel-integration.browser.test.mjs" "tests/developer-backend/publisher-account-context.test.mjs" "tests/developer-backend/publisher-access-policy.test.mjs"
```

Expected: 全部测试 PASS，0 FAIL。

- [ ] **Step 5: 视觉验收**

使用 Playwright 以认证通过账号打开 `/P02-01`，检查并保留以下尺寸截图：

```text
1440×900：创建渠道、创建文件批次、创建 API 批次、追加数量、渠道筛选、批次筛选、分销数据筛选。
390×844：创建渠道、创建批次、日期组件、筛选换行。
```

几何验收：抽屉宽 760px；手机端宽等于视口；字段不重叠；筛选最长值完整显示；页面根节点无横向溢出。

- [ ] **Step 6: 最终检查并提交**

Run:

```powershell
git diff --check -- "demos/开发者后台一期/src/fixtures.json" "demos/开发者后台一期/13-开发者平台与渠道分销demo.html" "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
git status --short -- "demos/开发者后台一期/src/fixtures.json" "demos/开发者后台一期/13-开发者平台与渠道分销demo.html" "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
```

仅暂存本计划涉及的文件，不使用 `git add .`：

```powershell
git add -- "demos/开发者后台一期/src/fixtures.json" "demos/开发者后台一期/13-开发者平台与渠道分销demo.html" "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
git commit -m "feat: finalize channel inventory guidance and demo"
```

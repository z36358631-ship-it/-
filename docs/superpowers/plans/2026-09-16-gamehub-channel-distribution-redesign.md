# 盖世游戏渠道分销重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将开发者平台渠道分销重构为“渠道与供货、销售与收益”两个入口，并完整演示渠道创建、API 自动发码接入、文件真实下载、销售清单导入及停止合作清算。

**Architecture:** 保留现有单文件 HTML 构建方式；`publisher-channel-distribution.js` 负责渠道领域状态、页面和弹窗渲染，`app.js` 负责事件、运行时密钥、文件下载和销售清单读取，`templates.js` 只负责两项导航。渠道数据持久化到现有 publisher workspace；明文 Key 和 Secret 只存在于单次运行内存或下载 Blob，不写入 HTML、localStorage 和页面日志。

**Tech Stack:** 原生 JavaScript、HTML/CSS、现有 GameHub Developer Portal 组件、Node.js 构建脚本、Playwright Core、`node:test`。

---

## 文件结构

- `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`：渠道领域默认数据、状态归一化、两个页面及弹窗渲染。
- `demos/开发者后台一期/src/runtime/templates.js`：单游戏控制台的两个渠道入口。
- `demos/开发者后台一期/src/runtime/app.js`：状态更新、真实下载、CSV 导入、帮助中心深链和停止合作动作。
- `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`：桌面、宽屏和手机布局。
- `demos/开发者后台一期/src/fixtures.json`：帮助中心“发行与供给”8篇中英文文章。
- `tests/developer-backend/publisher-channel-integration.browser.test.mjs`：完整浏览器用例与截图证据。
- `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`：由构建脚本生成的离线交付文件。

### Task 1: 先用失败用例锁定新信息架构和旧口径删除

**Files:**
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 将旧“四入口”测试改为“两入口”测试**

```js
test('渠道分销只保留两个入口并删除旧口径', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await openGame(page);
  for (const label of ['渠道与供货', '销售与收益']) {
    await page.getByRole('button', { name:label, exact:true }).waitFor();
  }
  for (const label of ['渠道分销', 'Key 批次', '渠道数据', '收益与结算']) {
    assert.equal(await page.getByRole('button', { name:label, exact:true }).count(), 0);
  }
  const body = await page.locator('[data-publisher-workspace]').innerText();
  assert.doesNotMatch(body, /授权计划|计划额度|剩余额度|地区筛选|提交申请|审核中/);
  await page.close();
});
```

- [ ] **Step 2: 增加渠道状态、API状态和文件批次状态穷举用例**

```js
test('渠道与供货列表覆盖全部业务状态', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await openGame(page);
  await page.getByRole('button', { name:'渠道与供货', exact:true }).click();
  const text = await page.locator('.publisher-channel').innerText();
  for (const value of ['合作中', '已暂停', '清算中', '已停止', '风险暂停']) assert.match(text, new RegExp(value));
  for (const value of ['待生成凭证', '正常', '已暂停', '密钥待重置', '已停用']) assert.match(text, new RegExp(value));
  for (const value of ['生成中', '待下载', '已下载', '已取消', '已到期', '生成失败']) assert.match(text, new RegExp(value));
  await page.close();
});
```

- [ ] **Step 3: 增加静态安全断言**

```js
test('静态交付文件不含固定明文 Key 或 Secret', () => {
  const html = fs.readFileSync(demoFile, 'utf8');
  assert.doesNotMatch(html, /GH26-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
  assert.doesNotMatch(html, /ghs_[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(html, /<iframe\b|<script\s+src=/i);
});
```

- [ ] **Step 4: 运行用例并确认失败原因是旧导航和旧页面**

Run: `node --test tests/developer-backend/publisher-channel-integration.browser.test.mjs`

Expected: FAIL，缺少“渠道与供货／销售与收益”，仍存在旧四入口。

- [ ] **Step 5: 提交测试基线**

```powershell
git add -- 'tests/developer-backend/publisher-channel-integration.browser.test.mjs'
git commit -m 'test: define channel distribution redesign flow'
```

### Task 2: 将单游戏控制台改为两个渠道入口

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/templates.js:263-267`
- Modify: `demos/开发者后台一期/src/runtime/app.js:306,1683`

- [ ] **Step 1: 替换渠道导航定义**

```js
const publisherChannelConsoleSections = [
  ['channel-supply', '渠道与供货', 'key', '渠道 供货 API 文件 Key 合作'],
  ['channel-revenue', '销售与收益', 'finance', '渠道 销售 本体 DLC SKU 退款 拒付 收益'],
];
```

- [ ] **Step 2: 更新工作区允许的 section**

```js
const allowedSections = new Set([
  'release-workspace', 'versions', 'qualifications', 'analytics',
  'channel-supply', 'channel-revenue',
]);
```

同时将点击事件中的数组改为相同值；旧的 `channel-overview`、`channel-batches`、`channel-data`、`channel-settlement` 不再可恢复。

- [ ] **Step 3: 给旧持久化状态提供单向迁移**

```js
const legacyChannelSections = new Set(['channel-overview', 'channel-batches', 'channel-data']);
const normalizedRequestedSection = legacyChannelSections.has(requestedSection)
  ? 'channel-supply'
  : requestedSection === 'channel-settlement'
    ? 'channel-revenue'
    : requestedSection;
```

`gameSection` 使用 `normalizedRequestedSection` 判断，避免旧 localStorage 打开空页。

- [ ] **Step 4: 运行入口测试**

Run: `node --test --test-name-pattern="只保留两个入口" tests/developer-backend/publisher-channel-integration.browser.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交导航改动**

```powershell
git add -- 'demos/开发者后台一期/src/runtime/templates.js' 'demos/开发者后台一期/src/runtime/app.js'
git commit -m 'feat: merge channel distribution navigation'
```

### Task 3: 建立渠道级状态并重写“渠道与供货”

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 在浏览器测试中定义渠道创建双分支**

```js
test('企业开发者可直接创建 API 或文件渠道', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:900 } });
  await openGame(page);
  await page.getByRole('button', { name:'渠道与供货', exact:true }).click();
  await page.getByRole('button', { name:'创建渠道', exact:true }).click();
  const dialog = page.getByRole('dialog', { name:'创建渠道' });
  await dialog.getByLabel('渠道名称').fill('NovaPlay 联运');
  await dialog.getByLabel('销售项').selectOption('BASE-GLOBAL');
  await dialog.getByLabel('供货方式').selectOption('api');
  assert.equal(await dialog.getByLabel('生成数量').count(), 0);
  await dialog.getByRole('button', { name:'创建渠道', exact:true }).click();
  await page.getByText('渠道已创建', { exact:true }).waitFor();
  const row = page.locator('tbody tr').filter({ hasText:'NovaPlay 联运' });
  assert.match(await row.innerText(), /CH-\d{6}[\s\S]*接口自动发码[\s\S]*待生成凭证/);
  await page.close();
});
```

- [ ] **Step 2: 用一个明确对象保存渠道数据**

```js
const createState = source => ({
  activeChannelId: String(source?.activeChannelId || ''),
  dialog: '',
  dialogChannelId: '',
  channels: Array.isArray(source?.channels) && source.channels.length ? source.channels : channelFixtures(),
  fileBatches: Array.isArray(source?.fileBatches) ? source.fileBatches : fileBatchFixtures(),
  sales: Array.isArray(source?.sales) ? source.sales : salesFixtures(),
  downloads: Array.isArray(source?.downloads) ? source.downloads : [],
});
```

每个渠道固定字段为 `id,name,delivery,productIds,status,credentialStatus,issued,sold,redeemed,lastDeliveredAt`；`delivery` 仅允许 `api` 或 `file`，不包含地区。

- [ ] **Step 3: 让 publisher workspace 初始化渠道状态**

```js
const channelDistribution = window.PublisherChannelDistribution?.createState(
  restoredPublisherWorkspace.channelDistribution || {},
);
```

并放入 `createPublisherWorkspaceState()` 返回值。页面每次更新仍走现有 `updatePublisherWorkspace()`，因此刷新后渠道名、状态、批次记录仍可恢复。

- [ ] **Step 4: 新建渠道创建弹窗**

```js
const renderCreateChannelDialog = (language, state) => {
  const body = `<form class="publisher-channel-form" data-channel-create-form><label><span>${tx(language,'渠道名称','Channel name')}</span><input maxlength="50" aria-label="${tx(language,'渠道名称','Channel name')}" data-channel-name><em data-channel-name-error></em></label><label><span>${tx(language,'销售项','Product')}</span><select aria-label="${tx(language,'销售项','Product')}" data-channel-product><option value="BASE-GLOBAL">星海远征 · 本体 · BASE-GLOBAL</option><option value="DLC-SEASON-01">远航季票 · DLC · DLC-SEASON-01</option></select></label><label><span>${tx(language,'供货方式','Supply method')}</span><select aria-label="${tx(language,'供货方式','Supply method')}" data-channel-delivery><option value="api">${tx(language,'接口自动发码','Automatic Key API')}</option><option value="file">${tx(language,'下载兑换码文件','Download Key file')}</option></select><small>${tx(language,'文件渠道创建后，再按实际需要创建兑换码文件。','For file supply, create Key files as needed after creating the channel.')}</small></label></form>`;
  return dialogShell(language,'channel-create-title',tx(language,'创建渠道','Create channel'),body,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(tx(language,'创建渠道','Create channel'),'channel-create-submit')}`);
};
```

- [ ] **Step 5: 渲染渠道级列表和明确操作**

列固定为：渠道名称／编号、销售项、供货方式、合作状态、API或文件状态、已发放、已售、已兑换、最近供货时间、操作。操作只用“管理接入、创建文件、查看下载记录、暂停、恢复、停止合作、查看异常”，删除通用“查看详情”。

- [ ] **Step 6: 运行渠道创建和状态用例**

Run: `node --test --test-name-pattern="企业开发者可直接创建|覆盖全部业务状态" tests/developer-backend/publisher-channel-integration.browser.test.mjs`

Expected: PASS。

- [ ] **Step 7: 提交渠道级模型和列表**

```powershell
git add -- 'demos/开发者后台一期/src/runtime/publisher-channel-distribution.js' 'demos/开发者后台一期/src/runtime/app.js' 'tests/developer-backend/publisher-channel-integration.browser.test.mjs'
git commit -m 'feat: manage distribution by channel'
```

### Task 4: 完成 API 接入、轮换、暂停和帮助中心深链

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 增加 API 无数量和一次性 Secret 用例**

```js
test('API 渠道无数量额度并可生成和轮换凭证', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await openGame(page);
  await page.getByRole('button', { name:'渠道与供货', exact:true }).click();
  const row = page.locator('tbody tr').filter({ hasText:'NovaPlay Store' });
  await row.getByRole('button', { name:'管理接入', exact:true }).click();
  const dialog = page.getByRole('dialog', { name:'API 接入信息' });
  assert.doesNotMatch(await dialog.innerText(), /数量|额度|剩余|补量/);
  await dialog.getByRole('button', { name:'轮换密钥', exact:true }).click();
  await page.getByRole('dialog', { name:'确认轮换密钥' }).getByRole('button', { name:'确认轮换', exact:true }).click();
  await page.getByText('Secret 仅显示一次', { exact:true }).waitFor();
  await page.close();
});
```

- [ ] **Step 2: 运行时生成凭证，禁止持久化 Secret**

```js
const createChannelSecret = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `ghs_${Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')}`;
};
```

`memory.channelTransientSecret` 仅在创建或轮换后赋值；关闭弹窗立即清空。持久化状态只写 `clientId,secretLast4,credentialStatus,rotatedAt`。

- [ ] **Step 3: 将接口文档按钮改为帮助中心深链**

```js
if (route.id === 'P02-01' && action === 'channel-help-open') {
  toggleHelp(true);
  selectHelpTopic(event.currentTarget.dataset.helpTopic || 'channel-api-integration');
  return;
}
```

业务弹窗仅显示 `client_id`、掩码 Secret、接口地址、状态、最后调用和“查看接入教程”；不再内嵌整篇 API 文档。

- [ ] **Step 4: 运行 API 用例**

Run: `node --test --test-name-pattern="API 渠道" tests/developer-backend/publisher-channel-integration.browser.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交 API 接入**

```powershell
git add -- 'demos/开发者后台一期/src/runtime/publisher-channel-distribution.js' 'demos/开发者后台一期/src/runtime/app.js' 'tests/developer-backend/publisher-channel-integration.browser.test.mjs'
git commit -m 'feat: add channel-level automatic key api'
```

### Task 5: 实现文件批次真实下载和下载记录

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 增加真实下载测试**

```js
test('文件渠道生成运行时 Key 并真实下载 CSV', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:900 }, acceptDownloads:true });
  await openGame(page);
  await page.getByRole('button', { name:'渠道与供货', exact:true }).click();
  const row = page.locator('tbody tr').filter({ hasText:'ArcadeX 文件渠道' });
  await row.getByRole('button', { name:'创建文件', exact:true }).click();
  const dialog = page.getByRole('dialog', { name:'创建兑换码文件' });
  await dialog.getByLabel('生成数量').fill('12');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name:'生成并下载', exact:true }).click(),
  ]);
  assert.match(download.suggestedFilename(), /^gamehub_CH-\d{6}_FB-\d{8}-\d{4}\.csv$/);
  const filePath = await download.path();
  const csv = fs.readFileSync(filePath, 'utf8');
  assert.equal(csv.trim().split(/\r?\n/).length, 13);
  assert.match(csv, /^key,sku_id,valid_until\r?\nGH26-/);
  assert.match(await row.innerText(), /已下载[\s\S]*查看下载记录/);
  await page.close();
});
```

- [ ] **Step 2: 增加运行时 Key 和 CSV 生成函数**

```js
const createDemoKey = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, value => alphabet[value % alphabet.length]).join('');
  return `GH26-${token.slice(0,4)}-${token.slice(4,8)}-${token.slice(8,12)}`;
};
const fingerprintKey = async value => {
  const bytes = new TextEncoder().encode(value.trim());
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
};
const createKeyFile = async ({ quantity, skuId, validUntil }) => {
  const keys = Array.from({ length:quantity }, createDemoKey);
  const content = ['key,sku_id,valid_until', ...keys.map(key => `${key},${skuId},${validUntil}`)].join('\r\n');
  const keyFingerprints = await Promise.all(keys.map(fingerprintKey));
  return { content, keyFingerprints };
};
```

- [ ] **Step 3: 下载时只持久化审计摘要**

```js
const record = {
  id: `DL-${dateToken}-${String(downloads.length + 1).padStart(4, '0')}`,
  channelId,
  batchId,
  fileName,
  quantity,
  keyFingerprints,
  downloadedAt:now,
  downloadedBy:'当前开发者',
  downloadCount:1,
};
```

状态中不保存生成的 Key 数组或 CSV，只保存每个 Key 的 SHA-256 指纹，用于后续销售清单归属校验。首次下载后按钮改为“查看下载记录”，不提供再次生成不同内容的下载；正式系统从受控文件存储保留原文件。

- [ ] **Step 4: 数量校验只表达技术限制**

数量必须为正整数；大于 `10000` 时显示“当前单文件最多生成 10,000 个，请拆分文件”，页面不出现额度、审批或补量。

- [ ] **Step 5: 运行下载测试**

Run: `node --test --test-name-pattern="真实下载 CSV" tests/developer-backend/publisher-channel-integration.browser.test.mjs`

Expected: PASS，测试临时目录内存在12条随机 Key。

- [ ] **Step 6: 提交文件供货**

```powershell
git add -- 'demos/开发者后台一期/src/runtime/publisher-channel-distribution.js' 'demos/开发者后台一期/src/runtime/app.js' 'tests/developer-backend/publisher-channel-integration.browser.test.mjs'
git commit -m 'feat: download channel key files'
```

### Task 6: 完成暂停、恢复、停止合作和30天清算

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 增加停止合作用例**

```js
test('停止合作后进入清算并保留存量 Key 权益', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await openGame(page);
  await page.getByRole('button', { name:'渠道与供货', exact:true }).click();
  const row = page.locator('tbody tr').filter({ hasText:'NovaPlay Store' });
  await row.getByRole('button', { name:'停止合作', exact:true }).click();
  const dialog = page.getByRole('dialog', { name:'停止渠道合作' });
  const text = await dialog.innerText();
  for (const value of ['立即停止新发码', '未下载文件取消', '已下载 Key 不回库', '已售未兑换继续有效', '30 个自然日']) assert.match(text, new RegExp(value));
  await dialog.getByLabel('我已了解停止合作后的影响').check();
  await dialog.getByRole('button', { name:'确认停止合作', exact:true }).click();
  assert.match(await row.innerText(), /清算中/);
  assert.equal(await row.getByRole('button', { name:'管理接入', exact:true }).count(), 0);
  await page.close();
});
```

- [ ] **Step 2: 停止合作弹窗只做一次必要确认**

弹窗展示：停止时间、清算截止日、API已发未兑数、文件已暴露数、已售未兑数、已兑数、待补报数、待调整数。确认按钮在勾选影响说明前禁用。

- [ ] **Step 3: 落实状态转换**

```js
const nextChannel = {
  ...channel,
  status:'clearing',
  stoppedAt:now,
  clearingUntil:addDays(now, 30),
  credentialStatus:channel.delivery === 'api' ? 'disabled' : channel.credentialStatus,
};
const nextBatches = state.fileBatches.map(batch => batch.channelId === channel.id && batch.status === 'ready'
  ? { ...batch, status:'cancelled', cancelledAt:now }
  : batch);
```

暂停只阻止新供货，可恢复；风险暂停只作为平台状态演示，开发者无恢复按钮；已停止记录只读。

- [ ] **Step 4: 运行停止合作用例**

Run: `node --test --test-name-pattern="停止合作" tests/developer-backend/publisher-channel-integration.browser.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交合作状态机**

```powershell
git add -- 'demos/开发者后台一期/src/runtime/publisher-channel-distribution.js' 'demos/开发者后台一期/src/runtime/app.js' 'tests/developer-backend/publisher-channel-integration.browser.test.mjs'
git commit -m 'feat: settle stopped channel partnerships'
```

### Task 7: 重写“销售与收益”并支持文件渠道导入

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 增加分组口径和无数据用例**

```js
test('销售与收益按渠道销售项SKU币种分组且不虚构文件渠道金额', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await openGame(page);
  await page.getByRole('button', { name:'销售与收益', exact:true }).click();
  const table = page.locator('.publisher-channel-table');
  for (const heading of ['渠道', '销售项', 'SKU', '币种', '销量', '退款', '拒付', '销售额', '销售净额', '预估收益', '数据状态']) {
    await table.getByRole('columnheader', { name:heading, exact:true }).waitFor();
  }
  const fileRow = table.locator('tbody tr').filter({ hasText:'ArcadeX 文件渠道' });
  assert.match(await fileRow.innerText(), /待导入[\s\S]*—[\s\S]*—[\s\S]*—/);
  assert.doesNotMatch(await page.locator('.publisher-channel').innerText(), /应结算|正式账单|已打款|地区/);
  await page.close();
});
```

- [ ] **Step 2: 增加 CSV 导入测试**

```js
test('文件渠道导入销售清单后更新销售与预估收益', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:900 }, acceptDownloads:true });
  await openGame(page);
  await page.getByRole('button', { name:'渠道与供货', exact:true }).click();
  const supplyRow = page.locator('tbody tr').filter({ hasText:'ArcadeX 文件渠道' });
  await supplyRow.getByRole('button', { name:'创建文件', exact:true }).click();
  const fileDialog = page.getByRole('dialog', { name:'创建兑换码文件' });
  await fileDialog.getByLabel('生成数量').fill('2');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    fileDialog.getByRole('button', { name:'生成并下载', exact:true }).click(),
  ]);
  const keyLines = fs.readFileSync(await download.path(), 'utf8').trim().split(/\r?\n/).slice(1);
  const [firstKey, secondKey] = keyLines.map(line => line.split(',')[0]);
  await page.getByRole('button', { name:'销售与收益', exact:true }).click();
  const csv = [
    'channel_order_id,key,sku_id,amount,currency,sold_at,event',
    `AX-001,${firstKey},BASE-GLOBAL,12.99,USD,2026-09-16 09:00,sale`,
    `AX-002,${secondKey},BASE-GLOBAL,12.99,USD,2026-09-16 09:10,sale`,
  ].join('\n');
  await page.locator('[data-channel-sales-file]').setInputFiles({ name:'arcadex-sales.csv', mimeType:'text/csv', buffer:Buffer.from(csv) });
  await page.getByText('已导入 2 条销售记录', { exact:true }).waitFor();
  const row = page.locator('tbody tr').filter({ hasText:'ArcadeX 文件渠道' });
  assert.match(await row.innerText(), /2[\s\S]*USD 25\.98[\s\S]*已更新/);
  await page.close();
});
```

- [ ] **Step 3: 校验并聚合导入数据**

必填列固定为 `channel_order_id,key,sku_id,amount,currency,sold_at,event`。`event` 仅允许 `sale/refund/chargeback`；相同渠道订单和事件重复导入时跳过，不重复计数。逐行调用 Task 5 的 `fingerprintKey()` 与对应文件批次的 `keyFingerprints` 比对；Key 仅用于归属校验，状态中保存 `keyFingerprint`，不保存原值。

- [ ] **Step 4: 计算并展示口径**

`salesAmount = sale金额合计`；`netAmount = sale - refund - chargeback - tax`；有分成规则才计算 `estimatedRevenue`，否则显示“—”。不同币种始终分行，顶部汇总按币种拆成独立卡片，不跨币种相加。

- [ ] **Step 5: 运行收益用例**

Run: `node --test --test-name-pattern="销售与收益|导入销售清单" tests/developer-backend/publisher-channel-integration.browser.test.mjs`

Expected: PASS。

- [ ] **Step 6: 提交销售与收益**

```powershell
git add -- 'demos/开发者后台一期/src/runtime/publisher-channel-distribution.js' 'demos/开发者后台一期/src/runtime/app.js' 'tests/developer-backend/publisher-channel-integration.browser.test.mjs'
git commit -m 'feat: report channel sales and estimated revenue'
```

### Task 8: 在帮助中心加入“发行与供给”8篇教程

**Files:**
- Modify: `demos/开发者后台一期/src/fixtures.json:602-700`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 增加帮助中心搜索和深链用例**

```js
test('帮助中心包含发行与供给教程并可搜索', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:900 } });
  await openGame(page);
  await page.getByRole('button', { name:'渠道与供货', exact:true }).click();
  await page.getByRole('button', { name:'查看接入教程', exact:true }).first().click();
  await page.getByRole('heading', { name:'接口自动发码接入指南', exact:true }).waitFor();
  const nav = await page.locator('.help-library__nav').innerText();
  for (const title of ['渠道分销使用说明', '接口自动发码接入指南', 'API 鉴权、发码、查询与错误码', '下载兑换码文件教程', '销售、退款和拒付回传说明', '文件渠道销售清单导入说明', '停止合作与剩余 Key 处理', '渠道销售与收益数据口径']) assert.match(nav, new RegExp(title));
  await page.getByPlaceholder('搜索帮助文章').fill('幂等');
  await page.getByRole('button', { name:'搜索', exact:true }).click();
  await page.getByRole('heading', { name:/API 鉴权、发码、查询与错误码/ }).waitFor();
  await page.close();
});
```

- [ ] **Step 2: 新增固定文章 ID**

```json
[
  "channel-distribution-overview",
  "channel-api-integration",
  "channel-api-reference",
  "channel-file-delivery",
  "channel-sales-events",
  "channel-sales-import",
  "channel-stop-clearing",
  "channel-revenue-metrics"
]
```

8篇中文文章写入 `managedContent.zh.help.faq`，英文对照写入 `managedContent.en.help.faq`，ID 保持一致；中文 `category` 为“发行与供给”，英文为“Publishing & supply”。正文分别说明适用场景、操作步骤、状态结果和异常处理。`helpCenter.faq` 同步中文兜底数据；运营后台界面仍用中文，只把英文配置用于英文开发者端。

- [ ] **Step 3: 运行帮助中心用例**

Run: `node --test --test-name-pattern="帮助中心包含发行与供给" tests/developer-backend/publisher-channel-integration.browser.test.mjs`

Expected: PASS。

- [ ] **Step 4: 提交教程**

```powershell
git add -- 'demos/开发者后台一期/src/fixtures.json' 'tests/developer-backend/publisher-channel-integration.browser.test.mjs'
git commit -m 'docs: add channel supply help articles'
```

### Task 9: 完成响应式布局、可访问性和视觉验收

**Files:**
- Modify: `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`
- Create: `tests/developer-backend/evidence/gamehub-channel-distribution-redesign/*.png`

- [ ] **Step 1: 收紧页面层级并适配宽屏**

```css
.publisher-channel{width:100%;max-width:1600px;margin:0 auto;display:grid;gap:20px;min-width:0}
.publisher-channel-head{display:flex;align-items:center;justify-content:space-between;gap:24px}
.publisher-channel-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
.publisher-channel-table-wrap{max-width:100%;overflow:auto;border:1px solid var(--line);border-radius:var(--radius-sm)}
.publisher-channel-table{width:100%;min-width:980px;border-collapse:collapse}
.publisher-channel-row-title{display:grid;gap:4px;min-width:150px}
.publisher-channel-row-title small{color:var(--text-secondary)}
```

- [ ] **Step 2: 手机端改为卡片式操作区，不让根节点横向滚动**

```css
@media(max-width:620px){
  .publisher-channel{gap:14px}
  .publisher-channel-head,.publisher-channel-card>header,.publisher-channel-notice{align-items:stretch;flex-direction:column}
  .publisher-channel-head__actions,.publisher-channel-head__actions button{width:100%}
  .publisher-channel-metrics{grid-template-columns:1fr 1fr}
  .publisher-channel-card{padding:14px}
  .publisher-channel-dialog-layer{padding:8px;place-items:end center}
  .publisher-channel-dialog,.publisher-channel-dialog.is-wide{width:100%;max-height:calc(100dvh - 16px);border-radius:16px 16px 0 0}
  .publisher-channel-dialog>footer{display:grid;grid-template-columns:1fr}
}
@media(max-width:380px){.publisher-channel-metrics{grid-template-columns:1fr}}
```

- [ ] **Step 3: 添加320、390、1280、1440四种宽度用例**

```js
for (const width of [320, 390, 1280, 1440]) {
  const page = await browser.newPage({ viewport:{ width, height:900 } });
  await openGame(page);
  for (const section of ['渠道与供货', '销售与收益']) {
    await page.getByRole('button', { name:section, exact:true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, `${width}px ${section} 根节点溢出`);
  }
  await page.close();
}
```

- [ ] **Step 4: 输出视觉证据**

截图固定为：

- `channel-supply-1440.png`
- `channel-create-api-1280.png`
- `channel-api-access-1440.png`
- `channel-file-download-390.png`
- `channel-stop-clearing-1280.png`
- `channel-revenue-1440.png`
- `channel-revenue-320.png`
- `channel-help-api-390.png`

- [ ] **Step 5: 运行完整浏览器测试**

Run: `node --test tests/developer-backend/publisher-channel-integration.browser.test.mjs`

Expected: 0 failures，生成8张截图。

- [ ] **Step 6: 提交样式和证据**

```powershell
git add -- 'demos/开发者后台一期/src/styles/publisher-channel-distribution.css' 'tests/developer-backend/publisher-channel-integration.browser.test.mjs' 'tests/developer-backend/evidence/gamehub-channel-distribution-redesign'
git commit -m 'test: verify responsive channel distribution demo'
```

### Task 10: 构建单文件 Demo 并做最终回归

**Files:**
- Modify: `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`
- Verify: `demos/开发者后台一期/build-developer-channel.mjs`

- [ ] **Step 1: 构建离线 HTML**

Run: `node demos/开发者后台一期/build-developer-channel.mjs`

Expected: `Built 13-开发者平台与渠道分销demo.html with the committed stable data-dashboard runtime.`

- [ ] **Step 2: 运行语法与静态检查**

Run: `node --check demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`

Expected: exit code 0。

Run: `rg -n "授权计划|剩余额度|单次申请上限 1,000|地区筛选|批次申请已拒绝|批次审核中" demos/开发者后台一期/src/runtime/publisher-channel-distribution.js demos/开发者后台一期/13-开发者平台与渠道分销demo.html`

Expected: 无匹配。

- [ ] **Step 3: 运行渠道测试和已有开发者平台关键回归**

Run: `node --test tests/developer-backend/publisher-channel-integration.browser.test.mjs tests/developer-backend/publisher-access-policy.test.mjs tests/developer-backend/publisher-account-context.test.mjs`

Expected: 0 failures。

- [ ] **Step 4: 检查本任务文件差异，不带入工作区无关改动**

Run: `git diff --check -- demos/开发者后台一期/src/runtime/publisher-channel-distribution.js demos/开发者后台一期/src/runtime/templates.js demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/src/styles/publisher-channel-distribution.css demos/开发者后台一期/src/fixtures.json demos/开发者后台一期/13-开发者平台与渠道分销demo.html tests/developer-backend/publisher-channel-integration.browser.test.mjs`

Expected: 无 whitespace error。

- [ ] **Step 5: 提交构建产物**

```powershell
git add -- 'demos/开发者后台一期/13-开发者平台与渠道分销demo.html'
git commit -m 'build: refresh channel distribution demo'
```

- [ ] **Step 6: 交付本地地址**

本地文件：`C:\Users\z3635\官网改动\demos\开发者后台一期\13-开发者平台与渠道分销demo.html`

本地预览：由工作区静态服务生成，默认路由 `#/P02-01`；远端预览需在用户明确要求推送 Git 后再生成 commit 固定地址。

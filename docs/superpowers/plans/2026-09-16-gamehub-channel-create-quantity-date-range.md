# GameHub Channel Quantity and Date Range Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在渠道分销 Demo 中补齐创建文件渠道的首批兑换码数量，并将日期筛选统一为双月日期范围控件。

**Architecture:** 继续使用现有 `PublisherChannelDistribution` 渲染器和 `app.js` 事件委托。日期组件只负责选择并写回隐藏的开始、结束值；筛选仍由现有 `rangeOverlaps()` 处理。创建文件渠道复用现有安全随机 Key、CSV 下载、指纹和汇总逻辑，确保生成失败时不留下渠道或批次。

**Tech Stack:** 原生 JavaScript、CSS、Node.js 单文件构建、Playwright、Node test runner。

---

## 文件职责

- `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`：日期范围组件、筛选区和创建渠道弹窗。
- `demos/开发者后台一期/src/runtime/app.js`：日期选择交互、创建文件渠道与首批下载。
- `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`：图 3 式双月日历及响应式布局。
- `tests/developer-backend/publisher-channel-integration.browser.test.mjs`：数量、日期、下载和文案回归。
- `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`：构建后的离线 Demo。

### Task 1: 用失败测试锁定数量和日期行为

**Files:**
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 增加单一日期范围控件测试**

```js
test('渠道列表、文件批次和分销数据统一使用日期范围控件',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  assert.equal(await page.getByLabel('生效时间范围').count(),1);
  assert.equal(await page.getByLabel('生效开始日期').count(),0);
  await page.getByLabel('生效时间范围').click();
  await page.getByRole('dialog',{name:'选择时间范围'}).waitFor();
  await page.getByRole('button',{name:'近 30 天',exact:true}).click();
  await page.getByRole('button',{name:'应用',exact:true}).click();
  assert.match(await page.getByLabel('生效时间范围').innerText(),/2026-08-18.*2026-09-16/);
  await page.close();
});
```

- [ ] **Step 2: 增加创建文件渠道首批数量测试**

```js
test('创建文件渠道填写首批数量并立即下载',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
  await openGame(page);await openSection(page,'渠道与供货');
  await page.getByRole('button',{name:'创建渠道',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建渠道'});
  await dialog.getByLabel('渠道名称').fill('测试文件渠道');
  await dialog.getByLabel('供货方式').selectOption('file');
  await dialog.getByLabel('首批兑换码数量').fill('12');
  const [download]=await Promise.all([page.waitForEvent('download'),dialog.getByRole('button',{name:'创建并下载',exact:true}).click()]);
  const csv=fs.readFileSync(await download.path(),'utf8');
  assert.equal(csv.trim().split(/\r?\n/).length,13);
  assert.match(await page.locator('.publisher-channel-table--channels').innerText(),/测试文件渠道/);
  await page.close();
});
```

- [ ] **Step 3: 增加数量边界与文案测试**

```js
test('首批数量只允许1到100000且渠道标签不冒充平台核验',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  await page.getByRole('button',{name:'创建渠道',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建渠道'});
  await dialog.getByLabel('渠道名称').fill('超量渠道');
  await dialog.getByLabel('供货方式').selectOption('file');
  await dialog.getByLabel('首批兑换码数量').fill('100001');
  await dialog.getByRole('button',{name:'创建并下载',exact:true}).click();
  await dialog.getByText('请输入 1—100,000 的整数').waitFor();
  const body=await page.locator('.publisher-channel').innerText();
  for(const removed of ['数据口径','平台已核验渠道','已交付渠道']) assert.doesNotMatch(body,new RegExp(removed));
  await page.close();
});
```

- [ ] **Step 4: 运行用例并确认失败**

Run:

```powershell
node --test --test-name-pattern="统一使用日期范围控件|首批数量" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: FAIL，页面仍是两个原生日期框，创建渠道没有数量字段。

### Task 2: 实现统一日期范围组件

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 在渲染器中增加受控组件**

```js
const dateRangeField=({language,scope,label,start,end,showPresets=true,longTerm=false})=>`<div class="publisher-date-range" data-channel-date-range="${e(scope)}"><span>${e(label)}</span><button type="button" class="publisher-date-range__trigger" aria-label="${e(label)}" data-portal-action="channel-date-open" data-date-scope="${e(scope)}"><span data-date-range-value>${e(start&&end?`${start} → ${end}`:start||tx(language,'请选择','Select'))}</span><b aria-hidden="true">▣</b></button><input type="hidden" value="${e(start)}" data-channel-filter-start><input type="hidden" value="${e(end)}" data-channel-filter-end><div class="publisher-date-range__popover" role="dialog" aria-label="${tx(language,'选择时间范围','Select date range')}" hidden data-date-popover></div></div>`;
```

`filterBar()` 改为一个日期范围字段；渠道、批次和分销筛选均设置 `showPresets=true`。创建渠道使用相同触发器，设置 `showPresets=false`、`longTerm=true`。

- [ ] **Step 2: 在 `app.js` 实现日历事件**

增加 `channel-date-open`、`channel-date-nav`、`channel-date-preset`、`channel-date-day`、`channel-date-apply` 和 `channel-date-cancel`。使用本地状态保存草稿起止日期；“取消”和点击浮层外不写回，应用后更新隐藏值与触发器文案。

快捷值以 Demo 日期 `2026-09-16` 计算：昨日 `2026-09-15`、今日 `2026-09-16`、近 7 天 `2026-09-10 → 2026-09-16`、近 30 天 `2026-08-18 → 2026-09-16`、上月 `2026-08-01 → 2026-08-31`、本月 `2026-09-01 → 2026-09-16`。

- [ ] **Step 3: 保持原筛选接口不变**

```js
const filters=action==='channel-filter-reset'?defaults:{
  channelId:String(form?.querySelector('[data-channel-filter-keyword]')?.value||'').trim(),
  start:String(form?.querySelector('[data-channel-filter-start]')?.value||''),
  end:String(form?.querySelector('[data-channel-filter-end]')?.value||''),
};
```

创建渠道开始日转换为 `T00:00`，结束日转换为 `T23:59`；“长期有效”写入空结束时间。同一天有效，结束日早于开始日才报错。

- [ ] **Step 4: 增加图 3 式样式**

桌面端使用左侧快捷栏加右侧双月日历；选中日为品牌黄色，区间使用浅黄色。小于 720px 时快捷栏改为横向滚动，双月改为单月，弹层宽度不超过视口。

- [ ] **Step 5: 运行日期测试**

Run:

```powershell
node --check "demos\开发者后台一期\src\runtime\publisher-channel-distribution.js"
node --check "demos\开发者后台一期\src\runtime\app.js"
node --test --test-name-pattern="统一使用日期范围控件|生效时间筛选" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: PASS。

### Task 3: 创建文件渠道时生成首批 CSV

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 根据供货方式显示数量**

创建弹窗增加 `data-channel-first-batch-fields`。选择文件供货时显示“首批兑换码数量”和 `1—100,000` 说明，按钮显示“创建并下载”；选择 API 时隐藏数量且按钮显示“创建渠道”。

- [ ] **Step 2: 抽取并复用文件生成函数**

```js
const generateAndDownloadChannelFile=async({channel,batchId,skuId,quantity,validUntil})=>{
  const generated=await buildChannelKeyFile({quantity,skuId,validUntil});
  const fileName=`盖世游戏兑换码_${safeFileNamePart(channel.name)}_${batchId}.csv`;
  downloadTextFile(fileName,generated.content,'text/csv;charset=utf-8');
  return {...generated,fileName};
};
```

现有“创建兑换码文件”和“创建文件渠道首批文件”均调用该函数，不复制 Key 生成逻辑。

- [ ] **Step 3: 保证创建原子性**

文件供货提交时先校验数量，再生成及触发下载；成功后一次写入渠道、文件批次、下载记录和 `keyMetrics`。生成失败只在弹窗显示失败提示，不写入渠道或批次。API 渠道保持原创建流程。

- [ ] **Step 4: 修正状态语义**

渠道名继续由开发者自定义，只用于分类。页面和帮助内容不使用“平台已核验渠道”或“已交付渠道”；文件状态仅为“已下载”。本期不增加成员权限、二次验证、PGP 或渠道账号。

- [ ] **Step 5: 运行文件创建测试**

Run:

```powershell
node --test --test-name-pattern="创建文件渠道填写首批数量|首批数量只允许" "tests\developer-backend\publisher-channel-integration.browser.test.mjs"
```

Expected: PASS，下载 CSV 行数等于数量加表头，页面和持久化状态不包含固定明文 Key。

### Task 4: 移除数据口径入口并完成回归

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/fixtures.json`
- Modify: `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 删除页面入口**

`renderRevenue()` 使用无操作区的页头：

```js
return `${head(tx(language,'分销数据','Distribution data'))}${filters}${metricCards}...`;
```

帮助中心继续保留 `channel-key-metrics`，仅移除业务页右上角入口。

- [ ] **Step 2: 更新帮助文案中的状态名称**

把“已交付 Key”统一改为“已下载文件中的 Key”，明确渠道名称由开发者自定义，平台不核验渠道身份或收件结果。

- [ ] **Step 3: 重建离线 Demo**

Run:

```powershell
node "demos\开发者后台一期\build-developer-channel.mjs"
```

Expected: 成功生成 `13-开发者平台与渠道分销demo.html`。

- [ ] **Step 4: 运行完整回归和静态检查**

Run:

```powershell
node --test "tests\developer-backend\publisher-channel-integration.browser.test.mjs" "tests\developer-backend\publisher-access-policy.test.mjs" "tests\developer-backend\publisher-account-context.test.mjs"
rg -n "平台已核验渠道|已交付渠道|数据口径" "demos\开发者后台一期\src\runtime\publisher-channel-distribution.js"
git diff --check -- "demos/开发者后台一期/src/runtime/publisher-channel-distribution.js" "demos/开发者后台一期/src/runtime/app.js" "demos/开发者后台一期/src/styles/publisher-channel-distribution.css" "demos/开发者后台一期/src/fixtures.json" "demos/开发者后台一期/13-开发者平台与渠道分销demo.html" "tests/developer-backend/publisher-channel-integration.browser.test.mjs"
```

Expected: 测试 0 失败；页面渲染器无禁用文案；diff 检查无错误。

## 最终验收

- 创建文件渠道时必须填写首批数量，范围为 1～100,000；API 渠道不显示数量。
- 文件渠道创建成功后立即下载首批 CSV，并新增渠道、批次、下载记录及发放数据。
- 渠道管理、文件批次和分销数据使用同一日期范围控件。
- 创建渠道使用同款双月日历，支持未来日期和长期有效。
- 分销数据页不显示“数据口径”入口，帮助中心文章保留。
- 渠道只是开发者自定义标签；页面不宣称已核验或已交付第三方。
- 不增加权限体系、下载二次验证、PGP、公钥或渠道账号。

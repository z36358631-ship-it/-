import test, { after, afterEach, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demoDir = path.join(root, 'demos', '开发者后台一期');
const baseDemo = path.join(demoDir, '发行平台运营后台demo.html');
const outputDemo = path.join(demoDir, '发行平台运营后台财务整合demo.html');
const buildScript = path.join(demoDir, 'build-finance-operations.mjs');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

let browser;
let page;
let baseBefore;

const demoUrl = hash => {
  const target = pathToFileURL(outputDemo);
  target.hash = hash;
  target.searchParams.set('testRun', `${Date.now()}-${Math.random()}`);
  return target.href;
};

async function openFinance(hash = '/P16-01') {
  await page.goto(demoUrl(hash), { waitUntil:'load' });
  await page.locator('[data-finance-operations]').waitFor();
}

before(() => {
  assert.ok(chrome, 'Chrome or Edge not found');
  baseBefore = fs.readFileSync(baseDemo);
  execFileSync(process.execPath, [buildScript], { stdio:'pipe' });
});

before(async () => {
  browser = await chromium.launch({ headless:true, executablePath:chrome, args:['--allow-file-access-from-files','--disable-background-networking'] });
});

beforeEach(async () => {
  page = await browser.newPage({ viewport:{ width:1440, height:900 }, acceptDownloads:true });
});

afterEach(async () => {
  await page?.close();
  page = null;
});

after(async () => {
  await browser?.close();
});

test('运营财务整合版新增独立入口且不覆盖原运营后台', async () => {
  assert.deepEqual(fs.readFileSync(baseDemo), baseBefore);
  const html = fs.readFileSync(outputDemo, 'utf8');
  assert.match(html, /P16-01/);
  assert.doesNotMatch(html, /<iframe|<script[^>]+src=|<link[^>]+stylesheet/i);

  await openFinance();
  assert.deepEqual(await page.locator('.side-nav .nav-item').allTextContents(), ['企业认证内容配置','帮助中心','发行审核','财务结算']);
  assert.match(await page.locator('[data-fo-breadcrumb]').innerText(), /发行平台后台\s*\/\s*财务结算/);
  assert.equal(await page.getByRole('heading', { level:1, name:'财务结算' }).count(), 1);
  assert.deepEqual(await page.locator('[data-fo-tab]').allTextContents(), ['待付款记录','打款批次']);
});

test('待付款记录每页20条并区分可付款和阻塞原因', async () => {
  await openFinance();
  assert.equal(await page.locator('[data-fo-statement-row]').count(), 20);
  assert.match(await page.locator('[data-fo-pagination]').innerText(), /共 26 条，每页 20 条/);
  assert.equal(await page.locator('[data-fo-select-statement]:not([disabled])').count() > 0, true);
  assert.equal(await page.locator('[data-fo-select-statement][disabled]').count() > 0, true);
  assert.match(await page.locator('[data-fo-statement-row]').nth(1).innerText(), /发票待审核|主体资料变更中|已进入打款批次/);
});

test('跨主体或币种选择自动拆批并生成CSV', async () => {
  await openFinance();
  for (const id of ['STMT-2026-08-V1','STMT-2026-07-V1','STMT-2026-06-V1']) {
    await page.locator(`[data-fo-select-statement="${id}"]`).check();
  }
  await page.getByRole('button', { name:'生成并导出打款批次' }).click();
  const dialog = page.getByRole('dialog');
  assert.match(await dialog.innerText(), /已选 3 条/);
  assert.match(await dialog.innerText(), /将生成 2 个打款批次/);
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name:'确认生成并导出' }).click();
  await downloadPromise;
  assert.equal(await page.locator('[data-fo-tab="batches"]').getAttribute('aria-selected'), 'true');
  assert.equal(await page.getByRole('dialog').count(), 1);
  assert.match(await page.getByRole('dialog').innerText(), /已导出待财务/);
});

test('打款批次每页20条且详情使用单层右侧抽屉', async () => {
  await openFinance();
  await page.locator('[data-fo-tab="batches"]').click();
  assert.equal(await page.locator('[data-fo-batch-row]').count(), 20);
  assert.match(await page.locator('[data-fo-pagination]').innerText(), /共 24 条，每页 20 条/);
  await page.locator('[data-fo-open-batch="PAYB-202609-004"]').click();
  assert.equal(await page.getByRole('dialog').count(), 1);
  const detail = await page.getByRole('dialog').innerText();
  for (const copy of ['批次概要','付款单','导出记录','操作记录']) assert.match(detail, new RegExp(copy));
});

test('失败付款可在原付款单追加重试记录', async () => {
  await openFinance();
  await page.locator('[data-fo-tab="batches"]').click();
  await page.locator('[data-fo-open-batch="PAYB-202609-004"]').click();
  await page.getByRole('button', { name:'回填付款结果' }).click();
  assert.equal(await page.getByRole('dialog').count(), 1);
  await page.getByLabel('付款结果').selectOption('failed');
  await page.getByLabel('失败、退回或暂缓原因').fill('收款行退回，需核对账户信息');
  await page.getByRole('button', { name:'提交结果' }).click();
  assert.match(await page.getByRole('dialog').innerText(), /第 2 次付款尝试/);
  assert.match(await page.getByRole('dialog').innerText(), /平台运营 李然/);
});

test('初次回填从第1次开始且筛选后清空选择', async () => {
  await openFinance();
  await page.locator('[data-fo-select-statement]:not([disabled])').first().check();
  assert.match(await page.locator('.fo-bulk').innerText(), /已选 1 条/);
  await page.locator('[data-fo-filter="statement-currency"]').selectOption('CNY');
  await page.getByRole('button', { name:'查询' }).click();
  assert.match(await page.locator('.fo-bulk').innerText(), /已选 0 条/);
  assert.equal(await page.getByRole('button', { name:'生成并导出打款批次' }).isDisabled(), true);

  await page.locator('[data-fo-tab="batches"]').click();
  await page.locator('[data-fo-open-batch="PAYB-202609-001"]').click();
  assert.match(await page.getByRole('dialog').innerText(), /尚未登记付款结果/);
  await page.getByRole('button', { name:'登记付款结果' }).click();
  assert.match(await page.getByRole('dialog').innerText(), /当前为第 1 次付款尝试/);
});

test('回填要求复核人、准确金额和付款凭证', async () => {
  await openFinance();
  await page.locator('[data-fo-tab="batches"]').click();
  await page.locator('[data-fo-open-batch="PAYB-202609-001"]').click();
  await page.getByRole('button', { name:'登记付款结果' }).click();
  await page.getByLabel('付款结果').selectOption('completed');
  await page.getByLabel('复核人').fill('');
  await page.getByLabel('实付金额').fill('0.01');
  await page.getByLabel('银行流水号').fill('BANK-TEST-001');
  await page.getByLabel('付款凭证').setInputFiles({ name:'付款回单.pdf', mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.4') });
  await page.getByRole('button', { name:'提交结果' }).click();
  assert.equal(await page.getByText('请填写复核人').isVisible(), true);
  assert.equal(await page.getByText(/实付金额应为/).isVisible(), true);
  assert.match(await page.getByRole('dialog').innerText(), /USD/);
});

test('已进入批次的结算单可回溯且部分完成由多笔付款构成', async () => {
  await openFinance();
  await page.locator('[data-fo-tab="batches"]').click();
  await page.locator('[data-fo-open-batch="PAYB-202609-002"]').click();
  assert.match(await page.getByRole('dialog').innerText(), /STMT-2026-04-V1/);
  await page.locator('.fo-drawer-footer [data-fo-action="close-drawer"]').click();
  await page.locator('[data-fo-open-batch="PAYB-202609-005"]').click();
  assert.equal(await page.locator('.fo-order').count(), 2);
  assert.match(await page.getByRole('dialog').innerText(), /部分完成/);
});

test('默认穷举态并可切换缺省态', async () => {
  await openFinance();
  await page.locator('[data-fo-demo-toggle]').click();
  await page.locator('[data-fo-scenario="empty"]').click();
  assert.equal(await page.getByText('暂无待付款记录').isVisible(), true);
  assert.equal(await page.locator('[data-fo-statement-row]').count(), 0);
  await page.locator('[data-fo-tab="batches"]').click();
  assert.equal(await page.getByText('暂无打款批次').isVisible(), true);
});

for (const viewport of [{ width:1280, height:800 }, { width:390, height:844 }]) {
  test(`${viewport.width}px 页面级无横向溢出`, async () => {
    await page.setViewportSize(viewport);
    await openFinance();
    const dimensions = await page.evaluate(() => ({ client:document.documentElement.clientWidth, scroll:document.documentElement.scrollWidth }));
    assert.equal(dimensions.scroll, dimensions.client);
  });
}

test('390px下批次抽屉与回填表单无页面级溢出', async () => {
  await page.setViewportSize({ width:390, height:844 });
  await openFinance();
  await page.locator('[data-fo-tab="batches"]').click();
  await page.locator('[data-fo-open-batch="PAYB-202609-001"]').click();
  await page.getByRole('button', { name:'登记付款结果' }).click();
  const dimensions = await page.evaluate(() => ({ client:document.documentElement.clientWidth, scroll:document.documentElement.scrollWidth }));
  assert.equal(dimensions.scroll, dimensions.client);
  assert.equal(await page.getByRole('button', { name:'提交结果' }).isVisible(), true);
});

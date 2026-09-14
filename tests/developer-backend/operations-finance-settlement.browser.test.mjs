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

test('财务结算台账独立生成且不覆盖原运营后台', async () => {
  assert.deepEqual(fs.readFileSync(baseDemo), baseBefore);
  const html = fs.readFileSync(outputDemo, 'utf8');
  assert.match(html, /P16-01/);
  assert.doesNotMatch(html, /<iframe|<script[^>]+src=|<link[^>]+stylesheet/i);

  await openFinance();
  assert.deepEqual(await page.locator('.side-nav .nav-item').allTextContents(), ['企业认证内容配置','帮助中心','发行审核','财务结算']);
  assert.match(await page.locator('[data-fo-breadcrumb]').innerText(), /发行平台后台\s*\/\s*财务结算/);
  assert.equal(await page.getByRole('heading', { level:1, name:'财务结算' }).count(), 1);
  assert.equal(await page.getByRole('tab').count(), 0);
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.doesNotMatch(await page.locator('[data-finance-operations]').innerText(), /付款条件|发票待审核|账单尚未锁定|打款批次|付款成功|付款失败|付款凭证/);
});

test('默认按月展示游戏结算明细且每页20条', async () => {
  await openFinance();
  assert.equal(await page.locator('[data-fo-filter="month"]').inputValue(), '2026-08');
  assert.equal(await page.locator('[data-fo-record-row]').count(), 20);
  assert.match(await page.locator('[data-fo-pagination]').innerText(), /共 24 条，每页 20 条/);
  const firstRow = await page.locator('[data-fo-record-row]').first().innerText();
  for (const copy of ['2026-08','星海远征','星海互动','销售','USD']) {
    if (copy === '销售') continue;
    assert.match(firstRow, new RegExp(copy));
  }
  const headers = await page.locator('.fo-table thead th').allTextContents();
  assert.deepEqual(headers.slice(1), ['结算月／记录号','游戏','开发者／财务主体','销售额','退款','平台分成','调整额','应付金额','收款账户','最近导出']);
});

test('分页、筛选和重置保持单表逻辑', async () => {
  await openFinance();
  await page.getByRole('button', { name:'下一页' }).click();
  assert.equal(await page.locator('[data-fo-record-row]').count(), 4);
  await page.locator('[data-fo-select-record]').first().check();
  assert.match(await page.getByRole('button', { name:/导出选中/ }).innerText(), /1/);

  await page.locator('[data-fo-filter="keyword"]').fill('远光');
  await page.getByRole('button', { name:'查询' }).click();
  assert.equal(await page.locator('[data-fo-record-row]').count(), 6);
  assert.equal(await page.getByRole('button', { name:/导出当前结果/ }).count(), 1);
  await page.getByRole('button', { name:'重置' }).click();
  assert.equal(await page.locator('[data-fo-record-row]').count(), 20);
  assert.equal(await page.locator('[data-fo-filter="month"]').inputValue(), '2026-08');
});

test('导出选中记录包含完整收款信息并回写导出记录', async () => {
  await openFinance();
  const rows = page.locator('[data-fo-record-row]');
  await rows.nth(0).locator('[data-fo-select-record]').check();
  await rows.nth(1).locator('[data-fo-select-record]').check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name:'导出选中（2）' }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), '游戏结算表_2026-08.csv');
  const saved = await download.path();
  const csv = fs.readFileSync(saved, 'utf8');
  assert.match(csv, /银行账号/);
  assert.match(csv, /848019237826|012875009066/);
  assert.equal(csv.trim().split(/\r?\n/).length, 3);
  assert.match(await page.locator('[data-fo-record-row]').nth(0).innerText(), /2026-09-14 17:20\s+平台运营 李然/);
  assert.equal(await page.getByRole('button', { name:/导出选中/ }).count(), 0);
});

test('无选择时导出全部筛选结果', async () => {
  await openFinance();
  await page.locator('[data-fo-filter="keyword"]').fill('远光');
  await page.getByRole('button', { name:'查询' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name:'导出当前结果（6）' }).click();
  const download = await downloadPromise;
  const saved = await download.path();
  const csv = fs.readFileSync(saved, 'utf8');
  assert.equal(csv.trim().split(/\r?\n/).length, 7);
});

test('CSV金额保持数值格式且银行账号保留前导0', async () => {
  await openFinance();
  const targetRow = page.locator('[data-fo-record-row]').nth(9);
  await targetRow.locator('[data-fo-select-record]').check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name:'导出选中（1）' }).click();
  const download = await downloadPromise;
  const saved = await download.path();
  const csv = fs.readFileSync(saved, 'utf8');
  assert.match(csv, /,-90\.00,/);
  assert.match(csv, /\t012875009066/);
  assert.doesNotMatch(csv, /"-90\.00"/);
});

test('导出创建失败时不回写最近导出', async () => {
  await openFinance();
  await page.evaluate(() => {
    URL.createObjectURL = () => { throw new Error('mock createObjectURL failure'); };
  });
  const firstRow = page.locator('[data-fo-record-row]').first();
  await firstRow.locator('[data-fo-select-record]').check();
  await page.getByRole('button', { name:'导出选中（1）' }).click();
  assert.match(await page.locator('[data-fo-record-row]').first().innerText(), /未导出/);
  assert.equal(await page.getByRole('button', { name:'导出选中（1）' }).count(), 1);
});

test('筛选无结果显示查询空态且隐藏分页', async () => {
  await openFinance();
  await page.locator('[data-fo-filter="keyword"]').fill('不存在的游戏或主体');
  await page.getByRole('button', { name:'查询' }).click();
  assert.equal(await page.getByText('未找到符合条件的记录').isVisible(), true);
  assert.equal(await page.locator('[data-fo-record-row]').count(), 0);
  assert.equal(await page.locator('[data-fo-pagination]').count(), 0);
});

test('默认穷举态并可切换缺省态', async () => {
  await openFinance();
  await page.locator('[data-fo-demo-toggle]').click();
  await page.locator('[data-fo-scenario="empty"]').click();
  assert.equal(await page.getByText('暂无结算记录').isVisible(), true);
  assert.equal(await page.locator('[data-fo-record-row]').count(), 0);
  assert.equal(await page.getByRole('button', { name:/导出当前结果/ }).isDisabled(), true);
});

for (const viewport of [{ width:1280, height:800 }, { width:390, height:844 }]) {
  test(`${viewport.width}px 页面级无横向溢出`, async () => {
    await page.setViewportSize(viewport);
    await openFinance();
    const dimensions = await page.evaluate(() => ({ client:document.documentElement.clientWidth, scroll:document.documentElement.scrollWidth }));
    assert.equal(dimensions.scroll, dimensions.client);
  });
}

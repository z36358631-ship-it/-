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
const demoDir = path.join(root,'demos','开发者后台一期');
const baseDemo = path.join(demoDir,'发行平台运营后台demo.html');
const outputDemo = path.join(demoDir,'发行平台运营后台财务整合demo.html');
const buildScript = path.join(demoDir,'build-finance-operations.mjs');
const chrome = [process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find(file => file && fs.existsSync(file));
let browser;
let page;
let baseBefore;

const url = hash => { const target = pathToFileURL(outputDemo); target.hash = hash; target.searchParams.set('testRun',`${Date.now()}-${Math.random()}`); return target.href; };
const open = async () => { await page.goto(url('/P16-01'),{ waitUntil:'load' }); await page.locator('[data-finance-operations]').waitFor(); };

before(() => {
  assert.ok(chrome,'Chrome or Edge not found');
  baseBefore = fs.readFileSync(baseDemo);
  execFileSync(process.execPath,[buildScript],{ stdio:'pipe' });
});
before(async () => { browser = await chromium.launch({ headless:true,executablePath:chrome,args:['--allow-file-access-from-files','--disable-background-networking'] }); });
beforeEach(async () => { page = await browser.newPage({ viewport:{ width:1440,height:900 },acceptDownloads:true }); });
afterEach(async () => { await page?.close(); page = null; });
after(async () => { await browser?.close(); });

test('运营财务独立生成且默认进入主体汇总',async () => {
  assert.deepEqual(fs.readFileSync(baseDemo),baseBefore);
  const html = fs.readFileSync(outputDemo,'utf8');
  assert.match(html,/P16-01/);
  assert.doesNotMatch(html,/<iframe|<script[^>]+src=|<link[^>]+stylesheet/i);
  await open();
  assert.deepEqual(await page.getByRole('tab').allTextContents(),['主体汇总','游戏明细']);
  assert.equal(await page.getByRole('tab',{ name:'主体汇总' }).getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('[data-fo-filter="month"]').inputValue(),'2026-08');
  const text = await page.locator('[data-finance-operations]').innerText();
  for (const label of ['用户实付','退款／拒付','销售税','支付费','平台分成','预扣税','应结算金额','收款账户','最近导出']) assert.match(text,new RegExp(label));
  assert.doesNotMatch(text,/调整额|付款条件|发票|付款成功|付款失败|付款凭证|付款尝试/);
});

test('查看明细切换页签并带入精确聚合键且金额一致',async () => {
  await open();
  const entityRow = page.locator('[data-fo-entity-row]').first();
  const payable = Number(await entityRow.getAttribute('data-payable-minor'));
  const entityText = await entityRow.innerText();
  await entityRow.getByRole('button',{ name:'查看明细' }).click();
  assert.equal(await page.getByRole('tab',{ name:'游戏明细' }).getAttribute('aria-selected'),'true');
  const linked = await page.locator('[data-fo-linked-filter]').innerText();
  assert.match(linked,/主体版本 FIN-/);
  assert.match(linked,/账户版本 ACC-/);
  assert.equal(await page.locator('[data-fo-filter="month"]').inputValue(),'2026-08');
  assert.match(entityText,new RegExp(await page.locator('[data-fo-linked-filter] span').first().innerText().then(value => value.replace('主体版本 ',''))));
  const gameRows = page.locator('[data-fo-game-row]');
  assert.ok(await gameRows.count() > 0);
  const gamePayable = await gameRows.evaluateAll(rows => rows.reduce((sum,row) => sum + Number(row.dataset.payableMinor),0));
  assert.equal(gamePayable,payable);
});

test('游戏明细每页20条并支持独立筛选与重置',async () => {
  await open();
  await page.getByRole('tab',{ name:'游戏明细' }).click();
  assert.equal(await page.locator('[data-fo-game-row]').count(),20);
  assert.match(await page.locator('[data-fo-pagination]').innerText(),/共 24 条，每页 20 条/);
  await page.getByRole('button',{ name:'下一页' }).click();
  assert.equal(await page.locator('[data-fo-game-row]').count(),4);
  await page.locator('[data-fo-filter="keyword"]').fill('不存在的游戏');
  await page.getByRole('button',{ name:'查询' }).click();
  assert.equal(await page.getByText('未找到符合条件的记录').isVisible(),true);
  await page.getByRole('button',{ name:'重置' }).click();
  assert.equal(await page.locator('[data-fo-game-row]').count(),20);
  await page.getByRole('tab',{ name:'主体汇总' }).click();
  assert.equal(await page.locator('[data-fo-filter="month"]').inputValue(),'2026-08');
});

test('主体导出含完整账户并回写最近导出',async () => {
  await open();
  const target = page.locator('[data-fo-entity-row]').filter({ hasText:'未导出' }).first();
  const key = await target.getAttribute('data-row-key');
  await target.locator('[data-fo-select-row]').check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{ name:'导出选中（1）' }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(),'主体结算表_2026-08.csv');
  const csv = fs.readFileSync(await download.path(),'utf8');
  assert.match(csv,/银行账号/);
  assert.match(csv,/\t(?:0848019237826|001920003188|012875009066|60138200001909066)/);
  assert.doesNotMatch(csv,/调整额|付款状态|发票/);
  const updated = page.locator(`[data-fo-entity-row][data-row-key="${key}"]`);
  assert.match(await updated.innerText(),/2026-09-14 18:30\s+平台运营 李然/);
});

test('游戏明细导出不改变主体最近导出',async () => {
  await open();
  const before = await page.evaluate(() => JSON.stringify(window.__financeOperationsDemo.snapshot().entityRows.map(row => [row.key,row.lastExportedAt])));
  await page.getByRole('tab',{ name:'游戏明细' }).click();
  await page.locator('[data-fo-game-row]').first().locator('[data-fo-select-row]').check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{ name:'导出选中（1）' }).click();
  await downloadPromise;
  const afterValue = await page.evaluate(() => JSON.stringify(window.__financeOperationsDemo.snapshot().entityRows.map(row => [row.key,row.lastExportedAt])));
  assert.equal(afterValue,before);
});

test('导出失败不回写最近导出',async () => {
  await open();
  const target = page.locator('[data-fo-entity-row]').filter({ hasText:'未导出' }).first();
  const key = await target.getAttribute('data-row-key');
  await target.locator('[data-fo-select-row]').check();
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('mock failure'); }; });
  await page.getByRole('button',{ name:'导出选中（1）' }).click();
  assert.match(await page.locator('[data-fo-export-status]').innerText(),/导出失败/);
  assert.match(await page.locator(`[data-fo-entity-row][data-row-key="${key}"]`).innerText(),/未导出/);
});

test('交易流水只展示支付商税费汇率事实',async () => {
  await open();
  await page.getByRole('tab',{ name:'游戏明细' }).click();
  await page.getByRole('button',{ name:'交易流水' }).first().click();
  const drawer = page.getByRole('dialog',{ name:'交易流水详情' });
  assert.equal(await page.getByRole('dialog').count(),1);
  const text = await drawer.innerText();
  for (const label of ['第三方支付商','买家国家或地区','实际税率','税额','支付费','汇率','销售税','预扣税']) assert.match(text,new RegExp(label));
  assert.doesNotMatch(text,/买家姓名|邮箱|卡号|支付账号|支付商密钥|调整额|付款状态|发票/);
});

test('缺省态与筛选无结果文案不同',async () => {
  await open();
  await page.locator('[data-fo-filter="keyword"]').fill('不存在的主体');
  await page.getByRole('button',{ name:'查询' }).click();
  assert.equal(await page.getByText('未找到符合条件的记录').isVisible(),true);
  await page.locator('[data-fo-demo-toggle]').click();
  await page.getByRole('button',{ name:'缺省态' }).click();
  assert.equal(await page.getByText('暂无主体结算记录').isVisible(),true);
});

for (const viewport of [{ width:1280,height:800 },{ width:390,height:844 }]) {
  test(`${viewport.width}px 页面级无横向溢出`,async () => {
    await page.setViewportSize(viewport);
    await open();
    const dimensions = await page.evaluate(() => ({ client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth }));
    assert.equal(dimensions.scroll,dimensions.client);
  });
}

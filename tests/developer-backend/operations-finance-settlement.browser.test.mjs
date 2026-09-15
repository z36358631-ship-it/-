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
const nextMonth = value => {
  const [year,month] = value.split('-').map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2,'0')}`;
};

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
  for (const label of ['用户实付','退款／拒付','销售税','支付费','平台分成','预扣税','应结算金额','CNY金额','收款账户']) assert.match(text,new RegExp(label));
  assert.doesNotMatch(text,/最近导出|查看明细/);
  assert.doesNotMatch(text,/调整额|付款条件|发票|付款成功|付款失败|付款凭证|付款尝试/);
});

test('游戏明细与开发者结算单字段一致',async () => {
  await open();
  await page.getByRole('tab',{ name:'游戏明细' }).click();
  assert.equal(await page.getByRole('tab',{ name:'游戏明细' }).getAttribute('aria-selected'),'true');
  assert.deepEqual(await page.locator('[data-testid="game-detail-table"] thead th').allTextContents(),[
    '','开发者／财务主体','游戏 ID','游戏名称','账单月份','结算月份','结算项',
    '用户支付金额（CNY）','结算比例','实际到账金额（CNY）','结算金额（CNY）','状态','操作',
  ]);
  assert.deepEqual(await page.locator('[data-fo-filter]').evaluateAll(nodes => nodes.map(node => node.dataset.foFilter)),[
    'keyword','gameId','billingMonth','settlementMonth','itemType','status',
  ]);
  const rows = await page.locator('[data-fo-game-row]').evaluateAll(nodes => nodes.map(node => ({ ...node.dataset })));
  assert.equal(rows.length,20);
  assert.ok(rows.every(row => row.settlementMonth === nextMonth(row.billingMonth)));
  assert.ok(rows.every(row => Number(row.settlementMinor) === Math.round(Number(row.receivedMinor) * Number(row.ratioPercent) / 100)));
  assert.ok(rows.some(row => row.status === 'pending'));
  assert.ok(rows.some(row => row.status === 'confirmed'));
  const text = await page.locator('[data-finance-operations]').innerText();
  for (const label of ['游戏销售分成','DLC 销售分成','CDKEY 销售分成','退款与拒付']) assert.match(text,new RegExp(label));
  assert.doesNotMatch(text,/付款状态|付款成功|付款失败|线上打款/);
});

test('主表金额不重复展示币种且主体汇总提供人民币金额',async () => {
  await open();
  const headers = await page.locator('[data-testid="entity-summary-table"] thead th').allTextContents();
  assert.deepEqual(headers.slice(-3),['应结算金额','CNY金额','收款账户']);
  const entityAmounts = await page.locator('[data-testid="entity-summary-table"] [data-fo-amount]').allTextContents();
  assert.ok(entityAmounts.length > 0);
  entityAmounts.forEach(value => assert.doesNotMatch(value,/^(?:USD|CNY)\s/));

  const usdRow = page.locator('[data-fo-entity-row][data-currency="USD"]').first();
  assert.equal(Number(await usdRow.getAttribute('data-cny-minor')),Math.round(Number(await usdRow.getAttribute('data-payable-minor')) * 7.12));
  const cnyRow = page.locator('[data-fo-entity-row][data-currency="CNY"]').first();
  assert.equal(await cnyRow.getAttribute('data-cny-minor'),await cnyRow.getAttribute('data-payable-minor'));

  await page.getByRole('tab',{ name:'游戏明细' }).click();
  const gameAmounts = await page.locator('[data-testid="game-detail-table"] [data-fo-amount]').allTextContents();
  assert.ok(gameAmounts.length > 0);
  gameAmounts.forEach(value => assert.doesNotMatch(value,/^(?:USD|CNY)\s/));
});

test('游戏明细每页20条并支持独立筛选与重置',async () => {
  await open();
  await page.getByRole('tab',{ name:'游戏明细' }).click();
  const total = (await page.evaluate(() => window.__financeOperationsDemo.snapshot().gameRows.length));
  assert.ok(total > 20);
  assert.equal(await page.locator('[data-fo-game-row]').count(),20);
  assert.match(await page.locator('[data-fo-pagination]').innerText(),new RegExp(`共 ${total} 条，每页 20 条`));
  await page.getByRole('button',{ name:'下一页' }).click();
  assert.equal(await page.locator('[data-fo-game-row]').count(),Math.min(20,total - 20));
  const sample = await page.evaluate(() => window.__financeOperationsDemo.snapshot().gameRows.find(row => row.status === 'pending'));
  await page.locator('[data-fo-filter="billingMonth"]').selectOption(sample.billingMonth);
  await page.locator('[data-fo-filter="settlementMonth"]').selectOption(sample.settlementMonth);
  await page.locator('[data-fo-filter="gameId"]').selectOption(sample.gameId);
  await page.locator('[data-fo-filter="itemType"]').selectOption(sample.itemType);
  await page.locator('[data-fo-filter="status"]').selectOption(sample.status);
  await page.getByRole('button',{ name:'查询' }).click();
  const filtered = await page.locator('[data-fo-game-row]').evaluateAll(nodes => nodes.map(node => ({ ...node.dataset })));
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every(row => row.billingMonth === sample.billingMonth && row.settlementMonth === sample.settlementMonth && row.gameId === sample.gameId && row.itemType === sample.itemType && row.status === sample.status));
  await page.getByRole('button',{ name:'重置' }).click();
  assert.equal(await page.locator('[data-fo-game-row]').count(),20);
  assert.equal(await page.locator('[data-fo-filter="billingMonth"]').inputValue(),'all');
  await page.getByRole('tab',{ name:'主体汇总' }).click();
  assert.equal(await page.locator('[data-fo-filter="month"]').inputValue(),'2026-08');
});

test('主体导出含完整账户且页面不维护导出状态',async () => {
  await open();
  const target = page.locator('[data-fo-entity-row]').first();
  await target.locator('[data-fo-select-row]').check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{ name:'导出选中（1）' }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(),'主体结算表_2026-08.csv');
  const csv = fs.readFileSync(await download.path(),'utf8');
  assert.match(csv,/银行账号/);
  assert.match(csv,/CNY金额/);
  assert.match(csv,/\t(?:0848019237826|001920003188|012875009066|60138200001909066)/);
  const cnyMinor = Number(await target.getAttribute('data-cny-minor'));
  assert.match(csv,new RegExp((cnyMinor / 100).toFixed(2).replace('.', '\\.')));
  assert.doesNotMatch(csv,/调整额|付款状态|发票/);
  assert.match(await page.locator('[data-fo-export-status]').innerText(),/已导出 1 条主体汇总/);
  assert.equal(await page.getByText('最近导出',{ exact:true }).count(),0);
});

test('游戏明细可独立导出',async () => {
  await open();
  await page.getByRole('tab',{ name:'游戏明细' }).click();
  await page.locator('[data-fo-game-row]').first().locator('[data-fo-select-row]').check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{ name:'导出选中（1）' }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(),'游戏结算明细_全部账单月.csv');
  const csv = fs.readFileSync(await download.path(),'utf8');
  for (const label of ['开发者','财务主体','游戏 ID','游戏名称','账单月份','结算月份','结算项','用户支付金额（CNY）','结算比例','实际到账金额（CNY）','结算金额（CNY）','状态']) assert.match(csv,new RegExp(label));
  assert.doesNotMatch(csv,/支付商|币种|销售税|支付费|平台分成|预扣税|付款状态/);
  assert.equal(csv.trim().split(/\r?\n/).length,2);
  assert.match(await page.locator('[data-fo-export-status]').innerText(),/已导出 1 条游戏明细/);
});

test('游戏明细导出遵循当前筛选范围',async () => {
  await open();
  await page.getByRole('tab',{ name:'游戏明细' }).click();
  const sample = await page.evaluate(() => window.__financeOperationsDemo.snapshot().gameRows.find(row => row.status === 'pending'));
  await page.locator('[data-fo-filter="billingMonth"]').selectOption(sample.billingMonth);
  await page.locator('[data-fo-filter="gameId"]').selectOption(sample.gameId);
  await page.locator('[data-fo-filter="itemType"]').selectOption(sample.itemType);
  await page.locator('[data-fo-filter="status"]').selectOption(sample.status);
  await page.getByRole('button',{ name:'查询' }).click();
  const expected = await page.evaluate(() => window.__financeOperationsDemo.snapshot().gameRows);
  assert.ok(expected.length > 0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{ name:new RegExp(`导出当前结果（${expected.length}）`) }).click();
  const download = await downloadPromise;
  const csv = fs.readFileSync(await download.path(),'utf8');
  assert.equal(csv.trim().split(/\r?\n/).length,expected.length + 1);
  for (const row of expected) {
    assert.match(csv,new RegExp(row.gameId));
    assert.match(csv,new RegExp(row.itemLabel));
  }
});

test('导出失败给出重试提示',async () => {
  await open();
  const target = page.locator('[data-fo-entity-row]').first();
  await target.locator('[data-fo-select-row]').check();
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('mock failure'); }; });
  await page.getByRole('button',{ name:'导出选中（1）' }).click();
  assert.equal(await page.locator('[data-fo-export-status]').innerText(),'导出失败，请重试');
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

test('CDKEY 结算项单独查看渠道与商品明细',async () => {
  await open();
  await page.getByRole('tab',{ name:'游戏明细' }).click();
  const cdkey = page.locator('[data-fo-game-row][data-item-type="cdkey_sales_share"]').first();
  assert.equal(await cdkey.getByRole('button',{ name:'查看详情' }).count(),1);
  assert.equal(await cdkey.getByRole('button',{ name:'交易流水' }).count(),0);
  const ordinary = page.locator('[data-fo-game-row]:not([data-item-type="cdkey_sales_share"])').first();
  assert.equal(await ordinary.getByRole('button',{ name:'交易流水' }).count(),1);
  await cdkey.getByRole('button',{ name:'查看详情' }).click();
  const drawer = page.getByRole('dialog',{ name:'CDKEY 销售明细' });
  const text = await drawer.innerText();
  for (const label of ['渠道','商品类型','商品／DLC','用户支付金额（CNY）','实际到账金额（CNY）','结算金额（CNY）','游戏本体','DLC']) assert.match(text,new RegExp(label));
  assert.ok(await drawer.locator('[data-fo-cdkey-row]').count() > 1);
  assert.doesNotMatch(text,/第三方支付商|买家国家或地区|汇率/);
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

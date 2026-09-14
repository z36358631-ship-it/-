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
const demo = path.join(demoDir,'15-开发者财务结算demo.html');
const chrome = [process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find(file => file && fs.existsSync(file));
let browser;
let page;

const url = hash => { const target = pathToFileURL(demo); target.hash = hash; target.searchParams.set('testRun',`${Date.now()}-${Math.random()}`); return target.href; };
const open = async (hash = '/settlement') => { await page.goto(url(hash),{ waitUntil:'load' }); await page.locator('[data-testid="developer-finance-demo"]').waitFor(); };

before(() => {
  assert.ok(chrome,'Chrome or Edge not found');
  execFileSync(process.execPath,[path.join(demoDir,'build-next.mjs')],{ stdio:'pipe' });
});
before(async () => { browser = await chromium.launch({ headless:true,executablePath:chrome,args:['--allow-file-access-from-files','--disable-background-networking'] }); });
beforeEach(async () => { page = await browser.newPage({ viewport:{ width:1440,height:900 },acceptDownloads:true }); });
afterEach(async () => { await page?.close(); page = null; });
after(async () => { await browser?.close(); });

test('财务模块只保留两个入口且使用浅色选中态',async () => {
  await open('/entity');
  assert.deepEqual(await page.locator('.d15-nav [data-route]').allTextContents(),['主财务主体','结对账结算']);
  const colors = await page.locator('.d15-nav [data-route="entity"]').evaluate(element => ({
    color:getComputedStyle(element).color,
    background:getComputedStyle(element).backgroundColor,
    sidebar:getComputedStyle(element.closest('.gh-sidebar')).backgroundColor,
  }));
  assert.equal(colors.sidebar,'rgb(255, 255, 255)');
  assert.notEqual(colors.color,'rgb(255, 255, 255)');
  assert.notEqual(colors.background,'rgb(31, 58, 104)');
  const mainText = await page.locator('main').innerText();
  for (const label of ['财务主体、收款资料与审核状态','财务主体资料','查看变更历史','修改','开户银行','税务居民地']) assert.match(mainText,new RegExp(label));
  assert.equal(await page.locator('[data-d15-entity-summary]').count(),1);
  assert.equal(await page.locator('[data-d15-entity-details]').count(),1);
  assert.doesNotMatch(mainText,/主体列表|选择财务主体/);
  assert.doesNotMatch(mainText,/付款状态|发票|付款尝试/);
});

test('开发者结算按月汇总并支持全部游戏或单款游戏筛选',async () => {
  await open('/settlement');
  const table = page.locator('[data-testid="settlement-table"]');
  for (const label of ['用户实付','退款／拒付','销售税','支付费','平台分成','预扣税','应结算金额']) assert.match(await table.innerText(),new RegExp(label));
  assert.deepEqual(await page.locator('[data-d15-filter]').evaluateAll(nodes => nodes.map(node => node.dataset.d15Filter)),['month','game']);
  assert.equal(await page.locator('[data-d15-settlement-row]').count(),3);
  assert.equal(await table.locator('tbody td').filter({ hasText:/USD/ }).count(),0);
  assert.equal(await table.locator('[data-d15-cny-reference]').count(),3);
  assert.match(await table.locator('[data-d15-cny-reference]').first().innerText(),/^约 ¥/);
  assert.equal(await page.locator('[data-d15-pagination]').getAttribute('data-page-size'),'20');
  const audit = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
  assert.equal(audit.immutable,true);
  assert.match(audit.snapshotId,/SETTLEMENT-SNAPSHOT/);
  for (const settlement of audit.settlements) {
    const games = audit.games.filter(game => game.month === settlement.month);
    assert.ok(games.length > 0);
    assert.equal(games.reduce((sum,game) => sum + game.payableMinor,0),settlement.payableMinor);
  }
  const allPayable = audit.settlements.reduce((sum,row) => sum + row.payableMinor,0);
  await page.locator('[data-d15-filter="game"]').selectOption({ index:1 });
  await page.getByRole('button',{ name:'查询' }).click();
  const filtered = await page.evaluate(() => window.__developerFinanceDemo.snapshot().visibleSettlements);
  assert.ok(filtered.length > 0);
  assert.ok(filtered.reduce((sum,row) => sum + row.payableMinor,0) < allPayable);
  assert.equal(await page.getByText('调整额').count(),0);
});

test('结算详情保持单层并同时展示游戏构成和第三方支付流水',async () => {
  await open('/settlement');
  await page.getByRole('button',{ name:'查看详情' }).first().click();
  const drawer = page.getByRole('dialog',{ name:'结算详情' });
  assert.equal(await page.getByRole('dialog').count(),1);
  const text = await drawer.innerText();
  for (const label of ['游戏构成','交易流水','第三方支付商','买家国家或地区','实际税率','税额','支付费','汇率','销售税','预扣税']) assert.match(text,new RegExp(label));
  assert.doesNotMatch(text,/买家姓名|邮箱|卡号|支付账号|支付商密钥|调整额|付款状态|发票|付款尝试/);
  assert.ok(await drawer.locator('[data-d15-game-row]').count() > 1);
  assert.ok(await drawer.locator('[data-d15-transaction-row]').count() > 1);
});

test('筛选无结果与缺省态使用不同文案',async () => {
  await open('/settlement');
  await page.locator('[data-d15-filter="month"]').selectOption('2026-06');
  await page.locator('[data-d15-filter="game"]').selectOption('GAME-48291');
  await page.getByRole('button',{ name:'查询' }).click();
  assert.equal(await page.getByText('未找到符合条件的记录').isVisible(),true);
  await page.locator('[data-testid="scenario-orb"]').click();
  await page.getByRole('button',{ name:'缺省态' }).click();
  assert.equal(await page.getByText('暂无结算记录').isVisible(),true);
});

test('开发者可导出当前结算结果',async () => {
  await open('/settlement');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{ name:'导出当前结果' }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(),/^对账结算_/);
  const csv = fs.readFileSync(await download.path(),'utf8');
  assert.match(csv,/用户实付/);
  assert.match(csv,/预扣税/);
  assert.match(csv,/人民币参考额/);
  assert.match(csv,/锁定汇率/);
  assert.doesNotMatch(csv,/调整额|付款状态|发票/);
});

for (const viewport of [{ width:1280,height:800 },{ width:390,height:844 }]) {
  test(`${viewport.width}px 页面级无横向溢出`,async () => {
    await page.setViewportSize(viewport);
    await open('/settlement');
    const dimensions = await page.evaluate(() => ({ client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth }));
    assert.equal(dimensions.scroll,dimensions.client);
  });
}

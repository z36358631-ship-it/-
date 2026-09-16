import test, { after,afterEach,before,beforeEach } from 'node:test';
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

test('运营财务独立生成，保留面包屑和主体汇总、游戏明细两个场景',async () => {
  assert.deepEqual(fs.readFileSync(baseDemo),baseBefore);
  const html = fs.readFileSync(outputDemo,'utf8');
  assert.match(html,/P16-01/);
  assert.doesNotMatch(html,/<iframe|<script[^>]+src=|<link[^>]+stylesheet/i);
  await open();
  assert.match((await page.locator('[data-fo-breadcrumb]').innerText()).replace(/\s+/g,' '),/发行平台后台 \/ 财务结算/);
  assert.deepEqual(await page.getByRole('tab').allTextContents(),['主体汇总','游戏明细']);
  assert.equal(await page.getByRole('tab',{ name:'主体汇总' }).getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('[data-fo-filter="billingMonth"]').inputValue(),'2026-08');
  assert.deepEqual(await page.locator('[data-testid="entity-summary-table"] thead th').allTextContents(),[
    '','账单月份','开发者','财务主体','主体版本','账户版本','游戏及 DLC 销售金额','CDKEY 销售金额','用户实付','平台实收','支付费',
    '综合税率／税费','退款与拒付','平台分成比例','平台分成','应结算金额（CNY）','应结算金额（USD）','银行账户名','银行账号','开户行',
  ]);
  const text = await page.locator('[data-finance-operations]').innerText();
  assert.doesNotMatch(text,/调整额|付款条件|发票|付款成功|付款失败|付款凭证|付款尝试|预扣税|销售税/);
});

test('主体汇总来自共享结算快照且所有状态均可导出',async () => {
  await open();
  assert.ok(await page.locator('[data-fo-entity-row]').count() > 0);
  assert.ok(await page.locator('[data-fo-entity-row][data-status="pending"] [data-fo-select-row]:not([disabled])').count() > 0);
  assert.equal(await page.getByRole('button',{ name:/导出当前结果/ }).isDisabled(),false);
  const summary = await page.evaluate(() => window.__financeOperationsDemo.snapshot().entityRows[0]);
  const fields = ['gameSalesMinor','cdkeySalesMinor','userPaidMinor','platformReceivedMinor','paymentFeeMinor','taxMinor','refundChargebackMinor','platformShareMinor','payableMinor','payableUsdMinor'];
  fields.forEach(field => assert.equal(typeof summary[field],'number',`${field} 应来自共享快照`));
  assert.ok(summary.entityVersion && summary.accountVersion && summary.tierRuleVersions.length);
});

test('游戏明细保留运营端平台分成字段，本体与 DLC 合并为三类结算项',async () => {
  await open();
  await page.getByRole('tab',{ name:'游戏明细' }).click();
  assert.deepEqual(await page.locator('[data-testid="game-detail-table"] thead th').allTextContents(),[
    '','开发者／财务主体','游戏 ID','游戏名称','账单月份','结算月份','结算项','用户实付','平台实收','平台分成比例','平台分成','应结算金额（CNY）','状态','操作',
  ]);
  assert.deepEqual(await page.locator('[data-fo-filter]').evaluateAll(nodes => nodes.map(node => node.dataset.foFilter)),[
    'keyword','gameId','billingMonth','settlementMonth','itemType','status',
  ]);
  const rows = await page.locator('[data-fo-game-row]').evaluateAll(nodes => nodes.map(node => ({ ...node.dataset })));
  assert.equal(rows.length,20);
  assert.ok(rows.every(row => row.settlementMonth === nextMonth(row.billingMonth)));
  assert.ok(rows.every(row => Number(row.payableMinor) === Number(row.platformReceivedMinor) - Number(row.platformShareMinor)));
  assert.deepEqual([...new Set(rows.map(row => row.itemType))].sort(),['cdkey_sales_share','game_sales_share','refund_chargeback_adjustment']);
  assert.doesNotMatch(await page.locator('[data-finance-operations]').innerText(),/DLC 销售分成/);
});

test('前后台列表均按每页 20 条，游戏筛选和重置互不串页',async () => {
  await open();
  await page.getByRole('tab',{ name:'游戏明细' }).click();
  const total = await page.evaluate(() => window.__financeOperationsDemo.snapshot().gameRows.length);
  assert.ok(total > 20);
  assert.equal(await page.locator('[data-fo-game-row]').count(),20);
  assert.match(await page.locator('[data-fo-pagination]').innerText(),new RegExp(`共 ${total} 条，每页 20 条`));
  await page.getByRole('button',{ name:'下一页' }).click();
  assert.equal(await page.locator('[data-fo-game-row]').count(),Math.min(20,total - 20));
  const sample = await page.evaluate(() => window.__financeOperationsDemo.snapshot().gameRows.find(row => row.status === 'confirmed'));
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
});

test('主体汇总可导出待确认记录和完整快照字段',async () => {
  await open();
  const target = page.locator('[data-fo-entity-row][data-status="pending"]').first();
  await target.locator('[data-fo-select-row]').check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{ name:'导出选中（1）' }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(),'主体结算表_2026-08.csv');
  const csv = fs.readFileSync(await download.path(),'utf8');
  for (const label of ['结算单 ID','开发者','财务主体','主体版本','账户版本','规则版本','游戏及 DLC 销售金额','CDKEY 销售金额','平台实收','综合税率','应结算金额（CNY）','应结算金额（USD）','状态','银行账号']) assert.match(csv,new RegExp(label));
  assert.match(csv,/待确认/);
  assert.doesNotMatch(csv,/调整额|付款状态|付款凭证|发票/);
  assert.equal(csv.trim().split(/\r?\n/).length,2);
});

test('游戏明细可导出待确认记录',async () => {
  await open();
  await page.getByRole('tab',{ name:'游戏明细' }).click();
  await page.locator('[data-fo-filter="billingMonth"]').selectOption('2026-08');
  await page.getByRole('button',{ name:'查询' }).click();
  await page.locator('[data-fo-game-row][data-status="pending"]').first().locator('[data-fo-select-row]').check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{ name:'导出选中（1）' }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(),'游戏结算明细_2026-08.csv');
  const csv = fs.readFileSync(await download.path(),'utf8');
  for (const label of ['结算单 ID','游戏 ID','游戏名称','账单月份','结算月份','结算项','用户实付','平台实收','平台分成比例','平台分成','应结算金额（CNY）','状态']) assert.match(csv,new RegExp(label));
  assert.match(csv,/待确认/);
  assert.equal(csv.trim().split(/\r?\n/).length,2);
});

test('游戏销售与 CDKEY 详情同源，退款与拒付不增加详情',async () => {
  await open();
  await page.getByRole('tab',{ name:'游戏明细' }).click();
  const game = page.locator('[data-fo-game-row][data-item-type="game_sales_share"]').first();
  await game.getByRole('button',{ name:'查看详情' }).click();
  const gameDrawer = page.getByRole('dialog',{ name:'游戏销售分成明细' });
  assert.deepEqual(await gameDrawer.locator('.fo-detail-summary span').allTextContents(),[
    '用户实付','平台实收','平台分成比例','平台分成','应结算金额（CNY）',
  ]);
  assert.deepEqual(await gameDrawer.locator('[data-testid="fo-game-sales-detail-table"] thead th').allTextContents(),[
    '商品类型','商品名称','用户实付','平台实收','平台分成比例','平台分成','应结算金额（CNY）',
  ]);
  for (const label of ['游戏本体','DLC','用户实付','平台实收','平台分成比例','平台分成','应结算金额（CNY）']) assert.match(await gameDrawer.innerText(),new RegExp(label));
  assert.doesNotMatch(await gameDrawer.innerText(),/支付费|税费|退款与拒付|适用档位|规则版本|生效账单月|各档计费/);
  await gameDrawer.getByRole('button',{ name:'关闭' }).last().click();
  const cdkey = page.locator('[data-fo-game-row][data-item-type="cdkey_sales_share"]').first();
  await cdkey.getByRole('button',{ name:'查看详情' }).click();
  const cdkeyDrawer = page.getByRole('dialog',{ name:'CDKEY 销售明细' });
  assert.deepEqual(await cdkeyDrawer.locator('[data-testid="fo-cdkey-detail-table"] thead th').allTextContents(),[
    '渠道','商品类型','商品／DLC','用户实付','平台实收','平台分成比例','平台分成','应结算金额（CNY）',
  ]);
  assert.match(await cdkeyDrawer.innerText(),/平台分成\s*0\.00/);
  assert.doesNotMatch(await cdkeyDrawer.innerText(),/支付费|税费|退款与拒付|适用档位/);
  await cdkeyDrawer.getByRole('button',{ name:'关闭' }).last().click();
  assert.equal(await page.locator('[data-fo-game-row][data-item-type="refund_chargeback_adjustment"]').first().getByRole('button',{ name:'查看详情' }).count(),0);
});

test('主体汇总统一配置主体级阶梯分成',async () => {
  await open();
  assert.equal(await page.getByRole('button',{ name:'配置阶梯分成' }).count(),1);
  await page.getByRole('button',{ name:'配置阶梯分成' }).click();
  const drawer = page.getByRole('dialog',{ name:'配置阶梯分成' });
  assert.equal(await drawer.locator('[name="financialEntityId"]').count(),1);
  assert.equal(await drawer.locator('[name="startDate"]').count(),1);
  assert.equal(await drawer.locator('[name="endDate"]').count(),1);
  const timeButton = drawer.locator('[data-fo-action="tier-date-open"]');
  assert.equal(await timeButton.count(),1);
  assert.match((await timeButton.innerText()).replace(/\s+/g,' '),/长期.*2026-09-01.*长期有效/);
  await timeButton.click();
  const dateDialog = drawer.getByRole('dialog',{ name:'选择规则有效期' });
  assert.deepEqual(await dateDialog.locator('[data-tier-date-preset]').allTextContents(),['1 个月','3 个月','6 个月','1 年','长期','自定义']);
  assert.doesNotMatch(await dateDialog.innerText(),/180 天|数据截至/);
  await dateDialog.getByRole('button',{ name:'1 年',exact:true }).click();
  assert.match((await dateDialog.locator('.publisher-dashboard-date-summary').innerText()).replace(/\s+/g,' '),/2026-09-01 → 2027-08-31/);
  await dateDialog.getByRole('button',{ name:'应用' }).click();
  assert.equal(await drawer.locator('[name="startDate"]').inputValue(),'2026-09-01');
  assert.equal(await drawer.locator('[name="endDate"]').inputValue(),'2027-08-31');
  assert.equal(await drawer.locator('[data-tier-card]').count(),3);
  assert.match(await drawer.innerText(),/0[\s\S]*月结算金额（元）/);
  assert.match(await drawer.innerText(),/不设上限/);
  assert.equal(await drawer.locator('[name="from"]').count(),2);
  assert.equal(await drawer.locator('[data-tier-card]').first().locator('[name="from"]').count(),0);
  assert.equal(await drawer.locator('[data-tier-card]').nth(1).locator('[name="from"]').inputValue(),'1000000');
  assert.equal(await drawer.locator('[data-tier-card]').last().locator('[name="from"]').inputValue(),'5000000');
  assert.equal(await drawer.locator('[name="to"]').count(),2);
  assert.equal(await drawer.locator('[data-tier-card]').last().locator('[name="to"]').count(),0);
  const editableBoundaries = drawer.locator('[name="from"], [name="to"]');
  for (let index = 0; index < await editableBoundaries.count(); index += 1) assert.equal(await editableBoundaries.nth(index).isEditable(),true);
  assert.equal(await drawer.locator('[data-tier-card]').first().getByRole('button',{ name:'删除' }).count(),0);
  assert.equal(await drawer.locator('[data-tier-card]').last().getByRole('button',{ name:'删除' }).count(),0);
  assert.equal(await drawer.locator('[data-tier-card]').nth(1).getByRole('button',{ name:'删除' }).count(),1);
  const gridColumns = await drawer.locator('.fo-tier-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
  assert.equal(gridColumns,3);
  await drawer.locator('[data-tier-card]').first().locator('[name="to"]').fill('2000000');
  await drawer.locator('[data-tier-card]').nth(1).locator('[name="from"]').fill('2200000');
  await drawer.getByRole('button',{ name:'保存规则' }).click();
  assert.match(await drawer.getByRole('alert').innerText(),/连续/);
  await drawer.locator('[data-tier-card]').nth(1).locator('[name="from"]').fill('2000000');
  await drawer.locator('[data-tier-card]').nth(1).locator('[name="to"]').fill('6000000');
  await drawer.locator('[data-tier-card]').last().locator('[name="from"]').fill('6000000');
  await drawer.getByRole('button',{ name:'添加档位' }).click();
  assert.equal(await drawer.locator('[data-tier-card]').count(),4);
  assert.equal(await drawer.locator('[name="from"]').count(),3);
  assert.equal(await drawer.locator('[name="to"]').count(),3);
  assert.equal(await drawer.locator('[data-tier-card]').nth(2).locator('[name="from"]').inputValue(),'6000000');
  assert.equal(await drawer.locator('[data-tier-card]').nth(2).locator('[name="to"]').inputValue(),'');
  assert.equal(await drawer.locator('[data-tier-card]').nth(2).locator('[name="rate"]').inputValue(),'');
  await drawer.locator('[data-tier-card]').nth(2).locator('[name="to"]').fill('8000000');
  await drawer.locator('[data-tier-card]').last().locator('[name="from"]').fill('8000000');
  const rates = drawer.locator('[name="rate"]');
  for (const [index,rate] of ['30','25','22','20'].entries()) await rates.nth(index).fill(rate);
  await drawer.getByRole('button',{ name:'保存规则' }).click();
  assert.match(await page.locator('[data-fo-tier-status]').innerText(),/已保存规则/);
  assert.equal((await page.evaluate(() => window.__financeOperationsDemo.snapshot().tierRules.length)),1);
  await page.getByRole('button',{ name:'配置阶梯分成' }).click();
  const reopened = page.getByRole('dialog',{ name:'配置阶梯分成' });
  assert.equal(await reopened.locator('[data-tier-card]').count(),4);
  await reopened.locator('[data-tier-card]').nth(2).getByRole('button',{ name:'删除' }).click();
  assert.equal(await reopened.locator('[data-tier-card]').count(),3);
  await reopened.getByRole('button',{ name:'保存规则' }).click();
  assert.equal((await page.evaluate(() => window.__financeOperationsDemo.snapshot().tierRules.length)),2);
  await page.getByRole('tab',{ name:'游戏明细' }).click();
  assert.equal(await page.getByRole('button',{ name:'配置阶梯分成' }).count(),0);
});

test('导出失败给出重试提示',async () => {
  await open();
  await page.locator('[data-fo-filter="billingMonth"]').selectOption('2026-07');
  await page.getByRole('button',{ name:'查询' }).click();
  await page.locator('[data-fo-entity-row][data-status="confirmed"]').first().locator('[data-fo-select-row]').check();
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('mock failure'); }; });
  await page.getByRole('button',{ name:'导出选中（1）' }).click();
  assert.equal(await page.locator('[data-fo-export-status]').innerText(),'导出失败，请重试');
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

test('390px 合同有效期复用单月日期范围组件且支持一年',async () => {
  await page.setViewportSize({ width:390,height:844 });
  await open();
  await page.getByRole('button',{ name:'配置阶梯分成' }).click();
  await page.locator('[data-fo-action="tier-date-open"]').click();
  const dialog = page.getByRole('dialog',{ name:'选择规则有效期' });
  const box = await dialog.boundingBox();
  assert.ok(box && box.x >= 0 && box.x + box.width <= 390);
  assert.equal(await dialog.locator('.publisher-calendar-month:visible').count(),1);
  await dialog.getByRole('button',{ name:'1 年',exact:true }).click();
  await dialog.getByRole('button',{ name:'应用' }).click();
  assert.equal(await page.locator('[name="endDate"]').inputValue(),'2027-08-31');
});

for (const viewport of [{ width:1280,height:800 },{ width:390,height:844 }]) {
  test(`${viewport.width}px 页面无横向溢出且宽表在卡片内滚动`,async () => {
    await page.setViewportSize(viewport);
    await open();
    const dimensions = await page.evaluate(() => ({ client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth }));
    assert.equal(dimensions.scroll,dimensions.client);
    const table = await page.locator('[data-testid="entity-summary-table"]').evaluate(node => {
      const wrap = node.closest('.fo-table-scroll'); wrap.scrollLeft = 180;
      return { client:wrap.clientWidth,scroll:wrap.scrollWidth,overflow:getComputedStyle(wrap).overflowX,left:wrap.scrollLeft };
    });
    assert.ok(table.scroll > table.client);
    assert.ok(['auto','scroll'].includes(table.overflow));
    assert.ok(table.left > 0);
  });
}

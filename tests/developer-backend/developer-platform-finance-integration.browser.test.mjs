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
const demo = path.join(demoDir,'开发者平台demo.html');
const chrome = [process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find(file => file && fs.existsSync(file));
let browser;
let page;

const url = hash => { const value = pathToFileURL(demo); value.hash = hash; value.searchParams.set('testRun',`${Date.now()}-${Math.random()}`); return value.href; };
async function seedAccount() {
  await page.goto(url('/P01-01'),{ waitUntil:'load' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('gamehub-developer-session-v1',JSON.stringify({ authenticated:true,accountKey:'finance:approved' }));
    localStorage.setItem('gamehub-developer-account-states-v1',JSON.stringify({
      'finance:approved':{
        registration:{ accountTier:'enterprise',registeredAt:'2026-09-01 09:00',consoleTab:'games',vendorSettingsTab:'finance' },
        qualification:{ applicationId:'ENT-FINANCE',status:'approved',step:5,view:'intro',editing:false,revision:1,submittedAt:'2026-09-01 09:00',form:{ vendorName:'星海互动',agreementAccepted:true },history:[],submissions:[] },
      },
    }));
  });
}
async function open(route = '/P15-01') {
  await seedAccount();
  await page.goto(url(route),{ waitUntil:'load' });
  if (route === '/P01-01' || route.startsWith('/P15-')) await page.locator('[data-testid="developer-finance-demo"]').waitFor();
  else await page.locator('[data-publisher-workspace]').waitFor();
}

before(() => {
  assert.ok(chrome,'Chrome or Edge not found');
  execFileSync(process.execPath,[path.join(demoDir,'build.mjs'),'--module=02'],{ stdio:'pipe' });
});
before(async () => { browser = await chromium.launch({ headless:true,executablePath:chrome,args:['--allow-file-access-from-files','--disable-background-networking'] }); });
beforeEach(async () => { page = await browser.newPage({ viewport:{ width:1440,height:900 } }); });
afterEach(async () => { await page?.close(); page = null; });
after(async () => { await browser?.close(); });

test('财务整合版复用平台壳且财务侧栏保持白底浅灰选中',async () => {
  await open('/P01-01');
  assert.equal(new URL(page.url()).hash,'#/P01-01');
  assert.equal(await page.getByRole('heading',{ level:1,name:'财务主体' }).count(),1);
  assert.equal(await page.locator('.top-bar').count(),1);
  assert.equal(await page.locator('.side-nav').count(),1);
  assert.deepEqual(await page.locator('.side-nav .nav-item').allTextContents(),['游戏管理','财务主体','对账结算','厂商设置']);
  const active = page.locator('.side-nav .nav-item.is-active');
  assert.equal(await active.innerText(),'财务主体');
  assert.equal(await page.locator('.side-nav--finance').getAttribute('data-variant'),'light');
  const colors = await active.evaluate(element => ({
    color:getComputedStyle(element).color,
    background:getComputedStyle(element).backgroundColor,
    sidebar:getComputedStyle(element.closest('.side-nav')).backgroundColor,
  }));
  assert.equal(colors.sidebar,'rgb(255, 255, 255)');
  assert.notEqual(colors.color,'rgb(255, 255, 255)');
  assert.notEqual(colors.background,'rgb(31, 58, 104)');
});

test('财务主体主入口在无登录存储时仍可使用左侧导航',async () => {
  await page.goto(url('/P01-01'),{ waitUntil:'load' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil:'load' });
  await page.locator('[data-testid="developer-finance-demo"]').waitFor();

  await page.locator('.side-nav').getByText('对账结算',{ exact:true }).click();
  await page.waitForFunction(() => location.hash === '#/P15-02');
  await page.getByRole('heading',{ level:1,name:'对账结算' }).waitFor();

  await page.locator('.side-nav').getByText('财务主体',{ exact:true }).click();
  await page.waitForFunction(() => location.hash === '#/P01-01');
  await page.getByRole('heading',{ level:1,name:'财务主体' }).waitFor();

  await page.getByRole('button',{ name:'厂商设置',exact:true }).click();
  await page.waitForFunction(() => location.hash === '#/P02-01');
  await page.locator('[data-publisher-page="vendor"]').waitFor();

  await page.goto(url('/P01-01'),{ waitUntil:'load' });
  await page.locator('[data-testid="developer-finance-demo"]').waitFor();
  await page.locator('.side-nav').getByText('游戏管理',{ exact:true }).click();
  await page.waitForFunction(() => location.hash === '#/P02-01');
  await page.locator('[data-publisher-workspace]').waitFor();
});

test('厂商设置移除财务主体页签且旧保存值回退有效页签',async () => {
  await open('/P02-01');
  await page.locator('[data-portal-action="publisher-sidebar-view"][data-publisher-view="vendor"]').click();
  const settings = page.locator('[data-publisher-page="vendor"]');
  await settings.waitFor();
  assert.deepEqual(await settings.locator('[data-vendor-settings-tab]').allTextContents(),['企业主体信息','厂商资料']);
  assert.equal(await settings.locator('[data-vendor-settings-tab="finance"]').count(),0);
  assert.equal(await settings.locator('[data-vendor-settings-panel="finance"]').count(),0);
  assert.equal(await settings.locator('[data-vendor-settings-tab]').first().getAttribute('aria-selected'),'true');
});

test('财务主体与对账结算仍是两个独立入口',async () => {
  await open('/P15-01');
  assert.equal(await page.getByRole('heading',{ level:1,name:'财务主体' }).count(),1);
  assert.equal(await page.locator('[data-d15-entity-summary]').count(),1);
  assert.equal(await page.locator('[data-d15-entity-details]').count(),1);
  const entityText = await page.locator('[data-testid="developer-finance-demo"]').innerText();
  for (const label of ['企业法定名称','联系人姓名','手机号','邮箱','银行账户户名','开户银行','银行账号','开户支行／联行信息','银行账户证明附件']) assert.match(entityText,new RegExp(label));
  assert.doesNotMatch(entityText,/主体列表|选择财务主体/);
  await page.locator('.side-nav').getByText('对账结算',{ exact:true }).click();
  await page.waitForFunction(() => location.hash === '#/P15-02');
  assert.equal(await page.getByRole('heading',{ level:1,name:'对账结算' }).count(),1);
  assert.equal(await page.locator('[data-testid="settlement-table"]').count(),1);
  assert.deepEqual(await page.locator('[data-d15-filter]').evaluateAll(nodes => nodes.map(node => node.dataset.d15Filter)),['billingMonth','settlementMonth','gameId','status']);
  assert.equal(await page.locator('[data-d15-settlement-row]').count(),20);
  const headers = await page.locator('[data-testid="settlement-table"] th').allTextContents();
  assert.deepEqual(headers,['','游戏 ID','游戏名称','账单月份','结算月份','结算项','用户支付金额（CNY）','实际到账金额（CNY）','结算比例','结算金额（CNY）','状态','操作']);
  const statusAlignment = await page.locator('[data-d15-settlement-row]').first().locator('td').nth(10).evaluate(cell => {
    const tag = cell.querySelector('.gh-tag');
    const cellRect = cell.getBoundingClientRect();
    const tagRect = tag.getBoundingClientRect();
    return Math.abs((cellRect.top + cellRect.height / 2) - (tagRect.top + tagRect.height / 2));
  });
  assert.ok(statusAlignment <= 1);
  const text = await page.locator('[data-testid="developer-finance-demo"]').innerText();
  for (const label of ['游戏销售分成','CDKEY 销售分成','退款与拒付','查看详情']) assert.match(text,new RegExp(label));
  assert.doesNotMatch(text,/DLC 销售分成/);
  assert.doesNotMatch(text,/平台分成/);
  assert.doesNotMatch(text,/账单按 N\+1 结算；确认后不可撤销。|美元|USD|第三方支付商|交易流水|调整额|付款状态|发票|付款尝试/);
});

test('企业认证状态联动财务主体的穷举态与缺省态',async () => {
  await open('/P15-01');
  assert.equal(await page.locator('[data-d15-entity-details]').count(),1);
  for (const label of ['审核中','认证未通过','已下架']) {
    await page.locator('.developer-demo-state-fab').click();
    await page.getByRole('radio',{ name:label,exact:true }).click();
    const empty = page.locator('[data-testid="enterprise-certification-empty"]');
    assert.equal(await empty.isVisible(),true);
    assert.match(await empty.innerText(),/开发者企业认证通过后，方可管理财务主体。/);
    assert.equal(await page.getByRole('button',{ name:'修改' }).count(),0);
  }
  await page.locator('.developer-demo-state-fab').click();
  await page.getByRole('radio',{ name:'认证通过',exact:true }).click();
  assert.equal(await page.locator('[data-d15-entity-details]').count(),1);
});

test('非通过认证状态联动对账结算缺省态',async () => {
  await open('/P15-02');
  assert.equal(await page.locator('[data-d15-settlement-row]').count(),20);
  await page.locator('.developer-demo-state-fab').click();
  await page.getByRole('radio',{ name:'审核中',exact:true }).click();
  assert.equal(await page.getByText('暂无结算记录').isVisible(),true);
  assert.equal(await page.locator('[data-d15-settlement-row]').count(),0);
});

test('游戏销售分成与 CDKEY 使用同源半屏明细，退款与拒付无详情入口',async () => {
  await open('/P15-02');
  const gameRow = page.locator('[data-d15-settlement-row][data-item-type="game_sales_share"]').first();
  await gameRow.getByRole('button',{ name:'查看详情' }).click();
  const gameDrawer = page.getByRole('dialog',{ name:'游戏销售分成明细' });
  await gameDrawer.waitFor();
  assert.deepEqual(await gameDrawer.locator('.d15-detail-summary span').allTextContents(),[
    '用户支付金额（CNY）','实际到账金额（CNY）','结算比例','结算金额（CNY）',
  ]);
  assert.deepEqual(await gameDrawer.locator('[data-testid="game-sales-detail-table"] thead th').allTextContents(),[
    '商品类型','商品名称','用户支付金额（CNY）','实际到账金额（CNY）','结算比例','结算金额（CNY）',
  ]);
  const gameText = await gameDrawer.innerText();
  for (const label of ['游戏本体','DLC']) assert.match(gameText,new RegExp(label));
  assert.doesNotMatch(gameText,/支付费|税费|退款与拒付|适用档位|规则版本|生效账单月|各档结算|平台分成/);
  await gameDrawer.getByRole('button',{ name:'关闭' }).click();

  const cdkeyRow = page.locator('[data-d15-settlement-row][data-item-type="cdkey_sales_share"]').first();
  await cdkeyRow.getByRole('button',{ name:'查看详情' }).click();
  const cdkeyDrawer = page.getByRole('dialog',{ name:'CDKEY 销售明细' });
  assert.deepEqual(await cdkeyDrawer.locator('[data-testid="cdkey-detail-table"] thead th').allTextContents(),[
    '渠道','商品类型','商品／DLC','用户支付金额（CNY）','实际到账金额（CNY）','结算比例','结算金额（CNY）',
  ]);
  assert.match(await cdkeyDrawer.innerText(),/结算比例\s*100%/);
  assert.doesNotMatch(await cdkeyDrawer.innerText(),/支付费|税费|退款与拒付|适用档位|平台分成/);
  await cdkeyDrawer.getByRole('button',{ name:'关闭' }).click();

  const adjustment = page.locator('[data-d15-settlement-row][data-item-type="refund_chargeback_adjustment"]').first();
  assert.equal(await adjustment.getByRole('button',{ name:'查看详情' }).count(),0);
});

test('财务整合版可提交主体变更且不覆盖当前生效资料',async () => {
  await open('/P15-01');
  await page.getByRole('button',{ name:'修改' }).click();
  const uploadLayout = await page.locator('.d15-entity-upload').evaluate(element => ({
    display:getComputedStyle(element).display,
    nameTop:Math.round(element.querySelector('strong').getBoundingClientRect().top),
    hintTop:Math.round(element.querySelector('span').getBoundingClientRect().top),
  }));
  assert.equal(uploadLayout.display,'grid');
  assert.notEqual(uploadLayout.nameTop,uploadLayout.hintTop);
  await page.getByLabel('联系人姓名').fill('');
  await page.getByRole('button',{ name:'提交审核' }).click();
  assert.equal(await page.getByLabel('联系人姓名').evaluate(element => element === document.activeElement),true);
  await page.getByLabel('联系人姓名').fill('王明');
  await page.getByLabel('邮箱').fill('finance@ocean-expedition.com');
  await page.getByRole('button',{ name:'提交审核' }).click();
  assert.match(await page.locator('[data-d15-entity-status]').innerText(),/审核中/);
  assert.match(await page.locator('[data-d15-entity-details]').innerText(),/深圳星海互动科技有限公司/);
});

test('财务整合版支持结算单确认',async () => {
  await open('/P15-02');
  const pending = page.locator('[data-d15-settlement-row][data-status="pending"]').first();
  const id = await pending.getAttribute('data-statement-id');
  await pending.getByRole('button',{ name:'确认',exact:true }).click();
  const dialog = page.getByRole('dialog',{ name:'确认结算单' });
  assert.match(await dialog.innerText(),/1 条/);
  assert.equal(await page.locator('.developer-demo-state-switcher').isVisible(),false);
  await dialog.getByRole('button',{ name:'确认',exact:true }).click();
  assert.equal(await page.locator(`[data-statement-id="${id}"]`).getAttribute('data-status'),'confirmed');
});

test('财务整合版筛选待确认后保留稳定焦点',async () => {
  await open('/P15-02');
  await page.locator('[data-d15-filter="status"]').selectOption('pending');
  await page.getByRole('button',{ name:'查询' }).click();
  const row = page.locator('[data-d15-settlement-row]').first();
  const id = await row.getAttribute('data-statement-id');
  await row.getByRole('button',{ name:'确认',exact:true }).click();
  await page.getByRole('dialog',{ name:'确认结算单' }).getByRole('button',{ name:'确认',exact:true }).click();
  assert.equal(await page.locator(`[data-statement-id="${id}"]`).count(),0);
  const fallback = page.getByRole('button',{ name:'批量确认' });
  assert.equal(await fallback.isVisible(),true);
  assert.equal(await fallback.evaluate(node => node === document.activeElement),true);
});

test('旧财务次级路由安全回落到对账结算',async () => {
  await open('/P15-03');
  await page.waitForFunction(() => location.hash === '#/P15-02');
  assert.equal(await page.locator('.side-nav .nav-item.is-active').innerText(),'对账结算');
  assert.equal(await page.locator('[data-testid="settlement-table"]').count(),1);
  assert.equal(await page.locator('[data-testid="developer-finance-demo"]').getAttribute('data-finance-route'),'P15-02');
  assert.doesNotMatch(await page.locator('.context-bar').innerText(),/对账流水/);
  assert.doesNotMatch(await page.locator('.page-header').innerText(),/对账流水/);
  assert.doesNotMatch(await page.locator('[data-testid="developer-finance-demo"]').innerText(),/第三方支付商|交易流水/);
  assert.deepEqual(await page.evaluate(() => window.PublisherFinance.routeIds),['P01-01','P15-01','P15-02']);
  assert.equal(await page.evaluate(() => JSON.parse(document.getElementById('portal-routes').textContent).some(route => route.id === 'P15-03')),false);
});

test('财务整合版离开对账页后清空批量选择',async () => {
  await open('/P15-02');
  await page.locator('[data-d15-settlement-row][data-status="pending"] input[type="checkbox"]').first().check();
  assert.equal(await page.getByRole('button',{ name:'批量确认' }).getAttribute('aria-disabled'),null);
  await page.locator('.side-nav').getByText('财务主体',{ exact:true }).click();
  await page.waitForFunction(() => location.hash === '#/P01-01');
  await page.locator('.side-nav').getByText('对账结算',{ exact:true }).click();
  await page.waitForFunction(() => location.hash === '#/P15-02');
  assert.equal(await page.locator('[data-d15-select-statement]:checked').count(),0);
  assert.equal(await page.getByRole('button',{ name:'批量确认' }).getAttribute('aria-disabled'),'true');
});

test('390px 财务整合页无根页面横向溢出',async () => {
  await page.setViewportSize({ width:390,height:844 });
  await open('/P15-02');
  const dimensions = await page.evaluate(() => ({ client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth }));
  assert.equal(dimensions.scroll,dimensions.client);
  const tableScroll = await page.locator('[data-testid="settlement-table"]').evaluate(table => {
    const wrap = table.closest('.gh-table-wrap');
    wrap.scrollLeft = 120;
    return {
      client:wrap.clientWidth,
      scroll:wrap.scrollWidth,
      overflowX:getComputedStyle(wrap).overflowX,
      scrollLeft:wrap.scrollLeft,
    };
  });
  assert.ok(tableScroll.scroll > tableScroll.client);
  assert.ok(['auto','scroll'].includes(tableScroll.overflowX));
  assert.ok(tableScroll.scrollLeft > 0);
});

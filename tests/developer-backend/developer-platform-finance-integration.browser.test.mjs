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
const demo = path.join(demoDir, '开发者平台财务整合demo.html');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

let browser;
let page;

const url = hash => {
  const value = pathToFileURL(demo);
  value.hash = hash;
  return value.href;
};

async function openApprovedDeveloper(routePath = '/P15-01') {
  await page.goto(url('/P01-01'), { waitUntil:'load' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('gamehub-developer-session-v1', JSON.stringify({ authenticated:true, accountKey:'finance:approved' }));
    localStorage.setItem('gamehub-developer-account-states-v1', JSON.stringify({
      'finance:approved':{
        registration:{ accountTier:'enterprise', registeredAt:'2026-09-01 09:00', consoleTab:'games', vendorSettingsTab:'finance' },
        qualification:{
          applicationId:'ENT-FINANCE', status:'approved', step:5, view:'intro', editing:false, revision:1,
          submittedAt:'2026-09-01 09:00', form:{ vendorName:'星海互动', agreementAccepted:true },
          history:[], submissions:[],
        },
      },
    }));
  });
  const target = new URL(url(routePath));
  target.searchParams.set('testRun', `${Date.now()}-${Math.random()}`);
  await page.goto(target.href, { waitUntil:'load' });
  if (routePath.startsWith('/P15-')) await page.locator('[data-testid="developer-finance-demo"]').waitFor();
  else await page.locator('[data-publisher-workspace]').waitFor();
}

before(() => {
  assert.ok(chrome, 'Chrome or Edge not found');
  execFileSync(process.execPath, [path.join(demoDir, 'build.mjs'), '--module=02', '--variant=finance-integrated']);
  assert.ok(fs.existsSync(demo));
});

before(async () => {
  browser = await chromium.launch({ headless:true, executablePath:chrome, args:['--allow-file-access-from-files','--disable-background-networking'] });
});

beforeEach(async () => {
  page = await browser.newPage({ viewport:{ width:1440, height:900 } });
});

afterEach(async () => {
  await page?.close();
  page = null;
});

after(async () => {
  await browser?.close();
});

test('财务整合版复用唯一平台壳和厂商级导航', async () => {
  await openApprovedDeveloper('/P02-01');
  assert.deepEqual(await page.locator('.publisher-console-sidebar button').allTextContents(), ['游戏管理','财务主体','对账结算','厂商设置']);
  await page.getByRole('button', { name:'对账结算', exact:true }).click();
  await page.getByRole('heading', { level:1, name:'对账结算' }).waitFor();
  assert.equal(await page.locator('.top-bar').count(), 1);
  assert.equal(await page.locator('.side-nav').count(), 1);
  assert.deepEqual(await page.locator('.side-nav .nav-item').allTextContents(), ['游戏管理','财务主体','对账结算','厂商设置']);
  assert.equal(await page.getByRole('heading', { level:1, name:'对账结算' }).count(), 1);
  assert.equal(await page.locator('.developer-demo-state-fab').count(), 1);
});

test('对账流水保持对账结算高亮和四级定位', async () => {
  await openApprovedDeveloper('/P15-03');
  assert.equal(await page.locator('.side-nav .nav-item.is-active').innerText(), '对账结算');
  assert.match(await page.locator('.context-bar').innerText(), /开发者平台\s*\/\s*财务\s*\/\s*对账结算\s*\/\s*对账流水/);
  assert.equal(await page.getByRole('heading', { level:1, name:'对账流水' }).count(), 1);
});

test('结算记录每页20条且详情保持单层抽屉', async () => {
  await openApprovedDeveloper('/P15-02');
  assert.equal(await page.locator('[data-testid="settlement-table"] tbody tr').count(), 20);
  assert.match(await page.locator('.gh-pagination').innerText(), /每页\s*20\s*条/);
  await page.getByRole('button', { name:'查看', exact:true }).first().click();
  assert.equal(await page.getByRole('dialog').count(), 1);
  assert.equal(await page.locator('.developer-demo-state-switcher').isVisible(), false);
  const detailText = await page.getByRole('dialog').innerText();
  for (const label of ['账单汇总','来源构成','对账流水','差异记录','发票','付款']) assert.match(detailText, new RegExp(label));
});

test('统一场景球可切换穷举态和缺省态', async () => {
  await openApprovedDeveloper('/P15-01');
  await page.locator('.developer-demo-state-fab').click();
  await page.locator('[data-finance-scenario="empty"]').click();
  assert.equal(await page.getByText('尚未配置财务主体').isVisible(), true);
  await page.locator('[data-finance-scenario="exhaustive"]').click();
  assert.equal(await page.getByText('已生效').first().isVisible(), true);
});

test('厂商设置财务页签只读并站内进入财务主体', async () => {
  await openApprovedDeveloper('/P02-01');
  await page.locator('[data-portal-action="publisher-sidebar-view"][data-publisher-view="vendor"]').click();
  await page.locator('[data-portal-action="vendor-settings-tab"][data-vendor-settings-tab="finance"]').click();
  const panel = page.locator('[data-vendor-settings-panel="finance"]');
  assert.equal(await panel.locator('input, textarea, select').count(), 0);
  await panel.getByRole('button', { name:'前往财务主体' }).click();
  await page.waitForFunction(() => location.hash === '#/P15-01');
  await page.getByRole('heading', { level:1, name:'财务主体' }).waitFor();
  assert.equal(await page.getByRole('heading', { level:1, name:'财务主体' }).count(), 1);
});

test('财务页跟随平台语言切换', async () => {
  await openApprovedDeveloper('/P15-02');
  await page.getByRole('button', { name:'英语' }).click();
  assert.equal(await page.getByRole('heading', { level:1, name:'Reconciliation & settlement' }).count(), 1);
  assert.equal(await page.getByLabel('Statement').count(), 1);
  assert.equal(await page.locator('.side-nav').getByText('Finance entity').count(), 1);
});

test('390px 宽度无根页面横向溢出', async () => {
  await page.setViewportSize({ width:390, height:844 });
  await openApprovedDeveloper('/P15-02');
  const dimensions = await page.evaluate(() => ({ scrollWidth:document.body.scrollWidth, clientWidth:document.body.clientWidth }));
  assert.equal(dimensions.scrollWidth, dimensions.clientWidth);
});

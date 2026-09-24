import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const demoFile = path.resolve(process.env.PUBLISHER_CHANNEL_DEMO || 'demos/开发者后台一期/开发者平台demo.html');
const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const output = path.resolve(process.env.CONSOLE_NAV_EVIDENCE_DIR || 'tests/developer-backend/evidence/console-nav-consistency');
const labels = ['游戏管理', '渠道分销', '财务主体', '对账结算', '厂商设置'];
let browser;

const sidebar = page => page.locator('aside.publisher-console-sidebar');
const approvalButton = page => page.locator('button[data-portal-action="demo-approval-toggle"]').first();
const demoUrl = hash => { const url = pathToFileURL(demoFile); url.hash = hash; return url.href; };

async function openDemo(page, hash = '/P02-01') {
  // Same authenticated account shape used by demo-approval-default.browser.test.mjs.
  await page.addInitScript(({ demoName }) => {
    if (!decodeURIComponent(location.pathname).endsWith(`/${demoName}`) || sessionStorage.getItem('console-nav-seeded')) return;
    localStorage.clear(); sessionStorage.clear(); window.name = '';
    sessionStorage.setItem('console-nav-seeded', '1');
    localStorage.setItem('gamehub-developer-language-v1', 'zh');
    const accountKey = 'console-nav:approved';
    sessionStorage.setItem('gamehub-developer-session-v2', JSON.stringify({ version: 2, authenticated: true, accountKey, vendorId: 'VENDOR-STAR-001', activeGameId: '', qualificationStatus: 'approved', expiresAt: Date.now() + 28800000 }));
    localStorage.setItem('gamehub-developer-account-states-v1', JSON.stringify({ [accountKey]: {
      registration: { accountTier: 'enterprise', registeredAt: '2026-09-16 09:00', consoleTab: 'games' },
      qualification: { status: 'approved', revision: 1, step: 5, view: 'form', form: {}, history: [], submissions: [] },
    } }));
  }, { demoName: path.basename(demoFile) });
  await page.goto(demoUrl(hash), { waitUntil: 'load' });
  await sidebar(page).waitFor();
}

async function expectNavigation(page, activeLabel) {
  const nav = sidebar(page);
  assert.equal(await nav.count(), 1, '企业页面只使用一个共享侧栏');
  assert.equal(await nav.locator(':scope > strong').innerText(), '开发者控制台');
  const actual = await nav.locator('button b').allTextContents();
  assert.deepEqual(actual, labels, '切换页面后企业入口名称与顺序不能变化');
  assert.equal(await nav.locator('button.is-active').count(), 1, '只允许当前页面选中');
  assert.equal(await nav.locator('button.is-active b').innerText(), activeLabel);
  assert.ok(await approvalButton(page).isVisible(), '审核状态按钮必须常驻');
  const fixed = await approvalButton(page).boundingBox();
  const viewport = page.viewportSize();
  assert.ok(fixed.x >= 0 && fixed.x + fixed.width <= viewport.width + 1 && fixed.y >= 0 && fixed.y + fixed.height <= viewport.height + 1, '审核按钮应在当前视口内');
}

async function navigate(page, label) {
  await sidebar(page).getByRole('button', { name: label, exact: true }).click();
  if (label === '财务主体' || label === '对账结算') await page.getByRole('heading', { name: label, exact: true, level: 1 }).waitFor();
  else await page.locator(`[data-workspace-view="${({ 游戏管理: 'games', 渠道分销: 'channels', 厂商设置: 'vendor' })[label]}"]`).waitFor();
  await expectNavigation(page, label);
}

async function expectChannelSection(page, section) {
  await page.locator('[data-workspace-view="channels"]').waitFor();
  await expectNavigation(page, '渠道分销');
  const tabs = page.locator('[data-portal-action="enterprise-channel-section"]');
  assert.deepEqual(await tabs.allTextContents(), ['渠道与供给', '分销数据']);
  assert.equal(await page.locator(`[data-channel-section="${section}"]`).getAttribute('aria-pressed'), 'true');
  await page.locator(section === 'channel-supply' ? '.publisher-channel-table--channels' : '.publisher-channel-table--distribution').waitFor();
}

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  assert.ok(fs.existsSync(demoFile), '请先构建正式 Demo');
  fs.mkdirSync(output, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files', '--disable-background-networking'] });
});
after(async () => browser?.close());

for (const width of [1440, 390]) {
  test(`${width}px 企业顶层页面导航文案和渠道入口持续一致，财务页可直接返回渠道`, async () => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await openDemo(page);
      await expectNavigation(page, '游戏管理');
      await navigate(page, '财务主体');
      await page.screenshot({ path: path.join(output, `finance-navigation-${width}.png`), fullPage: false });
      await navigate(page, '渠道分销');
      await expectChannelSection(page, 'channel-supply');
      await page.screenshot({ path: path.join(output, `channel-supply-${width}.png`), fullPage: false });
      await page.locator('[data-channel-section="channel-revenue"]').click();
      await expectChannelSection(page, 'channel-revenue');
      await page.screenshot({ path: path.join(output, `channel-revenue-${width}.png`), fullPage: false });
      await navigate(page, '对账结算');
      await navigate(page, '厂商设置');
      await navigate(page, '游戏管理');
      assert.deepEqual(errors, [], '导航期间不能出现运行时错误');
    } finally { await page.close(); }
  });
}

for (const section of ['channel-supply', 'channel-revenue']) {
  test(`${section} 直达链接打开对应页签，后续导航与刷新恢复当前页面`, async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      await openDemo(page, `/P02-01?view=channels&section=${section}`);
      await expectChannelSection(page, section);
      await page.reload({ waitUntil: 'load' });
      await expectChannelSection(page, section);
      await navigate(page, '厂商设置');
      await page.reload({ waitUntil: 'load' });
      await page.locator('[data-workspace-view="vendor"]').waitFor();
      await expectNavigation(page, '厂商设置');
    } finally { await page.close(); }
  });
}

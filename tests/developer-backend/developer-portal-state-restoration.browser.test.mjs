import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const publisherDemo = path.join(root, 'demos', '开发者后台一期', '02-游戏创建与发行demo.html');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

let browser;

const demoUrl = route => {
  const url = pathToFileURL(publisherDemo);
  url.hash = route;
  return url.href;
};

const seedLegacyAccount = async (page, accountKey, qualificationStatus) => {
  await page.evaluate(({ accountKey: key, qualificationStatus: status }) => {
    sessionStorage.setItem('gamehub-developer-session-v1', JSON.stringify({ authenticated: true, accountKey: key }));
    localStorage.setItem('gamehub-developer-account-states-v1', JSON.stringify({
      [key]: {
        registration: { accountTier: status === 'approved' ? 'enterprise' : 'registered', registeredAt: '2026-09-10 10:00', consoleTab: 'games' },
        qualification: { status, revision: status === 'unsubmitted' ? 0 : 1, step: status === 'unsubmitted' ? 0 : 5, form: {}, history: [], submissions: [] },
      },
    }));
  }, { accountKey, qualificationStatus });
};

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files', '--disable-background-networking'] });
});

after(async () => { await browser?.close(); });

test('未登录直达 02 会落到统一登录路由', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P02-01'), { waitUntil: 'load' });
    await page.waitForURL(/#\/P01-01$/);
    assert.match(page.url(), /#\/P01-01$/);
    assert.equal(await page.locator('[data-publisher-access]').count(), 0);
  } finally { await context.close(); }
});

for (const [status, accountKind] of [
  ['unsubmitted', 'personal'],
  ['pending', 'personal'],
  ['rejected', 'personal'],
  ['approved', 'enterprise'],
  ['delisted', 'suspended'],
]) test(`${status} 状态刷新后仍保持对应 02 权限`, async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
    await seedLegacyAccount(page, `state:${status}`, status);
    await page.reload({ waitUntil: 'load' });
    await page.goto(demoUrl('/P02-01'), { waitUntil: 'load' });
    const workspace = page.locator(`[data-publisher-access="${accountKind}"]`).first();
    await workspace.waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('gamehub-developer-session-v2') || 'null')?.qualificationStatus), status);
    await page.reload({ waitUntil: 'load' });
    assert.equal(await workspace.count(), 1);
    const v2Session = await page.evaluate(() => JSON.parse(sessionStorage.getItem('gamehub-developer-session-v2') || 'null'));
    assert.equal(v2Session?.qualificationStatus, status);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('gamehub-developer-session-v1')), null);
  } finally { await context.close(); }
});

test('有效 handoff 恢复完整账号状态后立即清除 window.name', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
    await page.evaluate(() => {
      window.name = JSON.stringify({
        source: 'gamehub-developer-platform',
        version: 1,
        authenticated: true,
        accountKey: 'handoff:pending',
        vendorId: 'V-HANDOFF',
        activeGameId: 'existing',
        qualificationStatus: 'pending',
        targetRoute: 'P02-01',
        targetTab: 'qualifications',
        expiresAt: Date.now() + 60_000,
      });
    });
    await page.reload({ waitUntil: 'load' });
    await page.locator('[data-publisher-profile][data-publisher-access="personal"][data-qualification-status="pending"]').waitFor();
    assert.equal(await page.evaluate(() => window.name), '');
    assert.match(page.url(), /#\/P02-01$/);
    assert.equal(await page.locator('[data-publisher-profile][data-profile-module="qualifications"]').count(), 1);
  } finally { await context.close(); }
});

test('新建游戏退出后用同一账号再登录仍保留在游戏列表', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const accountKey = 'phone:13800138009';
  try {
    await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
    await seedLegacyAccount(page, accountKey, 'approved');
    await page.reload({ waitUntil: 'load' });
    await page.goto(demoUrl('/P02-01'), { waitUntil: 'load' });
    await page.getByRole('button', { name: '添加游戏', exact: true }).click();
    await page.locator('[data-create-project-name]').fill('重登保留项目');
    await page.locator('[data-create-genre-toggle]').click();
    await page.locator('[data-create-genre-option][value="冒险"]').check();
    await page.keyboard.press('Escape');
    await page.locator('[data-create-relationship]').selectOption('developer_publisher');
    await page.locator('.pgc-plan-card--reservation').click();
    await page.locator('[data-create-submit]').click();
    await page.locator('[data-publisher-game-console]').waitFor();
    await page.locator('[data-portal-action="toggle-account-menu"]').click();
    await page.locator('[data-portal-action="logout"]').click();
    await page.evaluate(key => {
      sessionStorage.setItem('gamehub-developer-session-v1', JSON.stringify({ authenticated: true, accountKey: key }));
      history.replaceState(null, '', '#/P02-01');
    }, accountKey);
    await page.reload({ waitUntil: 'load' });
    await page.locator('[data-publisher-workspace]').waitFor();
    if (await page.locator('[data-portal-action="back-publisher-games"]').count()) {
      await page.locator('[data-portal-action="back-publisher-games"]').first().click();
    }
    await page.getByRole('heading', { name: '重登保留项目', exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: '重登保留项目', exact: true }).count(), 1);
  } finally { await context.close(); }
});

test('退出后浏览器返回不会恢复 02 受保护内容', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
    await seedLegacyAccount(page, 'state:logout', 'approved');
    await page.reload({ waitUntil: 'load' });
    await page.goto(demoUrl('/P02-01'), { waitUntil: 'load' });
    await page.locator('[data-publisher-access="enterprise"]').waitFor();
    await page.locator('[data-portal-action="toggle-account-menu"]').click();
    await page.locator('[data-portal-action="logout"]').click();
    assert.match(page.url(), /#\/P01-01$/);
    await page.goBack();
    await page.waitForURL(/#\/P01-01$/);
    assert.match(page.url(), /#\/P01-01$/);
    assert.equal(await page.locator('[data-publisher-access]').count(), 0);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('gamehub-developer-session-v2')), null);
  } finally { await context.close(); }
});

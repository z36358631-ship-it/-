import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const demoFile = path.resolve('demos/开发者后台一期/02-游戏创建与发行demo.html');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

let browser;

const demoUrl = route => {
  const url = pathToFileURL(demoFile);
  url.hash = route;
  return url.href;
};

const seedAccount = async (page, status, accountKey) => {
  await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
  await page.evaluate(({ key, qualificationStatus }) => {
    localStorage.clear();
    sessionStorage.clear();
    window.name = '';
    sessionStorage.setItem('gamehub-developer-session-v1', JSON.stringify({ authenticated: true, accountKey: key }));
    localStorage.setItem('gamehub-developer-account-states-v1', JSON.stringify({
      [key]: {
        registration: { accountTier: qualificationStatus === 'approved' ? 'enterprise' : 'registered', registeredAt: '2026-09-10 10:00', consoleTab: 'games' },
        qualification: { status: qualificationStatus, revision: 0, step: 0, view: 'intro', form: {}, history: [], submissions: [] },
      },
    }));
    history.replaceState(null, '', '#/P02-01');
  }, { key: accountKey, qualificationStatus: status });
  await page.reload({ waitUntil: 'load' });
};

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files'] });
});

after(async () => { await browser?.close(); });

test('首次登录先选择入驻方式，完成注册后进入 02 并使用原添加游戏流程', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
    await page.locator('.public-login-button').click();
    const panel = page.locator('[data-login-panel="zh"]');
    await panel.locator('input[name="loginAccount"]').fill('13800001234');
    await panel.locator('input[name="zh-verification-code"]').fill('123456');
    await panel.getByRole('button', { name: '登录 / 注册', exact: true }).click();
    await page.waitForURL(/#\/P01-03$/);
    assert.equal(await page.getByText('选择当前入驻方式', { exact: true }).isVisible(), true);
    await page.getByRole('button', { name: '快速注册', exact: true }).click();
    await page.waitForURL(/#\/P02-01$/);
    await page.locator('.publisher-console-sidebar').waitFor();
    assert.equal(await page.locator('.publisher-console-sidebar').isVisible(), true);
    assert.equal(await page.locator('[data-platform-tab-bar]').count(), 0);
    await page.getByRole('button', { name: '添加游戏', exact: true }).click();
    await page.locator('[data-publisher-create]').waitFor();
    assert.equal(await page.getByRole('heading', { name: '创建游戏', exact: true }).isVisible(), true);
  } finally { await context.close(); }
});

test('同一 Demo 可在 02 开发者前台和 01 运营后台之间快速切换', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await seedAccount(page, 'approved', 'shell:switch');
    const toOperations = page.locator('[data-portal-action="switch-portal-side"]');
    assert.equal(await toOperations.innerText(), '切换运营后台');
    await toOperations.click();
    await page.waitForURL(/#\/P01-08$/);
    await page.locator('.product-frame[data-role="operations"]').waitFor();
    assert.equal(await page.locator('.product-frame[data-role="operations"]').isVisible(), true);
    assert.deepEqual(await page.locator('.side-nav--operations .nav-item').allTextContents(), ['企业认证内容配置', '帮助中心', '发行审核']);
    assert.deepEqual(await page.locator('[data-game-review-tab]').allTextContents(), ['企业认证审核', '游戏发布审核', '游戏资质审核']);
    const toDeveloper = page.locator('[data-portal-action="switch-portal-side"]');
    assert.equal(await toDeveloper.innerText(), '切换开发者前台');
    await toDeveloper.click();
    await page.waitForURL(/#\/P02-01$/);
    await page.locator('.publisher-console-sidebar').waitFor();
    assert.equal(await page.locator('.publisher-console-sidebar').isVisible(), true);
  } finally { await context.close(); }
});

test('从 02 申请主体认证时直接打开已预填的 01 认证表单', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await seedAccount(page, 'unsubmitted', 'shell:qualification');
    await page.locator('.publisher-console-sidebar').waitFor();
    await page.locator('[data-portal-action="enter-publisher-game"][data-publisher-game="draft"]').first().click();
    await page.locator('[data-publisher-restriction="unsubmitted"] [data-portal-action="publisher-enterprise-verification"]').click();
    await page.waitForURL(/#\/P01-03$/);
    await page.locator('[data-qualification-form-page]').waitFor();
    assert.equal(await page.locator('[data-platform-tab-bar]').count(), 0);
    assert.equal(await page.locator('[name="legalName"]').inputValue(), '深圳星海互动科技有限公司');
    assert.equal(await page.locator('[name="registrationNumber"]').inputValue(), '9144XXXXXXXXXXXXXX');
    assert.equal(await page.locator('[data-file-name="businessLicenseName"]').innerText(), '营业执照.jpg');
    assert.equal(await page.locator('[name="agreementAccepted"]').isChecked(), true);
  } finally { await context.close(); }
});

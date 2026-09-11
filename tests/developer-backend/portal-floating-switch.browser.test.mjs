import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const developerDemoFile = path.resolve('demos/开发者后台一期/开发者平台demo.html');
const operationsDemoFile = path.resolve('demos/开发者后台一期/发行平台运营后台demo.html');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));
let browser;

const demoUrl = (demoFile, route) => {
  const url = pathToFileURL(demoFile);
  url.hash = route;
  return url.href;
};

async function seedApprovedAccount(page, accountKey) {
  await page.goto(demoUrl(developerDemoFile, '/P01-01'), { waitUntil: 'load' });
  await page.evaluate(key => {
    localStorage.clear();
    sessionStorage.clear();
    window.name = '';
    sessionStorage.setItem('gamehub-developer-session-v1', JSON.stringify({ authenticated: true, accountKey: key }));
    localStorage.setItem('gamehub-developer-account-states-v1', JSON.stringify({
      [key]: {
        registration: { accountTier: 'enterprise', registeredAt: '2026-09-10 10:00', consoleTab: 'games' },
        qualification: { status: 'approved', revision: 1, step: 5, view: 'form', form: {}, history: [], submissions: [] },
      },
    }));
    history.replaceState(null, '', '#/P02-01');
  }, accountKey);
  await page.reload({ waitUntil: 'load' });
  await page.locator('[data-publisher-workspace][data-publisher-access="enterprise"]').waitFor();
}

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files', '--disable-background-networking'] });
});

after(async () => { await browser?.close(); });

test('两个正式 Demo 在桌面端均不渲染前后台悬浮切换入口', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  try {
    await seedApprovedAccount(page, 'standalone:desktop');
    assert.equal(await page.locator('.portal-demo-switch').count(), 0);
    assert.equal(await page.locator('[data-portal-action="switch-portal-side"]').count(), 0);
    assert.equal(await page.locator('.product-frame[data-role="developer"]').isVisible(), true);

    await page.goto(demoUrl(operationsDemoFile, '/P01-08'), { waitUntil: 'load' });
    await page.locator('.product-frame[data-role="operations"]').waitFor();
    assert.equal(await page.locator('.portal-demo-switch').count(), 0);
    assert.equal(await page.locator('[data-portal-action="switch-portal-side"]').count(), 0);
    assert.deepEqual(runtimeErrors, []);
  } finally {
    await context.close();
  }
});

test('两个正式 Demo 在 390px 下无切换入口且没有页面级横向溢出', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await seedApprovedAccount(page, 'standalone:narrow');
    assert.equal(await page.locator('.portal-demo-switch').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

    await page.goto(demoUrl(operationsDemoFile, '/P01-08'), { waitUntil: 'load' });
    await page.locator('.product-frame[data-role="operations"]').waitFor();
    assert.equal(await page.locator('.portal-demo-switch').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  } finally {
    await context.close();
  }
});

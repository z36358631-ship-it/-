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

async function seedApprovedAccount(page, accountKey) {
  await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
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

test('前后台切换作为 portal-stage 悬浮 Demo 工具双向工作，顶部栏不再承载入口', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  try {
    await seedApprovedAccount(page, 'floating-switch:desktop');
    assert.equal(await page.locator('.top-bar [data-portal-action="switch-portal-side"]').count(), 0);
    const toOperations = page.locator('.portal-stage > .portal-demo-switch');
    assert.equal(await toOperations.count(), 1);
    assert.equal((await toOperations.locator('.portal-demo-switch__badge').innerText()).toLowerCase(), 'demo');
    assert.equal(await toOperations.getAttribute('aria-label'), 'Demo 工具：切换运营后台');
    assert.equal(await toOperations.evaluate(element => getComputedStyle(element).position), 'fixed');

    await toOperations.click();
    await page.waitForURL(/#\/P01-08$/);
    await page.locator('.product-frame[data-role="operations"]').waitFor();
    assert.equal(await page.locator('.top-bar [data-portal-action="switch-portal-side"]').count(), 0);
    const toDeveloper = page.locator('.portal-stage > .portal-demo-switch');
    assert.equal(await toDeveloper.getAttribute('aria-label'), 'Demo 工具：切换开发者前台');
    await toDeveloper.click();
    await page.waitForURL(/#\/P02-01$/);
    await page.locator('[data-publisher-workspace]').waitFor();
    assert.deepEqual(runtimeErrors, []);
  } finally {
    await context.close();
  }
});

test('登录页和脱敏页面不渲染悬浮切换工具', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
    assert.equal(await page.locator('.portal-demo-switch').count(), 0);

    const hiddenStates = await page.evaluate(() => {
      const namespace = window.GameHubDeveloperPortal;
      const route = { id: 'P02-01', moduleId: '02', role: 'developer', title: '游戏创建与发行' };
      const containsSwitch = (state, accounts) => {
        const html = namespace.shell.renderBusiness({
          module: { id: '02' },
          routes: [route],
          route,
          page: {},
          portalData: { accounts, helpCenter: { faq: [], contact: {} } },
          role: 'developer',
          state,
          content: '',
          qualification: { status: 'approved' },
          language: 'zh',
          managedContent: {},
          registration: { accountTier: 'enterprise' },
        });
        const holder = document.createElement('div');
        holder.innerHTML = html;
        return Boolean(holder.querySelector('.portal-demo-switch'));
      };
      return {
        redacted: containsSwitch('permission', { developer: { name: '测试账号' } }),
        noAccount: containsSwitch('default', {}),
      };
    });
    assert.deepEqual(hiddenStates, { redacted: false, noAccount: false });
  } finally {
    await context.close();
  }
});

test('390px 窄屏使用短文案并保持在视口内，不遮挡添加游戏主操作', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await seedApprovedAccount(page, 'floating-switch:narrow');
    const floating = page.locator('.portal-stage > .portal-demo-switch');
    const addGame = page.getByRole('button', { name: '添加游戏', exact: true });
    const layout = await page.evaluate(({ floatingSelector, addGameText }) => {
      const floatingElement = document.querySelector(floatingSelector);
      const addGameElement = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === addGameText);
      const box = floatingElement.getBoundingClientRect();
      const actionBox = addGameElement.getBoundingClientRect();
      const intersects = !(box.right <= actionBox.left || box.left >= actionBox.right || box.bottom <= actionBox.top || box.top >= actionBox.bottom);
      return {
        box: { top: box.top, right: box.right, bottom: box.bottom, left: box.left },
        viewport: { width: innerWidth, height: innerHeight },
        overflow: document.documentElement.scrollWidth > innerWidth,
        fullDisplay: getComputedStyle(floatingElement.querySelector('.portal-demo-switch__label--full')).display,
        shortDisplay: getComputedStyle(floatingElement.querySelector('.portal-demo-switch__label--short')).display,
        intersects,
      };
    }, { floatingSelector: '.portal-stage > .portal-demo-switch', addGameText: '添加游戏' });
    assert.equal(await floating.isVisible(), true);
    assert.equal(await addGame.isVisible(), true);
    assert.equal(layout.overflow, false);
    assert.ok(layout.box.left >= 0 && layout.box.right <= layout.viewport.width);
    assert.ok(layout.box.top >= 0 && layout.box.bottom <= layout.viewport.height);
    assert.equal(layout.fullDisplay, 'none');
    assert.notEqual(layout.shortDisplay, 'none');
    assert.equal(layout.intersects, false);
  } finally {
    await context.close();
  }
});

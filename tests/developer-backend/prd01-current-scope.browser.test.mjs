import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demoFile = path.join(root, 'demos', '开发者后台一期', '01-开发者平台与资料demo.html');
const assetDir = path.join(root, 'public', 'prd', 'genuine-game-distribution-phase1', 'developer-backend-final', '01');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

let browser;

const demoUrl = hash => {
  const url = pathToFileURL(demoFile);
  url.hash = hash;
  return url.href;
};

const hasHorizontalOverflow = page => page.evaluate(() => (
  document.documentElement.scrollWidth > document.documentElement.clientWidth
  || document.body.scrollWidth > document.body.clientWidth
));

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files', '--disable-background-networking'] });
});

after(async () => { await browser?.close(); });

test('第一份 Demo 只暴露本期四个业务路由', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
    const routeIds = await page.locator('#portal-routes').evaluate(node => JSON.parse(node.value).map(route => route.id));
    assert.deepEqual(routeIds, ['P01-01', 'P01-03', 'P01-08', 'P01-09']);
  } finally {
    await context.close();
  }
});

test('平台控制台使用横向 Tab，游戏与接入资料仅作后续占位', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-03?preview=approved'), { waitUntil: 'load' });
    const tabs = page.getByRole('tab');
    assert.deepEqual(await tabs.allTextContents(), ['数据总览', '游戏管理', '接入资料', '成为开发者']);
    assert.equal(await page.getByText('游戏数据总览', { exact: true }).isVisible(), true);
    for (const label of ['浏览量', '下载量', '预约量', '转化效果', '收益金额']) {
      assert.equal(await page.getByText(label, { exact: true }).isVisible(), true);
    }
    if (process.env.CAPTURE_PRD_ASSET === '1') {
      fs.mkdirSync(assetDir, { recursive: true });
      await page.screenshot({ path: path.join(assetDir, 'P01-03-console.png'), animations: 'disabled' });
    }

    await page.getByRole('tab', { name: '游戏管理', exact: true }).click();
    assert.match(await page.locator('[data-platform-console-panel="games"]').innerText(), /本期仅作占位[\s\S]*等待后续 PRD 定义/);
    assert.equal(await page.getByRole('button', { name: '创建游戏', exact: true }).count(), 0);
    assert.equal(await page.getByText('APPID', { exact: true }).count(), 0);

    await page.getByRole('tab', { name: '接入资料', exact: true }).click();
    assert.match(await page.locator('[data-platform-console-panel="resources"]').innerText(), /企业认证说明[\s\S]*包体与 SDK 接入说明[\s\S]*CDKEY 与渠道交付说明/);
    assert.equal(await hasHorizontalOverflow(page), false);
  } finally {
    await context.close();
  }
});

for (const viewport of [{ width: 320, height: 760 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}px 下首页、登录、控制台、帮助中心和内容配置无根节点横向溢出`, async () => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try {
      await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
      assert.equal(await hasHorizontalOverflow(page), false);
      await page.getByRole('button', { name: '登录', exact: true }).first().click();
      assert.equal(await page.getByRole('dialog', { name: '开发者中心登录' }).isVisible(), true);
      assert.equal(await hasHorizontalOverflow(page), false);

      await page.goto(demoUrl('/P01-03?preview=approved'), { waitUntil: 'load' });
      await page.reload({ waitUntil: 'load' });
      assert.equal(await hasHorizontalOverflow(page), false);
      await page.locator('[data-help-open]').click();
      assert.equal(await page.locator('[data-help-center]').isVisible(), true);
      assert.equal(await hasHorizontalOverflow(page), false);

      await page.goto(demoUrl('/P01-09?role=operations'), { waitUntil: 'load' });
      await page.reload({ waitUntil: 'load' });
      assert.equal(await page.locator('[data-managed-content]').isVisible(), true);
      assert.equal(await hasHorizontalOverflow(page), false);
    } finally {
      await context.close();
    }
  });
}

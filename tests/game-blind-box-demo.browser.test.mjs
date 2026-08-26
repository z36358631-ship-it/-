import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = process.cwd();
const demoPath = path.join(root, 'demos', '首页与探索', '游戏盲盒demo.html');
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(fs.existsSync);

assert.ok(executablePath, '未找到本地 Chrome 或 Edge');
assert.ok(fs.existsSync(demoPath), '请先运行 node tools/build-game-blind-box-demo.mjs');

async function createPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${pathToFileURL(demoPath).href}?test=1`, { waitUntil: 'load' });
  return { page, errors };
}

test('新版游戏库浮层内轮换候选并命中单款结果', { timeout: 20_000 }, async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const { page, errors } = await createPage(browser);
  try {
    assert.equal(await page.evaluate(() => demo.dedupePool().length), 4);
    assert.equal(await page.evaluate(() => demo.dedupePool().filter(game => game.gameId === 'silksong').length), 1);
    assert.equal(await page.locator('[data-testid="blind-entry"]').count(), 1);
    assert.equal(await page.locator('.p-games > .blind-game-card[data-testid="blind-entry"]:first-child').count(), 1, '竖屏入口应为我的游戏第一张功能卡');
    assert.equal(await page.locator('.p-games > .p-game:not(.blind-game-card)').count(), 4, '盲盒功能卡不计入用户游戏数量');
    assert.equal(await page.locator('.library-head > .library-tools').count(), 1, '我的游戏标题与工具栏必须位于同一行容器');
    assert.equal(await page.locator('[data-testid="blind-entry"] .blind-collage-tile').count(), 4, '盲盒卡应使用4款真实游戏封面组成聚合背景');
    const headerAlignment = await page.evaluate(() => {
      const title = document.querySelector('.library-head-copy')?.getBoundingClientRect();
      const tools = document.querySelector('.library-tools')?.getBoundingClientRect();
      return title && tools ? Math.abs((title.top + title.height / 2) - (tools.top + tools.height / 2)) : 999;
    });
    assert.ok(headerAlignment <= 2, `我的游戏标题与工具栏未垂直居中：${headerAlignment}px`);
    assert.deepStrictEqual(await page.evaluate(() => demo.drawTiming), {
      cycleMs: 100,
      totalMs: 1200,
      testCycleMs: 40,
      testTotalMs: 280,
      reducedTotalMs: 180,
    }, '正式随机切换应提速至约100ms/款，并保留减少动态效果分支');
    assert.equal(await page.locator('.library-head [data-testid="blind-entry"]').count(), 0);
    assert.equal(await page.locator('.quick-grid [data-testid="blind-entry"]').count(), 0, '盲盒不是 Steam/Epic/导入游戏之外的第 4 种来源');

    await page.locator('[data-testid="blind-entry"]').click();
    assert.equal(await page.locator('[data-testid="blind-modal"]').count(), 1);
    assert.equal(await page.locator('.p-shell').count(), 1, '打开盲盒后底层游戏库应保留');
    assert.equal(await page.locator('[data-testid="drawing"]').count(), 1);
    assert.equal(await page.locator('[data-testid="drawing"] .slot-cover').count(), 1);
    assert.equal(await page.locator('[data-testid="drawing"] .slot-name').count(), 1);
    assert.equal(await page.locator('[data-testid="drawing"] .rating-chip').count(), 1);
    assert.equal(await page.locator('[data-testid="drawing"] .type-chip').count(), 2);
    assert.equal(await page.locator('[data-testid="drawing"] .status-chip').count(), 0);
    assert.equal(await page.locator('[data-testid="drawing"] .slot-badge').count(), 0);
    assert.equal(await page.locator('.modal-actions button').count(), 2, '抽取中双按钮需固定占位');
    assert.equal(await page.locator('[data-testid="view-details"]').isDisabled(), true);
    assert.equal(await page.locator('[data-testid="draw-again"]').isDisabled(), true);
    const firstPreview = await page.locator('[data-testid="drawing"]').getAttribute('data-preview-game');
    await page.evaluate(() => {
      window.__blindShell = document.querySelector('.p-shell');
      window.__blindModal = document.querySelector('[data-testid="blind-modal"]');
      window.__blindSlot = document.querySelector('[data-testid="drawing"]');
    });
    await page.waitForFunction(first => document.querySelector('[data-testid="drawing"]')?.dataset.previewGame !== first, firstPreview);
    assert.deepStrictEqual(await page.evaluate(() => ({
      shellSame: window.__blindShell === document.querySelector('.p-shell'),
      modalSame: window.__blindModal === document.querySelector('[data-testid="blind-modal"]'),
      slotSame: window.__blindSlot === document.querySelector('[data-testid="drawing"]'),
    })), { shellSame: true, modalSame: true, slotSame: true }, '随机过程中只能更新弹窗内部内容，不得重绘页面或弹窗');
    await page.waitForSelector('[data-testid="result"]');
    assert.deepStrictEqual(await page.evaluate(() => ({
      shellSame: window.__blindShell === document.querySelector('.p-shell'),
      modalSame: window.__blindModal === document.querySelector('[data-testid="blind-modal"]'),
      slotSame: window.__blindSlot === document.querySelector('[data-testid="result"]'),
    })), { shellSame: true, modalSame: true, slotSame: true }, '命中结果也应在原弹窗容器内完成');
    assert.equal(await page.locator('[data-testid="result"] .slot-name').count(), 1);
    assert.equal(await page.locator('[data-testid="result"] .rating-chip').count(), 1);
    assert.equal(await page.locator('[data-testid="result"] .type-chip').count(), 2);
    assert.equal(await page.locator('[data-testid="result"] .status-chip').count(), 0);
    assert.equal(await page.locator('[data-testid="result"] .slot-badge').count(), 0);
    assert.doesNotMatch(await page.locator('[data-testid="blind-modal"]').innerText(), /已安装|未下载|已命中|\b\d+\/\d+\b/);

    const firstGame = await page.evaluate(() => demo.state.result.gameId);
    await page.locator('[data-testid="draw-again"]').click();
    await page.waitForSelector('[data-testid="result"]');
    const secondGame = await page.evaluate(() => demo.state.result.gameId);
    assert.notEqual(secondGame, firstGame, '同一轮再选不应重复上一次结果');
    assert.equal(await page.evaluate(() => new Set(demo.state.history).size), 2);
    assert.deepStrictEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('可玩与未下载结果都只保留查看详情和再抽一次', { timeout: 20_000 }, async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const { page, errors } = await createPage(browser);
  try {
    await page.evaluate(() => demo.setDemoState('result'));
    assert.equal(await page.locator('[data-testid="direct-launch"]').count(), 0);
    assert.equal(await page.locator('.modal-actions button').count(), 2);
    await page.evaluate(() => demo.setDemoState('uninstalled-result'));
    assert.equal(await page.locator('[data-testid="direct-launch"]').count(), 0);
    assert.equal(await page.locator('[data-testid="view-details"]').count(), 1);
    assert.equal(await page.locator('[data-testid="draw-again"]').count(), 1);
    await page.locator('[data-testid="view-details"]').click();
    assert.equal(await page.locator('[data-testid="detail-page"]').count(), 1);
    assert.match((await page.locator('.detail-primary').textContent()) ?? '', /获取|Get or play|Получить|入手|Obter/);
    assert.deepStrictEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('推荐池不足隐藏入口，网络失败在原浮层内重试且不引导 Steam 登录', { timeout: 20_000 }, async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const { page, errors } = await createPage(browser);
  try {
    await page.evaluate(() => demo.setDemoState('small-pool'));
    assert.equal(await page.locator('[data-testid="blind-entry"]').count(), 0);
    assert.doesNotMatch(await page.locator('#app').innerText(), /登录 Steam|Sign in to Steam|Войти в Steam/);

    await page.evaluate(() => demo.setDemoState('network-error'));
    assert.equal(await page.locator('[data-testid="network-error"]').count(), 1);
    assert.equal(await page.locator('[data-testid="view-details"]').isDisabled(), true);
    await page.locator('[data-testid="draw-again"]').click();
    await page.waitForSelector('[data-testid="result"]');
    assert.equal(await page.locator('[data-testid="result"]').count(), 1);
    assert.deepStrictEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('横竖屏独立 Shell 与五种语言无主操作溢出', { timeout: 20_000 }, async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const { page, errors } = await createPage(browser);
  try {
    for (const orientation of ['portrait', 'landscape']) {
      await page.evaluate(value => demo.setOrientation(value), orientation);
      assert.equal(await page.locator('[data-testid="device"]').evaluate((node, value) => node.classList.contains(value), orientation), true);
      if (orientation === 'portrait') {
        assert.equal(await page.locator('.p-games > .blind-game-card[data-testid="blind-entry"]:first-child').count(), 1);
        assert.equal(await page.locator('.library-head [data-testid="blind-entry"]').count(), 0);
        assert.equal(await page.locator('.quick-grid [data-testid="blind-entry"]').count(), 0);
      } else {
        assert.equal(await page.locator('.l-game-strip > .l-blind-card[data-testid="blind-entry"]:first-child').count(), 1);
        assert.equal(await page.locator('.l-summary-actions [data-testid="blind-entry"]').count(), 0);
        assert.equal(await page.locator('.l-quick [data-testid="blind-entry"]').count(), 0, '横屏底部快捷区只保留既有来源/库入口');
      }
      for (const locale of ['zh-CN', 'en-US', 'ru-RU', 'ja-JP', 'pt-BR']) {
        await page.evaluate(value => demo.setLocale(value), locale);
        await page.evaluate(() => demo.setDemoState('result'));
        const overflows = await page.locator('.modal-actions .modal-action').evaluateAll(nodes => nodes.filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.textContent?.trim()));
        assert.deepStrictEqual(overflows, [], `${orientation}/${locale} 主操作文案发生溢出`);
      }
    }
    assert.deepStrictEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('构建产物为离线单文件且无禁用运行时', () => {
  const html = fs.readFileSync(demoPath, 'utf8');
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(html, /<(?:iframe|canvas)\b/i);
  assert.doesNotMatch(html, /__ASSET_[A-Z_]+__/);
  assert.match(html, /data:image\/(?:webp|jpeg);base64,/);
  assert.match(html, /data:image\/svg\+xml;base64,/);
});

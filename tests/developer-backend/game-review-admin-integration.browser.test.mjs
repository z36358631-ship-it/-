import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const demoDir = path.resolve('demos/开发者后台一期');
const demoFile = path.join(demoDir, '发行平台运营后台demo.html');
const demoUrl = pathToFileURL(demoFile).href + '#/P01-08';
let browser;

before(async () => {
  execFileSync(process.execPath, [path.join(demoDir, 'build.mjs'), '--module=01'], { stdio: 'pipe' });
  browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files'],
  });
});

after(async () => { await browser?.close(); });

test('01 单文件按共享 Schema、资质审核、上架审核、应用入口顺序加载', () => {
  const html = fs.readFileSync(demoFile, 'utf8');
  const positions = [
    "const DB_NAME = 'gamehub-publisher-profiles-v1'",
    'global.PublisherQualificationReviewStore =',
    'global.PublisherQualificationReview =',
    'global.PublisherGameReviewStore =',
    'global.PublisherGameReview =',
    '(function startApplication(namespace)',
  ].map(marker => html.indexOf(marker));
  assert.equal(positions.every(position => position >= 0), true, JSON.stringify(positions));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  assert.match(html, /\.operations-audit-tabs\{/);
});

test('P01-08 三个审核 Tab 可切换并分别挂载对应审核界面', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(demoUrl, { waitUntil: 'load' });
    const tabs = page.locator('[data-game-review-tab]');
    assert.deepEqual(await tabs.allTextContents(), ['企业认证审核', '游戏发布审核', '游戏资质审核']);
    assert.equal(await tabs.filter({ hasText: '企业认证审核' }).getAttribute('class'), 'is-active');
    assert.equal(await page.getByRole('link', { name: '发行审核', exact: true }).getAttribute('aria-current'), 'page');
    assert.equal(await page.locator('.operations-review').isVisible(), true);

    await page.locator('[data-game-review-tab="games"]').click();
    await page.locator('[data-game-review]').waitFor();
    assert.equal(await page.locator('[data-game-review-tab="games"]').getAttribute('class'), 'is-active');
    assert.equal(await page.getByRole('heading', { name: '游戏发布审核', exact: true }).isVisible(), true);

    await page.locator('[data-game-review-tab="qualifications"]').click();
    await page.locator('[data-qualification-review]').waitFor();
    assert.equal(await page.locator('[data-game-review-tab="qualifications"]').getAttribute('class'), 'is-active');
    assert.equal(await page.getByRole('link', { name: '发行审核', exact: true }).getAttribute('aria-current'), 'page');
    assert.equal(await page.getByText('暂无匹配的资质申请', { exact: true }).isVisible(), true);

    await page.locator('[data-game-review-tab="company"]').click();
    assert.equal(await page.locator('.operations-review').isVisible(), true);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test('P01-08 三类审核在 1440、768、390px 均无根节点横向溢出', async () => {
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(demoUrl, { waitUntil: 'load' });
      for (const tab of ['company', 'games', 'qualifications']) {
        await page.locator(`[data-game-review-tab="${tab}"]`).click();
        if (tab === 'games') await page.locator('[data-game-review]').waitFor();
        if (tab === 'qualifications') await page.locator('[data-qualification-review]').waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}:${tab}`);
      }
      assert.deepEqual(errors, [], `${width}px`);
    } finally {
      await context.close();
    }
  }
});

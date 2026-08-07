import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '适合本机', '盖世游戏适合本机WebView-demo.html');
const outputDir = path.join(root, 'test-results', 'compatibility-reference-redesign');
const screenshotNames = [
  '01-desktop-initial.png',
  '02-desktop-results.png',
  '03-mobile-initial.png',
  '04-mobile-results.png',
  '05-empty-results.png'
];
fs.mkdirSync(outputDir, { recursive: true });

const executablePath = [
  chromium.executablePath(),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find((candidate) => fs.existsSync(candidate));
if (!executablePath) throw new Error('No Chromium-compatible browser executable found');

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
const errors = [];
const externalRequests = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('request', (request) => {
  if (!request.url().startsWith('file:') && !request.url().startsWith('data:')) {
    externalRequests.push(request.url());
  }
});

async function resultIds(selector) {
  return page.locator(selector).evaluateAll((elements) => elements.map((element) => {
    return element.dataset.resultRow || element.dataset.resultCard;
  }));
}

async function assertNoHorizontalOverflow(label) {
  const dimensions = await page.evaluate(() => {
    const frame = document.querySelector('.frame');
    const app = document.querySelector('#compatibility-app');
    return {
      frameClientWidth: frame.clientWidth,
      frameScrollWidth: frame.scrollWidth,
      appClientWidth: app.clientWidth,
      appScrollWidth: app.scrollWidth
    };
  });
  if (dimensions.frameScrollWidth > dimensions.frameClientWidth) {
    errors.push(`${label} frame has horizontal overflow: ${dimensions.frameScrollWidth} > ${dimensions.frameClientWidth}`);
  }
  if (dimensions.appScrollWidth > dimensions.appClientWidth) {
    errors.push(`${label} app has horizontal overflow: ${dimensions.appScrollWidth} > ${dimensions.appClientWidth}`);
  }
}

await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
const frame = page.locator('.frame');

// Desktop initial state.
check(await page.locator('[data-popular-game]').count() === 6, 'initial popular games count is not six');
check(await page.locator('[data-result-row]').count() === 0, 'initial page rendered desktop result rows without filters');
check(await page.locator('[data-result-card]').count() === 0, 'initial page rendered mobile result cards without filters');
check(await page.locator('#game-select').count() === 1, 'game selector is missing');
check(await page.locator('#target-select').count() === 1, 'device / GPU selector is missing');
check(await page.locator('#rating-select').count() === 1, 'rating selector is missing');
await assertNoHorizontalOverflow('desktop initial');
await frame.screenshot({ path: path.join(outputDir, screenshotNames[0]) });

// Popular-game direct query and a meaningful two-row sort toggle.
await page.locator('[data-popular-game="steam_1245620"]').click();
check(await page.locator('[data-result-row]').count() === 2, 'Elden Ring popular entry did not return two rows');
check((await page.locator('#game-select span').first().textContent())?.trim() === '艾尔登法环', 'popular-game entry did not synchronize the game selector');

await page.locator('[data-sort-field="verifiedAt"]').click();
const descendingIds = await resultIds('[data-result-row]');
check(descendingIds.join(',') === 'run_elden_13,run_elden_14', `verification-time descending sort is wrong: ${descendingIds.join(',')}`);
await page.locator('[data-sort-field="verifiedAt"]').click();
const ascendingIds = await resultIds('[data-result-row]');
check(ascendingIds.join(',') === 'run_elden_14,run_elden_13', `verification-time ascending sort is wrong: ${ascendingIds.join(',')}`);

// Device filter, rating filter, and single-field clear.
await page.locator('#target-select').click();
await page.locator('[data-picker-input="target"]').fill('小米 14');
await page.locator('[data-select-target="xiaomi_14"]').click();
check((await resultIds('[data-result-row]')).join(',') === 'run_elden_14', 'game plus device filters did not return the Xiaomi 14 row');

await page.locator('#rating-select').selectOption('5');
check(await page.getByText('暂无符合条件的兼容记录', { exact: true }).isVisible(), 'empty combined-filter state is missing');
check(await page.locator('[data-state-action="clear"]').count() === 1, 'empty state clear action is missing');
await page.locator('[data-clear-field="rating"]').click();
check((await resultIds('[data-result-row]')).join(',') === 'run_elden_14', 'clearing only the rating did not restore the device result');

// GPU filter uses the same target selector but matches all records by GPU name.
await page.locator('[data-clear-field="target"]').click();
check(await page.locator('[data-result-row]').count() === 2, 'clearing only the device did not restore both game rows');
await page.locator('#target-select').click();
await page.locator('[data-picker-input="target"]').fill('Adreno 830');
await page.locator('[data-select-target="adreno_830"]').click();
check((await resultIds('[data-result-row]')).join(',') === 'run_elden_13', 'GPU filter did not return the Adreno 830 row');
await assertNoHorizontalOverflow('desktop results');
await frame.screenshot({ path: path.join(outputDir, screenshotNames[1]) });

// Mobile preview keeps exactly the same filter state and source record.
const desktopFilteredIds = await resultIds('[data-result-row]');
await page.locator('[data-preview="mobile"]').click();
await page.waitForTimeout(350);
const mobileBox = await frame.boundingBox();
check(Boolean(mobileBox), 'mobile frame has no bounding box');
if (mobileBox) {
  check(Math.round(mobileBox.width) === 390 && Math.round(mobileBox.height) === 844, `mobile frame outer box is ${mobileBox.width}x${mobileBox.height}`);
}
const mobileClientSize = await frame.evaluate((element) => ({ width: element.clientWidth, height: element.clientHeight }));
check(mobileClientSize.width === 388 && mobileClientSize.height === 842, `mobile frame client box is ${mobileClientSize.width}x${mobileClientSize.height}`);
const mobileFilteredIds = await resultIds('[data-result-card]');
check(mobileFilteredIds.join(',') === desktopFilteredIds.join(','), `mobile data ${mobileFilteredIds.join(',')} differs from desktop data ${desktopFilteredIds.join(',')}`);
check((await resultIds('[data-result-row]')).join(',') === desktopFilteredIds.join(','), 'desktop result DOM lost shared data during preview change');
await assertNoHorizontalOverflow('mobile results');
await frame.screenshot({ path: path.join(outputDir, screenshotNames[3]) });

// Clear-all restores the mobile initial state.
await page.locator('[data-clear-all]').click();
check(await page.locator('[data-popular-game]').count() === 6, 'clear all did not restore six popular games');
check(await page.locator('[data-result-row]').count() === 0, 'clear all left desktop result rows behind');
check(await page.locator('[data-result-card]').count() === 0, 'clear all left mobile result cards behind');
await assertNoHorizontalOverflow('mobile initial');
await frame.screenshot({ path: path.join(outputDir, screenshotNames[2]) });

// No-result recovery uses the state-panel clear action (there is no data-clear-all here).
await page.locator('#rating-select').selectOption('5');
await page.locator('#game-select').click();
await page.locator('[data-picker-input="game"]').fill('星空');
await page.locator('[data-select-game="steam_1716740"]').click();
check(await page.getByText('暂无符合条件的兼容记录', { exact: true }).isVisible(), 'no-result state is missing');
check(await page.locator('[data-clear-all]').count() === 0, 'no-result state unexpectedly exposes the result-summary clear button');
check(await page.locator('[data-state-action="clear"]').count() === 1, 'no-result state does not expose its clear action');
await assertNoHorizontalOverflow('mobile empty results');
await frame.screenshot({ path: path.join(outputDir, screenshotNames[4]) });
await page.locator('[data-state-action="clear"]').click();
check(await page.locator('[data-popular-game]').count() === 6, 'no-result clear action did not restore popular games');

// Adapter context, error state, and local reload recovery.
await page.evaluate(() => window.GameHubCompatibility.setContext({ targetId: 'oneplus_13' }));
check((await page.locator('#target-select span').first().textContent())?.trim() === '一加 13', 'recognized local device was not selected');
check(await page.locator('[data-result-row]').count() === 6, 'local-device context did not return six desktop records');
check(await page.locator('[data-result-card]').count() === 6, 'local-device context did not return six mobile records');

await page.evaluate(() => window.GameHubCompatibility.setCatalogError());
check(await page.getByText('兼容数据加载失败', { exact: true }).isVisible(), 'catalog error state is missing');
await page.locator('[data-state-action="reload"]').click();
check(await page.getByText('正在加载兼容数据', { exact: true }).isVisible(), 'reload did not enter the loading state');
await page.waitForTimeout(700);
check((await page.locator('#target-select span').first().textContent())?.trim() === '一加 13', 'reload did not preserve the injected local-device selection');
check(await page.locator('[data-result-row]').count() === 6, 'reload did not recover the filtered local-device desktop results');
check(await page.locator('[data-result-card]').count() === 6, 'reload did not recover the filtered local-device mobile results');
await page.locator('[data-clear-all]').click();
check(await page.locator('[data-popular-game]').count() === 6, 'clearing the recovered local-device filter did not restore popular games');

// Malformed, duplicate, unsafe, and out-of-range Adapter data degrades safely.
await page.evaluate(() => window.GameHubCompatibility.setCatalog({
  games: [
    null,
    { id: 'g1', name: '异常游戏', aliases: null, coverKey: 'https://bad.example/cover.jpg' },
    { id: 'g1', name: '重复游戏' }
  ],
  targets: [
    null,
    { id: 't1', type: 'bad', displayName: '异常设备', aliases: null, gpu: 'Adreno Test' },
    { id: 't1', displayName: '重复设备' }
  ],
  runs: [
    null,
    { id: 'r1', gameId: 'missing', targetId: 't1' },
    {
      id: 'r2',
      gameId: 'g1',
      targetId: 't1',
      gpu: 'Adreno Test',
      rating: 99,
      avgFps: 999,
      tags: null,
      notes: '<img src=x onerror=alert(1)>',
      verifiedAt: 'bad'
    }
  ]
}));
check(await page.locator('[data-popular-game="g1"]').count() === 1, 'duplicate game IDs were not normalized to one popular entry');
await page.locator('[data-popular-game="g1"]').click();
check(await page.locator('[data-result-row]').count() === 1, 'invalid and duplicate catalog data did not normalize to one desktop row');
check(await page.locator('[data-result-card]').count() === 1, 'invalid and duplicate catalog data did not normalize to one mobile card');
check(await page.locator('.rating').first().getAttribute('aria-label') === '5 分', 'rating 99 was not clamped to five');
check((await page.locator('[data-result-row]').first().innerText()).includes('<img src=x onerror=alert(1)>'), 'unsafe notes were not rendered as inert text');
check(await page.locator('[data-result-row] img').count() === 0, 'unsafe notes created an executable image element');
check((await page.locator('[data-result-row]').first().innerText()).includes('240 FPS'), 'out-of-range FPS was not clamped to 240');
check((await page.locator('[data-result-row]').first().innerText()).includes('未记录'), 'invalid verification date did not degrade to 未记录');
await assertNoHorizontalOverflow('mobile malformed data');

check(externalRequests.length === 0, `unexpected external requests: ${externalRequests.join(', ')}`);
for (const screenshotName of screenshotNames) {
  const screenshotPath = path.join(outputDir, screenshotName);
  check(fs.existsSync(screenshotPath) && fs.statSync(screenshotPath).size > 0, `${screenshotName} was not created or is empty`);
}

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('PASS: compatibility reference redesign interactions, responsive rendering, Adapter, recovery, and five screenshots');

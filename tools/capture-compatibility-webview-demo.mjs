import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '适合本机', '盖世游戏适合本机WebView-demo.html');

const executablePath = [
  chromium.executablePath(),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find((candidate) => fs.existsSync(candidate));
if (!executablePath) throw new Error('No Chromium-compatible browser executable found');

const browser = await chromium.launch({ headless: true, executablePath });
const errors = [];
const externalRequests = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function observePage(targetPage, label) {
  targetPage.on('console', (message) => {
    if (message.type() === 'error') errors.push(label + ' console: ' + message.text());
  });
  targetPage.on('pageerror', (error) => errors.push(label + ' pageerror: ' + error.message));
  targetPage.on('request', (request) => {
    if (!request.url().startsWith('file:') &&
        !request.url().startsWith('data:') &&
        !request.url().startsWith('blob:')) {
      externalRequests.push(label + ': ' + request.url());
    }
  });
}

async function assertNoHorizontalOverflow(targetPage, label) {
  const dimensions = await targetPage.evaluate(() => {
    const frame = document.querySelector('.frame');
    const app = document.querySelector('#compatibility-app');
    return {
      frameClientWidth: frame.clientWidth,
      frameScrollWidth: frame.scrollWidth,
      appClientWidth: app.clientWidth,
      appScrollWidth: app.scrollWidth
    };
  });
  check(
    dimensions.frameScrollWidth <= dimensions.frameClientWidth,
    label + ' frame overflow: ' + dimensions.frameScrollWidth + ' > ' + dimensions.frameClientWidth
  );
  check(
    dimensions.appScrollWidth <= dimensions.appClientWidth,
    label + ' app overflow: ' + dimensions.appScrollWidth + ' > ' + dimensions.appClientWidth
  );
}

async function assertTouchTargets(targetPage, label) {
  const undersized = await targetPage.locator('#compatibility-app button, #compatibility-app input')
    .evaluateAll((elements) => elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          text: element.textContent?.trim().slice(0, 30) || '',
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      }));
  check(
    undersized.length === 0,
    label + ' undersized touch targets: ' + JSON.stringify(undersized)
  );
}

const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
observePage(page, 'android');
await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });

check(await page.locator('[data-filter-select]').count() === 3, 'Android filter count is not three');
check(
  await page.getByText('添加筛选条件开始查询', { exact: true }).isVisible(),
  'Initial filter prompt is missing'
);

// Task 2 keyboard behavior remains part of the multi-record checkpoint.
await page.locator('[data-filter-trigger="hardware"]').click();
await page.keyboard.press('Escape');
check(
  await page.evaluate(() => document.activeElement?.matches('[data-filter-trigger="hardware"]')),
  'Escape did not restore focus to the hardware filter trigger'
);

await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-query="game"]').fill('艾尔登');
const gameOption = page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]');
check(await gameOption.count() === 1, 'Elden Ring game option is missing');
check(await gameOption.locator('img').count() === 1, 'Game option has no local cover');
check((await gameOption.innerText()).includes('ELDEN RING'), 'Game option has no English name');
check((await gameOption.innerText()).includes('Android'), 'Game option has no platform label');
await gameOption.click();

const visibleRows = page.locator('[data-record-row]:visible');
const visibleRowCount = await visibleRows.count();
check(visibleRowCount === 2, 'Game filter did not return two Android records');
const resultCount = page.locator('[data-result-count]');
check(await resultCount.count() === 1, 'Android result count is missing');
if (await resultCount.count()) {
  check((await resultCount.innerText()).includes('2 条兼容记录'), 'Android result count is wrong');
}
check(
  await page.locator('[data-record-row="android_elden_redmagic"]:visible').count() === 1,
  'Higher-rated Android record is missing'
);
check(
  await page.locator('[data-record-row="android_elden_oneplus"]:visible').count() === 1,
  'Second Android record is missing'
);

if (visibleRowCount === 2) {
  const visibleIds = await visibleRows.evaluateAll((rows) => rows.map((row) => row.dataset.recordRow));
  check(visibleIds[0] === 'android_elden_redmagic', 'Default rating sort is not descending');
}

check(await page.locator('[data-record-cards]').isVisible(), 'Mobile record cards are hidden');
check(await page.locator('[data-record-table]').isHidden(), 'Mobile record table is visible');
await assertNoHorizontalOverflow(page, 'Android mobile records');
await assertTouchTargets(page, 'Android mobile records');

await page.locator('[data-preview="desktop"]').click();
check(await page.locator('[data-record-table]').isVisible(), 'Desktop record table is hidden');
check(await page.locator('[data-record-cards]').isHidden(), 'Desktop record cards are visible');
const recordTable = page.locator('[data-record-table]');
if (await recordTable.count()) {
  const tableText = await recordTable.innerText();
  check(tableText.includes('游戏版本'), 'Desktop table is missing the game version column');
  check(tableText.includes('盖世版本'), 'Desktop table is missing the GameHub version column');
  await page.locator('[data-sort-field="rating"]').click();
  check(
    await page.locator('[data-record-table] [data-record-row]').first().getAttribute('data-record-row') ===
      'android_elden_oneplus',
    'Rating sort did not toggle to ascending'
  );
  await page.locator('[data-sort-field="verifiedAt"]').click();
  check(
    await page.locator('[data-record-table] [data-record-row]').first().getAttribute('data-record-row') ===
      'android_elden_redmagic',
    'Verified-time sort did not default to descending'
  );
}
await assertNoHorizontalOverflow(page, 'Android desktop records');

await page.locator('[data-clear-filters]').click();
check(
  await page.getByText('添加筛选条件开始查询', { exact: true }).isVisible(),
  'Clear filters did not restore the initial prompt'
);

// Leave the checkpoint on the required two-record Android result.
await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
check(await page.locator('[data-record-row]:visible').count() === 2, 'Final Android checkpoint lost records');

check(externalRequests.length === 0, 'Unexpected external requests: ' + externalRequests.join(', '));
await page.close();
await browser.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('PASS: three searchable filters and multi-record Android results');

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

const simulatedMobileFrameBox = await page.locator('.frame').boundingBox();
const simulatedMobileOpen = page.locator('[data-config-open="android_elden_oneplus"]:visible');
await simulatedMobileOpen.scrollIntoViewIfNeeded();
await simulatedMobileOpen.click();
const simulatedMobileViewerBox = await page.locator('[data-config-viewer]').boundingBox();
check(Boolean(simulatedMobileFrameBox && simulatedMobileViewerBox), 'Simulated mobile viewer has no bounding box');
if (simulatedMobileFrameBox && simulatedMobileViewerBox) {
  check(
    Math.abs(simulatedMobileViewerBox.width - simulatedMobileFrameBox.width) <= 2 &&
      Math.abs(simulatedMobileViewerBox.height - simulatedMobileFrameBox.height) <= 2,
    'Simulated mobile viewer did not cover the preview frame'
  );
  check(
    simulatedMobileViewerBox.y >= simulatedMobileFrameBox.y - 1,
    'Simulated mobile viewer covered the external preview toolbar'
  );
}
await page.locator('[data-config-close]').first().click();

await page.locator('[data-preview="desktop"]').click();
check(await page.locator('[data-record-table]').isVisible(), 'Desktop record table is hidden');
check(await page.locator('[data-record-cards]').isHidden(), 'Desktop record cards are visible');
const recordTable = page.locator('[data-record-table]');
if (await recordTable.count()) {
  const tableText = await recordTable.innerText();
  check(tableText.includes('游戏版本'), 'Desktop table is missing the game version column');
  check(tableText.includes('盖世版本'), 'Desktop table is missing the GameHub version column');

  const desktopConfigOpen = page.locator('[data-config-open="android_elden_oneplus"]:visible');
  check(await desktopConfigOpen.count() === 1, 'Desktop Android config trigger is missing');
  if (await desktopConfigOpen.count()) {
    const beforeViewerCount = await page.locator('[data-record-row]:visible').count();
    const beforeViewerScroll = await page.locator('#compatibility-app').evaluate((app) => app.scrollTop);
    await desktopConfigOpen.focus();
    await desktopConfigOpen.click();
    const androidViewer = page.locator('[data-config-viewer]');
    const androidViewerCount = await androidViewer.count();
    check(androidViewerCount === 1 && await androidViewer.isVisible(), 'Android config viewer did not open');
    if (androidViewerCount) {
      check(await androidViewer.getAttribute('role') === 'dialog', 'Config viewer has no dialog role');
      const viewerText = await androidViewer.innerText();
      check(viewerText.includes('适用范围'), 'Config applicability is missing');
      check(viewerText.includes('Adreno 830'), 'Android config hardware is missing');
      check(viewerText.includes('Android 14～15'), 'Android config OS range is missing');
      check(!viewerText.includes('应用配置'), 'Config viewer exposed an apply action');
      check(
        await page.evaluate(() => document.activeElement?.matches('[data-config-close]')),
        'Opening viewer did not move focus to its close control'
      );
      const viewerBox = await androidViewer.boundingBox();
      const panelBox = await androidViewer.locator('.config-viewer-panel').boundingBox();
      check(Boolean(viewerBox && panelBox), 'Desktop config viewer has no measurable panel');
      if (viewerBox && panelBox) {
        check(panelBox.width < viewerBox.width, 'Desktop config viewer panel is not a centered dialog');
        check(
          Math.abs((panelBox.x + panelBox.width / 2) - (viewerBox.x + viewerBox.width / 2)) <= 2,
          'Desktop config viewer panel is not horizontally centered'
        );
      }
      await assertTouchTargets(page, 'Android desktop config viewer');
      await page.locator('[data-config-close]').last().click();
      check(await page.locator('[data-config-viewer]').count() === 0, 'Config viewer did not close');
      check(
        await page.locator('[data-record-row]:visible').count() === beforeViewerCount,
        'Closing viewer changed result count'
      );
      check(
        await page.evaluate(() => document.activeElement?.dataset.configOpen === 'android_elden_oneplus'),
        'Closing viewer did not restore focus to its trigger'
      );
      check(
        await page.locator('#compatibility-app').evaluate((app) => app.scrollTop) === beforeViewerScroll,
        'Closing viewer changed the result scroll position'
      );

      await desktopConfigOpen.click();
      await page.keyboard.press('Escape');
      check(await page.locator('[data-config-viewer]').count() === 0, 'Escape did not close the config viewer');

      await desktopConfigOpen.click();
      const viewerBackdrop = page.locator('[data-config-viewer]');
      await viewerBackdrop.click({ position: { x: 4, y: 4 } });
      check(await page.locator('[data-config-viewer]').count() === 0, 'Backdrop did not close the config viewer');
    }
  }

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

const phonePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
observePage(phonePage, 'phone');
await phonePage.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
await phonePage.locator('[data-filter-trigger="game"]').click();
await phonePage.locator('[data-filter-query="game"]').fill('艾尔登');
await phonePage.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
const phoneConfigOpen = phonePage.locator('[data-config-open="android_elden_oneplus"]:visible');
check(await phoneConfigOpen.count() === 1, 'Phone Android config trigger is missing');
if (await phoneConfigOpen.count()) {
  await phoneConfigOpen.scrollIntoViewIfNeeded();
  const phoneScrollBefore = await phonePage.locator('#compatibility-app').evaluate((app) => app.scrollTop);
  await phoneConfigOpen.focus();
  await phoneConfigOpen.click();
  const phoneViewer = phonePage.locator('[data-config-viewer]');
  const phoneViewerCount = await phoneViewer.count();
  check(phoneViewerCount === 1 && await phoneViewer.isVisible(), 'Phone config viewer did not open');
  const phoneViewerBox = phoneViewerCount ? await phoneViewer.boundingBox() : null;
  check(Boolean(phoneViewerBox), 'Phone config viewer has no bounding box');
  if (phoneViewerBox) {
    check(Math.round(phoneViewerBox.width) === 390, 'Phone config viewer is not full width');
    check(Math.round(phoneViewerBox.height) === 844, 'Phone config viewer is not full height');
  }
  if (await phoneViewer.count()) {
    await assertNoHorizontalOverflow(phonePage, 'Phone config viewer');
    await assertTouchTargets(phonePage, 'Phone config viewer');
    await phonePage.locator('[data-config-close]').first().click();
    check(await phonePage.locator('[data-config-viewer]').count() === 0, 'Phone config viewer did not close');
    check(
      Math.abs(await phonePage.locator('#compatibility-app').evaluate((app) => app.scrollTop) - phoneScrollBefore) <= 2,
      'Phone config viewer did not preserve result scroll position'
    );
    check(
      await phonePage.evaluate(() => document.activeElement?.dataset.configOpen === 'android_elden_oneplus'),
      'Phone config viewer did not restore trigger focus'
    );
  }
}

check(externalRequests.length === 0, 'Unexpected external requests: ' + externalRequests.join(', '));
await phonePage.close();
await page.close();
await browser.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('PASS: searchable filters, multi-record results, and responsive config viewer');

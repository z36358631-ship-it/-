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
let expectedMissingCoverError = false;

function check(condition, message) {
  if (!condition) errors.push(message);
}

function observePage(targetPage, label) {
  targetPage.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (label === 'query' && expectedMissingCoverError && message.text().includes('ERR_FILE_NOT_FOUND')) {
      expectedMissingCoverError = false;
      return;
    }
    errors.push(label + ' console: ' + message.text());
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
      const backgroundPage = page.locator('#compatibility-app > .page');
      check(
        await page.locator('#compatibility-app > [data-config-viewer]').count() === 1,
        'Config viewer is not a sibling of the background page'
      );
      check(await backgroundPage.getAttribute('inert') !== null, 'Open viewer did not make the page inert');
      check(
        await backgroundPage.getAttribute('aria-hidden') === 'true',
        'Open viewer did not hide the background page from assistive technology'
      );
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
      const viewerFocusables = androidViewer.locator(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
          'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      check(await viewerFocusables.count() >= 2, 'Config viewer has too few focusable controls');
      if (await viewerFocusables.count() >= 2) {
        await viewerFocusables.last().focus();
        await page.keyboard.press('Tab');
        check(
          await viewerFocusables.first().evaluate((element) => document.activeElement === element),
          'Tab did not wrap from the last viewer control to the first'
        );
        await viewerFocusables.first().focus();
        await page.keyboard.press('Shift+Tab');
        check(
          await viewerFocusables.last().evaluate((element) => document.activeElement === element),
          'Shift+Tab did not wrap from the first viewer control to the last'
        );
      }
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
      check(await backgroundPage.getAttribute('inert') === null, 'Closing viewer kept the page inert');
      check(
        await backgroundPage.getAttribute('aria-hidden') === null,
        'Closing viewer kept the background page aria-hidden'
      );
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

// Android game, GPU, rating and three-filter AND combinations.
await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
check(await page.locator('[data-record-row]:visible').count() === 2, 'Game-only filter lost Android records');
await page.locator('[data-filter-clear="game"]').click();

await page.locator('[data-filter-trigger="hardware"]').click();
await page.locator('[data-filter-query="hardware"]').fill('Adreno 830');
await page.locator('[data-filter-option="hardware"][data-option-value="android_gpu_adreno830"]').click();
check(
  await page.locator('[data-record-row]:visible').count() >= 4,
  'GPU-only filter did not return multiple Android records'
);
await page.locator('[data-filter-clear="hardware"]').click();

await page.locator('[data-filter-trigger="rating"]').click();
await page.locator('[data-filter-query="rating"]').fill('4');
await page.locator('[data-filter-option="rating"][data-option-value="4"]').click();
const ratingOnlyRows = page.locator('[data-record-row]:visible');
check(await ratingOnlyRows.count() >= 3, 'Rating-only filter returned too few Android records');
check(
  await page.locator('[data-record-row]:visible .rating[aria-label="3 分"]').count() === 0,
  'Rating-only filter retained a lower-rated record'
);

await page.locator('[data-filter-trigger="hardware"]').click();
await page.locator('[data-filter-query="hardware"]').fill('Adreno 830');
await page.locator('[data-filter-option="hardware"][data-option-value="android_gpu_adreno830"]').click();
const ratedRows = await page.locator('[data-record-row]:visible').allTextContents();
check(ratedRows.length >= 3, 'GPU + rating filter returned too few records');
check(ratedRows.every((text) => text.includes('★★★★')), 'Rating ≥4 retained a lower-rated record');

await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-query="game"]').fill('艾尔登');
await page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
check(
  await page.locator('[data-record-row]:visible').count() === 2,
  'Three-filter AND result is not two Elden records'
);

// Demo platform changes clear filters, results and the open viewer.
await page.locator('[data-preview="mobile"]').click();
await page.locator('[data-config-open="android_elden_oneplus"]:visible').click();
check(await page.locator('[data-config-viewer]').count() === 1, 'Platform-reset setup did not open viewer');
await page.locator('[data-demo-platform="mac"]').click();
check(await page.locator('[data-platform-badge]').textContent() === 'Mac', 'Demo platform did not switch to Mac');
check(await page.locator('[data-config-viewer]').count() === 0, 'Platform switch kept config viewer');
check(await page.locator('[data-record-row]:visible').count() === 0, 'Platform switch kept Android results');
check(await page.locator('[data-clear-filters]').count() === 0, 'Platform switch kept Android filters');
check(
  await page.getByText('添加筛选条件开始查询', { exact: true }).isVisible(),
  'Platform switch did not restore the initial prompt'
);

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

// Bridge context outranks the Android query and isolates Mac hardware and record fields.
const bridgePage = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
observePage(bridgePage, 'bridge');
await bridgePage.goto(pathToFileURL(demoPath).href + '?platform=android', { waitUntil: 'load' });
await bridgePage.evaluate(() => window.GameHubCompatibility.setContext({ platform: 'mac' }));
check(await bridgePage.locator('[data-platform-badge]').textContent() === 'Mac', 'Bridge did not override Android query');
check(
  await bridgePage.locator('[data-demo-platform="android"]').isDisabled(),
  'Bridge did not lock the Demo platform switch'
);
check(
  (await bridgePage.locator('[data-filter-select="hardware"] .filter-label').innerText()) ===
    'Mac 机型或 Apple 芯片',
  'Mac hardware filter label is wrong'
);
await bridgePage.locator('[data-filter-trigger="hardware"]').click();
await bridgePage.locator('[data-filter-query="hardware"]').fill('M4 Pro');
check(
  await bridgePage.locator('[data-filter-option="hardware"][data-option-value="mac_chip_m4pro"]').count() === 1,
  'Mac chip option is missing'
);
check(
  await bridgePage.locator(
    '[data-filter-option="hardware"][data-option-value="android_gpu_adreno830"]'
  ).count() === 0,
  'Android GPU leaked into Mac candidates'
);
await bridgePage.locator('[data-filter-option="hardware"][data-option-value="mac_chip_m4pro"]').click();
const macRowsText = (await bridgePage.locator('[data-record-row]:visible').allTextContents()).join(' ');
check(macRowsText.includes('Apple M4 Pro'), 'Mac chip filter returned no M4 Pro record');
check(!macRowsText.includes('Android'), 'Android field leaked into Mac results');
check(!macRowsText.includes('Adreno'), 'Android GPU leaked into Mac results');

// Invalid references produce a recoverable empty state and catalog reload clears invalid UI state.
const queryPage = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
observePage(queryPage, 'query');
await queryPage.goto(pathToFileURL(demoPath).href + '?platform=mac', { waitUntil: 'load' });
check(await queryPage.locator('[data-platform-badge]').textContent() === 'Mac', 'Mac query fallback failed');
await queryPage.locator('[data-filter-trigger="game"]').click();
await queryPage.locator('[data-filter-query="game"]').fill('艾尔登');
await queryPage.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
await queryPage.locator('[data-filter-trigger="hardware"]').click();
await queryPage.locator('[data-filter-query="hardware"]').fill('M4 Pro');
await queryPage.locator('[data-filter-option="hardware"][data-option-value="mac_chip_m4pro"]').click();
await queryPage.locator('[data-config-open="mac_elden_mbp_m4pro"]:visible').click();
check(await queryPage.locator('[data-config-viewer]').count() === 1, 'Invalid-catalog setup did not open Mac viewer');

await queryPage.evaluate(() => window.GameHubCompatibility.setCatalog({
  games: [{
    id: 'cross-game', name: '跨平台异常游戏', englishName: 'Cross Invalid', aliases: [],
    coverKey: 'invalid-cover.jpg', platforms: ['mac'], popularOn: []
  }],
  hardware: [{
    id: 'mac_chip_test', platform: 'mac', type: 'chip', displayName: 'Apple M4', aliases: [], subtitle: 'Apple 芯片'
  }],
  records: [
    {
      id: 'wrong-platform-record', platform: 'android', gameId: 'cross-game',
      hardwareIds: ['mac_chip_test'], rating: 5, environment: { androidVersion: 'Android 15' }
    },
    {
      id: 'missing-hardware-record', platform: 'mac', gameId: 'cross-game',
      hardwareIds: ['missing-chip'], rating: 5, environment: { macosVersion: 'macOS 26' }
    }
  ],
  configs: []
}));

check(await queryPage.locator('[data-config-viewer]').count() === 0, 'Invalid catalog kept the old viewer');
check(await queryPage.locator('[data-record-row]:visible').count() === 0, 'Invalid records survived normalization');
check(
  await queryPage.getByText('当前Mac暂无兼容数据', { exact: true }).isVisible(),
  'Invalid-record catalog did not enter the recoverable Mac empty state'
);
const invalidReload = queryPage.locator('[data-state-action="reload"]');
check(await invalidReload.count() === 1, 'Invalid catalog has no reload action');
if (await invalidReload.count()) {
  await invalidReload.click();
  await queryPage.waitForTimeout(500);
} else {
  await queryPage.reload({ waitUntil: 'load' });
}
check(await queryPage.locator('[data-filter-select]').count() === 3, 'Reload did not restore the Mac filter catalog');
check(await queryPage.locator('[data-clear-filters]').count() === 0, 'Reload retained invalid selected filters');

await queryPage.locator('[data-filter-trigger="game"]').click();
await queryPage.locator('[data-filter-query="game"]').fill('不存在');
check(await queryPage.getByText('暂无匹配选项', { exact: true }).isVisible(), 'No-candidate state is missing');
await queryPage.locator('[data-filter-query="game"]').fill('艾尔登');
await queryPage.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
await queryPage.locator('[data-filter-trigger="rating"]').click();
await queryPage.locator('[data-filter-query="rating"]').fill('5');
await queryPage.locator('[data-filter-option="rating"][data-option-value="5"]').click();
check(
  await queryPage.getByText('暂无符合条件的兼容记录', { exact: true }).isVisible(),
  'Mac game + rating no-result state is missing'
);
check(await queryPage.locator('[data-record-row]:visible').count() === 0, 'No-result combination rendered records');
check(
  (await queryPage.locator('[data-filter-trigger="game"]').innerText()).includes('艾尔登法环') &&
    (await queryPage.locator('[data-filter-trigger="rating"]').innerText()).includes('5 分及以上'),
  'No-result state did not retain selected filters'
);

await queryPage.evaluate(() => window.GameHubCompatibility.setCatalog({
  games: [],
  hardware: [],
  records: [],
  configs: []
}));
check(
  await queryPage.getByText('当前Mac暂无兼容数据', { exact: true }).isVisible(),
  'Empty Mac catalog state is missing'
);
check(
  await queryPage.locator('[data-state-action="reload"]').count() === 1,
  'Empty Mac catalog has no reload action'
);
await queryPage.locator('[data-state-action="reload"]').click();
await queryPage.waitForTimeout(500);
check(await queryPage.locator('[data-filter-select]').count() === 3, 'Empty Mac catalog did not recover');

await queryPage.locator('[data-filter-trigger="game"]').click();
const queryCover = queryPage.locator('[data-filter-option="game"] img').first();
expectedMissingCoverError = true;
await queryCover.evaluate((image) => {
  image.src = 'assets/compatibility/missing-local-cover.jpg';
});
await queryPage.locator('[aria-label="封面加载失败"]').first().waitFor();
check(
  await queryPage.locator('[aria-label="封面加载失败"]').count() === 1,
  'Broken local cover did not render the fallback'
);
check(expectedMissingCoverError === false, 'Missing-cover error was not observed');

check(externalRequests.length === 0, 'Unexpected external requests: ' + externalRequests.join(', '));
await queryPage.close();
await bridgePage.close();
await phonePage.close();
await page.close();
await browser.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('PASS: filter combinations, platform isolation, recovery states, and responsive config viewer');

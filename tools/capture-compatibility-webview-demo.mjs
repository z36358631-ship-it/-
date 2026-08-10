import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '适合本机', '盖世游戏适合本机WebView-demo.html');
const outputDir = path.join(root, 'test-results', 'compatibility-platform-aware-h5');
const screenshotNames = [
  '01-android-filters-portrait.png',
  '02-android-multi-records-portrait.png',
  '03-android-config-fullscreen.png',
  '04-mac-filters-portrait.png',
  '05-mac-multi-records-portrait.png',
  '06-mac-config-fullscreen.png',
  '07-desktop-record-table.png',
  '08-desktop-config-dialog.png'
];

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

function sameIds(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

async function visibleRecordIds(targetPage) {
  return targetPage.locator('[data-record-row]:visible')
    .evaluateAll((rows) => rows.map((row) => row.dataset.recordRow));
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

async function assertScreenshotLayout(targetPage, label) {
  await assertNoHorizontalOverflow(targetPage, label);
  await assertTouchTargets(targetPage, label);
}

async function screenshotPage(targetPage, fileName, label, fullPage) {
  await assertScreenshotLayout(targetPage, label + ' before screenshot');
  await targetPage.screenshot({ path: path.join(outputDir, fileName), fullPage });
  await assertScreenshotLayout(targetPage, label + ' after screenshot');
}

async function screenshotFrame(targetPage, fileName, label) {
  await assertScreenshotLayout(targetPage, label + ' before screenshot');
  await targetPage.locator('.frame').screenshot({ path: path.join(outputDir, fileName) });
  await assertScreenshotLayout(targetPage, label + ' after screenshot');
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
const allAndroidHardwareIds = await page.locator('[data-filter-option="hardware"]')
  .evaluateAll((options) => options.map((option) => option.dataset.optionValue));
check(allAndroidHardwareIds.length > 0, 'Android hardware dropdown is empty');
check(
  allAndroidHardwareIds.every((id) => id.startsWith('android_')),
  'Non-Android hardware ID leaked into Android dropdown'
);
check(
  !allAndroidHardwareIds.some((id) => id.startsWith('mac_')),
  'Mac hardware ID leaked into Android dropdown'
);
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

await page.locator('.demo-controls [data-preview="desktop"]').click();
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
      check(!viewerText.includes('Apple'), 'Apple field leaked into Android config viewer');
      check(!viewerText.includes('macOS'), 'macOS field leaked into Android config viewer');
      check(
        !viewerText.includes('Game Porting Toolkit'),
        'Game Porting Toolkit field leaked into Android config viewer'
      );
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

// Device-level filters must narrow the real record IDs, not just keep a broad GPU match.
await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
check(
  sameIds(await visibleRecordIds(page), ['android_elden_redmagic', 'android_elden_oneplus']),
  'Game-only Elden filter did not return the exact two Android records'
);

await page.locator('[data-filter-trigger="hardware"]').click();
await page.locator('[data-filter-query="hardware"]').fill('OnePlus 13');
await page.locator('[data-filter-option="hardware"][data-option-value="android_device_oneplus13"]').click();
check(
  sameIds(await visibleRecordIds(page), ['android_elden_oneplus']),
  'Elden + OnePlus device filter did not narrow to the OnePlus record'
);

await page.locator('[data-filter-clear="game"]').click();
await page.locator('[data-filter-trigger="hardware"]').click();
await page.locator('[data-filter-query="hardware"]').fill('红魔');
await page.locator(
  '[data-filter-option="hardware"][data-option-value="android_device_redmagic10pro"]'
).click();
check(
  sameIds(await visibleRecordIds(page), ['android_elden_redmagic', 'android_wukong']),
  'RedMagic device filter did not return the exact two device records'
);

await page.locator('[data-filter-trigger="rating"]').click();
await page.locator('[data-filter-query="rating"]').fill('4');
await page.locator('[data-filter-option="rating"][data-option-value="4"]').click();
check(
  sameIds(await visibleRecordIds(page), ['android_elden_redmagic']),
  'RedMagic + rating filter retained an unexpected record'
);

await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-query="game"]').fill('艾尔登');
await page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
check(
  sameIds(await visibleRecordIds(page), ['android_elden_redmagic']),
  'Game + RedMagic + rating AND did not return the exact record'
);

// Switching while a filter query is open clears both the open state and its draft query.
await page.locator('[data-clear-filters]').click();
await page.locator('[data-filter-trigger="hardware"]').click();
await page.locator('[data-filter-query="hardware"]').fill('OnePlus');
check(await page.locator('[data-filter-query="hardware"]').inputValue() === 'OnePlus', 'Query reset setup failed');
await page.locator('[data-demo-platform="mac"]').click();
check(await page.locator('[data-platform-badge]').textContent() === 'Mac', 'Query reset did not switch to Mac');
check(await page.locator('[data-filter-query]').count() === 0, 'Platform switch kept an open filter');
check(await page.locator('[data-clear-filters]').count() === 0, 'Platform switch kept selected filters');
await page.locator('[data-demo-platform="android"]').click();
await page.locator('[data-filter-trigger="hardware"]').click();
check(await page.locator('[data-filter-query="hardware"]').inputValue() === '', 'Platform round-trip kept filter query');
await page.keyboard.press('Escape');

// A non-default ascending sort resets to rating-desc after a platform round-trip.
await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
await page.locator('.demo-controls [data-preview="desktop"]').click();
await page.locator('[data-sort-field="rating"]').click();
check(
  await page.locator('[data-record-table] [data-record-row]').first().getAttribute('data-record-row') ===
    'android_elden_oneplus',
  'Sort reset setup did not reach rating ascending'
);
await page.locator('[data-demo-platform="mac"]').click();
await page.locator('[data-demo-platform="android"]').click();
await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
check(
  await page.locator('[data-record-table] [data-record-row]').first().getAttribute('data-record-row') ===
    'android_elden_redmagic',
  'Platform round-trip did not restore rating-desc sort'
);

// Switching with a viewer open closes it and clears filters and results.
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

// A real pending Bridge request becomes stale when the platform reset clears download state.
await page.locator('[data-demo-platform="android"]').click();
await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
const downloadResetOpen = page.locator('[data-config-open="android_elden_oneplus"]:visible');
await downloadResetOpen.click();
await page.evaluate(() => {
  window.__capturedDownloadPayload = null;
  window.GameHubBridge = {
    downloadConfig(payload) {
      window.__capturedDownloadPayload = payload;
      return undefined;
    }
  };
});
await page.locator('[data-config-download="cfg_android_elden"]').click();
await page.locator('[data-config-viewer] .download-message.pending').waitFor();
const pendingDownloadPayload = await page.evaluate(() => {
  return window.__capturedDownloadPayload ? JSON.parse(window.__capturedDownloadPayload) : null;
});
check(
  Boolean(pendingDownloadPayload?.requestId),
  'Pending Bridge download did not expose a requestId'
);
check(
  pendingDownloadPayload?.platform === 'android' &&
    pendingDownloadPayload?.recordId === 'android_elden_oneplus' &&
    pendingDownloadPayload?.configId === 'cfg_android_elden',
  'Pending Bridge download payload is wrong'
);
await page.locator('[data-demo-platform="mac"]').click();
check(await page.locator('[data-config-viewer]').count() === 0, 'Download reset kept the viewer open');
check(await page.locator('.download-message').count() === 0, 'Platform switch kept download feedback');
const acceptedStaleDownloadResult = pendingDownloadPayload?.requestId
  ? await page.evaluate((requestId) => window.GameHubCompatibility.onDownloadResult({
      requestId,
      ok: true,
      message: 'stale result'
    }), pendingDownloadPayload.requestId)
  : null;
check(acceptedStaleDownloadResult === false, 'Platform reset accepted a stale Bridge download result');
await page.evaluate(() => {
  delete window.GameHubBridge;
  delete window.__capturedDownloadPayload;
});
await page.reload({ waitUntil: 'load' });
check(
  await page.evaluate(() => typeof window.GameHubBridge === 'undefined'),
  'Web download page retained the Task 5 Bridge spy after reload'
);
await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
await page.locator('[data-config-open="android_elden_oneplus"]:visible').click();
check(await page.locator('.download-message').count() === 0, 'Reopened viewer restored stale download feedback');
const webDownloadPromise = page.waitForEvent('download');
await page.locator('[data-config-download="cfg_android_elden"]').click();
const webDownload = await webDownloadPromise;
check(
  webDownload.suggestedFilename() === 'elden-ring-android-720p.gamehub.json',
  'Web download filename is wrong: ' + webDownload.suggestedFilename()
);
await page.locator('[data-config-viewer] .download-message.success').waitFor();
check(
  (await page.locator('[data-config-viewer] .download-message.success').innerText()).includes('已发起下载'),
  'Web download feedback is missing inside viewer'
);
check(await page.locator('[data-config-viewer]').count() === 1, 'Web download closed the config viewer');
await webDownload.delete();
await page.locator('[data-config-close]').first().click();

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
const allMacHardwareIds = await bridgePage.locator('[data-filter-option="hardware"]')
  .evaluateAll((options) => options.map((option) => option.dataset.optionValue));
check(allMacHardwareIds.length > 0, 'Mac hardware dropdown is empty');
check(allMacHardwareIds.every((id) => id.startsWith('mac_')), 'Non-Mac hardware ID leaked into Mac dropdown');
check(!allMacHardwareIds.some((id) => id.startsWith('android_')), 'Android hardware ID leaked into Mac dropdown');
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
await bridgePage.keyboard.press('Escape');

await bridgePage.locator('[data-filter-trigger="game"]').click();
await bridgePage.locator('[data-filter-query="game"]').fill('艾尔登');
await bridgePage.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
check(
  sameIds(await visibleRecordIds(bridgePage), ['mac_elden_mbp_m4pro', 'mac_elden_macmini_m4']),
  'Mac Elden game filter did not return the exact two Mac records'
);
check(
  (await visibleRecordIds(bridgePage)).every((id) => id.startsWith('mac_')),
  'Android record ID leaked into Mac Elden results'
);
await bridgePage.evaluate(() => {
  window.__bridgeCalls = [];
  window.__blobCalls = 0;
  const originalCreateObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (...args) => {
    window.__blobCalls += 1;
    return originalCreateObjectURL(...args);
  };
  window.GameHubBridge = {
    downloadConfig(payload) {
      window.__bridgeCalls.push(JSON.parse(payload));
      return Promise.resolve({ ok: true, message: 'App 已接收下载任务' });
    }
  };
});
await bridgePage.locator('[data-config-open="mac_elden_mbp_m4pro"]:visible').click();
const macViewerText = await bridgePage.locator('[data-config-viewer]').innerText();
check(macViewerText.includes('Apple M4 Pro'), 'Mac viewer is missing Apple hardware');
check(macViewerText.includes('macOS 15～26'), 'Mac viewer is missing macOS range');
check(macViewerText.includes('Game Porting Toolkit 2'), 'Mac viewer is missing GPTK');
check(!macViewerText.includes('Adreno'), 'Adreno field leaked into Mac viewer');
check(!macViewerText.includes('Android'), 'Android field leaked into Mac viewer');
check(!macViewerText.includes('Wine'), 'Wine field leaked into Mac viewer');

// Downloads must stay bound to the record whose viewer is currently open.
await bridgePage.evaluate(() => startDownload('cfg_mac_hades'));
check(await bridgePage.evaluate(() => window.__bridgeCalls.length) === 0, 'Cross-record config reached App Bridge');
check(
  (await bridgePage.locator('[data-config-viewer] .download-message.error').innerText())
    .includes('配置与当前兼容记录不一致'),
  'Cross-record config rejection is missing inside viewer'
);
await bridgePage.evaluate(() => {
  const raw = structuredClone(mockCatalog);
  const sourceConfig = raw.configs.find((config) => config.id === 'cfg_mac_elden');
  raw.configs.push({
    ...sourceConfig,
    id: 'cfg_mac_elden_unlisted',
    name: '未关联配置',
    fileName: 'unlisted.gamehub.json'
  });
  setCatalog(raw);
  startDownload('cfg_mac_elden_unlisted');
});
check(await bridgePage.evaluate(() => window.__bridgeCalls.length) === 0, 'Unlisted record config reached App Bridge');
check(
  (await bridgePage.locator('[data-config-viewer] .download-message.error').innerText())
    .includes('配置与当前兼容记录不一致'),
  'Unlisted record config rejection is missing inside viewer'
);

await bridgePage.locator('[data-config-download="cfg_mac_elden"]').click();
await bridgePage.locator('[data-config-viewer] .download-message.success').waitFor();
check(await bridgePage.evaluate(() => window.__bridgeCalls.length) === 1, 'App Bridge call count is not one');
check(await bridgePage.evaluate(() => window.__blobCalls) === 0, 'App download also triggered Web Blob download');
const firstBridgePayload = await bridgePage.evaluate(() => window.__bridgeCalls[0]);
check(firstBridgePayload.platform === 'mac', 'App Bridge payload platform is not Mac');
check(firstBridgePayload.recordId === 'mac_elden_mbp_m4pro', 'App Bridge payload record ID is wrong');
check(firstBridgePayload.configId === 'cfg_mac_elden', 'App Bridge payload config ID is wrong');
check(
  (await bridgePage.locator('[data-config-viewer] .download-message.success').innerText())
    .includes('App 已接收下载任务'),
  'Promise success feedback is missing inside viewer'
);
check(await bridgePage.locator('[data-config-viewer]').count() === 1, 'Promise success closed the config viewer');

const promiseSuccessText = await bridgePage.locator('[data-config-viewer] .download-message.success').innerText();
const duplicateSuccessAccepted = await bridgePage.evaluate((requestId) => {
  return window.GameHubCompatibility.onDownloadResult({
    requestId,
    ok: false,
    message: '重复回调'
  });
}, firstBridgePayload.requestId);
check(duplicateSuccessAccepted === false, 'Duplicate callback after Promise success was accepted');
check(
  (await bridgePage.locator('[data-config-viewer] .download-message.success').innerText()) === promiseSuccessText,
  'Duplicate callback changed the Promise success state'
);

await bridgePage.evaluate(() => {
  window.__bridgeCalls = [];
  window.GameHubBridge.downloadConfig = (payload) => {
    window.__bridgeCalls.push(JSON.parse(payload));
    return { ok: true, message: 'App 已同步接收下载任务' };
  };
});
await bridgePage.locator('[data-config-download="cfg_mac_elden"]').click();
await bridgePage.locator('[data-config-viewer] .download-message.success').waitFor();
check(await bridgePage.evaluate(() => window.__bridgeCalls.length) === 1, 'Synchronous Bridge call count is not one');
check(
  (await bridgePage.locator('[data-config-viewer] .download-message.success').innerText())
    .includes('App 已同步接收下载任务'),
  'Synchronous object success feedback is missing inside viewer'
);
check(await bridgePage.locator('[data-config-viewer]').count() === 1, 'Synchronous success closed the config viewer');

await bridgePage.evaluate(() => {
  window.GameHubBridge.downloadConfig = () => {
    throw new Error('bridge unavailable');
  };
});
await bridgePage.locator('[data-config-download="cfg_mac_elden"]').click();
check(
  (await bridgePage.locator('[data-config-viewer] .download-message.error').innerText())
    .includes('App 连接不可用'),
  'Bridge exception feedback is missing inside viewer'
);
check(await bridgePage.locator('[data-config-viewer]').count() === 1, 'Bridge exception closed the config viewer');

await bridgePage.evaluate(() => {
  window.__bridgeCalls = [];
  window.GameHubBridge.downloadConfig = (payload) => {
    window.__bridgeCalls.push(JSON.parse(payload));
    return undefined;
  };
  document.querySelector('[data-config-download="cfg_mac_elden"]').click();
  document.querySelector('[data-config-download="cfg_mac_elden"]').click();
});
check(await bridgePage.evaluate(() => window.__bridgeCalls.length) === 1, 'Pending download was submitted twice');
const timedOutRequestId = await bridgePage.evaluate(() => window.__bridgeCalls[0].requestId);
await bridgePage.waitForTimeout(3200);
const timeoutText = await bridgePage.locator('[data-config-viewer] .download-message.error').innerText();
check(timeoutText.includes('App 响应超时'), 'Pending download did not time out inside viewer');
check(await bridgePage.locator('[data-config-viewer]').count() === 1, 'Download timeout closed the config viewer');
const lateCallbackAccepted = await bridgePage.evaluate((requestId) => {
  return window.GameHubCompatibility.onDownloadResult({
    requestId,
    ok: true,
    message: '迟到成功'
  });
}, timedOutRequestId);
check(lateCallbackAccepted === false, 'Late callback was accepted');
check(
  (await bridgePage.locator('[data-config-viewer] .download-message.error').innerText()) === timeoutText,
  'Late callback overwrote the timeout state'
);
check(await bridgePage.evaluate(() => window.__blobCalls) === 0, 'App regression cases triggered Web Blob download');
await bridgePage.locator('[data-config-close]').first().click();
await bridgePage.locator('[data-filter-clear="game"]').click();

await bridgePage.locator('[data-filter-trigger="hardware"]').click();
await bridgePage.locator('[data-filter-query="hardware"]').fill('M4 Pro');
await bridgePage.locator('[data-filter-option="hardware"][data-option-value="mac_chip_m4pro"]').click();
check(
  sameIds(await visibleRecordIds(bridgePage), ['mac_elden_mbp_m4pro']),
  'M4 Pro chip filter did not narrow to the exact Mac record'
);
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
    coverKey: 'invalid-cover.jpg', platforms: ['android', 'mac'], popularOn: []
  }],
  hardware: [
    {
      id: 'android_device_test', platform: 'android', type: 'device',
      displayName: 'Android Test Device', aliases: [], subtitle: 'Android hardware'
    },
    {
      id: 'mac_chip_test', platform: 'mac', type: 'chip', displayName: 'Apple M4', aliases: [], subtitle: 'Apple 芯片'
    }
  ],
  records: [
    {
      id: 'cross-hardware-record', platform: 'mac', gameId: 'cross-game',
      hardwareIds: ['android_device_test'], rating: 5, environment: { macosVersion: 'macOS 26' }
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

// Invalid config record references are removed by normalization without hiding the valid Mac record.
const invalidConfigCatalog = {
  games: [{
    id: 'hybrid-game', name: '跨平台测试游戏', englishName: 'Hybrid Test', aliases: [],
    coverKey: '', platforms: ['android', 'mac'], popularOn: []
  }],
  hardware: [
    {
      id: 'android_device_valid', platform: 'android', type: 'device',
      displayName: 'Android Valid Device', aliases: [], subtitle: 'Android hardware'
    },
    {
      id: 'mac_chip_valid', platform: 'mac', type: 'chip',
      displayName: 'Apple Test Chip', aliases: [], subtitle: 'Apple 芯片'
    }
  ],
  records: [
    {
      id: 'valid-mac-record', platform: 'mac', gameId: 'hybrid-game', hardwareIds: ['mac_chip_valid'],
      gameVersion: '1.0', verdict: '可运行', rating: 4, avgFps: 45, verifiedAt: '2026-08-10',
      tags: ['测试'], notes: '有效 Mac 记录', configIds: ['bad-cross-config', 'bad-missing-config'],
      environment: {
        macModel: 'Mac Test', appleChip: 'Apple Test Chip', macosVersion: 'macOS 26',
        appVersion: '盖世游戏 Mac Test', compatibilityLayer: 'GPTK Test', displayMode: '1920 × 1080'
      }
    },
    {
      id: 'valid-android-record', platform: 'android', gameId: 'hybrid-game',
      hardwareIds: ['android_device_valid'], gameVersion: '1.0', verdict: '可运行', rating: 4,
      avgFps: 40, verifiedAt: '2026-08-10', tags: [], notes: '有效 Android 记录', configIds: [],
      environment: {
        deviceModel: 'Android Valid Device', soc: 'Test SoC', mobileGpu: 'Test GPU',
        androidVersion: 'Android 15', appVersion: '盖世游戏 Test', runtime: 'Test Runtime'
      }
    }
  ],
  configs: [
    {
      id: 'bad-cross-config', platform: 'mac', gameId: 'hybrid-game', recordId: 'valid-android-record',
      name: '错误跨平台配置', version: '1.0', fileName: 'bad-cross.json', fileSize: '1 KB',
      downloadCount: 0, updatedAt: '2026-08-10', summary: 'Apple Test Chip',
      applicability: { gameVersion: '1.0', hardware: 'Apple Test Chip', systemRange: 'macOS 26' },
      fields: [['兼容层', 'GPTK Test']]
    },
    {
      id: 'bad-missing-config', platform: 'mac', gameId: 'hybrid-game', recordId: 'missing-record',
      name: '错误缺失配置', version: '1.0', fileName: 'bad-missing.json', fileSize: '1 KB',
      downloadCount: 0, updatedAt: '2026-08-10', summary: 'Apple Test Chip',
      applicability: { gameVersion: '1.0', hardware: 'Apple Test Chip', systemRange: 'macOS 26' },
      fields: [['兼容层', 'GPTK Test']]
    }
  ]
};
const normalizedInvalidConfigIds = await queryPage.evaluate((raw) => {
  return normalizeCatalog(raw).configs.map((config) => config.id);
}, invalidConfigCatalog);
check(
  sameIds(normalizedInvalidConfigIds, []),
  'normalizeCatalog retained cross-platform or missing-record configs: ' +
    JSON.stringify(normalizedInvalidConfigIds)
);
await queryPage.evaluate((raw) => window.GameHubCompatibility.setCatalog(raw), invalidConfigCatalog);
await queryPage.locator('[data-filter-trigger="game"]').click();
await queryPage.locator('[data-filter-option="game"][data-option-value="hybrid-game"]').click();
const validMacRow = queryPage.locator('[data-record-row="valid-mac-record"]:visible');
check(await validMacRow.count() === 1, 'Valid Mac record was discarded with invalid configs');
if (await validMacRow.count()) {
  check((await validMacRow.innerText()).includes('暂无配置'), 'Invalid configs remained attached to valid Mac row');
  check(await validMacRow.locator('[data-config-open]').count() === 0, 'Invalid config exposed a viewer trigger');
}

await queryPage.reload({ waitUntil: 'load' });
check(await queryPage.locator('[data-platform-badge]').textContent() === 'Mac', 'Catalog reset lost Mac query platform');
check(await queryPage.locator('[data-filter-select]').count() === 3, 'Catalog reset did not restore Mac filters');

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

await queryPage.close();
await bridgePage.close();
await phonePage.close();
await page.close();

fs.mkdirSync(outputDir, { recursive: true });

const androidShotPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
observePage(androidShotPage, 'android-shot');
await androidShotPage.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
check(await androidShotPage.locator('[data-filter-select]').count() === 3, 'Android screenshot has no three filters');
check(await androidShotPage.locator('[data-filter-query]').count() === 0, 'Android initial screenshot has an open filter');
check(
  await androidShotPage.getByText('添加筛选条件开始查询', { exact: true }).isVisible(),
  'Android initial screenshot is missing the query prompt'
);
await screenshotPage(androidShotPage, screenshotNames[0], 'Android initial filters', true);

await androidShotPage.locator('[data-filter-trigger="game"]').click();
await androidShotPage.locator('[data-filter-query="game"]').fill('艾尔登');
await androidShotPage.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
await androidShotPage.locator('[data-filter-trigger="hardware"]').click();
await androidShotPage.locator('[data-filter-query="hardware"]').fill('Adreno 830');
await androidShotPage.locator(
  '[data-filter-option="hardware"][data-option-value="android_gpu_adreno830"]'
).click();
await androidShotPage.locator('[data-filter-trigger="rating"]').click();
await androidShotPage.locator('[data-filter-query="rating"]').fill('4');
await androidShotPage.locator('[data-filter-option="rating"][data-option-value="4"]').click();
check(
  sameIds(await visibleRecordIds(androidShotPage), ['android_elden_redmagic', 'android_elden_oneplus']),
  'Android screenshot filters did not produce the two Elden records'
);
check(await androidShotPage.locator('[data-record-cards]').isVisible(), 'Android screenshot cards are hidden');
check(await androidShotPage.locator('[data-record-table]').isHidden(), 'Android screenshot table is visible');
const androidFilterSummary = await androidShotPage.locator('[data-filter-trigger]').allTextContents();
check(
  androidFilterSummary.some((value) => value.includes('艾尔登法环')) &&
    androidFilterSummary.some((value) => value.includes('Adreno 830')) &&
    androidFilterSummary.some((value) => value.includes('4 分及以上')),
  'Android screenshot does not preserve all three selected filter values'
);
await androidShotPage.locator('.record-results').evaluate((element) => element.scrollIntoView({ block: 'start' }));
await screenshotPage(androidShotPage, screenshotNames[1], 'Android multi-record results', true);

await androidShotPage.locator('[data-config-open="android_elden_oneplus"]:visible').click();
const androidShotViewer = androidShotPage.locator('[data-config-viewer]');
const androidShotViewerBox = await androidShotViewer.boundingBox();
const androidShotViewerText = await androidShotViewer.innerText();
check(
  Boolean(androidShotViewerBox) && Math.round(androidShotViewerBox.width) === 390 &&
    Math.round(androidShotViewerBox.height) === 844,
  'Android screenshot viewer is not full-screen'
);
check(
  androidShotViewerText.includes('适用范围') && androidShotViewerText.includes('下载配置'),
  'Android screenshot viewer is missing applicability or download action'
);
check(
  !androidShotViewerText.includes('Apple') && !androidShotViewerText.includes('macOS'),
  'Mac fields leaked into Android viewer screenshot'
);
await screenshotPage(androidShotPage, screenshotNames[2], 'Android full-screen config viewer', false);
await androidShotPage.locator('[data-config-close]').first().click();

const macShotPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
observePage(macShotPage, 'mac-shot');
await macShotPage.goto(pathToFileURL(demoPath).href + '?platform=mac', { waitUntil: 'load' });
check(await macShotPage.locator('[data-filter-select]').count() === 3, 'Mac screenshot has no three filters');
check(await macShotPage.locator('[data-filter-query]').count() === 0, 'Mac initial screenshot has an open filter');
const macFilterLabels = await macShotPage.locator('[data-filter-select] .filter-label').allTextContents();
check(
  sameIds(macFilterLabels, ['游戏', 'Mac 机型或 Apple 芯片', '最低评分（≥）']),
  'Mac screenshot filter labels are wrong: ' + JSON.stringify(macFilterLabels)
);
check(
  await macShotPage.getByText('添加筛选条件开始查询', { exact: true }).isVisible(),
  'Mac initial screenshot is missing the query prompt'
);
await screenshotPage(macShotPage, screenshotNames[3], 'Mac initial filters', true);

await macShotPage.locator('[data-filter-trigger="game"]').click();
await macShotPage.locator('[data-filter-query="game"]').fill('艾尔登');
await macShotPage.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
check(
  sameIds(await visibleRecordIds(macShotPage), ['mac_elden_mbp_m4pro', 'mac_elden_macmini_m4']),
  'Mac screenshot did not produce the two Elden records'
);
check(await macShotPage.locator('[data-record-cards]').isVisible(), 'Mac screenshot cards are hidden');
check(await macShotPage.locator('[data-record-table]').isHidden(), 'Mac screenshot table is visible');
const macShotRowsText = (await macShotPage.locator('[data-record-row]:visible').allTextContents()).join(' ');
check(
  !macShotRowsText.includes('Android') && !macShotRowsText.includes('Adreno') &&
    !macShotRowsText.includes('一加') && !macShotRowsText.includes('红魔'),
  'Android or phone fields leaked into Mac multi-record screenshot'
);
await macShotPage.locator('.record-results').evaluate((element) => element.scrollIntoView({ block: 'start' }));
await screenshotPage(macShotPage, screenshotNames[4], 'Mac multi-record results', true);

await macShotPage.locator('[data-config-open="mac_elden_mbp_m4pro"]:visible').click();
const macShotViewer = macShotPage.locator('[data-config-viewer]');
const macShotViewerBox = await macShotViewer.boundingBox();
const macShotViewerText = await macShotViewer.innerText();
check(
  Boolean(macShotViewerBox) && Math.round(macShotViewerBox.width) === 390 &&
    Math.round(macShotViewerBox.height) === 844,
  'Mac screenshot viewer is not full-screen'
);
check(
  macShotViewerText.includes('Apple M4 Pro') && macShotViewerText.includes('macOS 15～26'),
  'Mac screenshot viewer is missing Apple chip or macOS range'
);
check(
  !macShotViewerText.includes('Android') && !macShotViewerText.includes('Adreno'),
  'Android fields leaked into Mac viewer screenshot'
);
await screenshotPage(macShotPage, screenshotNames[5], 'Mac full-screen config viewer', false);
await macShotPage.locator('[data-config-close]').first().click();

const desktopShotPage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
observePage(desktopShotPage, 'desktop-shot');
await desktopShotPage.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
await desktopShotPage.locator('[data-preview="desktop"]').click();
await desktopShotPage.addStyleTag({
  content: [
    '.frame[data-preview="desktop"] { width: 1280px !important; }',
    '.frame[data-preview="desktop"] #compatibility-app > .page { width: 100% !important; max-width: none !important; }'
  ].join('\n')
});
await desktopShotPage.locator('[data-filter-trigger="game"]').click();
await desktopShotPage.locator('[data-filter-query="game"]').fill('艾尔登');
await desktopShotPage.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
check(await desktopShotPage.locator('[data-record-table]').isVisible(), 'Desktop screenshot table is hidden');
check(await desktopShotPage.locator('[data-record-cards]').isHidden(), 'Desktop screenshot cards are visible');
check(
  sameIds(await visibleRecordIds(desktopShotPage), ['android_elden_redmagic', 'android_elden_oneplus']),
  'Desktop screenshot table does not contain both Elden records'
);
const desktopHeaders = await desktopShotPage.locator('[data-record-table] th').allTextContents();
check(
  ['游戏', '设备 / GPU', '游戏版本', 'Android', '运行环境', '盖世版本', '评分',
    '平均 FPS', '标签', '备注', '配置', '验证时间']
    .every((label) => desktopHeaders.some((value) => value.includes(label))),
  'Desktop screenshot table is missing competitor fields: ' + JSON.stringify(desktopHeaders)
);
const desktopTableDimensions = await desktopShotPage.locator('[data-record-table]').evaluate((tableWrap) => ({
  clientWidth: tableWrap.clientWidth,
  scrollWidth: tableWrap.scrollWidth
}));
check(
  desktopTableDimensions.scrollWidth <= desktopTableDimensions.clientWidth,
  'Desktop screenshot table is horizontally clipped: ' + JSON.stringify(desktopTableDimensions)
);
await desktopShotPage.locator('.record-results').evaluate((element) => element.scrollIntoView({ block: 'start' }));
await screenshotFrame(desktopShotPage, screenshotNames[6], 'Desktop record table');

const desktopRowsBeforeViewer = await desktopShotPage.locator('[data-record-row]:visible').count();
await desktopShotPage.locator('[data-config-open="android_elden_oneplus"]:visible').click();
const desktopShotViewer = desktopShotPage.locator('[data-config-viewer]');
const desktopShotFrameBox = await desktopShotPage.locator('.frame').boundingBox();
const desktopShotPanelBox = await desktopShotViewer.locator('.config-viewer-panel').boundingBox();
check(
  desktopRowsBeforeViewer === 2 && await desktopShotPage.locator('[data-record-row]:visible').count() === 2,
  'Desktop screenshot viewer did not preserve the result table'
);
check(
  Boolean(desktopShotFrameBox && desktopShotPanelBox) &&
    Math.abs(
      (desktopShotPanelBox.x + desktopShotPanelBox.width / 2) -
      (desktopShotFrameBox.x + desktopShotFrameBox.width / 2)
    ) <= 2,
  'Desktop screenshot config dialog is not centered'
);
await screenshotFrame(desktopShotPage, screenshotNames[7], 'Desktop centered config dialog');

for (const screenshotName of screenshotNames) {
  const screenshotPath = path.join(outputDir, screenshotName);
  check(fs.existsSync(screenshotPath), 'Screenshot is missing: ' + screenshotName);
  if (fs.existsSync(screenshotPath)) {
    check(fs.statSync(screenshotPath).size > 0, 'Screenshot is empty: ' + screenshotName);
  }
}

await androidShotPage.close();
await macShotPage.close();
await desktopShotPage.close();
check(externalRequests.length === 0, 'Unexpected external requests: ' + externalRequests.join(', '));
await browser.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(
  'PASS: three searchable filters, multi-record results, Android/Mac isolation, responsive config viewer, ' +
  'Web/App downloads, recovery, and eight screenshots'
);

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '适合本机', '盖世游戏适合本机WebView-demo.html');
const outputDir = path.join(root, 'test-results', 'compatibility-platform-aware-h5');
const screenshotNames = [
  '01-android-home-portrait.png',
  '02-android-search-portrait.png',
  '03-android-config-portrait.png',
  '04-mac-home-portrait.png',
  '05-mac-search-portrait.png',
  '06-mac-config-portrait.png',
  '07-desktop-web.png'
];
fs.mkdirSync(outputDir, { recursive: true });

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
    if (label === 'query' &&
        expectedMissingCoverError &&
        message.text().includes('ERR_FILE_NOT_FOUND')) {
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

async function screenshotFrame(targetPage, name) {
  await targetPage.locator('.frame').screenshot({ path: path.join(outputDir, name) });
}

async function scrollSectionToTop(targetPage, selector) {
  await targetPage.locator(selector).evaluate((element) => {
    const app = document.querySelector('#compatibility-app');
    const top = element.getBoundingClientRect().top + app.scrollTop - 14;
    app.scrollTo({ top, behavior: 'instant' });
  });
  await targetPage.waitForTimeout(100);
}

const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
observePage(page, 'web');
await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
const frame = page.locator('.frame');

// Android is the no-context Demo default.
check(await page.locator('[data-platform-badge]').textContent() === 'Android', 'Demo default is not Android');
check(await page.locator('[data-popular-game]').count() === 4, 'Android popular games count is not four');
check(await page.locator('[data-popular-game="steam_1716740"]').count() === 0, 'Mac-only Starfield leaked into Android');
check(await page.locator('[data-filter-select]').count() === 3, 'Android does not render three top filters');
check(await page.locator('[data-filter-select="game"]').count() === 1, 'Android game filter is missing');
check(await page.locator('[data-filter-select="hardware"]').count() === 1, 'Android hardware filter is missing');
check(await page.locator('[data-filter-select="rating"]').count() === 1, 'Android rating filter is missing');
const mobileBox = await frame.boundingBox();
check(Boolean(mobileBox), 'Android mobile frame has no bounding box');
if (mobileBox) {
  check(
    Math.round(mobileBox.width) === 390 && Math.round(mobileBox.height) === 844,
    'Android mobile frame is ' + mobileBox.width + 'x' + mobileBox.height
  );
}
check(
  (await page.locator('[data-filter-select="game"] .filter-label').innerText()) === '游戏',
  'Android game filter label is wrong'
);
check(
  (await page.locator('[data-filter-select="hardware"] .filter-label').innerText()) === '设备或 GPU',
  'Android hardware filter label is wrong'
);
check(
  (await page.locator('[data-filter-select="rating"] .filter-label').innerText()) === '最低评分（≥）',
  'Android rating filter label is wrong'
);
check(
  await page.locator('[data-filter-query]').count() === 0,
  'A filter menu is open before interaction'
);

// The three filters are searchable, composable, individually clearable, and keyboard dismissible.
await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-query="game"]').fill('艾尔登');
check(
  await page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').count() === 1,
  'Searchable game filter did not find Elden Ring'
);
await page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();

await page.locator('[data-filter-trigger="hardware"]').click();
await page.locator('[data-filter-query="hardware"]').fill('Adreno 830');
check(
  await page.locator('[data-filter-option="hardware"][data-option-value="android_gpu_adreno830"]').count() === 1,
  'Searchable hardware filter did not find Adreno 830'
);
await page.locator('[data-filter-option="hardware"][data-option-value="android_gpu_adreno830"]').click();

await page.locator('[data-filter-trigger="rating"]').click();
const ratingOptionTexts = (await page.locator('[data-filter-option="rating"]').allTextContents())
  .map((value) => value.trim());
check(ratingOptionTexts.includes('全部'), 'Rating filter has no all option');
check(
  ratingOptionTexts.filter((value) => value !== '全部').every((value) => /^[1-5] 分及以上$/.test(value)),
  'Rating options are not consistently labeled as X 分及以上: ' + ratingOptionTexts.join(', ')
);
await assertTouchTargets(page, 'Android rating menu');
await page.locator('[data-filter-option="rating"][data-option-value="4"]').click();
check(
  (await page.locator('[data-filter-trigger="game"]').innerText()).includes('艾尔登法环'),
  'Selected game filter label is missing'
);
check(
  (await page.locator('[data-filter-trigger="hardware"]').innerText()).includes('Adreno 830'),
  'Selected hardware filter label is missing'
);
check(
  (await page.locator('[data-filter-trigger="rating"]').innerText()).includes('4 分及以上'),
  'Selected rating filter label is missing'
);
check(
  (await page.locator('.filter-summary').innerText()).includes('3 个筛选条件'),
  'Three-filter summary is missing'
);

await page.locator('[data-filter-clear="rating"]').click();
check(
  (await page.locator('.filter-summary').innerText()).includes('2 个筛选条件'),
  'Single rating clear did not preserve the other filters'
);
await page.locator('[data-clear-filters]').click();
check(
  (await page.locator('.filter-summary').innerText()).includes('0 个筛选条件'),
  'Clear-all did not reset the filters'
);

await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-query="game"]').fill('艾尔登');
await page.keyboard.press('Escape');
check(await page.locator('[data-filter-query]').count() === 0, 'Escape did not close the open filter');
await page.locator('[data-filter-trigger="hardware"]').click();
await page.locator('.page-header h1').click();
check(await page.locator('[data-filter-query]').count() === 0, 'Outside click did not close the open filter');

await page.locator('[data-popular-game="steam_1245620"]').click();
check(
  (await page.locator('[data-filter-trigger="game"]').innerText()).includes('艾尔登法环'),
  'Popular game did not migrate into the game filter'
);
check(
  await page.locator('[data-compatibility-result]').count() === 0,
  'Popular game still opened the legacy single-result renderer'
);
await page.locator('[data-filter-clear="game"]').click();
await assertNoHorizontalOverflow(page, 'Android home');
await assertTouchTargets(page, 'Android home');
await screenshotFrame(page, screenshotNames[0]);

// Image-and-text search keeps candidates inside the current platform.
await page.locator('#game-search').fill('艾尔登');
const androidCandidate = page.locator('[data-search-result="steam_1245620"]');
check(await androidCandidate.count() === 1, 'Android Elden Ring search candidate is missing');
check(await androidCandidate.locator('img').count() === 1, 'Android search candidate has no cover');
const androidCandidateText = await androidCandidate.innerText();
check(androidCandidateText.includes('艾尔登法环'), 'Android search candidate has no Chinese name');
check(androidCandidateText.includes('ELDEN RING'), 'Android search candidate has no English name');
check(androidCandidateText.includes('Android'), 'Android search candidate has no platform label');
await assertNoHorizontalOverflow(page, 'Android search');
await assertTouchTargets(page, 'Android search');
await screenshotFrame(page, screenshotNames[1]);

// Android compatibility fields do not contain Mac data.
await androidCandidate.click();
const androidResult = page.locator('[data-compatibility-result="steam_1245620"]');
check(await androidResult.count() === 1, 'Android compatibility result is missing');
const androidResultText = await androidResult.innerText();
check(androidResultText.includes('Android 15'), 'Android version is missing');
check(androidResultText.includes('Adreno 830'), 'Android GPU is missing');
check(androidResultText.includes('Wine 9.2 · GS3'), 'Android runtime is missing');
check(!androidResultText.includes('macOS'), 'macOS leaked into Android result');
check(!androidResultText.includes('Apple M4'), 'Apple chip leaked into Android result');

// Inline configuration details and the real Web Blob download.
await page.locator('[data-config-toggle="cfg_android_elden"]').click();
check(
  await page.locator('[data-config-detail="cfg_android_elden"]').isVisible(),
  'Android config detail did not expand'
);
check(
  (await page.locator('[data-config-detail="cfg_android_elden"]').innerText()).includes('1280 × 720'),
  'Android config parameters are missing'
);
const androidApplicability = await page.locator(
  '[data-config-detail="cfg_android_elden"] [data-config-applicability]'
).innerText();
check(androidApplicability.includes('1.16.1'), 'Android applicable game version is missing');
check(androidApplicability.includes('Adreno 830'), 'Android applicable GPU is missing');
check(androidApplicability.includes('Android 14～15'), 'Android applicable system range is missing');
await scrollSectionToTop(page, '.config-section');
await assertNoHorizontalOverflow(page, 'Android config');
await assertTouchTargets(page, 'Android config');
await screenshotFrame(page, screenshotNames[2]);
const downloadPromise = page.waitForEvent('download');
await page.locator('[data-config-download="cfg_android_elden"]').click();
const webDownload = await downloadPromise;
check(
  webDownload.suggestedFilename() === 'elden-ring-android-720p.gamehub.json',
  'Web download filename is wrong: ' + webDownload.suggestedFilename()
);
check(
  (await page.locator('.download-message.success').innerText()).includes('已发起下载'),
  'Web download success feedback is missing'
);
await webDownload.delete();

// App Bridge beats an Android query and locks the Demo-only platform switch.
const bridgePage = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
observePage(bridgePage, 'bridge');
await bridgePage.goto(pathToFileURL(demoPath).href + '?platform=android', { waitUntil: 'load' });
await bridgePage.evaluate(() => window.GameHubCompatibility.setContext({ platform: 'mac' }));
check(await bridgePage.locator('[data-platform-badge]').textContent() === 'Mac', 'Bridge did not override Android query');
check(await bridgePage.locator('[data-popular-game]').count() === 4, 'Mac popular games count is not four');
check(await bridgePage.locator('[data-filter-select]').count() === 3, 'Mac does not render three top filters');
check(
  (await bridgePage.locator('[data-filter-select="hardware"] .filter-label').innerText()) ===
    'Mac 机型或 Apple 芯片',
  'Mac hardware filter label is wrong'
);
check(
  await bridgePage.locator('[data-popular-game="steam_2358720"]').count() === 0,
  'Android-only Wukong leaked into Mac'
);
check(
  await bridgePage.locator('[data-demo-platform="android"]').isDisabled(),
  'Bridge context did not lock the Demo platform switch'
);
await bridgePage.locator('[data-demo-platform="android"]').evaluate((button) => button.click());
check(await bridgePage.locator('[data-platform-badge]').textContent() === 'Mac', 'Locked Demo switch overrode Bridge');
await bridgePage.locator('[data-filter-trigger="hardware"]').click();
await bridgePage.locator('[data-filter-query="hardware"]').fill('M4 Pro');
const macHardwareOptions = await bridgePage.locator('[data-filter-option="hardware"]').allTextContents();
check(macHardwareOptions.some((value) => value.includes('Apple M4 Pro')), 'Mac M4 Pro filter option is missing');
check(!macHardwareOptions.some((value) => value.includes('Adreno')), 'Android hardware leaked into Mac filter');
await bridgePage.keyboard.press('Escape');
await assertNoHorizontalOverflow(bridgePage, 'Mac home');
await assertTouchTargets(bridgePage, 'Mac home');
await screenshotFrame(bridgePage, screenshotNames[3]);

// Mac search and compatibility fields remain platform-specific.
await bridgePage.locator('#game-search').fill('艾尔登');
const macCandidate = bridgePage.locator('[data-search-result="steam_1245620"]');
check(await macCandidate.count() === 1, 'Mac Elden Ring search candidate is missing');
const macCandidateText = await macCandidate.innerText();
check(macCandidateText.includes('ELDEN RING'), 'Mac search candidate has no English name');
check(macCandidateText.includes('Mac'), 'Mac search candidate has no platform label');
await assertNoHorizontalOverflow(bridgePage, 'Mac search');
await screenshotFrame(bridgePage, screenshotNames[4]);
await macCandidate.click();
const macResult = bridgePage.locator('[data-compatibility-result="steam_1245620"]');
const macResultText = await macResult.innerText();
check(macResultText.includes('Apple M4 Pro'), 'Mac chip is missing');
check(macResultText.includes('macOS 26'), 'macOS version is missing');
check(macResultText.includes('Game Porting Toolkit 2'), 'Mac compatibility layer is missing');
check(!macResultText.includes('Android 15'), 'Android version leaked into Mac result');
check(!macResultText.includes('Adreno 830'), 'Android GPU leaked into Mac result');

// App Bridge Promise success.
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
await bridgePage.locator('[data-config-toggle="cfg_mac_elden"]').click();
check(
  await bridgePage.locator('[data-config-detail="cfg_mac_elden"]').isVisible(),
  'Mac config detail did not expand'
);
check(
  (await bridgePage.locator('[data-config-detail="cfg_mac_elden"]').innerText()).includes('Apple M4 Pro'),
  'Mac config summary is missing'
);
const macApplicability = await bridgePage.locator(
  '[data-config-detail="cfg_mac_elden"] [data-config-applicability]'
).innerText();
check(macApplicability.includes('1.16.1'), 'Mac applicable game version is missing');
check(macApplicability.includes('Apple M4 Pro'), 'Mac applicable chip is missing');
check(macApplicability.includes('macOS 15～26'), 'Mac applicable system range is missing');
await scrollSectionToTop(bridgePage, '.config-section');
await assertNoHorizontalOverflow(bridgePage, 'Mac config');
await assertTouchTargets(bridgePage, 'Mac config');
await screenshotFrame(bridgePage, screenshotNames[5]);
await bridgePage.locator('[data-config-download="cfg_mac_elden"]').click();
await bridgePage.locator('.download-message.success').waitFor();
check(await bridgePage.evaluate(() => window.__bridgeCalls.length) === 1, 'App Bridge call count is not one');
const firstBridgePayload = await bridgePage.evaluate(() => window.__bridgeCalls[0]);
check(firstBridgePayload.platform === 'mac', 'App Bridge payload platform is not Mac');
check(firstBridgePayload.configId === 'cfg_mac_elden', 'App Bridge payload config ID is wrong');
check(await bridgePage.evaluate(() => window.__blobCalls) === 0, 'App download also triggered Web Blob download');
check(
  (await bridgePage.locator('.download-message.success').innerText()).includes('App 已接收下载任务'),
  'App success feedback is missing'
);
const appSuccessText = await bridgePage.locator('.download-message.success').innerText();
const duplicateSuccessAccepted = await bridgePage.evaluate((requestId) => {
  return window.GameHubCompatibility.onDownloadResult({
    requestId,
    ok: false,
    message: '重复回调'
  });
}, firstBridgePayload.requestId);
check(duplicateSuccessAccepted === false, 'Duplicate callback after success was accepted');
check(
  (await bridgePage.locator('.download-message.success').innerText()) === appSuccessText,
  'Duplicate callback changed the success state'
);

// Bridge exceptions are visible and recoverable.
await bridgePage.evaluate(() => {
  window.GameHubBridge.downloadConfig = () => {
    throw new Error('bridge unavailable');
  };
});
await bridgePage.locator('[data-config-download="cfg_mac_elden"]').click();
check(
  (await bridgePage.locator('.download-message.error').innerText()).includes('App 连接不可用'),
  'Bridge exception feedback is missing'
);

// A pending callback times out, duplicate taps are ignored, and late callbacks cannot overwrite the error.
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
const timeoutText = await bridgePage.locator('.download-message.error').innerText();
check(timeoutText.includes('App 响应超时'), 'Pending download did not time out');
const lateCallbackAccepted = await bridgePage.evaluate((requestId) => {
  return window.GameHubCompatibility.onDownloadResult({
    requestId,
    ok: true,
    message: '迟到成功'
  });
}, timedOutRequestId);
check(lateCallbackAccepted === false, 'Late callback was accepted');
check(
  (await bridgePage.locator('.download-message.error').innerText()) === timeoutText,
  'Late callback overwrote timeout state'
);

// Query fallback works without a Bridge; malformed cross-platform data is discarded.
const queryPage = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
observePage(queryPage, 'query');
await queryPage.goto(pathToFileURL(demoPath).href + '?platform=mac', { waitUntil: 'load' });
check(await queryPage.locator('[data-platform-badge]').textContent() === 'Mac', 'Mac query fallback failed');
await queryPage.evaluate(() => window.GameHubCompatibility.setCatalog({
  games: [
    {
      id: 'cross-game',
      name: '跨平台异常游戏',
      englishName: 'Cross Platform Invalid',
      aliases: [],
      coverKey: 'invalid-cover.jpg',
      platforms: ['mac'],
      popularOn: ['mac']
    }
  ],
  records: [
    {
      id: 'wrong-record',
      platform: 'android',
      gameId: 'cross-game',
      verdict: '错误串线',
      environment: { androidVersion: 'Android 15' }
    }
  ],
  configs: [
    {
      id: 'wrong-config',
      platform: 'android',
      gameId: 'cross-game',
      name: '错误配置',
      fileName: 'wrong.json',
      fields: []
    },
    {
      id: 'field-leak-config',
      platform: 'mac',
      gameId: 'cross-game',
      name: '内部字段串线配置',
      fileName: 'field-leak.json',
      summary: 'Adreno 830 配置',
      applicability: {
        gameVersion: '1.0',
        hardware: 'Adreno 830',
        systemRange: 'Android 15'
      },
      fields: [['运行环境', 'Wine 9.2']]
    }
  ]
}));
await queryPage.locator('[data-popular-game="cross-game"]').click();
check(
  (await queryPage.locator('[data-filter-trigger="game"]').innerText()).includes('跨平台异常游戏'),
  'Custom popular game did not migrate into the game filter'
);
await queryPage.locator('[data-filter-clear="game"]').click();
await queryPage.locator('#game-search').fill('跨平台');
await queryPage.locator('[data-search-result="cross-game"]').click();
const malformedText = await queryPage.locator('[data-compatibility-result]').innerText();
check(malformedText.includes('暂无验证记录'), 'Cross-platform record was not rejected');
check(malformedText.includes('暂无可下载配置'), 'Cross-platform config was not rejected');
check(
  await queryPage.locator('[data-config-toggle]').count() === 0,
  'Mac config with Android internal fields survived normalization'
);
check(
  await queryPage.locator('[data-compatibility-result] img').count() === 0,
  'Invalid cover key survived normalization'
);

// A ready catalog with no current-platform games has a distinct recoverable state.
await queryPage.evaluate(() => window.GameHubCompatibility.setCatalog({
  games: [],
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
check(await queryPage.locator('[data-popular-game]').count() === 4, 'Empty Mac catalog did not recover');

// A missing allowed local cover is replaced at runtime by the GH fallback.
const queryCover = queryPage.locator('[data-popular-game] img').first();
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

// Demo switching clears game and download state when there is no Bridge.
await page.locator('[data-result-back]').click();
await page.locator('[data-demo-platform="mac"]').click();
check(await page.locator('[data-platform-badge]').textContent() === 'Mac', 'Demo platform did not switch to Mac');
check(await page.locator('[data-compatibility-result]').count() === 0, 'Platform switch kept old game selection');
check(await page.locator('.download-message').count() === 0, 'Platform switch kept old download state');
await page.locator('[data-demo-platform="android"]').click();
check(await page.locator('[data-platform-badge]').textContent() === 'Android', 'Demo platform did not switch to Android');

// Loading/error/reload recovers the current platform catalog.
await page.evaluate(() => window.GameHubCompatibility.setCatalogLoading());
check(
  await page.getByText('正在加载兼容数据', { exact: true }).isVisible(),
  'Catalog loading state is missing'
);
await page.evaluate(() => window.GameHubCompatibility.setCatalogError());
check(
  await page.getByText('兼容数据加载失败', { exact: true }).isVisible(),
  'Catalog error state is missing'
);
await page.locator('[data-state-action="reload"]').click();
await page.waitForTimeout(500);
check(await page.locator('[data-platform-badge]').textContent() === 'Android', 'Reload changed current platform');
check(await page.locator('[data-popular-game]').count() === 4, 'Reload did not restore Android catalog');

// A real 390×844 viewport retains the platform tag in search candidates.
const phonePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
observePage(phonePage, 'phone');
await phonePage.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
await phonePage.locator('#game-search').fill('艾尔登');
check(
  await phonePage.locator('[data-search-result="steam_1245620"] .candidate-platform').isVisible(),
  'Real 390px viewport hides the search platform label'
);
await assertNoHorizontalOverflow(phonePage, 'real 390px search');

// Desktop reuses the same content and has no overflow.
await page.locator('[data-preview="desktop"]').click();
await page.waitForTimeout(300);
const desktopBox = await frame.boundingBox();
check(Boolean(desktopBox) && desktopBox.width > 900, 'Desktop frame is not wider than 900px');
await assertNoHorizontalOverflow(page, 'desktop web');
await screenshotFrame(page, screenshotNames[6]);

check(externalRequests.length === 0, 'Unexpected external requests: ' + externalRequests.join(', '));
for (const screenshotName of screenshotNames) {
  const screenshotPath = path.join(outputDir, screenshotName);
  check(
    fs.existsSync(screenshotPath) && fs.statSync(screenshotPath).size > 0,
    screenshotName + ' was not created or is empty'
  );
}

await queryPage.close();
await bridgePage.close();
await phonePage.close();
await browser.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(
  'PASS: three searchable filters, platform priority, Android/Mac isolation, image search, config details, ' +
  'Web/App downloads, recovery, responsive rendering, and seven screenshots'
);

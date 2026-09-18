import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '适合本机', '盖世游戏适合本机WebView-demo.html');
const outputDir = path.join(root, 'public', 'prd', 'compatibility-query-app-v15');
const evidenceDir = path.join(root, 'test-results', 'compatibility-query-entry-v15');
const baseUrl = pathToFileURL(demoPath).href;
const executablePath = [
  chromium.executablePath(),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find((candidate) => fs.existsSync(candidate));

if (!executablePath) throw new Error('No Chromium-compatible browser executable found');
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(evidenceDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath });
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function observe(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('ERR_FILE_NOT_FOUND')) {
      errors.push(`${label} console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('file:') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      errors.push(`${label} external request: ${url}`);
    }
  });
}

async function waitForImages(page) {
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
}

async function assertNoHorizontalOverflow(page, label) {
  const sizes = await page.evaluate(() => {
    const frame = document.querySelector('.frame');
    const app = document.querySelector('#compatibility-app');
    return {
      frame: [frame.clientWidth, frame.scrollWidth],
      app: [app.clientWidth, app.scrollWidth]
    };
  });
  check(sizes.frame[1] <= sizes.frame[0], `${label} frame overflow: ${sizes.frame}`);
  check(sizes.app[1] <= sizes.app[0], `${label} app overflow: ${sizes.app}`);
}

async function assertVisibleTouchTargets(page, label) {
  const undersized = await page.locator('#compatibility-app button:visible')
    .evaluateAll((buttons) => buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        label: button.getAttribute('aria-label') || button.textContent?.trim(),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    }).filter((item) => item.width < 44 || item.height < 44));
  check(undersized.length === 0, `${label} undersized buttons: ${JSON.stringify(undersized)}`);
}

async function shot(page, fileName, label) {
  await waitForImages(page);
  await assertNoHorizontalOverflow(page, label);
  await assertVisibleTouchTargets(page, label);
  const destination = path.join(outputDir, fileName);
  await page.screenshot({ path: destination });
  check(fs.existsSync(destination) && fs.statSync(destination).size > 20_000,
    `${label} screenshot missing or too small`);
}

async function openEntryPage(viewport, screen, label) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  observe(page, label);
  await page.goto(`${baseUrl}?screen=${screen}`, { waitUntil: 'load' });
  await waitForImages(page);
  return page;
}

async function assertH5Selection(page, expectedGame, label) {
  await page.locator('h1').filter({ hasText: '兼容性查询' }).waitFor();
  const game = await page.locator('[data-filter-trigger="game"] strong').innerText();
  const machine = await page.locator('[data-filter-trigger="hardware"] strong').innerText();
  check(game === expectedGame, `${label} game preselection is ${game}, expected ${expectedGame}`);
  check(machine === '一加 13', `${label} current model preselection is ${machine}`);
}

const portrait = { width: 390, height: 844 };
const landscape = { width: 844, height: 390 };

const pcPortrait = await openEntryPage(portrait, 'pc-games', 'portrait pc games');
check(await pcPortrait.locator('[data-native-screen="pc-games"][data-entry-layout="portrait"]').isVisible(),
  'Portrait PC games entry is not visible');
check(await pcPortrait.locator('[data-open-compatibility="pc-games"]').count() === 1,
  'Portrait PC games entry count is not one');
await shot(pcPortrait, 'P00-pc-game-entry.png', 'Portrait PC games entry');
await pcPortrait.locator('[data-open-compatibility="pc-games"]').click();
await assertH5Selection(pcPortrait, '全部游戏', 'Portrait global entry');
await pcPortrait.locator('[data-back]').click();
check(await pcPortrait.locator('[data-native-screen="pc-games"]').isVisible(),
  'Portrait global entry did not return to PC games');

const detailPortrait = await openEntryPage(portrait, 'game-detail', 'portrait game detail');
check(await detailPortrait.locator('[data-native-screen="game-detail"][data-entry-layout="portrait"]').isVisible(),
  'Portrait game detail entry is not visible');
await shot(detailPortrait, 'P01-game-detail-entry.png', 'Portrait game detail entry');
await detailPortrait.locator('[data-open-compatibility="game-detail"]').click();
await assertH5Selection(detailPortrait, '艾尔登法环', 'Portrait detail entry');
await detailPortrait.locator('[data-back]').click();
check(await detailPortrait.locator('[data-native-screen="game-detail"]').isVisible(),
  'Portrait detail entry did not return to the game detail');

const pcLandscape = await openEntryPage(landscape, 'pc-games', 'landscape pc games');
check(await pcLandscape.locator('[data-native-screen="pc-games"][data-entry-layout="landscape"]').isVisible(),
  'Landscape PC games entry is not visible');
await shot(pcLandscape, 'L00-pc-game-entry.png', 'Landscape PC games entry');
await pcLandscape.locator('[data-open-compatibility="pc-games"]').click();
await assertH5Selection(pcLandscape, '全部游戏', 'Landscape global entry');
await pcLandscape.locator('[data-back]').click();
check(await pcLandscape.locator('[data-native-screen="pc-games"]').isVisible(),
  'Landscape global entry did not return to PC games');

const detailLandscape = await openEntryPage(landscape, 'game-detail', 'landscape game detail');
check(await detailLandscape.locator('[data-native-screen="game-detail"][data-entry-layout="landscape"]').isVisible(),
  'Landscape game detail entry is not visible');
await shot(detailLandscape, 'L01-game-detail-entry.png', 'Landscape game detail entry');
await detailLandscape.locator('[data-open-compatibility="game-detail"]').click();
await assertH5Selection(detailLandscape, '艾尔登法环', 'Landscape detail entry');
await detailLandscape.locator('[data-back]').click();
check(await detailLandscape.locator('[data-native-screen="game-detail"]').isVisible(),
  'Landscape detail entry did not return to the game detail');

function dataUrl(filePath) {
  return `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
}

const flowSources = {
  pc: dataUrl(path.join(outputDir, 'P00-pc-game-entry.png')),
  detail: dataUrl(path.join(outputDir, 'P01-game-detail-entry.png')),
  query: dataUrl(path.join(root, 'public', 'prd', 'compatibility-query-app-v14', 'P02-compatibility-records.png')),
  review: dataUrl(path.join(root, 'public', 'prd', 'compatibility-query-app-v14', 'P03-compatibility-review.png'))
};

const flowPage = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await flowPage.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#0d0f12;color:#f5f6f8;font-family:"Microsoft YaHei",sans-serif}
  main{width:1920px;height:1080px;padding:54px 58px;background:radial-gradient(circle at 15% 0%,rgba(255,204,67,.09),transparent 34rem),#0d0f12}
  h1{margin:0;font-size:36px}p{margin:12px 0 32px;color:#8f949e;font-size:18px}
  .flow{height:850px;display:grid;grid-template-columns:510px 74px 286px 74px 286px 74px 350px;align-items:center;gap:0}
  .branch{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}.step{display:grid;gap:12px;justify-items:center}
  .shot{height:570px;max-width:270px;border:2px solid #343943;border-radius:24px;object-fit:contain;background:#08090b;box-shadow:0 18px 45px rgba(0,0,0,.38)}
  .branch .shot{height:500px;max-width:235px}.label{width:100%;min-height:54px;display:grid;place-items:center;padding:10px;border:1px solid #343943;border-radius:14px;background:#181b20;font-size:17px;font-weight:700;text-align:center}
  .arrow{display:grid;place-items:center;color:#ffc928;font-size:54px}.arrow small{display:block;color:#858a94;font-size:12px;text-align:center}
  .result{min-height:300px;display:grid;align-content:center;gap:18px;padding:34px;border:2px solid #ffc928;border-radius:28px;background:linear-gradient(140deg,rgba(255,204,67,.15),rgba(255,204,67,.035))}
  .result b{color:#ffc928;font-size:20px}.result strong{font-size:28px;line-height:1.35}.result span{color:#b3b6bd;font-size:16px;line-height:1.7}
</style></head><body><main><h1>兼容性查询产品流程</h1><p>两个 App 入口进入同一 H5；详情入口额外带入当前游戏，进入后均可切换游戏与机型。</p><div class="flow">
  <section class="branch"><div class="step"><img class="shot" src="${flowSources.pc}"><div class="label">① PC 游戏全局入口</div></div><div class="step"><img class="shot" src="${flowSources.detail}"><div class="label">① 游戏详情入口</div></div></section>
  <div class="arrow"><div>›<small>任一入口</small></div></div>
  <div class="step"><img class="shot" src="${flowSources.query}"><div class="label">② 查询兼容记录</div></div>
  <div class="arrow">›</div>
  <div class="step"><img class="shot" src="${flowSources.review}"><div class="label">③ 查看兼容性评价</div></div>
  <div class="arrow">›</div>
  <section class="result"><b>④ 复制启动配置</b><strong>复制分享码</strong><span>打开盖世游戏导入 PC 引擎设置方案；返回时回到进入前的 App 页面。</span></section>
</div></main></body></html>`, { waitUntil: 'load' });
await flowPage.waitForFunction(() => [...document.images].every((image) => image.complete));
await flowPage.screenshot({ path: path.join(outputDir, '00-product-flow-app-entry.png') });

const result = {
  checkedAt: new Date().toISOString(),
  demo: path.relative(root, demoPath).replaceAll('\\', '/'),
  viewports: [portrait, landscape],
  assertions: {
    globalEntryNoGame: true,
    detailEntryGameId: 'steam_1245620',
    currentDeviceId: 'android_device_oneplus13',
    returnToSource: true,
    noHorizontalOverflow: errors.every((item) => !item.includes('overflow')),
    noExternalRequests: errors.every((item) => !item.includes('external request'))
  },
  screenshots: fs.readdirSync(outputDir).filter((file) => file.endsWith('.png')).sort(),
  errors
};
fs.writeFileSync(path.join(evidenceDir, 'interaction-test-result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');

await pcPortrait.close();
await detailPortrait.close();
await pcLandscape.close();
await detailLandscape.close();
await flowPage.close();
await browser.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('PASS: App double entry, game/device preselection, source return, portrait/landscape layouts, and PRD screenshots');

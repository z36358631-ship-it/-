import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '适合本机', '盖世游戏适合本机WebView-demo.html');
const outputDir = path.join(root, 'test-results', 'compatibility-webview');
fs.mkdirSync(outputDir, { recursive: true });

const executablePath = [
  chromium.executablePath(),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find((candidate) => fs.existsSync(candidate));
if (!executablePath) throw new Error('No Chromium-compatible browser executable found');
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1100, height: 980 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('request', (request) => { if (!request.url().startsWith('file:') && !request.url().startsWith('data:')) errors.push(`unexpected network request: ${request.url()}`); });

await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
const frame = page.locator('.preview-frame');
const portraitDimensions = await frame.evaluate((element) => ({ width: element.clientWidth, height: element.clientHeight }));
if (portraitDimensions.width !== 390 || portraitDimensions.height !== 844) {
  errors.push(`portrait frame is ${portraitDimensions.width}x${portraitDimensions.height}, expected 390x844`);
}
await frame.screenshot({ path: path.join(outputDir, '01-discovery-portrait.png') });

await page.locator('#game-search').fill('星空');
await frame.screenshot({ path: path.join(outputDir, '02-search-portrait.png') });
await page.locator('[data-orientation-value="landscape"]').click();
if (await page.locator('#game-search').inputValue() !== '星空') errors.push('search query was lost during orientation change');
await page.locator('[data-orientation-value="portrait"]').click();

await page.locator('[data-action="clear-search"]').first().click();
await page.locator('[data-game-id="steam_1245620"]').click();
if (await page.locator('#primary-action').textContent() !== '使用方案并启动') {
  errors.push('adjusted installed game did not resolve launch action');
}
await frame.screenshot({ path: path.join(outputDir, '03-detail-portrait.png') });
await page.locator('#primary-action').click();
await page.waitForTimeout(650);
if (await page.locator('#primary-action').textContent() !== '方案已载入，可启动游戏') errors.push('local Bridge fallback did not complete');
await page.evaluate(() => { window.GameHubBridge = { applyPlanAndLaunch() {} }; });
await page.locator('#primary-action').click();
await page.waitForTimeout(50);
if (await page.locator('#primary-action').textContent() !== '正在应用方案…') errors.push('synchronous native Bridge did not wait for callback');
await page.evaluate(() => window.GameHubCompatibility.setActionResult({ status: 'error', message: '原生启动失败，点击重试' }));
if (await page.locator('#primary-action').textContent() !== '原生启动失败，点击重试') errors.push('native Bridge error callback was not rendered');
await page.evaluate(() => { delete window.GameHubBridge; });
await page.locator('#primary-action').click();
await page.waitForTimeout(650);

await page.locator('[data-issue-key="black"]').click();
if (!await page.locator('.issue-body').evaluate((element) => element.classList.contains('is-visible'))) {
  errors.push('troubleshooting steps did not become visible');
}
await page.locator('#troubleshooting').scrollIntoViewIfNeeded();
await frame.screenshot({ path: path.join(outputDir, '04-troubleshooting-portrait.png') });
await page.locator('[data-orientation-value="landscape"]').click();
if (!await page.locator('[data-issue-key="black"]').evaluate((element) => element.classList.contains('is-active'))) errors.push('selected issue was lost during orientation change');
await frame.screenshot({ path: path.join(outputDir, '05-detail-landscape.png') });

await page.locator('[data-action="back"]').click();
await frame.screenshot({ path: path.join(outputDir, '06-discovery-landscape.png') });

const dimensions = await frame.evaluate((element) => ({ width: element.clientWidth, height: element.clientHeight }));
if (dimensions.width !== 874 || dimensions.height !== 402) {
  errors.push(`landscape frame is ${dimensions.width}x${dimensions.height}, expected 874x402`);
}

await page.evaluate(() => window.GameHubCompatibility.setGamesError());
if (!await page.getByText('兼容数据加载失败', { exact: true }).isVisible()) errors.push('list error state is missing');
await page.evaluate(() => window.GameHubCompatibility.setGames([]));
if (!await page.getByText('暂无当前设备兼容数据', { exact: true }).isVisible()) errors.push('empty data state is confused with search empty state');
await page.locator('[data-action="retry-games"]').click();
await page.waitForTimeout(800);
if (await page.locator('[data-game-id]').count() === 0) errors.push('list retry did not recover mock data');

await page.evaluate(() => {
  window.GameHubCompatibility.setGames([null, 1, 'bad', {
    id: 'dirty', name: '脏数据测试', coverKey: 'url(fake)', result: { status: 'bad' },
    evidence: { level: 'bad', validRuns: -1 }, plan: { steps: null, fullConfig: null, knownIssues: null },
    reviews: [{ user: '测试', score: 99, text: '异常评分' }]
  }]);
  window.GameHubCompatibility.openGame('dirty');
});
if (!await page.getByText('暂无结论', { exact: true }).isVisible()) errors.push('invalid result enum did not degrade to unknown');
await page.evaluate(() => window.GameHubCompatibility.setGames([]));
if (!await page.getByText('暂无当前设备兼容数据', { exact: true }).isVisible()) errors.push('removed selected game did not recover to discovery');

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`PASS: captured 6 states; responsive state, recovery paths, Adapter, and Bridge fallback verified`);

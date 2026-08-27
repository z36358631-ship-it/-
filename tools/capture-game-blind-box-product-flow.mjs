import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = process.cwd();
const demoPath = path.join(root, 'demos', '首页与探索', '游戏盲盒demo.html');
const outputDir = path.join(root, 'test-results', 'game-blind-box', 'product-flow-source');
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(fs.existsSync);

if (!executablePath) throw new Error('Local Chrome or Edge not found');
if (!fs.existsSync(demoPath)) throw new Error(`Demo not found: ${demoPath}`);

fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

const screenshot = async fileName => {
  const target = path.join(outputDir, fileName);
  await page.locator('#device').screenshot({ path: target, animations: 'disabled' });
  return target;
};

try {
  await page.goto(`${pathToFileURL(demoPath).href}?test=1`, { waitUntil: 'load' });
  await page.evaluate(() => {
    demo.setOrientation('portrait');
    demo.setLocale('zh-CN');
    demo.drawTiming.testCycleMs = 180;
    demo.drawTiming.testTotalMs = 3000;
    demo.setDemoState('library');
  });
  await page.waitForTimeout(120);

  const files = [];
  files.push(await screenshot('01-library.png'));

  await page.locator('[data-testid="blind-entry"]').click();
  await page.waitForSelector('[data-testid="drawing"]');
  const firstPreview = await page.locator('[data-testid="drawing"]').getAttribute('data-preview-game');
  files.push(await screenshot('02-modal-open.png'));

  await page.waitForFunction(
    first => document.querySelector('[data-testid="drawing"]')?.dataset.previewGame !== first,
    firstPreview,
  );
  files.push(await screenshot('03-random-switch.png'));

  await page.evaluate(() => demo.finishDraw());
  await page.waitForSelector('[data-testid="result"]');
  files.push(await screenshot('04-result.png'));

  await page.locator('[data-testid="view-details"]').click();
  await page.waitForSelector('[data-testid="detail-page"]');
  files.push(await screenshot('05-details.png'));

  if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join('; ')}`);
  console.log(JSON.stringify({ outputDir, files }, null, 2));
} finally {
  await browser.close();
}

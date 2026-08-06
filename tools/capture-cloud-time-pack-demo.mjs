import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const demo = path.join(root, 'demos', '云游戏', '云游戏时段次卡与限时套餐demo.html');
const outDir = path.join(root, 'public', 'prd', 'cloud-time-pack');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe');
fs.mkdirSync(outDir, { recursive: true });

const captures = [
  ['c-recharge', 'capture-c-recharge', '01-recharge-products.png'],
  ['c-activation', 'capture-c-activation', '02-slot-pass-activation.png'],
  ['c-detail', 'capture-c-detail', '03-time-detail.png'],
  ['c-reminder', 'capture-c-reminder', '04-slot-pass-reminder.png'],
  ['c-landscape-recharge', 'capture-c-landscape-recharge', '05-landscape-recharge.png'],
  ['c-landscape-activation', 'capture-c-landscape-activation', '06-landscape-activation.png'],
  ['b-list', 'capture-b-list', '07-product-list.png'],
  ['b-slot', 'capture-b-slot', '08-slot-pass-config.png'],
  ['b-limited', 'capture-b-limited', '09-limited-pack-config.png'],
  ['b-queue', 'capture-b-slot', '10-queue-privilege-config.png'],
  ['b-deduct', 'capture-b-deduct', '11-limited-time-deduct.png']
];

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(demo).href, { waitUntil: 'load' });
for (const [scene, id, filename] of captures) {
  if (scene === 'b-queue') await page.evaluate(() => window.openQueueConfig());
  else await page.evaluate(name => window.showScene(name), scene);
  await page.waitForTimeout(120);
  await page.locator(`#${id}`).screenshot({ path: path.join(outDir, filename), type: 'png' });
}
await browser.close();

const result = captures.map(([, , filename]) => ({ filename, bytes: fs.statSync(path.join(outDir, filename)).size }));
console.log(JSON.stringify({ ok: true, count: result.length, files: result }, null, 2));

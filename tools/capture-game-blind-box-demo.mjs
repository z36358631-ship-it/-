import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = process.cwd();
const demoPath = path.join(root, 'demos', '首页与探索', '游戏盲盒demo.html');
const outputDir = path.join(root, 'public', 'prd', 'game-blind-box');
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(fs.existsSync);
if (!executablePath) throw new Error('Local Chrome or Edge not found');

fs.mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(`${pathToFileURL(demoPath).href}?test=1`, { waitUntil: 'load' });
  const device = page.locator('#device');

  await page.evaluate(() => { demo.setOrientation('portrait'); demo.setLocale('zh-CN'); demo.setDemoState('library'); });
  await page.waitForTimeout(320);
  await device.screenshot({ path: path.join(outputDir, '01-library-entry-portrait.png') });

  await page.evaluate(() => demo.setDemoState('result'));
  await page.waitForTimeout(320);
  await device.screenshot({ path: path.join(outputDir, '02-result-portrait.png') });

  await page.evaluate(() => { demo.setOrientation('landscape'); demo.setDemoState('library'); });
  await page.waitForTimeout(320);
  await device.screenshot({ path: path.join(outputDir, '03-library-entry-landscape.png') });

  await page.evaluate(() => demo.setDemoState('result'));
  await page.waitForTimeout(320);
  await device.screenshot({ path: path.join(outputDir, '04-result-landscape.png') });

  if (errors.length) throw new Error(`Page errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({ outputDir, files: fs.readdirSync(outputDir).sort() }));
} finally {
  await browser.close();
}

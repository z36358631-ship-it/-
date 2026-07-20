import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '.tmp', 'android-ad-demo-captures');
fs.mkdirSync(output, { recursive: true });
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
if (!executablePath) throw new Error('Local Chrome not found');
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(root, 'demos', 'Android广告接入-交互标注版.html')).href);

async function shot(name) {
  await page.locator('#demoCanvas').screenshot({ path: path.join(output, `${name}.png`) });
}

await shot('O1-portrait-logo');
await page.click('[data-action="o1-next"]'); await shot('O1-portrait-ad');
await page.click('[data-action="o1-next"]'); await shot('O1-portrait-destination');
for (const id of ['H1','P1','G1','Q1','L1']) { await page.click(`[data-page="${id}"]`); await shot(id); }
await page.click('[data-page="C1"]'); await page.click('[data-action="c1-checkin"]'); await shot('C1-checkin-success');
await page.click('[data-surface="admin"]'); await shot('admin-delivery');
await page.click('[data-admin-nav="experiment"]'); await shot('admin-experiment');
await page.click('[data-admin-nav="report"]'); await shot('admin-report');

await browser.close();
console.log(`Captured ${output}`);

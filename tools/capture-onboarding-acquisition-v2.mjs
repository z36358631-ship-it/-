import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, 'demos', '新手引导完整链路demo.html');
const outputDir = path.join(root, 'public', 'prd', 'onboarding-acquisition-v2');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);

assert(executablePath, 'Local Chrome not found');
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 980 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(6000);
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

async function resetDemo() {
  await page.goto(pathToFileURL(demo).href);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('#pageWelcome.active').waitFor();
}

async function capturePhone(filename, activePage) {
  await page.locator(`${activePage}.active`).waitFor();
  await page.waitForTimeout(500);
  await page.locator('.phone').screenshot({
    path: path.join(outputDir, filename),
  });
}

async function chooseSource(code) {
  await page.locator(`[data-onboarding-source-code="${code}"]`).click();
  await page.locator('[data-action="submit-onboarding-source"]').click();
}

async function resetAsOverseas() {
  await resetDemo();
  await page.locator('#regionBtn').click();
  await page.locator('[data-action="start-new-user"]').click();
}

await resetDemo();
await capturePhone('01-welcome.png', '#pageWelcome');

await page.locator('[data-action="start-new-user"]').click();
await capturePhone('02-source.png', '#pageSource');

await chooseSource('friend_referral');
await capturePhone('03-start-method.png', '#pageStartMethod');

await page.locator('[data-start-method="explore_first"]').click();
await page.locator('#page2.active').waitFor();
await page.waitForTimeout(2300);
await capturePhone('04-domestic-destination.png', '#page2');

await resetAsOverseas();
await chooseSource('youtube');
await page.locator('[data-start-method="explore_first"]').click();
await capturePhone('05-overseas-destination.png', '#page2b');

await resetDemo();
await page.locator('[data-demo-scenario="existing_full"]').click();
await capturePhone('06-existing-game.png', '#existingGameStep');

const gameCards = page.locator('[data-existing-game]');
for (let index = 0; index < 3; index += 1) await gameCards.nth(index).click();
await page.locator('[data-action="submit-existing-games"]').click();
await capturePhone('07-existing-source.png', '#existingSourceStep');

await page.locator('[data-view="admin"]').click();
await page.locator('#sourceAnalyticsView.active').waitFor();
await page.waitForTimeout(300);
await page.locator('#sourceAnalyticsView').screenshot({
  path: path.join(outputDir, '08-source-analytics.png'),
});

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);
await browser.close();

console.log('Captured 8 onboarding acquisition screenshots');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, 'demos', '新手引导完整链路demo.html');
const outputDir = path.join(root, 'public', 'prd', 'onboarding-third-step-progress');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);

assert(executablePath, 'Local Chrome not found');
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({
  viewport: { width: 1180, height: 940 },
  deviceScaleFactor: 1,
});
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

async function reset() {
  await page.goto(pathToFileURL(demo).href);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function chooseNewUserAndSource(sourceCode) {
  await page.locator('#page0 .opt-card').nth(1).click();
  await page.locator(`[data-onboarding-source-code="${sourceCode}"]`).click();
  await page.locator('[data-action="submit-onboarding-source"]').click();
}

await reset();
await chooseNewUserAndSource('other_or_unknown');
await page.locator('#page2.active').waitFor();
await page.waitForTimeout(2300);
await page.locator('.phone').screenshot({
  path: path.join(outputDir, '01-domestic-third-step.png'),
});

await reset();
await page.locator('#regionBtn').click();
await chooseNewUserAndSource('youtube');
await page.locator('#page2b.active').waitFor();
await page.waitForTimeout(500);
await page.locator('.phone').screenshot({
  path: path.join(outputDir, '02-overseas-third-step.png'),
});

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);
await browser.close();

console.log(`Captured onboarding third-step progress screenshots in ${outputDir}`);

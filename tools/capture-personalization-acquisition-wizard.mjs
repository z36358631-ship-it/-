import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public', 'prd', 'personalization-acquisition-wizard');
fs.mkdirSync(output, { recursive: true });
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find(fs.existsSync);
if (!executablePath) throw new Error('Local Chrome not found');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
const wizardUrl = pathToFileURL(path.join(root, 'demos', '用户与设置', '个性化推荐采集demo.html')).href;
await page.goto(wizardUrl);
await page.evaluate(() => localStorage.clear());
await page.reload();

async function shot(name) {
  await page.locator('.phone').screenshot({ path: path.join(output, name) });
}

await shot('01-game-step-cn.png');
for (let index = 0; index < 3; index += 1) await page.locator('[data-game-id]').nth(index).click();
await page.locator('[data-action="submit-games"]').click();
await shot('02-source-step-cn.png');

await page.selectOption('#marketSelect', 'overseas');
await shot('03-source-step-overseas.png');

await page.selectOption('#marketSelect', 'domestic');
await page.selectOption('#networkSelect', 'offline');
await page.locator('[data-source-code="friend_referral"]').click();
await page.locator('[data-action="simulate-interrupt"]').click();
await shot('04-source-resume-offline.png');

const onboardingUrl = pathToFileURL(path.join(root, 'demos', '新手引导完整链路demo.html')).href;
await page.goto(onboardingUrl);
await page.locator('.phone').screenshot({
  path: path.join(output, '05-onboarding-style-alignment.png'),
});

await browser.close();
console.log(`Captured ${output}`);

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public', 'prd', 'personalization-acquisition-onboarding-v2');
fs.mkdirSync(output, { recursive: true });

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find(fs.existsSync);
if (!executablePath) throw new Error('Local Chrome not found');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 980 },
  deviceScaleFactor: 1,
});

async function shot(name) {
  const phone = page.locator('.phone');
  await phone.waitFor({ state: 'visible' });
  await phone.screenshot({ path: path.join(output, name) });
}

async function waitForOnboardingPage(id) {
  await page.locator(`#${id}.active`).waitFor({ state: 'visible' });
  await page.waitForTimeout(450);
}

const onboardingUrl = pathToFileURL(
  path.join(root, 'demos', '新手引导完整链路demo.html'),
).href;
await page.goto(onboardingUrl);
await page.evaluate(() => localStorage.clear());
await page.reload();
await shot('01-onboarding-user-type.png');

await page.locator('#page0 .opt-card').first().click();
await waitForOnboardingPage('pageSource');
await shot('02-onboarding-source-cn.png');

await page.evaluate(() => localStorage.clear());
await page.reload();
await page.locator('#regionBtn').click();
await page.locator('#page0 .opt-card').nth(1).click();
await waitForOnboardingPage('pageSource');
await shot('03-onboarding-source-overseas.png');

await page.locator('[data-onboarding-source-code="friend_referral"]').click();
await page.reload();
await waitForOnboardingPage('pageSource');
await shot('04-onboarding-source-resume.png');

const wizardUrl = pathToFileURL(
  path.join(root, 'demos', '用户与设置', '个性化推荐采集demo.html'),
).href;
await page.goto(wizardUrl);
await page.evaluate(() => localStorage.clear());
await page.reload();
await shot('05-existing-game-step.png');

await page.selectOption('#personaSelect', 'existing_source_only');
await page.locator('[data-action="simulate-cold-start"]').click();
await shot('06-existing-source-step.png');

await browser.close();
console.log(`Captured ${output}`);

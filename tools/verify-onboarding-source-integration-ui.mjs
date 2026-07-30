import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'demos', '新手引导完整链路demo.html');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);
assert(executablePath, 'Local Chrome not found');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 940 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

await page.goto(pathToFileURL(file).href);
await page.evaluate(() => localStorage.clear());
await page.reload();

await page.locator('#page0 .opt-card').first().click();
assert.equal(
  await page.locator('#pageSource.active').count(),
  1,
  'choosing the has-game user type must open the source step'
);
assert.equal(
  await page.locator('[data-onboarding-source-code]').count(),
  6,
  'domestic source step must show six options'
);
assert.equal(
  await page.locator('[data-action="submit-onboarding-source"]').isDisabled(),
  true,
  'source submit must be disabled before a selection'
);
assert.equal(
  await page.locator('[data-action="skip-onboarding-source"]').count(),
  0,
  'required source step must not expose a skip action'
);

await page.locator('[data-onboarding-source-code="friend_referral"]').click();
await page.reload();
assert.equal(
  await page.locator('#pageSource.active').count(),
  1,
  'an interrupted source step must resume after reload'
);
assert.equal(
  await page.locator('[data-onboarding-source-code="friend_referral"]').getAttribute('aria-pressed'),
  'true',
  'the selected source must survive reload'
);

await page.locator('[data-action="submit-onboarding-source"]').click();
assert.equal(
  await page.locator('#page1.active').count(),
  1,
  'has-game users must continue to the existing import or Steam branch'
);
assert.equal(
  await page.locator('#page1 .onboarding-progress').count(),
  0,
  'the has-game branch must not receive the beginner third-step progress'
);
const hasGameSaved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('gamehub_onboarding_source_v2'))
);
assert.equal(hasGameSaved.userType, 'has_game');
assert.equal(hasGameSaved.sourceCode, 'friend_referral');
assert.equal(hasGameSaved.manualInterestExempt, true);

await page.reload();
assert.equal(
  await page.locator('#page1.active').count(),
  1,
  'a saved has-game branch must resume after reload'
);

await page.evaluate(() => localStorage.clear());
await page.reload();
await page.locator('#page0 .opt-card').nth(1).click();
await page.locator('[data-onboarding-source-code="other_or_unknown"]').click();
await page.locator('[data-action="submit-onboarding-source"]').click();
assert.equal(
  await page.locator('#page2.active').count(),
  1,
  'domestic new users must continue to the domestic beginner branch'
);
assert.equal(
  await page.locator('#page2 .onboarding-progress span').count(),
  3,
  'the domestic beginner landing page must show three progress segments'
);
assert.equal(
  await page.locator('#page2 .onboarding-progress span.is-active').count(),
  3,
  'all domestic third-step progress segments must be active'
);
assert.equal(
  await page.locator('#page2 .onboarding-progress').getAttribute('aria-label'),
  '独立新手引流，第3步，共3步'
);
const domesticNewUserSaved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('gamehub_onboarding_source_v2'))
);
assert.equal(domesticNewUserSaved.userType, 'new_user');
assert.equal(domesticNewUserSaved.market, 'domestic');
assert.equal(domesticNewUserSaved.manualInterestExempt, true);

await page.evaluate(() => localStorage.clear());
await page.reload();
await page.locator('#regionBtn').click();
await page.locator('#page0 .opt-card').nth(1).click();
assert.equal(
  await page.locator('#onboardingSourceTitle').innerText(),
  'Where did you first hear about GameHub?'
);
assert.equal(
  await page.locator('[data-onboarding-source-code]').count(),
  6,
  'overseas source step must show six options'
);
assert.equal(await page.locator('[data-onboarding-source-code="youtube"]').count(), 1);
assert.equal(
  (await page.locator('body').innerText()).includes('GaishiGame'),
  false,
  'overseas copy must use the GameHub brand'
);

await page.locator('[data-onboarding-source-code="youtube"]').click();
await page.locator('[data-action="submit-onboarding-source"]').click();
assert.equal(
  await page.locator('#page2b.active').count(),
  1,
  'overseas new users must continue to the overseas beginner branch'
);
assert.equal(
  await page.locator('#page2b .gh-guide__progress').count(),
  1,
  'the overseas beginner landing page must use its dedicated progress safe area'
);
assert.equal(
  await page.locator('#page2b .onboarding-progress span').count(),
  3,
  'the overseas beginner landing page must show three progress segments'
);
assert.equal(
  await page.locator('#page2b .onboarding-progress span.is-active').count(),
  3,
  'all overseas third-step progress segments must be active'
);
assert.equal(
  await page.locator('#page2b .onboarding-progress').getAttribute('aria-label'),
  'GameHub onboarding, step 3 of 3'
);
const overseasSaved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('gamehub_onboarding_source_v2'))
);
assert.equal(overseasSaved.userType, 'new_user');
assert.equal(overseasSaved.market, 'overseas');
assert.equal(overseasSaved.sourceCode, 'youtube');
assert.equal(overseasSaved.manualInterestExempt, true);

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);
await browser.close();
console.log('PASS onboardingSourceUi');

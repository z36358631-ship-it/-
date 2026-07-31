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

async function resetDemo() {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function startAndChooseSource(sourceCode) {
  await page.locator('[data-action="start-new-user"]').click();
  await page.locator(`[data-onboarding-source-code="${sourceCode}"]`).click();
  await page.locator('[data-action="submit-onboarding-source"]').click();
}

await page.goto(pathToFileURL(file).href);
await page.evaluate(() => localStorage.clear());
await page.reload();

assert.equal(await page.locator('#pageWelcome.active').count(), 1, 'new users must see the welcome cover first');
assert.equal(await page.locator('#pageWelcome .onboarding-progress').count(), 0, 'welcome cover must not count as progress');
assert.equal(await page.locator('[data-action="start-new-user"]').innerText(), '开始');

await page.locator('[data-action="start-new-user"]').click();
assert.equal(await page.locator('#pageSource.active').count(), 1, 'start must open the source step');
assert.equal(await page.locator('#pageSource .onboarding-progress span.is-active').count(), 1);
assert.equal(await page.locator('[data-onboarding-source-code]').count(), 6);
assert.equal(await page.locator('[data-action="submit-onboarding-source"]').isDisabled(), true);
assert.equal(await page.locator('[data-action="skip-onboarding-source"]').count(), 0);

await page.locator('[data-onboarding-source-code="friend_referral"]').click();
await page.reload();
assert.equal(await page.locator('#pageSource.active').count(), 1, 'source draft must resume after reload');
assert.equal(
  await page.locator('[data-onboarding-source-code="friend_referral"]').getAttribute('aria-pressed'),
  'true'
);

await page.locator('[data-action="source-back"]').click();
assert.equal(await page.locator('#pageWelcome.active').count(), 1, 'source back must return to welcome');
await page.locator('[data-action="start-new-user"]').click();
assert.equal(
  await page.locator('[data-onboarding-source-code="friend_referral"]').getAttribute('aria-pressed'),
  'true',
  'source draft must remain after returning to welcome'
);

await page.locator('[data-action="submit-onboarding-source"]').click();
assert.equal(await page.locator('#pageStartMethod.active').count(), 1);
assert.equal(await page.locator('#pageStartMethod .onboarding-progress span.is-active').count(), 2);
assert.equal(await page.locator('#pageStartMethod [data-start-method]').count(), 3);
assert.equal(await page.locator('#pageStartMethod .skip-btn').count(), 0);
assert.equal(await page.locator('[data-start-method="later"] .opt-title').innerText(), '以后再说');

await page.locator('[data-action="start-method-back"]').click();
assert.equal(await page.locator('#pageSource.active').count(), 1);
assert.equal(
  await page.locator('[data-onboarding-source-code="friend_referral"]').getAttribute('aria-pressed'),
  'true'
);
await page.locator('[data-action="submit-onboarding-source"]').click();
await page.locator('[data-start-method="later"]').click();
assert.equal(await page.locator('#pageHome.active').count(), 1);
assert.equal(await page.locator('#pageHome [data-result="later"]').count(), 1);

const laterSaved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('gamehub_onboarding_source_v2'))
);
assert.equal(laterSaved.sourceCode, 'friend_referral');
assert.equal(laterSaved.startMethod, 'later');
assert.equal(laterSaved.state, 'completed');
assert.equal(laterSaved.manualInterestExempt, true);
const installIdBeforeReload = laterSaved.installId;
await page.reload();
const installIdAfterReload = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('gamehub_onboarding_source_v2')).installId
);
assert.equal(installIdAfterReload, installIdBeforeReload);
assert.equal(await page.locator('#pageHome.active').count(), 1);

await resetDemo();
await startAndChooseSource('friend_referral');
await page.locator('[data-start-method="has_game"]').click();
assert.equal(await page.locator('#page1.active').count(), 1);
assert.equal(await page.locator('#page1 .onboarding-progress span.is-active').count(), 3);

await resetDemo();
await startAndChooseSource('other_or_unknown');
await page.locator('[data-start-method="explore_first"]').click();
assert.equal(await page.locator('#page2.active').count(), 1);
assert.equal(await page.locator('#page2 .onboarding-progress span.is-active').count(), 3);

await resetDemo();
await page.locator('#regionBtn').click();
assert.equal(await page.locator('[data-action="start-new-user"]').innerText(), 'Start');
await page.locator('[data-action="start-new-user"]').click();
assert.equal(await page.locator('[data-onboarding-source-code="youtube"]').count(), 1);
await page.locator('[data-onboarding-source-code="youtube"]').click();
await page.locator('[data-action="submit-onboarding-source"]').click();
assert.equal(
  await page.locator('[data-start-method="explore_first"] .opt-title').innerText(),
  "I'm new, show me around"
);
await page.locator('[data-start-method="explore_first"]').click();
assert.equal(await page.locator('#page2b.active').count(), 1);
assert.equal(await page.locator('#page2b .onboarding-progress span.is-active').count(), 3);

await resetDemo();
await page.setViewportSize({ width: 940, height: 1180 });
await page.locator('[data-action="start-new-user"]').click();
await page.locator('[data-onboarding-source-code="friend_referral"]').click();
await page.setViewportSize({ width: 1180, height: 940 });
assert.equal(await page.locator('#pageSource.active').count(), 1);
assert.equal(
  await page.locator('[data-onboarding-source-code="friend_referral"]').getAttribute('aria-pressed'),
  'true',
  'orientation changes must preserve the current source draft'
);

await page.locator('[data-demo-scenario="existing_full"]').click();
assert.equal(await page.locator('#existingGameStep.active').count(), 1);
assert.equal(await page.locator('[data-existing-game]').count(), 9);
assert.equal(await page.locator('[data-action="submit-existing-games"]').isDisabled(), true);
for (let index = 0; index < 3; index += 1) {
  await page.locator('[data-existing-game]').nth(index).click();
}
assert.equal(await page.locator('[data-action="submit-existing-games"]').isEnabled(), true);
await page.locator('[data-action="submit-existing-games"]').click();
assert.equal(await page.locator('#existingSourceStep.active').count(), 1);
assert.equal(await page.locator('[data-existing-source]').count(), 6);
assert.equal(await page.locator('[data-action="skip-existing-source"]').count(), 0);
await page.locator('[data-existing-source="friend_referral"]').click();
await page.locator('[data-action="submit-existing-source"]').click();
assert.equal(await page.locator('#existingCompleteState.active').count(), 1);
const existingSaved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('gamehub_existing_personalization_v2'))
);
assert.equal(existingSaved.gameTerminal, 'submitted');
assert.equal(existingSaved.sourceTerminal, 'completed');
assert.equal(existingSaved.entryGroup, 'existing_user_recall');

await page.locator('[data-demo-scenario="existing_source_only"]').click();
assert.equal(await page.locator('#existingSourceStep.active').count(), 1);

await page.locator('[data-demo-scenario="existing_game_only"]').click();
assert.equal(await page.locator('#existingGameStep.active').count(), 1);
await page.locator('[data-action="skip-existing-games"]').click();
assert.equal(await page.locator('#existingCompleteState.active').count(), 1);

await page.locator('[data-demo-scenario="existing_completed"]').click();
assert.equal(await page.locator('#existingCompleteState [data-bypass="true"]').count(), 1);

await page.locator('#regionBtn').click();
await page.locator('[data-demo-scenario="existing_source_only"]').click();
assert.equal(await page.locator('[data-existing-source="youtube"]').count(), 1);
assert.equal((await page.locator('#existingSourceStep').innerText()).includes('GaishiGame'), false);

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);
await browser.close();
console.log('PASS onboardingSourceUi');

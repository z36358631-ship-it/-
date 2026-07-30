import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'demos', '用户与设置', '个性化推荐采集demo.html');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);
assert(executablePath, 'Local Chrome not found');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
await page.goto(pathToFileURL(file).href);
await page.evaluate(() => localStorage.clear());
await page.reload();

const gameCards = page.locator('[data-game-id]');
assert.equal(await gameCards.count(), 9, 'game step must show nine candidates');
assert.equal(await page.locator('[data-action="submit-games"]').isDisabled(), true);

for (let index = 0; index < 9; index += 1) await gameCards.nth(index).click();
assert.equal(
  await page.evaluate(() => window.PersonalizationWizard.state.selectedGameIds.size),
  9,
  'game selection must allow nine items'
);
await page.locator('[data-action="shuffle-games"]').click();
assert.equal(
  await page.evaluate(() => window.PersonalizationWizard.state.selectedGameIds.size),
  9,
  'shuffle must retain selected games'
);
for (let index = 8; index >= 3; index -= 1) {
  await page.locator('[data-game-id]').nth(index).click();
}
assert.equal(
  await page.evaluate(() => window.PersonalizationWizard.state.selectedGameIds.size),
  3,
  'game selection must support returning to three items'
);

assert.equal(await page.locator('[data-action="submit-games"]').isEnabled(), true);
await page.locator('[data-action="submit-games"]').click();
assert.equal(await page.locator('[data-wizard-step="source"].active').count(), 1);
assert.equal(await page.locator('.acquisition-source-card').count(), 6, 'source step must show six options');
assert.equal(await page.locator('[data-action="submit-source"]').isDisabled(), true);
assert.equal(await page.locator('[data-action="skip-source"]').count(), 0);
assert.equal(await page.locator('[data-action="close-wizard"]').count(), 0);

await page.locator('[data-source-code="douyin"]').click();
assert.equal(await page.locator('[data-action="submit-source"]').isEnabled(), true);
await page.selectOption('#networkSelect', 'offline');
await page.locator('[data-action="submit-source"]').click();
assert.equal(await page.locator('[data-wizard-step="result"].active').count(), 1);
assert.equal(
  await page.evaluate(() => window.PersonalizationWizard.state.syncStatus),
  'sync_pending',
  'offline completion must persist instead of blocking'
);
assert((await page.locator('#resultDescription').innerText()).includes('本机'));

await page.selectOption('#networkSelect', 'online');
assert.equal(
  await page.evaluate(() => window.PersonalizationWizard.state.syncStatus),
  'synced',
  'pending source answer must sync after network recovery'
);
await page.selectOption('#marketSelect', 'overseas');
assert.equal(
  await page.evaluate(() => window.PersonalizationWizard.state.market),
  'domestic',
  'completed first source answer must not be overwritten by market switching'
);

await page.evaluate(() => localStorage.clear());
await page.reload();
await page.locator('[data-action="skip-games"]').click();
assert.equal(await page.locator('[data-wizard-step="source"].active').count(), 1);
assert.deepEqual(
  await page.evaluate(() => [...window.PersonalizationWizard.state.selectedGameIds]),
  [],
  'skip must not create interest selections'
);

await page.locator('[data-source-code="friend_referral"]').click();
await page.reload();
assert.equal(await page.locator('[data-wizard-step="source"].active').count(), 1);
assert.equal(await page.locator('[data-source-code="friend_referral"]').getAttribute('aria-pressed'), 'true');

const stepBeforeRotation = await page.evaluate(() => window.PersonalizationWizard.state.step);
const sourceBeforeRotation = await page.evaluate(() => window.PersonalizationWizard.state.sourceCode);
await page.locator('[data-orientation="landscape"]').click();
await page.waitForTimeout(350);
const landscapeBox = await page.locator('.phone.landscape').boundingBox();
assert(Math.abs(landscapeBox.width - 874) <= 2, `landscape width mismatch: ${landscapeBox.width}`);
assert(Math.abs(landscapeBox.height - 402) <= 2, `landscape height mismatch: ${landscapeBox.height}`);
assert.equal(await page.evaluate(() => window.PersonalizationWizard.state.step), stepBeforeRotation);
assert.equal(await page.evaluate(() => window.PersonalizationWizard.state.sourceCode), sourceBeforeRotation);

await page.selectOption('#marketSelect', 'overseas');
assert.equal(await page.locator('[data-source-code="youtube"]').count(), 1);
assert.equal(await page.locator('.acquisition-source-card').count(), 6);
assert((await page.locator('#sourceTitle').innerText()).includes('GameHub'));
assert.equal((await page.locator('body').innerText()).includes('GaishiGame'), false);

const newUserEligible = await page.evaluate(() => window.PersonalizationWizard.eligibleColdStart({
  isColdStart: true,
  complianceFinished: true,
  hasHigherPriorityLayer: false,
  featureEnabled: true,
  inVersionRange: true,
  inRollout: true,
  userType: 'new',
  manualInterestExempt: true,
  status: 'pending',
}));
assert.equal(newUserEligible, false, 'new users must be handled only by onboarding');

await page.selectOption('#personaSelect', 'new_exempt');
await page.locator('[data-action="simulate-cold-start"]').click();
assert.equal(
  await page.locator('[data-wizard-step="result"].active').count(),
  1,
  'new users must never enter the existing-user wizard'
);
assert.equal(
  await page.evaluate(() => window.PersonalizationWizard.state.manualInterestExempt),
  true,
  'new users handled by onboarding must keep the permanent exemption'
);

await page.selectOption('#personaSelect', 'existing_source_only');
await page.locator('[data-action="simulate-cold-start"]').click();
assert.equal(
  await page.locator('[data-wizard-step="source"].active').count(),
  1,
  'source-only users must open the source step'
);
assert.equal(
  await page.evaluate(() => window.PersonalizationWizard.state.gameTerminal),
  'historical_profile',
  'source-only users must keep the existing game profile terminal'
);

await page.selectOption('#personaSelect', 'existing_game_only');
await page.locator('[data-action="simulate-cold-start"]').click();
assert.equal(
  await page.locator('[data-wizard-step="game"].active').count(),
  1,
  'game-only users must open the game step'
);
assert.equal(
  await page.evaluate(() => window.PersonalizationWizard.state.sourceTerminal),
  true,
  'game-only users must keep the existing source terminal'
);

const mergedState = await page.evaluate(() => window.PersonalizationWizard.mergeIdentityState(
  { status: 'source_pending', sourceCode: 'douyin' },
  { status: 'completed', sourceCode: 'friend_referral', sourceSavedAt: '2026-07-30T08:00:00.000Z' }
));
assert.equal(mergedState.status, 'completed', 'completed account state must win identity merge');
assert.equal(mergedState.sourceCode, 'friend_referral', 'first completed source answer must not be overwritten');

await page.locator('[data-orientation="portrait"]').click();
await page.waitForTimeout(350);
const portraitBox = await page.locator('.phone.portrait').boundingBox();
assert(Math.abs(portraitBox.width - 390) <= 2, `portrait width mismatch: ${portraitBox.width}`);
assert(Math.abs(portraitBox.height - 844) <= 2, `portrait height mismatch: ${portraitBox.height}`);
assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);

await browser.close();
console.log('PASS wizardUi');

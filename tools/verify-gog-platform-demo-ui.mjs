import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'demos', 'PC与Mac端', '盖世游戏GOG平台接入-交互标注版.html');
const mode = process.argv[2] || 'all';
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);
assert(executablePath, 'Local Chrome not found');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(2500);
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

async function resetDemo() {
  await page.goto(`${pathToFileURL(file).href}?run=${Date.now()}`);
  await page.waitForSelector('#gogDemoShell');
}

async function platformSnapshot(platform) {
  return page.evaluate(name => structuredClone(window.GogDemoApp.state.accountByPlatform[name]), platform);
}

async function assertCorePlatformsUnchanged(steamBefore, epicBefore, context) {
  assert.deepEqual(await platformSnapshot('steam'), steamBefore, `${context}: Steam state changed`);
  assert.deepEqual(await platformSnapshot('epic'), epicBefore, `${context}: EPIC state changed`);
}

async function assertNoCredentialState() {
  const sensitivePaths = await page.evaluate(() => {
    const hits = [];
    const visit = (value, trail = 'state') => {
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        const path = `${trail}.${key}`;
        if (/email|password/i.test(key)) hits.push(path);
        visit(child, path);
      }
    };
    visit(window.GogDemoApp.state);
    return hits;
  });
  assert.deepEqual(sensitivePaths, [], `credential-like state keys found: ${sensitivePaths.join(', ')}`);
}

async function profileFlow() {
  await resetDemo();
  const steamBefore = await platformSnapshot('steam');
  const epicBefore = await platformSnapshot('epic');

  await page.click('[data-page="profile-unbound"]');
  await page.click('[data-action="bind-gog"]');
  assert.equal(await page.locator('[data-screen="gog-login"]').count(), 1, 'official login did not open');
  assert((await page.locator('#demoCanvas').innerText()).includes('不保存邮箱或密码'));
  assert((await page.locator('#demoCanvas').innerText()).includes('GOG 官方登录'));
  await assertNoCredentialState();

  await page.click('[data-action="gog-authorize-success"]');
  assert.equal(await page.locator('[data-screen="profile-bound"]').count(), 1, 'login did not return to profile');
  const profileText = await page.locator('#demoCanvas').innerText();
  for (const value of ['GalaxyRider', '¥6.8k', '438h', '126']) {
    assert(profileText.includes(value), `bound profile missing ${value}`);
  }

  const refreshCountBefore = await page.evaluate(() => window.GogDemoApp.state.gogRefreshRequestCount);
  await page.click('[data-action="refresh-gog"]');
  assert.equal(await page.locator('[data-action="refresh-gog"]').isDisabled(), true, 'refresh is not locked in flight');
  await page.evaluate(() => document.querySelector('[data-action="refresh-gog"]').click());
  assert.equal(
    await page.evaluate(() => window.GogDemoApp.state.gogRefreshRequestCount),
    refreshCountBefore + 1,
    'duplicate refresh was submitted'
  );
  await page.waitForFunction(() => !window.GogDemoApp.state.gogRefreshInFlight);

  await page.click('[data-action="switch-gog"]');
  await page.click('[data-action="gog-authorize-failure"]');
  assert((await page.locator('[data-login-error]').innerText()).includes('切换失败'));
  assert.equal(
    await page.evaluate(() => window.GogDemoApp.state.accountByPlatform.gog.account.username),
    'GalaxyRider',
    'failed switch replaced the old account'
  );
  await page.click('[data-action="gog-authorize-cancel"]');
  assert.equal(await page.locator('[data-screen="profile-bound"]').count(), 1, 'failed switch did not return to profile');
  assert((await page.locator('#demoCanvas').innerText()).includes('GalaxyRider'));

  await page.click('[data-action="switch-gog"]');
  await page.click('[data-action="gog-authorize-cancel"]');
  assert.equal(
    await page.evaluate(() => window.GogDemoApp.state.accountByPlatform.gog.account.username),
    'GalaxyRider',
    'cancelled switch replaced the old account'
  );
  await assertCorePlatformsUnchanged(steamBefore, epicBefore, 'profile account operations');

  await page.click('[data-action="logout-gog"]');
  assert.equal(await page.locator('[data-logout-confirm]').count(), 1, 'logout confirmation missing');
  await page.click('[data-action="confirm-logout-gog"]');
  assert.equal(await page.locator('[data-screen="profile-unbound"]').count(), 1, 'logout did not show unbound profile');
  assert.deepEqual(
    await platformSnapshot('gog'),
    { bindStatus: 'unbound', tokenStatus: 'none', account: null },
    'logout did not clear only the GOG account'
  );
  await assertCorePlatformsUnchanged(steamBefore, epicBefore, 'GOG logout');
  await assertNoCredentialState();
  console.log('PASS profileFlow');
}

async function libraryFlow() {
  await resetDemo();
  const steamBefore = await platformSnapshot('steam');
  const epicBefore = await platformSnapshot('epic');

  await page.click('[data-page="library-unbound"]');
  await page.click('[data-action="bind-gog"]');
  await page.click('[data-action="gog-authorize-success"]');
  assert.equal(await page.locator('[data-screen="library-bound"]').count(), 1, 'login did not return to library');

  const cards = page.locator('[data-game-card][data-platform="gog"]');
  assert.equal(await cards.count(), 6, 'GOG library must contain six stable games');
  const identifiers = await cards.evaluateAll(elements => elements.map(element => ({
    gameId: element.dataset.gameId,
    platformAppId: element.dataset.platformAppId,
    platform: element.dataset.platform,
  })));
  assert.deepEqual(identifiers, [
    { gameId:'the-witcher-3', platformAppId:'gog-1495134320', platform:'gog' },
    { gameId:'cyberpunk-2077', platformAppId:'gog-1423049311', platform:'gog' },
    { gameId:'control', platformAppId:'gog-1808684453', platform:'gog' },
    { gameId:'baldurs-gate-3', platformAppId:'gog-1456460669', platform:'gog' },
    { gameId:'disco-elysium', platformAppId:'gog-1962937292', platform:'gog' },
    { gameId:'frostpunk', platformAppId:'gog-1440162894', platform:'gog' },
  ]);

  await cards.first().click();
  assert.equal(await page.locator('[data-screen="detail-gog"]').count(), 1, 'game card did not open GOG detail');
  assert.deepEqual(
    await page.evaluate(() => ({
      sourcePlatform: window.GogDemoApp.state.sourcePlatform,
      selectedPlatform: window.GogDemoApp.state.selectedPlatform,
      selectedGame: window.GogDemoApp.state.selectedGame,
    })),
    {
      sourcePlatform:'gog',
      selectedPlatform:'gog',
      selectedGame:{ gameId:'the-witcher-3', platformAppId:'gog-1495134320', platform:'gog' },
    },
    'GOG game detail context is incomplete'
  );
  await assertCorePlatformsUnchanged(steamBefore, epicBefore, 'library binding and routing');
  await assertNoCredentialState();
  console.log('PASS libraryFlow');
}

async function browserRuntime() {
  await profileFlow();
  await libraryFlow();
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
  console.log('PASS browserRuntime');
}

const checks = { profile:profileFlow, library:libraryFlow, all:browserRuntime };

try {
  if (!checks[mode]) throw new Error(`Unknown mode: ${mode}`);
  await checks[mode]();
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
} finally {
  await browser.close();
}

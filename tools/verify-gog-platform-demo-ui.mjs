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

const browser = await chromium.launch({ executablePath, headless:true });
const page = await browser.newPage({ viewport:{ width:1920, height:1080 }, deviceScaleFactor:1 });
page.setDefaultTimeout(3000);
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

const expectedScreens = [
  'profile-portrait','gog-login','library-home-portrait','library-home-landscape',
  'gog-library-portrait','gog-library-landscape','search-portrait','search-landscape',
  'detail-portrait','detail-landscape',
];

async function resetDemo() {
  pageErrors.length = 0;
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
  const hits = await page.evaluate(() => {
    const result = [];
    const visit = (value, trail='state') => {
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        const next = `${trail}.${key}`;
        if (/email|password/i.test(key)) result.push(next);
        visit(child, next);
      }
    };
    visit(window.GogDemoApp.state);
    return result;
  });
  assert.deepEqual(hits, [], `credential-like state keys found: ${hits.join(', ')}`);
}

async function selectScreen(screen) {
  await page.click(`[data-page="${screen}"]`);
  await page.waitForSelector(`[data-screen="${screen}"]`);
}

async function selectSimulation(value) {
  await page.selectOption('[data-action="simulation"]', value);
  await page.waitForFunction(expected => window.GogDemoApp.state.simulation === expected, value);
}

async function assertViewport(screen, orientation) {
  const box = await page.locator(`[data-screen="${screen}"]`).boundingBox();
  const expected = orientation === 'portrait' ? { width:402, height:874 } : { width:874, height:402 };
  assert(Math.abs(box.width - expected.width) < 1, `${screen}: width ${box.width} != ${expected.width}`);
  assert(Math.abs(box.height - expected.height) < 1, `${screen}: height ${box.height} != ${expected.height}`);
  assert.equal(await page.locator(`[data-screen="${screen}"][data-orientation="${orientation}"]`).count(), 1);
}

async function profileFlow() {
  await resetDemo();
  const steamBefore = await platformSnapshot('steam');
  const epicBefore = await platformSnapshot('epic');
  await selectScreen('profile-portrait');
  await page.evaluate(() => {
    window.GogDemoApp.state.accountByPlatform.gog = { bindStatus:'unbound', tokenStatus:'none', account:null };
    window.GogDemoApp.render();
  });
  await page.click('[data-action="bind-gog"]');
  assert.equal(await page.locator('[data-screen="gog-login"]').count(), 1);
  const loginText = await page.locator('#demoCanvas').innerText();
  assert(loginText.includes('GOG 官方登录'));
  assert(loginText.includes('不保存邮箱或密码'));
  await assertNoCredentialState();

  await page.click('[data-action="gog-authorize-success"]');
  assert.equal(await page.locator('[data-screen="profile-portrait"]').count(), 1);
  const text = await page.locator('#demoCanvas').innerText();
  for (const value of ['GalaxyRider','GOG ID','gog_20876491','126','438 小时']) assert(text.includes(value), `profile missing ${value}`);
  assert(!text.includes('账号价值'));
  assert(!text.includes('¥6.8k'));

  assert.equal(await page.locator('[data-account-menu]').count(), 0);
  await page.click('[data-action="toggle-account-menu"]');
  assert.equal(await page.locator('[data-account-menu]').count(), 1);
  for (const action of ['refresh-platform','switch-platform','logout-platform']) {
    assert.equal(await page.locator(`[data-account-menu] [data-action="${action}"]`).count(), 1);
  }
  assert.equal(await page.locator('[data-action="open-free-games"]').count(), 0);
  const menuBox = await page.locator('[data-account-menu]').boundingBox();
  const profileBox = await page.locator('[data-screen="profile-portrait"]').boundingBox();
  assert(menuBox.right <= profileBox.right, 'GOG account menu is clipped on the right');
  await page.locator('.profile-page').click({ position:{ x:10, y:500 } });
  assert.equal(await page.locator('[data-account-menu]').count(), 0);

  await page.click('[data-action="toggle-account-menu"]');
  const beforeRefresh = await page.evaluate(() => window.GogDemoApp.state.accountRefreshRequestCount);
  await page.click('[data-action="refresh-platform"]');
  assert.equal(await page.locator('[data-action="toggle-account-menu"]').isDisabled(), true);
  await page.evaluate(() => window.GogDemoApp.refreshCurrentPlatform());
  assert.equal(await page.evaluate(() => window.GogDemoApp.state.accountRefreshRequestCount), beforeRefresh + 1);
  await page.waitForFunction(() => !window.GogDemoApp.state.accountRefreshInFlight);

  await page.click('[data-action="toggle-account-menu"]');
  await page.click('[data-action="switch-platform"]');
  await page.click('[data-action="gog-authorize-failure"]');
  assert((await page.locator('[data-login-error]').innerText()).includes('旧账号'));
  assert.equal(await page.evaluate(() => window.GogDemoApp.state.accountByPlatform.gog.account.username), 'GalaxyRider');
  await page.click('[data-action="gog-authorize-cancel"]');
  assert.equal(await page.locator('[data-screen="profile-portrait"]').count(), 1);

  await page.click('[data-action="toggle-account-menu"]');
  await page.click('[data-action="logout-platform"]');
  assert.equal(await page.locator('[data-logout-confirm]').count(), 1);
  await page.click('[data-action="confirm-logout-gog"]');
  assert.deepEqual(await platformSnapshot('gog'), { bindStatus:'unbound', tokenStatus:'none', account:null });
  await assertCorePlatformsUnchanged(steamBefore, epicBefore, 'profile GOG operations');
  await assertNoCredentialState();

  await page.evaluate(() => {
    window.GogDemoApp.state.accountByPlatform.gog = { bindStatus:'bound', tokenStatus:'valid', account:{ ...window.GogDemoApp.GOG_ACCOUNT } };
    window.GogDemoApp.selectProfilePlatform('epic');
  });
  assert.equal(await page.locator('[data-action="open-free-games"]').count(), 1);
  assert.equal((await page.locator('[data-action="open-free-games"]').innerText()).trim(), '喜加一');
  assert.equal(await page.locator('.profile-primary-actions').count(), 1);
  await page.click('[data-profile-platform="gog"]');
  assert.equal(await page.locator('[data-action="open-free-games"]').count(), 0);
  assert.equal(await page.locator('.profile-primary-actions').count(), 0);
  console.log('PASS profileFlow');
}

async function realLibraryFlow() {
  await resetDemo();
  for (const [screen, orientation] of [['library-home-portrait','portrait'],['library-home-landscape','landscape']]) {
    await selectScreen(screen);
    await assertViewport(screen, orientation);
    const order = await page.locator('[data-library-entry]').evaluateAll(nodes => nodes.map(node => node.dataset.libraryEntry));
    const epic = order.indexOf('epic');
    assert(epic >= 0, `${screen}: EPIC entry missing`);
    assert.deepEqual(order.slice(epic, epic + 3), ['epic','gog','import'], `${screen}: GOG entry order is wrong`);
    assert.equal(await page.locator('[data-annotation-ref="gog-entry"]').count(), 1);
  }

  for (const [screen, orientation] of [['gog-library-portrait','portrait'],['gog-library-landscape','landscape']]) {
    await selectScreen(screen);
    await assertViewport(screen, orientation);
    const root = page.locator(`[data-screen="${screen}"]`);
    const accountTopbar = root.locator('[data-platform-account-topbar]');
    assert.equal(await accountTopbar.count(), 1, `${screen}: platform account topbar missing`);
    assert.equal(await accountTopbar.getByRole('heading', { name:'GOG' }).count(), 1, `${screen}: GOG title missing`);
    assert.equal(await accountTopbar.getByRole('button', { name:'返回' }).count(), 1, `${screen}: back action missing`);
    assert.equal(await accountTopbar.locator('[data-action="switch-gog"]').count(), 1, `${screen}: switch-account action missing`);
    assert.equal(await accountTopbar.locator('[data-action="logout-gog"]').count(), 1, `${screen}: logout action missing`);
    assert.equal(await accountTopbar.locator('[data-action="open-search"]').count(), 0, `${screen}: search must not render in account topbar`);
    for (const tool of ['search','sort','menu']) {
      assert.equal(await root.locator(`.platform-library-title [data-library-tool="${tool}"]`).count(), 1, `${screen}: ${tool} library tool missing`);
    }
    const text = await page.locator('#demoCanvas').innerText();
    assert(!text.includes('账号价值'), `${screen}: account value label must not render`);
    assert(!text.includes('¥6.8k'), `${screen}: fabricated account value must not render`);
    assert.equal(await page.locator('[data-account-metric="account-value"]').count(), 0);
    for (const metric of ['gog-id','game-count','total-playtime']) {
      assert.equal(await page.locator(`[data-account-metric="${metric}"]`).count(), 1, `${screen}: ${metric} missing`);
    }
    assert.equal(await page.locator('[data-game-card][data-platform="gog"]').count(), 6);

    await accountTopbar.locator('[data-action="switch-gog"]').click();
    assert.equal(await page.locator('[data-screen="gog-login"]').count(), 1, `${screen}: switch-account must open GOG authorization`);
    await page.click('[data-action="gog-authorize-cancel"]');
    assert.equal(await page.locator(`[data-screen="${screen}"]`).count(), 1, `${screen}: cancel switch must return to library`);
    await page.locator(`[data-screen="${screen}"] [data-platform-account-topbar] [data-action="logout-gog"]`).click();
    assert.equal(await page.locator(`[data-screen="${screen}"] [data-logout-confirm]`).count(), 1, `${screen}: logout confirmation missing`);
    await page.locator(`[data-screen="${screen}"] [data-action="cancel-logout-gog"]`).click();
    assert.equal(await page.locator('[data-logout-confirm]').count(), 0, `${screen}: logout confirmation did not close`);
  }

  await selectScreen('library-home-portrait');
  await page.evaluate(() => {
    window.GogDemoApp.state.accountByPlatform.gog = { bindStatus:'bound', tokenStatus:'valid', account:{ ...window.GogDemoApp.GOG_ACCOUNT } };
    window.GogDemoApp.render();
  });
  await page.click('[data-library-entry="gog"]');
  assert.equal(await page.locator('[data-screen="gog-library-portrait"]').count(), 1);
  await page.locator('[data-game-card][data-platform="gog"]').first().click();
  assert.equal(await page.locator('[data-screen="detail-portrait"]').count(), 1);
  assert.deepEqual(await page.evaluate(() => ({
    sourcePlatform:window.GogDemoApp.state.sourcePlatform,
    selectedPlatform:window.GogDemoApp.state.selectedPlatform,
  })), { sourcePlatform:'gog', selectedPlatform:'gog' });
  console.log('PASS realLibraryFlow');
}

async function searchRows(screen) {
  return page.locator(`[data-screen="${screen}"] [data-search-result]`).evaluateAll(nodes => nodes.map(node => ({
    gameId:node.dataset.gameId,
    platformAppId:node.dataset.platformAppId,
    platform:node.dataset.platform,
    score:node.querySelector('[data-score]')?.textContent.trim() ?? null,
  })));
}

async function detailSearchFlow() {
  await resetDemo();
  let sharedRows = null;
  for (const orientation of ['portrait','landscape']) {
    await selectScreen(`search-${orientation}`);
    await assertViewport(`search-${orientation}`, orientation);
    const rows = await searchRows(`search-${orientation}`);
    if (!sharedRows) sharedRows = rows;
    else assert.deepEqual(rows, sharedRows, 'search layouts must share one result model');
    assert.equal(rows.filter(row => row.platform === 'epic').length, 2);
    assert.equal(rows.filter(row => row.platform === 'gog').length, 2);
    assert(rows.filter(row => row.platform === 'gog').every(row => row.score === null));
    const sameGameRows = rows.filter(row => row.gameId === 'cyberpunk-2077');
    assert.deepEqual(sameGameRows.map(row => row.platform), ['epic','gog']);
    await page.click('[data-search-result][data-platform="gog"]');
    assert.equal(await page.locator(`[data-screen="detail-${orientation}"]`).count(), 1);
    assert.equal(await page.evaluate(() => window.GogDemoApp.state.sourcePlatform), 'gog');
    assert.equal(await page.evaluate(() => window.GogDemoApp.state.selectedPlatform), 'gog');
    assert((await page.locator('[data-launch-platform]').innerText()).includes('GOG 启动'));
    assert.equal((await page.locator('[data-detail-hours]').innerText()).trim(), '74 小时');
    assert.equal((await page.locator('[data-detail-cloud]').innerText()).trim(), '云存档已同步');
    await page.click('[data-action="open-platform-switch"]');
    assert.equal(await page.locator('[data-platform-switch]').count(), 1);
    await page.click('[data-action="select-detail-platform"][data-platform="epic"]');
    assert.equal(await page.evaluate(() => window.GogDemoApp.state.sourcePlatform), 'gog');
    assert.equal(await page.evaluate(() => window.GogDemoApp.state.selectedPlatform), 'epic');
    assert((await page.locator('[data-launch-platform]').innerText()).includes('EPIC 启动'));
    assert.equal((await page.locator('[data-detail-hours]').innerText()).trim(), '96 小时');
    assert.equal((await page.locator('[data-detail-cloud]').innerText()).trim(), '云存档正常');
    await page.click('[data-launch-platform]');
    assert.deepEqual(await page.evaluate(() => window.GogDemoApp.state.lastLaunchRequest), {
      gameId:'cyberpunk-2077',
      platform:'epic',
      platformAppId:'epic-cyberpunk',
    });
    for (const platform of ['steam','epic','gog']) {
      assert.equal(await page.locator(`[data-obtain-platform="${platform}"]`).count(), 1);
    }
  }
  const mapping = await page.evaluate(() => ({
    same:window.GogDemoApp.matchGameCandidate('赛博朋克 2077','Cyberpunk 2077'),
    ambiguous:window.GogDemoApp.matchGameCandidate('Control','Control Ultimate Edition'),
  }));
  assert.equal(mapping.same.matched, true);
  assert.equal(mapping.same.gameId, 'cyberpunk-2077');
  assert.equal(mapping.ambiguous.matched, false);
  assert.equal(await page.evaluate(() => window.GogDemoApp.convertEpicScore(4.4)), 8.8);
  assert.equal(await page.evaluate(() => window.GogDemoApp.resolveSelectedPlatform({
    sourcePlatform:null,
    ownedPlatforms:window.GogDemoApp.state.ownedPlatforms,
    accountByPlatform:window.GogDemoApp.state.accountByPlatform,
  })), 'steam');

  await selectScreen('search-landscape');
  await page.evaluate(() => {
    window.GogDemoApp.state.accountByPlatform.gog = { bindStatus:'expired', tokenStatus:'expired', account:null };
  });
  await page.click('[data-search-result][data-platform="gog"]');
  const unavailable = await page.locator('[data-source-unavailable]').innerText();
  assert(unavailable.includes('重新登录 GOG'));
  assert(unavailable.includes('手动切换'));
  assert(!(await page.locator('[data-launch-platform]').innerText()).includes('Steam 启动'));
  console.log('PASS detailSearchFlow');
}

async function assertShellDoesNotOverlap(context) {
  const boxes = await page.evaluate(() => {
    const rect = selector => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return box ? { left:box.left, right:box.right, width:box.width } : null;
    };
    return { nav:rect('#leftNav'), stage:rect('.demo-stage'), panel:rect('#annoPanel') };
  });
  assert(boxes.nav.right <= boxes.stage.left + 0.5, `${context}: nav overlaps stage`);
  if (boxes.panel?.width) assert(boxes.stage.right <= boxes.panel.left + 0.5, `${context}: stage overlaps panel`);
}

async function annotationsFlow() {
  await resetDemo();
  assert.equal(await page.locator('.nav-item[data-page]').count(), expectedScreens.length);
  await assertShellDoesNotOverlap('expanded');

  for (const screen of expectedScreens) {
    await selectScreen(screen);
    await page.click('#interactionTab');
    const interactionBadges = await page.locator('[data-annotation-item] .anno-badge').allTextContents();
    assert(interactionBadges.some(value => /^\d+$/.test(value.trim())), `${screen}: numeric annotation missing`);
    assert(interactionBadges.includes('G'), `${screen}: G annotation missing`);
    const first = page.locator('[data-annotation-item]').first();
    const ref = await first.getAttribute('data-ref');
    assert.equal(await page.locator(`[data-annotation-ref="${ref}"]`).count(), 1, `${screen}: target ${ref} missing`);
    await first.click();
    assert.equal(await page.locator(`[data-annotation-ref="${ref}"].annotation-flash`).count(), 1, `${screen}: target did not flash`);
    await page.click('#edgeTab');
    assert((await page.locator('[data-annotation-item] .anno-badge').allTextContents()).includes('E1'), `${screen}: E1 missing`);
    const refs = await page.locator('[data-annotation-item]').evaluateAll(items => items.map(item => item.dataset.ref));
    for (const targetRef of refs) assert.equal(await page.locator(`[data-annotation-ref="${targetRef}"]`).count(), 1, `${screen}: edge target missing`);
  }

  await selectScreen('profile-portrait');
  assert.equal(await page.locator('.annotation-marker').first().isVisible(), false);
  await page.click('#toggleMarkers');
  assert.equal(await page.locator('.annotation-marker').first().isVisible(), true);
  await page.click('#toggleMarkers');
  assert.equal(await page.locator('.annotation-marker').first().isVisible(), false);

  const beforeWidth = (await page.locator('.demo-stage').boundingBox()).width;
  await page.click('#togglePanel');
  assert.equal(await page.locator('#annoPanel').isVisible(), false);
  assert.equal(await page.locator('#panelRestore').isVisible(), true);
  assert((await page.locator('.demo-stage').boundingBox()).width > beforeWidth + 300);
  await page.click('#panelRestore');
  assert.equal(await page.locator('#annoPanel').isVisible(), true);

  await selectScreen('gog-library-landscape');
  const original = await page.evaluate(() => ({ screen:window.GogDemoApp.state.screen, orientation:window.GogDemoApp.state.orientation }));
  const steamBefore = await platformSnapshot('steam');
  const epicBefore = await platformSnapshot('epic');
  for (const simulation of ['loading','empty','error','cancelled','cached']) {
    await selectSimulation(simulation);
    assert.equal(await page.locator(`[data-simulation-state="${simulation}"]`).count(), 1, `${simulation}: state missing`);
    const canvasText = await page.locator('#demoCanvas').innerText();
    assert(!canvasText.includes('账号价值'), `${simulation}: account value leaked`);
    if (simulation === 'loading') {
      assert((await page.locator('.state-skeleton').count()) >= 3);
      await selectSimulation('normal');
    } else if (simulation === 'empty') {
      await page.click('[data-action="simulation-refresh"]');
    } else if (simulation === 'error' || simulation === 'cached') {
      if (simulation === 'cached') assert.equal(await page.locator('[data-cache-timestamp]').count(), 1);
      await page.click('[data-action="simulation-retry"]');
    } else {
      await page.click('[data-action="simulation-return"]');
    }
    await page.waitForFunction(() => window.GogDemoApp.state.simulation === 'normal');
    assert.deepEqual(await page.evaluate(() => ({ screen:window.GogDemoApp.state.screen, orientation:window.GogDemoApp.state.orientation })), original);
    await assertCorePlatformsUnchanged(steamBefore, epicBefore, `${simulation} recovery`);
  }

  await selectSimulation('expired');
  await page.click('[data-action="simulation-reauthorize"]');
  assert.equal(await page.locator('[data-screen="gog-login"]').count(), 1);
  assert.equal(await page.evaluate(() => window.GogDemoApp.state.loginOrigin), original.screen);
  assert.equal(await page.evaluate(() => window.GogDemoApp.state.loginOrientation), original.orientation);
  await assertCorePlatformsUnchanged(steamBefore, epicBefore, 'expired recovery');
  assert.deepEqual(pageErrors, [], `annotation page errors: ${pageErrors.join(' | ')}`);
  console.log('PASS annotationsFlow');
}

async function browserRuntime() {
  await profileFlow();
  await realLibraryFlow();
  await detailSearchFlow();
  await annotationsFlow();
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
  console.log('PASS browserRuntime');
}

const checks = {
  profile:profileFlow,
  library:realLibraryFlow,
  realLibrary:realLibraryFlow,
  detailSearch:detailSearchFlow,
  annotations:annotationsFlow,
  all:browserRuntime,
};

try {
  if (!checks[mode]) throw new Error(`Unknown mode: ${mode}`);
  await checks[mode]();
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
} finally {
  await browser.close();
}

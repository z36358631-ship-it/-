import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '新手首玩按游戏资产分流demo.html');
const sourcePath = path.join(root, 'demos', '新手引导完整链路demo.html');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);

assert(fs.existsSync(sourcePath), '只读基线 Demo 不存在');
assert(fs.existsSync(demoPath), '独立首玩 Demo 尚未创建');
assert(executablePath, 'Local Chrome not found');

const legacySharedKeys = [
  'gamehub_onboarding_source_v2',
  'gamehub_onboarding_handoff_v1',
  'gamehub_install_id',
  'gamehub_existing_personalization_v2',
];
const demoHtml = fs.readFileSync(demoPath, 'utf8');
for (const key of legacySharedKeys) {
  assert.equal(demoHtml.includes(key), false, `独立首玩 Demo 仍包含旧共享键: ${key}`);
}
assert.equal(/&#x(?:1f[0-9a-f]{3}|26a1|2705);/iu.test(demoHtml), false, 'Demo 不得保留 Emoji 数字实体');
assert.equal(/[\u{1F300}-\u{1FAFF}]/u.test(demoHtml), false, 'Demo 不得保留 Emoji 字符');
assert.equal(demoHtml.includes('function makeCover('), false, '不得使用文字 SVG 生成临时游戏封面');
assert.equal(demoHtml.includes('GAMEHUB</text>'), false, '不得在封面中保留 GAMEHUB 文字占位');
assert.equal(demoHtml.includes('free_download'), true, '海外无资产路径必须接入免费下载');

const capture = process.argv.includes('--capture');
const evidenceDir = path.join(os.tmpdir(), 'gamehub-segmented-first-play-review');
if (capture) fs.mkdirSync(evidenceDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 940 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

await page.goto(pathToFileURL(demoPath).href);
assert.equal(await page.title(), '盖世游戏按游戏资产分流首玩 Demo');
assert.equal((await page.locator('.phone').innerText()).includes('模拟失败'), false, '用户页面不得出现“模拟失败”文案');
const legacySentinel = 'legacy-demo-sentinel';
const preservedLegacyValues = await page.evaluate(({ keys, sentinel }) => {
  for (const key of keys) localStorage.setItem(key, sentinel);
  resetAll();
  return Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
}, { keys: legacySharedKeys, sentinel: legacySentinel });
assert.deepEqual(
  preservedLegacyValues,
  Object.fromEntries(legacySharedKeys.map(key => [key, legacySentinel])),
  'resetAll() 不得删除旧 Demo 的共享键数据',
);

await page.evaluate(() => localStorage.clear());
await page.reload();
await page.locator('[data-action="start-new-user"]').click();
await page.locator('[data-onboarding-source-code="friend_referral"]').click();
await page.locator('[data-action="submit-onboarding-source"]').click();
await page.waitForTimeout(450);

assert.equal(await page.locator('#startMethodTitle').innerText(), '你现在有哪种游戏？');
assert.equal(await page.locator('#startMethodDesc').innerText(), '选择最符合你的情况，我们带你直接开始玩');
assert.deepEqual(
  await page.locator('[data-first-play-path]').evaluateAll(nodes => nodes.map(node => node.dataset.firstPlayPath)),
  ['steam', 'local_file', 'no_asset'],
);
assert.equal(await page.locator('[data-action="browse-home"]').innerText(), '先逛逛首页');
assert.equal(await page.locator('[data-start-method]').count(), 0, '旧身份式入口必须移除');
assert.deepEqual(
  await page.locator('[data-first-play-path]').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-pressed'))),
  ['false', 'false', 'false'],
  '三个资产入口必须暴露可访问的未选中状态',
);
assert.equal(
  await page.locator('#pageStartMethod').getAttribute('data-visual-source'),
  'screen-02,screen-04',
  '准备方式页必须登记欢迎与来源选择实机图',
);
assert.equal(
  await page.locator('.start-method-collage').evaluate(node => getComputedStyle(node).backgroundImage.startsWith('url("data:image/')),
  true,
  '游戏拼图 Hero 必须以内嵌来源化媒体离线呈现',
);
assert.equal(
  await page.locator('[data-first-play-path] .opt-icon img').evaluateAll(nodes => nodes.length === 3 && nodes.every(node => node.src.startsWith('data:image/png;base64,'))),
  true,
  '资产入口必须使用三个内嵌真实图标资产',
);
const initialFirstPlayState = await page.evaluate(() => createDefaultOnboardingFlow());
assert.equal(Object.hasOwn(initialFirstPlayState, 'startMethod'), false, '新 Demo 不再保留旧 startMethod 字段');
assert.deepEqual(
  Object.fromEntries(['firstPlayPath', 'firstPlayStage', 'firstPlayGameId', 'firstPlayCompleted', 'updatedAt'].map(key => [key, initialFirstPlayState[key]])),
  { firstPlayPath: null, firstPlayStage: null, firstPlayGameId: null, firstPlayCompleted: false, updatedAt: null },
);
assert.deepEqual(
  await page.evaluate(() => ({
    title: FIRST_PLAY_COPY.overseas.title,
    noAsset: FIRST_PLAY_COPY.overseas.options.no_asset[0],
    browse: FIRST_PLAY_COPY.overseas.browse,
  })),
  {
    title: 'Which games do you already have?',
    noAsset: "I don't have a game yet",
    browse: 'Browse Home first',
  },
  '海外资产入口文案必须明确免费下载路径',
);
assert.deepEqual(
  await page.evaluate(() => ({
    domestic: resolveFirstPlayPath('no_asset', 'domestic'),
    overseas: resolveFirstPlayPath('no_asset', 'overseas'),
  })),
  { domestic: 'instant_play', overseas: 'free_download' },
  'no_asset 必须按市场路由，海外不得复用秒玩',
);
assert.equal(
  await page.evaluate(() => games.length >= 6 && games.every(game => /^data:image\/jpeg;base64,/.test(game.cover))),
  true,
  '游戏列表必须使用真实离线 JPEG 封面',
);

const phone = page.locator('.phone');
async function capturePhone(name) {
  if (!capture) return;
  await page.waitForTimeout(450);
  await phone.screenshot({ path: path.join(evidenceDir, name) });
}

const portraitGeometry = await phone.evaluate(node => {
  const rect = node.getBoundingClientRect();
  return { width: rect.width, height: rect.height, orientation: node.dataset.orientation };
});
assert.equal(portraitGeometry.orientation, 'portrait');
assert.equal(portraitGeometry.width, 390);
assert.equal(portraitGeometry.height, 844);
await capturePhone('asset-entry-portrait.png');

assert.equal(await page.locator('[data-set-orientation="landscape"]').count(), 1, '缺少横屏预览控制');
await page.locator('[data-set-orientation="landscape"]').click();
await page.waitForTimeout(100);
const landscapeGeometry = await page.evaluate(() => {
  const shell = document.querySelector('.phone');
  const shellRect = shell.getBoundingClientRect();
  const cards = [...document.querySelectorAll('[data-first-play-path]')].map(node => {
    const rect = node.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
  });
  const browseRect = document.querySelector('[data-action="browse-home"]').getBoundingClientRect();
  const columns = getComputedStyle(document.querySelector('.first-play-options')).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
  return {
    shell: { left: shellRect.left, top: shellRect.top, right: shellRect.right, bottom: shellRect.bottom, width: shellRect.width, height: shellRect.height },
    orientation: shell.dataset.orientation,
    cards,
    browse: { left: browseRect.left, top: browseRect.top, right: browseRect.right, bottom: browseRect.bottom, width: browseRect.width, height: browseRect.height },
    columnCount: columns.length,
  };
});
assert.equal(landscapeGeometry.orientation, 'landscape');
assert.equal(landscapeGeometry.shell.width, 932);
assert.equal(landscapeGeometry.shell.height, 430);
assert.equal(landscapeGeometry.columnCount, 3, '横屏首屏必须使用三列入口布局');
for (const [index, rect] of landscapeGeometry.cards.entries()) {
  assert(rect.left >= landscapeGeometry.shell.left && rect.right <= landscapeGeometry.shell.right, `横屏卡片 ${index + 1} 水平越界`);
  assert(rect.top >= landscapeGeometry.shell.top && rect.bottom <= landscapeGeometry.shell.bottom, `横屏卡片 ${index + 1} 垂直越界`);
  assert(rect.width >= 150 && rect.height >= 190, `横屏卡片 ${index + 1} 不可见或面积不足`);
}
assert(landscapeGeometry.browse.top >= landscapeGeometry.shell.top && landscapeGeometry.browse.bottom <= landscapeGeometry.shell.bottom, '横屏弱入口垂直越界');
assert(landscapeGeometry.browse.width > 0 && landscapeGeometry.browse.height > 0, '横屏弱入口不可见');
await capturePhone('asset-entry-landscape.png');

async function resetJourney(orientation = 'portrait', market = 'domestic') {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  if (market === 'overseas') await page.locator('#regionBtn').click();
  if (orientation === 'landscape') await page.locator('[data-set-orientation="landscape"]').click();
  await page.locator('[data-action="start-new-user"]').click();
  await page.locator('[data-onboarding-source-code="friend_referral"]').click();
  await page.locator('[data-action="submit-onboarding-source"]').click();
  await page.waitForTimeout(450);
}

async function eventSnapshot() {
  return page.evaluate(() => window.demoEvents.map(event => ({ ...event })));
}

async function savedFirstPlay() {
  return page.evaluate(() => JSON.parse(localStorage.getItem('gamehub_first_play_onboarding_v1')));
}

const canonicalStages = new Set(['login', 'library', 'scan', 'file_select', 'import', 'game_select', 'download', 'install', 'launch']);
const canonicalResults = new Set(['success', 'failure', 'cancel']);

function assertStageResults(events, pathName, expectedStages) {
  const allStageEvents = events.filter(event => event.name === 'first_play_stage_result');
  for (const event of allStageEvents) {
    assert.equal(canonicalStages.has(event.stage), true, `出现非 canonical 阶段: ${event.stage}`);
    assert.equal(canonicalResults.has(event.result), true, `出现非法 result: ${event.result}`);
    assert.equal(typeof event.market, 'string', `${event.path}/${event.stage} 缺少 market`);
    assert.equal(typeof event.path, 'string', `${event.path}/${event.stage} 缺少 path`);
    assert.equal(Object.hasOwn(event, 'failure_reason'), true, `${event.path}/${event.stage} 缺少 failure_reason`);
    assert.equal(Object.hasOwn(event, 'game_id'), true, `${event.path}/${event.stage} 缺少 game_id`);
    if (event.result === 'success') assert.equal(event.failure_reason, null, `${event.path}/${event.stage} success 的 failure_reason 必须为 null`);
  }
  const stageEvents = allStageEvents.filter(event => event.result === 'success' && event.path === pathName);
  assert.deepEqual(stageEvents.map(event => event.stage), expectedStages, `${pathName} canonical 成功阶段顺序不正确`);
  const keys = allStageEvents.map(event => `${event.path}|${event.stage}|${event.result}|${event.failure_reason ?? ''}|${event.game_id ?? ''}`);
  assert.equal(new Set(keys).size, keys.length, 'stage_result 必须按完整合同幂等');
  assert.equal(stageEvents.some(event => ['permission_pending', 'scanning', 'downloading'].includes(event.stage)), false, '细粒度 UI 状态不得上报 success stage_result');
}

function assertLaunchSession(events, pathName) {
  const requests = events.filter(event => event.name === 'game_launch_request' && event.path === pathName);
  const ready = events.filter(event => event.name === 'playable_ready' && event.path === pathName);
  assert.equal(requests.length, 1, `${pathName} 必须且只能创建一个启动请求`);
  assert.equal(ready.length, 1, `${pathName} 必须且只能完成一个 playable_ready`);
  assert.equal(typeof requests[0].launch_session_id, 'string');
  assert(requests[0].launch_session_id.length > 8, `${pathName} launch_session_id 不可为空`);
  assert.equal(ready[0].launch_session_id, requests[0].launch_session_id, `${pathName} 请求和可玩事件必须属于同一启动会话`);
  assert.equal(typeof requests[0].launch_source, 'string');
  assert.equal(typeof ready[0].launch_source, 'string');
  assert.equal(typeof requests[0].market, 'string');
  assert.equal(typeof ready[0].market, 'string');
  assert.equal(typeof requests[0].elapsed_ms, 'number');
  assert.equal(typeof ready[0].elapsed_ms, 'number');
  assert(ready[0].elapsed_ms >= requests[0].elapsed_ms);
}

function assertFailureResult(events, pathName, stage, reason) {
  const event = events.find(item => item.name === 'first_play_stage_result' && item.result === 'failure' && item.path === pathName && item.stage === stage && item.failure_reason === reason);
  assert(event, `${pathName}/${stage} 缺少失败阶段事件`);
  assert.equal(typeof event.market, 'string');
  assert.equal(Object.hasOwn(event, 'game_id'), true);
  assert.equal(typeof event.updatedAt, 'string');
}

async function assertInsidePhone(selector, label) {
  const geometry = await page.locator(selector).evaluate((node, shell) => {
    const rect = node.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    return {
      visible: rect.width > 0 && rect.height > 0,
      inside: rect.left >= shellRect.left && rect.right <= shellRect.right && rect.top >= shellRect.top && rect.bottom <= shellRect.bottom,
    };
  }, await phone.elementHandle());
  assert.equal(geometry.visible, true, `${label} 不可见`);
  assert.equal(geometry.inside, true, `${label} 超出 Shell`);
}

const eventSnapshots = {};

// Steam：Sheet -> 内容库 -> 启动请求 -> 可玩场景
await resetJourney();
await page.locator('[data-first-play-path="steam"]').click();
assert.equal(await page.locator('#pageSteamLogin.active').count(), 1);
assert.equal(await page.locator('#steamLoginSheet[role="dialog"]').count(), 1);
assert.equal(await page.locator('#steamLoginSheet [data-steam-asset]').evaluateAll(nodes => nodes.length === 2 && nodes.every(node => node.src.startsWith('data:image/svg+xml;base64,'))), true);
assert.equal(await page.locator('#steamLoginSheet [data-action="simulate-steam-failure"]').count(), 0, '用户 Sheet 不得出现模拟失败');
await capturePhone('steam-sheet-portrait.png');
await page.locator('#steamUsername').fill('gamehub_player');
await page.locator('#steamPassword').fill('demo-password');
await page.locator('[data-action="steam-bind-success"]').click();
assert.equal(await page.locator('#pageSteamLibrary.active').count(), 1);
assert.equal(await page.locator('.steam-account-summary').count(), 1);
assert.equal(await page.locator('.steam-level-badge').count(), 1, 'Steam 资料缺少等级徽章');
assert((await page.locator('.steam-id').innerText()).includes('Steam ID'));
assert.equal(await page.locator('[data-action="steam-switch-account"][aria-label="切换 Steam 账号"]').count(), 1);
assert((await page.locator('[data-steam-game]').count()) >= 4);
assert.equal(await page.locator('[data-steam-game] [data-action="steam-launch"]').count(), 0, 'Steam 卡内不得新增启动按钮');
assert.equal((await savedFirstPlay()).firstPlayStage, 'content_ready');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);
const steamInitialOrder = await page.locator('[data-steam-game]').evaluateAll(nodes => nodes.map(node => node.dataset.gameId));
await page.locator('#steamLibrarySearch').fill('艾尔登');
assert.deepEqual(await page.locator('[data-steam-game]').evaluateAll(nodes => nodes.map(node => node.dataset.gameId)), ['game_2']);
await page.locator('#steamLibrarySearch').fill('不存在的游戏');
assert.equal(await page.locator('#steamLibraryEmpty:not([hidden])').count(), 1, 'Steam 搜索无结果必须展示空态');
await page.locator('#steamLibrarySearch').fill('');
await page.locator('[data-action="steam-sort"]').click();
const steamSortedOrder = await page.locator('[data-steam-game]').evaluateAll(nodes => nodes.map(node => node.dataset.gameId));
assert.notDeepEqual(steamSortedOrder, steamInitialOrder, 'Steam 排序必须实际改变卡片顺序');
assert((await page.locator('[data-action="steam-sort"]').getAttribute('aria-label')).includes('游戏名称'));
assert.equal(await page.locator('[data-action="steam-sort"]').getAttribute('aria-pressed'), 'true');
const steamBeforeFilter = await page.locator('[data-steam-game]').count();
await page.locator('[data-action="steam-filter"]').click();
assert.equal(await page.locator('[data-action="steam-filter"]').getAttribute('aria-pressed'), 'true');
assert((await page.locator('[data-steam-game]').count()) < steamBeforeFilter, 'Steam 筛选必须改变结果集');
await page.locator('[data-action="steam-filter"]').click();
assert.equal(await page.locator('[data-action="steam-filter"]').getAttribute('aria-pressed'), 'false');
const steamControlEvents = await eventSnapshot();
for (const eventName of ['steam_library_search', 'steam_library_sort_change', 'steam_library_filter_change']) {
  assert.equal(steamControlEvents.some(event => event.name === eventName), true, `Steam 控件缺少 ${eventName} 事件`);
}
await capturePhone('steam-library-portrait.png');
await page.locator('[data-steam-game]').first().click();
assert.equal(await page.locator('#pageGameLaunch.active').count(), 1);
assert.equal((await savedFirstPlay()).firstPlayStage, 'launch_requested');
const steamLaunchSessionId = (await savedFirstPlay()).launchSessionId;
assert.equal(typeof steamLaunchSessionId, 'string');
assert.equal((await eventSnapshot()).filter(event => event.name === 'game_launch_request' && event.path === 'steam').length, 1);
await page.evaluate(() => requestGameLaunch('steam', onboardingFlow.firstPlayGameId));
assert.equal((await savedFirstPlay()).launchSessionId, steamLaunchSessionId, '同一待启动动作不得创建新 session');
assert.equal((await eventSnapshot()).filter(event => event.name === 'game_launch_request' && event.path === 'steam').length, 1);
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false, '点击 Steam 游戏不得提前记可玩');
await page.locator('[data-action="enter-playable-scene"]').click();
assert.equal(await page.locator('#pagePlayableScene.active [data-playable-input]').count(), 1);
eventSnapshots.steam = await eventSnapshot();
assert.equal(eventSnapshots.steam.filter(event => event.name === 'playable_ready' && event.path === 'steam').length, 1);
await page.evaluate(() => markPlayable('steam', onboardingFlow.firstPlayGameId));
assert.equal((await eventSnapshot()).filter(event => event.name === 'playable_ready' && event.path === 'steam').length, 1, 'Steam playable_ready 必须幂等');
eventSnapshots.steam = await eventSnapshot();
assertStageResults(eventSnapshots.steam, 'steam', ['login', 'library', 'game_select', 'launch']);
assertLaunchSession(eventSnapshots.steam, 'steam');

// 本地文件：添加游戏弹窗 -> 扫描结果 -> 选文件 -> 导入库 -> 启动 -> 可玩
await resetJourney();
await page.locator('[data-first-play-path="local_file"]').click();
assert.equal(await page.locator('#pagePcLibrary.active').count(), 1);
assert.equal(await page.locator('#addGameDialog:not([hidden])').count(), 1);
assert.deepEqual(await page.locator('#addGameDialog [data-import-source]').evaluateAll(nodes => nodes.map(node => node.dataset.importSource)), ['local', 'steam']);
await capturePhone('local-add-dialog-portrait.png');
await page.locator('[data-import-source="local"]').click();
assert.equal(await page.locator('#pageLocalScan.active').count(), 1);
assert.equal((await savedFirstPlay()).firstPlayStage, 'permission_pending');
await page.locator('[data-action="grant-scan-permission"]').click();
await page.waitForSelector('#localScanResult:not([hidden])');
assert.equal((await savedFirstPlay()).firstPlayStage, 'scan_result');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);
assert((await page.locator('#localScanResult').innerText()).includes('.exe'));
await page.locator('[data-action="select-scanned-exe"]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'file_selected');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);
await page.locator('[data-action="import-selected-game"]').click();
assert.equal(await page.locator('#pagePcLibrary.active').count(), 1);
assert.equal(await page.locator('#addGameDialog').isHidden(), true);
assert.equal(await page.locator('[data-local-game]').count(), 1);
assert.equal((await savedFirstPlay()).firstPlayStage, 'content_ready');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false, '完成导入不得提前记可玩');
await capturePhone('local-library-portrait.png');
await page.locator('[data-local-game]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'launch_requested');
assert.equal((await eventSnapshot()).filter(event => event.name === 'game_launch_request' && event.path === 'local_file').length, 1);
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);
await page.locator('[data-action="enter-playable-scene"]').click();
eventSnapshots.local_file = await eventSnapshot();
assert.equal(eventSnapshots.local_file.filter(event => event.name === 'playable_ready' && event.path === 'local_file').length, 1);
assertStageResults(eventSnapshots.local_file, 'local_file', ['scan', 'file_select', 'import', 'library', 'game_select', 'launch']);
assertLaunchSession(eventSnapshots.local_file, 'local_file');

// 手动选择只是文件选择阶段，不等于导入成功
await resetJourney();
await page.locator('[data-first-play-path="local_file"]').click();
await page.locator('[data-import-source="local"]').click();
await page.locator('[data-action="open-manual-file-picker"]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'file_picker');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);

// 本地异常：不支持的文件可重新选择，也可返回换路
await page.locator('[data-demo-error="file_unsupported"]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'file_unsupported');
assert((await page.locator('#localImportError').innerText()).includes('.exe'));
assert.equal(await page.locator('#localImportError [data-action="retry-local-error"]').innerText(), '重新选择');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);
assertFailureResult(await eventSnapshot(), 'local_file', 'file_select', 'file_unsupported');
await page.locator('#localImportError').scrollIntoViewIfNeeded();
await assertInsidePhone('#localImportError', '不支持文件错误态');
await capturePhone('local-file-unsupported-portrait.png');
await page.locator('#localImportError [data-action="retry-local-error"]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'file_picker');
assert.equal(await page.locator('#manualFilePicker:not([hidden])').count(), 1);
await page.locator('[data-demo-error="file_unsupported"]').click();
await page.locator('#localImportError [data-action="return-to-paths"]').click();
assert.equal(await page.locator('#pageStartMethod.active').count(), 1);

// 本地异常：导入失败可重试导入，恢复后仍不能提前记成功
await resetJourney();
await page.locator('[data-first-play-path="local_file"]').click();
await page.locator('[data-import-source="local"]').click();
await page.locator('[data-action="grant-scan-permission"]').click();
await page.waitForSelector('#localScanResult:not([hidden])');
await page.locator('[data-action="select-scanned-exe"]').click();
await page.locator('[data-demo-error="import_failed"]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'import_failed');
assert.equal(await page.locator('#localImportError [data-action="retry-local-error"]').innerText(), '重试导入');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);
assertFailureResult(await eventSnapshot(), 'local_file', 'import', 'import_failed');
await page.locator('#localImportError').scrollIntoViewIfNeeded();
await assertInsidePhone('#localImportError', '导入失败错误态');
await capturePhone('local-import-failed-portrait.png');
await page.locator('#localImportError [data-action="retry-local-error"]').click();
assert.equal(await page.locator('#pagePcLibrary.active').count(), 1);
assert.equal((await savedFirstPlay()).firstPlayStage, 'content_ready');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);

// 国内秒玩：完整频道 -> 查看更多 -> 启动请求 -> 可玩
await resetJourney();
await page.locator('[data-first-play-path="no_asset"]').click();
assert.equal(await page.locator('#pageInstantPlay.active').count(), 1);
for (const selector of ['.instant-search', '.instant-channel-tabs', '.instant-time-card', '.instant-hot', '.instant-rooms', '.instant-all', '.instant-bottom-nav']) {
  assert.equal(await page.locator(selector).count(), 1, `秒玩频道缺少 ${selector}`);
}
assert((await page.locator('.instant-time-card').innerText()).includes('15 分钟'));
await capturePhone('instant-channel-portrait.png');
const beforeMore = await page.locator('[data-instant-list-game]').count();
await page.locator('[data-action="instant-more"]').click();
assert((await page.locator('[data-instant-list-game]').count()) > beforeMore);
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false, '查看更多不得记完成');
await page.locator('[data-instant-game]').first().click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'launch_requested');
assert.equal((await eventSnapshot()).filter(event => event.name === 'game_launch_request' && event.path === 'instant_play').length, 1);
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false, '点击秒玩不得提前记可玩');
await page.locator('[data-action="enter-playable-scene"]').click();
eventSnapshots.instant_play = await eventSnapshot();
assert.equal(eventSnapshots.instant_play.filter(event => event.name === 'playable_ready' && event.path === 'instant_play').length, 1);
assertStageResults(eventSnapshots.instant_play, 'instant_play', ['library', 'game_select', 'launch']);
assertLaunchSession(eventSnapshots.instant_play, 'instant_play');

// 海外下载竞态：旧任务切路后必须失效，不能覆盖 Steam 状态或上报下载成功
await resetJourney('portrait', 'overseas');
await page.locator('[data-first-play-path="no_asset"]').click();
await page.locator('[data-free-download-game]').first().click();
await page.locator('[data-action="start-free-download"]').click();
const staleDownloadSessionId = (await savedFirstPlay()).downloadSessionId;
assert.equal(typeof staleDownloadSessionId, 'string');
await page.locator('.free-download-secondary[data-action="return-to-paths"]').click();
await page.locator('[data-first-play-path="steam"]').click();
await page.waitForTimeout(420);
const afterStaleDownload = await savedFirstPlay();
assert.equal(afterStaleDownload.firstPlayPath, 'steam');
assert.equal(afterStaleDownload.firstPlayStage, 'selected');
assert.equal(afterStaleDownload.firstPlayGameId, null);
assert.equal(afterStaleDownload.downloadSessionId, null);
const staleEvents = await eventSnapshot();
assert.equal(staleEvents.some(event => event.name === 'first_play_stage_result' && event.stage === 'download' && event.result === 'success'), false, '失效下载不得上报 download success');
assert.equal(staleEvents.some(event => event.name === 'first_play_stage_result' && event.path === 'steam' && ['download', 'install'].includes(event.stage)), false, '旧任务不得污染 Steam 事件');

// 海外无资产：独立免费游戏下载，不得映射国内秒玩
await resetJourney('portrait', 'overseas');
assert.equal(await page.locator('[data-first-play-path="no_asset"] .opt-title').innerText(), "I don't have a game yet");
assert((await page.locator('[data-first-play-path="no_asset"] .opt-desc').innerText()).includes('download'));
await page.locator('[data-first-play-path="no_asset"]').click();
assert.equal(await page.locator('#pageFreeDownload.active').count(), 1);
assert.equal((await savedFirstPlay()).firstPlayPath, 'free_download');
assert.equal((await savedFirstPlay()).market, 'overseas');
const freeDownloadText = await page.locator('#pageFreeDownload').innerText();
assert.equal(/秒玩|云游戏|15\s*分钟|充值|instant\s*play|cloud\s*gaming/i.test(freeDownloadText), false, '海外免费页不得出现国内秒玩或计费语义');
assert((await page.locator('[data-free-download-game]').count()) >= 2);
assert.equal(
  await page.locator('[data-free-download-game]').evaluateAll(nodes => nodes.every(node => Number(node.dataset.downloadSizeGb) > 0 && Number(node.dataset.estimatedSeconds) > 0)),
  true,
  '免费游戏卡必须包含下载大小与估算耗时',
);
assert.equal(await page.locator('#pageFreeDownload [data-speed-mbps="20"]').count(), 1, '免费页必须说明当前演示网速');
await capturePhone('free-download-portrait.png');
await page.locator('[data-free-download-game]').first().click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'download_selected');
assert.equal(await page.locator('[data-action="start-free-download"]').isDisabled(), false);
await page.locator('[data-action="start-free-download"]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'downloading');
assert.equal(typeof (await savedFirstPlay()).downloadSessionId, 'string');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false, '开始下载不得提前成功');
await page.waitForFunction(() => onboardingFlow.firstPlayStage === 'installed');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false, '下载完成不得提前成功');
await page.locator('[data-action="launch-downloaded-game"]').click();
assert.equal(await page.locator('#pageGameLaunch.active').count(), 1, '下载后启动必须先进入独立加载页');
assert((await page.locator('#launchGameTitle').innerText()).startsWith('Preparing'));
assert.equal(await page.locator('[data-action="enter-playable-scene"]').innerText(), 'Enter game');
assert.equal((await savedFirstPlay()).firstPlayStage, 'launch_requested');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false, '点击启动不得提前成功');
await page.locator('[data-action="enter-playable-scene"]').click();
assert.equal(await page.locator('#playableTitle').innerText(), 'Game ready');
eventSnapshots.free_download = await eventSnapshot();
assert.equal(eventSnapshots.free_download.filter(event => event.name === 'playable_ready' && event.path === 'free_download').length, 1);
assertStageResults(eventSnapshots.free_download, 'free_download', ['library', 'game_select', 'download', 'install', 'launch']);
assertLaunchSession(eventSnapshots.free_download, 'free_download');

// 失败状态由外部控制面板触发，用户可回到资产分流换路
await resetJourney();
await page.locator('[data-first-play-path="steam"]').click();
await page.locator('[data-demo-error="steam_login_failed"]').click();
assert.equal(await page.locator('#steamLoginError:not([hidden])').count(), 1);
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);
assertFailureResult(await eventSnapshot(), 'steam', 'login', 'steam_login_failed');
await page.locator('#steamLoginError [data-action="return-to-paths"]').click();
assert.equal(await page.locator('#pageStartMethod.active').count(), 1);

// 横屏关键页几何与截图
await resetJourney('landscape');
await page.locator('[data-first-play-path="steam"]').click();
await assertInsidePhone('#steamLoginSheet', '横屏 Steam Sheet');
await assertInsidePhone('[data-action="steam-bind-success"]', '横屏 Steam 绑定按钮');
await capturePhone('steam-sheet-landscape.png');
await page.locator('#steamUsername').fill('gamehub_player');
await page.locator('#steamPassword').fill('demo-password');
await page.locator('[data-action="steam-bind-success"]').click();
await assertInsidePhone('.steam-library-toolbar', '横屏 Steam 库工具栏');
await assertInsidePhone('[data-steam-game]:first-child', '横屏 Steam 游戏卡');
await capturePhone('steam-library-landscape.png');

await resetJourney('landscape');
await page.locator('[data-first-play-path="local_file"]').click();
await assertInsidePhone('#addGameDialog', '横屏添加游戏弹窗');
await capturePhone('local-add-dialog-landscape.png');
await page.locator('[data-import-source="local"]').click();
await page.locator('[data-action="grant-scan-permission"]').click();
await page.waitForSelector('#localScanResult:not([hidden])');
await page.locator('[data-action="select-scanned-exe"]').click();
await page.locator('[data-action="import-selected-game"]').click();
await assertInsidePhone('[data-local-game]', '横屏本地游戏卡');
await capturePhone('local-library-landscape.png');

await resetJourney('landscape');
await page.locator('[data-first-play-path="no_asset"]').click();
await assertInsidePhone('.instant-time-card', '横屏秒玩时长卡');
await assertInsidePhone('#instantHotGrid [data-instant-game]:first-child', '横屏热门秒玩卡');
await capturePhone('instant-channel-landscape.png');

await resetJourney('landscape', 'overseas');
await page.locator('[data-first-play-path="no_asset"]').click();
await assertInsidePhone('.free-download-header', '横屏海外免费页头部');
await assertInsidePhone('[data-free-download-game]:first-child', '横屏海外免费游戏卡');
await capturePhone('free-download-landscape.png');
assert.deepEqual(pageErrors, []);

await browser.close();
console.log('PASS segmented first-play onboarding smoke');
console.log(`Geometry: portrait ${portraitGeometry.width}x${portraitGeometry.height}; landscape ${landscapeGeometry.shell.width}x${landscapeGeometry.shell.height}; cards ${landscapeGeometry.cards.map(rect => `${Math.round(rect.width)}x${Math.round(rect.height)}`).join(', ')}`);
if (capture) console.log(`Evidence: ${evidenceDir}`);

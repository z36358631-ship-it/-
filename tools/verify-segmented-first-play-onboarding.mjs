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
assert.equal(/\b(?:TBD|TODO)\b/i.test(demoHtml), false, '目标 Demo 不得保留 TBD/TODO');
assert.equal(/我是新手|有游戏想玩|选择身份/.test(demoHtml), false, '目标 Demo 不得保留旧身份式引导文案');
assert.equal(demoHtml.includes('function makeCover('), false, '不得使用文字 SVG 生成临时游戏封面');
assert.equal(demoHtml.includes('GAMEHUB</text>'), false, '不得在封面中保留 GAMEHUB 文字占位');
assert.equal(demoHtml.includes('free_download'), true, '海外无资产路径必须接入免费下载');
assert.equal(demoHtml.includes("FIRST_PLAY_EXPERIMENT_ID='segmented_first_play_asset_v1'"), true, '缺少稳定实验 ID');
assert.equal(demoHtml.includes('Counter-Strike 2'), true, '海外免费游戏缺少 Counter-Strike 2');
assert.equal(demoHtml.includes('Dota 2'), true, '海外免费游戏缺少 Dota 2');
assert.equal((demoHtml.match(/assetSource:'external-official'/g) || []).length, 2, '两款海外免费游戏必须登记官方外部资产来源');
assert.equal(/\.agents[\\/].*home-.*\.webp/i.test(demoHtml), false, '首页媒体不得依赖仓库相对路径');
const staticMediaSources = [...demoHtml.matchAll(/<(?:img|source|video|audio)\b[^>]*\bsrc="([^"]+)"/gi)]
  .map(match => match[1])
  .filter(source => !source.includes("'+"));
assert.equal(staticMediaSources.every(source => source.startsWith('data:')), true, '静态页面媒体只允许 data URI');

const capture = process.argv.includes('--capture');
const simulateFailureAfterGoto = process.argv.includes('--simulate-failure-after-goto');
const evidenceDir = path.join(root, 'test-results', 'segmented-first-play-onboarding');
const primaryEvidenceNames = [
  '01-start-method-domestic-portrait.png',
  '02-steam-library-portrait.png',
  '03-local-import-portrait.png',
  '04-instant-play-portrait.png',
  '05-home-continue-portrait.png',
  '06-start-method-domestic-landscape.png',
  '07-home-continue-landscape.png',
  '08-free-download-overseas-landscape.png',
];
const primaryEvidenceSet = new Set(primaryEvidenceNames);
if (capture) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  for (const name of fs.readdirSync(evidenceDir)) {
    const candidate = path.join(evidenceDir, name);
    if (path.extname(name).toLowerCase() === '.png' && fs.statSync(candidate).isFile()) fs.rmSync(candidate);
  }
}

let browser = null;
let isolatedDir = null;
try {
browser = await chromium.launch({ executablePath, headless: true });

// 真单文件离线：拷贝到无仓库资产的隔离目录后，首页媒体仍须完整加载且不得产生额外请求
isolatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamehub-first-play-isolated-'));
const isolatedDemoPath = path.join(isolatedDir, 'demo.html');
fs.copyFileSync(demoPath, isolatedDemoPath);
const isolatedPage = await browser.newPage({ viewport: { width: 1180, height: 940 } });
const isolatedUrl = pathToFileURL(isolatedDemoPath).href;
const isolatedRequests = [];
isolatedPage.on('request', request => isolatedRequests.push(request.url()));
await isolatedPage.goto(isolatedUrl);
await isolatedPage.evaluate(() => { switchPage('pageHome'); renderHomeFeed('isolated'); });
await isolatedPage.waitForTimeout(350);
const isolatedMedia = await isolatedPage.locator('#pageHome img').evaluateAll(nodes => nodes.map(node => ({
  src: node.getAttribute('src') || '',
  naturalWidth: node.naturalWidth,
  naturalHeight: node.naturalHeight,
})));
const isolatedPageMedia = await isolatedPage.locator('img[src],source[src],video[src],audio[src]').evaluateAll(nodes => nodes.map(node => node.getAttribute('src') || ''));
await isolatedPage.close();
assert.equal(isolatedMedia.length, 12, '首页必须保留 12 张来源化媒体');
assert.equal(isolatedMedia.every(item => item.src.startsWith('data:image/webp;base64,') && item.naturalWidth > 0 && item.naturalHeight > 0), true, '隔离目录中的首页 12 张图片必须由内嵌 WebP 成功解码');
assert.deepEqual(isolatedRequests, [isolatedUrl], '真单文件打开不得请求网络或额外文件');
assert.equal(isolatedPageMedia.every(source => source.startsWith('data:')), true, '运行时所有已声明媒体只允许 data URI');

const page = await browser.newPage({ viewport: { width: 1180, height: 940 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

await page.goto(pathToFileURL(demoPath).href);
if (simulateFailureAfterGoto) throw new Error('SIMULATED_FAILURE_AFTER_GOTO');
assert.equal(await page.title(), '盖世游戏按游戏资产分流首玩 Demo');
assert.equal((await page.locator('.phone').innerText()).includes('模拟失败'), false, '用户页面不得出现“模拟失败”文案');
assert.equal(await page.locator('.phone [data-demo-error]').count(), 0, '受控异常触发器只能位于外部预览面板');
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

const initialStartMethodViews = (await page.evaluate(() => window.demoEvents)).filter(event => event.name === 'onboarding_start_method_view');
assert.equal(initialStartMethodViews.length, 1, '资产分流页一次真实曝光只能上报一次 view');
assert.deepEqual(
  Object.fromEntries(['market', 'orientation', 'entry', 'experiment_id'].map(key => [key, initialStartMethodViews[0][key]])),
  { market: 'domestic', orientation: 'portrait', entry: 'new_user_onboarding', experiment_id: 'segmented_first_play_asset_v1' },
  '资产分流曝光合同不完整',
);
assert.equal(typeof initialStartMethodViews[0].first_play_session_id, 'string');
await page.evaluate(() => { renderFirstPlayOptions(); switchPage('pageStartMethod'); switchPage('pageStartMethod'); });
assert.equal((await page.evaluate(() => window.demoEvents)).filter(event => event.name === 'onboarding_start_method_view').length, 1, '重复渲染同一资产分流曝光必须幂等');
await assertPageIsolation('pageStartMethod');

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
assert.equal(typeof initialFirstPlayState.firstPlaySessionId, 'string', '默认状态缺少持久首玩会话 ID');
assert.equal(initialFirstPlayState.firstPlayStartedAt, null, '未选择路径前不得开始首玩计时');
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
assert.equal(
  await page.evaluate(() => /秒玩|云游戏|充值|15\s*分钟|15\s*min|instant\s*play|cloud\s*gaming/i.test(JSON.stringify(FIRST_PLAY_COPY.overseas))),
  false,
  '海外运行时文案容器不得包含国内秒玩、计费或15分钟语义',
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
const evidenceComponentSelectors = {
  '01-start-method-domestic-portrait.png': ['.first-play-options'],
  '02-steam-library-portrait.png': ['.steam-account-summary', '.steam-library-toolbar'],
  '03-local-import-portrait.png': ['#addGameDialog .add-game-dialog'],
  '04-instant-play-portrait.png': ['.instant-time-card', '.instant-hot'],
  '05-home-continue-portrait.png': ['.home-daily-hero', '[data-action="home-continue"]'],
  '06-start-method-domestic-landscape.png': ['.start-method-body'],
  '07-home-continue-landscape.png': ['.home-landscape-heroes', '[data-action="home-continue"]'],
  '08-free-download-overseas-landscape.png': ['.free-download-page'],
};
const domGeometrySnapshots = {};
async function capturePhone(name) {
  if (!capture || !primaryEvidenceSet.has(name)) return;
  await page.waitForTimeout(450);
  domGeometrySnapshots[name] = await page.evaluate(selectors => {
    const shell = document.querySelector('.phone');
    const shellRect = shell.getBoundingClientRect();
    const toRelativeRect = node => {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.left - shellRect.left,
        y: rect.top - shellRect.top,
        width: rect.width,
        height: rect.height,
        right: rect.right - shellRect.left,
        bottom: rect.bottom - shellRect.top,
      };
    };
    const selectorRects = selectors.map(selector => {
      const node = document.querySelector(selector);
      if (!node) throw new Error(`证据组件不存在: ${selector}`);
      return { selector, rect: toRelativeRect(node) };
    });
    const component = selectorRects.reduce((bounds, item) => ({
      x: Math.min(bounds.x, item.rect.x),
      y: Math.min(bounds.y, item.rect.y),
      right: Math.max(bounds.right, item.rect.right),
      bottom: Math.max(bounds.bottom, item.rect.bottom),
    }), { x: Infinity, y: Infinity, right: -Infinity, bottom: -Infinity });
    return {
      orientation: shell.dataset.orientation,
      sourceCanvas: shell.dataset.sourceCanvas,
      shell: { width: shellRect.width, height: shellRect.height },
      selectors: selectorRects,
      implementationComponent: {
        x: component.x,
        y: component.y,
        width: component.right - component.x,
        height: component.bottom - component.y,
      },
    };
  }, evidenceComponentSelectors[name]);
  await phone.screenshot({ path: path.join(evidenceDir, name) });
}

const portraitGeometry = await phone.evaluate(node => {
  const rect = node.getBoundingClientRect();
  return { width: rect.width, height: rect.height, orientation: node.dataset.orientation };
});
assert.equal(portraitGeometry.orientation, 'portrait');
assert.equal(portraitGeometry.width, 390);
assert.equal(portraitGeometry.height, 844);
await capturePhone('01-start-method-domestic-portrait.png');

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
await capturePhone('06-start-method-domestic-landscape.png');

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

async function assertStartMethodSelection(selectedPath, resolvedPath, position) {
  const events = await eventSnapshot();
  const selections = events.filter(event => event.name === 'onboarding_start_method_select');
  assert.equal(selections.length, 1, `${selectedPath} 选择事件必须且只能上报一次`);
  const [selection] = selections;
  assert.deepEqual(
    Object.fromEntries(['selected_path', 'path', 'position', 'experiment_id', 'market', 'orientation', 'entry'].map(key => [key, selection[key]])),
    {
      selected_path: selectedPath,
      path: resolvedPath,
      position,
      experiment_id: 'segmented_first_play_asset_v1',
      market: resolvedPath === 'free_download' ? 'overseas' : 'domestic',
      orientation: 'portrait',
      entry: 'new_user_onboarding',
    },
  );
  assert.equal(typeof selection.first_play_session_id, 'string');
}

async function assertPageIsolation(activePageId) {
  const snapshot = await page.evaluate(expectedId => {
    const pages = [...document.querySelectorAll('.phone .page')];
    const hiddenFocusables = pages.filter(item => item.id !== expectedId).flatMap(item => [...item.querySelectorAll('button,input,[href],[tabindex]')]);
    let hiddenAcceptedFocus = false;
    for (const target of hiddenFocusables) {
      target.focus();
      if (document.activeElement === target) hiddenAcceptedFocus = true;
    }
    return {
      pages: pages.map(item => ({ id: item.id, active: item.classList.contains('active'), inert: item.inert, ariaHidden: item.getAttribute('aria-hidden') })),
      hiddenAcceptedFocus,
      activePageId: document.querySelector('.phone .page.active')?.id || null,
    };
  }, activePageId);
  assert.equal(snapshot.activePageId, activePageId);
  assert.equal(snapshot.hiddenAcceptedFocus, false, '隐藏页面中的控件不得接受程序化焦点');
  for (const item of snapshot.pages) {
    if (item.id === activePageId) {
      assert.equal(item.active, true);
      assert.equal(item.inert, false);
      assert.equal(item.ariaHidden, null);
    } else {
      assert.equal(item.active, false);
      assert.equal(item.inert, true, `${item.id} 隐藏时必须 inert`);
      assert.equal(item.ariaHidden, 'true', `${item.id} 隐藏时必须 aria-hidden`);
    }
  }
}

async function assertNoOverseasForbiddenCopy(label) {
  const activeText = await page.locator('.page.active').innerText();
  assert.equal(/秒玩|云游戏|充值|15\s*分钟|15\s*min|instant\s*play|cloud\s*gaming/i.test(activeText), false, `${label} 出现海外禁词`);
}

const canonicalStages = new Set(['login', 'library', 'scan', 'file_select', 'import', 'game_select', 'download', 'install', 'launch']);
const canonicalResults = new Set(['success', 'failure', 'cancel']);
const controlledFailureReasons = new Set(['steam_login_failed', 'steam_library_empty', 'permission_denied', 'scan_empty', 'file_unsupported', 'import_failed', 'download_failed', 'space_insufficient', 'install_failed', 'instant_launch_failed']);

function assertStageResults(events, pathName, expectedStages) {
  const allStageEvents = events.filter(event => event.name === 'first_play_stage_result');
  for (const event of allStageEvents) {
    assert.equal(canonicalStages.has(event.stage), true, `出现非 canonical 阶段: ${event.stage}`);
    assert.equal(canonicalResults.has(event.result), true, `出现非法 result: ${event.result}`);
    assert.equal(typeof event.market, 'string', `${event.path}/${event.stage} 缺少 market`);
    assert.equal(typeof event.path, 'string', `${event.path}/${event.stage} 缺少 path`);
    assert.equal(Object.hasOwn(event, 'failure_reason'), true, `${event.path}/${event.stage} 缺少 failure_reason`);
    assert.equal(Object.hasOwn(event, 'game_id'), true, `${event.path}/${event.stage} 缺少 game_id`);
    assert.equal(event.experiment_id, 'segmented_first_play_asset_v1', `${event.path}/${event.stage} experiment_id 不稳定`);
    assert.equal(typeof event.first_play_session_id, 'string', `${event.path}/${event.stage} 缺少首玩会话 ID`);
    assert.equal(typeof event.elapsed_ms, 'number', `${event.path}/${event.stage} 缺少 elapsed_ms`);
    if (event.result === 'success') assert.equal(event.failure_reason, null, `${event.path}/${event.stage} success 的 failure_reason 必须为 null`);
  }
  const stageEvents = allStageEvents.filter(event => event.result === 'success' && event.path === pathName);
  assert.deepEqual(stageEvents.map(event => event.stage), expectedStages, `${pathName} canonical 成功阶段顺序不正确`);
  const keys = allStageEvents.map(event => `${event.path}|${event.stage}|${event.result}|${event.failure_reason ?? ''}|${event.game_id ?? ''}|${event.stage === 'launch' ? event.launch_session_id ?? '' : ''}`);
  assert.equal(new Set(keys).size, keys.length, 'stage_result 必须按完整合同幂等');
  assert.equal(stageEvents.some(event => ['permission_pending', 'scanning', 'downloading'].includes(event.stage)), false, '细粒度 UI 状态不得上报 success stage_result');
}

function assertLaunchSession(events, pathName) {
  const requests = events.filter(event => event.name === 'game_launch_request' && event.path === pathName);
  const ready = events.filter(event => event.name === 'playable_ready' && event.path === pathName);
  const launchResults = events.filter(event => event.name === 'first_play_stage_result' && event.path === pathName && event.stage === 'launch' && event.result === 'success');
  assert.equal(requests.length, 1, `${pathName} 必须且只能创建一个启动请求`);
  assert.equal(ready.length, 1, `${pathName} 必须且只能完成一个 playable_ready`);
  assert.equal(launchResults.length, 1, `${pathName} launch success 必须且只能上报一次`);
  assert.equal(typeof requests[0].launch_session_id, 'string');
  assert(requests[0].launch_session_id.length > 8, `${pathName} launch_session_id 不可为空`);
  assert.equal(ready[0].launch_session_id, requests[0].launch_session_id, `${pathName} 请求和可玩事件必须属于同一启动会话`);
  assert.equal(launchResults[0].launch_session_id, requests[0].launch_session_id, `${pathName} canonical launch 与启动请求必须属于同一会话`);
  assert.equal(typeof requests[0].launch_source, 'string');
  assert.equal(typeof ready[0].launch_source, 'string');
  assert.equal(typeof requests[0].market, 'string');
  assert.equal(typeof ready[0].market, 'string');
  assert.equal(typeof requests[0].elapsed_ms, 'number');
  assert.equal(typeof ready[0].elapsed_ms, 'number');
  assert(ready[0].elapsed_ms >= requests[0].elapsed_ms);
  assert.equal(requests[0].experiment_id, 'segmented_first_play_asset_v1');
  assert.equal(ready[0].experiment_id, 'segmented_first_play_asset_v1');
  assert.equal(requests[0].first_play_session_id, ready[0].first_play_session_id);
}

function assertFailureResult(events, pathName, stage, reason) {
  assert.equal(controlledFailureReasons.has(reason), true, `${reason} 不是受控 failure_reason`);
  const failures = events.filter(item => item.name === 'first_play_stage_result' && item.result === 'failure' && item.path === pathName && item.stage === stage && item.failure_reason === reason);
  assert.equal(failures.length, 1, `${pathName}/${stage}/${reason} 必须且只能上报一次失败阶段事件`);
  const [event] = failures;
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

async function assertHomeContinue(title, pathName, stageName) {
  assert.equal(await page.locator('#pageHome.active').count(), 1, '刷新或浏览后必须先进入首页');
  assert.equal(await page.locator('[data-action="home-continue"]').count(), 1, '首页必须且只能有一个 Continue');
  assert.equal(await page.locator('#homeContinueTitle').innerText(), title);
  const views = (await eventSnapshot()).filter(event => event.name === 'first_play_home_continue_view');
  assert.equal(views.length, 1, '同一 Continue 首次曝光必须幂等');
  assert.deepEqual(
    Object.fromEntries(['path', 'stage', 'market'].map(key => [key, views[0][key]])),
    { path: pathName, stage: stageName, market: pathName === 'free_download' ? 'overseas' : 'domestic' },
  );
  await page.evaluate(() => { renderHomeFeed(); renderHomeFeed(); });
  assert.equal((await eventSnapshot()).filter(event => event.name === 'first_play_home_continue_view').length, 1, '重复 render 不得重复曝光 Continue');
}

// Task5：评审入口必须可枚举，并且每个入口走真实业务路由函数
const expectedFirstPlayPreviews = [
  ['start', '资产分流', 'pageStartMethod', 'domestic', null, null],
  ['steam_login', 'Steam 登录', 'pageSteamLogin', 'domestic', 'steam', 'selected'],
  ['steam_library', 'Steam 游戏库', 'pageSteamLibrary', 'domestic', 'steam', 'content_ready'],
  ['local_import', '本地导入', 'pageLocalScan', 'domestic', 'local_file', 'permission_pending'],
  ['instant_play', '国内秒玩', 'pageInstantPlay', 'domestic', 'instant_play', 'content_ready'],
  ['home_continue', '首页续接', 'pageHome', 'domestic', null, null],
  ['overseas_free', '海外免费游戏', 'pageFreeDownload', 'overseas', 'free_download', 'content_ready'],
];
assert.equal(await page.locator('[data-first-play-preview-group]').innerText(), '首玩页面预览');
assert.deepEqual(
  await page.locator('[data-first-play-preview]').evaluateAll(nodes => nodes.map(node => [node.dataset.firstPlayPreview, node.innerText.trim()])),
  expectedFirstPlayPreviews.map(item => item.slice(0, 2)),
  '首玩页面预览按钮必须按评审顺序稳定枚举',
);
assert.deepEqual(
  await page.locator('[data-demo-error]').evaluateAll(nodes => nodes.map(node => node.dataset.demoError)),
  [...controlledFailureReasons],
  '异常预览必须稳定枚举全部受控原因，且仅存在于外部控制面板',
);
await page.evaluate(() => {
  window.__firstPlayPreviewRouteCalls = [];
  window.__firstPlayPreviewOriginalRoutes = {};
  for (const name of ['previewStartMethod', 'chooseFirstPlayPath', 'resumeFirstPlayPath', 'showHomeResult']) {
    const original = window[name];
    window.__firstPlayPreviewOriginalRoutes[name] = original;
    window[name] = function (...args) {
      window.__firstPlayPreviewRouteCalls.push({ name, args });
      return original.apply(this, args);
    };
  }
});
const previewEventCountBefore = (await eventSnapshot()).length;
const expectedRouteByPreview = {
  start: ['previewStartMethod', null],
  steam_login: ['chooseFirstPlayPath', 'steam'],
  steam_library: ['resumeFirstPlayPath', null],
  local_import: ['resumeFirstPlayPath', null],
  instant_play: ['chooseFirstPlayPath', 'no_asset'],
  home_continue: ['showHomeResult', 'preview'],
  overseas_free: ['chooseFirstPlayPath', 'no_asset'],
};
for (const [scenario, , pageId, market, pathName, stageName] of expectedFirstPlayPreviews) {
  await page.locator(`[data-first-play-preview="${scenario}"]`).click();
  assert.equal(await page.locator(`#${pageId}.active`).count(), 1, `${scenario} 预览页错误`);
  const previewState = await savedFirstPlay();
  assert.deepEqual(
    Object.fromEntries(['market', 'firstPlayPath', 'firstPlayStage', 'firstPlayCompleted', 'launchSessionId', 'downloadSessionId'].map(key => [key, previewState[key]])),
    { market, firstPlayPath: pathName, firstPlayStage: stageName, firstPlayCompleted: false, launchSessionId: null, downloadSessionId: null },
    `${scenario} 预览状态不一致`,
  );
  const routeCall = await page.evaluate(() => window.__firstPlayPreviewRouteCalls.at(-1));
  assert.equal(routeCall?.name, expectedRouteByPreview[scenario][0], `${scenario} 未调用真实业务路由`);
  if (expectedRouteByPreview[scenario][1] !== null) assert.equal(routeCall?.args?.[0], expectedRouteByPreview[scenario][1]);
}
assert.equal((await eventSnapshot()).length, previewEventCountBefore, '外部预览控制不得污染用户事件流');
await page.evaluate(() => {
  for (const [name, original] of Object.entries(window.__firstPlayPreviewOriginalRoutes)) window[name] = original;
  delete window.__firstPlayPreviewOriginalRoutes;
});

// 快速切换预览必须取消旧下载和启动会话，不能被旧回调污染
await page.locator('[data-first-play-preview="overseas_free"]').click();
await page.locator('[data-free-download-game]').first().click();
await page.locator('[data-action="start-free-download"]').click();
const previewDownloadSessionId = (await savedFirstPlay()).downloadSessionId;
assert.equal(typeof previewDownloadSessionId, 'string');
await page.locator('[data-first-play-preview="steam_login"]').click();
await page.waitForTimeout(420);
const stateAfterPreviewRace = await savedFirstPlay();
assert.deepEqual(
  Object.fromEntries(['market', 'firstPlayPath', 'firstPlayStage', 'firstPlayGameId', 'downloadSessionId', 'launchSessionId'].map(key => [key, stateAfterPreviewRace[key]])),
  { market: 'domestic', firstPlayPath: 'steam', firstPlayStage: 'selected', firstPlayGameId: null, downloadSessionId: null, launchSessionId: null },
);
assert.equal((await eventSnapshot()).some(event => event.name === 'first_play_stage_result' && ['download', 'install'].includes(event.stage) && event.result === 'success'), false, '旧下载回调不得污染后续预览');
await page.locator('[data-first-play-preview="instant_play"]').click();
await page.locator('[data-instant-game]').first().click();
assert.equal(typeof (await savedFirstPlay()).launchSessionId, 'string');
await page.locator('[data-first-play-preview="start"]').click();
const clearedLaunchState = await savedFirstPlay();
assert.deepEqual(
  Object.fromEntries(['firstPlayPath', 'firstPlayStage', 'firstPlayGameId', 'launchSessionId', 'launchStartedAt', 'launchSource', 'launchIsFirstPlay'].map(key => [key, clearedLaunchState[key]])),
  { firstPlayPath: null, firstPlayStage: null, firstPlayGameId: null, launchSessionId: null, launchStartedAt: null, launchSource: null, launchIsFirstPlay: null },
  '切换预览必须清理旧启动会话',
);

// Steam 延迟焦点必须可取消，不能在预览切走后聚焦隐藏输入框
await page.locator('[data-set-orientation="portrait"]').click();
await page.locator('[data-first-play-preview="steam_login"]').click();
await page.locator('[data-first-play-preview="start"]').click();
await page.waitForTimeout(340);
const steamFocusRace = await page.evaluate(() => {
  const activePage = document.querySelector('.page.active');
  const active = document.activeElement;
  const steamInput = document.getElementById('steamUsername');
  return {
    activePageId: activePage?.id || null,
    activeBelongsToPage: Boolean(activePage?.contains(active)),
    activeId: active?.id || null,
    activePath: active?.dataset?.firstPlayPath || null,
    activeIsSteamInput: active === steamInput,
    steamPageActive: steamInput.closest('.page')?.classList.contains('active') || false,
    focusTimerCleared: steamLoginFocusTask.timer === null,
  };
});
assert.deepEqual(
  steamFocusRace,
  { activePageId: 'pageStartMethod', activeBelongsToPage: true, activeId: null, activePath: 'steam', activeIsSteamInput: false, steamPageActive: false, focusTimerCleared: true },
  'Steam 登录延迟焦点不得穿透到已隐藏页面',
);

// 四类关键页面切换方向时必须迁移最新滚动位置，并保留页面、状态与语义焦点
const focusSnapshot = () => page.evaluate(() => {
  const active = document.activeElement;
  return {
    action: active?.dataset?.action || null,
    path: active?.dataset?.firstPlayPath || null,
    gameId: active?.dataset?.gameId || null,
  };
});

async function appendScrollFixtures(containerSelector, itemSelector, count) {
  await page.locator(containerSelector).evaluate((container, options) => {
    const seed = container.querySelector(options.itemSelector);
    if (!seed) throw new Error(`缺少滚动夹具种子 ${options.itemSelector}`);
    container.dataset.orientationScrollOriginalStyle = container.getAttribute('style') || '';
    container.style.height = '180px';
    container.style.maxHeight = '180px';
    container.style.overflowY = 'auto';
    container.style.gridAutoRows = '120px';
    for (let index = 0; index < options.count; index += 1) {
      const clone = seed.cloneNode(true);
      clone.dataset.orientationScrollFixture = String(index);
      clone.tabIndex = -1;
      clone.setAttribute('aria-hidden', 'true');
      container.appendChild(clone);
    }
  }, { itemSelector, count });
}

async function removeScrollFixtures(containerSelector) {
  await page.locator(containerSelector).evaluate(container => {
    container.querySelectorAll('[data-orientation-scroll-fixture]').forEach(node => node.remove());
    container.scrollTop = 0;
    const originalStyle = container.dataset.orientationScrollOriginalStyle;
    if (originalStyle) container.setAttribute('style', originalStyle);
    else container.removeAttribute('style');
    delete container.dataset.orientationScrollOriginalStyle;
  });
}

async function scrollMetrics(containerSelector, setTop) {
  return page.locator(containerSelector).evaluate((container, nextTop) => {
    if (nextTop !== null) container.scrollTop = nextTop;
    return {
      top: container.scrollTop,
      max: container.scrollHeight - container.clientHeight,
      overflowY: getComputedStyle(container).overflowY,
    };
  }, setTop ?? null);
}

async function seedStaleTargetScroll(key, orientation, value) {
  await page.evaluate(({ key: scrollKey, orientation: targetOrientation, value: staleValue }) => {
    delete orientationScrollState.latest[scrollKey];
    delete orientationScrollState.portrait[scrollKey];
    delete orientationScrollState.landscape[scrollKey];
    orientationScrollState[targetOrientation][scrollKey] = staleValue;
  }, { key, orientation, value });
}

await page.locator('[data-first-play-preview="start"]').click();
assert.deepEqual(
  await page.locator('#pageStartMethod button').evaluateAll(nodes => nodes
    .filter(node => node.matches('[data-first-play-path],[data-action="browse-home"]'))
    .map(node => node.dataset.firstPlayPath || 'browse')),
  ['steam', 'local_file', 'no_asset', 'browse'],
  '资产首屏焦点 DOM 顺序必须为 Steam→本地→暂无→先逛',
);
await page.locator('[data-first-play-path="local_file"]').focus();
await page.locator('[data-set-orientation="landscape"]').click();
assert.equal((await focusSnapshot()).path, 'local_file', '资产首屏横屏后必须保持当前选项焦点');
await page.locator('[data-set-orientation="portrait"]').click();
assert.equal((await focusSnapshot()).path, 'local_file', '资产首屏回竖屏后必须保持当前选项焦点');
await page.locator('.start-method-body').evaluate(container => {
  const spacer = document.createElement('div');
  spacer.dataset.orientationScrollFixture = 'spacer';
  spacer.style.cssText = 'height:520px;min-height:520px;grid-column:1/-1;pointer-events:none';
  container.appendChild(spacer);
});
await seedStaleTargetScroll('start-method', 'landscape', 17);
const startPortraitScroll = await scrollMetrics('.start-method-body', 150);
assert(startPortraitScroll.max > 150 && startPortraitScroll.top === 150, '资产首屏竖屏滚动夹具必须真实可滚');
await page.locator('[data-set-orientation="landscape"]').click();
const startLandscapeScroll = await scrollMetrics('.start-method-body');
assert.equal(startLandscapeScroll.overflowY, 'hidden', '资产首屏横屏应为不可滚布局');
assert.equal(await page.evaluate(() => orientationScrollState.latest['start-method']), 150, '不可滚横屏不得用 0 覆盖资产首屏最新位置');
await page.locator('[data-set-orientation="portrait"]').click();
assert.equal((await scrollMetrics('.start-method-body')).top, 150, '资产首屏回竖屏必须恢复源方向最新位置');
await removeScrollFixtures('.start-method-body');

await page.locator('[data-first-play-preview="steam_library"]').click();
const steamOrientationState = await savedFirstPlay();
await page.locator('[data-steam-game]').first().focus();
const focusedSteamGameId = (await focusSnapshot()).gameId;
await page.locator('[data-set-orientation="landscape"]').click();
assert.equal((await focusSnapshot()).gameId, focusedSteamGameId, 'Steam 库横屏后必须保持游戏卡焦点');
await page.locator('[data-set-orientation="portrait"]').click();
assert.equal((await focusSnapshot()).gameId, focusedSteamGameId, 'Steam 库回竖屏后必须保持游戏卡焦点');
await appendScrollFixtures('#steamGameGrid', '[data-steam-game]', 30);
await seedStaleTargetScroll('steam-library', 'landscape', 25);
const steamPortrait150 = await scrollMetrics('#steamGameGrid', 150);
assert(steamPortrait150.max > 300 && steamPortrait150.top === 150, `Steam 竖屏列表必须形成真实滚动：${JSON.stringify(steamPortrait150)}`);
await page.locator('[data-set-orientation="landscape"]').click();
const steamLandscape150 = await scrollMetrics('#steamGameGrid');
assert(steamLandscape150.max > 300 && steamLandscape150.top === 150, 'Steam 横屏必须迁移 portrait 最新 150，而非旧历史 25');
assert.equal((await scrollMetrics('#steamGameGrid', 240)).top, 240, 'Steam 横屏必须可滚至 240');
await page.locator('[data-set-orientation="portrait"]').click();
const steamPortrait240 = await scrollMetrics('#steamGameGrid');
assert(steamPortrait240.max > 300 && steamPortrait240.top === 240, 'Steam 回竖屏必须迁移 landscape 最新 240，而非旧 150');
const steamStateAfterScroll = await savedFirstPlay();
assert.deepEqual(
  Object.fromEntries(['market', 'firstPlayPath', 'firstPlayStage', 'firstPlayCompleted'].map(key => [key, steamStateAfterScroll[key]])),
  Object.fromEntries(['market', 'firstPlayPath', 'firstPlayStage', 'firstPlayCompleted'].map(key => [key, steamOrientationState[key]])),
  'Steam 库方向滚动不得改业务状态',
);
await removeScrollFixtures('#steamGameGrid');

await page.locator('[data-first-play-preview="home_continue"]').click();
await seedStaleTargetScroll('home-feed', 'landscape', 23);
const homePortrait150 = await scrollMetrics('.home-portrait-feed', 150);
assert(homePortrait150.max > 300 && homePortrait150.top === 150, '竖屏首页 Feed 必须真实可滚');
await page.locator('.home-search-entry').focus();
await page.locator('[data-set-orientation="landscape"]').click();
assert.equal(await page.locator('.home-search-entry').isVisible(), false, '横屏首页应隐藏竖屏搜索入口');
assert.equal((await focusSnapshot()).action, 'home-continue', '搜索入口隐藏后焦点必须回退到唯一 Continue');
assert.equal((await scrollMetrics('.home-portrait-feed')).overflowY, 'visible', '横屏首页 Feed 应为不可滚布局');
assert.equal(await page.evaluate(() => orientationScrollState.latest['home-feed']), 150, '不可滚横屏不得用 0 覆盖首页最新位置');
await page.locator('[data-set-orientation="portrait"]').click();
assert.equal((await scrollMetrics('.home-portrait-feed')).top, 150, '首页回竖屏必须恢复最新 150');

await page.locator('[data-first-play-preview="overseas_free"]').click();
await page.locator('[data-free-download-game]').last().click();
const overseasOrientationState = await savedFirstPlay();
await page.locator('[data-free-download-game][aria-pressed="true"]').focus();
const focusedFreeGameId = (await focusSnapshot()).gameId;
await page.locator('[data-set-orientation="landscape"]').click();
assert.equal((await focusSnapshot()).gameId, focusedFreeGameId, '海外下载页横屏后必须保持选中卡焦点');
await page.locator('[data-set-orientation="portrait"]').click();
assert.equal((await focusSnapshot()).gameId, focusedFreeGameId, '海外下载页回竖屏后必须保持选中卡焦点');
await appendScrollFixtures('#freeDownloadGrid', '[data-free-download-game]', 20);
await seedStaleTargetScroll('free-download', 'landscape', 25);
const freePortrait150 = await scrollMetrics('#freeDownloadGrid', 150);
assert(freePortrait150.max > 300 && freePortrait150.top === 150, `海外竖屏列表必须形成真实滚动：${JSON.stringify(freePortrait150)}`);
await page.locator('[data-set-orientation="landscape"]').click();
const freeLandscape150 = await scrollMetrics('#freeDownloadGrid');
assert(freeLandscape150.max > 300 && freeLandscape150.top === 150, '海外横屏必须迁移 portrait 最新 150，而非旧历史 25');
assert.equal((await scrollMetrics('#freeDownloadGrid', 240)).top, 240, '海外横屏必须可滚至 240');
await page.locator('[data-set-orientation="portrait"]').click();
const freePortrait240 = await scrollMetrics('#freeDownloadGrid');
assert(freePortrait240.max > 300 && freePortrait240.top === 240, '海外回竖屏必须迁移 landscape 最新 240，而非旧 150');
await removeScrollFixtures('#freeDownloadGrid');
const overseasStateAfterScroll = await savedFirstPlay();
assert.deepEqual(
  Object.fromEntries(['market', 'firstPlayPath', 'firstPlayStage', 'firstPlayGameId', 'firstPlayCompleted'].map(key => [key, overseasStateAfterScroll[key]])),
  Object.fromEntries(['market', 'firstPlayPath', 'firstPlayStage', 'firstPlayGameId', 'firstPlayCompleted'].map(key => [key, overseasOrientationState[key]])),
  '海外下载方向滚动不得改市场、路径、阶段或游戏',
);
await page.locator('[data-set-orientation="landscape"]').click();
await page.reload();
assert.equal((await page.locator('.phone').getAttribute('data-orientation')), 'landscape', '刷新必须恢复横屏方向');
assert.equal(await page.locator('#pageHome.active').count(), 1, '横屏刷新仍需按首页续接规则恢复');
assert.equal(await page.locator('#homeContinueTitle').innerText(), 'Continue downloading');
const overseasStateAfterReload = await savedFirstPlay();
assert.deepEqual(
  Object.fromEntries(['market', 'firstPlayPath', 'firstPlayStage', 'firstPlayGameId', 'firstPlayCompleted'].map(key => [key, overseasStateAfterReload[key]])),
  Object.fromEntries(['market', 'firstPlayPath', 'firstPlayStage', 'firstPlayGameId', 'firstPlayCompleted'].map(key => [key, overseasOrientationState[key]])),
  '横屏刷新不得丢失海外下载续接状态',
);

// Task4：首页必须使用 screen-08 / screen-36 的 DOM Feed，并承接未完成首玩路径
await resetJourney();
assert.equal((await savedFirstPlay()).firstPlayStartedAt, null, '仅到资产分流页时首玩计时不得开始');
await page.locator('[data-action="browse-home"]').click();
await assertStartMethodSelection('browse', 'browse', 4);
assert.equal((await savedFirstPlay()).firstPlayPath, null, '无真实路径时浏览首页不得伪造 firstPlayPath');
assert.equal((await savedFirstPlay()).firstPlayCompleted, false, '浏览首页不得伪完成首玩');
assert.notEqual((await savedFirstPlay()).state, 'completed', '浏览首页不得使用 completed 状态');
assert.equal(await page.locator('#pageHome[data-visual-source="screen-08,screen-36"]').count(), 1);
for (const selector of ['.home-search-continue', '.home-daily-hero', '.home-recommend-track', '.home-news-section', '.home-game-section', '.home-rank-section', '.home-bottom-nav']) {
  assert.equal(await page.locator(selector).count(), 1, `竖屏首页缺少 ${selector}`);
}
assert.equal(await page.locator('.home-search-entry').isVisible(), true, '竖屏首页必须恢复搜索入口');
assert.equal(await page.locator('.home-device-action').isVisible(), true, '竖屏首页必须恢复独立设备入口');
assert.equal(await page.evaluate(() => {
  const hero = document.querySelector('.home-daily-hero');
  const continuation = document.querySelector('[data-action="home-continue"]');
  const recommend = document.querySelector('.home-recommend-track');
  return Boolean(hero.compareDocumentPosition(continuation) & Node.DOCUMENT_POSITION_FOLLOWING) &&
    Boolean(continuation.compareDocumentPosition(recommend) & Node.DOCUMENT_POSITION_FOLLOWING);
}), true, 'Continue DOM 必须位于主 Hero 之后、推荐轨道之前');
assert.equal(
  await page.locator('.home-bottom-nav [data-nav-icon]').evaluateAll(nodes => nodes.length === 5 && new Set(nodes.map(node => node.dataset.navIcon)).size === 5),
  true,
  '竖屏底栏五个导航图标必须各不相同',
);
assert.equal(
  await page.locator('#pageHome img').evaluateAll(nodes => nodes.every(node => !/original\.(?:png|webp)$/i.test(node.getAttribute('src') || ''))),
  true,
  '首页不得使用整页截图',
);
assert.equal((await eventSnapshot()).some(event => event.name === 'onboarding_start_method_select' && event.path === 'browse'), true, '浏览入口必须保留 path=browse 选择事件');
await assertHomeContinue('免费秒玩15分钟', 'instant_play', 'selected');
await capturePhone('05-home-continue-portrait.png');
await page.locator('[data-action="home-continue"]').click();
assert.equal(await page.locator('#pageInstantPlay.active').count(), 1, '国内默认 Continue 必须进入秒玩频道');
assert.equal(typeof (await savedFirstPlay()).firstPlayStartedAt, 'number', 'browse 后点击默认 Continue 才开始首玩计时');
let continueEvents = await eventSnapshot();
assert.equal(continueEvents.filter(event => event.name === 'first_play_home_continue_click' && event.path === 'instant_play').length, 1);
assert.equal(continueEvents.filter(event => event.name === 'first_play_path_view' && event.path === 'instant_play' && event.resume_source === 'home_continue').length, 1);

await resetJourney('portrait', 'overseas');
await page.locator('[data-action="browse-home"]').click();
await assertHomeContinue('Find a free game', 'free_download', 'selected');
await page.locator('[data-action="home-continue"]').click();
assert.equal(await page.locator('#pageFreeDownload.active').count(), 1, '海外默认 Continue 必须进入免费游戏下载页');

// Steam 未登录刷新：首页续接 Sheet；库可用刷新：首页续接 Steam 库
await resetJourney();
await page.locator('[data-first-play-path="steam"]').click();
const steamSelectedBeforeRotate = await savedFirstPlay();
await page.locator('[data-set-orientation="landscape"]').click();
assert.equal(await page.locator('#pageSteamLogin.active').count(), 1, '横竖屏切换不得强制跳首页');
await page.locator('[data-set-orientation="portrait"]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, steamSelectedBeforeRotate.firstPlayStage, '横竖屏切换不得重置首玩状态');
await page.reload();
await assertHomeContinue('继续登录Steam', 'steam', 'selected');
await capturePhone('home-steam-continue-portrait.png');
await page.locator('[data-action="home-continue"]').click();
assert.equal(await page.locator('#pageSteamLogin.active').count(), 1);
assert.equal((await eventSnapshot()).filter(event => event.name === 'first_play_home_continue_click' && event.path === 'steam').length, 1);
assert.equal((await eventSnapshot()).filter(event => event.name === 'first_play_path_view' && event.resume_source === 'home_continue').length, 1);

await resetJourney();
await page.locator('[data-first-play-path="steam"]').click();
await page.locator('#steamUsername').fill('gamehub_player');
await page.locator('#steamPassword').fill('demo-password');
await page.locator('[data-action="steam-bind-success"]').click();
await page.reload();
await assertHomeContinue('继续从Steam游戏库开始', 'steam', 'content_ready');
await page.locator('[data-action="home-continue"]').click();
assert.equal(await page.locator('#pageSteamLibrary.active').count(), 1);
await page.locator('[data-steam-game]').first().click();
const pendingLaunchSessionId = (await savedFirstPlay()).launchSessionId;
await page.reload();
await assertHomeContinue('继续启动Steam游戏', 'steam', 'launch_requested');
assert.equal((await savedFirstPlay()).launchSessionId, pendingLaunchSessionId, '刷新不得替换待启动 launch session');
await page.locator('[data-action="home-continue"]').click();
assert.equal(await page.locator('#pageGameLaunch.active').count(), 1);
assert.equal((await savedFirstPlay()).launchSessionId, pendingLaunchSessionId);
assert.equal((await eventSnapshot()).some(event => event.name === 'game_launch_request'), false, '刷新续接待启动页不得制造新的启动请求');

// 本地扫描、已导入、秒玩和海外下载均从首页恢复细粒度位置
await resetJourney();
await page.locator('[data-first-play-path="local_file"]').click();
await assertStartMethodSelection('local_file', 'local_file', 2);
await page.locator('[data-import-source="local"]').click();
await page.locator('[data-action="grant-scan-permission"]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'scanning');
await page.reload();
await assertHomeContinue('继续导入游戏', 'local_file', 'scanning');
await page.locator('[data-action="home-continue"]').click();
assert.equal(await page.locator('#pageLocalScan.active').count(), 1);
assert.equal((await savedFirstPlay()).firstPlayStage, 'scanning', '恢复扫描过程不得重置为权限页');
await page.waitForSelector('#localScanResult:not([hidden])');
assert.equal((await savedFirstPlay()).firstPlayStage, 'scan_result');
assert.equal(await page.locator('#localScanResult:not([hidden])').count(), 1);
await page.locator('[data-action="select-scanned-exe"]').click();
await page.locator('[data-action="import-selected-game"]').click();
await page.reload();
await assertHomeContinue('继续启动已导入游戏', 'local_file', 'content_ready');
await page.locator('[data-action="home-continue"]').click();
assert.equal(await page.locator('#pagePcLibrary.active [data-local-game]').count(), 2, '已导入库必须保留 Silksong 基线卡并新增导入卡');
assert.equal(await page.locator('#pagePcLibrary.active [data-game-id="silksong_local"]').count(), 1);
assert.equal(await page.locator('#pagePcLibrary.active [data-game-id="game_2"]').count(), 1);

await resetJourney();
await page.locator('[data-first-play-path="no_asset"]').click();
await assertStartMethodSelection('no_asset', 'instant_play', 3);
await page.reload();
await assertHomeContinue('继续免费秒玩', 'instant_play', 'content_ready');
await page.locator('[data-action="home-continue"]').click();
assert.equal(await page.locator('#pageInstantPlay.active').count(), 1);

await resetJourney('portrait', 'overseas');
await page.locator('[data-first-play-path="no_asset"]').click();
await page.locator('[data-free-download-game]').first().click();
await page.locator('[data-action="start-free-download"]').click();
await page.reload();
await assertHomeContinue('Continue downloading', 'free_download', 'downloading');
assert.equal((await savedFirstPlay()).downloadSessionId, null, '刷新后旧下载 session 必须失效');
await page.locator('[data-action="home-continue"]').click();
assert.equal(await page.locator('#pageFreeDownload.active').count(), 1);
assert.equal((await savedFirstPlay()).firstPlayStage, 'downloading');
assert.equal(typeof (await savedFirstPlay()).downloadSessionId, 'string', '继续后必须创建新的下载 session');
await page.waitForFunction(() => onboardingFlow.firstPlayStage === 'installed');

// 用户改选路径后首页只保留最新路径的唯一 Continue
await resetJourney();
await page.locator('[data-first-play-path="steam"]').click();
await page.locator('#steamLoginSheet .steam-sheet-close[data-action="cancel-steam-login"]').click();
const steamCancelEvents = await eventSnapshot();
const steamCancels = steamCancelEvents.filter(event => event.name === 'first_play_stage_result' && event.path === 'steam' && event.stage === 'login' && event.result === 'cancel');
assert.equal(steamCancels.length, 1, '关闭 Steam 登录必须上报一次 canonical login/cancel');
assert.equal(steamCancels[0].failure_reason, 'steam_login_cancelled');
await page.locator('[data-first-play-path="local_file"]').click();
const switchEvents = (await eventSnapshot()).filter(event => event.name === 'first_play_path_switch');
assert.equal(switchEvents.length, 1, '从 Steam 返回后改选本地必须上报一次路径切换');
assert.deepEqual(
  Object.fromEntries(['from_path', 'from_stage', 'to_path', 'reason'].map(key => [key, switchEvents[0][key]])),
  { from_path: 'steam', from_stage: 'selected', to_path: 'local_file', reason: 'steam_login_cancelled' },
);
await page.reload();
await assertHomeContinue('继续导入游戏', 'local_file', 'selected');
assert.equal(await page.locator('[data-action="home-continue"]').count(), 1);

// 已有真实路径时浏览首页只记录 browse 入口，不覆盖路径与进度
await resetJourney();
await page.locator('[data-first-play-path="steam"]').click();
await page.locator('#steamLoginSheet .steam-sheet-close[data-action="cancel-steam-login"]').click();
const pathBeforeBrowse = await savedFirstPlay();
await page.locator('[data-action="browse-home"]').click();
assert.equal((await savedFirstPlay()).firstPlayPath, 'steam');
assert.equal((await savedFirstPlay()).firstPlayStage, pathBeforeBrowse.firstPlayStage);
await assertHomeContinue('继续登录Steam', 'steam', 'selected');

const eventSnapshots = {};
const completedPathStates = {};

async function sealCompletedJourney(pathName) {
  const events = await eventSnapshot();
  const state = await savedFirstPlay();
  assert.equal(state.firstPlayPath, pathName, `${pathName} 完成态 path 未持久化`);
  assert.equal(state.firstPlayStage, 'playable', `${pathName} 完成态必须持久化为 playable`);
  assert.equal(state.firstPlayCompleted, true, `${pathName} 完成态 firstPlayCompleted 必须为 true`);
  assert.equal(typeof state.updatedAt, 'string', `${pathName} 完成态缺少更新时间`);
  const ready = events.find(event => event.name === 'playable_ready' && event.path === pathName);
  assert(ready, `${pathName} 完成态缺少 playable_ready`);
  assert.equal(state.launchSessionId, ready.launch_session_id, `${pathName} 持久化启动会话与 playable_ready 不一致`);
  eventSnapshots[pathName] = events;
  completedPathStates[pathName] = state;
}

// Steam：Sheet -> 内容库 -> 启动请求 -> 可玩场景
await resetJourney();
await page.locator('[data-first-play-path="steam"]').click();
await assertStartMethodSelection('steam', 'steam', 1);
const steamFirstPlayStartedAt = (await savedFirstPlay()).firstPlayStartedAt;
assert.equal(typeof steamFirstPlayStartedAt, 'number');
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
await capturePhone('02-steam-library-portrait.png');
await page.locator('[data-steam-game]').first().click();
assert.equal(await page.locator('#pageGameLaunch.active').count(), 1);
assert.equal((await savedFirstPlay()).firstPlayStage, 'launch_requested');
const steamLaunchSessionId = (await savedFirstPlay()).launchSessionId;
assert.equal(typeof steamLaunchSessionId, 'string');
assert.equal((await savedFirstPlay()).firstPlayStartedAt, steamFirstPlayStartedAt, 'requestGameLaunch 不得重置首玩起点');
assert.equal((await eventSnapshot()).filter(event => event.name === 'game_launch_request' && event.path === 'steam').length, 1);
await page.evaluate(() => requestGameLaunch('steam', onboardingFlow.firstPlayGameId));
assert.equal((await savedFirstPlay()).launchSessionId, steamLaunchSessionId, '同一待启动动作不得创建新 session');
assert.equal((await eventSnapshot()).filter(event => event.name === 'game_launch_request' && event.path === 'steam').length, 1);
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false, '点击 Steam 游戏不得提前记可玩');
await page.locator('[data-action="enter-playable-scene"]').click();
assert.equal(await page.locator('#pagePlayableScene.active [data-playable-input]').count(), 1, '首次 playable 后必须停留在可接收输入场景');
assert.equal((await savedFirstPlay()).firstPlayCompleted, true);
eventSnapshots.steam = await eventSnapshot();
assert.equal(eventSnapshots.steam.filter(event => event.name === 'playable_ready' && event.path === 'steam').length, 1);
await page.evaluate(() => markPlayable('steam', onboardingFlow.firstPlayGameId));
assert.equal((await eventSnapshot()).filter(event => event.name === 'playable_ready' && event.path === 'steam').length, 1, 'Steam playable_ready 必须幂等');
eventSnapshots.steam = await eventSnapshot();
assertStageResults(eventSnapshots.steam, 'steam', ['login', 'library', 'game_select', 'launch']);
assertLaunchSession(eventSnapshots.steam, 'steam');
await sealCompletedJourney('steam');
const firstPlayFunnelNames = new Set(['first_play_home_continue_view', 'first_play_home_continue_click', 'first_play_path_view', 'first_play_stage_result']);
const firstPlayFunnelCountBeforeHome = eventSnapshots.steam.filter(event => firstPlayFunnelNames.has(event.name)).length;
await page.locator('[data-action="enter-home-after-playable"]').click();
assert.equal(await page.locator('#pageHome.active').count(), 1);
assert.equal(await page.locator('#homeContinueTitle').innerText(), '继续最近游戏');
await page.evaluate(() => { renderHomeFeed(); renderHomeFeed(); });
assert.equal((await eventSnapshot()).filter(event => firstPlayFunnelNames.has(event.name)).length, firstPlayFunnelCountBeforeHome, '完成态渲染首页不得新增首玩漏斗事件');
assert.equal((await eventSnapshot()).filter(event => event.name === 'recent_game_continue_view').length, 1, '最近游戏 Continue 曝光必须使用非首玩事件且幂等');
await capturePhone('home-recent-game-portrait.png');
const recentGameId = (await savedFirstPlay()).firstPlayGameId;
await page.reload();
assert.equal(await page.locator('#pageHome.active').count(), 1);
assert.equal(await page.locator('#homeContinueTitle').innerText(), '继续最近游戏');
assert.equal((await eventSnapshot()).filter(event => firstPlayFunnelNames.has(event.name)).length, 0, '完成态刷新不得上报任何首玩漏斗事件');
await page.locator('[data-action="home-continue"]').click();
assert.equal(await page.locator('#pageGameLaunch.active').count(), 1, '成功后 Continue 必须恢复最近游戏');
assert.equal((await savedFirstPlay()).firstPlayGameId, recentGameId);
assert.equal((await savedFirstPlay()).firstPlayCompleted, true, '后续再次启动不得回退首次成功标记');
assert.equal((await eventSnapshot()).filter(event => firstPlayFunnelNames.has(event.name)).length, 0, '完成态点击不得上报首玩 Continue、路径或阶段事件');
assert.equal((await eventSnapshot()).filter(event => event.name === 'recent_game_continue_click').length, 1);
await page.locator('[data-action="enter-playable-scene"]').click();
assert.equal(await page.locator('#pagePlayableScene.active').count(), 1, '最近游戏仍需进入可接收输入场景');
assert.equal((await savedFirstPlay()).firstPlayCompleted, true);
assert.equal((await eventSnapshot()).filter(event => firstPlayFunnelNames.has(event.name)).length, 0, '最近游戏再次可玩不得重记首玩 canonical 结果');
await page.evaluate(() => showFirstPlayError('instant_launch_failed'));
assert.equal((await savedFirstPlay()).firstPlayCompleted, true, '首次成功后续失败不得回退完成标记');
assert.equal((await eventSnapshot()).filter(event => firstPlayFunnelNames.has(event.name)).length, 0, '完成后失败不得污染首玩阶段结果');

// 本地文件：添加游戏弹窗 -> 扫描结果 -> 选文件 -> 导入库 -> 启动 -> 可玩
await resetJourney();
await page.locator('[data-first-play-path="local_file"]').click();
assert.equal(await page.locator('#pagePcLibrary.active').count(), 1);
assert.equal(await page.locator('#addGameDialog:not([hidden])').count(), 1);
assert.deepEqual(await page.locator('#addGameDialog [data-import-source]').evaluateAll(nodes => nodes.map(node => node.dataset.importSource)), ['local', 'steam']);
assert.equal(await page.locator('#pcLibraryGrid [data-game-id="silksong_local"]').count(), 1, '导入前 PC 库必须显示 Silksong 基线卡');
assert.equal(await page.locator('#pcLibraryGrid [data-game-id="silksong_local"] img').evaluate(node => node.src.startsWith('data:image/webp;base64,') && node.naturalWidth > 0), true);
assert.equal(await page.locator('[data-pc-device]').count(), 1, 'PC 游戏库缺少设备动作');
assert.equal(await page.locator('[data-pc-filter]').count(), 1, 'PC 游戏库缺少筛选动作');
assert.equal(await page.locator('.pc-bottom-nav').count(), 1, 'PC 游戏库竖屏缺少五栏底部导航');
await assertPageIsolation('pagePcLibrary');
assert.equal(await page.locator('#pagePcLibrary .pc-library-page').evaluate(node => node.inert && node.getAttribute('aria-hidden') === 'true'), true, 'Dialog 打开时背景库必须 inert');
await page.waitForFunction(() => document.activeElement?.dataset?.action === 'close-add-game');
await page.keyboard.press('Shift+Tab');
assert.equal(await page.evaluate(() => document.activeElement?.dataset?.importSource), 'steam', 'Shift+Tab 必须在 Dialog 内回环');
await page.keyboard.press('Tab');
assert.equal(await page.evaluate(() => document.activeElement?.dataset?.action), 'close-add-game', 'Tab 必须在 Dialog 内回环');
await page.keyboard.press('Escape');
assert.equal(await page.locator('#addGameDialog').isHidden(), true, 'Escape 必须关闭添加游戏 Dialog');
assert.equal(await page.evaluate(() => document.activeElement?.dataset?.action), 'open-add-game', '路径卡已隐藏时焦点必须回退到“添加游戏”');
await page.locator('[data-action="open-add-game"]').click();
await page.waitForFunction(() => document.activeElement?.dataset?.action === 'close-add-game');
await capturePhone('03-local-import-portrait.png');
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
assert.equal(await page.locator('[data-local-game]').count(), 2, '导入成功后必须显示 Silksong 与本地导入游戏两张卡');
assert.equal(await page.locator('[data-local-game][data-game-id="game_2"]').count(), 1);
assert.equal((await savedFirstPlay()).firstPlayStage, 'content_ready');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false, '完成导入不得提前记可玩');
await capturePhone('local-library-portrait.png');
await page.locator('[data-local-game][data-game-id="game_2"]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'launch_requested');
assert.equal((await eventSnapshot()).filter(event => event.name === 'game_launch_request' && event.path === 'local_file').length, 1);
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);
await page.locator('[data-action="enter-playable-scene"]').click();
eventSnapshots.local_file = await eventSnapshot();
assert.equal(eventSnapshots.local_file.filter(event => event.name === 'playable_ready' && event.path === 'local_file').length, 1);
assertStageResults(eventSnapshots.local_file, 'local_file', ['scan', 'file_select', 'import', 'library', 'game_select', 'launch']);
assertLaunchSession(eventSnapshots.local_file, 'local_file');
await sealCompletedJourney('local_file');

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
assert((await page.locator('.instant-time-card').innerText()).includes('赠送15分钟'));
assert((await page.locator('.instant-time-card').innerText()).includes('立即充值'));
assert((await page.locator('.instant-time-card').innerText()).includes('购买秒玩时长可享受'));
assert.equal(await page.locator('#instantAvatar').evaluate(node => node.src.startsWith('data:image/webp;base64,') && node.naturalWidth > 0), true, '秒玩账号卡必须使用来源化头像');
await capturePhone('04-instant-play-portrait.png');
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
await sealCompletedJourney('instant_play');

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
await assertStartMethodSelection('no_asset', 'free_download', 3);
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
assert.deepEqual(
  await page.locator('[data-free-download-game]').evaluateAll(nodes => nodes.map(node => ({
    name: node.querySelector('strong')?.textContent,
    appId: Number(node.dataset.appId),
    source: node.dataset.assetSource,
    officialUrl: node.dataset.officialUrl,
    coverIsEmbedded: node.querySelector('img')?.src.startsWith('data:image/webp;base64,') || false,
  }))),
  [
    { name: 'Counter-Strike 2', appId: 730, source: 'external-official', officialUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg', coverIsEmbedded: true },
    { name: 'Dota 2', appId: 570, source: 'external-official', officialUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/570/header.jpg', coverIsEmbedded: true },
  ],
  '海外免费游戏必须使用两款真实 Steam 免费游戏并登记官方资产来源',
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
await sealCompletedJourney('free_download');

// 受控失败：外部面板只负责触发，用户页必须提供原因、恢复和换路，且绝不提前 playable
await resetJourney();
await page.locator('[data-first-play-path="steam"]').click();
await page.locator('[data-demo-error="steam_login_failed"]').click();
assert.equal(await page.locator('#steamLoginError:not([hidden])').count(), 1);
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);
assertFailureResult(await eventSnapshot(), 'steam', 'login', 'steam_login_failed');
await page.locator('#steamLoginError [data-action="retry-first-play"]').click();
assert.equal(await page.locator('#steamLoginError').isHidden(), true, 'Steam 登录失败必须可就地重试');
await page.locator('#steamUsername').fill('gamehub_player');
await page.locator('#steamPassword').fill('demo-password');
await page.locator('[data-action="steam-bind-success"]').click();
assert.equal(await page.locator('#pageSteamLibrary.active').count(), 1);
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);

await page.locator('[data-demo-error="steam_library_empty"]').click();
assert.equal(await page.locator('#steamLibraryError:not([hidden])').count(), 1);
assertFailureResult(await eventSnapshot(), 'steam', 'library', 'steam_library_empty');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);
await page.locator('#steamLibraryError [data-action="retry-first-play"]').click();
assert.equal(await page.locator('#steamLibraryError').isHidden(), true, 'Steam 空库必须可恢复查看已同步内容');
await page.locator('[data-steam-game]').first().click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'launch_requested');
await page.locator('[data-action="cancel-launch"]').click();
assert.equal(await page.locator('#pageSteamLibrary.active').count(), 1);
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);

for (const [failureCode, expectedStage] of [['permission_denied', 'permission_denied'], ['scan_empty', 'scan_empty']]) {
  await resetJourney();
  await page.locator('[data-first-play-path="local_file"]').click();
  await page.locator('[data-import-source="local"]').click();
  if (failureCode === 'scan_empty') {
    await page.locator('[data-action="grant-scan-permission"]').click();
    assert.equal((await savedFirstPlay()).firstPlayStage, 'scanning');
  }
  await page.locator(`[data-demo-error="${failureCode}"]`).click();
  assert.equal((await savedFirstPlay()).firstPlayStage, expectedStage);
  assert.equal(await page.locator('#localImportError:not([hidden])').count(), 1);
  assertFailureResult(await eventSnapshot(), 'local_file', 'scan', failureCode);
  await page.waitForTimeout(420);
  assert.equal((await savedFirstPlay()).firstPlayStage, expectedStage, `${failureCode} 必须取消旧扫描回调`);
  assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);
  await page.locator('#localImportError [data-action="retry-local-error"]').click();
  assert.equal((await savedFirstPlay()).firstPlayStage, 'file_picker', `${failureCode} 必须恢复到手动选择`);
  assert.equal(await page.locator('#manualFilePicker:not([hidden])').count(), 1);
}

await resetJourney();
await page.locator('[data-first-play-path="no_asset"]').click();
await page.locator('[data-demo-error="instant_launch_failed"]').click();
assert.equal(await page.locator('#pageInstantPlay.active').count(), 1, '尚未创建启动会话时不得伪造启动失败');
assert.equal((await eventSnapshot()).some(event => event.name === 'first_play_stage_result' && event.failure_reason === 'instant_launch_failed'), false);
await page.locator('[data-instant-game]').first().click();
assert.equal(await page.locator('#pageGameLaunch.active').count(), 1, '秒玩必须先进入真实启动页');
const failedInstantSession = (await savedFirstPlay()).launchSessionId;
assert.equal(typeof failedInstantSession, 'string');
await page.locator('[data-demo-error="instant_launch_failed"]').click();
assert.equal(await page.locator('#pageGameLaunch.active #launchError:not([hidden])').count(), 1, '启动失败必须留在启动页展示恢复动作');
assert.deepEqual(
  await page.locator('#launchError [data-action]').evaluateAll(nodes => nodes.map(node => node.dataset.action)),
  ['retry-launch', 'choose-another-instant-game', 'return-to-paths'],
  '启动失败必须提供重试、换游戏、其他方式三个恢复动作',
);
assertFailureResult(await eventSnapshot(), 'instant_play', 'launch', 'instant_launch_failed');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);
const failedInstantState = await savedFirstPlay();
assert.equal(failedInstantState.firstPlayStage, 'launch_failed');
assert.equal(failedInstantState.launchSessionId, null, '失败后必须清理旧 launch session');
assert.equal(await page.evaluate(() => launchTask.timer === null && launchTask.sessionId === null), true, '失败后必须清理旧异步 token');
await page.waitForTimeout(460);
assert.equal((await savedFirstPlay()).firstPlayStage, 'launch_failed', '旧启动回调不得污染失败状态');
await page.locator('#launchError [data-action="retry-launch"]').click();
const retriedInstantSession = (await savedFirstPlay()).launchSessionId;
assert.equal((await savedFirstPlay()).firstPlayStage, 'launch_requested', '重试必须重新进入启动中');
assert.notEqual(retriedInstantSession, failedInstantSession, '重试必须创建新的 launch session');
assert.equal(await page.locator('#launchError').isHidden(), true);
assert.equal((await eventSnapshot()).filter(event => event.name === 'game_launch_request' && event.path === 'instant_play').length, 2, '失败重试必须形成两个独立启动请求');
await page.locator('[data-action="enter-playable-scene"]').click();
assert.equal(await page.locator('#pagePlayableScene.active').count(), 1, '重试后必须可到达 playable');
assert.equal((await eventSnapshot()).filter(event => event.name === 'playable_ready' && event.launch_session_id === retriedInstantSession).length, 1);

await resetJourney();
await page.locator('[data-first-play-path="no_asset"]').click();
await page.locator('[data-instant-game]').first().click();
await page.locator('[data-demo-error="instant_launch_failed"]').click();
await page.locator('#launchError [data-action="choose-another-instant-game"]').click();
assert.equal(await page.locator('#pageInstantPlay.active').count(), 1, '换一款游戏必须返回秒玩频道');
assert.equal((await savedFirstPlay()).firstPlayStage, 'content_ready');
assert.equal((await savedFirstPlay()).launchSessionId, null);

await resetJourney('portrait', 'overseas');
await page.locator('[data-first-play-path="no_asset"]').click();
await page.locator('[data-free-download-game]').first().click();
await page.locator('[data-action="start-free-download"]').click();
const failedDownloadSession = (await savedFirstPlay()).downloadSessionId;
await page.locator('[data-demo-error="download_failed"]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'download_failed');
assert.equal(await page.locator('#freeDownloadError:not([hidden])').count(), 1);
assert.equal(await page.locator('#pageFreeDownload .free-download-secondary').isHidden(), true, '错误卡出现时不得重复显示第二个 Choose another way');
await assertNoOverseasForbiddenCopy('海外下载失败页');
assert.equal((await savedFirstPlay()).downloadSessionId, null, '下载失败必须清理活动 token');
assertFailureResult(await eventSnapshot(), 'free_download', 'download', 'download_failed');
await page.waitForTimeout(760);
assert.equal((await eventSnapshot()).some(event => event.name === 'first_play_stage_result' && event.stage === 'download' && event.result === 'success'), false, '下载失败后的旧任务不得回写成功');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);
assert((await page.locator('#freeDownloadError').innerText()).includes('Download failed'));
await page.locator('#freeDownloadError [data-action="retry-free-download-error"]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'downloading');
assert.notEqual((await savedFirstPlay()).downloadSessionId, failedDownloadSession, '重试下载必须使用新 token');
await page.waitForFunction(() => onboardingFlow.firstPlayStage === 'installed');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);

await resetJourney('portrait', 'overseas');
await page.locator('[data-first-play-path="no_asset"]').click();
await page.locator('[data-free-download-game]').first().click();
await page.locator('[data-action="start-free-download"]').click();
await page.waitForFunction(() => onboardingFlow.firstPlayStage === 'installing');
const failedInstallSession = (await savedFirstPlay()).downloadSessionId;
await page.locator('[data-demo-error="space_insufficient"]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'space_insufficient');
assert.equal(await page.locator('#freeDownloadError:not([hidden])').count(), 1);
await assertNoOverseasForbiddenCopy('海外空间不足页');
assert.equal((await savedFirstPlay()).downloadSessionId, null, '空间不足必须清理安装 token');
assertFailureResult(await eventSnapshot(), 'free_download', 'install', 'space_insufficient');
await page.waitForTimeout(520);
assert.equal((await eventSnapshot()).some(event => event.name === 'first_play_stage_result' && event.stage === 'install' && event.result === 'success'), false, '空间不足后的旧安装任务不得回写成功');
await page.locator('#freeDownloadError [data-action="retry-free-download-error"]').click();
assert.equal((await savedFirstPlay()).firstPlayStage, 'installing');
assert.notEqual((await savedFirstPlay()).downloadSessionId, failedInstallSession, '重试安装必须使用新 token');
await page.waitForFunction(() => onboardingFlow.firstPlayStage === 'installed');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);

await resetJourney('portrait', 'overseas');
await page.locator('[data-first-play-path="no_asset"]').click();
await page.locator('[data-free-download-game]').first().click();
await page.locator('[data-action="start-free-download"]').click();
await page.waitForFunction(() => onboardingFlow.firstPlayStage === 'installing');
await page.locator('[data-demo-error="install_failed"]').click();
assert.equal(await page.locator('#freeDownloadError:not([hidden])').count(), 1);
await assertNoOverseasForbiddenCopy('海外安装失败页');
assertFailureResult(await eventSnapshot(), 'free_download', 'install', 'install_failed');
await page.locator('#freeDownloadError [data-action="return-to-paths"]').click();
assert.equal(await page.locator('#pageStartMethod.active').count(), 1, '安装失败必须可返回资产分流');
await page.waitForTimeout(520);
assert.equal((await eventSnapshot()).some(event => event.name === 'first_play_stage_result' && event.stage === 'install' && event.result === 'success'), false, '换路后旧安装任务不得污染新路径');
assert.equal((await eventSnapshot()).some(event => event.name === 'playable_ready'), false);

// 横屏关键页几何与截图
await resetJourney('landscape');
await page.locator('[data-action="browse-home"]').click();
await assertHomeContinue('免费秒玩15分钟', 'instant_play', 'selected');
assert.equal(await page.locator('.home-landscape-heroes .home-landscape-hero').count(), 2, '横屏首页必须保留双 Hero');
assert.equal(await page.locator('.home-landscape-topbar [data-home-search]').isVisible(), true, '横屏顶栏缺少搜索入口');
assert.equal(await page.locator('.home-landscape-topbar [data-home-device]').isVisible(), true, '横屏顶栏缺少设备入口');
assert.equal(await page.locator('.home-landscape-topbar [data-home-controller]').isVisible(), true, '横屏顶栏缺少手柄状态');
assert.equal(
  await page.locator('.home-landscape-topbar [data-landscape-icon]').evaluateAll(nodes => nodes.length >= 8 && new Set(nodes.map(node => node.dataset.landscapeIcon)).size === nodes.length),
  true,
  '横屏顶栏图标必须语义独立且不重复',
);
for (const [selector, label] of [
  ['.home-landscape-topbar', '横屏首页顶栏'],
  ['[data-action="home-continue"]', '横屏首页 Continue'],
  ['.home-landscape-hero:first-child', '横屏首页首个 Hero'],
  ['.home-landscape-hero:nth-child(2)', '横屏首页第二个 Hero'],
  ['.home-landscape-recommend-strip', '横屏首页推荐轨道'],
  ['.home-controller-hints', '横屏首页手柄提示'],
]) await assertInsidePhone(selector, label);
await capturePhone('07-home-continue-landscape.png');

await resetJourney('landscape');
await page.locator('[data-first-play-path="steam"]').click();
await page.reload();
await assertHomeContinue('继续登录Steam', 'steam', 'selected');
await assertInsidePhone('[data-action="home-continue"]', '横屏 Steam 续接 Continue');
await capturePhone('home-steam-continue-landscape.png');

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
await assertInsidePhone('[data-local-game][data-game-id="game_2"]', '横屏本地导入游戏卡');
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
await assertNoOverseasForbiddenCopy('横屏海外免费页');
await capturePhone('08-free-download-overseas-landscape.png');
assert.deepEqual(pageErrors, []);

if (capture) {
  assert.deepEqual(Object.keys(domGeometrySnapshots).sort(), [...primaryEvidenceNames].sort(), '8 张主证据必须全部包含 DOM 几何快照');
  fs.writeFileSync(
    path.join(evidenceDir, 'dom-geometry.json'),
    `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), screenshots: domGeometrySnapshots }, null, 2)}\n`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(evidenceDir, 'event-snapshots.json'),
    `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), paths: Object.fromEntries(Object.keys(eventSnapshots).map(pathName => [pathName, { state: completedPathStates[pathName], events: eventSnapshots[pathName] }])) }, null, 2)}\n`,
    'utf8',
  );
  const topLevelPngs = fs.readdirSync(evidenceDir)
    .filter(name => path.extname(name).toLowerCase() === '.png' && fs.statSync(path.join(evidenceDir, name)).isFile())
    .sort();
  assert.deepEqual(topLevelPngs, [...primaryEvidenceNames].sort(), 'workspace evidence 顶层必须恰好包含 8 张主截图');
  for (const name of primaryEvidenceNames) {
    const filePath = path.join(evidenceDir, name);
    const buffer = fs.readFileSync(filePath);
    assert(buffer.length > 1024, `${name} 不得为空图`);
    assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${name} 必须为 PNG`);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    const expected = name.includes('landscape') ? { width: 932, height: 430 } : { width: 390, height: 844 };
    assert.deepEqual({ width, height }, expected, `${name} 必须严格按 phone Shell 截取且不包含控制面板`);
  }
}

console.log('PASS segmented first-play onboarding smoke');
console.log(`Geometry: portrait ${portraitGeometry.width}x${portraitGeometry.height}; landscape ${landscapeGeometry.shell.width}x${landscapeGeometry.shell.height}; cards ${landscapeGeometry.cards.map(rect => `${Math.round(rect.width)}x${Math.round(rect.height)}`).join(', ')}`);
if (capture) console.log(`Evidence: ${evidenceDir}`);
} finally {
  if (browser) {
    try { await browser.close(); } catch {}
  }
  if (isolatedDir && fs.existsSync(isolatedDir)) fs.rmSync(isolatedDir, { recursive: true, force: true });
}

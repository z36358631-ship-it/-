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

const capture = process.argv.includes('--capture');
const evidenceDir = path.join(os.tmpdir(), 'gamehub-segmented-first-play-review');
if (capture) fs.mkdirSync(evidenceDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 940 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

await page.goto(pathToFileURL(demoPath).href);
assert.equal(await page.title(), '盖世游戏按游戏资产分流首玩 Demo');
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
  '海外文案表必须存在，但 Task 2 不接路径',
);
assert.equal(
  await page.evaluate(() => games.length >= 6 && games.every(game => /^data:image\/jpeg;base64,/.test(game.cover))),
  true,
  '游戏列表必须使用真实离线 JPEG 封面',
);

const phone = page.locator('.phone');
const portraitGeometry = await phone.evaluate(node => {
  const rect = node.getBoundingClientRect();
  return { width: rect.width, height: rect.height, orientation: node.dataset.orientation };
});
assert.equal(portraitGeometry.orientation, 'portrait');
assert.equal(portraitGeometry.width, 390);
assert.equal(portraitGeometry.height, 844);
if (capture) await phone.screenshot({ path: path.join(evidenceDir, 'asset-entry-portrait.png') });

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
if (capture) await phone.screenshot({ path: path.join(evidenceDir, 'asset-entry-landscape.png') });
assert.deepEqual(pageErrors, []);

await browser.close();
console.log('PASS segmented first-play onboarding smoke');
console.log(`Geometry: portrait ${portraitGeometry.width}x${portraitGeometry.height}; landscape ${landscapeGeometry.shell.width}x${landscapeGeometry.shell.height}; cards ${landscapeGeometry.cards.map(rect => `${Math.round(rect.width)}x${Math.round(rect.height)}`).join(', ')}`);
if (capture) console.log(`Evidence: ${evidenceDir}`);

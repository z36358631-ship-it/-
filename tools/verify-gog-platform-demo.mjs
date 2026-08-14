import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'demos', 'PC与Mac端', '盖世游戏GOG平台接入-交互标注版.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const mode = process.argv[2] || 'all';
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const pass = name => console.log(`PASS ${name}`);
const realPages = [
  'profile-portrait',
  'gog-login',
  'library-home-portrait',
  'library-home-landscape',
  'gog-library-portrait',
  'gog-library-landscape',
  'search-portrait',
  'search-landscape',
  'detail-portrait',
  'detail-landscape',
];

function shell() {
  for (const token of ['gogDemoShell','leftNav','demoCanvas','annoPanel','interactionTab','edgeTab','toggleMarkers','togglePanel'])
    assert(html.includes(token), `Missing shell token: ${token}`);
  pass('shell');
}
function pages() {
  for (const id of realPages)
    assert(html.includes(`id:'${id}'`) || html.includes(`id: '${id}'`), `Missing page: ${id}`);
  pass('pages');
}
function realPageStructure() {
  for (const token of [
    'renderProfilePortrait', 'renderLibraryHomePortrait', 'renderLibraryHomeLandscape',
    'renderGogLibraryPortrait', 'renderGogLibraryLandscape',
    'renderSearchPortrait', 'renderSearchLandscape',
    'renderDetailPortrait', 'renderDetailLandscape',
  ]) assert(html.includes(token), `Missing real-page renderer: ${token}`);
  pass('realPageStructure');
}
function gogCapabilities() {
  assert(/supportsAccountValue\s*:\s*false/.test(html), 'GOG must explicitly disable account value');
  assert(/accountValue\s*:\s*null/.test(html), 'GOG account value must be null');
  assert(!html.includes('¥6.8k'), 'Legacy fabricated GOG value remains');
  pass('gogCapabilities');
}
function accountMenu() {
  for (const token of [
    'data-action="toggle-account-menu"',
    'data-account-menu',
    '更新数据',
    '切换账号',
    '退出账号',
    'data-action="open-free-games"',
    '喜加一',
  ]) assert(html.includes(token), `Missing account-menu token: ${token}`);
  assert(/supportsFreeGames\s*:\s*false/.test(html), 'GOG must disable free-games entry');
  pass('accountMenu');
}
function platformModel() {
  for (const token of ['sourcePlatform','selectedPlatform','ownedPlatforms','platformAppId','gameId','resolveSelectedPlatform','lowConfidenceNoMerge'])
    assert(html.includes(token), `Missing model token: ${token}`);
  assert(html.includes("['steam','epic','gog']"), 'Default platform priority missing');
  pass('platformModel');
}
function fullGameplayScope() {
  for (const token of [
    'normalizeGameName',
    'matchGameCandidate',
    'sourcePlatform',
    'selectedPlatform',
    'renderPlatformSwitch',
    'data-detail-hours',
    'data-detail-cloud',
    'data-launch-platform',
    'launchSelectedPlatform',
    'platformAppId',
  ]) assert(html.includes(token), `Missing complete GOG token: ${token}`);
  assert(html.includes("['steam','epic','gog']"), 'Steam > EPIC > GOG priority missing');
  pass('fullGameplayScope');
}
function searchAndDetailCopy() {
  for (const token of [
    'search-result__cover-wrap',
    'search-result__platform',
    '获取游戏',
    'PC游戏引擎',
    '云存档',
    '游戏时长',
  ]) assert(html.includes(token), `Missing search/detail correction: ${token}`);
  assert(!html.includes('content:"获得游戏"'), 'Legacy detail copy must be removed');
  pass('searchAndDetailCopy');
}
function states() {
  for (const token of ['loading','empty','error','expired','cancelled','cached'])
    assert(html.includes(token), `Missing recovery state: ${token}`);
  pass('states');
}
function security() {
  assert(html.includes('GOG 官方登录'), 'Official login boundary missing');
  assert(html.includes('不保存邮箱或密码'), 'Credential-storage prohibition missing');
  assert(!html.includes("localStorage.setItem('gogPassword'"), 'GOG password must not be stored');
  pass('security');
}
function offlineAssets() {
  assert(!/(?:src|href)=["']https?:\/\//i.test(html), 'Runtime remote asset remains');
  assert(!/https:\/\/cdn\.cloudflare\.steamstatic\.com\//i.test(html), 'Remote Steam media remains');
  assert(!/@import\s+url\(/i.test(html), 'Remote CSS import remains');
  assert(!/<(?:iframe|canvas)\b/i.test(html), 'iframe/canvas is forbidden');
  pass('offlineAssets');
}
function visualSourceContracts() {
  for (const token of [
    'data-source-status="measured"',
    'data-source-status="derived"',
    'data-source-status="missing-source"',
    'portrait-app-shell',
    'handheld-app-shell',
  ]) assert(html.includes(token), `Missing visual source token: ${token}`);
  assert(!/class="[^"]*platform-icon[^"]*"[^>]*>[SEG]</.test(html), 'Text platform icon remains');
  pass('visualSourceContracts');
}
function syntax() {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert(scripts.length === 1, `Expected one inline script, found ${scripts.length}`);
  scripts.forEach((code, index) => new vm.Script(code, { filename: `gog-inline-${index}.js` }));
  pass('syntax');
}
const tasks = { shell, pages, realPageStructure, gogCapabilities, accountMenu, platformModel, fullGameplayScope, searchAndDetailCopy, states, security, offlineAssets, visualSourceContracts, syntax };
if (mode === 'all') Object.values(tasks).forEach(task => task());
else if (tasks[mode]) tasks[mode]();
else throw new Error(`Unknown mode: ${mode}`);

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '适合本机', '盖世游戏适合本机WebView-demo.html');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(demoPath)) {
  fail(`demo not found: ${demoPath}`);
  process.exit();
}

const html = fs.readFileSync(demoPath, 'utf8');
const required = [
  'id="compatibility-app"',
  'id="game-search"',
  'data-platform-badge',
  'data-demo-platform="android"',
  'data-demo-platform="mac"',
  'data-popular-game',
  'data-search-result',
  'data-compatibility-result',
  'data-config-toggle',
  'data-config-download',
  'data-config-applicability',
  'data-cover-image',
  'window.GameHubCompatibility',
  'setContext(context)',
  'setCatalog(catalog)',
  'setCatalogLoading()',
  'setCatalogError()',
  'onDownloadResult(result)',
  'resolvePlatform(context)',
  'filteredCatalog()',
  'containsCrossPlatformConfig(',
  'renderSearchPanel()',
  'renderPopularGames()',
  'renderCompatibilityResult()',
  'renderConfigDetail(',
  'startDownload(configId)',
  'GameHubBridge.downloadConfig',
  'URL.createObjectURL',
  'Android',
  'Mac',
  '搜索游戏名称',
  '启动配置',
  '下载配置',
  '暂无兼容数据',
  '已发起下载'
];

const legacy = [
  'id="game-select"',
  'id="target-select"',
  'id="rating-select"',
  '最低评价（可选）',
  'data-sort-field="rating"',
  'data-sort-field="verifiedAt"',
  'downloadAndApplyConfig',
  '下载并应用',
  'openGame(gameId',
  'openGpu(gpuId'
];

const covers = [
  'black-myth-wukong.jpg',
  'elden-ring.jpg',
  'hades.jpg',
  'sekiro.jpg',
  'cyberpunk-2077.jpg',
  'starfield.jpg'
];

for (const contract of required) {
  if (!html.includes(contract)) fail(`missing contract: ${contract}`);
}

for (const marker of legacy) {
  if (html.includes(marker)) fail(`legacy contract remains: ${marker}`);
}

const platformContracts = [
  'platform: "android"',
  'platform: "mac"',
  'platformSource',
  'Bridge > query > Demo',
  'androidVersion',
  'macosVersion',
  'appleChip',
  'mobileGpu'
];

for (const contract of platformContracts) {
  if (!html.includes(contract)) fail(`missing platform contract: ${contract}`);
}

const dataContracts = [
  'hardware: [',
  'hardwareIds:',
  'filters: {',
  'gameId: null',
  'hardwareId: null',
  'ratingMin: null',
  'queries: {',
  'openFilter: null',
  'viewer: {',
  'recordId: null',
  'filterRecords()',
  'sortRecords(records)',
  '最低评分（≥）'
];

for (const contract of dataContracts) {
  if (!html.includes(contract)) fail(`missing data contract: ${contract}`);
}

const coverDir = path.join(path.dirname(demoPath), 'assets', 'compatibility');
for (const cover of covers) {
  const coverPath = path.join(coverDir, cover);
  if (!fs.existsSync(coverPath)) fail(`cover not found: ${cover}`);
  else if (fs.statSync(coverPath).size < 20_000) fail(`cover is too small: ${cover}`);
}

const forbidden = [
  { pattern: /<script\b[^>]*\bsrc\s*=/i, label: 'external script' },
  { pattern: /<link\b[^>]*\bhref\s*=/i, label: 'external stylesheet' },
  { pattern: /<iframe\b/i, label: 'iframe' },
  { pattern: /https?:\/\//i, label: 'network URL' }
];

for (const item of forbidden) {
  if (item.pattern.test(html)) fail(`forbidden dependency: ${item.label}`);
}

const scriptMatches = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
if (scriptMatches.length === 0) {
  fail('no inline script found');
} else {
  const script = scriptMatches.map((match) => match[1]).join('\n');
  try {
    new Function(script);
  } catch (error) {
    fail(`JavaScript syntax error: ${error.message}`);
  }
}

if (process.exitCode) process.exit();

console.log('PASS: platform-aware compatibility H5 contracts, local assets, download API, offline policy, and JavaScript syntax');

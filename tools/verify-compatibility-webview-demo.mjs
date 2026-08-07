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
  'id="game-select"',
  'id="target-select"',
  'id="rating-select"',
  'data-popular-game',
  'data-result-row',
  'data-result-card',
  'data-sort-field="rating"',
  'data-sort-field="verifiedAt"',
  'window.GameHubCompatibility',
  'setContext(context)',
  'setCatalog(catalog)',
  'setCatalogLoading()',
  'setCatalogError()',
  'filteredRuns()',
  'renderPopularGames()',
  'renderResults()',
  '选择游戏',
  '设备 / GPU',
  '最低评价（可选）',
  '热门游戏',
  '平均 FPS',
  '验证时间'
];

const legacy = [
  'id="game-view"',
  'id="gpu-view"',
  'id="config-view"',
  '按游戏查',
  '按 GPU 查',
  'filter-sidebar',
  'filter-panel',
  'downloadAndApplyConfig',
  'downloadConfig',
  'openGame(gameId',
  'openGpu(gpuId',
  'openConfig(configId'
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

console.log('PASS: compatibility reference redesign contracts, local assets, offline policy, and JavaScript syntax');

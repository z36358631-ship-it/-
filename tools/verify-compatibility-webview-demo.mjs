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
  'id="device-card"',
  'id="game-grid"',
  'id="detail-view"',
  'id="troubleshooting"',
  'window.GameHubCompatibility',
  'setContext(context)',
  'setGames(games)',
  'setGamesLoading()',
  'setGamesError()',
  'setActionResult(result',
  'openGame(gameId)',
  'applyPlanAndLaunch',
  'applyPlanAndDownload',
  'openGameDetail',
  '可直接玩',
  '调整后可玩',
  '暂不建议',
  '暂无结论',
  '当前设备已验证',
  '同 GPU 设备已验证',
  '同类设备参考',
  '样本较少',
  '无法启动',
  '黑屏',
  '闪退',
  '手柄异常',
  '声音/画面问题'
];

for (const contract of required) {
  if (!html.includes(contract)) fail(`missing contract: ${contract}`);
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

console.log('PASS: compatibility WebView demo contracts, offline policy, and JavaScript syntax');

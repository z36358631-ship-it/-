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
  'data-demo-screen="pc-games"',
  'data-demo-screen="game-detail"',
  'data-demo-screen="compatibility"',
  'data-native-screen="pc-games"',
  'data-native-screen="game-detail"',
  'data-open-compatibility=',
  'data-entry-game-id=',
  'data-open-game-detail',
  'data-native-back',
  'data-config-applicability',
  'data-filter-select="game"',
  'data-filter-select="hardware"',
  'data-filter-select="rating"',
  'data-filter-trigger=',
  'data-filter-query=',
  'data-filter-option=',
  'data-filter-clear=',
  'data-clear-filters',
  'data-result-count',
  'data-view-mode="list"',
  'data-view-mode="grid"',
  'data-record-table',
  'data-record-cards',
  'data-record-row=',
  'data-record-open=',
  'data-compatibility-status',
  'data-sort-field="rating"',
  'data-sort-field="verifiedAt"',
  'data-config-viewer',
  'data-evaluation-viewer',
  'data-config-choice=',
  'data-config-close',
  'data-config-copy=',
  'role="dialog"',
  'aria-modal="true"',
  'data-cover-image',
  'window.GameHubCompatibility',
  'setContext(context)',
  'setCatalog(catalog)',
  'setCatalogLoading()',
  'setCatalogError()',
  'resolvePlatform(context)',
  'filteredCatalog()',
  'containsCrossPlatformConfig(',
  'renderConfigDetail(',
  'renderFilterBar()',
  'renderSearchableFilter(',
  'renderSearchableSelect(',
  'renderRecordResults()',
  'renderRecordTable(',
  'renderRecordCards(',
  'renderCompactRecord(',
  'hotRecords()',
  'recordConfigs(',
  'renderConfigChoice(',
  'renderConfigViewer()',
  'openEvaluationViewer(recordId)',
  'closeConfigViewer()',
  'copyConfig(configId)',
  'configShareText(config, record)',
  'copyIcon()',
  'filterChevronIcon()',
  'copySuccessIcon()',
  'copyFeedbackLabel(',
  'syncCopyFeedback(',
  'renderPcGamesPortrait()',
  'renderPcGamesLandscape()',
  'renderGameDetailPortrait()',
  'renderGameDetailLandscape()',
  'openCompatibility(source, gameId)',
  'returnFromCompatibility()',
  'Android',
  '搜索游戏名称',
  'label: "机型"',
  'placeholder: "搜索机型"',
  'label: "评级"',
  '不可玩',
  '基本可玩',
  '完美兼容',
  '有部分问题',
  '环境变量',
  '启动参数',
  'GPU 驱动',
  'DXVK 版本',
  'VKD3D 版本',
  'CPU 转译器',
  '复制分享码',
  '复制中…',
  '✓ 已复制',
  '复制失败，点击重试',
  '平均帧率 ',
  'SCFG##',
  'shareCode',
  '暂无兼容数据',
  '复制失败，请重试'
];

const legacy = [
  'data-demo-platform="mac"',
  'id="game-select"',
  'id="target-select"',
  'id="rating-select"',
  '最低评价（可选）',
  'downloadAndApplyConfig',
  '下载并应用',
  'openGame(gameId',
  'openGpu(gpuId',
  'gameQuery',
  'selectedGameId',
  'expandedConfigId',
  'renderPopularGames()',
  'renderCompatibilityResult()',
  'id="game-search"',
  'data-popular-game',
  'data-search-result',
  'data-compatibility-result',
  'result-hero',
  'verdict-card',
  'data-config-toggle',
  'config-toggle-state',
  '收起',
  '添加筛选条件开始查询',
  '查看配置（',
  'data-config-open=',
  'data-record-download=',
  '处理器 / CPU',
  '机型 / 芯片',
  '搜索处理器、设备或 GPU',
  'Wine 9.2 · GS3',
  '复制启动配置',
  'GameHubBridge.downloadConfig',
  'URL.createObjectURL',
  'startDownload(configId)',
  'record.tags.map(',
  '<small>评级</small>',
  '返回Android游戏',
  '返回Mac游戏',
  '<span>⌄</span>',
  'copy-message',
  'copy-toast',
  '分享码已复制，可打开盖世游戏导入'
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
  'platformSource',
  'Bridge > query > Demo',
  'screen: requestedScreen',
  'entryReturn: null',
  'currentDeviceId: CURRENT_DEVICE_ID',
  'gameId: requestedScreen === "compatibility" ? requestedGameId : null',
  'hardwareId: requestedScreen === "compatibility" ? CURRENT_DEVICE_ID : null',
  'androidVersion',
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
  'viewMode: "list"',
  'viewer: {',
  'recordId: null',
  'copy: {',
  'requestId: null',
  'copyFeedbackTimer',
  'filterRecords()',
  'sortRecords(records)',
  'COMPATIBILITY_STATUSES'
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

console.log('PASS: App entry routes, game/device preselection, compatibility H5 contracts, share codes, offline policy, and JavaScript syntax');

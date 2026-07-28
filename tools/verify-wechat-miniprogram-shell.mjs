import assert from 'node:assert/strict';
import path from 'node:path';
import vm from 'node:vm';
import { promises as fs } from 'node:fs';

const root = process.cwd();
const shellRoot = path.join(root, 'demos', '微信H5精品游戏', 'wechat-miniprogram-shell');
const requiredFiles = [
  'app.js',
  'app.json',
  'app.wxss',
  'project.config.json',
  'sitemap.json',
  'pages/index/index.js',
  'pages/index/index.json',
  'pages/index/index.wxml',
  'pages/index/index.wxss',
  'pages/game/game.js',
  'pages/game/game.json',
  'pages/game/game.wxml',
  'pages/game/game.wxss',
  'README.md'
];

const sources = new Map();
for (const relativeFile of requiredFiles) {
  const file = path.join(shellRoot, ...relativeFile.split('/'));
  const source = await fs.readFile(file, 'utf8');
  assert(source.trim().length > 0, `${relativeFile} 为空`);
  sources.set(relativeFile, source);
  process.stdout.write(`${relativeFile.padEnd(30)} EXISTS\n`);
}

for (const relativeFile of requiredFiles.filter(file => file.endsWith('.json'))) {
  assert.doesNotThrow(
    () => JSON.parse(sources.get(relativeFile)),
    undefined,
    `${relativeFile} 不是合法 JSON`
  );
  process.stdout.write(`${relativeFile.padEnd(30)} JSON PASS\n`);
}

for (const relativeFile of requiredFiles.filter(file => file.endsWith('.js'))) {
  assert.doesNotThrow(
    () => new vm.Script(sources.get(relativeFile), { filename: relativeFile }),
    undefined,
    `${relativeFile} JavaScript 语法错误`
  );
  process.stdout.write(`${relativeFile.padEnd(30)} JS PASS\n`);
}

const appConfig = JSON.parse(sources.get('app.json'));
assert.deepEqual(
  appConfig.pages,
  ['pages/index/index', 'pages/game/game'],
  'app.json 页面路由不完整'
);

const projectConfig = JSON.parse(sources.get('project.config.json'));
assert.equal(projectConfig.compileType, 'miniprogram', '项目类型不是 miniprogram');
assert.equal(projectConfig.setting?.urlCheck, true, '不应关闭业务域名校验');

const appSource = sources.get('app.js');
assert(/h5GameBaseUrl\s*:\s*""/.test(appSource), '默认 H5 域名必须留空，避免误连示例域名');

const gameSource = sources.get('pages/game/game.js');
for (const file of [
  '01-five-seconds-later.html',
  '02-world-mender.html',
  '03-rift-hunter.html'
]) {
  assert(gameSource.includes(file), `游戏承载页缺少路由 ${file}`);
}
assert(!/\bwx\.login\b|\bwx\.requestPayment\b/.test(gameSource), '试玩壳不应接入登录或支付');

let gamePageDefinition;
const gameRuntime = {
  baseUrl: '',
  calls: { titles: [], reLaunches: [] },
  navigateBackShouldFail: false,
  Page(definition) {
    gamePageDefinition = definition;
  },
  Object,
  String,
  getApp() {
    return { globalData: { h5GameBaseUrl: gameRuntime.baseUrl } };
  },
  wx: {
    setNavigationBarTitle(value) {
      gameRuntime.calls.titles.push(value);
    },
    navigateBack(options) {
      if (gameRuntime.navigateBackShouldFail) options?.fail?.();
    },
    reLaunch(value) {
      gameRuntime.calls.reLaunches.push(value);
    }
  }
};
vm.runInNewContext(gameSource, gameRuntime, { filename: 'pages/game/game.js' });
assert(gamePageDefinition, '游戏承载页未注册 Page');

function exerciseGamePage(baseUrl, game = 'hunter') {
  const data = {};
  gameRuntime.baseUrl = baseUrl;
  gameRuntime.calls = { titles: [], reLaunches: [] };
  const page = {
    ...gamePageDefinition,
    data: { ...gamePageDefinition.data },
    setData(next) {
      Object.assign(data, next);
      Object.assign(this.data, next);
    }
  };
  gamePageDefinition.onLoad.call(page, { game });
  return { data, calls: gameRuntime.calls, page };
}

for (const invalidBaseUrl of [
  '',
  'http://game.example.com/path',
  'https:///broken',
  'https://game..example.com/path',
  'https://game.example.com:8443/path',
  'https://game.example.com/path?env=test',
  'https://game.example.com/path#preview',
  'https://user:secret@game.example.com/path'
]) {
  const result = exerciseGamePage(invalidBaseUrl);
  assert.equal(result.data.ready, undefined, `非法域名不应进入 ready：${invalidBaseUrl}`);
  assert(result.data.error, `非法域名缺少错误态：${invalidBaseUrl}`);
}

const validPage = exerciseGamePage('  https://game.example.com/wechat-h5-premium-games///  ');
assert.equal(validPage.data.ready, true, '合法 HTTPS 目录未进入 ready');
assert.equal(
  validPage.data.gameUrl,
  'https://game.example.com/wechat-h5-premium-games/03-rift-hunter.html',
  '合法 HTTPS 目录拼接错误'
);

const unknownGame = exerciseGamePage('https://game.example.com/wechat-h5-premium-games', 'unknown');
assert.notEqual(unknownGame.data.ready, true, '未知游戏参数不应静默进入默认游戏');
assert(unknownGame.data.error.includes('游戏标识无效'), '未知游戏参数缺少明确错误态');

gameRuntime.navigateBackShouldFail = true;
gameRuntime.calls = { titles: [], reLaunches: [] };
gamePageDefinition.goBack.call({});
assert.equal(gameRuntime.calls.reLaunches.length, 1, '深链返回失败时未调用 reLaunch');
assert.equal(gameRuntime.calls.reLaunches[0].url, '/pages/index/index', '深链返回失败时未重启到游戏列表');

const gameTemplate = sources.get('pages/game/game.wxml');
assert(/<web-view\s+wx:if="\{\{ready\}\}"\s+src="\{\{gameUrl\}\}"/.test(gameTemplate), '游戏页缺少受配置保护的 web-view');
assert(gameTemplate.includes('wx:else'), '域名未配置时缺少错误态');

const indexSource = sources.get('pages/index/index.js');
for (const gameId of ['five', 'mender', 'hunter']) {
  assert(indexSource.includes(`id: "${gameId}"`), `首页缺少游戏 ${gameId}`);
}

process.stdout.write('微信小程序 web-view 试玩壳静态验收 PASS\n');

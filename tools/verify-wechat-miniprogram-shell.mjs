import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {
  createVerificationMetadata,
  errorText,
  writeJsonAtomic
} from './verification-metadata.mjs';

const root = process.cwd();
const shellRoot = path.join(root, 'demos', '微信H5精品游戏', 'wechat-miniprogram-shell');
const outputFile = path.join(
  root,
  'test-results',
  'wechat-h5-premium-games',
  'miniprogram-shell-verification.json'
);
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
const testedPaths = [
  ...requiredFiles.map(relative => (
    `demos/微信H5精品游戏/wechat-miniprogram-shell/${relative}`
  )),
  'tools/verification-metadata.mjs',
  'tools/verify-wechat-miniprogram-shell.mjs'
].sort();

const checks = [];
const sources = new Map();
let fatalError;

function record(id, status, detail) {
  checks.push({ id, status, detail });
  const stream = status === 'PASS' ? process.stdout : process.stderr;
  stream.write(`${id.padEnd(48)} ${status} · ${detail}\n`);
}

function check(id, successDetail, callback) {
  try {
    callback();
    record(id, 'PASS', successDetail);
    return true;
  } catch (error) {
    record(id, 'FAIL', errorText(error));
    return false;
  }
}

async function readRequiredFiles() {
  for (const relativeFile of requiredFiles) {
    const id = `file:${relativeFile}`;
    try {
      const file = path.join(shellRoot, ...relativeFile.split('/'));
      const source = await fs.readFile(file, 'utf8');
      assert(source.trim().length > 0, `${relativeFile} 为空`);
      sources.set(relativeFile, source);
      record(id, 'PASS', '文件存在且非空');
    } catch (error) {
      record(id, 'FAIL', errorText(error));
    }
  }
}

async function run() {
  await readRequiredFiles();

  for (const relativeFile of requiredFiles.filter(file => file.endsWith('.json'))) {
    check(`json:${relativeFile}`, 'JSON 语法有效', () => {
      assert(sources.has(relativeFile), `${relativeFile} 无法读取`);
      JSON.parse(sources.get(relativeFile));
    });
  }

  for (const relativeFile of requiredFiles.filter(file => file.endsWith('.js'))) {
    check(`javascript:${relativeFile}`, 'JavaScript 语法有效', () => {
      assert(sources.has(relativeFile), `${relativeFile} 无法读取`);
      new vm.Script(sources.get(relativeFile), { filename: relativeFile });
    });
  }

  check('app:page-routes', 'app.json 包含列表页和游戏页路由', () => {
    const appConfig = JSON.parse(sources.get('app.json'));
    assert.deepEqual(
      appConfig.pages,
      ['pages/index/index', 'pages/game/game'],
      'app.json 页面路由不完整'
    );
  });

  check('project:compile-type', '项目类型为 miniprogram', () => {
    const projectConfig = JSON.parse(sources.get('project.config.json'));
    assert.equal(projectConfig.compileType, 'miniprogram', '项目类型不是 miniprogram');
  });

  check('project:url-check', '业务域名校验保持开启', () => {
    const projectConfig = JSON.parse(sources.get('project.config.json'));
    assert.equal(projectConfig.setting?.urlCheck, true, '不应关闭业务域名校验');
  });

  check('app:base-url-empty', '默认 H5 域名为空', () => {
    const appSource = sources.get('app.js');
    assert(/h5GameBaseUrl\s*:\s*""/u.test(appSource), '默认 H5 域名必须留空，避免误连示例域名');
  });

  const gameSource = sources.get('pages/game/game.js') ?? '';
  for (const file of [
    '01-five-seconds-later.html',
    '02-world-mender.html',
    '03-rift-hunter.html'
  ]) {
    check(`route:${file}`, `游戏承载页包含 ${file}`, () => {
      assert(gameSource.includes(file), `游戏承载页缺少路由 ${file}`);
    });
  }

  check('guard:no-login-or-payment', '试玩壳未接入登录或支付', () => {
    assert(!/\bwx\.login\b|\bwx\.requestPayment\b/u.test(gameSource), '试玩壳不应接入登录或支付');
  });

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

  check('runtime:page-registration', '游戏承载页已注册 Page', () => {
    vm.runInNewContext(gameSource, gameRuntime, { filename: 'pages/game/game.js' });
    assert(gamePageDefinition, '游戏承载页未注册 Page');
  });

  function exerciseGamePage(baseUrl, game = 'hunter') {
    assert(gamePageDefinition, '游戏承载页未成功注册，无法执行行为验收');
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

  for (const [index, invalidBaseUrl] of [
    '',
    'http://game.example.com/path',
    'https:///broken',
    'https://game..example.com/path',
    'https://game.example.com:8443/path',
    'https://game.example.com/path?env=test',
    'https://game.example.com/path#preview',
    'https://user:secret@game.example.com/path'
  ].entries()) {
    check(`guard:invalid-base-url:${index + 1}`, `拒绝非法地址 ${invalidBaseUrl || '(empty)'}`, () => {
      const result = exerciseGamePage(invalidBaseUrl);
      assert.equal(result.data.ready, undefined, `非法域名不应进入 ready：${invalidBaseUrl}`);
      assert(result.data.error, `非法域名缺少错误态：${invalidBaseUrl}`);
    });
  }

  check('route:valid-https-base-url', '合法 HTTPS 目录正确拼接游戏地址', () => {
    const validPage = exerciseGamePage('  https://game.example.com/wechat-h5-premium-games///  ');
    assert.equal(validPage.data.ready, true, '合法 HTTPS 目录未进入 ready');
    assert.equal(
      validPage.data.gameUrl,
      'https://game.example.com/wechat-h5-premium-games/03-rift-hunter.html',
      '合法 HTTPS 目录拼接错误'
    );
  });

  check('guard:unknown-game', '未知游戏参数进入明确错误态', () => {
    const unknownGame = exerciseGamePage(
      'https://game.example.com/wechat-h5-premium-games',
      'unknown'
    );
    assert.notEqual(unknownGame.data.ready, true, '未知游戏参数不应静默进入默认游戏');
    assert(unknownGame.data.error.includes('游戏标识无效'), '未知游戏参数缺少明确错误态');
  });

  check('navigation:back-fallback', '深链返回失败时重启到列表页', () => {
    assert(gamePageDefinition, '游戏承载页未成功注册，无法验证返回降级');
    gameRuntime.navigateBackShouldFail = true;
    gameRuntime.calls = { titles: [], reLaunches: [] };
    gamePageDefinition.goBack.call({});
    assert.equal(gameRuntime.calls.reLaunches.length, 1, '深链返回失败时未调用 reLaunch');
    assert.equal(
      gameRuntime.calls.reLaunches[0].url,
      '/pages/index/index',
      '深链返回失败时未重启到游戏列表'
    );
  });

  check('template:guarded-web-view', 'web-view 仅在配置有效时显示', () => {
    const gameTemplate = sources.get('pages/game/game.wxml');
    assert(
      /<web-view\s+wx:if="\{\{ready\}\}"\s+src="\{\{gameUrl\}\}"/u.test(gameTemplate),
      '游戏页缺少受配置保护的 web-view'
    );
  });

  check('template:error-fallback', '域名未配置时显示错误态', () => {
    const gameTemplate = sources.get('pages/game/game.wxml');
    assert(gameTemplate.includes('wx:else'), '域名未配置时缺少错误态');
  });

  const indexSource = sources.get('pages/index/index.js') ?? '';
  for (const gameId of ['five', 'mender', 'hunter']) {
    check(`index:game:${gameId}`, `首页包含游戏 ${gameId}`, () => {
      assert(indexSource.includes(`id: "${gameId}"`), `首页缺少游戏 ${gameId}`);
    });
  }
}

try {
  await run();
} catch (error) {
  fatalError = errorText(error);
  record('fatal:unexpected', 'FAIL', fatalError);
}

const failures = checks.filter(item => item.status === 'FAIL');
const report = {
  ...await createVerificationMetadata({ root, testedPaths }),
  scope: '微信小程序 web-view 试玩壳静态与 VM 行为验收',
  exitCode: failures.length > 0 ? 1 : 0,
  summary: {
    total: checks.length,
    pass: checks.length - failures.length,
    fail: failures.length
  },
  checks,
  ...(fatalError ? { fatalError } : {})
};
await writeJsonAtomic(outputFile, report);

if (failures.length > 0) {
  process.stderr.write(`微信小程序 web-view 试玩壳静态验收 FAIL · ${failures.length} 项失败\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('微信小程序 web-view 试玩壳静态验收 PASS\n');
}
process.stdout.write(`机读报告：${path.relative(root, outputFile)}\n`);

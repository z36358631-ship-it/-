import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fsSync from 'node:fs';
import { promises as fs } from 'node:fs';
import { chromium } from 'playwright-core';

const root = process.cwd();
const outputDir = path.join(root, 'test-results', 'wechat-h5-premium-games');
const demoRoot = '/demos/%E5%BE%AE%E4%BF%A1H5%E7%B2%BE%E5%93%81%E6%B8%B8%E6%88%8F';
const entries = [
  { id: 'hub', file: 'index.html', game: false },
  { id: 'five-seconds-later', file: '01-five-seconds-later.html', game: true },
  { id: 'world-mender', file: '02-world-mender.html', game: true },
  { id: 'rift-hunter', file: '03-rift-hunter.html', game: true }
];
const viewports = [
  { id: 'compact', width: 360, height: 800 },
  { id: 'baseline', width: 390, height: 844 },
  { id: 'large', width: 430, height: 932 }
];

function contentType(file) {
  const extension = path.extname(file).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  }[extension] || 'application/octet-stream';
}

function startServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
      const requested = path.resolve(root, `.${pathname}`);
      if (!requested.startsWith(root)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      const stat = await fs.stat(requested);
      const file = stat.isDirectory() ? path.join(requested, 'index.html') : requested;
      const body = await fs.readFile(file);
      response.writeHead(200, {
        'Content-Type': contentType(file),
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function browserExecutable() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const executable = candidates.find(candidate => fsSync.existsSync(candidate));
  assert(executable, `未找到本地 Chrome 或 Edge：${candidates.join(', ')}`);
  return executable;
}

async function verifySources() {
  const requiredEvents = [
    'game_start',
    'first_input',
    'mechanic_reveal',
    'phase_change',
    'core_payoff',
    'run_end',
    'replay_start',
    'lifecycle_pause',
    'lifecycle_resume'
  ];
  for (const entry of entries.filter(item => item.game)) {
    const file = path.join(root, 'demos', '微信H5精品游戏', entry.file);
    const source = await fs.readFile(file, 'utf8');
    assert(source.includes('window.__GAME_TEST__'), `${entry.id} 缺少统一测试接口`);
    assert(source.includes('GamePlatform'), `${entry.id} 缺少平台适配器`);
    assert(source.includes('visibilitychange'), `${entry.id} 缺少页面生命周期处理`);
    for (const event of requiredEvents) {
      assert(source.includes(`"${event}"`) || source.includes(`'${event}'`), `${entry.id} 缺少公共事件 ${event}`);
    }
    assert(!/<script[^>]+src\s*=/i.test(source), `${entry.id} 不应加载外部脚本`);
    assert(!/<iframe\b/i.test(source), `${entry.id} 不应包含 iframe`);
    const externalResources = [...source.matchAll(/<(?:img|audio|video|source|link)[^>]+(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)/gi)]
      .map(match => match[1]);
    assert.equal(externalResources.length, 0, `${entry.id} 存在外部资源 ${externalResources.join(', ')}`);
  }
}

async function clickMatchingButton(page, pattern) {
  const buttons = page.locator('button:visible, [role="button"]:visible');
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const text = (await button.innerText().catch(() => '')).trim();
    if (pattern.test(text)) {
      await button.click({ timeout: 1500 }).catch(() => {});
      return true;
    }
  }
  return false;
}

async function driveCanvas(page, durationMs) {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) return;
  const points = [
    [0.25, 0.24], [0.72, 0.25], [0.76, 0.7], [0.28, 0.73],
    [0.5, 0.43], [0.82, 0.5], [0.5, 0.8], [0.18, 0.5]
  ];
  const endAt = Date.now() + durationMs;
  let index = 0;
  while (Date.now() < endAt) {
    const mode = await page.evaluate(() => window.__GAME_TEST__?.getState?.().mode).catch(() => null);
    if (mode && !['playing', 'paused'].includes(mode)) break;
    const [startX, startY] = points[index % points.length];
    const [endX, endY] = points[(index + 1) % points.length];
    await page.mouse.move(box.x + box.width * startX, box.y + box.height * startY);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * endX, box.y + box.height * endY, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(180);
    const nextMode = await page.evaluate(() => {
      const game = window.__GAME_TEST__;
      if (game?.getState?.().mode === 'paused' && typeof game.resume === 'function') game.resume();
      return game?.getState?.().mode || null;
    }).catch(() => {});
    if (nextMode && !['playing', 'paused'].includes(nextMode)) break;
    index += 1;
  }
}

async function runBaselineScenario(page, gameId) {
  if (gameId === 'world-mender') {
    const mechanic = await page.evaluate(() => {
      const game = window.__GAME_TEST__;
      game.start();
      game.connect('w1', 'w2');
      game.connect('n1', 'n2');
      game.connect('e1', 'e2');
      game.connect('g1', 'g2');
      game.advance(25);
      return game.getState();
    });
    assert.equal(mechanic.bridgeBuilt, true, '世界缝补师未建立桥梁');
    assert.equal(mechanic.barrierBuilt, true, '世界缝补师未建立风沙屏障');
    assert.equal(mechanic.gardenConnected, true, '世界缝补师未连接中心花园');
    await page.screenshot({ path: path.join(outputDir, `${gameId}-mechanic.png`), fullPage: false });
    const final = await page.evaluate(() => {
      window.__GAME_TEST__.advance(100);
      return window.__GAME_TEST__.getState();
    });
    assert.equal(final.phase, 'won', `世界缝补师标准路线未胜利：${JSON.stringify(final)}`);
    assert(final.saved >= 9, `世界缝补师获救数量不足：${final.saved}`);
    await page.screenshot({ path: path.join(outputDir, `${gameId}-result.png`), fullPage: false });
    const failure = await page.evaluate(() => {
      const game = window.__GAME_TEST__;
      game.reset();
      game.start();
      game.finish();
      return game.getState();
    });
    assert.equal(failure.phase, 'lost', '世界缝补师空路线未失败');
    assert.equal(failure.saved, 0, '世界缝补师空路线不应救回生命');
    return { mechanic, final, failure };
  }

  if (gameId === 'rift-hunter') {
    await page.evaluate(() => {
      window.__GAME_TEST__.grantXp(260);
      window.__GAME_TEST__.grantLoot(160);
      window.__GAME_TEST__.setElapsed(90);
    });
    await page.waitForTimeout(240);
    const mechanic = await page.evaluate(() => window.__GAME_TEST__.getState());
    assert.equal(mechanic.weaponStage, 3, '裂隙猎人未完成三段武器');
    const zone = await page.evaluate(() => window.__GAME_TEST__.getActiveZone());
    assert(zone, '裂隙猎人 90 秒未开放撤离区');
    await page.screenshot({ path: path.join(outputDir, `${gameId}-mechanic.png`), fullPage: false });
    await page.evaluate(activeZone => {
      window.__GAME_TEST__.moveTo(activeZone.x, activeZone.y);
    }, zone);
    await page.waitForTimeout(420);
    const final = await page.evaluate(() => window.__GAME_TEST__.getState());
    assert.equal(final.mode, 'extracted', `裂隙猎人未成功撤离：${JSON.stringify(final)}`);
    assert(final.kept.length >= 1, '裂隙猎人撤离后未保留战利品');
    await page.screenshot({ path: path.join(outputDir, `${gameId}-result.png`), fullPage: false });
    const failure = await page.evaluate(() => {
      const game = window.__GAME_TEST__;
      game.reset();
      document.getElementById('startBtn').click();
      game.grantLoot(180);
      game.grantLoot(60);
      game.forceDeath();
      return game.getState();
    });
    assert.equal(failure.mode, 'dead', '裂隙猎人强制死亡未进入失败结算');
    assert.equal(failure.kept.length, 1, '裂隙猎人死亡后未只保留一件战利品');
    assert(failure.lost.length >= 1, '裂隙猎人死亡后未记录遗失战利品');
    return { mechanic, final, failure };
  }

  const waitGameTime = time => page.waitForFunction(
    expected => window.__GAME_TEST__.getState().elapsed >= expected,
    time,
    { timeout: 10000 }
  );
  await page.evaluate(() => {
    window.__GAME_TEST__.start();
    window.__GAME_TEST__.setTarget(112, 603);
  });
  await waitGameTime(6);
  await page.evaluate(() => window.__GAME_TEST__.setTarget(278, 603));
  await page.waitForFunction(
    () => window.__GAME_TEST__.getState().switchActivated,
    null,
    { timeout: 3000 }
  );
  await waitGameTime(70);
  const mechanic = await page.evaluate(() => ({
    state: window.__GAME_TEST__.getState(),
    events: window.__GAME_TEST__.getEvents()
  }));
  assert(mechanic.state.echoCount >= 1, '五秒之后未生成回声');
  assert(mechanic.events.some(event => event.event === 'mechanic_reveal'), '五秒之后未发出核心机制事件');
  await page.screenshot({ path: path.join(outputDir, `${gameId}-mechanic.png`), fullPage: false });
  const gateRoute = [
    [101, 76, 247],
    [106, 313, 288],
    [111, 84, 426],
    [116, 306, 477]
  ];
  for (const [time, x, y] of gateRoute) {
    await waitGameTime(time);
    await page.evaluate(([targetX, targetY]) => {
      window.__GAME_TEST__.setTarget(targetX, targetY);
    }, [x, y]);
  }
  await waitGameTime(123);
  const shieldState = await page.evaluate(() => window.__GAME_TEST__.getState());
  assert.equal(shieldState.shieldsRemaining, 0, `五秒之后仍有护盾：${JSON.stringify(shieldState.gates)}`);
  assert(shieldState.gates.every(gate => gate.primed && gate.broken), '五秒之后存在未经过编号回声的时间门');
  await page.evaluate(() => window.__GAME_TEST__.setTarget(195, 352));
  await page.waitForFunction(
    () => window.__GAME_TEST__.getState().mode === 'won',
    null,
    { timeout: 3000 }
  );
  const final = await page.evaluate(() => window.__GAME_TEST__.getState());
  assert.equal(final.mode, 'won', `五秒之后未胜利：${JSON.stringify(final)}`);
  assert.equal(final.echoCount, 4, '五秒之后结算时未形成四条回声');
  assert.equal(final.coreHp, 0, '五秒之后核心生命未归零');
  await page.screenshot({ path: path.join(outputDir, `${gameId}-result.png`), fullPage: false });
  await page.evaluate(() => {
    const game = window.__GAME_TEST__;
    game.reset();
    game.setTarget(195, 640);
  });
  await page.waitForFunction(
    () => window.__GAME_TEST__.getState().mode === 'lost',
    null,
    { timeout: 12000 }
  );
  const failure = await page.evaluate(() => window.__GAME_TEST__.getState());
  assert.equal(failure.mode, 'lost', '五秒之后无操作路线未进入失败结算');
  assert.equal(failure.targetsDestroyed, 0, '五秒之后无操作失败不应摧毁锚点');
  return { mechanic: mechanic.state, final, failure };
}

async function collectLayout(page) {
  return page.evaluate(() => {
    const visible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const tinyTargets = [...document.querySelectorAll('button,a,[role="button"]')]
      .filter(visible)
      .filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      })
      .slice(0, 8)
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          text: (element.textContent || '').trim().slice(0, 24),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      });
    return {
      title: document.title,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      canvasCount: document.querySelectorAll('canvas').length,
      visibleTextLength: document.body.innerText.trim().length,
      tinyTargets,
      testApi: Boolean(window.__GAME_TEST__ && typeof window.__GAME_TEST__.getState === 'function')
    };
  });
}

async function verifyEntry(browser, origin, entry, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  const errors = [];
  const externalRequests = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  page.on('request', request => {
    if (!request.url().startsWith(origin) && !request.url().startsWith('data:')) {
      externalRequests.push(request.url());
    }
  });

  const query = entry.game ? '?test=1&seed=20260728&speed=20&mute=1' : '';
  const url = `${origin}${demoRoot}/${entry.file}${query}`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  assert(response?.ok(), `${entry.id}/${viewport.id} 加载失败`);
  await page.waitForTimeout(450);

  const layout = await collectLayout(page);
  assert(layout.title, `${entry.id}/${viewport.id} 缺少标题`);
  assert(layout.visibleTextLength >= 20, `${entry.id}/${viewport.id} 可见文案不足`);
  assert(layout.scrollWidth <= layout.clientWidth + 2, `${entry.id}/${viewport.id} 横向溢出 ${layout.scrollWidth}/${layout.clientWidth}`);
  if (entry.game) {
    assert(layout.canvasCount >= 1, `${entry.id}/${viewport.id} 缺少 Canvas`);
    assert(layout.testApi, `${entry.id}/${viewport.id} 缺少测试接口`);
  }

  let scenario = null;
  if (entry.game && viewport.id === 'baseline') {
    await page.screenshot({ path: path.join(outputDir, `${entry.id}-opening.png`), fullPage: false });
    await clickMatchingButton(page, /开始|进入|出发|唤醒|拿起/);
    scenario = await runBaselineScenario(page, entry.id);
  } else if (!entry.game && viewport.id === 'baseline') {
    await page.screenshot({ path: path.join(outputDir, 'hub-baseline.png'), fullPage: true });
  } else if (entry.game) {
    await clickMatchingButton(page, /开始|进入|出发|唤醒|拿起/);
  }

  const state = entry.game
    ? await page.evaluate(() => window.__GAME_TEST__?.getState?.()).catch(() => null)
    : null;
  const result = {
    page: entry.id,
    viewport: viewport.id,
    layout,
    state,
    scenario,
    errors,
    externalRequests
  };
  await context.close();
  return result;
}

await verifySources();
await fs.mkdir(outputDir, { recursive: true });
const { server, port } = await startServer();
const origin = `http://127.0.0.1:${port}`;
const results = [];
let browser;

try {
  browser = await chromium.launch({ executablePath: browserExecutable(), headless: true });
  for (const entry of entries) {
    for (const viewport of viewports) {
      const result = await verifyEntry(browser, origin, entry, viewport);
      results.push(result);
      const warnings = result.layout.tinyTargets.length
        ? `触控目标偏小 ${JSON.stringify(result.layout.tinyTargets)}`
        : '';
      const failures = [...result.errors, ...result.externalRequests.map(url => `外部请求: ${url}`)];
      process.stdout.write(`${entry.id.padEnd(21)} ${viewport.id.padEnd(8)} ${failures.length ? `FAIL ${failures.join(' | ')}` : 'PASS'}${warnings ? ` · WARN ${warnings}` : ''}\n`);
    }
  }
  await fs.writeFile(path.join(outputDir, 'verification.json'), JSON.stringify(results, null, 2), 'utf8');
  const hardFailures = results.flatMap(result => [
    ...result.errors.map(error => `${result.page}/${result.viewport}: ${error}`),
    ...result.externalRequests.map(url => `${result.page}/${result.viewport}: 外部请求 ${url}`)
  ]);
  if (hardFailures.length) {
    process.stderr.write(`${hardFailures.join('\n')}\n`);
    process.exitCode = 1;
  }
} finally {
  await browser?.close();
  server.close();
}

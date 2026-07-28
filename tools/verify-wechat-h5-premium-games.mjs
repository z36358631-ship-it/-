import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fsSync from 'node:fs';
import { promises as fs } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import {
  createVerificationMetadata,
  errorText,
  writeJsonAtomic
} from './verification-metadata.mjs';

const root = process.cwd();
const outputDir = path.join(root, 'test-results', 'wechat-h5-premium-games');
const demoRoot = '/demos/%E5%BE%AE%E4%BF%A1H5%E7%B2%BE%E5%93%81%E6%B8%B8%E6%88%8F';
const entries = [
  { id: 'hub', file: 'index.html', game: false },
  { id: 'five-seconds-later', file: '01-five-seconds-later.html', game: true },
  { id: 'world-mender', file: '02-world-mender.html', game: true },
  { id: 'rift-hunter', file: '03-rift-hunter.html', game: true }
];
const testedPaths = [
  ...entries.map(entry => `demos/微信H5精品游戏/${entry.file}`),
  'package-lock.json',
  'package.json',
  'tools/verification-metadata.mjs',
  'tools/verify-wechat-h5-premium-games.mjs'
].sort();
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
      const relative = path.relative(root, requested);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
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

async function collectWorldMenderModalState(page) {
  return page.evaluate(() => ({
    activeId: document.activeElement?.id || null,
    modals: Object.fromEntries(
      ['intro', 'pauseOverlay', 'result'].map(id => {
        const modal = document.getElementById(id);
        return [id, {
          hidden: modal?.hidden ?? null,
          ariaHidden: modal?.getAttribute('aria-hidden') ?? null,
          inert: modal?.inert ?? null
        }];
      })
    )
  }));
}

function assertWorldMenderModalState(snapshot, activeModalId, label) {
  for (const id of ['intro', 'pauseOverlay', 'result']) {
    const modal = snapshot.modals[id];
    const active = id === activeModalId;
    assert.equal(modal.hidden, !active, `${label} ${id} hidden 状态错误`);
    assert.equal(modal.ariaHidden, active ? null : 'true', `${label} ${id} aria-hidden 状态错误`);
    assert.equal(modal.inert, !active, `${label} ${id} inert 状态错误`);
  }
}

async function verifyLifecycle(page, gameId) {
  await page.evaluate(() => window.__setVisibilityForTest(true));
  const pausedAt = await page.evaluate(() => window.__GAME_TEST__.getState());
  assert.equal(pausedAt.paused, true, `${gameId} 页面隐藏后未暂停`);
  let pausedFocus = null;
  if (gameId === 'world-mender') {
    pausedFocus = {
      ...(await collectWorldMenderModalState(page)),
      ...(await page.evaluate(() => ({
      pauseRole: document.getElementById('pauseOverlay')?.getAttribute('role'),
      pauseModal: document.getElementById('pauseOverlay')?.getAttribute('aria-modal'),
      backgroundInert: [
        document.getElementById('game'),
        document.querySelector('.top-actions'),
        document.getElementById('undoBtn'),
        document.getElementById('legendDock')
      ].every(element => element?.inert === true),
      sound: window.__GAME_TEST__.sound()
      })))
    };
    assertWorldMenderModalState(pausedFocus, 'pauseOverlay', '世界缝补师暂停态');
    assert.equal(pausedFocus.activeId, 'continueBtn', '世界缝补师暂停层未把焦点移到继续按钮');
    assert.equal(pausedFocus.pauseRole, 'dialog', '世界缝补师暂停层缺少 dialog 语义');
    assert.equal(pausedFocus.pauseModal, 'true', '世界缝补师暂停层缺少 aria-modal');
    assert.equal(pausedFocus.backgroundInert, true, '世界缝补师暂停时背景控件未隔离');
    assert.equal(pausedFocus.sound.suspended, true, '世界缝补师隐藏暂停后声音总线未挂起');
    assert.equal(pausedFocus.sound.activeVoices, 0, '世界缝补师隐藏暂停后仍有活动声音节点');
  }
  await page.waitForTimeout(180);
  const hidden = await page.evaluate(() => window.__GAME_TEST__.getState());
  assert.equal(hidden.paused, true, `${gameId} 页面隐藏后未暂停`);
  assert(
    Math.abs(Number(hidden.elapsed || 0) - Number(pausedAt.elapsed || 0)) <= 0.1,
    `${gameId} 页面隐藏期间仍推进时间：${pausedAt.elapsed} → ${hidden.elapsed}`
  );

  await page.evaluate(() => {
    window.__setVisibilityForTest(false);
    const game = window.__GAME_TEST__;
    if (typeof game.resume === 'function') game.resume();
    else window.GamePlatform.resume();
  });
  await page.waitForTimeout(100);
  const resumed = await page.evaluate(() => window.__GAME_TEST__.getState());
  assert.equal(resumed.paused, false, `${gameId} 主动继续后仍处于暂停`);
  let resumedFocus = null;
  if (gameId === 'world-mender') {
    resumedFocus = {
      ...(await collectWorldMenderModalState(page)),
      ...(await page.evaluate(() => ({
      backgroundInert: [
        document.getElementById('game'),
        document.querySelector('.top-actions'),
        document.getElementById('undoBtn'),
        document.getElementById('legendDock')
      ].some(element => element?.inert === true),
      sound: window.__GAME_TEST__.sound()
      })))
    };
    assertWorldMenderModalState(resumedFocus, null, '世界缝补师继续游戏态');
    assert.equal(resumedFocus.activeId, 'app', '世界缝补师继续后焦点未回到游戏容器');
    assert.equal(resumedFocus.backgroundInert, false, '世界缝补师继续后背景仍被隔离');
    assert.equal(resumedFocus.sound.contextCount, 0, '静音验收不应创建 AudioContext');
    assert.equal(resumedFocus.sound.activeVoices, 0, '静音验收存在活动声音节点');
  }
  return { pausedAt, hidden, resumed, pausedFocus, resumedFocus };
}

async function verifyHubEventFlow(page) {
  await page.evaluate(() => {
    localStorage.removeItem('wechat-h5-premium-games:events:v1');
    window.dispatchEvent(new StorageEvent('storage', { key: 'wechat-h5-premium-games:events:v1' }));
  });
  await page.evaluate(() => {
    for (const event of ['first_input', 'mechanic_reveal', 'core_payoff']) {
      window.dispatchEvent(new MessageEvent('message', {
        origin: 'https://untrusted.example',
        source: window,
        data: {
          source: 'wechat-h5-premium-games',
          version: 1,
          gameId: 'five-seconds-later',
          runId: 'spoofed',
          event,
          ts: Date.now(),
          payload: {}
        }
      }));
    }
    window.dispatchEvent(new MessageEvent('message', {
      origin: location.origin,
      source: window,
      data: {
        source: 'wechat-h5-premium-games',
        version: 1,
        gameId: 'five-seconds-later',
        runId: 'malicious',
        event: '<img src=x onerror=alert(1)>',
        ts: Date.now(),
        payload: {}
      }
    }));
  });
  await page.waitForTimeout(50);
  assert.equal(
    await page.locator('#progress').innerText(),
    '完成 0 / 3',
    '大厅接受了非同源伪造事件'
  );
  assert.equal(await page.locator('#events img').count(), 0, '大厅渲染了非法事件名中的 HTML');
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('wechat-h5-premium-games:events:v1') || '[]').length),
    0,
    '大厅保存了非同源或非法事件'
  );
  const gameIds = ['five-seconds-later', 'world-mender', 'rift-hunter'];
  for (let index = 0; index < gameIds.length; index += 1) {
    const popupPromise = page.waitForEvent('popup');
    await page.locator('.game .play').nth(index).click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    assert.equal(
      await popup.evaluate(() => Boolean(window.opener)),
      true,
      `${gameIds[index]} 新窗口无法访问大厅 opener`
    );
    await popup.evaluate(() => {
      window.GamePlatform.emit('first_input', { verifier: true });
      window.GamePlatform.emit('mechanic_reveal', { verifier: true });
      window.GamePlatform.emit('core_payoff', { verifier: true });
    });
    await page.waitForFunction(
      completed => document.getElementById('progress').textContent.includes(`完成 ${completed} / 3`),
      index + 1,
      { timeout: 2000 }
    );
    await popup.close();
  }
  const result = await page.evaluate(() => ({
    progress: document.getElementById('progress').textContent.trim(),
    states: [...document.querySelectorAll('.game .state')].map(node => node.textContent.trim()),
    eventRows: document.querySelectorAll('#events .event').length
  }));
  assert.equal(result.progress, '完成 3 / 3', `大厅完成进度异常：${result.progress}`);
  assert(result.states.every(state => state === '关键体验已完成'), `大厅卡片状态异常：${JSON.stringify(result.states)}`);
  assert(result.eventRows > 0, '大厅最近事件列表为空');
  return result;
}

async function verifyEventsAndReplay(page, gameId) {
  const beforeReplay = await page.evaluate(() => window.__GAME_TEST__.getState());
  const expectedResultId = gameId === 'five-seconds-later' ? 'resultOverlay' : 'result';
  await page.waitForFunction(
    expectedId => document.activeElement?.id === expectedId,
    expectedResultId,
    { timeout: 1000 }
  );
  const resultAccessibility = await page.evaluate(() => ({
    activeElement: document.activeElement?.id || null,
    liveText: document.getElementById('liveStatus')?.textContent || ''
  }));
  assert.equal(resultAccessibility.activeElement, expectedResultId, `${gameId} 结算后未把焦点移入结算层`);
  assert(resultAccessibility.liveText.trim().length > 0, `${gameId} 结算后缺少状态播报`);
  let resultTabTrap = null;
  if (gameId === 'world-mender') {
    const resultModalState = await collectWorldMenderModalState(page);
    assertWorldMenderModalState(resultModalState, 'result', '世界缝补师结算态');
    await page.keyboard.press('Tab');
    const firstTab = await page.evaluate(() => document.activeElement?.id || null);
    await page.keyboard.press('Tab');
    const wrappedTab = await page.evaluate(() => document.activeElement?.id || null);
    await page.keyboard.press('Shift+Tab');
    const reverseWrappedTab = await page.evaluate(() => document.activeElement?.id || null);
    assert.equal(firstTab, 'replayBtn', '世界缝补师结算层 Tab 未进入重玩按钮');
    assert.equal(wrappedTab, 'replayBtn', '世界缝补师结算层 Tab 未限制在模态内');
    assert.equal(reverseWrappedTab, 'replayBtn', '世界缝补师结算层 Shift+Tab 未限制在模态内');
    resultTabTrap = { firstTab, wrappedTab, reverseWrappedTab, modalState: resultModalState };
  }
  const replayButton = page.locator('#replayBtn');
  await replayButton.waitFor({ state: 'visible', timeout: 2000 });
  await replayButton.click();
  await page.waitForFunction(
    priorRunId => window.__GAME_TEST__.getState().runId !== priorRunId,
    beforeReplay.runId,
    { timeout: 2000 }
  );
  const afterReplay = await page.evaluate(() => window.__GAME_TEST__.getState());
  assert.notEqual(afterReplay.runId, beforeReplay.runId, `${gameId} 重玩未生成新 runId`);
  const replayFocus = await page.evaluate(() => document.activeElement?.id || null);
  const expectedGameFocus = gameId === 'five-seconds-later' ? 'gameShell' : 'app';
  assert.equal(replayFocus, expectedGameFocus, `${gameId} 重玩后焦点仍留在隐藏结算控件`);
  let replayModalState = null;
  if (gameId === 'world-mender') {
    replayModalState = await collectWorldMenderModalState(page);
    assertWorldMenderModalState(replayModalState, null, '世界缝补师重玩游戏态');
  }

  const events = await page.evaluate(() => window.__capturedGameEvents.slice());
  assert(events.length > 0, `${gameId} 未捕获到运行时事件`);
  for (const message of events) {
    assert.equal(message.source, 'wechat-h5-premium-games', `${gameId} 事件 source 非法`);
    assert.equal(message.version, 1, `${gameId} 事件 version 非法`);
    assert.equal(message.gameId, gameId, `${gameId} 事件 gameId 非法`);
    assert.equal(typeof message.runId, 'string', `${gameId} 事件缺少 runId`);
    assert(message.runId.length > 0, `${gameId} 事件 runId 为空`);
    assert.equal(typeof message.event, 'string', `${gameId} 事件名非法`);
    assert(Number.isFinite(message.ts), `${gameId} 事件 ts 非法`);
    assert(message.payload && typeof message.payload === 'object', `${gameId} 事件 payload 非法`);
  }
  const eventNames = new Set(events.map(event => event.event));
  for (const required of [
    'game_start',
    'first_input',
    'mechanic_reveal',
    'phase_change',
    'core_payoff',
    'run_end',
    'replay_start',
    'lifecycle_pause',
    'lifecycle_resume'
  ]) {
    assert(eventNames.has(required), `${gameId} 未在运行时发出 ${required}`);
  }
  assert(
    events.some(event => event.event === 'replay_start' && event.runId === afterReplay.runId),
    `${gameId} replay_start 未绑定新 runId`
  );
  return {
    beforeRunId: beforeReplay.runId,
    afterRunId: afterReplay.runId,
    resultAccessibility,
    resultTabTrap,
    replayFocus,
    replayModalState,
    eventNames: [...eventNames].sort(),
    eventCount: events.length
  };
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

async function dispatchTouchDrag(page, start, end) {
  const session = await page.context().newCDPSession(page);
  const touchPoint = (x, y) => ({
    x,
    y,
    radiusX: 6,
    radiusY: 6,
    force: 0.7,
    id: 1
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [touchPoint(start.x, start.y)]
  });
  const steps = 8;
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [touchPoint(
        start.x + (end.x - start.x) * progress,
        start.y + (end.y - start.y) * progress
      )]
    });
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: []
  });
  await session.detach();
}

async function verifyTouchInput(page, gameId) {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  assert(box, `${gameId} 触摸验收未找到 Canvas`);
  const toScreen = (point, width, height) => ({
    x: box.x + point.x / width * box.width,
    y: box.y + point.y / height * box.height
  });
  const before = await page.evaluate(() => window.__GAME_TEST__.getState());
  await page.screenshot({ path: path.join(outputDir, `${gameId}-first-input.png`), fullPage: false });
  let alternateInput = null;

  if (gameId === 'world-mender') {
    const anchors = Object.fromEntries(before.anchors.map(anchor => [anchor.id, anchor]));
    assert.equal(before.mechanics.firstGuideEdge, 'west_bridge', '世界缝补师开场未定向提示苔原桥第一针');
    await dispatchTouchDrag(
      page,
      toScreen(anchors.w1, 390, 844),
      toScreen(anchors.w2, 390, 844)
    );
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => window.__GAME_TEST__.getState());
    assert(after.stitchedEdges.includes('west_bridge'), '世界缝补师真实触摸拖动未建立苔原桥');
    assert.equal(after.mechanics.firstInput, true, '世界缝补师真实触摸拖动未记录首次输入');
    assert.equal(after.mechanics.firstGuideEdge, null, '世界缝补师完成第一针后仍保留首针引导');
    await page.evaluate(() => {
      window.__GAME_TEST__.reset();
      window.__GAME_TEST__.start();
    });
    const w1 = toScreen(anchors.w1, 390, 844);
    const w2 = toScreen(anchors.w2, 390, 844);
    await page.touchscreen.tap(w1.x, w1.y);
    await page.waitForTimeout(60);
    const selected = await page.evaluate(() => window.__GAME_TEST__.getState());
    assert.equal(selected.ui.selectedAnchor, 'w1', '世界缝补师轻点起点后未进入选中态');
    await page.touchscreen.tap(w2.x, w2.y);
    await page.waitForTimeout(100);
    const afterTap = await page.evaluate(() => window.__GAME_TEST__.getState());
    assert(afterTap.stitchedEdges.includes('west_bridge'), '世界缝补师连续轻点两个锚点未完成缝合');
    assert.equal(afterTap.ui.selectedAnchor, null, '世界缝补师轻点缝合后未清除选中态');
    alternateInput = { selected, afterTap };
  } else {
    const start = toScreen(before.player, gameId === 'five-seconds-later' ? 390 : box.width, gameId === 'five-seconds-later' ? 844 : box.height);
    const end = {
      x: Math.min(box.x + box.width - 28, start.x + 82),
      y: Math.max(box.y + 190, start.y - 92)
    };
    await dispatchTouchDrag(page, start, end);
    await page.waitForTimeout(120);
    const after = await page.evaluate(() => window.__GAME_TEST__.getState());
    if (gameId === 'five-seconds-later') {
      assert(
        Math.hypot(after.target.x - before.target.x, after.target.y - before.target.y) > 20,
        '五秒之后真实触摸拖动未更新移动目标'
      );
    } else {
      assert(
        Math.hypot(after.player.x - before.player.x, after.player.y - before.player.y) > 2,
        '裂隙猎人真实触摸拖动未移动猎人'
      );
    }
  }

  const touchEvents = await page.evaluate(() => window.__capturedGameEvents
    .filter(event => event.event === 'first_input')
    .map(event => event.payload));
  assert(touchEvents.length > 0, `${gameId} 真实触摸后未发出 first_input`);
  const touchPayload = touchEvents.at(-1);
  if (gameId === 'five-seconds-later') {
    assert.equal(touchPayload.input, 'pointer_drag', '五秒之后 first_input 不是触摸拖动来源');
  } else if (gameId === 'world-mender') {
    assert.equal(touchPayload.action, 'stitch', '世界缝补师 first_input 不是缝线来源');
  } else {
    assert.equal(touchPayload.method, 'pointer', '裂隙猎人 first_input 不是指针移动来源');
  }

  await page.evaluate(() => {
    const game = window.__GAME_TEST__;
    game.reset();
    if (typeof game.start === 'function') game.start();
  });
  return { before, touchPayload, alternateInput };
}

async function verifyDirectFile(browser, entry) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
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
    if (!request.url().startsWith('file:') && !request.url().startsWith('data:')) {
      externalRequests.push(request.url());
    }
  });
  const file = path.join(root, ...decodeURIComponent(demoRoot).split('/').filter(Boolean), entry.file);
  const url = pathToFileURL(file);
  if (entry.game) url.search = '?test=1&seed=20260728&speed=20&mute=1';
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(250);
  const layout = await collectLayout(page);
  assert(layout.title, `${entry.id} file:// 直开缺少标题`);
  assert(layout.visibleTextLength >= 20, `${entry.id} file:// 直开可见文案不足`);
  assert(layout.scrollWidth <= layout.clientWidth + 2, `${entry.id} file:// 直开横向溢出`);
  if (entry.game) {
    assert(layout.canvasCount >= 1, `${entry.id} file:// 直开缺少 Canvas`);
    assert(layout.testApi, `${entry.id} file:// 直开测试接口不可用`);
  }
  assert.equal(errors.length, 0, `${entry.id} file:// 直开报错：${errors.join(' | ')}`);
  assert.equal(externalRequests.length, 0, `${entry.id} file:// 直开产生外部请求：${externalRequests.join(' | ')}`);
  await context.close();
  return {
    page: entry.id,
    viewport: 'direct-file',
    layout,
    errors,
    externalRequests
  };
}

async function verifyProductionGuards(browser, origin, entry) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  const errors = [];
  const externalRequests = [];
  await page.addInitScript(() => {
    window.__productionGuardEvents = [];
    const capture = event => {
      if (event?.detail?.event === 'game_start') {
        window.__productionGuardEvents.push(JSON.parse(JSON.stringify(event.detail)));
      }
    };
    window.addEventListener('gameplatform', capture);
    window.addEventListener('gameplatform:event', capture);
  });
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  page.on('request', request => {
    if (!request.url().startsWith(origin) && !request.url().startsWith('data:')) {
      externalRequests.push(request.url());
    }
  });
  try {
    const response = await page.goto(
      `${origin}${demoRoot}/${entry.file}?speed=40&seed=1&mute=1`,
      { waitUntil: 'domcontentloaded', timeout: 15000 }
    );
    if (!response?.ok()) errors.push(`普通入口加载失败：${response?.status() || '无响应'}`);
    await page.waitForTimeout(250);
    const guard = await page.evaluate(() => ({
      testApiType: typeof window.__GAME_TEST__,
      meta: window.__GAME_META__ || null,
      testBadgeVisible: [...document.querySelectorAll('#testBadge,[data-test-badge]')]
        .some(element => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return !element.hidden
            && style.display !== 'none'
            && style.visibility !== 'hidden'
            && rect.width > 0
            && rect.height > 0;
        })
    }));
    if (guard.testApiType !== 'undefined') errors.push('普通入口暴露 window.__GAME_TEST__');
    if (guard.meta?.testMode !== false) errors.push('普通入口缺少 testMode=false 的只读元数据');
    if (guard.meta?.timeScale !== 1) errors.push(`普通入口 speed 改变规则：${guard.meta?.timeScale}`);
    if (guard.testBadgeVisible) errors.push('普通入口显示测试标记');
    await clickMatchingButton(page, /开始|进入|出发|唤醒|拿起/);
    await page.waitForTimeout(50);
    const startEvent = await page.evaluate(
      () => window.__productionGuardEvents?.at(-1) || null
    );
    if (!startEvent) errors.push('普通入口未发出 game_start，无法校验 seed 门禁');
    if (startEvent?.payload?.seed === 1) errors.push('普通入口 seed=1 改变了随机种子');
    let productionAudio = null;
    if (entry.id === 'world-mender') {
      await page.locator('#pauseBtn').click();
      productionAudio = await page.evaluate(() => ({
        muteLabel: document.getElementById('muteBtn')?.textContent?.trim() || null,
        activeId: document.activeElement?.id || null
      }));
      if (productionAudio.muteLabel !== '声音') {
        errors.push(`世界缝补师普通入口 mute=1 改变了静音状态：${productionAudio.muteLabel}`);
      }
    }
    return {
      page: entry.id,
      viewport: 'production-guard',
      guard,
      startEvent,
      productionAudio,
      errors,
      externalRequests
    };
  } finally {
    await context.close();
  }
}

async function verifyWorldMenderLandscapeGuard(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
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
  try {
    const response = await page.goto(
      `${origin}${demoRoot}/02-world-mender.html?test=1&seed=20260728&speed=20&mute=1`,
      { waitUntil: 'domcontentloaded', timeout: 15000 }
    );
    if (!response?.ok()) errors.push(`短横屏入口加载失败：${response?.status() || '无响应'}`);
    await page.waitForTimeout(250);
    const guard = await page.evaluate(() => {
      const rotate = document.getElementById('rotateGuard');
      const rect = rotate?.getBoundingClientRect();
      const style = rotate ? getComputedStyle(rotate) : null;
      return {
        visible: Boolean(
          rotate
          && style?.display !== 'none'
          && style?.visibility !== 'hidden'
          && rect?.width > 0
          && rect?.height > 0
        ),
        activeId: document.activeElement?.id || null,
        role: rotate?.getAttribute('role') || null,
        modal: rotate?.getAttribute('aria-modal') || null,
        text: rotate?.textContent?.trim() || ''
      };
    });
    if (!guard.visible) errors.push('短横屏未显示旋转阻断层');
    if (guard.activeId !== 'rotateGuard') errors.push(`短横屏焦点未进入阻断层：${guard.activeId}`);
    if (guard.role !== 'dialog' || guard.modal !== 'true') errors.push('短横屏阻断层缺少模态对话框语义');
    if (!guard.text.includes('竖屏')) errors.push('短横屏阻断层缺少竖屏指引');
    return {
      page: 'world-mender',
      viewport: 'short-landscape',
      guard,
      errors,
      externalRequests
    };
  } finally {
    await context.close();
  }
}

async function verifyWorldMenderSoundBus(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
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
  try {
    const response = await page.goto(
      `${origin}${demoRoot}/02-world-mender.html?test=1&seed=20260728&speed=20`,
      { waitUntil: 'domcontentloaded', timeout: 15000 }
    );
    if (!response?.ok()) errors.push(`声音入口加载失败：${response?.status() || '无响应'}`);
    await page.waitForTimeout(250);
    await page.locator('#startBtn').click();
    const played = await page.evaluate(() => {
      const game = window.__GAME_TEST__;
      const beforeUnknown = game.sound();
      const unknownResult = game.cue('unknown_verifier_cue');
      const afterUnknown = game.sound();
      game.connect('w1', 'n1');
      game.connect('w1', 'w2');
      game.connect('n1', 'n2');
      game.connect('e1', 'e2');
      game.connect('g1', 'g2');
      game.advance(125);
      const won = game.getState();
      const afterWin = game.sound();
      game.reset();
      game.start();
      game.finish();
      const lost = game.getState();
      const afterLoss = game.sound();
      game.reset();
      game.start();
      game.connect('w1', 'w2');
      game.pause();
      const paused = game.sound();
      return { beforeUnknown, unknownResult, afterUnknown, won, afterWin, lost, afterLoss, paused };
    });
    await page.locator('#continueBtn').click();
    const resumed = await page.evaluate(() => window.__GAME_TEST__.sound());
    await page.waitForTimeout(650);
    const settled = await page.evaluate(() => window.__GAME_TEST__.sound());
    if (played.afterWin.contextCount !== 1) {
      errors.push(`声音总线未保持单一 AudioContext：${played.afterWin.contextCount}`);
    }
    if (played.unknownResult !== false) {
      errors.push(`未知声音名未被拒绝：${JSON.stringify(played.unknownResult)}`);
    }
    if (
      played.afterUnknown.activeVoices !== played.beforeUnknown.activeVoices
      || JSON.stringify(played.afterUnknown.cueCounts) !== JSON.stringify(played.beforeUnknown.cueCounts)
    ) {
      errors.push(`未知声音名污染声音状态：${JSON.stringify({
        before: played.beforeUnknown,
        after: played.afterUnknown
      })}`);
    }
    if ((played.afterWin.cueCounts.stitch_invalid || 0) !== 1) {
      errors.push(`无效缝合声音次数异常：${played.afterWin.cueCounts.stitch_invalid || 0}`);
    }
    if ((played.afterWin.cueCounts.stitch_ok || 0) !== 4) {
      errors.push(`有效缝合声音次数异常：${played.afterWin.cueCounts.stitch_ok || 0}`);
    }
    if ((played.afterWin.cueCounts.life_saved || 0) < 1) {
      errors.push('生命获救未触发程序合成声音');
    }
    if ((played.afterWin.cueCounts.run_won || 0) !== 1) {
      errors.push(`胜利声音次数异常：${played.afterWin.cueCounts.run_won || 0}`);
    }
    if ((played.afterLoss.cueCounts.run_lost || 0) !== 1) {
      errors.push(`失败声音次数异常：${played.afterLoss.cueCounts.run_lost || 0}`);
    }
    if (played.paused.suspended !== true || played.paused.activeVoices !== 0) {
      errors.push(`暂停未安全停止声音：${JSON.stringify(played.paused)}`);
    }
    if (resumed.suspended !== false) errors.push('继续手势后声音总线仍处于挂起标记');
    if (settled.contextCount !== 1 || settled.activeVoices !== 0) {
      errors.push(`声音节点未收敛：${JSON.stringify(settled)}`);
    }
    return {
      page: 'world-mender',
      viewport: 'sound-bus',
      sound: { played, resumed, settled },
      errors,
      externalRequests
    };
  } finally {
    await context.close();
  }
}

async function runBaselineScenario(page, gameId) {
  if (gameId === 'world-mender') {
    const initialSound = await page.evaluate(() => window.__GAME_TEST__.sound());
    assert.equal(initialSound.contextCount, 0, '世界缝补师静音测试启动后创建了 AudioContext');
    assert.equal(initialSound.activeVoices, 0, '世界缝补师静音测试启动后存在活动声音节点');
    assert.equal(initialSound.muted, true, '世界缝补师 mute=1 未传入声音总线');
    const budgetInvariant = await page.evaluate(() => {
      const state = window.__GAME_TEST__.getState();
      const garden = state.availableEdges.find(edge => edge.role === 'garden');
      const rescue = state.availableEdges.filter(edge => edge.role !== 'garden');
      const combinations = [];
      for (let a = 0; a < rescue.length; a += 1) {
        for (let b = a + 1; b < rescue.length; b += 1) {
          for (let c = b + 1; c < rescue.length; c += 1) {
            const edges = [rescue[a], rescue[b], rescue[c]];
            combinations.push({
              ids: edges.map(edge => edge.id),
              cost: garden.cost + edges.reduce((sum, edge) => sum + edge.cost, 0)
            });
          }
        }
      }
      return {
        maxThread: state.maxThread,
        combinations,
        allRescueAndGarden: garden.cost + rescue.reduce((sum, edge) => sum + edge.cost, 0),
        allRescueOnly: rescue.reduce((sum, edge) => sum + edge.cost, 0)
      };
    });
    assert.equal(budgetInvariant.combinations.length, 4, '世界缝补师三选一救援组合数量异常');
    assert(
      budgetInvariant.combinations.every(combination => combination.cost <= budgetInvariant.maxThread),
      `世界缝补师存在无法支付的三救援加花园组合：${JSON.stringify(budgetInvariant.combinations)}`
    );
    assert(
      budgetInvariant.allRescueAndGarden > budgetInvariant.maxThread,
      '世界缝补师全部救援加花园不应能同时支付'
    );
    assert(
      budgetInvariant.allRescueOnly <= budgetInvariant.maxThread,
      '世界缝补师应允许误选四条外围路线以形成可复盘的资源后果'
    );

    const interaction = await page.evaluate(() => {
      const game = window.__GAME_TEST__;
      game.reset();
      game.start();
      const before = game.getState();
      const invalid = game.connect('w1', 'n1');
      const afterInvalid = game.getState();
      const valid = game.connect('w1', 'w2');
      const afterValid = game.getState();
      const undone = game.undo();
      const afterUndo = game.getState();
      return { before, invalid, afterInvalid, valid, afterValid, undone, afterUndo };
    });
    assert.equal(interaction.invalid.ok, false, '世界缝补师非法非相邻连接被接受');
    assert.equal(interaction.afterInvalid.thread, interaction.before.thread, '世界缝补师非法连接错误消耗金线');
    assert.equal(interaction.valid.ok, true, '世界缝补师有效桥梁连接失败');
    assert(interaction.afterValid.thread < interaction.before.thread, '世界缝补师有效连接未消耗金线');
    assert.equal(interaction.undone.ok, true, '世界缝补师撤销失败');
    assert.equal(interaction.afterUndo.thread, interaction.before.thread, '世界缝补师撤销未完整返还金线');
    assert.equal(interaction.afterUndo.stitchedEdges.length, 0, '世界缝补师撤销后仍残留针脚');

    const wrongChoiceBoost = await page.evaluate(() => {
      const game = window.__GAME_TEST__;
      game.reset();
      game.start();
      game.connect('w1', 'w2');
      game.connect('n1', 'n2');
      game.connect('e1', 'e2');
      game.connect('s1', 's2');
      return game.getState();
    });
    assert.equal(wrongChoiceBoost.gardenConnected, false, '世界缝补师错误四外围路线不应连接花园');
    assert.equal(wrongChoiceBoost.mechanics.settlementBoost, 1.8, '世界缝补师四条错误路线锁定后未加速失败结算');

    const mechanic = await page.evaluate(() => {
      const game = window.__GAME_TEST__;
      game.reset();
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
    assert.equal(mechanic.mechanics.settlementBoost, 1.8, '世界缝补师线路锁定后未进入归园加速');
    await page.screenshot({ path: path.join(outputDir, `${gameId}-mechanic.png`), fullPage: false });
    const final = await page.evaluate(() => {
      window.__GAME_TEST__.advance(100);
      return window.__GAME_TEST__.getState();
    });
    assert.equal(final.phase, 'won', `世界缝补师标准路线未胜利：${JSON.stringify(final)}`);
    assert(final.saved >= 9, `世界缝补师获救数量不足：${final.saved}`);
    const resultIsolation = await page.evaluate(() => ({
      activeId: document.activeElement?.id || null,
      role: document.getElementById('result')?.getAttribute('role'),
      modal: document.getElementById('result')?.getAttribute('aria-modal'),
      backgroundInert: [
        document.getElementById('game'),
        document.querySelector('.top-actions'),
        document.getElementById('undoBtn'),
        document.getElementById('legendDock')
      ].every(element => element?.inert === true),
      sound: window.__GAME_TEST__.sound()
    }));
    assert.equal(resultIsolation.activeId, 'result', '世界缝补师结算层未接管焦点');
    assert.equal(resultIsolation.role, 'dialog', '世界缝补师结算层缺少 dialog 语义');
    assert.equal(resultIsolation.modal, 'true', '世界缝补师结算层缺少 aria-modal');
    assert.equal(resultIsolation.backgroundInert, true, '世界缝补师结算时背景控件未隔离');
    assert.equal(resultIsolation.sound.contextCount, 0, '静音结算路径不应创建 AudioContext');
    assert.equal(resultIsolation.sound.activeVoices, 0, '静音结算路径存在活动声音节点');
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
    return { initialSound, budgetInvariant, interaction, wrongChoiceBoost, mechanic, final, resultIsolation, failure };
  }

  if (gameId === 'rift-hunter') {
    const storageRecovery = await page.evaluate(() => {
      const game = window.__GAME_TEST__;
      localStorage.setItem('premium-h5:rift-hunter:settings', '42');
      localStorage.setItem('premium-h5:rift-hunter:bestValue', '{"bad":true}');
      game.reset();
      const settings = game.getState().settings;
      game.grantLoot(100);
      game.forceDeath();
      const bestValue = JSON.parse(localStorage.getItem('premium-h5:rift-hunter:bestValue'));
      game.reset();
      return { settings, bestValue };
    });
    assert.equal(typeof storageRecovery.settings.sound, 'boolean', '裂隙猎人损坏设置未恢复声音默认值');
    assert.equal(typeof storageRecovery.settings.reduced, 'boolean', '裂隙猎人损坏设置未恢复动效默认值');
    assert.equal(storageRecovery.bestValue, 100, '裂隙猎人损坏最佳价值未恢复为有限数值');

    const beforeExtraction = await page.evaluate(() => {
      const game = window.__GAME_TEST__;
      game.reset();
      game.grantXp(260);
      game.grantXp(260);
      game.grantLoot(160);
      game.setElapsed(59);
      return game.getState();
    });
    assert.equal(beforeExtraction.timing.firstExtraction, 60, '裂隙猎人首次撤离节奏不是 60 秒');
    assert.equal(beforeExtraction.extraction.zones.length, 0, '裂隙猎人 60 秒前提前开放撤离区');
    await page.evaluate(() => window.__GAME_TEST__.setElapsed(60));
    await page.waitForTimeout(240);
    const mechanic = await page.evaluate(() => window.__GAME_TEST__.getState());
    assert.equal(mechanic.weaponStage, 3, '裂隙猎人未完成三段武器');
    const zone = await page.evaluate(() => window.__GAME_TEST__.getActiveZone());
    assert(zone, '裂隙猎人 60 秒未开放撤离区');
    await page.screenshot({ path: path.join(outputDir, `${gameId}-mechanic.png`), fullPage: false });
    await page.evaluate(activeZone => {
      window.__GAME_TEST__.moveTo(activeZone.x, activeZone.y);
    }, zone);
    await page.waitForTimeout(420);
    const final = await page.evaluate(() => window.__GAME_TEST__.getState());
    assert.equal(final.mode, 'extracted', `裂隙猎人未成功撤离：${JSON.stringify(final)}`);
    assert(final.kept.length >= 1, '裂隙猎人撤离后未保留战利品');
    const resultAccessibility = await page.evaluate(() => ({
      activeElement: document.activeElement?.id || null,
      liveText: document.getElementById('liveStatus')?.textContent || ''
    }));
    assert.equal(resultAccessibility.activeElement, 'result', '裂隙猎人结算后未把焦点移入结算层');
    assert(resultAccessibility.liveText.includes('撤离完成'), '裂隙猎人撤离结算未播报结果');
    await page.screenshot({ path: path.join(outputDir, `${gameId}-result.png`), fullPage: false });
    await page.evaluate(() => {
      const game = window.__GAME_TEST__;
      game.reset();
      game.setElapsed(150);
    });
    await page.waitForTimeout(240);
    const collapse = await page.evaluate(() => window.__GAME_TEST__.getState());
    assert.equal(collapse.collapse, true, '裂隙猎人 150 秒未进入坍缩');
    assert.deepEqual(
      collapse.extraction.zones.map(zone => zone.index),
      [2],
      `裂隙猎人最终信标开启后旧撤离区仍有效：${JSON.stringify(collapse.extraction.zones)}`
    );
    for (const [pool, limit] of Object.entries(collapse.pools.limits)) {
      assert(collapse.pools[pool] <= limit, `裂隙猎人对象池 ${pool} 超限：${collapse.pools[pool]}/${limit}`);
    }
    const failure = await page.evaluate(() => {
      const game = window.__GAME_TEST__;
      game.reset();
      game.grantLoot(180);
      game.grantLoot(60);
      game.forceDeath();
      return game.getState();
    });
    assert.equal(failure.mode, 'dead', '裂隙猎人强制死亡未进入失败结算');
    assert.equal(failure.kept.length, 1, '裂隙猎人死亡后未只保留一件战利品');
    assert(failure.lost.length >= 1, '裂隙猎人死亡后未记录遗失战利品');
    const failureAccessibility = await page.evaluate(() => ({
      activeElement: document.activeElement?.id || null,
      liveText: document.getElementById('liveStatus')?.textContent || ''
    }));
    assert.equal(failureAccessibility.activeElement, 'result', '裂隙猎人死亡结算后未把焦点移入结算层');
    assert(failureAccessibility.liveText.includes('行动终止'), '裂隙猎人死亡结算未播报结果');
    return { storageRecovery, beforeExtraction, mechanic, final, resultAccessibility, collapse, failure, failureAccessibility };
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
  await waitGameTime(96);
  const gateGuide = await page.evaluate(() => window.__GAME_TEST__.getState());
  assert.equal(gateGuide.highlightedGateSlot, gateGuide.recordingSlot, '五秒之后录制编号未高亮对应时间门');
  assert(gateGuide.message || gateGuide.objective, '五秒之后编号门阶段缺少可读操作指引');
  await page.screenshot({ path: path.join(outputDir, `${gameId}-gate-guide.png`), fullPage: false });
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
    game.setTarget(112, 603);
  });
  await waitGameTime(6);
  await page.evaluate(() => window.__GAME_TEST__.setTarget(112, 603));
  await waitGameTime(20);
  await page.evaluate(() => window.__GAME_TEST__.setTarget(278, 603));
  await waitGameTime(26);
  const mechanicIdempotency = await page.evaluate(() => {
    const state = window.__GAME_TEST__.getState();
    return {
      state,
      events: window.__GAME_TEST__.getEvents().filter(event => event.runId === state.runId)
    };
  });
  assert.equal(
    mechanicIdempotency.events.filter(event => event.event === 'mechanic_reveal').length,
    1,
    '五秒之后单槽反复重录时重复发出核心机制教学'
  );
  assert.equal(
    mechanicIdempotency.events.filter(event => event.event === 'echo_created').length,
    2,
    '五秒之后单槽重录路径未形成两条有效录制事件'
  );
  assert.deepEqual(
    mechanicIdempotency.state.echoes.map(echo => echo.slot),
    [0],
    '五秒之后单槽重录后未只保留最新的 Ⅰ 号回声'
  );
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
  assert.equal(failure.echoCount, 0, '五秒之后静止轨迹不应生成有效回声');
  return { mechanic: mechanic.state, gateGuide, final, mechanicIdempotency, failure };
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
    const liveRegions = [...document.querySelectorAll('[aria-live], [role="status"]')]
      .map(element => ({
        id: element.id || null,
        ariaLive: element.getAttribute('aria-live') || null,
        role: element.getAttribute('role') || null
      }));
    return {
      title: document.title,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      canvasCount: document.querySelectorAll('canvas').length,
      visibleTextLength: document.body.innerText.trim().length,
      tinyTargets,
      liveRegions,
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
  await page.addInitScript(() => {
    let forcedHidden = false;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => forcedHidden
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => forcedHidden ? 'hidden' : 'visible'
    });
    window.__setVisibilityForTest = value => {
      forcedHidden = Boolean(value);
      document.dispatchEvent(new Event('visibilitychange'));
    };
    window.__capturedGameEvents = [];
    const capture = event => {
      const message = event?.detail;
      if (message?.source === 'wechat-h5-premium-games') {
        window.__capturedGameEvents.push(JSON.parse(JSON.stringify(message)));
      }
    };
    window.addEventListener('gameplatform', capture);
    window.addEventListener('gameplatform:event', capture);
  });
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
  assert.equal(layout.tinyTargets.length, 0, `${entry.id}/${viewport.id} 存在小于 44px 的触控目标：${JSON.stringify(layout.tinyTargets)}`);
  if (entry.game) {
    assert(layout.canvasCount >= 1, `${entry.id}/${viewport.id} 缺少 Canvas`);
    assert(layout.testApi, `${entry.id}/${viewport.id} 缺少测试接口`);
    assert(layout.liveRegions.length >= 1, `${entry.id}/${viewport.id} 缺少离散状态播报区`);
    assert(!layout.liveRegions.some(region => region.id === 'hud'), `${entry.id}/${viewport.id} 不应把高频 HUD 设为直播区`);
  }

  let scenario = null;
  if (entry.game && viewport.id === 'baseline') {
    await page.screenshot({ path: path.join(outputDir, `${entry.id}-opening.png`), fullPage: false });
    let openingFocus = null;
    if (entry.id === 'world-mender') {
      openingFocus = {
        ...(await collectWorldMenderModalState(page)),
        ...(await page.evaluate(() => ({
        role: document.getElementById('intro')?.getAttribute('role'),
        modal: document.getElementById('intro')?.getAttribute('aria-modal'),
        backgroundInert: [
          document.getElementById('game'),
          document.querySelector('.top-actions'),
          document.getElementById('undoBtn'),
          document.getElementById('legendDock')
        ].every(element => element?.inert === true)
        })))
      };
      assertWorldMenderModalState(openingFocus, 'intro', '世界缝补师开场态');
      assert.equal(openingFocus.activeId, 'startBtn', '世界缝补师开场未把焦点移到开始按钮');
      assert.equal(openingFocus.role, 'dialog', '世界缝补师开场缺少 dialog 语义');
      assert.equal(openingFocus.modal, 'true', '世界缝补师开场缺少 aria-modal');
      assert.equal(openingFocus.backgroundInert, true, '世界缝补师开场背景控件未隔离');
    }
    await clickMatchingButton(page, /开始|进入|出发|唤醒|拿起/);
    const touch = await verifyTouchInput(page, entry.id);
    const lifecycle = await verifyLifecycle(page, entry.id);
    scenario = await runBaselineScenario(page, entry.id);
    const replay = await verifyEventsAndReplay(page, entry.id);
    scenario = { ...scenario, openingFocus, touch, lifecycle, replay };
  } else if (!entry.game && viewport.id === 'baseline') {
    await page.screenshot({ path: path.join(outputDir, 'hub-baseline.png'), fullPage: true });
    scenario = await verifyHubEventFlow(page);
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

const results = [];
const fatalErrors = [];
let browser = null;
let browserVersion = 'not-launched';
let server = null;
let origin = 'not-started';

try {
  await verifySources();
  await fs.mkdir(outputDir, { recursive: true });
  const started = await startServer();
  server = started.server;
  origin = `http://127.0.0.1:${started.port}`;
  browser = await chromium.launch({ executablePath: browserExecutable(), headless: true });
  browserVersion = browser.version();
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
  for (const entry of entries) {
    const result = await verifyDirectFile(browser, entry);
    results.push(result);
    process.stdout.write(`${entry.id.padEnd(21)} ${'direct-file'.padEnd(8)} PASS\n`);
  }
  for (const entry of entries.filter(item => item.game)) {
    const result = await verifyProductionGuards(browser, origin, entry);
    results.push(result);
    process.stdout.write(
      `${entry.id.padEnd(21)} ${'production-guard'.padEnd(16)}`
      + ` ${result.errors.length ? `FAIL ${result.errors.join(' | ')}` : 'PASS'}\n`
    );
  }
  const landscapeGuard = await verifyWorldMenderLandscapeGuard(browser, origin);
  results.push(landscapeGuard);
  process.stdout.write(
    `${landscapeGuard.page.padEnd(21)} ${landscapeGuard.viewport.padEnd(16)}`
    + ` ${landscapeGuard.errors.length ? `FAIL ${landscapeGuard.errors.join(' | ')}` : 'PASS'}\n`
  );
  const soundBus = await verifyWorldMenderSoundBus(browser, origin);
  results.push(soundBus);
  process.stdout.write(
    `${soundBus.page.padEnd(21)} ${soundBus.viewport.padEnd(16)}`
    + ` ${soundBus.errors.length ? `FAIL ${soundBus.errors.join(' | ')}` : 'PASS'}\n`
  );
} catch (error) {
  fatalErrors.push(errorText(error));
} finally {
  try {
    await browser?.close();
  } catch (error) {
    fatalErrors.push(`关闭浏览器失败：${errorText(error)}`);
  }
  try {
    server?.close();
  } catch (error) {
    fatalErrors.push(`关闭本地服务失败：${errorText(error)}`);
  }

  const resultFailures = results.flatMap(result => [
    ...(result.errors || []).map(error => `${result.page}/${result.viewport}: ${error}`),
    ...(result.externalRequests || []).map(url => `${result.page}/${result.viewport}: 外部请求 ${url}`)
  ]);
  const hardFailures = [
    ...resultFailures,
    ...fatalErrors.map(error => `fatal: ${error}`)
  ];
  const exitCode = hardFailures.length ? 1 : 0;
  const passedResults = results.filter(
    result => (result.errors || []).length === 0 && (result.externalRequests || []).length === 0
  ).length;
  const failedResults = results.length - passedResults;

  try {
    const metadata = await createVerificationMetadata({
      root,
      browserVersion,
      testedPaths,
      environment: {
        runner: 'playwright-core',
        origin: origin === 'not-started' ? origin : 'local-ephemeral-http',
        viewports,
        testQuery: '?test=1&seed=20260728&speed=20&mute=1'
      }
    });
    await writeJsonAtomic(path.join(outputDir, 'verification.json'), {
      ...metadata,
      status: exitCode === 0 ? 'PASS' : 'FAIL',
      exitCode,
      scope: {
        suite: 'wechat-h5-premium-games',
        pages: entries.map(entry => entry.id),
        expectedResultCount: 21,
        completedResultCount: results.length
      },
      summary: {
        total: results.length,
        pass: passedResults,
        fail: failedResults + fatalErrors.length
      },
      hardFailures,
      fatalErrors,
      results
    });
  } catch (error) {
    fatalErrors.push(`原子写入验收报告失败：${errorText(error)}`);
    process.stderr.write(`${fatalErrors.at(-1)}\n`);
    process.exitCode = 1;
  }

  if (hardFailures.length) process.stderr.write(`${hardFailures.join('\n')}\n`);
  if (process.exitCode !== 1) process.exitCode = exitCode;
}

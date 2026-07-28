import assert from 'node:assert/strict';
import fsSync from 'node:fs';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = process.cwd();
const outputFile = path.join(
  root,
  'test-results',
  'wechat-h5-premium-games',
  'longrun-performance.json'
);
const demoRoot = '/demos/%E5%BE%AE%E4%BF%A1H5%E7%B2%BE%E5%93%81%E6%B8%B8%E6%88%8F';
const viewport = { width: 390, height: 844, deviceScaleFactor: 2 };
const durationMs = 120_000;
const sampleIntervalMs = 10_000;
const seed = 20260728;
const games = [
  { id: 'five-seconds-later', title: '五秒之后', file: '01-five-seconds-later.html' },
  { id: 'world-mender', title: '世界缝补师', file: '02-world-mender.html' },
  { id: 'rift-hunter', title: '裂隙猎人', file: '03-rift-hunter.html' }
];
const thresholds = {
  frameP95WarningMs: 34,
  frameMaxWarningMs: 100,
  framesOver34MsRatioWarning: 0.05,
  heapGrowthWarningBytes: 16 * 1024 * 1024,
  heapGrowthWarningRatio: 0.3,
  domElementGrowthWarningCount: 100,
  domElementGrowthWarningRatio: 0.2,
  cdpNodeGrowthWarningCount: 300,
  cdpNodeGrowthWarningRatio: 0.3,
  minimumRafSamplesPerSecond: 20,
  allowedDurationShortfallMs: 2_000
};

function contentType(file) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  }[path.extname(file).toLowerCase()] || 'application/octet-stream';
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
        'Cache-Control': 'no-store'
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
  const executablePath = candidates.find(candidate => fsSync.existsSync(candidate));
  assert(executablePath, `未找到本地 Edge 或 Chrome：${candidates.join(', ')}`);
  return executablePath;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentile(sortedValues, ratio) {
  if (!sortedValues.length) return null;
  return sortedValues[Math.max(0, Math.ceil(sortedValues.length * ratio) - 1)];
}

function summarizeFrames(intervals) {
  const values = intervals.filter(Number.isFinite).filter(value => value >= 0).sort((a, b) => a - b);
  const over34MsCount = values.filter(value => value > 34).length;
  return {
    samples: values.length,
    medianMs: round(percentile(values, 0.5)),
    p95Ms: round(percentile(values, 0.95)),
    maxMs: round(values.at(-1)),
    over34MsCount,
    over34MsRatio: values.length ? round(over34MsCount / values.length, 5) : null
  };
}

function summarizeLongTasks(tasks) {
  const durations = tasks.map(task => task.duration).filter(Number.isFinite);
  return {
    count: durations.length,
    totalDurationMs: round(durations.reduce((total, value) => total + value, 0)),
    maxDurationMs: round(durations.length ? Math.max(...durations) : 0)
  };
}

function metricsObject(metrics) {
  return Object.fromEntries(metrics.map(metric => [metric.name, metric.value]));
}

function ratio(delta, start) {
  return Number.isFinite(delta) && Number.isFinite(start) && start !== 0
    ? round(delta / start, 4)
    : null;
}

function linearSlope(samples, valueSelector) {
  const points = samples
    .map(sample => ({ x: sample.atMs / 60_000, y: valueSelector(sample) }))
    .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (points.length < 2) return null;
  const xMean = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const yMean = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const numerator = points.reduce(
    (sum, point) => sum + (point.x - xMean) * (point.y - yMean),
    0
  );
  const denominator = points.reduce((sum, point) => sum + (point.x - xMean) ** 2, 0);
  return denominator ? round(numerator / denominator) : null;
}

function summarizeState(gameId, state) {
  if (!state) return null;
  if (gameId === 'five-seconds-later') {
    return {
      runId: state.runId,
      mode: state.mode,
      phase: state.phase,
      elapsed: state.elapsed,
      energy: state.energy,
      echoCount: state.echoCount,
      pathPoints: state.pathPoints,
      targetsRemaining: state.targetsRemaining,
      coreHp: state.coreHp
    };
  }
  if (gameId === 'world-mender') {
    return {
      runId: state.runId,
      phase: state.phase,
      elapsed: state.elapsed,
      paused: state.paused,
      thread: state.thread,
      stitchedEdges: state.stitchedEdges,
      saved: state.saved,
      lost: state.lost,
      spawned: state.spawned
    };
  }
  return {
    runId: state.runId,
    mode: state.mode,
    elapsed: round(state.elapsed),
    paused: state.paused,
    result: state.result,
    hp: round(state.player?.hp),
    xp: state.xp,
    weaponStage: state.weaponStage,
    kills: state.kills,
    danger: round(state.danger),
    lootCount: state.loot?.length ?? 0,
    activePools: state.pools
      ? {
          enemies: state.pools.enemies,
          bullets: state.pools.bullets,
          enemyShots: state.pools.enemyShots,
          drops: state.pools.drops,
          particles: state.pools.particles
        }
      : null
  };
}

async function installActivity(page, gameId) {
  await page.evaluate(id => {
    const game = window.__GAME_TEST__;
    if (!game || typeof game.getState !== 'function') {
      throw new Error('缺少 window.__GAME_TEST__');
    }
    window.clearInterval(window.__LONGRUN_ACTIVITY_TIMER__);
    const stats = window.__LONGRUN_ACTIVITY_STATS__ = { actions: 0, resets: 0 };

    const startFiveSeconds = () => {
      game.reset();
      game.start();
      stats.resets += 1;
    };
    const startWorldMender = () => {
      game.reset();
      game.start();
      for (const pair of [
        ['w1', 'w2'],
        ['n1', 'n2'],
        ['e1', 'e2'],
        ['g1', 'g2']
      ]) {
        game.connect(...pair);
        stats.actions += 1;
      }
      stats.resets += 1;
    };
    const startRiftHunter = () => {
      game.reset();
      stats.resets += 1;
    };

    if (id === 'five-seconds-later') {
      const points = [
        [72, 286], [318, 286], [318, 696], [72, 696],
        [195, 390], [300, 550], [92, 560], [195, 730]
      ];
      let index = 0;
      startFiveSeconds();
      game.setTarget(...points[index]);
      window.__LONGRUN_ACTIVITY_TIMER__ = window.setInterval(() => {
        const state = game.getState();
        if (state.mode === 'paused') game.resume();
        else if (state.mode !== 'playing') startFiveSeconds();
        index = (index + 1) % points.length;
        game.setTarget(...points[index]);
        stats.actions += 1;
      }, 650);
      return;
    }

    if (id === 'world-mender') {
      startWorldMender();
      window.__LONGRUN_ACTIVITY_TIMER__ = window.setInterval(() => {
        const state = game.getState();
        if (state.paused) game.resume();
        else if (state.phase !== 'playing') startWorldMender();
        stats.actions += 1;
      }, 750);
      return;
    }

    const points = [
      [78, 310], [310, 310], [315, 700], [75, 700],
      [195, 410], [300, 560], [90, 550], [195, 730]
    ];
    let index = 0;
    startRiftHunter();
    game.moveTo(...points[index]);
    window.__LONGRUN_ACTIVITY_TIMER__ = window.setInterval(() => {
      let state = game.getState();
      if (state.mode !== 'playing') {
        startRiftHunter();
        state = game.getState();
      }
      index = (index + 1) % points.length;
      game.moveTo(...points[index]);
      if (index % 3 === 0) game.grantXp(4);
      if (index % 4 === 0 && (state.loot?.length ?? 0) < 5) game.grantLoot(100);
      stats.actions += 1;
    }, 650);
  }, gameId);
}

function trendAndWarnings(samples, overallFrame, longTasks) {
  const start = samples[0];
  const end = samples.at(-1);
  const heapDelta = Number.isFinite(start?.jsHeap.usedBytes) && Number.isFinite(end?.jsHeap.usedBytes)
    ? end.jsHeap.usedBytes - start.jsHeap.usedBytes
    : null;
  const domElementDelta = end.dom.elementCount - start.dom.elementCount;
  const cdpNodeDelta = Number.isFinite(start.dom.cdpNodes) && Number.isFinite(end.dom.cdpNodes)
    ? end.dom.cdpNodes - start.dom.cdpNodes
    : null;
  const trend = {
    firstToLast: {
      heapUsedBytes: heapDelta,
      heapUsedRatio: ratio(heapDelta, start?.jsHeap.usedBytes),
      domElements: domElementDelta,
      domElementsRatio: ratio(domElementDelta, start.dom.elementCount),
      cdpNodes: cdpNodeDelta,
      cdpNodesRatio: ratio(cdpNodeDelta, start.dom.cdpNodes)
    },
    slopePerMinute: {
      heapUsedBytes: linearSlope(samples, sample => sample.jsHeap.usedBytes),
      domElements: linearSlope(samples, sample => sample.dom.elementCount),
      cdpNodes: linearSlope(samples, sample => sample.dom.cdpNodes)
    }
  };
  const warnings = [];
  if (overallFrame.p95Ms > thresholds.frameP95WarningMs) {
    warnings.push(`全程 rAF P95 ${overallFrame.p95Ms}ms 超过 ${thresholds.frameP95WarningMs}ms`);
  }
  if (overallFrame.maxMs > thresholds.frameMaxWarningMs) {
    warnings.push(`全程 rAF 最大间隔 ${overallFrame.maxMs}ms 超过 ${thresholds.frameMaxWarningMs}ms`);
  }
  if (overallFrame.over34MsRatio > thresholds.framesOver34MsRatioWarning) {
    warnings.push(
      `全程 >34ms 占比 ${(overallFrame.over34MsRatio * 100).toFixed(2)}%`
      + ` 超过 ${(thresholds.framesOver34MsRatioWarning * 100).toFixed(0)}%`
    );
  }
  if (longTasks.count > 0) warnings.push(`观测到 ${longTasks.count} 个 Long Task`);
  if (
    heapDelta > thresholds.heapGrowthWarningBytes
    && trend.firstToLast.heapUsedRatio > thresholds.heapGrowthWarningRatio
  ) {
    warnings.push(
      `JS 堆首尾增长 ${round(heapDelta / 1024 / 1024)}MB`
      + `（${round(trend.firstToLast.heapUsedRatio * 100)}%）`
    );
  }
  if (
    domElementDelta > thresholds.domElementGrowthWarningCount
    && trend.firstToLast.domElementsRatio > thresholds.domElementGrowthWarningRatio
  ) {
    warnings.push(`DOM 元素首尾增长 ${domElementDelta} 个`);
  }
  if (
    cdpNodeDelta > thresholds.cdpNodeGrowthWarningCount
    && trend.firstToLast.cdpNodesRatio > thresholds.cdpNodeGrowthWarningRatio
  ) {
    warnings.push(`CDP Nodes 首尾增长 ${cdpNodeDelta} 个`);
  }
  return { trend, warnings };
}

async function profileGame(browser, origin, game) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'no-preference',
    serviceWorkers: 'block'
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const externalRequests = [];
  const requestFailures = [];
  const session = await context.newCDPSession(page);

  await page.addInitScript(() => {
    let measuring = false;
    let startedAt = 0;
    let lastSampleAt = 0;
    let lastRaf = null;
    const intervals = [];
    const longTasks = [];
    const longTaskSupported = Boolean(
      window.PerformanceObserver
      && PerformanceObserver.supportedEntryTypes?.includes('longtask')
    );
    let observer = null;
    if (longTaskSupported) {
      try {
        observer = new PerformanceObserver(list => {
          if (!measuring) return;
          for (const entry of list.getEntries()) {
            longTasks.push({ startTime: entry.startTime, duration: entry.duration });
          }
        });
        observer.observe({ type: 'longtask', buffered: false });
      } catch {
        observer = null;
      }
    }
    const tick = now => {
      if (measuring) {
        if (lastRaf !== null) intervals.push(now - lastRaf);
        lastRaf = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    window.__LONGRUN_PROBE__ = {
      reset() {
        intervals.length = 0;
        longTasks.length = 0;
        measuring = true;
        startedAt = performance.now();
        lastSampleAt = startedAt;
        lastRaf = null;
      },
      take() {
        const now = performance.now();
        const result = {
          atMs: now - startedAt,
          windowDurationMs: now - lastSampleAt,
          intervals: intervals.splice(0),
          longTasks: longTasks.splice(0),
          longTaskSupported: Boolean(observer),
          performanceMemory: performance.memory
            ? {
                usedBytes: performance.memory.usedJSHeapSize,
                totalBytes: performance.memory.totalJSHeapSize,
                limitBytes: performance.memory.jsHeapSizeLimit
              }
            : null,
          domElementCount: document.getElementsByTagName('*').length
        };
        lastSampleAt = now;
        return result;
      },
      stop() {
        measuring = false;
      }
    };
  });

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
    const url = request.url();
    if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:')) {
      externalRequests.push(url);
    }
  });
  page.on('requestfailed', request => {
    requestFailures.push(`${request.url()}: ${request.failure()?.errorText || 'unknown'}`);
  });

  try {
    await session.send('Performance.enable');
    const url = `${origin}${demoRoot}/${game.file}?test=1&seed=${seed}&speed=1&mute=1`;
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    assert(response?.ok(), `${game.title} 页面加载失败`);
    await page.waitForFunction(
      () => Boolean(window.__GAME_TEST__ && typeof window.__GAME_TEST__.getState === 'function'),
      null,
      { timeout: 5_000 }
    );
    await installActivity(page, game.id);
    await page.waitForTimeout(1_000);
    await page.evaluate(() => window.__LONGRUN_PROBE__.reset());

    const samples = [];
    const allIntervals = [];
    const allLongTasks = [];
    const sampleCount = Math.ceil(durationMs / sampleIntervalMs);
    const startedWall = Date.now();

    for (let index = 0; index <= sampleCount; index += 1) {
      if (index > 0) {
        const targetAt = startedWall + Math.min(index * sampleIntervalMs, durationMs);
        await page.waitForTimeout(Math.max(0, targetAt - Date.now()));
      }
      const [probe, cdp, stateAndActivity] = await Promise.all([
        page.evaluate(() => window.__LONGRUN_PROBE__.take()),
        session.send('Performance.getMetrics').then(result => metricsObject(result.metrics)),
        page.evaluate(() => ({
          state: window.__GAME_TEST__.getState(),
          activity: { ...window.__LONGRUN_ACTIVITY_STATS__ }
        }))
      ]);
      allIntervals.push(...probe.intervals);
      allLongTasks.push(...probe.longTasks);
      const cdpHeapSupported = Number.isFinite(cdp.JSHeapUsedSize);
      samples.push({
        atMs: round(probe.atMs),
        windowDurationMs: round(probe.windowDurationMs),
        frame: summarizeFrames(probe.intervals),
        longTasks: {
          supported: probe.longTaskSupported,
          ...summarizeLongTasks(probe.longTasks)
        },
        jsHeap: {
          supported: cdpHeapSupported || Boolean(probe.performanceMemory),
          source: cdpHeapSupported
            ? 'Chrome DevTools Protocol Performance.getMetrics'
            : probe.performanceMemory
              ? 'performance.memory'
              : null,
          usedBytes: cdpHeapSupported ? Math.round(cdp.JSHeapUsedSize) : probe.performanceMemory?.usedBytes ?? null,
          totalBytes: Number.isFinite(cdp.JSHeapTotalSize)
            ? Math.round(cdp.JSHeapTotalSize)
            : probe.performanceMemory?.totalBytes ?? null
        },
        dom: {
          elementCount: probe.domElementCount,
          cdpNodes: Number.isFinite(cdp.Nodes) ? Math.round(cdp.Nodes) : null,
          documents: Number.isFinite(cdp.Documents) ? Math.round(cdp.Documents) : null,
          eventListeners: Number.isFinite(cdp.JSEventListeners) ? Math.round(cdp.JSEventListeners) : null
        },
        publicState: summarizeState(game.id, stateAndActivity.state),
        activity: stateAndActivity.activity,
        observedErrorCounts: {
          console: consoleErrors.length,
          page: pageErrors.length,
          externalRequests: externalRequests.length,
          requestFailures: requestFailures.length
        }
      });
      if (index > 0 && index % 3 === 0) {
        const latest = samples.at(-1);
        process.stdout.write(
          `${game.title} 进度 ${Math.round(latest.atMs / 1000)}s`
          + ` · 堆 ${latest.jsHeap.supported ? `${round(latest.jsHeap.usedBytes / 1024 / 1024)}MB` : '不支持'}`
          + ` · DOM ${latest.dom.elementCount}\n`
        );
      }
    }
    await page.evaluate(() => window.__LONGRUN_PROBE__.stop());

    const measuredDurationMs = samples.at(-1).atMs;
    const overallFrame = summarizeFrames(allIntervals);
    const overallLongTasks = {
      supported: samples.some(sample => sample.longTasks.supported),
      ...summarizeLongTasks(allLongTasks)
    };
    const { trend, warnings } = trendAndWarnings(samples, overallFrame, overallLongTasks);
    const finalActivity = samples.at(-1).activity;
    const uniqueConsoleErrors = [...new Set(consoleErrors)];
    const uniquePageErrors = [...new Set(pageErrors)];
    const uniqueExternalRequests = [...new Set(externalRequests)];
    const uniqueRequestFailures = [...new Set(requestFailures)];
    const hardErrors = [
      ...uniqueConsoleErrors.map(error => `console: ${error}`),
      ...uniquePageErrors.map(error => `page: ${error}`),
      ...uniqueExternalRequests.map(urlValue => `外部请求: ${urlValue}`),
      ...uniqueRequestFailures.map(error => `请求失败: ${error}`)
    ];
    if (measuredDurationMs < durationMs - thresholds.allowedDurationShortfallMs) {
      hardErrors.push(`有效采样时长不足：${measuredDurationMs}ms`);
    }
    const minimumRafSamples = durationMs / 1000 * thresholds.minimumRafSamplesPerSecond;
    if (overallFrame.samples < minimumRafSamples) {
      hardErrors.push(`rAF 样本不足：${overallFrame.samples} < ${minimumRafSamples}`);
    }
    if (samples.length !== sampleCount + 1) {
      hardErrors.push(`时间序列样本数异常：${samples.length} != ${sampleCount + 1}`);
    }
    if (!samples.at(-1).publicState?.runId) hardErrors.push('最终公开状态缺少 runId');

    return {
      id: game.id,
      title: game.title,
      targetDurationMs: durationMs,
      measuredDurationMs,
      sampleIntervalMs,
      activityPolicy: game.id === 'five-seconds-later'
        ? '自然速度；每 650ms 移动目标，结束后通过公开测试接口重开'
        : game.id === 'world-mender'
          ? '自然速度；每局建立三条救援路线和花园回路，结算后通过公开测试接口重开'
          : '自然速度；每 650ms 移动，按低频测试接口补经验且战利品不超过五件，结束后重开',
      activityTotals: finalActivity,
      overall: {
        frame: overallFrame,
        longTasks: overallLongTasks
      },
      trend,
      samples,
      finalPublicState: samples.at(-1).publicState,
      errors: {
        console: uniqueConsoleErrors,
        page: uniquePageErrors,
        externalRequests: uniqueExternalRequests,
        requestFailures: uniqueRequestFailures,
        validation: hardErrors.filter(error => !error.includes(': '))
      },
      warnings,
      hardErrors,
      status: hardErrors.length ? 'FAIL' : warnings.length ? 'PASS_WITH_WARNINGS' : 'PASS'
    };
  } finally {
    await page.evaluate(() => window.clearInterval(window.__LONGRUN_ACTIVITY_TIMER__)).catch(() => {});
    await session.detach().catch(() => {});
    await context.close();
  }
}

await fs.mkdir(path.dirname(outputFile), { recursive: true });
const executablePath = browserExecutable();
const { server, port } = await startServer();
const origin = `http://127.0.0.1:${port}`;
let browser;

try {
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      '--no-first-run',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--enable-precise-memory-info'
    ]
  });
  const results = [];
  for (const game of games) {
    process.stdout.write(`开始 ${game.title}：自然速度 ${durationMs / 60_000} 分钟长时剖析\n`);
    try {
      const result = await profileGame(browser, origin, game);
      results.push(result);
      const delta = result.trend.firstToLast;
      process.stdout.write(
        `${game.title} ${result.status}`
        + ` · P95 ${result.overall.frame.p95Ms}ms`
        + ` · >34ms ${(result.overall.frame.over34MsRatio * 100).toFixed(2)}%`
        + ` · Long Task ${result.overall.longTasks.count}`
        + ` · 堆增量 ${delta.heapUsedBytes === null ? '不支持' : `${round(delta.heapUsedBytes / 1024 / 1024)}MB`}`
        + ` · DOM 增量 ${delta.domElements}\n`
      );
    } catch (error) {
      results.push({
        id: game.id,
        title: game.title,
        targetDurationMs: durationMs,
        measuredDurationMs: null,
        status: 'FAIL',
        fatalError: error instanceof Error ? error.stack || error.message : String(error),
        hardErrors: [error instanceof Error ? error.message : String(error)]
      });
      process.stderr.write(`${game.title} FAIL · ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  const hardFailures = results.filter(result => result.status === 'FAIL');
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scope: '本地 Edge/Playwright 移动视口、自然速度、每款 2 分钟长时稳定性与内存趋势预警',
    disclaimer: '本报告仅用于浏览器回归与泄漏线索筛查；未经微信真机多轮测试，不代表微信 web-view 的帧率、内存、功耗或上线认证结论。',
    methodology: {
      sequence: '三款游戏在同一浏览器进程中按列表顺序运行，每款使用全新浏览器上下文',
      sampling: `预热 1 秒后每 ${sampleIntervalMs / 1000} 秒采样，共 ${durationMs / sampleIntervalMs + 1} 个时间点`,
      heap: '优先读取 CDP JSHeapUsedSize；不主动触发 GC，因此首尾增量和线性斜率只能提示趋势，不能单独证明内存泄漏',
      dom: '同时记录页面实时 DOM 元素数与 CDP Nodes；CDP Nodes 可能包含文档或暂未回收节点',
      frame: '通过页面 requestAnimationFrame 帧间隔观测；无头 Edge 调度与微信 web-view 真机不同',
      longTask: '使用 PerformanceObserver longtask；仅在浏览器支持时记录'
    },
    environment: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      nodeVersion: process.version,
      browser: executablePath.toLowerCase().includes('msedge') ? 'Microsoft Edge' : 'Google Chrome',
      browserVersion: browser.version(),
      executablePath,
      headless: true,
      viewport,
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'no-preference',
      seed,
      timeScale: 1
    },
    thresholds: {
      ...thresholds,
      policy: '帧、Long Task、堆和 DOM 阈值仅生成 WARN；页面/控制台错误、外部请求、请求失败或采样完整性不足才判定 FAIL 并返回非零退出码。'
    },
    summary: {
      games: results.length,
      pass: results.filter(result => result.status === 'PASS').length,
      passWithWarnings: results.filter(result => result.status === 'PASS_WITH_WARNINGS').length,
      fail: hardFailures.length,
      noExternalRequests: results.every(result => (result.errors?.externalRequests?.length ?? 0) === 0),
      noConsoleErrors: results.every(result => (result.errors?.console?.length ?? 0) === 0),
      noPageErrors: results.every(result => (result.errors?.page?.length ?? 0) === 0)
    },
    games: results
  };
  await fs.writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`长时性能报告：${path.relative(root, outputFile)}\n`);
  process.stdout.write('说明：以上为本地无头 Edge 预警数据，不替代微信真机长时验收。\n');
  if (hardFailures.length) process.exitCode = 1;
} finally {
  await browser?.close();
  server.close();
}

import assert from 'node:assert/strict';
import fsSync from 'node:fs';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import {
  createVerificationMetadata,
  errorText,
  writeJsonAtomic
} from './verification-metadata.mjs';

const root = process.cwd();
const outputFile = path.join(
  root,
  'test-results',
  'wechat-h5-premium-games',
  'performance.json'
);
const demoRoot = '/demos/%E5%BE%AE%E4%BF%A1H5%E7%B2%BE%E5%93%81%E6%B8%B8%E6%88%8F';
const viewport = { width: 390, height: 844, deviceScaleFactor: 2 };
const measurementDurationMs = 8_000;
const seed = 20260728;
const games = [
  { id: 'five-seconds-later', title: '五秒之后', file: '01-five-seconds-later.html' },
  { id: 'world-mender', title: '世界缝补师', file: '02-world-mender.html' },
  { id: 'rift-hunter', title: '裂隙猎人', file: '03-rift-hunter.html' }
];
const testedPaths = [
  ...games.map(game => `demos/微信H5精品游戏/${game.file}`),
  'package-lock.json',
  'package.json',
  'tools/profile-wechat-h5-premium-games.mjs',
  'tools/verification-metadata.mjs'
].sort();
const thresholds = {
  frameP95WarningMs: 34,
  frameMaxWarningMs: 100,
  framesOver34MsRatioWarning: 0.05,
  longTaskDurationWarningMs: 50
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
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
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
  const index = Math.max(0, Math.ceil(sortedValues.length * ratio) - 1);
  return sortedValues[index];
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
    over34MsRatio: values.length ? round(over34MsCount / values.length, 4) : null
  };
}

function metricsObject(metrics) {
  return Object.fromEntries(metrics.map(metric => [metric.name, metric.value]));
}

function summarizeState(gameId, state) {
  if (!state) return null;
  if (gameId === 'five-seconds-later') {
    return {
      gameId: state.gameId,
      runId: state.runId,
      mode: state.mode,
      phase: state.phase,
      elapsed: state.elapsed,
      remaining: state.remaining,
      energy: state.energy,
      player: state.player,
      target: state.target,
      echoCount: state.echoCount,
      pathPoints: state.pathPoints,
      targetsDestroyed: state.targetsDestroyed,
      targetsRemaining: state.targetsRemaining
    };
  }
  if (gameId === 'world-mender') {
    return {
      gameId: state.gameId,
      runId: state.runId,
      phase: state.phase,
      elapsed: state.elapsed,
      timeRemaining: state.timeRemaining,
      paused: state.paused,
      thread: state.thread,
      stitchedEdges: state.stitchedEdges,
      saved: state.saved,
      lost: state.lost,
      spawned: state.spawned,
      gardenConnected: state.gardenConnected
    };
  }
  return {
    gameId: state.gameId,
    runId: state.runId,
    mode: state.mode,
    elapsed: round(state.elapsed),
    paused: state.paused,
    result: state.result,
    player: state.player,
    xp: state.xp,
    weaponStage: state.weaponStage,
    kills: state.kills,
    danger: round(state.danger),
    lootCount: state.loot?.length ?? 0,
    pools: state.pools
  };
}

function performanceWarnings(frame, longTasks) {
  const warnings = [];
  if (frame.p95Ms !== null && frame.p95Ms > thresholds.frameP95WarningMs) {
    warnings.push(`rAF P95 ${frame.p95Ms}ms 超过 ${thresholds.frameP95WarningMs}ms 预警线`);
  }
  if (frame.maxMs !== null && frame.maxMs > thresholds.frameMaxWarningMs) {
    warnings.push(`rAF 最大间隔 ${frame.maxMs}ms 超过 ${thresholds.frameMaxWarningMs}ms 预警线`);
  }
  if (
    frame.over34MsRatio !== null
    && frame.over34MsRatio > thresholds.framesOver34MsRatioWarning
  ) {
    warnings.push(
      `大于 34ms 的帧间隔占比 ${(frame.over34MsRatio * 100).toFixed(2)}%`
      + ` 超过 ${(thresholds.framesOver34MsRatioWarning * 100).toFixed(0)}% 预警线`
    );
  }
  if (longTasks.supported && longTasks.count > 0) {
    warnings.push(`观测到 ${longTasks.count} 个不短于 ${thresholds.longTaskDurationWarningMs}ms 的 Long Task`);
  }
  return warnings;
}

async function installActivity(page, gameId) {
  await page.evaluate(id => {
    const game = window.__GAME_TEST__;
    if (!game || typeof game.getState !== 'function') {
      throw new Error('缺少 window.__GAME_TEST__');
    }
    window.clearInterval(window.__PERF_ACTIVITY_TIMER__);

    if (id === 'five-seconds-later') {
      game.reset();
      game.start();
      const points = [
        [72, 286], [318, 286], [318, 696], [72, 696],
        [195, 390], [300, 550], [92, 560], [195, 730]
      ];
      let index = 0;
      game.setTarget(...points[index]);
      window.__PERF_ACTIVITY_TIMER__ = window.setInterval(() => {
        const state = game.getState();
        if (state.mode === 'paused' && typeof game.resume === 'function') game.resume();
        if (state.mode === 'playing') {
          index = (index + 1) % points.length;
          game.setTarget(...points[index]);
        }
      }, 650);
      return;
    }

    if (id === 'world-mender') {
      game.reset();
      game.start();
      for (const pair of [
        ['w1', 'w2'],
        ['n1', 'n2'],
        ['e1', 'e2'],
        ['g1', 'g2']
      ]) {
        game.connect(...pair);
      }
      window.__PERF_ACTIVITY_TIMER__ = window.setInterval(() => {
        const state = game.getState();
        if (state.paused && typeof game.resume === 'function') game.resume();
      }, 750);
      return;
    }

    game.reset();
    const points = [
      [78, 310], [310, 310], [315, 700], [75, 700],
      [195, 410], [300, 560], [90, 550], [195, 730]
    ];
    let index = 0;
    game.moveTo(...points[index]);
    window.__PERF_ACTIVITY_TIMER__ = window.setInterval(() => {
      const state = game.getState();
      if (state.mode === 'playing') {
        index = (index + 1) % points.length;
        game.moveTo(...points[index]);
        if (index % 3 === 0) game.grantXp(4);
        if (index % 4 === 0) game.grantLoot(80 + index * 5);
      }
    }, 650);
  }, gameId);
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
    const intervals = [];
    const longTasks = [];
    const longTaskSupported = Boolean(
      window.PerformanceObserver
      && PerformanceObserver.supportedEntryTypes?.includes('longtask')
    );
    let measuring = false;
    let lastRaf = null;
    let startedAt = null;
    let heapStart = null;
    let heapEnd = null;
    let heapPeak = null;

    const readHeap = () => {
      const memory = performance.memory;
      if (!memory || !Number.isFinite(memory.usedJSHeapSize)) return null;
      return {
        usedBytes: memory.usedJSHeapSize,
        totalBytes: memory.totalJSHeapSize,
        limitBytes: memory.jsHeapSizeLimit
      };
    };

    let observer = null;
    if (longTaskSupported) {
      try {
        observer = new PerformanceObserver(list => {
          if (!measuring) return;
          for (const entry of list.getEntries()) {
            longTasks.push({
              startTime: entry.startTime,
              duration: entry.duration
            });
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
        const heap = readHeap();
        if (heap) heapPeak = Math.max(heapPeak ?? 0, heap.usedBytes);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    window.__PERF_PROBE__ = {
      reset() {
        intervals.length = 0;
        longTasks.length = 0;
        measuring = true;
        lastRaf = null;
        startedAt = performance.now();
        heapStart = readHeap();
        heapEnd = null;
        heapPeak = heapStart?.usedBytes ?? null;
      },
      stop() {
        measuring = false;
        heapEnd = readHeap();
        if (heapEnd) heapPeak = Math.max(heapPeak ?? 0, heapEnd.usedBytes);
        return {
          durationMs: performance.now() - startedAt,
          intervals: intervals.slice(),
          longTaskSupported: Boolean(observer),
          longTasks: longTasks.slice(),
          heapStart,
          heapEnd,
          heapPeak
        };
      }
    };
  });

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
    const url = request.url();
    if (
      !url.startsWith(origin)
      && !url.startsWith('data:')
      && !url.startsWith('blob:')
    ) {
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
    await page.waitForTimeout(600);

    await page.evaluate(() => window.__PERF_PROBE__.reset());
    const cdpStart = metricsObject((await session.send('Performance.getMetrics')).metrics);
    await page.waitForTimeout(measurementDurationMs);
    const probe = await page.evaluate(() => window.__PERF_PROBE__.stop());
    const cdpEnd = metricsObject((await session.send('Performance.getMetrics')).metrics);
    const publicState = await page.evaluate(() => window.__GAME_TEST__.getState());

    const frame = summarizeFrames(probe.intervals);
    const longTaskDurations = probe.longTasks.map(task => task.duration).filter(Number.isFinite);
    const longTasks = {
      supported: probe.longTaskSupported,
      count: longTaskDurations.length,
      totalDurationMs: round(longTaskDurations.reduce((total, value) => total + value, 0)),
      maxDurationMs: round(longTaskDurations.length ? Math.max(...longTaskDurations) : 0)
    };
    const cdpHeapSupported = Number.isFinite(cdpStart.JSHeapUsedSize)
      && Number.isFinite(cdpEnd.JSHeapUsedSize);
    const probeHeapSupported = Boolean(probe.heapStart && probe.heapEnd);
    const jsHeap = cdpHeapSupported
      ? {
          supported: true,
          source: 'Chrome DevTools Protocol Performance.getMetrics',
          startUsedBytes: Math.round(cdpStart.JSHeapUsedSize),
          endUsedBytes: Math.round(cdpEnd.JSHeapUsedSize),
          deltaUsedBytes: Math.round(cdpEnd.JSHeapUsedSize - cdpStart.JSHeapUsedSize),
          peakUsedBytes: probe.heapPeak ? Math.round(probe.heapPeak) : null,
          totalBytes: Number.isFinite(cdpEnd.JSHeapTotalSize)
            ? Math.round(cdpEnd.JSHeapTotalSize)
            : null
        }
      : {
          supported: probeHeapSupported,
          source: probeHeapSupported ? 'performance.memory' : null,
          startUsedBytes: probe.heapStart?.usedBytes ?? null,
          endUsedBytes: probe.heapEnd?.usedBytes ?? null,
          deltaUsedBytes: probeHeapSupported
            ? probe.heapEnd.usedBytes - probe.heapStart.usedBytes
            : null,
          peakUsedBytes: probe.heapPeak,
          totalBytes: probe.heapEnd?.totalBytes ?? null
        };
    const warnings = performanceWarnings(frame, longTasks);
    const hardErrors = [
      ...consoleErrors.map(error => `console: ${error}`),
      ...pageErrors.map(error => `page: ${error}`),
      ...externalRequests.map(urlValue => `外部请求: ${urlValue}`),
      ...requestFailures.map(error => `请求失败: ${error}`)
    ];

    return {
      id: game.id,
      title: game.title,
      measurementDurationMs: round(probe.durationMs),
      activity: game.id === 'five-seconds-later'
        ? '测试接口启动；每 650ms 在八个场内目标点间移动，时间倍率 1'
        : game.id === 'world-mender'
          ? '测试接口启动；建立三条救援路线与花园回路，动态生命按自然时间运行'
          : '测试接口启动；每 650ms 移动，间隔补充少量经验与战利品，时间倍率 1',
      metrics: { frame, longTasks, jsHeap },
      finalPublicState: summarizeState(game.id, publicState),
      consoleErrors,
      pageErrors,
      externalRequests: [...new Set(externalRequests)],
      requestFailures,
      warnings,
      status: hardErrors.length ? 'FAIL' : warnings.length ? 'PASS_WITH_WARNINGS' : 'PASS'
    };
  } finally {
    await page.evaluate(() => window.clearInterval(window.__PERF_ACTIVITY_TIMER__)).catch(() => {});
    await session.detach().catch(() => {});
    await context.close();
  }
}

let browser;
let server;
let executablePath = 'unavailable';
let browserVersion = 'launch-failed';
const results = [];

async function createReport(fatalError) {
  const hardFailures = results.filter(result => result.status === 'FAIL');
  const failCount = hardFailures.length + (fatalError ? 1 : 0);
  const metadata = await createVerificationMetadata({
    root,
    browserVersion,
    testedPaths,
    environment: {
      browser: executablePath === 'unavailable'
        ? 'unavailable'
        : executablePath.toLowerCase().includes('msedge')
          ? 'Microsoft Edge'
          : 'Google Chrome',
      executablePath,
      headless: true,
      viewport,
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'no-preference',
      seed,
      timeScale: 1
    }
  });
  return {
    ...metadata,
    scope: '本地 Edge/Playwright 移动视口、自然速度、单次 8 秒性能预警',
    disclaimer: '本报告用于浏览器侧回归预警，不代表微信 web-view 真机性能、功耗、内存或上线认证结论。',
    exitCode: failCount > 0 ? 1 : 0,
    thresholds: {
      ...thresholds,
      policy: '阈值仅生成 WARN，不造成性能失败；console/page 错误、外部请求或请求失败才判定 FAIL。'
    },
    summary: {
      games: results.length,
      pass: results.filter(result => result.status === 'PASS').length,
      passWithWarnings: results.filter(result => result.status === 'PASS_WITH_WARNINGS').length,
      fail: failCount,
      noExternalRequests: results.every(result => (result.externalRequests?.length ?? 0) === 0),
      noConsoleErrors: results.every(result => (result.consoleErrors?.length ?? 0) === 0),
      noPageErrors: results.every(result => (result.pageErrors?.length ?? 0) === 0)
    },
    ...(fatalError ? { fatalError } : {}),
    games: results
  };
}

try {
  executablePath = browserExecutable();
  const runningServer = await startServer();
  server = runningServer.server;
  const origin = `http://127.0.0.1:${runningServer.port}`;
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
  browserVersion = browser.version();

  for (const game of games) {
    try {
      const result = await profileGame(browser, origin, game);
      results.push(result);
      const frame = result.metrics.frame;
      const longTasks = result.metrics.longTasks;
      const heap = result.metrics.jsHeap;
      const warningText = result.warnings.length ? ` · 预警：${result.warnings.join('；')}` : '';
      process.stdout.write(
        `${game.title.padEnd(7)} ${result.status}`
        + ` · rAF ${frame.samples} 样本`
        + ` · 中位 ${frame.medianMs}ms / P95 ${frame.p95Ms}ms / 最大 ${frame.maxMs}ms`
        + ` · >34ms ${(frame.over34MsRatio * 100).toFixed(2)}%`
        + ` · Long Task ${longTasks.supported ? longTasks.count : '不支持'}`
        + ` · JS 堆 ${heap.supported ? `${round(heap.endUsedBytes / 1024 / 1024)}MB` : '不支持'}`
        + `${warningText}\n`
      );
    } catch (error) {
      const fatalError = errorText(error);
      results.push({
        id: game.id,
        title: game.title,
        measurementDurationMs: null,
        status: 'FAIL',
        fatalError
      });
      process.stderr.write(`${game.title} FAIL · ${fatalError}\n`);
    }
  }

  const report = await createReport();
  await writeJsonAtomic(outputFile, report);
  process.stdout.write(`性能报告：${path.relative(root, outputFile)}\n`);
  process.stdout.write('说明：以上为本地无头浏览器预警数据，不替代微信真机性能验收。\n');
  if (report.exitCode !== 0) process.exitCode = report.exitCode;
} catch (error) {
  const fatalError = errorText(error);
  const report = await createReport(fatalError);
  await writeJsonAtomic(outputFile, report);
  process.stderr.write(`性能验收异常：${fatalError}\n`);
  process.stderr.write(`失败报告：${path.relative(root, outputFile)}\n`);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  server?.close();
}

import http from 'node:http';
import path from 'node:path';
import fsSync from 'node:fs';
import { promises as fs } from 'node:fs';
import { chromium } from 'playwright-core';

const root = process.cwd();
const outputRoot = path.join(root, 'test-results', 'wechat-h5-premium-games');
const screenshotDir = path.join(outputRoot, 'accessibility-screenshots');
const outputFile = path.join(outputRoot, 'accessibility.json');
const demoRoot = '/demos/%E5%BE%AE%E4%BF%A1H5%E7%B2%BE%E5%93%81%E6%B8%B8%E6%88%8F';
const entries = [
  { id: 'hub', file: 'index.html', game: false },
  { id: 'five-seconds-later', file: '01-five-seconds-later.html', game: true },
  { id: 'world-mender', file: '02-world-mender.html', game: true },
  { id: 'rift-hunter', file: '03-rift-hunter.html', game: true }
];

const results = [];
const caveats = [
  '200% 页面缩放使用 CSS zoom 模拟内容放大与裁切风险，不等同浏览器原生 Ctrl/+ 或微信 WebView 缩放。',
  '大字号使用测试脚本把可见 DOM 文本的计算字号放大到 200%，不等同 iOS/Android 或微信系统字号；Canvas 内绘制文字不会被用户样式表放大。',
  '横屏与超宽短屏只覆盖 Edge/Playwright 视口，不代表带刘海、折叠屏或微信导航栏的真实可用区域。',
  '键盘检查覆盖当前可见 DOM 控件的 Tab 顺序和焦点可见性；Canvas 核心玩法仍以触摸/指针为主。',
  '减少动态效果检查覆盖 prefers-reduced-motion 媒体查询、可观察 CSS/控件状态与持续可操作性，不对页面未暴露的内部状态作假设。',
  '隐藏/恢复由测试注入 document.hidden/visibilityState 并派发 visibilitychange，不等同移动系统回收 WebView 进程。'
];

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
  if (!executable) throw new Error(`未找到本地 Chrome 或 Edge：${candidates.join(', ')}`);
  return executable;
}

function check(condition, message, details = null) {
  return { pass: Boolean(condition), message, details };
}

function statusFor(assertions, errors, externalRequests) {
  return assertions.every(assertion => assertion.pass)
    && errors.length === 0
    && externalRequests.length === 0
    ? 'PASS'
    : 'FAIL';
}

async function createPage(browser, origin, entry, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 390, height: 844 },
    deviceScaleFactor: options.deviceScaleFactor || 1,
    hasTouch: true,
    isMobile: true,
    reducedMotion: options.reducedMotion || 'no-preference'
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
  if (options.visibilityHarness) {
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
      window.__setVisibilityForAccessibilityTest = value => {
        forcedHidden = Boolean(value);
        document.dispatchEvent(new Event('visibilitychange'));
      };
    });
  }
  const query = entry.game ? '?test=1&seed=20260728&speed=1&mute=1' : '';
  const url = `${origin}${demoRoot}/${entry.file}${query}`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(180);
  return { context, page, errors, externalRequests, url, response };
}

async function collectLayout(page) {
  return page.evaluate(() => {
    const visible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0
        && rect.width > 0
        && rect.height > 0;
    };
    const inViewport = element => {
      const rect = element.getBoundingClientRect();
      return rect.right > 0
        && rect.bottom > 0
        && rect.left < innerWidth
        && rect.top < innerHeight;
    };
    const interactive = [...document.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )].filter(visible);
    const textSelectors = 'button,a,h1,h2,h3,p,li,span,small,strong,label';
    const clippedText = [...document.querySelectorAll(textSelectors)]
      .filter(visible)
      .filter(element => (element.textContent || '').trim())
      .filter(element => element.scrollWidth > element.clientWidth + 12 || element.scrollHeight > element.clientHeight + 12)
      .slice(0, 20)
      .map(element => ({
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
        client: [element.clientWidth, element.clientHeight],
        scroll: [element.scrollWidth, element.scrollHeight]
      }));
    const canvas = document.querySelector('canvas');
    const canvasRect = canvas?.getBoundingClientRect();
    return {
      title: document.title,
      innerWidth,
      innerHeight,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      bodyTextLength: document.body.innerText.trim().length,
      interactiveCount: interactive.length,
      offscreenInteractive: interactive
        .filter(element => !inViewport(element))
        .slice(0, 20)
        .map(element => ({
          id: element.id || null,
          text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)
        })),
      clippedText,
      canvas: canvasRect ? {
        x: Math.round(canvasRect.x),
        y: Math.round(canvasRect.y),
        width: Math.round(canvasRect.width),
        height: Math.round(canvasRect.height)
      } : null
    };
  });
}

async function keyControlsVisible(page, entry) {
  if (entry.game) {
    return page.locator('#startBtn').evaluate(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0
        && rect.right > 0
        && rect.bottom > 0
        && rect.left < innerWidth
        && rect.top < innerHeight;
    }).catch(() => false);
  }
  return page.locator('.play').first().evaluate(element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0
      && rect.height > 0;
  }).catch(() => false);
}

async function saveScreenshot(page, entry, scenario, fullPage = false) {
  const relative = path.join('accessibility-screenshots', `${entry.id}-${scenario}.png`);
  await page.screenshot({
    path: path.join(outputRoot, relative),
    fullPage,
    animations: 'disabled'
  });
  return relative.replaceAll('\\', '/');
}

async function runDisplayScenario(browser, origin, entry, scenario, viewport) {
  const run = await createPage(browser, origin, entry, { viewport });
  const { context, page, errors, externalRequests, response } = run;
  try {
    const layout = await collectLayout(page);
    const primaryControlVisible = await keyControlsVisible(page, entry);
    const assertions = [
      check(Boolean(response?.ok()), '页面成功加载', response?.status()),
      check(layout.bodyTextLength >= 20, '存在可读页面文案', layout.bodyTextLength),
      check(primaryControlVisible, '主入口控件仍在可视区域'),
      check(layout.scrollWidth <= layout.clientWidth + 2, '没有横向页面溢出', {
        scrollWidth: layout.scrollWidth,
        clientWidth: layout.clientWidth
      })
    ];
    if (entry.game) {
      assertions.push(check(
        Boolean(layout.canvas && layout.canvas.width >= 280 && layout.canvas.height >= 300),
        '游戏 Canvas 保持最低可操作尺寸',
        layout.canvas
      ));
    }
    const screenshot = await saveScreenshot(page, entry, scenario);
    return {
      page: entry.id,
      scenario,
      status: statusFor(assertions, errors, externalRequests),
      assertions,
      metrics: layout,
      errors,
      externalRequests,
      screenshot,
      viewport,
      limitation: '浏览器视口证据，不包含微信顶部/底部导航栏及安全区遮挡。'
    };
  } finally {
    await context.close();
  }
}

async function runZoomScenario(browser, origin, entry) {
  const run = await createPage(browser, origin, entry);
  const { context, page, errors, externalRequests, response } = run;
  try {
    const before = await collectLayout(page);
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });
    await page.waitForTimeout(120);
    const after = await collectLayout(page);
    const primaryControlVisible = await keyControlsVisible(page, entry);
    const assertions = [
      check(Boolean(response?.ok()), '页面成功加载', response?.status()),
      check(after.bodyTextLength >= 20, '200% 模拟缩放后文案仍存在', after.bodyTextLength),
      check(primaryControlVisible, '200% 模拟缩放后主入口仍可见'),
      check(after.scrollWidth <= after.clientWidth + 2, '200% 模拟缩放后没有横向页面溢出', {
        scrollWidth: after.scrollWidth,
        clientWidth: after.clientWidth
      })
    ];
    if (entry.game) {
      const canvasReachable = Boolean(after.canvas)
        && (after.canvas.width <= after.clientWidth + 2
          || after.scrollWidth >= after.canvas.x + after.canvas.width - 2)
        && (after.canvas.height <= after.clientHeight + 2
          || after.scrollHeight >= after.canvas.y + after.canvas.height - 2);
      assertions.push(check(
        canvasReachable,
        '200% 模拟缩放后完整游戏 Canvas 可通过视口或滚动到达',
        {
          canvas: after.canvas,
          scroll: [after.scrollWidth, after.scrollHeight],
          client: [after.clientWidth, after.clientHeight]
        }
      ));
    }
    const screenshot = await saveScreenshot(page, entry, 'zoom-200');
    return {
      page: entry.id,
      scenario: 'zoom-200',
      status: statusFor(assertions, errors, externalRequests),
      assertions,
      metrics: { before, after },
      errors,
      externalRequests,
      screenshot,
      limitation: caveats[0]
    };
  } finally {
    await context.close();
  }
}

async function runLargeTextScenario(browser, origin, entry) {
  const run = await createPage(browser, origin, entry);
  const { context, page, errors, externalRequests, response } = run;
  try {
    const scaled = await page.evaluate(() => {
      const visible = element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && rect.width > 0
          && rect.height > 0;
      };
      const elements = [...document.querySelectorAll('button,a,h1,h2,h3,p,li,span,small,strong,label')]
        .filter(visible)
        .filter(element => (element.textContent || '').trim());
      for (const element of elements) {
        const size = Number.parseFloat(getComputedStyle(element).fontSize);
        if (Number.isFinite(size)) element.style.fontSize = `${size * 2}px`;
      }
      return elements.length;
    });
    await page.waitForTimeout(120);
    const layout = await collectLayout(page);
    const primaryControlVisible = await keyControlsVisible(page, entry);
    const assertions = [
      check(Boolean(response?.ok()), '页面成功加载', response?.status()),
      check(scaled > 0, '已对可见 DOM 文本应用 200% 测试字号', scaled),
      check(primaryControlVisible, '200% 测试字号下主入口仍可见'),
      check(layout.scrollWidth <= layout.clientWidth + 2, '200% 测试字号下没有横向页面溢出', {
        scrollWidth: layout.scrollWidth,
        clientWidth: layout.clientWidth
      }),
      check(layout.clippedText.length === 0, '200% 测试字号下没有检测到文本裁切', layout.clippedText)
    ];
    const screenshot = await saveScreenshot(page, entry, 'large-text-200');
    return {
      page: entry.id,
      scenario: 'large-text-200',
      status: statusFor(assertions, errors, externalRequests),
      assertions,
      metrics: { scaledElements: scaled, ...layout, canvasTextScaled: false },
      errors,
      externalRequests,
      screenshot,
      limitation: caveats[1]
    };
  } finally {
    await context.close();
  }
}

async function runKeyboardScenario(browser, origin, entry) {
  const run = await createPage(browser, origin, entry);
  const { context, page, errors, externalRequests, response } = run;
  try {
    const focusableCount = await page.evaluate(() => {
      const visible = element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && !element.disabled
          && rect.width > 0
          && rect.height > 0;
      };
      return [...document.querySelectorAll(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )].filter(visible).length;
    });
    const sequence = [];
    for (let index = 0; index < focusableCount + 2; index += 1) {
      await page.keyboard.press('Tab');
      sequence.push(await page.evaluate(() => {
        const element = document.activeElement;
        const style = element ? getComputedStyle(element) : null;
        const rect = element?.getBoundingClientRect();
        const outlineWidth = Number.parseFloat(style?.outlineWidth || '0');
        const visibleIndicator = Boolean(style) && (
          (style.outlineStyle !== 'none' && outlineWidth > 0)
          || (style.boxShadow && style.boxShadow !== 'none')
        );
        const centerX = rect ? Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2)) : 0;
        const centerY = rect ? Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2)) : 0;
        const topElement = rect ? document.elementFromPoint(centerX, centerY) : null;
        const occluded = Boolean(
          element
          && topElement
          && element !== topElement
          && !element.contains(topElement)
          && !topElement.contains(element)
        );
        return {
          tag: element?.tagName?.toLowerCase() || null,
          id: element?.id || null,
          href: element?.getAttribute?.('href') || null,
          text: (element?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
          visibleIndicator,
          outline: style ? `${style.outlineWidth} ${style.outlineStyle} ${style.outlineColor}` : null,
          boxShadow: style?.boxShadow || null,
          occluded,
          topElement: topElement ? {
            tag: topElement.tagName.toLowerCase(),
            id: topElement.id || null,
            className: typeof topElement.className === 'string' ? topElement.className : ''
          } : null,
          inViewport: rect ? rect.right > 0
            && rect.bottom > 0
            && rect.left < innerWidth
            && rect.top < innerHeight : false
        };
      }));
    }
    const focusedControls = sequence.filter(item => item.tag && item.tag !== 'body');
    const uniqueControls = new Set(focusedControls.map(
      item => `${item.tag}#${item.id || ''}:${item.href || ''}:${item.text}`
    ));
    const assertions = [
      check(Boolean(response?.ok()), '页面成功加载', response?.status()),
      check(focusableCount > 0, '存在可键盘聚焦控件', focusableCount),
      check(uniqueControls.size >= focusableCount, 'Tab 顺序覆盖全部当前可见控件', {
        expected: focusableCount,
        actual: uniqueControls.size
      }),
      check(focusedControls.every(item => item.visibleIndicator), '每个键盘焦点都有可观察焦点指示', focusedControls),
      check(focusedControls.every(item => !item.occluded), '键盘焦点不会进入视觉遮罩后的背景控件', focusedControls),
      check(focusedControls.every(item => item.inViewport), '聚焦控件均处于可视区域', focusedControls)
    ];
    const screenshot = await saveScreenshot(page, entry, 'keyboard-focus');
    return {
      page: entry.id,
      scenario: 'keyboard-focus',
      status: statusFor(assertions, errors, externalRequests),
      assertions,
      metrics: { focusableCount, sequence },
      errors,
      externalRequests,
      screenshot,
      limitation: caveats[3]
    };
  } finally {
    await context.close();
  }
}

async function runReducedMotionScenario(browser, origin, entry) {
  const run = await createPage(browser, origin, entry, { reducedMotion: 'reduce' });
  const { context, page, errors, externalRequests, response } = run;
  try {
    const observation = await page.evaluate(pageId => {
      const visible = element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && rect.width > 0
          && rect.height > 0;
      };
      const motionNodes = [...document.querySelectorAll('*')]
        .filter(visible)
        .map(element => {
          const style = getComputedStyle(element);
          const animation = style.animationDuration.split(',').some(value => Number.parseFloat(value) > 0);
          const transition = style.transitionDuration.split(',').some(value => Number.parseFloat(value) > 0);
          return animation || transition ? {
            tag: element.tagName.toLowerCase(),
            id: element.id || null,
            className: typeof element.className === 'string' ? element.className : '',
            animationDuration: style.animationDuration,
            transitionDuration: style.transitionDuration
          } : null;
        })
        .filter(Boolean)
        .slice(0, 20);
      let controlState = null;
      if (pageId === 'five-seconds-later') {
        controlState = {
          id: 'motionSwitch',
          value: document.getElementById('motionSwitch')?.getAttribute('aria-checked'),
          expected: 'true'
        };
      } else if (pageId === 'world-mender') {
        controlState = {
          id: 'motionBtn',
          value: document.getElementById('motionBtn')?.textContent?.trim(),
          expected: '简动'
        };
      } else if (pageId === 'rift-hunter') {
        controlState = {
          id: 'motionToggle',
          value: document.getElementById('motionToggle')?.classList.contains('on'),
          expected: true
        };
      }
      return {
        mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
        motionNodes,
        controlState
      };
    }, entry.id);
    const primaryControlVisible = await keyControlsVisible(page, entry);
    const assertions = [
      check(Boolean(response?.ok()), '页面成功加载', response?.status()),
      check(observation.mediaMatches, 'prefers-reduced-motion: reduce 匹配成功'),
      check(primaryControlVisible, '减少动态效果环境下主入口仍可操作')
    ];
    if (observation.controlState) {
      assertions.push(check(
        observation.controlState.value === observation.controlState.expected,
        '游戏可观察的减少动态效果控件与系统偏好一致',
        observation.controlState
      ));
    } else {
      assertions.push(check(
        observation.motionNodes.length === 0,
        '大厅在减少动态效果环境下没有持续 CSS 动画或过渡',
        observation.motionNodes
      ));
    }
    const screenshot = await saveScreenshot(page, entry, 'reduced-motion');
    return {
      page: entry.id,
      scenario: 'reduced-motion',
      status: statusFor(assertions, errors, externalRequests),
      assertions,
      metrics: observation,
      errors,
      externalRequests,
      screenshot,
      limitation: caveats[4]
    };
  } finally {
    await context.close();
  }
}

async function runLifecycleScenario(browser, origin, entry) {
  const run = await createPage(browser, origin, entry, { visibilityHarness: true });
  const { context, page, errors, externalRequests, response } = run;
  try {
    let metrics;
    const assertions = [
      check(Boolean(response?.ok()), '页面成功加载', response?.status())
    ];
    if (!entry.game) {
      const before = await page.evaluate(() => ({
        title: document.title,
        textLength: document.body.innerText.trim().length
      }));
      await page.evaluate(() => window.__setVisibilityForAccessibilityTest(true));
      await page.waitForTimeout(120);
      await page.evaluate(() => window.__setVisibilityForAccessibilityTest(false));
      const after = await page.evaluate(() => ({
        title: document.title,
        textLength: document.body.innerText.trim().length
      }));
      metrics = { before, after };
      assertions.push(check(
        before.title === after.title && before.textLength === after.textLength,
        '大厅隐藏/恢复后内容保持稳定',
        metrics
      ));
    } else {
      await page.locator('#startBtn').click();
      await page.waitForTimeout(100);
      const before = await page.evaluate(() => window.__GAME_TEST__.getState());
      await page.evaluate(() => window.__setVisibilityForAccessibilityTest(true));
      await page.waitForTimeout(80);
      const pausedAt = await page.evaluate(() => window.__GAME_TEST__.getState());
      await page.waitForTimeout(220);
      const hidden = await page.evaluate(() => window.__GAME_TEST__.getState());
      await page.evaluate(() => {
        window.__setVisibilityForAccessibilityTest(false);
        const game = window.__GAME_TEST__;
        if (typeof game.resume === 'function') game.resume();
        else window.GamePlatform?.resume?.();
      });
      await page.waitForTimeout(100);
      const resumed = await page.evaluate(() => window.__GAME_TEST__.getState());
      const paused = state => state.paused === true || state.mode === 'paused';
      const elapsed = state => Number(state.elapsed || 0);
      metrics = { before, pausedAt, hidden, resumed };
      assertions.push(
        check(paused(pausedAt), '页面隐藏后游戏进入暂停', pausedAt),
        check(Math.abs(elapsed(hidden) - elapsed(pausedAt)) <= 0.1, '隐藏期间局内时间冻结', {
          pausedAt: elapsed(pausedAt),
          hidden: elapsed(hidden)
        }),
        check(!paused(resumed), '页面恢复后可由玩家继续游戏', resumed)
      );
    }
    const screenshot = await saveScreenshot(page, entry, 'lifecycle-resumed');
    return {
      page: entry.id,
      scenario: 'lifecycle',
      status: statusFor(assertions, errors, externalRequests),
      assertions,
      metrics,
      errors,
      externalRequests,
      screenshot,
      limitation: caveats[5]
    };
  } finally {
    await context.close();
  }
}

async function record(run, page, scenario) {
  try {
    const result = await run();
    results.push(result);
    process.stdout.write(`${page.padEnd(21)} ${scenario.padEnd(18)} ${result.status}\n`);
  } catch (error) {
    const result = {
      page,
      scenario,
      status: 'FAIL',
      assertions: [check(false, '验收场景运行异常', error.stack || error.message)],
      metrics: null,
      errors: [error.stack || error.message],
      externalRequests: [],
      screenshot: null
    };
    results.push(result);
    process.stdout.write(`${page.padEnd(21)} ${scenario.padEnd(18)} FAIL ${error.message}\n`);
  }
}

await fs.mkdir(screenshotDir, { recursive: true });
const { server, port } = await startServer();
const origin = `http://127.0.0.1:${port}`;
let browser;

try {
  browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true
  });
  for (const entry of entries) {
    await record(() => runZoomScenario(browser, origin, entry), entry.id, 'zoom-200');
    await record(() => runLargeTextScenario(browser, origin, entry), entry.id, 'large-text-200');
    await record(
      () => runDisplayScenario(browser, origin, entry, 'landscape', { width: 844, height: 390 }),
      entry.id,
      'landscape'
    );
    await record(
      () => runDisplayScenario(browser, origin, entry, 'ultrawide-short', { width: 1200, height: 390 }),
      entry.id,
      'ultrawide-short'
    );
    await record(() => runKeyboardScenario(browser, origin, entry), entry.id, 'keyboard-focus');
    await record(() => runReducedMotionScenario(browser, origin, entry), entry.id, 'reduced-motion');
    await record(() => runLifecycleScenario(browser, origin, entry), entry.id, 'lifecycle');
  }
} finally {
  await browser?.close();
  server.close();
}

const summary = {
  total: results.length,
  pass: results.filter(result => result.status === 'PASS').length,
  fail: results.filter(result => result.status === 'FAIL').length
};
const report = {
  generatedAt: new Date().toISOString(),
  environment: {
    browser: '本地 Edge/Chrome（由脚本自动发现）',
    runner: 'playwright-core',
    origin,
    baselineViewport: { width: 390, height: 844 }
  },
  scope: {
    pages: entries.map(entry => entry.id),
    scenarios: [
      'zoom-200',
      'large-text-200',
      'landscape',
      'ultrawide-short',
      'keyboard-focus',
      'reduced-motion',
      'lifecycle'
    ]
  },
  caveats,
  summary,
  results
};
await fs.writeFile(outputFile, JSON.stringify(report, null, 2), 'utf8');

process.stdout.write(`SUMMARY ${summary.pass}/${summary.total} PASS, ${summary.fail} FAIL\n`);
if (summary.fail > 0) process.exitCode = 1;

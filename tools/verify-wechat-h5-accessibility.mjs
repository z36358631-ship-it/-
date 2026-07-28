import http from 'node:http';
import path from 'node:path';
import fsSync from 'node:fs';
import { promises as fs } from 'node:fs';
import { chromium } from 'playwright-core';
import {
  createVerificationMetadata,
  errorText,
  writeJsonAtomic
} from './verification-metadata.mjs';

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
const allowedFailures = new Set([
  'five-seconds-later:zoom-200',
  'world-mender:zoom-200',
  'rift-hunter:zoom-200'
]);
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
    const orientationSnapshot = () => page.evaluate(() => {
      const read = id => {
        const element = document.getElementById(id);
        if (!element) return null;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          id,
          role: element.getAttribute('role'),
          ariaModal: element.getAttribute('aria-modal'),
          ariaHidden: element.getAttribute('aria-hidden'),
          inert: element.inert,
          visible: style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number(style.opacity) !== 0
            && rect.width > 0
            && rect.height > 0
        };
      };
      const backgroundIds = ['game', 'controls', 'introOverlay', 'pauseOverlay', 'resultOverlay'];
      const background = backgroundIds.map(read);
      return {
        activeElement: document.activeElement?.id || document.activeElement?.tagName?.toLowerCase() || null,
        guard: read('rotateGuard'),
        intro: read('introOverlay'),
        pause: read('pauseOverlay'),
        result: read('resultOverlay'),
        background,
        allBackgroundInert: background.every(item => item?.inert === true),
        state: window.__GAME_TEST__?.getState?.() || null
      };
    });
    const layout = await collectLayout(page);
    const primaryControlVisible = await keyControlsVisible(page, entry);
    const rotateGuard = await page.locator('#rotateGuard, #rotate').evaluateAll(elements => {
      const visible = elements.find(element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity) !== 0
          && rect.width >= innerWidth - 2
          && rect.height >= innerHeight - 2;
      });
      return visible
        ? { visible: true, text: (visible.textContent || '').trim() }
        : { visible: false, text: '' };
    });
    const assertions = [
      check(Boolean(response?.ok()), '页面成功加载', response?.status()),
      check(layout.bodyTextLength >= 20, '存在可读页面文案', layout.bodyTextLength),
      check(layout.scrollWidth <= layout.clientWidth + 2, '没有横向页面溢出', {
        scrollWidth: layout.scrollWidth,
        clientWidth: layout.clientWidth
      })
    ];
    if (entry.game) {
      const playable = primaryControlVisible
        && Boolean(layout.canvas && layout.canvas.width >= 280 && layout.canvas.height >= 300);
      assertions.push(check(
        playable || (rotateGuard.visible && rotateGuard.text.includes('竖屏')),
        '游戏保持可操作尺寸，或显示明确竖屏阻断',
        { playable, rotateGuard, canvas: layout.canvas }
      ));
    } else {
      assertions.push(check(primaryControlVisible, '主入口控件仍在可视区域'));
    }
    const screenshot = await saveScreenshot(page, entry, scenario);
    let orientationMetrics = null;
    if (entry.id === 'five-seconds-later' && scenario === 'landscape') {
      const initialLandscape = await orientationSnapshot();
      assertions.push(
        check(
          initialLandscape.guard?.role === 'dialog'
            && initialLandscape.guard?.ariaModal === 'true'
            && initialLandscape.guard?.ariaHidden === 'false'
            && initialLandscape.guard?.inert === false,
          '短横屏旋转层声明为当前可访问模态对话框',
          initialLandscape.guard
        ),
        check(
          initialLandscape.activeElement === 'rotateGuard',
          '短横屏焦点进入旋转层',
          initialLandscape.activeElement
        ),
        check(
          initialLandscape.allBackgroundInert,
          '短横屏时 Canvas、控制栏及底层模态均被 inert 隔离',
          initialLandscape.background
        )
      );

      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(120);
      const restoredIntro = await orientationSnapshot();
      assertions.push(
        check(
          restoredIntro.activeElement === 'startBtn'
            && restoredIntro.intro?.ariaHidden === 'false'
            && restoredIntro.intro?.inert === false,
          '回到竖屏后恢复开场层及其主入口焦点',
          restoredIntro
        ),
        check(
          restoredIntro.state?.mode === initialLandscape.state?.mode
            && restoredIntro.state?.runId === initialLandscape.state?.runId,
          '开场状态跨横竖屏切换保持不变',
          { before: initialLandscape.state, after: restoredIntro.state }
        )
      );

      await page.locator('#startBtn').click();
      const playingBeforeRotate = await orientationSnapshot();
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(120);
      const playingLandscape = await orientationSnapshot();
      await page.waitForTimeout(180);
      const frozenLandscape = await orientationSnapshot();
      assertions.push(
        check(
          playingLandscape.activeElement === 'rotateGuard'
            && playingLandscape.guard?.ariaHidden === 'false'
            && playingLandscape.allBackgroundInert,
          '局内进入短横屏后旋转层取得焦点并隔离暂停层',
          playingLandscape
        ),
        check(
          playingLandscape.state?.mode === 'paused'
            && Math.abs(
              Number(frozenLandscape.state?.elapsed || 0)
                - Number(playingLandscape.state?.elapsed || 0)
            ) <= 0.1,
          '局内进入短横屏后保持暂停且局时冻结',
          { paused: playingLandscape.state, frozen: frozenLandscape.state }
        )
      );

      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(120);
      const restoredPause = await orientationSnapshot();
      assertions.push(
        check(
          restoredPause.activeElement === 'resumeBtn'
            && restoredPause.pause?.ariaHidden === 'false'
            && restoredPause.pause?.inert === false
            && restoredPause.guard?.ariaHidden === 'true'
            && restoredPause.guard?.inert === true,
          '局内回到竖屏后恢复暂停层与继续按钮焦点',
          restoredPause
        ),
        check(
          restoredPause.state?.mode === 'paused'
            && restoredPause.state?.runId === playingBeforeRotate.state?.runId,
          '旋转恢复后仍需玩家主动继续同一局游戏',
          { before: playingBeforeRotate.state, after: restoredPause.state }
        )
      );

      await page.locator('#resumeBtn').click();
      const finishSupported = await page.evaluate(() => {
        if (typeof window.__GAME_TEST__?.finish !== 'function') return false;
        window.__GAME_TEST__.finish(false);
        return true;
      });
      const resultBeforeRotate = await orientationSnapshot();
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(120);
      const resultLandscape = await orientationSnapshot();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(120);
      const restoredResult = await orientationSnapshot();
      assertions.push(
        check(finishSupported, '测试态可驱动结算层旋转恢复场景'),
        check(
          resultLandscape.activeElement === 'rotateGuard'
            && resultLandscape.result?.inert === true
            && resultLandscape.allBackgroundInert
            && resultLandscape.state?.mode === resultBeforeRotate.state?.mode,
          '结算状态进入短横屏后旋转层优先且结果层 inert',
          { before: resultBeforeRotate, landscape: resultLandscape }
        ),
        check(
          restoredResult.activeElement === 'resultOverlay'
            && restoredResult.result?.ariaHidden === 'false'
            && restoredResult.result?.inert === false
            && restoredResult.state?.mode === resultBeforeRotate.state?.mode
            && restoredResult.state?.runId === resultBeforeRotate.state?.runId
            && restoredResult.state?.result === resultBeforeRotate.state?.result,
          '回到竖屏后恢复结算层焦点且游戏结果保持不变',
          { before: resultBeforeRotate, after: restoredResult }
        )
      );
      orientationMetrics = {
        initialLandscape,
        restoredIntro,
        playingBeforeRotate,
        playingLandscape,
        frozenLandscape,
        restoredPause,
        resultBeforeRotate,
        resultLandscape,
        restoredResult
      };
    }
    return {
      page: entry.id,
      scenario,
      status: statusFor(assertions, errors, externalRequests),
      assertions,
      metrics: { ...layout, primaryControlVisible, rotateGuard, orientation: orientationMetrics },
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
    const snapshotFocus = () => page.evaluate(() => {
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
      const modal = element?.closest?.('[aria-modal="true"]');
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
        modalId: modal?.id || null,
        insideModal: Boolean(modal),
        inViewport: rect ? rect.right > 0
          && rect.bottom > 0
          && rect.left < innerWidth
          && rect.top < innerHeight : false
      };
    });
    const visibleFocusableCount = modalId => page.evaluate(id => {
      const root = id ? document.getElementById(id) : document;
      if (!root) return 0;
       const visible = element => {
         const style = getComputedStyle(element);
         const rect = element.getBoundingClientRect();
         return style.display !== 'none'
           && style.visibility !== 'hidden'
           && !element.disabled
           && !element.inert
           && !element.closest('[inert]')
           && rect.width > 0
           && rect.height > 0;
      };
      return [...root.querySelectorAll(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )].filter(visible).length;
    }, modalId);
    const visibleModalId = () => page.evaluate(() => {
      const modal = [...document.querySelectorAll('[aria-modal="true"]')].find(element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity) !== 0
          && rect.width > 0
          && rect.height > 0;
      });
      return modal?.id || null;
    });
    const uninertBackgroundControls = modalId => page.evaluate(id => {
      const modal = document.getElementById(id);
      if (!modal) return [];
       const visible = element => {
         const style = getComputedStyle(element);
         const rect = element.getBoundingClientRect();
         return style.display !== 'none'
           && style.visibility !== 'hidden'
           && !element.disabled
           && !element.inert
           && !element.closest('[inert]')
           && rect.width > 0
           && rect.height > 0;
      };
      return [...document.querySelectorAll(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )]
        .filter(element => !modal.contains(element))
        .filter(visible)
        .filter(element => !element.inert && !element.closest('[inert]'))
        .map(element => element.id || element.tagName.toLowerCase());
    }, modalId);
    const focusableCount = await page.evaluate(() => {
      const visible = element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && !element.disabled
          && !element.inert
          && !element.closest('[inert]')
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
      sequence.push(await snapshotFocus());
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
    let modalMetrics = null;
    if (entry.game) {
      const introModalId = await visibleModalId();
      const introFocus = await snapshotFocus();
      const introFocusableCount = await visibleFocusableCount(introModalId);
      const introSequence = [];
      for (let index = 0; index < introFocusableCount + 2; index += 1) {
        await page.keyboard.press('Tab');
        introSequence.push(await snapshotFocus());
      }
      const introBackgroundLeaks = introModalId
        ? await uninertBackgroundControls(introModalId)
        : ['missing-modal'];
      await page.locator('#startBtn').click();
      await page.locator('#pauseBtn').click();
      await page.waitForTimeout(80);
      const pauseModalId = await visibleModalId();
      const pauseFocus = await snapshotFocus();
      const pauseFocusableCount = await visibleFocusableCount(pauseModalId);
      const pauseSequence = [];
      for (let index = 0; index < pauseFocusableCount + 2; index += 1) {
        await page.keyboard.press('Tab');
        pauseSequence.push(await snapshotFocus());
      }
      const pauseBackgroundLeaks = pauseModalId
        ? await uninertBackgroundControls(pauseModalId)
        : ['missing-modal'];
      assertions.push(
        check(Boolean(introModalId), '开场层声明为可见模态对话框', introModalId),
        check(introFocus.modalId === introModalId, '初始焦点进入开场层', introFocus),
        check(
          introSequence.every(item => item.modalId === introModalId),
          '开场层 Tab 循环不会离开当前模态层',
          introSequence
        ),
        check(introBackgroundLeaks.length === 0, '开场层显示时背景控件均被 inert 隔离', introBackgroundLeaks),
        check(Boolean(pauseModalId), '暂停层声明为可见模态对话框', pauseModalId),
        check(pauseFocus.modalId === pauseModalId, '暂停焦点进入暂停层', pauseFocus),
        check(
          pauseSequence.every(item => item.modalId === pauseModalId),
          '暂停层 Tab 循环不会离开当前模态层',
          pauseSequence
        ),
        check(pauseBackgroundLeaks.length === 0, '暂停层显示时背景控件均被 inert 隔离', pauseBackgroundLeaks)
      );
      modalMetrics = {
        intro: {
          modalId: introModalId,
          focus: introFocus,
          sequence: introSequence,
          backgroundLeaks: introBackgroundLeaks
        },
        pause: {
          modalId: pauseModalId,
          focus: pauseFocus,
          sequence: pauseSequence,
          backgroundLeaks: pauseBackgroundLeaks
        }
      };
    }
    const screenshot = await saveScreenshot(page, entry, 'keyboard-focus');
    return {
      page: entry.id,
      scenario: 'keyboard-focus',
      status: statusFor(assertions, errors, externalRequests),
      assertions,
      metrics: { focusableCount, sequence, modal: modalMetrics },
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
    const message = errorText(error);
    const result = {
      page,
      scenario,
      status: 'FAIL',
      assertions: [check(false, '验收场景运行异常', message)],
      metrics: null,
      errors: [message],
      externalRequests: [],
      screenshot: null
    };
    results.push(result);
    process.stdout.write(`${page.padEnd(21)} ${scenario.padEnd(18)} FAIL ${message}\n`);
  }
}

function recordRunnerFailure(scenario, error) {
  const message = errorText(error);
  results.push({
    page: 'runner',
    scenario,
    status: 'FAIL',
    assertions: [check(false, '无障碍验收执行器异常', message)],
    metrics: null,
    errors: [message],
    externalRequests: [],
    screenshot: null
  });
  process.stderr.write(`runner                ${scenario.padEnd(18)} FAIL ${message}\n`);
}

await fs.mkdir(screenshotDir, { recursive: true });
let server;
let origin = 'unavailable';
let browser;
let browserVersion = 'unavailable';

try {
  const started = await startServer();
  server = started.server;
  origin = `http://127.0.0.1:${started.port}`;
  browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true
  });
  browserVersion = browser.version();
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
} catch (error) {
  recordRunnerFailure('top-level', error);
} finally {
  try {
    await browser?.close();
  } catch (error) {
    recordRunnerFailure('browser-close', error);
  }
  if (server) {
    try {
      await new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
      });
    } catch (error) {
      recordRunnerFailure('server-close', error);
    }
  }
}

const summary = {
  total: results.length,
  pass: results.filter(result => result.status === 'PASS').length,
  fail: results.filter(result => result.status === 'FAIL').length,
  allowedFail: results.filter(
    result => result.status === 'FAIL'
      && allowedFailures.has(`${result.page}:${result.scenario}`)
  ).length,
  unexpectedFail: results.filter(
    result => result.status === 'FAIL'
      && !allowedFailures.has(`${result.page}:${result.scenario}`)
  ).length
};
const unexpectedFailures = results
  .filter(
    result => result.status === 'FAIL'
      && !allowedFailures.has(`${result.page}:${result.scenario}`)
  )
  .map(result => `${result.page}:${result.scenario}`);
const exitCode = unexpectedFailures.length > 0 ? 1 : 0;
const report = {
  ...await createVerificationMetadata({
    root,
    browserVersion,
    testedPaths: [
      'demos/微信H5精品游戏/index.html',
      'demos/微信H5精品游戏/01-five-seconds-later.html',
      'demos/微信H5精品游戏/02-world-mender.html',
      'demos/微信H5精品游戏/03-rift-hunter.html',
      'tools/verify-wechat-h5-accessibility.mjs',
      'tools/verification-metadata.mjs',
      'package.json',
      'package-lock.json'
    ],
    environment: {
      runner: 'playwright-core',
      origin,
      baselineViewport: { width: 390, height: 844 }
    }
  }),
  testEnvironment: {
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
  allowedFailures: [...allowedFailures],
  unexpectedFailures,
  exitCode,
  summary,
  results
};
await writeJsonAtomic(outputFile, report);

process.stdout.write(`SUMMARY ${summary.pass}/${summary.total} PASS, ${summary.fail} FAIL\n`);
process.exitCode = exitCode;

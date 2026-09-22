import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const evidenceDir = path.join(root, 'test-results', 'app-member-library-entries');
const reportPath = path.join(evidenceDir, 'entry-verification.json');
const chromePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find(fs.existsSync);
const surfaces = [
  { id: 'demo', file: '盖世游戏APP租号功能demo.html' },
  { id: 'annotation', file: '盖世游戏APP租号功能-标注版.html' },
];
const sources = [
  { id: 'library', orientation: 'portrait', screen: 'library', entries: ['会员游戏'] },
  { id: 'home-pc', orientation: 'portrait', screen: 'home', entries: ['会员游戏库', '查看全部'] },
  { id: 'membership', orientation: 'portrait', screen: 'membership', entries: ['会员游戏库', '查看全部'] },
  { id: 'library', orientation: 'landscape', screen: 'library', entries: ['会员游戏'] },
  { id: 'play-pc', orientation: 'landscape', screen: 'play', entries: ['会员游戏库', '查看全部'] },
  { id: 'membership', orientation: 'landscape', screen: 'membership', entries: ['会员游戏库', '查看全部'] },
];
const report = {
  generatedAt: new Date().toISOString(),
  status: 'running',
  checks: [],
  screenshots: [],
  pageHealth: [],
  consoleErrors: [],
};
const captured = new Set();
const app = (page) => page.locator('#appRentalDemo');

function saveReport() {
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function currentRoute(page) {
  return page.evaluate(() => {
    const snapshot = window.__appRentalDemo.snapshot();
    return {
      screen: snapshot.screen,
      orientation: snapshot.orientation,
      homeChannel: snapshot.homeChannel,
      playTab: snapshot.playTab,
      libraryTab: snapshot.libraryTab,
    };
  });
}

async function assertScreen(page, screen, context) {
  await page.waitForFunction((expected) => window.__appRentalDemo.snapshot().screen === expected, screen, { timeout: 5000 });
  assert.equal((await currentRoute(page)).screen, screen, context);
}

async function settle(page) {
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForFunction(() => [...document.querySelectorAll('#appRentalDemo img')]
    .every((image) => image.complete && image.naturalWidth > 0), null, { timeout: 15000 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function checkHealth(page, label) {
  await settle(page);
  const health = await page.evaluate(() => {
    const scope = document.querySelector('#appRentalDemo');
    const images = [...scope.querySelectorAll('img')];
    const regions = [...scope.querySelectorAll('.portrait-content, .landscape-content, .landscape-member-library-layout, .landscape-membership-scroll')]
      .filter((element) => element.clientWidth > 0 && element.clientHeight > 0)
      .map((element) => ({
        region: element.className,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        overflow: element.scrollWidth - element.clientWidth,
      }));
    return {
      imageCount: images.length,
      unloadedImages: images.filter((image) => !image.complete || image.naturalWidth <= 0).map((image) => image.alt),
      regions,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  report.pageHealth.push({ label, ...health });
  assert.equal(health.unloadedImages.length, 0, `${label}: 图片未正常加载`);
  assert(health.regions.length > 0, `${label}: 未找到可检查的正文区域`);
  assert(health.regions.every(({ overflow }) => overflow <= 2), `${label}: 正文横向溢出 ${JSON.stringify(health.regions)}`);
  assert(health.documentOverflow <= 2, `${label}: 页面横向溢出 ${health.documentOverflow}px`);
}

async function captureOnce(page, key) {
  if (captured.has(key)) return;
  await settle(page);
  const filePath = path.join(evidenceDir, `${key}.png`);
  await app(page).locator('.device').screenshot({ path: filePath, animations: 'disabled' });
  captured.add(key);
  report.screenshots.push({ key, path: filePath });
}

async function prepareSource(page, source) {
  await page.evaluate(({ screen, orientation }) => {
    const api = window.__appRentalDemo;
    api.setOrientation(orientation);
    api.openCaptureState(screen);
  }, source);
  if (source.id === 'home-pc') {
    const pcChannel = app(page).locator('[data-action="set-tab"][data-group="homeChannel"][data-value="pc"]');
    assert.equal(await pcChannel.count(), 1, '首页缺少 PC游戏频道');
    await pcChannel.click();
  }
  if (source.screen === 'library') {
    const pcTab = app(page).locator('[data-action="set-tab"][data-group="libraryTab"][data-value="pc"]');
    if (await pcTab.count()) await pcTab.click();
  }
  if (source.screen === 'play') {
    const pcTab = app(page).locator('[data-action="set-tab"][data-group="playTab"][data-value="pc"]');
    assert.equal(await pcTab.count(), 1, '横屏玩游戏缺少 PC游戏 Tab');
    await pcTab.click();
  }
  const closeIntro = app(page).locator('[data-action="close-membership-intro"]').first();
  if (await closeIntro.isVisible()) await closeIntro.click();
  await assertScreen(page, source.screen, '来源页面不正确');
  await settle(page);
}

function entryLocator(page, label) {
  // 标注版会在按钮内追加数字标记；入口语义以原始标签识别。
  const matchingText = new RegExp(label);
  return app(page).locator('[data-action="navigate"][data-screen="member-library"]').filter({ hasText: matchingText });
}

async function scrollMembershipPreview(page) {
  const scrollState = await page.evaluate(() => {
    const preview = document.querySelector('#appRentalDemo .membership-preview');
    if (!preview) throw new Error('会员中心缺少会员游戏库预览');
    let region = preview.parentElement;
    while (region && !(region.scrollHeight > region.clientHeight + 1
      && ['auto', 'scroll'].includes(getComputedStyle(region).overflowY))) region = region.parentElement;
    if (!region) throw new Error('会员中心缺少可滚动正文区域');
    const regionRect = region.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();
    const scale = regionRect.height / region.offsetHeight || 1;
    region.scrollTop += (previewRect.top - regionRect.top) / scale - 12;
    return { region: region.className, scrollTop: region.scrollTop };
  });
  await settle(page);
  const visibility = await app(page).locator('.membership-preview .detail-section-head').evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const device = element.closest('.device').getBoundingClientRect();
    return { visible: bounds.top >= device.top && bounds.bottom <= device.bottom, top: bounds.top, bottom: bounds.bottom };
  });
  assert(visibility.visible, `会员中心预览入口未完整显示：${JSON.stringify(visibility)}`);
  return scrollState;
}

async function readMembershipScroll(page) {
  return page.evaluate(() => {
    const regions = [...document.querySelectorAll('#appRentalDemo .portrait-content, #appRentalDemo .landscape-content, #appRentalDemo .task-scroll-region')];
    const region = regions.find((element) => element.scrollHeight > element.clientHeight && getComputedStyle(element).overflowY !== 'hidden') || regions[0];
    return Number(region?.scrollTop || 0);
  });
}

async function clickEntry(page, label) {
  const entry = entryLocator(page, label);
  assert.equal(await entry.count(), 1, `应存在唯一可点击「${label}」会员库入口`);
  await entry.click();
  await assertScreen(page, 'member-library', `「${label}」未进入会员游戏库`);
}

async function clickBack(page, expectedScreen) {
  const back = app(page).locator('[data-action="task-back"]').first();
  assert(await back.isVisible(), '页面缺少可见返回按钮');
  await back.click();
  await assertScreen(page, expectedScreen, `返回应到 ${expectedScreen}`);
}

async function verifySourceState(page, source) {
  const route = await currentRoute(page);
  assert.equal(route.screen, source.screen, '返回未恢复来源页面');
  if (source.id === 'home-pc') assert.equal(route.homeChannel, 'pc', '返回丢失首页 PC频道');
  if (source.id === 'play-pc') assert.equal(route.playTab, 'pc', '返回丢失玩游戏 PC Tab');
}

async function verifySearchAndDetail(page, source, result) {
  const search = app(page).locator('[data-member-library-search-input]');
  const cards = app(page).locator('.member-game-card');
  const originalCount = await cards.count();
  assert(originalCount > 0, '会员游戏库没有游戏卡');
  await search.fill('__不存在的会员游戏_20260921__');
  await app(page).locator('.member-library-empty').waitFor({ state: 'visible' });
  assert.equal(await cards.count(), 0, '无结果搜索仍显示游戏卡');
  assert.match(await app(page).innerText(), /未找到相关会员游戏/, '搜索无结果提示缺失');
  await app(page).locator('[data-action="clear-member-library-search"]').click();
  assert.equal(await search.inputValue(), '', '清空按钮未清空搜索输入');
  assert.equal(await cards.count(), originalCount, '清空搜索未恢复完整游戏库');
  result.search = { emptyResultPassed: true, clearPassed: true, originalCount };

  const selectedGameId = await cards.first().getAttribute('data-game-id');
  await cards.first().click();
  await assertScreen(page, 'detail', '点击会员游戏未进入详情');
  result.detailGameId = selectedGameId;
  await clickBack(page, 'member-library');
  assert.equal(await app(page).locator('.member-game-card').count(), originalCount, '从详情返回后会员库内容丢失');
  await clickBack(page, source.screen);
  await verifySourceState(page, source);
  result.detailRoundTrip = ['member-library', 'detail', 'member-library', source.screen];
}

async function runEntryCase(page, surface, source, label) {
  const key = `${surface.id}-${source.orientation}-${source.id}`;
  const name = `${key}-${label}`;
  const result = { name, surface: surface.id, orientation: source.orientation, source: source.screen, entry: label, status: 'running' };
  report.checks.push(result);
  try {
    await prepareSource(page, source);
    await checkHealth(page, `${name}-source`);
    await captureOnce(page, key);
    if (source.screen === 'membership') {
      result.membershipScroll = await scrollMembershipPreview(page);
      await captureOnce(page, `${key}-library-preview`);
    }
    await clickEntry(page, label);
    await checkHealth(page, `${name}-member-library`);
    await captureOnce(page, `${surface.id}-${source.orientation}-member-library`);
    await clickBack(page, source.screen);
    await verifySourceState(page, source);
    if (source.screen === 'membership') {
      await settle(page);
      result.membershipScroll.restoredScrollTop = await readMembershipScroll(page);
      assert(Math.abs(result.membershipScroll.scrollTop - result.membershipScroll.restoredScrollTop) <= 2,
        `会员中心返回后滚动位置未保留：${JSON.stringify(result.membershipScroll)}`);
    }
    result.directRoundTrip = [source.screen, 'member-library', source.screen];
    await clickEntry(page, label);
    await verifySearchAndDetail(page, source, result);
    result.status = 'pass';
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    result.status = 'fail';
    result.error = error.message;
    result.route = await currentRoute(page).catch(() => null);
    await captureOnce(page, `${key}-${label}-failed`).catch(() => {});
    process.stdout.write(`FAIL ${name}: ${error.message}\n`);
  }
  saveReport();
}

fs.mkdirSync(evidenceDir, { recursive: true });
assert(chromePath, '未找到可用的本地 Chrome');
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  for (const surface of surfaces) {
    const demoPath = path.join(root, 'demos', 'APP租号功能', surface.file);
    assert(fs.existsSync(demoPath), `Demo 文件不存在：${demoPath}`);
    const page = await browser.newPage({ viewport: { width: 1680, height: 1100 }, deviceScaleFactor: 1 });
    page.on('console', (message) => {
      if (message.type() === 'error') report.consoleErrors.push({ surface: surface.id, type: 'console', message: message.text() });
    });
    page.on('pageerror', (error) => report.consoleErrors.push({ surface: surface.id, type: 'pageerror', message: error.message }));
    try {
      await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
      await page.waitForFunction(() => Boolean(window.__appRentalDemo), null, { timeout: 15000 });
      for (const source of sources) {
        for (const label of source.entries) await runEntryCase(page, surface, source, label);
      }
    } finally {
      await page.close();
    }
  }
  report.summary = {
    total: report.checks.length,
    passed: report.checks.filter(({ status }) => status === 'pass').length,
    failed: report.checks.filter(({ status }) => status === 'fail').length,
    consoleErrors: report.consoleErrors.length,
    screenshots: report.screenshots.length,
  };
  report.status = report.summary.failed === 0 && report.summary.consoleErrors === 0 ? 'pass' : 'fail';
  process.stdout.write(`MEMBER_LIBRARY_ENTRIES ${report.summary.passed}/${report.summary.total} ${report.status.toUpperCase()}\n`);
  process.stdout.write(`REPORT ${reportPath}\n`);
  if (report.status !== 'pass') process.exitCode = 1;
} catch (error) {
  report.status = 'fail';
  report.fatalError = error.message;
  process.exitCode = 1;
  process.stderr.write(`${error.stack || error.message}\n`);
} finally {
  await browser.close();
  saveReport();
}

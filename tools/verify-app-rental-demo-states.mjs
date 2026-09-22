import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const evidenceDir = path.join(root, 'test-results', 'app-rental-demo-states');
const reportPath = path.join(evidenceDir, 'demo-state-verification.json');
const chromePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const surfaces = [
  { id: 'demo', file: '盖世游戏APP租号功能demo.html' },
  { id: 'annotation', file: '盖世游戏APP租号功能-标注版.html' },
];
const report = { generatedAt: new Date().toISOString(), status: 'running', checks: [], screenshots: [], runtimeErrors: [] };
const app = (page) => page.locator('#appRentalDemo');
const risk = (page) => app(page).locator('.rental-risk-dialog[role="alertdialog"]');
const snapshot = (page) => page.evaluate(() => window.__appRentalDemo.snapshot());

function saveReport() { fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'); }
function check(result, label, condition, details = null) {
  result.assertions.push({ label, status: condition ? 'pass' : 'fail', details });
  assert(condition, `${label}${details === null ? '' : `: ${JSON.stringify(details)}`}`);
}
async function settle(page) { await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function capture(page, label, fullViewport = false) {
  await settle(page);
  const file = path.join(evidenceDir, `${label}.png`);
  if (fullViewport) await page.screenshot({ path: file, animations: 'disabled' });
  else await app(page).locator('.device').screenshot({ path: file, animations: 'disabled' });
  report.screenshots.push({ label, path: file });
}
async function prepare(page, orientation) {
  await page.evaluate((value) => {
    const api = window.__appRentalDemo;
    api.setOrientation(value);
    api.openCaptureState('detail');
  }, orientation);
  await settle(page);
}
async function selectMode(page, value) {
  const option = page.locator(`[data-action="set-demo-purchase-mode"][data-value="${value}"]`);
  if (!(await option.isVisible())) await page.locator('[data-action="toggle-demo-state"]').click();
  await option.click();
  await page.waitForFunction((expected) => window.__appRentalDemo.snapshot().demoPurchaseMode === expected, value);
  // A persistent review panel may remain open by design; close it before interacting with the product.
  if ((await snapshot(page)).demoStatePanelOpen) await page.locator('[data-action="toggle-demo-state"]').click();
}
async function beginCheckout(page) {
  const button = app(page).locator('[data-action="begin-checkout"]');
  assert.equal(await button.count(), 1, '详情页应存在唯一租号开玩按钮');
  await button.click();
  await settle(page);
}
async function returnToDetail(page) {
  await app(page).locator('[data-action="task-back"]').first().click();
  await page.waitForFunction(() => window.__appRentalDemo.snapshot().screen === 'detail');
}
async function readQuote(page) {
  return risk(page).evaluate((dialog) => {
    const name = dialog.querySelector('[data-risk-product-name]');
    const edition = dialog.querySelector('[data-risk-product-edition]');
    const price = dialog.querySelector('[data-risk-product-price]');
    return { text: dialog.innerText, name: name?.textContent.trim() || '', edition: edition?.textContent.trim() || '', price: price?.textContent.trim() || '', amount: price?.dataset.amount ?? null };
  });
}

async function runMatrixCase(page, surface, orientation) {
  const label = `${surface.id}-${orientation}`;
  const result = { label, status: 'running', assertions: [] };
  report.checks.push(result);
  try {
    await prepare(page, orientation);
    const apiExists = await page.evaluate(() => typeof window.__appRentalDemo.setDemoPurchaseMode === 'function');
    check(result, '具备可观察场景接口', apiExists);
    const host = await page.locator('[data-action="toggle-demo-state"]').evaluate((node) => ({ outsideDevice: !node.closest('.device'), bodyHost: node.closest('.demo-state-control')?.parentElement === document.body }));
    check(result, '悬浮控件位于body宿主且不混入产品设备', host.outsideDevice && host.bodyHost, host);

    await selectMode(page, 'regular');
    await beginCheckout(page);
    const regular = await snapshot(page);
    check(result, '常规购买直接进入确认订单', regular.screen === 'checkout' && !regular.riskReminderOpen && regular.order?.status === 'pending');
    check(result, '常规订单无受限快照', regular.order?.riskSnapshot?.extraNoReasonRestricted === false && regular.order.riskSnapshot.extraNoReasonApplicable === true);
    await returnToDetail(page);
    await selectMode(page, 'repeat');
    const beforeReminder = await snapshot(page);
    await beginCheckout(page);
    const blocked = await snapshot(page);
    check(result, '多次购买在详情先提醒且不创建或改写待支付单', blocked.screen === 'detail' && blocked.riskReminderOpen && JSON.stringify(blocked.order) === JSON.stringify(beforeReminder.order));
    check(result, '提醒保留本次商品意图', blocked.pendingRentalIntent?.gameId === blocked.selectedGameId);
    check(result, '警示弹窗可见', await risk(page).isVisible());
    check(result, '提醒包含可见警示图标', await risk(page).locator('.rental-risk-warning svg').isVisible());
    const quote = await readQuote(page);
    check(result, '提醒保留履约售后说明', quote.text.includes('退款权益提醒') && /履约售后/.test(quote.text) && /不受影响|仍可|正常/.test(quote.text), quote);
    check(result, '提醒展示当前商品与版本', quote.text.includes('影之刃零') && quote.text.includes('标准版'), quote);
    check(result, '提醒展示价格', /[¥￥]\s*\d/.test(quote.text), quote);
    await capture(page, `${label}-repeat-risk`);

    const opposite = orientation === 'portrait' ? 'landscape' : 'portrait';
    await page.evaluate((value) => window.__appRentalDemo.setOrientation(value), opposite);
    const rotated = await snapshot(page);
    check(result, '旋转保留模式提醒意图和原待支付单', rotated.demoPurchaseMode === 'repeat' && rotated.riskReminderOpen && JSON.stringify(rotated.pendingRentalIntent) === JSON.stringify(blocked.pendingRentalIntent) && JSON.stringify(rotated.order) === JSON.stringify(blocked.order));
    await page.evaluate((value) => window.__appRentalDemo.setOrientation(value), orientation);
    await risk(page).locator('[data-action="close-rental-risk"]').filter({ hasText: '暂不购买' }).click();
    const cancelled = await snapshot(page);
    check(result, '暂不购买返回原页且清理意图', cancelled.screen === 'detail' && !cancelled.riskReminderOpen && !cancelled.pendingRentalIntent && !cancelled.pendingRiskSnapshot);
    check(result, '取消不改写已有待支付订单', JSON.stringify(cancelled.order) === JSON.stringify(beforeReminder.order));
    await page.evaluate(() => window.__appRentalDemo.confirmRentalRisk());
    check(result, '取消后迟到确认不能创建订单', JSON.stringify((await snapshot(page)).order) === JSON.stringify(cancelled.order));

    await beginCheckout(page);
    const closeButton = risk(page).locator('[data-action="close-rental-risk"]').filter({ hasNotText: '暂不购买' });
    check(result, '提醒提供独立右上关闭按钮', await closeButton.count() === 1);
    await closeButton.click();
    check(result, '右上关闭取消意图', !(await snapshot(page)).riskReminderOpen && !(await snapshot(page)).pendingRentalIntent);
    await beginCheckout(page);
    await page.keyboard.press('Escape');
    check(result, 'Escape取消提醒且停留原页', (await snapshot(page)).screen === 'detail' && !(await snapshot(page)).riskReminderOpen && !(await snapshot(page)).pendingRentalIntent);

    await prepare(page, orientation);
    await selectMode(page, 'repeat');
    await beginCheckout(page);
    const noOrderBlocked = await snapshot(page);
    check(result, '无订单场景提醒前不提前建单', noOrderBlocked.order === null && noOrderBlocked.riskReminderOpen);
    const acceptedQuote = await readQuote(page);
    await risk(page).locator('[data-action="confirm-rental-risk"]').click();
    const confirmed = await snapshot(page);
    const restricted = confirmed.order?.riskSnapshot;
    check(result, '确认后进入订单且固化受限权益', confirmed.screen === 'checkout' && confirmed.order?.status === 'pending' && restricted?.extraNoReasonRestricted === true && restricted.extraNoReasonApplicable === false && Number(restricted.acceptedAt) > 0 && Boolean(restricted.ruleVersion));
    check(result, '确认消费提醒及本次意图', !confirmed.riskReminderOpen && !confirmed.pendingRentalIntent && !confirmed.pendingRiskSnapshot);
    const expectedPrice = Number(confirmed.order.amount);
    const displayedAmounts = [...acceptedQuote.text.matchAll(/[¥￥]\s*(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
    check(result, '提醒报价与确认订单一致', displayedAmounts.includes(expectedPrice) && (!acceptedQuote.name || acceptedQuote.name.includes(confirmed.order.gameName)) && (acceptedQuote.amount === null || Number(acceptedQuote.amount) === expectedPrice), { acceptedQuote, gameName: confirmed.order.gameName, expectedPrice });
    await page.evaluate(() => { window.__appRentalDemo.confirmRentalRisk(); window.__appRentalDemo.confirmRentalRisk(); });
    const repeated = await snapshot(page);
    check(result, '重复确认不变更单号和权益快照', repeated.order?.id === confirmed.order.id && JSON.stringify(repeated.order.riskSnapshot) === JSON.stringify(restricted));
    const alternate = app(page).locator('[data-action="select-checkout-sku"]');
    const skuIds = await alternate.evaluateAll((nodes) => nodes.map((node) => node.dataset.sku).filter((value) => value && value !== 'membership'));
    const alternativeSku = skuIds.find((value) => value !== confirmed.order.sku);
    check(result, '存在可验证的另一购买SKU', Boolean(alternativeSku), skuIds);
    await app(page).locator(`[data-action="select-checkout-sku"][data-sku="${alternativeSku}"]`).click();
    const switchedSku = await snapshot(page);
    check(result, '更换SKU仍保存已确认的退款限制', switchedSku.order?.sku === alternativeSku && JSON.stringify(switchedSku.order.riskSnapshot) === JSON.stringify(restricted));
    await selectMode(page, 'regular');
    const switchedMode = await snapshot(page);
    check(result, '切回常规不追改当前待支付订单', switchedMode.demoPurchaseMode === 'regular' && JSON.stringify(switchedMode.order) === JSON.stringify(switchedSku.order));
    await returnToDetail(page);
    await beginCheckout(page);
    const nextRegular = await snapshot(page);
    check(result, '切回常规仅影响下一次购买', nextRegular.screen === 'checkout' && !nextRegular.riskReminderOpen && nextRegular.order.id !== switchedSku.order.id && nextRegular.order.riskSnapshot.extraNoReasonRestricted === false);
    await capture(page, `${label}-regular-checkout`);
    result.status = 'pass';
    process.stdout.write(`PASS ${label}: ${result.assertions.length} assertions\n`);
  } catch (error) {
    result.status = 'fail'; result.error = error.message;
    result.snapshot = await snapshot(page).catch(() => null);
    await capture(page, `${label}-failed`, true).catch(() => {});
    process.stdout.write(`FAIL ${label}: ${error.message}\n`);
  }
  saveReport();
}

async function runNarrowCase(page, surface) {
  const result = { label: `${surface.id}-320px-floating-control`, status: 'running', assertions: [] };
  report.checks.push(result);
  try {
    await page.setViewportSize({ width: 320, height: 850 });
    await prepare(page, 'portrait');
    const geometry = () => page.evaluate(() => {
      const toggle = document.querySelector('[data-action="toggle-demo-state"]');
      const options = [...document.querySelectorAll('[data-action="set-demo-purchase-mode"]')].filter((node) => node.getClientRects().length);
      const nodes = [toggle, ...options].filter(Boolean);
      let panel = options[0]?.parentElement;
      while (panel && !options.every((node) => panel.contains(node))) panel = panel.parentElement;
      const panelRect = panel?.getBoundingClientRect();
      return { viewport: innerWidth, documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, panel: panelRect ? { left: panelRect.left, right: panelRect.right, inside: panelRect.left >= -1 && panelRect.right <= innerWidth + 1 } : null, controls: nodes.map((node) => { const r = node.getBoundingClientRect(); return { action: node.dataset.action, left: r.left, right: r.right, width: r.width, inside: r.left >= -1 && r.right <= innerWidth + 1 }; }) };
    });
    const collapsed = await geometry();
    check(result, '320宽悬浮按钮位于可视区', collapsed.controls.length === 1 && collapsed.controls.every(({ inside }) => inside), collapsed);
    await page.locator('[data-action="toggle-demo-state"]').click();
    const expanded = await geometry();
    check(result, '320宽两选项完整显示且无新增横向越界', expanded.controls.length === 3 && expanded.controls.every(({ inside }) => inside) && expanded.panel?.inside && expanded.documentOverflow <= collapsed.documentOverflow + 1, expanded);
    const option = page.locator('[data-action="set-demo-purchase-mode"][data-value="repeat"]');
    await option.click();
    check(result, '窄屏可实际切换多次购买', (await snapshot(page)).demoPurchaseMode === 'repeat');
    if (!(await snapshot(page)).demoStatePanelOpen) await page.locator('[data-action="toggle-demo-state"]').click();
    await capture(page, `${surface.id}-320px-floating-panel`, true);
    result.status = 'pass';
    process.stdout.write(`PASS ${result.label}\n`);
  } catch (error) {
    result.status = 'fail'; result.error = error.message;
    await capture(page, `${surface.id}-320px-failed`, true).catch(() => {});
    process.stdout.write(`FAIL ${result.label}: ${error.message}\n`);
  }
  await page.setViewportSize({ width: 1680, height: 1100 });
  saveReport();
}

fs.mkdirSync(evidenceDir, { recursive: true });
assert(chromePath, '未找到本地Chrome');
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  for (const surface of surfaces) {
    const page = await browser.newPage({ viewport: { width: 1680, height: 1100 }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(8000);
    page.on('pageerror', (error) => report.runtimeErrors.push({ surface: surface.id, message: error.message }));
    page.on('console', (message) => { if (message.type() === 'error') report.runtimeErrors.push({ surface: surface.id, message: message.text() }); });
    await page.goto(pathToFileURL(path.join(root, 'demos', 'APP租号功能', surface.file)).href, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    for (const orientation of ['portrait', 'landscape']) await runMatrixCase(page, surface, orientation);
    await runNarrowCase(page, surface);
    await page.close();
  }
  report.summary = { total: report.checks.length, passed: report.checks.filter(({ status }) => status === 'pass').length, failed: report.checks.filter(({ status }) => status === 'fail').length, assertions: report.checks.reduce((total, result) => total + result.assertions.length, 0), runtimeErrors: report.runtimeErrors.length };
  report.status = report.summary.failed || report.summary.runtimeErrors ? 'fail' : 'pass';
  process.stdout.write(`DEMO_STATES ${report.summary.passed}/${report.summary.total} ${report.status.toUpperCase()}\nREPORT ${reportPath}\n`);
  if (report.status !== 'pass') process.exitCode = 1;
} catch (error) {
  report.status = 'fail'; report.fatalError = error.stack || error.message; process.exitCode = 1;
  process.stderr.write(`${report.fatalError}\n`);
} finally { await browser.close(); saveReport(); }

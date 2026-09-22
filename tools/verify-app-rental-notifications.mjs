import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const evidence = path.join(root, 'test-results', 'app-rental-notifications');
fs.mkdirSync(evidence, { recursive: true });
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const report = { generatedAt: new Date().toISOString(), checks: [], screenshots: [], consoleErrors: [], requests: [] };
const app = (page) => page.locator('#appRentalDemo');
const seeds = [
  ['replacement-approved', 'APP-20260803001', 'approved-pending-launch'],
  ['refund-accepted', 'APP-20260803004', 'submitted'],
  ['refund-arrived', 'APP-20260803006', 'refunded'],
  ['expiry-15m', 'APP-20260803001', null],
  ['order-expired', 'APP-20260803005', null],
  ['replacement-rejected', 'APP-NOTICE-20260922002', 'rejected'],
  ['refund-reviewed', 'APP-NOTICE-20260922003', 'channel-processing'],
];

async function check(name, task) {
  try { const result = await task(); report.checks.push({ name, status: 'pass', ...(result || {}) }); }
  catch (error) { report.checks.push({ name, status: 'fail', error: error.message }); process.stderr.write(`FAIL ${name}: ${error.message}\n`); }
  fs.writeFileSync(path.join(evidence, 'notification-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
}

async function health(page) {
  const result = await page.evaluate(() => {
    const scope = document.querySelector('#appRentalDemo');
    return {
      unloadedImages: [...scope.querySelectorAll('img')].filter((image) => !image.complete || !image.naturalWidth).map((image) => image.alt),
      overflow: [...scope.querySelectorAll('.portrait-content,.landscape-content,.notification-layout,.notification-card')].filter((element) => element.clientWidth).map((element) => ({ className: element.className, delta: element.scrollWidth - element.clientWidth })),
    };
  });
  assert.equal(result.unloadedImages.length, 0, '图片加载失败');
  assert(result.overflow.every(({ delta }) => delta <= 2), `横向溢出 ${JSON.stringify(result.overflow)}`);
  return result;
}

async function screenshot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  const target = path.join(evidence, `${name}.png`);
  await app(page).locator('.device').screenshot({ path: target, animations: 'disabled' });
  report.screenshots.push(target);
}

async function verifyMessages(page, surface, orientation) {
  const prefix = `${surface}-${orientation}`;
  await page.evaluate((value) => {
    const api = window.__appRentalDemo;
    api.openCaptureState('profile'); api.setOrientation(value);
  }, orientation);
  await check(`${prefix}: 个人中心真实通知入口`, async () => {
    const entrance = app(page).locator('[data-action="navigate"][data-screen="notifications"]');
    assert.equal(await entrance.count(), 1);
    assert((await entrance.getAttribute('class'))?.includes('has-unread'), '入口缺少未读红点');
    await entrance.click();
    assert.equal(await page.evaluate(() => window.__appRentalDemo.snapshot().screen), 'notifications');
    assert.match(await app(page).innerText(), /系统消息/);
    assert.equal(await app(page).locator('.notification-tabs').count(), 0, '仍有无效消息Tab');
    assert.equal(await app(page).locator('.notification-card').count(), seeds.length);
    assert.equal(await app(page).locator('.system-message-sender').count(), seeds.length);
    assert.equal(await app(page).locator('.system-message-time').count(), seeds.length);
    await screenshot(page, `${prefix}-system-messages`);
    return { health: await health(page) };
  });
  for (const [id, orderId, expectedStatus] of seeds) {
    await check(`${prefix}: ${id} → 对应订单 → 售后`, async () => {
      await page.evaluate(() => window.__appRentalDemo.navigate('notifications'));
      await app(page).locator(`[data-notification-id="${id}"]`).click();
      let state = await page.evaluate(() => window.__appRentalDemo.snapshot());
      assert.equal(state.screen, 'order-detail');
      assert.equal(state.selectedOrderId, orderId, '消息落错订单');
      assert.equal(state.notificationReadIds.filter((item) => item === id).length, 1);
      assert.match(await app(page).innerText(), new RegExp(orderId));
      if (expectedStatus) {
        assert.equal(state.afterSalesOrder?.orderId, orderId, '售后串单');
        assert.equal(state.afterSalesOrder?.status, expectedStatus);
        const entry = app(page).locator(`[data-order-card-action="after-sales-detail"][data-order-id="${orderId}"]`);
        assert.equal(await entry.count(), 1, '缺少对应售后入口');
        await entry.click();
        const dialog = app(page).locator('.after-sales-progress-dialog');
        assert.equal(await dialog.getAttribute('data-after-sales-status'), expectedStatus);
        assert.match(await dialog.innerText(), new RegExp(orderId));
        if (id === 'refund-reviewed') assert.match(await dialog.innerText(), /退款处理中/);
        if (id === 'replacement-rejected') assert.match(await dialog.innerText(), /问题描述不足/);
        if (surface === 'demo' && orientation === 'portrait' && ['refund-reviewed', 'replacement-rejected', 'replacement-approved'].includes(id)) await screenshot(page, `${prefix}-${id}-after-sales`);
        await dialog.locator('[data-action="close-after-sales-progress"]').first().click();
      }
      await app(page).locator('[data-action="task-back"]').first().click();
      assert.equal(await page.evaluate(() => window.__appRentalDemo.snapshot().screen), 'notifications', '返回未恢复消息页');
      assert(!(await app(page).locator(`[data-notification-id="${id}"]`).getAttribute('class')).includes('unread'));
      await app(page).locator(`[data-notification-id="${id}"]`).click();
      state = await page.evaluate(() => window.__appRentalDemo.snapshot());
      assert.equal(state.notificationReadIds.filter((item) => item === id).length, 1, '重复点击重复已读');
      return { orderId, afterSalesStatus: expectedStatus };
    });
  }
  await check(`${prefix}: 全部读后入口红点消失`, async () => {
    await page.evaluate(() => window.__appRentalDemo.navigate('profile'));
    assert.equal(await app(page).locator('[data-screen="notifications"].has-unread').count(), 0);
  });
}

async function verifyEvents(page, surface) {
  await check(`${surface}: 售后互斥、撤销重申、换号生效同步`, async () => {
    const result = await page.evaluate(() => {
      const api = window.__appRentalDemo;
      api.openCaptureState('after-sales');
      api.setAfterSalesRequestType('refund'); api.setAfterSalesReason('launch'); api.setAfterSalesDescription('启动失败，需要人工检查');
      const first = api.submitAfterSales();
      api.setAfterSalesRequestType('replacement');
      const blocked = api.submitAfterSales();
      const withdrawn = api.withdrawAfterSales();
      api.openAfterSales(); api.setAfterSalesRequestType('replacement'); api.setAfterSalesReason('account'); api.setAfterSalesDescription('账号登录异常，申请换号');
      const replacement = api.submitAfterSales();
      api.openAfterSales(); api.setAfterSalesInventory(false);
      const noStock = api.requestReplacement();
      const noStockText = document.querySelector('.replacement-status')?.textContent || '';
      api.setAfterSalesInventory(true); api.requestReplacement();
      const approved = api.snapshot().replacementRequest;
      const launch = api.prepareAccountForLaunch({ orderId: approved.orderId, launchRequestId: 'NOTIFICATION-REPLACEMENT-VERIFY', inventoryAvailable: true });
      return { first, blocked, withdrawn, replacement, noStock, noStockText, approved, launch, ticket: api.snapshot().notificationAfterSales[approved.orderId], executed: api.snapshot().replacementRequest };
    });
    assert.equal(result.blocked.id, result.first.id);
    assert.equal(result.blocked.requestType, 'refund', '重复申请绕过退款/换号互斥');
    assert.equal(result.withdrawn, true);
    assert.equal(result.replacement.requestType, 'replacement');
    assert.equal(result.noStock, false); assert.match(result.noStockText, /暂无同游戏同版本账号/);
    assert.equal(result.approved.status, 'approved-pending-launch');
    assert.equal(result.launch.replacementApplied, true);
    assert.equal(result.executed.status, 'executed');
    assert.equal(result.ticket.status, 'bound', '换号实际生效后消息对应售后仍显示待下次启动');
  });
  await check(`${surface}: 事件/渠道幂等与敏感字段白名单`, async () => {
    const result = await page.evaluate(() => {
      const api = window.__appRentalDemo;
      api.openCaptureState('orders'); api.setScenario('active-rental');
      const orderId = api.snapshot().order.id;
      const payload = { orderId, event: 'refund-reviewed', periodId: 'REFUND-TEST-01', pushAvailable: false, smsAvailable: false, account: 'sensitive-account', password: 'sensitive-password', guardCode: 'sensitive-guard', body: 'unsafe-injected-body' };
      const first = api.recordRentalNotification(payload);
      const repeat = api.recordRentalNotification(payload);
      const arrived = api.recordRentalNotification({ orderId, event: 'refund-arrived', periodId: payload.periodId });
      const invalid = api.recordRentalNotification({ orderId, event: 'unknown-event' });
      const invalidOrder = api.recordRentalNotification({ orderId: 'missing', event: 'refund-arrived' });
      const snapshot = api.snapshot();
      api.openRentalNotification(first.id);
      return { first, repeat, arrived, invalid, invalidOrder, items: snapshot.notificationItems, deliveries: snapshot.notificationDeliveryRecords, ticket: api.snapshot().afterSalesOrder, order: api.getOrderCollection().find((order) => order.id === orderId) };
    });
    assert.equal(result.first.id, result.repeat.id);
    assert.equal(result.items.length, 2, '重复事件生成了新消息');
    assert.equal(result.deliveries.length, 6);
    assert.equal(new Set(result.deliveries.map(({ key }) => key)).size, 6);
    assert.deepEqual(result.deliveries.filter(({ event }) => event === 'refund-reviewed').map(({ channel, status }) => [channel, status]), [['in-app', 'stored'], ['push', 'unreachable'], ['sms', 'unreachable']]);
    assert.equal(result.invalid, null); assert.equal(result.invalidOrder, null);
    assert.equal(result.ticket.status, 'refunded', '点击旧审核消息倒退最新到账状态');
    assert.equal(result.order.status, 'refunded');
    assert(!/sensitive-|unsafe-injected-body/.test(JSON.stringify(result)), '敏感字段进入消息或渠道记录');
    return { dynamicMessages: result.items.length, deliveryRecords: result.deliveries.length };
  });
  await check(`${surface}: 15分钟阈值与到期自然触发且不重复`, async () => {
    const result = await page.evaluate(() => {
      const api = window.__appRentalDemo;
      api.openCaptureState('orders'); api.setScenario('active-rental');
      api.triggerExpiryMinutes(16); const before = api.snapshot().notificationItems.length;
      api.triggerExpiryMinutes(15); api.closeExpiryReminder(); api.triggerExpiryMinutes(14); api.triggerExpiryMinutes(15);
      api.triggerExpiryMinutes(0); api.triggerExpiryMinutes(0);
      const state = api.snapshot();
      return { before, items: state.notificationItems, deliveries: state.notificationDeliveryRecords, usage: state.rentalUsage, order: state.order };
    });
    assert.equal(result.before, 0);
    assert.equal(result.items.filter(({ event }) => event === 'expiry-15m').length, 1);
    assert.equal(result.items.filter(({ event }) => event === 'order-expired').length, 1);
    assert.equal(result.deliveries.length, 4);
    assert.equal(result.usage.expiryExecutionCount, 1);
    assert.equal(result.order.status, 'ended');
    return { events: result.items.map(({ event }) => event) };
  });
  await check(`${surface}: 已读及售后按订单隔离`, async () => {
    const result = await page.evaluate(() => {
      const api = window.__appRentalDemo;
      api.openCaptureState('notifications');
      api.openRentalNotification('replacement-approved');
      const first = api.snapshot().afterSalesOrder;
      api.openRentalNotification('refund-accepted');
      const second = api.snapshot().afterSalesOrder;
      api.openRentalNotification('replacement-approved');
      const restored = api.snapshot().afterSalesOrder;
      return { first, second, restored, read: api.snapshot().notificationReadIds };
    });
    assert.notEqual(result.first.orderId, result.second.orderId);
    assert.deepEqual(result.restored, result.first);
    assert.equal(result.read.length, 2);
  });
}

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--disable-gpu', '--no-first-run'] });
try {
  for (const [surface, file] of [['demo', '盖世游戏APP租号功能demo.html'], ['annotation', '盖世游戏APP租号功能-标注版.html']]) {
    const page = await browser.newPage({ viewport: { width: 1680, height: 1100 }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(10000);
    page.on('pageerror', (error) => report.consoleErrors.push({ surface, message: error.message }));
    page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push({ surface, message: message.text() }); });
    page.on('request', (request) => { if (/^https?:/.test(request.url())) report.requests.push(request.url()); });
    await page.goto(pathToFileURL(path.join(root, 'demos', 'APP租号功能', file)).href, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    for (const orientation of ['portrait', 'landscape']) await verifyMessages(page, surface, orientation);
    await verifyEvents(page, surface);
    await page.close();
  }
} catch (error) {
  report.fatalError = error.message;
  process.stderr.write(`${error.stack}\n`);
} finally {
  await browser.close();
  report.summary = { total: report.checks.length, passed: report.checks.filter(({ status }) => status === 'pass').length, failed: report.checks.filter(({ status }) => status === 'fail').length, errors: report.consoleErrors.length, externalRequests: report.requests.length };
  report.status = !report.fatalError && !report.summary.failed && !report.summary.errors && !report.summary.externalRequests ? 'pass' : 'fail';
  fs.writeFileSync(path.join(evidence, 'notification-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`NOTIFICATIONS ${report.summary.passed}/${report.summary.total} ${report.status.toUpperCase()}\nREPORT ${path.join(evidence, 'notification-verification.json')}\n`);
  if (report.status !== 'pass') process.exitCode = 1;
}

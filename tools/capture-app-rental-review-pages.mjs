import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const demoPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.html');
const outputDir = path.join(root, 'public', 'prd', 'app-rental');
const chromePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find(fs.existsSync);
const outputs = Object.freeze([
  { name: '20-after-sales-refund-portrait.png', page: 'refund' },
  { name: '21-after-sales-replacement-portrait.png', page: 'replacement' },
  { name: '22-rental-notifications-portrait.png', page: 'notifications' },
]);
const secrets = Object.freeze(['gh_rental_2607', 'G@meHub#8291', '48291', 'rdr2.rental@gamehub.example', 'Rockstar#2607', '739204']);

assert(chromePath, 'Local Chrome not found');
assert(fs.existsSync(demoPath), `Demo not found: ${demoPath}`);
fs.mkdirSync(outputDir, { recursive: true });

function verifyPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert(buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), `${filePath} is not a PNG`);
  assert.equal(buffer.readUInt32BE(16), 390, `${filePath} width mismatch`);
  assert.equal(buffer.readUInt32BE(20), 844, `${filePath} height mismatch`);
  assert(buffer.length > 20 * 1024, `${filePath} is unexpectedly small`);
  return buffer.length;
}

async function prepare(page, target) {
  await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__appRentalDemo));
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.evaluate(({ pageName }) => {
    const demo = window.__appRentalDemo;
    demo.setOrientation('portrait');
    if (pageName === 'notifications') {
      demo.openCaptureState('notifications');
      return;
    }
    demo.openCaptureState('after-sales');
    if (pageName === 'replacement') {
      demo.setAfterSalesRequestType('replacement');
      demo.setAfterSalesReason('account');
    }
  }, { pageName: target.page });
  if (target.page === 'replacement') {
    await page.locator('#after-sales-description').fill('租用账号频繁掉线，重新登录后仍无法稳定游玩。');
    await page.evaluate(() => document.activeElement?.blur());
  }
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
}

async function verify(page, target) {
  const device = page.locator('.device.portrait');
  const box = await device.boundingBox();
  assert(box && Math.round(box.width) === 390 && Math.round(box.height) === 844, `${target.name} device geometry mismatch`);
  const text = await device.innerText();
  for (const secret of secrets) assert(!text.includes(secret), `${target.name} exposes sensitive value ${secret}`);
  assert(!/CDKEY|卡密|激活码/i.test(text), `${target.name} exposes unrelated key-delivery copy`);

  if (target.page === 'refund') {
    assert.deepEqual(await page.locator('[data-after-sales-request]').allInnerTexts(), ['申请退款', '申请换号']);
    assert.equal(await page.locator('[data-after-sales-request="refund"].selected').count(), 1, 'Refund request is not selected');
    assert.deepEqual(await page.locator('[data-after-sales-reason]').allInnerTexts(), ['3天无理由', '无法登录', '无法启动', '账号异常', '其他问题']);
    assert.equal(await page.locator('[data-after-sales-reason="no-reason"].selected').count(), 1, 'No-reason refund is not selected');
    assert(text.includes('预计退款金额 ¥1.90') && text.includes('提交退款申请'), 'Refund guidance or CTA is missing');
    assert(text.includes('补充说明（选填）'), 'No-reason refund must not require a reason description');
  }

  if (target.page === 'replacement') {
    assert.deepEqual(await page.locator('[data-after-sales-request]').allInnerTexts(), ['申请退款', '申请换号']);
    assert.equal(await page.locator('[data-after-sales-request="replacement"].selected').count(), 1, 'Replacement request is not selected');
    assert.deepEqual(await page.locator('[data-after-sales-reason]').allInnerTexts(), ['无法登录', '账号异常/频繁掉线', '游戏无法启动', '其他问题']);
    assert.equal(await page.locator('[data-after-sales-reason="account"].selected').count(), 1, 'Account issue is not selected');
    assert(text.includes('下次启动游戏时自动使用') && text.includes('提交换号申请'), 'Replacement guidance or CTA is missing');
    assert((await page.locator('#after-sales-description').inputValue()).includes('租用账号频繁掉线'), 'Replacement description is missing');
  }

  if (target.page === 'notifications') {
    assert.deepEqual(await page.locator('.notification-tabs button').allInnerTexts(), ['全部', '订单与售后']);
    assert.equal(await page.locator('.notification-tabs button.selected').innerText(), '全部');
    assert.equal(await page.locator('.notification-card').count(), 4, 'Notification card count mismatch');
    assert.deepEqual(await page.locator('.notification-copy strong').allInnerTexts(), [
      '换号审核已通过',
      '退款申请已受理',
      '退款已原路到账',
      '租号权益将在15分钟后到期',
    ]);
    assert.equal(await page.locator('.notification-card.unread').count(), 2, 'Unread notification count mismatch');
  }

  const primary = page.locator('.after-sales-submit');
  if (target.page !== 'notifications') {
    const primaryBox = await primary.boundingBox();
    const contained = primaryBox && primaryBox.y >= box.y && primaryBox.y + primaryBox.height <= box.y + box.height;
    assert(contained, `${target.name} primary action is outside the visible device frame: ${JSON.stringify({ device: box, primary: primaryBox })}`);
  }
}

async function verifyInteraction(page, target) {
  if (target.page === 'refund') {
    await page.getByRole('button', { name: '提交退款申请', exact: true }).click();
    const result = await page.evaluate(() => {
      const snapshot = window.__appRentalDemo.snapshot();
      return { screen: snapshot.screen, requestType: snapshot.afterSalesOrder?.requestType, reason: snapshot.afterSalesOrder?.reason };
    });
    assert.deepEqual(result, { screen: 'order-detail', requestType: 'refund', reason: 'no-reason' }, 'Refund submit flow mismatch');
  }
  if (target.page === 'replacement') {
    await page.getByRole('button', { name: '提交换号申请', exact: true }).click();
    const result = await page.evaluate(() => {
      const snapshot = window.__appRentalDemo.snapshot();
      return { screen: snapshot.screen, requestType: snapshot.afterSalesOrder?.requestType, reason: snapshot.afterSalesOrder?.reason };
    });
    assert.deepEqual(result, { screen: 'order-detail', requestType: 'replacement', reason: 'account' }, 'Replacement submit flow mismatch');
  }
  if (target.page === 'notifications') {
    await page.locator('[data-notification-id="replacement-approved"]').click();
    const result = await page.evaluate(() => {
      const snapshot = window.__appRentalDemo.snapshot();
      return { screen: snapshot.screen, selectedOrderId: snapshot.selectedOrderId, read: snapshot.notificationReadIds.includes('replacement-approved') };
    });
    assert.deepEqual(result, { screen: 'order-detail', selectedOrderId: 'APP-20260803001', read: true }, 'Notification routing or read state mismatch');
  }
}

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  for (const target of outputs) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await prepare(page, target);
    await verify(page, target);
    assert.deepEqual(errors, [], `${target.name} page errors: ${errors.join(' | ')}`);
    const outputPath = path.join(outputDir, target.name);
    await page.locator('.device.portrait').screenshot({ path: outputPath, animations: 'disabled' });
    const bytes = verifyPng(outputPath);
    await verifyInteraction(page, target);
    process.stdout.write(`CAPTURED ${target.name} ${bytes} bytes\n`);
    await page.close();
  }
  process.stdout.write(`REVIEW_CAPTURE ${outputs.length}/${outputs.length} PASS\n`);
} finally {
  await browser.close();
}

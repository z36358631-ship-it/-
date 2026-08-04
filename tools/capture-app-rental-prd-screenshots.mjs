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

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const EXPECTED_DIMENSIONS = Object.freeze({
  portrait: { width: 390, height: 844 },
  landscape: { width: 874, height: 402 },
});

const shots = [
  { name: '01-discovery-portrait.png', orientation: 'portrait', screen: 'home', scenario: 'member-library-trial' },
  { name: '01-discovery-landscape.png', orientation: 'landscape', screen: 'home', scenario: 'member-library-trial' },
  { name: '09-play-portrait.png', orientation: 'portrait', screen: 'play', scenario: 'member-library-trial' },
  { name: '09-play-landscape.png', orientation: 'landscape', screen: 'play', scenario: 'member-library-trial' },
  { name: '10-community-portrait.png', orientation: 'portrait', screen: 'community', scenario: 'member-library-trial' },
  { name: '10-community-landscape.png', orientation: 'landscape', screen: 'community', scenario: 'member-library-trial' },
  { name: '11-ranking-portrait.png', orientation: 'portrait', screen: 'ranking', scenario: 'member-library-trial' },
  { name: '11-ranking-landscape.png', orientation: 'landscape', screen: 'ranking', scenario: 'member-library-trial' },
  { name: '12-library-portrait.png', orientation: 'portrait', screen: 'library', scenario: 'member-library-trial' },
  { name: '12-library-landscape.png', orientation: 'landscape', screen: 'library', scenario: 'member-library-trial' },
  { name: '13-profile-portrait.png', orientation: 'portrait', screen: 'profile', scenario: 'active-member' },
  { name: '13-profile-landscape.png', orientation: 'landscape', screen: 'profile', scenario: 'active-member' },
  { name: '14-search-portrait.png', orientation: 'portrait', screen: 'search', scenario: 'member-library-trial' },
  { name: '14-search-landscape.png', orientation: 'landscape', screen: 'search', scenario: 'member-library-trial' },
  { name: '02-detail-portrait.png', orientation: 'portrait', screen: 'detail', scenario: 'member-library-trial', gameId: 'shadow-blade-zero' },
  { name: '02-detail-landscape.png', orientation: 'landscape', screen: 'detail', scenario: 'member-library-trial', gameId: 'spiritfarer' },
  { name: '03-checkout-portrait.png', orientation: 'portrait', screen: 'checkout', scenario: 'not-member-library', beforeNavigate: 'select-hourly-8h' },
  { name: '03-checkout-landscape.png', orientation: 'landscape', screen: 'checkout', scenario: 'not-member-library', beforeNavigate: 'select-hourly-8h' },
  { name: '04-membership-portrait.png', orientation: 'portrait', screen: 'membership', scenario: 'member-library-trial-used' },
  { name: '04-membership-landscape.png', orientation: 'landscape', screen: 'membership', scenario: 'member-library-trial-used' },
  { name: '15-member-library-portrait.png', orientation: 'portrait', screen: 'member-library', scenario: 'member-library-trial-used' },
  { name: '15-member-library-landscape.png', orientation: 'landscape', screen: 'member-library', scenario: 'member-library-trial-used' },
  { name: '05-orders-portrait.png', orientation: 'portrait', screen: 'orders', scenario: 'active-rental', sensitive: true },
  { name: '05-orders-landscape.png', orientation: 'landscape', screen: 'orders', scenario: 'active-rental', sensitive: true },
  { name: '16-order-detail-portrait.png', orientation: 'portrait', screen: 'order-detail', scenario: 'active-rental', sensitive: true },
  { name: '16-order-detail-landscape.png', orientation: 'landscape', screen: 'order-detail', scenario: 'active-rental', sensitive: true },
  { name: '06-steam-login-portrait.png', orientation: 'portrait', screen: 'orders', scenario: 'active-rental', afterNavigate: 'open-manual-login', expectedScreen: 'steam-login', sensitive: true },
  { name: '06-steam-login-landscape.png', orientation: 'landscape', screen: 'orders', scenario: 'active-rental', afterNavigate: 'open-manual-login', expectedScreen: 'steam-login', sensitive: true },
  { name: '07-expiry-15m-portrait.png', orientation: 'portrait', screen: 'orders', scenario: 'active-rental', afterNavigate: 'open-expiry-15m' },
  { name: '07-expiry-15m-landscape.png', orientation: 'landscape', screen: 'orders', scenario: 'active-rental', afterNavigate: 'open-expiry-15m' },
  { name: '08-after-sales-portrait.png', orientation: 'portrait', screen: 'orders', scenario: 'active-rental', afterNavigate: 'open-after-sales', expectedScreen: 'after-sales' },
  { name: '08-after-sales-landscape.png', orientation: 'landscape', screen: 'orders', scenario: 'active-rental', afterNavigate: 'open-after-sales', expectedScreen: 'after-sales' },
  { name: '17-payment-success-portrait.png', orientation: 'portrait', screen: 'checkout', scenario: 'not-member-library', beforeNavigate: 'select-hourly-8h', afterNavigate: 'complete-game-payment' },
  { name: '17-payment-success-landscape.png', orientation: 'landscape', screen: 'checkout', scenario: 'not-member-library', beforeNavigate: 'select-hourly-8h', afterNavigate: 'complete-game-payment' },
  { name: '18-membership-success-portrait.png', orientation: 'portrait', screen: 'membership', scenario: 'member-library-trial-used', afterNavigate: 'complete-membership-payment' },
  { name: '18-membership-success-landscape.png', orientation: 'landscape', screen: 'membership', scenario: 'member-library-trial-used', afterNavigate: 'complete-membership-payment' },
];

assert(chromePath, 'Local Chrome not found');
assert(fs.existsSync(demoPath), `Demo not found: ${demoPath}`);
fs.mkdirSync(outputDir, { recursive: true });

async function openFreshPage(browser) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: 1,
  });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__appRentalDemo));
  return { page, pageErrors };
}

async function waitForAssets(page) {
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForFunction(() => Array.from(document.images)
    .every((image) => image.complete && image.naturalWidth > 0));
}

function assertNoPageErrors(pageErrors, label) {
  assert.deepEqual(pageErrors, [], `${label} page errors: ${pageErrors.join(' | ')}`);
}

async function withFreshPage(browser, label, run) {
  const { page, pageErrors } = await openFreshPage(browser);
  try {
    await run(page);
    await page.waitForTimeout(0);
    assertNoPageErrors(pageErrors, label);
  } finally {
    await page.close();
  }
}

async function runPreflight(browser) {
  let passed = 0;

  await withFreshPage(browser, 'preflight-t0', async (page) => {
    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.navigate('orders');
      window.__appRentalDemo.openManualLogin();
    });
    await page.locator('#steam-account').fill('preflight-user');
    await page.locator('#steam-password').fill('preflight-secret');
    await page.locator('[data-action="submit-steam-login"]').click();
    await page.locator('[data-action="request-guard"]').click();
    const before = await page.evaluate(() => window.__appRentalDemo.snapshot());
    assert.equal(before.guardCode, '[REDACTED]', 'T0 preflight did not issue a Guard code');
    await page.evaluate(() => window.__appRentalDemo.triggerExpiryMinutes(0));
    const after = await page.evaluate(() => window.__appRentalDemo.snapshot());
    assert.equal(after.order.status, 'ended', 'T0 did not end the active order');
    assert.equal(after.rentalUsage.sessionActive, false, 'T0 did not end the active session');
    assert.equal(after.rentalUsage.rentalSessionRevoked, true, 'T0 did not revoke the rental session');
    assert.equal(after.rentalUsage.shortAuthValid, false, 'T0 did not revoke short authorization');
    assert.equal(after.rentalUsage.accountReleased, true, 'T0 did not release the account');
    assert.equal(after.guardCode, null, 'T0 did not clear the Guard code');
    assert.equal(after.steamForm.account, '', 'T0 did not clear the Steam account');
    assert.equal(after.steamForm.password, '', 'T0 did not clear the Steam password');
  });
  passed += 1;

  await withFreshPage(browser, 'preflight-no-inventory', async (page) => {
    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.setScenario('not-member-library');
      window.__appRentalDemo.selectRentalSku('hourly-8h');
      window.__appRentalDemo.navigate('checkout');
      window.__appRentalDemo.setInventoryAvailable(false);
    });
    const result = await page.evaluate(() => ({
      text: document.querySelector('#appRentalDemo').innerText,
      retry: Boolean(document.querySelector('[data-action="retry-inventory"]')),
      back: Boolean(document.querySelector('[data-action="back-to-detail"]')),
      primaryCount: document.querySelectorAll('[data-primary-action="true"]').length,
    }));
    assert(result.text.includes('当前套餐已售罄'), 'No-inventory state is missing sold-out copy');
    assert(result.retry && result.back, 'No-inventory state is missing retry or back recovery');
    assert.equal(result.primaryCount, 1, 'No-inventory state must have one primary action');
  });
  passed += 1;

  await withFreshPage(browser, 'preflight-price-change', async (page) => {
    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.setScenario('not-member-library');
      window.__appRentalDemo.selectRentalSku('hourly-8h');
      window.__appRentalDemo.navigate('checkout');
      window.__appRentalDemo.setPriceChanged(true);
    });
    const result = await page.evaluate(() => ({
      screen: window.__appRentalDemo.snapshot().screen,
      text: document.querySelector('#appRentalDemo').innerText,
      primaryCount: document.querySelectorAll('[data-primary-action="true"]').length,
    }));
    assert.equal(result.screen, 'checkout', 'Price change did not stay on checkout');
    assert(result.text.includes('按新价格重新确认'), 'Price change is missing reconfirmation copy');
    assert.equal(result.primaryCount, 1, 'Price-change state must have one primary action');
  });
  passed += 1;

  await withFreshPage(browser, 'preflight-allocation-failure', async (page) => {
    const orderId = await page.evaluate(() => {
      const order = window.__appRentalDemo.createOrder({ sku: 'rent-2h', amount: 9.9, priceVersion: 'preflight-allocation' });
      window.__appRentalDemo.payOrder();
      window.__appRentalDemo.allocateAccount(false);
      window.__appRentalDemo.navigate('orders');
      window.__appRentalDemo.selectOrder(order.id);
      return order.id;
    });
    assert(orderId, 'Allocation-failure preflight did not create an order');
    assert((await page.locator('.portrait-order-detail').innerText()).includes('自动退款'), 'Allocation failure is missing automatic-refund copy');
  });
  passed += 1;

  await withFreshPage(browser, 'preflight-network-error', async (page) => {
    const orderId = await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.setScenario('not-member-library');
      window.__appRentalDemo.selectRentalSku('hourly-8h');
      window.__appRentalDemo.navigate('checkout');
      window.__appRentalDemo.setNetworkAvailable(false);
      window.__appRentalDemo.queryOrderStatus();
      return window.__appRentalDemo.snapshot().order.id;
    });
    const result = await page.evaluate(() => ({
      orderId: window.__appRentalDemo.snapshot().order.id,
      text: document.querySelector('#appRentalDemo').innerText,
      retry: Boolean(document.querySelector('[data-action="requery-order"]')),
    }));
    assert.equal(result.orderId, orderId, 'Network error did not preserve the order number');
    assert(result.text.includes(orderId), 'Network-error UI does not show the preserved order number');
    assert(result.retry, 'Network-error UI is missing the requery action');
  });
  passed += 1;

  for (const minutes of [5, 1]) {
    await withFreshPage(browser, `preflight-fresh-${minutes}m`, async (page) => {
      const result = await page.evaluate((value) => {
        window.__appRentalDemo.setScenario('active-rental');
        const returned = window.__appRentalDemo.triggerExpiryMinutes(value);
        return {
          returned,
          count: window.__appRentalDemo.snapshot().expiryReminderCount,
          reminder: Boolean(document.querySelector('.expiry-reminder')),
        };
      }, minutes);
      assert.equal(result.returned, false, `Fresh ${minutes}-minute trigger unexpectedly opened a reminder`);
      assert.equal(result.count, 0, `Fresh ${minutes}-minute trigger incremented reminder count`);
      assert.equal(result.reminder, false, `Fresh ${minutes}-minute trigger rendered reminder DOM`);
    });
    passed += 1;
  }

  assert.equal(passed, 7, `Preflight count mismatch: ${passed}/7`);
  process.stdout.write(`PREFLIGHT ${passed}/7 PASS\n`);
}

async function setShotState(page, shot) {
  await page.evaluate(({ orientation, scenario, beforeNavigate, screen, afterNavigate, gameId }) => {
    const demo = window.__appRentalDemo;
    demo.setOrientation(orientation);
    demo.setScenario(scenario);
    if (gameId) demo.setSelectedGame(gameId);
    if (beforeNavigate === 'select-hourly-8h') demo.selectRentalSku('hourly-8h');
    demo.navigate(screen);
    if (afterNavigate === 'open-manual-login') demo.openManualLogin();
    if (afterNavigate === 'open-expiry-15m') {
      demo.setGameplayContext(false);
      demo.triggerExpiryMinutes(15);
    }
    if (afterNavigate === 'open-after-sales') demo.openAfterSales();
    if (afterNavigate === 'complete-game-payment') {
      demo.payOrder();
      demo.allocateAccount(true);
    }
    if (afterNavigate === 'complete-membership-payment') {
      demo.createMembershipOrder();
      demo.payMembershipOrder();
    }
  }, shot);
}

async function verifyShotState(page, shot) {
  const state = await page.evaluate(() => window.__appRentalDemo.snapshot());
  assert.equal(state.orientation, shot.orientation, `${shot.name} orientation mismatch`);
  assert.equal(state.screen, shot.expectedScreen || shot.screen, `${shot.name} screen mismatch`);

  const device = page.locator('.device');
  await device.waitFor({ state: 'visible' });
  const box = await device.boundingBox();
  const expected = EXPECTED_DIMENSIONS[shot.orientation];
  assert(box, `${shot.name} device has no bounding box`);
  assert.equal(Math.round(box.width), expected.width, `${shot.name} device width mismatch`);
  assert.equal(Math.round(box.height), expected.height, `${shot.name} device height mismatch`);

  if (shot.afterNavigate === 'open-expiry-15m') {
    assert.equal(state.expiryReminderCount, 1, `${shot.name} reminder count mismatch`);
    assert.equal(await page.locator('.expiry-reminder').count(), 1, `${shot.name} reminder is not visible`);
  }

  if (shot.sensitive) {
    const visible = await page.locator('.device').innerText();
    for (const secret of ['gh_rental_2607', 'G@meHub#8291', '48291']) {
      assert(!visible.includes(secret), `${shot.name} exposes sensitive value ${secret}`);
    }
    assert.equal(state.guardCode, null, `${shot.name} unexpectedly contains a Guard code`);
    assert.equal(state.steamForm.account, '', `${shot.name} unexpectedly contains a Steam account`);
    assert.equal(state.steamForm.password, '', `${shot.name} unexpectedly contains a Steam password`);
  }
}

function verifyPng(filePath, shot) {
  const buffer = fs.readFileSync(filePath);
  assert(buffer.subarray(0, 8).equals(PNG_SIGNATURE), `${shot.name} has an invalid PNG signature`);
  assert(buffer.length > 20 * 1024, `${shot.name} is unexpectedly small (${buffer.length} bytes)`);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const expected = EXPECTED_DIMENSIONS[shot.orientation];
  assert.equal(width, expected.width, `${shot.name} PNG width mismatch`);
  assert.equal(height, expected.height, `${shot.name} PNG height mismatch`);
  return buffer.length;
}

async function captureShots(browser) {
  let captured = 0;
  for (const shot of shots) {
    await withFreshPage(browser, shot.name, async (page) => {
      await setShotState(page, shot);
      await waitForAssets(page);
      await verifyShotState(page, shot);
      const outputPath = path.join(outputDir, shot.name);
      await page.locator('.device').screenshot({
        path: outputPath,
        animations: 'disabled',
      });
      const bytes = verifyPng(outputPath, shot);
      process.stdout.write(`CAPTURED ${shot.name} ${bytes} bytes\n`);
    });
    captured += 1;
  }
  assert.equal(captured, shots.length, `Capture count mismatch: ${captured}/${shots.length}`);
  process.stdout.write(`CAPTURE ${captured}/${shots.length} PASS\n`);
}

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  await runPreflight(browser);
  await captureShots(browser);
} finally {
  await browser.close();
}

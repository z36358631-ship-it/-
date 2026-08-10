import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const demoPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.html');
const outputDir = path.join(root, 'public', 'prd', 'app-rental');
const evidenceDir = path.join(root, 'test-results', 'app-rental-capture');
const stagingDir = path.join(evidenceDir, 'staging');
const reportPath = path.join(evidenceDir, 'capture-results.json');
const chromePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find(fs.existsSync);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const EXPECTED_DIMENSIONS = Object.freeze({
  portrait: { width: 390, height: 844 },
  landscape: { width: 874, height: 402 },
});

const PAGE_CONTRACTS = Object.freeze({
  home: Object.freeze({ screen: 'home', baselineSource: 'app-v611' }),
  play: Object.freeze({ screen: 'play', baselineSource: 'app-v611' }),
  community: Object.freeze({ screen: 'community', baselineSource: 'app-v611' }),
  ranking: Object.freeze({ screen: 'ranking', baselineSource: 'app-v611' }),
  library: Object.freeze({ screen: 'library', baselineSource: 'app-v611' }),
  profile: Object.freeze({ screen: 'profile', baselineSource: 'app-v611' }),
  search: Object.freeze({ screen: 'search', baselineSource: 'app-v611' }),
  detail: Object.freeze({ screen: 'detail', baselineSource: 'app-v611' }),
  checkout: Object.freeze({ screen: 'checkout', baselineSource: 'mac-rental' }),
  membership: Object.freeze({ screen: 'membership', baselineSource: 'mac-rental' }),
  'member-library': Object.freeze({ screen: 'member-library', baselineSource: 'mac-rental' }),
  orders: Object.freeze({ screen: 'orders', baselineSource: 'mac-rental' }),
  'order-detail': Object.freeze({ screen: 'order-detail', baselineSource: 'mac-rental' }),
  'steam-login': Object.freeze({ screen: 'steam-login', baselineSource: 'mac-rental' }),
  'expiry-15m': Object.freeze({ screen: 'orders', baselineSource: 'mac-rental' }),
  'after-sales': Object.freeze({ screen: 'after-sales', baselineSource: 'mac-rental' }),
  'payment-success': Object.freeze({ screen: 'checkout', baselineSource: 'mac-rental' }),
  'membership-success': Object.freeze({ screen: 'membership', baselineSource: 'mac-rental' }),
});

const shots = Object.freeze([
  { name: '01-discovery-portrait.png', pageId: 'home', orientation: 'portrait' },
  { name: '01-discovery-landscape.png', pageId: 'home', orientation: 'landscape' },
  { name: '02-detail-portrait.png', pageId: 'detail', orientation: 'portrait' },
  { name: '02-detail-landscape.png', pageId: 'detail', orientation: 'landscape' },
  { name: '03-checkout-portrait.png', pageId: 'checkout', orientation: 'portrait' },
  { name: '03-checkout-landscape.png', pageId: 'checkout', orientation: 'landscape' },
  { name: '04-membership-portrait.png', pageId: 'membership', orientation: 'portrait' },
  { name: '04-membership-landscape.png', pageId: 'membership', orientation: 'landscape' },
  { name: '05-orders-portrait.png', pageId: 'orders', orientation: 'portrait', sensitive: true },
  { name: '05-orders-landscape.png', pageId: 'orders', orientation: 'landscape', sensitive: true },
  { name: '06-steam-login-portrait.png', pageId: 'steam-login', orientation: 'portrait', sensitive: true },
  { name: '06-steam-login-landscape.png', pageId: 'steam-login', orientation: 'landscape', sensitive: true },
  { name: '07-expiry-15m-portrait.png', pageId: 'expiry-15m', orientation: 'portrait' },
  { name: '07-expiry-15m-landscape.png', pageId: 'expiry-15m', orientation: 'landscape' },
  { name: '08-after-sales-portrait.png', pageId: 'after-sales', orientation: 'portrait' },
  { name: '08-after-sales-landscape.png', pageId: 'after-sales', orientation: 'landscape' },
  { name: '09-play-portrait.png', pageId: 'play', orientation: 'portrait' },
  { name: '09-play-landscape.png', pageId: 'play', orientation: 'landscape' },
  { name: '10-community-portrait.png', pageId: 'community', orientation: 'portrait' },
  { name: '10-community-landscape.png', pageId: 'community', orientation: 'landscape' },
  { name: '11-ranking-portrait.png', pageId: 'ranking', orientation: 'portrait' },
  { name: '11-ranking-landscape.png', pageId: 'ranking', orientation: 'landscape' },
  { name: '12-library-portrait.png', pageId: 'library', orientation: 'portrait' },
  { name: '12-library-landscape.png', pageId: 'library', orientation: 'landscape' },
  { name: '13-profile-portrait.png', pageId: 'profile', orientation: 'portrait' },
  { name: '13-profile-landscape.png', pageId: 'profile', orientation: 'landscape' },
  { name: '14-search-portrait.png', pageId: 'search', orientation: 'portrait' },
  { name: '14-search-landscape.png', pageId: 'search', orientation: 'landscape' },
  { name: '15-member-library-portrait.png', pageId: 'member-library', orientation: 'portrait' },
  { name: '15-member-library-landscape.png', pageId: 'member-library', orientation: 'landscape' },
  { name: '16-order-detail-portrait.png', pageId: 'order-detail', orientation: 'portrait', sensitive: true },
  { name: '16-order-detail-landscape.png', pageId: 'order-detail', orientation: 'landscape', sensitive: true },
  { name: '17-payment-success-portrait.png', pageId: 'payment-success', orientation: 'portrait' },
  { name: '17-payment-success-landscape.png', pageId: 'payment-success', orientation: 'landscape' },
  { name: '18-membership-success-portrait.png', pageId: 'membership-success', orientation: 'portrait' },
  { name: '18-membership-success-landscape.png', pageId: 'membership-success', orientation: 'landscape' },
]);

const KNOWN_SECRETS = Object.freeze(['gh_rental_2607', 'G@meHub#8291', '48291']);
const CDKEY_VALUE_PATTERN = /\b(?:[A-Z0-9]{4,6}-){2,4}[A-Z0-9]{4,6}\b/i;

function writeCaptureReport(payload) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

assert(chromePath, 'Local Chrome not found');
assert(fs.existsSync(demoPath), `Demo not found: ${demoPath}`);
assert.equal(shots.length, 36, `Screenshot matrix must contain 36 explicit files, received ${shots.length}`);
assert.equal(new Set(shots.map(({ name }) => name)).size, 36, 'Screenshot filenames must be unique');
assert.equal(Object.keys(PAGE_CONTRACTS).length, 18, 'Page contract matrix must contain 18 page IDs');
for (const pageId of Object.keys(PAGE_CONTRACTS)) {
  const orientations = shots.filter((shot) => shot.pageId === pageId).map(({ orientation }) => orientation).sort();
  assert.deepEqual(orientations, ['landscape', 'portrait'], `${pageId} must have one portrait and one landscape screenshot`);
}
assert(shots.every(({ name, pageId, orientation }) => PAGE_CONTRACTS[pageId]
  && name.endsWith(`-${orientation}.png`)), 'Screenshot name, page ID, or orientation contract is invalid');
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(stagingDir, { recursive: true });

async function openFreshPage(browser) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: 1,
  });
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`);
  });
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
      disabled: Boolean(document.querySelector('[data-action="pay-game-order"]:disabled')),
      primaryCount: document.querySelectorAll('[data-primary-action="true"]').length,
    }));
    assert(result.text.includes('当前套餐已售罄'), 'No-inventory state is missing sold-out copy');
    assert(result.retry && result.disabled, 'No-inventory state must keep retry and disable payment');
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
  const result = await page.evaluate(({ pageId, orientation }) => {
    const demo = window.__appRentalDemo;
    if (typeof demo?.openCaptureState !== 'function') return { apiMissing: true };
    demo.setOrientation(orientation);
    const snapshot = demo.openCaptureState(pageId);
    return {
      apiMissing: false,
      orientation: snapshot?.orientation ?? demo.snapshot().orientation,
      screen: snapshot?.screen ?? demo.snapshot().screen,
    };
  }, shot);
  assert(!result.apiMissing, `${shot.name} requires window.__appRentalDemo.openCaptureState(pageId)`);
}

async function verifyShotState(page, shot) {
  const state = await page.evaluate(() => window.__appRentalDemo.snapshot());
  const contract = PAGE_CONTRACTS[shot.pageId];
  assert.equal(state.orientation, shot.orientation, `${shot.name} orientation mismatch`);
  assert.equal(state.screen, contract.screen, `${shot.name} screen mismatch`);

  const pageMarker = await page.evaluate((pageId) => {
    const rootNode = document.querySelector('#appRentalDemo');
    const markerNode = rootNode?.dataset.pageId === pageId
      ? rootNode
      : rootNode?.querySelector(`[data-page-id="${pageId}"]`);
    return {
      pageId: markerNode?.dataset.pageId || rootNode?.dataset.pageId || null,
      baselineSource: markerNode?.dataset.baselineSource || rootNode?.dataset.baselineSource || null,
      stub: Boolean(rootNode?.querySelector('.stub-panel, .landscape-stub')),
      placeholderCopy: /当前入口已连通|后续补齐|功能页面/.test(rootNode?.innerText || ''),
    };
  }, shot.pageId);
  assert.equal(pageMarker.pageId, shot.pageId, `${shot.name} data-page-id mismatch`);
  assert.equal(pageMarker.baselineSource, contract.baselineSource, `${shot.name} baseline source mismatch`);
  assert.equal(pageMarker.stub, false, `${shot.name} still renders a stub page`);
  assert.equal(pageMarker.placeholderCopy, false, `${shot.name} contains placeholder copy`);

  const device = page.locator('.device');
  await device.waitFor({ state: 'visible' });
  const box = await device.boundingBox();
  const expected = EXPECTED_DIMENSIONS[shot.orientation];
  assert(box, `${shot.name} device has no bounding box`);
  assert.equal(Math.round(box.width), expected.width, `${shot.name} device width mismatch`);
  assert.equal(Math.round(box.height), expected.height, `${shot.name} device height mismatch`);

  if (shot.pageId === 'expiry-15m') {
    assert.equal(state.expiryReminderCount, 1, `${shot.name} reminder count mismatch`);
    assert.equal(await page.locator('.expiry-reminder').count(), 1, `${shot.name} reminder is not visible`);
  }

  if (shot.pageId === 'home') {
    const home = await page.evaluate(() => {
      const rootNode = document.querySelector('#appRentalDemo');
      const cards = [...rootNode.querySelectorAll('.hero-card, .mini-game, .landscape-home-hero, .landscape-home-grid button')];
      return {
        bannerPrice: rootNode.querySelector('.home-rental-price')?.textContent.trim(),
        perCardDisplayCounts: cards.map((node) => node.querySelectorAll('[data-discovery-display]').length),
        clickable: cards.every((node) => node.matches('button, a, [role="button"]')),
      };
    });
    assert.equal(home.bannerPrice, '¥9.9 · 可租号', `${shot.name} home banner rental price mismatch`);
    assert(home.perCardDisplayCounts.every((count) => count <= 1), `${shot.name} renders more than one result on a home card`);
    assert(home.clickable, `${shot.name} contains a non-clickable home game card`);
  }

  if (shot.pageId === 'search') {
    const discovery = await page.evaluate((pageId) => {
      const rootNode = document.querySelector('#appRentalDemo');
      const displays = [...rootNode.querySelectorAll('[data-discovery-display]')];
      const cards = [...rootNode.querySelectorAll('.search-result-card')];
      return {
        texts: displays.map((node) => node.textContent.trim()),
        types: displays.map((node) => node.dataset.discoveryDisplay),
        cardCount: cards.length,
        perCardDisplayCounts: cards.map((node) => node.querySelectorAll('[data-discovery-display]').length),
        inlineActionCount: rootNode.querySelectorAll('.search-result-card [data-primary-action], .search-result-card .primary-action').length,
        clickable: cards.every((node) => node.matches('button, a, [role="button"]')),
        gamesTabSelected: rootNode.querySelector('[data-search-tab="games"]')?.getAttribute('aria-selected'),
      };
    }, shot.pageId);
    assert.equal(discovery.texts.length, 3, `${shot.name} must show exactly three unified discovery results`);
    assert.deepEqual([...new Set(discovery.types)].sort(), ['playable', 'rental-price', 'rented'], `${shot.name} discovery result types mismatch`);
    assert(discovery.texts.includes('已租号') && discovery.texts.includes('可畅玩'), `${shot.name} is missing rented or playable state`);
    assert(discovery.texts.some((text) => /^¥\d+\.\d · 租号$/.test(text)), `${shot.name} is missing a one-decimal rental price`);
    assert(discovery.cardCount > 0 && discovery.perCardDisplayCounts.every((count) => count <= 1), `${shot.name} renders more than one result on a card`);
    assert(discovery.clickable, `${shot.name} contains a non-clickable game card`);
    assert.equal(discovery.gamesTabSelected, 'true', `${shot.name} games tab is not selected`);
    assert.equal(discovery.cardCount, 3, `${shot.name} search result card count mismatch`);
    assert(discovery.perCardDisplayCounts.every((count) => count === 1), `${shot.name} search card must contain exactly one result`);
    assert.equal(discovery.inlineActionCount, 0, `${shot.name} search card still contains an independent action`);
  }

  if (shot.pageId === 'detail') {
    assert.equal(state.scenario, 'not-member-library', `${shot.name} detail scenario must be rentable without an active entitlement`);
    assert.equal(await page.locator('[data-entitlement-panel]').count(), 0, `${shot.name} detail must not render a SKU panel`);
    assert.equal(state.order, null, `${shot.name} detail capture must not create an order`);
    assert((await device.innerText()).includes('租号开玩'), `${shot.name} detail is missing the rental entry`);
  }

  if (shot.pageId === 'checkout') {
    const checkoutText = await device.innerText();
    assert.equal(state.selectedSku, 'hourly-8h', `${shot.name} checkout SKU must be fixed to 8 hours`);
    assert.equal(state.selectedHours, 8, `${shot.name} checkout selected hours mismatch`);
    assert.equal(state.order?.durationLabel, '8小时', `${shot.name} checkout order duration mismatch`);
    assert.equal(await page.locator('[data-sale-mode="time-rental"]').count(), 1, `${shot.name} checkout sale mode mismatch`);
    assert.equal(await page.locator('[data-sku-kind="time-rental"]').count(), 4, `${shot.name} time-rental SKU count mismatch`);
    for (const label of ['游戏', '版本', '租赁套餐', '租期', '原价', '实付', '支付方式', '协议', '退款', '支付有效期']) {
      assert(checkoutText.includes(label), `${shot.name} checkout is missing ${label}`);
    }
  }

  if (shot.pageId === 'membership') {
    assert.equal(await page.locator('.membership-benefit-item').count(), 4, `${shot.name} membership benefit count mismatch`);
    assert.equal(await page.locator('.membership-preview .member-game-card').count(), 8, `${shot.name} membership preview count mismatch`);
    assert.equal((await page.locator('.membership-plan-card[data-plan="permanent"] .plan-recommend').innerText()).trim(), '推荐 · 长期有效', `${shot.name} permanent recommendation mismatch`);
    assert.equal(await page.locator('.membership-plan-card[data-plan="permanent"].selected').count(), 1, `${shot.name} permanent plan must be selected by default`);
  }

  if (shot.pageId === 'steam-login') {
    const steamOrder = await page.evaluate(() => {
      const form = document.querySelector('.steam-login-form')?.getBoundingClientRect();
      const qr = document.querySelector('.steam-qr-panel')?.getBoundingClientRect();
      return { formTop: form?.top, formLeft: form?.left, qrTop: qr?.top, qrLeft: qr?.left };
    });
    if (shot.orientation === 'portrait') assert(steamOrder.qrTop < steamOrder.formTop, `${shot.name} QR must be above the account form`);
    else assert(steamOrder.formLeft < steamOrder.qrLeft, `${shot.name} account form must stay left of QR`);
  }

  if (shot.pageId === 'after-sales') {
    const afterSalesLabels = await page.locator('[data-after-sales-type]').allTextContents();
    assert.deepEqual(afterSalesLabels.map((value) => value.trim()), ['启动失败', 'Steam登录失败', '账号异常/频繁掉线', '其他问题'], `${shot.name} after-sales types mismatch`);
    assert(!(await device.innerText()).includes('3天无理由'), `${shot.name} exposes 3-day no-reason as an after-sales type`);
  }

  if (shot.pageId === 'orders') {
    const orderToolbar = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('#appRentalDemo .order-tabs button')];
      const search = document.querySelector('#appRentalDemo .order-search');
      const statuses = [...document.querySelectorAll('#appRentalDemo .order-list-card')].map((node) => node.dataset.status);
      return {
        tabs: tabs.map((node) => node.textContent.trim()),
        searchRightOfUsable: Boolean(search && tabs[2] && search.getBoundingClientRect().left >= tabs[2].getBoundingClientRect().right),
        statusCount: new Set(statuses).size,
      };
    });
    assert.deepEqual(orderToolbar.tabs, ['全部订单', '待支付', '可使用'], `${shot.name} order tabs mismatch`);
    assert(orderToolbar.searchRightOfUsable, `${shot.name} order search is not right of usable tab`);
    assert(orderToolbar.statusCount >= 4, `${shot.name} does not show enough rental order states`);
  }

  const visible = await device.innerText();
  const publicState = JSON.stringify(state);
  for (const secret of KNOWN_SECRETS) {
    assert(!visible.includes(secret), `${shot.name} exposes sensitive value ${secret}`);
  }
  assert(!CDKEY_VALUE_PATTERN.test(visible), `${shot.name} exposes a CDKEY-shaped value`);
  assert(!/(?:cd.?key|redeemCode|activationKey)"\s*:/i.test(publicState), `${shot.name} snapshot contains a CDKEY field`);
  assert(!/CDKEY/i.test(visible), `${shot.name} unexpectedly displays CDKEY content`);
  if (['detail', 'checkout', 'orders', 'order-detail'].includes(shot.pageId)) {
    assert(!/CDKEY|CDK|卡密|激活|发货|收货账号|永久拥有/i.test(visible), `${shot.name} contains forbidden CDKEY business copy`);
  }

  if (['orders', 'order-detail'].includes(shot.pageId)) {
    const orderSafety = await page.evaluate(() => {
      const demo = window.__appRentalDemo;
      const orders = typeof demo.getOrderCollection === 'function' ? demo.getOrderCollection() : (demo.snapshot().orders || []);
      const cardText = [...document.querySelectorAll('.order-list-card')].map((node) => node.innerText).join('\n');
      return {
        purchaseFixture: orders.some(({ orderType }) => orderType && orderType !== 'rental'),
        typeLabel: /游戏购买|租号畅玩|CDKEY/i.test(cardText),
      };
    });
    assert.equal(orderSafety.purchaseFixture, false, `${shot.name} contains a purchase/CDKEY fixture`);
    assert.equal(orderSafety.typeLabel, false, `${shot.name} contains a forbidden order type label`);
  }

  if (shot.sensitive) {
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
  const byteDiversity = new Set(buffer.subarray(24, Math.min(buffer.length, 64 * 1024))).size;
  assert(byteDiversity >= 64, `${shot.name} PNG appears blank or corrupt (byte diversity ${byteDiversity})`);
  return { bytes: buffer.length, width, height, byteDiversity };
}

async function captureShots(browser) {
  const results = [];
  for (const shot of shots) {
    try {
      await withFreshPage(browser, shot.name, async (page) => {
        await setShotState(page, shot);
        await waitForAssets(page);
        await verifyShotState(page, shot);
        const stagingPath = path.join(stagingDir, shot.name);
        await page.locator('.device').screenshot({
          path: stagingPath,
          animations: 'disabled',
        });
        const png = verifyPng(stagingPath, shot);
        results.push({ ...shot, status: 'pass', ...png, stagingPath: path.relative(root, stagingPath) });
        process.stdout.write(`CAPTURED ${shot.name} ${png.bytes} bytes\n`);
      });
    } catch (error) {
      results.push({ ...shot, status: 'fail', message: error.message });
      writeCaptureReport({
        generatedAt: new Date().toISOString(),
        demo: path.relative(root, demoPath),
        outputDir: path.relative(root, outputDir),
        stagingDir: path.relative(root, stagingDir),
        expected: shots.length,
        passed: results.filter(({ status }) => status === 'pass').length,
        failed: results.filter(({ status }) => status === 'fail').length,
        published: false,
        results,
      });
      throw new Error(`${shot.name} capture failed: ${error.message}; evidence: ${reportPath}`);
    }
  }

  assert.equal(results.length, shots.length, `Capture count mismatch: ${results.length}/${shots.length}`);
  assert(results.every(({ status }) => status === 'pass'), 'At least one staged screenshot failed validation');

  for (const shot of shots) {
    const stagingPath = path.join(stagingDir, shot.name);
    const outputPath = path.join(outputDir, shot.name);
    fs.copyFileSync(stagingPath, outputPath);
    verifyPng(outputPath, shot);
  }

  const publishedNames = fs.readdirSync(outputDir)
    .filter((name) => shots.some((shot) => shot.name === name))
    .sort();
  assert.deepEqual(publishedNames, shots.map(({ name }) => name).sort(), 'Published PRD screenshot set is incomplete');
  writeCaptureReport({
    generatedAt: new Date().toISOString(),
    demo: path.relative(root, demoPath),
    outputDir: path.relative(root, outputDir),
    stagingDir: path.relative(root, stagingDir),
    expected: shots.length,
    passed: results.length,
    failed: 0,
    published: true,
    results,
  });
  process.stdout.write(`CAPTURE ${results.length}/${shots.length} PASS\n`);
  process.stdout.write(`CAPTURE_REPORT ${reportPath}\n`);
}

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  await runPreflight(browser);
  await captureShots(browser);
} finally {
  await browser.close();
}

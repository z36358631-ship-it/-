import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const sha = process.argv[2];
assert.match(sha ?? '', /^[0-9a-f]{40}$/, 'usage: node tools/verify-publisher-plan-public-preview.mjs <40-char-sha>');

const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].find(fs.existsSync);
assert(chrome, 'Local Chrome not found');

const preview = file => `https://htmlpreview.github.io/?https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@${sha}/demos/Mod%E4%B8%8E%E5%8F%91%E8%A1%8C%E4%BA%BA/${file}`;
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const errors = [];
const failedResponses = [];

const track = (page, label) => {
  page.on('pageerror', error => errors.push(`${label} pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      errors.push(`${label} console: ${message.text()}`);
    }
  });
  page.on('response', response => {
    if (response.status() >= 400) failedResponses.push(`${label} HTTP ${response.status()}: ${response.url()}`);
  });
};

try {
  const c = await browser.newPage({ viewport: { width: 520, height: 980 } });
  track(c, 'C');
  await c.goto(preview('%E5%8F%91%E8%A1%8C%E4%BA%BA%E8%AE%A1%E5%88%92demo.html'), { waitUntil: 'networkidle', timeout: 60_000 });
  await c.getByText('钱包', { exact: true }).click();
  await c.locator('#view-earnings.active').waitFor({ state: 'visible' });
  await c.getByText('兑换商城', { exact: true }).first().click();
  await c.locator('#view-card-store.active').waitFor({ state: 'visible' });
  const redeemBeforeIdentity = await c.evaluate(() => ({ total: wallet.totalBalance, redeemable: wallet.redeemableBalance, orders: cardOrders.length }));
  await c.evaluate(() => { identityState.realNameVerified = false; });
  await c.getByRole('button', { name: /京东E卡 20元/ }).click();
  assert.equal(await c.locator('#modal-title').innerText(), '完成实名认证');
  assert.equal(await c.locator('#modal-content').innerText(), '兑换前需要先完成实名认证。');
  await c.locator('#modal-confirm').click();
  assert.equal(await c.locator('#card-redeem-modal').getAttribute('aria-hidden'), 'false');
  assert.deepEqual(await c.evaluate(() => ({ total: wallet.totalBalance, redeemable: wallet.redeemableBalance, orders: cardOrders.length })), redeemBeforeIdentity);
  await c.evaluate(() => closeCardRedeem());

  await c.evaluate(() => {
    showView('plaza');
    identityState.realNameVerified = false;
  });
  await c.locator('.fab').click();
  assert.equal(await c.locator('#modal-title').innerText(), '完成实名认证');
  assert.equal(await c.locator('#modal-content').innerText(), '发布任务前需要先完成实名认证。');
  await c.locator('#modal-confirm').click();
  await c.locator('#view-create.active').waitFor({ state: 'visible' });

  await c.evaluate(() => {
    wallet.totalBalance = 50000;
    wallet.rechargeBalance = 50000;
    wallet.redeemableBalance = 0;
    selectGame(1);
  });
  await c.locator('#cr-name').fill('公网机审自动发布测试');
  await c.locator('#cr-price').fill('2');
  await c.locator('#cr-max').fill('10000');
  await c.locator('#cr-pool').fill('10000');
  await c.locator('#cr-submit-deadline').fill('2026-09-25T23:59');
  await c.locator('#cr-like-deadline').fill('2026-09-28T23:59');
  assert.equal(await c.locator('#submit-task-btn').innerText(), '提交');
  await c.locator('#submit-task-btn').click();
  await c.waitForTimeout(700);
  assert.equal(await c.evaluate(() => myPublished[0].status), '进行中');

  await c.evaluate(() => {
    currentTask = tasks[0];
    showView('submit');
  });
  await c.locator('#video-link').fill('https://www.douyin.com/video/public-valid-001');
  await c.getByRole('button', { name: '提交投稿' }).click();
  assert.equal(await c.getByText('数据校验通过，待人工结算', { exact: false }).count() > 0, true);

  const b = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  track(b, 'B');
  await b.goto(preview('%E5%8F%91%E8%A1%8C%E4%BA%BA%E8%AE%A1%E5%88%92-%E5%90%8E%E5%8F%B0demo.html'), { waitUntil: 'networkidle', timeout: 60_000 });

  await b.evaluate(() => switchPage('audit-task'));
  assert.equal(await b.getByText('任务机器审核记录', { exact: true }).count(), 1);
  assert.equal(await b.getByRole('button', { name: '通过', exact: true }).count(), 0);

  await b.evaluate(() => switchPage('audit-video'));
  assert.equal(await b.getByText('数据校验通过，待人工结算', { exact: false }).count() > 0, true);

  await b.evaluate(() => switchPage('settlement'));
  assert.equal(await b.locator('input[data-settlement-amount]').count(), 0);
  const beforeSettlement = await b.evaluate(() => settlementBatches[0].status);
  await b.evaluate(() => settleBatch('BATCH20260911001'));
  const afterFirstSettlement = await b.evaluate(() => settlementBatches[0].status);
  await b.evaluate(() => settleBatch('BATCH20260911001'));
  const afterSecondSettlement = await b.evaluate(() => settlementBatches[0].status);
  assert.deepEqual([beforeSettlement, afterFirstSettlement, afterSecondSettlement], ['待人工结算', '已结算', '已结算']);

  await b.evaluate(() => switchPage('dashboard'));
  await b.getByRole('button', { name: '设置', exact: true }).click();
  await b.locator('#publisher-rollout-percent').selectOption('50');
  await b.getByRole('button', { name: '保存设置' }).click();
  assert.equal(await b.getByText('已开启 · 50%', { exact: true }).count(), 1);

  await b.getByText('京东卡管理', { exact: true }).click();
  await b.getByText('京东电子卡商品', { exact: true }).waitFor({ state: 'visible' });
  await b.getByText('兑换订单', { exact: true }).first().click();
  assert.equal(await b.locator('#page-title').innerText(), '兑换订单');

  assert.deepEqual([...errors, ...failedResponses], []);
  console.log(`PASS: publisher public previews are interactive at ${sha}`);
} finally {
  await browser.close();
}

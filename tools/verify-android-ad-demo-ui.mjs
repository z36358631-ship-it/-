import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'demos', 'Android广告接入-交互标注版.html');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);
assert(executablePath, 'Local Chrome not found');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(pathToFileURL(file).href);
await page.waitForSelector('.device');

async function text(selector) { return (await page.locator(selector).innerText()).trim(); }

async function o1() {
  assert.equal(await page.locator('[data-o1-step="logo"]').count(), 1);
  await page.click('[data-action="o1-next"]');
  assert.equal(await page.locator('[data-o1-step="ad"]').count(), 1);
  await page.click('[data-action="o1-next"]');
  assert.equal(await page.locator('[data-o1-step="destination"]').count(), 1);
  await page.click('[data-orientation="landscape"]');
  const box = await page.locator('.device.landscape').boundingBox();
  assert(box.width > box.height, 'O1 landscape ratio invalid');
  console.log('PASS o1Flow');
}

async function rewardFlows() {
  await page.click('[data-page="C1"]');
  await page.click('[data-action="c1-checkin"]');
  assert((await text('[data-checkin-state]')).includes('+60 分钟'));
  await page.click('[data-action="c1-watch"]');
  await page.click('[data-action="c1-ad-complete"]');
  assert((await text('.dialog')).includes('+120 分钟'));

  await page.click('[data-page="G1"]');
  await page.click('[data-action="g1-watch"]');
  await page.click('[data-action="g1-complete"]');
  assert((await text('.dialog')).includes('5 分钟已到账'));

  await page.click('[data-page="Q1"]');
  await page.click('[data-action="q1-watch"]');
  await page.click('[data-action="q1-complete"]');
  assert((await text('.queue-action')).includes('加速成功'));
  console.log('PASS rewardFlows');
}

async function l1() {
  await page.click('[data-page="L1"]');
  const before = await page.locator('[data-placement="L1"]').evaluate(el => ({ request: el.dataset.requestId, creative: el.dataset.creativeId }));
  await page.click('[data-l1-stage="client"]');
  const after = await page.locator('[data-placement="L1"]').evaluate(el => ({ request: el.dataset.requestId, creative: el.dataset.creativeId }));
  assert.deepEqual(after, before, 'L1 identity changed across stages');
  const ad = await page.locator('[data-placement="L1"]').boundingBox();
  const protectedBoxes = await page.locator('[data-protected]').evaluateAll(nodes => nodes.map(n => { const r=n.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}; }));
  const overlap = protectedBoxes.some(b => ad.x < b.right && ad.x + ad.width > b.left && ad.y < b.bottom && ad.y + ad.height > b.top);
  assert.equal(overlap, false, 'L1 overlaps a protected zone');
  await page.click('[data-action="l1-hide"]');
  assert.equal(await page.locator('[data-placement="L1"]').count(), 0);
  console.log('PASS l1Safety');
}

async function admin() {
  await page.click('[data-surface="admin"]');
  assert.equal(await text('#adminProductName'), '盖世游戏运营后台');
  assert.equal(await page.locator('#adminRegionTabs button').count(), 2);
  const initial = await page.locator('#deliveryTable tbody tr').count();
  await page.click('[data-crud="create"][data-kind="delivery"]');
  await page.fill('#drawerName', '自动验收投放配置');
  await page.selectOption('#drawerPlacement', 'H1');
  await page.click('[data-action="drawer-save"]');
  assert.equal(await page.locator('#deliveryTable tbody tr').count(), initial + 1);
  await page.click('[data-admin-nav="experiment"]');
  assert(await page.locator('#experimentTable tbody tr').count() >= 3);
  await page.click('[data-region="overseas"]');
  assert((await text('#adminRegionTabs')).includes('海外'));
  await page.click('[data-admin-nav="report"]');
  assert((await text('.admin-main')).includes('次日留存变化'));
  console.log('PASS adminCrud');
}

try {
  await o1();
  await rewardFlows();
  await l1();
  await admin();
  assert.deepEqual(errors, [], `Page errors: ${errors.join(' | ')}`);
  console.log('PASS browserRuntime');
} finally {
  await browser.close();
}

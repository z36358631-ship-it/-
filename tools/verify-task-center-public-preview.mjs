import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const sha = process.argv[2];
assert.match(sha ?? '', /^[0-9a-f]{40}$/, 'usage: node tools/verify-task-center-public-preview.mjs <40-char-sha>');

const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find(fs.existsSync);
assert(chrome, 'Local Chromium-compatible browser not found');

const preview = (file) => `https://htmlpreview.github.io/?https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@${sha}/demos/${file}`;
const cUrl = preview('%E4%BB%BB%E5%8A%A1%E4%B8%AD%E5%BF%83demo.html');
const bUrl = preview('%E4%BB%BB%E5%8A%A1%E4%B8%AD%E5%BF%83%E5%90%8E%E5%8F%B0demo.html');
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const errors = [];
const failedResponses = [];

function track(page, label) {
  page.on('pageerror', (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      errors.push(`${label} console: ${message.text()}`);
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push(`${label} HTTP ${response.status()}: ${response.url()}`);
  });
}

try {
  const c = await browser.newPage({ viewport: { width: 560, height: 980 } });
  track(c, 'C');
  await c.goto(cUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await c.locator('[data-view="tasks"].is-active').waitFor({ state: 'visible' });
  await c.locator('[data-action="open-store"]').click();
  await c.locator('[data-view="store"].is-active').waitFor({ state: 'visible' });
  await c.locator('[data-product-id="cloud-30"] [data-action="open-product"]').click();
  await c.locator('[data-dialog="redeem"].is-open').waitFor({ state: 'visible' });

  const b = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  track(b, 'B');
  await b.goto(bUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await b.locator('#page-task.active').waitFor({ state: 'visible' });
  await b.locator('.menu-item').nth(1).click();
  await b.locator('#page-reward.active').waitFor({ state: 'visible' });
  assert((await b.locator('#page-reward').innerText()).includes('兑换价格'), '奖品配置页未显示兑换价格');
  await b.locator('.menu-item').nth(2).click();
  await b.locator('#page-order.active').waitFor({ state: 'visible' });
  assert((await b.locator('#page-order').innerText()).includes('消耗盖世积分'), '兑换与发货页未显示盖世积分口径');

  assert.deepEqual([...errors, ...failedResponses], []);
  console.log(JSON.stringify({ status: 'PASS', sha, cUrl, bUrl }));
} finally {
  await browser.close();
}

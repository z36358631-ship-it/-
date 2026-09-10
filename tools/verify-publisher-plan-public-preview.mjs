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

  const b = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  track(b, 'B');
  await b.goto(preview('%E5%8F%91%E8%A1%8C%E4%BA%BA%E8%AE%A1%E5%88%92-%E5%90%8E%E5%8F%B0demo.html'), { waitUntil: 'networkidle', timeout: 60_000 });
  await b.getByText('京东卡管理', { exact: true }).click();
  await b.getByText('京东电子卡商品', { exact: true }).waitFor({ state: 'visible' });
  await b.getByText('兑换订单', { exact: true }).first().click();
  assert.equal(await b.locator('#page-title').innerText(), '兑换订单');

  assert.deepEqual([...errors, ...failedResponses], []);
  console.log(`PASS: publisher public previews are interactive at ${sha}`);
} finally {
  await browser.close();
}

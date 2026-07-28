import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'demos', '充值与商城', '云存档付费demo.html');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);
assert(executablePath, 'Local Chrome not found');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
await page.goto(pathToFileURL(file).href);
await page.waitForSelector('#app');

assert.equal(await page.locator('#packageSlot').count(), 0, '存档广场仍保留顶部套餐卡容器');
assert.equal((await page.locator('#sec-plaza .sc-btn').first().innerText()).trim(), '购买');
assert.deepEqual(
  await page.locator('#sec-plaza .sc-btn').allInnerTexts(),
  ['购买', '购买', '购买', '购买', '购买'],
  '无权益卡片未统一收敛为“购买”',
);

await page.locator('#sec-plaza .sc-btn').first().click();
await page.waitForSelector('#checkoutLayer.show');
assert.equal(await page.locator('#paymentLayer.show').count(), 0, '确认支付前提前拉起了支付层');
assert.equal(await page.locator('[data-checkout-plan="single"].selected').count(), 1, '普通购买未默认选择 ¥6');
assert.equal(await page.locator('[data-checkout-plan="monthly"]').count(), 1, '缺少 ¥18 月套餐');
assert.equal(await page.locator('[data-checkout-payment="alipay"]').count(), 1, '缺少支付宝');
assert.equal(await page.locator('[data-checkout-payment="wechat"]').count(), 1, '缺少微信支付');
assert((await page.locator('[data-action="checkout-confirm"]').innerText()).includes('¥6'));

await page.locator('[data-checkout-plan="monthly"]').click();
assert.equal(await page.locator('[data-checkout-plan="monthly"].selected').count(), 1);
assert((await page.locator('[data-action="checkout-confirm"]').innerText()).includes('¥18'));
await page.locator('[data-checkout-payment="wechat"]').click();
await page.locator('[data-action="checkout-confirm"]').click();
await page.waitForSelector('#paymentLayer.show');
assert((await page.locator('#paymentLayer').innerText()).includes('微信支付'));
assert((await page.locator('#paymentLayer').innerText()).includes('¥18'));

await page.locator('[data-action="payment-cancel"]').click();
assert.equal(await page.locator('#paymentLayer.show').count(), 0);
assert.equal(await page.locator('#checkoutLayer.show').count(), 1, '取消支付后未返回订单确认页');
assert.equal(await page.locator('[data-checkout-plan="monthly"].selected').count(), 1, '取消支付后方案丢失');

await page.locator('[data-action="checkout-confirm"]').click();
await page.locator('[data-action="payment-success"]').click();
assert.equal(await page.locator('#checkoutLayer.show').count(), 0);
assert.equal(await page.locator('#paymentLayer.show').count(), 0);

await page.locator('.stab').nth(1).click();
assert.equal(await page.locator('#sec-mine .status-card').count(), 0, '我的存档仍显示顶部套餐卡');
assert.equal(await page.locator('#sec-mine').getByText(/月度套餐有效至/).count(), 1, '未显示套餐有效期');
assert.equal(await page.locator('#sec-mine').getByText(/已获得存档/).count(), 1, '未合并存档分区');
assert.equal(await page.locator('#sec-mine').getByText(/月包存档/).count(), 0);
assert.equal(await page.locator('#sec-mine').getByText(/已购存档/).count(), 0);

await page.evaluate(() => window.CloudSaveDemo.setDemoState('expired'));
assert.equal(await page.locator('#sec-mine').getByText(/月度套餐已于/).count(), 1);
assert.equal(await page.locator('#sec-mine').getByText('续费后使用').count() > 0, true);

await page.evaluate(() => window.CloudSaveDemo.setDemoState('none'));
await page.evaluate(() => window.CloudSaveDemo.openCheckout(0, { preferredPlan: 'single', source: 'test' }));
assert.equal((await page.evaluate(() => window.CloudSaveDemo.getCheckoutState())).plan, 'single');
await page.locator('[data-action="checkout-confirm"]').click();
await page.locator('[data-action="payment-success"]').click();
assert.equal(await page.locator('#sec-mine').getByText('永久拥有', { exact: true }).count(), 1, '¥6 支付成功后未发放永久权益');

await page.getByRole('button', { name: /游戏中模式/ }).click();
assert.equal((await page.locator('#igBody').innerText()).includes('¥6'), false, '游戏中面板仍显示 ¥6 独立入口');
assert.equal((await page.locator('#igBody').innerText()).includes('¥18'), false, '游戏中面板仍显示 ¥18 独立入口');
await page.locator('#igBody').getByRole('button', { name: '购买', exact: true }).first().click();
assert.equal((await page.evaluate(() => window.CloudSaveDemo.getCheckoutState())).source, 'ingame-plaza');
assert.equal(await page.locator('[data-checkout-plan="single"].selected').count(), 1, '游戏中普通购买未默认选择 ¥6');
await page.getByRole('button', { name: '关闭订单' }).click();

assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join(' | ')}`);
await browser.close();
console.log('PASS cloud save checkout');

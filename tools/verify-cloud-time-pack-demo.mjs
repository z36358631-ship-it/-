import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const demo = path.join(root, 'demos', '云游戏', '云游戏时段次卡与限时套餐demo.html');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe');

if (!fs.existsSync(demo)) throw new Error(`Demo不存在：${demo}`);
if (!fs.existsSync(executablePath)) throw new Error(`浏览器不存在：${executablePath}`);

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push(err.message));
await page.goto(pathToFileURL(demo).href, { waitUntil: 'load' });

const expectedScenes = ['c-recharge','c-activation','c-detail','c-reminder','c-landscape-recharge','c-landscape-activation','b-list','b-slot','b-limited','b-deduct'];
const sceneCount = await page.locator('.scene').count();
const buttonCount = await page.locator('.scene-btn').count();
if (sceneCount !== expectedScenes.length || buttonCount !== expectedScenes.length) throw new Error(`场景数量异常：scene=${sceneCount}, button=${buttonCount}`);

for (const scene of expectedScenes) {
  await page.evaluate(name => window.showScene(name), scene);
  if (!await page.locator(`#scene-${scene}`).isVisible()) throw new Error(`场景不可见：${scene}`);
}

await page.evaluate(() => window.showScene('c-recharge'));
await page.locator('#portraitSlotSku').click();
await page.locator('.v611-buy').click();
if (!((await page.locator('#rechargeToast').textContent()) || '').includes('支付成功')) throw new Error('竖版购买反馈异常');

await page.evaluate(() => window.showScene('c-activation'));
await page.locator('#activationMask .confirm-btn').click();
if (await page.locator('#activationMask').isVisible()) throw new Error('竖版次卡激活弹窗未关闭');
if (await page.locator('#activationRemaining').textContent() !== '4/5次') throw new Error('竖版次卡未扣减次数');
await page.locator('.portrait-play-hotspot').click();
if (await page.locator('#activationMask').isVisible()) throw new Error('竖版同一时段重复弹出激活确认');

await page.evaluate(() => window.showScene('c-reminder'));
await page.locator('.reminder-controls button').nth(3).click();
if (!((await page.locator('#reminderSub').textContent()) || '').includes('可用时长不足')) throw new Error('无其他时长分支异常');

await page.evaluate(() => window.showScene('c-landscape-recharge'));
await page.locator('.landscape-sku[data-price="18.00"]').click();
if (await page.locator('.landscape-pay').textContent() !== '确认支付 ¥18.00') throw new Error('掌机套餐选择未更新金额');
await page.locator('.landscape-close').click();
if (await page.locator('#landscapeRechargeMask').isVisible()) throw new Error('掌机充值弹窗未关闭');
if (!await page.locator('#scene-c-landscape-recharge').isVisible()) throw new Error('关闭掌机充值弹窗后错误跳转页面');

await page.evaluate(() => window.showScene('c-landscape-activation'));
await page.locator('#landscapeActivationMask .confirm-btn').click();
if (await page.locator('#landscapeActivationRemaining').textContent() !== '4/5次') throw new Error('掌机次卡未扣减次数');
await page.locator('.landscape-play-hotspot').click();
if (await page.locator('#landscapeActivationMask').isVisible()) throw new Error('掌机同一时段重复弹出激活确认');

await page.evaluate(() => window.showScene('b-slot'));
await page.locator('[data-week-group="weekend"]').click();
if (!await page.locator('[data-week-group="weekend"]').evaluate(el => el.classList.contains('active'))) throw new Error('周末快捷选择未同步选中态');
if (!await page.locator('[data-week-day="6"]').evaluate(el => el.classList.contains('active')) || !await page.locator('[data-week-day="7"]').evaluate(el => el.classList.contains('active'))) throw new Error('周末快捷选择未联动周六、周日');
await page.evaluate(() => window.openQueueConfig());
if (await page.locator('#slotProductType').inputValue() !== '普通时长包') throw new Error('普通时长包编辑模式未切换');
if (!await page.locator('#queueDaysField').isVisible()) throw new Error('排队特权配置未显示');
if (await page.locator('.slot-rule').first().isVisible()) throw new Error('普通时长包错误显示次卡字段');

await page.evaluate(() => window.showScene('b-deduct'));
if (await page.locator('#legacyPermanentCurrent').inputValue() !== '57小时8分') throw new Error('原永久时长展示未保留');
if (await page.locator('#legacyLimitedCurrent').inputValue() !== '20小时12分') throw new Error('限时时长展示未新增');
if (await page.locator('#relationNo').count() || await page.getByText('关联订单号').count()) throw new Error('用户时长扣除不应要求订单号');
await page.locator('#legacyLimitedDeduct').fill('30');
await page.locator('.legacy-confirm').click();
if (!await page.locator('#legacyDeductError').isVisible()) throw new Error('限时时长扣除上限校验未触发');
await page.locator('#legacyPermanentDeduct').fill('1');
await page.locator('#legacyLimitedDeduct').fill('2');
await page.locator('.legacy-confirm').click();
if (await page.locator('#legacyPermanentCurrent').inputValue() !== '56小时8分') throw new Error('永久时长扣除能力回归异常');
if (await page.locator('#legacyLimitedCurrent').inputValue() !== '18小时12分') throw new Error('限时时长扣除能力异常');

await page.evaluate(() => window.showScene('c-detail'));
const phoneBox = await page.locator('#capture-c-detail').boundingBox();
await page.evaluate(() => window.showScene('c-landscape-recharge'));
const landscapeBox = await page.locator('#capture-c-landscape-recharge').boundingBox();
await page.evaluate(() => window.showScene('b-list'));
const adminBox = await page.locator('#capture-b-list').boundingBox();
if (!phoneBox || Math.round(phoneBox.width) !== 390 || Math.round(phoneBox.height) !== 867) throw new Error(`竖版容器尺寸异常：${JSON.stringify(phoneBox)}`);
if (!landscapeBox || Math.round(landscapeBox.width) !== 874 || Math.round(landscapeBox.height) !== 393) throw new Error(`掌机容器尺寸异常：${JSON.stringify(landscapeBox)}`);
if (!adminBox || Math.round(adminBox.width) !== 1366 || Math.round(adminBox.height) !== 768) throw new Error(`后台容器尺寸异常：${JSON.stringify(adminBox)}`);
if (errors.length) throw new Error(`控制台错误：${errors.join(' | ')}`);

await browser.close();
console.log(JSON.stringify({ ok: true, scenes: sceneCount, interactions: 10, consoleErrors: 0, portrait: '390x867', landscape: '874x393', admin: '1366x768' }, null, 2));

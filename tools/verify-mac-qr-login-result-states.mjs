import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = process.cwd();
const assetDir = path.join(
  root,
  'prd',
  '【Prd】《盖世游戏》移动端扫码登录Mac端需求',
  '图片和附件',
);
const demoPath = path.join(assetDir, '扫码登录Mac端交互标注版demo.html');
const html = fs.readFileSync(demoPath, 'utf8');

assert(!html.includes('id="accountView"'), '成功弹窗 DOM 必须删除');
assert(!html.includes('id="successCloseBtn"'), '成功弹窗关闭按钮必须删除');
assert(!html.includes('qrShell.addEventListener'), '二维码容器不能承担刷新交互');
assert(html.includes('id="qrOverlayTitle"'), '二维码遮罩必须有唯一状态文案');
assert.equal((html.match(/id="refreshQrBtn"/g) || []).length, 1, '刷新按钮必须唯一');

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(fs.existsSync);

assert(executablePath, '未找到本地 Chrome 或 Edge');

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({
  viewport: { width: 1680, height: 1100 },
  deviceScaleFactor: 1,
});
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__qrLoginDemo));

  const select = async (scenario) => {
    await page.locator(`.state-nav[data-scenario="${scenario}"]`).click();
    await page.waitForTimeout(80);
    assert(
      await page
        .locator(`.state-nav[data-scenario="${scenario}"]`)
        .evaluate((element) => element.classList.contains('active')),
      `${scenario} 状态未激活`,
    );
  };

  const toastIsVisible = () => page.locator('#toast').evaluate((element) => element.classList.contains('show'));

  for (const scenario of [
    'wait',
    'scanning',
    'permissionDenied',
    'confirm',
    'authorizing',
    'readyToClaim',
    'success',
    'authorizationFailed',
    'expired',
    'cancelled',
  ]) {
    await select(scenario);
  }

  await select('wait');
  await page.waitForTimeout(2100);
  await select('readyToClaim');
  assert(await page.locator('#resultPage').evaluate((element) => element.classList.contains('show')));
  assert.equal(await toastIsVisible(), false, 'ready_to_claim 不得显示成功 Toast');
  assert.equal(
    await page.locator('#macReturnView').evaluate((element) => element.classList.contains('show')),
    false,
    'ready_to_claim 不得提前进入 Mac 返回页',
  );

  await select('success');
  assert(await page.locator('#minePage').evaluate((element) => element.classList.contains('show')));
  assert.equal(await page.locator('#toast').textContent(), 'Mac端登录成功');
  assert.equal(await toastIsVisible(), true);
  assert.equal(
    await page.locator('#toast').evaluate((element) => element.closest('.phone') !== null),
    true,
    'Toast 必须位于移动端容器内',
  );
  assert(await page.locator('#macReturnView').evaluate((element) => element.classList.contains('show')));
  assert.equal(await page.locator('#loginSurface:visible').count(), 0, 'Mac 成功后不得保留登录界面');
  assert.equal(await page.locator('[role="dialog"]:visible').count(), 0, 'Mac 成功态不得展示弹窗');
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    'macReturnView',
    'Mac 成功后应恢复主要内容焦点',
  );
  const successToastCount = await page.evaluate(() => window.__qrLoginDemo.getNotifiedResultCount());
  await page.evaluate(() => window.__qrLoginDemo.setScenario('success'));
  assert.equal(
    await page.evaluate(() => window.__qrLoginDemo.getNotifiedResultCount()),
    successToastCount,
    '同一请求的成功 Toast 必须去重',
  );
  await page.locator('.phone').screenshot({ path: path.join(assetDir, 'image 8.png') });
  await page.locator('#macReturnView').screenshot({ path: path.join(assetDir, 'image 6.png') });
  await page.waitForTimeout(2100);
  assert.equal(await toastIsVisible(), false, '结果 Toast 必须在 2 秒后自动消失');

  const invalidStates = [
    ['authorizationFailed', '登录未完成，请重新扫码', '登录未完成'],
    ['expired', '二维码已过期，请重新扫码', '二维码已过期'],
    ['cancelled', '登录已取消，请重新扫码', '登录已取消'],
  ];

  for (const [scenario, mobileMessage, macMessage] of invalidStates) {
    await select(scenario);
    assert(await page.locator('#minePage').evaluate((element) => element.classList.contains('show')));
    assert.equal(await page.locator('#toast').textContent(), mobileMessage);
    assert.equal(await page.locator('#qrOverlayTitle').textContent(), macMessage);
    assert.equal(await page.locator('#macTitle').textContent(), '扫码登录');
    assert.equal(await page.locator('#refreshQrBtn:visible').count(), 1);
    assert.equal(
      await page.locator('#refreshQrBtn').evaluate((element) => element.parentElement?.id),
      'qrOverlay',
      '刷新按钮必须位于二维码遮罩内',
    );
    assert.equal(await page.locator('.qr-info:visible').count(), 0, '异常态不得在二维码外重复显示状态');
    assert.equal(await page.locator('.security-line:visible').count(), 0, '异常态二维码外不得保留重复说明');
    assert.equal(await page.locator('#qrShell').getAttribute('role'), null);
    assert.equal(await page.locator('#qrShell').getAttribute('tabindex'), null);
    assert.equal(await page.locator('#qrShell').evaluate((element) => element === document.activeElement), false);
  }

  await select('cancelled');
  await page.locator('#loginSurface').screenshot({ path: path.join(assetDir, 'image 3.png') });

  await select('authorizationFailed');
  await page.locator('.stage').screenshot({ path: path.join(assetDir, 'image 10.png') });

  await select('expired');
  await page.locator('.stage').screenshot({ path: path.join(assetDir, 'image 12.png') });

  const challengeBeforeEnter = await page.locator('#qrShell').getAttribute('data-challenge-id');
  await page.locator('#refreshQrBtn').focus();
  await page.keyboard.press('Enter');
  const challengeAfterEnter = await page.locator('#qrShell').getAttribute('data-challenge-id');
  assert.notEqual(challengeAfterEnter, challengeBeforeEnter, 'Enter 必须生成新 challenge');
  assert(await page.locator('.state-nav[data-scenario="wait"]').evaluate((element) => element.classList.contains('active')));

  await select('expired');
  const challengeBeforeSpace = await page.locator('#qrShell').getAttribute('data-challenge-id');
  await page.locator('#refreshQrBtn').focus();
  await page.keyboard.press('Space');
  const challengeAfterSpace = await page.locator('#qrShell').getAttribute('data-challenge-id');
  assert.notEqual(challengeAfterSpace, challengeBeforeSpace, 'Space 必须生成新 challenge');

  assert.deepEqual(pageErrors, [], `页面运行错误：${pageErrors.join('; ')}`);

  console.log('mac qr login result states: PASS');
} finally {
  await browser.close();
}

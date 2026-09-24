import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const demoFile = path.resolve(process.env.PUBLISHER_CHANNEL_DEMO || 'demos/开发者后台一期/开发者平台demo.html');
const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const demoUrl = pathToFileURL(demoFile);
demoUrl.hash = '/P01-01';
let browser;

const approvalButton = page => page.locator('button[data-portal-action="demo-state-toggle"]').first();
const approvalPanel = page => page.locator('[data-demo-state-panel]');
const savedAccount = (page, accountKey) => page.evaluate(key => JSON.parse(localStorage.getItem('gamehub-developer-account-states-v1') || '{}')[key], accountKey);

async function openDemo(page, status) {
  const accountKey = `approval-default:${status || 'fresh'}`;
  await page.addInitScript(({ demoName, accountKey, status }) => {
    if (!decodeURIComponent(location.pathname).endsWith(`/${demoName}`) || sessionStorage.getItem('approval-default-seeded')) return;
    localStorage.clear(); sessionStorage.clear(); window.name = '';
    sessionStorage.setItem('approval-default-seeded', '1');
    localStorage.setItem('gamehub-developer-language-v1', 'zh');
    if (!status) return;
    sessionStorage.setItem('gamehub-developer-session-v2', JSON.stringify({ version: 2, authenticated: true, accountKey, vendorId: 'VENDOR-STAR-001', activeGameId: '', qualificationStatus: status, expiresAt: Date.now() + 28800000 }));
    localStorage.setItem('gamehub-developer-account-states-v1', JSON.stringify({ [accountKey]: {
      registration: { accountTier: status === 'approved' ? 'enterprise' : 'registered', registeredAt: '2026-09-16 09:00', consoleTab: 'games' },
      qualification: { status, revision: 1, step: 5, view: 'form', form: {}, history: [], submissions: [] },
    } }));
  }, { demoName: path.basename(demoFile), accountKey, status });
  await page.goto(demoUrl.href, { waitUntil: 'load' });
  return accountKey;
}

async function showApproval(page) {
  if (!await approvalPanel(page).isVisible()) await approvalButton(page).click();
  await approvalPanel(page).waitFor();
}

async function expectApproved(page) {
  await page.locator('[data-publisher-workspace]').waitFor();
  for (const section of ['channel-supply', 'channel-revenue']) {
    assert.ok(await page.locator(`.publisher-console-sidebar [data-channel-section="${section}"]`).isVisible(), '默认审核通过后两个企业级渠道入口均应可见');
  }
  await showApproval(page);
  assert.equal(await approvalPanel(page).locator('[data-demo-qualification-status="approved"]').getAttribute('aria-checked'), 'true');
  await approvalButton(page).click();
}

async function expectFixedApproval(page) {
  assert.ok(await approvalButton(page).isVisible(), 'Demo 状态按钮应常驻');
  assert.equal(await page.locator('[data-portal-action="demo-approval-toggle"]').count(), 0, '审核状态只能放在 Demo 状态面板内');
  const box = await approvalButton(page).boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box.x > viewport.width / 2 && box.y > viewport.height / 2, 'Demo 状态按钮应位于右下角');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const afterScroll = await approvalButton(page).boundingBox();
  assert.ok(Math.abs(box.y - afterScroll.y) <= 1, '滚动页面后 Demo 状态按钮应保持悬浮位置');
}

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  assert.ok(fs.existsSync(demoFile), '先构建正式 Demo 再运行本测试');
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files', '--disable-background-networking'] });
});
after(async () => browser?.close());

test('P01-01 新账号完成演示登录后默认预览企业审核通过', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await openDemo(page);
    const login = page.locator('[data-portal-action="open-login"]:visible').first();
    if (await login.isVisible()) await login.click();
    const form = page.locator('[data-login-panel]:not([hidden])');
    await form.locator('input[name="loginAccount"]').fill('13900002345');
    await form.locator('input[name="zh-verification-code"]').fill('123456');
    await form.locator('[data-portal-action="login"]').click();
    await expectApproved(page);
    const saved = await savedAccount(page, 'phone:13900002345');
    assert.notEqual(saved?.qualification?.status, 'approved', 'Demo 默认预览不得把真实资格写成已通过');
  } finally { await page.close(); }
});

for (const status of ['unsubmitted', 'pending', 'rejected']) {
  test(`旧账号 ${status} 默认展示通过，切换预览与刷新不改已保存资格`, async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      const accountKey = await openDemo(page, status);
      await expectApproved(page);
      const original = await savedAccount(page, accountKey);
      for (const preview of ['pending', 'rejected', 'approved']) {
        await showApproval(page);
        await approvalPanel(page).locator(`[data-demo-qualification-status="${preview}"]`).click();
        await showApproval(page);
        assert.equal(await approvalPanel(page).locator(`[data-demo-qualification-status="${preview}"]`).getAttribute('aria-checked'), 'true');
        await approvalButton(page).click();
        assert.deepEqual(await savedAccount(page, accountKey), original, '审核预览不应写入账号数据');
      }
      await showApproval(page);
      await approvalPanel(page).locator('[data-demo-qualification-status="rejected"]').click();
      await page.reload({ waitUntil: 'load' });
      await expectApproved(page);
      assert.deepEqual(await savedAccount(page, accountKey), original, '刷新默认通过仍不得修改已保存数据');
    } finally { await page.close(); }
  });
}

test('审核状态在各页面的 Demo 面板内可切换，页面数据切换保留', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await openDemo(page, 'approved');
    await expectApproved(page);
    for (const view of ['games', 'vendor', 'channels']) {
      await page.locator(`[data-publisher-view="${view}"]`).first().click();
      await page.locator(`[data-workspace-view="${view}"]`).waitFor();
      await expectFixedApproval(page);
      await showApproval(page);
      for (const status of ['pending', 'rejected', 'approved']) assert.ok(await approvalPanel(page).locator(`[data-demo-qualification-status="${status}"]`).isVisible());
      await approvalButton(page).click();
      await page.locator('[data-portal-action="demo-state-toggle"]').first().click();
      const panel = page.locator('[data-demo-state-panel]');
      for (const state of ['empty', 'exhaustive']) assert.ok(await panel.locator(`[data-demo-publisher-scenario="${state}"]`).isVisible());
      await panel.locator('[data-demo-publisher-scenario="empty"]').click();
      await expectFixedApproval(page);
      await page.locator('[data-portal-action="demo-state-toggle"]').first().click();
      await page.locator('[data-demo-state-panel] [data-demo-publisher-scenario="exhaustive"]').click();
    }
    await page.locator('[data-publisher-view="games"]').click();
    await page.locator('[data-portal-action="enter-publisher-game"][data-publisher-game="existing"]').first().click();
    await page.locator('[data-publisher-game-console]').waitFor();
    await expectFixedApproval(page);
    if (process.env.DEMO_APPROVAL_EVIDENCE_DIR) {
      const output = path.resolve(process.env.DEMO_APPROVAL_EVIDENCE_DIR);
      fs.mkdirSync(output, { recursive: true });
      await page.screenshot({ path: path.join(output, 'approval-button-game.png'), fullPage: false });
    }
  } finally { await page.close(); }
});

test('可手动恢复真实审核状态，下一次刷新仍默认通过预览', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    const accountKey = await openDemo(page, 'pending');
    await expectApproved(page);
    const original = await savedAccount(page, accountKey);
    await showApproval(page);
    await approvalPanel(page).locator('[data-portal-action="demo-state-reset"]').click();
    await showApproval(page);
    assert.equal(await approvalPanel(page).locator('[data-demo-qualification-status="pending"]').getAttribute('aria-checked'), 'true');
    assert.deepEqual(await savedAccount(page, accountKey), original);
    await page.reload({ waitUntil: 'load' });
    await expectApproved(page);
  } finally { await page.close(); }
});

test('含审核状态的 Demo 浮层在桌面和窄屏完整可见，支持 Escape 关闭', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await openDemo(page, 'pending');
    await expectApproved(page);
    const output = path.resolve(process.env.DEMO_APPROVAL_EVIDENCE_DIR || 'tests/developer-backend/evidence/demo-approval-default');
    fs.mkdirSync(output, { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expectFixedApproval(page);
      await page.screenshot({ path: path.join(output, `approval-button-${width}.png`), fullPage: false });
      await showApproval(page);
      const box = await approvalPanel(page).boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1 && box.y >= 0 && box.y + box.height <= 900, `${width}px 审核面板不得越出可视区域`);
      await page.screenshot({ path: path.join(output, `approval-panel-${width}.png`), fullPage: false });
      await page.keyboard.press('Escape');
      assert.equal(await approvalPanel(page).count(), 0);
    }
  } finally { await page.close(); }
});

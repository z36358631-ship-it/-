import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cDemo = path.join(root, 'demos', 'Mod与发行人', '发行人计划demo.html');
const bDemo = path.join(root, 'demos', 'Mod与发行人', '发行人计划-后台demo.html');
const baselineRoot = path.join(root, '.tmp', 'rental-pages-publish-20260812', 'demos');
const cBaseline = path.join(baselineRoot, '发行人计划demo.html');
const bBaseline = path.join(baselineRoot, '发行人计划-后台demo.html');
const outputDir = path.join(root, 'public', 'prd', 'publisher-plan-v2');
const evidenceDir = path.join(root, 'docs', 'evidence', 'publisher-plan-v2');
const baselineDir = path.join(evidenceDir, 'baseline');
const componentDir = path.join(evidenceDir, 'components');
const evidencePath = path.join(evidenceDir, 'verification.json');

for (const directory of [outputDir, evidenceDir, baselineDir, componentDir]) {
  fs.mkdirSync(directory, { recursive: true });
}

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].find(fs.existsSync);
assert(executablePath, 'Local Chrome not found');
assert(fs.existsSync(cBaseline) && fs.existsSync(bBaseline), 'V1 visual baseline not found');

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--allow-file-access-from-files']
});

const screenshots = [];
const componentEvidence = [];
const pagesToClose = [];

function pngInfo(file) {
  const buffer = fs.readFileSync(file);
  assert(buffer.length > 1000, `${path.basename(file)} is unexpectedly small`);
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${path.basename(file)} is not PNG`);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  assert(width > 0 && height > 0, `${path.basename(file)} has invalid dimensions`);
  return {
    bytes: buffer.length,
    width,
    height,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex')
  };
}

async function openTracked(file, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.setOffline(true);
  const page = await context.newPage();
  const externalRequests = [];
  const pageErrors = [];
  const consoleErrors = [];
  page.on('request', request => {
    if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 60_000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(80);
  pagesToClose.push(context);
  return { page, externalRequests, pageErrors, consoleErrors };
}

async function settle(page) {
  await page.evaluate(() => {
    const activeView = document.querySelector('.view.active');
    if (activeView) activeView.scrollTop = 0;
    const scrollArea = document.querySelector('.page-content');
    if (scrollArea) scrollArea.scrollTop = 0;
  });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(80);
}

async function capture(locator, file, collection, name, title) {
  await locator.waitFor({ state: 'visible' });
  await locator.screenshot({ path: file, animations: 'disabled' });
  const info = pngInfo(file);
  collection.push({
    name,
    title,
    path: path.relative(root, file).replaceAll('\\', '/'),
    ...info
  });
  return info;
}

async function captureC(page, name, title) {
  await settle(page);
  return capture(page.locator('.phone'), path.join(outputDir, `${name}.png`), screenshots, name, title);
}

async function captureB(page, name, title) {
  await settle(page);
  return capture(page.locator('.layout'), path.join(outputDir, `${name}.png`), screenshots, name, title);
}

async function rect(locator) {
  return locator.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
}

try {
  const c = await openTracked(cDemo, { width: 520, height: 980 });
  const page = c.page;
  await page.locator('.phone').waitFor({ state: 'visible' });

  await captureC(page, '01-task-plaza', '找任务');
  await page.evaluate(() => showRules('plaza'));
  await captureC(page, '02-play-rules', '玩法说明');
  assert.equal(await page.getByText('充值获得的盖世币仅可用于发布任务，不可兑换京东卡', { exact: false }).count() > 0, true);

  await page.evaluate(() => openDetail(1));
  await captureC(page, '03-task-detail', '任务详情');
  await page.evaluate(() => showView('mytask'));
  await captureC(page, '04-my-tasks', '做任务');
  await page.evaluate(() => showView('submit'));
  await captureC(page, '05-submit-work', '提交投稿');
  await page.evaluate(() => showView('create'));
  await captureC(page, '06-create-task', '创建发行任务');

  await page.evaluate(() => showView('earnings'));
  assert.equal(await page.locator('#wallet-total').innerText(), '3,650');
  await captureC(page, '07-wallet', '我的钱包');
  await capture(
    page.locator('#view-earnings .header'),
    path.join(componentDir, 'c-topbar-wallet.png'),
    componentEvidence,
    'C-TOPBAR',
    '钱包顶部栏'
  );
  await capture(
    page.locator('#view-earnings .earn-tabs'),
    path.join(componentDir, 'c-tab-wallet.png'),
    componentEvidence,
    'C-TAB',
    '钱包流水 Tab'
  );

  await page.evaluate(() => showView('recharge'));
  await captureC(page, '08-recharge', '充值盖世币');
  assert.equal(await page.getByText('充值所得仅可用于发布任务，不计入兑换余额', { exact: false }).count() > 0, true);

  await page.evaluate(() => showView('card-store'));
  assert.equal(await page.locator('#redeemable-balance').innerText(), '2,650');
  assert.equal(await page.locator('[data-card-id="JD50"]').isDisabled(), true, '售罄卡必须禁用');
  assert.equal(await page.locator('[data-card-id="JD100"]').isDisabled(), true, '余额不足卡必须禁用');
  await captureC(page, '09-card-store', '京东卡兑换');

  await page.getByRole('button', { name: /京东E卡 20元/ }).click();
  assert.equal(await page.getByText('当前可兑换').count(), 1);
  await captureC(page, '10-card-confirm', '确认兑换');
  await capture(
    page.locator('#card-redeem-modal .modal'),
    path.join(componentDir, 'c-dialog-card-confirm.png'),
    componentEvidence,
    'C-DIALOG',
    '兑换确认弹窗'
  );

  await page.locator('#confirm-card-redeem').click();
  assert.equal(await page.getByText('发放成功').count(), 1);
  assert.equal(await page.locator('#redeemable-balance').innerText(), '650');
  assert.equal(await page.locator('#wallet-total').innerText(), '1,650');
  assert.equal(await page.evaluate(() => wallet.rechargeBalance), 1000);
  assert.match(await page.locator('#current-card-code').innerText(), /^\*{4}-\*{4}-\*{4}-/);
  await captureC(page, '11-card-success', '自动发卡密');
  await page.getByRole('button', { name: '查看卡密' }).click();
  assert.match(await page.locator('#current-card-code').innerText(), /^JDE8-/);
  await page.evaluate(() => closeCardRedeem());
  assert.equal(await page.locator('[data-card-id="JD20"]').isDisabled(), true, '已达限兑次数后必须禁用');

  await page.evaluate(() => openCardHistory());
  assert.equal(await page.locator('#card-history-list .card-order-item').count(), 2);
  assert.match(await page.locator('#history-code-0').innerText(), /^\*{4}-\*{4}-\*{4}-/);
  await captureC(page, '12-card-history', '兑换记录');
  await page.evaluate(() => closeCardHistory());

  const rechargeCheck = await openTracked(cDemo, { width: 520, height: 980 });
  await rechargeCheck.page.evaluate(() => showView('recharge'));
  await rechargeCheck.page.locator('#agree-check').check();
  await rechargeCheck.page.evaluate(() => doRecharge());
  const rechargeBalances = await rechargeCheck.page.evaluate(() => ({ ...wallet }));
  assert.deepEqual(rechargeBalances, { totalBalance: 8650, redeemableBalance: 2650, rechargeBalance: 6000 });

  const b = await openTracked(bDemo, { width: 1440, height: 900 });
  const adminPage = b.page;
  const adminScreens = [
    ['dashboard', '13-dashboard', '数据看板'],
    ['tasks', '14-task-management', '任务管理'],
    ['audit-task', '15-task-review', '任务审核'],
    ['audit-video', '16-video-review', '视频审核'],
    ['settlement', '17-settlement', '结算管理'],
    ['risk', '18-risk', '风控中心'],
    ['creator-audit', '19-creator-review', '创作者审核']
  ];
  for (const [route, name, title] of adminScreens) {
    await adminPage.evaluate(value => switchPage(value), route);
    await captureB(adminPage, name, title);
  }
  assert.equal(await adminPage.locator('img').count(), 0, '后台应无远程头像图片');

  await adminPage.evaluate(() => switchPage('jd-cards'));
  assert.equal(await adminPage.getByText('京东电子卡商品').count(), 1);
  await captureB(adminPage, '20-card-products', '京东卡商品配置');
  await capture(
    adminPage.locator('.page-tabs'),
    path.join(componentDir, 'b-card-tabs.png'),
    componentEvidence,
    'B-CARD-TABS',
    '京东卡管理 Tab'
  );
  await adminPage.getByRole('tab', { name: '卡密库存' }).click();
  for (const status of ['未使用', '已预占', '已发放', '待核对', '作废']) {
    assert.equal(await adminPage.getByText(status, { exact: true }).count() > 0, true, `missing inventory status: ${status}`);
  }
  await captureB(adminPage, '21-card-inventory', '卡密库存');

  await adminPage.evaluate(() => switchPage('card-orders'));
  assert.equal(await adminPage.getByText('京东卡兑换订单').count(), 1);
  for (const status of ['待发放', '已发放', '发放失败', '已退回', '待核对']) {
    assert.equal(await adminPage.getByText(status, { exact: true }).count() > 0, true, `missing order status: ${status}`);
  }
  assert.equal(await adminPage.getByText('禁止自动退款或补发', { exact: false }).count() > 0, true);
  assert.equal(await adminPage.getByText('物流', { exact: false }).count(), 0);
  await captureB(adminPage, '22-card-orders', '京东卡兑换订单');

  const cOld = await openTracked(cBaseline, { width: 520, height: 980 });
  await cOld.page.evaluate(() => showView('earnings'));
  await settle(cOld.page);
  await capture(
    cOld.page.locator('.phone'),
    path.join(baselineDir, '07-wallet-v1.png'),
    [],
    '07-wallet-v1',
    'V1 钱包原稿'
  );
  const baselineTopbar = await rect(cOld.page.locator('#view-earnings .header'));
  await page.evaluate(() => showView('earnings'));
  await settle(page);
  const currentTopbar = await rect(page.locator('#view-earnings .header'));
  await capture(
    cOld.page.locator('#view-earnings .header'),
    path.join(componentDir, 'c-topbar-wallet-v1.png'),
    componentEvidence,
    'C-TOPBAR-V1',
    'V1 钱包顶部栏'
  );

  const bOld = await openTracked(bBaseline, { width: 1440, height: 900 });
  await capture(
    bOld.page.locator('.layout'),
    path.join(baselineDir, '13-dashboard-v1.png'),
    [],
    '13-dashboard-v1',
    'V1 后台看板原稿'
  );

  const flowPage = await (await browser.newContext({ viewport: { width: 2200, height: 820 }, deviceScaleFactor: 1 })).newPage();
  const flowSteps = [
    ['1', '任务奖励到账', '07-wallet.png'],
    ['2', '查看可兑换余额', '09-card-store.png'],
    ['3', '选择面额', '09-card-store.png'],
    ['4', '确认兑换', '10-card-confirm.png'],
    ['5', '自动发放卡密', '11-card-success.png']
  ];
  const stepHtml = flowSteps.map(([index, label, file], position) => {
    const data = fs.readFileSync(path.join(outputDir, file)).toString('base64');
    return `<section class="step"><div class="step-title"><b>${index}</b><span>${label}</span></div><img src="data:image/png;base64,${data}">${position < flowSteps.length - 1 ? '<i>→</i>' : ''}</section>`;
  }).join('');
  await flowPage.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#111;color:#f5f5f5;font-family:"Microsoft YaHei",sans-serif}.flow{width:2180px;height:800px;padding:28px 24px;display:flex;align-items:center;justify-content:center;gap:14px;background:linear-gradient(135deg,#111,#21180f)}.step{position:relative;width:398px;height:744px;padding:16px;border:1px solid rgba(255,140,0,.35);border-radius:24px;background:#1b1b1d;display:flex;flex-direction:column;align-items:center}.step-title{height:54px;display:flex;align-items:center;gap:12px;font-size:21px;font-weight:700}.step-title b{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#ff8c00;color:#111}.step img{width:330px;height:660px;object-fit:contain;object-position:top;border-radius:18px;background:#eee}.step i{position:absolute;right:-30px;top:355px;z-index:2;color:#ff8c00;font-size:34px;font-style:normal}</style><div class="flow" id="flow">${stepHtml}</div>`);
  await capture(
    flowPage.locator('#flow'),
    path.join(outputDir, '00-product-flow.png'),
    screenshots,
    '00-product-flow',
    '产品流程'
  );

  screenshots.sort((left, right) => left.name.localeCompare(right.name));
  assert.equal(screenshots.length, 23, 'Expected exactly 23 PRD screenshots');
  for (const item of screenshots) {
    assert(item.width > 300 && item.height > 300, `${item.name} dimensions are too small`);
  }
  for (const tracked of [c, rechargeCheck, b]) {
    assert.deepEqual(tracked.externalRequests, [], 'Current demo made external requests');
    assert.deepEqual(tracked.pageErrors, [], 'Current demo emitted page errors');
    assert.deepEqual(tracked.consoleErrors, [], 'Current demo emitted console errors');
  }

  const verification = {
    status: 'pass',
    checkedAt: new Date().toISOString(),
    contract: {
      totalBefore: 3650,
      redeemableBefore: 2650,
      rechargeExcluded: 1000,
      totalAfterJd20: 1650,
      redeemableAfterJd20: 650,
      rechargeAfterJd20: 1000,
      physicalCardOrLogistics: false
    },
    sources: {
      pageRecipe: 'X-03',
      figma: 'figma-03:88688-6274',
      screenBaselines: ['screen-30', 'screen-15'],
      components: [
        { id: 'C-SHELL-P', status: 'measured' },
        { id: 'C-TOPBAR', status: 'derived' },
        { id: 'C-TAB', status: 'measured' },
        { id: 'C-DIALOG', status: 'derived' }
      ],
      conflict: {
        id: 'CR-PUB-001',
        adopted: '保留现有发行人 Demo 骨架，以 figma-03 补足任务商城和高风险兑换状态',
        rejected: '从空白画布重做全页或扩展实体卡物流流程',
        confidence: 'high'
      }
    },
    geometry: {
      baselineTopbar,
      currentTopbar,
      maxErrorPx: Math.max(
        Math.abs(baselineTopbar.width - currentTopbar.width),
        Math.abs(baselineTopbar.height - currentTopbar.height)
      )
    },
    screenshots,
    componentEvidence,
    visualComparison: {
      status: 'pending',
      note: '新增兑换页没有同版本实机原稿；钱包为预期改版，不应以像素相似度判定为旧页回归。后续由专用脚本生成原图、叠加、绝对差异、热图和严格指标。'
    },
    environment: {
      browser: executablePath,
      offline: true,
      externalRequests: 0,
      pageErrors: 0,
      consoleErrors: 0
    }
  };
  fs.writeFileSync(evidencePath, `${JSON.stringify(verification, null, 2)}\n`, 'utf8');
  console.log('PASS: publisher plan V2 UI, 23 screenshots captured');
} finally {
  for (const context of pagesToClose) await context.close().catch(() => {});
  await browser.close();
}

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const demoFile = path.resolve('demos/开发者后台一期/02-游戏创建与发行demo.html');
const financeFileName = '15-开发者财务结算demo.html';
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

let browser;

const demoUrl = route => {
  const url = pathToFileURL(demoFile);
  url.hash = route;
  return url.href;
};

async function seedAccount(page, accountKey, qualificationStatus = 'approved') {
  await page.addInitScript(({ key, demoName, status }) => {
    if (!decodeURIComponent(location.pathname).endsWith(`/${demoName}`)) return;
    localStorage.clear();
    sessionStorage.clear();
    window.name = '';
    sessionStorage.setItem('gamehub-developer-session-v2', JSON.stringify({
      version: 2,
      authenticated: true,
      accountKey: key,
      vendorId: 'VENDOR-STAR-001',
      activeGameId: '',
      qualificationStatus: status,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    }));
    localStorage.setItem('gamehub-developer-account-states-v1', JSON.stringify({
      [key]: {
        registration: { accountTier: status === 'approved' ? 'enterprise' : 'registered', registeredAt: '2026-09-10 10:00', consoleTab: 'games' },
        qualification: { status, revision: status === 'unsubmitted' ? 0 : 1, step: status === 'unsubmitted' ? 0 : 5, view: status === 'unsubmitted' ? 'intro' : 'form', form: {}, history: [], submissions: [] },
      },
    }));
  }, { key: accountKey, demoName: path.basename(demoFile), status: qualificationStatus });
  await page.goto(demoUrl('/P02-01'), { waitUntil: 'load' });
  await page.locator('[data-publisher-workspace]').waitFor();
}

async function seedApprovedAccount(page, accountKey) {
  await seedAccount(page, accountKey, 'approved');
  await page.locator('[data-publisher-workspace][data-publisher-access="enterprise"]').waitFor();
}

async function openDashboard(page, accountKey) {
  await seedApprovedAccount(page, accountKey);
  const gameEntry = page.locator('[data-portal-action="enter-publisher-game"][data-publisher-game="existing"]').first();
  await gameEntry.waitFor();
  await gameEntry.click();
  await page.locator('[data-publisher-game-console][data-selected-game="existing"]').waitFor();
  const entry = page.locator('[data-portal-action="game-console-section"][data-game-section="analytics"]');
  await entry.waitFor();
  await entry.click();
  const dashboard = page.locator('[data-publisher-page="data"]');
  await dashboard.waitFor();
  return dashboard;
}

async function selectDashboardTab(dashboard, tab, label) {
  const control = dashboard.locator(`[data-publisher-data-tab="${tab}"]`);
  assert.equal(await control.innerText(), label);
  await control.click();
  assert.equal(await dashboard.getAttribute('data-dashboard-tab'), tab);
  assert.equal((await control.getAttribute('class') || '').includes('is-active'), true);
}

async function horizontalOverflow(page) {
  return page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
}

function assertFinanceUrl(rawUrl, expectedHash) {
  assert.ok(rawUrl, `缺少 ${expectedHash} 财务跳转地址`);
  const target = new URL(rawUrl);
  assert.equal(decodeURIComponent(target.pathname).endsWith(`/${financeFileName}`), true);
  assert.equal(target.hash.split('?')[0], expectedHash);
}

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  assert.ok(fs.existsSync(demoFile), '统一 02 Demo 尚未构建');
  browser = await chromium.launch({
    headless: true,
    executablePath: chrome,
    args: ['--allow-file-access-from-files', '--disable-background-networking'],
  });
});

after(async () => { await browser?.close(); });

test('未认证与审核中账号不展示经营数据入口', async () => {
  for (const status of ['unsubmitted', 'pending']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    try {
      await seedAccount(page, `publisher-dashboard:hidden:${status}`, status);
      await page.locator('[data-portal-action="enter-publisher-game"][data-publisher-game="existing"]').first().click();
      assert.equal(await page.locator('[data-game-section="analytics"]').count(), 0, status);
      assert.equal(await page.locator('[data-publisher-page="data"]').count(), 0, status);
    } finally {
      await context.close();
    }
  }
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}px 下企业认证演示菜单切到通过后即时开放经营数据，刷新恢复真实状态`, async () => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try {
      await seedAccount(page, `publisher-dashboard:preview:${viewport.width}`, 'pending');
      await page.evaluate(() => { location.hash = '/P01-03'; });
      await page.locator('[data-platform-developer-console]').waitFor();
      const trigger = page.locator('.developer-demo-state-fab');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      await trigger.click();
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      const panel = page.locator('[data-demo-state-panel]');
      await panel.waitFor();
      const qualificationGroup = panel.getByRole('radiogroup', { name: '企业认证状态' });
      await qualificationGroup.getByRole('radio', { name: '审核通过', exact: true }).click();
      assert.deepEqual(await page.evaluate(() => ({
        document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth,
      })), { document: 0, body: 0 });

      await page.locator('[data-publisher-workspace][data-publisher-access="enterprise"]').waitFor();
      await page.locator('[data-portal-action="enter-publisher-game"][data-publisher-game="existing"]').first().click();
      const entry = page.locator('[data-portal-action="game-console-section"][data-game-section="analytics"]');
      await entry.waitFor();
      await entry.click();
      await page.locator('[data-publisher-page="data"]').waitFor();

      await page.reload({ waitUntil: 'load' });
      assert.equal(await page.locator('[data-game-section="analytics"]').count(), 0);
    } finally {
      await context.close();
    }
  });
}

test('统一演示菜单覆盖企业认证与游戏发布状态且不改写真实认证数据', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const accountKey = 'publisher-dashboard:release-preview';
  const states = [
    ['草稿', 'draft', 'draft', 'offline'],
    ['审核中', 'reviewing', 'reviewing', 'offline'],
    ['审核通过', 'approved', 'approved', 'offline'],
    ['审核未通过', 'rejected', 'rejected', 'offline'],
    ['已撤销', 'withdrawn', 'withdrawn', 'offline'],
    ['已上线', 'live', 'approved', 'live'],
    ['已下架', 'delisted', 'approved', 'delisted'],
  ];
  try {
    await seedAccount(page, accountKey, 'pending');
    const qualificationStates = [
      ['未提交', 'personal', false],
      ['审核中', 'personal', false],
      ['审核未通过', 'personal', false],
      ['资格已暂停', 'suspended', true],
      ['审核通过', 'enterprise', true],
    ];
    for (const [label, access, canViewData] of qualificationStates) {
      await page.locator('.developer-demo-state-fab').click();
      const qualificationGroup = page.locator('[data-demo-state-panel]').getByRole('radiogroup', { name: '企业认证状态' });
      await qualificationGroup.getByRole('radio', { name: label, exact: true }).click();
      const workspace = page.locator(`[data-publisher-workspace][data-publisher-access="${access}"]`);
      await workspace.waitFor();
      if (await workspace.getAttribute('data-workspace-view') === 'games') {
        await workspace.locator('[data-portal-action="enter-publisher-game"][data-publisher-game="existing"]').first().click();
      }
      assert.equal(await page.locator('[data-game-section="analytics"]').count(), canViewData ? 1 : 0, label);
    }

    for (const [label, status, reviewStatus, publicationStatus] of states) {
      await page.locator('.developer-demo-state-fab').click();
      const releaseGroup = page.locator('[data-demo-state-panel]').getByRole('radiogroup', { name: '游戏发布申请状态' });
      await releaseGroup.getByRole('radio', { name: label, exact: true }).click();
      const versions = page.locator(`[data-profile-versions][data-demo-release-status="${status}"]`);
      await versions.waitFor();
      const firstRecord = versions.locator('[data-version-record]').first();
      assert.equal(await firstRecord.locator('[data-version-review-status]').getAttribute('data-version-review-status'), reviewStatus, label);
      assert.equal(await firstRecord.locator('[data-version-publication-status]').getAttribute('data-version-publication-status'), publicationStatus, label);
      assert.equal(await page.locator('.pgp-demo-state-fab').count(), 0, '页面内旧状态入口不应重复渲染');
    }

    assert.deepEqual(await page.evaluate(key => ({
      qualification: JSON.parse(localStorage.getItem('gamehub-developer-account-states-v1'))?.[key]?.qualification?.status,
      session: JSON.parse(sessionStorage.getItem('gamehub-developer-session-v2'))?.qualificationStatus,
    }), accountKey), { qualification: 'pending', session: 'pending' });
  } finally {
    await context.close();
  }
});

test('经营数据位于单游戏控制台并锁定当前游戏', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:navigation');
    assert.deepEqual(await page.locator('[data-portal-action="game-console-section"]').allTextContents(), ['版本发布', '发布记录', '资质认证', '经营数据']);
    assert.equal(await dashboard.getAttribute('data-dashboard-game'), 'existing');
    assert.equal(await dashboard.locator('.publisher-dashboard-head h1').innerText(), '数据看板');
    assert.equal(await dashboard.locator('.publisher-dashboard-head > div:first-child > span').count(), 0);
    assert.equal(await dashboard.locator('.publisher-dashboard-game-context').count(), 0);
    assert.equal(await dashboard.locator('.publisher-dashboard-head p').count(), 0);
    assert.equal(await dashboard.locator('[data-dashboard-filter="game"]').count(), 0);
    assert.deepEqual(
      await dashboard.locator('[data-publisher-data-tab]').allTextContents(),
      ['经营概览', '订单明细', '收入与结算'],
    );
    assert.equal(await dashboard.getAttribute('data-dashboard-tab'), 'overview');
    assert.deepEqual(
      await dashboard.locator('[data-conversion-stage]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-conversion-stage'))),
      ['impression', 'card_click', 'detail_view', 'cta_click', 'order_create', 'acquisition_success', 'fulfillment_success'],
    );
    assert.deepEqual(
      await dashboard.locator('[data-conversion-stage] h3').allTextContents(),
      ['有效曝光', '游戏卡点击', '详情页访问', '购买／领取点击', '创建订单', '成功获取', '履约成功'],
    );
    assert.deepEqual(await page.evaluate(() => {
      const conversion = window.PublisherDataDashboard.snapshot(window.PublisherDataDashboard.createState()).conversion;
      return {
        stages: conversion.stages.map(item => [item.key, item.uv]),
        overallRate: conversion.overallRate,
      };
    }), {
      stages: [
        ['impression', 50000],
        ['card_click', 15000],
        ['detail_view', 12500],
        ['cta_click', 3750],
        ['order_create', 3180],
        ['acquisition_success', 2862],
        ['fulfillment_success', 2776],
      ],
      overallRate: 0.05724,
    });
    assert.deepEqual(await page.evaluate(() => window.PublisherDataDashboard.snapshot(
      window.PublisherDataDashboard.createState(),
    ).metrics), {
      paid: 7,
      free: 1,
      refundCount: 1,
      refundMinor: 1770,
      chargebackOpen: 1,
      chargebackRiskMinor: 400,
      chargebackLost: 1,
      chargebackLossMinor: 599,
      netSales: 5,
      grossMinor: 7548,
      taxMinor: 208,
      channelFeeMinor: 156,
      platformShareMinor: 777,
      adjustmentMinor: 85,
      estimatedMinor: 4123,
      settlementCurrency: 'USD',
      fxVersion: 'FX-20260910-01',
      pendingByCurrency: { USD: 1548260 },
    });

    await selectDashboardTab(dashboard, 'orders', '订单明细');
    await selectDashboardTab(dashboard, 'revenue', '收入与结算');
    await selectDashboardTab(dashboard, 'overview', '经营概览');
  } finally {
    await context.close();
  }
});

test('经营概览展示站内来源并把交易后置筛选限制在订单与收入页签', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:conversion-sources');
    assert.deepEqual(
      await dashboard.locator('[data-conversion-source]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-conversion-source'))),
      ['home', 'discovery', 'ranking', 'search', 'campaign', 'external', 'direct', 'other'],
    );
    assert.equal(await dashboard.locator('[data-dashboard-filter="source"]').count(), 1);
    assert.equal(await dashboard.locator('[data-dashboard-filter="fulfillment"]').count(), 0);
    assert.equal(await dashboard.locator('[data-dashboard-filter="status"]').count(), 0);
    assert.match(await dashboard.locator('[data-conversion-source="direct"]').innerText(), /自然直达[\s\S]*--/);

    const originalExposure = await dashboard.locator('[data-conversion-stage="impression"] strong').innerText();
    await dashboard.locator('[data-dashboard-filter="source"]').selectOption('search');
    assert.notEqual(await dashboard.locator('[data-conversion-stage="impression"] strong').innerText(), originalExposure);

    await selectDashboardTab(dashboard, 'orders', '订单明细');
    assert.equal(await dashboard.locator('[data-dashboard-filter="fulfillment"]').count(), 1);
    assert.equal(await dashboard.locator('[data-dashboard-filter="status"]').count(), 1);
  } finally {
    await context.close();
  }
});

test('站内转化趋势支持指标切换且不会改变交易筛选', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:conversion-trend');
    const trend = dashboard.locator('[data-conversion-trend]');
    assert.equal(await trend.getAttribute('data-active-metric'), 'impression');
    await dashboard.locator('[data-conversion-trend-metric="detail_view"]').click();
    assert.equal(await dashboard.locator('[data-conversion-trend]').getAttribute('data-active-metric'), 'detail_view');
    assert.deepEqual(await horizontalOverflow(page), { document: 0, body: 0 });
  } finally {
    await context.close();
  }
});

test('所有筛选共享同一快照并能得到明确的组合筛选空态', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:filters');
    await selectDashboardTab(dashboard, 'orders', '订单明细');
    const filters = dashboard.locator('select[data-dashboard-filter]');
    assert.ok(await filters.count() >= 6, '缺少时间、商品、履约、地区、平台、状态等组合筛选');

    const candidates = await filters.evaluateAll(nodes => nodes.map(node => ({
      key: node.dataset.dashboardFilter,
      values: [...node.options].map(option => option.value).filter(value => value && value !== 'all'),
    })));
    let emptyCombination = null;
    for (let left = 0; left < candidates.length && !emptyCombination; left += 1) {
      for (let right = left + 1; right < candidates.length && !emptyCombination; right += 1) {
        for (const leftValue of candidates[left].values) {
          await dashboard.locator(`[data-dashboard-filter="${candidates[left].key}"]`).selectOption(leftValue);
          for (const rightValue of candidates[right].values) {
            await dashboard.locator(`[data-dashboard-filter="${candidates[right].key}"]`).selectOption(rightValue);
            if (await dashboard.locator('[data-testid="publisher-dashboard-empty"]').count()) {
              emptyCombination = [candidates[left].key, leftValue, candidates[right].key, rightValue];
              break;
            }
          }
          if (emptyCombination) break;
          await dashboard.getByRole('button', { name: '重置', exact: true }).click();
        }
      }
    }
    assert.ok(emptyCombination, '固定样例应至少提供一组无匹配数据的组合筛选');
    assert.match(await dashboard.locator('[data-testid="publisher-dashboard-empty"]').innerText(), /当前筛选条件下暂无数据/);
    assert.equal(await dashboard.getByRole('button', { name: '重置', exact: true }).isVisible(), true);
  } finally {
    await context.close();
  }
});

test('订单明细覆盖交易、免费、退款、拒付和关闭样例，用户端删除不改变交易状态', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:orders');
    await selectDashboardTab(dashboard, 'orders', '订单明细');
    const orders = dashboard.locator('[data-dashboard-order-id]');
    assert.ok(await orders.count() >= 8, '订单样例不足以覆盖完整状态');
    const rowContents = await orders.allTextContents();
    for (const status of ['交易完成', '免费领取', '退款处理中', '已退款', '拒付待裁决', '拒付胜诉', '拒付败诉', '已关闭']) {
      assert.equal(rowContents.some(content => content.includes(status)), true, status);
    }

    const deleted = orders.filter({ hasText: '用户端已删除' });
    assert.equal(await deleted.count(), 1);
    assert.match(await deleted.innerText(), /交易完成|已退款|拒付胜诉|拒付败诉/);

    await orders.first().getByRole('button', { name: '查看详情', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: '订单详情' });
    await drawer.waitFor();
    assert.match(await drawer.innerText(), /订单快照[\s\S]*履约结果[\s\S]*资金影响/);
    assert.match(await drawer.innerText(), /不展示玩家身份[\s\S]*支付账号[\s\S]*Key 明文/);
    assert.equal(await drawer.locator('input, textarea').count(), 0);
    await drawer.getByRole('button', { name: '关闭', exact: true }).click();
    assert.equal(await page.getByRole('dialog', { name: '订单详情' }).count(), 0);
    assert.equal(await dashboard.locator('[data-publisher-data-tab="orders"]').getAttribute('class').then(value => value?.includes('is-active')), true);
  } finally {
    await context.close();
  }
});

test('数据口径弹窗说明计入条件、更新时间、脱敏范围和正式结算边界', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:scope');
    await dashboard.getByRole('button', { name: '数据口径', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '数据口径' });
    await dialog.waitFor();
    const content = await dialog.innerText();
    for (const phrase of ['付费销量', '免费领取', '拒付待裁决', '多币种', '更新时间', '脱敏', '正式金额以财务结算']) {
      assert.match(content, new RegExp(phrase), phrase);
    }
    await dialog.getByRole('button', { name: '关闭', exact: true }).click();
    assert.equal(await page.getByRole('dialog', { name: '数据口径' }).count(), 0);
  } finally {
    await context.close();
  }
});

test('收入与结算提供两个准确的财务模块跳转 URL 并携带当前筛选上下文', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:finance-links');
    await selectDashboardTab(dashboard, 'revenue', '收入与结算');
    await dashboard.getByRole('button', { name: '前往对账结算', exact: true }).click();
    await page.waitForFunction(() => new URL(location.href).hash.startsWith('#/settlement?'));
    const settlementUrl = page.url();
    const reopened = await openDashboard(page, 'publisher-dashboard:finance-links');
    await selectDashboardTab(reopened, 'revenue', '收入与结算');
    await reopened.getByRole('button', { name: '查看对账流水', exact: true }).click();
    await page.waitForFunction(() => new URL(location.href).hash.startsWith('#/settlement/flows?'));
    const flowsUrl = page.url();
    assertFinanceUrl(settlementUrl, '#/settlement');
    assertFinanceUrl(flowsUrl, '#/settlement/flows');
    const settlementQuery = new URLSearchParams(new URL(settlementUrl).hash.split('?')[1]);
    assert.equal(settlementQuery.get('statement'), 'STMT-2026-06-V1');
    assert.equal(settlementQuery.get('ledger_source'), 'direct_sale');
    assert.equal(settlementQuery.has('vendor'), false);
    assert.equal(settlementQuery.has('game'), false);
    assert.equal(settlementQuery.has('fulfillment'), false);
    const flowQuery = new URLSearchParams(new URL(flowsUrl).hash.split('?')[1]);
    assert.equal(flowQuery.get('game'), 'GAME-48291');
    assert.equal(flowQuery.get('fulfillment'), 'all');
    assert.equal(flowQuery.get('range'), '30d');
    assert.equal(flowQuery.get('ledger_source'), 'direct_sale');
    assert.equal(flowQuery.has('vendor'), false);
  } finally {
    await context.close();
  }
});

test('1440×900 与 390×844 均无页面根节点横向溢出', async () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try {
      const dashboard = await openDashboard(page, `publisher-dashboard:layout:${viewport.width}`);
      assert.deepEqual(await horizontalOverflow(page), { document: 0, body: 0 });
      await selectDashboardTab(dashboard, 'orders', '订单明细');
      assert.deepEqual(await horizontalOverflow(page), { document: 0, body: 0 });
      assert.equal(await dashboard.locator('.publisher-dashboard-table-wrap').evaluate(node => getComputedStyle(node).overflowX), 'auto');
      await selectDashboardTab(dashboard, 'revenue', '收入与结算');
      assert.deepEqual(await horizontalOverflow(page), { document: 0, body: 0 });
    } finally {
      await context.close();
    }
  }
});

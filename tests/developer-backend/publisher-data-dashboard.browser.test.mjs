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

test('经营数据位于单游戏控制台并只保留曝光转化与用户数据', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:navigation-v15');
    assert.deepEqual((await page.locator('[data-portal-action="game-console-section"]').allTextContents()).slice(0, 4), ['版本发布', '发布记录', '资质认证', '经营数据']);
    assert.equal(await dashboard.getAttribute('data-dashboard-game'), 'existing');
    assert.equal(await dashboard.locator('.publisher-dashboard-head h1').innerText(), '数据看板');
    assert.equal(await dashboard.locator('.publisher-dashboard-head > small').innerText(), '数据更新至 2026-09-10 23:59');
    assert.equal(await dashboard.getByText('数据口径', { exact: true }).count(), 0);
    assert.equal(await dashboard.getByText('只读经营数据', { exact: true }).count(), 0);
    assert.deepEqual(await dashboard.locator('[data-publisher-data-tab]').allTextContents(), ['曝光转化', '用户数据']);
    assert.equal(await dashboard.getAttribute('data-dashboard-tab'), 'conversion');
    assert.deepEqual(
      await dashboard.locator('[data-conversion-stage]').evaluateAll(nodes => nodes.map(node => node.dataset.conversionStage)),
      ['impression', 'card_click', 'detail_view', 'cta_click', 'order_create', 'acquisition_success', 'fulfillment_success'],
    );
    assert.deepEqual(await page.evaluate(() => ({
      overview: window.PublisherDataDashboard.createState({ tab: 'overview' }).tab,
      orders: window.PublisherDataDashboard.createState({ tab: 'orders' }).tab,
      revenue: window.PublisherDataDashboard.createState({ tab: 'revenue' }).tab,
      users: window.PublisherDataDashboard.createState({ tab: 'users' }).tab,
    })), { overview: 'conversion', orders: 'conversion', revenue: 'conversion', users: 'users' });
    await selectDashboardTab(dashboard, 'users', '用户数据');
    await selectDashboardTab(dashboard, 'conversion', '曝光转化');
  } finally {
    await context.close();
  }
});

test('时间控件提供完整快捷周期并按最新完整数据日计算', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:quick-ranges-v15');
    assert.equal(await dashboard.getAttribute('data-dashboard-range'), '2026-08-12/2026-09-10');
    const cases = [
      ['昨日', '2026-09-09/2026-09-09'],
      ['今日', '2026-09-10/2026-09-10'],
      ['近 7 天', '2026-09-04/2026-09-10'],
      ['近 30 天', '2026-08-12/2026-09-10'],
      ['上月', '2026-08-01/2026-08-31'],
      ['本月', '2026-09-01/2026-09-10'],
    ];
    for (const [label, expected] of cases) {
      await dashboard.locator('[data-dashboard-action="date-open"]').click();
      const dialog = dashboard.getByRole('dialog', { name: '选择时间' });
      await dialog.waitFor();
      assert.deepEqual(await dialog.locator('[data-dashboard-range-preset]').allTextContents(), ['昨日', '今日', '近 7 天', '近 30 天', '上月', '本月']);
      assert.equal(await dialog.getByRole('button', { name: '自定义', exact: true }).isDisabled(), true);
      await dialog.getByRole('button', { name: label, exact: true }).click();
      assert.equal(await dashboard.getAttribute('data-dashboard-range'), expected, label);
    }
  } finally {
    await context.close();
  }
});

test('双月日历支持跨月选择、取消、Esc、未来日期与 180 天边界', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:calendar-v15');
    const appliedBefore = await dashboard.getAttribute('data-dashboard-range');
    await dashboard.locator('[data-dashboard-action="date-open"]').click();
    const dialog = dashboard.getByRole('dialog', { name: '选择时间' });
    assert.deepEqual(await dialog.locator('[data-calendar-month]').evaluateAll(nodes => nodes.map(node => node.dataset.calendarMonth)), ['2026-08', '2026-09']);
    assert.equal(await dialog.locator('[data-calendar-date="2026-09-11"]').first().isDisabled(), true);

    await dialog.locator('[data-calendar-date="2026-08-28"]:not([disabled])').click();
    await dialog.locator('[data-calendar-date="2026-09-03"]:not([disabled])').click();
    assert.match(await dialog.locator('.publisher-dashboard-date-summary').innerText(), /2026-08-28[\s\S]*2026-09-03/);
    await dialog.getByRole('button', { name: '应用', exact: true }).click();
    assert.equal(await dashboard.getAttribute('data-dashboard-range'), '2026-08-28/2026-09-03');

    await dashboard.locator('[data-dashboard-action="date-open"]').click();
    await dialog.locator('[data-calendar-date="2026-08-20"]:not([disabled])').click();
    await dialog.getByRole('button', { name: '取消', exact: true }).click();
    assert.equal(await dashboard.getAttribute('data-dashboard-range'), '2026-08-28/2026-09-03');

    await dashboard.locator('[data-dashboard-action="date-open"]').click();
    await dialog.locator('[data-calendar-date="2026-08-21"]:not([disabled])').click();
    await dialog.press('Escape');
    assert.equal(await dashboard.getAttribute('data-dashboard-range'), '2026-08-28/2026-09-03');

    assert.deepEqual(await page.evaluate(() => [
      window.PublisherDataDashboard.validateDateRange({ startDate: '2026-03-15', endDate: '2026-09-10' }),
      window.PublisherDataDashboard.validateDateRange({ startDate: '2026-03-14', endDate: '2026-09-10' }),
      window.PublisherDataDashboard.validateDateRange({ startDate: '2026-09-10', endDate: '2026-09-11' }),
      window.PublisherDataDashboard.validateDateRange({ startDate: '2026-09-10', endDate: '2026-09-09' }),
    ]), ['', '自定义时间最长支持 180 天', '结束日期不能晚于数据更新时间', '开始日期不能晚于结束日期']);
    assert.notEqual(appliedBefore, await dashboard.getAttribute('data-dashboard-range'));
  } finally {
    await context.close();
  }
});

test('两个页签只展示生效筛选且切换后保留共同与专属条件', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:filter-scope-v15');
    const before = await dashboard.locator('[data-conversion-stage="impression"] strong').innerText();
    await dashboard.locator('[data-dashboard-filter="product"]').selectOption('dlc');
    await dashboard.locator('[data-dashboard-filter="source"]').selectOption('search');
    await dashboard.locator('[data-dashboard-filter="region"]').selectOption('United States');
    const after = await dashboard.locator('[data-conversion-stage="impression"] strong').innerText();
    assert.notEqual(after, before);

    await selectDashboardTab(dashboard, 'users', '用户数据');
    assert.equal(await dashboard.locator('[data-dashboard-filter="product"]').count(), 0);
    assert.equal(await dashboard.locator('[data-dashboard-filter="source"]').count(), 0);
    assert.equal(await dashboard.locator('[data-dashboard-filter="region"]').inputValue(), 'United States');
    const userValue = await dashboard.locator('[data-dashboard-metric="active_players"] > strong').innerText();

    await dashboard.locator('[data-dashboard-filter="region"]').selectOption('Japan');
    assert.notEqual(await dashboard.locator('[data-dashboard-metric="active_players"] > strong').innerText(), userValue);
    await selectDashboardTab(dashboard, 'conversion', '曝光转化');
    assert.equal(await dashboard.locator('[data-dashboard-filter="product"]').inputValue(), 'dlc');
    assert.equal(await dashboard.locator('[data-dashboard-filter="source"]').inputValue(), 'search');
    assert.equal(await dashboard.locator('[data-dashboard-filter="region"]').inputValue(), 'Japan');

    assert.equal(await page.evaluate(() => {
      const left = window.PublisherDataDashboard.userSnapshot(window.PublisherDataDashboard.createState({ filters: { product: 'base', source: 'home', region: 'Japan' } }));
      const right = window.PublisherDataDashboard.userSnapshot(window.PublisherDataDashboard.createState({ filters: { product: 'dlc', source: 'search', region: 'Japan' } }));
      return JSON.stringify(left) === JSON.stringify(right);
    }), true);
  } finally {
    await context.close();
  }
});

test('用户数据展示活跃、新增、留存和平均时长并正确处理未成熟留存', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:users-v15');
    await selectDashboardTab(dashboard, 'users', '用户数据');
    for (const key of ['active_players', 'new_players', 'retention', 'avg_duration']) {
      assert.equal(await dashboard.locator(`[data-dashboard-metric="${key}"]`).count(), 1, key);
    }
    const rates = await dashboard.locator('.publisher-user-retention strong').allTextContents();
    assert.equal(rates.every(value => /^\d+\.\d%$/.test(value)), true);
    await dashboard.locator('[data-dashboard-action="user-trend"][data-user-trend-metric="new"]').click();
    assert.equal(await dashboard.locator('[data-user-trend]').getAttribute('data-active-metric'), 'new');

    await dashboard.locator('[data-dashboard-action="date-open"]').click();
    await dashboard.getByRole('dialog', { name: '选择时间' }).getByRole('button', { name: '今日', exact: true }).click();
    assert.deepEqual(await dashboard.locator('.publisher-user-retention strong').allTextContents(), ['—', '—', '—']);

    await dashboard.locator('[data-dashboard-action="date-open"]').click();
    await dashboard.getByRole('dialog', { name: '选择时间' }).getByRole('button', { name: '上月', exact: true }).click();
    assert.equal((await dashboard.locator('.publisher-user-retention strong').allTextContents()).every(value => value !== '—'), true);
  } finally {
    await context.close();
  }
});

test('每个可见指标均提供可访问的问号定义并支持键盘与 Esc', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:metric-help-v15');
    for (const tab of ['conversion', 'users']) {
      if (tab === 'users') await selectDashboardTab(dashboard, 'users', '用户数据');
      const invalid = await dashboard.locator('[data-dashboard-metric], [data-conversion-stage]').evaluateAll(nodes => nodes.filter(node => !node.querySelector('[data-metric-help]')).length);
      assert.equal(invalid, 0, `${tab} 存在缺少指标定义的核心指标`);
      const help = dashboard.locator('[data-metric-help]');
      assert.ok(await help.count() >= (tab === 'conversion' ? 20 : 7));
      const links = await help.evaluateAll(nodes => nodes.map(node => ({
        describedBy: node.getAttribute('aria-describedby'),
        expanded: node.getAttribute('aria-expanded'),
        text: document.getElementById(node.getAttribute('aria-describedby'))?.textContent?.trim() || '',
        role: document.getElementById(node.getAttribute('aria-describedby'))?.getAttribute('role'),
      })));
      assert.equal(links.every(item => item.describedBy && item.text && item.role === 'tooltip' && item.expanded === 'false'), true);
    }

    const first = dashboard.locator('[data-metric-help]').first();
    await first.focus();
    assert.notEqual(await dashboard.locator(`#${await first.getAttribute('aria-describedby')}`).evaluate(node => getComputedStyle(node).display), 'none');
    await first.click();
    assert.equal(await first.getAttribute('aria-expanded'), 'true');
    await first.press('Escape');
    assert.equal(await dashboard.locator('[data-metric-help][aria-expanded="true"]').count(), 0);
  } finally {
    await context.close();
  }
});

test('1440×900 与 390×844 下筛选保持单行且页面根节点无横向溢出', async () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try {
      const dashboard = await openDashboard(page, `publisher-dashboard:layout-v15:${viewport.width}`);
      assert.deepEqual(await horizontalOverflow(page), { document: 0, body: 0 });
      const tops = await dashboard.locator('.publisher-dashboard-filter-scroll .publisher-dashboard-field').evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().top)));
      assert.equal(new Set(tops).size, 1, `${viewport.width}px 筛选项换行`);
      assert.equal(await dashboard.locator('[data-dashboard-platform]').innerText(), '平台：Mac');
      if (viewport.width === 390) assert.equal(await dashboard.locator('.publisher-dashboard-filter-scroll').evaluate(node => node.scrollWidth > node.clientWidth), true);
      await selectDashboardTab(dashboard, 'users', '用户数据');
      assert.deepEqual(await horizontalOverflow(page), { document: 0, body: 0 });
      const userTops = await dashboard.locator('.publisher-dashboard-filter-scroll .publisher-dashboard-field').evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().top)));
      assert.equal(new Set(userTops).size, 1, `${viewport.width}px 用户筛选项换行`);
    } finally {
      await context.close();
    }
  }
});

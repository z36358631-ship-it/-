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

async function seedAccount(page, accountKey, qualificationStatus = 'approved', publisherWorkspace = null) {
  await page.addInitScript(({ key, demoName, status, workspace }) => {
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
    if (workspace) {
      localStorage.setItem('gamehub-developer-publisher-accounts-v2', JSON.stringify({
        version:2,
        accounts:{ [key]:{ publisherWorkspaces:{ 'publisher-console':workspace } } },
      }));
    }
  }, { key: accountKey, demoName: path.basename(demoFile), status: qualificationStatus, workspace: publisherWorkspace });
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
      await dashboard.locator('[data-dashboard-metric]').evaluateAll(nodes => nodes.map(node => node.dataset.dashboardMetric)),
      ['impression', 'card_ctr', 'detail_view', 'detail_acquisition', 'acquisition_success', 'fulfillment_success', 'reservation_users'],
    );
    assert.equal(await dashboard.getByText('新增预约用户数', { exact:true }).count(), 1);
    assert.equal(await dashboard.getByText('站内转化', { exact:true }).count(), 0);
    assert.equal(await dashboard.getByText('来源分析', { exact:true }).count(), 0);
    assert.equal(await dashboard.locator('[data-dashboard-detail][data-active-metric="impression"]').count(), 1);
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

test('390px 自定义日期可向后翻月并始终保留可见月份导航', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:mobile-calendar-v15');
    const dateTrigger = dashboard.locator('[data-dashboard-action="date-open"]');
    await dateTrigger.click();
    const dialog = dashboard.getByRole('dialog', { name: '选择时间' });
    const visibleMonth = dialog.locator('[data-calendar-month]:visible');
    assert.equal(await visibleMonth.getAttribute('data-calendar-month'), '2026-08');
    const next = visibleMonth.getByRole('button', { name: '下一个月' });
    assert.equal(await next.isVisible(), true);
    assert.equal(await next.isEnabled(), true);
    await next.click();
    assert.equal(await dialog.locator('[data-calendar-month]:visible').getAttribute('data-calendar-month'), '2026-09');
    assert.equal(await dialog.getByRole('button', { name: '上一个月' }).isVisible(), true);
    assert.equal(await dialog.locator('[data-calendar-month]:visible').getByRole('button', { name: '下一个月' }).isDisabled(), true);
    await dialog.getByRole('button', { name: '上一个月' }).click();
    assert.equal(await dialog.locator('[data-calendar-month]:visible').getAttribute('data-calendar-month'), '2026-08');
  } finally {
    await context.close();
  }
});

test('两个页签只展示生效筛选且切换后保留共同与专属条件', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:filter-scope-v15');
    const before = await dashboard.locator('[data-dashboard-metric="impression"] > strong').innerText();
    await dashboard.locator('[data-dashboard-filter="product"]').selectOption('dlc');
    await dashboard.locator('[data-dashboard-filter="source"]').selectOption('search');
    await dashboard.locator('[data-dashboard-filter="region"]').selectOption('United States');
    const after = await dashboard.locator('[data-dashboard-metric="impression"] > strong').innerText();
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
    for (const key of ['active_players', 'new_players', 'retention_1d', 'retention_3d', 'retention_7d', 'avg_duration']) {
      assert.equal(await dashboard.locator(`[data-dashboard-metric="${key}"]`).count(), 1, key);
    }
    const rates = await dashboard.locator('.publisher-user-retention strong').allTextContents();
    assert.equal(rates.every(value => /^\d+\.\d%$/.test(value)), true);
    await dashboard.locator('[data-dashboard-action="metric-select"][data-detail-metric="retention_3d"]').click();
    assert.equal(await dashboard.locator('[data-dashboard-detail]').getAttribute('data-active-metric'), 'retention_3d');

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

test('每个可见指标均提供可访问的问号定义，趋势切换按钮不重复展示问号', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:metric-help-v15');
    for (const tab of ['conversion', 'users']) {
      if (tab === 'users') await selectDashboardTab(dashboard, 'users', '用户数据');
      const invalid = await dashboard.locator('[data-dashboard-metric]').evaluateAll(nodes => nodes.filter(node => !node.querySelector('[data-metric-help]')).length);
      assert.equal(invalid, 0, `${tab} 存在缺少指标定义的核心指标`);
      const help = dashboard.locator('[data-metric-help]');
      assert.equal(await help.count(), tab === 'conversion' ? 7 : 6);
      const links = await help.evaluateAll(nodes => nodes.map(node => ({
        describedBy: node.getAttribute('aria-describedby'),
        expanded: node.getAttribute('aria-expanded'),
        text: document.getElementById(node.getAttribute('aria-describedby'))?.textContent?.trim() || '',
        role: document.getElementById(node.getAttribute('aria-describedby'))?.getAttribute('role'),
      })));
      assert.equal(links.every(item => item.describedBy && item.text && item.role === 'tooltip' && item.expanded === 'false'), true);
      assert.equal(await dashboard.locator('[data-dashboard-action="metric-select"] [data-metric-help]').count(), 0);
    }
  } finally {
    await context.close();
  }
});

test('指标定义以视口浮层展示且不被指标滚动容器裁切', async () => {
  const context = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:metric-tooltip-v16');
    const trigger = dashboard.locator('[data-metric-help="card-impression"]');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const tooltip = page.locator(`#${await trigger.getAttribute('aria-describedby')}`);
    const geometry = await tooltip.evaluate(node => {
      const rect = node.getBoundingClientRect();
      const center = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return {
        display:getComputedStyle(node).display,
        position:getComputedStyle(node).position,
        insideViewport:rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
        hit:node === center || node.contains(center),
      };
    });
    assert.deepEqual(geometry, { display:'block', position:'fixed', insideViewport:true, hit:true });
  } finally {
    await context.close();
  }
});

test('两个页签的每个指标都能切换共享逐日详情', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:drilldown-v16');
    const cases = {
      conversion:['impression','card_ctr','detail_view','detail_acquisition','acquisition_success','fulfillment_success','reservation_users'],
      users:['active_players','new_players','retention_1d','retention_3d','retention_7d','avg_duration'],
    };
    for (const [tab,metrics] of Object.entries(cases)) {
      if (tab === 'users') await selectDashboardTab(dashboard, 'users', '用户数据');
      for (const metric of metrics) {
        await dashboard.locator(`[data-dashboard-action="metric-select"][data-detail-metric="${metric}"]`).click();
        assert.equal(await dashboard.locator('[data-dashboard-detail]').getAttribute('data-active-metric'), metric);
        assert.equal((await dashboard.locator(`[data-dashboard-metric="${metric}"]`).getAttribute('class') || '').includes('is-selected'), true);
      }
    }
  } finally {
    await context.close();
  }
});

test('详情支持完整日表、刷新、全屏、Esc 退出和当前指标 CSV 导出', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads:true });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:detail-tools-v16');
    const detail = dashboard.locator('[data-dashboard-detail]');
    assert.equal(await detail.getAttribute('data-detail-view'), 'chart');
    assert.equal(await detail.locator('[data-detail-point]').count(), 30);
    await detail.locator('[data-dashboard-action="detail-view"][data-detail-view="table"]').click();
    assert.equal(await detail.getAttribute('data-detail-view'), 'table');
    assert.equal(await detail.locator('[data-detail-row]').count(), 30);

    const beforeRevision = Number(await detail.getAttribute('data-detail-refresh-revision'));
    await detail.locator('[data-dashboard-action="detail-refresh"]').click();
    assert.equal(Number(await detail.getAttribute('data-detail-refresh-revision')), beforeRevision + 1);
    await detail.locator('[data-dashboard-action="detail-fullscreen"]').click();
    assert.equal(await detail.getAttribute('data-detail-fullscreen'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await detail.getAttribute('data-detail-fullscreen'), 'false');

    const downloadPromise = page.waitForEvent('download');
    await detail.locator('[data-dashboard-action="detail-export"]').click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /星海远征-曝光转化-有效曝光-2026-08-12_2026-09-10\.csv/);
    const body = fs.readFileSync(await download.path(), 'utf8');
    assert.equal(body.startsWith('\uFEFF'), true);
    assert.match(body, /2026-08-12/);
    assert.match(body, /2026-09-10/);

    await dashboard.locator('[data-dashboard-action="date-open"]').click();
    await dashboard.getByRole('dialog', { name:'选择时间' }).getByRole('button', { name:'今日', exact:true }).click();
    await dashboard.locator('[data-dashboard-action="detail-view"][data-detail-view="table"]').click();
    assert.equal(await dashboard.locator('[data-detail-row]').count(), 1);
  } finally {
    await context.close();
  }
});

test('周期卡片和逐日详情遵守 UV、转化率、预约与留存口径', async () => {
  const context = await browser.newContext({ viewport: { width:1440,height:900 } });
  const page = await context.newPage();
  try {
    await openDashboard(page, 'publisher-dashboard:metric-contract-v16');
    const result = await page.evaluate(() => {
      const state = window.PublisherDataDashboard.createState();
      const conversion = window.PublisherDataDashboard.conversionSnapshot(state);
      const users = window.PublisherDataDashboard.userSnapshot({ ...state,tab:'users' });
      return {
        conversionDays:conversion.rows.length,
        userDays:users.rows.length,
        ctr:conversion.summary.card_ctr,
        expectedCtr:conversion.summary.card_click / conversion.summary.impression,
        reservationPeriod:conversion.summary.reservation_users,
        reservationDailySum:conversion.rows.reduce((sum,row) => sum + row.reservation_users,0),
        activePeriod:users.activePlayers,
        activeDailySum:users.rows.reduce((sum,row) => sum + row.active_players,0),
        immature:{
          d1:users.rows.filter(row => row.retention_1d === null).length,
          d3:users.rows.filter(row => row.retention_3d === null).length,
          d7:users.rows.filter(row => row.retention_7d === null).length,
        },
      };
    });
    assert.equal(result.conversionDays, 30);
    assert.equal(result.userDays, 30);
    assert.ok(Math.abs(result.ctr - result.expectedCtr) < 1e-12);
    assert.equal(result.reservationPeriod, result.reservationDailySum);
    assert.ok(result.activePeriod < result.activeDailySum);
    assert.deepEqual(result.immature, { d1:1,d3:3,d7:7 });
  } finally {
    await context.close();
  }
});

test('问号与日期弹层使用真实焦点，Esc 关闭并回到各自触发按钮', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const dashboard = await openDashboard(page, 'publisher-dashboard:focus-loop-v15');
    const help = dashboard.locator('[data-metric-help]').first();
    await help.focus();
    assert.equal(await help.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.matches('[data-metric-help]')), true);
    const tooltip = page.locator(`#${await help.getAttribute('aria-describedby')}`);
    assert.equal(await tooltip.evaluate(node => getComputedStyle(node).display), 'block');
    await help.press('Escape');
    assert.equal(await help.getAttribute('aria-expanded'), 'false');
    assert.equal(await tooltip.evaluate(node => getComputedStyle(node).display), 'none');
    assert.equal(await page.evaluate(() => document.activeElement?.matches('[data-metric-help]')), true);

    const dateTrigger = dashboard.locator('[data-dashboard-action="date-open"]');
    await dateTrigger.focus();
    await dateTrigger.press('Enter');
    const dialog = dashboard.getByRole('dialog', { name: '选择时间' });
    await dialog.waitFor();
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), '昨日');
    const focusable = dialog.locator('button:not([disabled]):visible');
    const first = focusable.first();
    const last = focusable.last();
    await last.focus();
    await last.press('Tab');
    assert.equal(await first.evaluate(node => document.activeElement === node), true);
    await first.press('Shift+Tab');
    assert.equal(await last.evaluate(node => document.activeElement === node), true);
    await last.press('Escape');
    assert.equal(await dialog.count(), 0);
    assert.equal(await dateTrigger.evaluate(node => document.activeElement === node), true);
  } finally {
    await context.close();
  }
});

test('旧 90d 状态恢复为自定义区间并清理未关闭的瞬时弹层状态', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const accountKey = 'publisher-dashboard:legacy-state-v15';
  try {
    await seedAccount(page, accountKey, 'approved', {
      workspaceView:'games',
      selectedGame:'existing',
      gameSection:'analytics',
      dataDashboard:{
        tab:'overview',
        filters:{ range:'90d', startDate:'2026-06-13', endDate:'2026-09-10', region:'Japan' },
        datePickerOpen:true,
        activeTooltip:'source-impression',
        detailFullscreen:true,
        detailRefreshing:true,
        draftDateRange:{ startDate:'2026-09-01', endDate:'2026-09-02' },
        calendarLeftMonth:'2026-09',
        calendarSelectingEnd:true,
        dateAnchor:{ left:9999, top:9999 },
      },
    });
    await page.locator('[data-portal-action="enter-publisher-game"][data-publisher-game="existing"]').first().click();
    await page.locator('[data-portal-action="game-console-section"][data-game-section="analytics"]').click();
    const dashboard = page.locator('[data-publisher-page="data"]');
    await dashboard.waitFor();
    assert.equal(await dashboard.getAttribute('data-dashboard-tab'), 'conversion');
    assert.equal(await dashboard.getAttribute('data-dashboard-range'), '2026-06-13/2026-09-10');
    assert.equal(await dashboard.locator('.publisher-dashboard-time-button strong').innerText(), '自定义');
    assert.equal(await dashboard.locator('[data-dashboard-date-dialog]').count(), 0);
    assert.equal(await dashboard.locator('[data-metric-help][aria-expanded="true"]').count(), 0);
    assert.deepEqual(await page.evaluate(() => {
      const restored = window.PublisherDataDashboard.createState({
        filters:{ range:'90d' },
        datePickerOpen:true,
        activeTooltip:'source-click',
        calendarSelectingEnd:true,
        dateAnchor:{ left:9999, top:9999 },
      });
      return {
        range:restored.filters.range,
        dates:[restored.filters.startDate,restored.filters.endDate],
        datePickerOpen:restored.datePickerOpen,
        activeTooltip:restored.activeTooltip,
        calendarSelectingEnd:restored.calendarSelectingEnd,
        hasDateAnchor:Object.prototype.hasOwnProperty.call(restored,'dateAnchor'),
        detailFullscreen:restored.detailFullscreen,
        detailRefreshing:restored.detailRefreshing,
      };
    }), {
      range:'custom',
      dates:['2026-06-13','2026-09-10'],
      datePickerOpen:false,
      activeTooltip:'',
      calendarSelectingEnd:false,
      hasDateAnchor:false,
      detailFullscreen:false,
      detailRefreshing:false,
    });
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
      if (viewport.width === 390) {
        await dashboard.locator('[data-dashboard-action="detail-fullscreen"]').click();
        const fullscreen = dashboard.locator('[data-dashboard-detail][data-detail-fullscreen="true"]');
        const box = await fullscreen.boundingBox();
        assert.ok(box && box.width <= viewport.width - 12 && box.height <= viewport.height - 12);
        await page.keyboard.press('Escape');
      }
      await selectDashboardTab(dashboard, 'users', '用户数据');
      assert.deepEqual(await horizontalOverflow(page), { document: 0, body: 0 });
      const userTops = await dashboard.locator('.publisher-dashboard-filter-scroll .publisher-dashboard-field').evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().top)));
      assert.equal(new Set(userTops).size, 1, `${viewport.width}px 用户筛选项换行`);
    } finally {
      await context.close();
    }
  }
});

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { loadLatestPrdFixture } from '../../demos/开发者后台一期/src/prd-fixture.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demoDir = path.join(root, 'demos', '开发者后台一期');
const viewports = [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 1097, height: 684 }];
const commonStates = ['default', 'loading', 'empty', 'error', 'permission'];
const browserCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const publicTitles = {
  'P01-01': '开发者账号登录', 'P01-02': '工作台', 'P01-03': '开发者认证', 'P01-04': '游戏管理', 'P01-05': '创建／编辑游戏',
  'P01-06': 'APPID 与 SDK 接入', 'P01-07': '资料审核结果', 'P01-08': '开发者账号管理', 'P01-09': '厂商资质结果', 'P01-10': '游戏资料与上架结果',
  'P02-01': 'CDKEY 商品与供给', 'P02-02': '外部 Key 异常详情', 'P02-03': '商品与 SKU 管理', 'P02-04': '外部 Key 供给配置', 'P02-05': '盖世 Key 与渠道 API', 'P02-06': '供给异常与对账',
  'P03-01': '版本管理', 'P03-02': '创建／编辑版本', 'P03-03': '包体上传与 Build 详情', 'P03-04': '提交测试', 'P03-05': '测试不通过详情',
  'P03-06': '待测任务', 'P03-07': '测试任务详情', 'P03-08': '提交测试结果', 'P03-09': '版本审核', 'P03-10': '上架结论', 'P03-11': '待发布版本', 'P03-12': '发布与回滚', 'P03-13': '线上版本管理',
  'P04-01': '整体经营看板', 'P04-02': '交易、退款与结算', 'P04-03': 'Key 供给与兑换', 'P04-04': '下载、更新与首次启动', 'P04-05': 'Campaign／UTM 管理', 'P04-06': '发行资源需求', 'P04-07': '渠道归因分析', 'P04-08': '数据导出与说明',
};
const internalVisibleCopy = /开发者后台一期|评审工具|评审场景|Fixture|当前页面内存|仅用于本次演示|演示服务|模拟下载|示例厂商|首款签约游戏|\bP\d{2}-\d{2}\b|\bT\d{2}\b/;

let browser;
let routes;
let modules;
let fixture;

const compact = value => String(value || '').replace(/\s+/g, '');
const moduleFor = route => modules.find(item => item.id === route.moduleId);
const routeFor = id => routes.find(item => item.id === id);
const expectedPrimary = id => fixture.pages[id].primaryAction;
const routeUrl = (route, tab = null) => {
  const url = pathToFileURL(path.join(demoDir, moduleFor(route).output));
  const query = new URLSearchParams();
  if (tab !== null) query.set('tab', String(tab));
  url.hash = `/${route.id}${query.size ? `?${query}` : ''}`;
  return url.href;
};

async function openRoute(route, { state = 'default', tab = null, viewport = viewports[0] } = {}) {
  const page = await browser.newPage({ viewport });
  const errors = { page: [], console: [], remote: [] };
  page.on('pageerror', error => errors.page.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.console.push(message.text()); });
  page.on('request', request => { if (/^https?:/i.test(request.url())) errors.remote.push(request.url()); });
  await page.goto(routeUrl(route, tab), { waitUntil: 'load' });
  await page.locator('.product-frame').waitFor({ state: 'visible' });
  if (state !== 'default') {
    await page.evaluate(nextState => {
      const frame = document.querySelector('.product-frame');
      const pageWrap = document.querySelector('.page-wrap');
      frame.dataset.pageState = nextState;
      pageWrap.innerHTML = window.GameHubDeveloperPortal.components.statePanel({ state: nextState });
      if (nextState === 'permission') document.querySelector('.context-bar')?.remove();
    }, state);
  }
  return { page, errors };
}

async function assertClean(runtime, label) {
  assert.deepEqual(runtime.errors.page, [], `${label}:pageerror`);
  assert.deepEqual(runtime.errors.console, [], `${label}:console`);
  assert.deepEqual(runtime.errors.remote, [], `${label}:remote request`);
  const overflow = await runtime.page.evaluate(() => ({
    document: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    body: document.body.scrollWidth > document.body.clientWidth,
    frame: document.querySelector('.product-frame')?.scrollWidth > document.querySelector('.product-frame')?.clientWidth,
  }));
  assert.deepEqual(overflow, { document: false, body: false, frame: false }, `${label}:horizontal overflow`);
  assert.equal(await runtime.page.locator('.review-tools,[data-review-only],[data-review-route],[data-review-role],[data-review-state]').count(), 0, `${label}:review DOM`);
  assert.doesNotMatch(await runtime.page.locator('body').innerText(), internalVisibleCopy, `${label}:internal copy`);
}

async function assertControlContrast(page, label) {
  const failures = await page.evaluate(() => {
    const parse = value => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = rgb => {
      const linear = rgb.map(value => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const background = node => {
      let current = node;
      while (current) {
        const color = getComputedStyle(current).backgroundColor;
        if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return parse(color);
        current = current.parentElement;
      }
      return [255, 255, 255];
    };
    return [...document.querySelectorAll('input,select,textarea,.readonly-value')]
      .filter(node => node.getClientRects().length && !node.disabled)
      .map(node => {
        const fg = parse(getComputedStyle(node).color);
        const bg = background(node);
        const [lighter, darker] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
        return { tag: node.tagName, label: node.getAttribute('aria-label') || node.closest('.field')?.querySelector('.field-label')?.textContent?.trim() || '', ratio: (lighter + 0.05) / (darker + 0.05) };
      })
      .filter(item => item.ratio < 3);
  });
  assert.deepEqual(failures, [], `${label}:low contrast controls ${JSON.stringify(failures)}`);
}

before(async () => {
  execFileSync(process.execPath, [path.join(demoDir, 'build.mjs')], { stdio: 'pipe' });
  modules = JSON.parse(fs.readFileSync(path.join(demoDir, 'src/modules.json'), 'utf8'));
  ({ routes, fixture } = loadLatestPrdFixture({ repoRoot: root, demoDir }));
  const executablePath = browserCandidates.find(file => fs.existsSync(file));
  assert.ok(executablePath, 'local Chrome/Edge not found; set CHROME_PATH');
  browser = await chromium.launch({ headless: true, executablePath, args: ['--allow-file-access-from-files', '--disable-background-networking'] });
});

after(async () => { if (browser) await browser.close(); });

test('37 页在三种桌面尺寸均为正式页面且无溢出、脚本或配色错误', { timeout: 240000 }, async () => {
  for (const viewport of viewports) {
    for (const route of routes) {
      const runtime = await openRoute(route, { viewport });
      const label = `${route.id}@${viewport.width}x${viewport.height}`;
      try {
        assert.equal(await runtime.page.locator('.product-frame').getAttribute('data-role'), route.role, `${label}:role`);
        const title = runtime.page.locator('[data-page-title]').first();
        assert.equal(compact(await title.innerText()), compact(publicTitles[route.id]), `${label}:title`);
        const primary = runtime.page.locator('[data-primary-action]').first();
        assert.equal(await primary.isVisible(), true, `${label}:primary visible`);
        assert.equal(compact(await primary.innerText()), compact(expectedPrimary(route.id)), `${label}:primary label`);
        const box = await primary.boundingBox();
        assert.ok(box && box.x >= 0 && box.x + box.width <= viewport.width + 1 && box.y >= 0 && box.y + box.height <= viewport.height + 1, `${label}:primary outside viewport`);
        assert.equal(await primary.evaluate(node => getComputedStyle(node).whiteSpace), 'nowrap', `${label}:primary wraps`);
        if (route.id === 'P01-01') assert.equal(await runtime.page.locator('.side-nav,.top-account,.top-context').count(), 0, `${label}:login chrome`);
        if (route.id === 'P01-03') {
          assert.equal(await runtime.page.locator('.side-nav,.context-bar').count(), 0, `${label}:onboarding data exposure`);
          assert.equal(await runtime.page.getByText('待完成开发者认证', { exact: true }).isVisible(), true, `${label}:onboarding account state`);
        }
        const identifiers = runtime.page.locator('.table-identifier');
        if (await identifiers.count()) assert.equal(await identifiers.first().evaluate(node => getComputedStyle(node).whiteSpace), 'nowrap', `${label}:identifier wraps`);
        await assertControlContrast(runtime.page, label);
        await assertClean(runtime, label);
      } finally { await runtime.page.close(); }
    }
  }
});

test('37 页的加载、空、错误与无权限状态均可安全渲染', { timeout: 240000 }, async () => {
  for (const route of routes) {
    for (const state of commonStates) {
      const runtime = await openRoute(route, { state });
      const label = `${route.id}:${state}`;
      try {
        const frame = runtime.page.locator('.product-frame');
        assert.equal(await frame.getAttribute('data-page-state'), state, label);
        if (state === 'permission') {
          const text = await frame.innerText();
          for (const secret of [fixture.context.vendorName, fixture.context.gameName, fixture.context.versionName, fixture.context.campaignId]) {
            assert.equal(text.includes(secret), false, `${label}:leaks ${secret}`);
          }
        }
        await assertClean(runtime, label);
      } finally { await runtime.page.close(); }
    }
  }
});

test('正式页面忽略手工 URL 状态参数', async () => {
  const route = routeFor('P02-01');
  const page = await browser.newPage({ viewport: viewports[0] });
  try {
    await page.goto(`${routeUrl(route)}?state=error`, { waitUntil: 'load' });
    await page.locator('.product-frame').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.product-frame').getAttribute('data-page-state'), 'default');
    assert.equal(await page.getByText('CDKEY 商品与供给', { exact: true }).first().isVisible(), true);
  } finally { await page.close(); }
});

test('登录页输入为空，保留自动注册说明并支持两种登录方式', async () => {
  const runtime = await openRoute(routeFor('P01-01'));
  try {
    assert.equal(await runtime.page.locator('[data-password-login]').isVisible(), true);
    assert.equal(await runtime.page.locator('[data-gamehub-qr]').isHidden(), true);
    assert.deepEqual(await runtime.page.locator('[data-password-login] input').evaluateAll(nodes => nodes.map(node => node.value)), ['', '']);
    assert.equal(await runtime.page.getByText('未注册的账号将在登录时自动注册。', { exact: true }).isVisible(), true);
    assert.equal(await runtime.page.getByRole('button', { name: '登录／注册' }).isVisible(), true);
    assert.equal(await runtime.page.getByText(/模拟扫码|确认登录成功/).count(), 0);
    await runtime.page.locator('[data-portal-action="forgot-password"]').click();
    assert.match(await runtime.page.locator('[data-runtime-result]').innerText(), /密码找回/);
    await runtime.page.locator('[data-portal-action="gamehub-login"]').click();
    assert.equal(await runtime.page.locator('[data-gamehub-qr]').isVisible(), true);
    await runtime.page.locator('[data-portal-action="refresh-qr"]').click();
    assert.match(await runtime.page.locator('[data-qr-status]').innerText(), /已刷新/);
    await runtime.page.locator('[data-portal-action="password-login"]').click();
    await runtime.page.locator('[data-primary-action]').click();
    assert.match(await runtime.page.locator('[data-runtime-result]').innerText(), /请输入账号和密码/);
    assert.match(runtime.page.url(), /P01-01/);
    const fields = runtime.page.locator('[data-password-login] input');
    await fields.nth(0).fill('developer@xinghai.games');
    await fields.nth(1).fill('Example-Password-2026');
    await runtime.page.locator('[data-primary-action]').click();
    await runtime.page.waitForURL(/P01-02/);
    await runtime.page.waitForFunction(() => document.querySelector('[data-page-title]')?.textContent?.includes('工作台'));
    assert.equal(compact(await runtime.page.locator('[data-page-title]').innerText()), compact(publicTitles['P01-02']));
    await assertClean(runtime, 'P01-01 login');
  } finally { await runtime.page.close(); }
});

test('CDKEY 四个任务区、自助生成、一次性下载与渠道 Secret 可用', async () => {
  const runtime = await openRoute(routeFor('P02-01'));
  try {
    const tabs = runtime.page.locator('[data-component="Tabs"][data-variant="task"] [role="tab"]');
    assert.equal(await tabs.count(), 4);
    for (const [index, panel] of ['supply', 'batches', 'credentials', 'api-docs'].entries()) {
      await tabs.nth(index).click();
      assert.equal(await runtime.page.locator(`[data-cdkey-panel="${panel}"]`).isVisible(), true, panel);
    }
    const apiErrors = runtime.page.locator('#api-doc-errors');
    await apiErrors.scrollIntoViewIfNeeded();
    assert.equal(await apiErrors.isVisible(), true, '接口说明底部错误码可滚动到达');
    assert.ok(await apiErrors.locator('button').count() >= 4, '接口错误码完整');
    await tabs.nth(1).click();
    await runtime.page.locator('[data-portal-action="create-key-batch"]').click();
    await runtime.page.locator('[data-one-time-key-download]').waitFor();
    const downloadPromise = runtime.page.waitForEvent('download');
    await runtime.page.locator('[data-portal-action="download-key-csv"]').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'KEY-20260903-002.csv');
    assert.equal(await runtime.page.locator('[data-one-time-key-download]').count(), 0);
    await tabs.nth(2).click();
    await runtime.page.locator('[data-portal-action="create-api-credential"]').click();
    assert.match(await runtime.page.locator('[data-one-time-secret]').innerText(), /仅显示一次/);
    assert.match(await runtime.page.locator('[data-one-time-secret] code').innerText(), /^sec_[0-9a-f]{16}$/);
    await runtime.page.reload({ waitUntil: 'load' });
    assert.equal(await runtime.page.locator('[data-one-time-secret]').count(), 0);
    await assertClean(runtime, 'P02-01 CDKEY');
  } finally { await runtime.page.close(); }
});

test('盖世 Key 与渠道 API 页面三个入口进入对应 CDKEY 区域', async () => {
  const cases = [['创建 Key 批次', 1], ['创建渠道 API 凭据', 2], ['查看接口说明', 3]];
  for (const [label, index] of cases) {
    const runtime = await openRoute(routeFor('P02-05'));
    try {
      await runtime.page.getByRole('button', { name: label, exact: true }).click();
      await runtime.page.waitForURL(new RegExp(`P02-01\\?tab=${index}`));
      assert.equal(await runtime.page.locator(`[data-tab-index="${index}"]`).getAttribute('aria-selected'), 'true');
      await assertClean(runtime, `P02-05:${label}`);
    } finally { await runtime.page.close(); }
  }
});

test('关键业务操作、发布方式、看板筛选与帮助中心反馈完整', { timeout: 60000 }, async () => {
  const cases = [
    ['P01-09', 'record-offline-result', /线下结果已保存/],
    ['P03-12', 'rollback-release', /回滚配置已提交/],
    ['P04-05', 'create-campaign', /Campaign 已创建/],
    ['P04-06', 'submit-resource-request', /资源需求已提交/],
    ['P04-08', 'generate-export', /聚合文件已生成/],
  ];
  for (const [id, action, message] of cases) {
    const runtime = await openRoute(routeFor(id));
    try {
      await runtime.page.locator(`[data-portal-action="${action}"]:visible`).first().click();
      assert.match(await runtime.page.locator('[data-runtime-result]').innerText(), message, id);
      if (id === 'P04-08') assert.match(await runtime.page.locator('[data-export-result]').innerText(), /EXP-20260903-001.*120 行/);
      await assertClean(runtime, `${id}:${action}`);
    } finally { await runtime.page.close(); }
  }

  const release = await openRoute(routeFor('P03-12'));
  try {
    const input = release.page.locator('[data-schedule-field] input');
    assert.equal(await input.isDisabled(), true);
    await release.page.locator('.publish-option[data-portal-action="schedule-release"]').click();
    assert.equal(await input.isEnabled(), true);
    await input.fill('2026-09-05T20:00');
    await release.page.locator('.publish-option[data-portal-action="release-now"]').click();
    assert.equal(await input.isDisabled(), true);
    assert.equal(await input.inputValue(), '');
  } finally { await release.page.close(); }

  const dashboard = await openRoute(routeFor('P04-03'));
  try {
    const range = dashboard.page.locator('[data-dashboard-range]').nth(1);
    const filter = dashboard.page.locator('[data-dashboard-filter]').nth(1);
    await range.click();
    assert.equal(await range.getAttribute('data-variant'), 'primary');
    await filter.click();
    assert.equal(await filter.getAttribute('data-variant'), 'primary');
    assert.equal(await range.getAttribute('data-variant'), 'primary');
  } finally { await dashboard.page.close(); }

  const help = await openRoute(routeFor('P02-01'), { tab: 2 });
  try {
    await help.page.locator('.workspace').evaluate(node => { node.scrollTop = 180; });
    const beforeScroll = await help.page.locator('.workspace').evaluate(node => node.scrollTop);
    await help.page.locator('[data-help-open]').click();
    assert.match(await help.page.locator('[data-help-center]').innerText(), /常见问题[\s\S]*联系我们/);
    assert.equal(await help.page.locator('a[href="mailto:gamehub@gamesir.com"]').isVisible(), true);
    await help.page.locator('[data-help-back]').click();
    assert.equal(await help.page.locator('[data-tab-index="2"]').getAttribute('aria-selected'), 'true');
    assert.equal(await help.page.locator('.workspace').evaluate(node => node.scrollTop), beforeScroll);
  } finally { await help.page.close(); }
});

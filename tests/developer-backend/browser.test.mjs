import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demoDir = path.join(root, 'demos', '开发者后台一期');
const routePath = path.join(demoDir, 'src', 'routes.json');
const modulePath = path.join(demoDir, 'src', 'modules.json');
const fixturePath = path.join(demoDir, 'src', 'fixtures.json');
const frameMapPath = path.join(root, 'Figma', '开发者后台一期', 'frame-map.json');
const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
];
const states = ['default', 'loading', 'empty', 'error', 'permission'];
const browserCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

let browser;
let routes;
let modules;
let fixture;

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const compact = value => String(value || '').replace(/\s+/g, '');
const escapeRegExp = value => String(value).replace(/[.*+?^{}()|[\]\\\x24]/g, '\\$&');

function expectedPrimaryAction(routeId) {
  const action = fixture.pages[routeId].primaryAction;
  if (typeof action === 'string') return action;
  return action.label || action.text || action.name || action.title || '';
}

function moduleForRoute(route) {
  const module = modules.find(item => item.id === route.moduleId);
  assert.ok(module, route.id + ': missing module');
  return module;
}

function routeUrl(route, role = route.role, state = 'default') {
  const file = path.join(demoDir, moduleForRoute(route).output);
  assert.ok(fs.existsSync(file), route.id + ': missing built HTML ' + file);
  const url = pathToFileURL(file);
  url.hash = '/' + route.id + '?role=' + encodeURIComponent(role) + '&state=' + encodeURIComponent(state);
  return url.href;
}

function pageForRoute(routeId) {
  const route = routes.find(item => item.id === routeId);
  assert.ok(route, 'unknown route ' + routeId);
  return route;
}

async function openRoute(route, options = {}) {
  const role = options.role || route.role;
  const state = options.state || 'default';
  const viewport = options.viewport || viewports[0];
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  const consoleErrors = [];
  const remoteRequests = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('request', request => {
    if (/^https?:/i.test(request.url())) remoteRequests.push(request.url());
  });
  page.on('dialog', dialog => dialog.accept());
  await page.goto(routeUrl(route, role, state), { waitUntil: 'load' });
  await page.waitForTimeout(60);
  return { page, pageErrors, consoleErrors, remoteRequests };
}

async function assertNoHorizontalOverflow(page, label) {
  const result = await page.evaluate(() => ({
    body: document.body.scrollWidth <= document.body.clientWidth,
    root: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    width: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  assert.equal(result.body && result.root, true, label + ': horizontal overflow ' + result.width + ' > ' + result.viewport);
}

async function assertBoxInViewport(locator, viewport, label) {
  assert.equal(await locator.isVisible(), true, label + ': not visible');
  const box = await locator.boundingBox();
  assert.ok(box, label + ': missing box');
  assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1, label + ': outside viewport horizontally');
  assert.ok(box.y >= 0 && box.y + box.height <= viewport.height + 1, label + ': outside viewport vertically');
}

async function assertCleanRuntime(runtime, label) {
  assert.deepEqual(runtime.pageErrors, [], label + ': pageerror');
  assert.deepEqual(runtime.consoleErrors, [], label + ': console.error');
  assert.deepEqual(runtime.remoteRequests, [], label + ': remote request breaks offline delivery');
}

async function assertRouteContract(route, viewport) {
  const runtime = await openRoute(route, { viewport });
  const { page } = runtime;
  const label = route.id + '@' + viewport.width + 'x' + viewport.height;
  try {
    const frame = page.locator('.product-frame[data-frame-id]').first();
    await frame.waitFor({ state: 'visible' });
    assert.equal(await frame.getAttribute('data-frame-id'), route.id, label + ': frame id');
    assert.equal(await frame.getAttribute('data-role'), route.role, label + ': role');
    assert.equal(await frame.getAttribute('data-template-id'), route.templateId, label + ': template');
    assert.equal(await frame.getAttribute('data-page-state'), 'default', label + ': state');

    const title = page.locator('[data-page-title], .page-title, h1').first();
    assert.equal(compact(await title.innerText()), compact(route.title), label + ': title');

    const primary = page.locator('[data-primary-action]').first();
    await assertBoxInViewport(primary, viewport, label + ': primary action');
    assert.equal(compact(await primary.innerText()), compact(expectedPrimaryAction(route.id)), label + ': primary action text');

    const sideNav = page.locator('[data-side-nav], .side-nav').first();
    if (route.templateId === 'T01') {
      assert.equal(await sideNav.count(), 0, label + ': invited login must not expose business side nav');
    } else {
      await assertBoxInViewport(sideNav, viewport, label + ': side nav');
    }
    await assertNoHorizontalOverflow(page, label);
    await assertCleanRuntime(runtime, label);
  } finally {
    await page.close();
  }
}

async function findControl(page, actionIds, labels) {
  for (const actionId of actionIds) {
    const byData = page.locator('[data-demo-action="' + actionId + '"]:visible').first();
    if (await byData.count()) return byData;
  }
  for (const label of labels) {
    const matcher = new RegExp('^\\s*' + escapeRegExp(label) + '\\s*$');
    const byRole = page.getByRole('button', { name: matcher }).first();
    if (await byRole.count()) return byRole;
    const byLink = page.getByRole('link', { name: matcher }).first();
    if (await byLink.count()) return byLink;
  }
  return null;
}

async function clickAndExpectMutation(page, actionIds, labels, assertionLabel) {
  const control = await findControl(page, actionIds, labels);
  assert.ok(control, assertionLabel + ': control not found');
  assert.equal(await control.isVisible(), true, assertionLabel + ': control hidden');
  const frame = page.locator('.product-frame[data-frame-id]').first();
  const beforeHtml = await frame.innerHTML();
  await control.click();
  await page.waitForTimeout(80);
  const afterHtml = await frame.innerHTML();
  assert.notEqual(afterHtml, beforeHtml, assertionLabel + ': click produced no visible state change');
}

before(async () => {
  for (const file of [routePath, modulePath, fixturePath]) {
    assert.ok(fs.existsSync(file), 'developer backend foundation missing: ' + file);
  }
  routes = readJson(routePath);
  modules = readJson(modulePath);
  fixture = readJson(fixturePath);
  assert.equal(routes.length, 37, 'route count');
  assert.equal(new Set(routes.map(item => item.id)).size, 37, 'route id uniqueness');
  for (const route of routes) {
    assert.ok(fixture.pages[route.id], route.id + ': fixture page missing');
  }
  const executablePath = browserCandidates.find(candidate => fs.existsSync(candidate));
  assert.ok(executablePath, 'local Chrome/Edge not found; set CHROME_PATH');
  browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--allow-file-access-from-files', '--disable-background-networking'],
  });
});

after(async () => {
  if (browser) await browser.close();
});

test('37 routes pass frame, title, role, template, primary action and viewport checks at two desktop sizes', { timeout: 180000 }, async () => {
  for (const viewport of viewports) {
    for (const route of routes) await assertRouteContract(route, viewport);
  }
});

test('all 37 routes render the five common states without horizontal overflow or runtime errors', { timeout: 180000 }, async () => {
  for (const route of routes) {
    for (const state of states) {
      const runtime = await openRoute(route, { state, viewport: viewports[0] });
      const label = route.id + ':' + state;
      try {
        const stateRoot = runtime.page.locator('.product-frame[data-page-state], [data-page-state]').first();
        await stateRoot.waitFor({ state: 'visible' });
        assert.equal(await stateRoot.getAttribute('data-page-state'), state, label + ': state');
        await assertNoHorizontalOverflow(runtime.page, label);
        await assertCleanRuntime(runtime, label);
        if (state === 'permission') {
          const text = await stateRoot.innerText();
          for (const secret of [
            fixture.context.vendorName,
            fixture.context.gameName,
            fixture.context.versionName,
            fixture.context.campaignId,
          ]) {
            assert.equal(text.includes(secret), false, label + ': permission state leaks object context ' + secret);
          }
        }
      } finally {
        await runtime.page.close();
      }
    }
  }
});

test('developer, operations and tester direct-access denials do not leak target object existence', async () => {
  const cases = [
    { role: 'developer', route: pageForRoute('P01-08') },
    { role: 'operations', route: pageForRoute('P03-07') },
    { role: 'tester', route: pageForRoute('P04-02') },
  ];
  for (const item of cases) {
    const runtime = await openRoute(item.route, { role: item.role, state: 'default' });
    const label = item.role + '->' + item.route.id;
    try {
      const frame = runtime.page.locator('.product-frame[data-page-state]').first();
      await frame.waitFor({ state: 'visible' });
      assert.equal(await frame.getAttribute('data-page-state'), 'permission', label + ': must render permission');
      const text = await frame.innerText();
      for (const secret of [
        fixture.context.vendorName,
        fixture.context.gameName,
        fixture.context.versionName,
        fixture.context.campaignId,
      ]) {
        assert.equal(text.includes(secret), false, label + ': leaks ' + secret);
      }
      await assertCleanRuntime(runtime, label);
    } finally {
      await runtime.page.close();
    }
  }
});

test('critical demo interactions produce visible in-memory state changes', { timeout: 60000 }, async () => {
  const cases = [
    {
      routeId: 'P01-03',
      steps: [
        [['save-draft'], ['保存草稿'], 'save draft'],
      ],
    },
    {
      routeId: 'P01-08',
      steps: [
        [['approve'], ['通过', '审核通过'], 'approve'],
      ],
    },
    {
      routeId: 'P03-03',
      steps: [
        [['retry-upload'], ['继续上传'], 'resume interrupted upload'],
      ],
    },
    {
      routeId: 'P03-08',
      steps: [
        [['test-pass'], ['通过'], 'select test pass'],
        [['submit-test-result'], ['提交结果'], 'submit test result'],
      ],
    },
    {
      routeId: 'P03-12',
      steps: [
        [['schedule-release'], ['定时发布'], 'select scheduled release'],
        [['release-now'], ['立即发布'], 'select immediate release'],
      ],
    },
    {
      routeId: 'P04-07',
      steps: [
        [['add-target-rule', 'exclude-rule'], ['添加规则', '排除'], 'targeting rule'],
      ],
    },
  ];
  for (const item of cases) {
    const route = pageForRoute(item.routeId);
    const runtime = await openRoute(route);
    try {
      for (const [actionIds, labels, assertionLabel] of item.steps) {
        await clickAndExpectMutation(runtime.page, actionIds, labels, item.routeId + ':' + assertionLabel);
      }
      await assertCleanRuntime(runtime, item.routeId + ':interaction');
    } finally {
      await runtime.page.close();
    }
  }
});

test('review rejection and dashboard time range are interactive', async () => {
  const review = await openRoute(pageForRoute('P01-08'));
  try {
    await clickAndExpectMutation(review.page, ['reject'], ['驳回', '审核驳回'], 'P01-08:reject');
  } finally {
    await review.page.close();
  }

  const dashboard = await openRoute(pageForRoute('P04-04'));
  try {
    const select = dashboard.page.locator('[data-dashboard-range], select').first();
    if (await select.count() && await select.evaluate(element => element.tagName === 'SELECT')) {
      const options = await select.locator('option').count();
      assert.ok(options > 1, 'P04-04: dashboard range needs at least two options');
      const before = await dashboard.page.locator('.product-frame').innerHTML();
      await select.selectOption({ index: 1 });
      await dashboard.page.waitForTimeout(80);
      const afterHtml = await dashboard.page.locator('.product-frame').innerHTML();
      assert.notEqual(afterHtml, before, 'P04-04: range change produced no visible update');
    } else {
      await clickAndExpectMutation(dashboard.page, ['dashboard-range'], ['近7天', '近30天', '最近30天'], 'P04-04:dashboard range');
    }
  } finally {
    await dashboard.page.close();
  }
});

test('blocked and mutually exclusive controls match their visible business state', { timeout: 60000 }, async () => {
  const upload = await openRoute(pageForRoute('P03-03'));
  try {
    assert.equal(await upload.page.locator('[data-demo-action="start-upload"]').count(), 0, 'interrupted upload exposes start action');
    assert.equal(await upload.page.locator('[data-demo-action="interrupt-upload"]').count(), 0, 'interrupted upload exposes interrupt action');
    assert.ok(await upload.page.locator('[data-demo-action="retry-upload"]').count(), 'interrupted upload misses continue action');
  } finally {
    await upload.page.close();
  }

  const productList = await openRoute(pageForRoute('P02-03'));
  try {
    assert.equal(await productList.page.locator('[data-demo-action="page-2"]').count(), 0, 'single record exposes a second page');
    assert.equal(await productList.page.locator('[data-demo-action="page-next"]').isDisabled(), true, 'single record next page is enabled');
  } finally {
    await productList.page.close();
  }

  const releaseConfig = await openRoute(pageForRoute('P03-12'));
  try {
    const scheduleInput = releaseConfig.page.locator('[data-schedule-field] input');
    assert.equal(await scheduleInput.isDisabled(), true, 'immediate release keeps schedule input enabled');
    assert.equal(await scheduleInput.inputValue(), '', 'immediate release retains a schedule value');
    await releaseConfig.page.locator('.publish-option[data-demo-action="schedule-release"]').click();
    assert.equal(await scheduleInput.isEnabled(), true, 'scheduled release does not enable schedule input');
    await scheduleInput.fill('2026-09-05T20:00');
    await releaseConfig.page.locator('.publish-option[data-demo-action="release-now"]').click();
    assert.equal(await scheduleInput.isDisabled(), true, 'switching back to immediate release keeps schedule input enabled');
    assert.equal(await scheduleInput.inputValue(), '', 'switching back to immediate release keeps stale schedule value');
  } finally {
    await releaseConfig.page.close();
  }

  const schedule = await openRoute(pageForRoute('P04-08'));
  try {
    assert.equal(await schedule.page.locator('[data-primary-action]').isDisabled(), true, 'blocked placement still allows schedule confirmation');
  } finally {
    await schedule.page.close();
  }
});

test('specialized release and campaign actions are clickable, stateful and reset on refresh', { timeout: 60000 }, async () => {
  const statusByLabel = async (page, container, label) => {
    const item = page.locator(container).filter({ hasText: label }).first();
    return compact(await item.locator('.status-tag').first().innerText());
  };

  const release = await openRoute(pageForRoute('P03-13'), { viewport: viewports[0] });
  try {
    await release.page.locator('[data-demo-action="resume-download"]').click();
    assert.equal(await statusByLabel(release.page, '.task-summary > div', '下载开关'), '下载暂停');
    assert.match(await release.page.locator('[data-runtime-result]').innerText(), /请先填写处置原因/);
    await release.page.locator('.disposition-form textarea').fill('平台问题已恢复，门禁复核通过。');
    await release.page.locator('[data-demo-action="resume-download"]').click();
    assert.equal(await statusByLabel(release.page, '.task-summary > div', '下载开关'), '允许下载');
    await release.page.locator('[data-demo-action="pause-launch"]').click();
    assert.equal(await statusByLabel(release.page, '.task-summary > div', '启动开关'), '启动暂停');
    await release.page.locator('[data-demo-action="unpublish-game"]').click();
    assert.equal(await statusByLabel(release.page, '.gate-item', '游戏发布状态'), '已下架');
    assert.match(await release.page.locator('.timeline').innerText(), /恢复下载/);

    await release.page.reload({ waitUntil: 'load' });
    assert.equal(await statusByLabel(release.page, '.task-summary > div', '下载开关'), '下载暂停');
    assert.equal(await statusByLabel(release.page, '.task-summary > div', '启动开关'), '允许启动');
    assert.equal(await statusByLabel(release.page, '.gate-item', '游戏发布状态'), '已发布');
    await assertCleanRuntime(release, 'P03-13:specialized actions');
  } finally {
    await release.page.close();
  }

  const campaign = await openRoute(pageForRoute('P04-09'), { viewport: viewports[0] });
  try {
    await campaign.page.locator('[data-demo-action="start-campaign"]').click();
    assert.equal(await statusByLabel(campaign.page, '.task-summary > div', '计划状态'), '投放中');
    assert.match(await campaign.page.locator('.timeline').innerText(), /启动投放/);

    await campaign.page.reload({ waitUntil: 'load' });
    assert.equal(await statusByLabel(campaign.page, '.task-summary > div', '计划状态'), '已排期');
    await campaign.page.locator('[data-demo-action="cancel-schedule"]').click();
    assert.equal(await statusByLabel(campaign.page, '.task-summary > div', '计划状态'), '已排期');
    assert.match(await campaign.page.locator('[data-runtime-result]').innerText(), /请先填写取消排期原因/);
    await campaign.page.locator('.form-section textarea').fill('资源位临时不可用，取消本次排期。');
    await campaign.page.locator('[data-demo-action="cancel-schedule"]').click();
    assert.equal(await statusByLabel(campaign.page, '.task-summary > div', '计划状态'), '已结束');

    await campaign.page.reload({ waitUntil: 'load' });
    assert.equal(await statusByLabel(campaign.page, '.task-summary > div', '计划状态'), '已排期');
    await assertCleanRuntime(campaign, 'P04-09:specialized actions');
  } finally {
    await campaign.page.close();
  }
});

test('P04-03 primary action opens the developer analytics dashboard', async () => {
  const detail = await openRoute(pageForRoute('P04-03'));
  try {
    await detail.page.locator('[data-primary-action]').first().click();
    await detail.page.locator('.product-frame[data-frame-id="P04-04"]').waitFor({ state: 'visible' });
    assert.equal(await detail.page.locator('.product-frame').getAttribute('data-role'), 'developer');
    assert.equal(new URL(detail.page.url()).hash, '#/P04-04?role=developer&state=default');
    await assertCleanRuntime(detail, 'P04-03:analytics navigation');
  } finally {
    await detail.page.close();
  }
});

test('P02-01 使用可访问的按钮式任务 Tab 和固定授权摘要', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    const tabs = page.locator('[data-component="Tabs"][data-variant="task"] [role="tab"]');
    assert.equal(await tabs.count(), 4);
    assert.equal(await tabs.nth(0).getAttribute('aria-selected'), 'true');
    assert.ok((await tabs.nth(0).boundingBox()).height >= 36);
    await page.locator('[data-cdkey-authorization]').waitFor();
  } finally { await page.close(); }
});

test('P02-01 四个任务 Tab 可切换并展示对应内容', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    for (const [index, panel] of ['supply', 'batches', 'credentials', 'api-docs'].entries()) {
      await page.locator(`[data-tab-index="${index}"]`).click();
      assert.equal(await page.locator(`[data-cdkey-panel="${panel}"]`).isVisible(), true);
    }
  } finally { await page.close(); }
});

test('Key 明文和 Secret 仅在本次动作结果中展示一次', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    await page.locator('[data-tab-index="1"]').click();
    await page.locator('[data-demo-action="create-key-batch"]').click();
    await page.locator('[data-one-time-key-download]').waitFor({ state: 'visible' });
    await page.locator('[data-demo-action="simulate-key-download-failure"]').click();
    assert.equal(await page.locator('[data-one-time-key-download]').isVisible(), true);
    await page.locator('[data-demo-action="acknowledge-key-download"]').click();
    assert.equal(await page.locator('[data-one-time-key-download]').count(), 0);
    await page.locator('[data-tab-index="2"]').click();
    await page.locator('[data-demo-action="create-api-credential"]').click();
    assert.match(await page.locator('[data-one-time-secret]').textContent(), /仅显示一次/);
    await page.reload();
    assert.equal(await page.locator('[data-one-time-secret]').count(), 0);
  } finally { await page.close(); }
});

test('额度不足、渠道未授权和发行暂停会禁用自助动作并说明原因', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    await page.locator('.review-tools').hover();
    for (const scenario of ['quota-exceeded', 'channel-denied', 'publishing-paused']) {
      await page.locator(`[data-review-scenario="${scenario}"]`).click();
      assert.equal(await page.locator('[data-demo-action="create-key-batch"]').isDisabled(), true);
      assert.equal(await page.locator('[data-restriction-reason]').isVisible(), true);
    }
  } finally { await page.close(); }
});

test('Key 批次和渠道凭据的失败、暂停、作废、轮换与撤销均可演示', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    await page.locator('.review-tools').hover();
    await page.locator('[data-review-scenario="generation-failed"]').click();
    await page.locator('[data-tab-index="1"]').click();
    await page.locator('[data-demo-action="create-key-batch"]').click();
    await page.getByText('生成失败', { exact: true }).waitFor();
    assert.equal(await page.locator('[data-one-time-key-download]').count(), 0);
    await page.locator('[data-demo-action="pause-key-batch"]').click();
    assert.equal(await page.locator('[data-cdkey-panel="batches"] .status-tag').textContent(), '已暂停');
    await page.locator('[data-demo-action="void-key-batch"]').click();
    assert.equal(await page.locator('[data-cdkey-panel="batches"] .status-tag').textContent(), '已作废');
    await page.locator('[data-tab-index="2"]').click();
    await page.locator('[data-demo-action="rotate-api-credential"]').click();
    await page.locator('[data-one-time-secret]').waitFor({ state: 'visible' });
    await page.locator('[data-demo-action="acknowledge-secret"]').click();
    await page.locator('[data-demo-action="pause-api-credential"]').click();
    assert.equal(await page.locator('[data-cdkey-panel="credentials"] .status-tag').textContent(), '已暂停');
    await page.locator('[data-demo-action="revoke-api-credential"]').click();
    assert.equal(await page.locator('[data-cdkey-panel="credentials"] .status-tag').textContent(), '已撤销');
  } finally { await page.close(); }
});

test('导航和顶栏具备清晰选中态与键盘焦点态', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    assert.equal(await page.locator('.nav-item.is-active').getAttribute('aria-current'), 'page');
    await page.locator('[data-help-open]').focus();
    assert.match(await page.locator('[data-help-open]').evaluate(node => getComputedStyle(node).outlineStyle), /solid|auto/);
  } finally { await page.close(); }
});

test('P01-01 先介绍后登录且没有公众注册', async () => {
  const { page } = await openRoute(pageForRoute('P01-01'));
  try {
    await page.locator('[data-onboarding]').waitFor();
    assert.equal(await page.locator('[data-login-panel]').isHidden(), true);
    assert.equal(await page.getByText('注册', { exact: true }).count(), 0);
    await page.locator('[data-demo-action="start-onboarding"]').click();
    assert.equal(await page.locator('[data-login-panel]').isVisible(), true);
  } finally { await page.close(); }
});

test('帮助中心返回时保留路由、Tab 与滚动位置', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    await page.locator('[data-tab-index="2"]').click();
    await page.locator('.workspace').evaluate(node => { node.scrollTop = 180; });
    const before = await page.locator('.workspace').evaluate(node => node.scrollTop);
    await page.locator('[data-help-open]').click();
    assert.equal(await page.locator('[data-help-center]').isVisible(), true);
    await page.locator('[data-help-back]').click();
    assert.equal(await page.locator('[data-tab-index="2"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.workspace').evaluate(node => node.scrollTop), before);
  } finally { await page.close(); }
});

test('frame-map contains five ordered sections and 37 route-aligned business frames', () => {
  assert.ok(fs.existsSync(frameMapPath), 'frame-map missing');
  const map = readJson(frameMapPath);
  assert.deepEqual(
    map.sections.map(section => section.name),
    [
      '00 Design System & Architecture',
      '01 Publisher & Game',
      '02 CDKEY Supply',
      '03 Build, Test & Release',
      '04 Targeting & Analytics',
    ],
  );
  const frames = map.sections.flatMap(section => section.frames || []);
  assert.equal(frames.length, 37);
  assert.deepEqual(
    Object.fromEntries(['01', '02', '03', '04'].map(moduleId => [
      moduleId,
      frames.filter(frame => frame.moduleId === moduleId).length,
    ])),
    { '01': 9, '02': 6, '03': 13, '04': 9 },
  );
  assert.deepEqual(frames.map(frame => frame.id), routes.map(route => route.id), 'frame order');
  for (let index = 0; index < routes.length; index += 1) {
    const frame = frames[index];
    const route = routes[index];
    assert.equal(frame.order, index + 1, route.id + ': order');
    assert.equal(frame.name, route.id + ' ' + route.title, route.id + ': frame name');
    assert.equal(frame.title, route.title, route.id + ': title');
    assert.equal(frame.role, route.role, route.id + ': role');
    assert.equal(frame.templateId, route.templateId, route.id + ': template');
    assert.deepEqual(frame.size, { width: 1440, height: 900 }, route.id + ': size');
    assert.equal(frame.hash, '#/' + route.id + '?role=' + route.role + '&state=default', route.id + ': hash');
  }
});

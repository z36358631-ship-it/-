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
const viewports = [{ width: 1440, height: 900 }, { width: 1280, height: 800 }];
const commonStates = ['default', 'loading', 'empty', 'error', 'permission'];
const browserCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

let browser;
let routes;
let modules;
let fixture;

const compact = value => String(value || '').replace(/\s+/g, '');
const moduleFor = route => modules.find(item => item.id === route.moduleId);
const routeFor = id => routes.find(item => item.id === id);
const expectedPrimary = id => fixture.pages[id].primaryAction;
const routeUrl = (route, role = route.role, state = 'default') => {
  const url = pathToFileURL(path.join(demoDir, moduleFor(route).output));
  url.hash = `/${route.id}?role=${role}&state=${state}`;
  return url.href;
};

async function openRoute(route, { role = route.role, state = 'default', viewport = viewports[0] } = {}) {
  const page = await browser.newPage({ viewport });
  const errors = { page: [], console: [], remote: [] };
  page.on('pageerror', error => errors.page.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.console.push(message.text()); });
  page.on('request', request => { if (/^https?:/i.test(request.url())) errors.remote.push(request.url()); });
  await page.goto(routeUrl(route, role, state), { waitUntil: 'load' });
  await page.locator('.product-frame[data-frame-id]').waitFor({ state: 'visible' });
  return { page, errors };
}

async function assertClean(runtime, label) {
  assert.deepEqual(runtime.errors.page, [], `${label}:pageerror`);
  assert.deepEqual(runtime.errors.console, [], `${label}:console`);
  assert.deepEqual(runtime.errors.remote, [], `${label}:remote request`);
  const overflow = await runtime.page.evaluate(() => ({
    document: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    body: document.body.scrollWidth > document.body.clientWidth,
  }));
  assert.deepEqual(overflow, { document: false, body: false }, `${label}:horizontal overflow`);
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

test('37 个最新 PRD 路由在两种桌面尺寸通过页面、角色、主动作与离线检查', { timeout: 180000 }, async () => {
  for (const viewport of viewports) {
    for (const route of routes) {
      const runtime = await openRoute(route, { viewport });
      const label = `${route.id}@${viewport.width}x${viewport.height}`;
      try {
        const frame = runtime.page.locator('.product-frame').first();
        assert.equal(await frame.getAttribute('data-frame-id'), route.id, `${label}:frame`);
        assert.equal(await frame.getAttribute('data-role'), route.role, `${label}:role`);
        assert.equal(await frame.getAttribute('data-template-id'), route.templateId, `${label}:template`);
        const title = runtime.page.locator('[data-page-title], .page-title, h1').first();
        assert.equal(compact(await title.innerText()), compact(route.title), `${label}:title`);
        const primary = runtime.page.locator('[data-primary-action]').first();
        assert.equal(await primary.isVisible(), true, `${label}:primary visible`);
        assert.equal(compact(await primary.innerText()), compact(expectedPrimary(route.id)), `${label}:primary label`);
        const box = await primary.boundingBox();
        assert.ok(box && box.x >= 0 && box.x + box.width <= viewport.width + 1 && box.y >= 0 && box.y + box.height <= viewport.height + 1, `${label}:primary outside viewport`);
        if (route.id === 'P01-01') assert.equal(await runtime.page.locator('.side-nav').count(), 0, `${label}:login side nav`);
        await assertClean(runtime, label);
      } finally { await runtime.page.close(); }
    }
  }
});

test('37 个路由的五种通用状态均可渲染且权限态不泄露对象', { timeout: 180000 }, async () => {
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

test('P01-01 支持账号密码登录与当前卡片盖世扫码登录，不展示独立注册按钮', async () => {
  const runtime = await openRoute(routeFor('P01-01'));
  try {
    assert.equal(await runtime.page.locator('[data-password-login]').isVisible(), true);
    assert.equal(await runtime.page.locator('[data-gamehub-qr]').isHidden(), true);
    assert.equal(await runtime.page.getByText('注册账号', { exact: true }).count(), 0);
    await runtime.page.locator('[data-demo-action="forgot-password"]').click();
    assert.match(await runtime.page.locator('[data-runtime-result]').innerText(), /密码找回/);
    await runtime.page.locator('[data-demo-action="gamehub-login"]').click();
    assert.equal(await runtime.page.locator('[data-gamehub-qr]').isVisible(), true);
    await runtime.page.locator('[data-demo-action="refresh-qr"]').click();
    assert.match(await runtime.page.locator('[data-qr-status]').innerText(), /已刷新/);
    await runtime.page.locator('[data-demo-action="password-login"]').click();
    assert.equal(await runtime.page.locator('[data-password-login]').isVisible(), true);
    await runtime.page.locator('[data-primary-action]').click();
    await runtime.page.locator('.product-frame[data-frame-id="P01-02"]').waitFor();
    await assertClean(runtime, 'P01-01 password login');
  } finally { await runtime.page.close(); }

  const qrRuntime = await openRoute(routeFor('P01-01'));
  try {
    await qrRuntime.page.locator('[data-demo-action="gamehub-login"]').click();
    await qrRuntime.page.locator('[data-demo-action="confirm-gamehub-login"]').click();
    await qrRuntime.page.locator('.product-frame[data-frame-id="P01-03"]').waitFor();
    assert.match(qrRuntime.page.url(), /P01-03/);
  } finally { await qrRuntime.page.close(); }
});

test('最新 PRD 关键业务动作产生可见的页面内存结果', { timeout: 60000 }, async () => {
  const cases = [
    ['P01-09', 'record-offline-result', /线下结果已保存/],
    ['P01-10', 'record-offline-result', /线下结果已保存/],
    ['P03-12', 'rollback-release', /回滚配置已提交/],
    ['P04-05', 'create-campaign', /Campaign 已创建/],
    ['P04-06', 'submit-resource-request', /资源需求已提交/],
    ['P04-08', 'generate-export', /聚合文件已生成/],
  ];
  for (const [id, action, message] of cases) {
    const runtime = await openRoute(routeFor(id));
    try {
      const control = runtime.page.locator(`[data-demo-action="${action}"]:visible`).first();
      assert.equal(await control.isVisible(), true, `${id}:${action}`);
      await control.click();
      assert.match(await runtime.page.locator('[data-runtime-result]').innerText(), message, id);
      if (id === 'P04-08') assert.match(await runtime.page.locator('[data-export-result]').innerText(), /120 行/);
      await assertClean(runtime, `${id}:${action}`);
    } finally { await runtime.page.close(); }
  }
});

test('P03-12 立即／定时发布互斥，回滚保留历史并刷新复位', async () => {
  const runtime = await openRoute(routeFor('P03-12'));
  try {
    const input = runtime.page.locator('[data-schedule-field] input');
    assert.equal(await input.isDisabled(), true);
    await runtime.page.locator('.publish-option[data-demo-action="schedule-release"]').click();
    assert.equal(await input.isEnabled(), true);
    await input.fill('2026-09-05T20:00');
    await runtime.page.locator('.publish-option[data-demo-action="release-now"]').click();
    assert.equal(await input.isDisabled(), true);
    assert.equal(await input.inputValue(), '');
    await runtime.page.locator('[data-demo-action="rollback-release"]').click();
    assert.match(await runtime.page.locator('.timeline').innerText(), /回滚历史 Build/);
    await runtime.page.reload({ waitUntil: 'load' });
    assert.doesNotMatch(await runtime.page.locator('.timeline').innerText(), /当前页面内存记录/);
  } finally { await runtime.page.close(); }
});

test('P02-01 四个任务 Tab、Key 一次性下载与 Secret 一次性展示保持可用', async () => {
  const runtime = await openRoute(routeFor('P02-01'));
  try {
    const tabs = runtime.page.locator('[data-component="Tabs"][data-variant="task"] [role="tab"]');
    assert.equal(await tabs.count(), 4);
    for (const [index, panel] of ['supply', 'batches', 'credentials', 'api-docs'].entries()) {
      await tabs.nth(index).click();
      assert.equal(await runtime.page.locator(`[data-cdkey-panel="${panel}"]`).isVisible(), true, panel);
    }
    await tabs.nth(1).click();
    await runtime.page.locator('[data-demo-action="create-key-batch"]').click();
    await runtime.page.locator('[data-one-time-key-download]').waitFor();
    await runtime.page.locator('[data-demo-action="acknowledge-key-download"]').click();
    assert.equal(await runtime.page.locator('[data-one-time-key-download]').count(), 0);
    await tabs.nth(2).click();
    await runtime.page.locator('[data-demo-action="create-api-credential"]').click();
    assert.match(await runtime.page.locator('[data-one-time-secret]').innerText(), /仅显示一次/);
    await runtime.page.reload({ waitUntil: 'load' });
    assert.equal(await runtime.page.locator('[data-one-time-secret]').count(), 0);
    await assertClean(runtime, 'P02-01 CDKEY');
  } finally { await runtime.page.close(); }
});

test('帮助中心列出常见问题和联系我们，返回后保留 CDKEY Tab 与滚动位置', async () => {
  const runtime = await openRoute(routeFor('P02-01'));
  try {
    await runtime.page.locator('[data-tab-index="2"]').click();
    await runtime.page.locator('.workspace').evaluate(node => { node.scrollTop = 180; });
    const beforeScroll = await runtime.page.locator('.workspace').evaluate(node => node.scrollTop);
    await runtime.page.locator('[data-help-open]').click();
    assert.equal(await runtime.page.locator('[data-help-center]').isVisible(), true);
    assert.match(await runtime.page.locator('[data-help-center]').innerText(), /常见问题/);
    assert.match(await runtime.page.locator('[data-help-center]').innerText(), /联系我们/);
    await runtime.page.locator('[data-help-back]').click();
    assert.equal(await runtime.page.locator('[data-tab-index="2"]').getAttribute('aria-selected'), 'true');
    assert.equal(await runtime.page.locator('.workspace').evaluate(node => node.scrollTop), beforeScroll);
  } finally { await runtime.page.close(); }
});

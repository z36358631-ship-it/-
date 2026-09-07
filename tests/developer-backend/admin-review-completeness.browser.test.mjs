import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demo = path.join(root, 'demos', '开发者后台一期', '09-发行审核后台demo.html');
const evidence = path.join(root, 'tests', 'developer-backend', 'evidence', 'admin-review-completeness');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find(file => file && fs.existsSync(file));
let browser;

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  fs.mkdirSync(evidence, { recursive: true });
  browser = await chromium.launch({
    headless: true,
    executablePath: chrome,
    args: ['--allow-file-access-from-files', '--disable-background-networking']
  });
});

after(async () => browser?.close());

const url = hash => {
  const value = pathToFileURL(demo);
  value.hash = hash;
  return value.href;
};

async function makePage(viewport = { width: 1440, height: 900 }) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return { page, errors };
}

async function openFirstReleaseDrawer(page) {
  await page.goto(url('/release'), { waitUntil: 'load' });
  const row = page.locator('tbody tr').first();
  await row.locator('[data-open]').click();
  const drawer = page.locator('#modalRoot .drawer');
  await drawer.waitFor();
  return { row, drawer };
}

async function openDrawerTab(drawer, pattern) {
  const button = drawer.locator('[data-detail-tab]').filter({ hasText: pattern }).first();
  if (await button.count()) {
    await button.click();
    await drawer.waitFor();
  }
}

async function drawerTextAcrossViews(page) {
  const drawer = page.locator('#modalRoot .drawer');
  const labels = await drawer.locator('[data-detail-tab]').allTextContents();
  const chunks = [await drawer.innerText()];
  for (const label of labels) {
    const activeDrawer = page.locator('#modalRoot .drawer');
    const tab = activeDrawer.locator('[data-detail-tab]').filter({ hasText: label.trim() }).first();
    await tab.click();
    await activeDrawer.waitFor();
    chunks.push(await activeDrawer.innerText());
  }
  return chunks.join('\n');
}

async function currentRequiredPackageIds(page) {
  const drawer = page.locator('#modalRoot .drawer');
  const cards = drawer.locator('.package-item:not(.is-superseded)[data-package-id]').filter({ hasText: '必测' });
  const ids = await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-package-id')));
  assert.equal(new Set(ids).size, 6, '当前修订应恰好包含 Windows/macOS/Linux 的整包与增量包 6 个必测包体');
  return ids;
}

function packageCard(page, packageId) {
  return page.locator(`#modalRoot .drawer .package-item[data-package-id="${packageId}"]`);
}

test('仅保留三个审核导航，默认进入企业认证审核，区域与无提示刷新位置正确', async () => {
  const html = fs.readFileSync(demo, 'utf8');
  assert.doesNotMatch(html, /<iframe|https?:\/\//i, 'Demo 必须保持离线自包含');
  assert.match(html, /企业认证审核/);
  assert.match(html, /游戏发布审核/);
  assert.match(html, /资质变更审核/);
  assert.doesNotMatch(html, /审核工作台|data-nav=["']dashboard["']|游戏资质审核/);

  const { page, errors } = await makePage();
  try {
    await page.goto(url(''), { waitUntil: 'load' });
    await page.waitForURL(/#\/enterprise$/);

    const nav = page.locator('.side-nav > [data-nav]');
    assert.equal(await nav.count(), 3);
    assert.deepEqual((await nav.allTextContents()).map(text => text.replace(/\s+/g, '')),
      ['企企业认证审核', '游游戏发布审核', '证资质变更审核']);
    assert.equal(await page.evaluate(() => window.AdminReviewDemo.state.page), 'list');
    assert.match(await page.locator('#breadcrumb').innerText(), /审核管理\s*\/\s*企业认证审核/);
    assert.equal(await page.locator('#mainView > .detail-tabs, #mainView > [role="tablist"]').count(), 0, '三类审核不得再做顶部同级 Tab');
    assert.equal((await page.locator('.page-header h1').allTextContents()).join(''), '企业认证审核');

    assert.equal(await page.locator('.topbar [data-global-region]').count(), 0, '区域切换不得继续留在顶栏');
    const region = page.locator('.page-header [data-global-region]');
    assert.equal(await region.count(), 1, '区域切换应位于列表标题右侧原刷新位置');
    assert.equal(await region.inputValue(), 'domestic');

    const filterButtons = page.locator('.filter-actions button');
    assert.deepEqual(await filterButtons.allTextContents(), ['重置', '查询', '刷新队列']);
    const keyword = page.locator('[data-filter="keyword"]');
    await keyword.fill('深圳');
    await page.locator('[data-filter-submit]').click();
    await page.locator('[data-list-refresh]').click();
    assert.equal(await keyword.inputValue(), '深圳', '刷新队列不应清空当前已应用的筛选条件');
    assert.equal(await page.locator('.message').count(), 0, '刷新不得生成结果条或成功提示');
    assert.doesNotMatch(await page.locator('#mainView').innerText(), /审核队列已刷新|刷新成功/);

    await page.screenshot({ path: path.join(evidence, 'enterprise-filter-region-refresh-1440x900.png'), fullPage: true });
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('三类审核在国内与海外队列中覆盖全部业务状态和终态记录', async () => {
  const matrix = {
    enterprise: ['待审核', '审核中', '待补充', '已通过', '已拒绝', '已撤销', '已禁用'],
    release: ['待审核', '审核中', '待补充', '已通过', '已拒绝', '已撤销', '已下架'],
    qualification: ['待审核', '审核中', '待补充', '已通过', '已拒绝', '已撤销', '已失效']
  };
  const terminalRecord = {
    enterprise: ['disabled', /禁用发行资格/],
    release: ['offline', /下架游戏/],
    qualification: ['invalid', /标记资质失效/]
  };
  const { page, errors } = await makePage();
  try {
    for (const region of ['domestic', 'overseas']) {
      for (const [type, labels] of Object.entries(matrix)) {
        await page.goto(url(`/${type}`), { waitUntil: 'load' });
        await page.locator('[data-global-region]').selectOption(region);
        const options = (await page.getByLabel('审核状态').locator('option').allTextContents()).slice(1);
        assert.deepEqual(options, labels, `${type}/${region} 状态筛选应穷尽该审核类型的状态`);
        for (const [index, label] of labels.entries()) {
          const value = await page.getByLabel('审核状态').locator('option').nth(index + 1).getAttribute('value');
          await page.getByLabel('审核状态').selectOption(value);
          await page.locator('[data-filter-submit]').click();
          assert.ok(await page.locator('tbody tr').count() >= 1, `${type}/${region}/${label} 应有可追溯示例记录`);
          assert.match(await page.locator('tbody').innerText(), new RegExp(label));
        }

        const [terminalStatus, terminalAction] = terminalRecord[type];
        await page.getByLabel('审核状态').selectOption(terminalStatus);
        await page.locator('[data-filter-submit]').click();
        await page.locator('tbody tr [data-open]').first().click();
        const drawer = page.locator('#modalRoot .drawer');
        await drawer.waitFor();
        await openDrawerTab(drawer, /审核记录|操作记录/);
        assert.match(await drawer.innerText(), terminalAction, `${type} 终态必须保留实际处理记录`);
        await drawer.locator('header [data-modal-close]').click();
      }
    }
    for (const type of Object.keys(matrix)) {
      await page.goto(url(`/${type}`), { waitUntil: 'load' });
      await page.getByLabel('审核状态').selectOption('withdrawn');
      await page.locator('[data-filter-submit]').click();
      await page.locator('[data-open]').first().click();
      const drawer = page.locator('#modalRoot .drawer');
      assert.equal(await drawer.locator('[data-action]').count(), 0, `${type} 已撤销申请应只读，后台不得提供无确认的撤销或恢复入口`);
      await openDrawerTab(drawer, /审核记录|操作记录/);
      assert.match(await drawer.innerText(), /撤销申请[\s\S]*申请方/, `${type} 撤销来源应明确记录为申请方`);
      await drawer.locator('header [data-modal-close]').click();
    }
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('游戏发布 Drawer 可访问完整资料、SKU、发行、资质、包体快照与审核记录', async () => {
  const { page, errors } = await makePage();
  try {
    await page.goto(url('/release'), { waitUntil: 'load' });
    await page.screenshot({ path: path.join(evidence, 'release-list-1440x900.png'), fullPage: true });
    await page.locator('tbody tr').first().locator('[data-open]').click();
    const drawer = page.locator('#modalRoot .drawer');
    await drawer.waitFor();
    const text = await drawerTextAcrossViews(page);
    for (const required of [
      /游戏资料/,
      /商品与\s*SKU/,
      /发行设置/,
      /资质快照|引用资质|游戏资质/,
      /PC\s*包体测试/,
      /提交快照|资料快照/,
      /审核记录|操作记录/
    ]) assert.match(text, required);

    await openDrawerTab(page.locator('#modalRoot .drawer'), /PC\s*包体测试|包体测试/);
    const packageView = page.locator('#modalRoot .drawer');
    const packageText = await packageView.innerText();
    assert.match(packageText, /解析状态/);
    assert.match(packageText, /测试状态/);
    for (const platform of ['Windows', 'macOS', 'Linux']) {
      for (const packageType of ['整包', '增量包']) {
        const matching = packageView.locator('[data-package-id]').filter({ hasText: platform }).filter({ hasText: packageType });
        assert.ok(await matching.count() >= 1, `${platform} ${packageType} 缺失`);
      }
    }
    assert.match(packageText, /旧修订|R02/);
    assert.match(packageText, /旧修订已失效|测试结论不复用|不复用/);
    assert.match(packageText, /新修订|R03/);
    assert.match(packageText, /待测/);

    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(evidence, 'release-package-matrix-1440x900.png') });
    await packageView.locator('.package-item.is-superseded').scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(evidence, 'release-old-revision-superseded-1440x900.png') });
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('单包测试支持开始、失败原因必填、本地附件增删与失败记录留痕', async () => {
  const { page, errors } = await makePage();
  try {
    const { drawer } = await openFirstReleaseDrawer(page);
    await openDrawerTab(drawer, /PC\s*包体测试|包体测试/);
    const ids = await currentRequiredPackageIds(page);
    const pendingCard = page.locator('#modalRoot .drawer .package-item:not(.is-superseded)[data-package-id]')
      .filter({ hasText: '待测试' }).first();
    assert.ok(await pendingCard.count(), '应至少提供一个待测试包体以验证开始测试流程');
    const packageId = await pendingCard.getAttribute('data-package-id');
    assert.ok(ids.includes(packageId));

    let card = packageCard(page, packageId);
    assert.equal(await card.getByRole('button', { name: '开始测试', exact: true }).count(), 1);
    assert.equal(await card.getByRole('button', { name: '标记通过', exact: true }).count(), 0, '待测试不得直接判定通过');
    assert.equal(await card.getByRole('button', { name: '标记不通过', exact: true }).count(), 0, '待测试不得直接判定不通过');

    const transitionGuard = await page.evaluate(({ recordId, pendingId }) => {
      const record = window.AdminReviewDemo.getRecord(recordId);
      const pending = record.packages.find(item => item.id === pendingId);
      const passed = record.packages.find(item => item.current && item.testStatus === 'passed');
      const testing = record.packages.find(item => item.current && item.testStatus === 'testing');
      const pendingHistory = pending.history.length;
      const passedHistory = passed.history.length;
      const testingHistory = testing.history.length;
      return {
        pendingResult: window.AdminReviewDemo.updatePackageStatus(recordId, pending.id, 'passed'),
        pendingStatus: pending.testStatus,
        pendingHistoryBefore: pendingHistory,
        pendingHistoryAfter: pending.history.length,
        passedResult: window.AdminReviewDemo.updatePackageStatus(recordId, passed.id, 'testing'),
        passedStatus: passed.testStatus,
        passedHistoryBefore: passedHistory,
        passedHistoryAfter: passed.history.length,
        emptyFailureResult: window.AdminReviewDemo.updatePackageStatus(recordId, testing.id, 'failed'),
        testingStatus: testing.testStatus,
        testingHistoryBefore: testingHistory,
        testingHistoryAfter: testing.history.length
      };
    }, { recordId: await page.evaluate(() => window.AdminReviewDemo.state.recordId), pendingId: packageId });
    assert.deepEqual(transitionGuard, {
      pendingResult: false,
      pendingStatus: 'pending',
      pendingHistoryBefore: 0,
      pendingHistoryAfter: 0,
      passedResult: false,
      passedStatus: 'passed',
      passedHistoryBefore: 1,
      passedHistoryAfter: 1,
      emptyFailureResult: false,
      testingStatus: 'testing',
      testingHistoryBefore: 1,
      testingHistoryAfter: 1
    }, '待测试不可跳过测试中，已通过终态不可覆盖，失败原因不可为空');

    await card.getByRole('button', { name: '开始测试', exact: true }).click();
    card = packageCard(page, packageId);
    assert.match(await card.innerText(), /测试中/);
    assert.equal(await card.getByRole('button', { name: '开始测试', exact: true }).count(), 0);
    assert.equal(await card.getByRole('button', { name: '标记通过', exact: true }).count(), 1);
    assert.equal(await card.getByRole('button', { name: '标记不通过', exact: true }).count(), 1);
    await card.getByRole('button', { name: '标记不通过', exact: true }).click();

    const failDialog = page.locator('#modalRoot .modal:not(.drawer)');
    await failDialog.waitFor();
    await failDialog.locator('[data-package-fail-confirm], [data-action-confirm]').click();
    assert.match(await failDialog.locator('[data-package-fail-error], [data-modal-error]').innerText(), /请填写.*不通过原因|请填写处理原因/);

    const fileInput = failDialog.locator('input[type="file"][data-package-file], input[type="file"]');
    await fileInput.setInputFiles({
      name: 'win-r03-test-log.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Windows R03 package test evidence')
    });
    assert.match(await failDialog.innerText(), /win-r03-test-log\.txt/);
    await failDialog.locator('[data-package-attachment-remove]').first().click();
    assert.doesNotMatch(await failDialog.innerText(), /win-r03-test-log\.txt/);

    await fileInput.setInputFiles([
      { name: 'crash-log.txt', mimeType: 'text/plain', buffer: Buffer.from('crash log') },
      { name: 'error-screen.png', mimeType: 'image/png', buffer: Buffer.from('fake png evidence') }
    ]);
    assert.match(await failDialog.innerText(), /crash-log\.txt/);
    assert.match(await failDialog.innerText(), /error-screen\.png/);
    await failDialog.locator('[data-package-fail-reason], textarea').fill('启动后停留在黑屏，无法进入主菜单。');
    await failDialog.locator('[data-package-fail-confirm], [data-action-confirm]').click();

    await page.locator('#modalRoot .drawer').waitFor();
    await openDrawerTab(page.locator('#modalRoot .drawer'), /PC\s*包体测试|包体测试/);
    card = packageCard(page, packageId);
    assert.match(await card.innerText(), /不通过/);
    assert.match(await card.innerText(), /启动后停留在黑屏/);
    assert.match(await card.innerText(), /crash-log\.txt|error-screen\.png/);
    assert.match(await page.locator('#modalRoot .drawer').innerText(), /测试记录/);
    assert.match(await page.locator('#modalRoot .drawer').innerText(), /当前状态：待补充/);
    assert.equal(await page.locator('#modalRoot .drawer [data-package-action]').count(), 0, '失败后申请进入待补充，当前修订不得继续测试或覆盖结果');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(evidence, 'package-test-failed-with-attachments-1440x900.png') });
    await openDrawerTab(page.locator('#modalRoot .drawer'), /审核记录/);
    assert.match(await page.locator('#modalRoot .drawer').innerText(), /发布申请转待补充/);
    assert.match(await page.locator('#modalRoot .drawer').innerText(), /需开发者补传新包体并重新提交/);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('发布通过门禁同时约束 Drawer 与列表快捷操作，全部必测包通过后立即放行', async () => {
  const { page, errors } = await makePage();
  try {
    await page.goto(url('/release'), { waitUntil: 'load' });
    let row = page.locator('tbody tr').first();
    const listApprove = row.locator('[data-list-action="approve"]');
    assert.equal(await listApprove.count(), 1, '待审核记录应提供列表快捷通过');
    assert.equal(await listApprove.isDisabled(), true, '包体未全部通过时列表快捷通过必须禁用');

    await row.locator('[data-open]').click();
    let drawer = page.locator('#modalRoot .drawer');
    await drawer.waitFor();
    let drawerApprove = drawer.locator('[data-action="approve"]');
    assert.equal(await drawerApprove.isDisabled(), true, '包体未全部通过时 Drawer 发布通过必须禁用');
    assert.ok(await drawer.getByRole('button', { name: /拒绝/ }).isEnabled());
    assert.ok(await drawer.getByRole('button', { name: /要求补充/ }).isEnabled());
    const initialBlocked = Number(await drawer.locator('[data-release-gate]').getAttribute('data-blocked-count'));
    assert.ok(initialBlocked > 0 && initialBlocked <= 6, '至少一个当前必测包未通过时才应触发发布门禁');
    assert.match(await drawer.innerText(), new RegExp(`发布通过受限[^\\n]*${initialBlocked}\\s*个必测包体尚未通过`));

    await openDrawerTab(drawer, /PC\s*包体测试|包体测试/);
    const ids = await currentRequiredPackageIds(page);
    for (const packageId of ids) {
      let card = packageCard(page, packageId);
      if (/已通过|测试通过/.test(await card.innerText())) continue;
      const start = card.getByRole('button', { name: '开始测试', exact: true });
      if (await start.count()) await start.click();
      card = packageCard(page, packageId);
      const pass = card.getByRole('button', { name: '标记通过', exact: true });
      assert.equal(await pass.count(), 1, `${packageId} 开始后应允许标记通过`);
      await pass.click();
      card = packageCard(page, packageId);
      assert.match(await card.innerText(), /已通过|测试通过/);
    }

    drawer = page.locator('#modalRoot .drawer');
    drawerApprove = drawer.locator('[data-action="approve"]');
    assert.equal(await drawerApprove.isEnabled(), true, '全部必测包通过后发布通过应立即启用');
    assert.match(await drawer.innerText(), /全部必测包体已通过|(?:PC\s*包体)?门禁已通过/);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(evidence, 'release-gate-passed-1440x900.png') });

    await drawer.locator('header [data-modal-close]').click();
    row = page.locator('tbody tr').first();
    assert.equal(await row.locator('[data-list-action="approve"]').isEnabled(), true, '列表快捷通过应同步解除门禁');

    await row.locator('[data-open]').click();
    drawer = page.locator('#modalRoot .drawer');
    await drawer.locator('[data-action="approve"]').click();
    const approveDialog = page.locator('#modalRoot .modal:not(.drawer)');
    await approveDialog.locator('[data-action-confirm]').click();
    await page.waitForTimeout(500);
    drawer = page.locator('#modalRoot .drawer');
    assert.match(await drawer.innerText(), /已通过/);
    await drawer.locator('header [data-modal-close]').click();
    assert.match(await page.locator('tbody tr').first().innerText(), /已通过/);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('Drawer 头尾固定、内容独立滚动、返回顶部可用，关闭后保留筛选区域和分页', async () => {
  const { page, errors } = await makePage();
  try {
    await page.goto(url('/release'), { waitUntil: 'load' });
    await page.locator('[data-global-region]').selectOption('overseas');
    await page.locator('[data-filter="keyword"]').fill('发行团队');
    await page.locator('[data-filter-submit]').click();
    await page.getByRole('button', { name: '2', exact: true }).click();
    await page.locator('tbody tr:visible [data-open]').first().click();

    const drawer = page.locator('#modalRoot .drawer');
    const body = drawer.locator(':scope > .modal-body');
    const header = drawer.locator(':scope > header');
    const footer = drawer.locator(':scope > .modal-footer');
    const initial = {
      header: await header.boundingBox(),
      footer: await footer.boundingBox(),
      metrics: await body.evaluate(element => ({
        overflowY: getComputedStyle(element).overflowY,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight
      }))
    };
    assert.match(initial.metrics.overflowY, /auto|scroll/);
    assert.ok(initial.metrics.scrollHeight > initial.metrics.clientHeight, 'Drawer 内容区必须真实可滚动');

    await body.evaluate(element => { element.scrollTop = element.scrollHeight; });
    await page.waitForTimeout(100);
    const scrolledTop = await body.evaluate(element => element.scrollTop);
    assert.ok(scrolledTop > 100);
    const after = { header: await header.boundingBox(), footer: await footer.boundingBox() };
    assert.ok(initial.header && after.header && Math.abs(initial.header.y - after.header.y) < 1, '滚动内容时头部位置不应变化');
    assert.ok(initial.footer && after.footer && Math.abs(initial.footer.y - after.footer.y) < 1, '滚动内容时底部操作区位置不应变化');

    const backToTop = drawer.locator('[data-drawer-top]');
    assert.equal(await backToTop.count(), 1);
    await backToTop.click();
    await page.waitForFunction(() => {
      const element = document.querySelector('#modalRoot .drawer > .modal-body');
      return element && element.scrollTop <= 1;
    });
    await page.screenshot({ path: path.join(evidence, 'drawer-fixed-state-preserved-1440x900.png') });

    await drawer.locator('header [data-modal-close]').click();
    assert.equal(await page.locator('[data-global-region]').inputValue(), 'overseas');
    assert.equal(await page.locator('[data-filter="keyword"]').inputValue(), '发行团队');
    assert.match(await page.getByRole('button', { name: '2', exact: true }).getAttribute('class'), /is-active/);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('提交时间范围、资质附件预览和操作原因校验保持完整', async () => {
  const { page, errors } = await makePage({ width: 1280, height: 800 });
  try {
    await page.goto(url('/qualification'), { waitUntil: 'load' });
    assert.equal(await page.locator('[data-range-trigger]').count(), 1);
    assert.equal(await page.locator('[data-filter="start"]').getAttribute('type'), 'hidden');
    assert.equal(await page.locator('[data-filter="end"]').getAttribute('type'), 'hidden');
    await page.locator('[data-range-trigger]').click();
    for (const label of ['昨日', '今日', '近 7 天', '近 30 天']) {
      assert.equal(await page.getByRole('button', { name: label, exact: true }).count(), 1);
    }
    await page.getByRole('button', { name: '近 7 天', exact: true }).click();
    await page.locator('[data-range-apply]').click();
    assert.match(await page.locator('[data-range-trigger]').innerText(), /至/);
    await page.locator('[data-range-trigger]').click();
    await page.locator('[data-range-start]').fill('2026-09-07T09:12');
    await page.locator('[data-range-end]').fill('2026-09-07T09:12');
    await page.locator('[data-range-apply]').click();
    assert.equal(await page.locator('tbody tr').count(), 1, '开始/结束边界应包含同一时刻提交的记录');
    await page.locator('[data-filter-reset]').click();

    await page.locator('[data-open]').first().click();
    let drawer = page.locator('#modalRoot .drawer');
    assert.match(await drawer.innerText(), /自研且自有全部权利/);
    assert.match(await drawer.innerText(), /软件著作权证书（辅助证明）/);
    assert.match(await drawer.innerText(), /仅为自研权属证明之一/);
    await drawer.getByRole('button', { name: /自研权属证明（1）/ }).click();
    assert.match(await page.locator('#modalRoot .document-preview').innerText(), /文件类型\s*PNG/);
    await page.locator('#modalRoot [data-modal-close]').first().click();
    drawer = page.locator('#modalRoot .drawer');
    await drawer.locator('header [data-modal-close]').click();

    await page.getByLabel('审核状态').selectOption('pending');
    await page.locator('[data-filter-submit]').click();
    const rejectRow = page.locator('tbody tr').first();
    const rejectId = (await rejectRow.locator('.cell-main small').innerText()).split(' · ')[0];
    await rejectRow.getByRole('button', { name: '拒绝', exact: true }).click();
    await page.locator('[data-action-confirm]').click();
    assert.match(await page.locator('[data-modal-error]').innerText(), /请填写处理原因/);
    await page.locator('[data-action-reason]').fill('授权链无法证明当前主体具有目标地区发行权。');
    await page.locator('[data-action-confirm]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-filter-reset]').click();
    assert.match(await page.locator('tbody tr').filter({ hasText: rejectId }).innerText(), /已拒绝/);

    await page.screenshot({ path: path.join(evidence, 'qualification-range-attachment-action-1280x800.png'), fullPage: true });
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('终态恢复、下架恢复、资质失效与失败重试均要求正确依据且幂等', async () => {
  const { page, errors } = await makePage();
  try {
    const cases = [
      { type: 'enterprise', status: 'disabled', action: '恢复发行资格', result: '已通过', reason: '工商异常已解除，线下复核通过。' },
      { type: 'release', status: 'offline', action: '恢复上架', result: '已通过', reason: '权利投诉已撤回，法务复核通过。' }
    ];
    for (const item of cases) {
      await page.goto(url(`/${item.type}`), { waitUntil: 'load' });
      await page.getByLabel('审核状态').selectOption(item.status);
      await page.locator('[data-filter-submit]').click();
      await page.locator('[data-open]').first().click();
      let drawer = page.locator('#modalRoot .drawer');
      const recordId = await page.evaluate(() => window.AdminReviewDemo.state.recordId);
      const statusBeforeAction = await page.evaluate(id => window.AdminReviewDemo.getRecord(id).status, recordId);
      await drawer.getByRole('button', { name: item.action, exact: true }).click();
      assert.equal(await page.locator('#modalRoot .modal:not(.drawer)').count(), 1, `${item.action} 必须先进入二次确认弹窗`);
      assert.equal(await page.evaluate(id => window.AdminReviewDemo.getRecord(id).status, recordId), statusBeforeAction, `${item.action} 打开确认弹窗时不得直接改变状态`);
      await page.locator('[data-action-confirm]').click();
      assert.match(await page.locator('[data-modal-error]').innerText(), /请填写恢复依据/);
      await page.locator('[data-action-reason]').fill(item.reason);
      await page.locator('[data-action-confirm]').click();
      await page.waitForTimeout(500);
      drawer = page.locator('#modalRoot .drawer');
      assert.match(await drawer.innerText(), new RegExp(item.result));
      await drawer.locator('header [data-modal-close]').click();
    }

    await page.goto(url('/qualification'), { waitUntil: 'load' });
    await page.getByLabel('审核状态').selectOption('approved');
    await page.locator('[data-filter-submit]').click();
    await page.locator('[data-open]').first().click();
    let drawer = page.locator('#modalRoot .drawer');
    await drawer.getByRole('button', { name: '标记资质失效', exact: true }).click();
    await page.locator('[data-action-confirm]').click();
    assert.match(await page.locator('[data-modal-error]').innerText(), /请填写处理原因/);
    await page.locator('[data-action-reason]').fill('授权方书面通知授权提前终止。');
    await page.locator('[data-action-confirm]').click();
    await page.waitForTimeout(500);
    drawer = page.locator('#modalRoot .drawer');
    assert.match(await drawer.innerText(), /已失效/);
    await drawer.locator('header [data-modal-close]').click();

    await page.goto(url('/enterprise'), { waitUntil: 'load' });
    await page.locator('[data-filter-reset]').click();
    const retryRow = page.locator('tbody tr').filter({ hasText: '写入失败' }).first();
    assert.equal(await retryRow.count(), 1);
    const retryId = (await retryRow.locator('.cell-main small').innerText()).split(' · ')[0];
    await retryRow.getByRole('button', { name: '重试', exact: true }).click();
    await page.locator('[data-action-confirm]').click();
    await page.waitForTimeout(500);
    assert.match(await page.locator('tbody tr').filter({ hasText: retryId }).innerText(), /已通过/);

    const idempotent = await page.evaluate(async id => {
      const record = window.AdminReviewDemo.getRecord(id);
      const before = record.events.length;
      window.AdminReviewDemo.state.recordId = id;
      window.AdminReviewDemo.state.modal = { kind: 'action', recordId: id };
      await window.AdminReviewDemo.performAction('approve');
      return { before, after: record.events.length, status: record.status };
    }, retryId);
    assert.equal(idempotent.after, idempotent.before, '终态记录重复通过不得追加审核记录');
    assert.equal(idempotent.status, 'approved');
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

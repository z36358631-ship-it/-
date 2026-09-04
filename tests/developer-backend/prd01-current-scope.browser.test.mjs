import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demoFile = path.join(root, 'demos', '开发者后台一期', '01-开发者平台与资料demo.html');
const assetDir = path.join(root, 'public', 'prd', 'genuine-game-distribution-phase1', 'developer-backend-final', '01');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

let browser;

const demoUrl = hash => {
  const url = pathToFileURL(demoFile);
  url.hash = hash;
  return url.href;
};

const hasHorizontalOverflow = page => page.evaluate(() => (
  document.documentElement.scrollWidth > document.documentElement.clientWidth
  || document.body.scrollWidth > document.body.clientWidth
));

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files', '--disable-background-networking'] });
});

after(async () => { await browser?.close(); });

test('第一份 Demo 只暴露本期五个业务路由', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
    const routeIds = await page.locator('#portal-routes').evaluate(node => JSON.parse(node.value).map(route => route.id));
    assert.deepEqual(routeIds, ['P01-01', 'P01-03', 'P01-08', 'P01-09', 'P01-10']);
  } finally {
    await context.close();
  }
});

test('单文件脚本兼容 GitHub HTML Preview 的脚本提取方式', () => {
  const html = fs.readFileSync(demoFile, 'utf8');
  assert.equal((html.match(/<script/gi) || []).length, 1);
});

test('入驻选择使用标准按钮且企业认证介绍为白底', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
    await page.evaluate(() => {
      const key = 'gamehub-developer-account-states-v1';
      const states = JSON.parse(localStorage.getItem(key) || '{}');
      delete states['gamehub:demo-user'];
      localStorage.setItem(key, JSON.stringify(states));
    });
    await page.locator('.public-login-button').click();
    await page.locator('.login-qr-button').click();
    assert.equal(await page.getByText('选择当前入驻方式', { exact: true }).isVisible(), true);
    const entryButtons = page.locator('.developer-entry-card > .gh-button');
    assert.equal(await entryButtons.count(), 2);
    for (const width of await entryButtons.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width))) assert.ok(width <= 220.5);
    if (process.env.CAPTURE_PRD_ASSET === '1') await page.screenshot({ path: path.join(assetDir, 'P01-03-entry.png'), animations: 'disabled' });

    await page.getByRole('button', { name: '申请认证', exact: true }).click();
    assert.equal(await page.locator('.platform-tab-bar').count(), 0);
    assert.equal(await page.locator('.qualification-intro-panel').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
    assert.equal(await page.getByRole('button', { name: '开始填写资料', exact: true }).evaluate(node => getComputedStyle(node).color), 'rgb(7, 21, 34)');
    if (process.env.CAPTURE_PRD_ASSET === '1') await page.screenshot({ path: path.join(assetDir, 'P01-03-intro.png'), animations: 'disabled', fullPage: true });

    await page.getByRole('button', { name: '开始填写资料', exact: true }).click();
    assert.equal(await page.locator('.platform-tab-bar').count(), 0);
    if (process.env.CAPTURE_PRD_ASSET === '1') await page.screenshot({ path: path.join(assetDir, 'P01-03-form.png'), animations: 'disabled', fullPage: true });
  } finally {
    await context.close();
  }
});

test('不同登录账号分别保存入驻状态且首次登录显示入驻选择', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const loginByPhone = async phone => {
    await page.locator('.public-login-button').click();
    const panel = page.locator('[data-login-panel="zh"]');
    await panel.locator('input[name="loginAccount"]').fill(phone);
    await panel.locator('input[name="zh-verification-code"]').fill('123456');
    await panel.getByRole('button', { name: '登录 / 注册', exact: true }).click();
  };
  const logout = async () => {
    await page.locator('[data-portal-action="toggle-account-menu"]').click();
    await page.getByRole('menuitem', { name: '退出登录', exact: true }).click();
  };
  try {
    await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
    await page.evaluate(() => {
      const key = 'gamehub-developer-account-states-v1';
      const states = JSON.parse(localStorage.getItem(key) || '{}');
      delete states['phone:13800138001'];
      delete states['phone:13800138002'];
      localStorage.setItem(key, JSON.stringify(states));
    });
    await loginByPhone('13800138001');
    assert.equal(await page.getByText('选择当前入驻方式', { exact: true }).isVisible(), true);
    await page.getByRole('button', { name: '快速注册', exact: true }).click();
    assert.equal(await page.getByText('我的游戏', { exact: true }).isVisible(), true);
    await logout();

    await loginByPhone('13800138002');
    assert.equal(await page.getByText('选择当前入驻方式', { exact: true }).isVisible(), true);
    assert.equal(await page.getByText('我的游戏', { exact: true }).count(), 0);
    await logout();

    await loginByPhone('13800138001');
    assert.equal(await page.getByText('我的游戏', { exact: true }).isVisible(), true);
    assert.equal(await page.getByText('选择当前入驻方式', { exact: true }).count(), 0);
  } finally {
    await context.close();
  }
});

test('平台控制台默认游戏管理并常驻展示审核提示', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-03?preview=pending'), { waitUntil: 'load' });
    const tabs = page.getByRole('tab');
    assert.deepEqual(await tabs.allTextContents(), ['游戏管理', '数据总览']);
    assert.equal(await page.getByText('我的游戏', { exact: true }).isVisible(), true);
    const pendingNotice = page.locator('.platform-verification-notice');
    assert.match(await pendingNotice.innerText(), /已有 1 个认证开发者[\s\S]*正在申请中[\s\S]*2026-09-02[\s\S]*2026-09-09[\s\S]*5 个工作日[\s\S]*查看详情/);
    await page.locator('[data-portal-action="toggle-account-menu"]').click();
    assert.deepEqual(await page.locator('.top-account-dropdown [role="menuitem"]').allTextContents(), ['退出登录']);
    assert.equal(await page.locator('.top-account-dropdown [role="menuitem"]').filter({ hasText: '申请企业认证' }).count(), 0);
    await page.locator('[data-portal-action="toggle-account-menu"]').click();
    await page.getByRole('button', { name: '查看详情', exact: true }).click();
    assert.equal(await page.getByRole('dialog', { name: '提示' }).count(), 0);
    assert.equal(await page.locator('[data-qualification-form-page]').isVisible(), true);
    assert.equal(await page.locator('.platform-tab-bar').count(), 0);
    assert.equal(await page.getByText('已提交的企业认证资料', { exact: true }).isVisible(), false);
    assert.equal(await page.locator('.qualification-readonly-fieldset').getAttribute('disabled'), '');
    assert.match(await page.locator('.qualification-pending-note').innerText(), /2026-09-02[\s\S]*2026-09-09[\s\S]*5 个工作日/);
    assert.equal(await page.getByRole('button', { name: '撤回申请', exact: true }).isVisible(), true);
    assert.equal(await page.locator('[data-qualification-form-page] [name="legalName"]').isDisabled(), true);
    assert.equal(await page.locator('[data-qualification-form-page] [name="legalName"]').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(242, 244, 247)');
    if (process.env.CAPTURE_PRD_ASSET === '1') await page.screenshot({ path: path.join(assetDir, 'P01-03-application-readonly.png'), animations: 'disabled', fullPage: true });
    await page.getByRole('button', { name: '返回控制台', exact: true }).click();
    if (process.env.CAPTURE_PRD_ASSET === '1') {
      fs.mkdirSync(assetDir, { recursive: true });
      await page.screenshot({ path: path.join(assetDir, 'P01-03-pending.png'), animations: 'disabled' });
    }
    assert.equal(await page.getByRole('button', { name: '创建游戏', exact: true }).first().isVisible(), true);
    if (process.env.CAPTURE_PRD_ASSET === '1') {
      fs.mkdirSync(assetDir, { recursive: true });
      await page.screenshot({ path: path.join(assetDir, 'P01-03-console.png'), animations: 'disabled' });
    }

    await page.getByRole('button', { name: '创建游戏', exact: true }).first().click();
    assert.equal(await page.getByText('创建游戏项目', { exact: true }).first().isVisible(), true);
    assert.equal(await page.getByRole('button', { name: '返回游戏管理', exact: true }).isVisible(), true);
    await page.getByRole('button', { name: '返回游戏管理', exact: true }).click();

    await page.getByRole('tab', { name: '数据总览', exact: true }).click();
    assert.equal(await page.getByText('游戏数据总览', { exact: true }).isVisible(), true);
    assert.match(await page.locator('[data-platform-console-panel="overview"]').innerText(), /暂作占位[\s\S]*待后续 PRD 补充/);
    if (process.env.CAPTURE_PRD_ASSET === '1') await page.screenshot({ path: path.join(assetDir, 'P01-03-overview.png'), animations: 'disabled' });
    await page.getByRole('tab', { name: '游戏管理', exact: true }).click();
    assert.match(await page.locator('.platform-verification-notice').innerText(), /已有 1 个认证开发者[\s\S]*正在申请中[\s\S]*2026-09-02[\s\S]*2026-09-09/);
    await page.getByRole('tab', { name: '游戏管理', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: '数据总览', exact: true }).getAttribute('aria-selected'), 'true');
    await page.getByRole('tab', { name: '数据总览', exact: true }).focus();
    await page.keyboard.press('End');
    assert.equal(await page.getByRole('tab', { name: '数据总览', exact: true }).getAttribute('aria-selected'), 'true');
    await page.getByRole('tab', { name: '数据总览', exact: true }).focus();
    await page.keyboard.press('Home');
    assert.equal(await page.getByRole('tab', { name: '游戏管理', exact: true }).getAttribute('aria-selected'), 'true');
    assert.equal(await hasHorizontalOverflow(page), false);

    await page.goto(demoUrl('/P01-03?preview=approved'), { waitUntil: 'load' });
    assert.equal(await page.locator('.platform-verification-notice').count(), 0);
    assert.equal(await page.getByRole('button', { name: '审核通过', exact: true }).isVisible(), true);
    if (process.env.CAPTURE_PRD_ASSET === '1') await page.screenshot({ path: path.join(assetDir, 'P01-03-approved.png'), animations: 'disabled' });
    await page.goto(demoUrl('/P01-03?preview=rejected'), { waitUntil: 'load' });
    assert.match(await page.locator('.platform-verification-notice').innerText(), /企业认证未通过[\s\S]*工商执照证明图片不清晰[\s\S]*查看并修改/);
    assert.equal(await page.getByRole('button', { name: '异常（已下架）', exact: true }).isVisible(), true);
    if (process.env.CAPTURE_PRD_ASSET === '1') await page.screenshot({ path: path.join(assetDir, 'P01-03-rejected.png'), animations: 'disabled' });
    await page.goto(demoUrl('/P01-03?preview=delisted'), { waitUntil: 'load' });
    assert.match(await page.locator('.platform-verification-notice').innerText(), /企业发行合作资格已下架[\s\S]*企业主体信息发生变更[\s\S]*dev@xiaoji\.com/);
    assert.equal(await page.getByRole('button', { name: '重新提交认证', exact: true }).isVisible(), true);
    if (process.env.CAPTURE_PRD_ASSET === '1') await page.screenshot({ path: path.join(assetDir, 'P01-03-delisted.png'), animations: 'disabled' });
    await page.getByRole('button', { name: '重新提交认证', exact: true }).click();
    assert.equal(await page.locator('.platform-tab-bar').count(), 0);
    assert.equal(await page.locator('[data-qualification-form-page] [name="legalName"]').isEnabled(), true);
    assert.match(await page.locator('.qualification-repair-notice').innerText(), /企业主体信息发生变更/);
  } finally {
    await context.close();
  }
});

test('企业认证协议宽屏左右排列且移动端上下排列', async () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try {
      await page.goto(demoUrl('/P01-03?preview=rejected'), { waitUntil: 'load' });
      await page.getByRole('button', { name: '查看并修改', exact: true }).click();
      const agreements = page.locator('.agreement-stack .agreement-document');
      assert.equal(await agreements.count(), 2);
      const boxes = await agreements.evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return { left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width) };
      }));
      if (viewport.width > 760) {
        assert.equal(boxes[0].top, boxes[1].top);
        assert.ok(boxes[1].left > boxes[0].left + boxes[0].width);
      } else {
        assert.ok(boxes[1].top > boxes[0].top);
        assert.equal(boxes[0].left, boxes[1].left);
      }
    } finally {
      await context.close();
    }
  }
});

test('运营后台侧栏在 HTMLPreview Base 环境下仍使用站内路由', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-08?preview=pending'), { waitUntil: 'load' });
    await page.evaluate(() => {
      const base = document.createElement('base');
      base.href = 'https://cdn.jsdelivr.net/gh/example/demo.html';
      document.head.prepend(base);
    });
    await page.getByRole('link', { name: '企业认证内容配置', exact: true }).click();
    await page.waitForFunction(() => location.hash === '#/P01-09');
    assert.equal(new URL(page.url()).protocol, 'file:');
    assert.equal(await page.locator('[data-managed-content]').isVisible(), true);
    assert.equal(await page.getByRole('link', { name: '企业认证内容配置', exact: true }).getAttribute('aria-current'), 'page');
  } finally {
    await context.close();
  }
});

test('审核中申请可撤回并保留资料重新提交', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-03?preview=pending'), { waitUntil: 'load' });
    await page.getByRole('button', { name: '查看详情', exact: true }).click();
    await page.getByRole('button', { name: '撤回申请', exact: true }).click();
    assert.equal(await page.locator('.platform-tab-bar').count(), 0);
    assert.equal(await page.locator('[data-qualification-form-page] [name="legalName"]').isEnabled(), true);
    assert.equal(await page.getByRole('button', { name: '提交审核', exact: true }).isVisible(), true);
    assert.equal((await page.locator('[data-runtime-result]').innerText()).trim(), '');
    assert.equal(await page.getByRole('button', { name: '认证介绍', exact: true }).count(), 0);
    assert.equal(await page.locator('.qualification-repair-notice').count(), 0);
    assert.equal(await page.getByText('本次审核意见', { exact: true }).count(), 0);
  } finally {
    await context.close();
  }
});

test('拒绝后重新提交进入审核中再撤回不会残留审核意见', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-03?preview=rejected'), { waitUntil: 'load' });
    await page.getByRole('button', { name: '查看并修改', exact: true }).click();
    await page.locator('#agreement-accepted').check();
    await page.getByRole('button', { name: '提交审核', exact: true }).click();
    await page.getByRole('button', { name: '查看详情', exact: true }).click();
    await page.getByRole('button', { name: '撤回申请', exact: true }).click();
    assert.equal((await page.locator('[data-runtime-result]').innerText()).trim(), '');
    assert.equal(await page.locator('.qualification-repair-notice').count(), 0);
    assert.equal(await page.getByText('本次审核意见', { exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: '认证介绍', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: '提交审核', exact: true }).isVisible(), true);
  } finally {
    await context.close();
  }
});

test('审核详情展示固定通知模板且原因仅平台内可见', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-08?preview=pending'), { waitUntil: 'load' });
    assert.equal(await page.locator('[data-qualification-review-row]').count(), 1);
    await page.getByRole('button', { name: '查看详情', exact: true }).click();
    assert.equal(await page.locator('[data-review-detail]').isVisible(), true);
    assert.equal(await page.locator('.review-notification-grid').isVisible(), true);
    if (process.env.CAPTURE_PRD_ASSET === '1') await page.screenshot({ path: path.join(assetDir, 'P01-08-notification.png'), animations: 'disabled', fullPage: true });
    const pendingNotification = await page.locator('.review-notification-grid').innerText();
    assert.match(pendingNotification, /短信文案[\s\S]*邮件文案[\s\S]*https:\/\/developer\.xiaoji\.com/);

    await page.getByRole('button', { name: '通过', exact: true }).last().click();
    await page.getByRole('button', { name: '确认通过', exact: true }).click();
    assert.equal(await page.locator('.operations-review').getAttribute('data-review-status'), 'approved');
    const approvedNotification = await page.locator('.review-notification-grid').innerText();
    assert.match(approvedNotification, /已通过审核[\s\S]*https:\/\/developer\.xiaoji\.com/);

    await page.getByRole('button', { name: '下架发行资格', exact: true }).click();
    await page.getByLabel('下架原因').fill('发现企业主体信息发生变更，请联系开发者支持确认恢复条件。');
    await page.getByRole('button', { name: '确认下架', exact: true }).click();
    assert.equal(await page.locator('.operations-review').getAttribute('data-review-status'), 'delisted');
    const delistedNotification = await page.locator('.review-notification-grid').innerText();
    assert.match(delistedNotification, /发行资格已被下架[\s\S]*https:\/\/developer\.xiaoji\.com/);
    assert.doesNotMatch(delistedNotification, /企业主体信息发生变更/);
    assert.match(await page.locator('.review-platform-only-note').innerText(), /具体原因仅在平台内展示[\s\S]*企业主体信息发生变更/);
  } finally {
    await context.close();
  }
});

test('企业认证内容配置使用独立文章列表且不提供排序', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-09?role=operations'), { waitUntil: 'load' });
    assert.deepEqual(
      await page.locator('.content-article-list thead th').allTextContents(),
      ['文章标题／唯一编号', '文章位置', '多语言', '发布状态', '更新时间', '操作'],
    );
    assert.equal(await page.getByRole('button', { name: '保存并生效', exact: true }).count(), 0);
    assert.equal(await page.getByText('已发布', { exact: true }).count(), 3);
    for (const position of ['认证介绍', '保密协议', '合作协议']) assert.equal(await page.getByText(position, { exact: true }).isVisible(), true);
    assert.equal(await page.getByRole('button', { name: '上移', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: '下移', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: '新建文章', exact: true }).isVisible(), true);
    if (process.env.CAPTURE_PRD_ASSET === '1') {
      fs.mkdirSync(assetDir, { recursive: true });
      await page.screenshot({ path: path.join(assetDir, 'P01-09-list.png'), animations: 'disabled' });
    }
    await page.getByRole('button', { name: '编辑', exact: true }).first().click();
    assert.equal(await page.getByLabel('唯一编号').isDisabled(), true);
    assert.equal(await page.getByLabel('文章位置').isDisabled(), true);
    assert.equal(await page.locator('[data-rich-editor-body]').isVisible(), true);
    assert.equal(await hasHorizontalOverflow(page), false);
    if (process.env.CAPTURE_PRD_ASSET === '1') {
      await page.screenshot({ path: path.join(assetDir, 'P01-09-editor.png'), animations: 'disabled' });
    }
    await page.getByRole('button', { name: 'English', exact: true }).click();
    assert.equal(await page.getByLabel('Article title').isVisible(), true);
    await page.getByRole('button', { name: 'Back to list', exact: true }).click();
    const editedArticleRow = page.locator('[data-content-list="certification"] tbody tr').first();
    assert.equal(await editedArticleRow.getByText('Draft', { exact: true }).isVisible(), true);
    await editedArticleRow.getByRole('button', { name: 'Publish', exact: true }).click();
    assert.match(await page.locator('[data-runtime-result]').innerText(), /已发布/);
    await page.getByRole('button', { name: '中文', exact: true }).click();
    await page.getByPlaceholder('输入文章标题或唯一编号').fill('CERT-ARTICLE-002');
    await page.getByRole('button', { name: '查询', exact: true }).click();
    assert.equal(await page.locator('[data-content-list="certification"] tbody tr').count(), 1);
    await page.getByRole('button', { name: '重置', exact: true }).click();
    await page.getByRole('button', { name: '新建文章', exact: true }).click();
    assert.match(await page.locator('[data-runtime-result]').innerText(), /暂无可创建的文章位置/);
  } finally {
    await context.close();
  }
});

test('帮助中心独立页面支持导航目录和目录子文档双语 CRUD 与排序约束', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl('/P01-10?role=operations'), { waitUntil: 'load' });
    assert.deepEqual(await page.getByRole('tab').allTextContents(), ['导航目录', '目录子文档']);
    assert.deepEqual(await page.locator('.content-article-list thead th').allTextContents(), ['导航名称／唯一编号', '多语言', '子文档', '发布状态', '更新时间', '操作']);
    assert.equal(await page.getByRole('button', { name: '新建导航', exact: true }).isVisible(), true);
    assert.ok(await page.getByRole('button', { name: '上移', exact: true }).count() > 0);
    if (process.env.CAPTURE_PRD_ASSET === '1') await page.screenshot({ path: path.join(assetDir, 'P01-10-help-navigation.png'), animations: 'disabled' });

    const navigationOrderBefore = await page.locator('[data-content-list="navigation"] tbody tr .content-document-cell small').allTextContents();
    await page.locator('[data-content-list="navigation"] [data-content-direction="down"]:not([disabled])').first().click();
    const navigationOrderAfter = await page.locator('[data-content-list="navigation"] tbody tr .content-document-cell small').allTextContents();
    assert.notDeepEqual(navigationOrderAfter, navigationOrderBefore);

    await page.getByRole('button', { name: '删除', exact: true }).first().click();
    await page.getByRole('button', { name: '确认删除', exact: true }).click();
    assert.match(await page.locator('[data-runtime-result]').innerText(), /仍有子文档，无法删除/);

    await page.getByRole('button', { name: '新建导航', exact: true }).click();
    const navigationId = await page.locator('.content-article-editor header p').innerText();
    assert.match(navigationId, /^HC-NAV-\d{3}$/);
    assert.equal(await page.getByLabel('唯一编号').isDisabled(), true);
    await page.getByLabel('导航名称').fill('新手指南');
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByLabel('Navigation title').fill('Getting started');
    await page.getByRole('button', { name: 'Back to list', exact: true }).click();
    assert.equal(await page.getByText('Getting started', { exact: true }).isVisible(), true);
    const newNavigationRow = page.locator('[data-content-list="navigation"] tbody tr').filter({ hasText: navigationId });
    assert.equal(await newNavigationRow.getByText('Draft', { exact: true }).isVisible(), true);
    await newNavigationRow.getByRole('button', { name: 'Publish', exact: true }).click();
    assert.equal(await newNavigationRow.getByText('Published', { exact: true }).isVisible(), true);

    await page.getByRole('tab', { name: '目录子文档', exact: true }).click();
    assert.deepEqual(await page.locator('.content-article-list thead th').allTextContents(), ['文档标题／唯一编号', '所属导航', '多语言', '发布状态', '更新时间', '操作']);
    assert.equal(await page.getByRole('button', { name: '新建子文档', exact: true }).isVisible(), true);
    assert.ok(await page.locator('[data-content-navigation-filter]').count() === 1);
    if (process.env.CAPTURE_PRD_ASSET === '1') await page.screenshot({ path: path.join(assetDir, 'P01-10-help-document.png'), animations: 'disabled' });
    const documentOrderBefore = await page.locator('[data-content-list="document"] tbody tr .content-document-cell small').allTextContents();
    const movableDocument = page.locator('[data-content-list="document"] [data-content-direction="down"]:not([disabled])').first();
    const movedDocumentId = await movableDocument.getAttribute('data-content-id');
    await movableDocument.click();
    const documentOrderAfter = await page.locator('[data-content-list="document"] tbody tr .content-document-cell small').allTextContents();
    assert.equal(documentOrderAfter.indexOf(movedDocumentId), documentOrderBefore.indexOf(movedDocumentId) + 1);
    await page.getByRole('button', { name: '新建子文档', exact: true }).click();
    const documentId = await page.locator('.content-article-editor header p').innerText();
    assert.match(documentId, /^HC-DOC-\d{3}$/);
    assert.notEqual(documentId, navigationId);
    assert.equal(await page.getByLabel('Navigation').isVisible(), true);
    assert.equal(await page.locator('[data-rich-editor-body]').isVisible(), true);
    if (process.env.CAPTURE_PRD_ASSET === '1') await page.screenshot({ path: path.join(assetDir, 'P01-10-help-editor.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'Back to list', exact: true }).click();
    const newDocumentRow = page.locator('[data-content-list="document"] tbody tr').filter({ hasText: documentId });
    assert.equal(await newDocumentRow.getByText('Draft', { exact: true }).isVisible(), true);
    assert.equal(await newDocumentRow.getByRole('button', { name: 'Publish', exact: true }).isVisible(), true);
    assert.equal(await hasHorizontalOverflow(page), false);
  } finally {
    await context.close();
  }
});

for (const viewport of [{ width: 320, height: 760 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}px 下首页、登录、控制台、帮助中心和内容配置无根节点横向溢出`, async () => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try {
      await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
      assert.equal(await hasHorizontalOverflow(page), false);
      await page.getByRole('button', { name: '登录', exact: true }).first().click();
      assert.equal(await page.getByRole('dialog', { name: '开发者中心登录' }).isVisible(), true);
      assert.equal(await hasHorizontalOverflow(page), false);

      await page.goto(demoUrl('/P01-03?preview=approved'), { waitUntil: 'load' });
      await page.reload({ waitUntil: 'load' });
      assert.equal(await hasHorizontalOverflow(page), false);
      await page.locator('[data-help-open]').click();
      assert.equal(await page.locator('[data-help-center]').isVisible(), true);
      assert.equal(await hasHorizontalOverflow(page), false);

      await page.goto(demoUrl('/P01-09?role=operations'), { waitUntil: 'load' });
      await page.reload({ waitUntil: 'load' });
      assert.equal(await page.locator('[data-managed-content]').isVisible(), true);
      const listWidth = await page.locator('.content-article-list .operations-table-wrap').evaluate(node => ({
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
      }));
      assert.equal(listWidth.scrollWidth <= listWidth.clientWidth, true);
      assert.equal(await page.getByRole('button', { name: '新建文章', exact: true }).isVisible(), true);
      assert.equal(await page.getByRole('link', { name: '企业认证内容配置', exact: true }).isVisible(), true);
      assert.equal(await page.getByRole('link', { name: '帮助中心', exact: true }).isVisible(), true);
      assert.equal(await hasHorizontalOverflow(page), false);

      await page.goto(demoUrl('/P01-10?role=operations'), { waitUntil: 'load' });
      assert.deepEqual(await page.getByRole('tab').allTextContents(), ['导航目录', '目录子文档']);
      await page.getByRole('tab', { name: '目录子文档', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: '新建子文档', exact: true }).isVisible(), true);
      assert.equal(await hasHorizontalOverflow(page), false);
    } finally {
      await context.close();
    }
  });
}

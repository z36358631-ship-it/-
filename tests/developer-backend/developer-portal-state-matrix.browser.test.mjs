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
const entryFiles = [
  '01-开发者平台与资料demo.html',
  '02-游戏创建与发行demo.html',
];
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));
const unifiedRoutes = ['P01-01', 'P01-03', 'P01-08', 'P01-09', 'P01-10', 'P02-01'];

let browser;

const demoUrl = (entryFile, hash) => {
  const url = pathToFileURL(path.join(demoDir, entryFile));
  url.hash = hash;
  return url.href;
};

const seedAccount = async (page, status, accountKey = `matrix:${status}`, entryFile = entryFiles[1]) => {
  await page.goto(demoUrl(entryFile, '/P01-01'), { waitUntil: 'load' });
  await page.evaluate(({ key, qualificationStatus }) => {
    localStorage.clear();
    sessionStorage.clear();
    window.name = '';
    const submitted = qualificationStatus !== 'unsubmitted';
    const submittedAt = submitted ? '2026-09-02 10:30' : '';
    const form = {
      subjectType: '公司／企业', region: '中国大陆', legalName: '状态矩阵测试企业',
      registrationNumber: '91440000TEST000001', registeredAddress: '深圳市南山区测试路 1 号',
      businessLicenseName: '营业执照.jpg', bankAccountName: '状态矩阵测试企业', bankName: '测试银行',
      bankAccountNumber: '6222000000000001', bankBranch: '测试银行深圳支行', bankProofName: '开户证明.jpg',
      vendorName: '状态矩阵工作室', vendorIntro: '用于开发者后台状态验收。', contactName: '测试员',
      email: 'qa@example.test', signatoryName: '测试员', signatoryTitle: '负责人', agreementAccepted: true,
    };
    const currentSubmission = submitted ? {
      applicationId: `ENT-${qualificationStatus.toUpperCase()}`,
      revision: 1,
      submittedAt,
      acceptedContentRevision: 1,
      form,
    } : null;
    sessionStorage.setItem('gamehub-developer-session-v1', JSON.stringify({ authenticated: true, accountKey: key }));
    localStorage.setItem('gamehub-developer-account-states-v1', JSON.stringify({
      [key]: {
        registration: {
          accountTier: qualificationStatus === 'approved' ? 'enterprise' : 'registered',
          registeredAt: '2026-09-01 09:00',
          consoleTab: 'games',
        },
        qualification: {
          applicationId: `ENT-${qualificationStatus.toUpperCase()}`,
          status: qualificationStatus,
          step: submitted ? 5 : 0,
          view: 'intro',
          editing: false,
          revision: submitted ? 1 : 0,
          submittedAt,
          rejectReason: qualificationStatus === 'rejected' ? '工商执照图片不清晰，请重新上传。' : '',
          delistReason: qualificationStatus === 'delisted' ? '企业主体信息发生变更。' : '',
          form,
          currentSubmission,
          submissions: currentSubmission ? [currentSubmission] : [],
          history: submitted ? [{ action: '提交企业认证申请 REV-01', actor: '测试开发者', time: submittedAt }] : [],
        },
      },
    }));
  }, { key: accountKey, qualificationStatus: status });
  // file:// hash navigation is same-document and would keep the pre-seed in-memory
  // session. Replace the target hash and reload so the app restores the seeded
  // account exactly as a newly opened 02 entry would.
  await page.evaluate(() => history.replaceState(null, '', '#/P02-01'));
  await page.reload({ waitUntil: 'load' });
};

const openGame = async (page, gameKey = 'draft') => {
  await page.locator('[data-publisher-workspace][data-workspace-view="games"]').waitFor();
  await page.locator(`[data-portal-action="enter-publisher-game"][data-publisher-game="${gameKey}"]`).first().click();
  await page.locator(`[data-publisher-game-console][data-selected-game="${gameKey}"]`).waitFor();
};

const openDraftGame = page => openGame(page, 'draft');

const openGameSection = async (page, section) => {
  await page.locator(`[data-portal-action="game-console-section"][data-game-section="${section}"]`).click();
  await page.locator(`[data-publisher-profile][data-profile-module="${section}"]`).waitFor();
};

const horizontalOverflow = page => page.evaluate(() => ({
  document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  body: document.body.scrollWidth - document.body.clientWidth,
}));

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  browser = await chromium.launch({
    headless: true,
    executablePath: chrome,
    args: ['--allow-file-access-from-files', '--disable-background-networking'],
  });
});

after(async () => { await browser?.close(); });

test('01 与 02 两个正式入口公开相同路由并兼容统一登录门禁', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    for (const entryFile of entryFiles) {
      await page.goto(demoUrl(entryFile, '/P02-01'), { waitUntil: 'load' });
      await page.waitForURL(/#\/P01-01$/);
      const routes = await page.locator('#portal-routes').evaluate(node => JSON.parse(node.value).map(route => route.id));
      assert.deepEqual(routes, unifiedRoutes);
      assert.equal(await page.locator('[data-publisher-workspace]').count(), 0);

      await seedAccount(page, 'approved', `entry:${entryFile}`, entryFile);
      await page.locator('[data-publisher-workspace][data-publisher-access="enterprise"]').waitFor();
      assert.match(page.url(), /#\/P02-01$/);
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); window.name = ''; });
    }
  } finally { await context.close(); }
});

for (const [status, kind] of [
  ['unsubmitted', 'personal'],
  ['pending', 'personal'],
  ['rejected', 'personal'],
  ['approved', 'enterprise'],
  ['delisted', 'suspended'],
]) test(`${status} 企业认证状态映射为 ${kind} 发行权限`, async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await seedAccount(page, status);
    const workspace = page.locator(`[data-publisher-workspace][data-publisher-access="${kind}"]`);
    await workspace.waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('gamehub-developer-session-v2') || 'null')?.qualificationStatus), status);
    assert.equal(await page.locator('[data-portal-action="open-add-game"]').isDisabled(), status === 'delisted');
    assert.deepEqual(await page.locator('.publisher-console-sidebar [data-publisher-view]').allTextContents(), ['游戏管理', '厂商设置']);
    const vendorEntry = page.locator('[data-publisher-view="vendor"]');
    assert.equal(await vendorEntry.count(), 1);
    await vendorEntry.click();
    await page.locator('[data-publisher-page="vendor"]').waitFor();
    assert.equal(await page.locator('[data-publisher-workspace]').getAttribute('data-workspace-view'), 'vendor');
    if (status === 'approved') {
      assert.equal(await page.locator('[data-publisher-vendor-restriction]').count(), 0);
      assert.match(await page.locator('[data-publisher-page="vendor"]').innerText(), /厂商设置功能占位/);
    } else {
      const restriction = page.locator(`[data-publisher-vendor-restriction="${status}"]`);
      assert.equal(await restriction.count(), 1);
      assert.match(await restriction.innerText(), status === 'delisted' ? /开发者资格已暂停[\s\S]*查看认证详情/ : /完成开发者认证后才可进行厂商设置/);
      assert.equal(await restriction.locator('[data-portal-action="publisher-enterprise-verification"]').count(), 1);
    }
  } finally { await context.close(); }
});

test('个人开发者三个 Tab 为可保存草稿、无发布记录和只读资质要求', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await seedAccount(page, 'unsubmitted');
    await openDraftGame(page);

    assert.deepEqual(
      await page.locator('[data-portal-action="game-console-section"]').allTextContents(),
      ['版本发布', '发布记录', '资质认证'],
    );
    const release = page.locator('[data-publisher-profile][data-profile-module="release-workspace"]');
    const restriction = release.locator('[data-publisher-restriction="unsubmitted"]');
    assert.match(await restriction.innerText(), /提交申请前，请先完成开发者认证[\s\S]*申请开发者认证/);
    assert.equal(await restriction.locator('small').count(), 0);
    assert.equal(await release.locator('[data-profile-save]').isEnabled(), true);
    assert.equal(await release.locator('[data-profile-submit]').isDisabled(), true);
    await release.locator('[data-profile-save]').click();
    await assert.doesNotReject(() => release.locator('[data-profile-save-state]').waitFor({ state: 'visible' }));
    await page.waitForFunction(() => /已保存/.test(document.querySelector('[data-profile-save-state]')?.textContent || ''));

    await openGameSection(page, 'versions');
    assert.equal(await page.locator('[data-personal-release-empty]').isVisible(), true);
    assert.match(await page.locator('[data-personal-release-empty]').innerText(), /暂无发布记录[\s\S]*完成企业认证并提交版本后/);
    assert.equal(await page.locator('[data-version-record]').count(), 0);

    await openGameSection(page, 'qualifications');
    assert.match(await page.locator('[data-publisher-restriction="unsubmitted"]').innerText(), /申请开发者认证/);
    assert.equal(await page.locator('[data-qualification-region-card]').count(), 2);
    assert.equal(await page.locator('[data-qualification-profile] input[type="file"]').count(), 0);
    const qualificationActions = page.locator('[data-qualification-region-open]');
    assert.equal(await qualificationActions.count(), 2);
    assert.deepEqual(await qualificationActions.allTextContents(), ['填写并提审', '填写并提审']);
    assert.equal(await qualificationActions.evaluateAll(buttons => buttons.every(button => button.disabled)), true);
    assert.equal(await page.getByText('仅可查看要求', { exact: true }).count(), 0);
  } finally { await context.close(); }
});

for (const [status, copy, action] of [
  ['pending', '企业认证审核中，审核通过后可提交发布审核', '查看认证进度'],
  ['rejected', '企业认证未通过，请按审核意见修改', '修改认证资料'],
]) test(`${status} 状态展示对应认证说明并返回 P01-03 顶部`, async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await seedAccount(page, status);
    await openGame(page, 'existing');
    const banner = page.locator(`[data-publisher-restriction="${status}"]`);
    assert.match(await banner.innerText(), new RegExp(`${copy}[\\s\\S]*${action}`));
    await page.locator('.workspace').evaluate(node => { node.scrollTop = Math.max(400, node.scrollHeight); });
    await banner.getByRole('button', { name: action, exact: true }).click();
    await page.waitForURL(/#\/P01-03$/);
    const scroll = await page.evaluate(() => ({ window: window.scrollY, workspace: document.querySelector('.workspace')?.scrollTop || 0 }));
    assert.deepEqual(scroll, { window: 0, workspace: 0 });
  } finally { await context.close(); }
});

test('企业开发者拥有发布、记录、游戏资质和厂商管理能力', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await seedAccount(page, 'approved');
    const vendorEntry = page.locator('[data-publisher-view="vendor"]');
    await vendorEntry.waitFor();
    await vendorEntry.click();
    assert.equal(await page.locator('[data-publisher-page="vendor"]').isVisible(), true);
    await page.locator('[data-publisher-view="games"]').click();
    await openDraftGame(page);

    const release = page.locator('[data-publisher-profile][data-profile-module="release-workspace"]');
    assert.equal(await release.locator('[data-publisher-restriction]').count(), 0);
    assert.equal(await release.locator('[data-profile-save]').isEnabled(), true);
    assert.equal(await release.locator('[data-profile-submit]').isEnabled(), true);

    await openGameSection(page, 'versions');
    assert.equal(await page.locator('[data-personal-release-empty]').count(), 0);
    assert.ok(await page.locator('[data-version-record]').count() > 0);

    await openGameSection(page, 'qualifications');
    assert.equal(await page.locator('[data-publisher-restriction]').count(), 0);
    assert.equal(await page.locator('[data-qualification-region-open]').count(), 2);
    await page.locator('[data-qualification-region-open="global"]').click();
    assert.equal(await page.locator('[data-qualification-editor]').isVisible(), true);
    assert.ok(await page.locator('[data-qualification-profile] input[type="file"]').count() > 0);
    assert.equal(await page.locator('[data-qualification-submit]').isEnabled(), true);
  } finally { await context.close(); }
});

test('资格暂停账号只能查看历史，版本和资质均不可编辑', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await seedAccount(page, 'delisted');
    await page.locator('[data-publisher-workspace][data-publisher-access="suspended"]').waitFor();
    assert.equal(await page.locator('[data-publisher-view="vendor"]').count(), 1);
    await openDraftGame(page);
    const release = page.locator('[data-publisher-profile][data-profile-module="release-workspace"]');
    assert.match(await release.locator('[data-publisher-restriction="delisted"]').innerText(), /企业发行权限已暂停[\s\S]*只读状态/);
    assert.equal(await release.locator('[data-profile-locked]').count(), 1);
    assert.equal(await release.locator('[data-profile-save]').isDisabled(), true);
    assert.equal(await release.locator('[data-profile-submit]').isDisabled(), true);

    await openGameSection(page, 'versions');
    assert.equal(await page.locator('[data-personal-release-empty]').count(), 0);
    assert.ok(await page.locator('[data-version-record]').count() > 0, '资格暂停前的版本历史仍应只读可见');
    await openGameSection(page, 'qualifications');
    assert.equal(await page.locator('[data-qualification-profile] input[type="file"]').count(), 0);
    const qualificationActions = page.locator('[data-qualification-region-open]');
    assert.equal(await qualificationActions.count(), 2);
    assert.equal(await qualificationActions.evaluateAll(buttons => buttons.every(button => button.disabled)), true);
  } finally { await context.close(); }
});

test('02 工作台中英文切换生效且语言按钮显示目标语言', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await seedAccount(page, 'approved');
    await openDraftGame(page);
    const switcher = page.locator('[data-portal-action="toggle-interface-language"]');
    assert.equal(await switcher.innerText(), '英语');
    await switcher.click();
    await page.locator('[data-publisher-profile][data-profile-language="en"]').waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(await page.locator('[data-profile-module="release-workspace"] .pgp-title h2').innerText(), 'Version release');
    assert.deepEqual(
      await page.locator('[data-portal-action="game-console-section"]').allTextContents(),
      ['Version release', 'Version records', 'Qualifications'],
    );
    assert.equal(await page.locator('[data-portal-action="toggle-interface-language"]').innerText(), '中文');
  } finally { await context.close(); }
});

test('390px 下个人开发者三个 Tab 与认证提示没有页面级横向溢出', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await seedAccount(page, 'pending');
    await openDraftGame(page);
    assert.deepEqual(await horizontalOverflow(page), { document: 0, body: 0 });
    for (const section of ['versions', 'qualifications', 'release-workspace']) {
      await openGameSection(page, section);
      assert.deepEqual(await horizontalOverflow(page), { document: 0, body: 0 }, section);
    }
  } finally { await context.close(); }
});

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demoFile = path.join(root, 'demos', '开发者后台一期', '06-游戏商品资料与发行范围demo.html');
const evidenceDir = path.join(root, 'tests', 'developer-backend', 'evidence', 'game-profile-release');
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

const openReleaseEditor = async page => {
  await page.locator('[data-action="store-section"][data-section="release-scope"]').click();
  await page.getByRole('button', { name: '编辑发行范围', exact: true }).click();
};

const confirmCurrentReleaseDraft = async page => {
  await page.getByRole('button', { name: '保存并确认范围', exact: true }).click();
  assert.equal(await page.getByText('发行范围检查通过', { exact: true }).isVisible(), true);
};

const addMainlandToReleaseDraft = async page => {
  await openReleaseEditor(page);
  await page.getByRole('button', { name: '选择国家／地区', exact: true }).click();
  await page.locator('[data-market-code="CN"]').check();
  await page.getByRole('button', { name: '确认选择', exact: true }).click();
  assert.equal(await page.locator('.d6-market-tag.mainland').getByText('中国大陆', { exact: true }).isVisible(), true);
  await confirmCurrentReleaseDraft(page);
};

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  fs.mkdirSync(evidenceDir, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files', '--disable-background-networking'] });
});

after(async () => { await browser?.close(); });

test('企业开发者从概览进入资料线并生成海外发行审核快照', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(demoUrl('/P06-01'), { waitUntil: 'load' });
    assert.equal(await page.getByRole('heading', { name: '星海远征发行概览', exact: true }).isVisible(), true, '进入单游戏工作台后应先落在概览');
    assert.equal(await page.locator('.d6-main.is-game > .d6-game-sidebar').count(), 1, '进入游戏后应使用单一游戏侧边栏');
    assert.equal(await page.locator('.d6-main.is-game > .d6-secondary').count(), 0, '发行准备子菜单不应继续占用第二侧栏');
    assert.equal(await page.locator('.d6-breadcrumb').isVisible(), true, '一级页面应保留面包屑');
    assert.equal(await page.locator('.d6-game-sidebar [data-action="back-games"]').count(), 0, '面包屑已有返回入口，侧边栏不应重复展示');
    assert.equal(await page.locator('.d6-game-sidebar-current').count(), 0, '面包屑已有游戏名称，侧边栏不应重复展示');
    assert.equal(await page.locator('.d6-breadcrumb [data-action="back-games"]').isVisible(), true, '返回游戏管理入口应保留在面包屑中');
    assert.equal(await page.locator('.d6-breadcrumb').getByText('星海远征', { exact: true }).isVisible(), true, '当前游戏名称应保留在面包屑中');
    assert.equal(await page.locator('.d6-brand-mark svg[viewBox="0 0 36 36"] path').count(), 1, '顶部应使用既有品牌图标');

    const navSearch = page.getByRole('searchbox', { name: '搜索侧边栏功能', exact: true });
    assert.equal(await navSearch.isVisible(), true, '游戏侧边栏应支持功能搜索');
    await navSearch.fill('SKU');
    assert.equal(await page.locator('[data-action="store-section"][data-section="products"]').isVisible(), true, '搜索结果应保留匹配的发行准备子项');
    assert.equal(await page.locator('[data-action="main-tab"][data-tab="operations"]').isHidden(), true, '搜索结果应隐藏不匹配的一级模块');
    await navSearch.fill('');

    await page.locator('[data-action="store-section"][data-section="profile"]').click();
    assert.equal(await page.getByRole('heading', { name: '游戏资料', exact: true }).isVisible(), true);
    await page.screenshot({ path: path.join(evidenceDir, '06-profile-1440x900.png'), fullPage: true });

    await page.locator('[data-action="store-section"][data-section="qualification"]').click();
    const qualificationText = await page.locator('main').innerText();
    assert.match(qualificationText, /不影响海外发行/);
    assert.match(qualificationText, /软件著作权/);
    assert.match(qualificationText, /中国大陆出版审批/);
    await page.screenshot({ path: path.join(evidenceDir, '06-qualification-mainland-1440x900.png') });

    await page.locator('[data-action="store-section"][data-section="products"]').click();
    assert.equal(await page.getByText('价格由定价模块维护。', { exact: false }).isVisible(), true);
    assert.equal(await page.getByRole('button', { name: '编辑价格', exact: true }).count(), 0);

    await page.getByRole('button', { name: '申请平台测试／发行', exact: true }).click();
    const scopeGate = page.locator('.d6-gate-item').filter({ hasText: '发行范围' });
    assert.match(await scopeGate.innerText(), /发行范围尚未确认/);
    await scopeGate.getByRole('button', { name: '前往完善', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: '编辑发行范围', exact: true }).isVisible(), true);

    await page.getByRole('button', { name: '选择国家／地区', exact: true }).click();
    assert.equal(await page.getByText('常用市场', { exact: true }).isVisible(), true);
    await page.screenshot({ path: path.join(evidenceDir, '06-market-picker-1440x900.png'), fullPage: true });
    const marketSearch = page.getByRole('searchbox', { name: '搜索国家或地区', exact: true });
    await marketSearch.fill('KR');
    assert.equal(await page.locator('[data-market-code="KR"]').isVisible(), true, '完整国家库应支持按代码搜索');
    await page.locator('[data-market-code="KR"]').check();
    await page.getByRole('button', { name: '确认选择', exact: true }).click();

    await page.locator('input[name="platforms"][value="macOS"]').uncheck();
    await page.locator('#releaseAt').fill('2026-11-20T14:30');
    await page.getByRole('button', { name: '保存并继续申请', exact: true }).click();
    assert.equal(await page.getByText('全部检查已通过。', { exact: false }).isVisible(), true);
    assert.equal(await page.locator('.d6-gate-item').filter({ hasText: '价格状态' }).count(), 0, '先锋测试不应强制销售价格');
    await page.locator('[data-action="choose-stage"][data-stage="prerelease"]').click();
    assert.equal(await page.locator('.d6-gate-item').filter({ hasText: '价格状态' }).count(), 1, '预发布需要价格状态');
    assert.equal(await page.locator('.d6-gate-item').filter({ hasText: '中国大陆发行资质' }).count(), 0, '海外范围不应触发大陆版号门禁');
    await page.locator('[data-action="choose-stage"][data-stage="pioneer"]').click();
    await page.locator('.d6-dialog-foot [data-action="close-application"]').click();
    assert.match(await page.locator('main').innerText(), /韩国/);
    assert.match(await page.locator('main').innerText(), /Windows \/ Linux/);
    assert.match(await page.locator('main').innerText(), /2026-11-20 14:30/);

    await page.getByRole('button', { name: '申请平台测试／发行', exact: true }).click();
    await page.getByRole('button', { name: '提交审核快照', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: '发行申请已提交', exact: true }).isVisible(), true);
    await page.getByRole('button', { name: '返回发行概览', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: '星海远征发行概览', exact: true }).isVisible(), true);
    assert.match(await page.locator('main').innerText(), /RELEASE-20260905-004/);
    assert.match(await page.locator('main').innerText(), /2026-11-20 14:30/);

    await page.locator('[data-action="store-section"][data-section="release-scope"]').click();
    await page.getByRole('button', { name: '编辑发行范围', exact: true }).click();
    await page.locator('#releaseAt').fill('2026-12-18T09:00');
    await page.getByRole('button', { name: '保存并确认范围', exact: true }).click();
    assert.match(await page.locator('main').innerText(), /2026-12-18 09:00/);
    await page.locator('[data-action="main-tab"][data-tab="overview"]').click();
    const overviewText = await page.locator('main').innerText();
    assert.match(overviewText, /2026-11-20 14:30/, '历史审核快照应保留提交时的发行时间');
    assert.doesNotMatch(overviewText, /2026-12-18 09:00/, '后续草稿不应覆盖历史审核快照');

    await page.locator('.d6-breadcrumb [data-action="back-games"]').click();
    assert.equal(await page.getByRole('heading', { name: '我的游戏', exact: true }).isVisible(), true);
    await page.locator('.d6-game-item[data-action="enter-game"]').click();
    assert.equal(await page.getByRole('heading', { name: '星海远征发行概览', exact: true }).isVisible(), true);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert.equal(overflow, false);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('国家选择器区分中国大陆、香港、台湾，并在取消后保留原草稿', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(demoUrl('/P06-01'), { waitUntil: 'load' });
    await openReleaseEditor(page);
    await page.getByRole('button', { name: '选择国家／地区', exact: true }).click();
    assert.equal(await page.locator('[data-market-code="CN"]').isChecked(), false);
    assert.equal(await page.locator('[data-market-code="HK"]').isChecked(), true);
    assert.equal(await page.locator('[data-market-code="TW"]').isChecked(), true);
    await page.locator('[data-market-code="CN"]').check();
    await page.getByRole('button', { name: '取消', exact: true }).last().click();

    await page.getByRole('button', { name: '选择国家／地区', exact: true }).click();
    assert.equal(await page.locator('[data-market-code="CN"]').isChecked(), false, '取消国家选择不应修改发行范围草稿');
    const marketSearch = page.getByRole('searchbox', { name: '搜索国家或地区', exact: true });
    await marketSearch.fill('中国大陆');
    assert.equal(await page.locator('[data-market-code="CN"]').isVisible(), true);
    assert.equal(await page.locator('[data-market-code="HK"]').isHidden(), true);
    await marketSearch.fill('');
    await page.locator('[data-market-code="CN"]').check();
    await page.getByRole('button', { name: '确认选择', exact: true }).click();
    assert.equal(await page.locator('.d6-market-tag').getByText('中国大陆', { exact: true }).isVisible(), true);
    assert.equal(await page.locator('.d6-market-tag').getByText('中国香港', { exact: true }).isVisible(), true);
    assert.equal(await page.locator('.d6-market-tag').getByText('中国台湾', { exact: true }).isVisible(), true);
  } finally { await page.close(); }
});

test('无版号海外范围可提交预发布申请', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(demoUrl('/P06-01'), { waitUntil: 'load' });
    await openReleaseEditor(page);
    await confirmCurrentReleaseDraft(page);
    await page.getByRole('button', { name: '申请平台测试／发行', exact: true }).click();
    await page.locator('[data-action="choose-stage"][data-stage="prerelease"]').click();
    assert.equal(await page.locator('.d6-gate-item').filter({ hasText: '中国大陆发行资质' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: '提交审核快照', exact: true }).isEnabled(), true);
    await page.getByRole('button', { name: '提交审核快照', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: '发行申请已提交', exact: true }).isVisible(), true);
  } finally { await page.close(); }
});

test('大陆资质未通过时可仅提交海外范围，且不修改含大陆的发行草稿', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(demoUrl('/P06-01'), { waitUntil: 'load' });
    await addMainlandToReleaseDraft(page);
    assert.match(await page.locator('main').innerText(), /范围包含中国大陆/);

    await page.getByRole('button', { name: '申请平台测试／发行', exact: true }).click();
    await page.locator('[data-action="choose-stage"][data-stage="prerelease"]').click();
    const mainlandGate = page.locator('.d6-gate-item').filter({ hasText: '中国大陆发行资质' });
    assert.match(await mainlandGate.innerText(), /暂不在中国大陆发行/);
    assert.equal(await page.getByRole('button', { name: '提交审核快照', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: '仅提交海外范围', exact: true }).isVisible(), true);
    await page.screenshot({ path: path.join(evidenceDir, '06-mainland-gate-1440x900.png'), fullPage: true });

    await page.getByRole('button', { name: '仅提交海外范围', exact: true }).click();
    const submittedScope = page.locator('.d6-snapshot > div').filter({ hasText: '发行范围' });
    assert.doesNotMatch(await submittedScope.innerText(), /中国大陆/, '海外审核快照不应包含中国大陆');
    assert.match(await page.locator('.d6-snapshot > div').filter({ hasText: '本次未提交' }).innerText(), /中国大陆/);
    await page.getByRole('button', { name: '返回发行概览', exact: true }).click();
    assert.match(await page.locator('main').innerText(), /本次未包含：中国大陆/);

    await page.locator('[data-action="store-section"][data-section="release-scope"]').click();
    const scopeText = await page.locator('main').innerText();
    assert.match(scopeText, /范围包含中国大陆/, '海外提交后原发行范围草稿仍应保留中国大陆');
    assert.match(scopeText, /当前大陆资质未通过/);
  } finally { await page.close(); }
});

test('大陆版号及平台角色通过人工复核后可提交包含大陆的预发布范围', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(demoUrl('/P06-01?mainland=approved'), { waitUntil: 'load' });
    await page.locator('[data-action="store-section"][data-section="qualification"]').click();
    const qualificationText = await page.locator('main').innerText();
    assert.match(qualificationText, /已通过平台人工复核/);
    assert.match(qualificationText, /国新出审/);
    assert.match(qualificationText, /客户端/);
    await page.getByRole('button', { name: '编辑资质材料', exact: true }).click();
    assert.equal(await page.locator('.d6-mainland-approval-fields').isVisible(), true);
    await page.screenshot({ path: path.join(evidenceDir, '06-qualification-mainland-edit-1440x900.png') });
    await page.getByRole('button', { name: '取消编辑', exact: true }).click();
    await addMainlandToReleaseDraft(page);
    await page.getByRole('button', { name: '申请平台测试／发行', exact: true }).click();
    await page.locator('[data-action="choose-stage"][data-stage="prerelease"]').click();
    assert.match(await page.locator('.d6-gate-item').filter({ hasText: '中国大陆发行资质' }).innerText(), /已通过人工复核/);
    assert.equal(await page.getByRole('button', { name: '仅提交海外范围', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: '提交审核快照', exact: true }).isEnabled(), true);
  } finally { await page.close(); }
});

test('个人开发者可编辑资料，但发行申请被企业认证门禁拦截', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(demoUrl('/P06-01?account=personal'), { waitUntil: 'load' });
    await page.getByRole('button', { name: '申请平台测试／发行', exact: true }).click();
    assert.match(await page.locator('.d6-dialog').innerText(), /当前为个人开发者/);
    assert.match(await page.locator('.d6-dialog').innerText(), /个人开发者需先完成企业认证/);
    assert.equal(await page.getByRole('button', { name: '提交审核快照', exact: true }).isDisabled(), true);
  } finally { await page.close(); }
});

test('未保存编辑和资质人工复核中都不能绕过发行门禁', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(demoUrl('/P06-01'), { waitUntil: 'load' });
    await page.locator('[data-action="store-section"][data-section="profile"]').click();
    await page.getByRole('button', { name: '编辑游戏资料', exact: true }).click();
    await page.getByRole('button', { name: '申请平台测试／发行', exact: true }).click();
    const profileGate = page.locator('.d6-gate-item').filter({ hasText: '游戏与商店资料' });
    assert.match(await profileGate.innerText(), /请先保存或退出当前编辑/);
    assert.equal(await page.getByRole('button', { name: '提交审核快照', exact: true }).isDisabled(), true);
    await page.locator('.d6-dialog-foot [data-action="close-application"]').click();
    await page.getByRole('button', { name: '取消编辑', exact: true }).click();

    await page.locator('[data-action="store-section"][data-section="qualification"]').click();
    await page.getByRole('button', { name: '编辑资质材料', exact: true }).click();
    await page.getByRole('button', { name: '提交平台人工复核', exact: true }).click();
    assert.match(await page.locator('main').innerText(), /资质材料正在人工复核/);
    await page.getByRole('button', { name: '申请平台测试／发行', exact: true }).click();
    const qualificationGate = page.locator('.d6-gate-item').filter({ hasText: '游戏资质' });
    assert.match(await qualificationGate.innerText(), /资质材料正在审核/);
    assert.equal(await page.getByRole('button', { name: '提交审核快照', exact: true }).isDisabled(), true);
  } finally { await page.close(); }
});

test('390px 视口下概览、资质和国家选择器均无根节点横向溢出', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(demoUrl('/P06-01'), { waitUntil: 'load' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await page.locator('[data-action="store-section"][data-section="qualification"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await openReleaseEditor(page);
    await page.getByRole('button', { name: '选择国家／地区', exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await page.screenshot({ path: path.join(evidenceDir, '06-market-picker-390x844.png') });
  } finally { await page.close(); }
});

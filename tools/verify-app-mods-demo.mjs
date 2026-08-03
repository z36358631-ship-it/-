import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', 'Mod与发行人', 'APP端MODS功能demo.html');
const screenshotDir = path.join(root, 'public', 'prd', 'app-mods');
const shouldCapture = process.argv.includes('--screenshots');

assert.equal(fs.existsSync(demoPath), true, 'APP MODS Demo 缺失');
const html = fs.readFileSync(demoPath, 'utf8');

for (const copy of [
  '饥荒 MODS',
  '浏览',
  '已安装',
  '热门',
  '下载最多',
  '最新发布',
  '搜索 MOD 名称或作者',
  '已启用',
  '已停用',
  '暂无可更新的 MOD'
]) {
  assert.match(html, new RegExp(copy, 'u'), `缺少关键文案：${copy}`);
}

for (const copy of [
  'Steam数据',
  '成就',
  '创意工坊',
  'MODS',
  '已安装 4 个',
  '查看全部'
]) assert.match(html, new RegExp(copy, 'u'), `缺少个人中心文案：${copy}`);

assert.match(html, /data-screen="steam-profile"/u);
assert.match(html, /data-profile-tab="mods"/u);
assert.match(html, /data-action="profile-view-all"/u);
assert.doesNotMatch(html, /仅显示当前设备已安装的 MOD/u);

assert.match(html, /data-search/u);
assert.match(html, /\['hot', '热门'\]/u);
assert.match(html, /\['downloads', '下载最多'\]/u);
assert.match(html, /\['published', '最新发布'\]/u);
assert.match(html, /data-enable-switch/u);
assert.match(html, /function renderInstalledActions/u);
assert.match(html, /data-installed-actions/u);
assert.match(html, /data-installed-update/u);
assert.match(html, /action-update-dot/u);
assert.match(html, /function rotateTo/u);
assert.doesNotMatch(html, /订阅 MOD/u);
assert.doesNotMatch(html, /非官方标签/u);
assert.doesNotMatch(html, /class="card-desc"/u);
assert.doesNotMatch(html, /class="update-dot"/u);
assert.doesNotMatch(html, /检查更新/u);
console.log('PASS: APP MODS 静态结构与文案契约');

let chromium;
try {
  ({ chromium } = await import('playwright-core'));
} catch {
  const sharedPlaywright = path.join(
    path.dirname(root),
    '官网改动',
    'node_modules',
    'playwright-core',
    'index.mjs'
  );
  assert.equal(fs.existsSync(sharedPlaywright), true, '未找到 playwright-core');
  ({ chromium } = await import(pathToFileURL(sharedPlaywright).href));
}

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find(fs.existsSync);
assert(executablePath, '未找到本地 Chromium 浏览器');

if (shouldCapture) fs.mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--allow-file-access-from-files']
});
const context = await browser.newContext({
  viewport: { width: 1500, height: 1040 },
  deviceScaleFactor: 1
});
await context.setOffline(true);
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

async function capture(fileName) {
  if (!shouldCapture) return;
  const target = path.join(screenshotDir, fileName);
  await page.locator('[data-demo-root]').screenshot({ path: target });
  assert(fs.statSync(target).size > 12000, `${fileName} 截图体积异常`);
}

try {
  await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
  await page.locator('[data-demo-root]').waitFor({ state: 'visible' });

  assert.equal(await page.evaluate(() => window.__APP_MODS_DEMO__.version), 'app_mods_demo_v1');
  assert.equal(await page.locator('[data-screen="game"]').count(), 1);

  await page.locator('[data-action="open-more"]').click();
  const menuLabels = await page.locator('[data-menu-item]').evaluateAll(items =>
    items.map(item => item.getAttribute('data-menu-item'))
  );
  assert.deepEqual(menuLabels, [
    'PC引擎设置',
    '创意工坊',
    'MODS',
    '分享',
    '添加到桌面',
    '版本切换',
    '移除游戏',
    '修改信息',
    '按键与布局'
  ]);
  const menuRows = await page.locator('[data-menu-item]').evaluateAll(items => {
    const tops = items.map(item => Math.round(item.getBoundingClientRect().top));
    return [...new Set(tops)];
  });
  assert.equal(menuRows.length, 2, `更多菜单不是两行：${menuRows.join(',')}`);
  await capture('01-game-more-menu-portrait.png');

  await page.locator('[data-review-action="landscape"]').click();
  const landscapeMenuLayout = await page.evaluate(() => {
    const device = document.querySelector('[data-demo-root]').getBoundingClientRect();
    const panel = document.querySelector('.more-panel').getBoundingClientRect();
    const items = [...document.querySelectorAll('[data-menu-item]')];
    const rows = [...new Set(items.map(item => Math.round(item.getBoundingClientRect().top)))];
    const lastItemBottom = Math.max(...items.map(item => item.getBoundingClientRect().bottom));
    return {
      rows: rows.length,
      centered: Math.abs((panel.top + panel.bottom - device.top - device.bottom) / 2) <= 1,
      panelHeight: Math.round(panel.height),
      bottomGap: Math.round(panel.bottom - lastItemBottom)
    };
  });
  assert.equal(landscapeMenuLayout.rows, 2);
  assert.equal(landscapeMenuLayout.centered, true);
  assert(landscapeMenuLayout.panelHeight <= 250, JSON.stringify(landscapeMenuLayout));
  assert(
    landscapeMenuLayout.bottomGap >= 0 && landscapeMenuLayout.bottomGap <= 24,
    JSON.stringify(landscapeMenuLayout)
  );
  await capture('08-game-more-menu-landscape.png');
  await page.locator('[data-review-action="portrait"]').click();

  await page.locator('[data-review-action="profile"]').click();
  assert.equal(await page.locator('[data-screen="steam-profile"]').count(), 1);
  assert.deepEqual(
    await page.locator('[data-profile-tab]').evaluateAll(items => items.map(item => item.textContent.trim())),
    ['Steam数据', '成就', '创意工坊', 'MODS']
  );
  assert.equal(await page.locator('[data-profile-tab="mods"]').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('[data-profile-search], [data-profile-sort], [data-profile-download]').count(), 0);
  assert.equal(await page.locator('[data-profile-group="dst"] [data-profile-mod-card]').count(), 4);
  assert.equal(await page.locator('[data-installed-actions="steam-profile"]').count(), 4);
  assert.equal(await page.locator('[data-installed-actions="steam-profile"] [data-installed-update]').count(), 4);
  assert.equal(await page.locator('[data-installed-actions="steam-profile"] [data-action="open-uninstall"]').count(), 4);
  assert.equal(await page.locator('[data-installed-actions="steam-profile"] [data-enable-switch]').count(), 4);
  assert.equal(await page.locator('[data-installed-actions="steam-profile"] .action-update-dot').count(), 2);
  assert.equal(await page.locator('.update-dot').count(), 0);
  assert.equal(await page.locator('[data-action="profile-view-all"]').textContent(), '查看全部');
  assert.equal(await page.locator('.profile-device-note').count(), 0);
  assert.deepEqual(
    await page.locator('[data-steam-profile-action]').evaluateAll(items =>
      items.map(item => item.getAttribute('data-steam-profile-action'))
    ),
    ['friends', 'account', 'power']
  );
  assert.equal(
    (await page.locator('[data-steam-profile-action="friends"]').textContent()).trim(),
    '好友'
  );

  const profileHeaderLayout = await page.locator('.steam-profile-header').evaluate(header => {
    const title = header.querySelector('h1');
    const titleBox = title.getBoundingClientRect();
    const actionsBox = header.querySelector('.steam-profile-actions').getBoundingClientRect();
    return {
      titleAlign: getComputedStyle(title).textAlign,
      actionsAfterTitle: actionsBox.left >= titleBox.right,
      actionCount: header.querySelectorAll('[data-steam-profile-action]').length
    };
  });
  assert.deepEqual(profileHeaderLayout, {
    titleAlign: 'left',
    actionsAfterTitle: true,
    actionCount: 3
  });

  const profileTabsLayout = await page.locator('.steam-profile-tabs').evaluate(tabs => ({
    singleLine: [...tabs.children].every(item => item.getBoundingClientRect().top === tabs.firstElementChild.getBoundingClientRect().top),
    overflowMode: getComputedStyle(tabs).overflowX
  }));
  assert.equal(profileTabsLayout.singleLine, true);
  assert.match(profileTabsLayout.overflowMode, /auto|scroll/u);

  await capture('09-steam-profile-mods-portrait.png');
  await page.locator('[data-review-action="landscape"]').click();
  assert.equal(
    await page.evaluate(() => window.__APP_MODS_DEMO__.getState().orientation),
    'landscape'
  );
  const landscapeProfileHeaderLayout = await page.evaluate(() => {
    const title = document.querySelector('.steam-profile-header h1').getBoundingClientRect();
    const tabs = document.querySelector('.steam-profile-tabs').getBoundingClientRect();
    const actions = document.querySelector('.steam-profile-actions').getBoundingClientRect();
    return {
      titleBeforeTabs: title.right <= tabs.left,
      tabsBeforeActions: tabs.right <= actions.left,
      actionsInsideDevice: actions.right <= document.querySelector('[data-demo-root]').getBoundingClientRect().right
    };
  });
  assert.deepEqual(landscapeProfileHeaderLayout, {
    titleBeforeTabs: true,
    tabsBeforeActions: true,
    actionsInsideDevice: true
  });
  await capture('10-steam-profile-mods-landscape.png');
  await page.locator('[data-review-action="portrait"]').click();

  await page.locator('[data-profile-scroll]').evaluate(element => { element.scrollTop = 96; });
  await page.locator('[data-action="profile-view-all"][data-game-id="dst"]').click();
  const browseState = await page.evaluate(() => window.__APP_MODS_DEMO__.getState());
  assert.equal(browseState.screen, 'mods');
  assert.equal(browseState.tab, 'browse');
  assert.equal(browseState.activeGameId, 'dst');
  assert.equal(browseState.modsReturnTarget, 'steam-profile');
  await page.locator('[data-action="back-game"]').click();
  assert.equal(await page.locator('[data-screen="steam-profile"]').count(), 1);
  assert.equal(await page.locator('[data-profile-scroll]').evaluate(element => element.scrollTop), 96);

  await page.evaluate(() => {
    const api = window.__APP_MODS_DEMO__;
    for (const modId of [...api.getState().installed]) {
      api.dispatch({ type: 'OPEN_UNINSTALL', modId });
      api.dispatch({ type: 'CONFIRM_UNINSTALL' });
    }
    api.dispatch({ type: 'OPEN_STEAM_PROFILE' });
  });
  assert.equal(await page.locator('[data-profile-group]').count(), 0);
  assert.equal(await page.locator('.profile-empty strong').textContent(), '当前设备暂未安装 MOD');
  assert.equal(await page.locator('[data-action="profile-supported-games"]').textContent(), '查看支持 MODS 的游戏');
  await page.evaluate(() => window.__APP_MODS_DEMO__.dispatch({ type: 'RESET' }));

  await page.locator('[data-action="enter-mods"]').click();
  assert.equal(await page.locator('[data-screen="mods"]').count(), 1);
  assert.equal(await page.locator('[data-mod-card] .card-desc').count(), 0, '浏览列表不应显示简介');
  assert.equal(await page.locator('[data-search]').count(), 1);
  assert.equal(await page.locator('[data-search]').getAttribute('placeholder'), '搜索 MOD 名称或作者');
  assert.deepEqual(
    await page.locator('[data-sort]').evaluateAll(items => items.map(item => item.textContent.trim())),
    ['热门', '下载最多', '最新发布']
  );
  assert.equal(await page.locator('[data-sort="hot"]').getAttribute('aria-selected'), 'true');
  const portraitSearchLayout = await page.evaluate(() => {
    const tabs = document.querySelector('.primary-tabs').getBoundingClientRect();
    const section = document.querySelector('.search-section').getBoundingClientRect();
    const sort = document.querySelector('.sort-section').getBoundingClientRect();
    const list = document.querySelector('.mods-scroll').getBoundingClientRect();
    const device = document.querySelector('[data-demo-root]').getBoundingClientRect();
    return {
      followsTabs: Math.abs(section.top - tabs.bottom) <= 1,
      fillsDevice: Math.abs(section.left - device.left) <= 1 && Math.abs(section.right - device.right) <= 1,
      sortFollowsSearch: Math.abs(sort.top - section.bottom) <= 1,
      listFollowsSort: Math.abs(list.top - sort.bottom) <= 1
    };
  });
  assert.deepEqual(portraitSearchLayout, {
    followsTabs: true,
    fillsDevice: true,
    sortFollowsSearch: true,
    listFollowsSort: true
  });
  await capture('02-browse-portrait.png');

  const search = page.locator('[data-search]');
  await search.fill('小地图');
  await page.waitForTimeout(32);
  await search.evaluate(input => {
    input.focus();
    input.setSelectionRange(1, 1);
  });
  assert.equal(
    await page.evaluate(() => document.activeElement?.matches('[data-search]')),
    true,
    '旋转前搜索框未获得焦点'
  );
  await page.evaluate(() => window.__APP_MODS_DEMO__.rotateTo('landscape'));
  await page.waitForTimeout(32);
  assert.equal(await page.locator('[data-search]').inputValue(), '小地图');
  assert.equal(
    await page.evaluate(() => document.activeElement?.matches('[data-search]')),
    true,
    '竖屏切横屏后搜索焦点丢失'
  );
  assert.deepEqual(
    await page.locator('[data-search]').evaluate(input => [input.selectionStart, input.selectionEnd]),
    [1, 1],
    '竖屏切横屏后搜索光标位置丢失'
  );
  await page.evaluate(() => window.__APP_MODS_DEMO__.rotateTo('portrait'));
  await page.waitForTimeout(32);
  assert.equal(await page.locator('[data-search]').inputValue(), '小地图');
  assert.equal(
    await page.evaluate(() => document.activeElement?.matches('[data-search]')),
    true,
    '横屏切竖屏后搜索焦点丢失'
  );
  assert.deepEqual(
    await page.locator('[data-search]').evaluate(input => [input.selectionStart, input.selectionEnd]),
    [1, 1],
    '横屏切竖屏后搜索光标位置丢失'
  );

  await page.locator('[data-search]').evaluate(input => {
    input.focus();
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = '生命';
    input.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      data: '生命',
      inputType: 'insertCompositionText',
      isComposing: true
    }));
    window.__APP_MODS_COMPOSING_INPUT__ = input;
  });
  await page.locator('[data-review-action="landscape"]').click();
  assert.equal(
    await page.evaluate(() => window.__APP_MODS_DEMO__.getState().orientation),
    'portrait',
    '输入法组词期间不应销毁输入框并立即旋转'
  );
  assert.equal(
    await page.evaluate(() =>
      document.querySelector('[data-search]') === window.__APP_MODS_COMPOSING_INPUT__
    ),
    true,
    '输入法组词期间搜索输入框节点被替换'
  );
  await page.evaluate(() => {
    const input = window.__APP_MODS_COMPOSING_INPUT__;
    input.value = '生命条';
    input.setSelectionRange(3, 3);
    input.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      data: '条',
      inputType: 'insertCompositionText',
      isComposing: true
    }));
    input.dispatchEvent(new CompositionEvent('compositionend', {
      bubbles: true,
      data: input.value
    }));
    delete window.__APP_MODS_COMPOSING_INPUT__;
  });
  await page.waitForFunction(() =>
    window.__APP_MODS_DEMO__.getState().orientation === 'landscape'
  );
  assert.equal(
    await page.evaluate(() => document.activeElement?.matches('[data-search]')),
    true,
    '延迟旋转后搜索焦点丢失'
  );
  assert.deepEqual(
    await page.locator('[data-search]').evaluate(input => [input.selectionStart, input.selectionEnd]),
    [3, 3],
    '延迟旋转未恢复组词结束时的最终光标'
  );
  assert.deepEqual(
    await page.locator('[data-mod-card]').evaluateAll(cards => cards.map(card => card.getAttribute('data-mod-id'))),
    ['health-bar'],
    '输入法组词结束后搜索筛选未生效'
  );
  await page.locator('[data-search]').fill('小地图');
  assert.deepEqual(
    await page.locator('[data-mod-card]').evaluateAll(cards => cards.map(card => card.getAttribute('data-mod-id'))),
    ['minimap'],
    '输入法组词结束后普通输入未恢复即时筛选'
  );
  await page.locator('[data-review-action="portrait"]').click();
  assert.equal(
    await page.evaluate(() => window.__APP_MODS_DEMO__.getState().orientation),
    'portrait',
    '输入法组词结束后真实方向按钮未恢复正常旋转'
  );
  assert.deepEqual(
    await page.locator('[data-mod-card]').evaluateAll(cards => cards.map(card => card.getAttribute('data-mod-id'))),
    ['minimap']
  );
  await page.evaluate(() => window.__APP_MODS_DEMO__.dispatch({ type: 'SET_SEARCH', value: '' }));
  assert.equal(await page.evaluate(() => window.__APP_MODS_DEMO__.getState().search), '');
  await page.locator('[data-sort="downloads"]').click();
  assert.deepEqual(
    await page.evaluate(() => window.__APP_MODS_DEMO__.derive().visibleMods.map(mod => mod.id)),
    ['minimap', 'combined-status', 'storage-box', 'season-clock', 'language-pack', 'health-bar']
  );
  await page.locator('[data-sort="published"]').click();
  assert.equal(
    await page.evaluate(() => window.__APP_MODS_DEMO__.getState().scrollByTab.browse),
    0
  );

  await page.locator('[data-tab="installed"]').click();
  assert.equal(await page.locator('[data-search]').count(), 0);
  assert.equal(await page.locator('[data-mod-card] .card-desc').count(), 0, '已安装列表不应显示简介');
  assert.equal(await page.locator('[data-enable-switch]').count(), 4);
  assert.equal(await page.locator('[data-installed-actions="installed-list"]').count(), 4);
  assert.equal(await page.locator('[data-installed-actions="installed-list"] [data-installed-update]').count(), 4);
  assert.equal(await page.locator('[data-installed-actions="installed-list"] [data-action="open-uninstall"]').count(), 4);
  assert.equal(await page.locator('[data-installed-actions="installed-list"] .action-update-dot').count(), 2);
  assert.equal(await page.locator('[data-installed-update][data-mod-id="minimap"]').isDisabled(), true);
  assert.equal(await page.locator('[data-installed-update][data-mod-id="storage-box"]').isEnabled(), true);
  const installedFilters = page.locator('[data-installed-filter]');
  assert.deepEqual(
    await installedFilters.evaluateAll(items => items.map(item => item.textContent.trim())),
    ['全部', '可更新']
  );
  assert.equal(await installedFilters.count(), 2);
  assert.equal(await page.locator('[data-installed-filter="all"]').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('[data-installed-filter-select]').count(), 0);
  await page.locator('[data-installed-filter="updates"]').click();
  assert.equal(await page.evaluate(() => window.__APP_MODS_DEMO__.getState().installedFilter), 'updates');
  await page.locator('[data-installed-filter="all"]').click();
  const portraitInstalledLayout = await page.evaluate(() => {
    const tabs = document.querySelector('.primary-tabs').getBoundingClientRect();
    const filters = document.querySelector('.sort-section').getBoundingClientRect();
    const filterTabs = document.querySelector('.installed-filter-tabs').getBoundingClientRect();
    const refresh = document.querySelector('.installed-controls .refresh-small').getBoundingClientRect();
    const style = getComputedStyle(document.querySelector('.sort-section'));
    const list = document.querySelector('.mods-scroll').getBoundingClientRect();
    return {
      filtersFollowTabs: Math.abs(filters.top - tabs.bottom) <= 1,
      listFollowsFilters: Math.abs(list.top - filters.bottom) <= 1,
      tabsLeftAligned: Math.abs(filterTabs.left - (filters.left + parseFloat(style.paddingLeft))) <= 1,
      refreshRightAligned: Math.abs(refresh.right - (filters.right - parseFloat(style.paddingRight))) <= 1,
      tabsBeforeRefresh: filterTabs.right <= refresh.left
    };
  });
  assert.deepEqual(portraitInstalledLayout, {
    filtersFollowTabs: true,
    listFollowsFilters: true,
    tabsLeftAligned: true,
    refreshRightAligned: true,
    tabsBeforeRefresh: true
  });
  await capture('03-installed-portrait.png');

  await page.locator('[data-action="open-uninstall"][data-mod-id="storage-box"]').click();
  assert.equal(await page.locator('[data-detail]').count(), 0, '卸载按钮误开详情');
  assert.match(await page.locator('.confirm-card h3').textContent(), /智能储物箱/u);
  await page.locator('[data-action="close-uninstall"]').click();
  assert.equal(
    await page.evaluate(() => window.__APP_MODS_DEMO__.getState().installed.includes('storage-box')),
    true,
    '取消卸载后 MOD 被移除'
  );

  const firstSwitch = page.locator('[data-enable-switch][data-mod-id="minimap"]');
  assert.equal(await firstSwitch.getAttribute('aria-checked'), 'true');
  await firstSwitch.focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('[data-detail]').count(), 0, '快捷开关键盘操作误开详情');
  assert.equal(await firstSwitch.getAttribute('aria-checked'), 'false');
  assert.equal(
    await page.evaluate(() => window.__APP_MODS_DEMO__.getState().enabled.includes('minimap')),
    false
  );

  await page.locator('[data-mod-card][data-mod-id="minimap"]').click();
  assert.equal(await page.locator('[data-detail]').count(), 1);
  await page.waitForFunction(() => document.activeElement?.matches('[data-action="close-detail"]'));
  assert.equal(
    await page.evaluate(() => document.activeElement?.matches('[data-action="close-detail"]')),
    true,
    '详情打开后未聚焦关闭按钮'
  );
  assert.deepEqual(
    await page.locator('.detail-actionbar [data-installed-actions] > *').evaluateAll(items =>
      items.map(item => item.textContent.trim())
    ),
    ['更新', '卸载', '已停用']
  );
  assert.equal(await page.locator('[data-installed-actions="detail"] [data-enable-switch]').getAttribute('role'), 'switch');
  assert.equal(await page.locator('[data-installed-actions="detail"] [data-installed-update]').isDisabled(), true);
  assert.equal(await page.locator('[data-installed-actions="detail"] .action-update-dot').count(), 0);
  assert.match(await page.locator('.detail-copy').textContent(), /在游戏界面中加入可缩放小地图/u);

  const actionLayout = await page.locator('.detail-actionbar').evaluate(bar => {
    const actions = [...bar.querySelector('[data-installed-actions]').children];
    const widths = actions.map(action => action.getBoundingClientRect().width);
    const barBox = bar.getBoundingClientRect();
    const first = actions[0].getBoundingClientRect();
    const last = actions.at(-1).getBoundingClientRect();
    const style = getComputedStyle(bar);
    return {
      equalWidths: Math.max(...widths) - Math.min(...widths) <= 1,
      fillsRow: Math.abs(first.left - (barBox.left + parseFloat(style.paddingLeft))) <= 1
        && Math.abs(last.right - (barBox.right - parseFloat(style.paddingRight))) <= 1,
      switchIsRightmost: Boolean(actions.at(-1).querySelector('[data-enable-switch]')),
      switchContainerIsNotButton: actions.at(-1).tagName === 'DIV',
      switchContainerIsTransparent: getComputedStyle(actions.at(-1)).backgroundColor === 'rgba(0, 0, 0, 0)'
    };
  });
  assert.deepEqual(actionLayout, {
    equalWidths: true,
    fillsRow: true,
    switchIsRightmost: true,
    switchContainerIsNotButton: true,
    switchContainerIsTransparent: true
  });

  await page.keyboard.press('Shift+Tab');
  assert.equal(
    await page.evaluate(() => document.activeElement?.matches('[data-installed-actions="detail"] [data-enable-switch]')),
    true,
    '详情焦点未在弹层内循环'
  );
  await page.keyboard.press('Tab');
  assert.equal(
    await page.evaluate(() => document.activeElement?.matches('[data-action="close-detail"]')),
    true,
    '详情焦点循环未回到首控件'
  );
  assert.equal(await page.locator('[data-installed-actions="detail"] .installed-switch span').textContent(), '已停用');
  assert.equal(await page.locator('[data-detail] *').filter({ hasText: '兼容性' }).count(), 0);
  assert.equal(await page.locator('[data-detail] *').filter({ hasText: '最新版本' }).count(), 0);
  assert.equal(await page.locator('[data-detail] *').filter({ hasText: '非官方' }).count(), 0);
  await page.waitForTimeout(1900);
  await capture('04-detail-portrait.png');

  await page.locator('[data-installed-actions="detail"] [data-enable-switch]').click();
  assert.equal(await page.locator('[data-installed-actions="detail"] .installed-switch span').textContent(), '已启用');
  assert.equal(await page.locator('[data-installed-actions="detail"] [data-enable-switch]').getAttribute('aria-checked'), 'true');
  assert.equal(await page.locator('.toast').count(), 0);

  await page.locator('[data-review-action="landscape"]').click();
  const rotatedState = await page.evaluate(() => window.__APP_MODS_DEMO__.getState());
  assert.equal(rotatedState.orientation, 'landscape');
  assert.equal(rotatedState.activeModId, 'minimap');
  assert.equal(rotatedState.tab, 'installed');
  assert.equal(rotatedState.enabled.includes('minimap'), true);
  assert.equal(await page.locator('[data-detail]').getAttribute('data-orientation'), 'landscape');
  await page.waitForTimeout(1900);
  await capture('06-detail-landscape.png');

  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-detail]').count(), 0);
  await page.waitForFunction(() =>
    document.activeElement?.matches('[data-mod-card][data-mod-id="minimap"]')
  );
  assert.equal(
    await page.evaluate(() => document.activeElement?.matches('[data-mod-card][data-mod-id="minimap"]')),
    true,
    '详情关闭后未恢复到触发卡片'
  );
  await page.evaluate(() => document.activeElement?.blur());
  await firstSwitch.click();
  assert.equal(await firstSwitch.getAttribute('aria-checked'), 'false');
  assert.equal(await page.locator('.toast').count(), 0);
  const landscapeInstalledLayout = await page.evaluate(() => {
    const header = document.querySelector('.mods-header').getBoundingClientRect();
    const filters = document.querySelector('.sort-section').getBoundingClientRect();
    const group = document.querySelector('.installed-controls');
    const filterTabs = group.querySelector('.installed-filter-tabs').getBoundingClientRect();
    const refresh = group.querySelector('.refresh-small').getBoundingClientRect();
    const list = document.querySelector('.mods-scroll').getBoundingClientRect();
    const device = document.querySelector('[data-demo-root]').getBoundingClientRect();
    return {
      filtersFollowHeader: Math.abs(filters.top - header.bottom) <= 1,
      listFollowsFilters: Math.abs(list.top - filters.bottom) <= 1,
      tabsLeftAligned: Math.abs(filterTabs.left - (device.left + 38)) <= 1,
      refreshRightAligned: Math.abs(refresh.right - (device.right - 38)) <= 1,
      tabsBeforeRefresh: filterTabs.right <= refresh.left
    };
  });
  assert.deepEqual(landscapeInstalledLayout, {
    filtersFollowHeader: true,
    listFollowsFilters: true,
    tabsLeftAligned: true,
    refreshRightAligned: true,
    tabsBeforeRefresh: true
  });
  await capture('07-installed-landscape.png');

  const updateButton = page.locator('[data-installed-update][data-mod-id="storage-box"]');
  await updateButton.click();
  assert.equal(await page.locator('[data-detail]').count(), 0, '更新按钮误开详情');
  assert.equal(await updateButton.isDisabled(), true);
  assert.equal(await updateButton.locator('.action-update-dot').count(), 0);
  assert.equal(
    await page.evaluate(() => window.__APP_MODS_DEMO__.getState().availableUpdates.includes('storage-box')),
    false
  );

  await page.locator('[data-tab="browse"]').click();
  await page.locator('[data-sort="hot"]').click();
  assert.equal(await page.locator('[data-search]').count(), 1);
  assert.equal(await page.locator('.search-section').count(), 0);
  assert.equal(await page.locator('.sort-section [data-search]').count(), 1);
  assert.equal(await page.locator('.sort-tabs[role="tablist"] [data-sort]').count(), 3);
  const landscapeSearchLayout = await page.evaluate(() => {
    const toolbar = document.querySelector('.sort-section');
    const toolbarBox = toolbar.getBoundingClientRect();
    const searchBox = document.querySelector('.toolbar-search').getBoundingClientRect();
    const refreshBox = document.querySelector('.refresh-small').getBoundingClientRect();
    const list = document.querySelector('.mods-scroll').getBoundingClientRect();
    const touchTargets = [
      ...toolbar.querySelectorAll('[data-sort]'),
      toolbar.querySelector('.toolbar-search'),
      toolbar.querySelector('.refresh-small')
    ].map(item => {
      const box = item.getBoundingClientRect();
      return { width: Math.round(box.width), height: Math.round(box.height) };
    });
    const focusOrder = [...toolbar.querySelectorAll('button, input')].map(item => {
      if (item.dataset.sort) return item.dataset.sort;
      if (item.matches('[data-search]')) return 'search';
      if (item.dataset.action === 'refresh') return 'refresh';
      return 'unknown';
    });
    return {
      searchAndRefreshAligned: Math.abs(
        (searchBox.top + searchBox.bottom) / 2 - (refreshBox.top + refreshBox.bottom) / 2
      ) <= 1,
      searchBeforeRefresh: searchBox.right <= refreshBox.left,
      searchRefreshGap: Math.round(refreshBox.left - searchBox.right),
      listFollowsToolbar: Math.abs(list.top - toolbarBox.bottom) <= 1,
      focusOrder,
      touchTargetsAtLeast44: touchTargets.every(item => item.width >= 44 && item.height >= 44)
    };
  });
  assert.deepEqual(landscapeSearchLayout, {
    searchAndRefreshAligned: true,
    searchBeforeRefresh: true,
    searchRefreshGap: 12,
    listFollowsToolbar: true,
    focusOrder: ['hot', 'downloads', 'published', 'search', 'refresh'],
    touchTargetsAtLeast44: true
  });
  assert.equal(await page.locator('[data-mod-card]').count(), 6);
  const metadataLayout = await page.locator('[data-mod-card] .card-meta').evaluateAll(elements =>
    elements.map(element => {
      const box = element.getBoundingClientRect();
      const cardBox = element.closest('[data-mod-card]').getBoundingClientRect();
      return {
        text: element.textContent.trim(),
        fitsRight: box.right <= cardBox.right + 1,
        fitsBottom: box.bottom <= cardBox.bottom + 1
      };
    })
  );
  assert(metadataLayout.every(item => item.fitsRight && item.fitsBottom), JSON.stringify(metadataLayout));
  assert(metadataLayout.every(item => /KB|MB/u.test(item.text)), '横屏卡片未完整显示文件大小');
  await capture('05-browse-landscape.png');

  const listScroll = page.locator('[data-mod-scroll]');
  await listScroll.evaluate(element => { element.scrollTop = 120; });
  const installButton = page.locator('[data-action="install"][data-mod-id="season-clock"]');
  await installButton.focus();
  const scrollBeforeInstall = await listScroll.evaluate(element => element.scrollTop);
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-detail]').count(), 0, '安装按钮键盘操作误开详情');
  await page.waitForTimeout(60);
  assert.equal(
    await page.evaluate(() => Boolean(window.__APP_MODS_DEMO__.getState().tasks['season-clock'])),
    true,
    '键盘安装未创建任务'
  );
  assert.equal(await listScroll.evaluate(element => element.scrollTop), scrollBeforeInstall, '安装重绘丢失列表位置');

  const concurrentTasks = await page.evaluate(() => {
    const api = window.__APP_MODS_DEMO__;
    const firstTask = api.getState().tasks['season-clock'];
    api.startInstall('combined-status');
    api.startInstall('season-clock');
    const current = api.getState();
    return {
      taskIds: Object.keys(current.tasks).sort(),
      seasonProgressDidNotReset: current.tasks['season-clock'].progress >= firstTask.progress
    };
  });
  assert.deepEqual(concurrentTasks.taskIds, ['combined-status', 'season-clock']);
  assert.equal(concurrentTasks.seasonProgressDidNotReset, true);

  await page.locator('[data-review-action="portrait"]').click();
  assert.deepEqual(
    await page.evaluate(() => Object.keys(window.__APP_MODS_DEMO__.getState().tasks).sort()),
    ['combined-status', 'season-clock'],
    '任务中旋转丢失活动任务'
  );
  await page.waitForFunction(() => {
    const current = window.__APP_MODS_DEMO__.getState();
    return current.installed.includes('season-clock')
      && current.installed.includes('combined-status')
      && Object.keys(current.tasks).length === 0;
  }, null, { timeout: 5000 });

  const orientationPersistence = await page.evaluate(() => {
    const api = window.__APP_MODS_DEMO__;
    api.dispatch({ type: 'SET_SEARCH', value: '状态' });
    api.rotateTo('portrait');
    const state = api.getState();
    return {
      orientation: state.orientation,
      tab: state.tab,
      sort: state.sort,
      search: state.search
    };
  });
  assert.deepEqual(orientationPersistence, {
    orientation: 'portrait',
    tab: 'browse',
    sort: 'hot',
    search: '状态'
  });

  await page.evaluate(() => {
    const api = window.__APP_MODS_DEMO__;
    for (const modId of ['storage-box', 'language-pack']) {
      api.dispatch({ type: 'OPEN_DETAIL', modId });
      api.dispatch({ type: 'OPEN_UNINSTALL' });
      api.dispatch({ type: 'CONFIRM_UNINSTALL' });
    }
    api.dispatch({ type: 'CLOSE_DETAIL' });
    api.dispatch({ type: 'SET_TAB', value: 'installed' });
    api.dispatch({ type: 'SET_INSTALLED_FILTER', value: 'updates' });
  });
  assert.equal(await page.locator('.empty-state strong').textContent(), '暂无可更新的 MOD');
  assert.equal(await page.locator('.empty-state [data-installed-filter="all"]').textContent(), '查看全部');

  assert.deepEqual(pageErrors, [], `页面异常：${pageErrors.join(' | ')}`);
  assert.deepEqual(consoleErrors, [], `控制台异常：${consoleErrors.join(' | ')}`);
  console.log('PASS: 5+4 入口、搜索排序、空态、键盘、焦点、并行任务与旋转状态');
  if (shouldCapture) console.log('PASS: 十张 APP MODS PRD 截图已生成');
} finally {
  await browser.close();
}

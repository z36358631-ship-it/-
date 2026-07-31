import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', 'Mod与发行人', 'Mod功能Mac端demo.html');
const evidenceDir = path.join(root, '.tmp', 'mods-sort-toggle-evidence');
const prdImageDir = path.join(root, 'public', 'prd', 'dst-mods');
const html = fs.readFileSync(demoPath, 'utf8');

assert.match(html, /\['trend', '热门趋势'\][\s\S]*\['downloads', '下载量'\][\s\S]*\['published', '最新发布'\]/u);
assert.match(html, /browseSort: 'trend'/u);
assert.match(html, /按近 24 小时下载增幅排序/u);
assert.doesNotMatch(html, /<div class="mods-list-title">/u);
assert.match(html, /data-input="browse-sort"/u);
assert.match(html, /data-input="installed-filter"/u);
assert.match(
  html,
  /<header class="mods-list-header">[\s\S]*?<div class="mods-tabs"[\s\S]*?<div class="list-tools">/u
);
assert.doesNotMatch(
  html,
  /<\/header>\s*<div class="mods-tabs"/u
);
assert.doesNotMatch(html, /data-action="set-browse-sort"/u);
assert.doesNotMatch(html, /data-action="set-installed-filter"/u);
assert.match(html, /<span class="mods-subtitle">热门组件<\/span>/u);
assert.doesNotMatch(html, /mods-source-badge/u);
assert.doesNotMatch(html, /共 \$\{viewModel\.catalogTotal\} 个，当前加载/u);
assert.match(html, /class="detail-title-meta"/u);
assert.doesNotMatch(html, /class="detail-metrics"/u);
assert.doesNotMatch(html, /\.detail-title-meta span \+ span::before/u);
assert.doesNotMatch(html, /<h4>兼容性：<\/h4>/u);
assert.match(html, /function renderEnabledSwitch/u);
assert.match(html, /function renderDetailEnabledControl/u);
assert.doesNotMatch(html, /detail-switch-track/u);
assert.match(html, /case 'ENABLE_CHANGE_FAILED'/u);
console.log('PASS: static sort, copy, metadata and switch contracts');

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find(fs.existsSync);
assert(executablePath, 'Local Chromium browser not found');

fs.mkdirSync(evidenceDir, { recursive: true });
fs.mkdirSync(prdImageDir, { recursive: true });
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--allow-file-access-from-files']
});

const context = await browser.newContext({
  viewport: { width: 2160, height: 1480 },
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

async function capture(name) {
  const target = path.join(evidenceDir, name);
  await page.locator('[data-demo-root]').screenshot({ path: target });
  assert(fs.statSync(target).size > 10000, `${name} is unexpectedly small`);
}

try {
  await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
  await page.locator('[data-demo-root]').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => window.__DST_MODS_DEMO__.version), 'dst_mods_demo_v2');
  assert.equal(await page.locator('.mods-subtitle').textContent(), '热门组件');
  assert.equal(await page.locator('.mods-source-badge').count(), 0);
  await capture('mac-mods-entry.png');

  await page.locator('[data-action="open-mods"]').click();
  assert.equal(await page.locator('.mods-list-title').count(), 0);
  const browseHeaderOrder = await page.locator(
    '.mods-list-header button, .mods-list-header select, .mods-list-header input'
  ).evaluateAll(elements => elements.map(element => (
    element.matches('[data-mod-tab="browse"]') ? 'browse-tab'
      : element.matches('[data-mod-tab="installed"]') ? 'installed-tab'
        : element.matches('[data-input="browse-sort"]') ? 'sort'
          : element.matches('[data-input="search"]') ? 'search'
            : element.matches('[data-action="refresh"]') ? 'refresh'
              : 'unknown'
  )));
  assert.deepEqual(
    browseHeaderOrder,
    ['browse-tab', 'installed-tab', 'sort', 'search', 'refresh']
  );
  const browseFocusOrder = [];
  await page.locator('.back-detail').focus();
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press('Tab');
    browseFocusOrder.push(await page.evaluate(() => {
      const element = document.activeElement;
      return element?.matches('[data-mod-tab="browse"]') ? 'browse-tab'
        : element?.matches('[data-mod-tab="installed"]') ? 'installed-tab'
          : element?.matches('[data-input="browse-sort"]') ? 'sort'
            : element?.matches('[data-input="search"]') ? 'search'
              : element?.matches('[data-action="refresh"]') ? 'refresh'
                : 'unknown';
    }));
  }
  assert.deepEqual(
    browseFocusOrder,
    ['browse-tab', 'installed-tab', 'sort', 'search', 'refresh']
  );
  const browseHeaderCenters = await page.locator(
    '.mods-list-header [data-mod-tab], .mods-list-header .compact-select, .mods-list-header .search-field, .mods-list-header .refresh-button'
  ).evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return box.top + box.height / 2;
  }));
  assert(
    Math.max(...browseHeaderCenters) - Math.min(...browseHeaderCenters) <= 1,
    `browse header controls are not on one row: ${JSON.stringify(browseHeaderCenters)}`
  );
  const browseToolOrder = await page.locator('.list-tools > *').evaluateAll(elements =>
    elements.map(element =>
      element.querySelector('[data-input="browse-sort"]')
        ? 'sort'
        : element.matches('.search-field')
          ? 'search'
          : element.matches('.refresh-button')
            ? 'refresh'
            : 'unknown'
    )
  );
  assert.deepEqual(browseToolOrder, ['sort', 'search', 'refresh']);
  const browseToolCenters = await page.locator('.list-tools > *').evaluateAll(elements =>
    elements.map(element => {
      const box = element.getBoundingClientRect();
      return box.top + box.height / 2;
    })
  );
  assert(
    Math.max(...browseToolCenters) - Math.min(...browseToolCenters) <= 1,
    `browse tools are not on one row: ${JSON.stringify(browseToolCenters)}`
  );
  const browseSort = page.locator('[data-input="browse-sort"]');
  assert.deepEqual(
    await browseSort.locator('option').evaluateAll(options =>
      options.map(option => ({ value: option.value, text: option.textContent.trim() }))
    ),
    [
      { value: 'trend', text: '热门趋势' },
      { value: 'downloads', text: '下载量' },
      { value: 'published', text: '最新发布' }
    ]
  );
  assert.equal(await browseSort.inputValue(), 'trend');
  assert.equal((await page.locator('.compact-select > span').textContent()).trim(), '排序');
  await browseSort.focus();
  assert.notEqual(
    await page.locator('.compact-select').evaluate(element => getComputedStyle(element).boxShadow),
    'none',
    'browse sort keyboard focus is not visible'
  );
  const searchInput = page.locator('[data-input="search"]');
  await searchInput.focus();
  assert.notEqual(
    await page.locator('.search-field').evaluate(element => getComputedStyle(element).boxShadow),
    'none',
    'search keyboard focus is not visible'
  );
  await page.evaluate(() => document.activeElement?.blur());
  assert.equal(await page.locator('[data-catalog-summary]').count(), 0);
  const browseLayout = await page.evaluate(() => {
    const header = document.querySelector('.mods-list-header').getBoundingClientRect();
    const activeTab = document.querySelector('.mods-tabs .is-active');
    const firstCard = document.querySelector('[data-mod-card]').getBoundingClientRect();
    return {
      headerWidth: header.width,
      headerBorder: getComputedStyle(document.querySelector('.mods-list-header')).borderBottomWidth,
      underlineBottom: getComputedStyle(activeTab, '::after').bottom,
      firstCardTop: firstCard.top
    };
  });
  assert.equal(Math.round(browseLayout.headerWidth), 1300);
  assert.equal(browseLayout.headerBorder, '2px');
  assert.equal(browseLayout.underlineBottom, '-22px');
  const invalidBrowseSortState = await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    api.dispatch({ type: 'SAVE_SCROLL_TOP', tab: 'browse', value: 480 });
    api.dispatch({ type: 'SET_BROWSE_SORT', value: 'invalid-sort' });
    const state = api.getState();
    return {
      sort: state.ui.browseSort,
      scrollTop: state.ui.scrollTopByTab.browse
    };
  });
  assert.deepEqual(invalidBrowseSortState, { sort: 'trend', scrollTop: 0 });
  await browseSort.selectOption('downloads');
  await searchInput.fill('小');
  assert.deepEqual(
    await page.evaluate(() => {
      const api = window.__DST_MODS_DEMO__;
      const state = api.getState();
      return {
        search: state.ui.searchByTab.browse,
        sort: state.ui.browseSort,
        visibleIds: api.derive().visibleMods.map(mod => mod.mod_id)
      };
    }),
    {
      search: '小',
      sort: 'downloads',
      visibleIds: ['dst-fast-travel']
    }
  );
  await searchInput.fill('');
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.getState().ui.browseSort),
    'downloads',
    'clearing search reset the selected browse sort'
  );
  await browseSort.selectOption('trend');

  const trendOrder = await page.evaluate(() =>
    window.__DST_MODS_DEMO__.derive().visibleMods.map(mod => mod.mod_id)
  );
  assert.deepEqual(trendOrder, [
    'dst-smart-stack',
    'dst-fast-travel',
    'dst-combined-status',
    'dst-season-clock',
    'dst-night-light',
    'dst-fast-gather',
    'dst-large-b',
    'dst-large-a'
  ]);

  await browseSort.selectOption('downloads');
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.derive().visibleMods[0].mod_id),
    'dst-fast-travel'
  );
  await browseSort.selectOption('published');
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.derive().visibleMods[0].mod_id),
    'dst-smart-stack'
  );
  await browseSort.selectOption('trend');
  assert.equal(await page.locator('.enabled-switch').count(), 4);
  await page.evaluate(() => document.activeElement?.blur());
  await capture('mac-mods-browse.png');
  await page.locator('[data-demo-root]').screenshot({
    path: path.join(prdImageDir, '03-mac-browse-toolbar.png')
  });

  const smartBrowseSwitch = page.locator(
    '[data-mod-card][data-mod-id="dst-smart-stack"] [role="switch"]'
  );
  assert.equal(await smartBrowseSwitch.getAttribute('aria-checked'), 'true');
  await smartBrowseSwitch.click();
  await page.waitForTimeout(380);
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.getState().ui.activeDialog),
    null,
    'switch click opened the card detail'
  );
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.getState().mods['dst-smart-stack'].enabled_value),
    'disabled'
  );

  await page.locator('[data-action="set-tab"][data-value="installed"]').click();
  const installedHeaderOrder = await page.locator(
    '.mods-list-header button, .mods-list-header select, .mods-list-header input'
  ).evaluateAll(elements => elements.map(element => (
    element.matches('[data-mod-tab="browse"]') ? 'browse-tab'
      : element.matches('[data-mod-tab="installed"]') ? 'installed-tab'
        : element.matches('[data-input="installed-filter"]') ? 'filter'
          : element.matches('[data-input="search"]') ? 'search'
            : element.matches('[data-action="refresh"]') ? 'refresh'
              : 'unknown'
  )));
  assert.deepEqual(
    installedHeaderOrder,
    ['browse-tab', 'installed-tab', 'filter', 'search', 'refresh']
  );
  const installedHeaderCenters = await page.locator(
    '.mods-list-header [data-mod-tab], .mods-list-header .compact-select, .mods-list-header .search-field, .mods-list-header .refresh-button'
  ).evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return box.top + box.height / 2;
  }));
  assert(
    Math.max(...installedHeaderCenters) - Math.min(...installedHeaderCenters) <= 1,
    `installed header controls are not on one row: ${JSON.stringify(installedHeaderCenters)}`
  );
  const installedToolOrder = await page.locator('.list-tools > *').evaluateAll(elements =>
    elements.map(element =>
      element.querySelector('[data-input="installed-filter"]')
        ? 'filter'
        : element.matches('.search-field')
          ? 'search'
          : element.matches('.refresh-button')
            ? 'refresh'
            : 'unknown'
    )
  );
  assert.deepEqual(installedToolOrder, ['filter', 'search', 'refresh']);
  const installedFilter = page.locator('[data-input="installed-filter"]');
  assert.deepEqual(
    await installedFilter.locator('option').evaluateAll(options =>
      options.map(option => ({ value: option.value, text: option.textContent.trim() }))
    ),
    [
      { value: 'all', text: '全部' },
      { value: 'update', text: '可更新' }
    ]
  );
  assert.equal(await installedFilter.inputValue(), 'all');
  assert.equal((await page.locator('.compact-select > span').textContent()).trim(), '筛选');
  await installedFilter.selectOption('update');
  assert(
    await page.evaluate(() => {
      const visibleMods = window.__DST_MODS_DEMO__.derive().visibleMods;
      return visibleMods.length > 0
        && visibleMods.every(mod => mod.update_fact === 'update_available');
    }),
    'installed update filter returned a non-update item'
  );
  const invalidInstalledFilterState = await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    api.dispatch({ type: 'SAVE_SCROLL_TOP', tab: 'installed', value: 480 });
    api.dispatch({ type: 'SET_INSTALLED_FILTER', value: 'invalid-filter' });
    const state = api.getState();
    return {
      filter: state.ui.installedFilter,
      scrollTop: state.ui.scrollTopByTab.installed
    };
  });
  assert.deepEqual(invalidInstalledFilterState, { filter: 'all', scrollTop: 0 });
  const smartInstalledSwitch = page.locator(
    '[data-mod-card][data-mod-id="dst-smart-stack"] [role="switch"]'
  );
  assert.equal(await smartInstalledSwitch.getAttribute('aria-checked'), 'false');
  await smartInstalledSwitch.click();
  await page.waitForTimeout(380);
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.getState().ui.activeDialog),
    null,
    'installed switch click opened the card detail'
  );
  assert.equal(await smartInstalledSwitch.getAttribute('aria-checked'), 'true');
  await smartInstalledSwitch.click();
  await page.waitForTimeout(380);
  assert.equal(await smartInstalledSwitch.getAttribute('aria-checked'), 'false');
  assert.equal(await page.locator('[data-catalog-summary]').textContent(), '4 个已安装 · 仅此设备');
  const installedLayout = await page.evaluate(() => {
    const header = document.querySelector('.mods-list-header').getBoundingClientRect();
    const summary = document.querySelector('[data-catalog-summary]').getBoundingClientRect();
    const firstCard = document.querySelector('[data-mod-card]').getBoundingClientRect();
    return {
      headerBottom: header.bottom,
      summaryTop: summary.top,
      summaryBottom: summary.bottom,
      firstCardTop: firstCard.top
    };
  });
  assert(installedLayout.summaryTop >= installedLayout.headerBottom);
  assert(installedLayout.summaryBottom <= installedLayout.firstCardTop);
  assert.equal(installedLayout.firstCardTop, browseLayout.firstCardTop);
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(1900);
  await capture('mac-mods-installed.png');
  await page.locator('[data-demo-root]').screenshot({
    path: path.join(prdImageDir, '04-mac-installed-toolbar.png')
  });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.waitForTimeout(50);
  const compactViewportHeader = await page.evaluate(() => {
    const header = document.querySelector('.mods-list-header').getBoundingClientRect();
    const tabs = document.querySelector('.mods-tabs').getBoundingClientRect();
    const tools = document.querySelector('.list-tools').getBoundingClientRect();
    const centers = [
      ...document.querySelectorAll(
        '.mods-list-header [data-mod-tab], .mods-list-header .compact-select, .mods-list-header .search-field, .mods-list-header .refresh-button'
      )
    ].map(element => {
      const box = element.getBoundingClientRect();
      return box.top + box.height / 2;
    });
    return {
      headerRight: header.right,
      tabsRight: tabs.right,
      toolsLeft: tools.left,
      toolsRight: tools.right,
      centerSpread: Math.max(...centers) - Math.min(...centers)
    };
  });
  assert(compactViewportHeader.tabsRight <= compactViewportHeader.toolsLeft);
  assert(compactViewportHeader.toolsRight <= compactViewportHeader.headerRight + 1);
  assert(
    compactViewportHeader.centerSpread <= 1,
    `compact viewport header wrapped or misaligned: ${JSON.stringify(compactViewportHeader)}`
  );
  await page.setViewportSize({ width: 2160, height: 1480 });
  await page.waitForTimeout(50);

  await page.locator(
    '[data-mod-card][data-mod-id="dst-smart-stack"] [data-card-detail]'
  ).click();
  const detailSwitch = page.locator(
    '[data-reference-region="mod-detail-modal"] .detail-enabled-control[role="switch"]'
  );
  assert.equal(await detailSwitch.getAttribute('aria-checked'), 'false');
  assert.equal((await detailSwitch.textContent()).trim(), '已停用');
  assert.equal(
    await detailSwitch.evaluate(element => getComputedStyle(element).backgroundColor),
    'rgb(84, 81, 88)'
  );
  assert.equal(await detailSwitch.locator('button').count(), 0);
  const actionBoxes = await page.locator(
    '[data-reference-region="mod-detail-modal"] .modal-action-bar > *'
  ).evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height };
  }));
  assert.equal(actionBoxes.length, 3);
  assert(actionBoxes.every(box => Math.round(box.height) === 72));
  assert(
    Math.max(...actionBoxes.map(box => box.width)) - Math.min(...actionBoxes.map(box => box.width)) <= 1,
    `detail action widths are not equal: ${JSON.stringify(actionBoxes)}`
  );
  assert.equal(await page.locator('.detail-title-meta span').count(), 3);
  assert.deepEqual(
    (await page.locator('.detail-title-meta span').allTextContents()).map(text => text.trim()),
    ['作者 Moonlit Lab', '9.8 万 次下载', '7.4 MB']
  );
  assert.equal(await page.locator('.detail-metrics').count(), 0);
  await capture('mac-mods-detail.png');

  await detailSwitch.focus();
  assert.equal(
    await detailSwitch.evaluate(element => document.activeElement === element),
    true,
    'detail enable control did not receive keyboard focus'
  );
  const pageScrollBeforeKeyboard = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('Enter');
  const enterLockSnapshot = await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    const controlsBeforeRepeat = [
      ...document.querySelectorAll(
        '[data-action="toggle-enabled"][data-mod-id="dst-smart-stack"]'
      )
    ];
    const beforeRepeat = controlsBeforeRepeat.map(control => ({
      disabled: control.disabled,
      ariaBusy: control.getAttribute('aria-busy')
        || control.closest('.enabled-switch')?.getAttribute('aria-busy')
    }));
    controlsBeforeRepeat.forEach(control => {
      control.click();
      control.click();
    });
    api.dispatch({ type: 'CLOSE_DETAIL' });
    api.dispatch({ type: 'SET_ACTIVE_TAB', value: 'browse' });
    api.dispatch({ type: 'OPEN_DETAIL', modId: 'dst-smart-stack' });
    const controlsAfterPageChange = [
      ...document.querySelectorAll(
        '[data-action="toggle-enabled"][data-mod-id="dst-smart-stack"]'
      )
    ];
    controlsAfterPageChange.forEach(control => control.click());
    const state = api.getState();
    const snapshot = {
      beforeRepeat,
      afterPageChange: controlsAfterPageChange.map(control => ({
        disabled: control.disabled,
        ariaBusy: control.getAttribute('aria-busy')
          || control.closest('.enabled-switch')?.getAttribute('aria-busy')
      })),
      enabledValue: state.mods['dst-smart-stack'].enabled_value,
      pendingCount: Object.keys(state.ui.enableMutationByMod).length
    };
    api.dispatch({ type: 'SET_ACTIVE_TAB', value: 'installed' });
    api.dispatch({ type: 'OPEN_DETAIL', modId: 'dst-smart-stack' });
    return snapshot;
  });
  assert(enterLockSnapshot.beforeRepeat.length >= 2);
  assert(enterLockSnapshot.afterPageChange.length >= 2);
  assert(
    [...enterLockSnapshot.beforeRepeat, ...enterLockSnapshot.afterPageChange]
      .every(control => control.disabled && control.ariaBusy === 'true'),
    `enable controls were not locked together: ${JSON.stringify(enterLockSnapshot)}`
  );
  assert.equal(enterLockSnapshot.pendingCount, 1);
  assert.equal(enterLockSnapshot.enabledValue, 'enabled');
  await page.waitForTimeout(380);
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.getState().mods['dst-smart-stack'].enabled_value),
    'enabled'
  );
  assert.equal((await detailSwitch.textContent()).trim(), '已启用');
  assert.equal(
    await detailSwitch.evaluate(element => getComputedStyle(element).backgroundColor),
    'rgb(100, 215, 172)'
  );
  await capture('mac-mods-detail-enabled.png');

  await detailSwitch.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(380);
  assert.equal(await page.evaluate(() => window.scrollY), pageScrollBeforeKeyboard);
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.getState().mods['dst-smart-stack'].enabled_value),
    'disabled',
    'Space did not toggle the detail enable control exactly once'
  );
  assert.equal((await detailSwitch.textContent()).trim(), '已停用');
  assert.equal(
    await detailSwitch.evaluate(element => getComputedStyle(element).backgroundColor),
    'rgb(84, 81, 88)'
  );

  await page.locator(
    '[data-reference-region="mod-detail-modal"] .detail-enabled-control[role="switch"]'
  ).click();
  await page.evaluate(() => window.__DST_MODS_DEMO__.failEnableChange('dst-smart-stack'));
  await page.waitForTimeout(380);
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.getState().mods['dst-smart-stack'].enabled_value),
    'disabled',
    'failed enable mutation did not roll back'
  );
  assert.match(await page.locator('[data-toast-region]').textContent(), /启用状态修改失败/u);
  await page.evaluate(() => {
    window.__DST_MODS_DEMO__.dispatch({
      type: 'ENABLE_CHANGED',
      modId: 'dst-smart-stack',
      value: 'enabled'
    });
  });

  await page.evaluate(() => {
    window.__DST_MODS_DEMO__.dispatch({ type: 'OPEN_DETAIL', modId: 'dst-season-clock' });
  });
  const failedActionBoxes = await page.locator(
    '[data-reference-region="mod-detail-modal"] .modal-action-bar > *'
  ).evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height };
  }));
  assert.equal(failedActionBoxes.length, 4);
  assert(failedActionBoxes.every(box => Math.round(box.height) === 72));
  assert(
    Math.max(...failedActionBoxes.map(box => box.width))
      - Math.min(...failedActionBoxes.map(box => box.width)) <= 1,
    `failed detail action widths are not equal: ${JSON.stringify(failedActionBoxes)}`
  );
  const failedActionContracts = await page.locator(
    '[data-reference-region="mod-detail-modal"] .modal-action-bar > button'
  ).evaluateAll(buttons => buttons.map(button => ({
    text: button.textContent.trim(),
    action: button.dataset.action || null,
    disabled: button.disabled
  })));
  assert.deepEqual(
    failedActionContracts.map(contract => contract.text),
    ['已停用', '保留旧版 1.8.0', '重试更新', '卸载']
  );
  assert.deepEqual(
    failedActionContracts.map(contract => contract.action),
    ['toggle-enabled', null, 'update', 'uninstall']
  );
  assert.deepEqual(
    failedActionContracts.map(contract => contract.disabled),
    [false, true, false, false]
  );
  const failedDetailSwitch = page.locator(
    '[data-reference-region="mod-detail-modal"] .detail-enabled-control[role="switch"]'
  );
  await failedDetailSwitch.click();
  await page.waitForTimeout(380);
  const failedOldVersionState = await page.evaluate(() => {
    const state = window.__DST_MODS_DEMO__.getState();
    const mod = state.mods['dst-season-clock'];
    const task = state.tasks[mod.current_task_id];
    return {
      enabledValue: mod.enabled_value,
      installedVersion: mod.installed_version,
      updateFact: mod.update_fact,
      taskState: task?.task_state
    };
  });
  assert.deepEqual(failedOldVersionState, {
    enabledValue: 'enabled',
    installedVersion: '1.8.0',
    updateFact: 'update_available',
    taskState: 'failed'
  });
  await page.evaluate(() => {
    window.__DST_MODS_DEMO__.dispatch({
      type: 'ENABLE_CHANGED',
      modId: 'dst-season-clock',
      value: 'disabled'
    });
  });
  await page.locator(
    '[data-reference-region="mod-detail-modal"] [data-action="uninstall"]'
  ).click();
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.getState().ui.activeDialog),
    'uninstall-confirm'
  );
  await page.evaluate(() => {
    window.__DST_MODS_DEMO__.dispatch({ type: 'UNINSTALL_CANCELLED' });
    window.__DST_MODS_DEMO__.dispatch({ type: 'OPEN_DETAIL', modId: 'dst-season-clock' });
  });
  assert.equal(
    await page.locator(
      '[data-reference-region="mod-detail-modal"] [data-action="update"]:not([disabled])'
    ).count(),
    1,
    'retry update action was not available after keeping the old version'
  );

  assert(fs.statSync(path.join(prdImageDir, '01-mac-detail-disabled.png')).size > 10000);
  assert(fs.statSync(path.join(prdImageDir, '02-mac-detail-enabled.png')).size > 10000);
  assert(fs.statSync(path.join(prdImageDir, '03-mac-browse-toolbar.png')).size > 10000);
  assert(fs.statSync(path.join(prdImageDir, '04-mac-installed-toolbar.png')).size > 10000);

  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  console.log('PASS: browse header = tabs, sort select, search, refresh; default sort = trend');
  console.log('PASS: installed header = tabs, filter select, search, refresh; default filter = all');
  console.log('PASS: enabled controls support Enter/Space, request locking and rollback');
  console.log('PASS: failed update keeps the old version and exposes four ordered actions');
  console.log(`PASS: captured ${path.relative(root, evidenceDir)}`);
} finally {
  await context.close();
  await browser.close();
}

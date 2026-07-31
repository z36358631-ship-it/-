import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', 'Mod与发行人', 'Mod功能Mac端demo.html');
const evidenceDir = path.join(root, '.tmp', 'mods-sort-toggle-evidence');
const html = fs.readFileSync(demoPath, 'utf8');

assert.match(html, /\['trend', '热门趋势'\][\s\S]*\['downloads', '下载量'\][\s\S]*\['published', '最新发布'\]/u);
assert.match(html, /browseSort: 'trend'/u);
assert.match(html, /按近 24 小时下载增幅排序/u);
assert.match(html, /<span class="mods-subtitle">热门组件<\/span>/u);
assert.doesNotMatch(html, /mods-source-badge/u);
assert.doesNotMatch(html, /共 \$\{viewModel\.catalogTotal\} 个，当前加载/u);
assert.match(html, /class="detail-title-meta"/u);
assert.doesNotMatch(html, /class="detail-metrics"/u);
assert.doesNotMatch(html, /\.detail-title-meta span \+ span::before/u);
assert.doesNotMatch(html, /<h4>兼容性：<\/h4>/u);
assert.match(html, /function renderEnabledSwitch/u);
assert.match(html, /case 'ENABLE_CHANGE_FAILED'/u);
console.log('PASS: static sort, copy, metadata and switch contracts');

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find(fs.existsSync);
assert(executablePath, 'Local Chromium browser not found');

fs.mkdirSync(evidenceDir, { recursive: true });
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
  const sortLabels = await page.locator('.browse-sort-options button').allTextContents();
  assert.deepEqual(sortLabels.map(text => text.trim()), ['热门趋势', '下载量', '最新发布']);
  assert.equal(
    await page.locator('.browse-sort-options button.is-active').textContent(),
    '热门趋势'
  );
  assert.equal(await page.locator('[data-catalog-summary]').count(), 0);

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

  await page.locator('[data-action="set-browse-sort"][data-value="downloads"]').click();
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.derive().visibleMods[0].mod_id),
    'dst-fast-travel'
  );
  await page.locator('[data-action="set-browse-sort"][data-value="published"]').click();
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.derive().visibleMods[0].mod_id),
    'dst-smart-stack'
  );
  await page.locator('[data-action="set-browse-sort"][data-value="trend"]').click();
  assert.equal(await page.locator('.enabled-switch').count(), 4);
  await capture('mac-mods-browse.png');

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
  const smartInstalledSwitch = page.locator(
    '[data-mod-card][data-mod-id="dst-smart-stack"] [role="switch"]'
  );
  assert.equal(await smartInstalledSwitch.getAttribute('aria-checked'), 'false');
  assert.equal(await page.locator('[data-catalog-summary]').textContent(), '4 个已安装 · 仅此设备');
  await capture('mac-mods-installed.png');

  await page.locator(
    '[data-mod-card][data-mod-id="dst-smart-stack"] [data-card-detail]'
  ).click();
  const detailSwitch = page.locator(
    '[data-reference-region="mod-detail-modal"] .detail-enabled-control [role="switch"]'
  );
  assert.equal(await detailSwitch.getAttribute('aria-checked'), 'false');
  assert.equal(await page.locator('.detail-title-meta span').count(), 3);
  assert.deepEqual(
    (await page.locator('.detail-title-meta span').allTextContents()).map(text => text.trim()),
    ['作者 Moonlit Lab', '9.8 万 次下载', '7.4 MB']
  );
  assert.equal(await page.locator('.detail-metrics').count(), 0);
  await capture('mac-mods-detail.png');

  await detailSwitch.click();
  await page.waitForTimeout(380);
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.getState().mods['dst-smart-stack'].enabled_value),
    'enabled'
  );

  await page.locator(
    '[data-reference-region="mod-detail-modal"] .detail-enabled-control [role="switch"]'
  ).click();
  await page.evaluate(() => window.__DST_MODS_DEMO__.failEnableChange('dst-smart-stack'));
  await page.waitForTimeout(380);
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__.getState().mods['dst-smart-stack'].enabled_value),
    'enabled',
    'failed enable mutation did not roll back'
  );
  assert.match(await page.locator('[data-toast-region]').textContent(), /启用状态修改失败/u);

  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  console.log('PASS: sort options = trend, downloads, published; default = trend');
  console.log('PASS: enabled switches synchronized, isolated and rollback-safe');
  console.log(`PASS: captured ${path.relative(root, evidenceDir)}`);
} finally {
  await context.close();
  await browser.close();
}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const demoFile = path.resolve('demos/开发者后台一期/开发者平台demo.html');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

const demoUrl = pathToFileURL(demoFile).href + '#/P01-01';

async function openApproved(page) {
  await page.goto(demoUrl, { waitUntil:'load' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.name = '';
    const key = 'release-linked-state';
    sessionStorage.setItem('gamehub-developer-session-v1', JSON.stringify({ authenticated:true, accountKey:key }));
    localStorage.setItem('gamehub-developer-account-states-v1', JSON.stringify({
      [key]: {
        registration:{ accountTier:'enterprise', registeredAt:'2026-09-10 10:00', consoleTab:'games', vendorSettingsTab:'subject' },
        qualification:{ status:'approved', revision:1, step:5, view:'form', form:{}, history:[], submissions:[] },
      },
    }));
    history.replaceState(null, '', '#/P02-01');
  });
  await page.reload({ waitUntil:'load' });
  await page.locator('[data-publisher-workspace][data-workspace-view="games"]').waitFor();
}

test('版本发布联动、缺省跳转和全局 Demo 状态可用', { timeout:30_000 }, async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  const browser = await chromium.launch({ headless:true, executablePath:chrome, args:['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport:{ width:1440, height:1000 } });
  page.setDefaultTimeout(5000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  try {
    await openApproved(page);
    assert.equal(await page.locator('.developer-demo-state-switcher').count(), 1);
    await page.locator('[data-portal-action="demo-state-toggle"]').click();
    await page.locator('[data-demo-publisher-scenario="empty"]').click();
    await page.locator('.publisher-game-list-empty').filter({ hasText:'暂无游戏' }).waitFor();
    await page.locator('[data-portal-action="demo-state-toggle"]').click();
    await page.locator('[data-demo-publisher-scenario="exhaustive"]').click();
    await page.locator('[data-portal-action="enter-publisher-game"][data-publisher-game="existing"]').waitFor();

    await page.locator('[data-portal-action="publisher-sidebar-view"][data-publisher-view="vendor"]').click();
    await page.locator('[data-publisher-page="vendor"]').waitFor();
    assert.equal(await page.locator('.developer-demo-state-switcher').count(), 1);
    for (const vendorTab of ['subject', 'profile']) {
      await page.locator(`[data-vendor-settings-tab="${vendorTab}"]`).click();
      await page.locator(`[data-vendor-settings-panel="${vendorTab}"]:not([hidden])`).waitFor();
      assert.equal(await page.locator('.developer-demo-state-switcher').count(), 1);
    }
    await page.locator('[data-portal-action="publisher-sidebar-view"][data-publisher-view="games"]').click();
    await page.locator('[data-publisher-workspace][data-workspace-view="games"]').waitFor();
    await page.locator('[data-portal-action="enter-publisher-game"][data-publisher-game="existing"]').first().click();
    await page.locator('[data-publisher-profile][data-profile-module="release-workspace"]').waitFor();

    assert.equal(await page.locator('.developer-demo-state-switcher').count(), 1);
    await page.locator('[data-portal-action="demo-state-toggle"]').click();
    assert.deepEqual(await page.locator('[data-demo-publisher-scenario]').allTextContents(), ['穷举态', '缺省态']);
    assert.equal(await page.locator('[data-demo-qualification-status], [data-demo-release-status]').count(), 0);

    const buildRows = page.locator('[data-release-build-row]');
    assert.ok(await buildRows.count() >= 4);
    assert.ok(await page.locator('[data-release-build-select]:checked').count() >= 2);
    assert.ok(await page.locator('[data-release-product]').count() >= 2);
    assert.ok(await page.locator('[data-release-dlc]').count() >= 1);

    const baseBuilds = page.locator('[data-release-build-select][data-release-build-app="APP-7F3A9C"]:not(:disabled)');
    assert.ok(await baseBuilds.count() >= 2);
    const nextBaseBuildId = await baseBuilds.nth(1).getAttribute('data-release-build-select');
    await baseBuilds.nth(1).check({ force:true });
    await page.waitForTimeout(100);
    const selectedBuildIds = await page.locator('[data-release-build-select]:checked').evaluateAll(inputs => inputs.map(input => input.dataset.releaseBuildSelect));
    assert.ok(selectedBuildIds.includes(nextBaseBuildId), JSON.stringify({ nextBaseBuildId, selectedBuildIds, runtimeErrors }));
    const checkedBaseBuilds = page.locator('[data-release-build-select][data-release-build-app="APP-7F3A9C"]:checked');
    assert.equal(await checkedBaseBuilds.count(), 1);
    assert.equal(await checkedBaseBuilds.first().getAttribute('data-release-build-select'), nextBaseBuildId);

    assert.deepEqual(await page.locator('[data-windows-requirement-level]').evaluateAll(nodes => nodes.map(node => node.dataset.windowsRequirementLevel)), ['minimum', 'recommended']);
    for (const field of ['requires64Bit', 'os', 'cpu', 'memory', 'memoryUnit', 'gpu', 'directx', 'network', 'storage', 'storageUnit', 'soundCard', 'notes']) {
      assert.ok(await page.locator(`[data-windows-requirement$=".${field}"]`).count() >= 2, `missing ${field}`);
    }

    await page.locator('[data-portal-action="demo-state-toggle"]').click();
    await page.locator('[data-demo-publisher-scenario="empty"]').click();
    await page.locator('[data-release-source-empty="package-builds"]').waitFor();
    assert.deepEqual(await page.locator('[data-release-source-jump]').evaluateAll(nodes => nodes.map(node => node.dataset.releaseSourceJump)), ['package-builds', 'price-packages', 'price-dlc']);

    await page.locator('[data-release-source-jump="package-builds"]').click();
    await page.locator('[data-profile-source-section="package-builds"]').waitFor();
    assert.match(await page.locator('[data-profile-source-section="package-builds"]').innerText(), /暂无记录/);
    assert.equal(await page.locator('.developer-demo-state-switcher').count(), 1);
    assert.deepEqual(runtimeErrors, []);
  } finally {
    await browser.close();
  }
});

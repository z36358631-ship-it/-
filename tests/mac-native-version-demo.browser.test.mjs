import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = process.cwd();
const demoPath = path.join(root, 'demos', 'PC与Mac端', 'Mac原生游戏版本管理demo.html');
const resultDir = path.join(root, 'test-results', 'mac-native-version-switch');
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(fs.existsSync);

assert.ok(executablePath, '未找到本地 Chrome 或 Edge');

test('版本选择、下载入口与安装状态在真实浏览器中保持一致', { timeout: 20_000 }, async () => {
  fs.mkdirSync(resultDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
    await page.evaluate(() => showPage('settings'));

    const settingsNative = page.locator('#versionList [data-action="switch-version"][data-version="native"]');
    assert.equal((await settingsNative.textContent())?.trim(), '选择版本');
    await settingsNative.click();
    assert.equal(await page.locator('#page-detail').evaluate(element => element.classList.contains('active')), true);
    assert.equal(await page.locator('#installOverlay').evaluate(element => element.classList.contains('show')), false);
    assert.match((await page.locator('#detailCta').textContent()) ?? '', /下载\s*284\.6 MB/);

    await page.reload({ waitUntil: 'load' });
    await page.evaluate(() => showPage('detail'));
    await page.locator('#detailMoreBtn').click();
    await page.locator('[data-action="open-version-switch"]').click();
    assert.equal(await page.locator('#versionSwitchOverlay').evaluate(element => element.classList.contains('show')), true);
    await page.locator('#versionSwitchList [data-version="native"]').click();
    assert.equal(await page.locator('#versionSwitchOverlay').evaluate(element => element.classList.contains('show')), false);
    assert.equal(await page.locator('#installOverlay').evaluate(element => element.classList.contains('show')), false);
    assert.match((await page.locator('#detailCta').textContent()) ?? '', /下载\s*284\.6 MB/);

    await page.locator('#detailCta').click();
    assert.equal(await page.locator('#installOverlay').evaluate(element => element.classList.contains('show')), true);
    assert.equal(await page.locator('#installOverlay').getAttribute('aria-labelledby'), 'installDialogTitle');
    assert.equal(await page.locator('#installPathMessage').getAttribute('aria-live'), 'polite');
    assert.equal(await page.locator('#installError').getAttribute('aria-live'), 'assertive');
    assert.equal((await page.locator('#selectedVersionName').textContent())?.trim(), 'Mac 原生版');

    const pathRows = page.locator('#installPathList .install-path-option');
    assert.equal(await pathRows.count(), 4);
    assert.equal(await page.evaluate(() => state.selectedPathId), 'external');
    assert.deepStrictEqual(
      await pathRows.evaluateAll(rows => rows.map(row => row.dataset.pathId)),
      ['external', 'applications', 'small', 'offline']
    );
    const pathListMetrics = await page.locator('#installPathList').evaluate(element => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    assert.ok(pathListMetrics.scrollHeight <= pathListMetrics.clientHeight, '默认四条路径未完整显示');
    assert.equal((await page.locator('[data-path-id="external"] .install-path-value').textContent())?.trim(), '/Volumes/external_disk/Gamehub/');
    assert.equal(await page.locator('[data-path-id="small"]').isDisabled(), true);
    assert.match((await page.locator('[data-path-id="small"] .install-path-meta').textContent()) ?? '', /空间不足/);
    assert.equal(await page.locator('[data-path-id="offline"]').isDisabled(), true);
    assert.match((await page.locator('[data-path-id="offline"] .install-path-meta').textContent()) ?? '', /路径不可用/);
    await page.screenshot({ path: path.join(resultDir, '06-path-list-default-largest.png') });

    const assertInstallDialogFits = async () => {
      const layout = await page.locator('#installOverlay .install-modal').evaluate(element => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left };
      });
      const viewport = page.viewportSize();
      assert.ok(viewport && layout.top >= 0 && layout.left >= 0 && layout.right <= viewport.width && layout.bottom <= viewport.height);
    };
    await assertInstallDialogFits();
    await page.setViewportSize({ width: 1280, height: 800 });
    await assertInstallDialogFits();
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.locator('[data-path-id="applications"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => state.selectedPathId), 'applications');
    assert.equal(await page.locator('[data-path-id="applications"]').getAttribute('aria-checked'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.pathId), 'applications');
    await page.locator('[data-path-id="external"]').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => state.selectedPathId), 'external');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.pathId), 'external');
    await page.locator('[data-path-id="applications"]').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => state.selectedPathId), 'applications');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.pathId), 'applications');

    await page.evaluate(() => {
      installPaths.find(pathItem => pathItem.id === 'external').availableBytes = 128000000000;
      renderInstall();
    });
    assert.deepStrictEqual(
      await pathRows.evaluateAll(rows => rows.slice(0, 2).map(row => row.dataset.pathId)),
      ['external', 'applications']
    );
    await page.evaluate(() => {
      installPaths.find(pathItem => pathItem.id === 'external').availableBytes = 512000000000;
      renderInstall();
    });

    await page.locator('#selectedVersionName').click();
    await page.locator('#versionMenu [data-version="steam"]').click();
    assert.equal(await page.evaluate(() => state.selectedPathId), 'applications');
    await page.locator('#selectedVersionName').click();
    await page.locator('#versionMenu [data-version="native"]').click();
    assert.equal(await page.evaluate(() => state.selectedPathId), 'applications');

    await page.evaluate(() => {
      installPaths.find(pathItem => pathItem.id === 'applications').availableBytes = 270000000;
      state.selectedInstallVersion = 'steam';
      state.selectedPathId = 'applications';
      renderInstall();
    });
    await page.locator('#selectedVersionName').click();
    await page.locator('#versionMenu [data-version="native"]').click();
    assert.equal(await page.evaluate(() => state.selectedPathId), 'external');

    await page.evaluate(() => {
      installPaths.forEach(pathItem => {
        pathItem.status = pathItem.id === 'offline' ? 'missing' : 'available';
        if (pathItem.id !== 'offline') pathItem.availableBytes = 100000000;
      });
      state.selectedPathId = null;
      ensureSelectedPath(versions[state.selectedInstallVersion], { force: true });
      renderInstall();
    });
    assert.equal(await page.evaluate(() => state.selectedPathId), null);
    assert.equal(await page.locator('#installBtn').isDisabled(), true);
    assert.match((await page.locator('#installPathMessage').textContent()) ?? '', /没有可用且空间足够/);
    await page.screenshot({ path: path.join(resultDir, '07-path-list-no-eligible.png') });

    await page.evaluate(() => {
      const external = installPaths.find(pathItem => pathItem.id === 'external');
      const applications = installPaths.find(pathItem => pathItem.id === 'applications');
      external.status = 'available';
      external.availableBytes = 512000000000;
      applications.status = 'available';
      applications.availableBytes = 128000000000;
      ensureSelectedPath(versions[state.selectedInstallVersion], { force: true });
      renderInstall();
    });
    await page.evaluate(() => { installPaths.find(pathItem => pathItem.id === 'external').availableBytes = 100000000; });
    await page.locator('#installBtn').click();
    assert.equal(await page.evaluate(() => state.selectedPathId), null);
    assert.match((await page.locator('#installError').textContent()) ?? '', /存储空间不足/);
    assert.equal(await page.evaluate(() => state.downloadState), 'idle');
    assert.equal(await page.evaluate(() => state.activeVersion), 'steam');
    assert.equal(await page.evaluate(() => state.installedVersions.has('native')), false);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.pathId), 'applications');
    assert.equal(await page.evaluate(() => document.querySelector('#installOverlay').contains(document.activeElement)), true);

    await page.evaluate(() => {
      installPaths.find(pathItem => pathItem.id === 'external').availableBytes = 512000000000;
      ensureSelectedPath(versions[state.selectedInstallVersion], { force: true });
      renderInstall();
    });
    await page.evaluate(() => { installPaths.find(pathItem => pathItem.id === 'external').status = 'missing'; });
    await page.locator('#installBtn').click();
    assert.equal(await page.evaluate(() => state.selectedPathId), null);
    assert.match((await page.locator('#installError').textContent()) ?? '', /安装位置不可用/);
    assert.equal(await page.locator('#installError').evaluate(element => element.classList.contains('info')), false);
    assert.equal(await page.locator('#installError').evaluate(element => getComputedStyle(element).color), 'rgb(255, 133, 133)');
    assert.equal(await page.evaluate(() => state.downloadState), 'idle');
    assert.equal(await page.evaluate(() => state.activeVersion), 'steam');
    assert.equal(await page.evaluate(() => state.installedVersions.has('native')), false);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.pathId), 'applications');
    assert.equal(await page.evaluate(() => document.querySelector('#installOverlay').contains(document.activeElement)), true);

    await page.evaluate(() => {
      const external = installPaths.find(pathItem => pathItem.id === 'external');
      const applications = installPaths.find(pathItem => pathItem.id === 'applications');
      external.status = 'available';
      external.availableBytes = 512000000000;
      applications.status = 'available';
      applications.availableBytes = 128000000000;
      ensureSelectedPath(versions[state.selectedInstallVersion], { force: true });
      renderInstall();
    });
    await page.evaluate(() => {
      installPaths.forEach(pathItem => {
        pathItem.status = pathItem.id === 'offline' ? 'missing' : 'available';
        if (pathItem.id !== 'offline') pathItem.availableBytes = 100000000;
      });
    });
    await page.locator('#installBtn').click();
    assert.equal(await page.evaluate(() => state.selectedPathId), null);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'installError');
    assert.equal(await page.evaluate(() => document.querySelector('#installOverlay').contains(document.activeElement)), true);

    await page.evaluate(() => {
      const external = installPaths.find(pathItem => pathItem.id === 'external');
      const applications = installPaths.find(pathItem => pathItem.id === 'applications');
      external.status = 'available';
      external.availableBytes = 512000000000;
      applications.status = 'available';
      applications.availableBytes = 128000000000;
      ensureSelectedPath(versions[state.selectedInstallVersion], { force: true });
      renderInstall();
    });
    await page.locator('#installBtn').click();
    assert.equal(await page.locator('#installPathList .install-path-option').first().isDisabled(), true);
    assert.equal(await page.locator('#selectedVersionName').isDisabled(), true);
    assert.match((await page.locator('#installError').textContent()) ?? '', /正在下载 Mac 原生版/);
    assert.equal(await page.locator('#installError').evaluate(element => element.classList.contains('info')), true);
    assert.equal(await page.locator('#installPathList').evaluate(element => getComputedStyle(element).opacity), '1');
    assert.ok(Number(await page.locator('[data-path-id="external"]').evaluate(element => getComputedStyle(element).opacity)) >= 0.8);
    const lockedPath = await page.evaluate(() => state.selectedPathId);
    await page.evaluate(() => selectInstallPath('applications'));
    assert.equal(await page.evaluate(() => state.selectedPathId), lockedPath);
    assert.equal(await page.evaluate(() => state.selectedInstallVersion), 'native');
    assert.notEqual(
      await page.locator('[data-path-id="external"] .install-path-meta').evaluate(element => getComputedStyle(element).color),
      await page.locator('[data-path-id="offline"] .install-path-meta').evaluate(element => getComputedStyle(element).color)
    );
    await page.screenshot({ path: path.join(resultDir, '08-path-list-download-locked.png') });
    await page.waitForTimeout(650);
    assert.ok(await page.evaluate(() => state.downloadProgress > 0));
    await page.locator('#installBtn').click();
    assert.equal(await page.evaluate(() => state.downloadProgress), 0);
    assert.equal(await page.locator('#progressBar').evaluate(element => element.style.width), '0%');
    assert.equal(await page.locator('#installError').evaluate(element => element.classList.contains('neutral')), true);
    assert.equal(await page.locator('[data-path-id="external"]').isDisabled(), false);
    assert.equal(await page.locator('#selectedVersionName').isDisabled(), false);
    assert.equal(await page.evaluate(() => state.selectedPathId), lockedPath);
    assert.equal(await page.evaluate(() => state.activeVersion), 'steam');
    assert.equal(await page.evaluate(() => state.installedVersions.has('native')), false);

    await page.evaluate(() => {
      const nativeSetInterval = window.setInterval.bind(window);
      window.setInterval = callback => nativeSetInterval(callback, 10);
    });
    await page.locator('#installBtn').click();
    await page.waitForFunction(() => state.downloadState === 'success');
    assert.equal(await page.evaluate(() => state.activeVersion), 'native');
    assert.equal(await page.evaluate(() => state.selectedVersion), 'native');
    assert.equal(await page.evaluate(() => state.installedVersions.has('native')), true);
    await page.waitForFunction(() => !document.querySelector('#installOverlay').classList.contains('show'));
    await page.locator('#detailMoreBtn').click();
    await page.locator('[data-action="open-version-switch"]').click();
    await page.locator('#versionSwitchList [data-version="steam"]').click();
    assert.equal(await page.evaluate(() => state.activeVersion), 'steam');
    assert.equal(await page.evaluate(() => state.installedVersions.has('native')), true);
    assert.match((await page.locator('#detailCta').textContent()) ?? '', /开始游戏/);
    assert.deepStrictEqual(pageErrors, []);
  } finally {
    await browser.close();
  }
});

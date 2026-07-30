import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = path.join(root, '.tmp', 'dst-mods-demo-evidence');
fs.mkdirSync(evidenceDir, { recursive: true });

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].find(fs.existsSync);
assert(executablePath, 'Local Chrome not found');

const files = {
  mac: path.join(root, 'demos', 'Mod与发行人', 'Mod功能Mac端demo.html'),
  app: path.join(root, 'demos', 'Mod与发行人', 'Mod功能APP端demo.html'),
  scene: path.join(root, 'demos', 'Mod与发行人', 'Mod功能APP端-场景联动demo.html')
};

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--allow-file-access-from-files']
});

async function openDemo(file, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.setOffline(true);
  const page = await context.newPage();
  const externalRequests = [];
  const pageErrors = [];
  const consoleErrors = [];

  page.on('request', request => {
    if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  await page.locator('[data-demo-root]').waitFor({ state: 'visible' });
  await page.waitForTimeout(50);

  assert.deepEqual(externalRequests, [], `${path.basename(file)} made external requests`);
  assert.deepEqual(pageErrors, [], `${path.basename(file)} emitted page errors`);
  assert.deepEqual(consoleErrors, [], `${path.basename(file)} emitted console errors`);
  assert.equal(
    await page.evaluate(() => window.__DST_MODS_DEMO__?.version),
    'dst_mods_demo_v1'
  );

  const baseState = await page.evaluate(() => window.__DST_MODS_DEMO__.getState());
  assert.equal(baseState.contractVersion, 'dst_mods_demo_v1');
  assert.equal(baseState.game_id, 'steam:322330');
  assert(baseState.device_installation_id);
  assert(baseState.mods && baseState.tasks && baseState.ui && baseState.launch);

  return { context, page, pageErrors, consoleErrors, externalRequests };
}

async function assertNoOverflow(page, label) {
  const layout = await page.locator('[data-demo-root]').evaluate(element => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    rectWidth: element.getBoundingClientRect().width,
    rectHeight: element.getBoundingClientRect().height
  }));
  assert(
    layout.scrollWidth <= layout.clientWidth + 2,
    `${label} has horizontal overflow: ${layout.scrollWidth}/${layout.clientWidth}`
  );
  assert(layout.rectWidth > 300 && layout.rectHeight > 300, `${label} root is unexpectedly small`);
}

async function assertAppTapTargets(page, label) {
  const tooSmall = await page.locator('[data-demo-root] button:visible').evaluateAll(buttons =>
    buttons
      .map(button => ({
        text: button.getAttribute('aria-label') || button.textContent?.trim() || '(icon)',
        width: button.getBoundingClientRect().width,
        height: button.getBoundingClientRect().height
      }))
      .filter(item => item.width < 44 || item.height < 44)
  );
  assert.deepEqual(tooSmall, [], `${label} contains touch targets below 44px`);
}

async function runSharedStateVector(page, label) {
  const first = await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    api.reset();
    api.dispatch({ type: 'OPEN_MODS' });
    api.dispatch({ type: 'OPEN_DETAIL', modId: 'dst-fast-travel', mod_id: 'dst-fast-travel' });
    api.dispatch({ type: 'INSTALL_REQUESTED', modId: 'dst-fast-travel', mod_id: 'dst-fast-travel' });
    api.dispatch({ type: 'INSTALL_REQUESTED', modId: 'dst-fast-travel', mod_id: 'dst-fast-travel' });
    const state = api.getState();
    return {
      taskCreateCount: state.metrics.taskCreateCount,
      taskIds: Object.keys(state.tasks),
      currentTaskId: state.mods['dst-fast-travel'].current_task_id
    };
  });

  assert.equal(first.taskCreateCount, 1, `${label} created duplicate tasks`);
  assert.equal(first.taskIds.length, 1, `${label} created duplicate task ids`);
  assert.equal(first.currentTaskId, first.taskIds[0]);

  const completed = await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    for (let index = 0; index < 10; index += 1) {
      const taskId = api.getState().mods['dst-fast-travel'].current_task_id;
      api.dispatch({
        type: 'TASK_ADVANCE',
        modId: 'dst-fast-travel',
        mod_id: 'dst-fast-travel',
        taskId,
        task_id: taskId
      });
    }
    const mod = api.getState().mods['dst-fast-travel'];
    return {
      installation_fact: mod.installation_fact,
      enabled_value: mod.enabled_value,
      current_task_id: mod.current_task_id
    };
  });
  assert.equal(completed.installation_fact, 'installed', `${label} did not finish installation`);
  assert.equal(completed.enabled_value, 'enabled', `${label} did not enable after installation`);

  const updateFailure = await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    const before = api.getState().mods['dst-fast-travel'];
    api.dispatch({ type: 'UPDATE_REQUESTED', modId: 'dst-fast-travel', mod_id: 'dst-fast-travel' });
    api.dispatch({ type: 'UPDATE_FAILED', modId: 'dst-fast-travel', mod_id: 'dst-fast-travel' });
    const after = api.getState().mods['dst-fast-travel'];
    return {
      beforeVersion: before.installed_version,
      beforeEnabled: before.enabled_value,
      afterVersion: after.installed_version,
      afterEnabled: after.enabled_value,
      installationFact: after.installation_fact,
      updateFact: after.update_fact
    };
  });
  assert.equal(updateFailure.afterVersion, updateFailure.beforeVersion);
  assert.equal(updateFailure.afterEnabled, updateFailure.beforeEnabled);
  assert.equal(updateFailure.installationFact, 'installed');
  assert.equal(updateFailure.updateFact, 'update_available');
}

async function runOrientationVector(page, label) {
  const before = await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    api.reset();
    api.dispatch({ type: 'OPEN_MODS' });
    api.dispatch({ type: 'SET_TAB', tab: 'available' });
    api.dispatch({ type: 'SET_SEARCH', value: '快速旅行' });
    api.dispatch({ type: 'SET_SORT', value: 'updated' });
    api.dispatch({ type: 'SET_FILTER', value: 'all' });
    api.dispatch({ type: 'OPEN_DETAIL', modId: 'dst-fast-travel', mod_id: 'dst-fast-travel' });
    api.dispatch({ type: 'SET_READING_SECTION', sectionId: 'changelog' });
    api.dispatch({ type: 'INSTALL_REQUESTED', modId: 'dst-fast-travel', mod_id: 'dst-fast-travel' });
    return api.getState();
  });

  await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    api.dispatch({ type: 'ORIENTATION_CHANGED', orientation: 'landscape' });
    api.dispatch({ type: 'ORIENTATION_CHANGED', orientation: 'portrait' });
  });

  const after = await page.evaluate(() => window.__DST_MODS_DEMO__.getState());
  assert.equal(after.orientation, 'portrait');
  assert.equal(after.ui.tab, before.ui.tab, `${label} lost the active tab`);
  assert.equal(after.ui.searchText, before.ui.searchText, `${label} lost search text`);
  assert.equal(after.ui.sortKey, before.ui.sortKey, `${label} lost sort`);
  assert.equal(after.ui.filterKey, before.ui.filterKey, `${label} lost filter`);
  assert.equal(after.ui.currentModId, before.ui.currentModId, `${label} lost current mod`);
  assert.equal(after.ui.readingSectionId, before.ui.readingSectionId, `${label} lost reading section`);
  assert.equal(
    after.mods['dst-fast-travel'].current_task_id,
    before.mods['dst-fast-travel'].current_task_id,
    `${label} replaced the running task`
  );
  assert.equal(after.metrics.taskCreateCount, 1, `${label} created a task while rotating`);
  assert.equal(
    after.metrics.detailRequestCount,
    before.metrics.detailRequestCount,
    `${label} requested the detail again while rotating`
  );
}

async function runAppInteractionOrientationContinuity(page) {
  await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    api.reset();
    api.dispatch({ type: 'OPEN_MODS' });
    api.dispatch({ type: 'OPEN_DETAIL', modId: 'dst-fast-travel', mod_id: 'dst-fast-travel' });
  });
  await page.locator('[data-review-action="landscape"]').click();
  await page.locator('[data-action="reading-section"][data-section="changelog"]').click();
  await page.waitForTimeout(50);

  const before = await page.evaluate(() => ({
    state: window.__DST_MODS_DEMO__.getState(),
    scrollTop: document.querySelector('[data-scroll-container="detail"]').scrollTop,
    targetVisible: (() => {
      const container = document.querySelector('[data-scroll-container="detail"]');
      const target = container.querySelector('[data-detail-section="changelog"]');
      const bounds = container.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      return rect.top >= bounds.top - 1 && rect.top < bounds.bottom - 1;
    })()
  }));
  assert.equal(before.state.ui.readingSectionId, 'changelog');
  assert.equal(before.targetVisible, true, 'app changelog jump left the target outside the viewport');

  await page.locator('[data-review-action="portrait"]').click();
  await page.waitForTimeout(50);
  await page.locator('[data-review-action="landscape"]').click();
  await page.waitForTimeout(50);

  const after = await page.evaluate(() => ({
    state: window.__DST_MODS_DEMO__.getState(),
    scrollTop: document.querySelector('[data-scroll-container="detail"]').scrollTop,
    targetVisible: (() => {
      const container = document.querySelector('[data-scroll-container="detail"]');
      const target = container.querySelector('[data-detail-section="changelog"]');
      const bounds = container.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      return rect.top >= bounds.top - 1 && rect.top < bounds.bottom - 1;
    })()
  }));
  assert.equal(after.state.ui.readingSectionId, 'changelog');
  assert.equal(after.targetVisible, true, 'app rotation hid the selected changelog section');
  assert.equal(after.state.ui.currentModId, before.state.ui.currentModId);
  assert.equal(after.state.metrics.detailRequestCount, before.state.metrics.detailRequestCount);
  assert(
    Math.abs(after.scrollTop - before.scrollTop) <= 3,
    `app detail lost its real-button scroll anchor: ${before.scrollTop} -> ${after.scrollTop}`
  );
}

async function runSceneScrollContinuity(page) {
  const before = await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    api.reset();
    api.dispatch({ type: 'OPEN_MODS' });
    api.dispatch({ type: 'OPEN_DETAIL', modId: 'dst-fast-travel', mod_id: 'dst-fast-travel' });
    api.dispatch({ type: 'ORIENTATION_CHANGED', orientation: 'landscape' });
    const scroller = document.querySelector('[data-screen="mod-detail"] .detail-copy');
    scroller.scrollTop = Math.min(88, scroller.scrollHeight - scroller.clientHeight);
    return {
      scrollTop: scroller.scrollTop,
      maxScrollTop: scroller.scrollHeight - scroller.clientHeight
    };
  });
  assert(before.maxScrollTop >= 80, 'scene detail fixture cannot exercise scroll continuity');

  await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    api.dispatch({ type: 'ORIENTATION_CHANGED', orientation: 'portrait' });
    api.dispatch({ type: 'ORIENTATION_CHANGED', orientation: 'landscape' });
  });

  const after = await page.locator('[data-screen="mod-detail"] .detail-copy').evaluate(
    element => element.scrollTop
  );
  assert(
    Math.abs(after - before.scrollTop) <= 3,
    `scene detail lost its scroll anchor: ${before.scrollTop} -> ${after}`
  );
}

async function runSceneUpdateVector(page) {
  const result = await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    const modId = 'dst-storage-labels';
    api.reset();
    api.dispatch({ type: 'UPDATE_FAILED', modId, mod_id: modId });
    const before = api.getState().mods[modId];
    api.dispatch({ type: 'UPDATE_REQUESTED', modId, mod_id: modId });
    let taskId = api.getState().mods[modId].current_task_id;
    api.dispatch({ type: 'TASK_ADVANCE', modId, mod_id: modId, taskId, task_id: taskId });
    const active = api.getState();
    api.dispatch({ type: 'UPDATE_REQUESTED', modId, mod_id: modId });
    const during = api.getState();
    api.dispatch({ type: 'UPDATE_FAILED', modId, mod_id: modId });
    const after = api.getState();
    taskId = during.mods[modId].current_task_id;
    return {
      before,
      taskCreateCount: during.metrics.taskCreateCount,
      taskIds: Object.keys(during.tasks),
      currentTaskId: taskId,
      operation: during.tasks[taskId]?.operation,
      activeTask: active.tasks[taskId],
      repeatedTask: during.tasks[taskId],
      afterMod: after.mods[modId],
      afterTask: after.tasks[taskId]
    };
  });
  assert.equal(result.taskCreateCount, 1);
  assert.equal(result.taskIds.length, 1);
  assert.equal(result.currentTaskId, result.taskIds[0]);
  assert.equal(result.operation, 'update');
  assert.equal(result.repeatedTask.task_state, result.activeTask.task_state);
  assert.equal(result.repeatedTask.progress_percent, result.activeTask.progress_percent);
  assert.equal(result.repeatedTask.downloaded_bytes, result.activeTask.downloaded_bytes);
  assert.equal(result.repeatedTask.operation_attempt, result.activeTask.operation_attempt);
  assert.equal(result.afterMod.installed_version, result.before.installed_version);
  assert.equal(result.afterMod.enabled_value, result.before.enabled_value);
  assert.equal(result.afterMod.update_fact, 'update_available');
  assert.equal(result.afterTask.task_state, 'failed');
}

async function runSceneUpdateSuccessVector(page) {
  const result = await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    const modId = 'dst-storage-labels';
    api.reset();
    api.dispatch({ type: 'ENABLE_CHANGED', modId, mod_id: modId, enabled: false });
    api.dispatch({ type: 'UPDATE_FAILED', modId, mod_id: modId });
    api.dispatch({ type: 'UPDATE_REQUESTED', modId, mod_id: modId });
    const taskId = api.getState().mods[modId].current_task_id;
    for (let index = 0; index < 6; index += 1) {
      api.dispatch({ type: 'TASK_ADVANCE', modId, mod_id: modId, taskId, task_id: taskId });
    }
    const state = api.getState();
    return {
      mod: state.mods[modId],
      fastTravel: state.mods['dst-fast-travel'],
      taskIds: Object.keys(state.tasks),
      task: state.tasks[taskId],
      taskCreateCount: state.metrics.taskCreateCount
    };
  });
  assert.equal(result.mod.installation_fact, 'installed');
  assert.equal(result.mod.enabled_value, 'disabled');
  assert.equal(result.mod.update_fact, 'no_update');
  assert.equal(result.task.task_state, 'succeeded');
  assert.equal(result.taskCreateCount, 1);
  assert.deepEqual(result.taskIds, [result.task.task_id]);
  assert.equal(result.fastTravel.installation_fact, 'not_installed');
  assert.equal(result.fastTravel.current_task_id, null);
}

async function runSceneAutoResumeFailureVector(page) {
  const result = await page.evaluate(() => {
    const api = window.__DST_MODS_DEMO__;
    const modId = 'dst-fast-travel';
    api.reset();
    api.dispatch({ type: 'INSTALL_REQUESTED', modId, mod_id: modId });
    let taskId = api.getState().mods[modId].current_task_id;
    api.dispatch({
      type: 'SYSTEM_PAUSED',
      modId,
      mod_id: modId,
      autoResumeShouldFail: true
    });
    api.dispatch({ type: 'APP_FOREGROUNDED', modId, mod_id: modId });
    const paused = api.getState();
    taskId = paused.mods[modId].current_task_id;
    api.dispatch({ type: 'CONTINUE_REQUESTED', modId, mod_id: modId });
    const continued = api.getState();
    return {
      taskId,
      pausedTask: paused.tasks[taskId],
      continuedTask: continued.tasks[taskId]
    };
  });
  assert.equal(result.pausedTask.task_state, 'paused_by_system');
  assert.equal(result.pausedTask.auto_resume_used, true);
  assert.equal(result.pausedTask.auto_resume_failed, true);
  assert.equal(result.continuedTask.task_id, result.taskId);
  assert.equal(result.continuedTask.task_state, 'downloading');
}

async function capture(page, name) {
  const target = path.join(evidenceDir, name);
  await page.locator('[data-demo-root]').screenshot({ path: target });
  assert(fs.statSync(target).size > 0, `${name} is empty`);
}

try {
  {
    const { context, page } = await openDemo(files.mac, { width: 1440, height: 900 });
    await runSharedStateVector(page, 'mac');
    await page.evaluate(() => window.__DST_MODS_DEMO__.reset());
    await assertNoOverflow(page, 'mac game detail');
    await capture(page, 'mac-game-detail.png');
    await page.evaluate(() => {
      const api = window.__DST_MODS_DEMO__;
      api.dispatch({ type: 'OPEN_MODS' });
      api.dispatch({ type: 'OPEN_DETAIL', modId: 'dst-fast-travel', mod_id: 'dst-fast-travel' });
    });
    await capture(page, 'mac-mod-detail.png');
    await page.evaluate(() => window.__DST_MODS_DEMO__.dispatch({ type: 'PREFLIGHT_REQUESTED' }));
    await capture(page, 'mac-preflight.png');
    await context.close();
    console.log('PASS mac runtime');
  }

  {
    const { context, page } = await openDemo(files.app, { width: 1280, height: 960 });
    await runSharedStateVector(page, 'app');
    await runOrientationVector(page, 'app');
    await runAppInteractionOrientationContinuity(page);
    await page.evaluate(() => {
      const api = window.__DST_MODS_DEMO__;
      api.reset();
      api.dispatch({ type: 'OPEN_MODS' });
    });
    await assertNoOverflow(page, 'app portrait');
    await assertAppTapTargets(page, 'app portrait');
    await capture(page, 'app-portrait-list.png');
    await page.evaluate(() => {
      const api = window.__DST_MODS_DEMO__;
      api.dispatch({ type: 'OPEN_DETAIL', modId: 'dst-fast-travel', mod_id: 'dst-fast-travel' });
      api.dispatch({ type: 'INSTALL_REQUESTED', modId: 'dst-fast-travel', mod_id: 'dst-fast-travel' });
      const taskId = api.getState().mods['dst-fast-travel'].current_task_id;
      api.dispatch({
        type: 'TASK_ADVANCE',
        modId: 'dst-fast-travel',
        mod_id: 'dst-fast-travel',
        taskId,
        task_id: taskId
      });
    });
    await capture(page, 'app-portrait-task.png');
    await page.evaluate(() => window.__DST_MODS_DEMO__.dispatch({
      type: 'ORIENTATION_CHANGED',
      orientation: 'landscape'
    }));
    await assertNoOverflow(page, 'app landscape');
    await assertAppTapTargets(page, 'app landscape');
    await capture(page, 'app-landscape-detail.png');
    await page.evaluate(() => window.__DST_MODS_DEMO__.dispatch({ type: 'SYSTEM_PAUSED' }));
    await capture(page, 'app-landscape-paused.png');
    await context.close();
    console.log('PASS app runtime');
  }

  {
    const { context, page } = await openDemo(files.scene, { width: 1280, height: 960 });
    await runSharedStateVector(page, 'scene');
    await runOrientationVector(page, 'scene');
    await runSceneScrollContinuity(page);
    await runSceneUpdateVector(page);
    await runSceneUpdateSuccessVector(page);
    await runSceneAutoResumeFailureVector(page);
    await page.evaluate(() => {
      const api = window.__DST_MODS_DEMO__;
      api.dispatch({ type: 'ORIENTATION_CHANGED', orientation: 'portrait' });
      api.dispatch({ type: 'SCENE_CHANGED', scene: 'preflight', screen: 'preflight' });
    });
    await assertNoOverflow(page, 'scene preflight');
    await assertAppTapTargets(page, 'scene preflight');
    await capture(page, 'scene-preflight.png');
    await page.evaluate(() => {
      const api = window.__DST_MODS_DEMO__;
      api.dispatch({ type: 'EVIDENCE_SCENARIO_SELECTED', result: 'loaded_match' });
      api.dispatch({ type: 'SCENE_CHANGED', scene: 'load-evidence', screen: 'load-evidence' });
    });
    await capture(page, 'scene-loaded-match.png');
    await page.evaluate(() => {
      const api = window.__DST_MODS_DEMO__;
      api.dispatch({ type: 'ABNORMAL_EXIT_INJECTED', manifestChanged: true });
      api.dispatch({ type: 'SCENE_CHANGED', scene: 'recovery', screen: 'recovery' });
    });
    await capture(page, 'scene-recovery.png');
    await context.close();
    console.log('PASS scene runtime');
  }

  const screenshots = [
    'mac-game-detail.png',
    'mac-mod-detail.png',
    'mac-preflight.png',
    'app-portrait-list.png',
    'app-portrait-task.png',
    'app-landscape-detail.png',
    'app-landscape-paused.png',
    'scene-preflight.png',
    'scene-loaded-match.png',
    'scene-recovery.png'
  ];
  assert(screenshots.every(name => fs.statSync(path.join(evidenceDir, name)).size > 0));
  console.log(`Captured ${screenshots.length} DST MODS demo screenshots`);
} finally {
  await browser.close();
}

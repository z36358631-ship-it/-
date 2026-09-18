import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const cDemo = path.join(root, 'demos', '游戏详情', 'GUANWANGGAID-25-兼容性评价改版-C端demo.html');
const bDemo = path.join(root, 'demos', '后台管理', 'GUANWANGGAID-25-兼容性评价改版-B端demo.html');
const executablePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean).find(fs.existsSync);

let browser;

before(async () => {
  assert.ok(executablePath, '浏览器依赖未安装：未找到本地 Chrome 或 Edge');
  browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--allow-file-access-from-files', '--disable-background-networking'],
  });
});

after(async () => {
  await browser?.close();
});

async function openDemo(file, label, viewport = { width: 390, height: 844 }) {
  assert.ok(fs.existsSync(file), `未实现契约：${label} Demo 文件不存在\n${file}`);
  const page = await browser.newPage({ viewport, acceptDownloads: true });
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith('file:') && !request.url().startsWith('data:')) requests.push(request.url());
  });
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(420);
  return { page, errors, requests };
}

async function requireOne(page, selector, contract) {
  assert.equal(await page.locator(selector).count(), 1, `未实现契约：${contract} (${selector})`);
}

function assertNoPageErrors(errors, contract) {
  assert.deepEqual(errors, [], `${contract} 产生了 pageerror`);
}

function assertNoRemoteRequests(requests, contract) {
  assert.deepEqual(requests, [], `${contract} 不应产生远程请求`);
}

async function openManualReview(page, stars = 5) {
  await page.click('#openCompatibilityReviews');
  await page.click('#manualReviewButton');
  await page.click(`#fbStarsWrap [data-val="${stars}"]`);
}

async function submitSharedReview(page, { stars = 5, text = '本次游玩流畅，配置可供参考。' } = {}) {
  await openManualReview(page, stars);
  await page.fill('#fbEditor', text);
  if (stars >= 3) {
    await requireOne(page, '#shareSessionCheckbox', '分享本次启动配置');
    await page.check('#shareSessionCheckbox');
  }
  await page.click('#modalFeedback .btn-submit');
  return page.evaluate(() => {
    const review = window.getFeedbacks().find((item) => item.uid === 'me_demo_user');
    const snapshots = window.compatibilityDemo.getReviewSnapshots();
    return { review, snapshot: review?.reviewSnapshotId ? snapshots[review.reviewSnapshotId] : null };
  });
}

async function loadEveryReview(page) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (!(await page.locator('#loadMoreLs').isVisible())) return;
    await page.click('#loadMoreLs');
  }
  if (await page.locator('#loadMoreLs').isVisible()) {
    assert.fail('加载全部评价超过 10 次，疑似分页未收敛');
  }
}

async function showEveryReview(page) {
  await page.click('#openCompatibilityReviews');
  await page.click('#chipsLs [data-view="all"]');
  await loadEveryReview(page);
}

test('C 端保留真实产品入口、线框媒体与精简评价弹窗', async () => {
  const { page, errors, requests } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
  try {
    for (const [selector, contract] of [
      ['#openCompatibilityReviews', '游戏详情兼容性评价入口'],
      ['#startGameButton', 'PC 游戏启动按钮'],
      ['#runtimeDeviceFrame', '居中横屏手机壳'],
      ['#modalFeedback', '共用兼容性评价弹窗'],
      ['#solutionDetailPage', '完整启动方案详情'],
      ['#feedbackNoteLabel', '补充说明字段标题'],
      ['#feedbackImageLimit', '图片上传上限说明'],
    ]) await requireOne(page, selector, contract);
    assert.equal(await page.locator('#feedbackNoteLabel').innerText(), '补充说明（选填）');
    assert.equal(await page.locator('#feedbackImageLimit').innerText(), '最多上传9张图片');
    assert.equal(await page.getByText('秒玩', { exact: true }).count(), 0);
    assert.equal(await page.locator('#cloudSharePage, .demo-scenario-rail, .orient-bar, .prd-badge, .prd-tooltip').count(), 0);
    assert.equal(await page.locator('img[src^="http"], img[src^="data:image"], iframe, canvas').count(), 0);
    for (const selector of ['#gameHeroWireframe', '#gameGalleryWireframe', '#gameplayWireframe']) {
      assert.ok(await page.locator(selector).count() > 0, `缺少线框占位：${selector}`);
    }
    const duplicateIds = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
      return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    });
    assert.deepEqual(duplicateIds, []);
    assertNoPageErrors(errors, 'C 端静态契约');
    assertNoRemoteRequests(requests, 'C 端静态契约');
  } finally {
    await page.close();
  }
});

test('B 端使用关联快照筛选、预览和导出字段', async () => {
  const { page, errors, requests } = await openDemo(bDemo, 'B 端', { width: 1440, height: 900 });
  try {
    for (const selector of ['#dom-fb-solution-linked', '#dom-fb-solution-status', '#compat-solution-detail-drawer', '#compat-export-preview']) {
      await requireOne(page, selector, 'B 端关联快照能力');
    }
    const pageText = await page.locator('#page-compat-domestic').innerText();
    assert.match(pageText, /快照关联/);
    assert.match(pageText, /快照状态/);
    assert.match(pageText, /关联快照/);
    assert.doesNotMatch(pageText, /方案关联|方案状态|关联方案/);
    const fields = await page.locator('.compat-export-field-list').innerText();
    for (const field of ['review_snapshot_id', 'snapshot_status', 'duration_seconds', 'snapshot_shared_at']) {
      assert.match(fields, new RegExp(field));
    }
    assert.doesNotMatch(fields, /solution_id|solution_status|solution_source/);
    assertNoPageErrors(errors, 'B 端静态契约');
    assertNoRemoteRequests(requests, 'B 端静态契约');
  } finally {
    await page.close();
  }
});

test('查看并应用他人快照后，可启动、横屏退出并分享本次独立快照', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.click('#openCompatibilityReviews');
    const card = page.locator('[data-review-state="valid"] .review-solution-card').first();
    assert.match(await card.innerText(), /本次启动配置/);
    assert.doesNotMatch(await card.innerText(), /本次启动方案/);
    assert.match(await card.innerText(), /本次游玩 18分42秒/);
    assert.doesNotMatch(await card.innerText(), /成功率|次验证|最近验证|样本较少|社区共同验证/);
    await card.click();
    assert.equal(await page.locator('#solutionDetailPage').getAttribute('aria-label'), '本次启动配置详情');
    assert.equal(await page.locator('#solutionDetailSchemeName').innerText(), '本次启动配置');
    const detailText = await page.locator('#solutionDetailPage').innerText();
    assert.match(detailText, /Pixel用户_洛圣都 · 本次游玩 18分42秒/);
    assert.doesNotMatch(detailText, /成功率|次验证|最近验证|样本较少|社区共同验证/);
    assert.ok(await page.locator('#solutionConfigGroups .solution-config-section').count() >= 3);
    await page.click('#applySolutionButton');
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), false);
    assert.match(await page.locator('#currentAppliedSolution').innerText(), /本次启动配置/);
    assert.equal(await page.locator('#gameplayLayer').isVisible(), false, '应用后不得自动启动');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.click('#startGameButton');
    await page.waitForFunction(() => document.body.dataset.journeyStage === 'gameplay');
    const runtimeBox = await page.locator('#runtimeDeviceFrame').boundingBox();
    assert.ok(runtimeBox);
    assert.ok(runtimeBox.width <= 920 && runtimeBox.height <= 460);
    assert.ok(Math.abs(runtimeBox.x + runtimeBox.width / 2 - 720) <= 2);
    assert.ok(Math.abs(runtimeBox.y + runtimeBox.height / 2 - 450) <= 2);
    await page.click('#exitGameButton');
    await page.click('#confirmExitGameButton');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.getElementById('modalFeedback')?.classList.contains('show'));
    assert.equal(await page.locator('#feedbackModalTitle').innerText(), '这次游戏体验怎么样？');
    await page.click('#fbStarsWrap [data-val="5"]');
    await page.check('#shareSessionCheckbox');
    await page.click('#modalFeedback .btn-submit');

    const result = await page.evaluate(() => {
      const review = window.getFeedbacks().find((item) => item.uid === 'me_demo_user');
      const snapshots = window.compatibilityDemo.getReviewSnapshots();
      return { review, snapshot: snapshots[review.reviewSnapshotId] };
    });
    assert.ok(result.review.reviewSnapshotId);
    assert.notEqual(result.review.reviewSnapshotId, 'review_snapshot_s1');
    assert.equal(result.snapshot.reviewId, result.review.id);
    assert.equal(result.snapshot.solutionName, '本次启动配置');
    assert.equal(result.snapshot.durationSeconds, 1122);
    assert.equal(result.snapshot.sourceType, 'review_snapshot');
    assert.equal(result.snapshot.configHash, 'cfg_adreno750_stable_v1');
    assert.match(await page.locator('[data-owner="me"] .review-solution-card').innerText(), /本次启动配置[\s\S]*本次游玩 18分42秒/);
    assertNoPageErrors(errors, 'C 端连续旅程');
  } finally {
    await page.close();
  }
});

test('旧快照仍显示本次启动配置且正式启动方案实体不改名', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await showEveryReview(page);
    await page.evaluate(() => {
      const key = 'gh_review_snapshots_v1';
      const snapshots = window.compatibilityDemo.getReviewSnapshots();
      snapshots.review_snapshot_s1.solutionName = '本次启动方案';
      localStorage.setItem(key, JSON.stringify(snapshots));
      window.refreshPanel('ls');
    });

    const card = page.locator('[data-feedback-id="s1"] .review-solution-card');
    assert.match(await card.innerText(), /本次启动配置/);
    assert.doesNotMatch(await card.innerText(), /本次启动方案/);
    assert.equal(await card.getAttribute('aria-label'), '打开本次启动配置');

    await card.click();
    assert.equal(await page.locator('#solutionDetailSchemeName').innerText(), '本次启动配置');
    assert.match(await page.locator('#copySolutionButton').innerText(), /复制/);
    assert.match(await page.locator('#applySolutionButton').innerText(), /应用/);

    await page.click('#copySolutionButton');
    await page.click('#confirmCopySolutionButton');
    await page.waitForFunction(() => document.getElementById('toast')?.classList.contains('show'));
    assert.match(await page.locator('#toast').innerText(), /正在前往“启动方案”/);
    assertNoPageErrors(errors, '单次配置文案兼容');
  } finally {
    await page.close();
  }
});

test('A 游戏曝光后全局 7 天冷却阻断 B 游戏且不增加 B 曝光', async () => {
  const { page } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
  try {
    const state = await page.evaluate(() => window.compatibilityDemo.simulateGlobalCooldown());
    assert.equal(state.config.globalDays, 7);
    assert.equal(state.byGameGpu['gta5|Adreno 750'].exposures, 1);
    assert.equal(state.byGameGpu['hades2|Adreno 750'].exposures, 0);
  } finally {
    await page.close();
  }
});

test('1–5 星与兼容类型双向联动，1–2 星不显示分享项', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.click('#openCompatibilityReviews');
    await page.click('#manualReviewButton');
    for (const [star, label, visible] of [
      [1, '不可玩', false],
      [2, '有部分问题', false],
      [3, '基本可玩', true],
      [4, '完美兼容', true],
      [5, '完美兼容', true],
    ]) {
      await page.click(`#fbStarsWrap [data-val="${star}"]`);
      assert.equal(await page.locator('#fbTypeWrap [aria-pressed="true"]').innerText(), label);
      assert.equal(await page.locator('#fbSolutionSection').isVisible(), visible);
    }
    await page.click('#fbTypeWrap [data-type="partial"]');
    assert.equal(await page.locator('#fbStarsWrap').getAttribute('data-value'), '2');
    assert.equal(await page.locator('#fbTypeWrap [data-type="partial"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), false);
    assertNoPageErrors(errors, '星级与类型联动');
  } finally {
    await page.close();
  }
});

test('初始化快照仓包含评价一对一的有效、废弃记录', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const result = await page.evaluate(() => window.compatibilityDemo.getReviewSnapshots());
    assert.equal(result.review_snapshot_s1.reviewId, 's1');
    assert.equal(result.review_snapshot_s1.status, 'available');
    assert.equal(result.review_snapshot_s1.durationSeconds, 1122);
    assert.equal(result.review_snapshot_s4.reviewId, 's4');
    assert.equal(result.review_snapshot_s4.status, 'deprecated');
    assert.ok(result.review_snapshot_s1.configGroups.length >= 3);
    assertNoPageErrors(errors, '种子快照仓');
  } finally {
    await page.close();
  }
});

test('每条评价创建独立快照，相同配置也不跨评价复用', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const result = await page.evaluate(() => {
      const source = window.compatibilityDemo.getSessionSnapshot();
      const first = window.compatibilityDemo.createReviewSnapshotForTest('review_snapshot_test_a', { ...source, playSessionId: 'snapshot_session_a' });
      const second = window.compatibilityDemo.createReviewSnapshotForTest('review_snapshot_test_b', { ...source, playSessionId: 'snapshot_session_b' });
      return { first, second, snapshots: window.compatibilityDemo.getReviewSnapshots() };
    });
    assert.notEqual(result.first.reviewSnapshotId, result.second.reviewSnapshotId);
    assert.equal(result.snapshots[result.first.reviewSnapshotId].reviewId, 'review_snapshot_test_a');
    assert.equal(result.snapshots[result.second.reviewSnapshotId].reviewId, 'review_snapshot_test_b');
    assert.equal(result.first.configHash, result.second.configHash);
    assertNoPageErrors(errors, '独立快照不去重');
  } finally {
    await page.close();
  }
});

test('评价快照一经创建不可覆盖，删除必须匹配评价归属', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const result = await page.evaluate(() => {
      const source = window.compatibilityDemo.getSessionSnapshot();
      const original = window.compatibilityDemo.createReviewSnapshotForTest('review_snapshot_immutable', {
        ...source, configHash: 'immutable_config_hash', playSessionId: 'immutable_session',
      });
      const overwrite = window.compatibilityDemo.createReviewSnapshotForTest('review_snapshot_immutable', {
        ...source, configHash: 'changed_config_hash', playSessionId: 'changed_session',
      });
      const beforeDelete = window.compatibilityDemo.getReviewSnapshots()[original.reviewSnapshotId];
      const rejectedDelete = window.compatibilityDemo.deleteReviewSnapshot(original.reviewSnapshotId, 'another_review');
      const deleted = window.compatibilityDemo.deleteReviewSnapshot(original.reviewSnapshotId, 'review_snapshot_immutable');
      const afterDelete = window.compatibilityDemo.getReviewSnapshots()[original.reviewSnapshotId] || null;
      return { original, overwrite, beforeDelete, rejectedDelete, deleted, afterDelete };
    });
    assert.equal(result.overwrite.reviewSnapshotId, result.original.reviewSnapshotId);
    assert.equal(result.beforeDelete.configHash, 'immutable_config_hash');
    assert.equal(result.beforeDelete.playSessionId, 'immutable_session');
    assert.equal(result.rejectedDelete, false);
    assert.equal(result.deleted, true);
    assert.equal(result.afterDelete, null);
    assertNoPageErrors(errors, '快照不可变与删除归属');
  } finally {
    await page.close();
  }
});

for (const invalidConfigGroups of [
  null,
  [],
  [{ label: '通用', items: [{ key: 'args', label: '启动参数', description: '', valueType: 'text', displayValue: '-dx11' }] }],
  [{ key: 'account', label: '账号', items: [{ key: 'token', label: '令牌', description: '', valueType: 'text', displayValue: 'secret' }] }],
  [{ key: 'general', label: '通用', items: [{ key: 'token', label: '令牌', description: '', valueType: 'text', displayValue: 'secret' }] }],
  [{ key: 'general', label: '通用', items: [{ key: 'exe_path', label: '启动文件路径（仅展示）', description: '', valueType: 'text', displayValue: 'C:\\Users\\demo\\game.exe' }] }],
  [{ key: 'general', label: '通用', items: [{ key: 'args', label: '启动参数', description: '', valueType: 'text', displayValue: 'x'.repeat(513) }] }],
]) {
  test(`快照白名单拒绝畸形配置且不阻断评价提交：${JSON.stringify(invalidConfigGroups)}`, async () => {
    const { page, errors } = await openDemo(cDemo, 'C 端');
    try {
      await page.evaluate((configGroups) => {
        window.compatibilityDemo.setSessionSnapshot({
          ...window.compatibilityDemo.getSessionSnapshot(),
          playSessionId: 'invalid_config_session',
          configHash: 'invalid_config_hash',
          configGroups,
        });
      }, invalidConfigGroups);
      const result = await submitSharedReview(page);
      assert.ok(result.review, '评价仍应提交');
      assert.equal(result.review.reviewSnapshotId || '', '');
      assert.equal(result.snapshot, null);
      assertNoPageErrors(errors, '快照白名单异常');
    } finally {
      await page.close();
    }
  });
}

test('快照配置总大小超限时不上传且不阻断评价提交', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.evaluate(() => {
      const source = window.compatibilityDemo.getSessionSnapshot();
      window.compatibilityDemo.setSessionSnapshot({
        ...source,
        playSessionId: 'oversize_config_session',
        configHash: 'oversize_config_hash',
        configGroups: source.configGroups.map(group => ({
          ...group,
          items: group.items.map(item => ({ ...item, displayValue: '配'.repeat(500) })),
        })),
      });
    });
    const result = await submitSharedReview(page);
    assert.ok(result.review);
    assert.equal(result.review.reviewSnapshotId || '', '');
    assert.equal(result.snapshot, null);
    assertNoPageErrors(errors, '快照总大小限制');
  } finally {
    await page.close();
  }
});

test('评价保存失败时不创建孤儿快照', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await openManualReview(page, 5);
    await page.check('#shareSessionCheckbox');
    const before = await page.evaluate(() => ({
      reviewCount: window.getFeedbacks().length,
      snapshotIds: Object.keys(window.compatibilityDemo.getReviewSnapshots()),
    }));
    await page.evaluate(() => {
      const nativeSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'gh_compat_feedbacks_gta5_v12') {
          Storage.prototype.setItem = nativeSetItem;
          throw new DOMException('模拟评价写入失败', 'QuotaExceededError');
        }
        return nativeSetItem.call(this, key, value);
      };
    });
    await page.click('#modalFeedback .btn-submit');
    const after = await page.evaluate(() => ({
      reviewCount: window.getFeedbacks().length,
      snapshotIds: Object.keys(window.compatibilityDemo.getReviewSnapshots()),
      toast: document.getElementById('toast').textContent,
    }));
    assert.equal(after.reviewCount, before.reviewCount);
    assert.deepEqual(after.snapshotIds, before.snapshotIds);
    assert.match(after.toast, /评价保存失败/);
    assertNoPageErrors(errors, '评价保存失败补偿');
  } finally {
    await page.close();
  }
});

test('编辑评价文字保留原快照，降为 2 星删除快照', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const submitted = await submitSharedReview(page);
    const snapshotId = submitted.review.reviewSnapshotId;
    const originalHash = submitted.snapshot.configHash;
    await page.evaluate((reviewId) => {
      window.compatibilityDemo.setSessionSnapshot({ configHash: '', playSessionId: '', configGroups: null });
      window.editMyReview(reviewId);
    }, submitted.review.id);
    assert.equal(await page.locator('#shareSessionCheckbox').isChecked(), true, '无当前成功会话时仍应保留历史分享状态');
    await page.fill('#fbEditor', '只修改评价文字，不改历史配置。');
    await page.click('#modalFeedback .btn-submit');
    const edited = await page.evaluate((reviewId) => {
      const review = window.getFeedbacks().find((item) => item.id === reviewId);
      return { review, snapshot: window.compatibilityDemo.getReviewSnapshots()[review.reviewSnapshotId] };
    }, submitted.review.id);
    assert.equal(edited.review.reviewSnapshotId, snapshotId);
    assert.equal(edited.snapshot.configHash, originalHash);

    await page.evaluate((reviewId) => window.editMyReview(reviewId), submitted.review.id);
    await page.click('#fbStarsWrap [data-val="2"]');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), false);
    await page.click('#modalFeedback .btn-submit');
    const downgraded = await page.evaluate((reviewId) => ({
      review: window.getFeedbacks().find((item) => item.id === reviewId),
      snapshot: window.compatibilityDemo.getReviewSnapshots()[`review_snapshot_${encodeURIComponent(reviewId)}`] || null,
    }), submitted.review.id);
    assert.equal(downgraded.review.reviewSnapshotId, '');
    assert.equal(downgraded.snapshot, null);
    assertNoPageErrors(errors, '评价编辑和降星生命周期');
  } finally {
    await page.close();
  }
});

test('客态 G-01～G-07 自然混排且仅有效同归属快照展示入口', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await showEveryReview(page);
    assert.equal(await page.locator('#ovCountLs').innerText(), '9 条玩家评价', '后台隐藏评价不得进入统计数量');
    assert.equal(await page.locator('#ovScoreLs').innerText(), '4.1', '后台隐藏评价不得进入评分统计');
    const expectations = new Map([
      ['s1', 1], // G-01：有效且归属匹配
      ['s3', 0], // G-02：未分享
      ['s4', 0], // G-03：deprecated
      ['s8', 0], // G-04：invalid
      ['s6', 0], // G-05：1～2 星仍残留快照引用
      ['s9', 0], // G-06：快照归属不匹配
    ]);

    for (const [reviewId, expectedCards] of expectations) {
      const review = page.locator(`[data-feedback-id="${reviewId}"]`);
      assert.equal(await review.count(), 1, `${reviewId} 应作为其他玩家评价出现`);
      assert.equal(
        await review.locator('button.review-solution-card').count(),
        expectedCards,
        `${reviewId} 的方案入口数量不符合客态规则`,
      );
    }

    assert.equal(await page.locator('[data-feedback-id="s10"]').count(), 0, '后台隐藏评价不得进入 C 端 DOM');
    assert.match(
      await page.locator('[data-feedback-id="s6"]').innerText(),
      /Huawei Mate 70 Pro · HarmonyOS 5[\s\S]*GPU：Adreno 750[\s\S]*有部分问题[\s\S]*容易闪退/,
      '2 星问题评价必须保留设备、兼容类型和问题描述',
    );

    const validCard = page.locator('[data-feedback-id="s1"] .review-solution-card');
    assert.equal(await validCard.evaluate((element) => element.tabIndex >= 0), true);
    assert.match(await validCard.innerText(), /本次启动配置[\s\S]*本次游玩 18分42秒/);
    await validCard.click();
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), true);
    assert.match(await page.locator('#solutionShareSummary').innerText(), /Pixel用户_洛圣都 · 本次游玩 18分42秒/);
    assertNoPageErrors(errors, '客态 G-01～G-07');
  } finally {
    await page.close();
  }
});

test('旧缓存升级后补齐客态种子且保留非种子评价与快照', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.evaluate(() => {
      const oldFeedbacks = window.getFeedbacks()
        .filter((review) => /^s[1-7]$/.test(review.id))
        .map((review) => review.id === 's6'
          ? { ...review, reviewSnapshotId: '', durationSeconds: undefined }
          : review);
      oldFeedbacks.splice(2, 0, {
        id: 'legacy-user-review-a', uid: 'legacy-user-a', name: '旧缓存用户A', avatar: '',
        device: 'Pixel 8 Pro · Android 14', gpu: 'Adreno 750', memoryGB: 12,
        appVersion: 'v6.0.2', stars: 5, tags: ['完美兼容'], text: '旧缓存评价A应被保留。',
        date: '2025-04-23', likes: 1, hidden: true, reviewState: 'valid',
        reviewSnapshotId: 'review_snapshot_legacy_user', durationSeconds: 600,
      });
      oldFeedbacks.splice(6, 0, {
        id: 'legacy-user-review-b', uid: 'legacy-user-b', name: '旧缓存用户B', avatar: '',
        device: 'Pixel 8 · Android 14', gpu: 'Adreno 750', memoryGB: 8,
        appVersion: 'v6.0.2', stars: 3, tags: ['基本可玩'], text: '旧缓存评价B应被保留。',
        date: '2025-04-17', likes: 0, hidden: true, reviewState: 'none', reviewSnapshotId: '',
      });

      const currentSnapshots = window.compatibilityDemo.getReviewSnapshots();
      const oldSnapshots = Object.fromEntries(
        ['review_snapshot_s1', 'review_snapshot_s2', 'review_snapshot_s4']
          .map((id) => [id, currentSnapshots[id]]),
      );
      oldSnapshots.review_snapshot_legacy_user = {
        ...currentSnapshots.review_snapshot_s1,
        reviewSnapshotId: 'review_snapshot_legacy_user',
        reviewId: 'legacy-user-review-a',
        reviewAuthorDisplayName: '旧缓存用户A',
      };

      localStorage.setItem('gh_compat_feedbacks_gta5_v12', JSON.stringify(oldFeedbacks));
      localStorage.setItem('gh_review_snapshots_v1', JSON.stringify(oldSnapshots));
      localStorage.removeItem('gh_compat_seed_revision_gta5_v12');
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(420);
    await showEveryReview(page);

    assert.equal(await page.locator('#ovCountLs').innerText(), '9 条玩家评价');
    assert.equal(await page.locator('#ovScoreLs').innerText(), '4.1');
    assert.equal(await page.locator('[data-feedback-id="s8"]').count(), 1);
    assert.equal(await page.locator('[data-feedback-id="s9"]').count(), 1);
    assert.equal(await page.locator('[data-feedback-id="s10"]').count(), 0);
    assert.equal(await page.locator('[data-feedback-id="s6"] .review-solution-card').count(), 0);

    const migrated = await page.evaluate(() => {
      const reviews = window.getFeedbacks();
      const snapshots = window.compatibilityDemo.getReviewSnapshots();
      return {
        legacyReviewA: reviews.find((review) => review.id === 'legacy-user-review-a') || null,
        legacyReviewB: reviews.find((review) => review.id === 'legacy-user-review-b') || null,
        legacyOrder: [
          reviews.findIndex((review) => review.id === 'legacy-user-review-a'),
          reviews.findIndex((review) => review.id === 'legacy-user-review-b'),
        ],
        legacySnapshot: snapshots.review_snapshot_legacy_user || null,
        migratedSeedSnapshotIds: ['review_snapshot_s6', 'review_snapshot_s8', 'review_snapshot_s9']
          .filter((reviewSnapshotId) => Boolean(snapshots[reviewSnapshotId])),
        revision: localStorage.getItem('gh_compat_seed_revision_gta5_v12'),
        feedbackCache: localStorage.getItem('gh_compat_feedbacks_gta5_v12'),
        snapshotCache: localStorage.getItem('gh_review_snapshots_v1'),
      };
    });
    assert.equal(migrated.legacyReviewA?.text, '旧缓存评价A应被保留。');
    assert.equal(migrated.legacyReviewB?.text, '旧缓存评价B应被保留。');
    assert.ok(migrated.legacyOrder[0] < migrated.legacyOrder[1], '非种子评价的相对顺序不得改变');
    assert.equal(migrated.legacySnapshot?.reviewId, 'legacy-user-review-a');
    assert.deepEqual(
      migrated.migratedSeedSnapshotIds,
      ['review_snapshot_s6', 'review_snapshot_s8', 'review_snapshot_s9'],
      '旧快照仓必须补齐本次客态种子快照',
    );
    assert.equal(migrated.revision, 'guest-states-v1');

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(420);
    const rerun = await page.evaluate(() => ({
      feedbackCache: localStorage.getItem('gh_compat_feedbacks_gta5_v12'),
      snapshotCache: localStorage.getItem('gh_review_snapshots_v1'),
    }));
    assert.equal(rerun.feedbackCache, migrated.feedbackCache, '评价迁移必须幂等');
    assert.equal(rerun.snapshotCache, migrated.snapshotCache, '快照迁移必须幂等');
    assertNoPageErrors(errors, '旧缓存种子迁移');
  } finally {
    await page.close();
  }
});

test('评价列表每次渲染都校验快照 reviewId 归属', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await showEveryReview(page);
    assert.equal(await page.locator('[data-feedback-id="s1"] .review-solution-card').count(), 1);
    await page.evaluate(() => {
      const storageKey = 'gh_review_snapshots_v1';
      const snapshots = window.compatibilityDemo.getReviewSnapshots();
      snapshots.review_snapshot_s1.reviewId = 'foreign-review';
      localStorage.setItem(storageKey, JSON.stringify(snapshots));
      window.refreshPanel('ls');
    });
    assert.equal(await page.locator('[data-feedback-id="s1"] .review-solution-card').count(), 0);
    assert.equal(await page.locator('[data-feedback-id="s1"] button[aria-label="打开本次启动配置"]').count(), 0);
    assertNoPageErrors(errors, '快照归属实时校验');
  } finally {
    await page.close();
  }
});

test('方案入口拒绝快照内部 ID 与评价引用不一致', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await showEveryReview(page);
    assert.equal(await page.locator('[data-feedback-id="s1"] .review-solution-card').count(), 1);
    await page.evaluate(() => {
      const storageKey = 'gh_review_snapshots_v1';
      const snapshots = window.compatibilityDemo.getReviewSnapshots();
      snapshots.review_snapshot_s1 = {
        ...snapshots.review_snapshot_s1,
        reviewId: 's1',
        reviewSnapshotId: 'review_snapshot_s2',
      };
      localStorage.setItem(storageKey, JSON.stringify(snapshots));
      window.refreshPanel('ls');
    });
    assert.equal(
      await page.locator('[data-feedback-id="s1"] .review-solution-card').count(),
      0,
      '快照内部 ID 与评价引用不一致时不得展示入口',
    );
    assertNoPageErrors(errors, '快照内部 ID 校验');
  } finally {
    await page.close();
  }
});

test('恶意快照 ID 不进入可执行字符串且点击安全', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await showEveryReview(page);
    await page.evaluate(() => {
      const feedbackKey = 'gh_compat_feedbacks_gta5_v12';
      const snapshotKey = 'gh_review_snapshots_v1';
      const maliciousSnapshotId = "review_snapshot_attack');document.body.dataset.solutionInjected='yes';void('";
      const reviews = window.getFeedbacks().map((review) => review.id === 's1'
        ? { ...review, reviewSnapshotId: maliciousSnapshotId }
        : review);
      const snapshots = window.compatibilityDemo.getReviewSnapshots();
      const source = snapshots.review_snapshot_s1;
      delete snapshots.review_snapshot_s1;
      snapshots[maliciousSnapshotId] = {
        ...source,
        reviewId: 's1',
        reviewSnapshotId: maliciousSnapshotId,
      };
      localStorage.setItem(feedbackKey, JSON.stringify(reviews));
      localStorage.setItem(snapshotKey, JSON.stringify(snapshots));
      window.refreshPanel('ls');
    });

    const card = page.locator('[data-feedback-id="s1"] .review-solution-card');
    assert.equal(await card.count(), 1, '一致的动态快照 ID 仍应展示入口');
    await card.click();
    assert.equal(await page.evaluate(() => document.body.dataset.solutionInjected || ''), '');
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), true, '恶意字符必须作为普通 ID 安全打开详情');
    assertNoPageErrors(errors, '恶意快照 ID 安全点击');
  } finally {
    await page.close();
  }
});

test('已渲染方案入口点击时重新校验当前快照', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await showEveryReview(page);
    const card = page.locator('[data-feedback-id="s1"] .review-solution-card');
    assert.equal(await card.count(), 1);
    assert.equal(await page.locator('#toast').innerText(), '');
    await page.evaluate(() => {
      const snapshotKey = 'gh_review_snapshots_v1';
      const snapshots = window.compatibilityDemo.getReviewSnapshots();
      snapshots.review_snapshot_s1 = {
        ...snapshots.review_snapshot_s1,
        reviewId: 'foreign-review',
        reviewAuthorDisplayName: '被篡改的作者',
      };
      localStorage.setItem(snapshotKey, JSON.stringify(snapshots));
    });

    await card.click();
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), false, '点击时校验失败不得打开方案详情');
    assert.equal(await page.locator('#applySolutionButton').isVisible(), false, '校验失败时应用操作必须不可达');
    assert.equal(await page.locator('[data-feedback-id="s1"] .review-solution-card').count(), 0, '失效入口应静默刷新移除');
    assert.equal(await page.locator('#toast').innerText(), '', '静默拒绝不得新增 Toast');
    assertNoPageErrors(errors, '点击时快照重校验');
  } finally {
    await page.close();
  }
});

test('客态进入全部与同配置但不会混入我的筛选', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.click('#openCompatibilityReviews');
    assert.ok(await page.locator('#listLs [data-owner="other"]').count() > 0, '同配置应包含其他玩家');
    assert.equal(await page.locator('[data-feedback-id="s5"]').count(), 0, 'Dimensity 9400 不属于当前同 GPU');

    await page.click('#chipsLs [data-view="all"]');
    await loadEveryReview(page);
    assert.equal(await page.locator('[data-feedback-id="s5"]').count(), 1, '全部应包含其他 GPU 评价');

    await page.click('#chipsLs [data-view="mine"]');
    assert.equal(await page.locator('#listLs [data-owner="other"]').count(), 0, '我的筛选不得混入客态');
    assertNoPageErrors(errors, '客态筛选纯净度');
  } finally {
    await page.close();
  }
});

test('有效快照可打开详情，不可用快照和无快照不展示入口', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.click('#openCompatibilityReviews');
    assert.ok(await page.locator('[data-review-state="valid"] .review-solution-card').count() >= 1);
    assert.equal(await page.locator('[data-review-state="unavailable"] .review-solution-card').count(), 0);
    assert.equal(await page.locator('[data-review-state="unlinked"] .review-solution-card').count(), 0);
    assert.equal(await page.locator('[data-review-state="none"] .review-solution-card').count(), 0);
    await page.evaluate(() => window.openSolutionDetail('review_snapshot_s4'));
    assert.match(await page.locator('#solutionDetailState').innerText(), /方案已不可用/);
    assert.equal(await page.locator('#applySolutionButton').isDisabled(), true);
    assert.equal(await page.locator('#copySolutionButton').isDisabled(), true);
    assertNoPageErrors(errors, '快照入口状态');
  } finally {
    await page.close();
  }
});

test('快照正文缺失、版本异常或 ID 不一致时禁用操作且不展示假参数', async () => {
  for (const mutation of [{ configGroups: null }, { schemaVersion: '999' }, { reviewSnapshotId: 'mismatched_snapshot_id' }]) {
    const { page, errors } = await openDemo(cDemo, 'C 端');
    try {
      await page.evaluate((mutation) => {
        const key = 'gh_review_snapshots_v1';
        const snapshots = window.compatibilityDemo.getReviewSnapshots();
        snapshots.review_snapshot_s1 = { ...snapshots.review_snapshot_s1, ...mutation };
        localStorage.setItem(key, JSON.stringify(snapshots));
        window.openSolutionDetail('review_snapshot_s1');
      }, mutation);
      assert.match(await page.locator('#solutionDetailState').innerText(), /方案配置异常|方案已不可用/);
      assert.equal(await page.locator('#solutionConfigGroups .solution-config-row').count(), 0);
      assert.equal(await page.locator('#applySolutionButton').isDisabled(), true);
      assert.equal(await page.locator('#copySolutionButton').isDisabled(), true);
      assertNoPageErrors(errors, '快照详情数据异常');
    } finally {
      await page.close();
    }
  }
});

test('服务端动作禁用原因在打开与刷新后保持可见', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.evaluate(() => {
      const key = 'gh_review_snapshots_v1';
      const snapshots = window.compatibilityDemo.getReviewSnapshots();
      snapshots.review_snapshot_s1.actions = {
        canApply: false, applyDisabledReason: '该快照已停止应用',
        canCopy: false, copyDisabledReason: '该快照已停止复制',
      };
      localStorage.setItem(key, JSON.stringify(snapshots));
      window.openSolutionDetail('review_snapshot_s1');
    });
    assert.equal(await page.locator('#applySolutionButton').isDisabled(), true);
    assert.equal(await page.locator('#copySolutionButton').isDisabled(), true);
    assert.match(await page.locator('#solutionApplyReason').innerText(), /停止应用/);
    assert.match(await page.locator('#solutionCopyReason').innerText(), /停止复制/);
    await page.click('#refreshSolutionDetail');
    assert.match(await page.locator('#solutionApplyReason').innerText(), /停止应用/);
    assert.match(await page.locator('#solutionCopyReason').innerText(), /停止复制/);
    assertNoPageErrors(errors, '快照动作状态');
  } finally {
    await page.close();
  }
});

test('hard 与 auxiliary 校验只影响当前应用动作，不写回快照', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.evaluate(() => {
      window.openSolutionDetail('review_snapshot_s1');
      window.compatibilityDemo.setApplicationMode('hard');
    });
    assert.equal(await page.locator('#applySolutionButton').isDisabled(), true);
    assert.match(await page.locator('#solutionApplyReason').innerText(), /GPU 或运行架构不兼容/);
    const persisted = await page.evaluate(() => window.compatibilityDemo.getReviewSnapshots().review_snapshot_s1.actions);
    assert.equal(persisted.canApply, true);

    await page.evaluate(() => window.compatibilityDemo.setApplicationMode('auxiliary'));
    await page.click('#applySolutionButton');
    assert.equal(await page.locator('#applySolutionButton').innerText(), '确认应用');
    assert.match(await page.locator('#solutionApplyReason').innerText(), /辅助信息差异/);
    await page.click('#applySolutionButton');
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), false);
    assert.equal(await page.locator('#gameplayLayer').isVisible(), false);
    assertNoPageErrors(errors, '当前设备校验');
  } finally {
    await page.close();
  }
});

test('复制确认后创建个人副本并用 Toast 占位跳转，不创建云分享方案', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.evaluate(() => window.openSolutionDetail('review_snapshot_s1'));
    await page.click('#copySolutionButton');
    assert.equal(await page.locator('#copySolutionDialog').isVisible(), true);
    assert.equal(await page.evaluate(() => window.compatibilityDemo.getCopiedSolutions().length), 0);
    await page.fill('#copySolutionName', '我的 GTA 启动副本');
    await page.click('#confirmCopySolutionButton');
    const copies = await page.evaluate(() => window.compatibilityDemo.getCopiedSolutions());
    assert.equal(copies.length, 1);
    assert.equal(copies[0].sourceReviewSnapshotId, 'review_snapshot_s1');
    assert.equal(copies[0].cloudShared, false);
    assert.match(await page.locator('#toast').innerText(), /复制成功，正在前往“启动方案”/);
    assertNoPageErrors(errors, '复制快照');
  } finally {
    await page.close();
  }
});

test('加载失败和 invalid 状态不能产生应用或复制副作用', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.evaluate(() => {
      window.compatibilityDemo.setSolutionDetailScenario('load-error');
      window.openSolutionDetail('review_snapshot_s1');
    });
    assert.match(await page.locator('#solutionDetailState').innerText(), /加载失败/);
    assert.equal(await page.locator('#applySolutionButton').isDisabled(), true);
    await page.evaluate(() => {
      window.compatibilityDemo.setSolutionDetailScenario('invalid');
      window.openSolutionDetail('review_snapshot_s1');
      window.applyCurrentSolution();
      window.copyCurrentSolution();
      window.confirmCopyCurrentSolution();
    });
    assert.equal(await page.evaluate(() => window.compatibilityDemo.getCopiedSolutions().length), 0);
    assert.equal(await page.locator('#gameplayLayer').isVisible(), false);
    assertNoPageErrors(errors, '异常态副作用');
  } finally {
    await page.close();
  }
});

test('详情可滚动到底且最后一项不被固定操作栏遮挡', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.evaluate(() => window.openSolutionDetail('review_snapshot_s1'));
    await page.locator('#solutionDetailBody').evaluate((element) => { element.scrollTop = element.scrollHeight; });
    const geometry = await page.evaluate(() => {
      const last = document.querySelector('#solutionConfigGroups .solution-config-row:last-child')?.getBoundingClientRect();
      const actions = document.getElementById('solutionDetailActions')?.getBoundingClientRect();
      const body = document.getElementById('solutionDetailBody');
      return {
        scrollTop: body?.scrollTop || 0,
        scrollHeight: body?.scrollHeight || 0,
        clientHeight: body?.clientHeight || 0,
        lastBottom: last?.bottom || 0,
        actionsTop: actions?.top || 0,
      };
    });
    assert.ok(geometry.scrollHeight > geometry.clientHeight);
    assert.ok(geometry.scrollTop > 0);
    assert.ok(geometry.lastBottom <= geometry.actionsTop - 8);
    assertNoPageErrors(errors, '详情滚动');
  } finally {
    await page.close();
  }
});

test('B 端可按快照状态筛选，评价隐藏后保留只读追溯', async () => {
  const { page, errors } = await openDemo(bDemo, 'B 端', { width: 1440, height: 900 });
  try {
    await page.selectOption('#dom-fb-solution-linked', 'linked');
    await page.selectOption('#dom-fb-solution-status', 'available');
    await page.click('#dom-query-feedbacks');
    const rows = page.locator('#dom-fb-tbody tr[data-feedback-id]');
    assert.ok(await rows.count() > 0);
    assert.equal(await rows.locator('[data-snapshot-status="available"]').count(), await rows.count());
    const first = rows.first();
    const feedbackId = await first.getAttribute('data-feedback-id');
    await first.locator('[data-action="view-snapshot"]').click();
    assert.match(await page.locator('#compat-solution-detail-title').innerText(), /关联快照/);
    assert.match(await page.locator('#compat-solution-detail-fields').innerText(), /本次启动配置/);
    assert.doesNotMatch(await page.locator('#compat-solution-detail-fields').innerText(), /本次启动方案/);
    const configGroups = page.locator('#compat-solution-config-groups');
    assert.equal(await configGroups.locator('.compat-snapshot-config-group').count(), 4);
    assert.ok(await configGroups.locator('.compat-snapshot-config-row').count() >= 15);
    assert.match(await configGroups.innerText(), /通用[\s\S]*启动参数[\s\S]*兼容性[\s\S]*DXVK 版本[\s\S]*组件依赖[\s\S]*Steam/);
    assert.equal(await configGroups.locator('input, select, textarea, button').count(), 0, '后台快照配置必须只读');
    await page.click('#compat-solution-detail-drawer .compat-admin-drawer-close');
    await first.locator('[data-action="hide-review"]').click();
    const affected = page.locator(`#dom-fb-tbody tr[data-feedback-id="${feedbackId}"]`).first();
    await affected.locator('[data-action="view-snapshot"]').click();
    assert.match(await page.locator('#compat-solution-detail-status').innerText(), /评价已隐藏.*C 端停止展示快照入口.*后台保留追溯/s);
    assert.equal(await affected.locator('[data-snapshot-status="available"]').count(), 1);
    await page.click('#compat-solution-detail-drawer .compat-admin-drawer-close');
    await page.selectOption('#dom-fb-solution-status', 'deprecated');
    await page.click('#dom-query-feedbacks');
    assert.ok(await page.locator('#dom-fb-tbody [data-snapshot-status="deprecated"]').count() > 0);
    assertNoPageErrors(errors, 'B 端快照筛选与追溯');
  } finally {
    await page.close();
  }
});

test('B 端删除评价时同步删除一对一快照', async () => {
  const { page, errors } = await openDemo(bDemo, 'B 端', { width: 1440, height: 900 });
  try {
    const row = page.locator('#dom-fb-tbody tr[data-feedback-id]').filter({ has: page.locator('[data-snapshot-status="available"]') }).first();
    const feedbackId = await row.getAttribute('data-feedback-id');
    assert.ok(feedbackId);
    let confirmCopy = '';
    page.once('dialog', async dialog => {
      confirmCopy = dialog.message();
      await dialog.accept();
    });
    await row.locator('[data-action="delete-review"]').click();
    await page.waitForFunction((id) => {
      const list = JSON.parse(localStorage.getItem('gh_compat_feedbacks_v2') || '[]');
      return list.some(item => item?.id === id && item.deleted === true && item.snapshot === null);
    }, feedbackId);
    assert.match(confirmCopy, /关联快照将同步删除，且无法恢复/);
    const deleted = await page.evaluate((id) => {
      const list = JSON.parse(localStorage.getItem('gh_compat_feedbacks_v2') || '[]');
      return list.find(item => item?.id === id) || null;
    }, feedbackId);
    assert.equal(deleted.deleted, true);
    assert.equal(deleted.snapshot, null);
    assertNoPageErrors(errors, 'B 端评价与快照同步删除');
  } finally {
    await page.close();
  }
});

test('B 端评价 CSV 增加快照字段且不包含旧方案字段', async () => {
  const { page, errors } = await openDemo(bDemo, 'B 端', { width: 1440, height: 900 });
  try {
    await page.evaluate(() => window.openCompatExportPreview('domestic', 'filtered'));
    assert.match(await page.locator('#compat-export-summary').innerText(), /将导出\s*\d+\s*条评价记录/);
    const downloadPromise = page.waitForEvent('download');
    await page.click('#compat-export-confirm');
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const csv = Buffer.concat(chunks).toString('utf8');
    for (const field of ['review_snapshot_id', 'snapshot_status', 'duration_seconds', 'snapshot_shared_at']) {
      assert.match(csv, new RegExp(field));
    }
    assert.doesNotMatch(csv, /solution_id|solution_name|solution_status|solution_source|solution_linked_at/);
    assertNoPageErrors(errors, 'B 端评价 CSV 导出');
  } finally {
    await page.close();
  }
});

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`C 端 ${viewport.width}x${viewport.height} 无水平溢出且无脚本错误`, async () => {
    const { page, errors } = await openDemo(cDemo, 'C 端', viewport);
    try {
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1, JSON.stringify(dimensions));
      assertNoPageErrors(errors, `${viewport.width}x${viewport.height} 响应式页面`);
    } finally {
      await page.close();
    }
  });
}

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

function assertDemoExists(file, label) {
  assert.ok(fs.existsSync(file), `未实现契约：${label} Demo 文件不存在\n${file}`);
}

async function openDemo(file, label, viewport = { width: 390, height: 844 }) {
  assertDemoExists(file, label);
  const page = await browser.newPage({ viewport, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(420);
  return { page, errors };
}

async function requireOne(page, selector, contract) {
  assert.equal(
    await page.locator(selector).count(),
    1,
    `未实现契约：${contract} (${selector})`,
  );
}

async function assertNoPageErrors(errors, contract) {
  assert.deepEqual(errors, [], `${contract}产生了 pageerror`);
}

test('C 端从真实产品入口推进且不包含演示标注控件', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
  try {
    const selectors = [
      ['#openCompatibilityReviews', '游戏详情兼容性评价入口'],
      ['#startGameButton', 'PC 游戏启动按钮'],
      ['#runtimeStage', '浏览器内运行环境层'],
      ['#runtimeDeviceFrame', '居中横屏手机壳'],
      ['#launchLayer', '手机内启动中状态'],
      ['#gameplayLayer', '手机内横屏游戏画面'],
      ['#exitGameButton', '横屏退出游戏入口'],
      ['#confirmExitGameButton', '退出游戏确认操作'],
      ['#modalFeedback', '共用兼容性评价弹窗'],
      ['#fbTypeWrap', '兼容类型单选组'],
      ['#fbSolutionSection', '3–5 星分享本次运行配置区'],
      ['#solutionDetailPage', '现有方案详情页模拟'],
    ];
    for (const [selector, contract] of selectors) await requireOne(page, selector, contract);
    assert.equal(await page.locator('#cloudSharePage').count(), 0,
      'C 端不得保留个人云分享发布确认页');
    assert.equal(await page.locator('.demo-scenario-rail, .orient-bar, [id^="demoScenario"]').count(), 0,
      'C 端主流程不应包含场景切换栏');
    assert.equal(await page.getByText('秒玩', { exact: true }).count(), 0,
      'PC 游戏详情不应出现云游戏“秒玩”入口');
    assert.equal(await page.locator('.prd-badge, .prd-tooltip').count(), 0,
      '产品 Demo 不应包含编号标记或交互说明浮层');
    assert.equal(await page.locator('.fb-eligibility-note, .fb-solution-helper').count(), 0,
      '评价弹窗不应把资格规则或流程解释直接展示给用户');
    for (const selector of ['#gameHeroWireframe', '#gameGalleryWireframe', '#gameplayWireframe']) {
      assert.ok(await page.locator(selector).count() > 0, `缺少线框占位：${selector}`);
    }
    await page.click('#openCompatibilityReviews');
    assert.ok(await page.locator('.review-avatar-wireframe').count() > 0,
      '评价列表打开后应使用头像线框占位');
    const duplicateIds = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
      return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    });
    assert.deepEqual(duplicateIds, [], 'C 端可见运行态不应生成重复 DOM ID');
    assert.equal(await page.locator('img[src^="data:image"], img[src^="http"]').count(), 0,
      '线框 Demo 不应展示内嵌或远程位图');
    await assertNoPageErrors(errors, 'C 端静态契约');
  } finally {
    await page.close();
  }
});

test('B 端暴露关联筛选、方案预览和导出字段预览', async () => {
  const { page, errors } = await openDemo(bDemo, 'B 端', { width: 1440, height: 900 });
  try {
    const selectors = [
      ['#dom-fb-solution-linked', '国内是否关联方案筛选'],
      ['#dom-fb-solution-status', '国内方案状态筛选'],
      ['#compat-solution-detail-drawer', '关联方案只读预览'],
      ['#compat-export-preview', '新增导出字段预览'],
    ];
    for (const [selector, contract] of selectors) await requireOne(page, selector, contract);
    const exportFields = await page.locator('#compat-export-preview').textContent();
    for (const field of ['solution_id', 'solution_name', 'solution_status']) {
      assert.match(exportFields ?? '', new RegExp(field), `未实现契约：导出预览缺少 ${field}`);
    }
    await assertNoPageErrors(errors, 'B 端静态契约');
  } finally {
    await page.close();
  }
});

test('查看并应用社区方案后在横屏手机内启动、退出并分享本次运行配置', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 390, height: 844 });
  try {
    await page.click('#openCompatibilityReviews');
    await page.click('[data-review-state="valid"] .review-solution-card');
    await page.click('#applySolutionButton');
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), false,
      '应用成功后应返回游戏详情');
    assert.match(await page.locator('#currentAppliedSolution').innerText(), /Adreno 750 稳定方案/);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.click('#startGameButton');
    await page.waitForFunction(() => document.body.dataset.journeyStage === 'gameplay');
    assert.equal(await page.locator('#gameplayLayer').isVisible(), true);
    const runtimeBox = await page.locator('#runtimeDeviceFrame').boundingBox();
    assert.ok(runtimeBox, '横屏手机壳应可见');
    assert.ok(runtimeBox.width <= 920 && runtimeBox.height <= 460,
      '横屏手机壳不得铺满桌面浏览器');
    assert.ok(Math.abs((runtimeBox.x + runtimeBox.width / 2) - 720) <= 2,
      '横屏手机壳应在浏览器中水平居中');
    assert.ok(Math.abs((runtimeBox.y + runtimeBox.height / 2) - 450) <= 2,
      '横屏手机壳应在浏览器中垂直居中');
    await page.click('#exitGameButton');
    await page.click('#confirmExitGameButton');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.getElementById('modalFeedback')?.classList.contains('show'));
    assert.equal(await page.locator('#modalFeedback').getAttribute('data-entry-source'), 'proactive');
    assert.equal(await page.locator('#feedbackModalTitle').innerText(), '这次游戏体验怎么样？');
    await page.click('#fbStarsWrap [data-val="5"]');
    assert.match(await page.locator('#fbSolutionContent').innerText(), /分享我的启动方案和本次运行时长/);
    await page.check('#shareSessionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    const mine = await page.evaluate(() => window.getFeedbacks().find((item) => item.uid === 'me_demo_user'));
    assert.equal(mine.solutionId, 'community_cfg_adreno750_stable_v1');
    const linkedProfile = await page.evaluate((solutionId) => window.compatibilityDemo.getCommunityProfiles()
      .find((item) => item.id === solutionId), mine.solutionId);
    assert.equal(linkedProfile.source, '社区共同验证');
    assert.equal(await page.locator('#cloudSharePage').count(), 0,
      '分享运行配置不应创建个人云分享流程');
    assert.equal(await page.locator('#compatPage').isVisible(), true,
      '提交后应进入评价列表');
    assert.ok(await page.locator('[data-owner="me"]').count() > 0,
      '提交后应定位并展示我的评价');
    await assertNoPageErrors(errors, '连续兼容性评价旅程');
  } finally {
    await page.close();
  }
});

test('A 游戏曝光后全局 7 天冷却阻断 B 游戏且不增加 B 曝光', async () => {
  const { page } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
  try {
    const state = await page.evaluate(() => window.compatibilityDemo.simulateGlobalCooldown());
    assert.equal(state.config.globalDays, 7, '服务端默认全局邀评间隔应为 7 天');
    assert.equal(state.byGameGpu['gta5|Adreno 750'].exposures, 1, 'A 应记录一次真实弹窗曝光');
    assert.equal(state.byGameGpu['hades2|Adreno 750'].exposures, 0, 'B 被全局冷却阻断时不得记录曝光');
  } finally {
    await page.close();
  }
});

test('星级与兼容类型双向联动，1–2 星隐藏方案，3–5 星展示方案', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
  try {
    await page.click('#openCompatibilityReviews');
    await page.click('#manualReviewButton');
    assert.equal(await page.locator('#modalFeedback').evaluate((element) => element.classList.contains('show')), true,
      '未实现契约：手动入口未打开共用评价弹窗');
    await page.click('#fbStarsWrap [data-val="5"]');
    assert.equal(await page.locator('#fbStarsWrap').getAttribute('data-value'), '5');
    assert.equal(await page.locator('#fbTypeWrap [data-type="perfect"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), true);

    const shareOrder = await page.evaluate(() => {
      const body = document.querySelector('#modalFeedback .modal-body');
      const remarkRow = document.getElementById('fbEditor')?.closest('.fb-row');
      const media = document.getElementById('fbMediaList');
      const share = document.getElementById('fbSolutionSection');
      const footer = document.querySelector('#modalFeedback .modal-footer');
      return {
        shareIsLastBodyField: body?.lastElementChild === share,
        followsRemark: Boolean(remarkRow?.compareDocumentPosition(share) & Node.DOCUMENT_POSITION_FOLLOWING),
        followsMedia: Boolean(media?.compareDocumentPosition(share) & Node.DOCUMENT_POSITION_FOLLOWING),
        precedesFooter: Boolean(share?.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING),
      };
    });
    assert.deepEqual(shareOrder, {
      shareIsLastBodyField: true,
      followsRemark: true,
      followsMedia: true,
      precedesFooter: true,
    }, '分享项必须位于补充说明和图片之后、固定提交栏之前');
    assert.equal(await page.locator('#shareSessionCheckbox').isChecked(), false,
      '分享项默认不得勾选');

    await page.click('#fbTypeWrap [data-type="partial"]');
    assert.equal(await page.locator('#fbStarsWrap').getAttribute('data-value'), '2');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), false);

    await page.click('#fbStarsWrap [data-val="3"]');
    assert.equal(await page.locator('#fbTypeWrap [data-type="basic"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), true);

    await page.click('#fbStarsWrap [data-val="4"]');
    assert.equal(await page.locator('#fbTypeWrap [data-type="perfect"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), true);

    await page.click('#fbStarsWrap [data-val="1"]');
    assert.equal(await page.locator('#fbTypeWrap [data-type="unplayable"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), false);

    await page.click('#fbStarsWrap [data-val="2"]');
    assert.equal(await page.locator('#fbTypeWrap [data-type="partial"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), false);

    const seedRatingTags = await page.evaluate(() => window.getFeedbacks()
      .filter((review) => ['s1', 's2', 's3', 's4', 's5', 's6', 's7'].includes(review.id))
      .map((review) => [review.stars, review.tags?.[0]]));
    assert.deepEqual(seedRatingTags, [
      [5, '完美兼容'],
      [4, '完美兼容'],
      [5, '完美兼容'],
      [3, '基本可玩'],
      [4, '完美兼容'],
      [2, '有部分问题'],
      [5, '完美兼容'],
    ], '种子评价的星级与兼容类型标签必须使用同一映射口径');
    await assertNoPageErrors(errors, '评分与类型联动');
  } finally {
    await page.close();
  }
});

test('旧草稿与旧评价编辑时按星级迁移到最新兼容类型', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
  try {
    await page.evaluate(() => {
      localStorage.setItem('gh_compat_review_v12_draft', JSON.stringify({
        stars: 4,
        type: 'basic',
        text: '旧草稿',
        media: [],
        shareSessionRequested: false,
      }));
      window.openFeedbackModal({ source: 'manual' });
    });
    assert.equal(await page.locator('#fbStarsWrap').getAttribute('data-value'), '4');
    assert.equal(await page.locator('#fbTypeWrap [data-type="perfect"]').getAttribute('aria-pressed'), 'true',
      '旧 4 星草稿必须迁移为完美兼容');

    await page.evaluate(() => {
      window.closeFeedbackModal({ preserveDraft: false });
      const reviews = window.getFeedbacks();
      reviews.unshift({
        id: 'legacy-rating-3',
        uid: 'legacy-user',
        name: '旧评价用户',
        device: 'Pixel 9 Pro · Android 15',
        gpu: 'Adreno 750',
        memoryGB: 12,
        appVersion: 'v6.1.0',
        stars: 3,
        tags: ['有部分问题'],
        compatType: 'partial',
        text: '旧评价',
        media: [],
        likes: 0,
        date: '2026-09-18',
      });
      window.saveFeedbacks(reviews);
      window.editMyReview('legacy-rating-3');
    });
    assert.equal(await page.locator('#fbStarsWrap').getAttribute('data-value'), '3');
    assert.equal(await page.locator('#fbTypeWrap [data-type="basic"]').getAttribute('aria-pressed'), 'true',
      '旧 3 星评价必须迁移为基本可玩');

    await page.evaluate(() => window.submitFeedback());
    const migrated = await page.evaluate(() => {
      const review = window.getFeedbacks().find((item) => item.id === 'legacy-rating-3');
      return { compatType: review?.compatType, tags: review?.tags };
    });
    assert.deepEqual(migrated, { compatType: 'basic', tags: ['基本可玩'] },
      '迁移后的旧评价提交时必须写入最新类型和标签');
    await assertNoPageErrors(errors, '旧评分映射迁移');
  } finally {
    await page.close();
  }
});

test('公共方案按复合键去重、会话幂等并随评价生命周期撤销贡献', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
  try {
    await page.evaluate(() => window.compatibilityDemo.setSessionSnapshot({ playSessionId: '' }));
    await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
    await page.click('#fbStarsWrap [data-val="5"]');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), false,
      '无成功会话时不得展示分享区域');
    await page.evaluate(() => {
      window.closeFeedbackModal({ preserveDraft: false });
      localStorage.removeItem('gh_compat_review_v12_draft');
    });

    await page.evaluate(() => window.compatibilityDemo.setSessionSnapshot({
      configHash: 'cfg_test_dedup_v1',
      profileName: '本次启动方案',
      durationSeconds: 1122,
      playSessionId: 'test_session_1',
    }));
    await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
    assert.equal(await page.locator('#modalFeedback').evaluate((element) => element.classList.contains('show')), true,
      '未实现契约：成功会话未打开共用评价弹窗');
    await page.click('#fbStarsWrap [data-val="5"]');
    await requireOne(page, '#shareSessionCheckbox', '分享本次运行配置勾选项');
    assert.equal(await page.locator('#shareSessionCheckbox').isChecked(), false,
      '运行配置分享必须由用户主动勾选');
    assert.match(await page.locator('#fbSolutionContent').innerText(), /分享我的启动方案和本次运行时长/);
    assert.equal(await page.locator('#publishSolutionButton').count(), 0, '弹窗内不应出现独立发布按钮');
    assert.equal(await page.locator('#submitReviewOnlyButton').count(), 0, '弹窗内不应出现并列的仅提交按钮');
    await page.check('#shareSessionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    let matches = await page.evaluate(() => window.compatibilityDemo.getCommunityProfiles()
      .filter((item) => item.configHash === 'cfg_test_dedup_v1'));
    assert.equal(matches.length, 1);
    assert.equal(matches[0].validationCount, 1);
    assert.equal(matches[0].totalDurationSeconds, 1122);

    const firstReviewId = await page.evaluate(() => window.getFeedbacks()
      .find((item) => item.uid === 'me_demo_user')?.id);
    await page.evaluate((id) => window.editMyReview(id), firstReviewId);
    assert.equal(await page.locator('#shareSessionCheckbox').isChecked(), true,
      '编辑已分享评价时应保留勾选状态');
    await page.click('#modalFeedback .btn-submit');
    matches = await page.evaluate(() => window.compatibilityDemo.getCommunityProfiles()
      .filter((item) => item.configHash === 'cfg_test_dedup_v1'));
    assert.equal(matches[0].validationCount, 1, '编辑评价不得重复累计同一运行会话');
    assert.equal(matches[0].totalDurationSeconds, 1122, '编辑评价不得重复累计同一运行时长');

    await page.evaluate(() => window.compatibilityDemo.setSessionSnapshot({ playSessionId: 'test_session_2' }));
    await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
    await page.click('#fbStarsWrap [data-val="4"]');
    await requireOne(page, '#shareSessionCheckbox', '重复配置分享勾选项');
    assert.equal(await page.locator('#shareSessionCheckbox').isChecked(), false);
    await page.check('#shareSessionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    const secondReviewId = await page.evaluate((excludedId) => window.getFeedbacks()
      .find((item) => item.uid === 'me_demo_user' && item.id !== excludedId)?.id, firstReviewId);
    matches = await page.evaluate(() => window.compatibilityDemo.getCommunityProfiles()
      .filter((item) => item.configHash === 'cfg_test_dedup_v1'));
    assert.equal(matches.length, 1, '相同配置不得重复保存公共方案');
    assert.equal(matches[0].validationCount, 2);
    assert.equal(matches[0].totalDurationSeconds, 2244);

    assert.match(await page.locator(`[data-feedback-id="${firstReviewId}"] .review-solution-meta`).innerText(), /2 次验证/,
      '历史评价应实时展示公共方案池的最新聚合计数');
    await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
    await page.click('#fbStarsWrap [data-val="3"]');
    await page.check('#shareSessionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    const thirdReviewId = await page.evaluate(() => window.getFeedbacks()
      .find((item) => item.uid === 'me_demo_user')?.id);
    matches = await page.evaluate(() => window.compatibilityDemo.getCommunityProfiles()
      .filter((item) => item.configHash === 'cfg_test_dedup_v1'));
    assert.equal(matches[0].validationCount, 2, '同一运行会话重复分享不得重复计数');
    assert.equal(matches[0].totalDurationSeconds, 2244, '同一运行会话重复分享不得重复累计时长');

    await page.evaluate((id) => window.editMyReview(id), firstReviewId);
    await page.click('#fbStarsWrap [data-val="1"]');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), false);
    await page.click('#modalFeedback .btn-submit');
    matches = await page.evaluate(() => window.compatibilityDemo.getCommunityProfiles()
      .filter((item) => item.configHash === 'cfg_test_dedup_v1'));
    assert.equal(matches[0].validationCount, 1, '评价降为 1–2 星后应撤销对应验证贡献');
    assert.equal(matches[0].totalDurationSeconds, 1122);

    page.on('dialog', async (dialog) => dialog.accept());
    await page.evaluate((id) => window.deleteMyReview(id), secondReviewId);
    matches = await page.evaluate(() => window.compatibilityDemo.getCommunityProfiles()
      .filter((item) => item.configHash === 'cfg_test_dedup_v1'));
    assert.equal(matches[0].validationCount, 1, '同会话仍有评价关联时应保留唯一验证贡献');
    await page.evaluate((id) => window.deleteMyReview(id), thirdReviewId);
    matches = await page.evaluate(() => window.compatibilityDemo.getCommunityProfiles()
      .filter((item) => item.configHash === 'cfg_test_dedup_v1'));
    assert.equal(matches.length, 0, '最后一条有效关联删除后应移除无验证的公共方案');

    const collisionDimensions = [
      { gpuModel: 'Adreno 750', schemaVersion: '1', playSessionId: 'composite_session_gpu_adreno' },
      { gpuModel: 'Mali-G720', schemaVersion: '1', playSessionId: 'composite_session_gpu_mali' },
      { gpuModel: 'Adreno 750', schemaVersion: '2', playSessionId: 'composite_session_schema_v2' },
    ];
    for (const dimensions of collisionDimensions) {
      await page.evaluate((snapshot) => window.compatibilityDemo.setSessionSnapshot({
        gameId: 'gta5',
        platform: 'android',
        runtimeArchitecture: 'arm64',
        engineVersion: 'demo-engine-collision-v1',
        canonicalizerVersion: '1',
        configHash: 'cfg_composite_collision_v1',
        ...snapshot,
      }), dimensions);
      await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
      await page.click('#fbStarsWrap [data-val="5"]');
      await page.check('#shareSessionCheckbox');
      await page.click('#modalFeedback .btn-submit');
    }
    const collisions = await page.evaluate(() => window.compatibilityDemo.getCommunityProfiles()
      .filter((item) => item.configHash === 'cfg_composite_collision_v1'));
    assert.equal(collisions.length, 3, '不同 GPU 或 schema 不得因其他去重维度相同而串池');
    assert.ok(collisions.every((item) => item.gameId === 'gta5'
      && item.platform === 'android'
      && item.engineVersion === 'demo-engine-collision-v1'
      && item.configHash === 'cfg_composite_collision_v1'),
    '碰撞用例的 game/platform/engine/hash 必须保持相同');
    assert.equal(new Set(collisions.map((item) => item.gpuModel)).size, 2);
    assert.equal(new Set(collisions.map((item) => item.schemaVersion)).size, 2);
    assert.equal(new Set(collisions.map((item) => item.id)).size, 3,
      'solutionId 必须包含 GPU 与 schema 等全部去重维度');
    assert.equal(await page.locator('#cloudSharePage').count(), 0);
    await assertNoPageErrors(errors, '公共方案池精确去重');
  } finally {
    await page.close();
  }
});

for (const delimiterCollision of [
  {
    label: '|',
    configHash: 'cfg_delimiter_pipe_collision_v1',
    dimensions: [
      { gameId: 'game|android', platform: 'beta' },
      { gameId: 'game', platform: 'android|beta' },
    ],
  },
  {
    label: '__',
    configHash: 'cfg_delimiter_double_underscore_collision_v1',
    dimensions: [
      { gameId: 'game__android', platform: 'beta' },
      { gameId: 'game', platform: 'android__beta' },
    ],
  },
]) {
  test(`相邻去重字段含 ${delimiterCollision.label} 时不得造成 profile key 或 solutionId 碰撞`, async () => {
    const { page, errors } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
    try {
      for (const [index, dimensions] of delimiterCollision.dimensions.entries()) {
        await page.evaluate(({ values, hash, sequence }) => window.compatibilityDemo.setSessionSnapshot({
          ...values,
          gpuModel: 'Adreno 750',
          runtimeArchitecture: 'arm64',
          engineVersion: 'demo-engine-delimiter-v1',
          schemaVersion: '1',
          canonicalizerVersion: '1',
          configHash: hash,
          profileName: `分隔符防碰撞方案 ${sequence}`,
          durationSeconds: 1122,
          playSessionId: `delimiter_session_${hash}_${sequence}`,
        }), { values: dimensions, hash: delimiterCollision.configHash, sequence: index + 1 });
        await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
        await page.click('#fbStarsWrap [data-val="5"]');
        await page.check('#shareSessionCheckbox');
        await page.click('#modalFeedback .btn-submit');
      }
      const profiles = await page.evaluate((hash) => window.compatibilityDemo.getCommunityProfiles()
        .filter((item) => item.configHash === hash), delimiterCollision.configHash);
      assert.equal(profiles.length, 2,
        `含 ${delimiterCollision.label} 的不同八维组合必须生成两条独立方案记录`);
      assert.equal(new Set(profiles.map((item) => item.id)).size, 2,
        `含 ${delimiterCollision.label} 的不同八维组合必须生成不同 solutionId`);
      await assertNoPageErrors(errors, `${delimiterCollision.label} 分隔符防碰撞`);
    } finally {
      await page.close();
    }
  });
}

for (const invalidConfig of [
  { label: '缺少', value: null },
  { label: '清空', value: [] },
]) {
  test(`成功会话${invalidConfig.label} configGroups 时只提交评价且不关联公共方案`, async () => {
    const { page, errors } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
    try {
      const configHash = invalidConfig.label === '缺少'
        ? 'cfg_missing_groups_contract_v1'
        : 'cfg_empty_groups_contract_v1';
      const reviewText = `${invalidConfig.label} configGroups 仍可提交评价`;
      await page.evaluate(({ hash, groups }) => window.compatibilityDemo.setSessionSnapshot({
        gameId: 'gta5',
        platform: 'android',
        gpuModel: 'Adreno 750',
        runtimeArchitecture: 'arm64',
        engineVersion: 'demo-engine-invalid-config-v1',
        schemaVersion: '1',
        canonicalizerVersion: '1',
        configHash: hash,
        profileName: '配置正文异常方案',
        durationSeconds: 1122,
        playSessionId: `session_${hash}`,
        configGroups: groups,
      }), { hash: configHash, groups: invalidConfig.value });
      await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
      await page.click('#fbStarsWrap [data-val="5"]');
      await page.fill('#fbEditor', reviewText);
      await page.evaluate(() => window.toggleSessionShare(true));
      await page.click('#modalFeedback .btn-submit');

      const result = await page.evaluate(({ hash, text }) => ({
        profiles: window.compatibilityDemo.getCommunityProfiles()
          .filter((item) => item.configHash === hash),
        review: window.getFeedbacks().find((item) => item.uid === 'me_demo_user' && item.text === text),
      }), { hash: configHash, text: reviewText });
      assert.ok(result.review, '配置正文异常不得阻断评价本身提交');
      assert.equal(result.profiles.length, 0,
        '配置正文异常时不得用默认配置兜底创建公共方案');
      assert.equal(result.review.solutionId || '', '',
        '配置正文异常的评价不得关联公共方案');
      await assertNoPageErrors(errors, `${invalidConfig.label} configGroups 的评价降级提交`);
    } finally {
      await page.close();
    }
  });
}

for (const malformedConfig of [
  {
    label: '缺少 group/item key',
    configGroups: [{ items: [{}] }],
  },
  {
    label: '未知 group key',
    configGroups: [{
      key: 'unknown_group',
      label: '未知分组',
      items: [{ key: 'env', label: '环境变量', displayValue: '未配置' }],
    }],
  },
  {
    label: '未知 item key',
    configGroups: [{
      key: 'general',
      label: '通用',
      items: [{ key: 'unknown_item', label: '未知配置项', displayValue: '启用' }],
    }],
  },
]) {
  test(`成功会话携带${malformedConfig.label}时不得建池或关联方案`, async () => {
    const { page, errors } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
    try {
      const suffix = malformedConfig.label.replace(/\s+/g, '_');
      const configHash = `cfg_malformed_${suffix}_v1`;
      const reviewText = `${malformedConfig.label}应降级为仅提交评价`;
      await page.evaluate(({ hash, text, groups }) => window.compatibilityDemo.setSessionSnapshot({
        gameId: 'gta5',
        platform: 'android',
        gpuModel: 'Adreno 750',
        runtimeArchitecture: 'arm64',
        engineVersion: 'demo-engine-malformed-v1',
        schemaVersion: '1',
        canonicalizerVersion: '1',
        configHash: hash,
        profileName: text,
        durationSeconds: 1122,
        playSessionId: `session_${hash}`,
        configGroups: groups,
      }), { hash: configHash, text: malformedConfig.label, groups: malformedConfig.configGroups });
      await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
      await page.click('#fbStarsWrap [data-val="5"]');
      await page.fill('#fbEditor', reviewText);
      await page.evaluate(() => window.toggleSessionShare(true));
      await page.click('#modalFeedback .btn-submit');

      const result = await page.evaluate(({ hash, text }) => ({
        profiles: window.compatibilityDemo.getCommunityProfiles()
          .filter((item) => item.configHash === hash),
        review: window.getFeedbacks().find((item) => item.uid === 'me_demo_user' && item.text === text),
      }), { hash: configHash, text: reviewText });
      assert.ok(result.review, '畸形配置正文不得阻断评价提交');
      assert.equal(result.profiles.length, 0, '畸形或非白名单配置不得创建公共方案');
      assert.equal(result.review.solutionId || '', '', '畸形配置评价不得关联公共方案');
      await assertNoPageErrors(errors, `${malformedConfig.label}配置拦截`);
    } finally {
      await page.close();
    }
  });
}

test('应用非默认 GPU 与引擎方案后，下一次会话保留全部去重维度', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
  try {
    const expectedDimensions = {
      gameId: 'gta5',
      platform: 'android',
      gpuModel: 'Mali-G720 MC12',
      runtimeArchitecture: 'arm64',
      engineVersion: 'demo-engine-preserve-v9',
      schemaVersion: '1',
      canonicalizerVersion: '9',
      configHash: 'cfg_preserve_dimensions_v1',
    };
    await page.evaluate((dimensions) => window.compatibilityDemo.setSessionSnapshot({
      ...dimensions,
      profileName: 'Mali 完整维度方案',
      durationSeconds: 1122,
      playSessionId: 'session_preserve_dimensions_v1',
    }), expectedDimensions);
    await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
    await page.click('#fbStarsWrap [data-val="5"]');
    await page.check('#shareSessionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    const createdSolution = await page.evaluate((configHash) => window.compatibilityDemo.getCommunityProfiles()
      .find((item) => item.configHash === configHash), expectedDimensions.configHash);
    assert.ok(createdSolution?.id, '必须先创建可打开的非默认公共方案');

    await page.evaluate((solutionId) => window.openSolutionDetail(solutionId), createdSolution.id);
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), true);
    await page.click('#applySolutionButton');
    await page.click('#startGameButton');
    await page.waitForFunction(() => document.body.dataset.journeyStage === 'gameplay');
    assert.equal(await page.evaluate(() => typeof window.compatibilityDemo.getSessionSnapshot), 'function',
      '未实现契约：缺少可验证下一次会话配置的 getSessionSnapshot API');
    const nextSessionDimensions = await page.evaluate(() => {
      const snapshot = window.compatibilityDemo.getSessionSnapshot();
      return Object.fromEntries([
        'gameId',
        'platform',
        'gpuModel',
        'runtimeArchitecture',
        'engineVersion',
        'schemaVersion',
        'canonicalizerVersion',
        'configHash',
      ].map((key) => [key, snapshot[key]]));
    });
    assert.deepEqual(nextSessionDimensions, expectedDimensions,
      '应用公共方案后启动的会话不得回落到默认 GPU／引擎维度');
    await assertNoPageErrors(errors, '应用方案后的会话维度传递');
  } finally {
    await page.close();
  }
});

test('独立方案详情存储在初始化时包含种子方案正文', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const seedDetailCount = await page.evaluate(() => {
      window.compatibilityDemo.getCommunityProfiles();
      const raw = localStorage.getItem('gh_community_solution_details_v1');
      if (!raw) return 0;
      const details = JSON.parse(raw);
      const seedId = 'community_cfg_adreno750_stable_v1';
      if (Array.isArray(details)) {
        return details.filter((item) => item?.solutionId === seedId || item?.id === seedId).length;
      }
      if (!details || typeof details !== 'object') return 0;
      if (details[seedId]) return 1;
      return Object.values(details)
        .filter((item) => item?.solutionId === seedId || item?.id === seedId).length;
    });
    assert.ok(seedDetailCount >= 1,
      '本地详情存储 gh_community_solution_details_v1 必须至少包含种子方案正文');
    await assertNoPageErrors(errors, '种子方案详情存储初始化');
  } finally {
    await page.close();
  }
});

test('详情记录缺失时不得用列表元数据兜底拼装配置', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.evaluate(() => {
      window.compatibilityDemo.getCommunityProfiles();
      const storageKey = 'gh_community_solution_details_v1';
      const seedId = 'community_cfg_adreno750_stable_v1';
      let details;
      try {
        details = JSON.parse(localStorage.getItem(storageKey) || '{}');
      } catch (error) {
        details = {};
      }
      if (Array.isArray(details)) {
        details = details.filter((item) => item?.solutionId !== seedId && item?.id !== seedId);
      } else if (details && typeof details === 'object') {
        delete details[seedId];
        for (const [key, item] of Object.entries(details)) {
          if (item?.solutionId === seedId || item?.id === seedId) delete details[key];
        }
      } else {
        details = {};
      }
      localStorage.setItem(storageKey, JSON.stringify(details));
      window.openSolutionDetail(seedId);
    });
    assert.match(await page.locator('#solutionDetailState').innerText(), /配置异常.*无法使用/s,
      '详情记录缺失时必须显示配置异常');
    assert.equal(await page.locator('#applySolutionButton').isDisabled(), true);
    assert.equal(await page.locator('#copySolutionButton').isDisabled(), true);
    assert.equal(await page.locator('#solutionConfigGroups .solution-config-row').count(), 0,
      '详情记录缺失时不得从列表元数据生成配置项');
    await assertNoPageErrors(errors, '详情记录缺失的降级状态');
  } finally {
    await page.close();
  }
});

test('详情记录 solutionId 与请求 id 不一致时进入配置异常且不另存错误 id', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const outcome = await page.evaluate(() => {
      window.compatibilityDemo.getCommunityProfiles();
      const storageKey = 'gh_community_solution_details_v1';
      const requestedId = 'community_cfg_adreno750_stable_v1';
      const wrongId = 'community_wrong_detail_id';
      const details = JSON.parse(localStorage.getItem(storageKey) || '{}');
      details[requestedId] = { ...details[requestedId], solutionId: wrongId };
      localStorage.setItem(storageKey, JSON.stringify(details));
      window.openSolutionDetail(requestedId);
      const storedAfterOpen = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return {
        stateText: document.getElementById('solutionDetailState')?.innerText || '',
        applyDisabled: document.getElementById('applySolutionButton')?.disabled,
        copyDisabled: document.getElementById('copySolutionButton')?.disabled,
        wrongIdStored: Boolean(storedAfterOpen[wrongId]),
      };
    });
    assert.deepEqual(outcome, {
      stateText: '方案配置异常，暂时无法使用',
      applyDisabled: true,
      copyDisabled: true,
      wrongIdStored: false,
    }, '详情记录的 solutionId 不可与查询键脱节，也不得污染详情仓');
    await assertNoPageErrors(errors, '详情 solutionId 一致性校验');
  } finally {
    await page.close();
  }
});

test('详情八维或 configHash 与列表元数据不一致时进入配置异常', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const outcome = await page.evaluate(() => {
      window.compatibilityDemo.getCommunityProfiles();
      const storageKey = 'gh_community_solution_details_v1';
      const requestedId = 'community_cfg_adreno750_stable_v1';
      const details = JSON.parse(localStorage.getItem(storageKey) || '{}');
      details[requestedId] = {
        ...details[requestedId],
        gpuModel: 'Mali-G720 tampered',
        configHash: 'cfg_tampered_detail_hash',
      };
      localStorage.setItem(storageKey, JSON.stringify(details));
      window.openSolutionDetail(requestedId);
      return {
        stateText: document.getElementById('solutionDetailState')?.innerText || '',
        applyDisabled: document.getElementById('applySolutionButton')?.disabled,
        copyDisabled: document.getElementById('copySolutionButton')?.disabled,
      };
    });
    assert.deepEqual(outcome, {
      stateText: '方案配置异常，暂时无法使用',
      applyDisabled: true,
      copyDisabled: true,
    }, '详情正文必须与列表元数据的全部去重维度一致');
    await assertNoPageErrors(errors, '详情与列表元数据一致性校验');
  } finally {
    await page.close();
  }
});

test('列表元数据缺失时即使详情正文存在也必须视为方案不可用', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const outcome = await page.evaluate(() => {
      const requestedId = 'community_cfg_adreno750_stable_v1';
      const profiles = window.compatibilityDemo.getCommunityProfiles()
        .filter((item) => item.id !== requestedId);
      localStorage.setItem('gh_community_profiles_v1', JSON.stringify(profiles));
      const feedbacks = window.getFeedbacks().map((item) => {
        if (item.solution?.id !== requestedId && item.solutionId !== requestedId) return item;
        return { ...item, solution: null, solutionId: requestedId };
      });
      localStorage.setItem('gh_compat_feedbacks_gta5_v12', JSON.stringify(feedbacks));
      window.openSolutionDetail(requestedId);
      return {
        stateText: document.getElementById('solutionDetailState')?.innerText || '',
        applyDisabled: document.getElementById('applySolutionButton')?.disabled,
        copyDisabled: document.getElementById('copySolutionButton')?.disabled,
      };
    });
    assert.deepEqual(outcome, {
      stateText: '方案已不可用',
      applyDisabled: true,
      copyDisabled: true,
    }, '列表元数据是方案有效性前提，不得只凭孤立详情正文继续使用');
    await assertNoPageErrors(errors, '列表元数据缺失降级');
  } finally {
    await page.close();
  }
});

test('详情仓已禁用的应用与复制动作及原因不得在打开时被覆盖', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const applyReason = '方案依赖的兼容层已下架';
    const copyReason = '方案授权限制，不允许复制';
    const outcome = await page.evaluate(({ expectedApplyReason, expectedCopyReason }) => {
      window.compatibilityDemo.getCommunityProfiles();
      const storageKey = 'gh_community_solution_details_v1';
      const requestedId = 'community_cfg_adreno750_stable_v1';
      const details = JSON.parse(localStorage.getItem(storageKey) || '{}');
      details[requestedId] = {
        ...details[requestedId],
        actions: {
          canApply: false,
          applyDisabledReason: expectedApplyReason,
          canCopy: false,
          copyDisabledReason: expectedCopyReason,
        },
      };
      localStorage.setItem(storageKey, JSON.stringify(details));
      window.openSolutionDetail(requestedId);
      const persisted = JSON.parse(localStorage.getItem(storageKey) || '{}')[requestedId]?.actions;
      const applyButton = document.getElementById('applySolutionButton');
      const copyButton = document.getElementById('copySolutionButton');
      return {
        applyDisabled: applyButton?.disabled,
        copyDisabled: copyButton?.disabled,
        applyTitle: applyButton?.title || '',
        copyTitle: copyButton?.title || '',
        persisted,
      };
    }, { expectedApplyReason: applyReason, expectedCopyReason: copyReason });
    assert.deepEqual(outcome, {
      applyDisabled: true,
      copyDisabled: true,
      applyTitle: applyReason,
      copyTitle: copyReason,
      persisted: {
        canApply: false,
        applyDisabledReason: applyReason,
        canCopy: false,
        copyDisabledReason: copyReason,
      },
    }, '设备校验只能进一步收紧权限，不得重置详情仓的禁用状态和原因');
    await assertNoPageErrors(errors, '详情仓动作权限保留');
  } finally {
    await page.close();
  }
});

test('已打开详情在 reload 后必须保留服务端新增的禁用动作与原因', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const applyReason = '服务端检测到方案已不允许应用';
    const copyReason = '服务端检测到方案已不允许复制';
    const outcome = await page.evaluate(({ expectedApplyReason, expectedCopyReason }) => {
      const solutionId = 'community_cfg_adreno750_stable_v1';
      const storageKey = 'gh_community_solution_details_v1';
      window.compatibilityDemo.getCommunityProfiles();
      window.openSolutionDetail(solutionId);
      window.compatibilityDemo.setApplicationMode('hard');

      const details = JSON.parse(localStorage.getItem(storageKey) || '{}');
      details[solutionId] = {
        ...details[solutionId],
        actions: {
          canApply: false,
          applyDisabledReason: expectedApplyReason,
          canCopy: false,
          copyDisabledReason: expectedCopyReason,
        },
      };
      localStorage.setItem(storageKey, JSON.stringify(details));
      window.reloadSolutionDetail();
      window.compatibilityDemo.setApplicationMode('exact');

      const persisted = JSON.parse(localStorage.getItem(storageKey) || '{}')[solutionId]?.actions;
      const applyButton = document.getElementById('applySolutionButton');
      const copyButton = document.getElementById('copySolutionButton');
      return {
        applyDisabled: applyButton?.disabled,
        copyDisabled: copyButton?.disabled,
        applyTitle: applyButton?.title || '',
        copyTitle: copyButton?.title || '',
        persisted,
      };
    }, { expectedApplyReason: applyReason, expectedCopyReason: copyReason });
    assert.deepEqual(outcome, {
      applyDisabled: true,
      copyDisabled: true,
      applyTitle: applyReason,
      copyTitle: copyReason,
      persisted: {
        canApply: false,
        applyDisabledReason: applyReason,
        canCopy: false,
        copyDisabledReason: copyReason,
      },
    }, 'hard 到 exact 的本地模式切换不得覆盖 reload 读到的服务端禁用决策');
    await assertNoPageErrors(errors, '详情 reload 后服务端动作权限优先级');
  } finally {
    await page.close();
  }
});

test('hard 应用校验只影响当前页面且不得写回详情仓', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const solutionId = 'community_cfg_adreno750_stable_v1';
    const storageKey = 'gh_community_solution_details_v1';
    const hardPhase = await page.evaluate(({ id, key }) => {
      window.compatibilityDemo.getCommunityProfiles();
      window.openSolutionDetail(id);
      const serverActionsBeforeHard = JSON.parse(localStorage.getItem(key) || '{}')[id]?.actions;
      window.compatibilityDemo.setApplicationMode('hard');
      const persistedAfterHard = JSON.parse(localStorage.getItem(key) || '{}')[id]?.actions;
      return {
        serverActionsBeforeHard,
        persistedAfterHard,
        applyDisabled: document.getElementById('applySolutionButton')?.disabled,
        copyDisabled: document.getElementById('copySolutionButton')?.disabled,
      };
    }, { id: solutionId, key: storageKey });

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(420);
    const newPagePhase = await page.evaluate(({ id, key }) => {
      window.openSolutionDetail(id);
      return {
        persisted: JSON.parse(localStorage.getItem(key) || '{}')[id]?.actions,
        applyDisabled: document.getElementById('applySolutionButton')?.disabled,
        copyDisabled: document.getElementById('copySolutionButton')?.disabled,
        applyTitle: document.getElementById('applySolutionButton')?.title || '',
      };
    }, { id: solutionId, key: storageKey });

    const allowedActions = {
      canApply: true,
      applyDisabledReason: '',
      canCopy: true,
      copyDisabledReason: '',
    };
    assert.deepEqual({ hardPhase, newPagePhase }, {
      hardPhase: {
        serverActionsBeforeHard: allowedActions,
        persistedAfterHard: allowedActions,
        applyDisabled: true,
        copyDisabled: false,
      },
      newPagePhase: {
        persisted: allowedActions,
        applyDisabled: false,
        copyDisabled: false,
        applyTitle: '',
      },
    }, 'hard 是当前设备页面的有效动作，不是可持久化的服务端方案权限');
    await assertNoPageErrors(errors, 'hard 页面态与详情仓隔离');
  } finally {
    await page.close();
  }
});

test('同复合键新评价追加验证时不得覆盖详情仓已禁用的 actions', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
  try {
    const configHash = 'cfg_preserve_server_actions_on_upsert_v1';
    const applyReason = '服务端已停止该方案应用';
    const copyReason = '服务端已停止该方案复制';
    const baseSnapshot = {
      gameId: 'gta5',
      platform: 'android',
      gpuModel: 'Adreno 750',
      runtimeArchitecture: 'arm64',
      engineVersion: 'demo-engine-actions-v1',
      schemaVersion: '1',
      canonicalizerVersion: '1',
      configHash,
      profileName: 'actions 保留方案',
      durationSeconds: 1122,
    };
    await page.evaluate((snapshot) => window.compatibilityDemo.setSessionSnapshot({
      ...snapshot,
      playSessionId: 'session_actions_first',
    }), baseSnapshot);
    await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
    await page.click('#fbStarsWrap [data-val="5"]');
    await page.check('#shareSessionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    const solutionId = await page.evaluate((hash) => window.compatibilityDemo.getCommunityProfiles()
      .find((item) => item.configHash === hash)?.id, configHash);
    assert.ok(solutionId, '首次分享必须创建公共方案');

    await page.evaluate(({ id, expectedApplyReason, expectedCopyReason }) => {
      const storageKey = 'gh_community_solution_details_v1';
      const details = JSON.parse(localStorage.getItem(storageKey) || '{}');
      details[id] = {
        ...details[id],
        actions: {
          canApply: false,
          applyDisabledReason: expectedApplyReason,
          canCopy: false,
          copyDisabledReason: expectedCopyReason,
        },
      };
      localStorage.setItem(storageKey, JSON.stringify(details));
    }, { id: solutionId, expectedApplyReason: applyReason, expectedCopyReason: copyReason });

    await page.evaluate((snapshot) => window.compatibilityDemo.setSessionSnapshot({
      ...snapshot,
      playSessionId: 'session_actions_second',
    }), baseSnapshot);
    await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
    await page.click('#fbStarsWrap [data-val="5"]');
    await page.check('#shareSessionCheckbox');
    await page.click('#modalFeedback .btn-submit');

    const outcome = await page.evaluate((id) => ({
      validationCount: window.compatibilityDemo.getCommunityProfiles()
        .find((item) => item.id === id)?.validationCount,
      actions: JSON.parse(localStorage.getItem('gh_community_solution_details_v1') || '{}')[id]?.actions,
    }), solutionId);
    assert.deepEqual(outcome, {
      validationCount: 2,
      actions: {
        canApply: false,
        applyDisabledReason: applyReason,
        canCopy: false,
        copyDisabledReason: copyReason,
      },
    }, '追加验证只能更新聚合信息，服务端 actions 必须原样保留');
    await assertNoPageErrors(errors, '新评价追加验证时 actions 保留');
  } finally {
    await page.close();
  }
});

test('invalid 详情状态下直接调用应用、复制与确认函数不得产生副作用', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const outcome = await page.evaluate(() => {
      const solutionId = 'community_cfg_adreno750_stable_v1';
      window.compatibilityDemo.setSolutionDetailScenario('invalid');
      window.openSolutionDetail(solutionId);
      window.applyCurrentSolution();
      const appliedAfterDirectCall = !document.getElementById('currentAppliedSolution').hidden;

      window.compatibilityDemo.resetJourney();
      window.openSolutionDetail(solutionId);
      window.copyCurrentSolution();
      const dialog = document.getElementById('copySolutionDialog');
      const dialogOpenedAfterDirectCopy = !dialog.hidden || dialog.classList.contains('show');
      window.confirmCopyCurrentSolution();
      return {
        appliedAfterDirectCall,
        dialogOpenedAfterDirectCopy,
        copiedSolutions: window.compatibilityDemo.getCopiedSolutions().length,
      };
    });
    assert.deepEqual(outcome, {
      appliedAfterDirectCall: false,
      dialogOpenedAfterDirectCopy: false,
      copiedSolutions: 0,
    }, '详情非 ready 时即使直接调用全局函数也不得应用或复制');
    await assertNoPageErrors(errors, 'invalid 详情的动作防绕过');
  } finally {
    await page.close();
  }
});

test('复制确认弹窗未打开时直接调用 confirm 不得创建副本', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const outcome = await page.evaluate(() => {
      window.openSolutionDetail('community_cfg_adreno750_stable_v1');
      const dialog = document.getElementById('copySolutionDialog');
      const dialogWasClosed = dialog.hidden && !dialog.classList.contains('show');
      window.confirmCopyCurrentSolution();
      return {
        dialogWasClosed,
        copiedSolutions: window.compatibilityDemo.getCopiedSolutions().length,
      };
    });
    assert.deepEqual(outcome, {
      dialogWasClosed: true,
      copiedSolutions: 0,
    }, '确认函数必须要求实际处于已打开的复制确认流程');
    await assertNoPageErrors(errors, '未打开确认弹窗时防绕过');
  } finally {
    await page.close();
  }
});

test('390x844 长详情的 hard 原因与 auxiliary 确认提示必须紧邻固定操作栏且保持可见', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 390, height: 844 });
  try {
    const hardPhase = await page.evaluate(() => {
      const solutionId = 'community_cfg_adreno750_stable_v1';
      window.compatibilityDemo.setApplicationMode('hard');
      window.openSolutionDetail(solutionId);
      const message = document.getElementById('solutionApplyResult');
      const actions = document.getElementById('solutionDetailActions');
      const messageBox = message.getBoundingClientRect();
      const actionsBox = actions.getBoundingClientRect();
      const inViewport = messageBox.width > 0
        && messageBox.height > 0
        && messageBox.top >= 0
        && messageBox.bottom <= window.innerHeight;
      const adjacentToActions = actions.contains(message)
        || (messageBox.bottom <= actionsBox.top + 1 && actionsBox.top - messageBox.bottom <= 48);
      return {
        text: message.innerText,
        detailRows: document.querySelectorAll('#solutionConfigGroups .solution-config-row').length,
        actionsInViewport: actionsBox.top >= 0 && actionsBox.bottom <= window.innerHeight,
        messageInViewport: inViewport,
        adjacentToActions,
      };
    });
    assert.match(hardPhase.text, /当前设备.*不兼容.*无法应用|当前设备 GPU 或运行架构不兼容/s);
    assert.ok(hardPhase.detailRows >= 10, '必须在超过一屏的长详情中验证操作提示');

    await page.evaluate(() => window.compatibilityDemo.setApplicationMode('auxiliary'));
    await page.click('#applySolutionButton');
    const auxiliaryPhase = await page.evaluate(() => {
      const message = document.getElementById('solutionApplyResult');
      const actions = document.getElementById('solutionDetailActions');
      const messageBox = message.getBoundingClientRect();
      const actionsBox = actions.getBoundingClientRect();
      const inViewport = messageBox.width > 0
        && messageBox.height > 0
        && messageBox.top >= 0
        && messageBox.bottom <= window.innerHeight;
      const adjacentToActions = actions.contains(message)
        || (messageBox.bottom <= actionsBox.top + 1 && actionsBox.top - messageBox.bottom <= 48);
      return {
        text: message.innerText,
        messageInViewport: inViewport,
        adjacentToActions,
        confirmButtonText: document.getElementById('applySolutionButton').innerText,
      };
    });
    assert.match(auxiliaryPhase.text, /辅助信息差异.*再次确认应用/s,
      '首次点击 auxiliary 应用后必须保留确认提示');
    assert.equal(auxiliaryPhase.confirmButtonText, '确认应用');
    assert.deepEqual({
      hard: {
        actionsInViewport: hardPhase.actionsInViewport,
        messageInViewport: hardPhase.messageInViewport,
        adjacentToActions: hardPhase.adjacentToActions,
      },
      auxiliary: {
        messageInViewport: auxiliaryPhase.messageInViewport,
        adjacentToActions: auxiliaryPhase.adjacentToActions,
      },
    }, {
      hard: { actionsInViewport: true, messageInViewport: true, adjacentToActions: true },
      auxiliary: { messageInViewport: true, adjacentToActions: true },
    }, '动作原因和二次确认提示不得被长参数滚动区推出视口');
    await assertNoPageErrors(errors, '390x844 长详情操作提示可见性');
  } finally {
    await page.close();
  }
});

test('服务端同时禁用应用与复制时，两条原因必须对触屏用户可见并分别关联按钮', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 390, height: 844 });
  try {
    const applyReason = '该方案的兼容层已下架，暂时无法应用';
    const copyReason = '该方案存在授权限制，暂时无法复制';
    const outcome = await page.evaluate(({ expectedApplyReason, expectedCopyReason }) => {
      const solutionId = 'community_cfg_adreno750_stable_v1';
      const storageKey = 'gh_community_solution_details_v1';
      window.compatibilityDemo.getCommunityProfiles();
      const details = JSON.parse(localStorage.getItem(storageKey) || '{}');
      details[solutionId] = {
        ...details[solutionId],
        actions: {
          canApply: false,
          applyDisabledReason: expectedApplyReason,
          canCopy: false,
          copyDisabledReason: expectedCopyReason,
        },
      };
      localStorage.setItem(storageKey, JSON.stringify(details));
      window.openSolutionDetail(solutionId);

      const isRendered = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && box.width > 0
          && box.height > 0
          && box.top >= 0
          && box.bottom <= window.innerHeight;
      };
      const findVisibleReason = (reason) => [...document.querySelectorAll('#solutionDetailPage *')]
        .find((element) => {
          const text = element.innerText || '';
          const childContainsReason = [...element.children]
            .some((child) => (child.innerText || '').includes(reason));
          return text.includes(reason) && !childContainsReason && isRendered(element);
        });
      const hasAccessibleAssociation = (button, reason) => {
        const referencedIds = ['aria-describedby', 'aria-details', 'aria-errormessage']
          .flatMap((attribute) => (button.getAttribute(attribute) || '').split(/\s+/).filter(Boolean));
        const referenced = referencedIds.some((id) => {
          const element = document.getElementById(id);
          return Boolean(element && (element.innerText || '').includes(reason));
        });
        const accessibleName = button.getAttribute('aria-label') || button.innerText || '';
        return referenced || accessibleName.includes(reason);
      };

      const applyButton = document.getElementById('applySolutionButton');
      const copyButton = document.getElementById('copySolutionButton');
      return {
        applyDisabled: applyButton.disabled,
        copyDisabled: copyButton.disabled,
        applyReasonVisible: Boolean(findVisibleReason(expectedApplyReason)),
        copyReasonVisible: Boolean(findVisibleReason(expectedCopyReason)),
        applyReasonAssociated: hasAccessibleAssociation(applyButton, expectedApplyReason),
        copyReasonAssociated: hasAccessibleAssociation(copyButton, expectedCopyReason),
      };
    }, { expectedApplyReason: applyReason, expectedCopyReason: copyReason });
    assert.deepEqual(outcome, {
      applyDisabled: true,
      copyDisabled: true,
      applyReasonVisible: true,
      copyReasonVisible: true,
      applyReasonAssociated: true,
      copyReasonAssociated: true,
    }, '不支持 hover 的触屏设备不能只依赖 title 呈现动作禁用原因');
    await assertNoPageErrors(errors, '双禁用原因可见与可访问关联');
  } finally {
    await page.close();
  }
});

test('评价列表展示可用方案名称与可信度，不展示不可用或无方案入口', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    assert.equal(await page.evaluate(() => typeof window.openCompatPage), 'function',
      '未实现契约：兼容性评价列表入口 window.openCompatPage');
    await page.evaluate(() => window.openCompatPage());
    await page.waitForFunction(() => document.getElementById('compatPage')?.classList.contains('show'));
    assert.equal(await page.locator('#compatPage').isVisible(), true, '评价列表页应在进入后可见');
    await requireOne(page, '[data-review-state="valid"] .review-solution-card', '有效关联方案卡');
    assert.match(await page.locator('[data-review-state="valid"] .review-solution-meta').innerText(),
      /同配置.*成功率.*\d+\s*次验证.*最近验证/,
      '大样本方案应展示成功率、验证数和相对验证时间');
    const lowSample = await page.locator('[data-review-state="low-sample"] .review-solution-meta').innerText();
    assert.match(lowSample, /样本较少/);
    assert.doesNotMatch(lowSample, /成功率/, '少于 10 次验证时不得展示成功率');
    assert.match(await page.locator('[data-review-state="valid"] .review-solution-heading').innerText(), /Adreno 750 稳定方案/,
      '入口应直接展示方案名称，而不是功能化按钮文案');
    assert.equal(await page.getByText('查看运行方案', { exact: true }).count(), 0,
      '评价列表不应显示突兀的“查看运行方案”按钮');
    assert.equal(await page.locator('[data-review-state="unavailable"] .review-solution-card').count(), 0,
      '方案不可用时应隐藏整个方案入口，只保留评价');
    assert.equal(await page.locator('[data-review-state="none"] .review-solution-card').count(), 0,
      '1–2 星或无关联方案的评价不应显示方案卡');
    assert.doesNotMatch(await page.locator('[data-review-state="valid"] .review-solution-meta').innerText(), /\d{4}[-/]\d{1,2}[-/]\d{1,2}/,
      '方案可信度信息不得暴露评价人的精确启动日期');
    await assertNoPageErrors(errors, '评价列表可信度状态');
  } finally {
    await page.close();
  }
});

test('同游戏＋同 GPU 无结果时保留空状态，由用户显式查看全部', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
  try {
    await requireOne(page, '#sameConfigEmptyState', '同配置空状态');
    await requireOne(page, '#showAllReviewsButton', '查看全部评价的明确操作');
    await page.evaluate(() => window.compatibilityDemo.showSameConfigEmpty());
    assert.equal(await page.locator('#sameConfigEmptyState').isVisible(), true,
      '无同配置数据时不得自动切换到全部');
    assert.match(await page.locator('#sameConfigEmptyState').innerText(), /暂无同配置|(同配置|同\s*GPU).*(暂无|没有)/s);
    await page.click('#showAllReviewsButton');
    assert.equal(await page.locator('#sameConfigEmptyState').isVisible(), false);
    assert.ok(await page.locator('[data-review-state]').count() > 0, '用户点击后应显示全部评价');
    await assertNoPageErrors(errors, '同配置空状态兜底');
  } finally {
    await page.close();
  }
});

test('点击方案名称进入现有方案详情并复用应用与复制能力', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.evaluate(() => window.openCompatPage());
    await page.waitForFunction(() => document.getElementById('compatPage')?.classList.contains('show'));
    assert.equal(await page.locator('#compatPage').isVisible(), true, '方案详情必须从可见评价列表进入');
    await page.click('[data-review-state="valid"] .review-solution-card');
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), true);
    assert.equal(await page.locator('#solutionDetailPage .flow-title').innerText(), '方案详情');
    await requireOne(page, '#solutionDetailSchemeName', '方案名称');
    await requireOne(page, '#solutionDetailGpu', 'GPU 标签');
    await requireOne(page, '#solutionTrustSummary', '社区共同验证摘要');
    await requireOne(page, '#solutionConfigGroups', '完整白名单配置分组');
    assert.match(await page.locator('#solutionTrustSummary').innerText(), /社区共同验证.*成功率.*38 次验证.*最近验证/s);
    assert.equal(await page.getByText(/分享者[:：]/).count(), 0, '公共方案不得显示个人分享者');
    assert.ok(await page.locator('#solutionConfigGroups .solution-config-section').count() >= 3,
      '完整详情至少展示通用、兼容性和一个扩展分组');
    assert.ok(await page.locator('#solutionConfigGroups .solution-config-row').count() >= 10,
      '完整详情不得退化为 GPU／架构摘要');
    assert.equal(await page.getByText('同配置，可直接应用', { exact: true }).count(), 0,
      '不得保留旧简化详情结论');
    for (const text of ['环境变量', '启动参数', '启动文件路径（仅展示）', '兼容层', 'Dinput 函数库', 'DXVK 版本']) {
      assert.equal(await page.getByText(text, { exact: true }).count(), 1, `完整详情缺少参数：${text}`);
    }

    await page.locator('#solutionDetailBody').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const geometry = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#solutionConfigGroups .solution-config-row')];
      const lastRow = rows.at(-1)?.getBoundingClientRect();
      const footer = document.getElementById('solutionDetailActions')?.getBoundingClientRect();
      return { lastBottom: lastRow?.bottom ?? 0, footerTop: footer?.top ?? 0 };
    });
    assert.ok(geometry.lastBottom <= geometry.footerTop,
      `最后一个参数被固定操作栏遮挡：${JSON.stringify(geometry)}`);

    await page.click('#applySolutionButton');
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), false, '应用成功后返回详情，不自动启动');
    assert.match(await page.locator('#currentAppliedSolution').innerText(), /Adreno 750 稳定方案/);
    assert.equal(await page.locator('#gameplayLayer').isVisible(), false, '应用方案后不得自动启动游戏');
    await page.evaluate(() => window.openCompatPage());
    await page.click('[data-review-state="valid"] .review-solution-card');
    await page.click('#solutionDetailBack');
    await page.click('[data-review-state="low-sample"] .review-solution-card');
    assert.match(await page.locator('#solutionTrustSummary').innerText(), /社区共同验证.*样本较少/s);
    assert.doesNotMatch(await page.locator('#solutionTrustSummary').innerText(), /成功率/);

    await page.click('#copySolutionButton');
    assert.equal(await page.locator('#copySolutionDialog').isVisible(), true,
      '复制必须先进入现有命名确认流程');
    assert.equal(await page.evaluate(() => window.compatibilityDemo.getCopiedSolutions().length), 0,
      '确认前不得创建个人副本');
    await page.click('#confirmCopySolutionButton');
    assert.equal(await page.evaluate(() => window.compatibilityDemo.getCopiedSolutions().length), 1);
    assert.equal(await page.locator('#copySolutionDialog').isVisible(), false,
      '确认复制后必须关闭命名弹窗');
    assert.equal(await page.locator('#toast').innerText(), '复制成功，正在前往“启动方案”',
      'Demo 必须用 Toast 占位表达确认复制后跳转启动方案页');
    assert.equal(await page.locator('#toast').evaluate((element) => element.classList.contains('show')), true,
      '跳转占位 Toast 必须处于可见状态');
    assert.equal(await page.locator('#toast').evaluate((element) => getComputedStyle(element).whiteSpace), 'nowrap',
      '跳转占位 Toast 在手机宽度下不得断成多行');
    const toastGeometry = await page.evaluate(() => {
      const toast = document.getElementById('toast').getBoundingClientRect();
      const actions = document.getElementById('solutionDetailActions').getBoundingClientRect();
      return { toastBottom: toast.bottom, actionsTop: actions.top };
    });
    assert.ok(toastGeometry.toastBottom <= toastGeometry.actionsTop - 8,
      `跳转占位 Toast 应与底部操作栏保持至少 8px 间距：${JSON.stringify(toastGeometry)}`);

    await page.evaluate(() => window.compatibilityDemo.setSolutionDetailScenario('load-error'));
    await page.evaluate(() => window.openSolutionDetail('community_cfg_adreno750_stable_v1'));
    assert.match(await page.locator('#solutionDetailState').innerText(), /加载失败.*重新加载/s);
    assert.equal(await page.locator('#applySolutionButton').isDisabled(), true);
    assert.equal(await page.locator('#copySolutionButton').isDisabled(), true);
    await assertNoPageErrors(errors, '方案详情与应用');
  } finally {
    await page.close();
  }
});

test('B 端可筛选和预览关联方案，评价隐藏与方案生命周期互不联动', async () => {
  const { page, errors } = await openDemo(bDemo, 'B 端', { width: 1440, height: 900 });
  try {
    await page.selectOption('#dom-fb-solution-linked', 'linked');
    await page.selectOption('#dom-fb-solution-status', 'published');
    await page.click('#dom-query-feedbacks');
    const rows = page.locator('#dom-fb-tbody tr[data-feedback-id]');
    assert.ok(await rows.count() > 0, '有效关联方案筛选应有演示数据');
    assert.equal(await rows.locator('[data-solution-status="published"]').count(), await rows.count(),
      '筛选后每条评价都应关联有效方案');

    await rows.first().locator('[data-action="view-solution"]').click();
    assert.equal(await page.locator('#compat-solution-detail-drawer').getAttribute('aria-hidden'), 'false');
    const feedbackId = await rows.first().getAttribute('data-feedback-id');
    await page.click('#compat-solution-detail-drawer .compat-admin-drawer-close');
    await rows.first().locator('[data-action="hide-review"]').click();
    const affectedRow = page.locator(`#dom-fb-tbody tr[data-feedback-id="${feedbackId}"]`).first();
    await affectedRow.locator('[data-action="view-solution"]').click();
    assert.match(await page.locator('#compat-solution-detail-status').innerText(), /评价已隐藏.*方案仍然有效/s,
      '隐藏评价不得下架关联方案');
    assert.equal(await affectedRow.locator('[data-solution-status="published"]').count(), 1,
      '评价隐藏后关联方案状态必须保持有效');

    await page.click('#compat-solution-detail-drawer .compat-admin-drawer-close');
    await page.selectOption('#dom-fb-solution-status', 'unavailable');
    await page.click('#dom-query-feedbacks');
    const unavailableRows = page.locator('#dom-fb-tbody tr[data-feedback-id]');
    assert.ok(await unavailableRows.count() > 0, '不可用方案状态应有演示数据');
    assert.equal(await unavailableRows.locator('[data-solution-status="unavailable"]').count(), await unavailableRows.count());
    assert.ok((await unavailableRows.first().innerText()).length > 0, '方案不可用时仍必须保留评价内容');
    await assertNoPageErrors(errors, 'B 端关联方案生命周期');
  } finally {
    await page.close();
  }
});

test('B 端导出预览生成含方案关联字段的现有评价 CSV', async () => {
  const { page, errors } = await openDemo(bDemo, 'B 端', { width: 1440, height: 900 });
  try {
    assert.equal(await page.evaluate(() => typeof window.openCompatExportPreview), 'function',
      '未实现契约：B 端导出预览入口');
    await page.evaluate(() => window.openCompatExportPreview('domestic', 'filtered'));
    assert.equal(await page.locator('#compat-export-preview').getAttribute('aria-hidden'), 'false');
    assert.match(await page.locator('#compat-export-summary').innerText(), /将导出\s*\d+\s*条评价记录/);
    assert.ok(await page.locator('#compat-export-preview-body tr').count() > 0, '导出预览应展示记录');

    const downloadPromise = page.waitForEvent('download');
    await page.click('#compat-export-confirm');
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /^兼容性评价_\d{4}-\d{2}-\d{2}\.csv$/);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const csv = Buffer.concat(chunks).toString('utf8');
    for (const field of ['solution_id', 'solution_name', 'solution_status', 'solution_source', 'solution_linked_at']) {
      assert.match(csv, new RegExp(field), `CSV 缺少字段 ${field}`);
    }
    assert.equal(await page.locator('#compat-export-preview').getAttribute('aria-hidden'), 'true',
      '导出后应关闭预览层');
    await assertNoPageErrors(errors, 'B 端评价 CSV 导出');
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
      await assertNoPageErrors(errors, `${viewport.width}x${viewport.height} 响应式页面`);
    } finally {
      await page.close();
    }
  });
}

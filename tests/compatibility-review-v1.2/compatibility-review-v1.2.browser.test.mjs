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
    assert.equal(await page.locator('#fbStarsWrap').getAttribute('data-value'), '3');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), true);

    await page.click('#fbStarsWrap [data-val="1"]');
    assert.equal(await page.locator('#fbTypeWrap [data-type="unplayable"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), false);

    await page.click('#fbStarsWrap [data-val="2"]');
    assert.equal(await page.locator('#fbTypeWrap [data-type="partial"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), false);
    await assertNoPageErrors(errors, '评分与类型联动');
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

    await page.evaluate(() => window.compatibilityDemo.setSessionSnapshot({
      configHash: 'cfg_composite_collision_v1',
      engineVersion: 'demo-engine-v1',
      playSessionId: 'composite_session_1',
    }));
    await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
    await page.click('#fbStarsWrap [data-val="5"]');
    await page.check('#shareSessionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    await page.evaluate(() => window.compatibilityDemo.setSessionSnapshot({
      engineVersion: 'demo-engine-v2',
      playSessionId: 'composite_session_2',
    }));
    await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
    await page.click('#fbStarsWrap [data-val="5"]');
    await page.check('#shareSessionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    const collisions = await page.evaluate(() => window.compatibilityDemo.getCommunityProfiles()
      .filter((item) => item.configHash === 'cfg_composite_collision_v1'));
    assert.equal(collisions.length, 2, '不同引擎版本不得因 config_hash 相同而串池');
    assert.notEqual(collisions[0].engineVersion, collisions[1].engineVersion);
    assert.equal(await page.locator('#cloudSharePage').count(), 0);
    await assertNoPageErrors(errors, '公共方案池精确去重');
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

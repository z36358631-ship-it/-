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
      ['#launchLayer', '启动中状态层'],
      ['#gameplayLayer', '独立横屏游戏层'],
      ['#exitGameButton', '横屏退出游戏入口'],
      ['#confirmExitGameButton', '退出游戏确认操作'],
      ['#modalFeedback', '共用兼容性评价弹窗'],
      ['#fbTypeWrap', '兼容类型单选组'],
      ['#fbSolutionSection', '3–5 星实际运行方案区'],
      ['#cloudSharePage', '现有云分享编辑页模拟'],
      ['#solutionDetailPage', '现有方案详情页模拟'],
    ];
    for (const [selector, contract] of selectors) await requireOne(page, selector, contract);
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

test('查看并应用他人方案后启动、退出并关联本次方案', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 390, height: 844 });
  try {
    await page.click('#openCompatibilityReviews');
    await page.click('[data-review-state="valid"] .review-solution-card');
    await page.click('#applySolutionButton');
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), false,
      '应用成功后应返回游戏详情');
    assert.match(await page.locator('#currentAppliedSolution').innerText(), /Adreno 750 稳定方案/);

    await page.click('#startGameButton');
    await page.waitForFunction(() => document.body.dataset.journeyStage === 'gameplay');
    await page.setViewportSize({ width: 844, height: 390 });
    assert.equal(await page.locator('#gameplayLayer').isVisible(), true);
    await page.click('#exitGameButton');
    await page.click('#confirmExitGameButton');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.getElementById('modalFeedback')?.classList.contains('show'));
    assert.equal(await page.locator('#modalFeedback').getAttribute('data-entry-source'), 'proactive');
    assert.equal(await page.locator('#feedbackModalTitle').innerText(), '这次游戏体验怎么样？');
    await page.click('#fbStarsWrap [data-val="5"]');
    assert.match(await page.locator('#fbSolutionContent').innerText(), /Adreno 750 稳定方案/);
    await page.check('#linkCurrentSolutionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    const mine = await page.evaluate(() => window.getFeedbacks().find((item) => item.uid === 'me_demo_user'));
    assert.equal(mine.solutionId, 'solution_public_01');
    assert.equal(await page.locator('#cloudSharePage').isVisible(), false,
      '应用他人公开方案后应关联原方案，不应创建新的云分享方案');
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

test('3–5 星仅用勾选项关联本次方案，个人方案先提交评价再确认公开', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 1280, height: 900 });
  try {
    await page.evaluate(() => window.compatibilityDemo.setSolutionSource('public'));
    await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
    assert.equal(await page.locator('#modalFeedback').evaluate((element) => element.classList.contains('show')), true,
      '未实现契约：公开方案场景未打开共用评价弹窗');
    await page.click('#fbStarsWrap [data-val="5"]');
    await requireOne(page, '#linkCurrentSolutionCheckbox', '关联本次使用方案勾选项');
    assert.equal(await page.locator('#linkCurrentSolutionCheckbox').isChecked(), false,
      '方案关联必须由用户主动勾选');
    assert.match(await page.locator('#fbSolutionContent').innerText(), /关联本次使用的方案.*Adreno 750 稳定方案/s);
    assert.equal(await page.locator('#publishSolutionButton').count(), 0, '弹窗内不应出现独立发布按钮');
    assert.equal(await page.locator('#submitReviewOnlyButton').count(), 0, '弹窗内不应出现并列的仅提交按钮');
    await page.check('#linkCurrentSolutionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    assert.equal(await page.locator('#cloudSharePage').isVisible(), false, '公开方案无需重复发布');
    const publicReview = await page.evaluate(() => window.getFeedbacks()[0]);
    assert.equal(publicReview.solutionId, 'solution_public_01');

    await page.evaluate(() => window.compatibilityDemo.setSolutionSource('private'));
    await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
    await page.click('#fbStarsWrap [data-val="4"]');
    await requireOne(page, '#linkCurrentSolutionCheckbox', '个人方案关联勾选项');
    assert.equal(await page.locator('#linkCurrentSolutionCheckbox').isChecked(), false);
    await page.check('#linkCurrentSolutionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    assert.equal(await page.locator('#modalFeedback').evaluate((element) => element.classList.contains('show')), false,
      '评价应先提交完成并关闭弹窗');
    assert.equal(await page.locator('#cloudSharePage').isVisible(), true, '随后进入现有云分享确认页');
    let privateReview = await page.evaluate(() => window.getFeedbacks()[0]);
    assert.equal(privateReview.solution, null, '确认公开前评价不得关联个人方案');

    await requireOne(page, '#cancelCloudShare', '取消云分享且不影响已提交评价');
    await page.click('#cancelCloudShare');
    assert.equal(await page.locator('#cloudSharePage').isVisible(), false);
    privateReview = await page.evaluate(() => window.getFeedbacks()[0]);
    assert.equal(privateReview.solution, null, '取消公开后评价仍应保留且无方案关联');

    await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
    await page.click('#fbStarsWrap [data-val="4"]');
    await page.check('#linkCurrentSolutionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    await page.click('#confirmPublishAndLink');
    assert.equal(await page.locator('#cloudSharePage').isVisible(), false);
    privateReview = await page.evaluate(() => window.getFeedbacks()[0]);
    assert.equal(privateReview.solutionId, 'solution_private_01_published', '确认后才公开并关联');
    await assertNoPageErrors(errors, '公开与个人方案分流');
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
    assert.match(await page.locator('#solutionConfidenceLine').innerText(), /同配置.*成功率.*最近验证/);
    await requireOne(page, '#solutionCompatibilityDiff', '应用前配置校验结果');
    await page.click('#applySolutionButton');
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), false, '应用成功后返回详情，不自动启动');
    assert.match(await page.locator('#currentAppliedSolution').innerText(), /Adreno 750 稳定方案/);
    assert.equal(await page.locator('#gameplayLayer').isVisible(), false, '应用方案后不得自动启动游戏');
    await page.evaluate(() => window.openCompatPage());
    await page.click('[data-review-state="valid"] .review-solution-card');
    await requireOne(page, '#copySolutionButton', '复用现有复制方案能力');
    await page.click('#copySolutionButton');
    assert.match(await page.locator('#solutionApplyResult').innerText(), /已复制到.*我的方案/);
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

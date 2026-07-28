import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '产品经理全生命周期工作台demo.html');
const resultDir = path.join(root, 'test-results', 'product-manager-workbench');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(candidate => fs.existsSync(candidate));

assert(fs.existsSync(demoPath), `Missing demo: ${demoPath}`);
assert(executablePath, `Local Google Chrome not found. Checked: ${chromeCandidates.join(', ')}`);
fs.mkdirSync(resultDir, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
const pageErrors = [];

page.on('pageerror', error => {
  pageErrors.push(error.stack || error.message);
});

function pass(name) {
  console.log(`PASS ${name}`);
}

async function expectText(locator, text, message) {
  assert(
    (await locator.innerText()).includes(text),
    message || `Expected "${text}" in ${await locator.innerText()}`,
  );
}

async function expectDialogFocused(message) {
  await page.waitForFunction(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return dialog && document.activeElement === dialog;
  });
  assert.equal(
    await page.locator('[role="dialog"]').evaluate(dialog => document.activeElement === dialog),
    true,
    message,
  );
}

async function assertNoHorizontalPageScroll(message) {
  const dimensions = await page.locator('body').evaluate(body => ({
    bodyClientWidth: body.clientWidth,
    bodyScrollWidth: body.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
  }));
  assert(
    dimensions.bodyScrollWidth <= dimensions.bodyClientWidth
      && dimensions.documentScrollWidth <= dimensions.documentClientWidth,
    `${message}: ${JSON.stringify(dimensions)}`,
  );
}

function contrastRatio(hexA, hexB) {
  const luminance = hex => {
    const rgb = hex.match(/[a-f\d]{2}/gi).map(channel => parseInt(channel, 16) / 255);
    const linear = rgb.map(channel => (
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    ));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const [lighter, darker] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

try {
  await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
  await page.waitForSelector('#page-home.active');
  await page.waitForFunction(() => Boolean(window.WorkbenchDemo?.reset));
  await page.evaluate(() => window.WorkbenchDemo.reset());
  await page.waitForSelector('#page-home.active');

  // Home: five seed decisions, dialog focus/Escape behavior, and a completed decision flow.
  assert.equal(await page.locator('[data-metric]').count(), 4, 'Home must have 4 action metrics');
  assert.equal(
    await page.locator('[data-inbox-row]').count(),
    5,
    'Home must show exactly 5 seed inbox rows after WorkbenchDemo.reset()',
  );
  await expectText(
    page.locator('[data-inbox-id="IN-002"]'),
    '广告无填充',
    'IN-002 seed decision is missing',
  );
  await page.screenshot({ path: path.join(resultDir, 'home.png'), fullPage: true });

  const inboxTrigger = page.locator('[data-inbox-id="IN-001"] [data-action="open-inbox"]');
  await inboxTrigger.click();
  assert.equal(await page.locator('[role="dialog"]').count(), 1, 'Inbox decision dialog did not open');
  await expectText(page.locator('[role="dialog"]'), 'iOS/IPA资源库');
  await expectText(page.locator('[role="dialog"]'), '下一责任人');
  await expectText(page.locator('[role="dialog"]'), '唯一审批人');
  assert(await page.locator('#inboxDecision').inputValue(), 'Inbox decision must contain an editable product conclusion');
  await expectDialogFocused('Inbox dialog did not receive focus');
  await page.keyboard.press('Shift+Tab');
  assert.equal(
    await page.locator('[role="dialog"]').evaluate(dialog => dialog.contains(document.activeElement)),
    true,
    'Shift+Tab escaped the modal dialog',
  );
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[role="dialog"]').count(), 0, 'Escape did not close inbox dialog');
  assert.equal(
    await inboxTrigger.evaluate(button => document.activeElement === button),
    true,
    'Closing the inbox dialog did not restore focus to its trigger',
  );

  await inboxTrigger.click();
  await page.locator('[data-action="approve-inbox"]').click();
  assert.equal(
    await page.locator('[data-inbox-id="IN-001"]').count(),
    0,
    'Approved IN-001 stayed in the unified inbox',
  );
  assert.equal(
    await page.locator('[data-inbox-row]').count(),
    4,
    'Completing one seed decision should leave 4 inbox rows',
  );
  const inboxFlowState = await page.evaluate(() => window.WorkbenchDemo.getState());
  assert.equal(
    inboxFlowState.tasks.find(item => item.id === 'TASK-001')?.state,
    '已确认',
    'Inbox approval did not update its linked specialist task',
  );
  assert.equal(
    inboxFlowState.requirements.find(item => item.id === 'REQ-002')?.stage,
    '待业务确认',
    'Inbox approval did not advance the linked requirement',
  );
  assert(
    inboxFlowState.activity.some(item => item.itemId === 'IN-001' && item.decision && item.approver),
    'Inbox approval did not persist decision evidence',
  );
  pass('homeInbox');

  // Planning: source inputs, demand pool, and deterministic 29 + 6 = 35 / 34 insertion.
  await page.locator('[data-page="planning"]').click();
  await page.waitForSelector('#page-planning.active');
  assert.equal(
    await page.locator('[data-source-row]').count(),
    4,
    'Planning source inbox must contain 4 seed sources',
  );
  await page.locator('[data-planning-view="pool"]').click();
  assert.equal(
    await page.locator('[data-requirement-row]').count(),
    3,
    'Demand pool must contain 3 seed requirements before creation',
  );
  await page.locator('[data-planning-view="releases"]').click();
  const releaseCard = page.locator('[data-release="REL-APP-0826"]');
  await expectText(releaseCard, '29/34', 'APP-2026.8 must start at 29/34 person-days');

  await page.locator('[data-planning-view="pool"]').click();
  await page.locator('[data-action="assess-insertion"][data-id="REQ-003"]').click();
  assert.equal(await page.locator('[role="dialog"]').count(), 1, 'Insertion impact dialog did not open');
  const impactDialog = page.locator('[role="dialog"]');
  await expectText(impactDialog, '29/34');
  await expectText(impactDialog, '35/34');
  await expectText(impactDialog, '超出1人天');
  await expectText(impactDialog, '被挤出');
  await expectDialogFocused('Insertion dialog did not receive focus');
  await page.locator('[data-action="confirm-insertion"]').click();
  assert.equal(await page.locator('[role="dialog"]').count(), 0, 'Insertion dialog stayed open');
  await expectText(releaseCard, '35/34', 'Confirmed insertion must show 29 + 6 = 35/34');
  await page.screenshot({ path: path.join(resultDir, 'planning.png'), fullPage: true });
  await page.locator('[data-planning-view="insertions"]').click();
  assert.equal(await page.locator('[data-insertion-record]').count(), 1, 'Insertion approval record was not created');
  await expectText(page.locator('[data-insertion-record]'), '产品负责人');
  await expectText(page.locator('[data-insertion-record]'), '接受超出1人天');
  pass('planningInsertion');

  // Requirement REQ-002: complete lifecycle, two artifacts, and embedded AI assignment.
  await page.locator('[data-page="requirements"]').click();
  await page.waitForSelector('#page-requirements.active');
  assert.equal(
    await page.locator('[data-requirement-card]').count(),
    3,
    'Requirement center must contain 3 seed requirements before creation',
  );
  await page.selectOption('[data-requirement-filter="product"]', 'Mac');
  assert.equal(await page.locator('[data-requirement-card]').count(), 1, 'Product filter did not narrow the requirement cards');
  await expectText(page.locator('[data-requirement-card]'), 'iOS应用与IPA资源库');
  await page.selectOption('[data-requirement-filter="product"]', '全部产品端');
  await page.locator('[data-requirement-card][data-id="REQ-002"]').click();
  const requirementDetail = page.locator('[data-requirement-detail="REQ-002"]');
  assert.equal(await requirementDetail.count(), 1, 'REQ-002 detail did not render');
  await expectText(requirementDetail, '专员执行');
  await expectText(requirementDetail, '下一责任人');
  await expectText(requirementDetail, '唯一审批人');
  assert.equal(
    await requirementDetail.locator('[data-stage-step]').count(),
    15,
    'REQ-002 lifecycle must contain 15 stages',
  );
  assert.equal(
    await requirementDetail.locator('[data-artifact]').count(),
    2,
    'REQ-002 must expose exactly 2 seed artifacts',
  );
  await requirementDetail.locator('[data-action="open-artifact"]').first().click();
  await expectText(page.locator('[role="dialog"]'), '当前V1展示产物关联关系');
  await page.keyboard.press('Escape');
  pass('requirementLifecycle');

  await requirementDetail.locator('[data-action="assign-task"][data-id="REQ-002"]').click();
  assert.equal(await page.locator('[role="dialog"]').count(), 1, 'Requirement assignment dialog did not open');
  await expectDialogFocused('Assignment dialog did not receive focus');
  await page.selectOption('#taskAssignee', '需求验收官');
  await page.evaluate(() => { window.__workbenchXss = 0; });
  await page.fill('#taskTitle', '检查PRD遗漏和边界条件 <img src=x onerror="window.__workbenchXss++">');
  await page.fill('#taskDeliverable', '问题清单与修改建议 <svg onload="window.__workbenchXss++">');
  await page.fill('#taskMaterials', '主版本Demo、候选PRD和竞品研究');
  await page.fill('#taskAcceptance', '每个问题包含位置、影响和修改建议');
  await page.locator('[data-action="submit-task"]').click();
  assert.equal(await page.locator('[role="dialog"]').count(), 0, 'Assignment dialog stayed open');
  await page.locator('[data-page="team"]').click();
  const assignedTaskRow = page.locator('[data-task-row]').filter({ hasText: '检查PRD遗漏和边界条件' });
  assert.equal(await assignedTaskRow.count(), 1, 'New assignment row was not rendered');
  await expectText(assignedTaskRow, '需求验收官');
  await expectText(assignedTaskRow, 'AI');
  await expectText(assignedTaskRow, '问题清单与修改建议');
  await expectText(assignedTaskRow, '产品负责人');
  assert.equal(await assignedTaskRow.locator('img,svg').count(), 0, 'Task text was interpreted as executable markup');
  assert.equal(await page.evaluate(() => window.__workbenchXss), 0, 'Task input executed persisted markup');
  await assignedTaskRow.locator('[data-action="open-task"]').click();
  await expectText(page.locator('[role="dialog"]'), '只读材料，不改变正式状态');
  await expectText(page.locator('[role="dialog"]'), '每个问题包含位置、影响和修改建议');
  await page.keyboard.press('Escape');
  pass('embeddedAssignment');

  await page.locator('[data-page="requirements"]').click();
  await page.locator('[data-requirement-card][data-id="REQ-002"]').click();
  await page.screenshot({ path: path.join(resultDir, 'requirement.png'), fullPage: true });

  // Review REV-002: product-owner decision and durable decision state.
  await page.locator('[data-page="review"]').click();
  await page.waitForSelector('#page-review.active');
  assert.equal(await page.locator('[data-review-row]').count(), 4, 'Review queue must have 4 seed items');
  await page.locator('[data-review-filter="开发问题"]').click();
  assert.equal(await page.locator('[data-review-row]').count(), 1, 'Review filter did not narrow the queue');
  await page.locator('[data-review-filter="全部"]').click();
  const reviewRow = page.locator('[data-review-id="REV-002"]');
  await reviewRow.locator('[data-action="open-review"]').click();
  assert.equal(await page.locator('[role="dialog"]').count(), 1, 'REV-002 decision dialog did not open');
  await expectText(page.locator('[role="dialog"]'), '无填充状态');
  await expectDialogFocused('Review dialog did not receive focus');
  await page.selectOption('#reviewDecision', '补充PRD并同步Demo');
  await page.fill('#reviewReason', '无填充时移除广告节点，保持自然内容连续。<img src=x onerror="window.__workbenchXss++">');
  await page.locator('[data-action="submit-review"]').click();
  await expectText(reviewRow, '已决策', 'REV-002 did not enter the decided state');
  await expectText(reviewRow, '补充PRD并同步Demo', 'REV-002 decision was not rendered');
  const tasksAfterFirstDecision = await page.evaluate(() => window.WorkbenchDemo.getState().tasks.length);
  await reviewRow.locator('[data-action="open-review"]').click();
  await expectText(page.locator('[role="dialog"]'), '已决策，仅查看');
  assert.equal(await page.locator('[data-action="submit-review"]').count(), 0, 'Decided review stayed editable');
  assert.equal(await page.locator('[role="dialog"] img').count(), 0, 'Review reason was interpreted as executable markup');
  await page.keyboard.press('Escape');
  assert.equal(
    await page.evaluate(() => window.WorkbenchDemo.getState().tasks.length),
    tasksAfterFirstDecision,
    'Viewing a decided review created a duplicate task',
  );
  assert.equal(await page.evaluate(() => window.__workbenchXss), 0, 'Review input executed persisted markup');
  await page.screenshot({ path: path.join(resultDir, 'review.png'), fullPage: true });
  pass('reviewAcceptance');

  // Global search opens the matching requirement.
  await page.fill('#globalSearch', '广告');
  await page.press('#globalSearch', 'Enter');
  assert.equal(
    await page.locator('[data-search-result]').count(),
    1,
    'Global search for 广告 must return exactly one authorized requirement',
  );
  await expectDialogFocused('Search dialog did not receive focus');
  await page.locator('[data-search-result]').click();
  assert.equal(
    await page.locator('[data-requirement-detail="REQ-001"]').count(),
    1,
    'Search result did not open REQ-001',
  );

  // New requirement survives a full page reload along with earlier decisions.
  await page.locator('.topbar [data-action="new-requirement"]').click();
  assert.equal(await page.locator('[role="dialog"]').count(), 1, 'New requirement dialog did not open');
  await expectDialogFocused('New requirement dialog did not receive focus');
  await page.locator('[data-action="create-requirement"]').click();
  await expectText(page.locator('#newRequirementError'), '请填写需求名称');
  const injectedRequirementTitle = '启动失败策略补充 <img src=x onerror="window.__workbenchXss++">';
  await page.fill('#newRequirementTitle', injectedRequirementTitle);
  await page.selectOption('#newRequirementProduct', 'App & Mac');
  await page.selectOption('#newRequirementPath', '快速需求');
  await page.locator('[data-action="create-requirement"]').click();
  await expectText(page.locator('#page-requirements'), '启动失败策略补充');
  assert.equal(await page.locator('#page-requirements img').count(), 0, 'Requirement title was interpreted as executable markup');
  assert.equal(await page.evaluate(() => window.__workbenchXss), 0, 'Requirement title executed markup');
  assert.equal(
    await page.locator('[data-requirement-card]').count(),
    4,
    'Requirement center should contain the new fourth requirement',
  );

  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.WorkbenchDemo?.getState));
  await page.waitForSelector('#page-requirements.active');
  await expectText(page.locator('#page-requirements'), '启动失败策略补充');
  assert.equal(await page.evaluate(() => window.__workbenchXss), undefined, 'Reload preserved an unexpected global injection marker');
  assert.equal(
    await page.locator('[data-requirement-card]').count(),
    4,
    'New requirement did not survive refresh',
  );
  const persistedState = await page.evaluate(() => window.WorkbenchDemo.getState());
  assert(
    persistedState.requirements.some(item => item.title === injectedRequirementTitle),
    'Created requirement is missing from persisted state',
  );
  assert.equal(
    await page.evaluate(() => window.WorkbenchDemo.getReleaseUsage('REL-APP-0826')),
    35,
    'Insertion capacity did not survive refresh',
  );
  assert.equal(
    Object.hasOwn(persistedState.releases.find(item => item.id === 'REL-APP-0826'), 'requirementIds'),
    false,
    'Version view duplicated the requirement-to-release relation',
  );
  assert(
    persistedState.requirements.find(item => item.id === 'REQ-003')?.releaseIds.includes('REL-APP-0826'),
    'Inserted requirement did not retain its release relation',
  );
  assert.equal(
    persistedState.reviews.find(item => item.id === 'REV-002')?.state,
    '已决策',
    'REV-002 decision did not survive refresh',
  );
  assert.equal(
    persistedState.inbox.some(item => item.id === 'IN-001'),
    false,
    'Completed inbox decision returned after refresh',
  );
  assert(
    persistedState.tasks.some(item => item.title.startsWith('检查PRD遗漏和边界条件')
      && item.assignee === '需求验收官'
      && item.kind === 'AI'
      && item.inputMaterials
      && item.acceptanceCriteria
      && item.approver === '产品负责人'),
    'Embedded AI assignment did not survive refresh',
  );
  pass('searchCreatePersistence');

  // Reset confirmation, complete transient cleanup, and corrupted localStorage recovery.
  await page.locator('.topbar [data-action="reset-demo"]').click();
  await expectText(page.locator('[role="dialog"]'), '清除本地新增需求');
  await page.locator('[data-action="close-overlay"]').first().click();
  await page.fill('#globalSearch', 'REQ');
  await page.press('#globalSearch', 'Enter');
  assert.equal(await page.locator('[role="dialog"]').count(), 1, 'Search dialog did not open before reset test');
  await page.evaluate(() => window.WorkbenchDemo.reset());
  assert.equal(await page.locator('[role="dialog"]').count(), 0, 'WorkbenchDemo.reset left a dialog open');
  assert.equal(await page.inputValue('#globalSearch'), '', 'WorkbenchDemo.reset did not clear global search');
  assert.equal(await page.locator('#page-home.active').count(), 1, 'WorkbenchDemo.reset did not return to home');
  for (const invalidState of ['null', '{"currentPage":"home"}', '{"currentPage":"home","requirements":"bad"}']) {
    await page.evaluate(value => localStorage.setItem('product-manager-workbench-v2', value), invalidState);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.WorkbenchDemo?.getState));
    assert.equal(await page.locator('[data-inbox-row]').count(), 5, `Invalid persisted state did not recover: ${invalidState}`);
  }
  pass('resetRecovery');

  // 768px and 375px responsive/accessibility checks across all six pages.
  await page.setViewportSize({ width: 768, height: 1024 });
  for (const pageName of ['home', 'planning', 'requirements', 'review', 'data', 'team']) {
    await page.locator(`[data-page="${pageName}"]`).click();
    await page.waitForSelector(`#page-${pageName}.active`);
    await assertNoHorizontalPageScroll(`768px ${pageName} layout has horizontal page scroll`);
  }
  await page.locator('[data-page="home"]').click();
  const metricColumnCount = await page.locator('.metric-grid').evaluate(grid => (
    getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length
  ));
  assert.equal(metricColumnCount, 2, '768px home metrics must use two columns');
  assert.equal(
    await page.locator('.nav-item > span').evaluateAll(labels => labels.every(label => getComputedStyle(label).display !== 'none')),
    true,
    '768px navigation labels are not visually discoverable',
  );
  assert.equal(await page.locator('[aria-label="主导航"]').count(), 1, 'Main navigation label missing');
  assert.equal(
    await page.locator('input[aria-label="全局搜索"]').count(),
    1,
    'Accessible global search label missing',
  );
  assert.equal(await page.locator('.skip-link[href="#mainContent"]').count(), 1, 'Skip link missing');
  assert.equal(await page.locator('main#mainContent').count(), 1, 'Main landmark target missing');
  assert.equal(
    await page.locator('button').evaluateAll(buttons => (
      buttons.filter(button => !button.textContent.trim() && !button.getAttribute('aria-label')).length
    )),
    0,
    'Found a button without an accessible name',
  );
  assert.equal(
    await page.locator('input, select, textarea').evaluateAll(controls => controls.filter(control => (
      !control.getAttribute('aria-label')
      && !control.getAttribute('aria-labelledby')
      && control.labels?.length === 0
    )).length),
    0,
    'Found a form control without an accessible label',
  );
  assert.equal(
    await page.locator('.topbar [data-action="new-requirement"]').isVisible(),
    true,
    'Narrow layout hides the primary new-requirement action',
  );
  assert.equal(
    await page.locator('.topbar [data-action="reset-demo"]').isVisible(),
    true,
    'Narrow layout hides the reset action',
  );
  const colors = await page.locator(':root').evaluate(root => {
    const style = getComputedStyle(root);
    return {
      primary: style.getPropertyValue('--primary').trim(),
      secondary: style.getPropertyValue('--text-3').trim(),
    };
  });
  assert(contrastRatio(colors.primary, '#ffffff') >= 4.5, `Primary button contrast is too low: ${colors.primary}`);
  assert(contrastRatio(colors.secondary, '#ffffff') >= 4.5, `Secondary text contrast is too low: ${colors.secondary}`);
  await page.screenshot({ path: path.join(resultDir, 'narrow.png'), fullPage: true });

  await page.setViewportSize({ width: 375, height: 812 });
  for (const pageName of ['home', 'planning', 'requirements', 'review', 'data', 'team']) {
    await page.locator(`[data-page="${pageName}"]`).click();
    await page.waitForSelector(`#page-${pageName}.active`);
    await assertNoHorizontalPageScroll(`375px ${pageName} layout has horizontal page scroll`);
  }
  await page.locator('[data-page="home"]').click();
  assert.equal(
    await page.locator('.nav-item > span').evaluateAll(labels => labels.every(label => getComputedStyle(label).display !== 'none')),
    true,
    '375px bottom navigation labels are hidden',
  );
  assert(
    await page.locator('.topbar .btn').evaluateAll(buttons => buttons.every(button => button.getBoundingClientRect().height >= 44)),
    '375px topbar controls are smaller than 44px',
  );
  await page.screenshot({ path: path.join(resultDir, 'mobile.png'), fullPage: false });

  for (const filename of ['home.png', 'planning.png', 'requirement.png', 'review.png', 'narrow.png', 'mobile.png']) {
    const screenshotPath = path.join(resultDir, filename);
    assert(fs.existsSync(screenshotPath), `Screenshot was not created: ${screenshotPath}`);
    assert(
      fs.statSync(screenshotPath).size > 10_000,
      `Screenshot is unexpectedly small: ${screenshotPath}`,
    );
  }
  pass('responsiveAccessibility');

  assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join(' | ')}`);
  pass('pageErrors');
} finally {
  await browser.close();
}

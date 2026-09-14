import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cDemo = path.join(root, 'demos', 'Mod与发行人', '发行人计划demo.html');
const bDemo = path.join(root, 'demos', 'Mod与发行人', '发行人计划-后台demo.html');
const baselineRoot = path.join(root, '.tmp', 'rental-pages-publish-20260812', 'demos');
const cBaseline = path.join(baselineRoot, '发行人计划demo.html');
const bBaseline = path.join(baselineRoot, '发行人计划-后台demo.html');
const outputDir = path.join(root, 'public', 'prd', 'publisher-plan-v2');
const evidenceDir = path.join(root, 'docs', 'evidence', 'publisher-plan-v2');
const baselineDir = path.join(evidenceDir, 'baseline');
const componentDir = path.join(evidenceDir, 'components');
const evidencePath = path.join(evidenceDir, 'verification.json');

for (const directory of [outputDir, evidenceDir, baselineDir, componentDir]) {
  fs.mkdirSync(directory, { recursive: true });
}

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].find(fs.existsSync);
assert(executablePath, 'Local Chrome not found');
assert(fs.existsSync(cBaseline) && fs.existsSync(bBaseline), 'V1 visual baseline not found');

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--allow-file-access-from-files']
});

const screenshots = [];
const componentEvidence = [];
const pagesToClose = [];

function pngInfo(file) {
  const buffer = fs.readFileSync(file);
  assert(buffer.length > 1000, `${path.basename(file)} is unexpectedly small`);
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${path.basename(file)} is not PNG`);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  assert(width > 0 && height > 0, `${path.basename(file)} has invalid dimensions`);
  return {
    bytes: buffer.length,
    width,
    height,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex')
  };
}

async function openTracked(file, viewport) {
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
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 60_000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(80);
  pagesToClose.push(context);
  return { page, externalRequests, pageErrors, consoleErrors };
}

async function settle(page) {
  await page.evaluate(() => {
    const activeView = document.querySelector('.view.active');
    if (activeView) activeView.scrollTop = 0;
    const scrollArea = document.querySelector('.page-content');
    if (scrollArea) scrollArea.scrollTop = 0;
  });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(80);
}

async function capture(locator, file, collection, name, title) {
  await locator.waitFor({ state: 'visible' });
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await locator.screenshot({ path: file, animations: 'disabled' });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await locator.page().waitForTimeout(150 * attempt);
    }
  }
  const info = pngInfo(file);
  collection.push({
    name,
    title,
    path: path.relative(root, file).replaceAll('\\', '/'),
    ...info
  });
  return info;
}

async function captureC(page, name, title) {
  await settle(page);
  return capture(page.locator('.phone'), path.join(outputDir, `${name}.png`), screenshots, name, title);
}

async function captureB(page, name, title) {
  await settle(page);
  return capture(page.locator('.layout'), path.join(outputDir, `${name}.png`), screenshots, name, title);
}

async function rect(locator) {
  return locator.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
}

try {
  const c = await openTracked(cDemo, { width: 520, height: 980 });
  const page = c.page;
  await page.locator('.phone').waitFor({ state: 'visible' });

  assert.equal(await page.evaluate(() => calculateReward(3800, 2, 10000)), 7600);
  assert.equal(await page.evaluate(() => calculateReward(8000, 2, 10000)), 10000);
  const rolloutResult = await page.evaluate(() => {
    const config20 = { ...publisherRollout, enabled: true, rolloutPercent: 20 };
    const config50 = { ...publisherRollout, enabled: true, rolloutPercent: 50 };
    const config100 = { ...publisherRollout, enabled: true, rolloutPercent: 100 };
    const off = { ...publisherRollout, enabled: false, rolloutPercent: 50 };
    const subjectId = 'u10002';
    return {
      first: stableRolloutBucket(`${subjectId}|publisher_plan|${publisherRollout.rolloutSeed}`),
      second: stableRolloutBucket(`${subjectId}|publisher_plan|${publisherRollout.rolloutSeed}`),
      at20: getPublisherRolloutDecision({ subjectId, hasExistingRelation: false, config: config20 }).canStartNew,
      at50: getPublisherRolloutDecision({ subjectId, hasExistingRelation: false, config: config50 }).canStartNew,
      at100: getPublisherRolloutDecision({ subjectId, hasExistingRelation: false, config: config100 }).canStartNew,
      off: getPublisherRolloutDecision({ subjectId, hasExistingRelation: false, config: off }).canStartNew,
      existing: getPublisherRolloutDecision({ subjectId, hasExistingRelation: true, config: off }).canManageExisting
    };
  });
  assert.equal(rolloutResult.first, rolloutResult.second, 'same subject must stay in one bucket');
  assert.equal(rolloutResult.at20, true, 'fixture account must be inside the first 20 percent');
  assert.equal(rolloutResult.at50, true, '20 percent users must remain in 50 percent');
  assert.equal(rolloutResult.at100, true);
  assert.equal(rolloutResult.off, false);
  assert.equal(rolloutResult.existing, true);

  await captureC(page, '01-task-plaza', '找任务');
  const publishedCountBeforeIdentity = await page.evaluate(() => myPublished.length);
  await page.evaluate(() => { identityState.realNameVerified = false; });
  await page.locator('.fab').click();
  assert.equal(await page.locator('#modal').evaluate(element => element.classList.contains('show')), true);
  assert.equal(await page.locator('#modal-title').innerText(), '完成实名认证');
  assert.equal(await page.locator('#modal-content').innerText(), '发布任务前需要先完成实名认证。');
  assert.equal(await page.locator('#modal-confirm').innerText(), '去认证');
  assert.equal(await page.locator('#view-create').evaluate(element => element.classList.contains('active')), false);
  await captureC(page, '25-publish-real-name-gate', '发布任务实名认证');
  await page.locator('#modal-confirm').click();
  assert.equal(await page.locator('#view-create').evaluate(element => element.classList.contains('active')), true);
  assert.equal(await page.evaluate(() => myPublished.length), publishedCountBeforeIdentity, 'real-name success must not submit a task');
  await page.evaluate(() => {
    clearTimeout(toastTimer);
    document.getElementById('toast').classList.remove('show');
    showView('plaza');
  });
  await page.evaluate(() => showRules('plaza'));
  await captureC(page, '02-play-rules', '玩法说明');
  assert.equal(await page.getByText('任务中心获得的是盖世积分，与盖世币分开计算', { exact: false }).count() > 0, true);
  assert.equal(await page.getByText('充值获得的盖世币仅可用于发布任务，不可兑换京东卡', { exact: false }).count() > 0, true);
  assert.equal(await page.getByText('只有参与发行任务并结算获得的盖世币可兑换京东电子卡', { exact: false }).count() > 0, true);

  await page.evaluate(() => openDetail(1));
  assert.equal(await page.getByText('每 1 个赞奖励 2 盖世币', { exact: false }).count() > 0, true);
  assert.equal(await page.getByText('单篇最高 10,000 盖世币', { exact: false }).count() > 0, true);
  await captureC(page, '03-task-detail', '任务详情');
  await page.evaluate(() => showView('mytask'));
  await captureC(page, '04-my-tasks', '做任务');
  await page.evaluate(() => showView('submit'));
  await captureC(page, '05-submit-work', '提交投稿');
  await page.evaluate(() => showView('create'));
  assert.equal(await page.locator('#submit-task-btn').innerText(), '提交');
  await captureC(page, '06-create-task', '创建发行任务');
  await page.locator('#create-content').evaluate(element => { element.scrollTop = element.scrollHeight; });
  await page.locator('#submit-task-btn').waitFor({ state: 'visible' });
  await capture(
    page.locator('.phone'),
    path.join(outputDir, '27-create-task-submit.png'),
    screenshots,
    '27-create-task-submit',
    '创建任务提交按钮'
  );

  await page.evaluate(() => showView('earnings'));
  assert.equal(await page.locator('#wallet-total').innerText(), '3,650');
  assert.equal(await page.locator('#view-earnings .redeem-card-entry strong').innerText(), '兑换商城');
  assert.equal(await page.getByText('只有参与发行任务并结算获得的盖世币可兑换', { exact: true }).count(), 1);
  await captureC(page, '07-wallet', '我的钱包');
  await capture(
    page.locator('#view-earnings .header'),
    path.join(componentDir, 'c-topbar-wallet.png'),
    componentEvidence,
    'C-TOPBAR',
    '钱包顶部栏'
  );
  await capture(
    page.locator('#view-earnings .earn-tabs'),
    path.join(componentDir, 'c-tab-wallet.png'),
    componentEvidence,
    'C-TAB',
    '钱包流水 Tab'
  );

  await page.evaluate(() => showView('recharge'));
  await captureC(page, '08-recharge', '充值盖世币');
  assert.equal(await page.getByText('充值所得仅可用于发布任务，不计入兑换余额', { exact: false }).count() > 0, true);
  assert.equal(await page.locator('#custom-amt').count(), 0, '充值不得支持自定义金额');

  await page.evaluate(() => showView('card-store'));
  assert.equal(await page.locator('#view-card-store .header .title').innerText(), '兑换商城');
  assert.equal(await page.locator('#redeemable-balance').innerText(), '2,650');
  assert.equal(await page.locator('[data-card-id="JD50"]').isDisabled(), true, '售罄卡必须禁用');
  assert.equal(await page.locator('[data-card-id="JD100"]').isDisabled(), true, '余额不足卡必须禁用');
  await captureC(page, '09-card-store', '兑换商城');

  const redeemBeforeIdentity = await page.evaluate(() => ({
    totalBalance: wallet.totalBalance,
    redeemableBalance: wallet.redeemableBalance,
    orderCount: cardOrders.length
  }));
  await page.evaluate(() => {
    clearTimeout(toastTimer);
    document.getElementById('toast').classList.remove('show');
    identityState.realNameVerified = false;
  });
  await page.getByRole('button', { name: /京东E卡 20元/ }).click();
  assert.equal(await page.locator('#modal-title').innerText(), '完成实名认证');
  assert.equal(await page.locator('#modal-content').innerText(), '兑换前需要先完成实名认证。');
  assert.equal(await page.locator('#card-redeem-modal').getAttribute('aria-hidden'), 'true');
  assert.deepEqual(await page.evaluate(() => ({
    totalBalance: wallet.totalBalance,
    redeemableBalance: wallet.redeemableBalance,
    orderCount: cardOrders.length
  })), redeemBeforeIdentity, 'opening the real-name gate must not redeem');
  await captureC(page, '26-redeem-real-name-gate', '兑换实名认证');
  await page.locator('#modal-confirm').click();
  assert.equal(await page.locator('#card-redeem-modal').getAttribute('aria-hidden'), 'false');
  assert.deepEqual(await page.evaluate(() => ({
    totalBalance: wallet.totalBalance,
    redeemableBalance: wallet.redeemableBalance,
    orderCount: cardOrders.length
  })), redeemBeforeIdentity, 'real-name success must only restore the confirmation dialog');
  await page.evaluate(() => {
    clearTimeout(toastTimer);
    document.getElementById('toast').classList.remove('show');
  });
  assert.equal(await page.getByText('当前可兑换').count(), 1);
  assert.equal(await page.getByText('只有参与发行任务并结算获得的盖世币可兑换', { exact: false }).count() > 0, true);
  await captureC(page, '10-card-confirm', '确认兑换');
  await capture(
    page.locator('#card-redeem-modal .modal'),
    path.join(componentDir, 'c-dialog-card-confirm.png'),
    componentEvidence,
    'C-DIALOG',
    '兑换确认弹窗'
  );

  await page.evaluate(() => { identityState.realNameVerified = false; });
  await page.locator('#confirm-card-redeem').click();
  assert.equal(await page.locator('#modal-title').innerText(), '完成实名认证');
  assert.deepEqual(await page.evaluate(() => ({
    totalBalance: wallet.totalBalance,
    redeemableBalance: wallet.redeemableBalance,
    orderCount: cardOrders.length
  })), redeemBeforeIdentity, 'final redeem identity rejection must not change assets or orders');
  await page.locator('#modal-confirm').click();
  assert.equal(await page.locator('#card-redeem-modal').getAttribute('aria-hidden'), 'false');
  assert.deepEqual(await page.evaluate(() => ({
    totalBalance: wallet.totalBalance,
    redeemableBalance: wallet.redeemableBalance,
    orderCount: cardOrders.length
  })), redeemBeforeIdentity, 'final identity success must still wait for confirm');
  await page.evaluate(() => {
    clearTimeout(toastTimer);
    document.getElementById('toast').classList.remove('show');
    Date.now = () => 202608310001;
  });
  await page.locator('#confirm-card-redeem').click();
  assert.equal(await page.getByText('发放成功').count(), 1);
  assert.equal(await page.locator('#redeemable-balance').innerText(), '650');
  assert.equal(await page.locator('#wallet-total').innerText(), '1,650');
  assert.equal(await page.evaluate(() => wallet.rechargeBalance), 1000);
  assert.match(await page.locator('#current-card-code').innerText(), /^\*{4}-\*{4}-\*{4}-/);
  await captureC(page, '11-card-success', '自动发卡密');
  await page.getByRole('button', { name: '查看卡密' }).click();
  assert.match(await page.locator('#current-card-code').innerText(), /^JDE8-/);
  await page.evaluate(() => closeCardRedeem());
  assert.equal(await page.locator('[data-card-id="JD20"]').isDisabled(), true, '已达限兑次数后必须禁用');

  await page.evaluate(() => openCardHistory());
  assert.equal(await page.locator('#card-history-list .card-order-item').count(), 2);
  assert.match(await page.locator('#history-code-0').innerText(), /^\*{4}-\*{4}-\*{4}-/);
  await captureC(page, '12-card-history', '兑换记录');
  await page.evaluate(() => closeCardHistory());

  const rechargeCheck = await openTracked(cDemo, { width: 520, height: 980 });
  await rechargeCheck.page.evaluate(() => showView('recharge'));
  await rechargeCheck.page.locator('#agree-check').check();
  await rechargeCheck.page.evaluate(() => doRecharge());
  const rechargeBalances = await rechargeCheck.page.evaluate(() => ({ ...wallet }));
  assert.deepEqual(rechargeBalances, { totalBalance: 8650, redeemableBalance: 2650, rechargeBalance: 6000 });

  const identityCheck = await openTracked(cDemo, { width: 520, height: 980 });
  await identityCheck.page.evaluate(() => {
    identityState.realNameVerified = false;
    requirePublisherIdentity();
  });
  assert.equal(await identityCheck.page.getByText('完成实名认证', { exact: true }).count(), 1);
  await identityCheck.page.evaluate(() => {
    closeModal();
    identityState.realNameVerified = true;
    identityState.creatorCertified = false;
    currentTask = tasks[0];
    beginSubmission();
  });
  assert.equal(await identityCheck.page.getByText('完成创作者认证', { exact: true }).count(), 1);

  const taskFlow = await openTracked(cDemo, { width: 520, height: 980 });
  await taskFlow.page.evaluate(() => {
    wallet.totalBalance = 50000;
    wallet.rechargeBalance = 50000;
    wallet.redeemableBalance = 0;
    openCreateTask();
    selectGame(1);
  });
  await taskFlow.page.locator('#cr-name').fill('机器审核自动发布测试');
  await taskFlow.page.locator('#cr-price').fill('2');
  await taskFlow.page.locator('#cr-max').fill('10000');
  await taskFlow.page.locator('#cr-pool').fill('10000');
  await taskFlow.page.locator('#cr-submit-deadline').fill('2026-09-25T23:59');
  await taskFlow.page.locator('#cr-like-deadline').fill('2026-09-28T23:59');

  await taskFlow.page.evaluate(() => { publisherState.submittedToday = 10; });
  await taskFlow.page.locator('#submit-task-btn').click();
  assert.equal(await taskFlow.page.getByText('同一实名主体每天最多提交 10 个任务', { exact: true }).count(), 1);

  await taskFlow.page.evaluate(() => { publisherState.submittedToday = 9; });
  await taskFlow.page.locator('#cr-pool').fill('4999');
  await taskFlow.page.locator('#submit-task-btn').click();
  assert.equal(await taskFlow.page.getByText('任务预算需为 5,000～10,000,000 盖世币', { exact: true }).count(), 1);

  await taskFlow.page.locator('#cr-pool').fill('10000001');
  await taskFlow.page.locator('#submit-task-btn').click();
  assert.equal(await taskFlow.page.getByText('任务预算需为 5,000～10,000,000 盖世币', { exact: true }).count(), 1);

  await taskFlow.page.locator('#cr-pool').fill('10000');
  await taskFlow.page.locator('#submit-task-btn').click();
  assert.equal(await taskFlow.page.evaluate(() => myPublished[0].status), '机器审核中');
  await taskFlow.page.waitForTimeout(650);
  assert.equal(await taskFlow.page.evaluate(() => myPublished[0].status), '进行中');
  assert.equal(await taskFlow.page.getByText('机器审核通过后自动发布，任务已上架', { exact: true }).count(), 1);

  const submissionCheck = await openTracked(cDemo, { width: 520, height: 980 });
  await submissionCheck.page.evaluate(() => {
    currentTask = tasks[0];
    showView('submit');
  });
  const beforeReserved = await submissionCheck.page.evaluate(() => currentTask.reserved);
  await submissionCheck.page.locator('#video-link').fill('https://www.douyin.com/video/valid-001');
  await submissionCheck.page.getByRole('button', { name: '提交投稿' }).click();
  assert.equal(await submissionCheck.page.getByText('数据校验通过，待人工结算', { exact: false }).count() > 0, true);
  const submissionResult = await submissionCheck.page.evaluate(before => ({
    status: submissions[0].status,
    likes: submissions[0].likes,
    expectedReward: submissions[0].expectedReward,
    reservedDelta: currentTask.reserved - before
  }), beforeReserved);
  assert.deepEqual(submissionResult, { status: '数据校验通过，待人工结算', likes: 3800, expectedReward: 7600, reservedDelta: 10000 });

  await submissionCheck.page.evaluate(() => showView('submit'));
  await submissionCheck.page.locator('#video-link').fill('https://www.douyin.com/video/timeout-001');
  await submissionCheck.page.getByRole('button', { name: '提交投稿' }).click();
  assert.equal(await submissionCheck.page.evaluate(() => submissions[0].status), '抓取重试');
  assert.deepEqual(await submissionCheck.page.evaluate(() => ({ expectedReward: submissions[0].expectedReward, reservedCoin: submissions[0].reservedCoin })), { expectedReward: null, reservedCoin: 0 });

  const beforeDuplicate = await submissionCheck.page.evaluate(() => submissions.length);
  await submissionCheck.page.evaluate(() => showView('submit'));
  await submissionCheck.page.locator('#video-link').fill('https://www.douyin.com/video/valid-001');
  await submissionCheck.page.getByRole('button', { name: '提交投稿' }).click();
  assert.equal(await submissionCheck.page.getByText('该作品已提交过，不能重复投稿', { exact: true }).count(), 1);
  assert.equal(await submissionCheck.page.evaluate(() => submissions.length), beforeDuplicate);

  await submissionCheck.page.evaluate(() => {
    currentTask.reserved = currentTask.pool - currentTask.maxReward + 1;
    showView('submit');
  });
  await submissionCheck.page.locator('#video-link').fill('https://www.douyin.com/video/valid-002');
  await submissionCheck.page.getByRole('button', { name: '提交投稿' }).click();
  assert.equal(await submissionCheck.page.getByText('当前任务奖池名额已满', { exact: true }).count(), 1);

  const b = await openTracked(bDemo, { width: 1440, height: 900 });
  const adminPage = b.page;
  const adminScreens = [
    ['dashboard', '13-dashboard', '数据看板'],
    ['tasks', '14-task-management', '任务管理'],
    ['audit-task', '15-task-review', '任务审核'],
    ['audit-video', '16-video-review', '视频审核'],
    ['settlement', '17-settlement', '结算管理'],
    ['risk', '18-risk', '风控中心'],
    ['creator-audit', '19-creator-review', '创作者审核']
  ];
  for (const [route, name, title] of adminScreens) {
    await adminPage.evaluate(value => switchPage(value), route);
    await captureB(adminPage, name, title);
  }
  assert.equal(await adminPage.locator('img').count(), 0, '后台应无远程头像图片');

  await adminPage.evaluate(() => switchPage('audit-task'));
  assert.equal(await adminPage.getByText('任务机器审核记录', { exact: true }).count(), 1);
  assert.equal(await adminPage.getByRole('button', { name: '通过', exact: true }).count(), 0, '正常任务不得进入人工发布通过队列');

  await adminPage.evaluate(() => switchPage('audit-video'));
  for (const text of ['数据校验通过，待人工结算', '抓取重试', '风险挂起', '重新抓取']) {
    assert.equal(await adminPage.getByText(text, { exact: false }).count() > 0, true, `missing ${text}`);
  }

  await adminPage.evaluate(() => switchPage('settlement'));
  assert.equal(await adminPage.getByText('任务级结算批次', { exact: false }).count() > 0, true);
  assert.equal(await adminPage.locator('input[data-settlement-amount]').count(), 0);
  const beforeSettlementStatus = await adminPage.evaluate(() => settlementBatches[0].status);
  await adminPage.evaluate(() => settleBatch('BATCH20260911001'));
  const afterFirstSettlement = await adminPage.evaluate(() => settlementBatches[0].status);
  await adminPage.evaluate(() => settleBatch('BATCH20260911001'));
  const afterSecondSettlement = await adminPage.evaluate(() => settlementBatches[0].status);
  assert.deepEqual([beforeSettlementStatus, afterFirstSettlement, afterSecondSettlement], ['待人工结算', '已结算', '已结算']);

  await adminPage.evaluate(() => switchPage('creator-audit'));
  assert.equal(await adminPage.getByText('实名状态', { exact: true }).count() > 0, true);
  await adminPage.evaluate(() => auditCreator('CA001', 'pass'));
  assert.equal(await adminPage.evaluate(() => creatorApps.find(item => item.id === 'CA001').creatorTag), null);
  await adminPage.evaluate(() => inviteCreatorTag('CA001'));
  assert.equal(await adminPage.evaluate(() => creatorApps.find(item => item.id === 'CA001').creatorTag), '优质视频创作者');

  await adminPage.evaluate(() => switchPage('dashboard'));
  await adminPage.getByRole('button', { name: '设置', exact: true }).click();
  await adminPage.locator('#publisher-rollout-percent').selectOption('50');
  await adminPage.getByRole('button', { name: '保存设置' }).click();
  assert.equal(await adminPage.getByText('已开启 · 50%', { exact: true }).count(), 1);
  assert.deepEqual(await adminPage.evaluate(() => ({
    percent: publisherRolloutConfig.rolloutPercent,
    version: publisherRolloutConfig.configVersion,
    logCount: publisherRolloutChangeLog.length
  })), { percent: 50, version: 2, logCount: 1 });

  await adminPage.getByRole('button', { name: '设置', exact: true }).click();
  await adminPage.locator('#publisher-rollout-enabled').uncheck();
  assert.equal(await adminPage.locator('#publisher-rollout-percent').isDisabled(), true);
  await adminPage.getByRole('button', { name: '保存设置' }).click();
  assert.equal(await adminPage.getByText('已关闭', { exact: true }).count(), 1);
  assert.equal(await adminPage.evaluate(() => publisherRolloutConfig.rolloutPercent), 50, 'disable must retain last percent');
  await adminPage.getByRole('button', { name: '设置', exact: true }).click();
  await capture(
    adminPage.locator('#modal'),
    path.join(outputDir, '24-feature-rollout-settings.png'),
    screenshots,
    '24-feature-rollout-settings',
    '发行人计划外放设置'
  );
  await adminPage.evaluate(() => closeModal());

  await adminPage.evaluate(() => switchPage('jd-cards'));
  assert.equal(await adminPage.getByText('京东电子卡商品').count(), 1);
  assert.equal(await adminPage.getByText('任务中心盖世积分不可兑换', { exact: false }).count() > 0, true);
  assert.equal(await adminPage.locator('th').filter({ hasText: /^预警$/ }).count(), 0);
  await adminPage.evaluate(() => openCardProductModal('JD10'));
  assert.equal(await adminPage.getByText('库存预警阈值', { exact: true }).count(), 0);
  await adminPage.evaluate(() => closeModal());
  await captureB(adminPage, '20-card-products', '京东卡商品配置');
  await capture(
    adminPage.locator('.page-tabs'),
    path.join(componentDir, 'b-card-tabs.png'),
    componentEvidence,
    'B-CARD-TABS',
    '京东卡管理 Tab'
  );
  await adminPage.getByRole('tab', { name: '卡密库存' }).click();
  for (const status of ['未使用', '已预占', '已发放', '待核对', '作废']) {
    assert.equal(await adminPage.getByText(status, { exact: true }).count() > 0, true, `missing inventory status: ${status}`);
  }
  await captureB(adminPage, '21-card-inventory', '卡密库存');

  await adminPage.getByRole('button', { name: '库存告警设置' }).click();
  assert.equal(await adminPage.locator('#card-alert-threshold').inputValue(), '3');
  assert.equal(await adminPage.locator('#card-alert-repeat-hours').inputValue(), '24');
  assert.match(await adminPage.locator('#card-alert-webhooks').inputValue(), /\*{4}/);
  assert.match(await adminPage.locator('#card-alert-preview').innerText(), /京东E卡 100元/);
  await capture(
    adminPage.locator('#modal'),
    path.join(outputDir, '23-card-alert-settings.png'),
    screenshots,
    '23-card-alert-settings',
    '库存告警设置'
  );

  await adminPage.locator('#card-alert-threshold').fill('0');
  await adminPage.locator('#save-card-alert-settings').click();
  assert.equal(await adminPage.getByText('全局库存预警阈值必须为大于 0 的整数', { exact: true }).count(), 1);
  await adminPage.locator('#card-alert-threshold').fill('3');
  await adminPage.locator('#card-alert-repeat-hours').fill('0');
  await adminPage.locator('#save-card-alert-settings').click();
  assert.equal(await adminPage.getByText('重复提醒间隔必须为大于 0 的整数小时', { exact: true }).count(), 1);
  await adminPage.locator('#card-alert-repeat-hours').fill('24');
  await adminPage.locator('#card-alert-webhooks').fill('http://example.com/hook');
  await adminPage.locator('#save-card-alert-settings').click();
  assert.equal(await adminPage.locator('#modal').evaluate(element => element.classList.contains('show')), true);
  assert.equal(await adminPage.getByText('Webhook 必须是有效的 HTTPS 飞书机器人地址', { exact: true }).count(), 1);

  const demoWebhook = 'https://open.feishu.cn/open-apis/bot/v2/hook/demo-inventory-alert';
  await adminPage.locator('#card-alert-webhooks').fill(`${demoWebhook}\n${demoWebhook}`);
  await adminPage.locator('#save-card-alert-settings').click();
  assert.equal(await adminPage.evaluate(() => cardAlertSettings.maskedWebhooks.length), 1);
  assert.equal(await adminPage.evaluate(() => cardAlertSettings.maskedWebhooks[0].includes('demo-inventory-')), false);
  assert.match(await adminPage.evaluate(() => cardAlertSettings.maskedWebhooks[0]), /\/\*+lert$/);
  assert.deepEqual(await adminPage.evaluate(() => lastCardAlertSimulation.lowProductIds), ['JD100']);
  assert.deepEqual(await adminPage.evaluate(() => lastCardAlertSimulation.notifyProductIds), ['JD100']);

  await adminPage.evaluate(() => openCardAlertSettings());
  await adminPage.locator('#card-alert-webhooks').fill('');
  await adminPage.locator('#save-card-alert-settings').click();
  assert.equal(await adminPage.evaluate(() => cardAlertSettings.maskedWebhooks.length), 0);

  const alertSequence = await adminPage.evaluate(() => {
    cardAlertState.clear();
    const first = simulateCardInventoryAlerts(0, '首次跌破');
    const repeated = simulateCardInventoryAlerts(60 * 60 * 1000, '持续低库存');
    const afterInterval = simulateCardInventoryAlerts(24 * 60 * 60 * 1000, '达到重复间隔');
    const jd100 = jdCardProducts.find(item => item.id === 'JD100');
    jd100.stock = 4;
    const recovered = simulateCardInventoryAlerts(25 * 60 * 60 * 1000, '补货恢复');
    jd100.stock = 2;
    const droppedAgain = simulateCardInventoryAlerts(26 * 60 * 60 * 1000, '恢复后再次跌破');
    return { first, repeated, afterInterval, recovered, droppedAgain };
  });
  assert.deepEqual(alertSequence.first.notifyProductIds, ['JD100']);
  assert.deepEqual(alertSequence.repeated.notifyProductIds, []);
  assert.deepEqual(alertSequence.afterInterval.notifyProductIds, ['JD100']);
  assert.deepEqual(alertSequence.recovered.lowProductIds, []);
  assert.deepEqual(alertSequence.droppedAgain.notifyProductIds, ['JD100']);
  assert.equal(alertSequence.first.lowProductIds.includes('JD50'), false, '已下架 SKU 不得触发告警');

  await adminPage.evaluate(() => switchPage('card-orders'));
  assert.equal(await adminPage.getByText('京东卡兑换订单').count(), 1);
  for (const status of ['待发放', '已发放', '发放失败', '已退回', '待核对']) {
    assert.equal(await adminPage.getByText(status, { exact: true }).count() > 0, true, `missing order status: ${status}`);
  }
  assert.equal(await adminPage.getByText('禁止自动退款或补发', { exact: false }).count() > 0, true);
  assert.equal(await adminPage.getByText('只扣减参与发行任务并结算获得的盖世币', { exact: false }).count() > 0, true);
  assert.equal(await adminPage.getByText('物流', { exact: false }).count(), 0);
  await adminPage.waitForFunction(() => !document.getElementById('toast').classList.contains('show'));
  await captureB(adminPage, '22-card-orders', '京东卡兑换订单');

  const cOld = await openTracked(cBaseline, { width: 520, height: 980 });
  await cOld.page.evaluate(() => showView('earnings'));
  await settle(cOld.page);
  await capture(
    cOld.page.locator('.phone'),
    path.join(baselineDir, '07-wallet-v1.png'),
    [],
    '07-wallet-v1',
    'V1 钱包原稿'
  );
  const baselineTopbar = await rect(cOld.page.locator('#view-earnings .header'));
  await page.evaluate(() => showView('earnings'));
  await settle(page);
  const currentTopbar = await rect(page.locator('#view-earnings .header'));
  await capture(
    cOld.page.locator('#view-earnings .header'),
    path.join(componentDir, 'c-topbar-wallet-v1.png'),
    componentEvidence,
    'C-TOPBAR-V1',
    'V1 钱包顶部栏'
  );

  const bOld = await openTracked(bBaseline, { width: 1440, height: 900 });
  await capture(
    bOld.page.locator('.layout'),
    path.join(baselineDir, '13-dashboard-v1.png'),
    [],
    '13-dashboard-v1',
    'V1 后台看板原稿'
  );

  const flowContext = await browser.newContext({ viewport: { width: 1800, height: 1540 }, deviceScaleFactor: 1 });
  pagesToClose.push(flowContext);
  const flowPage = await flowContext.newPage();
  const flowSteps = [
    ['1', '实名后创建任务', '06-create-task.png'],
    ['2', '配置图片与奖励', '06-create-task.png'],
    ['3', '机器审核自动发布', '04-my-tasks.png'],
    ['4', '认证创作者查看任务', '03-task-detail.png'],
    ['5', '提交外站作品链接', '05-submit-work.png'],
    ['6', '数据校验并预留预算', '04-my-tasks.png'],
    ['7', '任务级人工结算', '04-my-tasks.png'],
    ['8', '盖世币奖励到账', '07-wallet.png']
  ];
  const stepHtml = flowSteps.map(([index, label, file], position) => {
    const data = fs.readFileSync(path.join(outputDir, file)).toString('base64');
    const arrow = position < 3 ? '→' : position === 3 ? '↓' : position < 7 ? '←' : '';
    return `<section class="step p${position + 1}"><div class="step-title"><b>${index}</b><span>${label}</span></div><img src="data:image/png;base64,${data}">${arrow ? `<i>${arrow}</i>` : ''}</section>`;
  }).join('');
  await flowPage.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#111;color:#f5f5f5;font-family:"Microsoft YaHei",sans-serif}.flow{width:1800px;height:1540px;padding:28px 34px;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(2,1fr);gap:24px;background:linear-gradient(135deg,#111,#21180f)}.step{position:relative;padding:14px;border:1px solid rgba(255,140,0,.35);border-radius:24px;background:#1b1b1d;display:flex;flex-direction:column;align-items:center;min-width:0}.p1{grid-column:1;grid-row:1}.p2{grid-column:2;grid-row:1}.p3{grid-column:3;grid-row:1}.p4{grid-column:4;grid-row:1}.p5{grid-column:4;grid-row:2}.p6{grid-column:3;grid-row:2}.p7{grid-column:2;grid-row:2}.p8{grid-column:1;grid-row:2}.step-title{height:48px;display:flex;align-items:center;gap:10px;font-size:19px;font-weight:700;text-align:center}.step-title b{display:flex;align-items:center;justify-content:center;flex:0 0 auto;width:32px;height:32px;border-radius:50%;background:#ff8c00;color:#111}.step img{width:330px;height:660px;object-fit:contain;object-position:top;border-radius:18px;background:#eee}.step i{position:absolute;z-index:2;color:#ff8c00;font-size:34px;font-style:normal}.p1 i,.p2 i,.p3 i{right:-31px;top:350px}.p4 i{bottom:-32px;left:calc(50% - 10px)}.p5 i,.p6 i,.p7 i{left:-31px;top:350px}</style><div class="flow" id="flow">${stepHtml}</div>`);
  await capture(
    flowPage.locator('#flow'),
    path.join(outputDir, '00-product-flow.png'),
    screenshots,
    '00-product-flow',
    '产品流程'
  );

  screenshots.sort((left, right) => left.name.localeCompare(right.name));
  assert.equal(screenshots.length, 28, 'Expected exactly 28 PRD screenshots');
  for (const item of screenshots) {
    assert(item.width > 300 && item.height > 300, `${item.name} dimensions are too small`);
  }
  for (const tracked of [c, rechargeCheck, identityCheck, taskFlow, submissionCheck, b]) {
    assert.deepEqual(tracked.externalRequests, [], 'Current demo made external requests');
    assert.deepEqual(tracked.pageErrors, [], 'Current demo emitted page errors');
    assert.deepEqual(tracked.consoleErrors, [], 'Current demo emitted console errors');
  }

  const verification = {
    status: 'pass',
    checkedAt: new Date().toISOString(),
    contract: {
      totalBefore: 3650,
      redeemableBefore: 2650,
      rechargeExcluded: 1000,
      totalAfterJd20: 1650,
      redeemableAfterJd20: 650,
      rechargeAfterJd20: 1000,
      physicalCardOrLogistics: false,
      mallTitle: '兑换商城',
      dailyTaskLimit: 10,
      taskBudgetMin: 5000,
      taskBudgetMax: 10000000,
      rewardFormula: 'min(likes * coinPerLike, perSubmissionCap)',
      submissionReserve: 'perSubmissionCap',
      taskReview: 'machine-auto-publish',
      settlement: 'manual-confirm-system-calculated',
      rolloutPercents: [20, 50, 100],
      rolloutBucket: 'stable-subject',
      existingFulfillmentProtected: true,
      publishRealNameGate: 'entry-and-submit',
      redeemRealNameGate: 'entry-and-confirm',
      identitySuccessAutoAction: false,
      globalAlertThreshold: 3,
      alertScope: 'per-sku',
      repeatHours: 24,
      webhookRequestsSent: 0
    },
    sources: {
      pageRecipe: 'X-03',
      figma: 'figma-03:88688-6274',
      screenBaselines: ['screen-30', 'screen-15'],
      components: [
        { id: 'C-SHELL-P', status: 'measured' },
        { id: 'C-TOPBAR', status: 'derived' },
        { id: 'C-TAB', status: 'measured' },
        { id: 'C-DIALOG', status: 'derived' }
      ],
      conflict: {
        id: 'CR-PUB-001',
        adopted: '保留现有发行人 Demo 骨架，以 figma-03 补足任务商城和高风险兑换状态',
        rejected: '从空白画布重做全页或扩展实体卡物流流程',
        confidence: 'high'
      }
    },
    geometry: {
      baselineTopbar,
      currentTopbar,
      maxErrorPx: Math.max(
        Math.abs(baselineTopbar.width - currentTopbar.width),
        Math.abs(baselineTopbar.height - currentTopbar.height)
      )
    },
    screenshots,
    componentEvidence,
    visualComparison: {
      status: 'pending',
      note: '新增兑换页没有同版本实机原稿；钱包为预期改版，不应以像素相似度判定为旧页回归。后续由专用脚本生成原图、叠加、绝对差异、热图和严格指标。'
    },
    environment: {
      browser: executablePath,
      offline: true,
      externalRequests: 0,
      pageErrors: 0,
      consoleErrors: 0
    }
  };
  fs.writeFileSync(evidencePath, `${JSON.stringify(verification, null, 2)}\n`, 'utf8');
  console.log('PASS: publisher plan V2 UI, 28 screenshots captured');
} finally {
  for (const context of pagesToClose) await context.close().catch(() => {});
  await browser.close();
}

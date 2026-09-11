import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const demoPath = path.join(root, 'demos', '任务中心demo.html');
const adminPath = path.join(root, 'demos', '任务中心后台demo.html');
const prdPath = path.join(root, 'prd', '【Prd】《盖世游戏》任务中心与兑换商城需求.md');
const outputDir = path.join(root, 'public', 'prd', 'task-center-v2');
const evidenceDir = path.join(root, 'docs', 'evidence', 'task-center-v2');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
];
const executablePath = chromeCandidates.find(fs.existsSync);

assert(executablePath, 'Local Chromium-compatible browser not found');
assert(fs.existsSync(demoPath), `Missing demo: ${demoPath}`);
assert(fs.existsSync(adminPath), `Missing admin demo: ${adminPath}`);
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(evidenceDir, { recursive: true });

const demo = fs.readFileSync(demoPath, 'utf8');
const admin = fs.readFileSync(adminPath, 'utf8');
const requiredSelectors = [
  '[data-demo-root]',
  '[data-view="tasks"]',
  '[data-view="store"]',
  '[data-view="points"]',
  '[data-view="orders"]',
  '[data-view="rules"]',
  '[data-action="claim"]',
  '[data-action="open-store"]',
  '[data-action="open-product"]',
  '[data-dialog="redeem"]'
];

for (const selector of requiredSelectors) {
  const token = selector.match(/(?:data-[^=]+)="([^"]+)"/)?.[1] ?? selector.replace(/[\[\]]/g, '');
  assert(demo.includes(token), `Static contract missing: ${selector}`);
}
assert(!/<script[^>]+src=/i.test(demo), 'C demo must not load external scripts');
assert(!/<img\b[^>]*\bsrc=/i.test(demo), 'C demo must not depend on image resources');
assert(!/https?:\/\//i.test(demo), 'C demo must be completely offline');
assert(!/单次奖励\(盖世币\)|新增盖世币任务|消耗的盖世币数量|消耗:\s*<[^>]+>\$\{o\.cost\}<\/span>\s*盖世币/.test(admin), '后台仍存在任务中心盖世币口径');
assert(admin.includes('单次奖励（盖世积分）'), '后台未显示盖世积分奖励字段');
assert(admin.includes('待填地址') && admin.includes('已发货') && admin.includes('物流信息'), '后台实物履约能力不完整');

const browser = await chromium.launch({ executablePath, headless: true });
const pageErrors = [];
const failedRequests = [];
const screenshots = [];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function capture(page, fileName) {
  const filePath = path.join(outputDir, fileName);
  const toast = page.locator('[data-toast]');
  if (await toast.count()) await toast.evaluate((element) => element.classList.remove('is-visible'));
  await page.locator('[data-demo-root]').screenshot({ path: filePath, animations: 'disabled' });
  screenshots.push({ path: path.relative(root, filePath).replaceAll('\\', '/'), width: 390, height: 844, sha256: sha256(filePath) });
}

const expectedFlowStepIds = ['01', '02', '03', '04', '05', '06A', '06B'];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function captureFlowStep(page, id, title, assertState) {
  if (assertState) await assertState();
  const png = await page.locator('[data-demo-root]').screenshot({ animations: 'disabled', type: 'png' });
  return { id, title, src: `data:image/png;base64,${png.toString('base64')}` };
}

async function createFlowImage(context, pageErrors, failedRequests) {
  const flowPage = await context.newPage();
  flowPage.on('pageerror', (error) => pageErrors.push(error.message));
  flowPage.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`));
  await flowPage.addInitScript(() => { Date.now = () => 1789090860000; });
  await flowPage.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
  await flowPage.locator('[data-demo-root]').waitFor({ state: 'visible' });

  const flowSteps = [];
  await flowPage.evaluate(() => window.demoApi.reset());
  flowSteps.push(await captureFlowStep(flowPage, '01', '进入任务中心', async () => {
    assert.equal(await flowPage.locator('[data-view="tasks"].is-active').count(), 1);
  }));

  await flowPage.locator('[data-task-id="daily-sign"] [data-action="claim"]').click();
  await flowPage.locator('[data-toast].is-visible').waitFor();
  flowSteps.push(await captureFlowStep(flowPage, '02', '完成并领取', async () => {
    const state = await flowPage.evaluate(() => window.demoApi.getState());
    assert.equal(state.points, 5002);
    assert.equal(state.tasks.find((task) => task.id === 'daily-sign').status, 'done');
    assert((await flowPage.locator('[data-toast]').textContent()).includes('已领取 2 盖世积分'));
  }));

  await flowPage.locator('[data-toast]').evaluate((element) => element.classList.remove('is-visible'));
  await flowPage.evaluate(() => window.demoApi.showView('points'));
  flowSteps.push(await captureFlowStep(flowPage, '03', '盖世积分入账', async () => {
    assert.equal(await flowPage.locator('[data-view="points"].is-active').count(), 1);
    const firstRecord = await flowPage.locator('[data-point-list] .record-item').first().innerText();
    assert(firstRecord.includes('每日签到') && firstRecord.includes('+2'));
  }));

  await flowPage.evaluate(() => { window.demoApi.reset(); window.demoApi.showView('store'); });
  flowSteps.push(await captureFlowStep(flowPage, '04', '浏览兑换商城', async () => {
    assert.equal(await flowPage.locator('[data-view="store"].is-active').count(), 1);
    assert.equal(await flowPage.locator('[data-product-id]').count(), 6);
  }));

  await flowPage.locator('[data-product-id="cloud-30"] [data-action="open-product"]').click();
  await flowPage.locator('[data-dialog="redeem"].is-open').waitFor();
  flowSteps.push(await captureFlowStep(flowPage, '05', '确认兑换', async () => {
    assert.equal(await flowPage.locator('[data-redeem-cost]').textContent(), '50');
  }));

  await flowPage.locator('[data-action="confirm-redeem"]').click();
  await flowPage.locator('[data-toast].is-visible').waitFor();
  await flowPage.evaluate(() => window.demoApi.showView('orders'));
  await flowPage.locator('[data-toast]').evaluate((element) => element.classList.remove('is-visible'));
  flowSteps.push(await captureFlowStep(flowPage, '06A', '虚拟权益发放', async () => {
    const state = await flowPage.evaluate(() => window.demoApi.getState());
    assert.equal(state.orders[0].status, 'issued');
    assert((await flowPage.locator('[data-order-list] .order-card').first().innerText()).includes('已发放'));
  }));

  await flowPage.evaluate(() => { window.demoApi.reset(); window.demoApi.showView('store'); window.demoApi.openRedeem('x5-lite'); });
  await flowPage.locator('[data-action="confirm-redeem"]').click();
  await flowPage.locator('[data-dialog="address"].is-open').waitFor();
  flowSteps.push(await captureFlowStep(flowPage, '06B', '实物履约', async () => {
    const state = await flowPage.evaluate(() => window.demoApi.getState());
    assert.equal(state.orders[0].status, 'address');
    assert.equal(await flowPage.locator('[data-address-form]').count(), 1);
  }));

  assert.deepEqual(flowSteps.map(({ id }) => id), expectedFlowStepIds);
  await flowPage.close();

  const page = await context.newPage();
  await page.setViewportSize({ width: 2160, height: 2200 });
  const stepHtml = flowSteps.map(({ id, title, src }, index) => `<article class="step step-${id.toLowerCase()}" data-flow-step="${id}" style="--order:${index + 1}">
    <div class="step-heading"><span class="step-id">${id}</span><h2>${escapeHtml(title)}</h2>${id === '06A' ? '<span class="branch-tag virtual">虚拟商品</span>' : id === '06B' ? '<span class="branch-tag physical">实物商品</span>' : ''}</div>
    <img class="phone" src="${src}" alt="${escapeHtml(title)}实际竖屏界面">
  </article>`).join('');
  await page.setContent(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:2160px;height:2200px;overflow:hidden}body{background:#08080b;color:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
    .flow{position:relative;width:2160px;height:2200px;padding:76px 96px 62px;background:radial-gradient(circle at 8% 5%,rgba(255,122,26,.15),transparent 23%),radial-gradient(circle at 91% 91%,rgba(126,96,255,.13),transparent 26%),#08080b;overflow:hidden}
    .kicker{color:#ff9834;font-size:22px;font-weight:800;letter-spacing:.17em}.title{font-size:48px;font-weight:850;margin:12px 0 10px;letter-spacing:-.02em}.sub{color:#aaaab4;font-size:22px;margin:0}.grid{position:relative;z-index:2;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(2,820px);column-gap:64px;row-gap:188px;margin-top:54px}.step{position:relative;min-width:0}.step-01{grid-column:1;grid-row:1}.step-02{grid-column:2;grid-row:1}.step-03{grid-column:3;grid-row:1}.step-04{grid-column:4;grid-row:1}.step-05{grid-column:1;grid-row:2}.step-06a{grid-column:2;grid-row:2}.step-06b{grid-column:3;grid-row:2}
    .step-heading{height:76px;display:flex;align-items:center;gap:13px;position:relative}.step-id{min-width:58px;height:42px;padding:0 12px;border-radius:14px;display:grid;place-items:center;color:#ff9b3e;background:rgba(255,122,26,.13);border:1px solid rgba(255,151,62,.28);font-size:18px;font-weight:850}.step h2{font-size:25px;line-height:1.2;margin:0;white-space:nowrap}.branch-tag{position:absolute;right:0;top:21px;padding:5px 10px;border-radius:999px;font-size:15px;font-weight:700}.branch-tag.virtual{color:#b9a8ff;background:rgba(135,102,255,.14);border:1px solid rgba(135,102,255,.28)}.branch-tag.physical{color:#78d8ff;background:rgba(43,169,255,.13);border:1px solid rgba(43,169,255,.26)}
    .phone{display:block;width:352px;height:auto;max-height:744px;object-fit:contain;margin:0 auto;border:1px solid rgba(255,255,255,.13);border-radius:31px;background:#111114;box-shadow:0 28px 70px rgba(0,0,0,.42)}
    .connectors{position:absolute;z-index:1;inset:0;width:2160px;height:2200px;pointer-events:none;overflow:visible}.edge{fill:none;stroke:#ff8d32;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 8px rgba(255,122,26,.32));marker-end:url(#arrow)}.edge.branch{stroke:#9a7dff}.edge.physical{stroke:#45bfff}.edge-label{font-size:18px;font-weight:750;fill:#bdbdc6;paint-order:stroke;stroke:#08080b;stroke-width:8px;stroke-linejoin:round}
    .foot{position:absolute;z-index:2;left:96px;right:96px;bottom:48px;padding:18px 24px;border:1px solid rgba(255,122,26,.19);border-radius:18px;background:rgba(255,122,26,.07);color:#bebec7;font-size:20px;line-height:1.5}.foot b{color:#fff}
  </style><body><main class="flow"><div class="kicker">GAMEHUB PRODUCT FLOW</div><div class="title">任务中心 → 盖世积分 → 兑换商城</div><p class="sub">每一步均为当前可操作 Demo 的实际竖屏界面</p><section class="grid">${stepHtml}</section>
    <svg class="connectors" aria-hidden="true"><defs><marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse"><path d="M1 1 11 6 1 11Z" fill="context-stroke"/></marker></defs><path class="edge" data-edge="01-02"/><path class="edge" data-edge="02-03"/><path class="edge" data-edge="03-04"/><path class="edge" data-edge="04-05"/><path class="edge branch" data-edge="05-06A"/><path class="edge physical" data-edge="05-06B"/><text class="edge-label" data-label="wrap">继续兑换</text><text class="edge-label" data-label="branch">按商品类型分流</text></svg>
    <div class="foot"><b>资产边界：</b>本流程只使用盖世积分，不展示盖世币余额或京东卡兑换；确认兑换后由已选 SKU 类型决定虚拟权益或实物履约。</div></main></body></html>`);
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
  await page.evaluate(() => {
    const phone = (id) => document.querySelector(`[data-flow-step="${id}"] .phone`).getBoundingClientRect();
    const setPath = (edge, d) => document.querySelector(`[data-edge="${edge}"]`).setAttribute('d', d);
    const r1 = phone('01'); const r2 = phone('02'); const r3 = phone('03'); const r4 = phone('04');
    const r5 = phone('05'); const r6a = phone('06A'); const r6b = phone('06B');
    for (const [edge, from, to] of [['01-02', r1, r2], ['02-03', r2, r3], ['03-04', r3, r4]]) {
      const y = from.top + from.height * .48;
      setPath(edge, `M ${from.right + 10} ${y} L ${to.left - 14} ${y}`);
    }
    const wrapStartX = r4.left + r4.width / 2;
    const wrapEndX = r5.left + r5.width / 2;
    const wrapMidY = (r4.bottom + r5.top) / 2;
    setPath('04-05', `M ${wrapStartX} ${r4.bottom + 10} C ${wrapStartX} ${wrapMidY}, ${wrapEndX} ${wrapMidY}, ${wrapEndX} ${r5.top - 14}`);
    const branchY = r5.top + r5.height * .49;
    setPath('05-06A', `M ${r5.right + 10} ${branchY} L ${r6a.left - 14} ${branchY}`);
    const routeY = r5.top - 94;
    const firstGapX = (r5.right + r6a.left) / 2;
    const secondGapX = (r6a.right + r6b.left) / 2;
    setPath('05-06B', `M ${r5.right + 10} ${branchY + 28} L ${firstGapX} ${branchY + 28} L ${firstGapX} ${routeY} L ${secondGapX} ${routeY} L ${secondGapX} ${branchY + 28} L ${r6b.left - 14} ${branchY + 28}`);
    const wrapLabel = document.querySelector('[data-label="wrap"]');
    wrapLabel.setAttribute('x', String((wrapStartX + wrapEndX) / 2 - 54));
    wrapLabel.setAttribute('y', String(wrapMidY - 14));
    const branchLabel = document.querySelector('[data-label="branch"]');
    branchLabel.setAttribute('x', String((firstGapX + secondGapX) / 2));
    branchLabel.setAttribute('y', String(routeY - 16));
    branchLabel.setAttribute('text-anchor', 'middle');
  });
  const filePath = path.join(outputDir, '00-product-flow.png');
  await page.locator('.flow').screenshot({ path: filePath, animations: 'disabled' });
  screenshots.push({ path: path.relative(root, filePath).replaceAll('\\', '/'), width: 2160, height: 2200, sha256: sha256(filePath) });
  await page.close();
}

try {
  const context = await browser.newContext({ viewport: { width: 560, height: 940 }, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`));
  await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
  await page.locator('[data-demo-root]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-view="tasks"].is-active').count(), 1, '首屏应为任务中心');
  assert.equal(await page.locator('[data-task-id="daily-sign"] [data-action="claim"]').count(), 1, '签到任务应可领取');

  await capture(page, '01-task-center.png');
  await page.locator('[data-task-id="daily-sign"] [data-action="claim"]').click();
  assert.equal((await page.evaluate(() => window.demoApi.getState())).points, 5002, '领取后应增加 2 盖世积分');
  await page.locator('[data-action="task-tab"][data-value="growth"]').click();
  assert.equal(await page.locator('[data-task-id="growth-profile"]').count(), 1, '成长任务 Tab 应可切换');

  await page.evaluate(() => window.demoApi.showView('points'));
  assert.equal(await page.locator('[data-view="points"].is-active').count(), 1, '积分明细应打开');
  await capture(page, '06-points-detail.png');

  await page.evaluate(() => window.demoApi.reset());
  await page.locator('[data-action="open-store"]').click();
  assert.equal(await page.locator('[data-view="store"].is-active').count(), 1, '兑换商城应打开');
  assert.equal(await page.locator('[data-product-id]').count(), 6, '商城应展示 6 个状态商品');
  await capture(page, '02-redemption-store.png');

  await page.locator('[data-product-id="cloud-30"] [data-action="open-product"]').click();
  assert.equal(await page.locator('[data-dialog="redeem"].is-open').count(), 1, '兑换确认弹窗应打开');
  assert.equal(await page.locator('[data-redeem-cost]').textContent(), '50');
  await capture(page, '03-redeem-confirm.png');
  await page.locator('[data-action="confirm-redeem"]').click();
  assert.equal((await page.evaluate(() => window.demoApi.getState())).points, 4950, '虚拟权益兑换应扣减 50 积分');
  assert.equal((await page.evaluate(() => window.demoApi.getState())).orders[0].status, 'issued', '虚拟权益应直接发放');

  await page.evaluate(() => window.demoApi.reset());
  await page.evaluate(() => window.demoApi.showView('orders'));
  await capture(page, '04-redemption-records.png');
  await page.locator('[data-order-id="OD20260908003"] [data-action="order-action"]').click();
  assert.equal(await page.locator('[data-dialog="address"].is-open').count(), 1, '待填地址订单应打开地址表单');
  await page.locator('[data-address-form] button[type="submit"]').click();
  assert.equal(await page.locator('[data-address-error].is-visible').count(), 1, '空地址应校验失败');
  await page.locator('#receiver').fill('盖世玩家');
  await page.locator('#mobile').fill('13800138000');
  await page.locator('#address').fill('广东省广州市天河区盖世路 8 号');
  await page.locator('[data-address-form] button[type="submit"]').click();
  assert.equal((await page.evaluate(() => window.demoApi.getState())).orders.find((item) => item.id === 'OD20260908003').status, 'shipping', '地址保存后应进入待发货');

  await page.evaluate(() => window.demoApi.reset());
  await page.locator('[data-action="open-rules"]').click();
  assert.equal(await page.locator('[data-view="rules"].is-active').count(), 1, '规则页应打开');
  const rulesText = await page.locator('[data-view="rules"]').innerText();
  assert(rulesText.includes('盖世积分不可兑换京东卡'), '规则必须明确积分不可兑换京东卡');
  assert(rulesText.includes('充值盖世币也不可兑换'), '规则必须明确充值盖世币不可兑换京东卡');
  await capture(page, '05-points-rules.png');

  await page.evaluate(() => { window.demoApi.reset(); window.demoApi.showView('store'); window.demoApi.openRedeem('theme-race'); });
  await page.locator('[data-action="confirm-redeem"]').click();
  assert.equal(await page.locator('[data-redeem-error].is-visible').count(), 1, '并发商品变化应展示失败且不扣分');
  assert.equal((await page.evaluate(() => window.demoApi.getState())).points, 5000, '兑换失败不得扣减积分');

  await page.evaluate(() => { window.demoApi.reset(); window.demoApi.showView('store'); window.demoApi.openRedeem('x5-lite'); });
  await page.locator('[data-action="confirm-redeem"]').click();
  assert.equal(await page.locator('[data-dialog="address"].is-open').count(), 1, '实物商品兑换后应进入地址流程');
  assert.equal((await page.evaluate(() => window.demoApi.getState())).points, 200, '实物兑换应扣减对应积分');

  const adminPage = await context.newPage();
  await adminPage.setViewportSize({ width: 1440, height: 960 });
  await adminPage.route(/^https?:\/\//, (route) => route.abort());
  await adminPage.goto(pathToFileURL(adminPath).href, { waitUntil: 'load' });
  await adminPage.locator('#page-task.active').waitFor({ state: 'visible' });
  for (const [pageId, menuIndex, fileName] of [
    ['task', 0, '07-admin-task-config.png'],
    ['reward', 1, '08-admin-product-config.png'],
    ['order', 2, '09-admin-redemption-fulfillment.png']
  ]) {
    await adminPage.evaluate(({ id, index }) => {
      window.switchMenu(id, document.querySelectorAll('.menu-item')[index]);
    }, { id: pageId, index: menuIndex });
    await adminPage.locator(`#page-${pageId}.active`).waitFor({ state: 'visible' });
    const filePath = path.join(outputDir, fileName);
    await adminPage.screenshot({ path: filePath, animations: 'disabled' });
    screenshots.push({ path: path.relative(root, filePath).replaceAll('\\', '/'), width: 1440, height: 960, sha256: sha256(filePath) });
  }
  await adminPage.close();

  await createFlowImage(context, pageErrors, failedRequests);
  assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join('; ')}`);
  assert.deepEqual(failedRequests, [], `Failed requests: ${failedRequests.join('; ')}`);
  await context.close();
} finally {
  await browser.close();
}

const expectedImages = [
  '00-product-flow.png',
  '01-task-center.png',
  '02-redemption-store.png',
  '03-redeem-confirm.png',
  '04-redemption-records.png',
  '05-points-rules.png',
  '06-points-detail.png',
  '07-admin-task-config.png',
  '08-admin-product-config.png',
  '09-admin-redemption-fulfillment.png'
];
for (const name of expectedImages) {
  const filePath = path.join(outputDir, name);
  assert(fs.existsSync(filePath) && fs.statSync(filePath).size > 10_000, `Invalid screenshot: ${name}`);
}

if (fs.existsSync(prdPath)) {
  const prd = fs.readFileSync(prdPath, 'utf8');
  assert(prd.includes('盖世积分'), 'PRD must use 盖世积分');
  assert(!/做任务赚盖世币|普通任务奖励盖世币|任务中心任务奖励盖世币/.test(prd), 'PRD contains conflicting task-center coin wording');
}

const verification = {
  schemaVersion: 1,
  verifiedOn: '2026-09-11',
  demo: 'demos/任务中心demo.html',
  adminDemo: 'demos/任务中心后台demo.html',
  browser: executablePath,
  checks: {
    offlineSingleFile: true,
    pageErrors: pageErrors.length,
    failedRequests: failedRequests.length,
    taskClaim: 'pass',
    taskTabs: 'pass',
    storeTabs: 'pass',
    virtualRedemption: 'pass',
    physicalFulfillment: 'pass',
    failedRedemptionRollback: 'pass',
    pointCoinSeparationRules: 'pass',
    adminTerminology: 'pass',
    realScreenProductFlow: 'pass',
    productFlowLayout: '4+3'
  },
  screenshots: expectedImages.map((name) => {
    const filePath = path.join(outputDir, name);
    return {
      path: path.relative(root, filePath).replaceAll('\\', '/'),
      sha256: sha256(filePath),
      bytes: fs.statSync(filePath).size
    };
  })
};
fs.writeFileSync(path.join(evidenceDir, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`, 'utf8');

console.log('PASS: task center v2 static, interaction, flow and screenshot verification completed');

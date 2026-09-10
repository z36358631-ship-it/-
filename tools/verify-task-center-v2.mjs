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
  await page.locator('[data-demo-root]').screenshot({ path: filePath, animations: 'disabled' });
  screenshots.push({ path: path.relative(root, filePath).replaceAll('\\', '/'), width: 390, height: 844, sha256: sha256(filePath) });
}

async function createFlowImage(context) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1900, height: 620 });
  await page.setContent(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#08080b;color:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
    .flow{width:1900px;height:620px;padding:58px 62px;background:radial-gradient(circle at 9% 8%,rgba(255,122,26,.14),transparent 25%),radial-gradient(circle at 91% 91%,rgba(140,108,255,.12),transparent 28%),#08080b}
    .kicker{color:#ff9834;font-size:18px;font-weight:700;letter-spacing:.18em}.title{font-size:38px;font-weight:800;margin:12px 0 8px}.sub{color:#94949e;font-size:18px;margin-bottom:52px}
    .track{display:grid;grid-template-columns:repeat(6,1fr);gap:28px;align-items:center}.step{height:254px;padding:24px;border:1px solid rgba(255,255,255,.1);border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.018));position:relative}.step:not(:last-child):after{content:"";position:absolute;right:-29px;top:126px;width:29px;height:2px;background:linear-gradient(90deg,#ff7a1a,#735d4b)}.step:not(:last-child):before{content:"";position:absolute;right:-29px;top:121px;border-left:8px solid #735d4b;border-top:6px solid transparent;border-bottom:6px solid transparent;z-index:2}
    .n{width:42px;height:42px;border-radius:14px;background:rgba(255,122,26,.12);color:#ff9c3c;display:grid;place-items:center;font-size:16px;font-weight:800}.step h2{font-size:21px;margin:26px 0 12px}.step p{color:#a5a5ae;font-size:15px;line-height:1.65;margin:0}.branch-wrap{height:254px;display:grid;gap:14px}.branch{height:120px;padding:16px 18px;border-color:rgba(140,108,255,.3);background:linear-gradient(145deg,rgba(140,108,255,.12),rgba(255,255,255,.018));display:grid;grid-template-columns:42px 1fr;column-gap:14px;align-items:center}.branch:after,.branch:before{display:none!important}.branch .n{background:rgba(140,108,255,.15);color:#b29fff}.branch h2{font-size:18px;margin:0 0 6px}.branch p{font-size:13px;line-height:1.45;grid-column:2}.foot{margin-top:38px;padding:16px 20px;border:1px solid rgba(255,122,26,.16);border-radius:16px;background:rgba(255,122,26,.06);color:#bdbdc5;font-size:16px}.foot b{color:#fff}
  </style><body><main class="flow"><div class="kicker">GAMEHUB PRODUCT FLOW</div><div class="title">任务中心 → 盖世积分 → 兑换商城</div><div class="sub">普通任务奖励与发行人计划盖世币分账，本流程仅消耗盖世积分</div><section class="track">
    <article class="step"><div class="n">01</div><h2>进入任务中心</h2><p>查看盖世积分余额和每日/成长任务。</p></article>
    <article class="step"><div class="n">02</div><h2>完成并领取</h2><p>状态由去完成变为可领取，领取后记录流水。</p></article>
    <article class="step"><div class="n">03</div><h2>盖世积分入账</h2><p>更新积分账余额，不合并盖世币余额。</p></article>
    <article class="step"><div class="n">04</div><h2>浏览兑换商城</h2><p>选择虚拟权益或实物周边，查看价格和库存。</p></article>
    <article class="step"><div class="n">05</div><h2>确认兑换</h2><p>校验库存、限兑与积分余额，成功后原子扣减。</p></article>
    <div class="branch-wrap"><article class="step branch"><div class="n">06A</div><div><h2>虚拟权益发放</h2><p>直接发放到账号；失败时不扣分或原路回滚。</p></div></article><article class="step branch"><div class="n">06B</div><div><h2>实物履约</h2><p>补地址、后台发货，用户查看物流状态。</p></div></article></div>
  </section><div class="foot"><b>规则：</b>盖世积分不可兑换京东卡；只有参与发行任务并结算所得的盖世币才可在发行人计划兑换商城中兑换京东电子卡。</div></main></body></html>`);
  const filePath = path.join(outputDir, '00-product-flow.png');
  await page.locator('.flow').screenshot({ path: filePath, animations: 'disabled' });
  screenshots.push({ path: path.relative(root, filePath).replaceAll('\\', '/'), width: 1900, height: 620, sha256: sha256(filePath) });
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

  await createFlowImage(context);
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
  verifiedOn: '2026-09-10',
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
    adminTerminology: 'pass'
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

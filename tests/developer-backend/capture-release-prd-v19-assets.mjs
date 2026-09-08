import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const root = process.cwd();
const output = path.join(root, 'public', 'prd', 'genuine-game-distribution-phase1', 'developer-backend-final', '03');
const developerDemo = path.join(root, 'demos', '开发者后台一期', '02-CDKEY商品与供给demo.html');
const adminDemo = path.join(root, 'demos', '开发者后台一期', '09-发行审核后台demo.html');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

if (!chrome) throw new Error('Chrome or Edge not found');
for (const file of [developerDemo, adminDemo]) {
  if (!fs.existsSync(file)) throw new Error(`Missing required demo: ${file}`);
}
fs.mkdirSync(output, { recursive: true });

const toDemoUrl = (file, hash) => {
  const url = pathToFileURL(file);
  url.hash = hash;
  return url.href;
};

const screenshots = new Map();
async function capture(page, name, source, options = {}) {
  const target = path.join(output, name);
  await page.waitForTimeout(180);
  await page.screenshot({ path: target, ...options });
  const size = fs.statSync(target).size;
  if (size <= 0) throw new Error(`Empty screenshot: ${name}`);
  screenshots.set(name, { path: target, source });
}

async function clickReleaseLocator(page, key) {
  await page.locator(`[data-release-locator="${key}"]`).click();
  await page.locator(`[data-release-anchor="${key}"]`).waitFor();
  await page.waitForTimeout(260);
}

async function enterGame(page, title) {
  const game = page.locator('.publisher-game-item').filter({ hasText: title }).first().locator('[data-portal-action="enter-publisher-game"]');
  if (!await game.count()) throw new Error(`Game not found in current 02 demo: ${title}`);
  await game.click();
  await page.locator('[data-publisher-game-console]').waitFor();
  await page.locator('[data-publisher-profile][data-profile-module="release-workspace"]').waitFor();
}

async function captureDeveloper(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(toDemoUrl(developerDemo, '/P02-01'), { waitUntil: 'load' });
  await page.locator('[data-publisher-page="games"]').waitFor();

  await capture(page, '03-v19-dev-game-management.png', '02-CDKEY商品与供给demo.html#/P02-01 · 游戏管理', { fullPage: true });

  await page.getByRole('button', { name: '添加游戏', exact: true }).click();
  await page.locator('[data-publisher-create]').waitFor();
  await capture(page, '03-v19-dev-create-game.png', '02-CDKEY商品与供给demo.html#/P02-01 · 添加游戏', { fullPage: true });

  await page.locator('[data-create-close]').last().click();
  await page.locator('[data-publisher-page="games"]').waitFor();
  await enterGame(page, '暮光边境');
  await capture(page, '03-v19-dev-version-release.png', '02-CDKEY商品与供给demo.html#/P02-01 · 版本发布', { fullPage: true });

  await clickReleaseLocator(page, 'builds');
  await page.locator('[data-profile-builds]').waitFor();
  await capture(page, '03-v19-dev-builds.png', '02-CDKEY商品与供给demo.html#/P02-01 · PC 包体');

  const localUpload = page.locator('[data-build-local-open]');
  if (!await localUpload.isEnabled()) throw new Error('Current 02 demo build upload is unexpectedly disabled');
  await localUpload.click();
  await page.locator('[data-build-modal-backdrop]').waitFor();
  await capture(page, '03-v19-dev-build-upload.png', '02-CDKEY商品与供给demo.html#/P02-01 · 从本地上传包体');
  await page.locator('[data-build-upload-close]').last().click();

  await clickReleaseLocator(page, 'catalog');
  await page.locator('[data-profile-catalog]').waitFor();
  await capture(page, '03-v19-dev-product-sku.png', '02-CDKEY商品与供给demo.html#/P02-01 · 商品与 SKU');

  await clickReleaseLocator(page, 'release');
  await page.locator('[data-release-regions]').waitFor();
  await capture(page, '03-v19-dev-release-settings.png', '02-CDKEY商品与供给demo.html#/P02-01 · 发行设置');

  await clickReleaseLocator(page, 'qualification');
  await page.locator('[data-qualification-profile]').waitFor();
  await capture(page, '03-v19-dev-release-qualification.png', '02-CDKEY商品与供给demo.html#/P02-01 · 版本发布内资质认证');

  await page.locator('[data-portal-action="game-console-section"][data-game-section="qualifications"]').click();
  await page.locator('[data-publisher-profile][data-profile-module="qualifications"]').waitFor();
  await capture(page, '03-v19-dev-independent-qualification.png', '02-CDKEY商品与供给demo.html#/P02-01 · 独立资质认证');

  await page.locator('[data-portal-action="back-publisher-games"]').click();
  await page.locator('[data-publisher-page="games"]').waitFor();
  await enterGame(page, '星海远征');
  await page.locator('[data-portal-action="game-console-section"][data-game-section="versions"]').click();
  await page.locator('[data-publisher-profile][data-profile-module="versions"]').waitFor();
  const versionRecords = page.locator('[data-version-record]');
  await capture(page, '03-v19-dev-version-records.png', '02-CDKEY商品与供给demo.html#/P02-01 · 发布记录', { fullPage: true });
  if (await versionRecords.count()) {
    await versionRecords.first().locator('[data-version-open]').click();
    await page.locator('[data-version-snapshot]').waitFor();
    await capture(page, '03-v19-dev-version-snapshot.png', '02-CDKEY商品与供给demo.html#/P02-01 · 发布记录快照', { fullPage: true });
  } else {
    throw new Error('Current 02 demo does not expose a version snapshot');
  }

  await context.close();
}

async function openAdminDrawer(page, route) {
  await page.goto(toDemoUrl(adminDemo, route), { waitUntil: 'load' });
  await page.locator('tbody tr [data-open]').first().click();
  const drawer = page.locator('#modalRoot .drawer');
  await drawer.waitFor();
  return drawer;
}

async function openAdminTab(page, label) {
  const drawer = page.locator('#modalRoot .drawer');
  await drawer.locator('[data-detail-tab]').filter({ hasText: label }).first().click();
  await drawer.waitFor();
  await page.waitForTimeout(180);
  return drawer;
}

async function captureAdmin(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(toDemoUrl(adminDemo, '/management/release'), { waitUntil: 'load' });
  await page.locator('tbody tr').first().waitFor();
  await capture(page, '03-v19-admin-release-list.png', '09-发行审核后台demo.html#/management/release · 游戏发布审核', { fullPage: true });

  let drawer = await openAdminDrawer(page, '/management/release');
  await capture(page, '03-v19-admin-release-drawer.png', '09-发行审核后台demo.html#/management/release · 发布审核详情');

  drawer = await openAdminTab(page, 'PC 包体测试');
  await capture(page, '03-v19-admin-package-blocked.png', '09-发行审核后台demo.html#/management/release · 包体测试未完成');

  const packageCards = drawer.locator('.package-item:not(.is-superseded)[data-package-id]').filter({ hasText: '必测' });
  const packageIds = await packageCards.evaluateAll(cards => cards.map(card => card.getAttribute('data-package-id')));
  for (const packageId of packageIds) {
    let card = page.locator(`#modalRoot .drawer .package-item[data-package-id="${packageId}"]`);
    if (/已通过|测试通过/.test(await card.innerText())) continue;
    const start = card.getByRole('button', { name: '开始测试', exact: true });
    if (await start.count()) await start.click();
    card = page.locator(`#modalRoot .drawer .package-item[data-package-id="${packageId}"]`);
    const pass = card.getByRole('button', { name: '标记通过', exact: true });
    if (!await pass.count()) throw new Error(`Cannot pass current required package: ${packageId}`);
    await pass.click();
  }

  drawer = page.locator('#modalRoot .drawer');
  const packageReviewPass = drawer.locator('[data-package-review-pass]');
  if (!await packageReviewPass.isEnabled()) throw new Error('Package review gate did not unlock after all required builds passed');
  await capture(page, '03-v19-admin-package-ready.png', '09-发行审核后台demo.html#/management/release · 待提交包体测试结论');

  await packageReviewPass.click();
  const confirm = page.locator('#modalRoot .modal:not(.drawer) [data-package-review-confirm]');
  await confirm.waitFor();
  await confirm.click();
  drawer = page.locator('#modalRoot .drawer');
  await drawer.locator('[data-action="approve"]').waitFor();
  await capture(page, '03-v19-admin-package-passed.png', '09-发行审核后台demo.html#/management/release · 包体测试通过并解锁发布审核');

  await page.locator('#modalRoot .drawer header [data-modal-close]').click();
  await page.goto(toDemoUrl(adminDemo, '/management/qualification'), { waitUntil: 'load' });
  await page.locator('tbody tr').first().waitFor();
  await capture(page, '03-v19-admin-qualification-list.png', '09-发行审核后台demo.html#/management/qualification · 资质认证审核', { fullPage: true });
  await page.locator('tbody tr [data-open]').first().click();
  await page.locator('#modalRoot .drawer').waitFor();
  await capture(page, '03-v19-admin-qualification-drawer.png', '09-发行审核后台demo.html#/management/qualification · 资质认证审核详情');

  await page.locator('#modalRoot .drawer header [data-modal-close]').click();
  await page.goto(toDemoUrl(adminDemo, '/records'), { waitUntil: 'load' });
  await page.locator('.audit-table tbody tr').first().waitFor();
  await capture(page, '03-v19-admin-audit-records.png', '09-发行审核后台demo.html#/records · 审核记录', { fullPage: true });

  await context.close();
}

function imageData(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

async function buildComposite(browser, name, title, items) {
  const panels = items.map(([label, file]) => `<section><h2>${label}</h2><img src="${imageData(path.join(output, file))}" alt="${label}"></section>`).join('');
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;background:#eef3f6;color:#17364a;font-family:"Microsoft YaHei","PingFang SC",sans-serif}body{width:1440px;padding:20px}.title{margin:0 0 14px;font-size:26px}main{display:grid;gap:18px}section{overflow:hidden;border:1px solid #d9e4eb;border-radius:12px;background:#fff;padding:12px;box-shadow:0 4px 14px rgba(29,63,83,.05)}h2{margin:0 0 9px;font-size:18px}img{display:block;width:100%;height:auto;border:1px solid #e2e8ed;border-radius:8px}
  </style></head><body><h1 class="title">${title}</h1><main>${panels}</main></body></html>`;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
  await capture(page, name, `02-CDKEY商品与供给demo.html#/P02-01 · ${title}`, { fullPage: true });
  await page.close();
}

async function buildFlow(browser) {
  const flow = [
    ['1', '游戏管理', '03-v19-dev-game-management.png'],
    ['2', '添加游戏', '03-v19-dev-create-game.png'],
    ['3', '游戏资料', '03-v19-dev-version-release.png'],
    ['4', 'PC 包体', '03-v19-dev-build-upload.png'],
    ['5', '商品与 SKU', '03-v19-dev-product-sku.png'],
    ['6', '发行设置', '03-v19-dev-release-settings.png'],
    ['7', '资质认证', '03-v19-dev-release-qualification.png'],
    ['8', '提交审核', '03-v19-dev-version-release.png'],
    ['9', '进入审核队列', '03-v19-admin-release-list.png'],
    ['10', '包体测试', '03-v19-admin-package-ready.png'],
    ['11', '发布审核', '03-v19-admin-package-passed.png'],
    ['12', '发布记录', '03-v19-dev-version-records.png'],
  ];
  const cards = flow.map(([step, title, file], index) => {
    const src = imageData(path.join(output, file));
    return `${index ? '<span class="arrow">→</span>' : ''}<article><b>${step}</b><img src="${src}" alt="${title}"><strong>${title}</strong></article>`;
  }).join('');
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;background:#f4f7fa;color:#17364a;font-family:"Microsoft YaHei","PingFang SC",sans-serif}body{width:max-content;padding:24px 28px}.title{margin:0 0 16px;font-size:26px}.flow{display:flex;align-items:center;gap:7px}article{width:174px;border:1px solid #d9e4eb;border-radius:10px;background:#fff;padding:9px;box-shadow:0 5px 16px rgba(29,63,83,.06)}article b{display:grid;place-items:center;width:24px;height:24px;margin-bottom:7px;border-radius:50%;background:#e5f7f6;color:#15808e;font-size:12px}article img{display:block;width:154px;height:90px;border:1px solid #e2e8ed;border-radius:6px;object-fit:cover;object-position:top}article strong{display:block;margin-top:8px;font-size:15px}.arrow{color:#2ca5ad;font-size:24px;font-weight:700}
  </style></head><body><h1 class="title">PC 游戏创建与发行审核流程</h1><main class="flow">${cards}</main></body></html>`;
  const page = await browser.newPage({ viewport: { width: 2300, height: 260 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
  await capture(page, '03-v19-release-flow.png', '02-CDKEY商品与供给demo.html + 09-发行审核后台demo.html · 完整流程', { fullPage: true });
  await page.close();
}

const browser = await chromium.launch({
  headless: true,
  executablePath: chrome,
  args: ['--allow-file-access-from-files', '--disable-background-networking'],
});

try {
  await captureDeveloper(browser);
  await captureAdmin(browser);
  await buildComposite(browser, '03-v19-dev-builds-and-sku.png', 'PC 包体与商品 SKU', [
    ['PC 包体', '03-v19-dev-builds.png'],
    ['商品与 SKU', '03-v19-dev-product-sku.png'],
  ]);
  await buildComposite(browser, '03-v19-dev-release-and-qualification.png', '发行设置与资质认证', [
    ['发行设置', '03-v19-dev-release-settings.png'],
    ['资质认证', '03-v19-dev-release-qualification.png'],
  ]);
  await buildFlow(browser);
} finally {
  await browser.close();
}

for (const [name, data] of screenshots) {
  process.stdout.write(`${name}\t${fs.statSync(data.path).size}\t${data.source}\n`);
}

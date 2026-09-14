import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const demoFile = path.join(repoRoot, 'demos', '开发者后台一期', '02-游戏创建与发行demo.html');
const outputDir = path.join(repoRoot, 'public', 'prd', 'publisher-data-dashboard');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

if (!chrome) throw new Error('Chrome or Edge not found');
fs.mkdirSync(outputDir, { recursive:true });

const browser = await chromium.launch({ headless:true, executablePath:chrome, args:['--allow-file-access-from-files','--disable-background-networking'] });
const context = await browser.newContext({ viewport:{ width:1440, height:2200 }, deviceScaleFactor:1 });
const page = await context.newPage();
const url = pathToFileURL(demoFile);
url.hash = '/P02-01';

await page.addInitScript(demoName => {
  if (!decodeURIComponent(location.pathname).endsWith(`/${demoName}`)) return;
  localStorage.clear();
  sessionStorage.clear();
  window.name = '';
  const accountKey = 'publisher-dashboard:capture';
  sessionStorage.setItem('gamehub-developer-session-v2', JSON.stringify({
    version:2,
    authenticated:true,
    accountKey,
    vendorId:'VENDOR-STAR-001',
    activeGameId:'',
    qualificationStatus:'approved',
    expiresAt:Date.now() + 8 * 60 * 60 * 1000,
  }));
  localStorage.setItem('gamehub-developer-account-states-v1', JSON.stringify({
    [accountKey]: {
      registration:{ accountTier:'enterprise', registeredAt:'2026-09-10 10:00', consoleTab:'games' },
      qualification:{ status:'approved', revision:1, step:5, view:'form', form:{}, history:[], submissions:[] },
    },
  }));
}, path.basename(demoFile));
await page.goto(url.href, { waitUntil:'load' });
await page.locator('[data-portal-action="enter-publisher-game"][data-publisher-game="existing"]').first().click();
await page.locator('[data-portal-action="game-console-section"][data-game-section="analytics"]').click();
await page.locator('[data-testid="publisher-data-dashboard"]').waitFor();
await page.locator('[data-dashboard-metric="reservation_users"]').waitFor();
await page.locator('[data-dashboard-detail][data-active-metric="impression"]').waitFor();
await page.locator('[data-dashboard-platform]').filter({ hasText:'平台：Mac' }).waitFor();
await page.setViewportSize({ width:1440, height:1100 });
await page.screenshot({ path:path.join(outputDir, '02-dashboard-overview.png'), fullPage:false });

await page.locator('[data-dashboard-action="date-open"]').click();
await page.getByRole('dialog', { name:'选择时间' }).waitFor();
await page.screenshot({ path:path.join(outputDir, '03-dashboard-calendar.png'), fullPage:false });
await page.getByRole('dialog', { name:'选择时间' }).getByRole('button', { name:'取消', exact:true }).click();

const conversionHelp = page.locator('[data-dashboard-metric="detail_acquisition"] [data-metric-help]');
await conversionHelp.click();
await page.locator('.publisher-metric-tooltip.is-open').waitFor();
await page.screenshot({ path:path.join(outputDir, '04-dashboard-metric-definition.png'), fullPage:false });

await page.locator('[data-publisher-data-tab="users"]').click();
await page.locator('[data-dashboard-metric="active_players"]').waitFor();
await page.locator('[data-dashboard-action="metric-select"][data-detail-metric="retention_7d"]').click();
await page.locator('[data-dashboard-action="detail-view"][data-detail-view="table"]').click();
await page.screenshot({ path:path.join(outputDir, '05-dashboard-users.png'), fullPage:false });

const flowPage = await context.newPage();
await flowPage.setViewportSize({ width:2960,height:760 });
const flowSteps = [
  ['02-dashboard-overview.png','01 进入单游戏数据','企业认证通过后，从游戏管理进入当前游戏的经营数据'],
  ['02-dashboard-overview.png','02 查看曝光转化','默认展示近 30 天核心指标和有效曝光逐日详情'],
  ['03-dashboard-calendar.png','03 筛选与理解指标','按时间、商品、来源与地区筛选，问号查看口径'],
  ['05-dashboard-users.png','04 查看用户数据','点击活跃、新增、留存或时长指标，切换图表或表格'],
].map(([file,title,description]) => ({ file:`data:image/png;base64,${fs.readFileSync(path.join(outputDir,file)).toString('base64')}`,title,description }));
await flowPage.setContent(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#182230;font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif}.flow{width:2960px;height:760px;padding:36px}.panel{height:688px;border:1px solid #dce3ec;border-radius:22px;padding:30px;background:#fff}.panel>h1{margin:0;font-size:30px}.panel>p{margin:8px 0 26px;color:#667085;font-size:16px}.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:58px}.step{position:relative;height:510px;border:1px solid #d0d8e4;border-radius:18px;padding:18px;background:#fff}.step:not(:last-child)::after{content:"→";position:absolute;right:-46px;top:235px;color:#d49b00;font-size:40px;font-weight:800}.shot{height:352px;overflow:hidden;border:1px solid #e4e7ec;border-radius:12px;background:#f8fafc}.shot img{width:100%;height:100%;object-fit:cover;object-position:top left}.step h2{margin:20px 0 9px;font-size:22px}.step p{margin:0;color:#667085;font-size:14px;line-height:1.55}
</style></head><body><main class="flow"><section class="panel"><h1>发行平台开发者数据看板主流程</h1><p>进入单个游戏 → 查看曝光转化 → 筛选并理解指标 → 查看用户数据</p><div class="steps">${flowSteps.map(item => `<article class="step"><div class="shot"><img src="${item.file}"></div><h2>${item.title}</h2><p>${item.description}</p></article>`).join('')}</div></section></main></body></html>`, { waitUntil:'load' });
await flowPage.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
await flowPage.screenshot({ path:path.join(outputDir, '01-product-flow.png'), fullPage:true });
await flowPage.close();

await context.close();
await browser.close();
process.stdout.write(`Captured publisher data dashboard evidence in ${outputDir}.\n`);

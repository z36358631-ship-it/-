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
const context = await browser.newContext({ viewport:{ width:1440, height:900 }, deviceScaleFactor:1 });
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
await page.locator('[data-publisher-view="data"]').click();
await page.locator('[data-testid="publisher-data-dashboard"]').waitFor();

await page.screenshot({ path:path.join(outputDir, '02-dashboard-overview.png'), fullPage:true });

await page.locator('[data-publisher-data-tab="orders"]').click();
await page.locator('[data-dashboard-order-id]').first().waitFor();
await page.screenshot({ path:path.join(outputDir, '03-order-list.png'), fullPage:true });
await page.locator('[data-dashboard-order-id]').first().getByRole('button', { name:'查看详情', exact:true }).click();
await page.getByRole('dialog', { name:'订单详情' }).waitFor();
await page.screenshot({ path:path.join(outputDir, '04-order-detail.png'), fullPage:false });
await page.getByRole('dialog', { name:'订单详情' }).getByRole('button', { name:'关闭', exact:true }).click();

await page.locator('[data-publisher-data-tab="revenue"]').click();
await page.screenshot({ path:path.join(outputDir, '05-income-settlement.png'), fullPage:true });

await context.close();
await browser.close();
process.stdout.write(`Captured publisher data dashboard evidence in ${outputDir}.\n`);

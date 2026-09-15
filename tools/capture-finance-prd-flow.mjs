import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demoDir = path.join(root,'demos','开发者后台一期');
const outputDir = path.join(root,'public','prd','developer-finance-settlement-v2');
const developerDemo = path.join(demoDir,'开发者平台财务整合demo.html');
const operationsDemo = path.join(demoDir,'发行平台运营后台财务整合demo.html');
const flowSource = path.join(outputDir,'15-flow-feishu-source.html');
const chrome = [process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find(file => file && fs.existsSync(file));

if (!chrome) throw new Error('Chrome or Edge not found');
for (const file of [developerDemo,operationsDemo,flowSource]) {
  if (!fs.existsSync(file)) throw new Error(`Missing source: ${file}`);
}
fs.mkdirSync(outputDir,{ recursive:true });

const fileUrl = (file,hash = '') => {
  const target = pathToFileURL(file);
  target.searchParams.set('capture',`${Date.now()}-${Math.random()}`);
  target.hash = hash;
  return target.href;
};

const browser = await chromium.launch({
  headless:true,
  executablePath:chrome,
  args:['--allow-file-access-from-files','--disable-background-networking'],
});

const page = await browser.newPage({ viewport:{ width:1920,height:1080 },deviceScaleFactor:1 });
page.setDefaultTimeout(15000);
const hideDemoControls = async () => {
  await page.addStyleTag({ content:'.d15-demo,.fo-demo,[data-testid="scenario-orb"]{display:none!important}' });
  await page.evaluate(() => {
    for (const button of document.querySelectorAll('button')) {
      if (!/Demo\s*状态|Demo states/i.test(button.textContent || '')) continue;
      const container = button.closest('section,aside,div');
      (container || button).style.display = 'none';
    }
  });
};
const capture = async name => {
  await hideDemoControls();
  await page.screenshot({ path:path.join(outputDir,name),fullPage:false });
  console.log(`Captured ${name}`);
};
const seedDeveloperAccount = async () => {
  await page.goto(fileUrl(developerDemo,'/P01-01'),{ waitUntil:'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('gamehub-developer-session-v1',JSON.stringify({ authenticated:true,accountKey:'finance:approved' }));
    localStorage.setItem('gamehub-developer-account-states-v1',JSON.stringify({
      'finance:approved':{
        registration:{ accountTier:'enterprise',registeredAt:'2026-09-01 09:00',consoleTab:'games',vendorSettingsTab:'finance' },
        qualification:{ applicationId:'ENT-FINANCE',status:'approved',step:5,view:'intro',editing:false,revision:1,submittedAt:'2026-09-01 09:00',form:{ vendorName:'星海互动',agreementAccepted:true },history:[],submissions:[] },
      },
    }));
  });
};
const openDeveloper = async route => {
  console.log(`Open developer ${route}`);
  await seedDeveloperAccount();
  await page.goto(fileUrl(developerDemo,`/${route}`),{ waitUntil:'domcontentloaded' });
  await page.locator('[data-testid="developer-finance-demo"]').waitFor();
};
const openOperations = async () => {
  console.log('Open operations P16-01');
  await page.goto(fileUrl(operationsDemo,'/P16-01'),{ waitUntil:'domcontentloaded' });
  await page.locator('[data-finance-operations]').waitFor();
};

await openDeveloper('P15-01');
await capture('15-flow-01-entity-current.png');

await page.getByRole('button',{ name:'修改',exact:true }).click();
await page.getByRole('button',{ name:'提交审核',exact:true }).waitFor();
await capture('15-flow-02-entity-edit.png');

await page.getByRole('button',{ name:'提交审核',exact:true }).click();
await page.locator('[data-d15-entity-status]').getByText('审核中',{ exact:true }).waitFor();
await capture('15-flow-03-entity-pending.png');

await page.evaluate(() => window.__developerFinanceDemo.reviewEntity('approved'));
await page.locator('[data-d15-entity-status]').getByText('已生效',{ exact:true }).waitFor();
await capture('15-flow-04-entity-approved.png');

await openDeveloper('P15-02');
await capture('15-flow-05-statement-list.png');

const pendingGameRow = page.locator('[data-d15-settlement-row][data-status="pending"][data-item-type="game_sales_share"]').first();
await pendingGameRow.getByRole('button',{ name:'查看详情',exact:true }).click();
await page.getByRole('dialog',{ name:'游戏销售分成明细' }).waitFor();
await capture('15-flow-06-statement-detail.png');

await page.getByRole('dialog',{ name:'游戏销售分成明细' }).getByRole('button',{ name:'关闭' }).click();
await pendingGameRow.getByRole('button',{ name:'确认',exact:true }).click();
await page.getByRole('dialog',{ name:'确认结算单' }).waitFor();
await capture('15-flow-07-statement-confirm.png');

await page.getByRole('dialog',{ name:'确认结算单' }).getByRole('button',{ name:'确认',exact:true }).click();
await page.locator('[data-d15-settlement-row][data-item-type="game_sales_share"]').first().locator('.gh-tag.success').waitFor();
await capture('15-flow-08-statement-confirmed.png');

await openOperations();
await page.locator('.fo-tabs [data-fo-tab="game"]').click();
await page.locator('[data-fo-action="open-tier-editor"]').click();
await page.getByRole('dialog',{ name:'配置阶梯分成' }).waitFor();
await capture('15-flow-09-tier-config.png');

await page.getByRole('dialog',{ name:'配置阶梯分成' }).getByRole('button',{ name:'取消',exact:true }).click();
await page.locator('.fo-tabs [data-fo-tab="entity"]').click();
await page.locator('[data-testid="entity-summary-table"]').waitFor();
await capture('15-flow-10-ops-entity-summary.png');

await page.locator('.fo-tabs [data-fo-tab="game"]').click();
await page.locator('[data-testid="game-detail-table"]').waitFor();
await capture('15-flow-11-ops-game-detail.png');

await page.locator('[data-fo-select-row]').first().check();
await page.getByRole('button',{ name:/导出选中（1）/ }).waitFor();
await capture('15-flow-12-ops-export-selected.png');

await page.setViewportSize({ width:4800,height:1000 });
console.log('Open flow source');
await page.goto(fileUrl(flowSource),{ waitUntil:'domcontentloaded' });
await page.locator('img').first().waitFor();
await page.evaluate(async () => Promise.all([...document.images].map(image => image.complete ? undefined : new Promise(resolve => {
  image.addEventListener('load',resolve,{ once:true });
  image.addEventListener('error',resolve,{ once:true });
}))));
await page.screenshot({ path:path.join(outputDir,'15-flow-feishu.png'),fullPage:true });

await browser.close();
console.log('Captured 12 finance states and 15-flow-feishu.png');

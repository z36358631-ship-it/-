import test, { after, afterEach, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demoDir = path.join(root,'demos','开发者后台一期');
const demo = path.join(demoDir,'15-开发者财务结算demo.html');
const chrome = [process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find(file => file && fs.existsSync(file));
let browser;
let page;

const url = hash => { const target = pathToFileURL(demo); target.hash = hash; target.searchParams.set('testRun',`${Date.now()}-${Math.random()}`); return target.href; };
const open = async (hash = '/settlement') => { await page.goto(url(hash),{ waitUntil:'load' }); await page.locator('[data-testid="developer-finance-demo"]').waitFor(); };

before(() => {
  assert.ok(chrome,'Chrome or Edge not found');
  execFileSync(process.execPath,[path.join(demoDir,'build-next.mjs')],{ stdio:'pipe' });
});
before(async () => { browser = await chromium.launch({ headless:true,executablePath:chrome,args:['--allow-file-access-from-files','--disable-background-networking'] }); });
beforeEach(async () => { page = await browser.newPage({ viewport:{ width:1440,height:900 },acceptDownloads:true }); });
afterEach(async () => { await page?.close(); page = null; });
after(async () => { await browser?.close(); });

test('财务模块只保留两个入口且使用浅色选中态',async () => {
  await open('/entity');
  assert.deepEqual(await page.locator('.d15-nav [data-route]').allTextContents(),['主财务主体','结对账结算']);
  const colors = await page.locator('.d15-nav [data-route="entity"]').evaluate(element => ({
    color:getComputedStyle(element).color,
    background:getComputedStyle(element).backgroundColor,
    sidebar:getComputedStyle(element.closest('.gh-sidebar')).backgroundColor,
  }));
  assert.equal(colors.sidebar,'rgb(255, 255, 255)');
  assert.notEqual(colors.color,'rgb(255, 255, 255)');
  assert.notEqual(colors.background,'rgb(31, 58, 104)');
  const mainText = await page.locator('main').innerText();
  for (const label of ['财务主体','当前生效版本','修改','企业法定名称','联系人姓名','手机号','邮箱','银行账户户名','开户银行','银行账号','开户支行／联行信息','银行账户证明附件']) assert.match(mainText,new RegExp(label));
  assert.equal(await page.locator('[data-d15-entity-summary]').count(),1);
  assert.equal(await page.locator('[data-d15-entity-details]').count(),1);
  assert.doesNotMatch(mainText,/主体列表|选择财务主体/);
  assert.doesNotMatch(mainText,/税务居民地|结算币种|SWIFT|付款状态|发票|付款尝试/);
});

test('财务主体支持编辑、取消和首错定位',async () => {
  await open('/entity');
  await page.getByRole('button',{ name:'修改' }).click();
  assert.equal(await page.getByRole('button',{ name:'提交审核' }).isVisible(),true);
  assert.equal(await page.getByRole('button',{ name:'取消' }).isVisible(),true);
  await page.getByLabel('联系人姓名').fill('临时联系人');
  await page.getByRole('button',{ name:'取消' }).click();
  await page.getByRole('button',{ name:'修改' }).click();
  assert.equal(await page.getByLabel('联系人姓名').inputValue(),'王明');

  await page.getByLabel('联系人姓名').fill('');
  await page.getByRole('button',{ name:'提交审核' }).click();
  assert.equal(await page.getByLabel('联系人姓名').getAttribute('aria-invalid'),'true');
  assert.equal(await page.getByLabel('联系人姓名').evaluate(element => element === document.activeElement),true);
  assert.match(await page.getByRole('alert').innerText(),/联系人姓名/);
});

test('财务主体保留未提交字段和已选附件，并支持 Enter 提交',async () => {
  await open('/entity');
  await page.getByRole('button',{ name:'修改' }).click();
  await page.getByLabel('联系人姓名').fill('未提交联系人');
  await page.getByTestId('scenario-orb').click();
  assert.equal(await page.getByLabel('联系人姓名').inputValue(),'未提交联系人');

  await page.getByLabel('银行账户证明附件').setInputFiles({ name:'新银行证明.png',mimeType:'image/png',buffer:Buffer.from('valid-image') });
  await page.getByLabel('联系人姓名').fill('');
  await page.getByRole('button',{ name:'提交审核' }).click();
  assert.equal(await page.getByLabel('银行账户证明附件').evaluate(element => element.files.length),0);
  assert.match(await page.locator('[data-d15-upload-name]').innerText(),/新银行证明.png/);

  await page.getByLabel('联系人姓名').fill('王明');
  await page.getByLabel('联系人姓名').press('Enter');
  assert.match(await page.locator('[data-d15-entity-status]').innerText(),/审核中/);
});

test('财务主体校验联系方式、银行户名和附件',async () => {
  await open('/entity');
  await page.getByRole('button',{ name:'修改' }).click();

  await page.getByLabel('手机号').fill('12345');
  await page.getByRole('button',{ name:'提交审核' }).click();
  assert.equal(await page.getByLabel('手机号').evaluate(element => element === document.activeElement),true);
  assert.match(await page.getByRole('alert').innerText(),/手机号/);
  await page.getByLabel('手机号').fill('18520064686');

  await page.getByLabel('邮箱').fill('finance@invalid');
  await page.getByRole('button',{ name:'提交审核' }).click();
  assert.equal(await page.getByLabel('邮箱').evaluate(element => element === document.activeElement),true);
  assert.match(await page.getByRole('alert').innerText(),/邮箱/);
  await page.getByLabel('邮箱').fill('finance@ocean-expedition.com');

  await page.getByLabel('银行账户户名').fill('其他公司');
  await page.getByRole('button',{ name:'提交审核' }).click();
  assert.equal(await page.getByLabel('银行账户户名').evaluate(element => element === document.activeElement),true);
  assert.match(await page.getByRole('alert').innerText(),/企业法定名称一致/);
  await page.getByLabel('银行账户户名').fill('深圳星海互动科技有限公司');

  const attachment = page.getByLabel('银行账户证明附件');
  await attachment.setInputFiles({ name:'银行证明.pdf',mimeType:'application/pdf',buffer:Buffer.from('invalid') });
  await page.getByRole('button',{ name:'提交审核' }).click();
  assert.match(await page.getByRole('alert').innerText(),/JPG、PNG、WEBP/);
  await attachment.setInputFiles({ name:'银行证明.png',mimeType:'image/png',buffer:Buffer.alloc(10 * 1024 * 1024 + 1) });
  await page.getByRole('button',{ name:'提交审核' }).click();
  assert.match(await page.getByRole('alert').innerText(),/10 MB/);
});

test('主体变更提交后保留当前生效版本，审核驳回后可再次修改',async () => {
  await open('/entity');
  await page.getByRole('button',{ name:'修改' }).click();
  await page.getByLabel('企业法定名称').fill('深圳星海互动网络有限公司');
  await page.getByLabel('银行账户户名').fill('深圳星海互动网络有限公司');
  await page.getByLabel('银行账户证明附件').setInputFiles({ name:'新银行证明.webp',mimeType:'image/webp',buffer:Buffer.from('valid-image') });
  await page.getByRole('button',{ name:'提交审核' }).click();

  assert.match(await page.locator('[data-d15-entity-status]').innerText(),/审核中/);
  assert.match(await page.locator('[data-d15-entity-details]').innerText(),/深圳星海互动科技有限公司/);
  assert.doesNotMatch(await page.locator('[data-d15-entity-details]').innerText(),/深圳星海互动网络有限公司/);
  assert.equal(await page.getByRole('button',{ name:'修改' }).isEnabled(),false);

  await page.evaluate(() => window.__developerFinanceDemo.reviewEntity('rejected','银行账户证明不清晰'));
  assert.match(await page.locator('[data-d15-entity-status]').innerText(),/已驳回/);
  assert.match(await page.locator('[data-d15-entity-status]').innerText(),/银行账户证明不清晰/);
  assert.equal(await page.getByRole('button',{ name:'修改' }).isEnabled(),true);
  await page.getByRole('button',{ name:'修改' }).click();
  assert.equal(await page.getByLabel('企业法定名称').inputValue(),'深圳星海互动网络有限公司');
});

test('390px 财务主体查看与编辑无页面级横向溢出',async () => {
  await page.setViewportSize({ width:390,height:844 });
  await open('/entity');
  const dimensions = async () => page.evaluate(() => ({ client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth }));
  assert.deepEqual(await dimensions(),{ client:390,scroll:390 });
  await page.getByRole('button',{ name:'修改' }).click();
  assert.deepEqual(await dimensions(),{ client:390,scroll:390 });
});

test('开发者结算按月汇总并支持全部游戏或单款游戏筛选',async () => {
  await open('/settlement');
  const table = page.locator('[data-testid="settlement-table"]');
  for (const label of ['用户实付','退款／拒付','销售税','支付费','平台分成','预扣税','应结算金额']) assert.match(await table.innerText(),new RegExp(label));
  assert.deepEqual(await page.locator('[data-d15-filter]').evaluateAll(nodes => nodes.map(node => node.dataset.d15Filter)),['month','game']);
  assert.equal(await page.locator('[data-d15-settlement-row]').count(),3);
  assert.equal(await table.locator('tbody td').filter({ hasText:/USD/ }).count(),0);
  assert.equal(await table.locator('[data-d15-cny-reference]').count(),3);
  assert.match(await table.locator('[data-d15-cny-reference]').first().innerText(),/^约 ¥/);
  assert.equal(await page.locator('[data-d15-pagination]').getAttribute('data-page-size'),'20');
  const audit = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
  assert.equal(audit.immutable,true);
  assert.match(audit.snapshotId,/SETTLEMENT-SNAPSHOT/);
  for (const settlement of audit.settlements) {
    const games = audit.games.filter(game => game.month === settlement.month);
    assert.ok(games.length > 0);
    assert.equal(games.reduce((sum,game) => sum + game.payableMinor,0),settlement.payableMinor);
  }
  const allPayable = audit.settlements.reduce((sum,row) => sum + row.payableMinor,0);
  await page.locator('[data-d15-filter="game"]').selectOption({ index:1 });
  await page.getByRole('button',{ name:'查询' }).click();
  const filtered = await page.evaluate(() => window.__developerFinanceDemo.snapshot().visibleSettlements);
  assert.ok(filtered.length > 0);
  assert.ok(filtered.reduce((sum,row) => sum + row.payableMinor,0) < allPayable);
  assert.equal(await page.getByText('调整额').count(),0);
});

test('结算详情保持单层并同时展示游戏构成和第三方支付流水',async () => {
  await open('/settlement');
  await page.getByRole('button',{ name:'查看详情' }).first().click();
  const drawer = page.getByRole('dialog',{ name:'结算详情' });
  assert.equal(await page.getByRole('dialog').count(),1);
  const text = await drawer.innerText();
  for (const label of ['游戏构成','交易流水','第三方支付商','买家国家或地区','实际税率','税额','支付费','汇率','销售税','预扣税']) assert.match(text,new RegExp(label));
  assert.doesNotMatch(text,/买家姓名|邮箱|卡号|支付账号|支付商密钥|调整额|付款状态|发票|付款尝试/);
  assert.ok(await drawer.locator('[data-d15-game-row]').count() > 1);
  assert.ok(await drawer.locator('[data-d15-transaction-row]').count() > 1);
});

test('筛选无结果与缺省态使用不同文案',async () => {
  await open('/settlement');
  await page.locator('[data-d15-filter="month"]').selectOption('2026-06');
  await page.locator('[data-d15-filter="game"]').selectOption('GAME-48291');
  await page.getByRole('button',{ name:'查询' }).click();
  assert.equal(await page.getByText('未找到符合条件的记录').isVisible(),true);
  await page.locator('[data-testid="scenario-orb"]').click();
  await page.getByRole('button',{ name:'缺省态' }).click();
  assert.equal(await page.getByText('暂无结算记录').isVisible(),true);
});

test('开发者可导出当前结算结果',async () => {
  await open('/settlement');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{ name:'导出当前结果' }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(),/^对账结算_/);
  const csv = fs.readFileSync(await download.path(),'utf8');
  assert.match(csv,/用户实付/);
  assert.match(csv,/预扣税/);
  assert.match(csv,/人民币参考额/);
  assert.match(csv,/锁定汇率/);
  assert.doesNotMatch(csv,/调整额|付款状态|发票/);
});

for (const viewport of [{ width:1280,height:800 },{ width:390,height:844 }]) {
  test(`${viewport.width}px 页面级无横向溢出`,async () => {
    await page.setViewportSize(viewport);
    await open('/settlement');
    const dimensions = await page.evaluate(() => ({ client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth }));
    assert.equal(dimensions.scroll,dimensions.client);
  });
}

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

const nextMonth = value => {
  const [year,month] = value.split('-').map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2,'0')}`;
};
const signedCny = minor => `${Number(minor) < 0 ? '-' : ''}¥${(Math.abs(Number(minor)) / 100).toLocaleString('zh-CN',{ minimumFractionDigits:2,maximumFractionDigits:2 })}`;
const escaped = value => String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

test('开发者对账结算使用固定字段、N+1和人民币公式',async () => {
  await open('/settlement');
  const table = page.locator('[data-testid="settlement-table"]');
  assert.deepEqual(await table.locator('th').allTextContents(),[
    '','游戏 ID','游戏名称','账单月份','结算月份','结算项','用户支付金额（CNY）',
    '结算比例','实际到账金额（CNY）','结算金额（CNY）','状态','操作',
  ]);
  assert.deepEqual(await page.locator('[data-d15-filter]').evaluateAll(nodes => nodes.map(node => node.dataset.d15Filter)),[
    'billingMonth','settlementMonth','gameId','status',
  ]);
  assert.equal(await page.locator('[data-d15-settlement-row]').count(),20);
  assert.equal(await page.locator('[data-d15-pagination]').getAttribute('data-page-size'),'20');
  const allRows = await page.evaluate(() => window.__developerFinanceDemo.snapshot().settlements);
  assert.deepEqual([...new Set(allRows.map(row => row.billingMonth))],['2026-08','2026-07','2026-06']);
  assert.deepEqual([...new Set(allRows.map(row => row.itemType))],['sales_share','refund_adjustment','chargeback_adjustment']);
  assert.deepEqual([...new Set(allRows.map(row => row.status))].sort(),['confirmed','pending']);
  assert.equal(allRows.length,36);
  const rows = await page.locator('[data-d15-settlement-row]').evaluateAll(nodes => nodes.map(node => ({ ...node.dataset })));
  for (const row of rows) {
    assert.equal(row.settlementMonth,nextMonth(row.billingMonth));
    assert.equal(Number(row.settlementMinor),Math.round(Number(row.receivedMinor) * Number(row.ratioPercent) / 100));
  }
  const text = await table.innerText();
  for (const label of ['游戏销售分成','退款补扣','拒付补扣','待确认','已确认']) assert.match(text,new RegExp(label));
  assert.doesNotMatch(text,/美元|USD|人民币参考额|锁定汇率|查看详情|第三方支付商|交易流水|调整额|付款状态|发票/);
  const negative = page.locator('[data-d15-settlement-row][data-item-type="refund_adjustment"]').first();
  assert.ok(Number(await negative.getAttribute('data-received-minor')) < 0);
  assert.ok(Number(await negative.getAttribute('data-settlement-minor')) < 0);
  assert.match(await negative.locator('td').nth(8).innerText(),/^-/);
  assert.match(await negative.locator('td').nth(9).innerText(),/^-/);
});

test('四项筛选支持账单月、结算月、游戏和状态',async () => {
  await open('/settlement');
  await page.locator('[data-d15-filter="billingMonth"]').selectOption('2026-07');
  await page.locator('[data-d15-filter="settlementMonth"]').selectOption('2026-08');
  await page.locator('[data-d15-filter="gameId"]').selectOption('GAME-48291');
  await page.locator('[data-d15-filter="status"]').selectOption('pending');
  await page.getByRole('button',{ name:'查询' }).click();
  const rows = await page.locator('[data-d15-settlement-row]').evaluateAll(nodes => nodes.map(node => ({ ...node.dataset })));
  assert.ok(rows.length > 0);
  assert.ok(rows.every(row => row.billingMonth === '2026-07' && row.settlementMonth === '2026-08' && row.gameId === 'GAME-48291' && row.status === 'pending'));
});

test('单条确认显示数量和金额，确认后不可再次操作',async () => {
  await open('/settlement');
  const pending = page.locator('[data-d15-settlement-row][data-status="pending"]').first();
  const pendingId = await pending.getAttribute('data-statement-id');
  const pendingMinor = Number(await pending.getAttribute('data-settlement-minor'));
  await pending.getByRole('button',{ name:'确认',exact:true }).click();
  const dialog = page.getByRole('dialog',{ name:'确认结算单' });
  assert.equal(await dialog.isVisible(),true);
  assert.match(await dialog.innerText(),/1 条/);
  assert.match(await dialog.innerText(),new RegExp(escaped(signedCny(pendingMinor))));
  assert.match(await dialog.innerText(),/确认后不可撤销/);
  await dialog.getByRole('button',{ name:'确认',exact:true }).click();
  const confirmed = page.locator(`[data-statement-id="${pendingId}"]`);
  assert.equal(await confirmed.getAttribute('data-status'),'confirmed');
  assert.equal(await confirmed.getByRole('button',{ name:'确认',exact:true }).count(),0);
  assert.equal((await confirmed.locator('td').last().innerText()).trim(),'—');
});

test('确认弹窗聚焦、焦点陷阱和关闭后焦点恢复完整',async () => {
  await open('/settlement');
  const trigger = page.locator('[data-d15-settlement-row][data-status="pending"]').first().getByRole('button',{ name:'确认',exact:true });
  await trigger.click();
  const dialog = page.getByRole('dialog',{ name:'确认结算单' });
  const close = dialog.getByRole('button',{ name:'关闭' });
  const confirm = dialog.getByRole('button',{ name:'确认',exact:true });
  assert.equal(await close.evaluate(node => node === document.activeElement),true);
  await close.press('Shift+Tab');
  assert.equal(await confirm.evaluate(node => node === document.activeElement),true);
  await confirm.press('Tab');
  assert.equal(await close.evaluate(node => node === document.activeElement),true);
  await page.keyboard.press('Escape');
  assert.equal(await trigger.evaluate(node => node === document.activeElement),true);

  await trigger.click();
  await dialog.getByRole('button',{ name:'关闭' }).click();
  assert.equal(await trigger.evaluate(node => node === document.activeElement),true);

  await trigger.click();
  await dialog.getByRole('button',{ name:'取消' }).click();
  assert.equal(await trigger.evaluate(node => node === document.activeElement),true);

  const firstCheck = page.locator('[data-d15-settlement-row][data-status="pending"] input[type="checkbox"]').first();
  await firstCheck.check();
  const batch = page.getByRole('button',{ name:'批量确认' });
  await batch.click();
  await dialog.getByRole('button',{ name:'确认',exact:true }).click();
  assert.equal(await batch.evaluate(node => node === document.activeElement),true);
  assert.equal(await batch.getAttribute('aria-disabled'),'true');
});

test('待确认筛选下确认单条后焦点回落到稳定操作',async () => {
  await open('/settlement');
  await page.locator('[data-d15-filter="status"]').selectOption('pending');
  await page.getByRole('button',{ name:'查询' }).click();
  const row = page.locator('[data-d15-settlement-row]').first();
  const id = await row.getAttribute('data-statement-id');
  await row.getByRole('button',{ name:'确认',exact:true }).click();
  await page.getByRole('dialog',{ name:'确认结算单' }).getByRole('button',{ name:'确认',exact:true }).click();
  assert.equal(await page.locator(`[data-statement-id="${id}"]`).count(),0);
  const fallback = page.getByRole('button',{ name:'批量确认' });
  assert.equal(await fallback.isVisible(),true);
  assert.equal(await fallback.evaluate(node => node === document.activeElement),true);
});

test('负数结算项单条确认时合计金额保留负号',async () => {
  await open('/settlement');
  const negativeRow = page.locator('[data-d15-settlement-row][data-status="pending"][data-item-type="refund_adjustment"]').first();
  const minor = Number(await negativeRow.getAttribute('data-settlement-minor'));
  assert.ok(minor < 0);
  await negativeRow.getByRole('button',{ name:'确认',exact:true }).click();
  const text = await page.getByRole('dialog',{ name:'确认结算单' }).innerText();
  assert.match(text,new RegExp(escaped(signedCny(minor))));
});

test('批量确认只处理已勾选的待确认记录',async () => {
  await open('/settlement');
  const pendingChecks = page.locator('[data-d15-settlement-row][data-status="pending"] input[type="checkbox"]');
  const firstId = await pendingChecks.nth(0).getAttribute('value');
  const secondId = await pendingChecks.nth(1).getAttribute('value');
  const unselectedId = await pendingChecks.nth(2).getAttribute('value');
  await pendingChecks.nth(0).check();
  await pendingChecks.nth(1).check();
  const firstMinor = Number(await page.locator(`[data-statement-id="${firstId}"]`).getAttribute('data-settlement-minor'));
  const secondMinor = Number(await page.locator(`[data-statement-id="${secondId}"]`).getAttribute('data-settlement-minor'));
  const selectedTotal = firstMinor + secondMinor;
  await page.getByRole('button',{ name:'批量确认' }).click();
  const dialog = page.getByRole('dialog',{ name:'确认结算单' });
  assert.match(await dialog.innerText(),/2 条/);
  assert.match(await dialog.innerText(),new RegExp(escaped(signedCny(selectedTotal))));
  await dialog.getByRole('button',{ name:'确认',exact:true }).click();
  assert.equal(await page.locator(`[data-statement-id="${firstId}"]`).getAttribute('data-status'),'confirmed');
  assert.equal(await page.locator(`[data-statement-id="${secondId}"]`).getAttribute('data-status'),'confirmed');
  assert.equal(await page.locator(`[data-statement-id="${unselectedId}"]`).getAttribute('data-status'),'pending');
});

test('待确认筛选在末页全选确认后自动收缩到有效页',async () => {
  await open('/settlement');
  await page.locator('[data-d15-filter="status"]').selectOption('pending');
  await page.getByRole('button',{ name:'查询' }).click();
  assert.equal(await page.locator('[data-d15-settlement-row]').count(),20);
  await page.getByRole('button',{ name:'下一页' }).click();
  const lastPageCount = await page.locator('[data-d15-settlement-row]').count();
  assert.ok(lastPageCount > 0 && lastPageCount < 20);
  await page.getByLabel('选择本页待确认').check();
  await page.getByRole('button',{ name:'批量确认' }).click();
  await page.getByRole('dialog',{ name:'确认结算单' }).getByRole('button',{ name:'确认',exact:true }).click();
  assert.equal(await page.getByText('未找到符合条件的记录').count(),0);
  assert.equal(await page.locator('[data-d15-settlement-row]').count(),20);
  assert.match(await page.locator('[data-d15-pagination]').innerText(),/1 \/ 1/);
});

test('离开并重进对账页后清空选择',async () => {
  await open('/settlement');
  await page.locator('[data-d15-settlement-row][data-status="pending"] input[type="checkbox"]').first().check();
  assert.equal(await page.getByRole('button',{ name:'批量确认' }).getAttribute('aria-disabled'),null);
  await page.locator('[data-route="entity"]').click();
  await page.locator('[data-route="settlement"]').click();
  assert.equal(await page.locator('[data-d15-select-statement]:checked').count(),0);
  assert.equal(await page.getByRole('button',{ name:'批量确认' }).getAttribute('aria-disabled'),'true');
});

test('筛选无结果与缺省态使用不同文案',async () => {
  await open('/settlement');
  await page.locator('[data-d15-filter="billingMonth"]').selectOption('2026-06');
  await page.locator('[data-d15-filter="settlementMonth"]').selectOption('2026-09');
  await page.getByRole('button',{ name:'查询' }).click();
  assert.equal(await page.getByText('未找到符合条件的记录').isVisible(),true);
  await page.locator('[data-testid="scenario-orb"]').click();
  await page.getByRole('button',{ name:'缺省态' }).click();
  assert.equal(await page.getByText('暂无结算记录').isVisible(),true);
});

test('开发者可导出当前结算结果',async () => {
  await open('/settlement');
  await page.locator('[data-d15-filter="billingMonth"]').selectOption('2026-06');
  await page.locator('[data-d15-filter="gameId"]').selectOption('GAME-48291');
  await page.getByRole('button',{ name:'查询' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{ name:'导出当前结果' }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(),/^对账结算_/);
  const csv = fs.readFileSync(await download.path(),'utf8');
  for (const label of ['游戏 ID','游戏名称','账单月份','结算月份','结算项','用户支付金额（CNY）','结算比例','实际到账金额（CNY）','结算金额（CNY）','状态']) assert.match(csv,new RegExp(label));
  assert.doesNotMatch(csv,/操作|开发者|财务主体|结算比例版本|美元|USD|人民币参考额|锁定汇率|调整额|付款状态|发票/);
  assert.equal(csv.trim().split(/\r?\n/).length,4);
  assert.match(csv,/GAME-48291/);
  assert.doesNotMatch(csv,/GAME-48292|GAME-48293|GAME-48294/);
  const exportedRows = csv.trim().split(/\r?\n/).slice(1);
  assert.ok(exportedRows.every(row => /^"GAME-48291","[^"]+","2026-06","2026-07",/.test(row)));
});

for (const viewport of [{ width:1280,height:800 },{ width:390,height:844 }]) {
  test(`${viewport.width}px 页面级无横向溢出`,async () => {
    await page.setViewportSize(viewport);
    await open('/settlement');
    const dimensions = await page.evaluate(() => ({ client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth }));
    assert.equal(dimensions.scroll,dimensions.client);
    const tableScroll = await page.locator('[data-testid="settlement-table"]').evaluate(table => {
      const wrap = table.closest('.gh-table-wrap');
      wrap.scrollLeft = 120;
      return {
        client:wrap.clientWidth,
        scroll:wrap.scrollWidth,
        overflowX:getComputedStyle(wrap).overflowX,
        scrollLeft:wrap.scrollLeft,
      };
    });
    assert.ok(tableScroll.scroll > tableScroll.client);
    assert.ok(['auto','scroll'].includes(tableScroll.overflowX));
    assert.ok(tableScroll.scrollLeft > 0);
  });
}

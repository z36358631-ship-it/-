import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demo = path.join(root, 'demos', '开发者后台一期', '15-开发者财务结算demo.html');
const evidenceDir = path.join(root, 'tests', 'developer-backend', 'evidence', 'developer-finance-settlement');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));
let browser;
const url = hash => {
  const value = pathToFileURL(demo);
  value.hash = hash;
  return value.href;
};

async function locationHash(page) {
  return page.evaluate(() => location.hash);
}

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  assert.ok(fs.existsSync(demo), 'Demo 15 is not built');
  fs.mkdirSync(evidenceDir, { recursive:true });
  browser = await chromium.launch({
    headless:true,
    executablePath:chrome,
    args:['--allow-file-access-from-files','--disable-background-networking'],
  });
});

after(async () => { await browser?.close(); });

test('穷举数据使用整数金额并由流水还原账单', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    const model = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
    assert.equal(model.scenario, 'exhaustive');
    assert.equal(model.moneyStorage, 'minor-unit-integer');
    assert.deepEqual(model.ledgerSources.sort(), ['direct_sale','external_key','gamehub_key']);
    assert.equal(model.statementIdsUnique, true);
    assert.equal(model.statementTotalsConsistent, true);
    assert.equal(model.flowTotalsConsistent, true);
    assert.equal(model.noCrossLedgerMixing, true);
    assert.equal(model.sourceTotalsComplete, true);
    assert.equal(model.generatedAfterPeriodEnd, true);
    assert.equal(model.moneyAmountsAreIntegers, true);
    assert.equal(model.jpyPrecisionValid, true);

    const brokenAudits = await page.evaluate(() => {
      const api = window.__developerFinanceDemo;
      const copy = value => JSON.parse(JSON.stringify(value));
      const fixture = api.auditFixture();

      const unknownSource = copy(fixture);
      unknownSource.flows[0].ledgerSource = 'unknown_ledger';

      const incompleteSources = copy(fixture);
      delete incompleteSources.statements[0].sourceTotalsMinor.gamehub_key;

      const extraSource = copy(fixture);
      extraSource.statements[0].sourceTotalsMinor.legacy_ledger = 0;

      const fractionalMinor = copy(fixture);
      fractionalMinor.flows[0].settlementMinor += 0.5;

      const unsafeMinor = copy(fixture);
      unsafeMinor.payments[0].amountMinor = Number.MAX_SAFE_INTEGER + 1;

      const invalidJpy = copy(fixture);
      invalidJpy.flows.find(flow => flow.originalCurrency === 'JPY' && flow.originalMinor < 0).originalMinor -= 0.5;

      const wrongGeneratedMonth = copy(fixture);
      wrongGeneratedMonth.statements[0].generated = '2026-10-05 11:20';

      const wrongGeneratedDay = copy(fixture);
      wrongGeneratedDay.statements[0].generated = '2026-09-11 11:20';

      return {
        unknownSource:api.auditLedger(unknownSource),
        incompleteSources:api.auditLedger(incompleteSources),
        extraSource:api.auditLedger(extraSource),
        fractionalMinor:api.auditLedger(fractionalMinor),
        unsafeMinor:api.auditLedger(unsafeMinor),
        invalidJpy:api.auditLedger(invalidJpy),
        wrongGeneratedMonth:api.auditLedger(wrongGeneratedMonth),
        wrongGeneratedDay:api.auditLedger(wrongGeneratedDay),
      };
    });
    assert.equal(brokenAudits.unknownSource.sourceTotalsComplete, false);
    assert.equal(brokenAudits.unknownSource.noCrossLedgerMixing, false);
    assert.equal(brokenAudits.incompleteSources.sourceTotalsComplete, false);
    assert.equal(brokenAudits.extraSource.sourceTotalsComplete, false);
    assert.equal(brokenAudits.fractionalMinor.moneyAmountsAreIntegers, false);
    assert.equal(brokenAudits.unsafeMinor.moneyAmountsAreIntegers, false);
    assert.equal(brokenAudits.invalidJpy.jpyPrecisionValid, false);
    assert.equal(brokenAudits.wrongGeneratedMonth.generatedAfterPeriodEnd, false);
    assert.equal(brokenAudits.wrongGeneratedDay.generatedAfterPeriodEnd, false);
  } finally {
    await page.close();
  }
});

test('悬浮球默认穷举态并可往返切换缺省态', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    const orb = page.locator('[data-testid="scenario-orb"]');
    assert.equal(await orb.getAttribute('aria-expanded'), 'false');
    assert.equal((await page.evaluate(() => window.__developerFinanceDemo.snapshot())).scenario, 'exhaustive');
    assert.equal(await page.locator('tbody tr[data-statement-id]').count(), 20);

    await orb.click();
    const options = page.getByRole('menuitemradio');
    assert.equal(await options.count(), 2);
    assert.deepEqual(await options.allTextContents(), ['穷举态展示完整状态','缺省态模拟首次进入']);
    await page.getByRole('menuitemradio', { name:/缺省态/ }).click();

    const emptyModel = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
    assert.equal(emptyModel.scenario, 'empty');
    assert.deepEqual(emptyModel.counts, { statements:0, flows:0, disputes:0, invoices:0, payments:0 });
    assert.equal(emptyModel.entity.status, 'unconfigured');
    assert.equal(emptyModel.entity.effectiveVersion, '');
    assert.match(await page.locator('main').innerText(), /暂无对账单/);
    assert.equal(await locationHash(page), '#/reconciliation');

    await page.getByRole('button', { name:'对账流水', exact:true }).click();
    assert.match(await page.locator('main').innerText(), /暂无对账流水/);
    await page.locator('[data-route="payments"]').click();
    assert.match(await page.locator('main').innerText(), /暂无付款记录/);
    await page.locator('[data-route="entity"]').click();
    assert.match(await page.locator('main').innerText(), /尚未配置财务主体/);
    await page.getByRole('button', { name:'配置财务主体', exact:true }).click();
    assert.equal(await page.locator('[data-testid="entity-form"]').count(), 1);
    await page.getByLabel('财务联系人').fill('缺省态临时联系人');

    await orb.click();
    await page.getByRole('menuitemradio', { name:/穷举态/ }).click();
    const restoredModel = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
    assert.equal(restoredModel.scenario, 'exhaustive');
    assert.equal(restoredModel.entity.contactName, '王明');
    assert.equal(await locationHash(page), '#/entity');
    assert.equal(await page.locator('[data-testid="entity-form"]').count(), 0);
    assert.match(await page.locator('main').innerText(), /已生效/);

    await orb.click();
    await page.getByRole('menuitemradio', { name:/缺省态/ }).click();
    assert.equal(await page.locator('[data-testid="entity-form"]').count(), 0);
    assert.equal(await page.getByRole('button', { name:'配置财务主体', exact:true }).count(), 1);
  } finally {
    await page.close();
  }
});

test('场景菜单支持键盘导航并在重渲染后恢复焦点', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    const orb = page.locator('[data-testid="scenario-orb"]');
    assert.equal(await orb.getAttribute('aria-haspopup'), 'menu');
    assert.equal(await orb.getAttribute('aria-controls'), 'd15-scenario-menu');

    await orb.focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('menu', { name:'Demo 场景' });
    assert.equal(await menu.getAttribute('id'), 'd15-scenario-menu');
    const exhaustive = page.getByRole('menuitemradio', { name:/穷举态/ });
    const empty = page.getByRole('menuitemradio', { name:/缺省态/ });
    assert.equal(await exhaustive.evaluate(node => node === document.activeElement), true);

    await page.keyboard.press('ArrowDown');
    assert.equal(await empty.evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('ArrowRight');
    assert.equal(await exhaustive.evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('End');
    assert.equal(await empty.evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Home');
    assert.equal(await exhaustive.evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await menu.count(), 0);
    assert.equal(await orb.evaluate(node => node === document.activeElement), true);

    await page.keyboard.press('Enter');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    assert.equal((await page.evaluate(() => window.__developerFinanceDemo.snapshot())).scenario, 'empty');
    assert.equal(await orb.evaluate(node => node === document.activeElement), true);

    await page.keyboard.press('Enter');
    await page.keyboard.press('Home');
    await page.keyboard.press('Tab');
    assert.equal(await orb.evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await exhaustive.evaluate(node => node === document.activeElement), true);
  } finally {
    await page.close();
  }
});

test('切换场景保留一级路由并重置临时视图且不写公共存储', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    await page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    await page.getByRole('button', { name:'确认账单', exact:true }).click();
    assert.equal(await page.getByRole('dialog', { name:'确认账单' }).count(), 1);
    await page.evaluate(() => window.__developerFinanceDemo.setDemoScenario('empty'));
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.evaluate(() => window.__developerFinanceDemo.setDemoScenario('exhaustive'));

    await page.getByLabel('账单状态').selectOption('locked');
    await page.getByRole('button', { name:'下一页', exact:true }).click();
    assert.match(await page.locator('.gh-pagination').innerText(), /2 \/ 2/);

    await page.locator('tbody tr[data-statement-id]').first().getByRole('button', { name:'查看', exact:true }).click();
    assert.equal(await page.getByRole('dialog', { name:'账单详情' }).count(), 1);
    const storageBefore = await page.evaluate(() => {
      const read = storage => {
        try { return Object.keys(storage).sort().map(key => [key,storage.getItem(key)]); }
        catch { return []; }
      };
      return { local:read(localStorage), session:read(sessionStorage) };
    });

    await page.evaluate(() => window.__developerFinanceDemo.setDemoScenario('empty'));
    assert.equal(await locationHash(page), '#/reconciliation');
    assert.equal(await page.getByRole('dialog').count(), 0);

    await page.evaluate(() => window.__developerFinanceDemo.setDemoScenario('exhaustive'));
    assert.equal(await page.getByLabel('账单状态').inputValue(), 'all');
    assert.match(await page.locator('.gh-pagination').innerText(), /1 \/ 2/);
    const storageAfter = await page.evaluate(() => {
      const read = storage => {
        try { return Object.keys(storage).sort().map(key => [key,storage.getItem(key)]); }
        catch { return []; }
      };
      return { local:read(localStorage), session:read(sessionStorage) };
    });
    assert.deepEqual(storageAfter, storageBefore);
  } finally {
    await page.close();
  }
});

test('财务主体支持变更、提交及撤销审核二次确认', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(url('/entity'), { waitUntil:'load' });
    await page.getByRole('heading', { name:'财务主体', exact:true }).waitFor();
    assert.match(await page.locator('main').innerText(), /已生效/);
    assert.match(await page.locator('main').innerText(), /来源：企业认证/);
    await page.getByRole('button', { name:'申请变更', exact:true }).click();
    await page.locator('[data-entity-file="bankProof"]').setInputFiles({ name:'bank-proof.pdf', mimeType:'application/pdf', buffer:Buffer.from('bank proof') });
    await page.getByLabel('变更说明').fill('更新收款账户证明');
    await page.getByRole('button', { name:'提交审核', exact:true }).click();
    assert.match(await page.locator('main').innerText(), /变更审核中/);
    assert.match(await page.locator('main').innerText(), /旧资料继续用于账单归属/);
    await page.getByRole('button', { name:'查看提交内容', exact:true }).click();
    const submitted = page.getByRole('dialog', { name:'提交内容' });
    assert.equal(await submitted.locator('input').count(), 0);
    await submitted.getByRole('button', { name:'关闭', exact:true }).last().click();
    await page.getByRole('button', { name:'撤销审核', exact:true }).click();
    await page.getByRole('dialog', { name:'撤销审核' }).waitFor();
    await page.getByRole('button', { name:'确认撤销', exact:true }).click();
    assert.match(await page.locator('main').innerText(), /已生效/);
    await page.screenshot({ path:path.join(evidenceDir,'entity-effective-1440x900.png'), fullPage:true });
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('财务对账每页20条并支持确认、差异和发票', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    const model = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
    assert.equal(model.statementIdsUnique, true);
    assert.equal(model.statementTotalsConsistent, true);
    assert.deepEqual(model.pages, { statements:2, flows:7, payments:2 });
    assert.equal(model.flowTotalsConsistent, true);
    assert.equal(model.paymentStatementsUnique, true);
    assert.equal(model.paymentAmountsConsistent, true);
    assert.equal(model.paymentTimelineValid, true);
    const rows = page.locator('tbody tr');
    assert.equal(await rows.count(), 20);
    assert.match(await page.locator('main').innerText(), /交易原币汇总/);
    assert.doesNotMatch(await page.locator('main').innerText(), /人民币等值/);
    await page.screenshot({ path:path.join(evidenceDir,'reconciliation-list-1440x900.png'), fullPage:true });

    await page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    await page.getByRole('button', { name:'提交差异', exact:true }).click();
    await page.getByLabel('差异类型').selectOption('fee_tax_fx');
    await page.getByLabel('期望金额').fill('18520.36');
    await page.getByLabel('差异说明').fill('支付商结算文件中的汇率版本不同，请复核。');
    await page.getByRole('button', { name:'提交差异', exact:true }).click();
    assert.match(await page.getByRole('dialog', { name:'账单详情' }).innerText(), /差异记录/);

    await page.getByRole('button', { name:'关闭', exact:true }).last().click();
    await page.locator('[data-statement-id="STMT-2026-06-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    assert.match(await page.getByRole('dialog', { name:'账单详情' }).innerText(), /仅因合同要求展示/);
    await page.locator('[data-invoice-file]').setInputFiles({
      name:'invoice.pdf',
      mimeType:'application/pdf',
      buffer:Buffer.from('demo invoice'),
    });
    await page.getByLabel('发票号').fill('INV-202609-1024');
    await page.getByLabel('发票金额（USD）').fill('');
    await page.getByRole('button', { name:'提交发票', exact:true }).click();
    const invoiceAlert = page.getByRole('alert');
    assert.equal(await invoiceAlert.getAttribute('aria-live'), 'polite');
    assert.equal(await page.getByLabel('发票金额（USD）').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.getByLabel('发票号').getAttribute('aria-invalid'), null);
    await page.getByLabel('发票金额（USD）').fill('15482.60');
    await page.getByRole('button', { name:'提交发票', exact:true }).click();
    assert.match(await page.getByRole('dialog', { name:'账单详情' }).innerText(), /审核中/);
    assert.match(await page.getByRole('dialog', { name:'账单详情' }).innerText(), /INV-202609-1024/);
    await page.screenshot({ path:path.join(evidenceDir,'statement-invoice-1440x900.png'), fullPage:true });

    await page.reload();
    await page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    await page.getByRole('button', { name:'确认账单', exact:true }).click();
    await page.getByRole('dialog', { name:'确认账单' }).getByRole('button', { name:'确认账单', exact:true }).click();
    assert.match(await page.getByRole('dialog', { name:'账单详情' }).innerText(), /已确认/);
    assert.doesNotMatch(await page.getByRole('dialog', { name:'账单详情' }).innerText(), /账单已锁定/);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('三本账可筛选、可按来源核对并导出完整审计字段', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 }, acceptDownloads:true });
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    await page.getByRole('button', { name:'对账流水', exact:true }).click();

    const sourceFilter = page.getByLabel('业务来源');
    assert.equal(await sourceFilter.count(), 1);
    for (const option of ['平台直销','外部 Key 采购','盖世 Key 渠道']) {
      assert.equal(await sourceFilter.locator('option', { hasText:option }).count(), 1);
    }
    assert.match(await page.locator('thead').innerText(), /业务来源／履约方式/);
    await sourceFilter.selectOption('direct_sale');
    const filteredRows = page.locator('tbody tr[data-ledger-source]');
    assert.ok(await filteredRows.count() > 0);
    assert.deepEqual(await filteredRows.evaluateAll(rows => [...new Set(rows.map(row => row.dataset.ledgerSource))]), ['direct_sale']);

    await sourceFilter.selectOption('all');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name:'导出', exact:true }).click();
    const download = await downloadPromise;
    const exported = fs.readFileSync(await download.path(), 'utf8');
    for (const header of ['业务来源','履约方式','交易原币','汇率版本','规则版本','结算对手方']) {
      assert.match(exported, new RegExp('"' + header + '"'));
    }

    await page.getByRole('button', { name:'对账单', exact:true }).click();
    await page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    const drawer = page.getByRole('dialog', { name:'账单详情' });
    for (const source of ['direct_sale','external_key','gamehub_key']) {
      assert.equal(await drawer.locator('[data-source-subtotal="' + source + '"]').count(), 1);
    }

    const model = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
    assert.deepEqual(model.statementStatuses.sort(), ['confirmed','disputed','draft','locked','pending','voided']);
    assert.deepEqual(model.disputeStatuses.sort(), ['accepted','cancelled','processing','rejected','supplement']);
    assert.deepEqual(model.invoiceStatuses.sort(), ['approved','not_required','pending','rejected','reviewing']);
    assert.equal(model.invoiceDataComplete, true);
    assert.equal(model.invoiceAmountsAreIntegers, true);

    assert.equal(await drawer.getByRole('heading', { name:'发票', exact:true }).count(), 0);
    await drawer.getByRole('button', { name:'关闭', exact:true }).last().click();
    await page.locator('[data-statement-id="STMT-2026-06-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    assert.equal(await page.getByRole('dialog', { name:'账单详情' }).getByRole('heading', { name:'发票', exact:true }).count(), 1);
  } finally {
    await page.close();
  }
});

test('差异支持四种输入模型、不可变提交快照和追加补充时间线', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    await page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    await page.getByRole('button', { name:'提交差异', exact:true }).click();
    const type = page.getByLabel('差异类型');

    await type.selectOption('missing_transaction');
    assert.equal(await page.getByLabel('开发者侧订单号').count(), 1);
    assert.equal(await page.getByLabel('业务参考号').count(), 1);
    assert.equal(await page.getByLabel('对账流水号（可多选）').count(), 0);

    await type.selectOption('key_quantity');
    assert.equal(await page.getByLabel('Key 批次').count(), 1);
    assert.equal(await page.getByLabel('渠道').count(), 1);
    assert.equal(await page.getByLabel('平台数量').count(), 1);
    assert.equal(await page.getByLabel('期望数量').count(), 1);

    await type.selectOption('fee_tax_fx');
    assert.equal(await page.getByLabel('流水或账单项').count(), 1);
    assert.equal(await page.getByLabel('期望金额').count(), 1);

    await type.selectOption('existing_flow');
    const flowSelect = page.getByLabel('对账流水号（可多选）');
    assert.equal(await flowSelect.getAttribute('multiple'), '');
    const flowIds = await flowSelect.locator('option').evaluateAll(options => options.slice(0,2).map(option => option.value));
    await flowSelect.selectOption(flowIds);
    await page.getByLabel('期望金额').fill('18520.36');
    await page.getByLabel('差异说明').fill('两条流水金额与开发者侧销售明细不一致。');
    await page.locator('[data-dispute-file]').setInputFiles({ name:'reconciliation-proof.csv', mimeType:'text/csv', buffer:Buffer.from('id,amount') });
    await page.getByRole('button', { name:'提交差异', exact:true }).click();

    const submitted = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
    const latest = submitted.disputeRecords.find(item => item.statementId === 'STMT-2026-08-V1' && item.type === 'existing_flow');
    assert.deepEqual(latest.submissionSnapshot.flowIds, flowIds);
    assert.equal(latest.submissionSnapshot.reason, '两条流水金额与开发者侧销售明细不一致。');
    assert.equal(latest.timeline[0].action, 'submitted');
    assert.equal(submitted.disputeSnapshotsImmutable, true);

    await page.getByRole('button', { name:'关闭', exact:true }).last().click();
    await page.locator('[data-statement-id="STMT-2026-07-V2"]').getByRole('button', { name:'查看', exact:true }).click();
    await page.getByRole('button', { name:'差异记录', exact:true }).click();
    const before = await page.evaluate(() => {
      const record = window.__developerFinanceDemo.snapshot().disputeRecords.find(item => item.status === 'supplement');
      return JSON.stringify(record.submissionSnapshot);
    });
    await page.getByRole('button', { name:'补充材料', exact:true }).click();
    await page.getByLabel('补充说明').fill('补充开发者侧订单和销售明细。');
    await page.locator('[data-dispute-file]').setInputFiles({ name:'supplement.csv', mimeType:'text/csv', buffer:Buffer.from('order,amount') });
    await page.getByRole('button', { name:'提交补充', exact:true }).click();
    const supplemented = await page.evaluate(() => {
      const record = window.__developerFinanceDemo.snapshot().disputeRecords.find(item => item.id === 'DSP-202608-0042');
      return {
        snapshot:JSON.stringify(record.submissionSnapshot),
        supplementCount:record.supplements.length,
        actions:record.timeline.map(item => item.action),
      };
    });
    assert.equal(supplemented.snapshot, before);
    assert.equal(supplemented.supplementCount, 1);
    assert.deepEqual(supplemented.actions.slice(-2), ['supplement_requested','supplemented']);
  } finally {
    await page.close();
  }
});

test('差异数值不可留空且交易遗漏可仅用业务参考号提交', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    await page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    await page.getByRole('button', { name:'提交差异', exact:true }).click();

    await page.getByLabel('差异说明').fill('已有流水金额为空校验。');
    await page.getByRole('button', { name:'提交差异', exact:true }).click();
    const alert = page.getByRole('alert');
    assert.match(await alert.innerText(), /有效期望金额/);
    assert.equal(await alert.getAttribute('aria-live'), 'polite');
    assert.equal(await page.getByLabel('期望金额').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.getByLabel('期望金额').getAttribute('aria-describedby'), await alert.getAttribute('id'));
    assert.equal(await page.getByLabel('差异说明').getAttribute('aria-invalid'), null);

    const type = page.getByLabel('差异类型');
    await type.selectOption('key_quantity');
    await page.getByLabel('Key 批次').fill('GHK-EMPTY-NUMBER');
    await page.getByLabel('期望数量').fill('0');
    await page.getByLabel('差异说明').fill('数量必须为正整数。');
    await page.getByRole('button', { name:'提交差异', exact:true }).click();
    assert.match(await page.getByRole('alert').innerText(), /有效期望数量/);
    assert.equal(await page.getByLabel('期望数量').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.getByLabel('Key 批次').getAttribute('aria-invalid'), null);

    await page.getByLabel('差异类型').selectOption('fee_tax_fx');
    await page.getByLabel('差异说明').fill('费用金额为空校验。');
    await page.getByRole('button', { name:'提交差异', exact:true }).click();
    assert.equal(await page.getByLabel('期望金额').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.getByLabel('流水或账单项').getAttribute('aria-invalid'), null);

    await page.getByLabel('差异类型').selectOption('missing_transaction');
    await page.getByLabel('业务参考号').fill('BIZ-REF-ONLY-202609');
    await page.getByLabel('期望金额').fill('88.00');
    await page.getByLabel('差异说明').fill('业务参考号存在，但平台未生成流水。');
    await page.getByRole('button', { name:'提交差异', exact:true }).click();
    const model = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
    const record = model.disputeRecords.find(item => item.submissionSnapshot.businessReference === 'BIZ-REF-ONLY-202609');
    assert.ok(record);
    assert.equal(record.submissionSnapshot.developerOrderNo, '');
    assert.deepEqual(record.submissionSnapshot.flowIds, []);
    assert.equal(record.submissionSnapshot.expectedMinor, 8800);
  } finally {
    await page.close();
  }
});

test('费用税费汇率差异切换账单项后平台金额与提交快照一致', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    await page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    await page.getByRole('button', { name:'提交差异', exact:true }).click();
    await page.getByLabel('差异类型').selectOption('fee_tax_fx');
    const platformAmount = page.locator('[data-testid="platform-amount"] strong');
    const taxText = await platformAmount.innerText();
    await page.getByLabel('流水或账单项').selectOption('statement_fee');
    const feeText = await platformAmount.innerText();
    assert.notEqual(feeText, taxText);
    await page.getByLabel('期望金额').fill('0.00');
    await page.getByLabel('差异说明').fill('支付费口径需要复核。');
    await page.getByRole('button', { name:'提交差异', exact:true }).click();
    const record = await page.evaluate(() => window.__developerFinanceDemo.snapshot().disputeRecords.find(item => item.statementId === 'STMT-2026-08-V1' && item.submissionSnapshot.itemRef === 'statement_fee'));
    const expectedDisplay = 'USD ' + (record.submissionSnapshot.platformMinor / 100).toLocaleString('zh-CN', { minimumFractionDigits:2, maximumFractionDigits:2 });
    assert.equal(feeText, expectedDisplay);
  } finally {
    await page.close();
  }
});

test('三张表关键词输入后页面与直接导出口径一致', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  const assertFilterAndExport = async ({ selector, keyword, group, countKey }) => {
    const input = page.locator(selector);
    const beforeRows = await page.locator('tbody tr').count();
    const total = (await page.evaluate(() => window.__developerFinanceDemo.snapshot())).counts[countKey];
    await input.fill(keyword);
    assert.equal(await input.evaluate(node => node === document.activeElement), true);
    assert.equal(await page.locator('tbody tr').count(), beforeRows);
    const exported = await page.evaluate(value => window.__developerFinanceDemo.exportCsv(value), group);
    assert.equal(exported.trim().split('\n').length, total + 1);
    assert.doesNotMatch(exported, new RegExp(keyword));
  };
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    await assertFilterAndExport({ selector:'#d15-statement-keyword', keyword:'DRAFT-ONLY-STATEMENT', group:'statement', countKey:'statements' });

    await page.getByRole('button', { name:'对账流水', exact:true }).click();
    await assertFilterAndExport({ selector:'#d15-flow-keyword', keyword:'DRAFT-ONLY-FLOW', group:'flow', countKey:'flows' });

    await page.locator('[data-route="payments"]').click();
    await assertFilterAndExport({ selector:'#d15-payment-keyword', keyword:'DRAFT-ONLY-PAYMENT', group:'payment', countKey:'payments' });
  } finally {
    await page.close();
  }
});

test('财务主体未生效时只允许查看账单', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(url('/entity'), { waitUntil:'load' });
    await page.evaluate(() => window.__developerFinanceDemo.setEntityScenario('unconfigured'));
    await page.locator('[data-route="reconciliation"]').click();
    assert.match(await page.locator('main').innerText(), /财务操作暂不可用/);
    await page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    assert.equal(await page.getByRole('button', { name:'确认账单', exact:true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name:'提交差异', exact:true }).isDisabled(), true);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('财务主体按收款地区校验且暂停付款不影响历史核账', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  try {
    await page.goto(url('/entity'), { waitUntil:'load' });
    await page.getByRole('button', { name:'申请变更', exact:true }).click();
    const currency = page.getByLabel('结算币种');
    assert.equal(await currency.inputValue(), 'USD');
    assert.equal(await currency.isEditable(), false);
    assert.match(await currency.locator('..').innerText(), /联系商务更新合同/);

    await page.locator('[data-entity-file="bankProof"]').setInputFiles({ name:'bank-proof.pdf', mimeType:'application/pdf', buffer:Buffer.from('bank proof') });
    await page.getByLabel('财务邮箱').fill('bad-mail');
    await page.getByRole('button', { name:'提交审核', exact:true }).click();
    assert.equal(await page.locator('[data-testid="entity-error"]').innerText(), '请填写有效财务邮箱。');

    await page.evaluate(() => window.__developerFinanceDemo.setEntityScenario('suspended'));
    await page.locator('[data-route="reconciliation"]').click();
    assert.doesNotMatch(await page.locator('main').innerText(), /财务操作暂不可用/);
    await page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    assert.equal(await page.getByRole('button', { name:'确认账单', exact:true }).isDisabled(), false);
    assert.equal(await page.getByRole('button', { name:'提交差异', exact:true }).isDisabled(), false);

    await page.getByRole('button', { name:'关闭', exact:true }).last().click();
    await page.locator('[data-route="payments"]').click();
    assert.match(await page.locator('main').innerText(), /付款暂停/);
  } finally {
    await page.close();
  }
});

test('SWIFT必填规则随收款地区和结算币种联动并返回单一准确错误', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  try {
    await page.goto(url('/entity'), { waitUntil:'load' });
    await page.evaluate(() => window.__developerFinanceDemo.setEntityScenario('effective', {
      bankRegion:'中国大陆', settlementCurrency:'CNY', swift:'',
    }));
    await page.getByRole('button', { name:'申请变更', exact:true }).click();
    assert.equal(await page.getByLabel('SWIFT / BIC').getAttribute('aria-required'), 'false');

    await page.getByLabel('财务联系人').fill('');
    await page.getByRole('button', { name:'提交审核', exact:true }).click();
    assert.equal(await page.locator('[data-testid="entity-error"]').innerText(), '请补全必填资料。');

    await page.getByLabel('财务联系人').fill('王明');
    await page.locator('[data-entity-file="bankProof"]').setInputFiles({ name:'bank-proof.pdf', mimeType:'application/pdf', buffer:Buffer.from('bank proof') });
    await page.getByRole('button', { name:'提交审核', exact:true }).click();
    assert.match(await page.locator('main').innerText(), /变更审核中/);

    await page.evaluate(() => window.__developerFinanceDemo.setEntityScenario('effective', {
      bankRegion:'中国香港', settlementCurrency:'USD', swift:'BAD',
    }));
    await page.getByRole('button', { name:'申请变更', exact:true }).click();
    assert.equal(await page.getByLabel('SWIFT / BIC').getAttribute('aria-required'), 'true');
    await page.locator('[data-entity-file="bankProof"]').setInputFiles({ name:'bank-proof.pdf', mimeType:'application/pdf', buffer:Buffer.from('bank proof') });
    await page.getByRole('button', { name:'提交审核', exact:true }).click();
    assert.equal(await page.locator('[data-testid="entity-error"]').innerText(), '请填写有效 SWIFT / BIC。');
  } finally {
    await page.close();
  }
});

test('当前申请与历史版本分开展示且历史快照不可被当前资料补齐', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/entity'), { waitUntil:'load' });
    const history = page.getByRole('region', { name:'财务主体历史版本' });
    const historyText = await history.innerText();
    for (const status of ['审核中','需补充','已拒绝','已撤销','已生效','已停用']) {
      assert.match(historyText, new RegExp(status));
    }

    await page.evaluate(() => window.__developerFinanceDemo.setEntityScenario('change_reviewing', {
      accountName:'当前申请专用账户名', submittedVersion:'FIN-2026-010',
    }));
    assert.equal(await page.getByRole('region', { name:'当前申请' }).count(), 1);
    assert.equal(await page.getByRole('region', { name:'财务主体历史版本' }).count(), 1);
    await history.getByRole('button', { name:'查看', exact:true }).last().click();
    const drawer = page.getByRole('dialog', { name:'财务主体版本' });
    assert.doesNotMatch(await drawer.innerText(), /当前申请专用账户名/);
    assert.match(await drawer.innerText(), /—/);
  } finally {
    await page.close();
  }
});

test('穷举态与缺省态分别保存当前申请快照', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/entity'), { waitUntil:'load' });
    await page.getByRole('button', { name:'申请变更', exact:true }).click();
    await page.locator('[data-entity-file="bankProof"]').setInputFiles({ name:'bank-proof.pdf', mimeType:'application/pdf', buffer:Buffer.from('bank proof') });
    await page.getByLabel('财务联系人').fill('穷举态新联系人');
    await page.getByRole('button', { name:'提交审核', exact:true }).click();
    assert.match(await page.getByRole('region', { name:'当前申请' }).innerText(), /穷举态新联系人/);

    await page.evaluate(() => window.__developerFinanceDemo.setDemoScenario('empty'));
    await page.getByRole('button', { name:'配置财务主体', exact:true }).click();
    await page.getByLabel('财务联系人').fill('缺省态联系人');
    await page.getByRole('button', { name:'提交审核', exact:true }).click();
    assert.match(await page.getByRole('region', { name:'当前申请' }).innerText(), /缺省态联系人/);

    await page.evaluate(() => window.__developerFinanceDemo.setDemoScenario('exhaustive'));
    const current = page.getByRole('region', { name:'当前申请' });
    assert.match(await current.innerText(), /穷举态新联系人/);
    assert.doesNotMatch(await current.innerText(), /缺省态联系人/);
    await current.getByRole('button', { name:'查看提交内容', exact:true }).click();
    const submitted = page.getByRole('dialog', { name:'提交内容' });
    assert.match(await submitted.innerText(), /穷举态新联系人/);
    assert.doesNotMatch(await submitted.innerText(), /缺省态联系人/);
  } finally {
    await page.close();
  }
});

test('主体校验错误可被辅助技术感知且只关联对应字段', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  try {
    await page.goto(url('/entity'), { waitUntil:'load' });
    await page.getByRole('button', { name:'申请变更', exact:true }).click();
    await page.locator('[data-entity-file="bankProof"]').setInputFiles({ name:'bank-proof.pdf', mimeType:'application/pdf', buffer:Buffer.from('bank proof') });
    await page.getByLabel('财务邮箱').fill('bad-mail');
    await page.getByRole('button', { name:'提交审核', exact:true }).click();
    const alert = page.getByRole('alert');
    assert.equal(await alert.getAttribute('aria-live'), 'assertive');
    assert.equal(await alert.getAttribute('id'), 'd15-entity-error');
    assert.equal(await page.getByLabel('财务邮箱').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.getByLabel('财务邮箱').getAttribute('aria-describedby'), 'd15-entity-error');
    assert.equal(await page.getByLabel('SWIFT / BIC').getAttribute('aria-invalid'), 'false');

    await page.getByLabel('财务邮箱').fill('finance@example.com');
    await page.getByLabel('SWIFT / BIC').fill('BAD');
    await page.locator('[data-entity-file="bankProof"]').setInputFiles({
      name:'bank-proof.pdf', mimeType:'application/pdf', buffer:Buffer.from('bank proof'),
    });
    await page.getByRole('button', { name:'提交审核', exact:true }).click();
    assert.equal(await page.getByLabel('SWIFT / BIC').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.getByLabel('SWIFT / BIC').getAttribute('aria-describedby'), 'd15-entity-error');
    assert.equal(await page.getByLabel('财务邮箱').getAttribute('aria-invalid'), 'false');
  } finally {
    await page.close();
  }
});

test('银行地区账户或SWIFT变化后要求重新上传账户证明', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  const proof = {
    name:'bank-proof.pdf', mimeType:'application/pdf', buffer:Buffer.from('bank proof'),
  };
  try {
    await page.goto(url('/entity'), { waitUntil:'load' });
    await page.getByRole('button', { name:'申请变更', exact:true }).click();
    const proofLabel = page.locator('[data-file-label="bankProof"]');
    assert.match(await proofLabel.innerText(), /请重新上传账户证明/);
    const prefilledAccount = await page.getByLabel('银行账号').inputValue();
    await page.locator('[data-entity-file="bankProof"]').setInputFiles(proof);

    await page.getByLabel('银行国家或地区').selectOption('新加坡');
    assert.match(await proofLabel.innerText(), /请重新上传账户证明/);
    await page.locator('[data-entity-file="bankProof"]').setInputFiles(proof);
    assert.equal(await proofLabel.innerText(), 'bank-proof.pdf');

    await page.getByLabel('银行账号').fill('9988776655');
    assert.match(await proofLabel.innerText(), /请重新上传账户证明/);
    await page.locator('[data-entity-file="bankProof"]').setInputFiles(proof);
    await page.getByLabel('银行账号').fill(prefilledAccount);
    assert.match(await proofLabel.innerText(), /请重新上传账户证明/);
    await page.locator('[data-entity-file="bankProof"]').setInputFiles(proof);

    await page.getByLabel('SWIFT / BIC').fill('DBSSSGSG');
    assert.match(await proofLabel.innerText(), /请重新上传账户证明/);
  } finally {
    await page.close();
  }
});

test('付款记录覆盖完整状态且不提供开发者打款操作', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(url('/payments'), { waitUntil:'load' });
    assert.equal(await page.locator('tbody tr').count(), 20);
    const text = await page.locator('main').innerText();
    for (const status of ['待具备条件','待付款','处理中','已汇出','已完成','失败','退回','暂缓','已结转','已取消']) {
      assert.match(text, new RegExp(status));
    }
    assert.doesNotMatch(text, /提现|发起付款|标记到账/);
    await page.locator('[data-payment-id="PAY-202606-001"]').getByRole('button', { name:'查看', exact:true }).click();
    const drawer = page.getByRole('dialog', { name:'付款详情' });
    assert.match(await drawer.innerText(), /银行参考号/);
    assert.match(await drawer.innerText(), /下载付款凭证/);
    await page.screenshot({ path:path.join(evidenceDir,'payments-all-statuses-1440x900.png'), fullPage:true });
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('付款单使用付款尝试时间线且仅当前真实汇出后提供凭证', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/payments'), { waitUntil:'load' });
    const model = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
    assert.equal(model.paymentOrdersUnique, true);
    assert.equal(model.paymentAttemptsLinked, true);
    assert.equal(model.paymentAmountsConsistent, true);
    assert.equal(model.paymentTimelineValid, true);
    assert.equal(model.paymentAttemptTransitionsValid, true);
    assert.equal(model.paymentEffectiveAmountsConsistent, true);

    const completedAudit = model.paymentAttemptAudit.find(item => item.id === 'PAY-202606-001');
    assert.equal(completedAudit.attemptCount, 1);
    assert.deepEqual(completedAudit.attempts[0].statuses, ['processing','remitted','completed']);
    assert.equal(completedAudit.effectiveRemittedMinor, completedAudit.amountMinor);

    const returnedAudit = model.paymentAttemptAudit.find(item => item.id === 'PAY-202605-001');
    assert.equal(returnedAudit.attemptCount, 2);
    assert.deepEqual(returnedAudit.attempts[1].statuses, ['processing','remitted','returned']);
    assert.equal(returnedAudit.effectiveRemittedMinor, 0);

    const invalidFixture = await page.evaluate(() => {
      const fixture = window.__developerFinanceDemo.paymentAuditFixture();
      const payment = fixture.payments.find(item => item.id === 'PAY-202606-001');
      const original = payment.attempts[0];
      payment.attempts = [
        { ...original, id:original.id + '-SPLIT-1', events:original.events.slice(0,2) },
        { ...original, id:original.id + '-SPLIT-2', createdAt:original.events[2].at, events:[original.events[2]] },
      ];
      return window.__developerFinanceDemo.auditPayments(fixture);
    });
    assert.equal(invalidFixture.paymentAttemptTransitionsValid, false);
    assert.equal(invalidFixture.paymentEffectiveAmountsConsistent, false);

    await page.locator('[data-payment-id="PAY-202605-001"]').getByRole('button', { name:'查看', exact:true }).click();
    const returned = page.getByRole('dialog', { name:'付款详情' });
    const returnedText = await returned.innerText();
    assert.match(returnedText, /退回原因/);
    assert.match(returnedText, /开发者是否需处理/);
    assert.match(returnedText, /预计重试时间/);
    assert.match(returnedText, /下一次付款尝试/);
    assert.match(returnedText, /已汇出[\s\S]*退回/);
    assert.doesNotMatch(returnedText, /下载付款凭证/);

    await returned.getByRole('button', { name:'关闭', exact:true }).last().click();
    await page.locator('[data-payment-id="PAY-202607-001"]').getByRole('button', { name:'查看', exact:true }).click();
    const partial = page.getByRole('dialog', { name:'付款详情' });
    assert.match(await partial.innerText(), /本次付款金额/);
    assert.match(await partial.innerText(), /剩余金额/);
  } finally {
    await page.close();
  }
});

test('账单付款历史抽屉与确认框统一锁定焦点并逐层恢复', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  const assertBackgroundInert = async expected => {
    for (const selector of ['.gh-topbar','.gh-layout']) {
      assert.equal(await page.locator(selector).getAttribute('inert'), expected ? '' : null);
    }
  };
  const assertFocusInside = async dialog => {
    assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true);
  };
  const assertFocusLoop = async dialog => {
    const focusable = dialog.locator('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]');
    const count = await focusable.count();
    assert.ok(count > 1);
    await focusable.last().focus();
    await page.keyboard.press('Tab');
    assert.equal(await focusable.first().evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await focusable.last().evaluate(node => node === document.activeElement), true);
  };
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    const statementOpener = page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true });
    assert.equal(await statementOpener.getAttribute('data-focus-key'), 'statement-STMT-2026-08-V1');
    await statementOpener.focus();
    await statementOpener.click();
    const statementDrawer = page.getByRole('dialog', { name:'账单详情' });
    await assertBackgroundInert(true);
    await assertFocusInside(statementDrawer);
    await assertFocusLoop(statementDrawer);

    const confirmTrigger = statementDrawer.getByRole('button', { name:'确认账单', exact:true });
    assert.equal(await confirmTrigger.getAttribute('data-focus-key'), 'confirm-statement-STMT-2026-08-V1');
    await confirmTrigger.click();
    const confirmDialog = page.getByRole('dialog', { name:'确认账单' });
    assert.equal(await page.getByRole('dialog').count(), 2);
    await assertFocusInside(confirmDialog);
    await assertFocusLoop(confirmDialog);
    await page.keyboard.press('Escape');
    assert.equal(await confirmDialog.count(), 0);
    assert.equal(await statementDrawer.count(), 1);
    assert.equal(await confirmTrigger.evaluate(node => node === document.activeElement), true);
    await assertBackgroundInert(true);

    await page.keyboard.press('Escape');
    assert.equal(await statementDrawer.count(), 0);
    assert.equal(await statementOpener.evaluate(node => node === document.activeElement), true);
    await assertBackgroundInert(false);

    await page.locator('[data-route="payments"]').click();
    const paymentOpener = page.locator('[data-payment-id="PAY-202605-001"]').getByRole('button', { name:'查看', exact:true });
    assert.equal(await paymentOpener.getAttribute('data-focus-key'), 'payment-PAY-202605-001');
    await paymentOpener.click();
    await assertFocusInside(page.getByRole('dialog', { name:'付款详情' }));
    await page.keyboard.press('Escape');
    assert.equal(await paymentOpener.evaluate(node => node === document.activeElement), true);

    await page.locator('[data-route="entity"]').click();
    const historyRow = page.getByRole('region', { name:'财务主体历史版本' }).locator('tbody tr').first();
    const historyOpener = historyRow.getByRole('button', { name:'查看', exact:true });
    assert.match(await historyOpener.getAttribute('data-focus-key'), /^history-FIN-/);
    await historyOpener.click();
    await assertFocusInside(page.getByRole('dialog', { name:'财务主体版本' }));
    await page.keyboard.press('Escape');
    assert.equal(await historyOpener.evaluate(node => node === document.activeElement), true);

    await page.evaluate(() => window.__developerFinanceDemo.setEntityScenario('change_reviewing'));
    const withdrawTrigger = page.getByRole('button', { name:'撤销审核', exact:true });
    assert.equal(await withdrawTrigger.getAttribute('data-focus-key'), 'withdraw-entity-review');
    await withdrawTrigger.click();
    const withdrawDialog = page.getByRole('dialog', { name:'撤销审核' });
    await assertFocusInside(withdrawDialog);
    await page.keyboard.press('Escape');
    assert.equal(await withdrawTrigger.evaluate(node => node === document.activeElement), true);
    await assertBackgroundInert(false);
  } finally {
    await page.close();
  }
});

test('hash变化关闭旧路由覆盖层并恢复页面交互状态', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    await page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    assert.equal(await page.getByRole('dialog', { name:'账单详情' }).count(), 1);
    assert.equal(await page.locator('.gh-layout').getAttribute('inert'), '');
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');

    await page.evaluate(() => { location.hash = '/payments'; });
    await page.waitForFunction(() => location.hash === '#/payments' && !document.querySelector('[role="dialog"]'));
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.equal(await page.locator('.gh-topbar').getAttribute('inert'), null);
    assert.equal(await page.locator('.gh-layout').getAttribute('inert'), null);
    assert.equal(await page.locator('[data-route="payments"]').evaluate(node => node === document.activeElement), true);

    const state = await page.evaluate(() => window.__developerFinanceDemo.overlaySnapshot());
    assert.deepEqual(state, {
      activeStatement:'', activePayment:'', selectedHistory:'', dialog:'', disputeMode:false,
      disputeFile:'', invoiceFile:'', focusDepth:0,
    });
  } finally {
    await page.close();
  }
});

test('三张表按当前场景和已应用筛选导出分页前完整安全字段', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  const csvLines = value => value.trim() ? value.trim().split('\n') : [];
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    await page.getByRole('button', { name:'下一页', exact:true }).click();
    const statementCsv = await page.evaluate(() => window.__developerFinanceDemo.exportCsv('statement'));
    const model = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
    assert.equal(csvLines(statementCsv).length, model.counts.statements + 1);
    for (const header of ['账单号','账期','版本','折算后销售额','退款','拒付','税费','支付费','平台分成','补贴与调整','应结算','币种','生成时间','确认期限','账单状态','付款状态','平台直销小计','外部 Key 采购小计','盖世 Key 渠道小计']) {
      assert.match(statementCsv, new RegExp('"' + header.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '"'));
    }
    assert.match(statementCsv, /"18420\.36"/);
    assert.doesNotMatch(statementCsv, /"1842036"/);

    await page.getByRole('button', { name:'对账流水', exact:true }).click();
    await page.getByLabel('业务来源').selectOption('direct_sale');
    await page.getByRole('button', { name:'下一页', exact:true }).click();
    const flowCsv = await page.evaluate(() => window.__developerFinanceDemo.exportCsv('flow'));
    assert.ok(csvLines(flowCsv).length > 21, '导出应包含筛选后的分页前完整结果');
    for (const header of ['业务来源','履约方式','交易原币','汇率版本','规则版本','结算对手方']) {
      assert.match(flowCsv, new RegExp('"' + header + '"'));
    }
    assert.doesNotMatch(flowCsv, /外部 Key 采购|盖世 Key 渠道/);

    await page.locator('[data-route="payments"]').click();
    await page.getByRole('button', { name:'下一页', exact:true }).click();
    const paymentCsv = await page.evaluate(() => window.__developerFinanceDemo.exportCsv('payment'));
    assert.equal(csvLines(paymentCsv).length, model.counts.payments + 1);
    for (const header of ['付款单号','账单号','付款状态','付款金额','剩余金额','币种','收款账户','财务主体版本','计划付款日','生成时间','更新时间','付款尝试数','当前尝试状态','银行参考号']) {
      assert.match(paymentCsv, new RegExp('"' + header + '"'));
    }
    for (const exported of [statementCsv,flowCsv,paymentCsv]) {
      assert.doesNotMatch(exported, /782612340098|玩家身份|GHK-[A-Z0-9-]+/);
      assert.doesNotMatch(exported, /Minor/);
    }
    const escapedCells = await page.evaluate(() => {
      const cell = window.__developerFinanceDemo.csvCell;
      return ['=2+3','@SUM(A1)','\t=2+3','\r=2+3','\n=2+3',' =2+3','  -2+3'].map(cell);
    });
    assert.deepEqual(escapedCells, [
      '"\'=2+3"','"\'@SUM(A1)"','"\'\t=2+3"','"\'\r=2+3"','"\'\n=2+3"','"\' =2+3"','"\'  -2+3"',
    ]);
    for (const cell of escapedCells) {
      assert.match(cell, /^"'/);
      assert.doesNotMatch(cell, /^"[\t\r\n ]*[=+\-@]/);
    }

    await page.evaluate(() => window.__developerFinanceDemo.setDemoScenario('empty'));
    for (const group of ['statement','flow','payment']) {
      const emptyCsv = await page.evaluate(value => window.__developerFinanceDemo.exportCsv(value), group);
      assert.equal(csvLines(emptyCsv).length, 1);
    }
  } finally {
    await page.close();
  }
});

test('390px视口无根节点横向溢出', async () => {
  const page = await browser.newPage({ viewport:{ width:390, height:844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const route of ['/entity','/reconciliation','/payments']) {
      await page.goto(url(route), { waitUntil:'load' });
      const geometry = await page.evaluate(() => ({
        scrollWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
      }));
      assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, route + ' has root overflow');
    }
    await page.evaluate(() => scrollTo(0,document.documentElement.scrollHeight));
    const orb = page.locator('[data-testid="scenario-orb"]');
    const pagination = page.locator('.gh-pagination');
    const [orbBox,paginationBox] = await Promise.all([orb.boundingBox(),pagination.boundingBox()]);
    assert.ok(orbBox && paginationBox);
    const overlaps = orbBox.x < paginationBox.x + paginationBox.width && orbBox.x + orbBox.width > paginationBox.x && orbBox.y < paginationBox.y + paginationBox.height && orbBox.y + orbBox.height > paginationBox.y;
    assert.equal(overlaps, false, 'scenario orb overlaps pagination');
    await orb.click();
    const menuBox = await page.getByRole('menu', { name:'Demo 场景' }).boundingBox();
    assert.ok(menuBox && menuBox.x >= 0 && menuBox.x + menuBox.width <= 390, 'scenario menu stays inside viewport');
    await page.screenshot({ path:path.join(evidenceDir,'payments-390x844.png'), fullPage:true });
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

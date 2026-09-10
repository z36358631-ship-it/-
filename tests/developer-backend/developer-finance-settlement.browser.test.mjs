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
    await page.getByLabel('差异类型').selectOption('rate');
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

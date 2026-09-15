import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ledgerUrl = new URL('../../demos/开发者后台一期/src/finance-ledger/model.js', import.meta.url);
const modelUrl = new URL('../../demos/开发者后台一期/src/finance-statements/model.js', import.meta.url);

const loadModel = () => {
  const scope = { window:{} };
  vm.runInNewContext(fs.readFileSync(ledgerUrl, 'utf8'), scope);
  vm.runInNewContext(fs.readFileSync(modelUrl, 'utf8'), scope);
  return scope.window.PublisherSettlementStatements;
};
const plain = value => JSON.parse(JSON.stringify(value));

test('共享结算模型暴露固定接口', () => {
  const model = loadModel();
  assert.deepEqual(Object.keys(model).sort(), [
    'confirmStatements',
    'createState',
    'exportStatementsCsv',
    'financialEntity',
    'financialEntityApplications',
    'nextMonth',
    'ratioFor',
    'reviewFinancialEntity',
    'saveRatioVersion',
    'statementsFor',
    'submitFinancialEntity',
  ].sort());
});

test('结算单固定 N+1，默认 70% 并按分四舍五入', () => {
  const model = loadModel();
  const state = model.createState();
  const rows = model.statementsFor(state, { developerId:'DEV-1001' });
  assert.ok(rows.length >= 9);
  assert.deepEqual([...new Set(rows.map(row => row.billingMonth))].sort(), ['2026-06','2026-07','2026-08']);
  assert.deepEqual([...new Set(rows.map(row => row.itemType))].sort(), ['chargeback_adjustment','refund_adjustment','sales_share']);
  assert.deepEqual([...new Set(rows.map(row => row.status))].sort(), ['confirmed','pending']);
  for (const row of rows) {
    assert.equal(row.settlementMonth, model.nextMonth(row.billingMonth));
    assert.equal(row.ratioPercent, 70);
    assert.equal(row.settlementMinor, Math.round(row.receivedMinor * row.ratioPercent / 100));
    assert.equal(row.currency, 'CNY');
  }
  const adjustments = rows.filter(row => row.itemType !== 'sales_share');
  assert.ok(adjustments.every(row => row.userPaidMinor === 0 && row.receivedMinor < 0 && row.settlementMinor < 0));
  assert.equal(model.nextMonth('2026-12'), '2027-01');
  assert.throws(() => model.nextMonth('2026-13'), /月份/);
});

test('结算比例校验 0%-100% 整数边界并按生效账单月选版本', () => {
  const model = loadModel();
  const state = model.createState();
  assert.equal(model.ratioFor(state, 'DEV-1001', '2026-08').ratioPercent, 70);
  for (const ratioPercent of ['', '   ', null]) {
    assert.throws(() => model.saveRatioVersion(state, { developerId:'DEV-1001', ratioPercent, effectiveBillingMonth:'2026-09', reason:'测试' }), /填写结算比例/);
  }
  assert.throws(() => model.saveRatioVersion(state, { developerId:'DEV-1001', ratioPercent:-1, effectiveBillingMonth:'2026-09', reason:'测试' }), /0%-100%/);
  assert.throws(() => model.saveRatioVersion(state, { developerId:'DEV-1001', ratioPercent:101, effectiveBillingMonth:'2026-09', reason:'测试' }), /0%-100%/);
  assert.throws(() => model.saveRatioVersion(state, { developerId:'DEV-1001', ratioPercent:70.5, effectiveBillingMonth:'2026-09', reason:'测试' }), /整数/);
  assert.throws(() => model.saveRatioVersion(state, { developerId:'DEV-1001', ratioPercent:80, effectiveBillingMonth:'2026-09', reason:'' }), /变更原因/);

  const zero = model.saveRatioVersion(state, {
    developerId:'DEV-1001', ratioPercent:0, effectiveBillingMonth:'2026-09', reason:'边界值', operator:'李然', operatedAt:'2026-09-15 10:00',
  });
  assert.equal(zero.ratioPercent, 0);
  const hundred = model.saveRatioVersion(state, {
    developerId:'DEV-1001', ratioPercent:100, effectiveBillingMonth:'2026-10', reason:'合同变更', operator:'李然', operatedAt:'2026-09-15 10:30',
  });
  assert.equal(hundred.previousRatioPercent, 0);
  assert.equal(model.ratioFor(state, 'DEV-1001', '2026-09').ratioPercent, 0);
  assert.equal(model.ratioFor(state, 'DEV-1001', '2026-10').ratioPercent, 100);
});

test('负数补扣按绝对值四舍五入，半分钱远离零', () => {
  const model = loadModel();
  const state = model.createState();
  const base = model.statementsFor(state, { developerId:'DEV-1001' })[0];
  state.statements.push({
    ...base,
    id:'ST-202609-GAME-48291-ROUNDING',
    billingMonth:'2026-09',
    settlementMonth:'2026-10',
    receivedMinor:-1,
    settlementMinor:-1,
    status:'pending',
    confirmedAt:'',
    confirmedBy:'',
    lockedAt:'',
  });

  model.saveRatioVersion(state, {
    developerId:'DEV-1001', ratioPercent:50, effectiveBillingMonth:'2026-09', reason:'舍入边界', operator:'李然',
  });
  const rounded = model.statementsFor(state, { developerId:'DEV-1001' }).find(row => row.id === 'ST-202609-GAME-48291-ROUNDING');
  assert.equal(rounded.settlementMinor, -1);
  assert.equal(Object.is(rounded.settlementMinor, -0), false);
});

test('新比例只重算未锁定账单，已锁定或已确认记录保留快照', () => {
  const model = loadModel();
  const state = model.createState();
  const beforeLocked = structuredClone(model.statementsFor(state, { developerId:'DEV-1001' }));
  const unlocked = {
    ...beforeLocked.find(row => row.itemType === 'sales_share'),
    id:'ST-202609-GAME-48291-SALES',
    billingMonth:'2026-09',
    settlementMonth:'2026-10',
    status:'pending',
    confirmedAt:'',
    confirmedBy:'',
    lockedAt:'',
  };
  const unlockedRatioVersionBefore = unlocked.ratioVersion;
  state.statements.push(unlocked);

  model.saveRatioVersion(state, {
    developerId:'DEV-1001', ratioPercent:80, effectiveBillingMonth:'2026-09', reason:'合同变更', operator:'李然', operatedAt:'2026-09-15 11:00',
  });

  const afterLocked = model.statementsFor(state, { developerId:'DEV-1001' }).filter(row => row.id !== unlocked.id);
  assert.deepEqual(plain(afterLocked), beforeLocked);
  const afterUnlocked = model.statementsFor(state, { developerId:'DEV-1001' }).find(row => row.id === unlocked.id);
  assert.equal(afterUnlocked.ratioPercent, 80);
  assert.equal(afterUnlocked.settlementMinor, Math.round(afterUnlocked.receivedMinor * 0.8));
  assert.notEqual(afterUnlocked.ratioVersion, unlockedRatioVersionBefore);
});

test('确认只处理待确认记录且重复调用幂等', () => {
  const model = loadModel();
  const state = model.createState();
  const pending = model.statementsFor(state, { status:'pending' })[0];
  const confirmed = model.statementsFor(state, { status:'confirmed' })[0];
  const changed = model.confirmStatements(state, [pending.id, confirmed.id, 'missing'], {
    confirmedAt:'2026-09-15 12:00', confirmedBy:'开发者 王明',
  });
  assert.deepEqual(plain(changed.map(row => row.id)), [pending.id]);
  assert.equal(model.statementsFor(state, { status:'confirmed' }).find(row => row.id === pending.id).confirmedBy, '开发者 王明');
  assert.deepEqual(plain(model.confirmStatements(state, [pending.id], { confirmedAt:'2026-09-15 12:01' })), []);
});

test('财务主体提交、驳回、再提交与通过保留历史版本', () => {
  const model = loadModel();
  const state = model.createState();
  const original = structuredClone(model.financialEntity(state, 'DEV-1001'));
  const base = {
    developerId:'DEV-1001', developerName:'星海互动', legalName:'深圳星海互动科技有限公司',
    contactName:'王明', phone:'18520064686', email:'finance@ocean-expedition.com',
    bankAccountName:'深圳星海互动科技有限公司', bankName:'中国建设银行深圳科技园支行',
    bankAccount:'6222000000008899', bankBranch:'中国建设银行深圳科技园支行',
    bankProof:{ name:'银行开户证明.jpg', type:'image/jpeg', size:1024 }, submittedBy:'王明', submittedAt:'2026-09-15 13:00',
  };
  assert.throws(() => model.submitFinancialEntity(state, { ...base, email:'bad-email' }), /邮箱/);
  assert.throws(() => model.submitFinancialEntity(state, { ...base, bankAccountName:'其他主体' }), /户名/);
  assert.deepEqual(plain(model.financialEntity(state, 'DEV-1001')), original);

  const first = model.submitFinancialEntity(state, base);
  assert.equal(first.status, 'pending');
  assert.equal(first.applicationType, 'change');
  assert.deepEqual(plain(model.financialEntity(state, 'DEV-1001')), original);
  const rejected = model.reviewFinancialEntity(state, first.id, { result:'rejected', reason:'附件不清晰', operator:'平台运营 李然', reviewedAt:'2026-09-15 14:00' });
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.reviewReason, '附件不清晰');
  assert.deepEqual(plain(model.financialEntity(state, 'DEV-1001')), original);

  const second = model.submitFinancialEntity(state, { ...base, bankProof:{ ...base.bankProof, name:'银行开户证明-清晰版.jpg' }, submittedAt:'2026-09-15 15:00' });
  const approved = model.reviewFinancialEntity(state, second.id, { result:'approved', operator:'平台运营 李然', reviewedAt:'2026-09-15 16:00' });
  assert.equal(approved.status, 'approved');
  assert.equal(model.financialEntity(state, 'DEV-1001').entityVersion, approved.entityVersion);
  assert.equal(model.financialEntityApplications(state, { developerId:'DEV-1001' }).length, 2);
  assert.equal(state.financialEntityVersions.some(item => item.entityVersion === original.entityVersion), true);
  assert.notEqual(first.entityVersion, model.financialEntity(state, 'DEV-2001').entityVersion);
});

test('编辑当前财务主体时始终生成新版本且审核通过后正常生效', () => {
  const model = loadModel();
  const state = model.createState();
  const current = model.financialEntity(state, 'DEV-1001');
  const application = model.submitFinancialEntity(state, {
    ...current,
    bankProof:{ ...current.bankProof },
    submittedAt:'2026-09-15 15:30',
    submittedBy:'王明',
  });

  assert.notEqual(application.entityVersion, current.entityVersion);
  model.reviewFinancialEntity(state, application.id, {
    result:'approved', operator:'平台运营 李然', reviewedAt:'2026-09-15 16:30',
  });
  assert.equal(model.financialEntity(state, 'DEV-1001').entityVersion, application.entityVersion);
});

test('首次财务主体审核通过后才成为生效版本', () => {
  const model = loadModel();
  const state = model.createState();
  const application = model.submitFinancialEntity(state, {
    developerId:'DEV-NEW', developerName:'新工作室', legalName:'深圳新工作室科技有限公司',
    contactName:'陈宇', phone:'18600001111', email:'finance@new-studio.cn', bankAccountName:'深圳新工作室科技有限公司',
    bankName:'中国银行深圳分行', bankAccount:'6210000000000001', bankBranch:'中国银行深圳分行',
    bankProof:{ name:'proof.png', type:'image/png', size:2048 },
  });
  assert.equal(application.applicationType, 'initial');
  assert.equal(model.financialEntity(state, 'DEV-NEW'), null);
  model.reviewFinancialEntity(state, application.id, { result:'approved', operator:'平台运营 李然' });
  assert.equal(model.financialEntity(state, 'DEV-NEW').legalName, '深圳新工作室科技有限公司');
});

test('CSV 根据两端选项输出对应字段并防公式注入', () => {
  const model = loadModel();
  const state = model.createState();
  const row = model.statementsFor(state, { developerId:'DEV-1001' })[0];
  const developerCsv = model.exportStatementsCsv([row], { includeDeveloper:false, includeRatioVersion:false });
  assert.match(developerCsv, /^\uFEFF"\u6e38戏 ID","\u6e38戏名称","\u8d26单月份","\u7ed3算月份","\u7ed3算项","\u7528户支付金额（CNY）","\u7ed3算比例","\u5b9e际到账金额（CNY）","\u7ed3算金额（CNY）","\u72b6态"/);
  assert.doesNotMatch(developerCsv, /开发者|结算比例版本/);
  const operationsCsv = model.exportStatementsCsv([{ ...row, developerName:'=CMD()', entityName:'+hack' }], { includeDeveloper:true, includeRatioVersion:true });
  assert.match(operationsCsv, /开发者/);
  assert.match(operationsCsv, /财务主体/);
  assert.match(operationsCsv, /结算比例版本/);
  assert.match(operationsCsv, /"'=CMD\(\)"/);
  assert.match(operationsCsv, /"'\+hack"/);
  assert.match(operationsCsv, /"70%"/);
  assert.match(operationsCsv, new RegExp(`"${(row.settlementMinor / 100).toFixed(2)}"`));
  const adjustment = model.statementsFor(state, { itemType:'refund_adjustment' })[0];
  const adjustmentCsv = model.exportStatementsCsv([adjustment]);
  assert.match(adjustmentCsv, new RegExp(`"${(adjustment.settlementMinor / 100).toFixed(2)}"`));
  assert.doesNotMatch(adjustmentCsv, /"'-\d/);

  const whitespaceCsv = model.exportStatementsCsv([
    { ...row, developerName:'\t=1+1', entityName:'  =2+2', gameName:'\r@SUM(1,1)' },
  ], { includeDeveloper:true });
  assert.match(whitespaceCsv, /"'\t=1\+1"/);
  assert.match(whitespaceCsv, /"'  =2\+2"/);
  assert.match(whitespaceCsv, /"'\r@SUM\(1,1\)"/);
});

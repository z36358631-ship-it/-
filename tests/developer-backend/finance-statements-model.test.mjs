import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const modelUrl = new URL('../../demos/开发者后台一期/src/finance-statements/model.js', import.meta.url);

const loadModel = () => {
  const scope = { window:{} };
  vm.runInNewContext(fs.readFileSync(modelUrl, 'utf8'), scope);
  return scope.window.PublisherSettlementStatements;
};
const plain = value => JSON.parse(JSON.stringify(value));

test('共享结算模型暴露结算、阶梯、主体汇总与财务主体接口', () => {
  const model = loadModel();
  for (const name of [
    'createState','nextMonth','statementsFor','confirmStatements','calculateTieredPlatformShare',
    'tierRuleFor','saveTierRule','entitySummariesFor','exportStatementsCsv','exportEntitySummariesCsv',
    'financialEntity','financialEntityApplications','submitFinancialEntity','reviewFinancialEntity',
  ]) assert.equal(typeof model[name], 'function', `${name} 应为函数`);
});

test('结算单固定 N+1，并收敛为游戏、CDKEY、退款与拒付三类', () => {
  const model = loadModel();
  const state = model.createState();
  const rows = model.statementsFor(state, { developerId:'DEV-1001' });
  assert.ok(rows.length >= 9);
  assert.deepEqual([...new Set(rows.map(row => row.billingMonth))].sort(), ['2026-06','2026-07','2026-08']);
  assert.deepEqual([...new Set(rows.map(row => row.itemType))].sort(), [
    'cdkey_sales_share','game_sales_share','refund_chargeback_adjustment',
  ]);
  assert.equal(rows.some(row => row.itemType === 'dlc_sales_share'), false);
  assert.deepEqual([...new Set(rows.map(row => row.status))].sort(), ['confirmed','pending']);
  for (const row of rows) {
    assert.equal(row.settlementMonth, model.nextMonth(row.billingMonth));
    assert.equal(row.platformReceivedMinor, row.userPaidMinor - row.paymentFeeMinor - row.taxMinor - row.refundChargebackMinor);
    assert.equal(row.payableMinor, row.platformReceivedMinor - row.platformShareMinor);
    assert.equal(row.weightedTaxRate, row.taxableMinor ? row.taxMinor / row.taxableMinor : null);
    assert.equal(Object.is(row.platformReceivedMinor, -0), false);
    assert.equal(Object.is(row.payableMinor, -0), false);
    assert.equal(row.currency, 'CNY');
  }
  assert.equal(model.nextMonth('2026-12'), '2027-01');
  assert.throws(() => model.nextMonth('2026-13'), /月份/);
});

test('游戏本体与 DLC 合并，明细金额和平台分成与主表一致', () => {
  const model = loadModel();
  const state = model.createState();
  const row = model.statementsFor(state, { developerId:'DEV-1001', itemType:'game_sales_share' })[0];
  assert.deepEqual([...new Set(row.gameSalesDetails.map(item => item.productType))].sort(), ['DLC','游戏本体']);
  for (const field of ['userPaidMinor','paymentFeeMinor','taxMinor','refundChargebackMinor','platformReceivedMinor','platformShareMinor','payableMinor']) {
    assert.equal(row.gameSalesDetails.reduce((sum, item) => sum + item[field], 0), row[field], `${field} 明细应与主表一致`);
  }
  assert.ok(row.tierRuleVersion);
  assert.match(row.tierRuleStartDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(typeof row.tierRuleEndDate, 'string');
  assert.equal(row.tierSnapshots.reduce((sum, tier) => sum + tier.shareMinor, 0), row.platformShareMinor);
});

test('CDKEY 固定 0% 平台分成，渠道明细合计与主表一致', () => {
  const model = loadModel();
  const row = model.statementsFor(model.createState(), { itemType:'cdkey_sales_share' })[0];
  assert.equal(row.platformShareRate, 0);
  assert.equal(row.platformShareMinor, 0);
  assert.equal(row.payableMinor, row.platformReceivedMinor);
  assert.equal(row.cdkeyDetails.length, 3);
  assert.deepEqual([...new Set(row.cdkeyDetails.map(item => item.productType))].sort(), ['DLC','游戏本体']);
  for (const field of ['userPaidMinor','paymentFeeMinor','taxMinor','refundChargebackMinor','platformReceivedMinor','platformShareMinor','payableMinor']) {
    assert.equal(row.cdkeyDetails.reduce((sum, item) => sum + item[field], 0), row[field], `${field} 明细应与主表一致`);
  }
});

test('退款与拒付全额冲减，不误作 100% 平台分成', () => {
  const model = loadModel();
  const row = model.statementsFor(model.createState(), { itemType:'refund_chargeback_adjustment' })[0];
  assert.equal(row.userPaidMinor, 0);
  assert.ok(row.refundChargebackMinor > 0);
  assert.ok(row.platformReceivedMinor < 0);
  assert.equal(row.platformShareRate, null);
  assert.equal(row.platformShareMinor, 0);
  assert.equal(row.payableMinor, row.platformReceivedMinor);
});

test('阶梯平台分成按分段累进计算并保留各档快照', () => {
  const model = loadModel();
  const tiers = [
    { fromMinor:0, toMinor:100000000, platformRate:30 },
    { fromMinor:100000000, toMinor:500000000, platformRate:25 },
    { fromMinor:500000000, toMinor:null, platformRate:20 },
  ];
  const result = model.calculateTieredPlatformShare(600000000, tiers);
  assert.equal(result.basisMinor, 600000000);
  assert.equal(result.platformShareMinor, 150000000);
  assert.deepEqual(plain(result.tierSnapshots.map(item => [item.chargeableMinor,item.shareMinor])), [
    [100000000,30000000],[400000000,100000000],[100000000,20000000],
  ]);
  const negative = model.calculateTieredPlatformShare(-1, tiers);
  assert.equal(negative.basisMinor, 0);
  assert.equal(negative.platformShareMinor, 0);
  assert.equal(Object.is(negative.platformShareMinor, -0), false);
});

test('阶梯规则按财务主体保存，校验档位与有效时间', () => {
  const model = loadModel();
  const state = model.createState();
  const base = { financialEntityId:'DEV-1001', startDate:'2026-09-01', endDate:'', reason:'' };
  assert.throws(() => model.saveTierRule(state, { ...base, tiers:[{ fromMinor:1, toMinor:null, platformRate:30 }] }), /首档/);
  assert.throws(() => model.saveTierRule(state, { ...base, tiers:[
    { fromMinor:0, toMinor:100000000, platformRate:30 },{ fromMinor:120000000, toMinor:null, platformRate:25 },
  ] }), /连续/);
  assert.throws(() => model.saveTierRule(state, { ...base, tiers:[
    { fromMinor:0, toMinor:100000000, platformRate:20 },{ fromMinor:100000000, toMinor:null, platformRate:25 },
  ] }), /不得高于/);
  assert.throws(() => model.saveTierRule(state, { ...base, tiers:[{ fromMinor:0, toMinor:null, platformRate:101 }] }), /0%-100%/);
  assert.throws(() => model.saveTierRule(state, { ...base, tiers:[{ fromMinor:0, toMinor:null, platformRate:'' }] }), /填写平台分成比例/);
  assert.throws(() => model.saveTierRule(state, { ...base, tiers:[
    { fromMinor:0, toMinor:'', platformRate:30 },{ fromMinor:100000000, toMinor:null, platformRate:20 },
  ] }), /第 1 档金额范围无效/);
  assert.throws(() => model.saveTierRule(state, { ...base, tiers:[
    { fromMinor:0, toMinor:100000000, platformRate:30 },{ fromMinor:'', toMinor:null, platformRate:20 },
  ] }), /第 2 档金额范围无效/);
  assert.throws(() => model.saveTierRule(state, { ...base, startDate:'2026-09-15', tiers:[{ fromMinor:0, toMinor:null, platformRate:30 }] }), /每月 1 日/);
  assert.throws(() => model.saveTierRule(state, { ...base, endDate:'2026-08-01', tiers:[{ fromMinor:0, toMinor:null, platformRate:30 }] }), /结束日期/);
  const saved = model.saveTierRule(state, { ...base, operator:'李然', operatedAt:'2026-09-15 10:00', tiers:[
    { fromMinor:0, toMinor:100000000, platformRate:30 },{ fromMinor:100000000, toMinor:500000000, platformRate:25 },{ fromMinor:500000000, toMinor:null, platformRate:20 },
  ] });
  assert.equal(saved.financialEntityId,'DEV-1001');
  assert.equal(saved.reason,'');
  assert.equal(model.tierRuleFor(state, 'DEV-1001', '2026-09-01').id, saved.id);
  assert.equal(model.tierRuleFor(state, 'DEV-1001', '2026-10-01').id, saved.id);
  assert.throws(() => model.saveTierRule(state, {
    ...base,startDate:'2026-10-01',endDate:'2027-01-01',
    tiers:[{ fromMinor:0, toMinor:null, platformRate:20 }],
  }), /时间范围.*重叠/);
});

test('新阶梯只重算未锁定账单，已锁定或已确认快照不变', () => {
  const model = loadModel();
  const state = model.createState();
  const locked = model.statementsFor(state, { developerId:'DEV-1001', itemType:'game_sales_share' })[0];
  const unlocked = { ...plain(locked), id:'ST-202609-GAME-48291-GAME', billingMonth:'2026-09', settlementMonth:'2026-10', status:'pending', confirmedAt:'', confirmedBy:'', lockedAt:'' };
  const unlockedRuleBefore = unlocked.tierRuleVersion;
  state.statements.push(unlocked);
  const lockedBefore = plain(locked);
  model.saveTierRule(state, {
    financialEntityId:'DEV-1001', startDate:'2026-09-01', endDate:'', reason:'', operator:'李然',
    tiers:[{ fromMinor:0, toMinor:null, platformRate:20 }],
  });
  assert.deepEqual(plain(model.statementsFor(state).find(row => row.id === locked.id)), lockedBefore);
  const changed = model.statementsFor(state).find(row => row.id === unlocked.id);
  assert.equal(changed.platformShareRate, 20);
  assert.equal(changed.platformShareMinor, Math.round(Math.max(0, changed.shareableNetMinor) * 0.2));
  assert.notEqual(changed.tierRuleVersion, unlockedRuleBefore);
  assert.equal(changed.tierRuleStartDate,'2026-09-01');
  assert.equal(changed.tierRuleEndDate,'');
});

test('主体汇总由共享快照生成并按金额加权综合税率', () => {
  const model = loadModel();
  const state = model.createState();
  const summaries = model.entitySummariesFor(state, { developerId:'DEV-1001', billingMonth:'2026-08' });
  assert.equal(summaries.length, 1);
  const summary = summaries[0];
  const rows = model.statementsFor(state, { developerId:'DEV-1001', billingMonth:'2026-08' });
  assert.equal(summary.gameSalesMinor, rows.filter(row => row.itemType === 'game_sales_share').reduce((sum,row) => sum + row.userPaidMinor, 0));
  assert.equal(summary.cdkeySalesMinor, rows.filter(row => row.itemType === 'cdkey_sales_share').reduce((sum,row) => sum + row.userPaidMinor, 0));
  for (const field of ['userPaidMinor','platformReceivedMinor','paymentFeeMinor','taxMinor','refundChargebackMinor','platformShareMinor','payableMinor']) {
    assert.equal(summary[field], rows.reduce((sum,row) => sum + row[field], 0), `${field} 汇总应来自结算快照`);
  }
  assert.equal(summary.weightedTaxRate, summary.taxableMinor ? summary.taxMinor / summary.taxableMinor : null);
  assert.ok(summary.entityVersion);
  assert.ok(summary.accountVersion);
  assert.ok(summary.tierRuleVersions.length > 0);
});

test('确认只处理待确认记录且重复调用幂等', () => {
  const model = loadModel();
  const state = model.createState();
  const pending = model.statementsFor(state, { status:'pending' })[0];
  const confirmed = model.statementsFor(state, { status:'confirmed' })[0];
  const changed = model.confirmStatements(state, [pending.id, confirmed.id, 'missing'], { confirmedAt:'2026-09-15 12:00', confirmedBy:'开发者 王明' });
  assert.deepEqual(plain(changed.map(row => row.id)), [pending.id]);
  assert.equal(model.statementsFor(state, { status:'confirmed' }).find(row => row.id === pending.id).confirmedBy, '开发者 王明');
  assert.deepEqual(plain(model.confirmStatements(state, [pending.id])), []);
});

test('财务主体提交、驳回、再提交与通过保留历史版本', () => {
  const model = loadModel();
  const state = model.createState();
  const original = plain(model.financialEntity(state, 'DEV-1001'));
  const base = {
    developerId:'DEV-1001', developerName:'星海互动', legalName:'深圳星海互动科技有限公司', contactName:'王明', phone:'18520064686', email:'finance@ocean-expedition.com',
    bankAccountName:'深圳星海互动科技有限公司', bankName:'中国建设银行深圳科技园支行', bankAccount:'6222000000008899', bankBranch:'中国建设银行深圳科技园支行',
    bankProof:{ name:'银行开户证明.jpg', type:'image/jpeg', size:1024 }, submittedBy:'王明', submittedAt:'2026-09-15 13:00',
  };
  assert.throws(() => model.submitFinancialEntity(state, { ...base, email:'bad-email' }), /邮箱/);
  assert.throws(() => model.submitFinancialEntity(state, { ...base, bankAccountName:'其他主体' }), /户名/);
  const first = model.submitFinancialEntity(state, base);
  assert.equal(first.applicationType, 'change');
  assert.deepEqual(plain(model.financialEntity(state, 'DEV-1001')), original);
  model.reviewFinancialEntity(state, first.id, { result:'rejected', reason:'附件不清晰', operator:'平台运营 李然' });
  const second = model.submitFinancialEntity(state, { ...base, bankProof:{ ...base.bankProof, name:'银行开户证明-清晰版.jpg' }, submittedAt:'2026-09-15 15:00' });
  const approved = model.reviewFinancialEntity(state, second.id, { result:'approved', operator:'平台运营 李然' });
  assert.equal(model.financialEntity(state, 'DEV-1001').entityVersion, approved.entityVersion);
  assert.equal(model.financialEntityApplications(state, { developerId:'DEV-1001' }).length, 2);
});

test('财务主体字段校验覆盖手机号、邮箱、账户户名和附件', () => {
  const model = loadModel();
  const state = model.createState();
  const base = {
    developerId:'DEV-NEW', developerName:'新工作室', legalName:'深圳新工作室科技有限公司', contactName:'陈宇',
    phone:'18600001111', email:'finance@new-studio.cn', bankAccountName:'深圳新工作室科技有限公司',
    bankName:'中国银行深圳分行', bankAccount:'6210000000000001', bankBranch:'中国银行深圳分行',
    bankProof:{ name:'proof.png', type:'image/png', size:2048 },
  };
  assert.throws(() => model.submitFinancialEntity(state, { ...base, phone:'123' }), /手机号/);
  assert.throws(() => model.submitFinancialEntity(state, { ...base, email:'bad-email' }), /邮箱/);
  assert.throws(() => model.submitFinancialEntity(state, { ...base, bankAccountName:'其他公司' }), /户名/);
  assert.throws(() => model.submitFinancialEntity(state, { ...base, bankProof:null }), /附件/);
  assert.throws(() => model.submitFinancialEntity(state, { ...base, bankProof:{ name:'proof.pdf', type:'application/pdf', size:2048 } }), /JPG、PNG、WEBP/);
  assert.throws(() => model.submitFinancialEntity(state, { ...base, bankProof:{ name:'proof.png', type:'image/png', size:11 * 1024 * 1024 } }), /10 MB/);
});

test('编辑当前财务主体始终生成新版本，审核通过后才生效', () => {
  const model = loadModel();
  const state = model.createState();
  const current = model.financialEntity(state, 'DEV-1001');
  const application = model.submitFinancialEntity(state, {
    ...current, bankProof:{ ...current.bankProof }, submittedAt:'2026-09-15 15:30', submittedBy:'王明',
  });
  assert.notEqual(application.entityVersion, current.entityVersion);
  assert.notEqual(application.accountVersion, current.accountVersion);
  assert.equal(model.financialEntity(state, 'DEV-1001').entityVersion, current.entityVersion);
  model.reviewFinancialEntity(state, application.id, { result:'approved', operator:'平台运营 李然', reviewedAt:'2026-09-15 16:30' });
  assert.equal(model.financialEntity(state, 'DEV-1001').entityVersion, application.entityVersion);
});

test('首次财务主体审核通过后才成为生效版本', () => {
  const model = loadModel();
  const state = model.createState();
  const application = model.submitFinancialEntity(state, {
    developerId:'DEV-NEW', developerName:'新工作室', legalName:'深圳新工作室科技有限公司', contactName:'陈宇',
    phone:'18600001111', email:'finance@new-studio.cn', bankAccountName:'深圳新工作室科技有限公司',
    bankName:'中国银行深圳分行', bankAccount:'6210000000000001', bankBranch:'中国银行深圳分行',
    bankProof:{ name:'proof.png', type:'image/png', size:2048 },
  });
  assert.equal(application.applicationType, 'initial');
  assert.equal(model.financialEntity(state, 'DEV-NEW'), null);
  model.reviewFinancialEntity(state, application.id, { result:'approved', operator:'平台运营 李然' });
  assert.equal(model.financialEntity(state, 'DEV-NEW').legalName, '深圳新工作室科技有限公司');
});

test('前后台 CSV 使用各自字段口径，且所有状态均可导出', () => {
  const model = loadModel();
  const state = model.createState();
  const row = model.statementsFor(state, { developerId:'DEV-1001' })[0];
  const statementCsv = model.exportStatementsCsv([{ ...row, developerName:'=CMD()', entityName:'+hack' }], { includeDeveloper:true });
  for (const label of ['结算单 ID','开发者','财务主体','主体版本','账户版本','规则版本','用户实付','平台实收','平台分成','应结算金额（CNY）']) assert.match(statementCsv, new RegExp(label));
  assert.match(statementCsv, /"'=CMD\(\)"/);
  assert.match(statementCsv, /"'\+hack"/);
  assert.doesNotMatch(statementCsv,/汇率版本|CNYUSD/);
  const developerStatementCsv = model.exportStatementsCsv([row], { audience:'developer' });
  for (const label of ['用户支付金额（CNY）','结算比例','实际到账金额（CNY）','结算金额（CNY）']) assert.match(developerStatementCsv,new RegExp(label));
  assert.doesNotMatch(developerStatementCsv,/平台分成/);
  const operationsStatementCsv = model.exportStatementsCsv([row], { includeDeveloper:true,includeFxVersion:true });
  assert.match(operationsStatementCsv,/汇率版本|CNYUSD/);
  const summaries = model.entitySummariesFor(state, { developerId:'DEV-1001' });
  const csv = model.exportEntitySummariesCsv(summaries.map((item,index) => ({ ...item, status:index ? 'pending' : 'confirmed' })));
  for (const label of ['结算单 ID','游戏及 DLC 销售金额','CDKEY 销售金额','综合税率','应结算金额（USD）','规则版本']) assert.match(csv, new RegExp(label));
  assert.match(csv,/待确认/);
  assert.match(csv,/已确认/);
  assert.equal(csv.split('\r\n').length, summaries.length + 1);
});

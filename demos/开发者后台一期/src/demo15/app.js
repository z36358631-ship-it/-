(function developerFinanceSettlementDemo() {
  const app = document.querySelector('#app');
  const PAGE_SIZE = 20;
  const routes = {
    entity: { title: '财务主体', icon: '主' },
    reconciliation: { title: '财务对账', icon: '账' },
    payments: { title: '付款记录', icon: '付' },
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const tag = (label, tone) => '<span class="gh-tag ' + (tone || '') + '">' + esc(label) + '</span>';
  const button = (label, action, tone, attrs) => '<button type="button" class="gh-button ' + (tone || '') + '" data-action="' + action + '" ' + (attrs || '') + '>' + esc(label) + '</button>';
  const logo = () => '<svg viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="10" fill="#f3b71b"/><path d="M10 18.3c0-5.3 3.7-9.1 8.9-9.1 2.6 0 4.8.9 6.4 2.4l-3.1 3.1a4.7 4.7 0 0 0-3.3-1.3c-2.8 0-4.7 2-4.7 4.9 0 2.8 1.9 4.9 4.8 4.9 2 0 3.3-.8 4-2.1h-4.6v-3.8h8.7c.1.6.1 1.2.1 1.8 0 5.1-3.4 8.8-8.3 8.8-5.2 0-8.9-4-8.9-9.6Z" fill="#422d00"/></svg>';
  const CURRENCY_DIGITS = Object.freeze({ USD:2, EUR:2, CNY:2, HKD:2, JPY:0 });
  const LEDGER_SOURCES = Object.freeze(['direct_sale','external_key','gamehub_key']);

  function minor(text, currency) {
    const digits = CURRENCY_DIGITS[currency] ?? 2;
    const normalized = String(text).trim();
    const negative = normalized.startsWith('-');
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [whole = '0', fraction = ''] = unsigned.split('.');
    const padded = (fraction + '0'.repeat(digits)).slice(0, digits);
    const value = Number(whole || '0') * (10 ** digits) + Number(padded || '0');
    return negative ? -value : value;
  }

  function money(valueMinor, currency) {
    const digits = CURRENCY_DIGITS[currency] ?? 2;
    return currency + ' ' + (valueMinor / (10 ** digits)).toLocaleString('zh-CN', {
      minimumFractionDigits:digits,
      maximumFractionDigits:digits,
    });
  }

  function decimal(valueMinor, currency) {
    const digits = CURRENCY_DIGITS[currency] ?? 2;
    return (valueMinor / (10 ** digits)).toFixed(digits);
  }

  function allocateMinor(totalMinor, basisPoints) {
    return Math.round(totalMinor * basisPoints / 10000);
  }

  const entitySeed = {
    status: 'effective',
    effectiveVersion: 'FIN-2026-003',
    submittedVersion: '',
    sourceVersion: 'ENT-2026-018',
    legalName: '星海互动科技有限公司',
    registrationRegion: '中国大陆',
    registrationNo: '9144**********3X',
    contactName: '王明',
    contactEmail: 'finance@ocean-expedition.com',
    bankRegion: '中国香港',
    bankName: '汇丰银行（香港）有限公司',
    accountName: 'XINGHAI INTERACTIVE TECHNOLOGY CO., LTD.',
    accountNumber: '**** 7826',
    swift: 'HSBCHKHHHKH',
    settlementCurrency: 'USD',
    bankProof: 'bank_account_proof_2026.pdf',
    taxRegion: '中国大陆',
    taxNo: '9144**********3X',
    taxProof: 'tax_residency_2026.pdf',
    effectiveAt: '2026-08-12 15:30',
    changeReason: '',
  };

  const entityHistory = [
    { version:'FIN-2026-003', type:'收款账户变更', status:'已生效', submitted:'2026-08-09 14:22', effective:'2026-08-12 15:30', account:'**** 7826', operator:'平台财务', snapshot:{ ...entitySeed } },
    { version:'FIN-2026-002', type:'税务资料变更', status:'已停用', submitted:'2026-06-18 10:14', effective:'2026-06-20 17:08', account:'**** 5369', operator:'平台财务', snapshot:{ ...entitySeed, accountNumber:'**** 5369', bankProof:'bank_account_proof_2026_v1.pdf', taxProof:'tax_residency_2026_v2.pdf', effectiveAt:'2026-06-20 17:08' } },
    { version:'FIN-2026-001', type:'首次配置', status:'已停用', submitted:'2026-03-02 09:40', effective:'2026-03-05 16:12', account:'**** 5369', operator:'平台财务', snapshot:{ ...entitySeed, accountNumber:'**** 5369', bankProof:'bank_account_proof_2026_v1.pdf', taxProof:'tax_residency_2026_v1.pdf', effectiveAt:'2026-03-05 16:12' } },
  ];

  const baseStatementSeeds = [
    { id:'STMT-2026-08-V1', period:'2026-08', version:'V1', status:'pending', targetSettlementMinor:minor('18420.36','USD'), currency:'USD', deadline:'2026-09-15 23:59', generated:'2026-09-05 11:20', payment:'not_ready', invoice:'not_required', requiresInvoice:false },
    { id:'STMT-2026-07-V2', period:'2026-07', version:'V2', status:'disputed', targetSettlementMinor:minor('16928.14','USD'), currency:'USD', deadline:'2026-08-16 23:59', generated:'2026-08-08 16:42', payment:'not_ready', invoice:'not_required', requiresInvoice:false, disputeStatus:'supplement' },
    { id:'STMT-2026-06-V1', period:'2026-06', version:'V1', status:'locked', targetSettlementMinor:minor('15482.60','USD'), currency:'USD', deadline:'2026-07-15 23:59', generated:'2026-07-05 09:18', payment:'awaiting_invoice', invoice:'pending', requiresInvoice:true },
    { id:'STMT-2026-05-V1', period:'2026-05', version:'V1', status:'locked', targetSettlementMinor:minor('13840.90','USD'), currency:'USD', deadline:'2026-06-15 23:59', generated:'2026-06-04 18:32', payment:'completed', invoice:'not_required', requiresInvoice:false },
    { id:'STMT-2026-04-V1', period:'2026-04', version:'V1', status:'confirmed', targetSettlementMinor:minor('11928.40','USD'), currency:'USD', deadline:'2026-05-15 23:59', generated:'2026-05-03 10:08', payment:'not_ready', invoice:'not_required', requiresInvoice:false },
    { id:'STMT-2026-03-V1', period:'2026-03', version:'V1', status:'locked', targetSettlementMinor:minor('11284.72','USD'), currency:'USD', deadline:'2026-04-15 23:59', generated:'2026-04-05 12:28', payment:'failed', invoice:'approved', requiresInvoice:true, invoiceData:{ number:'INV-202604-0182', date:'2026-04-08', amountMinor:minor('11284.72','USD'), currency:'USD', file:'invoice_202603.pdf' } },
  ];
  const statementSeeds = baseStatementSeeds.concat(Array.from({ length:21 }, (_, index) => {
    const monthIndex = 1 - index;
    const date = new Date(2026, monthIndex, 1);
    const period = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    const nextDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const nextPeriod = nextDate.getFullYear() + '-' + String(nextDate.getMonth() + 1).padStart(2, '0');
    const targetSettlementMinor = minor(String(10800 - index * 185),'USD');
    return {
      id:'STMT-' + period + '-V1', period, version:'V1', status:index === 0 ? 'draft' : 'locked',
      targetSettlementMinor, currency:'USD', deadline:nextPeriod + '-15 23:59', generated:nextPeriod + '-05 10:00',
      payment:index === 0 ? 'not_ready' : index % 4 === 0 ? 'completed' : index % 4 === 1 ? 'carried' : index % 4 === 2 ? 'completed' : 'cancelled',
      invoice:'not_required', requiresInvoice:false,
    };
  }));

  const flowPatterns = [
    { type:'sale', basisPoints:5200, ledgerSource:LEDGER_SOURCES[0], fulfillmentType:'account_entitlement', ruleModel:'revenue_share' },
    { type:'sale', basisPoints:6000, ledgerSource:LEDGER_SOURCES[1], fulfillmentType:'external_key', ruleModel:'fixed_purchase' },
    { type:'refund', basisPoints:-500, ledgerSource:LEDGER_SOURCES[0], fulfillmentType:'account_entitlement', ruleModel:'revenue_share' },
    { type:'chargeback', basisPoints:-200, ledgerSource:LEDGER_SOURCES[0], fulfillmentType:'account_entitlement', ruleModel:'revenue_share' },
    { type:'adjustment', basisPoints:-500, ledgerSource:LEDGER_SOURCES[2], fulfillmentType:'gamehub_key', ruleModel:'channel_share' },
  ];
  const FX_RATE_TEXT = Object.freeze({ USD:'1.0000', EUR:'1.1700', JPY:'0.0068', CNY:'0.1400', HKD:'0.1280' });

  function originalCurrencyForFlow(statementIndex, lineIndex) {
    if (lineIndex === 1) return ['EUR','JPY','CNY'][statementIndex % 3];
    if (lineIndex === 2) return 'JPY';
    return 'USD';
  }

  function toOriginalMinor(convertedMinor, originalCurrency, settlementCurrency, fxRateText) {
    const originalScale = 10 ** (CURRENCY_DIGITS[originalCurrency] ?? 2);
    const settlementScale = 10 ** (CURRENCY_DIGITS[settlementCurrency] ?? 2);
    return Math.round(convertedMinor * originalScale / (Number(fxRateText) * settlementScale));
  }

  const flows = statementSeeds.flatMap((statement, statementIndex) => {
    const allocations = flowPatterns.map((pattern, lineIndex) => lineIndex === flowPatterns.length - 1
      ? statement.targetSettlementMinor
      : allocateMinor(statement.targetSettlementMinor, pattern.basisPoints));
    allocations[allocations.length - 1] = statement.targetSettlementMinor - allocations.slice(0,-1).reduce((sum,value) => sum + value,0);
    return flowPatterns.map((pattern, lineIndex) => {
    const settlementMinor = allocations[lineIndex];
    const isSale = pattern.type === 'sale';
    const isAdjustment = pattern.type === 'adjustment';
    const convertedMinor = isAdjustment ? 0 : isSale ? Math.round(settlementMinor * 10000 / 6480) : settlementMinor;
    const taxMinor = isSale ? allocateMinor(convertedMinor,-800) : 0;
    const feeMinor = isSale ? allocateMinor(convertedMinor,-320) : 0;
    const platformShareMinor = isSale ? allocateMinor(convertedMinor,-2400) : 0;
    const adjustmentMinor = settlementMinor - convertedMinor - taxMinor - feeMinor - platformShareMinor;
    const originalCurrency = originalCurrencyForFlow(statementIndex,lineIndex);
    const fxRateText = FX_RATE_TEXT[originalCurrency];
    const originalMinor = isAdjustment ? 0 : toOriginalMinor(convertedMinor,originalCurrency,statement.currency,fxRateText);
    return {
      id:'RCN-' + statement.period.replace('-', '') + '-' + String(100000 + statementIndex * 10 + lineIndex),
      statementId:statement.id,
      date:statement.period + '-' + String(3 + lineIndex * 4).padStart(2, '0'),
      game:lineIndex % 2 === 0 ? '星海远征' : '像素边境',
      sku:lineIndex === 1 ? '深空回声 DLC' : '游戏本体',
      type:pattern.type,
      ledgerSource:pattern.ledgerSource,
      counterpartyType:'developer',
      fulfillmentType:pattern.fulfillmentType,
      originalCurrency,
      originalMinor,
      fxRateText,
      fxVersion:'FX-' + statement.period,
      convertedMinor,
      taxMinor,
      feeMinor,
      platformShareMinor,
      adjustmentMinor,
      settlementCurrency:statement.currency,
      settlementMinor,
      ruleVersion:statement.period >= '2026-06' ? 'RULE-2026-02' : 'RULE-2026-01',
      ruleModel:pattern.ruleModel,
    };
    });
  });

  const statements = statementSeeds.map(seed => {
    const { targetSettlementMinor, ...metadata } = seed;
    const linked = flows.filter(flow => flow.statementId === seed.id);
    const originalTotalsMinor = linked.reduce((totals,flow) => {
      totals[flow.originalCurrency] = (totals[flow.originalCurrency] || 0) + flow.originalMinor;
      return totals;
    }, {});
    const sourceTotalsMinor = linked.reduce((totals,flow) => {
      totals[flow.ledgerSource] = (totals[flow.ledgerSource] || 0) + flow.settlementMinor;
      return totals;
    }, {});
    return {
      ...metadata,
      originalSummary:Object.entries(originalTotalsMinor).filter(([,valueMinor]) => valueMinor !== 0).map(([currency,valueMinor]) => money(valueMinor,currency)).join(' / '),
      sourceTotalsMinor,
      salesMinor:linked.filter(flow => flow.type === 'sale').reduce((sum,flow) => sum + flow.convertedMinor,0),
      refundsMinor:linked.filter(flow => flow.type === 'refund').reduce((sum,flow) => sum + flow.convertedMinor,0),
      chargebacksMinor:linked.filter(flow => flow.type === 'chargeback').reduce((sum,flow) => sum + flow.convertedMinor,0),
      taxMinor:linked.reduce((sum,flow) => sum + flow.taxMinor,0),
      providerFeeMinor:linked.reduce((sum,flow) => sum + flow.feeMinor,0),
      platformShareMinor:linked.reduce((sum,flow) => sum + flow.platformShareMinor,0),
      adjustmentsMinor:linked.reduce((sum,flow) => sum + flow.adjustmentMinor,0),
      settlementMinor:linked.reduce((sum,flow) => sum + flow.settlementMinor,0),
    };
  });

  const paymentTemplates = [
    ['PAY-202609-001','STMT-2026-08-V1','待具备条件','not_ready','账单尚未锁定'],
    ['PAY-202608-003','STMT-2025-12-V1','待付款','pending','已进入付款计划'],
    ['PAY-202607-002','STMT-2026-01-V1','处理中','processing','银行正在处理'],
    ['PAY-202607-001','STMT-2025-11-V1','已汇出','remitted','预计 1—5 个工作日到账'],
    ['PAY-202606-001','STMT-2026-05-V1','已完成','completed','银行回执已确认'],
    ['PAY-202605-002','STMT-2026-03-V1','失败','failed','收款账户信息不匹配'],
    ['PAY-202605-001','STMT-2025-10-V1','退回','returned','收款行退回款项'],
    ['PAY-202604-001','STMT-2025-09-V1','暂缓','held','收款资料变更审核中'],
    ['PAY-202603-001','STMT-2025-08-V1','已结转','carried','未达到合同起付条件'],
    ['PAY-202602-001','STMT-2025-07-V1','已取消','cancelled','关联账单已作废'],
  ];
  const payments = paymentTemplates.map((row, index) => {
    const year = row[0].slice(4,8);
    const month = row[0].slice(8,10);
    const statement = statements.find(item => item.id === row[1]);
    const proofAvailable = ['remitted','completed','returned'].includes(row[3]);
    return {
      id:row[0], statementId:row[1], status:row[3], label:row[2], reason:row[4],
      amountMinor:statement ? statement.settlementMinor : 0, currency:statement ? statement.currency : 'USD', account:'**** 7826',
      created:year + '-' + month + '-05 09:00',
      planned:year + '-' + month + '-25',
      updated:year + '-' + month + '-' + String(index === 0 ? 9 : index === 1 || row[3] === 'held' || row[3] === 'carried' || row[3] === 'cancelled' ? 20 : Math.min(28,24 + index)).padStart(2,'0') + ' 16:20',
      proofAvailable,
      providerRef:proofAvailable ? 'BANK-REF-****-' + (8240 + index) : '—',
    };
  }).concat(Array.from({ length:13 }, (_, index) => {
    const statement = statements[14 + index];
    const parts = statement.period.split('-').map(Number);
    const date = new Date(parts[0],parts[1],1);
    const period = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2,'0');
    const status = index % 3 === 0 ? 'completed' : index % 3 === 1 ? 'carried' : 'cancelled';
    return {
      id:'PAY-' + period.replace('-','') + '-' + String(index + 10).padStart(3, '0'),
      statementId:statement.id,
      status,
      label:status === 'completed' ? '已完成' : status === 'carried' ? '已结转' : '已取消',
      reason:status === 'completed' ? '银行回执已确认' : status === 'carried' ? '未达到合同起付条件' : '关联账单已作废',
      amountMinor:statement.settlementMinor, currency:statement.currency, account:'**** 5369',
      created:period + '-05 09:00',
      planned:period + '-25',
      updated:period + '-28 11:30',
      proofAvailable:status === 'completed',
      providerRef:status === 'completed' ? 'BANK-REF-****-' + (7000 + index) : '—',
    };
  }));

  const state = {
    demoScenario:'exhaustive',
    scenarioMenuOpen:false,
    route:routeFromHash(),
    entity:clone(entitySeed),
    emptyEntity:{ ...clone(entitySeed), status:'unconfigured', effectiveVersion:'', submittedVersion:'' },
    entityDraft:null,
    entityEditing:false,
    entityEditMode:'',
    selectedHistory:'',
    reconcileTab:'statements',
    statementFilters:{ keyword:'', status:'all', period:'all', currency:'all' },
    flowFilters:{ keyword:'', type:'all', period:'all', currency:'all' },
    paymentFilters:{ keyword:'', status:'all', period:'all', currency:'all' },
    statementPage:1,
    flowPage:1,
    paymentPage:1,
    activeStatement:'',
    statementDrawerTab:'summary',
    disputeMode:false,
    disputeFlowId:'',
    disputeFile:'',
    invoiceFile:'',
    activePayment:'',
    disputes:[{ id:'DSP-202608-0042', statementId:'STMT-2026-07-V2', type:'汇率或规则', flowId:'RCN-202607-100010', platformMinor:minor('10156.88','USD'), expectedMinor:minor('10256.88','USD'), currency:'USD', reason:'开发者侧记录使用的汇率版本不同，请复核。', attachment:'developer_sales_record_202607.csv', submittedAt:'2026-08-08 17:12', status:'待补充', supplement:'' }],
    dialog:'',
    toast:'',
  };

  function activeStatements() {
    return state.demoScenario === 'exhaustive' ? statements : [];
  }

  function activeFlows() {
    return state.demoScenario === 'exhaustive' ? flows : [];
  }

  function activePayments() {
    return state.demoScenario === 'exhaustive' ? payments : [];
  }

  function activeDisputes() {
    return state.demoScenario === 'exhaustive' ? state.disputes : [];
  }

  function activeInvoices() {
    return activeStatements().filter(statement => statement.requiresInvoice || statement.invoiceData);
  }

  function activeEntity() {
    return state.demoScenario === 'empty' ? state.emptyEntity : state.entity;
  }

  function nextNaturalMonth(period) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(period));
    if (!match) return '';
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isInteger(year) || month < 1 || month > 12) return '';
    return month === 12
      ? String(year + 1).padStart(4,'0') + '-01'
      : String(year).padStart(4,'0') + '-' + String(month + 1).padStart(2,'0');
  }

  function generatedInNextSettlementWindow(statement) {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.exec(String(statement.generated));
    if (!match) return false;
    const generatedPeriod = match[1] + '-' + match[2];
    const day = Number(match[3]);
    return generatedPeriod === nextNaturalMonth(statement.period) && day >= 1 && day <= 10;
  }

  function collectMinorValues(value, values) {
    if (Array.isArray(value)) {
      value.forEach(item => collectMinorValues(item,values));
      return;
    }
    if (!value || typeof value !== 'object') return;
    Object.entries(value).forEach(([key,item]) => {
      if (key.endsWith('Minor')) {
        if (item && typeof item === 'object') Object.values(item).forEach(nested => values.push(nested));
        else values.push(item);
      } else {
        collectMinorValues(item,values);
      }
    });
  }

  function exactLedgerSourceKeys(sourceTotalsMinor) {
    if (!sourceTotalsMinor || typeof sourceTotalsMinor !== 'object' || Array.isArray(sourceTotalsMinor)) return false;
    const keys = Object.keys(sourceTotalsMinor).sort();
    return keys.length === LEDGER_SOURCES.length && keys.every((key,index) => key === [...LEDGER_SOURCES].sort()[index]);
  }

  function auditFixture() {
    return {
      statements:clone(activeStatements()),
      flows:clone(activeFlows()),
      payments:clone(activePayments()),
      disputes:clone(activeDisputes()),
    };
  }

  function auditLedgerData(fixture) {
    const auditStatements = Array.isArray(fixture && fixture.statements) ? fixture.statements : [];
    const auditFlows = Array.isArray(fixture && fixture.flows) ? fixture.flows : [];
    const statementIds = new Set(auditStatements.map(statement => statement.id));
    const sourceTotalsComplete = auditStatements.length > 0 && auditFlows.length > 0 &&
      auditFlows.every(flow => statementIds.has(flow.statementId) && LEDGER_SOURCES.includes(flow.ledgerSource)) &&
      auditStatements.every(statement => exactLedgerSourceKeys(statement.sourceTotalsMinor) &&
        LEDGER_SOURCES.every(source =>
          auditFlows
            .filter(flow => flow.statementId === statement.id && flow.ledgerSource === source)
            .reduce((sum,flow) => sum + flow.settlementMinor,0) === statement.sourceTotalsMinor[source]
        )
      );
    const minorValues = [];
    collectMinorValues(fixture,minorValues);
    const jpyValues = auditFlows.filter(flow => flow.originalCurrency === 'JPY').map(flow => flow.originalMinor);
    return {
      moneyAmountsAreIntegers:minorValues.length > 0 && minorValues.every(Number.isSafeInteger),
      jpyPrecisionValid:CURRENCY_DIGITS.JPY === 0 && jpyValues.length > 0 && jpyValues.some(valueMinor => valueMinor < 0) &&
        jpyValues.every(valueMinor => Number.isSafeInteger(valueMinor) && minor(decimal(valueMinor,'JPY'),'JPY') === valueMinor && !money(valueMinor,'JPY').includes('.')),
      sourceTotalsComplete,
      noCrossLedgerMixing:sourceTotalsComplete,
      generatedAfterPeriodEnd:auditStatements.length > 0 && auditStatements.every(generatedInNextSettlementWindow),
      statementTotalsConsistent:auditStatements.length > 0 && auditStatements.every(statement =>
        statement.salesMinor + statement.refundsMinor + statement.chargebacksMinor + statement.taxMinor + statement.providerFeeMinor + statement.platformShareMinor + statement.adjustmentsMinor === statement.settlementMinor
      ),
      flowTotalsConsistent:auditStatements.length > 0 && auditStatements.every(statement =>
        auditFlows.filter(flow => flow.statementId === statement.id).reduce((sum,flow) => sum + flow.settlementMinor,0) === statement.settlementMinor
      ),
    };
  }

  applyPreview();

  function routeFromHash() {
    const key = location.hash.replace(/^#\/?/, '').split('?')[0];
    return routes[key] ? key : 'entity';
  }

  function applyPreview() {
    const preview = new URLSearchParams(location.search).get('preview');
    const allowed = ['unconfigured','draft','reviewing','supplement','effective','change_reviewing','suspended'];
    if (!allowed.includes(preview)) return;
    state.entity.status = preview;
    if (preview === 'unconfigured') state.entity.effectiveVersion = '';
    if (preview === 'draft' || preview === 'supplement') {
      state.entity.effectiveVersion = preview === 'draft' ? '' : state.entity.effectiveVersion;
      state.entityDraft = clone(entitySeed);
      state.entityEditing = true;
      state.entityEditMode = state.entity.effectiveVersion ? 'change' : 'initial';
    }
    if (preview === 'reviewing') state.entity.effectiveVersion = '';
  }

  function statusMeta(status) {
    return ({
      unconfigured:['未配置',''], draft:['草稿','warning'], reviewing:['审核中','info'], supplement:['需补充','danger'],
      effective:['已生效','success'], change_reviewing:['变更审核中','info'], suspended:['暂停结算','danger'],
    }[status] || [status,'']);
  }

  function statementStatus(status) {
    return ({ draft:['草稿',''], pending:['待确认','warning'], confirmed:['已确认','info'], disputed:['有异议','danger'], locked:['已锁定','success'] }[status] || [status,'']);
  }

  function paymentStatus(status) {
    return ({
      not_ready:['待具备条件',''], awaiting_invoice:['待发票','warning'], pending:['待付款','warning'], processing:['处理中','info'], remitted:['已汇出','info'],
      completed:['已完成','success'], failed:['失败','danger'], returned:['退回','danger'], held:['暂缓','warning'],
      carried:['已结转',''], cancelled:['已取消',''],
    }[status] || [status,'']);
  }

  function invoiceStatus(status) {
    return ({ pending:['待提交','warning'], reviewing:['审核中','info'], approved:['已通过','success'], rejected:['已退回','danger'], not_required:['不需要',''] }[status] || [status,'']);
  }

  function topbar() {
    return '<header class="gh-topbar"><div class="gh-brand">' + logo() + '<span>盖世游戏开发者平台</span></div><div class="gh-top-actions"><div class="gh-user"><span class="gh-avatar">王</span><span class="gh-user-copy"><strong>王明</strong><small>企业主账号</small></span></div></div></header>';
  }

  function financeActionsAllowed() {
    const entity = activeEntity();
    return Boolean(entity.effectiveVersion) && !['change_reviewing','supplement','suspended'].includes(entity.status);
  }

  function paymentStateForStatement(item) {
    const payment = activePayments().find(row => row.statementId === item.id);
    return payment ? payment.status : item.payment;
  }

  function nav() {
    return '<aside class="gh-sidebar"><div class="gh-sidebar-label">财务</div><nav class="gh-nav d15-nav" aria-label="财务导航">' +
      Object.entries(routes).map(entry => '<button type="button" data-route="' + entry[0] + '" class="' + (state.route === entry[0] ? 'is-active' : '') + '"><span class="gh-nav-icon">' + entry[1].icon + '</span>' + entry[1].title + '</button>').join('') +
      '</nav></aside>';
  }

  function pageHead() {
    return '<div class="gh-breadcrumb">开发者平台 <span>/</span> 经营与财务 <span>/</span> ' + routes[state.route].title + '</div><div class="gh-page-head"><div><h1>' + routes[state.route].title + '</h1></div></div>';
  }

  function readonly(label, value, hint) {
    return '<div class="gh-readonly"><span>' + esc(label) + '</span><strong>' + esc(value || '—') + '</strong>' + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</div>';
  }

  function metric(label, value, hint) {
    return '<div class="gh-metric"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong><small>' + esc(hint) + '</small></div>';
  }

  function emptyState(title, text, action) {
    return '<div class="gh-empty"><div class="gh-empty-mark">∅</div><strong>' + esc(title) + '</strong><p>' + esc(text) + '</p>' + (action || '') + '</div>';
  }

  function entitySummary() {
    const entity = activeEntity();
    const meta = statusMeta(entity.status);
    const blocked = ['change_reviewing','supplement','suspended'].includes(entity.status);
    let notice = '';
    if (entity.status === 'change_reviewing') {
      notice = '<div class="gh-notice warning"><div><strong>变更审核中</strong><p>旧资料继续用于账单归属；本次涉及收款账户，审核完成前暂停付款。</p></div><div class="gh-row-actions">' + button('查看提交内容','view-submission','', '') + button('撤销审核','withdraw-review','danger','') + '</div></div>';
    } else if (entity.status === 'reviewing') {
      notice = '<div class="gh-notice"><div><strong>资料审核中</strong><p>审核通过后开放账单确认和付款。</p></div><div class="gh-row-actions">' + button('查看提交内容','view-submission','', '') + button('撤销审核','withdraw-review','danger','') + '</div></div>';
    } else if (entity.status === 'suspended') {
      notice = '<div class="gh-notice danger"><div><strong>结算已暂停</strong><p>财务资料存在异常，账单仍可查看，付款暂停。请发送邮件至 dev@xiaoji.com。</p></div></div>';
    } else if (entity.status === 'supplement') {
      notice = '<div class="gh-notice danger"><div><strong>请补充资料</strong><p>账户证明未显示账户名和完整银行信息；旧资料继续生效，付款暂停。</p></div><div class="gh-row-actions">' + button('补充资料','resume-entity-edit','primary','') + '</div></div>';
    }
    const paymentState = !entity.effectiveVersion ? tag('未启用','warning') : blocked ? tag('暂停','danger') : tag('正常','success');
    return notice +
      '<div class="d15-status-strip"><div><span>当前状态</span><strong>' + tag(meta[0], meta[1]) + '</strong></div><div><span>生效版本</span><strong>' + esc(entity.effectiveVersion || '—') + '</strong></div><div><span>结算币种</span><strong>' + esc(entity.settlementCurrency) + '</strong></div><div><span>付款状态</span><strong>' + paymentState + '</strong></div><div class="d15-status-action">' + (entity.status === 'effective' ? button('申请变更','start-change','primary','') : '') + '</div></div>' +
      '<div class="d15-entity-grid">' +
        '<section class="gh-card"><div class="gh-card-head"><div><h2>认证主体</h2><p>来源：企业认证 ' + esc(entity.sourceVersion) + '</p></div></div><div class="gh-card-body"><div class="gh-grid-2">' +
          readonly('企业名称',entity.legalName,'企业认证字段') + readonly('注册国家或地区',entity.registrationRegion,'企业认证字段') +
          readonly('注册号',entity.registrationNo,'企业认证字段') + readonly('财务联系人',entity.contactName + ' · ' + entity.contactEmail,'财务通知接收人') +
        '</div></div></section>' +
        '<section class="gh-card"><div class="gh-card-head"><div><h2>合作规则</h2><p>合同线下签署，页面只读</p></div></div><div class="gh-card-body"><div class="d15-kv-list">' +
          '<div><span>结算模型</span><strong>收入分成</strong></div><div><span>账期</span><strong>自然月</strong></div><div><span>确认期限</span><strong>出单后 10 个自然日</strong></div><div><span>结算币种</span><strong>' + esc(entity.settlementCurrency) + '</strong></div><div><span>规则版本</span><strong>RULE-2026-02</strong></div><div><span>发票</span><strong>按账单要求提交</strong></div>' +
        '</div></div></section>' +
        '<section class="gh-card"><div class="gh-card-head"><div><h2>收款账户</h2></div></div><div class="gh-card-body"><div class="gh-grid-2">' +
          readonly('账户名',entity.accountName,'须与签约主体一致') + readonly('银行国家或地区',entity.bankRegion) + readonly('银行',entity.bankName) + readonly('账号',entity.accountNumber) + readonly('SWIFT / BIC',entity.swift) + readonly('账户证明',entity.bankProof) +
        '</div></div></section>' +
        '<section class="gh-card"><div class="gh-card-head"><div><h2>税务资料</h2></div></div><div class="gh-card-body"><div class="gh-grid-2">' +
          readonly('税务居民地',entity.taxRegion) + readonly('税号',entity.taxNo) + readonly('税务证明',entity.taxProof) + readonly('生效时间',entity.effectiveAt) +
        '</div></div></section>' +
      '</div>' + historyTable();
  }

  function historyTable() {
    return '<section class="gh-card d15-section-gap"><div class="gh-card-head"><div><h2>变更历史</h2></div></div><div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>版本</th><th>类型</th><th>提交时间</th><th>生效时间</th><th>收款账户</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
      entityHistory.map(item => '<tr><td><strong>' + item.version + '</strong></td><td>' + item.type + '</td><td>' + item.submitted + '</td><td>' + item.effective + '</td><td>' + item.account + '</td><td>' + tag(item.status,item.status === '已生效' ? 'success' : '') + '</td><td>' + button('查看','view-history','link','data-version="' + item.version + '"') + '</td></tr>').join('') +
      '</tbody></table></div></section>';
  }

  function entityForm() {
    const draft = state.entityDraft || clone(entitySeed);
    const entity = activeEntity();
    const isSupplement = entity.status === 'supplement';
    return (isSupplement ? '<div class="gh-notice danger"><div><strong>请补充资料</strong><p>账户证明未显示账户名和完整银行信息，请重新上传。</p></div></div>' : '') +
      '<form data-testid="entity-form" onsubmit="return false">' +
      '<section class="gh-card"><div class="gh-card-head"><div><h2>认证主体</h2><p>企业认证资料自动同步，不在此处修改</p></div></div><div class="gh-card-body"><div class="gh-grid-2">' +
        readonly('企业名称',draft.legalName,'如需变更，请先更新企业认证') + readonly('注册国家或地区',draft.registrationRegion,'企业认证字段') + readonly('注册号',draft.registrationNo,'企业认证字段') + readonly('企业认证版本',draft.sourceVersion,'自动关联') +
      '</div></div></section>' +
      '<section class="gh-card"><div class="gh-card-head"><div><h2>收款账户</h2></div></div><div class="gh-card-body"><div class="gh-grid-2">' +
        field('财务联系人','contactName',draft.contactName,true) + field('财务邮箱','contactEmail',draft.contactEmail,true,'email') +
        selectField('银行国家或地区','bankRegion',draft.bankRegion,[['中国大陆','中国大陆'],['中国香港','中国香港'],['中国澳门','中国澳门'],['新加坡','新加坡'],['美国','美国']],true) +
        readonly('结算币种',draft.settlementCurrency,'如需变更，请联系商务更新合同') +
        field('账户名','accountName',draft.accountName,true) + field('银行名称','bankName',draft.bankName,true) +
        field('银行账号','accountNumber',draft.accountNumber,true) + field('SWIFT / BIC','swift',draft.swift,true) +
        uploadField('账户证明','bankProof',draft.bankProof,true) +
      '</div></div></section>' +
      '<section class="gh-card"><div class="gh-card-head"><div><h2>税务资料</h2></div></div><div class="gh-card-body"><div class="gh-grid-2">' +
        selectField('税务居民地','taxRegion',draft.taxRegion,[['中国大陆','中国大陆'],['中国香港','中国香港'],['中国澳门','中国澳门'],['新加坡','新加坡'],['美国','美国']],true) +
        field('税号','taxNo',draft.taxNo,true) + uploadField('税务证明','taxProof',draft.taxProof,true) +
        '<div class="gh-field wide"><label for="d15-change-reason">变更说明</label><textarea id="d15-change-reason" class="gh-textarea" data-entity-field="changeReason" placeholder="首次配置可不填">' + esc(draft.changeReason) + '</textarea></div>' +
      '</div><div class="gh-error" data-testid="entity-error"></div><div class="gh-form-actions">' + button('取消','cancel-entity-edit','','') + button('保存','save-entity','','') + button(entity.status === 'supplement' ? '重新提交' : '提交审核','submit-entity','primary','') + '</div></div></section></form>';
  }

  function field(label, key, value, required, type) {
    return '<div class="gh-field"><label for="d15-' + key + '" class="' + (required ? 'gh-required' : '') + '">' + label + '</label><input id="d15-' + key + '" class="gh-input" data-entity-field="' + key + '" type="' + (type || 'text') + '" value="' + esc(value) + '"></div>';
  }

  function selectField(label, key, value, options, required) {
    return '<div class="gh-field"><label for="d15-' + key + '" class="' + (required ? 'gh-required' : '') + '">' + label + '</label><select id="d15-' + key + '" class="gh-select" data-entity-field="' + key + '">' +
      options.map(option => '<option value="' + option[0] + '" ' + (option[0] === value ? 'selected' : '') + '>' + option[1] + '</option>').join('') +
      '</select></div>';
  }

  function uploadField(label, key, value, required) {
    return '<div class="gh-field"><label class="' + (required ? 'gh-required' : '') + '">' + label + '</label><label class="gh-upload d15-upload"><input type="file" data-entity-file="' + key + '" accept=".pdf,.png,.jpg,.jpeg"><span data-file-label="' + key + '">' + esc(value || '上传 PDF、PNG 或 JPG') + '</span></label></div>';
  }

  function entityPage() {
    const entity = activeEntity();
    if (state.entityEditing) return entityForm();
    if (entity.status === 'unconfigured') {
      return '<section class="gh-card">' + emptyState('尚未配置财务主体','企业认证资料将自动同步，请补充收款与税务资料。',button('配置财务主体','start-initial','primary','')) + '</section>';
    }
    if (entity.status === 'draft' || (entity.status === 'supplement' && !entity.effectiveVersion)) {
      state.entityDraft = state.entityDraft || clone(entitySeed);
      state.entityEditing = true;
      return entityForm();
    }
    return entitySummary();
  }

  function filteredStatements() {
    return activeStatements().filter(item => {
      const f = state.statementFilters;
      if (f.keyword && !(item.id + item.period).toLowerCase().includes(f.keyword.toLowerCase())) return false;
      if (f.status !== 'all' && item.status !== f.status) return false;
      if (f.period !== 'all' && item.period.slice(0,4) !== f.period) return false;
      if (f.currency !== 'all' && item.currency !== f.currency) return false;
      return true;
    });
  }

  function filteredFlows() {
    return activeFlows().filter(item => {
      const f = state.flowFilters;
      if (f.keyword && !(item.id + item.game + item.sku).toLowerCase().includes(f.keyword.toLowerCase())) return false;
      if (f.type !== 'all' && item.type !== f.type) return false;
      if (f.period !== 'all' && item.date.slice(0,4) !== f.period) return false;
      if (f.currency !== 'all' && item.originalCurrency !== f.currency) return false;
      return true;
    });
  }

  function filterSelect(label, group, key, value, options) {
    return '<div class="gh-field"><label for="d15-' + group + '-' + key + '">' + label + '</label><select class="gh-select" id="d15-' + group + '-' + key + '" data-filter-group="' + group + '" data-filter="' + key + '">' +
      options.map(option => '<option value="' + option[0] + '" ' + (option[0] === value ? 'selected' : '') + '>' + option[1] + '</option>').join('') +
      '</select></div>';
  }

  function pagination(group, page, count) {
    const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
    const safePage = Math.min(page, pages);
    const start = count ? (safePage - 1) * PAGE_SIZE + 1 : 0;
    const end = Math.min(safePage * PAGE_SIZE, count);
    return '<div class="gh-pagination"><span>共 ' + count + ' 条，每页 20 条</span><span>' + start + '—' + end + '</span>' +
      '<button class="gh-button" type="button" data-page-group="' + group + '" data-page="' + (safePage - 1) + '" ' + (safePage <= 1 ? 'disabled' : '') + '>上一页</button>' +
      '<span>' + safePage + ' / ' + pages + '</span><button class="gh-button" type="button" data-page-group="' + group + '" data-page="' + (safePage + 1) + '" ' + (safePage >= pages ? 'disabled' : '') + '>下一页</button></div>';
  }

  function emptyTableRow(columns, title, text) {
    return '<tr><td colspan="' + columns + '"><div class="gh-empty"><strong>' + esc(title || '暂无匹配结果') + '</strong><p>' + esc(text || '请调整筛选条件后查询。') + '</p></div></td></tr>';
  }

  function statementList() {
    const rows = filteredStatements();
    const pageRows = rows.slice((state.statementPage - 1) * PAGE_SIZE, state.statementPage * PAGE_SIZE);
    const f = state.statementFilters;
    return '<section class="gh-card"><div class="gh-card-body"><div class="d15-filter-grid">' +
      '<div class="gh-field d15-filter-keyword"><label for="d15-statement-keyword">账单</label><input id="d15-statement-keyword" class="gh-input" data-filter-group="statement" data-filter="keyword" value="' + esc(f.keyword) + '" placeholder="账单号或账期"></div>' +
      filterSelect('账期','statement','period',f.period,[['all','全部账期'],['2026','2026 年'],['2025','2025 年']]) +
      filterSelect('账单状态','statement','status',f.status,[['all','全部状态'],['draft','草稿'],['pending','待确认'],['confirmed','已确认'],['disputed','有异议'],['locked','已锁定']]) +
      filterSelect('结算币种','statement','currency',f.currency,[['all','全部币种'],['USD','USD'],['CNY','CNY']]) +
      '<div class="d15-filter-action">' + button('重置','reset-statement-filters','link','') + button('查询','apply-filters','primary','') + button('导出','export-statements','','') + '</div></div></div>' +
      '<div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>账期／账单号</th><th>交易原币汇总</th><th>应结算</th><th>确认期限</th><th>账单状态</th><th>付款状态</th><th>操作</th></tr></thead><tbody>' +
      (pageRows.length ? pageRows.map(item => {
        const sm = statementStatus(item.status);
        const pm = paymentStatus(paymentStateForStatement(item));
        return '<tr data-statement-id="' + item.id + '"><td><strong>' + item.period + '</strong><small>' + item.id + ' · ' + item.version + '</small></td><td class="d15-original">' + esc(item.originalSummary) + '</td><td><strong>' + money(item.settlementMinor,item.currency) + '</strong></td><td>' + item.deadline + '</td><td>' + tag(sm[0],sm[1]) + '</td><td>' + tag(pm[0],pm[1]) + '</td><td>' + button('查看','open-statement','link','data-statement="' + item.id + '"') + '</td></tr>';
      }).join('') : emptyTableRow(7,activeStatements().length ? '' : '暂无对账单',activeStatements().length ? '' : '完成财务主体配置后，账单将在出单后展示。')) + '</tbody></table></div>' + pagination('statement',state.statementPage,rows.length) + '</section>';
  }

  function flowType(type) {
    return ({ sale:['销售','success'], refund:['退款','warning'], chargeback:['拒付','danger'], adjustment:['调整','info'] }[type] || [type,'']);
  }

  function ruleModelLabel(ruleModel) {
    return ({ revenue_share:'收入分成', fixed_purchase:'固定采购', channel_share:'渠道分成' }[ruleModel] || ruleModel);
  }

  function flowList() {
    const rows = filteredFlows();
    const pageRows = rows.slice((state.flowPage - 1) * PAGE_SIZE, state.flowPage * PAGE_SIZE);
    const f = state.flowFilters;
    return '<section class="gh-card"><div class="gh-card-body"><div class="d15-filter-grid">' +
      '<div class="gh-field d15-filter-keyword"><label for="d15-flow-keyword">流水</label><input id="d15-flow-keyword" class="gh-input" data-filter-group="flow" data-filter="keyword" value="' + esc(f.keyword) + '" placeholder="流水号、游戏或 SKU"></div>' +
      filterSelect('时间','flow','period',f.period,[['all','全部时间'],['2026','2026 年'],['2025','2025 年']]) +
      filterSelect('类型','flow','type',f.type,[['all','全部类型'],['sale','销售'],['refund','退款'],['chargeback','拒付'],['adjustment','调整']]) +
      filterSelect('交易币种','flow','currency',f.currency,[['all','全部币种'],['USD','USD'],['EUR','EUR'],['JPY','JPY'],['CNY','CNY']]) +
      '<div class="d15-filter-action">' + button('重置','reset-flow-filters','link','') + button('查询','apply-filters','primary','') + button('导出','export-flows','','') + '</div></div></div>' +
      '<div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>日期／对账流水号</th><th>游戏／SKU</th><th>类型</th><th>交易原币</th><th>汇率／折算</th><th>税费／支付费</th><th>平台分成／调整</th><th>应结算</th><th>关联账单</th></tr></thead><tbody>' +
      (pageRows.length ? pageRows.map(item => {
        const tm = flowType(item.type);
        return '<tr><td><strong>' + item.date + '</strong><small class="d15-mono">' + item.id + '</small></td><td><strong>' + item.game + '</strong><small>' + item.sku + '</small></td><td>' + tag(tm[0],tm[1]) + '</td><td>' + money(item.originalMinor,item.originalCurrency) + '</td><td><strong>' + item.fxRateText + '</strong><small>' + money(item.convertedMinor,item.settlementCurrency) + '</small></td><td><strong>' + money(item.taxMinor,item.settlementCurrency) + '</strong><small>支付费 ' + money(item.feeMinor,item.settlementCurrency) + '</small></td><td><strong>' + money(item.platformShareMinor,item.settlementCurrency) + '</strong><small>调整 ' + money(item.adjustmentMinor,item.settlementCurrency) + '</small></td><td><strong>' + money(item.settlementMinor,item.settlementCurrency) + '</strong><small>' + ruleModelLabel(item.ruleModel) + ' · ' + item.ruleVersion + '</small></td><td><button type="button" class="d15-text-button" data-action="open-statement" data-statement="' + item.statementId + '">' + item.statementId + '</button></td></tr>';
      }).join('') : emptyTableRow(9,activeFlows().length ? '' : '暂无对账流水',activeFlows().length ? '' : '产生可结算交易后，对账流水将在此展示。')) + '</tbody></table></div>' + pagination('flow',state.flowPage,rows.length) + '</section>';
  }

  function reconciliationPage() {
    const isEmptyScenario = state.demoScenario === 'empty';
    const pendingCount = activeStatements().filter(item => item.status === 'pending').length;
    const payableStates = new Set(['pending','processing','remitted','awaiting_invoice']);
    const lockedUnpaid = activeStatements().filter(item => item.status === 'locked' && payableStates.has(paymentStateForStatement(item))).reduce((sum,item) => sum + item.settlementMinor,0);
    const gate = financeActionsAllowed() ? '' : '<div class="gh-notice warning"><div><strong>财务操作暂不可用</strong><p>财务主体生效且付款未暂停后，才可确认账单或提交差异。</p></div></div>';
    return gate + '<div class="gh-grid-3 d15-metrics">' +
      metric('本期预估应结算',isEmptyScenario ? 'USD 0.00' : 'USD 19,204.18',isEmptyScenario ? '产生可结算交易后更新' : '交易原币：USD 15,420.60 / EUR 2,846.20 / JPY 308,000') +
      metric('待确认账单',pendingCount + ' 份',isEmptyScenario ? '暂无待确认账单' : '最近确认期限：2026-09-15 23:59') +
      metric('已锁定待付款',money(lockedUnpaid,'USD'),'以锁定账单为准') +
      '</div><div class="gh-tabs d15-main-tabs"><button type="button" data-reconcile-tab="statements" class="' + (state.reconcileTab === 'statements' ? 'is-active' : '') + '">对账单</button><button type="button" data-reconcile-tab="flows" class="' + (state.reconcileTab === 'flows' ? 'is-active' : '') + '">对账流水</button></div>' +
      (state.reconcileTab === 'statements' ? statementList() : flowList());
  }

  function filteredPayments() {
    return activePayments().filter(item => {
      const f = state.paymentFilters;
      if (f.keyword && !(item.id + item.statementId).toLowerCase().includes(f.keyword.toLowerCase())) return false;
      if (f.status !== 'all' && item.status !== f.status) return false;
      if (f.period !== 'all' && item.planned.slice(0,4) !== f.period) return false;
      if (f.currency !== 'all' && item.currency !== f.currency) return false;
      return true;
    });
  }

  function paymentsPage() {
    const rows = filteredPayments();
    const pageRows = rows.slice((state.paymentPage - 1) * PAGE_SIZE, state.paymentPage * PAGE_SIZE);
    const f = state.paymentFilters;
    return '<section class="gh-card"><div class="gh-card-body"><div class="d15-filter-grid">' +
      '<div class="gh-field d15-filter-keyword"><label for="d15-payment-keyword">付款单</label><input id="d15-payment-keyword" class="gh-input" data-filter-group="payment" data-filter="keyword" value="' + esc(f.keyword) + '" placeholder="付款单号或账单号"></div>' +
      filterSelect('时间','payment','period',f.period,[['all','全部时间'],['2026','2026 年'],['2025','2025 年']]) +
      filterSelect('付款状态','payment','status',f.status,[['all','全部状态'],['not_ready','待具备条件'],['pending','待付款'],['processing','处理中'],['remitted','已汇出'],['completed','已完成'],['failed','失败'],['returned','退回'],['held','暂缓'],['carried','已结转'],['cancelled','已取消']]) +
      filterSelect('币种','payment','currency',f.currency,[['all','全部币种'],['USD','USD'],['CNY','CNY']]) +
      '<div class="d15-filter-action">' + button('重置','reset-payment-filters','link','') + button('查询','apply-filters','primary','') + button('导出','export-payments','','') + '</div></div></div>' +
      '<div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>付款单号</th><th>关联账单</th><th>金额</th><th>收款账户</th><th>计划付款日</th><th>更新时间</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
      (pageRows.length ? pageRows.map(item => {
        const pm = paymentStatus(item.status);
        return '<tr data-payment-id="' + item.id + '"><td><strong>' + item.id + '</strong></td><td>' + item.statementId + '</td><td><strong>' + money(item.amountMinor,item.currency) + '</strong></td><td>' + item.account + '</td><td>' + item.planned + '</td><td>' + item.updated + '</td><td>' + tag(pm[0],pm[1]) + '</td><td>' + button('查看','open-payment','link','data-payment="' + item.id + '"') + '</td></tr>';
      }).join('') : emptyTableRow(8,activePayments().length ? '' : '暂无付款记录',activePayments().length ? '' : '账单锁定并进入付款计划后，付款进度将在此展示。')) + '</tbody></table></div>' + pagination('payment',state.paymentPage,rows.length) + '</section>';
  }

  function breakdownRow(label, value, tone) {
    return '<div class="d15-breakdown-row"><span>' + label + '</span><strong class="' + (tone || '') + '">' + value + '</strong></div>';
  }

  function statementDrawer() {
    const item = activeStatements().find(row => row.id === state.activeStatement);
    if (!item) return '';
    const sm = statementStatus(item.status);
    const pm = paymentStatus(paymentStateForStatement(item));
    const linked = activeFlows().filter(flow => flow.statementId === item.id);
    const currentDispute = activeDisputes().filter(dispute => dispute.statementId === item.id).slice(-1)[0];
    const selectedFlow = linked.find(flow => flow.id === state.disputeFlowId) || linked[0];
    let body = '';
    if (state.disputeMode === 'supplement') {
      body = '<div class="gh-notice warning"><div><strong>补充差异材料</strong><p>原提交内容不会被覆盖，补充记录将追加到处理时间线。</p></div></div>' +
        '<section class="gh-card"><div class="gh-card-body"><div class="d15-kv-list"><div><span>差异单</span><strong>' + esc(currentDispute ? currentDispute.id : '—') + '</strong></div><div><span>原差异</span><strong>' + esc(currentDispute ? currentDispute.type + ' · ' + currentDispute.flowId : '—') + '</strong></div><div><span>原附件</span><strong>' + esc(currentDispute ? currentDispute.attachment : '—') + '</strong></div></div></div></section>' +
        '<div class="gh-field d15-section-gap"><label for="d15-supplement-reason" class="gh-required">补充说明</label><textarea id="d15-supplement-reason" class="gh-textarea" data-testid="supplement-reason"></textarea></div>' +
        '<div class="gh-field"><label>补充附件</label><label class="gh-upload d15-upload"><input type="file" data-dispute-file accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"><span data-testid="dispute-file-label">' + esc(state.disputeFile || '上传开发者侧订单、销售记录或其他核对依据') + '</span></label></div><div class="gh-error" data-testid="dispute-error"></div>';
    } else if (state.disputeMode) {
      body = '<div class="gh-notice warning"><div><strong>提交账单差异</strong><p>请选择本账单内的对账流水，平台处理结果将保留在账单版本中。</p></div></div>' +
        '<div class="gh-grid-2"><div class="gh-field"><label for="d15-dispute-type" class="gh-required">差异类型</label><select id="d15-dispute-type" class="gh-select" data-testid="dispute-type"><option value="">请选择</option><option value="duplicate">重复扣减</option><option value="refund">退款或拒付</option><option value="fee">费用或税费</option><option value="rate">汇率或规则</option><option value="other">其他流水差异</option></select></div>' +
        '<div class="gh-field"><label for="d15-dispute-flow" class="gh-required">对账流水号</label><select id="d15-dispute-flow" class="gh-select" data-testid="dispute-flow" data-dispute-flow-select>' + linked.map(flow => '<option value="' + flow.id + '" ' + (selectedFlow && selectedFlow.id === flow.id ? 'selected' : '') + '>' + flow.id + ' · ' + money(flow.settlementMinor,flow.settlementCurrency) + '</option>').join('') + '</select></div>' +
        '<div class="gh-readonly" data-testid="platform-amount"><span>平台金额</span><strong>' + (selectedFlow ? money(selectedFlow.settlementMinor,selectedFlow.settlementCurrency) : '—') + '</strong><small>取自所选流水，不可修改</small></div>' +
        '<div class="gh-field"><label for="d15-expected-amount" class="gh-required">期望金额（' + esc(item.currency) + '）</label><input id="d15-expected-amount" class="gh-input" data-testid="expected-amount" inputmode="decimal" placeholder="0.00"></div>' +
        '<div class="gh-field wide"><label for="d15-dispute-reason" class="gh-required">差异说明</label><textarea id="d15-dispute-reason" class="gh-textarea" data-testid="dispute-reason"></textarea></div>' +
        '<div class="gh-field wide"><label>附件</label><label class="gh-upload d15-upload"><input type="file" data-dispute-file accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"><span data-testid="dispute-file-label">' + esc(state.disputeFile || '上传凭证或核对明细') + '</span></label></div></div><div class="gh-error" data-testid="dispute-error"></div>';
    } else if (state.statementDrawerTab === 'flows') {
      body = '<div class="d15-flow-summary"><span>共 ' + linked.length + ' 条</span><strong>流水应结算合计 ' + money(linked.reduce((sum,flow) => sum + flow.settlementMinor,0),item.currency) + '</strong></div><div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>流水号</th><th>日期</th><th>游戏／SKU</th><th>类型</th><th>交易原币</th><th>汇率／折算</th><th>平台分成／调整</th><th>应结算</th></tr></thead><tbody>' +
        linked.map(flow => {
          const tm = flowType(flow.type);
          return '<tr><td class="d15-mono">' + flow.id + '</td><td>' + flow.date + '</td><td><strong>' + flow.game + '</strong><small>' + flow.sku + '</small></td><td>' + tag(tm[0],tm[1]) + '</td><td>' + money(flow.originalMinor,flow.originalCurrency) + '</td><td><strong>' + flow.fxRateText + '</strong><small>' + money(flow.convertedMinor,flow.settlementCurrency) + '</small></td><td><strong>' + money(flow.platformShareMinor,flow.settlementCurrency) + '</strong><small>调整 ' + money(flow.adjustmentMinor,flow.settlementCurrency) + '</small></td><td><strong>' + money(flow.settlementMinor,flow.settlementCurrency) + '</strong><small>' + ruleModelLabel(flow.ruleModel) + ' · ' + flow.ruleVersion + '</small></td></tr>';
        }).join('') + '</tbody></table></div>';
    } else if (state.statementDrawerTab === 'dispute') {
      body = currentDispute ? '<section class="gh-card"><div class="gh-card-body"><div class="gh-grid-2">' +
        readonly('差异单号',currentDispute.id) + readonly('差异类型',currentDispute.type) + readonly('关联流水',currentDispute.flowId) + readonly('平台金额',money(currentDispute.platformMinor,currentDispute.currency)) + readonly('期望金额',money(currentDispute.expectedMinor,currentDispute.currency)) + readonly('附件',currentDispute.attachment || '—') +
        '<div class="gh-field wide">' + readonly('差异说明',currentDispute.reason) + '</div></div><div class="d15-timeline d15-section-gap"><div><b>' + currentDispute.submittedAt + '</b><strong>已提交差异</strong><p>开发者提交内容已保存。</p></div>' + (currentDispute.status === '待补充' ? '<div><b>2026-08-09 10:30</b><strong>平台处理中</strong><p>操作人：平台财务 李敏</p></div><div class="is-current"><b>2026-08-10 15:40</b><strong>待补充</strong><p>请补充开发者侧订单、销售记录或其他核对依据。</p></div>' : '<div class="is-current"><b>当前</b><strong>' + currentDispute.status + '</strong><p>等待平台复核。</p></div>') + (currentDispute.supplement ? '<div class="is-current"><b>2026-09-10 16:05</b><strong>已补充</strong><p>' + esc(currentDispute.supplement) + '</p></div>' : '') + '</div>' + (currentDispute.status === '待补充' ? button('补充材料','start-supplement','primary','') : '') + '</div></section>' : emptyState('暂无差异记录','本账单尚未提交差异。','');
    } else {
      body = '<div class="d15-drawer-summary">' +
        '<section class="gh-card"><div class="gh-card-head"><div><h2>账单构成</h2></div></div><div class="gh-card-body"><div class="d15-breakdown">' +
          breakdownRow('交易原币汇总',esc(item.originalSummary),'') + breakdownRow('折算后销售额',money(item.salesMinor,item.currency),'') +
          breakdownRow('退款',money(item.refundsMinor,item.currency),'is-negative') + breakdownRow('拒付败诉',money(item.chargebacksMinor,item.currency),'is-negative') +
          breakdownRow('销售税／VAT',money(item.taxMinor,item.currency),'is-negative') + breakdownRow('支付费',money(item.providerFeeMinor,item.currency),'is-negative') +
          breakdownRow('平台分成',money(item.platformShareMinor,item.currency),'is-negative') + breakdownRow('补贴与跨期调整',money(item.adjustmentsMinor,item.currency),item.adjustmentsMinor >= 0 ? 'is-positive' : 'is-negative') +
          '<div class="d15-breakdown-row is-total"><span>应结算</span><strong>' + money(item.settlementMinor,item.currency) + '</strong></div>' +
        '</div></div></section>' +
        '<section class="gh-card"><div class="gh-card-head"><div><h2>结算规则</h2></div></div><div class="gh-card-body"><div class="d15-kv-list"><div><span>规则版本</span><strong>' + (linked[0] ? linked[0].ruleVersion : '—') + '</strong></div><div><span>结算模型</span><strong>收入分成＋固定采购＋渠道分成</strong></div><div><span>汇率版本</span><strong>' + (linked[0] ? linked[0].fxVersion : '—') + '</strong></div><div><span>账单版本</span><strong>' + item.version + '</strong></div></div></div></section>' +
      '</div>' + invoiceModule(item);
    }
    const tabs = state.disputeMode ? '' : '<div class="gh-tabs d15-drawer-tabs"><button type="button" data-statement-drawer-tab="summary" class="' + (state.statementDrawerTab === 'summary' ? 'is-active' : '') + '">账单汇总</button><button type="button" data-statement-drawer-tab="flows" class="' + (state.statementDrawerTab === 'flows' ? 'is-active' : '') + '">对账流水</button>' + (currentDispute ? '<button type="button" data-statement-drawer-tab="dispute" class="' + (state.statementDrawerTab === 'dispute' ? 'is-active' : '') + '">差异记录</button>' : '') + '</div>';
    let foot = button('关闭','close-drawer','','');
    if (state.disputeMode === 'supplement') foot = button('取消','cancel-dispute','','') + button('提交补充','confirm-supplement','primary','');
    else if (state.disputeMode) foot = button('取消','cancel-dispute','','') + button('提交差异','confirm-dispute','primary','');
    else if (item.status === 'pending') foot = button('导出账单','download-statement','','') + (financeActionsAllowed() ? button('提交差异','start-dispute','','') + button('确认账单','confirm-statement','primary','') : button('提交差异','start-dispute','','disabled title="财务主体生效后可操作"') + button('确认账单','confirm-statement','','disabled title="财务主体生效后可操作"'));
    else if (item.status === 'locked') foot = button('导出账单','download-statement','','') + foot;
    else foot = button('导出账单','download-statement','','') + foot;
    return '<div class="d15-drawer-layer" data-action="close-drawer"><aside class="d15-drawer" data-stop role="dialog" aria-modal="true" aria-label="账单详情" data-testid="statement-drawer"><div class="d15-drawer-head"><div><h2>' + item.period + ' 对账单</h2><p>' + item.id + ' · ' + tag(sm[0],sm[1]) + ' · 付款 ' + tag(pm[0],pm[1]) + '</p></div><button type="button" class="gh-dialog-close" data-action="close-drawer" aria-label="关闭">×</button></div><div class="d15-drawer-body">' + tabs + body + '</div><div class="d15-drawer-foot">' + foot + '</div></aside></div>';
  }

  function invoiceModule(item) {
    if (!item.requiresInvoice || item.status !== 'locked') return '';
    const im = invoiceStatus(item.invoice);
    let action = '';
    if (item.invoice === 'pending' || item.invoice === 'rejected') {
      const data = item.invoiceData || {};
      action = '<div class="gh-grid-2"><div class="gh-field"><label for="d15-invoice-number" class="gh-required">发票号</label><input id="d15-invoice-number" class="gh-input" data-testid="invoice-number" value="' + esc(data.number || '') + '"></div><div class="gh-field"><label for="d15-invoice-date" class="gh-required">开票日期</label><input id="d15-invoice-date" class="gh-input" data-testid="invoice-date" type="date" value="' + esc(data.date || '2026-09-10') + '"></div><div class="gh-field"><label for="d15-invoice-amount" class="gh-required">发票金额（' + esc(item.currency) + '）</label><input id="d15-invoice-amount" class="gh-input" data-testid="invoice-amount" inputmode="decimal" value="' + esc(data.amountMinor == null ? decimal(item.settlementMinor,item.currency) : decimal(data.amountMinor,data.currency || item.currency)) + '"></div>' + readonly('币种',item.currency,'须与账单一致') + '<div class="gh-field wide"><label class="gh-required">发票附件</label><label class="gh-upload d15-upload"><input type="file" data-invoice-file accept=".pdf,.png,.jpg,.jpeg"><span data-testid="invoice-file-label">' + esc(state.invoiceFile || data.file || '上传发票') + '</span></label></div></div><div class="gh-error" data-testid="invoice-error"></div><div class="gh-form-actions">' + button('提交发票','submit-invoice','primary','') + '</div>';
    }
    const submitted = item.invoiceData ? '<div class="gh-grid-2">' + readonly('发票号',item.invoiceData.number) + readonly('开票日期',item.invoiceData.date) + readonly('发票金额',money(item.invoiceData.amountMinor,item.invoiceData.currency || item.currency)) + readonly('附件',item.invoiceData.file) + '</div>' : '';
    const reviewCopy = item.invoice === 'reviewing' ? '<p class="d15-inline-copy">发票已提交，审核通过后进入付款。</p>' + submitted : item.invoice === 'approved' ? '<p class="d15-inline-copy">发票已通过审核。</p>' + submitted : '';
    return '<section class="gh-card d15-section-gap"><div class="gh-card-head"><div><h2>发票</h2><p>仅因合同要求展示</p></div>' + tag(im[0],im[1]) + '</div><div class="gh-card-body">' + (item.invoice === 'rejected' ? '<div class="gh-notice danger"><div><strong>发票已退回</strong><p>抬头或金额与账单不一致。</p></div></div>' : '') + reviewCopy + action + '</div></section>';
  }

  function paymentDrawer() {
    const item = activePayments().find(row => row.id === state.activePayment);
    if (!item) return '';
    const pm = paymentStatus(item.status);
    const timeline = [
      ['生成付款单','关联账单 ' + item.statementId,item.created],
      [item.label,item.reason,item.updated],
    ];
    return '<div class="d15-drawer-layer" data-action="close-drawer"><aside class="d15-drawer d15-payment-drawer" data-stop role="dialog" aria-modal="true" aria-label="付款详情" data-testid="payment-drawer"><div class="d15-drawer-head"><div><h2>付款详情</h2><p>' + item.id + ' · ' + tag(pm[0],pm[1]) + '</p></div><button type="button" class="gh-dialog-close" data-action="close-drawer" aria-label="关闭">×</button></div><div class="d15-drawer-body"><section class="gh-card"><div class="gh-card-body"><div class="gh-grid-2">' +
      '<div class="gh-readonly"><span>关联账单</span><strong><button type="button" class="d15-text-button" data-action="open-related-statement" data-statement="' + item.statementId + '">' + item.statementId + '</button></strong><small>点击查看账单</small></div>' + readonly('付款金额',money(item.amountMinor,item.currency)) + readonly('收款账户',item.account) + readonly('计划付款日',item.planned) + readonly('银行参考号',item.providerRef) + readonly('更新时间',item.updated) +
      '</div></div></section><section class="gh-card"><div class="gh-card-head"><div><h2>处理记录</h2></div></div><div class="gh-card-body"><div class="d15-timeline">' +
      timeline.map((row,index) => '<div class="' + (index === timeline.length - 1 ? 'is-current' : '') + '"><b>' + row[2] + '</b><strong>' + row[0] + '</strong><p>' + row[1] + '</p></div>').join('') +
      '</div></div></section>' + (item.proofAvailable ? '<section class="gh-card"><div class="gh-card-body">' + button('下载付款凭证','download-payment-proof','','') + '</div></section>' : '') + '</div><div class="d15-drawer-foot">' + (['failed','returned','held'].includes(item.status) ? button('前往财务主体','go-entity','','') : '') + button('关闭','close-drawer','','') + '</div></aside></div>';
  }

  function historyDrawer() {
    if (state.selectedHistory === '__submission') {
      const entity = activeEntity();
      const draft = state.entityDraft || entity;
      return '<div class="d15-drawer-layer" data-action="close-drawer"><aside class="d15-drawer d15-history-drawer" data-stop role="dialog" aria-modal="true" aria-label="提交内容"><div class="d15-drawer-head"><div><h2>提交内容</h2><p>' + esc(entity.submittedVersion || '待审核版本') + ' · 只读</p></div><button type="button" class="gh-dialog-close" data-action="close-drawer" aria-label="关闭">×</button></div><div class="d15-drawer-body"><section class="gh-card"><div class="gh-card-body"><div class="gh-grid-2">' +
        readonly('企业名称',draft.legalName) + readonly('注册国家或地区',draft.registrationRegion) + readonly('财务联系人',draft.contactName + ' · ' + draft.contactEmail) + readonly('结算币种',draft.settlementCurrency) + readonly('账户名',draft.accountName) + readonly('银行',draft.bankName) + readonly('银行账号',draft.accountNumber) + readonly('SWIFT / BIC',draft.swift) + readonly('税务居民地',draft.taxRegion) + readonly('税号',draft.taxNo) + readonly('账户证明',draft.bankProof) + readonly('税务证明',draft.taxProof) +
        '</div></div></section></div><div class="d15-drawer-foot">' + button('关闭','close-drawer','','') + '</div></aside></div>';
    }
    const item = entityHistory.find(row => row.version === state.selectedHistory);
    if (!item) return '';
    const snapshot = item.snapshot;
    return '<div class="d15-drawer-layer" data-action="close-drawer"><aside class="d15-drawer d15-history-drawer" data-stop role="dialog" aria-modal="true" aria-label="财务主体版本"><div class="d15-drawer-head"><div><h2>财务主体版本</h2><p>' + item.version + ' · ' + item.status + '</p></div><button type="button" class="gh-dialog-close" data-action="close-drawer" aria-label="关闭">×</button></div><div class="d15-drawer-body"><section class="gh-card"><div class="gh-card-body"><div class="gh-grid-2">' +
      readonly('变更类型',item.type) + readonly('提交时间',item.submitted) + readonly('生效时间',item.effective) + readonly('审核人',item.operator) + readonly('企业名称',snapshot.legalName) + readonly('注册国家或地区',snapshot.registrationRegion) + readonly('账户名',snapshot.accountName) + readonly('收款账户',snapshot.accountNumber) + readonly('银行',snapshot.bankName) + readonly('SWIFT / BIC',snapshot.swift) + readonly('税号',snapshot.taxNo) + readonly('账户证明',snapshot.bankProof) + readonly('税务证明',snapshot.taxProof) +
      '</div></div></section></div><div class="d15-drawer-foot">' + button('关闭','close-drawer','','') + '</div></aside></div>';
  }

  function confirmDialog() {
    if (!state.dialog) return '';
    const isWithdraw = state.dialog === 'withdraw';
    const title = isWithdraw ? '撤销审核' : '确认账单';
    const text = isWithdraw ? '撤销后，本次提交内容恢复为可编辑状态。' : '确认后账单进入“已确认”，由平台财务复核并锁定。';
    const action = isWithdraw ? 'confirm-withdraw' : 'confirm-statement-final';
    return '<div class="gh-dialog-layer" data-action="close-dialog"><div class="gh-dialog" data-stop role="dialog" aria-modal="true" aria-label="' + title + '"><div class="gh-dialog-head"><div><h2>' + title + '</h2><p>' + text + '</p></div><button class="gh-dialog-close" data-action="close-dialog" aria-label="关闭">×</button></div><div class="gh-dialog-foot">' + button('取消','close-dialog','','') + button(isWithdraw ? '确认撤销' : '确认账单',action,isWithdraw ? 'danger' : 'primary','') + '</div></div></div>';
  }

  function scenarioOption(value, label, hint) {
    const selected = state.demoScenario === value;
    return '<button type="button" role="menuitemradio" aria-checked="' + selected + '" tabindex="' + (selected ? '0' : '-1') + '" data-action="set-demo-scenario" data-scenario="' + value + '"><strong>' + label + '</strong><small>' + hint + '</small></button>';
  }

  function scenarioSwitcher() {
    const expanded = state.scenarioMenuOpen ? 'true' : 'false';
    return '<div class="d15-scenario-switcher">' +
      (state.scenarioMenuOpen ? '<div id="d15-scenario-menu" class="d15-scenario-menu" role="menu" aria-label="Demo 场景">' +
        scenarioOption('exhaustive','穷举态','展示完整状态') +
        scenarioOption('empty','缺省态','模拟首次进入') +
      '</div>' : '') +
      '<button type="button" class="d15-scenario-orb" data-testid="scenario-orb" data-action="toggle-scenario-menu" aria-haspopup="menu" aria-controls="d15-scenario-menu" aria-expanded="' + expanded + '" aria-label="切换 Demo 场景">场景</button>' +
    '</div>';
  }

  function setDemoScenario(scenario) {
    if (!['exhaustive','empty'].includes(scenario)) return;
    state.demoScenario = scenario;
    if (scenario === 'empty') state.emptyEntity = { ...clone(entitySeed), status:'unconfigured', effectiveVersion:'', submittedVersion:'' };
    state.scenarioMenuOpen = false;
    state.entityDraft = null;
    state.entityEditing = false;
    state.entityEditMode = '';
    state.statementFilters = { keyword:'', status:'all', period:'all', currency:'all' };
    state.flowFilters = { keyword:'', type:'all', period:'all', currency:'all' };
    state.paymentFilters = { keyword:'', status:'all', period:'all', currency:'all' };
    state.statementPage = 1;
    state.flowPage = 1;
    state.paymentPage = 1;
    state.activeStatement = '';
    state.activePayment = '';
    state.selectedHistory = '';
    state.dialog = '';
    state.disputeMode = false;
    state.disputeFlowId = '';
    state.disputeFile = '';
    state.invoiceFile = '';
    state.toast = '';
    render();
    const orb = app.querySelector('[data-testid="scenario-orb"]');
    if (orb) orb.focus();
  }

  function render() {
    state.route = routes[state.route] ? state.route : 'entity';
    const page = state.route === 'entity' ? entityPage() : state.route === 'reconciliation' ? reconciliationPage() : paymentsPage();
    app.innerHTML = '<div class="gh-app" data-testid="developer-finance-demo">' + topbar() + '<div class="gh-layout">' + nav() + '<main class="gh-main"><div class="gh-content">' + pageHead() + page + '</div></main></div>' +
      scenarioSwitcher() + statementDrawer() + paymentDrawer() + historyDrawer() + confirmDialog() + (state.toast ? '<div class="gh-toast" role="status">' + esc(state.toast) + '</div>' : '') + '</div>';
    document.body.style.overflow = state.activeStatement || state.activePayment || state.selectedHistory || state.dialog ? 'hidden' : '';
  }

  function setToast(message) {
    state.toast = message;
    render();
    clearTimeout(setToast.timer);
    setToast.timer = setTimeout(() => { state.toast = ''; render(); }, 1800);
  }

  function syncEntityDraftFromDom() {
    if (!state.entityDraft) return;
    app.querySelectorAll('[data-entity-field]').forEach(control => { state.entityDraft[control.dataset.entityField] = control.value.trim(); });
  }

  function validateEntity() {
    syncEntityDraftFromDom();
    const required = ['contactName','contactEmail','bankRegion','settlementCurrency','accountName','bankName','accountNumber','swift','bankProof','taxRegion','taxNo','taxProof'];
    if (!required.every(key => state.entityDraft && String(state.entityDraft[key] || '').trim())) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.entityDraft.contactEmail)) return false;
    if (!/^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/.test(state.entityDraft.swift.replace(/\s/g,''))) return false;
    return true;
  }

  function saveTextFile(name, rows) {
    const blob = new Blob([rows], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function csvCell(value) {
    let text = String(value == null ? '' : value);
    if (/^[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g,'""') + '"';
  }

  function csv(headers, rows) {
    return [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
  }

  app.addEventListener('input', event => {
    const entityControl = event.target.closest('[data-entity-field]');
    if (entityControl && state.entityDraft) {
      const key = entityControl.dataset.entityField;
      state.entityDraft[key] = entityControl.value;
      if (['bankRegion','accountName','bankName','accountNumber','swift'].includes(key) && entityControl.value !== String(activeEntity()[key] || '')) {
        state.entityDraft.bankProof = '';
        const label = app.querySelector('[data-file-label="bankProof"]');
        if (label) label.textContent = '账户信息已变更，请重新上传账户证明';
      }
      return;
    }
    const control = event.target.closest('[data-filter-group]');
    if (!control || control.tagName !== 'INPUT') return;
    const group = control.dataset.filterGroup;
    const map = group === 'statement' ? state.statementFilters : group === 'flow' ? state.flowFilters : state.paymentFilters;
    map[control.dataset.filter] = control.value;
  });

  app.addEventListener('change', event => {
    if (event.target.matches('[data-dispute-flow-select]')) {
      state.disputeFlowId = event.target.value;
      const flow = flows.find(item => item.id === state.disputeFlowId);
      const value = app.querySelector('[data-testid="platform-amount"] strong');
      if (flow && value) value.textContent = money(flow.settlementMinor,flow.settlementCurrency);
      return;
    }
    const control = event.target.closest('[data-filter-group]');
    if (control) {
      const group = control.dataset.filterGroup;
      const map = group === 'statement' ? state.statementFilters : group === 'flow' ? state.flowFilters : state.paymentFilters;
      map[control.dataset.filter] = control.value;
      if (group === 'statement') state.statementPage = 1;
      if (group === 'flow') state.flowPage = 1;
      if (group === 'payment') state.paymentPage = 1;
      render();
      return;
    }
    const entityFile = event.target.closest('[data-entity-file]');
    if (entityFile && entityFile.files[0]) {
      state.entityDraft[entityFile.dataset.entityFile] = entityFile.files[0].name;
      const label = app.querySelector('[data-file-label="' + entityFile.dataset.entityFile + '"]');
      if (label) label.textContent = entityFile.files[0].name;
      return;
    }
    if (event.target.matches('[data-dispute-file]') && event.target.files[0]) {
      state.disputeFile = event.target.files[0].name;
      const label = app.querySelector('[data-testid="dispute-file-label"]');
      if (label) label.textContent = state.disputeFile;
      return;
    }
    if (event.target.matches('[data-invoice-file]') && event.target.files[0]) {
      state.invoiceFile = event.target.files[0].name;
      const label = app.querySelector('[data-testid="invoice-file-label"]');
      if (label) label.textContent = state.invoiceFile;
    }
  });

  app.addEventListener('click', event => {
    const route = event.target.closest('[data-route]');
    if (route) {
      state.route = route.dataset.route;
      state.scenarioMenuOpen = false;
      state.activeStatement = '';
      state.activePayment = '';
      state.selectedHistory = '';
      state.invoiceFile = '';
      state.disputeFile = '';
      location.hash = '/' + state.route;
      render();
      return;
    }
    const reconcileTab = event.target.closest('[data-reconcile-tab]');
    if (reconcileTab) { state.reconcileTab = reconcileTab.dataset.reconcileTab; render(); return; }
    const drawerTab = event.target.closest('[data-statement-drawer-tab]');
    if (drawerTab) { state.statementDrawerTab = drawerTab.dataset.statementDrawerTab; state.disputeMode = false; render(); return; }
    const pager = event.target.closest('[data-page-group]');
    if (pager && !pager.disabled) {
      const page = Number(pager.dataset.page);
      if (pager.dataset.pageGroup === 'statement') state.statementPage = page;
      if (pager.dataset.pageGroup === 'flow') state.flowPage = page;
      if (pager.dataset.pageGroup === 'payment') state.paymentPage = page;
      render();
      return;
    }
    const actionNode = event.target.closest('[data-action]');
    if (!actionNode) return;
    const action = actionNode.dataset.action;
    if (action === 'toggle-scenario-menu') {
      state.scenarioMenuOpen = !state.scenarioMenuOpen;
      render();
      const target = state.scenarioMenuOpen
        ? app.querySelector('[role="menuitemradio"][aria-checked="true"]')
        : app.querySelector('[data-testid="scenario-orb"]');
      if (target) target.focus();
    } else if (action === 'set-demo-scenario') {
      setDemoScenario(actionNode.dataset.scenario);
    } else if (action === 'start-initial') {
      state.entityDraft = clone(entitySeed);
      state.entityDraft.effectiveVersion = '';
      state.entityEditing = true;
      state.entityEditMode = 'initial';
      render();
    } else if (action === 'start-change') {
      state.entityDraft = clone(activeEntity());
      state.entityDraft.accountNumber = '782612340098';
      state.entityEditing = true;
      state.entityEditMode = 'change';
      render();
    } else if (action === 'cancel-entity-edit') {
      const entity = activeEntity();
      state.entityEditing = false;
      if (!entity.effectiveVersion) entity.status = 'unconfigured';
      state.entityDraft = null;
      render();
    } else if (action === 'save-entity') {
      syncEntityDraftFromDom();
      const entity = activeEntity();
      if (!entity.effectiveVersion) entity.status = 'draft';
      setToast('已保存');
    } else if (action === 'submit-entity') {
      if (!validateEntity()) {
        const error = app.querySelector('[data-testid="entity-error"]');
        if (error) error.textContent = '请检查必填项、邮箱和 SWIFT / BIC 格式。';
        return;
      }
      const entity = activeEntity();
      const isChange = state.entityEditMode === 'change' || Boolean(entity.effectiveVersion);
      entity.submittedVersion = 'FIN-2026-004';
      entity.status = isChange ? 'change_reviewing' : 'reviewing';
      state.entityEditing = false;
      setToast('已提交审核');
    } else if (action === 'view-submission') {
      state.selectedHistory = '__submission';
      render();
    } else if (action === 'resume-entity-edit') {
      const entity = activeEntity();
      state.entityDraft = state.entityDraft || clone(entity);
      state.entityEditing = true;
      state.entityEditMode = entity.effectiveVersion ? 'change' : 'initial';
      render();
    } else if (action === 'withdraw-review') {
      state.dialog = 'withdraw';
      render();
    } else if (action === 'confirm-withdraw') {
      const entity = activeEntity();
      const hasEffective = Boolean(entity.effectiveVersion);
      entity.status = hasEffective ? 'effective' : 'draft';
      state.entityEditing = !hasEffective;
      state.dialog = '';
      setToast('审核已撤销');
    } else if (action === 'view-history') {
      state.selectedHistory = actionNode.dataset.version;
      render();
    } else if (action === 'open-statement') {
      state.activeStatement = actionNode.dataset.statement;
      state.statementDrawerTab = 'summary';
      state.disputeMode = false;
      state.invoiceFile = '';
      state.disputeFile = '';
      render();
    } else if (action === 'open-payment') {
      state.activePayment = actionNode.dataset.payment;
      render();
    } else if (action === 'close-drawer') {
      if (event.target.closest('[data-stop]') && !event.target.closest('.gh-dialog-close') && !event.target.closest('.d15-drawer-foot')) return;
      state.activeStatement = '';
      state.activePayment = '';
      state.selectedHistory = '';
      state.disputeMode = false;
      state.invoiceFile = '';
      state.disputeFile = '';
      render();
    } else if (action === 'confirm-statement') {
      if (!financeActionsAllowed()) { setToast('财务主体生效后可确认账单'); return; }
      state.dialog = 'confirm-statement';
      render();
    } else if (action === 'confirm-statement-final') {
      const item = statements.find(row => row.id === state.activeStatement);
      if (financeActionsAllowed() && item && item.status === 'pending') {
        item.status = 'confirmed';
        item.payment = 'not_ready';
      }
      state.dialog = '';
      setToast('账单已确认');
    } else if (action === 'start-dispute') {
      if (!financeActionsAllowed()) { setToast('财务主体生效后可提交差异'); return; }
      state.disputeMode = 'new';
      state.disputeFile = '';
      state.disputeFlowId = (flows.find(item => item.statementId === state.activeStatement) || {}).id || '';
      render();
    } else if (action === 'start-supplement') {
      state.disputeMode = 'supplement';
      state.disputeFile = '';
      render();
    } else if (action === 'cancel-dispute') {
      state.disputeMode = false;
      render();
    } else if (action === 'confirm-dispute') {
      const type = app.querySelector('[data-testid="dispute-type"]');
      const flow = app.querySelector('[data-testid="dispute-flow"]');
      const expected = app.querySelector('[data-testid="expected-amount"]');
      const reason = app.querySelector('[data-testid="dispute-reason"]');
      const matchedFlow = flows.find(item => item.statementId === state.activeStatement && item.id === (flow ? flow.value : ''));
      const expectedValue = expected ? Number(expected.value) : NaN;
      const expectedMinor = expected && Number.isFinite(expectedValue) ? minor(expected.value,matchedFlow ? matchedFlow.settlementCurrency : 'USD') : NaN;
      if (!type || !type.value || !matchedFlow || !Number.isInteger(expectedMinor) || !reason || !reason.value.trim()) {
        const error = app.querySelector('[data-testid="dispute-error"]');
        if (error) error.textContent = !matchedFlow ? '请选择本账单内的对账流水。' : '请填写差异类型、有效期望金额和说明。';
        return;
      }
      const item = statements.find(row => row.id === state.activeStatement);
      const typeLabel = type.options[type.selectedIndex].text;
      state.disputes.push({
        id:'DSP-' + Date.now(),
        statementId:state.activeStatement,
        type:typeLabel,
        flowId:matchedFlow.id,
        platformMinor:matchedFlow.settlementMinor,
        expectedMinor,
        currency:matchedFlow.settlementCurrency,
        reason:reason.value.trim(),
        attachment:state.disputeFile || '—',
        submittedAt:'2026-09-10 16:28',
        status:'处理中',
        supplement:'',
      });
      if (item) { item.status = 'disputed'; item.disputeStatus = 'submitted'; }
      state.disputeMode = false;
      state.statementDrawerTab = 'dispute';
      setToast('差异已提交');
    } else if (action === 'confirm-supplement') {
      const reason = app.querySelector('[data-testid="supplement-reason"]');
      const dispute = state.disputes.filter(item => item.statementId === state.activeStatement).slice(-1)[0];
      if (!reason || !reason.value.trim()) {
        const error = app.querySelector('[data-testid="dispute-error"]');
        if (error) error.textContent = '请填写补充说明。';
        return;
      }
      if (dispute) {
        dispute.supplement = reason.value.trim() + (state.disputeFile ? ' · ' + state.disputeFile : '');
        dispute.status = '处理中';
      }
      state.disputeMode = false;
      state.statementDrawerTab = 'dispute';
      setToast('材料已补充');
    } else if (action === 'submit-invoice') {
      const item = statements.find(row => row.id === state.activeStatement);
      const number = app.querySelector('[data-testid="invoice-number"]');
      const date = app.querySelector('[data-testid="invoice-date"]');
      const amount = app.querySelector('[data-testid="invoice-amount"]');
      const amountValue = amount ? Number(amount.value) : NaN;
      const amountMinor = amount && Number.isFinite(amountValue) ? minor(amount.value,item ? item.currency : 'USD') : NaN;
      if (!number || !number.value.trim() || !date || !date.value || !Number.isInteger(amountMinor) || amountMinor <= 0 || !state.invoiceFile) {
        const error = app.querySelector('[data-testid="invoice-error"]');
        if (error) error.textContent = '请填写发票号、日期、有效金额并上传附件。';
        return;
      }
      if (item && amountMinor !== item.settlementMinor) {
        const error = app.querySelector('[data-testid="invoice-error"]');
        if (error) error.textContent = '发票金额须与账单应结算金额一致。';
        return;
      }
      if (item) {
        item.invoice = 'reviewing';
        item.payment = 'awaiting_invoice';
        item.invoiceData = { number:number.value.trim(), date:date.value, amountMinor, currency:item.currency, file:state.invoiceFile };
      }
      state.invoiceFile = '';
      setToast('发票已提交');
    } else if (action === 'download-statement') {
      const item = statements.find(row => row.id === state.activeStatement);
      if (item) saveTextFile(item.id + '.csv',csv(['账单号','账期','版本','销售额','退款','拒付','税费','支付费','平台分成','补贴与调整','应结算','币种','状态'],[[item.id,item.period,item.version,decimal(item.salesMinor,item.currency),decimal(item.refundsMinor,item.currency),decimal(item.chargebacksMinor,item.currency),decimal(item.taxMinor,item.currency),decimal(item.providerFeeMinor,item.currency),decimal(item.platformShareMinor,item.currency),decimal(item.adjustmentsMinor,item.currency),decimal(item.settlementMinor,item.currency),item.currency,statementStatus(item.status)[0]]]));
    } else if (action === 'download-payment-proof') {
      const item = payments.find(row => row.id === state.activePayment);
      if (item && item.proofAvailable) saveTextFile(item.id + '-付款凭证.txt','付款单号：' + item.id + '\n银行参考号：' + item.providerRef);
    } else if (action === 'open-related-statement') {
      state.activePayment = '';
      state.route = 'reconciliation';
      state.activeStatement = actionNode.dataset.statement;
      state.statementDrawerTab = 'summary';
      location.hash = '/reconciliation';
      render();
    } else if (action === 'go-entity') {
      state.activePayment = '';
      state.route = 'entity';
      location.hash = '/entity';
      render();
    } else if (action === 'export-statements') {
      saveTextFile('对账单.csv',csv(['账单号','账期','版本','交易原币汇总','应结算','币种','账单状态','付款状态'],filteredStatements().map(item => [item.id,item.period,item.version,item.originalSummary,decimal(item.settlementMinor,item.currency),item.currency,statementStatus(item.status)[0],paymentStatus(paymentStateForStatement(item))[0]])));
    } else if (action === 'export-flows') {
      saveTextFile('对账流水.csv',csv(['流水号','日期','游戏','SKU','类型','交易原币','交易金额','汇率','折算金额','税费','支付费','平台分成','调整','应结算','结算币种','结算模型','规则版本','账单号'],filteredFlows().map(item => [item.id,item.date,item.game,item.sku,flowType(item.type)[0],item.originalCurrency,decimal(item.originalMinor,item.originalCurrency),item.fxRateText,decimal(item.convertedMinor,item.settlementCurrency),decimal(item.taxMinor,item.settlementCurrency),decimal(item.feeMinor,item.settlementCurrency),decimal(item.platformShareMinor,item.settlementCurrency),decimal(item.adjustmentMinor,item.settlementCurrency),decimal(item.settlementMinor,item.settlementCurrency),item.settlementCurrency,ruleModelLabel(item.ruleModel),item.ruleVersion,item.statementId])));
    } else if (action === 'export-payments') {
      saveTextFile('付款记录.csv',csv(['付款单号','账单号','状态','金额','币种','收款账户','计划付款日','更新时间','银行参考号'],filteredPayments().map(item => [item.id,item.statementId,item.label,decimal(item.amountMinor,item.currency),item.currency,item.account,item.planned,item.updated,item.providerRef])));
    } else if (action === 'apply-filters') {
      state.statementPage = 1; state.flowPage = 1; state.paymentPage = 1; render();
    } else if (action === 'reset-statement-filters') {
      state.statementFilters = { keyword:'', status:'all', period:'all', currency:'all' }; state.statementPage = 1; render();
    } else if (action === 'reset-flow-filters') {
      state.flowFilters = { keyword:'', type:'all', period:'all', currency:'all' }; state.flowPage = 1; render();
    } else if (action === 'reset-payment-filters') {
      state.paymentFilters = { keyword:'', status:'all', period:'all', currency:'all' }; state.paymentPage = 1; render();
    } else if (action === 'close-dialog') {
      state.dialog = ''; render();
    }
  });

  window.addEventListener('hashchange', () => { state.route = routeFromHash(); render(); });
  window.addEventListener('keydown', event => {
    if (state.scenarioMenuOpen) {
      const item = event.target.closest && event.target.closest('[role="menuitemradio"]');
      const items = [...app.querySelectorAll('[role="menuitemradio"]')];
      if (item && ['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(event.key)) {
        event.preventDefault();
        const index = items.indexOf(item);
        const nextIndex = event.key === 'Home' ? 0
          : event.key === 'End' ? items.length - 1
          : ['ArrowDown','ArrowRight'].includes(event.key) ? (index + 1) % items.length
          : (index - 1 + items.length) % items.length;
        items.forEach((node,itemIndex) => { node.tabIndex = itemIndex === nextIndex ? 0 : -1; });
        if (items[nextIndex]) items[nextIndex].focus();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        state.scenarioMenuOpen = false;
        render();
        const orb = app.querySelector('[data-testid="scenario-orb"]');
        if (orb) orb.focus();
        return;
      }
    }
    if (event.key !== 'Escape') return;
    if (state.dialog) state.dialog = '';
    else if (state.activeStatement || state.activePayment || state.selectedHistory || state.disputeMode) {
      state.activeStatement = '';
      state.activePayment = '';
      state.selectedHistory = '';
      state.disputeMode = false;
      state.invoiceFile = '';
      state.disputeFile = '';
    } else state.scenarioMenuOpen = false;
    render();
  });
  window.__developerFinanceDemo = {
    snapshot:() => {
      const audit = auditLedgerData(auditFixture());
      const currentStatements = activeStatements();
      const currentPayments = activePayments();
      return clone({
        scenario:state.demoScenario,
        moneyStorage:state.demoScenario === 'empty' || audit.moneyAmountsAreIntegers ? 'minor-unit-integer' : 'invalid',
        route:state.route, entity:activeEntity(), statements:currentStatements.map(item => ({ id:item.id, status:item.status, payment:item.payment, invoice:item.invoice })),
        counts:{ statements:currentStatements.length, flows:activeFlows().length, disputes:activeDisputes().length, invoices:activeInvoices().length, payments:currentPayments.length },
        ledgerSources:[...new Set(activeFlows().map(item => item.ledgerSource))],
        paymentStatuses:[...new Set(currentPayments.map(item => item.status))],
        pages:{ statements:Math.ceil(filteredStatements().length / PAGE_SIZE), flows:Math.ceil(filteredFlows().length / PAGE_SIZE), payments:Math.ceil(filteredPayments().length / PAGE_SIZE) },
        statementIdsUnique:new Set(currentStatements.map(item => item.id)).size === currentStatements.length,
        ...audit,
        paymentStatementsUnique:new Set(currentPayments.map(item => item.statementId)).size === currentPayments.length,
        paymentAmountsConsistent:currentPayments.every(payment => {
          const statement = currentStatements.find(item => item.id === payment.statementId);
          return statement && statement.settlementMinor === payment.amountMinor;
        }),
        paymentTimelineValid:currentPayments.every(payment => payment.created <= payment.updated),
      });
    },
    auditFixture:() => clone(auditFixture()),
    auditLedger:fixture => clone(auditLedgerData(fixture)),
    setDemoScenario,
    setEntityScenario:status => {
      state.entity = clone(entitySeed);
      state.entity.status = status;
      if (status === 'unconfigured' || status === 'reviewing') state.entity.effectiveVersion = '';
      state.entityDraft = (status === 'draft' || status === 'supplement') ? clone(entitySeed) : null;
      state.entityEditing = status === 'draft' || status === 'supplement';
      state.entityEditMode = state.entity.effectiveVersion ? 'change' : 'initial';
      state.route = 'entity';
      render();
    },
    reset:() => location.reload(),
  };
  render();
})();

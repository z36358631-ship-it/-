window.PublisherFinanceOperationsModel = (() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const pad = value => String(value).padStart(2, '0');
  const money = (minor, currency) => `${currency} ${(Number(minor || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
  const now = () => '2026-09-14 16:30';
  const statusText = {
    waiting_export:'待导出', exported:'已导出待财务', processing:'财务处理中', partial:'部分完成', completed:'已完成', cancelled:'已取消',
    pending:'待付款', remitted:'已汇出', failed:'失败', returned:'退回', held:'暂缓',
  };

  const accountFor = (entityVersion, currency) => {
    if (currency === 'CNY' && entityVersion === 'FIN-2026-006') return {
      entityName:'远光网络科技有限公司', entityVersion, paymentMethod:'境内转账', bankName:'中国银行广州天河支行',
      accountMasked:'**** 9066', accountFull:'60138200001909066', swift:'BKCHCNBJ400',
    };
    if (currency === 'CNY') return {
      entityName:'星海互动科技有限公司', entityVersion, paymentMethod:'境内转账', bankName:'招商银行深圳科技园支行',
      accountMasked:'**** 3188', accountFull:'7559000012383188', swift:'CMBCCNBS',
    };
    if (entityVersion === 'FIN-2026-006') return {
      entityName:'远光网络科技有限公司', entityVersion, paymentMethod:'跨境电汇', bankName:'中国银行（香港）有限公司',
      accountMasked:'**** 9066', accountFull:'012875009066', swift:'BKCHHKHH',
    };
    return {
      entityName:'星海互动科技有限公司', entityVersion, paymentMethod:'跨境电汇', bankName:'汇丰银行（香港）有限公司',
      accountMasked:'**** 7826', accountFull:'848019237826', swift:'HSBCHKHHHKH',
    };
  };

  const baseStatements = [
    ['STMT-2026-08-V1','2026-08','星海互动','平台直销','USD',1842036,'FIN-2026-003','locked','not_required','effective',''],
    ['STMT-2026-05-V1','2026-05','星海互动','盖世 Key 渠道','USD',1384090,'FIN-2026-003','locked','reviewing','effective',''],
    ['STMT-2026-07-V1','2026-07','星海互动','外部 Key 采购','USD',1692814,'FIN-2026-003','locked','approved','effective',''],
    ['STMT-2026-06-V1','2026-06','星海互动','平台直销','CNY',154826000,'FIN-2026-004','locked','not_required','effective',''],
    ['STMT-2026-04-V1','2026-04','远光工作室','平台直销','USD',1192840,'FIN-2026-006','locked','approved','effective','PAYB-202609-002'],
    ['STMT-2026-03-V1','2026-03','星海互动','外部 Key 采购','USD',1128472,'FIN-2026-003','confirmed','not_required','effective',''],
  ];
  const generatedStatements = Array.from({ length:20 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 1 - index, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const id = `STMT-${year}-${pad(month)}-V1`;
    const blocker = index % 5;
    const status = blocker === 0 ? 'locked' : blocker === 1 ? 'locked' : blocker === 2 ? 'locked' : blocker === 3 ? 'confirmed' : 'locked';
    const invoice = blocker === 1 ? 'pending' : 'not_required';
    const entityStatus = blocker === 2 ? 'changing' : 'effective';
    const activeBatch = '';
    return [id, `${year}-${pad(month)}`, index % 3 === 0 ? '远光工作室' : '星海互动', index % 2 ? '盖世 Key 渠道' : '平台直销', index % 4 === 0 ? 'CNY' : 'USD', 820000 + index * 18500, index % 3 === 0 ? 'FIN-2026-006' : 'FIN-2026-003', status, invoice, entityStatus, activeBatch];
  });

  const statements = [...baseStatements, ...generatedStatements].map((row, index) => {
    const [id, period, developer, source, currency, amountMinor, entityVersion, reconciliationStatus, invoiceStatus, entityStatus, activeBatch] = row;
    const account = accountFor(entityVersion, currency);
    return {
      id, period, developer, source, currency, amountMinor, entityVersion, reconciliationStatus, invoiceStatus, entityStatus, activeBatch,
      paymentStatus:activeBatch ? 'completed' : '',
      plannedAt:`2026-${pad(Math.max(1, 10 - (index % 8)))}-25`, updatedAt:`2026-09-${pad(Math.max(1, 14 - (index % 12)))} ${pad(9 + (index % 8))}:20`,
      ...account,
    };
  });

  const makeAttempt = (number, status, time, extra = {}) => ({
    number, status, statusLabel:statusText[status] || status, createdAt:time, operator:'平台运营 李然', reviewer:'财务 王琪', ...extra,
  });
  const makeBatch = (index, status, overrides = {}) => {
    const currency = overrides.currency || (index % 4 === 0 ? 'CNY' : 'USD');
    const entityVersion = overrides.entityVersion || (index % 3 === 0 ? 'FIN-2026-006' : 'FIN-2026-003');
    const account = accountFor(entityVersion, currency);
    const id = overrides.id || `PAYB-${index < 10 ? '202609' : '202608'}-${pad(index)}`;
    const amountMinor = overrides.amountMinor || 920000 + index * 46800;
    const attemptStatus = overrides.attemptStatus || (status === 'completed' ? 'completed' : status === 'partial' ? 'failed' : status === 'processing' ? 'pending' : status === 'exported' ? 'pending' : status === 'cancelled' ? 'failed' : 'pending');
    const attempts = overrides.attempts || (['waiting_export','exported','processing'].includes(status) ? [] : [makeAttempt(1, attemptStatus, `2026-09-${pad(Math.max(1, 14 - (index % 9)))} 15:20`, attemptStatus === 'completed' ? { amountMinor, paidAt:'2026-09-12 11:20', bankReference:`BANK-${id}-01`, proofName:'付款回单.pdf' } : attemptStatus === 'failed' ? { reason:'收款行退回，待核对账户信息' } : {})]);
    const statementIds = overrides.statementIds || [`STMT-BATCH-${pad(index)}-01`];
    const orders = overrides.orders || [{ id:`PAY-${id.slice(5)}-01`, status:attemptStatus, amountMinor, currency, statementId:statementIds[0], attempts }];
    return {
      id, status, createdAt:`2026-09-${pad(Math.max(1, 14 - (index % 10)))} 10:30`, createdBy:'平台运营 李然',
      exportedAt:status === 'waiting_export' ? '' : `2026-09-${pad(Math.max(1, 14 - (index % 10)))} 10:36`, exportedBy:status === 'waiting_export' ? '' : '平台运营 李然',
      totalMinor:amountMinor, currency, entityVersion, ...account,
      statementIds,
      orders,
      logs:overrides.logs || [
        { action:'生成打款批次', actor:'平台运营 李然', time:`2026-09-${pad(Math.max(1, 14 - (index % 10)))} 10:30` },
        ...(status === 'waiting_export' ? [] : [{ action:'导出打款申请单', actor:'平台运营 李然', time:`2026-09-${pad(Math.max(1, 14 - (index % 10)))} 10:36` }]),
      ],
    };
  };

  const batches = [
    makeBatch(1, 'exported', { id:'PAYB-202609-001' }),
    makeBatch(2, 'completed', { id:'PAYB-202609-002', attemptStatus:'completed', statementIds:['STMT-2026-04-V1'], amountMinor:1192840 }),
    makeBatch(3, 'waiting_export', { id:'PAYB-202609-003' }),
    makeBatch(4, 'processing', {
      id:'PAYB-202609-004', attemptStatus:'failed',
      attempts:[makeAttempt(1, 'failed', '2026-09-13 15:20', { reason:'银行账号校验失败' })],
    }),
    makeBatch(5, 'partial', {
      id:'PAYB-202609-005', amountMinor:1120000,
      statementIds:['STMT-HISTORY-005-A','STMT-HISTORY-005-B'],
      orders:[
        { id:'PAY-202609-005-01', status:'completed', amountMinor:620000, currency:'USD', statementId:'STMT-HISTORY-005-A', attempts:[makeAttempt(1, 'completed', '2026-09-12 12:10', { amountMinor:620000, paidAt:'2026-09-12 11:58', bankReference:'BANK-PAYB-202609-005-01', proofName:'付款回单-A.pdf' })] },
        { id:'PAY-202609-005-02', status:'failed', amountMinor:500000, currency:'USD', statementId:'STMT-HISTORY-005-B', attempts:[makeAttempt(1, 'failed', '2026-09-12 12:18', { reason:'收款账户状态异常' })] },
      ],
    }),
    makeBatch(6, 'cancelled', { id:'PAYB-202609-006' }),
    ...Array.from({ length:18 }, (_, index) => makeBatch(index + 7, ['exported','processing','completed','partial'][index % 4])),
  ];

  const createState = () => ({
    scenario:'exhaustive', demoOpen:false, tab:'statements', statementPage:1, batchPage:1,
    statementFilters:{ keyword:'', currency:'all', status:'all', period:'all' },
    batchFilters:{ keyword:'', status:'all', period:'all' }, selectedStatementIds:[],
    statements:clone(statements), batches:clone(batches), modal:'', drawerBatchId:'', drawerMode:'detail', selectedOrderId:'',
    resultDraft:{ result:'remitted', amount:'', paidAt:'2026-09-14T16:30', bankReference:'', proofName:'', proofFile:null, reason:'', reviewer:'财务 王琪' },
    errors:{}, sequence:100,
  });

  const eligibility = statement => {
    if (!statement) return { ok:false, reason:'结算单不存在' };
    if (statement.activeBatch) return { ok:false, reason:'已进入打款批次' };
    if (statement.reconciliationStatus !== 'locked') return { ok:false, reason:'账单尚未锁定' };
    if (!['approved','not_required'].includes(statement.invoiceStatus)) return { ok:false, reason:statement.invoiceStatus === 'reviewing' ? '发票待审核' : '发票条件未满足' };
    if (statement.entityStatus !== 'effective') return { ok:false, reason:'主体资料变更中' };
    return { ok:true, reason:'可生成打款批次' };
  };

  const groupStatements = source => {
    const groups = new Map();
    source.forEach(statement => {
      const key = `${statement.entityVersion}|${statement.currency}|${statement.paymentMethod}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(statement);
    });
    return [...groups.values()];
  };

  const previewBatches = (state, statementIds) => {
    const selected = statementIds.map(id => state.statements.find(item => item.id === id)).filter(Boolean);
    const valid = selected.filter(item => eligibility(item).ok);
    return { selected, valid, groups:groupStatements(valid) };
  };

  const createBatches = (state, statementIds) => {
    const preview = previewBatches(state, statementIds);
    const created = preview.groups.map(group => {
      state.sequence += 1;
      const sample = group[0];
      const batch = makeBatch(state.sequence, 'exported', {
        id:`PAYB-202609-${String(state.sequence).padStart(3, '0')}`,
        currency:sample.currency, entityVersion:sample.entityVersion,
        amountMinor:group.reduce((sum, item) => sum + item.amountMinor, 0),
        statementIds:group.map(item => item.id), attempts:[],
        logs:[
          { action:'生成打款批次', actor:'平台运营 李然', time:now() },
          { action:'导出打款申请单', actor:'平台运营 李然', time:now() },
        ],
      });
      batch.orders = group.map((statement, orderIndex) => ({
        id:`PAY-${state.sequence}-${pad(orderIndex + 1)}`, status:'pending', amountMinor:statement.amountMinor,
        currency:statement.currency, statementId:statement.id, attempts:[],
      }));
      group.forEach(statement => { statement.activeBatch = batch.id; statement.paymentStatus = 'processing'; });
      return batch;
    });
    state.batches.unshift(...created);
    state.selectedStatementIds = [];
    return created;
  };

  const batchStatus = batch => {
    if (!batch.orders.length) return batch.status;
    const statuses = batch.orders.map(order => order.status);
    if (statuses.every(status => status === 'completed')) return 'completed';
    if (statuses.some(status => status === 'completed')) return 'partial';
    if (statuses.some(status => ['remitted','failed','returned','held','processing'].includes(status))) return 'processing';
    return batch.status === 'waiting_export' ? 'waiting_export' : 'exported';
  };

  const allowedResults = order => {
    if (!order || order.status === 'completed') return [];
    if (order.status === 'remitted') return ['completed','returned','failed'];
    if (order.status === 'held') return ['remitted','completed','failed','returned','held'];
    return ['remitted','completed','failed','held'];
  };

  const recordAttempt = (state, orderId, result) => {
    const batch = state.batches.find(item => item.orders.some(order => order.id === orderId));
    const order = batch?.orders.find(item => item.id === orderId);
    if (!batch || !order) return null;
    const status = result.result;
    if (!allowedResults(order).includes(status)) return null;
    if (!String(result.reviewer || '').trim()) return null;
    if (['remitted','completed'].includes(status) && result.amountMinor !== order.amountMinor) return null;
    const updatesExistingAttempt = ['remitted','held'].includes(order.status) && order.attempts.length > 0;
    const attempt = updatesExistingAttempt ? order.attempts.at(-1) : makeAttempt(order.attempts.length + 1, status, now());
    Object.assign(attempt, {
      status, statusLabel:statusText[status] || status, updatedAt:now(), amountMinor:result.amountMinor || order.amountMinor,
      paidAt:result.paidAt || attempt.paidAt || '', bankReference:result.bankReference || attempt.bankReference || '',
      proofName:result.proofName || attempt.proofName || '', reason:result.reason || '', reviewer:String(result.reviewer).trim(),
    });
    if (!updatesExistingAttempt) order.attempts.push(attempt);
    order.status = status;
    batch.logs.push({ action:`登记付款结果：${statusText[status] || status}`, actor:'平台运营 李然', time:now() });
    const statement = state.statements.find(item => item.id === order.statementId);
    if (statement) {
      statement.paymentStatus = status;
      statement.updatedAt = now();
      batch.logs.push({ action:`同步开发者端付款状态：${statusText[status] || status}`, actor:'系统', time:now() });
    }
    batch.status = batchStatus(batch);
    return { batch, order, attempt };
  };

  const safeCell = value => {
    const text = String(value ?? '');
    const protectedText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${protectedText.replaceAll('"', '""')}"`;
  };

  const exportCsv = selectedBatches => {
    const headers = ['打款批次号','付款单号','结算单号','财务主体','主体版本','银行','银行账号','SWIFT/BIC','币种','应付金额','付款方式','批次状态'];
    const rows = selectedBatches.flatMap(batch => batch.orders.map(order => [
      batch.id, order.id, order.statementId || batch.statementIds.join('、'), batch.entityName, batch.entityVersion,
      batch.bankName, batch.accountFull, batch.swift, batch.currency, money(order.amountMinor, order.currency), batch.paymentMethod, statusText[batch.status] || batch.status,
    ]));
    return `\uFEFF${[headers, ...rows].map(row => row.map(safeCell).join(',')).join('\r\n')}`;
  };

  return { createState, eligibility, previewBatches, createBatches, recordAttempt, batchStatus, allowedResults, exportCsv, money, statusText, now };
})();

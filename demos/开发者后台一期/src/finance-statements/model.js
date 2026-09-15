/* 开发者与运营共用的结算单、财务主体和结算比例版本模型。 */
window.PublisherSettlementStatements = (() => {
  'use strict';

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
  const DEFAULT_RATIO = 70;
  const ITEM_ORDER = Object.freeze({
    game_sales_share:0,
    dlc_sales_share:1,
    cdkey_sales_share:2,
    refund_chargeback_adjustment:3,
  });
  const ITEM_LABELS = Object.freeze({
    game_sales_share:'游戏销售分成',
    dlc_sales_share:'DLC 销售分成',
    cdkey_sales_share:'CDKEY 销售分成',
    refund_chargeback_adjustment:'退款与拒付',
  });

  const roundMinor = value => {
    const number = Number(value);
    const rounded = Math.round(Math.abs(number));
    return number < 0 && rounded ? -rounded : rounded;
  };

  const assertMonth = value => {
    if (!MONTH_PATTERN.test(String(value || ''))) throw new Error('月份格式应为 YYYY-MM');
    return String(value);
  };

  const nextMonth = value => {
    const month = assertMonth(value);
    const year = Number(month.slice(0, 4));
    const number = Number(month.slice(5, 7));
    return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`;
  };

  const nowText = () => {
    const date = new Date();
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const activeEntitySeeds = Object.freeze([
    Object.freeze({
      developerId:'DEV-1001', developerName:'星海互动', entityVersion:'FIN-2026-003', status:'approved',
      legalName:'深圳星海互动科技有限公司', contactName:'王明', phone:'18520064686', email:'finance@ocean-expedition.com',
      bankAccountName:'深圳星海互动科技有限公司', bankName:'中国建设银行深圳科技园支行', bankAccount:'6222000000008899',
      bankBranch:'中国建设银行深圳科技园支行', bankProof:{ name:'银行开户证明.jpg', type:'image/jpeg', size:524288 },
      approvedAt:'2026-05-18 16:20', approvedBy:'平台运营 李然',
    }),
    Object.freeze({
      developerId:'DEV-2001', developerName:'远光工作室', entityVersion:'FIN-2026-006', status:'approved',
      legalName:'广州远光网络科技有限公司', contactName:'陈宇', phone:'18620061234', email:'finance@far-light.cn',
      bankAccountName:'广州远光网络科技有限公司', bankName:'中国银行广州天河支行', bankAccount:'60138200001909066',
      bankBranch:'中国银行广州天河支行', bankProof:{ name:'远光开户证明.png', type:'image/png', size:384000 },
      approvedAt:'2026-06-09 11:05', approvedBy:'平台运营 李然',
    }),
    Object.freeze({
      developerId:'DEV-3001', developerName:'极昼工作室', entityVersion:'FIN-2026-007', status:'approved',
      legalName:'杭州极昼数字娱乐有限公司', contactName:'刘欣', phone:'13700001111', email:'finance@daylight.cn',
      bankAccountName:'杭州极昼数字娱乐有限公司', bankName:'招商银行杭州分行', bankAccount:'755900000000009',
      bankBranch:'招商银行杭州分行', bankProof:{ name:'极昼原银行证明.webp', type:'image/webp', size:264000 },
      approvedAt:'2026-07-03 15:40', approvedBy:'平台运营 李然',
    }),
  ]);

  const ratioSeeds = Object.freeze([
    Object.freeze({
      id:'RATIO-2025-001', developerId:'DEV-1001', ratioPercent:65, effectiveBillingMonth:'2025-01', reason:'初始合同',
      operator:'平台运营 李然', operatedAt:'2025-01-02 10:00', previousRatioPercent:DEFAULT_RATIO, status:'active',
    }),
    Object.freeze({
      id:'RATIO-2026-001', developerId:'DEV-1001', ratioPercent:70, effectiveBillingMonth:'2026-01', reason:'合同续签',
      operator:'平台运营 李然', operatedAt:'2025-12-20 15:30', previousRatioPercent:65, status:'active',
    }),
    Object.freeze({
      id:'RATIO-2026-002', developerId:'DEV-2001', ratioPercent:70, effectiveBillingMonth:'2026-01', reason:'初始合同',
      operator:'平台运营 李然', operatedAt:'2025-12-22 09:40', previousRatioPercent:DEFAULT_RATIO, status:'active',
    }),
  ]);

  const applicationSeeds = Object.freeze([
    Object.freeze({
      id:'FIN-APP-2026-001', applicationType:'change', status:'pending', developerId:'DEV-3001', developerName:'极昼工作室',
      entityVersion:'FIN-2026-008', submittedAt:'2026-09-14 10:18', submittedBy:'刘欣', reviewReason:'', reviewedAt:'', reviewedBy:'',
      snapshot:{
        developerId:'DEV-3001', developerName:'极昼工作室', entityVersion:'FIN-2026-008', status:'pending',
        legalName:'杭州极昼网络科技有限公司', contactName:'刘欣', phone:'13700001111', email:'finance@daylight.cn',
        bankAccountName:'杭州极昼网络科技有限公司', bankName:'招商银行杭州分行', bankAccount:'755900000000113',
        bankBranch:'招商银行杭州分行', bankProof:{ name:'极昼银行证明.webp', type:'image/webp', size:286000 },
      },
    }),
    Object.freeze({
      id:'FIN-APP-2026-002', applicationType:'initial', status:'rejected', developerId:'DEV-4001', developerName:'像素工坊',
      entityVersion:'FIN-2026-009', submittedAt:'2026-09-10 09:30', submittedBy:'周乐', reviewReason:'银行证明附件不清晰',
      reviewedAt:'2026-09-11 14:25', reviewedBy:'平台运营 李然',
      snapshot:{
        developerId:'DEV-4001', developerName:'像素工坊', entityVersion:'FIN-2026-009', status:'rejected',
        legalName:'成都像素工坊科技有限公司', contactName:'周乐', phone:'13900002222', email:'finance@pixel-workshop.cn',
        bankAccountName:'成都像素工坊科技有限公司', bankName:'中国工商银行成都分行', bankAccount:'6212000000002202',
        bankBranch:'中国工商银行成都分行', bankProof:{ name:'像素银行证明.jpg', type:'image/jpeg', size:245000 },
      },
    }),
  ]);

  const defaultRatioRecord = (developerId, billingMonth) => ({
    id:'RATIO-DEFAULT-70', developerId, ratioPercent:DEFAULT_RATIO, effectiveBillingMonth:'0000-01',
    reason:'平台默认比例', operator:'系统', operatedAt:'', previousRatioPercent:DEFAULT_RATIO, status:'active', billingMonth,
  });

  const ratioFor = (state, developerId, billingMonth) => {
    const month = assertMonth(billingMonth);
    const candidates = (state.ratioVersions || [])
      .filter(item => item.developerId === developerId && item.status !== 'superseded' && item.effectiveBillingMonth <= month)
      .slice()
      .sort((a, b) => b.effectiveBillingMonth.localeCompare(a.effectiveBillingMonth) || b.operatedAt.localeCompare(a.operatedAt));
    return clone(candidates[0] || defaultRatioRecord(developerId, month));
  };

  const gamesByDeveloper = Object.freeze({
    'DEV-1001':Object.freeze([
      Object.freeze({ id:'GAME-48291', name:'星海远征' }),
      Object.freeze({ id:'GAME-48292', name:'暗影重构' }),
      Object.freeze({ id:'GAME-48293', name:'风暴边境' }),
      Object.freeze({ id:'GAME-48294', name:'机械黎明' }),
    ]),
    'DEV-2001':Object.freeze([
      Object.freeze({ id:'GAME-48311', name:'荒野余烬' }),
      Object.freeze({ id:'GAME-48312', name:'霓虹突围' }),
    ]),
  });

  const splitMinor = (total, weights) => {
    let allocated = 0;
    return weights.map((weight, index) => {
      if (index === weights.length - 1) return total - allocated;
      const value = Math.round(total * weight);
      allocated += value;
      return value;
    });
  };

  const cdkeyDetailsFor = ({ game, userPaidMinor, receivedMinor }) => {
    const paidParts = splitMinor(userPaidMinor, [0.52, 0.31, 0.17]);
    const receivedParts = splitMinor(receivedMinor, [0.52, 0.31, 0.17]);
    return [
      { channel:'星云商城', productType:'游戏本体', productName:`${game.name} 标准版` },
      { channel:'远航游戏', productType:'游戏本体', productName:`${game.name} 豪华版` },
      { channel:'星云商城', productType:'DLC', productName:`${game.name} · 远征者扩展包` },
    ].map((item, index) => ({
      ...item,
      userPaidMinor:paidParts[index],
      receivedMinor:receivedParts[index],
      settlementMinor:receivedParts[index],
    }));
  };

  const createStatement = ({ state, developerId, developerName, entity, game, billingMonth, gameIndex, monthIndex, itemType }) => {
    const contractRatio = ratioFor(state, developerId, billingMonth);
    const basePaid = 7800000 + gameIndex * 925000 + monthIndex * 680000;
    const paid = itemType === 'dlc_sales_share'
      ? Math.round(basePaid * 0.28)
      : itemType === 'cdkey_sales_share'
        ? Math.round(basePaid * 0.18)
        : basePaid;
    const tax = Math.round(paid * 0.06);
    const fee = Math.round(paid * (itemType === 'cdkey_sales_share' ? 0.045 : 0.029));
    const adjustments = {
      game_sales_share:{ userPaidMinor:paid, refundMinor:0, chargebackMinor:0, salesTaxMinor:tax, paymentFeeMinor:fee },
      dlc_sales_share:{ userPaidMinor:paid, refundMinor:0, chargebackMinor:0, salesTaxMinor:tax, paymentFeeMinor:fee },
      cdkey_sales_share:{ userPaidMinor:paid, refundMinor:0, chargebackMinor:0, salesTaxMinor:tax, paymentFeeMinor:fee },
      refund_chargeback_adjustment:{
        userPaidMinor:0,
        refundMinor:Math.round(basePaid * 0.032),
        chargebackMinor:Math.round(basePaid * 0.014),
        salesTaxMinor:0,
        paymentFeeMinor:0,
      },
    }[itemType];
    const receivedMinor = adjustments.userPaidMinor - adjustments.refundMinor - adjustments.chargebackMinor - adjustments.salesTaxMinor - adjustments.paymentFeeMinor;
    const fixedRatio = itemType === 'cdkey_sales_share' || itemType === 'refund_chargeback_adjustment';
    const ratioPercent = fixedRatio ? 100 : contractRatio.ratioPercent;
    const ratioVersion = fixedRatio ? `POLICY-${itemType === 'cdkey_sales_share' ? 'CDKEY' : 'REFUND'}-100` : contractRatio.id;
    const suffix = {
      game_sales_share:'GAME',
      dlc_sales_share:'DLC',
      cdkey_sales_share:'CDKEY',
      refund_chargeback_adjustment:'REFUND-CHARGEBACK',
    }[itemType];
    const confirmed = (monthIndex + gameIndex + ITEM_ORDER[itemType]) % 4 === 0;
    const statement = {
      id:`ST-${billingMonth.replace('-', '')}-${game.id}-${suffix}`,
      developerId, developerName, entityName:entity.legalName, entityVersion:entity.entityVersion,
      gameId:game.id, gameName:game.name, billingMonth, settlementMonth:nextMonth(billingMonth),
      itemType, itemLabel:ITEM_LABELS[itemType], currency:'CNY', ...adjustments, receivedMinor,
      ratioPercent, ratioVersion,
      settlementMinor:roundMinor(receivedMinor * ratioPercent / 100),
      status:confirmed ? 'confirmed' : 'pending', lockedAt:`${nextMonth(billingMonth)}-05 11:20`,
      confirmedAt:confirmed ? `${nextMonth(billingMonth)}-08 10:30` : '', confirmedBy:confirmed ? '开发者 王明' : '',
    };
    if (itemType === 'cdkey_sales_share') statement.cdkeyDetails = cdkeyDetailsFor({ game, userPaidMinor:statement.userPaidMinor, receivedMinor:statement.receivedMinor });
    return statement;
  };

  const seedStatements = state => {
    const months = ['2026-08','2026-07','2026-06'];
    return activeEntitySeeds.flatMap((entity, developerIndex) => months.flatMap((billingMonth, monthIndex) => {
      const games = gamesByDeveloper[entity.developerId] || [];
      return games.flatMap((game, gameIndex) => Object.keys(ITEM_ORDER).map(itemType => createStatement({
        state, developerId:entity.developerId, developerName:entity.developerName, entity, game,
        billingMonth, gameIndex:gameIndex + developerIndex, monthIndex, itemType,
      })));
    }));
  };

  const createState = () => {
    const state = {
      ratioVersions:clone(ratioSeeds),
      financialEntityVersions:clone(activeEntitySeeds),
      activeFinancialEntityVersions:Object.fromEntries(activeEntitySeeds.map(item => [item.developerId, item.entityVersion])),
      financialEntityApplications:clone(applicationSeeds),
      statements:[],
    };
    state.financialEntityVersions.push(...state.financialEntityApplications.map(application => clone(application.snapshot)));
    state.statements = seedStatements(state);
    return state;
  };

  const isAll = value => value == null || value === '' || value === 'all';
  const statementMatches = (row, filters) => {
    if (!isAll(filters.developerId) && row.developerId !== filters.developerId) return false;
    if (!isAll(filters.developer) && row.developerName !== filters.developer) return false;
    if (!isAll(filters.entityName) && row.entityName !== filters.entityName) return false;
    if (!isAll(filters.gameId) && row.gameId !== filters.gameId) return false;
    if (!isAll(filters.game) && row.gameId !== filters.game && row.gameName !== filters.game) return false;
    if (!isAll(filters.billingMonth) && row.billingMonth !== filters.billingMonth) return false;
    if (!isAll(filters.settlementMonth) && row.settlementMonth !== filters.settlementMonth) return false;
    if (!isAll(filters.itemType) && row.itemType !== filters.itemType) return false;
    if (!isAll(filters.status) && row.status !== filters.status) return false;
    const keyword = String(filters.keyword || '').trim().toLowerCase();
    return !keyword || `${row.developerId} ${row.developerName} ${row.entityName} ${row.gameId} ${row.gameName}`.toLowerCase().includes(keyword);
  };

  const statementsFor = (state, filters = {}) => (state.statements || [])
    .filter(row => statementMatches(row, filters))
    .slice()
    .sort((a, b) => b.billingMonth.localeCompare(a.billingMonth) || a.gameId.localeCompare(b.gameId) || ITEM_ORDER[a.itemType] - ITEM_ORDER[b.itemType])
    .map(clone);

  const confirmStatements = (state, ids, details = {}) => {
    const requested = new Set(Array.isArray(ids) ? ids : [ids]);
    const confirmedAt = details.confirmedAt || nowText();
    const confirmedBy = details.confirmedBy || '开发者';
    const changed = [];
    (state.statements || []).forEach(row => {
      if (!requested.has(row.id) || row.status !== 'pending') return;
      row.status = 'confirmed';
      row.confirmedAt = confirmedAt;
      row.confirmedBy = confirmedBy;
      row.lockedAt ||= confirmedAt;
      changed.push(clone(row));
    });
    return changed;
  };

  const saveRatioVersion = (state, input = {}) => {
    const developerId = String(input.developerId || '').trim();
    if (!developerId) throw new Error('缺少开发者');
    const rawRatioPercent = input.ratioPercent;
    if (rawRatioPercent == null || String(rawRatioPercent).trim() === '') throw new Error('请填写结算比例');
    const ratioPercent = Number(rawRatioPercent);
    if (!Number.isFinite(ratioPercent) || ratioPercent < 0 || ratioPercent > 100) throw new Error('结算比例范围为 0%-100%');
    if (!Number.isInteger(ratioPercent)) throw new Error('结算比例必须为整数');
    const effectiveBillingMonth = assertMonth(input.effectiveBillingMonth);
    const reason = String(input.reason || '').trim();
    if (!reason) throw new Error('请填写变更原因');
    if (input.canManageFinance === false) throw new Error('无财务配置权限');

    const previous = ratioFor(state, developerId, effectiveBillingMonth);
    (state.ratioVersions || []).forEach(version => {
      if (version.developerId === developerId && version.effectiveBillingMonth === effectiveBillingMonth && version.status !== 'superseded') version.status = 'superseded';
    });
    const sequence = String((state.ratioVersions || []).length + 1).padStart(3, '0');
    const version = {
      id:input.id || `RATIO-${effectiveBillingMonth.replace('-', '')}-${sequence}`,
      developerId, ratioPercent, effectiveBillingMonth, reason,
      operator:String(input.operator || '平台运营').trim(), operatedAt:input.operatedAt || nowText(),
      previousRatioPercent:previous.ratioPercent, status:'active',
    };
    state.ratioVersions.push(version);

    (state.statements || []).forEach(row => {
      if (row.developerId !== developerId || row.status === 'confirmed' || row.lockedAt) return;
      if (row.itemType === 'cdkey_sales_share' || row.itemType === 'refund_chargeback_adjustment') return;
      const applied = ratioFor(state, developerId, row.billingMonth);
      row.ratioPercent = applied.ratioPercent;
      row.ratioVersion = applied.id;
      row.settlementMinor = roundMinor(row.receivedMinor * applied.ratioPercent / 100);
    });
    return clone(version);
  };

  const financialEntity = (state, developerId) => {
    const versionId = state.activeFinancialEntityVersions?.[developerId];
    if (!versionId) return null;
    const entity = (state.financialEntityVersions || []).find(item => item.developerId === developerId && item.entityVersion === versionId && item.status === 'approved');
    return clone(entity || null);
  };

  const financialEntityApplications = (state, filters = {}) => (state.financialEntityApplications || [])
    .filter(application => {
      if (!isAll(filters.developerId) && application.developerId !== filters.developerId) return false;
      if (!isAll(filters.status) && application.status !== filters.status) return false;
      if (!isAll(filters.applicationType) && application.applicationType !== filters.applicationType) return false;
      const keyword = String(filters.keyword || '').trim().toLowerCase();
      return !keyword || `${application.developerId} ${application.developerName} ${application.snapshot?.legalName || ''}`.toLowerCase().includes(keyword);
    })
    .slice()
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id))
    .map(clone);

  const requiredText = (value, label) => {
    const text = String(value || '').trim();
    if (!text) throw new Error(`${label}为必填项`);
    return text;
  };

  const validateEntityInput = input => {
    const snapshot = {
      developerId:requiredText(input.developerId, '开发者 ID'),
      developerName:requiredText(input.developerName, '开发者'),
      legalName:requiredText(input.legalName, '企业法定名称'),
      contactName:requiredText(input.contactName, '联系人姓名'),
      phone:requiredText(input.phone, '手机号'),
      email:requiredText(input.email, '邮箱'),
      bankAccountName:requiredText(input.bankAccountName, '银行账户户名'),
      bankName:requiredText(input.bankName, '开户银行'),
      bankAccount:requiredText(input.bankAccount, '银行账号'),
      bankBranch:requiredText(input.bankBranch, '开户支行／联行信息'),
      bankProof:clone(input.bankProof),
    };
    if (!/^1\d{10}$/.test(snapshot.phone)) throw new Error('请填写正确的手机号');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(snapshot.email)) throw new Error('请填写正确的邮箱');
    if (snapshot.bankAccountName !== snapshot.legalName) throw new Error('银行账户户名必须与企业法定名称一致');
    if (!snapshot.bankProof || !snapshot.bankProof.name) throw new Error('请上传银行账户证明附件');
    if (!['image/jpeg','image/png','image/webp'].includes(snapshot.bankProof.type)) throw new Error('银行证明附件仅支持 JPG、PNG、WEBP');
    if (Number(snapshot.bankProof.size || 0) > 10 * 1024 * 1024) throw new Error('银行证明附件不能超过 10 MB');
    return snapshot;
  };

  const submitFinancialEntity = (state, input = {}) => {
    const snapshot = validateEntityInput(input);
    const pending = (state.financialEntityApplications || []).find(item => item.developerId === snapshot.developerId && item.status === 'pending');
    if (pending) throw new Error('该开发者已有待审核的财务主体申请');
    const current = financialEntity(state, snapshot.developerId);
    const year = String(input.submittedAt || nowText()).slice(0, 4);
    const nextSuffix = (items, readId) => Math.max(0, ...items.map(item => Number((readId(item).match(/(\d+)$/) || [])[1] || 0))) + 1;
    const applicationIndex = nextSuffix(state.financialEntityApplications, item => item.id);
    const entityIndex = nextSuffix(state.financialEntityVersions, item => item.entityVersion);
    const entityVersion = `FIN-${year}-${String(entityIndex).padStart(3, '0')}`;
    const application = {
      id:input.id || `FIN-APP-${year}-${String(applicationIndex).padStart(3, '0')}`,
      applicationType:current ? 'change' : 'initial', status:'pending',
      developerId:snapshot.developerId, developerName:snapshot.developerName, entityVersion,
      submittedAt:input.submittedAt || nowText(), submittedBy:String(input.submittedBy || snapshot.contactName).trim(),
      reviewedAt:'', reviewedBy:'', reviewReason:'', snapshot:{ ...snapshot, entityVersion, status:'pending' },
    };
    state.financialEntityApplications.push(application);
    state.financialEntityVersions.push(clone(application.snapshot));
    return clone(application);
  };

  const reviewFinancialEntity = (state, applicationId, input = {}) => {
    const application = (state.financialEntityApplications || []).find(item => item.id === applicationId);
    if (!application) throw new Error('未找到财务主体申请');
    if (application.status !== 'pending') throw new Error('该申请已完成审核');
    const result = input.result;
    if (!['approved','rejected'].includes(result)) throw new Error('审核结果仅支持 approved 或 rejected');
    const reason = String(input.reason || '').trim();
    if (result === 'rejected' && !reason) throw new Error('驳回必须填写原因');
    const reviewedAt = input.reviewedAt || nowText();
    const operator = String(input.operator || '平台运营').trim();
    Object.assign(application, { status:result, reviewedAt, reviewedBy:operator, reviewReason:reason });
    const version = state.financialEntityVersions.find(item => item.developerId === application.developerId && item.entityVersion === application.entityVersion);
    if (version) Object.assign(version, { status:result, reviewedAt, reviewedBy:operator, reviewReason:reason });
    if (result === 'approved') {
      const previousVersionId = state.activeFinancialEntityVersions[application.developerId];
      const previous = state.financialEntityVersions.find(item => item.developerId === application.developerId && item.entityVersion === previousVersionId && item.status === 'approved');
      if (previous) previous.status = 'superseded';
      state.activeFinancialEntityVersions[application.developerId] = application.entityVersion;
    }
    return clone(application);
  };

  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const safeCell = value => {
    const text = String(value ?? '');
    const formulaLike = /^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text);
    return quote(formulaLike ? `'${text}` : text);
  };
  const decimal = minor => (Number(minor || 0) / 100).toFixed(2);
  const statusLabel = status => status === 'confirmed' ? '已确认' : '待确认';

  const exportStatementsCsv = (rows, options = {}) => {
    const includeDeveloper = Boolean(options.includeDeveloper);
    const includeRatioVersion = Boolean(options.includeRatioVersion);
    const headers = [
      ...(includeDeveloper ? ['开发者','财务主体'] : []),
      '游戏 ID','游戏名称','账单月份','结算月份','结算项','用户支付金额（CNY）','结算比例',
      ...(includeRatioVersion ? ['结算比例版本'] : []),
      '实际到账金额（CNY）','结算金额（CNY）','状态',
    ];
    const lines = (rows || []).map(row => [
      ...(includeDeveloper ? [safeCell(row.developerName), safeCell(row.entityName)] : []),
      safeCell(row.gameId), safeCell(row.gameName), safeCell(row.billingMonth), safeCell(row.settlementMonth), safeCell(row.itemLabel),
      quote(decimal(row.userPaidMinor)), quote(`${row.ratioPercent}%`),
      ...(includeRatioVersion ? [safeCell(row.ratioVersion)] : []),
      quote(decimal(row.receivedMinor)), quote(decimal(row.settlementMinor)), safeCell(statusLabel(row.status)),
    ].join(','));
    return `\uFEFF${[headers.map(safeCell).join(','), ...lines].join('\r\n')}`;
  };

  return Object.freeze({
    createState,
    nextMonth,
    statementsFor,
    confirmStatements,
    ratioFor,
    saveRatioVersion,
    financialEntity,
    financialEntityApplications,
    submitFinancialEntity,
    reviewFinancialEntity,
    exportStatementsCsv,
  });
})();

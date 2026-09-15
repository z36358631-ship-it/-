/* 开发者与运营共用的结算快照、阶梯分成和财务主体模型。 */
window.PublisherSettlementStatements = (() => {
  'use strict';

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
  const ITEM_ORDER = Object.freeze({ game_sales_share:0, cdkey_sales_share:1, refund_chargeback_adjustment:2 });
  const ITEM_LABELS = Object.freeze({
    game_sales_share:'游戏销售分成',
    cdkey_sales_share:'CDKEY 销售分成',
    refund_chargeback_adjustment:'退款与拒付',
  });
  const DEFAULT_TIERS = Object.freeze([
    Object.freeze({ fromMinor:0, toMinor:100000000, platformRate:30 }),
    Object.freeze({ fromMinor:100000000, toMinor:500000000, platformRate:25 }),
    Object.freeze({ fromMinor:500000000, toMinor:null, platformRate:20 }),
  ]);

  const roundMinor = value => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    const rounded = Math.round(Math.abs(number));
    return number < 0 && rounded ? -rounded : rounded;
  };
  const sum = (rows, field) => roundMinor((rows || []).reduce((total, row) => total + Number(row[field] || 0), 0));
  const ratePercent = (part, whole) => whole ? Number((part / whole * 100).toFixed(2)) : null;
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
      developerId:'DEV-1001', developerName:'星海互动', entityVersion:'FIN-2026-003', accountVersion:'BANK-2026-003', status:'approved',
      legalName:'深圳星海互动科技有限公司', contactName:'王明', phone:'18520064686', email:'finance@ocean-expedition.com',
      bankAccountName:'深圳星海互动科技有限公司', bankName:'中国建设银行深圳科技园支行', bankAccount:'6222000000008899',
      bankBranch:'中国建设银行深圳科技园支行', bankProof:{ name:'银行开户证明.jpg', type:'image/jpeg', size:524288 },
      approvedAt:'2026-05-18 16:20', approvedBy:'平台运营 李然',
    }),
    Object.freeze({
      developerId:'DEV-2001', developerName:'远光工作室', entityVersion:'FIN-2026-006', accountVersion:'BANK-2026-006', status:'approved',
      legalName:'广州远光网络科技有限公司', contactName:'陈宇', phone:'18620061234', email:'finance@far-light.cn',
      bankAccountName:'广州远光网络科技有限公司', bankName:'中国银行广州天河支行', bankAccount:'60138200001909066',
      bankBranch:'中国银行广州天河支行', bankProof:{ name:'远光开户证明.png', type:'image/png', size:384000 },
      approvedAt:'2026-06-09 11:05', approvedBy:'平台运营 李然',
    }),
    Object.freeze({
      developerId:'DEV-3001', developerName:'极昼工作室', entityVersion:'FIN-2026-007', accountVersion:'BANK-2026-007', status:'approved',
      legalName:'杭州极昼数字娱乐有限公司', contactName:'刘欣', phone:'13700001111', email:'finance@daylight.cn',
      bankAccountName:'杭州极昼数字娱乐有限公司', bankName:'招商银行杭州分行', bankAccount:'755900000000009',
      bankBranch:'招商银行杭州分行', bankProof:{ name:'极昼原银行证明.webp', type:'image/webp', size:264000 },
      approvedAt:'2026-07-03 15:40', approvedBy:'平台运营 李然',
    }),
  ]);
  const applicationSeeds = Object.freeze([
    Object.freeze({
      id:'FIN-APP-2026-001', applicationType:'change', status:'pending', developerId:'DEV-3001', developerName:'极昼工作室',
      entityVersion:'FIN-2026-008', accountVersion:'BANK-2026-008', submittedAt:'2026-09-14 10:18', submittedBy:'刘欣', reviewReason:'', reviewedAt:'', reviewedBy:'',
      snapshot:{
        developerId:'DEV-3001', developerName:'极昼工作室', entityVersion:'FIN-2026-008', accountVersion:'BANK-2026-008', status:'pending',
        legalName:'杭州极昼网络科技有限公司', contactName:'刘欣', phone:'13700001111', email:'finance@daylight.cn',
        bankAccountName:'杭州极昼网络科技有限公司', bankName:'招商银行杭州分行', bankAccount:'755900000000113',
        bankBranch:'招商银行杭州分行', bankProof:{ name:'极昼银行证明.webp', type:'image/webp', size:286000 },
      },
    }),
    Object.freeze({
      id:'FIN-APP-2026-002', applicationType:'initial', status:'rejected', developerId:'DEV-4001', developerName:'像素工坊',
      entityVersion:'FIN-2026-009', accountVersion:'BANK-2026-009', submittedAt:'2026-09-10 09:30', submittedBy:'周乐', reviewReason:'银行证明附件不清晰',
      reviewedAt:'2026-09-11 14:25', reviewedBy:'平台运营 李然',
      snapshot:{
        developerId:'DEV-4001', developerName:'像素工坊', entityVersion:'FIN-2026-009', accountVersion:'BANK-2026-009', status:'rejected',
        legalName:'成都像素工坊科技有限公司', contactName:'周乐', phone:'13900002222', email:'finance@pixel-workshop.cn',
        bankAccountName:'成都像素工坊科技有限公司', bankName:'中国工商银行成都分行', bankAccount:'6212000000002202',
        bankBranch:'中国工商银行成都分行', bankProof:{ name:'像素银行证明.jpg', type:'image/jpeg', size:245000 },
      },
    }),
  ]);
  const gamesByDeveloper = Object.freeze({
    'DEV-1001':Object.freeze([
      Object.freeze({ id:'GAME-48291', name:'星海远征' }), Object.freeze({ id:'GAME-48292', name:'暗影重构' }),
      Object.freeze({ id:'GAME-48293', name:'风暴边境' }), Object.freeze({ id:'GAME-48294', name:'机械黎明' }),
    ]),
    'DEV-2001':Object.freeze([Object.freeze({ id:'GAME-48311', name:'荒野余烬' }), Object.freeze({ id:'GAME-48312', name:'霓虹突围' })]),
  });

  const normalizeTiers = tiers => {
    if (!Array.isArray(tiers) || !tiers.length) throw new Error('至少配置一个阶梯');
    return tiers.map((tier, index) => {
      const fromMinor = Number(tier.fromMinor);
      const toMinor = tier.toMinor == null || tier.toMinor === '' ? null : Number(tier.toMinor);
      const platformRate = Number(tier.platformRate);
      if (!Number.isInteger(fromMinor) || fromMinor < 0 || (toMinor != null && (!Number.isInteger(toMinor) || toMinor <= fromMinor))) throw new Error(`第 ${index + 1} 档金额范围无效`);
      if (!Number.isFinite(platformRate) || platformRate < 0 || platformRate > 100) throw new Error('平台分成比例范围为 0%-100%');
      if (index === 0 && fromMinor !== 0) throw new Error('首档必须从 0 元开始');
      if (index > 0 && fromMinor !== Number(tiers[index - 1].toMinor)) throw new Error('阶梯金额必须连续，不得重叠或留空');
      if (index > 0 && platformRate > Number(tiers[index - 1].platformRate)) throw new Error('后一档平台分成比例不得高于前一档');
      if (index < tiers.length - 1 && toMinor == null) throw new Error('仅末档可不设上限');
      if (index === tiers.length - 1 && toMinor != null) throw new Error('末档必须不设上限');
      return { fromMinor, toMinor, platformRate };
    });
  };

  const calculateTieredPlatformShare = (netMinor, tiers) => {
    const normalized = normalizeTiers(tiers);
    const basisMinor = Math.max(0, roundMinor(netMinor));
    let platformShareMinor = 0;
    const tierSnapshots = normalized.map(tier => {
      const upper = tier.toMinor == null ? basisMinor : Math.min(basisMinor, tier.toMinor);
      const chargeableMinor = Math.max(0, upper - tier.fromMinor);
      const shareMinor = roundMinor(chargeableMinor * tier.platformRate / 100);
      platformShareMinor += shareMinor;
      return { ...tier, chargeableMinor, shareMinor };
    });
    return { basisMinor, platformShareMinor:roundMinor(platformShareMinor), tierSnapshots };
  };

  const defaultTierRule = (developerId, gameId) => ({
    id:`TIER-DEFAULT-${developerId}-${gameId}`, developerId, gameId, effectiveBillingMonth:'0000-01',
    tiers:clone(DEFAULT_TIERS), reason:'平台默认阶梯', operator:'系统', operatedAt:'', status:'active',
  });
  const tierRuleFor = (state, developerId, gameId, billingMonth) => {
    const month = assertMonth(billingMonth);
    const candidate = (state.tierRules || []).filter(rule => rule.developerId === developerId && rule.gameId === gameId && rule.status !== 'superseded' && rule.effectiveBillingMonth <= month)
      .slice().sort((a,b) => b.effectiveBillingMonth.localeCompare(a.effectiveBillingMonth) || b.operatedAt.localeCompare(a.operatedAt))[0];
    return clone(candidate || defaultTierRule(developerId, gameId));
  };

  const productMetrics = ({ productType, productName, userPaidMinor, feeRate, channel }) => {
    const paymentFeeMinor = roundMinor(userPaidMinor * feeRate);
    const taxMinor = roundMinor(userPaidMinor * 0.06);
    const refundChargebackMinor = 0;
    const platformReceivedMinor = roundMinor(userPaidMinor - paymentFeeMinor - taxMinor - refundChargebackMinor);
    return { channel, productType, productName, userPaidMinor, paymentFeeMinor, taxMinor, taxableMinor:userPaidMinor, refundChargebackMinor, platformReceivedMinor };
  };
  const applyTierToDetails = (details, rule) => {
    let cumulative = 0;
    let previousShare = 0;
    return details.map(detail => {
      const next = cumulative + Math.max(0, detail.platformReceivedMinor);
      const result = calculateTieredPlatformShare(next, rule.tiers);
      const before = calculateTieredPlatformShare(cumulative, rule.tiers);
      const platformShareMinor = roundMinor(result.platformShareMinor - previousShare);
      const tierSnapshots = result.tierSnapshots.map((tier,index) => ({
        ...tier,
        chargeableMinor:roundMinor(tier.chargeableMinor - before.tierSnapshots[index].chargeableMinor),
        shareMinor:roundMinor(tier.shareMinor - before.tierSnapshots[index].shareMinor),
      })).filter(tier => tier.chargeableMinor > 0);
      cumulative = next;
      previousShare = result.platformShareMinor;
      return {
        ...detail, shareableNetMinor:Math.max(0, detail.platformReceivedMinor), tierSnapshots,
        applicableTier:tierSnapshots.map(tier => tier.toMinor == null ? `¥${(tier.fromMinor / 100).toLocaleString('zh-CN')} 以上` : `¥${(tier.fromMinor / 100).toLocaleString('zh-CN')}—¥${(tier.toMinor / 100).toLocaleString('zh-CN')}`).join('；'),
        platformShareRate:ratePercent(platformShareMinor, detail.platformReceivedMinor),
        platformShareMinor, payableMinor:roundMinor(detail.platformReceivedMinor - platformShareMinor),
      };
    });
  };
  const splitMinor = (total, weights) => {
    let allocated = 0;
    return weights.map((weight,index) => {
      if (index === weights.length - 1) return roundMinor(total - allocated);
      const part = roundMinor(total * weight);
      allocated += part;
      return part;
    });
  };

  const lockedFxFor = (billingMonth, monthIndex) => ({ rate:Number((7.12 + monthIndex * 0.03).toFixed(4)), version:`FX-${nextMonth(billingMonth).replace('-', '')}-CNYUSD` });
  const statementBase = ({ entity, developerId, developerName, game, billingMonth, itemType, confirmed, fx, suffix }) => ({
    id:`ST-${billingMonth.replace('-', '')}-${game.id}-${suffix}`,
    developerId, developerName, entityName:entity.legalName, entityVersion:entity.entityVersion, accountVersion:entity.accountVersion,
    bankAccountName:entity.bankAccountName, bankAccount:entity.bankAccount, bankName:entity.bankName,
    gameId:game.id, gameName:game.name, billingMonth, settlementMonth:nextMonth(billingMonth), itemType, itemLabel:ITEM_LABELS[itemType], currency:'CNY',
    lockedFxRate:fx.rate, fxRateVersion:fx.version, status:confirmed ? 'confirmed' : 'pending',
    lockedAt:`${nextMonth(billingMonth)}-05 11:20`, confirmedAt:confirmed ? `${nextMonth(billingMonth)}-08 10:30` : '', confirmedBy:confirmed ? '开发者 王明' : '',
  });
  const withLegacyAliases = row => ({
    ...row,
    receivedMinor:row.platformReceivedMinor,
    ratioPercent:row.itemType === 'game_sales_share' ? (row.platformShareRate == null ? null : 100 - row.platformShareRate) : 100,
    ratioVersion:row.tierRuleVersion || (row.itemType === 'cdkey_sales_share' ? 'POLICY-CDKEY-0' : 'POLICY-REFUND-OFFSET'),
    settlementMinor:row.payableMinor,
  });
  const createGameStatement = context => {
    const { state, game, billingMonth, gameIndex, monthIndex } = context;
    const basePaid = 7800000 + gameIndex * 925000 + monthIndex * 680000;
    const rule = tierRuleFor(state, context.developerId, game.id, billingMonth);
    const rawDetails = [
      productMetrics({ productType:'游戏本体', productName:`${game.name} 标准版`, userPaidMinor:basePaid, feeRate:0.029 }),
      productMetrics({ productType:'DLC', productName:`${game.name} · 远征者扩展包`, userPaidMinor:roundMinor(basePaid * 0.28), feeRate:0.029 }),
    ];
    const gameSalesDetails = applyTierToDetails(rawDetails, rule);
    const platformReceivedMinor = sum(gameSalesDetails, 'platformReceivedMinor');
    const shareableNetMinor = Math.max(0, platformReceivedMinor);
    const tierResult = calculateTieredPlatformShare(shareableNetMinor, rule.tiers);
    const platformShareMinor = tierResult.platformShareMinor;
    const payableMinor = roundMinor(platformReceivedMinor - platformShareMinor);
    return withLegacyAliases({
      ...statementBase({ ...context, itemType:'game_sales_share', suffix:'GAME' }),
      userPaidMinor:sum(gameSalesDetails,'userPaidMinor'), paymentFeeMinor:sum(gameSalesDetails,'paymentFeeMinor'),
      taxMinor:sum(gameSalesDetails,'taxMinor'), taxableMinor:sum(gameSalesDetails,'taxableMinor'), refundChargebackMinor:sum(gameSalesDetails,'refundChargebackMinor'),
      refundMinor:0, chargebackMinor:0, salesTaxMinor:sum(gameSalesDetails,'taxMinor'), platformReceivedMinor, shareableNetMinor,
      weightedTaxRate:sum(gameSalesDetails,'taxableMinor') ? sum(gameSalesDetails,'taxMinor') / sum(gameSalesDetails,'taxableMinor') : null,
      platformShareRate:ratePercent(platformShareMinor, shareableNetMinor), platformShareMinor, payableMinor,
      payableUsdMinor:roundMinor(payableMinor / context.fx.rate), tierRuleVersion:rule.id, tierRuleEffectiveBillingMonth:rule.effectiveBillingMonth,
      tierSnapshots:tierResult.tierSnapshots, gameSalesDetails,
    });
  };
  const createCdkeyStatement = context => {
    const basePaid = 7800000 + context.gameIndex * 925000 + context.monthIndex * 680000;
    const totalPaid = roundMinor(basePaid * 0.18);
    const paidParts = splitMinor(totalPaid,[0.52,0.31,0.17]);
    const details = [
      { channel:'星云商城', productType:'游戏本体', productName:`${context.game.name} 标准版` },
      { channel:'远航游戏', productType:'游戏本体', productName:`${context.game.name} 豪华版` },
      { channel:'星云商城', productType:'DLC', productName:`${context.game.name} · 远征者扩展包` },
    ].map((item,index) => {
      const detail = productMetrics({ ...item, userPaidMinor:paidParts[index], feeRate:0.045 });
      return { ...detail, shareableNetMinor:0, platformShareRate:0, platformShareMinor:0, payableMinor:detail.platformReceivedMinor, receivedMinor:detail.platformReceivedMinor, settlementMinor:detail.platformReceivedMinor };
    });
    const platformReceivedMinor = sum(details,'platformReceivedMinor');
    return withLegacyAliases({
      ...statementBase({ ...context, itemType:'cdkey_sales_share', suffix:'CDKEY' }),
      userPaidMinor:sum(details,'userPaidMinor'), paymentFeeMinor:sum(details,'paymentFeeMinor'), taxMinor:sum(details,'taxMinor'), taxableMinor:sum(details,'taxableMinor'),
      refundChargebackMinor:0, refundMinor:0, chargebackMinor:0, salesTaxMinor:sum(details,'taxMinor'), platformReceivedMinor, shareableNetMinor:0,
      weightedTaxRate:sum(details,'taxableMinor') ? sum(details,'taxMinor') / sum(details,'taxableMinor') : null,
      platformShareRate:0, platformShareMinor:0, payableMinor:platformReceivedMinor, payableUsdMinor:roundMinor(platformReceivedMinor / context.fx.rate),
      tierRuleVersion:'POLICY-CDKEY-0', tierRuleEffectiveBillingMonth:'0000-01', tierSnapshots:[], cdkeyDetails:details,
    });
  };
  const createAdjustmentStatement = context => {
    const basePaid = 7800000 + context.gameIndex * 925000 + context.monthIndex * 680000;
    const refundMinor = roundMinor(basePaid * 0.032);
    const chargebackMinor = roundMinor(basePaid * 0.014);
    const refundChargebackMinor = refundMinor + chargebackMinor;
    const platformReceivedMinor = -refundChargebackMinor;
    return withLegacyAliases({
      ...statementBase({ ...context, itemType:'refund_chargeback_adjustment', suffix:'REFUND-CHARGEBACK' }),
      userPaidMinor:0, paymentFeeMinor:0, taxMinor:0, taxableMinor:0, refundChargebackMinor, refundMinor, chargebackMinor, salesTaxMinor:0,
      platformReceivedMinor, shareableNetMinor:0, weightedTaxRate:null, platformShareRate:null, platformShareMinor:0, payableMinor:platformReceivedMinor,
      payableUsdMinor:roundMinor(platformReceivedMinor / context.fx.rate), tierRuleVersion:'POLICY-REFUND-OFFSET', tierRuleEffectiveBillingMonth:'0000-01', tierSnapshots:[],
    });
  };
  const createStatement = context => context.itemType === 'game_sales_share' ? createGameStatement(context) : context.itemType === 'cdkey_sales_share' ? createCdkeyStatement(context) : createAdjustmentStatement(context);

  const seedStatements = state => {
    const months = ['2026-08','2026-07','2026-06'];
    return activeEntitySeeds.flatMap((entity,developerIndex) => months.flatMap((billingMonth,monthIndex) => {
      const games = gamesByDeveloper[entity.developerId] || [];
      const confirmed = monthIndex === 1;
      const fx = lockedFxFor(billingMonth,monthIndex);
      return games.flatMap((game,gameIndex) => Object.keys(ITEM_ORDER).map(itemType => createStatement({
        state, developerId:entity.developerId, developerName:entity.developerName, entity, game, billingMonth,
        gameIndex:gameIndex + developerIndex, monthIndex, itemType, confirmed, fx,
      })));
    }));
  };
  const createState = () => {
    const state = {
      currentUnlockedBillingMonth:'2026-09', tierRules:[], financialEntityVersions:clone(activeEntitySeeds),
      activeFinancialEntityVersions:Object.fromEntries(activeEntitySeeds.map(item => [item.developerId,item.entityVersion])),
      financialEntityApplications:clone(applicationSeeds), statements:[],
    };
    state.financialEntityVersions.push(...state.financialEntityApplications.map(application => clone(application.snapshot)));
    state.statements = seedStatements(state);
    return state;
  };

  const isAll = value => value == null || value === '' || value === 'all';
  const statementMatches = (row,filters) => {
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
  const statementsFor = (state,filters = {}) => (state.statements || []).filter(row => statementMatches(row,filters)).slice()
    .sort((a,b) => b.billingMonth.localeCompare(a.billingMonth) || a.gameId.localeCompare(b.gameId) || ITEM_ORDER[a.itemType] - ITEM_ORDER[b.itemType]).map(clone);
  const confirmStatements = (state,ids,details = {}) => {
    const requested = new Set(Array.isArray(ids) ? ids : [ids]);
    const changed = [];
    (state.statements || []).forEach(row => {
      if (!requested.has(row.id) || row.status !== 'pending') return;
      row.status = 'confirmed'; row.confirmedAt = details.confirmedAt || nowText(); row.confirmedBy = details.confirmedBy || '开发者'; row.lockedAt ||= row.confirmedAt;
      changed.push(clone(row));
    });
    return changed;
  };

  const recalculateUnlockedGameStatement = (row,rule) => {
    row.gameSalesDetails = applyTierToDetails(row.gameSalesDetails.map(detail => ({
      channel:detail.channel, productType:detail.productType, productName:detail.productName, userPaidMinor:detail.userPaidMinor,
      paymentFeeMinor:detail.paymentFeeMinor, taxMinor:detail.taxMinor, taxableMinor:detail.taxableMinor, refundChargebackMinor:detail.refundChargebackMinor,
      platformReceivedMinor:detail.platformReceivedMinor,
    })),rule);
    const result = calculateTieredPlatformShare(row.shareableNetMinor,rule.tiers);
    row.platformShareMinor = result.platformShareMinor;
    row.platformShareRate = ratePercent(row.platformShareMinor, row.shareableNetMinor);
    row.payableMinor = roundMinor(row.platformReceivedMinor - row.platformShareMinor);
    row.payableUsdMinor = roundMinor(row.payableMinor / row.lockedFxRate);
    row.tierRuleVersion = rule.id; row.tierRuleEffectiveBillingMonth = rule.effectiveBillingMonth; row.tierSnapshots = result.tierSnapshots;
    Object.assign(row,withLegacyAliases(row));
  };
  const saveTierRule = (state,input = {}) => {
    const developerId = String(input.developerId || '').trim();
    const gameId = String(input.gameId || '').trim();
    if (!developerId) throw new Error('缺少开发者');
    if (!gameId) throw new Error('缺少游戏');
    const effectiveBillingMonth = assertMonth(input.effectiveBillingMonth);
    if (effectiveBillingMonth < String(state.currentUnlockedBillingMonth || effectiveBillingMonth)) throw new Error('生效月份不得早于当前未锁定账单月');
    const reason = String(input.reason || '').trim();
    if (!reason) throw new Error('请填写变更原因');
    if (input.canManageFinance === false) throw new Error('无财务配置权限');
    const tiers = normalizeTiers(input.tiers);
    (state.tierRules || []).forEach(rule => {
      if (rule.developerId === developerId && rule.gameId === gameId && rule.effectiveBillingMonth === effectiveBillingMonth && rule.status !== 'superseded') rule.status = 'superseded';
    });
    const version = {
      id:input.id || `TIER-${effectiveBillingMonth.replace('-','')}-${String((state.tierRules || []).length + 1).padStart(3,'0')}`,
      developerId, gameId, effectiveBillingMonth, tiers, reason, operator:String(input.operator || '平台运营').trim(), operatedAt:input.operatedAt || nowText(), status:'active',
    };
    state.tierRules.push(version);
    (state.statements || []).forEach(row => {
      if (row.developerId !== developerId || row.gameId !== gameId || row.itemType !== 'game_sales_share' || row.status === 'confirmed' || row.lockedAt || row.billingMonth < effectiveBillingMonth) return;
      recalculateUnlockedGameStatement(row,tierRuleFor(state,developerId,gameId,row.billingMonth));
    });
    return clone(version);
  };

  const entitySummariesFor = (state,filters = {}) => {
    const groups = new Map();
    statementsFor(state,filters).forEach(row => {
      const key = `${row.billingMonth}|${row.developerId}|${row.entityVersion}|${row.accountVersion}`;
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(row);
    });
    return [...groups.values()].map(rows => {
      const first = rows[0];
      const taxableMinor = sum(rows,'taxableMinor');
      const taxMinor = sum(rows,'taxMinor');
      const shareableNetMinor = sum(rows,'shareableNetMinor');
      const payableMinor = sum(rows,'payableMinor');
      const statementIds = rows.map(row => row.id);
      return {
        id:`ES-${first.billingMonth.replace('-','')}-${first.developerId}-${first.entityVersion}`,
        statementIds, billingMonth:first.billingMonth, settlementMonth:first.settlementMonth, developerId:first.developerId, developerName:first.developerName,
        entityName:first.entityName, entityVersion:first.entityVersion, accountVersion:first.accountVersion,
        gameSalesMinor:sum(rows.filter(row => row.itemType === 'game_sales_share'),'userPaidMinor'),
        cdkeySalesMinor:sum(rows.filter(row => row.itemType === 'cdkey_sales_share'),'userPaidMinor'),
        userPaidMinor:sum(rows,'userPaidMinor'), platformReceivedMinor:sum(rows,'platformReceivedMinor'), paymentFeeMinor:sum(rows,'paymentFeeMinor'),
        taxableMinor, taxMinor, weightedTaxRate:taxableMinor ? taxMinor / taxableMinor : null, refundChargebackMinor:sum(rows,'refundChargebackMinor'),
        shareableNetMinor, platformShareRate:ratePercent(sum(rows,'platformShareMinor'), shareableNetMinor),
        platformShareMinor:sum(rows,'platformShareMinor'), payableMinor, payableUsdMinor:first.lockedFxRate ? roundMinor(payableMinor / first.lockedFxRate) : null,
        lockedFxRate:first.lockedFxRate, fxRateVersion:first.fxRateVersion,
        tierRuleVersions:[...new Set(rows.filter(row => row.itemType === 'game_sales_share').map(row => row.tierRuleVersion))],
        bankAccountName:first.bankAccountName, bankAccount:first.bankAccount, bankName:first.bankName,
        status:rows.every(row => row.status === 'confirmed') ? 'confirmed' : 'pending', rows,
      };
    }).sort((a,b) => b.billingMonth.localeCompare(a.billingMonth) || a.developerId.localeCompare(b.developerId)).map(clone);
  };

  const financialEntity = (state,developerId) => {
    const versionId = state.activeFinancialEntityVersions?.[developerId];
    const entity = (state.financialEntityVersions || []).find(item => item.developerId === developerId && item.entityVersion === versionId && item.status === 'approved');
    return clone(entity || null);
  };
  const financialEntityApplications = (state,filters = {}) => (state.financialEntityApplications || []).filter(application => {
    if (!isAll(filters.developerId) && application.developerId !== filters.developerId) return false;
    if (!isAll(filters.status) && application.status !== filters.status) return false;
    if (!isAll(filters.applicationType) && application.applicationType !== filters.applicationType) return false;
    const keyword = String(filters.keyword || '').trim().toLowerCase();
    return !keyword || `${application.developerId} ${application.developerName} ${application.snapshot?.legalName || ''}`.toLowerCase().includes(keyword);
  }).slice().sort((a,b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id)).map(clone);
  const requiredText = (value,label) => {
    const text = String(value || '').trim();
    if (!text) throw new Error(`${label}为必填项`);
    return text;
  };
  const validateEntityInput = input => {
    const snapshot = {
      developerId:requiredText(input.developerId,'开发者 ID'), developerName:requiredText(input.developerName,'开发者'), legalName:requiredText(input.legalName,'企业法定名称'),
      contactName:requiredText(input.contactName,'联系人姓名'), phone:requiredText(input.phone,'手机号'), email:requiredText(input.email,'邮箱'),
      bankAccountName:requiredText(input.bankAccountName,'银行账户户名'), bankName:requiredText(input.bankName,'开户银行'),
      bankAccount:requiredText(input.bankAccount,'银行账号'), bankBranch:requiredText(input.bankBranch,'开户支行／联行信息'), bankProof:clone(input.bankProof),
    };
    if (!/^1\d{10}$/.test(snapshot.phone)) throw new Error('请填写正确的手机号');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(snapshot.email)) throw new Error('请填写正确的邮箱');
    if (snapshot.bankAccountName !== snapshot.legalName) throw new Error('银行账户户名必须与企业法定名称一致');
    if (!snapshot.bankProof?.name) throw new Error('请上传银行账户证明附件');
    if (!['image/jpeg','image/png','image/webp'].includes(snapshot.bankProof.type)) throw new Error('银行证明附件仅支持 JPG、PNG、WEBP');
    if (Number(snapshot.bankProof.size || 0) > 10 * 1024 * 1024) throw new Error('银行证明附件不能超过 10 MB');
    return snapshot;
  };
  const nextSuffix = (items,readId) => Math.max(0,...items.map(item => Number((readId(item).match(/(\d+)$/) || [])[1] || 0))) + 1;
  const submitFinancialEntity = (state,input = {}) => {
    const snapshot = validateEntityInput(input);
    if ((state.financialEntityApplications || []).some(item => item.developerId === snapshot.developerId && item.status === 'pending')) throw new Error('该开发者已有待审核的财务主体申请');
    const current = financialEntity(state,snapshot.developerId);
    const year = String(input.submittedAt || nowText()).slice(0,4);
    const applicationIndex = nextSuffix(state.financialEntityApplications,item => item.id);
    const entityIndex = nextSuffix(state.financialEntityVersions,item => item.entityVersion);
    const accountIndex = nextSuffix(state.financialEntityVersions,item => item.accountVersion || 'BANK-0');
    const entityVersion = `FIN-${year}-${String(entityIndex).padStart(3,'0')}`;
    const accountVersion = `BANK-${year}-${String(accountIndex).padStart(3,'0')}`;
    const application = {
      id:input.id || `FIN-APP-${year}-${String(applicationIndex).padStart(3,'0')}`, applicationType:current ? 'change' : 'initial', status:'pending',
      developerId:snapshot.developerId, developerName:snapshot.developerName, entityVersion, accountVersion,
      submittedAt:input.submittedAt || nowText(), submittedBy:String(input.submittedBy || snapshot.contactName).trim(), reviewedAt:'', reviewedBy:'', reviewReason:'',
      snapshot:{ ...snapshot, entityVersion, accountVersion, status:'pending' },
    };
    state.financialEntityApplications.push(application); state.financialEntityVersions.push(clone(application.snapshot));
    return clone(application);
  };
  const reviewFinancialEntity = (state,applicationId,input = {}) => {
    const application = (state.financialEntityApplications || []).find(item => item.id === applicationId);
    if (!application) throw new Error('未找到财务主体申请');
    if (application.status !== 'pending') throw new Error('该申请已完成审核');
    if (!['approved','rejected'].includes(input.result)) throw new Error('审核结果仅支持 approved 或 rejected');
    const reason = String(input.reason || '').trim();
    if (input.result === 'rejected' && !reason) throw new Error('驳回必须填写原因');
    const reviewedAt = input.reviewedAt || nowText(); const operator = String(input.operator || '平台运营').trim();
    Object.assign(application,{ status:input.result, reviewedAt, reviewedBy:operator, reviewReason:reason });
    const version = state.financialEntityVersions.find(item => item.developerId === application.developerId && item.entityVersion === application.entityVersion);
    if (version) Object.assign(version,{ status:input.result, reviewedAt, reviewedBy:operator, reviewReason:reason });
    if (input.result === 'approved') {
      const previous = state.financialEntityVersions.find(item => item.developerId === application.developerId && item.entityVersion === state.activeFinancialEntityVersions[application.developerId] && item.status === 'approved');
      if (previous) previous.status = 'superseded';
      state.activeFinancialEntityVersions[application.developerId] = application.entityVersion;
    }
    return clone(application);
  };

  const quote = value => `"${String(value ?? '').replaceAll('"','""')}"`;
  const safeCell = value => {
    const text = String(value ?? '');
    return quote(/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text);
  };
  const decimal = minor => (Number(minor || 0) / 100).toFixed(2);
  const percent = value => value == null ? '—' : `${Number(value).toFixed(2).replace(/\.00$/,'')}%`;
  const statusLabel = status => status === 'confirmed' ? '已确认' : '待确认';
  const csv = (headers,lines) => `\uFEFF${[headers.map(safeCell).join(','),...lines].join('\r\n')}`;
  const exportStatementsCsv = (rows,options = {}) => {
    const includeDeveloper = Boolean(options.includeDeveloper);
    const includeFxVersion = Boolean(options.includeFxVersion);
    const headers = [
      '结算单 ID',...(includeDeveloper ? ['开发者','财务主体'] : []),'主体版本','账户版本','规则版本','游戏 ID','游戏名称','账单月份','结算月份','结算项',
      '用户实付','平台实收','支付费','税费','退款与拒付','平台分成比例','平台分成','应结算金额（CNY）',...(includeFxVersion ? ['汇率版本'] : []),'状态',
    ];
    const lines = (rows || []).map(row => [
      safeCell(row.id),...(includeDeveloper ? [safeCell(row.developerName),safeCell(row.entityName)] : []),safeCell(row.entityVersion),safeCell(row.accountVersion),safeCell(row.tierRuleVersion),
      safeCell(row.gameId),safeCell(row.gameName),safeCell(row.billingMonth),safeCell(row.settlementMonth),safeCell(row.itemLabel),quote(decimal(row.userPaidMinor)),quote(decimal(row.platformReceivedMinor)),
      quote(decimal(row.paymentFeeMinor)),quote(decimal(row.taxMinor)),quote(decimal(row.refundChargebackMinor)),safeCell(percent(row.platformShareRate)),quote(decimal(row.platformShareMinor)),
      quote(decimal(row.payableMinor)),...(includeFxVersion ? [safeCell(row.fxRateVersion)] : []),safeCell(statusLabel(row.status)),
    ].join(','));
    return csv(headers,lines);
  };
  const exportEntitySummariesCsv = rows => {
    const exportable = (rows || []).filter(row => row.status === 'confirmed' && row.payableUsdMinor != null);
    const headers = ['结算单 ID','账单月份','结算月份','开发者','财务主体','主体版本','账户版本','规则版本','游戏及 DLC 销售金额','CDKEY 销售金额','用户实付','平台实收','支付费','综合税率','税费','退款与拒付','平台分成比例','平台分成','应结算金额（CNY）','应结算金额（USD）','汇率版本','银行账户名','银行账号','开户行'];
    const lines = exportable.map(row => [
      safeCell(row.statementIds.join('|')),safeCell(row.billingMonth),safeCell(row.settlementMonth),safeCell(row.developerName),safeCell(row.entityName),safeCell(row.entityVersion),safeCell(row.accountVersion),safeCell(row.tierRuleVersions.join('|')),
      quote(decimal(row.gameSalesMinor)),quote(decimal(row.cdkeySalesMinor)),quote(decimal(row.userPaidMinor)),quote(decimal(row.platformReceivedMinor)),quote(decimal(row.paymentFeeMinor)),safeCell(percent(row.weightedTaxRate == null ? null : row.weightedTaxRate * 100)),
      quote(decimal(row.taxMinor)),quote(decimal(row.refundChargebackMinor)),safeCell(percent(row.platformShareRate)),quote(decimal(row.platformShareMinor)),quote(decimal(row.payableMinor)),quote(decimal(row.payableUsdMinor)),safeCell(row.fxRateVersion),safeCell(row.bankAccountName),safeCell(row.bankAccount),safeCell(row.bankName),
    ].join(','));
    return csv(headers,lines);
  };

  return Object.freeze({
    createState,nextMonth,statementsFor,confirmStatements,calculateTieredPlatformShare,tierRuleFor,saveTierRule,entitySummariesFor,
    financialEntity,financialEntityApplications,submitFinancialEntity,reviewFinancialEntity,exportStatementsCsv,exportEntitySummariesCsv,
  });
})();

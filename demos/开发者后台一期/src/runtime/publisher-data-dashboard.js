window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};

(function registerPublisherDataDashboard(namespace) {
  const clone = value => JSON.parse(JSON.stringify(value));
  const escape = value => namespace.components?.escapeHtml
    ? namespace.components.escapeHtml(String(value ?? ''))
    : String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const text = (zh, en, language) => language === 'en' ? en : zh;
  const settlementCurrency = 'USD';
  const dataCutoffDate = '2026-09-10';
  const currencyDigits = Object.freeze({ USD:2, EUR:2, GBP:2, CAD:2, CNY:2, JPY:0, KRW:0 });
  const presetRanges = Object.freeze({
    '7d':{ startDate:'2026-09-04', endDate:dataCutoffDate },
    '30d':{ startDate:'2026-08-13', endDate:dataCutoffDate },
    '90d':{ startDate:'2026-06-13', endDate:dataCutoffDate },
    month:{ startDate:'2026-09-01', endDate:dataCutoffDate },
  });
  const defaultFilters = Object.freeze({
    range:'30d', ...presetRanges['30d'], game:'all', product:'all', source:'all',
    fulfillment:'all', region:'all', status:'all', keyword:'',
  });
  const statusOrder = Object.freeze(['completed', 'free', 'refund_pending', 'refunded', 'chargeback_open', 'chargeback_won', 'chargeback_lost', 'closed']);
  const reconciliationStatusOrder = Object.freeze(['draft', 'pending', 'confirmed', 'disputed', 'locked', 'voided']);
  const invoiceStatusOrder = Object.freeze(['pending', 'reviewing', 'approved', 'returned', 'not_required']);
  const paymentStatusOrder = Object.freeze(['waiting_condition', 'waiting_invoice', 'pending', 'processing', 'remitted', 'completed', 'failed', 'returned', 'held', 'carried_forward', 'cancelled']);

  const order = (fields, lifecycle) => Object.freeze({
    platform:'Mac', channel:'第三方支付', channelEn:'Third-party payment', settlementCurrency,
    transactionType:'paid', paymentStatus:'paid', fulfillmentStatus:'completed', refundStatus:'none',
    chargebackStatus:'none', delivered:true, refundConvertedMinor:0, chargebackRiskMinor:0,
    chargebackLossMinor:0, taxMinor:0, channelFeeMinor:0, platformShareMinor:0,
    adjustmentMinor:0, settlementMinor:0, ...fields, ...lifecycle,
  });
  const orders = Object.freeze([
    order({ id:'RCN-202609-A8F2K7', orderMask:'ORD-****-1842', date:'2026-09-10 18:42', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-BASE-001', product:'星海远征', productEn:'Stellar Voyage', productType:'base', fulfillment:'account_entitlement', region:'global', countryKey:'Japan', country:'日本', countryEn:'Japan', currency:'JPY', amountMinor:1980, convertedMinor:1320, fxRateText:'JPY/USD · FX-20260910-01', taxMinor:53, channelFeeMinor:40, platformShareMinor:198, settlementMinor:1029, delivery:'账号权益已生效', deliveryEn:'Account entitlement active' }),
    order({ id:'RCN-202609-C4N8M2', orderMask:'ORD-****-1826', date:'2026-09-10 16:26', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-DLC-101', product:'深空回声 DLC', productEn:'Deep Space Echoes DLC', productType:'dlc', fulfillment:'cdkey', region:'global', countryKey:'United States', country:'美国', countryEn:'United States', currency:'USD', amountMinor:599, convertedMinor:599, fxRateText:'USD/USD · FX-20260910-01', taxMinor:24, channelFeeMinor:18, platformShareMinor:90, settlementMinor:467, delivery:'CDKEY 已交付', deliveryEn:'CDKEY delivered' }),
    order({ id:'RCN-202609-H7Q3P5', orderMask:'ORD-****-1798', date:'2026-09-10 14:08', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-BASE-001', product:'星海远征', productEn:'Stellar Voyage', productType:'base', fulfillment:'account_entitlement', region:'global', countryKey:'Germany', country:'德国', countryEn:'Germany', channel:'0 元订单', channelEn:'Zero-price order', currency:'EUR', amountMinor:0, convertedMinor:0, fxRateText:'EUR/USD · FX-20260910-01', delivery:'账号权益已生效', deliveryEn:'Account entitlement active' }, { transactionType:'free' }),
    order({ id:'RCN-202609-Q8F4D1', orderMask:'ORD-****-1715', date:'2026-09-09 21:15', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-DLC-205', product:'曙光舰队 DLC', productEn:'Dawn Fleet DLC', productType:'dlc', fulfillment:'account_entitlement', region:'global', countryKey:'United Kingdom', country:'英国', countryEn:'United Kingdom', currency:'GBP', amountMinor:999, convertedMinor:1340, fxRateText:'GBP/USD · FX-20260910-01', taxMinor:54, channelFeeMinor:40, platformShareMinor:201, settlementMinor:1045, delivery:'账号权益已撤销，退款处理中', deliveryEn:'Entitlement revoked; refund processing' }, { fulfillmentStatus:'revoked', refundStatus:'pending' }),
    order({ id:'RCN-202609-L5V9R4', orderMask:'ORD-****-1644', date:'2026-09-09 10:44', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-BASE-001', product:'星海远征', productEn:'Stellar Voyage', productType:'base', fulfillment:'cdkey', region:'domestic', countryKey:'Mainland China', country:'中国大陆', countryEn:'Mainland China', currency:'CNY', amountMinor:12800, convertedMinor:1770, fxRateText:'CNY/USD · FX-20260910-01', refundConvertedMinor:1770, delivery:'CDKEY 已交付，退款成功', deliveryEn:'CDKEY delivered; refund completed' }, { refundStatus:'completed' }),
    order({ id:'RCN-202609-T2D6X8', orderMask:'ORD-****-1603', date:'2026-09-08 19:03', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-DLC-101', product:'深空回声 DLC', productEn:'Deep Space Echoes DLC', productType:'dlc', fulfillment:'cdkey', region:'global', countryKey:'Canada', country:'加拿大', countryEn:'Canada', currency:'CAD', amountMinor:549, convertedMinor:400, fxRateText:'CAD/USD · FX-20260910-01', chargebackRiskMinor:400, taxMinor:16, channelFeeMinor:12, platformShareMinor:60, settlementMinor:312, delivery:'CDKEY 已交付', deliveryEn:'CDKEY delivered' }, { chargebackStatus:'open' }),
    order({ id:'RCN-202609-V3J7S9', orderMask:'ORD-****-1586', date:'2026-09-08 12:16', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-BASE-001', product:'星海远征', productEn:'Stellar Voyage', productType:'base', fulfillment:'account_entitlement', region:'global', countryKey:'France', country:'法国', countryEn:'France', currency:'EUR', amountMinor:1299, convertedMinor:1520, fxRateText:'EUR/USD · FX-20260910-01', taxMinor:61, channelFeeMinor:46, platformShareMinor:228, adjustmentMinor:85, settlementMinor:1270, delivery:'账号权益保持有效', deliveryEn:'Account entitlement remains active', userListDeleted:true }, { chargebackStatus:'won' }),
    order({ id:'RCN-202609-W9B4J3', orderMask:'ORD-****-1522', date:'2026-09-07 15:22', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-DLC-101', product:'深空回声 DLC', productEn:'Deep Space Echoes DLC', productType:'dlc', fulfillment:'account_entitlement', region:'global', countryKey:'Singapore', country:'新加坡', countryEn:'Singapore', currency:'USD', amountMinor:599, convertedMinor:599, fxRateText:'USD/USD · FX-20260910-01', chargebackLossMinor:599, delivery:'账号权益已撤销', deliveryEn:'Account entitlement revoked' }, { fulfillmentStatus:'revoked', chargebackStatus:'lost' }),
    order({ id:'RCN-202609-Z6K1E4', orderMask:'ORD-****-1488', date:'2026-09-06 20:48', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-DLC-205', product:'曙光舰队 DLC', productEn:'Dawn Fleet DLC', productType:'dlc', fulfillment:'account_entitlement', region:'global', countryKey:'South Korea', country:'韩国', countryEn:'South Korea', currency:'KRW', amountMinor:9900, convertedMinor:710, fxRateText:'KRW/USD · FX-20260910-01', delivery:'未完成支付，订单已关闭', deliveryEn:'Payment not completed; order closed' }, { paymentStatus:'closed', fulfillmentStatus:'not_started', delivered:false }),
    order({ id:'RCN-202608-M6K2S7', orderMask:'ORD-****-9421', date:'2026-08-05 11:27', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-BASE-001', product:'星海远征', productEn:'Stellar Voyage', productType:'base', fulfillment:'cdkey', region:'global', countryKey:'Australia', country:'澳大利亚', countryEn:'Australia', currency:'USD', amountMinor:1299, convertedMinor:1299, fxRateText:'USD/USD · FX-20260805-01', taxMinor:52, channelFeeMinor:39, platformShareMinor:195, settlementMinor:1013, delivery:'CDKEY 已交付', deliveryEn:'CDKEY delivered' }),
  ]);

  const statements = Object.freeze([
    { id:'STMT-2026-06-V1', period:'2026-06', currency:'USD', amountMinor:1548260, status:'locked', reconciliationStatus:'locked', invoiceStatus:'pending', currentAction:'submit_invoice', updatedAt:'2026-09-10 09:30' },
    { id:'STMT-2026-09-D1', period:'2026-09', currency:'USD', amountMinor:286400, status:'draft', reconciliationStatus:'draft', invoiceStatus:'none', currentAction:'platform_generating', updatedAt:'2026-09-10 08:10' },
    { id:'STMT-2026-08-P1', period:'2026-08', currency:'USD', amountMinor:642800, status:'pending', reconciliationStatus:'pending', invoiceStatus:'none', currentAction:'confirm_statement', updatedAt:'2026-09-09 18:20' },
    { id:'STMT-2026-07-C1', period:'2026-07', currency:'USD', amountMinor:518900, status:'confirmed', reconciliationStatus:'confirmed', invoiceStatus:'none', currentAction:'platform_reviewing', updatedAt:'2026-09-08 14:35' },
    { id:'STMT-2026-06-X1', period:'2026-06', currency:'USD', amountMinor:392600, status:'disputed', reconciliationStatus:'disputed', invoiceStatus:'none', currentAction:'supplement_dispute', updatedAt:'2026-09-07 11:45' },
    { id:'STMT-2026-05-R1', period:'2026-05', currency:'USD', amountMinor:463200, status:'locked', reconciliationStatus:'locked', invoiceStatus:'reviewing', currentAction:'platform_reviewing', updatedAt:'2026-09-06 15:18' },
    { id:'STMT-2026-04-A1', period:'2026-04', currency:'USD', amountMinor:438700, status:'locked', reconciliationStatus:'locked', invoiceStatus:'approved', currentAction:'platform_processing', updatedAt:'2026-09-05 10:05' },
    { id:'STMT-2026-03-R1', period:'2026-03', currency:'USD', amountMinor:405100, status:'locked', reconciliationStatus:'locked', invoiceStatus:'returned', currentAction:'submit_invoice', updatedAt:'2026-09-04 16:40' },
    { id:'STMT-2026-02-N1', period:'2026-02', currency:'USD', amountMinor:376500, status:'locked', reconciliationStatus:'locked', invoiceStatus:'not_required', currentAction:'platform_processing', updatedAt:'2026-09-03 09:22' },
    { id:'STMT-2025-12-V0', period:'2025-12', currency:'USD', amountMinor:0, status:'voided', reconciliationStatus:'voided', invoiceStatus:'none', currentAction:'none', updatedAt:'2026-09-02 17:10' },
  ]);
  const payments = Object.freeze([
    { id:'PAY-202609-01', statementId:'STMT-2026-02-N1', currency:'USD', amountMinor:124000, outstandingMinor:124000, status:'waiting_condition', nextAction:'补充收款主体资料', updatedAt:'2026-09-10 09:05' },
    { id:'PAY-202609-02', statementId:'STMT-2026-06-V1', currency:'USD', amountMinor:310000, outstandingMinor:310000, status:'waiting_invoice', nextAction:'提交合规发票', updatedAt:'2026-09-10 08:48' },
    { id:'PAY-202609-03', statementId:'STMT-2026-04-A1', currency:'USD', amountMinor:280000, outstandingMinor:280000, status:'pending', nextAction:'等待平台付款', updatedAt:'2026-09-09 18:30' },
    { id:'PAY-202609-04', statementId:'STMT-2026-04-A1', currency:'USD', amountMinor:500000, outstandingMinor:250000, status:'processing', nextAction:'平台处理中', updatedAt:'2026-09-09 15:12' },
    { id:'PAY-202609-05', statementId:'STMT-2026-02-N1', currency:'USD', amountMinor:200000, outstandingMinor:200000, status:'remitted', nextAction:'等待银行入账', updatedAt:'2026-09-09 11:36' },
    { id:'PAY-202609-06', statementId:'STMT-2026-04-A1', currency:'USD', amountMinor:150000, outstandingMinor:0, status:'completed', nextAction:'查看付款凭证', updatedAt:'2026-09-08 17:25' },
    { id:'PAY-202609-07', statementId:'STMT-2026-02-N1', currency:'USD', amountMinor:160000, outstandingMinor:160000, status:'failed', nextAction:'平台将重新尝试', updatedAt:'2026-09-08 13:14' },
    { id:'PAY-202609-08', statementId:'STMT-2026-04-A1', currency:'USD', amountMinor:120000, outstandingMinor:120000, status:'returned', nextAction:'核对收款账户', updatedAt:'2026-09-07 19:40' },
    { id:'PAY-202609-09', statementId:'STMT-2026-02-N1', currency:'USD', amountMinor:104260, outstandingMinor:104260, status:'held', nextAction:'等待合规复核', updatedAt:'2026-09-07 10:22' },
    { id:'PAY-202609-10', statementId:'STMT-2026-04-A1', currency:'USD', amountMinor:70000, outstandingMinor:0, status:'carried_forward', nextAction:'查看转入账期', updatedAt:'2026-09-06 16:08' },
    { id:'PAY-202609-11', statementId:'STMT-2026-02-N1', currency:'USD', amountMinor:60000, outstandingMinor:0, status:'cancelled', nextAction:'查看取消原因', updatedAt:'2026-09-05 09:50' },
  ]);

  const orderSources = Object.freeze({
    'RCN-202609-A8F2K7':'home', 'RCN-202609-C4N8M2':'search', 'RCN-202609-H7Q3P5':'campaign',
    'RCN-202609-Q8F4D1':'discovery', 'RCN-202609-L5V9R4':'direct', 'RCN-202609-T2D6X8':'ranking',
    'RCN-202609-V3J7S9':'home', 'RCN-202609-W9B4J3':'search', 'RCN-202609-Z6K1E4':'external', 'RCN-202608-M6K2S7':'other',
  });
  const conversionStageSeed = Object.freeze([
    { key:'impression', uv:50000, previousUv:46200 }, { key:'card_click', uv:15000, previousUv:13420 },
    { key:'detail_view', uv:12500, previousUv:11280 }, { key:'cta_click', uv:3750, previousUv:3260 },
    { key:'order_create', uv:3180, previousUv:2790 }, { key:'acquisition_success', uv:2862, previousUv:2488 },
    { key:'fulfillment_success', uv:2776, previousUv:2416 },
  ]);
  const conversionSourceSeed = Object.freeze([
    { key:'home', impression:18200, click:6010, detail:5000, acquired:1120 }, { key:'discovery', impression:9200, click:2480, detail:2010, acquired:420 },
    { key:'ranking', impression:7100, click:2050, detail:1670, acquired:335 }, { key:'search', impression:6800, click:2750, detail:2240, acquired:560 },
    { key:'campaign', impression:5100, click:1320, detail:1080, acquired:245 }, { key:'external', impression:3600, click:390, detail:320, acquired:60 },
    { key:'direct', impression:null, click:null, detail:160, acquired:120 }, { key:'other', impression:0, click:0, detail:20, acquired:2 },
  ]);
  const conversionTrendSeed = Object.freeze({
    impression:[6100,6400,6700,6900,7300,7900,8700], detail_view:[1500,1600,1650,1700,1800,2050,2200],
    cta_click:[420,450,500,510,560,620,690], acquisition_success:[310,340,360,390,420,485,557],
  });

  const copy = (language = 'zh') => {
    const en = language === 'en';
    return {
      title:en ? 'Data dashboard' : '数据看板', readonly:en ? 'Read-only analytics' : '只读经营数据', updated:en ? 'Updated to Sep 10, 2026 23:59' : '数据更新至 2026-09-10 23:59',
      tabs:{ overview:en ? 'Overview' : '经营概览', orders:en ? 'Order details' : '订单明细', revenue:en ? 'Revenue & settlement' : '收入与结算' },
      product:en ? 'Product type' : '商品类型', source:en ? 'Source' : '来源位置', fulfillment:en ? 'Fulfillment' : '履约方式', region:en ? 'Region' : '地区', status:en ? 'Transaction result' : '交易结果', range:en ? 'Time' : '时间', keyword:en ? 'Order ID' : '订单编号',
      all:en ? 'All' : '全部', base:en ? 'Base game' : '游戏本体', dlc:en ? 'Permanent DLC' : '永久 DLC', direct:en ? 'Direct purchase' : '直接购买', global:en ? 'Global (excl. Mainland China)' : '全球（不含中国大陆）', domestic:en ? 'Mainland China' : '中国大陆', reset:en ? 'Reset' : '重置', scope:en ? 'Metric definitions' : '数据口径',
      searchPlaceholder:en ? 'Reconciliation or masked order ID' : '对账流水号或脱敏订单号', noData:en ? 'No data for the current filters' : '当前筛选条件下暂无数据', noDataHint:en ? 'Reset filters to view available records.' : '可重置筛选条件查看已有记录。',
    };
  };
  const money = (minor, currency = settlementCurrency) => {
    const digits = currencyDigits[currency] ?? 2;
    return new Intl.NumberFormat('zh-CN', { style:'currency', currency, minimumFractionDigits:digits, maximumFractionDigits:digits }).format(Number(minor || 0) / (10 ** digits));
  };
  const dateFrom = value => new Date(`${value}T00:00:00Z`);
  const formatDate = value => value.toISOString().slice(0,10);
  const daysBetween = (start,end) => Math.floor((dateFrom(end) - dateFrom(start)) / 86400000) + 1;
  const validateDateRange = ({ startDate,endDate } = {}) => {
    if (!startDate || !endDate) return '请选择开始和结束日期';
    if (startDate > endDate) return '开始日期不能晚于结束日期';
    if (endDate > dataCutoffDate) return '结束日期不能晚于数据更新时间';
    if (daysBetween(startDate,endDate) > 180) return '自定义时间最长支持 180 天';
    return '';
  };
  const preset = value => presetRanges[value] || presetRanges['30d'];
  const effectiveRange = filters => filters?.range === 'custom'
    ? { startDate:filters.startDate || presetRanges['30d'].startDate, endDate:filters.endDate || presetRanges['30d'].endDate }
    : { ...preset(filters?.range) };
  const createState = seed => {
    const incoming = seed && typeof seed === 'object' ? clone(seed) : {};
    const filters = { ...defaultFilters, ...(incoming.filters || {}) };
    return { tab:'overview', trendMetric:'impression', selectedOrder:'', scopeOpen:false, datePickerOpen:false, draftDateRange:effectiveRange(filters), scenario:'ready', ...incoming, filters };
  };

  const deriveTransactionResult = item => {
    if (item.paymentStatus === 'closed') return 'closed';
    if (item.refundStatus === 'pending') return 'refund_pending';
    if (item.refundStatus === 'completed') return 'refunded';
    if (item.chargebackStatus === 'open') return 'chargeback_open';
    if (item.chargebackStatus === 'won') return 'chargeback_won';
    if (item.chargebackStatus === 'lost') return 'chargeback_lost';
    return item.transactionType === 'free' ? 'free' : 'completed';
  };
  const regionMatches = (item,value) => value === 'all' || item.region === value || item.countryKey === value;
  const filteredOrders = state => {
    const filters = { ...defaultFilters, ...(state?.filters || {}) };
    const { startDate,endDate } = effectiveRange(filters);
    const keyword = String(filters.keyword || '').trim().toLowerCase();
    return orders.filter(item => item.date.slice(0,10) >= startDate && item.date.slice(0,10) <= endDate
      && (filters.game === 'all' || item.game === filters.game)
      && (filters.product === 'all' || item.productType === filters.product)
      && (filters.source === 'all' || orderSources[item.id] === filters.source)
      && (filters.fulfillment === 'all' || item.fulfillment === filters.fulfillment)
      && regionMatches(item,filters.region)
      && (filters.status === 'all' || deriveTransactionResult(item) === filters.status)
      && (!keyword || `${item.id} ${item.orderMask}`.toLowerCase().includes(keyword)));
  };
  const pendingByCurrency = () => payments.reduce((result,item) => {
    if (item.outstandingMinor <= 0 || ['completed','carried_forward','cancelled'].includes(item.status)) return result;
    result[item.currency] = (result[item.currency] || 0) + item.outstandingMinor;
    return result;
  },{});
  const metrics = rows => {
    const paidRows = rows.filter(item => item.delivered && item.transactionType === 'paid');
    const freeRows = rows.filter(item => item.delivered && item.transactionType === 'free');
    const refundedRows = paidRows.filter(item => item.refundStatus === 'completed');
    const lostRows = paidRows.filter(item => item.chargebackStatus === 'lost' && item.refundStatus !== 'completed');
    const sum = key => rows.reduce((total,item) => total + Number(item[key] || 0),0);
    const grossMinor = paidRows.reduce((total,item) => total + item.convertedMinor,0);
    const refundMinor = sum('refundConvertedMinor');
    const chargebackRiskMinor = sum('chargebackRiskMinor');
    const chargebackLossMinor = sum('chargebackLossMinor');
    const taxMinor = sum('taxMinor');
    const channelFeeMinor = sum('channelFeeMinor');
    const platformShareMinor = sum('platformShareMinor');
    const adjustmentMinor = sum('adjustmentMinor');
    const estimatedMinor = grossMinor - refundMinor - chargebackLossMinor - taxMinor - channelFeeMinor - platformShareMinor + adjustmentMinor;
    return { paid:paidRows.length, free:freeRows.length, refundCount:refundedRows.length, refundMinor, chargebackOpen:rows.filter(item => item.chargebackStatus === 'open').length, chargebackRiskMinor, chargebackLost:lostRows.length, chargebackLossMinor, netSales:paidRows.length - refundedRows.length - lostRows.length, grossMinor, taxMinor, channelFeeMinor, platformShareMinor, adjustmentMinor, estimatedMinor, settlementCurrency, fxVersion:'FX-20260910-01', pendingByCurrency:pendingByCurrency() };
  };

  const safeRate = (numerator,denominator) => Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0 ? numerator / denominator : null;
  const conversionScale = filters => {
    const { startDate,endDate } = effectiveRange(filters);
    const range = daysBetween(startDate,endDate) / daysBetween(presetRanges['30d'].startDate,presetRanges['30d'].endDate);
    const product = { all:1, base:0.68, dlc:0.32 }[filters.product] || 1;
    const region = filters.region === 'all' ? 1 : filters.region === 'global' ? 0.82 : filters.region === 'domestic' ? 0.18 : 0.08;
    return range * product * region;
  };
  const scaleValue = (value,scale) => value === null ? null : Math.round(value * scale);
  const sourceRows = filters => {
    const scale = conversionScale(filters);
    return conversionSourceSeed.filter(item => filters.source === 'all' || item.key === filters.source).map(item => ({ ...item, impression:scaleValue(item.impression,scale), click:scaleValue(item.click,scale), detail:scaleValue(item.detail,scale), acquired:scaleValue(item.acquired,scale) }));
  };
  const sumMetric = (rows,key) => {
    const values = rows.map(item => item[key]).filter(Number.isFinite);
    return values.length ? values.reduce((sum,value) => sum + value,0) : null;
  };
  const conversionSnapshot = state => {
    const filters = { ...defaultFilters, ...(state?.filters || {}) };
    const scale = conversionScale(filters);
    const sources = sourceRows(filters);
    let stages;
    if (filters.source === 'all') stages = conversionStageSeed.map(item => ({ ...item, uv:scaleValue(item.uv,scale), previousUv:scaleValue(item.previousUv,scale) }));
    else {
      const impression = sumMetric(sources,'impression');
      const click = sumMetric(sources,'click');
      const detail = sumMetric(sources,'detail') || 0;
      const acquired = sumMetric(sources,'acquired') || 0;
      const cta = Math.max(acquired,Math.round(detail * 0.3));
      const created = Math.max(acquired,Math.round(cta * 0.848));
      const fulfilled = Math.round(acquired * 0.97);
      const values = [impression,click,detail,cta,created,acquired,fulfilled];
      stages = conversionStageSeed.map((item,index) => ({ ...item, uv:values[index], previousUv:values[index] === null ? null : Math.round(values[index] * 0.9) }));
    }
    const stageMap = Object.fromEntries(stages.map(item => [item.key,item.uv]));
    const trendBaseTotals = { impression:50000, detail_view:12500, cta_click:3750, acquisition_success:2862 };
    const trends = Object.fromEntries(Object.entries(conversionTrendSeed).map(([key,values]) => {
      const factor = safeRate(stageMap[key],trendBaseTotals[key]) ?? 0;
      return [key,values.map(value => Math.round(value * factor))];
    }));
    return { stages:stages.map((item,index) => ({ ...item, stepRate:index ? safeRate(item.uv,stages[index - 1].uv) : null, changeRate:safeRate(item.uv - item.previousUv,item.previousUv) })), sources, trends, overallRate:safeRate(stageMap.acquisition_success,stageMap.impression) };
  };
  const trendDays = filters => {
    const { startDate,endDate } = effectiveRange(filters);
    const total = Math.max(1,daysBetween(startDate,endDate) - 1);
    const start = dateFrom(startDate);
    return Array.from({ length:7 },(_,index) => formatDate(new Date(start.getTime() + Math.round(total * index / 6) * 86400000)).slice(5));
  };

  const pendingText = metric => Object.entries(metric.pendingByCurrency).map(([currency,minor]) => money(minor,currency)).join(' / ') || '--';
  const statusMeta = (status,language = 'zh') => ({
    completed:[text('交易完成','Completed',language),'success'],
    free:[text('免费领取','Free claim',language),'info'],
    refund_pending:[text('退款处理中','Refund processing',language),'warning'],
    refunded:[text('已退款','Refunded',language),'warning'],
    chargeback_open:[text('拒付待裁决','Chargeback open',language),'danger'],
    chargeback_won:[text('拒付胜诉','Chargeback won',language),'success'],
    chargeback_lost:[text('拒付败诉','Chargeback lost',language),'danger'],
    closed:[text('已关闭','Closed',language),'info'],
  }[status] || [status,'info']);
  const reconciliationMeta = (status,language = 'zh') => ({
    draft:[text('草稿','Draft',language),'info'], pending:[text('待确认','Pending confirmation',language),'warning'],
    confirmed:[text('已确认','Confirmed',language),'success'], disputed:[text('有异议','Disputed',language),'danger'],
    locked:[text('已锁定','Locked',language),'success'], voided:[text('已作废','Voided',language),'info'],
  }[status] || [status,'info']);
  const invoiceMeta = (status,language = 'zh') => ({
    pending:[text('待提交','Pending submission',language),'warning'], reviewing:[text('审核中','Under review',language),'warning'],
    approved:[text('已通过','Approved',language),'success'], returned:[text('已退回','Returned',language),'danger'],
    not_required:[text('不需要','Not required',language),'info'], none:['--','info'],
  }[status] || [status,'info']);
  const paymentMeta = (status,language = 'zh') => ({
    waiting_condition:[text('待具备条件','Waiting for requirements',language),'warning'], waiting_invoice:[text('待发票','Waiting for invoice',language),'warning'],
    pending:[text('待付款','Pending payment',language),'warning'], processing:[text('处理中','Processing',language),'warning'],
    remitted:[text('已汇出','Remitted',language),'info'], completed:[text('已完成','Completed',language),'success'],
    failed:[text('失败','Failed',language),'danger'], returned:[text('退回','Returned',language),'danger'],
    held:[text('暂缓','On hold',language),'warning'], carried_forward:[text('已结转','Carried forward',language),'info'],
    cancelled:[text('已取消','Cancelled',language),'info'],
  }[status] || [status,'info']);
  const currentActionLabel = (action,language = 'zh') => ({
    platform_generating:text('等待平台生成结算单','Waiting for statement generation',language),
    confirm_statement:text('确认结算单','Confirm statement',language),
    platform_reviewing:text('等待平台审核','Waiting for platform review',language),
    supplement_dispute:text('补充异议材料','Add dispute materials',language),
    submit_invoice:text('提交发票','Submit invoice',language),
    platform_processing:text('等待平台处理','Waiting for platform processing',language),
    none:text('无需处理','No action required',language),
  }[action] || text('无需处理','No action required',language));
  const lifecycleMeta = (type,status,language = 'zh') => {
    const maps = {
      transactionType:{ paid:text('付费交易','Paid transaction',language), free:text('免费领取','Free claim',language) },
      paymentStatus:{ paid:text('支付成功','Paid',language), closed:text('未支付关闭','Closed without payment',language) },
      fulfillmentStatus:{ completed:text('履约完成','Fulfilled',language), revoked:text('已撤销','Revoked',language), not_started:text('未开始','Not started',language) },
      refundStatus:{ none:text('无退款','No refund',language), pending:text('退款处理中','Refund processing',language), completed:text('退款成功','Refunded',language) },
      chargebackStatus:{ none:text('无拒付','No chargeback',language), open:text('待裁决','Open',language), won:text('胜诉','Won',language), lost:text('败诉','Lost',language) },
    };
    return maps[type]?.[status] || status;
  };
  const tag = (label,tone = 'info') => `<span class="publisher-dashboard-tag is-${tone}">${escape(label)}</span>`;
  const empty = language => `<div class="publisher-dashboard-empty" data-testid="publisher-dashboard-empty"><span>∅</span><strong>${copy(language).noData}</strong><p>${copy(language).noDataHint}</p></div>`;
  const option = (value,label,selected) => `<option value="${escape(value)}"${selected === value ? ' selected' : ''}>${escape(label)}</option>`;
  const filterSelect = (key,label,choices,state,className = '') => `<label class="publisher-dashboard-field ${className}"><span>${label}</span><select data-dashboard-filter="${key}">${choices.map(([value,name]) => option(value,name,state.filters[key])).join('')}</select></label>`;
  const metricCard = (label,value,hint,key) => `<article class="publisher-dashboard-metric" data-dashboard-metric="${key}"><span>${label}</span><strong>${value}</strong><small>${hint}</small></article>`;
  const formatUv = (value,language) => value === null ? '--' : new Intl.NumberFormat(language === 'en' ? 'en-US' : 'zh-CN').format(value);
  const formatRate = value => value === null ? '--' : `${(value * 100).toFixed(1)}%`;
  const conversionLabels = language => ({
    impression:text('有效曝光','Qualified impressions',language), card_click:text('游戏卡点击','Game card clicks',language), detail_view:text('详情页访问','Detail visits',language),
    cta_click:text('购买／领取点击','Buy / claim clicks',language), order_create:text('创建订单','Orders created',language), acquisition_success:text('成功获取','Successful acquisition',language), fulfillment_success:text('履约成功','Fulfillment success',language),
  });
  const sourceLabels = language => ({ home:text('首页推荐','Home recommendations',language), discovery:text('找游戏','Discover',language), ranking:text('排行榜','Rankings',language), search:text('搜索','Search',language), campaign:text('专题活动','Campaigns',language), external:text('站外活动','External campaigns',language), direct:text('自然直达','Direct',language), other:text('其他','Other',language) });

  const renderRegionSelect = (state,language) => {
    const c = copy(language);
    const countries = [...new Map(orders.map(item => [item.countryKey,language === 'en' ? item.countryEn : item.country])).entries()];
    return `<label class="publisher-dashboard-field publisher-dashboard-field--region"><span>${c.region}</span><select data-dashboard-filter="region">${option('all',c.all,state.filters.region)}<optgroup label="${text('发行范围','Publishing scope',language)}">${option('global',c.global,state.filters.region)}${option('domestic',c.domestic,state.filters.region)}</optgroup><optgroup label="${text('国家／地区','Countries / regions',language)}">${countries.map(([value,label]) => option(value,label,state.filters.region)).join('')}</optgroup></select></label>`;
  };
  const renderDateDialog = (state,language) => {
    if (!state.datePickerOpen) return '';
    const draft = state.draftDateRange || effectiveRange(state.filters);
    const error = validateDateRange(draft);
    return `<div class="publisher-dashboard-overlay publisher-dashboard-date-overlay" data-dashboard-action="date-cancel"><section class="publisher-dashboard-dialog publisher-dashboard-date-dialog" role="dialog" aria-modal="true" aria-label="${text('自定义时间','Custom date range',language)}" data-dashboard-stop><header><div><span>${text('最长 180 天','UP TO 180 DAYS',language)}</span><h2>${text('自定义时间','Custom date range',language)}</h2></div><button type="button" data-dashboard-action="date-cancel" aria-label="${text('关闭','Close',language)}">×</button></header><div class="publisher-dashboard-date-fields"><label class="publisher-dashboard-field"><span>${text('开始日期','Start date',language)}</span><input type="date" max="${dataCutoffDate}" value="${escape(draft.startDate || '')}" data-dashboard-date="start"></label><label class="publisher-dashboard-field"><span>${text('结束日期','End date',language)}</span><input type="date" max="${dataCutoffDate}" value="${escape(draft.endDate || '')}" data-dashboard-date="end"></label></div><p class="publisher-dashboard-date-error" data-dashboard-date-error${error ? '' : ' hidden'}>${escape(error)}</p><footer class="publisher-dashboard-date-actions"><button type="button" data-dashboard-action="date-cancel">${text('取消','Cancel',language)}</button><button type="button" class="is-primary" data-dashboard-action="date-apply"${error ? ' disabled' : ''}>${text('应用','Apply',language)}</button></footer></section></div>`;
  };
  const renderFilters = (state,language) => {
    const c = copy(language);
    const all = c.all;
    const ranges = [['7d',text('近 7 天','Last 7 days',language)],['30d',text('近 30 天','Last 30 days',language)],['90d',text('近 90 天','Last 90 days',language)],['month',text('本月','This month',language)],['custom',text('自定义','Custom',language)]];
    const sources = [['all',all],...Object.entries(sourceLabels(language))];
    const transactionFilters = state.tab === 'overview' ? '' : `${filterSelect('fulfillment',c.fulfillment,[['all',all],['account_entitlement',c.direct],['cdkey','CDKEY']],state,'publisher-dashboard-field--fulfillment')}${filterSelect('status',c.status,[['all',all],...statusOrder.map(value => [value,statusMeta(value,language)[0]])],state,'publisher-dashboard-field--status')}`;
    const keyword = state.tab === 'orders' ? `<label class="publisher-dashboard-field publisher-dashboard-field--keyword"><span>${c.keyword}</span><input type="search" value="${escape(state.filters.keyword || '')}" placeholder="${c.searchPlaceholder}" data-dashboard-filter="keyword"></label>` : '';
    return `<section class="publisher-dashboard-filters" aria-label="${text('数据筛选','Data filters',language)}"><div class="publisher-dashboard-filter-row"><div class="publisher-dashboard-filter-scroll">${filterSelect('range',c.range,ranges,state,'publisher-dashboard-field--range')}${filterSelect('product',c.product,[['all',all],['base',c.base],['dlc',c.dlc]],state,'publisher-dashboard-field--product')}${filterSelect('source',c.source,sources,state,'publisher-dashboard-field--source')}${renderRegionSelect(state,language)}${transactionFilters}${keyword}</div><div class="publisher-dashboard-filter-fixed"><span class="publisher-dashboard-platform" data-dashboard-platform>${text('平台：Mac','Platform: Mac',language)}</span><button type="button" data-dashboard-action="reset">${c.reset}</button></div></div><div class="publisher-dashboard-filter-caption">${state.tab === 'overview' ? text('漏斗按入口时间统计；交易结果按履约完成时间统计','The funnel uses entry time; transaction results use fulfillment time',language) : text('交易筛选不会改变财务主体级待结算金额','Transaction filters do not alter company-level pending settlement',language)}</div></section>${renderDateDialog(state,language)}`;
  };

  const renderConversionFunnel = (conversion,language) => {
    const labels = conversionLabels(language);
    return `<section class="publisher-dashboard-card publisher-conversion-card"><header><div><span>${text('站内转化','IN-APP CONVERSION',language)}</span><h2>${text('从曝光到履约','From discovery to fulfillment',language)}</h2><p>${text('全链路统一使用去重用户数（UV），成功获取不等于付费销量。','Every stage uses unique visitors; acquisition is not paid sales.',language)}</p></div><div class="publisher-conversion-total"><small>${text('曝光→成功获取','Impression → acquisition',language)}</small><strong>${formatRate(conversion.overallRate)}</strong></div></header><div class="publisher-conversion-funnel">${conversion.stages.map((item,index) => `<article class="publisher-conversion-stage" data-conversion-stage="${item.key}"><span>${String(index + 1).padStart(2,'0')}</span><h3>${labels[item.key]}</h3><strong>${formatUv(item.uv,language)}</strong><small>${index ? `${text('上一步','Previous step',language)} ${formatRate(item.stepRate)}` : 'UV'} · ${text('环比','Period',language)} ${item.changeRate !== null && item.changeRate >= 0 ? '+' : ''}${formatRate(item.changeRate)}</small></article>`).join('')}</div><p class="publisher-conversion-footnote">${text('漏斗按入口时间归因，销量按履约完成时间统计；两组数据不可直接相减。','The funnel uses entry-time attribution while sales use fulfillment time; do not subtract the two groups directly.',language)}</p></section>`;
  };
  const renderConversionTrend = (state,conversion,language) => {
    const labels = conversionLabels(language);
    const metricKeys = ['impression','detail_view','cta_click','acquisition_success'];
    const active = metricKeys.includes(state.trendMetric) ? state.trendMetric : 'impression';
    const values = conversion.trends[active] || [];
    const max = Math.max(...values,1);
    const days = trendDays(state.filters);
    return `<section class="publisher-dashboard-card publisher-conversion-trend" data-conversion-trend data-active-metric="${active}"><header><div><span>${text('趋势','TREND',language)}</span><h2>${text('站内转化趋势','In-app conversion trend',language)}</h2></div><div class="publisher-conversion-trend-tabs">${metricKeys.map(key => `<button type="button" class="${key === active ? 'is-active' : ''}" data-dashboard-action="conversion-trend" data-conversion-trend-metric="${key}">${labels[key]}</button>`).join('')}</div></header><div class="publisher-dashboard-chart">${days.map((day,index) => `<div><i style="height:${Math.max(10,Math.round((values[index] || 0) / max * 100))}%" data-value="${values[index] || 0}"></i><span>${day}</span></div>`).join('')}</div></section>`;
  };
  const renderConversionSources = (conversion,language) => {
    const labels = sourceLabels(language);
    return `<section class="publisher-dashboard-card publisher-conversion-sources"><header><div><span>${text('来源分析','SOURCE PERFORMANCE',language)}</span><h2>${text('站内位置与访问来源','Placement and traffic source',language)}</h2></div></header><div class="publisher-conversion-source-table"><table><thead><tr><th>${text('来源位置','Source',language)}</th><th>${text('曝光 UV','Impressions',language)}</th><th>${text('点击 UV','Clicks',language)}</th><th>${text('详情访问 UV','Detail visits',language)}</th><th>${text('成功获取 UV','Acquired',language)}</th><th>${text('点击率','CTR',language)}</th><th>${text('详情→获取','Detail → acquired',language)}</th></tr></thead><tbody>${conversion.sources.map(item => `<tr data-conversion-source="${item.key}"><td><strong>${labels[item.key]}</strong></td><td>${formatUv(item.impression,language)}</td><td>${formatUv(item.click,language)}</td><td>${formatUv(item.detail,language)}</td><td>${formatUv(item.acquired,language)}</td><td>${formatRate(safeRate(item.click,item.impression))}</td><td>${formatRate(safeRate(item.acquired,item.detail))}</td></tr>`).join('')}</tbody></table></div></section>`;
  };
  const renderOverview = (state,language) => {
    const rows = filteredOrders(state);
    const m = metrics(rows);
    const conversion = conversionSnapshot(state);
    const days = trendDays(state.filters);
    const daily = days.map(day => rows.filter(item => item.date.slice(5,10) === day).length);
    const max = Math.max(...daily,1);
    const count = predicate => rows.filter(predicate).length;
    return `${renderConversionFunnel(conversion,language)}<div class="publisher-conversion-analysis-grid">${renderConversionTrend(state,conversion,language)}${renderConversionSources(conversion,language)}</div><section class="publisher-dashboard-section-heading"><div><span>${text('交易经营结果','TRANSACTION RESULTS',language)}</span><h2>${text('销量、风险与收入','Sales, risk and revenue',language)}</h2></div><small>${text('按履约完成时间统计','By fulfillment completion time',language)}</small></section><div class="publisher-dashboard-metrics">${metricCard(text('付费销量','Paid sales',language),`${m.paid}`,text(`净销量 ${m.netSales}`,`Net sales ${m.netSales}`,language),'paid')}${metricCard(text('免费领取','Free claims',language),`${m.free}`,text('履约完成的 0 元订单','Fulfilled zero-price orders',language),'free')}${metricCard(text('退款成功','Refunded',language),`${m.refundCount}`,money(m.refundMinor,m.settlementCurrency),'refund')}${metricCard(text('拒付风险','Chargeback risk',language),`${m.chargebackOpen}`,text(`${money(m.chargebackRiskMinor,m.settlementCurrency)} 待裁决`,`${money(m.chargebackRiskMinor,m.settlementCurrency)} pending`,language),'chargeback')}${metricCard(text('预估收入','Estimated revenue',language),money(m.estimatedMinor,m.settlementCurrency),text(`结算币种 · ${m.fxVersion}`,`Settlement currency · ${m.fxVersion}`,language),'estimated')}${metricCard(text('待结算','Pending settlement',language),pendingText(m),text('厂商账单，不按单游戏分摊','Company statement; not allocated per game',language),'pending')}</div><div class="publisher-dashboard-overview-grid"><section class="publisher-dashboard-card publisher-dashboard-card--wide"><header><div><span>${text('趋势','TREND',language)}</span><h2>${text('成交与领取趋势','Sales and claims trend',language)}</h2></div></header><div class="publisher-dashboard-chart">${days.map((day,index) => `<div><i style="height:${Math.max(10,Math.round(daily[index] / max * 100))}%" data-value="${daily[index]}"></i><span>${day}</span></div>`).join('')}</div></section><section class="publisher-dashboard-card publisher-dashboard-mix-risk"><header><div><span>${text('构成与风险','MIX & RISK',language)}</span><h2>${text('商品、履约与风险','Product, fulfillment & risk',language)}</h2></div></header><dl class="publisher-dashboard-breakdown"><div><dt>${copy(language).base} / ${copy(language).dlc}</dt><dd>${count(item => item.productType === 'base')} / ${count(item => item.productType === 'dlc')}</dd></div><div><dt>${copy(language).direct} / CDKEY</dt><dd>${count(item => item.fulfillment === 'account_entitlement')} / ${count(item => item.fulfillment === 'cdkey')}</dd></div><div><dt>${text('退款处理中','Refund processing',language)}</dt><dd>${count(item => deriveTransactionResult(item) === 'refund_pending')}</dd></div><div><dt>${text('拒付待裁决／败诉','Chargeback open / lost',language)}</dt><dd>${m.chargebackOpen} / ${m.chargebackLost}</dd></div><div><dt>${text('败诉扣减','Loss deduction',language)}</dt><dd>${money(m.chargebackLossMinor,m.settlementCurrency)}</dd></div></dl></section></div>`;
  };

  const renderOrders = (state,language) => {
    const rows = filteredOrders(state);
    if (!rows.length) return empty(language);
    return `<section class="publisher-dashboard-card publisher-dashboard-orders"><header><div><span>${text('脱敏订单','REDACTED ORDERS',language)}</span><h2>${text('订单明细','Order details',language)}</h2><p>${text('完整对账流水号可用于核账，平台订单号仅展示脱敏片段。','The reconciliation ID supports verification; platform order IDs stay masked.',language)}</p></div><strong>${rows.length} ${text('笔','records',language)}</strong></header><div class="publisher-dashboard-table-wrap"><table><thead><tr><th>${text('时间／订单','Time / order',language)}</th><th>${text('游戏／商品','Game / product',language)}</th><th>${text('履约方式','Fulfillment',language)}</th><th>${text('地区／平台','Region / platform',language)}</th><th>${text('金额','Amount',language)}</th><th>${text('交易结果','Transaction result',language)}</th><th>${text('操作','Action',language)}</th></tr></thead><tbody>${rows.map(item => { const result=deriveTransactionResult(item); const sm=statusMeta(result,language); return `<tr data-dashboard-order-id="${item.id}"><td><strong>${item.date}</strong><small>${item.id}</small><small>${item.orderMask}</small></td><td><strong>${language === 'en' ? item.gameEn : item.game}</strong><small>${item.sku} · ${item.productType === 'base' ? copy(language).base : copy(language).dlc}</small></td><td><strong>${item.fulfillment === 'account_entitlement' ? copy(language).direct : 'CDKEY'}</strong><small>${language === 'en' ? item.deliveryEn : item.delivery}</small></td><td><strong>${language === 'en' ? item.countryEn : item.country}</strong><small>Mac · ${language === 'en' ? item.channelEn : item.channel}</small></td><td><strong>${money(item.amountMinor,item.currency)}</strong><small>${item.currency}</small></td><td>${tag(sm[0],sm[1])}${item.userListDeleted ? `<small class="publisher-dashboard-aux-state">${text('用户端已删除','Deleted in user list',language)}</small>` : ''}</td><td><button type="button" data-dashboard-action="open-order" data-order-id="${item.id}">${text('查看详情','View',language)}</button></td></tr>`; }).join('')}</tbody></table></div></section>`;
  };
  const renderOrderDrawer = (state,language) => {
    const item = orders.find(orderItem => orderItem.id === state.selectedOrder);
    if (!item) return '';
    const result = deriveTransactionResult(item);
    const sm = statusMeta(result,language);
    const impact = result === 'refunded' ? `− ${money(item.refundConvertedMinor,item.settlementCurrency)}` : result === 'chargeback_lost' ? `− ${money(item.chargebackLossMinor,item.settlementCurrency)}` : result === 'chargeback_open' ? `${money(item.chargebackRiskMinor,item.settlementCurrency)} ${text('风险','risk',language)}` : money(item.convertedMinor,item.settlementCurrency);
    const row = (label,value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
    return `<div class="publisher-dashboard-overlay" data-dashboard-action="close-order"><aside class="publisher-dashboard-drawer" role="dialog" aria-modal="true" aria-label="${text('订单详情','Order details',language)}" data-testid="publisher-order-drawer" data-dashboard-stop><header><div><span>${text('脱敏订单详情','REDACTED ORDER DETAIL',language)}</span><h2>${item.id}</h2><p>${item.orderMask} · ${item.date}</p></div><button type="button" data-dashboard-action="close-order" aria-label="${text('关闭','Close',language)}">×</button></header><div class="publisher-dashboard-drawer-body"><section><h3>${text('订单快照','Order snapshot',language)}</h3><dl>${row(text('游戏','Game',language),language === 'en' ? item.gameEn : item.game)}${row('SKU',item.sku)}${row(text('商品','Product',language),language === 'en' ? item.productEn : item.product)}${row(text('地区','Region',language),language === 'en' ? item.countryEn : item.country)}${row(text('平台','Platform',language),'Mac')}${row(text('渠道','Channel',language),language === 'en' ? item.channelEn : item.channel)}</dl></section><section><h3>${text('交易生命周期与资金影响','Transaction lifecycle & financial impact',language)}</h3><dl>${row(text('交易结果','Transaction result',language),tag(sm[0],sm[1]))}${row(text('交易类型','Transaction type',language),lifecycleMeta('transactionType',item.transactionType,language))}${row(text('支付状态','Payment status',language),lifecycleMeta('paymentStatus',item.paymentStatus,language))}${row(text('履约状态','Fulfillment status',language),lifecycleMeta('fulfillmentStatus',item.fulfillmentStatus,language))}${row(text('退款状态','Refund status',language),lifecycleMeta('refundStatus',item.refundStatus,language))}${row(text('拒付状态','Chargeback status',language),lifecycleMeta('chargebackStatus',item.chargebackStatus,language))}${row(text('履约方式','Fulfillment',language),item.fulfillment === 'account_entitlement' ? copy(language).direct : 'CDKEY')}${row(text('交易原币','Original amount',language),money(item.amountMinor,item.currency))}${row(text('结算币折算','Converted amount',language),`${money(item.convertedMinor,item.settlementCurrency)} · ${item.fxRateText}`)}${row(text('资金影响','Financial impact',language),impact)}${item.userListDeleted ? row(text('用户侧列表','User order list',language),text('已删除，不影响统计与对账','Deleted; analytics and reconciliation are unchanged',language)) : ''}</dl></section><div class="publisher-dashboard-privacy">${text('本页不展示玩家身份、设备、支付账号、支付凭证、Key 明文和内部处理材料。','Player identity, device, payment account, payment proof, plain-text keys and internal materials are hidden.',language)}</div></div></aside></div>`;
  };

  const renderRevenue = (state,language) => {
    const m = metrics(filteredOrders(state));
    const line = (label,value,tone = '') => `<div${tone ? ` class="is-${tone}"` : ''}><dt>${label}</dt><dd>${value}</dd></div>`;
    return `<div class="publisher-dashboard-revenue-summary publisher-dashboard-revenue-grid"><section class="publisher-dashboard-card"><header><div><span>${text('动态预估','ESTIMATE',language)}</span><h2>${text('预估收入','Estimated revenue',language)}</h2><p>${text('随退款、拒付和费用更新，正式金额以结算单为准。','Updates with reversals and fees; the statement is final.',language)}</p></div>${tag(text('以结算单为准','Statement is final',language),'warning')}</header><dl class="publisher-dashboard-formula">${line(text('销售额','Gross sales',language),money(m.grossMinor,m.settlementCurrency))}${line(text('退款成功','Refunds',language),`− ${money(m.refundMinor,m.settlementCurrency)}`,'negative')}${line(text('拒付败诉','Chargeback losses',language),`− ${money(m.chargebackLossMinor,m.settlementCurrency)}`,'negative')}${line(text('税费','Taxes',language),`− ${money(m.taxMinor,m.settlementCurrency)}`,'negative')}${line(text('渠道费','Provider fees',language),`− ${money(m.channelFeeMinor,m.settlementCurrency)}`,'negative')}${line(text('平台分成','Platform share',language),`− ${money(m.platformShareMinor,m.settlementCurrency)}`,'negative')}${line(text('调整项','Adjustments',language),`${m.adjustmentMinor >= 0 ? '+' : '−'} ${money(Math.abs(m.adjustmentMinor),m.settlementCurrency)}`,m.adjustmentMinor >= 0 ? 'positive' : 'negative')}<div class="is-total"><dt>${text('预估收入','Estimated revenue',language)}</dt><dd>${money(m.estimatedMinor,m.settlementCurrency)}</dd></div></dl><div class="publisher-dashboard-risk-note"><span>${text('拒付待裁决风险','Open chargeback risk',language)}</span><strong>${money(m.chargebackRiskMinor,m.settlementCurrency)}</strong><small>${text(`尚未扣减 · ${m.fxVersion}`,`Not deducted · ${m.fxVersion}`,language)}</small></div></section><section class="publisher-dashboard-card"><header><div><span>${text('厂商账单','COMPANY STATEMENT',language)}</span><h2>${text('待结算','Pending settlement',language)}</h2><p>${text('厂商级金额，不随单游戏经营筛选分摊。','Company-level amount, not allocated by game analytics filters.',language)}</p></div></header><div class="publisher-dashboard-pending"><strong>${pendingText(m)}</strong><span>${text('当前未清偿金额','Current outstanding amount',language)}</span></div><dl class="publisher-dashboard-statement"><div><dt>${text('结算币种','Settlement currency',language)}</dt><dd>USD</dd></div><div><dt>${text('口径','Scope',language)}</dt><dd>${text('财务主体／账期','Finance entity / period',language)}</dd></div><div><dt>${text('数据更新','Updated',language)}</dt><dd>2026-09-10 23:59</dd></div></dl><div class="publisher-dashboard-finance-actions"><button type="button" data-dashboard-action="finance-flows">${text('查看对账流水','View reconciliation flows',language)}</button><button type="button" class="is-primary" data-dashboard-action="finance-settlement">${text('前往对账结算','Go to settlement',language)}</button></div></section></div><section class="publisher-dashboard-card publisher-dashboard-finance-table"><header><div><span>${text('对账与发票状态','RECONCILIATION & INVOICE',language)}</span><h2>${text('结算单记录','Statement records',language)}</h2></div><strong>${statements.length} ${text('条','records',language)}</strong></header><div class="publisher-dashboard-table-wrap"><table><thead><tr><th>${text('账期／结算单','Period / statement',language)}</th><th>${text('金额','Amount',language)}</th><th>${text('对账状态','Reconciliation',language)}</th><th>${text('发票状态','Invoice',language)}</th><th>${text('当前待办','Current action',language)}</th><th>${text('更新时间','Updated',language)}</th></tr></thead><tbody>${statements.map(item => { const rm=reconciliationMeta(item.reconciliationStatus,language); const im=invoiceMeta(item.invoiceStatus,language); return `<tr><td><strong>${item.period}</strong><small>${item.id}</small></td><td>${money(item.amountMinor,item.currency)}</td><td data-reconciliation-status="${item.reconciliationStatus}">${tag(rm[0],rm[1])}</td><td data-invoice-status="${item.invoiceStatus}">${item.invoiceStatus === 'none' ? '--' : tag(im[0],im[1])}</td><td>${currentActionLabel(item.currentAction,language)}</td><td>${item.updatedAt}</td></tr>`; }).join('')}</tbody></table></div></section><section class="publisher-dashboard-card publisher-dashboard-finance-table"><header><div><span>${text('付款状态','PAYMENT STATUS',language)}</span><h2>${text('付款记录','Payment records',language)}</h2></div><strong>${payments.length} ${text('条','records',language)}</strong></header><div class="publisher-dashboard-table-wrap"><table><thead><tr><th>${text('付款单／结算单','Payment / statement',language)}</th><th>${text('付款金额','Payment amount',language)}</th><th>${text('未清偿','Outstanding',language)}</th><th>${text('付款状态','Payment status',language)}</th><th>${text('下一步','Next action',language)}</th><th>${text('更新时间','Updated',language)}</th></tr></thead><tbody>${payments.map(item => { const pm=paymentMeta(item.status,language); return `<tr><td><strong>${item.id}</strong><small>${item.statementId}</small></td><td>${money(item.amountMinor,item.currency)}</td><td>${money(item.outstandingMinor,item.currency)}</td><td data-payment-status="${item.status}">${tag(pm[0],pm[1])}</td><td>${language === 'en' ? text(item.nextAction,item.nextAction,language) : item.nextAction}</td><td>${item.updatedAt}</td></tr>`; }).join('')}</tbody></table></div></section>`;
  };

  const renderScopeDialog = (state,language) => state.scopeOpen ? `<div class="publisher-dashboard-overlay" data-dashboard-action="close-scope"><section class="publisher-dashboard-dialog" role="dialog" aria-modal="true" aria-label="${text('数据口径','Metric definitions',language)}" data-dashboard-stop><header><div><span>${text('口径版本 2026-09','DEFINITION VERSION 2026-09',language)}</span><h2>${text('数据口径','Metric definitions',language)}</h2></div><button type="button" data-dashboard-action="close-scope" aria-label="${text('关闭','Close',language)}">×</button></header><dl>${[
    [text('站内转化漏斗','In-app conversion funnel',language),text('从有效曝光到履约成功统一使用去重用户数；漏斗按入口时间归因，交易结果按履约完成时间统计。','Unique visitors are used throughout the funnel; entry time and fulfillment time use separate attribution.',language)],
    [text('付费销量','Paid sales',language),text('付费交易且履约完成后计入；退款成功和拒付败诉分别展示并扣减收入。','Paid transactions count after fulfillment; refunds and lost chargebacks reduce revenue.',language)],
    [text('免费领取','Free claims',language),text('0 元订单且履约完成后计入。','Zero-price orders count after fulfillment.',language)],
    [text('退款与拒付','Refunds & chargebacks',language),text('拒付待裁决只显示风险，不提前扣减；退款成功和拒付败诉才影响收入。','Open chargebacks show risk only; completed reversals affect revenue.',language)],
    [text('多币种','Multiple currencies',language),text('交易金额展示原币，预估收入按页面汇率版本折算为 USD。','Transactions show original currency; estimates convert to USD with the displayed FX version.',language)],
    [text('预估收入','Estimated revenue',language),text('逐项扣除税费、渠道费和平台分成，正式金额以财务结算模块为准。','Deductions are itemized; the Finance module is the formal source.',language)],
    [text('待结算','Pending settlement',language),text('按财务主体、账期和币种汇总，不随单游戏筛选分摊。','Grouped by finance entity, period and currency and not allocated by game filters.',language)],
    [text('更新时间','Update time',language),text('交易数据小时级更新；正式金额以财务结算为准。','Transaction data updates hourly; Finance provides formal amounts.',language)],
    [text('脱敏范围','Redaction',language),text('对账流水号用于核账；玩家身份、支付账号、Key 明文和内部材料不展示。','Reconciliation IDs support verification; sensitive player and payment data are hidden.',language)],
  ].map(([label,value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl></section></div>` : '';

  const render = (stateInput,language = 'zh',options = {}) => {
    const state = stateInput || createState();
    state.filters = { ...defaultFilters, ...(state.filters || {}) };
    const c = copy(language);
    const access = options.access || {};
    const game = options.game || null;
    if (game?.name) state.filters.game = game.name;
    if (!access.canViewPublisherData && !access.isPublisherReadOnly) return `<section class="publisher-dashboard-access" data-publisher-page="data" data-testid="publisher-data-dashboard"><span>${namespace.icons?.render('lock') || ''}</span><strong>${text('暂未开通经营数据权限','Analytics access is not available',language)}</strong><p>${text('完成企业认证并获得厂商数据权限后，可查看销量、订单和结算摘要。','Complete company verification and obtain analytics access.',language)}</p></section>`;
    const range = effectiveRange(state.filters);
    const body = state.tab === 'orders' ? renderOrders(state,language) : state.tab === 'revenue' ? renderRevenue(state,language) : renderOverview(state,language);
    return `<section class="publisher-data-dashboard" data-publisher-page="data" data-testid="publisher-data-dashboard" data-dashboard-tab="${state.tab}" data-dashboard-range="${range.startDate}/${range.endDate}"${game ? ` data-dashboard-game="${escape(game.gameKey || game.name)}"` : ''}><header class="publisher-dashboard-head"><div><h1>${c.title}</h1></div><div><button type="button" data-dashboard-action="scope">${c.scope}</button>${tag(c.readonly,'info')}<small>${c.updated}</small></div></header><nav class="publisher-dashboard-tabs" aria-label="${c.title}">${Object.entries(c.tabs).map(([value,label]) => `<button type="button" class="${state.tab === value ? 'is-active' : ''}" data-dashboard-action="tab" data-publisher-data-tab="${value}" aria-selected="${state.tab === value}">${label}</button>`).join('')}</nav>${renderFilters(state,language)}<div class="publisher-dashboard-content">${body}</div>${renderOrderDrawer(state,language)}${renderScopeDialog(state,language)}</section>`;
  };

  const bind = (root,{ state,game,onChange,onFinance } = {}) => {
    const host = root.querySelector('[data-testid="publisher-data-dashboard"]');
    if (!host || !state) return;
    const update = (patch = {},options = {}) => {
      Object.assign(state,patch);
      if (typeof onChange === 'function') onChange(state,options);
    };
    host.querySelectorAll('[data-dashboard-filter]').forEach(control => control.addEventListener(control.matches('input') ? 'input' : 'change',() => {
      const key = control.dataset.dashboardFilter;
      if (key === 'range' && control.value === 'custom') {
        update({ datePickerOpen:true, draftDateRange:{ ...effectiveRange(state.filters) } },{ preserveScroll:true });
        return;
      }
      state.filters = { ...defaultFilters, ...(state.filters || {}), [key]:control.value };
      if (key === 'range') state.filters = { ...state.filters, ...preset(control.value) };
      if (control.matches('input')) {
        clearTimeout(state.__keywordTimer);
        state.__keywordTimer = setTimeout(() => update({}, { preserveScroll:true }),180);
      } else update({}, { preserveScroll:true });
    }));
    host.querySelectorAll('[data-dashboard-date]').forEach(control => control.addEventListener('input',() => {
      const key = control.dataset.dashboardDate === 'start' ? 'startDate' : 'endDate';
      state.draftDateRange = { ...(state.draftDateRange || effectiveRange(state.filters)), [key]:control.value };
      update({}, { preserveScroll:true });
    }));
    host.addEventListener('focusin',event => {
      const field = event.target.closest('.publisher-dashboard-filter-scroll .publisher-dashboard-field');
      if (field) field.scrollIntoView({ block:'nearest',inline:'nearest' });
    });
    host.addEventListener('click',event => {
      const control = event.target.closest('[data-dashboard-action]');
      if (!control) return;
      const stop = event.target.closest('[data-dashboard-stop]');
      if (stop && !control.closest('[data-dashboard-stop]')) return;
      const action = control.dataset.dashboardAction;
      if (action === 'tab') update({ tab:control.dataset.publisherDataTab || 'overview',selectedOrder:'',scopeOpen:false,datePickerOpen:false });
      else if (action === 'reset') update({ filters:{ ...defaultFilters,game:game?.name || 'all' },datePickerOpen:false,draftDateRange:{ ...presetRanges['30d'] } });
      else if (action === 'conversion-trend') update({ trendMetric:control.dataset.conversionTrendMetric || 'impression' },{ preserveScroll:true });
      else if (action === 'scope') update({ scopeOpen:true,selectedOrder:'',datePickerOpen:false },{ preserveScroll:true });
      else if (action === 'close-scope') update({ scopeOpen:false },{ preserveScroll:true });
      else if (action === 'open-order') update({ selectedOrder:control.dataset.orderId || '',scopeOpen:false,datePickerOpen:false },{ preserveScroll:true });
      else if (action === 'close-order') update({ selectedOrder:'' },{ preserveScroll:true });
      else if (action === 'date-cancel') update({ datePickerOpen:false,draftDateRange:{ ...effectiveRange(state.filters) } },{ preserveScroll:true });
      else if (action === 'date-apply') {
        const draft = state.draftDateRange || {};
        if (!validateDateRange(draft)) update({ filters:{ ...state.filters,range:'custom',startDate:draft.startDate,endDate:draft.endDate },datePickerOpen:false },{ preserveScroll:true });
      } else if (action === 'finance-settlement' || action === 'finance-flows') {
        const target = action === 'finance-flows' ? 'settlement/flows' : 'settlement';
        if (typeof onFinance === 'function') onFinance(target,clone(state.filters));
      }
    });
    host.addEventListener('keydown',event => {
      if (event.key !== 'Escape') return;
      if (state.datePickerOpen) update({ datePickerOpen:false,draftDateRange:{ ...effectiveRange(state.filters) } },{ preserveScroll:true });
      else if (state.selectedOrder) update({ selectedOrder:'' },{ preserveScroll:true });
      else if (state.scopeOpen) update({ scopeOpen:false },{ preserveScroll:true });
    });
  };

  window.PublisherDataDashboard = {
    createState,render,bind,filteredOrders,metrics,conversionSnapshot,validateDateRange,deriveTransactionResult,
    orders:() => clone(orders),statements:() => clone(statements),payments:() => clone(payments),
    snapshot:stateInput => {
      const state = stateInput || createState();
      const rows = filteredOrders(state);
      return { tab:state.tab || 'overview',filters:{ ...defaultFilters,...(state.filters || {}) },statuses:[...new Set(rows.map(deriveTransactionResult))],metrics:metrics(rows),conversion:conversionSnapshot(state) };
    },
  };
  namespace.publisherDataDashboard = window.PublisherDataDashboard;
})(window.GameHubDeveloperPortal);

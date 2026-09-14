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
    yesterday:{ startDate:'2026-09-09', endDate:'2026-09-09' },
    today:{ startDate:dataCutoffDate, endDate:dataCutoffDate },
    '7d':{ startDate:'2026-09-04', endDate:dataCutoffDate },
    '30d':{ startDate:'2026-08-12', endDate:dataCutoffDate },
    lastMonth:{ startDate:'2026-08-01', endDate:'2026-08-31' },
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
      title:en ? 'Data dashboard' : '数据看板', updated:en ? 'Updated to Sep 10, 2026 23:59' : '数据更新至 2026-09-10 23:59',
      tabs:{ conversion:en ? 'Exposure & conversion' : '曝光转化', users:en ? 'User data' : '用户数据' },
      product:en ? 'Product type' : '商品类型', source:en ? 'Source' : '来源位置', region:en ? 'Region' : '地区', range:en ? 'Time' : '时间',
      all:en ? 'All' : '全部', base:en ? 'Base game' : '游戏本体', dlc:en ? 'Permanent DLC' : '永久 DLC', direct:en ? 'Direct purchase' : '直接购买', global:en ? 'Global (excl. Mainland China)' : '全球（不含中国大陆）', domestic:en ? 'Mainland China' : '中国大陆', reset:en ? 'Reset' : '重置',
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
  const normalizeFilters = sourceInput => {
    const source = sourceInput && typeof sourceInput === 'object' ? sourceInput : {};
    const filters = { ...defaultFilters, ...source };
    if (filters.range === '90d') {
      const legacyRange = {
        startDate:source.startDate || formatDate(new Date(dateFrom(dataCutoffDate).getTime() - 89 * 86400000)),
        endDate:source.endDate || dataCutoffDate,
      };
      if (!validateDateRange(legacyRange)) return { ...filters, range:'custom', ...legacyRange };
      return { ...filters, range:'30d', ...presetRanges['30d'] };
    }
    if (filters.range === 'custom') {
      const customRange = { startDate:filters.startDate, endDate:filters.endDate };
      return validateDateRange(customRange)
        ? { ...filters, range:'30d', ...presetRanges['30d'] }
        : { ...filters, ...customRange };
    }
    if (!Object.prototype.hasOwnProperty.call(presetRanges,filters.range)) return { ...filters, range:'30d', ...presetRanges['30d'] };
    return { ...filters, ...presetRanges[filters.range] };
  };
  const createState = seed => {
    const incoming = seed && typeof seed === 'object' ? clone(seed) : {};
    const filters = normalizeFilters(incoming.filters);
    const requestedTab = incoming.tab;
    const tab = requestedTab === 'users' || requestedTab === 'conversion' ? requestedTab : 'conversion';
    const restored = { ...incoming };
    ['activeTooltip','datePickerOpen','draftDateRange','calendarLeftMonth','calendarSelectingEnd','dateAnchor','detailFullscreen','detailRefreshing'].forEach(key => delete restored[key]);
    const selectedMetricByTab = {
      conversion:'impression',
      users:'active_players',
      ...(incoming.selectedMetricByTab || {}),
    };
    const conversionMetrics = ['impression','card_ctr','reservation_users','detail_view','detail_acquisition','acquisition_success'];
    const userMetrics = ['active_players','new_players','retention_1d','retention_3d','retention_7d','avg_duration'];
    if (selectedMetricByTab.conversion === 'fulfillment_success') selectedMetricByTab.conversion = 'acquisition_success';
    if (!conversionMetrics.includes(selectedMetricByTab.conversion)) selectedMetricByTab.conversion = conversionMetrics.includes(incoming.trendMetric) ? incoming.trendMetric : 'impression';
    if (!userMetrics.includes(selectedMetricByTab.users)) selectedMetricByTab.users = incoming.userTrendMetric === 'new' ? 'new_players' : 'active_players';
    return {
      tab,
      trendMetric:'impression',
      userTrendMetric:'active',
      scenario:'ready',
      selectedMetricByTab,
      detailView:incoming.detailView === 'table' ? 'table' : 'chart',
      detailRefreshRevision:Number(incoming.detailRefreshRevision || 0),
      detailRefreshedAt:String(incoming.detailRefreshedAt || ''),
      ...restored,
      tab,
      filters,
      selectedMetricByTab,
      detailView:incoming.detailView === 'table' ? 'table' : 'chart',
      detailRefreshRevision:Number(incoming.detailRefreshRevision || 0),
      detailRefreshedAt:String(incoming.detailRefreshedAt || ''),
      detailFullscreen:false,
      detailRefreshing:false,
      activeTooltip:'',
      datePickerOpen:false,
      draftDateRange:effectiveRange(filters),
      calendarLeftMonth:calendarStartMonth(effectiveRange(filters)),
      calendarSelectingEnd:false,
    };
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
  const enumerateDates = (startDate,endDate) => {
    if (validateDateRange({ startDate,endDate })) return [];
    const start = dateFrom(startDate);
    return Array.from({ length:daysBetween(startDate,endDate) },(_,index) => formatDate(new Date(start.getTime() + index * 86400000)));
  };
  const sumMetric = (rows,key) => {
    const values = rows.map(item => item[key]).filter(Number.isFinite);
    return values.length ? values.reduce((sum,value) => sum + value,0) : null;
  };
  const regionalFactor = region => ({
    all:1, global:0.82, domestic:0.18, Japan:0.14, 'United States':0.22, Germany:0.09,
    'United Kingdom':0.08, 'Mainland China':0.18, Canada:0.06, France:0.07,
    Singapore:0.04, 'South Korea':0.08, Australia:0.05,
  }[region] ?? 0.075);
  const sourceFactor = source => ({
    all:1, home:0.364, discovery:0.184, ranking:0.142, search:0.136,
    campaign:0.102, external:0.072, direct:0.048, other:0.018,
  }[source] ?? 1);
  const dailyWave = (date,index) => {
    const day = Number(date.slice(-2));
    return 0.88 + ((day * 17 + index * 11) % 23) / 50 + Math.sin((index + day) / 3) * 0.055;
  };
  const dailyConversionRows = stateInput => {
    const filters = { ...defaultFilters, ...(stateInput?.filters || {}) };
    const { startDate,endDate } = effectiveRange(filters);
    const filterFactor = regionalFactor(filters.region) * sourceFactor(filters.source);
    return enumerateDates(startDate,endDate).map((date,index) => {
      const factor = filterFactor * dailyWave(date,index);
      const impression = Math.max(0,Math.round(1665 * factor));
      const cardClick = Math.max(0,Math.round(impression * (0.286 + ((index % 5) - 2) * 0.006)));
      const detailView = Math.max(0,Math.round(cardClick * (0.818 + ((index % 4) - 1.5) * 0.009)));
      const reservationUsers = Math.max(0,Math.round(detailView * (0.118 + ((index % 5) - 2) * 0.003)));
      const downloadUsers = Math.max(0,Math.round(detailView * (0.142 + ((index % 6) - 2.5) * 0.003)));
      const launchUsers = Math.max(0,Math.round(detailView * (0.091 + ((index % 4) - 1.5) * 0.003)));
      const overlapUsers = Math.max(0,Math.round(detailView * (0.047 + ((index % 3) - 1) * 0.002)));
      const acquisitionSuccess = Math.max(reservationUsers,downloadUsers,launchUsers,reservationUsers + downloadUsers + launchUsers - overlapUsers);
      return {
        date,
        impression,
        card_click:cardClick,
        detail_view:detailView,
        acquisition_success:acquisitionSuccess,
        reservation_users:reservationUsers,
        download_users:downloadUsers,
        launch_users:launchUsers,
        card_ctr:safeRate(cardClick,impression),
        detail_acquisition:safeRate(acquisitionSuccess,detailView),
      };
    });
  };
  const periodUv = (dailyTotal,dayCount) => dayCount <= 1 ? Math.round(dailyTotal) : Math.round(dailyTotal * Math.max(0.68,0.94 - Math.max(0,dayCount - 1) * 0.007));
  const conversionSnapshot = state => {
    const rows = dailyConversionRows(state);
    const dayCount = rows.length || 1;
    const totals = Object.fromEntries(['impression','card_click','detail_view','acquisition_success','reservation_users'].map(key => [key,sumMetric(rows,key) || 0]));
    const summary = {
      impression:periodUv(totals.impression,dayCount),
      card_click:periodUv(totals.card_click,dayCount),
      detail_view:periodUv(totals.detail_view,dayCount),
      acquisition_success:periodUv(totals.acquisition_success,dayCount),
      reservation_users:totals.reservation_users,
    };
    summary.card_ctr = safeRate(summary.card_click,summary.impression);
    summary.detail_acquisition = safeRate(summary.acquisition_success,summary.detail_view);
    const ctaClick = Math.max(summary.acquisition_success,Math.round(summary.detail_view * 0.3));
    const orderCreate = Math.max(summary.acquisition_success,Math.round(ctaClick * 0.848));
    const stageValues = [summary.impression,summary.card_click,summary.detail_view,ctaClick,orderCreate,summary.acquisition_success,summary.acquisition_success];
    const stages = conversionStageSeed.map((item,index) => ({
      ...item,
      uv:stageValues[index],
      previousUv:Math.round(stageValues[index] * 0.91),
      stepRate:index ? safeRate(stageValues[index],stageValues[index - 1]) : null,
      changeRate:0.099,
    }));
    return {
      rows,
      summary,
      stages,
      sources:[],
      trends:Object.fromEntries(Object.keys(summary).map(key => [key,rows.map(item => item[key])])),
      overallRate:safeRate(summary.acquisition_success,summary.impression),
    };
  };
  const trendDays = filters => {
    const { startDate,endDate } = effectiveRange(filters);
    return enumerateDates(startDate,endDate).map(date => date.slice(5));
  };

  const option = (value,label,selected) => `<option value="${escape(value)}"${selected === value ? ' selected' : ''}>${escape(label)}</option>`;
  const formatUv = (value,language) => value === null ? '—' : new Intl.NumberFormat(language === 'en' ? 'en-US' : 'zh-CN').format(value);
  const formatRate = value => value === null ? '—' : `${(value * 100).toFixed(1)}%`;
  const conversionLabels = language => ({
    impression:text('有效曝光','Qualified impressions',language),
    card_click:text('游戏卡点击','Game card clicks',language),
    detail_view:text('详情页访问','Detail visits',language),
    cta_click:text('购买／领取点击','Buy / claim clicks',language),
    order_create:text('创建订单','Orders created',language),
    acquisition_success:text('成功获取','Successful acquisition',language),
    fulfillment_success:text('履约成功','Fulfillment success',language),
  });
  const sourceLabels = language => ({
    home:text('首页推荐','Home recommendations',language),
    discovery:text('找游戏','Discover',language),
    ranking:text('排行榜','Rankings',language),
    search:text('搜索','Search',language),
    campaign:text('专题活动','Campaigns',language),
    external:text('站外活动','External campaigns',language),
    direct:text('自然直达','Direct',language),
    other:text('其他','Other',language),
  });
  const rangeLabels = language => ({
    yesterday:text('昨日','Yesterday',language),
    today:text('今日','Today',language),
    '7d':text('近 7 天','Last 7 days',language),
    '30d':text('近 30 天','Last 30 days',language),
    lastMonth:text('上月','Last month',language),
    month:text('本月','This month',language),
    custom:text('自定义','Custom',language),
  });
  const definitions = language => ({
    impression:text('游戏卡片在站内完成有效展示的去重用户数，同一用户在同一自然日重复曝光仅计一次。','Unique users with a qualified in-app game-card impression; repeated impressions on the same calendar day are deduplicated.',language),
    card_click:text('点击游戏卡片进入详情页的去重用户数；点击率＝游戏卡点击 UV ÷ 有效曝光 UV。','Unique users who click a game card; CTR equals game-card click UV divided by qualified impression UV.',language),
    detail_view:text('成功打开游戏详情页的去重用户数。','Unique users who successfully open the game detail page.',language),
    cta_click:text('在详情页点击购买或免费领取按钮的去重用户数。','Unique users who click Buy or Claim on the game detail page.',language),
    order_create:text('成功创建购买或免费领取订单的去重用户数。','Unique users for whom a paid or free order is created successfully.',language),
    acquisition_success:text('统计期内完成预约、下载或成功启动任一行为的去重用户数；同一用户完成多种行为只计 1 人。','Unique users who complete at least one reservation, download, or successful launch during the period; each user is counted once across actions.',language),
    fulfillment_success:text('已合并到“成功获取用户数”，不再作为独立指标。','Merged into Successful acquisition users and no longer shown as a separate metric.',language),
    reservation_users:text('统计期内首次成功预约当前游戏的去重账号数，按首次预约成功日归属；取消预约不回溯扣减。','Unique accounts making their first successful reservation during the period, attributed to the first reservation date; later cancellations do not rewrite history.',language),
    overall_conversion:text('成功获取 UV ÷ 有效曝光 UV；统计周期按用户首次进入漏斗的时间归因。','Successful acquisition UV divided by qualified impression UV, attributed by the user’s first funnel-entry time.',language),
    detail_acquisition:text('成功获取用户数 ÷ 详情页访问 UV；预约、下载或成功启动任一行为均算成功获取，用户按周期去重。','Successful acquisition users divided by detail visits; reservation, download, or successful launch all count, with users deduplicated for the period.',language),
    active_players:text('统计周期内至少成功启动过一次当前游戏的去重账号数，固定统计 Mac。','Unique accounts that successfully launch the current game at least once during the period; Mac only.',language),
    new_players:text('统计周期内首次成功启动当前游戏的去重账号数。','Unique accounts that launch the current game for the first time during the period.',language),
    retention_1d:text('新增玩家中，在首次启动后的第 1 个自然日再次成功启动游戏的账号占比；未观察满 1 日的 cohort 不计入。','Share of new players returning on calendar day 1; immature cohorts are excluded.',language),
    retention_3d:text('新增玩家中，在首次启动后的第 3 个自然日再次成功启动游戏的账号占比；未观察满 3 日的 cohort 不计入。','Share of new players returning on calendar day 3; immature cohorts are excluded.',language),
    retention_7d:text('新增玩家中，在首次启动后的第 7 个自然日再次成功启动游戏的账号占比；未观察满 7 日的 cohort 不计入。','Share of new players returning on calendar day 7; immature cohorts are excluded.',language),
    avg_duration:text('统计周期内所有有效游戏会话总时长 ÷ 活跃玩家数；单次不足 1 分钟的异常会话不计入。','Total duration of valid sessions divided by active players; anomalous sessions shorter than one minute are excluded.',language),
    source:text('用户首次进入本次漏斗时对应的站内位置或访问来源。','The in-app placement or traffic source on the user’s first funnel entry.',language),
  });

  const metricHelpButton = (state,id,key,label,language) => {
    const tooltipId = `publisher-metric-tip-${id}`;
    const opened = state.activeTooltip === id;
    return `<button type="button" class="publisher-metric-help" data-dashboard-action="metric-help" data-metric-help="${id}" aria-label="${escape(text(`查看“${label}”指标定义`,`View definition for ${label}`,language))}" aria-describedby="${tooltipId}" aria-expanded="${opened}">?</button><span class="publisher-metric-tooltip${opened ? ' is-open' : ''}" id="${tooltipId}" role="tooltip">${escape(definitions(language)[key] || '')}</span>`;
  };
  const metricHelp = (state,id,key,label,language) => `<span class="publisher-metric-label"><span>${label}</span>${metricHelpButton(state,id,key,label,language)}</span>`;
  const filterSelect = (key,label,choices,state,className = '') => `<label class="publisher-dashboard-field ${className}"><span>${label}</span><select data-dashboard-filter="${key}">${choices.map(([value,name]) => option(value,name,state.filters[key])).join('')}</select></label>`;
  const renderRegionSelect = (state,language) => {
    const c = copy(language);
    const countries = [...new Map(orders.map(item => [item.countryKey,language === 'en' ? item.countryEn : item.country])).entries()];
    return `<label class="publisher-dashboard-field publisher-dashboard-field--region"><span>${c.region}</span><select data-dashboard-filter="region">${option('all',c.all,state.filters.region)}<optgroup label="${text('发行范围','Publishing scope',language)}">${option('global',c.global,state.filters.region)}${option('domestic',c.domestic,state.filters.region)}</optgroup><optgroup label="${text('国家／地区','Countries / regions',language)}">${countries.map(([value,label]) => option(value,label,state.filters.region)).join('')}</optgroup></select></label>`;
  };

  const addMonth = (monthKey,offset) => {
    const [year,month] = monthKey.split('-').map(Number);
    const value = new Date(Date.UTC(year,month - 1 + offset,1));
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2,'0')}`;
  };
  const calendarStartMonth = range => range.startDate.slice(0,7) === range.endDate.slice(0,7)
    ? addMonth(range.endDate.slice(0,7),-1)
    : range.startDate.slice(0,7);
  const monthTitle = (monthKey,language) => {
    const [year,month] = monthKey.split('-').map(Number);
    return language === 'en'
      ? new Intl.DateTimeFormat('en-US',{ month:'long',year:'numeric',timeZone:'UTC' }).format(new Date(Date.UTC(year,month - 1,1)))
      : `${year} 年 ${month} 月`;
  };
  const renderMonth = (monthKey,state,language,index) => {
    const [year,month] = monthKey.split('-').map(Number);
    const first = new Date(Date.UTC(year,month - 1,1));
    const leading = (first.getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(year,month,0)).getUTCDate();
    const previousDays = new Date(Date.UTC(year,month - 1,0)).getUTCDate();
    const draft = state.draftDateRange || effectiveRange(state.filters);
    const cells = Array.from({ length:42 },(_,cellIndex) => {
      const dayIndex = cellIndex - leading + 1;
      let cellMonth = month;
      let cellYear = year;
      let day = dayIndex;
      let outside = false;
      if (dayIndex < 1) {
        outside = true;
        day = previousDays + dayIndex;
        cellMonth -= 1;
        if (cellMonth === 0) { cellMonth = 12; cellYear -= 1; }
      } else if (dayIndex > days) {
        outside = true;
        day = dayIndex - days;
        cellMonth += 1;
        if (cellMonth === 13) { cellMonth = 1; cellYear += 1; }
      }
      const value = `${cellYear}-${String(cellMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const disabled = outside || value > dataCutoffDate;
      const classes = [outside ? 'is-outside' : '',value === draft.startDate ? 'is-start' : '',value === draft.endDate ? 'is-end' : '',value > draft.startDate && value < draft.endDate ? 'is-between' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="${classes}" data-dashboard-action="calendar-day" data-calendar-date="${value}"${disabled ? ' disabled' : ''}>${day}</button>`;
    }).join('');
    const weekday = language === 'en' ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : ['一','二','三','四','五','六','日'];
    const previous = index === 0
      ? `<button type="button" data-dashboard-action="calendar-prev" aria-label="${text('上一个月','Previous month',language)}">‹</button>`
      : '<span></span>';
    const nextDisabled = addMonth(monthKey,1) > dataCutoffDate.slice(0,7);
    const next = index === 1
      ? `<button type="button" data-dashboard-action="calendar-next" aria-label="${text('下一个月','Next month',language)}"${nextDisabled ? ' disabled' : ''}>›</button>`
      : `<button type="button" class="publisher-calendar-mobile-next" data-dashboard-action="calendar-next" aria-label="${text('下一个月','Next month',language)}"${nextDisabled ? ' disabled' : ''}>›</button>`;
    return `<section class="publisher-calendar-month" data-calendar-month="${monthKey}"><header>${previous}<strong>${monthTitle(monthKey,language)}</strong>${next}</header><div class="publisher-calendar-weekdays">${weekday.map(value => `<span>${value}</span>`).join('')}</div><div class="publisher-calendar-grid">${cells}</div></section>`;
  };
  const renderDatePicker = (state,language) => {
    if (!state.datePickerOpen) return '';
    const applied = effectiveRange(state.filters);
    const draft = state.draftDateRange || applied;
    const error = validateDateRange(draft);
    const labels = rangeLabels(language);
    const shortcuts = ['yesterday','today','7d','30d','lastMonth','month'];
    const leftMonth = state.calendarLeftMonth || calendarStartMonth(applied);
    const anchor = state.dateAnchor || { left:16,top:82 };
    return `<div class="publisher-dashboard-date-backdrop" data-dashboard-action="date-cancel"><section class="publisher-dashboard-date-popover" id="publisher-dashboard-date-dialog" style="left:${Number(anchor.left) || 16}px;top:${Number(anchor.top) || 82}px" role="dialog" aria-modal="true" aria-label="${text('选择时间','Select date range',language)}" tabindex="-1" data-dashboard-date-dialog data-dashboard-stop><aside class="publisher-dashboard-date-shortcuts">${shortcuts.map(key => `<button type="button" class="${state.filters.range === key ? 'is-active' : ''}" data-dashboard-action="date-shortcut" data-dashboard-range-preset="${key}">${labels[key]}</button>`).join('')}<button type="button" class="${state.filters.range === 'custom' ? 'is-active' : ''}" disabled>${labels.custom}</button></aside><div class="publisher-dashboard-date-main"><header class="publisher-dashboard-date-summary"><span>${draft.startDate || '—'}</span><i>→</i><span>${draft.endDate || '—'}</span></header><div class="publisher-dashboard-calendars">${renderMonth(leftMonth,state,language,0)}${renderMonth(addMonth(leftMonth,1),state,language,1)}</div><p class="publisher-dashboard-date-error" data-dashboard-date-error${error ? '' : ' hidden'}>${escape(error)}</p><footer><small>${text('起止日均计入，最长可选 180 天，数据截至 2026-09-10。','Both dates are included; maximum 180 days; data through Sep 10, 2026.',language)}</small><div><button type="button" data-dashboard-action="date-cancel">${text('取消','Cancel',language)}</button><button type="button" class="is-primary" data-dashboard-action="date-apply"${error ? ' disabled' : ''}>${text('应用','Apply',language)}</button></div></footer></div></section></div>`;
  };
  const renderFilters = (state,language) => {
    const c = copy(language);
    const range = effectiveRange(state.filters);
    const rangeName = rangeLabels(language)[state.filters.range] || rangeLabels(language).custom;
    const sources = [['all',c.all],...Object.entries(sourceLabels(language))];
    const conversionOnly = state.tab === 'conversion'
      ? filterSelect('source',c.source,sources,state,'publisher-dashboard-field--source')
      : '';
    return `<section class="publisher-dashboard-filters" aria-label="${text('数据筛选','Data filters',language)}"><div class="publisher-dashboard-filter-row"><div class="publisher-dashboard-filter-scroll"><label class="publisher-dashboard-field publisher-dashboard-field--time"><span>${c.range}</span><button type="button" class="publisher-dashboard-time-button" data-dashboard-action="date-open" aria-haspopup="dialog" aria-controls="publisher-dashboard-date-dialog" aria-expanded="${state.datePickerOpen}"><strong>${rangeName}</strong><small>${range.startDate} → ${range.endDate}</small><i>▾</i></button></label>${conversionOnly}${renderRegionSelect(state,language)}</div><div class="publisher-dashboard-filter-fixed"><span class="publisher-dashboard-platform" data-dashboard-platform>${text('平台：Mac','Platform: Mac',language)}</span><button type="button" data-dashboard-action="reset">${c.reset}</button></div></div><div class="publisher-dashboard-filter-caption">${state.tab === 'conversion' ? text('点击任一指标卡可按自然日查看详情；周期 UV 均按账号去重。','Select any metric to inspect daily detail; period UV metrics are deduplicated by account.',language) : text('用户数据按账号去重；留存仅统计已观察满对应天数的新增玩家。','Users are deduplicated by account; retention includes mature cohorts only.',language)}</div>${renderDatePicker(state,language)}</section>`;
  };

  const userRegionScale = regionalFactor;
  const dailyUserRows = stateInput => {
    const filters = { ...defaultFilters, ...(stateInput?.filters || {}) };
    const { startDate,endDate } = effectiveRange(filters);
    const regionScale = userRegionScale(filters.region);
    const regionDelta = filters.region === 'domestic' || filters.region === 'Mainland China' ? -0.018 : filters.region === 'global' ? 0.006 : 0;
    return enumerateDates(startDate,endDate).map((date,index) => {
      const wave = dailyWave(date,index);
      const activePlayers = Math.max(0,Math.round(2150 * regionScale * wave));
      const newPlayers = Math.max(0,Math.round(505 * regionScale * (0.94 + ((index % 7) - 3) * 0.025)));
      const age = daysBetween(date,dataCutoffDate) - 1;
      return {
        date,
        active_players:activePlayers,
        new_players:newPlayers,
        retention_1d:age >= 1 ? Math.max(0,0.426 + regionDelta + ((index % 5) - 2) * 0.006) : null,
        retention_3d:age >= 3 ? Math.max(0,0.318 + regionDelta + ((index % 5) - 2) * 0.005) : null,
        retention_7d:age >= 7 ? Math.max(0,0.241 + regionDelta + ((index % 5) - 2) * 0.004) : null,
        avg_duration:Math.max(1,Math.round(86 + (regionScale - 0.5) * 8 + ((index % 7) - 3) * 2.2)),
      };
    });
  };
  const weightedAverage = (rows,valueKey,weightKey) => {
    const mature = rows.filter(item => Number.isFinite(item[valueKey]) && Number.isFinite(item[weightKey]) && item[weightKey] > 0);
    const weight = mature.reduce((sum,item) => sum + item[weightKey],0);
    return weight ? mature.reduce((sum,item) => sum + item[valueKey] * item[weightKey],0) / weight : null;
  };
  const userSnapshot = stateInput => {
    const filters = { ...defaultFilters, ...(stateInput?.filters || {}) };
    const rows = dailyUserRows({ ...stateInput,filters });
    const activeTotal = sumMetric(rows,'active_players') || 0;
    const newTotal = sumMetric(rows,'new_players') || 0;
    return {
      rows,
      activePlayers:periodUv(activeTotal,rows.length || 1),
      newPlayers:newTotal,
      retention1d:weightedAverage(rows,'retention_1d','new_players'),
      retention3d:weightedAverage(rows,'retention_3d','new_players'),
      retention7d:weightedAverage(rows,'retention_7d','new_players'),
      averageMinutes:Math.round(weightedAverage(rows,'avg_duration','active_players') || 0),
      trends:{ active:rows.map(item => item.active_players), new:rows.map(item => item.new_players) },
    };
  };

  const metricCatalog = language => ({
    conversion:[
      { key:'impression', label:text('有效曝光','Qualified impressions',language), definition:'impression', type:'integer', hint:text('周期去重 UV','Period unique users',language) },
      { key:'card_ctr', label:text('游戏卡点击率','Game card CTR',language), definition:'card_click', type:'percent', hint:text('点击 UV ÷ 曝光 UV','Clicks ÷ impressions',language) },
      { key:'reservation_users', label:text('新增预约用户数','New reservation users',language), definition:'reservation_users', type:'integer', hint:text('按首次预约成功日','By first reservation date',language) },
      { key:'detail_view', label:text('详情页访问','Detail visits',language), definition:'detail_view', type:'integer', hint:text('周期去重 UV','Period unique users',language) },
      { key:'detail_acquisition', label:text('详情获取转化率','Detail-to-acquisition',language), definition:'detail_acquisition', type:'percent', hint:text('预约／下载／启动用户 ÷ 详情访问 UV','Reserved / downloaded / launched ÷ detail visits',language) },
      { key:'acquisition_success', label:text('成功获取用户数','Successful acquisition users',language), definition:'acquisition_success', type:'integer', hint:text('预约、下载或启动，周期去重','Reserved, downloaded, or launched',language) },
    ],
    users:[
      { key:'active_players', label:text('活跃玩家数','Active players',language), definition:'active_players', type:'integer', hint:text('周期去重 UV','Period unique users',language) },
      { key:'new_players', label:text('新增玩家数','New players',language), definition:'new_players', type:'integer', hint:text('首次启动 UV','First-launch users',language) },
      { key:'retention_1d', label:text('次日留存','Day-1 retention',language), definition:'retention_1d', type:'percent', hint:text('新增 cohort','New-player cohort',language) },
      { key:'retention_3d', label:text('3 日留存','Day-3 retention',language), definition:'retention_3d', type:'percent', hint:text('新增 cohort','New-player cohort',language) },
      { key:'retention_7d', label:text('7 日留存','Day-7 retention',language), definition:'retention_7d', type:'percent', hint:text('新增 cohort','New-player cohort',language) },
      { key:'avg_duration', label:text('平均游戏时长','Average playtime',language), definition:'avg_duration', type:'duration', hint:text('活跃玩家人均','Per active player',language) },
    ],
  });
  const metricConfig = (tab,key,language) => metricCatalog(language)[tab].find(item => item.key === key) || metricCatalog(language)[tab][0];
  const selectedMetric = (state,tab = state.tab) => {
    const available = metricCatalog('zh')[tab].map(item => item.key);
    const selected = state.selectedMetricByTab?.[tab];
    return available.includes(selected) ? selected : available[0];
  };
  const metricValue = (tab,key,snapshot) => {
    if (tab === 'conversion') return snapshot.summary[key];
    return ({
      active_players:snapshot.activePlayers,
      new_players:snapshot.newPlayers,
      retention_1d:snapshot.retention1d,
      retention_3d:snapshot.retention3d,
      retention_7d:snapshot.retention7d,
      avg_duration:snapshot.averageMinutes,
    })[key];
  };
  const formatMetricValue = (value,type,language) => {
    if (!Number.isFinite(value)) return '—';
    if (type === 'percent') return formatRate(value);
    if (type === 'duration') return `${Math.round(value)} ${text('分钟','min',language)}`;
    return formatUv(Math.round(value),language);
  };
  const formatMetricDelta = (value,previous,type,language) => {
    if (!Number.isFinite(value) || !Number.isFinite(previous)) return '—';
    const delta = value - previous;
    const prefix = delta > 0 ? '+' : '';
    if (type === 'percent') return `${prefix}${(delta * 100).toFixed(1)} pp`;
    if (type === 'duration') return `${prefix}${Math.round(delta)} ${text('分钟','min',language)}`;
    return `${prefix}${new Intl.NumberFormat(language === 'en' ? 'en-US' : 'zh-CN').format(Math.round(delta))}`;
  };
  const renderMetricCard = (state,tab,config,value,language,extraClass = '') => {
    const active = selectedMetric(state,tab) === config.key;
    return `<article class="publisher-dashboard-metric ${extraClass}${active ? ' is-selected' : ''}" data-dashboard-metric="${config.key}"><div class="publisher-metric-card-head"><button type="button" class="publisher-metric-select" data-dashboard-action="metric-select" data-detail-tab="${tab}" data-detail-metric="${config.key}" aria-pressed="${active}"><span>${config.label}</span></button>${metricHelpButton(state,`card-${config.key}`,config.definition,config.label,language)}</div><strong>${formatMetricValue(value,config.type,language)}</strong><small>${config.hint}</small></article>`;
  };
  const renderConversionSummary = (state,data,language) => {
    const catalog = metricCatalog(language).conversion;
    return `<section class="publisher-dashboard-metric-strip" aria-label="${text('曝光转化核心指标','Exposure and conversion metrics',language)}">${catalog.map(config => renderMetricCard(state,'conversion',config,metricValue('conversion',config.key,data),language)).join('')}</section>`;
  };
  const renderUserMetrics = (state,data,language) => {
    const byKey = Object.fromEntries(metricCatalog(language).users.map(item => [item.key,item]));
    const single = key => renderMetricCard(state,'users',byKey[key],metricValue('users',key,data),language,'publisher-user-metric');
    const retention = ['retention_1d','retention_3d','retention_7d'].map(key => renderMetricCard(state,'users',byKey[key],metricValue('users',key,data),language,'publisher-user-metric publisher-user-retention-unit')).join('');
    return `<section class="publisher-user-metric-strip" aria-label="${text('用户核心指标','User metrics',language)}">${single('active_players')}${single('new_players')}<section class="publisher-user-retention" aria-label="${text('玩家留存','Player retention',language)}">${retention}</section>${single('avg_duration')}</section>`;
  };

  const detailRows = (state,tab,key) => {
    const rows = tab === 'conversion' ? dailyConversionRows(state) : dailyUserRows(state);
    return rows.map((item,index) => ({
      date:item.date,
      value:item[key],
      previous:index ? rows[index - 1][key] : null,
    }));
  };
  const detailNote = (tab,key,language) => {
    if (key.startsWith('retention_')) return text('按首次启动 cohort 日期展示；未观察满对应天数的日期显示“—”。','Shown by first-launch cohort date; immature dates display “—”.',language);
    if (['card_ctr','detail_acquisition'].includes(key)) return text('周期转化率由周期分子 ÷ 周期分母计算，不平均每日百分比。','Period conversion uses period numerator ÷ denominator, rather than averaging daily rates.',language);
    if (key === 'reservation_users') return text('按首次预约成功日归属；取消预约不回溯改写历史新增。','Attributed to first successful reservation date; later cancellations do not rewrite history.',language);
    if (key === 'new_players') return text('按玩家首次成功启动日归属，每日新增可按日汇总。','Attributed to first successful launch date; daily new-player values can be summed.',language);
    if (key === 'avg_duration') return text('当日平均游戏时长＝当日有效会话总时长 ÷ 当日活跃玩家数。','Daily average playtime equals valid session minutes divided by daily active players.',language);
    return text('周期卡片为跨日去重 UV，每日 UV 不可直接相加推导周期卡片值。','The period card is deduplicated across days; daily UV values cannot be summed to reproduce it.',language);
  };
  const detailModel = (state,language = 'zh') => {
    const tab = state.tab === 'users' ? 'users' : 'conversion';
    const key = selectedMetric(state,tab);
    const config = metricConfig(tab,key,language);
    const rows = detailRows(state,tab,key).map(item => ({
      ...item,
      display:formatMetricValue(item.value,config.type,language),
      deltaDisplay:formatMetricDelta(item.value,item.previous,config.type,language),
    }));
    return { tab,key,config,rows,note:detailNote(tab,key,language) };
  };
  const linePath = points => points.map(point => `${point.x},${point.y}`).join(' ');
  const renderDetailChart = (model,language) => {
    const validValues = model.rows.map(item => item.value).filter(Number.isFinite);
    if (!validValues.length) return `<div class="publisher-detail-empty">${text('当前日期范围暂无已成熟数据','No mature data in this date range',language)}</div>`;
    const rawMax = Math.max(...validValues);
    const rawMin = Math.min(...validValues);
    const spread = Math.max(rawMax - rawMin,Math.abs(rawMax) * 0.08,1);
    const max = rawMax + spread * 0.14;
    const min = Math.max(model.config.type === 'percent' ? 0 : 0,rawMin - spread * 0.14);
    const x = index => model.rows.length === 1 ? 500 : 48 + index * 920 / (model.rows.length - 1);
    const y = value => 20 + (max - value) * 210 / Math.max(max - min,0.0001);
    const points = model.rows.map((item,index) => Number.isFinite(item.value) ? { ...item,index,x:x(index),y:y(item.value) } : null).filter(Boolean);
    const dayRegions = model.rows.map((item,index) => {
      const center = x(index);
      const left = index === 0 ? 48 : (x(index - 1) + center) / 2;
      const right = index === model.rows.length - 1 ? 968 : (center + x(index + 1)) / 2;
      const dot = Number.isFinite(item.value)
        ? `<circle cx="${center}" cy="${y(item.value)}" r="4" class="publisher-detail-point-dot"></circle>`
        : '';
      return `<g tabindex="0" role="img" aria-label="${escape(`${item.date} ${model.config.label} ${formatMetricValue(item.value,model.config.type,language)}`)}" data-detail-point data-detail-day-region data-detail-date="${item.date}" data-detail-label="${escape(model.config.label)}" data-detail-display="${escape(formatMetricValue(item.value,model.config.type,language))}"><rect x="${left}" y="20" width="${right - left}" height="210" class="publisher-detail-day-hit" data-detail-day-hit></rect>${dot}</g>`;
    }).join('');
    const labelStep = Math.max(1,Math.ceil((model.rows.length - 1) / 5));
    const labels = model.rows.map((item,index) => (index === 0 || index === model.rows.length - 1 || index % labelStep === 0) ? `<text x="${x(index)}" y="263" text-anchor="middle">${item.date.slice(5)}</text>` : '').join('');
    return `<div class="publisher-detail-chart" aria-label="${escape(`${model.config.label}${text('逐日趋势',' daily trend',language)}`)}"><svg viewBox="0 0 1000 278" role="img"><line x1="48" y1="230" x2="968" y2="230" class="publisher-detail-axis"></line><line x1="48" y1="20" x2="48" y2="230" class="publisher-detail-axis"></line><text x="38" y="25" text-anchor="end">${escape(formatMetricValue(rawMax,model.config.type,language))}</text><text x="38" y="234" text-anchor="end">${escape(formatMetricValue(rawMin,model.config.type,language))}</text><polyline class="publisher-detail-line" points="${linePath(points)}"></polyline>${dayRegions}${labels}</svg><div class="publisher-detail-hover" data-detail-hover-tooltip hidden><strong data-detail-hover-date></strong><span><i></i><em data-detail-hover-label></em><b data-detail-hover-value></b></span></div></div>`;
  };
  const renderDetailTable = (model,language) => `<div class="publisher-detail-table-wrap"><table><thead><tr><th>${text('日期','Date',language)}</th><th>${model.config.label}</th><th>${text('较前一日','vs. previous day',language)}</th></tr></thead><tbody>${model.rows.map(row => `<tr data-detail-row data-detail-date="${row.date}"><td>${row.date}</td><td><strong>${row.display}</strong></td><td>${row.deltaDisplay}</td></tr>`).join('')}</tbody></table></div>`;
  const detailIcon = key => ({
    refresh:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6v5h-5M4 18v-5h5M18.5 9A7 7 0 0 0 6 6.5L4 9m2 6.5A7 7 0 0 0 18 18l2-2.5"/></svg>',
    fullscreen:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5m13 5h5v-5"/></svg>',
    close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    export:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 19h14"/></svg>',
  }[key] || '');
  const renderDetail = (state,language) => {
    const model = detailModel(state,language);
    const view = state.detailView === 'table' ? 'table' : 'chart';
    const full = Boolean(state.detailFullscreen);
    const refreshed = state.detailRefreshedAt
      ? text(`最近刷新 ${state.detailRefreshedAt}`,`Last refreshed ${state.detailRefreshedAt}`,language)
      : text('与页面数据同步','Synced with page data',language);
    return `<section class="publisher-dashboard-card publisher-dashboard-detail${full ? ' is-fullscreen' : ''}${state.detailRefreshing ? ' is-refreshing' : ''}" data-dashboard-detail data-active-metric="${model.key}" data-detail-tab="${model.tab}" data-detail-view="${view}" data-detail-granularity="day" data-detail-fullscreen="${full}" data-detail-refresh-revision="${Number(state.detailRefreshRevision || 0)}"><header class="publisher-detail-head"><div><div class="publisher-detail-eyebrow"><span>${text('按日详情','DAILY DETAIL',language)}</span><b>${text('数据粒度：日','Granularity: day',language)}</b></div><h2>${model.config.label}</h2><small aria-live="polite">${state.detailRefreshing ? text('正在刷新…','Refreshing…',language) : refreshed}</small></div><div class="publisher-detail-tools"><div class="publisher-detail-view-switch" aria-label="${text('展示方式','View mode',language)}"><button type="button" class="${view === 'chart' ? 'is-active' : ''}" data-dashboard-action="detail-view" data-detail-view="chart" aria-pressed="${view === 'chart'}">${text('图表','Chart',language)}</button><button type="button" class="${view === 'table' ? 'is-active' : ''}" data-dashboard-action="detail-view" data-detail-view="table" aria-pressed="${view === 'table'}">${text('表格','Table',language)}</button></div><button type="button" data-dashboard-action="detail-refresh"${state.detailRefreshing ? ' disabled' : ''}>${detailIcon('refresh')}<span>${state.detailRefreshing ? text('刷新中','Refreshing',language) : text('刷新','Refresh',language)}</span></button><button type="button" data-dashboard-action="detail-fullscreen">${detailIcon(full ? 'close' : 'fullscreen')}<span>${full ? text('退出全屏','Exit full screen',language) : text('全屏','Full screen',language)}</span></button><button type="button" data-dashboard-action="detail-export">${detailIcon('export')}<span>${text('导出','Export',language)}</span></button></div></header><div class="publisher-detail-body">${view === 'table' ? renderDetailTable(model,language) : renderDetailChart(model,language)}</div><p class="publisher-detail-note">${model.note}</p></section>`;
  };
  const renderConversion = (state,language) => {
    const data = conversionSnapshot(state);
    return `${renderConversionSummary(state,data,language)}${renderDetail(state,language)}`;
  };
  const renderUsers = (state,language) => {
    const data = userSnapshot(state);
    return `${renderUserMetrics(state,data,language)}${renderDetail(state,language)}`;
  };

  const csvCell = value => {
    const normalized = String(value ?? '');
    return /[",\r\n]/.test(normalized) ? `"${normalized.replaceAll('"','""')}"` : normalized;
  };
  const exportDetailCsv = (state,game,language) => {
    const model = detailModel(state,language);
    const range = effectiveRange(state.filters);
    const c = copy(language);
    const gameName = game?.name || state.filters.game || text('当前游戏','Current game',language);
    const tabLabel = c.tabs[model.tab];
    const filterLines = [
      [text('游戏','Game',language),gameName],
      [text('页签','Tab',language),tabLabel],
      [text('指标','Metric',language),model.config.label],
      [text('时间范围','Date range',language),`${range.startDate} ~ ${range.endDate}`],
      [text('来源位置','Source',language),state.tab === 'conversion' ? state.filters.source : text('不适用','N/A',language)],
      [text('地区','Region',language),state.filters.region],
      [text('平台','Platform',language),'Mac'],
      [],
      [text('日期','Date',language),model.config.label,text('较前一日','vs. previous day',language)],
      ...model.rows.map(row => [row.date,row.display,row.deltaDisplay]),
    ];
    const body = `\uFEFF${filterLines.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
    const blob = new Blob([body],{ type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const clean = value => String(value).replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'').slice(0,48);
    anchor.href = url;
    anchor.download = `${clean(gameName)}-${clean(tabLabel)}-${clean(model.config.label)}-${range.startDate}_${range.endDate}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url),0);
  };

  const render = (stateInput,language = 'zh',options = {}) => {
    const state = stateInput || createState();
    state.filters = { ...defaultFilters, ...(state.filters || {}) };
    state.tab = state.tab === 'users' || state.tab === 'conversion' ? state.tab : 'conversion';
    state.selectedMetricByTab = {
      conversion:selectedMetric({ ...state,selectedMetricByTab:state.selectedMetricByTab || {} },'conversion'),
      users:selectedMetric({ ...state,selectedMetricByTab:state.selectedMetricByTab || {} },'users'),
    };
    state.detailView = state.detailView === 'table' ? 'table' : 'chart';
    state.detailRefreshRevision = Number(state.detailRefreshRevision || 0);
    state.detailFullscreen = Boolean(state.detailFullscreen);
    state.detailRefreshing = Boolean(state.detailRefreshing);
    const c = copy(language);
    const access = options.access || {};
    const game = options.game || null;
    if (game?.name) state.filters.game = game.name;
    if (!access.canViewPublisherData && !access.isPublisherReadOnly) return `<section class="publisher-dashboard-access" data-publisher-page="data" data-testid="publisher-data-dashboard"><span>${namespace.icons?.render('lock') || ''}</span><strong>${text('暂未开通经营数据权限','Analytics access is not available',language)}</strong><p>${text('完成企业认证并获得厂商数据权限后，可查看单游戏曝光转化和用户数据。','Complete company verification and obtain analytics access to view per-game conversion and user data.',language)}</p></section>`;
    const range = effectiveRange(state.filters);
    const body = state.tab === 'users' ? renderUsers(state,language) : renderConversion(state,language);
    return `<section class="publisher-data-dashboard" data-publisher-page="data" data-testid="publisher-data-dashboard" data-dashboard-tab="${state.tab}" data-dashboard-range="${range.startDate}/${range.endDate}"${game ? ` data-dashboard-game="${escape(game.gameKey || game.name)}"` : ''}><header class="publisher-dashboard-head"><h1>${c.title}</h1><small>${c.updated}</small></header><nav class="publisher-dashboard-tabs" aria-label="${c.title}">${Object.entries(c.tabs).map(([value,label]) => `<button type="button" class="${state.tab === value ? 'is-active' : ''}" data-dashboard-action="tab" data-publisher-data-tab="${value}" aria-selected="${state.tab === value}">${label}</button>`).join('')}</nav>${renderFilters(state,language)}<div class="publisher-dashboard-content">${body}</div></section>`;
  };

  let pendingFocusTarget = null;
  const bind = (root,{ state,game,onChange } = {}) => {
    const host = root.querySelector('[data-testid="publisher-data-dashboard"]');
    if (!host || !state) return;
    const interfaceLanguage = host.querySelector('.publisher-dashboard-head h1')?.textContent?.trim() === 'Data dashboard' ? 'en' : 'zh';
    let pointerMetricHelp = '';
    let focusOpenedMetric = '';
    const update = (patch = {},options = {}) => {
      if (document.querySelector('[data-publisher-metric-portal]')) closeMetricTooltips();
      Object.assign(state,patch);
      if (typeof onChange === 'function') onChange(state,options);
    };
    const isVisible = element => Boolean(element && !element.disabled && element.getClientRects().length);
    const visibleMatch = selector => [...host.querySelectorAll(selector)].find(isVisible) || null;
    const metricTrigger = id => [...host.querySelectorAll('[data-metric-help]')].find(element => element.dataset.metricHelp === id) || null;
    const positionMetricTooltip = trigger => {
      if (!trigger) return;
      const tooltip = document.getElementById(trigger.getAttribute('aria-describedby') || '');
      if (!tooltip) return;
      tooltip.classList.add('is-floating');
      const width = Math.min(252,window.innerWidth - 24);
      tooltip.style.width = `${width}px`;
      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const left = Math.max(12,Math.min(triggerRect.left,window.innerWidth - width - 12));
      const top = triggerRect.top - tooltipRect.height - 8 >= 12
        ? triggerRect.top - tooltipRect.height - 8
        : Math.min(window.innerHeight - tooltipRect.height - 12,triggerRect.bottom + 8);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${Math.max(12,top)}px`;
      tooltip.style.bottom = 'auto';
    };
    const closeMetricTooltips = () => {
      document.querySelectorAll('[data-publisher-metric-portal]').forEach(tooltip => {
        const trigger = host.querySelector(`[aria-describedby="${tooltip.id}"]`);
        if (trigger?.parentElement) trigger.parentElement.appendChild(tooltip);
        else tooltip.remove();
        tooltip.removeAttribute('data-publisher-metric-portal');
      });
      host.querySelectorAll('[data-metric-help]').forEach(trigger => trigger.setAttribute('aria-expanded','false'));
      host.querySelectorAll('.publisher-metric-tooltip').forEach(tooltip => {
        tooltip.classList.remove('is-open','is-floating');
        tooltip.removeAttribute('style');
      });
      state.activeTooltip = '';
      focusOpenedMetric = '';
    };
    const openMetricTooltip = trigger => {
      if (!trigger) return;
      closeMetricTooltips();
      const tooltip = document.getElementById(trigger.getAttribute('aria-describedby') || '');
      if (!tooltip) return;
      state.activeTooltip = trigger.dataset.metricHelp || '';
      trigger.setAttribute('aria-expanded','true');
      tooltip.classList.add('is-open');
      tooltip.setAttribute('data-publisher-metric-portal','true');
      document.body.appendChild(tooltip);
      positionMetricTooltip(trigger);
    };
    const hideDetailHover = chart => {
      const tooltip = chart?.querySelector('[data-detail-hover-tooltip]');
      if (!tooltip) return;
      tooltip.hidden = true;
      tooltip.removeAttribute('style');
    };
    const showDetailHover = point => {
      const chart = point?.closest('.publisher-detail-chart');
      const tooltip = chart?.querySelector('[data-detail-hover-tooltip]');
      const hit = point?.querySelector('[data-detail-day-hit]') || point;
      const dot = point?.querySelector('.publisher-detail-point-dot');
      if (!chart || !tooltip || !hit) return;
      tooltip.querySelector('[data-detail-hover-date]').textContent = point.dataset.detailDate || '';
      tooltip.querySelector('[data-detail-hover-label]').textContent = point.dataset.detailLabel || '';
      tooltip.querySelector('[data-detail-hover-value]').textContent = point.dataset.detailDisplay || '—';
      tooltip.hidden = false;
      const chartRect = chart.getBoundingClientRect();
      const hitRect = hit.getBoundingClientRect();
      const anchorRect = dot?.getBoundingClientRect() || hitRect;
      const width = tooltip.offsetWidth;
      const height = tooltip.offsetHeight;
      const center = hitRect.left - chartRect.left + hitRect.width / 2 + chart.scrollLeft;
      const left = Math.max(8,Math.min(center - width / 2,chart.scrollWidth - width - 8));
      const above = anchorRect.top - chartRect.top - height - 12;
      const top = dot ? (above >= 8 ? above : anchorRect.bottom - chartRect.top + 10) : 10;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };
    const requestFocus = target => { pendingFocusTarget = target; };
    const focusAfterRender = () => {
      const target = pendingFocusTarget;
      pendingFocusTarget = null;
      let element = null;
      if (target?.kind === 'date-trigger') element = visibleMatch('[data-dashboard-action="date-open"]');
      else if (target?.kind === 'date-dialog') element = visibleMatch('[data-dashboard-date-dialog] button:not([disabled])') || host.querySelector('[data-dashboard-date-dialog]');
      else if (target?.kind === 'date-action') element = visibleMatch(`[data-dashboard-action="${target.action}"]`);
      else if (target?.kind === 'calendar-day') element = visibleMatch(`[data-calendar-date="${target.date}"]:not([disabled])`);
      else if (target?.kind === 'metric-help') element = metricTrigger(target.id);
      else if (target?.kind === 'detail-fullscreen') element = visibleMatch('[data-dashboard-action="detail-fullscreen"]');
      if (!element && state.datePickerOpen) element = visibleMatch('[data-dashboard-date-dialog] button:not([disabled])') || host.querySelector('[data-dashboard-date-dialog]');
      if (!element && state.activeTooltip) element = metricTrigger(state.activeTooltip);
      if (!element) return;
      element.focus({ preventScroll:true });
      if (element.matches('[data-metric-help]')) positionMetricTooltip(element);
    };
    host.querySelectorAll('[data-dashboard-filter]').forEach(control => control.addEventListener('change',() => {
      state.filters = { ...defaultFilters, ...(state.filters || {}), [control.dataset.dashboardFilter]:control.value };
      update({ activeTooltip:'' },{ preserveScroll:true });
    }));
    host.addEventListener('pointerdown',event => {
      pointerMetricHelp = event.target.closest('[data-metric-help]')?.dataset.metricHelp || '';
    });
    host.addEventListener('pointerup',() => { pointerMetricHelp = ''; });
    host.addEventListener('pointerover',event => {
      const point = event.target.closest('[data-detail-point]');
      if (point) showDetailHover(point);
      const trigger = event.target.closest('[data-metric-help]');
      if (trigger) openMetricTooltip(trigger);
    });
    host.addEventListener('pointerout',event => {
      const point = event.target.closest('[data-detail-point]');
      if (point && !point.contains(event.relatedTarget)) hideDetailHover(point.closest('.publisher-detail-chart'));
      const trigger = event.target.closest('[data-metric-help]');
      if (trigger && !trigger.contains(event.relatedTarget) && document.activeElement !== trigger) closeMetricTooltips();
    });
    host.addEventListener('pointermove',event => {
      const point = event.target.closest('[data-detail-point]');
      host.querySelectorAll('.publisher-detail-chart').forEach(chart => {
        if (!point || point.closest('.publisher-detail-chart') !== chart) hideDetailHover(chart);
      });
    });
    host.addEventListener('pointerleave',() => {
      host.querySelectorAll('.publisher-detail-chart').forEach(hideDetailHover);
    });
    host.querySelectorAll('.publisher-detail-chart').forEach(chart => {
      chart.addEventListener('pointerleave',() => hideDetailHover(chart));
    });
    host.addEventListener('focusin',event => {
      const field = event.target.closest('.publisher-dashboard-filter-scroll .publisher-dashboard-field');
      if (field) field.scrollIntoView({ block:'nearest',inline:'nearest' });
      const trigger = event.target.closest('[data-metric-help]');
      if (trigger && pointerMetricHelp !== trigger.dataset.metricHelp && state.activeTooltip !== trigger.dataset.metricHelp) {
        openMetricTooltip(trigger);
        focusOpenedMetric = trigger.dataset.metricHelp || '';
      }
      const point = event.target.closest('[data-detail-point]');
      if (point) showDetailHover(point);
    });
    host.addEventListener('focusout',event => {
      const point = event.target.closest('[data-detail-point]');
      if (point && !point.contains(event.relatedTarget)) hideDetailHover(point.closest('.publisher-detail-chart'));
      const trigger = event.target.closest('[data-metric-help]');
      if (!trigger) return;
      queueMicrotask(() => {
        if (document.activeElement !== trigger && state.activeTooltip === trigger.dataset.metricHelp) closeMetricTooltips();
      });
    });
    host.addEventListener('click',event => {
      const control = event.target.closest('[data-dashboard-action]');
      if (!control) {
        const card = event.target.closest('[data-dashboard-metric]');
        if (!card) return;
        const tab = state.tab === 'users' ? 'users' : 'conversion';
        update({ selectedMetricByTab:{ ...(state.selectedMetricByTab || {}),[tab]:card.dataset.dashboardMetric },activeTooltip:'' },{ preserveScroll:true });
        return;
      }
      const action = control.dataset.dashboardAction;
      if (action === 'date-cancel' && control.matches('.publisher-dashboard-date-backdrop') && event.target.closest('[data-dashboard-stop]')) return;
      if (action === 'tab') update({ tab:control.dataset.publisherDataTab === 'users' ? 'users' : 'conversion',datePickerOpen:false,activeTooltip:'',detailFullscreen:false });
      else if (action === 'reset') update({ filters:{ ...defaultFilters,game:game?.name || 'all' },datePickerOpen:false,draftDateRange:{ ...presetRanges['30d'] },calendarLeftMonth:'2026-08',activeTooltip:'' },{ preserveScroll:true });
      else if (action === 'metric-select') {
        const tab = control.dataset.detailTab === 'users' ? 'users' : 'conversion';
        const key = control.dataset.detailMetric || metricCatalog('zh')[tab][0].key;
        update({ selectedMetricByTab:{ ...(state.selectedMetricByTab || {}),[tab]:key },activeTooltip:'' },{ preserveScroll:true });
      }
      else if (action === 'detail-view') update({ detailView:control.dataset.detailView === 'table' ? 'table' : 'chart',activeTooltip:'' },{ preserveScroll:true });
      else if (action === 'detail-refresh') {
        const now = new Date();
        const formatted = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
        update({ detailRefreshing:true,detailRefreshRevision:Number(state.detailRefreshRevision || 0) + 1,activeTooltip:'' },{ preserveScroll:true });
        setTimeout(() => update({ detailRefreshing:false,detailRefreshedAt:formatted },{ preserveScroll:true }),420);
      }
      else if (action === 'detail-fullscreen') {
        requestFocus({ kind:'detail-fullscreen' });
        update({ detailFullscreen:!state.detailFullscreen,activeTooltip:'' },{ preserveScroll:true });
      }
      else if (action === 'detail-export') exportDetailCsv(state,game,interfaceLanguage);
      else if (action === 'metric-help') {
        openMetricTooltip(control);
        focusOpenedMetric = '';
        control.focus({ preventScroll:true });
      }
      else if (action === 'date-open') {
        const range = effectiveRange(state.filters);
        const rect = control.getBoundingClientRect();
        const panelWidth = Math.min(760,window.innerWidth - 48);
        const left = Math.max(12,Math.min(rect.left,window.innerWidth - panelWidth - 12));
        requestFocus({ kind:'date-dialog' });
        update({ datePickerOpen:true,draftDateRange:{ ...range },calendarLeftMonth:calendarStartMonth(range),calendarSelectingEnd:false,dateAnchor:{ left,top:rect.bottom + 6 },activeTooltip:'' },{ preserveScroll:true });
      } else if (action === 'date-cancel') {
        requestFocus({ kind:'date-trigger' });
        update({ datePickerOpen:false,draftDateRange:{ ...effectiveRange(state.filters) },calendarSelectingEnd:false },{ preserveScroll:true });
      }
      else if (action === 'date-shortcut') {
        const key = control.dataset.dashboardRangePreset;
        if (presetRanges[key]) {
          requestFocus({ kind:'date-trigger' });
          update({ filters:{ ...state.filters,range:key,...presetRanges[key] },datePickerOpen:false,draftDateRange:{ ...presetRanges[key] },calendarLeftMonth:calendarStartMonth(presetRanges[key]),calendarSelectingEnd:false },{ preserveScroll:true });
        }
      } else if (action === 'calendar-prev') {
        requestFocus({ kind:'date-action',action:'calendar-prev' });
        update({ calendarLeftMonth:addMonth(state.calendarLeftMonth || '2026-08',-1) },{ preserveScroll:true });
      }
      else if (action === 'calendar-next') {
        requestFocus({ kind:'date-action',action:'calendar-next' });
        update({ calendarLeftMonth:addMonth(state.calendarLeftMonth || '2026-08',1) },{ preserveScroll:true });
      }
      else if (action === 'calendar-day') {
        const selected = control.dataset.calendarDate;
        const draft = state.draftDateRange || effectiveRange(state.filters);
        requestFocus({ kind:'calendar-day',date:selected });
        if (!state.calendarSelectingEnd) update({ draftDateRange:{ startDate:selected,endDate:selected },calendarSelectingEnd:true },{ preserveScroll:true });
        else update({ draftDateRange:selected < draft.startDate ? { startDate:selected,endDate:draft.startDate } : { startDate:draft.startDate,endDate:selected },calendarSelectingEnd:false },{ preserveScroll:true });
      } else if (action === 'date-apply') {
        const draft = state.draftDateRange || {};
        if (!validateDateRange(draft)) {
          requestFocus({ kind:'date-trigger' });
          update({ filters:{ ...state.filters,range:'custom',startDate:draft.startDate,endDate:draft.endDate },datePickerOpen:false,calendarSelectingEnd:false },{ preserveScroll:true });
        }
      }
    });
    host.addEventListener('keydown',event => {
      if (event.key === 'Escape' && state.detailFullscreen) {
        event.preventDefault();
        event.stopPropagation();
        update({ detailFullscreen:false },{ preserveScroll:true });
        return;
      }
      if (event.key === 'Tab' && state.datePickerOpen) {
        const dialog = host.querySelector('[data-dashboard-date-dialog]');
        const focusable = dialog ? [...dialog.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(isVisible) : [];
        if (!focusable.length) return;
        const index = focusable.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) {
          event.preventDefault();
          focusable[focusable.length - 1].focus({ preventScroll:true });
        } else if (!event.shiftKey && (index < 0 || index === focusable.length - 1)) {
          event.preventDefault();
          focusable[0].focus({ preventScroll:true });
        }
        return;
      }
      if (event.key !== 'Escape') return;
      if (state.datePickerOpen) {
        event.preventDefault();
        event.stopPropagation();
        requestFocus({ kind:'date-trigger' });
        update({ datePickerOpen:false,draftDateRange:{ ...effectiveRange(state.filters) },calendarSelectingEnd:false },{ preserveScroll:true });
      } else if (state.activeTooltip) {
        event.preventDefault();
        event.stopPropagation();
        const trigger = metricTrigger(state.activeTooltip);
        closeMetricTooltips();
        trigger?.focus({ preventScroll:true });
      }
    });
    queueMicrotask(focusAfterRender);
  };

  window.PublisherDataDashboard = {
    createState,render,bind,filteredOrders,metrics,conversionSnapshot,userSnapshot,validateDateRange,deriveTransactionResult,
    enumerateDates,dailyConversionRows,dailyUserRows,detailModel,
    orders:() => clone(orders),statements:() => clone(statements),payments:() => clone(payments),
    snapshot:stateInput => {
      const state = createState(stateInput || {});
      const rows = filteredOrders(state);
      return { tab:state.tab,filters:{ ...defaultFilters,...(state.filters || {}) },statuses:[...new Set(rows.map(deriveTransactionResult))],metrics:metrics(rows),conversion:conversionSnapshot(state),users:userSnapshot(state) };
    },
  };
  namespace.publisherDataDashboard = window.PublisherDataDashboard;
})(window.GameHubDeveloperPortal);

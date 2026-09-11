window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};

(function registerPublisherDataDashboard(namespace) {
  const clone = value => JSON.parse(JSON.stringify(value));
  const settlementCurrency = 'USD';
  const currencyDigits = Object.freeze({ USD:2, EUR:2, GBP:2, CAD:2, CNY:2, JPY:0, KRW:0 });
  const defaultFilters = Object.freeze({ range: '30d', game: 'all', product: 'all', fulfillment: 'all', region: 'all', platform: 'all', status: 'all', keyword: '' });
  const statusOrder = ['completed', 'free', 'refund_pending', 'refunded', 'chargeback_open', 'chargeback_won', 'chargeback_lost', 'closed'];
  const orders = Object.freeze([
    { id:'RCN-202609-A8F2K7', orderMask:'ORD-****-1842', date:'2026-09-10 18:42', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-BASE-001', product:'星海远征', productEn:'Stellar Voyage', productType:'base', fulfillment:'account_entitlement', region:'global', country:'日本', countryEn:'Japan', platform:'Mac', channel:'第三方支付', channelEn:'Third-party payment', currency:'JPY', amountMinor:1980, settlementCurrency, convertedMinor:1320, fxRateText:'JPY/USD · FX-20260910-01', refundConvertedMinor:0, chargebackRiskMinor:0, chargebackLossMinor:0, taxMinor:53, channelFeeMinor:40, platformShareMinor:198, adjustmentMinor:0, settlementMinor:1029, statementId:'STMT-2026-06-V1', statementStatus:'locked', paymentStatus:'awaiting_invoice', status:'completed', delivered:true, delivery:'账号权益已生效', deliveryEn:'Account entitlement active' },
    { id:'RCN-202609-C4N8M2', orderMask:'ORD-****-1826', date:'2026-09-10 16:26', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-DLC-101', product:'深空回声 DLC', productEn:'Deep Space Echoes DLC', productType:'dlc', fulfillment:'cdkey', region:'global', country:'美国', countryEn:'United States', platform:'Android', channel:'Google Play Billing', channelEn:'Google Play Billing', currency:'USD', amountMinor:599, settlementCurrency, convertedMinor:599, fxRateText:'USD/USD · FX-20260910-01', refundConvertedMinor:0, chargebackRiskMinor:0, chargebackLossMinor:0, taxMinor:24, channelFeeMinor:18, platformShareMinor:90, adjustmentMinor:0, settlementMinor:467, statementId:'STMT-2026-06-V1', statementStatus:'locked', paymentStatus:'awaiting_invoice', status:'completed', delivered:true, delivery:'CDKEY 已交付', deliveryEn:'CDKEY delivered' },
    { id:'RCN-202609-H7Q3P5', orderMask:'ORD-****-1798', date:'2026-09-10 14:08', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-BASE-001', product:'星海远征', productEn:'Stellar Voyage', productType:'base', fulfillment:'account_entitlement', region:'global', country:'德国', countryEn:'Germany', platform:'Android', channel:'0 元订单', channelEn:'Zero-price order', currency:'EUR', amountMinor:0, settlementCurrency, convertedMinor:0, fxRateText:'EUR/USD · FX-20260910-01', refundConvertedMinor:0, chargebackRiskMinor:0, chargebackLossMinor:0, taxMinor:0, channelFeeMinor:0, platformShareMinor:0, adjustmentMinor:0, settlementMinor:0, statementId:'', statementStatus:'none', paymentStatus:'none', status:'free', delivered:true, delivery:'账号权益已生效', deliveryEn:'Account entitlement active' },
    { id:'RCN-202609-Q8F4D1', orderMask:'ORD-****-1715', date:'2026-09-09 21:15', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-DLC-205', product:'曙光舰队 DLC', productEn:'Dawn Fleet DLC', productType:'dlc', fulfillment:'account_entitlement', region:'global', country:'英国', countryEn:'United Kingdom', platform:'Android', channel:'第三方支付', channelEn:'Third-party payment', currency:'GBP', amountMinor:999, settlementCurrency, convertedMinor:1340, fxRateText:'GBP/USD · FX-20260910-01', refundConvertedMinor:0, chargebackRiskMinor:0, chargebackLossMinor:0, taxMinor:54, channelFeeMinor:40, platformShareMinor:201, adjustmentMinor:0, settlementMinor:1045, statementId:'STMT-2026-08-V1', statementStatus:'pending', paymentStatus:'not_ready', status:'refund_pending', delivered:true, delivery:'账号权益已撤销，退款处理中', deliveryEn:'Entitlement revoked; refund processing' },
    { id:'RCN-202609-L5V9R4', orderMask:'ORD-****-1644', date:'2026-09-09 10:44', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-BASE-001', product:'星海远征', productEn:'Stellar Voyage', productType:'base', fulfillment:'cdkey', region:'domestic', country:'中国大陆', countryEn:'Mainland China', platform:'Android', channel:'第三方支付', channelEn:'Third-party payment', currency:'CNY', amountMinor:12800, settlementCurrency, convertedMinor:1770, fxRateText:'CNY/USD · FX-20260910-01', refundConvertedMinor:1770, chargebackRiskMinor:0, chargebackLossMinor:0, taxMinor:0, channelFeeMinor:0, platformShareMinor:0, adjustmentMinor:0, settlementMinor:0, statementId:'STMT-2026-06-V1', statementStatus:'locked', paymentStatus:'awaiting_invoice', status:'refunded', delivered:true, delivery:'CDKEY 已交付，退款成功', deliveryEn:'CDKEY delivered; refund completed' },
    { id:'RCN-202609-T2D6X8', orderMask:'ORD-****-1603', date:'2026-09-08 19:03', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-DLC-101', product:'深空回声 DLC', productEn:'Deep Space Echoes DLC', productType:'dlc', fulfillment:'cdkey', region:'global', country:'加拿大', countryEn:'Canada', platform:'Mac', channel:'第三方支付', channelEn:'Third-party payment', currency:'CAD', amountMinor:549, settlementCurrency, convertedMinor:400, fxRateText:'CAD/USD · FX-20260910-01', refundConvertedMinor:0, chargebackRiskMinor:400, chargebackLossMinor:0, taxMinor:16, channelFeeMinor:12, platformShareMinor:60, adjustmentMinor:0, settlementMinor:312, statementId:'STMT-2026-06-V1', statementStatus:'locked', paymentStatus:'awaiting_invoice', status:'chargeback_open', delivered:true, delivery:'CDKEY 已交付', deliveryEn:'CDKEY delivered' },
    { id:'RCN-202609-V3J7S9', orderMask:'ORD-****-1586', date:'2026-09-08 12:16', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-BASE-001', product:'星海远征', productEn:'Stellar Voyage', productType:'base', fulfillment:'account_entitlement', region:'global', country:'法国', countryEn:'France', platform:'Mac', channel:'第三方支付', channelEn:'Third-party payment', currency:'EUR', amountMinor:1299, settlementCurrency, convertedMinor:1520, fxRateText:'EUR/USD · FX-20260910-01', refundConvertedMinor:0, chargebackRiskMinor:0, chargebackLossMinor:0, taxMinor:61, channelFeeMinor:46, platformShareMinor:228, adjustmentMinor:85, settlementMinor:1270, statementId:'STMT-2026-08-V1', statementStatus:'pending', paymentStatus:'not_ready', status:'chargeback_won', delivered:true, delivery:'账号权益保持有效', deliveryEn:'Account entitlement remains active', userListDeleted:true },
    { id:'RCN-202609-W9B4J3', orderMask:'ORD-****-1522', date:'2026-09-07 15:22', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-DLC-101', product:'深空回声 DLC', productEn:'Deep Space Echoes DLC', productType:'dlc', fulfillment:'account_entitlement', region:'global', country:'新加坡', countryEn:'Singapore', platform:'Android', channel:'Google Play Billing', channelEn:'Google Play Billing', currency:'USD', amountMinor:599, settlementCurrency, convertedMinor:599, fxRateText:'USD/USD · FX-20260910-01', refundConvertedMinor:0, chargebackRiskMinor:0, chargebackLossMinor:599, taxMinor:0, channelFeeMinor:0, platformShareMinor:0, adjustmentMinor:0, settlementMinor:0, statementId:'STMT-2026-06-V1', statementStatus:'locked', paymentStatus:'awaiting_invoice', status:'chargeback_lost', delivered:true, delivery:'账号权益已撤销', deliveryEn:'Account entitlement revoked' },
    { id:'RCN-202609-Z6K1E4', orderMask:'ORD-****-1488', date:'2026-09-06 20:48', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-DLC-205', product:'曙光舰队 DLC', productEn:'Dawn Fleet DLC', productType:'dlc', fulfillment:'account_entitlement', region:'global', country:'韩国', countryEn:'South Korea', platform:'Mac', channel:'第三方支付', channelEn:'Third-party payment', currency:'KRW', amountMinor:9900, settlementCurrency, convertedMinor:710, fxRateText:'KRW/USD · FX-20260910-01', refundConvertedMinor:0, chargebackRiskMinor:0, chargebackLossMinor:0, taxMinor:0, channelFeeMinor:0, platformShareMinor:0, adjustmentMinor:0, settlementMinor:0, statementId:'', statementStatus:'none', paymentStatus:'none', status:'closed', delivered:false, delivery:'未完成支付，订单已关闭', deliveryEn:'Payment not completed; order closed' },
    { id:'RCN-202608-M6K2S7', orderMask:'ORD-****-9421', date:'2026-08-05 11:27', game:'星海远征', gameEn:'Stellar Voyage', sku:'SKU-BASE-001', product:'星海远征', productEn:'Stellar Voyage', productType:'base', fulfillment:'cdkey', region:'global', country:'澳大利亚', countryEn:'Australia', platform:'Mac', channel:'第三方支付', channelEn:'Third-party payment', currency:'USD', amountMinor:1299, settlementCurrency, convertedMinor:1299, fxRateText:'USD/USD · FX-20260805-01', refundConvertedMinor:0, chargebackRiskMinor:0, chargebackLossMinor:0, taxMinor:52, channelFeeMinor:39, platformShareMinor:195, adjustmentMinor:0, settlementMinor:1013, statementId:'STMT-2026-05-V1', statementStatus:'locked', paymentStatus:'completed', status:'completed', delivered:true, delivery:'CDKEY 已交付', deliveryEn:'CDKEY delivered' },
  ]);
  const statements = Object.freeze([
    { id:'STMT-2026-06-V1', period:'2026-06', currency:'USD', amountMinor:1548260, outstandingMinor:1548260, status:'locked', paymentStatus:'awaiting_invoice', updatedAt:'2026-09-10 09:30' },
    { id:'STMT-2026-05-V1', period:'2026-05', currency:'USD', amountMinor:1384090, outstandingMinor:0, status:'locked', paymentStatus:'completed', updatedAt:'2026-06-28 16:20' },
  ]);

  const copy = (language = 'zh') => {
    const en = language === 'en';
    return {
      title: en ? 'Data dashboard' : '数据看板', eyebrow: en ? 'PUBLISHING ANALYTICS' : '发行经营数据',
      description: en ? 'Review buyout game and permanent DLC sales, risk and settlement estimates.' : '查看买断游戏与永久 DLC 的销量、逆向交易、预估收入和待结算数据。',
      readonly: en ? 'Read-only analytics' : '只读经营数据', updated: en ? 'Updated to Sep 10, 2026 23:59' : '数据更新至 2026-09-10 23:59',
      tabs: { overview:en ? 'Overview' : '经营概览', orders:en ? 'Order details' : '订单明细', revenue:en ? 'Revenue & settlement' : '收入与结算' },
      game: en ? 'Game' : '游戏', product: en ? 'Product type' : '商品类型', fulfillment: en ? 'Fulfillment' : '履约方式', region: en ? 'Region' : '地区', platform: en ? 'Platform' : '平台', status: en ? 'Status' : '订单状态', range: en ? 'Time' : '时间', keyword: en ? 'Order ID' : '订单编号',
      all: en ? 'All' : '全部', base: en ? 'Base game' : '游戏本体', dlc: en ? 'Permanent DLC' : '永久 DLC', direct: en ? 'Direct purchase' : '直接购买', cdkey:'CDKEY', global: en ? 'Global (excl. Mainland China)' : '全球（不含中国大陆）', domestic: en ? 'Mainland China' : '中国大陆',
      reset: en ? 'Reset' : '重置', scope: en ? 'Metric definitions' : '数据口径', searchPlaceholder: en ? 'Search reconciliation or masked order ID' : '搜索对账流水号或脱敏订单号',
      noData: en ? 'No data for the current filters' : '当前筛选条件下暂无数据', noDataHint: en ? 'Reset filters to view available records.' : '可重置筛选条件查看已有记录。',
    };
  };
  const text = (zh, en, language) => language === 'en' ? en : zh;
  const money = (minor, currency = settlementCurrency) => {
    const digits = currencyDigits[currency] ?? 2;
    return new Intl.NumberFormat('zh-CN', { style:'currency', currency, minimumFractionDigits:digits, maximumFractionDigits:digits }).format(Number(minor || 0) / (10 ** digits));
  };
  const createState = seed => ({ tab:'overview', filters:{ ...defaultFilters }, selectedOrder:'', scopeOpen:false, scenario:'ready', ...(seed && typeof seed === 'object' ? clone(seed) : {}), filters:{ ...defaultFilters, ...(seed?.filters || {}) } });
  const rangeStart = range => ({ '7d':'2026-09-05', '30d':'2026-08-13', '90d':'2026-06-13', month:'2026-09-01' }[range] || '2026-08-13');
  const filteredOrders = state => {
    const filters = { ...defaultFilters, ...(state?.filters || {}) };
    const keyword = String(filters.keyword || '').trim().toLowerCase();
    return orders.filter(item => item.date.slice(0, 10) >= rangeStart(filters.range)
      && (filters.game === 'all' || item.game === filters.game)
      && (filters.product === 'all' || item.productType === filters.product)
      && (filters.fulfillment === 'all' || item.fulfillment === filters.fulfillment)
      && (filters.region === 'all' || item.region === filters.region)
      && (filters.platform === 'all' || item.platform === filters.platform)
      && (filters.status === 'all' || item.status === filters.status)
      && (!keyword || `${item.id} ${item.orderMask}`.toLowerCase().includes(keyword)));
  };
  const metrics = rows => {
    const paidRows = rows.filter(item => item.delivered && item.amountMinor > 0);
    const freeRows = rows.filter(item => item.delivered && item.amountMinor === 0);
    const refundedRows = paidRows.filter(item => item.status === 'refunded');
    const lostRows = paidRows.filter(item => item.status === 'chargeback_lost' && item.status !== 'refunded');
    const grossMinor = paidRows.reduce((sum, item) => sum + item.convertedMinor, 0);
    const refundMinor = rows.reduce((sum, item) => sum + item.refundConvertedMinor, 0);
    const chargebackRiskMinor = rows.reduce((sum, item) => sum + item.chargebackRiskMinor, 0);
    const chargebackLossMinor = rows.reduce((sum, item) => sum + item.chargebackLossMinor, 0);
    const taxMinor = rows.reduce((sum, item) => sum + item.taxMinor, 0);
    const channelFeeMinor = rows.reduce((sum, item) => sum + item.channelFeeMinor, 0);
    const platformShareMinor = rows.reduce((sum, item) => sum + item.platformShareMinor, 0);
    const adjustmentMinor = rows.reduce((sum, item) => sum + item.adjustmentMinor, 0);
    const estimatedMinor = grossMinor - refundMinor - chargebackLossMinor - taxMinor - channelFeeMinor - platformShareMinor + adjustmentMinor;
    const pendingByCurrency = statements.filter(item => item.status === 'locked' && !['completed','cancelled','carried'].includes(item.paymentStatus)).reduce((result, item) => ({ ...result, [item.currency]:(result[item.currency] || 0) + item.outstandingMinor }), {});
    return { paid:paidRows.length, free:freeRows.length, refundCount:refundedRows.length, refundMinor, chargebackOpen:rows.filter(item => item.status === 'chargeback_open').length, chargebackRiskMinor, chargebackLost:lostRows.length, chargebackLossMinor, netSales:paidRows.length - refundedRows.length - lostRows.length, grossMinor, taxMinor, channelFeeMinor, platformShareMinor, adjustmentMinor, estimatedMinor, settlementCurrency, fxVersion:'FX-20260910-01', pendingByCurrency };
  };
  const pendingText = metric => Object.entries(metric.pendingByCurrency).map(([currency, minor]) => money(minor,currency)).join(' / ') || '--';
  const statusMeta = (status, language = 'zh') => {
    const labels = {
      completed:[text('交易完成','Completed',language),'success'], free:[text('免费领取','Free claim',language),'info'], refund_pending:[text('退款处理中','Refund processing',language),'warning'], refunded:[text('已退款','Refunded',language),'warning'], chargeback_open:[text('拒付待裁决','Chargeback open',language),'danger'], chargeback_won:[text('拒付胜诉','Chargeback won',language),'success'], chargeback_lost:[text('拒付败诉','Chargeback lost',language),'danger'], closed:[text('已关闭','Closed',language),'info'],
    };
    return labels[status] || [status,'info'];
  };
  const tag = (label, tone = 'info') => `<span class="publisher-dashboard-tag is-${tone}">${label}</span>`;
  const empty = language => `<div class="publisher-dashboard-empty" data-testid="publisher-dashboard-empty"><span>∅</span><strong>${copy(language).noData}</strong><p>${copy(language).noDataHint}</p></div>`;
  const option = (value, label, selected) => `<option value="${value}"${selected === value ? ' selected' : ''}>${label}</option>`;
  const filterSelect = (key, label, choices, state, language) => `<label class="publisher-dashboard-field"><span>${label}</span><select data-dashboard-filter="${key}">${choices.map(([value, name]) => option(value, name, state.filters[key])).join('')}</select></label>`;
  const metricCard = (label, value, hint, key) => `<article class="publisher-dashboard-metric" data-dashboard-metric="${key}"><span>${label}</span><strong>${value}</strong><small>${hint}</small></article>`;

  const renderFilters = (state, language, options = {}) => {
    const c = copy(language);
    const en = language === 'en';
    const all = c.all;
    const statusOptions = [['all',all], ...statusOrder.map(value => [value, statusMeta(value, language)[0]])];
    return `<section class="publisher-dashboard-filters" aria-label="${text('数据筛选','Data filters',language)}"><div class="publisher-dashboard-filter-grid">
      ${filterSelect('range',c.range,[['7d',text('近 7 天','Last 7 days',language)],['30d',text('近 30 天','Last 30 days',language)],['90d',text('近 90 天','Last 90 days',language)],['month',text('本月','This month',language)]],state,language)}
      ${options.game ? '' : filterSelect('game',c.game,[['all',all],['星海远征',en ? 'Stellar Voyage' : '星海远征'],['像素边境',en ? 'Pixel Frontier' : '像素边境']],state,language)}
      ${filterSelect('product',c.product,[['all',all],['base',c.base],['dlc',c.dlc]],state,language)}
      ${filterSelect('fulfillment',c.fulfillment,[['all',all],['account_entitlement',c.direct],['cdkey','CDKEY']],state,language)}
      ${filterSelect('region',c.region,[['all',all],['global',c.global],['domestic',c.domestic]],state,language)}
      ${filterSelect('platform',c.platform,[['all',all],['Android','Android'],['Mac','Mac']],state,language)}
      ${filterSelect('status',c.status,statusOptions,state,language)}
      ${state.tab === 'orders' ? `<label class="publisher-dashboard-field publisher-dashboard-field--keyword"><span>${c.keyword}</span><input type="search" value="${namespace.components.escapeHtml(state.filters.keyword || '')}" placeholder="${c.searchPlaceholder}" data-dashboard-filter="keyword"></label>` : ''}
    </div><div class="publisher-dashboard-filter-actions"><span>${text('经营指标与订单使用同一快照；待结算来自财务账单','Analytics and orders share one snapshot; pending settlement comes from finance',language)}</span><button type="button" data-dashboard-action="reset">${c.reset}</button></div></section>`;
  };

  const renderOverview = (state, language) => {
    const rows = filteredOrders(state);
    const m = metrics(rows);
    const days = ['09-04','09-05','09-06','09-07','09-08','09-09','09-10'];
    const daily = days.map(day => rows.filter(item => item.date.includes(day)).length);
    const max = Math.max(...daily, 1);
    const baseCount = rows.filter(item => item.productType === 'base').length;
    const dlcCount = rows.filter(item => item.productType === 'dlc').length;
    const directCount = rows.filter(item => item.fulfillment === 'account_entitlement').length;
    const cdkeyCount = rows.filter(item => item.fulfillment === 'cdkey').length;
    return `<div class="publisher-dashboard-metrics">
      ${metricCard(text('付费销量','Paid sales',language),`${m.paid}`,text(`净销量 ${m.netSales}`,`Net sales ${m.netSales}`,language),'paid')}
      ${metricCard(text('免费领取','Free claims',language),`${m.free}`,text('履约完成的 0 元订单','Fulfilled zero-price orders',language),'free')}
      ${metricCard(text('退款成功','Refunded',language),`${m.refundCount}`,money(m.refundMinor,m.settlementCurrency),'refund')}
      ${metricCard(text('拒付风险','Chargeback risk',language),`${m.chargebackOpen}`,text(`${money(m.chargebackRiskMinor,m.settlementCurrency)} 待裁决`,`${money(m.chargebackRiskMinor,m.settlementCurrency)} pending`,language),'chargeback')}
      ${metricCard(text('预估收入','Estimated revenue',language),money(m.estimatedMinor,m.settlementCurrency),text(`结算币种 · ${m.fxVersion}`,`Settlement currency · ${m.fxVersion}`,language),'estimated')}
      ${metricCard(text('待结算','Pending settlement',language),pendingText(m),text('当前厂商账单，不按单游戏分摊','Company statement; not allocated to one game',language),'pending')}
    </div><div class="publisher-dashboard-overview-grid"><section class="publisher-dashboard-card publisher-dashboard-card--wide"><header><div><span>${text('趋势','TREND',language)}</span><h2>${text('成交与领取趋势','Sales and claims trend',language)}</h2></div><small>${text('按履约完成时间','By fulfillment completion time',language)}</small></header><div class="publisher-dashboard-chart">${days.map((day,index) => `<div><i style="height:${Math.max(10, Math.round(daily[index] / max * 100))}%" data-value="${daily[index]}"></i><span>${day}</span></div>`).join('')}</div></section>
      <section class="publisher-dashboard-card"><header><div><span>${text('构成','MIX',language)}</span><h2>${text('商品与履约','Product & fulfillment',language)}</h2></div></header><dl class="publisher-dashboard-breakdown"><div><dt>${copy(language).base}</dt><dd>${baseCount}</dd></div><div><dt>${copy(language).dlc}</dt><dd>${dlcCount}</dd></div><div><dt>${copy(language).direct}</dt><dd>${directCount}</dd></div><div><dt>CDKEY</dt><dd>${cdkeyCount}</dd></div></dl></section>
      <section class="publisher-dashboard-card"><header><div><span>${text('风险','RISK',language)}</span><h2>${text('退款与拒付','Refunds & chargebacks',language)}</h2></div></header><dl class="publisher-dashboard-breakdown"><div><dt>${text('退款处理中','Refund processing',language)}</dt><dd>${rows.filter(item => item.status === 'refund_pending').length}</dd></div><div><dt>${text('拒付待裁决','Chargeback open',language)}</dt><dd>${m.chargebackOpen}</dd></div><div><dt>${text('拒付败诉','Chargeback lost',language)}</dt><dd>${m.chargebackLost}</dd></div><div><dt>${text('败诉扣减','Loss deduction',language)}</dt><dd>${money(m.chargebackLossMinor,m.settlementCurrency)}</dd></div></dl></section></div>`;
  };

  const renderOrders = (state, language) => {
    const rows = filteredOrders(state);
    if (!rows.length) return empty(language);
    return `<section class="publisher-dashboard-card publisher-dashboard-orders"><header><div><span>${text('脱敏订单','REDACTED ORDERS',language)}</span><h2>${text('订单明细','Order details',language)}</h2><p>${text('完整对账流水号可用于核账，平台订单号仅展示脱敏片段。','The reconciliation ID supports verification; platform order IDs stay masked.',language)}</p></div><strong>${rows.length} ${text('笔','records',language)}</strong></header><div class="publisher-dashboard-table-wrap"><table><thead><tr><th>${text('时间／订单','Time / order',language)}</th><th>${text('游戏／商品','Game / product',language)}</th><th>${text('履约方式','Fulfillment',language)}</th><th>${text('地区／平台','Region / platform',language)}</th><th>${text('金额','Amount',language)}</th><th>${text('状态','Status',language)}</th><th>${text('操作','Action',language)}</th></tr></thead><tbody>${rows.map(item => { const sm=statusMeta(item.status,language); return `<tr data-dashboard-order-id="${item.id}"><td><strong>${item.date}</strong><small>${item.id}</small><small>${item.orderMask}</small></td><td><strong>${language === 'en' ? item.gameEn : item.game}</strong><small>${item.sku} · ${item.productType === 'base' ? copy(language).base : copy(language).dlc}</small></td><td><strong>${item.fulfillment === 'account_entitlement' ? copy(language).direct : 'CDKEY'}</strong><small>${language === 'en' ? item.deliveryEn : item.delivery}</small></td><td><strong>${language === 'en' ? item.countryEn : item.country}</strong><small>${item.platform} · ${language === 'en' ? item.channelEn : item.channel}</small></td><td><strong>${money(item.amountMinor,item.currency)}</strong><small>${item.currency}</small></td><td>${tag(sm[0],sm[1])}${item.userListDeleted ? `<small class="publisher-dashboard-aux-state">${text('用户端已删除','Deleted in user list',language)}</small>` : ''}</td><td><button type="button" data-dashboard-action="open-order" data-order-id="${item.id}">${text('查看详情','View',language)}</button></td></tr>`; }).join('')}</tbody></table></div></section>`;
  };

  const renderRevenue = (state, language) => {
    const rows = filteredOrders(state);
    const m = metrics(rows);
    const locked = statements.find(item => item.status === 'locked');
    const line = (label, value, tone = '') => `<div${tone ? ` class="is-${tone}"` : ''}><dt>${label}</dt><dd>${value}</dd></div>`;
    return `<div class="publisher-dashboard-revenue-grid"><section class="publisher-dashboard-card"><header><div><span>${text('动态预估','ESTIMATE',language)}</span><h2>${text('预估收入','Estimated revenue',language)}</h2><p>${text('随退款、拒付和费用更新，不作为正式付款依据。','Updates with refunds, chargebacks and fees; not a payment basis.',language)}</p></div>${tag(text('以结算单为准','Statement is final',language),'warning')}</header><dl class="publisher-dashboard-formula">
      ${line(text('销售额','Gross sales',language),money(m.grossMinor,m.settlementCurrency))}${line(text('退款成功','Refunds',language),`− ${money(m.refundMinor,m.settlementCurrency)}`,'negative')}${line(text('拒付败诉','Chargeback losses',language),`− ${money(m.chargebackLossMinor,m.settlementCurrency)}`,'negative')}${line(text('税费','Taxes',language),`− ${money(m.taxMinor,m.settlementCurrency)}`,'negative')}${line(text('渠道费','Provider fees',language),`− ${money(m.channelFeeMinor,m.settlementCurrency)}`,'negative')}${line(text('平台分成','Platform share',language),`− ${money(m.platformShareMinor,m.settlementCurrency)}`,'negative')}${line(text('调整项','Adjustments',language),`${m.adjustmentMinor >= 0 ? '+' : '−'} ${money(Math.abs(m.adjustmentMinor),m.settlementCurrency)}`,m.adjustmentMinor >= 0 ? 'positive' : 'negative')}<div class="is-total"><dt>${text('预估收入','Estimated revenue',language)}</dt><dd>${money(m.estimatedMinor,m.settlementCurrency)}</dd></div></dl><div class="publisher-dashboard-risk-note"><span>${text('拒付待裁决风险','Open chargeback risk',language)}</span><strong>${money(m.chargebackRiskMinor,m.settlementCurrency)}</strong><small>${text(`尚未扣减 · ${m.fxVersion}`,`Not deducted · ${m.fxVersion}`,language)}</small></div></section>
      <section class="publisher-dashboard-card"><header><div><span>${text('锁定账单','LOCKED STATEMENT',language)}</span><h2>${text('待结算','Pending settlement',language)}</h2><p>${text('按结算币种汇总，不随游戏等经营筛选分摊。','Grouped by settlement currency and not allocated by analytics filters.',language)}</p></div></header><div class="publisher-dashboard-pending"><strong>${pendingText(m)}</strong><span>${text('当前厂商与账期的未清偿金额','Outstanding amount for the company and period',language)}</span></div>${locked ? `<dl class="publisher-dashboard-statement"><div><dt>${text('账期','Period',language)}</dt><dd>${locked.period}</dd></div><div><dt>${text('结算单','Statement',language)}</dt><dd>${locked.id}</dd></div><div><dt>${text('付款状态','Payment status',language)}</dt><dd>${text('待发票','Awaiting invoice',language)}</dd></div><div><dt>${text('更新时间','Updated',language)}</dt><dd>${locked.updatedAt}</dd></div></dl>` : ''}<div class="publisher-dashboard-finance-actions"><button type="button" data-dashboard-action="finance-flows">${text('查看对账流水','View reconciliation flows',language)}</button><button type="button" class="is-primary" data-dashboard-action="finance-settlement">${text('前往对账结算','Go to settlement',language)}</button></div></section></div>`;
  };

  const renderOrderDrawer = (state, language) => {
    const item = orders.find(order => order.id === state.selectedOrder);
    if (!item) return '';
    const sm = statusMeta(item.status,language);
    const impact = item.status === 'refunded' ? `− ${money(item.refundConvertedMinor,item.settlementCurrency)}` : item.status === 'chargeback_lost' ? `− ${money(item.chargebackLossMinor,item.settlementCurrency)}` : item.status === 'chargeback_open' ? `${money(item.chargebackRiskMinor,item.settlementCurrency)} ${text('风险','risk',language)}` : money(item.convertedMinor,item.settlementCurrency);
    return `<div class="publisher-dashboard-overlay" data-dashboard-action="close-order"><aside class="publisher-dashboard-drawer" role="dialog" aria-modal="true" aria-label="${text('订单详情','Order details',language)}" data-testid="publisher-order-drawer" data-dashboard-stop><header><div><span>${text('脱敏订单详情','REDACTED ORDER DETAIL',language)}</span><h2>${item.id}</h2><p>${item.orderMask} · ${item.date}</p></div><button type="button" data-dashboard-action="close-order" aria-label="${text('关闭','Close',language)}">×</button></header><div class="publisher-dashboard-drawer-body"><section><h3>${text('订单快照','Order snapshot',language)}</h3><dl>${[['游戏',language === 'en' ? item.gameEn : item.game],['SKU',item.sku],['商品',language === 'en' ? item.productEn : item.product],['商品类型',item.productType === 'base' ? copy(language).base : copy(language).dlc],['地区',language === 'en' ? item.countryEn : item.country],['平台',item.platform],['渠道',language === 'en' ? item.channelEn : item.channel]].map(([label,value]) => `<div><dt>${text(label,({游戏:'Game',商品:'Product',商品类型:'Product type',地区:'Region',平台:'Platform',渠道:'Channel'}[label] || label),language)}</dt><dd>${value}</dd></div>`).join('')}</dl></section><section><h3>${text('履约与资金影响','Fulfillment & financial impact',language)}</h3><dl><div><dt>${text('履约方式','Fulfillment',language)}</dt><dd>${item.fulfillment === 'account_entitlement' ? copy(language).direct : 'CDKEY'}</dd></div><div><dt>${text('履约结果','Delivery result',language)}</dt><dd>${language === 'en' ? item.deliveryEn : item.delivery}</dd></div><div><dt>${text('订单状态','Order status',language)}</dt><dd>${tag(sm[0],sm[1])}</dd></div><div><dt>${text('交易原币','Original amount',language)}</dt><dd>${money(item.amountMinor,item.currency)}</dd></div><div><dt>${text('结算币折算','Converted amount',language)}</dt><dd>${money(item.convertedMinor,item.settlementCurrency)} · ${item.fxRateText}</dd></div><div><dt>${text('当前资金影响','Current financial impact',language)}</dt><dd>${impact}</dd></div>${item.userListDeleted ? `<div><dt>${text('用户侧列表','User order list',language)}</dt><dd>${text('已删除，不影响统计与对账','Deleted; analytics and reconciliation are unchanged',language)}</dd></div>` : ''}</dl></section><div class="publisher-dashboard-privacy">${text('本页不展示玩家身份、设备、支付账号、支付凭证、Key 明文和内部处理材料。','Player identity, device, payment account, payment proof, plain-text keys and internal materials are hidden.',language)}</div></div></aside></div>`;
  };

  const renderScopeDialog = (state, language) => state.scopeOpen ? `<div class="publisher-dashboard-overlay" data-dashboard-action="close-scope"><section class="publisher-dashboard-dialog" role="dialog" aria-modal="true" aria-label="${text('数据口径','Metric definitions',language)}" data-dashboard-stop><header><div><span>${text('口径版本 2026-09','DEFINITION VERSION 2026-09',language)}</span><h2>${text('数据口径','Metric definitions',language)}</h2></div><button type="button" data-dashboard-action="close-scope" aria-label="${text('关闭','Close',language)}">×</button></header><dl>${[
    [text('付费销量','Paid sales',language),text('应付金额大于 0，且直接购买权益生效或 CDKEY 成功交付。','Amount due is above zero and direct entitlement is active or the CDKEY is delivered.',language)],
    [text('免费领取','Free claims',language),text('应付金额为 0 且完成履约；失败或处理中不计入。','Amount due is zero and fulfillment completed; failures and processing orders are excluded.',language)],
    [text('退款与拒付','Refunds & chargebacks',language),text('退款成功和拒付败诉才扣收入；拒付待裁决只显示风险。','Only completed refunds and lost chargebacks reduce revenue; open chargebacks stay as risk.',language)],
    [text('多币种','Multiple currencies',language),text('订单展示交易原币；销售额、逆向金额和预估收入按汇率版本折算为财务主体结算币种。','Orders show original currency; sales, reversals and estimated revenue are converted to the finance entity settlement currency using the displayed FX version.',language)],
    [text('预估收入','Estimated revenue',language),text('逐项扣除税费、渠道费和平台分成，不使用固定比例；最终以结算单为准。','Taxes, provider fees and platform share are deducted line by line; no fixed ratio is used.',language)],
    [text('待结算','Pending settlement',language),text('按财务主体、账期和结算币种汇总，不随游戏、商品或履约筛选分摊。','Grouped by finance entity, period and settlement currency; not allocated by game, product or fulfillment filters.',language)],
    [text('更新时间与正式金额','Update time & final amount',language),text('交易数据小时级更新；正式金额以财务结算模块为准，付款状态也从该模块读取。','Transaction data updates hourly; final amounts and payment status follow the finance settlement module.',language)],
    [text('脱敏范围','Redaction',language),text('对账流水号可用于核账；玩家、Key 明文和支付敏感信息不展示。','Reconciliation IDs support verification; player, key and payment-sensitive data stay hidden.',language)],
  ].map(([label,value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl></section></div>` : '';

  const render = (stateInput, language = 'zh', options = {}) => {
    const state = stateInput || createState();
    state.filters = { ...defaultFilters, ...(state.filters || {}) };
    const c = copy(language);
    const access = options.access || {};
    const game = options.game || null;
    if (game?.name) state.filters.game = game.name;
    if (!access.canViewPublisherData && !access.isPublisherReadOnly) return `<section class="publisher-dashboard-access" data-publisher-page="data" data-testid="publisher-data-dashboard"><span>${namespace.icons?.render('lock') || ''}</span><strong>${text('暂未开通经营数据权限','Analytics access is not available',language)}</strong><p>${text('完成企业认证并获得厂商数据权限后，可查看销量、订单和结算摘要。','Complete company verification and obtain publisher data access to view sales, orders and settlement summaries.',language)}</p></section>`;
    const body = state.tab === 'orders' ? renderOrders(state,language) : state.tab === 'revenue' ? renderRevenue(state,language) : renderOverview(state,language);
    const gameContext = game ? `<small class="publisher-dashboard-game-context">${namespace.components.escapeHtml(language === 'en' ? (game.englishName || game.name) : game.name)} · ${namespace.components.escapeHtml(game.gameId || '')}</small>` : '';
    return `<section class="publisher-data-dashboard" data-publisher-page="data" data-testid="publisher-data-dashboard" data-dashboard-tab="${state.tab}"${game ? ` data-dashboard-game="${namespace.components.escapeHtml(game.gameKey || game.name)}"` : ''}><header class="publisher-dashboard-head"><div><span>${c.eyebrow}</span><h1>${c.title}</h1>${gameContext}<p>${c.description}</p></div><div><button type="button" data-dashboard-action="scope">${c.scope}</button>${tag(c.readonly,'info')}<small>${c.updated}</small></div></header><nav class="publisher-dashboard-tabs" aria-label="${c.title}">${Object.entries(c.tabs).map(([value,label]) => `<button type="button" class="${state.tab === value ? 'is-active' : ''}" data-dashboard-action="tab" data-publisher-data-tab="${value}" aria-selected="${state.tab === value}">${label}</button>`).join('')}</nav>${renderFilters(state,language,{ game })}<div class="publisher-dashboard-content">${body}</div>${renderOrderDrawer(state,language)}${renderScopeDialog(state,language)}</section>`;
  };

  const bind = (root, { state, game, onChange, onFinance } = {}) => {
    const host = root.querySelector('[data-testid="publisher-data-dashboard"]');
    if (!host || !state) return;
    const update = (patch = {}, options = {}) => {
      Object.assign(state, patch);
      if (typeof onChange === 'function') onChange(state, options);
    };
    host.querySelectorAll('[data-dashboard-filter]').forEach(control => control.addEventListener(control.matches('input') ? 'input' : 'change', () => {
      state.filters = { ...defaultFilters, ...(state.filters || {}), [control.dataset.dashboardFilter]: control.value };
      if (control.matches('input')) {
        clearTimeout(state.__keywordTimer);
        state.__keywordTimer = setTimeout(() => update({}, { preserveScroll:true }), 180);
      } else update({}, { preserveScroll:true });
    }));
    host.addEventListener('click', event => {
      const control = event.target.closest('[data-dashboard-action]');
      if (!control) return;
      if (event.target.closest('[data-dashboard-stop]') && control === event.target.closest('[data-dashboard-stop]')) return;
      const action = control.dataset.dashboardAction;
      if (action === 'tab') update({ tab:control.dataset.publisherDataTab || 'overview', selectedOrder:'', scopeOpen:false });
      else if (action === 'reset') update({ filters:{ ...defaultFilters, game:game?.name || 'all' } });
      else if (action === 'scope') update({ scopeOpen:true, selectedOrder:'' }, { preserveScroll:true });
      else if (action === 'close-scope') update({ scopeOpen:false }, { preserveScroll:true });
      else if (action === 'open-order') update({ selectedOrder:control.dataset.orderId || '', scopeOpen:false }, { preserveScroll:true });
      else if (action === 'close-order') update({ selectedOrder:'' }, { preserveScroll:true });
      else if (action === 'finance-settlement' || action === 'finance-flows') {
        const target = action === 'finance-flows' ? 'settlement/flows' : 'settlement';
        if (typeof onFinance === 'function') onFinance(target, clone(state.filters));
      }
    });
    host.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (state.selectedOrder) update({ selectedOrder:'' }, { preserveScroll:true });
      else if (state.scopeOpen) update({ scopeOpen:false }, { preserveScroll:true });
    });
  };

  window.PublisherDataDashboard = { createState, render, bind, filteredOrders, metrics, orders:() => clone(orders), statements:() => clone(statements), snapshot:state => ({ tab:state?.tab || 'overview', filters:{ ...defaultFilters, ...(state?.filters || {}) }, statuses:[...new Set(filteredOrders(state || createState()).map(item => item.status))], metrics:metrics(filteredOrders(state || createState())) }) };
  namespace.publisherDataDashboard = window.PublisherDataDashboard;
})(window.GameHubDeveloperPortal);

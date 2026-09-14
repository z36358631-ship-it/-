(function developerFinanceSettlementDemo() {
  'use strict';

  const app = document.querySelector('#app');
  const ledger = window.PublisherSettlementLedger;
  if (!app || !ledger) return;

  const embedded = Boolean(window.__PUBLISHER_FINANCE_EMBEDDED__);
  const PAGE_SIZE = 20;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const percent = value => `${(Number(value || 0) * 100).toLocaleString('zh-CN', { maximumFractionDigits:2 })}%`;
  const eventLabel = type => ({ payment:'支付', refund:'退款', chargeback:'拒付' }[type] || type);
  const amount = (minor, currency) => ledger.money(minor, currency);
  const decimalAmount = minor => (Number(minor || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const usdAmount = minor => `$${decimalAmount(minor)}`;
  const lockedUsdCnyRate = month => ({ '2026-08':7.12, '2026-07':7.18, '2026-06':7.16 }[month] || 7.12);
  const cnyReference = row => `约 ¥${(Number(row.payableMinor || 0) / 100 * lockedUsdCnyRate(row.month)).toLocaleString('zh-CN', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
  const rowAmounts = row => [
    usdAmount(row.paidMinor),
    `${usdAmount(row.refundMinor)}／${usdAmount(row.chargebackMinor)}`,
    usdAmount(row.salesTaxMinor),
    usdAmount(row.providerFeeMinor),
    usdAmount(row.platformShareMinor),
    usdAmount(row.withholdingTaxMinor),
    usdAmount(row.payableMinor),
  ];

  const state = {
    ledgerState:ledger.createState(),
    demoScenario:'exhaustive',
    demoOpen:false,
    route:'entity',
    filters:{ month:'all', game:'all' },
    page:1,
    activeEntityKey:'',
    historyOpen:false,
    exportMessage:'',
    callbacks:{ onChange:null, onNavigate:null },
  };

  const entityProfile = Object.freeze({
    status:'已生效', version:'FIN-2026-003', currency:'USD', lockedAt:'2026-09-05 11:20',
    legalName:'星海互动科技有限公司', region:'中国大陆', registrationNo:'9144**********3X',
    registeredAddress:'广东省广州市天河区保利天汇5期1701', contactName:'王明', contactEmail:'finance@ocean-expedition.com', contactMobile:'18520064686', settlementModel:'收入分成', period:'自然月',
    confirmation:'出单后 10 个自然日', ruleVersion:'RULE-2026-02', shareVersion:'SHARE-2026-02',
    bankRegion:'中国香港', bankName:'汇丰银行（香港）有限公司', accountName:'XINGHAI INTERACTIVE TECHNOLOGY CO., LTD.',
    accountNumber:'**** 7826', swift:'HSBCHKHHHKH', accountVersion:'ACC-HK-2026-003',
    taxResidence:'中国大陆', taxNo:'9144**********3X', salesTax:'由第三方支付商按交易地区计算', withholding:'按主体税务居民地与合同规则计算',
  });
  const entityHistory = Object.freeze([
    { version:'FIN-2026-003', type:'收款账户变更', submitted:'2026-08-09 14:22', effective:'2026-08-12 15:30', account:'**** 7826', status:'已生效' },
    { version:'FIN-2026-002', type:'税务资料变更', submitted:'2026-06-18 10:14', effective:'2026-06-20 17:08', account:'**** 5369', status:'已停用' },
    { version:'FIN-2026-001', type:'首次配置', submitted:'2026-03-02 09:30', effective:'2026-03-05 16:20', account:'**** 5369', status:'已停用' },
  ]);

  const readonly = (label, value, hint = '') => `<div class="gh-readonly"><span>${esc(label)}</span><strong>${esc(value)}</strong>${hint ? `<small>${esc(hint)}</small>` : ''}</div>`;
  const button = (label, action, variant = '', extra = '') => `<button type="button" class="gh-button ${variant}" data-finance-action="${esc(action)}" ${extra}>${esc(label)}</button>`;
  const pageHead = (title, description) => `<header class="gh-page-head"><div><h1>${esc(title)}</h1><p>${esc(description)}</p></div></header>`;

  const emptyState = (title, description) => `<div class="gh-empty"><div class="gh-empty-mark" aria-hidden="true">—</div><strong>${esc(title)}</strong><p>${esc(description)}</p></div>`;
  const pagination = total => {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    return `<footer class="gh-pagination" data-d15-pagination data-page-size="20"><span>共 ${total} 条，每页 20 条</span><button class="gh-button" type="button" data-finance-action="page" data-page="${state.page - 1}"${state.page <= 1 ? ' disabled' : ''}>上一页</button><strong>${state.page} / ${pages}</strong><button class="gh-button" type="button" data-finance-action="page" data-page="${state.page + 1}"${state.page >= pages ? ' disabled' : ''}>下一页</button></footer>`;
  };

  function entityPage() {
    if (state.demoScenario === 'empty') return `<section class="gh-card">${emptyState('尚未配置财务主体', '完成企业认证后，可在这里维护税务居民地、收款账户和结算币种。')}</section>`;
    const profile = entityProfile;
    return `<section class="gh-card d15-entity-summary" data-d15-entity-summary><div class="gh-card-body"><h2>财务主体、收款资料与审核状态</h2><p>当前页面用于维护厂商结算所需的财务主体信息。资料修改后需重新审核，审核通过前继续使用当前生效版本。</p><div class="d15-entity-statuses"><div><span>审核状态</span><strong><i></i>${profile.status}</strong></div><div><span>配置状态</span><strong><i></i>已配置</strong></div><div><span>主体类型</span><strong>企业</strong></div></div><small>当前生效版本 ${profile.version}，账本快照已于 ${profile.lockedAt} 锁定。</small></div></section>
      <section class="d15-section-title"><div><h2>财务主体资料</h2><p>查看当前收款与结算信息，资料变更通过审核后生效。</p></div><div><button type="button" class="gh-button link" data-finance-action="toggle-history">${state.historyOpen ? '收起变更历史' : '查看变更历史'}</button>${button('修改','edit-entity')}</div></section>
      <section class="gh-card d15-entity-details" data-d15-entity-details><div class="gh-card-body d15-entity-detail-grid">${readonly('企业名称',profile.legalName)}${readonly('注册国家或地区',profile.region)}${readonly('注册地址',profile.registeredAddress)}${readonly('统一社会信用代码',profile.registrationNo)}${readonly('财务联系人',profile.contactName)}${readonly('联系邮箱',profile.contactEmail)}${readonly('联系电话',profile.contactMobile)}${readonly('开户地区',profile.bankRegion)}${readonly('开户银行',profile.bankName)}${readonly('账户名称',profile.accountName)}${readonly('银行账号',profile.accountNumber)}${readonly('SWIFT / BIC',profile.swift)}${readonly('税务居民地',profile.taxResidence)}${readonly('税号',profile.taxNo)}${readonly('结算币种','美元')}${readonly('结算周期',`${profile.period} · ${profile.confirmation}`)}</div></section>
      ${state.historyOpen ? `<section class="gh-card d15-history" data-d15-entity-history><header class="gh-card-head"><div><h2>变更历史</h2><p>主体、税务和收款账户的生效记录</p></div></header><div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>版本</th><th>类型</th><th>提交时间</th><th>生效时间</th><th>收款账户</th><th>状态</th></tr></thead><tbody>${entityHistory.map(item => `<tr><td><strong>${item.version}</strong></td><td>${item.type}</td><td>${item.submitted}</td><td>${item.effective}</td><td>${item.account}</td><td><span class="gh-tag ${item.status === '已生效' ? 'success' : ''}">${item.status}</span></td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
  }

  const sumKeys = ['paidMinor','refundMinor','chargebackMinor','salesTaxMinor','providerFeeMinor','platformShareMinor','withholdingTaxMinor','payableMinor'];
  const addAmounts = (target, row) => sumKeys.forEach(key => { target[key] = Number(target[key] || 0) + Number(row[key] || 0); });
  const developerTransactions = filters => ledger.transactionsFor(state.ledgerState, {
    developer:'星海互动',
    month:filters?.month || 'all',
    gameId:filters?.game || 'all',
  });
  const developerGameRows = filters => {
    const rows = new Map();
    developerTransactions(filters).forEach(item => {
      const key = `${item.month}::${item.gameId}`;
      if (!rows.has(key)) rows.set(key,{ key,month:item.month,gameId:item.gameId,gameName:item.gameName,payableMinor:0 });
      addAmounts(rows.get(key),item);
    });
    return [...rows.values()].sort((a,b) => b.month.localeCompare(a.month) || a.gameName.localeCompare(b.gameName));
  };
  const developerMonthRows = filters => {
    const rows = new Map();
    developerTransactions(filters).forEach(item => {
      const gameFilter = filters?.game || 'all';
      const key = `星海互动::${item.month}::${gameFilter}`;
      if (!rows.has(key)) rows.set(key,{
        key,month:item.month,developer:item.developer,entityName:entityProfile.legalName,entityVersion:entityProfile.version,
        accountVersion:entityProfile.accountVersion,settlementCurrency:'USD',gameFilter,gameIds:new Set(),eventCount:0,
      });
      const target = rows.get(key);
      target.gameIds.add(item.gameId);
      target.eventCount += 1;
      addAmounts(target,item);
    });
    return [...rows.values()].map(row => ({ ...row,gameIds:[...row.gameIds],gameCount:row.gameIds.size }))
      .sort((a,b) => b.month.localeCompare(a.month));
  };
  const allDeveloperGames = () => {
    const games = new Map();
    ledger.transactionsFor(state.ledgerState,{ developer:'星海互动' }).forEach(item => {
      if (!games.has(item.gameId)) games.set(item.gameId,{ gameId:item.gameId,gameName:item.gameName });
    });
    return [...games.values()].sort((a,b) => a.gameName.localeCompare(b.gameName,'zh-CN'));
  };
  const visibleSettlements = () => state.demoScenario === 'empty' ? [] : developerMonthRows(state.filters);
  const gameLabel = row => row.gameFilter === 'all' ? `全部游戏（${row.gameCount} 款）` : (allDeveloperGames().find(game => game.gameId === row.gameFilter)?.gameName || row.gameFilter);

  const settlementFilters = () => `<section class="d15-filters" aria-label="结算记录筛选"><label><span>结算月</span><select class="gh-select" data-d15-filter="month"><option value="all"${state.filters.month === 'all' ? ' selected' : ''}>全部月份</option><option value="2026-08"${state.filters.month === '2026-08' ? ' selected' : ''}>2026-08</option><option value="2026-07"${state.filters.month === '2026-07' ? ' selected' : ''}>2026-07</option><option value="2026-06"${state.filters.month === '2026-06' ? ' selected' : ''}>2026-06</option></select></label><label><span>游戏</span><select class="gh-select" data-d15-filter="game"><option value="all"${state.filters.game === 'all' ? ' selected' : ''}>全部游戏</option>${allDeveloperGames().map(game => `<option value="${esc(game.gameId)}"${state.filters.game === game.gameId ? ' selected' : ''}>${esc(game.gameName)}</option>`).join('')}</select></label><div class="d15-filter-actions">${button('重置','reset-filters')}${button('查询','query','primary')}</div></section>`;

  function settlementPage() {
    const rows = visibleSettlements();
    const current = rows.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    return `${settlementFilters()}<section class="gh-card d15-settlement-card"><header class="gh-card-head"><div><h2>月度对账结算</h2><p>默认汇总全部游戏，也可筛选单款游戏；金额以美元展示，人民币为账期锁定汇率折算的参考值。</p></div><div>${button('导出当前结果','export-settlements','',rows.length ? '' : 'disabled')}</div></header>${state.exportMessage ? `<div class="d15-export-message ${state.exportMessage.includes('失败') ? 'is-error' : ''}" data-d15-export-status>${esc(state.exportMessage)}</div>` : ''}${current.length ? `<div class="gh-table-wrap"><table class="gh-table d15-settlement-table" data-testid="settlement-table"><thead><tr><th>结算月</th><th>游戏范围</th><th>用户实付</th><th>退款／拒付</th><th>销售税</th><th>支付费</th><th>平台分成</th><th>预扣税</th><th>应结算金额</th><th>操作</th></tr></thead><tbody>${current.map(row => {
      const values = rowAmounts(row);
      return `<tr data-d15-settlement-row data-entity-key="${esc(row.key)}"><td><strong>${esc(row.month)}</strong><small>汇率 ${lockedUsdCnyRate(row.month).toFixed(2)}</small></td><td><strong>${esc(gameLabel(row))}</strong><small>${row.eventCount} 条账本事件</small></td>${values.slice(0,-1).map(value => `<td>${esc(value)}</td>`).join('')}<td class="d15-payable"><strong>${esc(values.at(-1))}</strong><small data-d15-cny-reference>${esc(cnyReference(row))}</small></td><td>${button('查看详情','open-settlement','link',`data-entity-key="${esc(row.key)}"`)}</td></tr>`;
    }).join('')}</tbody></table></div>${pagination(rows.length)}` : emptyState(state.demoScenario === 'empty' ? '暂无结算记录' : '未找到符合条件的记录', state.demoScenario === 'empty' ? '账期锁定后，结算记录会展示在这里。' : '请调整筛选条件或重置后再试。')}</section>`;
  }

  const activeEntityRow = () => developerMonthRows({ month:'all',game:state.activeEntityKey.split('::').at(-1) || 'all' }).find(row => row.key === state.activeEntityKey);
  function settlementDrawer() {
    const row = activeEntityRow();
    if (!row) return '';
    const exact = { month:row.month,game:row.gameFilter };
    const games = developerGameRows(exact);
    const transactions = developerTransactions(exact);
    const values = rowAmounts(row);
    return `<div class="d15-drawer-layer" data-finance-action="close-detail"><aside class="d15-drawer" role="dialog" aria-modal="true" aria-label="结算详情" data-finance-stop><header class="d15-drawer-head"><div><h2>${esc(row.month)} 结算详情</h2><p>${esc(row.entityName)} · ${esc(gameLabel(row))} · 美元结算 · 人民币按 ${lockedUsdCnyRate(row.month).toFixed(2)} 参考折算</p></div><button type="button" class="gh-dialog-close" data-finance-action="close-detail" aria-label="关闭">×</button></header><div class="d15-drawer-body"><section class="d15-metrics" aria-label="金额汇总">${['用户实付','退款／拒付','销售税','支付费','平台分成','预扣税','应结算'].map((label,index) => `<div><span>${label}</span><strong>${esc(values[index])}</strong>${index === values.length - 1 ? `<small data-d15-cny-reference>${esc(cnyReference(row))}</small>` : ''}</div>`).join('')}</section>
      <section class="d15-detail-section"><header><h3>游戏构成</h3><p>主体汇总金额等于下列游戏明细合计。</p></header><div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>游戏</th><th>用户实付</th><th>退款／拒付</th><th>销售税</th><th>支付费</th><th>平台分成</th><th>预扣税</th><th>应结算</th></tr></thead><tbody>${games.map(game => { const gameValues = rowAmounts(game); return `<tr data-d15-game-row><td><strong>${esc(game.gameName)}</strong><small>${esc(game.gameId)}</small></td>${gameValues.map(value => `<td>${esc(value)}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div></section>
      <section class="d15-detail-section"><header><h3>交易流水</h3><p>税率、税额、支付费和汇率均来自锁定的第三方支付商账本事实。</p></header><div class="gh-table-wrap"><table class="gh-table d15-transaction-table"><thead><tr><th>事件／游戏</th><th>第三方支付商</th><th>买家国家或地区</th><th>原币</th><th>税种／实际税率</th><th>税额</th><th>支付费</th><th>汇率</th><th>结算金额</th></tr></thead><tbody>${transactions.map(item => `<tr data-d15-transaction-row><td><strong>${eventLabel(item.eventType)} · ${esc(item.gameName)}</strong><small>${esc(item.eventId)}</small></td><td>${esc(item.provider)}</td><td>${esc(item.buyerRegion)}</td><td><strong>${esc(item.originalCurrency)} ${esc(ledger.decimal(item.originalAmountMinor))}</strong><small>结算币种 美元</small></td><td><strong>${esc(item.salesTaxType)}</strong><small>实际税率 ${percent(item.salesTaxRate)}</small></td><td>${esc(usdAmount(item.salesTaxMinor))}</td><td>${esc(usdAmount(item.providerFeeMinor))}</td><td><strong>${Number(item.fxRate).toFixed(4)}</strong><small>${esc(item.fxVersion)}</small></td><td class="d15-payable">${esc(usdAmount(item.payableMinor))}</td></tr>`).join('')}</tbody></table></div></section></div><footer class="d15-drawer-foot">${button('关闭','close-detail')}${button('导出本期明细','export-detail','primary')}</footer></aside></div>`;
  }

  function flowPage() {
    const rows = state.demoScenario === 'empty' ? [] : developerTransactions(state.filters);
    const current = rows.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    return `${settlementFilters()}<section class="gh-card"><header class="gh-card-head"><div><h2>交易流水</h2><p>只读展示第三方支付商回传并已锁定的交易事实。</p></div></header>${current.length ? `<div class="gh-table-wrap"><table class="gh-table d15-transaction-table"><thead><tr><th>事件／游戏</th><th>第三方支付商</th><th>买家国家或地区</th><th>原币</th><th>税种／实际税率</th><th>税额</th><th>支付费</th><th>汇率</th><th>结算金额</th></tr></thead><tbody>${current.map(item => `<tr><td><strong>${eventLabel(item.eventType)} · ${esc(item.gameName)}</strong><small>${esc(item.eventId)}</small></td><td>${esc(item.provider)}</td><td>${esc(item.buyerRegion)}</td><td>${esc(item.originalCurrency)} ${esc(ledger.decimal(item.originalAmountMinor))}</td><td>${esc(item.salesTaxType)} · ${percent(item.salesTaxRate)}</td><td>${esc(usdAmount(item.salesTaxMinor))}</td><td>${esc(usdAmount(item.providerFeeMinor))}</td><td>${Number(item.fxRate).toFixed(4)}</td><td class="d15-payable">${esc(usdAmount(item.payableMinor))}</td></tr>`).join('')}</tbody></table></div>${pagination(rows.length)}` : emptyState(state.demoScenario === 'empty' ? '暂无交易流水' : '未找到符合条件的交易流水','请调整筛选条件或等待账期锁定。')}</section>`;
  }

  const pageContent = () => state.route === 'entity' ? entityPage() : state.route === 'flows' ? flowPage() : settlementPage();
  const scenario = () => `<section class="d15-demo"><button type="button" data-finance-action="demo-toggle" aria-expanded="${state.demoOpen}" data-testid="scenario-orb"><b>Demo</b><span>状态</span></button>${state.demoOpen ? `<aside><strong>页面状态</strong><button type="button" data-finance-action="scenario" data-scenario="exhaustive" class="${state.demoScenario === 'exhaustive' ? 'is-active' : ''}">穷举态</button><button type="button" data-finance-action="scenario" data-scenario="empty" class="${state.demoScenario === 'empty' ? 'is-active' : ''}">缺省态</button></aside>` : ''}</section>`;
  const logo = () => `<svg viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="10" fill="#f3b71b"/><path d="M10 18.3c0-5.3 3.7-9.1 8.9-9.1 2.6 0 4.8.9 6.4 2.4l-3.1 3.1a4.7 4.7 0 0 0-3.3-1.3c-2.8 0-4.7 2-4.7 4.9 0 2.8 1.9 4.9 4.8 4.9 2 0 3.3-.8 4-2.1h-4.6v-3.8h8.7c.1.6.1 1.2.1 1.8 0 5.1-3.4 8.8-8.3 8.8-5.2 0-8.9-4-8.9-9.6Z" fill="#422d00"/></svg>`;
  function standaloneRender() {
    const title = state.route === 'entity' ? '财务主体' : state.route === 'flows' ? '交易流水' : '对账结算';
    const description = state.route === 'entity' ? '维护财务主体、税务与收款资料。' : state.route === 'flows' ? '核对第三方支付商回传的交易事实。' : '查看全部游戏或单款游戏的月度结算总额。';
    app.innerHTML = `<div class="gh-app d15-app" data-testid="developer-finance-demo"><header class="gh-topbar"><div class="gh-brand">${logo()}<span>PC 发行平台<small>开发者中心</small></span></div><div class="gh-user"><div class="gh-avatar">星</div><div class="gh-user-copy"><strong>星海互动</strong><small>企业开发者</small></div></div></header><div class="gh-layout"><aside class="gh-sidebar"><div class="gh-sidebar-label">财务</div><nav class="gh-nav d15-nav" aria-label="财务导航"><button type="button" data-route="entity" class="${state.route === 'entity' ? 'is-active' : ''}"><span class="gh-nav-icon">主</span>财务主体</button><button type="button" data-route="settlement" class="${state.route !== 'entity' ? 'is-active' : ''}"><span class="gh-nav-icon">结</span>对账结算</button></nav></aside><main class="gh-main"><div class="gh-content">${pageHead(title,description)}${pageContent()}</div></main></div>${scenario()}${settlementDrawer()}</div>`;
    document.body.classList.toggle('finance-overlay-open', Boolean(state.activeEntityKey));
  }

  const rerender = () => {
    if (embedded && typeof state.callbacks.onChange === 'function') state.callbacks.onChange({ preserveScroll:true });
    else standaloneRender();
  };
  const readFilters = () => {
    state.filters = {
      month:document.querySelector('[data-d15-filter="month"]')?.value || 'all',
      game:document.querySelector('[data-d15-filter="game"]')?.value || 'all',
    };
    state.page = 1;
    state.exportMessage = '';
  };
  const save = (content, filename) => {
    try {
      const href = URL.createObjectURL(new Blob([content], { type:'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = href;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 0);
      return true;
    } catch { return false; }
  };

  document.addEventListener('click', event => {
    const routeButton = event.target.closest('[data-route]');
    if (routeButton && !embedded) {
      state.route = routeButton.dataset.route === 'entity' ? 'entity' : 'settlement';
      state.page = 1;
      state.activeEntityKey = '';
      location.hash = `#/${state.route}`;
      standaloneRender();
      return;
    }
    const control = event.target.closest('[data-finance-action]');
    if (!control || control.disabled) return;
    const action = control.dataset.financeAction;
    if (action === 'close-detail' && event.target.closest('[data-finance-stop]') && !event.target.closest('.gh-dialog-close') && !event.target.closest('.d15-drawer-foot')) return;
    if (action === 'query') { readFilters(); rerender(); }
    if (action === 'reset-filters') { state.filters = { month:'all',game:'all' }; state.page = 1; state.exportMessage = ''; rerender(); }
    if (action === 'page') { state.page = Math.max(1,Number(control.dataset.page) || 1); rerender(); }
    if (action === 'open-settlement') { state.activeEntityKey = control.dataset.entityKey; rerender(); }
    if (action === 'close-detail') { state.activeEntityKey = ''; rerender(); }
    if (action === 'toggle-history') { state.historyOpen = !state.historyOpen; rerender(); }
    if (action === 'export-settlements') {
      const rows = visibleSettlements();
      const headers = ['结算月','游戏范围','用户实付（美元）','退款（美元）','拒付（美元）','销售税（美元）','支付费（美元）','平台分成（美元）','预扣税（美元）','应结算金额（美元）','人民币参考额','锁定汇率'];
      const csvRows = rows.map(row => [row.month,gameLabel(row),...sumKeys.map(key => decimalAmount(row[key])),(Number(row.payableMinor || 0) / 100 * lockedUsdCnyRate(row.month)).toFixed(2),lockedUsdCnyRate(row.month).toFixed(2)]);
      const csv = `\uFEFF${[headers,...csvRows].map(columns => columns.map(value => `"${String(value ?? '').replaceAll('"','""')}"`).join(',')).join('\r\n')}`;
      const ok = save(csv,`对账结算_${state.filters.month === 'all' ? '全部月份' : state.filters.month}.csv`);
      state.exportMessage = ok ? `已导出 ${rows.length} 条结算记录` : '导出失败，请重试';
      rerender();
    }
    if (action === 'export-detail') {
      const row = activeEntityRow();
      if (!row) return;
      const rows = ledger.gameRowsFor(state.ledgerState,{ developer:'星海互动',month:row.month,gameId:row.gameFilter });
      save(ledger.exportGameCsv(rows),`游戏构成_${row.month}_${row.entityVersion}.csv`);
    }
    if (action === 'demo-toggle') { state.demoOpen = !state.demoOpen; rerender(); }
    if (action === 'scenario') { state.demoScenario = control.dataset.scenario; state.demoOpen = false; state.activeEntityKey = ''; state.page = 1; rerender(); }
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.activeEntityKey) { state.activeEntityKey = ''; rerender(); }
  });
  window.addEventListener('hashchange', () => {
    if (embedded) return;
    const route = location.hash.replace(/^#\/?/,'');
    state.route = route === 'entity' ? 'entity' : route.includes('flows') ? 'flows' : 'settlement';
    state.page = 1;
    state.activeEntityKey = '';
    standaloneRender();
  });

  window.__developerFinanceDemo = {
    snapshot:() => ({
      scenario:state.demoScenario,
      snapshotId:state.ledgerState.snapshotId,
      immutable:Object.isFrozen(state.ledgerState.events) && state.ledgerState.events.every(Object.isFrozen),
      events:state.ledgerState.events.length,
      settlements:developerMonthRows({ month:'all',game:'all' }),
      visibleSettlements:visibleSettlements(),
      games:developerGameRows({ month:'all',game:'all' }),
    }),
    setDemoScenario:scenarioName => { state.demoScenario = scenarioName; rerender(); },
    reset:() => location.reload(),
  };

  if (embedded) {
    window.PublisherFinance = {
      routeIds:['P15-01','P15-02','P15-03'],
      createState:() => state,
      render:(_financeState, options = {}) => {
        state.route = options.routeId === 'P15-01' ? 'entity' : options.routeId === 'P15-03' ? 'flows' : 'settlement';
        return `<section class="publisher-finance" data-testid="developer-finance-demo" data-finance-route="${esc(options.routeId || 'P15-01')}">${pageContent()}${settlementDrawer()}</section>`;
      },
      bind:(_root, options = {}) => {
        state.callbacks.onChange = typeof options.onChange === 'function' ? options.onChange : null;
        state.callbacks.onNavigate = typeof options.onNavigate === 'function' ? options.onNavigate : null;
        document.body.classList.toggle('finance-overlay-open', Boolean(state.activeEntityKey));
      },
      closeOverlays:() => { state.activeEntityKey = ''; document.body.classList.remove('finance-overlay-open'); },
      applyEntryContext:(_financeState, context = {}) => {
        const filters = context.filters || {};
        state.filters = {
          month:filters.month || 'all',
          game:filters.gameId || context.gameId || 'all',
        };
        state.page = 1;
      },
      setScenario:(_financeState, scenarioName) => {
        state.demoScenario = ['exhaustive','empty'].includes(scenarioName) ? scenarioName : 'exhaustive';
        state.activeEntityKey = '';
        state.page = 1;
        rerender();
      },
    };
  } else {
    const route = location.hash.replace(/^#\/?/,'');
    state.route = route === 'entity' ? 'entity' : route.includes('flows') ? 'flows' : 'settlement';
    standaloneRender();
  }
})();

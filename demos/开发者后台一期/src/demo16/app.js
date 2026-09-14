window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};
((namespace, model) => {
  'use strict';
  if (!model || !namespace.templates || !namespace.shell) return;

  const state = model.createState();
  const PAGE_SIZE = 20;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const money = (minor, currency) => model.money(minor,currency);
  const amount = minor => (Number(minor || 0) / 100).toLocaleString('zh-CN',{ minimumFractionDigits:2,maximumFractionDigits:2 });
  const cnyRates = Object.freeze({ '2026-08':7.12,'2026-07':7.18,'2026-06':7.16 });
  const cnyMinor = row => row.settlementCurrency === 'CNY' ? row.payableMinor : Math.round(row.payableMinor * (cnyRates[row.month] || 7.12));
  const percent = value => `${(Number(value || 0) * 100).toLocaleString('zh-CN',{ maximumFractionDigits:2 })}%`;
  const eventLabel = type => ({ payment:'支付', refund:'退款', chargeback:'拒付' }[type] || type);
  const activeFilters = () => state.filters[state.activeTab];
  const activeRows = () => state.activeTab === 'entity' ? model.entityRows(state) : model.gameRows(state);

  const tabs = () => `<div class="fo-tabs" role="tablist" aria-label="财务结算视图"><button type="button" role="tab" aria-selected="${state.activeTab === 'entity'}" class="${state.activeTab === 'entity' ? 'is-active' : ''}" data-fo-action="tab" data-fo-tab="entity">主体汇总</button><button type="button" role="tab" aria-selected="${state.activeTab === 'game'}" class="${state.activeTab === 'game' ? 'is-active' : ''}" data-fo-action="tab" data-fo-tab="game">游戏明细</button></div>`;
  const option = (value, label, selected) => `<option value="${esc(value)}"${selected === value ? ' selected' : ''}>${esc(label)}</option>`;

  function filters() {
    const item = activeFilters();
    const keyword = state.activeTab === 'entity' ? '开发者／财务主体' : '游戏／Game ID／开发者／财务主体';
    const provider = state.activeTab === 'game' ? `<label><span>支付商</span><select data-fo-filter="provider">${option('all','全部支付商',item.provider)}${option('第三方支付商','第三方支付商',item.provider)}</select></label>` : '';
    return `<section class="fo-filters" aria-label="${state.activeTab === 'entity' ? '主体汇总' : '游戏明细'}筛选"><label class="fo-keyword"><span>${keyword}</span><input type="search" data-fo-filter="keyword" value="${esc(item.keyword)}" placeholder="${state.activeTab === 'entity' ? '输入开发者、主体名称或版本' : '输入游戏、Game ID、开发者或主体'}"></label><label><span>结算月</span><select data-fo-filter="month">${option('all','全部月份',item.month)}${option('2026-08','2026-08',item.month)}${option('2026-07','2026-07',item.month)}${option('2026-06','2026-06',item.month)}</select></label><label><span>币种</span><select data-fo-filter="currency">${option('all','全部币种',item.currency)}${option('USD','USD',item.currency)}${option('CNY','CNY',item.currency)}</select></label>${provider}<div class="fo-filter-actions"><button type="button" data-fo-action="reset">重置</button><button type="button" class="is-primary" data-fo-action="query">查询</button></div></section>`;
  }

  const pageRows = rows => {
    const pages = Math.max(1,Math.ceil(rows.length / PAGE_SIZE));
    state.pages[state.activeTab] = Math.min(state.pages[state.activeTab],pages);
    const page = state.pages[state.activeTab];
    return rows.slice((page - 1) * PAGE_SIZE,page * PAGE_SIZE);
  };
  const pagination = total => {
    const page = state.pages[state.activeTab];
    const pages = Math.max(1,Math.ceil(total / PAGE_SIZE));
    return `<footer class="fo-pagination" data-fo-pagination data-page-size="20"><span>共 ${total} 条，每页 20 条</span><div><button type="button" data-fo-action="page" data-fo-page="${page - 1}"${page <= 1 ? ' disabled' : ''}>上一页</button><b>${page} / ${pages}</b><button type="button" data-fo-action="page" data-fo-page="${page + 1}"${page >= pages ? ' disabled' : ''}>下一页</button></div></footer>`;
  };
  const empty = () => state.scenario === 'empty'
    ? `<div class="fo-empty"><div>—</div><strong>${state.activeTab === 'entity' ? '暂无主体结算记录' : '暂无游戏结算明细'}</strong><p>结算月锁定后，记录会展示在这里。</p></div>`
    : `<div class="fo-empty"><div>—</div><strong>未找到符合条件的记录</strong><p>请调整当前页签的筛选条件或重置后再试。</p></div>`;
  const selectedRows = rows => rows.filter(row => state.selected[state.activeTab].includes(row.key));
  const rowAmounts = row => [
    amount(row.paidMinor),
    `${amount(row.refundMinor)}／${amount(row.chargebackMinor)}`,
    amount(row.salesTaxMinor), amount(row.providerFeeMinor),
    amount(row.platformShareMinor), amount(row.withholdingTaxMinor),
    amount(row.payableMinor),
  ];

  function entityTable(rows,current) {
    return `<div class="fo-table-scroll"><table class="fo-table fo-entity-table" data-testid="entity-summary-table"><thead><tr><th class="fo-check"><input type="checkbox" aria-label="选择本页主体" data-fo-select-page></th><th>结算月</th><th>开发者／财务主体</th><th>币种／游戏数</th><th>用户实付</th><th>退款／拒付</th><th>销售税</th><th>支付费</th><th>平台分成</th><th>预扣税</th><th>应结算金额</th><th>CNY金额</th><th>收款账户</th></tr></thead><tbody>${current.map(row => {
      const values = rowAmounts(row);
      const converted = cnyMinor(row);
      return `<tr data-fo-entity-row data-row-key="${esc(row.key)}" data-currency="${esc(row.settlementCurrency)}" data-payable-minor="${row.payableMinor}" data-cny-minor="${converted}"><td class="fo-check"><input type="checkbox" aria-label="选择 ${esc(row.entityName)} ${esc(row.settlementCurrency)}" data-fo-select-row="${esc(row.key)}"${state.selected.entity.includes(row.key) ? ' checked' : ''}></td><td><strong>${esc(row.month)}</strong><small>${esc(row.entityVersion)}</small></td><td><strong>${esc(row.developer)}</strong><small>${esc(row.entityName)}</small></td><td><strong>${esc(row.settlementCurrency)}</strong><small>${row.gameCount} 款游戏</small></td>${values.map((value,index) => `<td data-fo-amount${index === values.length - 1 ? ' class="fo-payable"' : ''}>${esc(value)}</td>`).join('')}<td class="fo-payable" data-fo-amount>${esc(amount(converted))}</td><td><strong>${esc(row.bankName)}</strong><small>${esc(row.accountMasked)} · ${esc(row.accountVersion)}</small></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function gameTable(rows,current) {
    return `<div class="fo-table-scroll"><table class="fo-table fo-game-table" data-testid="game-detail-table"><thead><tr><th class="fo-check"><input type="checkbox" aria-label="选择本页游戏" data-fo-select-page></th><th>结算月／游戏</th><th>开发者／财务主体</th><th>支付商／币种</th><th>用户实付</th><th>退款／拒付</th><th>销售税</th><th>支付费</th><th>平台分成</th><th>预扣税</th><th>应结算金额</th><th>操作</th></tr></thead><tbody>${current.map(row => {
      const values = rowAmounts(row);
      return `<tr data-fo-game-row data-row-key="${esc(row.key)}" data-payable-minor="${row.payableMinor}"><td class="fo-check"><input type="checkbox" aria-label="选择 ${esc(row.gameName)}" data-fo-select-row="${esc(row.key)}"${state.selected.game.includes(row.key) ? ' checked' : ''}></td><td><strong>${esc(row.month)} · ${esc(row.gameName)}</strong><small>${esc(row.gameId)}</small></td><td><strong>${esc(row.developer)}</strong><small>${esc(row.entityName)} · ${esc(row.entityVersion)} · ${esc(row.accountVersion)}</small></td><td><strong>${esc(row.provider)}</strong><small>${esc(row.settlementCurrency)}</small></td>${values.map((value,index) => `<td data-fo-amount${index === values.length - 1 ? ' class="fo-payable"' : ''}>${esc(value)}</td>`).join('')}<td><button type="button" class="fo-link" data-fo-action="view-transactions" data-row-key="${esc(row.key)}">交易流水</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function table() {
    const rows = activeRows();
    const current = pageRows(rows);
    const selected = selectedRows(rows);
    const exportCount = selected.length || rows.length;
    const label = selected.length ? `导出选中（${selected.length}）` : `导出当前结果（${rows.length}）`;
    return `<section class="fo-card fo-table-card"><header class="fo-table-toolbar"><div><strong>${state.activeTab === 'entity' ? '主体结算汇总' : '游戏结算明细'}</strong><span>${state.activeTab === 'entity' ? '生成线下打款名单' : '核对各游戏金额来源'}</span></div><button type="button" class="is-primary" data-fo-action="export"${exportCount ? '' : ' disabled'}>${label}</button></header>${state.exportMessage ? `<div class="fo-export-message ${state.exportMessage.includes('失败') ? 'is-error' : ''}" data-fo-export-status>${esc(state.exportMessage)}</div>` : ''}${current.length ? (state.activeTab === 'entity' ? entityTable(rows,current) : gameTable(rows,current)) : empty()}</section>${rows.length ? pagination(rows.length) : ''}`;
  }

  function transactionDrawer() {
    if (!state.detailGameKey) return '';
    const game = model.gameRows(state).find(row => row.key === state.detailGameKey) || model.ledger.gameRowsFor(state.ledgerState).find(row => row.key === state.detailGameKey);
    if (!game) return '';
    const rows = model.transactionRows(state,game);
    return `<div class="fo-drawer-layer" data-fo-action="close-drawer"><aside class="fo-drawer" role="dialog" aria-modal="true" aria-label="交易流水详情" data-fo-stop><header><div><h2>${esc(game.gameName)} · 交易流水</h2><p>${esc(game.month)} · ${esc(game.entityName)} · ${esc(game.entityVersion)} · ${esc(game.accountVersion)}</p></div><button type="button" data-fo-action="close-drawer" aria-label="关闭">×</button></header><div class="fo-drawer-body"><section class="fo-drawer-summary"><div><span>用户实付</span><strong>${esc(money(game.paidMinor,game.settlementCurrency))}</strong></div><div><span>销售税</span><strong>${esc(money(game.salesTaxMinor,game.settlementCurrency))}</strong></div><div><span>支付费</span><strong>${esc(money(game.providerFeeMinor,game.settlementCurrency))}</strong></div><div><span>预扣税</span><strong>${esc(money(game.withholdingTaxMinor,game.settlementCurrency))}</strong></div><div><span>应结算金额</span><strong>${esc(money(game.payableMinor,game.settlementCurrency))}</strong></div></section><div class="fo-table-scroll"><table class="fo-table fo-transaction-table"><thead><tr><th>事件／流水号</th><th>第三方支付商</th><th>买家国家或地区</th><th>原币</th><th>税种／实际税率</th><th>税额</th><th>支付费</th><th>汇率</th><th>结算金额</th></tr></thead><tbody>${rows.map(row => `<tr><td><strong>${eventLabel(row.eventType)}</strong><small>${esc(row.eventId)}</small></td><td>${esc(row.provider)}</td><td>${esc(row.buyerRegion)}</td><td>${esc(row.originalCurrency)} ${esc(model.ledger.decimal(row.originalAmountMinor))}</td><td><strong>${esc(row.salesTaxType)}</strong><small>实际税率 ${percent(row.salesTaxRate)}</small></td><td>${esc(money(row.salesTaxMinor,row.settlementCurrency))}</td><td>${esc(money(row.providerFeeMinor,row.settlementCurrency))}</td><td><strong>${Number(row.fxRate).toFixed(4)}</strong><small>${esc(row.fxVersion)}</small></td><td class="fo-payable">${esc(money(row.payableMinor,row.settlementCurrency))}</td></tr>`).join('')}</tbody></table></div></div><footer><button type="button" data-fo-action="close-drawer">关闭</button></footer></aside></div>`;
  }

  const demoSwitcher = () => `<section class="fo-demo"><button type="button" data-fo-demo-toggle data-fo-action="demo-toggle" aria-expanded="${state.demoOpen}"><b>Demo</b><span>状态</span></button>${state.demoOpen ? `<aside><header><strong>结算场景</strong><button type="button" data-fo-action="demo-toggle" aria-label="关闭">×</button></header><button type="button" data-fo-action="scenario" data-fo-scenario="exhaustive" class="${state.scenario === 'exhaustive' ? 'is-active' : ''}">穷举态</button><button type="button" data-fo-action="scenario" data-fo-scenario="empty" class="${state.scenario === 'empty' ? 'is-active' : ''}">缺省态</button></aside>` : ''}</section>`;
  const renderPage = () => `<section class="fo-page" data-finance-operations data-fo-scenario-current="${state.scenario}" data-active-tab="${state.activeTab}"><nav class="fo-breadcrumb" data-fo-breadcrumb>发行平台后台 <span>/</span> 财务结算</nav><header class="fo-page-head"><h1>财务结算</h1><p>按财务主体生成线下打款名单，并下钻核对游戏与交易事实。</p></header><div class="fo-content">${tabs()}${filters()}${table()}</div>${demoSwitcher()}${transactionDrawer()}</section>`;

  const download = (content,filename) => {
    try {
      const href = URL.createObjectURL(new Blob([content],{ type:'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = href;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href),0);
      return true;
    } catch { return false; }
  };
  const rerender = () => {
    const current = document.querySelector('[data-finance-operations]');
    if (current) current.outerHTML = renderPage();
    document.body.classList.toggle('fo-overlay-open',Boolean(state.detailGameKey));
  };
  const readFilters = () => {
    const previous = activeFilters();
    state.filters[state.activeTab] = {
      ...previous,
      keyword:document.querySelector('[data-fo-filter="keyword"]')?.value.trim() || '',
      month:document.querySelector('[data-fo-filter="month"]')?.value || 'all',
      currency:document.querySelector('[data-fo-filter="currency"]')?.value || 'all',
      ...(state.activeTab === 'game' ? { provider:document.querySelector('[data-fo-filter="provider"]')?.value || 'all' } : {}),
    };
    state.pages[state.activeTab] = 1;
    state.selected[state.activeTab] = [];
    state.exportMessage = '';
  };

  document.addEventListener('change', event => {
    const target = event.target;
    if (target.matches('[data-fo-select-row]')) {
      const key = target.dataset.foSelectRow;
      state.selected[state.activeTab] = target.checked ? [...new Set([...state.selected[state.activeTab],key])] : state.selected[state.activeTab].filter(item => item !== key);
      rerender();
    }
    if (target.matches('[data-fo-select-page]')) {
      const keys = pageRows(activeRows()).map(row => row.key);
      state.selected[state.activeTab] = target.checked ? [...new Set([...state.selected[state.activeTab],...keys])] : state.selected[state.activeTab].filter(key => !keys.includes(key));
      rerender();
    }
  });

  document.addEventListener('click', event => {
    const control = event.target.closest('[data-fo-action]');
    if (!control || control.disabled) return;
    const action = control.dataset.foAction;
    if (action === 'close-drawer' && event.target.closest('[data-fo-stop]') && !event.target.closest('header button') && !event.target.closest('footer button')) return;
    if (action === 'tab') { state.activeTab = control.dataset.foTab; state.exportMessage = ''; rerender(); }
    if (action === 'query') { readFilters(); rerender(); }
    if (action === 'reset') {
      state.filters[state.activeTab] = state.activeTab === 'entity'
        ? { keyword:'',month:'2026-08',currency:'all' }
        : { keyword:'',month:'2026-08',currency:'all',provider:'all',entityVersion:'all',accountVersion:'all',linked:false };
      state.pages[state.activeTab] = 1; state.selected[state.activeTab] = []; state.exportMessage = ''; rerender();
    }
    if (action === 'page') { state.pages[state.activeTab] = Math.max(1,Number(control.dataset.foPage) || 1); rerender(); }
    if (action === 'view-transactions') { state.detailGameKey = control.dataset.rowKey; rerender(); }
    if (action === 'close-drawer') { state.detailGameKey = ''; rerender(); }
    if (action === 'export') {
      const rows = activeRows();
      const selected = selectedRows(rows);
      const targets = selected.length ? selected : rows;
      if (!targets.length) return;
      const isEntity = state.activeTab === 'entity';
      const content = isEntity ? model.ledger.exportEntityCsv(targets) : model.ledger.exportGameCsv(targets);
      const month = activeFilters().month === 'all' ? '全部月份' : activeFilters().month;
      const ok = download(content,`${isEntity ? '主体结算表' : '游戏结算明细'}_${month}.csv`);
      state.exportMessage = ok ? `已导出 ${targets.length} 条${isEntity ? '主体汇总' : '游戏明细'}` : '导出失败，请重试';
      if (ok) state.selected[state.activeTab] = [];
      rerender();
    }
    if (action === 'demo-toggle') { state.demoOpen = !state.demoOpen; rerender(); }
    if (action === 'scenario') { state.scenario = control.dataset.foScenario; state.demoOpen = false; state.pages = { entity:1,game:1 }; state.selected = { entity:[],game:[] }; state.detailGameKey = ''; rerender(); }
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && state.detailGameKey) { state.detailGameKey = ''; rerender(); } });

  const originalRender = namespace.templates.render.bind(namespace.templates);
  namespace.templates.render = options => options.route?.id === 'P16-01' ? renderPage() : originalRender(options);
  const originalShellRender = namespace.shell.renderBusiness.bind(namespace.shell);
  namespace.shell.renderBusiness = options => {
    let html = originalShellRender(options);
    if (options.role !== 'operations' || !options.routes.some(route => route.id === 'P16-01')) return html;
    const active = options.route.id === 'P16-01';
    const financeLink = `<a class="nav-item${active ? ' is-active' : ''}" href="#/P16-01"${active ? ' aria-current="page"' : ''}><span class="fo-nav-icon" aria-hidden="true"></span><span>财务结算</span></a>`;
    html = html.replace('企业认证、游戏审核与内容运营','企业认证、游戏审核、内容运营与财务结算');
    return html.replace(/(<aside class="side-nav side-nav--operations"[\s\S]*?<nav class="nav-list" aria-label="发行平台后台">)([\s\S]*?)(<\/nav><\/aside>)/,(_match,start,items,end) => `${start}${items}${financeLink}${end}`);
  };
  window.__financeOperationsDemo = { state, snapshot:() => ({
    snapshotId:state.ledgerState.snapshotId,
    activeTab:state.activeTab,
    filters:JSON.parse(JSON.stringify(state.filters)),
    entityRows:model.entityRows(state),
    gameRows:model.gameRows(state),
    immutable:Object.isFrozen(state.ledgerState.events) && state.ledgerState.events.every(Object.isFrozen),
  }) };
})(window.GameHubDeveloperPortal,window.PublisherFinanceOperationsModel);

window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};
((namespace, model) => {
  if (!model || !namespace.templates || !namespace.shell) return;

  const state = model.createState();
  const pageSize = 20;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const money = (minor, currency) => model.money(minor, currency);

  const visibleRecords = () => {
    if (state.scenario === 'empty') return [];
    const { keyword, month, currency } = state.filters;
    const query = keyword.trim().toLowerCase();
    return state.records.filter(record => {
      if (month !== 'all' && record.month !== month) return false;
      if (currency !== 'all' && record.currency !== currency) return false;
      if (!query) return true;
      return `${record.id} ${record.gameId} ${record.gameName} ${record.developer} ${record.entityName}`.toLowerCase().includes(query);
    });
  };

  const filters = () => `<section class="fo-filters" aria-label="结算记录筛选">
    <label><span>游戏／开发者／财务主体</span><input type="search" data-fo-filter="keyword" value="${esc(state.filters.keyword)}" placeholder="输入游戏、Game ID、开发者或财务主体"></label>
    <label><span>结算月</span><select data-fo-filter="month"><option value="all"${state.filters.month === 'all' ? ' selected' : ''}>全部月份</option><option value="2026-08"${state.filters.month === '2026-08' ? ' selected' : ''}>2026-08</option><option value="2026-07"${state.filters.month === '2026-07' ? ' selected' : ''}>2026-07</option><option value="2026-06"${state.filters.month === '2026-06' ? ' selected' : ''}>2026-06</option></select></label>
    <label><span>币种</span><select data-fo-filter="currency"><option value="all"${state.filters.currency === 'all' ? ' selected' : ''}>全部币种</option><option value="USD"${state.filters.currency === 'USD' ? ' selected' : ''}>USD</option><option value="CNY"${state.filters.currency === 'CNY' ? ' selected' : ''}>CNY</option></select></label>
    <div class="fo-filter-actions"><button type="button" data-fo-action="reset">重置</button><button type="button" class="is-primary" data-fo-action="query">查询</button></div>
  </section>`;

  const totals = records => {
    const grouped = records.reduce((map, record) => map.set(record.currency, (map.get(record.currency) || 0) + record.payableMinor), new Map());
    return [...grouped].map(([currency, minor]) => money(minor, currency)).join(' ＋ ') || '—';
  };

  const pagination = total => {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    state.page = Math.min(state.page, pages);
    const start = total ? (state.page - 1) * pageSize + 1 : 0;
    const end = Math.min(total, state.page * pageSize);
    return `<footer class="fo-pagination" data-fo-pagination><span>共 ${total} 条，每页 20 条${total ? ` · ${start}—${end}` : ''}</span><div><button type="button" data-fo-action="page" data-fo-page="${state.page - 1}"${state.page <= 1 ? ' disabled' : ''}>上一页</button><b>${state.page} / ${pages}</b><button type="button" data-fo-action="page" data-fo-page="${state.page + 1}"${state.page >= pages ? ' disabled' : ''}>下一页</button></div></footer>`;
  };

  const empty = () => state.scenario === 'empty'
    ? `<div class="fo-empty"><div>—</div><strong>暂无结算记录</strong><p>月度结算完成后，游戏结算明细会出现在这里。</p></div>`
    : `<div class="fo-empty"><div>—</div><strong>未找到符合条件的记录</strong><p>请调整筛选条件或重置后再试。</p></div>`;

  const table = () => {
    const records = visibleRecords();
    const pages = Math.max(1, Math.ceil(records.length / pageSize));
    state.page = Math.min(state.page, pages);
    const current = records.slice((state.page - 1) * pageSize, state.page * pageSize);
    const selected = records.filter(record => state.selectedIds.includes(record.id));
    const allSelected = current.length > 0 && current.every(record => state.selectedIds.includes(record.id));
    const exportRecords = selected.length ? selected : records;
    const exportLabel = selected.length ? `导出选中（${selected.length}）` : `导出当前结果（${records.length}）`;
    return `<section class="fo-card fo-table-card"><header class="fo-table-toolbar"><div><strong>游戏结算记录</strong><span>应付合计：${esc(totals(records))}</span></div><button type="button" class="is-primary" data-fo-action="export"${exportRecords.length ? '' : ' disabled'}>${exportLabel}</button></header>${current.length ? `<div class="fo-table-scroll"><table class="fo-table"><thead><tr><th class="fo-check"><input type="checkbox" aria-label="选择本页结算记录" data-fo-select-page${allSelected ? ' checked' : ''}></th><th>结算月／记录号</th><th>游戏</th><th>开发者／财务主体</th><th>销售额</th><th>退款</th><th>平台分成</th><th>调整额</th><th>应付金额</th><th>收款账户</th><th>最近导出</th></tr></thead><tbody>${current.map(record => `<tr data-fo-record-row data-record-id="${esc(record.id)}"><td class="fo-check"><input type="checkbox" aria-label="选择 ${esc(record.id)}" data-fo-select-record="${esc(record.id)}"${state.selectedIds.includes(record.id) ? ' checked' : ''}></td><td><strong>${esc(record.month)}</strong><small>${esc(record.id)}</small></td><td><strong>${esc(record.gameName)}</strong><small>${esc(record.gameId)}</small></td><td><strong>${esc(record.developer)}</strong><small>${esc(record.entityName)} · ${esc(record.entityVersion)}</small></td><td><strong class="fo-money">${esc(money(record.grossMinor, record.currency))}</strong></td><td>${esc(money(record.refundMinor, record.currency))}</td><td>${esc(money(record.platformShareMinor, record.currency))}</td><td class="${record.adjustmentMinor < 0 ? 'is-negative' : ''}">${esc(money(record.adjustmentMinor, record.currency))}</td><td><strong class="fo-money fo-payable">${esc(money(record.payableMinor, record.currency))}</strong></td><td><strong>${esc(record.bankName)}</strong><small>${esc(record.accountMasked)}</small></td><td>${record.lastExportedAt ? `<strong>${esc(record.lastExportedAt)}</strong><small>${esc(record.lastExportedBy)}</small>` : '<span class="fo-muted">未导出</span>'}</td></tr>`).join('')}</tbody></table></div>` : empty()}</section>${records.length ? pagination(records.length) : ''}`;
  };

  const demoSwitcher = () => `<section class="fo-demo"><button type="button" data-fo-demo-toggle data-fo-action="demo-toggle" aria-expanded="${state.demoOpen}"><b>Demo</b><span>状态</span></button>${state.demoOpen ? `<aside><header><strong>结算场景</strong><button type="button" data-fo-action="demo-toggle" aria-label="关闭">×</button></header><button type="button" data-fo-action="scenario" data-fo-scenario="exhaustive" class="${state.scenario === 'exhaustive' ? 'is-active' : ''}">穷举态</button><button type="button" data-fo-action="scenario" data-fo-scenario="empty" class="${state.scenario === 'empty' ? 'is-active' : ''}">缺省态</button></aside>` : ''}</section>`;

  const renderPage = () => `<section class="fo-page" data-finance-operations data-fo-scenario-current="${state.scenario}"><nav class="fo-breadcrumb" data-fo-breadcrumb>发行平台后台 <span>/</span> 财务结算</nav><header class="fo-page-head"><h1>财务结算</h1></header><div class="fo-content">${filters()}${table()}</div>${demoSwitcher()}</section>`;

  const download = records => {
    try {
      const blob = new Blob([model.exportCsv(records)], { type:'text/csv;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const month = state.filters.month === 'all' ? '全部月份' : state.filters.month;
      link.href = href;
      link.download = `游戏结算表_${month}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 0);
      return true;
    } catch {
      return false;
    }
  };

  const rerender = () => {
    const current = document.querySelector('[data-finance-operations]');
    if (current) current.outerHTML = renderPage();
  };

  const readFilters = () => {
    state.filters = {
      keyword:document.querySelector('[data-fo-filter="keyword"]')?.value.trim() || '',
      month:document.querySelector('[data-fo-filter="month"]')?.value || '2026-08',
      currency:document.querySelector('[data-fo-filter="currency"]')?.value || 'all',
    };
    state.page = 1;
    state.selectedIds = [];
  };

  document.addEventListener('change', event => {
    const target = event.target;
    if (target.matches('[data-fo-select-record]')) {
      const id = target.dataset.foSelectRecord;
      state.selectedIds = target.checked ? [...new Set([...state.selectedIds, id])] : state.selectedIds.filter(item => item !== id);
      rerender();
    }
    if (target.matches('[data-fo-select-page]')) {
      const records = visibleRecords();
      const pageIds = records.slice((state.page - 1) * pageSize, state.page * pageSize).map(record => record.id);
      state.selectedIds = target.checked ? [...new Set([...state.selectedIds, ...pageIds])] : state.selectedIds.filter(id => !pageIds.includes(id));
      rerender();
    }
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-fo-action]');
    if (!button) return;
    const action = button.dataset.foAction;
    if (action === 'query') { readFilters(); rerender(); }
    if (action === 'reset') { state.filters = { keyword:'', month:'2026-08', currency:'all' }; state.page = 1; state.selectedIds = []; rerender(); }
    if (action === 'page') { state.page = Math.max(1, Number(button.dataset.foPage) || 1); rerender(); }
    if (action === 'export') {
      const records = visibleRecords();
      const selected = records.filter(record => state.selectedIds.includes(record.id));
      const targets = selected.length ? selected : records;
      if (!targets.length) return;
      if (download(targets)) {
        model.markExported(state, targets.map(record => record.id));
        state.selectedIds = [];
      }
      rerender();
    }
    if (action === 'demo-toggle') { state.demoOpen = !state.demoOpen; rerender(); }
    if (action === 'scenario') { state.scenario = button.dataset.foScenario; state.demoOpen = false; state.page = 1; state.selectedIds = []; rerender(); }
  });

  const originalRender = namespace.templates.render.bind(namespace.templates);
  namespace.templates.render = options => options.route?.id === 'P16-01' ? renderPage() : originalRender(options);

  const originalShellRender = namespace.shell.renderBusiness.bind(namespace.shell);
  namespace.shell.renderBusiness = options => {
    let html = originalShellRender(options);
    if (options.role !== 'operations' || !options.routes.some(route => route.id === 'P16-01')) return html;
    const active = options.route.id === 'P16-01';
    const financeLink = `<a class="nav-item${active ? ' is-active' : ''}" href="#/P16-01"${active ? ' aria-current="page"' : ''}><span class="fo-nav-icon" aria-hidden="true"></span><span>财务结算</span></a>`;
    html = html.replace('企业认证、游戏审核与内容运营', '企业认证、游戏审核、内容运营与财务结算');
    return html.replace(/(<aside class="side-nav side-nav--operations"[\s\S]*?<nav class="nav-list" aria-label="发行平台后台">)([\s\S]*?)(<\/nav><\/aside>)/, (_match, start, items, end) => `${start}${items}${financeLink}${end}`);
  };
})(window.GameHubDeveloperPortal, window.PublisherFinanceOperationsModel);

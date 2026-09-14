window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};
((namespace, model) => {
  if (!model || !namespace.templates || !namespace.shell) return;

  const state = model.createState();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const label = value => model.statusText[value] || value || '—';
  const pageSize = 20;
  const toneFor = value => ({
    eligible:'success', locked:'success', approved:'success', not_required:'info', effective:'success', completed:'success', remitted:'success',
    waiting_export:'warning', exported:'info', processing:'info', partial:'warning', pending:'warning', reviewing:'warning', changing:'warning', held:'warning',
    failed:'danger', returned:'danger', cancelled:'muted', blocked:'danger', confirmed:'info',
  })[value] || 'muted';
  const tag = (text, tone = 'muted') => `<span class="fo-tag fo-tag--${tone}">${esc(text)}</span>`;
  const money = (minor, currency) => model.money(minor, currency);
  const formatStatus = value => ({
    locked:'已锁定', confirmed:'已确认', approved:'已通过', not_required:'无需发票', reviewing:'审核中', pending:'待提交',
    effective:'已生效', changing:'变更审核中', waiting_export:'待导出', exported:'已导出待财务', processing:'财务处理中',
    partial:'部分完成', completed:'已完成', cancelled:'已取消', remitted:'已汇出', failed:'失败', returned:'退回', held:'暂缓',
  })[value] || value || '—';

  const visibleStatements = () => {
    if (state.scenario === 'empty') return [];
    const filters = state.statementFilters;
    return state.statements.filter(item => {
      const eligibility = model.eligibility(item);
      const haystack = `${item.id} ${item.developer} ${item.entityName} ${item.source}`.toLowerCase();
      if (filters.keyword && !haystack.includes(filters.keyword.toLowerCase())) return false;
      if (filters.currency !== 'all' && item.currency !== filters.currency) return false;
      if (filters.period !== 'all' && !item.period.startsWith(filters.period)) return false;
      if (filters.status === 'eligible' && !eligibility.ok) return false;
      if (filters.status === 'blocked' && eligibility.ok) return false;
      return true;
    });
  };

  const visibleBatches = () => {
    if (state.scenario === 'empty') return [];
    const filters = state.batchFilters;
    return state.batches.filter(item => {
      const haystack = `${item.id} ${item.entityName} ${item.entityVersion}`.toLowerCase();
      if (filters.keyword && !haystack.includes(filters.keyword.toLowerCase())) return false;
      if (filters.status !== 'all' && item.status !== filters.status) return false;
      if (filters.period !== 'all' && !item.createdAt.startsWith(filters.period)) return false;
      return true;
    });
  };

  const pagination = (total, current, kind) => {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const start = total ? (current - 1) * pageSize + 1 : 0;
    const end = Math.min(total, current * pageSize);
    return `<footer class="fo-pagination" data-fo-pagination><span>共 ${total} 条，每页 20 条${total ? ` · ${start}—${end}` : ''}</span><div><button type="button" data-fo-action="page" data-fo-page-kind="${kind}" data-fo-page="${current - 1}"${current <= 1 ? ' disabled' : ''}>上一页</button><b>${current} / ${pages}</b><button type="button" data-fo-action="page" data-fo-page-kind="${kind}" data-fo-page="${current + 1}"${current >= pages ? ' disabled' : ''}>下一页</button></div></footer>`;
  };

  const empty = (title, copy) => `<div class="fo-empty"><div>—</div><strong>${esc(title)}</strong><p>${esc(copy)}</p></div>`;

  const statementFilters = () => `<section class="fo-filters" aria-label="待付款筛选">
    <label><span>结算单／开发者</span><input type="search" data-fo-filter="statement-keyword" value="${esc(state.statementFilters.keyword)}" placeholder="输入结算单号或开发者"></label>
    <label><span>账期</span><select data-fo-filter="statement-period"><option value="all">全部账期</option><option value="2026"${state.statementFilters.period === '2026' ? ' selected' : ''}>2026 年</option><option value="2025"${state.statementFilters.period === '2025' ? ' selected' : ''}>2025 年</option></select></label>
    <label><span>币种</span><select data-fo-filter="statement-currency"><option value="all">全部币种</option><option value="USD"${state.statementFilters.currency === 'USD' ? ' selected' : ''}>USD</option><option value="CNY"${state.statementFilters.currency === 'CNY' ? ' selected' : ''}>CNY</option></select></label>
    <label><span>付款条件</span><select data-fo-filter="statement-status"><option value="all">全部状态</option><option value="eligible"${state.statementFilters.status === 'eligible' ? ' selected' : ''}>可生成批次</option><option value="blocked"${state.statementFilters.status === 'blocked' ? ' selected' : ''}>暂不可付款</option></select></label>
    <div class="fo-filter-actions"><button type="button" data-fo-action="reset-statements">重置</button><button class="is-primary" type="button" data-fo-action="query-statements">查询</button></div>
  </section>`;

  const statementTable = () => {
    const items = visibleStatements();
    const pages = Math.max(1, Math.ceil(items.length / pageSize));
    state.statementPage = Math.min(state.statementPage, pages);
    const rows = items.slice((state.statementPage - 1) * pageSize, state.statementPage * pageSize);
    if (!rows.length) return `<section class="fo-card">${empty('暂无待付款记录', '符合条件的结算单会出现在这里。')}</section>${pagination(0, 1, 'statements')}`;
    const eligibleOnPage = rows.filter(item => model.eligibility(item).ok);
    const allSelected = eligibleOnPage.length > 0 && eligibleOnPage.every(item => state.selectedStatementIds.includes(item.id));
    return `<section class="fo-card fo-table-card"><div class="fo-table-scroll"><table class="fo-table"><thead><tr><th class="fo-check"><input type="checkbox" aria-label="选择本页可付款记录" data-fo-select-page${allSelected ? ' checked' : ''}></th><th>账期／结算单</th><th>开发者／财务主体</th><th>业务来源</th><th>应付金额</th><th>付款条件</th><th>预计付款日</th><th>更新时间</th></tr></thead><tbody>${rows.map(item => {
      const eligibility = model.eligibility(item);
      return `<tr data-fo-statement-row data-statement-id="${esc(item.id)}"><td class="fo-check"><input type="checkbox" aria-label="选择 ${esc(item.id)}" data-fo-select-statement="${esc(item.id)}"${eligibility.ok ? '' : ' disabled'}${state.selectedStatementIds.includes(item.id) ? ' checked' : ''}></td><td><strong>${esc(item.period)}</strong><small>${esc(item.id)}</small></td><td><strong>${esc(item.developer)}</strong><small>${esc(item.entityName)} · ${esc(item.entityVersion)}</small></td><td>${esc(item.source)}</td><td><strong class="fo-money">${esc(money(item.amountMinor, item.currency))}</strong><small>${esc(item.paymentMethod)}</small></td><td>${tag(eligibility.ok ? '可生成批次' : eligibility.reason, eligibility.ok ? 'success' : 'warning')}<small>${eligibility.ok ? `${formatStatus(item.reconciliationStatus)} · ${formatStatus(item.invoiceStatus)}` : ''}</small></td><td>${esc(item.plannedAt)}</td><td>${esc(item.updatedAt)}</td></tr>`;
    }).join('')}</tbody></table></div></section>${pagination(items.length, state.statementPage, 'statements')}`;
  };

  const bulkBar = () => {
    const selected = state.selectedStatementIds.map(id => state.statements.find(item => item.id === id)).filter(Boolean);
    const totals = selected.reduce((map, item) => map.set(item.currency, (map.get(item.currency) || 0) + item.amountMinor), new Map());
    const amount = [...totals].map(([currency, minor]) => money(minor, currency)).join(' + ') || '—';
    return `<section class="fo-bulk${selected.length ? ' is-active' : ''}"><div><strong>已选 ${selected.length} 条</strong><span>${esc(amount)}</span></div><button type="button" class="is-primary" data-fo-action="open-create"${selected.length ? '' : ' disabled'}>生成并导出打款批次</button></section>`;
  };

  const batchFilters = () => `<section class="fo-filters fo-filters--batch" aria-label="打款批次筛选">
    <label><span>批次号／财务主体</span><input type="search" data-fo-filter="batch-keyword" value="${esc(state.batchFilters.keyword)}" placeholder="输入批次号或主体"></label>
    <label><span>生成时间</span><select data-fo-filter="batch-period"><option value="all">全部时间</option><option value="2026-09"${state.batchFilters.period === '2026-09' ? ' selected' : ''}>2026-09</option><option value="2026-08"${state.batchFilters.period === '2026-08' ? ' selected' : ''}>2026-08</option></select></label>
    <label><span>批次状态</span><select data-fo-filter="batch-status"><option value="all">全部状态</option>${['waiting_export','exported','processing','partial','completed','cancelled'].map(value => `<option value="${value}"${state.batchFilters.status === value ? ' selected' : ''}>${formatStatus(value)}</option>`).join('')}</select></label>
    <div class="fo-filter-actions"><button type="button" data-fo-action="reset-batches">重置</button><button class="is-primary" type="button" data-fo-action="query-batches">查询</button></div>
  </section>`;

  const batchTable = () => {
    const items = visibleBatches();
    const pages = Math.max(1, Math.ceil(items.length / pageSize));
    state.batchPage = Math.min(state.batchPage, pages);
    const rows = items.slice((state.batchPage - 1) * pageSize, state.batchPage * pageSize);
    if (!rows.length) return `<section class="fo-card">${empty('暂无打款批次', '生成打款批次后可在这里查看导出和付款结果。')}</section>${pagination(0, 1, 'batches')}`;
    return `<section class="fo-card fo-table-card"><div class="fo-table-scroll"><table class="fo-table"><thead><tr><th>打款批次</th><th>财务主体</th><th>结算单</th><th>批次金额</th><th>付款方式</th><th>批次状态</th><th>生成／导出时间</th><th>操作</th></tr></thead><tbody>${rows.map(batch => `<tr data-fo-batch-row><td><strong>${esc(batch.id)}</strong><small>${esc(batch.createdBy)}</small></td><td><strong>${esc(batch.entityName)}</strong><small>${esc(batch.entityVersion)} · ${esc(batch.accountMasked)}</small></td><td>${batch.statementIds.length} 份<small>${esc(batch.statementIds.slice(0, 2).join('、'))}${batch.statementIds.length > 2 ? '…' : ''}</small></td><td><strong class="fo-money">${esc(money(batch.totalMinor, batch.currency))}</strong><small>${esc(batch.currency)}</small></td><td>${esc(batch.paymentMethod)}</td><td>${tag(formatStatus(batch.status), toneFor(batch.status))}</td><td><strong>${esc(batch.createdAt)}</strong><small>${batch.exportedAt ? `导出 ${esc(batch.exportedAt)}` : '尚未导出'}</small></td><td><button class="fo-text-button" type="button" data-fo-action="open-batch" data-fo-open-batch="${esc(batch.id)}">查看</button></td></tr>`).join('')}</tbody></table></div></section>${pagination(items.length, state.batchPage, 'batches')}`;
  };

  const createDialog = () => {
    if (state.modal !== 'create') return '';
    const preview = model.previewBatches(state, state.selectedStatementIds);
    const totals = preview.groups.map(group => ({ currency:group[0].currency, minor:group.reduce((sum, item) => sum + item.amountMinor, 0), entity:group[0].entityName }));
    return `<div class="fo-modal-layer"><button type="button" class="fo-backdrop" data-fo-action="close-modal" aria-label="取消生成"></button><section class="fo-modal" role="dialog" aria-modal="true" aria-labelledby="fo-create-title"><header><div><h2 id="fo-create-title">生成打款批次</h2><p>已选 ${preview.valid.length} 条，将生成 ${preview.groups.length} 个打款批次。</p></div><button type="button" data-fo-action="close-modal" aria-label="关闭">×</button></header><div class="fo-modal-body"><div class="fo-callout">系统按财务主体版本、币种和付款方式自动拆批；导出不代表已经付款。</div>${totals.map((item, index) => `<article class="fo-group-preview"><span>批次 ${index + 1}</span><strong>${esc(item.entity)}</strong><b>${esc(money(item.minor, item.currency))}</b></article>`).join('')}</div><footer><button type="button" data-fo-action="close-modal">取消</button><button type="button" class="is-primary" data-fo-action="confirm-create">确认生成并导出</button></footer></section></div>`;
  };

  const attemptList = order => `<div class="fo-attempts">${order.attempts.length ? [...order.attempts].reverse().map(attempt => `<article><header><strong>第 ${attempt.number} 次付款尝试</strong>${tag(formatStatus(attempt.status), toneFor(attempt.status))}</header><dl><div><dt>操作时间</dt><dd>${esc(attempt.createdAt)}</dd></div><div><dt>操作人</dt><dd>${esc(attempt.operator)}</dd></div><div><dt>复核人</dt><dd>${esc(attempt.reviewer || '—')}</dd></div>${attempt.bankReference ? `<div><dt>银行流水号</dt><dd>${esc(attempt.bankReference)}</dd></div>` : ''}${attempt.proofName ? `<div><dt>付款凭证</dt><dd>${esc(attempt.proofName)}</dd></div>` : ''}${attempt.reason ? `<div class="is-wide"><dt>原因</dt><dd>${esc(attempt.reason)}</dd></div>` : ''}</dl></article>`).join('') : '<p class="fo-muted">尚未登记付款结果。</p>'}</div>`;

  const batchDetail = batch => {
    const order = batch.orders.find(item => item.id === state.selectedOrderId) || batch.orders[0];
    if (state.drawerMode === 'result' && order) return resultForm(batch, order);
    return `<div class="fo-drawer-body"><section class="fo-detail-section"><h3>批次概要</h3><dl class="fo-detail-grid"><div><dt>批次号</dt><dd>${esc(batch.id)}</dd></div><div><dt>批次状态</dt><dd>${tag(formatStatus(batch.status), toneFor(batch.status))}</dd></div><div><dt>财务主体</dt><dd>${esc(batch.entityName)}</dd></div><div><dt>主体版本</dt><dd>${esc(batch.entityVersion)}</dd></div><div><dt>批次金额</dt><dd>${esc(money(batch.totalMinor, batch.currency))}</dd></div><div><dt>收款账户</dt><dd>${esc(batch.accountMasked)}</dd></div></dl></section><section class="fo-detail-section"><h3>付款单</h3>${batch.orders.map(item => {
      const canRecord = batch.status !== 'waiting_export' && batch.status !== 'cancelled' && model.allowedResults(item).length > 0;
      return `<article class="fo-order"><header><div><strong>${esc(item.id)}</strong><small>${esc(item.statementId || batch.statementIds.join('、'))}</small></div>${tag(formatStatus(item.status), toneFor(item.status))}</header><div><span>${esc(money(item.amountMinor, item.currency))}</span>${canRecord ? `<button type="button" data-fo-action="open-result" data-fo-order-id="${esc(item.id)}">${item.attempts.length ? '回填付款结果' : '登记付款结果'}</button>` : ''}</div>${attemptList(item)}</article>`;
    }).join('')}</section><section class="fo-detail-section"><h3>导出记录</h3><div class="fo-record-line"><span>${batch.exportedAt ? '已导出打款申请单' : '尚未导出'}</span><strong>${esc(batch.exportedAt || '—')}</strong><small>${esc(batch.exportedBy || '—')}</small><button type="button" data-fo-action="export-batch" data-fo-batch-id="${esc(batch.id)}">${batch.exportedAt ? '重新下载' : '导出'}</button></div></section><section class="fo-detail-section"><h3>操作记录</h3><ol class="fo-timeline">${[...batch.logs].reverse().map(log => `<li><i></i><div><strong>${esc(log.action)}</strong><span>${esc(log.actor)} · ${esc(log.time)}</span></div></li>`).join('')}</ol></section></div><footer class="fo-drawer-footer"><button type="button" data-fo-action="close-drawer">关闭</button>${batch.status === 'waiting_export' ? `<button type="button" class="is-primary" data-fo-action="export-batch" data-fo-batch-id="${esc(batch.id)}">导出申请单</button>` : ''}</footer>`;
  };

  const resultForm = (batch, order) => {
    const draft = state.resultDraft;
    const needsPayment = ['remitted','completed'].includes(draft.result);
    const needsReason = ['failed','returned','held'].includes(draft.result);
    const error = key => state.errors[key] ? `<small class="fo-error">${esc(state.errors[key])}</small>` : '';
    const results = model.allowedResults(order);
    const attemptNumber = ['remitted','held'].includes(order.status) && order.attempts.length ? order.attempts.length : order.attempts.length + 1;
    return `<form class="fo-result-form" data-fo-result-form><button type="button" class="fo-drawer-back" data-fo-action="back-batch">← 返回批次详情</button><section class="fo-detail-section"><h3>回填付款结果</h3><p>${esc(order.id)} · 当前为第 ${attemptNumber} 次付款尝试</p><div class="fo-form-grid"><label><span>付款结果</span><select data-fo-result-field="result" aria-label="付款结果">${results.map(value => `<option value="${value}"${draft.result === value ? ' selected' : ''}>${formatStatus(value)}</option>`).join('')}</select></label><label><span>复核人</span><input data-fo-result-field="reviewer" value="${esc(draft.reviewer)}" aria-label="复核人">${error('reviewer')}</label>${needsPayment ? `<label><span>实付金额</span><div class="fo-money-input"><span>${esc(order.currency)}</span><input type="number" min="0" step="0.01" data-fo-result-field="amount" value="${esc(draft.amount || (order.amountMinor / 100).toFixed(2))}" aria-label="实付金额"></div>${error('amount')}</label><label><span>付款时间</span><input type="datetime-local" data-fo-result-field="paidAt" value="${esc(draft.paidAt)}" aria-label="付款时间">${error('paidAt')}</label><label><span>银行流水号</span><input data-fo-result-field="bankReference" value="${esc(draft.bankReference)}" aria-label="银行流水号">${error('bankReference')}</label><label><span>付款凭证</span><input type="file" accept=".pdf,.png,.jpg,.jpeg" data-fo-proof aria-label="付款凭证"><em>${esc(draft.proofName || '支持 PDF、PNG、JPG，单个文件不超过 10 MB')}</em>${error('proofName')}</label>` : ''}${needsReason ? `<label class="is-wide"><span>失败、退回或暂缓原因</span><textarea rows="4" data-fo-result-field="reason" aria-label="失败、退回或暂缓原因">${esc(draft.reason)}</textarea>${error('reason')}</label>` : ''}</div></section><div class="fo-result-note">提交后会同步开发者端付款状态；失败或退回后再次付款会新增尝试记录。</div><footer class="fo-drawer-footer"><button type="button" data-fo-action="back-batch">取消</button><button type="button" class="is-primary" data-fo-action="submit-result">提交结果</button></footer></form>`;
  };

  const drawer = () => {
    const batch = state.batches.find(item => item.id === state.drawerBatchId);
    if (!batch) return '';
    return `<div class="fo-drawer-layer"><button type="button" class="fo-backdrop" data-fo-action="close-drawer" aria-label="关闭批次详情"></button><aside class="fo-drawer" role="dialog" aria-modal="true" aria-label="打款批次操作"><header class="fo-drawer-head"><div><h2>${state.drawerMode === 'result' ? '回填付款结果' : '打款批次详情'}</h2><p>${esc(batch.id)} · ${formatStatus(batch.status)}</p></div><button type="button" data-fo-action="close-drawer" aria-label="关闭">×</button></header>${batchDetail(batch)}</aside></div>`;
  };

  const demoSwitcher = () => `<section class="fo-demo"><button type="button" data-fo-demo-toggle data-fo-action="demo-toggle" aria-expanded="${state.demoOpen}"><b>Demo</b><span>状态</span></button>${state.demoOpen ? `<aside><header><strong>财务场景</strong><button type="button" data-fo-action="demo-toggle" aria-label="关闭">×</button></header><button type="button" data-fo-action="scenario" data-fo-scenario="exhaustive" class="${state.scenario === 'exhaustive' ? 'is-active' : ''}">穷举态</button><button type="button" data-fo-action="scenario" data-fo-scenario="empty" class="${state.scenario === 'empty' ? 'is-active' : ''}">缺省态</button></aside>` : ''}</section>`;

  const renderPage = () => `<section class="fo-page" data-finance-operations data-fo-scenario-current="${state.scenario}"><nav class="fo-breadcrumb" data-fo-breadcrumb>发行平台后台 <span>/</span> 财务结算</nav><header class="fo-page-head"><h1>财务结算</h1></header><nav class="fo-tabs" role="tablist" aria-label="财务结算任务"><button type="button" role="tab" data-fo-action="tab" data-fo-tab="statements" aria-selected="${state.tab === 'statements'}" class="${state.tab === 'statements' ? 'is-active' : ''}">待付款记录</button><button type="button" role="tab" data-fo-action="tab" data-fo-tab="batches" aria-selected="${state.tab === 'batches'}" class="${state.tab === 'batches' ? 'is-active' : ''}">打款批次</button></nav><div class="fo-content">${state.tab === 'statements' ? `${statementFilters()}${statementTable()}${bulkBar()}` : `${batchFilters()}${batchTable()}`}</div>${createDialog()}${drawer()}${demoSwitcher()}</section>`;

  const download = batches => {
    const blob = new Blob([model.exportCsv(batches)], { type:'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `打款申请_${batches[0]?.id || '批次'}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 0);
  };

  const rerender = () => {
    const current = document.querySelector('[data-finance-operations]');
    if (current) current.outerHTML = renderPage();
  };

  const readFilters = kind => {
    if (kind === 'statements') {
      state.statementFilters = {
        keyword:document.querySelector('[data-fo-filter="statement-keyword"]')?.value.trim() || '',
        period:document.querySelector('[data-fo-filter="statement-period"]')?.value || 'all',
        currency:document.querySelector('[data-fo-filter="statement-currency"]')?.value || 'all',
        status:document.querySelector('[data-fo-filter="statement-status"]')?.value || 'all',
      };
      state.statementPage = 1;
      state.selectedStatementIds = [];
    } else {
      state.batchFilters = {
        keyword:document.querySelector('[data-fo-filter="batch-keyword"]')?.value.trim() || '',
        period:document.querySelector('[data-fo-filter="batch-period"]')?.value || 'all',
        status:document.querySelector('[data-fo-filter="batch-status"]')?.value || 'all',
      };
      state.batchPage = 1;
    }
  };

  const resetResultDraft = order => {
    state.resultDraft = { result:model.allowedResults(order)[0] || 'remitted', amount:(order.amountMinor / 100).toFixed(2), paidAt:'2026-09-14T16:30', bankReference:'', proofName:'', proofFile:null, reason:'', reviewer:'财务 王琪' };
    state.errors = {};
  };

  document.addEventListener('change', event => {
    const target = event.target;
    if (target.matches('[data-fo-select-statement]')) {
      const id = target.dataset.foSelectStatement;
      state.selectedStatementIds = target.checked ? [...new Set([...state.selectedStatementIds, id])] : state.selectedStatementIds.filter(item => item !== id);
      rerender();
    }
    if (target.matches('[data-fo-select-page]')) {
      const pageIds = visibleStatements().slice((state.statementPage - 1) * pageSize, state.statementPage * pageSize).filter(item => model.eligibility(item).ok).map(item => item.id);
      state.selectedStatementIds = target.checked ? [...new Set([...state.selectedStatementIds, ...pageIds])] : state.selectedStatementIds.filter(id => !pageIds.includes(id));
      rerender();
    }
    if (target.matches('[data-fo-result-field]')) {
      state.resultDraft[target.dataset.foResultField] = target.value;
      if (target.dataset.foResultField === 'result') { state.errors = {}; rerender(); }
    }
    if (target.matches('[data-fo-proof]')) {
      const file = target.files?.[0];
      const allowed = /\.(pdf|png|jpe?g)$/i;
      state.resultDraft.proofFile = file || null;
      state.resultDraft.proofName = file?.name || '';
      state.errors.proofName = file && !allowed.test(file.name) ? '仅支持 PDF、PNG、JPG' : file && file.size > 10 * 1024 * 1024 ? '文件不能超过 10 MB' : '';
      rerender();
    }
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-fo-action]');
    if (!button) return;
    const action = button.dataset.foAction;
    if (action === 'tab') { state.tab = button.dataset.foTab; state.modal = ''; state.drawerBatchId = ''; rerender(); }
    if (action === 'query-statements') { readFilters('statements'); rerender(); }
    if (action === 'query-batches') { readFilters('batches'); rerender(); }
    if (action === 'reset-statements') { state.statementFilters = { keyword:'', currency:'all', status:'all', period:'all' }; state.statementPage = 1; state.selectedStatementIds = []; rerender(); }
    if (action === 'reset-batches') { state.batchFilters = { keyword:'', status:'all', period:'all' }; state.batchPage = 1; rerender(); }
    if (action === 'page') {
      const key = button.dataset.foPageKind === 'statements' ? 'statementPage' : 'batchPage';
      state[key] = Math.max(1, Number(button.dataset.foPage) || 1); rerender();
    }
    if (action === 'open-create') { state.modal = 'create'; rerender(); }
    if (action === 'close-modal') { state.modal = ''; rerender(); }
    if (action === 'confirm-create') {
      const batches = model.createBatches(state, state.selectedStatementIds);
      if (!batches.length) { state.modal = ''; rerender(); return; }
      download(batches); state.modal = ''; state.tab = 'batches'; state.drawerBatchId = batches[0].id; state.drawerMode = 'detail'; rerender();
    }
    if (action === 'open-batch') { state.drawerBatchId = button.dataset.foOpenBatch; state.drawerMode = 'detail'; rerender(); }
    if (action === 'close-drawer') { state.drawerBatchId = ''; state.drawerMode = 'detail'; rerender(); }
    if (action === 'open-result') {
      const batch = state.batches.find(item => item.id === state.drawerBatchId);
      const order = batch?.orders.find(item => item.id === button.dataset.foOrderId);
      if (!order) return;
      state.selectedOrderId = order.id; state.drawerMode = 'result'; resetResultDraft(order); rerender();
    }
    if (action === 'back-batch') { state.drawerMode = 'detail'; state.errors = {}; rerender(); }
    if (action === 'export-batch') {
      const batch = state.batches.find(item => item.id === button.dataset.foBatchId);
      if (!batch) return;
      if (!batch.exportedAt) {
        batch.exportedAt = model.now(); batch.exportedBy = '平台运营 李然'; batch.status = 'exported';
        batch.logs.push({ action:'导出打款申请单', actor:'平台运营 李然', time:model.now() });
      }
      download([batch]); rerender();
    }
    if (action === 'submit-result') {
      const batch = state.batches.find(item => item.id === state.drawerBatchId);
      const order = batch?.orders.find(item => item.id === state.selectedOrderId);
      if (!order) return;
      const result = state.resultDraft.result;
      const errors = {};
      if (['remitted','completed'].includes(result)) {
        const amountMinor = Math.round(Number(state.resultDraft.amount || 0) * 100);
        if (!(amountMinor > 0)) errors.amount = '请填写实付金额';
        else if (amountMinor !== order.amountMinor) errors.amount = `实付金额应为 ${money(order.amountMinor, order.currency)}`;
        if (!state.resultDraft.paidAt) errors.paidAt = '请选择付款时间';
        if (!state.resultDraft.bankReference.trim()) errors.bankReference = '请填写银行流水号';
        if (!state.resultDraft.proofName) errors.proofName = '请上传付款凭证';
      }
      if (!state.resultDraft.reviewer.trim()) errors.reviewer = '请填写复核人';
      if (['failed','returned','held'].includes(result) && !state.resultDraft.reason.trim()) errors.reason = '请填写原因';
      state.errors = errors;
      if (Object.keys(errors).length) { rerender(); requestAnimationFrame(() => document.querySelector('.fo-error')?.closest('label')?.querySelector('input,textarea,select')?.focus()); return; }
      model.recordAttempt(state, order.id, {
        result, amountMinor:Math.round(Number(state.resultDraft.amount || 0) * 100), paidAt:state.resultDraft.paidAt.replace('T', ' '),
        bankReference:state.resultDraft.bankReference.trim(), proofName:state.resultDraft.proofName, reason:state.resultDraft.reason.trim(), reviewer:state.resultDraft.reviewer.trim(),
      });
      state.drawerMode = 'detail'; state.errors = {}; rerender();
    }
    if (action === 'demo-toggle') { state.demoOpen = !state.demoOpen; rerender(); }
    if (action === 'scenario') {
      state.scenario = button.dataset.foScenario; state.demoOpen = false; state.selectedStatementIds = []; state.drawerBatchId = ''; state.modal = ''; state.statementPage = 1; state.batchPage = 1; rerender();
    }
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

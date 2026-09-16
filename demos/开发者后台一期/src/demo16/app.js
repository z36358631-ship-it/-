window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};
((namespace,model) => {
  'use strict';
  if (!model || !namespace.templates || !namespace.shell) return;

  const state = model.createState();
  const PAGE_SIZE = 20;
  const esc = value => String(value ?? '').replace(/[&<>"']/g,char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char]);
  const amount = minor => (Number(minor || 0) / 100).toLocaleString('zh-CN',{ minimumFractionDigits:2,maximumFractionDigits:2 });
  const percent = value => value == null ? '—' : `${Number(value).toFixed(2).replace(/\.00$/,'')}%`;
  const statusLabel = value => value === 'confirmed' ? '已确认' : '待确认';
  const activeFilters = () => state.filters[state.activeTab];
  const activeRows = () => state.activeTab === 'entity' ? model.entityRows(state) : model.gameRows(state);
  const rowKey = row => row.id;
  const option = (value,label,selected) => `<option value="${esc(value)}"${selected === value ? ' selected' : ''}>${esc(label)}</option>`;
  const selectOptions = (values,selected,allLabel,label = value => value) => `${option('all',allLabel,selected)}${values.map(value => option(value,label(value),selected)).join('')}`;
  const unique = (rows,key) => [...new Set(rows.map(row => row[key]).filter(Boolean))].sort((a,b) => String(b).localeCompare(String(a)));

  const tabs = () => `<div class="fo-tabs" role="tablist" aria-label="财务结算视图"><button type="button" role="tab" aria-selected="${state.activeTab === 'entity'}" class="${state.activeTab === 'entity' ? 'is-active' : ''}" data-fo-action="tab" data-fo-tab="entity">主体汇总</button><button type="button" role="tab" aria-selected="${state.activeTab === 'game'}" class="${state.activeTab === 'game' ? 'is-active' : ''}" data-fo-action="tab" data-fo-tab="game">游戏明细</button></div>`;
  function filters() {
    const item = activeFilters();
    const rows = model.allGameRows(state);
    if (state.activeTab === 'entity') return `<section class="fo-filters" aria-label="主体汇总筛选"><label class="fo-keyword"><span>开发者／财务主体</span><input type="search" data-fo-filter="keyword" value="${esc(item.keyword)}" placeholder="输入开发者或财务主体"></label><label><span>账单月份</span><select data-fo-filter="billingMonth">${selectOptions(unique(rows,'billingMonth'),item.billingMonth,'全部月份')}</select></label><label><span>状态</span><select data-fo-filter="status">${option('all','全部状态',item.status)}${option('pending','待确认',item.status)}${option('confirmed','已确认',item.status)}</select></label><div class="fo-filter-actions"><button type="button" data-fo-action="reset">重置</button><button type="button" class="is-primary" data-fo-action="query">查询</button></div></section>`;
    const games = new Map(rows.map(row => [row.gameId,row.gameName]));
    const itemLabels = new Map(rows.map(row => [row.itemType,row.itemLabel]));
    return `<section class="fo-filters fo-game-filters" aria-label="游戏明细筛选"><label class="fo-keyword"><span>开发者／财务主体</span><input type="search" data-fo-filter="keyword" value="${esc(item.keyword)}" placeholder="输入开发者或财务主体"></label><label><span>游戏</span><select data-fo-filter="gameId">${selectOptions([...games.keys()].sort(),item.gameId,'全部游戏',value => `${games.get(value)}（${value}）`)}</select></label><label><span>账单月份</span><select data-fo-filter="billingMonth">${selectOptions(unique(rows,'billingMonth'),item.billingMonth,'全部月份')}</select></label><label><span>结算月份</span><select data-fo-filter="settlementMonth">${selectOptions(unique(rows,'settlementMonth'),item.settlementMonth,'全部月份')}</select></label><label><span>结算项</span><select data-fo-filter="itemType">${selectOptions([...itemLabels.keys()],item.itemType,'全部结算项',value => itemLabels.get(value))}</select></label><label><span>状态</span><select data-fo-filter="status">${option('all','全部状态',item.status)}${option('pending','待确认',item.status)}${option('confirmed','已确认',item.status)}</select></label><div class="fo-filter-actions"><button type="button" data-fo-action="reset">重置</button><button type="button" class="is-primary" data-fo-action="query">查询</button></div></section>`;
  }

  const pageRows = rows => {
    const pages = Math.max(1,Math.ceil(rows.length / PAGE_SIZE));
    state.pages[state.activeTab] = Math.max(1,Math.min(state.pages[state.activeTab],pages));
    return rows.slice((state.pages[state.activeTab] - 1) * PAGE_SIZE,state.pages[state.activeTab] * PAGE_SIZE);
  };
  const pagination = total => {
    const page = state.pages[state.activeTab];
    const pages = Math.max(1,Math.ceil(total / PAGE_SIZE));
    return `<footer class="fo-pagination" data-fo-pagination data-page-size="20"><span>共 ${total} 条，每页 20 条</span><div><button type="button" data-fo-action="page" data-fo-page="${page - 1}"${page <= 1 ? ' disabled' : ''}>上一页</button><b>${page} / ${pages}</b><button type="button" data-fo-action="page" data-fo-page="${page + 1}"${page >= pages ? ' disabled' : ''}>下一页</button></div></footer>`;
  };
  const empty = () => state.scenario === 'empty'
    ? `<div class="fo-empty"><div>—</div><strong>${state.activeTab === 'entity' ? '暂无主体结算记录' : '暂无游戏结算明细'}</strong><p>账单锁定后，记录会展示在这里。</p></div>`
    : `<div class="fo-empty"><div>—</div><strong>未找到符合条件的记录</strong><p>请调整当前页签的筛选条件或重置后再试。</p></div>`;
  const selectedRows = rows => rows.filter(row => state.selected[state.activeTab].includes(rowKey(row)));

  function entityTable(_rows,current) {
    const exportableOnPage = current;
    const allSelected = exportableOnPage.length && exportableOnPage.every(row => state.selected.entity.includes(row.id));
    return `<div class="fo-table-scroll"><table class="fo-table fo-entity-table" data-testid="entity-summary-table"><thead><tr><th class="fo-check"><input type="checkbox" aria-label="选择本页主体" data-fo-select-page${allSelected ? ' checked' : ''}${exportableOnPage.length ? '' : ' disabled'}></th><th>账单月份</th><th>开发者</th><th>财务主体</th><th>主体版本</th><th>账户版本</th><th>游戏及 DLC 销售金额</th><th>CDKEY 销售金额</th><th>用户实付</th><th>平台实收</th><th>支付费</th><th>综合税率／税费</th><th>退款与拒付</th><th>平台分成比例</th><th>平台分成</th><th>应结算金额（CNY）</th><th>应结算金额（USD）</th><th>银行账户名</th><th>银行账号</th><th>开户行</th></tr></thead><tbody>${current.map(row => `<tr data-fo-entity-row data-row-key="${esc(row.id)}" data-status="${esc(row.status)}" data-payable-minor="${row.payableMinor}" data-usd-minor="${row.payableUsdMinor ?? ''}"><td class="fo-check"><input type="checkbox" aria-label="选择 ${esc(row.entityName)} ${esc(row.billingMonth)}" data-fo-select-row="${esc(row.id)}"${state.selected.entity.includes(row.id) ? ' checked' : ''}></td><td><strong>${esc(row.billingMonth)}</strong><small>${esc(statusLabel(row.status))}</small></td><td><strong>${esc(row.developerName)}</strong><small>${esc(row.developerId)}</small></td><td>${esc(row.entityName)}</td><td>${esc(row.entityVersion)}</td><td>${esc(row.accountVersion)}</td><td data-fo-amount>${esc(amount(row.gameSalesMinor))}</td><td data-fo-amount>${esc(amount(row.cdkeySalesMinor))}</td><td data-fo-amount>${esc(amount(row.userPaidMinor))}</td><td data-fo-amount>${esc(amount(row.platformReceivedMinor))}</td><td data-fo-amount>${esc(amount(row.paymentFeeMinor))}</td><td data-fo-amount><strong>${esc(row.weightedTaxRate == null ? '—' : percent(row.weightedTaxRate * 100))}</strong><small>${esc(amount(row.taxMinor))}</small></td><td data-fo-amount>${esc(amount(row.refundChargebackMinor))}</td><td data-fo-amount>${esc(percent(row.platformShareRate))}</td><td data-fo-amount>${esc(amount(row.platformShareMinor))}</td><td class="fo-payable" data-fo-amount>${esc(amount(row.payableMinor))}</td><td class="fo-payable" data-fo-amount>${row.payableUsdMinor == null ? '—' : esc(amount(row.payableUsdMinor))}</td><td>${esc(row.bankAccountName)}</td><td>${esc(row.bankAccount)}</td><td>${esc(row.bankName)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function gameTable(_rows,current) {
    const exportableOnPage = current;
    const allSelected = exportableOnPage.length && exportableOnPage.every(row => state.selected.game.includes(row.id));
    return `<div class="fo-table-scroll"><table class="fo-table fo-game-table" data-testid="game-detail-table"><thead><tr><th class="fo-check"><input type="checkbox" aria-label="选择本页游戏明细" data-fo-select-page${allSelected ? ' checked' : ''}${exportableOnPage.length ? '' : ' disabled'}></th><th>开发者／财务主体</th><th>游戏 ID</th><th>游戏名称</th><th>账单月份</th><th>结算月份</th><th>结算项</th><th>用户实付</th><th>平台实收</th><th>平台分成比例</th><th>平台分成</th><th>应结算金额（CNY）</th><th>状态</th><th>操作</th></tr></thead><tbody>${current.map(row => {
      const action = row.itemType === 'game_sales_share' ? 'view-game-sales' : row.itemType === 'cdkey_sales_share' ? 'view-cdkey' : '';
      return `<tr data-fo-game-row data-row-key="${esc(row.id)}" data-statement-id="${esc(row.id)}" data-game-id="${esc(row.gameId)}" data-billing-month="${esc(row.billingMonth)}" data-settlement-month="${esc(row.settlementMonth)}" data-item-type="${esc(row.itemType)}" data-platform-received-minor="${row.platformReceivedMinor}" data-platform-share-minor="${row.platformShareMinor}" data-payable-minor="${row.payableMinor}" data-status="${esc(row.status)}"><td class="fo-check"><input type="checkbox" aria-label="选择 ${esc(row.gameName)} ${esc(row.itemLabel)}" data-fo-select-row="${esc(row.id)}"${state.selected.game.includes(row.id) ? ' checked' : ''}></td><td><strong>${esc(row.developerName)}</strong><small>${esc(row.entityName)}</small></td><td>${esc(row.gameId)}</td><td><strong>${esc(row.gameName)}</strong></td><td>${esc(row.billingMonth)}</td><td>${esc(row.settlementMonth)}</td><td>${esc(row.itemLabel)}</td><td data-fo-amount>${esc(amount(row.userPaidMinor))}</td><td data-fo-amount>${esc(amount(row.platformReceivedMinor))}</td><td data-fo-amount>${esc(percent(row.platformShareRate))}</td><td data-fo-amount>${esc(amount(row.platformShareMinor))}</td><td class="fo-payable" data-fo-amount>${esc(amount(row.payableMinor))}</td><td><span class="fo-status ${row.status === 'confirmed' ? 'is-confirmed' : 'is-pending'}">${esc(statusLabel(row.status))}</span></td><td>${action ? `<button type="button" class="fo-link" data-fo-action="${action}" data-row-key="${esc(row.id)}">查看详情</button>` : '—'}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function table() {
    const rows = activeRows();
    const current = pageRows(rows);
    const selected = selectedRows(rows);
    const targets = selected.length ? selected : rows;
    const label = selected.length ? `导出选中（${selected.length}）` : `导出当前结果（${rows.length}）`;
    const tierButton = state.activeTab === 'entity' ? `<button type="button" data-fo-action="open-tier-editor">配置阶梯分成</button>` : '';
    return `<section class="fo-card fo-table-card"><header class="fo-table-toolbar"><div><strong>${state.activeTab === 'entity' ? '主体结算汇总' : '游戏结算明细'}</strong><span>${state.activeTab === 'entity' ? '核对主体结算快照' : '核对各游戏结算快照'}</span></div><div class="fo-toolbar-actions">${tierButton}<button type="button" class="is-primary" data-fo-action="export"${targets.length ? '' : ' disabled'}>${label}</button></div></header>${state.tierMessage ? `<div class="fo-export-message" data-fo-tier-status>${esc(state.tierMessage)}</div>` : ''}${state.exportMessage ? `<div class="fo-export-message ${state.exportMessage.includes('失败') ? 'is-error' : ''}" data-fo-export-status>${esc(state.exportMessage)}</div>` : ''}${current.length ? (state.activeTab === 'entity' ? entityTable(rows,current) : gameTable(rows,current)) : empty()}</section>${rows.length ? pagination(rows.length) : ''}`;
  }

  const detailSummary = row => `<section class="fo-drawer-summary fo-detail-summary"><div><span>用户实付</span><strong>${esc(amount(row.userPaidMinor))}</strong></div><div><span>平台实收</span><strong>${esc(amount(row.platformReceivedMinor))}</strong></div><div><span>平台分成比例</span><strong>${esc(percent(row.platformShareRate))}</strong></div><div><span>平台分成</span><strong>${esc(amount(row.platformShareMinor))}</strong></div><div><span>应结算金额（CNY）</span><strong>${esc(amount(row.payableMinor))}</strong></div></section>`;
  const gameSalesDrawer = statement => {
    const details = statement.gameSalesDetails || [];
    return `<div class="fo-drawer-layer" data-fo-action="close-drawer"><aside class="fo-drawer" role="dialog" aria-modal="true" aria-label="游戏销售分成明细" data-fo-stop><header><div><h2>游戏销售分成明细</h2><p>${esc(statement.gameName)} · ${esc(statement.billingMonth)} 账单 / ${esc(statement.settlementMonth)} 结算</p></div><button type="button" data-fo-action="close-drawer" aria-label="关闭">×</button></header><div class="fo-drawer-body">${detailSummary(statement)}<div class="fo-table-scroll"><table class="fo-table fo-game-sales-detail" data-testid="fo-game-sales-detail-table"><thead><tr><th>商品类型</th><th>商品名称</th><th>用户实付</th><th>平台实收</th><th>平台分成比例</th><th>平台分成</th><th>应结算金额（CNY）</th></tr></thead><tbody>${details.map(item => `<tr><td>${esc(item.productType)}</td><td><strong>${esc(item.productName)}</strong></td><td>${esc(amount(item.userPaidMinor))}</td><td>${esc(amount(item.platformReceivedMinor))}</td><td>${esc(percent(item.platformShareRate))}</td><td>${esc(amount(item.platformShareMinor))}</td><td class="fo-payable">${esc(amount(item.payableMinor))}</td></tr>`).join('')}</tbody></table></div></div><footer><button type="button" data-fo-action="close-drawer">关闭</button></footer></aside></div>`;
  };
  const cdkeyDrawer = statement => {
    const details = statement.cdkeyDetails || [];
    return `<div class="fo-drawer-layer" data-fo-action="close-drawer"><aside class="fo-drawer" role="dialog" aria-modal="true" aria-label="CDKEY 销售明细" data-fo-stop><header><div><h2>CDKEY 销售明细</h2><p>${esc(statement.gameName)} · ${esc(statement.billingMonth)} 账单 / ${esc(statement.settlementMonth)} 结算</p></div><button type="button" data-fo-action="close-drawer" aria-label="关闭">×</button></header><div class="fo-drawer-body">${detailSummary(statement)}<div class="fo-table-scroll"><table class="fo-table fo-cdkey-table" data-testid="fo-cdkey-detail-table"><thead><tr><th>渠道</th><th>商品类型</th><th>商品／DLC</th><th>用户实付</th><th>平台实收</th><th>平台分成比例</th><th>平台分成</th><th>应结算金额（CNY）</th></tr></thead><tbody>${details.map(item => `<tr data-fo-cdkey-row><td>${esc(item.channel)}</td><td>${esc(item.productType)}</td><td><strong>${esc(item.productName)}</strong></td><td>${esc(amount(item.userPaidMinor))}</td><td>${esc(amount(item.platformReceivedMinor))}</td><td>${esc(percent(item.platformShareRate))}</td><td>${esc(amount(item.platformShareMinor))}</td><td class="fo-payable">${esc(amount(item.payableMinor))}</td></tr>`).join('')}</tbody></table></div></div><footer><button type="button" data-fo-action="close-drawer">关闭</button></footer></aside></div>`;
  };
  function detailDrawer() {
    if (!state.detailStatementId) return '';
    const statement = model.allGameRows(state).find(row => row.id === state.detailStatementId);
    if (!statement) return '';
    return statement.itemType === 'game_sales_share' ? gameSalesDrawer(statement) : statement.itemType === 'cdkey_sales_share' ? cdkeyDrawer(statement) : '';
  }

  const financialEntityOptions = () => {
    const map = new Map(model.allGameRows(state).map(row => [row.developerId,{ id:row.developerId,name:row.entityName,developerName:row.developerName }]));
    return [...map.values()].sort((a,b) => a.name.localeCompare(b.name,'zh-CN'));
  };
  const normalizeDraftTiers = tiers => tiers.map((tier,index) => ({
    ...tier,
    fromMinor:index === 0 ? 0 : tiers[index - 1].toMinor,
    toMinor:index === tiers.length - 1 ? null : tier.toMinor,
  }));
  const createTierDraft = financialEntityId => {
    const rule = model.statements.tierRuleFor(state.statementState,financialEntityId,'2026-09-01');
    const isDefault = rule.id.startsWith('TIER-DEFAULT-');
    return {
      financialEntityId,
      startDate:isDefault ? '2026-09-01' : rule.startDate,
      endDate:isDefault ? '' : rule.endDate,
      reason:'',
      tiers:rule.tiers.map(tier => ({ ...tier })),
    };
  };
  const openTierEditor = () => {
    const entity = financialEntityOptions()[0];
    state.tierDraft = createTierDraft(entity.id); state.tierError = ''; state.tierEditorOpen = true;
  };
  const tierEditor = () => {
    if (!state.tierEditorOpen || !state.tierDraft) return '';
    const draft = state.tierDraft;
    const entities = financialEntityOptions();
    const cards = draft.tiers.map((tier,index) => {
      const first = index === 0;
      const last = index === draft.tiers.length - 1;
      const removable = !first && !last;
      const lower = tier.fromMinor === '' || tier.fromMinor == null ? '—' : amount(tier.fromMinor).replace(/\.00$/,'');
      const upper = last
        ? `<span class="fo-tier-boundary is-fixed">不设上限</span>`
        : `<input name="to" type="number" min="0" step="0.01" value="${tier.toMinor === '' || tier.toMinor == null ? '' : esc(tier.toMinor / 100)}" aria-label="第 ${index + 1} 档上限金额">`;
      return `<article class="fo-tier-card" data-tier-card data-tier-index="${index}"><header><strong>第 ${index + 1} 档</strong>${removable ? `<button type="button" data-fo-action="remove-tier" data-tier-index="${index}">删除</button>` : ''}</header><div class="fo-tier-expression"><span class="fo-tier-boundary is-fixed">${esc(lower)}</span><b>&lt;</b><span>月结算金额（元）</span><b>${last ? '&lt;' : '≤'}</b>${upper}</div><label class="fo-tier-rate"><span>平台分成比例</span><input name="rate" type="number" min="0" max="100" step="0.01" value="${tier.platformRate === '' || tier.platformRate == null ? '' : esc(tier.platformRate)}"><i>%</i></label></article>`;
    }).join('');
    return `<div class="fo-drawer-layer" data-fo-action="close-tier-editor"><aside class="fo-drawer fo-tier-editor" role="dialog" aria-modal="true" aria-label="配置阶梯分成" data-fo-stop><header><h2>配置阶梯分成</h2><button type="button" data-fo-action="close-tier-editor" aria-label="关闭">×</button></header><div class="fo-drawer-body"><form data-fo-tier-form><section class="fo-tier-base"><label class="wide"><span>财务主体</span><select name="financialEntityId" required>${entities.map(item => option(item.id,`${item.name}（${item.developerName}）`,draft.financialEntityId)).join('')}</select></label><label><span>开始日期</span><input type="date" name="startDate" required value="${esc(draft.startDate)}"></label><label><span>结束日期（选填）</span><input type="date" name="endDate" value="${esc(draft.endDate)}"></label><label class="wide"><span>变更原因（选填）</span><input name="reason" value="${esc(draft.reason)}"></label></section><section class="fo-tier-list"><header><strong>平台分成阶梯</strong><button type="button" data-fo-action="add-tier">＋ 添加档位</button></header><div class="fo-tier-grid">${cards}</div></section>${state.tierError ? `<div class="fo-tier-error" role="alert">${esc(state.tierError)}</div>` : ''}</form></div><footer><button type="button" data-fo-action="close-tier-editor">取消</button><button type="button" class="is-primary" data-fo-action="save-tier">保存规则</button></footer></aside></div>`;
  };

  const demoSwitcher = () => `<section class="fo-demo"><button type="button" data-fo-demo-toggle data-fo-action="demo-toggle" aria-expanded="${state.demoOpen}"><b>Demo</b><span>状态</span></button>${state.demoOpen ? `<aside><header><strong>结算场景</strong><button type="button" data-fo-action="demo-toggle" aria-label="关闭">×</button></header><button type="button" data-fo-action="scenario" data-fo-scenario="exhaustive" class="${state.scenario === 'exhaustive' ? 'is-active' : ''}">穷举态</button><button type="button" data-fo-action="scenario" data-fo-scenario="empty" class="${state.scenario === 'empty' ? 'is-active' : ''}">缺省态</button></aside>` : ''}</section>`;
  const renderPage = () => `<section class="fo-page" data-finance-operations data-fo-scenario-current="${state.scenario}" data-active-tab="${state.activeTab}"><nav class="fo-breadcrumb" data-fo-breadcrumb>发行平台后台 <span>/</span> 财务结算</nav><header class="fo-page-head"><h1>财务结算</h1><p>按结算快照核账并导出结算记录。</p></header><div class="fo-content">${tabs()}${filters()}${table()}</div>${demoSwitcher()}${detailDrawer()}${tierEditor()}</section>`;

  const download = (content,filename) => {
    try {
      const href = URL.createObjectURL(new Blob([content],{ type:'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = href; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(href),0); return true;
    } catch { return false; }
  };
  const rerender = () => {
    const current = document.querySelector('[data-finance-operations]');
    if (current) current.outerHTML = renderPage();
    document.body.classList.toggle('fo-overlay-open',Boolean(state.detailStatementId || state.tierEditorOpen));
  };
  const readFilters = () => {
    state.filters[state.activeTab] = state.activeTab === 'entity'
      ? { keyword:document.querySelector('[data-fo-filter="keyword"]')?.value.trim() || '', billingMonth:document.querySelector('[data-fo-filter="billingMonth"]')?.value || 'all', status:document.querySelector('[data-fo-filter="status"]')?.value || 'all' }
      : { keyword:document.querySelector('[data-fo-filter="keyword"]')?.value.trim() || '', gameId:document.querySelector('[data-fo-filter="gameId"]')?.value || 'all', billingMonth:document.querySelector('[data-fo-filter="billingMonth"]')?.value || 'all', settlementMonth:document.querySelector('[data-fo-filter="settlementMonth"]')?.value || 'all', itemType:document.querySelector('[data-fo-filter="itemType"]')?.value || 'all', status:document.querySelector('[data-fo-filter="status"]')?.value || 'all' };
    state.pages[state.activeTab] = 1; state.selected[state.activeTab] = []; state.exportMessage = '';
  };
  const readTierForm = () => {
    const form = document.querySelector('[data-fo-tier-form]');
    if (!form) return state.tierDraft;
    const rows = [...form.querySelectorAll('[data-tier-card]')];
    let previousUpper = 0;
    state.tierDraft = {
      financialEntityId:form.elements.financialEntityId.value,
      startDate:form.elements.startDate.value,
      endDate:form.elements.endDate.value,
      reason:form.elements.reason.value.trim(),
      tiers:rows.map((row,index) => {
        const upperInput = row.querySelector('[name="to"]');
        const upperValue = upperInput?.value.trim() || '';
        const rateValue = row.querySelector('[name="rate"]').value.trim();
        const toMinor = index === rows.length - 1 ? null : (upperValue === '' ? '' : Math.round(Number(upperValue) * 100));
        const tier = { fromMinor:previousUpper,toMinor,platformRate:rateValue === '' ? '' : Number(rateValue) };
        if (toMinor !== null && toMinor !== '') previousUpper = toMinor;
        return tier;
      }),
    };
    return state.tierDraft;
  };

  document.addEventListener('change',event => {
    const target = event.target;
    if (target.matches('[data-fo-select-row]')) {
      const key = target.dataset.foSelectRow;
      state.selected[state.activeTab] = target.checked ? [...new Set([...state.selected[state.activeTab],key])] : state.selected[state.activeTab].filter(item => item !== key);
      rerender(); return;
    }
    if (target.matches('[data-fo-select-page]')) {
      const keys = pageRows(activeRows()).map(rowKey);
      state.selected[state.activeTab] = target.checked ? [...new Set([...state.selected[state.activeTab],...keys])] : state.selected[state.activeTab].filter(key => !keys.includes(key));
      rerender(); return;
    }
    if (target.matches('[data-fo-tier-form] [name="financialEntityId"]')) { state.tierDraft = createTierDraft(target.value); rerender(); return; }
    if (target.matches('[data-fo-tier-form] [name="to"]')) { const draft = readTierForm(); draft.tiers = normalizeDraftTiers(draft.tiers); rerender(); }
  });

  document.addEventListener('click',event => {
    const control = event.target.closest('[data-fo-action]');
    if (!control || control.disabled) return;
    const action = control.dataset.foAction;
    if ((action === 'close-drawer' || action === 'close-tier-editor') && event.target.closest('[data-fo-stop]') && !event.target.closest('header button') && !event.target.closest('footer button')) return;
    if (action === 'tab') { state.activeTab = control.dataset.foTab; state.exportMessage = ''; state.tierMessage = ''; rerender(); }
    if (action === 'query') { readFilters(); rerender(); }
    if (action === 'reset') {
      state.filters[state.activeTab] = state.activeTab === 'entity' ? { keyword:'',billingMonth:'2026-08',status:'all' } : { keyword:'',billingMonth:'all',settlementMonth:'all',gameId:'all',itemType:'all',status:'all' };
      state.pages[state.activeTab] = 1; state.selected[state.activeTab] = []; state.exportMessage = ''; rerender();
    }
    if (action === 'page') { state.pages[state.activeTab] = Math.max(1,Number(control.dataset.foPage) || 1); rerender(); }
    if (action === 'view-game-sales' || action === 'view-cdkey') { state.detailStatementId = control.dataset.rowKey; rerender(); }
    if (action === 'close-drawer') { state.detailStatementId = ''; rerender(); }
    if (action === 'open-tier-editor') { openTierEditor(); rerender(); }
    if (action === 'close-tier-editor') { state.tierEditorOpen = false; state.tierError = ''; rerender(); }
    if (action === 'add-tier') {
      const draft = readTierForm(); const last = draft.tiers.pop();
      draft.tiers.push({ fromMinor:last.fromMinor, toMinor:'', platformRate:'' });
      draft.tiers.push({ ...last, fromMinor:last.fromMinor });
      rerender();
    }
    if (action === 'remove-tier') {
      const draft = readTierForm(); const index = Number(control.dataset.tierIndex);
      if (index > 0 && index < draft.tiers.length - 1) {
        const removedUpper = draft.tiers[index].toMinor === '' ? draft.tiers[index + 1].fromMinor : draft.tiers[index].toMinor;
        draft.tiers.splice(index,1);
        draft.tiers[index - 1].toMinor = removedUpper;
        draft.tiers = normalizeDraftTiers(draft.tiers);
      }
      rerender();
    }
    if (action === 'save-tier') {
      try {
        const saved = model.statements.saveTierRule(state.statementState,{ ...readTierForm(),operator:'平台运营 李然' });
        state.tierEditorOpen = false; state.tierError = ''; state.tierMessage = `已保存规则 ${saved.id}`; rerender();
      } catch (error) { state.tierError = error?.message || '保存失败，请重试'; rerender(); }
    }
    if (action === 'export') {
      const rows = activeRows(); const selected = selectedRows(rows); const targets = selected.length ? selected : rows;
      if (!targets.length) return;
      const isEntity = state.activeTab === 'entity'; const content = isEntity ? model.exportEntityCsv(targets) : model.exportGameCsv(targets);
      const activeMonth = activeFilters().billingMonth; const month = activeMonth === 'all' ? '全部账单月' : activeMonth;
      const ok = download(content,`${isEntity ? '主体结算表' : '游戏结算明细'}_${month}.csv`);
      state.exportMessage = ok ? `已导出 ${targets.length} 条${isEntity ? '主体汇总' : '游戏明细'}` : '导出失败，请重试';
      if (ok) state.selected[state.activeTab] = []; rerender();
    }
    if (action === 'demo-toggle') { state.demoOpen = !state.demoOpen; rerender(); }
    if (action === 'scenario') { state.scenario = control.dataset.foScenario; state.demoOpen = false; state.pages = { entity:1,game:1 }; state.selected = { entity:[],game:[] }; state.detailStatementId = ''; state.tierEditorOpen = false; rerender(); }
  });
  document.addEventListener('keydown',event => {
    if (event.key !== 'Escape') return;
    if (state.detailStatementId) { state.detailStatementId = ''; rerender(); }
    else if (state.tierEditorOpen) { state.tierEditorOpen = false; rerender(); }
  });

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
  window.__financeOperationsDemo = { state,snapshot:() => ({
    activeTab:state.activeTab, filters:JSON.parse(JSON.stringify(state.filters)), entityRows:model.entityRows(state), gameRows:model.gameRows(state),
    tierRules:JSON.parse(JSON.stringify(state.statementState.tierRules)),
  }) };
})(window.GameHubDeveloperPortal,window.PublisherFinanceOperationsModel);

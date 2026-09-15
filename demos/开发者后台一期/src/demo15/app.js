(function developerFinanceSettlementDemo() {
  'use strict';

  const app = document.querySelector('#app');
  const statements = window.PublisherSettlementStatements;
  if (!app || !statements) return;

  const embedded = Boolean(window.__PUBLISHER_FINANCE_EMBEDDED__);
  const PAGE_SIZE = 20;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const cny = minor => (Number(minor || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const cnyWithSymbol = minor => Number(minor || 0) < 0 ? `-¥${cny(Math.abs(Number(minor)))}` : `¥${cny(minor)}`;
  const percent = value => value == null ? '—' : `${Number(value).toFixed(2).replace(/\.00$/,'')}%`;
  const settlementRate = row => row?.ratioPercent ?? (row?.platformShareRate == null ? null : 100 - Number(row.platformShareRate));

  const state = {
    statementState:statements.createState(),
    demoScenario:'exhaustive',
    demoOpen:false,
    route:'entity',
    filters:{ billingMonth:'all', settlementMonth:'all', gameId:'all', status:'all' },
    page:1,
    selectedStatementIds:[],
    confirmationIds:[],
    confirmationReturn:null,
    enterpriseCertificationStatus:'approved',
    entityMode:'view',
    entityDraft:null,
    entityFile:null,
    entityErrors:{},
    entityError:'',
    proofPreview:null,
    historyVersion:null,
    gameSalesDetailId:'',
    cdkeyDetailId:'',
    exportMessage:'',
    callbacks:{ onChange:null, onNavigate:null },
  };

  const readonly = (label, value, hint = '') => `<div class="gh-readonly"><span>${esc(label)}</span><strong>${esc(value)}</strong>${hint ? `<small>${esc(hint)}</small>` : ''}</div>`;
  const button = (label, action, variant = '', extra = '') => `<button type="button" class="gh-button ${variant}" data-finance-action="${esc(action)}" ${extra}>${esc(label)}</button>`;
  const pageHead = (title, description) => `<header class="gh-page-head"><div><h1>${esc(title)}</h1><p>${esc(description)}</p></div></header>`;

  const emptyState = (title, description) => `<div class="gh-empty"><div class="gh-empty-mark" aria-hidden="true">—</div><strong>${esc(title)}</strong><p>${esc(description)}</p></div>`;
  const pagination = total => {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    state.page = Math.max(1, Math.min(state.page, pages));
    return `<footer class="gh-pagination" data-d15-pagination data-page-size="20"><span>共 ${total} 条，每页 20 条</span><button class="gh-button" type="button" data-finance-action="page" data-page="${state.page - 1}"${state.page <= 1 ? ' disabled' : ''}>上一页</button><strong>${state.page} / ${pages}</strong><button class="gh-button" type="button" data-finance-action="page" data-page="${state.page + 1}"${state.page >= pages ? ' disabled' : ''}>下一页</button></footer>`;
  };

  const DEVELOPER_ID = 'DEV-1001';
  const DEVELOPER_NAME = '星海互动';
  const entityFields = Object.freeze([
    Object.freeze({ key:'legalName', label:'企业法定名称' }),
    Object.freeze({ key:'contactName', label:'联系人姓名' }),
    Object.freeze({ key:'phone', label:'手机号' }),
    Object.freeze({ key:'email', label:'邮箱', type:'email' }),
    Object.freeze({ key:'bankAccountName', label:'银行账户户名' }),
    Object.freeze({ key:'bankName', label:'开户银行' }),
    Object.freeze({ key:'bankAccount', label:'银行账号' }),
    Object.freeze({ key:'bankBranch', label:'开户支行／联行信息' }),
  ]);
  const activeFinancialEntity = () => statements.financialEntity(state.statementState, DEVELOPER_ID);
  const entityApplications = () => statements.financialEntityApplications(state.statementState, { developerId:DEVELOPER_ID });
  const latestEntityApplication = () => entityApplications()[0] || null;
  const draftSource = () => {
    const latest = latestEntityApplication();
    return latest?.status === 'rejected' ? latest.snapshot : activeFinancialEntity();
  };
  const cloneEntity = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const statusText = status => ({ approved:'已通过', pending:'审核中', rejected:'已驳回', superseded:'已失效' }[status] || status || '—');
  const statusTone = status => ({ approved:'success', pending:'warning', rejected:'danger', superseded:'' }[status] || '');
  const applicationTypeText = type => type === 'initial' ? '初次认证' : '资料变更';
  const proofPreviewUrl = proof => {
    if (proof?.previewUrl) return proof.previewUrl;
    const title = esc(proof?.name || '银行账户证明');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><rect width="1200" height="760" fill="#f5f7fa"/><rect x="72" y="62" width="1056" height="636" rx="18" fill="#fff" stroke="#d6dce5" stroke-width="2"/><text x="110" y="132" font-family="Arial,'Microsoft YaHei'" font-size="30" font-weight="700" fill="#172033">银行账户证明</text><line x1="110" y1="165" x2="1090" y2="165" stroke="#e5e9ef" stroke-width="2"/><text x="110" y="235" font-family="Arial,'Microsoft YaHei'" font-size="22" fill="#5f6b7c">文件：${title}</text><text x="110" y="310" font-family="Arial,'Microsoft YaHei'" font-size="21" fill="#344054">账户户名：深圳星海互动科技有限公司</text><text x="110" y="365" font-family="Arial,'Microsoft YaHei'" font-size="21" fill="#344054">开户银行：中国建设银行深圳科技园支行</text><text x="110" y="420" font-family="Arial,'Microsoft YaHei'" font-size="21" fill="#344054">银行账号：6222 **** **** 8899</text><rect x="110" y="512" width="240" height="86" rx="8" fill="#f1f4f8"/><text x="155" y="566" font-family="Arial,'Microsoft YaHei'" font-size="22" fill="#7a8494">银行盖章示例</text><text x="110" y="652" font-family="Arial,'Microsoft YaHei'" font-size="16" fill="#98a2b3">Demo 示例文件，仅用于演示点击预览。</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };
  const entityHistoryRows = () => {
    const profile = activeFinancialEntity();
    const applications = entityApplications();
    const rows = applications.map(application => ({
      version:application.entityVersion,
      type:applicationTypeText(application.applicationType),
      submittedAt:application.submittedAt,
      status:application.status,
      reviewedAt:application.reviewedAt || '—',
      operator:application.reviewedBy || application.submittedBy || '—',
      snapshot:application.snapshot,
    }));
    if (profile && !rows.some(row => row.version === profile.entityVersion)) rows.push({
      version:profile.entityVersion,
      type:'资料变更',
      submittedAt:'2026-05-16 10:05',
      status:'approved',
      reviewedAt:profile.approvedAt || '—',
      operator:profile.approvedBy || '—',
      snapshot:profile,
    });
    rows.push({
      version:'FIN-2025-001',
      type:'初次认证',
      submittedAt:'2025-12-18 09:30',
      status:'approved',
      reviewedAt:'2025-12-19 14:10',
      operator:'平台运营 李然',
      snapshot:{ ...(profile || {}), entityVersion:'FIN-2025-001', bankName:'中国建设银行深圳南山支行', bankBranch:'中国建设银行深圳南山支行', bankProof:{ name:'初次银行开户证明.jpg', type:'image/jpeg', size:486000 } },
    });
    return rows.sort((a,b) => b.submittedAt.localeCompare(a.submittedAt));
  };
  const entityStatus = () => {
    const latest = latestEntityApplication();
    if (latest?.status === 'pending') return { label:'审核中', tone:'warning', detail:`变更申请已于 ${latest.submittedAt} 提交，审核通过后生效。` };
    if (latest?.status === 'rejected') return { label:'已驳回', tone:'danger', detail:latest.reviewReason || '请修改资料后重新提交。' };
    return { label:'已生效', tone:'success', detail:'当前资料已通过审核。' };
  };
  const entityInput = field => {
    const draft = state.entityDraft || {};
    const error = state.entityErrors[field.key] || '';
    const isFirstError = Object.keys(state.entityErrors)[0] === field.key;
    return `<div class="gh-field d15-entity-field"><label for="d15-entity-${esc(field.key)}">${esc(field.label)}</label><input id="d15-entity-${esc(field.key)}" class="gh-input" type="${esc(field.type || 'text')}" name="${esc(field.key)}" value="${esc(draft[field.key] || '')}" aria-label="${esc(field.label)}" aria-invalid="${error ? 'true' : 'false'}"${error ? ` aria-describedby="d15-error-${esc(field.key)}"` : ''}>${error ? `<small class="d15-field-error" id="d15-error-${esc(field.key)}"${isFirstError ? ' role="alert"' : ''}>${esc(error)}</small>` : ''}</div>`;
  };
  const entityUpload = () => {
    const proof = state.entityDraft?.bankProof;
    const error = state.entityErrors.bankProof || '';
    const isFirstError = Object.keys(state.entityErrors)[0] === 'bankProof';
    return `<div class="gh-field wide d15-entity-field"><span class="gh-label">银行账户证明附件</span><label class="gh-upload d15-entity-upload ${error ? 'is-error' : ''}" for="d15-entity-bank-proof"><input id="d15-entity-bank-proof" type="file" name="bankProof" aria-label="银行账户证明附件" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" aria-invalid="${error ? 'true' : 'false'}"${error ? ' aria-describedby="d15-error-bankProof"' : ''}><strong data-d15-upload-name>${esc(proof?.name || '点击上传附件')}</strong><span>支持 JPG、PNG、WEBP，单文件不超过 10 MB</span></label>${error ? `<small class="d15-field-error" id="d15-error-bankProof"${isFirstError ? ' role="alert"' : ''}>${esc(error)}</small>` : ''}</div>`;
  };
  const entityActions = status => state.entityMode === 'edit'
    ? `${button('取消','cancel-entity')}<button type="submit" form="d15-entity-form" class="gh-button primary">提交审核</button>`
    : button('修改','edit-entity','',status.label === '审核中' ? 'disabled' : '');

  function entityPage() {
    if (state.enterpriseCertificationStatus !== 'approved' || state.demoScenario === 'empty') return `<section class="gh-card d15-certification-empty" data-testid="enterprise-certification-empty">${emptyState('暂不可管理财务主体', '开发者企业认证通过后，方可管理财务主体。')}</section>`;
    const profile = activeFinancialEntity();
    if (!profile) return `<section class="gh-card">${emptyState('尚未配置财务主体', '请联系平台运营完成初次配置。')}</section>`;
    const status = entityStatus();
    const statusDetail = status.tone === 'danger' ? `<strong>${esc(status.detail)}</strong>` : `<span>${esc(status.detail)}</span>`;
    const content = state.entityMode === 'edit'
      ? `<form id="d15-entity-form" class="gh-card-body d15-entity-form" data-d15-entity-form novalidate>${entityFields.map(entityInput).join('')}${entityUpload()}</form>`
      : `<div class="gh-card-body d15-entity-detail-grid">${entityFields.map(field => readonly(field.label,profile[field.key])).join('')}<div class="gh-readonly d15-proof-field"><span>银行账户证明附件</span><button type="button" class="d15-proof-card" data-finance-action="preview-proof" data-proof-version="${esc(profile.entityVersion)}"><span aria-hidden="true">图</span><strong>${esc(profile.bankProof?.name || '—')}</strong><small>点击查看</small></button></div></div>`;
    const historyRows = entityHistoryRows();
    const history = `<section class="d15-section-title"><div><h2>变更历史</h2></div></section><section class="gh-card d15-history-card"><div class="gh-table-wrap"><table class="gh-table d15-history-table" data-testid="entity-history-table"><thead><tr><th>版本号</th><th>变更类型</th><th>提交时间</th><th>审核状态</th><th>审核时间</th><th>操作人</th><th>操作</th></tr></thead><tbody>${historyRows.map(row => `<tr><td><strong>${esc(row.version)}</strong></td><td>${esc(row.type)}</td><td>${esc(row.submittedAt)}</td><td><span class="gh-tag ${esc(statusTone(row.status))}">${esc(statusText(row.status))}</span></td><td>${esc(row.reviewedAt)}</td><td>${esc(row.operator)}</td><td>${button('查看','view-history','link',`data-history-version="${esc(row.version)}"`)}</td></tr>`).join('')}</tbody></table></div></section>`;
    return `<section class="gh-card d15-entity-summary" data-d15-entity-summary><div class="gh-card-body"><div class="d15-entity-summary-row"><div><h2>当前生效版本</h2><p>${esc(profile.entityVersion)} · 审核通过前，变更不会覆盖当前结算资料。</p></div><div class="d15-entity-review ${esc(status.tone)}" data-d15-entity-status><span class="gh-tag ${esc(status.tone)}">${esc(status.label)}</span>${statusDetail}</div></div></div></section>
      <section class="d15-section-title"><div><h2>财务主体资料</h2><p>银行账户户名须与企业法定名称一致。</p></div><div>${entityActions(status)}</div></section>
      ${state.entityError && !Object.keys(state.entityErrors).length ? `<div class="d15-entity-alert" role="alert">${esc(state.entityError)}</div>` : ''}
      <section class="gh-card d15-entity-details" data-d15-entity-details>${content}</section>${history}`;
  }

  const allSettlements = () => statements.statementsFor(state.statementState, { developerId:DEVELOPER_ID });
  const optionsFor = key => [...new Set(allSettlements().map(row => row[key]))].sort((a,b) => String(b).localeCompare(String(a)));
  const allDeveloperGames = () => {
    const games = new Map();
    allSettlements().forEach(row => { if (!games.has(row.gameId)) games.set(row.gameId,{ gameId:row.gameId,gameName:row.gameName }); });
    return [...games.values()].sort((a,b) => a.gameName.localeCompare(b.gameName,'zh-CN'));
  };
  const visibleSettlements = () => state.demoScenario === 'empty' ? [] : statements.statementsFor(state.statementState, {
    developerId:DEVELOPER_ID,
    billingMonth:state.filters.billingMonth,
    settlementMonth:state.filters.settlementMonth,
    gameId:state.filters.gameId,
    status:state.filters.status,
  });
  const currentSettlements = () => {
    const rows = visibleSettlements();
    const pages = Math.max(1,Math.ceil(rows.length / PAGE_SIZE));
    state.page = Math.max(1,Math.min(state.page,pages));
    return rows.slice((state.page - 1) * PAGE_SIZE,state.page * PAGE_SIZE);
  };
  const selectedPendingRows = () => {
    const selected = new Set(state.selectedStatementIds);
    return allSettlements().filter(row => selected.has(row.id) && row.status === 'pending');
  };
  const confirmationRows = () => {
    const requested = new Set(state.confirmationIds);
    return allSettlements().filter(row => requested.has(row.id) && row.status === 'pending');
  };
  const selectOptions = (values, selected, allLabel, format = value => value) => `<option value="all"${selected === 'all' ? ' selected' : ''}>${esc(allLabel)}</option>${values.map(value => `<option value="${esc(value)}"${selected === value ? ' selected' : ''}>${esc(format(value))}</option>`).join('')}`;
  const settlementFilters = () => `<section class="d15-filters" aria-label="结算记录筛选"><label><span>账单月份</span><select class="gh-select" data-d15-filter="billingMonth">${selectOptions(optionsFor('billingMonth'),state.filters.billingMonth,'全部月份')}</select></label><label><span>结算月份</span><select class="gh-select" data-d15-filter="settlementMonth">${selectOptions(optionsFor('settlementMonth'),state.filters.settlementMonth,'全部月份')}</select></label><label><span>游戏</span><select class="gh-select" data-d15-filter="gameId">${selectOptions(allDeveloperGames().map(game => game.gameId),state.filters.gameId,'全部游戏',value => allDeveloperGames().find(game => game.gameId === value)?.gameName || value)}</select></label><label><span>状态</span><select class="gh-select" data-d15-filter="status"><option value="all"${state.filters.status === 'all' ? ' selected' : ''}>全部状态</option><option value="pending"${state.filters.status === 'pending' ? ' selected' : ''}>待确认</option><option value="confirmed"${state.filters.status === 'confirmed' ? ' selected' : ''}>已确认</option></select></label><div class="d15-filter-actions">${button('重置','reset-filters')}${button('查询','query','primary')}</div></section>`;

  const settlementRow = row => {
    const checked = state.selectedStatementIds.includes(row.id);
    const selectable = row.status === 'pending';
    const actions = [
      ...(row.itemType === 'game_sales_share' ? [button('查看详情','view-game-sales','link',`data-game-sales-statement-id="${esc(row.id)}"`)] : []),
      ...(row.itemType === 'cdkey_sales_share' ? [button('查看详情','view-cdkey','link',`data-cdkey-statement-id="${esc(row.id)}"`)] : []),
      ...(selectable ? [button('确认','open-confirm','link',`data-confirm-statement-id="${esc(row.id)}"`)] : []),
    ];
    return `<tr data-d15-settlement-row data-statement-id="${esc(row.id)}" data-game-id="${esc(row.gameId)}" data-billing-month="${esc(row.billingMonth)}" data-settlement-month="${esc(row.settlementMonth)}" data-item-type="${esc(row.itemType)}" data-platform-received-minor="${esc(row.platformReceivedMinor)}" data-platform-share-minor="${esc(row.platformShareMinor)}" data-settlement-rate="${esc(settlementRate(row))}" data-payable-minor="${esc(row.payableMinor)}" data-status="${esc(row.status)}"><td class="d15-check"><input type="checkbox" data-d15-select-statement value="${esc(row.id)}" aria-label="选择 ${esc(row.id)}"${checked ? ' checked' : ''}${selectable ? '' : ' disabled'}></td><td>${esc(row.gameId)}</td><td><strong>${esc(row.gameName)}</strong></td><td>${esc(row.billingMonth)}</td><td>${esc(row.settlementMonth)}</td><td>${esc(row.itemLabel)}</td><td class="d15-number">${esc(cny(row.userPaidMinor))}</td><td class="d15-number">${esc(cny(row.platformReceivedMinor))}</td><td class="d15-number">${esc(percent(settlementRate(row)))}</td><td class="d15-number d15-payable">${esc(cny(row.payableMinor))}</td><td><span class="gh-tag ${row.status === 'confirmed' ? 'success' : 'warning'}">${row.status === 'confirmed' ? '已确认' : '待确认'}</span></td><td><div class="d15-row-actions">${actions.length ? actions.join('') : '—'}</div></td></tr>`;
  };

  function settlementPage() {
    const rows = visibleSettlements();
    const current = currentSettlements();
    const currentPending = current.filter(row => row.status === 'pending');
    const selected = selectedPendingRows();
    const allCurrentSelected = currentPending.length > 0 && currentPending.every(row => state.selectedStatementIds.includes(row.id));
    const table = current.length ? `<div class="gh-table-wrap"><table class="gh-table d15-settlement-table" data-testid="settlement-table"><thead><tr><th class="d15-check"><input type="checkbox" data-d15-select-page aria-label="选择本页待确认"${allCurrentSelected ? ' checked' : ''}${currentPending.length ? '' : ' disabled'}></th><th>游戏 ID</th><th>游戏名称</th><th>账单月份</th><th>结算月份</th><th>结算项</th><th>用户支付金额（CNY）</th><th>实际到账金额（CNY）</th><th>结算比例</th><th>结算金额（CNY）</th><th>状态</th><th>操作</th></tr></thead><tbody>${current.map(settlementRow).join('')}</tbody></table></div>${pagination(rows.length)}` : emptyState(state.demoScenario === 'empty' ? '暂无结算记录' : '未找到符合条件的记录', state.demoScenario === 'empty' ? '账单生成后，结算记录会展示在这里。' : '请调整筛选条件或重置后再试。');
    return `${settlementFilters()}<section class="gh-card d15-settlement-card"><header class="gh-card-head"><div><h2>对账结算</h2></div><div class="d15-settlement-actions">${button('批量确认','open-batch-confirm','',selected.length ? '' : 'aria-disabled="true"')}${button('导出当前结果','export-settlements','',rows.length ? '' : 'disabled')}</div></header>${state.exportMessage ? `<div class="d15-export-message ${state.exportMessage.includes('失败') ? 'is-error' : ''}" data-d15-export-status>${esc(state.exportMessage)}</div>` : ''}${table}</section>`;
  }

  function confirmationDialog() {
    const rows = confirmationRows();
    if (!rows.length) return '';
    const total = rows.reduce((sum,row) => sum + Number(row.payableMinor || 0),0);
    return `<div class="d15-dialog-layer" data-finance-action="cancel-confirm"><section class="d15-confirm-dialog" role="dialog" aria-modal="true" aria-label="确认结算单" data-finance-stop><header><h2>确认结算单</h2><button type="button" class="gh-dialog-close" data-finance-action="cancel-confirm" aria-label="关闭">×</button></header><div class="d15-confirm-body"><p>共 <strong>${rows.length} 条</strong>结算单，结算金额合计</p><b>${esc(cnyWithSymbol(total))}</b><small>确认后不可撤销，请核对后操作。</small></div><footer>${button('取消','cancel-confirm')}${button('确认','confirm-statements','primary')}</footer></section></div>`;
  }

  function proofDialog() {
    if (!state.proofPreview) return '';
    return `<div class="d15-dialog-layer" data-finance-action="close-proof"><section class="d15-proof-dialog" role="dialog" aria-modal="true" aria-label="银行账户证明预览" data-finance-stop><header><div><h2>银行账户证明</h2><p>${esc(state.proofPreview.name)}</p></div><button type="button" class="gh-dialog-close" data-finance-action="close-proof" aria-label="关闭">×</button></header><div class="d15-proof-preview"><img src="${esc(state.proofPreview.url)}" alt="${esc(state.proofPreview.name)}"></div></section></div>`;
  }

  function historyDialog() {
    if (!state.historyVersion) return '';
    const row = entityHistoryRows().find(item => item.version === state.historyVersion);
    if (!row) return '';
    const profile = row.snapshot || {};
    return `<div class="d15-dialog-layer" data-finance-action="close-history"><section class="d15-history-dialog" role="dialog" aria-modal="true" aria-label="财务主体版本详情" data-finance-stop><header><div><h2>${esc(row.version)}</h2><p>${esc(row.type)} · ${esc(statusText(row.status))}</p></div><button type="button" class="gh-dialog-close" data-finance-action="close-history" aria-label="关闭">×</button></header><div class="d15-history-detail">${entityFields.map(field => readonly(field.label,profile[field.key] || '—')).join('')}<div class="gh-readonly d15-proof-field"><span>银行账户证明附件</span><button type="button" class="d15-proof-card" data-finance-action="preview-proof" data-proof-version="${esc(row.version)}"><span aria-hidden="true">图</span><strong>${esc(profile.bankProof?.name || '—')}</strong><small>点击查看</small></button></div></div><footer>${button('关闭','close-history')}</footer></section></div>`;
  }

  const detailSummary = row => `<section class="d15-cdkey-summary d15-detail-summary"><div><span>用户支付金额（CNY）</span><strong>${esc(cnyWithSymbol(row.userPaidMinor))}</strong></div><div><span>实际到账金额（CNY）</span><strong>${esc(cnyWithSymbol(row.platformReceivedMinor))}</strong></div><div><span>结算比例</span><strong>${esc(percent(settlementRate(row)))}</strong></div><div><span>结算金额（CNY）</span><strong>${esc(cnyWithSymbol(row.payableMinor))}</strong></div></section>`;

  function gameSalesDrawer() {
    if (!state.gameSalesDetailId) return '';
    const row = allSettlements().find(item => item.id === state.gameSalesDetailId && item.itemType === 'game_sales_share');
    if (!row) return '';
    const details = row.gameSalesDetails || [];
    return `<div class="d15-drawer-layer" data-finance-action="close-game-sales"><aside class="d15-cdkey-drawer d15-settlement-drawer" role="dialog" aria-modal="true" aria-label="游戏销售分成明细" data-finance-stop><header><div><h2>游戏销售分成明细</h2><p>${esc(row.gameName)} · ${esc(row.billingMonth)} 账单 / ${esc(row.settlementMonth)} 结算</p></div><button type="button" class="gh-dialog-close" data-finance-action="close-game-sales" aria-label="关闭">×</button></header>${detailSummary(row)}<div class="d15-cdkey-body"><div class="gh-table-wrap"><table class="gh-table d15-cdkey-table d15-game-sales-table" data-testid="game-sales-detail-table"><thead><tr><th>商品类型</th><th>商品名称</th><th>用户支付金额（CNY）</th><th>实际到账金额（CNY）</th><th>结算比例</th><th>结算金额（CNY）</th></tr></thead><tbody>${details.map(item => `<tr><td>${esc(item.productType)}</td><td><strong>${esc(item.productName)}</strong></td><td class="d15-number">${esc(cny(item.userPaidMinor))}</td><td class="d15-number">${esc(cny(item.platformReceivedMinor))}</td><td class="d15-number">${esc(percent(settlementRate(item)))}</td><td class="d15-number d15-payable">${esc(cny(item.payableMinor))}</td></tr>`).join('')}</tbody></table></div></div></aside></div>`;
  }

  function cdkeyDrawer() {
    if (!state.cdkeyDetailId) return '';
    const row = allSettlements().find(item => item.id === state.cdkeyDetailId && item.itemType === 'cdkey_sales_share');
    if (!row) return '';
    const details = row.cdkeyDetails || [];
    return `<div class="d15-drawer-layer" data-finance-action="close-cdkey"><aside class="d15-cdkey-drawer d15-settlement-drawer" role="dialog" aria-modal="true" aria-label="CDKEY 销售明细" data-finance-stop><header><div><h2>CDKEY 销售明细</h2><p>${esc(row.gameName)} · ${esc(row.billingMonth)} 账单 / ${esc(row.settlementMonth)} 结算</p></div><button type="button" class="gh-dialog-close" data-finance-action="close-cdkey" aria-label="关闭">×</button></header>${detailSummary(row)}<div class="d15-cdkey-body"><div class="gh-table-wrap"><table class="gh-table d15-cdkey-table" data-testid="cdkey-detail-table"><thead><tr><th>渠道</th><th>商品类型</th><th>商品／DLC</th><th>用户支付金额（CNY）</th><th>实际到账金额（CNY）</th><th>结算比例</th><th>结算金额（CNY）</th></tr></thead><tbody>${details.map(item => `<tr><td>${esc(item.channel)}</td><td>${esc(item.productType)}</td><td><strong>${esc(item.productName)}</strong></td><td class="d15-number">${esc(cny(item.userPaidMinor))}</td><td class="d15-number">${esc(cny(item.platformReceivedMinor))}</td><td class="d15-number">${esc(percent(settlementRate(item)))}</td><td class="d15-number d15-payable">${esc(cny(item.payableMinor))}</td></tr>`).join('')}</tbody></table></div></div></aside></div>`;
  }

  const auxiliaryOverlays = () => `${confirmationDialog()}${historyDialog()}${proofDialog()}${gameSalesDrawer()}${cdkeyDrawer()}`;

  const pageContent = () => state.route === 'entity' ? entityPage() : settlementPage();
  const scenario = () => `<section class="d15-demo"><button type="button" data-finance-action="demo-toggle" aria-expanded="${state.demoOpen}" data-testid="scenario-orb"><b>Demo</b><span>状态</span></button>${state.demoOpen ? `<aside><strong>页面状态</strong><button type="button" data-finance-action="scenario" data-scenario="exhaustive" class="${state.demoScenario === 'exhaustive' ? 'is-active' : ''}">穷举态</button><button type="button" data-finance-action="scenario" data-scenario="empty" class="${state.demoScenario === 'empty' ? 'is-active' : ''}">缺省态</button></aside>` : ''}</section>`;
  const logo = () => `<svg viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="10" fill="#f3b71b"/><path d="M10 18.3c0-5.3 3.7-9.1 8.9-9.1 2.6 0 4.8.9 6.4 2.4l-3.1 3.1a4.7 4.7 0 0 0-3.3-1.3c-2.8 0-4.7 2-4.7 4.9 0 2.8 1.9 4.9 4.8 4.9 2 0 3.3-.8 4-2.1h-4.6v-3.8h8.7c.1.6.1 1.2.1 1.8 0 5.1-3.4 8.8-8.3 8.8-5.2 0-8.9-4-8.9-9.6Z" fill="#422d00"/></svg>`;
  function standaloneRender() {
    const title = state.route === 'entity' ? '财务主体' : '对账结算';
    const description = state.route === 'entity' ? '维护结算主体与银行账户资料。' : '核对并确认按月生成的游戏结算单。';
    app.innerHTML = `<div class="gh-app d15-app" data-testid="developer-finance-demo"><header class="gh-topbar"><div class="gh-brand">${logo()}<span>PC 发行平台<small>开发者中心</small></span></div><div class="gh-user"><div class="gh-avatar">星</div><div class="gh-user-copy"><strong>星海互动</strong><small>企业开发者</small></div></div></header><div class="gh-layout"><aside class="gh-sidebar"><div class="gh-sidebar-label">财务</div><nav class="gh-nav d15-nav" aria-label="财务导航"><button type="button" data-route="entity" class="${state.route === 'entity' ? 'is-active' : ''}"><span class="gh-nav-icon">主</span>财务主体</button><button type="button" data-route="settlement" class="${state.route !== 'entity' ? 'is-active' : ''}"><span class="gh-nav-icon">结</span>对账结算</button></nav></aside><main class="gh-main"><div class="gh-content">${pageHead(title,description)}${pageContent()}</div></main></div>${scenario()}${auxiliaryOverlays()}</div>`;
    document.body.classList.toggle('finance-overlay-open', Boolean(state.confirmationIds.length || state.proofPreview || state.historyVersion || state.gameSalesDetailId || state.cdkeyDetailId));
  }

  const focusFirstConfirmationControl = () => requestAnimationFrame(() => {
    const dialog = document.querySelector('.d15-confirm-dialog');
    if (!dialog || dialog.contains(document.activeElement)) return;
    dialog.querySelector('button:not([disabled])')?.focus();
  });
  const restoreConfirmationFocus = target => {
    if (!target) return;
    const focusTarget = () => {
      let control = null;
      if (target.type === 'batch') control = document.querySelector('[data-finance-action="open-batch-confirm"]');
      if (target.type === 'statement') {
        control = [...document.querySelectorAll('[data-confirm-statement-id]')].find(node => node.dataset.confirmStatementId === target.id)
          || [...document.querySelectorAll('[data-statement-id]')].find(node => node.dataset.statementId === target.id);
        if (control?.matches('tr')) control.tabIndex = -1;
        if (!control) control = document.querySelector('[data-finance-action="open-batch-confirm"]');
      }
      control?.focus();
    };
    focusTarget();
    requestAnimationFrame(focusTarget);
  };
  const rerender = () => {
    if (embedded && typeof state.callbacks.onChange === 'function') state.callbacks.onChange({ preserveScroll:true });
    else standaloneRender();
    if (state.confirmationIds.length) focusFirstConfirmationControl();
  };
  const closeConfirmation = () => {
    const returnTarget = state.confirmationReturn;
    state.confirmationIds = [];
    state.confirmationReturn = null;
    rerender();
    restoreConfirmationFocus(returnTarget);
  };
  const readFilters = () => {
    state.filters = {
      billingMonth:document.querySelector('[data-d15-filter="billingMonth"]')?.value || 'all',
      settlementMonth:document.querySelector('[data-d15-filter="settlementMonth"]')?.value || 'all',
      gameId:document.querySelector('[data-d15-filter="gameId"]')?.value || 'all',
      status:document.querySelector('[data-d15-filter="status"]')?.value || 'all',
    };
    state.page = 1;
    state.selectedStatementIds = [];
    state.confirmationIds = [];
    state.confirmationReturn = null;
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

  const startEntityEdit = () => {
    state.entityMode = 'edit';
    state.entityDraft = cloneEntity(draftSource());
    state.entityFile = null;
    state.entityErrors = {};
    state.entityError = '';
    rerender();
  };
  const cancelEntityEdit = () => {
    state.entityMode = 'view';
    state.entityDraft = null;
    state.entityFile = null;
    state.entityErrors = {};
    state.entityError = '';
    rerender();
  };
  const readEntityDraft = () => {
    const form = document.querySelector('[data-d15-entity-form]');
    const draft = cloneEntity(state.entityDraft || draftSource() || {});
    entityFields.forEach(field => { draft[field.key] = form?.elements.namedItem(field.key)?.value?.trim() || ''; });
    const file = form?.elements.namedItem('bankProof')?.files?.[0] || state.entityFile;
    if (file) draft.bankProof = { name:file.name, type:file.type, size:file.size };
    return draft;
  };
  const validateEntityDraft = draft => {
    const errors = {};
    entityFields.forEach(field => { if (!draft[field.key]) errors[field.key] = `${field.label}为必填项`; });
    if (!errors.phone && !/^1[3-9]\d{9}$/.test(draft.phone)) errors.phone = '请填写正确的中国大陆手机号';
    if (!errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) errors.email = '请填写正确的邮箱';
    if (!errors.bankAccountName && !errors.legalName && draft.bankAccountName !== draft.legalName) errors.bankAccountName = '银行账户户名必须与企业法定名称一致';
    if (!draft.bankProof?.name) errors.bankProof = '请上传银行账户证明附件';
    else if (!['image/jpeg','image/png','image/webp'].includes(draft.bankProof.type)) errors.bankProof = '银行证明附件仅支持 JPG、PNG、WEBP';
    else if (Number(draft.bankProof.size || 0) > 10 * 1024 * 1024) errors.bankProof = '银行证明附件不能超过 10 MB';
    return errors;
  };
  const focusFirstEntityError = () => {
    const firstError = document.querySelector('[data-d15-entity-form] [aria-invalid="true"]');
    firstError?.scrollIntoView({ block:'center', behavior:'smooth' });
    firstError?.focus();
  };
  const submitEntity = () => {
    const draft = readEntityDraft();
    const errors = validateEntityDraft(draft);
    state.entityDraft = draft;
    state.entityErrors = errors;
    state.entityError = Object.values(errors)[0] || '';
    if (state.entityError) {
      rerender();
      focusFirstEntityError();
      return;
    }
    try {
      statements.submitFinancialEntity(state.statementState, {
        ...draft,
        developerId:DEVELOPER_ID,
        developerName:DEVELOPER_NAME,
        submittedBy:draft.contactName,
      });
      state.entityMode = 'view';
      state.entityDraft = null;
      state.entityFile = null;
      state.entityErrors = {};
      state.entityError = '';
      rerender();
    } catch (error) {
      state.entityError = error?.message || '提交失败，请重试';
      rerender();
    }
  };
  const reviewEntity = (result, reason = '') => {
    const pending = entityApplications().find(application => application.status === 'pending');
    if (!pending) return false;
    statements.reviewFinancialEntity(state.statementState, pending.id, {
      result,
      reason,
      operator:'平台运营 李然',
    });
    state.entityMode = 'view';
    state.entityDraft = null;
    state.entityFile = null;
    state.entityErrors = {};
    state.entityError = '';
    rerender();
    return true;
  };

  document.addEventListener('click', event => {
    const routeButton = event.target.closest('[data-route]');
    if (routeButton && !embedded) {
      state.route = routeButton.dataset.route === 'entity' ? 'entity' : 'settlement';
      state.page = 1;
      state.selectedStatementIds = [];
      state.confirmationIds = [];
      state.confirmationReturn = null;
      location.hash = `#/${state.route}`;
      standaloneRender();
      return;
    }
    const control = event.target.closest('[data-finance-action]');
    if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
    const action = control.dataset.financeAction;
    if (['cancel-confirm','close-proof','close-history','close-game-sales','close-cdkey'].includes(action)
      && (control.classList.contains('d15-dialog-layer') || control.classList.contains('d15-drawer-layer'))
      && event.target.closest('[data-finance-stop]')) return;
    if (action === 'query') { readFilters(); rerender(); }
    if (action === 'reset-filters') { state.filters = { billingMonth:'all',settlementMonth:'all',gameId:'all',status:'all' }; state.page = 1; state.selectedStatementIds = []; state.confirmationIds = []; state.confirmationReturn = null; state.exportMessage = ''; rerender(); }
    if (action === 'page') { state.page = Math.max(1,Number(control.dataset.page) || 1); rerender(); }
    if (action === 'open-confirm') { state.confirmationReturn = { type:'statement',id:control.dataset.confirmStatementId }; state.confirmationIds = [control.dataset.confirmStatementId].filter(Boolean); rerender(); }
    if (action === 'open-batch-confirm') { state.confirmationReturn = { type:'batch' }; state.confirmationIds = selectedPendingRows().map(row => row.id); rerender(); }
    if (action === 'cancel-confirm') closeConfirmation();
    if (action === 'confirm-statements') {
      const ids = confirmationRows().map(row => row.id);
      statements.confirmStatements(state.statementState,ids,{ confirmedBy:'开发者 王明' });
      const confirmed = new Set(ids);
      state.selectedStatementIds = state.selectedStatementIds.filter(id => !confirmed.has(id));
      closeConfirmation();
    }
    if (action === 'edit-entity') startEntityEdit();
    if (action === 'cancel-entity') cancelEntityEdit();
    if (action === 'view-history') { state.historyVersion = control.dataset.historyVersion || ''; rerender(); }
    if (action === 'close-history') { state.historyVersion = null; rerender(); }
    if (action === 'preview-proof') {
      const version = control.dataset.proofVersion;
      const row = entityHistoryRows().find(item => item.version === version);
      const proof = row?.snapshot?.bankProof || activeFinancialEntity()?.bankProof;
      state.proofPreview = { name:proof?.name || '银行账户证明', url:proofPreviewUrl(proof) };
      rerender();
    }
    if (action === 'close-proof') { state.proofPreview = null; rerender(); }
    if (action === 'view-game-sales') { state.gameSalesDetailId = control.dataset.gameSalesStatementId || ''; rerender(); }
    if (action === 'close-game-sales') { state.gameSalesDetailId = ''; rerender(); }
    if (action === 'view-cdkey') { state.cdkeyDetailId = control.dataset.cdkeyStatementId || ''; rerender(); }
    if (action === 'close-cdkey') { state.cdkeyDetailId = ''; rerender(); }
    if (action === 'export-settlements') {
      const rows = visibleSettlements();
      const csv = statements.exportStatementsCsv(rows,{ includeDeveloper:false,audience:'developer' });
      const ok = save(csv,`对账结算_${state.filters.billingMonth === 'all' ? '全部账单月' : state.filters.billingMonth}.csv`);
      state.exportMessage = ok ? `已导出 ${rows.length} 条结算记录` : '导出失败，请重试';
      rerender();
    }
    if (action === 'demo-toggle') { state.demoOpen = !state.demoOpen; rerender(); }
    if (action === 'scenario') { state.demoScenario = control.dataset.scenario; state.demoOpen = false; state.selectedStatementIds = []; state.confirmationIds = []; state.confirmationReturn = null; state.page = 1; rerender(); }
  });

  document.addEventListener('submit', event => {
    if (!event.target.matches('[data-d15-entity-form]')) return;
    event.preventDefault();
    submitEntity();
  });

  document.addEventListener('input', event => {
    if (!event.target.matches('[data-d15-entity-form] input:not([type="file"])')) return;
    const key = event.target.name;
    state.entityDraft = { ...(state.entityDraft || {}), [key]:event.target.value };
    if (state.entityErrors[key]) state.entityErrors = { ...state.entityErrors, [key]:'' };
  });

  document.addEventListener('change', event => {
    if (event.target.matches('[data-d15-select-statement]')) {
      const selected = new Set(state.selectedStatementIds);
      if (event.target.checked) selected.add(event.target.value);
      else selected.delete(event.target.value);
      state.selectedStatementIds = [...selected];
      rerender();
      return;
    }
    if (event.target.matches('[data-d15-select-page]')) {
      const selected = new Set(state.selectedStatementIds);
      currentSettlements().filter(row => row.status === 'pending').forEach(row => {
        if (event.target.checked) selected.add(row.id);
        else selected.delete(row.id);
      });
      state.selectedStatementIds = [...selected];
      rerender();
      return;
    }
    if (!event.target.matches('[data-d15-entity-form] input[type="file"]')) return;
    const file = event.target.files?.[0];
    if (!file) return;
    state.entityFile = file;
    state.entityDraft = { ...(state.entityDraft || {}), bankProof:{ name:file.name, type:file.type, size:file.size } };
    state.entityErrors = { ...state.entityErrors, bankProof:'' };
    state.entityError = '';
    const name = event.target.closest('.d15-entity-upload')?.querySelector('[data-d15-upload-name]');
    if (name) name.textContent = file.name;
  });

  window.addEventListener('keydown', event => {
    const dialog = document.querySelector('.d15-proof-dialog,.d15-history-dialog,.d15-settlement-drawer,.d15-confirm-dialog');
    if (event.key === 'Tab' && dialog) {
      const focusable = [...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
        .filter(node => node.getClientRects().length > 0 && node.getAttribute('aria-disabled') !== 'true');
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      event.stopImmediatePropagation();
      return;
    }
    if (event.key === 'Escape' && (state.confirmationIds.length || state.proofPreview || state.historyVersion || state.gameSalesDetailId || state.cdkeyDetailId)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.proofPreview) { state.proofPreview = null; rerender(); }
      else if (state.historyVersion) { state.historyVersion = null; rerender(); }
      else if (state.gameSalesDetailId) { state.gameSalesDetailId = ''; rerender(); }
      else if (state.cdkeyDetailId) { state.cdkeyDetailId = ''; rerender(); }
      else closeConfirmation();
    }
  });
  window.addEventListener('hashchange', () => {
    if (embedded) return;
    const route = location.hash.replace(/^#\/?/,'');
    state.route = route === 'entity' ? 'entity' : 'settlement';
    state.page = 1;
    state.selectedStatementIds = [];
    state.confirmationIds = [];
    state.confirmationReturn = null;
    state.proofPreview = null;
    state.historyVersion = null;
    state.gameSalesDetailId = '';
    state.cdkeyDetailId = '';
    standaloneRender();
  });

  window.__developerFinanceDemo = {
    snapshot:() => ({
      scenario:state.demoScenario,
      settlements:allSettlements(),
      visibleSettlements:visibleSettlements(),
      selectedStatementIds:[...state.selectedStatementIds],
      financialEntity:activeFinancialEntity(),
      financialEntityApplications:entityApplications(),
    }),
    reviewEntity,
    setEnterpriseCertificationStatus:status => { state.enterpriseCertificationStatus = status; state.entityMode = 'view'; rerender(); },
    setDemoScenario:scenarioName => { state.demoScenario = scenarioName; rerender(); },
    reset:() => location.reload(),
  };

  if (embedded) {
    window.PublisherFinance = {
      routeIds:['P15-01','P15-02'],
      createState:() => state,
      render:(_financeState, options = {}) => {
        state.route = options.routeId === 'P15-01' ? 'entity' : 'settlement';
        state.enterpriseCertificationStatus = options.access?.qualificationStatus || 'approved';
        state.demoScenario = state.enterpriseCertificationStatus === 'approved' ? 'exhaustive' : 'empty';
        const canonicalRoute = state.route === 'entity' ? 'P15-01' : 'P15-02';
        return `<section class="publisher-finance" data-testid="developer-finance-demo" data-finance-route="${canonicalRoute}">${pageContent()}${auxiliaryOverlays()}</section>`;
      },
      bind:(_root, options = {}) => {
        state.callbacks.onChange = typeof options.onChange === 'function' ? options.onChange : null;
        state.callbacks.onNavigate = typeof options.onNavigate === 'function' ? options.onNavigate : null;
        document.body.classList.toggle('finance-overlay-open', Boolean(state.confirmationIds.length || state.proofPreview || state.historyVersion || state.gameSalesDetailId || state.cdkeyDetailId));
      },
      closeOverlays:() => {
        state.selectedStatementIds = [];
        state.confirmationIds = [];
        state.confirmationReturn = null;
        state.proofPreview = null;
        state.historyVersion = null;
        state.gameSalesDetailId = '';
        state.cdkeyDetailId = '';
        document.body.classList.remove('finance-overlay-open');
      },
      applyEntryContext:(_financeState, context = {}) => {
        const filters = context.filters || {};
        state.filters = {
          billingMonth:filters.billingMonth || filters.month || 'all',
          settlementMonth:filters.settlementMonth || 'all',
          gameId:filters.gameId || context.gameId || 'all',
          status:filters.status || 'all',
        };
        state.page = 1;
        state.selectedStatementIds = [];
        state.confirmationIds = [];
        state.confirmationReturn = null;
        state.proofPreview = null;
        state.historyVersion = null;
        state.gameSalesDetailId = '';
        state.cdkeyDetailId = '';
      },
      setScenario:(_financeState, scenarioName) => {
        state.demoScenario = ['exhaustive','empty'].includes(scenarioName) ? scenarioName : 'exhaustive';
        state.selectedStatementIds = [];
        state.confirmationIds = [];
        state.confirmationReturn = null;
        state.proofPreview = null;
        state.historyVersion = null;
        state.gameSalesDetailId = '';
        state.cdkeyDetailId = '';
        state.page = 1;
        rerender();
      },
      setEnterpriseCertificationStatus:(_financeState, status) => {
        state.enterpriseCertificationStatus = status;
        state.entityMode = 'view';
        rerender();
      },
    };
  } else {
    const route = location.hash.replace(/^#\/?/,'');
    state.route = route === 'entity' ? 'entity' : 'settlement';
    standaloneRender();
  }
})();

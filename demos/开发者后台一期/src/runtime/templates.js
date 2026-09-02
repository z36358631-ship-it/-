window.GameHubDemo = window.GameHubDemo || {};

(function registerTemplates(namespace) {
  const c = namespace.components;
  const e = c.escapeHtml;
  const icon = name => namespace.icons.render(name);

  const sectionsOf = page => Array.isArray(page?.sections) ? page.sections : [];
  const itemsOf = section => Array.isArray(section?.items) ? section.items : [];
  const flattenItems = page => sectionsOf(page).flatMap(itemsOf).filter(Boolean);
  const actionOf = (page, fallbackId, fallbackLabel) => {
    const actions = Array.isArray(page?.actions) ? page.actions : [];
    const exact = actions.find(action => action.id === fallbackId);
    return exact || { id: fallbackId, label: fallbackLabel };
  };
  const renderActionButtons = (page, excluded = []) => {
    const actions = Array.isArray(page?.actions) ? page.actions : [];
    const visible = actions.filter(action => action?.id && !excluded.includes(action.id));
    return visible.length ? `<div class="form-actions">${visible.map(action => c.button({ label: action.label || action.id, variant: /reject|interrupt|stop|remove/.test(action.id) ? 'danger' : 'secondary', action: action.id })).join('')}</div>` : '';
  };
  const sectionList = items => `<div class="section-list">${(items.length ? items : ['待补充业务内容']).map((item, index) => `<div class="section-item"><span>${e(item)}</span><span class="section-item__index">${String(index + 1).padStart(2, '0')}</span></div>`).join('')}</div>`;
  const panel = ({ title, body, description = '' }) => `<section class="panel"><header class="panel-header"><div><h2 class="panel-title">${e(title)}</h2>${description ? `<div class="panel-description">${e(description)}</div>` : ''}</div></header><div class="panel-body">${body}</div></section>`;
  const readonlyField = ({ label, value, hint = '', wide = false }) => `<div class="field readonly-field${wide ? ' is-wide' : ''}"><span class="field-label"><span>${e(label)}</span>${hint ? `<span class="field-hint">${e(hint)}</span>` : ''}</span><div class="readonly-value">${e(value)}</div></div>`;
  const gateList = items => `<div class="gate-list">${items.map(item => `<div class="gate-item"><span><strong>${e(item.label)}</strong>${item.detail ? `<small>${e(item.detail)}</small>` : ''}</span>${c.statusTag(item.status)}</div>`).join('')}</div>`;
  const listViews = {
    'P01-04': {
      tabs: ['全部游戏', '待处理', '已发布'],
      placeholder: '输入游戏名称',
      filters: [{ label: '发行方式', options: ['全部方式', '第三方平台激活', '盖世直接下载'] }, { label: '资料状态', options: ['全部状态', '草稿', '审核中', '已通过', '已驳回'] }],
      headers: ['游戏名称', '发行方式', '资料状态', '供给／版本', '发布状态', '投放', '更新时间', '操作'],
      rows: [[{ text: '首款签约游戏', subtext: 'game_demo_001 · Windows' }, '盖世直接下载', { status: '已通过' }, '版本 1.0.0 · 测试不通过', { status: '尚未发布' }, '暂无投放', '2026-09-01 18:24', { action: '查看资料', demoAction: 'row-detail' }]],
    },
    'P01-07': {
      tabs: ['全部账号', '正常', '已停用'],
      placeholder: '输入账号或厂商名称',
      filters: [{ label: '账号状态', options: ['全部状态', '正常', '已停用'] }, { label: '绑定范围', options: ['全部厂商', '已绑定厂商'] }],
      headers: ['登录账号', '绑定厂商', '账号状态', '最近登录', '创建时间', '操作'],
      rows: [[{ text: 'developer@example.com', subtext: '受邀开发者账号' }, '示例厂商', { status: '正常' }, '2026-09-01 16:42', '2026-08-18 10:20', { action: '配置账号', demoAction: 'row-detail' }]],
    },
    'P02-01': {
      tabs: ['全部商品', '供给异常', '可供货'],
      placeholder: '输入游戏名称或 SKU',
      filters: [{ label: '供给状态', options: ['全部状态', '可供货', '库存不足', '售罄', '异常', '未知'] }, { label: '可售门禁', options: ['全部门禁', '已通过', '有阻塞项'] }],
      headers: ['游戏／商品', 'SKU', '发行方式', '商品状态', '供给状态', '可售门禁', '更新时间', '操作'],
      rows: [[{ text: '首款签约游戏', subtext: '标准版商品' }, 'SKU-DEMO-001', '第三方平台激活', { status: '停售' }, { status: '供给异常' }, '价格与来源待恢复', '2026-09-01 17:50', { action: '查看异常', demoAction: 'row-detail' }]],
    },
    'P02-03': {
      tabs: ['全部商品', '异常待处理', '门禁未齐'],
      placeholder: '输入游戏、厂商或 SKU',
      filters: [{ label: '发布与可售', options: ['全部状态', '待发布', '可售', '停售'] }, { label: '供给状态', options: ['全部供给', '可供货', '异常'] }],
      headers: ['商品', 'SKU 数', '发行方式', '商业门禁', '供给状态', '发布／可售', '更新时间', '操作'],
      rows: [[{ text: '首款签约游戏', subtext: '示例厂商' }, '1 个', '第三方平台激活', { status: '已通过' }, { status: '异常待处理' }, { status: '停售' }, '2026-09-01 17:50', { action: '配置商品', demoAction: 'row-detail' }]],
    },
    'P02-06': {
      tabs: ['异常生效中', '待恢复确认', '已恢复'],
      placeholder: '输入异常编号、商品或 SKU',
      filters: [{ label: '异常类型', options: ['全部类型', '库存', '价格', '来源', '商业供给'] }, { label: '处理状态', options: ['全部状态', '异常生效中', '待恢复确认', '已恢复'] }],
      headers: ['异常编号', '商品／SKU', '来源类型', '异常类型', '影响订单', '处理状态', '更新时间', '操作'],
      rows: [[{ text: 'SUP-20260901-001', subtext: '首次发现 16:20' }, '首款签约游戏 · SKU-DEMO-001', '供应商 API', '当前价格不可用', '新增销售已停止；既有订单不变', { status: '异常生效中' }, '2026-09-01 17:50', { action: '处理异常', demoAction: 'row-detail' }]],
    },
    'P03-01': {
      tabs: ['全部版本', '测试中', '待发布', '已发布'],
      placeholder: '输入版本号或修订号',
      filters: [{ label: '测试状态', options: ['全部状态', '待提交', '测试中', '测试不通过', '测试通过'] }, { label: '发布状态', options: ['全部状态', '尚未发布', '待发布', '已发布', '已撤回'] }],
      headers: ['版本号', '包体修订', '测试轮次', '测试状态', '发布状态', '更新时间', '操作'],
      rows: [[{ text: '1.0.0', subtext: 'Windows · 正式分支' }, 'build_rev_003', '第 1 轮', { status: '测试不通过' }, { status: '尚未发布' }, '2026-09-01 15:36', { action: '查看结果', demoAction: 'row-detail' }]],
    },
    'P03-06': {
      tabs: ['待测试', '测试中', '已完成'],
      placeholder: '输入任务、游戏或版本',
      filters: [{ label: '任务状态', options: ['全部状态', '待测试', '测试中', '已完成', '已失效'] }, { label: '分配时间', options: ['全部时间', '今天', '近 7 天'] }],
      headers: ['待测任务', '游戏／版本', '包体修订', '测试轮次', '测试人员', '分配时间', '任务状态', '操作'],
      rows: [[{ text: 'test_task_demo_002', subtext: '正式环境验收' }, '首款签约游戏 · 1.0.0', 'build_rev_003', '第 1 轮', '陈宇（本人）', '2026-09-01 13:10', { status: '待测试' }, { action: '领取并查看', demoAction: 'row-detail' }]],
    },
    'P03-09': {
      tabs: ['待分配', '测试中', '测试通过待确认', '异常'],
      placeholder: '输入厂商、游戏或版本',
      filters: [{ label: '测试结果', options: ['全部结果', '未提交', '测试通过', '测试不通过'] }, { label: '审核状态', options: ['全部状态', '待分配', '待确认', '已确认'] }],
      headers: ['厂商／游戏', '版本／修订', '轮次', '有效任务', '测试结果', '审核状态', '发布门禁', '操作'],
      rows: [[{ text: '示例厂商', subtext: '首款签约游戏' }, '1.0.0 · build_rev_003', '第 1 轮', '尚未分配', '未提交', { status: '待分配' }, '测试结果待完成', { action: '分配测试', demoAction: 'row-detail' }]],
    },
    'P03-11': {
      tabs: ['待配置', '已排期', '发布失败'],
      placeholder: '输入游戏、版本或修订',
      filters: [{ label: '门禁状态', options: ['全部门禁', '已通过', '有阻塞项'] }, { label: '发布方式', options: ['全部方式', '未配置', '立即发布', '定时发布'] }],
      headers: ['候选版本', '门禁状态', '当前线上版本', '发布方式／时间', '最近结果', '状态', '操作'],
      rows: [[{ text: '1.0.0', subtext: 'build_rev_003 · 首款签约游戏' }, { status: '已通过' }, '尚未发布正式版本', '未配置', '暂无发布记录', { status: '待发布' }, { action: '发布配置', demoAction: 'row-detail' }]],
    },
    'P04-01': {
      tabs: ['全部需求', '草稿', '平台处理中', '已结束'],
      placeholder: '输入投放需求或游戏',
      filters: [{ label: '需求状态', options: ['全部状态', '草稿', '开发者已提交', '平台配置中', '已排期', '已驳回'] }, { label: '期望时间', options: ['全部时间', '近 7 天', '近 30 天'] }],
      headers: ['投放需求', '游戏', '投放目标', '期望时间', '需求状态', '更新时间', '操作'],
      rows: [[{ text: 'campaign_demo_001', subtext: '素材修订 01' }, '首款签约游戏', '详情访问', '2026-09-10 — 2026-09-20', { status: '开发者已提交' }, '2026-09-01 18:05', { action: '查看详情', demoAction: 'row-detail' }]],
    },
    'P04-05': {
      tabs: ['待处理', '平台配置中', '已排期', '投放中', '已结束'],
      placeholder: '输入计划、游戏或厂商',
      filters: [{ label: '计划状态', options: ['全部状态', '开发者已提交', '平台配置中', '已排期', '投放中', '已暂停', '已结束'] }, { label: '负责人', options: ['全部负责人', '待领取', '我负责的'] }],
      headers: ['投放计划', '厂商／游戏', '目标', '资源位', '期望／实际排期', '负责人', '计划状态', '操作'],
      rows: [[{ text: 'campaign_demo_001', subtext: '2026-09-01 提交' }, '示例厂商 · 首款签约游戏', '详情访问', '待配置', '期望 09-10 — 09-20／实际待定', '待领取', { status: '开发者已提交' }, { action: '开始配置', demoAction: 'row-detail' }]],
    },
  };
  const defaultFooter = (page, options = {}) => {
    const save = actionOf(page, 'save-draft', '保存草稿');
    return `<footer class="form-footer"><span class="save-state" data-save-state>最近保存：未保存，刷新后恢复初始演示数据</span><div class="form-actions">${options.noSave ? '' : c.button({ label: save.label, action: save.id })}${renderActionButtons(page, [save.id])}</div></footer>`;
  };

  const renderT01 = ({ page, route }) => {
    const onboarding = page.onboarding;
    return `<div class="onboarding-shell" data-onboarding>
      <section class="onboarding-intro" data-onboarding-intro>
        <div class="onboarding-brand"><div class="brand-mark">${icon('logo')}</div><span class="onboarding-audience">${e(onboarding.audience)}</span></div>
        <div class="page-eyebrow">${e(route.id)} / ${e(route.templateId)}</div>
        <h1 class="page-title" data-page-title>${e(route.title)}</h1>
        <h2>${e(onboarding.title)}</h2><p>${e(onboarding.description)}</p>
        <ol class="onboarding-steps">${onboarding.steps.map((step, index) => `<li><span>${index + 1}</span><strong>${e(step)}</strong></li>`).join('')}</ol>
        <div class="onboarding-preparations"><strong>开始前请准备</strong>${onboarding.preparations.map(item => `<span>${e(item)}</span>`).join('')}</div>
        ${c.button({ label: onboarding.primaryAction, variant: 'primary', action: 'start-onboarding', primary: true, iconName: 'chevron' })}
      </section>
      <section class="login-form" data-login-panel hidden>
        <button class="text-back" type="button" data-demo-action="back-onboarding">返回合作说明</button>
        <div class="page-eyebrow">${e(route.id)} / ${e(route.templateId)}</div>
        <h2>${e(route.title)}</h2><p>使用已获授权的受邀账号继续</p>
        <div class="login-form__fields">${c.input({ label: '账号', value: 'developer@example.com', required: true })}${c.input({ label: '密码', value: 'demo-password', type: 'password', required: true })}</div>
        <div class="login-form__action">${c.button({ label: '登录', variant: 'primary', action: actionOf(page, 'login', '登录').id, iconName: 'chevron' })}</div>
        <div class="login-help">账号由盖世游戏发行运营创建；本页不发起真实认证。</div>
      </section>
    </div>`;
  };

  const renderT02 = ({ page }) => {
    return `<div class="content-grid"><section class="dashboard-hero span-12"><div class="dashboard-hero__top"><div><h2>首款签约游戏</h2><p>${e(page.summary)}</p></div>${c.statusTag(page.status)}</div><div class="dashboard-steps">${c.stepper({ items: ['资料建档', '发行方式', '平台处理', '上线发行'], active: 2 })}</div></section>
      <div class="span-12 metric-grid">${c.metricCard({ label: '待办', value: '2', trend: '需要开发者处理' })}${c.metricCard({ label: '资料状态', value: '已通过', trend: '下游可读取已批准快照' })}${c.metricCard({ label: '版本状态', value: '测试不通过', trend: 'build_rev_003 待修订' })}${c.metricCard({ label: '投放状态', value: '平台配置中', trend: 'campaign_demo_001' })}</div>
      <div class="span-7">${panel({ title: '当前待办', body: gateList([{ label: '修订 Windows 版本', detail: '1.0.0 · build_rev_003 第 1 轮测试不通过', status: '待开发者处理' }, { label: '查看投放运营回执', detail: 'campaign_demo_001 正由平台配置', status: '平台配置中' }, { label: '确认已批准资料快照', detail: '厂商与游戏资料已通过，下游可读取', status: '已通过' }]) })}</div><div class="span-5">${panel({ title: '发行进度', body: c.timeline({ items: ['投放需求已由平台领取 · 2026-09-01 18:20', 'build_rev_003 测试不通过 · 2026-09-01 15:36', '选择盖世直接下载发行方式 · 2026-08-22', '厂商与游戏资料审核通过 · 2026-08-20'] }) })}</div></div>`;
  };

  const renderListView = (config, tabOptions = {}) => {
    const filters = config.filters.map(filter => c.select(filter)).join('');
    return `<div>${c.tabs({ items: config.tabs, active: 0, ...tabOptions })}<div class="filter-bar"><label class="field"><span class="field-label">关键词</span><span class="search-field">${icon('search')}<input class="gh-input" data-component="Input" data-variant="search" placeholder="${e(config.placeholder)}"></span></label>${filters}${c.button({ label: '查询', action: 'filter-list', iconName: 'search' })}</div>${c.table({ headers: config.headers, rows: config.rows })}${c.pagination({ total: config.rows.length, page: 1 })}</div>`;
  };

  const renderSupplyList = () => renderListView(listViews['P02-01'], { idPrefix: 'supply-filter-tab', indexAttribute: 'data-supply-tab-index' });

  const renderKeyBatchPanel = data => `<div class="cdkey-panel-grid">
    ${panel({ title: '创建 Key 批次', description: '只允许在当前授权游戏、SKU、渠道、配额和有效期内创建', body: `<div class="form-grid">
      ${c.input({ label: '批次名称', value: '渠道 A 首发批次', required: true })}
      ${c.select({ label: 'Key 来源', options: [{ label: data.keySources[0].label, value: data.keySources[0].id }], value: 'gamehub_generated' })}
      ${c.select({ label: '游戏 / SKU', options: ['首款签约游戏 / SKU-DEMO-001'], value: '首款签约游戏 / SKU-DEMO-001' })}
      ${c.input({ label: '用途', value: '渠道 A 首发销售', required: true })}
      ${c.select({ label: '渠道', options: data.authorization.channels, value: data.authorization.channels[0] })}
      ${c.input({ label: '数量', value: '2000', type: 'number', required: true })}
      ${c.input({ label: '有效期', value: '2026-12-31T23:59', type: 'datetime-local', required: true })}
    </div><div class="source-boundary"><strong>${e(data.keySources[1].label)}</strong><span>${e(data.keySources[1].rule)}</span></div><div data-key-batch-result></div><footer class="form-footer"><span class="save-state">Key 明文仅在有效窗口内下载一次</span>${c.button({ label: '创建批次', variant: 'primary', action: 'create-key-batch' })}</footer>` })}
    ${panel({ title: 'Key 批次', description: '已分配记录始终保留，作废只影响未分配库存', body: `${c.table({ headers: ['批次', '来源', '数量 / 剩余', '渠道', '状态', '操作'], rows: data.keyBatches.map(batch => [{ text: batch.name, subtext: batch.batchId }, batch.source, `${batch.quantity} / ${batch.remaining}`, batch.channel, { status: batch.status }, { action: '暂停', demoAction: 'pause-key-batch' }]) })}<div class="form-actions cdkey-table-actions">${c.button({ label: '作废未分配库存', variant: 'danger', action: 'void-key-batch' })}</div>` })}
  </div>`;

  const renderCredentialPanel = data => `<div class="cdkey-panel-grid">
    ${panel({ title: '创建渠道凭据', description: 'Secret 仅在创建或轮换成功时展示一次', body: `<div class="form-grid">
      ${c.input({ label: '凭据名称', value: '渠道 A 正式凭据', required: true })}
      ${c.select({ label: '白名单渠道', options: data.authorization.channels, value: data.authorization.channels[0] })}
      ${c.select({ label: '授权游戏 / SKU', options: ['首款签约游戏 / SKU-DEMO-001'], value: '首款签约游戏 / SKU-DEMO-001' })}
      ${c.input({ label: '凭据配额', value: '5000', type: 'number', required: true })}
      ${c.input({ label: '有效期', value: '2026-12-31T23:59', type: 'datetime-local', required: true })}
    </div><div data-credential-result></div><footer class="form-footer"><span class="save-state">凭据不能扩大平台预授权范围</span>${c.button({ label: '创建凭据', variant: 'primary', action: 'create-api-credential' })}</footer>` })}
    ${panel({ title: '已创建凭据', description: 'Secret 后续只显示末四位；遗失时必须轮换', body: `${c.table({ headers: ['凭据 / client_id', 'Secret', '授权范围', '有效期', '状态', '最近调用'], rows: data.credentials.map(item => [{ text: item.name, subtext: item.clientId }, item.secretHint, item.scope, item.expiresAt, { status: item.status }, item.lastCalledAt]) })}<div class="form-actions cdkey-table-actions">${c.button({ label: '轮换', action: 'rotate-api-credential' })}${c.button({ label: '暂停', action: 'pause-api-credential' })}${c.button({ label: '撤销', variant: 'danger', action: 'revoke-api-credential' })}</div>` })}
  </div>`;

  const renderApiDocs = (docs, apiExample) => `<div class="content-grid api-docs-layout">
    <div class="span-4"><nav class="api-docs-nav" aria-label="接口说明目录">${[['auth', '鉴权与幂等'], ['endpoints', '接口目录'], ['fields', '字段说明'], ['example', '请求示例'], ['errors', '错误码']].map(([id, label]) => `<button type="button" data-demo-action="api-doc-section" data-api-target="api-doc-${id}">${e(label)}</button>`).join('')}</nav>${panel({ title: '接入步骤', body: sectionList(['创建渠道凭据', '按 HMAC-SHA256 生成签名', '使用 request_id 发起幂等申请', '查询结果并确认已交付']) })}</div>
    <div class="span-8 api-docs-content"><section id="api-doc-auth">${panel({ title: '鉴权与幂等', body: `<p>${e(docs.auth)}</p><p>${e(docs.idempotency)}</p>` })}</section><section id="api-doc-endpoints">${panel({ title: '接口目录', body: c.table({ headers: ['方法', '路径', '用途'], rows: docs.endpoints.map(item => [item.method, item.path, item.purpose]) }) })}</section><section id="api-doc-fields">${panel({ title: '字段说明', body: c.table({ headers: ['字段', '必填', '说明'], rows: [['request_id', '是', '渠道侧幂等请求号'], ['channel_order_id', '是', '渠道订单号'], ['game_id', '是', '已授权游戏'], ['sku_id', '是', '已授权 SKU'], ['status', '响应', '分配处理状态']] }) })}</section><section id="api-doc-example">${c.codeBlock({ title: '申请一个 Key · 演示请求', code: apiExample })}</section><section id="api-doc-errors">${panel({ title: '错误码', body: `<div class="error-chip-list">${docs.errors.map(item => `<button type="button" data-demo-action="filter-api-error">${e(item)}</button>`).join('')}</div>` })}</section></div>
  </div>`;

  const renderCdkeyWorkspace = page => {
    const data = page.cdkeySelfService;
    const apiExample = `POST /openapi/v1/cdkeys/allocate\nX-Client-Id: gh_demo_channel_a\nX-Timestamp: 1788336000\nX-Nonce: demo_nonce\nX-Signature: demo_hmac_signature\n\n{\n  "request_id": "req_demo_001",\n  "channel_order_id": "channel_order_demo_001",\n  "game_id": "game_demo_001",\n  "sku_id": "SKU-DEMO-001"\n}`;
    return `<div class="cdkey-workspace" data-cdkey-workspace>
      ${c.authorizationSummary(data.authorization)}
      ${c.tabs({ items: data.tabs, active: 0, variant: 'task', action: 'cdkey-tab', idPrefix: 'cdkey-tab' })}
      <section role="tabpanel" aria-labelledby="cdkey-tab-0" id="cdkey-tab-0-panel" data-cdkey-panel="supply">${renderSupplyList()}</section>
      <section role="tabpanel" aria-labelledby="cdkey-tab-1" id="cdkey-tab-1-panel" data-cdkey-panel="batches" hidden>${renderKeyBatchPanel(data)}</section>
      <section role="tabpanel" aria-labelledby="cdkey-tab-2" id="cdkey-tab-2-panel" data-cdkey-panel="credentials" hidden>${renderCredentialPanel(data)}</section>
      <section role="tabpanel" aria-labelledby="cdkey-tab-3" id="cdkey-tab-3-panel" data-cdkey-panel="api-docs" hidden>${renderApiDocs(data.apiDocs, apiExample)}</section>
    </div>`;
  };

  const renderT03 = ({ route, page }) => {
    if (route.id === 'P02-01') return renderCdkeyWorkspace(page);
    const view = listViews[route.id];
    const fallback = { tabs: ['全部', '待处理', '已完成'], placeholder: '输入名称或 ID', filters: [{ label: '业务状态', options: ['全部状态', '待处理', '处理中', '已完成'] }], headers: ['对象', '状态', '更新时间', '操作'], rows: [] };
    const config = view || fallback;
    return renderListView(config);
  };

  const renderT04 = ({ page }) => `<div class="content-grid"><div class="span-8">${panel({ title: '厂商公开资料', description: '审核通过后用于固定厂商主页', body: `<div class="form-grid">${c.input({ label: '厂商名称', value: '示例厂商', required: true })}${c.input({ label: 'HTTPS 官网', value: 'https://developer.example.com', required: true, hint: '仅接受完整 HTTPS 地址' })}${c.textarea({ label: '厂商简介', value: '专注于 Windows 单机游戏研发与发行。', required: true, hint: '审核通过后对外展示' })}</div><div class="asset-upload asset-upload--logo"><div class="asset-preview asset-preview--logo">LOGO</div><div><strong>厂商 Logo</strong><p>支持 JPG、PNG、WEBP；上传失败不影响其他字段。</p>${c.button({ label: '替换 Logo', action: 'replace-vendor-logo' })}</div></div>${defaultFooter(page)}` })}</div><div class="span-4">${panel({ title: '协作联系资料', description: '仅供平台协作，不在 C 端展示', body: `<div class="stacked-fields">${c.input({ label: '联系人', value: '林晨', required: true })}${c.input({ label: '手机', value: '138 0000 1234', hint: '手机或邮箱至少填写一项' })}${c.input({ label: '邮箱', value: 'linchen@example.com', type: 'email', hint: '手机或邮箱至少填写一项' })}</div>` })}</div></div>`;

  const renderT05 = ({ page }) => `<div class="game-editor">${c.tabs({ items: ['基本资料', '平台与发行', '素材检查'], active: 0 })}<div class="content-grid"><div class="span-8">${panel({ title: '游戏基本资料', body: `<div class="form-grid game-form-grid">${c.input({ label: '游戏名称', value: '首款签约游戏', required: true })}${c.input({ label: '开发商', value: '示例厂商', required: true })}${c.input({ label: '短简介', value: '面向 Windows 玩家的一次完整冒险。', required: true })}${readonlyField({ label: '归属厂商', value: '示例厂商', hint: '单厂商一期只读' })}${c.textarea({ label: '游戏介绍', value: '玩家将探索未知区域、完成挑战并逐步解锁新的能力与内容。', required: true })}</div><div class="game-config-section"><div class="game-compact-grid">${c.select({ label: '支持语言', options: ['简体中文', '繁体中文', '英语'], value: '简体中文' })}${c.select({ label: '销售地区', options: ['中国大陆', '全球（授权地区）'], value: '中国大陆' })}${readonlyField({ label: '支持平台', value: 'Windows', hint: '一期固定' })}</div><div class="requirements-grid">${c.input({ label: 'Windows 最低系统要求', value: 'Windows 10 64 位 · i5 · 8 GB', required: true })}${c.input({ label: 'Windows 推荐系统要求', value: 'Windows 11 64 位 · i7 · 16 GB', required: true })}</div><div class="candidate-tags"><span class="field-label">候选标签</span><div class="rule-chips"><button class="rule-chip is-active" data-demo-action="candidate-tag">动作</button><button class="rule-chip is-active" data-demo-action="candidate-tag">冒险</button><button class="rule-chip is-active" data-demo-action="candidate-tag">单人</button><button class="rule-chip" data-demo-action="candidate-tag">角色扮演</button></div><small>从平台标签库选择，运营审核后生效</small></div><div class="release-choice compact-release-choice"><label class="choice-card is-selected"><input type="radio" name="release-method" checked data-demo-action="release-direct-download"><span><strong>盖世直接下载</strong><small>提交 Windows 包体，由平台测试与发布</small></span></label><label class="choice-card"><input type="radio" name="release-method" data-demo-action="release-third-party"><span><strong>第三方平台激活</strong><small>由平台运营配置商品、SKU 与供给</small></span></label></div></div><footer class="form-footer"><span class="save-state" data-save-state>最近保存：未保存，刷新后恢复初始演示数据</span><div class="form-actions">${c.button({ label: '保存草稿', action: 'save-draft' })}${c.button({ label: '提交审核', variant: 'primary', action: 'submit-game-review' })}</div></footer>` })}</div><div class="span-4">${panel({ title: '游戏素材', description: '单项失败可重试，不清空其他素材', body: `<div class="asset-grid compact-assets"><div class="asset-card"><div class="asset-placeholder asset-placeholder--icon">1:1</div><strong>游戏图标</strong><span>1024 × 1024</span></div><div class="asset-card"><div class="asset-placeholder asset-placeholder--landscape">16:9</div><strong>横版封面</strong><span>1920 × 1080</span></div><div class="asset-card"><div class="asset-placeholder asset-placeholder--portrait">3:4</div><strong>竖版封面</strong><span>900 × 1200</span></div><div class="asset-card"><div class="asset-placeholder asset-placeholder--screens">3 / 10</div><strong>游戏截图</strong><span>已上传 3 张</span></div></div>${c.button({ label: '上传／替换素材', action: 'manage-game-assets' })}` })}</div></div></div>`;

  const renderT06 = ({ page, route }) => {
    if (route.id === 'P03-05') {
      return `<div><div class="task-summary"><div><span>版本</span><strong>1.0.0</strong></div><div><span>包体修订</span><strong>build_rev_003</strong></div><div><span>测试轮次</span><strong>第 1 轮</strong></div><div><span>测试时间</span><strong>2026-09-01 15:36</strong></div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${c.resultStrip({ title: '测试不通过', detail: '启动后主窗口持续白屏，当前包体修订不可进入发布门禁', variant: 'danger' })}${panel({ title: '具体问题项', body: c.table({ headers: ['问题项', '问题现象', '复现条件', '影响范围'], rows: [['启动与首屏', 'Game.exe 启动后主窗口持续白屏', 'Windows 11 64 位；首次安装后直接启动', '阻塞玩家进入游戏'], ['退出与重启', '结束进程后再次启动仍复现', '同一安装目录连续启动 2 次', '影响全部当前修订测试']] }) })}<div class="issue-result-note"><strong>修订判断</strong><p>需替换包体并生成新修订；旧测试轮次和问题记录保持只读，不可直接改为通过。</p><span>附件摘要：启动白屏截图 1 张 · 测试日志摘要 1 份</span></div></div><div class="span-4">${panel({ title: '测试处理时间线', body: c.timeline({ items: ['测试结果提交 · 不通过 · 陈宇 · 15:36', '问题复现并记录附件 · 15:28', '任务开始测试 · 14:50', '第 1 轮任务分配完成 · 13:10'] }) })}</div></div></div>`;
    }
    return `<div><div class="task-summary"><div><span>审核对象</span><strong>首款签约游戏 · 游戏资料</strong></div><div><span>审核版本</span><strong>资料修订 02</strong></div><div><span>提交时间</span><strong>2026-09-01 10:42</strong></div><div><span>处理时间</span><strong>2026-09-01 11:20</strong></div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${c.resultStrip({ title: page.status || '已驳回', detail: '素材与候选标签存在 2 个问题，修改后需生成新审核版本', variant: 'danger' })}${panel({ title: '审核问题与驳回原因', body: c.table({ headers: ['问题项', '开发者提交值', '平台结果／驳回原因', '处理建议'], rows: [['竖版封面', '900 × 1200 · 素材修订 02', '标题文字进入裁切安全区', '调整文字位置后替换该素材'], ['候选标签', '动作、冒险、角色扮演', '“角色扮演”与当前可见玩法不一致', '保留动作、冒险并补充标签依据']] }) })}<div class="issue-result-note"><strong>生效说明</strong><p>继续修改将恢复资料修订 02 的原输入；重新提交生成新审核版本，不覆盖本次原因。</p></div></div><div class="span-4">${panel({ title: '审核处理时间线', body: c.timeline({ items: ['资料修订 02 已驳回 · 运营李佳 · 11:20', '素材与标签检查完成 · 11:12', '资料修订 02 提交审核 · 10:42', '资料修订 01 已通过 · 2026-08-20'] }) })}</div></div></div>`;
  };

  const renderT07 = ({ page, route }) => {
    const approve = actionOf(page, 'approve', '通过');
    const reject = actionOf(page, 'reject', '驳回');
    const reviews = {
      'P01-08': [
        ['厂商名称', '示例厂商', '与签约主体及授权范围一致', { status: '待审核' }],
        ['Logo', 'PNG · 1024 × 1024', '格式、清晰度与品牌归属符合要求', { status: '待审核' }],
        ['厂商简介', '专注于 Windows 单机游戏研发与发行', '不含未经授权的承诺或外部导流', { status: '待审核' }],
        ['HTTPS 官网', 'https://developer.example.com', '完整 HTTPS 地址且可验证归属', { status: '待审核' }],
        ['协作联系人', '林晨 · 手机／邮箱已填写', '手机或邮箱至少一项有效，仅平台可见', { status: '待审核' }],
      ],
      'P01-09': [
        ['游戏名称', '首款签约游戏', '与项目授权和厂商归属一致', { status: '待审核' }],
        ['发行方式', '盖世直接下载', '与第三方平台激活互斥', { status: '待审核' }],
        ['平台与系统', 'Windows · 最低／推荐配置已填写', '一期不接受 Mac、Linux 或主机配置', { status: '待审核' }],
        ['语言与销售地区', '简体中文 · 中国大陆', '不得超出授权和可售范围', { status: '待审核' }],
        ['素材与候选标签', '图标、封面、3 张截图 · 动作／冒险／单人', '素材规格完整；标签审核后生效', { status: '待审核' }],
      ],
      'P03-10': [
        ['候选版本', '1.0.0 · build_rev_003', '与第 1 轮测试锁定修订一致', { status: '已通过' }],
        ['测试结果', '陈宇 · 第 1 轮测试通过', '首个成功终态有效且不可覆盖', { status: '已通过' }],
        ['当前线上版本', '尚未发布正式版本', '发布成功后保持唯一当前线上版本', { status: '已通过' }],
        ['资料与包体门禁', '授权、资料、包体均有效', '任一失效即阻塞确认待发布', { status: '已通过' }],
        ['商品／领取及商业门禁', '当前发行方式门禁已满足', '不允许忽略未满足项继续', { status: '待确认' }],
      ],
      'P04-06': [
        ['需求与素材修订', 'campaign_demo_001 · 素材修订 01', '必须与开发者当前提交快照一致', { status: '待审核' }],
        ['目标游戏', '首款签约游戏 · 已批准资料', '发布状态、地区与系统当前有效', { status: '待审核' }],
        ['落地页', '游戏详情页 · 详情访问', '交付方式和领取条件与推广目标一致', { status: '待审核' }],
        ['期望人群', '中国大陆 · 简体中文 · Windows', '仅作需求输入，最终规则由运营配置', { status: '待审核' }],
        ['快照一致性', '素材与落地页未变化', '变化后旧预览不可继续审核', { status: '已通过' }],
      ],
    };
    const rows = reviews[route.id] || reviews['P01-08'];
    return `<div>${c.resultStrip({ title: '请核对提交快照与平台规则', detail: '审核结果仅改变当前页面演示状态', variant: 'warning' })}${c.table({ headers: ['检查项', '提交内容／当前值', '平台规则／差异', '结果'], rows })}<div class="review-reject-reason">${c.textarea({ label: '驳回原因', placeholder: '驳回时必填，请说明问题项和可执行修改要求', required: true })}</div><footer class="form-footer"><span class="save-state">通过前重新校验快照；驳回不覆盖开发者提交内容</span><div class="form-actions">${c.button({ label: reject.label, variant: 'danger', action: reject.id })}${c.button({ label: approve.label, variant: 'primary', action: approve.id })}</div></footer></div>`;
  };

  const renderT08 = ({ page, route }) => {
    const views = {
      'P02-04': {
        title: '商品与 SKU 配置', description: '价格和库存读取生效来源快照，运营不维护本地独立价格',
        body: `<div class="form-grid">${readonlyField({ label: '商品名称', value: '首款签约游戏 · 标准版' })}${readonlyField({ label: '发行方式', value: '第三方平台激活' })}${c.input({ label: 'SKU 名称', value: '标准版 CDKEY', required: true })}${c.input({ label: '版本', value: '标准版', required: true })}${c.select({ label: '激活平台', options: ['Steam', 'Epic'], value: 'Steam' })}${c.select({ label: '销售地区', options: ['中国大陆', '全球（授权地区）'], value: '中国大陆' })}${readonlyField({ label: '当前价格', value: '¥ 68.00 CNY', hint: '来源快照 · 17:42' })}${c.select({ label: '平台生效状态', options: ['配置完成／不可售', '可售', '停售'], value: '配置完成／不可售' })}</div>`,
        gates: [{ label: '资料与项目授权', detail: '资料审核已通过', status: '已通过' }, { label: 'SKU 来源关联', detail: '等待有效供应来源', status: '待关联' }, { label: '地区与价格快照', detail: '保存时重新校验', status: '待校验' }], save: true,
      },
      'P02-05': {
        title: '供应来源关联', description: '一期默认展示供应商 API；受控直接供 Key 机制待业务确认',
        body: `<div class="form-grid">${readonlyField({ label: 'SKU', value: 'SKU-DEMO-001 · 标准版 CDKEY' })}${readonlyField({ label: '当前关联状态', value: '待关联' })}${c.select({ label: '供应来源类型', options: ['供应商 API', '受控来源（待业务确认）'], value: '供应商 API' })}${c.input({ label: '来源商品 ID', value: 'supplier_item_demo_01', required: true })}${readonlyField({ label: '来源商品名称', value: '首款签约游戏 标准版' })}${readonlyField({ label: '版本／平台', value: '标准版 · Steam' })}${readonlyField({ label: '地区／币种', value: '中国大陆 · CNY' })}${readonlyField({ label: '同步状态', value: '价格正常 · 库存状态未知', hint: '最近同步 17:42' })}</div>`,
        gates: [{ label: '来源连接', detail: '不展示接口与凭据', status: '已通过' }, { label: '价格与地区', detail: '与 SKU 配置一致', status: '已通过' }, { label: '发货能力', detail: '待供应来源确认', status: '待确认' }], save: true,
      },
      'P03-02': {
        title: '版本资料', description: '单一 Windows 正式分支；测试中及测试通过后只读',
        body: `<div class="form-grid">${readonlyField({ label: '游戏／厂商', value: '首款签约游戏 · 示例厂商' })}${readonlyField({ label: '平台／分支', value: 'Windows · 正式分支' })}${c.input({ label: '版本号', value: '1.0.0', required: true })}${readonlyField({ label: '包体修订', value: 'build_rev_003', hint: '上传校验后生成' })}${c.textarea({ label: '更新说明', value: '首个正式版本，包含基础关卡与完整启动流程。', required: true })}${c.input({ label: '启动文件', value: 'Game.exe', required: true })}${c.input({ label: '启动参数', value: '-language=zh-CN' })}${c.textarea({ label: '运行说明', value: '首次启动会进行资源校验，请保持安装目录可写。' })}</div>`,
        gates: [{ label: '版本号唯一性', detail: '已发布版本号永久占用', status: '已通过' }, { label: '启动文件存在', detail: '随包体修订重新校验', status: '待校验' }, { label: '编辑权限', detail: '当前为草稿，可编辑', status: '可编辑' }], save: true,
      },
      'P03-04': {
        title: '提交测试确认', description: '提交后锁定本轮资料与包体修订，测试结束前不可替换',
        body: `<div class="summary-grid">${readonlyField({ label: '游戏／版本', value: '首款签约游戏 · 1.0.0' })}${readonlyField({ label: '平台／分支', value: 'Windows · 正式分支' })}${readonlyField({ label: '包体摘要', value: 'build_rev_003 · 10.0 GB' })}${readonlyField({ label: '测试轮次', value: '第 1 轮' })}${readonlyField({ label: '启动信息', value: 'Game.exe · 正式环境', wide: true })}${readonlyField({ label: '更新说明', value: '首个正式版本，包含基础关卡与完整启动流程。', wide: true })}</div>`,
        gates: [{ label: '项目归属与授权', detail: '示例厂商 · 首款签约游戏', status: '已通过' }, { label: '包体基础校验', detail: '完整性、可读性与启动文件', status: '已通过' }, { label: '资料与修订一致', detail: '当前为 build_rev_003', status: '已通过' }], save: false,
      },
    };
    const view = views[route.id] || views['P03-02'];
    const footer = view.save ? defaultFooter(page) : `<footer class="form-footer"><span class="save-state">全部检查通过后，可从页首提交唯一测试轮次</span></footer>`;
    return `<div class="content-grid"><div class="span-8">${panel({ title: view.title, description: view.description, body: `${view.body}${footer}` })}</div><div class="span-4">${panel({ title: route.id === 'P03-04' ? '只读提交门禁' : '只读校验门禁', body: gateList(view.gates) })}</div></div>`;
  };

  const renderT09 = ({ page }) => `<div><div class="task-summary"><div><span>异常编号</span><strong>SUP-20260901-001</strong></div><div><span>游戏／商品</span><strong>首款签约游戏 · 标准版</strong></div><div><span>SKU</span><strong>SKU-DEMO-001</strong></div><div><span>首次发现</span><strong>2026-09-01 16:20</strong></div></div><div class="content-grid" style="margin-top:16px"><section class="exception-hero span-12"><div class="exception-icon">${icon('warning')}</div><div><h2>停止新增销售</h2><p>当前价格不可可靠读取，SKU 按最严格结果进入停售；既有订单及其履约证据保持不变。</p></div>${c.statusTag(page.status)}</section><div class="span-7">${panel({ title: '异常影响与恢复条件', body: `<div class="summary-grid">${readonlyField({ label: '异常类型', value: '当前价格不可用' })}${readonlyField({ label: '最近更新时间', value: '2026-09-01 17:50' })}${readonlyField({ label: '影响范围', value: 'SKU-DEMO-001 新增销售', wide: true })}${readonlyField({ label: '影响地区', value: '中国大陆' })}${readonlyField({ label: '开发者建议', value: '等待平台确认恢复；无需处理既有订单' })}</div><div class="form-section"><div class="form-section__title"><strong>恢复条件</strong><span>来源恢复不自动开售</span></div>${gateList([{ label: '来源价格恢复', detail: '取得可靠当前价格快照', status: '待恢复' }, { label: '供给与地区重校', detail: '来源、SKU、授权地区一致', status: '待校验' }, { label: '平台确认恢复', detail: '全部阻塞消除后由运营确认', status: '待确认' }])}</div>` })}</div><div class="span-5">${panel({ title: '处理时间线', body: c.timeline({ items: ['同步重试仍未取得可靠价格 · 17:50', 'SKU 停止新增销售 · 16:22', '检测到当前价格不可用 · 16:20', '最近一次正常同步 · 15:55'] }) })}</div></div></div></div>`;

  const renderT10 = ({ page }) => {
    const retry = actionOf(page, 'retry-upload', '继续上传');
    return `<div class="content-grid"><div class="span-8">${panel({ title: '包体分片上传', body: `<div class="upload-zone"><div><div class="upload-zone__icon">${icon('upload')}</div><h3>Windows 包体已选择</h3><p>网络中断，已完成分片保留，可从 68% 继续上传</p>${c.statusTag('已中断')}</div></div><div class="upload-progress"><div class="progress-track"><div class="progress-bar" data-upload-progress></div></div><div class="progress-meta"><span data-upload-label>已上传 68%，已完成分片将保留</span><span class="number">6.8 GB / 10.0 GB</span></div></div><footer class="form-footer"><span class="save-state">不会上传真实文件；继续后先校验已完成分片</span><div class="form-actions">${c.button({ label: retry.label, variant: 'primary', action: retry.id })}</div></footer>` })}</div><div class="span-4">${panel({ title: '校验与提交规则', body: sectionList(flattenItems(page)) })}</div></div>`;
  };

  const renderT11 = ({ page, route }) => {
    if (route.id === 'P03-07') {
      return `<div><div class="task-summary"><div><span>测试任务</span><strong>test_task_demo_002</strong></div><div><span>版本／修订</span><strong>1.0.0 · build_rev_003</strong></div><div><span>测试轮次</span><strong>第 1 轮</strong></div><div><span>任务状态</span>${c.statusTag(page.status)}</div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: '测试任务详情', description: '只读使用本轮锁定的资料与包体修订', body: `<div class="summary-grid">${readonlyField({ label: '游戏／平台', value: '首款签约游戏 · Windows' })}${readonlyField({ label: '测试环境', value: '正式环境验收' })}${readonlyField({ label: '启动文件', value: 'Game.exe' })}${readonlyField({ label: '启动参数', value: '-language=zh-CN' })}${readonlyField({ label: '运行说明', value: '首次启动进行资源校验，安装目录需可写', wide: true })}</div><div class="form-section"><div class="form-section__title"><strong>测试范围</strong><span>获取失败可重试，不自动记为不通过</span></div>${gateList([{ label: '安装与启动', detail: '完成安装、首启与基础运行检查', status: '待测试' }, { label: '核心流程', detail: '验证基础关卡与退出流程', status: '待测试' }, { label: '包体基础校验', detail: '完整性与启动文件已通过', status: '已通过' }])}</div>` })}</div><div class="span-4">${panel({ title: '领取与开始记录', body: c.timeline({ items: ['任务已分配给陈宇 · 2026-09-01 13:10', '包体获取权限已生成', '等待测试人员开始本轮测试'] }) })}</div></div></div>`;
    }
    const pass = actionOf(page, 'test-pass', '测试通过');
    const submit = actionOf(page, 'submit-test-result', '提交测试结果');
    return `<div><div class="task-summary"><div><span>测试任务</span><strong>test_task_demo_002</strong></div><div><span>版本／修订</span><strong>1.0.0 · build_rev_003</strong></div><div><span>测试轮次</span><strong>第 1 轮</strong></div><div><span>任务状态</span>${c.statusTag(page.status)}</div></div><div class="content-grid" style="margin-top:16px"><div class="span-7">${panel({ title: '提交测试结果', description: '每轮首个成功终态生效，提交后不可修改', body: `<div class="test-choice"><label class="choice-card is-selected"><input type="radio" name="test-result" checked data-demo-action="${e(pass.id)}"><strong>${e(pass.label)}</strong></label><label class="choice-card"><input type="radio" name="test-result" data-demo-action="test-fail"><strong>测试不通过</strong></label></div><div class="test-result-form">${c.textarea({ label: '问题描述', placeholder: '不通过时必填；填写现象、复现条件和影响范围' })}${readonlyField({ label: '附件状态', value: '未添加附件', hint: '仅展示当前任务附件状态' })}</div><footer class="form-footer"><span class="save-state">提交失败保持测试中并保留输入；历史结果不可覆盖</span>${c.button({ label: submit.label, variant: 'primary', action: submit.id })}</footer>` })}</div><div class="span-5">${panel({ title: '提交门禁与记录', body: `${gateList([{ label: '任务有效性', detail: 'test_task_demo_002 为当前有效任务', status: '已通过' }, { label: '修订一致性', detail: 'build_rev_003 · 第 1 轮', status: '已通过' }, { label: '结果完整性', detail: '不通过时问题描述必填', status: '待提交' }])}<div style="margin-top:14px">${c.timeline({ items: ['任务开始测试 · 陈宇', '包体获取成功', '任务分配完成'] })}</div>` })}</div></div></div>`;
  };

  const renderT12 = ({ page, route }) => {
    if (route.id === 'P03-13') {
      const dispositionActions = `<div class="disposition-actions">${c.button({ label: '恢复下载', variant: 'primary', action: 'resume-download' })}${c.button({ label: '暂停启动', action: 'pause-launch' })}${c.button({ label: '下架游戏', variant: 'danger', action: 'unpublish-game' })}</div>`;
      return `<div><div class="task-summary"><div><span>当前线上版本</span><strong>1.0.0 · build_rev_003</strong></div><div><span>发布时间</span><strong>2026-08-28 14:30</strong></div><div><span>下载开关</span>${c.statusTag('下载暂停')}</div><div><span>启动开关</span>${c.statusTag('允许启动')}</div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: '线上版本处置', description: '处置只影响当前线上版本能力，不删除文件、测试或发布历史', body: `${gateList([{ label: '下载能力', detail: '平台问题处理中，暂停新增下载', status: '下载暂停' }, { label: '启动能力', detail: '已安装玩家仍可启动', status: '允许启动' }, { label: '游戏发布状态', detail: '商品停售不等于游戏下架', status: '已发布' }])}<div class="form-section"><div class="form-section__title"><strong>处置信息</strong><span>执行前在页面内填写，不新增弹窗</span></div><div class="form-grid disposition-form">${c.textarea({ label: '处置原因', placeholder: '请填写问题现象、处置依据和恢复条件', required: true })}${c.select({ label: '影响范围', options: ['仅新增下载', '仅启动能力', '下载与启动', '整款游戏发布状态'], value: '仅新增下载' })}</div></div><div class="form-section"><div class="form-section__title"><strong>可执行处置</strong><span>恢复前重新校验问题、当前版本与发布门禁</span></div>${dispositionActions}</div><footer class="form-footer"><span class="save-state">所有处置记录前后开关、原因、影响范围、操作人和结果</span></footer>` })}</div><div class="span-4">${panel({ title: '处置记录', body: c.timeline({ items: ['下载暂停 · 平台问题处理中 · 运营李佳', '版本 1.0.0 发布成功', '发布门禁校验通过'] }) })}</div></div></div>`;
    }
    const schedule = actionOf(page, 'schedule-release', '定时发布');
    const now = actionOf(page, 'release-now', '立即发布');
    return `<div><div class="task-summary"><div><span>候选版本</span><strong>1.0.0</strong></div><div><span>包体修订</span><strong>build_rev_003</strong></div><div><span>测试轮次</span><strong>第 1 轮 · 测试通过</strong></div><div><span>当前线上版本</span><strong>尚未发布正式版本</strong></div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: '发布配置', description: '立即发布与定时发布互斥，发布时重新校验全部门禁', body: `<div class="publish-options"><button class="publish-option is-active" data-demo-action="${e(now.id)}"><strong>${e(now.label)}</strong><span>门禁通过后立即切换线上版本</span></button><button class="publish-option" data-demo-action="${e(schedule.id)}"><strong>${e(schedule.label)}</strong><span>按统一时区设置未来发布时间</span></button></div><div class="schedule-field is-disabled" data-schedule-field>${c.input({ label: '定时发布时间', value: '', placeholder: '选择定时发布后填写', type: 'datetime-local', hint: '仅在选择定时发布时填写', disabled: true })}</div><footer class="form-footer"><span class="save-state">发布失败保持候选待发布，原线上版本及其字段不变</span><div class="form-actions">${c.button({ label: '保持原线上版本', action: 'keep-online-version' })}${c.button({ label: page.primaryAction || now.label, variant: 'primary', action: now.id, extra: 'data-release-submit' })}</div></footer>` })}</div><div class="span-4">${panel({ title: '发布门禁', body: gateList([{ label: '项目授权与资料', detail: '已批准资料快照可读取', status: '已通过' }, { label: '包体与测试', detail: 'build_rev_003 · 第 1 轮测试通过', status: '已通过' }, { label: '商品／领取与供给', detail: '当前发行方式门禁已满足', status: '已通过' }, { label: '分成、结算责任与权益', detail: '平台发行门禁已确认', status: '已通过' }]) })}</div></div></div>`;
  };

  const renderT13 = ({ page, route }) => {
    if (route.id === 'P04-03') {
      return `<div>${c.resultStrip({ title: '平台配置中', detail: '开发者只读查看当前需求快照与运营回执，不可编辑或执行计划', variant: 'info' })}<div class="content-grid"><div class="span-8">${panel({ title: '开发者需求快照', description: 'campaign_demo_001 · 修订 01', body: `<div class="summary-grid">${readonlyField({ label: '目标游戏', value: '首款签约游戏' })}${readonlyField({ label: '投放目标', value: '详情访问' })}${readonlyField({ label: '期望人群', value: '中国大陆 · 简体中文 · Windows' })}${readonlyField({ label: '期望时间', value: '2026-09-10 — 2026-09-20' })}${readonlyField({ label: '示例素材', value: '示例素材 · 素材修订 01', wide: true })}</div><footer class="form-footer"><span class="save-state">开发者只读；不提供启动、暂停、结束或运营配置编辑</span></footer>` })}</div><div class="span-4">${panel({ title: '运营回执与配置摘要', body: `${gateList([{ label: '素材与落地页', detail: '等待运营审核', status: '待审核' }, { label: '人群与预估人数', detail: '配置完成后回填摘要', status: '待配置' }, { label: '资源位与排期', detail: '正式资源位待业务确认', status: '待配置' }, { label: '结果入口', detail: 'T+1 数据完成后可查看', status: '--' }])}<div class="receipt-note"><strong>最近回执</strong><p>运营已领取需求，正在核对素材与落地页；未完成项不填默认值。</p><span>2026-09-01 18:20 · 平台发行运营</span></div>` })}</div></div></div>`;
    }
    return `<div>${c.resultStrip({ title: '精准投放采用方案 A', detail: '开发者提交需求，运营配置并执行', variant: 'info' })}<div class="content-grid"><div class="span-8">${panel({ title: '投放需求', body: `<div class="form-grid">${c.select({ label: '目标游戏', options: ['首款签约游戏'], value: '首款签约游戏' })}${c.select({ label: '投放目标', options: ['详情访问', '购买／领取', '成功交付', '首次启动'], value: '详情访问' })}${c.input({ label: '期望开始时间', value: '2026-09-10', type: 'date', required: true })}${c.input({ label: '期望结束时间', value: '2026-09-20', type: 'date', required: true })}${c.textarea({ label: '期望人群', value: '中国大陆、简体中文、Windows 用户', hint: '最终人群与硬性排除由运营配置' })}</div><div class="upload-zone" style="min-height:150px;margin-top:18px"><div><div class="upload-zone__icon">${icon('file')}</div><h3>示例素材</h3><p>素材规范待确认时禁止提交，不伪造实际投放素材</p>${c.button({ label: '选择示例素材', action: 'select-campaign-asset' })}</div></div>${defaultFooter(page)}` })}</div><div class="span-4">${panel({ title: '方案职责边界', body: gateList([{ label: '开发者', detail: '提交目标、素材、期望人群与时间', status: '可编辑' }, { label: '平台运营', detail: '配置人群、资源位、频次与排期', status: '后续处理' }, { label: '预算与竞价', detail: '一期不展示', status: '不在范围' }]) })}</div></div></div>`;
  };

  const renderT14 = ({ page, route }) => {
    const add = actionOf(page, 'add-target-rule', '添加包含规则');
    const exclude = actionOf(page, 'exclude-rule', '添加排除规则');
    if (route.id === 'P04-08') {
      return `<div class="content-grid"><div class="span-8">${panel({ title: '资源位与排期', description: '正式资源位清单待业务确认，不把历史广告位当真实资源位', body: `<div class="form-grid">${readonlyField({ label: '资源位', value: '资源位待业务确认', hint: '仅可选择盘点后的现有资源位' })}${readonlyField({ label: '素材类型', value: '--', hint: '随正式资源位回填' })}${c.input({ label: '开始时间', value: '2026-09-10T10:00', type: 'datetime-local', required: true })}${c.input({ label: '结束时间', value: '2026-09-20T22:00', type: 'datetime-local', required: true })}${c.select({ label: '频次', options: ['每位访客每天 1 次', '每位访客每天 2 次', '每位访客每天 3 次'], value: '每位访客每天 1 次' })}${c.input({ label: '优先级', value: '50', type: 'number', required: true, hint: '仅允许整数' })}</div><div class="conflict-summary"><div><span>排期冲突</span><strong>暂不可检测</strong><p>资源位确认后，按优先级、进入已排期时间和计划编号展示冲突摘要。</p></div>${c.statusTag('门禁阻塞')}</div>${defaultFooter(page, { noSave: true })}` })}</div><div class="span-4">${panel({ title: '排期门禁摘要', body: gateList([{ label: '人群规则', detail: 'segment_demo_001 · 规则版本 01', status: '已通过' }, { label: '素材与落地页', detail: '审核快照一致', status: '已通过' }, { label: '资源位', detail: '正式清单待业务确认', status: '待确认' }, { label: '时间、频次与优先级', detail: '资源位确认后重校', status: '待校验' }]) })}</div></div>`;
    }
    const includeGroups = [{ label: '地区', values: ['中国大陆'] }, { label: '语言', values: ['简体中文'] }, { label: '设备／系统', values: ['Windows'] }, { label: '平台行为', values: ['近 30 天访问详情'] }];
    const excludeGroups = [{ label: '已获得游戏', values: ['首款签约游戏'] }, { label: '平台行为', values: ['近 7 天已成功交付'] }];
    const groupRows = (groups, action, className) => groups.map(group => `<div class="rule-row"><span class="rule-row__label">${e(group.label)}</span><div class="rule-chips">${group.values.map(value => `<button class="rule-chip ${className}" data-demo-action="${e(action)}">${e(value)}</button>`).join('')}</div></div>`).join('');
    return `<div><div class="targeting-grid"><section class="rule-builder"><div class="rule-builder__header"><div><h3>包含人群</h3><p>同字段多值为“或”，不同字段为“且”</p></div>${c.button({ label: add.label, action: add.id, size: 'small' })}</div>${groupRows(includeGroups, add.id, 'is-active')}</section><section class="rule-builder"><div class="rule-builder__header"><div><h3>排除人群</h3><p>命中任一排除规则即不进入目标人群</p></div>${c.button({ label: exclude.label, action: exclude.id, size: 'small' })}</div>${groupRows(excludeGroups, exclude.id, 'is-excluded')}</section></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: '硬性排除', description: '固定门禁，运营不可删除', body: gateList([{ label: '地区未授权／不可售', detail: '按游戏当前销售地区校验', status: '固定排除' }, { label: '设备或系统不满足', detail: '一期仅支持 Windows', status: '固定排除' }]) })}</div><div class="span-4">${panel({ title: '预估人数', body: `<div class="audience-estimate"><span>当前状态</span><strong>--</strong><p>规则有变更，需重新预估；未知不以 0 代替。</p>${c.statusTag(page.status)}</div>` })}</div></div></div>`;
  };

  const renderT15 = ({ page, route }) => {
    if (route.id === 'P04-09') {
      return `<div><div class="task-summary"><div><span>投放计划</span><strong>campaign_demo_001</strong></div><div><span>计划状态</span>${c.statusTag(page.status)}</div><div><span>实际排期</span><strong>2026-09-10 — 09-20</strong></div><div><span>数据状态</span>${c.statusTag('待生成')}</div></div><div class="metric-grid" style="margin-top:16px">${c.metricCard({ label: '曝光', value: '--', trend: '计划尚未启动' })}${c.metricCard({ label: '点击率', value: '--', trend: '计划尚未启动' })}${c.metricCard({ label: '有效访问', value: '--', trend: '等待 T+1 数据' })}${c.metricCard({ label: '转化', value: '--', trend: '等待 T+1 数据' })}</div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: '计划监控与实时门禁', body: `${gateList([{ label: '游戏与落地页', detail: '当前发布状态正常', status: '已通过' }, { label: '素材与人群', detail: '审核快照与规则版本有效', status: '已通过' }, { label: '资源位与时间', detail: '启动时再次校验', status: '待启动校验' }])}<div class="form-section"><div class="form-section__title"><strong>取消排期</strong><span>取消后计划进入已结束且不可恢复</span></div>${c.textarea({ label: '取消排期原因', placeholder: '取消排期时必填；说明原因与影响范围', required: true })}</div><div class="form-section"><div class="form-section__title"><strong>计划动作</strong><span>当前为已排期，只可启动或取消排期</span></div><div class="disposition-actions">${c.button({ label: '启动', variant: 'primary', action: 'start-campaign' })}${c.button({ label: '取消排期', action: 'cancel-schedule' })}</div></div>` })}</div><div class="span-4">${panel({ title: '状态与停止记录', body: c.timeline({ items: ['已排期 · 运营李佳 · 2026-09-01 19:10', '排期门禁校验通过', '开发者需求已领取'] }) })}</div></div></div>`;
    }
    const range = actionOf(page, 'dashboard-range', '近 7 天');
    return `<div><div class="dashboard-toolbar"><div class="dashboard-toolbar__group">${c.button({ label: range.label, action: range.id, extra: 'data-dashboard-range' })}${c.button({ label: '近 30 天', action: range.id })}</div><span class="save-state">数据更新：T+1 聚合口径，不展示单用户数据</span></div><div class="metric-grid">${c.metricCard({ label: '曝光', value: '128,640', trend: '+12.6%' })}${c.metricCard({ label: '点击', value: '8,920', trend: '点击率 6.93%' })}${c.metricCard({ label: '访问', value: '6,274', trend: '有效访问口径' })}${c.metricCard({ label: '转化', value: '1,086', trend: '归因窗口待确认' })}</div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: '发行趋势', body: `${c.chart({ label: '曝光、点击、访问与转化趋势' })}<div class="chart-legend"><span class="legend-item"><span class="legend-dot"></span>投放结果趋势</span></div>` })}</div><div class="span-4">${panel({ title: '数据口径说明', body: sectionList(flattenItems(page).slice(0, 7)) })}</div></div></div>`;
  };

  const registry = {
    T01: renderT01,
    T02: renderT02,
    T03: renderT03,
    T04: renderT04,
    T05: renderT05,
    T06: renderT06,
    T07: renderT07,
    T08: renderT08,
    T09: renderT09,
    T10: renderT10,
    T11: renderT11,
    T12: renderT12,
    T13: renderT13,
    T14: renderT14,
    T15: renderT15,
  };

  namespace.templates = {
    registry,
    render({ route, page, state = 'default' }) {
      if (state !== 'default') return c.statePanel({ state, primaryAction: page?.primaryAction, onRetry: state === 'error' });
      const renderer = registry[route.templateId] || registry.T03;
      return `<section class="page-template template-${route.templateId.toLowerCase()}" data-template-id="${e(route.templateId)}" data-page-state="default">${renderer({ route, page })}</section>`;
    },
  };
})(window.GameHubDemo);

window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};

(function registerTemplates(namespace) {
  const c = namespace.components;
  const e = c.escapeHtml;
  const icon = name => namespace.icons.render(name);

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
      rows: [[{ text: '星海远征', subtext: 'GAME-48291 · Windows' }, '盖世直接下载', { status: '已通过' }, '版本 1.0.0 · 测试不通过', { status: '尚未发布' }, '暂无投放', '2026-09-01 18:24', { action: '查看资料', demoAction: 'row-detail' }]],
    },
    'P01-08': {
      tabs: ['全部账号', '正常', '异常映射', '已停用'],
      placeholder: '输入 account_id、邮箱或厂商名称',
      filters: [{ label: '账号状态', options: ['全部状态', '正常', '待设置密码', '已停用'] }, { label: '盖世映射', options: ['全部映射', '已映射', '未映射', '冲突待处理'] }],
      headers: ['独立平台账号', '登录凭据', '开发者资格／厂商', '盖世身份映射', '账号状态', '最近登录', '操作'],
      rows: [[{ text: 'ACC-202609-001', subtext: 'wang***@xinghai.games' }, '密码已设置／盖世登录', '已确认 · 星海互动', { status: '已映射' }, { status: '正常' }, '2026-09-03 09:42', { action: '查看映射', demoAction: 'row-detail' }]],
    },
    'P02-01': {
      tabs: ['全部商品', '供给异常', '可供货'],
      placeholder: '输入游戏名称或 SKU',
      filters: [{ label: '供给状态', options: ['全部状态', '可供货', '库存不足', '售罄', '异常', '未知'] }, { label: '可售条件', options: ['全部条件', '已通过', '有阻塞项'] }],
      headers: ['游戏／商品', 'SKU', '发行方式', '商品状态', '供给状态', '可售条件', '更新时间', '操作'],
      rows: [[{ text: '星海远征', subtext: '标准版商品' }, 'SKU-CN-001', '第三方平台激活', { status: '停售' }, { status: '供给异常' }, '价格与来源待恢复', '2026-09-01 17:50', { action: '查看异常', demoAction: 'row-detail' }]],
    },
    'P02-03': {
      tabs: ['全部商品', '异常待处理', '条件未齐'],
      placeholder: '输入游戏、厂商或 SKU',
      filters: [{ label: '发布与可售', options: ['全部状态', '待发布', '可售', '停售'] }, { label: '供给状态', options: ['全部供给', '可供货', '异常'] }],
      headers: ['商品', 'SKU 数', '发行方式', '商业条件', '供给状态', '发布／可售', '更新时间', '操作'],
      rows: [[{ text: '星海远征', subtext: '星海互动' }, '1 个', '第三方平台激活', { status: '已通过' }, { status: '异常待处理' }, { status: '停售' }, '2026-09-01 17:50', { action: '配置商品', demoAction: 'row-detail' }]],
    },
    'P02-06': {
      tabs: ['异常生效中', '待恢复确认', '已恢复'],
      placeholder: '输入异常编号、商品或 SKU',
      filters: [{ label: '异常类型', options: ['全部类型', '库存', '价格', '来源', '商业供给'] }, { label: '处理状态', options: ['全部状态', '异常生效中', '待恢复确认', '已恢复'] }],
      headers: ['异常编号', '商品／SKU', '来源类型', '异常类型', '影响订单', '处理状态', '更新时间', '操作'],
      rows: [[{ text: 'SUP-20260901-001', subtext: '首次发现 16:20' }, '星海远征 · SKU-CN-001', '供应商 API', '当前价格不可用', '新增销售已停止；既有订单不变', { status: '异常生效中' }, '2026-09-01 17:50', { action: '处理异常', demoAction: 'row-detail' }]],
    },
    'P03-01': {
      tabs: ['全部版本', '测试中', '待发布', '已发布'],
      placeholder: '输入版本号或修订号',
      filters: [{ label: '测试状态', options: ['全部状态', '待提交', '测试中', '测试不通过', '测试通过'] }, { label: '发布状态', options: ['全部状态', '尚未发布', '待发布', '已发布', '已撤回'] }],
      headers: ['版本号', '包体修订', '测试轮次', '测试状态', '发布状态', '更新时间', '操作'],
      rows: [[{ text: '1.0.0', subtext: 'Windows／macOS／Linux' }, '3 个 Build · Manifest 永久保留', '第 1 轮', { status: '测试不通过' }, { status: '尚未发布' }, '2026-09-03 09:36', { action: '查看结果', demoAction: 'row-detail' }]],
    },
    'P03-06': {
      tabs: ['待测试', '测试中', '已完成'],
      placeholder: '输入任务、游戏或版本',
      filters: [{ label: '任务状态', options: ['全部状态', '待测试', '测试中', '已完成', '已失效'] }, { label: '分配时间', options: ['全部时间', '今天', '近 7 天'] }],
      headers: ['待测任务', '游戏／版本', '包体修订', '测试轮次', '测试人员', '分配时间', '任务状态', '操作'],
      rows: [[{ text: 'TEST-202609-002', subtext: '正式环境验收' }, '星海远征 · 1.0.0', 'BUILD-WIN-003', '第 1 轮', '陈宇（本人）', '2026-09-01 13:10', { status: '待测试' }, { action: '领取并查看', demoAction: 'row-detail' }]],
    },
    'P03-09': {
      tabs: ['待分配', '测试中', '测试通过待确认', '异常'],
      placeholder: '输入厂商、游戏或版本',
      filters: [{ label: '测试结果', options: ['全部结果', '未提交', '测试通过', '测试不通过'] }, { label: '审核状态', options: ['全部状态', '待分配', '待确认', '已确认'] }],
      headers: ['厂商／游戏', '版本／修订', '轮次', '有效任务', '测试结果', '审核状态', '发布条件', '操作'],
      rows: [[{ text: '星海互动', subtext: '星海远征' }, '1.0.0 · BUILD-WIN-003', '第 1 轮', '尚未分配', '未提交', { status: '待分配' }, '测试结果待完成', { action: '分配测试', demoAction: 'row-detail' }]],
    },
    'P03-11': {
      tabs: ['待配置', '已排期', '发布失败'],
      placeholder: '输入游戏、版本或修订',
      filters: [{ label: '发布条件', options: ['全部条件', '已通过', '有阻塞项'] }, { label: '发布方式', options: ['全部方式', '未配置', '立即发布', '定时发布'] }],
      headers: ['候选版本', '发布条件', '当前线上版本', '发布方式／时间', '最近结果', '状态', '操作'],
      rows: [[{ text: '1.0.0', subtext: 'BUILD-REV-003 · 星海远征' }, { status: '已通过' }, '0.9.0', '未配置', '暂无发布记录', { status: '待发布' }, { action: '发布配置', demoAction: 'row-detail' }]],
    },
    'P04-01': {
      tabs: ['全部需求', '草稿', '平台处理中', '已结束'],
      placeholder: '输入投放需求或游戏',
      filters: [{ label: '需求状态', options: ['全部状态', '草稿', '开发者已提交', '平台配置中', '已排期', '已驳回'] }, { label: '期望时间', options: ['全部时间', '近 7 天', '近 30 天'] }],
      headers: ['投放需求', '游戏', '投放目标', '期望时间', '需求状态', '更新时间', '操作'],
      rows: [[{ text: 'CMP-202609-001', subtext: '素材修订 01' }, '星海远征', '详情访问', '2026-09-10 — 2026-09-20', { status: '开发者已提交' }, '2026-09-01 18:05', { action: '查看详情', demoAction: 'row-detail' }]],
    },
    'P04-05': {
      tabs: ['待处理', '平台配置中', '已排期', '投放中', '已结束'],
      placeholder: '输入计划、游戏或厂商',
      filters: [{ label: '计划状态', options: ['全部状态', '开发者已提交', '平台配置中', '已排期', '投放中', '已暂停', '已结束'] }, { label: '负责人', options: ['全部负责人', '待领取', '我负责的'] }],
      headers: ['投放计划', '厂商／游戏', '目标', '资源位', '期望／实际排期', '负责人', '计划状态', '操作'],
      rows: [[{ text: 'CMP-202609-001', subtext: '2026-09-01 提交' }, '星海互动 · 星海远征', '详情访问', '待配置', '期望 09-10 — 09-20／实际待定', '待领取', { status: '开发者已提交' }, { action: '开始配置', demoAction: 'row-detail' }]],
    },
  };
  const defaultFooter = (page, options = {}) => {
    const save = actionOf(page, 'save-draft', '保存草稿');
    return `<footer class="form-footer"><span class="save-state" data-save-state>尚未保存</span><div class="form-actions">${options.noSave ? '' : c.button({ label: save.label, action: save.id })}${renderActionButtons(page, [save.id])}</div></footer>`;
  };

  const renderT01 = ({ page }) => `<div class="login-shell developer-login" data-developer-login>
    <section class="login-aside">
      <div class="onboarding-brand"><div class="brand-mark">${icon('logo')}</div><span class="onboarding-audience">PC 游戏发行与运营服务</span></div>
      <h1>让每一款游戏，从接入到发行都有清晰记录</h1>
      <p>统一管理游戏资料、版本包体、CDKEY、发行进度与经营数据。</p>
      <div class="login-rule">${icon('info')}<span>登录后，如尚未完成开发者认证，请按指引提交主体与厂商资料。</span></div>
    </section>
    <section class="login-form">
      <div data-password-login>
        <div class="page-eyebrow">DEVELOPER SIGN IN</div><h2 data-page-title>开发者账号登录</h2><p>使用平台账号登录；账号未注册时自动创建</p>
        <div class="login-form__fields">${c.input({ label: '账号／邮箱', placeholder: '请输入账号或邮箱', required: true })}${c.input({ label: '密码', placeholder: '请输入密码', type: 'password', required: true })}</div>
        <button class="login-forgot" type="button" data-demo-action="forgot-password">忘记密码</button>
        <div class="login-form__action">${c.button({ label: page.primaryAction || '登录／注册', variant: 'primary', action: 'login', primary: true, iconName: 'chevron' })}</div>
        <div class="login-divider"><span>或</span></div>
        ${c.button({ label: '使用盖世游戏账号登录', action: 'gamehub-login', iconName: 'logo' })}
        <div class="login-help">未注册的账号将在登录时自动注册。</div>
      </div>
      <div class="qr-login-card" data-gamehub-qr hidden>
        <button class="text-back" type="button" data-demo-action="password-login">返回账号登录</button>
        <div class="page-eyebrow">GAMEHUB SIGN-IN</div><h2>使用盖世游戏 App 扫码</h2><p data-qr-status>二维码有效期 02:00，请在盖世游戏中确认授权</p>
        <div class="login-qr" aria-label="登录二维码"><span></span></div>
        <div class="qr-countdown">剩余 <strong data-qr-countdown>02:00</strong></div>
        <button class="login-forgot" type="button" data-demo-action="refresh-qr">二维码已失效？点击刷新</button>
        <div class="login-help">请在盖世游戏 App 内确认授权，完成后将自动登录。</div>
      </div>
    </section>
  </div>`;

  const renderT02 = ({ page }) => `<div class="content-grid"><section class="dashboard-hero span-12"><div class="dashboard-hero__top"><div><h2>欢迎回来，王明</h2><p>${e(page.summary)}</p></div>${c.statusTag(page.status)}</div><div class="dashboard-steps">${c.stepper({ items: ['开发者资格', 'Game 建档', 'APPID／SDK', '包体与发行'], active: 2 })}</div></section>
    <div class="span-12 metric-grid">${c.metricCard({ label: '开发者账号', value: '正常', trend: 'ACC-202609-001 · 密码已设置' })}${c.metricCard({ label: '开发者资格', value: '已确认', trend: '唯一绑定：星海互动' })}${c.metricCard({ label: 'APPID', value: 'APP-7F3A9C', trend: '星海远征' })}${c.metricCard({ label: '三系统 SDK', value: '可下载', trend: 'Windows／macOS／Linux' })}</div>
    <div class="span-7">${panel({ title: '当前待办', body: gateList([{ label: '继续 Linux Build', detail: '版本 1.0.0 的 Linux x64 上传中断，可从 68% 继续', status: '待处理' }, { label: '修订 Windows Build', detail: 'BUILD-WIN-003 第 1 轮测试不通过', status: '待处理' }, { label: '创建 Campaign', detail: '可生成渠道 UTM 追踪链接', status: '可创建' }]) })}</div><div class="span-5">${panel({ title: '接入信息', body: c.timeline({ items: ['APPID APP-7F3A9C 已创建', 'Windows／macOS／Linux SDK 可下载', '厂商线下资质结果已确认', '开发者账号与盖世身份已映射'] }) })}</div></div>`;

  const renderListView = (config, tabOptions = {}) => {
    const filters = config.filters.map(filter => c.select(filter)).join('');
    return `<div>${c.tabs({ items: config.tabs, active: 0, ...tabOptions })}<div class="filter-bar"><label class="field"><span class="field-label">关键词</span><span class="search-field">${icon('search')}<input class="gh-input" data-component="Input" data-variant="search" placeholder="${e(config.placeholder)}"></span></label>${filters}${c.button({ label: '查询', action: 'filter-list', iconName: 'search' })}</div>${c.table({ headers: config.headers, rows: config.rows })}${c.pagination({ total: config.rows.length, page: 1 })}</div>`;
  };

  const renderSupplyList = () => renderListView(listViews['P02-01'], { idPrefix: 'supply-filter-tab', indexAttribute: 'data-supply-tab-index' });

  const renderKeyBatchPanel = data => `<div class="cdkey-panel-grid">
    ${panel({ title: '创建 Key 批次', description: '只允许在当前授权游戏、SKU、渠道、配额和有效期内创建', body: `<div class="form-grid">
      ${c.input({ label: '批次名称', value: '星云商城首发批次', required: true })}
      ${c.select({ label: 'Key 来源', options: [{ label: data.keySources[0].label, value: data.keySources[0].id }], value: 'gamehub_generated' })}
      ${c.select({ label: '游戏 / SKU', options: ['星海远征 / SKU-CN-001'], value: '星海远征 / SKU-CN-001' })}
      ${c.input({ label: '用途', value: '星云商城首发销售', required: true })}
      ${c.select({ label: '渠道', options: data.authorization.channels, value: data.authorization.channels[0] })}
      ${c.input({ label: '数量', value: '2000', type: 'number', required: true })}
      ${c.input({ label: '有效期', value: '2026-12-31T23:59', type: 'datetime-local', required: true })}
    </div><div class="source-boundary"><strong>${e(data.keySources[1].label)}</strong><span>${e(data.keySources[1].rule)}</span></div><div data-key-batch-result></div><footer class="form-footer"><span class="save-state">Key 明文仅在有效窗口内下载一次</span>${c.button({ label: '创建批次', variant: 'primary', action: 'create-key-batch' })}</footer>` })}
    ${panel({ title: 'Key 批次', description: '已分配记录始终保留，作废只影响未分配库存', body: `${c.table({ headers: ['批次', '来源', '数量 / 剩余', '渠道', '状态', '操作'], rows: data.keyBatches.map(batch => [{ text: batch.name, subtext: batch.batchId }, batch.source, `${batch.quantity} / ${batch.remaining}`, batch.channel, { status: batch.status }, { action: '暂停', demoAction: 'pause-key-batch' }]) })}<div class="form-actions cdkey-table-actions">${c.button({ label: '作废未分配库存', variant: 'danger', action: 'void-key-batch' })}</div>` })}
  </div>`;

  const renderCredentialPanel = data => `<div class="cdkey-panel-grid">
    ${panel({ title: '创建渠道凭据', description: 'Secret 仅在创建或轮换成功时展示一次', body: `<div class="form-grid">
      ${c.input({ label: '凭据名称', value: '星云商城正式凭据', required: true })}
      ${c.select({ label: '白名单渠道', options: data.authorization.channels, value: data.authorization.channels[0] })}
      ${c.select({ label: '授权游戏 / SKU', options: ['星海远征 / SKU-CN-001'], value: '星海远征 / SKU-CN-001' })}
      ${c.input({ label: '凭据配额', value: '5000', type: 'number', required: true })}
      ${c.input({ label: '有效期', value: '2026-12-31T23:59', type: 'datetime-local', required: true })}
    </div><div data-credential-result></div><footer class="form-footer"><span class="save-state">凭据不能扩大平台预授权范围</span>${c.button({ label: '创建凭据', variant: 'primary', action: 'create-api-credential' })}</footer>` })}
    ${panel({ title: '已创建凭据', description: 'Secret 后续只显示末四位；遗失时必须轮换', body: `${c.table({ headers: ['凭据 / client_id', 'Secret', '授权范围', '有效期', '状态', '最近调用'], rows: data.credentials.map(item => [{ text: item.name, subtext: item.clientId }, item.secretHint, item.scope, item.expiresAt, { status: item.status }, item.lastCalledAt]) })}<div class="form-actions cdkey-table-actions">${c.button({ label: '轮换', action: 'rotate-api-credential' })}${c.button({ label: '暂停', action: 'pause-api-credential' })}${c.button({ label: '撤销', variant: 'danger', action: 'revoke-api-credential' })}</div>` })}
  </div>`;

  const renderApiDocs = (docs, apiExample) => `<div class="content-grid api-docs-layout">
    <div class="span-4"><nav class="api-docs-nav" aria-label="接口说明目录">${[['auth', '鉴权与幂等'], ['endpoints', '接口目录'], ['fields', '字段说明'], ['example', '请求示例'], ['errors', '错误码']].map(([id, label]) => `<button type="button" data-demo-action="api-doc-section" data-api-target="api-doc-${id}">${e(label)}</button>`).join('')}</nav>${panel({ title: '接入步骤', body: sectionList(['创建渠道凭据', '按 HMAC-SHA256 生成签名', '使用 request_id 发起幂等申请', '查询结果并确认已交付']) })}</div>
    <div class="span-8 api-docs-content"><section id="api-doc-auth">${panel({ title: '鉴权与幂等', body: `<p>${e(docs.auth)}</p><p>${e(docs.idempotency)}</p>` })}</section><section id="api-doc-endpoints">${panel({ title: '接口目录', body: c.table({ headers: ['方法', '路径', '用途'], rows: docs.endpoints.map(item => [item.method, item.path, item.purpose]) }) })}</section><section id="api-doc-fields">${panel({ title: '字段说明', body: c.table({ headers: ['字段', '必填', '说明'], rows: [['request_id', '是', '渠道侧幂等请求号'], ['channel_order_id', '是', '渠道订单号'], ['game_id', '是', '已授权游戏'], ['sku_id', '是', '已授权 SKU'], ['status', '响应', '分配处理状态']] }) })}</section><section id="api-doc-example">${c.codeBlock({ title: '申请一个 Key · 请求示例', code: apiExample })}</section><section id="api-doc-errors">${panel({ title: '错误码', body: `<div class="error-chip-list">${docs.errors.map(item => `<button type="button" data-demo-action="filter-api-error">${e(item)}</button>`).join('')}</div>` })}</section></div>
  </div>`;

  const renderCdkeyWorkspace = page => {
    const data = page.cdkeySelfService;
    const apiExample = `POST /openapi/v1/cdkeys/allocate\nX-Client-Id: cli_xh_20260901\nX-Timestamp: 1788336000\nX-Nonce: 4f8a9c2e7b13\nX-Signature: a71ef0284c8bd902\n\n{\n  "request_id": "REQ-ALLOC-20260903-001",\n  "channel_order_id": "ORDER-CHANNEL-20260903-001",\n  "game_id": "GAME-48291",\n  "sku_id": "SKU-CN-001"\n}`;
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

  const renderT04 = ({ page }) => `<div class="content-grid"><section class="dashboard-hero span-12 registration-intro"><div class="dashboard-hero__top"><div><div class="page-eyebrow">第一步 · 开发者认证</div><h2>先完成开发者认证，再创建游戏</h2><p>提交主体、品牌和联系资料；平台录入线下确认结果后，账号将取得开发者资格并绑定唯一厂商。</p></div>${c.statusTag(page.status)}</div></section><div class="span-8">${panel({ title: '主体与厂商资料', description: '首次确认后形成厂商资料快照', body: `<div class="form-grid">${c.select({ label: '主体类型', options: ['公司／企业', '个人开发者'], value: '公司／企业' })}${c.select({ label: '注册地区', options: ['中国大陆', '中国香港', '其他国家或地区'], value: '中国大陆' })}${c.input({ label: '法定名称', value: '深圳星海互动科技有限公司', required: true })}${c.input({ label: '登记编号', value: '9144XXXXXXXXXXXXXX', required: true })}${c.input({ label: '厂商品牌名称', value: '星海互动', required: true })}${c.input({ label: 'HTTPS 官网', value: 'https://www.xinghai-interactive.com', required: true, hint: '仅接受完整 HTTPS 地址' })}${c.textarea({ label: '厂商简介', value: '专注于 PC 游戏研发与发行。', required: true, hint: '确认后形成对外展示快照' })}</div><div class="asset-upload asset-upload--logo"><div class="asset-preview asset-preview--logo">LOGO</div><div><strong>厂商 Logo</strong><p>支持 JPG、PNG、WEBP；上传失败不影响其他字段。</p>${c.button({ label: '替换 Logo', action: 'replace-vendor-logo' })}</div></div>${defaultFooter(page)}` })}</div><div class="span-4">${panel({ title: '联系人与提交流程', description: '联系资料仅供平台协作', body: `<div class="stacked-fields">${c.input({ label: '联系人', value: '林晨', required: true })}${c.input({ label: '手机', value: '138 0000 1234', hint: '手机或邮箱至少填写一项' })}${c.input({ label: '邮箱', value: 'contact@xinghai-interactive.com', type: 'email', hint: '手机或邮箱至少填写一项' })}</div><div class="form-section">${gateList([{ label: '保存草稿', detail: '可继续修改，尚未提交线下确认', status: '当前' }, { label: '待线下结果', detail: '商务／法务线下核验，页面只读等待', status: '下一步' }, { label: '取得开发者资格', detail: '绑定唯一 vendor_id 后进入工作台', status: '结果' }])}</div>` })}</div></div>`;

  const renderT05 = ({ page }) => `<div class="game-editor">${c.tabs({ items: ['基本资料', '系统与发行', '素材检查'], active: 0 })}<div class="content-grid"><div class="span-8">${panel({ title: '游戏基本资料', body: `<div class="form-grid game-form-grid">${c.input({ label: '游戏名称', value: '星海远征', required: true })}${c.input({ label: '开发商', value: '星海互动', required: true })}${c.input({ label: '短简介', value: '面向 PC 玩家的完整冒险。', required: true })}${readonlyField({ label: '归属厂商', value: '星海互动', hint: '当前账号唯一绑定' })}${c.textarea({ label: '游戏介绍', value: '玩家将探索未知区域、完成挑战并逐步解锁新的能力与内容。', required: true })}</div><div class="game-config-section"><div class="game-compact-grid">${c.select({ label: '支持语言', options: ['简体中文', '繁体中文', '英语'], value: '简体中文' })}${c.select({ label: '销售地区', options: ['中国大陆', '全球（授权地区）'], value: '中国大陆' })}${readonlyField({ label: '支持系统', value: 'Windows／macOS／Linux', hint: '按 Game 配置' })}</div><div class="requirements-grid">${c.input({ label: 'Windows 要求', value: 'Windows 10 64 位 · x64', required: true })}${c.input({ label: 'macOS 要求', value: 'macOS 13 · Apple Silicon／Intel', required: true })}${c.input({ label: 'Linux 要求', value: 'Ubuntu 22.04 · x64', required: true })}</div><div class="candidate-tags"><span class="field-label">Steam 标签</span><div class="rule-chips"><button class="rule-chip is-active" data-demo-action="candidate-tag">动作</button><button class="rule-chip is-active" data-demo-action="candidate-tag">冒险</button><button class="rule-chip is-active" data-demo-action="candidate-tag">单人</button><button class="rule-chip" data-demo-action="candidate-tag">角色扮演</button></div><small>复用 Steam 全量标签字典；线下确认后生效</small></div><div class="release-choice compact-release-choice"><label class="choice-card is-selected"><input type="radio" name="release-method" checked data-demo-action="release-direct-download"><span><strong>盖世直接下载</strong><small>提交三系统 Build，由平台测试与发布</small></span></label><label class="choice-card"><input type="radio" name="release-method" data-demo-action="release-third-party"><span><strong>第三方平台激活</strong><small>由平台配置商品、SKU 与外部 Key 供给</small></span></label></div></div><footer class="form-footer"><span class="save-state" data-save-state>尚未保存</span><div class="form-actions">${c.button({ label: '保存草稿', action: 'save-draft' })}${c.button({ label: '提交资料', variant: 'primary', action: 'submit-game-review' })}</div></footer>` })}</div><div class="span-4">${panel({ title: '游戏素材', description: '单项失败可重试，不清空其他素材', body: `<div class="asset-grid compact-assets"><div class="asset-card"><div class="asset-placeholder asset-placeholder--icon">1:1</div><strong>游戏图标</strong><span>1024 × 1024</span></div><div class="asset-card"><div class="asset-placeholder asset-placeholder--landscape">16:9</div><strong>横版封面</strong><span>1920 × 1080</span></div><div class="asset-card"><div class="asset-placeholder asset-placeholder--portrait">3:4</div><strong>竖版封面</strong><span>900 × 1200</span></div><div class="asset-card"><div class="asset-placeholder asset-placeholder--screens">3 / 10</div><strong>游戏截图</strong><span>已上传 3 张</span></div></div>${c.button({ label: '上传／替换素材', action: 'manage-game-assets' })}` })}</div></div></div>`;

  const renderT06 = ({ page, route }) => {
    if (route.id === 'P03-05') {
      return `<div><div class="task-summary"><div><span>版本</span><strong>1.0.0</strong></div><div><span>包体修订</span><strong>BUILD-REV-003</strong></div><div><span>测试轮次</span><strong>第 1 轮</strong></div><div><span>测试时间</span><strong>2026-09-01 15:36</strong></div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${c.resultStrip({ title: '测试不通过', detail: '启动后主窗口持续白屏，当前包体修订不满足发布条件', variant: 'danger' })}${panel({ title: '具体问题项', body: c.table({ headers: ['问题项', '问题现象', '复现条件', '影响范围'], rows: [['启动与首屏', 'Game.exe 启动后主窗口持续白屏', 'Windows 11 64 位；首次安装后直接启动', '阻塞玩家进入游戏'], ['退出与重启', '结束进程后再次启动仍复现', '同一安装目录连续启动 2 次', '影响全部当前修订测试']] }) })}<div class="issue-result-note"><strong>修订判断</strong><p>需替换包体并生成新修订；旧测试轮次和问题记录保持只读，不可直接改为通过。</p><span>附件摘要：启动白屏截图 1 张 · 测试日志摘要 1 份</span></div></div><div class="span-4">${panel({ title: '测试处理时间线', body: c.timeline({ items: ['测试结果提交 · 不通过 · 陈宇 · 15:36', '问题复现并记录附件 · 15:28', '任务开始测试 · 14:50', '第 1 轮任务分配完成 · 13:10'] }) })}</div></div></div>`;
    }
    return `<div><div class="task-summary"><div><span>资料对象</span><strong>开发者注册 · 厂商资料</strong></div><div><span>资料修订</span><strong>VEN-REV-002</strong></div><div><span>线下结果</span>${c.statusTag(page.status || '需修改')}</div><div><span>录入时间</span><strong>2026-09-03 11:20</strong></div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${c.resultStrip({ title: '线下结果：需修改', detail: '平台已录入商务／法务的既有线下结论；请按意见修订后重新提交。', variant: 'warning' })}${panel({ title: '结果摘要与修改意见', body: c.table({ headers: ['资料项', '本次提交', '线下结论摘要', '处理建议'], rows: [['主体登记编号', '9144XXXXXXXXXXXXXX', '登记编号与证明材料需保持一致', '核对后重新填写'], ['厂商 Logo', 'PNG · 1024 × 1024', '品牌归属证明待补充', '联系发行运营补充线下材料']] }) })}<div class="issue-result-note"><strong>生效说明</strong><p>待线下结果期间继续使用上一已确认快照；当前修改稿不会进入 Game、商品、包体或数据链路。</p></div></div><div class="span-4">${panel({ title: '处理记录', body: c.timeline({ items: ['线下结果录入 · 需修改 · 运营李佳 · 11:20', '商务／法务线下结论完成 · 10:55', '资料修订 02 提交 · 09:42', '资料修订 01 已确认 · 2026-08-20'] }) })}</div></div></div>`;
  };

  const renderT07 = ({ page, route }) => {
    const isVendor = route.id === 'P01-09';
    const isGame = route.id === 'P01-10';
    const rows = isVendor ? [
      ['主体类型／地区', '公司／企业 · 中国大陆', '线下结论材料中的主体一致'], ['法定名称／登记编号', '深圳星海互动科技有限公司 · 9144…', '按既有商务／法务结论录入'], ['合作授权', '合同 GH-2026-001', '授权地区及有效期已在线下确认'],
    ] : isGame ? [
      ['Game／APPID', '星海远征 · APP-7F3A9C', '项目归属和唯一 APPID 一致'], ['系统与发行方式', 'Windows／macOS／Linux · 盖世直接下载', '线下上架范围已确认'], ['Steam 标签／素材', '动作、冒险、单人 · 素材修订 03', '最终生效项来自既有线下结论'],
    ] : [
      ['候选版本', '1.0.0 · 三系统 Build', '与测试锁定 Manifest 一致'], ['测试结果', '第 1 轮通过', '历史测试终态不可覆盖'], ['上架结论', '允许进入待发布', '由线下既有结论录入，不在线审批'],
    ];
    return `<div>${c.resultStrip({ title: '录入既有线下结果', detail: '本页不执行在线审核，仅将商务、法务或发行团队已完成的线下结论写入平台。', variant: 'info' })}<div class="content-grid"><div class="span-8">${panel({ title: isVendor ? '厂商资质结果' : isGame ? '游戏资料与上架结果' : '版本上架结论', body: `${c.table({ headers: ['结果对象', '当前提交快照', '线下核验依据'], rows })}<div class="form-section"><div class="form-grid">${c.select({ label: '线下结果', options: ['已确认', '需修改', '不予上架'], value: '已确认' })}${c.input({ label: '线下审核人', value: '李佳', required: true })}${c.input({ label: '线下审核时间', value: '2026-09-03T11:20', type: 'datetime-local', required: true })}${c.input({ label: '结论依据编号', value: isVendor ? 'LEGAL-20260903-01' : 'BIZ-20260903-02', required: true })}${c.textarea({ label: '结果原因摘要', value: '线下审核已完成，确认当前提交快照可进入下一业务环节。', required: true })}</div></div><footer class="form-footer"><span class="save-state">保存后保留结果、原因、审核人、时间和资料快照；不覆盖历史修订。</span>${c.button({ label: page.primaryAction || '保存线下结果', variant: 'primary', action: 'record-offline-result' })}</footer>` })}</div><div class="span-4">${panel({ title: '保存说明', body: gateList([{ label: '仅录入既有事实', detail: '不得在本页替代线下合同或资质审核', status: '不可修改' }, { label: '生效资料快照', detail: '保存成功后下游读取最新已确认快照', status: '待保存' }, { label: '历史可追溯', detail: '旧结果、资料修订和操作审计永久保留', status: '不可修改' }]) })}</div></div></div>`;
  };

  const renderT08 = ({ page, route }) => {
    const views = {
      'P01-06': {
        title: 'APPID 与三系统 SDK', description: '一个 Game 创建一个公开 APPID；APPID 不是密钥',
        body: `<div class="summary-grid">${readonlyField({ label: 'Game', value: '星海远征 · GAME-48291' })}${readonlyField({ label: 'APPID', value: 'APP-7F3A9C', hint: '全平台唯一，只读' })}${readonlyField({ label: 'SDK 授权规则', value: '首次在线授权成功后允许离线运行', wide: true })}${readonlyField({ label: '数据边界', value: '不做持续心跳、并发限制或即时踢线', wide: true })}</div><div class="form-section"><div class="form-section__title"><strong>SDK 下载</strong><span>三系统能力一致，版本与校验值可追溯</span></div>${c.table({ headers: ['系统', '架构', 'SDK 版本', '校验值', '操作'], rows: [['Windows', 'x64／arm64', '1.0.0', 'SHA-256 · 8f0a…', { action: '下载', demoAction: 'download-sdk' }], ['macOS', 'Intel／Apple Silicon', '1.0.0', 'SHA-256 · 2d4c…', { action: '下载', demoAction: 'download-sdk' }], ['Linux', 'x64／arm64', '1.0.0', 'SHA-256 · 7b19…', { action: '下载', demoAction: 'download-sdk' }]] })}<div class="form-actions" style="margin-top:14px">${c.button({ label: '打开 Google Docs 接入文档', action: 'open-sdk-docs' })}</div></div>`,
        gates: [{ label: 'APPID 唯一', detail: '一个 Game 只创建一个 APPID', status: '已创建' }, { label: '三系统一致', detail: '授权、日志与错误码口径一致', status: '已通过' }, { label: '接入文档', detail: '仅限已授权账号访问', status: '可打开' }], save: false,
      },
      'P02-04': {
        title: '外部 Key 入站供给配置', description: '外部平台 Key 只能受控导入或通过供应商 API 同步，平台不生成外部 Key',
        body: `<div class="form-grid">${readonlyField({ label: '游戏／SKU', value: '星海远征 · SKU-CN-001' })}${c.select({ label: '入站方式', options: ['供应商 API', '受控文件导入'], value: '供应商 API' })}${c.select({ label: '外部激活平台', options: ['Steam', 'Epic'], value: 'Steam' })}${c.input({ label: '来源商品 ID', value: 'SUPPLIER-ITEM-7821', required: true })}${c.select({ label: '授权地区', options: ['中国大陆', '全球（授权地区）'], value: '中国大陆' })}${readonlyField({ label: '最后一次正常库存快照', value: '1,248 · 2026-09-01 15:55' })}${readonlyField({ label: '最后一次正常价格快照', value: '¥ 68.00 CNY · 2026-09-01 15:55' })}${c.select({ label: '异常策略', options: ['停止新增销售', '标记未知并人工确认'], value: '停止新增销售' })}</div>`,
        gates: [{ label: '来源授权', detail: '来源、SKU、地区必须一致', status: '已通过' }, { label: '去重与加密', detail: 'Key 入站去重且明文受控', status: '已通过' }, { label: '价格／库存', detail: '异常时不得沿用旧值', status: '待保存' }], save: true,
      },
      'P02-05': {
        title: '盖世 Key 计划、批次与渠道 API', description: '盖世只生成由自身兑换服务校验的 Key，并在预授权范围内供三方渠道履约',
        body: `<div class="summary-grid">${readonlyField({ label: 'Key 计划', value: 'KEYPLAN-001 · 已启用' })}${readonlyField({ label: '授权游戏／SKU', value: '星海远征 · SKU-CN-001' })}${readonlyField({ label: '生成总额度', value: '10,000' })}${readonlyField({ label: '剩余额度', value: '8,000' })}</div><div class="form-section">${c.table({ headers: ['批次／凭据', '渠道', '配额／剩余', '有效期', '状态'], rows: [['KEY-20260902-001', '星云商城', '2,000／1,360', '2026-12-31', { status: '可用' }], ['cli_xh_20260901', '星云商城', '5,000／4,680', '2026-12-31', { status: '正常' }]] })}<div class="form-actions" style="margin-top:14px">${c.button({ label: '创建 Key 批次', action: 'create-key-batch' })}${c.button({ label: '创建渠道 API 凭据', action: 'create-api-credential' })}${c.button({ label: '查看接口说明', action: 'api-doc-section' })}</div></div>`,
        gates: [{ label: '一次性明文', detail: 'Key 文件和 client_secret 仅在创建结果中展示一次', status: '不可修改' }, { label: '渠道白名单', detail: '凭据不得扩大游戏、SKU、渠道和配额', status: '已通过' }, { label: '幂等与审计', detail: 'request_id 与分配确认完整留痕', status: '已通过' }], save: false,
      },
      'P03-02': {
        title: '版本资料与三系统矩阵', description: '同一发行版本可关联多个 OS／CPU 架构 Build；每个 Build 生成独立 Manifest',
        body: `<div class="form-grid">${readonlyField({ label: '游戏／厂商', value: '星海远征 · 星海互动' })}${c.input({ label: '发行版本号', value: '1.0.0', required: true })}${c.textarea({ label: '更新说明', value: '首个三系统正式版本，包含基础关卡与完整启动流程。', required: true })}</div><div class="form-section">${c.table({ headers: ['OS', 'CPU 架构', 'Build', 'Manifest', '启动配置'], rows: [['Windows', 'x64', 'BUILD-WIN-003', 'MANIFEST-WIN-003', 'Game.exe'], ['macOS', 'Apple Silicon', 'BUILD-MAC-002', 'MANIFEST-MAC-002', 'Game.app'], ['Linux', 'x64', '上传中断', '--', './game']] })}</div>`,
        gates: [{ label: '版本号唯一性', detail: '已发布版本号永久占用', status: '已通过' }, { label: 'OS／架构唯一', detail: '同一版本每组 OS＋架构只关联一个候选 Build', status: '已通过' }, { label: '编辑权限', detail: '当前为草稿，可编辑', status: '可编辑' }], save: true,
      },
      'P03-04': {
        title: '提交测试确认', description: '提交后锁定本轮版本资料、三系统 Build 和 Manifest 快照',
        body: `<div class="summary-grid">${readonlyField({ label: '游戏／发行版本', value: '星海远征 · 1.0.0' })}${readonlyField({ label: '测试轮次', value: '第 1 轮' })}${readonlyField({ label: 'Build 数量', value: '3 个 OS／架构组合' })}${readonlyField({ label: 'Manifest 状态', value: '3 个均已生成并永久保留' })}</div><div class="form-section">${c.table({ headers: ['OS／架构', '锁定 Build', 'Manifest', '基础校验'], rows: [['Windows／x64', 'BUILD-WIN-003', 'MANIFEST-WIN-003', { status: '已通过' }], ['macOS／Apple Silicon', 'BUILD-MAC-002', 'MANIFEST-MAC-002', { status: '已通过' }], ['Linux／x64', 'BUILD-LINUX-001', 'MANIFEST-LINUX-001', { status: '已通过' }]] })}</div>`,
        gates: [{ label: '项目归属与授权', detail: '星海互动 · 星海远征', status: '已通过' }, { label: '三系统 Build', detail: '完整性、可读性与启动配置', status: '已通过' }, { label: '快照锁定', detail: '测试中不得替换本轮 Build／Manifest', status: '待提交' }], save: false,
      },
      'P04-08': {
        title: '聚合导出确认', description: '导出严格复用当前页面 query_snapshot_id，只包含开发者可见的聚合行',
        body: `<div class="summary-grid">${readonlyField({ label: '查询快照', value: 'QRY-20260903-001' })}${readonlyField({ label: '数据更新至', value: '2026-09-02 23:59（T+1）' })}${readonlyField({ label: '筛选', value: '星海远征 · 近 30 天 · 全部渠道', wide: true })}${readonlyField({ label: '维度', value: '日期、游戏、渠道、Campaign、OS／架构', wide: true })}${readonlyField({ label: '指标', value: '交易、退款、Key、下载、首次启动' })}${readonlyField({ label: '预计行数／格式', value: '120 行 · CSV／XLSX' })}${readonlyField({ label: '币种', value: 'CNY；不做无汇率版本的跨币种合计' })}${readonlyField({ label: '脱敏', value: '不含用户、订单、设备、Key 明文' })}</div><div data-export-result></div>`,
        gates: [{ label: '数据公式', detail: '页面与导出使用同一口径版本', status: '已通过' }, { label: '权限与隐私阈值', detail: '只输出当前厂商可见的聚合结果', status: '已通过' }, { label: '短期下载地址', detail: '成功后限时有效；失败不生成空文件', status: '待生成' }], save: false,
      },
    };
    const view = views[route.id] || views['P03-02'];
    const footerNotes = {
      'P01-06': 'SDK 版本与校验值由平台统一维护。',
      'P02-05': '批次、凭据和接口操作均保留审计记录。',
      'P03-04': '提交后将锁定本轮三系统 Build 与 Manifest 快照。',
      'P04-08': '导出任务异步生成；失败可按同一查询快照重试。',
    };
    const footer = view.save ? defaultFooter(page) : `<footer class="form-footer"><span class="save-state">${footerNotes[route.id] || '当前信息为只读内容。'}</span>${route.id === 'P04-08' ? c.button({ label: page.primaryAction, variant: 'primary', action: 'generate-export' }) : ''}</footer>`;
    const sideTitle = route.id === 'P04-08' ? '导出说明' : route.id === 'P01-06' ? '接入状态' : route.id === 'P02-05' ? '安全规则' : '提交检查';
    return `<div class="content-grid"><div class="span-8">${panel({ title: view.title, description: view.description, body: `${view.body}${footer}` })}</div><div class="span-4">${panel({ title: sideTitle, body: gateList(view.gates) })}</div></div>`;
  };

  const renderT09 = ({ page }) => `<div><div class="task-summary"><div><span>异常编号</span><strong>SUP-20260901-001</strong></div><div><span>游戏／商品</span><strong>星海远征 · 标准版</strong></div><div><span>SKU</span><strong>SKU-CN-001</strong></div><div><span>首次发现</span><strong>2026-09-01 16:20</strong></div></div><div class="content-grid" style="margin-top:16px"><section class="exception-hero span-12"><div class="exception-icon">${icon('warning')}</div><div><h2>停止新增销售</h2><p>当前价格不可可靠读取，SKU 按最严格结果进入停售；既有订单及其履约证据保持不变。</p></div>${c.statusTag(page.status)}</section><div class="span-7">${panel({ title: '异常影响与恢复条件', body: `<div class="summary-grid">${readonlyField({ label: '异常类型', value: '当前价格不可用' })}${readonlyField({ label: '最近更新时间', value: '2026-09-01 17:50' })}${readonlyField({ label: '影响范围', value: 'SKU-CN-001 新增销售', wide: true })}${readonlyField({ label: '影响地区', value: '中国大陆' })}${readonlyField({ label: '开发者建议', value: '等待平台确认恢复；无需处理既有订单' })}</div><div class="form-section"><div class="form-section__title"><strong>恢复条件</strong><span>来源恢复不自动开售</span></div>${gateList([{ label: '来源价格恢复', detail: '取得可靠当前价格快照', status: '待恢复' }, { label: '供给与地区重校', detail: '来源、SKU、授权地区一致', status: '待校验' }, { label: '平台确认恢复', detail: '全部阻塞消除后由运营确认', status: '待确认' }])}</div>` })}</div><div class="span-5">${panel({ title: '处理时间线', body: c.timeline({ items: ['同步重试仍未取得可靠价格 · 17:50', 'SKU 停止新增销售 · 16:22', '检测到当前价格不可用 · 16:20', '最近一次正常同步 · 15:55'] }) })}</div></div></div></div>`;

  const renderT10 = ({ page }) => {
    const retry = actionOf(page, 'retry-upload', '继续上传');
    return `<div class="content-grid"><div class="span-8">${panel({ title: '包体上传与 Build 详情', description: '每个 OS／CPU 架构独立生成 Build、Manifest 和 Chunk 记录', body: `${c.table({ headers: ['OS／架构', 'Build', 'Manifest', 'Chunk', '状态'], rows: [['Windows／x64', 'BUILD-WIN-003', 'MANIFEST-WIN-003', '246 个', { status: '已完成' }], ['macOS／Apple Silicon', 'BUILD-MAC-002', 'MANIFEST-MAC-002', '218 个', { status: '已完成' }], ['Linux／x64', 'BUILD-LINUX-001', '生成中', '142／210', { status: '已中断' }]] })}<div class="upload-zone" style="min-height:170px;margin-top:16px"><div><div class="upload-zone__icon">${icon('upload')}</div><h3>Linux x64 Build 上传已中断</h3><p>已完成 Chunk 永久保留，可从 68% 继续；重新上传不会覆盖旧 Build／Manifest。</p>${c.statusTag('已中断')}</div></div><div class="upload-progress"><div class="progress-track"><div class="progress-bar" data-upload-progress></div></div><div class="progress-meta"><span data-upload-label>已上传 68%，142 个 Chunk 已保留</span><span class="number">6.8 GB / 10.0 GB</span></div></div><footer class="form-footer"><span class="save-state">完成后将生成新的 Manifest</span><div class="form-actions">${c.button({ label: retry.label, variant: 'primary', action: retry.id })}</div></footer>` })}</div><div class="span-4">${panel({ title: '存储说明', body: gateList([{ label: 'Build 永久保留', detail: '新上传生成新 Build ID，不覆盖历史', status: '不可修改' }, { label: 'Manifest 永久保留', detail: '文件清单、哈希和 Chunk 关系不可改写', status: '不可修改' }, { label: 'Release Pointer', detail: '发布时按 app_id＋OS＋CPU 架构切换指向', status: '发布时更新' }]) })}</div></div>`;
  };

  const renderT11 = ({ page, route }) => {
    if (route.id === 'P03-07') {
      return `<div><div class="task-summary"><div><span>测试任务</span><strong>TEST-202609-002</strong></div><div><span>版本／修订</span><strong>1.0.0 · BUILD-REV-003</strong></div><div><span>测试轮次</span><strong>第 1 轮</strong></div><div><span>任务状态</span>${c.statusTag(page.status)}</div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: '测试任务详情', description: '只读使用本轮锁定的资料与包体修订', body: `<div class="summary-grid">${readonlyField({ label: '游戏／平台', value: '星海远征 · Windows' })}${readonlyField({ label: '测试环境', value: '正式环境验收' })}${readonlyField({ label: '启动文件', value: 'Game.exe' })}${readonlyField({ label: '启动参数', value: '-language=zh-CN' })}${readonlyField({ label: '运行说明', value: '首次启动进行资源校验，安装目录需可写', wide: true })}</div><div class="form-section"><div class="form-section__title"><strong>测试范围</strong><span>获取失败可重试，不自动记为不通过</span></div>${gateList([{ label: '安装与启动', detail: '完成安装、首启与基础运行检查', status: '待测试' }, { label: '核心流程', detail: '验证基础关卡与退出流程', status: '待测试' }, { label: '包体基础校验', detail: '完整性与启动文件已通过', status: '已通过' }])}</div>` })}</div><div class="span-4">${panel({ title: '领取与开始记录', body: c.timeline({ items: ['任务已分配给陈宇 · 2026-09-01 13:10', '包体获取权限已生成', '等待测试人员开始本轮测试'] }) })}</div></div></div>`;
    }
    const pass = actionOf(page, 'test-pass', '测试通过');
    const submit = actionOf(page, 'submit-test-result', '提交测试结果');
    return `<div><div class="task-summary"><div><span>测试任务</span><strong>TEST-202609-002</strong></div><div><span>版本／修订</span><strong>1.0.0 · BUILD-REV-003</strong></div><div><span>测试轮次</span><strong>第 1 轮</strong></div><div><span>任务状态</span>${c.statusTag(page.status)}</div></div><div class="content-grid" style="margin-top:16px"><div class="span-7">${panel({ title: '提交测试结果', description: '每轮首个成功终态生效，提交后不可修改', body: `<div class="test-choice"><label class="choice-card is-selected"><input type="radio" name="test-result" checked data-demo-action="${e(pass.id)}"><strong>${e(pass.label)}</strong></label><label class="choice-card"><input type="radio" name="test-result" data-demo-action="test-fail"><strong>测试不通过</strong></label></div><div class="test-result-form">${c.textarea({ label: '问题描述', placeholder: '不通过时必填；填写现象、复现条件和影响范围' })}${readonlyField({ label: '附件状态', value: '未添加附件', hint: '仅展示当前任务附件状态' })}</div><footer class="form-footer"><span class="save-state">提交失败保持测试中并保留输入；历史结果不可覆盖</span>${c.button({ label: submit.label, variant: 'primary', action: submit.id })}</footer>` })}</div><div class="span-5">${panel({ title: '提交检查与记录', body: `${gateList([{ label: '任务有效性', detail: 'TEST-202609-002 为当前有效任务', status: '已通过' }, { label: '修订一致性', detail: 'BUILD-REV-003 · 第 1 轮', status: '已通过' }, { label: '结果完整性', detail: '不通过时问题描述必填', status: '待提交' }])}<div style="margin-top:14px">${c.timeline({ items: ['任务开始测试 · 陈宇', '包体获取成功', '任务分配完成'] })}</div>` })}</div></div></div>`;
  };

  const renderT12 = ({ page, route }) => {
    if (route.id === 'P03-13') {
      const dispositionActions = `<div class="disposition-actions">${c.button({ label: '恢复下载', variant: 'primary', action: 'resume-download' })}${c.button({ label: '暂停启动', action: 'pause-launch' })}${c.button({ label: '下架游戏', variant: 'danger', action: 'unpublish-game' })}</div>`;
      return `<div><div class="task-summary"><div><span>当前线上版本</span><strong>0.9.0 · BUILD-REV-090</strong></div><div><span>发布时间</span><strong>2026-08-15 14:30</strong></div><div><span>下载开关</span>${c.statusTag('下载暂停')}</div><div><span>启动开关</span>${c.statusTag('允许启动')}</div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: '线上版本处置', description: '处置只影响当前线上版本能力，不删除文件、测试或发布历史', body: `${gateList([{ label: '下载能力', detail: '平台问题处理中，暂停新增下载', status: '下载暂停' }, { label: '启动能力', detail: '已安装玩家仍可启动', status: '允许启动' }, { label: '游戏发布状态', detail: '商品停售不等于游戏下架', status: '已发布' }])}<div class="form-section"><div class="form-section__title"><strong>处置信息</strong><span>请填写处置原因与影响范围后执行</span></div><div class="form-grid disposition-form">${c.textarea({ label: '处置原因', placeholder: '请填写问题现象、处置依据和恢复条件', required: true })}${c.select({ label: '影响范围', options: ['仅新增下载', '仅启动能力', '下载与启动', '整款游戏发布状态'], value: '仅新增下载' })}</div></div><div class="form-section"><div class="form-section__title"><strong>可执行处置</strong><span>恢复前重新校验问题、当前版本与发布条件</span></div>${dispositionActions}</div><footer class="form-footer"><span class="save-state">所有处置记录前后开关、原因、影响范围、操作人和结果</span></footer>` })}</div><div class="span-4">${panel({ title: '处置记录', body: c.timeline({ items: ['下载暂停 · 平台问题处理中 · 运营李佳', '版本 0.9.0 发布成功', '发布条件校验通过'] }) })}</div></div></div>`;
    }
    const schedule = actionOf(page, 'schedule-release', '定时发布');
    const now = actionOf(page, 'release-now', '立即发布');
    return `<div><div class="task-summary"><div><span>候选发行版本</span><strong>1.0.0</strong></div><div><span>Release Pointer</span><strong>3 个 OS／架构组合</strong></div><div><span>测试轮次</span><strong>第 2 轮 · 测试通过</strong></div><div><span>当前线上版本</span><strong>0.9.0</strong></div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: '发布与 Release Pointer 配置', description: '按 app_id＋OS＋CPU 架构切换 Pointer；Build、Manifest、Chunk 均不删除', body: `<div class="publish-options"><button class="publish-option is-active" data-demo-action="${e(now.id)}"><strong>${e(now.label)}</strong><span>发布条件通过后切换三组线上 Pointer</span></button><button class="publish-option" data-demo-action="${e(schedule.id)}"><strong>${e(schedule.label)}</strong><span>按统一时区设置未来发布时间</span></button></div><div class="schedule-field is-disabled" data-schedule-field>${c.input({ label: '定时发布时间', value: '', placeholder: '选择定时发布后填写', type: 'datetime-local', hint: '仅在选择定时发布时填写', disabled: true })}</div><div class="form-section">${c.table({ headers: ['Pointer Key', '当前线上 Build', '候选 Build', '状态'], rows: [['APP-7F3A9C／Windows／x64', 'BUILD-WIN-002', 'BUILD-WIN-004', { status: '待切换' }], ['APP-7F3A9C／macOS／arm64', 'BUILD-MAC-001', 'BUILD-MAC-002', { status: '待切换' }], ['APP-7F3A9C／Linux／x64', 'BUILD-LINUX-000', 'BUILD-LINUX-001', { status: '待切换' }]] })}</div><div class="form-section"><div class="form-section__title"><strong>回滚历史 Build</strong><span>回滚会生成一条新的 Pointer 切换记录，并保留原因和操作者</span></div><div class="form-grid">${c.select({ label: '目标历史发布', options: ['0.9.0 · REL-090', '0.8.2 · REL-082'], value: '0.9.0 · REL-090' })}${c.textarea({ label: '回滚原因', value: '线上异常，恢复到上一稳定发布。', required: true })}</div><div class="form-actions" style="margin-top:12px">${c.button({ label: '回滚历史 Build', variant: 'danger', action: 'rollback-release' })}</div></div><footer class="form-footer"><span class="save-state">发布或回滚失败时保持全部原线上 Pointer 不变</span><div class="form-actions">${c.button({ label: '保持原线上版本', action: 'keep-online-version' })}${c.button({ label: page.primaryAction || now.label, variant: 'primary', action: now.id, extra: 'data-release-submit' })}</div></footer>` })}</div><div class="span-4">${panel({ title: '发布条件与历史', body: `${gateList([{ label: '项目授权与资料', detail: '已确认快照可读取', status: '已通过' }, { label: '三系统 Build／Manifest', detail: '候选组合完整且测试通过', status: '已通过' }, { label: '商品／权益与供给', detail: '当前发行方式条件已满足', status: '已通过' }, { label: '一致性切换', detail: '任一 Pointer 失败则全部保持原值', status: '不可修改' }])}<div style="margin-top:14px">${c.timeline({ items: ['0.9.0 发布成功 · REL-090', '0.8.2 回滚完成 · 保留全部历史 Build', '0.8.0 首次发布'] })}</div>` })}</div></div></div>`;
  };

  const renderT13 = ({ page, route }) => {
    if (route.id === 'P04-06') return `<div>${c.resultStrip({ title: '人工资源协作', detail: '已提交不代表资源承诺；只有运营回填实际时间和证据后才记为已执行。', variant: 'info' })}<div class="content-grid"><div class="span-8">${panel({ title: '提交资源需求', body: `<div class="form-grid">${c.select({ label: '游戏／Campaign', options: ['星海远征 · CMP-202609-001'], value: '星海远征 · CMP-202609-001' })}${c.select({ label: '资源类型', options: ['首页推荐', '专题页', '站外合作'], value: '首页推荐' })}${c.select({ label: '推广目标', options: ['购买／领取', '成功交付', '首次启动'], value: '购买／领取' })}${c.input({ label: '期望开始时间', value: '2026-09-10', type: 'date', required: true })}${c.input({ label: '期望结束时间', value: '2026-09-20', type: 'date', required: true })}${c.input({ label: '素材引用', value: 'ASSET-REV-003', required: true })}${c.textarea({ label: '需求说明', value: '希望配合首发期进行首页推荐；最终资源与时间以运营实际执行为准。', required: true })}</div><footer class="form-footer"><span class="save-state">提交、修改或取消均新增修订并保留历史</span>${c.button({ label: page.primaryAction, variant: 'primary', action: 'submit-resource-request' })}</footer>` })}</div><div class="span-4">${panel({ title: '平台执行结果', body: `${gateList([{ label: '需求状态', detail: 'REQ-202609-001 · 修订 02', status: '处理中' }, { label: '实际资源位／渠道', detail: '等待运营线下协调后回填', status: '--' }, { label: '实际起止时间', detail: '已执行时必填', status: '--' }, { label: '原因与证据', detail: '未执行填原因；已执行填证据引用', status: '待回填' }])}<div class="receipt-note"><strong>最近处理记录</strong><p>运营已领取需求，正在协调首页资源；当前不构成资源承诺。</p><span>2026-09-03 10:20 · 平台发行运营</span></div>` })}</div></div></div>`;
    return `<div>${c.resultStrip({ title: 'Campaign／UTM', detail: '用于渠道来源标识与归因有效期，不承担竞价、频控或自动排期。', variant: 'info' })}<div class="content-grid"><div class="span-8">${panel({ title: 'Campaign 配置', body: `<div class="form-grid">${c.input({ label: '活动名称', value: '秋季首发合作', required: true })}${c.select({ label: '游戏', options: ['星海远征'], value: '星海远征' })}${c.select({ label: 'SKU（可选）', options: ['全部 SKU', 'SKU-CN-001'], value: 'SKU-CN-001' })}${c.select({ label: '渠道', options: ['Bilibili 达人', 'Steam 社区', '自有媒体'], value: 'Bilibili 达人' })}${c.input({ label: 'utm_source', value: 'bilibili', required: true })}${c.input({ label: 'utm_medium', value: 'creator', required: true })}${c.input({ label: 'utm_campaign', value: 'autumn_launch', required: true })}${c.input({ label: '归因开始日期（可选）', value: '2026-09-10', type: 'date' })}${c.input({ label: '归因结束日期（可选）', value: '2026-09-20', type: 'date' })}${c.textarea({ label: '备注', value: '达人首发视频与动态使用同一 Campaign。' })}</div><div class="form-section">${readonlyField({ label: '生成后追踪链接', value: 'https://gamehub.com/game/APP-7F3A9C?campaign_id=CMP-202609-001&utm_source=bilibili&utm_medium=creator&utm_campaign=autumn_launch', wide: true })}</div>${defaultFooter(page)}` })}</div><div class="span-4">${panel({ title: 'Campaign 状态', body: gateList([{ label: 'campaign_id', detail: '保存成功后唯一生成', status: 'CMP-202609-001' }, { label: '活动状态', detail: '草稿／有效／已停用', status: page.status }, { label: '重复 UTM 组合', detail: '提示风险但允许不同 Campaign', status: '已检查' }, { label: '停用影响', detail: '停止建立新归因，历史来源快照不变', status: '不可修改' }]) })}</div></div></div>`;
  };

  const renderT15 = ({ page, route }) => {
    const range = actionOf(page, 'dashboard-range', '近 7 天');
    const configs = {
      'P04-01': {
        metrics: [['支付订单', '3,284', '成功支付终态'], ['成功退款', '126', '退款率 3.84%'], ['盖世／外部 Key', '8,920', '可供给与已分配'], ['首次成功启动', '2,408', 'uid＋app_id 去重']],
        chart: '交易、Key、下载与首次启动整体经营趋势', title: '经营漏斗', unit: '数量（次）', legend: '成功支付／领取',
        rows: [['成功支付／领取', '3,284', '交易与权益终态', '2026-09-02 23:59'], ['成功交付', '3,108', 'Key／直接权益终态', '2026-09-02 23:59'], ['成功下载', '2,774', '客户端成功终态', '2026-09-02 23:59'], ['首次成功启动', '2,408', 'uid＋app_id 历史首个成功终态', '2026-09-02 23:59']],
        definitions: ['支付订单：订单达到支付成功终态后计入。', '成功交付：外部 Key 或盖世权益完成交付后计入。', '首次成功启动：同一 uid＋app_id 仅记录历史首次成功。', '交易与 Key 数据小时级更新；客户端数据次日更新。'],
        filters: ['全部游戏'],
      },
      'P04-02': {
        metrics: [['实付金额', '¥ 226,548', 'CNY 分币种汇总'], ['成功退款金额', '¥ 8,694', '仅成功退款'], ['预估净收入', '¥ 181,320', '非最终结算'], ['锁定月结算', '¥ 176,804', '2026-08 已锁定']],
        chart: '支付、退款与预估净收入按日趋势', title: '结算与退款明细聚合', unit: '金额（CNY）', legend: '实付金额',
        rows: [['2026-08', '¥ 214,980', '¥ 8,176', '¥ 176,804（已锁定）'], ['2026-09（截至 02 日）', '¥ 11,568', '¥ 518', '--（未锁定）']],
        headers: ['结算月', '实付金额', '成功退款', '最终结算'],
        definitions: ['实付金额：仅统计支付成功订单，按币种分别汇总。', '成功退款：仅统计退款成功终态，不包含处理中申请。', '预估净收入用于经营参考，最终金额以锁定月结算为准。', '-- 表示当前结算月尚未锁定，不代表金额为 0。'],
        filters: ['全部游戏'],
      },
      'P04-03': {
        metrics: [['外部 Key 可供库存', '1,248', 'Steam／Epic 聚合'], ['盖世 Key 剩余额度', '8,000', '计划 KEYPLAN-001'], ['渠道分配成功', '4,682', '不含测试行为'], ['盖世 Key 已兑换', '3,916', '兑换成功终态']],
        chart: '外部 Key 交付与盖世 Key 分配／兑换趋势', title: '双类 Key 账本', unit: 'Key 数量（个）', legend: '渠道分配成功',
        rows: [['外部 Key', 'SKU-CN-001', '1,248', '876 次交付'], ['盖世 Key', 'KEYPLAN-001', '8,000', '3,916 次兑换']],
        headers: ['Key 类型', 'SKU／计划', '可用库存／额度', '成功结果'],
        definitions: ['外部 Key 库存按可用且未预留状态统计。', '盖世 Key 剩余额度为计划总额度扣除已生成数量。', '渠道分配按 request_id 去重，不重复扣减库存。', '测试订单和测试兑换全部排除。'],
        filters: ['全部游戏', '全部渠道'],
      },
      'P04-04': {
        metrics: [['成功下载', '2,774', '三系统聚合'], ['成功更新', '1,986', '成功终态'], ['首次成功启动', '2,408', 'uid＋app_id 去重'], ['主要失败', '网络中断', '仅聚合分类']],
        chart: 'Windows、macOS、Linux 下载／更新／首次启动趋势', title: 'OS／架构交付表现', unit: '设备数（台）', legend: '首次成功启动',
        rows: [['Windows／x64', '1,842', '1,354', '1,621'], ['macOS／Apple Silicon', '612', '428', '506'], ['Linux／x64', '320', '204', '281']],
        headers: ['OS／架构', '成功下载', '成功更新', '首次启动'],
        definitions: ['成功下载和更新以客户端完成校验的终态为准。', '首次成功启动按 uid＋app_id 去重，与设备数量无关。', '失败原因仅展示聚合分类，不提供用户或设备明细。', '客户端结果次日更新；-- 表示数据尚未完成聚合。'],
        filters: ['全部游戏', '全部系统'],
      },
      'P04-07': {
        metrics: [['Campaign 点击', '8,920', '点击可用渠道'], ['渠道订单', '1,482', '固化来源快照'], ['成功交付', '1,366', '权益／Key 终态'], ['首次成功启动', '1,104', '归因窗口内']],
        chart: 'Campaign／UTM 渠道转化漏斗', title: '渠道与 Campaign 对比', unit: '转化数量（次）', legend: '成功交付',
        rows: [['CMP-202609-001／Bilibili', '5,420', '982', '874', '706'], ['CMP-202608-014／Steam 社区', '--', '318', '306', '251'], ['自然流量', '--', '182', '186', '147']],
        headers: ['Campaign／渠道', '点击', '订单／领取', '成功交付', '首次启动'],
        definitions: ['订单创建时固化 Campaign／UTM 来源快照，后续不改写。', '首次成功启动只统计归因有效期内完成的用户。', '同一请求与订单按 request_id、channel_order_id 去重。', '-- 表示该渠道不提供对应指标，不按 0 处理。'],
        filters: ['全部游戏', '全部渠道'],
      },
    };
    const config = configs[route.id] || configs['P04-01'];
    const headers = config.headers || ['经营阶段', '聚合结果', '权威来源／口径', '数据更新至'];
    return `<div><div class="dashboard-toolbar"><div class="dashboard-toolbar__group">${c.button({ label: range.label, variant: 'primary', action: 'dashboard-range', extra: 'data-dashboard-range' })}${c.button({ label: '近 90 天', action: 'dashboard-range', extra: 'data-dashboard-range' })}${config.filters.map((label, index) => c.button({ label, variant: index === 0 ? 'primary' : 'secondary', action: 'dashboard-filter', extra: 'data-dashboard-filter' })).join('')}</div><span class="save-state">数据更新：交易／Key 小时级，客户端 T+1；测试行为全部排除</span></div><div class="metric-grid">${config.metrics.map(([label, value, trend]) => c.metricCard({ label, value, trend })).join('')}</div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: config.title, body: `${c.chart({ label: config.chart, unit: config.unit, legend: config.legend })}<div class="form-section">${c.table({ headers, rows: config.rows })}</div>` })}</div><div class="span-4">${panel({ title: '数据口径', body: sectionList(config.definitions) })}</div></div></div>`;
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
    T15: renderT15,
  };

  namespace.templates = {
    registry,
    render({ route, page, state = 'default' }) {
      if (state !== 'default') return c.statePanel({ state, primaryAction: page?.primaryAction, onRetry: state === 'error' });
      const renderer = registry[route.templateId] || registry.T03;
      return `<section class="page-template template-${route.templateId.toLowerCase()}" data-page-state="default">${renderer({ route, page })}</section>`;
    },
  };
})(window.GameHubDeveloperPortal);

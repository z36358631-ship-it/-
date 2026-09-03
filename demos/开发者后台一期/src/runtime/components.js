window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};

(function registerComponents(namespace) {
  const icon = (name, className) => namespace.icons.render(name, className);
  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  const attrs = values => Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([key, value]) => value === true ? key : `${key}="${escapeHtml(value)}"`)
    .join(' ');

  const button = ({ label, variant = 'secondary', iconName, action, primary = false, disabled = false, size, extra = '' }) => {
    const attributeText = attrs({
      type: 'button',
      class: 'gh-button',
      'data-component': 'Button',
      'data-variant': variant,
      'data-size': size,
      'data-portal-action': action,
      'data-primary-action': primary || undefined,
      disabled: disabled || undefined,
      'aria-disabled': disabled ? 'true' : undefined,
    });
    return `<button ${attributeText}${extra ? ` ${extra}` : ''}>${iconName ? icon(iconName) : ''}<span>${escapeHtml(label)}</span></button>`;
  };

  const input = ({ label, value = '', placeholder = '', name = '', required = false, hint = '', invalid = false, error = '', type = 'text', disabled = false, extra = '' }) => `
    <label class="field">
      <span class="field-label"><span>${escapeHtml(label)}${required ? '<span class="field-required">*</span>' : ''}</span>${hint ? `<span class="field-hint">${escapeHtml(hint)}</span>` : ''}</span>
      <input class="gh-input" data-component="Input" data-variant="${invalid ? 'error' : 'default'}" type="${escapeHtml(type)}" name="${escapeHtml(name)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" ${required ? 'required' : ''} ${invalid ? 'aria-invalid="true"' : ''} ${disabled ? 'disabled aria-disabled="true"' : ''}${extra ? ` ${extra}` : ''}>
      ${error ? `<span class="field-error">${escapeHtml(error)}</span>` : ''}
    </label>`;

  const textarea = ({ label, value = '', placeholder = '', required = false, hint = '', name = '', disabled = false, extra = '' }) => `
    <label class="field is-wide">
      <span class="field-label"><span>${escapeHtml(label)}${required ? '<span class="field-required">*</span>' : ''}</span>${hint ? `<span class="field-hint">${escapeHtml(hint)}</span>` : ''}</span>
      <textarea class="gh-textarea" data-component="Input" data-variant="multiline" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${required ? 'required' : ''} ${disabled ? 'disabled aria-disabled="true"' : ''}${extra ? ` ${extra}` : ''}>${escapeHtml(value)}</textarea>
    </label>`;

  const select = ({ label, options = [], value, name = '' }) => `
    <label class="field">
      <span class="field-label">${escapeHtml(label)}</span>
      <select class="gh-select" data-component="Select" data-variant="default" name="${escapeHtml(name)}">
        ${options.map(option => {
          const entry = typeof option === 'string' ? { label: option, value: option } : option;
          return `<option value="${escapeHtml(entry.value)}"${entry.value === value ? ' selected' : ''}>${escapeHtml(entry.label)}</option>`;
        }).join('')}
      </select>
    </label>`;

  const statusVariant = status => {
    const text = String(status || '');
    if (/通过|正常|已发布|进行中|已完成|可售|成功|在线|可用/.test(text)) return 'success';
    if (/异常|失败|驳回|中断|停售|下架|不通过|已作废|已撤销/.test(text)) return 'danger';
    if (/待|草稿|审核中|排期|测试中|处理中|暂停|生成中/.test(text)) return 'warning';
    return 'info';
  };

  const statusTag = (status, variant = statusVariant(status)) => `<span class="status-tag" data-component="StatusTag" data-variant="${escapeHtml(variant)}">${escapeHtml(status || '未知状态')}</span>`;

  const normalizeRows = rows => rows.length ? rows : [['暂无数据', '等待业务确认', '未开始', '查看']];
  const table = ({ headers = ['对象', '说明', '状态', '操作'], rows = [] }) => {
    const safeRows = normalizeRows(rows);
    return `<div class="table-wrap"><table class="data-table" data-component="Table" data-variant="default" data-columns="${headers.length}">
      <thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
      <tbody>${safeRows.map((row, rowIndex) => `<tr>${row.map((cell, cellIndex) => {
        const value = typeof cell === 'object' ? cell : { text: cell };
        if (value.status) return `<td>${statusTag(value.status)}</td>`;
        if (value.action) return `<td>${button({ label: value.action, variant: 'text', size: 'small', action: value.portalAction || 'row-detail' })}</td>`;
        const text = String(value.text ?? '');
        const isIdentifier = /(?:\b(?:APP|SKU|BUILD|MANIFEST|KEY|TEST|CMP|REQ|EXP|QRY|REL|VEN|SUP|ACC)-[A-Z0-9-]+\b|\bcli_[a-z0-9_]+\b|^\d{4}[-/]\d{2}[-/]\d{2})/i.test(text);
        const classes = [cellIndex === 0 ? 'table-primary' : '', isIdentifier ? 'table-identifier' : ''].filter(Boolean).join(' ');
        return `<td><div class="${classes}">${escapeHtml(text)}</div>${value.subtext ? `<div class="table-secondary">${escapeHtml(value.subtext)}</div>` : ''}</td>`;
      }).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  };

  const pagination = ({ total = 1, page = 1, pageSize = 20 }) => {
    const totalPages = Math.max(1, Math.ceil(Number(total) / Math.max(1, Number(pageSize))));
    const currentPage = Math.min(Math.max(1, Number(page)), totalPages);
    const pageButtons = Array.from({ length: totalPages }, (_, index) => index + 1)
      .map(item => `<button class="page-button${item === currentPage ? ' is-active' : ''} number" data-portal-action="page-${item}"${item === currentPage ? ' aria-current="page"' : ''}>${escapeHtml(item)}</button>`)
      .join('');
    return `<div class="pagination" data-component="Pagination" data-variant="default">
      <span>共 <strong class="number">${escapeHtml(total)}</strong> 条记录</span>
      <div class="pagination__buttons">
        <button class="page-button" data-portal-action="page-prev" aria-label="上一页"${currentPage === 1 ? ' disabled aria-disabled="true"' : ''}>${icon('chevron', 'gh-icon')}</button>
        ${pageButtons}
        <button class="page-button" data-portal-action="page-next" aria-label="下一页"${currentPage === totalPages ? ' disabled aria-disabled="true"' : ''}>${icon('chevron', 'gh-icon')}</button>
      </div>
    </div>`;
  };

  const tabs = ({ items = [], active = 0, variant = 'line', action = 'tab', idPrefix = 'tab', indexAttribute = 'data-tab-index' }) =>
    `<div class="tabs" role="tablist" data-component="Tabs" data-variant="${escapeHtml(variant)}">${items.map((item, index) => {
      const id = `${idPrefix}-${index}`;
      return `<button id="${escapeHtml(id)}" class="tab${index === active ? ' is-active' : ''}" role="tab" aria-selected="${index === active}" aria-controls="${escapeHtml(id)}-panel" tabindex="${index === active ? '0' : '-1'}" data-portal-action="${escapeHtml(action)}" ${escapeHtml(indexAttribute)}="${index}">${escapeHtml(item)}</button>`;
    }).join('')}</div>`;

  const authorizationSummary = authorization => `<section class="authorization-summary" data-cdkey-authorization>
    <div data-authorization-status><span>授权状态</span>${statusTag(authorization.status, 'success')}</div>
    <div data-authorization-quota><span>剩余 Key 配额</span><strong class="number">${escapeHtml(authorization.remainingQuota)}</strong></div>
    <div data-authorization-channels><span>可用渠道</span><strong>${escapeHtml(authorization.channels.join('、'))}</strong></div>
    <div data-authorization-paused><span>暂停原因</span><strong>${escapeHtml(authorization.pausedReason)}</strong></div>
  </section>`;

  const codeBlock = ({ title, code, action = 'copy-api-example' }) => `<section class="code-block">
    <header><strong>${escapeHtml(title)}</strong>${button({ label: '复制示例', variant: 'text', action, size: 'small' })}</header>
    <pre><code>${escapeHtml(code)}</code></pre>
  </section>`;

  const stepper = ({ items = [], active = 0 }) => `<div class="stepper" data-component="Stepper" data-variant="horizontal">${items.map((item, index) => `<div class="stepper-item${index < active ? ' is-done' : ''}${index === active ? ' is-active' : ''}"><span class="stepper-dot">${index < active ? icon('check', 'gh-icon') : ''}</span><span>${escapeHtml(item)}</span></div>`).join('')}</div>`;

  const timeline = ({ items = [] }) => `<ol class="timeline" data-component="Timeline" data-variant="vertical">${items.map((item, index) => `<li class="timeline-item"><div class="timeline-title">${escapeHtml(item)}</div><div class="timeline-meta number">${index === 0 ? '刚刚' : '历史记录'}</div></li>`).join('')}</ol>`;

  const metricCard = ({ label, value, trend = 'T+1 汇总口径' }) => `<article class="metric-card" data-component="MetricCard" data-variant="default"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value number">${escapeHtml(value)}</div><div class="metric-trend">${escapeHtml(trend)}</div></article>`;

  const chart = ({ label = '趋势', unit = '数量（次）', legend = '当前指标' } = {}) => `<div class="chart" data-component="Chart" data-variant="line" role="img" aria-label="${escapeHtml(label)}">
    <div class="chart-heading"><span>${escapeHtml(unit)}</span><span class="legend-item"><i class="legend-dot"></i>${escapeHtml(legend)}</span></div>
    <svg viewBox="0 0 760 220" preserveAspectRatio="none"><defs><linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6A7CFF" stop-opacity=".30"/><stop offset="1" stop-color="#6A7CFF" stop-opacity="0"/></linearGradient></defs>
      <path class="chart-grid" d="M58 24H740M58 72H740M58 120H740M58 168H740"/>
      <g class="chart-axis"><text x="48" y="28">3,000</text><text x="48" y="76">2,000</text><text x="48" y="124">1,000</text><text x="48" y="172">0</text><text x="58" y="207">08-28</text><text x="276" y="207">08-30</text><text x="498" y="207">09-01</text><text x="704" y="207">09-03</text></g>
      <path class="chart-area" d="M58 168L58 148L154 135L252 141L350 102L448 111L546 70L644 84L740 40L740 168Z"/>
      <path class="chart-line" d="M58 148L154 135L252 141L350 102L448 111L546 70L644 84L740 40"/>
      <g>${[[58,148],[154,135],[252,141],[350,102],[448,111],[546,70],[644,84],[740,40]].map(([x,y]) => `<circle class="chart-dot" cx="${x}" cy="${y}" r="4"/>`).join('')}</g>
    </svg></div>`;

  const statePanel = ({ state, primaryAction = '返回', onRetry = false }) => {
    if (state === 'loading') return `<section class="state-panel" data-component="StatePanel" data-variant="loading" data-page-state="loading"><div class="skeleton-stack" aria-label="页面加载中"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div></section>`;
    const config = {
      empty: { iconName: 'file', title: '暂无数据', copy: '当前条件下没有可展示的内容。', action: primaryAction },
      error: { iconName: 'warning', title: '页面加载失败', copy: '页面数据加载失败，请重试。', action: '重试' },
      permission: { iconName: 'lock', title: '暂无访问权限', copy: '当前账号未获授权访问此页面，如需处理请联系平台管理员。', action: '返回可访问页面' },
    }[state] || { iconName: 'info', title: '状态未知', copy: '请返回默认状态。', action: '返回' };
    return `<section class="state-panel" data-component="StatePanel" data-variant="${escapeHtml(state)}" data-page-state="${escapeHtml(state)}"><div class="state-content"><div class="state-visual">${icon(config.iconName)}</div><h2>${escapeHtml(config.title)}</h2><p>${escapeHtml(config.copy)}</p>${button({ label: config.action, variant: 'primary', action: onRetry || state === 'error' ? 'retry-state' : 'default-state', primary: true })}</div></section>`;
  };

  const resultStrip = ({ title, detail = '', variant = 'info' }) => `<div class="result-strip" data-component="ResultStrip" data-variant="${escapeHtml(variant)}" role="status">${icon(variant === 'danger' || variant === 'warning' ? 'warning' : 'info')}<div><strong>${escapeHtml(title)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ''}</div></div>`;

  namespace.components = { escapeHtml, button, input, textarea, select, statusTag, table, pagination, tabs, authorizationSummary, codeBlock, stepper, timeline, metricCard, chart, statePanel, resultStrip };
})(window.GameHubDeveloperPortal);

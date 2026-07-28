const tokenParams = new URLSearchParams(location.search);
const tokenFromUrl = tokenParams.get('token');

const state = {
  token: tokenFromUrl || sessionStorage.getItem('workbenchToken') || '',
  requirements: [],
  runs: [],
  manualTasks: [],
  artifacts: [],
  workspaceRoot: '',
  health: null,
  selectedRequirementId: null,
  searchTerm: '',
  activeEvents: null,
};

if (state.token) sessionStorage.setItem('workbenchToken', state.token);
if (tokenParams.has('token')) {
  history.replaceState(null, '', `${location.pathname}${location.hash}`);
}

const pageLabels = {
  home: '待我处理',
  planning: '规划中心',
  requirements: '需求中心',
  review: '评审与验收',
  data: '数据与复盘',
  codex: 'Codex任务',
};

const runLabels = {
  queued: '等待执行',
  running: '执行中',
  'waiting-approval': '等待确认',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
  interrupted: '已中断',
};

const activeRunStatuses = new Set(['queued', 'running', 'waiting-approval']);

function query(selector, root = document) {
  return root.querySelector(selector);
}

function queryAll(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function text(element, value) {
  if (element) element.textContent = value == null ? '' : String(value);
  return element;
}

function createElement(tagName, className = '', value = null) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (value !== null) text(element, value);
  return element;
}

function statusClass(status) {
  if (status === 'completed' || status === '已完成') return 'is-success';
  if (status === 'failed' || status === 'cancelled' || status === 'interrupted') return 'is-danger';
  if (status === 'running' || status === 'queued' || status === 'waiting-approval') return 'is-progress';
  if (String(status || '').startsWith('等待')) return 'is-warning';
  return 'is-neutral';
}

function formatDate(value, includeTime = false) {
  if (!value) return '时间未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(date);
}

function describeRun(run) {
  return run.result || run.error || '等待 Codex 返回结果';
}

function matchesSearch(value) {
  return String(value || '').toLocaleLowerCase('zh-CN').includes(state.searchTerm);
}

function visibleRequirements() {
  return state.requirements.filter(requirement => {
    const artifactText = state.artifacts
      .filter(artifact => artifact.requirementId === requirement.id)
      .map(artifact => `${artifact.kind} ${artifact.path}`)
      .join(' ');
    return matchesSearch([
      requirement.id,
      requirement.title,
      requirement.stage,
      requirement.externalWait,
      artifactText,
    ].join(' '));
  });
}

function visibleRuns() {
  return state.runs.filter(run => matchesSearch([
    run.id,
    run.requirementId,
    run.prompt,
    run.result,
    run.error,
    run.status,
  ].join(' ')));
}

function visibleManualTasks() {
  return state.manualTasks.filter(task => matchesSearch([
    task.assigneeNote,
    task.description,
    task.expectedDeliverable,
    task.currentNote,
    task.status,
  ].join(' ')));
}

function authHeaders(json = false) {
  return {
    Authorization: `Bearer ${state.token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function api(path, options = {}) {
  if (!state.token) {
    throw new Error('缺少本机会话令牌，请从启动终端输出的地址进入工作台。');
  }
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...authHeaders(Boolean(options.body)),
      ...options.headers,
    },
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { error: await response.text() };
  if (!response.ok) {
    throw new Error(payload.error || `本机服务返回 HTTP ${response.status}`);
  }
  return payload;
}

function emptyState(message) {
  return createElement('div', 'empty-state', message);
}

function buildStatusPill(value, overrideLabel = null) {
  const pill = createElement('span', `status-pill ${statusClass(value)}`, overrideLabel || value || '未记录');
  return pill;
}

function buildRequirementRow(requirement, navigate) {
  const template = query('#requirementCard');
  const row = template.content.firstElementChild.cloneNode(true);
  row.dataset.requirementId = requirement.id;
  row.classList.toggle('is-selected', requirement.id === state.selectedRequirementId);
  row.setAttribute(
    'aria-label',
    `${requirement.id} ${requirement.title}，阶段 ${requirement.stage}，${requirement.externalWait}`,
  );
  text(query('.requirement-id', row), requirement.id);
  text(query('.requirement-title', row), requirement.title);
  const stage = query('.stage', row);
  text(stage, requirement.stage);
  stage.classList.add('is-progress');
  text(query('.external-wait', row), requirement.externalWait);
  row.addEventListener('click', () => selectRequirement(requirement.id, { navigate }));
  return row;
}

function renderRequirementTargets(requirements) {
  const homeTarget = query('#homeRequirements');
  const listTarget = query('#requirementList');
  const homeRows = requirements.slice(0, 5).map(item => buildRequirementRow(item, true));
  const listRows = requirements.map(item => buildRequirementRow(item, false));
  homeTarget.replaceChildren(...(homeRows.length ? homeRows : [emptyState('没有匹配的需求')]));
  listTarget.replaceChildren(...(listRows.length ? listRows : [emptyState('没有匹配的需求')]));
  text(query('#requirementResultMeta'), `共 ${requirements.length} 条匹配结果`);
}

function buildRunCard(run) {
  const card = createElement('article', 'run-card');
  const top = createElement('div', 'run-card-top');
  const title = createElement('strong', '', run.prompt || '未命名任务');
  top.append(title, buildStatusPill(run.status, runLabels[run.status] || run.status));
  const detail = createElement('p', '', describeRun(run));
  const meta = createElement('div', 'run-meta');
  meta.append(
    createElement('span', '', run.requirementId || '全局任务'),
    createElement('span', '', formatDate(run.startedAt, true)),
  );
  card.append(top, detail, meta);
  return card;
}

function buildRunTableRow(run) {
  const row = createElement('article', 'run-table-row');
  const title = createElement('div', 'run-title');
  title.append(
    createElement('strong', '', run.prompt || '未命名任务'),
    createElement('span', '', describeRun(run)),
  );
  const status = buildStatusPill(run.status, runLabels[run.status] || run.status);
  const context = createElement(
    'span',
    'run-context',
    run.requirementId ? `${run.requirementId} / ${run.permission}` : `全局任务 / ${run.permission}`,
  );
  const time = createElement('time', 'run-time', formatDate(run.startedAt, true));
  if (run.startedAt) time.dateTime = run.startedAt;
  row.append(title, status, context, time);
  return row;
}

function renderRunTargets(runs) {
  const homeTarget = query('#homeRuns');
  const runTarget = query('#runList');
  const homeCards = runs.slice(0, 4).map(buildRunCard);
  const tableRows = runs.map(buildRunTableRow);
  homeTarget.replaceChildren(...(homeCards.length ? homeCards : [emptyState('尚无 Codex 运行记录')]));
  runTarget.replaceChildren(...(tableRows.length ? tableRows : [emptyState('尚无 Codex 运行记录')]));
  text(query('#runResultMeta'), `共 ${runs.length} 条匹配记录`);
}

function buildManualTaskCard(task) {
  const card = createElement('article', 'note-card');
  const top = createElement('div', 'note-card-top');
  top.append(
    createElement('strong', '', `${task.assigneeNote} · ${task.description}`),
    buildStatusPill(task.status),
  );
  const note = createElement(
    'p',
    '',
    task.currentNote || `期望交付：${task.expectedDeliverable}`,
  );
  const meta = createElement('div', 'note-meta');
  meta.append(
    createElement('span', '', `交付：${task.expectedDeliverable}`),
    createElement('span', '', task.dueAt ? `截止：${formatDate(task.dueAt)}` : '未设截止时间'),
  );
  card.append(top, note, meta);
  return card;
}

function renderManualTasks(tasks) {
  const target = query('#manualTaskNotes');
  const cards = tasks.slice(0, 5).map(buildManualTaskCard);
  target.replaceChildren(...(cards.length ? cards : [emptyState('尚无产品专员任务备注')]));
}

function renderMetrics() {
  const waiting = state.requirements.filter(
    requirement => requirement.externalWait && requirement.externalWait !== '无外部等待',
  ).length;
  const active = state.runs.filter(run => activeRunStatuses.has(run.status)).length;
  const completed = state.runs.filter(run => run.status === 'completed').length;
  text(query('#myTodoCount'), state.requirements.length);
  text(query('#externalWaitCount'), waiting);
  text(query('#activeRunCount'), active);
  text(query('#recentResultCount'), completed);
  const badge = query('#navRunBadge');
  text(badge, active);
  badge.hidden = active === 0;
  const startButton = query('#startRun');
  if (!startButton.dataset.submitting) startButton.disabled = active >= 1;
}

function renderRequirementDetail() {
  const target = query('#requirementDetail');
  const requirement = state.requirements.find(item => item.id === state.selectedRequirementId);
  if (!requirement) {
    const wrapper = createElement('div', 'detail-empty');
    const icon = createElement('div', 'empty-icon');
    const iconText = createElement('span', '', 'PRD');
    iconText.setAttribute('aria-hidden', 'true');
    icon.append(iconText);
    const title = createElement('h2', '', '选择一个需求');
    title.id = 'requirementDetailTitle';
    wrapper.append(
      icon,
      title,
      createElement('p', '', '查看阶段、外部等待和已授权产物，并可直接发起只读分析。'),
    );
    target.replaceChildren(wrapper);
    return;
  }

  const wrapper = createElement('div', 'detail-content');
  const header = createElement('header', 'detail-header');
  const identifier = createElement('small', '', requirement.id);
  const title = createElement('h2', '', requirement.title);
  title.id = 'requirementDetailTitle';
  const badges = createElement('div', 'detail-badges');
  badges.append(
    buildStatusPill('running', requirement.stage),
    buildStatusPill(
      requirement.externalWait === '无外部等待' ? 'completed' : '等待',
      requirement.externalWait,
    ),
  );
  header.append(identifier, title, badges);

  const artifactsSection = createElement('section', 'detail-section');
  artifactsSection.append(createElement('h3', '', '关联产物'));
  const artifacts = state.artifacts.filter(artifact => artifact.requirementId === requirement.id);
  const artifactList = createElement('ul', 'artifact-list');
  for (const artifact of artifacts) {
    const item = createElement('li', 'artifact-item');
    const kind = createElement('span', 'artifact-kind', String(artifact.kind || 'FILE').slice(0, 4));
    kind.setAttribute('aria-hidden', 'true');
    const copy = createElement('div');
    copy.append(
      createElement('strong', '', artifact.kind || '文件'),
      createElement('small', '', artifact.path),
    );
    item.append(kind, copy);
    artifactList.append(item);
  }
  artifactsSection.append(
    artifacts.length ? artifactList : emptyState('当前需求尚未关联产物'),
  );

  const actionSection = createElement('section', 'detail-section detail-actions');
  const actionTitle = createElement('h3', '', '下一步');
  const actionCopy = createElement(
    'p',
    'detail-action-copy',
    '已选择的需求与关联文件会自动带入 Codex 抽屉，你仍可在提交前调整。',
  );
  const action = createElement('button', 'button button-primary', '基于此需求提问');
  action.type = 'button';
  action.addEventListener('click', openCodex);
  actionSection.append(actionTitle, actionCopy, action);

  wrapper.append(header, artifactsSection, actionSection);
  target.replaceChildren(wrapper);
}

function syncDrawerContext() {
  const requirement = state.requirements.find(item => item.id === state.selectedRequirementId);
  text(
    query('#contextRequirement'),
    requirement ? `${requirement.id} · ${requirement.title}` : '未选择，按全局任务处理',
  );
  text(query('#contextRoot'), state.workspaceRoot || '由 Broker 授权');
  const files = requirement
    ? state.artifacts
      .filter(artifact => artifact.requirementId === requirement.id)
      .map(artifact => artifact.path)
    : [];
  query('#authorizedFiles').value = [...new Set(files)].join('\n');
}

function selectRequirement(id, { navigate = false } = {}) {
  const requirement = state.requirements.find(item => item.id === id);
  if (!requirement) return;
  state.selectedRequirementId = id;
  syncDrawerContext();
  renderRequirementTargets(visibleRequirements());
  renderRequirementDetail();
  if (navigate) activatePage('requirements');
}

function render() {
  const requirements = visibleRequirements();
  const runs = visibleRuns();
  const manualTasks = visibleManualTasks();
  renderMetrics();
  renderRequirementTargets(requirements);
  renderRunTargets(runs);
  renderManualTasks(manualTasks);
  renderRequirementDetail();
}

function activatePage(pageName, { focusHeading = true } = {}) {
  if (!Object.hasOwn(pageLabels, pageName)) return;
  for (const button of queryAll('[data-page]', query('#primaryNav'))) {
    const active = button.dataset.page === pageName;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  for (const panel of queryAll('[data-page-panel]')) {
    const active = panel.dataset.pagePanel === pageName;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  }
  text(query('#currentPageLabel'), pageLabels[pageName]);
  closeMobileNavigation();
  if (focusHeading) {
    const heading = query('h1', query(`[data-page-panel="${pageName}"]`));
    heading?.focus({ preventScroll: true });
  }
}

function openMobileNavigation() {
  document.body.classList.add('nav-open');
  query('#navToggle').setAttribute('aria-expanded', 'true');
  query('#navToggle').setAttribute('aria-label', '关闭主导航');
  query('#navScrim').tabIndex = 0;
  query('.nav-item', query('#primaryNav'))?.focus();
}

function closeMobileNavigation({ restoreFocus = false } = {}) {
  const wasOpen = document.body.classList.contains('nav-open');
  document.body.classList.remove('nav-open');
  query('#navToggle').setAttribute('aria-expanded', 'false');
  query('#navToggle').setAttribute('aria-label', '打开主导航');
  query('#navScrim').tabIndex = -1;
  if (wasOpen && restoreFocus) query('#navToggle').focus();
}

function openCodex() {
  const drawer = query('#codexDrawer');
  syncDrawerContext();
  if (!drawer.open) drawer.showModal();
  requestAnimationFrame(() => query('#prompt').focus());
}

function closeCodex() {
  const drawer = query('#codexDrawer');
  if (drawer.open) drawer.close();
}

function showToast(message, error = false) {
  const target = query('#toastRegion');
  const toast = createElement('div', `toast${error ? ' is-error' : ''}`, message);
  target.replaceChildren(toast);
  window.setTimeout(() => {
    if (toast.isConnected) toast.remove();
  }, 4200);
}

function setHealth(label, stateName, diagnostic = '') {
  const badge = query('#healthBadge');
  badge.className = `health-badge ${stateName}`;
  text(query('span:last-child', badge), label);
  if (diagnostic) badge.title = diagnostic;
  else badge.removeAttribute('title');
}

function renderHealth(health) {
  if (!health) {
    setHealth('Broker 状态未知', 'is-error');
    return;
  }
  if (health.configuration === 'error') {
    setHealth('Codex 配置错误', 'is-error', health.diagnostic);
    return;
  }
  if (health.authentication === 'error') {
    setHealth('Codex 认证失效', 'is-error', health.diagnostic);
    return;
  }
  if (health.codex === 'ok') {
    setHealth('Codex 已连接', 'is-ready');
    return;
  }
  if (health.broker === 'ok') {
    setHealth('Broker 正常', 'is-checking', health.diagnostic);
    return;
  }
  setHealth('本机连接异常', 'is-error', health.diagnostic);
}

async function refreshBootstrap({ announce = false } = {}) {
  const bootstrap = await api('/api/bootstrap');
  state.requirements = Array.isArray(bootstrap.requirements) ? bootstrap.requirements : [];
  state.artifacts = Array.isArray(bootstrap.artifacts) ? bootstrap.artifacts : [];
  state.runs = Array.isArray(bootstrap.runs) ? bootstrap.runs : [];
  state.manualTasks = Array.isArray(bootstrap.manualTasks) ? bootstrap.manualTasks : [];
  state.workspaceRoot = bootstrap.workspace?.root || '';
  state.health = bootstrap.health || null;
  if (
    state.selectedRequirementId
    && !state.requirements.some(item => item.id === state.selectedRequirementId)
  ) {
    state.selectedRequirementId = null;
  }
  if (!state.selectedRequirementId && state.requirements.length) {
    state.selectedRequirementId = state.requirements[0].id;
  }
  renderHealth(state.health);
  syncDrawerContext();
  render();
  if (announce) showToast('工作台数据已刷新');
  return bootstrap;
}

function parseEvent(event) {
  try {
    const value = JSON.parse(event.data);
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function appendStreamEvent(label, detail = '') {
  const item = createElement('li');
  item.append(
    createElement('span', '', label),
    ...(detail ? [createElement('span', '', detail)] : []),
  );
  const target = query('#streamEvents');
  target.append(item);
  if (target.children.length > 12) target.firstElementChild.remove();
}

function updateSubmittingState(submitting) {
  const button = query('#startRun');
  if (submitting) button.dataset.submitting = 'true';
  else delete button.dataset.submitting;
  button.disabled = submitting
    || state.runs.some(run => activeRunStatuses.has(run.status));
  button.setAttribute('aria-busy', String(submitting));
  text(query('span', button), submitting ? '正在创建任务' : '开始只读任务');
}

async function startRun() {
  const prompt = query('#prompt').value.trim();
  const files = [...new Set(
    query('#authorizedFiles').value
      .split(/\r?\n/)
      .map(value => value.trim())
      .filter(Boolean),
  )];
  if (!prompt) {
    text(query('#drawerMessage'), '请输入任务描述后再开始。');
    query('#prompt').focus();
    return;
  }
  if (!state.token) {
    text(query('#drawerMessage'), '缺少本机会话令牌，请从启动终端输出的地址进入。');
    return;
  }

  if (state.activeEvents) {
    state.activeEvents.close();
    state.activeEvents = null;
  }
  updateSubmittingState(true);
  text(query('#drawerMessage'), '正在创建持久化 Run 与只读 Codex 会话。');
  text(query('#drawerRunStatus'), '正在创建');
  query('#streamSection').hidden = false;
  query('#streamEvents').replaceChildren();
  text(query('#streamOutput'), '');
  text(query('#streamConnectionState'), '连接准备中');

  try {
    const run = await api('/api/runs', {
      method: 'POST',
      body: JSON.stringify({
        requirementId: state.selectedRequirementId,
        prompt,
        files,
      }),
    });
    state.runs = [run, ...state.runs.filter(item => item.id !== run.id)];
    render();
    text(query('#drawerRunStatus'), runLabels[run.status] || '执行中');
    text(query('#contextThread'), run.threadId || '等待 App Server 返回');
    text(query('#drawerMessage'), '任务已创建，正在接收持久化事件。');
    text(query('#streamConnectionState'), '实时连接中');
    appendStreamEvent('Run 已创建', run.id);

    let settled = false;
    const events = new EventSource(`/api/runs/${encodeURIComponent(run.id)}/events?token=${encodeURIComponent(state.token)}`);
    state.activeEvents = events;

    events.addEventListener('item/agentMessage/delta', event => {
      const payload = parseEvent(event);
      if (typeof payload.delta === 'string') {
        query('#streamOutput').textContent += payload.delta;
      }
    });
    events.addEventListener('item/started', event => {
      const payload = parseEvent(event);
      appendStreamEvent('开始处理', payload.itemType || '事件');
    });
    events.addEventListener('item/completed', event => {
      const payload = parseEvent(event);
      appendStreamEvent('完成步骤', payload.itemType || '事件');
    });
    events.addEventListener('turn/completed', event => {
      const payload = parseEvent(event);
      appendStreamEvent('Turn 结束', payload.status || '状态未知');
    });
    events.addEventListener('run.status', async event => {
      settled = true;
      const payload = parseEvent(event);
      text(query('#drawerRunStatus'), runLabels[payload.status] || payload.status || '运行结束');
      text(query('#streamConnectionState'), '事件已保存');
      text(
        query('#drawerMessage'),
        payload.status === 'completed'
          ? '只读任务已完成，结果已保存。'
          : `任务结束：${payload.error || runLabels[payload.status] || '状态未知'}`,
      );
      events.close();
      state.activeEvents = null;
      await refreshBootstrap();
      updateSubmittingState(false);
    });
    events.onerror = () => {
      if (settled) return;
      events.close();
      state.activeEvents = null;
      text(query('#drawerRunStatus'), '连接中断');
      text(query('#streamConnectionState'), '可刷新回看');
      text(query('#drawerMessage'), '事件连接已中断；运行记录仍会由 Broker 持久化。');
      updateSubmittingState(false);
    };
  } catch (error) {
    text(query('#drawerRunStatus'), '创建失败');
    text(query('#streamConnectionState'), '未连接');
    text(query('#drawerMessage'), error.message);
    text(query('#streamOutput'), error.message);
    showToast(error.message, true);
    updateSubmittingState(false);
  }
}

function showBootstrapError(error) {
  setHealth('本机连接失败', 'is-error', error.message);
  query('#homeRequirements').replaceChildren(emptyState(error.message));
  query('#homeRuns').replaceChildren(emptyState('无法读取运行记录'));
  query('#manualTaskNotes').replaceChildren(emptyState('无法读取任务备注'));
  query('#requirementList').replaceChildren(emptyState('无法读取需求数据'));
  query('#runList').replaceChildren(emptyState('无法读取运行记录'));
  text(query('#drawerMessage'), error.message);
}

query('#primaryNav').addEventListener('click', event => {
  const button = event.target.closest('[data-page]');
  if (button) activatePage(button.dataset.page);
});

query('#navToggle').addEventListener('click', () => {
  if (document.body.classList.contains('nav-open')) closeMobileNavigation({ restoreFocus: true });
  else openMobileNavigation();
});
query('#navScrim').addEventListener('click', () => closeMobileNavigation({ restoreFocus: true }));

for (const button of queryAll('[data-go-page]')) {
  button.addEventListener('click', () => activatePage(button.dataset.goPage));
}

for (const button of queryAll('.open-codex')) button.addEventListener('click', openCodex);
query('#askCodex').addEventListener('click', openCodex);
query('#closeCodex').addEventListener('click', closeCodex);
query('#startRun').addEventListener('click', startRun);

for (const button of queryAll('[data-prompt-template]')) {
  button.addEventListener('click', () => {
    query('#prompt').value = button.dataset.promptTemplate;
    query('#prompt').focus();
    text(query('#drawerMessage'), '已填入快捷任务，可继续编辑后提交。');
  });
}

query('#globalSearch').addEventListener('input', event => {
  state.searchTerm = event.target.value.trim().toLocaleLowerCase('zh-CN');
  render();
});

query('#refreshRuns').addEventListener('click', () => {
  refreshBootstrap({ announce: true }).catch(error => showToast(error.message, true));
});

document.addEventListener('keydown', event => {
  const editable = event.target.matches('input, textarea, [contenteditable="true"]');
  if (event.key === '/' && !editable && !query('#codexDrawer').open) {
    event.preventDefault();
    query('#globalSearch').focus();
  }
  if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
    event.preventDefault();
    closeMobileNavigation({ restoreFocus: true });
  }
});

query('#codexDrawer').addEventListener('close', () => {
  query('#askCodex').focus();
});

text(
  query('#todayLabel'),
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(new Date()),
);

const requestedPage = location.hash.replace(/^#/, '');
activatePage(Object.hasOwn(pageLabels, requestedPage) ? requestedPage : 'home', {
  focusHeading: false,
});

try {
  await refreshBootstrap();
} catch (error) {
  showBootstrapError(error);
}

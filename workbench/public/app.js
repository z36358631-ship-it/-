const tokenParams = new URLSearchParams(location.search);
const tokenFromUrl = tokenParams.get('token');

const state = {
  token: tokenFromUrl || sessionStorage.getItem('workbenchToken') || '',
  requirements: [],
  runs: [],
  manualTasks: [],
  artifacts: [],
  requirementCandidates: [],
  reviewFindings: [],
  productStrategies: [],
  workspaceRoot: '',
  health: null,
  selectedRequirementId: null,
  selectedRequirementContext: null,
  selectedArtifactPaths: new Set(),
  selectedWorkflow: null,
  contextLoading: false,
  searchTerm: '',
  activeEvents: null,
  codexTrigger: null,
  manualTaskTrigger: null,
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
const workflowLabels = {
  'feedback-triage': '整理反馈并去重',
  'demo-prd-review': '检查 Demo、PRD 差异与漏洞',
  'issue-strategy': '开发/测试问题转产品策略',
};
const requirementStages = [
  '待分析',
  '需求池',
  '已规划',
  '方案中',
  'Demo中',
  'PRD中',
  '待外部确认',
  '待评审',
  '开发中',
  '测试中',
  '待验收',
  '待上线',
  '效果观察',
  '已归档',
];
const externalWaits = [
  '等待产品专员',
  '等待运营反馈',
  '等待领导确认',
  '等待研发补充',
  '等待测试结果',
  '无外部等待',
];

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

function runTitle(run) {
  return workflowLabels[run.workflowType] || run.prompt || '未命名任务';
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
  row.addEventListener('click', () => {
    selectRequirement(requirement.id, { navigate }).catch(error => {
      if (state.selectedRequirementId !== requirement.id) return;
      state.contextLoading = false;
      state.selectedRequirementContext = null;
      renderRequirementDetail(error.message);
      showToast(error.message, true);
    });
  });
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
  const title = createElement('strong', '', runTitle(run));
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
    createElement('strong', '', runTitle(run)),
    createElement('span', '', describeRun(run)),
  );
  const status = buildStatusPill(run.status, runLabels[run.status] || run.status);
  const context = createElement(
    'span',
    'run-context',
    run.requirementId
      ? `${run.requirementId} / ${workflowLabels[run.workflowType] || run.permission}`
      : `全局任务 / ${run.permission}`,
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
  const actions = createElement('div', 'note-card-actions');
  const complete = createElement(
    'button',
    'button button-secondary',
    task.status === '已完成' ? '已完成' : '标记完成',
  );
  complete.type = 'button';
  complete.disabled = task.status === '已完成';
  complete.addEventListener('click', async () => {
    complete.disabled = true;
    complete.setAttribute('aria-busy', 'true');
    try {
      const updated = await api(`/api/manual-tasks/${encodeURIComponent(task.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: '已完成' }),
      });
      state.manualTasks = state.manualTasks.map(item => (
        item.id === updated.id ? updated : item
      ));
      render();
      showToast('产品专员任务备注已标记完成');
    } catch (error) {
      complete.disabled = false;
      complete.removeAttribute('aria-busy');
      showToast(error.message, true);
    }
  });
  actions.append(complete);
  card.append(top, note, meta, actions);
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

function buildSelect(values, currentValue, label) {
  const select = createElement('select');
  select.setAttribute('aria-label', label);
  for (const value of values) {
    const option = createElement('option', '', value);
    option.value = value;
    option.selected = value === currentValue;
    select.append(option);
  }
  return select;
}

function currentArtifacts() {
  if (
    state.selectedRequirementContext?.requirement?.id
    === state.selectedRequirementId
  ) {
    return state.selectedRequirementContext.artifacts || [];
  }
  return state.artifacts.filter(
    artifact => artifact.requirementId === state.selectedRequirementId,
  );
}

function selectedArtifacts() {
  return currentArtifacts().filter(artifact => (
    state.selectedArtifactPaths.has(artifact.path)
  ));
}

function updateArtifactSelection(path, checked) {
  if (!currentArtifacts().some(artifact => artifact.path === path)) return;
  if (checked) state.selectedArtifactPaths.add(path);
  else state.selectedArtifactPaths.delete(path);
  for (const checkbox of queryAll('[data-artifact-path]')) {
    if (checkbox.dataset.artifactPath === path) checkbox.checked = checked;
  }
  const selectionLabel = `${state.selectedArtifactPaths.size} 个产物已授权`;
  text(query('#artifactSelectionMeta'), selectionLabel);
  text(query('#drawerArtifactSelectionMeta'), selectionLabel);
}

function buildArtifactOption(artifact, surface) {
  const label = createElement('label', 'artifact-option');
  const checkbox = createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = artifact.path;
  checkbox.checked = state.selectedArtifactPaths.has(artifact.path);
  checkbox.dataset.artifactPath = artifact.path;
  checkbox.dataset.artifactKind = artifact.kind;
  checkbox.dataset.artifactSurface = surface;
  checkbox.setAttribute(
    'aria-label',
    `授权 ${artifact.kind || '文件'} ${artifact.path}`,
  );
  checkbox.addEventListener('change', () => {
    updateArtifactSelection(artifact.path, checkbox.checked);
  });
  const caption = createElement(
    'span',
    '',
    `[${artifact.kind || '文件'}] ${artifact.path}`,
  );
  label.append(checkbox, caption);
  return label;
}

function renderDrawerArtifactOptions() {
  const target = query('#drawerArtifactOptions');
  const artifacts = currentArtifacts();
  text(
    query('#drawerArtifactSelectionMeta'),
    `${state.selectedArtifactPaths.size} 个产物已授权；只可选择当前需求已经登记的产物。`,
  );
  if (!state.selectedRequirementId) {
    target.replaceChildren(emptyState('选择需求后才能授权登记产物'));
    return;
  }
  if (state.contextLoading) {
    target.replaceChildren(emptyState('正在读取登记产物'));
    return;
  }
  target.replaceChildren(...(
    artifacts.length
      ? artifacts.map(artifact => buildArtifactOption(artifact, 'drawer'))
      : [emptyState('当前需求尚未登记产物')]
  ));
}

function openManualTaskDialog() {
  if (!state.selectedRequirementId) {
    showToast('请先选择需求', true);
    return;
  }
  const dialog = query('#manualTaskDialog');
  state.manualTaskTrigger = document.activeElement;
  text(query('#manualTaskMessage'), '');
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => query('#manualTaskDescription').focus());
}

async function saveRequirementFields(requirement, stage, externalWait, messageTarget) {
  try {
    const updated = await api(
      `/api/requirements/${encodeURIComponent(requirement.id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ stage, externalWait }),
      },
    );
    state.requirements = state.requirements.map(item => (
      item.id === updated.id ? updated : item
    ));
    if (state.selectedRequirementContext?.requirement?.id === updated.id) {
      state.selectedRequirementContext = {
        ...state.selectedRequirementContext,
        requirement: updated,
      };
    }
    render();
    syncDrawerContext();
    showToast('需求状态已更新');
  } catch (error) {
    text(messageTarget, error.message);
    showToast(error.message, true);
  }
}

function renderRequirementDetail(errorMessage = '') {
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

  if (state.contextLoading) {
    const wrapper = createElement('div', 'detail-empty');
    const identifier = createElement('small', '', requirement.id);
    const title = createElement('h2', '', requirement.title);
    title.id = 'requirementDetailTitle';
    wrapper.append(
      identifier,
      title,
      createElement('p', '', '正在读取登记产物与历史 Thread…'),
    );
    target.replaceChildren(wrapper);
    return;
  }

  if (errorMessage) {
    const wrapper = createElement('div', 'detail-empty');
    const title = createElement('h2', '', requirement.title);
    title.id = 'requirementDetailTitle';
    wrapper.append(title, createElement('p', '', errorMessage));
    target.replaceChildren(wrapper);
    return;
  }

  const context = state.selectedRequirementContext;
  if (!context || context.requirement?.id !== requirement.id) {
    const wrapper = createElement('div', 'detail-empty');
    const title = createElement('h2', '', requirement.title);
    title.id = 'requirementDetailTitle';
    wrapper.append(title, createElement('p', '', '需求上下文尚未载入。'));
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
  const contextMeta = createElement(
    'p',
    'detail-action-copy',
    `Thread：${context.thread?.threadId || '首次运行时创建'}`,
  );
  const controls = createElement('div', 'detail-controls');
  const stageLabel = createElement('label');
  stageLabel.append(createElement('span', '', '需求阶段'));
  const stageSelect = buildSelect(
    requirementStages,
    requirement.stage,
    '手动调整需求阶段',
  );
  stageLabel.append(stageSelect);
  const waitLabel = createElement('label');
  waitLabel.append(createElement('span', '', '外部等待'));
  const waitSelect = buildSelect(
    externalWaits,
    requirement.externalWait,
    '手动调整外部等待',
  );
  waitLabel.append(waitSelect);
  controls.append(stageLabel, waitLabel);
  stageSelect.addEventListener('change', () => {
    saveRequirementFields(
      requirement,
      stageSelect.value,
      waitSelect.value,
      contextMeta,
    );
  });
  waitSelect.addEventListener('change', () => {
    saveRequirementFields(
      requirement,
      stageSelect.value,
      waitSelect.value,
      contextMeta,
    );
  });
  header.append(identifier, title, badges, contextMeta, controls);

  const artifactsSection = createElement('section', 'detail-section');
  const artifactsHeader = createElement('div', 'section-title-row');
  artifactsHeader.append(
    createElement('h3', '', '登记产物'),
    createElement(
      'span',
      '',
      `${state.selectedArtifactPaths.size} 个产物已授权`,
    ),
  );
  artifactsHeader.lastElementChild.id = 'artifactSelectionMeta';
  const artifactList = createElement('div', 'artifact-options');
  for (const artifact of context.artifacts) {
    artifactList.append(buildArtifactOption(artifact, 'detail'));
  }
  artifactsSection.append(
    artifactsHeader,
    context.artifacts.length ? artifactList : emptyState('当前需求尚未登记产物'),
  );

  const actionSection = createElement('section', 'detail-section detail-actions');
  const actionTitle = createElement('h3', '', '下一步');
  const actionCopy = createElement(
    'p',
    'detail-action-copy',
    '勾选本次允许分析的登记产物，再进入 Codex 选择自由任务或产品工作流。',
  );
  const actionRow = createElement('div', 'detail-badges');
  const action = createElement('button', 'button button-primary', '基于此需求提问');
  action.type = 'button';
  action.addEventListener('click', openCodex);
  const manualTask = createElement(
    'button',
    'button button-secondary',
    '记录产品专员任务',
  );
  manualTask.type = 'button';
  manualTask.addEventListener('click', openManualTaskDialog);
  actionRow.append(action, manualTask);
  actionSection.append(actionTitle, actionCopy, actionRow);

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
  text(
    query('#contextThread'),
    state.selectedRequirementContext?.thread?.threadId || '首次运行时创建',
  );
  renderDrawerArtifactOptions();
}

async function selectRequirement(id, { navigate = false } = {}) {
  const requirement = state.requirements.find(item => item.id === id);
  if (!requirement) return;
  const changedRequirement = state.selectedRequirementId !== id;
  state.selectedRequirementId = id;
  state.contextLoading = true;
  if (changedRequirement) {
    state.selectedRequirementContext = null;
    state.selectedArtifactPaths = new Set();
  }
  syncDrawerContext();
  renderRequirementTargets(visibleRequirements());
  renderRequirementDetail();
  if (navigate) activatePage('requirements');
  const context = await api(`/api/requirements/${encodeURIComponent(id)}/context`);
  if (state.selectedRequirementId !== id) return;
  state.selectedRequirementContext = context;
  state.contextLoading = false;
  if (changedRequirement || state.selectedArtifactPaths.size === 0) {
    state.selectedArtifactPaths = new Set(
      context.artifacts.map(artifact => artifact.path),
    );
  } else {
    const registeredPaths = new Set(context.artifacts.map(artifact => artifact.path));
    state.selectedArtifactPaths = new Set(
      [...state.selectedArtifactPaths].filter(path => registeredPaths.has(path)),
    );
  }
  syncDrawerContext();
  renderRequirementTargets(visibleRequirements());
  renderRequirementDetail();
}

function buildWorkflowRecord(title, detail) {
  const article = createElement('article', 'workflow-record-card');
  article.append(
    createElement('strong', '', title),
    createElement('span', '', detail),
  );
  return article;
}

function renderPersistedWorkflowRecords() {
  const candidates = state.requirementCandidates.map(item => buildWorkflowRecord(
    `${item.suggestedPriority} · ${item.title}`,
    `${item.evidence} · ${item.status || '待处理'}`,
  ));
  query('#requirementCandidates').replaceChildren(...(
    candidates.length ? candidates : [emptyState('尚无 Codex 整理后的需求候选')]
  ));

  const findings = state.reviewFindings.map(item => buildWorkflowRecord(
    `${item.severity} · ${item.category} · ${item.location}`,
    `${item.impact} · ${item.recommendation}`,
  ));
  query('#reviewFindings').replaceChildren(...(
    findings.length ? findings : [emptyState('尚无 Demo/PRD 评审发现')]
  ));

  const strategies = state.productStrategies.map(item => buildWorkflowRecord(
    item.essence,
    `${item.mainFlow} · ${item.feishuSummary}`,
  ));
  query('#productStrategies').replaceChildren(...(
    strategies.length ? strategies : [emptyState('尚无开发/测试产品策略')]
  ));
}

function render() {
  const requirements = visibleRequirements();
  const runs = visibleRuns();
  const manualTasks = visibleManualTasks();
  renderMetrics();
  renderRequirementTargets(requirements);
  renderRunTargets(runs);
  renderManualTasks(manualTasks);
  renderPersistedWorkflowRecords();
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
  state.codexTrigger = document.activeElement;
  syncDrawerContext();
  if (!drawer.open) drawer.showModal();
  requestAnimationFrame(() => {
    const target = state.selectedWorkflow ? query('#businessInput') : query('#prompt');
    target.focus();
  });
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
  state.requirementCandidates = Array.isArray(bootstrap.requirementCandidates)
    ? bootstrap.requirementCandidates
    : [];
  state.reviewFindings = Array.isArray(bootstrap.reviewFindings)
    ? bootstrap.reviewFindings
    : [];
  state.productStrategies = Array.isArray(bootstrap.productStrategies)
    ? bootstrap.productStrategies
    : [];
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
  if (state.selectedRequirementId) {
    await selectRequirement(state.selectedRequirementId);
  }
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

function selectWorkflow(type) {
  if (!Object.hasOwn(workflowLabels, type)) return;
  state.selectedWorkflow = type;
  for (const button of queryAll('[data-workflow]')) {
    const selected = button.dataset.workflow === type;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  const placeholders = {
    'feedback-triage': '粘贴用户、运营或三方反馈',
    'demo-prd-review': '可补充本次重点检查的业务规则',
    'issue-strategy': '粘贴开发问题或测试异常',
  };
  const help = {
    'feedback-triage': '反馈内容必填；结果会生成需求候选并进入规划中心。',
    'demo-prd-review': '业务规则可选；必须同时授权已登记的 Demo 与 PRD。',
    'issue-strategy': '开发问题或测试异常必填；结果会进入评审与验收。',
  };
  const businessInput = query('#businessInput');
  businessInput.placeholder = placeholders[type];
  businessInput.hidden = false;
  query('#businessInputLabel').hidden = false;
  text(query('#businessInputHelp'), help[type]);
  query('#freeformPromptLabel').hidden = true;
  query('#prompt').hidden = true;
  query('#useFreeformMode').hidden = false;
  text(query('#runModeLabel'), workflowLabels[type]);
  query('.workflow-result-section').hidden = true;
  query('#workflowResult').replaceChildren();
  updateSubmittingState(false);
  businessInput.focus();
}

function useFreeformMode({ focus = true } = {}) {
  state.selectedWorkflow = null;
  for (const button of queryAll('[data-workflow]')) {
    button.classList.remove('selected');
    button.setAttribute('aria-pressed', 'false');
  }
  query('#businessInputLabel').hidden = true;
  query('#businessInput').hidden = true;
  query('#freeformPromptLabel').hidden = false;
  query('#prompt').hidden = false;
  query('#useFreeformMode').hidden = true;
  text(query('#runModeLabel'), '自由任务');
  updateSubmittingState(false);
  if (focus) query('#prompt').focus();
}

function workflowInput(type, value) {
  if (type === 'feedback-triage') return { feedbackText: value };
  if (type === 'issue-strategy') return { issueText: value };
  return value ? { businessRules: value } : {};
}

function workflowResultRows(value) {
  const result = value?.result || {};
  if (value?.workflowType === 'feedback-triage') {
    return (result.candidates || []).map(item => ({
      title: `${item.suggestedPriority} · ${item.title}`,
      detail: item.evidence,
    }));
  }
  if (value?.workflowType === 'demo-prd-review') {
    return (result.findings || []).map(item => ({
      title: `${item.severity} · ${item.category} · ${item.location}`,
      detail: `${item.impact} · ${item.recommendation}`,
    }));
  }
  if (value?.workflowType === 'issue-strategy') {
    return [
      { title: '问题本质', detail: result.essence },
      { title: '主流程', detail: result.mainFlow },
      { title: '异常策略', detail: result.exceptionPolicy },
      { title: '边界策略', detail: result.boundaryPolicy },
      {
        title: '验收条件',
        detail: Array.isArray(result.acceptanceCriteria)
          ? result.acceptanceCriteria.join('；')
          : '',
      },
      { title: '飞书摘要', detail: result.feishuSummary },
    ];
  }
  return [];
}

function renderWorkflowResult(value) {
  const target = query('#workflowResult');
  const rows = workflowResultRows(value);
  const articles = rows.map(row => {
    const article = createElement('article');
    article.append(
      createElement('strong', '', row.title),
      createElement('span', '', row.detail || '未提供'),
    );
    return article;
  });
  target.replaceChildren(...(
    articles.length ? articles : [emptyState('工作流未返回可展示的结构化条目')]
  ));
  query('.workflow-result-section').hidden = false;
}

function updateSubmittingState(submitting) {
  const button = query('#startRun');
  if (submitting) button.dataset.submitting = 'true';
  else delete button.dataset.submitting;
  button.disabled = submitting
    || state.runs.some(run => activeRunStatuses.has(run.status));
  button.setAttribute('aria-busy', String(submitting));
  text(
    query('span', button),
    submitting
      ? '正在创建任务'
      : state.selectedWorkflow
        ? '运行所选工作流'
        : '开始只读任务',
  );
}

async function startRun() {
  const workflowType = state.selectedWorkflow;
  const prompt = query('#prompt').value.trim();
  const inputText = query('#businessInput').value.trim();
  const files = selectedArtifacts().map(artifact => artifact.path);

  if (workflowType && !state.selectedRequirementId) {
    text(query('#drawerMessage'), '请先选择需求后再运行产品工作流。');
    showToast('请先选择需求', true);
    return;
  }
  if (
    workflowType === 'feedback-triage'
    && !inputText
  ) {
    text(query('#drawerMessage'), '请先粘贴需要整理的反馈。');
    query('#businessInput').focus();
    return;
  }
  if (
    workflowType === 'issue-strategy'
    && !inputText
  ) {
    text(query('#drawerMessage'), '请先粘贴开发问题或测试异常。');
    query('#businessInput').focus();
    return;
  }
  if (workflowType === 'demo-prd-review') {
    const selectedKinds = new Set(selectedArtifacts().map(artifact => artifact.kind));
    if (!selectedKinds.has('Demo') || !selectedKinds.has('PRD')) {
      text(query('#drawerMessage'), '请同时选择当前需求已登记的 Demo 与 PRD。');
      query('#drawerArtifactOptions input:not(:checked)')?.focus();
      return;
    }
  }
  if (!workflowType && !prompt) {
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
  query('.workflow-result-section').hidden = true;
  query('#workflowResult').replaceChildren();

  try {
    const run = workflowType
      ? await api(`/api/workflows/${workflowType}/runs`, {
          method: 'POST',
          body: JSON.stringify({
            requirementId: state.selectedRequirementId,
            files,
            input: workflowInput(workflowType, inputText),
          }),
        })
      : await api('/api/runs', {
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
      try {
        if (payload.status === 'completed' && workflowType) {
          const result = await api(
            `/api/runs/${encodeURIComponent(run.id)}/workflow-result`,
          );
          renderWorkflowResult(result);
        } else if (payload.status === 'completed' && payload.result) {
          text(query('#streamOutput'), payload.result);
        }
        await refreshBootstrap();
      } catch (error) {
        text(query('#drawerMessage'), `结果读取失败：${error.message}`);
        showToast(error.message, true);
      } finally {
        updateSubmittingState(false);
      }
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
  query('#requirementCandidates').replaceChildren(emptyState('无法读取需求候选'));
  query('#reviewFindings').replaceChildren(emptyState('无法读取评审发现'));
  query('#productStrategies').replaceChildren(emptyState('无法读取产品策略'));
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
query('#workflowPicker').addEventListener('click', event => {
  const button = event.target.closest('[data-workflow]');
  if (button) selectWorkflow(button.dataset.workflow);
});
query('#useFreeformMode').addEventListener('click', () => useFreeformMode());

for (const button of queryAll('[data-prompt-template]')) {
  button.addEventListener('click', () => {
    useFreeformMode({ focus: false });
    query('#prompt').value = button.dataset.promptTemplate;
    query('#prompt').focus();
    text(query('#drawerMessage'), '已填入快捷任务，可继续编辑后提交。');
  });
}

for (const button of queryAll('[data-action="close-manual-task"]')) {
  button.addEventListener('click', () => query('#manualTaskDialog').close());
}

query('#manualTaskForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!state.selectedRequirementId) {
    text(query('#manualTaskMessage'), '请先选择需求。');
    return;
  }
  const submit = query('[type="submit"]', form);
  submit.disabled = true;
  submit.setAttribute('aria-busy', 'true');
  text(query('#manualTaskMessage'), '正在保存…');
  try {
    const created = await api('/api/manual-tasks', {
      method: 'POST',
      body: JSON.stringify({
        requirementId: state.selectedRequirementId,
        assigneeNote: query('#manualTaskAssignee').value,
        description: query('#manualTaskDescription').value.trim(),
        dueAt: query('#manualTaskDue').value || null,
        expectedDeliverable: query('#manualTaskDeliverable').value.trim(),
        currentNote: query('#manualTaskNote').value.trim(),
      }),
    });
    state.manualTasks = [created, ...state.manualTasks];
    form.reset();
    query('#manualTaskDialog').close();
    render();
    showToast('产品专员任务备注已保存');
  } catch (error) {
    text(query('#manualTaskMessage'), error.message);
  } finally {
    submit.disabled = false;
    submit.removeAttribute('aria-busy');
  }
});

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
  if (state.codexTrigger?.isConnected) state.codexTrigger.focus();
  else query('#askCodex').focus();
  state.codexTrigger = null;
});

query('#manualTaskDialog').addEventListener('close', () => {
  if (state.manualTaskTrigger?.isConnected) state.manualTaskTrigger.focus();
  state.manualTaskTrigger = null;
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

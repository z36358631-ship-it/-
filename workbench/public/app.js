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
  activeRunId: null,
  currentRunDetail: null,
  permission: 'read-only',
  detailPollTimer: null,
  detailPollGeneration: 0,
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
const retryableRunStatuses = new Set(['failed', 'cancelled', 'interrupted']);
const permissionLabels = {
  'read-only': '只读分析',
  'generate-candidate': '生成候选产物',
  'modify-existing': '修改已选产物',
};
const approvalKindLabels = new Map([
  ['file-change', '文件变化'],
  ['command', '命令请求'],
  ['file-delete', '文件删除'],
  ['out-of-scope-file', '目标外文件'],
]);
const validationStatusLabels = {
  passed: '通过',
  failed: '失败',
  skipped: '已跳过',
};
const validationNameLabels = {
  'target-integrity': '目标完整性',
  'unrelated-files': '非目标文件检查',
  'Codex validation': 'Codex 验证',
  'Broker restart conflict check': 'Broker 重启冲突检查',
  contract: '契约检查',
  visual: '视觉检查',
  optional: '可选检查',
};
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

function makeRunOpenable(element, run) {
  element.dataset.runId = run.id;
  element.tabIndex = 0;
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', `查看运行 ${run.id}：${runTitle(run)}`);
  const open = () => {
    openHistoricalRun(run).catch(error => {
      text(query('#drawerMessage'), error.message);
      showToast(error.message, true);
    });
  };
  element.addEventListener('click', open);
  element.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    open();
  });
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
  makeRunOpenable(card, run);
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
  makeRunOpenable(row, run);
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

function isSafeRelativeCandidatePath(value) {
  const normalized = String(value || '').trim().replaceAll('\\', '/');
  if (
    !normalized
    || normalized.includes('\0')
    || normalized.startsWith('/')
    || /^[a-zA-Z]:\//.test(normalized)
  ) {
    return false;
  }
  const segments = normalized.split('/');
  return segments.every(segment => segment && segment !== '.' && segment !== '..');
}

function permissionButtonLabel() {
  if (state.permission === 'generate-candidate') return '开始生成候选';
  if (state.permission === 'modify-existing') return '开始修改产物';
  return state.selectedWorkflow ? '运行所选工作流' : '开始只读任务';
}

function updatePermissionUi(permission, { preserveWorkflow = false } = {}) {
  if (!Object.hasOwn(permissionLabels, permission)) return;
  state.permission = permission;
  for (const input of queryAll('input[name="permission"]')) {
    input.checked = input.value === permission;
  }

  const readOnly = permission === 'read-only';
  const generating = permission === 'generate-candidate';
  if (!readOnly && !preserveWorkflow) useFreeformMode({ focus: false });
  query('#workflowPicker').disabled = !readOnly;
  query('#workflowPicker').closest('.drawer-section').classList.toggle(
    'is-disabled',
    !readOnly,
  );
  text(
    query('#runModeLabel'),
    readOnly
      ? workflowLabels[state.selectedWorkflow] || '自由任务'
      : '写入模式已禁用',
  );
  query('#authorizedFiles').hidden = generating;
  query('#candidateTargetLabel').hidden = !generating;
  query('#candidateTarget').hidden = !generating;

  const badge = query('#permissionBadge');
  badge.className = `permission-badge${
    generating
      ? ' is-generate'
      : permission === 'modify-existing'
        ? ' is-modify'
        : ''
  }`;
  text(badge, permissionLabels[permission]);
  text(query('#contextPermission'), permissionLabels[permission]);
  text(
    query('#drawerKicker'),
    readOnly ? 'READ-ONLY RUN' : 'CONTROLLED WRITE RUN',
  );
  text(
    query('#drawerSubtitle'),
    readOnly
      ? '把当前业务上下文交给本机 Codex 做只读分析。'
      : 'Codex 只能处理本次明确授权的目标，写入请求仍需逐项确认。',
  );
  const security = query('#permissionSecurityNote');
  security.classList.toggle('is-write', !readOnly);
  text(
    query('#permissionSecurityCopy'),
    readOnly
      ? '只读分析不会创建、修改、移动或删除文件。'
      : generating
        ? '只允许创建填写的新候选相对路径；它在成功后才登记为需求产物。'
        : '只允许修改本次勾选的登记产物；删除、命令和目标外请求不能批准。',
  );
  updateSubmittingState(Boolean(query('#startRun').dataset.submitting));
}

function resetRunDetail() {
  stopRunDetailPolling();
  state.activeRunId = null;
  state.currentRunDetail = null;
  text(query('#contextRunId'), '尚未创建');
  text(query('#drawerRunStatus'), '未执行');
  text(query('#runDetailStatus'), '等待选择运行');
  text(query('#runDetailMessage'), '');
  query('#runDetailSection').hidden = true;
  query('#approvalCards').replaceChildren();
  query('#fileChanges').replaceChildren();
  query('#validationResults').replaceChildren();
  updateRunControlButtons(null);
}

function openCodex() {
  const drawer = query('#codexDrawer');
  state.codexTrigger = document.activeElement;
  resetRunDetail();
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

async function openHistoricalRun(run) {
  state.codexTrigger = document.activeElement;
  stopRunDetailPolling();
  if (
    run.requirementId
    && state.requirements.some(item => item.id === run.requirementId)
  ) {
    await selectRequirement(run.requirementId);
  }
  updatePermissionUi(
    Object.hasOwn(permissionLabels, run.permission) ? run.permission : 'read-only',
  );
  state.activeRunId = run.id;
  text(query('#contextRunId'), run.id);
  text(query('#drawerRunStatus'), runLabels[run.status] || run.status);
  const drawer = query('#codexDrawer');
  if (!drawer.open) drawer.showModal();
  await renderRunDetail(run.id);
  if (activeRunStatuses.has(run.status)) scheduleRunDetailPoll(run.id);
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
  if (state.permission !== 'read-only' || !Object.hasOwn(workflowLabels, type)) return;
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

function diffNode(change) {
  const pre = createElement('pre', 'diff');
  pre.setAttribute('aria-label', `${change.path || '文件'}的差异`);
  const rawDiff = typeof change.diff === 'string' ? change.diff : '';
  const lines = rawDiff
    ? rawDiff.split(/\r?\n/)
    : [
        `二进制或无文本差异：${change.kind || 'changed'}`,
        `before ${change.beforeHash || '无'}`,
        `after ${change.afterHash || '无'}`,
      ];
  for (const line of lines) {
    const span = createElement('span', '', line || ' ');
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
      span.className = 'meta';
    } else if (line.startsWith('+')) {
      span.className = 'add';
    } else if (line.startsWith('-')) {
      span.className = 'remove';
    }
    pre.append(span);
  }
  return pre;
}

function approvalGuidance(kind) {
  if (kind === 'command') return '命令请求不能批准；只能拒绝。';
  if (kind === 'file-delete') return '删除请求不能批准；只能拒绝。';
  if (kind === 'out-of-scope-file') {
    return '目标不在本 Run 授权清单中；只能拒绝，并在重新选择目标后重启任务。';
  }
  if (kind !== 'file-change') return '此类请求不能批准；只能拒绝。';
  return '';
}

function buildApprovalCard(item) {
  const card = createElement('article', 'approval-card');
  const top = createElement('div', 'approval-card-top');
  const kindLabel = approvalKindLabels.get(item.kind) || '未知请求';
  top.append(
    createElement('strong', '', `${kindLabel}（${item.kind || 'unknown'}）`),
    buildStatusPill(item.status || 'pending', item.status === 'pending' ? '待确认' : item.status),
  );
  const paths = Array.isArray(item.payload?.paths) ? item.payload.paths : [];
  card.append(
    top,
    createElement('p', '', `原始摘要：${item.summary || '无摘要'}`),
    createElement(
      'p',
      '',
      paths.length ? `目标：${paths.join('、')}` : '未提供可批准的文件目标',
    ),
  );

  const actions = createElement('div', 'approval-card-actions');
  const approve = createElement('button', 'button button-primary', '允许本次文件变化');
  const reject = createElement('button', 'button button-secondary', '拒绝');
  approve.type = 'button';
  reject.type = 'button';
  const pending = item.status === 'pending';
  const approvable = pending && item.kind === 'file-change';
  approve.disabled = !approvable;
  reject.disabled = !pending;
  if (!pending) approve.textContent = item.status === 'approved' ? '已允许' : '已拒绝';
  if (pending && !approvable) {
    approve.className = 'button button-locked';
    approve.textContent = '已锁定：不可允许';
  }
  approve.addEventListener('click', () => {
    decideApproval(item.id, 'approved').catch(error => {
      text(query('#runDetailMessage'), error.message);
    });
  });
  reject.addEventListener('click', () => {
    decideApproval(item.id, 'rejected').catch(error => {
      text(query('#runDetailMessage'), error.message);
    });
  });
  actions.append(approve, reject);
  card.append(actions);
  const guidance = approvalGuidance(item.kind);
  if (guidance) card.append(createElement('span', 'approval-guidance', guidance));
  return card;
}

function buildChangeCard(item) {
  const card = createElement('article', 'change-card');
  const top = createElement('div', 'change-card-top');
  top.append(
    createElement('strong', '', `${item.kind || 'changed'} · ${item.path || '未知文件'}`),
    buildStatusPill(item.restoredAt ? 'completed' : 'pending', item.restoredAt ? '已恢复' : '未恢复'),
  );
  card.append(top, diffNode(item));
  return card;
}

function buildValidationCard(item) {
  const card = createElement(
    'article',
    `validation-card is-${item.status || 'skipped'}`,
  );
  const top = createElement('div', 'validation-card-top');
  const rawName = item.name || 'unnamed';
  const rawStatus = item.status || 'skipped';
  const nameLabel = validationNameLabels[rawName] || rawName;
  const statusLabel = validationStatusLabels[rawStatus] || rawStatus;
  top.append(
    createElement(
      'strong',
      '',
      nameLabel === rawName ? rawName : `${nameLabel}（${rawName}）`,
    ),
    buildStatusPill(
      rawStatus === 'passed'
        ? 'completed'
        : rawStatus === 'failed'
          ? 'failed'
          : 'pending',
      `${statusLabel}（${rawStatus}）`,
    ),
  );
  card.append(top, createElement('p', '', item.detail || '无补充信息'));
  return card;
}

function updateRunControlButtons(detail) {
  query('[data-action="cancel-run"]').disabled = !detail
    || !activeRunStatuses.has(detail.status);
  query('[data-action="retry-run"]').disabled = !detail
    || !retryableRunStatuses.has(detail.status);
  const fileChanges = Array.isArray(detail?.fileChanges) ? detail.fileChanges : [];
  query('[data-action="restore-run"]').disabled = !detail
    || activeRunStatuses.has(detail.status)
    || fileChanges.length === 0
    || fileChanges.every(item => item.restoredAt);
}

function renderRunDetailValue(detail) {
  if (!detail || typeof detail !== 'object') return null;
  const approvals = Array.isArray(detail.approvals) ? detail.approvals : [];
  const fileChanges = Array.isArray(detail.fileChanges) ? detail.fileChanges : [];
  const validations = Array.isArray(detail.validations) ? detail.validations : [];
  state.currentRunDetail = { ...detail, approvals, fileChanges, validations };
  state.runs = state.runs.map(run => (
    run.id === detail.id ? { ...run, ...detail } : run
  ));
  text(query('#contextRunId'), detail.id || state.activeRunId);
  text(query('#drawerRunStatus'), runLabels[detail.status] || detail.status || '状态未知');
  text(
    query('#runDetailStatus'),
    detail.status === 'waiting-approval'
      ? '等待我确认'
      : runLabels[detail.status] || detail.status || '状态未知',
  );
  query('#runDetailSection').hidden = false;
  query('#approvalCards').replaceChildren(...(
    approvals.length
      ? approvals.map(buildApprovalCard)
      : [emptyState('当前没有等待确认的请求')]
  ));
  query('#fileChanges').replaceChildren(...(
    fileChanges.length
      ? fileChanges.map(buildChangeCard)
      : [emptyState('当前没有已记录的文件变化')]
  ));
  query('#validationResults').replaceChildren(...(
    validations.length
      ? validations.map(buildValidationCard)
      : [emptyState('当前没有验证结果')]
  ));
  updateRunControlButtons(state.currentRunDetail);
  if (!activeRunStatuses.has(detail.status)) stopRunDetailPolling();
  return state.currentRunDetail;
}

async function renderRunDetail(runId) {
  const detail = await api(`/api/runs/${encodeURIComponent(runId)}`);
  if (state.activeRunId !== runId) return detail;
  return renderRunDetailValue(detail);
}

async function decideApproval(id, decision) {
  if (!state.activeRunId) return;
  await api(`/api/approvals/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
  text(
    query('#runDetailMessage'),
    decision === 'approved' ? '已允许本次文件变化。' : '已拒绝请求。',
  );
  await renderRunDetail(state.activeRunId);
}

function stopRunDetailPolling() {
  state.detailPollGeneration += 1;
  if (state.detailPollTimer !== null) {
    window.clearTimeout(state.detailPollTimer);
    state.detailPollTimer = null;
  }
}

function scheduleRunDetailPoll(runId) {
  stopRunDetailPolling();
  const generation = state.detailPollGeneration;
  const poll = async () => {
    state.detailPollTimer = null;
    if (
      generation !== state.detailPollGeneration
      || state.activeRunId !== runId
      || !query('#codexDrawer').open
    ) {
      return;
    }
    try {
      const detail = await renderRunDetail(runId);
      if (
        generation !== state.detailPollGeneration
        || !detail
        || !activeRunStatuses.has(detail.status)
      ) {
        return;
      }
    } catch (error) {
      text(query('#runDetailMessage'), `刷新 Run 详情失败：${error.message}`);
    }
    if (generation === state.detailPollGeneration) {
      state.detailPollTimer = window.setTimeout(poll, 700);
    }
  };
  state.detailPollTimer = window.setTimeout(poll, 700);
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
      : permissionButtonLabel(),
  );
}

function watchRunEvents(run, workflowType = run.workflowType || null) {
  if (state.activeEvents) state.activeEvents.close();
  let settled = false;
  const events = new EventSource(
    `/api/runs/${encodeURIComponent(run.id)}/events?token=${encodeURIComponent(state.token)}`,
  );
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
    events.close();
    if (state.activeEvents === events) state.activeEvents = null;
    stopRunDetailPolling();
    text(query('#drawerRunStatus'), runLabels[payload.status] || payload.status || '运行结束');
    text(query('#streamConnectionState'), '事件已保存');
    text(
      query('#drawerMessage'),
      payload.status === 'completed'
        ? run.permission === 'read-only'
          ? '只读任务已完成，结果已保存。'
          : '受控写入任务已完成，请检查文件变化与验证结果。'
        : `任务结束：${payload.error || runLabels[payload.status] || '状态未知'}`,
    );
    try {
      if (state.activeRunId === run.id) await renderRunDetail(run.id);
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
    if (state.activeEvents === events) state.activeEvents = null;
    text(query('#drawerRunStatus'), '连接中断');
    text(query('#streamConnectionState'), '详情仍在轮询');
    text(query('#drawerMessage'), '事件连接已中断；Run 详情仍会从 Broker 刷新。');
    updateSubmittingState(false);
  };
}

async function startRun() {
  const permission = state.permission;
  const workflowType = permission === 'read-only' ? state.selectedWorkflow : null;
  const prompt = query('#prompt').value.trim();
  const inputText = query('#businessInput').value.trim();
  const files = selectedArtifacts().map(artifact => artifact.path);
  const candidateTarget = query('#candidateTarget').value.trim().replaceAll('\\', '/');

  if ((workflowType || permission !== 'read-only') && !state.selectedRequirementId) {
    text(query('#drawerMessage'), '请先选择需求后再开始任务。');
    showToast('请先选择需求', true);
    return;
  }
  if (workflowType === 'feedback-triage' && !inputText) {
    text(query('#drawerMessage'), '请先粘贴需要整理的反馈。');
    query('#businessInput').focus();
    return;
  }
  if (workflowType === 'issue-strategy' && !inputText) {
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
    text(
      query('#drawerMessage'),
      permission === 'read-only' ? '请输入任务描述后再开始。' : '请输入写入任务后再开始。',
    );
    query('#prompt').focus();
    return;
  }
  if (permission === 'generate-candidate') {
    if (!isSafeRelativeCandidatePath(candidateTarget)) {
      text(query('#drawerMessage'), '请输入不含绝对路径、空段或上级目录的新候选相对路径。');
      query('#candidateTarget').focus();
      return;
    }
    if (state.artifacts.some(artifact => artifact.path === candidateTarget)) {
      text(query('#drawerMessage'), '该路径已经登记；生成候选必须使用一个新的相对路径。');
      query('#candidateTarget').focus();
      return;
    }
  }
  if (permission === 'modify-existing' && files.length === 0) {
    text(query('#drawerMessage'), '请至少勾选一个需要修改的登记产物。');
    query('#drawerArtifactOptions input')?.focus();
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
  stopRunDetailPolling();
  state.activeRunId = null;
  state.currentRunDetail = null;
  updateSubmittingState(true);
  text(
    query('#drawerMessage'),
    permission === 'read-only'
      ? '正在创建持久化 Run 与只读 Codex 会话。'
      : '正在创建受控写入 Run、目标快照与隔离暂存区。',
  );
  text(query('#drawerRunStatus'), '正在创建');
  text(query('#contextRunId'), '正在创建');
  query('#streamSection').hidden = false;
  query('#streamEvents').replaceChildren();
  text(query('#streamOutput'), '');
  text(query('#streamConnectionState'), '连接准备中');
  query('#runDetailSection').hidden = true;
  query('.workflow-result-section').hidden = true;
  query('#workflowResult').replaceChildren();

  try {
    let run;
    if (permission !== 'read-only') {
      run = await api('/api/runs/write', {
        method: 'POST',
        body: JSON.stringify({
          requirementId: state.selectedRequirementId,
          prompt,
          permission,
          targets: permission === 'generate-candidate' ? [candidateTarget] : files,
        }),
      });
    } else if (workflowType) {
      run = await api(`/api/workflows/${workflowType}/runs`, {
        method: 'POST',
        body: JSON.stringify({
          requirementId: state.selectedRequirementId,
          files,
          input: workflowInput(workflowType, inputText),
        }),
      });
    } else {
      run = await api('/api/runs', {
        method: 'POST',
        body: JSON.stringify({
          requirementId: state.selectedRequirementId,
          prompt,
          files,
        }),
      });
    }

    state.activeRunId = run.id;
    state.runs = [run, ...state.runs.filter(item => item.id !== run.id)];
    render();
    text(query('#contextRunId'), run.id);
    text(query('#drawerRunStatus'), runLabels[run.status] || '执行中');
    text(query('#contextThread'), run.threadId || '等待 App Server 返回');
    text(query('#drawerMessage'), '任务已创建，正在接收持久化事件与安全详情。');
    text(query('#streamConnectionState'), '实时连接中');
    appendStreamEvent('Run 已创建', run.id);
    updateRunControlButtons({
      ...run,
      approvals: [],
      fileChanges: [],
      validations: [],
    });
    renderRunDetail(run.id).catch(error => {
      text(query('#runDetailMessage'), `首次读取 Run 详情失败：${error.message}`);
    });
    scheduleRunDetailPoll(run.id);
    watchRunEvents(run, workflowType);
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

async function cancelActiveRun() {
  if (!state.activeRunId) return;
  const button = query('[data-action="cancel-run"]');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  text(query('#runDetailMessage'), '正在取消当前 Run…');
  try {
    await api(`/api/runs/${encodeURIComponent(state.activeRunId)}/cancel`, {
      method: 'POST',
    });
    await renderRunDetail(state.activeRunId);
    text(query('#runDetailMessage'), '当前 Run 已取消。');
  } catch (error) {
    text(query('#runDetailMessage'), error.message);
  } finally {
    button.removeAttribute('aria-busy');
  }
}

async function retryActiveRun() {
  if (!state.activeRunId) return;
  const button = query('[data-action="retry-run"]');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  text(query('#runDetailMessage'), '正在基于持久化上下文创建重试 Run…');
  try {
    const next = await api(`/api/runs/${encodeURIComponent(state.activeRunId)}/retry`, {
      method: 'POST',
    });
    stopRunDetailPolling();
    if (state.activeEvents) state.activeEvents.close();
    state.activeRunId = next.id;
    state.currentRunDetail = null;
    state.runs = [next, ...state.runs.filter(run => run.id !== next.id)];
    updatePermissionUi(
      Object.hasOwn(permissionLabels, next.permission) ? next.permission : 'read-only',
    );
    text(query('#contextRunId'), next.id);
    text(query('#drawerRunStatus'), runLabels[next.status] || next.status);
    text(query('#runDetailMessage'), '重试 Run 已创建。');
    query('#streamSection').hidden = false;
    query('#streamEvents').replaceChildren();
    text(query('#streamOutput'), '');
    appendStreamEvent('重试 Run 已创建', next.id);
    renderRunDetail(next.id).catch(error => {
      text(query('#runDetailMessage'), error.message);
    });
    scheduleRunDetailPoll(next.id);
    watchRunEvents(next, next.workflowType || null);
    render();
  } catch (error) {
    text(query('#runDetailMessage'), error.message);
  } finally {
    button.removeAttribute('aria-busy');
    updateRunControlButtons(state.currentRunDetail);
  }
}

async function restoreActiveRun() {
  if (!state.activeRunId) return;
  const confirmed = window.confirm(
    '只恢复本 Run 明确记录的文件；若文件后来被修改，将停止恢复。继续吗？',
  );
  if (!confirmed) return;
  const button = query('[data-action="restore-run"]');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  text(query('#runDetailMessage'), '正在恢复本 Run 的明确文件变化…');
  try {
    const result = await api(`/api/runs/${encodeURIComponent(state.activeRunId)}/restore`, {
      method: 'POST',
    });
    const restored = Array.isArray(result.restored) ? result.restored : [];
    text(
      query('#runDetailMessage'),
      restored.length ? `已恢复：${restored.join('、')}` : '没有需要恢复的文件。',
    );
    showToast(restored.length ? '本 Run 的文件变化已恢复' : '没有需要恢复的文件');
    await refreshBootstrap();
    await renderRunDetail(state.activeRunId);
  } catch (error) {
    text(
      query('#runDetailMessage'),
      `恢复已停止：${error.message}。请检查当前文件差异。`,
    );
    showToast(error.message, true);
  } finally {
    button.removeAttribute('aria-busy');
    updateRunControlButtons(state.currentRunDetail);
  }
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
query('#permissionPicker').addEventListener('change', event => {
  if (event.target.name === 'permission') updatePermissionUi(event.target.value);
});
query('#workflowPicker').addEventListener('click', event => {
  const button = event.target.closest('[data-workflow]');
  if (button) selectWorkflow(button.dataset.workflow);
});
query('#useFreeformMode').addEventListener('click', () => useFreeformMode());
query('[data-action="cancel-run"]').addEventListener('click', () => {
  cancelActiveRun().catch(error => text(query('#runDetailMessage'), error.message));
});
query('[data-action="retry-run"]').addEventListener('click', () => {
  retryActiveRun().catch(error => text(query('#runDetailMessage'), error.message));
});
query('[data-action="restore-run"]').addEventListener('click', () => {
  restoreActiveRun().catch(error => text(query('#runDetailMessage'), error.message));
});

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
  stopRunDetailPolling();
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
updatePermissionUi('read-only', { preserveWorkflow: true });

try {
  await refreshBootstrap();
} catch (error) {
  showBootstrapError(error);
}

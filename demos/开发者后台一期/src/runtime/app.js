window.GameHubDemo = window.GameHubDemo || {};

(function startApplication(namespace) {
  const c = namespace.components;
  const validRoles = new Set(['developer', 'operations', 'tester']);
  const validStates = new Set(['default', 'loading', 'empty', 'error', 'permission']);
  const memory = {
    page: Object.create(null),
    result: Object.create(null),
    upload: Object.create(null),
    business: Object.create(null),
    shell: { helpOpen: false, scrollTop: 0 },
  };
  const root = document.getElementById('app');
  const parseJson = id => JSON.parse(document.getElementById(id).textContent);
  const moduleConfig = parseJson('demo-module');
  const routes = parseJson('demo-routes');
  const fixture = parseJson('demo-fixture');
  const modules = parseJson('demo-modules');
  const isOverview = root.dataset.overview === 'true';

  if (isOverview) {
    root.innerHTML = namespace.shell.renderOverview({ modules, routes });
    return;
  }

  const fallbackPage = route => ({
    summary: `${route.title}的业务内容正在准备中。`,
    status: '待完善',
    primaryAction: '继续',
    sections: [{ title: '页面说明', items: ['一期范围', '页面内存状态', '刷新后恢复初始演示数据'] }],
    states: ['default', 'loading', 'empty', 'error', 'permission'],
  });
  const parseLocation = () => {
    const raw = location.hash.replace(/^#\/?/, '');
    const [routePart, queryPart = ''] = raw.split('?');
    const requested = routes.find(item => item.id === routePart);
    const route = requested || routes.find(item => item.id === moduleConfig.defaultRoute) || routes[0];
    const query = new URLSearchParams(queryPart);
    const requestedRole = query.get('role');
    const role = validRoles.has(requestedRole) ? requestedRole : route.role;
    const requestedState = query.get('state');
    let state = validStates.has(requestedState) ? requestedState : 'default';
    if (role !== route.role) state = 'permission';
    return { route, role, state };
  };
  const navigate = ({ routeId, role, state }) => {
    const current = parseLocation();
    const nextRoute = routes.find(route => route.id === routeId) || current.route;
    location.hash = namespace.shell.hashFor(nextRoute, role || current.role, state || 'default');
  };
  const resultMessage = (routeId, title, detail, variant = 'success') => {
    memory.result[routeId] = { title, detail, variant };
    const target = root.querySelector('[data-runtime-result]');
    if (target) target.innerHTML = c.resultStrip(memory.result[routeId]);
  };
  const primaryDestination = routeId => ({
    'P01-02': 'P01-04', 'P01-04': 'P01-05', 'P01-05': 'P01-06', 'P01-07': 'P01-03',
    'P01-08': 'P01-09', 'P01-09': 'P01-10',
    'P02-01': 'P02-02', 'P02-03': 'P02-04',
    'P03-01': 'P03-02', 'P03-02': 'P03-03', 'P03-03': 'P03-04',
    'P03-06': 'P03-07', 'P03-07': 'P03-08', 'P03-09': 'P03-10', 'P03-11': 'P03-12',
    'P04-01': 'P04-02', 'P04-02': 'P04-03', 'P04-04': 'P04-05', 'P04-05': 'P04-06', 'P04-06': 'P04-07', 'P04-07': 'P04-08',
  }[routeId]);
  const primaryBusinessAction = routeId => ({
    'P01-06': 'download-sdk',
    'P01-08': 'send-password-setup',
    'P03-13': 'resume-download',
  }[routeId]);
  const variantForStatus = status => {
    if (/已下架|已结束|失败|已作废|已撤销/.test(status)) return 'danger';
    if (/暂停|待|排期/.test(status)) return 'warning';
    return 'success';
  };
  const setStatusTag = (tag, status) => {
    if (!tag) return;
    tag.textContent = status;
    tag.dataset.variant = variantForStatus(status);
  };
  const setSummaryStatus = (label, status) => {
    const item = Array.from(root.querySelectorAll('.task-summary > div')).find(node => node.querySelector(':scope > span')?.textContent.trim() === label);
    setStatusTag(item?.querySelector('.status-tag'), status);
  };
  const setGateStatus = (label, status) => {
    const item = Array.from(root.querySelectorAll('.gate-item')).find(node => node.querySelector('strong')?.textContent.trim() === label);
    setStatusTag(item?.querySelector('.status-tag'), status);
  };
  const setActionDisabled = (action, disabled) => {
    root.querySelectorAll(`[data-demo-action="${action}"]`).forEach(control => {
      control.disabled = disabled;
      control.setAttribute('aria-disabled', String(disabled));
    });
  };
  const toggleHelp = open => {
    const workspace = root.querySelector('.workspace');
    const pageWrap = root.querySelector('.page-wrap');
    const help = root.querySelector('[data-help-center]');
    if (!workspace || !pageWrap || !help) return;
    if (open) memory.shell.scrollTop = workspace.scrollTop || 0;
    memory.shell.helpOpen = open;
    pageWrap.hidden = open;
    help.hidden = !open;
    if (!open) workspace.scrollTop = memory.shell.scrollTop;
  };
  const setCdkeyTab = (routeId, index, remember = true) => {
    const nextIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
    if (remember) memory.page[routeId] = { ...(memory.page[routeId] || {}), cdkeyTab: nextIndex };
    root.querySelectorAll('[data-cdkey-panel]').forEach((panel, panelIndex) => { panel.hidden = panelIndex !== nextIndex; });
    root.querySelectorAll('[data-component="Tabs"][data-variant="task"] [role="tab"]').forEach((tab, tabIndex) => {
      const active = tabIndex === nextIndex;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
  };
  const demoSecret = () => {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return `demo_${Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')}`;
  };
  const renderMemoryRecords = records => {
    const timeline = root.querySelector('.timeline');
    if (!timeline) return;
    timeline.querySelectorAll('[data-memory-record]').forEach(node => node.remove());
    records.slice().reverse().forEach(record => {
      timeline.insertAdjacentHTML('afterbegin', `<li class="timeline-item" data-memory-record><div class="timeline-title">${c.escapeHtml(record)}</div><div class="timeline-meta number">当前页面内存记录</div></li>`);
    });
  };
  const applyBusinessState = routeId => {
    const state = memory.business[routeId];
    if (!state) return;
    if (routeId === 'P03-13') {
      if (state.download) { setSummaryStatus('下载开关', state.download); setGateStatus('下载能力', state.download); }
      if (state.launch) { setSummaryStatus('启动开关', state.launch); setGateStatus('启动能力', state.launch); }
      if (state.game) setGateStatus('游戏发布状态', state.game);
      if (state.download === '允许下载') {
        setActionDisabled('resume-download', true);
        root.querySelectorAll('[data-primary-action]').forEach(control => { control.disabled = true; control.setAttribute('aria-disabled', 'true'); });
      }
      if (state.game === '已下架') setActionDisabled('unpublish-game', true);
    }
    renderMemoryRecords(state.records || []);
  };
  const updateBusinessState = (routeId, patch, record) => {
    const previous = memory.business[routeId] || { records: [] };
    memory.business[routeId] = { ...previous, ...patch, records: [...(previous.records || []), record] };
    applyBusinessState(routeId);
  };
  const handleBusinessAction = (routeId, action) => {
    const requireReason = (selector, label) => {
      const field = root.querySelector(selector);
      if (field?.value.trim()) {
        field.removeAttribute('aria-invalid');
        return true;
      }
      field?.setAttribute('aria-invalid', 'true');
      field?.focus();
      resultMessage(routeId, `请先填写${label}`, '说明问题现象、处置依据和影响范围后再执行。', 'warning');
      return false;
    };
    if (routeId === 'P03-13' && action === 'resume-download') {
      if (!requireReason('.disposition-form textarea', '处置原因')) return true;
      updateBusinessState(routeId, { download: '允许下载' }, '恢复下载 · 门禁校验通过');
      resultMessage(routeId, '下载已恢复', '当前线上版本已允许新增下载；刷新后恢复 Fixture。');
      return true;
    }
    if (routeId === 'P03-13' && action === 'pause-launch') {
      if (!requireReason('.disposition-form textarea', '处置原因')) return true;
      updateBusinessState(routeId, { launch: '启动暂停' }, '暂停启动 · 影响已安装玩家');
      resultMessage(routeId, '启动已暂停', '新的启动请求已停止，处置记录已写入当前页面内存。', 'warning');
      return true;
    }
    if (routeId === 'P03-13' && action === 'unpublish-game') {
      if (!requireReason('.disposition-form textarea', '处置原因')) return true;
      updateBusinessState(routeId, { game: '已下架' }, '下架游戏 · 保留版本与历史记录');
      resultMessage(routeId, '游戏已下架', '版本文件、测试和发布历史未删除。', 'danger');
      return true;
    }
    return false;
  };

  const bindInteractions = ({ route, role, state }) => {
    const routeSelect = root.querySelector('[data-review-route]');
    const roleSelect = root.querySelector('[data-review-role]');
    const stateSelect = root.querySelector('[data-review-state]');
    routeSelect?.addEventListener('change', event => navigate({ routeId: event.target.value, role, state: 'default' }));
    roleSelect?.addEventListener('change', event => navigate({ routeId: route.id, role: event.target.value, state: 'default' }));
    stateSelect?.addEventListener('change', event => navigate({ routeId: route.id, role, state: event.target.value }));

    root.querySelectorAll('[data-demo-action]').forEach(control => control.addEventListener('click', event => {
      const action = event.currentTarget.dataset.demoAction;
      if (!action || event.currentTarget.disabled) return;
      if (action === 'reset-demo') { location.reload(); return; }
      if (action === 'gamehub-login' || action === 'password-login') {
        const showQr = action === 'gamehub-login';
        const password = root.querySelector('[data-password-login]');
        const qr = root.querySelector('[data-gamehub-qr]');
        if (password) password.hidden = showQr;
        if (qr) qr.hidden = !showQr;
        (showQr ? qr?.querySelector('[data-demo-action="confirm-gamehub-login"]') : password?.querySelector('input'))?.focus();
        return;
      }
      if (action === 'refresh-qr') {
        const status = root.querySelector('[data-qr-status]');
        const countdown = root.querySelector('[data-qr-countdown]');
        if (status) status.textContent = '二维码已刷新，请在盖世游戏中确认授权';
        if (countdown) countdown.textContent = '02:00';
        resultMessage(route.id, '二维码已刷新', '旧授权请求立即失效，新请求仍绑定当前浏览器会话。', 'info');
        return;
      }
      if (action === 'confirm-gamehub-login') {
        const status = root.querySelector('[data-qr-status]');
        if (status) status.textContent = '已扫码并授权成功，正在创建独立平台账号';
        resultMessage(route.id, '盖世授权成功', '首次授权已原子创建独立 account_id；下一步提交开发者注册资料。');
        setTimeout(() => navigate({ routeId: 'P01-03', role: 'developer', state: 'default' }), 180);
        return;
      }
      if (action === 'forgot-password') { resultMessage(route.id, '已提交密码找回', '无论账号是否存在均返回相同结果；请检查已验证邮箱。', 'info'); return; }
      if (action === 'open-help') { toggleHelp(true); return; }
      if (action === 'close-help') { toggleHelp(false); return; }
      if (action === 'toggle-faq') {
        const answer = event.currentTarget.nextElementSibling;
        const expanded = event.currentTarget.getAttribute('aria-expanded') === 'true';
        event.currentTarget.setAttribute('aria-expanded', String(!expanded));
        const mark = event.currentTarget.querySelector('[aria-hidden="true"]');
        if (mark) mark.textContent = expanded ? '＋' : '−';
        if (answer) answer.hidden = expanded;
        return;
      }
      if (action === 'cdkey-tab') {
        setCdkeyTab(route.id, Number(event.currentTarget.dataset.tabIndex));
        return;
      }
      const cdkeyRestriction = {
        'review-quota-exceeded': { reason: '剩余配额不足，当前申请需要 2000 个 Key。', quota: '0', disabled: true, scenario: 'quota-exceeded', status: '授权正常', pausedReason: '—' },
        'review-channel-denied': { reason: '渠道 A 不在当前游戏白名单内。', quota: '8000', disabled: true, scenario: 'channel-denied', status: '授权正常', pausedReason: '—' },
        'review-publishing-paused': { reason: '平台已暂停当前游戏的发行授权。', quota: '8000', disabled: true, scenario: 'publishing-paused', status: '发行暂停', pausedReason: '授权风控复核中' },
        'review-generation-failed': { reason: '下一次创建将展示生成失败且不扣减配额。', quota: '8000', disabled: false, scenario: 'generation-failed', status: '授权正常', pausedReason: '—' },
      }[action];
      if (cdkeyRestriction) {
        const frame = root.querySelector('.product-frame');
        if (frame) frame.dataset.cdkeyScenario = cdkeyRestriction.scenario;
        const quota = root.querySelector('[data-authorization-quota] .number');
        const authStatus = root.querySelector('[data-authorization-status] .status-tag');
        const pausedReason = root.querySelector('[data-authorization-paused] strong');
        if (quota) quota.textContent = cdkeyRestriction.quota;
        setStatusTag(authStatus, cdkeyRestriction.status);
        if (pausedReason) pausedReason.textContent = cdkeyRestriction.pausedReason;
        root.querySelector('[data-restriction-reason]')?.remove();
        root.querySelector('[data-cdkey-authorization]')?.insertAdjacentHTML('afterend', `<div class="result-strip" data-restriction-reason data-variant="warning"><div><strong>${c.escapeHtml(cdkeyRestriction.reason)}</strong><span>这是评审场景，不修改真实授权。</span></div><button type="button" data-restriction-help>查看帮助</button></div>`);
        root.querySelector('[data-restriction-help]')?.addEventListener('click', () => toggleHelp(true));
        setActionDisabled('create-key-batch', cdkeyRestriction.disabled);
        return;
      }
      if (action === 'create-key-batch') {
        const target = root.querySelector('[data-key-batch-result]');
        if (!target) { resultMessage(route.id, '创建 Key 批次入口已打开', '正式流程将校验计划、渠道和额度，并仅提供一次性明文下载。', 'info'); return; }
        target.innerHTML = '<div class="one-time-result" data-key-batch-generating><strong>生成中</strong><span>正在按当前授权范围校验配额并生成盖世平台 Key。</span></div>';
        setActionDisabled('create-key-batch', true);
        setTimeout(() => {
          if (root.querySelector('.product-frame')?.dataset.cdkeyScenario === 'generation-failed') {
            target.innerHTML = '<div class="result-strip" data-variant="danger"><div><strong>生成失败</strong><span>演示服务异常，未生成半批次且未扣减配额。</span></div></div>';
            setActionDisabled('create-key-batch', false);
            return;
          }
          target.innerHTML = `<div class="one-time-result" data-one-time-key-download><strong>批次生成成功</strong><span>演示下载文件：KEY-20260902-NEW.csv；有效窗口内下载失败可重试，成功后不能再次查看明文。</span><div class="form-actions">${c.button({ label: '模拟下载失败', action: 'simulate-key-download-failure' })}${c.button({ label: '模拟一次性下载成功', variant: 'primary', action: 'acknowledge-key-download' })}</div></div>`;
          target.querySelector('[data-demo-action="simulate-key-download-failure"]')?.addEventListener('click', () => {
            resultMessage(route.id, '下载失败', '一次性有效窗口仍未关闭，可在当前页面重试。', 'warning');
          });
          target.querySelector('[data-demo-action="acknowledge-key-download"]')?.addEventListener('click', clickEvent => {
            clickEvent.currentTarget.closest('[data-one-time-key-download]')?.remove();
            resultMessage(route.id, '一次性下载窗口已关闭', '再次进入只显示批次号、数量、状态和审计记录。', 'warning');
          });
          resultMessage(route.id, 'Key 批次已创建', '2000 个盖世平台 Key 已进入一次性下载窗口。');
        }, 300);
        return;
      }
      if (action === 'create-api-credential' || action === 'rotate-api-credential') {
        const target = root.querySelector('[data-credential-result]');
        if (!target) { resultMessage(route.id, '创建渠道凭据入口已打开', 'Secret 仅在创建结果中展示一次，凭据不得扩大预授权范围。', 'info'); return; }
        target.innerHTML = `<div class="one-time-result" data-one-time-secret><strong>client_secret 仅显示一次</strong><code>${c.escapeHtml(demoSecret())}</code>${c.button({ label: '我已保存', variant: 'primary', action: 'acknowledge-secret' })}</div>`;
        target.querySelector('[data-demo-action="acknowledge-secret"]')?.addEventListener('click', clickEvent => {
          clickEvent.currentTarget.closest('[data-one-time-secret]')?.remove();
          resultMessage(route.id, 'Secret 已隐藏', '后续只显示末四位；遗失时必须轮换。', 'warning');
        });
        resultMessage(route.id, action === 'create-api-credential' ? '渠道凭据已创建' : '渠道凭据已轮换', action === 'create-api-credential' ? '本次关闭后只显示末四位。' : '旧 Secret 已失效；本次关闭后只显示末四位。');
        return;
      }
      if (['pause-api-credential', 'revoke-api-credential', 'pause-key-batch', 'void-key-batch'].includes(action)) {
        updateBusinessState(route.id, { lastCdkeyAction: action }, `${action} · 仅写入当前页面内存审计`);
        const keyStatus = root.querySelector('[data-cdkey-panel="batches"] .status-tag');
        const credentialStatus = root.querySelector('[data-cdkey-panel="credentials"] .status-tag');
        if (action === 'pause-key-batch') setStatusTag(keyStatus, '已暂停');
        if (action === 'void-key-batch') setStatusTag(keyStatus, '已作废');
        if (action === 'pause-api-credential') setStatusTag(credentialStatus, '已暂停');
        if (action === 'revoke-api-credential') setStatusTag(credentialStatus, '已撤销');
        resultMessage(route.id, '状态已更新', '历史审计和已交付记录继续保留。', action.includes('revoke') || action.includes('void') ? 'danger' : 'warning');
        return;
      }
      if (action === 'api-doc-section') {
        const apiTarget = event.currentTarget.dataset.apiTarget;
        if (apiTarget) root.querySelector(`#${apiTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else resultMessage(route.id, '接口说明入口已打开', '渠道 API 使用 HMAC-SHA256、request_id 幂等与分配确认机制。', 'info');
        return;
      }
      if (action === 'filter-api-error') {
        resultMessage(route.id, `错误码：${event.currentTarget.textContent.trim()}`, '已定位对应错误说明；不发起真实请求。', 'info');
        return;
      }
      if (action === 'copy-api-example') {
        const example = root.querySelector('.code-block code')?.textContent || '';
        if (!navigator.clipboard?.writeText) {
          resultMessage(route.id, '复制失败', '当前浏览器未授予剪贴板权限，请手动选择示例文本。', 'warning');
          return;
        }
        navigator.clipboard.writeText(example)
          .then(() => resultMessage(route.id, '示例已复制', '仅写入当前浏览器剪贴板。'))
          .catch(() => resultMessage(route.id, '复制失败', '当前浏览器未授予剪贴板权限，请手动选择示例文本。', 'warning'));
        return;
      }
      if (action === 'retry-state' || action === 'default-state') {
        const allowed = routes.find(item => item.role === role) || routes.find(item => item.id === moduleConfig.defaultRoute) || routes[0];
        navigate({ routeId: state === 'permission' ? allowed.id : route.id, role, state: 'default' });
        return;
      }
      if (action === 'login') { navigate({ routeId: 'P01-02', role: 'developer', state: 'default' }); return; }
      if (action.startsWith('primary-')) {
        if (route.id === 'P04-03') {
          const cdkeyModule = modules.find(item => item.id === '02');
          if (cdkeyModule) location.href = `${cdkeyModule.output}#/P02-01?role=developer&state=default`;
          return;
        }
        const businessAction = primaryBusinessAction(route.id);
        if (businessAction && handleBusinessAction(route.id, businessAction)) return;
        const destination = primaryDestination(route.id);
        if (destination) navigate({ routeId: destination, role, state: 'default' });
        else resultMessage(route.id, '操作已记录', '当前页面的演示状态已更新，刷新后恢复初始数据。');
        return;
      }
      if (handleBusinessAction(route.id, action)) return;
      if (action === 'record-offline-result') { resultMessage(route.id, '线下结果已保存', '结果、原因、审核人、时间和提交快照已写入当前页面内存审计。'); return; }
      if (action === 'rollback-release') {
        updateBusinessState(route.id, { pointer: '0.9.0' }, '回滚历史 Build · 三组 Release Pointer 原子切换');
        resultMessage(route.id, '回滚配置已提交', '三组 OS／架构 Pointer 已切换到 0.9.0；历史 Build、Manifest 与 Chunk 均保留。', 'warning');
        return;
      }
      if (action === 'create-campaign') { resultMessage(route.id, 'Campaign 已创建', '已生成唯一 campaign_id 与 UTM 追踪链接；不触发自动广告投放。'); return; }
      if (action === 'submit-resource-request') { resultMessage(route.id, '资源需求已提交', '已生成新修订并进入处理中；该状态不代表资源承诺。', 'info'); return; }
      if (action === 'generate-export') {
        const target = root.querySelector('[data-export-result]');
        if (target) target.innerHTML = '<div class="one-time-result"><strong>聚合文件生成成功</strong><span>export_demo_001 · 120 行 · XLSX／CSV；下载地址短期有效。</span></div>';
        resultMessage(route.id, '聚合文件已生成', '文件复用 query_snapshot_demo_20260903，未包含用户、订单、设备或 Key 明文。');
        return;
      }
      if (action === 'download-sdk') { resultMessage(route.id, 'SDK 下载已准备', '演示不下载真实文件；三系统 SDK 版本和 SHA-256 校验值保持可追溯。', 'info'); return; }
      if (action === 'open-sdk-docs') { resultMessage(route.id, '接入文档入口已检查', '正式环境将打开受控 Google Docs；离线 Demo 不发起远程请求。', 'info'); return; }
      if (action === 'send-password-setup') { resultMessage(route.id, '密码设置邮件已发送', '仅向已验证邮箱发送；不会创建第二个 account_id。', 'info'); return; }
      if (action === 'save-draft') {
        const now = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
        memory.page[route.id] = { savedAt: now };
        root.querySelectorAll('[data-save-state]').forEach(node => { node.textContent = `最近保存：${now}（仅当前页面内存）`; });
        resultMessage(route.id, '草稿已保存', '不会自动保存；刷新页面后恢复 Fixture。');
        return;
      }
      if (action === 'approve') { resultMessage(route.id, '审核已通过', '结果仅用于本次演示，刷新后恢复。'); return; }
      if (action === 'reject') { resultMessage(route.id, '已驳回并记录原因', '请开发者修改后重新提交。', 'danger'); return; }
      if (action === 'start-upload') {
        memory.upload[route.id] = 'uploading';
        const bar = root.querySelector('[data-upload-progress]');
        const label = root.querySelector('[data-upload-label]');
        if (bar) bar.style.width = '82%';
        if (label) label.textContent = '上传中 82%，已完成分片正在校验';
        resultMessage(route.id, '分片上传已开始', '不会读取或上传真实文件。', 'info');
        return;
      }
      if (action === 'interrupt-upload') {
        memory.upload[route.id] = 'interrupted';
        const label = root.querySelector('[data-upload-label]');
        if (label) label.textContent = '网络中断，已完成分片保留，可继续上传';
        resultMessage(route.id, '上传已中断', '已完成分片已保留，请在页面内继续。', 'warning');
        return;
      }
      if (action === 'retry-upload') {
        memory.upload[route.id] = 'verified';
        const bar = root.querySelector('[data-upload-progress]');
        const label = root.querySelector('[data-upload-label]');
        if (bar) bar.style.width = '100%';
        if (label) label.textContent = '分片已全部上传，完整性校验通过';
        resultMessage(route.id, '继续上传完成', '包体完整性校验通过。');
        return;
      }
      if (action === 'test-pass') {
        root.querySelectorAll('.choice-card').forEach(node => node.classList.remove('is-selected'));
        event.currentTarget.closest('.choice-card')?.classList.add('is-selected');
        resultMessage(route.id, '已选择测试通过', '提交后将生成不可覆盖的历史记录。', 'info');
        return;
      }
      if (action === 'submit-test-result') { resultMessage(route.id, '测试结果已提交', '历史结果不可覆盖，开发者可查看处理记录。'); return; }
      if (action === 'schedule-release' || action === 'release-now') {
        const scheduled = action === 'schedule-release';
        root.querySelectorAll('.publish-option').forEach(node => node.classList.toggle('is-active', node.dataset.demoAction === action));
        const scheduleField = root.querySelector('[data-schedule-field]');
        const scheduleInput = scheduleField?.querySelector('input');
        scheduleField?.classList.toggle('is-disabled', !scheduled);
        if (scheduleInput) {
          scheduleInput.disabled = !scheduled;
          scheduleInput.setAttribute('aria-disabled', String(!scheduled));
          if (!scheduled) scheduleInput.value = '';
        }
        root.querySelectorAll('[data-release-submit], [data-primary-action]').forEach(control => {
          control.dataset.demoAction = action;
          const label = control.querySelector('span');
          if (label) label.textContent = scheduled ? '定时发布' : '立即发布';
        });
        resultMessage(route.id, action === 'schedule-release' ? '已选择定时发布' : '已选择立即发布', '运营发布前仍需通过全部门禁；失败时保持原线上版本。', 'warning');
        return;
      }
      if (action === 'add-target-rule') { event.currentTarget.classList.toggle('is-active'); resultMessage(route.id, '包含规则已更新', '仅使用已确认的地区、语言、设备／系统和平台行为标签。', 'info'); return; }
      if (action === 'exclude-rule') { event.currentTarget.classList.toggle('is-excluded'); resultMessage(route.id, '排除规则已更新', '规则未保存到服务端，刷新后恢复。', 'info'); return; }
      if (action === 'dashboard-range') {
        event.currentTarget.parentElement?.querySelectorAll('.gh-button').forEach(node => node.dataset.variant = node === event.currentTarget ? 'primary' : 'secondary');
        resultMessage(route.id, '时间范围已切换', '图表仍使用 T+1 聚合演示数据。', 'info');
        return;
      }
      if (action === 'tab') {
        event.currentTarget.parentElement.querySelectorAll('.tab').forEach(node => { node.classList.toggle('is-active', node === event.currentTarget); node.setAttribute('aria-selected', String(node === event.currentTarget)); });
        return;
      }
      if (action.startsWith('page-')) { resultMessage(route.id, '列表位置已记住', '页码、筛选和滚动位置只在当前页面内存中保留。', 'info'); return; }
      const destination = primaryDestination(route.id);
      if (event.currentTarget.hasAttribute('data-primary-action') && destination) { navigate({ routeId: destination, role, state: 'default' }); return; }
      resultMessage(route.id, '演示操作已完成', '此操作仅修改当前页面内存，刷新后恢复。');
    }));
  };

  const render = () => {
    const { route, role, state } = parseLocation();
    const page = fixture.pages?.[route.id] || fallbackPage(route);
    const content = namespace.templates.render({ route, page, state });
    root.innerHTML = namespace.shell.renderBusiness({ module: moduleConfig, routes, route, page, fixture, role, state, content });
    if (memory.result[route.id] && state === 'default') {
      const target = root.querySelector('[data-runtime-result]');
      if (target) target.innerHTML = c.resultStrip(memory.result[route.id]);
    }
    if (memory.page[route.id]?.savedAt) root.querySelectorAll('[data-save-state]').forEach(node => { node.textContent = `最近保存：${memory.page[route.id].savedAt}（仅当前页面内存）`; });
    applyBusinessState(route.id);
    bindInteractions({ route, role, state });
    if (route.id === 'P02-01' && state === 'default') setCdkeyTab(route.id, memory.page[route.id]?.cdkeyTab || 0, false);
  };

  addEventListener('hashchange', render);
  render();
})(window.GameHubDemo);

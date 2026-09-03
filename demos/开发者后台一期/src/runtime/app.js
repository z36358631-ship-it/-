window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};

(function startApplication(namespace) {
  const c = namespace.components;
  const memory = {
    page: Object.create(null),
    result: Object.create(null),
    upload: Object.create(null),
    business: Object.create(null),
    shell: { helpOpen: false, scrollTop: 0 },
  };
  const root = document.getElementById('app');
  const parseJson = id => JSON.parse(document.getElementById(id).textContent);
  const moduleConfig = parseJson('portal-module');
  const routes = parseJson('portal-routes');
  const portalData = parseJson('portal-data');
  const modules = parseJson('portal-modules');
  const fallbackPage = route => ({
    summary: `${namespace.shell.publicTitle(route)}暂时无法加载，请稍后重试。`,
    status: '加载失败',
    primaryAction: '重试',
  });
  const parseLocation = () => {
    const raw = location.hash.replace(/^#\/?/, '');
    const [routePart, queryPart = ''] = raw.split('?');
    const requested = routes.find(item => item.id === routePart);
    const route = requested || routes.find(item => item.id === moduleConfig.defaultRoute) || routes[0];
    const query = new URLSearchParams(queryPart);
    const role = route.role;
    const state = 'default';
    const requestedTab = Number(query.get('tab'));
    const cdkeyTab = Number.isInteger(requestedTab) && requestedTab >= 0 && requestedTab <= 3 ? requestedTab : null;
    return { route, role, state, cdkeyTab };
  };
  const navigate = ({ routeId, state }) => {
    const current = parseLocation();
    const nextRoute = routes.find(route => route.id === routeId) || current.route;
    location.hash = namespace.shell.hashFor(nextRoute, nextRoute.role, state || 'default');
  };
  const resultMessage = (routeId, title, detail, variant = 'success') => {
    memory.result[routeId] = { title, detail, variant };
    const target = root.querySelector('[data-runtime-result]');
    if (target) target.innerHTML = c.resultStrip(memory.result[routeId]);
  };
  const primaryDestination = routeId => ({
    'P01-02': 'P01-04', 'P01-04': 'P01-05', 'P01-05': 'P01-06', 'P01-07': 'P01-03',
    'P01-08': 'P01-09', 'P01-09': 'P01-10',
    'P02-03': 'P02-04',
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
    root.querySelectorAll(`[data-portal-action="${action}"]`).forEach(control => {
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
  const createSecret = () => {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return `sec_${Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')}`;
  };
  const downloadTextFile = (fileName, content, type = 'text/plain;charset=utf-8') => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const openCdkeyTab = index => {
    const targetModule = modules.find(item => item.id === '02');
    if (!targetModule) return;
    location.href = `${targetModule.output}#/P02-01?tab=${index}`;
  };
  const renderMemoryRecords = records => {
    const timeline = root.querySelector('.timeline');
    if (!timeline) return;
    timeline.querySelectorAll('[data-memory-record]').forEach(node => node.remove());
    records.slice().reverse().forEach(record => {
      timeline.insertAdjacentHTML('afterbegin', `<li class="timeline-item" data-memory-record><div class="timeline-title">${c.escapeHtml(record)}</div><div class="timeline-meta number">刚刚</div></li>`);
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
      resultMessage(routeId, '下载已恢复', '当前线上版本已允许新增下载，处置记录已保存。');
      return true;
    }
    if (routeId === 'P03-13' && action === 'pause-launch') {
      if (!requireReason('.disposition-form textarea', '处置原因')) return true;
      updateBusinessState(routeId, { launch: '启动暂停' }, '暂停启动 · 影响已安装玩家');
      resultMessage(routeId, '启动已暂停', '新的启动请求已停止，处置记录已保存。', 'warning');
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
    root.querySelectorAll('[data-portal-action]').forEach(control => control.addEventListener('click', event => {
      const action = event.currentTarget.dataset.portalAction;
      if (!action || event.currentTarget.disabled) return;
      if (action === 'gamehub-login' || action === 'password-login') {
        const showQr = action === 'gamehub-login';
        const password = root.querySelector('[data-password-login]');
        const qr = root.querySelector('[data-gamehub-qr]');
        if (password) password.hidden = showQr;
        if (qr) qr.hidden = !showQr;
        (showQr ? qr?.querySelector('[data-portal-action="refresh-qr"]') : password?.querySelector('input'))?.focus();
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
      if (route.id === 'P02-05') {
        const targetTab = { 'create-key-batch': 1, 'create-api-credential': 2, 'api-doc-section': 3 }[action];
        if (Number.isInteger(targetTab)) { openCdkeyTab(targetTab); return; }
      }
      if (action === 'create-key-batch') {
        const target = root.querySelector('[data-key-batch-result]');
        if (!target) { openCdkeyTab(1); return; }
        target.innerHTML = '<div class="one-time-result" data-key-batch-generating><strong>生成中</strong><span>正在按当前授权范围校验配额并生成盖世平台 Key。</span></div>';
        setActionDisabled('create-key-batch', true);
        setTimeout(() => {
          const fileName = 'KEY-20260903-002.csv';
          target.innerHTML = `<div class="one-time-result" data-one-time-key-download><strong>批次生成成功</strong><span>${fileName}；请在当前有效窗口内完成一次性下载，成功后不能再次查看 Key 明文。</span><div class="form-actions">${c.button({ label: '下载 CSV', variant: 'primary', action: 'download-key-csv' })}</div></div>`;
          target.querySelector('[data-portal-action="download-key-csv"]')?.addEventListener('click', clickEvent => {
            downloadTextFile(fileName, 'key,batch_id,game_id,sku_id\nGH-7Q4M-9K2P-X8LW,KEY-20260903-002,GAME-48291,SKU-CN-001\n', 'text/csv;charset=utf-8');
            clickEvent.currentTarget.closest('[data-one-time-key-download]')?.remove();
            resultMessage(route.id, 'CSV 已下载', '一次性下载窗口已关闭，后续仅保留批次信息和审计记录。');
          });
          resultMessage(route.id, 'Key 批次已创建', '2000 个盖世平台 Key 已进入一次性下载窗口。');
        }, 300);
        return;
      }
      if (action === 'create-api-credential' || action === 'rotate-api-credential') {
        const target = root.querySelector('[data-credential-result]');
        if (!target) { openCdkeyTab(2); return; }
        target.innerHTML = `<div class="one-time-result" data-one-time-secret><strong>client_secret 仅显示一次</strong><code>${c.escapeHtml(createSecret())}</code>${c.button({ label: '我已保存', variant: 'primary', action: 'acknowledge-secret' })}</div>`;
        target.querySelector('[data-portal-action="acknowledge-secret"]')?.addEventListener('click', clickEvent => {
          clickEvent.currentTarget.closest('[data-one-time-secret]')?.remove();
          resultMessage(route.id, 'Secret 已隐藏', '后续只显示末四位；遗失时必须轮换。', 'warning');
        });
        resultMessage(route.id, action === 'create-api-credential' ? '渠道凭据已创建' : '渠道凭据已轮换', action === 'create-api-credential' ? '本次关闭后只显示末四位。' : '旧 Secret 已失效；本次关闭后只显示末四位。');
        return;
      }
      if (['pause-api-credential', 'revoke-api-credential', 'pause-key-batch', 'void-key-batch'].includes(action)) {
        const recordLabel = {
          'pause-api-credential': '暂停渠道凭据',
          'revoke-api-credential': '撤销渠道凭据',
          'pause-key-batch': '暂停 Key 批次',
          'void-key-batch': '作废未分配库存',
        }[action];
        updateBusinessState(route.id, { lastCdkeyAction: action }, `${recordLabel} · 状态更新成功`);
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
        resultMessage(route.id, `错误码：${event.currentTarget.textContent.trim()}`, '已定位对应错误说明。', 'info');
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
        navigate({ routeId: state === 'permission' ? allowed.id : route.id, state: 'default' });
        return;
      }
      if (action === 'login') {
        const fields = [...root.querySelectorAll('[data-password-login] input')];
        const missing = fields.find(field => !field.value.trim());
        if (missing) {
          missing.focus();
          resultMessage(route.id, '请完成登录信息', '请输入账号和密码后继续。', 'warning');
          return;
        }
        navigate({ routeId: 'P01-02', state: 'default' });
        return;
      }
      if (action.startsWith('primary-')) {
        if (route.id === 'P02-01') { setCdkeyTab(route.id, 1); return; }
        if (route.id === 'P04-03') {
          const cdkeyModule = modules.find(item => item.id === '02');
          if (cdkeyModule) location.href = `${cdkeyModule.output}#/P02-01`;
          return;
        }
        const businessAction = primaryBusinessAction(route.id);
        if (businessAction && handleBusinessAction(route.id, businessAction)) return;
        const destination = primaryDestination(route.id);
        if (destination) navigate({ routeId: destination, state: 'default' });
        else resultMessage(route.id, '操作已完成', '最新状态已保存。');
        return;
      }
      if (handleBusinessAction(route.id, action)) return;
      if (action === 'record-offline-result') { resultMessage(route.id, '线下结果已保存', '结果、原因、审核人、时间和提交快照已写入审计记录。'); return; }
      if (action === 'rollback-release') {
        updateBusinessState(route.id, { pointer: '0.9.0' }, '回滚历史 Build · 三组 Release Pointer 原子切换');
        resultMessage(route.id, '回滚配置已提交', '三组 OS／架构 Pointer 已切换到 0.9.0；历史 Build、Manifest 与 Chunk 均保留。', 'warning');
        return;
      }
      if (action === 'create-campaign') { resultMessage(route.id, 'Campaign 已创建', '已生成唯一 campaign_id 与 UTM 追踪链接；不触发自动广告投放。'); return; }
      if (action === 'submit-resource-request') { resultMessage(route.id, '资源需求已提交', '已生成新修订并进入处理中；该状态不代表资源承诺。', 'info'); return; }
      if (action === 'generate-export') {
        const target = root.querySelector('[data-export-result]');
        if (target) target.innerHTML = '<div class="one-time-result"><strong>聚合文件生成成功</strong><span>EXP-20260903-001 · 120 行 · XLSX／CSV；下载地址短期有效。</span></div>';
        resultMessage(route.id, '聚合文件已生成', '文件复用 QRY-20260903-001，未包含用户、订单、设备或 Key 明文。');
        return;
      }
      if (action === 'download-sdk') { resultMessage(route.id, 'SDK 下载已开始', '请在下载完成后核对版本与 SHA-256 校验值。', 'info'); return; }
      if (action === 'open-sdk-docs') { resultMessage(route.id, '接入文档已打开', '仅已授权的开发者账号可以访问接入文档。', 'info'); return; }
      if (action === 'send-password-setup') { resultMessage(route.id, '密码设置邮件已发送', '仅向已验证邮箱发送；不会创建第二个 account_id。', 'info'); return; }
      if (action === 'save-draft') {
        const now = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
        memory.page[route.id] = { savedAt: now };
        root.querySelectorAll('[data-save-state]').forEach(node => { node.textContent = `最近保存：${now}`; });
        resultMessage(route.id, '草稿已保存', '提交审核前可继续修改。');
        return;
      }
      if (action === 'approve') { resultMessage(route.id, '审核已通过', '审核结果已保存并写入处理记录。'); return; }
      if (action === 'reject') { resultMessage(route.id, '已驳回并记录原因', '请开发者修改后重新提交。', 'danger'); return; }
      if (action === 'start-upload') {
        memory.upload[route.id] = 'uploading';
        const bar = root.querySelector('[data-upload-progress]');
        const label = root.querySelector('[data-upload-label]');
        if (bar) bar.style.width = '82%';
        if (label) label.textContent = '上传中 82%，已完成分片正在校验';
        resultMessage(route.id, '分片上传已开始', '已创建本次上传任务，可在当前页面查看进度。', 'info');
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
        root.querySelectorAll('.publish-option').forEach(node => node.classList.toggle('is-active', node.dataset.portalAction === action));
        const scheduleField = root.querySelector('[data-schedule-field]');
        const scheduleInput = scheduleField?.querySelector('input');
        scheduleField?.classList.toggle('is-disabled', !scheduled);
        if (scheduleInput) {
          scheduleInput.disabled = !scheduled;
          scheduleInput.setAttribute('aria-disabled', String(!scheduled));
          if (!scheduled) scheduleInput.value = '';
        }
        root.querySelectorAll('[data-release-submit], [data-primary-action]').forEach(control => {
          control.dataset.portalAction = action;
          const label = control.querySelector('span');
          if (label) label.textContent = scheduled ? '定时发布' : '立即发布';
        });
        resultMessage(route.id, action === 'schedule-release' ? '已选择定时发布' : '已选择立即发布', '运营发布前仍需通过全部门禁；失败时保持原线上版本。', 'warning');
        return;
      }
      if (action === 'add-target-rule') { event.currentTarget.classList.toggle('is-active'); resultMessage(route.id, '包含规则已更新', '仅使用已确认的地区、语言、设备／系统和平台行为标签。', 'info'); return; }
      if (action === 'exclude-rule') { event.currentTarget.classList.toggle('is-excluded'); resultMessage(route.id, '排除规则已更新', '请保存配置后继续预估人群。', 'info'); return; }
      if (action === 'dashboard-range') {
        event.currentTarget.parentElement?.querySelectorAll('[data-dashboard-range]').forEach(node => node.dataset.variant = node === event.currentTarget ? 'primary' : 'secondary');
        resultMessage(route.id, '时间范围已切换', '指标、趋势和明细已按所选范围更新。', 'info');
        return;
      }
      if (action === 'dashboard-filter') {
        event.currentTarget.parentElement?.querySelectorAll('[data-dashboard-filter]').forEach(node => node.dataset.variant = node === event.currentTarget ? 'primary' : 'secondary');
        resultMessage(route.id, '筛选条件已更新', '指标、趋势和明细已同步刷新。', 'info');
        return;
      }
      if (action === 'tab') {
        event.currentTarget.parentElement.querySelectorAll('.tab').forEach(node => { node.classList.toggle('is-active', node === event.currentTarget); node.setAttribute('aria-selected', String(node === event.currentTarget)); });
        return;
      }
      if (action.startsWith('page-')) { resultMessage(route.id, '列表已更新', '筛选条件和页码保持不变。', 'info'); return; }
      const destination = primaryDestination(route.id);
      if (event.currentTarget.hasAttribute('data-primary-action') && destination) { navigate({ routeId: destination, state: 'default' }); return; }
      resultMessage(route.id, '操作已完成', '最新状态已保存。');
    }));
  };

  const render = () => {
    const { route, role, state, cdkeyTab } = parseLocation();
    const page = portalData.pages?.[route.id] || fallbackPage(route);
    const content = namespace.templates.render({ route, page, state });
    root.innerHTML = namespace.shell.renderBusiness({ module: moduleConfig, routes, route, page, portalData, role, state, content });
    if (memory.result[route.id] && state === 'default') {
      const target = root.querySelector('[data-runtime-result]');
      if (target) target.innerHTML = c.resultStrip(memory.result[route.id]);
    }
    if (memory.page[route.id]?.savedAt) root.querySelectorAll('[data-save-state]').forEach(node => { node.textContent = `最近保存：${memory.page[route.id].savedAt}`; });
    applyBusinessState(route.id);
    bindInteractions({ route, role, state });
    if (route.id === 'P02-01' && state === 'default') setCdkeyTab(route.id, cdkeyTab ?? memory.page[route.id]?.cdkeyTab ?? 0, false);
  };

  addEventListener('hashchange', render);
  render();
})(window.GameHubDeveloperPortal);

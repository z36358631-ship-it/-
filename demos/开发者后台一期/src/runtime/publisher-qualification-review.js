/* P01 资质审核：与游戏上架审核独立的申请队列。 */
(function (global) {
  'use strict';

  const statusText = { reviewing: '待审核', supplement_required: '需补充材料', approved: '已通过', rejected: '已驳回', withdrawn: '已撤销' };
  const relationshipText = { self_owned: '自研且自有全部权利', agent: '代理发行', co_publish: '联合发行', third_party_ip: '使用第三方 IP' };
  const actionText = { submitted: '已提交', resubmitted: '补件后重提', supplement_required: '要求补件', approved: '审核通过', rejected: '审核驳回', withdrawn: '开发者撤销' };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const time = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
  const field = (label, value, wide = false) => `<div class="pgr-field${wide ? ' pgr-wide' : ''}"><dt>${esc(label)}</dt><dd>${esc(value || '—')}</dd></div>`;
  const fileName = file => file?.name || file?.fileName || '未命名文件';
  const files = (label, values) => {
    const items = Array.isArray(values) ? values : [];
    if (!items.length) return '';
    return `<section class="pgr-files-section"><h3>${esc(label)}<small>${items.length} 个文件</small></h3><div class="pgr-files">${items.map(file => `<article class="pgr-file"><div><strong>${esc(fileName(file))}</strong><small>${esc(file.type || file.blob?.type || '')} · ${((file.size || file.blob?.size || 0) / 1024 / 1024).toFixed(2)} MB</small></div></article>`).join('')}</div></section>`;
  };
  const errorText = error => ({
    'reason-required': '请填写明确的驳回或补件原因。',
    'reason-too-long': '处理原因不能超过 2000 字。',
    'already-reviewed': '此资质申请已被处理，已刷新最新状态。',
    'application-conflict': '申请状态已变化，已刷新最新状态。',
    'application-missing': '资质申请不存在，请返回列表刷新。',
    'approval-incomplete': '资质材料存在缺项或授权范围不完整，不能通过。',
  }[error?.message] || '处理失败，原状态和审核意见已保留，请重试。');

  const issueList = row => Object.values(global.PublisherGameQualifications.validateApplication(row.snapshot, row.context)).map(code => global.PublisherGameQualifications.text('zh', code) || code);
  const selectedRows = state => {
    const keyword = String(state.keyword || '').trim().toLocaleLowerCase();
    return (state.rows || []).filter(row => !state.status || row.status === state.status).filter(row => !keyword || `${row.projectName} ${row.gameKey} ${row.versionId}`.toLocaleLowerCase().includes(keyword));
  };

  function listView(state) {
    const rows = selectedRows(state);
    return `<section class="publisher-game-review" data-qualification-review data-qualification-review-list>
      <div class="pgr-filter"><label>搜索游戏或版本号<input type="search" value="${esc(state.keyword)}" data-qualification-review-keyword placeholder="输入游戏名称、Game ID 或资质版本"></label><label>审核状态<select data-qualification-review-status><option value="">全部状态</option>${Object.entries(statusText).map(([key, label]) => `<option value="${key}"${state.status === key ? ' selected' : ''}>${label}</option>`).join('')}</select></label><button type="button" class="pgr-button" data-qualification-review-refresh>刷新</button></div>
      <p class="pgr-error" data-qualification-review-error>${esc(state.error || '')}</p>
      ${rows.length ? `<div class="table-scroll"><table><thead><tr><th>游戏</th><th>资质版本</th><th>权利关系</th><th>发行范围</th><th>提交时间</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map(row => `<tr data-qualification-review-row="${esc(row.id)}"><td><strong>${esc(row.projectName)}</strong><small>${esc(row.gameKey)}</small></td><td>${esc(row.versionId)}</td><td>${esc(relationshipText[row.snapshot?.rightsRelationship] || row.snapshot?.rightsRelationship)}</td><td>${row.context?.mode === 'domestic' ? '中国大陆' : `全球服（不含中国大陆）· ${(row.context?.territoryCodes || []).length} 个地区`}</td><td>${esc(time(row.submittedAt))}</td><td><span class="pgr-tag pgr-tag--${esc(row.status)}">${esc(statusText[row.status] || row.status)}</span></td><td><button type="button" class="pgr-link" data-qualification-review-open="${esc(row.id)}">查看审核</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="pgr-empty"><strong>暂无匹配的资质申请</strong><p>可调整搜索条件或审核状态。</p></div>`}
    </section>`;
  }

  function detailView(state, row) {
    const snapshot = row.snapshot || {};
    const authorization = snapshot.authorization || {};
    const domestic = snapshot.domestic || {};
    const issues = issueList(row);
    const canReview = row.status === 'reviewing';
    const resultClass = row.status === 'rejected' || row.status === 'supplement_required' ? ' pgr-result--rejected' : row.status === 'withdrawn' ? ' pgr-result--withdrawn' : '';
    return `<section class="publisher-game-review" data-qualification-review data-qualification-review-detail="${esc(row.id)}">
      <header class="pgr-detail-header"><div><button type="button" class="pgr-back" data-qualification-review-back>← 返回资质申请</button><h1>${esc(row.projectName)}</h1><p>${esc(row.gameKey)} · ${esc(row.versionId)} · 提交于 ${esc(time(row.submittedAt))}</p></div><span class="pgr-tag pgr-tag--${esc(row.status)}">${esc(statusText[row.status] || row.status)}</span></header>
      <p class="pgr-error" data-qualification-review-error>${esc(state.error || '')}</p>
      <div class="pgr-detail-layout"><main>
        <section class="pgr-panel"><h2>适用范围</h2><dl class="pgr-fields">${field('发行范围', row.context?.mode === 'domestic' ? '中国大陆' : '全球服（不含中国大陆）')}${field('国家／地区', (row.context?.territoryCodes || []).join('、'))}${field('发行平台', (row.context?.platforms || []).join('、'))}${field('计划生效时间', time(row.context?.effectiveAt))}${field('权利关系', relationshipText[snapshot.rightsRelationship] || snapshot.rightsRelationship)}${field('权利及合规声明', snapshot.rightsDeclarationAccepted ? '已确认' : '未确认')}</dl></section>
        ${snapshot.rightsRelationship !== 'self_owned' ? `<section class="pgr-panel" data-qualification-review-authorization><h2>发行授权及 IP 权利证明</h2><dl class="pgr-fields">${field('授权方', authorization.grantor)}${field('被授权方', authorization.grantee)}${field('授权类型', authorization.authorizationType)}${field('授权平台', (authorization.platforms || []).join('、'))}${field('授权地区', (authorization.territoryCodes || []).join('、'), true)}${field('授权期限', `${authorization.startsAt || '—'} 至 ${authorization.endsAt || '—'}`)}${field('商业化范围', authorization.commercializationScope)}${field('转授权范围', authorization.sublicensingScope)}</dl>${files('授权链材料', authorization.files)}</section>` : ''}
        ${row.context?.mode === 'domestic' ? `<section class="pgr-panel" data-qualification-review-domestic><h2>国内服 PC 资质</h2><dl class="pgr-fields">${field('游戏版号', domestic.licenseNumber)}${field('联网方式', domestic.networkMode === 'online' ? '提供联网游戏服务' : domestic.networkMode === 'offline' ? '离线单机' : '')}${field('软件著作权登记号', domestic.copyrightNumber)}${field('ICP 核准情况', ({ approved: '已核准', not_approved: '暂未核准', not_applicable: '不适用' })[domestic.icpStatus])}${field('防沉迷要求', domestic.antiAddictionAcknowledged ? '已知悉' : '未确认')}${field('游戏防沉迷方案', domestic.gameAntiAddiction === 'connected' ? '已接入' : '暂未接入')}${field('国家防沉迷实名验证系统', domestic.nationalRealName === 'connected' ? '已接入' : '暂未接入')}</dl>${files('版号扫描件（选填）', domestic.publicationApprovalFiles)}${files('软件著作权证明', domestic.copyrightFiles)}${files('ICP 核准证明', domestic.icpFiles)}${files('安全评估报告', domestic.safetyAssessmentFiles)}</section>` : ''}
      </main><aside>
        <section class="pgr-panel"><h2>审核处理</h2>${issues.length ? `<div class="pgr-issues" data-qualification-review-issues>系统校验发现 ${issues.length} 项问题：<ul>${issues.map(issue => `<li>${esc(issue)}</li>`).join('')}</ul></div>` : '<p class="pgr-local-note">结构化字段、文件格式及授权覆盖范围校验已通过。</p>'}
          ${canReview ? `<label class="pgr-reason">审核意见<span>驳回或要求补件时必填</span><textarea rows="5" maxlength="2000" data-qualification-review-reason>${esc(state.reason || '')}</textarea></label><div class="pgr-actions"><button type="button" class="pgr-button" data-qualification-review-decision="supplement_required">需补充材料</button><button type="button" class="pgr-button pgr-button--danger" data-qualification-review-decision="rejected">驳回</button><button type="button" class="pgr-button pgr-button--primary" data-qualification-review-decision="approved"${issues.length ? ' disabled' : ''}>通过</button></div>` : `<div class="pgr-result${resultClass}" data-qualification-review-result><strong>${esc(statusText[row.status] || row.status)}</strong>${row.reason ? `<p>${esc(row.reason)}</p>` : ''}<small>${esc(row.reviewer || '')} · ${esc(time(row.reviewedAt || row.updatedAt))}</small></div>`}
        </section>
        ${row.qualifications?.activeVersion ? `<section class="pgr-panel"><h2>当前生效版本</h2><p class="pgr-local-note" data-qualification-review-active>${esc(row.qualifications.activeVersion.id)}${row.qualifications.activeVersion.id === row.versionId ? '（当前申请）' : '（新申请审核期间继续生效）'}</p></section>` : ''}
        <section class="pgr-panel"><h2>操作记录</h2><ol class="pgr-timeline">${(row.audit || []).slice().reverse().map(item => `<li><strong>${esc(actionText[item.action] || item.action)}</strong><span>${esc(item.actor)} · ${esc(time(item.at))}</span>${item.reason ? `<p>${esc(item.reason)}</p>` : ''}</li>`).join('')}</ol></section>
      </aside></div>
    </section>`;
  }

  let activeController;
  async function mount(host, state = {}, { reviewer = '资质审核员（本地演示）', onChange } = {}) {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    Object.assign(state, { keyword: state.keyword || '', status: state.status || '', activeApplicationId: state.activeApplicationId || '', reason: state.reason || '', error: '', rows: [] });
    const render = () => {
      const row = state.rows.find(item => item.id === state.activeApplicationId);
      host.innerHTML = row ? detailView(state, row) : listView(state);
    };
    const refresh = async () => {
      try { state.rows = await global.PublisherQualificationReviewStore.loadQueue(); state.error = ''; }
      catch (error) { state.error = errorText(error); }
      render();
    };
    host.addEventListener('input', event => {
      if (event.target.matches('[data-qualification-review-keyword]')) { state.keyword = event.target.value; render(); }
      if (event.target.matches('[data-qualification-review-reason]')) state.reason = event.target.value;
    }, { signal: controller.signal });
    host.addEventListener('change', event => {
      if (event.target.matches('[data-qualification-review-status]')) { state.status = event.target.value; render(); }
    }, { signal: controller.signal });
    host.addEventListener('click', async event => {
      const openButton = event.target.closest('[data-qualification-review-open]');
      const decisionButton = event.target.closest('[data-qualification-review-decision]');
      if (event.target.closest('[data-qualification-review-refresh]')) { await refresh(); return; }
      if (event.target.closest('[data-qualification-review-back]')) { state.activeApplicationId = ''; state.reason = ''; state.error = ''; render(); return; }
      if (openButton) { state.activeApplicationId = openButton.dataset.qualificationReviewOpen; state.reason = ''; state.error = ''; render(); return; }
      if (!decisionButton) return;
      const decision = decisionButton.dataset.qualificationReviewDecision;
      const applicationId = state.activeApplicationId;
      try {
        if (decision === 'supplement_required') await global.PublisherQualificationReviewStore.requestSupplement({ applicationId, reason: state.reason, reviewer });
        else await global.PublisherQualificationReviewStore.decide({ applicationId, decision, reason: state.reason, reviewer });
        state.error = ''; state.reason = '';
        await refresh();
        await onChange?.({ applicationId, decision });
      } catch (error) { state.error = errorText(error); await refresh(); state.error = errorText(error); render(); }
    }, { signal: controller.signal });
    await refresh();
    return { refresh, destroy: () => controller.abort(), state };
  }

  global.PublisherQualificationReview = { mount, statusText, relationshipText };
})(window);

window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};

(function registerPublisherChannelDistribution(namespace) {
  const e = value => namespace.components.escapeHtml(String(value ?? ''));
  const tx = (language, zh, en) => language === 'en' ? en : zh;
  const fixture = Object.freeze({
    channel: { id:'CH-001', name:'NovaPlay Store', currency:'USD' },
    program: {
      id:'KP-202609-001', appId:'APP-7F3A9C', sku:'BASE-GLOBAL',
      product:'星海远征 · 全球本体', regions:'美国、新加坡、中国澳门', purpose:'商业销售',
      quota:5000, used:1640, dailyLimit:2000, perRequestLimit:1000,
      delivery:'API 单码分配', validFrom:'2026-09-01', validUntil:'2027-03-31',
    },
    batch: {
      id:'KB-202609-0008', quantity:2000, available:360, pendingDelivery:0,
      exposed:372, redeemed:1268, expired:0, voided:0, validUntil:'2027-03-31',
    },
    settlement: {
      id:'ST-202609-CH001', period:'2026-09', sold:1282, refunds:14,
      chargebacks:0, adjustment:'0.00', net:1268, amount:'16,467.32',
    },
    maskedKeys:['GH26-••••-••••-9K2Q','GH26-••••-••••-21JM','GH26-••••-••••-R8WL','GH26-••••-••••-4F7N','GH26-••••-••••-X5DP'],
  });

  const status = (label, tone = 'success') => `<span class="publisher-channel-status is-${e(tone)}">${e(label)}</span>`;
  const metric = (label, value, note = '') => `<article class="publisher-channel-metric"><span>${e(label)}</span><strong class="number">${e(value)}</strong>${note ? `<small>${e(note)}</small>` : ''}</article>`;
  const button = (label, action, options = {}) => `<button type="button" class="${options.secondary ? 'publisher-channel-secondary' : 'publisher-channel-primary'}" data-portal-action="${e(action)}"${options.disabled ? ' disabled' : ''}>${e(label)}</button>`;
  const head = (language, eyebrow, title, description, action = '') => `<header class="publisher-channel-head"><div><h1>${e(title)}</h1></div>${action ? `<div class="publisher-channel-head__actions">${action}</div>` : ''}</header>`;
  const table = (headers, rows) => `<div class="publisher-channel-table-wrap"><table class="publisher-channel-table"><thead><tr>${headers.map(item => `<th>${e(item)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const field = (label, value) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`;

  const channelMeta = (channelState, language) => ({
    unopened: {
      label:tx(language,'未开通','Not enabled'), tone:'neutral',
      title:tx(language,'邀请制渠道合作','Invitation-only channel partnership'),
      detail:tx(language,'当前游戏尚未获得渠道授权。平台可先推进合作，包体和资质将在正式生成可售 Key 前统一校验。','This game has no channel authorization yet. Partnership can proceed first; build and qualification checks run before sellable Keys are generated.'),
    },
    active: {
      label:tx(language,'合作中','Active'), tone:'success',
      title:tx(language,'授权计划生效中','Authorization plan active'),
      detail:tx(language,'可在计划额度内申请 Key 批次；高风险申请将转人工审核。','You can request Key batches within the plan quota. High-risk requests are sent to manual review.'),
    },
    paused: {
      label:tx(language,'已暂停','Paused'), tone:'warning',
      title:tx(language,'授权计划已暂停','Authorization plan paused'),
      detail:tx(language,'暂停期间不能新建批次，历史交付、销售、兑换和收益数据仍可查看。','New batches cannot be created while paused. Historical delivery, sales, redemption and revenue data remain available.'),
    },
  }[channelState] || null);

  const channelNotice = (channelState, language) => {
    const meta = channelMeta(channelState, language);
    return `<section class="publisher-channel-notice is-${e(meta.tone)}"><div><strong>${e(meta.title)}</strong><span>${e(meta.detail)}</span></div>${status(meta.label, meta.tone)}</section>`;
  };

  const batchOutcomeMeta = (outcome, language) => ({
    generated:{ title:tx(language,'批次已生成','Batch generated'), detail:tx(language,'已通过额度与风险校验，可按授权计划供渠道分配。','Quota and risk checks passed. The batch is ready for channel allocation.'), tone:'success', label:tx(language,'可用','Available') },
    pending:{ title:tx(language,'批次审核中','Batch in review'), detail:tx(language,'本次申请触发人工审核，预计 1 个工作日内完成。','This request requires manual review and is expected to finish within one business day.'), tone:'warning', label:tx(language,'审核中','In review') },
    rejected:{ title:tx(language,'批次申请已拒绝','Batch request rejected'), detail:tx(language,'申请用途与当前授权范围不符，请调整用途或数量后重新提交。','The purpose is outside the current authorization scope. Update the purpose or quantity and submit again.'), tone:'danger', label:tx(language,'已拒绝','Rejected') },
    failed:{ title:tx(language,'批次生成失败','Batch generation failed'), detail:tx(language,'额度已锁定，但生成服务暂时异常；重试不会重复占用额度。','Quota is reserved, but generation is temporarily unavailable. Retrying will not consume quota twice.'), tone:'danger', label:tx(language,'生成失败','Generation failed') },
  }[outcome] || null);

  const batchResult = ({ language, outcome, submission }) => {
    const meta = batchOutcomeMeta(outcome, language);
    const quantity = Number(submission?.quantity || 500).toLocaleString();
    const recovery = outcome === 'rejected'
      ? button(tx(language,'修改后重提','Edit and resubmit'),'channel-batch-edit')
      : outcome === 'failed'
        ? button(tx(language,'重试生成','Retry generation'),'channel-batch-retry')
        : '';
    return `<section class="publisher-channel-result is-${e(meta.tone)}" data-channel-batch-result="${e(outcome)}"><div><span>${status(meta.label, meta.tone)}</span><h2>${e(meta.title)}</h2><p>${e(meta.detail)}</p><small>${tx(language,'申请编号','Request ID')}：BR-20260914-001 · ${tx(language,'数量','Quantity')}：${e(quantity)} · ${fixture.program.id}</small></div>${recovery}</section>`;
  };

  const dialogShell = (language, id, eyebrow, title, body, footer = '') => `<div class="publisher-channel-dialog-layer"><button type="button" class="publisher-channel-dialog-backdrop" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭','Close')}"></button><section class="publisher-channel-dialog" role="dialog" aria-modal="true" aria-labelledby="${e(id)}"><header><div><h2 id="${e(id)}">${e(title)}</h2></div><button type="button" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭','Close')}">×</button></header><div class="publisher-channel-dialog__body">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}</section></div>`;

  const renderPlanDialog = language => dialogShell(language,'channel-plan-dialog-title','AUTHORIZATION PLAN',tx(language,'授权计划详情','Authorization plan details'),`<dl class="publisher-channel-detail-grid">${field(tx(language,'计划编号','Plan ID'),fixture.program.id)}${field(tx(language,'渠道','Channel'),`${fixture.channel.name} · ${fixture.channel.id}`)}${field('APPID',fixture.program.appId)}${field('Product／SKU',`${fixture.program.product} · ${fixture.program.sku}`)}${field(tx(language,'发行地区','Release regions'),fixture.program.regions)}${field(tx(language,'授权用途','Authorized purpose'),tx(language,'商业销售','Commercial sale'))}${field(tx(language,'总额度','Total quota'),'5,000')}${field(tx(language,'剩余额度','Remaining quota'),'3,360')}${field(tx(language,'日额度','Daily quota'),'2,000')}${field(tx(language,'单次上限','Per-request limit'),'1,000')}${field(tx(language,'交付方式','Delivery'),tx(language,'API 单码分配','Single-key API allocation'))}${field(tx(language,'有效期','Valid period'),`${fixture.program.validFrom} — ${fixture.program.validUntil}`)}</dl>`);

  const renderBatchCreateDialog = (language, state) => {
    const initialQuantity = Number(state.channelBatchDraft?.quantity || state.channelSubmission?.quantity || 500);
    const body = `<form class="publisher-channel-form" data-channel-batch-form><label><span>${tx(language,'授权计划','Authorization plan')}</span><input value="${fixture.program.id} · ${fixture.channel.name}" readonly></label><label><span>${tx(language,'申请数量','Request quantity')}</span><input type="number" min="1" max="1000" step="1" value="${e(initialQuantity)}" aria-label="${tx(language,'申请数量','Request quantity')}" data-channel-batch-quantity><small>${tx(language,'剩余额度 3,360；单次上限 1,000。','3,360 remaining; 1,000 maximum per request.')}</small><em data-channel-batch-error></em></label><label><span>${tx(language,'用途','Purpose')}</span><select aria-label="${tx(language,'用途','Purpose')}" data-channel-batch-purpose><option value="commercial">${tx(language,'商业销售','Commercial sale')}</option><option value="testing">${tx(language,'测试','Testing')}</option><option value="promotion">${tx(language,'免费推广','Free promotion')}</option><option value="compensation">${tx(language,'用户补偿','Customer compensation')}</option></select></label><label><span>${tx(language,'交付方式','Delivery method')}</span><select aria-label="${tx(language,'交付方式','Delivery method')}" data-channel-batch-delivery><option value="api">${tx(language,'API 单码分配','Single-key API allocation')}</option><option value="file">${tx(language,'批量文件（需人工审核）','Batch file (manual review)')}</option></select></label><label><span>${tx(language,'有效期','Valid until')}</span><input type="date" value="2027-03-31" max="2027-03-31" aria-label="${tx(language,'有效期','Valid until')}"></label></form>`;
    const footer = `${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(tx(language,'提交批次申请','Submit batch request'),'channel-batch-submit')}`;
    return dialogShell(language,'channel-batch-create-title','KEY BATCH',tx(language,'创建 Key 批次','Create Key batch'),body,footer);
  };

  const renderBatchDetailDialog = language => dialogShell(language,'channel-batch-detail-title','KEY BATCH',tx(language,'批次详情','Batch details'),`<dl class="publisher-channel-detail-grid">${field(tx(language,'批次编号','Batch ID'),fixture.batch.id)}${field(tx(language,'总量','Total'),'2,000')}${field(tx(language,'可用','Available'),'360')}${field(tx(language,'待接收确认','Awaiting receipt confirmation'),'0')}${field(tx(language,'已暴露未兑换','Exposed, not redeemed'),'372')}${field(tx(language,'已兑换','Redeemed'),'1,268')}${field(tx(language,'已过期','Expired'),'0')}${field(tx(language,'已作废','Voided'),'0')}${field(tx(language,'有效期','Valid until'),fixture.batch.validUntil)}${field(tx(language,'交付方式','Delivery'),tx(language,'API 单码分配','Single-key API allocation'))}${field(tx(language,'交付机制','Delivery flow'),tx(language,'渠道订单请求后，接口一次返回 1 个 Key','After a channel order request, the API returns one Key'))}${field(tx(language,'幂等处理','Idempotency'),tx(language,'同一渠道订单只分配 1 个 Key，重试不重复扣库存','The same channel order receives one Key; retries do not consume inventory twice'))}${field(tx(language,'可见范围','Visibility'),tx(language,'前台、列表和日志只显示掩码或指纹','The portal, lists and logs show only masks or fingerprints'))}</dl><p class="publisher-channel-dialog__note is-warning">${tx(language,'明文 Key 仅通过已鉴权的 HTTPS 接口返回渠道。已暴露 Key 只能兑换、过期或作废，不得回到可用状态。批量文件仅作受控例外，由平台生成加密文件或限时下载地址。','Plain-text Keys are returned to the channel only through an authenticated HTTPS API. An exposed Key can only be redeemed, expired or voided; it never returns to available. Batch files are a controlled exception, provided by the platform as encrypted files or expiring download links.')}</p>`);

  const renderAnomalyDialog = language => dialogShell(language,'channel-anomaly-title','CHANNEL ANOMALY',tx(language,'异常详情','Anomaly details'),`<dl class="publisher-channel-detail-grid">${field(tx(language,'异常编号','Anomaly ID'),'AN-202609-0031')}${field(tx(language,'异常类型','Type'),tx(language,'已兑换但销售未回传','Redeemed without sales report'))}${field(tx(language,'渠道订单','Channel order'),'NP-260910-8826')}${field('Key',fixture.maskedKeys[2])}${field(tx(language,'发现时间','Detected at'),'2026-09-10 13:50')}${field(tx(language,'影响','Impact'),tx(language,'暂不计入渠道销售净额','Excluded from channel sales net for now'))}${field(tx(language,'处理进度','Progress'),tx(language,'平台正在向渠道补查销售事实','Platform is verifying the sale with the channel'))}${field(tx(language,'预计更新','Expected update'),'2026-09-15')}</dl><p class="publisher-channel-dialog__note">${tx(language,'开发者无需处理。结果确认后会自动更新销售、收益和月度调整。','No developer action is required. Sales, revenue and monthly adjustments update automatically after verification.')}</p>`);

  const renderSettlementDialog = language => dialogShell(language,'channel-settlement-title','MONTHLY REVENUE',tx(language,'月度收益详情','Monthly revenue details'),`<dl class="publisher-channel-detail-grid">${field(tx(language,'统计月份','Period'),'2026-09')}${field(tx(language,'渠道','Channel'),fixture.channel.name)}${field(tx(language,'渠道售出','Channel sales'),'1,282')}${field(tx(language,'退款','Refunds'),'14')}${field(tx(language,'拒付','Chargebacks'),'0')}${field(tx(language,'历史调整','Prior adjustments'),'USD 0.00')}${field(tx(language,'净结算数量','Net quantity'),'1,268')}${field(tx(language,'预估渠道销售净额','Estimated channel sales net'),'USD 16,467.32')}</dl><p class="publisher-channel-dialog__note">${tx(language,'最终开发者应收、开票与付款由财务模块统一处理。锁单后的迟到退款或拒付计入下期调整。','Final developer receivables, invoicing and payments are handled in Finance. Late refunds or chargebacks after locking are adjusted next month.')}</p>`);

  const renderDialog = ({ language, state }) => ({
    'plan-detail':() => renderPlanDialog(language),
    'batch-create':() => renderBatchCreateDialog(language,state),
    'batch-detail':() => renderBatchDetailDialog(language),
    'anomaly-detail':() => renderAnomalyDialog(language),
    'settlement-detail':() => renderSettlementDialog(language),
  }[state.channelDialog]?.() || '');

  const renderOverview = ({ language, state, channelState, batchOutcome }) => {
    const canCreate = channelState === 'active';
    const create = button(tx(language,'创建 Key 批次','Create Key batch'),'channel-batch-create',{disabled:!canCreate});
    const pageHead = head(language,'CHANNEL DISTRIBUTION',tx(language,'渠道分销总览','Channel distribution overview'),' ',create);
    if (channelState === 'unopened') return `${pageHead}${channelNotice(channelState,language)}${renderDialog({language,state})}`;
    const notice = channelState === 'active' ? '' : channelNotice(channelState,language);
    const result = state.channelSubmission ? batchResult({language,outcome:batchOutcome,submission:state.channelSubmission}) : '';
    return `${pageHead}${notice}<div class="publisher-channel-metrics">${metric(tx(language,'授权渠道','Authorized channels'),'1')}${metric(tx(language,'本月渠道售出','Channel sales'),'1,282',tx(language,'较上月 +12.6%','+12.6% MoM'))}${metric(tx(language,'成功兑换','Redemptions'),'1,268',tx(language,'售兑率 98.9%','98.9% redemption rate'))}${metric(tx(language,'预估渠道销售净额','Estimated channel sales net'),'USD 16,467.32',tx(language,'已扣除 14 笔退款','After 14 refunds'))}</div><section class="publisher-channel-card"><header><div><h2>${tx(language,'星海远征 · 全球本体','Stellar Voyage · Global base game')}</h2><p>${fixture.program.id} · ${fixture.program.appId} · ${fixture.program.sku}</p></div></header><div class="publisher-channel-partner"><span>NP</span><div><strong>${fixture.channel.name}</strong><small>${fixture.channel.id} · ${tx(language,'美国、新加坡、中国澳门 · API 单码分配','United States, Singapore, Macao · Single-key API allocation')}</small></div></div><div class="publisher-channel-quota"><div><strong>5,000</strong><small>${tx(language,'计划额度','Program quota')}</small></div><div><strong>1,640</strong><small>${tx(language,'已使用','Used')}</small></div><div><strong>3,360</strong><small>${tx(language,'剩余额度','Remaining')}</small></div></div><div class="publisher-channel-progress"><i style="width:32.8%"></i></div><footer class="publisher-channel-card__actions">${button(tx(language,'查看计划详情','View plan details'),'channel-plan-detail',{secondary:true})}</footer></section>${result}<section class="publisher-channel-card"><header><div><h2>${tx(language,'近 7 日渠道表现','Channel performance · last 7 days')}</h2></div></header>${table([tx(language,'日期','Date'),tx(language,'分配','Allocated'),tx(language,'售出','Sold'),tx(language,'兑换','Redeemed'),tx(language,'退款','Refunds'),tx(language,'预估净额','Estimated net')],[['2026-09-10','86','72','69','1','USD 922.29'],['2026-09-09','91','78','76','0','USD 1,013.22'],['2026-09-08','74','65','64','1','USD 831.36'],['2026-09-07','69','58','57','0','USD 753.42']])}</section>${renderDialog({language,state})}`;
  };

  const renderBatches = ({ language, state, channelState, batchOutcome }) => {
    const canCreate = channelState === 'active';
    const pageHead = head(language,'KEY BATCHES',tx(language,'Key 批次','Key batches'),' ',button(tx(language,'创建 Key 批次','Create Key batch'),'channel-batch-create',{disabled:!canCreate}));
    if (channelState === 'unopened') return `${pageHead}${channelNotice(channelState,language)}${renderDialog({language,state})}`;
    const notice = channelState === 'active' ? '' : channelNotice(channelState,language);
    const result = state.channelSubmission ? batchResult({language,outcome:batchOutcome,submission:state.channelSubmission}) : '';
    const noAction = '<span aria-label="无操作">—</span>';
    const details = `<button type="button" class="publisher-channel-link" data-portal-action="channel-batch-detail">${tx(language,'查看详情','View details')}</button>`;
    const rows = [
      ['KB-202609-0015',fixture.program.id,tx(language,'商业销售','Commercial sale'),tx(language,'API 单码分配','Single-key API'),'500',status(tx(language,'生成中','Generating'),'warning'),'2027-03-31',noAction],
      ['KB-202609-0014',fixture.program.id,tx(language,'免费推广','Free promotion'),tx(language,'加密文件','Encrypted file'),'300',status(tx(language,'审核中','In review'),'warning'),'2026-12-31',noAction],
      ['KB-202609-0013',fixture.program.id,tx(language,'用户补偿','Customer compensation'),tx(language,'加密文件','Encrypted file'),'100',status(tx(language,'已拒绝','Rejected'),'danger'),'2026-12-31',noAction],
      ['KB-202609-0012',fixture.program.id,tx(language,'商业销售','Commercial sale'),tx(language,'API 单码分配','Single-key API'),'600',status(tx(language,'生成失败','Generation failed'),'danger'),'2027-03-31',noAction],
      [`<strong>${fixture.batch.id}</strong>`,fixture.program.id,tx(language,'商业销售','Commercial sale'),tx(language,'API 单码分配','Single-key API'),'2,000',status(tx(language,'可用','Available')),'2027-03-31',details],
      ['KB-202608-0007',fixture.program.id,tx(language,'测试','Testing'),tx(language,'API 单码分配','Single-key API'),'50',status(tx(language,'已耗尽','Depleted'),'neutral'),'2026-12-31',noAction],
      ['KB-202607-0006',fixture.program.id,tx(language,'商业销售','Commercial sale'),tx(language,'API 单码分配','Single-key API'),'200',status(tx(language,'已过期','Expired'),'neutral'),'2026-08-31',noAction],
      ['KB-202607-0005',fixture.program.id,tx(language,'测试','Testing'),tx(language,'API 单码分配','Single-key API'),'20',status(tx(language,'已作废','Voided'),'danger'),'2026-12-31',noAction],
    ];
    return `${pageHead}${notice}${result}<div class="publisher-channel-metrics">${metric(tx(language,'批次总量','Batch total'),'2,000',fixture.batch.id)}${metric(tx(language,'可用','Available'),'360')}${metric(tx(language,'已暴露','Exposed'),'372')}${metric(tx(language,'已兑换','Redeemed'),'1,268')}</div><section class="publisher-channel-card"><header><div><h2>${tx(language,'批次列表','Batch list')}</h2></div></header>${table([tx(language,'批次编号','Batch ID'),tx(language,'授权计划','Plan'),tx(language,'用途','Purpose'),tx(language,'交付方式','Delivery'),tx(language,'数量','Quantity'),tx(language,'状态','Status'),tx(language,'有效期','Valid until'),tx(language,'操作','Action')],rows)}</section>${renderDialog({language,state})}`;
  };

  const renderDataTab = ({ language, tab }) => {
    if (tab === 'sales') return table([tx(language,'渠道订单','Channel order'),tx(language,'地区','Region'),tx(language,'Key 掩码','Key mask'),tx(language,'金额','Amount'),tx(language,'业务状态','Business status'),tx(language,'时间','Time')],[['NP-260910-8841',tx(language,'美国','United States'),`<code>${fixture.maskedKeys[0]}</code>`,'USD 12.99',status(tx(language,'已售已兑换','Sold and redeemed')),'2026-09-10 14:22'],['NP-260910-8839',tx(language,'新加坡','Singapore'),`<code>${fixture.maskedKeys[1]}</code>`,'USD 12.99',status(tx(language,'已售未兑换','Sold, not redeemed'),'warning'),'2026-09-10 14:16'],['NP-260910-8832',tx(language,'美国','United States'),`<code>${fixture.maskedKeys[2]}</code>`,'USD 12.99',status(tx(language,'已退款','Refunded'),'warning'),'2026-09-10 14:02'],['NP-260910-8829',tx(language,'中国澳门','Macao'),`<code>${fixture.maskedKeys[3]}</code>`,'USD 12.99',status(tx(language,'已拒付','Charged back'),'danger'),'2026-09-10 13:55'],['NP-260910-8826',tx(language,'美国','United States'),`<code>${fixture.maskedKeys[4]}</code>`,'—',status(tx(language,'已兑换但销售待补报','Redeemed, sale report pending'),'warning'),'2026-09-10 13:48']]);
    if (tab === 'anomalies') return table([tx(language,'异常编号','Anomaly ID'),tx(language,'类型','Type'),tx(language,'影响订单','Affected order'),tx(language,'发现时间','Detected at'),tx(language,'状态','Status'),tx(language,'操作','Action')],[['AN-202609-0031',tx(language,'已兑换但销售未回传','Redeemed without sales report'),'NP-260910-8826','2026-09-10 13:50',status(tx(language,'处理中','Processing'),'warning'),`<button type="button" class="publisher-channel-link" data-portal-action="channel-anomaly-detail">${tx(language,'查看异常','View anomaly')}</button>`],['AN-202609-0029',tx(language,'订单重复回传','Duplicate order report'),'NP-260910-8818','2026-09-10 13:20',status(tx(language,'待处理','Pending'),'warning'),'—'],['AN-202609-0024',tx(language,'接收确认超时','Delivery confirmation timeout'),'DL-20260910-0182','2026-09-10 12:10',status(tx(language,'已恢复','Recovered'),'success'),'—'],['AN-202608-0018',tx(language,'分配失败','Allocation failed'),'DL-20260829-0138','2026-08-29 16:08',status(tx(language,'已关闭','Closed'),'neutral'),'—']]);
    return table([tx(language,'交付编号','Delivery ID'),tx(language,'批次','Batch'),tx(language,'Key 掩码','Key mask'),tx(language,'渠道','Channel'),tx(language,'状态','Status'),tx(language,'时间','Time')],[['DL-20260910-0190',fixture.batch.id,`<code>${fixture.maskedKeys[0]}</code>`,fixture.channel.name,status(tx(language,'分配中','Allocating'),'warning'),'2026-09-10 14:24'],['DL-20260910-0189',fixture.batch.id,`<code>${fixture.maskedKeys[1]}</code>`,fixture.channel.name,status(tx(language,'待接收确认','Awaiting receipt confirmation'),'warning'),'2026-09-10 14:22'],['DL-20260910-0188',fixture.batch.id,`<code>${fixture.maskedKeys[2]}</code>`,fixture.channel.name,status(tx(language,'已确认接收','Receipt confirmed')),'2026-09-10 14:20'],['DL-20260910-0182',fixture.batch.id,`<code>${fixture.maskedKeys[3]}</code>`,fixture.channel.name,status(tx(language,'确认超时','Confirmation timed out'),'danger'),'2026-09-10 13:42'],['DL-20260909-0169',fixture.batch.id,`<code>${fixture.maskedKeys[4]}</code>`,fixture.channel.name,status(tx(language,'分配失败','Allocation failed'),'danger'),'2026-09-09 18:08']]);
  };

  const renderData = ({ language, state, channelState }) => {
    const activeTab = ['delivery','sales','anomalies'].includes(state.channelDataTab) ? state.channelDataTab : 'delivery';
    const tabs = [['delivery',tx(language,'交付记录','Delivery records')],['sales',tx(language,'销售与兑换','Sales & redemption')],['anomalies',tx(language,'异常记录','Anomalies')]];
    const pageHead = head(language,'CHANNEL DATA',tx(language,'渠道数据','Channel data'),' ',button(tx(language,'导出数据','Export data'),'channel-export'));
    if (channelState === 'unopened') return `${pageHead}${channelNotice(channelState,language)}${renderDialog({language,state})}`;
    const notice = channelState === 'active' ? '' : channelNotice(channelState,language);
    return `${pageHead}${notice}<div class="publisher-channel-filters"><label><span>${tx(language,'渠道','Channel')}</span><select><option>${fixture.channel.name}</option></select></label><label><span>SKU</span><select><option>${fixture.program.sku}</option></select></label><label><span>${tx(language,'月份','Month')}</span><select><option>2026-09</option></select></label><label><span>${tx(language,'地区','Region')}</span><select><option>${tx(language,'全部地区','All regions')}</option></select></label></div><div class="publisher-channel-metrics">${metric(tx(language,'已分配','Allocated'),'1,640',`${fixture.program.appId} · ${fixture.program.sku}`)}${metric(tx(language,'已确认接收','Delivery confirmed'),'1,602')}${metric(tx(language,'已售','Sold'),'1,282')}${metric(tx(language,'销售回传完整率','Sales reporting'),'99.8%',tx(language,'1 条待补报','1 report pending'))}</div><section class="publisher-channel-card"><div class="publisher-channel-tabs" role="tablist" aria-label="${tx(language,'渠道数据类型','Channel data type')}">${tabs.map(([id,label]) => `<button type="button" role="tab" aria-selected="${activeTab === id}" class="${activeTab === id ? 'is-active' : ''}" data-portal-action="channel-data-tab" data-channel-data-tab="${id}">${e(label)}</button>`).join('')}</div><div class="publisher-channel-tabpanel" role="tabpanel">${renderDataTab({language,tab:activeTab})}</div></section>${renderDialog({language,state})}`;
  };

  const renderSettlement = ({ language, state, channelState }) => {
    const pageHead = head(language,'CHANNEL REVENUE',tx(language,'收益与结算','Revenue & settlement'),' ',button(tx(language,'进入财务与结算','Open Finance'),'channel-finance-entry',{secondary:true}));
    if (channelState === 'unopened') return `${pageHead}${channelNotice(channelState,language)}${renderDialog({language,state})}`;
    const notice = channelState === 'active' ? '' : channelNotice(channelState,language);
    const details = `<button type="button" class="publisher-channel-link" data-portal-action="channel-settlement-detail">${tx(language,'查看详情','View details')}</button>`;
    const rows = [
      ['2026-09','1,282','14','0','USD 0.00','1,268','<strong>USD 16,467.32</strong>',status(tx(language,'预估中','Estimating'),'warning'),details],
      ['2026-08','1,138','9','1','USD 0.00','1,128','<strong>USD 14,715.61</strong>',status(tx(language,'已锁定','Locked')),'—'],
      ['2026-07','1,094','8','0','USD -62.40','1,086','<strong>USD 14,047.92</strong>',status(tx(language,'已调整','Adjusted'),'neutral'),'—'],
    ];
    return `${pageHead}${notice}<div class="publisher-channel-metrics">${metric(tx(language,'渠道售出','Channel sales'),'1,282')}${metric(tx(language,'退款','Refunds'),'14')}${metric(tx(language,'拒付','Chargebacks'),'0')}${metric(tx(language,'预估渠道销售净额','Estimated channel sales net'),'USD 16,467.32',tx(language,'净数量 1,268','Net quantity 1,268'))}</div><section class="publisher-channel-card publisher-channel-settlement"><header><div><h2>${tx(language,'月度收益','Monthly revenue')}</h2><p>${fixture.channel.name} · ${fixture.program.appId} · ${fixture.program.sku}</p></div></header>${table([tx(language,'月份','Period'),tx(language,'售出','Sold'),tx(language,'退款','Refunds'),tx(language,'拒付','Chargebacks'),tx(language,'历史调整','Prior adjustments'),tx(language,'净数量','Net quantity'),tx(language,'预估渠道销售净额','Estimated channel sales net'),tx(language,'状态','Status'),tx(language,'操作','Action')],rows)}</section>${renderDialog({language,state})}`;
  };

  const renderers = {'channel-overview':renderOverview,'channel-batches':renderBatches,'channel-data':renderData,'channel-settlement':renderSettlement};
  const render = ({ section, language = 'zh', state = {}, demoState = {} }) => {
    const channelState = ['unopened','active','paused'].includes(demoState.channelStatus) ? demoState.channelStatus : 'active';
    const storedOutcome = state.channelSubmission?.status;
    const batchOutcome = ['generated','pending','rejected','failed'].includes(storedOutcome)
      ? storedOutcome
      : ['generated','pending','rejected','failed'].includes(demoState.channelBatchOutcome) ? demoState.channelBatchOutcome : 'generated';
    return `<section class="publisher-channel" data-publisher-channel="${e(section)}" data-channel-status="${e(channelState)}" data-batch-outcome="${e(batchOutcome)}">${(renderers[section] || renderOverview)({ language, state, demoState, channelState, batchOutcome })}</section>`;
  };

  window.PublisherChannelDistribution = { fixture, render };
  namespace.publisherChannelDistribution = window.PublisherChannelDistribution;
})(window.GameHubDeveloperPortal);

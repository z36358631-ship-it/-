window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};

(function registerPublisherChannelDistribution(namespace) {
  const e = value => namespace.components.escapeHtml(String(value ?? ''));
  const tx = (language, zh, en) => language === 'en' ? en : zh;
  const copy = value => JSON.parse(JSON.stringify(value));
  const DEMO_NOW = '2026-09-16T15:00';
  const DEFAULT_DISTRIBUTION_START = '2026-08-18';
  const DEFAULT_DISTRIBUTION_END = '2026-09-16';

  const fixture = Object.freeze({
    products: [
      { id:'BASE-GLOBAL', type:'base', name:'星海远征', nameEn:'Starward Odyssey', label:'星海远征 · 本体', labelEn:'Starward Odyssey · Base game' },
      { id:'DLC-SEASON-01', type:'dlc', name:'远航季票', nameEn:'Voyage Season Pass', label:'远航季票 · DLC', labelEn:'Voyage Season Pass · DLC' },
    ],
    channels: [
      { id:'CH-240901', name:'NovaPlay Store', delivery:'api', productIds:['BASE-GLOBAL','DLC-SEASON-01'], status:'active', effectiveStart:'2026-01-01T00:00', effectiveEnd:'', credentialStatus:'normal', clientId:'cli_np_20260901', secretLast4:'7Q4X', lastDeliveredAt:'2026-09-16 14:22', lastUsedAt:'2026-09-16 14:22', apiStats:{ requests:1842, succeeded:1640, failed:202 }, apiCalls:[{ orderId:'NP-****-8826', requestId:'req_****_7412', skuId:'BASE-GLOBAL', result:'success', errorCode:'', calledAt:'2026-09-16 14:22' },{ orderId:'NP-****-8818', requestId:'req_****_7399', skuId:'DLC-SEASON-01', result:'failed', errorCode:'IDEMPOTENCY_CONFLICT', calledAt:'2026-09-16 13:20' },{ orderId:'NP-****-8802', requestId:'req_****_7381', skuId:'BASE-GLOBAL', result:'failed', errorCode:'RATE_LIMITED', calledAt:'2026-09-16 12:10' }] },
      { id:'CH-240902', name:'ArcadeX 文件渠道', delivery:'file', productIds:['BASE-GLOBAL'], status:'active', effectiveStart:'2026-06-01T00:00', effectiveEnd:'', credentialStatus:'not_applicable', lastDeliveredAt:'2026-09-12 10:06' },
      { id:'CH-240903', name:'北美线下渠道', delivery:'api', productIds:['BASE-GLOBAL'], status:'paused', effectiveStart:'2026-06-01T00:00', effectiveEnd:'', credentialStatus:'paused', clientId:'cli_na_20260818', secretLast4:'2K8M', lastDeliveredAt:'2026-09-08 18:40' },
      { id:'CH-240904', name:'PixelMall 待接入', delivery:'api', productIds:['DLC-SEASON-01'], status:'active', effectiveStart:'2026-09-20T09:00', effectiveEnd:'', credentialStatus:'pending', clientId:'', secretLast4:'', lastDeliveredAt:'—' },
      { id:'CH-240905', name:'CloudPlay 已停止渠道', delivery:'api', productIds:['BASE-GLOBAL'], status:'stopped', effectiveStart:'2026-01-01T00:00', effectiveEnd:'2026-09-02T11:00', credentialStatus:'disabled', clientId:'cli_cp_20260709', secretLast4:'9P1R', lastDeliveredAt:'2026-09-01 09:14', stoppedAt:'2026-09-02 11:00' },
      { id:'CH-240906', name:'旧版合作渠道', delivery:'api', productIds:['BASE-GLOBAL'], status:'active', effectiveStart:'2026-02-01T00:00', effectiveEnd:'2026-08-01T00:00', credentialStatus:'disabled', clientId:'cli_legacy_202602', secretLast4:'6N3W', lastDeliveredAt:'2026-07-31 20:18' },
      { id:'CH-240907', name:'异常监控渠道', delivery:'api', productIds:['BASE-GLOBAL'], status:'risk_paused', effectiveStart:'2026-07-01T00:00', effectiveEnd:'', credentialStatus:'reset_required', clientId:'cli_risk_202609', secretLast4:'1D8V', lastDeliveredAt:'2026-09-15 21:09' },
    ],
    fileBatches: [
      { id:'FB-20260912-0004', channelId:'CH-240902', skuId:'BASE-GLOBAL', quantity:300, validUntil:'2027-03-31', status:'downloaded', createdAt:'2026-09-12 10:02', downloadedAt:'2026-09-12 10:06' },
      { id:'FB-20260910-0003', channelId:'CH-240902', skuId:'BASE-GLOBAL', quantity:100, validUntil:'2027-01-31', status:'cancelled', createdAt:'2026-09-10 12:40' },
      { id:'FB-20260418-0002', channelId:'CH-240902', skuId:'BASE-GLOBAL', quantity:80, validUntil:'2026-08-31', status:'expired', createdAt:'2026-04-18 09:10' },
      { id:'FB-20260908-0001', channelId:'CH-240902', skuId:'BASE-GLOBAL', quantity:260, validUntil:'2027-03-31', status:'failed', createdAt:'2026-09-08 17:52', failureReason:'生成服务暂时不可用，未产生或暴露任何 Key。' },
    ],
    downloads: [
      { id:'DL-20260912-0001', channelId:'CH-240902', batchId:'FB-20260912-0004', fileName:'盖世游戏兑换码_ArcadeX文件渠道_FB-20260912-0004.csv', quantity:300, downloadedAt:'2026-09-12 10:06', downloadedBy:'当前开发者', downloadCount:1, keyFingerprintDigest:'', fingerprintCount:300 },
    ],
    keyMetrics: [
      { channelId:'CH-240901', skuId:'BASE-GLOBAL', issued:1400, redeemed:1100, periods:[{issuedAt:'2026-08-25',issued:500,redeemed:390},{issuedAt:'2026-09-05',issued:420,redeemed:336},{issuedAt:'2026-09-16',issued:480,redeemed:374}], lastDeliveredAt:'2026-09-16 14:22', lastRedeemedAt:'2026-09-16 14:20' },
      { channelId:'CH-240901', skuId:'DLC-SEASON-01', issued:240, redeemed:168, periods:[{issuedAt:'2026-09-16',issued:240,redeemed:168}], lastDeliveredAt:'2026-09-16 14:18', lastRedeemedAt:'2026-09-16 14:17' },
      { channelId:'CH-240902', skuId:'BASE-GLOBAL', issued:300, redeemed:42, periods:[{issuedAt:'2026-09-12',issued:300,redeemed:42}], lastDeliveredAt:'2026-09-12 10:06', lastRedeemedAt:'2026-09-16 11:08' },
      { channelId:'CH-240903', skuId:'BASE-GLOBAL', issued:480, redeemed:397, periods:[{issuedAt:'2026-09-08',issued:480,redeemed:397}], lastDeliveredAt:'2026-09-08 18:40', lastRedeemedAt:'2026-09-15 22:10' },
      { channelId:'CH-240904', skuId:'DLC-SEASON-01', issued:0, redeemed:0, periods:[], lastDeliveredAt:'', lastRedeemedAt:'' },
      { channelId:'CH-240905', skuId:'BASE-GLOBAL', issued:920, redeemed:851, periods:[{issuedAt:'2026-09-01',issued:920,redeemed:851}], lastDeliveredAt:'2026-09-01 09:14', lastRedeemedAt:'2026-09-15 09:32' },
      { channelId:'CH-240906', skuId:'BASE-GLOBAL', issued:310, redeemed:291, periods:[{issuedAt:'2026-07-31',issued:310,redeemed:291}], lastDeliveredAt:'2026-07-31 20:18', lastRedeemedAt:'2026-09-02 16:05' },
      { channelId:'CH-240907', skuId:'BASE-GLOBAL', issued:86, redeemed:65, periods:[{issuedAt:'2026-09-15',issued:86,redeemed:65}], lastDeliveredAt:'2026-09-15 21:09', lastRedeemedAt:'2026-09-15 21:04' },
    ],
  });

  const createState = source => {
    const value = source && typeof source === 'object' ? source : {};
    const { sales, salesEvents, ...rest } = copy(value);
    const filterValue = (filters, key, fallback = '') => Object.prototype.hasOwnProperty.call(filters || {},key) ? String(filters[key] ?? '') : fallback;
    return {
      ...copy(fixture),
      ...rest,
      activeChannelId:String(value.activeChannelId || ''),
      dialog:String(value.dialog || ''),
      dialogChannelId:String(value.dialogChannelId || ''),
      dialogBatchId:String(value.dialogBatchId || ''),
      supplyTab:['channels','batches'].includes(value.supplyTab) ? value.supplyTab : 'channels',
      channelFilters:{ channelId:filterValue(value.channelFilters,'channelId'), start:filterValue(value.channelFilters,'start'), end:filterValue(value.channelFilters,'end') },
      batchFilters:{ channelId:filterValue(value.batchFilters,'channelId'), start:filterValue(value.batchFilters,'start'), end:filterValue(value.batchFilters,'end') },
      distributionFilters:{ channelId:filterValue(value.distributionFilters,'channelId'), start:filterValue(value.distributionFilters,'start',DEFAULT_DISTRIBUTION_START), end:filterValue(value.distributionFilters,'end',DEFAULT_DISTRIBUTION_END) },
      channels:(Array.isArray(value.channels) && value.channels.length ? copy(value.channels) : copy(fixture.channels)).map(channel => ({ effectiveStart:'2026-01-01T00:00', effectiveEnd:'', ...channel })),
      fileBatches:Array.isArray(value.fileBatches) ? copy(value.fileBatches) : copy(fixture.fileBatches),
      downloads:Array.isArray(value.downloads) ? copy(value.downloads) : copy(fixture.downloads),
      keyMetrics:Array.isArray(value.keyMetrics) ? copy(value.keyMetrics) : copy(fixture.keyMetrics),
    };
  };

  const productById = id => fixture.products.find(item => item.id === id) || { id, type:'base', name:id, nameEn:id, label:id, labelEn:id };
  const channelById = (state, id) => state.channels.find(item => item.id === id) || state.channels[0] || fixture.channels[0];
  const formatNumber = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '—';
  const status = (label, tone = 'success') => `<span class="publisher-channel-status is-${e(tone)}">${e(label)}</span>`;
  const metric = (label, value, note = '') => `<article class="publisher-channel-metric"><span>${e(label)}</span><strong class="number">${e(value)}</strong>${note ? `<small>${e(note)}</small>` : ''}</article>`;
  const button = (label, action, options = {}) => `<button type="button" class="${options.secondary ? 'publisher-channel-secondary' : options.danger ? 'publisher-channel-danger' : 'publisher-channel-primary'}" data-portal-action="${e(action)}"${options.channelId ? ` data-channel-id="${e(options.channelId)}"` : ''}${options.batchId ? ` data-batch-id="${e(options.batchId)}"` : ''}${options.helpTopic ? ` data-help-topic="${e(options.helpTopic)}"` : ''}${options.filterScope ? ` data-filter-scope="${e(options.filterScope)}"` : ''}${options.disabled ? ' disabled' : ''}>${e(label)}</button>`;
  const actionLink = (label, action, options = {}) => `<button type="button" class="publisher-channel-link${options.danger ? ' is-danger' : ''}" data-portal-action="${e(action)}"${options.channelId ? ` data-channel-id="${e(options.channelId)}"` : ''}${options.batchId ? ` data-batch-id="${e(options.batchId)}"` : ''}${options.helpTopic ? ` data-help-topic="${e(options.helpTopic)}"` : ''}${options.disabled ? ' disabled' : ''}>${e(label)}</button>`;
  const actionGroup = (...items) => `<span class="publisher-channel-actions">${items.filter(Boolean).join('')}</span>`;
  const head = (title, action = '') => `<header class="publisher-channel-head"><div><h1>${e(title)}</h1></div>${action ? `<div class="publisher-channel-head__actions">${action}</div>` : ''}</header>`;
  const field = (label, value, raw = false) => `<div><dt>${e(label)}</dt><dd>${raw ? value : e(value)}</dd></div>`;
  const table = (headers, rows, options = {}) => `<div class="publisher-channel-table-wrap${options.compact ? ' is-compact' : ''}"><table class="publisher-channel-table${options.className ? ` ${e(options.className)}` : ''}"><thead><tr>${headers.map(item => `<th scope="col">${e(item)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((value,index) => `<td data-label="${e(headers[index] || '')}">${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  const dateValue = value => {
    const normalized = String(value || '').trim().replace(' ','T');
    if (!normalized) return null;
    const timestamp = new Date(normalized).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  };
  const rangeOverlaps = (itemStart, itemEnd, filterStart, filterEnd) => {
    const start = dateValue(itemStart) ?? Number.NEGATIVE_INFINITY;
    const end = dateValue(itemEnd) ?? Number.POSITIVE_INFINITY;
    const queryStart = dateValue(filterStart) ?? Number.NEGATIVE_INFINITY;
    const queryEnd = filterEnd ? dateValue(`${filterEnd}T23:59:59`) : Number.POSITIVE_INFINITY;
    return start <= queryEnd && end >= queryStart;
  };
  const effectiveChannelStatus = (channel, now = DEMO_NOW) => {
    if (['paused','stopped','risk_paused'].includes(channel.status)) return channel.status;
    const current = dateValue(now);
    if (channel.effectiveStart && current < dateValue(channel.effectiveStart)) return 'scheduled';
    if (channel.effectiveEnd && current >= dateValue(channel.effectiveEnd)) return 'ended';
    return 'active';
  };
  const canSupply = channel => effectiveChannelStatus(channel) === 'active';
  const formatDateTime = value => String(value || '').replace('T',' ').slice(0,16) || '—';
  const keywordMatches = (channel, keyword) => !keyword || `${channel.name} ${channel.id}`.toLocaleLowerCase().includes(String(keyword).toLocaleLowerCase());
  const filterBar = ({ language, scope, values, startLabel, endLabel }) => `<form class="publisher-channel-filters" data-channel-filter-form="${e(scope)}"><label><span>${tx(language,'渠道名称或编号','Channel name or ID')}</span><input value="${e(values.channelId)}" data-channel-filter-keyword aria-label="${tx(language,'渠道名称或编号','Channel name or ID')}"></label><label><span>${e(startLabel)}</span><input type="date" value="${e(values.start)}" data-channel-filter-start aria-label="${e(startLabel)}"></label><label><span>${e(endLabel)}</span><input type="date" value="${e(values.end)}" data-channel-filter-end aria-label="${e(endLabel)}"></label><div class="publisher-channel-filters__actions">${button(tx(language,'查询','Search'),'channel-filter-submit',{filterScope:scope})}${button(tx(language,'重置','Reset'),'channel-filter-reset',{secondary:true,filterScope:scope})}</div></form>`;

  const channelStatusMeta = (language, value) => ({ active:[tx(language,'合作中','Active'),'success'], scheduled:[tx(language,'待生效','Scheduled'),'warning'], paused:[tx(language,'已暂停','Paused'),'warning'], ended:[tx(language,'已结束','Ended'),'neutral'], stopped:[tx(language,'已停止','Stopped'),'neutral'], risk_paused:[tx(language,'风险暂停','Risk paused'),'danger'] }[value] || [e(value || '—'),'neutral']);
  const credentialStatusMeta = (language, value) => ({ pending:[tx(language,'待生成凭证','Credential pending'),'warning'], normal:[tx(language,'正常','Normal'),'success'], active:[tx(language,'正常','Normal'),'success'], paused:[tx(language,'已暂停','Paused'),'warning'], reset_required:[tx(language,'密钥待重置','Secret reset required'),'danger'], disabled:[tx(language,'已停用','Disabled'),'neutral'], not_applicable:[tx(language,'按文件供货','File supply'),'neutral'] }[value] || [tx(language,'待生成凭证','Credential pending'),'warning']);
  const fileStatusMeta = (language, value) => ({ downloaded:[tx(language,'已下载','Downloaded'),'success'], cancelled:[tx(language,'已取消','Cancelled'),'neutral'], expired:[tx(language,'已到期','Expired'),'neutral'], failed:[tx(language,'生成失败','Generation failed'),'danger'] }[value] || [e(value || '—'),'neutral']);

  const dialogShell = (language, id, title, body, footer = '', options = {}) => `<div class="publisher-channel-dialog-layer"><button type="button" class="publisher-channel-dialog-backdrop" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭浮层','Close overlay')}"></button><section class="publisher-channel-dialog${options.wide ? ' is-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${e(id)}"><header><h2 id="${e(id)}">${e(title)}</h2><button type="button" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭弹窗','Close dialog')}">×</button></header><div class="publisher-channel-dialog__body">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}</section></div>`;
  const drawerShell = (language, id, title, body) => `<div class="publisher-channel-drawer-layer"><button type="button" class="publisher-channel-dialog-backdrop" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭浮层','Close overlay')}"></button><aside class="publisher-channel-drawer" role="dialog" aria-modal="true" aria-labelledby="${e(id)}" data-channel-drawer="download-record"><header><h2 id="${e(id)}">${e(title)}</h2><button type="button" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭抽屉','Close drawer')}">×</button></header><div class="publisher-channel-drawer__body">${body}</div></aside></div>`;

  const renderCreateDialog = language => {
    const body = `<form class="publisher-channel-form" data-channel-create-form><label><span>${tx(language,'渠道名称','Channel name')}</span><input maxlength="50" aria-label="${tx(language,'渠道名称','Channel name')}" data-channel-name placeholder="${tx(language,'例如：NovaPlay 联运','For example: NovaPlay distribution')}"><em data-channel-name-error></em></label><label><span>${tx(language,'销售项','Product')}</span><select aria-label="${tx(language,'销售项','Product')}" data-channel-product>${fixture.products.map(product => `<option value="${e(product.id)}">${e(language === 'en' ? product.labelEn : product.label)} · ${e(product.id)}</option>`).join('')}</select></label><label><span>${tx(language,'供货方式','Supply method')}</span><select aria-label="${tx(language,'供货方式','Supply method')}" data-channel-delivery><option value="api">${tx(language,'接口自动发码','Automatic Key API')}</option><option value="file">${tx(language,'下载兑换码文件','Download Key file')}</option></select></label><label><span>${tx(language,'生效开始时间','Effective from')}</span><input type="datetime-local" value="${DEMO_NOW}" aria-label="${tx(language,'生效开始时间','Effective from')}" data-channel-effective-start><em data-channel-effective-start-error></em></label><label><span>${tx(language,'生效结束时间','Effective until')}</span><input type="datetime-local" aria-label="${tx(language,'生效结束时间','Effective until')}" data-channel-effective-end><small>${tx(language,'不填表示长期有效','Leave blank for no end date')}</small><em data-channel-effective-end-error></em></label></form><p class="publisher-channel-responsibility">${tx(language,'渠道销售、售后与结算由你与渠道自行约定。','You and the channel agree on sales, support, and settlement independently.')} ${actionLink(tx(language,'查看责任边界','View responsibilities'),'channel-help-open',{helpTopic:'channel-responsibility-boundary'})}</p>`;
    return dialogShell(language,'channel-create-title',tx(language,'创建渠道','Create channel'),body,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(tx(language,'创建渠道','Create channel'),'channel-create-submit')}`);
  };

  const renderApiDialog = (language, state, transientSecret) => {
    const channel = channelById(state,state.dialogChannelId);
    const meta = credentialStatusMeta(language,channel.credentialStatus);
    const generatedSecret = String(transientSecret || '');
    const clientId = channel.clientId || tx(language,'生成凭证后创建','Created with credentials');
    const secretBlock = generatedSecret
      ? `<section class="publisher-channel-secret"><strong>${tx(language,'Secret 仅显示一次','Secret is shown only once')}</strong><code>${e(generatedSecret)}</code><p>${tx(language,'关闭窗口后无法找回。请立即复制并通过安全方式保存。','It cannot be recovered after closing. Copy and store it securely now.')}</p>${actionLink(tx(language,'复制 Secret','Copy Secret'),'channel-secret-copy',{channelId:channel.id})}</section>`
      : channel.secretLast4
        ? `<section class="publisher-channel-secret is-masked"><strong>client_secret</strong><code>ghs_••••••••••${e(channel.secretLast4)}</code><p>${tx(language,'原值不能找回。如怀疑泄露，请轮换密钥。','The original value cannot be recovered. Rotate the Secret if exposure is suspected.')}</p></section>`
        : `<section class="publisher-channel-secret is-masked"><strong>${tx(language,'尚未生成渠道凭证','Credentials have not been generated')}</strong><p>${tx(language,'生成后 Secret 只显示一次，请提前准备安全的保存位置。','The Secret is shown once after generation. Prepare secure storage first.')}</p></section>`;
    const apiStats = channel.apiStats || { requests:0, succeeded:0, failed:0 };
    const apiRows = (channel.apiCalls || []).map(item => [e(item.orderId || '—'),e(item.requestId || '—'),e(item.skuId || '—'),status(item.result === 'success' ? tx(language,'成功','Success') : tx(language,'失败','Failed'),item.result === 'success' ? 'success' : 'danger'),e(item.errorCode || '—'),e(item.calledAt || '—')]);
    const apiAudit = `<dl class="publisher-channel-detail-grid is-counts">${field(tx(language,'请求量','Requests'),formatNumber(apiStats.requests))}${field(tx(language,'成功量','Succeeded'),formatNumber(apiStats.succeeded))}${field(tx(language,'失败量','Failed'),formatNumber(apiStats.failed))}${field(tx(language,'最近调用','Last used'),channel.lastUsedAt || '—')}</dl>${apiRows.length ? `<section class="publisher-channel-api-audit"><h3>${tx(language,'近期调用记录','Recent API calls')}</h3>${table([tx(language,'渠道订单','Channel order'),'request_id','SKU',tx(language,'结果','Result'),tx(language,'错误码','Error code'),tx(language,'调用时间','Called at')],apiRows,{compact:true})}</section>` : ''}`;
    const body = `<dl class="publisher-channel-detail-grid">${field(tx(language,'渠道','Channel'),`${channel.name} · ${channel.id}`)}${field(tx(language,'销售项','Products'),channel.productIds.map(id => productById(id)[language === 'en' ? 'labelEn' : 'label']).join('、'))}${field('client_id',clientId)}${field(tx(language,'API 地址','API endpoint'),'https://api.xiaoji.com/openapi/v1')}${field(tx(language,'接入状态','Access status'),status(meta[0],meta[1]),true)}${field(tx(language,'最后调用','Last used'),channel.lastUsedAt || '—')}</dl>${apiAudit}${secretBlock}<div class="publisher-channel-inline-actions">${channel.clientId ? actionLink(tx(language,'复制 client_id','Copy client_id'),'channel-client-id-copy',{channelId:channel.id}) : ''}${actionLink(tx(language,'查看接入教程','View integration guide'),'channel-help-open',{helpTopic:'channel-api-integration'})}</div><p class="publisher-channel-dialog__note">${tx(language,'渠道在订单支付成功后请求发码。同一渠道订单重复请求返回原结果；超时后应先查询原订单。','The channel requests a Key after payment. Retrying the same channel order returns the original result; query the original order after a timeout.')}</p>`;
    const primary = channel.credentialStatus === 'pending' ? button(tx(language,'生成渠道凭证','Generate credentials'),'channel-api-generate',{channelId:channel.id}) : channel.status === 'active' ? button(tx(language,'轮换密钥','Rotate Secret'),'channel-api-rotate',{channelId:channel.id}) : '';
    return dialogShell(language,'channel-api-access-title',tx(language,'API 接入信息','API access information'),body,`${button(tx(language,'关闭','Close'),'channel-dialog-close',{secondary:true})}${primary}`);
  };

  const renderApiRotateDialog = (language, state) => {
    const channel = channelById(state,state.dialogChannelId);
    const body = `<p class="publisher-channel-confirm-title">${tx(language,'新 Secret 生效后，旧 Secret 立即失效。','The old Secret becomes invalid as soon as the new one takes effect.')}</p><dl class="publisher-channel-detail-grid">${field(tx(language,'渠道','Channel'),channel.name)}${field('client_id',channel.clientId || '—')}${field(tx(language,'当前状态','Current status'),credentialStatusMeta(language,channel.credentialStatus)[0])}${field(tx(language,'最近调用','Last used'),channel.lastUsedAt || '—')}</dl><p class="publisher-channel-dialog__note is-warning">${tx(language,'请先确认渠道可以同步更新配置，避免正在进行的发码请求失败。新 Secret 仍只显示一次。','Confirm that the channel can update its configuration to avoid failed requests. The new Secret is also shown only once.')}</p>`;
    return dialogShell(language,'channel-api-rotate-title',tx(language,'确认轮换密钥','Confirm Secret rotation'),body,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(tx(language,'确认轮换','Confirm rotation'),'channel-api-rotate-confirm',{channelId:channel.id,danger:true})}`);
  };

  const renderFileCreateDialog = (language, state) => {
    const channel = channelById(state,state.dialogChannelId);
    const products = channel.productIds.map(productById);
    const retryBatch = state.fileBatches.find(item => item.id === state.dialogBatchId && item.status === 'failed');
    const skuId = retryBatch?.skuId || products[0]?.id || '';
    const quantity = retryBatch?.quantity || 100;
    const validUntil = retryBatch?.validUntil || '2027-03-31';
    const failureNotice = retryBatch?.failureReason ? `<p class="publisher-channel-dialog__note is-warning"><strong>${tx(language,'上次生成失败：','Previous attempt failed:')}</strong> ${e(retryBatch.failureReason)}</p>` : '';
    const body = `${failureNotice}<form class="publisher-channel-form" data-channel-file-form><label><span>${tx(language,'渠道','Channel')}</span><input value="${e(`${channel.name} · ${channel.id}`)}" readonly aria-label="${tx(language,'渠道','Channel')}"></label><label><span>${tx(language,'销售项','Product')}</span><select aria-label="${tx(language,'销售项','Product')}" data-channel-file-sku>${products.map(product => `<option value="${e(product.id)}"${product.id === skuId ? ' selected' : ''}>${e(language === 'en' ? product.labelEn : product.label)} · ${e(product.id)}</option>`).join('')}</select></label><label><span>${tx(language,'生成数量','Quantity')}</span><input type="number" min="1" max="100000" step="1" value="${e(quantity)}" aria-label="${tx(language,'生成数量','Quantity')}" data-channel-file-quantity><small>${tx(language,'单批可生成 1—100,000 个；用完可再创建新批次。','Each batch can contain 1–100,000 Keys. Create another batch when needed.')}</small><em data-channel-file-error></em></label><label><span>${tx(language,'有效期','Valid until')}</span><input type="date" value="${e(validUntil)}" min="2026-09-17" aria-label="${tx(language,'有效期','Valid until')}" data-channel-file-valid-until></label></form><p class="publisher-channel-dialog__note is-warning">${tx(language,'文件生成并触发下载后，Key 全部视为已交付；浏览器端取消保存也不回库。','Once the file is generated and the download starts, every Key is treated as delivered. Cancelling the browser save does not return Keys to inventory.')}</p>`;
    return dialogShell(language,'channel-file-create-title',retryBatch ? tx(language,'重新生成兑换码文件','Regenerate Key file') : tx(language,'创建兑换码文件','Create Key file'),body,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(retryBatch ? tx(language,'重新生成并下载','Regenerate and download') : tx(language,'生成并下载','Generate and download'),'channel-file-generate',{channelId:channel.id,batchId:retryBatch?.id})}`);
  };

  const renderDownloadRecordDialog = (language, state) => {
    const channel = channelById(state,state.dialogChannelId);
    const rows = state.downloads.filter(item => item.channelId === channel.id).map(item => [e(item.fileName),e(item.batchId),formatNumber(item.quantity),e(item.downloadedBy || '—'),e(item.downloadedAt || '—'),formatNumber(item.downloadCount || 1)]);
    const content = rows.length ? table([tx(language,'文件名','File name'),tx(language,'批次','Batch'),tx(language,'数量','Quantity'),tx(language,'下载账号','Downloaded by'),tx(language,'下载时间','Downloaded at'),tx(language,'次数','Count')],rows,{compact:true}) : `<div class="publisher-channel-empty"><h3>${tx(language,'暂无下载记录','No download records')}</h3><p>${tx(language,'文件完成下载后会在这里保留操作记录。','Completed downloads will be recorded here.')}</p></div>`;
    return drawerShell(language,'channel-download-record-title',tx(language,'下载记录','Download records'),`<div class="publisher-channel-dialog-context"><strong>${e(channel.name)}</strong><span>${e(channel.id)}</span></div>${content}`);
  };

  const renderStopDialog = (language, state) => {
    const channel = channelById(state,state.dialogChannelId);
    const keySummary = state.keyMetrics.filter(item => item.channelId === channel.id).reduce((result,item) => ({ issued:result.issued + Number(item.issued || 0), redeemed:result.redeemed + Number(item.redeemed || 0) }),{ issued:0, redeemed:0 });
    const body = `<dl class="publisher-channel-detail-grid is-counts">${field(tx(language,'已发放','Issued'),formatNumber(keySummary.issued))}${field(tx(language,'已兑换','Redeemed'),formatNumber(keySummary.redeemed))}${field(tx(language,'未兑换','Unredeemed'),formatNumber(Math.max(keySummary.issued - keySummary.redeemed,0)))}</dl><p class="publisher-channel-dialog__note is-warning">${tx(language,'停止后不再生成或发放新 Key；已下载 Key 不回库，仍按原有效期兑换。','Stopping blocks all new Key generation and issuance. Downloaded Keys do not return to inventory and remain redeemable until their original expiration date.')} ${actionLink(tx(language,'查看处理说明','View details'),'channel-help-open',{helpTopic:'channel-stop-delivery'})}</p><label class="publisher-channel-check"><input type="checkbox" aria-label="${tx(language,'我已了解停止合作后的影响','I understand the impact of stopping cooperation')}" data-channel-stop-ack><span>${tx(language,'我已了解停止合作后的影响','I understand the impact of stopping cooperation')}</span></label>`;
    return dialogShell(language,'channel-stop-title',tx(language,'停止渠道合作','Stop channel cooperation'),body,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(tx(language,'确认停止合作','Confirm stop'),'channel-stop-confirm',{channelId:channel.id,danger:true,disabled:true})}`);
  };

  const renderAnomalyDialog = (language, state) => {
    const channel = channelById(state,state.dialogChannelId);
    const rows = [['AN-202609-0031',tx(language,'兑换请求异常','Redemption request anomaly'),'NP-260910-8826',status(tx(language,'处理中','In progress'),'warning'),'2026-09-16 13:50'],['AN-202609-0029',tx(language,'同订单异参重试','Order retried with changed parameters'),'NP-260910-8818',status(tx(language,'已拦截','Blocked'),'danger'),'2026-09-16 13:20'],['AN-202609-0024',tx(language,'发码响应超时','Issuing response timed out'),'NP-260910-8802',status(tx(language,'已通过原订单恢复','Recovered by original order'),'success'),'2026-09-16 12:10']];
    return dialogShell(language,'channel-anomaly-title',tx(language,'异常记录','Anomaly records'),`<div class="publisher-channel-dialog-context"><strong>${e(channel.name)}</strong><span>${e(channel.id)}</span></div>${table([tx(language,'异常编号','Anomaly ID'),tx(language,'类型','Type'),tx(language,'渠道订单','Channel order'),tx(language,'状态','Status'),tx(language,'发现时间','Detected at')],rows,{compact:true})}<p class="publisher-channel-dialog__note">${tx(language,'异常只展示脱敏订单与处理结果，Key 明文不会写入页面日志。','Only masked orders and processing results are shown. Plaintext Keys are never written to page logs.')}</p>`,button(tx(language,'关闭','Close'),'channel-dialog-close',{secondary:true}),{wide:true});
  };

  const renderDialog = ({ language, state, transientSecret }) => ({ create:() => renderCreateDialog(language), 'api-access':() => renderApiDialog(language,state,transientSecret), 'api-rotate':() => renderApiRotateDialog(language,state), 'file-create':() => renderFileCreateDialog(language,state), 'download-record':() => renderDownloadRecordDialog(language,state), stop:() => renderStopDialog(language,state), anomaly:() => renderAnomalyDialog(language,state) }[state.dialog]?.() || '');

  const renderChannelActions = (language, channel, state) => {
    const hasDownload = state.downloads.some(item => item.channelId === channel.id);
    const downloadAction = channel.delivery === 'file' && hasDownload ? actionLink(tx(language,'查看下载记录','View download records'),'channel-download-record',{channelId:channel.id}) : '';
    const effectiveStatus = effectiveChannelStatus(channel);
    if (['stopped','ended'].includes(effectiveStatus)) return actionGroup(downloadAction,`<span class="publisher-channel-muted">${tx(language,'历史只读','History only')}</span>`);
    if (effectiveStatus === 'risk_paused') return actionGroup(actionLink(tx(language,'查看异常','View anomalies'),'channel-anomaly',{channelId:channel.id}),`<span class="publisher-channel-muted">${tx(language,'由平台处理','Handled by platform')}</span>`);
    const supplyAction = channel.delivery === 'api' ? actionLink(tx(language,'管理接入','Manage access'),'channel-api-access',{channelId:channel.id}) : canSupply(channel) ? actionLink(tx(language,'创建文件','Create file'),'channel-file-create',{channelId:channel.id}) : '';
    const availabilityAction = channel.status === 'paused' ? actionLink(tx(language,'恢复','Resume'),'channel-resume',{channelId:channel.id}) : actionLink(tx(language,'暂停','Pause'),'channel-pause',{channelId:channel.id});
    return actionGroup(supplyAction,downloadAction,availabilityAction,actionLink(tx(language,'停止合作','Stop cooperation'),'channel-stop',{channelId:channel.id,danger:true}));
  };

  const supplyTabs = (language, active) => `<nav class="publisher-channel-subtabs" role="tablist" aria-label="${tx(language,'渠道与供货','Channels & supply')}"><button type="button" role="tab" aria-selected="${active === 'channels'}" class="${active === 'channels' ? 'is-active' : ''}" data-portal-action="channel-supply-tab" data-channel-supply-tab="channels">${tx(language,'渠道管理','Channel management')}</button><button type="button" role="tab" aria-selected="${active === 'batches'}" class="${active === 'batches' ? 'is-active' : ''}" data-portal-action="channel-supply-tab" data-channel-supply-tab="batches">${tx(language,'文件批次','File batches')}</button></nav>`;

  const renderSupply = ({ language, state, transientSecret }) => {
    const filteredChannels = state.channels.filter(channel => keywordMatches(channel,state.channelFilters.channelId) && rangeOverlaps(channel.effectiveStart,channel.effectiveEnd,state.channelFilters.start,state.channelFilters.end));
    const filteredBatches = state.fileBatches.filter(batch => {
      const channel = channelById(state,batch.channelId);
      return keywordMatches(channel,state.batchFilters.channelId) && rangeOverlaps(batch.createdAt,batch.createdAt,state.batchFilters.start,state.batchFilters.end);
    });
    const channelRows = filteredChannels.map(channel => {
      const partnership = channelStatusMeta(language,effectiveChannelStatus(channel));
      const supply = channel.delivery === 'api' ? credentialStatusMeta(language,channel.credentialStatus) : [tx(language,'文件批次','File batches'),'neutral'];
      const productLabels = channel.productIds.map(id => productById(id)[language === 'en' ? 'labelEn' : 'label']);
      const latestDownloaded = state.downloads.filter(item => item.channelId === channel.id).sort((a,b) => String(b.downloadedAt).localeCompare(String(a.downloadedAt)))[0];
      const supplyState = channel.delivery === 'file' && latestDownloaded ? status(tx(language,'已下载','Downloaded'),'success') : status(supply[0],supply[1]);
      const effectivePeriod = channel.effectiveEnd ? `${formatDateTime(channel.effectiveStart)} — ${formatDateTime(channel.effectiveEnd)}` : `${formatDateTime(channel.effectiveStart)} — ${tx(language,'长期有效','No end date')}`;
      return [`<span class="publisher-channel-row-title"><strong>${e(channel.name)}</strong><small>${e(channel.id)}</small></span>`,`<span class="publisher-channel-product-list">${productLabels.map(label => `<span>${e(label)}</span>`).join('')}</span>`,e(channel.delivery === 'api' ? tx(language,'接口自动发码','Automatic Key API') : tx(language,'下载兑换码文件','Download Key file')),status(partnership[0],partnership[1]),supplyState,e(effectivePeriod),e(channel.lastDeliveredAt || '—'),renderChannelActions(language,channel,state)];
    });
    const batchRows = filteredBatches.map(batch => {
      const channel = channelById(state,batch.channelId);
      const product = productById(batch.skuId);
      const meta = fileStatusMeta(language,batch.status);
      let action = '—';
      if (batch.status === 'downloaded') action = actionLink(tx(language,'查看下载记录','View download records'),'channel-download-record',{channelId:batch.channelId,batchId:batch.id});
      if (batch.status === 'failed') action = actionLink(tx(language,'查看原因并重新生成','Review and retry'),'channel-file-retry',{channelId:batch.channelId,batchId:batch.id});
      const batchStatus = batch.status === 'failed' && batch.failureReason ? `<span class="publisher-channel-row-title">${status(meta[0],meta[1])}<small>${e(batch.failureReason)}</small></span>` : status(meta[0],meta[1]);
      const createdOrDownloadedAt = batch.downloadedAt || batch.createdAt || '—';
      return [e(batch.id),`<span class="publisher-channel-row-title"><strong>${e(channel.name)}</strong><small>${e(channel.id)}</small></span>`,`<span class="publisher-channel-row-title"><strong>${e(language === 'en' ? product.labelEn : product.label)}</strong><small>${e(product.id)}</small></span>`,formatNumber(batch.quantity),e(batch.validUntil || '—'),batchStatus,e(createdOrDownloadedAt),action];
    });
    const activeTab = state.supplyTab === 'batches' ? 'batches' : 'channels';
    const helpAction = actionLink(tx(language,'使用说明','Guide'),'channel-help-open',{helpTopic:'channel-distribution-overview'});
    const headActions = activeTab === 'channels' ? actionGroup(helpAction,button(tx(language,'创建渠道','Create channel'),'channel-create-open')) : helpAction;
    const channelsFilter = filterBar({ language, scope:'channels', values:state.channelFilters, startLabel:tx(language,'生效开始日期','Effective start date'), endLabel:tx(language,'生效结束日期','Effective end date') });
    const batchesFilter = filterBar({ language, scope:'batches', values:state.batchFilters, startLabel:tx(language,'创建开始日期','Created from'), endLabel:tx(language,'创建结束日期','Created to') });
    const channelsPanel = `<section class="publisher-channel-card" role="tabpanel"><header><h2>${tx(language,'渠道列表','Channel list')}</h2></header>${channelsFilter}${table([tx(language,'渠道名称／编号','Channel / ID'),tx(language,'销售项','Products'),tx(language,'供货方式','Supply method'),tx(language,'合作状态','Cooperation'),tx(language,'API 或文件状态','API / file status'),tx(language,'生效时间','Effective period'),tx(language,'最近供货时间','Last supplied'),tx(language,'操作','Actions')],channelRows,{className:'publisher-channel-table--channels'})}</section>`;
    const batchesPanel = `<section class="publisher-channel-card" role="tabpanel"><header><h2>${tx(language,'文件批次','File batches')}</h2></header>${batchesFilter}${table([tx(language,'批次编号','Batch ID'),tx(language,'渠道','Channel'),tx(language,'销售项／SKU','Product / SKU'),tx(language,'生成数量','Quantity'),tx(language,'有效期','Valid until'),tx(language,'状态','Status'),tx(language,'创建／下载时间','Created / downloaded'),tx(language,'操作','Action')],batchRows,{className:'publisher-channel-table--batches'})}</section>`;
    return `${head(tx(language,'渠道与供货','Channels & supply'),headActions)}${supplyTabs(language,activeTab)}${activeTab === 'channels' ? channelsPanel : batchesPanel}${renderDialog({language,state,transientSecret})}`;
  };

  const renderRevenue = ({ language, state, transientSecret }) => {
    const filteredMetrics = state.keyMetrics.map(item => {
      const channel = channelById(state,item.channelId);
      if (!keywordMatches(channel,state.distributionFilters.channelId)) return null;
      const periods = (Array.isArray(item.periods) ? item.periods : [{ issuedAt:item.lastDeliveredAt, issued:item.issued, redeemed:item.redeemed }]).filter(period => rangeOverlaps(period.issuedAt,period.issuedAt,state.distributionFilters.start,state.distributionFilters.end));
      if (!periods.length) return null;
      return { ...item, issued:periods.reduce((sum,period) => sum + Number(period.issued || 0),0), redeemed:periods.reduce((sum,period) => sum + Number(period.redeemed || 0),0) };
    }).filter(Boolean);
    const rows = filteredMetrics.map(item => {
      const channel = channelById(state,item.channelId);
      const product = productById(item.skuId);
      const issued = Number(item.issued || 0);
      const redeemed = Number(item.redeemed || 0);
      const unredeemed = Math.max(issued - redeemed,0);
      const rate = issued ? `${(redeemed / issued * 100).toFixed(1)}%` : '—';
      const productType = product.type === 'dlc' ? 'DLC' : tx(language,'本体','Base game');
      const delivery = channel.delivery === 'api' ? tx(language,'接口自动发码','Automatic Key API') : tx(language,'下载兑换码文件','Download Key file');
      return [`<span class="publisher-channel-row-title"><strong>${e(channel.name)}</strong><small>${e(channel.id)}</small></span>`,e(productType),`<code>${e(product.id)}</code>`,e(delivery),formatNumber(issued),formatNumber(redeemed),formatNumber(unredeemed),e(rate)];
    });
    const totals = filteredMetrics.reduce((result,item) => ({ issued:result.issued + Number(item.issued || 0), redeemed:result.redeemed + Number(item.redeemed || 0) }),{ issued:0, redeemed:0 });
    const totalUnredeemed = Math.max(totals.issued - totals.redeemed,0);
    const totalRate = totals.issued ? `${(totals.redeemed / totals.issued * 100).toFixed(1)}%` : '—';
    const metricCards = `<div class="publisher-channel-metrics">${metric(tx(language,'发放量','Issued'),formatNumber(totals.issued))}${metric(tx(language,'兑换量','Redeemed'),formatNumber(totals.redeemed))}${metric(tx(language,'未兑换量','Unredeemed'),formatNumber(totalUnredeemed))}${metric(tx(language,'兑换率','Redemption rate'),totalRate)}</div>`;
    const helpAction = actionLink(tx(language,'数据口径','Metric definitions'),'channel-help-open',{helpTopic:'channel-key-metrics'});
    const filters = filterBar({ language, scope:'distribution', values:state.distributionFilters, startLabel:tx(language,'Key 发放开始日期','Key issued from'), endLabel:tx(language,'Key 发放结束日期','Key issued to') });
    return `${head(tx(language,'分销数据','Distribution data'),helpAction)}${filters}${metricCards}<section class="publisher-channel-card"><header><h2>${tx(language,'Key 发放与兑换','Key issuance and redemption')}</h2></header>${table([tx(language,'渠道','Channel'),tx(language,'销售项','Product type'),'SKU',tx(language,'供货方式','Supply method'),tx(language,'发放量','Issued'),tx(language,'兑换量','Redeemed'),tx(language,'未兑换量','Unredeemed'),tx(language,'兑换率','Redemption rate')],rows,{className:'publisher-channel-table--distribution'})}</section>${renderDialog({language,state,transientSecret})}`;
  };

  const renderers = { 'channel-supply':renderSupply, 'channel-revenue':renderRevenue };
  const render = ({ section, language = 'zh', state = {}, demoState = {}, transientSecret = '' }) => {
    const distribution = createState(state.channelDistribution || state);
    const runtimeSecret = transientSecret || demoState.channelTransientSecret || '';
    return `<section class="publisher-channel" data-publisher-channel="${e(section)}">${(renderers[section] || renderSupply)({ language, state:distribution, transientSecret:runtimeSecret })}</section>`;
  };

  window.PublisherChannelDistribution = { fixture, createState, render, effectiveChannelStatus, rangeOverlaps, canSupply };
  namespace.publisherChannelDistribution = window.PublisherChannelDistribution;
})(window.GameHubDeveloperPortal);

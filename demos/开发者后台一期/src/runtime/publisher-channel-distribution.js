window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};

(function registerPublisherChannelDistribution(namespace) {
  const e = value => namespace.components.escapeHtml(String(value ?? ''));
  const tx = (language, zh, en) => language === 'en' ? en : zh;
  const copy = value => JSON.parse(JSON.stringify(value));

  const fixture = Object.freeze({
    products: [
      { id:'BASE-GLOBAL', type:'base', name:'星海远征', nameEn:'Starward Odyssey', label:'星海远征 · 本体', labelEn:'Starward Odyssey · Base game' },
      { id:'DLC-SEASON-01', type:'dlc', name:'远航季票', nameEn:'Voyage Season Pass', label:'远航季票 · DLC', labelEn:'Voyage Season Pass · DLC' },
    ],
    channels: [
      { id:'CH-240901', name:'NovaPlay Store', delivery:'api', productIds:['BASE-GLOBAL','DLC-SEASON-01'], status:'active', credentialStatus:'normal', clientId:'cli_np_20260901', secretLast4:'7Q4X', issued:1640, sold:1282, redeemed:1268, lastDeliveredAt:'2026-09-16 14:22', lastUsedAt:'2026-09-16 14:22', counts:{ apiUnredeemed:372, fileExposed:0, soldUnredeemed:14, redeemed:1268, pendingReport:1, pendingAdjustment:2 } },
      { id:'CH-240902', name:'ArcadeX 文件渠道', delivery:'file', productIds:['BASE-GLOBAL'], status:'active', credentialStatus:'not_applicable', issued:300, sold:0, redeemed:42, lastDeliveredAt:'2026-09-12 10:06', counts:{ apiUnredeemed:0, fileExposed:300, soldUnredeemed:0, redeemed:42, pendingReport:258, pendingAdjustment:0 } },
      { id:'CH-240903', name:'北美线下渠道', delivery:'api', productIds:['BASE-GLOBAL'], status:'paused', credentialStatus:'paused', clientId:'cli_na_20260818', secretLast4:'2K8M', issued:480, sold:411, redeemed:397, lastDeliveredAt:'2026-09-08 18:40', counts:{ apiUnredeemed:83, fileExposed:0, soldUnredeemed:14, redeemed:397, pendingReport:0, pendingAdjustment:1 } },
      { id:'CH-240904', name:'PixelMall 待接入', delivery:'api', productIds:['DLC-SEASON-01'], status:'active', credentialStatus:'pending', clientId:'', secretLast4:'', issued:0, sold:0, redeemed:0, lastDeliveredAt:'—', counts:{ apiUnredeemed:0, fileExposed:0, soldUnredeemed:0, redeemed:0, pendingReport:0, pendingAdjustment:0 } },
      { id:'CH-240905', name:'CloudPlay 清算渠道', delivery:'api', productIds:['BASE-GLOBAL'], status:'clearing', credentialStatus:'disabled', clientId:'cli_cp_20260709', secretLast4:'9P1R', issued:920, sold:876, redeemed:851, lastDeliveredAt:'2026-09-01 09:14', stoppedAt:'2026-09-02 11:00', clearingUntil:'2026-10-02 11:00', counts:{ apiUnredeemed:69, fileExposed:0, soldUnredeemed:25, redeemed:851, pendingReport:3, pendingAdjustment:5 } },
      { id:'CH-240906', name:'旧版合作渠道', delivery:'api', productIds:['BASE-GLOBAL'], status:'stopped', credentialStatus:'disabled', clientId:'cli_legacy_202602', secretLast4:'6N3W', issued:310, sold:296, redeemed:291, lastDeliveredAt:'2026-07-31 20:18', stoppedAt:'2026-08-01 00:00', clearingUntil:'2026-08-31 00:00', counts:{ apiUnredeemed:19, fileExposed:0, soldUnredeemed:5, redeemed:291, pendingReport:0, pendingAdjustment:0 } },
      { id:'CH-240907', name:'异常监控渠道', delivery:'api', productIds:['BASE-GLOBAL'], status:'risk_paused', credentialStatus:'reset_required', clientId:'cli_risk_202609', secretLast4:'1D8V', issued:86, sold:71, redeemed:65, lastDeliveredAt:'2026-09-15 21:09', counts:{ apiUnredeemed:21, fileExposed:0, soldUnredeemed:6, redeemed:65, pendingReport:4, pendingAdjustment:1 } },
    ],
    fileBatches: [
      { id:'FB-20260916-0006', channelId:'CH-240902', skuId:'BASE-GLOBAL', quantity:8000, validUntil:'2027-03-31', status:'generating', createdAt:'2026-09-16 14:30' },
      { id:'FB-20260915-0005', channelId:'CH-240902', skuId:'BASE-GLOBAL', quantity:500, validUntil:'2027-03-31', status:'ready', createdAt:'2026-09-15 16:20' },
      { id:'FB-20260912-0004', channelId:'CH-240902', skuId:'BASE-GLOBAL', quantity:300, validUntil:'2027-03-31', status:'downloaded', createdAt:'2026-09-12 10:02', downloadedAt:'2026-09-12 10:06' },
      { id:'FB-20260910-0003', channelId:'CH-240902', skuId:'BASE-GLOBAL', quantity:100, validUntil:'2027-01-31', status:'cancelled', createdAt:'2026-09-10 12:40' },
      { id:'FB-20260418-0002', channelId:'CH-240902', skuId:'BASE-GLOBAL', quantity:80, validUntil:'2026-08-31', status:'expired', createdAt:'2026-04-18 09:10' },
      { id:'FB-20260908-0001', channelId:'CH-240902', skuId:'BASE-GLOBAL', quantity:260, validUntil:'2027-03-31', status:'failed', createdAt:'2026-09-08 17:52', failureReason:'生成服务暂时不可用，未产生或暴露任何 Key。' },
    ],
    downloads: [
      { id:'DL-20260912-0001', channelId:'CH-240902', batchId:'FB-20260912-0004', fileName:'gamehub_CH-240902_FB-20260912-0004.csv', quantity:300, downloadedAt:'2026-09-12 10:06', downloadedBy:'当前开发者', downloadCount:1, keyFingerprints:[] },
    ],
    sales: [
      { id:'SALE-NP-BASE-USD', channelId:'CH-240901', productType:'base', productName:'星海远征', productNameEn:'Starward Odyssey', skuId:'BASE-GLOBAL', currency:'USD', sold:1282, refunds:14, chargebacks:0, salesAmount:16647.18, netAmount:16467.32, estimatedRevenue:11527.12, dataStatus:'updated', updatedAt:'2026-09-16 14:22', shareRate:0.7 },
      { id:'SALE-NP-DLC-USD', channelId:'CH-240901', productType:'dlc', productName:'远航季票', productNameEn:'Voyage Season Pass', skuId:'DLC-SEASON-01', currency:'USD', sold:186, refunds:3, chargebacks:1, salesAmount:3346.14, netAmount:3274.18, estimatedRevenue:2291.93, dataStatus:'updated', updatedAt:'2026-09-16 14:18', shareRate:0.7 },
      { id:'SALE-NP-BASE-EUR', channelId:'CH-240901', productType:'base', productName:'星海远征', productNameEn:'Starward Odyssey', skuId:'BASE-GLOBAL', currency:'EUR', sold:92, refunds:1, chargebacks:0, salesAmount:1195.08, netAmount:1182.09, estimatedRevenue:827.46, dataStatus:'late_adjustment', updatedAt:'2026-09-16 13:44', shareRate:0.7 },
      { id:'SALE-AX-BASE-USD', channelId:'CH-240902', productType:'base', productName:'星海远征', productNameEn:'Starward Odyssey', skuId:'BASE-GLOBAL', currency:'USD', sold:null, refunds:null, chargebacks:null, salesAmount:null, netAmount:null, estimatedRevenue:null, dataStatus:'pending_import', updatedAt:'—', shareRate:0.7 },
      { id:'SALE-NA-BASE-USD', channelId:'CH-240903', productType:'base', productName:'星海远征', productNameEn:'Starward Odyssey', skuId:'BASE-GLOBAL', currency:'USD', sold:411, refunds:6, chargebacks:2, salesAmount:5338.89, netAmount:5234.97, estimatedRevenue:null, dataStatus:'missing_share_rule', updatedAt:'2026-09-15 22:10', shareRate:null },
    ],
  });

  const createState = source => {
    const value = source && typeof source === 'object' ? source : {};
    return {
      activeChannelId:String(value.activeChannelId || ''),
      dialog:String(value.dialog || ''),
      dialogChannelId:String(value.dialogChannelId || ''),
      dialogBatchId:String(value.dialogBatchId || ''),
      channels:Array.isArray(value.channels) && value.channels.length ? copy(value.channels) : copy(fixture.channels),
      fileBatches:Array.isArray(value.fileBatches) ? copy(value.fileBatches) : copy(fixture.fileBatches),
      sales:Array.isArray(value.sales) ? copy(value.sales) : copy(fixture.sales),
      salesEvents:Array.isArray(value.salesEvents) ? copy(value.salesEvents) : [],
      downloads:Array.isArray(value.downloads) ? copy(value.downloads) : copy(fixture.downloads),
    };
  };

  const productById = id => fixture.products.find(item => item.id === id) || { id, type:'base', name:id, nameEn:id, label:id, labelEn:id };
  const channelById = (state, id) => state.channels.find(item => item.id === id) || state.channels[0] || fixture.channels[0];
  const formatNumber = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '—';
  const formatMoney = (value, currency) => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? '—' : `${currency} ${Number(value).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const status = (label, tone = 'success') => `<span class="publisher-channel-status is-${e(tone)}">${e(label)}</span>`;
  const metric = (label, value, note = '') => `<article class="publisher-channel-metric"><span>${e(label)}</span><strong class="number">${e(value)}</strong>${note ? `<small>${e(note)}</small>` : ''}</article>`;
  const button = (label, action, options = {}) => `<button type="button" class="${options.secondary ? 'publisher-channel-secondary' : options.danger ? 'publisher-channel-danger' : 'publisher-channel-primary'}" data-portal-action="${e(action)}"${options.channelId ? ` data-channel-id="${e(options.channelId)}"` : ''}${options.batchId ? ` data-batch-id="${e(options.batchId)}"` : ''}${options.helpTopic ? ` data-help-topic="${e(options.helpTopic)}"` : ''}${options.disabled ? ' disabled' : ''}>${e(label)}</button>`;
  const actionLink = (label, action, options = {}) => `<button type="button" class="publisher-channel-link${options.danger ? ' is-danger' : ''}" data-portal-action="${e(action)}"${options.channelId ? ` data-channel-id="${e(options.channelId)}"` : ''}${options.batchId ? ` data-batch-id="${e(options.batchId)}"` : ''}${options.helpTopic ? ` data-help-topic="${e(options.helpTopic)}"` : ''}${options.disabled ? ' disabled' : ''}>${e(label)}</button>`;
  const actionGroup = (...items) => `<span class="publisher-channel-actions">${items.filter(Boolean).join('')}</span>`;
  const head = (title, action = '', description = '') => `<header class="publisher-channel-head"><div><h1>${e(title)}</h1>${description ? `<p>${e(description)}</p>` : ''}</div>${action ? `<div class="publisher-channel-head__actions">${action}</div>` : ''}</header>`;
  const field = (label, value, raw = false) => `<div><dt>${e(label)}</dt><dd>${raw ? value : e(value)}</dd></div>`;
  const table = (headers, rows, options = {}) => `<div class="publisher-channel-table-wrap${options.compact ? ' is-compact' : ''}"><table class="publisher-channel-table${options.className ? ` ${e(options.className)}` : ''}"><thead><tr>${headers.map(item => `<th scope="col">${e(item)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  const channelStatusMeta = (language, value) => ({ active:[tx(language,'合作中','Active'),'success'], paused:[tx(language,'已暂停','Paused'),'warning'], clearing:[tx(language,'清算中','Clearing'),'warning'], stopped:[tx(language,'已停止','Stopped'),'neutral'], risk_paused:[tx(language,'风险暂停','Risk paused'),'danger'] }[value] || [e(value || '—'),'neutral']);
  const credentialStatusMeta = (language, value) => ({ pending:[tx(language,'待生成凭证','Credential pending'),'warning'], normal:[tx(language,'正常','Normal'),'success'], active:[tx(language,'正常','Normal'),'success'], paused:[tx(language,'已暂停','Paused'),'warning'], reset_required:[tx(language,'密钥待重置','Secret reset required'),'danger'], disabled:[tx(language,'已停用','Disabled'),'neutral'], not_applicable:[tx(language,'按文件供货','File supply'),'neutral'] }[value] || [tx(language,'待生成凭证','Credential pending'),'warning']);
  const fileStatusMeta = (language, value) => ({ generating:[tx(language,'生成中','Generating'),'warning'], ready:[tx(language,'待下载','Ready to download'),'warning'], downloaded:[tx(language,'已下载','Downloaded'),'success'], cancelled:[tx(language,'已取消','Cancelled'),'neutral'], expired:[tx(language,'已到期','Expired'),'neutral'], failed:[tx(language,'生成失败','Generation failed'),'danger'] }[value] || [e(value || '—'),'neutral']);
  const salesStatusMeta = (language, value) => ({ updated:[tx(language,'已更新','Updated'),'success'], pending_import:[tx(language,'待导入','Awaiting import'),'warning'], late_adjustment:[tx(language,'含后续调整','Includes later adjustment'),'warning'], missing_share_rule:[tx(language,'未配置分成','Revenue share missing'),'danger'] }[value] || [e(value || '—'),'neutral']);

  const dialogShell = (language, id, title, body, footer = '', options = {}) => `<div class="publisher-channel-dialog-layer"><button type="button" class="publisher-channel-dialog-backdrop" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭浮层','Close overlay')}"></button><section class="publisher-channel-dialog${options.wide ? ' is-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${e(id)}"><header><h2 id="${e(id)}">${e(title)}</h2><button type="button" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭弹窗','Close dialog')}">×</button></header><div class="publisher-channel-dialog__body">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}</section></div>`;

  const renderCreateDialog = language => {
    const body = `<form class="publisher-channel-form" data-channel-create-form><label><span>${tx(language,'渠道名称','Channel name')}</span><input maxlength="50" aria-label="${tx(language,'渠道名称','Channel name')}" data-channel-name placeholder="${tx(language,'例如：NovaPlay 联运','For example: NovaPlay distribution')}"><small>${tx(language,'仅用于识别合作方，系统会自动生成不可变的渠道编号。','Used to identify the partner. The system creates an immutable channel ID.')}</small><em data-channel-name-error></em></label><label><span>${tx(language,'销售项','Product')}</span><select aria-label="${tx(language,'销售项','Product')}" data-channel-product>${fixture.products.map(product => `<option value="${e(product.id)}">${e(language === 'en' ? product.labelEn : product.label)} · ${e(product.id)}</option>`).join('')}</select></label><label><span>${tx(language,'供货方式','Supply method')}</span><select aria-label="${tx(language,'供货方式','Supply method')}" data-channel-delivery><option value="api">${tx(language,'接口自动发码','Automatic Key API')}</option><option value="file">${tx(language,'下载兑换码文件','Download Key file')}</option></select><small>${tx(language,'同一渠道仅使用一种供货方式。','Each channel uses one supply method only.')}</small></label></form>`;
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
    const body = `<dl class="publisher-channel-detail-grid">${field(tx(language,'渠道','Channel'),`${channel.name} · ${channel.id}`)}${field(tx(language,'销售项','Products'),channel.productIds.map(id => productById(id)[language === 'en' ? 'labelEn' : 'label']).join('、'))}${field('client_id',clientId)}${field(tx(language,'API 地址','API endpoint'),'https://api.xiaoji.com/openapi/v1')}${field(tx(language,'接入状态','Access status'),status(meta[0],meta[1]),true)}${field(tx(language,'最后调用','Last used'),channel.lastUsedAt || '—')}</dl>${secretBlock}<div class="publisher-channel-inline-actions">${channel.clientId ? actionLink(tx(language,'复制 client_id','Copy client_id'),'channel-client-id-copy',{channelId:channel.id}) : ''}${actionLink(tx(language,'查看接入教程','View integration guide'),'channel-help-open',{helpTopic:'channel-api-integration'})}</div><p class="publisher-channel-dialog__note">${tx(language,'渠道在订单支付成功后请求发码。同一渠道订单重复请求返回原结果；超时后应先查询原订单。','The channel requests a Key after payment. Retrying the same channel order returns the original result; query the original order after a timeout.')}</p>`;
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
    const body = `${failureNotice}<form class="publisher-channel-form" data-channel-file-form><label><span>${tx(language,'渠道','Channel')}</span><input value="${e(`${channel.name} · ${channel.id}`)}" readonly aria-label="${tx(language,'渠道','Channel')}"></label><label><span>${tx(language,'销售项','Product')}</span><select aria-label="${tx(language,'销售项','Product')}" data-channel-file-sku>${products.map(product => `<option value="${e(product.id)}"${product.id === skuId ? ' selected' : ''}>${e(language === 'en' ? product.labelEn : product.label)} · ${e(product.id)}</option>`).join('')}</select></label><label><span>${tx(language,'生成数量','Quantity')}</span><input type="number" min="1" max="10000" step="1" value="${e(quantity)}" aria-label="${tx(language,'生成数量','Quantity')}" data-channel-file-quantity><small>${tx(language,'当前单文件最多生成 10,000 个，请按实际交付量填写。','A single file can currently contain up to 10,000 Keys.')}</small><em data-channel-file-error></em></label><label><span>${tx(language,'有效期','Valid until')}</span><input type="date" value="${e(validUntil)}" min="2026-09-17" aria-label="${tx(language,'有效期','Valid until')}" data-channel-file-valid-until></label></form><p class="publisher-channel-dialog__note is-warning">${tx(language,'下载成功后，文件中的 Key 全部记为已暴露，不得回库或重复分配。','After download, every Key in the file is exposed and cannot return to stock or be allocated again.')}</p>`;
    return dialogShell(language,'channel-file-create-title',retryBatch ? tx(language,'重新生成兑换码文件','Regenerate Key file') : tx(language,'创建兑换码文件','Create Key file'),body,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(retryBatch ? tx(language,'重新生成并下载','Regenerate and download') : tx(language,'生成并下载','Generate and download'),'channel-file-generate',{channelId:channel.id,batchId:retryBatch?.id})}`);
  };

  const renderDownloadRecordDialog = (language, state) => {
    const channel = channelById(state,state.dialogChannelId);
    const rows = state.downloads.filter(item => item.channelId === channel.id).map(item => [e(item.fileName),e(item.batchId),formatNumber(item.quantity),e(item.downloadedBy || '—'),e(item.downloadedAt || '—'),formatNumber(item.downloadCount || 1)]);
    const content = rows.length ? table([tx(language,'文件名','File name'),tx(language,'批次','Batch'),tx(language,'数量','Quantity'),tx(language,'下载账号','Downloaded by'),tx(language,'下载时间','Downloaded at'),tx(language,'次数','Count')],rows,{compact:true}) : `<div class="publisher-channel-empty"><h3>${tx(language,'暂无下载记录','No download records')}</h3><p>${tx(language,'文件完成下载后会在这里保留操作记录。','Completed downloads will be recorded here.')}</p></div>`;
    return dialogShell(language,'channel-download-record-title',tx(language,'下载记录','Download records'),`<div class="publisher-channel-dialog-context"><strong>${e(channel.name)}</strong><span>${e(channel.id)}</span></div>${content}<p class="publisher-channel-dialog__note">${tx(language,'页面不保存或回显明文 Key。已下载文件只展示审计信息。','Plaintext Keys are never stored or shown on this page. Only audit information is displayed for downloaded files.')}</p>`,button(tx(language,'关闭','Close'),'channel-dialog-close',{secondary:true}),{wide:true});
  };

  const renderStopDialog = (language, state) => {
    const channel = channelById(state,state.dialogChannelId);
    const counts = channel.counts || {};
    const body = `<div class="publisher-channel-impact"><p>${tx(language,'确认后渠道立即进入清算中，并按以下规则处理：','After confirmation, the channel enters clearing immediately:')}</p><ul><li>${tx(language,'立即停止新发码','Stop issuing new Keys immediately')}</li><li>${tx(language,'未下载文件取消','Cancel undownloaded files')}</li><li>${tx(language,'已下载 Key 不回库','Downloaded Keys never return to stock')}</li><li>${tx(language,'已售未兑换继续有效','Sold but unredeemed Keys remain valid')}</li><li>${tx(language,'保留 30 个自然日补报销售、退款和拒付','Allow 30 calendar days for sales, refund, and chargeback reports')}</li></ul></div><dl class="publisher-channel-detail-grid is-counts">${field(tx(language,'停止时间','Stop time'),'确认后立即')}${field(tx(language,'清算截止日','Clearing deadline'),'2026-10-16')}${field(tx(language,'API 已发未兑','API issued, unredeemed'),formatNumber(counts.apiUnredeemed || 0))}${field(tx(language,'文件已暴露','File Keys exposed'),formatNumber(counts.fileExposed || 0))}${field(tx(language,'已售未兑','Sold, unredeemed'),formatNumber(counts.soldUnredeemed || 0))}${field(tx(language,'已兑换','Redeemed'),formatNumber(counts.redeemed || channel.redeemed || 0))}${field(tx(language,'待补报','Pending report'),formatNumber(counts.pendingReport || 0))}${field(tx(language,'待调整','Pending adjustment'),formatNumber(counts.pendingAdjustment || 0))}</dl><label class="publisher-channel-check"><input type="checkbox" aria-label="${tx(language,'我已了解停止合作后的影响','I understand the impact of stopping cooperation')}" data-channel-stop-ack><span>${tx(language,'我已了解停止合作后的影响','I understand the impact of stopping cooperation')}</span></label>`;
    return dialogShell(language,'channel-stop-title',tx(language,'停止渠道合作','Stop channel cooperation'),body,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(tx(language,'确认停止合作','Confirm stop'),'channel-stop-confirm',{channelId:channel.id,danger:true,disabled:true})}`);
  };

  const renderAnomalyDialog = (language, state) => {
    const channel = channelById(state,state.dialogChannelId);
    const rows = [['AN-202609-0031',tx(language,'已兑换但销售未回传','Redeemed without sales report'),'NP-260910-8826',status(tx(language,'待补报','Pending report'),'warning'),'2026-09-16 13:50'],['AN-202609-0029',tx(language,'同订单异参重试','Order retried with changed parameters'),'NP-260910-8818',status(tx(language,'已拦截','Blocked'),'danger'),'2026-09-16 13:20'],['AN-202609-0024',tx(language,'发码响应超时','Issuing response timed out'),'NP-260910-8802',status(tx(language,'已通过原订单恢复','Recovered by original order'),'success'),'2026-09-16 12:10']];
    return dialogShell(language,'channel-anomaly-title',tx(language,'异常记录','Anomaly records'),`<div class="publisher-channel-dialog-context"><strong>${e(channel.name)}</strong><span>${e(channel.id)}</span></div>${table([tx(language,'异常编号','Anomaly ID'),tx(language,'类型','Type'),tx(language,'渠道订单','Channel order'),tx(language,'状态','Status'),tx(language,'发现时间','Detected at')],rows,{compact:true})}<p class="publisher-channel-dialog__note">${tx(language,'异常只展示脱敏订单与处理结果，Key 明文不会写入页面日志。','Only masked orders and processing results are shown. Plaintext Keys are never written to page logs.')}</p>`,button(tx(language,'关闭','Close'),'channel-dialog-close',{secondary:true}),{wide:true});
  };

  const renderDialog = ({ language, state, transientSecret }) => ({ create:() => renderCreateDialog(language), 'api-access':() => renderApiDialog(language,state,transientSecret), 'api-rotate':() => renderApiRotateDialog(language,state), 'file-create':() => renderFileCreateDialog(language,state), 'download-record':() => renderDownloadRecordDialog(language,state), stop:() => renderStopDialog(language,state), anomaly:() => renderAnomalyDialog(language,state) }[state.dialog]?.() || '');

  const renderChannelActions = (language, channel, state) => {
    if (channel.status === 'stopped') return `<span class="publisher-channel-muted">${tx(language,'历史只读','History only')}</span>`;
    if (channel.status === 'clearing') return actionGroup(actionLink(tx(language,'查看异常','View anomalies'),'channel-anomaly',{channelId:channel.id}));
    if (channel.status === 'risk_paused') return actionGroup(actionLink(tx(language,'查看异常','View anomalies'),'channel-anomaly',{channelId:channel.id}),`<span class="publisher-channel-muted">${tx(language,'由平台处理','Handled by platform')}</span>`);
    const supplyAction = channel.delivery === 'api' ? actionLink(tx(language,'管理接入','Manage access'),'channel-api-access',{channelId:channel.id}) : actionLink(tx(language,'创建文件','Create file'),'channel-file-create',{channelId:channel.id});
    const hasDownload = state.downloads.some(item => item.channelId === channel.id);
    const downloadAction = channel.delivery === 'file' && hasDownload ? actionLink(tx(language,'查看下载记录','View download records'),'channel-download-record',{channelId:channel.id}) : '';
    const availabilityAction = channel.status === 'paused' ? actionLink(tx(language,'恢复','Resume'),'channel-resume',{channelId:channel.id}) : actionLink(tx(language,'暂停','Pause'),'channel-pause',{channelId:channel.id});
    return actionGroup(supplyAction,downloadAction,availabilityAction,actionLink(tx(language,'停止合作','Stop cooperation'),'channel-stop',{channelId:channel.id,danger:true}));
  };

  const renderSupply = ({ language, state, transientSecret }) => {
    const channelRows = state.channels.map(channel => {
      const partnership = channelStatusMeta(language,channel.status);
      const supply = channel.delivery === 'api' ? credentialStatusMeta(language,channel.credentialStatus) : [tx(language,'文件批次','File batches'),'neutral'];
      const productLabels = channel.productIds.map(id => productById(id)[language === 'en' ? 'labelEn' : 'label']);
      const latestDownloaded = state.downloads.filter(item => item.channelId === channel.id).sort((a,b) => String(b.downloadedAt).localeCompare(String(a.downloadedAt)))[0];
      const supplyState = channel.delivery === 'file' && latestDownloaded ? status(tx(language,'已下载','Downloaded'),'success') : status(supply[0],supply[1]);
      return [`<span class="publisher-channel-row-title"><strong>${e(channel.name)}</strong><small>${e(channel.id)}</small></span>`,`<span class="publisher-channel-product-list">${productLabels.map(label => `<span>${e(label)}</span>`).join('')}</span>`,e(channel.delivery === 'api' ? tx(language,'接口自动发码','Automatic Key API') : tx(language,'下载兑换码文件','Download Key file')),status(partnership[0],partnership[1]),supplyState,formatNumber(channel.issued),formatNumber(channel.sold),formatNumber(channel.redeemed),e(channel.lastDeliveredAt || '—'),renderChannelActions(language,channel,state)];
    });
    const batchRows = state.fileBatches.map(batch => {
      const channel = channelById(state,batch.channelId);
      const product = productById(batch.skuId);
      const meta = fileStatusMeta(language,batch.status);
      let action = '—';
      if (batch.status === 'ready') action = actionGroup(actionLink(tx(language,'下载文件','Download file'),'channel-file-download',{channelId:batch.channelId,batchId:batch.id}),actionLink(tx(language,'取消','Cancel'),'channel-file-cancel',{channelId:batch.channelId,batchId:batch.id,danger:true}));
      if (batch.status === 'downloaded') action = actionLink(tx(language,'查看下载记录','View download records'),'channel-download-record',{channelId:batch.channelId,batchId:batch.id});
      if (batch.status === 'failed') action = actionLink(tx(language,'查看原因并重新生成','Review and retry'),'channel-file-retry',{channelId:batch.channelId,batchId:batch.id});
      const batchStatus = batch.status === 'failed' && batch.failureReason ? `<span class="publisher-channel-row-title">${status(meta[0],meta[1])}<small>${e(batch.failureReason)}</small></span>` : status(meta[0],meta[1]);
      return [e(batch.id),`<span class="publisher-channel-row-title"><strong>${e(channel.name)}</strong><small>${e(channel.id)}</small></span>`,e(language === 'en' ? product.labelEn : product.label),formatNumber(batch.quantity),e(batch.validUntil || '—'),batchStatus,e(batch.createdAt || '—'),action];
    });
    const activeCount = state.channels.filter(item => item.status === 'active').length;
    const issued = state.channels.reduce((sum,item) => sum + Number(item.issued || 0),0);
    const sold = state.channels.reduce((sum,item) => sum + Number(item.sold || 0),0);
    const redeemed = state.channels.reduce((sum,item) => sum + Number(item.redeemed || 0),0);
    return `${head(tx(language,'渠道与供货','Channels & supply'),button(tx(language,'创建渠道','Create channel'),'channel-create-open'),tx(language,'按渠道管理销售项、供货方式和合作状态。','Manage products, supply methods, and cooperation status by channel.'))}<div class="publisher-channel-notice"><div><strong>${tx(language,'企业认证通过后可直接创建渠道','Create channels after enterprise verification')}</strong><span>${tx(language,'接口渠道按已支付订单自动发码；文件渠道按实际需要创建和下载兑换码文件。','API channels issue one Key per paid order; file channels create downloadable Key files as needed.')}</span></div>${actionLink(tx(language,'查看使用说明','View guide'),'channel-help-open',{helpTopic:'channel-distribution-overview'})}</div><div class="publisher-channel-metrics">${metric(tx(language,'渠道数','Channels'),formatNumber(state.channels.length),tx(language,`${activeCount} 个合作中`,`${activeCount} active`))}${metric(tx(language,'已发放','Issued'),formatNumber(issued))}${metric(tx(language,'已售','Sold'),formatNumber(sold))}${metric(tx(language,'已兑换','Redeemed'),formatNumber(redeemed))}</div><section class="publisher-channel-card"><header><div><h2>${tx(language,'渠道列表','Channel list')}</h2><p>${tx(language,'渠道编号在创建后保持不变，改名不影响历史归属。','Channel IDs remain unchanged after creation and preserve history after renaming.')}</p></div></header>${table([tx(language,'渠道名称／编号','Channel / ID'),tx(language,'销售项','Products'),tx(language,'供货方式','Supply method'),tx(language,'合作状态','Cooperation'),tx(language,'API 或文件状态','API / file status'),tx(language,'已发放','Issued'),tx(language,'已售','Sold'),tx(language,'已兑换','Redeemed'),tx(language,'最近供货时间','Last supplied'),tx(language,'操作','Actions')],channelRows,{className:'publisher-channel-table--channels'})}</section><section class="publisher-channel-card"><header><div><h2>${tx(language,'文件批次','File batches')}</h2><p>${tx(language,'已下载文件只保留审计记录；未完整输出的下载不记为成功。','Downloaded files retain audit records only; incomplete transfers are not recorded as successful.')}</p></div></header>${table([tx(language,'批次编号','Batch ID'),tx(language,'渠道','Channel'),tx(language,'销售项','Product'),tx(language,'数量','Quantity'),tx(language,'有效期','Valid until'),tx(language,'状态','Status'),tx(language,'创建时间','Created at'),tx(language,'操作','Action')],batchRows,{className:'publisher-channel-table--batches'})}</section>${renderDialog({language,state,transientSecret})}`;
  };

  const renderRevenue = ({ language, state, transientSecret }) => {
    const rows = state.sales.map(item => {
      const channel = channelById(state,item.channelId);
      const meta = salesStatusMeta(language,item.dataStatus);
      const productType = item.productType === 'dlc' ? 'DLC' : tx(language,'本体','Base game');
      return [`<span class="publisher-channel-row-title"><strong>${e(channel.name)}</strong><small>${e(channel.id)}</small></span>`,e(productType),e(language === 'en' ? (item.productNameEn || item.productName) : item.productName),`<code>${e(item.skuId)}</code>`,e(item.currency),formatNumber(item.sold),formatNumber(item.refunds),formatNumber(item.chargebacks),formatMoney(item.salesAmount,item.currency),formatMoney(item.netAmount,item.currency),formatMoney(item.estimatedRevenue,item.currency),status(meta[0],meta[1]),e(item.updatedAt || '—')];
    });
    const updatedRows = state.sales.filter(item => item.salesAmount !== null && item.salesAmount !== undefined);
    const sold = updatedRows.reduce((sum,item) => sum + Number(item.sold || 0),0);
    const refunds = updatedRows.reduce((sum,item) => sum + Number(item.refunds || 0),0);
    const chargebacks = updatedRows.reduce((sum,item) => sum + Number(item.chargebacks || 0),0);
    const byCurrency = updatedRows.reduce((result,item) => { const currency = item.currency || '—'; if (!result[currency]) result[currency] = { sales:0, revenue:0, hasRevenue:false }; result[currency].sales += Number(item.salesAmount || 0); if (item.estimatedRevenue !== null && item.estimatedRevenue !== undefined) { result[currency].revenue += Number(item.estimatedRevenue); result[currency].hasRevenue = true; } return result; },{});
    const currencyMetrics = Object.entries(byCurrency).flatMap(([currency,value]) => [metric(tx(language,`${currency} 渠道回传销售额`,`${currency} reported sales`),formatMoney(value.sales,currency)),metric(tx(language,`${currency} 预估收益`,`${currency} estimated revenue`),value.hasRevenue ? formatMoney(value.revenue,currency) : '—')]).join('');
    const fileChannels = state.channels.filter(channel => channel.delivery === 'file');
    const targetOptions = fileChannels.length ? fileChannels.map(channel => `<option value="${e(channel.id)}">${e(channel.name)} · ${e(channel.id)}</option>`).join('') : `<option value="">${tx(language,'暂无文件渠道','No file channels')}</option>`;
    const importControls = `<select class="publisher-channel-secondary" aria-label="${tx(language,'选择导入渠道','Select import channel')}" data-channel-sales-target${fileChannels.length ? '' : ' disabled'}>${targetOptions}</select><input class="publisher-channel-file-input" type="file" accept=".csv,text/csv" aria-label="${tx(language,'选择销售清单文件','Choose sales statement file')}" data-channel-sales-file><button type="button" class="publisher-channel-primary" data-portal-action="channel-sales-import"${fileChannels.length ? '' : ' disabled'}>${tx(language,'导入销售清单','Import sales statement')}</button>`;
    return `${head(tx(language,'销售与收益','Sales & revenue'),importControls,tx(language,'销售金额来自渠道回传或开发者导入，预估收益不是平台财务结算凭证。','Sales values come from channel reports or imports. Estimated revenue is not a platform settlement record.'))}<div class="publisher-channel-notice is-neutral"><div><strong>${tx(language,'不同币种分开统计','Currencies are reported separately')}</strong><span>${tx(language,'销售净额为销售额减退款、拒付及已明确税费；未配置分成规则时不计算预估收益。','Net sales subtract refunds, chargebacks, and confirmed taxes. Estimated revenue requires a configured share rule.')}</span></div>${actionLink(tx(language,'查看数据口径','View metric definitions'),'channel-help-open',{helpTopic:'channel-revenue-metrics'})}</div><div class="publisher-channel-metrics publisher-channel-metrics--revenue">${metric(tx(language,'销售量','Sales'),formatNumber(sold))}${metric(tx(language,'退款量','Refunds'),formatNumber(refunds))}${metric(tx(language,'拒付量','Chargebacks'),formatNumber(chargebacks))}${currencyMetrics}</div><section class="publisher-channel-card"><header><div><h2>${tx(language,'渠道销售明细','Channel sales')}</h2><p>${tx(language,'按渠道、销售项、SKU 和币种归类。文件渠道未导入时不显示虚构金额。','Grouped by channel, product, SKU, and currency. File-channel amounts remain empty until imported.')}</p></div></header>${table([tx(language,'渠道','Channel'),tx(language,'销售项','Product type'),tx(language,'商品名称','Product'),'SKU',tx(language,'币种','Currency'),tx(language,'销量','Sales'),tx(language,'退款','Refunds'),tx(language,'拒付','Chargebacks'),tx(language,'销售额','Gross sales'),tx(language,'销售净额','Net sales'),tx(language,'预估收益','Estimated revenue'),tx(language,'数据状态','Data status'),tx(language,'最近更新时间','Last updated')],rows,{className:'publisher-channel-table--revenue'})}</section>${renderDialog({language,state,transientSecret})}`;
  };

  const renderers = { 'channel-supply':renderSupply, 'channel-revenue':renderRevenue };
  const render = ({ section, language = 'zh', state = {}, demoState = {}, transientSecret = '' }) => {
    const distribution = createState(state.channelDistribution || state);
    const runtimeSecret = transientSecret || demoState.channelTransientSecret || '';
    return `<section class="publisher-channel" data-publisher-channel="${e(section)}">${(renderers[section] || renderSupply)({ language, state:distribution, transientSecret:runtimeSecret })}</section>`;
  };

  window.PublisherChannelDistribution = { fixture, createState, render };
  namespace.publisherChannelDistribution = window.PublisherChannelDistribution;
})(window.GameHubDeveloperPortal);

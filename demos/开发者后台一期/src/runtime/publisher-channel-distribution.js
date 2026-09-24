window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};

(function registerPublisherChannelDistribution(namespace) {
  const e = value => namespace.components.escapeHtml(String(value ?? ''));
  const tx = (language, zh, en) => language === 'en' ? en : zh;
  const copy = value => JSON.parse(JSON.stringify(value));
  const DEMO_NOW = '2026-09-16T15:00';
  const DEFAULT_DISTRIBUTION_START = '2026-08-18';
  const DEFAULT_DISTRIBUTION_END = '2026-09-16';

  const fixture = Object.freeze({
    games: [
      { id:'GAME-48291', name:'星海远征', nameEn:'Starward Odyssey' },
      { id:'GAME-58302', name:'暮光边境', nameEn:'Twilight Frontier' },
    ],
    products: [
      { id:'BASE-GLOBAL', gameId:'GAME-48291', type:'base', name:'星海远征', nameEn:'Starward Odyssey', label:'星海远征 · 本体', labelEn:'Starward Odyssey · Base game' },
      { id:'DLC-SEASON-01', gameId:'GAME-48291', type:'dlc', name:'远航季票', nameEn:'Voyage Season Pass', label:'远航季票 · DLC', labelEn:'Voyage Season Pass · DLC' },
      { id:'TWILIGHT-BASE', gameId:'GAME-58302', type:'base', name:'暮光边境', nameEn:'Twilight Frontier', label:'暮光边境 · 本体', labelEn:'Twilight Frontier · Base game' },
      { id:'TWILIGHT-DLC', gameId:'GAME-58302', type:'dlc', name:'余晖之旅', nameEn:'Afterglow Journey', label:'余晖之旅 · DLC', labelEn:'Afterglow Journey · DLC' },
    ],
    channels: [
      { id:'CH-240901', name:'NovaPlay Store', effectiveStart:'2026-01-01T00:00', effectiveEnd:'', enabled:true, deleted:false, note:'API 合作渠道', createdAt:'2026-01-01 09:30', updatedAt:'2026-09-16 14:22' },
      { id:'CH-240902', name:'ArcadeX 文件渠道', effectiveStart:'2026-06-01T00:00', effectiveEnd:'', enabled:true, deleted:false, note:'文件方式供给', createdAt:'2026-06-01 10:00', updatedAt:'2026-09-12 10:06' },
      { id:'CH-240903', name:'北美线下渠道', effectiveStart:'2026-06-01T00:00', effectiveEnd:'', enabled:false, deleted:false, note:'合作暂缓', createdAt:'2026-06-01 11:20', updatedAt:'2026-09-08 18:40' },
      { id:'CH-240904', name:'PixelMall 待合作', effectiveStart:'2026-09-20T09:00', effectiveEnd:'', enabled:true, deleted:false, note:'计划 9 月接入', createdAt:'2026-09-10 09:00', updatedAt:'2026-09-10 09:00' },
      { id:'CH-240905', name:'CloudPlay 已结束', effectiveStart:'2026-01-01T00:00', effectiveEnd:'2026-09-02T11:00', enabled:true, deleted:false, note:'合作期已结束', createdAt:'2026-01-01 10:10', updatedAt:'2026-09-02 11:00' },
    ],
    batches: [
      { id:'BT-20260916-0006', name:'NovaPlay 暮光边境本体', gameId:'GAME-58302', channelId:'CH-240901', skuId:'TWILIGHT-BASE', delivery:'api', quantity:1000, validUntil:'', effectiveStart:'2026-09-01T00:00', effectiveEnd:'', enabled:true, deleted:false, supplyState:'active', clientId:'cli_np_twilight_202609', secretLast4:'6L2N', lastSuppliedAt:'2026-09-16 14:25', lastUsedAt:'2026-09-16 14:25', apiStats:{ requests:80, succeeded:80, failed:0 }, apiCalls:[], note:'同一企业渠道供给另一款游戏', createdAt:'2026-09-16 09:00', updatedAt:'2026-09-16 14:25' },
      { id:'BT-20260912-0004', name:'ArcadeX 九月文件批次', channelId:'CH-240902', gameId:'GAME-48291', skuId:'BASE-GLOBAL', delivery:'file', quantity:300, validUntil:'2027-03-31', effectiveStart:'2026-09-12T10:00', effectiveEnd:'2027-03-31T23:59', enabled:true, deleted:false, supplyState:'downloaded', downloadedAt:'2026-09-12 10:06', lastSuppliedAt:'2026-09-12 10:06', note:'九月常规投放', createdAt:'2026-09-12 10:02', updatedAt:'2026-09-12 10:06' },
      { id:'BT-20260910-0003', name:'ArcadeX 十月预备批次', channelId:'CH-240902', gameId:'GAME-48291', skuId:'BASE-GLOBAL', delivery:'file', quantity:1000, validUntil:'2027-06-30', effectiveStart:'2026-10-01T00:00', effectiveEnd:'2027-06-30T23:59', enabled:true, deleted:false, supplyState:'pending', lastSuppliedAt:'', note:'尚未下载', createdAt:'2026-09-10 12:40', updatedAt:'2026-09-10 12:40' },
      { id:'BT-20260901-0002', name:'NovaPlay 本体 API', channelId:'CH-240901', gameId:'GAME-48291', skuId:'BASE-GLOBAL', delivery:'api', quantity:100000, validUntil:'', effectiveStart:'2026-09-01T00:00', effectiveEnd:'', enabled:true, deleted:false, supplyState:'active', clientId:'cli_np_base_202609', secretLast4:'7Q4X', lastSuppliedAt:'2026-09-16 14:22', lastUsedAt:'2026-09-16 14:22', apiStats:{ requests:1602, succeeded:1400, failed:202 }, apiCalls:[{ orderId:'NP-****-8826', requestId:'req_****_7412', gameId:'GAME-48291', skuId:'BASE-GLOBAL', result:'success', errorCode:'', calledAt:'2026-09-16 14:22' },{ orderId:'NP-****-8818', requestId:'req_****_7399', gameId:'GAME-48291', skuId:'BASE-GLOBAL', result:'failed', errorCode:'IDEMPOTENCY_CONFLICT', calledAt:'2026-09-16 13:20' }], note:'本体接口供给', createdAt:'2026-09-01 09:10', updatedAt:'2026-09-16 14:22' },
      { id:'BT-20260901-0001', name:'NovaPlay DLC API', channelId:'CH-240901', gameId:'GAME-48291', skuId:'DLC-SEASON-01', delivery:'api', quantity:100000, validUntil:'', effectiveStart:'2026-09-01T00:00', effectiveEnd:'', enabled:true, deleted:false, supplyState:'active', clientId:'cli_np_dlc_202609', secretLast4:'3R8P', lastSuppliedAt:'2026-09-16 14:18', lastUsedAt:'2026-09-16 14:18', apiStats:{ requests:240, succeeded:240, failed:0 }, apiCalls:[], note:'DLC 接口供给', createdAt:'2026-09-01 09:00', updatedAt:'2026-09-16 14:18' },
      { id:'BT-20260818-0001', name:'北美线下 API', channelId:'CH-240903', gameId:'GAME-48291', skuId:'BASE-GLOBAL', delivery:'api', quantity:100000, validUntil:'', effectiveStart:'2026-08-18T00:00', effectiveEnd:'', enabled:true, deleted:false, supplyState:'active', clientId:'cli_na_20260818', secretLast4:'2K8M', lastSuppliedAt:'2026-09-08 18:40', lastUsedAt:'2026-09-08 18:40', apiStats:{ requests:480, succeeded:480, failed:0 }, apiCalls:[], note:'受渠道停用限制', createdAt:'2026-08-18 09:00', updatedAt:'2026-09-08 18:40' },
      { id:'BT-20260915-0005', name:'ArcadeX DLC 待接入', channelId:'CH-240902', gameId:'GAME-48291', skuId:'DLC-SEASON-01', delivery:'api', quantity:100000, validUntil:'', effectiveStart:'2026-09-15T00:00', effectiveEnd:'', enabled:true, deleted:false, supplyState:'pending_credentials', clientId:'', secretLast4:'', lastSuppliedAt:'', lastUsedAt:'', apiStats:{ requests:0, succeeded:0, failed:0 }, apiCalls:[], note:'待生成凭证', createdAt:'2026-09-15 10:00', updatedAt:'2026-09-15 10:00' },
      { id:'BT-20260914-0002', name:'ArcadeX 停用批次', channelId:'CH-240902', gameId:'GAME-48291', skuId:'DLC-SEASON-01', delivery:'file', quantity:120, validUntil:'2027-03-31', effectiveStart:'2026-09-14T00:00', effectiveEnd:'2027-03-31T23:59', enabled:false, deleted:false, supplyState:'pending', lastSuppliedAt:'', note:'开发者主动停用', createdAt:'2026-09-14 16:20', updatedAt:'2026-09-15 09:00' },
      { id:'BT-20260701-0001', name:'ArcadeX 已结束批次', channelId:'CH-240902', gameId:'GAME-48291', skuId:'BASE-GLOBAL', delivery:'file', quantity:80, validUntil:'2026-08-31', effectiveStart:'2026-07-01T00:00', effectiveEnd:'2026-08-31T23:59', enabled:true, deleted:false, supplyState:'downloaded', downloadedAt:'2026-07-01 09:30', lastSuppliedAt:'2026-07-01 09:30', note:'历史文件批次', createdAt:'2026-07-01 09:20', updatedAt:'2026-07-01 09:30' },
    ],
    downloads: [
      { id:'DL-20260912-0001', channelId:'CH-240902', batchId:'BT-20260912-0004', gameId:'GAME-48291', skuId:'BASE-GLOBAL', fileName:'盖世游戏兑换码_ArcadeX文件渠道_BT-20260912-0004.csv', quantity:300, downloadedAt:'2026-09-12 10:06', downloadedBy:'当前开发者', downloadCount:1, keyFingerprintDigest:'', fingerprintCount:300 },
    ],
    keyMetrics: [
      { gameId:'GAME-58302', channelId:'CH-240901', skuId:'TWILIGHT-BASE', delivery:'api', issued:80, redeemed:32, periods:[{issuedAt:'2026-09-16',issued:80,redeemed:32}], lastDeliveredAt:'2026-09-16 14:25', lastRedeemedAt:'2026-09-16 14:24' },
      { channelId:'CH-240901', gameId:'GAME-48291', skuId:'BASE-GLOBAL', delivery:'api', issued:1400, redeemed:1100, periods:[{issuedAt:'2026-08-25',issued:500,redeemed:390},{issuedAt:'2026-09-05',issued:420,redeemed:336},{issuedAt:'2026-09-16',issued:480,redeemed:374}], lastDeliveredAt:'2026-09-16 14:22', lastRedeemedAt:'2026-09-16 14:20' },
      { channelId:'CH-240901', gameId:'GAME-48291', skuId:'DLC-SEASON-01', delivery:'api', issued:240, redeemed:168, periods:[{issuedAt:'2026-09-16',issued:240,redeemed:168}], lastDeliveredAt:'2026-09-16 14:18', lastRedeemedAt:'2026-09-16 14:17' },
      { channelId:'CH-240902', gameId:'GAME-48291', skuId:'BASE-GLOBAL', delivery:'file', issued:300, redeemed:42, periods:[{issuedAt:'2026-09-12',issued:300,redeemed:42}], lastDeliveredAt:'2026-09-12 10:06', lastRedeemedAt:'2026-09-16 11:08' },
      { channelId:'CH-240903', gameId:'GAME-48291', skuId:'BASE-GLOBAL', delivery:'api', issued:480, redeemed:397, periods:[{issuedAt:'2026-09-08',issued:480,redeemed:397}], lastDeliveredAt:'2026-09-08 18:40', lastRedeemedAt:'2026-09-15 22:10' },
    ],
  });

  const gameById = id => fixture.games.find(item => item.id === id) || null;
  const productsForGame = gameId => fixture.products.filter(item => item.gameId === gameId);
  const resolveGameId = item => String(item.gameId || fixture.products.find(product => product.id === item.skuId)?.gameId || '');
  const validateBatchOwnership = (gameId, skuId) => {
    if (!gameById(gameId)) return { valid:false, error:'game' };
    if (!productsForGame(gameId).some(item => item.id === skuId)) return { valid:false, error:'sku' };
    return { valid:true, error:'' };
  };
  const gameLabel = (language, gameId) => {
    const game = gameById(gameId);
    return game ? `${language === 'en' ? game.nameEn : game.name} · ${game.id}` : gameId || tx(language,'待确认归属','Unresolved game');
  };
  const gameCell = (language, gameId) => {
    const game = gameById(gameId);
    return `<span class="publisher-channel-row-title"><strong>${e(game ? language === 'en' ? game.nameEn : game.name : tx(language,'待确认归属','Unresolved game'))}</strong><small>${e(gameId || '—')}</small></span>`;
  };
  const productOptions = (language, gameId, skuId = '') => `<option value="">${tx(language,'请选择商品 / SKU','Select product / SKU')}</option>${productsForGame(gameId).map(item => `<option value="${e(item.id)}"${item.id === skuId ? ' selected' : ''}>${e(language === 'en' ? item.labelEn : item.label)} · ${e(item.id)}</option>`).join('')}`;
  const updateBatchGameSelection = (form, gameId, language = 'zh') => {
    if (!form || form.dataset.batchCoreLocked === 'true') return false;
    const sku = form.querySelector('[data-channel-batch-sku]');
    if (!sku) return false;
    const selectedSku = validateBatchOwnership(gameId,sku.value).valid ? sku.value : '';
    sku.innerHTML = productOptions(language,gameId,selectedSku);
    sku.value = selectedSku;
    sku.disabled = !gameById(gameId);
    return true;
  };
  const channelImpact = (state, channelId) => {
    const batches = state.batches.filter(batch => !batch.deleted && batch.channelId === channelId);
    return { batchCount:batches.length, gameCount:new Set(batches.map(resolveGameId).filter(Boolean)).size };
  };

  const normalizeChannel = channel => ({
    id:String(channel.id || ''),
    name:String(channel.name || ''),
    effectiveStart:String(channel.effectiveStart || channel.cooperationStart || '2026-01-01T00:00'),
    effectiveEnd:String(channel.effectiveEnd || channel.cooperationEnd || ''),
    enabled:Object.prototype.hasOwnProperty.call(channel,'enabled') ? Boolean(channel.enabled) : !['paused','stopped','risk_paused'].includes(channel.status),
    deleted:Boolean(channel.deleted),
    note:String(channel.note || ''),
    createdAt:String(channel.createdAt || ''),
    updatedAt:String(channel.updatedAt || channel.lastDeliveredAt || channel.createdAt || ''),
    deletedAt:String(channel.deletedAt || ''),
  });
  const apiSucceeded = batch => Math.max(0,Number(batch?.apiStats?.succeeded || 0));
  const normalizedQuantity = batch => {
    const supplied = apiSucceeded(batch);
    const explicit = Number(batch?.quantity);
    if (batch?.delivery === 'api') return Number.isFinite(explicit) && explicit >= supplied ? explicit : supplied;
    return Math.max(0,Number(batch?.quantity || 0));
  };
  const apiRemaining = batch => Math.max(0,Number(batch?.quantity || 0) - apiSucceeded(batch));
  const normalizeBatch = batch => ({
    id:String(batch.id || ''),
    name:String(batch.name || batch.id || ''),
    channelId:String(batch.channelId || ''),
    gameId:resolveGameId(batch),
    skuId:String(batch.skuId || ''),
    delivery:batch.delivery === 'api' ? 'api' : 'file',
    quantity:normalizedQuantity(batch),
    quantityAdditions:Array.isArray(batch.quantityAdditions) ? copy(batch.quantityAdditions) : [],
    validUntil:String(batch.validUntil || ''),
    effectiveStart:String(batch.effectiveStart || batch.createdAt || DEMO_NOW),
    effectiveEnd:String(batch.effectiveEnd || (batch.delivery === 'file' ? batch.validUntil || '' : '')),
    enabled:Object.prototype.hasOwnProperty.call(batch,'enabled') ? Boolean(batch.enabled) : !['paused','cancelled'].includes(batch.status),
    deleted:Boolean(batch.deleted),
    supplyState:String(batch.supplyState || (batch.status === 'downloaded' ? 'downloaded' : batch.delivery === 'api' && batch.clientId ? 'active' : 'pending')),
    downloadedAt:String(batch.downloadedAt || ''),
    lastSuppliedAt:String(batch.lastSuppliedAt || batch.lastDeliveredAt || batch.downloadedAt || ''),
    clientId:String(batch.clientId || ''),
    secretLast4:String(batch.secretLast4 || ''),
    lastUsedAt:String(batch.lastUsedAt || ''),
    apiStats:{ requests:Number(batch.apiStats?.requests || 0), succeeded:apiSucceeded(batch), failed:Math.max(0,Number(batch.apiStats?.failed || 0)) },
    apiCalls:copy(batch.apiCalls || []),
    note:String(batch.note || ''),
    failureReason:String(batch.failureReason || ''),
    createdAt:String(batch.createdAt || ''),
    updatedAt:String(batch.updatedAt || batch.downloadedAt || batch.createdAt || ''),
    deletedAt:String(batch.deletedAt || ''),
  });

  const createState = source => {
    const value = source && typeof source === 'object' ? source : {};
    const filterValue = (filters, key, fallback = '') => Object.prototype.hasOwnProperty.call(filters || {},key) ? String(filters[key] ?? '') : fallback;
    const channelSource = Array.isArray(value.channels) ? value.channels : fixture.channels;
    const batchSource = Array.isArray(value.batches) ? value.batches : fixture.batches;
    return {
      games:copy(fixture.games),
      products:copy(fixture.products),
      activeChannelId:String(value.activeChannelId || ''),
      dialog:String(value.dialog || ''),
      dialogChannelId:String(value.dialogChannelId || ''),
      dialogBatchId:String(value.dialogBatchId || ''),
      dialogTargetType:String(value.dialogTargetType || ''),
      supplyTab:['channels','batches'].includes(value.supplyTab) ? value.supplyTab : 'channels',
      channelFilters:{
        keyword:filterValue(value.channelFilters,'keyword',filterValue(value.channelFilters,'channelId')),
        start:filterValue(value.channelFilters,'start'),
        end:filterValue(value.channelFilters,'end'),
        status:filterValue(value.channelFilters,'status'),
      },
      batchFilters:{
        gameId:filterValue(value.batchFilters,'gameId'),
        keyword:filterValue(value.batchFilters,'keyword'),
        channelId:filterValue(value.batchFilters,'channelId'),
        start:filterValue(value.batchFilters,'start'),
        end:filterValue(value.batchFilters,'end'),
        delivery:filterValue(value.batchFilters,'delivery'),
        status:filterValue(value.batchFilters,'status'),
      },
      distributionFilters:{ gameId:filterValue(value.distributionFilters,'gameId'), channelId:filterValue(value.distributionFilters,'channelId'), start:filterValue(value.distributionFilters,'start',DEFAULT_DISTRIBUTION_START), end:filterValue(value.distributionFilters,'end',DEFAULT_DISTRIBUTION_END) },
      channels:copy(channelSource).map(normalizeChannel),
      batches:copy(batchSource).map(normalizeBatch),
      downloads:(Array.isArray(value.downloads) ? copy(value.downloads) : copy(fixture.downloads)).map(item => ({ ...item, gameId:resolveGameId(item) })),
      keyMetrics:(Array.isArray(value.keyMetrics) ? copy(value.keyMetrics) : copy(fixture.keyMetrics)).map(item => ({ ...item, gameId:resolveGameId(item), delivery:item.delivery === 'api' ? 'api' : 'file' })),
    };
  };

  const productById = id => fixture.products.find(item => item.id === id) || { id, type:'base', name:id, nameEn:id, label:id, labelEn:id };
  const channelById = (state, id) => state.channels.find(item => item.id === id) || null;
  const batchById = (state, id) => state.batches.find(item => item.id === id) || null;
  const formatNumber = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '—';
  const status = (label, tone = 'success') => `<span class="publisher-channel-status is-${e(tone)}">${e(label)}</span>`;
  const metric = (label, value) => `<article class="publisher-channel-metric"><span>${e(label)}</span><strong class="number">${e(value)}</strong></article>`;
  const button = (label, action, options = {}) => `<button type="button" class="${options.secondary ? 'publisher-channel-secondary' : options.danger ? 'publisher-channel-danger' : 'publisher-channel-primary'}" data-portal-action="${e(action)}"${options.channelId ? ` data-channel-id="${e(options.channelId)}"` : ''}${options.batchId ? ` data-batch-id="${e(options.batchId)}"` : ''}${options.helpTopic ? ` data-help-topic="${e(options.helpTopic)}"` : ''}${options.filterScope ? ` data-filter-scope="${e(options.filterScope)}"` : ''}${options.disabled ? ' disabled' : ''}>${e(label)}</button>`;
  const actionLink = (label, action, options = {}) => `<button type="button" class="publisher-channel-link${options.danger ? ' is-danger' : ''}" data-portal-action="${e(action)}"${options.channelId ? ` data-channel-id="${e(options.channelId)}"` : ''}${options.batchId ? ` data-batch-id="${e(options.batchId)}"` : ''}${options.helpTopic ? ` data-help-topic="${e(options.helpTopic)}"` : ''}${options.disabled ? ' disabled' : ''}>${e(label)}</button>`;
  const actionGroup = (...items) => `<span class="publisher-channel-actions">${items.filter(Boolean).join('')}</span>`;
  const head = (title, action = '') => `<header class="publisher-channel-head"><div><h1>${e(title)}</h1></div>${action ? `<div class="publisher-channel-head__actions">${action}</div>` : ''}</header>`;
  const field = (label, value, raw = false) => `<div><dt>${e(label)}</dt><dd>${raw ? value : e(value)}</dd></div>`;
  const table = (headers, rows, options = {}) => `<div class="publisher-channel-table-wrap${options.compact ? ' is-compact' : ''}"><table class="publisher-channel-table${options.className ? ` ${e(options.className)}` : ''}"><thead><tr>${headers.map(item => `<th scope="col">${e(item)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(row => `<tr>${row.map((value,index) => `<td data-label="${e(headers[index] || '')}">${value}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}"><div class="publisher-channel-empty"><h3>${e(options.emptyLabel || '暂无数据')}</h3></div></td></tr>`}</tbody></table></div>`;

  const dateValue = value => {
    const normalized = String(value || '').trim().replace(' ','T');
    if (!normalized) return null;
    const timestamp = new Date(normalized).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  };
  const endDateValue = value => {
    const raw = String(value || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? dateValue(`${raw}T23:59:59.999`)
      : dateValue(raw);
  };
  const rangeOverlaps = (itemStart, itemEnd, filterStart, filterEnd) => {
    const start = dateValue(itemStart) ?? Number.NEGATIVE_INFINITY;
    const end = endDateValue(itemEnd) ?? Number.POSITIVE_INFINITY;
    const queryStart = dateValue(filterStart) ?? Number.NEGATIVE_INFINITY;
    const queryEnd = filterEnd ? dateValue(`${filterEnd}T23:59:59`) : Number.POSITIVE_INFINITY;
    return start <= queryEnd && end >= queryStart;
  };
  const effectiveChannelStatus = (channel, now = DEMO_NOW) => {
    if (!channel || channel.deleted) return 'deleted';
    if (!channel.enabled) return 'disabled';
    const current = dateValue(now);
    if (channel.effectiveStart && current < dateValue(channel.effectiveStart)) return 'scheduled';
    if (channel.effectiveEnd && current > endDateValue(channel.effectiveEnd)) return 'ended';
    return 'active';
  };
  const batchHasEnded = (batch, now = DEMO_NOW) => Boolean(batch?.effectiveEnd && dateValue(now) > endDateValue(batch.effectiveEnd));
  const effectiveBatchStatus = (batch, channel, now = DEMO_NOW) => {
    if (!batch || batch.deleted) return 'deleted';
    if (!batch.enabled) return 'disabled';
    const channelState = effectiveChannelStatus(channel,now);
    if (channelState !== 'active') return 'channel_restricted';
    const current = dateValue(now);
    if (batch.effectiveStart && current < dateValue(batch.effectiveStart)) return 'scheduled';
    if (batchHasEnded(batch,now)) return 'ended';
    if (batch.delivery === 'file' && batch.supplyState === 'downloaded') return 'downloaded';
    if (batch.delivery === 'api' && apiRemaining(batch) <= 0) return 'exhausted';
    if (batch.delivery === 'api' && !batch.clientId) return 'pending_access';
    return 'active';
  };
  const canSupply = channel => effectiveChannelStatus(channel) === 'active';
  const batchOwnershipValid = batch => Boolean(batch && validateBatchOwnership(resolveGameId(batch),batch.skuId).valid);
  const canSupplyBatch = (batch, channel) => batchOwnershipValid(batch) && ['active','pending_access'].includes(effectiveBatchStatus(batch,channel));
  const canDownloadFileBatch = batch => Boolean(batchOwnershipValid(batch) && !batch.deleted && batch.delivery === 'file' && batch.supplyState === 'pending');
  const batchCoreLocked = batch => Boolean(batch && (batch.delivery === 'file' ? batch.supplyState === 'downloaded' || batch.downloadedAt : Number(batch.apiStats?.requests || 0) > 0 || batch.lastSuppliedAt));
  const formatDateTime = value => String(value || '').replace('T',' ').slice(0,16) || '—';
  const keywordMatches = (item, keyword, fields = ['name','id']) => !keyword || fields.map(key => item?.[key] || '').join(' ').toLocaleLowerCase().includes(String(keyword).toLocaleLowerCase());
  const dateOnly = value => String(value || '').slice(0,10);
  const monthToken = value => /^\d{4}-\d{2}$/.test(String(value || '')) ? String(value) : dateOnly(value).slice(0,7) || DEMO_NOW.slice(0,7);
  const addMonths = (value, offset) => {
    const [year,month] = monthToken(value).split('-').map(Number);
    const date = new Date(year,month - 1 + Number(offset || 0),1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}`;
  };
  const calendarMonth = ({ language, month, start, end, minDate = '' }) => {
    const [year,monthNumber] = month.split('-').map(Number);
    const firstDay = new Date(year,monthNumber - 1,1);
    const dayCount = new Date(year,monthNumber,0).getDate();
    const leading = (firstDay.getDay() + 6) % 7;
    const weekdays = language === 'en' ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : ['一','二','三','四','五','六','日'];
    const cells = Array.from({ length:leading },() => '<span class="publisher-channel-calendar__blank" aria-hidden="true"></span>');
    for (let day = 1; day <= dayCount; day += 1) {
      const date = `${month}-${String(day).padStart(2,'0')}`;
      const selected = date === start || date === end;
      const inRange = Boolean(start && end && date > start && date < end);
      const disabled = Boolean(minDate && date < minDate);
      cells.push(`<button type="button" class="publisher-channel-calendar__day${selected ? ' is-selected' : ''}${inRange ? ' is-in-range' : ''}" data-channel-date-action="day" data-date="${e(date)}" aria-label="${e(date)}"${date === DEMO_NOW.slice(0,10) ? ' aria-current="date"' : ''}${disabled ? ' disabled' : ''}>${day}</button>`);
    }
    return `<section class="publisher-channel-calendar"><h4>${language === 'en' ? `${firstDay.toLocaleString('en-US',{month:'long'})} ${year}` : `${year} 年 ${monthNumber} 月`}</h4><div class="publisher-channel-calendar__week">${weekdays.map(day => `<span>${e(day)}</span>`).join('')}</div><div class="publisher-channel-calendar__days">${cells.join('')}</div></section>`;
  };
  const renderDatePopover = ({ language = 'zh', baseMonth = DEMO_NOW.slice(0,7), draftStart = '', draftEnd = '', showPresets = true, allowOpenEnd = false, minDate = '' } = {}) => {
    const presets = [['昨日','Yesterday','2026-09-15','2026-09-15'],['今日','Today','2026-09-16','2026-09-16'],['近 7 天','Last 7 days','2026-09-10','2026-09-16'],['近 30 天','Last 30 days','2026-08-18','2026-09-16'],['上月','Last month','2026-08-01','2026-08-31'],['本月','This month','2026-09-01','2026-09-16']];
    const presetMatched = presets.some(item => item[2] === dateOnly(draftStart) && item[3] === dateOnly(draftEnd));
    const shortcuts = showPresets ? `<aside class="publisher-channel-date-picker__presets">${presets.map(item => `<button type="button"${item[2] === dateOnly(draftStart) && item[3] === dateOnly(draftEnd) ? ' class="is-active"' : ''} data-channel-date-action="preset" data-range-start="${item[2]}" data-range-end="${item[3]}">${tx(language,item[0],item[1])}</button>`).join('')}<button type="button"${presetMatched ? '' : ' class="is-active"'} data-channel-date-action="custom">${tx(language,'自定义','Custom')}</button></aside>` : '';
    const currentMonth = monthToken(baseMonth);
    const nextMonth = addMonths(currentMonth,1);
    const applyDisabled = !dateOnly(draftStart) || (!allowOpenEnd && !dateOnly(draftEnd));
    return `<div class="publisher-channel-date-picker__layout${showPresets ? '' : ' without-presets'}">${shortcuts}<div class="publisher-channel-date-picker__main"><header><button type="button" data-channel-date-action="previous-month" aria-label="${tx(language,'上一个月','Previous month')}">‹</button><span>${dateOnly(draftStart) || tx(language,'请选择开始日期','Select a start date')}${draftEnd ? ` — ${dateOnly(draftEnd)}` : allowOpenEnd && draftStart ? ` — ${tx(language,'长期有效','No end date')}` : ''}</span><button type="button" data-channel-date-action="next-month" aria-label="${tx(language,'下一个月','Next month')}">›</button></header><div class="publisher-channel-date-picker__calendars">${calendarMonth({ language, month:currentMonth, start:dateOnly(draftStart), end:dateOnly(draftEnd), minDate })}${calendarMonth({ language, month:nextMonth, start:dateOnly(draftStart), end:dateOnly(draftEnd), minDate })}</div><footer>${allowOpenEnd ? `<button type="button" class="publisher-channel-date-picker__long-term" data-channel-date-action="long-term">${tx(language,'长期有效','No end date')}</button>` : '<span></span>'}<div><button type="button" class="publisher-channel-secondary" data-channel-date-action="cancel">${tx(language,'取消','Cancel')}</button><button type="button" class="publisher-channel-primary" data-channel-date-action="apply"${applyDisabled ? ' disabled' : ''}>${tx(language,'应用','Apply')}</button></div></footer></div></div>`;
  };
  const dateRangeField = ({ language, label, start = '', end = '', mode = 'filter', showPresets = true, allowOpenEnd = false, startAttribute, endAttribute, dialogLabel, className = '' }) => {
    const normalizedStart = dateOnly(start);
    const normalizedEnd = dateOnly(end);
    const display = normalizedStart ? `${normalizedStart}${normalizedEnd ? ` — ${normalizedEnd}` : allowOpenEnd ? ` — ${tx(language,'长期有效','No end date')}` : ''}` : tx(language,'全部时间','All time');
    const baseMonth = monthToken(normalizedStart || DEMO_NOW);
    const minDate = mode === 'effective' && !normalizedStart ? DEMO_NOW.slice(0,10) : '';
    return `<div class="publisher-channel-date-range${mode === 'effective' ? ' is-effective' : ''}${className ? ` ${e(className)}` : ''}" data-channel-date-range data-date-mode="${e(mode)}" data-base-month="${e(baseMonth)}" data-draft-start="${e(normalizedStart)}" data-draft-end="${e(normalizedEnd)}" data-show-presets="${showPresets}" data-allow-open-end="${allowOpenEnd}" data-min-date="${e(minDate)}"><span class="publisher-channel-date-range__label">${e(label)}</span><button type="button" class="publisher-channel-date-range__trigger" data-channel-date-action="open" aria-label="${e(label)}"><span data-channel-date-display>${e(display)}</span><b aria-hidden="true">⌄</b></button><input type="hidden" value="${e(start)}" ${startAttribute}><input type="hidden" value="${e(end)}" ${endAttribute}><div class="publisher-channel-date-picker" role="dialog" aria-label="${e(dialogLabel)}" data-channel-date-popover hidden>${renderDatePopover({ language, baseMonth, draftStart:normalizedStart, draftEnd:normalizedEnd, showPresets, allowOpenEnd, minDate })}</div></div>`;
  };

  const channelStatusMeta = (language, value) => ({ active:[tx(language,'合作中','Active'),'success'], scheduled:[tx(language,'待生效','Scheduled'),'warning'], disabled:[tx(language,'已停用','Disabled'),'neutral'], ended:[tx(language,'已结束','Ended'),'neutral'], deleted:[tx(language,'已删除','Deleted'),'neutral'] }[value] || [String(value || '—'),'neutral']);
  const batchStatusMeta = (language, value) => ({ active:[tx(language,'供给中','Supplying'),'success'], scheduled:[tx(language,'待生效','Scheduled'),'warning'], disabled:[tx(language,'已停用','Disabled'),'neutral'], ended:[tx(language,'已结束','Ended'),'neutral'], exhausted:[tx(language,'已用完','Exhausted'),'warning'], channel_restricted:[tx(language,'受渠道限制','Restricted by channel'),'warning'], downloaded:[tx(language,'已下载','Downloaded'),'success'], pending_access:[tx(language,'待接入','Integration pending'),'warning'], deleted:[tx(language,'已删除','Deleted'),'neutral'] }[value] || [String(value || '—'),'neutral']);
  const deliveryLabel = (language, delivery) => delivery === 'api' ? tx(language,'接口取码','Key API') : tx(language,'下载兑换码文件','Download Key file');
  const periodLabel = (language, start, end) => `${formatDateTime(start)} — ${end ? formatDateTime(end) : tx(language,'长期有效','No end date')}`;

  const dialogShell = (language, id, title, body, footer = '', options = {}) => `<div class="publisher-channel-dialog-layer"><button type="button" class="publisher-channel-dialog-backdrop" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭浮层','Close overlay')}"></button><section class="publisher-channel-dialog${options.wide ? ' is-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${e(id)}"><header><h2 id="${e(id)}">${e(title)}</h2><button type="button" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭弹窗','Close dialog')}">×</button></header><div class="publisher-channel-dialog__body">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}</section></div>`;
  const drawerShell = (language, id, title, body, footer = '') => `<div class="publisher-channel-drawer-layer"><button type="button" class="publisher-channel-dialog-backdrop" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭浮层','Close overlay')}"></button><aside class="publisher-channel-drawer" role="dialog" aria-modal="true" aria-labelledby="${e(id)}"><header><h2 id="${e(id)}">${e(title)}</h2><button type="button" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭抽屉','Close drawer')}">×</button></header><div class="publisher-channel-drawer__body">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}</aside></div>`;
  const statusRadios = (language, name, selected = false, attribute = '') => `<fieldset class="publisher-channel-form__full publisher-channel-radio-group"><legend>${tx(language,'状态','Status')}</legend><label><input type="radio" name="${e(name)}" value="false"${selected ? '' : ' checked'} ${attribute}>${tx(language,'停用','Disabled')}</label><label><input type="radio" name="${e(name)}" value="true"${selected ? ' checked' : ''} ${attribute}>${tx(language,'启用','Enabled')}</label></fieldset>`;

  const renderChannelFormDialog = (language, state, mode) => {
    const channel = mode === 'edit' ? channelById(state,state.dialogChannelId) : null;
    const title = mode === 'edit' ? tx(language,'编辑渠道','Edit channel') : tx(language,'创建渠道','Create channel');
    const start = channel?.effectiveStart || DEMO_NOW;
    const end = channel?.effectiveEnd || '';
    const body = `<form class="publisher-channel-form" data-channel-form data-channel-form-mode="${e(mode)}"><label class="publisher-channel-form__full"><span>${tx(language,'渠道名称','Channel name')}</span><input maxlength="50" value="${e(channel?.name || '')}" aria-label="${tx(language,'渠道名称','Channel name')}" data-channel-name><em data-channel-name-error></em></label>${dateRangeField({ language, label:tx(language,'合作时间','Cooperation period'), start, end, mode:'effective', showPresets:false, allowOpenEnd:true, startAttribute:'data-channel-effective-start', endAttribute:'data-channel-effective-end', dialogLabel:tx(language,'选择合作时间','Select cooperation period'), className:'publisher-channel-form__full' })}<em class="publisher-channel-date-range__error" data-channel-effective-start-error></em><em class="publisher-channel-date-range__error" data-channel-effective-end-error></em>${statusRadios(language,'channel-enabled',mode === 'edit' ? channel?.enabled !== false : false,'data-channel-enabled')}<label class="publisher-channel-form__full"><span>${tx(language,'备注','Note')}</span><textarea maxlength="200" aria-label="${tx(language,'备注','Note')}" data-channel-note>${e(channel?.note || '')}</textarea></label></form>`;
    const submitAction = mode === 'edit' ? 'channel-edit-submit' : 'channel-create-submit';
    return drawerShell(language,`channel-${mode}-title`,title,body,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(mode === 'edit' ? tx(language,'保存','Save') : tx(language,'创建','Create'),submitAction,{channelId:channel?.id})}`);
  };
  const renderChannelDetailDialog = (language, state) => {
    const channel = channelById(state,state.dialogChannelId);
    if (!channel) return '';
    const meta = channelStatusMeta(language,effectiveChannelStatus(channel));
    const body = `<dl class="publisher-channel-detail-grid">${field(tx(language,'渠道名称','Channel name'),channel.name)}${field(tx(language,'渠道编号','Channel ID'),channel.id)}${field(tx(language,'合作时间','Cooperation period'),periodLabel(language,channel.effectiveStart,channel.effectiveEnd))}${field(tx(language,'状态','Status'),status(meta[0],meta[1]),true)}${field(tx(language,'备注','Note'),channel.note || '—')}${field(tx(language,'更新时间','Updated at'),channel.updatedAt || '—')}</dl>`;
    return drawerShell(language,'channel-detail-title',tx(language,'渠道详情','Channel details'),body,button(tx(language,'关闭','Close'),'channel-dialog-close',{secondary:true}));
  };
  const renderBatchInventoryFields = (language, batch, locked, delivery) => {
    const isApi = delivery === 'api';
    const quantityLabel = isApi ? tx(language,'初始可取数量','Initial available quantity') : tx(language,'Key 数量','Key quantity');
    const quantityHelp = isApi ? tx(language,'单次 1～100,000；后续可在原批次追加','1–100,000 initially; more can be added later') : tx(language,'单批 1～100,000 个','1–100,000 Keys per batch');
    return `<div class="publisher-channel-form__pair" data-channel-batch-inventory-fields><label><span data-channel-batch-quantity-label>${quantityLabel}</span><input type="number" min="1" max="100000" step="1" value="${e(batch?.quantity || 100)}" aria-label="${quantityLabel}" data-channel-batch-quantity${locked ? ' disabled' : ''}><small data-channel-batch-quantity-help>${quantityHelp}</small><em data-channel-batch-quantity-error></em></label><label data-channel-batch-valid-until-field${isApi ? ' hidden' : ''}><span>${tx(language,'Key 有效期','Key valid until')}</span><input type="date" value="${e(batch?.validUntil || '2027-03-31')}" aria-label="${tx(language,'Key 有效期','Key valid until')}" data-channel-batch-valid-until${locked ? ' disabled' : ''}><em data-channel-batch-valid-until-error></em></label></div>`;
  };
  const renderBatchFormDialog = (language, state, mode) => {
    const batch = mode === 'edit' ? batchById(state,state.dialogBatchId) : null;
    const locked = batchCoreLocked(batch);
    const delivery = batch?.delivery || 'file';
    const start = batch?.effectiveStart || DEMO_NOW;
    const end = batch?.effectiveEnd || '';
    const channels = state.channels.filter(item => !item.deleted);
    if (!channels.length) return drawerShell(language,'batch-create-title',tx(language,'创建批次','Create batch'),`<div class="publisher-channel-empty"><h3>${tx(language,'请先创建企业渠道','Create an enterprise channel first')}</h3><p>${tx(language,'创建渠道后，即可为该渠道选择游戏和商品 / SKU，创建供给批次。','After creating a channel, select its game and product / SKU to create a supply batch.')}</p></div>`,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(tx(language,'去创建渠道','Create channel'),'channel-create-open')}`);
    const gameId = batch?.gameId || '';
    const title = mode === 'edit' ? tx(language,'编辑批次','Edit batch') : tx(language,'创建批次','Create batch');
    const body = `<form class="publisher-channel-form" data-channel-batch-form data-channel-form-mode="${e(mode)}" data-batch-core-locked="${locked}"><label class="publisher-channel-form__full"><span>${tx(language,'批次名称','Batch name')}</span><input maxlength="50" value="${e(batch?.name || '')}" aria-label="${tx(language,'批次名称','Batch name')}" data-channel-batch-name><em data-channel-batch-name-error></em></label><label><span>${tx(language,'所属渠道','Channel')}</span><select aria-label="${tx(language,'所属渠道','Channel')}" data-channel-batch-channel${locked ? ' disabled' : ''}>${channels.map(item => `<option value="${e(item.id)}"${item.id === batch?.channelId ? ' selected' : ''}>${e(item.name)} · ${e(item.id)}</option>`).join('')}</select><em data-channel-batch-channel-error></em></label><label><span>${tx(language,'所属游戏','Game')}</span><select aria-label="${tx(language,'所属游戏','Game')}" data-channel-batch-game${locked ? ' disabled' : ''}><option value="">${tx(language,'请选择游戏','Select game')}</option>${fixture.games.map(item => `<option value="${e(item.id)}"${item.id === gameId ? ' selected' : ''}>${e(gameLabel(language,item.id))}</option>`).join('')}</select><em data-channel-batch-game-error></em></label><label><span>${tx(language,'销售项','Product')}</span><select aria-label="${tx(language,'销售项','Product')}" data-channel-batch-sku${locked || !gameId ? ' disabled' : ''}>${productOptions(language,gameId,batch?.skuId)}</select><em data-channel-batch-sku-error></em></label><label><span>${tx(language,'供给方式','Supply method')}</span><select aria-label="${tx(language,'供给方式','Supply method')}" data-channel-batch-delivery${locked ? ' disabled' : ''}><option value="file">${tx(language,'下载兑换码文件','Download Key file')}</option><option value="api"${delivery === 'api' ? ' selected' : ''}>${tx(language,'接口取码','Key API')}</option></select><em data-channel-batch-delivery-error></em></label>${renderBatchInventoryFields(language,batch,locked,delivery)}${dateRangeField({ language, label:tx(language,'生效时间','Effective period'), start, end, mode:'effective', showPresets:false, allowOpenEnd:true, startAttribute:'data-channel-batch-effective-start', endAttribute:'data-channel-batch-effective-end', dialogLabel:tx(language,'选择生效时间','Select effective period'), className:'publisher-channel-form__full' })}<em class="publisher-channel-date-range__error" data-channel-batch-effective-start-error></em><em class="publisher-channel-date-range__error" data-channel-batch-effective-end-error></em>${statusRadios(language,'batch-enabled',mode === 'edit' ? batch?.enabled !== false : false,'data-channel-batch-enabled')}<label class="publisher-channel-form__full"><span>${tx(language,'备注','Note')}</span><textarea maxlength="200" aria-label="${tx(language,'备注','Note')}" data-channel-batch-note>${e(batch?.note || '')}</textarea></label></form>`;
    const submitAction = mode === 'edit' ? 'batch-edit-submit' : 'batch-create-submit';
    return drawerShell(language,`batch-${mode}-title`,title,body,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(mode === 'edit' ? tx(language,'保存','Save') : tx(language,'创建','Create'),submitAction,{batchId:batch?.id})}`);
  };
  const renderBatchDetailDialog = (language, state) => {
    const batch = batchById(state,state.dialogBatchId);
    const channel = batch ? channelById(state,batch.channelId) : null;
    if (!batch) return '';
    const product = productById(batch.skuId);
    const meta = batchStatusMeta(language,effectiveBatchStatus(batch,channel));
    const quantity = batch.delivery === 'api' ? `${formatNumber(apiRemaining(batch))} / ${formatNumber(batch.quantity)}` : formatNumber(batch.quantity);
    const body = `<dl class="publisher-channel-detail-grid">${field(tx(language,'批次名称','Batch name'),batch.name)}${field(tx(language,'批次编号','Batch ID'),batch.id)}${field(tx(language,'所属渠道','Channel'),channel ? `${channel.name} · ${channel.id}` : batch.channelId)}${field(tx(language,'所属游戏','Game'),gameLabel(language,batch.gameId))}${field(tx(language,'销售项','Product'),`${language === 'en' ? product.labelEn : product.label} · ${product.id}`)}${field(tx(language,'供给方式','Supply method'),deliveryLabel(language,batch.delivery))}${field(tx(language,'数量','Quantity'),quantity)}${field(tx(language,'生效时间','Effective period'),periodLabel(language,batch.effectiveStart,batch.effectiveEnd))}${field(tx(language,'状态','Status'),status(meta[0],meta[1]),true)}${field(tx(language,'最近供给','Last supplied'),batch.lastSuppliedAt || '—')}${field(tx(language,'备注','Note'),batch.note || '—')}</dl>`;
    return drawerShell(language,'batch-detail-title',tx(language,'批次详情','Batch details'),body,button(tx(language,'关闭','Close'),'channel-dialog-close',{secondary:true}));
  };
  const renderConfirmDialog = (language, state, targetType, operation) => {
    const isChannel = targetType === 'channel';
    const target = isChannel ? channelById(state,state.dialogChannelId) : batchById(state,state.dialogBatchId);
    if (!target) return '';
    const deleting = operation === 'delete';
    const title = deleting ? (isChannel ? tx(language,'删除渠道','Delete channel') : tx(language,'删除批次','Delete batch')) : (isChannel ? tx(language,'停用渠道','Disable channel') : tx(language,'停用批次','Disable batch'));
    const affected = isChannel ? channelImpact(state,target.id) : null;
    const impact = isChannel ? tx(language,`该企业渠道关联 ${affected.gameCount} 款游戏、${affected.batchCount} 个批次。渠道${deleting ? '删除' : '停用'}后，关联 API 批次停止新取码；未下载文件仍可首次下载，已发 Key 继续有效。`,`This enterprise channel has ${affected.batchCount} batches across ${affected.gameCount} games. ${deleting ? 'Deleting' : 'Disabling'} it stops new API issuance; pending files can still be downloaded once. Issued Keys remain valid.`) : tx(language,'该批次将停止新供给；已发 Key 继续有效。','This batch will stop new supply. Issued Keys remain valid.');
    const confirmAction = deleting ? `${targetType}-delete-confirm` : `${targetType}-disable-confirm`;
    const confirmLabel = deleting ? tx(language,'确认删除','Confirm deletion') : tx(language,'确认停用','Confirm disable');
    return dialogShell(language,`${targetType}-${operation}-title`,title,`<p class="publisher-channel-confirm-title">${e(target.name)}</p><p class="publisher-channel-dialog__note is-warning">${impact}</p>`,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(confirmLabel,confirmAction,{channelId:isChannel ? target.id : '',batchId:isChannel ? '' : target.id,danger:true})}`);
  };
  const renderApiDialog = (language, state, transientSecret) => {
    const batch = batchById(state,state.dialogBatchId);
    const channel = batch ? channelById(state,batch.channelId) : null;
    if (!batch || batch.delivery !== 'api') return '';
    const generatedSecret = String(transientSecret || '');
    const secretBlock = generatedSecret ? `<section class="publisher-channel-secret"><strong>${tx(language,'Secret 仅显示一次','Secret is shown only once')}</strong><code>${e(generatedSecret)}</code><p>${tx(language,'关闭窗口后无法找回，请立即安全保存。','It cannot be recovered after closing. Store it securely now.')}</p>${actionLink(tx(language,'复制 Secret','Copy Secret'),'batch-secret-copy',{batchId:batch.id})}</section>` : batch.secretLast4 ? `<section class="publisher-channel-secret is-masked"><strong>client_secret</strong><code>ghs_••••••••••${e(batch.secretLast4)}</code><p>${tx(language,'原值不可找回，可轮换 Secret。','The original value cannot be recovered. You can rotate the Secret.')}</p></section>` : `<section class="publisher-channel-secret is-masked"><strong>${tx(language,'尚未生成接入凭证','Credentials have not been generated')}</strong><p>${tx(language,'生成后 Secret 仅显示一次。','The Secret is shown once after generation.')}</p></section>`;
    const stats = batch.apiStats || { requests:0, succeeded:0, failed:0 };
    const requestCount = Number.isFinite(Number(stats.requests)) ? Number(stats.requests) : Number(stats.succeeded || 0) + Number(stats.failed || 0);
    const rows = (batch.apiCalls || []).map(item => {
      const succeeded = item.result === 'success' || item.status === 'succeeded';
      return [e(item.orderId || '—'),e(item.requestId || '—'),status(succeeded ? tx(language,'成功','Success') : tx(language,'失败','Failed'),succeeded ? 'success' : 'danger'),e(item.errorCode || '—'),e(item.calledAt || item.suppliedAt || '—')];
    });
    const audit = `<dl class="publisher-channel-detail-grid is-counts">${field(tx(language,'请求量','Requests'),formatNumber(requestCount))}${field(tx(language,'成功量','Succeeded'),formatNumber(stats.succeeded))}${field(tx(language,'失败量','Failed'),formatNumber(stats.failed))}${field(tx(language,'最近调用','Last used'),batch.lastUsedAt || batch.lastSuppliedAt || '—')}</dl>${rows.length ? `<section class="publisher-channel-api-audit"><h3>${tx(language,'近期调用记录','Recent API calls')}</h3>${table([tx(language,'渠道订单','Channel order'),'request_id',tx(language,'结果','Result'),tx(language,'错误码','Error code'),tx(language,'调用时间','Called at')],rows,{compact:true,emptyLabel:tx(language,'暂无调用','No calls')})}</section>` : ''}`;
    const body = `<dl class="publisher-channel-detail-grid">${field(tx(language,'批次','Batch'),`${batch.name} · ${batch.id}`)}${field(tx(language,'渠道','Channel'),channel ? `${channel.name} · ${channel.id}` : batch.channelId)}${field(tx(language,'所属游戏','Game'),gameLabel(language,batch.gameId))}${field('SKU',batch.skuId)}${field('client_id',batch.clientId || tx(language,'生成凭证后创建','Created with credentials'))}${field(tx(language,'API 地址','API endpoint'),'https://api.xiaoji.com/openapi/v1/key/issue')}</dl>${audit}${secretBlock}<div class="publisher-channel-inline-actions">${batch.clientId ? actionLink(tx(language,'复制 client_id','Copy client_id'),'batch-client-id-copy',{batchId:batch.id}) : ''}${actionLink(tx(language,'查看接口文档','View API guide'),'channel-help-open',{helpTopic:'channel-api-integration'})}</div>`;
    const primary = batch.clientId ? button(tx(language,'轮换 Secret','Rotate Secret'),'batch-api-rotate',{batchId:batch.id}) : button(tx(language,'生成接入凭证','Generate credentials'),'batch-api-generate',{batchId:batch.id});
    const simulate = batch.clientId ? button(tx(language,'模拟取码','Simulate request'),'batch-api-simulate',{batchId:batch.id,secondary:true}) : '';
    return drawerShell(language,'batch-api-access-title',tx(language,'API 接入信息','API access information'),body,`${button(tx(language,'关闭','Close'),'channel-dialog-close',{secondary:true})}${simulate}${primary}`);
  };
  const renderApiRotateDialog = (language, state) => {
    const batch = batchById(state,state.dialogBatchId);
    if (!batch) return '';
    return dialogShell(language,'batch-api-rotate-title',tx(language,'确认轮换 Secret','Confirm Secret rotation'),`<p class="publisher-channel-confirm-title">${tx(language,'新 Secret 生效后，旧 Secret 立即失效。','The old Secret becomes invalid when the new Secret takes effect.')}</p><dl class="publisher-channel-detail-grid">${field(tx(language,'批次','Batch'),batch.name)}${field('client_id',batch.clientId || '—')}${field(tx(language,'最近调用','Last used'),batch.lastUsedAt || '—')}</dl>`,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(tx(language,'确认轮换','Confirm rotation'),'batch-api-rotate-confirm',{batchId:batch.id,danger:true})}`);
  };
  const renderApiTopupDialog = (language, state) => {
    const batch = batchById(state,state.dialogBatchId);
    if (!batch || batch.delivery !== 'api' || batch.deleted) return '';
    const additions = (batch.quantityAdditions || []).slice().reverse().map(item => [formatNumber(item.quantity),e(item.createdAt || '—'),e(item.createdBy || '—')]);
    const history = additions.length ? `<section class="publisher-channel-topup-history"><h3>${tx(language,'追加记录','Addition history')}</h3>${table([tx(language,'追加数量','Quantity added'),tx(language,'操作时间','Created at'),tx(language,'操作人','Operator')],additions,{compact:true})}</section>` : '';
    const body = `<div class="publisher-channel-topup-summary"><span>${tx(language,'当前剩余','Current remaining')}：<strong>${formatNumber(apiRemaining(batch))}</strong></span><span>${tx(language,'累计总量','Total quantity')}：<strong>${formatNumber(batch.quantity)}</strong></span></div><form class="publisher-channel-topup-form"><label class="publisher-channel-topup-field"><span>${tx(language,'本次追加数量','Quantity to add')}</span><input type="number" min="1" max="100000" step="1" aria-label="${tx(language,'本次追加数量','Quantity to add')}" data-channel-api-topup-quantity><small>${tx(language,'单次可追加 1～100,000；追加后接口凭证与取码地址不变。','Add 1–100,000 at a time. API credentials and endpoint remain unchanged.')}</small><em data-channel-api-topup-error></em></label></form>${history}`;
    return drawerShell(language,'batch-api-topup-title',tx(language,'追加数量','Add quantity'),body,`${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(tx(language,'确认追加','Confirm addition'),'batch-api-topup-submit',{batchId:batch.id})}`);
  };
  const renderDownloadRecordDialog = (language, state) => {
    const batch = batchById(state,state.dialogBatchId);
    const rows = state.downloads.filter(item => !batch || item.batchId === batch.id).map(item => [e(item.fileName),e(item.batchId),formatNumber(item.quantity),e(item.downloadedBy || '—'),e(item.downloadedAt || '—'),formatNumber(item.downloadCount || 1)]);
    return drawerShell(language,'batch-download-record-title',tx(language,'下载记录','Download records'),table([tx(language,'文件名','File name'),tx(language,'批次','Batch'),tx(language,'数量','Quantity'),tx(language,'下载账号','Downloaded by'),tx(language,'下载时间','Downloaded at'),tx(language,'次数','Count')],rows,{compact:true,emptyLabel:tx(language,'暂无下载记录','No download records')}));
  };
  const renderDialog = ({ language, state, transientSecret }) => ({
    create:() => renderChannelFormDialog(language,state,'create'),
    edit:() => renderChannelFormDialog(language,state,'edit'),
    'channel-create':() => renderChannelFormDialog(language,state,'create'),
    'channel-edit':() => renderChannelFormDialog(language,state,'edit'),
    'channel-view':() => renderChannelDetailDialog(language,state),
    'channel-detail':() => renderChannelDetailDialog(language,state),
    'channel-disable-confirm':() => renderConfirmDialog(language,state,'channel','disable'),
    'channel-delete-confirm':() => renderConfirmDialog(language,state,'channel','delete'),
    'batch-create':() => renderBatchFormDialog(language,state,'create'),
    'batch-edit':() => renderBatchFormDialog(language,state,'edit'),
    'batch-view':() => renderBatchDetailDialog(language,state),
    'batch-detail':() => renderBatchDetailDialog(language,state),
    'batch-disable-confirm':() => renderConfirmDialog(language,state,'batch','disable'),
    'batch-delete-confirm':() => renderConfirmDialog(language,state,'batch','delete'),
    'batch-api-access':() => renderApiDialog(language,state,transientSecret),
    'api-access':() => renderApiDialog(language,state,transientSecret),
    'batch-api-rotate':() => renderApiRotateDialog(language,state),
    'api-rotate':() => renderApiRotateDialog(language,state),
    'batch-api-topup':() => renderApiTopupDialog(language,state),
    'api-topup':() => renderApiTopupDialog(language,state),
    'batch-download-record':() => renderDownloadRecordDialog(language,state),
    'disable-confirm':() => renderConfirmDialog(language,state,state.dialogTargetType === 'batch' ? 'batch' : 'channel','disable'),
    'delete-confirm':() => renderConfirmDialog(language,state,state.dialogTargetType === 'batch' ? 'batch' : 'channel','delete'),
  }[state.dialog]?.() || '');

  const filterBar = ({ language, scope, values, rangeLabel }) => {
    const gameFilter = `<label class="publisher-channel-filter is-game"><span>${tx(language,'游戏','Game')}</span><select data-channel-filter-game-id aria-label="${tx(language,'游戏','Game')}"><option value="">${tx(language,'全部游戏','All games')}</option>${fixture.games.map(game => `<option value="${e(game.id)}"${game.id === values.gameId ? ' selected' : ''}>${e(gameLabel(language,game.id))}</option>`).join('')}</select></label>`;
    const commonRange = dateRangeField({ language, label:rangeLabel, start:values.start, end:values.end, startAttribute:'data-channel-filter-start', endAttribute:'data-channel-filter-end', dialogLabel:tx(language,'选择时间范围','Select date range'), className:'publisher-channel-filter is-date' });
    if (scope === 'channels') return `<form class="publisher-channel-filters is-channels" data-channel-filter-form="channels"><label class="publisher-channel-filter is-keyword"><span>${tx(language,'渠道名称或编号','Channel name or ID')}</span><input value="${e(values.keyword)}" data-channel-filter-keyword aria-label="${tx(language,'渠道名称或编号','Channel name or ID')}"></label>${commonRange}<label class="publisher-channel-filter is-compact"><span>${tx(language,'状态','Status')}</span><select data-channel-filter-status aria-label="${tx(language,'状态','Status')}"><option value="">${tx(language,'全部','All')}</option><option value="active"${values.status === 'active' ? ' selected' : ''}>${tx(language,'合作中','Active')}</option><option value="disabled"${values.status === 'disabled' ? ' selected' : ''}>${tx(language,'已停用','Disabled')}</option><option value="scheduled"${values.status === 'scheduled' ? ' selected' : ''}>${tx(language,'待生效','Scheduled')}</option><option value="ended"${values.status === 'ended' ? ' selected' : ''}>${tx(language,'已结束','Ended')}</option></select></label><div class="publisher-channel-filters__actions">${button(tx(language,'查询','Search'),'channel-filter-submit',{filterScope:scope})}${button(tx(language,'重置','Reset'),'channel-filter-reset',{secondary:true,filterScope:scope})}</div></form>`;
    if (scope === 'batches') return `<form class="publisher-channel-filters is-batches" data-channel-filter-form="batches">${gameFilter}<label class="publisher-channel-filter is-keyword"><span>${tx(language,'批次名称或编号','Batch name or ID')}</span><input value="${e(values.keyword)}" data-channel-filter-batch-keyword aria-label="${tx(language,'批次名称或编号','Batch name or ID')}"></label><label class="publisher-channel-filter is-channel"><span>${tx(language,'渠道','Channel')}</span><select data-channel-filter-channel-id aria-label="${tx(language,'渠道','Channel')}"><option value="">${tx(language,'全部渠道','All channels')}</option></select></label>${commonRange}<label class="publisher-channel-filter is-compact"><span>${tx(language,'供给方式','Supply method')}</span><select data-channel-filter-delivery aria-label="${tx(language,'供给方式','Supply method')}"><option value="">${tx(language,'全部','All')}</option><option value="file"${values.delivery === 'file' ? ' selected' : ''}>${tx(language,'文件','File')}</option><option value="api"${values.delivery === 'api' ? ' selected' : ''}>API</option></select></label><label class="publisher-channel-filter is-compact"><span>${tx(language,'状态','Status')}</span><select data-channel-filter-status aria-label="${tx(language,'状态','Status')}"><option value="">${tx(language,'全部','All')}</option><option value="active"${values.status === 'active' ? ' selected' : ''}>${tx(language,'供给中','Supplying')}</option><option value="disabled"${values.status === 'disabled' ? ' selected' : ''}>${tx(language,'已停用','Disabled')}</option><option value="exhausted"${values.status === 'exhausted' ? ' selected' : ''}>${tx(language,'已用完','Exhausted')}</option><option value="downloaded"${values.status === 'downloaded' ? ' selected' : ''}>${tx(language,'已下载','Downloaded')}</option><option value="channel_restricted"${values.status === 'channel_restricted' ? ' selected' : ''}>${tx(language,'受渠道限制','Restricted')}</option></select></label><div class="publisher-channel-filters__actions">${button(tx(language,'查询','Search'),'channel-filter-submit',{filterScope:scope})}${button(tx(language,'重置','Reset'),'channel-filter-reset',{secondary:true,filterScope:scope})}</div></form>`;
    return `<form class="publisher-channel-filters" data-channel-filter-form="distribution">${gameFilter}<label class="publisher-channel-filter is-keyword"><span>${tx(language,'渠道名称或编号','Channel name or ID')}</span><input value="${e(values.channelId)}" data-channel-filter-keyword aria-label="${tx(language,'渠道名称或编号','Channel name or ID')}"></label>${commonRange}<div class="publisher-channel-filters__actions">${button(tx(language,'查询','Search'),'channel-filter-submit',{filterScope:scope})}${button(tx(language,'重置','Reset'),'channel-filter-reset',{secondary:true,filterScope:scope})}</div></form>`;
  };
  const supplyTabs = (language, active) => `<nav class="publisher-channel-subtabs" role="tablist" aria-label="${tx(language,'渠道与供给','Channels and supply')}"><button type="button" role="tab" aria-selected="${active === 'channels'}" class="${active === 'channels' ? 'is-active' : ''}" data-portal-action="channel-supply-tab" data-channel-supply-tab="channels">${tx(language,'渠道管理','Channel management')}</button><button type="button" role="tab" aria-selected="${active === 'batches'}" class="${active === 'batches' ? 'is-active' : ''}" data-portal-action="channel-supply-tab" data-channel-supply-tab="batches">${tx(language,'批次管理','Batch management')}</button></nav>`;
  const renderChannelActions = (language, channel) => actionGroup(
    actionLink(tx(language,'查看','View'),'channel-view',{channelId:channel.id}),
    actionLink(tx(language,'编辑','Edit'),'channel-edit-open',{channelId:channel.id}),
    channel.enabled ? actionLink(tx(language,'停用','Disable'),'channel-disable-open',{channelId:channel.id}) : actionLink(tx(language,'启用','Enable'),'channel-enable',{channelId:channel.id}),
    actionLink(tx(language,'删除','Delete'),'channel-delete-open',{channelId:channel.id,danger:true}),
  );
  const renderBatchActions = (language, batch, channel) => {
    const state = effectiveBatchStatus(batch,channel);
    const supplyAction = batch.delivery === 'api' ? actionLink(tx(language,'管理接入','Manage access'),'batch-api-access',{batchId:batch.id}) : batch.supplyState === 'downloaded' ? actionLink(tx(language,'下载记录','Download record'),'batch-download-record',{batchId:batch.id}) : actionLink(tx(language,'下载文件','Download file'),'batch-download',{batchId:batch.id,disabled:!canDownloadFileBatch(batch)});
    const topupAction = batch.delivery === 'api' && !batchHasEnded(batch) ? actionLink(tx(language,'追加数量','Add quantity'),'batch-api-topup-open',{batchId:batch.id}) : '';
    return actionGroup(
      actionLink(tx(language,'查看','View'),'batch-view',{batchId:batch.id}),
      actionLink(tx(language,'编辑','Edit'),'batch-edit-open',{batchId:batch.id}),
      supplyAction,
      topupAction,
      batch.enabled ? actionLink(tx(language,'停用','Disable'),'batch-disable-open',{batchId:batch.id}) : actionLink(tx(language,'启用','Enable'),'batch-enable',{batchId:batch.id}),
      actionLink(tx(language,'删除','Delete'),'batch-delete-open',{batchId:batch.id,danger:true}),
      state === 'ended' ? `<span class="publisher-channel-muted">${tx(language,'已结束','Ended')}</span>` : '',
    );
  };

  const renderSupply = ({ language, state, transientSecret }) => {
    const visibleChannels = state.channels.filter(channel => !channel.deleted);
    const filteredChannels = visibleChannels.filter(channel => keywordMatches(channel,state.channelFilters.keyword) && rangeOverlaps(channel.effectiveStart,channel.effectiveEnd,state.channelFilters.start,state.channelFilters.end) && (!state.channelFilters.status || effectiveChannelStatus(channel) === state.channelFilters.status));
    const filteredBatches = state.batches.filter(batch => {
      if (batch.deleted || state.batchFilters.gameId && batch.gameId !== state.batchFilters.gameId) return false;
      const channel = channelById(state,batch.channelId);
      const matchesBatch = keywordMatches(batch,state.batchFilters.keyword);
      const matchesChannel = !state.batchFilters.channelId || batch.channelId === state.batchFilters.channelId || keywordMatches(channel,state.batchFilters.channelId);
      const matchesDate = rangeOverlaps(batch.createdAt,batch.createdAt,state.batchFilters.start,state.batchFilters.end);
      const matchesDelivery = !state.batchFilters.delivery || batch.delivery === state.batchFilters.delivery;
      const matchesStatus = !state.batchFilters.status || effectiveBatchStatus(batch,channel) === state.batchFilters.status;
      return matchesBatch && matchesChannel && matchesDate && matchesDelivery && matchesStatus;
    });
    const channelRows = filteredChannels.map(channel => {
      const meta = channelStatusMeta(language,effectiveChannelStatus(channel));
      return [`<span class="publisher-channel-row-title"><strong>${e(channel.name)}</strong><small>${e(channel.id)}</small></span>`,e(periodLabel(language,channel.effectiveStart,channel.effectiveEnd)),status(meta[0],meta[1]),e(channel.note || '—'),e(channel.updatedAt || '—'),renderChannelActions(language,channel)];
    });
    const batchRows = filteredBatches.map(batch => {
      const channel = channelById(state,batch.channelId);
      const product = productById(batch.skuId);
      const meta = batchStatusMeta(language,effectiveBatchStatus(batch,channel));
      const quantityLabel = batch.delivery === 'api' ? `${formatNumber(apiRemaining(batch))} / ${formatNumber(batch.quantity)}` : formatNumber(batch.quantity);
      return [`<span class="publisher-channel-row-title"><strong>${e(batch.name)}</strong><small>${e(batch.id)}</small></span>`,gameCell(language,batch.gameId),`<span class="publisher-channel-row-title"><strong>${e(channel?.name || '—')}</strong><small>${e(channel?.id || batch.channelId)}</small></span>`,`<span class="publisher-channel-row-title"><strong>${e(language === 'en' ? product.labelEn : product.label)}</strong><small>${e(product.id)}</small></span>`,e(deliveryLabel(language,batch.delivery)),e(quantityLabel),e(periodLabel(language,batch.effectiveStart,batch.effectiveEnd)),status(meta[0],meta[1]),e(batch.lastSuppliedAt || '—'),renderBatchActions(language,batch,channel)];
    });
    const activeTab = state.supplyTab === 'batches' ? 'batches' : 'channels';
    const headActions = activeTab === 'channels' ? button(tx(language,'创建渠道','Create channel'),'channel-create-open') : button(tx(language,'创建批次','Create batch'),'batch-create-open');
    const channelsFilter = filterBar({ language, scope:'channels', values:state.channelFilters, rangeLabel:tx(language,'合作时间','Cooperation period') });
    const batchFilterHtml = filterBar({ language, scope:'batches', values:state.batchFilters, rangeLabel:tx(language,'创建时间','Created at') }).replace('<option value="">'+tx(language,'全部渠道','All channels')+'</option>',`<option value="">${tx(language,'全部渠道','All channels')}</option>${visibleChannels.map(channel => `<option value="${e(channel.id)}"${state.batchFilters.channelId === channel.id ? ' selected' : ''}>${e(channel.name)} · ${e(channel.id)}</option>`).join('')}`);
    const channelsPanel = `<section class="publisher-channel-card" role="tabpanel"><header><h2>${tx(language,'渠道列表','Channel list')}</h2></header>${channelsFilter}${table([tx(language,'渠道名称／编号','Channel / ID'),tx(language,'合作时间','Cooperation period'),tx(language,'状态','Status'),tx(language,'备注','Note'),tx(language,'更新时间','Updated at'),tx(language,'操作','Actions')],channelRows,{className:'publisher-channel-table--channels',emptyLabel:tx(language,'暂无渠道','No channels')})}</section>`;
    const batchesPanel = !visibleChannels.length ? `<section class="publisher-channel-card" role="tabpanel"><div class="publisher-channel-empty"><h3>${tx(language,'请先创建企业渠道','Create an enterprise channel first')}</h3><p>${tx(language,'渠道创建后，可为不同游戏的商品 / SKU 分别创建批次。','After creating a channel, create separate batches for products / SKUs from different games.')}</p>${button(tx(language,'去创建渠道','Create channel'),'channel-create-open')}</div></section>` : `<section class="publisher-channel-card" role="tabpanel"><header><h2>${tx(language,'批次列表','Batch list')}</h2></header>${batchFilterHtml}${table([tx(language,'批次名称／编号','Batch / ID'),tx(language,'游戏／Game ID','Game / ID'),tx(language,'渠道','Channel'),tx(language,'销售项／SKU','Product / SKU'),tx(language,'供给方式','Supply method'),tx(language,'数量','Quantity'),tx(language,'生效时间','Effective period'),tx(language,'状态','Status'),tx(language,'最近供给','Last supplied'),tx(language,'操作','Actions')],batchRows,{className:'publisher-channel-table--batches',emptyLabel:tx(language,'暂无批次','No batches')})}</section>`;
    return `${head(tx(language,'渠道与供给','Channels and supply'),headActions)}${supplyTabs(language,activeTab)}${activeTab === 'channels' ? channelsPanel : batchesPanel}${renderDialog({language,state,transientSecret})}`;
  };

  const renderRevenue = ({ language, state, transientSecret }) => {
    const filteredMetrics = state.keyMetrics.map(item => {
      if (state.distributionFilters.gameId && item.gameId !== state.distributionFilters.gameId) return null;
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
      return [gameCell(language,item.gameId),`<span class="publisher-channel-row-title"><strong>${e(channel?.name || '—')}</strong><small>${e(channel?.id || item.channelId)}</small></span>`,`<span class="publisher-channel-row-title"><strong>${e(language === 'en' ? product.labelEn : product.label)}</strong><small>${e(product.id)}</small></span>`,e(deliveryLabel(language,item.delivery)),formatNumber(issued),formatNumber(redeemed),formatNumber(unredeemed),e(rate)];
    });
    const totals = filteredMetrics.reduce((result,item) => ({ issued:result.issued + Number(item.issued || 0), redeemed:result.redeemed + Number(item.redeemed || 0) }),{ issued:0, redeemed:0 });
    const totalUnredeemed = Math.max(totals.issued - totals.redeemed,0);
    const totalRate = totals.issued ? `${(totals.redeemed / totals.issued * 100).toFixed(1)}%` : '—';
    const cards = `<div class="publisher-channel-metrics">${metric(tx(language,'发放量','Issued'),formatNumber(totals.issued))}${metric(tx(language,'兑换量','Redeemed'),formatNumber(totals.redeemed))}${metric(tx(language,'未兑换量','Unredeemed'),formatNumber(totalUnredeemed))}${metric(tx(language,'兑换率','Redemption rate'),totalRate)}</div>`;
    const filters = filterBar({ language, scope:'distribution', values:state.distributionFilters, rangeLabel:tx(language,'Key 发放时间','Key issue date') });
    return `${head(tx(language,'分销数据','Distribution data'))}${filters}${cards}<section class="publisher-channel-card"><header><h2>${tx(language,'Key 发放与兑换','Key issuance and redemption')}</h2></header>${table([tx(language,'游戏／Game ID','Game / ID'),tx(language,'渠道','Channel'),tx(language,'销售项／SKU','Product / SKU'),tx(language,'供给方式','Supply method'),tx(language,'发放量','Issued'),tx(language,'兑换量','Redeemed'),tx(language,'未兑换量','Unredeemed'),tx(language,'兑换率','Redemption rate')],rows,{className:'publisher-channel-table--distribution',emptyLabel:tx(language,'暂无数据','No data')})}</section>${renderDialog({language,state,transientSecret})}`;
  };

  const renderers = { 'channel-supply':renderSupply, 'channel-revenue':renderRevenue };
  const render = ({ section, language = 'zh', state = {}, demoState = {}, transientSecret = '' }) => {
    const distribution = createState(state.channelDistribution || state);
    if (demoState.publisherScenario === 'empty') {
      distribution.channels = [];
      distribution.batches = [];
      distribution.downloads = [];
      distribution.keyMetrics = [];
    }
    const runtimeSecret = transientSecret || demoState.channelTransientSecret || '';
    return `<section class="publisher-channel" data-publisher-channel="${e(section)}">${(renderers[section] || renderSupply)({ language, state:distribution, transientSecret:runtimeSecret })}</section>`;
  };

  window.PublisherChannelDistribution = { gameById, productsForGame, validateBatchOwnership, updateBatchGameSelection, channelImpact, fixture, createState, render, renderDatePopover, effectiveChannelStatus, effectiveBatchStatus, rangeOverlaps, canSupply, canSupplyBatch, canDownloadFileBatch, batchCoreLocked, apiRemaining, batchHasEnded };
  namespace.publisherChannelDistribution = window.PublisherChannelDistribution;
})(window.GameHubDeveloperPortal);

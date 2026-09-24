import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scope = { window: { GameHubDeveloperPortal: { components: { escapeHtml: value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;') } } } };
vm.runInNewContext(fs.readFileSync(new URL('../../demos/开发者后台一期/src/runtime/publisher-channel-distribution.js',import.meta.url),'utf8'),scope);
const model = scope.window.PublisherChannelDistribution;
const render = (state, section = 'channel-supply') => model.render({ section, language:'zh', state });
const tableBody = html => html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || '';

test('enterprise channel is reused by two games without duplicating its ID', () => {
  const state = model.createState();
  assert.equal(state.channels.filter(channel => channel.id === 'CH-240901').length,1);
  const batches = state.batches.filter(batch => batch.channelId === 'CH-240901');
  assert.equal(new Set(batches.map(batch => batch.gameId)).size,2);
  assert.ok(batches.every(batch => model.validateBatchOwnership(batch.gameId,batch.skuId).valid));
  assert.equal(model.channelImpact(state,'CH-240901').gameCount,2);
});

test('legacy data derives game from SKU while preserving credentials and records', () => {
  const source = model.createState();
  const legacy = JSON.parse(JSON.stringify(source));
  for (const collection of ['batches','downloads','keyMetrics']) for (const item of legacy[collection]) delete item.gameId;
  const restored = model.createState(legacy);
  assert.ok(restored.batches.every(batch => model.validateBatchOwnership(batch.gameId,batch.skuId).valid));
  assert.equal(restored.batches.find(batch => batch.id === 'BT-20260901-0002').clientId,'cli_np_base_202609');
  assert.equal(restored.batches.find(batch => batch.id === 'BT-20260901-0002').secretLast4,'7Q4X');
  assert.equal(restored.downloads[0].gameId,'GAME-48291');
  assert.equal(restored.keyMetrics.find(item => item.skuId === 'TWILIGHT-BASE').gameId,'GAME-58302');
  const unknown = model.createState({ batches:[{ id:'old-unknown', skuId:'removed-sku' }] });
  assert.equal(unknown.batches[0].gameId,'');
  assert.equal(model.validateBatchOwnership(unknown.batches[0].gameId,'removed-sku').valid,false);
});

test('game and SKU validation rejects unknown and cross-game pairs, including DLC', () => {
  assert.equal(model.validateBatchOwnership('GAME-58302','TWILIGHT-DLC').valid,true);
  assert.equal(model.validateBatchOwnership('GAME-58302','DLC-SEASON-01').valid,false);
  assert.equal(model.validateBatchOwnership('GAME-48291','TWILIGHT-BASE').valid,false);
  assert.equal(model.validateBatchOwnership('missing','BASE-GLOBAL').error,'game');
  assert.equal(model.validateBatchOwnership('GAME-48291','missing').error,'sku');
  assert.deepEqual(Array.from(model.productsForGame('GAME-58302'),item => item.type),['base','dlc']);
});

test('changing game clears incompatible SKU without touching other draft inputs', () => {
  const sku = { value:'BASE-GLOBAL', innerHTML:'', disabled:false };
  const draft = { name:'Keep my name', channel:'CH-240902', quantity:567, note:'Keep my note' };
  const form = { dataset:{ batchCoreLocked:'false' }, querySelector: selector => {
    assert.equal(selector,'[data-channel-batch-sku]');
    return sku;
  }, draft };
  assert.equal(model.updateBatchGameSelection(form,'GAME-58302'),true);
  assert.equal(sku.value,'');
  assert.match(sku.innerHTML,/TWILIGHT-BASE/);
  assert.match(sku.innerHTML,/TWILIGHT-DLC/);
  assert.doesNotMatch(sku.innerHTML,/BASE-GLOBAL/);
  assert.equal(form.draft,draft);
  assert.equal(draft.quantity,567);
  sku.value = 'TWILIGHT-DLC';
  model.updateBatchGameSelection(form,'GAME-58302');
  assert.equal(sku.value,'TWILIGHT-DLC');
  form.dataset.batchCoreLocked = 'true';
  assert.equal(model.updateBatchGameSelection(form,'GAME-48291'),false);
  assert.equal(sku.value,'TWILIGHT-DLC');
});

test('batch and distribution game filters exclude other games and recompute totals', () => {
  const state = model.createState();
  state.supplyTab = 'batches';
  state.batchFilters.gameId = 'GAME-58302';
  const batchHtml = render(state);
  assert.match(tableBody(batchHtml),/BT-20260916-0006/);
  assert.doesNotMatch(tableBody(batchHtml),/BT-20260901-0002/);
  assert.match(tableBody(batchHtml),/GAME-58302/);
  state.distributionFilters.gameId = 'GAME-58302';
  const distributionHtml = render(state,'channel-revenue');
  assert.match(tableBody(distributionHtml),/TWILIGHT-BASE/);
  assert.doesNotMatch(tableBody(distributionHtml),/BASE-GLOBAL/);
  assert.match(distributionHtml,/<strong class="number">80<\/strong>/);
  assert.match(distributionHtml,/<strong class="number">32<\/strong>/);
  assert.match(distributionHtml,/<strong class="number">40.0%<\/strong>/);
});

test('supplied batch locks game selection and channel disable describes cross-game scope', () => {
  const state = model.createState();
  state.dialog = 'batch-edit';
  state.dialogBatchId = 'BT-20260901-0002';
  assert.match(render(state),/data-channel-batch-game disabled/);
  state.dialog = 'channel-disable-confirm';
  state.dialogChannelId = 'CH-240901';
  const html = render(state);
  assert.match(html,/关联 2 款游戏、3 个批次/);
  assert.match(html,/未下载文件仍可首次下载/);
  const pendingFile = state.batches.find(batch => batch.id === 'BT-20260910-0003');
  assert.equal(model.canDownloadFileBatch(pendingFile),true);
  const channel = state.channels.find(item => item.id === 'CH-240901');
  channel.enabled = false;
  for (const batch of state.batches.filter(item => item.channelId === channel.id)) assert.equal(model.canSupplyBatch(batch,channel),false);
});

test('empty demo state hides all supply data without clearing persisted records', () => {
  const state = model.createState();
  const original = JSON.stringify(state);
  let html = model.render({ section:'channel-supply', state, demoState:{ publisherScenario:'empty' } });
  assert.match(html,/暂无渠道/);
  assert.match(html,/data-portal-action="channel-create-open"/);
  assert.doesNotMatch(tableBody(html),/CH-240901/);
  state.supplyTab = 'batches';
  html = model.render({ section:'channel-supply', state, demoState:{ publisherScenario:'empty' } });
  assert.match(html,/请先创建企业渠道/);
  assert.match(html,/data-portal-action="channel-create-open"/);
  assert.doesNotMatch(html,/BT-20260916-0006/);
  html = model.render({ section:'channel-revenue', state, demoState:{ publisherScenario:'empty' } });
  assert.match(html,/<strong class="number">0<\/strong>/);
  assert.doesNotMatch(tableBody(html),/TWILIGHT-BASE/);
  state.supplyTab = 'channels';
  assert.equal(JSON.stringify(state),original);
  const restored = render(state);
  assert.match(tableBody(restored),/CH-240901/);
});

test('creating a batch with no enterprise channels offers the existing channel form', () => {
  const state = model.createState({ channels:[], batches:[], downloads:[], keyMetrics:[], dialog:'batch-create', supplyTab:'batches' });
  const html = render(state);
  assert.match(html,/请先创建企业渠道/);
  assert.match(html,/data-portal-action="channel-create-open"/);
  assert.doesNotMatch(html,/data-channel-batch-form/);
});

test('new supply blocks unresolved or inconsistent ownership while preserving viewable history', () => {
  const state = model.createState();
  const channel = state.channels.find(item => item.id === 'CH-240901');
  const api = { ...state.batches.find(item => item.id === 'BT-20260901-0002') };
  const file = { ...state.batches.find(item => item.id === 'BT-20260910-0003') };
  // Legacy records with known SKU remain supplyable without a stored gameId.
  delete api.gameId;
  delete file.gameId;
  assert.equal(model.canSupplyBatch(api,channel),true);
  assert.equal(model.canDownloadFileBatch(file),true);
  for (const invalid of [{ skuId:'retired-unknown' }, { gameId:'GAME-58302' }, { gameId:'unrecognized-game' }]) {
    assert.equal(model.canSupplyBatch({ ...api, ...invalid },channel),false);
    assert.equal(model.canDownloadFileBatch({ ...file, ...invalid }),false);
  }
  const unknown = { ...api, id:'BT-LEGACY-UNKNOWN', skuId:'retired-unknown', clientId:'legacy-client-retained' };
  const normalized = model.createState({ ...state, batches:[unknown], supplyTab:'batches' });
  assert.equal(normalized.batches.length,1);
  assert.equal(normalized.batches[0].clientId,'legacy-client-retained');
  const html = tableBody(render(normalized));
  assert.match(html,/BT-LEGACY-UNKNOWN/);
  assert.match(html,/待确认归属/);
  assert.match(html,/data-portal-action="batch-view"/);
});

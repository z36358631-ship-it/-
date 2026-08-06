import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '适合本机', '盖世游戏适合本机WebView-demo.html');
const outputDir = path.join(root, 'test-results', 'compatibility-library-v2');
fs.mkdirSync(outputDir, { recursive: true });

const executablePath = [
  chromium.executablePath(),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find((candidate) => fs.existsSync(candidate));
if (!executablePath) throw new Error('No Chromium-compatible browser executable found');

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1100, height: 980 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('request', (request) => { if (!request.url().startsWith('file:') && !request.url().startsWith('data:')) errors.push(`unexpected network request: ${request.url()}`); });

await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
const frame = page.locator('.frame');
const portrait = await frame.evaluate((element) => ({ width: element.clientWidth, height: element.clientHeight }));
if (portrait.width !== 390 || portrait.height !== 844) errors.push(`portrait frame is ${portrait.width}x${portrait.height}`);
if (await page.locator('[data-game]').count() !== 6) errors.push('game catalog is not the default full library');
if (await page.locator('.local-toggle').evaluate((element) => element.classList.contains('active'))) errors.push('local-device filter should default off');
if (await page.locator('.mini-badge').count() !== 0) errors.push('default game catalog still exposes local-device conclusions');
if (await page.locator('.filter-trigger').count() !== 1) errors.push('portrait filter trigger is missing');
await frame.screenshot({ path: path.join(outputDir, '01-game-catalog-portrait.png') });

await page.locator('.filter-trigger').click();
if (!await page.locator('.filter-shell').evaluate((element) => element.classList.contains('panel-open'))) errors.push('portrait filter layer did not open');
if (!await page.locator('.filter-mobile-panel [data-filter-key="statuses"][data-filter-option="direct"]').isDisabled()) errors.push('run-status filter should require a GPU selection');
await frame.screenshot({ path: path.join(outputDir, '02-game-filter-portrait.png') });
await page.locator('.filter-mobile-panel [data-filter-option="adreno_750"]').click();
await page.locator('.filter-mobile-panel [data-filter-option="direct"]').click();
if (await page.locator('.mobile-filter-confirm').textContent() !== '确定（2 项）') errors.push('filtered result count is wrong');
await page.locator('.mobile-filter-confirm').click();
if (await page.locator('[data-game]').count() !== 2) errors.push('GPU plus run-status filters did not return two games');
if (await page.locator('[data-game="steam_1145360"]').count() !== 1 || await page.locator('[data-game="steam_814380"]').count() !== 1) errors.push('filtered game set is wrong');
await frame.screenshot({ path: path.join(outputDir, '03-filtered-games-portrait.png') });
await page.locator('.filter-trigger').click();
await page.locator('.mobile-filter-reset').click();
await page.locator('.mobile-filter-confirm').click();
if (await page.locator('[data-game]').count() !== 6) errors.push('clear filters did not restore the full game catalog');

await page.locator('[data-game="steam_1245620"]').click();
if (await page.locator('.summary-card strong').nth(0).textContent() !== 'Adreno 830') errors.push('recommended GPU calculation is wrong');
if (await page.locator('.summary-card strong').nth(1).textContent() !== 'Adreno 750') errors.push('lowest verified GPU calculation is wrong');
if (await page.locator('[data-record-gpu]').count() !== 4) errors.push('game detail did not show all GPU records');

await page.locator('[data-config="cfg_elden_830_stable"]').click();
if (await page.locator('#config-view [data-apply-config]').count() !== 0) errors.push('matching config detail still owns an action');
if (!await page.locator('#config-view').getByText('完整配置', { exact: true }).isVisible()) errors.push('read-only config detail is incomplete');
await frame.screenshot({ path: path.join(outputDir, '04-readonly-config-portrait.png') });
await page.locator('.view.active [data-back]').click();
const activeAfterConfigBack = await page.locator('.view.active').getAttribute('id');
if (activeAfterConfigBack !== 'game-view') errors.push(`config detail returned to ${activeAfterConfigBack}, expected game-view`);
if (await page.locator('[data-apply-config="cfg_elden_830_stable"]').textContent() !== '下载并应用') errors.push('matching list config did not offer direct application');
await page.locator('[data-apply-config="cfg_elden_830_stable"]').click();
await page.waitForTimeout(750);
if (await page.locator('[data-apply-config="cfg_elden_830_stable"]').textContent() !== '配置已应用') errors.push('local matching-config fallback did not apply');

await page.locator('[data-record-gpu="adreno_750"]').click();
await page.locator('[data-config="cfg_elden_750"]').click();
if (await page.locator('#config-view [data-apply-config]').count() !== 0) errors.push('mismatched config detail still owns an action');
if (await page.locator('#config-view').getByText(/当前设备为 Adreno 830/).count() !== 0) errors.push('read-only config detail still contains action mismatch copy');
if (!await page.locator('#config-view').getByText('Adreno 750', { exact: true }).isVisible()) errors.push('read-only detail lost the target GPU');
await frame.screenshot({ path: path.join(outputDir, '05-readonly-other-gpu-config-portrait.png') });

await page.evaluate(() => {
  window.bridgeCalls = { download: [], apply: [] };
  window.GameHubBridge = {
    downloadConfig(payload) { window.bridgeCalls.download.push(payload); },
    downloadAndApplyConfig(payload) { window.bridgeCalls.apply.push(payload); }
  };
});
await page.locator('.view.active [data-back]').click();
if (await page.locator('[data-apply-config="cfg_elden_750"]').textContent() !== '下载配置') errors.push('mismatched list config should be download-only');
await page.locator('[data-apply-config="cfg_elden_750"]').click();
await page.waitForTimeout(50);
if (await page.locator('[data-apply-config="cfg_elden_750"]').textContent() !== '正在下载配置…') errors.push('synchronous Bridge did not wait for callback');
const downloadRequest = await page.evaluate(() => window.bridgeCalls.download[0]);
if (!downloadRequest?.requestId || downloadRequest.configId !== 'cfg_elden_750' || downloadRequest.gameId !== 'steam_1245620' || downloadRequest.gpuId !== 'adreno_750') errors.push('download Bridge payload is incomplete');
await page.evaluate((request) => window.GameHubCompatibility.setActionResult({ requestId: request.requestId, configId: request.configId, status: 'success', message: '已保存到配置库' }), downloadRequest);
const bridgeCalls = await page.evaluate(() => window.bridgeCalls);
if (bridgeCalls.download.length !== 1 || bridgeCalls.apply.length !== 0) errors.push('mismatched config called the wrong Bridge method');

await page.locator('[data-record-gpu="adreno_830"]').click();
await page.locator('[data-apply-config="cfg_elden_830_stable"]').click();
await page.locator('[data-apply-config="cfg_elden_830_quality"]').click();
const applyRequests = await page.evaluate(() => window.bridgeCalls.apply);
if (applyRequests.length !== 2 || applyRequests.some((request) => !request.requestId || request.configId == null)) errors.push('apply Bridge requests are incomplete');
const invalidStatusAccepted = await page.evaluate((requests) => window.GameHubCompatibility.setActionResult({ requestId: requests[1].requestId, configId: requests[1].configId, status: 'pending', message: '非法状态' }), applyRequests);
if (invalidStatusAccepted !== false) errors.push('invalid callback status was accepted');
const staleAccepted = await page.evaluate((requests) => window.GameHubCompatibility.setActionResult({ requestId: requests[0].requestId, configId: requests[0].configId, status: 'success', message: '旧请求错误覆盖' }), applyRequests);
if (staleAccepted !== false) errors.push('stale callback was accepted');
if (await page.locator('[data-apply-config="cfg_elden_830_quality"]').textContent() !== '正在下载配置…') errors.push('stale callback overwrote the active request');
await page.evaluate((requests) => window.GameHubCompatibility.setActionResult({ requestId: requests[1].requestId, configId: requests[1].configId, status: 'success', message: '配置已应用' }), applyRequests);
if (await page.locator('[data-apply-config="cfg_elden_830_quality"]').textContent() !== '配置已应用') errors.push('active callback did not complete the matching request');
await page.evaluate(() => { delete window.GameHubBridge; delete window.bridgeCalls; });

for (let index = 0; index < 3; index += 1) {
  if (await page.locator('.view.active').getAttribute('id') === 'catalog-view') break;
  await page.locator('.view.active [data-back]').click();
}
const activeAfterDetailBack = await page.locator('.view.active').getAttribute('id');
if (activeAfterDetailBack !== 'catalog-view') {
  errors.push(`detail back navigation stopped at ${activeAfterDetailBack}, expected catalog-view`);
  await page.reload({ waitUntil: 'load' });
}

await page.locator('[data-mode="gpu"]').click();
if (await page.locator('[data-gpu]').count() !== 6) errors.push('GPU catalog did not render all GPU types');
await page.locator('.filter-trigger').click();
await page.locator('.filter-mobile-panel [data-filter-option="Qualcomm"]').click();
await page.locator('.mobile-filter-confirm').click();
if (await page.locator('[data-gpu]').count() !== 4) errors.push('GPU vendor filter did not return four Qualcomm GPUs');
await page.locator('#catalog-search').fill('750');
await page.locator('[data-orientation="landscape"]').click();
if (await page.locator('#catalog-search').inputValue() !== '750') errors.push('GPU search query was lost during orientation change');
if (await page.locator('[data-gpu]').count() !== 1) errors.push('GPU filter state was lost during orientation change');
await page.locator('#catalog-search').fill('');
await page.locator('[data-filter-group="families"]').click();
await page.locator('.filter-panel [data-filter-option="Adreno"]').click();
if (!await page.locator('.filter-sidebar').isVisible() || !await page.locator('.filter-panel').isVisible()) errors.push('landscape filter rail or flyout is missing');
await page.locator('#catalog-view').evaluate((element) => { element.scrollTop = 0; });
await frame.screenshot({ path: path.join(outputDir, '06-gpu-filter-landscape.png') });
const landscape = await frame.evaluate((element) => ({ width: element.clientWidth, height: element.clientHeight }));
if (landscape.width !== 874 || landscape.height !== 402) errors.push(`landscape frame is ${landscape.width}x${landscape.height}`);
await page.locator('.filter-done').click();
await page.locator('[data-gpu="adreno_750"]').click();
await page.locator('[data-gpu-game="steam_1245620"]').click();
if (!await page.locator('#game-view').evaluate((element) => element.classList.contains('active'))) errors.push('GPU game row did not open game detail');
if (!await page.locator('[data-record-gpu="adreno_750"]').evaluate((element) => element.classList.contains('active'))) errors.push('GPU context was not preselected in game detail');
await page.locator('.view.active [data-back]').click();
if (!await page.locator('#gpu-view').evaluate((element) => element.classList.contains('active'))) errors.push('game detail did not return to its GPU detail source');

await page.locator('.view.active [data-back]').click();
await page.evaluate(() => window.GameHubCompatibility.setCatalogError());
if (!await page.getByText('兼容库加载失败', { exact: true }).isVisible()) errors.push('catalog error state is missing');
await page.evaluate(() => window.GameHubCompatibility.setCatalog({}));
if (!await page.getByText('暂无兼容数据', { exact: true }).isVisible()) errors.push('catalog empty state is missing');
const reloadButton = page.locator('[data-action="reload"]');
if (await reloadButton.count()) {
  await reloadButton.click();
  await page.waitForTimeout(1200);
  if (await page.locator('[data-game],[data-gpu]').count() === 0) errors.push(`empty catalog reload did not recover: ${(await page.locator('#catalog-view').innerText()).slice(0,120)}`);
} else {
  errors.push(`empty catalog did not expose reload: ${(await page.locator('#catalog-view').innerText()).slice(0,180)}`);
  await page.reload({ waitUntil: 'load' });
}

await page.evaluate(() => window.GameHubCompatibility.setCatalog({
  games: [null, 1, { id: 'test_game', name: '异常数据游戏', coverKey: 'url(fake)', aliases: null }, { id: 'test_game', name: '重复游戏' }],
  gpus: [null, 'bad', { id: 'test_gpu', name: '测试 GPU', family: 'bad', tier: -1 }, { id: 'test_gpu', name: '重复 GPU' }, { id: 'other_gpu', name: '其他 GPU', family: 'Adreno', tier: 1 }],
  records: [null, { gameId: 'missing', gpuId: 'test_gpu' }, { gameId: 'test_game', gpuId: 'test_gpu', status: 'bad', evidenceLevel: 'bad', configIds: ['test_config', 'wrong_config'] }, { gameId: 'test_game', gpuId: 'test_gpu', status: 'direct', evidenceLevel: 'exact_device', configIds: [] }],
  configs: [null, { id: 'test_config', gameId: 'test_game', gpuId: 'test_gpu', settings: null, steps: null, knownIssues: null, fullConfig: null }, { id: 'test_config', gameId: 'test_game', gpuId: 'test_gpu', name: '重复配置' }, { id: 'wrong_config', gameId: 'test_game', gpuId: 'other_gpu', name: '错误关联配置' }]
}));
await page.locator('[data-mode="game"]').click();
if (await page.locator('[data-game="test_game"]').count() !== 1) errors.push('duplicate game IDs were not removed');
await page.locator('[data-mode="gpu"]').click();
if (await page.locator('[data-gpu="test_gpu"]').count() !== 1) errors.push('duplicate GPU IDs were not removed');
await page.evaluate(() => window.GameHubCompatibility.openGame('test_game', 'test_gpu'));
if (!await page.getByText('暂无结论', { exact: true }).isVisible()) errors.push('invalid record enums did not degrade safely');
if (await page.locator('[data-record-gpu="test_gpu"]').count() !== 1) errors.push('duplicate game/GPU records were not removed');
if (await page.locator('[data-config]').count() !== 1) errors.push('duplicate or mismatched configs were not filtered from the record');
if (await page.locator('[data-config="wrong_config"]').count() !== 0) errors.push('mismatched game/GPU config remained visible');

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('PASS: responsive filters, read-only config detail, list actions, Adapter and recovery verified in six screenshots');

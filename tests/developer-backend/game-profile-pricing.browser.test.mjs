import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const evidence = path.resolve('tests/developer-backend/evidence/profile-v25/pricing');
const url = pathToFileURL(path.resolve('demos/开发者后台一期/02-CDKEY商品与供给demo.html')).href + '#/P02-01';
const preparationOrder = ['release-workspace', 'versions', 'qualifications'];
const runtimeErrors = new WeakMap();
let browser;

before(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
});
after(async () => { await browser?.close(); });

async function open(width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 1000 } });
  runtimeErrors.set(page, []);
  page.on('pageerror', error => runtimeErrors.get(page).push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => Boolean(window.PublisherGameProfile && window.PublisherProfileStore));
  return page;
}
const field = (page, key) => page.locator(`[data-profile-field="${key}"]`);
const pricingModel = (page, index, value) => page.locator(`[data-sku-pricing-model="${index}"][value="${value}"]`);
const pricingStrategy = (page, index, value) => page.locator(`[data-sku-pricing-strategy="${index}"][value="${value}"]`);
const catalog = page => page.locator('[data-profile-catalog]');
async function section(page, name) {
  if (['profile', 'builds', 'catalog', 'release', 'qualification'].includes(name)) {
    if (!await page.locator('[data-publisher-profile][data-profile-module="release-workspace"]').count()) {
      await page.locator('[data-portal-action="game-console-section"][data-game-section="release-workspace"]').click();
      await page.locator('[data-publisher-profile][data-profile-module="release-workspace"]').waitFor();
    }
    await page.locator(`[data-release-locator="${name}"]`).click();
    await page.locator(`[data-release-anchor="${name}"]`).waitFor();
    return;
  }
  await page.locator(`[data-portal-action="game-console-section"][data-game-section="${name}"]`).click();
  await page.locator(`[data-publisher-profile][data-profile-module="${name}"]`).waitFor();
}
async function create(page, suffix) {
  await page.getByRole('button', { name: /^(添加游戏|Add game)$/ }).click();
  const createSurface = page.locator('[data-publisher-create]');
  assert.equal(await createSurface.locator('[data-create-project-name]').count(), 1);
  assert.equal(await createSurface.locator('[data-game-name-input], [data-name-language], [data-name-settings], [data-create-language]').count(), 0, '创建游戏不得处理多语言');
  await page.locator('[data-create-project-name]').fill(`Pricing QA ${suffix}`);
  await page.locator('[data-create-genre-toggle]').click();
  await page.locator('[data-create-genre-option][value="冒险"]').check();
  await page.keyboard.press('Escape');
  await page.locator('[data-create-relationship]').selectOption('developer_publisher');
  await page.locator('.pgc-plan-card--reservation').click();
  await page.locator('[data-create-submit]').click();
  await page.locator('[data-publisher-profile]').waitFor();
  assert.equal(await page.locator('[data-profile-section="basic"] [data-name-language]').count(), 1, '新项目默认只启用英语');
  assert.equal(await page.locator('[data-profile-section="basic"] [data-name-language="en"]').count(), 1);
  assert.equal(await page.locator('[data-game-name-input="en"]').inputValue(), '', '项目名不能预填商店名');
  return page.locator('[data-publisher-profile]').getAttribute('data-profile-game');
}
async function record(page, gameKey) {
  return page.evaluate(async key => (await window.PublisherProfileStore.loadAll()).find(item => item.gameKey === key), gameKey);
}
async function save(page, gameKey) {
  await page.locator('[data-profile-save]').click();
  await page.locator('[data-profile-save-state]').filter({ hasText: /所有更改已保存|All changes saved/ }).waitFor();
  return (await record(page, gameKey)).draft;
}
async function reopen(page, gameKey, target = 'catalog') {
  await page.reload();
  await page.waitForFunction(key => Boolean(document.querySelector(`[data-publisher-game-console][data-selected-game="${CSS.escape(key)}"]`) || document.querySelector(`[data-portal-action="enter-publisher-game"][data-publisher-game="${CSS.escape(key)}"]`)), gameKey);
  if (!await page.locator(`[data-publisher-game-console][data-selected-game="${gameKey}"]`).count()) {
    await page.locator(`[data-portal-action="enter-publisher-game"][data-publisher-game="${gameKey}"]`).first().click();
  }
  await page.locator(`[data-publisher-game-console][data-selected-game="${gameKey}"]`).waitFor();
  if (['profile', 'builds', 'catalog', 'release', 'qualification'].includes(target)) await section(page, target);
  else if (!await page.locator(`[data-publisher-profile][data-profile-game="${gameKey}"][data-profile-module="${target}"]`).count()) await section(page, target);
}
async function snapshots(page, gameKey) {
  return page.evaluate(key => window.PublisherProfileStore.loadSubmissions(key), gameKey);
}
async function capture(page, name, data) {
  await catalog(page).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: true });
  fs.writeFileSync(path.join(evidence, `${name}.json`), JSON.stringify({ ...data, runtimeErrors: runtimeErrors.get(page) }, null, 2), 'utf8');
}
async function failure(page, name) {
  await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: true });
  fs.writeFileSync(path.join(evidence, `${name}.html`), await page.content(), 'utf8');
  fs.writeFileSync(path.join(evidence, `${name}.json`), JSON.stringify({ runtimeErrors: runtimeErrors.get(page) }, null, 2), 'utf8');
}
async function assertCatalogFits(page) {
  const clipping = await catalog(page).locator('input, label, h3, h4, button').evaluateAll(elements => elements.flatMap(element => {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return [];
    return rect.left < -1 || rect.right > innerWidth + 1 ? [{ field: element.dataset.profileField || element.textContent, left: rect.left, right: rect.right, width: innerWidth }] : [];
  }));
  assert.deepEqual(clipping, [], '商品与 SKU 内容不能被视口裁切');
}
async function seedReleaseReady(page, gameKey, catalogValue) {
  if (!await record(page, gameKey)) await save(page, gameKey);
  await page.evaluate(async ({ gameKey, catalogValue }) => {
    const record = (await window.PublisherProfileStore.loadAll()).find(item => item.gameKey === gameKey);
    const draft = window.PublisherGameProfile.createDraft(record.game, record.draft);
    draft.gameNames.en = 'Pricing Snapshot';
    draft.gameNameEn = 'Pricing Snapshot';
    draft.localizedContent.en = { tagline: 'A complete English store summary.', description: 'A complete English description for release review.', developerWords: '' };
    draft.tagline = draft.localizedContent.en.tagline;
    draft.description = draft.localizedContent.en.description;
    const image = (name, width, height) => ({ name, type: 'image/png', size: 4, blob: new Blob(['test'], { type: 'image/png' }), width, height });
    draft.assets.icon = image('icon.png', 512, 512);
    draft.assets.landscape = [image('cover.png', 1600, 900)];
    draft.assets.screenshots = [1, 2, 3].map(index => image(`screen-${index}.png`, 1600, 900));
    draft.localizedAssets[draft.defaultNameLanguage] = draft.assets;
    const buildFile = id => ({ name: `${id}.zip`, type: 'application/zip', size: 4, blob: new Blob(['test'], { type: 'application/zip' }) });
    draft.buildPackages = [
      { id: 'BUILD-WIN-001', source: 'local', platform: 'Windows', type: 'full', baseBuildId: '', file: buildFile('BUILD-WIN-001'), executable: 'Game.exe', launchArgs: '', version: '1.0.0', changelog: 'Base game', status: 'parsed', testStatus: 'not_submitted', testReason: '', createdAt: new Date().toISOString() },
      { id: 'DLC-BUILD-001', source: 'local', platform: 'Windows', type: 'full', baseBuildId: '', file: buildFile('DLC-BUILD-001'), executable: 'DLC.exe', launchArgs: '', version: '1.0.0', changelog: 'DLC', status: 'parsed', testStatus: 'not_submitted', testReason: '', createdAt: new Date().toISOString() },
    ];
    draft.catalog = structuredClone(catalogValue);
    draft.releaseConfig.mode = 'global';
    draft.releaseConfig.globalTerritoryCodes = ['US', 'JP'];
    draft.releaseConfig.releaseStatus = 'pre_registration';
    draft.releaseRegions = ['global'];
    draft.releaseStatus = 'pre_registration';
    draft.targetUserInterests = ['adventure'];
    draft.releaseConfig.targetUserInterests = ['adventure'];
    const qualificationSnapshot = window.PublisherGameQualifications.createApplicationDraft({ rightsRelationship: 'self_owned', rightsDeclarationAccepted: true, authorization: { files: [{ name: 'rights.png', type: 'image/png', size: 4, blob: new Blob(['test'], { type: 'image/png' }) }] } });
    draft.qualifications = window.PublisherGameQualifications.createQualificationState({
      rightsRelationship: 'self_owned', rightsDeclarationAccepted: true, draft: qualificationSnapshot,
      activeVersion: { id: 'QUAL-V1', versionId: 'QUAL-V1', status: 'approved', snapshot: qualificationSnapshot }, pendingApplication: null, history: [],
    });
    await window.PublisherProfileStore.save(draft, record.game);
  }, { gameKey, catalogValue });
  await reopen(page, gameKey, 'catalog');
}

test('V2.5 SKU 校验覆盖售价、折扣价与折扣期限', async () => {
  const page = await open();
  try {
    const result = await page.evaluate(() => {
      const api = window.PublisherGameProfile;
      const make = sku => {
        const draft = api.createDraft({ gameKey: 'pricing-validation', projectName: 'Pricing validation', createData: { projectName: 'Pricing validation', genres: ['冒险'], platforms: ['Windows'], relationship: 'developer_publisher', releasePlan: 'reservation' } });
        draft.releaseConfig.mode = 'global';
        draft.releaseConfig.globalTerritoryCodes = ['US', 'JP'];
        draft.catalog.baseGame = { ...draft.catalog.baseGame, title: 'Base game', installContentRef: 'BUILD-1', ...sku };
        return Object.keys(api.validate(draft)).filter(key => key.startsWith('catalog.baseGame') && !key.endsWith('installContentRef')).sort();
      };
      const futureStart = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
      const futureEnd = new Date(Date.now() + 172800000).toISOString().slice(0, 16);
      return {
        invalidPrices: ['', '0', '-1', '1.001', '1e2', 'NaN'].map(value => ({ value, errors: make({ pricingModel: 'paid', listPrice: value }) })),
        validPrices: ['0.01', '1', '12.5', '999.99'].map(value => ({ value, errors: make({ pricingModel: 'paid', listPrice: value }) })),
        invalidModel: make({ pricingModel: 'subscription', listPrice: '10' }),
        free: make({ pricingModel: 'free', listPrice: '99', discountPrice: '49' }),
        validDiscount: make({ pricingModel: 'paid', listPrice: '19.99', discountPrice: '9.99', discountStartAt: futureStart, discountEndAt: futureEnd }),
        equalDiscount: make({ pricingModel: 'paid', listPrice: '19.99', discountPrice: '19.99', discountStartAt: futureStart, discountEndAt: futureEnd }),
        reversedDiscount: make({ pricingModel: 'paid', listPrice: '19.99', discountPrice: '9.99', discountStartAt: futureEnd, discountEndAt: futureStart }),
        regionalMissingDefault: make({ pricingModel: 'paid', pricingStrategy: 'regional', listPrice: '', regionalPrices: {} }),
        regionalMissingOverride: make({ pricingModel: 'paid', pricingStrategy: 'regional', listPrice: '19.99', regionalPrices: { JP: { listPrice: '', discountPrice: '' } } }),
      };
    });
    for (const item of result.invalidPrices) assert.deepEqual(item.errors, ['catalog.baseGame.listPrice'], `非法金额 ${JSON.stringify(item.value)} 必须阻断提审`);
    for (const item of result.validPrices) assert.deepEqual(item.errors, [], `合法金额 ${item.value} 应允许提审`);
    assert.deepEqual(result.invalidModel, ['catalog.baseGame.pricingModel']);
    assert.deepEqual(result.free, []);
    assert.deepEqual(result.validDiscount, []);
    assert.deepEqual(result.equalDiscount, ['catalog.baseGame.discount']);
    assert.deepEqual(result.reversedDiscount, ['catalog.baseGame.discount']);
    assert.deepEqual(result.regionalMissingDefault, ['catalog.baseGame.listPrice'], '分区定价须填写 USD 基准价');
    assert.deepEqual(result.regionalMissingOverride, ['catalog.baseGame.regionalPrices.JP.listPrice'], '例外地区须填写当地币种售价');
    assert.deepEqual(runtimeErrors.get(page), []);
    fs.writeFileSync(path.join(evidence, 'validation-matrix.json'), JSON.stringify(result, null, 2), 'utf8');
  } finally { await page.close(); }
});

test('免费 SKU 快照不携带隐藏价格，国内发行固定统一价', async () => {
  const page = await open();
  try {
    const result = await page.evaluate(() => {
      const api = window.PublisherGameProfile;
      const freeDraft = api.createDraft({ gameKey: 'free-snapshot', projectName: 'Free snapshot' });
      Object.assign(freeDraft.catalog.baseGame, {
        pricingModel: 'free', pricingStrategy: 'regional', listPrice: '19.99', discountPrice: '9.99',
        discountStartAt: '2099-01-01T10:00', discountEndAt: '2099-01-08T10:00', regionalPrices: { JP: { listPrice: '2200', discountPrice: '1100' } }
      });
      const freeSnapshot = api.submissionSnapshot(freeDraft).catalog.baseGame;
      const domesticDraft = api.createDraft({ gameKey: 'domestic-snapshot', projectName: 'Domestic snapshot' });
      domesticDraft.releaseConfig.mode = 'domestic';
      Object.assign(domesticDraft.catalog.baseGame, {
        pricingModel: 'paid', pricingStrategy: 'regional', listPrice: '68.00', discountPrice: '', regionalPrices: { CN: { listPrice: '66.00', discountPrice: '' } }
      });
      const domesticSnapshot = api.submissionSnapshot(domesticDraft).catalog.baseGame;
      return { freeSnapshot, domesticSnapshot };
    });
    assert.deepEqual({
      pricingStrategy: result.freeSnapshot.pricingStrategy,
      listPrice: result.freeSnapshot.listPrice,
      discountPrice: result.freeSnapshot.discountPrice,
      discountStartAt: result.freeSnapshot.discountStartAt,
      discountEndAt: result.freeSnapshot.discountEndAt,
      regionalPrices: result.freeSnapshot.regionalPrices,
    }, { pricingStrategy: 'uniform', listPrice: '', discountPrice: '', discountStartAt: '', discountEndAt: '', regionalPrices: {} });
    assert.equal(result.domesticSnapshot.pricingStrategy, 'uniform');
    assert.deepEqual(result.domesticSnapshot.regionalPrices, {});
    assert.equal(result.domesticSnapshot.listPrice, '68.00');
    assert.deepEqual(runtimeErrors.get(page), []);
  } finally { await page.close(); }
});

for (const width of [1440, 390]) test(`${width}px 基础游戏与 DLC 分别配置包体、买断价和折扣，切换国内外发行范围重新确认价格`, async () => {
  const page = await open(width);
  try {
    const gameKey = await create(page, `draft-${width}`);
    assert.deepEqual(await page.locator('.publisher-game-nav__tab[data-game-section]').evaluateAll(elements => elements.filter(element => element.dataset.gameSection !== 'overview').map(element => element.dataset.gameSection)), preparationOrder);
    await section(page, 'catalog');
    assert.equal(await page.locator('[data-profile-submit]').count(), 1);
    assert.equal(await page.locator('[data-catalog-sku]').count(), 1);
    assert.equal(await pricingModel(page, 0, 'free').isChecked(), true);
    await field(page, 'catalog.baseGame.title').fill('Pricing Base Game');
    await page.locator('[data-sku-add]').click();
    assert.equal(await page.locator('[data-catalog-sku]').count(), 2);
    await field(page, 'catalog.dlcs.0.title').fill('Ocean Soundtrack');
    await pricingModel(page, 1, 'paid').check();
    assert.equal(await pricingStrategy(page, 1, 'uniform').isChecked(), true);
    await field(page, 'catalog.dlcs.0.listPrice').fill('9.99');
    await field(page, 'catalog.dlcs.0.discountPrice').fill('6.99');
    await field(page, 'catalog.dlcs.0.discountStartAt').fill('2099-01-01T10:00');
    await field(page, 'catalog.dlcs.0.discountEndAt').fill('2099-01-08T10:00');
    assert.match(await catalog(page).innerText(), /USD/);
    await assertCatalogFits(page);
    const firstSave = await save(page, gameKey);
    assert.equal(firstSave.catalog.baseGame.pricingModel, 'free');
    assert.deepEqual(firstSave.catalog.dlcs.map(item => ({ pricingModel: item.pricingModel, pricingStrategy: item.pricingStrategy, listPrice: item.listPrice, discountPrice: item.discountPrice })), [{ pricingModel: 'paid', pricingStrategy: 'uniform', listPrice: '9.99', discountPrice: '6.99' }]);

    await section(page, 'release');
    await page.locator('[data-release-service="domestic"]').click();
    assert.equal(await page.locator('[data-release-mode="global"]').isChecked(), false, '国内服与全球服必须互斥');
    assert.equal(await page.locator('[data-release-regions]').getAttribute('data-release-mode-current'), 'domestic');
    await section(page, 'catalog');
    assert.match(await catalog(page).innerText(), /CNY/);
    assert.equal(await page.locator('[data-sku-pricing-strategy]').count(), 0, '中国大陆固定 CNY 统一价，不展示定价方式');
    assert.equal(await field(page, 'catalog.dlcs.0.listPrice').inputValue(), '', '切换结算币种后不得沿用原币种数值');
    await pricingModel(page, 0, 'paid').check();
    await field(page, 'catalog.baseGame.listPrice').fill('68.00');
    await pricingModel(page, 1, 'free').check();
    assert.equal(await field(page, 'catalog.dlcs.0.listPrice').count(), 0, '免费 SKU 应隐藏价格和折扣');
    const secondSave = await save(page, gameKey);
    assert.equal(secondSave.catalog.baseGame.pricingModel, 'paid');
    assert.equal(secondSave.catalog.baseGame.pricingStrategy, 'uniform');
    assert.deepEqual(secondSave.catalog.baseGame.regionalPrices, {});
    assert.equal(secondSave.catalog.baseGame.listPrice, '68.00');
    assert.equal(secondSave.catalog.dlcs[0].pricingModel, 'free');
    assert.equal(secondSave.catalog.dlcs[0].listPrice, '');
    assert.equal(secondSave.catalog.dlcs[0].discountPrice, '');
    assert.equal(secondSave.catalog.dlcs[0].discountStartAt, '');
    assert.equal(secondSave.catalog.dlcs[0].discountEndAt, '');
    await reopen(page, gameKey, 'catalog');
    assert.equal(await field(page, 'catalog.baseGame.listPrice').inputValue(), '68.00');
    assert.equal(await pricingModel(page, 1, 'free').isChecked(), true);
    await assertCatalogFits(page);
    assert.deepEqual(runtimeErrors.get(page), []);
    await capture(page, `sku-draft-${width}`, { mode: secondSave.releaseConfig.mode, catalog: secondSave.catalog });
  } catch (error) { await failure(page, `sku-draft-${width}-failure`); throw error; }
  finally { await page.close(); }
});

test('分区定价与发行区域联动，切换定价方式保留已填价格', async () => {
  const page = await open();
  try {
    const gameKey = await create(page, 'regional');
    await save(page, gameKey);
    await page.evaluate(async key => {
      const record = (await window.PublisherProfileStore.loadAll()).find(item => item.gameKey === key);
      const draft = window.PublisherGameProfile.createDraft(record.game, record.draft);
      draft.releaseConfig.mode = 'global';
      draft.releaseConfig.globalTerritoryCodes = ['US', 'SG', 'DE', 'JP'];
      Object.assign(draft.catalog.baseGame, { pricingModel: 'paid', pricingStrategy: 'regional', listPrice: '', discountPrice: '', regionalPrices: {} });
      await window.PublisherProfileStore.save(draft, record.game);
    }, gameKey);
    await reopen(page, gameKey, 'catalog');
    assert.equal(await page.locator('[data-sku-index="0"] [data-sku-regional-base]').count(), 1);
    assert.equal(await page.locator('[data-sku-index="0"] [data-sku-price-zone]').count(), 0, '未设置例外价时不应平铺发行地区');
    assert.match(await page.locator('[data-sku-index="0"] [data-sku-inherited-count]').innerText(), /4/);
    await field(page, 'catalog.baseGame.listPrice').fill('19.99');
    await page.locator('[data-sku-override-add="0"]').click();
    await page.locator('[data-sku-override-search="0"]').fill('日');
    assert.deepEqual(await page.locator('[data-sku-override-candidate]:visible').evaluateAll(items => items.map(item => item.dataset.skuOverrideCandidate)), ['JP']);
    await page.screenshot({ path: path.join(evidence, 'sku-override-picker.png'), fullPage: true });
    await page.locator('[data-sku-override-search="0"]').fill('');
    await page.locator('[data-sku-override-option="US"]').check();
    await page.locator('[data-sku-override-option="SG"]').check();
    await page.locator('[data-sku-override-option="JP"]').check();
    await page.locator('[data-sku-override-confirm="0"]').click();
    assert.deepEqual(await page.locator('[data-sku-index="0"] [data-sku-price-zone]').evaluateAll(rows => rows.map(row => row.dataset.skuPriceZone)), ['US', 'SG', 'JP']);
    assert.match(await page.locator('[data-sku-price-zone="SG"]').innerText(), /SGD/);
    await field(page, 'catalog.baseGame.regionalPrices.US.listPrice').fill('19.99');
    await field(page, 'catalog.baseGame.regionalPrices.SG.listPrice').fill('17.99');
    await field(page, 'catalog.baseGame.regionalPrices.JP.listPrice').fill('2200');
    const first = await save(page, gameKey);
    assert.equal(first.catalog.baseGame.pricingStrategy, 'regional');
    assert.equal(first.catalog.baseGame.listPrice, '19.99');
    assert.deepEqual(first.catalog.baseGame.regionalPrices, {
      US: { listPrice: '19.99', discountPrice: '' },
      SG: { listPrice: '17.99', discountPrice: '' },
      JP: { listPrice: '2200', discountPrice: '' },
    });

    await section(page, 'release');
    await page.locator('[data-release-territory="JP"]').uncheck();
    await section(page, 'catalog');
    assert.equal(await page.locator('[data-sku-price-zone="JP"]').count(), 0, '移除发行地区后对应价格行同步移除');
    assert.equal(await page.locator('[data-sku-price-zone="US"]').count(), 1);
    assert.equal(await page.locator('[data-sku-price-zone="SG"]').count(), 1, '相同币种的发行地区也应独立定价');
    assert.match(await page.locator('[data-sku-inherited-count]').innerText(), /1/, '德国继续继承基准价');
    await section(page, 'release');
    await page.locator('[data-release-territory="JP"]').check();
    await section(page, 'catalog');
    assert.equal(await field(page, 'catalog.baseGame.regionalPrices.JP.listPrice').inputValue(), '2200', '重新选择发行地区后恢复已填价格');

    await pricingStrategy(page, 0, 'uniform').check();
    await field(page, 'catalog.baseGame.listPrice').fill('20.99');
    await pricingStrategy(page, 0, 'regional').check();
    assert.equal(await field(page, 'catalog.baseGame.regionalPrices.SG.listPrice').inputValue(), '17.99');
    const pruning = await page.evaluate(async key => {
      const record = (await window.PublisherProfileStore.loadAll()).find(item => item.gameKey === key);
      const draft = window.PublisherGameProfile.createDraft(record.game, record.draft);
      draft.releaseConfig.globalTerritoryCodes = draft.releaseConfig.globalTerritoryCodes.filter(code => code !== 'JP');
      const snapshot = window.PublisherGameProfile.submissionSnapshot(draft);
      draft.catalog.baseGame.pricingStrategy = 'uniform';
      const uniformSnapshot = window.PublisherGameProfile.submissionSnapshot(draft);
      return { draftKeys: Object.keys(draft.catalog.baseGame.regionalPrices), snapshotKeys: Object.keys(snapshot.catalog.baseGame.regionalPrices), uniformSnapshotKeys: Object.keys(uniformSnapshot.catalog.baseGame.regionalPrices) };
    }, gameKey);
    assert.equal(pruning.draftKeys.includes('JP'), true, '草稿保留暂时移除区域的已填价格');
    assert.equal(pruning.snapshotKeys.includes('JP'), false, '提审快照不应携带发行范围外的价格');
    assert.deepEqual(pruning.uniformSnapshotKeys, [], '统一价提审快照不应携带隐藏例外价');
    await assertCatalogFits(page);
    assert.deepEqual(runtimeErrors.get(page), []);
    await capture(page, 'sku-regional-linked', { basePrice: first.catalog.baseGame.listPrice, territories: ['US', 'SG', 'DE', 'JP'], regionalPrices: first.catalog.baseGame.regionalPrices });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-sku-override-add="0"]').click();
    await assertCatalogFits(page);
    await page.screenshot({ path: path.join(evidence, 'sku-override-picker-mobile.png'), fullPage: true });
  } catch (error) { await failure(page, 'sku-regional-linked-failure'); throw error; }
  finally { await page.close(); }
});

test('付费 SKU 提审后锁定，撤销可改并以新编号重提，旧快照不变', async () => {
  const page = await open();
  try {
    const gameKey = await create(page, 'review');
    const paidCatalog = {
      baseGame: { skuId: 'BASE-GAME', type: 'base_game', title: 'Pricing Snapshot', installContentRef: 'BUILD-WIN-001', pricingModel: 'paid', pricingStrategy: 'regional', listPrice: '19.99', discountPrice: '9.99', regionalPrices: { JP: { listPrice: '2200', discountPrice: '' } }, discountStartAt: '2099-01-01T10:00', discountEndAt: '2099-01-08T10:00' },
      dlcs: [{ skuId: 'DLC-001', type: 'dlc', title: 'Soundtrack', installContentRef: 'DLC-BUILD-001', pricingModel: 'free', listPrice: '', discountPrice: '', discountStartAt: '', discountEndAt: '' }],
    };
    await seedReleaseReady(page, gameKey, paidCatalog);
    await page.locator('[data-profile-submit]').click();
    await page.locator('[data-profile-status]').filter({ hasText: /审核中|In review/ }).waitFor();
    const first = (await record(page, gameKey)).draft;
    assert.equal(await field(page, 'catalog.baseGame.listPrice').getAttribute('readonly'), '');
    assert.equal(await page.locator('[data-profile-submit]').count(), 0, '审核中仅保留撤销审核');
    const firstSnapshots = await snapshots(page, gameKey);
    assert.equal(firstSnapshots.length, 1);
    assert.equal(firstSnapshots[0].qualificationVersionId, 'QUAL-V1');
    assert.equal(firstSnapshots[0].draft.catalog.baseGame.listPrice, '19.99');
    assert.deepEqual(firstSnapshots[0].draft.catalog.baseGame.regionalPrices, { JP: { listPrice: '2200', discountPrice: '' } });
    await section(page, 'versions');
    await page.locator(`[data-version-open="${first.submissionId}"]`).click();
    const submittedSnapshot = page.locator(`[data-version-snapshot="${first.submissionId}"]`);
    await submittedSnapshot.waitFor();
    assert.match(await submittedSnapshot.innerText(), /分区定价[\s\S]*日本（JPY）2200[\s\S]*继承基准折扣比例/);
    await submittedSnapshot.locator('[data-version-snapshot-catalog]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(evidence, 'sku-version-pricing-snapshot.png'), fullPage: false });
    await page.locator('[data-version-back]').click();
    await section(page, 'catalog');
    await page.locator('[data-profile-withdraw]').click();
    await page.locator('[data-withdraw-confirm-submit]').click();
    await page.locator('[data-profile-status]').filter({ hasText: /待提交|Draft/ }).waitFor();
    assert.equal(await field(page, 'catalog.baseGame.listPrice').getAttribute('readonly'), null);
    await field(page, 'catalog.baseGame.listPrice').fill('24.99');
    await page.locator('[data-profile-submit]').click();
    await page.locator('[data-profile-status]').filter({ hasText: /审核中|In review/ }).waitFor();
    const second = (await record(page, gameKey)).draft;
    const allSnapshots = await snapshots(page, gameKey);
    assert.equal(allSnapshots.length, 2);
    assert.notEqual(second.submissionId, first.submissionId);
    assert.equal(allSnapshots.find(item => item.id === first.submissionId).status, 'withdrawn');
    assert.equal(allSnapshots.find(item => item.id === first.submissionId).draft.catalog.baseGame.listPrice, '19.99');
    assert.equal(allSnapshots.find(item => item.id === second.submissionId).draft.catalog.baseGame.listPrice, '24.99');
    assert.deepEqual(runtimeErrors.get(page), []);
    await capture(page, 'sku-review-resubmitted', { firstId: first.submissionId, secondId: second.submissionId, snapshots: allSnapshots.map(item => ({ id: item.id, status: item.status, price: item.draft.catalog.baseGame.listPrice })) });
  } catch (error) { await failure(page, 'sku-review-failure'); throw error; }
  finally { await page.close(); }
});

test('旧游戏级定价和中国大陆双范围草稿迁移为基础 SKU 与单一全球服', async () => {
  const page = await open();
  try {
    const migration = await page.evaluate(() => {
      const draft = window.PublisherGameProfile.createDraft({ gameKey: 'legacy-pricing', name: 'Legacy title' }, {
        gameNameEn: 'Legacy title', releaseStatus: 'released', releaseRegions: ['global', 'domestic'],
        releaseTerritories: [{ code: 'US', status: 'released' }, { code: 'CN', status: 'released' }],
        pricing: { model: 'paid', globalPrice: '14.99', domesticPrice: '68.00' },
      });
      const regional = window.PublisherGameProfile.createDraft({ gameKey: 'legacy-regional', name: 'Legacy regional' }, {
        releaseConfig: { mode: 'global', globalTerritoryCodes: ['US', 'DE', 'JP'], releaseStatus: 'released', effectiveMode: 'immediate', scheduledAt: '' },
        catalog: { baseGame: { skuId: 'BASE', type: 'base_game', title: 'Legacy regional', pricingModel: 'paid', pricingStrategy: 'regional', listPrice: '', discountPrice: '', regionalPrices: { USD: { listPrice: '19.99' }, EUR: { listPrice: '18.99' }, JPY: { listPrice: '2200' } } }, dlcs: [] },
      });
      return {
        catalog: draft.catalog,
        releaseConfig: draft.releaseConfig,
        releaseRegions: draft.releaseRegions,
        hasLanguages: Object.prototype.hasOwnProperty.call(draft, 'languages'),
        legacyRegional: { listPrice: regional.catalog.baseGame.listPrice, regionalPrices: regional.catalog.baseGame.regionalPrices, errors: Object.keys(window.PublisherGameProfile.validate(regional)).filter(key => key.startsWith('catalog.baseGame')) },
      };
    });
    assert.equal(migration.catalog.baseGame.pricingModel, 'paid');
    assert.equal(migration.catalog.baseGame.pricingStrategy, 'uniform');
    assert.equal(migration.catalog.baseGame.listPrice, '14.99');
    assert.deepEqual(migration.catalog.dlcs, []);
    assert.equal(migration.releaseConfig.mode, 'global');
    assert.equal(migration.releaseConfig.globalTerritoryCodes.includes('US'), true);
    assert.equal(migration.releaseConfig.globalTerritoryCodes.includes('CN'), false);
    assert.deepEqual(migration.releaseRegions, ['global']);
    assert.equal(migration.hasLanguages, false, '迁移后不应恢复第二套支持语言字段');
    assert.equal(migration.legacyRegional.listPrice, '', '旧币种分区价不得被静默推断为跨地区基准价');
    assert.deepEqual(migration.legacyRegional.regionalPrices, {
      US: { listPrice: '19.99', discountPrice: '' },
      DE: { listPrice: '18.99', discountPrice: '' },
      JP: { listPrice: '2200', discountPrice: '' },
    });
    assert.equal(migration.legacyRegional.errors.includes('catalog.baseGame.listPrice'), true, '旧分区草稿需补填基准价后才能提审');
    assert.deepEqual(runtimeErrors.get(page), []);
    fs.writeFileSync(path.join(evidence, 'legacy-migration.json'), JSON.stringify(migration, null, 2), 'utf8');
  } finally { await page.close(); }
});

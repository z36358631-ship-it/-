import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const demo = pathToFileURL(path.resolve('demos/开发者后台一期/02-CDKEY商品与供给demo.html')).href + '#/P02-01';
const evidence = path.resolve('tests/developer-backend/evidence/profile-v25/release-preparation');
const releaseLocators = [
  ['profile', '游戏资料'],
  ['builds', 'PC 包体'],
  ['catalog', '商品与 SKU'],
  ['release', '发行设置'],
  ['qualification', '资质认证'],
];
const primaryNavigation = [
  ['release-workspace', '版本发布'],
  ['versions', '发布记录'],
  ['qualifications', '资质认证'],
];
let browser;

before(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
});
after(async () => { await browser?.close(); });

async function open(width = 1440, height = 900) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(demo);
  await page.waitForFunction(() => Boolean(window.PublisherGameProfile && window.PublisherProfileStore && window.PublisherReleaseRegions));
  return page;
}
async function createGame(page, name) {
  await page.getByRole('button', { name: '添加游戏', exact: true }).click();
  const createSurface = page.locator('[data-publisher-create]');
  assert.equal(await createSurface.locator('[data-create-project-name]').count(), 1);
  assert.equal(await createSurface.locator('[data-game-name-input], [data-name-language], [data-name-settings], [data-create-language]').count(), 0);
  assert.doesNotMatch(await createSurface.innerText(), /管理多语言|English|简体中文|英语/);
  await page.locator('[data-create-project-name]').fill(name);
  await page.locator('[data-create-genre-toggle]').click();
  await page.locator('[data-create-genre-option][value="冒险"]').check();
  await page.keyboard.press('Escape');
  await page.locator('[data-create-relationship]').selectOption('developer_publisher');
  await page.locator('.pgc-plan-card--reservation').click();
  await page.locator('[data-create-submit]').click();
  await page.locator('[data-publisher-profile][data-profile-module="release-workspace"]').waitFor();
  const gameKey = await page.locator('[data-publisher-profile]').getAttribute('data-profile-game');
  assert.match(await page.locator('.publisher-game-context__game').innerText(), new RegExp(name));
  await page.locator('[data-profile-section="basic"] [data-name-language="zh"]').click();
  assert.equal(await page.locator('[data-game-name-input="zh"]').inputValue(), '', '后台项目名不得预填中文商店名');
  await page.locator('[data-profile-section="basic"] [data-name-language="en"]').click();
  assert.equal(await page.locator('[data-game-name-input="en"]').inputValue(), '', '后台项目名不得预填商店名');
  assert.equal(await page.locator('[data-profile-field="tagline"]').inputValue(), '', '创建时不得预填商店介绍');
  assert.equal(await page.locator('[data-profile-asset]').count(), 0, '创建时不得预填商店素材');
  return gameKey;
}
async function section(page, name) {
  if (releaseLocators.some(([id]) => id === name)) {
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
async function save(page, gameKey) {
  await page.locator('[data-profile-save]').click();
  await page.locator('[data-profile-save-state]').filter({ hasText: /所有更改已保存|All changes saved/ }).waitFor();
  return page.evaluate(async key => (await window.PublisherProfileStore.loadAll()).find(item => item.gameKey === key)?.draft, gameKey);
}
async function seedReady(page, gameKey) {
  await save(page, gameKey);
  await page.evaluate(async key => {
    const record = (await window.PublisherProfileStore.loadAll()).find(item => item.gameKey === key);
    const draft = window.PublisherGameProfile.createDraft(record.game, record.draft);
    draft.gameNames.en = 'Versioned Ocean';
    draft.gameNameEn = 'Versioned Ocean';
    draft.localizedContent.en = { tagline: 'A release-ready ocean adventure.', description: 'Explore a complete ocean world with a hand-built crew.', developerWords: '' };
    draft.tagline = draft.localizedContent.en.tagline;
    draft.description = draft.localizedContent.en.description;
    const image = (name, width, height) => ({ name, type: 'image/png', size: 4, blob: new Blob(['test'], { type: 'image/png' }), width, height });
    draft.assets.icon = image('icon.png', 512, 512);
    draft.assets.landscape = [image('cover.png', 1600, 900)];
    draft.assets.screenshots = [1, 2, 3].map(index => image(`shot-${index}.png`, 1600, 900));
    draft.localizedAssets[draft.defaultNameLanguage] = draft.assets;
    const buildFile = { name: 'ocean-1.0.0.zip', type: 'application/zip', size: 4, blob: new Blob(['test'], { type: 'application/zip' }) };
    draft.buildPackages = [{ id: 'BUILD-VERSION-001', source: 'local', platform: 'Windows', type: 'full', baseBuildId: '', file: buildFile, executable: 'Ocean.exe', launchArgs: '', version: '1.0.0', changelog: 'First release', status: 'parsed', testStatus: 'not_submitted', testReason: '', createdAt: new Date().toISOString() }];
    draft.catalog = { baseGame: { skuId: 'BASE-VERSION', type: 'base_game', title: 'Snapshot Base Product', installContentRef: 'BUILD-VERSION-001', pricingModel: 'paid', listPrice: '19.99', discountPrice: '', discountStartAt: '', discountEndAt: '' }, dlcs: [] };
    draft.releaseConfig = { ...draft.releaseConfig, mode: 'global', globalTerritoryCodes: ['US', 'JP'], releaseStatus: 'pre_registration' };
    draft.releaseRegions = ['global'];
    draft.releaseStatus = 'pre_registration';
    const qualification = window.PublisherGameQualifications.createApplicationDraft({ rightsRelationship: 'self_owned', rightsDeclarationAccepted: true });
    qualification.authorization.files = [image('ownership.png', 1200, 900)];
    draft.qualifications = window.PublisherGameQualifications.createQualificationState({ rightsRelationship: 'self_owned', rightsDeclarationAccepted: true, draft: qualification, activeVersion: { id: 'QUAL-V1', versionId: 'QUAL-V1', status: 'approved', snapshot: qualification } });
    await window.PublisherProfileStore.save(draft, record.game);
  }, gameKey);
  await page.reload();
  await page.waitForFunction(key => Boolean(document.querySelector(`[data-publisher-game-console][data-selected-game="${CSS.escape(key)}"]`) || document.querySelector(`[data-portal-action="enter-publisher-game"][data-publisher-game="${CSS.escape(key)}"]`)), gameKey);
  if (!await page.locator(`[data-publisher-game-console][data-selected-game="${gameKey}"]`).count()) {
    await page.locator(`[data-portal-action="enter-publisher-game"][data-publisher-game="${gameKey}"]`).first().click();
  }
  await page.locator(`[data-publisher-game-console][data-selected-game="${gameKey}"]`).waitFor();
  await section(page, 'profile');
}
async function setBuildTestResult(page, gameKey, status, reason = '') {
  await page.evaluate(async ({ key, nextStatus, nextReason }) => {
    const db = await window.PublisherStorageSchema.open();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['profiles', 'submissions'], 'readwrite');
      const profiles = transaction.objectStore('profiles');
      const profileRequest = profiles.get(key);
      profileRequest.onsuccess = () => {
        const record = profileRequest.result;
        record.draft.buildPackages = record.draft.buildPackages.map(build => ({ ...build, testStatus: nextStatus, testReason: nextReason, tester: '平台测试 王珂', testedAt: new Date().toISOString() }));
        profiles.put(record);
        const submissions = transaction.objectStore('submissions');
        const submissionRequest = submissions.get(record.draft.submissionId);
        submissionRequest.onsuccess = () => {
          if (!submissionRequest.result) return;
          const submission = submissionRequest.result;
          submission.draft.buildPackages = submission.draft.buildPackages.map(build => ({ ...build, testStatus: nextStatus, testReason: nextReason, tester: '平台测试 王珂', testedAt: new Date().toISOString() }));
          submissions.put(submission);
        };
      };
      transaction.oncomplete = resolve;
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('test-result-update-failed'));
    });
  }, { key: gameKey, nextStatus: status, nextReason: reason });
  await page.reload();
  await page.waitForFunction(key => Boolean(document.querySelector(`[data-publisher-game-console][data-selected-game="${CSS.escape(key)}"]`) || document.querySelector(`[data-portal-action="enter-publisher-game"][data-publisher-game="${CSS.escape(key)}"]`)), gameKey);
  if (!await page.locator(`[data-publisher-game-console][data-selected-game="${gameKey}"]`).count()) {
    await page.locator(`[data-portal-action="enter-publisher-game"][data-publisher-game="${gameKey}"]`).first().click();
  }
  await page.locator(`[data-publisher-game-console][data-selected-game="${gameKey}"]`).waitFor();
}

test('创建后左侧只有三个一级入口，版本发布内五个横向项仅作页内定位', async () => {
  const page = await open();
  try {
    await createGame(page, 'Navigation Boundary QA');
    const nav = page.locator('.publisher-game-nav__tab[data-game-section]');
    assert.deepEqual(await nav.evaluateAll(elements => elements.map(element => [element.dataset.gameSection, element.textContent.trim()])), primaryNavigation);
    assert.equal(await page.locator('[data-game-section="overview"], [data-game-section="profile"], [data-game-section="catalog"], [data-game-section="release"], [data-game-section="cdkey"]').count(), 0);
    assert.deepEqual(await page.locator('[data-release-locator]').evaluateAll(elements => elements.map(element => [element.dataset.releaseLocator, element.textContent.trim()])), releaseLocators);
    assert.equal(await page.getByRole('heading', { name: '版本发布', exact: true }).isVisible(), true);
    assert.equal(await page.locator('[data-profile-save]').count(), 1);
    assert.equal(await page.locator('[data-profile-submit]').count(), 1);
    assert.equal(await page.getByLabel('开发者的话').count(), 0);
    assert.equal(await page.getByText('是否已上架其他平台', { exact: true }).count(), 0);
    for (const [id] of releaseLocators) {
      await section(page, id);
      assert.equal(await page.locator(`[data-release-locator="${id}"]`).evaluate(element => element.classList.contains('is-active')), true);
      assert.equal(await page.locator('[data-publisher-profile]').getAttribute('data-profile-module'), 'release-workspace');
    }
    await section(page, 'versions');
    assert.equal(await page.getByRole('heading', { name: '发布记录', exact: true }).isVisible(), true);
    assert.equal(await page.locator('[data-profile-save], [data-profile-submit]').count(), 0);
    await section(page, 'qualifications');
    assert.equal(await page.getByRole('heading', { name: '资质认证', exact: true, level: 2 }).isVisible(), true);
    assert.equal(await page.locator('[data-profile-save], [data-profile-submit]').count(), 0);
    await page.locator('[data-publisher-function-search]').fill('商品');
    assert.equal(await page.locator('.publisher-game-nav__tab[data-game-section="release-workspace"]').isVisible(), true);
    assert.equal(await page.locator('.publisher-game-nav__tab[data-game-section="qualifications"]').isVisible(), false);
    await page.locator('[data-publisher-function-search]').fill('');
    await section(page, 'profile');
    assert.doesNotMatch(await page.locator('[data-publisher-game-console]').innerText(), /CDKEY/i);
    await page.screenshot({ path: path.join(evidence, 'three-level-navigation.png'), fullPage: true });
  } finally { await page.close(); }
});

test('发行状态和主体关系为平铺单选，海外资质只保留多附件上传', async () => {
  const page = await open();
  try {
    const gameKey = await createGame(page, 'Flat Choices QA');
    assert.equal(await page.locator('select[data-profile-field="relationship"]').count(), 0);
    assert.equal(await page.locator('input[type="radio"][data-profile-field="relationship"]').count(), 3);
    await page.getByLabel('发行商', { exact: true }).check();
    assert.equal(await page.locator('[data-profile-field="developerName"]').count(), 1);

    await section(page, 'release');
    assert.equal(await page.locator('select[data-profile-field="releaseStatus"]').count(), 0);
    assert.equal(await page.locator('input[type="radio"][data-profile-field="releaseStatus"]').count(), 4);
    await page.getByLabel('正式上线（试玩版）', { exact: true }).check();
    assert.equal(await page.getByLabel('正式上线（试玩版）', { exact: true }).isChecked(), true);
    await page.locator('[data-profile-field-wrap="releaseStatus"]').screenshot({ path: path.join(evidence, 'flat-release-status.png') });

    await section(page, 'qualifications');
    assert.deepEqual(await page.locator('[data-qualification-region-card]').evaluateAll(elements => elements.map(element => element.dataset.qualificationRegionCard)), ['global', 'domestic']);
    assert.equal(await page.locator('.pgp-qualification-state').count(), 0, '资质列表不展示跨整页的审核状态条');
    await page.locator('[data-qualification-region-open="global"]').click();
    assert.equal(await page.locator('select[data-qualification-field="rightsRelationship"]').count(), 0);
    assert.equal(await page.locator('input[type="radio"][data-qualification-field="rightsRelationship"]').count(), 0);
    assert.equal(await page.locator('[data-qualification-ownership]').count(), 1);
    assert.equal(await page.locator('[data-qualification-file="authorization.files"]').count(), 1);
    await page.locator('[data-qualification-editor]').screenshot({ path: path.join(evidence, 'flat-rights-ownership-upload.png') });

    await page.locator('[data-qualification-submit]').click();
    assert.match(await page.locator('[data-qualification-error="authorization.files"]').innerText(), /请上传 1–10 张 JPG\/PNG 权属证明附件/);

    await page.locator('[data-qualification-file="authorization.files"]').setInputFiles({
      name: 'ownership.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
    });
    await page.getByText('ownership.png', { exact: true }).waitFor();
    assert.equal(await page.locator('[data-qualification-error="authorization.files"]').isHidden(), true);
    await page.locator('[data-qualification-submit]').click();
    await page.locator('[data-qualification-region-card="global"][data-qualification-region-status="reviewing"]').waitFor();
    assert.equal(await page.locator('[data-qualification-region-card="domestic"][data-qualification-region-status="notSubmitted"]').count(), 1, '两类区域分别展示审核状态');
    assert.equal(await page.locator('[data-qualification-region-withdraw="global"]').count(), 1, '审核中的区域可撤销');
    await page.locator('[data-qualification-region-grid]').screenshot({ path: path.join(evidence, 'qualification-regions-independent-review.png') });
    const saved = await page.evaluate(async key => (await window.PublisherProfileStore.loadAll()).find(item => item.gameKey === key)?.draft, gameKey);
    assert.equal(saved.qualifications.pendingApplication.snapshot.authorization.files.length, 1);
    await page.locator('[data-qualification-region-withdraw="global"]').click();
    await page.locator('[data-profile-withdraw-confirm]').waitFor();
    assert.equal(await page.locator('[data-qualification-region-card="global"][data-qualification-region-status="reviewing"]').count(), 1, '二次确认前不得撤销资质审核');
    await page.locator('[data-profile-withdraw-confirm] .pgp-confirm__dialog').screenshot({ path: path.join(evidence, 'qualification-withdraw-confirm.png') });
    await page.locator('[data-withdraw-confirm-cancel]').last().click();
    assert.equal(await page.locator('[data-profile-withdraw-confirm]').count(), 0);
    await page.locator('[data-qualification-region-withdraw="global"]').click();
    await page.locator('[data-withdraw-confirm-submit]').click();
    await page.locator('[data-qualification-region-card="global"][data-qualification-region-status="notSubmitted"]').waitFor();
  } finally { await page.close(); }
});

test('PC 包体支持包体库占位、整包上传和基于整包的增量上传', async () => {
  const page = await open();
  try {
    const gameKey = await createGame(page, 'Build Upload QA');
    await section(page, 'builds');
    await save(page, gameKey);
    assert.equal(await page.evaluate(async key => {
      const record = (await window.PublisherProfileStore.loadAll()).find(item => item.gameKey === key);
      return window.PublisherGameProfile.validate(window.PublisherGameProfile.createDraft(record.game, record.draft))['buildPackages.readyFull'];
    }, gameKey), 'buildRequired');
    await page.getByRole('button', { name: '从包体库选择', exact: true }).click();
    assert.match(await page.locator('[data-build-library-placeholder]').innerText(), /待后续 PRD 补充/);

    await page.getByRole('button', { name: '从本地上传', exact: true }).click();
    await page.locator('[data-build-modal-backdrop]').screenshot({ path: path.join(evidence, 'build-upload-full-modal.png') });
    await page.locator('.pgb-choice label').filter({ hasText: '增量上传' }).click();
    assert.match(await page.locator('[data-build-upload-field="baseBuildId"]').locator('option').first().innerText(), /暂无可用整包/);
    await page.locator('[data-build-upload-file]').setInputFiles({ name: 'patch-1.0.1.zip', mimeType: 'application/zip', buffer: Buffer.from('patch') });
    await page.locator('[data-build-upload-field="executable"]').fill('Game.exe');
    await page.locator('[data-build-upload-field="version"]').fill('1.0.1');
    await page.locator('[data-build-upload-field="changelog"]').fill('修复已知问题');
    await page.getByRole('button', { name: '保存包体', exact: true }).click();
    assert.match(await page.locator('[data-build-upload-error="baseBuildId"]').innerText(), /必须选择同平台/);

    await page.locator('.pgb-choice label').filter({ hasText: '游戏整包' }).click();
    await page.locator('[data-build-upload-file]').setInputFiles({ name: 'game-full-1.0.0.zip', mimeType: 'application/zip', buffer: Buffer.from('full') });
    await page.locator('[data-build-upload-field="version"]').fill('1.0.0');
    await page.locator('[data-build-upload-field="changelog"]').fill('首个可发布整包');
    await page.getByRole('button', { name: '保存包体', exact: true }).click();
    const fullRow = page.locator('[data-build-row]').filter({ hasText: '游戏整包' });
    await fullRow.waitFor();
    assert.match(await fullRow.innerText(), /1\.0\.0/);
    assert.match(await fullRow.innerText(), /解析通过/);
    assert.match(await fullRow.innerText(), /待提审/);
    assert.equal(await fullRow.getByRole('button').count(), 0, '开发者只能查看测试状态，不能提交测试结论');
    const fullId = await fullRow.getAttribute('data-build-row');

    await page.getByRole('button', { name: '从本地上传', exact: true }).click();
    await page.locator('.pgb-choice label').filter({ hasText: '增量上传' }).click();
    await page.locator('[data-build-upload-field="baseBuildId"]').selectOption(fullId);
    await page.locator('[data-build-upload-file]').setInputFiles({ name: 'patch-1.0.1.zip', mimeType: 'application/zip', buffer: Buffer.from('patch') });
    await page.locator('[data-build-upload-field="executable"]').fill('Game.exe');
    assert.equal(await page.locator('[data-build-upload-field="launchArgs"]').isVisible(), false, '不展示游戏启动参数');
    await page.locator('[data-build-upload-field="version"]').fill('1.0.1');
    await page.locator('[data-build-upload-field="changelog"]').fill('增量更新：修复启动问题');
    await page.getByRole('button', { name: '保存包体', exact: true }).click();
    const incrementalRow = page.locator('[data-build-row]').filter({ hasText: '增量上传' });
    await incrementalRow.waitFor();
    assert.match(await incrementalRow.innerText(), /1\.0\.1/);
    assert.match(await incrementalRow.innerText(), new RegExp(fullId));
    assert.match(await incrementalRow.innerText(), /待提审/);
    await page.locator('[data-profile-builds]').screenshot({ path: path.join(evidence, 'build-package-list.png') });
    await save(page, gameKey);
    assert.equal(await page.evaluate(async key => {
      const record = (await window.PublisherProfileStore.loadAll()).find(item => item.gameKey === key);
      return Boolean(window.PublisherGameProfile.validate(window.PublisherGameProfile.createDraft(record.game, record.draft))['buildPackages.readyFull']);
    }, gameKey), false);

    await section(page, 'catalog');
    const buildSelect = page.locator('[data-sku-build="catalog.baseGame"]');
    await buildSelect.selectOption(fullId);
    assert.equal(await buildSelect.inputValue(), fullId);
    await page.screenshot({ path: path.join(evidence, 'full-and-incremental-builds.png'), fullPage: true });
  } finally { await page.close(); }
});

test('发行范围默认全球服且与国内服互斥，国家按洲分组后才设发行状态', async () => {
  const page = await open();
  try {
    await createGame(page, 'Release Scope QA');
    await section(page, 'release');
    assert.deepEqual(await page.locator('[data-release-mode]').evaluateAll(elements => elements.map(element => element.dataset.releaseMode)), ['global', 'domestic']);
    assert.equal(await page.locator('[data-release-mode="global"]').isChecked(), true);
    assert.equal(await page.locator('[data-release-mode="domestic"]').isChecked(), false);
    assert.equal(await page.locator('[data-release-territory="CN"]').count(), 0);
    const catalogCount = await page.evaluate(() => window.PublisherReleaseRegions.globalCatalog.length);
    assert.equal(await page.locator('[data-release-territory]:checked').count(), catalogCount, '全球服默认选中全部可发行国家/地区');
    assert.equal(await page.locator('[data-release-regions]').evaluate(root => Boolean(root.compareDocumentPosition(document.querySelector('[data-profile-field-wrap="releaseStatus"]')) & Node.DOCUMENT_POSITION_FOLLOWING)), true, '国家和洲应排在发行状态之前');
    await page.locator('[data-territory-filter="keyword"]').fill('日本');
    assert.deepEqual(await page.locator('[data-territory-card]:visible').evaluateAll(cards => cards.map(card => card.dataset.territoryCard)), ['JP']);
    await page.locator('[data-territory-filter="continent"]').selectOption('AS');
    assert.deepEqual(await page.locator('[data-territory-card]:visible').evaluateAll(cards => cards.map(card => card.dataset.territoryCard)), ['JP']);
    await page.locator('[data-territory-clear-filters]').click();
    await page.locator('[data-release-territory="JP"]').uncheck({ force: true });
    await page.locator('[data-release-service="domestic"]').click();
    assert.equal(await page.locator('[data-release-mode="global"]').isChecked(), false);
    assert.equal(await page.locator('[data-domestic-territory]').isVisible(), true);
    await page.locator('[data-release-service="global"]').click();
    assert.equal(await page.locator('[data-release-territory="JP"]').isChecked(), false, '切换范围后应保留全球国家草稿');
  } finally { await page.close(); }
});

test('选国内服后界面回中文、资料定位中文、价格切 CNY 并显示 PC 版号字段', async () => {
  const page = await open();
  try {
    await createGame(page, 'Domestic Linkage QA');
    await page.locator('[data-portal-action="toggle-interface-language"]').click();
    assert.equal(await page.locator('[data-publisher-profile]').getAttribute('data-profile-language'), 'en');
    await section(page, 'release');
    await page.locator('[data-release-service="domestic"]').click();
    await page.locator('[data-publisher-profile][data-profile-language="zh"]').waitFor();
    await section(page, 'profile');
    assert.equal(await page.locator('[data-name-language="zh"][aria-selected="true"]').first().count(), 1);
    await section(page, 'catalog');
    assert.match(await page.locator('[data-profile-catalog]').innerText(), /CNY/);
    await section(page, 'qualifications');
    await page.locator('[data-qualification-region-open="domestic"]').click();
    assert.equal(await page.locator('[data-qualification-field="domestic.licenseNumber"]').count(), 1);
    assert.equal(await page.locator('[data-qualification-field*="apk" i], [data-qualification-field*="sdk" i], [data-qualification-field*="mobile" i]').count(), 0);
  } finally { await page.close(); }
});

test('版本发布页内定位器只滚动长页并同步选中态', async () => {
  const page = await open(1440, 760);
  try {
    await createGame(page, 'Scroll Navigation QA');
    const before = await page.locator('.workspace').evaluate(element => element.scrollTop);
    await section(page, 'catalog');
    await page.waitForFunction(value => document.querySelector('.workspace')?.scrollTop > value + 200, before);
    const afterCatalog = await page.locator('.workspace').evaluate(element => element.scrollTop);
    assert.ok(afterCatalog > before + 200, `商品与 SKU 定位应向下滚动，实际 scrollTop=${afterCatalog}`);
    assert.equal(await page.locator('.pgp-release-toolbar').evaluate(element => getComputedStyle(element).position), 'sticky');
    assert.equal(await page.locator('[data-publisher-profile]').getAttribute('data-profile-module'), 'release-workspace');
    assert.equal(await page.locator('[data-release-locator="catalog"]').getAttribute('aria-current'), 'location');
    await page.locator('[data-profile-back-top]').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(evidence, 'sticky-locator-back-top-1440.png') });
    await page.locator('[data-profile-back-top]').click();
    await page.waitForFunction(() => document.querySelector('.workspace')?.scrollTop < 20);
    assert.equal(await page.locator('[data-profile-back-top]').isHidden(), true);
    assert.equal(await page.locator('[data-publisher-profile]').getAttribute('data-profile-module'), 'release-workspace');
  } finally { await page.close(); }
});

test('版本记录展示撤销状态并可打开不可变提审快照', async () => {
  const page = await open();
  try {
    const gameKey = await createGame(page, 'Version Snapshot QA');
    await seedReady(page, gameKey);
    await page.locator('[data-profile-submit]').click();
    await page.locator('[data-profile-status]').filter({ hasText: '审核中' }).waitFor();
    const submission = (await page.evaluate(key => window.PublisherProfileStore.loadSubmissions(key), gameKey))[0];
    assert.equal(submission.draft.buildPackages[0].testStatus, 'pending', '提审快照中的未测试包体应进入待测试');
    await page.locator('[data-profile-withdraw]').click();
    await page.locator('[data-profile-withdraw-confirm]').waitFor();
    assert.equal(await page.locator('[data-profile-status]').filter({ hasText: '审核中' }).count(), 1, '二次确认前不得撤销版本审核');
    await page.locator('[data-withdraw-confirm-submit]').click();
    await page.locator('[data-profile-status]').filter({ hasText: '待提交' }).waitFor();
    await section(page, 'versions');
    const row = page.locator(`[data-version-record="${submission.id}"]`);
    assert.match(await row.innerText(), /已撤销/);
    await page.screenshot({ path: path.join(evidence, 'version-records-1440.png'), fullPage: true });
    await row.locator('[data-version-open]').click();
    await page.getByText('Snapshot Base Product', { exact: true }).waitFor();
    assert.match(await page.locator('body').innerText(), /19\.99/);
    assert.match(await page.locator('body').innerText(), /QUAL-V1/);
    assert.match(await page.locator('[data-version-snapshot-builds]').innerText(), /BUILD-VERSION-001/);
    assert.match(await page.locator('[data-version-snapshot-builds]').innerText(), /测试状态/);
    assert.match(await page.locator('[data-version-snapshot-builds]').innerText(), /待测试/);
    await page.screenshot({ path: path.join(evidence, 'version-snapshot-1440.png'), fullPage: true });
    const persisted = (await page.evaluate(key => window.PublisherProfileStore.loadSubmissions(key), gameKey)).find(item => item.id === submission.id);
    assert.equal(persisted.status, 'withdrawn');
    assert.equal(persisted.draft.catalog.baseGame.listPrice, '19.99');
  } finally { await page.close(); }
});

test('开发者可查看包体待测试与不通过原因，但不能修改测试结论', async () => {
  const page = await open();
  try {
    const gameKey = await createGame(page, 'Build Test Result QA');
    await seedReady(page, gameKey);
    await page.locator('[data-profile-submit]').click();
    await page.locator('[data-profile-status]').filter({ hasText: '审核中' }).waitFor();
    await section(page, 'builds');
    const row = page.locator('[data-build-row="BUILD-VERSION-001"]');
    assert.match(await row.innerText(), /待测试/);
    await page.locator('[data-profile-builds]').screenshot({ path: path.join(evidence, 'build-test-pending.png') });

    await setBuildTestResult(page, gameKey, 'failed', 'Windows 11 环境启动后黑屏，需补传修复包。');
    await section(page, 'builds');
    const failedRow = page.locator('[data-build-row="BUILD-VERSION-001"]');
    assert.match(await failedRow.innerText(), /测试不通过/);
    assert.match(await failedRow.innerText(), /启动后黑屏/);
    assert.equal(await failedRow.getByRole('button').count(), 0);
    await page.locator('[data-profile-builds]').screenshot({ path: path.join(evidence, 'build-test-failed.png') });
  } finally { await page.close(); }
});

for (const [width, height] of [[768, 900], [390, 844]]) test(`${width}px 三个一级页面无根节点横向溢出`, async () => {
  const page = await open(width, height);
  try {
    await createGame(page, `Responsive ${width}`);
    for (const [id] of primaryNavigation) {
      await section(page, id);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, `${id} 在 ${width}px 不应横向溢出`);
    }
    await page.screenshot({ path: path.join(evidence, `responsive-${width}.png`), fullPage: true });
  } finally { await page.close(); }
});

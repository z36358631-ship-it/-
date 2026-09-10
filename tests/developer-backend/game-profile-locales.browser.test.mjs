import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const demoFile = path.resolve('demos/开发者后台一期/02-游戏创建与发行demo.html');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));
let browser;

const demoUrl = route => {
  const url = pathToFileURL(demoFile);
  url.hash = route;
  return url.href;
};

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files', '--disable-background-networking'] });
});
after(async () => { await browser?.close(); });

async function seedRegisteredAccount(page, accountKey) {
  await page.goto(demoUrl('/P01-01'), { waitUntil: 'load' });
  await page.evaluate(key => {
    localStorage.clear();
    sessionStorage.clear();
    window.name = '';
    sessionStorage.setItem('gamehub-developer-session-v1', JSON.stringify({ authenticated: true, accountKey: key }));
    localStorage.setItem('gamehub-developer-account-states-v1', JSON.stringify({
      [key]: {
        registration: { accountTier: 'registered', registeredAt: '2026-09-10 10:00', consoleTab: 'games' },
        qualification: { status: 'unsubmitted', revision: 0, step: 0, view: 'intro', form: {}, history: [], submissions: [] },
      },
    }));
    history.replaceState(null, '', '#/P02-01');
  }, accountKey);
  await page.reload({ waitUntil: 'load' });
  await page.locator('[data-publisher-workspace][data-publisher-access="personal"]').waitFor();
}

async function createGame(page) {
  await page.getByRole('button', { name: '添加游戏', exact: true }).click();
  await page.locator('[data-create-project-name]').fill('Locale QA');
  await page.locator('[data-create-genre-toggle]').click();
  await page.locator('[data-create-genre-option][value="冒险"]').check();
  await page.keyboard.press('Escape');
  await page.locator('[data-create-relationship]').selectOption('developer_publisher');
  await page.locator('.pgc-plan-card--reservation').click();
  await page.locator('[data-create-submit]').click();
  await page.locator('[data-publisher-profile][data-profile-module="release-workspace"]').waitFor();
  return page.locator('[data-publisher-profile]').getAttribute('data-profile-game');
}

test('英语默认必填，确认新增语种后显示并保存对应商店资料', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  try {
    await seedRegisteredAccount(page, 'locale:test:registered');
    await page.waitForFunction(() => Boolean(window.PublisherGameProfile && window.PublisherProfileStore));
    const gameKey = await createGame(page);
    const basic = page.locator('[data-profile-section="basic"]');
    assert.deepEqual(await basic.locator('[data-name-language]').evaluateAll(items => items.map(item => item.dataset.nameLanguage)), ['en']);
    assert.equal(await basic.locator('[data-name-language="en"] small').innerText(), '默认');

    await basic.locator('[data-name-settings]').click();
    const english = basic.locator('[data-name-option="en"]');
    assert.equal(await english.isChecked(), true);
    assert.equal(await english.isDisabled(), true);
    await basic.locator('[data-name-option="ja"]').check();
    await basic.locator('[data-name-confirm]').click();
    assert.deepEqual(await basic.locator('[data-name-language]').evaluateAll(items => items.map(item => item.dataset.nameLanguage)), ['en', 'ja']);

    await basic.locator('[data-name-language="ja"]').click();
    await page.locator('[data-game-name-input="ja"]').fill('星海の旅');
    await page.locator('[data-profile-field="localizedContent.ja.tagline"]').fill('星海を旅する冒険。');
    await page.locator('[data-profile-field="localizedContent.ja.description"]').fill('仲間とともに星々を巡る PC 向けアドベンチャーゲームです。');
    assert.equal(await page.locator('[data-profile-section="assets"] [data-name-language="ja"]').count(), 1, '新增语种同步到素材编辑区');

    await page.locator('[data-profile-save]').click();
    await page.locator('[data-profile-save-state]').filter({ hasText: /所有更改已保存|All changes saved/ }).waitFor();
    const saved = await page.evaluate(async key => (await window.PublisherProfileStore.loadAll()).find(item => item.gameKey === key)?.draft, gameKey);
    assert.deepEqual(saved.storeLocales.enabled, ['en', 'ja']);
    assert.equal(saved.storeLocales.default, 'en');
    assert.equal(saved.gameNames.ja, '星海の旅');
    assert.equal(saved.localizedContent.ja.tagline, '星海を旅する冒険。');
    assert.match(saved.localizedContent.ja.description, /PC/);

    await page.reload({ waitUntil: 'load' });
    await page.locator('[data-publisher-workspace]').waitFor();
    if (await page.locator('[data-publisher-profile]').count() === 0) {
      await page.locator(`[data-portal-action="enter-publisher-game"][data-publisher-game="${gameKey}"]`).first().click();
    }
    await page.locator(`[data-publisher-profile][data-profile-game="${gameKey}"]`).waitFor();
    const reopenedBasic = page.locator('[data-profile-section="basic"]');
    assert.deepEqual(await reopenedBasic.locator('[data-name-language]').evaluateAll(items => items.map(item => item.dataset.nameLanguage)), ['en', 'ja']);
    await reopenedBasic.locator('[data-name-language="ja"]').click();
    assert.equal(await page.locator('[data-game-name-input="ja"]').inputValue(), '星海の旅');
    assert.equal(await page.locator('[data-profile-field="localizedContent.ja.tagline"]').inputValue(), '星海を旅する冒険。');
    assert.equal(await page.locator('[data-profile-section="assets"] [data-name-language="ja"]').count(), 1);
    assert.deepEqual(runtimeErrors, []);
  } finally {
    await context.close();
  }
});

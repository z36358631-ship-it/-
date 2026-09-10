import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const evidence = path.resolve('tests/developer-backend/evidence/game-create');
const url = pathToFileURL(path.resolve('demos/开发者后台一期/02-游戏创建与发行demo.html')).href + '#/P02-01';
let browser;
let accountSerial = 0;
before(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
});
after(async () => { await browser?.close(); });
async function open(width = 1440, height = 1000) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url);
  const accountKey = `game-create:test:${++accountSerial}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
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
    try {
      await page.locator('[data-publisher-workspace][data-publisher-access="personal"]').waitFor({ timeout: 15000 });
      break;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  await page.getByRole('button', { name: '添加游戏', exact: true }).click();
  await page.locator('[data-publisher-create]').waitFor();
  return page;
}
async function chooseGenres(page, values) {
  if (await page.locator('[data-create-genre-toggle]').getAttribute('aria-expanded') !== 'true') await page.locator('[data-create-genre-toggle]').click();
  for (const value of values) await page.locator(`[data-create-genre-option][value="${value}"]`).check();
  await page.keyboard.press('Escape');
}
async function choosePlan(page, value) {
  await page.locator(`.pgc-plan-card--${value}`).click();
  assert.equal(await page.locator(`[data-create-release-plan="${value}"]`).isChecked(), true);
}
async function fill(page, name = 'Ocean Trail', plan = 'reservation') {
  await page.locator('[data-create-project-name]').fill(name);
  await chooseGenres(page, ['冒险', '策略']);
  await page.locator('[data-create-relationship]').selectOption('developer_publisher');
  await choosePlan(page, plan);
}
function errorField(page, key) { return page.locator('[data-create-error="' + key + '"]'); }
async function snapshot(page) {
  await page.locator('[data-create-genre-toggle]').click();
  const genres = await page.locator('[data-create-genre-option]:checked').evaluateAll(inputs => inputs.map(input => input.value));
  await page.keyboard.press('Escape');
  return {
    projectName: await page.locator('[data-create-project-name]').inputValue(),
    genres,
    relationship: await page.locator('[data-create-relationship]').inputValue(),
    developerName: await page.locator('[data-create-developer-name]').count() ? await page.locator('[data-create-developer-name]').inputValue() : null,
    platforms: await page.locator('[data-create-platform]:checked').evaluateAll(inputs => inputs.map(input => input.value)),
    releasePlan: await page.locator('[data-create-release-plan]:checked').count() ? await page.locator('[data-create-release-plan]:checked').inputValue() : '',
  };
}

async function assertEnglishCopy(page) {
  const component = page.locator('[data-publisher-create]');
  assert.doesNotMatch(await component.innerText(), /[\u3400-\u9fff]/, 'English UI must not retain Chinese interface copy');
  const labels = await component.locator('[aria-label], [placeholder], [title], [alt]').evaluateAll(elements => elements.flatMap(element => ['aria-label', 'placeholder', 'title', 'alt'].map(attribute => element.getAttribute(attribute)).filter(Boolean)));
  for (const label of labels) assert.doesNotMatch(label, /[\u3400-\u9fff]/);
}
async function failureEvidence(page, name) {
  await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: true });
  fs.writeFileSync(path.join(evidence, `${name}.html`), await page.content(), 'utf8');
}

test('空提交展示必填错误，类型和平台至少保留一个，项目名称限制可阻断非法提交', async () => {
  const page = await open();
  try {
    assert.deepEqual(await page.locator('[data-create-platform]:checked').evaluateAll(inputs => inputs.map(input => input.value)), ['Windows']);
    assert.equal(await page.locator('[data-release-region]:checked').count(), 0);
    await page.locator('[data-create-platform][value="Windows"]').uncheck();
    await page.locator('[data-create-submit]').click();
    for (const key of ['projectName', 'genres', 'relationship', 'platforms', 'releasePlan']) assert.equal(await errorField(page, key).isVisible(), true, key);
    assert.equal(await page.locator('[data-create-project-name]').evaluate(element => element === document.activeElement), true);
    assert.match(await errorField(page, 'projectName').innerText(), /后台项目名称/);
    assert.equal(await page.locator('[data-publisher-profile]').count(), 0);
    await fill(page);
    await page.locator('[data-create-submit]').click();
    assert.equal(await page.locator('[data-create-error="platforms"]').isVisible(), true);
    assert.equal(await page.locator('[data-publisher-create]').count(), 1);
    const overlongErrors = await page.evaluate(() => {
      const draft = window.PublisherGameCreate.createDraft();
      Object.assign(draft, { projectName: 'a'.repeat(101), genres: ['冒险'], relationship: 'developer', releasePlan: 'launch' });
      return window.PublisherGameCreate.validate(draft);
    });
    assert.deepEqual(overlongErrors, { projectName: 'projectNameTooLong' });
  } finally { await page.close(); }
});

test('游戏类型支持多选、取消选中与 Esc，切换主体保留开发商名称', async () => {
  const page = await open();
  try {
    await chooseGenres(page, ['冒险', '策略', '动作']);
    assert.match(await page.locator('[data-create-genre-toggle]').innerText(), /动作/);
    assert.match(await page.locator('[data-create-genre-toggle]').innerText(), /策略/);
    assert.match(await page.locator('[data-create-genre-toggle]').innerText(), /冒险/);
    await page.locator('[data-create-genre-toggle]').click();
    await page.locator('[data-create-genre-option][value="动作"]').uncheck();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-create-genre-toggle]').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('[data-create-genre-toggle]').evaluate(element => element === document.activeElement), true);
    assert.doesNotMatch(await page.locator('[data-create-genre-toggle]').innerText(), /动作/);
    await page.locator('[data-create-relationship]').selectOption('publisher');
    await page.locator('[data-create-developer-name]').fill('Ocean 开发工作室');
    for (const relationship of ['developer', 'developer_publisher']) {
      await page.locator('[data-create-relationship]').selectOption(relationship);
      assert.equal(await page.locator('[data-create-developer-field]').count(), 0);
      await page.locator('[data-create-relationship]').selectOption('publisher');
      assert.equal(await page.locator('[data-create-developer-name]').inputValue(), 'Ocean 开发工作室');
    }
  } finally { await page.close(); }
});

test('返回游戏管理后再次创建保留全部草稿字段', async () => {
  const page = await open();
  try {
    await fill(page, 'Keep My Draft', 'test');
    await page.locator('[data-create-relationship]').selectOption('publisher');
    await page.locator('[data-create-developer-name]').fill('Sea Studio');
    await page.locator('[data-create-platform][value="macOS"]').check();
    const previous = await snapshot(page);
    await page.locator('[data-create-close]').first().click();
    await page.getByRole('button', { name: '添加游戏', exact: true }).click();
    assert.deepEqual(await snapshot(page), previous);
  } finally { await page.close(); }
});

test('三种发布计划均可创建唯一后台项目与 Game ID，App ID 和商店名称保持待配置', async () => {
  const page = await open();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    const keys = new Set();
    const ids = new Set();
    for (const [index, plan] of ['reservation', 'test', 'launch'].entries()) {
      const name = `Ocean Trail ${index + 1}`;
      if (index) {
        await page.getByRole('button', { name: '添加游戏', exact: true }).click();
        assert.equal(await page.locator('[data-create-project-name]').inputValue(), '');
      }
      await fill(page, name, plan);
      if (index === 1) {
        await page.locator('[data-create-relationship]').selectOption('publisher');
        // The developer name is optional while creating a game project.
        assert.equal(await page.locator('[data-create-developer-name]').inputValue(), '');
      }
      await page.locator('[data-create-submit]').click();
      await page.locator('[data-publisher-profile]').waitFor();
      const key = await page.locator('[data-publisher-game-console]').getAttribute('data-selected-game');
      assert.match(key, /^created-GAME-/);
      assert.equal(keys.has(key), false);
      keys.add(key);
      const game = await page.evaluate(key => {
        const accountKey = window.PublisherAccountContext.currentAccountKey(sessionStorage);
        return window.PublisherAccountContext.loadWorkspace(localStorage, accountKey, 'publisher-console').createdGames.find(item => item.gameKey === key);
      }, key);
      assert.equal(game.name, name);
      assert.equal(game.projectName, name);
      assert.equal(game.releasePlan, plan);
      assert.equal(Object.hasOwn(game, 'releaseRegions'), false);
      assert.equal(game.createData.projectName, name);
      for (const field of ['releaseRegions', 'gameNames', 'nameLanguages', 'defaultNameLanguage', 'currentNameLanguage', 'gameNameEn', 'gameNameZh', 'storeLocales', 'localizedContent', 'localizedAssets', 'assetLanguageSettings', 'languages']) {
        assert.equal(Object.hasOwn(game.createData, field), false, `createData must not include ${field}`);
      }
      assert.deepEqual(game.genres, ['策略', '冒险']);
      assert.equal(ids.has(game.gameId), false);
      assert.match(game.gameId, /^GAME-[A-Z0-9]+$/);
      assert.equal(game.appId, '');
      ids.add(game.gameId);
      const storeNames = await page.locator('[data-publisher-profile] [data-game-name-input]').evaluateAll(inputs => inputs.map(input => input.value));
      assert.ok(storeNames.length > 0, 'The post-creation game profile must expose store name fields');
      assert.deepEqual(storeNames, storeNames.map(() => ''), 'The project name must not prefill any store name');
      if (index === 0) await page.screenshot({ path: path.join(evidence, 'created-console.png') });
      await page.locator('[data-portal-action="back-publisher-games"]').first().click();
      assert.equal(await page.getByRole('heading', { name, exact: true }).count(), 1);
      assert.equal(await page.getByRole('heading', { name: '星海远征', exact: true }).count(), 1);
      assert.equal(await page.locator('.publisher-game-item').count(), 8 + index);
    }
    assert.deepEqual(pageErrors, []);
  } catch (error) { await failureEvidence(page, 'create-flow-failure'); throw error; }
  finally { await page.close(); }
});

test('中英切换覆盖创建表单和类型下拉，保留输入及业务枚举值', async () => {
  const page = await open();
  try {
    assert.equal(await page.locator('label[for="create-project-name"]').innerText(), '后台项目名称 *');
    await fill(page, 'English 海洋 title', 'launch');
    await page.locator('[data-create-relationship]').selectOption('publisher');
    await page.locator('[data-create-developer-name]').fill('Sea 开发工作室');
    await page.locator('[data-create-platform][value="Linux"]').check();
    const previous = await snapshot(page);
    await page.locator('[data-portal-action="toggle-interface-language"]').click();
    assert.equal(await page.locator('[data-publisher-create] h1').innerText(), 'Create game');
    assert.equal(await page.locator('[data-create-submit]').innerText(), 'Create game');
    assert.equal(await page.locator('label[for="create-project-name"]').innerText(), 'Project name *');
    assert.equal(await page.locator('[data-create-relationship] option:checked').innerText(), 'Publisher');
    assert.deepEqual(await snapshot(page), previous);
    await assertEnglishCopy(page);
    await page.locator('[data-create-genre-toggle]').click();
    assert.match(await page.locator('#create-genres-menu').innerText(), /Role-playing/);
    assert.match(await page.locator('#create-genres-menu').innerText(), /Adventure/);
    await assertEnglishCopy(page);
    await page.keyboard.press('Escape');
    await page.screenshot({ path: path.join(evidence, 'create-en-1440.png'), fullPage: true });
    await page.locator('[data-portal-action="toggle-interface-language"]').click();
    assert.equal(await page.locator('[data-publisher-create] h1').innerText(), '创建游戏');
    assert.equal(await page.locator('label[for="create-project-name"]').innerText(), '后台项目名称 *');
    assert.deepEqual(await snapshot(page), previous);
  } catch (error) { await failureEvidence(page, 'interface-language-failure'); throw error; }
  finally { await page.close(); }
});

test('已有字段错误随界面语言切换翻译，空值和选择状态保持不变', async () => {
  const page = await open();
  try {
    await page.locator('[data-create-platform][value="Windows"]').uncheck();
    await page.locator('[data-create-submit]').click();
    const keys = ['projectName', 'genres', 'relationship', 'platforms', 'releasePlan'];
    const chinese = {};
    for (const key of keys) chinese[key] = await errorField(page, key).innerText();
    await page.locator('[data-portal-action="toggle-interface-language"]').click();
    for (const key of keys) {
      const error = errorField(page, key);
      assert.equal(await error.isVisible(), true);
      assert.doesNotMatch(await error.innerText(), /[\u3400-\u9fff]/);
    }
    assert.match(await errorField(page, 'projectName').innerText(), /project name/);
    await assertEnglishCopy(page);
    await page.screenshot({ path: path.join(evidence, 'create-errors-en-1440.png'), fullPage: true });
    await page.locator('[data-portal-action="toggle-interface-language"]').click();
    for (const key of keys) assert.equal(await errorField(page, key).innerText(), chinese[key]);
    assert.equal(await page.locator('[data-create-platform]:checked').count(), 0);
    assert.equal(await page.locator('[data-create-project-name]').inputValue(), '');
  } finally { await page.close(); }
});

test('创建请求失败恢复按钮、保留有效输入，失败提示支持中英切换', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(url);
    await page.evaluate(() => {
      const component = window.PublisherGameCreate;
      const draft = component.createDraft();
      let language = 'zh';
      const draw = () => {
        document.body.innerHTML = component.render(draft, language);
        component.bind(document.body, { draft, language, onChange: draw, onClose: () => {}, onSubmit: async () => { throw new Error('test service failure'); } });
      };
      window.changeTestLanguage = next => { language = next; draw(); };
      draw();
    });
    await fill(page, 'Keep My Input');
    await page.locator('[data-create-relationship]').selectOption('publisher');
    await page.locator('[data-create-developer-name]').fill('Sea Studio');
    const previous = await snapshot(page);
    await page.locator('[data-create-submit]').click();
    await page.locator('[data-create-error="submit"][role="alert"]').waitFor();
    assert.equal(await page.locator('[data-create-submit]').isEnabled(), true);
    assert.match(await page.locator('[data-create-error="submit"]').innerText(), /创建失败/);
    assert.deepEqual(await snapshot(page), previous);
    await page.evaluate(() => window.changeTestLanguage('en'));
    assert.match(await page.locator('[data-create-error="submit"]').innerText(), /Could not create the game/);
    assert.equal(await page.locator('[data-create-submit]').isEnabled(), true);
    assert.deepEqual(await snapshot(page), previous);
    await assertEnglishCopy(page);
  } finally { await page.close(); }
});

test('创建页面中英宽屏、桌面与窄屏无横向溢出', async () => {
  for (const language of ['zh', 'en']) {
    for (const [width, height] of [[1440, 1400], [1280, 800], [390, 844]]) {
      const page = await open(width, height);
      try {
        if (language === 'en') await page.locator('[data-portal-action="toggle-interface-language"]').click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${language} ${width}px overflow`);
        await page.screenshot({ path: path.join(evidence, `create-${language}-${width}.png`), fullPage: true });
        if (language === 'zh') fs.copyFileSync(path.join(evidence, `create-zh-${width}.png`), path.join(evidence, `create-${width}.png`));
      } finally { await page.close(); }
    }
  }
});

test('创建阶段仅处理后台项目名称，不渲染商店多语言字段', async () => {
  const page = await open(1440, 1000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const create = page.locator('[data-publisher-create]');
    assert.equal(await page.locator('[data-create-project-name]').count(), 1);
    assert.equal(await create.locator('[data-game-names], [data-game-name-input], [data-name-language], [data-name-settings], [data-name-dialog]').count(), 0);
    assert.doesNotMatch(await create.innerText(), /管理多语言|多语言设置|Manage languages|Language settings|简体中文|英语|English/);
    const draft = await page.evaluate(() => window.PublisherGameCreate.createDraft());
    assert.equal(draft.projectName, '');
    for (const field of ['releaseRegions', 'gameNames', 'nameLanguages', 'defaultNameLanguage', 'currentNameLanguage', 'gameName', 'gameNameEn', 'gameNameZh', 'storeLocales', 'localizedContent', 'localizedAssets', 'assetLanguageSettings', 'languages']) {
      assert.equal(Object.hasOwn(draft, field), false, `Create draft must not include ${field}`);
    }
    await page.locator('[data-portal-action="toggle-interface-language"]').click();
    assert.equal(await page.locator('label[for="create-project-name"]').innerText(), 'Project name *');
    assert.equal(await create.locator('[data-game-names], [data-name-language], [data-name-settings]').count(), 0);
    await page.screenshot({ path: path.join(evidence, 'create-project-only-1440.png'), fullPage: true });
    assert.deepEqual(errors, []);
  } catch (error) { await failureEvidence(page, 'project-only-create-failure'); throw error; }
  finally { await page.close(); }
});

test('旧项目对象存在 projectName 时始终以后台项目名展示', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(url);
    const game = await page.evaluate(() => window.GameHubDeveloperPortal.templates.publisherGame({
      createdGames: [{
        gameKey: 'created-legacy-project',
        projectName: '旧版后台项目名',
        name: '被商店名称污染的旧值',
        profileDraft: { gameNames: { en: 'English Store Name' }, platforms: ['Windows'] },
      }],
      publicationDrafts: {},
      profileDrafts: {},
      deletedGameKeys: [],
    }, 'created-legacy-project'));
    assert.equal(game.projectName, '旧版后台项目名');
    assert.equal(game.name, '旧版后台项目名');
  } finally { await page.close(); }
});
async function position(page, selector) {
  return page.locator(selector).evaluate(element => {
    const box = element.getBoundingClientRect(); const scrollers = [];
    for (let node = document.querySelector('[data-publisher-create]'), depth = 0; node; node = node.parentElement, depth += 1) {
      const style = getComputedStyle(node);
      if (/(auto|scroll|overlay)/.test(style.overflowX + style.overflowY) || node.scrollTop || node.scrollLeft) scrollers.push({ depth, top: node.scrollTop, left: node.scrollLeft });
    }
    return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, windowX: scrollX, windowY: scrollY, scrollers, width: innerWidth, height: innerHeight };
  });
}
function preserved(before, after, label) {
  assert.ok(Math.abs(after.top - before.top) <= 2, `${label} moved from ${before.top} to ${after.top}`);
  assert.equal(after.windowY, before.windowY, `${label} changed window scroll`);
  assert.equal(after.windowX, before.windowX);
  for (const old of before.scrollers) {
    const current = after.scrollers.find(item => item.depth === old.depth);
    assert.ok(current);
    assert.ok(Math.abs(current.top - old.top) <= 2, `${label} scroll changed from ${old.top} to ${current.top}`);
    assert.ok(Math.abs(current.left - old.left) <= 2);
  }
}
for (const [width, height] of [[1440, 650], [390, 844]]) {
  test(`${width}px 发布计划鼠标与键盘原位选择，验证失败仍主动定位`, async () => {
    const page = await open(width, height);
    const errors = []; const measures = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.locator('.pgc-plan-grid').evaluate(element => element.scrollIntoView({ block: 'center' }));
      for (let round = 1; round <= 5; round += 1) {
        for (const plan of ['reservation', 'test', 'launch', 'reservation']) {
          const selector = `.pgc-plan-card--${plan}`;
          const before = await position(page, selector);
          assert.ok(before.scrollers.some(item => item.top > 100) || before.windowY > 100, 'The plan must be selected below the top of the form');
          await choosePlan(page, plan);
          const after = await position(page, selector); measures.push({ action: `round ${round} click ${plan}`, before, after });
          preserved(before, after, `${width}px round ${round} click ${plan}`);
          assert.equal(await page.locator('.pgc-plan-card.is-selected').count(), 1);
          assert.equal(await page.locator(`[data-create-release-plan="${plan}"]`).evaluate(input => input === document.activeElement), true);
        }
      }
      await page.locator('[data-create-release-plan="reservation"]').evaluate(input => input.focus({ preventScroll: true }));
      for (const [key, plan] of [['ArrowRight', 'test'], ['ArrowRight', 'launch'], ['ArrowLeft', 'test'], ['ArrowLeft', 'reservation']]) {
        const before = await position(page, '.pgc-plan-grid');
        await page.keyboard.press(key);
        const after = await position(page, '.pgc-plan-grid'); measures.push({ action: `${key} ${plan}`, before, after });
        preserved(before, after, `${width}px keyboard ${key}`);
        assert.equal(await page.locator(`[data-create-release-plan="${plan}"]`).isChecked(), true);
        assert.equal(await page.locator(`.pgc-plan-card--${plan}.is-selected`).count(), 1);
      }
      await page.screenshot({ path: path.join(evidence, `plans-stay-${width}.png`) });
      const beforeSubmit = await position(page, '.pgc-plan-grid');
      await page.locator('[data-create-submit]').click();
      const name = page.locator('[data-create-project-name]');
      assert.equal(await name.evaluate(input => input === document.activeElement), true);
      const afterSubmit = await position(page, '[data-create-project-name]');
      assert.ok(afterSubmit.top >= 0 && afterSubmit.bottom <= height);
      assert.ok(afterSubmit.scrollers.some(item => item.top < (beforeSubmit.scrollers.find(old => old.depth === item.depth)?.top || 0)), 'Invalid submission should actively navigate to the first missing field');
      assert.deepEqual(errors, []);
      fs.writeFileSync(path.join(evidence, `plans-stay-${width}.json`), JSON.stringify({ measures, beforeSubmit, afterSubmit }, null, 2), 'utf8');
      await page.screenshot({ path: path.join(evidence, `create-missing-focus-${width}.png`) });
    } catch (error) {
      await failureEvidence(page, `plans-position-failure-${width}`);
      fs.writeFileSync(path.join(evidence, `plans-position-failure-${width}.json`), JSON.stringify(measures, null, 2), 'utf8');
      throw error;
    }
    finally { await page.close(); }
  });
}

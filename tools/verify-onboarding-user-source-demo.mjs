import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../github/four-experiment-pilot/node_modules/playwright/index.mjs';

const demoPath = path.resolve('demos/新手引导完整链路demo.html');
const capture = process.argv.includes('--capture');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const pageErrors = [];

page.on('pageerror', error => pageErrors.push(error.message));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await page.goto(pathToFileURL(demoPath).href);

  assert(await page.locator('#welcomeTitle').textContent() === '欢迎来到盖世游戏', '欢迎页主标题不正确');
  assert(await page.locator('#welcomePromptTitle').textContent() === '为了您的绝佳体验', '欢迎页提示第一行不正确');
  assert(await page.locator('#welcomePromptDesc').textContent() === '请与我们分享您的游玩经验～', '欢迎页提示第二行不正确');
  assert((await page.locator('.gh-feature-item').first().textContent()).includes('与 Steam、Epic 数据互通'), '平台特色文案不正确');
  const welcomeHierarchy = await page.evaluate(() => {
    const style = selector => getComputedStyle(document.querySelector(selector));
    const rect = selector => document.querySelector(selector).getBoundingClientRect();
    const brand = document.querySelector('.welcome-brand');
    const features = document.querySelector('.welcome-features');
    const prompt = document.querySelector('.welcome-prompt');
    const start = document.querySelector('.welcome-start');
    return {
      headlineSize: parseFloat(style('#welcomeTitle').fontSize),
      promptTitleSize: parseFloat(style('#welcomePromptTitle').fontSize),
      promptDescSize: parseFloat(style('#welcomePromptDesc').fontSize),
      featureTitleSize: parseFloat(style('.welcome-features h2').fontSize),
      featureItemSize: parseFloat(style('.gh-feature-item').fontSize),
      featureShadow: style('.welcome-features').boxShadow,
      titleBottom: rect('#welcomeTitle').bottom,
      featuresTop: rect('.welcome-features').top,
      featuresBottom: rect('.welcome-features').bottom,
      promptTop: rect('.welcome-prompt').top,
      promptBottom: rect('.welcome-prompt').bottom,
      startTop: rect('.welcome-start').top,
      startBottom: rect('.welcome-start').bottom,
      phoneBottom: rect('.phone').bottom,
      domOrder: brand.nextElementSibling === features
        && features.nextElementSibling === prompt
        && prompt.nextElementSibling === start
    };
  });
  assert(welcomeHierarchy.headlineSize > welcomeHierarchy.featureTitleSize, '主标题应高于平台特色标题层级');
  assert(welcomeHierarchy.featureTitleSize > welcomeHierarchy.featureItemSize, '平台特色标题应高于功能项层级');
  assert(welcomeHierarchy.promptDescSize > welcomeHierarchy.promptTitleSize, '第二行引导语应高于第一行层级');
  assert(welcomeHierarchy.featureShadow === 'none', '平台特色区不应使用重阴影');
  assert(welcomeHierarchy.domOrder, '欢迎页 DOM 顺序应为标题、特色卡、引导语、开始按钮');
  assert(welcomeHierarchy.featuresTop > welcomeHierarchy.titleBottom, '特色卡应位于欢迎标题之后');
  assert(welcomeHierarchy.promptTop > welcomeHierarchy.featuresBottom, '引导语应位于特色卡之后');
  assert(welcomeHierarchy.startTop > welcomeHierarchy.promptBottom, '开始按钮应位于引导语之后');
  assert(welcomeHierarchy.startBottom <= welcomeHierarchy.phoneBottom, '开始按钮不得超出首屏');
  if (capture) await page.screenshot({ path: 'test-results/onboarding-welcome-review.png', fullPage: true });

  await page.locator('#regionBtn').click();
  const overseasLayout = await page.evaluate(() => {
    const prompt = document.querySelector('.welcome-prompt').getBoundingClientRect();
    const start = document.querySelector('.welcome-start').getBoundingClientRect();
    const phone = document.querySelector('.phone').getBoundingClientRect();
    const title = document.querySelector('#welcomeTitle').getBoundingClientRect();
    const goldOrbit = document.querySelector('.welcome-orbit.one').getBoundingClientRect();
    return {
      promptVisible: prompt.top >= phone.top && prompt.bottom <= phone.bottom,
      startVisible: start.top >= phone.top && start.bottom <= phone.bottom,
      goldOrbitClearOfTitle: goldOrbit.bottom <= title.top || goldOrbit.left - title.right >= 24
    };
  });
  assert(overseasLayout.promptVisible, '海外版引导语不得超出首屏');
  assert(overseasLayout.startVisible, '海外版开始按钮不得超出首屏');
  assert(overseasLayout.goldOrbitClearOfTitle, '海外版黄色装饰点不得与欢迎标题重叠');
  if (capture) await page.screenshot({ path: 'test-results/onboarding-welcome-overseas-review.png', fullPage: true });
  await page.locator('#regionBtn').click();

  await page.locator('[data-demo-scenario="existing_full"]').click();
  const submitGames = page.locator('[data-action="submit-existing-games"]');
  assert(await submitGames.isDisabled(), '未选择游戏时按钮应禁用');
  assert(await submitGames.textContent() === '选好了', '按钮文案应固定为“选好了”');
  await page.locator('[data-existing-game]').first().click();
  assert(await submitGames.isEnabled(), '选择1款游戏后按钮应启用');
  assert(await submitGames.textContent() === '选好了', '选择后按钮文案不应变化');
  for (let index = 1; index < 9; index += 1) await page.locator('[data-existing-game]').nth(index).click();
  assert(await page.locator('[data-existing-game][aria-pressed="true"]').count() === 9, '最多只能选择9款游戏');

  await page.locator('[data-view="admin"]').click();
  assert(await page.locator('[data-admin-panel="dictionary"]').isVisible(), '运营后台应默认进入字典管理');
  assert(await page.locator('[data-dictionary-row="1001"]').isVisible(), '用户来源字典未显示');
  if (capture) await page.screenshot({ path: 'test-results/onboarding-dictionary-review.png', fullPage: true });

  await page.locator('[data-dictionary-action="items"][data-dictionary-id="1001"]').click();
  assert((await page.locator('.admin-modal__header h2').textContent()).includes('字典子项管理 - 用户来源(userSource)'), '字典子项管理标题不正确');
  assert(await page.locator('[data-dictionary-item-row]').count() === 10, '用户来源字典子项数量不正确');
  if (capture) await page.screenshot({ path: 'test-results/onboarding-dictionary-items-review.png', fullPage: true });
  await page.locator('[data-modal-action="close"]').last().click();

  await page.locator('[data-dictionary-action="edit"][data-dictionary-id="1001"]').click();
  if (capture) await page.screenshot({ path: 'test-results/onboarding-dictionary-edit-review.png', fullPage: true });
  await page.locator('[data-modal-action="languages"]').click();
  assert(await page.locator('#languageZh').inputValue() === '用户来源', '中文多语言内容不正确');
  assert(await page.locator('#languageEn').inputValue() === 'User Source', '英文多语言内容不正确');
  if (capture) await page.screenshot({ path: 'test-results/onboarding-dictionary-language-review.png', fullPage: true });
  await page.locator('[data-modal-action="cancel-languages"]').last().click();
  await page.locator('[data-modal-action="close"]').last().click();

  await page.locator('[data-dictionary-action="new"]').click();
  await page.locator('[data-modal-action="save-dictionary"]').click();
  assert(await page.locator('[data-field-error="name"]').textContent() === '请输入字典名称', '字典名称必填校验未触发');
  assert(await page.locator('[data-field-error="code"]').textContent() === '请输入字典编码', '字典编码必填校验未触发');
  await page.locator('#dictEditorName').fill('测试字典');
  await page.locator('#dictEditorCode').fill('testDictionary');
  await page.locator('#dictEditorDescription').fill('自动化验证字典');
  await page.locator('[data-modal-action="languages"]').click();
  await page.locator('#languageZh').fill('测试字典');
  await page.locator('#languageEn').fill('Test Dictionary');
  await page.locator('[data-modal-action="save-languages"]').click();
  await page.locator('[data-modal-action="save-dictionary"]').click();
  assert(await page.locator('[data-dictionary-row]').count() === 2, '新建字典后列表数量不正确');
  await page.locator('[data-dictionary-action="delete"][data-dictionary-id="1002"]').click();
  await page.locator('[data-modal-action="confirm-delete"]').click();
  assert(await page.locator('[data-dictionary-row]').count() === 1, '删除字典后列表数量不正确');

  await page.locator('[data-dictionary-action="items"][data-dictionary-id="1001"]').click();
  await page.locator('[data-item-action="new"]').click();
  await page.locator('#itemEditorName').fill('测试来源');
  await page.locator('#itemEditorValue').fill('test_source');
  await page.locator('#itemEditorDescription').fill('自动化验证来源');
  await page.locator('#itemEditorSort').fill('110');
  await page.locator('[data-modal-action="save-item"]').click();
  assert(await page.locator('[data-dictionary-item-row]').count() === 11, '新建字典子项后数量不正确');
  await page.locator('[data-item-action="delete"][data-item-id="2011"]').click();
  await page.locator('[data-modal-action="confirm-delete"]').click();
  assert(await page.locator('[data-dictionary-item-row]').count() === 10, '删除字典子项后数量不正确');
  await page.locator('[data-item-action="new"]').click();
  await page.locator('#itemEditorName').fill('重复来源');
  await page.locator('#itemEditorValue').fill('douyin');
  await page.locator('#itemEditorDescription').fill('重复编码校验');
  await page.locator('#itemEditorSort').fill('110');
  await page.locator('[data-modal-action="save-item"]').click();
  assert(await page.locator('[data-field-error="itemValue"]').textContent() === '字典子项值已存在', '字典子项重复值校验未触发');
  await page.locator('[data-modal-action="back-items"]').last().click();
  await page.locator('[data-modal-action="close"]').last().click();

  assert(pageErrors.length === 0, `页面运行异常：${pageErrors.join('；')}`);
  console.log('PASS onboarding user source demo');
} finally {
  await browser.close();
}

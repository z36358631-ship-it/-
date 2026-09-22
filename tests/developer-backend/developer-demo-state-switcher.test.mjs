import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const shellSource = fs.readFileSync(path.resolve('demos/开发者后台一期/src/runtime/shell.js'), 'utf8');
const appSource = fs.readFileSync(path.resolve('demos/开发者后台一期/src/runtime/app.js'), 'utf8');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
}[character]));
const namespace = {
  components:{ escapeHtml },
  icons:{ render:name => `<i data-icon="${escapeHtml(name)}"></i>` },
};
const context = { window:{ GameHubDeveloperPortal:namespace, PublisherFinance:{ routeIds:['P15-01', 'P15-02'] } } };
vm.runInNewContext(shellSource, context, { filename:'shell.js' });

const render = (routeId, demoState, overrides = {}) => namespace.shell.renderBusiness({
  module:{ id:'02', standalone:true },
  routes:[],
  route:{ id:routeId, moduleId:routeId.startsWith('P15') ? '15' : '02', title:'开发者平台', role:'developer' },
  page:{},
  portalData:{ accounts:{ developer:{ name:'测试开发者', roleName:'平台开发者' } }, helpCenter:{ title:'帮助中心', faq:[], contact:{ supportName:'开发者支持', serviceHours:'9:00-18:00', channel:'合作群', email:'support@example.test', fallback:'联系项目对接人' } }, context:{} },
  role:'developer',
  state:'default',
  editorMode:'edit',
  content:'<main>content</main>',
  qualification:{ status:'approved' },
  language:'zh',
  registration:{ accountTier:'enterprise' },
  demoState,
  ...overrides,
});

test('游戏管理与子 Tab 共用单一 Demo 状态控件', () => {
  const html = render('P02-01', {
    open:true,
    publisherMode:true,
    publisherScenario:'empty',
    publisherContext:'release-workspace',
    qualificationStatus:'approved',
    releaseStatus:'',
    active:true,
  });
  assert.equal((html.match(/class="developer-demo-state-switcher"/g) || []).length, 1);
  assert.match(html, />页面数据</);
  assert.match(html, /data-demo-publisher-scenario="exhaustive"[^>]*>穷举态</);
  assert.match(html, /aria-checked="true" class="is-active" data-portal-action="demo-publisher-scenario" data-demo-publisher-scenario="empty">缺省态</);
  assert.doesNotMatch(html, /<strong>企业认证<\/strong>/);
  assert.doesNotMatch(html, /<strong>游戏发布申请<\/strong>/);

  const versions = render('P02-01', {
    open:true,
    publisherMode:true,
    publisherScenario:'exhaustive',
    publisherContext:'versions',
    releaseStatus:'reviewing',
    active:true,
  });
  assert.match(versions, /<strong>游戏发布申请<\/strong>/);
});

test('渠道和财务在同一控件中保留专属状态', () => {
  const channel = render('P02-01', {
    open:true,
    publisherMode:true,
    publisherScenario:'exhaustive',
    channelMode:true,
    channelBatchOutcome:'failed',
    active:true,
  });
  assert.equal((channel.match(/class="developer-demo-state-switcher"/g) || []).length, 1);
  assert.match(channel, />页面数据</);
  assert.match(channel, />文件批次状态</);

  const finance = render('P15-01', {
    open:true,
    financeMode:true,
    publisherScenario:'empty',
    qualificationStatus:'approved',
    active:true,
  });
  assert.equal((finance.match(/class="developer-demo-state-switcher"/g) || []).length, 1);
  assert.match(finance, />页面数据</);
  assert.match(finance, /data-portal-action="demo-finance-qualification-status"/);
  assert.match(finance, /data-portal-action="demo-state-reset"/);
});

test('公开登录页不显示 Demo 状态控件', () => {
  const html = render('P01-01', { open:true, publisherScenario:'empty', active:true });
  assert.doesNotMatch(html, /developer-demo-state-switcher/);
});

test('app 透传 publisherScenario 并允许三个跳转目标', () => {
  assert.match(appSource, /publisherScenario:\s*'exhaustive'/);
  assert.match(appSource, /action === 'demo-publisher-scenario'/);
  assert.match(appSource, /publisherScenario,\s*\n\s*publisherContext,\s*\n\s*channelMode/);
  for (const section of ['package-builds', 'price-packages', 'price-dlc']) {
    assert.ok(appSource.includes(`'${section}'`), `missing ${section}`);
  }
});

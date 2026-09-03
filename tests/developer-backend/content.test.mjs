import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadLatestPrdFixture } from '../../demos/开发者后台一期/src/prd-fixture.mjs';

const root = process.cwd();
const demoDir = path.join(root, 'demos', '开发者后台一期');
const { routes, fixture, contract } = loadLatestPrdFixture({ repoRoot: root, demoDir });
const requiredStates = ['default', 'loading', 'empty', 'error', 'permission'];

test('最新 PRD 是唯一业务基线，37 页按 10/6/13/8 完整覆盖', () => {
  assert.equal(contract.version, '2026-09-03');
  assert.equal(contract.sourceFiles.length, 4);
  assert.deepEqual(contract.counts, { '01': 10, '02': 6, '03': 13, '04': 8 });
  assert.equal(routes.length, 37);
  assert.equal(new Set(routes.map(item => item.id)).size, 37);
  assert.ok(routes.some(item => item.id === 'P01-10'));
  assert.ok(!routes.some(item => item.id === 'P04-09'));
  assert.deepEqual(Object.keys(fixture.pages), routes.map(item => item.id));
});

test('每个页面具备最新 PRD 来源、结构化六要素和五种通用状态', () => {
  for (const route of routes) {
    const page = fixture.pages[route.id];
    assert.equal(page.audience, route.role, `${route.id}:role`);
    assert.equal(page.prdHeading, route.title, `${route.id}:title`);
    assert.ok(contract.sourceFiles.includes(page.prdSource), `${route.id}:source`);
    assert.ok(page.summary.length > 0, `${route.id}:summary`);
    assert.ok(page.status.length > 0, `${route.id}:status`);
    assert.ok(page.primaryAction.length > 0, `${route.id}:primaryAction`);
    assert.equal(page.sections.length, 4, `${route.id}:sections`);
    assert.deepEqual(page.states.slice(0, 5), requiredStates, `${route.id}:states`);
    assert.ok(page.sections.every(section => section.title && section.items.length), `${route.id}:structured content`);
  }
});

test('跨模块对象与关键边界已切换到最新口径', () => {
  assert.equal(fixture.context.appId, 'APP-7F3A9C');
  assert.deepEqual(fixture.objects.game.platforms, ['Windows', 'macOS', 'Linux']);
  assert.equal(fixture.objects.version.pointerKey, 'APP-7F3A9C + OS + CPU 架构');
  assert.match(fixture.rules.buildRule, /Build、Manifest 与 Chunk 永久保留/);
  assert.match(fixture.rules.sdkRule, /Windows／macOS／Linux/);
  assert.equal(fixture.rules.campaignMode, '轻量 Campaign／UTM、人工资源需求与渠道归因');
  assert.ok(fixture.rules.additionalOutOfScope.includes('广告竞价'));
  assert.ok(fixture.rules.additionalOutOfScope.includes('算法推荐'));
});

test('关键页面内容来自最新 PRD，而不是旧 Figma 页面契约', () => {
  const expected = {
    'P01-01': ['账号／邮箱', '使用盖世游戏账号登录', '二维码', '创建未取得开发者资格的 account_id'],
    'P01-03': ['主体类型', '注册国家／地区', '主体法定名称', '登记编号'],
    'P01-06': ['APPID', 'Windows／Mac／Linux SDK', 'Google Docs', '允许离线运行'],
    'P01-09': ['录入线下完成', '结果来源／依据编号', '不在线审核'],
    'P01-10': ['Windows／Mac／Linux', 'Steam 标签', '发布前置'],
    'P02-05': ['盖世 Key', '批次', '渠道 API'],
    'P03-03': ['Build', 'Manifest', 'Chunk'],
    'P03-12': ['Release Pointer', '回滚', '原子'],
    'P04-01': ['订单', '退款', 'Key', '首次启动'],
    'P04-05': ['三项 UTM', 'campaign_id', '不承担广告投放策略'],
    'P04-06': ['人工发行资源需求', '实际执行结果', '不承诺自动配置'],
    'P04-08': ['query_snapshot_id', 'CSV／XLSX', '聚合'],
  };
  for (const [id, tokens] of Object.entries(expected)) {
    const body = JSON.stringify(fixture.pages[id]);
    for (const token of tokens) assert.ok(body.includes(token), `${id}:${token}`);
  }
});

test('稳定业务动作覆盖双登录、线下结果、回滚、Campaign、资源需求与导出', () => {
  const expected = {
    'P01-01': ['gamehub-login', 'forgot-password'],
    'P01-09': ['record-offline-result'],
    'P01-10': ['record-offline-result'],
    'P03-12': ['schedule-release', 'release-now', 'rollback-release'],
    'P04-05': ['save-draft', 'create-campaign'],
    'P04-06': ['submit-resource-request'],
    'P04-08': ['generate-export'],
  };
  for (const [id, ids] of Object.entries(expected)) {
    assert.deepEqual(fixture.pages[id].actions.map(item => item.id), ids, id);
  }
});

test('CDKEY 一次性明文与帮助中心结构继续保留', () => {
  assert.deepEqual(fixture.pages['P02-01'].cdkeySelfService.tabs, ['商品与供给', 'Key 批次', '渠道 API', '接口说明']);
  assert.equal(fixture.helpCenter.faq.length, 9);
  assert.equal(fixture.helpCenter.contact.fallback, '紧急问题请联系当前项目对接人');
  const source = JSON.stringify(fixture.pages['P02-01'].cdkeySelfService);
  assert.ok(!source.includes('clientSecret'));
  assert.match(source, /末四位/);
});

test('HTML 模板显式包含最新页面组件且不再包含 P04-09 专用投放逻辑', () => {
  const templates = fs.readFileSync(path.join(demoDir, 'src/runtime/templates.js'), 'utf8');
  const app = fs.readFileSync(path.join(demoDir, 'src/runtime/app.js'), 'utf8');
  for (const token of ['主体类型', 'Windows／macOS／Linux', 'Release Pointer', 'utm_source', '人工资源协作', '聚合文件生成成功']) {
    assert.ok((templates + app).includes(token), token);
  }
  assert.ok(!templates.includes("route.id === 'P04-09'"));
  assert.ok(!app.includes("routeId === 'P04-09'"));
});

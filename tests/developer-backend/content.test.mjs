import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const fixturePath = 'demos/开发者后台一期/src/fixtures.json';
const routesPath = 'demos/开发者后台一期/src/routes.json';
const requiredStates = ['default', 'loading', 'empty', 'error', 'permission'];
const plannedRouteIds = [
  'P01-01', 'P01-02', 'P01-03', 'P01-04', 'P01-05', 'P01-06', 'P01-07', 'P01-08', 'P01-09',
  'P02-01', 'P02-02', 'P02-03', 'P02-04', 'P02-05', 'P02-06',
  'P03-01', 'P03-02', 'P03-03', 'P03-04', 'P03-05', 'P03-06', 'P03-07', 'P03-08', 'P03-09', 'P03-10', 'P03-11', 'P03-12', 'P03-13',
  'P04-01', 'P04-02', 'P04-03', 'P04-04', 'P04-05', 'P04-06', 'P04-07', 'P04-08', 'P04-09',
];

const expectedContent = {
  'P01-01': ['受邀账号', '账号由盖世游戏发行运营创建', '登录'],
  'P01-02': ['首款签约游戏', '待办', '资料状态', '版本状态'],
  'P01-03': ['厂商名称', 'Logo', '厂商简介', '官网', '联系人', '保存草稿', '提交审核'],
  'P01-04': ['游戏名称', '发行方式', '资料状态', '创建游戏'],
  'P01-05': ['Windows', '游戏介绍', '素材', '发行方式', '保存草稿'],
  'P01-06': ['审核结果', '驳回原因', '处理记录', '继续修改'],
  'P01-07': ['账号', '绑定厂商', '状态', '最近登录'],
  'P01-08': ['厂商资料', '差异', '通过', '驳回原因'],
  'P01-09': ['游戏资料', '发行方式', '素材', '通过', '驳回原因'],
  'P02-01': ['商品状态', '供给状态', '可售门禁', '异常'],
  'P02-02': ['异常类型', '影响范围', '恢复条件', '处理时间线'],
  'P02-03': ['商品', 'SKU', '发行方式', '供给状态'],
  'P02-04': ['商品名称', 'SKU', '价格', '状态', '保存'],
  'P02-05': ['供应商 API／受控来源', '关联状态', '校验'],
  'P02-06': ['库存', '供给异常', '影响订单', '处理状态'],
  'P03-01': ['版本号', '修订', '测试状态', '发布状态'],
  'P03-02': ['1.0.0', 'Windows', '更新说明', '保存草稿'],
  'P03-03': ['分片上传', '校验', '中断', '继续上传'],
  'P03-04': ['提交测试', '包体摘要', '检查清单'],
  'P03-05': ['测试驳回', '问题项', '修订', '重新提交'],
  'P03-06': ['待测任务', '测试人员', '包体版本', '领取'],
  'P03-07': ['测试范围', '环境', '包体说明', '开始测试'],
  'P03-08': ['通过', '不通过', '问题描述', '提交结果'],
  'P03-09': ['版本审核', '测试结果', '审核状态'],
  'P03-10': ['发布门禁', '版本差异', '通过', '驳回'],
  'P03-11': ['待发布', '当前线上版本', '门禁状态'],
  'P03-12': ['立即发布', '定时发布', '保持原线上版本'],
  'P03-13': ['线上版本', '下架', '停售', '处置记录'],
  'P04-01': ['投放需求', '期望时间', '需求状态', '创建需求'],
  'P04-02': ['投放目标', '示例素材', '期望人群', '时间范围'],
  'P04-03': ['运营回执', '开发者只读', '配置摘要', '结果'],
  'P04-04': ['曝光', '点击', '访问', '转化', 'T+1'],
  'P04-05': ['投放计划', '资源位', '排期', '计划状态'],
  'P04-06': ['素材', '落地页', '审核', '驳回原因'],
  'P04-07': ['地区', '语言', '设备／系统', '平台行为', '排除'],
  'P04-08': ['资源位待业务确认', '开始时间', '结束时间', '排期冲突'],
  'P04-09': ['曝光', '点击率', '访问', '转化', '停止'],
};

const expectedRoles = {
  developer: ['P01-01', 'P01-02', 'P01-03', 'P01-04', 'P01-05', 'P01-06', 'P02-01', 'P02-02', 'P03-01', 'P03-02', 'P03-03', 'P03-04', 'P03-05', 'P04-01', 'P04-02', 'P04-03', 'P04-04'],
  operations: ['P01-07', 'P01-08', 'P01-09', 'P02-03', 'P02-04', 'P02-05', 'P02-06', 'P03-09', 'P03-10', 'P03-11', 'P03-12', 'P03-13', 'P04-05', 'P04-06', 'P04-07', 'P04-08', 'P04-09'],
  tester: ['P03-06', 'P03-07', 'P03-08'],
};

const expectedActions = {
  'P01-03': ['save-draft'],
  'P01-08': ['approve', 'reject'],
  'P03-03': ['start-upload', 'interrupt-upload', 'retry-upload'],
  'P03-08': ['test-pass', 'submit-test-result'],
  'P03-12': ['schedule-release', 'release-now'],
  'P04-04': ['dashboard-range'],
  'P04-07': ['add-target-rule', 'exclude-rule'],
};

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

test('四模块复用同一厂商、游戏、版本和投放对象', () => {
  assert.deepEqual(fixture.context, {
    vendorId: 'vendor_demo_001',
    vendorName: '示例厂商',
    gameId: 'game_demo_001',
    gameName: '首款签约游戏',
    versionId: 'version_demo_100',
    versionName: '1.0.0',
    campaignId: 'campaign_demo_001',
    environment: '正式环境',
  });
  assert.equal(fixture.objects.vendor.id, fixture.context.vendorId);
  assert.equal(fixture.objects.game.id, fixture.context.gameId);
  assert.equal(fixture.objects.version.id, fixture.context.versionId);
  assert.equal(fixture.objects.campaign.id, fixture.context.campaignId);
  assert.deepEqual(fixture.objects.game.platforms, ['Windows']);
  assert.deepEqual(fixture.objects.version.formalBranches, ['正式分支']);
});

test('演示事实不越过一期边界', () => {
  assert.deepEqual(fixture.rules.outOfScope, {
    publicRegistration: false,
    bankAccount: false,
    automaticSettlement: false,
    macBuild: false,
    linuxBuild: false,
    bidding: false,
    algorithmicRecommendation: false,
  });
  assert.equal(fixture.rules.developerCanRelease, false);
  assert.equal(fixture.rules.developerCanStartCampaign, false);
  assert.equal(fixture.rules.autoSave, false);
  assert.equal(fixture.rules.cdkeyUsesExistingFulfillment, true);
  assert.equal(fixture.rules.cdkeySupplyMethodStatus, '待业务确认');
  assert.equal(fixture.rules.campaignMode, '方案 A');
  assert.deepEqual(fixture.rules.additionalOutOfScope, ['在线合同', '财税', '多正式分支', '开发者自助回滚']);
});

test('37 个页面按 9／6／13／9 完整覆盖', () => {
  assert.deepEqual(Object.keys(fixture.pages), plannedRouteIds);
  assert.equal(Object.keys(fixture.pages).filter((id) => id.startsWith('P01-')).length, 9);
  assert.equal(Object.keys(fixture.pages).filter((id) => id.startsWith('P02-')).length, 6);
  assert.equal(Object.keys(fixture.pages).filter((id) => id.startsWith('P03-')).length, 13);
  assert.equal(Object.keys(fixture.pages).filter((id) => id.startsWith('P04-')).length, 9);
});

test('每个页面都有统一 Fixture 契约、五态和结构化内容', () => {
  for (const id of plannedRouteIds) {
    const page = fixture.pages[id];
    assert.ok(page, id);
    for (const key of ['summary', 'status', 'primaryAction', 'sections', 'states']) {
      assert.ok(key in page, `${id}:${key}`);
    }
    assert.equal(typeof page.summary, 'string', `${id}:summary`);
    assert.ok(page.summary.length > 0, `${id}:summary-empty`);
    assert.equal(typeof page.status, 'string', `${id}:status`);
    assert.ok(page.status.length > 0, `${id}:status-empty`);
    assert.equal(typeof page.primaryAction, 'string', `${id}:primaryAction`);
    assert.ok(page.primaryAction.length > 0, `${id}:primaryAction-empty`);
    assert.ok(Array.isArray(page.sections) && page.sections.length >= 4, `${id}:sections`);
    for (const [index, section] of page.sections.entries()) {
      assert.equal(typeof section.title, 'string', `${id}:section-${index}-title`);
      assert.ok(Array.isArray(section.items) && section.items.length > 0, `${id}:section-${index}-items`);
      assert.ok(section.items.every((item) => typeof item === 'string' && item.length > 0), `${id}:section-${index}-content`);
    }
    assert.deepEqual(page.states.slice(0, 5), requiredStates, `${id}:states`);
    assert.equal(new Set(page.states).size, page.states.length, `${id}:duplicate-states`);
  }
});

test('每个页面包含 PRD 关键字段、动作和状态文案', () => {
  for (const [id, tokens] of Object.entries(expectedContent)) {
    const content = JSON.stringify(fixture.pages[id]);
    for (const token of tokens) assert.ok(content.includes(token), `${id} 缺少“${token}”`);
  }
});

test('关键页面暴露与业务动作一致的稳定交互标识', () => {
  for (const [id, actionIds] of Object.entries(expectedActions)) {
    const actions = fixture.pages[id].actions;
    assert.ok(Array.isArray(actions), `${id}:actions`);
    assert.deepEqual(actions.map((action) => action.id), actionIds, `${id}:action-ids`);
    assert.ok(actions.every((action) => typeof action.label === 'string' && action.label.length > 0), `${id}:action-labels`);
    assert.equal(new Set(actionIds).size, actionIds.length, `${id}:duplicate-action-ids`);
  }
});

test('角色边界在 Fixture 与可选路由清单中一致', () => {
  for (const [role, ids] of Object.entries(expectedRoles)) {
    for (const id of ids) assert.equal(fixture.pages[id].audience, role, `${id}:audience`);
  }
  if (fs.existsSync(routesPath)) {
    const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
    assert.deepEqual(routes.map((route) => route.id), plannedRouteIds);
    for (const route of routes) assert.equal(fixture.pages[route.id].audience, route.role, `${route.id}:route-role`);
  }
});

test('四模块关键业务边界被明确表达', () => {
  const p01 = plannedRouteIds.filter((id) => id.startsWith('P01-')).map((id) => JSON.stringify(fixture.pages[id])).join('');
  const p02 = plannedRouteIds.filter((id) => id.startsWith('P02-')).map((id) => JSON.stringify(fixture.pages[id])).join('');
  const p03 = plannedRouteIds.filter((id) => id.startsWith('P03-')).map((id) => JSON.stringify(fixture.pages[id])).join('');
  const p04 = plannedRouteIds.filter((id) => id.startsWith('P04-')).map((id) => JSON.stringify(fixture.pages[id])).join('');

  for (const token of ['无公众注册', '唯一绑定厂商', '开发者不能直接发布']) assert.ok(p01.includes(token), `P01:${token}`);
  for (const token of ['复用既有 CDKEY 订单履约', '供应方式待业务确认', '不生成真实 CDKEY']) assert.ok(p02.includes(token), `P02:${token}`);
  for (const token of ['Windows', '单一正式分支', '开发者不可发布', '不提供回滚']) assert.ok(p03.includes(token), `P03:${token}`);
  for (const token of ['方案 A', '开发者提交需求', '运营配置并执行', 'T+1', '不展示用户明细']) assert.ok(p04.includes(token), `P04:${token}`);
});

test('首次入驻、CDKEY 自助和帮助中心使用结构化 Fixture', () => {
  assert.deepEqual(fixture.pages['P01-01'].onboarding.steps, [
    '完成厂商与游戏资料',
    '配置商品及 CDKEY',
    '上传包体并通过测试发布',
    '提交精准投放并查看发行数据',
  ]);
  assert.deepEqual(fixture.pages['P02-01'].cdkeySelfService.tabs, [
    '商品与供给', 'Key 批次', '渠道 API', '接口说明',
  ]);
  assert.equal(fixture.helpCenter.faq.length, 8);
  assert.equal(fixture.helpCenter.contact.fallback, '请联系对接的盖世发行运营');
});

test('CDKEY 数据不包含可重复读取的完整 Key 或 Secret', () => {
  const source = JSON.stringify(fixture.pages['P02-01'].cdkeySelfService);
  assert.ok(!source.includes('steam_key'));
  assert.ok(!source.includes('clientSecret'));
  assert.match(source, /末四位/);
});

test('新增内容不改变 37 个业务路由和模块数量', () => {
  const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
  assert.equal(routes.length, 37);
  assert.deepEqual(
    Object.fromEntries(['01', '02', '03', '04'].map(id => [id, routes.filter(route => route.moduleId === id).length])),
    { '01': 9, '02': 6, '03': 13, '04': 9 },
  );
  assert.ok(!routes.some(route => /帮助|介绍|API/.test(route.title) && route.id !== 'P02-01'));
});

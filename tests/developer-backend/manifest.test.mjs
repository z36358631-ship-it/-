import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

test('37 个 PRD 页面路由唯一且模块数量为 10/6/13/8', () => {
  const routes = readJson('demos/开发者后台一期/src/routes.json');
  assert.equal(routes.length, 37);
  assert.equal(new Set(routes.map(item => item.id)).size, 37);
  assert.deepEqual(
    Object.fromEntries(['01', '02', '03', '04'].map(moduleId => [
      moduleId,
      routes.filter(item => item.moduleId === moduleId).length,
    ])),
    { '01': 10, '02': 6, '03': 13, '04': 8 },
  );
});

test('模板和角色只能使用已确认枚举', () => {
  const routes = readJson('demos/开发者后台一期/src/routes.json');
  const modules = readJson('demos/开发者后台一期/src/modules.json');
  const templates = new Set(Array.from({ length: 15 }, (_, index) => `T${String(index + 1).padStart(2, '0')}`));
  const roles = new Set(['developer', 'operations', 'tester']);
  assert.equal(modules.length, 4);
  assert.equal(new Set(modules.map(item => item.output)).size, 4);
  for (const route of routes) {
    assert.ok(templates.has(route.templateId), route.id);
    assert.ok(roles.has(route.role), route.id);
    assert.match(route.id, /^P0[1-4]-\d{2}$/);
  }
});

test('开发者平台与运营后台声明隔离路由且旧开发者文件保持兼容', () => {
  const routes = readJson('demos/开发者后台一期/src/routes.json');
  const modules = readJson('demos/开发者后台一期/src/modules.json');
  const routeIdsFor = module => module.routeIds
    ? module.routeIds.map(id => routes.find(route => route.id === id)).filter(Boolean).map(route => route.id)
    : routes.filter(route => route.moduleId === module.id).map(route => route.id);
  const operationsRoutes = ['P01-08', 'P01-09', 'P01-10'];
  const developerRoutes = ['P01-01', 'P01-03', 'P02-01'];
  const module01 = modules.find(module => module.id === '01');
  const module02 = modules.find(module => module.id === '02');
  assert.deepEqual(module01.routeIds, operationsRoutes);
  assert.deepEqual(module02.routeIds, developerRoutes);
  assert.deepEqual(routeIdsFor(module01), operationsRoutes);
  assert.deepEqual(routeIdsFor(module02), developerRoutes);
  assert.equal(module01.name, '发行平台运营后台');
  assert.equal(module01.output, '发行平台运营后台demo.html');
  assert.equal(module01.surface, 'operations');
  assert.equal(module02.name, '开发者平台');
  assert.equal(module02.output, '开发者平台demo.html');
  assert.equal(module02.surface, 'developer');
  assert.deepEqual(module02.aliases, ['01-开发者平台与资料demo.html', '02-游戏创建与发行demo.html', '02-CDKEY商品与供给demo.html']);
  assert.equal(module01.standalone, true);
  assert.equal(module02.standalone, true);
  assert.deepEqual(modules.map(module => routeIdsFor(module).length), [3, 3, 13, 8]);
  assert.equal(modules.reduce((count, module) => count + routeIdsFor(module).length, 0), 27);
  assert.equal(routes.find(route => route.id === 'P02-01').title, '游戏创建、版本发布与资质管理页');
  assert.equal(routes.some(route => route.id === 'P04-09'), false);
});

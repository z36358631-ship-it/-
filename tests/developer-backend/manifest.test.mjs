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

test('帮助中心和 P02-01 四个任务态不增加业务路由', () => {
  const routes = readJson('demos/开发者后台一期/src/routes.json');
  assert.equal(routes.length, 37);
  assert.equal(routes.filter(item => item.id === 'P02-01').length, 1);
  assert.equal(routes.some(item => /帮助中心/.test(item.title)), false);
  assert.equal(routes.some(item => item.id === 'P04-09'), false);
  assert.equal(routes.some(item => item.id === 'P01-10'), true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

test('Figma 保持冻结的历史 9/6/13/9，Demo 明确解耦为最新 PRD 10/6/13/8', () => {
  const figma = readJson('Figma/开发者后台一期/frame-map.json');
  const routes = readJson('demos/开发者后台一期/src/routes.json');
  assert.equal(figma.totals.businessFrames, 37);
  assert.deepEqual(figma.totals.byModule, { '01': 9, '02': 6, '03': 13, '04': 9 });
  assert.deepEqual(
    Object.fromEntries(['01', '02', '03', '04'].map(id => [id, routes.filter(route => route.moduleId === id).length])),
    { '01': 10, '02': 6, '03': 13, '04': 8 },
  );
  assert.ok(routes.some(route => route.id === 'P01-10'));
  assert.ok(!routes.some(route => route.id === 'P04-09'));
});

test('冻结 Figma 仍保留历史设计证据，但不作为本轮 Demo 构建契约', () => {
  const pageMap = readJson('Figma/开发者后台一期/figma-page-map.json');
  assert.deepEqual(pageMap.pages.map(page => page.name), [
    '00 全局流程索引', '01 开发者平台与资料', '02 CDKEY 商品与供给',
    '03 包体测试与发布', '04 精准投放与数据', '组件母版',
  ]);
  const build = fs.readFileSync(path.join(root, 'demos/开发者后台一期/build.mjs'), 'utf8');
  assert.ok(build.includes('loadLatestPrdFixture'));
  assert.ok(!build.includes('frame-map.json'));
  assert.ok(!build.includes('figma-page-map.json'));
  assert.ok(!build.includes('build-figma-source'));
});

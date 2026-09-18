import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const currentFiles = [
  'demos/开发者后台一期/src/routes.json',
  'demos/开发者后台一期/src/fixtures.json',
  'demos/开发者后台一期/src/runtime/templates.js',
  'demos/开发者后台一期/src/runtime/shell.js',
  'demos/开发者后台一期/src/runtime/app.js',
  'demos/开发者后台一期/src/runtime/publisher-channel-distribution.js',
  'demos/开发者后台一期/src/styles/publisher-channel-distribution.css',
  'demos/开发者后台一期/开发者平台demo.html',
  'demos/开发者后台一期/13-开发者平台与渠道分销demo.html',
  'demos/开发者后台一期/README.md',
];

const currentPrdBody = fs.readFileSync(
  'prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md',
  'utf8',
).split('## 一、文档概述')[1];

test('当前交付仅保留盖世 Key', () => {
  const forbidden = /外部\s*Key|外部Key|双账本|外部\s*Key\s*入站|external_imported|supplyLedgers\.external/iu;
  for (const file of currentFiles) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), forbidden, file);
  }
  assert.doesNotMatch(currentPrdBody, forbidden, '当前 PRD 正文');
});

test('当前路由不含旧 CDKEY 运营后台', () => {
  const routes = JSON.parse(fs.readFileSync('demos/开发者后台一期/src/routes.json', 'utf8'));
  const module02Routes = routes.filter(route => route.moduleId === '02');
  assert.deepEqual(module02Routes.map(route => route.id), ['P02-01']);
  assert.equal(module02Routes[0].role, 'developer');
});

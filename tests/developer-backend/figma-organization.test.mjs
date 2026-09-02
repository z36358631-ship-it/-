import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const pageMapPath = 'Figma/开发者后台一期/figma-page-map.json';
const sourceDir = path.join(root, 'Figma/开发者后台一期/source');

test('Figma 按已确认的 6 个正式 Page 组织，37 个业务 Frame 仍完整', () => {
  const pageMap = readJson(pageMapPath);
  const frameMap = readJson('Figma/开发者后台一期/frame-map.json');
  assert.deepEqual(pageMap.pages.map(page => page.name), [
    '00 全局流程索引', '01 开发者平台与资料', '02 CDKEY 商品与供给',
    '03 包体测试与发布', '04 精准投放与数据', '组件母版',
  ]);
  assert.equal(frameMap.totals.businessFrames, 37);
  assert.deepEqual(frameMap.totals.byModule, { '01': 9, '02': 6, '03': 13, '04': 9 });
  assert.equal(pageMap.history.name, '废弃／历史');
  assert.equal(pageMap.history.deleteLegacyRoot, false);
});

test('生成源具有中文标题条、业务页横向排列和逐页可编辑 ID', () => {
  execFileSync(process.execPath, ['Figma/开发者后台一期/build-figma-source.mjs'], { stdio: 'pipe' });
  const manifest = readJson('Figma/开发者后台一期/source/source-manifest.json');
  assert.equal(manifest.frameCount, 37);
  assert.deepEqual(manifest.figmaPages.map(page => page.name), [
    '00 全局流程索引', '01 开发者平台与资料', '02 CDKEY 商品与供给',
    '03 包体测试与发布', '04 精准投放与数据', '组件母版',
  ]);
  for (const page of manifest.figmaPages) {
    const svg = fs.readFileSync(path.join(sourceDir, page.svg), 'utf8');
    assert.match(svg, /fill="#2FD7EF"/);
    assert.match(svg, new RegExp(page.name));
    for (const frameId of page.frameIds) assert.match(svg, new RegExp(`id="${frameId}"`));
  }
  const releaseSvg = fs.readFileSync(path.join(sourceDir, 'figma-pages/03-包体测试与发布.svg'), 'utf8');
  assert.ok(releaseSvg.indexOf('id="P03-01"') < releaseSvg.indexOf('id="P03-13"'));
});

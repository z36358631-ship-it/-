import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const prd = readFileSync(
  new URL('../prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md', import.meta.url),
  'utf8'
);

function sectionBetween(startHeading, endHeading) {
  const start = prd.indexOf(startHeading);
  const end = prd.indexOf(endHeading, start + startHeading.length);
  assert.notEqual(start, -1, `缺少章节：${startHeading}`);
  assert.notEqual(end, -1, `缺少章节：${endHeading}`);
  return prd.slice(start, end);
}

test('V1.9 使用标准九章结构并仅输出 C 端详细设计', () => {
  for (const heading of [
    '## 一、版本信息',
    '## 二、背景与目标',
    '## 三、故事介绍',
    '## 四、概要设计',
    '## 五、非功能需求',
    '## 六、埋点需求',
    '## 七、运营需求',
    '## 八、来自功能上线后的更新',
    '## 九、验收与待确认项',
  ]) assert.match(prd, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  assert.match(prd, /\|2026-08-10\|V1\.4\|/);
  assert.match(prd, /\|2026-08-10\|V1\.5\|/);
  assert.match(prd, /\|2026-08-10\|V1\.6\|/);
  assert.match(prd, /\|2026-08-11\|V1\.7\|/);
  assert.match(prd, /\|2026-08-11\|V1\.8\|/);
  assert.match(prd, /\|2026-08-11\|V1\.9\|/);
  assert.match(prd, /### 4\.2 详细设计（C端）/);
  assert.doesNotMatch(prd, /### 4\.3 详细设计（B端）/);
});

test('C 端功能汇总在单个三列表格中且规则交互分组编号', () => {
  const section = sectionBetween('### 4.2 详细设计（C端）', '## 五、非功能需求');
  assert.equal((section.match(/\|---\|---\|---\|/g) ?? []).length, 1);
  assert.match(section, /\|模块名称\|图示\|展示&交互说明\|/);
  for (const moduleName of [
    '游戏库与搜索平台标识',
    '版本选择',
    '详情下载入口',
    '已安装版本切换',
    '安装路径与默认选择',
    '无合格路径',
    '后台下载与安装结果',
  ]) assert.match(section, new RegExp(`\\|${moduleName}\\|`));
  assert.equal((section.match(/\*\*规则：\*\*/g) ?? []).length, 7);
  assert.equal((section.match(/\*\*交互：\*\*/g) ?? []).length, 7);
  assert.match(section, /\*\*规则：\*\*<br>1\./);
  assert.match(section, /<br><br>\*\*交互：\*\*<br>1\./);
});

test('8 张功能图均为固定提交公开地址且表格内外各引用一次', () => {
  const matches = [...prd.matchAll(/!\[[^\]]*\]\((https:\/\/cdn\.jsdelivr\.net\/gh\/z36358631-ship-it\/-@([0-9a-f]{40})\/public\/prd\/mac-native-version-management\/[^)]+\.png)\)/g)];
  const urls = matches.map(match => match[1]);
  assert.equal(matches.length, 16);
  assert.equal(new Set(urls).size, 8);
  assert.deepEqual(new Set(matches.map(match => match[2])), new Set(['0312808906bdc2e25db6755f5b9effd5c3386008']));
  assert.doesNotMatch(prd, /file:\/\/|localhost|@main|@master|github\.com\/[^\s)]+\/blob\//i);
});

test('埋点事件引用的参数均在参数说明表中定义', () => {
  const events = sectionBetween('### 6.1 埋点事件表', '### 6.2 埋点参数表');
  const params = sectionBetween('### 6.2 埋点参数表', '## 七、运营需求');
  const referenced = new Set([...events.matchAll(/`([a-z][a-z0-9_]*)`/g)].map(match => match[1]));
  const defined = new Set([...params.matchAll(/^\|`([a-z][a-z0-9_]*)`\|/gm)].map(match => match[1]));
  for (const name of referenced) assert.equal(defined.has(name), true, `参数未定义：${name}`);
  for (const name of defined) assert.equal(referenced.has(name), true, `参数未被事件使用：${name}`);
});

test('当前执行口径不包含已排除的空间管理和版本卸载', () => {
  const details = sectionBetween('### 4.2 详细设计（C端）', '## 五、非功能需求');
  assert.doesNotMatch(details, /空间管理|卸载版本|单版本卸载|卸载后自动切换/);
  assert.match(prd, /本期不做[^\n]*单版本卸载/);
});

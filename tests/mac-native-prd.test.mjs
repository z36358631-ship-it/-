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

test('V1.2 当前口径明确合格公式、完整排序和范围边界', () => {
  const current = sectionBetween('### 1.1 V1.2 当前执行口径', '### 1.2 V1.1 历史执行口径');

  assert.match(prd, /\|2026-08-10\|V1\.2\|/);
  assert.match(prd, /V1\.2 与 V1\.1 冲突时以 V1\.2 为准/);
  assert.match(current, /每项完整展示绝对路径和可用空间/);
  assert.match(current, /路径存在且可写，且 `availableBytes >= requiredBytes`/);
  assert.match(current, /1 MB = 1,000,000 bytes，1 GB = 1,000,000,000 bytes/);
  assert.match(current, /合格路径按 `availableBytes` 从大到小排列；空间不足路径随后仍按 `availableBytes` 从大到小排列；路径不可用项置底；容量相同时按稳定的 `order` 升序排列/);
  assert.match(current, /默认选中可用空间最大的合格路径/);
  assert.match(current, /空间不足和路径不可用的候选项不可选择/);
  assert.match(current, /没有合格路径时.*“安装游戏”不可点击/);
  assert.match(current, /V1\.2 不新增或扩展目录浏览、自定义路径创建、路径删除、重命名、格式化、清理、一键扩容或其他空间管理能力/);
});

test('V1.2 明确版本变化、取消恢复和提交前复验', () => {
  const current = sectionBetween('### 1.1 V1.2 当前执行口径', '### 1.2 V1.1 历史执行口径');
  const acceptance = sectionBetween('### 9.4 V1.2 增量验收标准', '## 自检记录');

  assert.match(current, /切换游戏版本后，当前路径仍合格则保留；否则改选可用空间最大的合格路径/);
  assert.match(current, /取消下载后.*当前路径仍合格则保留；否则改选可用空间最大的合格路径/);
  assert.match(current, /安装提交前再次校验路径和空间/);
  assert.match(current, /路径失效或空间不足时，停止安装并清空失效选择；即使存在其他合格路径，也由用户重新选择，不自动提交/);
  assert.match(acceptance, /\|最大空间默认\|至少两个路径空间足够\|打开安装路径弹窗\|合格路径按空间降序，默认选中空间最大的合格路径\|P0\|/);
  assert.match(acceptance, /\|版本变化\|当前路径已选中且切换后的版本所需空间不同\|切换游戏版本\|当前路径仍合格则保留；否则改选空间最大的合格路径\|P0\|/);
  assert.match(acceptance, /\|提交前空间不足\|已选路径在点击安装前变为空间不足\|点击安装游戏\|不开始下载，清空失效选择并提示重新选择；即使有其他合格路径也不自动提交，当前版本不变\|P0\|/);
  assert.match(acceptance, /\|取消后路径状态变化\|下载中当前路径的状态或空间已变化\|点击“取消下载”\|恢复路径选择；原路径仍合格则保留，否则改选空间最大的合格路径；当前启动版本不变\|P0\|/);
});

test('V1.1 将最新返工规则置于历史规则之上', () => {
  assert.match(prd, /\|2026-08-07\|V1\.1\|/);
  assert.match(prd, /V1\.1 与 V1\.0 冲突时以 V1\.1 为准/);
  assert.match(prd, /弹窗只展示版本 Icon、名称、当前选择态和“切换”操作/);
  assert.match(prd, /点击“切换”只更新目标版本并关闭弹窗/);
  assert.match(prd, /详情页“…”左侧主按钮后，才打开现有安装路径弹窗/);
});

test('V1.1 对设置页、下载锁定和取消复位描述无歧义', () => {
  assert.match(prd, /未安装版本按钮显示“选择版本”/);
  assert.match(prd, /安装位置、游戏版本和版本选项不可修改/);
  assert.match(prd, /取消后清空本次下载进度/);
  assert.match(prd, /不新增或扩展空间管理、单版本卸载/);
});

test('PRD 无不可交付图片地址', () => {
  assert.doesNotMatch(prd, /!\[[^\]]*\]\([^)]*\)/);
  assert.doesNotMatch(prd, /file:\/\/|localhost|@main|@master/i);
});

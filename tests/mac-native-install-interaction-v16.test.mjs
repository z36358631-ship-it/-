import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const demo = readFileSync(
  new URL('../demos/PC与Mac端/Mac原生游戏版本管理demo.html', import.meta.url),
  'utf8'
);

const prd = readFileSync(
  new URL('../prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md', import.meta.url),
  'utf8'
);

test('游戏卡片与平台摘要的 Mac 原生标识只显示苹果图标', () => {
  const nativeChipOpenTags = demo.match(/<span class="native-chip[^"]*"[^>]*>/g) ?? [];
  assert.ok(nativeChipOpenTags.length >= 3);
  assert.doesNotMatch(demo, /class="native-chip[^"]*"[^>]*><svg><use href="#i-apple"\/><\/svg><span>Mac 原生<\/span>/);
  assert.doesNotMatch(demo, /nativeLabel:'[^']*<span>Mac 原生<\/span>/);
  assert.match(demo, /title="当前使用 Mac 原生版" aria-label="当前使用 Mac 原生版"/);
});

test('安装位置优先恢复上一次成功安装路径', () => {
  assert.match(demo, /LAST_INSTALL_PATH_KEY='gamehub-last-install-path'/);
  assert.match(demo, /localStorage\.getItem\(LAST_INSTALL_PATH_KEY\)/);
  assert.match(demo, /lastUsedInstallPathId:readLastUsedInstallPath\(\)/);
  assert.match(demo, /pathEligibility\(remembered,version\)\.eligible/);
  assert.match(demo, /rememberLastUsedInstallPath\(path\.id\)/);
});

test('安装提交关闭弹窗并转入后台下载', () => {
  assert.doesNotMatch(demo, /id="progress"|id="progressBar"|取消下载/);
  assert.match(demo, /startBackgroundDownload\(selected\)/);
  assert.match(demo, /rememberLastUsedInstallPath\(path\.id\);startBackgroundDownload\(selected\);closeInstall\(\)/);
  assert.match(demo, /正在下载/);
});

test('PRD V1.6 与最近路径和后台下载口径一致', () => {
  assert.match(prd, /\|2026-08-10\|V1\.6\|/);
  assert.match(prd, /上一次成功安装/);
  assert.match(prd, /路径[^\n]*不合格[^\n]*可用空间最大/);
  assert.match(prd, /安装弹窗[^\n]*立即关闭/);
  assert.match(prd, /安装弹窗[^\n]*不显示下载进度条/);
  assert.doesNotMatch(prd, /取消下载/);
});

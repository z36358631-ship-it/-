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

test('安装位置收起态显示当前路径与常驻引导', () => {
  assert.match(demo, /id="installPathField"/);
  assert.match(demo, /id="selectedInstallPath"/);
  assert.match(demo, />安装到其他位置</);
  assert.match(demo, /data-action="toggle-install-path"/);
  assert.doesNotMatch(demo, /<div class="install-path-list" id="installPathList" role="radiogroup"/);
});

test('安装位置下拉菜单支持候选路径和自定义位置', () => {
  assert.match(demo, /id="installPathMenu"/);
  assert.match(demo, /data-action="select-install-path"/);
  assert.match(demo, /data-action="choose-custom-install-path"/);
  assert.match(demo, /\/Volumes\/My Games\/GameHub\//);
  assert.match(demo, /installPathOpen/);
});

test('Steam 和 Apple 游戏库图标独立显示', () => {
  assert.match(demo, /class="platform-badges"/);
  assert.match(demo, /class="platform-chip"/);
  assert.match(demo, /class="native-chip show"/);
  assert.doesNotMatch(demo, /platform-badges:has\(\.native-chip\.show\)/);
});

test('PRD V1.7 使用单路径下拉框口径', () => {
  assert.match(prd, /\|2026-08-11\|V1\.7\|/);
  assert.match(prd, /收起态[^\n]*安装到其他位置/);
  assert.match(prd, /macOS 文件夹选择器/);
  assert.match(prd, /\`install_path_source\`/);
  assert.doesNotMatch(prd, /安装弹窗平铺全部候选路径/);
});

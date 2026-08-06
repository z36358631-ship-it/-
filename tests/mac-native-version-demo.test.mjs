import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(
  new URL('../demos/PC与Mac端/Mac原生游戏版本管理demo.html', import.meta.url),
  'utf8'
);

test('游戏库覆盖全部平台与原生组合示例', () => {
  for (const name of [
    'installed-steam',
    'installed-epic',
    'installed-gog',
    'installed-steam-native',
    'installed-epic-native',
    'uninstalled-steam',
    'uninstalled-epic',
    'uninstalled-gog',
    'uninstalled-steam-native'
  ]) {
    assert.match(html, new RegExp(`data-demo-case="${name}"`));
  }
});

test('搜索结果只展示平台与版本，不展示安装状态', () => {
  for (const name of ['search-steam', 'search-epic', 'search-gog', 'search-steam-native', 'search-epic-native']) {
    assert.match(html, new RegExp(`data-demo-case="${name}"`));
  }
  const search = html.match(/<div class="results">([\s\S]*?)<\/div><\/div><\/div>/)?.[1] ?? '';
  assert.doesNotMatch(search, /已安装|未安装|当前使用/);
});

test('详情页包含当前页版本切换弹窗', () => {
  assert.match(html, /id="versionSwitchOverlay"/);
  assert.match(html, /id="versionSwitchList"/);
  assert.match(html, /data-action="open-version-switch"/);
  assert.match(html, /data-action="choose-version"/);
  assert.doesNotMatch(html, /data-action="open-version-settings"/);
});

test('内联脚本语法正确', () => {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, '缺少内联脚本');
  assert.doesNotThrow(() => new Function(script));
});

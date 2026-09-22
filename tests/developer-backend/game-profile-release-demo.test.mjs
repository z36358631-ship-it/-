import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const demoFile = path.join(root, 'demos', '开发者后台一期', '02-CDKEY商品与供给demo.html');
const createSourceFile = path.join(root, 'demos', '开发者后台一期', 'src', 'runtime', 'publisher-game-create.js');
const sourceFile = path.join(root, 'demos', '开发者后台一期', 'src', 'runtime', 'publisher-game-profile.js');

const read = file => {
  assert.equal(fs.existsSync(file), true, `缺少文件：${path.relative(root, file)}`);
  return fs.readFileSync(file, 'utf8');
};

test('02 主 Demo 为单文件离线 HTML，并承载游戏创建与发行资料流程', () => {
  const html = read(demoFile);
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<style>[\s\S]+<\/style>/i);
  assert.match(html, /<script>[\s\S]+<\/script>/i);
  assert.doesNotMatch(html, /<script\s+[^>]*src=|<link\s+[^>]*rel=["']stylesheet["']|<iframe\b/i);
  assert.match(html, /P02-01/);
  assert.match(html, /data-publisher-create/);
  assert.match(html, /data-create-project-name/);
});

test('创建游戏只填写后台项目字段，不承载多语言资料配置', () => {
  const html = read(demoFile);
  const createModule = read(createSourceFile);
  assert.match(html, /data-create-project-name/);
  assert.doesNotMatch(html, /data-create-language/);
  for (const forbidden of ['data-game-name-input', 'data-name-language', 'data-name-settings', '管理多语言']) {
    assert.equal(createModule.includes(forbidden), false, `创建模块不应包含多语言资料控件：${forbidden}`);
  }
});

test('创建后提供版本发布、三个来源管理页、资质与发布记录', () => {
  const html = read(demoFile);
  const source = read(sourceFile);
  const orderedNavigation = /const publisherGameConsoleSections\s*=\s*\[\s*\['release-workspace',\s*'版本发布'[\s\S]*?\['package-builds',\s*'构建管理'[\s\S]*?\['price-packages',\s*'付费下载设置'[\s\S]*?\['price-dlc',\s*'DLC 商品设置'[\s\S]*?\['versions',\s*'发布记录'[\s\S]*?\['qualifications',\s*'资质认证'/;
  assert.match(html, orderedNavigation, '版本发布与三个来源管理页的名称或顺序不符合当前方案');

  for (const contract of [
    'data-profile-catalog',
    'data-sku-add',
    'data-sku-pricing-model',
    'installContentRef',
    'discountPrice',
    'discountStartAt',
    'discountEndAt',
    'data-release-mode',
    'data-release-territory',
    'data-qualification-profile',
    'data-qualification-submit',
    'data-profile-versions',
    'data-version-record',
    'data-version-open',
    'data-profile-withdraw',
  ]) {
    assert.equal(html.includes(contract), true, `02 缺少 V2.5 合同：${contract}`);
  }

  assert.match(source, /mode:\s*[^\n]*'global'/, '发行范围应默认全球服');
  assert.match(source, /\['global',\s*'domestic'\]/, '发行范围应为全球服／国内服二选一');
  assert.match(source, /国内服 PC 资质/);
  assert.match(source, /游戏版号/);
  assert.match(source, /不可变快照/);
});

test('版本发布只读联动构建、商品、DLC，并覆盖控制器与 Windows 配置', () => {
  const source = read(sourceFile);

  for (const contract of [
    'data-release-build-select',
    'data-release-product',
    'data-release-dlc',
    'data-controller-type',
    'data-controller-other',
    'data-windows-requirement',
    'data-requirement-preset',
    'renderSourceSection',
    "'package-builds'",
    "'price-packages'",
    "'price-dlc'",
  ]) {
    assert.equal(source.includes(contract), true, `版本发布缺少合同：${contract}`);
  }

  assert.match(source, /status === '已冻结' && build\?\.qaStatus === '已通过' && build\?\.reviewStatus === '已通过'/, '只有构建、QA、提包审核均通过的 Build 才可选择');
  assert.match(source, /candidate\.dataset\.releaseBuildApp !== appId/, '选择新 Build 时应移除同 App ID 的旧选择');
  assert.match(source, /publisherScenario === 'empty'/, '应接受全局缺省态');
  assert.match(source, /publisherScenario === 'exhaustive'/, '应接受全局穷举态');
  assert.match(source, /independent:[\s\S]*cross_platform:[\s\S]*aaa:/, '应提供独立、跨端、3A 预设');

  for (const field of ['requires64Bit', 'os', 'cpu', 'memory', 'memoryUnit', 'gpu', 'directx', 'network', 'storage', 'storageUnit', 'soundCard', 'notes']) {
    assert.equal(source.includes(field), true, `Windows 配置缺少字段：${field}`);
  }
});

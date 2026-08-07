import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(
  new URL('../demos/PC与Mac端/Mac原生游戏版本管理demo.html', import.meta.url),
  'utf8'
);

const styleMatch = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
assert.ok(styleMatch, '缺少 style');
const style = styleMatch[1];

const scriptMatch = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
assert.ok(scriptMatch, '缺少 script');
const script = scriptMatch[1];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskJavaScript(source) {
  const strings = /'(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*"|`(?:\\[\s\S]|[^`\\])*`/g;
  const regexLiterals = /(^|(?:\b(?:return|case|throw|yield|await)\b|[=(:,!&|?{};\[\]])\s*)(\/(?![*/])(?:\\[\s\S]|\[(?:\\[\s\S]|[^\]\\])*\]|[^/\[\\\r\n])+\/[dgimsuvy]*)/gm;
  const comments = /\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g;
  const blank = value => value.replace(/[^\r\n]/g, ' ');
  return source
    .replace(strings, blank)
    .replace(regexLiterals, (_, prefix, literal) => prefix + blank(literal))
    .replace(comments, blank);
}

function closingDelimiter(source, start, open, close, label) {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === open) depth += 1;
    if (source[index] === close) depth -= 1;
    if (depth === 0) return index;
  }
  assert.fail(`未闭合${label}`);
}

function functionLocation(code, name) {
  const declaration = new RegExp(`\\bfunction\\s+${escapeRegExp(name)}\\s*\\(`).exec(code);
  assert.ok(declaration, `缺少函数 ${name}`);
  const parametersStart = code.indexOf('(', declaration.index);
  const parametersEnd = closingDelimiter(code, parametersStart, '(', ')', `参数 ${name}`);
  let bodyStart = parametersEnd + 1;
  while (/\s/.test(code[bodyStart])) bodyStart += 1;
  assert.strictEqual(code[bodyStart], '{', `缺少函数体 ${name}`);
  const bodyEnd = closingDelimiter(code, bodyStart, '{', '}', `函数 ${name}`);
  return { start: declaration.index, bodyStart, bodyEnd };
}

function extractFunctionSource(source, code, name) {
  const { bodyStart, bodyEnd } = functionLocation(code, name);
  return source.slice(bodyStart + 1, bodyEnd);
}

function removeFunctionSource(source, name) {
  const code = maskJavaScript(source);
  const location = functionLocation(code, name);
  return source.slice(0, location.start) + source.slice(location.bodyEnd + 1);
}

const scriptCode = maskJavaScript(script);

function functionSource(name) {
  return extractFunctionSource(script, scriptCode, name);
}

function listenerSource(eventName) {
  const marker = 'document.addEventListener';
  let offset = 0;

  while (offset < scriptCode.length) {
    const listenerStart = scriptCode.indexOf(marker, offset);
    if (listenerStart === -1) break;
    const argumentsStart = scriptCode.indexOf('(', listenerStart + marker.length);
    const argumentsEnd = closingDelimiter(scriptCode, argumentsStart, '(', ')', `监听器 ${eventName}`);
    const firstArgument = script.slice(argumentsStart + 1, argumentsEnd).match(/^\s*(['"])(.*?)\1/)?.[2];

    if (firstArgument === eventName) {
      const arrow = scriptCode.indexOf('=>', argumentsStart);
      assert.ok(arrow !== -1 && arrow < argumentsEnd, `缺少监听器 ${eventName}`);
      let bodyStart = arrow + 2;
      while (/\s/.test(scriptCode[bodyStart])) bodyStart += 1;
      assert.strictEqual(scriptCode[bodyStart], '{', `缺少监听体 ${eventName}`);
      const bodyEnd = closingDelimiter(scriptCode, bodyStart, '{', '}', `监听器 ${eventName}`);
      return script.slice(bodyStart + 1, bodyEnd);
    }

    offset = argumentsEnd + 1;
  }

  assert.fail(`缺少监听器 ${eventName}`);
}

function declarationsFromBody(body) {
  const declarations = {};
  for (const declaration of body.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;
    declarations[declaration.slice(0, colon).trim()] = declaration.slice(colon + 1).trim();
  }
  return declarations;
}

function parseCssDeclarations(source, selector) {
  const declarations = {};
  let found = false;
  for (const rule of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = rule[1].split(',').map(value => value.trim());
    if (!selectors.includes(selector)) continue;
    found = true;
    Object.assign(declarations, declarationsFromBody(rule[2]));
  }
  assert.strictEqual(found, true, `缺少样式 ${selector}`);
  return declarations;
}

function cssDeclarations(selector) {
  return parseCssDeclarations(style, selector);
}

function selectorOverrides(source, selector, protectedProperties) {
  const allowed = new Set([selector, `${selector}:before`, `${selector}:hover`, `${selector}:focus-visible`]);
  const overrides = [];
  for (const rule of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations = declarationsFromBody(rule[2]);
    for (const candidate of rule[1].split(',').map(value => value.trim())) {
      if (!candidate.includes(selector) || allowed.has(candidate)) continue;
      if (protectedProperties.some(property => Object.hasOwn(declarations, property))) overrides.push(candidate);
    }
  }
  return overrides;
}

function assertNoSelectorOverrides(selector, protectedProperties) {
  assert.strictEqual(selectorOverrides(style, selector, protectedProperties).length, 0, `组合样式 ${selector}`);
}

const tick = String.fromCharCode(96);
const functionProbe = [
  'const marker=/function target(){fake}/;',
  'function target(){',
  'const close=/}/;',
  'const escaped=/\\//;',
  'const classBrace=/[}]/;',
  "const single='escaped \\' }';",
  'const double="escaped \\" }";',
  'const template=' + tick + '} escaped \\' + tick + ' text' + tick + ';',
  'return true',
  '}'
].join('\n');
const functionProbeBody = extractFunctionSource(functionProbe, maskJavaScript(functionProbe), 'target');
assert.strictEqual(/return true/.test(functionProbeBody), true, '函数提取误判');

const cssProbe = '.x{width:1px;height:44px}.x:hover{width:999px}.x{color:red;width:88px}.x{color:blue;cursor:default}';
const cssProbeDeclarations = parseCssDeclarations(cssProbe, '.x');
assert.deepStrictEqual(
  [cssProbeDeclarations.width, cssProbeDeclarations.height, cssProbeDeclarations.cursor, cssProbeDeclarations.color],
  ['88px', '44px', 'default', 'blue'],
  'CSS 提取误判'
);

const selectorProbe = '.x{width:88px}.x:hover{width:90px}.scope .x{width:12px}.x .label{color:red}';
assert.deepStrictEqual(selectorOverrides(selectorProbe, '.x', ['width']), ['.scope .x'], '组合样式误判');

const rowProbe = 'function renderVersionSwitch(){return "version-switch-row"}const external="version-switch-row";';
const rowProbeWithoutRender = removeFunctionSource(rowProbe, 'renderVersionSwitch');
assert.strictEqual([...rowProbeWithoutRender.matchAll(/version-switch-row/g)].length, 1, '脚本隔离误判');

test('Steam 图标使用标准单路径轮廓并继承场景颜色', () => {
  const symbol = html.match(/<symbol id="i-steam"[^>]*>([\s\S]*?)<\/symbol>/)?.[1] ?? '';
  const expectedPath = 'M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z';

  assert.match(symbol, /<path\b[^>]*fill="currentColor"[^>]*stroke="none"/i, 'Steam 图形未继承 currentColor');
  assert.strictEqual((symbol.match(/<path\b/g) ?? []).length, 1, 'Steam 图形不是单一路径');
  assert.strictEqual(/<circle\b|--steam-cut/.test(symbol), false, '仍使用圆形与线段近似图标');
  assert.strictEqual(symbol.includes(`d="${expectedPath}"`), true, 'Steam 标准轮廓数据不一致');
});

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
    assert.strictEqual(html.includes(`data-demo-case="${name}"`), true, `缺少示例 ${name}`);
  }
});

test('搜索结果只展示平台与版本，不展示安装状态', () => {
  for (const name of ['search-steam', 'search-epic', 'search-gog', 'search-steam-native', 'search-epic-native']) {
    assert.strictEqual(html.includes(`data-demo-case="${name}"`), true, `缺少搜索示例 ${name}`);
  }
  const search = html.match(/<div class="results">([\s\S]*?)<\/div><\/div><\/div>/)?.[1] ?? '';
  assert.strictEqual(/已安装|未安装|当前使用/.test(search), false, '搜索含安装状态');
});

test('详情页包含当前页版本切换弹窗', () => {
  const click = listenerSource('click');
  assert.strictEqual(html.includes('id="versionSwitchOverlay"'), true, '缺少版本弹窗');
  assert.strictEqual(html.includes('id="versionSwitchList"'), true, '缺少版本列表');
  assert.strictEqual(/a\s*===\s*['"]open-version-switch['"][\s\S]*?openVersionSwitch\s*\(/.test(click), true, '缺少打开交互');
  assert.strictEqual(/a\s*===\s*['"]choose-version['"][\s\S]*?chooseVersion\s*\(/.test(click), true, '缺少切换交互');
  assert.strictEqual(/open-version-settings/.test(click), false, '仍有设置跳转');
});

test('版本切换弹窗只展示版本名称和切换操作', () => {
  const dialogStart = html.indexOf('<div class="overlay" id="versionSwitchOverlay"');
  assert.notStrictEqual(dialogStart, -1, '缺少版本弹窗');
  const dialogEnd = html.indexOf('<div class="overlay" id="installOverlay"', dialogStart);
  assert.ok(dialogEnd > dialogStart, '缺少弹窗边界');
  const dialog = html.slice(dialogStart, dialogEnd);
  const render = functionSource('renderVersionSwitch');
  const chooseButton = [...render.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)]
    .map(match => match[0])
    .find(button => /data-action\s*=\s*['"]choose-version['"]/.test(button));

  assert.strictEqual(/version-switch-copy/.test(dialog), false, '弹窗含说明');
  assert.strictEqual(/已安装|未安装|当前使用|下载并切换|\.size/.test(render), false, '弹窗含安装信息');
  assert.strictEqual(/\bv\.name\b/.test(render), true, '缺少版本名称');
  assert.strictEqual(/v\.id\s*===\s*state\.selectedVersion/.test(render), true, '缺少选中版本');
  assert.strictEqual(/version-switch-check/.test(render), true, '缺少选中对勾');
  assert.ok(chooseButton, '缺少切换按钮');
  assert.strictEqual(/切换/.test(chooseButton), true, '切换按钮文案错误');
});

test('选择未安装版本不会直接打开安装弹窗', () => {
  const choose = functionSource('chooseVersion');
  const settingsSwitch = functionSource('switchVersion');
  const click = listenerSource('click');
  const detailPrimary = click.match(
    /if\s*\(\s*a\s*===\s*['"]detail-primary['"]\s*\)([\s\S]*?)(?=\bif\s*\(\s*a\s*===|$)/
  );

  assert.strictEqual(/state\.selectedVersion\s*=\s*id/.test(choose), true, '未记录选中版本');
  assert.strictEqual(/\bopenInstall\s*\(/.test(choose), false, '弹窗切换触发安装');
  assert.strictEqual(/\bopenInstall\s*\(/.test(settingsSwitch), false, '设置切换触发安装');
  assert.ok(detailPrimary, '缺少详情主按钮');
  assert.strictEqual(/openInstall\s*\(\s*state\.selectedVersion\s*\)/.test(detailPrimary[1]), true, '详情安装入口错误');
  assert.strictEqual([...click.matchAll(/\bopenInstall\s*\(/g)].length, 1, '安装入口数量错误');
  assert.strictEqual(/state\.targetVersion/.test(`${choose}\n${settingsSwitch}\n${click}`), false, '仍使用 state.targetVersion');
});

test('设置页选择未安装版本不承诺立即下载', () => {
  const settings = functionSource('renderSettings');
  const settingsSwitch = functionSource('switchVersion');

  assert.strictEqual(/选择版本/.test(settings), true, '缺少设置页选择版本文案');
  assert.strictEqual(/下载并切换/.test(settings), false, '设置页仍承诺立即下载');
  assert.strictEqual(/\bopenInstall\s*\(/.test(settingsSwitch), false, '设置页选择版本触发安装');
  assert.strictEqual(/showPage\s*\(\s*['"]detail['"]\s*\)/.test(settingsSwitch), true, '设置页未返回详情');
});

test('下载期间锁定安装选项且取消后清空进度', () => {
  const render = functionSource('renderInstall');
  const cancel = functionSource('cancelDownload');
  const cyclePath = functionSource('cyclePath');
  const click = listenerSource('click');

  assert.strictEqual(/#pathField['"]\)\.disabled\s*=\s*downloading/.test(render), true, '下载期间未锁定安装位置');
  assert.strictEqual(/#versionField['"]\)\.classList\.toggle\(\s*['"]disabled['"]\s*,\s*downloading/.test(render), true, '下载期间未锁定版本入口');
  assert.strictEqual(/version-option[^`]*disabled/.test(render), true, '下载期间未禁用版本选项');
  assert.strictEqual(/downloadState\s*===\s*['"]downloading['"]/.test(cyclePath), true, '路径切换缺少下载状态保护');
  assert.strictEqual(/select-install-version[^\n]*downloadState\s*!==\s*['"]downloading['"]/.test(click), true, '版本选择缺少下载状态保护');
  assert.strictEqual(/downloadProgress\s*=\s*0/.test(cancel), true, '取消后未清空进度状态');
  assert.strictEqual(/#progressBar['"]\)\.style\.width\s*=\s*['"]0%['"]/.test(cancel), true, '取消后未清空进度条');
});

test('版本弹窗只有明确按钮可点击且热区达标', () => {
  const render = functionSource('renderVersionSwitch');
  const scriptWithoutRender = removeFunctionSource(script, 'renderVersionSwitch');
  const rowTag = render.match(/<[^>]*class=['"][^'"]*\bversion-switch-row\b[^'"]*['"][^>]*>/)?.[0];

  assert.strictEqual(/version-switch-row/.test(scriptWithoutRender), false, '其他脚本引用版本行');
  assertNoSelectorOverrides('.version-switch-action', ['width', 'height']);
  assertNoSelectorOverrides('.version-switch-close', ['width', 'height']);
  assertNoSelectorOverrides('.version-switch-row', ['cursor']);

  const action = cssDeclarations('.version-switch-action');
  const close = cssDeclarations('.version-switch-close');
  const row = cssDeclarations('.version-switch-row');

  assert.strictEqual(action.width, '88px', '切换按钮宽度');
  assert.strictEqual(action.height, '44px', '切换按钮高度');
  assert.strictEqual(close.width, '44px', '关闭按钮宽度');
  assert.strictEqual(close.height, '44px', '关闭按钮高度');
  assert.strictEqual(row.cursor, 'default', '版本行光标');
  assert.ok(rowTag, '缺少版本行');
  assert.strictEqual(/\bdata-action\s*=/.test(rowTag), false, '版本行含 data-action');
  assert.strictEqual(/\bonclick\s*=/.test(rowTag), false, '版本行含 onclick');
  assert.strictEqual(/\brole\s*=\s*['"]button['"]/.test(rowTag), false, '版本行含按钮角色');
});

test('内联脚本语法正确', () => {
  assert.doesNotThrow(() => new Function(script), '脚本语法错误');
});

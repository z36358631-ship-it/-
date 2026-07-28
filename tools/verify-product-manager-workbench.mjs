import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'demos', '产品经理全生命周期工作台demo.html');
const supportedModes = [
  'all',
  'shell',
  'domain',
  'workflow',
  'accessibility',
  'stateContract',
  'syntax',
];

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

function requireTokens(html, contract, tokens) {
  for (const token of tokens) {
    assert(html.includes(token), `Missing ${contract} token: ${token}`);
  }
}

function readDemo() {
  assert(
    fs.existsSync(htmlPath),
    `Missing demo HTML: ${htmlPath}. Create the V1 workbench demo before running this contract.`,
  );
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.trim().length > 0, `Demo HTML is empty: ${htmlPath}`);
  return html;
}

function extractInlineScript(html) {
  const openingTags = [...html.matchAll(/<script\b/gi)];
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];

  assert(
    scripts.length === openingTags.length,
    `Found ${openingTags.length} <script> opening tag(s), but only ${scripts.length} complete script element(s)`,
  );
  assert(scripts.length === 1, `Expected exactly 1 inline script, found ${scripts.length}`);

  const [, attributes, code] = scripts[0];
  assert(!/\bsrc\s*=/i.test(attributes), 'The only script must be inline; a src attribute was found');
  assert(code.trim().length > 0, 'The inline script is empty');
  return code;
}

function shell(html) {
  requireTokens(html, 'shell', [
    '产品工作台',
    'id="globalSearch"',
    'data-action="new-requirement"',
    'data-action="reset-demo"',
  ]);

  const navMatch = html.match(/<nav\b[^>]*>([\s\S]*?)<\/nav\s*>/i);
  assert(navMatch, 'Missing navigation element');

  const navPages = [
    ...navMatch[1].matchAll(/<(?:button|a)\b[^>]*\bdata-page\s*=\s*(["'])([^"']+)\1[^>]*>/gi),
  ].map(match => match[2]);
  const expectedPages = ['home', 'planning', 'requirements', 'review', 'data', 'team'];

  assert(
    navPages.length === expectedPages.length,
    `Expected ${expectedPages.length} page navigation items, found ${navPages.length}: ${navPages.join(', ') || '(none)'}`,
  );
  for (const page of expectedPages) {
    assert(
      navPages.filter(candidate => candidate === page).length === 1,
      `Navigation must contain data-page="${page}" exactly once`,
    );
    assert(
      new RegExp(`<section\\b[^>]*\\bid\\s*=\\s*(["'])page-${page}\\1`, 'i').test(html),
      `Missing page section: id="page-${page}"`,
    );
  }
}

function domain(html) {
  requireTokens(html, 'domain', [
    'APP-2026.8',
    'MAC-2026.8',
    'REQ-001',
    'Android广告接入',
    'REQ-002',
    'iOS应用与IPA资源库',
    'REQ-003',
    '云存档月卡插单',
    '快速需求',
    '专员执行',
    '完整需求',
  ]);
}

function workflow(html) {
  requireTokens(html, 'workflow', [
    '待我处理',
    '统一待办',
    '规划中心',
    '需求来源',
    '需求池',
    '版本规划',
    '插单影响',
    '需求中心',
    '业务流与规则',
    '产物与任务',
    '评审与验收',
    '下一责任人',
    '唯一审批人',
  ]);
}

function accessibility(html) {
  assert(
    /<aside\b[^>]*\baria-label\s*=\s*(["'])主导航\1/i.test(html),
    'Missing main navigation label: aria-label="主导航"',
  );
  assert(
    /<input\b[^>]*\bid\s*=\s*(["'])globalSearch\1[^>]*\baria-label\s*=\s*(["'])全局搜索\2/i.test(html)
      || /<input\b[^>]*\baria-label\s*=\s*(["'])全局搜索\1[^>]*\bid\s*=\s*(["'])globalSearch\2/i.test(html),
    'Missing accessible global search input',
  );
  assert(
    /<a\b[^>]*\bclass\s*=\s*(["'])[^"']*\bskip-link\b[^"']*\1[^>]*\bhref\s*=\s*(["'])#mainContent\2/i.test(html)
      || /<a\b[^>]*\bhref\s*=\s*(["'])#mainContent\1[^>]*\bclass\s*=\s*(["'])[^"']*\bskip-link\b[^"']*\2/i.test(html),
    'Missing skip link to #mainContent',
  );
  requireTokens(html, 'accessibility', [
    'id="mainContent"',
    ':focus-visible',
    '@media (prefers-reduced-motion: reduce)',
    'role="dialog"',
    'aria-modal="true"',
    'function focusDialog()',
    'requestAnimationFrame',
    "event.key === 'Escape'",
    "event.key==='Tab'",
    'inert=true',
  ]);
}

function stateContract(html) {
  requireTokens(html, 'state', [
    'const seedState =',
    'executionPath',
    'nextOwner',
    'approver',
    'artifacts',
    'decisionGates',
    'planningView',
    'requirementFilters',
    'reviewFilter',
    'insertionRecords',
    'inputMaterials',
    'authorizationScope',
    'acceptanceCriteria',
    'function isValidState',
    'function releaseUsage',
    'function renderApp()',
    'function setPage(page)',
    'window.WorkbenchDemo',
  ]);
}

function syntax(html) {
  const code = extractInlineScript(html);
  new vm.Script(code, { filename: 'product-manager-workbench-inline.js' });
}

const checks = { shell, domain, workflow, accessibility, stateContract, syntax };

function main() {
  const mode = process.argv[2] || 'all';
  assert(
    supportedModes.includes(mode),
    `Unknown mode: ${mode}. Supported modes: ${supportedModes.join('|')}`,
  );

  const html = readDemo();
  const selectedChecks = mode === 'all' ? Object.entries(checks) : [[mode, checks[mode]]];

  for (const [name, check] of selectedChecks) {
    try {
      check(html);
      console.log(`PASS ${name}`);
    } catch (error) {
      throw new Error(`${name}: ${error.message}`, { cause: error });
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
}

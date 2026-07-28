import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const files = {
  html: 'workbench/public/index.html',
  css: 'workbench/public/styles.css',
  app: 'workbench/public/app.js',
  demo: 'demos/产品经理全生命周期工作台demo.html',
};

for (const [kind, relativePath] of Object.entries(files)) {
  assert(fs.existsSync(path.join(root, relativePath)), `Missing ${kind} file: ${relativePath}`);
}

const html = fs.readFileSync(path.join(root, files.html), 'utf8');
const css = fs.readFileSync(path.join(root, files.css), 'utf8');
const app = fs.readFileSync(path.join(root, files.app), 'utf8');
const demo = fs.readFileSync(path.join(root, files.demo), 'utf8');
const productUi = `${html}\n${app}\n${demo}`;

const requiredCopy = [
  '待我处理',
  '规划中心',
  '需求中心',
  '评审与验收',
  '数据与复盘',
  'Codex任务',
  '问 Codex',
  '外部等待',
  '产品专员任务备注',
  'Codex运行状态',
  '只读分析',
];
for (const token of requiredCopy) {
  assert(html.includes(token), `Missing UI token: ${token}`);
}

const forbiddenCopy = [
  '团队与AI',
  '下一责任人',
  '唯一审批人',
  'AI员工',
  '模拟 AI',
  '模拟AI',
  '登录账号',
  '多人协作',
  '审批流',
];
for (const token of forbiddenCopy) {
  assert(!productUi.includes(token), `Forbidden legacy token: ${token}`);
}

assert.match(html, /<html\s+lang="zh-CN">/);
assert.match(html, /name="viewport"\s+content="width=device-width,\s*initial-scale=1"/);
assert.match(html, /class="skip-link"\s+href="#mainContent"/);
assert.match(html, /<aside[^>]+aria-label="主导航"/);
assert.match(html, /<main[^>]+id="mainContent"[^>]+tabindex="-1"/);
assert.match(html, /<dialog[^>]+id="codexDrawer"[^>]+aria-labelledby="codexTitle"/);
assert.match(html, /id="streamOutput"[^>]+aria-live="polite"/);
assert.match(html, /<svg\b/);
assert.equal(/https?:\/\//.test(html), false, 'Workbench UI must not depend on remote assets');
assert.equal(/\p{Extended_Pictographic}/u.test(productUi), false, 'Structural emoji is not allowed');

assert.match(css, /:root\s*{[^}]*--color-primary:/s);
assert.match(css, /--color-surface:/);
assert.match(css, /--color-text:/);
assert.match(css, /--control-height:\s*44px/);
assert.match(css, /:focus-visible/);
assert.match(css, /@media\s*\(max-width:\s*1439px\)/);
assert.match(css, /@media\s*\(max-width:\s*1023px\)/);
assert.match(css, /@media\s*\(max-width:\s*767px\)/);
assert.match(css, /@media\s*\(max-width:\s*420px\)/);
assert.match(css, /prefers-reduced-motion:\s*reduce/);

assert.match(app, /new EventSource\(`\/api\/runs\/\$\{encodeURIComponent\(run\.id\)\}\/events\?token=\$\{encodeURIComponent\(state\.token\)\}`\)/);
assert.match(app, /api\(['"`]\/api\/bootstrap/);
assert.match(app, /api\(['"`]\/api\/runs/);
assert.match(app, /\.textContent\s*=/);
assert.match(app, /\.replaceChildren\(/);
assert.match(app, /document\.createElement\(/);
assert.equal(/\.innerHTML\s*=|insertAdjacentHTML|\.outerHTML\s*=/.test(app), false, 'Unsafe HTML injection API found');
assert.equal(/\b(command|codexArgs|sandboxPolicy)\s*:/.test(app), false, 'Frontend must not submit Codex controls');
assert.match(app, /history\.replaceState/);
assert.match(app, /sessionStorage\.setItem/);
assert.match(app, /aria-current/);

assert.match(demo, /npm\.cmd run workbench:start/);
assert.match(demo, /127\.0\.0\.1/);
assert.equal(/<script[^>]+src=|<link[^>]+href=["']https?:/.test(demo), false, 'Demo must be self-contained');

console.log('PASS personal workbench static contract');

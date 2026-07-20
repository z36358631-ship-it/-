import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'demos', 'Android广告接入-交互标注版.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const mode = process.argv[2] || 'all';

function assert(ok, message) { if (!ok) throw new Error(message); }
function pass(name) { console.log(`PASS ${name}`); }

function shell() {
  for (const token of ['用户端','运营后台','leftNav','demoCanvas','annoList','触发条件','展示说明','交互说明']) assert(html.includes(token), `Missing shell token: ${token}`);
  pass('shell');
}

function scenes() {
  for (const id of ['O1','H1','P1','C1','G1','Q1','L1']) {
    assert(html.includes(`['${id}'`) || html.includes(`"${id}"`), `Missing placement ${id}`);
    assert(html.includes(`${id}:{i:`), `Missing annotations ${id}`);
  }
  assert(!html.includes("['D1'"), 'Removed D1 still in placement list');
  assert(!html.includes("['S1'"), 'Removed S1 still in placement list');
  assert(html.includes('data-o1-step'), 'O1 state machine DOM missing');
  assert(html.includes('data-checkin-state'), 'C1 check-in flow missing');
  assert(html.includes('data-request-id'), 'L1 shared request identity missing');
  pass('scenes');
}

function admin() {
  for (const token of ['adminProductName','adminSidebar','adminRegionTabs','deliveryTable','experimentTable','adminDrawer','确认删除','保存草稿']) assert(html.includes(token), `Missing admin token: ${token}`);
  pass('admin');
}

function assets() {
  const count = (html.match(/data:image\//g) || []).length;
  assert(count >= 9, `Expected at least 9 embedded image assets, found ${count}`);
  assert(!html.includes('/* ASSET_BUNDLE */'), 'Asset marker was not replaced');
  for (const token of ['20260618-120632.jpg','20260521-152127.jpg','gw_logo.svg']) assert(html.includes(token), `Missing source metadata ${token}`);
  pass('assets');
}

function syntax() {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert(scripts.length >= 2, 'Inline scripts missing');
  scripts.forEach((code, i) => new vm.Script(code, { filename: `inline-${i}.js` }));
  pass('uiSyntax');
}

const tasks = { shell, scenes, admin, assets, syntax };
if (mode === 'all') Object.values(tasks).forEach(fn => fn());
else if (tasks[mode]) tasks[mode]();
else throw new Error(`Unknown mode: ${mode}`);

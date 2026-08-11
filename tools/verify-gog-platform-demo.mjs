import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'demos', 'PC与Mac端', '盖世游戏GOG平台接入-交互标注版.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const mode = process.argv[2] || 'all';
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const pass = name => console.log(`PASS ${name}`);

function shell() {
  for (const token of ['gogDemoShell','leftNav','demoCanvas','annoPanel','interactionTab','edgeTab','toggleMarkers','togglePanel'])
    assert(html.includes(token), `Missing shell token: ${token}`);
  pass('shell');
}
function pages() {
  for (const id of ['profile-unbound','gog-login','profile-bound','library-unbound','library-bound','detail-gog','detail-switch','search-portrait','search-landscape'])
    assert(html.includes(`id:'${id}'`) || html.includes(`id: '${id}'`), `Missing page: ${id}`);
  pass('pages');
}
function platformModel() {
  for (const token of ['sourcePlatform','selectedPlatform','ownedPlatforms','platformAppId','gameId','resolveSelectedPlatform','lowConfidenceNoMerge'])
    assert(html.includes(token), `Missing model token: ${token}`);
  assert(html.includes("['steam','epic','gog']"), 'Default platform priority missing');
  pass('platformModel');
}
function states() {
  for (const token of ['loading','empty','error','expired','cancelled','cached'])
    assert(html.includes(token), `Missing recovery state: ${token}`);
  pass('states');
}
function security() {
  assert(html.includes('GOG 官方登录'), 'Official login boundary missing');
  assert(html.includes('不保存邮箱或密码'), 'Credential-storage prohibition missing');
  assert(!html.includes("localStorage.setItem('gogPassword'"), 'GOG password must not be stored');
  pass('security');
}
function syntax() {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert(scripts.length === 1, `Expected one inline script, found ${scripts.length}`);
  scripts.forEach((code, index) => new vm.Script(code, { filename: `gog-inline-${index}.js` }));
  pass('syntax');
}
const tasks = { shell, pages, platformModel, states, security, syntax };
if (mode === 'all') Object.values(tasks).forEach(task => task());
else if (tasks[mode]) tasks[mode]();
else throw new Error(`Unknown mode: ${mode}`);

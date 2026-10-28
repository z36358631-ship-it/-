// Independent AI-account acceptance. Local sample accounts only; never signs in to an AI service.
const { chromium } = require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = process.env.ACCOUNTS_TEST_OUT || path.join(__dirname, 'review/v414/accounts-local');
const report = { pass: false, checks: [], errors: [], screenshots: [], scope: '本地交互样例账号、会话/文字/图片隔离，不证明真实 AI 登录或远程账号集成。' };
const selector = a => `[data-action="${a}"]`;
const click = (p, a) => p.locator(selector(a)).first().click();
const invoke = (p, a) => p.evaluate(a => action(a), a);
const snapshot = p => p.evaluate(() => RemoteAiAccounts.snapshot());
const source = file => process.env.REMOTE_BASE_URL ? process.env.REMOTE_BASE_URL.replace(/\/$/, '') + '/' + file : 'file:///' + path.join(__dirname, file).replaceAll('\\', '/');
const variants = { mobile: { shell: '.mobile-independent-shell', list: 'office-ai', demo: 'office-demo:', input: '#office-native-input', send: 'office-native-send', back: 'office-back' }, mac: { shell: '.sr-client', list: 'office-sessions', demo: 'rom:demo:', input: '#rom-compose', send: 'rom:send', back: 'exit' } };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1kAAAAASUVORK5CYII=', 'base64');
let browser;
async function shot(p, side, name) { const file = side + '-' + name + '.png'; await p.locator(variants[side].shell).screenshot({ path: path.join(out, file) }); report.screenshots.push(file); }
async function login(p, side) {
  if (side === 'mobile') { await p.locator('#mobile-phone').fill('13600008000'); await click(p, 'mobile-sms'); await p.locator('#mobile-code').fill('864209'); await p.locator('#mobile-agreement').check(); await click(p, 'mobile-login-submit'); }
  else { await p.locator('#sr-credential').fill('13600008000'); await click(p, 'sr-send-code'); await p.locator('#sr-code').fill('864209'); await p.locator('#sr-consent').check(); await p.locator('#sr-account-form button[type=submit]').click(); }
  await p.waitForFunction(() => s.page === 'usage-choice'); await click(p, 'usage-choice:office');
  if (side === 'mac' && await p.locator('.sr-first-guide').count()) await click(p, 'sr-onboard-skip');
}
async function aiList(p, side) { await invoke(p, side === 'mobile' ? 'mobile-tab:ai' : 'rom:sessions'); }
async function manage(p, side, app = 'vscode') { await aiList(p, side); await click(p, 'ai-account:manage'); await p.locator('#ai-account-device').selectOption('win'); await click(p, 'ai-account:app:' + app); }
async function openSession(p, side, app = 'vscode') {
  await aiList(p, side);
  if (side === 'mobile') { const id = await p.evaluate(app => RemoteOfficeMobile.data('win').threads.find(t => t.app === app).id, app); await click(p, 'office-native:win:' + app + ':' + id); }
  else { await click(p, 'rom:open:win-' + app); await p.waitForSelector('#rom-compose'); }
}
async function contents(p, side, app = 'vscode') {
  return p.evaluate(({ side, app }) => {
    if (side === 'mobile') return RemoteOfficeMobile.data('win').threads.filter(t => t.app === app);
    const d = RemoteOfficeMac.state.devices.win || {}; return { drafts: d.drafts || {}, messages: d.messages || {} };
  }, { side, app });
}
async function primarySecondary(p, side) {
  const v = variants[side];
  await manage(p, side); assert.equal(await p.locator('.ai-account-tabs button').count(), 3); assert.equal((await snapshot(p)).app, 'vscode');
  assert.equal((await snapshot(p)).stores['win|vscode'].active, 'primary'); await shot(p, side, 'primary-accounts');
  await openSession(p, side); await p.locator(v.input).fill(side + '-primary-message'); await click(p, v.send); await p.locator(v.input).fill(side + '-primary-draft');
  if (side === 'mobile') {
    const chooser = p.waitForEvent('filechooser'); await click(p, 'phone-media:pick:attachment'); await (await chooser).setFiles({ name: 'primary-private.png', mimeType: 'image/png', buffer: png });
    assert.equal(await p.locator('.phone-media-drafts figure').count(), 1); await shot(p, side, 'primary-image-draft');
  }
  await openSession(p, side, 'claude'); await p.locator(v.input).fill(side + '-claude-preserved');
  await manage(p, side); await click(p, 'ai-account:switch:secondary'); assert.equal((await snapshot(p)).stores['win|vscode'].active, 'secondary');
  const secondaryStore = JSON.stringify(await contents(p, side)); assert.doesNotMatch(secondaryStore, new RegExp(side + '-primary-(message|draft)')); assert.match(secondaryStore, /pe\*\*\*@example.com/);
  await openSession(p, side); assert.equal(await p.locator(v.input).inputValue(), '');
  if (side === 'mobile') { assert.equal(await p.locator('.phone-media-drafts figure').count(), 0); await click(p, 'office-demo:preview'); assert.match(await p.evaluate(() => RemoteOfficeMobile.state.thread), /secondary/); assert.equal(await p.locator('#office-native-input').inputValue(), ''); }
  await p.locator(v.input).fill(side + '-secondary-message'); await click(p, v.send); await p.locator(v.input).fill(side + '-secondary-draft'); await shot(p, side, 'secondary-session');
  await manage(p, side); await p.locator('#ai-account-device').selectOption('work'); assert.equal((await snapshot(p)).stores['work|vscode'].active, 'primary'); await p.locator('#ai-account-device').selectOption('win'); assert.equal((await snapshot(p)).stores['win|vscode'].active, 'secondary');
  await click(p, 'ai-account:switch:primary'); await openSession(p, side); assert.equal(await p.locator(v.input).inputValue(), side + '-primary-draft');
  const restored = JSON.stringify(await contents(p, side)); assert.match(restored, new RegExp(side + '-primary-message')); assert.doesNotMatch(restored, new RegExp(side + '-secondary-message'));
  if (side === 'mobile') { assert.equal(await p.locator('.phone-media-drafts figure').count(), 1); assert.match(await p.locator('.phone-media-drafts').innerText(), /primary-private.png/); }
  await shot(p, side, 'primary-restored');
  await openSession(p, side, 'claude'); assert.equal(await p.locator(v.input).inputValue(), side + '-claude-preserved');
  await manage(p, side); await click(p, 'ai-account:switch:secondary'); await openSession(p, side); assert.equal(await p.locator(v.input).inputValue(), side + '-secondary-draft');
  if (side === 'mobile') assert.equal(await p.locator('.phone-media-drafts figure').count(), 0);
  await manage(p, side); await click(p, 'ai-account:switch:primary');
  report.checks.push(side + '：电脑/软件维度选择，primary-secondary消息与草稿双向隔离，其他软件草稿保留' + (side === 'mobile' ? '，图片附件随AI账号保存且未串号，预览进入当前账号会话' : ''));
}
async function restrictions(p, side) {
  const v = variants[side];
  for (const [mode, message] of [['offline', /离线/], ['blocked', /权限|被控/], ['busy', /被控|控制/]]) {
    await click(p, v.demo + mode); await manage(p, side); const before = await snapshot(p);
    await click(p, 'ai-account:switch:secondary'); assert.equal((await snapshot(p)).stores['win|vscode'].active, before.stores['win|vscode'].active); assert.match(await p.locator('.ai-account-notice').innerText(), message);
    await click(p, 'ai-account:add'); assert.equal(await p.locator(selector('ai-account:open')).isDisabled(), true); await invoke(p, 'ai-account:open'); assert.equal(await p.evaluate(() => s.page), 'ai-accounts');
    await invoke(p, 'ai-account:complete'); assert.equal((await snapshot(p)).stores['win|vscode'].accounts.length, before.stores['win|vscode'].accounts.length); await shot(p, side, mode + '-blocked');
  }
  await click(p, v.demo + 'all'); report.checks.push(side + '：offline/blocked/busy均阻止切换、打开客户端及模拟登录完成');
}
async function addAndLanguage(p, side) {
  await manage(p, side); await click(p, 'ai-account:add'); await shot(p, side, 'add-guide'); await click(p, 'ai-account:open'); await p.waitForFunction(() => s.page === 'session');
  assert.equal(await p.locator('.ai-account-review').count(), 1); await click(p, 'ai-account:complete'); assert.equal(await p.evaluate(() => s.page), 'ai-accounts');
  assert.equal(await p.locator('.ai-account-row[data-account="added-3"]').count(), 1); await click(p, 'ai-account:switch:added-3'); assert.equal((await snapshot(p)).stores['win|vscode'].active, 'added-3');
  await openSession(p, side); assert.match(JSON.stringify(await contents(p, side)), /de\*\*\*1@example.com/); assert.equal(await p.locator(variants[side].input).inputValue(), '');
  await manage(p, side); await p.locator('[data-remote-language="en"]').click(); assert.match(await p.locator('.ai-account-head h1').innerText(), /AI accounts/); assert.match(await p.locator('.ai-account-description').innerText(), /Manage client accounts/); assert.match(await p.locator('.ai-account-current').innerText(), /Current/); await shot(p, side, 'accounts-en');
  await p.locator('[data-remote-language="zh"]').click(); assert.match(await p.locator('.ai-account-head h1').innerText(), /AI 账号/); await shot(p, side, 'added-account-zh');
  report.checks.push(side + '：添加→打开客户端→外侧模拟登录完成→added-3可切换，呈现独立账号会话；中英文界面验证');
}
async function logout(p, side) {
  await invoke(p, side === 'mobile' ? 'mobile-logout' : 'sr-logout'); await click(p, 'remote-logout:confirm');
  assert.equal(await p.evaluate(side => side === 'mobile' ? mobileAuth.loggedIn : standaloneMac.signed, side), false);
  assert.deepEqual((await snapshot(p)).stores, {}); const pageBefore = await p.evaluate(() => s.page);
  for (const a of ['ai-account:manage', 'ai-account:switch:secondary', 'ai-account:complete', 'ai-account:open']) await invoke(p, a);
  assert.equal(await p.evaluate(() => s.page), pageBefore); assert.deepEqual((await snapshot(p)).stores, {});
  if (side === 'mobile') { assert.deepEqual(await p.evaluate(() => RemoteOfficeMobile.state.devices), {}); assert.equal(await p.locator('.phone-media-drafts figure').count(), 0); }
  else assert.deepEqual(await p.evaluate(() => RemoteOfficeMac.state.devices), {});
  await shot(p, side, 'logout-cleared'); report.checks.push(side + '：退出盖世清除账号与会话缓存，旧账号动作不能绕过登录');
}
(async () => {
  fs.mkdirSync(out, { recursive: true }); browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  for (const side of ['mobile', 'mac']) {
    const p = await browser.newPage({ viewport: { width: side === 'mobile' ? 1320 : 1510, height: 1050 } }); p.setDefaultTimeout(10000); p.on('pageerror', e => report.errors.push(side + ': ' + e.message));
    try { await p.goto(source(side + '.html') + '?lang=zh'); await login(p, side); await primarySecondary(p, side); await restrictions(p, side); await addAndLanguage(p, side); await logout(p, side); }
    catch (e) { report.errors.push(side + ': ' + e.stack); try { await shot(p, side, 'FAIL'); } catch {} }
    await p.close();
  }
  report.pass = report.errors.length === 0; await browser.close(); fs.writeFileSync(path.join(out, 'accounts-results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); if (!report.pass) process.exitCode = 1;
})().catch(async e => { report.errors.push(e.stack); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'accounts-results.json'), JSON.stringify(report, null, 2)); await browser?.close(); console.error(e); process.exitCode = 1; });

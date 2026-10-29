// V4.19 手机 AI 预览、模拟回复和按住说话验收；不请求真实麦克风或 AI 服务。
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = process.env.TEST_OUT || path.join(__dirname, 'review/v416/reply-voice');
const report = { version: 'V4.19', pass: false, checks: [], errors: [], screenshots: [], source: process.env.REMOTE_BASE_URL || 'local built HTML', scope: '真实浏览器 pointer/key 操作及模拟场景守卫；pointercancel、IME composing 键由 DOM 事件模拟。不证明真实远控、麦克风、语音识别或 AI 服务接入。' };
const sel = action => '[data-action=' + JSON.stringify(action) + ']';
const invoke = (p, value) => p.evaluate(value => action(value), value);
let browser;

async function reveal(p, target) {
  const ancestors = await target.evaluate(el => { const list = []; for (let a = el.parentElement; a; a = a.parentElement) if (a.tagName === 'DETAILS' && (a.hasAttribute('data-office-tree') || a.hasAttribute('data-rom-tree'))) list.unshift([a.hasAttribute('data-office-tree') ? 'data-office-tree' : 'data-rom-tree', a.getAttribute(a.hasAttribute('data-office-tree') ? 'data-office-tree' : 'data-rom-tree')]); return list; });
  for (const [attr, value] of ancestors) { const branch = p.locator('[' + attr + '=' + JSON.stringify(value) + ']'); if (!await branch.evaluate(el => el.open)) await branch.locator(':scope > summary').click(); }
}
async function click(p, action) { const target = p.locator(sel(action)).first(); await reveal(p, target); await target.click(); }
async function open(side = 'mobile', native = true) {
  const p = await browser.newPage({ viewport: { width: side === 'mobile' ? 1320 : 1510, height: 1150 }, hasTouch: true });
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => report.errors.push(side + ': ' + e.message));
  await p.addInitScript(() => { window.__unexpectedMicCalls = 0; if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { window.__unexpectedMicCalls++; throw new Error('This demo must not request a microphone'); }; });
  const base = process.env.REMOTE_BASE_URL?.replace(/\/$/, '');
  const url = base ? base + '/' + side + '.html' : pathToFileURL(path.join(__dirname, side + '.html')).href;
  await p.goto(url + '?lang=zh');
  if (side === 'mobile') {
    await p.locator('#mobile-phone').fill('13600008000'); await click(p, 'mobile-sms'); await p.locator('#mobile-code').fill('864209'); await p.locator('#mobile-agreement').check(); await click(p, 'mobile-login-submit');
  } else {
    await p.locator('#sr-credential').fill('13600008000'); await click(p, 'sr-send-code'); await p.locator('#sr-code').fill('864209'); await p.locator('#sr-consent').check(); await p.locator('#sr-account-form button[type=submit]').click();
  }
  await p.waitForFunction(() => s.page === 'usage-choice'); await click(p, 'usage-choice:office');
  if (side === 'mac' && await p.locator('.sr-first-guide').count()) await click(p, 'sr-onboard-skip');
  if (side === 'mobile' && native) await click(p, 'office-native:win:vscode:plan');
  return p;
}
async function check(name, run, side = 'mobile', native = true) {
  let p;
  try { p = await open(side, native); const evidence = await run(p); assert.equal(await p.evaluate(() => window.__unexpectedMicCalls), 0); report.checks.push({ name, pass: true, evidence: evidence ?? true }); }
  catch (e) { report.checks.push({ name, pass: false, error: e.message }); report.errors.push(name + ': ' + e.stack); if (p) try { await p.locator(side === 'mobile' ? '.mobile-independent-shell' : '.sr-client').screenshot({ path: path.join(out, 'FAIL-' + report.checks.length + '.png') }); } catch {} }
  finally { await p?.close(); }
}
const snapshot = (p, id = 'plan') => p.evaluate(id => { const t = RemoteOfficeMobile.data('win').threads.find(t => t.id === id); return t ? { id: t.id, draft: t.draft, messages: t.messages.map(m => ({ role: m.role, text: m.text, simulated: m.simulated })) } : null; }, id);
const count = (t, role) => t.messages.filter(m => m.role === role).length;
async function waitReply(p, before, id = 'plan') { await p.waitForFunction(({ id, before }) => { const t = RemoteOfficeMobile.data('win').threads.find(t => t.id === id); return t && t.messages.filter(m => m.role === 'assistant').length === before + 1; }, { id, before }); }
async function hold(p, target = '#office-native-input') { const el = p.locator(target); await el.scrollIntoViewIfNeeded(); const r = await el.boundingBox(); assert(r, 'Voice target must be visible'); await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await p.waitForTimeout(430); assert.equal(await p.locator('#office-native-form').getAttribute('data-speech-state'), 'recording'); assert.match(await p.locator('.office-voice-status').innerText(), /松开发送/); return r; }
async function release(p) { await p.mouse.up(); }
async function shot(p, file) { await p.locator('.mobile-independent-shell').screenshot({ path: path.join(out, file), animations: 'disabled' }); report.screenshots.push(file); }
async function selected(p) { return p.evaluate(() => ({ page: s.page, thread: RemoteOfficeMobile.state.thread, capture: RemoteOfficeMobile.state.capture })); }

(async () => {
  fs.mkdirSync(out, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });

  await check('默认预览电脑当前 AI 对话；文字与语音均得到模拟回复', async p => {
    assert.equal(await p.locator('.office-native-preview').getAttribute('data-preview-kind'), 'ai');
    assert.equal(await p.locator('.office-ai-preview').getAttribute('data-thread'), 'plan');
    assert.match(await p.locator('.office-ai-preview-title').innerText(), /VS Code|新增月度预算提醒/);
    assert.equal(await p.locator('.office-preview-browser').count(), 0);
    assert.equal(await p.locator('#office-native-input').getAttribute('placeholder'), '发消息或按住说话');
    await shot(p, '01-computer-ai-preview.png');
    let before = await snapshot(p);
    await p.locator('#office-native-input').fill('请把月度预算提醒的说明写得更清楚。'); await click(p, 'office-native-send');
    assert.equal(count(await snapshot(p), 'user'), count(before, 'user') + 1);
    assert(await p.locator('.office-ai-reply-status').count() > 0);
    await waitReply(p, count(before, 'assistant'));
    assert.equal(await p.locator('.office-ai-reply-status').count(), 0);
    assert.match(await p.locator('.office-ai-preview-messages').innerText(), /月度预算提醒/);
    assert.equal((await snapshot(p)).messages.at(-1).simulated, true);
    await shot(p, '02-text-and-ai-reply.png');
    before = await snapshot(p); await hold(p, '.office-voice-button'); await release(p);
    assert.equal(count(await snapshot(p), 'user'), count(before, 'user') + 1);
    assert.match((await snapshot(p)).messages.at(-1).text, /预算提醒/);
    await waitReply(p, count(before, 'assistant'));
    await shot(p, '03-voice-and-ai-reply.png');
    const bounds = await p.locator('.mobile-independent-shell').evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth }));
    assert(bounds.scrollWidth <= bounds.width + 1, 'Horizontal overflow: ' + JSON.stringify(bounds));
    return { screenshots: 3, replyDelay: '约 800 ms', microphoneRequests: 0, ...bounds };
  });

  await check('AI 与网页预览分别放大到正确窗口，返回保留主题与文字草稿', async p => {
    await p.locator('#office-native-input').fill('请保留这一条待发送意见。');
    for (const kind of ['ai', 'web']) {
      await click(p, 'office-preview-kind:' + kind); assert.equal(await p.locator('.office-native-preview').getAttribute('data-preview-kind'), kind);
      assert.equal(await p.locator(kind === 'ai' ? '.office-ai-preview' : '.office-preview-browser').count(), 1);
      await click(p, 'office-preview-expand'); await p.waitForFunction(() => s.page === 'session' && !s.modal);
      assert.equal((await selected(p)).capture, kind === 'ai' ? 'vscode' : 'browser');
      await click(p, 'office-back'); assert.equal((await selected(p)).page, 'office-native'); assert.equal((await selected(p)).thread, 'plan');
      assert.equal(await p.locator('#office-native-input').inputValue(), '请保留这一条待发送意见。');
    }
    return { ai: 'vscode', web: 'browser', restoredThread: 'plan' };
  });

  await check('输入区短按仅聚焦；长按转写发送，保留既有文字草稿，重复松手不重复发送', async p => {
    let before = await snapshot(p); await p.locator('#office-native-input').click(); await p.waitForTimeout(450);
    assert.equal(await p.locator('#office-native-input').evaluate(el => el === document.activeElement), true);
    assert.equal(count(await snapshot(p), 'user'), count(before, 'user'));
    await p.locator('#office-native-input').fill('周末再整理预算分类。'); before = await snapshot(p);
    await hold(p); await release(p); await p.mouse.up();
    assert.equal(count(await snapshot(p), 'user'), count(before, 'user') + 1);
    assert.equal(await p.locator('#office-native-input').inputValue(), '周末再整理预算分类。');
    await waitReply(p, count(before, 'assistant'));
    assert.equal(count(await snapshot(p), 'user'), count(before, 'user') + 1);
    return { typedDraftPreserved: true, voiceMessagesAfterDuplicateRelease: 1 };
  });

  await check('Esc、移出输入区、pointercancel 均取消语音且不发消息', async p => {
    const before = await snapshot(p);
    await hold(p); await p.keyboard.press('Escape'); await release(p);
    assert.equal(await p.locator('#office-native-form').getAttribute('data-speech-state'), 'idle');
    let r = await hold(p); await p.mouse.move(r.x - 8, r.y - 8); await release(p);
    await hold(p, '.office-voice-button'); await p.locator('.office-voice-button').dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' }); await release(p);
    await p.waitForTimeout(950); assert.equal(count(await snapshot(p), 'user'), count(before, 'user')); assert.equal(count(await snapshot(p), 'assistant'), count(before, 'assistant'));
    return { cancelWays: ['Escape', 'pointer leaves input', 'pointercancel'], sent: 0 };
  });

  await check('Enter 发送、Shift+Enter 换行，IME composing 或 keyCode 229 不误发', async p => {
    let before = await snapshot(p);
    await p.locator('#office-native-input').fill('请核对预算提醒。'); await p.locator('#office-native-input').press('Shift+Enter');
    assert.equal(count(await snapshot(p), 'user'), count(before, 'user')); assert.match(await p.locator('#office-native-input').inputValue(), /\n$/);
    await p.locator('#office-native-input').dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, bubbles: true, cancelable: true });
    await p.locator('#office-native-input').dispatchEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 229, bubbles: true, cancelable: true });
    assert.equal(count(await snapshot(p), 'user'), count(before, 'user'));
    await p.locator('#office-native-input').press('Enter'); assert.equal(count(await snapshot(p), 'user'), count(before, 'user') + 1); await waitReply(p, count(before, 'assistant'));
    return { normalEnter: 'sent', shiftEnter: 'newline', imeEvents: 'no send' };
  });

  await check('模拟回复进行中切换主题，取消旧回复并不污染新主题', async p => {
    const oldBefore = await snapshot(p), newBefore = await snapshot(p, 'ledger-filter');
    await p.locator('#office-native-input').fill('请继续解释预算提醒。'); await click(p, 'office-native-send');
    await click(p, 'office-native-history'); await click(p, 'office-native-select:ledger-filter');
    assert.equal((await selected(p)).thread, 'ledger-filter');
    await p.waitForTimeout(1000);
    assert.deepEqual((await snapshot(p, 'ledger-filter')).messages, newBefore.messages);
    assert.equal(count(await snapshot(p), 'assistant'), count(oldBefore, 'assistant'));
    assert.equal(await p.locator('.office-ai-reply-status').count(), 0);
    return { originalReply: 'cancelled', newTopicUntouched: true };
  });

  await check('录音中切换主题或离开页面，松手不向任何主题发送', async p => {
    const before = await snapshot(p), other = await snapshot(p, 'ledger-filter');
    await hold(p); await invoke(p, 'office-native-select:ledger-filter'); await release(p);
    assert.equal(count(await snapshot(p), 'user'), count(before, 'user')); assert.deepEqual((await snapshot(p, 'ledger-filter')).messages, other.messages);
    await hold(p); await invoke(p, 'office-back'); await release(p); await p.waitForTimeout(950);
    assert.deepEqual((await snapshot(p, 'ledger-filter')).messages, other.messages);
    return { switchedOrLeftWhileHolding: 'no send' };
  });

  for (const target of [['win', 'claude', 'review'], ['work', 'vscode', 'plan']]) await check('模拟回复期间切换' + (target[0] === 'win' ? '软件' : '电脑') + '，新旧会话均无迟到回复', async p => {
    const before = await snapshot(p);
    const destination = await p.evaluate(([device, app, id]) => RemoteOfficeMobile.data(device).threads.find(t => t.app === app && t.id === id).messages.map(m => ({ role: m.role, text: m.text })), target);
    await p.locator('#office-native-input').fill('请继续补充这条说明。'); await click(p, 'office-native-send');
    await invoke(p, 'office-native:' + target.join(':')); await p.waitForTimeout(1000);
    assert.equal(count(await snapshot(p), 'assistant'), count(before, 'assistant'));
    const actual = await p.evaluate(([device, app, id]) => RemoteOfficeMobile.data(device).threads.find(t => t.app === app && t.id === id).messages.map(m => ({ role: m.role, text: m.text })), target);
    assert.deepEqual(actual, destination);
    return { target, lateAssistantMessages: 0 };
  });

  await check('AI 账号切换取消旧模拟回复与录音，不串到另一账号', async p => {
    const original = await snapshot(p);
    await p.locator('#office-native-input').fill('请补充预算提醒规则。'); await click(p, 'office-native-send');
    await invoke(p, 'ai-account:manage'); await p.locator('#ai-account-device').selectOption('win'); await click(p, 'ai-account:app:vscode'); await click(p, 'ai-account:switch:secondary');
    await p.waitForTimeout(1000);
    const newId = await p.evaluate(() => RemoteOfficeMobile.data('win').threads.find(t => t.app === 'vscode').id);
    const secondary = await snapshot(p, newId); assert.equal(count(secondary, 'user'), 0); assert.equal(count(secondary, 'assistant'), 1);
    await invoke(p, 'office-native:win:vscode:' + newId); await hold(p); await invoke(p, 'ai-account:manage'); await click(p, 'ai-account:switch:primary'); await release(p); await p.waitForTimeout(950);
    assert.equal(count(await snapshot(p), 'user'), count(original, 'user') + 1); assert.equal(count(await snapshot(p), 'assistant'), count(original, 'assistant'));
    return { pendingReplyCancelled: true, primaryVoiceMessagesAdded: 0, secondaryUserMessages: 0 };
  });

  for (const mode of ['offline', 'blocked', 'view', 'closed']) await check(mode + '：禁用文字/语音，录音中失去权限不发，未完成回复不写入', async p => {
    const before = await snapshot(p);
    await p.locator('#office-native-input').fill('请检查月度预算提醒规则。'); await click(p, 'office-native-send');
    await hold(p);
    await p.evaluate(mode => { if (mode === 'offline') devices.find(d => d.id === 'win').online = false; if (mode === 'blocked') devices.find(d => d.id === 'win').blocked = true; if (mode === 'view') s.view = true; if (mode === 'closed') RemoteOfficeMobile.data('win').windows.vscode = false; render(); }, mode);
    await release(p);
    assert.equal(await p.locator('.office-voice-button').isDisabled(), true); assert.equal(await p.locator(sel('office-native-send')).isDisabled(), true); assert.equal(await p.locator('#office-native-input').getAttribute('readonly'), '');
    await invoke(p, 'office-native-send'); await p.waitForTimeout(950);
    assert.equal(count(await snapshot(p), 'user'), count(before, 'user') + 1);
    assert.equal(count(await snapshot(p), 'assistant'), count(before, 'assistant'));
    if (mode === 'closed') assert.equal(await p.locator('.office-native-preview').getAttribute('data-preview-state'), 'closed');
    return { mode, voiceCancelled: true, textBlocked: true };
  });

  await check('模拟回复期间窗口关闭，停止回复而不追加内容', async p => {
    const before = await snapshot(p); await p.locator('#office-native-input').fill('请继续梳理预算提醒。'); await click(p, 'office-native-send');
    await p.evaluate(() => { RemoteOfficeMobile.data('win').windows.vscode = false; render(); }); await p.waitForTimeout(1000);
    assert.equal(count(await snapshot(p), 'user'), count(before, 'user') + 1); assert.equal(count(await snapshot(p), 'assistant'), count(before, 'assistant'));
    return { userMessageRetained: true, delayedAssistantBlocked: true };
  });

  for (const side of ['mobile', 'mac']) await check(side + '：Claude 主列表平铺，远端软件保留最近主题且无文件夹节点', async p => {
    const mobile = side === 'mobile';
    await click(p, mobile ? 'office-device:win' : 'rom:filter:win');
    const group = p.locator((mobile ? '.office-flat-software' : '.rom-flat-software') + '[data-app="claude"]');
    assert.equal(await group.count(), 1);
    assert.equal(await group.locator('details').count(), 0);
    assert.doesNotMatch(await group.innerText(), /内容工作室/);
    const topic = mobile ? 'office-thread:win:claude:review' : 'rom:open:win-claude'; await click(p, topic); await p.waitForFunction(() => s.page === 'session' && !s.modal);
    const sidebar = p.locator(mobile ? '.office-client-claude .office-client-sidebar' : '.rom-claude-history'); assert.match(await sidebar.innerText(), /最近的/); assert.doesNotMatch(await sidebar.innerText(), /内容工作室/);
    assert.equal(await sidebar.locator(mobile ? '.office-topic-sidebar details' : '.rom-remote-folder').count(), 0);
    return { title: '最近的', folders: 0, routedTo: mobile ? 'review' : 'win-claude' };
  }, side, false);

  report.pass = report.errors.length === 0 && report.checks.every(c => c.pass);
  await browser.close();
  fs.writeFileSync(path.join(out, 'reply-voice-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pass: report.pass, checks: report.checks.length, passed: report.checks.filter(c => c.pass).length, screenshots: report.screenshots, errors: report.errors, out }, null, 2));
  if (!report.pass) process.exitCode = 1;
})().catch(async e => { report.errors.push(e.stack); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'reply-voice-results.json'), JSON.stringify(report, null, 2)); await browser?.close(); console.error(e); process.exitCode = 1; });

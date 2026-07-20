import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9337;
const demoPath = path.resolve('demos/社区/社区文章与马甲号运营后台demo.html');
const profilePath = path.resolve('.tmp/community-ops-browser-profile');

if (!fs.existsSync(edge)) {
  throw new Error(`Microsoft Edge not found: ${edge}`);
}

fs.mkdirSync(profilePath, { recursive: true });
const browser = spawn(edge, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--disable-extensions',
  '--window-size=1440,900',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profilePath}`,
  pathToFileURL(demoPath).href
], { stdio: 'ignore' });

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      const targets = await response.json();
      const target = targets.find(item => item.type === 'page' && item.url.startsWith('file:'));
      if (target) return target;
    } catch {
      // Browser is still starting.
    }
    await wait(250);
  }
  throw new Error('Timed out waiting for the Edge debugging target');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let socket;
try {
  const target = await waitForTarget();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const exceptions = [];
  let commandId = 0;

  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      exceptions.push(message.params.exceptionDetails.text);
    }
  };

  function send(method, params = {}) {
    commandId += 1;
    const id = commandId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  async function evaluate(expression) {
    const response = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.text);
    }
    return response.result.value;
  }

  await send('Runtime.enable');
  await evaluate(`new Promise(resolve => {
    if (document.readyState === 'complete') resolve(true);
    else window.addEventListener('load', () => resolve(true), { once: true });
  })`);

  const initial = await evaluate(`({
    activePage: document.querySelector('.page.active')?.id,
    identityEmpty: !document.getElementById('identity-empty').classList.contains('hidden'),
    articleRows: document.querySelectorAll('#article-table-body tr').length,
    menuItems: document.querySelectorAll('.menu-item').length
  })`);
  assert(initial.activePage === 'page-official-post', 'Content publishing page is not active on load');
  assert(initial.identityEmpty, 'Empty identity state is not visible on load');
  assert(initial.articleRows >= 4, 'Article table did not render its initial rows');

  const identity = await evaluate(`(() => {
    openIdentityPicker();
    const optionCount = document.querySelectorAll('#identity-option-list .identity-option').length;
    selectVest('10008621');
    return {
      optionCount,
      currentVestUid,
      currentVisible: !document.getElementById('identity-current').classList.contains('hidden')
    };
  })()`);
  assert(identity.optionCount === 4, 'Identity picker did not render all accounts');
  assert(identity.currentVestUid === '10008621' && identity.currentVisible, 'Enabled identity could not be selected');

  const editor = await evaluate(`(() => {
    openArticleEditor();
    document.getElementById('article-title').value = '自动化验收文章';
    document.getElementById('article-body').innerHTML = '<p>这是一段用于验证实时预览和审核提交的正文。</p>';
    document.getElementById('article-section').value = '游戏推荐';
    document.getElementById('article-topic').value = '#多人联机';
    toggleCover();
    syncArticlePreview();
    return {
      shown: document.getElementById('article-editor-workspace').classList.contains('show'),
      previewTitle: document.getElementById('preview-title').textContent,
      previewAuthor: document.getElementById('preview-author-name').textContent,
      validationErrors: validateArticle().length
    };
  })()`);
  assert(editor.shown, 'Article editor did not open');
  assert(editor.previewTitle === '自动化验收文章', 'Article title did not sync to the client preview');
  assert(editor.previewAuthor === '盖世攻略君', 'Selected identity did not sync to the client preview');
  assert(editor.validationErrors === 0, 'A complete article still has validation errors');

  const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const screenshotPath = path.resolve('.tmp/community-ops-edge/editor-page.png');
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));

  const submission = await evaluate(`(() => {
    const beforeArticles = articleRows.length;
    const beforeDrafts = draftRows.length;
    saveDraft();
    const savedDraftId = editingDraftId;
    submitArticle();
    confirmSubmitArticle();
    return {
      articleDelta: articleRows.length - beforeArticles,
      draftDelta: draftRows.length - beforeDrafts,
      firstStatus: articleRows[0].status,
      editorClosed: !document.getElementById('article-editor-workspace').classList.contains('show'),
      savedDraftId,
      latestAuditAction: auditRows[0].action
    };
  })()`);
  assert(submission.articleDelta === 1, 'Submitting a new article did not add a reviewing row');
  assert(submission.draftDelta === 0, 'Submitted temporary draft was not removed');
  assert(submission.firstStatus === 'reviewing', 'Submitted article is not in reviewing state');
  assert(submission.editorClosed, 'Editor did not close after submission');
  assert(submission.latestAuditAction === '提交审核', 'Submission was not written to the audit log');

  const pages = await evaluate(`(() => {
    const ids = ['drafts','vest-account','log','risk'];
    const state = {};
    for (const id of ids) {
      switchMenu(id, document.querySelector('[onclick*="\\'' + id + '\\'"]'), '国内');
      state[id] = document.getElementById('page-' + id).classList.contains('active');
    }
    state.vestRows = document.querySelectorAll('#vest-table-body tr').length;
    state.auditRows = document.querySelectorAll('#audit-table-body tr').length;
    state.riskRows = document.querySelectorAll('#risk-table-body tr').length;
    return state;
  })()`);
  assert(pages.drafts && pages['vest-account'] && pages.log && pages.risk, 'One or more operations pages could not be activated');
  assert(pages.vestRows >= 4 && pages.auditRows >= 4 && pages.riskRows >= 4, 'One or more operations tables did not render');

  const disabledIdentity = await evaluate(`(() => {
    const before = currentVestUid;
    selectVest('10008702');
    return { before, after: currentVestUid, result: auditRows[0].result };
  })()`);
  assert(disabledIdentity.before === disabledIdentity.after, 'Disabled identity unexpectedly became active');
  assert(disabledIdentity.result === '失败', 'Disabled identity attempt was not audited as a failure');
  assert(exceptions.length === 0, `Browser reported exceptions: ${exceptions.join('; ')}`);

  console.log('PASS: browser flow validated identity, editor, preview, draft, review, audit and risk pages');
} finally {
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();
  browser.kill();
}

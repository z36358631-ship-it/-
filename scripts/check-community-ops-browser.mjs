import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9337;
const demoPath = path.resolve('demos/社区/社区文章与马甲号运营后台demo.html');
const profilePath = path.resolve('.tmp/community-ops-browser-profile-v2');

if (!fs.existsSync(edge)) throw new Error(`Microsoft Edge not found: ${edge}`);
fs.mkdirSync(profilePath, { recursive: true });

const browser = spawn(edge, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
  '--window-size=1440,900', `--remote-debugging-port=${port}`,
  `--user-data-dir=${profilePath}`, pathToFileURL(demoPath).href
], { stdio: 'ignore' });

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function waitForTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const target = targets.find(item => item.type === 'page' && item.url.startsWith('file:'));
      if (target) return target;
    } catch {
      // Edge is still starting.
    }
    await wait(250);
  }
  throw new Error('Timed out waiting for Edge');
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
    const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  }

  await send('Runtime.enable');
  await evaluate(`new Promise(resolve => {
    if (document.readyState === 'complete') resolve(true);
    else window.addEventListener('load', () => resolve(true), { once: true });
  })`);

  const initial = await evaluate(`({
    activePage: document.querySelector('.page.active')?.id,
    hasDraft: Boolean(document.getElementById('page-drafts')),
    hasRisk: Boolean(document.getElementById('page-risk')),
    hasGlobalIdentity: Boolean(document.getElementById('acting-identity-bar')),
    articleRows: document.querySelectorAll('#article-table-body tr').length,
    vestMenu: Boolean(document.getElementById('ops-menu-vest'))
  })`);
  assert(initial.activePage === 'page-official-post', 'Content page is not active on load');
  assert(!initial.hasDraft && !initial.hasRisk && !initial.hasGlobalIdentity, 'Removed pages or global identity still render');
  assert(initial.articleRows === 4 && initial.vestMenu, 'Content list or vest menu did not render');

  const entryTypes = await evaluate(`(() => {
    const result = {};
    for (const type of ['image','article','video']) {
      openArticleEditor({type});
      result[type] = editorContentType;
      closeArticleEditor();
    }
    return result;
  })()`);
  assert(entryTypes.image === 'image' && entryTypes.article === 'article' && entryTypes.video === 'video', 'One or more publish entries opened the wrong type');

  const validation = await evaluate(`(() => {
    openArticleEditor({type:'article'});
    document.getElementById('article-title').value = '自动化验收文章';
    document.getElementById('article-body').innerHTML = '<p>用于验证发布详情内选择马甲号与复制流程。</p>';
    document.getElementById('article-section').value = '游戏推荐';
    document.getElementById('article-topic').value = '#多人联机';
    typeMediaState.article = true;
    renderTypeSpecificFields();
    submitArticle();
    return {
      editorShown: document.getElementById('article-editor-workspace').classList.contains('show'),
      vestError: document.getElementById('error-editor-vest').textContent,
      vestUid: editorVestUid,
      modalShown: document.getElementById('global-modal').classList.contains('show')
    };
  })()`);
  assert(validation.editorShown && validation.vestError.includes('请选择发布马甲号'), 'Missing vest account did not block submission inline');
  assert(validation.vestUid === null && !validation.modalShown, 'Submission opened confirmation before vest selection');

  const selected = await evaluate(`(() => {
    openEditorVestPicker();
    const optionCount = document.querySelectorAll('#editor-vest-option-list .identity-option').length;
    chooseEditorVest('10008702');
    const afterDisabled = editorVestUid;
    chooseEditorVest('10008621');
    return {
      optionCount,
      afterDisabled,
      selectedUid: editorVestUid,
      previewAuthor: document.getElementById('preview-author-name').textContent,
      validationErrors: validateArticle().length
    };
  })()`);
  assert(selected.optionCount === 4, 'Inline vest picker did not render all accounts');
  assert(selected.afterDisabled === null, 'Disabled account was selectable');
  assert(selected.selectedUid === '10008621' && selected.previewAuthor === '盖世攻略君', 'Enabled vest did not update editor and preview');
  assert(selected.validationErrors === 0, 'Complete article has validation errors');

  const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const screenshotPath = path.resolve('.tmp/community-ops-edge/editor-page-v2.png');
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));

  const submitted = await evaluate(`(() => {
    const before = articleRows.length;
    submitArticle();
    confirmSubmitArticle();
    return {
      delta: articleRows.length - before,
      id: articleRows[0].id,
      type: articleRows[0].type,
      status: articleRows[0].status,
      action: auditRows[0].action,
      editorClosed: !document.getElementById('article-editor-workspace').classList.contains('show')
    };
  })()`);
  assert(submitted.delta === 1 && submitted.type === 'article' && submitted.status === 'reviewing', 'New article did not enter reviewing state');
  assert(submitted.action === '新建并提交' && submitted.editorClosed, 'New article was not audited or editor did not close');

  const copied = await evaluate(`(() => {
    const sourceId = articleRows[0].id;
    const before = articleRows.length;
    copyArticle(sourceId);
    const copiedTitle = document.getElementById('article-title').value;
    const sourceState = {mode:editorMode, sourceId:editorSourceId, vestUid:editorVestUid};
    submitArticle();
    confirmSubmitArticle();
    return {
      delta: articleRows.length - before,
      sourceId,
      newId: articleRows[0].id,
      copiedTitle,
      sourceState,
      views: articleRows[0].views,
      likes: articleRows[0].likes,
      comments: articleRows[0].comments,
      action: auditRows[0].action
    };
  })()`);
  assert(copied.delta === 1 && copied.newId !== copied.sourceId, 'Copy submission did not generate a new content ID');
  assert(copied.copiedTitle.endsWith('（副本）') && copied.sourceState.mode === 'copy', 'Copy editor did not show copy state');
  assert(copied.views === 0 && copied.likes === 0 && copied.comments === 0 && copied.action === '复制并提交', 'Copy inherited interactions or missed its audit action');

  const tabCounts = await evaluate(`(() => {
    const counts = {};
    for (const type of ['all','image','article','video']) {
      setArticleListType(type);
      counts[type] = document.querySelectorAll('#article-table-body tr').length;
    }
    return counts;
  })()`);
  assert(tabCounts.all >= 6 && tabCounts.image >= 1 && tabCounts.article >= 1 && tabCounts.video >= 1, 'Content type tabs did not filter the list');

  const vestFlow = await evaluate(`(async () => {
    switchMenu('vest-account', document.getElementById('ops-menu-vest'), '国内');
    const initialCount = vestAccounts.length;
    const disabledButton = [...document.querySelectorAll('#vest-table-body button')].find(button => button.getAttribute('onclick')?.includes('10008702'))?.disabled;
    useVestToPublish('10008621');
    const preselected = editorVestUid;
    closeArticleEditor();
    openVestEditor();
    document.getElementById('vest-form-nickname').value = '自动化运营号';
    document.getElementById('vest-form-mark').value = '测试账号';
    document.getElementById('vest-form-note').value = '浏览器验收创建';
    saveVestAccount();
    const createdUid = editingVestUid;
    openVestEditor(createdUid);
    document.getElementById('vest-form-note').value = '浏览器验收编辑';
    saveVestAccount();
    toggleVestStatus(createdUid);
    executeModalConfirm();
    openImportVestModal();
    simulateVestImport({files:[{name:'vest-import.xlsx'}]});
    await new Promise(resolve => setTimeout(resolve, 800));
    const importResult = document.getElementById('vest-import-result').textContent;
    closeModal();
    deleteVestAccount(createdUid);
    executeModalConfirm();
    return {
      initialCount,
      finalCount: vestAccounts.length,
      disabledButton,
      preselected,
      importResult,
      latestModules: auditRows.slice(0,4).map(item => item.module)
    };
  })()`);
  assert(vestFlow.disabledButton && vestFlow.preselected === '10008621', 'Vest publish button state or preselection is wrong');
  assert(vestFlow.initialCount === vestFlow.finalCount, 'Created test account was not deleted');
  assert(vestFlow.importResult.includes('导入成功') && vestFlow.latestModules.every(item => item === '马甲号管理'), 'Vest interactions were not completed or audited');

  const auditFlow = await evaluate(`(() => {
    const id = articleRows[0].id;
    openArticleAudit(id);
    const modules = [...document.querySelectorAll('#audit-module option')].map(item => item.textContent);
    return {
      activePage: document.querySelector('.page.active')?.id,
      objectValue: document.getElementById('audit-object').value,
      visibleRows: document.querySelectorAll('#audit-table-body tr').length,
      modules,
      dataModules: [...new Set(auditRows.map(item => item.module))]
    };
  })()`);
  assert(auditFlow.activePage === 'page-log' && auditFlow.objectValue, 'Content audit link did not open and filter operation records');
  assert(auditFlow.visibleRows >= 1, 'Filtered audit table has no row');
  assert(auditFlow.modules.join('|') === '全部模块|内容发布|马甲号管理', 'Audit module filter contains removed modules');
  assert(auditFlow.dataModules.every(item => ['内容发布','马甲号管理'].includes(item)), 'Audit data contains unrelated modules');
  assert(exceptions.length === 0, `Browser reported exceptions: ${exceptions.join('; ')}`);

  console.log('PASS: browser flow validated inline vest selection, three content types, copy, vest management and audit log');
} finally {
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();
  browser.kill();
}

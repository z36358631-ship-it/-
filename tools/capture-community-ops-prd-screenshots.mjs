import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9341;
const demoPath = path.resolve('demos/社区/社区文章与马甲号运营后台demo.html');
const outputDir = path.resolve('public/prd/community-ops');
const profilePath = path.resolve('.tmp/community-ops-prd-capture-profile');

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(profilePath, { recursive: true });

const browser = spawn(edge, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--disable-extensions',
  '--window-size=1600,1000',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profilePath}`,
  pathToFileURL(demoPath).href
], { stdio: 'ignore' });

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

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
  let commandId = 0;

  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
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
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    }
    return response.result.value;
  }

  async function capture(fileName) {
    await wait(350);
    const screenshot = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false
    });
    fs.writeFileSync(path.join(outputDir, fileName), Buffer.from(screenshot.data, 'base64'));
  }

  await send('Runtime.enable');
  await evaluate(`new Promise(resolve => {
    if (document.readyState === 'complete') resolve(true);
    else window.addEventListener('load', () => resolve(true), { once: true });
  })`);

  await evaluate(`(() => {
    switchMenu('official-post', findDomesticMenu('official-post'), '国内');
    document.querySelector('.content-scroll').scrollTop = 0;
    return true;
  })()`);
  await capture('01-content-publish-list.png');

  await evaluate(`(() => {
    openArticleEditor({ type: 'article' });
    chooseEditorVest('10008621');
    document.getElementById('article-title').value = '艾尔登法环新手开荒指南';
    document.getElementById('article-body').innerHTML = '<p>从职业选择、地图探索到首个 Boss 战，整理新手开荒必看技巧。</p>';
    document.getElementById('article-section').value = '攻略资讯';
    document.getElementById('article-topic').value = '#艾尔登法环';
    typeMediaState.article = true;
    renderTypeSpecificFields();
    syncArticlePreview();
    document.getElementById('article-editor-workspace').scrollTop = 0;
    return true;
  })()`);
  await capture('02-content-editor.png');

  await evaluate(`(() => {
    closeArticleEditor();
    switchMenu('vest-account', document.getElementById('ops-menu-vest'), '国内');
    document.querySelector('.content-scroll').scrollTop = 0;
    return true;
  })()`);
  await capture('03-vest-account-management.png');

  await evaluate(`(() => {
    switchMenu('log', findDomesticMenu('log'), '国内');
    document.querySelector('.content-scroll').scrollTop = 0;
    return true;
  })()`);
  await capture('04-operation-records.png');

  console.log(`Captured 4 screenshots in ${outputDir}`);
} finally {
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();
  browser.kill();
}

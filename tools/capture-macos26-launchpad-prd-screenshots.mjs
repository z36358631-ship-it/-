import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9346;
const demoPath = path.resolve('demos/macOS26盖世全屏启动台-交互标注版.html');
const outputDir = path.resolve('prd/ai生成/macos26-launchpad-v2.6');
const profilePath = path.resolve('.tmp/macos26-launchpad-prd-capture-profile');

if (!fs.existsSync(edge)) throw new Error(`Microsoft Edge not found: ${edge}`);
if (!fs.existsSync(demoPath)) throw new Error(`Demo not found: ${demoPath}`);

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(profilePath, { recursive: true });

const browser = spawn(edge, [
  '--headless=new',
  '--disable-gpu',
  '--disable-extensions',
  '--hide-scrollbars',
  '--no-first-run',
  '--window-size=1920,1080',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profilePath}`,
  pathToFileURL(demoPath).href
], { stdio: 'ignore' });

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForTarget() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const target = targets.find(item => item.type === 'page' && item.url.startsWith('file:'));
      if (target) return target;
    } catch {
      // Edge is still starting.
    }
    await wait(250);
  }
  throw new Error('Timed out waiting for Microsoft Edge');
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
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handlers.reject(new Error(message.error.message));
    else handlers.resolve(message.result);
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

  async function capture(fileName, selector = '#demoCanvas') {
    await wait(450);
    const clip = await evaluate(`(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) throw new Error('Screenshot target not found: ${selector}');
      const rect = node.getBoundingClientRect();
      return {
        x: Math.max(0, rect.left),
        y: Math.max(0, rect.top),
        width: Math.min(innerWidth, rect.right) - Math.max(0, rect.left),
        height: Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top),
        scale: 1
      };
    })()`);
    if (clip.width <= 0 || clip.height <= 0) throw new Error(`Invalid screenshot clip for ${fileName}`);
    const screenshot = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
      clip
    });
    const output = path.join(outputDir, fileName);
    fs.writeFileSync(output, Buffer.from(screenshot.data, 'base64'));
    if (fs.statSync(output).size < 10_000) throw new Error(`Screenshot is unexpectedly small: ${output}`);
    console.log(`captured ${fileName}`);
  }

  await send('Runtime.enable');
  await evaluate(`new Promise(resolve => {
    if (document.readyState === 'complete') resolve(true);
    else window.addEventListener('load', () => resolve(true), { once: true });
  })`);

  await evaluate(`setFlow('client')`);
  await capture('01-client-entry.png');

  await evaluate(`setFlow('launchpad'); state.dockGuide=false; render()`);
  await capture('02-all-apps.png');

  await evaluate(`setFlow('search')`);
  await capture('03-search-empty.png');

  await evaluate(`setFlow('edit')`);
  await capture('04-edit-mode.png');

  await evaluate(`setFlow('folder')`);
  await capture('05-folder.png');

  await evaluate(`setFlow('launchpad'); state.dockGuide=false; state.screen='launching'; state.launchingId='app-19'; state.lastAppId='app-19'; render()`);
  await capture('06-app-launching.png');

  await evaluate(`setFlow('client'); state.clientProcess='background'; render()`);
  await capture('07-global-entry.png', '#shell');

  await evaluate(`setFlow('settings'); state.dockGuide=false; render()`);
  await capture('08-settings-sources.png');

  await evaluate(`setFlow('launchpad'); state.dockGuide=false; state.annotationTab='edge'; render(); renderNotes()`);
  await capture('09-edge-cases.png', '#shell');

  await evaluate(`setFlow('deleteConfirm')`);
  await capture('10-delete-confirm.png');

  await evaluate(`setFlow('deleteBlocked')`);
  await capture('11-delete-blocked.png');

  await evaluate(`setFlow('launchpad'); state.dockGuide=true; state.dockAdded=false; render()`);
  await capture('12-dock-guide.png');

  console.log(`Captured 12 macOS 26 launchpad PRD screenshots in ${outputDir}`);
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  browser.kill();
}

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');

const workspace = path.resolve(__dirname, '..');
const demoPath = path.join(workspace, 'demos', 'Android广告接入-交互标注版.html');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9300 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-ad-demo-smoke-'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForTarget() {
  for (let index = 0; index < 40; index += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const target = targets.find(item => item.type === 'page' && item.url.startsWith('file:'));
      if (target) return target;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Chrome DevTools target did not become ready');
}

async function runCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let sequence = 0;
  const pending = new Map();

  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handlers.reject(new Error(message.error.message));
    else handlers.resolve(message.result);
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (response.exceptionDetails) {
      const description = response.exceptionDetails.exception?.description || response.exceptionDetails.text;
      throw new Error(description);
    }
    return response.result.value;
  };

  await call('Runtime.enable');
  let ready = false;
  for (let index = 0; index < 40; index += 1) {
    ready = await evaluate(`typeof window.AdDemoApp === 'object'`);
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'Demo application did not finish loading');
  const result = {};
  result.initial = await evaluate(`({page:AdDemoApp.state.page,userNav:[...document.querySelectorAll('#leftNav [data-page]')].map(x=>x.dataset.page)})`);
  result.c1Checkin = await evaluate(`(()=>{document.querySelector('[data-action="c1-checkin"]').click();return {base:AdDemoApp.state.c1.base,dialog:!!document.querySelector('[data-checkin-state="base-awarded"]')}})()`);
  result.c1Video = await evaluate(`(()=>{document.querySelector('[data-action="c1-watch"]').click();return {kind:AdDemoApp.state.rewardAd?.kind,layer:!!document.querySelector('[data-reward-stage="video"]')}})()`);
  result.c1Fail = await evaluate(`(()=>{document.querySelector('[data-action="reward-sim-fail"]').click();return {dialog:!!document.querySelector('[data-checkin-state="base-awarded"]'),double:AdDemoApp.state.c1.double,toast:document.querySelector('.device-toast')?.textContent||''}})()`);
  result.c1Success = await evaluate(`(()=>{document.querySelector('[data-action="c1-watch"]').click();document.querySelector('[data-action="reward-sim-complete"]').click();return {double:AdDemoApp.state.c1.double,closed:AdDemoApp.state.c1.closed,dialog:!!document.querySelector('.dialog'),toast:document.querySelector('.device-toast')?.textContent||''}})()`);
  result.q1Success = await evaluate(`(()=>{AdDemoApp.state.page='Q1';AdDemoApp.render();document.querySelector('[data-action="q1-offer"]').click();document.querySelector('[data-action="q1-watch"]').click();document.querySelector('[data-action="reward-sim-complete"]').click();return {awarded:AdDemoApp.state.q1.awarded,wallet:document.querySelector('.queue-wallet')?.innerText,success:document.querySelector('.queue-success-note')?.innerText||''}})()`);
  result.m1Feedback = await evaluate(`(()=>{AdDemoApp.state.page='M1';AdDemoApp.state.orientation='landscape';AdDemoApp.render();const button=document.querySelector('[data-action="community-ad-hide"][data-placement="M1"]');const before=!!button;button?.click();return {before,hidden:AdDemoApp.state.community.hiddenAds.M1,after:!!document.querySelector('[data-placement="M1"]')}})()`);
  result.searchDefault = await evaluate(`(()=>{AdDemoApp.state.page='S3';AdDemoApp.render();return {sections:[...document.querySelectorAll('[data-placement-section]')].map(x=>x.dataset.placementSection),hotRows:document.querySelectorAll('.search-rank .search-hot-item').length,hotAds:document.querySelectorAll('.search-rank .search-native-ad').length,uniformIcons:document.querySelectorAll('.search-rank .search-hot-item:not(.search-native-ad) .rank').length}})()`);
  result.delivery = await evaluate(`(()=>{AdDemoApp.state.surface='admin';AdDemoApp.state.adminPage='delivery';AdDemoApp.state.region='cn';AdDemoApp.render();return {outerNav:document.querySelectorAll('#leftNav [data-admin-nav]').length,innerNav:document.querySelectorAll('.admin-side [data-admin-nav]').length,networks:[...new Set(AdDemoApp.state.delivery.cn.map(x=>x.network))],overseasIds:AdDemoApp.state.delivery.overseas.map(x=>x.id),resourceNav:!!document.querySelector('[data-admin-nav="resource"]')}})()`);
  result.experiment = await evaluate(`(()=>{AdDemoApp.state.adminPage='experiment';AdDemoApp.state.region='cn';AdDemoApp.render();return {rows:document.querySelectorAll('#experimentTable tbody tr').length,text:document.querySelector('#experimentTable tbody')?.innerText}})()`);
  result.overseasExperiment = await evaluate(`(()=>{AdDemoApp.state.region='overseas';AdDemoApp.render();return document.querySelector('#demoCanvas')?.innerText.includes('海外暂不接入广告 A/B')})()`);
  result.report = await evaluate(`(()=>{AdDemoApp.state.region='cn';AdDemoApp.state.adminPage='report';AdDemoApp.render();return {headers:[...document.querySelectorAll('#reportTable th')].map(x=>x.innerText),groups:document.querySelectorAll('#reportTable tbody tr').length}})()`);
  result.annotation = await evaluate(`(()=>{AdDemoApp.state.surface='user';AdDemoApp.state.page='C1';AdDemoApp.render();document.querySelector('#exceptionTab').click();document.querySelector('#badgeToggle').click();return {tab:AdDemoApp.state.annoTab,badges:AdDemoApp.state.badges,deviceClass:document.querySelector('.device').className}})()`);
  result.reset = await evaluate(`(()=>{document.querySelector('#resetDemo').click();return {page:AdDemoApp.state.page,adminPage:AdDemoApp.state.adminPage,region:AdDemoApp.state.region,badges:AdDemoApp.state.badges}})()`);

  socket.close();
  return result;
}

async function main() {
  assert(fs.existsSync(demoPath), 'Demo file is missing');
  assert(fs.existsSync(chromePath), 'Chrome is missing');
  const browser = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    pathToFileURL(demoPath).href,
  ], { windowsHide: true, stdio: 'ignore' });

  try {
    const target = await waitForTarget();
    const result = await runCdp(target.webSocketDebuggerUrl);
    console.log(JSON.stringify(result, null, 2));
    assert(result.initial.page === 'C1', 'Default user page must be C1');
    assert(result.initial.userNav.join(',') === 'C1,Q1,M1,G1,T1,S1,S2,S3', 'User navigation scope/order is incorrect');
    assert(result.c1Checkin.base && result.c1Checkin.dialog, 'C1 base reward dialog did not open');
    assert(result.c1Video.kind === 'c1' && result.c1Video.layer, 'C1 reward video did not cover the device');
    assert(result.c1Fail.dialog && !result.c1Fail.double && result.c1Fail.toast === '播放未完成，奖励未发放', 'C1 failure did not return to result dialog');
    assert(result.c1Success.double && result.c1Success.closed && !result.c1Success.dialog && result.c1Success.toast === '奖励已发放', 'C1 success callback state is incorrect');
    assert(result.q1Success.awarded && result.q1Success.wallet.includes('17 分钟') && result.q1Success.success.includes('5 分钟已到账'), 'Q1 reward did not refresh immediately');
    assert(result.m1Feedback.before && result.m1Feedback.hidden && !result.m1Feedback.after, 'M1 native negative feedback did not hide the current ad');
    assert(result.searchDefault.sections.join(',') === 'S2,S3' && result.searchDefault.hotRows === 11 && result.searchDefault.hotAds === 1 && result.searchDefault.uniformIcons === 10, 'Search default ordering or hot-search count is incorrect');
    assert(result.delivery.outerNav === 3 && result.delivery.innerNav === 3 && !result.delivery.resourceNav, 'Admin navigation must contain exactly three pages');
    assert(result.delivery.networks.includes('穿山甲') && result.delivery.networks.includes('腾讯广告'), 'Domestic network mapping is incorrect');
    assert(!result.delivery.overseasIds.some(id => ['C1', 'G1', 'Q1'].includes(id)), 'Overseas must not contain reward placements');
    assert(result.experiment.rows === 1 && result.experiment.text.includes('匿名安装 ID'), 'Domestic A/B must be one global experiment');
    assert(result.overseasExperiment, 'Overseas A/B empty state is missing');
    assert(result.report.groups === 3 && result.report.headers.join(',') === '实验分组,样本量,次日留存,7 日留存,整体付费率,口径', 'Report metric scope is incorrect');
    assert(result.annotation.tab === 'exception' && result.annotation.badges && result.annotation.deviceClass.includes('show-badges'), 'Annotation tab or badge toggle failed');
    assert(result.reset.page === 'C1' && result.reset.adminPage === 'delivery' && result.reset.region === 'cn' && !result.reset.badges, 'Reset state is incorrect');
    console.log('Android ad demo smoke test: PASS');
  } finally {
    browser.kill();
    await Promise.race([
      new Promise(resolve => browser.once('exit', resolve)),
      new Promise(resolve => setTimeout(resolve, 1200)),
    ]);
    const tempRoot = path.resolve(os.tmpdir()) + path.sep;
    const resolvedProfile = path.resolve(profile);
    if (resolvedProfile.startsWith(tempRoot)) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          fs.rmSync(resolvedProfile, { recursive: true, force: true });
          break;
        } catch (error) {
          if (attempt === 4) console.warn(`Temporary Chrome profile retained: ${resolvedProfile}`);
          else await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
    }
  }
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});

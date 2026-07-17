import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', 'Android广告接入-交互标注版.html');
const stage = process.argv[2] || 'all';
const html = fs.readFileSync(demoPath, 'utf8');

function scriptText(id) {
  const match = html.match(new RegExp(`<script[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert.ok(match, `missing script#${id}`);
  return match[1];
}

function seed() { return JSON.parse(scriptText('demo-seed')); }

function loadCore() {
  const context = { window: {}, structuredClone, console, Set, Map, Date };
  vm.createContext(context);
  vm.runInContext(scriptText('ad-demo-core'), context);
  return context.window.AdDemoCore;
}

function checkShell() {
  for (const id of ['topSurfaceSwitch','leftNav','demoCanvas','rightPanel','interactionTab','exceptionTab','badgeToggle','resetDemo','panelCollapse']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
  assert.doesNotMatch(html, /<iframe\b/i);
  assert.match(html, /用户端/);
  assert.match(html, /运营后台/);
  assert.match(html, /国内（穿山甲）/);
  assert.match(html, /海外（AdMob）/);
}

function checkCore() {
  const data = seed();
  const ids = ['H1','P1','G1','Q1','O1','D1','S1'];
  assert.deepEqual(Object.keys(data.policies.cn.placements), ids);
  assert.deepEqual(Object.keys(data.policies.overseas.placements), ids);
  const core = loadCore();
  const base = {region:'cn',userType:'old',context:'home',bucket:5,ratioRoll:0,filled:true,naturalResultCount:0,visible:true,coldStart:true,zeroTime:true,now:Date.now()};
  assert.equal(core.evaluatePlacement(core.createState(data),'H1',base).allowed,true);
  const killed=core.createState(data); killed.published.cn.globalKill=true;
  assert.equal(core.evaluatePlacement(killed,'H1',base).reason,'GLOBAL_KILL');
  assert.equal(core.evaluatePlacement(core.createState(data),'O1',{...base,userType:'new'}).reason,'AUDIENCE_MISMATCH');
  assert.equal(core.evaluatePlacement(core.createState(data),'G1',{...base,zeroTime:false}).reason,'NOT_ZERO_TIME');
  assert.equal(core.evaluatePlacement(core.createState(data),'Q1',{...base,context:'queue',freeQueue:true,paidFastChannel:false,estimatedWaitMinutes:52,userInitiated:false}).reason,'NOT_USER_INITIATED');
  assert.equal(core.evaluatePlacement(core.createState(data),'Q1',{...base,context:'queue',freeQueue:true,paidFastChannel:false,estimatedWaitMinutes:10,userInitiated:true}).reason,'WAIT_BELOW_THRESHOLD');
  assert.equal(core.evaluatePlacement(core.createState(data),'Q1',{...base,context:'queue',forbidden:true,freeQueue:true,paidFastChannel:false,estimatedWaitMinutes:52,userInitiated:true}).allowed,true);
  const q=core.createState(data);
  const granted=core.completeQueueReward(q,'reward-q1',{sessionId:'intent-q1',queueState:'QUEUING'});
  assert.equal(granted.awarded,true); assert.equal(granted.accelerationGranted,true);
  assert.equal(core.completeQueueReward(q,'reward-q1',{sessionId:'intent-q1',queueState:'QUEUING'}).awarded,false);
  const partial=core.completeQueueReward(core.createState(data),'reward-q2',{sessionId:'intent-q2',queueState:'MATCHED'});
  assert.equal(partial.result,'PARTIAL_GRANTED'); assert.equal(partial.accelerationGranted,false);
  assert.equal(core.validateExperiment({control:50,timeOnly:25,dual:25}).ok,true);
}

function checkAssets() {
  for (const key of ['home','play','detail','search']) assert.match(html,new RegExp(`"${key}":"data:image\\/jpeg;base64,`),`missing ${key}`);
  assert.doesNotMatch(html,/https?:\/\/[^"']+\.(png|jpe?g|webp)/i);
}

function checkScenes() {
  for (const id of ['H1','P1','G1','Q1','O1','D1','S1']) {
    assert.match(html,new RegExp(`function\\s+render${id}\\b`),`missing render${id}`);
  }
  for (const label of ['触发条件','展示说明','交互说明','异常&边界','看广告加速排队','权益确认中']) assert.match(html,new RegExp(label));
}

function checkAdmin() {
  for (const id of ['delivery','experiment','report']) assert.match(html,new RegExp(`data-admin-page=["']${id}["']`));
  for (const label of ['一天一次','X 天 X 次','永久一次','等待阈值','赠送时长','加速等级','G1/Q1 同会话互斥','仅加时长组','加速＋时长组','非广告用户等待']) assert.match(html,new RegExp(label));
  assert.match(html, /state\.experiments\[ui\.region\]\.q1/);
  assert.doesNotMatch(html, /state\.experiments\[ui\.region\]\.q(?:\W|$)/);
}

function checkUiSyntax() {
  for (const id of ['ad-demo-ui', 'demo-query-bootstrap']) {
    assert.doesNotThrow(
      () => new vm.Script(scriptText(id), { filename: `${id}.js` }),
      `invalid JavaScript in script#${id}`,
    );
  }
}

const checks={shell:checkShell,core:checkCore,assets:checkAssets,scenes:checkScenes,admin:checkAdmin,uiSyntax:checkUiSyntax};
for (const name of stage==='all'?Object.keys(checks):[stage]) { assert.ok(checks[name],`unknown stage ${name}`); checks[name](); console.log(`PASS ${name}`); }

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadLatestPrdFixture } from './src/prd-fixture.mjs';

const demoDir=path.dirname(fileURLToPath(import.meta.url));
const srcDir=path.join(demoDir,'src');
const repoRoot=path.resolve(demoDir,'..','..');
const read=(...parts)=>fs.readFileSync(path.join(srcDir,...parts),'utf8');
const readJson=file=>JSON.parse(read(file));
const modules=readJson('modules.json');
const moduleConfig=modules.find(item=>item.id==='02');
if(!moduleConfig)throw new Error('Developer module 02 not found');

const fixtureLoads=['01','02'].map(moduleId=>loadLatestPrdFixture({repoRoot,demoDir,moduleId}));
const routes=readJson('routes.json');
const fixture={...fixtureLoads[0].fixture,pages:Object.assign({},...fixtureLoads.map(item=>item.fixture.pages))};
const pageRoutes=moduleConfig.routeIds.map(id=>routes.find(route=>route.id===id)).filter(Boolean);
const cssFiles=['tokens.css','shell.css','components.css','templates.css'];
const runtimeFiles=['icons.js','components.js','templates.js','shell.js','app.js'];
const publisherStyleFiles=['publisher-release-regions.css','publisher-game-names.css','publisher-game-create.css','publisher-game-profile.css','publisher-game-builds.css','publisher-game-review.css','publisher-data-dashboard.css','publisher-vendor-settings.css','publisher-channel-distribution.css'];
const publisherRuntimeFiles=['publisher-storage-schema.js','publisher-access-policy.js','publisher-account-context.js','publisher-release-regions.js','publisher-game-names.js','publisher-game-create.js','publisher-game-qualifications.js','publisher-game-builds.js','publisher-game-profile.js','publisher-profile-store.js','publisher-qualification-review-store.js','publisher-qualification-review.js','publisher-game-review-store.js','publisher-game-review.js','publisher-data-dashboard.js','publisher-vendor-settings.js','publisher-channel-distribution.js'];

const stableDashboard=()=>execFileSync('git',['show','HEAD:demos/开发者后台一期/src/runtime/publisher-data-dashboard.js'],{cwd:repoRoot,encoding:'utf8'});
const publisherRuntime=publisherRuntimeFiles.map(file=>(file==='publisher-data-dashboard.js'?stableDashboard():read('runtime',file)).trim()).join('\n\n');
const runtime=runtimeFiles.map(file=>read('runtime',file).trim()).join('\n\n').replaceAll('data-demo-action','data-portal-action').replaceAll('demoAction','portalAction');
const css=[...cssFiles.map(file=>read('styles',file).trim()),...publisherStyleFiles.map(file=>read('styles',file).trim())].join('\n\n');
const escapeJson=value=>JSON.stringify(value).replaceAll('&','\\u0026').replaceAll('<','\\u003c');
const publicCopy=value=>String(value||'').replaceAll('为一个 Game 创建一期唯一 APPID','为一个 Game 创建唯一 APPID').replaceAll('一期','当前版本').replaceAll('门禁','检查项');
const publicFixture={
  accounts:Object.fromEntries(Object.entries(fixture.accounts||{}).map(([role,account])=>[role,{name:account.name,roleName:account.roleName}])),
  context:{vendorId:fixture.context?.vendorId,vendorName:fixture.context?.vendorName,gameId:fixture.context?.gameId,gameName:fixture.context?.gameName,versionId:fixture.context?.versionId,versionName:fixture.context?.versionName,appId:fixture.context?.appId,campaignId:fixture.context?.campaignId,querySnapshotId:fixture.context?.querySnapshotId},
  helpCenter:fixture.helpCenter,
  managedContent:fixture.managedContent,
  pages:Object.fromEntries(pageRoutes.map(route=>{const page=fixture.pages[route.id]||{};const value={summary:publicCopy(page.summary),status:page.status,primaryAction:page.primaryAction,primaryActionDisabled:Boolean(page.primaryActionDisabled),actions:page.actions||[]};if(page.cdkeySelfService)value.cdkeySelfService=page.cdkeySelfService;return [route.id,value];})),
};
const output='13-开发者平台与渠道分销demo.html';
const html=`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>开发者平台与渠道分销｜盖世游戏</title><style>${css}</style></head><body>
<div id="app"></div>
<textarea id="portal-module" hidden aria-hidden="true">${escapeJson(moduleConfig)}</textarea>
<textarea id="portal-modules" hidden aria-hidden="true">${escapeJson(modules)}</textarea>
<textarea id="portal-routes" hidden aria-hidden="true">${escapeJson(pageRoutes)}</textarea>
<textarea id="portal-data" hidden aria-hidden="true">${escapeJson(publicFixture)}</textarea>
<script>${publisherRuntime}\n\n${runtime}</script></body></html>`;
fs.writeFileSync(path.join(demoDir,output),html,'utf8');
process.stdout.write(`Built ${output} with the committed stable data-dashboard runtime.\n`);

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const skillDir=path.resolve(scriptDir,'..');
const workspace=path.resolve(skillDir,'..','..','..');
const assetsDir=path.join(skillDir,'assets');
const evidenceDir=path.join(workspace,'.tmp','gamehub-app-ui');
const previewPath=path.join(workspace,'demos','UI规范','盖世游戏APP-UI模板与页面配方预览.html');
const mode=process.argv[2]||'all';

function assert(condition,message){if(!condition)throw new Error(message)}
function readText(relative){const target=path.join(skillDir,relative);assert(fs.existsSync(target),`missing ${relative}`);return fs.readFileSync(target,'utf8')}
function readJson(relative){return JSON.parse(readText(relative))}
function digest(target){return crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex').toUpperCase()}
function sameJson(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function pngSize(target){const bytes=fs.readFileSync(target);assert(bytes.toString('ascii',1,4)==='PNG',`invalid PNG ${target}`);return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)]}
function exists(relative){const target=path.join(workspace,...relative.split('/'));assert(fs.existsSync(target),`missing evidence ${relative}`);return target}

function validateStructure(){
  const required=[
    'SKILL.md','agents/openai.yaml','assets/source-manifest.json','assets/screen-catalog.json','assets/figma-components.json',
    'assets/gamehub-app-tokens.css','assets/app-demo-template.html','assets/visual-baselines.json','assets/visual-report.json',
    'references/source-registry.md','references/conflict-policy.md','references/foundations.md','references/components-core.md',
    'references/components-domain.md','references/recipes-onboarding-discovery.md','references/recipes-play-library.md',
    'references/recipes-profile-landscape.md','references/recipes-figma-extensions.md','references/usage.md','references/forward-tests.md',
    'scripts/build-manifest.ps1','scripts/build-screen-catalog.mjs','scripts/build-visual-assets.py','scripts/build-preview.mjs',
    'scripts/capture-visuals.mjs','scripts/compare-visuals.py','scripts/validate.mjs'
  ];
  for(const file of required)readText(file);
  const skill=readText('SKILL.md');
  assert(skill.split('\n').length<500,'SKILL.md must stay under 500 lines');
  assert(!/TODO|TBD|fill in/i.test(skill),'SKILL.md contains placeholders');
  for(const ref of required.filter(file=>file.startsWith('references/')))assert(skill.includes(ref),`SKILL.md must link ${ref}`);
  assert(readText('agents/openai.yaml').includes('$gamehub-app-ui'),'default prompt must invoke $gamehub-app-ui');
  console.log('PASS skillStructure');
}

function validateSources(){
  const manifest=readJson('assets/source-manifest.json');
  const catalog=readJson('assets/screen-catalog.json');
  const componentCatalog=readJson('assets/figma-components.json');
  const registry=readText('references/source-registry.md');
  const figma=manifest.figma?.pages||[];
  const screens=manifest.deviceScreens||[];
  assert(figma.length===11,`expected 11 Figma pages, got ${figma.length}`);
  assert(new Set(figma.map(item=>item.id)).size===11,'duplicate Figma page id');
  assert(new Set(figma.map(item=>item.nodeId)).size===11,'duplicate Figma node id');
  for(const page of figma){assert(page.id&&page.nodeId&&page.name&&page.disposition,`incomplete Figma page ${page.id}`);assert(registry.includes(page.id)&&registry.includes(page.nodeId),`Figma source not registered: ${page.id}`)}
  assert(screens.length===45,`expected 45 device screens, got ${screens.length}`);
  assert(screens.filter(item=>item.orientation==='portrait').length===36,'expected 36 portrait screens');
  assert(screens.filter(item=>item.orientation==='landscape').length===9,'expected 9 landscape screens');
  assert(screens.map(item=>item.index).sort((a,b)=>a-b).every((value,index)=>value===index+1),'device screen sequence must be 01-45');
  for(const screen of screens){
    const target=path.join(workspace,...screen.path.split('/'));
    assert(fs.existsSync(target),`missing source image ${screen.path}`);
    assert(digest(target)===screen.sha256,`source image changed: ${screen.name}`);
    assert(registry.includes(screen.id),`device screen not registered: ${screen.id}`);
  }
  assert(catalog.schemaVersion>=2,'screen catalog schema is legacy');
  assert(catalog.screens?.length===45,'screen catalog must contain 45 pages');
  assert(catalog.counts?.portrait===36&&catalog.counts?.landscape===9,'screen catalog orientation counts are wrong');
  for(const screen of catalog.screens){assert(screen.implementationClaim===false,`${screen.id} incorrectly claims implementation`);assert(screen.sourceRole==='original-evidence',`${screen.id} source role must be original-evidence`);assert(screen.recipe&&screen.shell&&screen.status,`${screen.id} is missing page facts`)}
  const requiredComponents=['C-SHELL-P','C-SHELL-L','C-TOPBAR','C-NAV-P','C-NAV-L','C-BUTTON-GLOW','C-BUTTON-SECONDARY','C-TAB','C-INPUT-SEARCH','C-DIALOG','C-SHEET','C-FEEDBACK','D-GAME-CARD','D-PLATFORM-BADGE','D-ACCOUNT-CARD','D-ENGINE-META'];
  assert(componentCatalog.components?.length>=16,'component catalog must contain at least 16 entries');
  const componentIds=new Set(componentCatalog.components.map(item=>item.id));
  for(const id of requiredComponents)assert(componentIds.has(id),`component catalog missing ${id}`);
  for(const component of componentCatalog.components){assert(['measured','derived','missing-source'].includes(component.status),`invalid component status ${component.id}`);assert(component.sourceRefs?.length>0,`component source refs missing ${component.id}`)}
  console.log('PASS figmaCoverage (11/11)');
  console.log('PASS deviceImageCoverage (45/45; portrait 36, landscape 9)');
  console.log(`PASS componentCatalog (${componentCatalog.components.length})`);
}

function validatePreviewStatic(){
  assert(fs.existsSync(previewPath),'preview missing; run build-preview.mjs');
  const template=readText('assets/app-demo-template.html');
  const html=fs.readFileSync(previewPath,'utf8');
  assert(!/<iframe\b/i.test(template),'template contains iframe');
  assert(!/<canvas\b/i.test(template),'template contains canvas');
  assert(!/(src|href)=["']https?:\/\//i.test(template),'template contains remote asset');
  assert(!/cdnjs|unpkg|jsdelivr|fonts\.googleapis/i.test(template),'template contains CDN');
  assert(!/[\u{1F300}-\u{1FAFF}]/u.test(template),'template contains emoji icon');
  assert(!/__[A-Z0-9_]+__/.test(html),'generated preview contains unresolved token');
  assert(!/(src|href)=["']https?:\/\//i.test(html),'generated preview contains remote asset');
  for(const workspaceName of ['facts','components','evidence','usage'])assert(template.includes(`data-workspace="${workspaceName}"`),`preview missing ${workspaceName} workspace`);
  for(const label of ['页面事实','组件展厅','回归证据','使用方法','原稿证据 · 非实现','50% 叠加','差异','热图'])assert(template.includes(label),`preview missing label: ${label}`);
  assert(template.includes('component-compare')&&template.includes('原稿证据')&&template.includes('实现与状态'),'component showroom must separate source and implementation');
  assert(template.includes('window.GameHubUI'),'preview API missing');
  assert(html.includes('data:image/')&&html.includes('data:font/'),'preview must embed local assets and fonts');
  console.log('PASS offlinePreviewStatic');
}

function validateVisualIntegrity(){
  const config=readJson('assets/visual-baselines.json');
  const report=readJson('assets/visual-report.json');
  const mediaManifest=readJson('assets/visual-sources/media-manifest.json');
  const compareSource=readText('scripts/compare-visuals.py');
  assert(config.schemaVersion>=4,'visual baseline schema must be >=4');
  assert(report.schemaVersion>=4,'visual report schema must be >=4');
  assert(config.thresholds.rgb>=.95&&config.thresholds.edge>=.95&&config.thresholds.structure>=.95,'RGB/edge/structure thresholds must be >=95%');
  assert(config.thresholds.geometryTolerancePx<=2,'geometry tolerance must be <=2px');
  assert(config.thresholds.deltaE2000P95<=3,'deltaE threshold must be <=3');
  assert(!/GaussianBlur|gaussian_filter|resize\s*\(|thumbnail\s*\(|\b180\b/i.test(compareSource),'comparison script contains legacy blur/downsample path');
  assert(/gaussian_weights=False/.test(compareSource),'SSIM must use uniform windows');
  assert(/canny\([^\n]+sigma=0\.0/.test(compareSource),'edge comparison must be full-resolution Canny without smoothing');
  assert(sameJson(report.thresholds,config.thresholds),'visual report thresholds differ from baseline');
  assert(report.pages?.length===config.pages.length,'visual report page count mismatch');
  let expectedAssets=0;
  for(const page of config.pages){
    assert(['dom-only','dom-with-source-icons','dom-with-source-media','dom-with-media-crops'].includes(page.mode),`unsupported implementation mode ${page.mode}`);
    assert(page.components?.length>0,`components missing ${page.key}`);
    assert(['pending','pass','fail'].includes(page.manualReview?.status),`invalid manual review state ${page.key}`);
    const original=path.join(assetsDir,'visual-sources',`${page.key}-original.webp`);
    assert(fs.existsSync(original),`original evidence missing ${page.key}`);
    expectedAssets++;
    for(const [mediaKey,box] of Object.entries(page.media||{})){
      const [x1,y1,x2,y2]=box;
      assert(x1>=0&&y1>=0&&x2<=page.width&&y2<=page.height&&x2>x1&&y2>y1,`invalid media crop ${page.key}/${mediaKey}`);
      assert((x2-x1)*(y2-y1)<page.width*page.height,`whole-page media crop forbidden ${page.key}/${mediaKey}`);
      assert(fs.existsSync(path.join(assetsDir,'visual-sources',`${page.key}--${mediaKey}.webp`)),`media crop missing ${page.key}/${mediaKey}`);
      expectedAssets++;
    }
    const row=report.pages.find(item=>item.key===page.key);
    assert(row,`visual report missing ${page.key}`);
    assert(row.canvas[0]===page.width&&row.canvas[1]===page.height,`report canvas mismatch ${page.key}`);
    for(const field of ['original','implementation','overlay','difference','heatmap'])exists(row[field]);
    const geometry=JSON.parse(fs.readFileSync(exists(row.geometry),'utf8'));
    assert(geometry.tolerancePx<=2,`geometry tolerance too loose ${page.key}`);
    assert(geometry.components.length===page.components.length,`geometry component count mismatch ${page.key}`);
    for(const component of row.components){exists(component.implementation);exists(component.difference);assert(component.geometry&&Array.isArray(component.geometry.errors),`component geometry missing ${page.key}/${component.id}`)}
    assert(Array.isArray(row.failureReasons),`failure reasons missing ${page.key}`);
  }
  assert(mediaManifest.assets?.length===expectedAssets,`expected ${expectedAssets} immutable assets, got ${mediaManifest.assets?.length||0}`);
  for(const asset of mediaManifest.assets){const target=path.join(assetsDir,'visual-sources',asset.file);assert(fs.existsSync(target),`visual asset missing ${asset.file}`);assert(digest(target)===asset.sha256.toUpperCase(),`visual asset changed ${asset.key}`)}
  if(report.passed)assert(report.automaticPassed&&report.pages.every(page=>page.manualReview.status==='pass'),'passing report must pass automatic and manual gates');
  console.log(`PASS visualEvidenceIntegrity (${config.pages.length} pages, ${expectedAssets} immutable assets)`);
  console.log(`STATUS visualFidelity ${report.passed?'PASS':'FAIL / pending'} (not masked by integrity validation)`);
}

function validateFidelity(){
  const report=readJson('assets/visual-report.json');
  assert(report.automaticPassed===true,'strict automatic visual gates are not all passing');
  assert(report.pages.every(page=>page.manualReview.status==='pass'),'manual review is not complete');
  assert(report.passed===true,'visual report is not passing');
  console.log(`PASS visualFidelity (${report.pages.length}/${report.pages.length})`);
}

async function validateBrowser(){
  const {chromium}=await import('playwright-core');
  const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  assert(executablePath,'Chrome/Edge executable not found');
  const browser=await chromium.launch({headless:true,executablePath});
  const errors=[];const remote=[];
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>/^https?:/i.test(request.url())&&remote.push(request.url()));
    await page.goto(pathToFileURL(previewPath).href,{waitUntil:'load',timeout:120000});
    await page.waitForFunction(()=>window.GameHubUI&&document.fonts.status==='loaded',null,{timeout:120000});
    assert(await page.locator('[data-workspace]').count()===4,'workspace tab count mismatch');
    assert(await page.locator('.nav-item').count()===45,'page fact list must show 45 pages');
    await page.locator('[data-workspace="components"]').click();
    assert(await page.locator('.nav-item').count()===16,'component list must show 16 components');
    await page.locator('.nav-item[data-id="C-BUTTON-GLOW"]').click();
    assert(await page.locator('.component-compare').isVisible(),'component source/implementation comparison missing');
    assert(await page.locator('.component-source-image').isVisible(),'component source specimen missing');
    assert(await page.locator('.component-live-frame').isVisible(),'strict DOM specimen missing');
    await page.getByRole('button',{name:'disabled',exact:true}).click();
    assert(await page.locator('.component-generic-host').isVisible(),'component state switching failed');
    await page.locator('[data-workspace="evidence"]').click();
    assert(await page.locator('.nav-item').count()===2,'strict evidence list count mismatch');
    for(const name of ['原稿','实现','50% 叠加','差异','热图']){
      await page.getByRole('button',{name,exact:true}).click();
      assert(await page.locator('.evidence-viewport').isVisible(),`evidence mode failed ${name}`);
    }
    await page.locator('[data-workspace="usage"]').click();
    assert(await page.locator('.usage').isVisible(),'usage workspace missing');
    assert(errors.length===0,`page errors: ${errors.join('; ')}`);
    assert(remote.length===0,`remote requests: ${remote.join('; ')}`);
    fs.mkdirSync(evidenceDir,{recursive:true});
    await page.screenshot({path:path.join(evidenceDir,'preview-final.png'),fullPage:false,animations:'disabled'});
  }finally{await browser.close()}
  console.log('PASS browserRuntime (0 pageerror, 0 remote request)');
}

async function run(){
  if(mode==='all'||mode==='static')validateStructure();
  if(mode==='all'||mode==='sources')validateSources();
  if(mode==='all'||mode==='static')validatePreviewStatic();
  if(mode==='all'||mode==='visual')validateVisualIntegrity();
  if(mode==='all'||mode==='browser')await validateBrowser();
  if(mode==='fidelity')validateFidelity();
}

run().catch(error=>{console.error(`FAIL ${error.message}`);process.exitCode=1});

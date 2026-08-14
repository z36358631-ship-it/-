import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(scriptDir, '..');
const workspace = path.resolve(skillDir, '..', '..', '..');
const manifestPath = path.join(skillDir, 'assets', 'source-manifest.json');
const visualConfigPath = path.join(skillDir, 'assets', 'visual-baselines.json');
const visualReportPath = path.join(skillDir, 'assets', 'visual-report.json');
const visualManifestPath = path.join(skillDir, 'assets', 'visual-sources', 'media-manifest.json');
const visualSourceDir = path.join(skillDir, 'assets', 'visual-sources');
const previewPath = path.join(workspace, 'demos', 'UI规范', '盖世游戏APP-UI模板与页面配方预览.html');
const evidenceDir = path.join(workspace, '.tmp', 'gamehub-app-ui');
const mode = process.argv[2] || 'all';

function assert(condition, message) { if (!condition) throw new Error(message); }
function readText(relative) { const target=path.join(skillDir,relative); assert(fs.existsSync(target),`missing ${relative}`); return fs.readFileSync(target,'utf8'); }
function readManifest() { assert(fs.existsSync(manifestPath),'source manifest missing; run build-manifest.ps1'); return JSON.parse(fs.readFileSync(manifestPath,'utf8')); }
function readJson(target,message) { assert(fs.existsSync(target),message); return JSON.parse(fs.readFileSync(target,'utf8')); }
function readPngSize(target) { const bytes=fs.readFileSync(target); assert(bytes.toString('ascii',1,4)==='PNG',`invalid PNG ${target}`); return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)]; }

function validateFigmaCoverage(manifest) {
  const pages=manifest.figma?.pages||[]; assert(pages.length===11,`expected 11 Figma pages, got ${pages.length}`);
  assert(new Set(pages.map(p=>p.id)).size===11,'duplicate Figma page id'); assert(new Set(pages.map(p=>p.nodeId)).size===11,'duplicate Figma node id');
  for(const page of pages){assert(page.name&&page.nodeId&&page.disposition,`incomplete Figma page ${page.id}`);assert(page.representativeLayers?.length>0,`missing representative layers: ${page.name}`)}
  console.log('PASS figmaCoverage (11/11)');
}

function validateDeviceCoverage(manifest) {
  const screens=manifest.deviceScreens||[]; assert(screens.length===45,`expected 45 device screens, got ${screens.length}`); assert(new Set(screens.map(s=>s.id)).size===45,'duplicate device screen id');
  assert(screens.map(s=>s.index).sort((a,b)=>a-b).every((v,i)=>v===i+1),'device screen sequence must be 01-45');
  for(const screen of screens){const target=path.join(workspace,...screen.path.split('/'));assert(fs.existsSync(target),`missing source image ${screen.path}`);const digest=crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex').toUpperCase();assert(digest===screen.sha256,`source image changed: ${screen.name}`);assert(screen.width>0&&screen.height>0&&screen.orientation&&screen.category,`incomplete screen ${screen.id}`)}
  assert(screens.filter(s=>s.orientation==='portrait').length===36,'expected 36 portrait screens'); assert(screens.filter(s=>s.orientation==='landscape').length===9,'expected 9 landscape screens');
  console.log('PASS deviceImageCoverage (45/45)');
}

function validateStructure() {
  const required=['SKILL.md','agents/openai.yaml','assets/gamehub-app-tokens.css','assets/app-demo-template.html','references/source-registry.md','references/conflict-policy.md','references/foundations.md','references/components-core.md','references/components-domain.md','references/recipes-onboarding-discovery.md','references/recipes-play-library.md','references/recipes-profile-landscape.md','references/recipes-figma-extensions.md','references/usage.md','references/forward-tests.md','scripts/build-preview.mjs'];
  for(const file of required)readText(file); const skill=readText('SKILL.md'); assert(!/TODO|TBD|fill in/i.test(skill),'SKILL.md contains placeholders'); assert(skill.split('\n').length<500,'SKILL.md must stay under 500 lines'); assert(readText('agents/openai.yaml').includes('$gamehub-app-ui'),'default prompt must invoke $gamehub-app-ui');
  for(const ref of required.filter(f=>f.startsWith('references/')))assert(skill.includes(ref)||ref.endsWith('forward-tests.md')&&skill.includes('references/forward-tests.md'),`SKILL.md must directly link ${ref}`);
  console.log('PASS skillStructure');
}

function validateTraceability(manifest) {
  const references=fs.readdirSync(path.join(skillDir,'references')).filter(n=>n.endsWith('.md')).map(n=>fs.readFileSync(path.join(skillDir,'references',n),'utf8')).join('\n');
  for(const page of manifest.figma.pages)assert(references.includes(page.nodeId)&&references.includes(page.id),`Figma page not referenced: ${page.name}`); for(const screen of manifest.deviceScreens)assert(references.includes(screen.id),`device screen not referenced: ${screen.name}`); console.log('PASS sourceTraceability');
}

function validateCatalogs(manifest) {
  const components=readText('references/components-core.md')+'\n'+readText('references/components-domain.md'); const recipes=['references/recipes-onboarding-discovery.md','references/recipes-play-library.md','references/recipes-profile-landscape.md','references/recipes-figma-extensions.md'].map(readText).join('\n');
  for(const keyword of ['Anatomy','Variants','States','Events','Source refs'])assert(components.includes(keyword),`component catalog missing ${keyword}`);
  for(const id of ['C-SHELL-P','C-SHELL-L','C-BUTTON','C-DIALOG','C-SHEET','C-FEEDBACK','D-GAME-CARD','D-SEARCH-RESULT','D-PLATFORM-ENTRY','D-ACCOUNT-CARD','D-DETAIL-HERO'])assert(components.includes(id),`component catalog missing ${id}`);
  for(const screen of manifest.deviceScreens)assert(recipes.includes(screen.id),`recipe catalog missing ${screen.id}`); for(const page of manifest.figma.pages)assert(recipes.includes(page.id),`Figma recipe catalog missing ${page.id}`);
  console.log('PASS componentCatalog'); console.log('PASS pageRecipes');
}

function validateOrientationRules() {
  const foundations=readText('references/foundations.md'),skill=readText('SKILL.md'),preview=readText('assets/app-demo-template.html'),config=readJson(visualConfigPath,'visual baseline missing');
  for(const term of ['402×874','874×402','不整体缩放','不复用竖屏底部导航'])assert(foundations.includes(term)||skill.includes(term),`orientation rule missing ${term}`);
  assert(config.pages.some(p=>p.orientation==='portrait')&&config.pages.some(p=>p.orientation==='landscape'),'visual baseline must include portrait and landscape pages');
  assert(preview.includes('device.className=`device ${p.orientation}`'),'preview lacks independent orientation routing');
  assert(!/transform\s*:\s*[^;]*(rotate|scale)/i.test(preview),'preview must not rotate or scale one orientation into another');
  console.log('PASS orientationRules');
}

function validateConflictPolicy() { const policy=readText('references/conflict-policy.md'); for(const term of ['用户明确确认','同版本实机图','最新有效 Figma','废弃页','置信度','冲突记录格式','screen-23','screen-42'])assert(policy.includes(term),`conflict policy missing ${term}`); console.log('PASS conflictPolicy'); }

function validateForwardPrompts() { const usage=readText('references/usage.md'),report=readText('references/forward-tests.md'); for(const term of ['游戏库首页横竖两版','GOG 已绑定账号卡','搜索结果横竖版','掌机横屏游戏详情页','离线组件展厅'])assert(usage.includes(term),`usage missing forward prompt: ${term}`); for(const id of ['FT-01','FT-02','FT-03','FT-04','FT-05'])assert(report.includes(id),`forward report missing ${id}`); for(const rule of ['EPIC 与导入游戏之间','不显示账号价值','暂无评分','不新增 GOG 启动','加载/空/失败'])assert(report.includes(rule),`forward report missing expected rule: ${rule}`); console.log('PASS forwardPrompts (5/5)'); }

function validateOfflinePreview() {
  assert(fs.existsSync(previewPath),'preview missing; run build-preview.mjs');
  const html=fs.readFileSync(previewPath,'utf8'),template=readText('assets/app-demo-template.html'),config=readJson(visualConfigPath,'visual baseline missing');
  assert(!/<iframe\b/i.test(html),'preview must not use iframe');
  assert(!/(src|href)=["']https?:\/\//i.test(html),'preview contains remote dependency');
  assert(!/cdnjs|unpkg|jsdelivr|fonts\.googleapis/i.test(template),'preview contains CDN dependency');
  assert(!/[\u{1F300}-\u{1FAFF}]/u.test(template),'preview contains emoji instead of product icon');
  assert(!/<canvas\b/i.test(template),'implementation must not replay the source through canvas');
  assert((template.match(/class="nav(?: active)?" data-page=/g)||[]).length===config.pages.length,'preview page catalog does not match visual baseline');
  for(const evidenceMode of ['original','implementation','difference'])assert(template.includes(`data-mode="${evidenceMode}"`),`preview missing ${evidenceMode} evidence mode`);
  assert(template.includes('data-page-root')&&template.includes('data-component-id'),'preview lacks real DOM component root');
  assert((template.match(/:original`\]/g)||[]).length===1,'original screenshot may only feed the independent original evidence view');
  console.log('PASS offlinePreview');
}

function validateVisualAssets() {
  const config=readJson(visualConfigPath,'visual baseline missing');
  const manifest=readJson(visualManifestPath,'visual media manifest missing; run build-visual-assets.py');
  assert(config.pageThreshold>=0.95&&config.componentThreshold>=0.95,'visual thresholds must be at least 95%');
  let expected=0;
  for(const page of config.pages){
    assert(['dom-only','dom-with-media-crops'].includes(page.mode),`unsupported implementation mode: ${page.key}`);
    assert(page.components?.length>0,`components missing: ${page.key}`);
    const original=path.join(visualSourceDir,`${page.key}-original.webp`);
    assert(fs.existsSync(original),`original evidence missing: ${page.key}`);
    expected++;
    for(const [mediaKey,box] of Object.entries(page.media||{})){
      const [x1,y1,x2,y2]=box;
      assert(x1>=0&&y1>=0&&x2<=page.width&&y2<=page.height&&x2>x1&&y2>y1,`invalid media crop: ${page.key}/${mediaKey}`);
      assert((x2-x1)*(y2-y1)<page.width*page.height,`whole-page media crop forbidden: ${page.key}/${mediaKey}`);
      assert(fs.existsSync(path.join(visualSourceDir,`${page.key}--${mediaKey}.webp`)),`media crop missing: ${page.key}/${mediaKey}`);
      expected++;
    }
  }
  assert(manifest.assets?.length===expected,`visual manifest expected ${expected} assets, got ${manifest.assets?.length||0}`);
  for(const asset of manifest.assets){
    const target=path.join(visualSourceDir,asset.file);
    const digest=crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    assert(digest===asset.sha256,`visual asset changed: ${asset.key}`);
  }
  console.log(`PASS visualAssets (${config.pages.length} pages, ${expected} immutable assets)`);
}

function validateVisualCaptures() {
  const config=readJson(visualConfigPath,'visual baseline missing');
  let components=0;
  for(const page of config.pages){
    const pageCapture=path.join(evidenceDir,'visual-captures',`${page.key}-implementation.png`);
    assert(fs.existsSync(pageCapture),`visual capture missing: ${page.key}`);
    assert(readPngSize(pageCapture).join('x')===`${page.width}x${page.height}`,`visual capture size mismatch: ${page.key}`);
    assert(fs.existsSync(path.join(evidenceDir,'visual-diffs',`${page.key}-difference.png`)),`page difference missing: ${page.key}`);
    for(const component of page.components){
      components++;
      const [x1,y1,x2,y2]=component.box;
      const capture=path.join(evidenceDir,'component-captures',`${page.key}--${component.id}.png`);
      const diff=path.join(evidenceDir,'component-diffs',`${page.key}--${component.id}-difference.png`);
      assert(fs.existsSync(capture)&&fs.existsSync(diff),`component evidence missing: ${page.key}/${component.id}`);
      assert(readPngSize(capture).join('x')===`${x2-x1}x${y2-y1}`,`component capture size mismatch: ${page.key}/${component.id}`);
    }
  }
  console.log(`PASS visualCaptures (${config.pages.length} pages, ${components} components)`);
}

function validateVisualFidelity() {
  const report=readJson(visualReportPath,'visual report missing; run compare-visuals.py');
  const config=readJson(visualConfigPath,'visual baseline missing');
  assert(report.passed===true,'visual report is not passing');
  assert(report.pageThreshold===config.pageThreshold&&report.componentThreshold===config.componentThreshold,'visual report thresholds do not match baseline');
  assert(report.pages?.length===config.pages.length,'visual report page count mismatch');
  for(const page of report.pages){
    assert(page.passed&&page.score>=config.pageThreshold,`page below 95%: ${page.key}`);
    for(const component of page.components||[])assert(component.passed&&component.score>=config.componentThreshold,`component below 95%: ${page.key}/${component.id}`);
  }
  console.log(`PASS visualFidelity (${report.pages.length}/${config.pages.length}, page average ${(report.average*100).toFixed(2)}%, component average ${(report.componentAverage*100).toFixed(2)}%)`);
}

async function validateBrowser() {
  const {chromium}=await import('playwright-core');
  const candidates=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
  const executablePath=candidates.find(fs.existsSync);
  assert(executablePath,'Chrome/Edge executable not found');
  fs.mkdirSync(evidenceDir,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath});
  const config=readJson(visualConfigPath,'visual baseline missing');
  let componentChecks=0;
  try{
    const page=await browser.newPage({viewport:{width:3200,height:2500}}),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{/^https?:/.test(r.url())&&requests.push(r.url())});
    await page.goto(pathToFileURL(previewPath).href);
    await page.waitForFunction(()=>window.GameHubVisual&&document.fonts.status==='loaded');
    assert(await page.locator('[data-page]').count()===config.pages.length,'preview page navigation count mismatch');
    for(const item of config.pages){
      await page.locator(`[data-page="${item.key}"]`).click();
      await page.waitForFunction(key=>window.GameHubVisual.current===key,item.key);
      assert(await page.locator('[data-page-root]').getAttribute('data-rendered-page')===item.key,`navigation failed: ${item.key}`);
      for(const component of item.components){
        assert(await page.locator(`[data-component-id="${component.id}"]`).count()>0,`component DOM missing: ${item.key}/${component.id}`);
        componentChecks++;
      }
    }
    for(const evidenceMode of ['original','implementation','difference']){
      await page.locator(`[data-mode="${evidenceMode}"]`).click();
      assert(await page.locator(`[data-${evidenceMode}]`).isVisible(),`evidence switch failed: ${evidenceMode}`);
    }
    await page.locator('#openDialog').click();
    assert(await page.locator('[data-demo-dialog]').isVisible(),'dialog did not open');
    await page.locator('#cancelDialog').click();
    assert(!(await page.locator('[data-demo-dialog]').isVisible()),'dialog did not close');
    assert(errors.length===0,`page errors: ${errors.join('; ')}`);
    assert(requests.length===0,`remote requests: ${requests.join('; ')}`);
  }finally{
    await browser.close();
  }
  console.log(`PASS componentDomCoverage (${componentChecks} checks)`);
  console.log('PASS browserRuntime');
}

async function run(){const manifest=readManifest();if(mode==='all'||mode==='sources'){validateFigmaCoverage(manifest);validateDeviceCoverage(manifest);validateTraceability(manifest)}if(mode==='all'||mode==='static'){validateStructure();validateCatalogs(manifest);validateOrientationRules();validateConflictPolicy();validateForwardPrompts();validateOfflinePreview()}if(mode==='all'||mode==='visual'){validateVisualAssets();validateVisualCaptures();validateVisualFidelity()}if(mode==='all'||mode==='browser')await validateBrowser()}
run().catch(error=>{console.error(`FAIL ${error.message}`);process.exitCode=1});

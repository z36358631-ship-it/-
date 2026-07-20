const fs=require('fs');
const path=require('path');
const file=path.resolve(__dirname,'..','demos','macOS26盖世全屏启动台-交互标注版.html');
const html=fs.readFileSync(file,'utf8');
const demoDir=path.dirname(file);
const scriptMatch=html.match(/<script>([\s\S]*)<\/script>/);
let scriptSyntax=true;
try{if(!scriptMatch)throw new Error('inline script missing');new Function(scriptMatch[1])}catch(error){scriptSyntax=false;console.error(error.message)}
const checks={
  title:html.includes('macOS 26 盖世全屏启动台 - 交互标注版'),
  shell:['flow-list','demo-canvas','anno-scroll'].every(x=>html.includes(x)),
  flows:['entry','transition','scanning','games','all','search','classify','launching','external','failure','empty'].every(x=>html.includes(`id:'${x}'`)),
  annotations:['交互说明','异常&amp;边界','tag-blue','tag-green','tag-orange','tag-red'].every(x=>html.includes(x)),
  markerTabs:['data-value="interaction"','data-value="edge"','annotationTab'].every(x=>html.includes(x)),
  markerMapping:['data-annotation-id','data-annotation-ref','flashAnnotation','annotation-flash'].every(x=>html.includes(x)),
  markerKinds:['anno-item-badge global','anno-item-badge edge','anno-item-badge'].every(x=>html.includes(x)),
  markerPanel400:html.includes('grid-template-columns:220px minmax(0,1fr) 400px'),
  categories:html.includes("data-value=\"games\"")&&html.includes("data-value=\"all\""),
  search:html.includes('launcherSearch')&&html.includes("toLocaleLowerCase"),
  context:html.includes("addEventListener('contextmenu'")&&html.includes("toggle-game"),
  keyboard:['Command + F','ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Escape','Enter'].every(x=>html.includes(x)),
  outcomes:["outcome:'return'","outcome:'running'","outcome:'success'","outcome:'failure'"].every(x=>html.includes(x)),
  fullScreenReturn:['game-fullscreen','data-action="back-launcher"','返回启动台','启动台保留在后层'].every(x=>html.includes(x)),
  fullScreenStage:html.includes('demo-canvas.fullscreen-preview')&&html.includes("canvas.classList.toggle('fullscreen-preview',state.screen==='external')"),
  noLegacyExitCopy:!html.includes('确认启动成功后才退出启动台'),
  highFidelityAssets:[...html.matchAll(/assets\/macos-launcher\/[a-z-]+\.jpg/g)].length>=8,
  localAssetsExist:[...new Set([...html.matchAll(/assets\/macos-launcher\/[a-z-]+\.jpg/g)].map(match=>match[0]))].every(relative=>fs.existsSync(path.join(demoDir,...relative.split('/')))),
  noExternal:!(/https?:\/\//.test(html)),
  noPlaceholders:!(/\b(?:TODO|TBD)\b/.test(html)),
  scriptSyntax
};
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
if(failed.length){console.error('FAIL',failed.join(', '));process.exit(1)}
console.log('PASS macOS 26 launcher demo static checks');

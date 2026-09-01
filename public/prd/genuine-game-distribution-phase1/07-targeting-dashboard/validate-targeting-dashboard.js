const fs=require('fs');
const path=require('path');
const {PNG}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');

const expected={
  '07-targeting-flow.png':[2400,900],
  '07-resource-slot.png':[1080,2400],
  '07-landing-state.png':[1080,2400],
  '07-developer-campaign-list.png':[1800,1100],
  '07-campaign-editor.png':[1800,1100],
  '07-campaign-detail.png':[1800,1100],
  '07-developer-dashboard.png':[1800,1100],
  '07-ops-plan-list.png':[1800,1100],
  '07-material-review.png':[1800,1100],
  '07-audience-editor.png':[1800,1100],
  '07-placement-schedule.png':[1800,1100],
  '07-campaign-monitor.png':[1800,1100]
};
let failed=false;
for(const [name,[w,h]] of Object.entries(expected)){
  const file=path.join(__dirname,name);
  if(!fs.existsSync(file)||fs.statSync(file).size===0){console.error(`${name}: missing or empty`);failed=true;continue}
  const png=PNG.sync.read(fs.readFileSync(file));
  if(png.width!==w||png.height!==h){console.error(`${name}: ${png.width}x${png.height}, expected ${w}x${h}`);failed=true;continue}
  console.log(`${name}: ${png.width}x${png.height}, ${fs.statSync(file).size} bytes PASS`);
}
const html=fs.readFileSync(path.join(__dirname,'targeting-dashboard-screens.html'),'utf8');
for(const banned of ['lorem','TODO','ASSET_SHA_PENDING']){
  if(html.toLowerCase().includes(banned.toLowerCase())){console.error(`banned placeholder/scope text found: ${banned}`);failed=true}
}
if(failed)process.exit(1);

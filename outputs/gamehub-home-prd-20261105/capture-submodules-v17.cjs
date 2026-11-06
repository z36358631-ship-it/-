const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1200},deviceScaleFactor:2});
  await page.goto('file:///'+path.resolve('public/gamehub-home-lab/index.html').replaceAll('\\','/'));
  await page.waitForFunction(()=>window.HOME_LAB);await page.evaluate(()=>HOME_LAB.reset());
  await page.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
  const checks=[];
  const capture=async(name,selectors)=>{
   const clip=await page.evaluate(selectors=>{
    const scroller=document.querySelector('.app-body'),els=selectors.map(s=>document.querySelector(s));
    if(els.some(e=>!e))throw Error(selectors.join(','));
    scroller.scrollTop+=Math.min(...els.map(e=>e.getBoundingClientRect().top))-scroller.getBoundingClientRect().top-4;
    const bounds=els.map(e=>e.getBoundingClientRect()),body=scroller.getBoundingClientRect();
    const x=Math.min(...bounds.map(r=>r.left)),y=Math.min(...bounds.map(r=>r.top)),right=Math.max(...bounds.map(r=>r.right)),bottom=Math.max(...bounds.map(r=>r.bottom));
    return {x,y,width:right-x,height:bottom-y,visible:y>=body.top-1&&bottom<=body.bottom+1};
   },selectors);
   assert(clip.visible,name+JSON.stringify(clip));delete clip.visible;
   const file=path.join(__dirname,name+'.png');await page.screenshot({path:file,clip});
   checks.push({name,selectors,clip,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
  };
  await capture('module-banner',['.operations-slot']);
  await capture('module-shortcuts',['.home-shortcuts']);
  await capture('module-local',['[data-module="local-collections"]']);
  await capture('module-calendar-latest',['[data-module="calendar"]','[data-module="latest-compatibility"]']);
  await capture('module-community',['.community-module']);
  await capture('module-tasks',['[data-module="tasks"]']);
  await capture('module-business',['[data-module="instant"]','[data-module="team"]']);
  fs.writeFileSync(path.join(__dirname,'submodule-image-verification.json'),JSON.stringify({status:'passed',source:'Current r12 public single HTML; direct screenshot clips, no fabricated UI.',checks},null,2));
  console.log(JSON.stringify({status:'passed',images:checks.length}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto'),vm=require('vm');
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const HERE=__dirname,ROOT=path.resolve(HERE,'../../..'),EVIDENCE=path.join(HERE,'monthly-evidence');
const HTML=path.join(ROOT,'public/gamehub-home-lab/index.html');
const source=fs.readFileSync(path.join(HERE,'tasks-revision.js'),'utf8');
const css=fs.readFileSync(path.join(HERE,'tasks-revision.css'),'utf8');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const checks=[],runtimeErrors=[],externalRequests=[];
const result={status:'running',sourceMode:'built public HTML; no source injection',startedAt:new Date().toISOString(),htmlSha256:hash(fs.readFileSync(HTML)),tasksJsSha256:hash(source),tasksCssSha256:hash(css),checks,runtimeErrors,externalRequests,limits:['Local Demo records dates only. No real point award, account persistence, historical account records or task completion service is verified.','No new make-up sign-in, streak reward or month-switching behavior.']};
fs.mkdirSync(EVIDENCE,{recursive:true});
const record=(name,facts={})=>checks.push({case:name,passed:true,...facts});
const action=(label,name,attrs='',classes='')=>`<button data-action="${name}" class="${classes}" ${attrs}>${label}</button>`;
function moduleFor(state,frozenNow){
  const sandbox={window:{}};
  if(frozenNow){const RealDate=Date;sandbox.Date=class extends RealDate{static now(){return RealDate.parse(frozenNow);}};}
  vm.runInNewContext(source,sandbox);
  const module=sandbox.window.LAB_TASKS_REVISION.create({state,esc:String,action,go:name=>state.page=name,render:()=>{},getScroll:()=>0});
  return {module,state};
}
function calendarFacts(html){
  return {days:[...html.matchAll(/class="tasks-month-day [^"]*" data-date="([^"]+)"/g)].map(match=>match[1]),blanks:(html.match(/class="tasks-month-blank"/g)||[]).length,today:(html.match(/aria-current="date"/g)||[]).length};
}
async function main(){
  for(const [clock,days,offset] of [['2025-02-15T12:00:00+08:00',28,5],['2024-02-15T12:00:00+08:00',29,3],['2026-04-15T12:00:00+08:00',30,2],['2026-11-06T12:00:00+08:00',30,6],['2026-12-15T12:00:00+08:00',31,1],['2026-06-15T12:00:00+08:00',30,0]]){
    const {module}=moduleFor({signInNow:clock});const week=calendarFacts(module.renderSignIn());assert.equal(week.days.length,7);assert.equal(week.blanks,0);assert(module.renderSignIn().includes('<h2>连续签到</h2>'));module.handle('ret-calendar-toggle');const facts=calendarFacts(module.renderSignIn());
    assert.equal(facts.days.length,days,clock+' number of dates');assert.equal(facts.blanks,offset,clock+' Monday-first alignment');assert.equal(new Set(facts.days).size,days);assert.equal(facts.today,1);module.handle('ret-calendar-toggle');assert.equal(calendarFacts(module.renderSignIn()).days.length,7);
    record('actual month length and Monday-first offset',{clock,days,offset});
  }
  const state={signInNow:'2026-11-06T12:00:00+08:00',retSigned:true,pointsBalance:45,signInReward:3,page:'ret-task',retTask:'checkin'};
  let {module}=moduleFor(state);
  assert.equal(state.retSigned,false);assert.deepEqual([...state.retSignedDates],[]);
  assert(module.renderSignIn().includes('已签 <b>0</b> 天'));
  for(let n=0;n<3;n++)module.handle('ret-checkin');
  assert.equal(state.retSigned,true);assert.deepEqual([...state.retSignedDates],['2026-11-06']);assert.equal(state.pointsBalance,45);assert.equal(state.signInReward,3);
  record('old undated boolean does not invent history; same-day sign-in is idempotent and points remain unchanged');
  state.signInNow='2026-11-07T00:00:00+08:00';({module}=moduleFor(state));
  assert.equal(state.retSigned,false);assert(module.renderSignIn().includes('data-date="2026-11-06" data-status="signed"'));module.handle('ret-checkin');
  assert.deepEqual([...state.retSignedDates],['2026-11-06','2026-11-07']);
  state.signInNow='2026-12-01T00:00:00+08:00';({module}=moduleFor(state));
  assert.equal(state.retSigned,false);assert(module.renderSignIn().includes('已签 <b>0</b> 天'));assert.equal(state.retSignedDates.length,2);
  module.handle('ret-checkin');assert(module.renderSignIn().includes('已签 <b>1</b> 天'));assert.equal(state.pointsBalance,45);
  record('date and month rollover derive today status without losing or manufacturing prior records');
  const history={signInNow:'2024-02-29T12:00:00+08:00',retSignedDates:['2024-02-01','2024-02-01','2024-01-31'],retSigned:true,retCalendarExpanded:true};
  const hist=moduleFor(history).module.renderSignIn();assert.equal((hist.match(/data-status="signed"/g)||[]).length,1);assert(hist.includes('已签 <b>1</b> 天'));assert.equal(history.retSigned,false);
  record('only supplied valid dates are marked; duplicate dates do not inflate monthly totals');
  const midnight={signInNow:'2026-11-30T15:59:59Z',page:'ret-task'};let mid=moduleFor(midnight).module;mid.handle('ret-checkin');assert.deepEqual([...midnight.retSignedDates],['2026-11-30']);
  midnight.signInNow='2026-11-30T16:00:00Z';mid=moduleFor(midnight).module;assert.equal(midnight.retSigned,false);assert(mid.renderSignIn().includes('2026年12月'));mid.handle('ret-checkin');assert.deepEqual([...midnight.retSignedDates],['2026-11-30','2026-12-01']);
  record('Asia/Shanghai midnight at 16:00 UTC changes calendar day and month');
  const defaultClock=moduleFor({demoNow:'2026-11-02T10:00:00+08:00'},'2026-12-31T16:00:00Z').module.renderSignIn();assert(defaultClock.includes('2027年1月'));assert(defaultClock.includes('data-date="2027-01-01"'));
  record('real-clock fallback remains independent of the offer Demo historical demoNow');
  const boundary=moduleFor({signInNow:'2026-12-01T12:00:00+08:00',retSignedDates:['2026-11-30','2026-12-01']}).module.renderSignIn();assert.deepEqual(calendarFacts(boundary).days,['2026-11-30','2026-12-01','2026-12-02','2026-12-03','2026-12-04','2026-12-05','2026-12-06']);assert(boundary.includes('is-other-month'));assert(boundary.includes('已签 <b>1</b> 天'));record('cross-month week has seven real dates, other-month styling and current-month-only total');
  const inline=moduleFor({signInNow:'2026-11-06T12:00:00+08:00',retTask:'checkin'}).module.renderSignIn();
  assert(inline.includes('tasks-revision-tabs'));assert(inline.includes('获得更多积分'));assert(!inline.includes('tasks-revision-entry'));assert(!inline.includes('data-action="ret-task-center"'));
  record('sign-in directly includes daily/growth tasks without a more-points navigation button');

  if(process.argv.includes('--vm-only'))return;
  const built=fs.readFileSync(HTML,'utf8').replace(/\r\n/g,'\n');
  assert(built.includes(source.replace(/\r\n/g,'\n').trim()),'built HTML does not contain exact current tasks source');assert(built.includes(css.replace(/\r\n/g,'\n').trim()),'built HTML does not contain exact current tasks CSS');
  record('actual built HTML embeds the exact tested JS and CSS');
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1080},hasTouch:true});
    page.on('pageerror',error=>runtimeErrors.push(error.message));
    const target=process.env.HOME_LAB_URL||'file:///'+HTML.replaceAll('\\','/');
    page.on('request',request=>{if(/^https?:/.test(request.url())&&request.url()!==target)externalRequests.push(request.url());});
    const response=await page.goto(target,{waitUntil:'load',timeout:60000});
    if(process.env.HOME_LAB_URL){assert.equal(response.status(),200);assert.equal(hash(await response.body()),result.htmlSha256);result.sourceMode='live HTML matches built SHA256; no source injection';}
    await page.waitForFunction(()=>window.HOME_LAB);
    const api=(name,...args)=>page.evaluate(({name,args})=>HOME_LAB[name](...args),{name,args});
    const click=selector=>page.locator('.device '+selector).first().click();
    const ensure=async label=>{
      const facts=await page.evaluate(()=>{const body=document.querySelector('.app-body'),device=document.querySelector('.device'),grid=document.querySelector('.tasks-month-grid');return {windowOverflow:document.documentElement.scrollWidth>innerWidth+1,bodyOverflow:body.scrollWidth>body.clientWidth+1,deviceOverflow:device.scrollWidth>device.clientWidth+1,gridOverflow:grid.scrollWidth>grid.clientWidth+1,height:body.clientHeight};});
      assert(!facts.windowOverflow&&!facts.bodyOverflow&&!facts.deviceOverflow&&!facts.gridOverflow&&facts.height>50,label+JSON.stringify(facts));
      return facts;
    };
    for(const [clock,days,offset] of [['2025-02-15T12:00:00+08:00',28,5],['2024-02-15T12:00:00+08:00',29,3],['2026-04-15T12:00:00+08:00',30,2],['2026-12-15T12:00:00+08:00',31,1]]){
      await api('reset');await api('setScenario',{signInNow:clock});await click('.home-checkin');assert.equal(await page.locator('.tasks-month-day').count(),7);await click('[data-action="ret-calendar-toggle"]');
      assert.equal(await page.locator('.tasks-month-day').count(),days);assert.equal(await page.locator('.tasks-month-blank').count(),offset);assert.equal(await page.locator('.tasks-month-day.is-signed').count(),1);assert.equal((await api('getState')).signInNow,clock);
      record('HOME_LAB clock injection changes actual built calendar',{clock,days,offset});
    }
    for(const form of ['portrait','landscape','tablet']){
      await api('reset');await api('setScenario',{signInNow:'2026-11-06T12:00:00+08:00'});await api('setForm',form);await click('.home-checkin');
      assert.equal((await api('getState')).page,'ret-task');assert.equal(await page.locator('.tasks-revision-entry').count(),0);assert.equal(await page.locator('.tasks-revision-signin [data-action="ret-task-center"]').count(),0);
      assert.deepEqual(await page.locator('.tasks-revision-tabs button').allTextContents(),['每日任务','成长任务']);assert.equal(await page.locator('.tasks-revision-row').count(),6);
      const geometry=await ensure(form);assert.equal(await page.locator('.tasks-month-heading h2').textContent(),'连续签到');assert.equal(await page.locator('.tasks-month-day').count(),7);assert.equal(await page.locator('[data-action="ret-calendar-toggle"]').getAttribute('aria-expanded'),'false');await page.locator('.device').screenshot({path:path.join(EVIDENCE,'signin-'+form+'.png')});await click('[data-action="ret-calendar-toggle"]');assert.equal(await page.locator('.tasks-month-day').count(),30);assert.equal(await page.locator('[data-action="ret-calendar-toggle"]').getAttribute('aria-expanded'),'true');await page.locator('.device').screenshot({path:path.join(EVIDENCE,'signin-expanded-'+form+'.png')});await click('[data-action="ret-calendar-toggle"]');assert.equal(await page.locator('.tasks-month-day').count(),7);
      await page.locator('.tasks-revision-more').scrollIntoViewIfNeeded();await page.locator('.device').screenshot({path:path.join(EVIDENCE,'daily-'+form+'.png')});
      if(form==='portrait')await page.locator('.tasks-revision-more').screenshot({path:path.join(EVIDENCE,'signin-inline-daily.png')});
      await click('[data-action="ret-task-tab"][data-tab="growth"]');assert.equal((await api('getState')).page,'ret-task');assert.equal(await page.locator('.tasks-revision-empty h3').textContent(),'暂无成长任务');await ensure(form+' growth');
      await page.locator('.device').screenshot({path:path.join(EVIDENCE,'growth-'+form+'.png')});
      if(form==='portrait')await page.locator('.tasks-revision-more').screenshot({path:path.join(EVIDENCE,'signin-inline-growth.png')});
      await click('[data-action="ret-task-tab"][data-tab="daily"]');assert.equal((await api('getState')).page,'ret-task');assert.equal(await page.locator('.tasks-revision-row').count(),6);
      record('inline task tabs and monthly layout remain on sign-in page without overflow',{form,geometry});
    }
    await api('reset');await api('setScenario',{signInNow:'2026-11-06T12:00:00+08:00'});await click('.home-checkin');
    for(const [task,targetPage] of [['play','library'],['community','community'],['comment','community'],['share','community']]){
      await click(`[data-task="${task}"]`);assert.equal((await api('getState')).page,targetPage);await click('[data-action="back"]');
      assert.equal((await api('getState')).page,'ret-task');assert.equal((await api('getState')).retTask,'checkin');assert.equal(await page.locator('.tasks-month-day').count(),7);assert.equal(await page.locator('.tasks-revision-tabs').count(),1);assert.equal(await page.locator('.tasks-revision-row').count(),6);
      record('inline task destination returns to the same monthly sign-in context',{task,targetPage});
    }
    await api('reset');await api('setScenario',{signInNow:'2026-11-06T12:00:00+08:00'});await click('.home-checkin');const before=await api('getState');await click('[data-action="back"]');await click('.home-checkin');const after=await api('getState');
    assert.deepEqual(after.retSignedDates,before.retSignedDates);assert.equal(after.pointsBalance,before.pointsBalance);
    await api('setScenario',{signInNow:'2026-11-07T00:00:00+08:00'});assert.equal((await api('getState')).retSigned,false);await click('[data-action="ret-task"][data-task="checkin"]');assert.equal(await page.locator('.tasks-month-day.is-signed').count(),1);
    await api('setScenario',{signInNow:'2026-12-01T00:00:00+08:00'});assert.equal((await api('getState')).retSigned,false);await click('[data-action="ret-task"][data-task="checkin"]');assert.equal(await page.locator('.tasks-month-day.is-signed').count(),0);
    record('actual browser repeated entry and date/month changes preserve only recorded dates without changing points');
    await page.setViewportSize({width:390,height:900});await ensure('390px viewport');await page.locator('.device').screenshot({path:path.join(EVIDENCE,'signin-narrow.png')});record('390px viewport has no horizontal overflow');
    assert.deepEqual(runtimeErrors,[]);assert.deepEqual(externalRequests,[]);record('no browser runtime errors or external runtime requests');
  }finally{await browser.close();}
}
main().then(()=>{result.status=process.argv.includes('--vm-only')?'vm-only-passed':'passed';}).catch(error=>{result.status='failed';result.error=error.stack;checks.push({case:'verification failure',passed:false,error:error.message});process.exitCode=1;}).finally(()=>{result.completedAt=new Date().toISOString();fs.writeFileSync(path.join(EVIDENCE,process.argv.includes('--vm-only')?'vm-verification.json':'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,checks:checks.length,error:result.error||null,htmlSha256:result.htmlSha256,evidence:EVIDENCE}));});

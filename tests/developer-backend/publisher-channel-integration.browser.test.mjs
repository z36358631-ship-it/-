import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright-core');
const demoFile=path.resolve('demos/开发者后台一期/13-开发者平台与渠道分销demo.html');
const evidenceDir=path.resolve('tests/developer-backend/evidence/gamehub-key-channel-integrated');
const chrome=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(file=>file&&fs.existsSync(file));
let browser;
const demoUrl=route=>{const url=pathToFileURL(demoFile);url.hash=route;return url.href;};

async function openDemoState(page){
  await page.locator('.developer-demo-state-fab').click();
  await page.locator('[data-demo-state-panel]').waitFor();
}

async function switchChannelScenario(page,label){
  await openDemoState(page);
  await page.getByRole('radio',{name:label,exact:true}).click();
}

async function switchBatchScenario(page,label){
  await openDemoState(page);
  await page.getByRole('radio',{name:label,exact:true}).click();
}

async function openGame(page,{language='zh',qualificationStatus='approved'}={}){
  await page.addInitScript(({demoName,language,qualificationStatus})=>{
    if(!decodeURIComponent(location.pathname).endsWith(`/${demoName}`))return;
    localStorage.clear();sessionStorage.clear();window.name='';
    localStorage.setItem('gamehub-developer-language-v1',language);
    const accountKey=`channel:${qualificationStatus}`;
    sessionStorage.setItem('gamehub-developer-session-v2',JSON.stringify({version:2,authenticated:true,accountKey,vendorId:'VENDOR-STAR-001',activeGameId:'',qualificationStatus,expiresAt:Date.now()+28800000}));
    localStorage.setItem('gamehub-developer-account-states-v1',JSON.stringify({[accountKey]:{registration:{accountTier:qualificationStatus==='approved'?'enterprise':'registered',registeredAt:'2026-09-10 10:00',consoleTab:'games'},qualification:{status:qualificationStatus,revision:1,step:5,view:'form',form:{},history:[],submissions:[]}}}));
  },{demoName:path.basename(demoFile),language,qualificationStatus});
  await page.goto(demoUrl('/P02-01'),{waitUntil:'load'});
  await page.locator('[data-publisher-workspace]').waitFor();
  if(language==='en'&&await page.evaluate(()=>document.documentElement.lang!=='en')){
    await page.locator('[data-portal-action="toggle-interface-language"]').click();
    await page.locator('html[lang="en"]').waitFor();
  }
  await page.locator('[data-portal-action="enter-publisher-game"][data-publisher-game="existing"]').first().click();
  await page.locator('[data-publisher-game-console][data-selected-game="existing"]').waitFor();
}

before(async()=>{
  assert.ok(chrome,'Chrome or Edge not found');
  execFileSync(process.execPath,[path.resolve('demos/开发者后台一期/build-developer-channel.mjs')],{stdio:'pipe'});
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--allow-file-access-from-files','--disable-background-networking']});
});
after(async()=>browser?.close());

test('渠道入口仅对企业认证通过账号开放',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page,{qualificationStatus:'unsubmitted'});
  assert.equal(await page.getByRole('button',{name:'渠道分销',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Key 批次',exact:true}).count(),0);
  await page.close();
});

test('原开发者平台同一地址进入单游戏渠道分销',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);
  await page.getByRole('button',{name:'渠道分销',exact:true}).click();
  await page.getByRole('heading',{name:'渠道分销总览',exact:true}).waitFor();
  const currentUrl=new URL(page.url());
  assert.equal(decodeURIComponent(currentUrl.pathname).endsWith('/13-开发者平台与渠道分销demo.html'),true);
  assert.equal(currentUrl.hash,'#/P02-01');
  assert.equal(await page.locator('.publisher-game-sidebar').count(),1);
  assert.equal(await page.locator('.publisher-channel').count(),1);
  await page.close();
});

test('四个渠道页面口径一致且不含明文 Key 或 Secret',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);
  const sections=[
    ['渠道分销','渠道分销总览',['CH-001','KP-202609-001','1,282','1,268','USD 16,467.32']],
    ['Key 批次','Key 批次',['KB-202609-0008','已暴露','不可回库']],
    ['渠道数据','渠道数据',['APP-7F3A9C','BASE-GLOBAL','GH26-••••-••••-9K2Q']],
    ['收益与结算','收益与结算',['1,282','14','1,268','USD 16,467.32']],
  ];
  for(const [button,heading,tokens] of sections){
    await page.getByRole('button',{name:button,exact:true}).click();
    const panel=page.locator('.publisher-channel');await panel.getByRole('heading',{name:heading,exact:true}).waitFor();
    const body=await panel.innerText();for(const token of tokens)assert.ok(body.includes(token),`${heading} 缺少 ${token}`);
  }
  const html=await page.content();
  assert.doesNotMatch(html,/GH26-DEMO-2026-9K2Q|ghs_demo_not_a_real_secret/);
  await page.close();
});

test('渠道页面支持英文并在手机宽度无根节点溢出',async()=>{
  for(const width of [320,390]){
    const page=await browser.newPage({viewport:{width,height:844}});
    await openGame(page,{language:'en'});
    await page.getByRole('button',{name:'Channel distribution',exact:true}).click();
    await page.getByRole('heading',{name:'Channel distribution overview',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,`${width}px 根节点横向溢出`);
    await page.getByRole('button',{name:'Create Key batch',exact:true}).click();
    await page.getByRole('dialog',{name:'Create Key batch'}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,`${width}px 批次弹窗导致根节点横向溢出`);
    await page.getByRole('dialog',{name:'Create Key batch'}).getByRole('button',{name:'Close'}).click();
    await page.close();
  }
});

test('批次详情与脱敏导出均有明确反馈',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);
  await page.getByRole('button',{name:'Key 批次',exact:true}).click();
  await page.getByRole('button',{name:'查看详情',exact:true}).first().click();
  const dialog=page.getByRole('dialog',{name:'批次详情'});
  await dialog.waitFor();
  assert.match(await dialog.innerText(),/已暴露 Key 只能兑换、过期或作废/);
  await dialog.getByRole('button',{name:'关闭'}).click();
  await page.getByRole('button',{name:'渠道数据',exact:true}).click();
  await page.getByRole('button',{name:'导出数据',exact:true}).click();
  await page.getByText('数据已导出',{exact:true}).waitFor();
  await page.close();
});

test('开发者可查看授权计划并创建 Key 批次',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);
  await page.getByRole('button',{name:'渠道分销',exact:true}).click();
  await page.getByRole('button',{name:'查看计划详情',exact:true}).click();
  const plan=page.getByRole('dialog',{name:'授权计划详情'});
  await plan.waitFor();
  assert.match(await plan.innerText(),/KP-202609-001[\s\S]*单次上限[\s\S]*1,000/);
  await plan.getByRole('button',{name:'关闭'}).click();
  await page.getByRole('button',{name:'Key 批次',exact:true}).click();
  await page.getByRole('button',{name:'创建 Key 批次',exact:true}).click();
  const create=page.getByRole('dialog',{name:'创建 Key 批次'});
  await create.getByLabel('申请数量').fill('500');
  await create.getByRole('button',{name:'提交批次申请'}).click();
  await page.getByText('批次已生成',{exact:true}).waitFor();
  await page.getByRole('button',{name:'创建 Key 批次',exact:true}).click();
  const secondCreate=page.getByRole('dialog',{name:'创建 Key 批次'});
  await secondCreate.getByLabel('申请数量').fill('1001');
  await secondCreate.getByRole('button',{name:'提交批次申请'}).click();
  await secondCreate.getByText('请输入 1—1,000 的整数。',{exact:true}).waitFor();
  await secondCreate.getByLabel('申请数量').fill('300');
  await secondCreate.getByLabel('交付方式').selectOption('file');
  await secondCreate.getByRole('button',{name:'提交批次申请'}).click();
  await page.getByText('批次审核中',{exact:true}).waitFor();
  await page.close();
});

test('渠道开通和批次处理状态都可演示',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);
  await page.getByRole('button',{name:'渠道分销',exact:true}).click();
  await switchChannelScenario(page,'未开通');
  await page.getByText('邀请制渠道合作',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'创建 Key 批次',exact:true}).isDisabled(),true);
  await switchChannelScenario(page,'合作中');
  for(const [label,result,action] of [['审核中','批次审核中',''],['已拒绝','批次申请已拒绝','修改后重提'],['生成失败','批次生成失败','重试生成'],['自动生成','批次已生成','']]){
    await switchBatchScenario(page,label);
    await page.getByRole('heading',{name:'Key 批次',exact:true}).waitFor();
    await page.getByText(result,{exact:true}).waitFor();
    if(action) await page.getByRole('button',{name:action,exact:true}).waitFor();
  }
  await switchChannelScenario(page,'暂停');
  await page.getByText('授权计划已暂停',{exact:true}).waitFor();
  await page.close();
});

test('渠道交付、销售兑换、异常和开发者结算口径完整',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);
  await page.getByRole('button',{name:'渠道数据',exact:true}).click();
  for(const tab of ['交付记录','销售与兑换','异常记录']){
    await page.getByRole('tab',{name:tab,exact:true}).click();
    assert.equal(await page.getByRole('tab',{name:tab,exact:true}).getAttribute('aria-selected'),'true');
  }
  await page.getByRole('button',{name:'查看异常',exact:true}).first().click();
  await page.getByRole('dialog',{name:'异常详情'}).waitFor();
  await page.getByRole('dialog',{name:'异常详情'}).getByRole('button',{name:'关闭'}).click();
  await page.getByRole('button',{name:'收益与结算',exact:true}).click();
  const settlement=await page.locator('.publisher-channel').innerText();
  assert.match(settlement,/最终开发者应收、开票与付款由财务模块统一处理/);
  assert.doesNotMatch(settlement,/待渠道确认|固定单价/);
  await page.close();
});

test('输出桌面与手机端视觉验收图',async()=>{
  fs.mkdirSync(evidenceDir,{recursive:true});
  const shots=[
    {width:1440,height:900,button:'渠道分销',file:'channel-overview-1440.png'},
    {width:1280,height:900,button:'Key 批次',file:'channel-batches-1280.png'},
    {width:390,height:844,button:'渠道数据',file:'channel-data-390.png'},
    {width:1440,height:900,button:'收益与结算',file:'channel-settlement-1440.png'},
  ];
  for(const shot of shots){
    const page=await browser.newPage({viewport:{width:shot.width,height:shot.height}});
    await openGame(page);
    await page.getByRole('button',{name:shot.button,exact:true}).click();
    await page.locator('.publisher-channel').waitFor();
    await page.screenshot({path:path.join(evidenceDir,shot.file),fullPage:true});
    await page.close();
  }
  const planPage=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(planPage);
  await planPage.getByRole('button',{name:'渠道分销',exact:true}).click();
  await planPage.getByRole('button',{name:'查看计划详情',exact:true}).click();
  await planPage.screenshot({path:path.join(evidenceDir,'channel-plan-detail-1440.png'),fullPage:true});
  await planPage.close();

  const createPage=await browser.newPage({viewport:{width:390,height:844}});
  await openGame(createPage);
  await createPage.getByRole('button',{name:'Key 批次',exact:true}).click();
  await createPage.getByRole('button',{name:'创建 Key 批次',exact:true}).click();
  await createPage.screenshot({path:path.join(evidenceDir,'channel-batch-create-390.png'),fullPage:true});
  await createPage.close();

  for(const [label,file] of [['审核中','channel-batch-pending-1280.png'],['已拒绝','channel-batch-rejected-1280.png'],['生成失败','channel-batch-failed-1280.png']]){
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    await openGame(page);
    await page.getByRole('button',{name:'Key 批次',exact:true}).click();
    await switchBatchScenario(page,label);
    await page.screenshot({path:path.join(evidenceDir,file),fullPage:true});
    await page.close();
  }

  const anomalyPage=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(anomalyPage);
  await anomalyPage.getByRole('button',{name:'渠道数据',exact:true}).click();
  await anomalyPage.getByRole('tab',{name:'异常记录',exact:true}).click();
  await anomalyPage.getByRole('button',{name:'查看异常',exact:true}).first().click();
  await anomalyPage.screenshot({path:path.join(evidenceDir,'channel-anomaly-detail-1440.png'),fullPage:true});
  await anomalyPage.close();
});

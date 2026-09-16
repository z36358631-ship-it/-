import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright-core');
const demoFile=path.resolve('demos/开发者后台一期/13-开发者平台与渠道分销demo.html');
const fixturesFile=path.resolve('demos/开发者后台一期/src/fixtures.json');
const evidenceDir=path.resolve('tests/developer-backend/evidence/gamehub-channel-key-infrastructure');
const chrome=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(file=>file&&fs.existsSync(file));
const demoUrl=route=>{const url=pathToFileURL(demoFile);url.hash=route;return url.href;};
let browser;

async function openGame(page,{language='zh',qualificationStatus='approved'}={}){
  await page.addInitScript(({demoName,language,qualificationStatus})=>{
    if(!decodeURIComponent(location.pathname).endsWith(`/${demoName}`))return;
    localStorage.clear();sessionStorage.clear();window.name='';
    localStorage.setItem('gamehub-developer-language-v1',language);
    const accountKey=`channel-redesign:${qualificationStatus}:${language}`;
    sessionStorage.setItem('gamehub-developer-session-v2',JSON.stringify({version:2,authenticated:true,accountKey,vendorId:'VENDOR-STAR-001',activeGameId:'',qualificationStatus,expiresAt:Date.now()+28800000}));
    localStorage.setItem('gamehub-developer-account-states-v1',JSON.stringify({[accountKey]:{registration:{accountTier:qualificationStatus==='approved'?'enterprise':'registered',registeredAt:'2026-09-16 09:00',consoleTab:'games'},qualification:{status:qualificationStatus,revision:1,step:5,view:'form',form:{},history:[],submissions:[]}}}));
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

async function openSection(page,label){
  await page.getByRole('button',{name:label,exact:true}).click();
  await page.locator('.publisher-channel').waitFor();
}

const channelRow=(page,name)=>page.locator('.publisher-channel-table--channels tbody tr').filter({hasText:name});
const batchRow=(page,id)=>page.locator('.publisher-channel-table--batches tbody tr').filter({hasText:id});
const distributionRow=(page,name)=>page.locator('.publisher-channel-table--distribution tbody tr').filter({hasText:name});

before(async()=>{
  assert.ok(chrome,'Chrome or Edge not found');
  execFileSync(process.execPath,[path.resolve('demos/开发者后台一期/build-developer-channel.mjs')],{stdio:'pipe'});
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--allow-file-access-from-files','--disable-background-networking']});
});

after(async()=>browser?.close());

test('渠道入口仅对企业认证通过账号开放',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page,{qualificationStatus:'unsubmitted'});
  for(const label of ['渠道与供货','分销数据']) assert.equal(await page.getByRole('button',{name:label,exact:true}).count(),0);
  await page.close();
});

test('渠道模块只保留渠道与供货和分销数据，供货页使用横向子 Tab',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);
  const sidebar=page.locator('.publisher-game-sidebar');
  for(const label of ['渠道与供货','分销数据']) await sidebar.getByRole('button',{name:label,exact:true}).waitFor();
  for(const label of ['销售与收益','渠道分销','Key 批次','渠道数据','收益与结算']) assert.equal(await sidebar.getByRole('button',{name:label,exact:true}).count(),0);
  await openSection(page,'渠道与供货');
  const tabs=page.getByRole('tablist',{name:'渠道与供货'});
  await tabs.getByRole('tab',{name:'渠道管理',exact:true}).waitFor();
  await tabs.getByRole('tab',{name:'文件批次',exact:true}).waitFor();
  const body=await page.locator('.publisher-channel').innerText();
  assert.doesNotMatch(body,/按渠道管理销售项、供货方式和合作状态|企业认证通过后可直接创建渠道|授权计划|计划额度|剩余额度|地区筛选|提交申请|审核中|批次申请/);
  assert.equal(new URL(page.url()).hash,'#/P02-01');
  await page.close();
});

test('渠道与供货列表覆盖渠道、API 和同步文件批次状态',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供货');
  let text=await page.locator('.publisher-channel').innerText();
  for(const value of ['合作中','待生效','已暂停','已结束','已停止','风险暂停']) assert.match(text,new RegExp(value));
  assert.doesNotMatch(text,/清算中/);
  for(const value of ['待生成凭证','正常','已暂停','密钥待重置','已停用']) assert.match(text,new RegExp(value));
  await page.getByRole('tab',{name:'文件批次',exact:true}).click();
  text=await page.locator('.publisher-channel').innerText();
  for(const value of ['已下载','已取消','已到期','生成失败']) assert.match(text,new RegExp(value));
  assert.doesNotMatch(text,/生成中|待下载/);
  await page.close();
});

test('企业开发者可创建 API 渠道且不填写数量',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  await page.getByRole('button',{name:'创建渠道',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建渠道'});
  await dialog.getByLabel('渠道名称').fill('NovaPlay 联运');
  await dialog.getByLabel('销售项').selectOption('BASE-GLOBAL');
  await dialog.getByLabel('供货方式').selectOption('api');
  assert.equal(await dialog.getByLabel('生成数量').count(),0);
  assert.doesNotMatch(await dialog.innerText(),/地区|审批|额度/);
  assert.match(await dialog.innerText(),/渠道销售、售后与结算由你与渠道自行约定/);
  await dialog.getByRole('button',{name:'创建渠道',exact:true}).click();
  await page.getByText('渠道已创建',{exact:true}).waitFor();
  const row=channelRow(page,'NovaPlay 联运');
  assert.match(await row.innerText(),/CH-\d{6}[\s\S]*接口自动发码[\s\S]*待生成凭证/);
  await page.close();
});

test('API 渠道无数量额度、保留脱敏调用审计并可轮换一次性 Secret',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  const row=channelRow(page,'NovaPlay Store');
  await row.getByRole('button',{name:'管理接入',exact:true}).click();
  let dialog=page.getByRole('dialog',{name:'API 接入信息'});
  assert.doesNotMatch(await dialog.innerText(),/数量|额度|剩余|补量/);
  assert.match(await dialog.innerText(),/client_id[\s\S]*client_secret/);
  for(const value of ['请求量','1,842','成功量','1,640','失败量','202','近期调用记录','request_id','IDEMPOTENCY_CONFLICT','RATE_LIMITED']) assert.match(await dialog.innerText(),new RegExp(value));
  assert.doesNotMatch(await dialog.innerText(),/NP-260910-8826|req_[A-Za-z0-9]{8,}/);
  await dialog.getByRole('button',{name:'轮换密钥',exact:true}).click();
  await page.getByRole('dialog',{name:'确认轮换密钥'}).getByRole('button',{name:'确认轮换',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'API 接入信息'});
  await dialog.waitFor();
  assert.match(await dialog.innerText(),/(?:Secret|client_secret) 仅显示一次/);
  assert.match(await dialog.innerText(),/ghs_[A-Za-z0-9_-]{20,}/);
  await dialog.locator('footer').getByRole('button',{name:'关闭',exact:true}).click();
  await row.getByRole('button',{name:'管理接入',exact:true}).click();
  assert.doesNotMatch(await page.getByRole('dialog',{name:'API 接入信息'}).innerText(),/ghs_[A-Za-z0-9_-]{20,}/);
  await page.close();
});

test('暂停文件渠道不显示无效的创建文件入口',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  await page.getByRole('button',{name:'创建渠道',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建渠道'});
  await dialog.getByLabel('渠道名称').fill('暂停文件渠道');
  await dialog.getByLabel('销售项').selectOption('BASE-GLOBAL');
  await dialog.getByLabel('供货方式').selectOption('file');
  await dialog.getByRole('button',{name:'创建渠道',exact:true}).click();
  const row=channelRow(page,'暂停文件渠道');
  await row.getByRole('button',{name:'暂停',exact:true}).click();
  assert.equal(await row.getByRole('button',{name:'创建文件',exact:true}).count(),0);
  await row.getByRole('button',{name:'恢复',exact:true}).click();
  await row.getByRole('button',{name:'创建文件',exact:true}).waitFor();
  await page.close();
});

test('文件渠道同步生成兑换码文件且不留下生成中状态',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
  await openGame(page);await openSection(page,'渠道与供货');
  const row=channelRow(page,'ArcadeX 文件渠道');
  await row.getByRole('button',{name:'创建文件',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建兑换码文件'});
  await dialog.getByLabel('生成数量').fill('12');
  assert.doesNotMatch(await dialog.innerText(),/审批|额度|剩余/);
  const [download]=await Promise.all([page.waitForEvent('download'),dialog.getByRole('button',{name:'生成并下载',exact:true}).click()]);
  assert.match(download.suggestedFilename(),/^盖世游戏兑换码_ArcadeX文件渠道_FB-\d{8}-\d{4}\.csv$/);
  const filePath=await download.path();
  assert.ok(filePath,'浏览器应保留可读取的下载文件');
  const csv=fs.readFileSync(filePath,'utf8');
  assert.equal(csv.trim().split(/\r?\n/).length,13);
  assert.match(csv,/^cdkey,sku_id,valid_until\r?\nGH26-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4},BASE-GLOBAL,/);
  assert.match(await row.innerText(),/已下载[\s\S]*查看下载记录/);
  await row.getByRole('button',{name:'查看下载记录',exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'下载记录'});
  assert.equal(await drawer.getAttribute('data-channel-drawer'),'download-record');
  assert.match(await drawer.innerText(),/12[\s\S]*当前开发者[\s\S]*1/);
  assert.doesNotMatch(await drawer.innerText(),/页面不保存或回显明文 Key/);
  await page.getByRole('button',{name:'关闭抽屉',exact:true}).click();
  await page.getByRole('tab',{name:'文件批次',exact:true}).click();
  assert.equal(await page.getByText('生成中',{exact:true}).count(),0);
  assert.match(await page.locator('.publisher-channel-table--batches tbody').innerText(),/已下载/);
  const stored=await page.evaluate(()=>localStorage.getItem('gamehub-developer-publisher-accounts-v2')||'');
  assert.match(stored,/"keyFingerprintDigest":"[a-f0-9]{64}"/);
  assert.doesNotMatch(stored,/"keyFingerprints"|GH26-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
  assert.ok(stored.length<200000,'下载审计不应因逐 Key 指纹撑满 localStorage');
  await page.close();
});

test('Demo 状态开关只预览文件批次的有效状态',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  await page.getByRole('button',{name:'Demo 状态',exact:true}).click();
  const panel=page.getByRole('dialog',{name:'文件批次状态'});
  for(const value of ['已下载','已取消','已到期','生成失败']) await panel.getByRole('radio',{name:value,exact:true}).waitFor();
  assert.doesNotMatch(await panel.innerText(),/审核中|已拒绝|自动生成/);
  await panel.getByRole('radio',{name:'已到期',exact:true}).click();
  await page.getByRole('tab',{name:'文件批次',exact:true}).click();
  assert.match(await batchRow(page,'FB-20260912-0004').innerText(),/已到期/);
  assert.equal(await page.getByText('生成中',{exact:true}).count(),0);
  await page.close();
});

test('停止合作后直接停止新供货并保留已交付 Key 权益',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  const row=channelRow(page,'ArcadeX 文件渠道');
  await row.getByRole('button',{name:'停止合作',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'停止渠道合作'});
  const text=await dialog.innerText();
  for(const value of ['已发放','已兑换','未兑换','停止后不再生成或发放新 Key','已下载 Key 不回库']) assert.match(text,new RegExp(value));
  assert.doesNotMatch(text,/清算|30 个自然日|已售|待补报|待调整/);
  const confirm=dialog.getByRole('button',{name:'确认停止合作',exact:true});
  assert.equal(await confirm.isDisabled(),true);
  await dialog.getByLabel('我已了解停止合作后的影响').check();
  await confirm.click();
  assert.match(await row.innerText(),/已停止/);
  assert.equal(await row.getByRole('button',{name:'创建文件',exact:true}).count(),0);
  await page.close();
});

test('失败批次重试保留原因和原参数',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  await page.getByRole('tab',{name:'文件批次',exact:true}).click();
  const failed=batchRow(page,'FB-20260908-0001');
  await failed.getByRole('button',{name:'查看原因并重新生成',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'重新生成兑换码文件'});
  assert.match(await dialog.innerText(),/生成服务暂时不可用，未产生或暴露任何 Key/);
  assert.equal(await dialog.locator('[data-channel-file-sku]').inputValue(),'BASE-GLOBAL');
  assert.equal(await dialog.locator('[data-channel-file-quantity]').inputValue(),'260');
  assert.equal(await dialog.locator('[data-channel-file-valid-until]').inputValue(),'2027-03-31');
  await page.close();
});

test('分销数据只展示平台可验证的 Key 数据',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'分销数据');
  for(const value of ['发放量','兑换量','未兑换量','兑换率']) await page.getByText(value,{exact:true}).first().waitFor();
  const table=page.locator('.publisher-channel-table--distribution');
  for(const heading of ['渠道','销售项','SKU','供货方式','发放量','兑换量','未兑换量','兑换率']) await table.getByRole('columnheader',{name:heading,exact:true}).waitFor();
  assert.equal(await table.getByRole('columnheader',{name:'商品名称',exact:true}).count(),0);
  assert.equal(await table.getByRole('columnheader',{name:'最近兑换时间',exact:true}).count(),0);
  const fileRow=distributionRow(page,'ArcadeX 文件渠道');
  assert.match(await fileRow.innerText(),/下载兑换码文件[\s\S]*300[\s\S]*42[\s\S]*258[\s\S]*14\.0%/);
  const body=await page.locator('.publisher-channel').innerText();
  for(const removed of ['销量','退款','拒付','币种','销售额','销售净额','预估收益','应结算','正式账单','已打款','导入销售清单']) assert.doesNotMatch(body,new RegExp(removed));
  await page.close();
});

test('分销数据默认近 30 天且按 Key 发放 cohort 汇总',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'分销数据');
  assert.equal(await page.getByLabel('Key 发放开始日期').inputValue(),'2026-08-18');
  assert.equal(await page.getByLabel('Key 发放结束日期').inputValue(),'2026-09-16');
  const row=distributionRow(page,'NovaPlay Store').filter({hasText:'BASE-GLOBAL'});
  assert.match(await row.innerText(),/1,400[\s\S]*1,100[\s\S]*300[\s\S]*78\.6%/);
  await page.getByLabel('Key 发放开始日期').fill('2026-09-16');
  await page.getByLabel('Key 发放结束日期').fill('2026-09-16');
  await page.getByRole('button',{name:'查询',exact:true}).click();
  assert.match(await distributionRow(page,'NovaPlay Store').filter({hasText:'BASE-GLOBAL'}).innerText(),/480[\s\S]*374[\s\S]*106[\s\S]*77\.9%/);
  const stored=await page.evaluate(()=>localStorage.getItem('gamehub-developer-publisher-accounts-v2')||'');
  assert.match(stored,/"periods":\[\{"issuedAt":"2026-08-25","issued":500,"redeemed":390\}/);
  await page.close();
});

test('渠道、文件批次和分销数据按渠道与各自时间口径筛选',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  await page.getByLabel('渠道名称或编号').fill('CH-240902');
  await page.getByRole('button',{name:'查询',exact:true}).click();
  assert.match(await page.locator('.publisher-channel-table--channels tbody').innerText(),/ArcadeX 文件渠道/);
  assert.doesNotMatch(await page.locator('.publisher-channel-table--channels tbody').innerText(),/NovaPlay Store/);
  await page.getByRole('tab',{name:'文件批次',exact:true}).click();
  await page.getByLabel('渠道名称或编号').fill('ArcadeX');
  await page.getByLabel('创建开始日期').fill('2026-09-10');
  await page.getByLabel('创建结束日期').fill('2026-09-12');
  await page.getByRole('button',{name:'查询',exact:true}).click();
  const batches=await page.locator('.publisher-channel-table--batches tbody').innerText();
  assert.match(batches,/FB-20260912-0004/);
  assert.match(batches,/FB-20260910-0003/);
  assert.doesNotMatch(batches,/FB-20260908-0001/);
  await openSection(page,'分销数据');
  await page.getByLabel('渠道名称或编号').fill('NovaPlay');
  await page.getByRole('button',{name:'查询',exact:true}).click();
  const distribution=await page.locator('.publisher-channel-table--distribution tbody').innerText();
  assert.match(distribution,/NovaPlay Store/);
  assert.doesNotMatch(distribution,/ArcadeX/);
  await page.close();
});

test('渠道生效期校验并阻止待生效渠道供货',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  await page.getByRole('button',{name:'创建渠道',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建渠道'});
  await dialog.getByLabel('渠道名称').fill('未来渠道');
  await dialog.getByLabel('供货方式').selectOption('file');
  await dialog.getByLabel('生效开始时间').fill('2026-09-20T09:00');
  await dialog.getByLabel('生效结束时间').fill('2026-09-19T09:00');
  await dialog.getByRole('button',{name:'创建渠道',exact:true}).click();
  assert.match(await dialog.innerText(),/结束时间必须晚于开始时间/);
  await dialog.getByLabel('生效结束时间').fill('');
  await dialog.getByRole('button',{name:'创建渠道',exact:true}).click();
  const row=channelRow(page,'未来渠道');
  assert.match(await row.innerText(),/待生效[\s\S]*2026-09-20 09:00[\s\S]*长期有效/);
  assert.equal(await row.getByRole('button',{name:'创建文件',exact:true}).count(),0);
  await page.close();
});

test('渠道生效时间筛选按区间相交命中',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  await page.getByLabel('生效开始日期').fill('2026-09-18');
  await page.getByLabel('生效结束日期').fill('2026-09-22');
  await page.getByRole('button',{name:'查询',exact:true}).click();
  const rows=await page.locator('.publisher-channel-table--channels tbody').innerText();
  assert.match(rows,/PixelMall 待接入/);
  assert.match(rows,/NovaPlay Store/);
  assert.doesNotMatch(rows,/旧版合作渠道/);
  await page.close();
});

test('下载记录为右侧抽屉且文件单批上限为十万',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  const row=channelRow(page,'ArcadeX 文件渠道');
  await row.getByRole('button',{name:'查看下载记录',exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'下载记录'});
  assert.equal(await drawer.getAttribute('data-channel-drawer'),'download-record');
  assert.match(await drawer.getAttribute('class'),/publisher-channel-drawer/);
  assert.equal(await drawer.evaluate(node=>Math.round(node.getBoundingClientRect().right)),1440);
  await page.getByRole('button',{name:'关闭抽屉',exact:true}).click();
  await row.getByRole('button',{name:'创建文件',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建兑换码文件'});
  assert.equal(await dialog.getByLabel('生成数量').getAttribute('max'),'100000');
  await dialog.getByLabel('生成数量').fill('100001');
  await dialog.getByRole('button',{name:'生成并下载',exact:true}).click();
  assert.match(await dialog.innerText(),/单批最多生成 100,000 个/);
  await page.close();
});

test('渠道业务不包含销售回传和结算能力',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);await openSection(page,'分销数据');
  const html=await page.locator('.publisher-channel').innerText();
  for(const removed of ['销售与收益','导入销售清单','退款','拒付','预估收益','清算中','30 个自然日']) assert.doesNotMatch(html,new RegExp(removed));
  assert.equal(await page.locator('[data-channel-sales-file],[data-channel-sales-target]').count(),0);
  await page.close();
});

test('帮助中心包含发行与供给八篇教程并支持 API 深链搜索',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  await channelRow(page,'NovaPlay Store').getByRole('button',{name:'管理接入',exact:true}).click();
  await page.getByRole('dialog',{name:'API 接入信息'}).getByRole('button',{name:'查看接入教程',exact:true}).click();
  await page.getByRole('heading',{name:'接口自动发码接入指南',exact:true}).waitFor();
  const nav=await page.locator('.help-library__nav').innerText();
  for(const title of ['渠道投放使用说明','接口自动发码接入指南','API 鉴权、发码、查询与错误码','下载兑换码文件教程','Key 状态与兑换数据口径','文件批次和下载记录说明','停止合作与已交付 Key 处理','三方责任与渠道结算边界']) assert.match(nav,new RegExp(title));
  await page.getByPlaceholder('搜索帮助文章').fill('幂等');
  await page.getByRole('button',{name:'搜索',exact:true}).click();
  await page.getByRole('heading',{name:'API 鉴权、发码、查询与错误码',exact:true}).waitFor();
  await page.locator('[data-help-result-topic="channel-api-reference"]').click();
  const articleText=await page.locator('[data-help-article="channel-api-reference"]:not([hidden])').innerText();
  for(const value of ['POST /openapi/v1/cdkeys/allocate','GET /openapi/v1/cdkeys/orders/ORDER-20260916-001','INVALID_CREDENTIAL','IDEMPOTENCY_CONFLICT','CHANNEL_PAUSED','SKU_INVALID','RATE_LIMITED','RISK_RESTRICTED']) assert.match(articleText,new RegExp(value));
  await page.close();
});

test('帮助教程在中英文托管内容和中文兜底数据中保持同 ID',()=>{
  const fixtures=JSON.parse(fs.readFileSync(fixturesFile,'utf8'));
  const ids=['channel-distribution-overview','channel-api-integration','channel-api-reference','channel-file-delivery','channel-key-metrics','channel-file-records','channel-stop-delivery','channel-responsibility-boundary'];
  for(const [label,articles,category] of [['zh',fixtures.managedContent.zh.help.faq,'发行与供给'],['en',fixtures.managedContent.en.help.faq,'Publishing & supply'],['fallback',fixtures.helpCenter.faq,'发行与供给']]){
    const selected=articles.filter(article=>ids.includes(article.id));
    assert.deepEqual(selected.map(article=>article.id),ids,`${label} 教程 ID 或顺序不一致`);
    for(const article of selected){
      assert.equal(article.category,category);
      assert.ok(article.answer.length>30,`${label}/${article.id} 缺少适用场景`);
      assert.ok(article.steps.length>=3,`${label}/${article.id} 缺少操作步骤`);
      assert.ok(article.details.length>=3,`${label}/${article.id} 缺少状态或异常说明`);
    }
    const apiReference=selected.find(article=>article.id==='channel-api-reference');
    const examples=apiReference.steps.join('\n');
    for(const value of ['POST /openapi/v1/cdkeys/allocate','GET /openapi/v1/cdkeys/orders/ORDER-20260916-001','channel_order_id','delivery_status']) assert.match(examples,new RegExp(value),`${label} API 示例缺少 ${value}`);
    const errors=apiReference.details.join('\n');
    for(const value of ['INVALID_CREDENTIAL','IDEMPOTENCY_CONFLICT','CHANNEL_PAUSED','SKU_INVALID','RATE_LIMITED','RISK_RESTRICTED']) assert.match(errors,new RegExp(value),`${label} 错误说明缺少 ${value}`);
  }
});

test('320、390、1280、1440 宽度无根节点溢出且列表在内容区滚动',async()=>{
  for(const width of [320,390,1280,1440]){
    const page=await browser.newPage({viewport:{width,height:900}});
    await openGame(page);
    for(const section of ['渠道与供货','分销数据']){
      await openSection(page,section);
      const tabs=section==='渠道与供货'?['渠道管理','文件批次']:[null];
      for(const tab of tabs){
        if(tab) await page.getByRole('tab',{name:tab,exact:true}).click();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,`${width}px ${section}${tab?`/${tab}`:''} 根节点溢出`);
        const wrap=page.locator('.publisher-channel-table-wrap').first();
        await wrap.waitFor();
        assert.equal(await wrap.evaluate(node=>node.scrollWidth>=node.clientWidth),true,`${width}px ${section}${tab?`/${tab}`:''} 列表滚动区尺寸异常`);
        if(width<=390){
          assert.notEqual(await wrap.locator('tbody td').first().getAttribute('data-label'),'');
          assert.equal(await wrap.locator('table').evaluate(node=>getComputedStyle(node).display),'block');
        }
      }
    }
    await page.close();
  }
});

test('输出渠道筛选、生效期和下载抽屉视觉验收图',async()=>{
  fs.mkdirSync(evidenceDir,{recursive:true});
  const supply=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(supply);await openSection(supply,'渠道与供货');
  await supply.screenshot({path:path.join(evidenceDir,'channel-management-filter-1440.png'),fullPage:true});
  await supply.getByRole('tab',{name:'文件批次',exact:true}).click();
  await supply.screenshot({path:path.join(evidenceDir,'channel-file-filter-1440.png'),fullPage:true});
  await supply.getByRole('tab',{name:'渠道管理',exact:true}).click();
  await channelRow(supply,'ArcadeX 文件渠道').getByRole('button',{name:'查看下载记录',exact:true}).click();
  await supply.screenshot({path:path.join(evidenceDir,'channel-download-drawer-1440.png'),fullPage:true});await supply.close();

  const create=await browser.newPage({viewport:{width:390,height:900}});
  await openGame(create);await openSection(create,'渠道与供货');
  await create.getByRole('button',{name:'创建渠道',exact:true}).click();
  await create.screenshot({path:path.join(evidenceDir,'channel-create-period-390.png'),fullPage:true});await create.close();

  const file=await browser.newPage({viewport:{width:390,height:900}});
  await openGame(file);await openSection(file,'渠道与供货');
  await channelRow(file,'ArcadeX 文件渠道').getByRole('button',{name:'创建文件',exact:true}).click();
  await file.screenshot({path:path.join(evidenceDir,'channel-create-file-390.png'),fullPage:true});
  await file.getByRole('dialog',{name:'创建兑换码文件'}).getByLabel('生成数量').fill('12');
  await Promise.all([file.waitForEvent('download'),file.getByRole('dialog',{name:'创建兑换码文件'}).getByRole('button',{name:'生成并下载',exact:true}).click()]);
  const resultDetail=file.locator('[data-runtime-result] .result-strip span');
  await resultDetail.waitFor();
  assert.equal(await resultDetail.evaluate(node=>getComputedStyle(node).whiteSpace),'normal');
  assert.equal(await resultDetail.evaluate(node=>node.scrollWidth<=node.clientWidth),true);
  await file.locator('.workspace').evaluate(node=>node.scrollTo({top:0,left:0}));
  await file.screenshot({path:path.join(evidenceDir,'channel-key-download-390.png'),fullPage:true});await file.close();

  const stop=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(stop);await openSection(stop,'渠道与供货');
  await channelRow(stop,'NovaPlay Store').getByRole('button',{name:'停止合作',exact:true}).click();
  await stop.screenshot({path:path.join(evidenceDir,'channel-stop-1280.png'),fullPage:true});await stop.close();

  for(const [width,fileName] of [[1440,'channel-distribution-1440.png'],[320,'channel-distribution-320.png']]){
    const page=await browser.newPage({viewport:{width,height:900}});
    await openGame(page);await openSection(page,'分销数据');
    await page.screenshot({path:path.join(evidenceDir,fileName),fullPage:true});await page.close();
  }

  const help=await browser.newPage({viewport:{width:390,height:900}});
  await openGame(help);await openSection(help,'渠道与供货');
  await channelRow(help,'NovaPlay Store').getByRole('button',{name:'管理接入',exact:true}).click();
  await help.getByRole('dialog',{name:'API 接入信息'}).getByRole('button',{name:'查看接入教程',exact:true}).click();
  await help.getByRole('heading',{name:'接口自动发码接入指南',exact:true}).waitFor();
  await help.getByRole('button',{name:'三方责任与渠道结算边界',exact:true}).click();
  await help.getByRole('heading',{name:'三方责任与渠道结算边界',exact:true}).waitFor();
  await help.screenshot({path:path.join(evidenceDir,'channel-help-boundary-390.png'),fullPage:true});await help.close();

  for(const name of ['channel-management-filter-1440.png','channel-file-filter-1440.png','channel-download-drawer-1440.png','channel-create-period-390.png','channel-create-file-390.png','channel-key-download-390.png','channel-stop-1280.png','channel-distribution-1440.png','channel-distribution-320.png','channel-help-boundary-390.png']) assert.ok(fs.statSync(path.join(evidenceDir,name)).size>10000,`${name} 应为有效截图`);
});

test('静态交付文件不含固定明文 Key、Secret 或外部嵌入',()=>{
  const html=fs.readFileSync(demoFile,'utf8');
  assert.doesNotMatch(html,/\bGH(?:26)?-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}\b/);
  assert.doesNotMatch(html,/ghs_[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(html,/<iframe\b|<script\s+src=/i);
});

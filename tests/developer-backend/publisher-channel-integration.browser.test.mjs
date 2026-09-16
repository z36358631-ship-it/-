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
const evidenceDir=path.resolve('tests/developer-backend/evidence/gamehub-channel-distribution-redesign');
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
const revenueRow=(page,name)=>page.locator('.publisher-channel-table--revenue tbody tr').filter({hasText:name});

before(async()=>{
  assert.ok(chrome,'Chrome or Edge not found');
  execFileSync(process.execPath,[path.resolve('demos/开发者后台一期/build-developer-channel.mjs')],{stdio:'pipe'});
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--allow-file-access-from-files','--disable-background-networking']});
});

after(async()=>browser?.close());

test('渠道入口仅对企业认证通过账号开放',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page,{qualificationStatus:'unsubmitted'});
  for(const label of ['渠道与供货','销售与收益']) assert.equal(await page.getByRole('button',{name:label,exact:true}).count(),0);
  await page.close();
});

test('渠道分销只保留两个入口并删除旧口径',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);
  const sidebar=page.locator('.publisher-game-sidebar');
  for(const label of ['渠道与供货','销售与收益']) await sidebar.getByRole('button',{name:label,exact:true}).waitFor();
  for(const label of ['渠道分销','Key 批次','渠道数据','收益与结算']) assert.equal(await sidebar.getByRole('button',{name:label,exact:true}).count(),0);
  await openSection(page,'渠道与供货');
  const body=await page.locator('.publisher-channel').innerText();
  assert.doesNotMatch(body,/授权计划|计划额度|剩余额度|地区筛选|提交申请|审核中|批次申请/);
  assert.equal(new URL(page.url()).hash,'#/P02-01');
  await page.close();
});

test('渠道与供货列表覆盖渠道、API 和文件批次全部状态',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供货');
  const text=await page.locator('.publisher-channel').innerText();
  for(const value of ['合作中','已暂停','清算中','已停止','风险暂停']) assert.match(text,new RegExp(value));
  for(const value of ['待生成凭证','正常','已暂停','密钥待重置','已停用']) assert.match(text,new RegExp(value));
  for(const value of ['生成中','待下载','已下载','已取消','已到期','生成失败']) assert.match(text,new RegExp(value));
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
  await dialog.getByRole('button',{name:'创建渠道',exact:true}).click();
  await page.getByText('渠道已创建',{exact:true}).waitFor();
  const row=channelRow(page,'NovaPlay 联运');
  assert.match(await row.innerText(),/CH-\d{6}[\s\S]*接口自动发码[\s\S]*待生成凭证/);
  await page.close();
});

test('API 渠道无数量额度并可轮换一次性 Secret',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  const row=channelRow(page,'NovaPlay Store');
  await row.getByRole('button',{name:'管理接入',exact:true}).click();
  let dialog=page.getByRole('dialog',{name:'API 接入信息'});
  assert.doesNotMatch(await dialog.innerText(),/数量|额度|剩余|补量/);
  assert.match(await dialog.innerText(),/client_id[\s\S]*client_secret/);
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

test('文件渠道生成运行时 Key 并真实下载 CSV',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
  await openGame(page);await openSection(page,'渠道与供货');
  const row=channelRow(page,'ArcadeX 文件渠道');
  await row.getByRole('button',{name:'创建文件',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建兑换码文件'});
  await dialog.getByLabel('生成数量').fill('12');
  assert.doesNotMatch(await dialog.innerText(),/审批|额度|剩余/);
  const [download]=await Promise.all([page.waitForEvent('download'),dialog.getByRole('button',{name:'生成并下载',exact:true}).click()]);
  assert.match(download.suggestedFilename(),/^gamehub_CH-\d{6}_FB-\d{8}-\d{4}\.csv$/);
  const filePath=await download.path();
  assert.ok(filePath,'浏览器应保留可读取的下载文件');
  const csv=fs.readFileSync(filePath,'utf8');
  assert.equal(csv.trim().split(/\r?\n/).length,13);
  assert.match(csv,/^key,sku_id,valid_until\r?\nGH26-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4},BASE-GLOBAL,/);
  assert.match(await row.innerText(),/已下载[\s\S]*查看下载记录/);
  await row.getByRole('button',{name:'查看下载记录',exact:true}).click();
  assert.match(await page.getByRole('dialog',{name:'下载记录'}).innerText(),/12[\s\S]*当前开发者[\s\S]*1/);
  await page.close();
});

test('停止合作后进入 30 天清算并保留存量 Key 权益',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  const row=channelRow(page,'ArcadeX 文件渠道');
  await row.getByRole('button',{name:'停止合作',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'停止渠道合作'});
  const text=await dialog.innerText();
  for(const value of ['立即停止新发码','未下载文件取消','已下载 Key 不回库','已售未兑换继续有效','30 个自然日','API 已发未兑','文件已暴露','待补报','待调整']) assert.match(text,new RegExp(value));
  const confirm=dialog.getByRole('button',{name:'确认停止合作',exact:true});
  assert.equal(await confirm.isDisabled(),true);
  await dialog.getByLabel('我已了解停止合作后的影响').check();
  await confirm.click();
  assert.match(await row.innerText(),/清算中/);
  assert.equal(await row.getByRole('button',{name:'创建文件',exact:true}).count(),0);
  for(const batchId of ['FB-20260916-0006','FB-20260915-0005']) assert.match(await batchRow(page,batchId).innerText(),/已取消/,`${batchId} 停止合作后应取消`);
  await page.close();
});

test('待下载批次可取消，失败批次重试保留原因和原参数',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  const ready=batchRow(page,'FB-20260915-0005');
  await ready.getByRole('button',{name:'取消',exact:true}).click();
  assert.match(await ready.innerText(),/已取消/);
  assert.equal(await ready.getByRole('button',{name:'下载文件',exact:true}).count(),0);

  const failed=batchRow(page,'FB-20260908-0001');
  await failed.getByRole('button',{name:'查看原因并重新生成',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'重新生成兑换码文件'});
  assert.match(await dialog.innerText(),/生成服务暂时不可用，未产生或暴露任何 Key/);
  assert.equal(await dialog.locator('[data-channel-file-sku]').inputValue(),'BASE-GLOBAL');
  assert.equal(await dialog.locator('[data-channel-file-quantity]').inputValue(),'260');
  assert.equal(await dialog.locator('[data-channel-file-valid-until]').inputValue(),'2027-03-31');
  await page.close();
});

test('销售与收益按渠道销售项 SKU 币种分组且不虚构文件渠道金额',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'销售与收益');
  const table=page.locator('.publisher-channel-table');
  for(const heading of ['渠道','销售项','SKU','币种','销量','退款','拒付','销售额','销售净额','预估收益','数据状态']) await table.getByRole('columnheader',{name:heading,exact:true}).waitFor();
  const fileRow=revenueRow(page,'ArcadeX 文件渠道');
  const cells=fileRow.locator('td');
  for(const index of [8,9,10]) assert.equal((await cells.nth(index).innerText()).trim(),'—');
  assert.match(await cells.nth(11).innerText(),/待导入/);
  assert.doesNotMatch(await page.locator('.publisher-channel').innerText(),/应结算|正式账单|已打款|地区/);
  assert.equal(await page.locator('.publisher-channel-filters').count(),0,'无效筛选区应移除');
  for(const label of ['销售项类型','SKU','月份']) assert.equal(await page.getByLabel(label,{exact:true}).count(),0,`${label} 不应保留假筛选`);
  await page.close();
});

test('选择文件渠道导入不受最近操作的 API 渠道影响，同一 Key 不重复计销售',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
  await openGame(page);await openSection(page,'渠道与供货');
  const supplyRow=channelRow(page,'ArcadeX 文件渠道');
  await supplyRow.getByRole('button',{name:'创建文件',exact:true}).click();
  const fileDialog=page.getByRole('dialog',{name:'创建兑换码文件'});
  await fileDialog.getByLabel('生成数量').fill('2');
  const [download]=await Promise.all([page.waitForEvent('download'),fileDialog.getByRole('button',{name:'生成并下载',exact:true}).click()]);
  const keyLines=fs.readFileSync(await download.path(),'utf8').trim().split(/\r?\n/).slice(1);
  const [firstKey,secondKey]=keyLines.map(line=>line.split(',')[0]);
  await channelRow(page,'NovaPlay Store').getByRole('button',{name:'管理接入',exact:true}).click();
  await page.getByRole('dialog',{name:'API 接入信息'}).locator('footer').getByRole('button',{name:'关闭',exact:true}).click();
  await openSection(page,'销售与收益');
  const target=page.locator('[data-channel-sales-target]');
  await target.waitFor();
  assert.deepEqual(await target.locator('option').evaluateAll(options=>options.filter(option=>option.value).map(option=>option.value)),['CH-240902']);
  await target.selectOption('CH-240902');
  const csv=['channel_order_id,key,sku_id,amount,currency,sold_at,event',`AX-001,${firstKey},BASE-GLOBAL,12.99,USD,2026-09-16 09:00,sale`,`AX-003,${firstKey},BASE-GLOBAL,12.99,USD,2026-09-16 09:05,sale`,`AX-002,${secondKey},BASE-GLOBAL,12.99,USD,2026-09-16 09:10,sale`].join('\n');
  await page.locator('[data-channel-sales-file]').setInputFiles({name:'arcadex-sales.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.getByText('已导入 2 条销售记录',{exact:true}).waitFor();
  await page.getByText('ArcadeX 文件渠道：另有 1 条重复记录已跳过。',{exact:true}).waitFor();
  const row=revenueRow(page,'ArcadeX 文件渠道');
  assert.match(await row.innerText(),/2[\s\S]*USD 25\.98[\s\S]*已更新/);
  assert.doesNotMatch(await page.locator('[data-publisher-workspace]').innerText(),new RegExp(`${firstKey}|${secondKey}`));
  await page.close();
});

test('帮助中心包含发行与供给八篇教程并支持 API 深链搜索',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);await openSection(page,'渠道与供货');
  await channelRow(page,'NovaPlay Store').getByRole('button',{name:'管理接入',exact:true}).click();
  await page.getByRole('dialog',{name:'API 接入信息'}).getByRole('button',{name:'查看接入教程',exact:true}).click();
  await page.getByRole('heading',{name:'接口自动发码接入指南',exact:true}).waitFor();
  const nav=await page.locator('.help-library__nav').innerText();
  for(const title of ['渠道分销使用说明','接口自动发码接入指南','API 鉴权、发码、查询与错误码','下载兑换码文件教程','销售、退款和拒付回传说明','文件渠道销售清单导入说明','停止合作与剩余 Key 处理','渠道销售与收益数据口径']) assert.match(nav,new RegExp(title));
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
  const ids=['channel-distribution-overview','channel-api-integration','channel-api-reference','channel-file-delivery','channel-sales-events','channel-sales-import','channel-stop-clearing','channel-revenue-metrics'];
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
    for(const section of ['渠道与供货','销售与收益']){
      await openSection(page,section);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,`${width}px ${section} 根节点溢出`);
      const wrap=page.locator('.publisher-channel-table-wrap').first();
      await wrap.waitFor();
      assert.equal(await wrap.evaluate(node=>node.scrollWidth>=node.clientWidth),true,`${width}px ${section} 列表滚动区尺寸异常`);
    }
    await page.close();
  }
});

test('输出渠道分销重构八张视觉验收图',async()=>{
  fs.mkdirSync(evidenceDir,{recursive:true});
  const supply=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(supply);await openSection(supply,'渠道与供货');
  await supply.screenshot({path:path.join(evidenceDir,'channel-supply-1440.png'),fullPage:true});await supply.close();

  const createApi=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(createApi);await openSection(createApi,'渠道与供货');
  await createApi.getByRole('button',{name:'创建渠道',exact:true}).click();
  await createApi.getByRole('dialog',{name:'创建渠道'}).getByLabel('供货方式').selectOption('api');
  await createApi.screenshot({path:path.join(evidenceDir,'channel-create-api-1280.png'),fullPage:true});await createApi.close();

  const api=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(api);await openSection(api,'渠道与供货');
  await channelRow(api,'NovaPlay Store').getByRole('button',{name:'管理接入',exact:true}).click();
  await api.screenshot({path:path.join(evidenceDir,'channel-api-access-1440.png'),fullPage:true});await api.close();

  const file=await browser.newPage({viewport:{width:390,height:900}});
  await openGame(file);await openSection(file,'渠道与供货');
  await channelRow(file,'ArcadeX 文件渠道').getByRole('button',{name:'创建文件',exact:true}).click();
  await file.screenshot({path:path.join(evidenceDir,'channel-file-download-390.png'),fullPage:true});await file.close();

  const stop=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(stop);await openSection(stop,'渠道与供货');
  await channelRow(stop,'NovaPlay Store').getByRole('button',{name:'停止合作',exact:true}).click();
  await stop.screenshot({path:path.join(evidenceDir,'channel-stop-clearing-1280.png'),fullPage:true});await stop.close();

  for(const [width,fileName] of [[1440,'channel-revenue-1440.png'],[320,'channel-revenue-320.png']]){
    const page=await browser.newPage({viewport:{width,height:900}});
    await openGame(page);await openSection(page,'销售与收益');
    await page.screenshot({path:path.join(evidenceDir,fileName),fullPage:true});await page.close();
  }

  const help=await browser.newPage({viewport:{width:390,height:900}});
  await openGame(help);await openSection(help,'渠道与供货');
  await channelRow(help,'NovaPlay Store').getByRole('button',{name:'管理接入',exact:true}).click();
  await help.getByRole('dialog',{name:'API 接入信息'}).getByRole('button',{name:'查看接入教程',exact:true}).click();
  await help.getByRole('heading',{name:'接口自动发码接入指南',exact:true}).waitFor();
  await help.screenshot({path:path.join(evidenceDir,'channel-help-api-390.png'),fullPage:true});await help.close();

  for(const name of ['channel-supply-1440.png','channel-create-api-1280.png','channel-api-access-1440.png','channel-file-download-390.png','channel-stop-clearing-1280.png','channel-revenue-1440.png','channel-revenue-320.png','channel-help-api-390.png']) assert.ok(fs.statSync(path.join(evidenceDir,name)).size>10000,`${name} 应为有效截图`);
});

test('静态交付文件不含固定明文 Key、Secret 或外部嵌入',()=>{
  const html=fs.readFileSync(demoFile,'utf8');
  assert.doesNotMatch(html,/GH26-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
  assert.doesNotMatch(html,/ghs_[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(html,/<iframe\b|<script\s+src=/i);
});

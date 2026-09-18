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
const chrome=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(file=>file&&fs.existsSync(file));
const demoUrl=route=>{const url=pathToFileURL(demoFile);url.hash=route;return url.href;};
let browser;

async function openGame(page,{language='zh',qualificationStatus='approved'}={}){
  await page.addInitScript(({demoName,language,qualificationStatus})=>{
    if(!decodeURIComponent(location.pathname).endsWith(`/${demoName}`))return;
    localStorage.clear();sessionStorage.clear();window.name='';
    localStorage.setItem('gamehub-developer-language-v1',language);
    const accountKey=`channel-batch:${qualificationStatus}:${language}`;
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
const batchRow=(page,name)=>page.locator('.publisher-channel-table--batches tbody tr').filter({hasText:name});
const distributionRow=(page,name)=>page.locator('.publisher-channel-table--distribution tbody tr').filter({hasText:name});
const publisherStateText=page=>page.evaluate(()=>localStorage.getItem('gamehub-developer-publisher-accounts-v2')||'');
const expectDrawer=async(page,title)=>{
  const surface=page.getByRole('dialog',{name:title,exact:true});
  await surface.waitFor();
  assert.match(await surface.getAttribute('class'),/(?:^|\s)publisher-channel-drawer(?:\s|$)/,`${title} 应使用右侧抽屉`);
  assert.equal(await page.locator('.publisher-channel-dialog').count(),0,`${title} 不应使用居中弹窗`);
};
const expectConfirmDialog=async(page,title)=>{
  const surface=page.getByRole('dialog',{name:title,exact:true});
  await surface.waitFor();
  assert.match(await surface.getAttribute('class'),/(?:^|\s)publisher-channel-dialog(?:\s|$)/,`${title} 应使用居中确认弹窗`);
  assert.equal(await page.locator('.publisher-channel-drawer').count(),0,`${title} 不应使用右侧抽屉`);
};

before(async()=>{
  assert.ok(chrome,'Chrome or Edge not found');
  execFileSync(process.execPath,[path.resolve('demos/开发者后台一期/build-developer-channel.mjs')],{stdio:'pipe'});
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--allow-file-access-from-files','--disable-background-networking']});
});

after(async()=>browser?.close());

test('渠道入口仅对企业认证通过账号开放',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page,{qualificationStatus:'unsubmitted'});
  for(const label of ['渠道与供给','分销数据']) assert.equal(await page.getByRole('button',{name:label,exact:true}).count(),0);
  await page.close();
});

test('渠道与供给采用渠道管理和批次管理两层模型',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);
  const sidebar=page.locator('.publisher-game-sidebar');
  for(const label of ['渠道与供给','分销数据']) await sidebar.getByRole('button',{name:label,exact:true}).waitFor();
  for(const removed of ['渠道与供货','销售与收益','渠道分销','Key 批次','渠道数据','收益与结算']) assert.equal(await sidebar.getByRole('button',{name:removed,exact:true}).count(),0);
  await openSection(page,'渠道与供给');
  const tabs=page.getByRole('tablist',{name:'渠道与供给'});
  await tabs.getByRole('tab',{name:'渠道管理',exact:true}).waitFor();
  await tabs.getByRole('tab',{name:'批次管理',exact:true}).waitFor();
  assert.equal(await tabs.getByRole('tab',{name:'文件批次',exact:true}).count(),0);
  const headers=await page.locator('.publisher-channel-table--channels thead').innerText();
  for(const value of ['渠道名称','合作时间','状态','备注','更新时间','操作']) assert.match(headers,new RegExp(value));
  assert.doesNotMatch(headers,/销售项|供给方式|API 凭证|数量/);
  const body=await page.locator('.publisher-channel').innerText();
  assert.doesNotMatch(body,/授权计划|计划额度|剩余额度|提交申请|审核中|风险暂停|密钥待重置/);
  assert.equal(new URL(page.url()).hash,'#/P02-01');
  await page.close();
});

test('对象创建、编辑和查看使用右侧抽屉，危险操作使用居中确认弹窗',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('button',{name:'创建渠道',exact:true}).click();
  await expectDrawer(page,'创建渠道');
  await page.getByRole('button',{name:'取消',exact:true}).click();
  const channel=channelRow(page,'NovaPlay Store');
  await channel.getByRole('button',{name:'查看',exact:true}).click();
  await expectDrawer(page,'渠道详情');
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await channel.getByRole('button',{name:'编辑',exact:true}).click();
  await expectDrawer(page,'编辑渠道');
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await channel.getByRole('button',{name:'停用',exact:true}).click();
  await expectConfirmDialog(page,'停用渠道');
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  await page.getByRole('button',{name:'创建批次',exact:true}).click();
  await expectDrawer(page,'创建批次');
  await page.getByRole('button',{name:'取消',exact:true}).click();
  const fileBatch=batchRow(page,'ArcadeX 九月文件批次');
  await fileBatch.getByRole('button',{name:'查看',exact:true}).click();
  await expectDrawer(page,'批次详情');
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await fileBatch.getByRole('button',{name:'编辑',exact:true}).click();
  await expectDrawer(page,'编辑批次');
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await fileBatch.getByRole('button',{name:'下载记录',exact:true}).click();
  await expectDrawer(page,'下载记录');
  await page.getByRole('button',{name:'关闭抽屉',exact:true}).click();
  await batchRow(page,'NovaPlay 本体 API').getByRole('button',{name:'管理接入',exact:true}).click();
  await expectDrawer(page,'API 接入信息');
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.close();
});

test('创建表单默认停用、状态平铺且字段不重叠',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('button',{name:'创建渠道',exact:true}).click();
  let drawer=page.getByRole('dialog',{name:'创建渠道',exact:true});
  await drawer.evaluate(node=>Promise.all(node.getAnimations().map(animation=>animation.finished)));
  assert.equal(await drawer.getByRole('radio',{name:'停用',exact:true}).isChecked(),true);
  const channelState=await drawer.getByText('状态',{exact:true}).locator('..').boundingBox();
  const channelNote=await drawer.getByLabel('备注').locator('..').boundingBox();
  assert.equal(Math.round(channelState.width),Math.round(channelNote.width));
  await drawer.getByRole('button',{name:'取消',exact:true}).click();

  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  await page.getByRole('button',{name:'创建批次',exact:true}).click();
  drawer=page.getByRole('dialog',{name:'创建批次',exact:true});
  await drawer.evaluate(node=>Promise.all(node.getAnimations().map(animation=>animation.finished)));
  assert.equal(await drawer.getByRole('radio',{name:'停用',exact:true}).isChecked(),true);
  const quantity=await drawer.getByLabel('Key 数量').boundingBox();
  const expiry=await drawer.getByLabel('Key 有效期').boundingBox();
  const separated=quantity.y+quantity.height<=expiry.y||expiry.y+expiry.height<=quantity.y||quantity.x+quantity.width<=expiry.x||expiry.x+expiry.width<=quantity.x;
  assert.ok(separated,JSON.stringify({quantity,expiry}));
  await page.close();
});

test('日期浮层点外和 Escape 均按取消处理',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('button',{name:'创建渠道',exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'创建渠道',exact:true});
  const field=drawer.getByRole('button',{name:'合作时间',exact:true});
  const picker=drawer.getByRole('dialog',{name:'选择合作时间'});
  const before=await field.innerText();
  await field.click();
  await picker.getByRole('button',{name:'2026-09-20',exact:true}).click();
  await page.getByRole('heading',{name:'创建渠道',exact:true}).click();
  assert.equal(await picker.isHidden(),true);
  assert.equal(await field.innerText(),before);
  await field.click();
  await picker.press('Escape');
  assert.equal(await picker.isHidden(),true);
  assert.equal(await field.innerText(),before);
  await page.close();
});

test('页面移除使用说明入口且三类筛选使用稳定内容宽度',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供给');
  assert.equal(await page.getByRole('button',{name:'使用说明',exact:true}).count(),0);
  const channelWidths=await page.locator('.publisher-channel-filters.is-channels .publisher-channel-filter').evaluateAll(nodes=>nodes.map(node=>Math.round(node.getBoundingClientRect().width)));
  assert.ok(channelWidths[0]<=320&&channelWidths[1]<=340&&channelWidths[2]<=180);
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  const batchWidth=await page.getByLabel('供给方式').locator('..').evaluate(node=>Math.round(node.getBoundingClientRect().width));
  assert.ok(batchWidth<=180);
  await openSection(page,'分销数据');
  const dataWidth=await page.getByLabel('Key 发放时间').locator('..').evaluate(node=>Math.round(node.getBoundingClientRect().width));
  assert.ok(dataWidth<=340);
  await page.close();
});

test('渠道支持查看、新增、编辑、停用、启用和软删除',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('button',{name:'创建渠道',exact:true}).click();
  const create=page.getByRole('dialog',{name:'创建渠道'});
  await create.getByLabel('渠道名称').fill('测试合作渠道');
  await create.getByLabel('备注').fill('线下合作');
  await create.getByRole('radio',{name:'启用',exact:true}).check();
  assert.equal(await create.getByLabel('供给方式').count(),0);
  assert.equal(await create.getByLabel('销售项').count(),0);
  assert.equal(await create.getByLabel(/数量/).count(),0);
  await create.getByRole('button',{name:'创建',exact:true}).click();
  const created=channelRow(page,'测试合作渠道');
  await created.waitFor();
  assert.match(await created.innerText(),/CH-\d{6}/);
  await created.getByRole('button',{name:'查看',exact:true}).click();
  const detail=page.getByRole('dialog',{name:'渠道详情'});
  assert.match(await detail.innerText(),/测试合作渠道[\s\S]*线下合作/);
  await detail.getByRole('button',{name:'关闭',exact:true}).click();
  await created.getByRole('button',{name:'编辑',exact:true}).click();
  const edit=page.getByRole('dialog',{name:'编辑渠道'});
  assert.equal(await edit.getByLabel('渠道编号').count(),0);
  await edit.getByLabel('渠道名称').fill('测试渠道已编辑');
  await edit.getByRole('button',{name:'保存',exact:true}).click();
  const edited=channelRow(page,'测试渠道已编辑');
  await edited.waitFor();
  await edited.getByRole('button',{name:'停用',exact:true}).click();
  const disable=page.getByRole('dialog',{name:'停用渠道'});
  assert.match(await disable.innerText(),/全部批次[\s\S]*停止新供给[\s\S]*已发 Key 继续有效/);
  await disable.getByRole('button',{name:'确认停用',exact:true}).click();
  assert.match(await edited.innerText(),/已停用/);
  await edited.getByRole('button',{name:'启用',exact:true}).click();
  assert.match(await edited.innerText(),/合作中/);
  await edited.getByRole('button',{name:'删除',exact:true}).click();
  const deleting=page.getByRole('dialog',{name:'删除渠道'});
  assert.match(await deleting.innerText(),/全部批次[\s\S]*停止新供给[\s\S]*已发 Key 继续有效/);
  await deleting.getByRole('button',{name:'确认删除',exact:true}).click();
  assert.equal(await channelRow(page,'测试渠道已编辑').count(),0);
  assert.match(await publisherStateText(page),/测试渠道已编辑[^}]*"deleted":true/);
  await page.close();
});

test('渠道列表覆盖合作状态并支持名称、时间和状态筛选',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await openGame(page);await openSection(page,'渠道与供给');
  const text=await page.locator('.publisher-channel-table--channels tbody').innerText();
  for(const value of ['合作中','已停用']) assert.match(text,new RegExp(value));
  await page.getByLabel('渠道名称或编号').fill('CH-240902');
  await page.getByRole('button',{name:'查询',exact:true}).click();
  const filtered=await page.locator('.publisher-channel-table--channels tbody').innerText();
  assert.match(filtered,/ArcadeX 文件渠道/);
  assert.doesNotMatch(filtered,/NovaPlay Store/);
  await page.getByRole('button',{name:'重置',exact:true}).click();
  await page.getByLabel('合作时间').click();
  const picker=page.getByRole('dialog',{name:'选择时间范围'});
  await picker.getByRole('button',{name:'2026-09-01',exact:true}).click();
  await picker.getByRole('button',{name:'2026-09-16',exact:true}).click();
  await picker.getByRole('button',{name:'应用',exact:true}).click();
  await page.getByLabel('状态').selectOption('active');
  await page.getByRole('button',{name:'查询',exact:true}).click();
  assert.doesNotMatch(await page.locator('.publisher-channel-table--channels tbody').innerText(),/北美线下渠道/);
  await page.close();
});

test('批次管理统一展示文件和 API 批次且不含平台处置状态',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  const headers=await page.locator('.publisher-channel-table--batches thead').innerText();
  for(const value of ['批次名称','渠道','销售项','供给方式','数量','生效时间','状态','最近供给','操作']) assert.match(headers,new RegExp(value));
  const body=await page.locator('.publisher-channel-table--batches tbody').innerText();
  for(const value of ['ArcadeX 九月文件批次','ArcadeX 十月预备批次','NovaPlay 本体 API','下载兑换码文件','接口取码']) assert.match(body,new RegExp(value));
  for(const removed of ['风险暂停','密钥待重置','平台处理','查看异常','已取消']) assert.doesNotMatch(body,new RegExp(removed));
  assert.match(await batchRow(page,'NovaPlay 本体 API').innerText(),/接口取码[\s\S]*98,600\s*\/\s*100,000/);
  await page.close();
});

test('文件批次先创建再下载且单批最多十万',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  await page.getByRole('button',{name:'创建批次',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建批次'});
  await dialog.getByLabel('批次名称').fill('ArcadeX 测试文件批次');
  await dialog.getByLabel('所属渠道').selectOption('CH-240902');
  await dialog.getByLabel('销售项').selectOption('BASE-GLOBAL');
  await dialog.getByLabel('供给方式').selectOption('file');
  await dialog.getByRole('radio',{name:'启用',exact:true}).check();
  const quantity=dialog.getByLabel('Key 数量');
  assert.equal(await quantity.getAttribute('max'),'100000');
  await quantity.fill('100001');
  await dialog.getByLabel('Key 有效期').fill('2027-12-31');
  await dialog.getByRole('button',{name:'创建',exact:true}).click();
  assert.match(await dialog.innerText(),/1[^\n]*100,000|单批最多[^\n]*100,000/);
  await quantity.fill('12');
  await dialog.getByRole('button',{name:'创建',exact:true}).click();
  const row=batchRow(page,'ArcadeX 测试文件批次');
  await row.waitFor();
  assert.match(await row.innerText(),/ArcadeX 文件渠道[\s\S]*下载兑换码文件[\s\S]*12/);
  assert.equal(await page.getByText('生成中…',{exact:true}).count(),0);
  const [download]=await Promise.all([page.waitForEvent('download'),row.getByRole('button',{name:'下载文件',exact:true}).click()]);
  assert.match(download.suggestedFilename(),/^盖世游戏兑换码_ArcadeX文件渠道_BT-\d{8}-\d{4}\.csv$/);
  const filePath=await download.path();
  assert.ok(filePath,'浏览器应保留可读取的下载文件');
  const csv=fs.readFileSync(filePath,'utf8');
  assert.equal(csv.trim().split(/\r?\n/).length,13);
  assert.match(csv,/^cdkey,sku_id,valid_until\r?\nGH26-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4},BASE-GLOBAL,2027-12-31/);
  assert.match(await row.innerText(),/已下载/);
  assert.equal(await row.getByRole('button',{name:'下载文件',exact:true}).count(),0);
  const stored=await publisherStateText(page);
  assert.match(stored,/"keyFingerprintDigest":"[a-f0-9]{64}"/);
  assert.doesNotMatch(stored,/"keyFingerprints"|GH26-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
  await page.close();
});

test('API 批次支持十万上限和原批次追加数量',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  await page.getByRole('button',{name:'创建批次',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'创建批次'});
  await dialog.getByLabel('批次名称').fill('ArcadeX API 数量批次');
  await dialog.getByLabel('所属渠道').selectOption('CH-240902');
  await dialog.getByLabel('销售项').selectOption('BASE-GLOBAL');
  await dialog.getByLabel('供给方式').selectOption('api');
  const initial=dialog.getByLabel('初始可取数量');
  assert.equal(await initial.getAttribute('max'),'100000');
  await initial.fill('100001');
  await dialog.getByRole('button',{name:'创建',exact:true}).click();
  assert.match(await dialog.innerText(),/1[^\n]*100,000/);
  await initial.fill('100000');
  await dialog.getByRole('button',{name:'创建',exact:true}).click();

  const row=batchRow(page,'ArcadeX API 数量批次');
  await row.waitFor();
  assert.match(await row.innerText(),/100,000\s*\/\s*100,000/);
  await row.getByRole('button',{name:'追加数量',exact:true}).click();
  const topup=page.getByRole('dialog',{name:'追加数量',exact:true});
  await expectDrawer(page,'追加数量');
  assert.match(await topup.innerText(),/当前剩余[^\n]*100,000/);
  await topup.getByLabel('本次追加数量').fill('100001');
  await topup.getByRole('button',{name:'确认追加',exact:true}).click();
  assert.match(await topup.innerText(),/1[^\n]*100,000/);
  await topup.getByLabel('本次追加数量').fill('25000');
  await topup.getByRole('button',{name:'确认追加',exact:true}).click();
  assert.match(await row.innerText(),/125,000\s*\/\s*125,000/);
  await row.getByRole('button',{name:'追加数量',exact:true}).click();
  assert.match(await page.getByRole('dialog',{name:'追加数量',exact:true}).innerText(),/追加记录[\s\S]*25,000[\s\S]*当前开发者/);
  await page.close();
});

test('API 追加不改变接口凭证且旧数据不产生虚构库存',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  const row=batchRow(page,'NovaPlay 本体 API');
  await row.getByRole('button',{name:'管理接入',exact:true}).click();
  const before=await page.getByRole('dialog',{name:'API 接入信息'}).innerText();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await row.getByRole('button',{name:'追加数量',exact:true}).click();
  await page.getByLabel('本次追加数量').fill('10000');
  await page.getByRole('button',{name:'确认追加',exact:true}).click();
  await row.getByRole('button',{name:'管理接入',exact:true}).click();
  const after=await page.getByRole('dialog',{name:'API 接入信息'}).innerText();
  assert.match(before,/client_id\s*cli_np_base_202609/i);
  assert.match(after,/client_id\s*cli_np_base_202609/i);
  assert.equal(after,before,'追加不应改变接口地址、凭证或调用统计');
  assert.match(await publisherStateText(page),/"quantityAdditions"/);
  await page.close();
});

test('旧 API 批次缺少数量时以已成功取码量迁移',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto(demoUrl('/P02-01'),{waitUntil:'load'});
  const migrated=await page.evaluate(()=>{
    const state=window.PublisherChannelDistribution.createState({
      batches:[{
        id:'BT-LEGACY',name:'旧接口批次',channelId:'CH-240901',skuId:'BASE-GLOBAL',
        delivery:'api',clientId:'cli_legacy',apiStats:{requests:7,succeeded:5,failed:2},
      }],
    });
    const batch=state.batches[0];
    const channel=state.channels.find(item=>item.id===batch.channelId);
    return {batch,status:window.PublisherChannelDistribution.effectiveBatchStatus(batch,channel)};
  });
  assert.equal(migrated.batch.quantity,5);
  assert.equal(migrated.batch.apiStats.succeeded,5);
  assert.equal(migrated.status,'exhausted');
  await page.close();
});

test('API 成功取码同时扣减库存并更新请求量',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  const row=batchRow(page,'NovaPlay 本体 API');
  assert.match(await row.innerText(),/98,600\s*\/\s*100,000/);
  await row.getByRole('button',{name:'管理接入',exact:true}).click();
  await page.getByRole('dialog',{name:'API 接入信息'}).getByRole('button',{name:'模拟取码',exact:true}).click();
  assert.match(await row.innerText(),/98,599\s*\/\s*100,000/);
  const state=await publisherStateText(page);
  assert.match(state,/"requests":1603/);
  assert.match(state,/"succeeded":1401/);
  await page.close();
});

test('API 数量用完后阻止继续取码',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  await page.getByRole('button',{name:'创建批次',exact:true}).click();
  const create=page.getByRole('dialog',{name:'创建批次'});
  await create.getByLabel('批次名称').fill('ArcadeX API 单次取码');
  await create.getByLabel('所属渠道').selectOption('CH-240902');
  await create.getByLabel('销售项').selectOption('BASE-GLOBAL');
  await create.getByLabel('供给方式').selectOption('api');
  await create.getByLabel('初始可取数量').fill('1');
  await create.getByRole('radio',{name:'启用',exact:true}).check();
  await create.getByRole('button',{name:'创建',exact:true}).click();
  const row=batchRow(page,'ArcadeX API 单次取码');
  await row.getByRole('button',{name:'管理接入',exact:true}).click();
  let access=page.getByRole('dialog',{name:'API 接入信息'});
  await access.getByRole('button',{name:'生成接入凭证',exact:true}).click();
  access=page.getByRole('dialog',{name:'API 接入信息'});
  await access.getByRole('button',{name:'模拟取码',exact:true}).click();
  assert.match(await row.innerText(),/0\s*\/\s*1[\s\S]*已用完/);
  access=page.getByRole('dialog',{name:'API 接入信息'});
  await access.getByRole('button',{name:'模拟取码',exact:true}).click();
  assert.match(await page.locator('.result-strip').innerText(),/数量已用完/);
  assert.match(await access.innerText(),/请求量\s*1[\s\S]*成功量\s*1/);
  await page.close();
});

test('API Secret 仅显示一次且静态状态不保存明文',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  const row=batchRow(page,'NovaPlay 本体 API');
  await row.getByRole('button',{name:'管理接入',exact:true}).click();
  let dialog=page.getByRole('dialog',{name:'API 接入信息'});
  assert.match(await dialog.innerText(),/client_id[\s\S]*client_secret/i);
  await dialog.getByRole('button',{name:'轮换 Secret',exact:true}).click();
  await expectConfirmDialog(page,'确认轮换 Secret');
  await page.getByRole('dialog',{name:'确认轮换 Secret'}).getByRole('button',{name:'确认轮换',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'API 接入信息'});
  await expectDrawer(page,'API 接入信息');
  const firstView=await dialog.innerText();
  assert.match(firstView,/(?:Secret|client_secret) 仅显示一次/i);
  assert.match(firstView,/ghs_[A-Za-z0-9_-]{20,}/);
  await dialog.getByRole('button',{name:'关闭',exact:true}).click();
  await row.getByRole('button',{name:'管理接入',exact:true}).click();
  assert.doesNotMatch(await page.getByRole('dialog',{name:'API 接入信息'}).innerText(),/ghs_[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(await publisherStateText(page),/ghs_[A-Za-z0-9_-]{20,}/);
  await page.close();
});

test('已供给批次锁定核心字段并采用软删除',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  const supplied=batchRow(page,'ArcadeX 九月文件批次');
  await supplied.getByRole('button',{name:'查看',exact:true}).click();
  await page.getByRole('dialog',{name:'批次详情'}).getByRole('button',{name:'关闭',exact:true}).click();
  await supplied.getByRole('button',{name:'编辑',exact:true}).click();
  const edit=page.getByRole('dialog',{name:'编辑批次'});
  for(const label of ['所属渠道','销售项','供给方式','Key 数量']) assert.equal(await edit.getByLabel(label).isDisabled(),true,`${label} 应锁定`);
  await edit.getByLabel('批次名称').fill('ArcadeX 九月文件批次已编辑');
  await edit.getByRole('button',{name:'保存',exact:true}).click();
  const edited=batchRow(page,'ArcadeX 九月文件批次已编辑');
  await edited.getByRole('button',{name:'删除',exact:true}).click();
  const deleting=page.getByRole('dialog',{name:'删除批次'});
  assert.match(await deleting.innerText(),/停止新供给[\s\S]*已发 Key 继续有效/);
  await deleting.getByRole('button',{name:'确认删除',exact:true}).click();
  assert.equal(await batchRow(page,'ArcadeX 九月文件批次已编辑').count(),0);
  assert.match(await publisherStateText(page),/ArcadeX 九月文件批次已编辑[^}]*"deleted":true/);
  await page.close();
});

test('待供给批次可编辑、停用、启用和硬删除',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  const pending=batchRow(page,'ArcadeX 十月预备批次');
  await pending.getByRole('button',{name:'编辑',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'编辑批次'});
  for(const label of ['所属渠道','销售项','供给方式','Key 数量']) assert.equal(await dialog.getByLabel(label).isEnabled(),true,`${label} 应可编辑`);
  await dialog.getByLabel('批次名称').fill('ArcadeX 十月预备批次已编辑');
  await dialog.getByRole('button',{name:'保存',exact:true}).click();
  const edited=batchRow(page,'ArcadeX 十月预备批次已编辑');
  await edited.getByRole('button',{name:'停用',exact:true}).click();
  await page.getByRole('dialog',{name:'停用批次'}).getByRole('button',{name:'确认停用',exact:true}).click();
  assert.match(await edited.innerText(),/已停用/);
  assert.equal(await edited.getByRole('button',{name:'下载文件',exact:true}).isEnabled(),true);
  await edited.getByRole('button',{name:'启用',exact:true}).click();
  assert.doesNotMatch(await edited.innerText(),/已停用/);
  await edited.getByRole('button',{name:'删除',exact:true}).click();
  await page.getByRole('dialog',{name:'删除批次'}).getByRole('button',{name:'确认删除',exact:true}).click();
  assert.equal(await batchRow(page,'ArcadeX 十月预备批次已编辑').count(),0);
  assert.doesNotMatch(await publisherStateText(page),/ArcadeX 十月预备批次已编辑/);
  await page.close();
});

test('未启用、待生效和渠道停用的文件批次仍可首次下载',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  assert.equal(await batchRow(page,'ArcadeX 十月预备批次').getByRole('button',{name:'下载文件',exact:true}).isEnabled(),true);
  assert.equal(await batchRow(page,'ArcadeX 停用批次').getByRole('button',{name:'下载文件',exact:true}).isEnabled(),true);
  await page.getByRole('tab',{name:'渠道管理',exact:true}).click();
  const channel=channelRow(page,'ArcadeX 文件渠道');
  await channel.getByRole('button',{name:'停用',exact:true}).click();
  await page.getByRole('dialog',{name:'停用渠道'}).getByRole('button',{name:'确认停用',exact:true}).click();
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  const pending=batchRow(page,'ArcadeX 停用批次');
  assert.equal(await pending.getByRole('button',{name:'下载文件',exact:true}).isEnabled(),true);
  const [download]=await Promise.all([
    page.waitForEvent('download'),
    pending.getByRole('button',{name:'下载文件',exact:true}).click(),
  ]);
  assert.match(download.suggestedFilename(),/ArcadeX文件渠道/);
  assert.equal(await pending.getByRole('button',{name:'下载文件',exact:true}).count(),0);
  assert.equal(await pending.getByRole('button',{name:'下载记录',exact:true}).count(),1);
  await page.getByRole('tab',{name:'渠道管理',exact:true}).click();
  await channelRow(page,'ArcadeX 文件渠道').getByRole('button',{name:'启用',exact:true}).click();
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  assert.doesNotMatch(await batchRow(page,'ArcadeX 停用批次').innerText(),/受渠道限制/);
  await batchRow(page,'ArcadeX 停用批次').getByRole('button',{name:'下载记录',exact:true}).waitFor();
  await page.close();
});

test('批次支持按批次、渠道、创建时间、供给方式和状态筛选',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('tab',{name:'批次管理',exact:true}).click();
  await page.getByLabel('批次名称或编号').fill('ArcadeX');
  await page.getByLabel('渠道',{exact:true}).selectOption('CH-240902');
  await page.getByLabel('供给方式').selectOption('file');
  await page.getByLabel('创建时间').click();
  const picker=page.getByRole('dialog',{name:'选择时间范围'});
  await picker.getByRole('button',{name:'2026-09-12',exact:true}).click();
  await picker.getByRole('button',{name:'2026-09-16',exact:true}).click();
  await picker.getByRole('button',{name:'应用',exact:true}).click();
  await page.getByRole('button',{name:'查询',exact:true}).click();
  const body=await page.locator('.publisher-channel-table--batches tbody').innerText();
  assert.match(body,/ArcadeX 九月文件批次/);
  assert.doesNotMatch(body,/NovaPlay 本体 API/);
  await page.getByRole('button',{name:'重置',exact:true}).click();
  assert.match(await page.locator('.publisher-channel-table--batches tbody').innerText(),/NovaPlay 本体 API/);
  await page.close();
});

test('分销数据只展示平台可验证的 Key 发放和兑换数据',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'分销数据');
  for(const value of ['发放量','兑换量','未兑换量','兑换率']) await page.getByText(value,{exact:true}).first().waitFor();
  const table=page.locator('.publisher-channel-table--distribution');
  for(const heading of ['渠道','销售项／SKU','供给方式','发放量','兑换量','未兑换量','兑换率']) await table.getByRole('columnheader',{name:heading,exact:true}).waitFor();
  const fileRow=distributionRow(page,'ArcadeX 文件渠道').filter({hasText:'BASE-GLOBAL'});
  assert.match(await fileRow.innerText(),/下载兑换码文件[\s\S]*300[\s\S]*42[\s\S]*258[\s\S]*14\.0%/);
  const body=await page.locator('.publisher-channel').innerText();
  for(const removed of ['销量','退款','拒付','币种','销售额','销售净额','预估收益','应结算','正式账单','已打款','导入销售清单']) assert.doesNotMatch(body,new RegExp(removed));
  await page.close();
});

test('分销数据默认近 30 天并按渠道和 Key 发放时间筛选',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'分销数据');
  assert.match(await page.getByLabel('Key 发放时间').innerText(),/2026-08-18[\s\S]*2026-09-16/);
  assert.equal(await page.getByText('数据口径',{exact:true}).count(),0);
  let row=distributionRow(page,'NovaPlay Store').filter({hasText:'BASE-GLOBAL'});
  assert.match(await row.innerText(),/1,400[\s\S]*1,100[\s\S]*300[\s\S]*78\.6%/);
  await page.getByLabel('渠道名称或编号').fill('NovaPlay');
  await page.getByLabel('Key 发放时间').click();
  const picker=page.getByRole('dialog',{name:'选择时间范围'});
  await picker.getByRole('button',{name:'今日',exact:true}).click();
  await picker.getByRole('button',{name:'应用',exact:true}).click();
  await page.getByRole('button',{name:'查询',exact:true}).click();
  row=distributionRow(page,'NovaPlay Store').filter({hasText:'BASE-GLOBAL'});
  assert.match(await row.innerText(),/480[\s\S]*374[\s\S]*106[\s\S]*77\.9%/);
  assert.doesNotMatch(await page.locator('.publisher-channel-table--distribution tbody').innerText(),/ArcadeX/);
  await page.close();
});

test('帮助中心包含渠道与批次、文件下载和 API 接入说明',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await openGame(page);await openSection(page,'渠道与供给');
  await page.getByRole('button',{name:'帮助中心',exact:true}).click();
  const nav=await page.locator('.help-library__nav').innerText();
  for(const title of ['渠道与批次使用说明','接口取码接入指南','API 鉴权、发码、查询和错误码','下载兑换码文件教程','Key 状态与兑换数据口径','启停、删除与已发 Key 处理','三方责任与渠道结算边界']) assert.match(nav,new RegExp(title));
  await page.getByPlaceholder('搜索帮助文章').fill('追加数量');
  await page.getByRole('button',{name:'搜索',exact:true}).click();
  await page.getByRole('heading',{name:'接口取码接入指南',exact:true}).waitFor();
  await page.locator('[data-help-result-topic="channel-api-integration"]').click();
  const articleText=await page.locator('[data-help-article="channel-api-integration"]:not([hidden])').innerText();
  assert.match(articleText,/单次[\s\S]*100,000/);
  assert.match(articleText,/追加数量不改变接口地址[\s\S]*client_id[\s\S]*Secret/);
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
      assert.ok(article.answer.length>20,`${label}/${article.id} 缺少适用场景`);
      assert.ok(article.steps.length>=2,`${label}/${article.id} 缺少操作步骤`);
      assert.ok(article.details.length>=2,`${label}/${article.id} 缺少状态或异常说明`);
    }
  }
});

test('320、390、1280、1440 宽度无根节点溢出且列表在内容区滚动',async()=>{
  for(const width of [320,390,1280,1440]){
    const page=await browser.newPage({viewport:{width,height:900}});
    await openGame(page);await openSection(page,'渠道与供给');
    for(const tab of ['渠道管理','批次管理']){
      await page.getByRole('tab',{name:tab,exact:true}).click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,`${width}px ${tab} 根节点溢出`);
      const wrap=page.locator('.publisher-channel-table-wrap').first();
      await wrap.waitFor();
      assert.equal(await wrap.evaluate(node=>node.scrollWidth>=node.clientWidth),true,`${width}px ${tab} 列表滚动区尺寸异常`);
      if(width<=390){
        assert.notEqual(await wrap.locator('tbody td').first().getAttribute('data-label'),'');
        assert.equal(await wrap.locator('table').evaluate(node=>getComputedStyle(node).display),'block');
      }
    }
    await openSection(page,'分销数据');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,`${width}px 分销数据根节点溢出`);
    await page.close();
  }
});

test('静态交付文件不含固定明文 Key、Secret 或外部嵌入',()=>{
  const html=fs.readFileSync(demoFile,'utf8');
  assert.doesNotMatch(html,/\bGH(?:26)?-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}\b/);
  assert.doesNotMatch(html,/ghs_[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(html,/<iframe\b|<script\s+src=/i);
});

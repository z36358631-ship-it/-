const {chromium}=require('playwright-core');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
  const pub=JSON.parse(fs.readFileSync(path.join(__dirname,'Pages发布记录.json'),'utf8').replace(/^\uFEFF/,''));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1460,height:1040}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const review=pub.review+'?v='+pub.commit.slice(0,9);
  const demo=pub.demo+'?v='+pub.commit.slice(0,9);
  try {
    const response=await page.goto(review,{waitUntil:'networkidle'});assert.equal(response.status(),200);
    assert.equal(await page.getByText('Open the page',{exact:true}).count(),0);
    assert.equal(await page.getByText('One more step',{exact:true}).count(),0);
    assert((await page.title()).includes('Steam'));
    assert(await page.locator('main img').count()>10);
    assert.deepEqual(await page.locator('main img').evaluateAll(images=>images.filter(x=>!x.complete||!x.naturalWidth).map(x=>x.alt)),[]);
    await page.screenshot({path:path.join(__dirname,'screenshots/75-Pages评审首屏.png')});
    const demoLink=page.locator('a[href*="demo.html"]').first();assert(await demoLink.count());
    await demoLink.click();await page.waitForLoadState('networkidle');
    assert(new URL(page.url()).pathname.endsWith('/public/steam-integration/demo.html'));
    assert(await page.getByRole('heading',{name:'Steam 启动模式',exact:true}).isVisible());
    assert.equal(await page.getByLabel('同意第三方Steam服务调用免责声明',{exact:true}).isChecked(),false);
    await page.getByLabel('同意第三方Steam服务调用免责声明',{exact:true}).check();
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.getByLabel('同意第三方Steam服务调用免责声明',{exact:true}).isChecked(),false);
    await page.screenshot({path:path.join(__dirname,'screenshots/76-Pages首次进入.png')});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(__dirname,'Pages在线验证.json'),JSON.stringify({review,demo,reviewStatus:200,noInterstitial:true,embeddedImages:'passed',reviewToDemo:'passed',refreshResetsConsent:'passed',scriptErrors:errors},null,2));
    console.log('Pages direct render, images, demo navigation and refresh PASS');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

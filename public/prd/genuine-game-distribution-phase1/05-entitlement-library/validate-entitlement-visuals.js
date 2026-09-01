const path=require('path');
const fs=require('fs');
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root=__dirname;
const jobs=[
  ['game-detail',1080,2400],['purchase-confirm',1080,2400],['transaction-result',1080,2400],
  ['library-list',1080,2400],['library-detail',1080,2400],['entitlement-error',1080,2400],
  ['ops-entitlement-search',1800,1100],['ops-entitlement-handle',1800,1100]
];
const expectedPngs=['05-entitlement-flow.png',...jobs.map(([page])=>`05-${page}.png`)];
const requiredSources=['05-entitlement-flow.mmd','05-entitlement-flow.html','entitlement-screens.html','entitlement-screens.css','render-entitlement-flow.js','render-entitlement-visuals.js'];

function assert(ok,message){if(!ok)throw new Error(message)}
(async()=>{
  for(const file of [...expectedPngs,...requiredSources]){
    const target=path.join(root,file);assert(fs.existsSync(target),`missing ${file}`);assert(fs.statSync(target).size>0,`empty ${file}`);
  }
  assert(expectedPngs.length===9,'PNG count must be 9');
  const browser=await chromium.launch({headless:true});
  try{
    const html=path.resolve(root,'entitlement-screens.html').replaceAll('\\','/');
    for(const [name,width,height] of jobs){
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
      await page.goto(`file:///${html}?page=${name}`,{waitUntil:'load'});
      const result=await page.evaluate(()=>{
        const bodyText=document.body.innerText;
        const clipped=[...document.querySelectorAll('button,.badge,.delivery-label,.line-row,.library-card,.permission-note,.notice,.admin-evidence,.evidence-strip')].filter(el=>el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1).map(el=>`${el.tagName}.${el.className}:${el.textContent.trim().slice(0,40)}`);
        return {w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,bodyText,clipped};
      });
      assert(result.w===width&&result.h===height,`${name} viewport overflow ${result.w}x${result.h}`);
      assert(result.clipped.length===0,`${name} clipped: ${result.clipped.join(' | ')}`);
      assert(!result.bodyText.includes('本地下载')&&!result.bodyText.includes('平台下载'),`${name} contains a third delivery label`);
      if(name==='game-detail'||name==='library-detail'||name==='entitlement-error'){
        assert(result.bodyText.includes('盖世直接下载'),`${name} missing direct delivery label`);
        assert(!result.bodyText.includes('查看 Key')&&!result.bodyText.includes('一键激活'),`${name} mixes Key actions into direct delivery`);
      }
      if(name==='purchase-confirm'||name==='transaction-result'){
        assert(result.bodyText.includes('第三方平台激活'),`${name} missing third-party label`);
        assert(!result.bodyText.includes('盖世直接下载'),`${name} mixes direct delivery into CDKEY path`);
      }
      if(name==='library-list'){
        const cards=await page.locator('.library-card').allTextContents();
        assert(cards.every(text=>!(text.includes('第三方平台激活')&&text.includes('盖世直接下载'))),'library card mixes delivery types');
      }
      await page.close();
      console.log(`${name}: structure, copy, action exclusivity and overflow PASS`);
    }
  }finally{await browser.close()}
  console.log('9 PNG files and editable sources PASS');
})();

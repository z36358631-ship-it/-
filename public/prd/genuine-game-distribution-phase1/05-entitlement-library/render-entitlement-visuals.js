const path=require('path');
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const jobs=[
  {page:'game-detail',png:'05-game-detail.png',width:1080,height:2400},
  {page:'purchase-confirm',png:'05-purchase-confirm.png',width:1080,height:2400},
  {page:'transaction-result',png:'05-transaction-result.png',width:1080,height:2400},
  {page:'library-list',png:'05-library-list.png',width:1080,height:2400},
  {page:'library-detail',png:'05-library-detail.png',width:1080,height:2400},
  {page:'entitlement-error',png:'05-entitlement-error.png',width:1080,height:2400},
  {page:'ops-entitlement-search',png:'05-ops-entitlement-search.png',width:1800,height:1100},
  {page:'ops-entitlement-handle',png:'05-ops-entitlement-handle.png',width:1800,height:1100}
];

const requested=process.argv[2];
const selected=requested?jobs.filter(job=>job.page===requested):jobs;
if(requested&&selected.length===0)throw new Error(`Unknown page: ${requested}`);

(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const job of selected){
      const page=await browser.newPage({viewport:{width:job.width,height:job.height},deviceScaleFactor:1});
      const htmlPath=path.resolve(__dirname,'entitlement-screens.html').replaceAll('\\','/');
      await page.goto(`file:///${htmlPath}?page=${encodeURIComponent(job.page)}`,{waitUntil:'load'});
      const dims=await page.evaluate(()=>({innerWidth,innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,bodyWidth:document.body.scrollWidth,bodyHeight:document.body.scrollHeight}));
      if(dims.scrollWidth!==job.width||dims.scrollHeight!==job.height||dims.bodyWidth!==job.width||dims.bodyHeight!==job.height){
        throw new Error(`${job.page} overflow: ${JSON.stringify(dims)}`);
      }
      await page.screenshot({path:path.resolve(__dirname,job.png),fullPage:false});
      console.log(`${job.page}: ${job.width}x${job.height} PASS`);
      await page.close();
    }
  }finally{await browser.close()}
})();

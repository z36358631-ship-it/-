const path=require('path');
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const jobs=[
  {page:'targeting-flow',png:'07-targeting-flow.png',width:2400,height:900},
  {page:'resource-slot',png:'07-resource-slot.png',width:1080,height:2400},
  {page:'landing-state',png:'07-landing-state.png',width:1080,height:2400},
  {page:'developer-campaign-list',png:'07-developer-campaign-list.png',width:1800,height:1100},
  {page:'campaign-editor',png:'07-campaign-editor.png',width:1800,height:1100},
  {page:'campaign-detail',png:'07-campaign-detail.png',width:1800,height:1100},
  {page:'developer-dashboard',png:'07-developer-dashboard.png',width:1800,height:1100},
  {page:'ops-plan-list',png:'07-ops-plan-list.png',width:1800,height:1100},
  {page:'material-review',png:'07-material-review.png',width:1800,height:1100},
  {page:'audience-editor',png:'07-audience-editor.png',width:1800,height:1100},
  {page:'placement-schedule',png:'07-placement-schedule.png',width:1800,height:1100},
  {page:'campaign-monitor',png:'07-campaign-monitor.png',width:1800,height:1100}
];

(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const job of jobs){
      const page=await browser.newPage({viewport:{width:job.width,height:job.height},deviceScaleFactor:1});
      const htmlPath=path.resolve(__dirname,'targeting-dashboard-screens.html').replaceAll('\\','/');
      await page.goto(`file:///${htmlPath}?page=${encodeURIComponent(job.page)}`,{waitUntil:'load'});
      const dims=await page.evaluate(()=>({innerWidth,innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,bodyWidth:document.body.scrollWidth,bodyHeight:document.body.scrollHeight}));
      if(dims.scrollWidth!==job.width||dims.scrollHeight!==job.height||dims.bodyWidth!==job.width||dims.bodyHeight!==job.height){throw new Error(`${job.page} overflow: ${JSON.stringify(dims)}`)}
      await page.screenshot({path:path.resolve(__dirname,job.png),fullPage:false});
      console.log(`${job.png}: ${job.width}x${job.height} PASS`);
      await page.close();
    }
  }finally{await browser.close()}
})();

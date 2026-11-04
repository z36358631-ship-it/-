const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
(async()=>{
 const target=path.resolve(__dirname,'../../public/gamehub-70-home-demo/index.html');
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  await page.goto('file:///'+target.replaceAll('\\','/'));
  await page.locator('.screen').screenshot({path:path.join(__dirname,'baseline-home.png')});
  const data={sha256:crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex'),homeModules:await page.locator('[data-module]').evaluateAll(elements=>elements.map(e=>e.dataset.module))};
  await page.evaluate(()=>topLevel('pc'));
  data.pcTitles=await page.locator('.content h2,.content h3').allTextContents();
  await page.locator('.screen').screenshot({path:path.join(__dirname,'baseline-pc.png')});
  fs.writeFileSync(path.join(__dirname,'baseline.json'),JSON.stringify(data,null,2));
  process.stdout.write(JSON.stringify(data));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

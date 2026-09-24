import {chromium} from 'playwright-core';import {pathToFileURL,fileURLToPath} from 'node:url';import path from 'node:path';import fs from 'node:fs';
const dir=path.dirname(fileURLToPath(import.meta.url)),out=path.resolve(dir,'../../public/prd/app-help-center-20260924');fs.mkdirSync(out,{recursive:true});
const url=pathToFileURL(path.join(dir,'帮助中心demo.html')).href;
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const p=await b.newPage({viewport:{width:390,height:867},deviceScaleFactor:3});
 await p.goto(url+'?capture=1');await p.screenshot({path:path.join(out,'01-settings.png')});
 await p.locator('[data-route="help"]').click();await p.screenshot({path:path.join(out,'02-help.png')});
 await p.locator('[data-doc="HC-D002"]').click();await p.waitForFunction(()=>document.querySelector('video')?.readyState>=2);await p.screenshot({path:path.join(out,'03-article.png')});
 await p.setViewportSize({width:1040,height:468});await p.goto(url+'?capture=1&orientation=landscape&page=article&doc=HC-D002');await p.waitForFunction(()=>document.querySelector('video')?.readyState>=2);await p.screenshot({path:path.join(out,'07-landscape.png')});
 console.log('Captured 4 frontend pages.');
}finally{await b.close();}

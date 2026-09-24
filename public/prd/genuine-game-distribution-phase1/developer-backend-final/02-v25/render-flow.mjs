import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
try {
 const page = await browser.newPage({viewport:{width:3500,height:850},deviceScaleFactor:1});
 await page.goto(pathToFileURL(path.join(currentDir,'flow-source.html')).href,{waitUntil:'load'});
 const missing = await page.locator('img').evaluateAll(images=>images.filter(img=>!img.complete||!img.naturalWidth).map(img=>img.src));
 if(missing.length) throw new Error(`Missing source images: ${missing.join(', ')}`);
 const overflow = await page.locator('article').evaluateAll(cards=>cards.filter(card=>card.scrollHeight>card.clientHeight).length);
 if(overflow) throw new Error('Flow card text is clipped');
 await page.screenshot({path:path.join(currentDir,'flow.png'),type:'png',fullPage:false});
} finally { await browser.close(); }
console.log(path.join(currentDir,'flow.png'));

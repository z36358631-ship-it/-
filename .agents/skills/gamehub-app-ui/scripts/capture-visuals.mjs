import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(scriptDir, '..');
const workspace = path.resolve(skillDir, '..', '..', '..');
const preview = path.join(workspace, 'demos', 'UI规范', '盖世游戏APP-UI模板与页面配方预览.html');
const config = JSON.parse(fs.readFileSync(path.join(skillDir, 'assets', 'visual-baselines.json'), 'utf8'));
const output = path.join(workspace, '.tmp', 'gamehub-app-ui', 'visual-captures');
const componentOutput = path.join(workspace, '.tmp', 'gamehub-app-ui', 'component-captures');
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find(fs.existsSync);
assert(executablePath, 'Chrome/Edge executable not found');
fs.mkdirSync(output, { recursive:true });
fs.mkdirSync(componentOutput, { recursive:true });
const browser = await chromium.launch({ headless:true, executablePath });
try {
  // 2400px 横屏画布必须完整落在中栏内，避免右侧说明栏覆盖画布末端。
  const page = await browser.newPage({ viewport:{ width:3200, height:2500 }, deviceScaleFactor:1 });
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(preview).href, { waitUntil:'load' });
  await page.waitForFunction(() => window.GameHubVisual && document.fonts.status === 'loaded');
  for (const item of config.pages) {
    await page.locator(`[data-page="${item.key}"]`).click();
    await page.waitForFunction(key => window.GameHubVisual.current === key, item.key);
    await page.locator('[data-mode="implementation"]').click();
    await page.locator('[data-device]').evaluate((node,{width,height}) => {
      node.style.width=`${width}px`; node.style.height=`${height}px`; node.style.border='0'; node.style.borderRadius='0';
    }, item);
    const captureRoot=page.locator('[data-page-root]');
    const box=await captureRoot.boundingBox();
    assert.equal(Math.round(box.width),item.width,`${item.key}: width mismatch`);
    assert.equal(Math.round(box.height),item.height,`${item.key}: height mismatch`);
    const target=path.join(output,`${item.key}-implementation.png`);
    await captureRoot.screenshot({ path:target, animations:'disabled' });
    const bytes=fs.readFileSync(target);
    assert.equal(bytes.readUInt32BE(16),item.width,`${item.key}: PNG width mismatch`);
    assert.equal(bytes.readUInt32BE(20),item.height,`${item.key}: PNG height mismatch`);
    for (const component of item.components) {
      const count = await page.locator(`[data-component-id="${component.id}"]`).count();
      assert(count > 0, `${item.key}: component DOM missing ${component.id}`);
      const [x1,y1,x2,y2]=component.box;
      const componentTarget=path.join(componentOutput,`${item.key}--${component.id}.png`);
      await page.screenshot({path:componentTarget,animations:'disabled',clip:{x:box.x+x1,y:box.y+y1,width:x2-x1,height:y2-y1}});
      const componentBytes=fs.readFileSync(componentTarget);
      assert.equal(componentBytes.readUInt32BE(16),x2-x1,`${item.key}/${component.id}: PNG width mismatch`);
      assert.equal(componentBytes.readUInt32BE(20),y2-y1,`${item.key}/${component.id}: PNG height mismatch`);
    }
    await page.locator('[data-device]').evaluate(node => {node.style.cssText=''});
    console.log(`CAPTURED ${item.key} ${item.width}x${item.height} + ${item.components.length} components`);
  }
  assert.deepEqual(errors,[],`page errors: ${errors.join('; ')}`);
} finally { await browser.close(); }
console.log(`PASS visualCaptures (${config.pages.length}/${config.pages.length})`);

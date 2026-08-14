import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(scriptDir, '..');
const workspace = path.resolve(skillDir, '..', '..', '..');
const previewPath = path.join(workspace, 'demos', 'UI规范', '盖世游戏APP-UI模板与页面配方预览.html');
const config = JSON.parse(fs.readFileSync(path.join(skillDir, 'assets', 'visual-baselines.json'), 'utf8'));
const captureDir = path.join(workspace, '.tmp', 'gamehub-app-ui', 'visual-captures');
const componentDir = path.join(workspace, '.tmp', 'gamehub-app-ui', 'component-captures');
const geometryDir = path.join(workspace, '.tmp', 'gamehub-app-ui', 'geometry');
for (const directory of [captureDir, componentDir, geometryDir]) fs.mkdirSync(directory, {recursive:true});

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find(fs.existsSync);
assert(executablePath, 'Chrome/Edge executable not found');

function union(rectangles) {
  return [
    Math.min(...rectangles.map(rect => rect.x)),
    Math.min(...rectangles.map(rect => rect.y)),
    Math.max(...rectangles.map(rect => rect.x + rect.width)),
    Math.max(...rectangles.map(rect => rect.y + rect.height))
  ].map(value => Math.round(value));
}

const browser = await chromium.launch({headless:true, executablePath});
try {
  const page = await browser.newPage({viewport:{width:2400,height:2400},deviceScaleFactor:1});
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(pathToFileURL(previewPath).href, {waitUntil:'load', timeout:120000});
  await page.waitForFunction(() => window.GameHubUI && document.fonts.status === 'loaded', null, {timeout:120000});
  for (const item of config.pages) {
    await page.setViewportSize({width:item.width,height:item.height});
    await page.evaluate(key => {
      const item = window.GameHubUI.visualConfig.pages.find(page => page.key === key);
      document.documentElement.style.cssText = 'margin:0;width:100%;height:100%;background:#0e0e10';
      document.body.style.cssText = 'margin:0;width:100%;height:100%;overflow:hidden;background:#0e0e10';
      document.body.replaceChildren(window.GameHubUI.renderRegression(item));
    }, item.key);
    await page.waitForFunction(() => [...document.images].every(image => image.complete));
    const root = page.locator('[data-regression-root]');
    const rootBox = await root.boundingBox();
    assert(rootBox, `${item.key}: regression root missing`);
    assert.equal(Math.round(rootBox.width), item.width, `${item.key}: root width mismatch`);
    assert.equal(Math.round(rootBox.height), item.height, `${item.key}: root height mismatch`);
    const capturePath = path.join(captureDir, `${item.key}-implementation.png`);
    await root.screenshot({path:capturePath,animations:'disabled'});

    const geometry = [];
    for (const component of item.components) {
      const locator = page.locator(`[data-component-id="${component.id}"]`);
      const count = await locator.count();
      assert(count > 0, `${item.key}: component DOM missing ${component.id}`);
      const rectangles = await locator.evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return {x:rect.x,y:rect.y,width:rect.width,height:rect.height};
      }));
      const actualBox = union(rectangles);
      const expectedBox = component.expectedBox || component.box;
      const errors = actualBox.map((value,index) => Math.abs(value - expectedBox[index]));
      geometry.push({
        id:component.id,
        label:component.label,
        expectedBox,
        actualBox,
        errors,
        passed:errors.every(error => error <= config.thresholds.geometryTolerancePx)
      });
      const [x1,y1,x2,y2] = component.box;
      await page.screenshot({
        path:path.join(componentDir, `${item.key}--${component.id}.png`),
        animations:'disabled',
        clip:{x:x1,y:y1,width:x2-x1,height:y2-y1}
      });
    }
    fs.writeFileSync(path.join(geometryDir, `${item.key}.json`), `${JSON.stringify({schemaVersion:1,key:item.key,tolerancePx:config.thresholds.geometryTolerancePx,components:geometry},null,2)}\n`, 'utf8');
    console.log(`CAPTURED ${item.key} ${item.width}x${item.height} geometry ${geometry.filter(row=>row.passed).length}/${geometry.length}`);
  }
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);
} finally {
  await browser.close();
}
console.log(`PASS visualCaptures (${config.pages.length}/${config.pages.length})`);

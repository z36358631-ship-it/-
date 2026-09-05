import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demoDir = path.join(root, 'demos', '开发者后台一期');
const evidenceDir = path.join(root, 'tests', 'developer-backend', 'evidence', 'next-demos');
const files = {
  demo06: path.join(demoDir, '06-游戏创建与发行资料demo.html'),
  demo07: path.join(demoDir, '07-开发接入与资源中心demo.html'),
  demo08: path.join(demoDir, '08-消息通知中心demo.html'),
};
const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
let browser;
const url = (file, hash, query='') => { const value = pathToFileURL(file); value.search = query; value.hash = hash; return value.href; };

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  fs.mkdirSync(evidenceDir, { recursive: true });
  browser = await chromium.launch({ headless:true, executablePath:chrome, args:['--allow-file-access-from-files','--disable-background-networking'] });
});
after(async () => { await browser?.close(); });

test('Demo 06 创建游戏、提交资质并进入运营审核', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  const errors=[]; page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(url(files.demo06,'/P06-01'),{waitUntil:'load'});
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button',{name:'新建游戏',exact:true}).click();
    await page.getByLabel('游戏中文名').fill('星海远征');
    await page.getByLabel('游戏英文名').fill('Ocean Expedition');
    await page.getByRole('button',{name:'创建游戏',exact:true}).click();
    await page.waitForURL(/P06-03/);
    await page.getByRole('heading',{name:'星海远征 概览',exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'星海远征 概览',exact:true}).isVisible(),true);
    assert.match(await page.locator('main').innerText(),/APP-7F3A9C/);
    assert.match(await page.locator('main').innerText(),/不影响测试或发行申请/);
    await page.getByRole('button',{name:'游戏资质',exact:true}).click();
    await page.getByRole('button',{name:'提交平台审核',exact:true}).click();
    await page.waitForTimeout(80);
    assert.match(await page.getByRole('status').innerText(),/资质已提交/);
    await page.goto(url(files.demo06,'/P06-08'),{waitUntil:'load'});
    assert.equal(await page.getByRole('heading',{name:'游戏资料审核',exact:true}).isVisible(),true);
    await page.getByRole('button',{name:'查看详情',exact:true}).first().click();
    await page.waitForURL(/P06-09/);
    await page.getByRole('heading',{name:'审核详情',exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'审核详情',exact:true}).isVisible(),true);
    await page.screenshot({path:path.join(evidenceDir,'06-review-detail-1440x900.png'),fullPage:true});
    assert.deepEqual(errors,[]);
  } finally { await page.close(); }
});

test('Demo 07 重置密钥、添加测试账号并下载资源', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  const errors=[]; page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(url(files.demo07,'/P07-02'),{waitUntil:'load'});
    await page.getByRole('button',{name:'重置 API 密钥',exact:true}).click();
    await page.getByRole('button',{name:'确认重置',exact:true}).click();
    assert.match(await page.locator('main').innerText(),/ghs_•/);
    await page.getByRole('button',{name:'显示',exact:true}).click();
    assert.match(await page.locator('main').innerText(),/ghs_live_/);
    await page.getByRole('button',{name:'测试账号与权限',exact:true}).click();
    await page.getByRole('button',{name:'新增测试账号',exact:true}).click();
    await page.getByLabel('账号邮箱').fill('qa@ocean-expedition.com');
    await page.getByRole('button',{name:'添加',exact:true}).click();
    assert.match(await page.locator('main').innerText(),/qa@ocean-expedition\.com/);
    await page.getByRole('button',{name:'下载中心',exact:true}).click();
    await page.getByRole('button',{name:'下载',exact:true}).first().click();
    assert.match(await page.getByRole('status').innerText(),/已开始下载/);
    await page.screenshot({path:path.join(evidenceDir,'07-downloads-1280x800.png'),fullPage:true});
    assert.deepEqual(errors,[]);
  } finally { await page.close(); }
});

test('Demo 08 消息详情、已读状态和公告列表正常', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  const errors=[]; page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(url(files.demo08,'/P08-01'),{waitUntil:'load'});
    const before=Number(await page.locator('[data-unread-count]').textContent());
    assert.ok(before>0);
    await page.locator('[data-action="open-message"]').first().click();
    await page.waitForURL(/P08-02/);
    await page.getByRole('heading',{name:'消息详情',exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'消息详情',exact:true}).isVisible(),true);
    await page.getByRole('button',{name:'返回列表',exact:true}).click();
    await page.getByRole('button',{name:'全部标为已读',exact:true}).click();
    assert.equal(Number(await page.locator('[data-unread-count]').textContent()),0);
    await page.goto(url(files.demo08,'/P08-03'),{waitUntil:'load'});
    assert.equal(await page.getByRole('heading',{name:'系统公告',exact:true}).isVisible(),true);
    await page.getByRole('button',{name:'新建公告',exact:true}).click();
    await page.waitForURL(/P08-04/);
    await page.getByRole('heading',{name:'新建公告',exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'新建公告',exact:true}).isVisible(),true);
    await page.screenshot({path:path.join(evidenceDir,'08-announcement-editor-1440x900.png'),fullPage:true});
    assert.deepEqual(errors,[]);
  } finally { await page.close(); }
});

for (const [name,file] of Object.entries(files)) {
  test(`${name} 在 390 和 320 宽度无根节点横向溢出`, async () => {
    for (const width of [390,320]) {
      const page = await browser.newPage({ viewport:{ width, height:844 } });
      try {
        await page.goto(url(file, name==='demo06'?'/P06-03':name==='demo07'?'/P07-05':'/P08-01'),{waitUntil:'load'});
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
        assert.equal(overflow,false,`${name} ${width}px 出现横向溢出`);
        if(width===390)await page.screenshot({path:path.join(evidenceDir,`${name}-390x844.png`),fullPage:true});
      } finally { await page.close(); }
    }
  });
}

test('开发者端继承语言，运营端界面始终为中文', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  try {
    await page.goto(url(files.demo06,'/P06-03','lang=en'),{waitUntil:'load'});
    assert.equal(await page.getByRole('heading',{name:'Ocean Expedition Overview',exact:true}).isVisible(),true);
    await page.goto(url(files.demo07,'/P07-01','lang=en'),{waitUntil:'load'});
    assert.equal(await page.getByRole('heading',{name:'Integration overview',exact:true}).isVisible(),true);
    await page.goto(url(files.demo08,'/P08-03','lang=en'),{waitUntil:'load'});
    assert.equal(await page.getByRole('heading',{name:'系统公告',exact:true}).isVisible(),true);
    assert.equal(await page.getByRole('heading',{name:'Announcements',exact:true}).count(),0);
  } finally { await page.close(); }
});

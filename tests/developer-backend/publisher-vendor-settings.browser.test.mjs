import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const demoFile = path.resolve('demos/开发者后台一期/02-游戏创建与发行demo.html');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

let browser;

const demoUrl = () => {
  const url = pathToFileURL(demoFile);
  url.hash = '/P02-01';
  return url.href;
};

async function seedAccount(page, status = 'approved', accountKey = `vendor-settings:${status}`) {
  await page.addInitScript(({ key, qualificationStatus, demoName }) => {
    if (!decodeURIComponent(location.pathname).endsWith(`/${demoName}`)) return;
    const form = {
      subjectType:'公司／企业', region:'中国大陆', province:'广东省', city:'深圳市', district:'南山区',
      legalName:'深圳星海互动科技有限公司', legalEnglishName:'Shenzhen Xinghai Interactive Technology Co., Ltd.',
      registrationNumber:'9144XXXXXXXXXXXXXX', registeredAddress:'广东省深圳市南山区科技园示例路 88 号', mailingAddress:'广东省深圳市南山区科技园示例路 88 号', businessLicenseName:'营业执照.jpg',
      vendorName:'星海互动', vendorEnglishName:'Xinghai Interactive', vendorIntro:'专注于 PC 游戏研发与发行。', contactName:'林晨', email:'contact@xinghai-interactive.com', mobile:'138 0000 1234',
      bankAccountName:'深圳星海互动科技有限公司', bankName:'中国建设银行深圳科技园支行', bankAccountNumber:'6222000000008899', bankBranch:'中国建设银行深圳科技园支行', bankProofName:'银行开户证明.jpg',
      signatoryName:'林晨', signatoryTitle:'业务负责人', agreementAccepted:true,
    };
    localStorage.clear();
    sessionStorage.clear();
    window.name = '';
    sessionStorage.setItem('gamehub-developer-session-v2', JSON.stringify({
      version:2, authenticated:true, accountKey:key, vendorId:'VENDOR-STAR-001', activeGameId:'',
      qualificationStatus, expiresAt:Date.now() + 8 * 60 * 60 * 1000,
    }));
    localStorage.setItem('gamehub-developer-account-states-v1', JSON.stringify({
      [key]: {
        registration:{ accountTier:qualificationStatus === 'approved' ? 'enterprise' : 'registered', registeredAt:'2026-09-10 10:00', consoleTab:'games' },
        qualification:{ status:qualificationStatus, revision:qualificationStatus === 'unsubmitted' ? 0 : 1, step:qualificationStatus === 'unsubmitted' ? 0 : 5, view:'form', form, history:[], submissions:[] },
      },
    }));
  }, { key:accountKey, qualificationStatus:status, demoName:path.basename(demoFile) });
  await page.goto(demoUrl(), { waitUntil:'load' });
  await page.locator('[data-publisher-workspace]').waitFor();
  await page.locator('[data-publisher-view="vendor"]').click();
  await page.locator('[data-publisher-page="vendor"]').waitFor();
}

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  assert.ok(fs.existsSync(demoFile), '统一 02 Demo 尚未构建');
  browser = await chromium.launch({ headless:true, executablePath:chrome, args:['--allow-file-access-from-files', '--disable-background-networking'] });
});

after(async () => { await browser?.close(); });

test('厂商设置使用普通标题且三个资料页签均为真实表单', async () => {
  const context = await browser.newContext({ viewport:{ width:1440, height:900 } });
  const page = await context.newPage();
  try {
    await seedAccount(page);
    const vendor = page.locator('[data-publisher-page="vendor"]');
    assert.equal(await vendor.locator('.publisher-vendor-title h1').innerText(), '厂商设置');
    assert.equal(await vendor.locator('.publisher-vendor-title p, .publisher-vendor-title > div, .publisher-content-title').count(), 0);
    assert.equal(await vendor.locator('.publisher-vendor-title').evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.doesNotMatch(await vendor.innerText(), /占位|VENDOR SETTINGS/);
    assert.deepEqual(await vendor.locator('[data-vendor-settings-tab]').allTextContents(), ['企业主体信息', '厂商资料', '财务信息']);
    assert.equal(await vendor.locator('[name="province"]').inputValue(), '广东省');
    assert.equal(await vendor.locator('[name="city"]').inputValue(), '深圳市');
    assert.equal(await vendor.locator('[name="district"]').inputValue(), '南山区');
    assert.equal(await vendor.locator('[data-portal-action="publisher-open-data"]').count(), 0);

    for (const group of ['subject', 'profile', 'finance']) {
      await vendor.locator(`[data-vendor-settings-tab="${group}"]`).click();
      const panel = vendor.locator(`[data-vendor-settings-panel="${group}"]`);
      assert.equal(await panel.isVisible(), true);
      assert.ok(await panel.locator('input, textarea, select').count() >= 5, `${group} 缺少实际表单控件`);
    }
  } finally {
    await context.close();
  }
});

test('资料修改在页签间保留并支持提交、拒绝重提和审核通过', async () => {
  const context = await browser.newContext({ viewport:{ width:1440, height:900 } });
  const page = await context.newPage();
  try {
    await seedAccount(page, 'approved', 'vendor-settings:lifecycle');
    const vendor = page.locator('[data-publisher-page="vendor"]');
    const legalName = vendor.locator('[name="legalName"]');
    const submit = vendor.locator('[data-vendor-settings-group="subject"][data-portal-action="vendor-settings-submit"]');
    assert.equal(await submit.isDisabled(), true);

    await legalName.fill('深圳星海互动科技有限公司（新）');
    assert.equal(await submit.isEnabled(), true);
    await vendor.locator('[data-vendor-settings-tab="profile"]').click();
    await vendor.locator('[data-vendor-settings-tab="subject"]').click();
    assert.equal(await vendor.locator('[name="legalName"]').inputValue(), '深圳星海互动科技有限公司（新）');

    await submit.click();
    assert.equal(await vendor.locator('[name="legalName"]').isDisabled(), true);
    assert.match(await vendor.locator('[data-vendor-settings-panel="subject"]').innerText(), /当前已生效资料继续使用[\s\S]*审核中/);
    await vendor.locator('[data-vendor-review-result="rejected"][data-vendor-settings-group="subject"]').click();
    assert.equal(await vendor.locator('[name="legalName"]').isEnabled(), true);
    assert.match(await vendor.locator('[data-vendor-settings-panel="subject"]').innerText(), /资料修改审核未通过[\s\S]*修改后可重新提交/);

    await vendor.locator('[name="legalName"]').fill('深圳星海互动科技有限公司（终版）');
    await vendor.locator('[data-vendor-settings-group="subject"][data-portal-action="vendor-settings-submit"]').click();
    await vendor.locator('[data-vendor-review-result="approved"][data-vendor-settings-group="subject"]').click();
    assert.equal(await vendor.locator('[name="legalName"]').inputValue(), '深圳星海互动科技有限公司（终版）');
    assert.match(await vendor.locator('[data-vendor-settings-panel="subject"]').innerText(), /审核通过并生效/);
  } finally {
    await context.close();
  }
});

test('未认证提示没有副标题且移动宽度无页面级横向溢出', async () => {
  const context = await browser.newContext({ viewport:{ width:390, height:844 } });
  const page = await context.newPage();
  try {
    await seedAccount(page, 'unsubmitted', 'vendor-settings:mobile');
    const restriction = page.locator('[data-publisher-vendor-restriction="unsubmitted"]');
    assert.match(await restriction.innerText(), /提交申请前，请先完成开发者认证/);
    assert.equal(await restriction.locator('.publisher-vendor-placeholder p').count(), 0);
    assert.deepEqual(await page.evaluate(() => ({
      document:document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body:document.body.scrollWidth - document.body.clientWidth,
    })), { document:0, body:0 });
  } finally {
    await context.close();
  }
});

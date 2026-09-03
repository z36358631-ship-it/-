import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demoFile = path.join(root, 'demos', '开发者后台一期', '01-开发者平台与资料demo.html');
const assetDir = path.join(root, 'public', 'prd', 'genuine-game-distribution-phase1', 'developer-backend-final', '01');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

let browser;

const demoUrl = hash => {
  const url = pathToFileURL(demoFile);
  url.hash = hash;
  return url.href;
};

const submittedForm = {
  subjectType: '公司／企业',
  region: '中国大陆',
  legalName: '深圳星海互动科技有限公司',
  legalEnglishName: 'Shenzhen Xinghai Interactive Technology Co., Ltd.',
  registrationNumber: '9144XXXXXXXXXXXXXX',
  registeredAddress: '广东省深圳市南山区科技园示例路 88 号',
  mailingAddress: '广东省深圳市南山区科技园示例路 88 号',
  businessLicenseName: '营业执照.jpg',
  bankAccountName: '深圳星海互动科技有限公司',
  bankName: '中国建设银行深圳科技园支行',
  bankAccountNumber: '6222000000008899',
  bankBranch: '中国建设银行深圳科技园支行',
  bankProofName: '银行开户证明.jpg',
  vendorName: '星海互动',
  vendorEnglishName: 'Xinghai Interactive',
  vendorIntro: '专注于 PC 游戏研发与发行。',
  contactName: '林晨',
  mobile: '13800001234',
  email: 'contact@xinghai-interactive.com',
  signatoryName: '林晨',
  signatoryTitle: '业务负责人',
  agreementAccepted: true,
};

const seedPendingApplication = async page => {
  await page.goto(demoUrl('/P01-08?role=operations'), { waitUntil: 'load' });
  await page.evaluate(form => {
    const submittedAt = '2026/09/04 10:30';
    const submission = {
      applicationId: 'ENT-20260903-001',
      revision: 1,
      submittedAt,
      acceptedContentRevision: 3,
      agreementAcceptedBy: 'contact@xinghai-interactive.com',
      agreementAcceptedAt: submittedAt,
      form,
    };
    localStorage.setItem('gamehub-company-verification-v3', JSON.stringify({
      applicationId: submission.applicationId,
      status: 'pending',
      revision: 1,
      acceptedContentRevision: 3,
      submittedAt,
      form,
      currentSubmission: submission,
      submissions: [submission],
      history: [{ action: '提交企业认证申请 REV-01', actor: '企业用户 王明', time: submittedAt }],
    }));
  }, submittedForm);
  await page.reload({ waitUntil: 'load' });
};

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files', '--disable-background-networking'] });
});

after(async () => { await browser?.close(); });

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`运营可在 ${viewport.width}px 详情页受控预览两类认证附件`, async () => {
    const page = await browser.newPage({ viewport });
    try {
      await seedPendingApplication(page);
      await page.getByRole('button', { name: '查看详情', exact: true }).click();
      if (process.env.CAPTURE_PRD_ASSET === '1' && viewport.width === 1280) {
        fs.mkdirSync(assetDir, { recursive: true });
        await page.screenshot({ path: path.join(assetDir, 'P01-08-detail.png'), animations: 'disabled' });
      }

      await page.getByRole('button', { name: '预览工商执照证明附件', exact: true }).click();
      const licenseDialog = page.getByRole('dialog', { name: '工商执照证明附件' });
      assert.equal(await licenseDialog.isVisible(), true);
      assert.match(await licenseDialog.innerText(), /营业执照[\s\S]*9144XXXXXXXXXXXXXX[\s\S]*深圳星海互动科技有限公司/);
      if (process.env.CAPTURE_PRD_ASSET === '1' && viewport.width === 1280) {
        await page.screenshot({ path: path.join(assetDir, 'P01-08-attachment.png'), animations: 'disabled' });
      }
      await licenseDialog.getByRole('button', { name: '关闭预览', exact: true }).click();
      assert.equal(await page.locator('[data-review-attachment-modal]').count(), 0);

      await page.getByRole('button', { name: '预览银行账户证明附件', exact: true }).click();
      const bankDialog = page.getByRole('dialog', { name: '银行账户证明附件' });
      assert.equal(await bankDialog.isVisible(), true);
      assert.match(await bankDialog.innerText(), /中国建设银行深圳科技园支行[\s\S]*\*\*\*\* 8899/);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      assert.equal(overflow, false);
    } finally {
      await page.close();
    }
  });
}

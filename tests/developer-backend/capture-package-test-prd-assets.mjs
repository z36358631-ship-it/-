import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const root = process.cwd();
const output = path.join(root, 'public', 'prd', 'genuine-game-distribution-phase1', 'developer-backend-final', '03');
const developer = path.join(root, 'tests', 'developer-backend', 'evidence', 'profile-v25', 'release-preparation');
const admin = path.join(root, 'tests', 'developer-backend', 'evidence', 'admin-review-completeness');

fs.mkdirSync(output, { recursive: true });

const assets = {
  '03-developer-build-upload-feishu.png': path.join(developer, 'build-upload-full-modal.png'),
  '03-developer-build-status-feishu.png': path.join(developer, 'build-test-failed.png'),
  '03-developer-version-snapshot-feishu.png': path.join(developer, 'version-snapshot-1440.png'),
  '03-admin-release-review-list-feishu.png': path.join(admin, 'release-list-1440x900.png'),
  '03-admin-build-test-blocked-feishu.png': path.join(admin, 'release-package-matrix-1440x900.png'),
  '03-admin-build-test-passed-feishu.png': path.join(admin, 'release-gate-passed-1440x900.png'),
};

for (const [name, source] of Object.entries(assets)) {
  if (!fs.existsSync(source)) throw new Error(`Missing current screenshot: ${source}`);
  fs.copyFileSync(source, path.join(output, name));
}

const imageUrl = file => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
const flow = [
  ['1', '上传包体', path.join(developer, 'build-upload-full-modal.png'), '整包或增量包'],
  ['2', '解析通过', path.join(developer, 'build-package-list.png'), '可关联商品 SKU'],
  ['3', '提交发布', path.join(developer, 'build-test-pending.png'), '必测包体进入待测试'],
  ['4', '包体测试', path.join(admin, 'release-package-matrix-1440x900.png'), '不通过则补传新包'],
  ['5', '运营审核', path.join(admin, 'drawer-fixed-state-preserved-1440x900.png'), '核对资料、SKU、发行与资质'],
  ['6', '发布通过', path.join(admin, 'release-gate-passed-1440x900.png'), '全部检查项通过'],
];
for (const [, , source] of flow) if (!fs.existsSync(source)) throw new Error(`Missing flow screenshot: ${source}`);

const cards = flow.map(([step, title, source, note], index) => `${index ? '<span class="arrow" aria-hidden="true">→</span>' : ''}<article><b>步骤 ${step}</b><img src="${imageUrl(source)}" alt="${title}"><h2>${title}</h2><p>${note}</p></article>`).join('');
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;background:#f4f7fa;color:#17364a;font-family:"Microsoft YaHei","PingFang SC",sans-serif}body{width:max-content;padding:24px 28px 28px}.head{display:flex;align-items:flex-end;gap:14px;margin-bottom:16px}.head h1{margin:0;font-size:24px}.head span{padding-bottom:2px;color:#78909f;font-size:13px}.flow{display:flex;align-items:center;gap:10px}article{width:260px;padding:10px;border:1px solid #d9e4eb;border-radius:11px;background:#fff;box-shadow:0 5px 16px rgba(29,63,83,.07)}article>b{display:inline-flex;height:22px;align-items:center;margin-bottom:8px;border-radius:99px;background:#e9f6f6;padding:0 9px;color:#15808e;font-size:11px}img{display:block;width:238px;height:138px;border:1px solid #e1e8ed;border-radius:7px;object-fit:cover;object-position:top;background:#f6f8fa}h2{margin:9px 0 2px;font-size:15px}p{margin:0;color:#7c909d;font-size:11px}.arrow{color:#3aa3ac;font-size:26px;font-weight:700}
</style></head><body><div class="head"><h1>PC 包体测试与发布审核</h1><span>测试不通过：补传新包后重新提审</span></div><main class="flow">${cards}</main></body></html>`;

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
if (!chrome) throw new Error('Chrome or Edge not found');
const browser = await chromium.launch({ headless: true, executablePath: chrome });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 420 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
  await page.screenshot({ path: path.join(output, '03-build-test-release-flow-feishu.png'), fullPage: true });
} finally {
  await browser.close();
}

process.stdout.write(`Published ${Object.keys(assets).length + 1} current PRD images to ${output}\n`);

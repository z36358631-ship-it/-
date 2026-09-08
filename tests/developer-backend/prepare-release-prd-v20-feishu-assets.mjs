import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const root = process.cwd();
const assetDir = path.join(
  root,
  'public',
  'prd',
  'genuine-game-distribution-phase1',
  'developer-backend-final',
  '03',
);

const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

if (!chrome) throw new Error('Chrome or Edge not found');

const sourceAssets = [
  '03-v19-dev-game-management.png',
  '03-v19-dev-create-game.png',
  '03-v19-dev-version-release.png',
  '03-v19-dev-builds-and-sku.png',
  '03-v19-dev-release-and-qualification.png',
  '03-v19-dev-builds.png',
  '03-v19-dev-build-upload.png',
  '03-v19-dev-release-qualification.png',
  '03-v19-dev-independent-qualification.png',
  '03-v19-dev-version-records.png',
  '03-v19-dev-version-snapshot.png',
  '03-v19-admin-release-list.png',
  '03-v19-admin-release-drawer.png',
  '03-v19-admin-package-ready.png',
  '03-v19-admin-package-passed.png',
  '03-v19-admin-qualification-list.png',
  '03-v19-admin-qualification-drawer.png',
  '03-v19-admin-audit-records.png',
];

for (const sourceName of sourceAssets) {
  const source = path.join(assetDir, sourceName);
  if (!fs.existsSync(source)) throw new Error(`Missing source asset: ${sourceName}`);
  const targetName = sourceName.replace('03-v19-', '03-v20-').replace('.png', '-feishu.png');
  fs.copyFileSync(source, path.join(assetDir, targetName));
}

function imageData(fileName) {
  return `data:image/png;base64,${fs.readFileSync(path.join(assetDir, fileName)).toString('base64')}`;
}

const flow = [
  ['01', '游戏管理', '03-v19-dev-game-management.png'],
  ['02', '添加游戏', '03-v19-dev-create-game.png'],
  ['03', '游戏资料', '03-v19-dev-version-release.png'],
  ['04', 'PC 包体', '03-v19-dev-build-upload.png'],
  ['05', '商品与 SKU', '03-v19-dev-product-sku.png'],
  ['06', '发行设置', '03-v19-dev-release-settings.png'],
  ['07', '资质认证', '03-v19-dev-release-qualification.png'],
  ['08', '提交审核', '03-v19-dev-version-release.png'],
  ['09', '进入审核队列', '03-v19-admin-release-list.png'],
  ['10', '包体测试', '03-v19-admin-package-ready.png'],
  ['11', '发布审核', '03-v19-admin-package-passed.png'],
  ['12', '发布记录', '03-v19-dev-version-records.png'],
];

for (const [, , sourceName] of flow) {
  if (!fs.existsSync(path.join(assetDir, sourceName))) {
    throw new Error(`Missing flow asset: ${sourceName}`);
  }
}

const cards = flow.map(([step, title, sourceName]) => `
  <article class="card">
    <header><b>${step}</b><strong>${title}</strong></header>
    <img src="${imageData(sourceName)}" alt="${title}">
  </article>
`).join('');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <style>
    *{box-sizing:border-box}
    html,body{margin:0;background:#f4f7fa;color:#17364a;font-family:"Microsoft YaHei","PingFang SC",sans-serif}
    body{width:1760px;padding:30px 32px 34px}
    h1{margin:0 0 18px;font-size:30px;line-height:1.25;font-weight:700}
    .flow{position:relative;display:grid;grid-template-columns:repeat(4,400px);grid-auto-rows:298px;column-gap:32px;row-gap:84px;width:1696px;height:1062px}
    .card{position:relative;z-index:2;height:298px;padding:12px;border:1px solid #d9e4eb;border-radius:14px;background:#fff;box-shadow:0 7px 20px rgba(29,63,83,.07)}
    .card header{display:flex;align-items:center;gap:10px;height:32px;margin-bottom:10px}
    .card b{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:#16a7b5;color:#fff;font-size:14px}
    .card strong{font-size:19px;line-height:1.2}
    .card img{display:block;width:374px;height:230px;border:1px solid #e2e8ed;border-radius:8px;background:#edf2f5;object-fit:cover;object-position:top}
    .card:not(:nth-of-type(4n))::after{content:"→";position:absolute;right:-27px;top:132px;width:21px;color:#2ca5ad;font-size:27px;font-weight:700;line-height:32px;text-align:center}
    .turns{position:absolute;inset:0;z-index:1;overflow:visible;pointer-events:none}
  </style>
</head>
<body>
  <h1>PC 游戏创建与发行审核流程</h1>
  <main class="flow">
    <svg class="turns" viewBox="0 0 1696 1062" aria-hidden="true">
      <defs>
        <marker id="arrowhead" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 Z" fill="#2ca5ad"></path>
        </marker>
      </defs>
      <path d="M1496 298 V340 H200 V378" fill="none" stroke="#2ca5ad" stroke-width="3" stroke-linejoin="round" marker-end="url(#arrowhead)"></path>
      <path d="M1496 680 V722 H200 V760" fill="none" stroke="#2ca5ad" stroke-width="3" stroke-linejoin="round" marker-end="url(#arrowhead)"></path>
    </svg>
    ${cards}
  </main>
</body>
</html>`;

const browser = await chromium.launch({
  headless: true,
  executablePath: chrome,
  args: ['--disable-background-networking'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1760, height: 1200 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
  await page.screenshot({
    path: path.join(assetDir, '03-v20-release-flow-feishu.png'),
    fullPage: true,
  });
  await page.close();
} finally {
  await browser.close();
}

process.stdout.write(`Prepared ${sourceAssets.length + 1} Feishu assets in ${assetDir}\n`);

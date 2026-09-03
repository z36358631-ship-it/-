import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const screenshotDir = path.join(root, 'test-results', 'developer-backend', 'screenshots-final');
const publicRoot = path.join(root, 'public', 'prd', 'genuine-game-distribution-phase1', 'developer-backend-final');
const routes = JSON.parse(fs.readFileSync(path.join(root, 'demos', '开发者后台一期', 'src', 'routes.json'), 'utf8'));
const modules = JSON.parse(fs.readFileSync(path.join(root, 'demos', '开发者后台一期', 'src', 'modules.json'), 'utf8'));
const browserCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const flowRoutes = {
  '01': ['P01-01', 'P01-03', 'P01-07', 'P01-02', 'P01-04', 'P01-05', 'P01-06', 'P01-10'],
  '02': ['P02-01', 'P02-03', 'P02-04', 'P02-05', 'P02-06'],
  '03': ['P03-01', 'P03-02', 'P03-03', 'P03-04', 'P03-06', 'P03-08', 'P03-10', 'P03-12', 'P03-13'],
  '04': ['P04-05', 'P04-06', 'P04-07', 'P04-01', 'P04-02', 'P04-03', 'P04-04', 'P04-08'],
};

function dataUrl(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

function htmlForFlow(module, routeIds) {
  const cards = routeIds.map((routeId, index) => {
    const route = routes.find(item => item.id === routeId);
    const source = path.join(screenshotDir, `1440x900-${routeId}.png`);
    if (!route || !fs.existsSync(source)) throw new Error(`Missing flow source: ${routeId}`);
    const arrow = index === routeIds.length - 1 ? '' : '<div class="arrow" aria-hidden="true">→</div>';
    return `<article class="card"><div class="step">步骤 ${index + 1}</div><img src="${dataUrl(source)}" alt="${route.title}"><h2>${route.title}</h2></article>${arrow}`;
  }).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:#f4f7fb;color:#15233b;font-family:"Microsoft YaHei","PingFang SC",sans-serif}
    body{padding:28px 32px 32px;width:max-content}.heading{display:flex;align-items:flex-end;gap:16px;margin-bottom:18px}
    h1{font-size:26px;line-height:1.25;margin:0;font-weight:700}.heading span{font-size:15px;color:#66758c;padding-bottom:3px}
    .flow{display:flex;align-items:center;gap:14px}.card{width:292px;padding:12px;background:#fff;border:1px solid #d9e1eb;border-radius:12px;box-shadow:0 8px 22px rgba(34,58,92,.08)}
    .step{display:inline-flex;align-items:center;height:24px;padding:0 9px;margin-bottom:9px;border-radius:999px;background:#eaf2ff;color:#2459c4;font-size:13px;font-weight:700}
    img{display:block;width:268px;height:168px;object-fit:cover;object-position:top;border:1px solid #e0e6ee;border-radius:7px;background:#eef2f7}
    h2{font-size:16px;line-height:1.4;margin:10px 1px 0;min-height:45px;font-weight:650}.arrow{font-size:30px;line-height:1;color:#5d7eaa;font-weight:700}
  </style></head><body><div class="heading"><h1>${module.name}</h1><span>当前对外页面主流程</span></div><main class="flow">${cards}</main></body></html>`;
}

for (const module of modules) {
  const moduleDir = path.join(publicRoot, module.id);
  fs.mkdirSync(moduleDir, { recursive: true });
  for (const route of routes.filter(item => item.moduleId === module.id)) {
    const source = path.join(screenshotDir, `1440x900-${route.id}.png`);
    if (!fs.existsSync(source)) throw new Error(`Missing route screenshot: ${route.id}`);
    fs.copyFileSync(source, path.join(moduleDir, `${route.id}.png`));
  }
}

const executablePath = browserCandidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('Chrome or Edge was not found.');
const browser = await chromium.launch({ executablePath, headless: true });
try {
  for (const module of modules) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 320 }, deviceScaleFactor: 1 });
    await page.setContent(htmlForFlow(module, flowRoutes[module.id]), { waitUntil: 'load' });
    await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
    await page.screenshot({ path: path.join(publicRoot, module.id, 'flow.png'), fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
}

const counts = Object.fromEntries(modules.map(module => [module.id, fs.readdirSync(path.join(publicRoot, module.id)).filter(file => file.endsWith('.png')).length]));
if (JSON.stringify(counts) !== JSON.stringify({ '01': 11, '02': 7, '03': 14, '04': 9 })) {
  throw new Error(`Unexpected asset counts: ${JSON.stringify(counts)}`);
}
process.stdout.write(`Published PRD assets: ${JSON.stringify(counts)}; total 41 PNG files.\n`);

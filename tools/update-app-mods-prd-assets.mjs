import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sha = process.argv[2];
assert.match(sha ?? '', /^[0-9a-f]{40}$/u, '必须传入 40 位资产提交 SHA');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prdPath = path.join(root, 'prd', 'ai生成', '【Prd】《盖世游戏》APP端MODS需求.md');
const assetDir = path.join(root, 'public', 'prd', 'app-mods');
const assetBase = `https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@${sha}/public/prd/app-mods`;
const encodedDemoPath = 'demos/Mod%E4%B8%8E%E5%8F%91%E8%A1%8C%E4%BA%BA/APP%E7%AB%AFMODS%E5%8A%9F%E8%83%BDdemo.html';
const demoUrl = `https://htmlpreview.github.io/?https://github.com/z36358631-ship-it/-/blob/${sha}/${encodedDemoPath}`;
const images = new Map([
  ['01-game-more-menu-portrait.png', '竖屏更多菜单'],
  ['08-game-more-menu-landscape.png', '横屏更多菜单'],
  ['02-browse-portrait.png', '竖屏浏览'],
  ['03-installed-portrait.png', '竖屏已安装'],
  ['04-detail-portrait.png', '竖屏 MOD 详情'],
  ['05-browse-landscape.png', '横屏浏览'],
  ['07-installed-landscape.png', '横屏已安装'],
  ['06-detail-landscape.png', '横屏 MOD 详情'],
  ['09-steam-profile-mods-portrait.png', '竖屏个人中心 MODS'],
  ['10-steam-profile-mods-landscape.png', '横屏个人中心 MODS']
]);

for (const fileName of images.keys()) {
  const filePath = path.join(assetDir, fileName);
  assert.equal(fs.existsSync(filePath), true, `截图缺失：${fileName}`);
  assert(fs.statSync(filePath).size > 12000, `截图体积异常：${fileName}`);
}

let markdown = fs.readFileSync(prdPath, 'utf8');

for (const [fileName, alt] of images) {
  if (fileName.startsWith('09-') || fileName.startsWith('10-')) continue;
  const escapedFile = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`!\\[[^\\]]+\\]\\(https://[^)]+/public/prd/app-mods/${escapedFile}\\)`, 'gu');
  assert.match(markdown, pattern, `PRD 缺少图片引用：${fileName}`);
  markdown = markdown.replace(pattern, `![${alt}](${assetBase}/${fileName})`);
}

const profilePattern = /^\|4\.2\.8 Steam 个人中心 MODS\|[^|]*\|(.*)\|$/mu;
const profileMatch = markdown.match(profilePattern);
assert(profileMatch, '找不到 Steam 个人中心 MODS 页面行');
const profileImages = [
  `![竖屏个人中心 MODS](${assetBase}/09-steam-profile-mods-portrait.png)`,
  '*图 4.2.8-1：竖屏 Steam 个人中心 MODS。*',
  `![横屏个人中心 MODS](${assetBase}/10-steam-profile-mods-landscape.png)`,
  '*图 4.2.8-2：横屏 Steam 个人中心 MODS。*'
].join('<br>');
markdown = markdown.replace(profilePattern, `|4.2.8 Steam 个人中心 MODS|${profileImages}|${profileMatch[1]}|`);

const demoPattern = /`https:\/\/[^`\s]+APP%E7%AB%AFMODS%E5%8A%9F%E8%83%BDdemo\.html`/u;
assert.match(markdown, demoPattern, '找不到固定 Demo 地址');
markdown = markdown.replace(demoPattern, `\`${demoUrl}\``);

fs.writeFileSync(prdPath, markdown, 'utf8');
console.log(`PASS: PRD Demo 与 ${images.size} 张图片已固定到 ${sha}`);

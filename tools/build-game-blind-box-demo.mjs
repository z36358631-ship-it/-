import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const templatePath = path.join(root, 'demos', '首页与探索', '游戏盲盒demo.template.html');
const outputPath = path.join(root, 'demos', '首页与探索', '游戏盲盒demo.html');
const mediaRoot = path.join(root, '.agents', 'skills', 'gamehub-app-ui', 'assets', 'visual-sources');

const assets = {
  '__ASSET_HADES__': { file: path.join(root, 'demos', '适合本机', 'assets', 'compatibility', 'hades.jpg'), mime: 'image/jpeg' },
  '__ASSET_SILKSONG__': { file: path.join(mediaRoot, 'library-portrait--cover.webp'), mime: 'image/webp' },
  '__ASSET_BEAMNG__': { file: path.join(mediaRoot, 'home-portrait--game-a.webp'), mime: 'image/webp' },
  '__ASSET_RE4__': { file: path.join(mediaRoot, 'home-portrait--game-b.webp'), mime: 'image/webp' },
  '__ASSET_STEAM_LOGO__': { file: path.join(root, 'Mac端demo', 'GameHubOFAnti copy', 'assets', 'steam_logo_official.svg'), mime: 'image/svg+xml' },
  '__ASSET_EPIC_LOGO__': { file: path.join(root, 'PPT技能', 'ppt-master-main', 'skills', 'ppt-master', 'templates', 'icons', 'simple-icons', 'epicgames.svg'), mime: 'image/svg+xml' },
};

let html = fs.readFileSync(templatePath, 'utf8');
for (const [placeholder, asset] of Object.entries(assets)) {
  const binary = fs.readFileSync(asset.file);
  html = html.replaceAll(placeholder, `data:${asset.mime};base64,${binary.toString('base64')}`);
}

const unresolved = html.match(/__ASSET_[A-Z_]+__/g) ?? [];
if (unresolved.length) throw new Error(`Unresolved assets: ${unresolved.join(', ')}`);
if (/https?:\/\//i.test(html)) throw new Error('Built demo contains a remote HTTP dependency');
if (/<(?:iframe|canvas)\b/i.test(html)) throw new Error('Built demo contains a forbidden iframe or canvas element');

fs.writeFileSync(outputPath, html, 'utf8');
console.log(JSON.stringify({ outputPath, bytes: Buffer.byteLength(html), assets: Object.values(assets).map(asset => asset.file) }));

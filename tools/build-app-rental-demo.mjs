import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const templatePath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.template.html');
const outputPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.html');
const sourceAssetDir = path.join(root, 'demos', 'APP租号功能', 'assets', 'source');
const assets = {
  APP_PORTRAIT_HOME: path.join(sourceAssetDir, 'portrait-home.jpg'),
  APP_PORTRAIT_PLAY: path.join(sourceAssetDir, 'portrait-play.jpg'),
  APP_PORTRAIT_LIBRARY: path.join(sourceAssetDir, 'portrait-library.jpg'),
  APP_PORTRAIT_PROFILE: path.join(sourceAssetDir, 'portrait-profile.jpg'),
  APP_LANDSCAPE_LIBRARY: path.join(sourceAssetDir, 'landscape-library.jpg'),
  APP_LANDSCAPE_STEAM_LIBRARY: path.join(sourceAssetDir, 'landscape-steam-library.jpg'),
  APP_LANDSCAPE_PLAY: path.join(sourceAssetDir, 'landscape-play.jpg'),
};

function dataUrl(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

let html = fs.readFileSync(templatePath, 'utf8');
for (const [key, filePath] of Object.entries(assets)) {
  if (!fs.existsSync(filePath)) throw new Error(`素材不存在：${filePath}`);
  const placeholder = `{{${key}}}`;
  if (!html.includes(placeholder)) throw new Error(`模板缺少素材占位符：${placeholder}`);
  html = html.replaceAll(placeholder, dataUrl(filePath));
}
if (/\{\{[A-Z0-9_]+\}\}/.test(html)) throw new Error('模板仍存在未替换素材');
fs.writeFileSync(outputPath, html);
process.stdout.write(`BUILD ${path.relative(root, outputPath)} ${Buffer.byteLength(html)} bytes\n`);

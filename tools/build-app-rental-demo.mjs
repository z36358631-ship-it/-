import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const templatePath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.template.html');
const outputPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.html');
const assets = {
  APP_PORTRAIT_HOME: path.join(root, 'APP核心优化', '竞品对比', '盖世游戏APP', '20260618-120632.jpg'),
  APP_PORTRAIT_PLAY: path.join(root, 'APP核心优化', '竞品对比', '盖世游戏APP', '20260521-152021.jpg'),
  APP_PORTRAIT_LIBRARY: path.join(root, 'APP核心优化', '竞品对比', '盖世游戏APP', '20260521-152042.jpg'),
  APP_PORTRAIT_PROFILE: path.join(root, 'APP核心优化', '竞品对比', '盖世游戏APP', '20260521-152054.jpg'),
  APP_LANDSCAPE_LIBRARY: path.join(root, 'APP核心优化', '竞品对比', '盖世游戏APP', '20260521-152120.jpg'),
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

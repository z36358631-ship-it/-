import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const templatePath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.template.html');
const outputPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.html');
const annotationPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能-标注版.html');
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

if (fs.existsSync(annotationPath)) {
  const normalStyle = html.match(/<style>([\s\S]*?)<\/style>/)?.[1].trimEnd();
  const normalScript = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)?.[1].trim();
  if (!normalStyle || !normalScript) throw new Error('普通 Demo 缺少可同步的样式或业务脚本');

  let annotation = fs.readFileSync(annotationPath, 'utf8');
  const styleMarker = '    /* 交互标注文档壳层：完整 Demo 直接内嵌，不使用 iframe。 */';
  const scriptMarkerPattern = /<script>\r?\n\s*const ANNOTATION_GROUPS = Object\.freeze\(\[/;
  if (!annotation.includes(styleMarker) || !scriptMarkerPattern.test(annotation)) throw new Error('标注版缺少稳定同步标记');

  annotation = annotation.replace(
    /<style>[\s\S]*?(?=    \/\* 交互标注文档壳层：完整 Demo 直接内嵌，不使用 iframe。 \*\/)/,
    `<style>${normalStyle}\n\n`,
  );
  annotation = annotation.replace(
    /  <script>\s*const ASSETS[\s\S]*?  <\/script>(?=\s*<script>\s*const ANNOTATION_GROUPS)/,
    `  <script>${normalScript}</script>`,
  );
  fs.writeFileSync(annotationPath, annotation);
  process.stdout.write(`SYNC ${path.relative(root, annotationPath)} ${Buffer.byteLength(annotation)} bytes\n`);
}

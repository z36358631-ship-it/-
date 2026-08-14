import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(scriptDir, '..');
const workspace = path.resolve(skillDir, '..', '..', '..');
const templatePath = path.join(skillDir, 'assets', 'app-demo-template.html');
const targetPath = path.join(workspace, 'demos', 'UI规范', '盖世游戏APP-UI模板与页面配方预览.html');
const screenCatalog = JSON.parse(fs.readFileSync(path.join(skillDir, 'assets', 'screen-catalog.json'), 'utf8'));
const figmaComponents = JSON.parse(fs.readFileSync(path.join(skillDir, 'assets', 'figma-components.json'), 'utf8'));
const visualConfig = JSON.parse(fs.readFileSync(path.join(skillDir, 'assets', 'visual-baselines.json'), 'utf8'));
const reportPath = path.join(skillDir, 'assets', 'visual-report.json');
const visualReport = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

function mime(file) {
  const extension = path.extname(file).toLowerCase();
  return ({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.otf':'font/otf','.ttf':'font/ttf'})[extension] || 'application/octet-stream';
}

function dataUri(file) {
  return `data:${mime(file)};base64,${fs.readFileSync(file).toString('base64')}`;
}

function addIfExists(assets, key, file) {
  if (fs.existsSync(file)) assets[key] = dataUri(file);
}

const assets = {};
for (const screen of screenCatalog.screens) {
  const source = path.join(workspace, ...screen.sourcePath.split('/'));
  if (!fs.existsSync(source)) throw new Error(`screen source missing: ${source}`);
  assets[`screen:${screen.id}`] = dataUri(source);
}

for (const page of visualConfig.pages) {
  const visualSourceDir = path.join(skillDir, 'assets', 'visual-sources');
  addIfExists(assets, `evidence:${page.key}:original`, path.join(visualSourceDir, `${page.key}-original.webp`));
  for (const mediaKey of Object.keys(page.media || {})) {
    addIfExists(assets, `media:${page.key}:${mediaKey}`, path.join(visualSourceDir, `${page.key}--${mediaKey}.webp`));
  }
  addIfExists(assets, `evidence:${page.key}:implementation`, path.join(workspace, '.tmp', 'gamehub-app-ui', 'visual-captures', `${page.key}-implementation.png`));
  addIfExists(assets, `evidence:${page.key}:overlay`, path.join(workspace, '.tmp', 'gamehub-app-ui', 'visual-overlays', `${page.key}-overlay.png`));
  addIfExists(assets, `evidence:${page.key}:difference`, path.join(workspace, '.tmp', 'gamehub-app-ui', 'visual-diffs', `${page.key}-difference.png`));
  addIfExists(assets, `evidence:${page.key}:heatmap`, path.join(workspace, '.tmp', 'gamehub-app-ui', 'visual-heatmaps', `${page.key}-heatmap.png`));
}

const fontPath = process.env.GAMEHUB_FONT_PATH || 'C:/Windows/Fonts/NotoSansSC-VF.ttf';
if (!fs.existsSync(fontPath)) throw new Error(`preview font missing: ${fontPath}`);
const sourceFontPath = 'C:/Windows/Fonts/SourceHanSansCN-Normal.ttf';
if (!fs.existsSync(sourceFontPath)) throw new Error(`preview source font missing: ${sourceFontPath}`);
let html = fs.readFileSync(templatePath, 'utf8');
const replacements = {
  '__GAMEHUB_FONT__': dataUri(fontPath),
  '__GAMEHUB_SOURCE_FONT__': dataUri(sourceFontPath),
  '__SCREEN_CATALOG__': JSON.stringify(screenCatalog).replaceAll('<', '\\u003c'),
  '__FIGMA_COMPONENTS__': JSON.stringify(figmaComponents).replaceAll('<', '\\u003c'),
  '__VISUAL_CONFIG__': JSON.stringify(visualConfig).replaceAll('<', '\\u003c'),
  '__VISUAL_REPORT__': JSON.stringify(visualReport).replaceAll('<', '\\u003c'),
  '__EMBEDDED_ASSETS__': JSON.stringify(assets).replaceAll('<', '\\u003c')
};
for (const [token, value] of Object.entries(replacements)) html = html.replace(token, value);
if (/__[A-Z0-9_]+__/.test(html)) throw new Error('unresolved preview token');
if (/<iframe\b/i.test(html) || /(src|href)=["']https?:\/\//i.test(html)) throw new Error('preview contains forbidden remote content');
if (/<canvas\b/i.test(html)) throw new Error('preview must not use canvas');
fs.mkdirSync(path.dirname(targetPath), {recursive:true});
fs.writeFileSync(targetPath, html.replace(/\r\n/g, '\n'), 'utf8');
console.log(`WROTE ${targetPath}`);
console.log(`PASS previewAssets (screens ${screenCatalog.screens.length}/45, components ${figmaComponents.components.length}, evidence ${visualConfig.pages.length})`);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(scriptDir, '..');
const workspace = path.resolve(skillDir, '..', '..', '..');
const source = path.join(skillDir, 'assets', 'app-demo-template.html');
const target = path.join(workspace, 'demos', 'UI规范', '盖世游戏APP-UI模板与页面配方预览.html');
const config = JSON.parse(fs.readFileSync(path.join(skillDir, 'assets', 'visual-baselines.json'), 'utf8'));
const reportPath = path.join(skillDir, 'assets', 'visual-report.json');
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const mime = name => name.endsWith('.webp') ? 'image/webp' : name.endsWith('.otf') ? 'font/otf' : 'image/png';
const uri = file => `data:${mime(file)};base64,${fs.readFileSync(file).toString('base64')}`;
const assets = {};
for (const page of config.pages) {
  const original = path.join(skillDir, 'assets', 'visual-sources', `${page.key}-original.webp`);
  if (!fs.existsSync(original)) throw new Error(`visual source missing: ${original}`);
  assets[`${page.key}:original`] = uri(original);
  for (const mediaKey of Object.keys(page.media || {})) {
    const media = path.join(skillDir, 'assets', 'visual-sources', `${page.key}--${mediaKey}.webp`);
    if (!fs.existsSync(media)) throw new Error(`visual media crop missing: ${media}`);
    assets[`${page.key}:media:${mediaKey}`] = uri(media);
  }
  const diff = path.join(workspace, '.tmp', 'gamehub-app-ui', 'visual-diffs', `${page.key}-difference.png`);
  if (fs.existsSync(diff)) assets[`${page.key}:difference`] = uri(diff);
}

if (!fs.existsSync(source)) throw new Error(`template missing: ${source}`);
let html = fs.readFileSync(source, 'utf8');
const fontPath = 'C:/Windows/Fonts/Noto Sans SC (TrueType).otf';
if (!fs.existsSync(fontPath)) throw new Error(`GameHub preview font missing: ${fontPath}`);
html = html.replace('__GAMEHUB_FONT__', uri(fontPath));
html = html.replace('__VISUAL_CONFIG__', JSON.stringify(config).replaceAll('<','\\u003c'));
html = html.replace('__VISUAL_REPORT__', JSON.stringify(report).replaceAll('<','\\u003c'));
html = html.replace('__VISUAL_ASSETS__', JSON.stringify(assets).replaceAll('<','\\u003c'));
if (/<iframe\b/i.test(html) || /(src|href)=["']https?:\/\//i.test(html)) throw new Error('template contains forbidden remote content');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, html.replace(/\r\n/g, '\n'), 'utf8');
console.log(`WROTE ${target}`);

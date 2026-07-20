import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAssets } from './android-ad-demo-assets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = path.join(root, 'demos', 'Android广告接入-交互标注版.template.html');
const outputPath = path.join(root, 'demos', 'Android广告接入-交互标注版.html');
const template = fs.readFileSync(templatePath, 'utf8');
const bundle = `window.DEMO_ASSETS=${JSON.stringify(loadAssets())};`;

if (!template.includes('/* ASSET_BUNDLE */')) throw new Error('Template asset marker missing');
fs.writeFileSync(outputPath, template.replace('/* ASSET_BUNDLE */', bundle), 'utf8');
console.log(`Built ${path.relative(root, outputPath)}`);

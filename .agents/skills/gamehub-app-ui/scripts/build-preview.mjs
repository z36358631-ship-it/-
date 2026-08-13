import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(scriptDir, '..');
const workspace = path.resolve(skillDir, '..', '..', '..');
const source = path.join(skillDir, 'assets', 'app-demo-template.html');
const target = path.join(workspace, 'demos', 'UI规范', '盖世游戏APP-UI模板与页面配方预览.html');

if (!fs.existsSync(source)) throw new Error(`template missing: ${source}`);
const html = fs.readFileSync(source, 'utf8');
if (/<iframe\b/i.test(html) || /(src|href)=["']https?:\/\//i.test(html)) {
  throw new Error('template contains forbidden remote content');
}
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, html.replace(/\r\n/g, '\n'), 'utf8');
console.log(`WROTE ${target}`);

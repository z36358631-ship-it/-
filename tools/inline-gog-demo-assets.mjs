import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'demos', 'PC与Mac端', '盖世游戏GOG平台接入-交互标注版.html');
let html = await fs.readFile(target, 'utf8');
const urls = [...new Set(html.match(/https:\/\/cdn\.cloudflare\.steamstatic\.com\/[^'"\s<]+/g) || [])];

for (const url of urls) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  const mime = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  const data = Buffer.from(await response.arrayBuffer()).toString('base64');
  html = html.replaceAll(url, `data:${mime};base64,${data}`);
  console.log(`INLINED ${url} (${data.length} base64 chars)`);
}

await fs.writeFile(target, html, 'utf8');
console.log(`PASS inlineGogDemoAssets (${urls.length} assets)`);

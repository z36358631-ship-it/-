import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(demoDir, 'src');
const read = (...parts) => fs.readFileSync(path.join(srcDir, ...parts), 'utf8').trim();
const sharedCss = read('next-shared', 'styles.css');
const sharedRuntime = read('next-shared', 'context.js');
const modules = [
  { source:'demo06-next', output:'06-游戏创建与发行资料demo.html', title:'游戏创建与发行资料' },
  { source:'demo07', output:'07-开发接入与资源中心demo.html', title:'开发接入与资源中心' },
  { source:'demo08', output:'08-消息通知中心demo.html', title:'消息通知中心' },
];

for (const module of modules) {
  const css = `${sharedCss}\n\n${read(module.source, 'styles.css')}`;
  const runtime = `${sharedRuntime}\n\n${read(module.source, 'app.js')}`;
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${module.title}｜盖世游戏开发者平台</title>
  <style>${css}</style>
</head>
<body>
  <div id="app"></div>
  <script>${runtime}</script>
</body>
</html>`;
  fs.writeFileSync(path.join(demoDir, module.output), html, 'utf8');
  process.stdout.write(`Built ${module.output}.\n`);
}

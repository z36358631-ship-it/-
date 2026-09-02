import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(demoDir, 'src');
const read = (...parts) => fs.readFileSync(path.join(srcDir, ...parts), 'utf8');
const readJson = file => JSON.parse(read(file));
const modules = readJson('modules.json');
const routes = readJson('routes.json');
const fixture = readJson('fixtures.json');
const cssFiles = ['tokens.css', 'shell.css', 'components.css', 'templates.css'];
const runtimeFiles = ['icons.js', 'components.js', 'templates.js', 'shell.js', 'app.js'];
const css = cssFiles.map(file => read('styles', file).trim()).join('\n\n');
const runtime = runtimeFiles.map(file => read('runtime', file).trim()).join('\n\n');
const escapeJson = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const documentHtml = ({ title, module, pageRoutes, overview }) => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="demo-hash-example" content="#/P01-02?role=developer&state=default"><title>${title}</title><style>${css}</style></head><body>
<div id="app" data-overview="${overview ? 'true' : 'false'}"></div>
<script id="demo-module" type="application/json">${escapeJson(module)}</script>
<script id="demo-modules" type="application/json">${escapeJson(modules)}</script>
<script id="demo-routes" type="application/json">${escapeJson(pageRoutes)}</script>
<script id="demo-fixture" type="application/json">${escapeJson(fixture)}</script>
<script>${runtime}</script></body></html>
`;

const overviewHtml = documentHtml({
  title: '开发者后台一期评审总览',
  module: { id: 'overview', name: '开发者后台一期评审总览', defaultRoute: routes[0].id },
  pageRoutes: routes,
  overview: true,
});
fs.writeFileSync(path.join(demoDir, '开发者后台一期总览demo.html'), overviewHtml, 'utf8');

for (const module of modules) {
  const moduleRoutes = routes.filter(route => route.moduleId === module.id);
  const html = documentHtml({ title: `${module.name}｜开发者后台一期`, module, pageRoutes: moduleRoutes, overview: false });
  fs.writeFileSync(path.join(demoDir, module.output), html, 'utf8');
}

process.stdout.write(`Built ${modules.length + 1} self-contained HTML files with ${routes.length} routes.\n`);

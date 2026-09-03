import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLatestPrdFixture } from './src/prd-fixture.mjs';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(demoDir, 'src');
const repoRoot = path.resolve(demoDir, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(srcDir, ...parts), 'utf8');
const readJson = file => JSON.parse(read(file));
const modules = readJson('modules.json');
const { routes, fixture, contract: prdContract } = loadLatestPrdFixture({ repoRoot, demoDir });
const cssFiles = ['tokens.css', 'shell.css', 'components.css', 'templates.css'];
const runtimeFiles = ['icons.js', 'components.js', 'templates.js', 'shell.js', 'app.js'];
const css = cssFiles.map(file => read('styles', file).trim()).join('\n\n');
const runtime = runtimeFiles.map(file => read('runtime', file).trim()).join('\n\n')
  .replaceAll('data-demo-action', 'data-portal-action')
  .replaceAll('demoAction', 'portalAction');
const escapeJson = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const publicCopy = value => String(value || '')
  .replaceAll('为一个 Game 创建一期唯一 APPID', '为一个 Game 创建唯一 APPID')
  .replaceAll('一期', '当前版本')
  .replaceAll('门禁', '检查项');
const publicFixtureFor = pageRoutes => ({
  accounts: Object.fromEntries(Object.entries(fixture.accounts || {}).map(([role, account]) => [role, {
    name: account.name,
    roleName: account.roleName,
  }])),
  context: {
    vendorId: fixture.context?.vendorId,
    vendorName: fixture.context?.vendorName,
    gameId: fixture.context?.gameId,
    gameName: fixture.context?.gameName,
    versionId: fixture.context?.versionId,
    versionName: fixture.context?.versionName,
    appId: fixture.context?.appId,
    campaignId: fixture.context?.campaignId,
    querySnapshotId: fixture.context?.querySnapshotId,
  },
  helpCenter: fixture.helpCenter,
  pages: Object.fromEntries(pageRoutes.map(route => {
    const page = fixture.pages[route.id] || {};
    const publicPage = {
      summary: publicCopy(page.summary),
      status: page.status,
      primaryAction: page.primaryAction,
      primaryActionDisabled: Boolean(page.primaryActionDisabled),
      actions: page.actions || [],
    };
    if (page.cdkeySelfService) publicPage.cdkeySelfService = page.cdkeySelfService;
    return [route.id, publicPage];
  })),
});
const documentHtml = ({ title, module, pageRoutes }) => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}</style></head><body>
<div id="app"></div>
<script id="portal-module" type="application/json">${escapeJson(module)}</script>
<script id="portal-modules" type="application/json">${escapeJson(modules)}</script>
<script id="portal-routes" type="application/json">${escapeJson(pageRoutes)}</script>
<script id="portal-data" type="application/json">${escapeJson(publicFixtureFor(pageRoutes))}</script>
<script>${runtime}</script></body></html>
`;

for (const module of modules) {
  const moduleRoutes = routes.filter(route => route.moduleId === module.id);
  const html = documentHtml({ title: `${module.name}｜盖世游戏开发者平台`, module, pageRoutes: moduleRoutes });
  fs.writeFileSync(path.join(demoDir, module.output), html, 'utf8');
}

process.stdout.write(`Latest PRD contract verified: ${prdContract.sourceFiles.length} documents, ${routes.length} pages (${prdContract.countText}), version ${prdContract.version}.\n`);
process.stdout.write(`Built ${modules.length} public-facing self-contained HTML files with ${routes.length} routes.\n`);

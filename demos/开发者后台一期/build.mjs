import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(demoDir, 'src');
const repoRoot = path.resolve(demoDir, '..', '..');
const figmaDir = path.join(repoRoot, 'Figma', '开发者后台一期');
const read = (...parts) => fs.readFileSync(path.join(srcDir, ...parts), 'utf8');
const readJson = file => JSON.parse(read(file));
const readRepoJson = (...parts) => JSON.parse(fs.readFileSync(path.join(repoRoot, ...parts), 'utf8'));
const modules = readJson('modules.json');
const routes = readJson('routes.json');
const fixture = readJson('fixtures.json');
const figmaPageMap = readRepoJson('Figma', '开发者后台一期', 'figma-page-map.json');
const frameMap = readRepoJson('Figma', '开发者后台一期', 'frame-map.json');
const figmaEvidence = readRepoJson('Figma', '开发者后台一期', 'evidence', 'evidence-manifest.json');
const cssFiles = ['tokens.css', 'shell.css', 'components.css', 'templates.css'];
const runtimeFiles = ['icons.js', 'components.js', 'templates.js', 'shell.js', 'app.js'];
const css = cssFiles.map(file => read('styles', file).trim()).join('\n\n');
const runtime = runtimeFiles.map(file => read('runtime', file).trim()).join('\n\n');
const escapeJson = value => JSON.stringify(value).replaceAll('<', '\\u003c');

function requireEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Figma contract mismatch: ${label}; expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function verifyFigmaContract() {
  requireEqual(
    figmaPageMap.pages.map(page => page.id),
    ['00', '01', '02', '03', '04', 'components'],
    'formal page order',
  );

  const businessPages = figmaPageMap.pages.filter(page => page.kind === 'business');
  requireEqual(
    businessPages.map(page => page.moduleId),
    modules.map(module => module.id),
    'business page modules',
  );

  const businessSections = frameMap.sections.filter(section => section.kind === 'business');
  const frames = businessSections.flatMap(section => section.frames);
  requireEqual(frames.length, 37, 'business frame count');
  requireEqual(routes.length, 37, 'route count');

  const counts = businessSections.map(section => section.frames.length);
  requireEqual(counts, [9, 6, 13, 9], 'module frame counts');
  requireEqual(frameMap.totals.byModule, { '01': 9, '02': 6, '03': 13, '04': 9 }, 'frame map totals');

  const frameById = new Map(frames.map(frame => [frame.id, frame]));
  requireEqual(frameById.size, frames.length, 'unique Figma frame ids');

  for (const route of routes) {
    const frame = frameById.get(route.id);
    if (!frame) throw new Error(`Figma contract mismatch: missing frame ${route.id}`);
    for (const key of ['moduleId', 'title', 'role', 'templateId']) {
      requireEqual(frame[key], route[key], `${route.id}.${key}`);
    }
    requireEqual(frame.size, { width: 1440, height: 900 }, `${route.id}.size`);
  }

  if (!fs.existsSync(figmaDir)) throw new Error('Figma contract mismatch: delivery directory is missing');
  const expectedHashes = Object.entries(figmaEvidence.source?.sha256 || {});
  requireEqual(expectedHashes.length, 5, 'confirmed Figma source hash count');
  for (const [fileName, expectedHash] of expectedHashes) {
    const sourcePath = path.join(figmaDir, 'source', 'figma-pages', fileName);
    if (!fs.existsSync(sourcePath)) throw new Error(`Figma contract mismatch: missing confirmed source ${fileName}`);
    const actualHash = createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
    requireEqual(actualHash, String(expectedHash).toLowerCase(), `${fileName}.sha256`);
  }

  return { moduleCounts: counts.join('/'), sourceHashCount: expectedHashes.length };
}

const verifiedContract = verifyFigmaContract();
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

process.stdout.write(`Figma contract verified: ${figmaPageMap.pages.length} pages, ${routes.length} frames (${verifiedContract.moduleCounts}), ${verifiedContract.sourceHashCount} source hashes.\n`);
process.stdout.write(`Built ${modules.length + 1} self-contained HTML files with ${routes.length} routes.\n`);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const sourceFile = path.join(demoDir, '发行平台运营后台demo.html');
const legacyOutputFile = path.join(demoDir, '发行平台运营后台财务整合demo.html');
const modelFile = path.join(demoDir, 'src', 'demo16', 'model.js');
const appFile = path.join(demoDir, 'src', 'demo16', 'app.js');
const styleFile = path.join(demoDir, 'src', 'demo16', 'styles.css');
const ledgerFile = path.join(demoDir, 'src', 'finance-ledger', 'model.js');
const statementsFile = path.join(demoDir, 'src', 'finance-statements', 'model.js');

const read = file => fs.readFileSync(file, 'utf8');
const replaceJsonTextarea = (html, id, update) => {
  const pattern = new RegExp(`(<textarea id="${id}" hidden aria-hidden="true">)([\\s\\S]*?)(</textarea>)`);
  const match = html.match(pattern);
  if (!match) throw new Error(`未找到 ${id}`);
  const value = JSON.parse(match[2]);
  update(value);
  return html.replace(pattern, (_matched, start, _body, end) => `${start}${JSON.stringify(value)}${end}`);
};

let html = read(sourceFile);

const replaceMarkedBlock = (source, startMarker, endMarker, content, beforeMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  let clean = source;
  if (start >= 0 && end > start) {
    const before = source.slice(0, start).replace(/[ \t]*(?:\r?\n)+$/, '\n');
    const after = source.slice(end + endMarker.length).replace(/^(?:[ \t]*\r?\n)+/, '');
    clean = `${before}${after}`;
  }
  const insertAt = clean.lastIndexOf(beforeMarker);
  if (insertAt < 0) throw new Error(`未找到注入位置 ${beforeMarker}`);
  return `${clean.slice(0, insertAt)}${startMarker}\n${content}\n${endMarker}\n${clean.slice(insertAt)}`;
};

html = replaceJsonTextarea(html, 'portal-routes', routes => {
  if (!routes.some(route => route.id === 'P16-01')) {
    routes.push({ id:'P16-01', moduleId:'01', templateId:'FINANCE_OPS', role:'operations', title:'财务结算' });
  }
});

html = replaceJsonTextarea(html, 'portal-data', data => {
  data.pages ||= {};
  data.pages['P16-01'] = {
    summary:'按月查询并导出游戏结算记录，供财务线下对账和打款。',
    status:'月度台账',
    primaryAction:'',
    primaryActionDisabled:true,
    actions:[],
  };
});

const styles = read(styleFile);
html = replaceMarkedBlock(
  html,
  '<!-- finance-operations-style:start -->',
  '<!-- finance-operations-style:end -->',
  `<style>\n${styles}\n</style>`,
  '</head>',
);

const applicationMarker = '(function startApplication(namespace) {';
const markerIndex = html.lastIndexOf(applicationMarker);
if (markerIndex < 0) throw new Error('未找到主应用启动位置');

const injectedScript = `${read(ledgerFile)}\n\n${read(statementsFile)}\n\n${read(modelFile)}\n\n${read(appFile)}\n\n`;
html = replaceMarkedBlock(
  html,
  '/* finance-operations-runtime:start */',
  '/* finance-operations-runtime:end */',
  injectedScript,
  applicationMarker,
);

fs.writeFileSync(sourceFile, html, 'utf8');
fs.writeFileSync(legacyOutputFile, html, 'utf8');
console.log(`已更新主运营后台：${sourceFile}`);
console.log(`已同步兼容入口：${legacyOutputFile}`);

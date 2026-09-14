import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const sourceFile = path.join(demoDir, '发行平台运营后台demo.html');
const outputFile = path.join(demoDir, '发行平台运营后台财务整合demo.html');
const modelFile = path.join(demoDir, 'src', 'demo16', 'model.js');
const appFile = path.join(demoDir, 'src', 'demo16', 'app.js');
const styleFile = path.join(demoDir, 'src', 'demo16', 'styles.css');
const ledgerFile = path.join(demoDir, 'src', 'finance-ledger', 'model.js');

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
if (!html.includes('/* 运营后台财务结算：沿用发行平台后台浅色框架 */')) {
  html = html.replace('</head>', `<style>\n${styles}\n</style></head>`);
}

const applicationMarker = '(function startApplication(namespace) {';
const markerIndex = html.lastIndexOf(applicationMarker);
if (markerIndex < 0) throw new Error('未找到主应用启动位置');

const injectedScript = `${read(ledgerFile)}\n\n${read(modelFile)}\n\n${read(appFile)}\n\n`;
html = `${html.slice(0, markerIndex)}${injectedScript}${html.slice(markerIndex)}`;

fs.writeFileSync(outputFile, html, 'utf8');
console.log(`已生成：${outputFile}`);

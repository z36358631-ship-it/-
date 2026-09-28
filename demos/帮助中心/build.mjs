import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const asset=(f,mime)=>`data:${mime};base64,${fs.readFileSync(path.join(dir,'assets',f)).toString('base64')}`;
const icons=Object.fromEntries(['account','mode','gift','bell','sound','shield','storage','download','feedback','info','back','arrow'].map(n=>[n,asset(n+'.png','image/png')]));
const globals=`window.HELP_ASSETS=${JSON.stringify(icons)};window.HELP_DEMO_IMAGE=${JSON.stringify(asset('example.png','image/png'))};window.HELP_DEMO_VIDEO=${JSON.stringify(asset('example.webm','video/webm'))};`;
let html=read('src/shell.html');
const parts={STYLES:read('src/app.css')+'\n'+read('src/admin.css'),ASSETS:globals,STORE:read('src/store.js'),ADMIN:read('src/admin.js'),APP:read('src/app.js')};
for(const [key,value]of Object.entries(parts))html=html.replace(`/*@@${key}@@*/`,()=>value);
if(/\/\*@@/.test(html))throw Error('Unresolved template');
fs.mkdirSync(path.join(dir,'evidence'),{recursive:true});
fs.writeFileSync(path.join(dir,'evidence/integration-demo.html'),html);
const front=html.replace('<button data-surface="admin" aria-pressed="false">运营后台</button>','')
 .replace('后台发布后可在 App 查看','前端阅读演示')
 .replace(`<script>${parts.ADMIN}</script>`,'<script>window.HelpAdmin={mount(){},unmount(){}};</script>')
 .replace(parts.STYLES,parts.STYLES.replace(read('src/admin.css'),''));
fs.writeFileSync(path.join(dir,'帮助中心demo.html'),front);
const admin=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>盖世游戏 · 帮助中心后台</title><style>html{color-scheme:light;background:#f5f6f8}body{margin:0}.ha{min-height:100vh!important;border-radius:0!important}*{box-sizing:border-box}${read('src/admin.css')}</style></head><body><main id="admin-stage"></main><script>${globals}</script><script>${parts.STORE}</script><script>${parts.ADMIN}</script><script>HelpAdmin.mount(document.getElementById('admin-stage'));document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video').forEach(v=>v.pause());});</script></body></html>`;
const adminForDelivery=admin.replace('<main id="admin-stage">','<div style="padding:10px 24px;background:#1d2534;color:#bcc6d5;font:12px sans-serif">独立后台演示 · 数据仅保留在本页面，发布不更新另一份前端 Demo，刷新恢复示例。</div><main id="admin-stage">');
fs.writeFileSync(path.join(dir,'帮助中心后台demo.html'),adminForDelivery);
console.log(`Built App (${Buffer.byteLength(front)} bytes) and independent admin (${Buffer.byteLength(admin)} bytes).`);

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const assetFiles={logo:'gamehub-logo.svg',steam:'steam.svg',epic:'epicgames.svg',stardew:'stardew.jpg',elden:'elden-ring.jpg',hades:'hades.jpg',cyber:'cyberpunk-2077.jpg',wukong:'black-myth-wukong.jpg',hero:'hero.jpg'};
const assets=Object.fromEntries(Object.entries(assetFiles).map(([k,v])=>[k,`data:${v.endsWith('.svg')?'image/svg+xml':'image/jpeg'};base64,${fs.readFileSync(path.join(dir,'assets',v)).toString('base64')}`]));
const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const legal=fs.readFileSync(path.join(dir,'../steam-integration-20261028/免责声明.md'),'utf8').split(/\r?\n/).filter(Boolean).map(l=>{
 const n=(l.match(/^#+/)||[''])[0].length;
 const t=escape(l.replace(/^#+\s*/,'' )).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\[([^\]]+)\]\((https:[^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
 return n?`<h${Math.min(n,4)}>${t}</h${Math.min(n,4)}>`:`<p>${t}</p>`;
}).join('\n');
const script=s=>s.replace(/<\/script/gi,'<\\/script');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>GameHub Mac · Steam 接入 Demo</title><style>${read('host.css')}\n${read('steam.css')}\n${read('controls.css')}</style></head><body><div id="host-root"></div><div id="steam-root"></div><aside id="demo-controls"></aside><script>window.MAC_ASSETS=${JSON.stringify(assets)};window.MAC_LEGAL=${JSON.stringify(legal)};</script><script>${script(read('host.js'))}</script><script>${script(read('steam.js'))}</script><script>${script(read('controls.js'))}</script></body></html>`;
fs.writeFileSync(path.join(dir,'MacSteam接入Demo.html'),html);
const pub=path.resolve(dir,'../../public/steam-mac-integration');fs.mkdirSync(pub,{recursive:true});fs.writeFileSync(path.join(pub,'demo.html'),html);
console.log('Built Mac demo: '+Math.round(Buffer.byteLength(html)/1024)+' KB');

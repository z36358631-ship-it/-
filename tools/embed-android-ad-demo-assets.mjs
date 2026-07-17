import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const imageDir=path.join(root,'APP核心优化','竞品对比','盖世游戏APP');
const demoPath=path.join(root,'demos','Android广告接入-交互标注版.html');
const sources={
  home:'20260618-120632.jpg',
  play:'20260521-152024.jpg',
  detail:'img_v3_02123_fc615f68-5212-4632-b026-6baffc50519g.jpg',
  search:'20260521-152007.jpg'
};
const assets=Object.fromEntries(Object.entries(sources).map(([key,name])=>[key,`data:image/jpeg;base64,${fs.readFileSync(path.join(imageDir,name)).toString('base64')}`]));
const begin='/* ASSET_BUNDLE_START */',end='/* ASSET_BUNDLE_END */';
const html=fs.readFileSync(demoPath,'utf8');
const start=html.indexOf(begin),finish=html.indexOf(end);
if(start<0||finish<start) throw new Error('asset markers missing');
const next=html.slice(0,start)+`${begin}\nwindow.DEMO_ASSETS=${JSON.stringify(assets)};\n${end}`+html.slice(finish+end.length);
fs.writeFileSync(demoPath,next,'utf8');
console.log(`Embedded ${Object.keys(assets).length} images`);

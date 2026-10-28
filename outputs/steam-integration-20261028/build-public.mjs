import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const target=path.resolve(root,'../../public/steam-integration');
fs.mkdirSync(target,{recursive:true});
const demo=fs.readFileSync(path.join(root,'Steam接入Demo.html'),'utf8')
  .replaceAll('用户流程图.html','review.html')
  .replaceAll('Steam接入PRD-Draft.md','prd.md');
const review=fs.readFileSync(path.join(root,'用户流程图.html'),'utf8')
  .replaceAll('Steam接入Demo.html','demo.html');
fs.writeFileSync(path.join(target,'demo.html'),demo);
fs.writeFileSync(path.join(target,'review.html'),review);
fs.copyFileSync(path.join(root,'Steam接入PRD-Draft.md'),path.join(target,'prd.md'));
console.log('Built public/steam-integration/{demo.html,review.html,prd.md}');

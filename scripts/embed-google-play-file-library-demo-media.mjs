import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const workspace=path.resolve(scriptDir,'..');
const demoPath='C:/Users/z3635/Documents/Codex/2026-08-26/new-chat/outputs/google-play-file-home-ab-demo.html';
const imagePath=path.join(workspace,'h5游戏','nezha-chen-tang-demo','docs','research','zhaoyun-adou-evidence','07-zhaoyun-start.jpg');
const videoPath=path.join(workspace,'储存','详情页沉浸式UI演示视频.mp4');
const imageBase64=readFileSync(imagePath).toString('base64');
const videoBase64=readFileSync(videoPath).toString('base64');
const replacements=[
  [/const sampleImageData='[^']*';/,`const sampleImageData='data:image/jpeg;base64,${imageBase64}';`],
  [/const sampleVideoData='[^']*';/,`const sampleVideoData='data:video/mp4;base64,${videoBase64}';`]
];
let html=readFileSync(demoPath,'utf8');
for(const [pattern,replacement] of replacements){
  if(!pattern.test(html))throw new Error(`media declaration not found: ${pattern}`);
  html=html.replace(pattern,replacement);
}
writeFileSync(demoPath,html,'utf8');
console.log(`Embedded image=${imageBase64.length}, video=${videoBase64.length} base64 characters into ${demoPath}`);

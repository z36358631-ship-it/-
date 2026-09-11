import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const pairs=[
  ['demos/Mod与发行人/发行人计划demo.html','demos/Mod与发行人/发行人计划demo.js','发行人计划demo.js'],
  ['demos/Mod与发行人/发行人计划-后台demo.html','demos/Mod与发行人/发行人计划-后台demo.js','发行人计划-后台demo.js']
];

for(const [htmlRelative,jsRelative,sourceName] of pairs){
  const htmlPath=path.join(root,htmlRelative);
  const jsPath=path.join(root,jsRelative);
  const html=fs.readFileSync(htmlPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  const opening=`<script data-maintenance-source="${sourceName}">`;
  const start=html.indexOf(opening);
  assert.notEqual(start,-1,`${htmlRelative} missing ${opening}`);
  const contentStart=start+opening.length;
  const end=html.indexOf('</script>',contentStart);
  assert.notEqual(end,-1,`${htmlRelative} missing closing script tag`);
  const eol=html.includes('\r\n')?'\r\n':'\n';
  const normalizedJs=js.replace(/\r?\n/g,eol);
  const next=`${html.slice(0,contentStart)}${eol}${normalizedJs}${html.slice(end)}`;
  fs.writeFileSync(htmlPath,next,'utf8');
  console.log(`synced ${sourceName}`);
}

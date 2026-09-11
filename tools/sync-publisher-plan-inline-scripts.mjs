import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const pairs=[
  ['demos/Mod与发行人/发行人计划demo.html','demos/Mod与发行人/发行人计划demo.js','发行人计划demo.js'],
  ['demos/Mod与发行人/发行人计划-后台demo.html','demos/Mod与发行人/发行人计划-后台demo.js','发行人计划-后台demo.js']
];

const updates=pairs.map(([htmlRelative,jsRelative,sourceName])=>{
  const htmlPath=path.join(root,htmlRelative);
  const jsPath=path.join(root,jsRelative);
  const html=fs.readFileSync(htmlPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  const opening=`<script data-maintenance-source="${sourceName}">`;
  const start=html.indexOf(opening);
  assert.notEqual(start,-1,`${htmlRelative} missing ${opening}`);
  const secondStart=html.indexOf(opening,start+opening.length);
  assert.equal(secondStart,-1,`${htmlRelative} contains duplicate ${opening}`);
  assert(!/<\/script/i.test(js),`${jsRelative} contains an HTML script closing sequence`);
  const contentStart=start+opening.length;
  const end=html.indexOf('</script>',contentStart);
  assert.notEqual(end,-1,`${htmlRelative} missing closing script tag`);
  const eol=html.includes('\r\n')?'\r\n':'\n';
  const next=`${html.slice(0,contentStart)}${eol}${js}${html.slice(end)}`;
  return {htmlPath,next,sourceName};
});

for(const {htmlPath,next,sourceName} of updates){
  fs.writeFileSync(htmlPath,next,'utf8');
  console.log(`synced ${sourceName}`);
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mainPrdPath = path.join(
  root,
  'prd',
  'ai生成',
  '【Prd】《盖世游戏》DST本地MODS跨平台需求.md'
);
const archivePrdPath = path.join(
  root,
  'prd',
  'mod功能',
  '【PRD】《盖世游戏》DST本地MODS跨平台需求.md'
);
const expectedSha = '28bb7a389673dfbc44f17e5cb2f7885dd674eea7';
const mainPrd = fs.readFileSync(mainPrdPath, 'utf8');
const archivePrd = fs.readFileSync(archivePrdPath, 'utf8');

assert.match(mainPrd, /\|2026\.07\.31\|V1\.4\|/u);
assert.match(mainPrd, /AC-MAC-DETAIL-05/u);
assert.match(mainPrd, /V1\.4 覆盖声明/u);
assert.match(mainPrd, /AC-MAC-DETAIL-06/u);
assert.match(mainPrd, /AC-MAC-DETAIL-07/u);
assert.match(mainPrd, /AC-MAC-ENABLE-04/u);
assert.match(mainPrd, /AC-MAC-V14-BROWSE-01/u);
assert.match(mainPrd, /AC-MAC-V14-BROWSE-02/u);
assert.match(mainPrd, /AC-MAC-V14-INSTALLED-01/u);
assert.match(mainPrd, /AC-MAC-V14-INSTALLED-02/u);
assert.match(mainPrd, /AC-MAC-V14-REFRESH-01/u);
assert.match(mainPrd, /AC-MAC-V14-SCOPE-01/u);
assert.match(mainPrd, /排序下拉 → 搜索 → 刷新/u);
assert.match(mainPrd, /筛选下拉 → 搜索 → 刷新/u);
assert.match(mainPrd, /用户在排序下拉确认选项/u);
assert.match(mainPrd, /用户在筛选下拉确认选项/u);
assert.match(mainPrd, /海外包中文、英语、日语、俄语、巴西葡萄牙语资源/u);
assert.match(mainPrd, /已启用”为绿色背景，“已停用”为灰色背景/u);
assert.match(archivePrd, /\|版本\|V1\.7\|/u);
assert.match(archivePrd, /AC-MAC-V16-DETAIL-01/u);
assert.match(archivePrd, /V1\.7 覆盖声明/u);
assert.match(archivePrd, /AC-MAC-V16-KEYBOARD-01/u);
assert.match(archivePrd, /AC-MAC-V16-LOCK-01/u);
assert.match(archivePrd, /AC-MAC-V16-UPDATE-FAIL-01/u);
assert.match(archivePrd, /AC-MAC-V16-I18N-01/u);
assert.match(archivePrd, /AC-MAC-V16-SCOPE-01/u);
assert.match(archivePrd, /AC-MAC-V17-BROWSE-01/u);
assert.match(archivePrd, /AC-MAC-V17-BROWSE-02/u);
assert.match(archivePrd, /AC-MAC-V17-INSTALLED-01/u);
assert.match(archivePrd, /AC-MAC-V17-INSTALLED-02/u);
assert.match(archivePrd, /AC-MAC-V17-REFRESH-01/u);
assert.match(archivePrd, /AC-MAC-V17-SCOPE-01/u);

const imageMatches = [
  ...mainPrd.matchAll(/!\[[^\]]+\]\((https:\/\/[^)]+)\)/gu)
];
assert.equal(imageMatches.length, 4, 'PRD Markdown image count must be exactly 4');

const urls = imageMatches.map(match => match[1]);
for (const url of urls) {
  assert.match(
    url,
    new RegExp(
      `^https://cdn\\.jsdelivr\\.net/gh/z36358631-ship-it/-@${expectedSha}`
        + '/public/prd/dst-mods/\\d{2}-[a-z0-9-]+\\.png$',
      'u'
    )
  );
  assert.doesNotMatch(url, /(?:@main|@master|\/blob\/|localhost|file:)/u);
}
assert.equal(new Set(urls).size, 4, 'PRD images must use four distinct URLs');
assert.deepEqual(
  urls.map(url => url.match(/\/([^/]+\.png)$/u)?.[1]),
  [
    '01-mac-detail-disabled.png',
    '02-mac-detail-enabled.png',
    '03-mac-browse-toolbar.png',
    '04-mac-installed-toolbar.png'
  ]
);
for (const line of mainPrd.split(/\r?\n/u).filter(line => line.includes('!['))) {
  assert(
    line.startsWith('|') && line.includes('|![图'),
    `PRD image is not inside a table image cell: ${line}`
  );
}
assert.doesNotMatch(
  mainPrd,
  /!\[[^\]]+\]\((?!(?:https:\/\/cdn\.jsdelivr\.net\/gh\/z36358631-ship-it\/-@))[^\)]+\)/u,
  'PRD contains a non-fixed or local Markdown image'
);
assert.doesNotMatch(
  archivePrd,
  /!\[[^\]]+\]\([^)]+\)/u,
  'technical archive unexpectedly contains Markdown images'
);

assert.doesNotMatch(
  mainPrd,
  /(?:6ce96620ec497e00d34f865dc2bff38c45e98ba4|928429e83ce85fa6b28b4691cc29153339100573|6ea661d0c0ff29c520a11fc6188e7ab66f0e5442)/u,
  'PRD still contains an old image commit SHA'
);

for (const url of urls) {
  const response = await fetch(url);
  assert.equal(response.status, 200, `${url} did not return HTTP 200`);
  assert.match(
    response.headers.get('content-type') || '',
    /^image\/png(?:;|$)/u,
    `${url} did not return image/png`
  );
  const bytes = (await response.arrayBuffer()).byteLength;
  assert(bytes > 10000, `${url} returned an unexpectedly small image`);
  console.log(`PASS: ${response.status} ${response.headers.get('content-type')} ${bytes} ${url}`);
}

console.log('PASS: PRD has 4 fixed-SHA images and synchronized V1.4/V1.7 toolbar rules');

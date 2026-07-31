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
const expectedSha = '6ce96620ec497e00d34f865dc2bff38c45e98ba4';
const mainPrd = fs.readFileSync(mainPrdPath, 'utf8');
const archivePrd = fs.readFileSync(archivePrdPath, 'utf8');

assert.match(mainPrd, /\|2026\.07\.31\|V1\.3\|/u);
assert.match(mainPrd, /AC-MAC-DETAIL-05/u);
assert.match(mainPrd, /V1\.3 覆盖声明/u);
assert.match(mainPrd, /AC-MAC-DETAIL-06/u);
assert.match(mainPrd, /AC-MAC-DETAIL-07/u);
assert.match(mainPrd, /AC-MAC-ENABLE-04/u);
assert.match(mainPrd, /海外包中文、英语、日语、俄语、巴西葡萄牙语资源/u);
assert.match(mainPrd, /已启用”为绿色背景，“已停用”为灰色背景/u);
assert.match(archivePrd, /\|版本\|V1\.6\|/u);
assert.match(archivePrd, /AC-MAC-V16-DETAIL-01/u);
assert.match(archivePrd, /V1\.6 覆盖声明/u);
assert.match(archivePrd, /AC-MAC-V16-KEYBOARD-01/u);
assert.match(archivePrd, /AC-MAC-V16-LOCK-01/u);
assert.match(archivePrd, /AC-MAC-V16-UPDATE-FAIL-01/u);
assert.match(archivePrd, /AC-MAC-V16-I18N-01/u);
assert.match(archivePrd, /AC-MAC-V16-SCOPE-01/u);

const imageMatches = [
  ...mainPrd.matchAll(/!\[[^\]]+\]\((https:\/\/[^)]+)\)/gu)
];
assert.equal(imageMatches.length, 2, 'PRD Markdown image count must be exactly 2');

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
assert.equal(new Set(urls).size, 2, 'PRD images must use two distinct URLs');

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

console.log('PASS: PRD has 2 fixed-SHA images and synchronized V1.3/V1.6 detail rules');

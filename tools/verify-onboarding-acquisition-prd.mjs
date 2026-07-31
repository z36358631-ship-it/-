import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prdPath = path.join(
  root,
  'prd',
  'ai生成',
  '【Prd】《盖世游戏》新手引导分流需求.md',
);
const prd = fs.readFileSync(prdPath, 'utf8');
const assetSha = '72348d263e0f62e81a16bfb5100c55fb7e8be857';
const expectedFiles = [
  '01-welcome.png',
  '02-source.png',
  '03-start-method.png',
  '04-domestic-destination.png',
  '05-overseas-destination.png',
  '06-existing-game.png',
  '07-existing-source.png',
  '08-source-analytics.png',
];

assert.match(prd, /^# 【Prd】《盖世游戏》新手引导与来源采集分析需求/m);
assert(prd.includes('### 4.2 详细设计（C端）'));
assert(prd.includes('### 4.3 详细设计（B端）'));
assert(prd.includes('|功能／页面|图示|触发条件、展示说明与交互说明|'));
assert(!prd.includes('24小时后'), 'must not include the discarded delayed prompt');
assert(!prd.includes('@master/'), 'must not use a floating master image URL');
assert(!prd.includes('@main/'), 'must not use a floating main image URL');
assert(!prd.includes('file://'), 'must not use file URLs');
assert(!/[A-Z]:\\/.test(prd), 'must not expose local Windows paths');
assert(!/!\[[^\]]*]\(\.\.?\//.test(prd), 'must not use relative image paths');

const imagePattern =
  /!\[[^\]]*]\((https:\/\/cdn\.jsdelivr\.net\/gh\/z36358631-ship-it\/-@([0-9a-f]{40})\/public\/prd\/onboarding-acquisition-v2\/([^)]+\.png))\)/g;
const images = [...prd.matchAll(imagePattern)].map((match) => ({
  url: match[1],
  sha: match[2],
  filename: match[3],
}));

assert.equal(images.length, 8, 'PRD must contain exactly 8 fixed-SHA images');
assert.equal(new Set(images.map(({ url }) => url)).size, 8, 'image URLs must be unique');
assert.deepEqual(
  images.map(({ filename }) => filename).sort(),
  [...expectedFiles].sort(),
  'PRD must reference the expected screenshots',
);
assert(
  images.every(({ sha }) => sha === assetSha),
  `all images must use asset SHA ${assetSha}`,
);

const imageLines = prd
  .split(/\r?\n/)
  .filter((line) => line.includes('/public/prd/onboarding-acquisition-v2/'));
assert.equal(imageLines.length, 8);
assert(
  imageLines.every((line) => line.startsWith('|') && line.endsWith('|')),
  'every image must stay inside a requirement table row',
);

for (const filename of expectedFiles) {
  const localImage = path.join(
    root,
    'public',
    'prd',
    'onboarding-acquisition-v2',
    filename,
  );
  assert(fs.existsSync(localImage), `missing local screenshot: ${filename}`);
  assert(fs.statSync(localImage).size > 10_000, `screenshot is unexpectedly small: ${filename}`);
}

async function fetchWithRetry(url, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.status === 200) return response;
      lastError = new Error(`${url} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }
  throw lastError;
}

for (const { url } of images) {
  const response = await fetchWithRetry(url);
  assert.equal(response.status, 200, `${url} must return HTTP 200`);
  assert.match(
    response.headers.get('content-type') || '',
    /^image\/png(?:;|$)/i,
    `${url} must return image/png`,
  );
}

console.log(
  `PASS onboarding acquisition PRD: ${images.length}/${images.length} fixed-SHA images available`,
);

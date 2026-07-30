import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const personalizationPath = path.join(root, 'prd', '【Prd】《盖世游戏》个性化推荐需求.md');
const onboardingPath = path.join(root, 'prd', 'ai生成', '【Prd】《盖世游戏》新手引导分流需求.md');
const personalization = fs.readFileSync(personalizationPath, 'utf8');
const onboarding = fs.readFileSync(onboardingPath, 'utf8');
const docs = `${personalization}\n${onboarding}`;

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

for (const token of [
  '满滚动24小时后的首次合格冷启动',
  '至少选3款、最多9款',
  '暂不选择',
  '来源单选、必答、不可跳过',
  '其他／不记得',
  'Other / I don’t remember',
  'GameHub',
  'option_version',
  '本地可靠保存',
  '不覆盖客观安装归因',
  'onboarding_completed_at',
  'next\\_eligible\\_at',
  '首次有效补报时间',
]) {
  assert(docs.includes(token), `PRD missing token: ${token}`);
}

for (const line of docs.split(/\r?\n/).filter((item) => item.includes('GaishiGame'))) {
  assert(
    line.includes('不出现') || line.includes('不得') || line.includes('禁止'),
    `overseas brand is incorrect: ${line}`,
  );
}
assert(
  !docs.includes('新用户原个性化推荐（选3-x款游戏）改为行为采集替代'),
  'obsolete onboarding rule remains',
);

const imagePattern =
  /https:\/\/cdn\.jsdelivr\.net\/gh\/z36358631-ship-it\/-@([0-9a-f]{40})\/public\/prd\/personalization-acquisition-wizard\/(0[1-5]-[^)\s]+\.png)/g;
const images = [...docs.matchAll(imagePattern)];
assert(images.length === 5, `expected exactly five fixed-sha images, found ${images.length}`);

const commits = new Set(images.map((match) => match[1]));
assert(commits.size === 1, `expected one image commit, found ${commits.size}`);
assert(
  commits.has('24e997afb287200748d7c0a5c1c9643aca0d6e1a'),
  `unexpected image commit: ${[...commits].join(', ')}`,
);

const filenames = new Set(images.map((match) => match[2]));
for (let index = 1; index <= 5; index += 1) {
  const prefix = `0${index}-`;
  assert(
    [...filenames].some((name) => name.startsWith(prefix)),
    `missing image with prefix ${prefix}`,
  );
}

for (const line of docs.split(/\r?\n/).filter((item) => item.includes('personalization-acquisition-wizard'))) {
  assert(
    line.trim().startsWith('|') && line.trim().endsWith('|'),
    `image must stay inside a table row: ${line}`,
  );
}

for (const forbidden of [
  'raw.githubusercontent.com/z36358631-ship-it/-/',
  'github.com/z36358631-ship-it/-/blob/',
  'localhost',
  'file://',
  'data:image',
]) {
  const relatedLines = docs
    .split(/\r?\n/)
    .filter((line) => line.includes('personalization-acquisition-wizard'));
  assert(!relatedLines.some((line) => line.includes(forbidden)), `forbidden image URL form: ${forbidden}`);
}

assert(
  personalization.includes('AC\\-11 数据隔离'),
  'personalization PRD is missing acquisition-data isolation acceptance',
);
assert(
  onboarding.includes('AC\\-08 国内/海外'),
  'onboarding PRD is missing domestic/overseas handoff acceptance',
);
assert(
  onboarding.includes('本节覆盖V1\\.2及以前'),
  'onboarding PRD does not state which obsolete rule is superseded',
);

console.log('PASS personalizationAcquisitionPrd');

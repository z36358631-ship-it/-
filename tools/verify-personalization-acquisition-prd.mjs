import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const personalizationPath = path.join(root, 'prd', '【Prd】《盖世游戏》个性化推荐需求.md');
const onboardingPath = path.join(root, 'prd', 'ai生成', '【Prd】《盖世游戏》新手引导分流需求.md');
const personalization = fs.readFileSync(personalizationPath, 'utf8');
const onboarding = fs.readFileSync(onboardingPath, 'utf8');
const docs = `${personalization}\n${onboarding}`;
const normalizedDocs = docs.replaceAll('\\_', '_').replaceAll('\\.', '.');

const OLD_ASSET_SHA = '8d57a53c8deb06f9cb11e45610c6328e727e915c';
const V14_ASSET_SHA = 'a88599cf88ab93cf27c2795f4288828912f96f59';
const OLD_ASSET_DIR = 'personalization-acquisition-wizard';
const V14_ASSET_DIR = 'personalization-acquisition-onboarding-v2';

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

for (const document of [
  ['personalization', personalization],
  ['onboarding', onboarding],
]) {
  assert(document[1].includes('|2026\\.07\\.30|V1\\.4|'), `${document[0]} PRD missing V1.4 version row`);
  assert(document[1].includes('已由V1\\.4覆盖') || document[1].includes('已由 V1\\.4 覆盖'), `${document[0]} PRD does not mark V1.3 conflict as covered`);
}

for (const token of [
  '用户类型选择后',
  '来源单选、必答',
  'manual_interest_exempt',
  'behavior_profile_ready',
  'new_user_onboarding',
  'existing_user_recall',
  '不在24小时后',
  '游戏步骤和来源步骤独立',
  '稳定安装标识',
  '对照组',
  '来源影响组',
  '最终方案组',
  '首次有效价值行为率',
  '下降超过1—2个百分点',
  '来源有效覆盖率',
  '来源页完成率',
  '平均答题时间',
  '行为画像生成率',
  '本地保存成功率',
  '补报成功率',
  '重复触发率',
  'D1',
  'D7',
  '总开关',
  '目标版本',
  '目标用户',
  '灰度比例',
  '生效时间',
  '来源选项与顺序',
  '选项版本',
  '操作日志',
  '权限',
  '临时绕过该步骤',
  '不写完成或跳过终态',
  '下次安全入口补答',
  '横屏使用居中可滚动容器',
  '默认对照组/来源影响组/最终方案组为80/10/10',
  '整数且合计100',
  '只能在草稿态修改',
  'guardrail_drop_pp',
  'stopped_guardrail',
  '各≥1000个合格安装',
  '连续2个自然日',
  '后续新用户归入对照',
  '已入组用户组别不变',
  '固定归属原 `install_id`',
  '不覆盖账号B',
  '冲突日志',
  '不得生成新答案',
  '只禁止手动选游戏，不生成来源终态',
  '只禁止游戏步骤，不禁止来源步骤',
  '来源步骤按来源终态、来源步骤开关、人群、市场和版本配置独立判断',
  '来源开关重开后仍在下次安全入口补答',
  '对照组不展示来源页',
  '用户类型选择后直接进入原对应分支',
  '来源影响组、最终方案组的来源页单选、必答',
  '草稿 `draft`',
  '待生效 `scheduled`',
  '运行中 `running`',
  '正常结束 `completed`',
  '手动停止 `stopped_manual`',
  '运行中不修改总开关与权重',
  '停止两个试验组的新分配',
  '前端硬伤回填',
  '测试硬伤回填',
  '运营硬伤回填',
]) {
  assert(docs.includes(token), `PRD missing token: ${token}`);
}

for (const token of [
  'guardrail_drop_pp` 默认且本次固定1.5个百分点',
  '下降=1.5个百分点不触发',
  '下降>1.5个百分点连续2个自然日',
  '对照组新手期间不写免弹',
  '来源影响组在新手内答来源',
  '最终方案组在新手内答来源',
]) {
  assert(normalizedDocs.includes(token), `PRD missing precise rule: ${token}`);
}

assert(!normalizedDocs.includes('仅竖屏'), 'V1.4 PRD must support both portrait and landscape');

for (const forbidden of [
  '`manual_interest_exempt=true`、两个步骤均有终态',
  '两种用户类型均必须先经过来源页',
  '生效中',
  '已停用',
  '已结束',
  '回退总开关或实验比例',
]) {
  assert(!normalizedDocs.includes(forbidden), `obsolete or conflicting current rule remains: ${forbidden}`);
}

function requireEventFields(eventId, fields) {
  const line = normalizedDocs.split(/\r?\n/).find((item) => item.includes(eventId));
  assert(line, `PRD missing event row: ${eventId}`);
  for (const field of fields) {
    assert(line.includes(field), `${eventId} missing fixed field: ${field}`);
  }
}

for (const eventId of [
  'onboarding_source_submit',
  'onboarding_source_sync',
  'acquisition_source_submit',
  'personalization_wizard_sync_result',
]) {
  requireEventFields(eventId, [
    'entry_group',
    'experiment_id',
    'experiment_group',
    'response_id',
  ]);
}

for (const forbiddenPersona of [
  '新用户·完成引流未满24小时',
  '新用户·已满24小时',
  'new_under_24h',
  'new_eligible',
]) {
  assert(!docs.includes(forbiddenPersona), `obsolete new-user scenario remains: ${forbiddenPersona}`);
}

for (const line of docs.split(/\r?\n/).filter((item) => item.includes('GaishiGame'))) {
  assert(
    line.includes('不出现') || line.includes('不得') || line.includes('禁止'),
    `overseas brand is incorrect: ${line}`,
  );
}

assert(
  !docs.includes('新用户原个性化推荐（选3-x款游戏）改为行为采集替代'),
  'obsolete onboarding wording remains',
);

const oldImagePattern = new RegExp(
  `https:\\/\\/cdn\\.jsdelivr\\.net\\/gh\\/z36358631-ship-it\\/-@([0-9a-f]{40})\\/public\\/prd\\/${OLD_ASSET_DIR}\\/(0[1-5]-[^)\\s]+\\.png)`,
  'g',
);
const oldImages = [...docs.matchAll(oldImagePattern)];
assert(oldImages.length === 5, `expected five historical images, found ${oldImages.length}`);
assert(
  new Set(oldImages.map((match) => match[1])).size === 1 &&
    oldImages.every((match) => match[1] === OLD_ASSET_SHA),
  'historical images must retain their original fixed commit',
);
const oldFilenames = new Set(oldImages.map((match) => match[2]));
for (let index = 1; index <= 5; index += 1) {
  const prefix = `0${index}-`;
  assert([...oldFilenames].some((name) => name.startsWith(prefix)), `missing historical image ${prefix}`);
}

const v14ImagePattern = new RegExp(
  `https:\\/\\/cdn\\.jsdelivr\\.net\\/gh\\/z36358631-ship-it\\/-@([0-9a-f]{40})\\/public\\/prd\\/${V14_ASSET_DIR}\\/(0[1-6]-[^)\\s]+\\.png)`,
  'g',
);
const v14Images = [...docs.matchAll(v14ImagePattern)];
assert(v14Images.length === 6, `expected six V1.4 images, found ${v14Images.length}`);
assert(
  new Set(v14Images.map((match) => match[1])).size === 1 &&
    v14Images.every((match) => match[1] === V14_ASSET_SHA),
  `V1.4 images must use fixed commit ${V14_ASSET_SHA}`,
);
const v14Filenames = v14Images.map((match) => match[2]);
assert(new Set(v14Filenames).size === 6, 'each V1.4 image must be referenced exactly once');
for (let index = 1; index <= 6; index += 1) {
  const prefix = `0${index}-`;
  assert(v14Filenames.filter((name) => name.startsWith(prefix)).length === 1, `missing or duplicate V1.4 image ${prefix}`);
}

for (let index = 1; index <= 4; index += 1) {
  const prefix = `0${index}-`;
  assert(onboarding.includes(`/${V14_ASSET_DIR}/${prefix}`), `onboarding PRD missing image ${prefix}`);
  assert(!personalization.includes(`/${V14_ASSET_DIR}/${prefix}`), `personalization PRD must not duplicate image ${prefix}`);
}
for (let index = 5; index <= 6; index += 1) {
  const prefix = `0${index}-`;
  assert(personalization.includes(`/${V14_ASSET_DIR}/${prefix}`), `personalization PRD missing image ${prefix}`);
  assert(!onboarding.includes(`/${V14_ASSET_DIR}/${prefix}`), `onboarding PRD must not duplicate image ${prefix}`);
}

for (const line of docs
  .split(/\r?\n/)
  .filter((item) => item.includes(OLD_ASSET_DIR) || item.includes(V14_ASSET_DIR))) {
  assert(
    line.trim().startsWith('|') && line.trim().endsWith('|'),
    `PRD evidence image must stay inside a table row: ${line}`,
  );
}

for (const forbidden of [
  'raw.githubusercontent.com/z36358631-ship-it/-/',
  'github.com/z36358631-ship-it/-/blob/',
  'localhost',
  'file://',
  'data:image',
  '/master/',
  '@master/',
  '@main/',
]) {
  const evidenceLines = docs
    .split(/\r?\n/)
    .filter((line) => line.includes(OLD_ASSET_DIR) || line.includes(V14_ASSET_DIR));
  assert(!evidenceLines.some((line) => line.includes(forbidden)), `forbidden image URL form: ${forbidden}`);
}

assert(
  !/!\[[^\]]*\]\((?:\.\.?\/|[A-Za-z]:[\\/]|file:\/\/|localhost|data:)/i.test(docs),
  'PRD contains a local or temporary Markdown image address',
);

assert(personalization.includes('AC\\-15 旧用户来源隔离'), 'personalization PRD missing recall-source isolation acceptance');
assert(onboarding.includes('AC\\-16 国内/海外'), 'onboarding PRD missing current domestic/overseas acceptance');
assert(onboarding.includes('本节覆盖V1\\.3新用户滚动24小时问卷规则'), 'onboarding PRD does not state the V1.4 supersession boundary');
assert(personalization.includes('V1\\.4三组实验'), 'personalization PRD missing the three-group experiment section');

console.log('PASS personalizationAcquisitionPrd');

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const files = Object.freeze({
  app: path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.template.html'),
  admin: path.join(root, 'demos', 'APP租号功能', 'app-rental-admin.fragment.html'),
  mac: path.join(root, 'Mac端demo', 'mac端租号功能', 'Mac端租号功能-标注版.html'),
  appPrd: path.join(root, 'prd', '【盖世游戏APP】游戏租号需求', '【Prd】《盖世游戏APP》游戏租号需求.md'),
  macPrd: path.join(root, 'prd', '【盖世游戏Mac】游戏租号需求', '【Prd】《盖世游戏Mac》游戏租号需求.md'),
});

function read(label) {
  const filePath = files[label];
  if (!fs.existsSync(filePath)) throw new Error(`缺少文件：${filePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

const source = Object.fromEntries(Object.keys(files).map((label) => [label, read(label)]));
const checks = [];

function check(group, name, pass, detail = '') {
  checks.push({ group, name, pass: Boolean(pass), detail });
}

function includesAll(text, values) {
  return values.every((value) => text.includes(value));
}

check('APP_BASELINE', '稳定双售卖模式', includesAll(source.app, [
  "TIME_RENTAL: 'time-rental'",
  "ENTITLEMENT: 'entitlement'",
]));
check('APP_BASELINE', '首期标准版', includesAll(source.app, ["editionId: 'standard'", 'checkout-product-edition']));
check('APP_BASELINE', '周月季会员', includesAll(source.app, ["id: 'weekly'", "id: 'monthly'", "id: 'quarterly'"]));
check('APP_BASELINE', '会员首次说明和租号介绍', includesAll(source.app, [
  'membershipIntroSeen',
  'renderMembershipIntroDialog',
  'renderRentalIntroDialog',
]));
check('APP_BASELINE', '五种订单状态', includesAll(source.app, [
  "'pending'", "'active'", "'refunding'", "'refunded'", "'ended'",
]));
check('APP_BASELINE', '15分钟单次提醒', source.app.includes('const reminderThreshold = 15') && !source.app.includes('expiry5mRemindedAt'));

check('APP_GAPS', '会员单活动使用单', includesAll(source.app, [
  'activeMemberUsage',
  'startMemberGameUsage',
  'releaseMemberGameUsage',
  'memberUsageReleaseFailed',
]));
check('APP_GAPS', '5分钟短时授权', includesAll(source.app, [
  'CREDENTIAL_AUTH_TTL_MS',
  'credentialAccessExpiresAt',
  'authorizeCredentialAccess',
]));
check('APP_GAPS', '60秒条件清理剪贴板', includesAll(source.app, [
  'CLIPBOARD_CLEAR_DELAY_MS',
  'scheduleClipboardClear',
  'clearCopiedCredential',
]));

check('MAC_SALES', '稳定双售卖模式', includesAll(source.mac, [
  'GAME_SALE_MODES',
  "TIME_RENTAL: 'time-rental'",
  "ENTITLEMENT: 'entitlement'",
]));
check('MAC_SALES', '客户端只选标准版', source.mac.includes("version: 'standard'") && !source.mac.includes('data-action="select-version"'));
check('MAC_SALES', '热门时租和非热门权益', includesAll(source.mac, [
  'setRentalHours',
  'data-hour-shortcut="23"',
  '首次体验 · 2小时',
  '单游戏永久',
  '开会员畅玩',
]));
check('MAC_MEMBERSHIP', '周月季会员', includesAll(source.mac, [
  "id:'weekly'",
  "id:'monthly'",
  "id:'quarterly'",
]) && !source.mac.includes("id:'annual'") && !source.mac.includes("id:'lifetime'"));
check('MAC_MEMBERSHIP', '会员首次说明', includesAll(source.mac, [
  'membershipIntroSeen',
  '关于会员',
  '个人云存档同步',
  '联系客服申请远程协助',
]));
check('MAC_ORDERS', '版本租期有效期与售后撤销', includesAll(source.mac, [
  '游戏版本',
  '租期',
  '有效期至：',
  '售后申请已提交',
  '售后详情',
  '撤销申请',
]));
check('MAC_HELP', '租号介绍三问', includesAll(source.mac, [
  '租号介绍',
  '租号有什么作用？',
  '如何使用租号？',
  '使用时要注意什么？',
]));
check('MAC_DISCOVERY', '统一状态优先级', includesAll(source.mac, [
  '已租号',
  '可畅玩',
  'rentalStartingLabel',
]));
check('MAC_ORDERS', '三订单Tab与五状态', includesAll(source.mac, [
  '全部订单',
  '待支付',
  '可使用',
  '退款中',
  '已退款',
  '已结束',
]));
check('MAC_ORDERS', '无客户端分配中', !source.mac.includes('资源分配中') && !source.mac.includes('账号分配中'));
check('MAC_LOGIN', '第三方平台凭据', includesAll(source.mac, [
  'THIRD_PARTY_LOGIN_CONFIGS',
  'Rockstar Games',
]));
check('MAC_REMINDER', '仅15分钟一次', source.mac.includes('expiry15mRemindedAt')
  && !source.mac.includes('expiry5mRemindedAt')
  && !source.mac.includes('showExpiryReminder(active,5'));
check('MAC_DEMO', '一键上号只演示成功', source.mac.includes('一键上号成功') && !source.mac.includes('oneClickFailed'));

check('ADMIN', 'Mac商品标准版与双售卖模式', includesAll(source.admin, [
  "clientType: 'mac'",
  "editionId: 'standard'",
  "saleMode: 'time-rental'",
  "saleMode: 'entitlement'",
]));
check('ADMIN', 'Mac周月季套餐', includesAll(source.admin, [
  "id: 'mac-weekly'",
  "id: 'mac-monthly'",
  "id: 'mac-quarterly'",
]));

check('PRD', 'APP补齐会员切换和凭据安全', includesAll(source.appPrd, [
  '会员使用单',
  '5分钟短时授权',
  '60秒',
]));
check('PRD', 'Mac记录跨端统一版本', includesAll(source.macPrd, [
  '跨端功能一致性',
  '周卡、月卡、季卡',
  '15分钟单次提醒',
  '租号介绍',
]));

const groups = [...new Set(checks.map(({ group }) => group))];
for (const group of groups) {
  const groupChecks = checks.filter((item) => item.group === group);
  const passed = groupChecks.filter((item) => item.pass).length;
  process.stdout.write(`${group} ${passed}/${groupChecks.length} ${passed === groupChecks.length ? 'PASS' : 'FAIL'}\n`);
  for (const item of groupChecks.filter((value) => !value.pass)) {
    process.stdout.write(`  - ${item.name}${item.detail ? `：${item.detail}` : ''}\n`);
  }
}

const failed = checks.filter(({ pass }) => !pass);
process.stdout.write(`PARITY_TOTAL ${checks.length - failed.length}/${checks.length} ${failed.length ? 'FAIL' : 'PASS'}\n`);
if (failed.length) process.exitCode = 1;

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const cHtml = read('demos/Mod与发行人/发行人计划demo.html');
const cJs = read('demos/Mod与发行人/发行人计划demo.js');
const bHtml = read('demos/Mod与发行人/发行人计划-后台demo.html');
const bJs = read('demos/Mod与发行人/发行人计划-后台demo.js');
const prd = read('prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md');

const mustContain = (source, values, label) => {
  for (const value of values) {
    assert(source.includes(value), `${label} missing: ${value}`);
  }
};

const mustNotContain = (source, values, label) => {
  for (const value of values) {
    assert(!source.includes(value), `${label} still contains: ${value}`);
  }
};

mustContain(cHtml + cJs, [
  '可兑换盖世币',
  '充值获得的盖世币仅可用于发布任务',
  'view-card-store',
  'card-redeem-modal',
  'card-history-modal',
  '自动发放卡密',
  '查看卡密',
  '复制卡密',
  '<strong>兑换商城</strong>',
  '<span class="title">兑换商城</span>'
], 'C demo');
mustNotContain(cHtml + cJs, [
  'handleWithdraw',
  '确认提现',
  '提现到支付宝',
  '可提现金额',
  '已提现',
  '<strong>兑换京东卡</strong>',
  '<span class="title">兑换京东卡</span>'
], 'C demo');

mustContain(bHtml + bJs, [
  "switchPage('jd-cards')",
  "switchPage('card-orders')",
  '京东卡管理',
  '卡密库存',
  '兑换订单',
  '库存告警设置',
  '全局库存预警阈值',
  '飞书机器人 Webhook',
  '重复提醒间隔',
  '消息预览',
  'cardAlertSettings',
  'cardAlertState',
  'simulateCardInventoryAlerts',
  '未使用',
  '已预占',
  '已发放',
  '待核对',
  '作废'
], 'B demo');
mustNotContain(bJs, [
  'warning:',
  '<th>预警</th>',
  '<label>库存预警阈值</label>'
], 'B demo');
mustNotContain(bHtml + bJs, ['收货地址', '物流单号', '已发货'], 'B demo');

mustContain(prd, [
  '| 修订日期 | 修订内容 | 版本 | 修订人 |',
  '### 2.2 产品流程',
  '### 3.1 C 端功能需求',
  '### 3.2 B 端功能需求',
  'V2.1',
  '#### 3.1.9 兑换商城',
  '所有已上架京东卡 SKU 共用一个全局库存预警阈值',
  '按 SKU 独立判断',
  '飞书机器人 Webhook',
  '重复提醒间隔',
  '消息预览',
  'Webhook 服务端加密保存',
  '23-card-alert-settings.png',
  '充值获得的盖世币仅可用于发布任务，不可兑换京东卡',
  '任务取消、审核驳回或结算后退回的未消耗预算沿用原来源',
  '完成发行人任务获得的盖世币可用于兑换京东电子卡',
  '![产品流程]',
  '## 五、待确认项'
], 'PRD');
mustNotContain(prd, [
  '__' + 'IMAGE_COMMIT_SHA' + '__',
  '<' + 'IMAGE_COMMIT_SHA' + '>',
  '库存、预警阈值、单人限兑',
  '单用户限兑次数、库存预警阈值'
], 'PRD');
assert(
  !/(?:填写|输入|提交|采集|新增|保存)收货地址|(?:上传|填写|录入|绑定)物流单号|物流发货|实物发货/.test(prd),
  'PRD still defines physical-card delivery capabilities'
);

const imagePaths = [...prd.matchAll(/publisher-plan-v2\/(\d{2}-[a-z0-9-]+\.png)/g)].map(match => match[1]);
assert.equal(new Set(imagePaths).size, 24, 'PRD must reference exactly 24 unique publisher-plan-v2 images');

const eventNames = [...prd.matchAll(/\| `([a-z][a-z0-9_]+)` \|/g)].map(match => match[1]);
assert.equal(new Set(eventNames).size, eventNames.length, 'PRD contains duplicate event names');
assert(!/旨在|赋能|助力|沉浸式/.test(prd), 'PRD contains banned AI phrasing');

console.log('PASS: publisher plan V2 static contract');

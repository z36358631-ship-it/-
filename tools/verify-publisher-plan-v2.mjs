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
const demoSource = cHtml + cJs + bHtml + bJs;
const normalizedPublisherSource = (demoSource + prd)
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ');

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

const assertInlineScriptMatches = (html, js, sourceName, label) => {
  const openingTag = `<script data-maintenance-source="${sourceName}">`;
  assert(!html.includes(`<script src="${sourceName}"></script>`), `${label} still loads external script`);
  const start = html.indexOf(openingTag);
  assert.notEqual(start, -1, `${label} missing inline script marker`);
  const contentStart = start + openingTag.length;
  const end = html.indexOf('</script>', contentStart);
  assert.notEqual(end, -1, `${label} missing inline script closing tag`);
  let embedded = html.slice(contentStart, end);
  if (embedded.startsWith('\r\n')) embedded = embedded.slice(2);
  else if (embedded.startsWith('\n')) embedded = embedded.slice(1);
  assert.equal(embedded, js, `${label} inline script differs from maintenance source`);
};

assertInlineScriptMatches(cHtml, cJs, '发行人计划demo.js', 'C demo');
assertInlineScriptMatches(bHtml, bJs, '发行人计划-后台demo.js', 'B demo');

mustContain(cHtml + cJs, [
  '可兑换盖世币',
  '任务中心获得的是盖世积分，与盖世币分开计算',
  '充值获得的盖世币仅可用于发布任务',
  '只有参与发行任务并结算获得的盖世币可兑换京东电子卡',
  'view-card-store',
  'card-redeem-modal',
  'card-history-modal',
  '自动发放卡密',
  '查看卡密',
  '复制卡密',
  '<strong>兑换商城</strong>',
  '<span class="title">兑换商城</span>'
], 'C demo');
mustContain(cHtml + cJs, [
  '每 1 个赞奖励',
  '单篇最高',
  '实名认证',
  '创作者认证',
  '机器审核通过后自动发布',
  '每天最多提交 10 个任务',
  '最低 5,000 盖世币，最高 10,000,000 盖世币',
  '上传任务图片',
  '数据校验通过，待人工结算',
  '按单稿奖励上限预留',
  '最终以点赞统计截止时间的数据快照及人工结算结果为准',
  '当前任务奖池名额已满'
], 'C publishing flow');
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
  '作废',
  '只扣减参与发行任务并结算获得的盖世币',
  '任务中心盖世积分不可兑换'
], 'B demo');
mustContain(bHtml + bJs, [
  '机器审核记录',
  '人工异常处理',
  '普通下架',
  '风险下架',
  '重新抓取',
  '风险挂起',
  '任务级结算批次',
  '系统计算金额不可修改',
  '结算快照点赞数',
  '规则版本',
  '实名状态',
  '认证创作者',
  '定向邀请专属标签'
], 'B review and settlement flow');
mustContain(bHtml + bJs, [
  '不得按 0 点赞结算'
], 'B inaccessible-work settlement rule');
mustNotContain(bJs, [
  'warning:',
  '<th>预警</th>',
  '<label>库存预警阈值</label>'
], 'B demo');
mustNotContain(bHtml + bJs, ['收货地址', '物流单号', '已发货'], 'B demo');

mustNotContain(demoSource, [
  '提交审核（预计24小时内）',
  '提交成功，等待审核',
  '按任务设定的阶梯规则计算奖励',
  '单条上限 = 单价 × 100',
  '自动计算: 单价×100且≥500',
  '任务到期后第3天系统自动抓取视频数据',
  '后续每隔固定周期补发新增点赞奖励',
  '身份标签已下发',
  '个人发布的任务需24小时内审核通过后上架',
  'id="custom-amt"',
  'calcCustom(',
  '<div class="form-label">自定义金额</div>',
  'placeholder="输入盖世币数量（最低100）"'
], 'retired publisher demo rules');
mustNotContain(prd, [
  '提交成功后提示“提交成功，等待审核”',
  '页面保留自定义金额、现有支付方式',
  '用户选择档位或输入自定义金额后',
  '结算说明包含数据统计周期、周期补发'
], 'retired publisher PRD capabilities');

const inaccessibleZeroSettlementMatches = [
  ...normalizedPublisherSource.matchAll(/(?:视频|作品)不可访问.{0,120}?按\s*(?:0|零)(?:\s*点赞)?\s*结算/gu)
].map(match => match[0]);
const isNegatedZeroSettlement = value =>
  /(?:不得|禁止|不能|不可|不应|不予|不再|不)\s*按\s*(?:0|零)(?:\s*点赞)?\s*结算/u.test(value)
  || /不默认[^\u3002；]{0,24}(?:或|、)\s*按\s*(?:0|零)(?:\s*点赞)?\s*结算/u.test(value);
assert(
  inaccessibleZeroSettlementMatches.every(isNegatedZeroSettlement),
  'retired publisher rules still define inaccessible video/work as zero settlement'
);

mustContain(prd, [
  '| 修订日期 | 修订内容 | 版本 | 修订人 |',
  '### 2.2 产品流程',
  '### 3.1 C 端功能需求',
  '### 3.2 B 端功能需求',
  'V2.2',
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
  '任务中心获得的是盖世积分，与盖世币分开计算',
  '只有参与发行任务并结算获得的盖世币可兑换京东电子卡',
  '![产品流程]',
  '## 五、待确认项'
], 'PRD');
mustContain(prd, [
  'V2.3',
  '同一实名主体按北京时间自然日最多成功提交 10 个任务',
  '单任务预算下限为 5,000 盖世币',
  '单任务预算上限为 10,000,000 盖世币',
  '预计奖励 = min（当前点赞数 × 每赞单价，单稿奖励上限）',
  '结算奖励 = min（结算快照点赞数 × 每赞单价，单稿奖励上限）',
  '投稿数据校验通过时，系统按该任务的单稿奖励上限预留预算',
  '任务 ID、结算批次和投稿 ID',
  '创作者认证通过后只授予“认证创作者”身份与投稿权限',
  '专属标签是独立状态'
], 'PRD V2.3');
mustContain(prd, [
  '不按 0 点赞结算'
], 'PRD inaccessible-work settlement rule');
assert(
  prd.includes('充值仅支持后台预先配置的固定 SKU') || prd.includes('只支持后台固定 SKU'),
  'PRD V2.3 missing: 充值仅支持后台预先配置的固定 SKU／只支持后台固定 SKU'
);
mustNotContain(cHtml + cJs + bHtml + bJs + prd, [
  '发行积分',
  '发行币',
  '共创币',
  '创作者计划'
], 'publisher currency terminology');
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

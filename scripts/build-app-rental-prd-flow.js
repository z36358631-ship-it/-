const path = require('path');
const sharp = require('sharp');

const workspace = path.resolve(__dirname, '..');
const output = path.join(workspace, 'public', 'prd', 'app-rental', 'app-rental-current-flow.png');

const steps = [
  ['1', '发现租号', '首页、PC游戏、搜索'],
  ['2', '游戏详情', '校验已有权益与可售状态'],
  ['3', '选择权益', '首次体验 2 小时 / 单游戏永久 / 开会员畅玩'],
  ['4', '确认并支付', '微信 / 支付宝，保存订单快照'],
  ['5', '权益生效', '从支付成功开始计时或发放长期权益'],
  ['6', '登录与启动', '无感准备账号，登录成功回游戏详情'],
  ['7', '订单与售后', '查看有效期、退款进度、换号与履约售后'],
];

const cardWidth = 500;
const cardHeight = 250;
const gap = 92;
const marginX = 72;
const width = marginX * 2 + steps.length * cardWidth + (steps.length - 1) * gap;
const height = 620;

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const nodes = steps.map(([num, title, subtitle], index) => {
  const x = marginX + index * (cardWidth + gap);
  const subtitleLines = subtitle.split(' / ');
  const text = subtitleLines.map((line, lineIndex) =>
    `<text x="${x + cardWidth / 2}" y="${330 + lineIndex * 42}" class="sub">${escapeXml(lineIndex < subtitleLines.length - 1 ? `${line} /` : line)}</text>`
  ).join('');
  return `
    <g>
      <rect x="${x}" y="170" width="${cardWidth}" height="${cardHeight}" rx="30" fill="#ffffff" stroke="#dbe4f0" stroke-width="4"/>
      <circle cx="${x + 62}" cy="228" r="34" fill="#2f6bff"/>
      <text x="${x + 62}" y="240" class="num">${num}</text>
      <text x="${x + 114}" y="240" class="title">${escapeXml(title)}</text>
      <line x1="${x + 42}" y1="278" x2="${x + cardWidth - 42}" y2="278" stroke="#e8edf5" stroke-width="3"/>
      ${text}
    </g>`;
}).join('');

const arrows = steps.slice(0, -1).map((_, index) => {
  const x = marginX + cardWidth + index * (cardWidth + gap) + 18;
  return `<path d="M${x} 295 H${x + 46} M${x + 32} 278 L${x + 50} 295 L${x + 32} 312" fill="none" stroke="#9aa9bd" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
}).join('');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f7f9fc"/>
  <style>
    .headline { font-family: "Microsoft YaHei", sans-serif; font-size: 42px; font-weight: 700; fill: #172033; }
    .caption { font-family: "Microsoft YaHei", sans-serif; font-size: 24px; fill: #64748b; }
    .num { font-family: "Microsoft YaHei", sans-serif; font-size: 32px; font-weight: 700; fill: #ffffff; text-anchor: middle; }
    .title { font-family: "Microsoft YaHei", sans-serif; font-size: 32px; font-weight: 700; fill: #182235; }
    .sub { font-family: "Microsoft YaHei", sans-serif; font-size: 24px; fill: #5b687c; text-anchor: middle; }
  </style>
  <text x="${marginX}" y="72" class="headline">APP 租号首期主流程</text>
  <text x="${marginX}" y="115" class="caption">首期只含首次体验、单游戏永久和会员；热门游戏时租为后续版本</text>
  ${nodes}
  ${arrows}
  <rect x="${marginX}" y="482" width="${width - marginX * 2}" height="76" rx="20" fill="#eef4ff"/>
  <text x="${marginX + 30}" y="531" class="caption">异常恢复：支付、权益发放、账号准备或售后结果未知时，保留订单号并查询服务端真值，不重复扣款、发放权益或退款。</text>
</svg>`;

sharp(Buffer.from(svg)).png().toFile(output).catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});

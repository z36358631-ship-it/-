const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const builderPath = path.join(root, 'scripts', 'build-app-rental-prd-flow.js');
const outputPath = path.join(root, 'public', 'prd', 'app-rental', 'app-rental-current-flow.png');
const requiredSourceContracts = [
  '发现租号',
  '游戏详情',
  '选择权益',
  '确认并支付',
  '权益生效',
  '登录与启动',
  '订单管理／续租／售后（按需）',
  '01-discovery-portrait.png',
  '02-detail-portrait.png',
  '03-checkout-portrait.png',
  '17-payment-success-portrait.png',
  '06-steam-login-portrait.png',
  '05-orders-portrait.png',
  'rows: [4, 3]',
  "fit: 'contain'",
  'returnPath',
  '按订单号查询服务端真值',
  '禁止重复扣款、重复发放和重复退款',
];

async function main() {
  const source = fs.readFileSync(builderPath, 'utf8');
  const missing = requiredSourceContracts.filter((value) => !source.includes(value));
  if (missing.length) throw new Error(`缺少流程契约：${missing.join('、')}`);

  const metadata = await sharp(outputPath).metadata();
  if (metadata.format !== 'png') throw new Error(`流程图格式不是PNG：${metadata.format}`);
  if (metadata.width < 2400 || metadata.width > 3000 || metadata.height < 1350 || metadata.height > 1900) {
    throw new Error(`流程图尺寸不合格：${metadata.width}x${metadata.height}`);
  }

  process.stdout.write(`FLOW_CONTRACT 20/20 PASS ${metadata.width}x${metadata.height}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});

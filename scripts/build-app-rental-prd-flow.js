const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const assetDir = path.join(root, 'public', 'prd', 'app-rental');
const outputPath = path.join(assetDir, 'app-rental-current-flow.png');

const steps = [
  { num: '01', title: '发现租号', detail: '识别租号价格与当前权益', image: '01-discovery-portrait.png' },
  { num: '02', title: '游戏详情', detail: '核验权益与商品可售状态', image: '02-detail-portrait.png' },
  { num: '03', title: '选择权益', detail: '体验、永久或开会员畅玩', image: '03-checkout-portrait.png' },
  { num: '04', title: '确认并支付', detail: '核对金额与支付方式后购买', image: '03-checkout-portrait.png' },
  { num: '05', title: '权益生效', detail: '支付成功后计时或发放权益', image: '17-payment-success-portrait.png' },
  { num: '06', title: '登录与启动', detail: '登录成功进入详情下载或启动', image: '06-steam-login-portrait.png' },
  { num: '07', title: '订单管理／续租／售后（按需）', detail: '查看有效期、续租与售后进度', image: '05-orders-portrait.png' },
];

const layout = Object.freeze({
  columns: 4,
  rows: [4, 3],
  width: 2560,
  height: 2280,
  marginX: 70,
  cardWidth: 575,
  cardHeight: 965,
  gapX: 35,
  rowOneY: 150,
  rowTwoY: 1170,
  imageX: 116,
  imageY: 94,
  imageWidth: 342,
  imageHeight: 740,
});

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function positionFor(index) {
  const row = index < layout.rows[0] ? 0 : 1;
  const column = row === 0 ? index : index - layout.rows[0];
  return {
    left: layout.marginX + column * (layout.cardWidth + layout.gapX),
    top: row === 0 ? layout.rowOneY : layout.rowTwoY,
  };
}

function cardSvg(step) {
  const titleSize = step.title.length > 10 ? 25 : 34;
  const detailSize = step.detail.length > 15 ? 21 : 23;
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${layout.cardWidth}" height="${layout.cardHeight}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#7d91a7" flood-opacity="0.16"/>
        </filter>
      </defs>
      <rect x="8" y="8" width="${layout.cardWidth - 16}" height="${layout.cardHeight - 20}" rx="26" fill="#ffffff" stroke="#d8e3ec" stroke-width="2" filter="url(#shadow)"/>
      <rect x="24" y="22" width="62" height="52" rx="14" fill="#11a7bb"/>
      <text x="55" y="58" fill="#ffffff" font-family="Microsoft YaHei, sans-serif" font-size="25" font-weight="700" text-anchor="middle">${step.num}</text>
      <text x="104" y="59" fill="#17324a" font-family="Microsoft YaHei, sans-serif" font-size="${titleSize}" font-weight="700">${escapeXml(step.title)}</text>
      <rect x="114" y="92" width="346" height="744" rx="25" fill="#0b0e13" stroke="#d7e2eb" stroke-width="2"/>
      <line x1="24" y1="860" x2="551" y2="860" stroke="#e6edf3" stroke-width="2"/>
      <circle cx="40" cy="912" r="6" fill="#11a7bb"/>
      <text x="58" y="920" fill="#52677b" font-family="Microsoft YaHei, sans-serif" font-size="${detailSize}" font-weight="500">${escapeXml(step.detail)}</text>
    </svg>
  `);
}

async function roundedScreenshot(step) {
  const resized = await sharp(path.join(assetDir, step.image))
    .resize({
      width: layout.imageWidth,
      height: layout.imageHeight,
      fit: 'contain',
      background: '#0b0e13',
    })
    .png()
    .toBuffer();
  const mask = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${layout.imageWidth}" height="${layout.imageHeight}">
      <rect width="100%" height="100%" rx="15" fill="#ffffff"/>
    </svg>
  `);
  return sharp(resized).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

function arrowBetween(fromIndex, toIndex, top) {
  const from = positionFor(fromIndex);
  const to = positionFor(toIndex);
  const y = top + layout.cardHeight / 2;
  const start = from.left + layout.cardWidth + 9;
  const end = to.left - 13;
  return `<path d="M${start} ${y} H${end}" fill="none" stroke="#18a8b8" stroke-width="6" stroke-linecap="round" marker-end="url(#arrow)"/>`;
}

const fourth = positionFor(3);
const fifth = positionFor(4);
const returnPath = `M${fourth.left + layout.cardWidth / 2} ${fourth.top + layout.cardHeight + 8} V1140 H${fifth.left + layout.cardWidth / 2} V${fifth.top - 14}`;

function backgroundSvg() {
  const horizontalArrows = [
    arrowBetween(0, 1, layout.rowOneY),
    arrowBetween(1, 2, layout.rowOneY),
    arrowBetween(2, 3, layout.rowOneY),
    arrowBetween(4, 5, layout.rowTwoY),
    arrowBetween(5, 6, layout.rowTwoY),
  ].join('');
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}">
      <defs>
        <marker id="arrow" markerWidth="13" markerHeight="13" refX="10" refY="6.5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L11,6.5 L0,13 Z" fill="#18a8b8"/>
        </marker>
      </defs>
      <rect width="100%" height="100%" fill="#f3f7fa"/>
      <text x="80" y="70" fill="#17324a" font-family="Microsoft YaHei, sans-serif" font-size="46" font-weight="700">APP 租号首期主流程</text>
      <text x="80" y="116" fill="#6a7f92" font-family="Microsoft YaHei, sans-serif" font-size="24">首次体验、单游戏永久与会员的发现、购买、履约和订单管理</text>
      ${horizontalArrows}
      <path d="${returnPath}" fill="none" stroke="#18a8b8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow)"/>
      <rect x="70" y="2165" width="2420" height="82" rx="20" fill="#e7f4f7" stroke="#c9e6eb" stroke-width="2"/>
      <circle cx="116" cy="2206" r="21" fill="#11a7bb"/>
      <text x="116" y="2215" fill="#ffffff" font-family="Microsoft YaHei, sans-serif" font-size="25" font-weight="700" text-anchor="middle">!</text>
      <text x="156" y="2215" fill="#4f687c" font-family="Microsoft YaHei, sans-serif" font-size="23">异常恢复：支付、权益发放、登录启动或售后结果未知时，按订单号查询服务端真值；禁止重复扣款、重复发放和重复退款。</text>
    </svg>
  `);
}

async function main() {
  const composites = [{ input: backgroundSvg(), left: 0, top: 0 }];
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const position = positionFor(index);
    composites.push({ input: cardSvg(step), left: position.left, top: position.top });
    composites.push({
      input: await roundedScreenshot(step),
      left: position.left + layout.imageX,
      top: position.top + layout.imageY,
    });
  }

  await sharp({
    create: {
      width: layout.width,
      height: layout.height,
      channels: 4,
      background: '#f3f7fa',
    },
  }).composite(composites).png({ compressionLevel: 9 }).toFile(outputPath);

  const metadata = await sharp(outputPath).metadata();
  process.stdout.write(`BUILD ${path.relative(root, outputPath)} ${metadata.width}x${metadata.height}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});

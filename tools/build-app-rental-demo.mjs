import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const templatePath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.template.html');
const outputPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.html');
const annotationPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能-标注版.html');
const adminFragmentPath = path.join(root, 'demos', 'APP租号功能', 'app-rental-admin.fragment.html');
const sourceAssetDir = path.join(root, 'demos', 'APP租号功能', 'assets', 'source');
const referenceAssetDir = path.join(root, 'demos', 'APP租号功能', 'assets', 'reference');
const assets = {
  APP_PORTRAIT_HOME: path.join(sourceAssetDir, 'portrait-home.jpg'),
  APP_PORTRAIT_PLAY: path.join(sourceAssetDir, 'portrait-play.jpg'),
  APP_PORTRAIT_LIBRARY: path.join(sourceAssetDir, 'portrait-library.jpg'),
  APP_PORTRAIT_PROFILE: path.join(sourceAssetDir, 'portrait-profile.jpg'),
  APP_LANDSCAPE_LIBRARY: path.join(sourceAssetDir, 'landscape-library.jpg'),
  APP_LANDSCAPE_STEAM_LIBRARY: path.join(sourceAssetDir, 'landscape-steam-library.jpg'),
  APP_LANDSCAPE_PLAY: path.join(sourceAssetDir, 'landscape-play.jpg'),
  V611_PORTRAIT_HOME: path.join(referenceAssetDir, '08-portrait-home.png'),
  V611_PORTRAIT_SEARCH: path.join(referenceAssetDir, '09-portrait-search.png'),
  V611_PORTRAIT_DETAIL: path.join(referenceAssetDir, '10-portrait-detail.png'),
  V611_PORTRAIT_PLAY: path.join(referenceAssetDir, '12-portrait-play-pc.png'),
  V611_PORTRAIT_RANKING: path.join(referenceAssetDir, '16-portrait-ranking.png'),
  V611_PORTRAIT_LIBRARY: path.join(referenceAssetDir, '18-portrait-library.png'),
  V611_PORTRAIT_PROFILE: path.join(referenceAssetDir, '30-portrait-profile.png'),
  V611_LANDSCAPE_HOME: path.join(referenceAssetDir, '36-landscape-home.png'),
  V611_LANDSCAPE_PLAY: path.join(referenceAssetDir, '38-landscape-play-pc.png'),
  V611_LANDSCAPE_LIBRARY: path.join(referenceAssetDir, '41-landscape-library.png'),
  V611_LANDSCAPE_RANKING: path.join(referenceAssetDir, '42-landscape-ranking.png'),
  V611_LANDSCAPE_SEARCH: path.join(referenceAssetDir, '43-landscape-search.png'),
  V611_LANDSCAPE_DETAIL: path.join(referenceAssetDir, '44-landscape-detail.png'),
  ORDER_CENTER_REFERENCE: path.join(referenceAssetDir, 'profile-order-center-user-reference.png'),
};

function writeTextWithRetry(filePath, content) {
  let lastError;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      fs.writeFileSync(filePath, content);
      return;
    } catch (error) {
      lastError = error;
      if (!['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES'].includes(error?.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 120);
    }
  }
  throw lastError;
}

function dataUrl(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

let html = fs.readFileSync(templatePath, 'utf8');
for (const [key, filePath] of Object.entries(assets)) {
  if (!fs.existsSync(filePath)) throw new Error(`素材不存在：${filePath}`);
  const placeholder = `{{${key}}}`;
  if (!html.includes(placeholder)) throw new Error(`模板缺少素材占位符：${placeholder}`);
  html = html.replaceAll(placeholder, dataUrl(filePath));
}
if (/\{\{[A-Z0-9_]+\}\}/.test(html)) throw new Error('模板仍存在未替换素材');
writeTextWithRetry(outputPath, html);
process.stdout.write(`BUILD ${path.relative(root, outputPath)} ${Buffer.byteLength(html)} bytes\n`);

const requiredBusinessSignatures = Object.freeze([
  'DISCOVERY_DISPLAY_TYPES',
  'resolveGameDisplayModel',
  'getDiscoveryUserContext',
  'renderDiscoveryDisplay',
  'ORDER_TABS',
  'GAME_SALE_MODES',
  'eligibleCheckoutSkus',
  'renderCheckoutSkuOptions',
  'checkout-product-name',
  "editionId: 'standard'",
  'SEARCH_TABS',
  'renderSearchTabs',
  'getGameEditions',
  'getCheckoutEligibilityContext',
  'setRentalHours',
  'resolveDetailActions',
  "label: '更多'",
  "icon: 'more'",
  "icon: 'quick-play'",
  "acquisitionMode: 'free'",
  'renderMembershipValue',
  'MEMBERSHIP_BENEFITS',
  'MEMBER_PLANS',
  "id: 'weekly'",
  "id: 'quarterly'",
  'renderMembershipPreview',
  'cloudSaveSupported',
  'ORDER_ACTIONS_BY_STATUS',
  'getOrderActions',
  'data-order-search-collapsed',
  'THIRD_PARTY_LOGIN_CONFIGS',
  'requestThirdPartyCode',
  'steam-credential-sheet',
  'checkout-product-edition',
  'checkout-payment-row',
  'detail-more-icon',
  'renderRefundProgressDialog',
  'data-action="open-rental-intro"',
  'data-rental-intro',
  "state.toast = '登录成功，已返回游戏库'",
]);

function assertBusinessScriptSignatures(label, source) {
  for (const signature of requiredBusinessSignatures) {
    if (!source.includes(signature)) throw new Error(`${label} 业务脚本缺少统一签名：${signature}`);
  }
  const legacyPricePresentationReferences = source.match(/resolvePricePresentation\s*\(/g) || [];
  if (legacyPricePresentationReferences.length > 1) {
    throw new Error(`${label} 首页或搜索仍调用旧 resolvePricePresentation`);
  }
  if (source.includes("['refund', '3天无理由']")) {
    throw new Error(`${label} 售后仍把3天无理由作为问题类型`);
  }
  if (source.includes('toggle-more-duration') || source.includes('toggle-entitlement-panel')) {
    throw new Error(`${label} 详情仍保留旧SKU展开路径`);
  }
  if (source.includes('renderActiveOrderActions')) {
    throw new Error(`${label} 订单详情仍使用独立动作映射`);
  }
  if (source.includes('data-checkout-field="edition"')) {
    throw new Error(`${label} 首期确认订单仍显示版本选择`);
  }
  if (source.includes("memberPlan: 'permanent'") || source.includes('data-plan="permanent"')) {
    throw new Error(`${label} 会员中心仍提供永久套餐`);
  }
  if (source.includes('renderGamePaymentQr') || source.includes('renderCheckoutAgreement') || source.includes('renderPriceSummary') || source.includes('一键上号失败') || source.includes('提交账号密码后获取令牌')) {
    throw new Error(`${label} 仍保留第八轮已删除的确认订单或一键上号失败结构`);
  }
  if (source.includes('renderServiceBenefits') || source.includes('订单创建失败')) {
    throw new Error(`${label} 仍保留已删除的五项权益区或确认订单失败死路`);
  }
}

function assertCommercePrimaryStyle(label, style) {
  const primaryRule = style.match(/\.primary-action\s*\{([\s\S]*?)\}/)?.[1] || '';
  if (!/commerce-primary-start/.test(primaryRule) || !/commerce-primary-end/.test(primaryRule)) {
    throw new Error(`${label} 主按钮未使用统一蓝色商业渐变`);
  }
  if (/(?:#ffcc43|#ffe078|#f3bc2c|brand-gold)/i.test(primaryRule)) {
    throw new Error(`${label} 主按钮仍保留旧黄色规则`);
  }
}

const outputStyle = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
const outputBusinessScript = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)?.[1] || '';
assertBusinessScriptSignatures('普通 Demo', outputBusinessScript);
assertCommercePrimaryStyle('普通 Demo', outputStyle);

if (fs.existsSync(annotationPath)) {
  const normalStyle = html.match(/<style>([\s\S]*?)<\/style>/)?.[1].trimEnd();
  const normalScript = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)?.[1].trim();
  if (!normalStyle || !normalScript) throw new Error('普通 Demo 缺少可同步的样式或业务脚本');

  if (!fs.existsSync(adminFragmentPath)) throw new Error(`后台片段不存在：${adminFragmentPath}`);
  const adminFragment = fs.readFileSync(adminFragmentPath, 'utf8').trim();
  if (!adminFragment.includes('APP_RENTAL_ADMIN_FRAGMENT_START') || !adminFragment.includes('window.__appRentalAdminDemo')) {
    throw new Error('后台片段缺少稳定标记或测试 API');
  }

  let annotation = fs.readFileSync(annotationPath, 'utf8');
  if (!annotation.includes('data-annotation-surface="admin"')) {
    annotation = annotation.replace(
      '<div class="annotation-brand"><strong>APP 租号全链路</strong><span class="annotation-subtitle">交互标注文档</span></div>',
      '<div class="annotation-brand"><strong>APP 租号全链路</strong><span class="annotation-subtitle">交互标注文档</span><div class="annotation-surface-switch"><button class="active" type="button" data-annotation-surface="client">APP（安卓端）客户端</button><button type="button" data-annotation-surface="admin">运营后台</button></div></div><nav class="admin-module-nav" aria-label="运营后台模块"><button class="active" type="button" data-admin-page="products">租号商品管理</button><button type="button" data-admin-page="member-library">会员游戏库管理</button><button type="button" data-admin-page="member-plans">会员套餐管理</button><button type="button" data-admin-page="accounts">账号资源管理</button><button type="button" data-admin-page="admin-orders">订单与售后</button><button type="button" data-admin-page="stats">效果统计</button><button type="button" data-admin-page="audit">操作记录</button></nav>',
    );
  }
  if (!annotation.includes('id="appRentalAdminDemo"')) {
    annotation = annotation.replace(
      '<div id="demoScaleFrame" data-scale="1"><main id="appRentalDemo" data-orientation="portrait" data-screen="home"></main></div>',
      '<div id="demoScaleFrame" data-scale="1"><main id="appRentalDemo" data-orientation="portrait" data-screen="home"></main></div><main id="appRentalAdminDemo" hidden></main><!-- APP_RENTAL_ADMIN_INJECT -->',
    );
  }
  const styleMarker = '    /* 交互标注文档壳层：完整 Demo 直接内嵌，不使用 iframe。 */';
  const scriptMarker = '  <script>\n    const ANNOTATION_GROUPS = Object.freeze([';
  if (!annotation.includes(styleMarker) || !annotation.includes(scriptMarker)) throw new Error('标注版缺少稳定同步标记');

  annotation = annotation.replace(
    /<style>[\s\S]*?(?=    \/\* 交互标注文档壳层：完整 Demo 直接内嵌，不使用 iframe。 \*\/)/,
    `<style>${normalStyle}\n\n`,
  );
  annotation = annotation.replace(
    /\s*<script>\s*const ASSETS[\s\S]*?<\/script>(?=\s*<script>\s*const ANNOTATION_GROUPS)/,
    `  <script>${normalScript}</script>`,
  );
  annotation = annotation.replace(
    '订单列表与详情分别使用独立任务页。',
    '订单列表与详情拆页，分别使用独立任务页；所有状态操作按钮完整收在订单卡片边界内。',
  );
  annotation = annotation.replace(
    '滚动页展示8款会员游戏；仅支持的游戏显示“支持云存档”。',
    '滚动页展示8款会员游戏；仅支持的游戏在封面下方信息区显示“支持云存档”。',
  );
  annotation = annotation.replace(
    '受首屏高度限制预览前4款，完整8款通过“查看全部”进入会员游戏库；预览卡同步显示云存档支持标识。',
    '受首屏高度限制预览前4款，完整8款通过“查看全部”进入会员游戏库；云存档支持标识位于封面下方信息区，不叠加在封面上。',
  );
  annotation = annotation.replace(
    '商品卡在游戏名下用灰色副标题只读显示“标准版”；顺序为商品、五项权益、套餐、游戏原价/订单金额、支付方式和固定支付栏。',
    '商品卡在游戏名下用灰色副标题只读显示“标准版”，下方展示当前 SKU 权益说明；顺序为商品、权益说明、套餐、游戏原价/订单金额、支付方式和固定支付栏；右上角只显示纯文字“租号介绍”。',
  );
  annotation = annotation.replace(
    '商品卡在游戏名下用灰色副标题只读显示“标准版”；顺序为商品、套餐、游戏原价/订单金额、支付方式和固定支付栏；右上角只显示纯文字“租号介绍”。',
    '商品卡在游戏名下用灰色副标题只读显示“标准版”，下方展示当前 SKU 权益说明；顺序为商品、权益说明、套餐、游戏原价/订单金额、支付方式和固定支付栏；右上角只显示纯文字“租号介绍”。',
  );
  annotation = annotation.replaceAll(
    '左栏只放商品与五项权益；右栏按套餐、游戏原价/订单金额、支付方式、需支付与立即购买排列，低高度时右栏内部滚动。',
    '左栏展示商品与当前 SKU 权益说明；右栏按套餐、游戏原价/订单金额、支付方式、需支付与立即购买排列，低高度时右栏内部滚动。',
  );
  annotation = annotation.replaceAll(
    '左栏只放商品；右栏按套餐、游戏原价/订单金额、支付方式、需支付与立即购买排列，低高度时右栏内部滚动。',
    '左栏展示商品与当前 SKU 权益说明；右栏按套餐、游戏原价/订单金额、支付方式、需支付与立即购买排列，低高度时右栏内部滚动。',
  );
  annotation = annotation.replace(
    '套餐变化后重建草稿；订单金额、需支付与支付请求精确读取同一订单快照。',
    '进入页面前先创建或复用待支付草稿；套餐变化后重建草稿；租号介绍以“作用 / 使用方法 / 注意事项”三组常见问题逐项一问一答，关闭后保留套餐、金额和支付方式。',
  );
  annotation = annotation.replace(
    '进入页面前先创建或复用待支付草稿；套餐变化后重建草稿；租号介绍弹窗关闭后保留套餐、金额和支付方式。',
    '进入页面前先创建或复用待支付草稿；套餐变化后重建草稿；租号介绍以“作用 / 使用方法 / 注意事项”三组常见问题逐项一问一答，关闭后保留套餐、金额和支付方式。',
  );
  annotation = annotation.replace(
    '不显示版本选择器；开会员清除游戏待支付草稿并进入会员中心，不生成游戏订单；首次资格失效时移除首次体验。',
    '不显示版本选择器和五项通用权益区；正常可售场景不得出现订单创建失败；开会员清除游戏待支付草稿并进入会员中心，不生成游戏订单；首次资格失效时移除首次体验。',
  );
  annotation = annotation.replace(
    '不显示版本选择器和五项权益区；正常可售场景不得出现订单创建失败；开会员清除游戏待支付草稿并进入会员中心，不生成游戏订单；首次资格失效时移除首次体验。',
    '不显示版本选择器和五项通用权益区；正常可售场景不得出现订单创建失败；开会员清除游戏待支付草稿并进入会员中心，不生成游戏订单；首次资格失效时移除首次体验。',
  );
  annotation = annotation.replace(
    '左侧仅商品和五项权益；右侧按套餐、游戏原价/订单金额、支付方式和支付栏排列，并允许低高度内部滚动。',
    '左侧展示商品与当前 SKU 权益说明；右侧按套餐、游戏原价/订单金额、支付方式和支付栏排列，并允许低高度内部滚动。',
  );
  annotation = annotation.replace(
    '左侧仅商品；右侧按套餐、游戏原价/订单金额、支付方式和支付栏排列，并允许低高度内部滚动。',
    '左侧展示商品与当前 SKU 权益说明；右侧按套餐、游戏原价/订单金额、支付方式和支付栏排列，并允许低高度内部滚动。',
  );
  annotation = annotation.replace(
    /<!-- APP_RENTAL_ADMIN_FRAGMENT_START -->[\s\S]*?<!-- APP_RENTAL_ADMIN_FRAGMENT_END -->|<!-- APP_RENTAL_ADMIN_INJECT -->/,
    adminFragment,
  );
  const requiredAdminSignatures = [
    'APP（安卓端）客户端',
    '运营后台',
    '租号商品管理',
    '会员游戏库管理',
    '会员套餐管理',
    '账号资源管理',
    '订单与售后',
    '效果统计',
    '操作记录',
    'data-admin-client-tab="android"',
    'data-admin-client-tab="mac"',
    'window.__appRentalAdminDemo',
  ];
  const missingAdminSignatures = requiredAdminSignatures.filter((signature) => !annotation.includes(signature));
  if (missingAdminSignatures.length) throw new Error(`标注版缺少后台签名：${missingAdminSignatures.join('、')}`);
  writeTextWithRetry(annotationPath, annotation);

  const annotationBusinessScript = annotation.match(/<script>\s*(const ASSETS[\s\S]*?)<\/script>\s*<script>\s*const ANNOTATION_GROUPS/)?.[1] || '';
  const annotationStyle = annotation.match(/<style>([\s\S]*?)(?=    \/\* 交互标注文档壳层：完整 Demo 直接内嵌，不使用 iframe。 \*\/)/)?.[1] || '';
  if (!annotationBusinessScript) throw new Error('标注版缺少可验证的业务脚本');
  assertBusinessScriptSignatures('标注版', annotationBusinessScript);
  assertCommercePrimaryStyle('标注版', annotationStyle);
  process.stdout.write(`SYNC ${path.relative(root, annotationPath)} ${Buffer.byteLength(annotation)} bytes\n`);
}

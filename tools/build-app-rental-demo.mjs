import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const templatePath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.template.html');
const outputPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.html');
const annotationPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能-标注版.html');
const adminFragmentPath = path.join(root, 'demos', 'APP租号功能', 'app-rental-admin.fragment.html');
// Only this request's two registered screenshots may supply local cropped media.
// Every existing product media component continues to use wireframeMedia.
const memberEntryAssets = Object.freeze({
  MEMBER_ENTRY_LIBRARY_REFERENCE: path.join(root, 'demos', 'APP租号功能', 'assets', 'reference', '2026-09-21-portrait-library-user.png'),
  MEMBER_ENTRY_PC_REFERENCE: path.join(root, 'demos', 'APP租号功能', 'assets', 'reference', '2026-09-21-portrait-pc-user.png'),
});

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

let html = fs.readFileSync(templatePath, 'utf8');
if (/data:image\/(?:png|jpe?g|webp)/i.test(html)) throw new Error('模板不得直接内嵌未登记位图');
const imageTemplates = html.match(/<img\b[^>]*>/g) || [];
if (imageTemplates.length !== 1 || !imageTemplates[0].includes('data-member-entry-media="${assetKey}"') || !imageTemplates[0].includes('src="${ENTRY_MEDIA[assetKey]}"')) throw new Error('模板包含未登记图片组件');
for (const [key, assetPath] of Object.entries(memberEntryAssets)) {
  const placeholder = `{{${key}}}`;
  if (!html.includes(placeholder)) throw new Error(`缺少本轮素材占位符：${key}`);
  const bytes = fs.readFileSync(assetPath);
  if (bytes.length > 650_000) throw new Error(`本轮素材超出大小限制：${key}`);
  html = html.replaceAll(placeholder, `data:image/png;base64,${bytes.toString('base64')}`);
}
if (/\{\{[A-Z0-9_]+\}\}/.test(html)) throw new Error('模板包含未登记素材占位符');
if (/(?:src|href)=["']https?:|url\(["']?https?:/i.test(html)) throw new Error('模板仍包含外部媒体依赖');
writeTextWithRetry(outputPath, html);
process.stdout.write(`BUILD ${path.relative(root, outputPath)} ${Buffer.byteLength(html)} bytes\n`);

const requiredBusinessSignatures = Object.freeze([
  'DISCOVERY_DISPLAY_TYPES',
  'resolveGameDisplayModel',
  'getDiscoveryUserContext',
  'renderDiscoveryDisplay',
  'PLAY_PC_GAMES',
  'DISCOVERY_LIST_STATES',
  'renderDiscoveryListState',
  'data-discovery-rental-state',
  'LIBRARY_TOP_TABS',
  'openMemberLibrary',
  'renderLibraryEntitlementMeta',
  'formatLibraryRemaining',
  'data-library-entitlement-card',
  'wireframeMedia',
  'data-wireframe-media',
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
  'AFTER_SALES_REQUEST_TYPES',
  'AFTER_SALES_REASONS',
  'setAfterSalesRequestType',
  'RENTAL_NOTIFICATIONS',
  'renderPortraitNotifications',
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
  'renderServiceBenefits',
  'data-action="open-no-reason-policy"',
  'resolveGameNotice',
  'evaluateRefundRisk',
  'applyRefundResult',
  '获取并输入验证码',
  '已同意，待下次启动',
  "showToast('登录成功，已进入游戏详情')",
]);

function assertBusinessScriptSignatures(label, source) {
  for (const signature of requiredBusinessSignatures) {
    if (!source.includes(signature)) throw new Error(`${label} 业务脚本缺少统一签名：${signature}`);
  }
  const legacyPricePresentationReferences = source.match(/resolvePricePresentation\s*\(/g) || [];
  if (legacyPricePresentationReferences.length > 1) {
    throw new Error(`${label} 首页或搜索仍调用旧 resolvePricePresentation`);
  }
  if (source.includes('const AFTER_SALES_TYPES')) {
    throw new Error(`${label} 售后仍使用未区分退款与换号的旧问题类型结构`);
  }
  if (source.includes('play-card-action') || source.includes('applyRealCrops') || source.includes('const ASSETS')) {
    throw new Error(`${label} 仍保留列表独立操作或旧位图实现`);
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
  if (source.includes('订单创建失败')) {
    throw new Error(`${label} 仍保留确认订单失败死路`);
  }
  if (source.includes('开通会员后可在工作时间联系客服申请远程协助')) {
    throw new Error(`${label} 会员首次弹窗仍保留远程协助`);
  }
  const removedClientState = ['alloc', 'ating'].join('');
  const removedClientCopies = [
    ['分配', '中'].join(''),
    ['刷新', '状态'].join(''),
    ['账号分配', '中'].join(''),
  ];
  const removedClientApi = ['allocate', 'Account'].join('');
  if (source.includes(removedClientState)
    || removedClientCopies.some((copy) => source.includes(copy))
    || source.includes(removedClientApi)) {
    throw new Error(`${label} 仍暴露已删除的账号准备中间状态`);
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
  const adminPreviewFragment = adminFragment
    .replace(
      '</style>',
      `  .annotation-admin-link { display: flex; min-height: 38px; align-items: center; padding: 0 10px; border: 1px solid rgb(77 184 232 / 45%); border-radius: 9px; background: rgb(77 184 232 / 14%); color: #9fe2ff; font-size: 11px; text-decoration: none; }
  .annotation-admin-link:hover { background: rgb(77 184 232 / 22%); color: #c8f0ff; }
  .annotation-admin-note { margin: 10px 0 0; color: rgb(255 255 255 / 52%); font-size: 10px; line-height: 16px; }
  #appRentalAdminDemo .admin-readonly-control { border-color: transparent; background: transparent; color: #8c96a5; cursor: default; }
  #appRentalAdminDemo .admin-toolbar input[readonly],
  #appRentalAdminDemo .admin-toolbar select:disabled { border-color: #e7eaf0; background: #f7f8fa; color: #9aa3b1; cursor: default; opacity: 1; }
</style>`,
    )
    .replace(/<button class="a-btn([^"]*)" data-admin-action="[^"]+"([^>]*)>([\s\S]*?)<\/button>/g, '<span class="a-btn$1 admin-readonly-control"$2>$3</span>')
    .replace(/<input([^>]*?)>/g, '<input$1 readonly tabindex="-1">')
    .replace(/<select([^>]*?)>/g, '<select$1 disabled tabindex="-1">');

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
  annotation = annotation.replace(
    /<div class="annotation-surface-switch">[\s\S]*?<\/div><\/div><nav class="admin-module-nav"/,
    '<div class="annotation-surface-switch"><button class="active" type="button" data-annotation-surface="client">APP（安卓端）客户端</button><button type="button" data-annotation-surface="admin">后台只读预览</button><a class="annotation-admin-link" href="../../Mac端demo/mac端租号功能/Mac端租号功能-标注版.html?mode=admin&page=products" target="_blank" rel="noopener">打开完整统一租号后台 ↗</a></div><p class="annotation-admin-note">前 6 个后台页仅在 Mac 后台基础上新增“APP（安卓端）”Tab；操作记录无端别 Tab。查询、新建、编辑、上下架等交互全部复用 Mac 后台。</p></div><nav class="admin-module-nav"',
  );
  const styleMarker = '    /* 交互标注文档壳层：完整 Demo 直接内嵌，不使用 iframe。 */';
  const scriptMarker = /<script>\r?\n\s*const ANNOTATION_GROUPS = Object\.freeze\(\[/;
  if (!annotation.includes(styleMarker) || !scriptMarker.test(annotation)) throw new Error('标注版缺少稳定同步标记');

  annotation = annotation.replace(
    /<style>[\s\S]*?(?=    \/\* 交互标注文档壳层：完整 Demo 直接内嵌，不使用 iframe。 \*\/)/,
    `<style>${normalStyle}\n\n`,
  );
  annotation = annotation.replace(
    /\s*<script>\s*(?:const ASSETS|const ORDER_TABS)[\s\S]*?<\/script>(?=\s*<script>\s*const ANNOTATION_GROUPS)/,
    `  <script>${normalScript}</script>`,
  );
  annotation = annotation.replace(
    '订单列表与详情分别使用独立任务页。',
    '订单列表与详情拆页，分别使用独立任务页；所有状态操作按钮完整收在订单卡片边界内。',
  );
  annotation = annotation.replaceAll(
    /滚动页展示8款会员游戏；[^']*支持云存档[^']*。/g,
    '滚动页展示8款会员游戏；卡片只显示游戏名称和灰色“标准版”副标题。',
  );
  annotation = annotation.replaceAll(
    /受首屏高度限制预览前4款，完整8款通过“查看全部”进入会员游戏库；[^']*云存档[^']*。/g,
    '受首屏高度限制预览前4款，完整8款通过“查看更多”进入可搜索的完整会员游戏库。',
  );
  annotation = annotation.replaceAll('原四项会员权益', '三项会员权益');
  annotation = annotation.replaceAll('四项权益', '三项权益');
  annotation = annotation.replaceAll('PC引擎与手柄适配、', '');
  annotation = annotation.replaceAll('季卡保持推荐锚点。', '默认选中周卡，不显示推荐角标。');
  annotation = annotation.replaceAll('Demo 暂用周卡¥39、月卡¥129、季卡¥299并推荐季卡；周卡/季卡正式价格与推荐档待运营确认，待支付订单切换套餐时重建。', 'Demo 暂用周卡¥39、月卡¥129、季卡¥299并默认选中周卡；待支付订单切换套餐时重建。');
  annotation = annotation.replaceAll('个人云存档同步只是三项权益之一', '个人云存档同步是三项权益之一');
  annotation = annotation.replaceAll('关闭登录方式弹窗，显示登录成功反馈并返回游戏库。', '关闭登录方式弹窗，显示登录成功反馈并进入对应游戏详情。');
  annotation = annotation.replaceAll('使用相同成功路径并返回横版游戏库。', '使用相同成功路径并进入对应游戏详情。');
  annotation = annotation.replaceAll('从租赁中订单', '从可使用订单');
  annotation = annotation.replaceAll('仅租赁中订单', '仅可使用订单');
  annotation = annotation.replaceAll('租赁中详情为申请售后、登录信息、登录游戏。', '可使用订单详情为申请售后、登录信息、登录游戏。');
  annotation = annotation.replaceAll('不显示内部账号准备状态', '不展示内部过程状态');
  annotation = annotation.replaceAll('提交账号密码后进入 Steam Guard 二次校验。', '提交账号密码后进入 Steam 验证阶段；到达验证码页后点击“获取并输入验证码”，系统自动输入并进入游戏详情。');
  annotation = annotation.replaceAll('依赖 orderTab、orderSearch、orderSearchOpen 与六种租号订单状态集合。', '依赖 orderTab、orderSearch、orderSearchOpen 与五种租号订单状态集合。');
  annotation = annotation.replaceAll('反馈: \'创建售后单，并可继续申请同游戏同版本换号。\'', '反馈: \'提交成功后关闭申请页并提示“售后申请已提交”；订单入口改为“售后详情”，弹窗展示进度并支持撤销。\'');
  annotation = annotation.replace(
    /\{ id: '13', type: 'interaction', group: 'after-sales',[^\n]+/,
    "{ id: '13', type: 'interaction', group: 'after-sales', title: '售后诉求与原因', portraitSelector: '.after-sales-request-types, .after-sales-types', landscapeSelector: '.after-sales-request-types, .after-sales-types', trigger: '从可使用订单进入申请售后。', portrait: '先选择申请退款或申请换号，再按诉求选择退款原因或换号原因。', landscape: '右侧售后面板使用相同两级结构。', feedback: '退款展示预计退款金额；换号说明审核通过后下次启动生效。', dependency: '3天无理由仅在订单资格快照允许时可选；其他履约原因不受影响。', exception: '同一订单只允许一个进行中的售后；不可撤销阶段隐藏撤销入口。' },",
  );
  annotation = annotation.replace(
    /\{ id: 'G7', type: 'global', group: 'after-sales',[^\n]+/,
    "{ id: 'G7', type: 'global', group: 'after-sales', title: 'D7 · 售后独立任务页', portraitSelector: '.portrait-after-sales', landscapeSelector: '.landscape-after-sales', trigger: '从订单详情进入售后，或编辑草稿、旋转与提交时。', portrait: '按订单摘要、售后诉求、具体原因、提示和问题描述顺序纵向适配。', landscape: '继承 Mac 售后骨架，左侧订单摘要、右侧售后表单。', feedback: '提交成功后返回订单详情，入口改为售后详情；允许阶段可撤销。', dependency: 'taskStack 保留来源层级，并读取订单、售后单与同版本库存结果。', exception: '退款进入渠道后不可撤销；换号执行后不可撤销；任务页不读取敏感登录信息。' },",
  );
  annotation = annotation.replace(
    '商品卡在游戏名下用灰色副标题只读显示“标准版”；顺序为商品、五项权益、套餐、游戏原价/订单金额、支付方式和固定支付栏。',
    '商品卡在游戏名下用灰色副标题只读显示“标准版”，下方保留上一版五项租号权益；顺序为商品、租号权益、套餐、游戏原价/订单金额、支付方式和固定支付栏；右上角只显示纯文字“租号介绍”。',
  );
  annotation = annotation.replace(
    '商品卡在游戏名下用灰色副标题只读显示“标准版”；顺序为商品、套餐、游戏原价/订单金额、支付方式和固定支付栏；右上角只显示纯文字“租号介绍”。',
    '商品卡在游戏名下用灰色副标题只读显示“标准版”，下方保留上一版五项租号权益；顺序为商品、租号权益、套餐、游戏原价/订单金额、支付方式和固定支付栏；右上角只显示纯文字“租号介绍”。',
  );
  annotation = annotation.replace(
    '商品卡在游戏名下用灰色副标题只读显示“标准版”，下方展示当前 SKU 权益说明；顺序为商品、权益说明、套餐、游戏原价/订单金额、支付方式和固定支付栏；右上角只显示纯文字“租号介绍”。',
    '商品卡在游戏名下用灰色副标题只读显示“标准版”，下方保留上一版五项租号权益；顺序为商品、租号权益、套餐、游戏原价/订单金额、支付方式和固定支付栏；右上角只显示纯文字“租号介绍”。',
  );
  annotation = annotation.replaceAll(
    '左栏只放商品与五项权益；右栏按套餐、游戏原价/订单金额、支付方式、需支付与立即购买排列，低高度时右栏内部滚动。',
    '左栏展示商品与上一版五项租号权益；右栏按套餐、游戏原价/订单金额、支付方式、需支付与立即购买排列，低高度时右栏内部滚动。',
  );
  annotation = annotation.replaceAll(
    '左栏只放商品；右栏按套餐、游戏原价/订单金额、支付方式、需支付与立即购买排列，低高度时右栏内部滚动。',
    '左栏展示商品与上一版五项租号权益；右栏按套餐、游戏原价/订单金额、支付方式、需支付与立即购买排列，低高度时右栏内部滚动。',
  );
  annotation = annotation.replaceAll(
    '左栏展示商品与当前 SKU 权益说明；右栏按套餐、游戏原价/订单金额、支付方式、需支付与立即购买排列，低高度时右栏内部滚动。',
    '左栏展示商品与上一版五项租号权益；右栏按套餐、游戏原价/订单金额、支付方式、需支付与立即购买排列，低高度时右栏内部滚动。',
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
    '不显示版本选择器；正常可售场景不得出现订单创建失败；开会员畅玩清除游戏待支付草稿并进入会员中心，不生成游戏订单；首次资格失效时移除首次体验。',
  );
  annotation = annotation.replace(
    '不显示版本选择器和五项权益区；正常可售场景不得出现订单创建失败；开会员清除游戏待支付草稿并进入会员中心，不生成游戏订单；首次资格失效时移除首次体验。',
    '不显示版本选择器；正常可售场景不得出现订单创建失败；开会员畅玩清除游戏待支付草稿并进入会员中心，不生成游戏订单；首次资格失效时移除首次体验。',
  );
  annotation = annotation.replace(
    '不显示版本选择器和五项通用权益区；正常可售场景不得出现订单创建失败；开会员清除游戏待支付草稿并进入会员中心，不生成游戏订单；首次资格失效时移除首次体验。',
    '不显示版本选择器；正常可售场景不得出现订单创建失败；开会员畅玩清除游戏待支付草稿并进入会员中心，不生成游戏订单；首次资格失效时移除首次体验。',
  );
  annotation = annotation.replaceAll('开会员清除游戏待支付草稿', '开会员畅玩清除游戏待支付草稿');
  annotation = annotation.replaceAll('非热门游戏仅首次体验、单游戏永久与开会员。', '非热门游戏仅首次体验、单游戏永久与开会员畅玩。');
  annotation = annotation.replaceAll('非热门游戏只显示首次体验、单游戏永久和开会员。', '非热门游戏只显示首次体验、单游戏永久和开会员畅玩，三个按钮同一行且不换行。');
  annotation = annotation.replace(
    '左侧仅商品和五项权益；右侧按套餐、游戏原价/订单金额、支付方式和支付栏排列，并允许低高度内部滚动。',
    '左侧展示商品与上一版五项租号权益；右侧按套餐、游戏原价/订单金额、支付方式和支付栏排列，并允许低高度内部滚动。',
  );
  annotation = annotation.replace(
    '左侧仅商品；右侧按套餐、游戏原价/订单金额、支付方式和支付栏排列，并允许低高度内部滚动。',
    '左侧展示商品与上一版五项租号权益；右侧按套餐、游戏原价/订单金额、支付方式和支付栏排列，并允许低高度内部滚动。',
  );
  annotation = annotation.replace(
    '左侧展示商品与当前 SKU 权益说明；右侧按套餐、游戏原价/订单金额、支付方式和支付栏排列，并允许低高度内部滚动。',
    '左侧展示商品与上一版五项租号权益；右侧按套餐、游戏原价/订单金额、支付方式和支付栏排列，并允许低高度内部滚动。',
  );
  annotation = annotation.replace(
    /<!-- APP_RENTAL_ADMIN_FRAGMENT_START -->[\s\S]*?<!-- APP_RENTAL_ADMIN_FRAGMENT_END -->|<!-- APP_RENTAL_ADMIN_INJECT -->/,
    adminPreviewFragment,
  );
  const discoveryStateNote = "      { id: '2A', type: 'interaction', group: 'discovery', title: '发现列表三种租号状态', portraitSelector: '[data-discovery-game-card]', landscapeSelector: '[data-discovery-game-card]', trigger: '进入玩游戏·PC游戏或排行榜。', portrait: '明确穷举“¥1.9 首租 / 已租号 / 可畅玩”，第二行统一为“99+ 在租”。', landscape: '保持相同三态，按横屏卡片密度独立排版。', feedback: '点击整张卡片进入详情；列表不提供启动、下载或购买按钮。', dependency: '本规则只用于发现列表，搜索结果继续使用已确认的个性化价格优先级。', exception: '不展示账号分配、凭据获取或自动登录等内部状态。' },";
  if (annotation.includes("id: '2A'")) {
    annotation = annotation.replace(/\s*\{ id: '2A', type: 'interaction', group: 'discovery',[^\n]+/, `\n${discoveryStateNote}`);
  } else {
    annotation = annotation.replace(
      /({ id: '2', type: 'interaction', group: 'discovery',[^\n]+\n)/,
      `$1${discoveryStateNote}\n`,
    );
  }
  const memberEntryAnnotationNotes = [
  "{ id: '2B', type: 'interaction', group: 'discovery', title: '游戏库会员游戏入口', portraitSelector: '.library-platform-entries', landscapeSelector: '.library-member-shortcut', trigger: '游戏库PC游戏点击Steam左侧会员游戏。', portrait: '顶部保留PC游戏和复古游戏，来源行依次会员游戏、Steam、Epic、导入游戏。', landscape: '会员游戏入口位于Steam左侧，沿用横屏来源按钮。', feedback: '进入真正的二级会员游戏库页，返回恢复游戏库与原来源。', dependency: '共用member-library路由及会员状态、搜索、卡片，不再使用顶层会员Tab。', exception: 'Steam、Epic、导入及租号权益列表仍保留原交互。' },",
  "{ id: '2C', type: 'interaction', group: 'discovery', title: '游戏库权益与有效期', portraitSelector: '[data-library-entitlement-card]', landscapeSelector: '[data-library-entitlement-card]', trigger: '查看PC游戏库中的租号权益。', portrait: '哈迪斯2原页面下方保留租号游戏区，显示版本、权益和首次体验剩余有效期。', landscape: '原权益网格保留，不把新增入口替换为业务卡片。', feedback: '租号游戏整卡进入详情；永久权益不显示倒计时。', dependency: '会员库顶部仍显示会员状态、有效期及开通或续费按钮。', exception: '仅本轮登记截图局部使用内嵌媒体，已有其他媒体继续使用线框。' },",
  "{ id: '8', type: 'interaction', group: 'membership', title: '会员游戏预览与统一入口', portraitSelector: '.membership-preview', landscapeSelector: '.membership-preview', trigger: '点击会员游戏库标题或查看全部。', portrait: '标题与查看全部均进入二级会员游戏库，预览卡仍显示名称和灰色标准版。', landscape: '前4款按横屏密度展示，标题和查看全部复用相同子页。', feedback: '返回会员中心时恢复滚动位置；游戏卡仍进入对应详情。', dependency: '子页保留搜索、会员有效期、去开通及续费入口。', exception: '不生成顶层会员Tab，不改变会员套餐与购买规则。' },",
  "{ id: '8A', type: 'interaction', group: 'membership', title: '首页PC会员游戏库', portraitSelector: '[data-member-library-entry=\"pc-channel\"]', landscapeSelector: '.landscape-pc-member-entry', trigger: '进入首页PC游戏，点击会员游戏库标题或查看全部。', portrait: '热门推荐下增加会员游戏库及双卡预览，后续免费游戏与发现三态列表保留。', landscape: 'PC频道加入会员游戏库和查看全部，保留发现卡三态及整卡详情。', feedback: '进入统一二级member-library页，返回恢复首页PC频道和原滚动位置。', dependency: 'homeChannel与来源滚动由页面状态及路由上下文保存。', exception: '会员卡点击仍进入对应游戏详情，不新增付款或登录步骤。' },"
];
  for (const note of memberEntryAnnotationNotes) {
    const id = note.match(/id: '([^']+)'/)[1];
    const pattern = new RegExp("\\{ id: '" + id + "', type: 'interaction', group: '[^']+',[^\\n]+");
    if (pattern.test(annotation)) annotation = annotation.replace(pattern, note);
    else annotation = annotation.replace(/(const ANNOTATIONS = Object\.freeze\(\[)/, '$1\n      ' + note);
  }
  const requiredAdminSignatures = [
    'APP（安卓端）客户端',
    '后台只读预览',
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
    '../../Mac端demo/mac端租号功能/Mac端租号功能-标注版.html?mode=admin&page=products',
    '后台只读预览',
    '查询、新建、编辑、上下架等交互全部复用 Mac 后台',
    "id: '2A'",
    "id: '2B'",
    "id: '2C'",
  ];
  const missingAdminSignatures = requiredAdminSignatures.filter((signature) => !annotation.includes(signature));
  if (missingAdminSignatures.length) throw new Error(`标注版缺少后台签名：${missingAdminSignatures.join('、')}`);
  writeTextWithRetry(annotationPath, annotation);

  const annotationBusinessScript = annotation.match(/<script>\s*((?:const ORDER_TABS)[\s\S]*?)<\/script>\s*<script>\s*const ANNOTATION_GROUPS/)?.[1] || '';
  const annotationStyle = annotation.match(/<style>([\s\S]*?)(?=    \/\* 交互标注文档壳层：完整 Demo 直接内嵌，不使用 iframe。 \*\/)/)?.[1] || '';
  if (!annotationBusinessScript) throw new Error('标注版缺少可验证的业务脚本');
  assertBusinessScriptSignatures('标注版', annotationBusinessScript);
  assertCommercePrimaryStyle('标注版', annotationStyle);
  process.stdout.write(`SYNC ${path.relative(root, annotationPath)} ${Buffer.byteLength(annotation)} bytes\n`);
}

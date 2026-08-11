import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.html');
const templatePath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.template.html');
const annotationPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能-标注版.html');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const verificationEvidencePath = path.join(root, 'test-results', 'app-rental-verification', 'contract-results.json');

const EXPECTED_DEVICE_DIMENSIONS = Object.freeze({
  portrait: Object.freeze({ width: 390, height: 844 }),
  landscape: Object.freeze({ width: 874, height: 402 }),
});

const FULL_PAGE_MATRIX = Object.freeze([
  { pageId: 'home', screen: 'home', baselineSource: 'app-v611' },
  { pageId: 'play', screen: 'play', baselineSource: 'app-v611' },
  { pageId: 'community', screen: 'community', baselineSource: 'app-v611' },
  { pageId: 'ranking', screen: 'ranking', baselineSource: 'app-v611' },
  { pageId: 'library', screen: 'library', baselineSource: 'app-v611' },
  { pageId: 'profile', screen: 'profile', baselineSource: 'app-v611' },
  { pageId: 'search', screen: 'search', baselineSource: 'app-v611' },
  { pageId: 'detail', screen: 'detail', baselineSource: 'app-v611' },
  { pageId: 'checkout', screen: 'checkout', baselineSource: 'mac-rental' },
  { pageId: 'membership', screen: 'membership', baselineSource: 'mac-rental' },
  { pageId: 'member-library', screen: 'member-library', baselineSource: 'mac-rental' },
  { pageId: 'orders', screen: 'orders', baselineSource: 'mac-rental' },
  { pageId: 'order-detail', screen: 'order-detail', baselineSource: 'mac-rental' },
  { pageId: 'steam-login', screen: 'steam-login', baselineSource: 'mac-rental' },
  { pageId: 'expiry-15m', screen: 'orders', baselineSource: 'mac-rental' },
  { pageId: 'after-sales', screen: 'after-sales', baselineSource: 'mac-rental' },
  { pageId: 'payment-success', screen: 'checkout', baselineSource: 'mac-rental' },
  { pageId: 'membership-success', screen: 'membership', baselineSource: 'mac-rental' },
]);

const EXPECTED_ORDER_TABS = Object.freeze([
  { id: 'all', label: '全部订单' },
  { id: 'pending', label: '待支付' },
  { id: 'usable', label: '可使用' },
]);

const EXPECTED_RENTAL_STATUSES = Object.freeze([
  'pending',
  'allocating',
  'active',
  'refunding',
  'refunded',
  'ended',
]);

function writeJsonEvidence(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const content = `${JSON.stringify(payload, null, 2)}\n`;
  let lastError;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return;
    } catch (error) {
      lastError = error;
      if (!['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES'].includes(error?.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 120);
    }
  }
  throw lastError;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  assert(fs.existsSync(htmlPath), `找不到 Demo：${htmlPath}`);
  let annotationChecks = 0;
  const assertAnnotation = (condition, message) => {
    assert(condition, message);
    annotationChecks += 1;
  };
  assertAnnotation(fs.existsSync(annotationPath), `缺少标注版 Demo：${annotationPath}`);
  const annotationSource = fs.readFileSync(annotationPath, 'utf8');
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const thirdReviewSourceChecks = [
    ['稳定游戏售卖模式', templateSource.includes('GAME_SALE_MODES') && templateSource.includes("TIME_RENTAL: 'time-rental'") && templateSource.includes("ENTITLEMENT: 'entitlement'")],
    ['确认订单内选择 SKU', templateSource.includes('renderCheckoutSkuOptions') && templateSource.includes('select-checkout-sku')],
    ['详情一次进入确认订单', /label:\s*'租号开玩',\s*action:\s*'begin-checkout'/.test(templateSource)],
    ['搜索真实 Tab 状态', templateSource.includes('SEARCH_TABS') && templateSource.includes('data-search-tab')],
    ['会员原权益介绍', templateSource.includes('renderMembershipValue') && templateSource.includes('MEMBERSHIP_BENEFITS') && templateSource.includes('个人云存档同步')],
    ['首页 Banner 首租与在租信息', templateSource.includes('hero-rental-price') && templateSource.includes("id: 'first-rent-2h'") && templateSource.includes('price: 1.9') && templateSource.includes('hero-rental-demand') && templateSource.includes('99+ 在租')],
    ['售后四项且无无理由原因', !templateSource.includes("['refund', '3天无理由']")],
  ];
  const failedThirdReviewSourceChecks = thirdReviewSourceChecks.filter(([, passed]) => !passed).map(([name]) => name);
  assert(failedThirdReviewSourceChecks.length === 0, `THIRD_REVIEW 源码契约未通过：${failedThirdReviewSourceChecks.join('、')}`);
  process.stdout.write(`THIRD_REVIEW_SOURCE ${thirdReviewSourceChecks.length}/${thirdReviewSourceChecks.length} PASS\n`);
  const finalReviewSourceChecks = [
    ['详情F操作模型', templateSource.includes('resolveDetailActions') && templateSource.includes('查看更多') && templateSource.includes('立即购买')],
    ['平台与游戏版本分离', templateSource.includes('selectedPlatform') && templateSource.includes('selectedEditionId') && !templateSource.includes('selectedVersion') && !templateSource.includes('GAME_EDITIONS')],
    ['商品独立过滤平台与版本', templateSource.includes('sku.platform') && templateSource.includes('sku.editionId') && templateSource.includes('edition?.entitlementSkus')],
    ['免费获取互斥样例', templateSource.includes("acquisitionMode: 'free'") && templateSource.includes("label: '获取游戏'")],
    ['会员游戏云存档标识', templateSource.includes('cloudSaveSupported') && templateSource.includes('cloud-save-badge')],
    ['2至23小时自由选择', templateSource.includes('setRentalHours') && templateSource.includes('data-hour-shortcut="23"')],
    ['三天无理由规则弹窗', templateSource.includes('renderNoReasonPolicyDialog') && templateSource.includes('72小时') && templateSource.includes('30分钟')],
    ['个人中心会员状态同行', templateSource.includes('profile-name-row') && !templateSource.includes('member-banner profile-member-entry')],
    ['订单搜索折叠展开', templateSource.includes('toggle-order-search') && templateSource.includes('order-search-trigger')],
    ['订单动作唯一映射', templateSource.includes('ORDER_ACTIONS_BY_STATUS') && templateSource.includes('getOrderActions') && !templateSource.includes('renderActiveOrderActions')],
    ['租赁时长天小时格式', templateSource.includes('formatRentalDuration')],
    ['标注缩放不污染图片裁切', templateSource.includes('const frameWidth = image.parentElement.clientWidth') && templateSource.includes('const frameHeight = image.parentElement.clientHeight')],
  ];
  const failedFinalReviewSourceChecks = finalReviewSourceChecks.filter(([, passed]) => !passed).map(([name]) => name);
  assert(failedFinalReviewSourceChecks.length === 0, `FINAL_REVIEW 源码契约未通过：${failedFinalReviewSourceChecks.join('、')}`);
  process.stdout.write(`FINAL_REVIEW_SOURCE ${finalReviewSourceChecks.length}/${finalReviewSourceChecks.length} PASS\n`);
  const sixthReviewSourceChecks = [
    ['订单标题与Tab紧凑', templateSource.includes('.portrait-orders .task-page-head { margin-bottom: 0; }')],
    ['订单搜索透明图标', templateSource.includes('data-order-search-collapsed') && /\.order-search-trigger\s*\{[^}]*background:\s*transparent/s.test(templateSource)],
    ['详情四槽动作', templateSource.includes("label: '•••'") && templateSource.includes("icon: 'quick-play'") && templateSource.includes('detail-action-icon')],
    ['具体第三方平台配置', templateSource.includes('THIRD_PARTY_LOGIN_CONFIGS') && templateSource.includes('Rockstar Games 登录') && templateSource.includes('platformApproved')],
    ['第三方验证码生命周期', templateSource.includes('requestThirdPartyCode') && templateSource.includes('thirdPartyCodeExpiresAt') && templateSource.includes('thirdPartyCodeCooldownUntil')],
    ['Steam登录信息使用完整内容宽度', templateSource.includes('steam-credential-sheet') && !templateSource.includes('.steam-qr-panel .steam-credential-overlay')],
    ['首期仅标准版', !templateSource.includes('data-checkout-field="edition"') && templateSource.includes('checkout-product-name') && templateSource.includes("editionId: 'standard'")],
  ];
  const failedSixthReviewSourceChecks = sixthReviewSourceChecks.filter(([, passed]) => !passed).map(([name]) => name);
  assert(failedSixthReviewSourceChecks.length === 0, `SIXTH_REVIEW 源码契约未通过：${failedSixthReviewSourceChecks.join('、')}`);
  process.stdout.write(`SIXTH_REVIEW_SOURCE ${sixthReviewSourceChecks.length}/${sixthReviewSourceChecks.length} PASS\n`);
  assertAnnotation(
    !/<iframe\b/i.test(annotationSource)
      && !/(?:<script[^>]+src|<link[^>]+href|(?:src|href)=["']https?:|url\(["']?https?:)/i.test(annotationSource),
    '标注版不得使用 iframe 或外链资源',
  );
  assertAnnotation(annotationSource.includes('data:image/') && !/\{\{[^}]+\}\}/.test(annotationSource), '标注版必须内嵌真实 Data URL 素材且不得保留占位符');
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const demoIssues = [];
    page.on('console', (message) => {
      if (message.type() === 'error') demoIssues.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => demoIssues.push(`pageerror: ${error.message}`));
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const contract = await page.evaluate(() => ({
      orientation: window.__appRentalDemo.snapshot().orientation,
      screen: window.__appRentalDemo.snapshot().screen,
      root: Boolean(document.querySelector('#appRentalDemo')),
    }));
    assert(contract.root, '缺少 #appRentalDemo');
    assert(contract.orientation === 'portrait', '默认方向应为 portrait');
    assert(contract.screen === 'home', '默认页面应为 home');
    process.stdout.write('CONTRACT 3/3 PASS\n');

    const refactorGateFailures = [];
    const refactorGateResults = [];
    let refactorGateChecks = 0;
    const runRefactorGate = async (name, callback) => {
      try {
        await callback();
        refactorGateChecks += 1;
        refactorGateResults.push({ name, status: 'pass' });
      } catch (error) {
        refactorGateFailures.push(`${name}: ${error.message}`);
        refactorGateResults.push({ name, status: 'fail', message: error.message });
      }
    };
    const reloadDemo = async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    };

    await runRefactorGate('CATALOG_INTEGRITY', async () => {
      await reloadDemo();
      const catalog = await page.evaluate(() => {
        const api = window.__appRentalDemo;
        api.setScenario('not-member-library', { shouldRender: false });
        api.setSelectedGame('shadow-blade-zero', { shouldRender: false });
        api.setDiscoveryContext('shadow-blade-zero', {
          platform: 'Steam',
          firstRentalEligible: true,
          priceResolved: true,
          inventoryResolved: true,
          eligibilityResolved: true,
        });
        const standardContext = api.getCheckoutEligibilityContext('shadow-blade-zero');
        const standardQuote = api.quoteRentalOffer('hourly', 2, 'standard', standardContext);
        const standardPurchase = api.lowestEligiblePurchaseSku('shadow-blade-zero', standardContext);
        const editions = api.getGameEditions('shadow-blade-zero', 'Steam').map(({ id, name, enabled, inStock }) => ({ id, name, enabled, inStock }));
        const enhancedSelected = api.selectEdition('enhanced');
        const checkoutContext = api.getCheckoutEligibilityContext('shadow-blade-zero');
        api.navigate('checkout');
        const standardOrder = api.snapshot().order;
        const checkoutEditionControls = document.querySelectorAll('[data-checkout-field="edition"], [data-action="select-edition"]').length;
        const checkoutProductName = document.querySelector('.checkout-product-name')?.textContent.trim();

        api.setScenario('not-member-library', { shouldRender: false });
        api.setSelectedGame('stardew', { shouldRender: false });
        api.navigate('detail');
        const freeActions = api.resolveDetailActions().map(({ id, label }) => ({ id, label }));

        api.navigate('membership');
        api.setOrientation('landscape');
        const cloudBadges = [...document.querySelectorAll('.member-game-card .cloud-save-badge')].map((node) => node.closest('.member-game-card')?.textContent.trim());
        const unsupportedBadges = [...document.querySelectorAll('.member-game-card')]
          .filter((node) => /星露谷物语|小小梦魇 2/.test(node.textContent))
          .filter((node) => node.querySelector('.cloud-save-badge')).length;
        const membershipPreview = document.querySelector('.landscape-membership .membership-preview');
        const previewRect = membershipPreview?.getBoundingClientRect();
        const visibleCloudBadgeRects = [...document.querySelectorAll('.landscape-membership .membership-preview .cloud-save-badge')]
          .map((node) => node.getBoundingClientRect())
          .filter((rect) => rect.width > 0 && rect.height > 0);
        const cloudBadgesInsidePreview = Boolean(previewRect)
          && visibleCloudBadgeRects.length === 4
          && visibleCloudBadgeRects.every((rect) => rect.left >= previewRect.left && rect.right <= previewRect.right && rect.top >= previewRect.top && rect.bottom <= previewRect.bottom);

        api.openCaptureState('home');
        const firstRentalText = document.querySelector('.hero-rental-price')?.textContent.trim();
        api.setDiscoveryContext('shadow-blade-zero', { firstRentalEligible: false });
        const regularRentalText = document.querySelector('.hero-rental-price')?.textContent.trim();

        return {
          standardContext,
          standardQuote,
          standardPurchase,
          editions,
          enhancedSelected,
          checkoutContext,
          standardOrder,
          checkoutEditionControls,
          checkoutProductName,
          freeActions,
          cloudBadges,
          unsupportedBadges,
          cloudBadgesInsidePreview,
          firstRentalText,
          regularRentalText,
        };
      });

      let catalogChecks = 0;
      const checkCatalog = (condition, message) => {
        assert(condition, message);
        catalogChecks += 1;
      };
      checkCatalog(catalog.standardContext.platform === 'Steam' && catalog.standardContext.editionId === 'standard' && !('version' in catalog.standardContext), `平台与版本上下文仍混用：${JSON.stringify(catalog.standardContext)}`);
      checkCatalog(catalog.editions.some(({ id, name }) => id === 'standard' && name === '标准版'), `游戏缺少标准版商品配置：${JSON.stringify(catalog.editions)}`);
      checkCatalog(catalog.standardQuote.price === 1.9 && catalog.standardQuote.platform === 'Steam' && catalog.standardQuote.editionId === 'standard', `标准版首租报价上下文错误：${JSON.stringify(catalog.standardQuote)}`);
      checkCatalog(catalog.standardPurchase?.id === 'purchase-standard', `标准版购买 SKU 过滤错误：${JSON.stringify(catalog.standardPurchase)}`);
      checkCatalog(catalog.enhancedSelected === false && catalog.checkoutContext.editionId === 'standard', `首期不应允许切换非标准版：${JSON.stringify({ selected: catalog.enhancedSelected, context: catalog.checkoutContext })}`);
      checkCatalog(catalog.standardOrder?.platform === 'Steam' && catalog.standardOrder?.editionId === 'standard' && catalog.standardOrder?.version === 'Steam · 标准版', `订单快照未固化标准版：${JSON.stringify(catalog.standardOrder)}`);
      checkCatalog(catalog.checkoutEditionControls === 0 && catalog.checkoutProductName === '影之刃零 - 标准版', `确认订单仍出现版本选择或商品名未标标准版：${JSON.stringify({ controls: catalog.checkoutEditionControls, name: catalog.checkoutProductName })}`);
      checkCatalog(catalog.freeActions.map(({ label }) => label).join('|') === '•••|秒玩|获取游戏' && !catalog.freeActions.some(({ id }) => id === 'rent'), `免费获取场景没有正确隐藏租号：${JSON.stringify(catalog.freeActions)}`);
      checkCatalog(catalog.cloudBadges.length === 6 && catalog.unsupportedBadges === 0, `会员游戏云存档标识与配置不一致：${JSON.stringify(catalog.cloudBadges)}`);
      checkCatalog(catalog.cloudBadgesInsidePreview, '横屏会员游戏预览的云存档标识发生裁切或溢出');
      checkCatalog(catalog.firstRentalText === '¥1.9首租' && catalog.regularRentalText === '¥9.9租号', `首页首租资格失效后未回退普通租号：${JSON.stringify({ first: catalog.firstRentalText, regular: catalog.regularRentalText })}`);
      assert(catalogChecks === 11, `商品目录完整性契约数量错误：${catalogChecks}/11`);
      process.stdout.write('CATALOG_INTEGRITY 11/11 PASS\n');
    });

    await runRefactorGate('DISCOVERY_DISPLAY_MODEL', async () => {
      await reloadDemo();
      const contexts = {
        rented: {
          activeRental: true,
          playable: true,
          playableReason: 'owned',
          region: 'CN',
          platform: 'Steam',
          editionId: 'standard',
          firstRentalEligible: true,
          priceResolved: true,
          inventoryResolved: true,
          eligibilityResolved: true,
        },
        playable: {
          activeRental: false,
          playable: true,
          playableReason: 'membership',
          region: 'CN',
          platform: 'Steam',
          editionId: 'standard',
          firstRentalEligible: false,
          priceResolved: true,
          inventoryResolved: true,
          eligibilityResolved: true,
        },
        rentalPrice: {
          activeRental: false,
          playable: false,
          playableReason: null,
          region: 'CN',
          platform: 'Steam',
          editionId: 'standard',
          firstRentalEligible: false,
          priceResolved: true,
          inventoryResolved: true,
          eligibilityResolved: true,
        },
        unresolved: {
          activeRental: false,
          playable: false,
          playableReason: null,
          region: 'CN',
          platform: 'Steam',
          editionId: 'standard',
          firstRentalEligible: false,
          priceResolved: false,
          inventoryResolved: true,
          eligibilityResolved: true,
        },
      };
      const discovery = await page.evaluate((input) => {
        const api = window.__appRentalDemo;
        const surface = {
          resolve: typeof api?.resolveGameDisplayModel === 'function',
          get: typeof api?.getDiscoveryDisplay === 'function',
          set: typeof api?.setDiscoveryContext === 'function',
        };
        if (!surface.resolve || !surface.get || !surface.set) return { surface };

        const models = Object.fromEntries(
          Object.entries(input).map(([key, context]) => [key, api.resolveGameDisplayModel('shadow-blade-zero', context)]),
        );
        const base = {
          activeOrderStatus: null,
          expireAt: null,
          refundActive: false,
          owned: false,
          installed: false,
          imported: false,
          permanent: false,
          membershipActive: false,
          memberLibrary: false,
          region: 'CN',
          platform: 'Steam',
          editionId: 'standard',
          firstRentalEligible: false,
          priceResolved: true,
          inventoryResolved: true,
          eligibilityResolved: true,
        };
        const future = Date.now() + 60 * 60 * 1000;
        const inactiveRentalStates = Object.fromEntries(
          ['pending', 'allocating', 'refunding', 'refunded', 'ended'].map((status) => [
            status,
            api.setDiscoveryContext('shadow-blade-zero', { ...base, activeOrderStatus: status, expireAt: future }),
          ]),
        );
        const expiredRental = api.setDiscoveryContext('shadow-blade-zero', {
          ...base,
          activeOrderStatus: 'active',
          expireAt: Date.now(),
        });
        const playableSources = Object.fromEntries([
          ['owned', { owned: true }],
          ['installed', { installed: true }],
          ['imported', { imported: true }],
          ['permanent', { permanent: true }],
          ['membership', { membershipActive: true, memberLibrary: true }],
        ].map(([reason, patch]) => [
          reason,
          api.setDiscoveryContext('shadow-blade-zero', { ...base, ...patch }),
        ]));
        const eligibleFirstPrice = api.setDiscoveryContext('spiritfarer', {
          ...base,
          firstRentalEligible: true,
        });
        const ineligibleFirstPrice = api.setDiscoveryContext('spiritfarer', {
          ...base,
          firstRentalEligible: false,
        });
        const rotationBefore = api.getDiscoveryDisplay('shadow-blade-zero');
        api.setOrientation('landscape');
        const rotationLandscape = api.getDiscoveryDisplay('shadow-blade-zero');
        api.setOrientation('portrait');
        const rotationPortrait = api.getDiscoveryDisplay('shadow-blade-zero');
        return {
          surface,
          models,
          inactiveRentalStates,
          expiredRental,
          playableSources,
          eligibleFirstPrice,
          ineligibleFirstPrice,
          rotationBefore,
          rotationLandscape,
          rotationPortrait,
        };
      }, contexts);

      let discoveryChecks = 0;
      const checkDiscovery = (condition, message) => {
        assert(condition, message);
        discoveryChecks += 1;
      };
      checkDiscovery(
        discovery.surface.resolve && discovery.surface.get && discovery.surface.set,
        `缺少统一发现展示模型公开接口：${JSON.stringify(discovery.surface)}`,
      );
      checkDiscovery(
        discovery.models.rented.displayType === 'rented'
          && discovery.models.rented.displayText === '已租号'
          && discovery.models.rented.reason === 'active-rental',
        `有效租赁未优先显示“已租号”：${JSON.stringify(discovery.models.rented)}`,
      );
      checkDiscovery(
        discovery.models.playable.displayType === 'playable'
          && discovery.models.playable.displayText === '可畅玩'
          && discovery.models.playable.reason === 'membership',
        `可直接游玩权益未统一显示“可畅玩”：${JSON.stringify(discovery.models.playable)}`,
      );
      checkDiscovery(
        discovery.models.rentalPrice.displayType === 'rental-price'
          && discovery.models.rentalPrice.displayText === '¥9.9 · 租号',
        `无权益时租号价格文案错误：${JSON.stringify(discovery.models.rentalPrice)}`,
      );
      checkDiscovery(
        discovery.models.rentalPrice.rawAmount === 9.9
          && discovery.models.rentalPrice.formattedAmount === '9.9',
        `租号原始金额或一位小数展示金额错误：${JSON.stringify(discovery.models.rentalPrice)}`,
      );
      checkDiscovery(
        discovery.models.unresolved.displayType === 'none'
          && discovery.models.unresolved.displayText === '',
        `价格不可判定时仍展示租号信息：${JSON.stringify(discovery.models.unresolved)}`,
      );
      checkDiscovery(
        Object.entries(discovery.inactiveRentalStates).every(([, model]) => model.displayType !== 'rented'),
        `非生效订单被误判为“已租号”：${JSON.stringify(discovery.inactiveRentalStates)}`,
      );
      checkDiscovery(
        discovery.expiredRental.displayType !== 'rented',
        `已过期 active 订单被误判为“已租号”：${JSON.stringify(discovery.expiredRental)}`,
      );
      for (const reason of ['owned', 'installed', 'imported', 'permanent', 'membership']) {
        const model = discovery.playableSources[reason];
        checkDiscovery(
          model.displayType === 'playable' && model.displayText === '可畅玩' && model.reason === reason,
          `${reason} 权益未统一为“可畅玩”：${JSON.stringify(model)}`,
        );
      }
      checkDiscovery(
        discovery.eligibleFirstPrice.rawAmount === 1.99
          && discovery.eligibleFirstPrice.displayText === '¥2.0 · 租号'
          && discovery.eligibleFirstPrice.reason === 'eligible-first-rental-price',
        `首次资格有效时未选中原始最低价 1.99：${JSON.stringify(discovery.eligibleFirstPrice)}`,
      );
      checkDiscovery(
        discovery.ineligibleFirstPrice.displayType === 'none'
          && discovery.ineligibleFirstPrice.rawAmount === null
          && discovery.ineligibleFirstPrice.displayText === '',
        `非热门游戏首次资格失效后仍展示普通时租：${JSON.stringify(discovery.ineligibleFirstPrice)}`,
      );
      checkDiscovery(
        ['displayType', 'displayText', 'rawAmount', 'formattedAmount'].every((key) => (
          discovery.rotationBefore[key] === discovery.rotationLandscape[key]
          && discovery.rotationBefore[key] === discovery.rotationPortrait[key]
        )),
        `横竖屏旋转改变发现展示结果：${JSON.stringify({ before: discovery.rotationBefore, landscape: discovery.rotationLandscape, portrait: discovery.rotationPortrait })}`,
      );
      assert(discoveryChecks === 16, `统一发现展示模型契约数量错误：${discoveryChecks}/16`);
      process.stdout.write('DISCOVERY_DISPLAY_MODEL 16/16 PASS\n');
    });

    await runRefactorGate('CDKEY_VISUAL_CONVERGENCE', async () => {
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      let visualChecks = 0;
      const visualFailures = [];
      const checkVisual = (condition, message) => {
        visualChecks += 1;
        if (!condition) visualFailures.push(message);
      };
      const readDiscoveryDom = async (pageId, orientation) => {
        await reloadDemo();
        return page.evaluate(({ pageId: nextPageId, orientation: nextOrientation }) => {
          const api = window.__appRentalDemo;
          api.setOrientation(nextOrientation);
          api.openCaptureState(nextPageId);
          const rootNode = document.querySelector('#appRentalDemo');
          const searchCards = [...rootNode.querySelectorAll('.search-result-card')];
          const homeCards = [...rootNode.querySelectorAll('.hero-card, .landscape-home-hero')];
          const heroCard = rootNode.querySelector('.hero-card, .landscape-home-hero');
          return {
            displayTexts: [...rootNode.querySelectorAll('[data-discovery-display]')].map((node) => node.textContent.trim()),
            displayTypes: [...rootNode.querySelectorAll('[data-discovery-display]')].map((node) => node.dataset.discoveryDisplay),
            searchCards: searchCards.length,
            searchCardDisplayCounts: searchCards.map((node) => node.querySelectorAll('[data-discovery-display]').length),
            searchInlineActions: rootNode.querySelectorAll('.search-result-card [data-primary-action], .search-result-card .primary-action').length,
            searchCardsClickable: searchCards.every((node) => node.matches('button, a, [role="button"]')),
            homeCards: homeCards.length,
            homeInlineActions: rootNode.querySelectorAll('.hero-card [data-primary-action], .landscape-home-hero [data-primary-action]').length,
            homeCardsClickable: homeCards.every((node) => node.matches('button, a, [role="button"]')),
            heroRecommendation: rootNode.querySelector('.hero-recommendation')?.textContent.trim() || '',
            heroDate: rootNode.querySelector('.hero-date')?.textContent.trim() || '',
            heroTitle: rootNode.querySelector('.hero-game-copy h1')?.textContent.trim() || '',
            heroMeta: rootNode.querySelector('.hero-game-copy p')?.textContent.replace(/\s+/g, ' ').trim() || '',
            heroPrice: rootNode.querySelector('.hero-rental-price')?.textContent.trim() || '',
            heroDemand: rootNode.querySelector('.hero-rental-demand')?.textContent.trim() || '',
            heroMarkCount: rootNode.querySelectorAll('.hero-mark').length,
            heroPseudoContent: heroCard ? getComputedStyle(heroCard, '::after').content : '',
            miniOffers: [...rootNode.querySelectorAll('.mini-rental-offer')].map((node) => node.textContent.trim()),
            miniDemands: [...rootNode.querySelectorAll('.mini-rental-demand')].map((node) => node.textContent.trim()),
            legacyCopy: /首次体验|会员畅玩|租\/购可选|购\s*¥|继续游戏|租用中/.test(rootNode.innerText),
          };
        }, { pageId, orientation });
      };
      const readCommerceVisual = async (pageId, primarySelector) => {
        const results = [];
        for (const orientation of ['portrait', 'landscape']) {
          await reloadDemo();
          results.push(await page.evaluate(({ pageId: nextPageId, orientation: nextOrientation, primarySelector: selector }) => {
            const api = window.__appRentalDemo;
            api.setOrientation(nextOrientation);
            api.openCaptureState(nextPageId);
            const rootNode = document.querySelector('#appRentalDemo');
            const primary = rootNode.querySelector(selector);
            const primaryBackground = primary ? getComputedStyle(primary).backgroundImage : '';
            return {
              orientation: nextOrientation,
              primaryBackground,
              primaryHasBlue: /rgb\((?:3[0-9]|4[0-9]|5[0-9]),\s*(?:9[0-9]|1[0-6][0-9]),\s*(?:2[0-5][0-9])\)/.test(primaryBackground),
              forbiddenBusinessCopy: /CDKEY|CDK|卡密|激活|发货|收货账号|永久拥有/i.test(rootNode.innerText),
            };
          }, { pageId, orientation, primarySelector }));
        }
        return results;
      };
      const allowedDiscoveryCopy = /^(?:已租号|可畅玩|¥\d+\.\d · (?:租号|可租号))$/;
      const unifiedDiscoverySource = /const\s+DISCOVERY_DISPLAY_TYPES\s*=/.test(templateSource)
        && /function\s+resolveGameDisplayModel\s*\(/.test(templateSource)
        && /function\s+renderDiscoveryDisplay\s*\(/.test(templateSource);
      checkVisual(unifiedDiscoverySource, '发现页缺少统一展示模型/渲染器，仍保留旧 resolvePricePresentation 或硬编码状态');

      const portraitHome = await readDiscoveryDom('home', 'portrait');
      checkVisual(
        portraitHome.heroRecommendation === '今日推荐'
          && /^\d{1,2}\/\d{1,2}$/.test(portraitHome.heroDate)
          && portraitHome.heroTitle === '影之刃零'
          && portraitHome.heroMeta.includes('9.5')
          && portraitHome.heroMeta.includes('动作 · 冒险')
          && portraitHome.heroPrice === '¥1.9首租'
          && portraitHome.heroDemand === '99+ 在租'
          && portraitHome.heroMarkCount === 0
          && portraitHome.heroPseudoContent === 'none'
          && portraitHome.miniOffers.length === 4
          && portraitHome.miniOffers.every((text) => text === '¥9.9租号')
          && portraitHome.miniDemands.length === 4
          && portraitHome.miniDemands.every((text) => text === '在租99+'),
        `竖屏首页租号卡信息层级错误：${JSON.stringify(portraitHome)}`,
      );
      checkVisual(!portraitHome.legacyCopy, `竖屏首页仍出现旧租购/权益来源文案：${JSON.stringify(portraitHome)}`);
      checkVisual(
        portraitHome.homeCards > 0 && portraitHome.homeInlineActions === 0 && portraitHome.homeCardsClickable,
        `竖屏首页仍有卡内租号按钮或整卡不可点击：${JSON.stringify(portraitHome)}`,
      );

      const landscapeHome = await readDiscoveryDom('home', 'landscape');
      checkVisual(
        landscapeHome.heroRecommendation === '今日推荐'
          && /^\d{1,2}\/\d{1,2}$/.test(landscapeHome.heroDate)
          && landscapeHome.heroTitle === '影之刃零'
          && landscapeHome.heroMeta.includes('9.5')
          && landscapeHome.heroMeta.includes('动作 · 冒险')
          && landscapeHome.heroPrice === '¥1.9首租'
          && landscapeHome.heroDemand === '99+ 在租'
          && landscapeHome.miniOffers.length === 4
          && landscapeHome.miniOffers.every((text) => text === '¥9.9租号')
          && landscapeHome.miniDemands.length === 4
          && landscapeHome.miniDemands.every((text) => text === '在租99+'),
        `横屏首页租号卡信息层级错误：${JSON.stringify(landscapeHome)}`,
      );
      checkVisual(!landscapeHome.legacyCopy, `横屏首页仍出现旧租购/权益来源文案：${JSON.stringify(landscapeHome)}`);
      checkVisual(
        landscapeHome.homeCards > 0 && landscapeHome.homeInlineActions === 0 && landscapeHome.homeCardsClickable,
        `横屏首页仍有卡内租号按钮或整卡不可点击：${JSON.stringify(landscapeHome)}`,
      );

      const portraitSearch = await readDiscoveryDom('search', 'portrait');
      checkVisual(
        portraitSearch.searchCards === 3
          && portraitSearch.searchCardDisplayCounts.every((count) => count === 1)
          && portraitSearch.displayTexts.length === 3
          && portraitSearch.displayTexts.every((text) => allowedDiscoveryCopy.test(text)),
        `竖屏搜索卡未做到每卡唯一统一结果：${JSON.stringify(portraitSearch)}`,
      );
      checkVisual(
        portraitSearch.searchInlineActions === 0 && portraitSearch.searchCardsClickable,
        `竖屏搜索卡存在独立 CTA 或整卡不可点击：${JSON.stringify(portraitSearch)}`,
      );
      checkVisual(!portraitSearch.legacyCopy, `竖屏搜索仍出现旧租购/权益来源文案：${JSON.stringify(portraitSearch)}`);

      const landscapeSearch = await readDiscoveryDom('search', 'landscape');
      checkVisual(
        landscapeSearch.searchCards === 3
          && landscapeSearch.searchCardDisplayCounts.every((count) => count === 1)
          && landscapeSearch.displayTexts.length === 3
          && landscapeSearch.displayTexts.every((text) => allowedDiscoveryCopy.test(text))
          && landscapeSearch.searchInlineActions === 0
          && landscapeSearch.searchCardsClickable
          && !landscapeSearch.legacyCopy,
        `横屏搜索未满足唯一结果、无 CTA、整卡点击和旧文案清理：${JSON.stringify(landscapeSearch)}`,
      );

      const detailVisual = await readCommerceVisual('detail', '[data-primary-action]:not(:disabled)');
      await reloadDemo();
      await page.evaluate(() => {
        window.__appRentalDemo.setOrientation('portrait');
        window.__appRentalDemo.setScenario('not-member-library');
        window.__appRentalDemo.navigate('detail');
      });
      const detailInitial = await page.evaluate(() => ({
        label: document.querySelector('[data-primary-action="true"]')?.textContent.trim(),
        panel: Boolean(document.querySelector('[data-entitlement-panel]')),
        order: window.__appRentalDemo.snapshot().order,
      }));
      await page.getByRole('button', { name: '租号开玩', exact: true }).click();
      const detailConfirmed = await page.evaluate(() => ({
        snapshot: window.__appRentalDemo.snapshot(),
        panel: Boolean(document.querySelector('[data-entitlement-panel]')),
        text: document.querySelector('#appRentalDemo').innerText,
        saleMode: document.querySelector('[data-sale-mode]')?.dataset.saleMode,
        skuKinds: [...document.querySelectorAll('[data-sku-kind]')].map((node) => node.dataset.skuKind),
      }));
      await page.evaluate(() => window.__appRentalDemo.setRentalHours(8));
      const detailSelected = await page.evaluate(() => ({
        snapshot: window.__appRentalDemo.snapshot(),
        text: document.querySelector('#appRentalDemo').innerText,
      }));
      await page.evaluate(() => {
        window.__appRentalDemo.setScenario('member-library-trial');
        window.__appRentalDemo.setSelectedGame('spiritfarer');
        window.__appRentalDemo.navigate('detail', { replaceTask: true });
      });
      await page.getByRole('button', { name: '租号开玩', exact: true }).click();
      const entitlementCheckout = await page.evaluate(() => ({
        snapshot: window.__appRentalDemo.snapshot(),
        saleMode: document.querySelector('[data-sale-mode]')?.dataset.saleMode,
        skuKinds: [...document.querySelectorAll('[data-sku-kind]')].map((node) => node.dataset.skuKind),
      }));
      await page.evaluate(() => {
        window.__appRentalDemo.setScenario('active-rental');
        window.__appRentalDemo.navigate('detail');
      });
      const activeRentalDetail = await page.evaluate(() => ({
        label: document.querySelector('[data-primary-action="true"]')?.textContent.trim(),
        text: document.querySelector('#appRentalDemo').innerText,
      }));
      await page.evaluate(() => {
        window.__appRentalDemo.setScenario('owned-installed');
        window.__appRentalDemo.navigate('detail');
      });
      const playableDetail = await page.evaluate(() => ({
        label: document.querySelector('[data-primary-action="true"]')?.textContent.trim(),
        panel: Boolean(document.querySelector('[data-entitlement-panel]')),
        text: document.querySelector('#appRentalDemo').innerText,
      }));
      checkVisual(
        detailVisual.every(({ primaryBackground, primaryHasBlue, forbiddenBusinessCopy }) => (
          primaryBackground.includes('gradient') && primaryHasBlue && !forbiddenBusinessCopy
        ))
          && detailInitial.label === '租号开玩' && !detailInitial.panel && !detailInitial.order
          && detailConfirmed.snapshot.screen === 'checkout' && !detailConfirmed.panel
          && detailConfirmed.snapshot.order?.durationLabel === '2小时'
          && detailConfirmed.snapshot.order?.rawAmount === 1.9
          && detailConfirmed.saleMode === 'time-rental'
          && detailConfirmed.text.includes('影之刃零 - 标准版')
          && !detailConfirmed.text.includes('增强版')
          && !detailConfirmed.text.includes('豪华版')
          && detailConfirmed.text.includes('按小时')
          && detailConfirmed.text.includes('日租')
          && detailConfirmed.text.includes('周租')
          && !detailConfirmed.skuKinds.some((kind) => ['trial', 'permanent', 'membership'].includes(kind))
          && detailSelected.snapshot.order?.durationLabel === '8小时'
          && detailSelected.snapshot.order?.rawAmount === 36
          && detailSelected.text.includes('¥36.00')
          && entitlementCheckout.snapshot.screen === 'checkout'
          && entitlementCheckout.saleMode === 'entitlement'
          && ['trial', 'permanent', 'membership'].every((kind) => entitlementCheckout.skuKinds.includes(kind))
          && !entitlementCheckout.skuKinds.includes('time-rental')
          && activeRentalDetail.label === '登录游戏' && !activeRentalDetail.text.includes('剩余')
          && playableDetail.label === '可畅玩' && !playableDetail.panel && !playableDetail.text.includes('租号开玩'),
        `详情直达或热门/非热门确认订单状态路径错误：${JSON.stringify({ detailVisual, detailInitial, detailConfirmed, detailSelected, entitlementCheckout, activeRentalDetail, playableDetail })}`,
      );
      const checkoutVisual = await readCommerceVisual('checkout', '[data-primary-action]:not(:disabled)');
      const checkoutFields = await page.evaluate(() => {
        const rootNode = document.querySelector('#appRentalDemo');
        const text = rootNode.innerText;
        return {
          text,
          fields: ['标准版', '租赁套餐', '租期', '原价', '实付', '支付方式', '租号服务协议', '退款规则', '支付有效期'].every((field) => text.includes(field)),
          editionControls: rootNode.querySelectorAll('[data-checkout-field="edition"], [data-action="select-edition"]').length,
          twoDecimalAmount: /¥\d+\.\d{2}/.test(text),
        };
      });
      await page.evaluate(() => window.__appRentalDemo.setPriceChanged(true));
      const changedPriceLabel = await page.locator('[data-primary-action="true"]').textContent();
      await page.evaluate(() => {
        window.__appRentalDemo.setPriceChanged(false);
        window.__appRentalDemo.setInventoryAvailable(false);
      });
      const unavailableCheckout = await page.evaluate(() => ({
        label: document.querySelector('[data-primary-action="true"]')?.textContent.trim(),
        disabled: Boolean(document.querySelector('[data-primary-action="true"]:disabled')),
      }));
      checkVisual(
        checkoutVisual.every(({ primaryBackground, primaryHasBlue, forbiddenBusinessCopy }) => (
          primaryBackground.includes('gradient') && primaryHasBlue && !forbiddenBusinessCopy
        ))
          && checkoutFields.fields && checkoutFields.editionControls === 0 && checkoutFields.twoDecimalAmount
          && changedPriceLabel?.trim() === '按新价格重新确认'
          && unavailableCheckout.label === '暂不可购买' && unavailableCheckout.disabled,
        `确认订单视觉、租号字段、改价或库存状态错误：${JSON.stringify({ checkoutVisual, checkoutFields, changedPriceLabel, unavailableCheckout })}`,
      );

      const orderVisual = await readCommerceVisual('orders', '.order-card-actions button.primary:not(:disabled), [data-primary-action]:not(:disabled)');
      const orderDetailVisual = await readCommerceVisual('order-detail', '.order-detail-actions-dock button.primary:not(:disabled), .landscape-order-detail-dock button.primary:not(:disabled)');
      const orderCenter = await page.evaluate(() => {
        const api = window.__appRentalDemo;
        api.setOrientation('portrait');
        api.openCaptureState('orders');
        const rootNode = document.querySelector('#appRentalDemo');
        const tabs = [...rootNode.querySelectorAll('[data-order-tab], .order-tabs [role="tab"]')];
        rootNode.querySelector('[data-action="toggle-order-search"]')?.click();
        const search = rootNode.querySelector('[data-order-search]');
        const usable = tabs.find((node) => (node.dataset.orderTab || node.dataset.value) === 'usable');
        const searchBox = search?.getBoundingClientRect();
        const usableBox = usable?.getBoundingClientRect();
        const orders = api.getOrderCollection();
        const cards = [...rootNode.querySelectorAll('.order-list-card[data-status]')];
        return {
          tabLabels: tabs.map((node) => node.textContent.trim()),
          searchRightOfUsable: Boolean(searchBox && usableBox && searchBox.left >= usableBox.right - 2),
          typeLabels: /租号订单|CDKEY订单|游戏购买/i.test(rootNode.innerText),
          allRentalFixtures: orders.every(({ orderType }) => !orderType || orderType === 'rental'),
          forbiddenFixture: /"(?:cd.?key|redeemCode|activationKey)"\s*:/i.test(JSON.stringify(orders)),
          statusVisuals: Object.fromEntries(cards.map((card) => {
            const chip = card.querySelector('.order-status-chip');
            return [card.dataset.status, {
              tone: chip?.dataset.tone || '',
              color: chip ? getComputedStyle(chip).color : '',
            }];
          })),
          primaryBackgrounds: [...rootNode.querySelectorAll('.order-card-actions button.primary')]
            .map((button) => getComputedStyle(button).backgroundImage),
          secondaryBackgrounds: [...rootNode.querySelectorAll('.order-card-actions button.secondary')]
            .map((button) => getComputedStyle(button).backgroundColor),
        };
      });
      const expectedOrderStatusVisuals = {
        pending: { tone: 'danger', color: 'rgb(241, 92, 99)' },
        allocating: { tone: 'info', color: 'rgb(103, 185, 247)' },
        active: { tone: 'success', color: 'rgb(91, 212, 238)' },
        refunding: { tone: 'refund', color: 'rgb(242, 161, 77)' },
        refunded: { tone: 'muted', color: 'rgb(143, 146, 154)' },
        ended: { tone: 'muted', color: 'rgb(143, 146, 154)' },
      };
      checkVisual(
        orderCenter.tabLabels.join('|') === '全部订单|待支付|可使用'
          && orderCenter.searchRightOfUsable
          && !orderCenter.typeLabels
          && orderCenter.allRentalFixtures
          && !orderCenter.forbiddenFixture
          && Object.entries(expectedOrderStatusVisuals).every(([status, expected]) => (
            orderCenter.statusVisuals[status]?.tone === expected.tone
              && orderCenter.statusVisuals[status]?.color === expected.color
          ))
          && orderCenter.primaryBackgrounds.length >= 4
          && orderCenter.primaryBackgrounds.every((background) => background.includes('gradient') && background.includes('rgb(34, 169, 255)'))
          && orderCenter.secondaryBackgrounds.length >= 2
          && orderCenter.secondaryBackgrounds.every((background) => background === 'rgb(42, 45, 51)')
          && orderVisual.every(({ primaryBackground, primaryHasBlue, forbiddenBusinessCopy }) => (
            primaryBackground.includes('gradient') && primaryHasBlue && !forbiddenBusinessCopy
          ))
          && orderDetailVisual.every(({ primaryBackground, primaryHasBlue, forbiddenBusinessCopy }) => (
            primaryBackground.includes('gradient') && primaryHasBlue && !forbiddenBusinessCopy
          )),
        `订单中心 Tab/搜索/租号边界、状态色或主次按钮不符合要求：${JSON.stringify({ orderCenter, orderVisual, orderDetailVisual })}`,
      );

      assert(visualChecks === 14, `CDKEY 视觉收敛契约数量错误：${visualChecks}/14`);
      assert(visualFailures.length === 0, visualFailures.join('；'));
      process.stdout.write('CDKEY_VISUAL_CONVERGENCE 14/14 PASS\n');
    });

    await runRefactorGate('STATIC_ARCHITECTURE', async () => {
      const violations = [];
      for (const [label, sourcePath] of [['built', htmlPath], ['template', templatePath]]) {
        const source = fs.readFileSync(sourcePath, 'utf8');
        if (/state\.screen\s*===\s*['"]orders['"]\s*\|\|\s*state\.screen\s*===\s*['"]order-detail['"]/.test(source)) {
          violations.push(`${label}: orders 与 order-detail 共用分支`);
        }
        if (/\b(?:numericMinutes|minutes|remainingMinutes)\s*={2,3}\s*15\b/.test(source)) {
          violations.push(`${label}: 临期提醒仍依赖恰好等于15分钟`);
        }
      }
      assert(violations.length === 0, violations.join('；'));
    });

    await runRefactorGate('SEARCH_COMMUNITY_ROUTES', async () => {
      const results = [];
      for (const orientation of ['portrait', 'landscape']) {
        for (const screen of ['search', 'community']) {
          results.push(await page.evaluate(({ orientation, screen }) => {
            window.__appRentalDemo.setOrientation(orientation);
            window.__appRentalDemo.navigate(screen);
            const rootNode = document.querySelector('#appRentalDemo');
            const stub = rootNode.querySelector('.stub-panel, .landscape-stub');
            const dedicated = rootNode.querySelector(
              `.${orientation}-${screen}, [data-layout="${orientation}-${screen}"], [data-route-screen="${screen}"]`,
            );
            return {
              orientation,
              screen,
              actualScreen: window.__appRentalDemo.snapshot().screen,
              stub: Boolean(stub),
              dedicated: Boolean(dedicated),
              placeholderCopy: /当前入口已连通|功能页面/.test(rootNode.innerText),
            };
          }, { orientation, screen }));
        }
      }
      assert(
        results.every(({ screen, actualScreen, stub, placeholderCopy }) => actualScreen === screen && !stub && !placeholderCopy),
        `search/community 仍落入占位页：${JSON.stringify(results)}`,
      );
    });

    await runRefactorGate('FULL_PAGE_MATRIX', async () => {
      assert(FULL_PAGE_MATRIX.length === 18, `页面矩阵应为18项，实际${FULL_PAGE_MATRIX.length}项`);
      const failures = [];
      for (const orientation of ['portrait', 'landscape']) {
        for (const contractItem of FULL_PAGE_MATRIX) {
          await reloadDemo();
          const issueStart = demoIssues.length;
          const result = await page.evaluate(({ orientation: nextOrientation, contractItem: expected }) => {
            const api = window.__appRentalDemo;
            if (typeof api?.openCaptureState !== 'function') {
              return { ...expected, orientation: nextOrientation, apiMissing: true };
            }
            api.setOrientation(nextOrientation);
            api.openCaptureState(expected.pageId);
            const rootNode = document.querySelector('#appRentalDemo');
            const markerNode = rootNode?.dataset.pageId === expected.pageId
              ? rootNode
              : rootNode?.querySelector(`[data-page-id="${expected.pageId}"]`);
            const device = rootNode?.querySelector('.device') || document.querySelector('.device');
            const box = device?.getBoundingClientRect();
            const snapshot = api.snapshot();
            return {
              ...expected,
              orientation: nextOrientation,
              actualOrientation: snapshot.orientation,
              actualScreen: snapshot.screen,
              actualPageId: markerNode?.dataset.pageId || rootNode?.dataset.pageId || null,
              actualBaselineSource: markerNode?.dataset.baselineSource || rootNode?.dataset.baselineSource || null,
              width: Math.round(box?.width || 0),
              height: Math.round(box?.height || 0),
              stub: Boolean(rootNode?.querySelector('.stub-panel, .landscape-stub')),
              placeholderCopy: /\u5f53\u524d\u5165\u53e3\u5df2\u8fde\u901a|\u540e\u7eed\u8865\u9f50|\u529f\u80fd\u9875\u9762/.test(rootNode?.innerText || ''),
              copyLength: (rootNode?.innerText || '').trim().length,
            };
          }, { orientation, contractItem });
          const expectedDimensions = EXPECTED_DEVICE_DIMENSIONS[orientation];
          result.runtimeIssues = demoIssues.slice(issueStart);
          const passed = !result.apiMissing
            && result.actualOrientation === orientation
            && result.actualScreen === contractItem.screen
            && result.actualPageId === contractItem.pageId
            && result.actualBaselineSource === contractItem.baselineSource
            && result.width === expectedDimensions.width
            && result.height === expectedDimensions.height
            && !result.stub
            && !result.placeholderCopy
            && result.copyLength >= 20
            && result.runtimeIssues.length === 0;
          if (!passed) failures.push(result);
        }
      }
      assert(failures.length === 0, `18页横竖屏契约未完成：${JSON.stringify(failures)}`);
      process.stdout.write('FULL_PAGE_MATRIX 36/36 PASS\n');
    });

    await runRefactorGate('ORDER_CENTER_V2', async () => {
      await reloadDemo();
      const initial = await page.evaluate(() => {
        const api = window.__appRentalDemo;
        if (typeof api?.openCaptureState !== 'function') return { apiMissing: 'openCaptureState' };
        api.setOrientation('portrait');
        api.openCaptureState('orders');
        const snapshot = api.snapshot();
        const orders = typeof api.getOrderCollection === 'function' ? api.getOrderCollection() : (snapshot.orders || []);
        const tabNodes = [...document.querySelectorAll('[data-order-tab], .order-tabs [role="tab"]')];
        const trigger = document.querySelector('[data-action="toggle-order-search"]');
        const usableTab = tabNodes.find((node) => (node.dataset.orderTab || node.dataset.value) === 'usable');
        const triggerBox = trigger?.getBoundingClientRect();
        const usableBox = usableTab?.getBoundingClientRect();
        const cardText = [...document.querySelectorAll('.order-list-card')].map((node) => node.innerText).join('\n');
        const cards = [...document.querySelectorAll('.order-list-card[data-status]')];
        const serializedOrders = JSON.stringify(orders);
        return {
          labels: tabNodes.map((node) => node.textContent.trim()),
          ids: tabNodes.map((node) => node.dataset.orderTab || node.dataset.value),
          searchFolded: Boolean(trigger) && !document.querySelector('[data-order-search]'),
          searchRightOfUsable: Boolean(triggerBox && usableBox && triggerBox.left >= usableBox.right - 2),
          orders,
          statuses: [...new Set(orders.map(({ status }) => status))].sort(),
          orderTypes: orders.map(({ orderType }) => orderType || null),
          typeLabels: /\u6e38\u620f\u8d2d\u4e70|\u79df\u53f7\u7545\u73a9|CDKEY/i.test(cardText),
          purchaseFixture: orders.some(({ orderType }) => orderType && orderType !== 'rental'),
          cdkeyFixture: /"(?:cd.?key|redeemCode|activationKey)"\s*:/i.test(serializedOrders),
          statusVisuals: Object.fromEntries(cards.map((card) => {
            const chip = card.querySelector('.order-status-chip');
            return [card.dataset.status, {
              tone: chip?.dataset.tone || '',
              color: chip ? getComputedStyle(chip).color : '',
            }];
          })),
          primaryBackgrounds: [...document.querySelectorAll('.order-card-actions button.primary')]
            .map((button) => getComputedStyle(button).backgroundImage),
          secondaryBackgrounds: [...document.querySelectorAll('.order-card-actions button.secondary')]
            .map((button) => getComputedStyle(button).backgroundColor),
        };
      });
      assert(!initial.apiMissing, `订单中心缺少测试接口：${initial.apiMissing}`);
      assert(initial.labels.join('|') === EXPECTED_ORDER_TABS.map(({ label }) => label).join('|'), `订单 Tab 文案错误：${JSON.stringify(initial.labels)}`);
      assert(initial.ids.join('|') === EXPECTED_ORDER_TABS.map(({ id }) => id).join('|'), `订单 Tab 口径错误：${JSON.stringify(initial.ids)}`);
      assert(initial.searchFolded, `订单搜索默认必须折叠为放大镜：${JSON.stringify(initial)}`);
      assert(initial.searchRightOfUsable, '订单搜索未位于“可使用”右侧');
      assert(initial.statuses.join('|') === [...EXPECTED_RENTAL_STATUSES].sort().join('|'), `全部订单未覆盖6种租号状态：${JSON.stringify(initial.statuses)}`);
      assert(initial.orderTypes.every((value) => value === null || value === 'rental'), `出现非租号订单 fixture：${JSON.stringify(initial.orderTypes)}`);
      const expectedOrderStatusVisuals = {
        pending: { tone: 'danger', color: 'rgb(241, 92, 99)' },
        allocating: { tone: 'info', color: 'rgb(103, 185, 247)' },
        active: { tone: 'success', color: 'rgb(91, 212, 238)' },
        refunding: { tone: 'refund', color: 'rgb(242, 161, 77)' },
        refunded: { tone: 'muted', color: 'rgb(143, 146, 154)' },
        ended: { tone: 'muted', color: 'rgb(143, 146, 154)' },
      };
      assert(
        !initial.typeLabels
          && !initial.purchaseFixture
          && !initial.cdkeyFixture
          && Object.entries(expectedOrderStatusVisuals).every(([status, expected]) => (
            initial.statusVisuals[status]?.tone === expected.tone
              && initial.statusVisuals[status]?.color === expected.color
          ))
          && initial.primaryBackgrounds.length >= 4
          && initial.primaryBackgrounds.every((background) => background.includes('gradient') && background.includes('rgb(34, 169, 255)'))
          && initial.secondaryBackgrounds.length >= 2
          && initial.secondaryBackgrounds.every((background) => background === 'rgb(42, 45, 51)'),
        `订单卡类型边界、状态色或主次按钮层级错误：${JSON.stringify(initial)}`,
      );

      const tabSelector = (id) => `[data-order-tab="${id}"], .order-tabs [data-value="${id}"]`;
      const selectTab = async (id) => {
        const locator = page.locator(tabSelector(id)).first();
        assert(await locator.count(), `找不到订单 Tab：${id}`);
        await locator.click();
      };
      const setSearch = (value) => page.evaluate((keyword) => window.__appRentalDemo.setOrderSearch(keyword), value);
      const readOrderView = () => page.evaluate(() => ({
        screen: window.__appRentalDemo.snapshot().screen,
        tab: window.__appRentalDemo.snapshot().orderTab,
        keyword: window.__appRentalDemo.snapshot().orderSearch,
        ids: [...document.querySelectorAll('.order-list-card')].map((node) => node.dataset.orderId),
        statuses: [...document.querySelectorAll('.order-list-card')].map((node) => node.dataset.status),
        emptyCopy: document.querySelector('#appRentalDemo')?.innerText.includes('未找到相关订单'),
        clearAction: Boolean(document.querySelector('[data-action="clear-order-search"]')),
      }));

      await page.locator('[data-action="toggle-order-search"]').click();
      const expandedSearch = await page.evaluate(() => ({
        open: Boolean(document.querySelector('[data-order-search]')),
        aria: document.querySelector('[data-order-search-input]')?.getAttribute('aria-label') || '',
        focused: document.activeElement?.matches('[data-order-search-input]') || false,
      }));
      assert(expandedSearch.open && expandedSearch.aria.includes('当前') && expandedSearch.focused, `订单搜索未向左展开或聚焦：${JSON.stringify(expandedSearch)}`);

      await selectTab('pending');
      await setSearch('');
      const pendingView = await readOrderView();
      assert(pendingView.ids.length > 0 && pendingView.statuses.every((status) => status === 'pending'), `待支付 Tab 混入其他状态：${JSON.stringify(pendingView)}`);
      const pendingOrder = initial.orders.find(({ id }) => pendingView.ids.includes(id));
      assert(pendingOrder, '待支付 Tab 没有可用的搜索样例');

      await setSearch(pendingOrder.gameName);
      const gameSearch = await readOrderView();
      assert(gameSearch.ids.includes(pendingOrder.id) && gameSearch.ids.length > 0, `按游戏名搜索失败：${JSON.stringify(gameSearch)}`);
      await setSearch(pendingOrder.id);
      const idSearch = await readOrderView();
      assert(idSearch.ids.join('|') === pendingOrder.id, `按订单号搜索失败：${JSON.stringify(idSearch)}`);
      await setSearch('__NO_MATCHING_ORDER__');
      const emptySearch = await readOrderView();
      assert(emptySearch.ids.length === 0 && emptySearch.emptyCopy && emptySearch.clearAction, `订单搜索空态不完整：${JSON.stringify(emptySearch)}`);

      await setSearch('');
      await selectTab('usable');
      const usableView = await readOrderView();
      const usableOrders = initial.orders.filter(({ status, expireAt }) => status === 'active' && Number(expireAt) > Date.now());
      assert(usableView.ids.length > 0 && usableView.ids.every((id) => usableOrders.some((order) => order.id === id)), `可使用 Tab 口径错误：${JSON.stringify({ usableView, usableOrders })}`);

      await selectTab('pending');
      await setSearch(pendingOrder.gameName);
      await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
      const rotatedContext = await readOrderView();
      assert(rotatedContext.tab === 'pending' && rotatedContext.keyword === pendingOrder.gameName && rotatedContext.ids.includes(pendingOrder.id), `横竖屏切换丢失 Tab/搜索：${JSON.stringify(rotatedContext)}`);
      await page.evaluate(() => window.__appRentalDemo.setOrientation('portrait'));
      await page.locator('.order-list-card [data-action="select-order"], .order-list-card[data-action="select-order"]').first().click();
      const detailReturn = await page.evaluate(() => {
        const before = window.__appRentalDemo.snapshot();
        const target = window.__appRentalDemo.taskBack();
        const after = window.__appRentalDemo.snapshot();
        return {
          beforeScreen: before.screen,
          target,
          afterScreen: after.screen,
          tab: after.orderTab,
          keyword: after.orderSearch,
        };
      });
      assert(detailReturn.beforeScreen === 'order-detail' && detailReturn.afterScreen === 'orders' && detailReturn.tab === 'pending' && detailReturn.keyword === pendingOrder.gameName, `详情返回丢失订单上下文：${JSON.stringify(detailReturn)}`);

      const expiryResult = await page.evaluate(() => {
        const api = window.__appRentalDemo;
        api.openCaptureState('orders');
        const orders = api.getOrderCollection();
        const active = orders.find(({ status, expireAt }) => status === 'active' && Number(expireAt) > Date.now());
        if (!active) return { missingActive: true };
        api.selectOrder(active.id);
        const handled = api.triggerExpiryMinutes(0);
        api.navigate('orders', { rememberSource: false, replaceTask: true });
        api.setOrderSearch('');
        const usableTab = document.querySelector('[data-order-tab="usable"], .order-tabs [data-value="usable"]');
        usableTab?.click();
        return {
          handled,
          expiredId: active.id,
          visibleIds: [...document.querySelectorAll('.order-list-card')].map((node) => node.dataset.orderId),
          current: api.getOrderCollection().find(({ id }) => id === active.id),
        };
      });
      assert(!expiryResult.missingActive && expiryResult.handled !== false && !expiryResult.visibleIds.includes(expiryResult.expiredId) && expiryResult.current?.status === 'ended', `租期到期未从可使用移除：${JSON.stringify(expiryResult)}`);
      process.stdout.write('ORDER_CENTER_V2 14/14 PASS\n');
    });

    await runRefactorGate('PRICE_SEMANTICS', async () => {
      const source = fs.readFileSync(templatePath, 'utf8');
      assert(/function\s+lowestEligibleRentalSku\s*\(/.test(source) && /game\.rentalSkus/.test(source), '缺少租号 SKU 的独立最低价算法');
      assert(/function\s+lowestEligiblePurchaseSku\s*\(/.test(source) && /game\.purchaseSkus/.test(source), '缺少购买 SKU 的独立最低价算法');
      assert(!/Math\.min\([^)]*(?:rental|rent)[^)]*(?:cdkey|purchase)|Math\.min\([^)]*(?:cdkey|purchase)[^)]*(?:rental|rent)/is.test(source), '租号与购买价格不得跨类型取最低值');
      assert(source.includes('租 2小时') && source.includes('租/购可选') && /\u8d2d\s*\u00a5?\$\{/.test(source), '缺少租号价、购买价与紧凑共存文案');
      process.stdout.write('PRICE_SEMANTICS 4/4 PASS\n');
    });

    await runRefactorGate('LANDSCAPE_ORDER_ROUTES', async () => {
      await reloadDemo();
      await page.evaluate(() => {
        window.__appRentalDemo.setScenario('active-rental');
        window.__appRentalDemo.setOrientation('landscape');
        window.__appRentalDemo.navigate('orders');
      });
      const listState = await page.evaluate(() => ({
        screen: window.__appRentalDemo.snapshot().screen,
        list: Boolean(document.querySelector('.landscape-order-list, .order-list-pane')),
        detail: Boolean(document.querySelector('.landscape-order-detail, [data-layout="landscape-order-detail"], .order-detail-pane')),
      }));
      await page.locator('.order-list-card[data-status="active"]').first().click();
      const detailState = await page.evaluate(() => ({
        screen: window.__appRentalDemo.snapshot().screen,
        list: Boolean(document.querySelector('.landscape-order-list, .order-list-pane')),
        detail: Boolean(document.querySelector('.landscape-order-detail, [data-layout="landscape-order-detail"], .order-detail-pane')),
      }));
      assert(
        listState.screen === 'orders' && listState.list && !listState.detail
          && detailState.screen === 'order-detail' && !detailState.list && detailState.detail,
        `横屏订单列表与详情未拆成独立页面：${JSON.stringify({ listState, detailState })}`,
      );
    });

    await runRefactorGate('CROSS_GAME_CHECKOUT', async () => {
      await reloadDemo();
      const checkoutContexts = await page.evaluate(() => {
        const readCheckout = () => {
          const snapshot = window.__appRentalDemo.snapshot();
          const checkout = snapshot.checkoutDraft || snapshot.order;
          const text = document.querySelector('#appRentalDemo').innerText;
          return {
            selectedGameId: snapshot.selectedGameId,
            gameId: checkout?.gameId,
            gameName: checkout?.gameName,
            hasShadowBlade: text.includes('影之刃零'),
            hasEldenRing: text.includes('艾尔登法环'),
            coverSource: document.querySelector('.checkout-cover img')?.dataset.sourceScreen,
            coverCrop: document.querySelector('.checkout-cover img')
              ? [
                  document.querySelector('.checkout-cover img').dataset.cropX,
                  document.querySelector('.checkout-cover img').dataset.cropY,
                  document.querySelector('.checkout-cover img').dataset.cropWidth,
                  document.querySelector('.checkout-cover img').dataset.cropHeight,
                ].join(',')
              : null,
          };
        };
        window.__appRentalDemo.setScenario('not-member-library');
        window.__appRentalDemo.setOrientation('portrait');
        window.__appRentalDemo.setSelectedGame('elden-ring');
        window.__appRentalDemo.selectRentalSku('rent-2h');
        window.__appRentalDemo.navigate('checkout');
        const first = readCheckout();
        window.__appRentalDemo.navigate('detail', { replaceTask: true });
        window.__appRentalDemo.setSelectedGame('shadow-blade-zero');
        window.__appRentalDemo.navigate('checkout');
        return { first, second: readCheckout() };
      });
      assert(
        checkoutContexts.first.gameId === 'elden-ring'
          && checkoutContexts.first.coverSource === 'home'
          && checkoutContexts.first.coverCrop === '67,1658,492,235'
          && checkoutContexts.second.selectedGameId === 'shadow-blade-zero'
          && checkoutContexts.second.gameId === 'shadow-blade-zero'
          && checkoutContexts.second.gameName === '影之刃零'
          && checkoutContexts.second.hasShadowBlade
          && !checkoutContexts.second.hasEldenRing,
        `跨游戏结算串单：${JSON.stringify(checkoutContexts)}`,
      );
    });

    await runRefactorGate('GAME_TRANSACTION_COMPLETION', async () => {
      await reloadDemo();
      const transaction = await page.evaluate(() => {
        window.__appRentalDemo.setScenario('not-member-library');
        window.__appRentalDemo.setOrientation('portrait');
        window.__appRentalDemo.setSelectedGame('elden-ring');
        window.__appRentalDemo.selectRentalSku('rent-2h');
        window.__appRentalDemo.navigate('checkout');
        const paid = window.__appRentalDemo.payOrder();
        const payment = {
          status: (window.__appRentalDemo.snapshot().checkoutDraft || window.__appRentalDemo.snapshot().order)?.status,
          screen: window.__appRentalDemo.snapshot().screen,
          paymentComplete: /支付成功|支付完成|已完成支付/.test(document.querySelector('#appRentalDemo').innerText),
          allocationInProgress: /分配账号|账号分配中|正在分配/.test(document.querySelector('#appRentalDemo').innerText),
        };
        const allocated = window.__appRentalDemo.allocateAccount(true);
        const allocation = {
          status: (window.__appRentalDemo.snapshot().activeUsage || window.__appRentalDemo.snapshot().order)?.status,
          screen: window.__appRentalDemo.snapshot().screen,
          allocationComplete: /账号已就绪|账号分配成功|开始畅玩|立即登录/.test(document.querySelector('#appRentalDemo').innerText),
        };
        return { paid, allocated, payment, allocation };
      });
      assert(
        transaction.paid === true
          && ['allocating', 'paid', 'succeeded', 'completed'].includes(transaction.payment.status)
          && transaction.payment.paymentComplete
          && transaction.payment.allocationInProgress
          && transaction.allocated === true
          && ['active', 'ready', 'completed'].includes(transaction.allocation.status)
          && transaction.allocation.allocationComplete,
        `游戏支付或账号分配缺少完成态：${JSON.stringify(transaction)}`,
      );
    });

    await runRefactorGate('MEMBERSHIP_COMPLETION', async () => {
      await reloadDemo();
      const membership = await page.evaluate(() => {
        const api = window.__appRentalDemo;
        api.setOrientation('portrait');
        api.navigate('membership');
        const created = api.createMembershipOrder();
        const complete = api.payMembershipOrder || api.completeMembershipPayment;
        const completed = typeof complete === 'function' ? complete.call(api) : false;
        const snapshot = api.snapshot();
        return {
          created: created?.status,
          hasCompletionApi: typeof complete === 'function',
          completed,
          orderStatus: snapshot.membershipOrder?.status,
          membershipStatus: snapshot.membershipStatus,
          completionCopy: /开通成功|会员已生效|支付成功|支付完成/.test(document.querySelector('#appRentalDemo').innerText),
        };
      });
      assert(
        membership.created === 'pending'
          && membership.hasCompletionApi
          && membership.completed === true
          && ['paid', 'active', 'completed', 'succeeded'].includes(membership.orderStatus)
          && ['weekly-active', 'monthly-active', 'quarterly-active'].includes(membership.membershipStatus)
          && membership.completionCopy,
        `会员订单缺少支付完成与权益生效态：${JSON.stringify(membership)}`,
      );
    });

    await runRefactorGate('EXPIRED_CREDENTIAL_GUARD', async () => {
      await reloadDemo();
      await page.evaluate(() => {
        window.__appRentalDemo.setOrientation('portrait');
        window.__appRentalDemo.navigate('orders');
        window.__appRentalDemo.selectOrder('APP-20260803005');
        window.__appRentalDemo.navigate('steam-login');
      });
      const apiGuards = await page.evaluate(() => ({
        openCredential: window.__appRentalDemo.openCredentialPanel(),
        openManual: window.__appRentalDemo.openManualLogin(),
        requestGuard: window.__appRentalDemo.requestGuardCode(),
      }));
      const helpTrigger = page.locator('.steam-help-trigger');
      if (await helpTrigger.count()) await helpTrigger.click();
      const guarded = await page.evaluate(() => {
        const rootNode = document.querySelector('#appRentalDemo');
        return {
          screen: window.__appRentalDemo.snapshot().screen,
          credentialPanelOpen: window.__appRentalDemo.snapshot().credentialPanelOpen,
          steamHelpOpen: window.__appRentalDemo.snapshot().steamHelpOpen,
          overlay: Boolean(rootNode.querySelector('.steam-credential-sheet, .credential-panel')),
          secretInDom: /gh_rental_2607|G@meHub#8291|48291/.test(rootNode.innerHTML),
        };
      });
      assert(
        apiGuards.openCredential === false && apiGuards.openManual === false && apiGuards.requestGuard === false
          && !guarded.credentialPanelOpen && !guarded.steamHelpOpen && !guarded.overlay && !guarded.secretInDom,
        `失效订单仍可访问凭据：${JSON.stringify({ apiGuards, guarded })}`,
      );
    });

    await runRefactorGate('SENSITIVE_STATE_LIFECYCLE', async () => {
      const seedSensitiveState = async () => {
        await page.evaluate(() => {
          window.__appRentalDemo.setScenario('active-rental');
          window.__appRentalDemo.setOrientation('portrait');
          window.__appRentalDemo.navigate('orders');
          window.__appRentalDemo.selectOrder('APP-SCENARIO-ACTIVE');
          window.__appRentalDemo.openManualLogin();
        });
        await page.locator('#steam-account').fill('sensitive-user');
        await page.locator('#steam-password').fill('sensitive-password');
        await page.locator('[data-action="submit-steam-login"]').click();
        await page.locator('[data-action="request-guard"]').click();
      };
      await reloadDemo();
      await seedSensitiveState();
      await page.locator('.steam-close').click();
      const readSensitiveState = () => page.evaluate(() => {
        const snapshot = window.__appRentalDemo.snapshot();
        return {
          account: snapshot.steamForm.account,
          password: snapshot.steamForm.password,
          guardCode: snapshot.guardCode,
          guardExpiresAt: snapshot.guardExpiresAt,
          submitted: snapshot.steamForm.submitted,
          requiresGuard: snapshot.steamForm.requiresGuard,
          credentialPanelOpen: snapshot.credentialPanelOpen,
          steamHelpOpen: snapshot.steamHelpOpen,
          loginMethodOpen: snapshot.loginMethodOpen,
        };
      });
      const afterExit = await readSensitiveState();
      await reloadDemo();
      await seedSensitiveState();
      await page.evaluate(() => window.__appRentalDemo.clearSensitiveState('background'));
      const afterBackground = await readSensitiveState();
      const isClean = (snapshot) => snapshot.account === ''
        && snapshot.password === ''
        && snapshot.guardCode === null
        && snapshot.guardExpiresAt === null
        && !snapshot.submitted
        && !snapshot.requiresGuard
        && !snapshot.credentialPanelOpen
        && !snapshot.steamHelpOpen
        && !snapshot.loginMethodOpen;
      assert(isClean(afterExit) && isClean(afterBackground), `退出或后台未清空敏感态：${JSON.stringify({ afterExit, afterBackground })}`);
    });

    await runRefactorGate('ROTATION_SCROLL_REGISTRY', async () => {
      const results = [];
      for (const [screen, requestedTop] of [['play', 35], ['library', 145], ['membership', 108], ['member-library', 180]]) {
        await reloadDemo();
        const before = await page.evaluate(({ screen, requestedTop }) => {
          window.__appRentalDemo.setOrientation('portrait');
          window.__appRentalDemo.navigate(screen);
          const region = document.querySelector('.device.portrait .portrait-content');
          const max = Math.max(0, region.scrollHeight - region.clientHeight);
          region.scrollTop = Math.min(requestedTop, max);
          region.dispatchEvent(new Event('scroll'));
          return { top: region.scrollTop, max };
        }, { screen, requestedTop });
        await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const after = await page.evaluate(() => {
          const candidates = [...document.querySelectorAll(
            '[data-scroll-region="primary"], .landscape-membership-body, .landscape-member-library-layout, .device.landscape .landscape-content, .device.landscape .task-scroll-region',
          )];
          const region = candidates.find((node) => node.scrollHeight > node.clientHeight) || candidates[0];
          return region ? { top: region.scrollTop, max: Math.max(0, region.scrollHeight - region.clientHeight) } : { top: 0, max: 0 };
        });
        await page.evaluate(() => window.__appRentalDemo.setOrientation('portrait'));
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const roundTrip = await page.evaluate(() => {
          const region = document.querySelector('.device.portrait .portrait-content');
          return { top: region?.scrollTop || 0, max: Math.max(0, (region?.scrollHeight || 0) - (region?.clientHeight || 0)) };
        });
        const expected = Math.min(before.top, after.max);
        results.push({
          screen,
          before,
          after,
          roundTrip,
          expected,
          retained: before.top > 0 && Math.abs(after.top - expected) <= 2 && Math.abs(roundTrip.top - before.top) <= 2,
        });
      }
      assert(results.every(({ retained }) => retained), `旋转后滚动位置丢失：${JSON.stringify(results)}`);
    });

    await runRefactorGate('EXPIRY_THRESHOLD_ONCE', async () => {
      await reloadDemo();
      const threshold = await page.evaluate(() => {
        window.__appRentalDemo.setScenario('active-rental');
        window.__appRentalDemo.triggerExpiryMinutes(16);
        const before = window.__appRentalDemo.snapshot();
        window.__appRentalDemo.triggerExpiryMinutes(14);
        const crossed = window.__appRentalDemo.snapshot();
        window.__appRentalDemo.closeExpiryReminder();
        window.__appRentalDemo.triggerExpiryMinutes(10);
        window.__appRentalDemo.triggerExpiryMinutes(5);
        const after = window.__appRentalDemo.snapshot();
        return {
          before: { open: before.expiryReminderOpen, count: before.expiryReminderCount },
          crossed: { open: crossed.expiryReminderOpen, count: crossed.expiryReminderCount },
          after: { open: after.expiryReminderOpen, count: after.expiryReminderCount },
        };
      });
      assert(
        !threshold.before.open && threshold.before.count === 0
          && threshold.crossed.open && threshold.crossed.count === 1
          && !threshold.after.open && threshold.after.count === 1,
        `15分钟跨阈值提醒次数错误：${JSON.stringify(threshold)}`,
      );
    });

    await runRefactorGate('EXPIRY_RETURN_STACK', async () => {
      await reloadDemo();
      const takeover = await page.evaluate(() => {
        window.__appRentalDemo.setOrientation('portrait');
        window.__appRentalDemo.navigate('library');
        window.__appRentalDemo.setScenario('active-rental');
        window.__appRentalDemo.navigate('orders');
        window.__appRentalDemo.selectOrder('APP-SCENARIO-ACTIVE');
        window.__appRentalDemo.openManualLogin();
        window.__appRentalDemo.setPostRentalEntitlement('permanent');
        window.__appRentalDemo.triggerExpiryMinutes(0);
        const atT0Snapshot = window.__appRentalDemo.snapshot();
        const backTarget = window.__appRentalDemo.taskBack();
        const afterBackSnapshot = window.__appRentalDemo.snapshot();
        return {
          atT0: { screen: atT0Snapshot.screen, stack: atT0Snapshot.routeContext.taskStack, source: atT0Snapshot.routeContext.sourceScreen },
          backTarget,
          afterBack: { screen: afterBackSnapshot.screen, stack: afterBackSnapshot.routeContext.taskStack, source: afterBackSnapshot.routeContext.sourceScreen },
        };
      });
      await reloadDemo();
      const ended = await page.evaluate(() => {
        window.__appRentalDemo.setOrientation('portrait');
        window.__appRentalDemo.navigate('library');
        window.__appRentalDemo.setScenario('active-rental');
        window.__appRentalDemo.navigate('orders');
        window.__appRentalDemo.selectOrder('APP-SCENARIO-ACTIVE');
        window.__appRentalDemo.openManualLogin();
        window.__appRentalDemo.triggerExpiryMinutes(0);
        window.__appRentalDemo.closeExpiredLaunchDialog();
        const snapshot = window.__appRentalDemo.snapshot();
        return { screen: snapshot.screen, stack: snapshot.routeContext.taskStack, source: snapshot.routeContext.sourceScreen };
      });
      assert(
        takeover.atT0.screen === 'detail'
          && takeover.backTarget === 'library'
          && takeover.afterBack.screen === 'library'
          && takeover.afterBack.stack.length === 0
          && ended.screen === 'library'
          && ended.stack.length === 0,
        `到期后的来源返回栈错误：${JSON.stringify({ takeover, ended })}`,
      );
    });

    for (const failure of refactorGateFailures) process.stdout.write(`REFACTOR_GATE_FAIL ${failure}\n`);
    writeJsonEvidence(verificationEvidencePath, {
      generatedAt: new Date().toISOString(),
      demo: path.relative(root, htmlPath),
      template: path.relative(root, templatePath),
      pageMatrixContracts: FULL_PAGE_MATRIX.length * 2,
      gateCount: refactorGateResults.length,
      passed: refactorGateChecks,
      failed: refactorGateFailures.length,
      results: refactorGateResults,
      runtimeIssues: demoIssues,
    });
    assert(
      refactorGateFailures.length === 0,
      `REFACTOR_GATES ${refactorGateChecks}/${refactorGateResults.length} PASS，${refactorGateFailures.length} FAIL；证据：${verificationEvidencePath}`,
    );
    process.stdout.write(`REFACTOR_GATES ${refactorGateChecks}/${refactorGateChecks} PASS\n`);

    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('home');
    });
    const portrait = await page.evaluate(() => ({
      frame: document.querySelector('.device.portrait')?.getBoundingClientRect().toJSON(),
      nav: [...document.querySelectorAll('.portrait-nav button')].map((node) => node.textContent.trim()),
      primaryCount: document.querySelectorAll('[data-primary-action="true"]').length,
    }));
    assert(Math.round(portrait.frame?.width ?? 0) === 390, '竖屏宽度不是390');
    assert(Math.round(portrait.frame?.height ?? 0) === 844, '竖屏高度不是844');
    assert(portrait.nav.join('|') === '首页|玩游戏|排行榜|游戏库|我的', '竖屏导航不一致');
    assert(portrait.primaryCount === 0, '首页不得存在独立主操作，游戏卡应整卡进入详情');
    process.stdout.write('PORTRAIT 4/4 PASS\n');

    const builtHtml = fs.readFileSync(htmlPath, 'utf8');
    const inlineImageCount = (builtHtml.match(/data:image\/(?:jpeg|png|webp);base64,/g) || []).length;
    assert(inlineImageCount >= 5, `真实内联素材不足：${inlineImageCount}/5`);
    for (const screen of ['home', 'play', 'library', 'profile']) {
      await page.evaluate((value) => window.__appRentalDemo.navigate(value), screen);
      await page.waitForFunction(() => [...document.querySelectorAll('img[data-real-asset="true"]')]
        .some((node) => node.complete && node.naturalWidth > 0 && node.getClientRects().length > 0));
      const visibleAssets = await page.locator('img[data-real-asset="true"]:visible').count();
      assert(visibleAssets >= 1, `${screen} 缺少可见真实素材`);
    }
    process.stdout.write('MATERIALS 5/5 PASS\n');

    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('landscape');
      window.__appRentalDemo.navigate('library');
    });
    const landscape = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.landscape .game-card')];
      const contentRect = document.querySelector('.landscape-content')?.getBoundingClientRect();
      const metrics = cards.map((node) => {
        const rect = node.getBoundingClientRect();
        const image = node.querySelector('img[data-real-asset="true"]');
        return {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          visible: rect.top < contentRect.bottom && rect.bottom > contentRect.top,
          real: Boolean(image?.complete && image.naturalWidth > 0),
        };
      });
      const firstTop = Math.min(...metrics.map(({ top }) => top));
      const firstRow = metrics.filter(({ top }) => top === firstTop);
      const secondRow = metrics.filter(({ top }) => top > firstTop);
      return {
        frame: document.querySelector('.device.landscape')?.getBoundingClientRect().toJSON(),
        hasSideNav: Boolean(document.querySelector('.landscape-side-nav')),
        hasBottomNav: Boolean(document.querySelector('.landscape .portrait-nav')),
        nav: [...document.querySelectorAll('.landscape-top-nav nav button')].map((node) => node.textContent.trim()),
        tabs: [...document.querySelectorAll('.landscape-platform-tabs button')].map((node) => node.textContent.trim()),
        cards: cards.length,
        rows: new Set(metrics.map(({ top }) => top)).size,
        firstRowColumns: new Set(firstRow.map(({ left }) => left)).size,
        secondRowVisible: secondRow.some(({ visible }) => visible),
        secondRowReal: secondRow.some(({ visible, real }) => visible && real),
      };
    });
    assert(Math.round(landscape.frame?.width ?? 0) === 874, '横屏宽度不是874');
    assert(Math.round(landscape.frame?.height ?? 0) === 402, '横屏高度不是402');
    assert(landscape.hasSideNav, '横屏缺少 APP 左侧导航');
    assert(!landscape.hasBottomNav, '横屏不得出现底部导航');
    assert(landscape.nav.join('|') === '游戏库|玩游戏|探索|社区|排行榜|我的', '横屏导航顺序错误');
    assert(landscape.cards >= 6, '横屏游戏墙密度不足');
    assert(landscape.rows >= 2, '横屏游戏墙必须露出第二行');
    assert(landscape.tabs.join('|') === 'PC游戏|Steam游戏|Epic游戏|复古游戏', '横屏平台Tab不完整');
    assert(landscape.firstRowColumns === 5, '横屏游戏墙首行不是5列');
    assert(landscape.secondRowVisible, '横屏游戏墙第二行未进入可视区');
    assert(landscape.secondRowReal, '横屏游戏墙第二行缺少已加载真实封面');

    const libraryBeforeTab = await page.locator('.landscape-library .game-card strong').allTextContents();
    await page.locator('.landscape-platform-tabs [data-value="epic"]').click();
    const libraryAfterTab = await page.locator('.landscape-library .game-card strong').allTextContents();
    assert(JSON.stringify(libraryBeforeTab) !== JSON.stringify(libraryAfterTab), '横屏平台Tab未切换游戏内容');

    const proportionalImages = await page.evaluate(() => [...document.querySelectorAll('.landscape-library img[data-real-asset="true"]')].map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        objectFit: getComputedStyle(node).objectFit,
        renderedRatio: rect.width / rect.height,
        naturalRatio: node.naturalWidth / node.naturalHeight,
      };
    }));
    assert(
      proportionalImages.length >= 6
        && proportionalImages.every(({ objectFit, renderedRatio, naturalRatio }) => objectFit === 'cover'
          && Math.abs(renderedRatio / naturalRatio - 1) <= 0.01),
      '真实素材存在非等比拉伸',
    );

    await page.evaluate(() => window.__appRentalDemo.navigate('play'));
    const playTabContents = [];
    for (const value of ['cloud', 'pc', 'retro']) {
      await page.locator(`.landscape-play-tabs [data-value="${value}"]`).click();
      playTabContents.push(await page.locator('.landscape-recent-item strong, .landscape-hot-card strong').allTextContents());
    }
    assert(new Set(playTabContents.map((items) => JSON.stringify(items))).size === 3, '横屏玩游戏Tab未切换真实内容');

    const playTouchTargets = await page.evaluate(() => [
      ...document.querySelectorAll('.landscape-play-tabs button'),
      document.querySelector('.landscape-benefit .primary-action'),
    ].filter(Boolean).map((node) => {
      const rect = node.getBoundingClientRect();
      return [rect.width, rect.height];
    }));
    assert(playTouchTargets.every(([width, height]) => width >= 44 && height >= 44), '横屏玩游戏触控区小于44×44');

    await page.evaluate(() => window.__appRentalDemo.navigate('library'));
    const libraryTouchTargets = await page.evaluate(() => [
      ...document.querySelectorAll('.landscape-platform-tabs button'),
      ...document.querySelectorAll('.landscape-tool-button'),
    ].map((node) => {
      const rect = node.getBoundingClientRect();
      return [rect.width, rect.height];
    }));
    assert(libraryTouchTargets.every(([width, height]) => width >= 44 && height >= 44), '横屏游戏库触控区小于44×44');

    const landscapePages = {};
    for (const screen of ['home', 'play', 'library', 'profile']) {
      await page.evaluate((value) => window.__appRentalDemo.navigate(value), screen);
      landscapePages[screen] = await page.evaluate((value) => ({
        layout: Boolean(document.querySelector(`.landscape-${value}`)),
        primaryCount: document.querySelectorAll('[data-primary-action="true"]').length,
        realAssets: [...document.querySelectorAll('img[data-real-asset="true"]')]
          .filter((node) => node.complete && node.naturalWidth > 0 && node.getClientRects().length > 0).length,
      }), screen);
      assert(landscapePages[screen].layout, `${screen} 缺少独立横屏DOM`);
    }
    assert(Object.values(landscapePages).every(({ primaryCount }) => primaryCount <= 1), '横屏页面主操作超过1个');
    assert(Object.values(landscapePages).every(({ realAssets }) => realAssets >= 1), '横屏页面缺少真实素材');
    const touchTargets = await page.evaluate(() => [
      ...document.querySelectorAll('.landscape-top-nav nav button'),
      document.querySelector('.landscape-outline-button'),
      document.querySelector('.landscape-order-entry'),
    ].filter(Boolean).map((node) => node.getBoundingClientRect().height));
    assert(touchTargets.every((height) => height >= 44), '横屏关键触控区小于44px');

    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('play');
      document.querySelector('[data-group="playTab"][data-value="pc"]')?.click();
      window.__appRentalDemo.navigate('library');
      document.querySelector('[data-group="libraryTab"][data-value="epic"]')?.click();
      window.__appRentalDemo.setScenario('active-member');
      window.__appRentalDemo.navigate('profile');
      window.__appRentalDemo.setOrientation('landscape');
    });
    const rotationState = await page.evaluate(() => window.__appRentalDemo.snapshot());
    assert(
      rotationState.screen === 'profile'
        && rotationState.scenario === 'active-member'
        && rotationState.playTab === 'pc'
        && rotationState.libraryTab === 'epic',
      '横竖屏切换丢失共享状态',
    );
    await page.locator('.landscape-profile [data-screen="orders"]').click();
    const orderEntryScreen = await page.evaluate(() => window.__appRentalDemo.snapshot().screen);
    assert(orderEntryScreen === 'orders', '横屏租号订单入口不可用');
    process.stdout.write('LANDSCAPE 25/25 PASS\n');

    const entitlementCases = [
      ['owned-installed', 'launch', []],
      ['owned-uninstalled', 'download', []],
      ['active-rental', 'continue', ['credential', 'renew']],
      ['not-member-library', 'rent-2h', ['more-duration']],
      ['member-library-trial', 'trial', ['more-duration', 'membership']],
      ['member-library-trial-used', 'rent-2h', ['more-duration', 'membership']],
      ['active-member', 'member-play', ['membership-status']],
      ['permanent-owned', 'launch', []],
    ];

    for (const [scenario, primary, secondary] of entitlementCases) {
      await page.evaluate((value) => window.__appRentalDemo.setScenario(value), scenario);
      const result = await page.evaluate(() => window.__appRentalDemo.resolveCurrentAction());
      assert(result.primary === primary, `${scenario} 主操作错误：${result.primary}`);
      assert(JSON.stringify(result.secondary) === JSON.stringify(secondary), `${scenario} 次级操作错误`);
    }
    process.stdout.write(`ENTITLEMENTS ${entitlementCases.length}/${entitlementCases.length} PASS\n`);

    const skuCases = [
      ['hot-time-rental', 'not-member-library', 'shadow-blade-zero', ['影之刃零 - 标准版', '按小时', '日租', '周租', '6小时', '12小时', '23小时'], ['增强版', '豪华版', '首次体验', '单游永久', '开会员'], []],
      ['entitlement-trial', 'member-library-trial', 'spiritfarer', ['首次体验', '单游永久', '开会员'], ['按小时', '日租', '周租'], ['trial', 'permanent', 'membership']],
      ['entitlement-trial-used', 'member-library-trial-used', 'spiritfarer', ['单游永久', '开会员'], ['首次体验', '按小时', '日租', '周租'], ['permanent', 'membership']],
      ['active-member', 'active-member', 'spiritfarer', ['可畅玩'], ['租号开玩', '首次体验', '单游永久', '开会员'], []],
    ];
    for (const [caseName, scenario, gameId, present, absent, expectedKinds] of skuCases) {
      await page.evaluate(({ scenario, gameId }) => {
        window.__appRentalDemo.setOrientation('portrait');
        window.__appRentalDemo.setScenario(scenario);
        window.__appRentalDemo.setDiscoveryContext(gameId, { firstRentalEligible: scenario === 'member-library-trial' });
        window.__appRentalDemo.setSelectedGame(gameId);
        window.__appRentalDemo.navigate('detail');
        const rentalEntry = [...document.querySelectorAll('[data-primary-action="true"]')]
          .find((node) => node.textContent.trim() === '租号开玩');
        rentalEntry?.click();
      }, { scenario, gameId });
      const text = await page.locator('#appRentalDemo').innerText();
      const actualKinds = await page.locator('[data-sku-kind]').evaluateAll((nodes) => nodes.map((node) => node.dataset.skuKind));
      const assertionText = text;
      for (const value of present) assert(assertionText.includes(value), `${caseName} 缺少 ${value}`);
      for (const value of absent) assert(!assertionText.includes(value), `${caseName} 不应显示 ${value}`);
      assert(JSON.stringify(actualKinds) === JSON.stringify(expectedKinds), `${caseName} SKU 类型错误：${JSON.stringify(actualKinds)}`);
      if (caseName !== 'active-member') assert((await page.evaluate(() => window.__appRentalDemo.snapshot().screen)) === 'checkout', `${caseName} 未进入确认订单`);
    }
    process.stdout.write(`SKU ${skuCases.length}/${skuCases.length} PASS\n`);

    await page.evaluate(() => {
      window.__appRentalDemo.setScenario('member-library-trial');
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('detail');
    });
    const portraitDetail = await page.evaluate(() => {
      const frame = document.querySelector('.device.portrait')?.getBoundingClientRect();
      const footer = document.querySelector('.portrait-fixed-footer')?.getBoundingClientRect();
      return {
        layout: Boolean(document.querySelector('.portrait-detail[data-layout="portrait-detail"]')),
        hero: Boolean(document.querySelector('.portrait-detail-hero img[data-real-asset="true"]')),
        primaryCount: document.querySelectorAll('[data-primary-action="true"]').length,
        footerPinned: Boolean(frame && footer && Math.abs(frame.bottom - footer.bottom) <= 14),
      };
    });
    assert(portraitDetail.layout, '竖屏详情缺少独立布局');
    assert(portraitDetail.hero, '竖屏详情缺少真实主视觉');
    assert(portraitDetail.primaryCount === 1 && portraitDetail.footerPinned, '竖屏详情主按钮未固定或不唯一');

    await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
    const landscapeDetail = await page.evaluate(() => ({
      layout: Boolean(document.querySelector('.landscape-detail[data-layout="landscape-detail"]')),
      left: Boolean(document.querySelector('.landscape-detail-game')),
      right: Boolean(document.querySelector('.landscape-detail-benefits')),
      primaryCount: document.querySelectorAll('[data-primary-action="true"]').length,
    }));
    assert(landscapeDetail.layout, '横屏详情缺少独立 DOM');
    assert(landscapeDetail.left && landscapeDetail.right, '横屏详情未采用左游戏信息、右权益布局');
    assert(landscapeDetail.primaryCount === 1, '横屏详情主操作不唯一');

    const ownershipCases = [
      ['owned-installed', '可畅玩'],
      ['owned-uninstalled', '下载游戏'],
      ['imported', '可畅玩'],
    ];
    for (const [scenario, label] of ownershipCases) {
      await page.evaluate((value) => {
        window.__appRentalDemo.setScenario(value);
        window.__appRentalDemo.navigate('detail');
      }, scenario);
      const detailText = await page.locator('#appRentalDemo').innerText();
      assert(detailText.includes(label), `${scenario} 缺少 ${label}`);
      assert(!/2小时租用|更多租期|首次体验|单游戏永久畅玩|开通会员/.test(detailText), `${scenario} 不得显示租号购买入口`);
    }
    await page.evaluate(() => {
      window.__appRentalDemo.setDiscoveryContext('shadow-blade-zero', { firstRentalEligible: true });
      window.__appRentalDemo.setScenario('not-member-library');
      window.__appRentalDemo.setSelectedGame('shadow-blade-zero');
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('detail');
    });
    const initialRentalDetail = await page.evaluate(() => ({
      label: document.querySelector('[data-primary-action="true"]')?.textContent.trim(),
      panel: Boolean(document.querySelector('[data-entitlement-panel]')),
      order: window.__appRentalDemo.snapshot().order,
    }));
    assert(initialRentalDetail.label === '租号开玩' && !initialRentalDetail.panel && !initialRentalDetail.order, '无权益详情必须先显示“租号开玩”，且不得提前展开租期或创单');
    await page.getByRole('button', { name: '租号开玩', exact: true }).click();
    const checkoutFromDetail = await page.evaluate(() => ({
      screen: window.__appRentalDemo.snapshot().screen,
      panel: Boolean(document.querySelector('[data-entitlement-panel]')),
      order: window.__appRentalDemo.snapshot().order,
      saleMode: document.querySelector('[data-sale-mode]')?.dataset.saleMode,
    }));
    assert(checkoutFromDetail.screen === 'checkout' && !checkoutFromDetail.panel && checkoutFromDetail.order?.durationLabel === '2小时' && checkoutFromDetail.saleMode === 'time-rental', '首次点击“租号开玩”必须直接进入时租确认订单');
    await page.evaluate(() => window.__appRentalDemo.setRentalHours(8));
    const confirmedRentalDetail = await page.evaluate(() => window.__appRentalDemo.snapshot());
    assert(confirmedRentalDetail.screen === 'checkout' && confirmedRentalDetail.order?.durationLabel === '8小时' && confirmedRentalDetail.order?.amount === 36, '确认订单切换租期后未按原始金额重建订单');

    await page.evaluate(() => {
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.navigate('detail');
    });
    const activeRentalDetailText = await page.locator('#appRentalDemo').innerText();
    assert(activeRentalDetailText.includes('登录游戏') && !activeRentalDetailText.includes('剩余'), '有效租赁详情必须显示登录游戏且不显示剩余时长');
    process.stdout.write('DETAIL 14/14 PASS\n');

    await page.evaluate(() => {
      window.__appRentalDemo.setDiscoveryContext('shadow-blade-zero', { firstRentalEligible: true });
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.setScenario('not-member-library');
      window.__appRentalDemo.setSelectedGame('shadow-blade-zero');
      window.__appRentalDemo.navigate('detail');
    });
    await page.getByRole('button', { name: '租号开玩', exact: true }).click();
    const durationOptions = await page.locator('[data-checkout-field="rental-plan"] .checkout-option').evaluateAll((nodes) => nodes.map((node) => node.textContent.trim()));
    assert(durationOptions.join('|') === '按小时|日租|周租', `确认订单时租套餐不完整：${JSON.stringify(durationOptions)}`);
    const hourShortcuts = await page.locator('[data-hour-shortcut]').evaluateAll((nodes) => nodes.map((node) => node.textContent.trim()));
    assert(hourShortcuts.join('|') === '6小时|12小时|23小时', `确认订单小时快捷键不完整：${JSON.stringify(hourShortcuts)}`);
    await page.evaluate(() => window.__appRentalDemo.setRentalHours(8));
    const invalidHourBoundary = await page.evaluate(() => {
      const before = window.__appRentalDemo.snapshot();
      const results = ['', 'abc', 1, 1.5, 24].map((value) => window.__appRentalDemo.setRentalHours(value));
      const after = window.__appRentalDemo.snapshot();
      return {
        results,
        beforeOrderId: before.order?.id,
        afterOrderId: after.order?.id,
        beforeHours: before.selectedHours,
        afterHours: after.selectedHours,
      };
    });
    assert(
      invalidHourBoundary.results.every((value) => value === false)
        && invalidHourBoundary.beforeOrderId === invalidHourBoundary.afterOrderId
        && invalidHourBoundary.beforeHours === 8
        && invalidHourBoundary.afterHours === 8,
      `非法小时必须拒绝且不得重建草稿：${JSON.stringify(invalidHourBoundary)}`,
    );
    const checkoutSelectionMatrix = await page.evaluate(() => {
      const rows = [];
      const record = (step) => {
        const snapshot = window.__appRentalDemo.snapshot();
        rows.push({
          step,
          id: snapshot.order?.id,
          editionId: snapshot.order?.editionId,
          plan: snapshot.rentalPlan,
          hours: snapshot.selectedHours,
          durationLabel: snapshot.order?.durationLabel,
        });
      };
      record('hourly-8-standard');
      const enhancedRejected = window.__appRentalDemo.selectEdition('enhanced');
      record('enhanced-rejected');
      window.__appRentalDemo.selectRentalPlan('daily');
      record('daily-standard');
      window.__appRentalDemo.selectRentalPlan('weekly');
      record('weekly-standard');
      window.__appRentalDemo.setRentalHours(23);
      record('hourly-23-standard');
      window.__appRentalDemo.setRentalHours(8);
      return { rows, enhancedRejected };
    });
    const selectionRows = checkoutSelectionMatrix.rows;
    assert(
      checkoutSelectionMatrix.enhancedRejected === false
        && selectionRows[0].id === selectionRows[1].id
        && new Set([selectionRows[0].id, ...selectionRows.slice(2).map(({ id }) => id)]).size === 4,
      `非标准版应拒绝且套餐或小时切换后应重建草稿：${JSON.stringify(checkoutSelectionMatrix)}`,
    );
    assert(
      selectionRows.every(({ editionId }) => editionId === 'standard')
        && selectionRows[2].durationLabel === '24小时'
        && selectionRows[3].durationLabel === '7天'
        && selectionRows[4].plan === 'hourly'
        && selectionRows[4].hours === 23,
      `确认订单标准版、套餐与小时快照不一致：${JSON.stringify(checkoutSelectionMatrix)}`,
    );
    const checkoutText = await page.locator('#appRentalDemo').innerText();
    assert(['影之刃零 - 标准版', '租赁套餐', '租期', '原价', '实付', '支付方式', '租号服务协议', '退款规则', '支付有效期'].every((value) => checkoutText.includes(value)), '确认订单字段不完整');
    assert(checkoutText.includes('¥36.00'), '确认订单实付金额必须保留两位小数');
    assert(checkoutText.includes('支付宝') && checkoutText.includes('微信'), '确认订单缺少双支付方式');
    assert(/\b(?:2\d|30):[0-5]\d\b/.test(checkoutText), '确认订单缺少30分钟 MM:SS 倒计时');
    await page.locator('[data-action="open-no-reason-policy"]').click();
    const noReasonPolicy = await page.locator('.policy-dialog').innerText();
    assert(noReasonPolicy.includes('72 小时') && noReasonPolicy.includes('30 分钟') && noReasonPolicy.includes('原路退回'), '3天无理由规则弹窗口径不完整');
    await page.locator('.policy-dialog [data-action="close-no-reason-policy"]').last().click();

    const checkoutBeforeRotation = await page.evaluate(() => window.__appRentalDemo.snapshot().order);
    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('landscape');
      window.__appRentalDemo.navigate('checkout');
    });
    const checkoutAfterRotation = await page.evaluate(() => window.__appRentalDemo.snapshot().order);
    assert(
      checkoutBeforeRotation.id === checkoutAfterRotation.id
        && checkoutBeforeRotation.sku === checkoutAfterRotation.sku
        && checkoutBeforeRotation.amount === checkoutAfterRotation.amount
        && checkoutBeforeRotation.paymentDeadline === checkoutAfterRotation.paymentDeadline,
      '旋转或重渲染后订单快照发生变化',
    );
    await page.evaluate(() => window.__appRentalDemo.setPriceChanged(true));
    assert((await page.locator('#appRentalDemo').innerText()).includes('价格已更新'), '缺少价格变化处理');
    await page.evaluate(() => {
      window.__appRentalDemo.setPriceChanged(false);
      window.__appRentalDemo.setInventoryAvailable(false);
    });
    const inventoryState = await page.evaluate(() => ({
      text: document.querySelector('#appRentalDemo').innerText,
      retry: Boolean(document.querySelector('[data-action="retry-inventory"]')),
      disabled: Boolean(document.querySelector('[data-primary-action="true"]:disabled')),
      primaryCount: document.querySelectorAll('[data-primary-action="true"]').length,
    }));
    assert(inventoryState.text.includes('当前套餐已售罄') && inventoryState.text.includes('暂不可购买') && inventoryState.retry && inventoryState.disabled && inventoryState.primaryCount === 1, '无库存时必须禁用购买并显示“暂不可购买”，同时保留库存重查');
    await page.evaluate(() => window.__appRentalDemo.setInventoryAvailable(true));
    process.stdout.write('CHECKOUT 13/13 PASS\n');

    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('profile');
    });
    await page.locator('.profile-inline-member[data-screen="membership"]').click();
    assert((await page.evaluate(() => window.__appRentalDemo.snapshot().screen)) === 'membership', '个人中心同行会员状态未进入会员中心');
    const membership = await page.evaluate(() => ({
      names: [...document.querySelectorAll('.membership-plan-card .plan-name')].map((node) => node.textContent.trim()),
      prices: [...document.querySelectorAll('.membership-plan-card .plan-price')].map((node) => node.textContent.trim()),
      originals: [...document.querySelectorAll('.membership-plan-card .plan-original')].map((node) => node.textContent.trim()),
      recommendation: document.querySelector('.membership-plan-card[data-plan="quarterly"] .plan-recommend')?.textContent.trim(),
      quarterlySelected: document.querySelector('.membership-plan-card[data-plan="quarterly"]')?.classList.contains('selected'),
      valueHero: document.querySelector('.membership-value-hero')?.textContent.trim() || '',
      benefitTitles: [...document.querySelectorAll('.membership-benefit-item strong')].map((node) => node.textContent.trim()),
      previewCards: document.querySelectorAll('.membership-preview .member-game-card').length,
      primaryLabel: document.querySelector('[data-primary-action="true"]')?.textContent.trim(),
      text: document.querySelector('#appRentalDemo').innerText,
      paymentMethods: document.querySelectorAll('.membership-payment-method').length,
      qr: Boolean(document.querySelector('[aria-label="支付二维码"]')),
      hasSelectionButton: [...document.querySelectorAll('button')].some((node) => node.textContent.trim() === '选择'),
    }));
    assert(membership.names.join('|') === '周卡|月卡|季卡', '会员套餐顺序错误');
    assert(membership.prices.join('|') === '¥39|¥129|¥299', '会员套餐演示价格错误');
    assert(membership.originals.length === 0, '会员套餐不应展示未确认的划线原价');
    assert(membership.recommendation === '推荐 · 更划算' && membership.quarterlySelected && membership.primaryLabel === '开通季卡会员 · ¥299', '季卡未作为默认推荐套餐或支付主操作不一致');
    assert(
      membership.valueHero.includes('一个会员，畅玩本期精选游戏')
        && membership.benefitTitles.join('|') === '会员库内畅玩|游戏持续更新|PC引擎与手柄适配|个人云存档同步'
        && membership.previewCards === 8,
      `会员中心未恢复原四项权益介绍：${JSON.stringify(membership)}`,
    );
    await page.locator('.membership-plan-card[data-plan="weekly"]').click();
    assert((await page.evaluate(() => window.__appRentalDemo.snapshot().memberPlan)) === 'weekly' && !membership.hasSelectionButton, '会员套餐未支持整卡切换或出现选择按钮');
    assert(!/自动续费|一次性购买/.test(membership.text), '会员中心出现禁用文案');
    assert(membership.paymentMethods === 2 && membership.qr && membership.text.includes('支付宝') && membership.text.includes('微信'), '会员支付方式或二维码不完整');

    const orderIsolation = await page.evaluate(() => {
      const gameOrder = window.__appRentalDemo.snapshot().order;
      const membershipOrder = window.__appRentalDemo.createMembershipOrder();
      const snapshot = window.__appRentalDemo.snapshot();
      return { gameOrder, membershipOrder, snapshot };
    });
    assert(
      orderIsolation.gameOrder.id === orderIsolation.snapshot.order.id
        && orderIsolation.membershipOrder.id === orderIsolation.snapshot.membershipOrder.id
        && orderIsolation.snapshot.order.id !== orderIsolation.snapshot.membershipOrder.id,
      '游戏订单与会员订单相互覆盖',
    );

    await page.evaluate(() => window.__appRentalDemo.navigate('member-library'));
    const portraitMemberLibrary = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.portrait-member-library .member-game-card')];
      return {
        cards: cards.length,
        columns: new Set(cards.slice(0, 2).map((node) => Math.round(node.getBoundingClientRect().left))).size,
      };
    });
    assert(portraitMemberLibrary.cards >= 6 && portraitMemberLibrary.columns === 2, '竖屏会员游戏库不是两列');
    await page.locator('.portrait-member-library .member-game-card').first().click();
    assert((await page.evaluate(() => window.__appRentalDemo.snapshot().screen)) === 'detail', '会员游戏卡无法进入详情');

    await page.evaluate(() => {
      window.__appRentalDemo.navigate('member-library');
      window.__appRentalDemo.setOrientation('landscape');
    });
    const landscapeMemberLibrary = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.landscape-member-library .member-game-card')];
      const firstTop = Math.min(...cards.map((node) => Math.round(node.getBoundingClientRect().top)));
      return {
        columns: cards.filter((node) => Math.round(node.getBoundingClientRect().top) === firstTop).length,
        faq: document.querySelectorAll('.member-faq-item').length,
      };
    });
    assert(landscapeMemberLibrary.columns >= 4 && landscapeMemberLibrary.faq >= 3, '横屏会员游戏库多列布局或云同步FAQ不完整');
    process.stdout.write('MEMBERSHIP 10/10 PASS\n');

    const faqSemantics = await page.evaluate(() => [...document.querySelectorAll('.member-faq-item')].map((node) => ({
      topic: node.dataset.faqTopic,
      text: node.textContent.trim(),
    })));
    const expectedFaqs = [
      ['cloud-scope', '支持存档云同步'],
      ['cloud-restore', '换设备'],
      ['cloud-expiry', '会员到期'],
    ];
    for (const [topic, keyword] of expectedFaqs) {
      const item = faqSemantics.find((entry) => entry.topic === topic);
      assert(item?.text.includes(keyword), `FAQ 缺少${keyword}主题`);
    }
    process.stdout.write('FAQ 3/3 PASS\n');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const membershipStatusCases = [
      ['none', '会员未开通'],
      ['weekly-active', '周卡会员'],
      ['monthly-active', '月卡会员'],
      ['quarterly-active', '季卡会员'],
      ['expired', '会员已过期'],
    ];
    let membershipStatusChecks = 0;
    for (const orientation of ['portrait', 'landscape']) {
      for (const [status, expectedCopy] of membershipStatusCases) {
        await page.evaluate(({ orientation, status }) => {
          window.__appRentalDemo.setOrientation(orientation);
          window.__appRentalDemo.setMembershipStatus(status);
          window.__appRentalDemo.navigate('profile');
        }, { orientation, status });
        const selector = orientation === 'portrait'
          ? '.profile-name-row .profile-inline-member[data-screen="membership"]'
          : '.landscape-profile .profile-name-row .profile-inline-member[data-screen="membership"]';
        const entry = page.locator(selector);
        const text = await entry.innerText();
        assert(text.includes(expectedCopy) && text.includes('›'), `${orientation} ${status} 用户名同行会员状态文案不完整`);
        const membershipOrderBefore = await page.evaluate(() => window.__appRentalDemo.snapshot().membershipOrder);
        await entry.click();
        const afterEntry = await page.evaluate(() => ({
          screen: window.__appRentalDemo.snapshot().screen,
          membershipOrder: window.__appRentalDemo.snapshot().membershipOrder,
        }));
        assert(afterEntry.screen === 'membership', `${orientation} ${status} 未进入统一会员中心`);
        assert(JSON.stringify(afterEntry.membershipOrder) === JSON.stringify(membershipOrderBefore), `${orientation} ${status} 入口不应直接创建会员订单`);
        membershipStatusChecks += 1;
      }
    }
    process.stdout.write(`MEMBER_STATUS ${membershipStatusChecks}/${membershipStatusChecks} PASS\n`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.navigate('membership');
      window.__appRentalDemo.createMembershipOrder();
      window.__appRentalDemo.setScenario('not-member-library');
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.selectRentalSku('hourly-8h');
      window.__appRentalDemo.navigate('checkout');
    });
    const checkoutReviewBefore = await page.evaluate(() => ({
      gameOrder: window.__appRentalDemo.snapshot().order,
      membershipOrder: window.__appRentalDemo.snapshot().membershipOrder,
    }));
    const readCheckoutReview = () => page.evaluate(() => {
      const originalRow = document.querySelector('.game-original-row');
      const label = originalRow?.querySelector('.price-label');
      const amount = originalRow?.querySelector('.game-original-amount');
      const total = document.querySelector('.checkout-row.total .order-total-amount');
      const labelStyle = label ? getComputedStyle(label) : null;
      const amountStyle = amount ? getComputedStyle(amount) : null;
      const totalStyle = total ? getComputedStyle(total) : null;
      const qr = document.querySelector('.game-payment-qr');
      const agreement = document.querySelector('.checkout-agreement');
      const policies = document.querySelector('.checkout-policy-list');
      return {
        qrPayment: qr?.dataset.payment,
        qrText: qr?.textContent.trim(),
        agreementText: `${agreement?.textContent.trim() || ''} ${policies?.textContent.trim() || ''}`,
        originalBeforeTotal: Boolean(originalRow?.nextElementSibling?.classList.contains('total')),
        labelColor: labelStyle?.color,
        amountColor: amountStyle?.color,
        amountDecoration: amountStyle?.textDecorationLine,
        amountAlign: amountStyle?.textAlign,
        totalAlign: totalStyle?.textAlign,
        totalColor: totalStyle?.color,
      };
    });
    const portraitCheckoutReview = await readCheckoutReview();
    assert(
      portraitCheckoutReview.qrPayment === 'alipay'
        && portraitCheckoutReview.qrText.includes('支付宝扫码支付')
        && portraitCheckoutReview.agreementText.includes('租号服务协议')
        && portraitCheckoutReview.agreementText.includes('退款规则')
        && portraitCheckoutReview.agreementText.includes('支付有效期'),
      '竖屏确认订单缺少支付宝二维码或协议区',
    );
    assert(
      portraitCheckoutReview.originalBeforeTotal
        && portraitCheckoutReview.labelColor === 'rgb(255, 255, 255)'
        && portraitCheckoutReview.amountColor === 'rgb(139, 141, 149)'
        && portraitCheckoutReview.amountDecoration === 'none'
        && portraitCheckoutReview.amountAlign === 'right'
        && portraitCheckoutReview.totalAlign === 'right'
        && portraitCheckoutReview.totalColor === 'rgb(255, 204, 67)',
      '竖屏原价与实付视觉层级错误',
    );
    await page.locator('.payment-method[data-payment="wechat"]').click();
    const portraitWechat = await readCheckoutReview();
    const checkoutAfterWechat = await page.evaluate(() => ({
      gameOrder: window.__appRentalDemo.snapshot().order,
      membershipOrder: window.__appRentalDemo.snapshot().membershipOrder,
    }));
    assert(portraitWechat.qrPayment === 'wechat' && portraitWechat.qrText.includes('微信扫码支付'), '竖屏微信支付二维码未同步');
    assert(
      checkoutAfterWechat.gameOrder.id === checkoutReviewBefore.gameOrder.id
        && checkoutAfterWechat.gameOrder.paymentDeadline === checkoutReviewBefore.gameOrder.paymentDeadline,
      '切换游戏支付方式破坏30分钟订单快照',
    );
    assert(checkoutAfterWechat.membershipOrder.id === checkoutReviewBefore.membershipOrder.id, '游戏支付切换覆盖会员订单');

    await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
    const landscapeCheckoutReview = await readCheckoutReview();
    assert(
      landscapeCheckoutReview.qrPayment === 'wechat'
        && landscapeCheckoutReview.qrText.includes('微信扫码支付')
        && landscapeCheckoutReview.agreementText.includes('租号服务协议')
        && landscapeCheckoutReview.agreementText.includes('退款规则')
        && landscapeCheckoutReview.agreementText.includes('支付有效期'),
      '横屏确认订单缺少同步二维码或协议区',
    );
    assert(
      landscapeCheckoutReview.originalBeforeTotal
        && landscapeCheckoutReview.labelColor === 'rgb(255, 255, 255)'
        && landscapeCheckoutReview.amountColor === 'rgb(139, 141, 149)'
        && landscapeCheckoutReview.amountDecoration === 'none'
        && landscapeCheckoutReview.amountAlign === 'right'
        && landscapeCheckoutReview.totalAlign === 'right'
        && landscapeCheckoutReview.totalColor === 'rgb(255, 204, 67)',
      '横屏原价与实付视觉层级错误',
    );
    await page.locator('.payment-method[data-payment="alipay"]').click();
    const landscapeAlipay = await readCheckoutReview();
    const checkoutAfterAlipay = await page.evaluate(() => ({
      gameOrder: window.__appRentalDemo.snapshot().order,
      membershipOrder: window.__appRentalDemo.snapshot().membershipOrder,
    }));
    assert(
      landscapeAlipay.qrPayment === 'alipay'
        && landscapeAlipay.qrText.includes('支付宝扫码支付')
        && checkoutAfterAlipay.gameOrder.id === checkoutReviewBefore.gameOrder.id
        && checkoutAfterAlipay.gameOrder.paymentDeadline === checkoutReviewBefore.gameOrder.paymentDeadline
        && checkoutAfterAlipay.membershipOrder.id === checkoutReviewBefore.membershipOrder.id,
      '横屏支付宝切换或订单隔离错误',
    );
    process.stdout.write('CHECKOUT_REVIEW 8/8 PASS\n');

    await page.evaluate(() => window.__appRentalDemo.navigate('membership'));
    const landscapeLibraryEntryHeight = await page.locator('.landscape-membership .membership-preview [data-screen="member-library"]').evaluate((node) => node.getBoundingClientRect().height);
    assert(landscapeLibraryEntryHeight >= 44, '横屏会员中心会员游戏库入口小于44px');
    process.stdout.write('MEMBERSHIP_ENTRY 1/1 PASS\n');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const negativeGuards = await page.evaluate(() => {
      let noOrderAllocation;
      let noOrderThrew = false;
      try {
        noOrderAllocation = window.__appRentalDemo.allocateAccount();
      } catch {
        noOrderThrew = true;
      }
      const noOrderState = window.__appRentalDemo.snapshot().order;

      const returnedOrder = window.__appRentalDemo.createOrder({
        sku: 'rent-2h',
        amount: 9.9,
        priceVersion: '2026-08-03-v1',
      });
      const pendingBypass = window.__appRentalDemo.allocateAccount(true);
      const pendingAfterBypass = window.__appRentalDemo.snapshot().order;
      const pendingOverride = window.__appRentalDemo.createOrder({
        sku: 'blocked-pending',
        amount: 99,
        priceVersion: 'blocked',
      });
      const pendingAfterOverride = window.__appRentalDemo.snapshot().order;

      returnedOrder.status = 'tampered';
      returnedOrder.sku = 'tampered';
      const orderAfterReturnMutation = window.__appRentalDemo.snapshot().order;

      window.__appRentalDemo.payOrder();
      const allocatingOverride = window.__appRentalDemo.createOrder({
        sku: 'blocked-allocating',
        amount: 99,
        priceVersion: 'blocked',
      });
      const allocatingAfterOverride = window.__appRentalDemo.snapshot().order;
      window.__appRentalDemo.allocateAccount(true);
      const activeReverse = window.__appRentalDemo.allocateAccount(false);
      const activeAfterReverse = window.__appRentalDemo.snapshot().order;
      const activeOverride = window.__appRentalDemo.createOrder({
        sku: 'blocked-active',
        amount: 99,
        priceVersion: 'blocked',
      });
      const activeAfterOverride = window.__appRentalDemo.snapshot().order;

      return {
        noOrderAllocation,
        noOrderThrew,
        noOrderState,
        pendingBypass,
        pendingAfterBypass,
        pendingOverride,
        pendingAfterOverride,
        orderAfterReturnMutation,
        allocatingOverride,
        allocatingAfterOverride,
        activeReverse,
        activeAfterReverse,
        activeOverride,
        activeAfterOverride,
      };
    });
    assert(
      !negativeGuards.noOrderThrew
        && negativeGuards.noOrderAllocation === false
        && negativeGuards.noOrderState === null,
      '无订单时分配应安全拒绝',
    );
    assert(
      negativeGuards.pendingBypass === false && negativeGuards.pendingAfterBypass.status === 'pending',
      'pending 订单不得绕过支付直接分配',
    );
    assert(
      negativeGuards.orderAfterReturnMutation.status === 'pending'
        && negativeGuards.orderAfterReturnMutation.sku === 'rent-2h',
      'createOrder 返回值不得泄露内部订单引用',
    );
    assert(
      negativeGuards.pendingOverride === null
        && negativeGuards.pendingAfterOverride.status === 'pending'
        && negativeGuards.allocatingOverride === null
        && negativeGuards.allocatingAfterOverride.status === 'allocating'
        && negativeGuards.activeOverride === null
        && negativeGuards.activeAfterOverride.status === 'active',
      '非终态订单不得被新订单覆盖',
    );
    assert(
      negativeGuards.activeReverse === false && negativeGuards.activeAfterReverse.status === 'active',
      'active 订单不得逆向迁移为 refunding',
    );

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const uniqueIds = await page.evaluate(() => {
      const originalNow = Date.now;
      Date.now = () => 1785715200000;
      try {
        const first = window.__appRentalDemo.createOrder({
          sku: 'rent-2h',
          amount: 9.9,
          priceVersion: '2026-08-03-v1',
        });
        window.__appRentalDemo.payOrder();
        window.__appRentalDemo.allocateAccount(false);
        const second = window.__appRentalDemo.createOrder({
          sku: 'rent-2h',
          amount: 9.9,
          priceVersion: '2026-08-03-v1',
        });
        return [first?.id, second?.id];
      } finally {
        Date.now = originalNow;
      }
    });
    assert(uniqueIds.every(Boolean) && uniqueIds[0] !== uniqueIds[1], '同毫秒订单号必须唯一');
    process.stdout.write('NEGATIVE 6/6 PASS\n');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const successfulTransaction = await page.evaluate(() => {
      const createdAt = Date.now();
      const created = window.__appRentalDemo.createOrder({
        sku: 'rent-2h',
        amount: 9.9,
        priceVersion: '2026-08-03-v1',
      });
      const pending = window.__appRentalDemo.snapshot().order;
      const firstPayment = window.__appRentalDemo.payOrder();
      const allocating = window.__appRentalDemo.snapshot().order.status;
      const duplicatePayment = window.__appRentalDemo.payOrder();
      window.__appRentalDemo.allocateAccount(true);
      const active = window.__appRentalDemo.snapshot().order.status;
      return {
        createdAt,
        created,
        pending,
        firstPayment,
        allocating,
        duplicatePayment,
        active,
      };
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const failedTransaction = await page.evaluate(() => {
      window.__appRentalDemo.createOrder({
        sku: 'rent-2h',
        amount: 9.9,
        priceVersion: '2026-08-03-v1',
      });
      window.__appRentalDemo.payOrder();
      window.__appRentalDemo.allocateAccount(false);
      return window.__appRentalDemo.snapshot().order.status;
    });

    assert(/^APP-\d+$/.test(successfulTransaction.created.id), '订单号格式错误');
    assert(successfulTransaction.pending.status === 'pending', '创建订单后应为 pending');
    assert(successfulTransaction.pending.sku === 'rent-2h', '订单 SKU 快照错误');
    assert(successfulTransaction.pending.amount === 9.9, '订单金额快照错误');
    assert(successfulTransaction.pending.priceVersion === '2026-08-03-v1', '价格版本快照错误');
    assert(
      successfulTransaction.pending.paymentDeadline - successfulTransaction.createdAt >= 30 * 60 * 1000,
      '支付截止时间不足 30 分钟',
    );
    assert(
      successfulTransaction.firstPayment === true && successfulTransaction.allocating === 'allocating',
      '支付状态迁移错误',
    );
    assert(successfulTransaction.duplicatePayment === false, '重复支付应被拒绝');
    assert(successfulTransaction.active === 'active', '分配成功后应为 active');
    assert(failedTransaction === 'refunding', '分配失败后应为 refunding');
    process.stdout.write('TRANSACTION 10/10 PASS\n');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const activeScenarioOverrides = [];
    for (const startingStatus of ['pending', 'allocating', 'active']) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => Boolean(window.__appRentalDemo));
      activeScenarioOverrides.push(await page.evaluate((status) => {
        window.__appRentalDemo.createOrder({ sku: `dynamic-${status}`, amount: 1, priceVersion: 'review-red' });
        if (status === 'allocating' || status === 'active') window.__appRentalDemo.payOrder();
        if (status === 'active') window.__appRentalDemo.allocateAccount(true);
        window.__appRentalDemo.setScenario('active-rental');
        const snapshot = window.__appRentalDemo.snapshot();
        return { id: snapshot.order?.id, status: snapshot.order?.status, allocationCount: snapshot.accountAllocationCount };
      }, startingStatus));
    }
    assert(
      activeScenarioOverrides.every(({ id, status, allocationCount }) => id === 'APP-SCENARIO-ACTIVE' && status === 'active' && allocationCount === 1),
      'active-rental 必须覆盖 pending/allocating/active 动态订单并确定性注入场景订单',
    );
    await page.evaluate(() => {
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('orders');
    });
    const portraitOrders = await page.evaluate(() => ({
      tabs: [...document.querySelectorAll('.order-tabs [role="tab"]')].map((node) => node.textContent.trim()),
      statuses: [...document.querySelectorAll('.order-list-card')].map((node) => node.dataset.status),
      list: Boolean(document.querySelector('.portrait-order-list')),
      detail: Boolean(document.querySelector('.portrait-order-detail')),
      layout: document.querySelector('.portrait-orders')?.dataset.layout,
      activeOrder: window.__appRentalDemo.snapshot().order,
    }));
    assert(portraitOrders.tabs.join('|') === '全部订单|待支付|可使用', '订单中心必须且只能显示全部订单、待支付、可使用三个 Tab');
    assert(portraitOrders.list && !portraitOrders.detail && portraitOrders.layout === 'portrait-orders', '竖屏订单中心应先显示单列列表并提供稳定布局标识');
    assert(portraitOrders.activeOrder?.status === 'active' && portraitOrders.activeOrder?.id === 'APP-SCENARIO-ACTIVE', 'active-rental 场景未确定性注入生效订单');
    assert(EXPECTED_RENTAL_STATUSES.every((status) => portraitOrders.statuses.includes(status)), '订单列表未覆盖六种租号订单状态');
    const orderActionMatrix = await page.evaluate(() => Object.fromEntries(
      window.__appRentalDemo.getOrderCollection().map((order) => [
        order.status,
        window.__appRentalDemo.getOrderActions(order).map(([, label]) => label),
      ]),
    ));
    const expectedOrderActionMatrix = {
      pending: ['取消订单', '继续支付'],
      allocating: ['刷新状态'],
      active: ['申请售后', '登录信息', '登录游戏'],
      refunding: ['退款进度'],
      refunded: ['退款进度', '继续畅玩', '删除订单'],
      ended: ['继续畅玩', '删除订单'],
    };
    assert(
      Object.entries(expectedOrderActionMatrix).every(([status, labels]) => orderActionMatrix[status]?.join('|') === labels.join('|')),
      `订单状态动作矩阵不完整：${JSON.stringify(orderActionMatrix)}`,
    );
    await page.locator('.portrait-order-list .order-list-card[data-status="active"]').click();
    const portraitOrderDetail = await page.evaluate(() => ({
      screen: window.__appRentalDemo.snapshot().screen,
      detail: Boolean(document.querySelector('.portrait-order-detail')),
      steps: document.querySelectorAll('.order-progress [data-progress-step]').length,
      actions: [...document.querySelectorAll('.order-detail-actions-dock .order-actions-set button')].map((node) => node.textContent.trim()),
    }));
    assert(portraitOrderDetail.screen === 'order-detail' && portraitOrderDetail.detail, '竖屏订单列表未进入独立订单详情');
    assert(portraitOrderDetail.steps === 4, '订单详情必须固定显示四步进度');
    assert(portraitOrderDetail.actions.join('|') === '申请售后|登录信息|登录游戏', `生效订单操作映射错误：${JSON.stringify(portraitOrderDetail.actions)}`);

    await page.evaluate(() => {
      window.__appRentalDemo.navigate('orders');
      window.__appRentalDemo.setOrientation('landscape');
    });
    const landscapeOrders = await page.evaluate(() => ({
      screen: window.__appRentalDemo.snapshot().screen,
      list: Boolean(document.querySelector('.landscape-orders .landscape-order-list, .landscape-orders .order-list-pane')),
      detail: Boolean(document.querySelector('.landscape-order-detail, [data-layout="landscape-order-detail"], .landscape-orders .order-detail-pane')),
      tabs: [...document.querySelectorAll('.order-tabs [role="tab"]')].map((node) => node.textContent.trim()),
    }));
    assert(landscapeOrders.screen === 'orders' && landscapeOrders.list && !landscapeOrders.detail, '横屏订单中心必须为独立列表页且不得预渲染详情');
    assert(landscapeOrders.tabs.join('|') === '全部订单|待支付|可使用', '横屏订单 Tab 不一致');
    await page.locator('.landscape-orders .order-list-card[data-status="active"]').first().click();
    const landscapeOrderDetail = await page.evaluate(() => ({
      screen: window.__appRentalDemo.snapshot().screen,
      list: Boolean(document.querySelector('.landscape-order-list, .order-list-pane')),
      detail: Boolean(document.querySelector('.landscape-order-detail, [data-layout="landscape-order-detail"], .order-detail-pane')),
      steps: document.querySelectorAll('.order-progress [data-progress-step]').length,
      actions: [...document.querySelectorAll('.landscape-order-detail-dock .order-actions-set button')].map((node) => node.textContent.trim()),
    }));
    assert(
      landscapeOrderDetail.screen === 'order-detail' && !landscapeOrderDetail.list && landscapeOrderDetail.detail,
      '横屏订单卡片未进入独立订单详情页',
    );
    assert(landscapeOrderDetail.steps === 4 && landscapeOrderDetail.actions.join('|') === '申请售后|登录信息|登录游戏', `横屏独立订单详情操作不完整：${JSON.stringify(landscapeOrderDetail.actions)}`);
    await page.evaluate(() => window.__appRentalDemo.navigate('orders', { replaceTask: true }));
    await page.locator('.order-tabs [data-value="pending"]').click();
    await page.evaluate(() => window.__appRentalDemo.setOrientation('portrait'));
    const rotatedOrderTab = await page.evaluate(() => ({
      tab: window.__appRentalDemo.snapshot().orderTab,
      activeTab: document.querySelector('.order-tabs [aria-selected="true"]')?.textContent.trim(),
      statuses: [...document.querySelectorAll('.order-list-card')].map((node) => node.dataset.status),
    }));
    assert(rotatedOrderTab.tab === 'pending' && rotatedOrderTab.activeTab === '待支付' && rotatedOrderTab.statuses.every((status) => status === 'pending'), '旋转后订单 Tab 或筛选结果未保留');
    await page.locator('.order-tabs [data-value="all"]').click();
    const deleteRaceOrderId = await page.evaluate(() => {
      window.__appRentalDemo.setScenario('not-member-library');
      window.__appRentalDemo.setSelectedGame('shadow-blade-zero');
      const created = window.__appRentalDemo.createOrder({ sku: 'delete-race', amount: 9.9, priceVersion: 'delete-race-v1' });
      window.__appRentalDemo.payOrder();
      window.__appRentalDemo.allocateAccount(true);
      window.__appRentalDemo.endOrder();
      window.__appRentalDemo.navigate('orders', { replaceTask: true });
      window.__appRentalDemo.selectOrder(created.id);
      return created.id;
    });
    await page.getByRole('button', { name: '删除订单', exact: true }).click();
    assert(await page.locator('.delete-order-dialog').isVisible(), '终态订单删除前缺少二次确认');
    await page.evaluate(() => window.__appRentalDemo.setCurrentOrderStatus('refunding'));
    await page.locator('.delete-order-dialog [data-action="confirm-delete-order"]').click();
    const deleteRaceResult = await page.evaluate((orderId) => {
      const snapshot = window.__appRentalDemo.snapshot();
      return {
        status: snapshot.order?.status,
        hidden: snapshot.hiddenOrderIds.includes(orderId),
        dialogOpen: snapshot.confirmDeleteOrderId,
      };
    }, deleteRaceOrderId);
    assert(deleteRaceResult.status === 'refunding' && !deleteRaceResult.hidden && !deleteRaceResult.dialogOpen, `退款中订单必须在确认时重新校验并禁止删除：${JSON.stringify(deleteRaceResult)}`);
    process.stdout.write('ORDERS 15/15 PASS\n');

    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('orders');
    });
    await page.locator('.order-list-card[data-status="active"]').click();
    await page.getByRole('button', { name: '登录游戏', exact: true }).click();
    const loginMethod = await page.evaluate(() => ({
      open: Boolean(document.querySelector('.login-method-dialog')),
      primary: document.querySelector('.login-method-dialog [data-primary-action="true"]')?.textContent.trim(),
      manual: Boolean(document.querySelector('.login-method-dialog [data-action="open-manual-login"]')),
    }));
    assert(loginMethod.open && loginMethod.primary === '一键上号' && loginMethod.manual, '登录游戏未打开以一键上号为主的登录方式选择');
    await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
    assert((await page.locator('.login-method-dialog').count()) === 1, '旋转后登录方式选择未保持打开');
    await page.evaluate(() => window.__appRentalDemo.setOrientation('portrait'));
    await page.getByRole('button', { name: '一键上号', exact: true }).click();
    const oneClickFailure = await page.evaluate(() => ({
      retry: Boolean(document.querySelector('[data-action="start-one-click"]')),
      manual: Boolean(document.querySelector('[data-action="open-manual-login"]')),
      text: document.querySelector('.login-method-dialog')?.textContent || '',
    }));
    assert(oneClickFailure.text.includes('一键上号失败') && oneClickFailure.retry && oneClickFailure.manual, '一键上号失败后必须可重试或切换手动登录');
    await page.locator('.login-method-dialog [data-action="open-manual-login"]').click();
    const steamPortrait = await page.evaluate(() => ({
      screen: window.__appRentalDemo.snapshot().screen,
      form: Boolean(document.querySelector('.steam-login-form')),
      qr: Boolean(document.querySelector('.steam-qr-panel')),
      layout: document.querySelector('.steam-login-page')?.dataset.layout,
      helpBeforeClose: Boolean(document.querySelector('.steam-help-trigger')?.nextElementSibling?.classList.contains('steam-close')),
    }));
    assert(steamPortrait.screen === 'steam-login' && steamPortrait.form && steamPortrait.qr && steamPortrait.layout === 'portrait-steam-login', '竖屏 Steam 手动登录页缺失或未纵向重排');
    assert(steamPortrait.helpBeforeClose, 'Steam 顶栏“租号登录信息”必须位于关闭按钮左侧');

    await page.locator('#steam-account').fill('player@example.com');
    await page.locator('#steam-password').fill('not-a-real-password');
    await page.locator('#steam-remember').uncheck();
    await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
    const steamLandscape = await page.evaluate(() => ({
      layout: document.querySelector('.steam-login-page')?.dataset.layout,
      columns: getComputedStyle(document.querySelector('.steam-login-body')).gridTemplateColumns.split(' ').length,
      account: document.querySelector('#steam-account')?.value,
      password: document.querySelector('#steam-password')?.value,
      remember: document.querySelector('#steam-remember')?.checked,
    }));
    assert(steamLandscape.layout === 'landscape-steam-login' && steamLandscape.columns === 2, '横屏 Steam 登录必须为账号密码与二维码双栏');
    assert(steamLandscape.account === 'player@example.com' && steamLandscape.password === 'not-a-real-password' && !steamLandscape.remember, '旋转后 Steam 表单与记住我状态未保留');
    process.stdout.write('LOGIN 8/8 PASS\n');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('orders');
    });
    const initialSecurity = await page.evaluate(() => ({
      html: document.querySelector('#appRentalDemo').innerHTML,
      snapshot: JSON.stringify(window.__appRentalDemo.snapshot()),
    }));
    assert(!initialSecurity.html.includes('gh_rental_2607') && !initialSecurity.html.includes('G@meHub#8291'), '默认 DOM 泄露租号凭据');
    assert(!initialSecurity.snapshot.includes('gh_rental_2607') && !initialSecurity.snapshot.includes('G@meHub#8291'), '公开 snapshot 泄露租号凭据');
    await page.locator('.order-list-card[data-status="active"]').click();
    await page.getByRole('button', { name: '登录信息', exact: true }).click();
    const portraitCredential = await page.evaluate(() => ({
      sheet: Boolean(document.querySelector('.credential-panel--portrait')),
      closeButtons: document.querySelectorAll('.credential-panel button[data-action="close-credential"]').length,
      footerButtons: document.querySelectorAll('.credential-panel .dialog-footer button').length,
      accountMasked: document.querySelector('[data-credential-field="account"]')?.textContent.trim(),
      passwordMasked: document.querySelector('[data-credential-field="password"]')?.textContent.trim(),
    }));
    assert(portraitCredential.sheet && portraitCredential.closeButtons === 1 && portraitCredential.footerButtons === 0, '竖屏登录信息必须为仅带右上角 X 的底部面板');
    assert(portraitCredential.accountMasked.includes('****') && /^•+$/.test(portraitCredential.passwordMasked), '登录信息默认遮罩不符合要求');
    await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
    assert((await page.locator('.credential-panel--landscape').count()) === 1, '旋转后登录信息面板未保持打开或未切换为居中小窗');
    await page.evaluate(() => window.__appRentalDemo.setOrientation('portrait'));
    await page.locator('[data-action="toggle-credential"][data-field="account"]').click();
    assert((await page.locator('[data-credential-field="account"]').innerText()) === 'gh_rental_2607', '账号查看/隐藏不可用');
    await page.locator('[data-action="copy-credential"][data-field="account"]').click();
    const toastText = await page.locator('.demo-toast').innerText();
    assert(toastText.includes('已复制') && !toastText.includes('gh_rental_2607'), '复制 Toast 不得包含真实凭据');
    await page.keyboard.press('Escape');
    assert((await page.locator('.credential-panel').count()) === 0, 'Esc 未关闭登录信息面板');
    await page.getByRole('button', { name: '登录信息', exact: true }).click();
    await page.locator('.modal-backdrop').evaluate((node) => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    assert((await page.locator('.credential-panel').count()) === 0, '点击遮罩未关闭登录信息面板');
    await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
    await page.getByRole('button', { name: '登录信息', exact: true }).click();
    const landscapeCredential = await page.evaluate(() => ({
      count: document.querySelectorAll('.credential-panel--landscape').length,
      width: document.querySelector('.credential-panel--landscape')?.getBoundingClientRect().width || 0,
      thirdPartyTitle: document.querySelector('.credential-panel--landscape [data-third-party-platform]')?.textContent.trim() || '',
      guardRatio: (() => {
        const panel = document.querySelector('.credential-panel--landscape');
        const guard = panel?.querySelector('.credential-guard');
        if (!panel || !guard) return 0;
        const style = getComputedStyle(panel);
        const usableWidth = panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        return guard.getBoundingClientRect().width / usableWidth;
      })(),
      thirdPartyCodeRatio: (() => {
        const panel = document.querySelector('.credential-panel--landscape');
        const code = panel?.querySelector('.third-party-code');
        if (!panel || !code) return 0;
        const style = getComputedStyle(panel);
        const usableWidth = panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        return code.getBoundingClientRect().width / usableWidth;
      })(),
    }));
    assert(
      landscapeCredential.count === 1
        && landscapeCredential.width >= 680
        && landscapeCredential.guardRatio >= 0.45 && landscapeCredential.guardRatio <= 0.52
        && landscapeCredential.thirdPartyCodeRatio >= 0.45 && landscapeCredential.thirdPartyCodeRatio <= 0.52
        && landscapeCredential.thirdPartyTitle.includes('Rockstar Games 登录'),
      `横屏登录信息弹窗宽度或第三方平台信息不完整：${JSON.stringify(landscapeCredential)}`,
    );
    process.stdout.write('CREDENTIAL 10/10 PASS\n');

    await page.locator('button[data-action="close-credential"]').click();
    await page.getByRole('button', { name: '登录游戏', exact: true }).click();
    await page.locator('.login-method-dialog [data-action="open-manual-login"]').click();
    assert((await page.locator('[data-action="request-guard"]').isDisabled()), '提交账号密码前不得获取 Guard');
    await page.locator('#steam-account').fill('player@example.com');
    await page.locator('#steam-password').fill('not-a-real-password');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    const afterSubmit = await page.evaluate(() => ({
      requiresGuard: document.querySelector('.steam-guard')?.textContent.includes('Steam 令牌'),
      enabled: !document.querySelector('[data-action="request-guard"]')?.disabled,
      snapshot: JSON.stringify(window.__appRentalDemo.snapshot()),
    }));
    assert(afterSubmit.requiresGuard && afterSubmit.enabled, 'Steam 未在提交账号密码后明确要求验证');
    assert(!afterSubmit.snapshot.includes('not-a-real-password'), '公开 snapshot 泄露 Steam 表单密码');
    await page.getByRole('button', { name: '获取验证码', exact: true }).click();
    const firstGuard = await page.evaluate(() => ({
      code: document.querySelector('[data-guard-code]')?.textContent.trim(),
      remaining: Number(document.querySelector('[data-guard-remaining]')?.dataset.guardRemaining),
      allocationCount: window.__appRentalDemo.snapshot().accountAllocationCount,
      snapshot: JSON.stringify(window.__appRentalDemo.snapshot()),
    }));
    assert(firstGuard.code === '48291' && firstGuard.remaining > 0 && firstGuard.remaining <= 30, 'Guard 必须返回固定 5 位验证码并按 30 秒倒计时');
    assert(!firstGuard.snapshot.includes('48291'), '公开 snapshot 泄露 Guard 验证码');
    assert(
      (await page.locator('.steam-guard [data-action="copy-guard"]').count()) === 1
        && (await page.locator('.steam-guard [data-action="refresh-guard"]').count()) === 1,
      'Guard 生效后必须提供复制验证码与刷新验证码',
    );
    await page.locator('.steam-guard [data-action="copy-guard"]').click();
    const guardCopyToast = await page.locator('.demo-toast').innerText();
    assert(guardCopyToast.includes('验证码已复制') && !guardCopyToast.includes('48291'), '复制 Guard 的 Toast 不得泄露验证码');
    const beforeLiveRefresh = await page.evaluate(() => ({
      expiresAt: window.__appRentalDemo.snapshot().guardExpiresAt,
      allocationCount: window.__appRentalDemo.snapshot().accountAllocationCount,
    }));
    await page.waitForTimeout(20);
    await page.locator('.steam-guard [data-action="refresh-guard"]').click();
    const afterLiveRefresh = await page.evaluate(() => ({
      expiresAt: window.__appRentalDemo.snapshot().guardExpiresAt,
      allocationCount: window.__appRentalDemo.snapshot().accountAllocationCount,
      code: document.querySelector('.steam-guard [data-guard-code]')?.textContent.trim(),
    }));
    assert(
      afterLiveRefresh.code === '48291'
        && afterLiveRefresh.expiresAt > beforeLiveRefresh.expiresAt
        && afterLiveRefresh.allocationCount === beforeLiveRefresh.allocationCount,
      '点击刷新验证码必须只刷新验证码生命周期，不得重复取号',
    );
    await page.locator('.steam-help-trigger').click();
    const steamHelp = await page.evaluate(() => ({
      sheet: Boolean(document.querySelector('.steam-login-page > .steam-credential-sheet')),
      formVisible: Boolean(document.querySelector('.steam-login-form')),
      code: document.querySelector('.steam-credential-sheet [data-guard-code]')?.textContent.trim(),
      title: document.querySelector('.steam-credential-sheet [data-third-party-platform]')?.textContent.trim(),
      guardRatio: (() => {
        const content = document.querySelector('.steam-credential-sheet .credential-content')?.getBoundingClientRect();
        const guard = document.querySelector('.steam-credential-sheet .credential-guard')?.getBoundingClientRect();
        return content && guard ? guard.width / content.width : 0;
      })(),
      thirdPartyCodeRatio: (() => {
        const content = document.querySelector('.steam-credential-sheet .credential-content')?.getBoundingClientRect();
        const code = document.querySelector('.steam-credential-sheet .third-party-code')?.getBoundingClientRect();
        return content && code ? code.width / content.width : 0;
      })(),
      bounds: (() => {
        const pageNode = document.querySelector('.steam-login-page');
        const sheetNode = document.querySelector('.steam-credential-sheet');
        if (!pageNode || !sheetNode) return null;
        const pageRect = pageNode.getBoundingClientRect();
        const sheetRect = sheetNode.getBoundingClientRect();
        return { pageLeft: pageRect.left, pageRight: pageRect.right, sheetLeft: sheetRect.left, sheetRight: sheetRect.right };
      })(),
    }));
    assert(
      steamHelp.sheet && steamHelp.formVisible && steamHelp.code === '48291'
        && steamHelp.title?.includes('Rockstar Games 登录')
        && Math.abs(steamHelp.bounds.sheetLeft - steamHelp.bounds.pageLeft) <= 1
        && Math.abs(steamHelp.bounds.sheetRight - steamHelp.bounds.pageRight) <= 1
        && steamHelp.guardRatio >= 0.45 && steamHelp.guardRatio <= 0.52
        && steamHelp.thirdPartyCodeRatio >= 0.45 && steamHelp.thirdPartyCodeRatio <= 0.52
        && (await page.locator('.steam-credential-sheet [data-action="copy-guard"]').count()) === 1
        && (await page.locator('.steam-credential-sheet [data-action="refresh-guard"]').count()) === 1,
      'Steam 登录信息必须使用完整内容宽度、复用同一码并展示具体第三方平台',
    );
    await page.locator('.steam-credential-sheet [data-action="request-third-party-code"]').click();
    const thirdPartyCodeState = await page.evaluate(() => ({
      code: document.querySelector('.steam-credential-sheet [data-third-party-code]')?.textContent.trim(),
      remaining: Number(document.querySelector('.steam-credential-sheet [data-third-party-code-remaining]')?.dataset.thirdPartyCodeRemaining),
      refreshDisabled: Boolean(document.querySelector('.steam-credential-sheet [data-action="refresh-third-party-code"]')?.disabled),
      snapshot: JSON.stringify(window.__appRentalDemo.snapshot()),
    }));
    assert(
      thirdPartyCodeState.code === '739204'
        && thirdPartyCodeState.remaining > 0
        && thirdPartyCodeState.refreshDisabled
        && !thirdPartyCodeState.snapshot.includes('739204'),
      `第三方验证码生命周期或公开快照脱敏错误：${JSON.stringify(thirdPartyCodeState)}`,
    );
    await page.locator('.steam-credential-sheet [data-action="close-steam-help"]').click();
    const staleThirdPartyCode = await page.evaluate(() => window.__appRentalDemo.expireThirdPartyCode());
    assert(
      (await page.locator('.steam-login-form').count()) === 1
        && (await page.locator('.steam-credential-sheet').count()) === 0
        && staleThirdPartyCode === false,
      '关闭 Steam 登录信息后未保留登录表单或未清除第三方验证码',
    );
    await page.evaluate(() => window.__appRentalDemo.setOrientation('portrait'));
    const rotatedGuard = await page.evaluate(() => ({
      account: document.querySelector('#steam-account')?.value,
      code: document.querySelector('[data-guard-code]')?.textContent.trim(),
      remember: document.querySelector('#steam-remember')?.checked,
    }));
    assert(rotatedGuard.account === 'player@example.com' && rotatedGuard.code === '48291' && rotatedGuard.remember, '旋转后 Steam 表单或 Guard 未连续保留');
    await page.evaluate(() => window.__appRentalDemo.openCredentialPanel());
    assert(
      (await page.locator('.credential-panel [data-guard-code]').innerText()) === '48291'
        && (await page.locator('.credential-panel [data-action="copy-guard"]').count()) === 1
        && (await page.locator('.credential-panel [data-action="refresh-guard"]').count()) === 1,
      '订单登录信息面板未复用 Guard 或缺少复制/刷新操作',
    );
    const expiredGuard = await page.evaluate(() => {
      const before = window.__appRentalDemo.snapshot().accountAllocationCount;
      window.__appRentalDemo.expireGuardCode();
      return {
        before,
        hasCodeClass: document.querySelector('.credential-guard')?.classList.contains('has-code'),
        refreshVisible: Boolean(document.querySelector('.credential-panel [data-action="refresh-guard"]')?.getClientRects().length),
      };
    });
    assert(!expiredGuard.hasCodeClass && expiredGuard.refreshVisible, 'Guard 过期后必须重新渲染为可点击刷新状态');
    await page.locator('.credential-panel [data-action="refresh-guard"]').click();
    const guardRefresh = await page.evaluate(() => ({
      after: window.__appRentalDemo.snapshot().accountAllocationCount,
      code: document.querySelector('.credential-panel [data-guard-code]')?.textContent.trim(),
    }));
    assert(guardRefresh.code === '48291' && expiredGuard.before === guardRefresh.after, 'Guard 过期后必须可通过 UI 刷新且不得重复取号');
    const forbiddenCopy = await page.locator('body').innerText();
    assert(!forbiddenCopy.includes('操作过于频繁，30秒再试'), '页面出现禁用的频繁操作文案');
    const cleanup = await page.evaluate(() => {
      window.__appRentalDemo.clearSensitiveState('background');
      return window.__appRentalDemo.snapshot();
    });
    assert(cleanup.guardCode === null && cleanup.steamForm.password === '', '退后台清理接口未清除敏感状态');
    process.stdout.write('GUARD_SECURITY 16/16 PASS\n');

    async function readTouchTargets(selector) {
      return page.locator(selector).evaluateAll((nodes) => nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { label: node.getAttribute('aria-label') || node.textContent.trim(), width: rect.width, height: rect.height };
      }));
    }
    function assertTouchTargets(targets, label) {
      const undersized = targets.filter(({ width, height }) => width < 44 || height < 44);
      assert(targets.length > 0 && undersized.length === 0, `${label} 存在小于44×44的触控：${JSON.stringify(undersized)}`);
    }

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('orders');
    });
    assertTouchTargets(await readTouchTargets('.order-tabs button'), '竖屏订单 Tab');
    await page.locator('.order-list-card[data-status="active"]').click();
    await page.getByRole('button', { name: '登录信息', exact: true }).click();
    assertTouchTargets(await readTouchTargets('.credential-panel .credential-field button, .credential-panel .dialog-close'), '竖屏凭据操作');
    await page.locator('button[data-action="close-credential"]').click();
    await page.evaluate(() => {
      window.__appRentalDemo.navigate('orders');
      window.__appRentalDemo.setOrientation('landscape');
    });
    assertTouchTargets(await readTouchTargets('.order-tabs button'), '横屏订单 Tab');
    await page.locator('.landscape-orders .order-list-card[data-status="active"]').first().click();
    assertTouchTargets(await readTouchTargets('.landscape-order-detail-dock .order-actions-set button'), '横屏订单详情操作');
    await page.getByRole('button', { name: '登录游戏', exact: true }).click();
    await page.locator('.login-method-dialog [data-action="open-manual-login"]').click();
    await page.locator('#steam-account').fill('touch-test');
    await page.locator('#steam-password').fill('safe-test-value');
    await page.locator('[data-action="submit-steam-login"]').click();
    await page.locator('[data-action="request-guard"]').click();
    await page.locator('.steam-help-trigger').click();
    assertTouchTargets(
      await readTouchTargets('.steam-login-submit, .steam-guard button, .steam-credential-sheet .dialog-close, .steam-credential-sheet .credential-field button, .steam-credential-sheet .credential-guard button, .steam-credential-sheet .third-party-code button'),
      'Steam 与 Guard 操作',
    );
    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('home');
    });
    assertTouchTargets(await readTouchTargets('.device-link'), '连接设备');
    process.stdout.write('TOUCH_TARGETS 6/6 PASS\n');

    const sourceAssetNames = [
      'portrait-home.jpg',
      'portrait-play.jpg',
      'portrait-library.jpg',
      'portrait-profile.jpg',
      'landscape-library.jpg',
      'landscape-steam-library.jpg',
      'landscape-play.jpg',
    ];
    const sourceAssetDir = path.join(root, 'demos', 'APP租号功能', 'assets', 'source');
    assert(sourceAssetNames.every((name) => fs.existsSync(path.join(sourceAssetDir, name))), '独立构建缺少仓库内7张源 JPG');
    const buildSource = fs.readFileSync(path.join(root, 'tools', 'build-app-rental-demo.mjs'), 'utf8');
    assert(buildSource.includes("'assets', 'source'") && !buildSource.includes("'APP核心优化'"), '构建脚本仍依赖工作区外部参考图路径');
    process.stdout.write('BUILD_SOURCE 2/2 PASS\n');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.setScenario('not-member-library');
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.selectRentalSku('hourly-8h');
      window.__appRentalDemo.navigate('checkout');
    });
    await page.locator('.payment-method[data-payment="wechat"]').click();
    const checkoutContinuityBefore = await page.evaluate(() => window.__appRentalDemo.snapshot());
    await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
    const checkoutContinuityAfter = await page.evaluate(() => window.__appRentalDemo.snapshot());
    assert(
      checkoutContinuityAfter.screen === checkoutContinuityBefore.screen
        && checkoutContinuityAfter.selectedGameId === checkoutContinuityBefore.selectedGameId
        && checkoutContinuityAfter.selectedSku === checkoutContinuityBefore.selectedSku
        && checkoutContinuityAfter.selectedHours === checkoutContinuityBefore.selectedHours
        && checkoutContinuityAfter.selectedPlatform === checkoutContinuityBefore.selectedPlatform
        && checkoutContinuityAfter.selectedEditionId === checkoutContinuityBefore.selectedEditionId
        && checkoutContinuityAfter.selectedPayment === checkoutContinuityBefore.selectedPayment
        && JSON.stringify(checkoutContinuityAfter.order) === JSON.stringify(checkoutContinuityBefore.order),
      '旋转后详情、SKU、版本、时长、支付方式或订单快照丢失',
    );
    assert(checkoutContinuityAfter.accountAllocationCount === checkoutContinuityBefore.accountAllocationCount, '旋转不得重复取号');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('orders');
    });
    await page.locator('.order-list-card[data-status="active"]').click();
    await page.getByRole('button', { name: '登录游戏', exact: true }).click();
    await page.locator('[data-action="open-manual-login"]').click();
    await page.locator('#steam-account').fill('continuity-user');
    await page.locator('#steam-password').fill('continuity-secret');
    await page.locator('#steam-remember').uncheck();
    await page.locator('[data-action="submit-steam-login"]').click();
    await page.locator('[data-action="request-guard"]').click();
    await page.locator('.steam-help-trigger').click();
    const steamContinuityBefore = await page.evaluate(() => window.__appRentalDemo.snapshot());
    await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
    const steamContinuityAfter = await page.evaluate(() => ({
      snapshot: window.__appRentalDemo.snapshot(),
      account: document.querySelector('#steam-account')?.value,
      password: document.querySelector('#steam-password')?.value,
      remember: document.querySelector('#steam-remember')?.checked,
      help: Boolean(document.querySelector('.steam-credential-sheet')),
      code: document.querySelector('[data-guard-code]')?.textContent.trim(),
    }));
    assert(
      steamContinuityAfter.snapshot.screen === 'steam-login'
        && steamContinuityAfter.account === 'continuity-user'
        && steamContinuityAfter.password === 'continuity-secret'
        && !steamContinuityAfter.remember
        && steamContinuityAfter.help
        && steamContinuityAfter.code === '48291',
      '旋转后 Steam 表单、记住我、全宽登录信息或 Guard 丢失',
    );
    assert(
      steamContinuityAfter.snapshot.guardExpiresAt === steamContinuityBefore.guardExpiresAt
        && steamContinuityAfter.snapshot.accountAllocationCount === steamContinuityBefore.accountAllocationCount,
      '旋转不得重复取码或改变 Guard 失效时间',
    );
    process.stdout.write('CONTINUITY 4/4 PASS\n');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.setOrientation('landscape');
      window.__appRentalDemo.navigate('orders');
      window.__appRentalDemo.setGameplayContext(false);
      window.__appRentalDemo.triggerExpiryMinutes(15);
    });
    const expiryFirst = await page.evaluate(() => ({
      text: document.querySelector('.expiry-reminder')?.textContent || '',
      context: document.querySelector('.expiry-reminder')?.dataset.context,
      backdrop: Boolean(document.querySelector('.expiry-reminder .modal-backdrop')),
      expireAt: window.__appRentalDemo.snapshot().rentalUsage?.expireAt,
      reminderCount: window.__appRentalDemo.snapshot().expiryReminderCount,
    }));
    assert(expiryFirst.text.includes('租用时间快结束了，是否继续畅玩？') && expiryFirst.context === 'outside-game', '15分钟提醒文案或游戏外位置错误');
    assert(!expiryFirst.backdrop, '临期提醒不得使用全屏遮罩');
    await page.evaluate(() => window.__appRentalDemo.setOrientation('portrait'));
    assert((await page.locator('.expiry-reminder').count()) === 1, '旋转后临期提醒未保持');
    await page.getByRole('button', { name: '关闭提醒', exact: true }).click();
    await page.evaluate(() => {
      window.__appRentalDemo.triggerExpiryMinutes(5);
      window.__appRentalDemo.triggerExpiryMinutes(1);
      window.__appRentalDemo.clearSensitiveState('background');
      window.__appRentalDemo.triggerExpiryMinutes(14);
    });
    const expiryNoRepeat = await page.evaluate(() => ({
      open: Boolean(document.querySelector('.expiry-reminder')),
      count: window.__appRentalDemo.snapshot().expiryReminderCount,
    }));
    assert(!expiryNoRepeat.open && expiryNoRepeat.count === 1, '同一使用单在关闭、5/1分钟、前后台后不得重复提醒');
    assert(
      !/expiry(?:5|1)|(?:minutes|remaining)\s*={2,3}\s*(?:5|1)\b|case\s+(?:5|1)\s*:/.test(fs.readFileSync(templatePath, 'utf8')),
      '源码存在5分钟或1分钟提醒字段/正向分支',
    );

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.setGameplayContext(true);
      window.__appRentalDemo.triggerExpiryMinutes(15);
    });
    const inGameExpiry = await page.evaluate(() => ({
      context: document.querySelector('.expiry-reminder')?.dataset.context,
      expireAt: window.__appRentalDemo.snapshot().rentalUsage?.expireAt,
      geometry: (() => {
        const reminder = document.querySelector('.expiry-reminder').getBoundingClientRect();
        const status = document.querySelector('.mobile-status').getBoundingClientRect();
        const device = document.querySelector('.device').getBoundingClientRect();
        const critical = document.querySelector('.device-link')?.getBoundingClientRect();
        const criticalClear = !critical || reminder.bottom <= critical.top || reminder.top >= critical.bottom || reminder.right <= critical.left || reminder.left >= critical.right;
        return { gap: reminder.top - status.bottom, inside: reminder.top >= device.top && reminder.bottom <= device.bottom && reminder.left >= device.left && reminder.right <= device.right, criticalClear };
      })(),
    }));
    assert(inGameExpiry.context === 'in-game', '游戏内提醒未位于顶部安全区');
    assert(inGameExpiry.geometry.gap >= 8 && inGameExpiry.geometry.inside && inGameExpiry.geometry.criticalClear, `竖屏游戏内提醒未完整位于状态栏安全区下方或遮挡关键触控：${JSON.stringify(inGameExpiry.geometry)}`);
    await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
    const landscapeInGameGeometry = await page.evaluate(() => {
      const reminder = document.querySelector('.expiry-reminder').getBoundingClientRect();
      const device = document.querySelector('.device').getBoundingClientRect();
      const system = document.querySelector('.landscape-system')?.getBoundingClientRect();
      const safeBottom = system?.bottom || device.top + 24;
      return { gap: reminder.top - safeBottom, inside: reminder.top >= device.top && reminder.bottom <= device.bottom && reminder.left >= device.left && reminder.right <= device.right };
    });
    assert(landscapeInGameGeometry.gap >= 8 && landscapeInGameGeometry.inside, `横屏游戏内提醒未完整位于顶部安全区下方：${JSON.stringify(landscapeInGameGeometry)}`);
    await page.getByRole('button', { name: '继续畅玩', exact: true }).click();
    const expiryContinue = await page.evaluate(() => ({
      screen: window.__appRentalDemo.snapshot().screen,
      expireAt: window.__appRentalDemo.snapshot().rentalUsage?.expireAt,
      open: Boolean(document.querySelector('.expiry-reminder')),
    }));
    assert(expiryContinue.screen === 'detail' && expiryContinue.expireAt === inGameExpiry.expireAt && !expiryContinue.open, '继续畅玩应进入最新权益且不得直接延时');
    process.stdout.write('EXPIRY 9/9 PASS\n');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('orders');
    });
    await page.locator('.order-list-card[data-status="active"]').click();
    await page.getByRole('button', { name: '登录游戏', exact: true }).click();
    await page.locator('[data-action="open-manual-login"]').click();
    await page.locator('#steam-account').fill('t0-user');
    await page.locator('#steam-password').fill('t0-secret');
    await page.locator('[data-action="submit-steam-login"]').click();
    await page.locator('[data-action="request-guard"]').click();
    await page.locator('.steam-help-trigger').click();
    await page.evaluate(() => window.__appRentalDemo.triggerExpiryMinutes(0));
    const t0 = await page.evaluate(() => ({
      snapshot: window.__appRentalDemo.snapshot(),
      dialog: document.querySelector('.rental-ended-dialog')?.textContent || '',
    }));
    assert(t0.snapshot.order.status === 'ended' && !t0.snapshot.rentalUsage.sessionActive, 'T0 未立即结束订单和游戏会话');
    assert(
      t0.snapshot.rentalUsage.accountReleased
        && !t0.snapshot.rentalUsage.shortAuthValid
        && t0.snapshot.guardCode === null
        && t0.snapshot.steamForm.account === ''
        && t0.snapshot.steamForm.password === ''
        && !t0.snapshot.credentialPanelOpen
        && !t0.snapshot.steamHelpOpen,
      'T0 未释放账号、撤销授权或清理敏感信息',
    );
    assert(t0.dialog.includes('租用已结束') && t0.dialog.includes('继续畅玩') && t0.dialog.includes('立即结束'), 'T0 缺少租用结束恢复弹窗');
    const t0Counts = await page.evaluate(() => {
      const before = window.__appRentalDemo.snapshot().rentalUsage;
      window.__appRentalDemo.triggerExpiryMinutes(0);
      const after = window.__appRentalDemo.snapshot().rentalUsage;
      return { before, after };
    });
    assert(t0Counts.after.expiryExecutionCount === 1 && t0Counts.after.accountReleaseCount === 1 && JSON.stringify(t0Counts.before) === JSON.stringify(t0Counts.after), 'T0 处理必须幂等');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const takeover = await page.evaluate(() => {
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.setPostRentalEntitlement('permanent');
      window.__appRentalDemo.triggerExpiryMinutes(0);
      return window.__appRentalDemo.snapshot();
    });
    assert(takeover.order.status === 'ended' && takeover.rentalUsage.sessionActive && takeover.rentalUsage.takeover === 'permanent' && !takeover.expiredLaunchDialogOpen, '有效永久权益未在T0接管会话');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const pendingMembershipT0 = await page.evaluate(() => {
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.createMembershipOrder();
      window.__appRentalDemo.triggerExpiryMinutes(0);
      return window.__appRentalDemo.snapshot();
    });
    assert(!pendingMembershipT0.rentalUsage.sessionActive && pendingMembershipT0.membershipOrder.status === 'pending', '待支付会员不得接管T0会话');
    const blockedLaunch = await page.evaluate(() => window.__appRentalDemo.attemptLaunchAfterExpiry());
    const blockedLaunchState = await page.evaluate(() => window.__appRentalDemo.snapshot());
    assert(blockedLaunch === false && blockedLaunchState.screen === 'detail' && !blockedLaunchState.rentalUsage.sessionActive && !blockedLaunchState.expiredLaunchDialogOpen, '无新权益时必须停止租赁会话并进入详情重新选择权益');
    const launchRecovery = await page.evaluate(() => {
      window.__appRentalDemo.setLaunchVerification('offline');
      const offline = window.__appRentalDemo.attemptLaunchAfterExpiry();
      window.__appRentalDemo.setLaunchVerification('online');
      window.__appRentalDemo.setPostRentalEntitlement('personal-owned');
      const owned = window.__appRentalDemo.attemptLaunchAfterExpiry();
      return { offline, owned, snapshot: window.__appRentalDemo.snapshot() };
    });
    assert(!launchRecovery.offline && launchRecovery.owned && launchRecovery.snapshot.rentalUsage.sessionActive, '离线校验应拦截，个人拥有或新权益应允许再次启动');
    process.stdout.write('T0 8/8 PASS\n');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('orders');
    });
    await page.locator('.order-list-card[data-status="active"]').click();
    await page.getByRole('button', { name: '申请售后', exact: true }).click();
    const portraitAfterSales = await page.evaluate(() => ({
      layout: document.querySelector('[data-layout="portrait-after-sales"]')?.dataset.layout,
      types: document.querySelectorAll('[data-after-sales-type]').length,
      typeLabels: [...document.querySelectorAll('[data-after-sales-type]')].map((node) => node.textContent.trim()),
      screen: window.__appRentalDemo.snapshot().screen,
    }));
    assert(portraitAfterSales.layout === 'portrait-after-sales' && portraitAfterSales.types === 4 && portraitAfterSales.screen === 'after-sales', '竖屏售后独立页或4类问题不完整');
    assert(
      JSON.stringify(portraitAfterSales.typeLabels) === JSON.stringify(['启动失败', 'Steam登录失败', '账号异常/频繁掉线', '其他问题']),
      '售后四类问题名称或顺序不符合最终口径',
    );
    assert((await page.evaluate(() => window.__appRentalDemo.submitAfterSales())) === null, '售后描述必填校验失效');
    await page.locator('[data-after-sales-type="launch"]').click();
    await page.locator('#after-sales-description').fill('游戏启动后持续闪退，需要协助排查。');
    await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
    const landscapeAfterSales = await page.evaluate(() => ({
      layout: document.querySelector('[data-layout="landscape-after-sales"]')?.dataset.layout,
      type: window.__appRentalDemo.snapshot().afterSalesDraft.type,
      description: document.querySelector('#after-sales-description')?.value,
    }));
    assert(landscapeAfterSales.layout === 'landscape-after-sales' && landscapeAfterSales.type === 'launch' && landscapeAfterSales.description.includes('持续闪退'), '旋转后售后右侧面板或草稿丢失');
    const afterSalesSubmit = await page.evaluate(() => {
      const first = window.__appRentalDemo.submitAfterSales();
      const second = window.__appRentalDemo.submitAfterSales();
      return { first, second, snapshot: window.__appRentalDemo.snapshot() };
    });
    assert(afterSalesSubmit.first.id === afterSalesSubmit.second.id && afterSalesSubmit.snapshot.afterSalesOrder.id === afterSalesSubmit.first.id, '重复提交必须返回原售后单');
    assert((await page.locator('.refund-progress').count()) === 0, '普通问题售后不得显示用户主动退款进度');
    await page.evaluate(() => window.__appRentalDemo.setAfterSalesInventory(false));
    const noReplacement = await page.evaluate(() => window.__appRentalDemo.requestReplacement());
    const noReplacementUi = await page.locator('.replacement-status').innerText();
    assert(!noReplacement && noReplacementUi.includes('暂无同游戏同版本账号') && noReplacementUi.includes('保留原绑定') && noReplacementUi.includes('重试'), '换号无库存未保留原绑定或缺少恢复动作');
    const replacement = await page.evaluate(() => {
      window.__appRentalDemo.setAfterSalesInventory(true);
      window.__appRentalDemo.requestReplacement();
      return window.__appRentalDemo.snapshot().replacementRequest;
    });
    assert(replacement.status === 'success' && replacement.gameId === 'red-dead-2' && replacement.version === 'Steam · 标准版', '换号必须保持同游戏同版本');
    assert(afterSalesSubmit.snapshot.guardCode === null && afterSalesSubmit.snapshot.steamForm.password === '', '售后提交后必须清理凭据');
    process.stdout.write('AFTER_SALES 10/10 PASS\n');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.setScenario('not-member-library');
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.selectRentalSku('hourly-8h');
      window.__appRentalDemo.navigate('checkout');
      window.__appRentalDemo.setInventoryAvailable(false);
    });
    const noStockRecovery = await page.evaluate(() => ({
      text: document.querySelector('#appRentalDemo').innerText,
      primaryCount: document.querySelectorAll('[data-primary-action="true"]').length,
      retry: Boolean(document.querySelector('[data-action="retry-inventory"]')),
      disabled: Boolean(document.querySelector('[data-primary-action="true"]:disabled')),
    }));
    assert(noStockRecovery.text.includes('当前套餐已售罄') && noStockRecovery.text.includes('暂不可购买') && noStockRecovery.retry && noStockRecovery.disabled && noStockRecovery.primaryCount === 1, '无库存必须禁用购买并显示“暂不可购买”，同时保留库存重查');
    await page.locator('[data-action="retry-inventory"]').click();
    assert((await page.locator('[data-action="pay-game-order"]').count()) === 1, '重新查询库存后未恢复购买');
    await page.evaluate(() => window.__appRentalDemo.setPriceChanged(true));
    const priceRecovery = await page.evaluate(() => ({
      screen: window.__appRentalDemo.snapshot().screen,
      text: document.querySelector('#appRentalDemo').innerText,
      primaryCount: document.querySelectorAll('[data-primary-action="true"]').length,
    }));
    assert(priceRecovery.screen === 'checkout' && priceRecovery.text.includes('按新价格重新确认') && priceRecovery.primaryCount === 1, '改价必须回到checkout重新确认且仅一个主操作');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const refundingRecovery = await page.evaluate(() => {
      window.__appRentalDemo.createOrder({ sku: 'rent-2h', amount: 9.9, priceVersion: 'recovery' });
      window.__appRentalDemo.payOrder();
      window.__appRentalDemo.allocateAccount(false);
      window.__appRentalDemo.navigate('orders');
      return window.__appRentalDemo.snapshot().order;
    });
    await page.locator(`.order-list-card[data-order-id="${refundingRecovery.id}"]`).click();
    assert((await page.locator('.portrait-order-detail').innerText()).includes('自动退款'), '分配失败后必须显示自动退款');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const networkOrderId = await page.evaluate(() => {
      const order = window.__appRentalDemo.createOrder({ sku: 'rent-2h', amount: 9.9, priceVersion: 'network' });
      window.__appRentalDemo.navigate('checkout');
      window.__appRentalDemo.setNetworkAvailable(false);
      window.__appRentalDemo.queryOrderStatus();
      return order.id;
    });
    const networkRecovery = await page.evaluate(() => ({
      orderId: window.__appRentalDemo.snapshot().order.id,
      text: document.querySelector('#appRentalDemo').innerText,
      retry: Boolean(document.querySelector('[data-action="requery-order"]')),
      primaryCount: document.querySelectorAll('[data-primary-action="true"]').length,
    }));
    assert(networkRecovery.orderId === networkOrderId && networkRecovery.text.includes(networkOrderId) && networkRecovery.retry && networkRecovery.primaryCount === 1, '网络异常必须保留订单号、提供重新查询且仅一个主操作');
    await page.evaluate(() => window.__appRentalDemo.setNetworkAvailable(true));
    await page.locator('[data-action="requery-order"]').click();
    assert(!(await page.locator('#appRentalDemo').innerText()).includes('网络异常'), '网络恢复后重新查询未清除异常');
    process.stdout.write('RECOVERY 6/6 PASS\n');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    let layoutChecks = 0;
    const checkLayout = (condition, message) => {
      assert(condition, message);
      layoutChecks += 1;
    };
    checkLayout((await page.locator('.device.portrait[data-shell="core"] .portrait-nav').count()) === 1, '竖屏核心页必须保留 APP 全局导航');
    await page.evaluate(() => window.__appRentalDemo.navigate('detail'));
    checkLayout((await page.locator('.device.portrait[data-shell="task"]').count()) === 1, '竖屏详情未进入独立任务壳层');
    checkLayout((await page.locator('.device.portrait[data-shell="task"] .portrait-nav').count()) === 0, '竖屏任务页不得保留 APP 全局导航');
    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('landscape');
      window.__appRentalDemo.navigate('home');
    });
    checkLayout((await page.locator('.device.landscape[data-shell="core"] .landscape-top-nav').count()) === 1, '横屏核心页必须保留 APP 全局导航');
    await page.evaluate(() => window.__appRentalDemo.navigate('detail'));
    checkLayout((await page.locator('.device.landscape[data-shell="task"] .landscape-top-nav').count()) === 0, '横屏任务页不得保留 APP 全局导航');
    checkLayout((await page.locator('.mac-derived-detail .mac-detail-layout').count()) === 1, '横屏详情未继承 Mac 左右骨架');
    await page.evaluate(() => window.__appRentalDemo.navigate('checkout'));
    checkLayout((await page.locator('.mac-derived-checkout .checkout-benefit-column').count()) === 1, '横屏订单缺少 Mac 左侧权益区');
    checkLayout((await page.locator('.mac-derived-checkout .checkout-purchase-column').count()) === 1, '横屏订单缺少 Mac 右侧购买区');
    checkLayout(await page.locator('.mac-derived-checkout .payment-primary').isVisible(), '横屏订单主支付按钮必须在首屏可见');
    await page.evaluate(() => window.__appRentalDemo.navigate('membership'));
    checkLayout((await page.locator('.landscape-membership .membership-plan-card').count()) === 3, '横屏会员套餐必须完整显示周卡、月卡、季卡三张卡');
    const membershipPreviewBadgeGeometry = await page.evaluate(() => [...document.querySelectorAll('.landscape-membership .membership-preview .member-game-card')]
      .map((card) => {
        const cover = card.querySelector('.member-game-cover')?.getBoundingClientRect();
        const badge = card.querySelector('.cloud-save-badge')?.getBoundingClientRect();
        if (!cover || !badge || badge.width === 0 || badge.height === 0) return null;
        const overlaps = badge.left < cover.right && badge.right > cover.left && badge.top < cover.bottom && badge.bottom > cover.top;
        return { overlaps, badgeTop: Math.round(badge.top), coverBottom: Math.round(cover.bottom) };
      })
      .filter(Boolean));
    checkLayout(membershipPreviewBadgeGeometry.length > 0 && membershipPreviewBadgeGeometry.every(({ overlaps, badgeTop, coverBottom }) => !overlaps && badgeTop >= coverBottom - 1), `横屏会员中心云存档标识覆盖封面：${JSON.stringify(membershipPreviewBadgeGeometry)}`);
    await page.evaluate(() => window.__appRentalDemo.navigate('member-library'));
    const memberLibraryBadgeGeometry = await page.evaluate(() => [...document.querySelectorAll('.landscape-member-library .member-game-card')]
      .map((card) => {
        const cover = card.querySelector('.member-game-cover')?.getBoundingClientRect();
        const badge = card.querySelector('.cloud-save-badge')?.getBoundingClientRect();
        if (!cover || !badge || badge.width === 0 || badge.height === 0) return null;
        const overlaps = badge.left < cover.right && badge.right > cover.left && badge.top < cover.bottom && badge.bottom > cover.top;
        return { overlaps, badgeTop: Math.round(badge.top), coverBottom: Math.round(cover.bottom) };
      })
      .filter(Boolean));
    checkLayout(memberLibraryBadgeGeometry.length > 0 && memberLibraryBadgeGeometry.every(({ overlaps, badgeTop, coverBottom }) => !overlaps && badgeTop >= coverBottom - 1), `横屏会员游戏库云存档标识覆盖封面：${JSON.stringify(memberLibraryBadgeGeometry)}`);
    await page.evaluate(() => {
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.navigate('orders');
    });
    const landscapeOrderListLayout = await page.evaluate(() => ({
      screen: window.__appRentalDemo.snapshot().screen,
      list: Boolean(document.querySelector('.landscape-order-list, .order-list-pane')),
      detail: Boolean(document.querySelector('.landscape-order-detail, [data-layout="landscape-order-detail"], .order-detail-pane')),
      actionBounds: [...document.querySelectorAll('.landscape-orders .order-list-card')].map((card) => {
        const cardRect = card.getBoundingClientRect();
        const buttons = [...card.querySelectorAll('.order-actions-set button')];
        return {
          status: card.dataset.status,
          buttonCount: buttons.length,
          contained: buttons.every((button) => {
            const rect = button.getBoundingClientRect();
            return rect.left >= cardRect.left - 1 && rect.right <= cardRect.right + 1 && rect.top >= cardRect.top - 1 && rect.bottom <= cardRect.bottom + 1;
          }),
        };
      }),
    }));
    checkLayout(landscapeOrderListLayout.screen === 'orders' && landscapeOrderListLayout.list && !landscapeOrderListLayout.detail, `横屏订单列表必须是独立页面：${JSON.stringify(landscapeOrderListLayout)}`);
    checkLayout(landscapeOrderListLayout.actionBounds.every(({ contained }) => contained), `横屏订单卡操作按钮越出卡片：${JSON.stringify(landscapeOrderListLayout.actionBounds)}`);
    await page.locator('.landscape-orders .order-list-card[data-status="active"]').first().click();
    const landscapeOrderDetailLayout = await page.evaluate(() => ({
      screen: window.__appRentalDemo.snapshot().screen,
      list: Boolean(document.querySelector('.landscape-order-list, .order-list-pane')),
      detail: Boolean(document.querySelector('.landscape-order-detail, [data-layout="landscape-order-detail"], .order-detail-pane')),
    }));
    checkLayout(landscapeOrderDetailLayout.screen === 'order-detail' && !landscapeOrderDetailLayout.list && landscapeOrderDetailLayout.detail, `横屏订单详情必须是独立页面：${JSON.stringify(landscapeOrderDetailLayout)}`);
    await page.evaluate(() => window.__appRentalDemo.openManualLogin());
    checkLayout((await page.locator('.steam-login-body .steam-login-form').count()) === 1 && (await page.locator('.steam-login-body .steam-qr-panel').count()) === 1, 'Steam 横屏未继承账号密码与二维码双栏');
    const readableMetrics = await page.evaluate(() => ({
      title: parseFloat(getComputedStyle(document.querySelector('.steam-login-form h1')).fontSize),
      input: parseFloat(getComputedStyle(document.querySelector('.steam-field input')).fontSize),
      inputHeight: document.querySelector('.steam-field input').getBoundingClientRect().height,
      deviceTransform: getComputedStyle(document.querySelector('.device')).transform,
    }));
    checkLayout(readableMetrics.title >= 18 && readableMetrics.input >= 14, `任务页关键文字低于可读标准：${JSON.stringify(readableMetrics)}`);
    checkLayout(readableMetrics.inputHeight >= 44, `Steam 输入框触控高度不足44px：${JSON.stringify(readableMetrics)}`);
    checkLayout(readableMetrics.deviceTransform === 'none', 'APP 横屏任务页不得整体缩放');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const sourceReturn = await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('library');
      window.__appRentalDemo.navigate('detail');
      const source = window.__appRentalDemo.snapshot().routeContext.sourceScreen;
      const target = window.__appRentalDemo.taskBack();
      return { source, target };
    });
    checkLayout(sourceReturn.source === 'library' && sourceReturn.target === 'library', `详情未返回来源核心页：${JSON.stringify(sourceReturn)}`);
    const rotationContinuity = await page.evaluate(() => {
      window.__appRentalDemo.navigate('detail');
      window.__appRentalDemo.navigate('checkout');
      const before = window.__appRentalDemo.snapshot();
      window.__appRentalDemo.setOrientation('landscape');
      const after = window.__appRentalDemo.snapshot();
      return {
        sameOrder: before.order.id === after.order.id,
        sameSource: before.routeContext.sourceScreen === after.routeContext.sourceScreen,
        sameStack: JSON.stringify(before.routeContext.taskStack) === JSON.stringify(after.routeContext.taskStack),
      };
    });
    checkLayout(rotationContinuity.sameOrder && rotationContinuity.sameSource && rotationContinuity.sameStack, `旋转后订单或来源路由被重建：${JSON.stringify(rotationContinuity)}`);
    const deepLinkFallback = await page.evaluate(() => {
      window.__appRentalDemo.navigate('home');
      window.__appRentalDemo.setRouteContext({ sourceScreen: null, taskStack: [] });
      window.__appRentalDemo.navigate('order-detail', { rememberSource: false });
      return window.__appRentalDemo.taskBack();
    });
    checkLayout(deepLinkFallback === 'orders', `订单详情深链返回兜底错误：${deepLinkFallback}`);
    process.stdout.write(`LAYOUT ${layoutChecks}/${layoutChecks} PASS\n`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    let reviewFixChecks = 0;
    const checkReviewFix = (condition, message) => {
      assert(condition, message);
      reviewFixChecks += 1;
    };

    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.setScenario('member-library-trial');
      window.__appRentalDemo.navigate('home');
    });
    await page.locator('.hero-card[data-game-id="shadow-blade-zero"]').click();
    const portraitRecommendation = await page.evaluate(() => ({
      selectedGameId: window.__appRentalDemo.snapshot().selectedGameId,
      title: document.querySelector('.portrait-detail-hero h2')?.textContent.trim(),
    }));
    checkReviewFix(portraitRecommendation.selectedGameId === 'shadow-blade-zero' && portraitRecommendation.title === '影之刃零', `竖屏推荐未进入同一游戏详情：${JSON.stringify(portraitRecommendation)}`);

    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('landscape');
      window.__appRentalDemo.navigate('home');
    });
    await page.locator('.landscape-home-hero[data-game-id="shadow-blade-zero"]').click();
    const landscapeRecommendation = await page.evaluate(() => ({
      selectedGameId: window.__appRentalDemo.snapshot().selectedGameId,
      title: document.querySelector('.mac-derived-detail .landscape-detail-copy h1')?.textContent.trim(),
    }));
    checkReviewFix(landscapeRecommendation.selectedGameId === 'shadow-blade-zero' && landscapeRecommendation.title === '影之刃零', `横屏推荐未进入同一游戏详情：${JSON.stringify(landscapeRecommendation)}`);

    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.setScenario('not-member-library');
      window.__appRentalDemo.navigate('checkout');
    });
    const benefitCopy = await page.locator('.service-benefits').innerText();
    checkReviewFix(benefitCopy.includes('永不顶号') && !benefitCopy.includes('永久账号'), '服务保障必须使用“永不顶号”，不得承诺“永久账号”');

    await page.evaluate(() => window.__appRentalDemo.navigate('membership'));
    const portraitMembershipOrder = await page.evaluate(() => {
      const plans = document.querySelector('.portrait-membership .membership-plan-list');
      const library = document.querySelector('.portrait-membership .membership-preview');
      const faq = document.querySelector('.portrait-membership .membership-faq-preview');
      return Boolean(plans && library && faq && (plans.compareDocumentPosition(library) & Node.DOCUMENT_POSITION_FOLLOWING) && (library.compareDocumentPosition(faq) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    checkReviewFix(portraitMembershipOrder, '竖屏会员中心必须按套餐→会员游戏库→常见问题排列');

    await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
    const landscapeMembershipOrder = await page.evaluate(() => {
      const plans = document.querySelector('.landscape-membership .membership-plan-list');
      const library = document.querySelector('.landscape-membership .membership-preview');
      const faq = document.querySelector('.landscape-membership .membership-faq-preview');
      return Boolean(plans && library && faq && (plans.compareDocumentPosition(library) & Node.DOCUMENT_POSITION_FOLLOWING) && (library.compareDocumentPosition(faq) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    checkReviewFix(landscapeMembershipOrder, '横屏会员中心必须按套餐→会员游戏库→常见问题排列');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.navigate('orders');
      window.__appRentalDemo.triggerExpiryMinutes(15);
    });
    const portraitExpirySpacing = await page.evaluate(() => {
      const reminder = document.querySelector('.expiry-reminder').getBoundingClientRect();
      const content = document.querySelector('.order-page-head').getBoundingClientRect();
      return { reminderBottom: Math.round(reminder.bottom), contentTop: Math.round(content.top) };
    });
    checkReviewFix(portraitExpirySpacing.reminderBottom <= portraitExpirySpacing.contentTop, `竖屏临期提示仍遮挡订单正文：${JSON.stringify(portraitExpirySpacing)}`);

    await page.evaluate(() => window.__appRentalDemo.setOrientation('landscape'));
    const landscapeExpirySpacing = await page.evaluate(() => {
      const reminder = document.querySelector('.expiry-reminder').getBoundingClientRect();
      const content = document.querySelector('.landscape-orders .order-page-head, .landscape-orders .order-list-pane, .landscape-orders .landscape-order-list').getBoundingClientRect();
      return { reminderBottom: Math.round(reminder.bottom), contentTop: Math.round(content.top) };
    });
    checkReviewFix(landscapeExpirySpacing.reminderBottom <= landscapeExpirySpacing.contentTop, `横屏临期提示仍遮挡订单正文：${JSON.stringify(landscapeExpirySpacing)}`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('detail');
      window.__appRentalDemo.navigate('checkout');
      window.__appRentalDemo.setInventoryAvailable(false);
    });
    await page.locator('.portrait-checkout .task-back').click();
    const checkoutReturn = await page.evaluate(() => ({
      screen: window.__appRentalDemo.snapshot().screen,
      nextBack: window.__appRentalDemo.taskBack(),
    }));
    checkReviewFix(checkoutReturn.screen === 'detail' && checkoutReturn.nextBack !== 'checkout', `结算返回详情形成任务栈回环：${JSON.stringify(checkoutReturn)}`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('landscape');
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.navigate('orders');
      window.__appRentalDemo.openAfterSales();
    });
    await page.locator('[data-action="back-to-orders"]').first().click();
    const afterSalesReturn = await page.evaluate(() => ({
      screen: window.__appRentalDemo.snapshot().screen,
      nextBack: window.__appRentalDemo.taskBack(),
    }));
    checkReviewFix(afterSalesReturn.screen === 'orders' && afterSalesReturn.nextBack !== 'after-sales', `售后查看订单形成任务栈回环：${JSON.stringify(afterSalesReturn)}`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    await page.evaluate(() => {
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.navigate('orders');
    });
    await page.locator('.order-list-card[data-status="ended"]').click();
    await page.locator('[data-order-card-action="resume"]').click();
    checkReviewFix((await page.evaluate(() => window.__appRentalDemo.snapshot().screen)) === 'detail', '订单“继续畅玩”必须进入详情选择当前权益');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const expirySourceReturn = await page.evaluate(() => {
      window.__appRentalDemo.navigate('library');
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.navigate('orders');
      window.__appRentalDemo.triggerExpiryMinutes(0);
      window.__appRentalDemo.closeExpiredLaunchDialog();
      return window.__appRentalDemo.snapshot().screen;
    });
    checkReviewFix(expirySourceReturn === 'library', `到期“立即结束”未返回来源核心页：${expirySourceReturn}`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const afterSalesReasonBoundary = await page.evaluate(() => {
      window.__appRentalDemo.setScenario('active-rental');
      window.__appRentalDemo.navigate('orders');
      window.__appRentalDemo.selectOrder('APP-20260803004');
      window.__appRentalDemo.openAfterSales();
      return {
        count: document.querySelectorAll('[data-after-sales-type]').length,
        labels: [...document.querySelectorAll('[data-after-sales-type]')].map((node) => node.textContent.trim()),
        refundType: Boolean(document.querySelector('[data-after-sales-type="refund"]')),
        orderBenefit: document.querySelector('#appRentalDemo')?.textContent.includes('3天无理由') || false,
      };
    });
    checkReviewFix(afterSalesReasonBoundary.count === 4 && !afterSalesReasonBoundary.refundType && !afterSalesReasonBoundary.labels.includes('3天无理由'), `售后问题类型仍混入3天无理由：${JSON.stringify(afterSalesReasonBoundary)}`);
    process.stdout.write(`REVIEW_FIXES ${reviewFixChecks}/${reviewFixChecks} PASS\n`);

    const annotationPage = await browser.newPage({ viewport: { width: 1680, height: 980 } });
    const annotationIssues = [];
    annotationPage.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) annotationIssues.push(`${message.type()}: ${message.text()}`);
    });
    annotationPage.on('pageerror', (error) => annotationIssues.push(`pageerror: ${error.message}`));
    await annotationPage.goto(pathToFileURL(annotationPath).href, { waitUntil: 'domcontentloaded' });
    await annotationPage.waitForFunction(() => Boolean(window.__appRentalDemo && window.__appRentalAnnotation));

    const annotationStructure = await annotationPage.evaluate(() => ({
      nav: Boolean(document.querySelector('#flowNav')),
      stage: Boolean(document.querySelector('#demoStage')),
      panel: Boolean(document.querySelector('#annotationPanel')),
      navWidth: Math.round(document.querySelector('#flowNav').getBoundingClientRect().width),
      panelWidth: Math.round(document.querySelector('#annotationPanel').getBoundingClientRect().width),
      subtitle: document.querySelector('#flowNav .annotation-subtitle')?.textContent.trim(),
    }));
    assertAnnotation(annotationStructure.nav && annotationStructure.stage && annotationStructure.panel, '标注版缺少左侧导航、中间 Demo 或右侧标注面板');
    assertAnnotation(annotationStructure.navWidth === 220 && annotationStructure.panelWidth === 400, `标注版侧栏尺寸错误：${JSON.stringify(annotationStructure)}`);
    assertAnnotation(annotationStructure.subtitle === '交互标注文档', '左侧缺少“交互标注文档”副标题');

    const navigationLabels = await annotationPage.locator('[data-flow-group] span:last-child').allTextContents();
    assertAnnotation(navigationLabels.map((value) => value.trim()).join('|') === '发现|详情|订单|会员|登录|临期|售后|异常', '左侧八组页面导航不完整或顺序错误');
    const tabLabels = await annotationPage.locator('[data-annotation-tab]').allTextContents();
    assertAnnotation(tabLabels.map((value) => value.trim()).join('|') === '交互说明|异常边界|数据与状态', '右侧必须提供三个指定 Tab');

    const annotationMatrix = await annotationPage.evaluate(() => {
      const items = [...document.querySelectorAll('.anno-item')];
      return {
        total: items.length,
        complete: items.every((item) => ['trigger', 'portrait', 'landscape', 'feedback', 'dependency', 'exception'].every((field) => item.querySelector(`[data-field="${field}"]`))),
        interaction: document.querySelectorAll('.anno-badge--interaction').length,
        global: document.querySelectorAll('.anno-badge--global').length,
        exception: document.querySelectorAll('.anno-badge--exception').length,
      };
    });
    assertAnnotation(annotationMatrix.total === 32 && annotationMatrix.complete, `标注矩阵数量或六字段不完整：${JSON.stringify(annotationMatrix)}`);
    assertAnnotation(annotationMatrix.interaction === 16 && annotationMatrix.global === 8 && annotationMatrix.exception === 8, `数字/G/E 三类标注数量错误：${JSON.stringify(annotationMatrix)}`);
    const annotationStateText = await annotationPage.locator('#panel-state').innerText();
    assertAnnotation(!/(?:gh_rental_2607|G@meHub#8291|48291|guardCode|\btoken\b)/i.test(annotationStateText), '数据与状态 Tab 不得展示账号、密码、校验值或令牌字段');
    assertAnnotation(
      annotationStateText.includes('七个核心页沿用 APP 底部导航')
        && annotationStateText.includes('七个核心页沿用 APP 左侧导航')
        && annotationStateText.includes('订单列表与详情拆页')
        && annotationStateText.includes('继承 Mac'),
      '标注版未明确核心页导航、订单拆页与 Mac 衍生布局规则',
    );
    assertAnnotation(
      annotationStateText.includes('全部订单')
        && annotationStateText.includes('待支付')
        && annotationStateText.includes('可使用')
        && /当前\s*Tab.*搜索|搜索.*当前\s*Tab/i.test(annotationStateText)
        && /不显示.*订单类型标签|无订单类型标签/.test(annotationStateText)
        && /CDKEY.*(?:不进入|不展示|既有需求)/i.test(annotationStateText),
      '标注版未明确订单中心三 Tab、当前页搜索、无类型标签或 CDKEY 范围',
    );
    assertAnnotation(annotationStateText.includes('任务页不显示全局导航') && annotationStateText.includes('旋转不重建'), '标注版未明确任务页壳层或旋转连续性规则');

    await annotationPage.locator('#orientationLandscape').click();
    await annotationPage.waitForFunction(() => document.querySelector('#appRentalDemo')?.dataset.orientation === 'landscape');
    assertAnnotation((await annotationPage.locator('.device.landscape').count()) === 1, '左侧横屏切换未驱动中间 Demo');
    await annotationPage.evaluate(() => window.__appRentalDemo.navigate('home'));
    assertAnnotation((await annotationPage.locator('.device.landscape[data-shell="core"] .landscape-top-nav').count()) === 1, '标注版横屏核心页未保留 APP 全局导航');
    await annotationPage.evaluate(() => window.__appRentalDemo.navigate('detail'));
    assertAnnotation((await annotationPage.locator('.device.landscape[data-shell="task"] .landscape-top-nav').count()) === 0, '标注版横屏任务页仍保留 APP 全局导航');
    assertAnnotation((await annotationPage.locator('.mac-derived-detail .mac-detail-layout').count()) === 1, '标注版横屏详情未继承 Mac 左右骨架');
    await annotationPage.evaluate(() => window.__appRentalDemo.navigate('checkout'));
    assertAnnotation((await annotationPage.locator('.mac-derived-checkout .checkout-benefit-column').count()) === 1 && (await annotationPage.locator('.mac-derived-checkout .checkout-purchase-column').count()) === 1, '标注版横屏结算未使用左权益右支付结构');

    const flowExpectations = [
      ['discovery', 'home'],
      ['detail', 'detail'],
      ['membership', 'membership'],
      ['login', 'steam-login'],
      ['expiry', 'orders'],
      ['after-sales', 'after-sales'],
      ['recovery', 'checkout'],
      ['orders', 'orders'],
    ];
    const flowScreens = [];
    for (const [group, expectedScreen] of flowExpectations) {
      await annotationPage.locator(`[data-flow-group="${group}"]`).click();
      await annotationPage.waitForFunction((screen) => window.__appRentalDemo.snapshot().screen === screen, expectedScreen);
      flowScreens.push((await annotationPage.evaluate(() => window.__appRentalDemo.snapshot().screen)) === expectedScreen);
    }
    assertAnnotation(flowScreens.every(Boolean), '左侧八组导航未逐一驱动预期业务页面');
    const orderSync = await annotationPage.evaluate(() => ({
      activeGroup: document.querySelector('[data-flow-group].active')?.dataset.flowGroup,
      section: Boolean(document.querySelector('.anno-section[data-group="orders"].is-current')),
      sectionOffset: (() => {
        const section = document.querySelector('.anno-section[data-group="orders"][data-tab="interaction"]');
        const panel = document.querySelector('#panel-interaction');
        return Math.round(section.getBoundingClientRect().top - panel.getBoundingClientRect().top);
      })(),
      screen: window.__appRentalDemo.snapshot().screen,
    }));
    assertAnnotation(orderSync.activeGroup === 'orders' && orderSync.section && orderSync.sectionOffset >= 0 && orderSync.sectionOffset <= 24 && orderSync.screen === 'orders', `左侧导航未联动中间页面和右侧标注分组：${JSON.stringify(orderSync)}`);

    await annotationPage.locator('[data-annotation-tab="boundary"]').click();
    assertAnnotation((await annotationPage.locator('[data-annotation-tab="boundary"][aria-selected="true"]').count()) === 1 && (await annotationPage.locator('#panel-boundary:not([hidden])').count()) === 1, '异常边界 Tab 未切换');

    const markerCount = await annotationPage.locator('.annotation-marker').count();
    await annotationPage.locator('#toggleMarkers').click();
    const markersHidden = await annotationPage.locator('body.markers-hidden').count();
    await annotationPage.locator('#toggleMarkers').click();
    assertAnnotation(markerCount > 0 && markersHidden === 1, '显示标号开关未隐藏或恢复中间角标');

    await annotationPage.locator('#collapseAnnotations').click();
    await annotationPage.waitForFunction(() => Math.round(document.querySelector('#annotationPanel').getBoundingClientRect().width) === 0);
    const restoreVisible = await annotationPage.locator('#restoreAnnotations').isVisible();
    await annotationPage.locator('#restoreAnnotations').click();
    await annotationPage.waitForFunction(() => Math.round(document.querySelector('#annotationPanel').getBoundingClientRect().width) === 400);
    assertAnnotation(restoreVisible, '右侧面板无法折叠或恢复');

    await annotationPage.locator('.anno-section[data-group="orders"][data-tab="boundary"] .anno-item').first().click();
    await annotationPage.waitForTimeout(50);
    assertAnnotation((await annotationPage.locator('#appRentalDemo .annotation-focus').count()) > 0, '点击右侧标注未高亮中间对应元素');

    await annotationPage.locator('[data-flow-group="expiry"]').click();
    await annotationPage.waitForFunction(() => Boolean(document.querySelector('.expiry-reminder')));
    await annotationPage.getByRole('button', { name: '关闭提醒', exact: true }).click();
    assertAnnotation((await annotationPage.locator('.expiry-reminder').count()) === 0, '标注版临期提醒核心操作不可用');

    await annotationPage.locator('[data-flow-group="after-sales"]').click();
    await annotationPage.waitForFunction(() => window.__appRentalDemo.snapshot().screen === 'after-sales');
    await annotationPage.locator('[data-after-sales-type="launch"]').click();
    await annotationPage.locator('#after-sales-description').fill('标注版售后链路验证');
    await annotationPage.locator('[data-action="submit-after-sales"]').click();
    const annotatedAfterSales = await annotationPage.evaluate(() => ({
      id: window.__appRentalDemo.snapshot().afterSalesOrder?.id,
      type: window.__appRentalDemo.snapshot().afterSalesOrder?.type,
      refundProgress: document.querySelectorAll('.refund-progress').length,
    }));
    assertAnnotation(Boolean(annotatedAfterSales.id) && annotatedAfterSales.type === 'launch' && annotatedAfterSales.refundProgress === 0, '标注版四类售后提交不可用或错误显示退款进度');

    await annotationPage.locator('[data-flow-group="recovery"]').click();
    await annotationPage.waitForFunction(() => Boolean(document.querySelector('[data-action="retry-inventory"]')));
    await annotationPage.locator('[data-action="retry-inventory"]').click();
    assertAnnotation((await annotationPage.locator('[data-action="pay-game-order"]').count()) === 1, '标注版异常恢复核心操作不可用');

    const annotationOverflow = await annotationPage.evaluate(() => ({
      workspaceX: document.querySelector('#annotationWorkspace').scrollWidth - document.querySelector('#annotationWorkspace').clientWidth,
      workspaceY: document.querySelector('#annotationWorkspace').scrollHeight - document.querySelector('#annotationWorkspace').clientHeight,
      stageX: document.querySelector('#demoStage').scrollWidth - document.querySelector('#demoStage').clientWidth,
    }));
    assertAnnotation(annotationOverflow.workspaceX === 0 && annotationOverflow.workspaceY === 0 && annotationOverflow.stageX === 0, `标注版三栏发生非预期溢出：${JSON.stringify(annotationOverflow)}`);

    const readResponsiveMetrics = () => annotationPage.evaluate(() => {
      const stage = document.querySelector('#demoStage');
      const device = document.querySelector('.device');
      const frame = document.querySelector('#demoScaleFrame');
      const stageRect = stage.getBoundingClientRect();
      const deviceRect = device.getBoundingClientRect();
      return {
        orientation: document.querySelector('#appRentalDemo').dataset.orientation,
        scale: Number(frame?.dataset.scale || 1),
        width: Math.round(deviceRect.width),
        height: Math.round(deviceRect.height),
        inside: deviceRect.left >= stageRect.left && deviceRect.right <= stageRect.right && deviceRect.top >= stageRect.top && deviceRect.bottom <= stageRect.bottom,
        stageX: stage.scrollWidth - stage.clientWidth,
        stageY: stage.scrollHeight - stage.clientHeight,
      };
    });

    const readHeroCropAlignment = () => annotationPage.evaluate(() => {
      const image = document.querySelector('.hero-card img[data-real-asset="true"], .landscape-home-hero img[data-real-asset="true"]');
      const frame = image?.parentElement;
      if (!image || !frame) return null;
      const sourceWidth = Number(image.dataset.sourceWidth);
      const sourceHeight = Number(image.dataset.sourceHeight);
      const cropCenterX = Number(image.dataset.cropX) + Number(image.dataset.cropWidth) / 2;
      const cropCenterY = Number(image.dataset.cropY) + Number(image.dataset.cropHeight) / 2;
      const imageWidth = Number.parseFloat(image.style.width);
      const imageHeight = Number.parseFloat(image.style.height);
      const imageLeft = Number.parseFloat(image.style.left);
      const imageTop = Number.parseFloat(image.style.top);
      const mappedCenterX = imageLeft + cropCenterX * (imageWidth / sourceWidth);
      const mappedCenterY = imageTop + cropCenterY * (imageHeight / sourceHeight);
      return {
        frameWidth: frame.clientWidth,
        frameHeight: frame.clientHeight,
        visualFrameWidth: frame.getBoundingClientRect().width,
        visualFrameHeight: frame.getBoundingClientRect().height,
        centerErrorX: Math.abs(mappedCenterX - frame.clientWidth / 2),
        centerErrorY: Math.abs(mappedCenterY - frame.clientHeight / 2),
      };
    });

    await annotationPage.setViewportSize({ width: 1280, height: 800 });
    await annotationPage.locator('[data-flow-group="discovery"]').click();
    await annotationPage.locator('#orientationPortrait').click();
    await annotationPage.waitForTimeout(260);
    const compactPortrait = await readResponsiveMetrics();
    assertAnnotation(compactPortrait.scale < 1 && compactPortrait.inside && compactPortrait.stageX <= 0 && compactPortrait.stageY <= 0, `1280×800 竖屏设备未完整缩放进舞台：${JSON.stringify(compactPortrait)}`);
    await annotationPage.evaluate(() => window.__appRentalDemo.navigate('home'));
    const compactPortraitCrop = await readHeroCropAlignment();
    assertAnnotation(
      compactPortraitCrop
        && compactPortraitCrop.centerErrorX <= 1
        && compactPortraitCrop.centerErrorY <= 1,
      `标注版缩放后竖屏探索图裁切坐标错乱：${JSON.stringify(compactPortraitCrop)}`,
    );
    await annotationPage.locator('.hero-card[data-game-id="shadow-blade-zero"]').click();
    await annotationPage.waitForFunction(() => window.__appRentalDemo.snapshot().screen === 'detail');
    assertAnnotation((await annotationPage.evaluate(() => window.__appRentalDemo.snapshot().screen)) === 'detail', '缩放后中间 Demo 点击坐标不准确');

    await annotationPage.locator('#orientationLandscape').click();
    await annotationPage.waitForTimeout(260);
    const compactLandscape = await readResponsiveMetrics();
    assertAnnotation(compactLandscape.scale < 1 && compactLandscape.inside && compactLandscape.stageX <= 0 && compactLandscape.stageY <= 0, `1280×800 横屏设备未完整缩放进舞台：${JSON.stringify(compactLandscape)}`);
    await annotationPage.evaluate(() => window.__appRentalDemo.navigate('home'));
    const compactLandscapeCrop = await readHeroCropAlignment();
    assertAnnotation(
      compactLandscapeCrop
        && compactLandscapeCrop.centerErrorX <= 1
        && compactLandscapeCrop.centerErrorY <= 1,
      `标注版缩放后横屏探索图裁切坐标错乱：${JSON.stringify(compactLandscapeCrop)}`,
    );
    const compactOpenScale = compactLandscape.scale;
    await annotationPage.locator('#collapseAnnotations').click();
    await annotationPage.waitForTimeout(260);
    const compactCollapsed = await readResponsiveMetrics();
    await annotationPage.locator('#restoreAnnotations').click();
    await annotationPage.waitForTimeout(260);
    const compactRestored = await readResponsiveMetrics();
    assertAnnotation(compactCollapsed.scale > compactOpenScale && compactCollapsed.inside && compactRestored.scale === compactOpenScale && compactRestored.inside, `折叠/恢复后设备缩放未重算：${JSON.stringify({ compactOpenScale, compactCollapsed, compactRestored })}`);

    await annotationPage.setViewportSize({ width: 1680, height: 980 });
    await annotationPage.locator('#orientationPortrait').click();
    await annotationPage.waitForTimeout(260);
    const fullPortrait = await readResponsiveMetrics();
    assertAnnotation(fullPortrait.scale === 1 && fullPortrait.width === 390 && fullPortrait.height === 844 && fullPortrait.inside, `1680×980 竖屏不得缩小或裁切：${JSON.stringify(fullPortrait)}`);
    await annotationPage.locator('#orientationLandscape').click();
    await annotationPage.waitForTimeout(260);
    const fullLandscape = await readResponsiveMetrics();
    assertAnnotation(fullLandscape.scale === 1 && fullLandscape.width === 874 && fullLandscape.height === 402 && fullLandscape.inside, `1680×980 横屏不得缩小或裁切：${JSON.stringify(fullLandscape)}`);

    assertAnnotation(annotationIssues.length === 0, `标注版存在控制台或页面错误：${annotationIssues.join(' | ')}`);
    process.stdout.write(`ANNOTATION ${annotationChecks}/${annotationChecks} PASS\n`);
    await annotationPage.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

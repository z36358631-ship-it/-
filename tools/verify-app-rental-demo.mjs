import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.html');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  assert(fs.existsSync(htmlPath), `找不到 Demo：${htmlPath}`);
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
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
    assert(portrait.primaryCount === 1, '首页必须只有一个主操作');
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
        hasTopNav: Boolean(document.querySelector('.landscape-top-nav')),
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
    assert(landscape.hasTopNav, '横屏缺少顶部导航');
    assert(!landscape.hasBottomNav, '横屏不得出现底部导航');
    assert(landscape.nav.join('|') === '游戏库|玩游戏|探索|排行榜|我的', '横屏导航顺序错误');
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
      ['member-library-trial', 'trial', ['permanent', 'membership']],
      ['member-library-trial-used', 'permanent', ['membership']],
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
      ['not-member-library', ['2小时租用', '更多租期'], ['首次体验', '单游戏永久畅玩', '开通会员']],
      ['member-library-trial', ['首次体验', '单游戏永久畅玩', '开通会员'], ['日租', '周租']],
      ['member-library-trial-used', ['单游戏永久畅玩', '开通会员'], ['首次体验', '已使用', '日租', '周租']],
      ['active-member', ['会员畅玩'], ['2小时租用', '首次体验', '单游戏永久畅玩', '开通会员']],
    ];
    for (const [scenario, present, absent] of skuCases) {
      await page.evaluate(({ scenario }) => {
        window.__appRentalDemo.setOrientation('portrait');
        window.__appRentalDemo.setScenario(scenario);
        window.__appRentalDemo.navigate('detail');
      }, { scenario });
      const text = await page.locator('#appRentalDemo').innerText();
      for (const value of present) assert(text.includes(value), `${scenario} 缺少 ${value}`);
      for (const value of absent) assert(!text.includes(value), `${scenario} 不应显示 ${value}`);
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
      ['owned-installed', '启动游戏'],
      ['owned-uninstalled', '下载游戏'],
      ['imported', '启动游戏'],
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
    process.stdout.write('DETAIL 8/8 PASS\n');

    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.setScenario('not-member-library');
      window.__appRentalDemo.navigate('detail');
      window.__appRentalDemo.toggleMoreDuration(true);
    });
    const durationOptions = await page.evaluate(() => ({
      hours: document.querySelectorAll('[data-duration-hours]').length,
      text: document.querySelector('#appRentalDemo').innerText,
    }));
    assert(durationOptions.hours === 21, `更多租期小时项应为21个，实际${durationOptions.hours}`);
    assert(durationOptions.text.includes('日租') && durationOptions.text.includes('周租'), '更多租期缺少日租或周租');

    await page.evaluate(() => {
      window.__appRentalDemo.selectRentalSku('hourly-8h');
      window.__appRentalDemo.navigate('checkout');
    });
    const checkoutText = await page.locator('#appRentalDemo').innerText();
    assert(['艾尔登法环', 'Steam版本', '套餐租期', '游戏原价', '订单金额'].every((value) => checkoutText.includes(value)), '确认订单字段不完整');
    assert(checkoutText.includes('支付宝') && checkoutText.includes('微信'), '确认订单缺少双支付方式');
    assert(/\b(?:2\d|30):[0-5]\d\b/.test(checkoutText), '确认订单缺少30分钟 MM:SS 倒计时');

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
      disabled: Boolean(document.querySelector('[data-primary-action="true"]:disabled')),
    }));
    assert(inventoryState.text.includes('当前套餐已售罄') && inventoryState.disabled, '无库存时未禁用购买并说明原因');
    await page.evaluate(() => window.__appRentalDemo.setInventoryAvailable(true));
    process.stdout.write('CHECKOUT 8/8 PASS\n');

    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('profile');
    });
    await page.locator('.member-banner[data-screen="membership"]').click();
    assert((await page.evaluate(() => window.__appRentalDemo.snapshot().screen)) === 'membership', '个人中心会员卡未进入会员中心');
    const membership = await page.evaluate(() => ({
      names: [...document.querySelectorAll('.membership-plan-card .plan-name')].map((node) => node.textContent.trim()),
      prices: [...document.querySelectorAll('.membership-plan-card .plan-price')].map((node) => node.textContent.trim()),
      originals: [...document.querySelectorAll('.membership-plan-card .plan-original')].map((node) => node.textContent.trim()),
      promotions: [...document.querySelectorAll('.membership-plan-card .plan-promotion')].map((node) => node.textContent.trim()),
      text: document.querySelector('#appRentalDemo').innerText,
      paymentMethods: document.querySelectorAll('.membership-payment-method').length,
      qr: Boolean(document.querySelector('[aria-label="支付二维码"]')),
      hasSelectionButton: [...document.querySelectorAll('button')].some((node) => node.textContent.trim() === '选择'),
    }));
    assert(membership.names.join('|') === '月度|年度|永久', '会员套餐顺序错误');
    assert(membership.prices.join('|') === '¥129|¥499|¥399', '会员套餐价格错误');
    assert(membership.originals.join('|') === '原价 ¥169|原价 ¥699|原价 ¥799', '会员套餐原价错误');
    assert(membership.promotions.length === 3 && membership.promotions.every((value) => value === '试运营优惠'), '会员套餐优惠标识不完整');
    await page.locator('.membership-plan-card[data-plan="annual"]').click();
    assert((await page.evaluate(() => window.__appRentalDemo.snapshot().memberPlan)) === 'annual' && !membership.hasSelectionButton, '会员套餐未支持整卡切换或出现选择按钮');
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
    assert(landscapeMemberLibrary.columns >= 4 && landscapeMemberLibrary.faq === 5, '横屏会员游戏库多列布局或5条FAQ不完整');
    process.stdout.write('MEMBERSHIP 10/10 PASS\n');

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
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

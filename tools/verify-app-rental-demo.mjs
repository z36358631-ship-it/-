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

    const faqSemantics = await page.evaluate(() => [...document.querySelectorAll('.member-faq-item')].map((node) => ({
      topic: node.dataset.faqTopic,
      text: node.textContent.trim(),
    })));
    const expectedFaqs = [
      ['game-scope', '游戏范围'],
      ['refund', '退款'],
      ['support', '客服协助'],
      ['library-update', '游戏库更新'],
      ['shared-account', '共享账号'],
    ];
    for (const [topic, keyword] of expectedFaqs) {
      const item = faqSemantics.find((entry) => entry.topic === topic);
      assert(item?.text.includes(keyword), `FAQ 缺少${keyword}主题`);
    }
    process.stdout.write('FAQ 5/5 PASS\n');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const membershipStatusCases = [
      ['none', ['会员未开通', '去开通']],
      ['monthly-active', ['月度会员', '有效期至', '续费']],
      ['annual-active', ['年度会员', '有效期至', '续费']],
      ['expired', ['会员已过期', '重新开通']],
      ['permanent', ['永久会员', '永久有效', '查看权益']],
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
          ? '.member-banner[data-screen="membership"]'
          : '.landscape-profile [data-screen="membership"]';
        const entry = page.locator(selector);
        const text = orientation === 'portrait' ? await entry.innerText() : await page.locator('.landscape-member-card').innerText();
        assert(expectedCopy.every((value) => text.includes(value)), `${orientation} ${status} 会员状态文案不完整`);
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
      return {
        qrPayment: qr?.dataset.payment,
        qrText: qr?.textContent.trim(),
        agreementText: agreement?.textContent.trim(),
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
        && portraitCheckoutReview.agreementText.includes('退款规则'),
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
      '竖屏游戏原价与订单金额视觉层级错误',
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
        && landscapeCheckoutReview.agreementText.includes('退款规则'),
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
      '横屏游戏原价与订单金额视觉层级错误',
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
    const landscapeLibraryEntryHeight = await page.locator('.landscape-member-library-entry').evaluate((node) => node.getBoundingClientRect().height);
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
    assert(portraitOrders.tabs.join('|') === '全部|租赁中|待支付', '订单中心必须且只能显示全部、租赁中、待支付三个 Tab');
    assert(portraitOrders.list && !portraitOrders.detail && portraitOrders.layout === 'portrait-orders', '竖屏订单中心应先显示单列列表并提供稳定布局标识');
    assert(portraitOrders.activeOrder?.status === 'active' && portraitOrders.activeOrder?.id === 'APP-SCENARIO-ACTIVE', 'active-rental 场景未确定性注入生效订单');
    assert(['pending', 'allocating', 'active', 'refunding', 'ended'].every((status) => portraitOrders.statuses.includes(status)), '订单列表未覆盖五种订单状态');
    await page.locator('.portrait-order-list .order-list-card[data-status="active"]').click();
    const portraitOrderDetail = await page.evaluate(() => ({
      screen: window.__appRentalDemo.snapshot().screen,
      detail: Boolean(document.querySelector('.portrait-order-detail')),
      steps: document.querySelectorAll('.order-progress [data-progress-step]').length,
      actions: [...document.querySelectorAll('.active-order-actions button')].map((node) => node.textContent.trim()),
    }));
    assert(portraitOrderDetail.screen === 'order-detail' && portraitOrderDetail.detail, '竖屏订单列表未进入独立订单详情');
    assert(portraitOrderDetail.steps === 4, '订单详情必须固定显示四步进度');
    assert(['继续游戏', '登录信息', '继续畅玩', '申请售后'].every((label) => portraitOrderDetail.actions.includes(label)), '生效订单缺少四个规定操作');

    await page.evaluate(() => {
      window.__appRentalDemo.navigate('orders');
      window.__appRentalDemo.setOrientation('landscape');
    });
    const landscapeOrders = await page.evaluate(() => ({
      split: Boolean(document.querySelector('.landscape-orders .order-list-pane') && document.querySelector('.landscape-orders .order-detail-pane')),
      tabs: [...document.querySelectorAll('.order-tabs [role="tab"]')].map((node) => node.textContent.trim()),
    }));
    assert(landscapeOrders.split, '横屏订单中心必须为左列表、右详情');
    assert(landscapeOrders.tabs.join('|') === '全部|租赁中|待支付', '横屏订单 Tab 不一致');
    await page.locator('.order-tabs [data-value="pending"]').click();
    await page.evaluate(() => window.__appRentalDemo.setOrientation('portrait'));
    const rotatedOrderTab = await page.evaluate(() => ({
      tab: window.__appRentalDemo.snapshot().orderTab,
      activeTab: document.querySelector('.order-tabs [aria-selected="true"]')?.textContent.trim(),
      statuses: [...document.querySelectorAll('.order-list-card')].map((node) => node.dataset.status),
    }));
    assert(rotatedOrderTab.tab === 'pending' && rotatedOrderTab.activeTab === '待支付' && rotatedOrderTab.statuses.every((status) => status === 'pending'), '旋转后订单 Tab 或筛选结果未保留');
    await page.locator('.order-tabs [data-value="all"]').click();
    process.stdout.write('ORDERS 10/10 PASS\n');

    await page.evaluate(() => {
      window.__appRentalDemo.setOrientation('portrait');
      window.__appRentalDemo.navigate('orders');
    });
    await page.locator('.order-list-card[data-status="active"]').click();
    await page.getByRole('button', { name: '继续游戏', exact: true }).click();
    const loginMethod = await page.evaluate(() => ({
      open: Boolean(document.querySelector('.login-method-dialog')),
      primary: document.querySelector('.login-method-dialog [data-primary-action="true"]')?.textContent.trim(),
      manual: Boolean(document.querySelector('.login-method-dialog [data-action="open-manual-login"]')),
    }));
    assert(loginMethod.open && loginMethod.primary === '一键上号' && loginMethod.manual, '继续游戏未打开以一键上号为主的登录方式选择');
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
    assert((await page.locator('.credential-panel--landscape').count()) === 1, '横屏登录信息必须为居中小窗');
    process.stdout.write('CREDENTIAL 10/10 PASS\n');

    await page.locator('button[data-action="close-credential"]').click();
    await page.getByRole('button', { name: '继续游戏', exact: true }).click();
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
    await page.locator('.steam-help-trigger').click();
    const steamHelp = await page.evaluate(() => ({
      overlay: Boolean(document.querySelector('.steam-qr-panel .steam-credential-overlay')),
      formVisible: Boolean(document.querySelector('.steam-login-form')),
      code: document.querySelector('.steam-credential-overlay [data-guard-code]')?.textContent.trim(),
    }));
    assert(steamHelp.overlay && steamHelp.formVisible && steamHelp.code === '48291', 'Steam 凭据浮层必须覆盖二维码区且复用同一码');
    await page.locator('.steam-credential-overlay [data-action="close-steam-help"]').click();
    assert((await page.locator('.steam-login-form').count()) === 1 && (await page.locator('.steam-credential-overlay').count()) === 0, '关闭 Steam 凭据浮层后未保留登录表单');
    await page.evaluate(() => window.__appRentalDemo.setOrientation('portrait'));
    const rotatedGuard = await page.evaluate(() => ({
      account: document.querySelector('#steam-account')?.value,
      code: document.querySelector('[data-guard-code]')?.textContent.trim(),
      remember: document.querySelector('#steam-remember')?.checked,
    }));
    assert(rotatedGuard.account === 'player@example.com' && rotatedGuard.code === '48291' && rotatedGuard.remember, '旋转后 Steam 表单或 Guard 未连续保留');
    await page.locator('.steam-close').click();
    await page.locator('[data-action="open-credential"]').click();
    assert((await page.locator('.credential-panel [data-guard-code]').innerText()) === '48291', '订单登录信息面板未复用 Steam 已获取的 Guard');
    const guardRefresh = await page.evaluate(() => {
      const before = window.__appRentalDemo.snapshot().accountAllocationCount;
      window.__appRentalDemo.expireGuardCode();
      const refreshed = window.__appRentalDemo.requestGuardCode();
      return {
        refreshed,
        before,
        after: window.__appRentalDemo.snapshot().accountAllocationCount,
        code: document.querySelector('[data-guard-code]')?.textContent.trim(),
      };
    });
    assert(guardRefresh.refreshed && guardRefresh.code === '48291' && guardRefresh.before === guardRefresh.after, 'Guard 过期刷新不得重复取号');
    const forbiddenCopy = await page.locator('body').innerText();
    assert(!forbiddenCopy.includes('操作过于频繁，30秒再试'), '页面出现禁用的频繁操作文案');
    const cleanup = await page.evaluate(() => {
      window.__appRentalDemo.clearSensitiveState('background');
      return window.__appRentalDemo.snapshot();
    });
    assert(cleanup.guardCode === null && cleanup.steamForm.password === '', '退后台清理接口未清除敏感状态');
    process.stdout.write('GUARD_SECURITY 12/12 PASS\n');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

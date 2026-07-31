const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require(path.join(
  os.tmpdir(),
  'codex-playwright',
  'node_modules',
  'playwright-core',
));

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(
  root,
  'Mac端demo',
  'mac端租号功能',
  'Mac端租号功能-标注版.html',
);
const outputDir = path.join(root, 'public', 'prd', 'mac-rental');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const viewport = { width: 1076, height: 734 };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForImages(page) {
  await page.evaluate(async () => {
    const images = [...document.images];
    await Promise.all(images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 5000);
      });
    }));
  });
}

async function openDemo(page) {
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof renderApp === 'function' && document.querySelector('#demoCanvas'));
}

async function exposeCanvas(page) {
  await page.evaluate(({ width, height }) => {
    let style = document.getElementById('captureStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'captureStyle';
      style.textContent = '*{animation:none!important;transition:none!important;caret-color:transparent!important}';
      document.head.appendChild(style);
    }
    Object.assign(document.documentElement.style, {
      width: `${width}px`,
      height: `${height}px`,
    });
    Object.assign(document.body.style, {
      width: `${width}px`,
      height: `${height}px`,
      overflow: 'hidden',
    });
    const app = document.getElementById('app');
    Object.assign(app.style, {
      display: 'block',
      width: `${width}px`,
      height: `${height}px`,
    });
    document.getElementById('flowNav').style.display = 'none';
    document.getElementById('annotationPanel').style.display = 'none';
    document.getElementById('panelRestore').style.setProperty('display', 'none', 'important');
    const stage = document.querySelector('.stage');
    Object.assign(stage.style, {
      position: 'relative',
      width: `${width}px`,
      height: `${height}px`,
    });
    const canvasViewport = document.getElementById('canvasViewport');
    Object.assign(canvasViewport.style, {
      position: 'absolute',
      inset: '0',
    });
    const canvas = document.getElementById('demoCanvas');
    Object.assign(canvas.style, {
      left: '0',
      top: '0',
      width: `${width}px`,
      height: `${height}px`,
      boxShadow: 'none',
    });
    canvas.style.setProperty('transform', 'none', 'important');
  }, viewport);
}

async function setBaseState(page, targetPage) {
  await page.evaluate((pageName) => {
    closeConfirm();
    hideExpiryReminder();
    Object.assign(state, {
      mode: 'mac',
      page: pageName,
      panelOpen: false,
      badgeVisible: false,
      profilePopupOpen: false,
      trialEligible: true,
      steamSession: 'personal',
      activeRentalOrderId: '',
    });
    Object.assign(state.currentUser, {
      id: 'U-000021',
      nickname: '盖世游戏用户',
      region: 'US',
    });
    Object.assign(state.membership, {
      status: 'inactive',
      planId: '',
      startedAt: null,
      expireAt: null,
      activeUseOrderId: '',
      releaseEligibleAtPurchase: false,
      purchaseHistory: [],
    });
    Object.assign(state.checkout, {
      gameId: 'elden-ring',
      version: 'standard',
      period: 'trial',
      hours: 2,
      payment: 'alipay',
      continueSourceOrderId: '',
      riskAccepted: false,
      pendingOrderId: '',
      membershipPlanId: 'monthly',
    });
    renderApp();
    const main = document.querySelector('.mac-main');
    if (main) main.scrollTop = 0;
  }, targetPage);
  await waitForImages(page);
  await exposeCanvas(page);
}

async function capture(page, fileName, targetPage, prepare) {
  await openDemo(page);
  await setBaseState(page, targetPage);
  if (prepare) await prepare(page);
  await page.waitForTimeout(150);
  await exposeCanvas(page);
  const imageState = await page.evaluate(() => {
    const images = [...document.querySelectorAll('#demoCanvas img')];
    return {
      total: images.length,
      loaded: images.filter((image) => image.complete && image.naturalWidth > 0).length,
      failedAlt: images
        .filter((image) => !image.complete || image.naturalWidth <= 0)
        .map((image) => image.alt || '(无 alt)'),
    };
  });
  assert(
    imageState.total === imageState.loaded,
    `${fileName} 存在未加载图片：${imageState.failedAlt.join('、')}`,
  );
  const outputPath = path.join(outputDir, fileName);
  await page.locator('#demoCanvas').screenshot({
    path: outputPath,
    type: 'png',
    animations: 'disabled',
  });
  const bytes = fs.readFileSync(outputPath);
  assert(
    bytes.length > 8
      && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    `${fileName} 不是有效 PNG`,
  );
  process.stdout.write(`CAPTURE ${fileName} ${bytes.length} bytes\n`);
}

async function runSmoke(browser) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${pathToFileURL(htmlPath).href}?smoke=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => ['pass', 'fail'].includes(document.body.dataset.smokeStatus), null, {
    timeout: 30000,
  });
  const result = JSON.parse(await page.locator('#smokeResult').textContent());
  const failed = result.results.filter((item) => !item.pass);
  process.stdout.write(`SMOKE ${result.results.length - failed.length}/${result.results.length}\n`);
  if (failed.length) process.stderr.write(`${JSON.stringify(failed, null, 2)}\n`);
  assert(result.pass, `Smoke Test 失败 ${failed.length} 项`);
  assert(pageErrors.length === 0, `页面脚本错误：${pageErrors.join(' | ')}`);
  await page.close();
  return result.results.length;
}

async function main() {
  assert(fs.existsSync(htmlPath), `找不到 Demo：${htmlPath}`);
  assert(fs.existsSync(chromePath), `找不到 Chrome：${chromePath}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--font-render-hinting=none'],
  });
  try {
    const smokeCount = await runSmoke(browser);
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await capture(page, 'c01-rental-discovery-used-trial.png', 'explore', async (currentPage) => {
      const result = await currentPage.evaluate(async () => {
        state.trialEligible = false;
        renderApp();
        await nextPaint();
        return {
          label: document.querySelector('[data-anno-target="explore-rent-meta"] b')?.textContent.trim(),
          hasPermanentAmount: /¥\d+\s*永久版/.test(document.querySelector('.mac-main')?.textContent || ''),
        };
      });
      assert(result.label === '可租号', '首次体验使用后列表未显示“可租号”');
      assert(!result.hasPermanentAmount, '首次体验使用后列表仍显示永久版金额');
    });

    await capture(page, 'c02-package-and-checkout.png', 'checkout', async (currentPage) => {
      const layout = await currentPage.evaluate(() => {
        const row = document.querySelector('.option-row.periods');
        const buttons = [...row.querySelectorAll('.option-btn')];
        return {
          labels: buttons.map((button) => button.textContent.trim()),
          rowWidth: row.getBoundingClientRect().width,
          widths: buttons.map((button) => button.getBoundingClientRect().width),
          hasMembershipTab: Boolean(document.querySelector('.checkout-mode-tabs')),
        };
      });
      assert(layout.labels.length === 2, '确认订单应展示2个权益 SKU');
      assert(Math.abs(layout.widths[0] - layout.widths[1]) < 1, '2个权益 SKU 未等宽');
      assert(!layout.hasMembershipTab, '确认订单仍存在会员购买 Tab');
    });

    await capture(page, 'c02-permanent-only-checkout.png', 'checkout', async (currentPage) => {
      const layout = await currentPage.evaluate(async () => {
        state.trialEligible = false;
        state.checkout.period = 'permanent';
        renderApp();
        await nextPaint();
        const row = document.querySelector('.option-row.periods.single');
        const button = row?.querySelector('.option-btn');
        const rowRect = row?.getBoundingClientRect();
        const buttonRect = button?.getBoundingClientRect();
        return {
          labels: [...row?.querySelectorAll('.period-name') || []].map((node) => node.textContent.trim()),
          columns: row ? getComputedStyle(row).gridTemplateColumns.trim().split(/\s+/).length : 0,
          rowWidth: rowRect?.width || 0,
          buttonWidth: buttonRect?.width || 0,
          leftAligned: Boolean(rowRect && buttonRect && Math.abs(rowRect.left - buttonRect.left) < 1),
          hasEligibilityCopy: document.querySelector('.mac-main')?.textContent.includes('首次体验资格已使用'),
          originalPrice: document.querySelector('.checkout-original-price')?.textContent.trim(),
          payablePrice: document.querySelector('.checkout-payable-price')?.textContent.trim(),
        };
      });
      assert(layout.labels.join(',') === '永久版', '单权益确认订单未只显示永久版');
      assert(layout.columns === 2 && layout.buttonWidth < layout.rowWidth * 0.55 && layout.leftAligned, '永久版卡片未保持半行左对齐');
      assert(!layout.hasEligibilityCopy, '确认订单仍显示首次体验资格说明');
      assert(layout.originalPrice === '¥198' && layout.payablePrice === '¥59', '永久版原价或1.5–5折金额错误');
    });

    await capture(page, 'c02-membership-center-payment.png', 'membership', async (currentPage) => {
      const summary = await currentPage.evaluate(() => ({
        order: [...document.querySelectorAll('[data-membership-plan]')].map((card) => card.dataset.membershipPlan),
        selected: document.querySelector('[data-membership-plan].selected')?.dataset.membershipPlan,
        user: document.querySelector('.membership-user-summary')?.textContent,
        rightStatusCount: document.querySelectorAll('.membership-status').length,
        payments: [...document.querySelectorAll('[data-membership-payment] .pay-btn')].map((button) => button.textContent.trim()),
        qrCount: document.querySelectorAll('[data-membership-payment] .qr-box').length,
      }));
      assert(summary.order.join(',') === 'monthly,annual,lifetime', '会员套餐顺序错误');
      assert(summary.selected === 'monthly', '未开通用户未默认选择月卡');
      assert(summary.user.includes('UID：U-000021') && summary.user.includes('未开通会员'), '左上用户信息不完整');
      assert(summary.rightStatusCount === 0, '右上仍展示重复会员状态卡');
      assert(summary.payments.join(',') === '支付宝,微信支付' && summary.qrCount === 1, '会员支付区不完整');
    });

    await capture(page, 'c02-membership-faq.png', 'membership', async (currentPage) => {
      const result = await currentPage.evaluate(() => {
        const main = document.querySelector('.mac-main');
        main.scrollTop = main.scrollHeight;
        const faq = document.querySelector('.membership-faq');
        return {
          title: faq?.querySelector('.membership-faq-title')?.textContent.trim(),
          count: faq?.querySelectorAll('li').length,
          scrollTop: main.scrollTop,
        };
      });
      assert(result.title === '会员常见问题' && result.count === 5, '会员常见问题内容不完整');
      assert(result.scrollTop > 0, '会员常见问题截图未滚动到列表底部');
    });

    await capture(page, 'c06-game-library.png', 'library', async (currentPage) => {
      const result = await currentPage.evaluate(async () => {
        state.steamSession = 'rental';
        state.activeRentalOrderId = 'GS20260713001';
        renderApp();
        await nextPaint();
        const entry = document.querySelector('[data-action="open-library-steam-login"]');
        return {
          entryText: entry?.textContent.trim(),
          disabled: entry?.disabled,
          orderId: entry?.dataset.id,
          cardText: document.querySelector('.steam-card')?.textContent,
        };
      });
      assert(result.entryText.includes('登录 Steam') && !result.disabled, '游戏库 Steam 登录入口不可用');
      assert(result.orderId === 'GS20260713001', '游戏库 Steam 登录入口绑定错误');
      assert(result.cardText.includes('盖世租号账号'), '游戏库未展示租赁账号状态');
    });

    await capture(page, 'c05-library-steam-login.png', 'library', async (currentPage) => {
      const result = await currentPage.evaluate(async () => {
        state.steamSession = 'rental';
        state.activeRentalOrderId = 'GS20260713001';
        renderApp();
        await nextPaint();
        const entry = document.querySelector('[data-action="open-library-steam-login"]');
        entry?.click();
        await nextPaint();
        const dialog = document.querySelector('.manual-login-dialog');
        return {
          entryText: entry?.textContent.trim(),
          orderId: state.credentialView.orderId,
          title: dialog?.querySelector('.gamehub-login-assistant h3')?.textContent.trim(),
          hasSteamWindow: Boolean(dialog?.querySelector('.steam-native-login')),
          stage: dialog?.querySelector('.gamehub-login-assistant')?.dataset.stage,
          collapsed: dialog?.querySelector('.gamehub-login-assistant')?.dataset.collapsed,
          hasAccountInput: Boolean(dialog?.querySelector('#steamAccountInput')),
          hasPasswordInput: Boolean(dialog?.querySelector('#steamPasswordInput')),
          hasGuardInput: Boolean(dialog?.querySelector('#steamGuardInput')),
          labels: [...dialog?.querySelectorAll('.credential-row>span:first-child') || []].map((node) => node.textContent.trim()),
          guard: dialog?.querySelector('[data-guard-value]')?.textContent.trim(),
          countdown: dialog?.querySelector('[data-guard-countdown]')?.textContent.trim(),
          assistantWidth: dialog?.querySelector('.gamehub-login-assistant')?.getBoundingClientRect().width,
          assistantLeft: dialog?.querySelector('.gamehub-login-assistant')?.getBoundingClientRect().left,
          passwordRight: dialog?.querySelector('#steamPasswordInput')?.getBoundingClientRect().right,
        };
      });
      assert(result.entryText.includes('登录 Steam'), '游戏库未显示 Steam 登录入口');
      assert(result.orderId === 'GS20260713001', '游戏库登录入口未绑定当前有效使用单');
      assert(result.title === '盖世登录助手' && result.hasSteamWindow, '未打开 Steam 登录窗与盖世登录助手');
      assert(result.stage === 'primary' && result.collapsed === 'false', '登录助手未从账号密码阶段展开');
      assert(result.hasAccountInput && result.hasPasswordInput && !result.hasGuardInput, '账号密码阶段错误展示验证码输入框');
      assert(result.labels.join(',') === 'Steam 账号,Steam 密码', '账号密码阶段字段不完整');
      assert(!result.guard && !result.countdown, '账号密码阶段不应提前生成 Steam Guard 验证码');
      assert(result.assistantWidth <= 320 && result.passwordRight < result.assistantLeft, '登录助手尺寸过大或遮挡 Steam 密码输入框');
    });

    assert(pageErrors.length === 0, `截图页面脚本错误：${pageErrors.join(' | ')}`);
    await page.close();
    process.stdout.write(`PASS smoke=${smokeCount}, screenshots=7\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright-core');

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
      membershipPlanId: '',
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

    await openDemo(page);
    await setBaseState(page, 'order-detail');
    const afterSalesFlow = await page.evaluate(async () => {
      const order = orders.find((item) => item.id === 'GS20260713001');
      state.selectedOrderId = order.id;
      Object.assign(order, {
        status: 'renting',
        refundStatus: 'none',
        refundReason: '',
        refundDescription: '',
        refundOperation: '',
        afterSales: '',
      });
      navigate('mac', 'order-detail');
      openRefundForm(order);
      const form = document.querySelector('#demoForm');
      form.querySelector('[name="reason"]').value = 'startup-failed';
      form.querySelector('[name="description"]').value = '游戏启动后持续闪退';
      form.requestSubmit();
      await nextPaint();
      const submitted = {
        page: state.page,
        dialogClosed: document.getElementById('confirmLayer').hidden,
        action: document.querySelector('[data-action="open-refund-detail"]')?.textContent.trim() || '',
        toast: document.getElementById('toast')?.textContent.trim() || '',
      };
      dispatchAction('open-refund-detail', { dataset: { id: order.id } });
      await nextPaint();
      const progressDialog = document.querySelector('.after-sales-progress-dialog');
      const hasProgressDialog = Boolean(progressDialog && progressDialog.textContent.includes('售后处理中'));
      const progressSteps = progressDialog?.querySelectorAll('.after-sales-progress-step').length || 0;
      const hasWithdraw = progressDialog?.querySelector('[data-action="withdraw-after-sales"]')?.textContent.trim() === '撤销售后';
      window.__captureAfterSalesProgressReady = hasProgressDialog && progressSteps === 3 && hasWithdraw;
      return { submitted, hasProgressDialog, progressSteps, hasWithdraw, orderId: order.id };
    });
    assert(afterSalesFlow.hasProgressDialog && afterSalesFlow.progressSteps === 3 && afterSalesFlow.hasWithdraw, `售后详情未弹出三阶段进度：${JSON.stringify(afterSalesFlow)}`);
    await page.waitForTimeout(2000);
    await page.locator('#demoCanvas').screenshot({
      path: path.join(outputDir, 'c08-after-sales-progress.png'),
      animations: 'disabled',
    });
    const withdrawnState = await page.evaluate(async ({ orderId }) => {
      const order = orders.find((item) => item.id === orderId);
      dispatchAction('withdraw-after-sales', { dataset: { id: order.id } });
      await nextPaint();
      return {
        page: state.page,
        refundStatus: order.refundStatus,
        action: document.querySelector('[data-action="open-after-sales"]')?.textContent.trim() || '',
        toast: document.getElementById('toast')?.textContent.trim() || '',
      };
    }, { orderId: afterSalesFlow.orderId });
    afterSalesFlow.withdrawn = withdrawnState;
    assert(
      afterSalesFlow.submitted.page === 'order-detail'
        && afterSalesFlow.submitted.dialogClosed
        && afterSalesFlow.submitted.action === '售后详情'
        && afterSalesFlow.submitted.toast === '售后申请已提交',
      `提交售后后未关闭申请页、提示成功或切换入口：${JSON.stringify(afterSalesFlow)}`,
    );
    assert(
      afterSalesFlow.hasProgressDialog
        && afterSalesFlow.progressSteps === 3
        && afterSalesFlow.hasWithdraw
        && afterSalesFlow.withdrawn.page === 'order-detail'
        && afterSalesFlow.withdrawn.refundStatus === 'none'
        && afterSalesFlow.withdrawn.action === '申请售后'
        && afterSalesFlow.withdrawn.toast === '售后申请已撤销',
      `售后详情撤销后未恢复申请入口：${JSON.stringify(afterSalesFlow)}`,
    );
    process.stdout.write('AFTER_SALES_FLOW 8/8 PASS\n');

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
      assert(result.label === '可畅玩' || /^¥\d+\.\d · 租号$/.test(result.label || ''), `首次体验使用后列表状态错误：${result.label}`);
      assert(!result.hasPermanentAmount, '首次体验使用后列表仍显示永久版金额');
    });

    await capture(page, 'c02-package-and-checkout.png', 'checkout', async (currentPage) => {
      const layout = await currentPage.evaluate(() => {
        const row = document.querySelector('.option-row.periods');
        const buttons = [...row.querySelectorAll('.option-btn')];
        return {
          labels: buttons.map((button) => button.textContent.trim()),
          standardOnly: document.querySelector('.checkout-game-copy .mac-muted')?.textContent.trim() === '标准版',
          hasMembershipTab: Boolean(document.querySelector('.checkout-mode-tabs')),
        };
      });
      assert(layout.labels.length === 3 && layout.labels.some((label) => label.includes('首次体验 · 2小时')) && layout.labels.some((label) => label.includes('单游戏永久')) && layout.labels.some((label) => label.includes('开会员畅玩')), '非热门确认订单应展示首次体验、单游戏永久、开会员畅玩');
      assert(layout.standardOnly, '确认订单未锁定标准版');
      assert(!layout.hasMembershipTab, '确认订单仍存在会员购买 Tab');
    });

    await capture(page, 'c02-permanent-only-checkout.png', 'checkout', async (currentPage) => {
      const layout = await currentPage.evaluate(async () => {
        state.trialEligible = false;
        state.checkout.period = 'permanent';
        renderApp();
        await nextPaint();
        const row = document.querySelector('.option-row.periods');
        return {
          labels: [...row?.querySelectorAll('.period-name') || []].map((node) => node.textContent.trim()),
          hasEligibilityCopy: document.querySelector('.mac-main')?.textContent.includes('首次体验资格已使用'),
          originalPrice: document.querySelector('.checkout-original-price')?.textContent.trim(),
          payablePrice: document.querySelector('.checkout-payable-price')?.textContent.trim(),
        };
      });
      assert(layout.labels.join(',') === '单游戏永久,开会员畅玩', '首次体验资格使用后未保留单游戏永久与会员入口');
      assert(!layout.hasEligibilityCopy, '确认订单仍显示首次体验资格说明');
      assert(/^¥\d+(?:\.\d+)?$/.test(layout.originalPrice || '') && /^¥\d+\.\d{2}$/.test(layout.payablePrice || ''), `永久版原价或订单金额格式错误：${JSON.stringify(layout)}`);
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
      assert(summary.order.join(',') === 'weekly,monthly,quarterly', '会员套餐顺序错误');
      assert(summary.selected === 'weekly', '未开通用户未默认选择周卡');
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

    await openDemo(page);
    await setBaseState(page, 'order-detail');
    const orderCredentialResult = await page.evaluate(async () => {
      state.selectedOrderId = 'GS20260713001';
      navigate('mac', 'order-detail');
      await nextPaint();
      document.querySelector('[data-action="open-manual-login"]')?.click();
      await nextPaint();
      const dialog = document.querySelector('.standalone-credential-dialog');
      return {
        hasStandalone: Boolean(dialog),
        hasSteamWindow: Boolean(document.querySelector('.steam-account-column')),
        hasQrColumn: Boolean(document.querySelector('.steam-qr-column')),
        title: dialog?.querySelector('h3')?.textContent.trim(),
        hasAccountCopy: Boolean(dialog?.querySelector('[data-action="copy-login-account"]')),
        hasPasswordCopy: Boolean(dialog?.querySelector('[data-action="copy-login-password"]')),
      };
    });
    assert(orderCredentialResult.hasStandalone, '订单登录信息未打开独立凭据弹窗');
    assert(
      !orderCredentialResult.hasSteamWindow && !orderCredentialResult.hasQrColumn,
      '订单登录信息错误拉起 Steam 双栏窗',
    );
    assert(orderCredentialResult.title === 'Steam 登录信息', '独立凭据弹窗标题不正确');
    assert(
      orderCredentialResult.hasAccountCopy && orderCredentialResult.hasPasswordCopy,
      '独立凭据复制操作不完整',
    );
    const standaloneInteractionResult = await page.evaluate(async () => {
      const orderId = 'GS20260713001';
      const order = orders.find((item) => item.id === orderId);
      const account = accounts.find((item) => item.id === order?.accountId);
      const boundAccountId = order?.accountId;
      dispatchAction('toggle-account-visibility', { dataset: { id: orderId } });
      dispatchAction('toggle-password-visibility', { dataset: { id: orderId } });
      await nextPaint();
      const visibleText = document.querySelector('.standalone-credential-dialog')?.textContent || '';
      dispatchAction('copy-login-account', { dataset: { id: orderId } });
      dispatchAction('copy-login-password', { dataset: { id: orderId } });
      const repeatableCopy = document.querySelector('.credential-copy-feedback')?.textContent.includes('密码已复制');
      dispatchAction('request-guard-code', { dataset: { id: orderId } });
      const guardLoading = document.querySelector('[data-action="request-guard-code"][disabled]')
        ?.textContent.includes('正在获取');
      await new Promise((resolve) => setTimeout(resolve, 260));
      await nextPaint();
      const firstGuard = account?.guardCode || '';
      const guardVisible = document.querySelector('[data-guard-value]')?.textContent.includes(firstGuard);
      dispatchAction('copy-guard-code', { dataset: { id: orderId } });
      const guardCopied = document.querySelector('.credential-copy-feedback')?.textContent.includes('验证码已复制');
      dispatchAction('request-guard-code', { dataset: { id: orderId } });
      await new Promise((resolve) => setTimeout(resolve, 260));
      await nextPaint();
      const refreshedGuard = account?.guardCode || '';
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const escapeClosed = !document.querySelector('.standalone-credential-dialog');
      dispatchAction('open-manual-login', { dataset: { id: orderId } });
      await nextPaint();
      document.getElementById('confirmLayer').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const outsideClosed = !document.querySelector('.standalone-credential-dialog');
      dispatchAction('open-login-methods', { dataset: { id: orderId } });
      dispatchAction('choose-manual-login', { dataset: { id: orderId } });
      await nextPaint();
      dispatchAction('open-credential-popover', { dataset: { id: orderId } });
      await nextPaint();
      const sharedGuard = document.querySelector('[data-guard-value]')?.textContent.trim();
      const sceneEvents = state.rentalEvents
        .filter((event) => ['rental_credential_view', 'rental_credential_copy', 'rental_guard_code_result'].includes(event.event))
        .map((event) => event.scene);
      return {
        accountVisible: Boolean(account && visibleText.includes(account.loginName)),
        passwordVisible: Boolean(account && visibleText.includes(account.loginPassword)),
        repeatableCopy,
        guardLoading,
        firstGuard,
        guardVisible,
        guardCopied,
        refreshedGuard,
        escapeClosed,
        outsideClosed,
        hasSteamWindow: Boolean(document.querySelector('.manual-login-dialog .steam-account-column')),
        sharedGuard,
        sameAccount: order?.accountId === boundAccountId,
        hasOrderScene: sceneEvents.includes('order'),
        hasSteamScene: sceneEvents.includes('steam'),
      };
    });
    assert(
      standaloneInteractionResult.accountVisible && standaloneInteractionResult.passwordVisible,
      '独立凭据查看/隐藏交互异常',
    );
    assert(standaloneInteractionResult.repeatableCopy, '独立凭据重复复制异常');
    assert(
      standaloneInteractionResult.guardLoading
        && /^[23456789BCDFGHJKMNPQRTVWXY]{5}$/.test(standaloneInteractionResult.firstGuard)
        && standaloneInteractionResult.guardVisible
        && standaloneInteractionResult.guardCopied,
      '独立凭据验证码获取或复制异常',
    );
    assert(
      /^[23456789BCDFGHJKMNPQRTVWXY]{5}$/.test(standaloneInteractionResult.refreshedGuard),
      '独立凭据验证码刷新异常',
    );
    assert(
      standaloneInteractionResult.escapeClosed && standaloneInteractionResult.outsideClosed,
      '独立凭据弹窗关闭交互异常',
    );
    assert(
      standaloneInteractionResult.hasSteamWindow
        && standaloneInteractionResult.sharedGuard === standaloneInteractionResult.refreshedGuard
        && standaloneInteractionResult.sameAccount,
      '订单入口与 Steam 手动登录未共用账号或有效验证码',
    );
    assert(
      standaloneInteractionResult.hasOrderScene && standaloneInteractionResult.hasSteamScene,
      '登录信息埋点未区分 order/steam 场景',
    );

    await capture(page, 'c07-order-login-information.png', 'order-detail', async (currentPage) => {
      const result = await currentPage.evaluate(async () => {
        state.selectedOrderId = 'GS20260713001';
        navigate('mac', 'order-detail');
        await nextPaint();
        document.querySelector('[data-action="open-manual-login"]')?.click();
        await nextPaint();
        const dialog = document.querySelector('.standalone-credential-dialog');
        const account = accounts.find((item) => item.id === orders.find(
          (order) => order.id === state.selectedOrderId,
        )?.accountId);
        return {
          hasDialog: Boolean(dialog),
          title: dialog?.querySelector('h3')?.textContent.trim(),
          hasSteamColumns: Boolean(dialog?.querySelector('.steam-account-column, .steam-qr-column')),
          hasBottomAction: Boolean(dialog?.querySelector('.order-confirm-actions')),
          accountMasked: Boolean(account && !dialog?.textContent.includes(account.loginName)),
          passwordMasked: Boolean(account && !dialog?.textContent.includes(account.loginPassword)),
          closeCount: dialog?.querySelectorAll('[data-action="confirm-no"]').length || 0,
        };
      });
      assert(result.hasDialog && result.title === 'Steam 登录信息', '独立登录信息弹窗未正确展示');
      assert(!result.hasSteamColumns, '独立登录信息弹窗错误包含 Steam 双栏');
      assert(!result.hasBottomAction && result.closeCount === 1, '独立登录信息弹窗关闭操作不符合要求');
      assert(result.accountMasked && result.passwordMasked, '独立登录信息弹窗默认未遮罩凭据');
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
          hasSteamWindow: Boolean(dialog?.querySelector('.steam-native-login')),
          hasAccountColumn: Boolean(dialog?.querySelector('.steam-account-column')),
          hasQrColumn: Boolean(dialog?.querySelector('.steam-qr-column')),
          hasQrVisual: Boolean(dialog?.querySelector('.steam-qr-visual svg')),
          hasCredentialEntry: Boolean(dialog?.querySelector('[data-action="open-credential-popover"]')),
          entryExpanded: dialog?.querySelector('[data-action="open-credential-popover"]')?.getAttribute('aria-expanded'),
          hasCredentialPopover: Boolean(dialog?.querySelector('.rental-credential-popover')),
          hasAccountInput: Boolean(dialog?.querySelector('#steamAccountInput')),
          hasPasswordInput: Boolean(dialog?.querySelector('#steamPasswordInput')),
          guard: dialog?.querySelector('[data-guard-value]')?.textContent.trim(),
          countdown: dialog?.querySelector('[data-guard-countdown]')?.textContent.trim(),
          dialogWidth: dialog?.getBoundingClientRect().width,
          dialogHeight: dialog?.getBoundingClientRect().height,
          obsoleteText: /步骤\s*[12]\/2|盖世登录助手|验证中/.test(dialog?.textContent || ''),
        };
      });
      assert(result.entryText.includes('登录 Steam'), '游戏库未显示 Steam 登录入口');
      assert(result.orderId === 'GS20260713001', '游戏库登录入口未绑定当前有效使用单');
      assert(
        result.hasSteamWindow
          && result.hasAccountColumn
          && result.hasQrColumn
          && result.hasQrVisual,
        '未打开完整 Steam 双栏登录窗口',
      );
      assert(result.hasCredentialEntry && result.entryExpanded === 'false', '租号登录信息入口缺失或默认展开');
      assert(result.hasAccountInput && result.hasPasswordInput, 'Steam 账号密码输入区不完整');
      assert(!result.hasCredentialPopover && !result.guard && !result.countdown, '默认状态提前展示凭据或验证码');
      assert(result.dialogWidth >= 900 && result.dialogHeight >= 600, 'Steam 登录窗口尺寸不足');
      assert(!result.obsoleteText, 'Steam 登录窗口仍展示旧分步助手');
    });

    await capture(page, 'c05-manual-login-credentials.png', 'library', async (currentPage) => {
      const result = await currentPage.evaluate(async () => {
        state.steamSession = 'rental';
        state.activeRentalOrderId = 'GS20260713001';
        renderApp();
        await nextPaint();
        document.querySelector('[data-action="open-library-steam-login"]')?.click();
        await nextPaint();
        const accountInput = document.querySelector('#steamAccountInput');
        const passwordInput = document.querySelector('#steamPasswordInput');
        const rememberInput = document.querySelector('#steamRememberInput');
        accountInput.value = 'typed-in-steam';
        passwordInput.value = 'typed-password';
        rememberInput.checked = false;
        dispatchAction('open-credential-popover', { dataset: { id: 'GS20260713001' } });
        await nextPaint();
        dispatchAction('request-guard-code', { dataset: { id: 'GS20260713001' } });
        await new Promise((resolve) => setTimeout(resolve, 260));
        await nextPaint();
        const dialog = document.querySelector('.manual-login-dialog');
        const popover = dialog?.querySelector('.rental-credential-popover');
        const popoverRect = popover?.getBoundingClientRect();
        const accountColumnRect = dialog?.querySelector('.steam-account-column')?.getBoundingClientRect();
        return {
          hasPopover: Boolean(popover),
          entryExpanded: dialog?.querySelector('[data-action="open-credential-popover"]')?.getAttribute('aria-expanded'),
          hasAccountInput: Boolean(dialog?.querySelector('#steamAccountInput')),
          hasPasswordInput: Boolean(dialog?.querySelector('#steamPasswordInput')),
          guard: dialog?.querySelector('[data-guard-value]')?.textContent.trim(),
          countdown: dialog?.querySelector('[data-guard-countdown]')?.textContent.trim(),
          popoverText: popover?.textContent,
          passwordMasked: popover?.querySelector('.credential-password-value')?.textContent.trim(),
          hasAccountCopy: Boolean(popover?.querySelector('[data-action="copy-login-account"]')),
          hasPasswordCopy: Boolean(popover?.querySelector('[data-action="copy-login-password"]')),
          hasGuardCopy: Boolean(popover?.querySelector('[data-action="copy-guard-code"]')),
          hasGuardRefresh: Boolean(popover?.querySelector('[data-action="request-guard-code"]')),
          popoverOverlapsAccountColumn: Boolean(
            popoverRect
              && accountColumnRect
              && popoverRect.left < accountColumnRect.right,
          ),
          accountInputValue: accountInput.value,
          passwordInputValue: passwordInput.value,
          rememberChecked: rememberInput.checked,
        };
      });
      assert(result.hasPopover && result.entryExpanded === 'true', '租号登录信息浮层未打开');
      assert(result.hasAccountInput && result.hasPasswordInput, '打开凭据浮层后 Steam 表单丢失');
      assert(/^[23456789BCDFGHJKMNPQRTVWXY]{5}$/.test(result.guard), 'Steam Guard 验证码未按需生成');
      assert(result.countdown.includes('秒后失效'), 'Steam Guard 验证码缺少倒计时');
      assert(result.passwordMasked === '••••••••••', '凭据浮层密码未默认遮罩');
      assert(
        result.hasAccountCopy
          && result.hasPasswordCopy
          && result.hasGuardCopy
          && result.hasGuardRefresh,
        '凭据复制或验证码刷新操作不完整',
      );
      assert(!result.popoverOverlapsAccountColumn, '凭据浮层遮挡 Steam 左侧账号登录区');
      assert(
        result.accountInputValue === 'typed-in-steam'
          && result.passwordInputValue === 'typed-password'
          && result.rememberChecked === false,
        '凭据浮层局部更新导致 Steam 表单状态丢失',
      );
      assert(!/步骤\s*[12]\/2|返回账号密码|验证中|盖世登录助手/.test(result.popoverText || ''), '浮层仍展示旧分步助手文案');
    });

    assert(pageErrors.length === 0, `截图页面脚本错误：${pageErrors.join(' | ')}`);
    await page.close();
    process.stdout.write(`PASS smoke=${smokeCount}, screenshots=9\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});

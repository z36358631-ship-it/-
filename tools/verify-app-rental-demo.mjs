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

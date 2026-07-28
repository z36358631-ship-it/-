import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, 'demos', '充值与商城', '云存档付费demo.html');
const output = path.join(root, 'public', 'prd', 'cloud-save-monthly');
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find(fs.existsSync);

assert(executablePath, 'Local Chrome not found');
assert(fs.existsSync(demo), `Demo not found: ${demo}`);
fs.mkdirSync(output, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({
  viewport: { width: 1280, height: 1000 },
  deviceScaleFactor: 1,
});
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

async function loadFresh() {
  await page.goto(pathToFileURL(demo).href);
  await page.waitForLoadState('load');
  await page.waitForSelector('#app');
  await page.waitForFunction(() =>
    Array.from(document.images).every(image => image.complete),
  );
}

async function assertFullyInsideApp(locator, label) {
  await assert.doesNotReject(
    () => locator.waitFor({ state: 'visible' }),
    `${label} is not visible`,
  );
  const [appBox, box] = await Promise.all([
    page.locator('#app').boundingBox(),
    locator.boundingBox(),
  ]);
  assert(appBox && box, `${label} has no bounding box`);
  const tolerance = 1;
  assert(
    box.x >= appBox.x - tolerance
      && box.y >= appBox.y - tolerance
      && box.x + box.width <= appBox.x + appBox.width + tolerance
      && box.y + box.height <= appBox.y + appBox.height + tolerance,
    `${label} is clipped outside #app`,
  );
}

async function capture(name, prepare, verify) {
  await loadFresh();
  await prepare(page);
  await page.waitForFunction(() => {
    const toast = document.querySelector('#toast');
    return !toast || !toast.classList.contains('show');
  });
  await page.waitForTimeout(120);
  await verify(page);
  await page.locator('#app').screenshot({
    path: path.join(output, name),
    animations: 'disabled',
  });
  const stats = fs.statSync(path.join(output, name));
  assert(stats.size > 10 * 1024, `${name} is unexpectedly small (${stats.size} bytes)`);
  console.log(`Captured ${name} (${stats.size} bytes)`);
}

const shots = [
  {
    name: '01-save-plaza.png',
    prepare: async () => {},
    verify: async currentPage => {
      assert.equal(
        await currentPage.locator('#packageSlot').count(),
        0,
        '存档广场仍有顶部套餐销售卡容器',
      );
      assert.equal(
        await currentPage.locator('#sec-plaza .status-card').count(),
        0,
        '存档广场仍有顶部套餐销售卡',
      );
      assert.deepEqual(
        await currentPage.locator('#sec-plaza .sc-btn').allInnerTexts(),
        ['购买', '购买', '购买', '购买', '购买'],
        '存档广场无权益卡片未统一为单一“购买”入口',
      );
    },
  },
  {
    name: '03-save-detail.png',
    prepare: async currentPage => {
      await currentPage.locator('#sec-plaza .save-card').first().click();
      await currentPage.waitForSelector('#detailPage.show');
    },
    verify: async currentPage => {
      const footer = currentPage.locator('#detailPage .d-footer');
      assert.equal(
        await footer.getByRole('button').count(),
        1,
        '无权益存档详情仍有重复购买入口',
      );
      assert.equal(
        (await footer.getByRole('button').innerText()).trim(),
        '购买',
        '无权益存档详情主入口未统一为“购买”',
      );
      const text = await footer.innerText();
      assert(
        !text.includes('¥6') && !text.includes('¥18'),
        '存档详情仍直接显示价格型购买入口',
      );
      await assertFullyInsideApp(footer.getByRole('button'), '存档详情购买按钮');
    },
  },
  {
    name: '04-monthly-pass-detail.png',
    prepare: async currentPage => {
      await currentPage.locator('#sec-plaza .sc-btn').first().click();
      await currentPage.waitForSelector('#checkoutLayer.show');
    },
    verify: async currentPage => {
      assert.equal(
        await currentPage.locator('[data-checkout-plan="single"].selected').count(),
        1,
        '订单确认页未默认选择 ¥6',
      );
      assert.equal(
        await currentPage.locator('[data-checkout-payment="alipay"]').count(),
        1,
        '订单确认页缺少支付宝',
      );
      assert.equal(
        await currentPage.locator('[data-checkout-payment="wechat"]').count(),
        1,
        '订单确认页缺少微信支付',
      );
      const confirm = currentPage.locator('[data-action="checkout-confirm"]');
      assert.equal((await confirm.innerText()).trim(), '确认支付 · ¥6');
      await assertFullyInsideApp(
        currentPage.locator('[data-checkout-payment="alipay"]'),
        '支付宝',
      );
      await assertFullyInsideApp(
        currentPage.locator('[data-checkout-payment="wechat"]'),
        '微信支付',
      );
      await assertFullyInsideApp(confirm, '确认支付 · ¥6');
    },
  },
  {
    name: '05-my-saves.png',
    prepare: async currentPage => {
      await currentPage.evaluate(() => {
        window.CloudSaveDemo.openCheckout(0, { preferredPlan: 'single', source: 'capture' });
      });
      await currentPage.locator('[data-action="checkout-confirm"]').click();
      await currentPage.locator('[data-action="payment-success"]').click();
      await currentPage.locator('.stab').nth(1).click();
      await currentPage.waitForTimeout(2100);
    },
    verify: async currentPage => {
      const mine = currentPage.locator('#sec-mine');
      const text = await mine.innerText();
      assert(text.includes('本地存档'), '我的存档缺少“本地存档”分区');
      assert(text.includes('已获得存档'), '我的存档缺少“已获得存档”合并分区');
      assert(text.includes('永久拥有'), '永久购买的存档未显示在“已获得存档”');
      assert(!text.includes('自动存档/已购存档'), '我的存档仍显示旧合并文案');
      assert(!text.includes('月包存档') && !text.includes('已购存档'), '我的存档仍保留旧分区');
    },
  },
  {
    name: '06-monthly-pass-my-saves.png',
    prepare: async currentPage => {
      await currentPage.evaluate(() => window.CloudSaveDemo.setDemoState('active'));
      await currentPage.locator('.stab').nth(1).click();
    },
    verify: async currentPage => {
      assert.equal(
        await currentPage.locator('#sec-mine .status-card').count(),
        0,
        '我的存档仍有顶部套餐销售卡',
      );
      assert.equal(
        await currentPage.locator('#sec-mine').getByText(/已获得存档/).count(),
        1,
        '缺少“已获得存档”合并分区',
      );
      assert.equal(
        await currentPage.locator('#sec-mine').getByText(/月度套餐有效至/).count(),
        1,
        '缺少月度套餐有效期',
      );
      await assertFullyInsideApp(
        currentPage.locator('#sec-mine').getByText(/月度套餐有效至/),
        '月度套餐有效期',
      );
    },
  },
  {
    name: '08-ingame-save-market.png',
    prepare: async currentPage => {
      await currentPage.getByRole('button', { name: /游戏中模式/ }).click();
    },
    verify: async currentPage => {
      const cards = currentPage.locator('#igBody > div > div');
      assert.equal(await cards.count(), 5, '游戏中存档广场卡片数量异常');
      for (let index = 0; index < await cards.count(); index += 1) {
        const card = cards.nth(index);
        assert.equal(
          await card.getByRole('button').count(),
          1,
          `游戏中存档广场第 ${index + 1} 张卡存在重复购买入口`,
        );
        assert.equal(
          (await card.getByRole('button').innerText()).trim(),
          '购买',
          `游戏中存档广场第 ${index + 1} 张卡入口不是“购买”`,
        );
      }
      const text = await currentPage.locator('#igBody').innerText();
      assert(!text.includes('¥6') && !text.includes('¥18'), '游戏中广场仍显示双价格入口');
    },
  },
  {
    name: '09-ingame-my-saves.png',
    prepare: async currentPage => {
      await currentPage.evaluate(() => window.CloudSaveDemo.setDemoState('active'));
      await currentPage.getByRole('button', { name: /游戏中模式/ }).click();
      await currentPage.locator('.ig-tab').nth(1).click();
    },
    verify: async currentPage => {
      const body = currentPage.locator('#igBody');
      const text = await body.innerText();
      assert(text.includes('本地存档'), '游戏中“我的存档”缺少本地存档分区');
      assert(text.includes('已获得存档'), '游戏中“我的存档”缺少已获得存档合并分区');
      assert(text.includes('月度套餐有效至'), '游戏中“我的存档”缺少套餐有效期');
      assert(text.includes('我的寄售'), '游戏中“我的存档”缺少我的寄售分区');
      assert(!text.includes('月包存档') && !text.includes('已购存档'), '游戏中仍保留旧分区');
    },
  },
  {
    name: '10-monthly-pass-expired.png',
    prepare: async currentPage => {
      await currentPage.evaluate(() => window.CloudSaveDemo.setDemoState('expired'));
      await currentPage.locator('.stab').nth(1).click();
    },
    verify: async currentPage => {
      const mine = currentPage.locator('#sec-mine');
      assert.equal(
        await mine.getByText(/已获得存档/).count(),
        1,
        '到期状态缺少“已获得存档”分区',
      );
      assert.equal(
        await mine.getByText(/月度套餐已于/).count(),
        1,
        '到期状态缺少套餐到期时间',
      );
      assert(
        await mine.getByText('续费后使用', { exact: true }).count() > 0,
        '到期存档未保留“续费后使用”入口',
      );
      await assertFullyInsideApp(
        mine.getByText('续费后使用', { exact: true }).first(),
        '续费后使用',
      );
    },
  },
];

try {
  for (const shot of shots) {
    await capture(shot.name, shot.prepare, shot.verify);
  }
  assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join(' | ')}`);
  console.log(`Captured ${shots.length} cloud save checkout PRD screenshots`);
} finally {
  await browser.close();
}

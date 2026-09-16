import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cDemo = path.join(root, 'demos', '游戏详情', 'GUANWANGGAID-25-兼容性评价改版-C端demo.html');
const bDemo = path.join(root, 'demos', '后台管理', 'GUANWANGGAID-25-兼容性评价改版-B端demo.html');
const resultsRoot = path.join(root, 'test-results');
const outDir = path.join(resultsRoot, 'compatibility-review-v1.2');
const executablePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean).find(fs.existsSync);

if (!executablePath) throw new Error('浏览器依赖未安装：未找到本地 Chrome 或 Edge');
if (!path.resolve(outDir).startsWith(`${path.resolve(resultsRoot)}${path.sep}`)) {
  throw new Error(`拒绝清理非预期输出目录：${outDir}`);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--allow-file-access-from-files', '--disable-background-networking'],
});

const captured = [];

function requireDemo(file, label) {
  if (!fs.existsSync(file)) throw new Error(`未实现契约：${label} Demo 文件不存在\n${file}`);
}

async function openDemo(file, label, viewport) {
  requireDemo(file, label);
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  // The demo's orientation initializer finishes a 350 ms close transition.
  // Wait it out before driving a state so that its delayed hide cannot race the capture.
  await page.waitForTimeout(420);
  return { page, errors, label };
}

async function requireOne(page, selector, contract) {
  const count = await page.locator(selector).count();
  if (count !== 1) {
    throw new Error(`未实现契约：${contract} (${selector})，实际节点数 ${count}`);
  }
}

async function domClick(page, selector, contract) {
  await requireOne(page, selector, contract);
  await page.locator(selector).evaluate((element) => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  });
  await page.waitForTimeout(420);
}

async function shot(page, filename, { fullPage = true } = {}) {
  const output = path.join(outDir, filename);
  await page.screenshot({ path: output, fullPage });
  if (!fs.existsSync(output) || fs.statSync(output).size === 0) {
    throw new Error(`截图未生成：${output}`);
  }
  captured.push(output);
  console.log(output);
}

function assertNoPageErrors(errors, label) {
  if (errors.length) throw new Error(`${label} 产生 pageerror：\n${errors.join('\n')}`);
}

async function captureCConnectedJourney() {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 390, height: 844 });
  try {
    await requireOne(page, '#gameHeroWireframe', '游戏详情主媒体线框');
    await requireOne(page, '#startGameButton', '启动游戏按钮');
    await shot(page, '01-c-game-detail-wireframe-390x844.png');

    await domClick(page, '#openCompatibilityReviews', '兼容性评价入口');
    await requireOne(page, '[data-review-state="valid"] .review-solution-card', '有效方案评价卡');
    await shot(page, '02-c-review-list-390x844.png');

    await domClick(page, '[data-review-state="valid"] .review-solution-card', '有效方案卡');
    await requireOne(page, '#solutionDetailPage:not([hidden])', '可见方案详情页');
    await requireOne(page, '#solutionConfidenceLine', '方案可信度信息');
    await shot(page, '03-c-solution-detail-390x844.png');

    await domClick(page, '#applySolutionButton', '应用方案');
    if (await page.locator('#solutionDetailPage').isVisible()) {
      throw new Error('未实现契约：应用方案后未返回游戏详情');
    }
    if (!/Adreno 750 稳定方案/.test(await page.locator('#currentAppliedSolution').innerText())) {
      throw new Error('未实现契约：游戏详情未展示当前已应用方案');
    }
    if (await page.locator('#gameplayLayer').isVisible()) {
      throw new Error('未实现契约：应用方案后不应自动启动游戏');
    }
    await page.waitForFunction(() => !document.getElementById('toast')?.classList.contains('show'));
    await page.waitForTimeout(420);
    await shot(page, '04-c-applied-solution-detail-390x844.png');

    await requireOne(page, '#startGameButton', '启动游戏按钮');
    await page.click('#startGameButton');
    await page.waitForFunction(() => document.body.dataset.journeyStage === 'launching');
    await shot(page, '05-c-launching-390x844.png');

    await page.waitForFunction(() => document.body.dataset.journeyStage === 'gameplay');
    await page.setViewportSize({ width: 844, height: 390 });
    await requireOne(page, '#gameplayLayer:not([hidden])', '横屏游戏层');
    await shot(page, '06-c-gameplay-wireframe-844x390.png', { fullPage: false });

    await domClick(page, '#exitGameButton', '退出游戏入口');
    await requireOne(page, '#exitGameConfirm:not([hidden])', '退出游戏确认弹窗');
    await shot(page, '07-c-exit-confirm-844x390.png', { fullPage: false });

    await page.click('#confirmExitGameButton');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.getElementById('modalFeedback')?.classList.contains('show'));
    await page.click('#fbStarsWrap [data-val="5"]');
    await requireOne(page, '#linkCurrentSolutionCheckbox', '关联本次实际使用方案勾选项');
    await shot(page, '08-c-proactive-review-390x844.png');

    await page.check('#linkCurrentSolutionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    await page.waitForFunction(() => document.getElementById('compatPage')?.classList.contains('show'));
    await requireOne(page, '[data-owner="me"]', '提交后的我的评价');
    const mine = await page.evaluate(() => window.getFeedbacks().find((item) => item.uid === 'me_demo_user'));
    if (mine?.solutionId !== 'solution_public_01') {
      throw new Error('未实现契约：我的评价未关联本次应用的公开方案');
    }
    await page.waitForFunction(() => !document.getElementById('toast')?.classList.contains('show'));
    await page.waitForTimeout(420);
    await shot(page, '09-c-my-linked-review-390x844.png');
    assertNoPageErrors(errors, 'C 端连续旅程截图');
  } finally {
    await page.close();
  }
}

async function captureBLinkedFilter() {
  const { page, errors } = await openDemo(bDemo, 'B 端', { width: 1440, height: 900 });
  try {
    await requireOne(page, '#dom-fb-solution-linked', '是否关联方案筛选');
    await requireOne(page, '#dom-fb-solution-status', '方案状态筛选');
    await page.selectOption('#dom-fb-solution-linked', 'linked');
    await page.selectOption('#dom-fb-solution-status', 'published');
    await domClick(page, '#dom-query-feedbacks', '国内评价查询');
    const rows = page.locator('#dom-fb-tbody tr[data-feedback-id]');
    if (await rows.count() === 0) throw new Error('未实现契约：B 端有效关联方案筛选无演示数据');
    await rows.first().locator('[data-action="view-solution"]').click();
    if (await page.locator('#compat-solution-detail-drawer').getAttribute('aria-hidden') !== 'false') {
      throw new Error('未实现契约：B 端关联方案预览未打开');
    }
    await shot(page, '10-b-linked-filter-solution-drawer-1440x900.png');
    assertNoPageErrors(errors, 'B 端筛选与方案预览截图');
  } finally {
    await page.close();
  }
}

try {
  await captureCConnectedJourney();
  await captureBLinkedFilter();
  if (captured.length !== 10) throw new Error(`截图数量错误：预期 10，实际 ${captured.length}`);
} finally {
  await browser.close();
}

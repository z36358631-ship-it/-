import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, 'demos', 'PC与Mac端', 'Mac原生游戏版本管理demo.html');
const outputDir = path.join(root, 'public', 'prd', 'mac-native-version-management');
const reportPath = path.join(root, 'test-results', 'mac-native-v17-browser-report.json');
const executableCandidates = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const executablePath = executableCandidates.find(fs.existsSync);

assert(executablePath, '未找到可用于截图的 Edge 或 Chrome');
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(7000);

const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

async function resetDemo() {
  await page.goto(pathToFileURL(demo).href);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('gamehub-last-install-path', 'applications');
  });
  await page.reload();
  await page.locator('#page-library.active').waitFor();
}

async function chooseNativeVersion() {
  await page.locator('[data-action="open-detail"]').first().click();
  await page.locator('#page-detail.active').waitFor();
  await page.locator('[data-action="toggle-detail-more"]').click();
  await page.locator('[data-action="open-version-switch"]').click();
  await page.locator('#versionSwitchOverlay.show').waitFor();
  await page.locator('[data-action="choose-version"][data-version="native"]').click();
  await page.locator('#versionSwitchOverlay').waitFor({ state: 'hidden' });
  await page.locator('#detailCta').click();
  await page.locator('#installOverlay.show').waitFor();
}

async function capture(filename) {
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outputDir, filename) });
}

const checks = {};

await resetDemo();
const nativeCard = page.locator('[data-demo-case="installed-epic-native"]');
const platformBox = await nativeCard.locator('.platform-chip').boundingBox();
const appleBox = await nativeCard.locator('.native-chip.show').boundingBox();
const badgeStyles = await nativeCard.locator('.platform-badges').evaluate(element => {
  const platform = getComputedStyle(element.querySelector('.platform-chip'));
  const apple = getComputedStyle(element.querySelector('.native-chip'));
  const parent = getComputedStyle(element);
  return {
    platformBackground: platform.backgroundColor,
    appleBackground: apple.backgroundColor,
    platformBorder: platform.borderTopWidth,
    appleBorder: apple.borderTopWidth,
    parentBackground: parent.backgroundColor,
  };
});
checks.independentPlatformBadges = {
  gap: appleBox.x - (platformBox.x + platformBox.width),
  ...badgeStyles,
};
assert(checks.independentPlatformBadges.gap >= 3, 'Steam 与 Apple 图标之间应保留独立间距');
assert.notEqual(badgeStyles.platformBackground, 'rgba(0, 0, 0, 0)', 'Steam 图标应有独立底色');
assert.notEqual(badgeStyles.appleBackground, 'rgba(0, 0, 0, 0)', 'Apple 图标应有独立底色');
assert.equal(badgeStyles.parentBackground, 'rgba(0, 0, 0, 0)', '平台图标父容器不得形成共同胶囊');
await capture('07-game-library-platform-badges.png');

await chooseNativeVersion();
checks.defaultInstallPath = (await page.locator('#selectedInstallPath').textContent())?.trim();
checks.pathHint = (await page.locator('.install-path-hint').textContent())?.trim();
const pathCopyBox = await page.locator('#installPathTrigger .install-path-copy').boundingBox();
const pathHintBox = await page.locator('.install-path-hint').boundingBox();
checks.pathHintOnSeparateLine = pathHintBox.y >= pathCopyBox.y + pathCopyBox.height - 1;
checks.installProgressElementCount = await page.locator('#progress, #progressBar').count();
assert.equal(checks.defaultInstallPath, '/Applications/GameHub/', '应默认恢复上一次成功安装路径');
assert.equal(checks.pathHint, '安装到其他位置', '收起态应常驻显示其他位置引导');
assert.equal(checks.pathHintOnSeparateLine, true, '其他位置引导应在控件内另起一行');
assert.equal(checks.installProgressElementCount, 0, '安装弹窗不得显示下载进度条');
await capture('04-path-largest-default.png');

await page.locator('#installPathTrigger').click();
await page.locator('#installPathField.open #installPathMenu').waitFor();
checks.pathOptionCount = await page.locator('#installPathMenu .install-path-option').count();
checks.customEntryVisible = await page.locator('[data-action="choose-custom-install-path"]').isVisible();
assert.equal(checks.pathOptionCount, 4, '展开菜单应展示全部候选路径');
assert.equal(checks.customEntryVisible, true, '展开菜单应提供安装到其他位置入口');
await capture('08-path-dropdown-expanded.png');

await page.locator('[data-action="choose-custom-install-path"]').click();
checks.customPath = (await page.locator('#selectedInstallPath').textContent())?.trim();
checks.menuClosedAfterCustomPath = await page.locator('#installPathField.open').count() === 0;
assert.equal(checks.customPath, '/Volumes/My Games/GameHub/', '选择其他位置后应更新当前安装路径');
assert.equal(checks.menuClosedAfterCustomPath, true, '选择其他位置后下拉菜单应收起');

await page.locator('#installBtn').click();
await page.locator('#installOverlay').waitFor({ state: 'hidden' });
checks.progressAfterInstall = (await page.locator('#detailCta').textContent())?.trim();
assert.match(checks.progressAfterInstall, /正在下载\s+\d+%/, '安装提交后详情主按钮应展示后台下载进度');

assert.deepEqual(pageErrors, [], `页面脚本错误：${pageErrors.join('; ')}`);
assert.deepEqual(consoleErrors, [], `控制台错误：${consoleErrors.join('; ')}`);

const report = {
  generatedAt: new Date().toISOString(),
  demo: pathToFileURL(demo).href,
  executablePath,
  screenshots: [
    '04-path-largest-default.png',
    '07-game-library-platform-badges.png',
    '08-path-dropdown-expanded.png',
  ],
  checks,
  pageErrors,
  consoleErrors,
};

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await browser.close();

console.log(`Captured ${report.screenshots.length} Mac native V1.7 screenshots`);
console.log(`Report: ${reportPath}`);

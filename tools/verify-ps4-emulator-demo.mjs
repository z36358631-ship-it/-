import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('C:/Users/z3635/AppData/Local/npm-cache/_npx/67dcf0932bafa1af/node_modules/playwright'));
}

const root = path.resolve(import.meta.dirname, '..');
const demo = path.join(root, 'demos', 'APP-PS4模拟器', '盖世游戏APP-主机模拟器接入demo.html');
const base = pathToFileURL(demo).href;
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
];
let executablePath;
for (const candidate of chromeCandidates) {
  try { await fs.access(candidate); executablePath = candidate; break; } catch {}
}

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const errors = [];
const checks = [];
page.on('pageerror', error => errors.push(error.message));

function assert(condition, message) {
  if (!condition) throw new Error(message);
  checks.push(message);
}
async function open(scene) {
  await page.goto(`${base}?scene=${scene}`, { waitUntil: 'load' });
  await page.waitForTimeout(80);
}

await open('library');
const portraitTabs = await page.locator('.phone .tab').allTextContents();
assert(JSON.stringify(portraitTabs) === JSON.stringify(['PC游戏', '主机游戏', '复古游戏']), '竖版仅显示三级 Tab 且顺序正确');
assert(await page.locator('.phone .game-card').count() === 2, '竖版主机游戏显示双列游戏卡');
assert(await page.getByRole('button', { name: '启动' }).count() === 2, '每张竖版游戏卡都有独立启动按钮');
await page.getByRole('button', { name: 'PC游戏' }).click();
assert(await page.getByText('空洞骑士：丝之歌', { exact: true }).isVisible(), '竖版 PC 游戏 Tab 可切换并展示独立数据');
await page.getByRole('button', { name: '复古游戏' }).click();
assert(await page.getByText('像素冒险', { exact: true }).isVisible(), '竖版复古游戏 Tab 可切换并展示独立数据');
await page.getByRole('button', { name: '主机游戏' }).click();
await page.getByPlaceholder('搜索游戏名').fill('深空');
await page.waitForTimeout(80);
assert(await page.locator('.phone .game-card').count() === 1, '竖版分类内搜索可过滤本地游戏');
await page.getByPlaceholder('搜索游戏名').fill('不存在');
assert(await page.getByText('未找到相关游戏').isVisible(), '竖版搜索无结果展示独立空状态');
await page.getByRole('button', { name: '清空搜索' }).click();
assert(await page.locator('.phone .game-card').count() === 2, '清空搜索恢复当前分类全部游戏');
await page.getByTitle('切换视图').click();
assert(await page.locator('.phone .game-grid.list').isVisible(), '竖版网格和列表视图可切换');
await page.getByTitle('排序').click();
assert(await page.getByText(/已按名称排序|已按最近安装排序/).isVisible(), '竖版排序操作提供可观察反馈');

await open('library_landscape');
const landscapeTabs = await page.locator('.landscape .tab').allTextContents();
assert(JSON.stringify(landscapeTabs) === JSON.stringify(['PC游戏', '主机游戏', '复古游戏']), '横版仅显示三级 Tab 且顺序正确');
assert(await page.locator('.landscape .l-game-grid').isVisible(), '横版使用独立多列游戏网格');
assert(await page.locator('.landscape input[placeholder="搜索游戏名"]').isVisible(), '横版搜索位于工具区右侧');
await page.locator('.landscape').getByRole('button', { name: 'PC游戏' }).click();
assert(await page.locator('.landscape').getByText('空洞骑士：丝之歌', { exact: true }).isVisible(), '横版 PC 游戏 Tab 可切换');
await page.locator('.landscape').getByRole('button', { name: '主机游戏' }).click();
await page.locator('.landscape input[placeholder="搜索游戏名"]').fill('深空');
assert(await page.locator('.landscape .l-card').count() === 1, '横版分类内搜索可过滤本地游戏');
await open('library_landscape');
await page.locator('.landscape').getByRole('button', { name: /导入游戏/ }).click();
await page.locator('.landscape').getByRole('button', { name: '×' }).click();
assert(await page.locator('.landscape .l-game-grid').isVisible(), '横版导入弹窗关闭后返回横版游戏库');

await open('import');
assert(await page.locator('.option').count() === 2, '导入弹窗仅保留两个入口');
assert(await page.getByText('请仅导入').count() === 0, '导入弹窗已移除底部说明文案');
await page.getByRole('button', { name: '×' }).click();
assert(await page.locator('.phone .game-grid').isVisible(), '竖版导入弹窗关闭后返回原游戏库');
await open('import');
await page.getByRole('button', { name: /选择 PKG/ }).click();
assert(await page.getByText('文件管理器', { exact: true }).isVisible(), '选择 PKG 直接进入文件管理器');
await page.getByText('CUSA20344_update_v1.09.pkg').click();
assert(await page.locator('.fm-row.selected').count() === 1, 'PKG 文件管理器仅允许单选');
await page.getByRole('button', { name: '选择此文件' }).click();
assert(await page.getByText('识别游戏文件').isVisible(), '单 PKG 选择后进入识别页');
assert(await page.locator('.check').count() === 0, '单 PKG 识别页不出现批量勾选');
await page.getByRole('button', { name: '解压并安装' }).click();
assert(await page.getByText('正在安装 PKG').isVisible(), '单 PKG 进入解压安装状态');
await page.waitForTimeout(4200);
assert(await page.locator('.phone .game-grid').isVisible(), '单 PKG 安装完成后自动返回主机游戏库');

await open('folderPicker');
await page.getByText('Download', { exact: true }).click();
assert(await page.locator('.fm-row.selected').getByText('Download', { exact: true }).isVisible(), '文件夹选择器支持切换所选目录');
await page.getByRole('button', { name: '选择此文件夹' }).click();
await page.getByRole('button', { name: '查看识别结果' }).click();
assert(await page.locator('.file-card').count() === 3, '文件夹扫描后展示已识别游戏列表和异常项');
await page.getByText('暗夜余烬', { exact: true }).click();
await page.getByText('深空旅人', { exact: true }).click();
assert(!(await page.getByRole('button', { name: '安装已选游戏' }).isEnabled()), '未勾选游戏时安装按钮禁用');
await page.getByText('暗夜余烬', { exact: true }).click();
assert(await page.getByRole('button', { name: '安装已选游戏' }).isEnabled(), '勾选游戏后允许安装');
await page.getByRole('button', { name: '安装已选游戏' }).click();
assert(await page.getByText(/正在安装第/).isVisible(), '文件夹勾选确认后创建批量安装任务');
await page.waitForTimeout(4200);
assert(await page.locator('.phone .game-grid').isVisible(), '文件夹批量安装完成后自动返回主机游戏库');

await open('more');
assert(await page.getByRole('button', { name: '存档管理', exact: true }).isVisible(), '更多菜单提供存档管理入口');
await page.getByRole('button', { name: '安装更新/DLC' }).click();
assert(await page.getByRole('button', { name: /选择 PKG/ }).isVisible(), '安装更新和 DLC 复用导入入口');
await page.getByRole('button', { name: '×' }).click();
await open('more');
await page.getByRole('button', { name: '存档管理', exact: true }).click();
assert(await page.getByRole('button', { name: /导入存档/ }).isVisible(), '存档导入位于页面右上角');
assert(await page.getByRole('button', { name: '刷新' }).count() === 0, '存档页不显示刷新按钮');
await page.getByRole('button', { name: '删除' }).first().click();
assert(await page.getByText('删除存档？').isVisible(), '删除存档弹出二次确认');
await page.getByRole('button', { name: '取消' }).click();
await page.getByRole('button', { name: /导入存档/ }).click();
assert(await page.getByText('选择存档文件').isVisible(), '导入存档进入文件管理器');
await page.getByRole('button', { name: '导入', exact: true }).click();
assert(await page.locator('.save-card').count() === 3, '存档导入成功后刷新列表');
await page.getByRole('button', { name: '导出' }).first().click();
assert(await page.getByText('导出存档', { exact: true }).isVisible(), '导出存档打开位置确认');
await page.locator('.confirm-card').getByRole('button', { name: '导出', exact: true }).click();
assert(await page.getByText('存档已导出').isVisible(), '导出完成后提供成功反馈');
await page.getByRole('button', { name: '删除' }).first().click();
await page.locator('.confirm-card').getByRole('button', { name: '删除', exact: true }).click();
assert(await page.locator('.save-card').count() === 2, '确认删除后存档从列表移除');

await open('settings');
await page.getByRole('button', { name: /图形驱动/ }).click();
assert(await page.getByText('已切换为系统 Vulkan 驱动').isVisible(), '图形驱动操作提供反馈');
const hapticSwitch = page.getByRole('button', { name: /触觉反馈/ }).locator('.switch');
await page.getByRole('button', { name: /触觉反馈/ }).click();
assert(!(await hapticSwitch.evaluate(el => el.classList.contains('on'))), '触觉反馈开关可切换');
await page.getByRole('button', { name: /按键与布局/ }).click();
await page.getByRole('button', { name: '紧凑布局' }).click();
assert(await page.getByRole('button', { name: '紧凑布局' }).evaluate(el => el.classList.contains('active')), '设置页布局卡可选择');

await open('playing');
assert(await page.locator('.pause-row .switch.on').isVisible(), '游戏内触控按键使用开关控件');
await page.getByRole('button', { name: /继续游戏/ }).click();
assert(await page.locator('.pause-card').count() === 0, '继续游戏关闭侧边菜单');
await page.getByRole('button', { name: '•••' }).click();
assert(await page.locator('.pause-card').isVisible(), '游戏内入口可再次打开侧边菜单');
await page.getByRole('button', { name: /显示触控按键/ }).click();
assert(await page.locator('.keys').count() === 0, '关闭触控按键后按键层隐藏');
await page.getByRole('button', { name: /按键与布局/ }).click();
assert(await page.locator('.ingame-panel').getByText('按键与布局').isVisible(), '按键与布局打开可操作二级面板');
await page.getByRole('button', { name: '保存' }).click();
await page.getByRole('button', { name: /手柄映射/ }).click();
assert(await page.locator('.ingame-panel').getByText('手柄映射').isVisible(), '手柄映射打开可操作二级面板');
await page.getByRole('button', { name: '保存' }).click();
await page.getByRole('button', { name: /退出游戏/ }).click();
assert(await page.getByText('退出游戏？').isVisible(), '退出游戏弹出二次确认');
await page.locator('.confirm-card').getByRole('button', { name: '继续游戏' }).click();
assert(await page.locator('.game-world').isVisible(), '取消退出后继续保留游戏');
await page.getByRole('button', { name: '•••' }).click();
await page.getByRole('button', { name: /退出游戏/ }).click();
await page.locator('.confirm-card').getByRole('button', { name: '退出游戏' }).click();
assert(await page.locator('.landscape .l-game-grid').isVisible(), '确认退出后返回横版主机游戏库');

await open('admin');
await page.getByRole('button', { name: '查询' }).click();
assert(await page.getByText('已按当前条件查询').isVisible(), '后台查询操作提供反馈');
await page.getByRole('button', { name: /新增版本/ }).click();
assert(await page.getByText('配置引擎版本').isVisible(), '后台新增版本打开配置弹窗');
await page.getByRole('button', { name: '保存' }).click();
assert(await page.getByText('版本配置已保存').isVisible(), '后台保存版本提供成功反馈');

await browser.close();
if (errors.length) throw new Error(`页面脚本错误：${errors.join(' | ')}`);
console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));

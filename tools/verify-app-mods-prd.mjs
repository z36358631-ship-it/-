import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prdPath = path.join(root, 'prd', 'ai生成', '【Prd】《盖世游戏》APP端MODS需求.md');
const verifyRemote = process.argv.includes('--remote');
const expectedSha = 'af6221681c93d0e89ec0963255c2681046b0a738';
const imageNames = [
  '01-game-more-menu-portrait.png',
  '08-game-more-menu-landscape.png',
  '02-browse-portrait.png',
  '03-installed-portrait.png',
  '04-detail-portrait.png',
  '05-browse-landscape.png',
  '06-detail-landscape.png',
  '07-installed-landscape.png'
];

assert.equal(fs.existsSync(prdPath), true, 'APP MODS PRD 缺失');
const markdown = fs.readFileSync(prdPath, 'utf8');

for (const heading of [
  '# 【Prd】《盖世游戏》APP端MODS需求',
  '## 一、版本信息',
  '## 二、背景与目标',
  '## 三、故事介绍',
  '## 四、概要设计',
  '### 4.2 详细设计（C端）',
  '## 五、非功能需求',
  '## 六、埋点需求',
  '## 七、运营需求',
  '## 九、验收标准',
  '## 十一、自检记录'
]) assert.match(markdown, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'));

assert.doesNotMatch(markdown, /### 4\.3 详细设计（B端）/u);
assert.doesNotMatch(markdown, /__IMAGE_SHA__|file:\/\/|localhost|@main|@master|\/blob\/main\//u);
assert.match(markdown, /国内包产品名显示“盖世游戏”/u);
assert.match(markdown, /海外包产品名显示“GameHub”/u);
assert.match(markdown, /热门 \/ 下载最多 \/ 最新发布/u);
assert.match(markdown, /暂无可更新的 MOD/u);
assert.match(markdown, /搜索框位于主 Tab 下方并独占一整行/u);
assert.match(markdown, /列表紧跟顶部筛选区，不预留搜索框空位/u);
assert.match(markdown, /卡片与内部按钮的键盘操作互不冲突/u);
assert.match(markdown, /详情限制焦点、支持 Esc 关闭并恢复触发点/u);
assert.match(markdown, /同一设备、同一游戏、同一 MOD 同时只能存在一条安装或更新任务/u);
assert.match(markdown, /安装、更新、启停和卸载共用一把设备操作锁/u);
assert.match(markdown, /其他 MOD 可继续浏览/u);
assert.match(markdown, /MOD ID 和区域单独隐藏/u);
assert.match(markdown, /MODS 页面无崩溃会话率≥99\.8%/u);
assert.match(markdown, /app_mods_task_create_result/u);
assert.match(markdown, /state_consistency_result/u);
assert.match(markdown, /AC-APP-LOCK-01/u);
assert.match(markdown, /AC-APP-NETWORK-03/u);
assert.match(markdown, /AC-APP-ROTATE-03/u);
assert.match(markdown, /AC-APP-REGION-02/u);
assert.match(markdown, verifyRemote ? /前端开发\|✓ 通过/u : /前端开发\|(?:✓ 通过|⚠️ 条件通过)/u);
assert.match(markdown, verifyRemote ? /测试工程师\|✓ 通过/u : /测试工程师\|(?:✓ 通过|⚠️ 条件通过)/u);
assert.match(markdown, /运营\/业务方\|✓ 通过/u);

const imageUrls = [...markdown.matchAll(/!\[[^\]]+\]\((https:\/\/cdn\.jsdelivr\.net\/gh\/z36358631-ship-it\/-@([0-9a-f]{40})\/public\/prd\/app-mods\/([^)]+\.png))\)/gu)];
assert.equal(imageUrls.length, imageNames.length, `PRD 图片数量应为 ${imageNames.length}`);
assert.deepEqual(
  imageUrls.map(match => match[3]).sort(),
  [...imageNames].sort(),
  'PRD 图片文件集合不正确'
);
assert(imageUrls.every(match => match[2] === expectedSha), 'PRD 图片没有统一使用固定提交 SHA');

const detailTableStart = markdown.indexOf('|模块名称|图示|展示&交互说明|');
const detailTableEnd = markdown.indexOf('#### 4.2.1 入口与业务隔离');
assert(detailTableStart >= 0 && detailTableEnd > detailTableStart, '4.2 页面表格范围缺失');
const detailTable = markdown.slice(detailTableStart, detailTableEnd);
assert.equal((detailTable.match(/!\[/gu) || []).length, imageNames.length, '图片没有全部放在 4.2 图示列');

for (const imageName of imageNames) {
  const localImage = path.join(root, 'public', 'prd', 'app-mods', imageName);
  assert.equal(fs.existsSync(localImage), true, `本地截图缺失：${imageName}`);
  assert(fs.statSync(localImage).size > 12000, `截图体积异常：${imageName}`);
}

console.log('PASS: APP MODS PRD 结构、页面、规则、验收与八张固定图片');

if (verifyRemote) {
  for (const [, url] of imageUrls) {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `${url} HTTP ${response.status}`);
    assert.equal(response.headers.get('content-type')?.split(';')[0], 'image/png', `${url} Content-Type 异常`);
    await response.arrayBuffer();
    console.log(`PASS: ${url} -> 200 image/png`);
  }
}

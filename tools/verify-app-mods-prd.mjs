import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prdPath = path.join(root, 'prd', 'ai生成', '【Prd】《盖世游戏》APP端MODS需求.md');
const verifyRemote = process.argv.includes('--remote');
const imageNames = [
  '01-game-more-menu-portrait.png',
  '08-game-more-menu-landscape.png',
  '02-browse-portrait.png',
  '03-installed-portrait.png',
  '04-detail-portrait.png',
  '05-browse-landscape.png',
  '06-detail-landscape.png',
  '07-installed-landscape.png',
  '09-steam-profile-mods-portrait.png',
  '10-steam-profile-mods-landscape.png'
];

assert.equal(fs.existsSync(prdPath), true, 'APP MODS PRD 缺失');
const markdown = fs.readFileSync(prdPath, 'utf8');

for (const heading of [
  '# 【Prd】《盖世游戏》APP端MODS需求',
  '## 一、版本信息',
  '## 二、背景与目标',
  '## 三、使用场景',
  '## 四、概要设计',
  '### 4.2 详细设计（C端）',
  '## 五、非功能需求',
  '## 六、埋点需求',
  '## 七、运营要求',
  '## 八、灰度与回退',
  '## 九、验收标准'
]) assert.match(markdown, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'));

assert.doesNotMatch(markdown, /### 4\.3 详细设计（B端）/u);
assert.doesNotMatch(markdown, /旨在|赋能|助力|沉浸式|提升体验|打造.{0,8}闭环|价值分析/u);
assert.doesNotMatch(markdown, /__IMAGE_SHA__|file:\/\/|localhost|@main|@master/u);

for (const rule of [
  /Steam 个人中心新增独立一级 Tab“MODS”/u,
  /仅展示当前设备已安装 MOD/u,
  /“全部 \/ 可更新”使用子 Tab/u,
  /第二行左侧显示“全部 \/ 可更新”/u,
  /刷新固定在第二行右侧/u,
  /Steam 标题左对齐/u,
  /好友、账号操作、电源/u,
  /不显示“仅显示当前设备已安装的 MOD”提示文案/u,
  /“查看全部”进入对应游戏的 `MODS > 浏览`/u,
  /页面不提供搜索、排序、筛选、刷新和直接下载新 MOD/u,
  /Steam 个人中心可更新当前设备已安装 MOD/u,
  /空态“查看支持 MODS 的游戏”进入现有游戏库的 MODS 支持列表/u,
  /两个按钮和一个开关/u,
  /三个操作位等宽铺满/u,
  /启停开关固定在最右侧/u,
  /已安装列表、Steam 个人中心和 MOD 详情/u,
  /有更新时仅在“更新”按钮内显示红点/u,
  /无更新或状态未知时，“更新”禁用且不显示红点/u,
  /不显示黄色圆点/u,
  /列表卡片不展示简介，简介仅在 MOD 详情展示/u,
  /不显示成功 Toast/u,
  /国内包显示“盖世游戏”/u,
  /海外包显示“GameHub”/u,
  /不依赖云游戏/u,
  /浏览页返回操作直接回个人中心并恢复原分组和滚动位置/u,
  /同一设备、同一游戏、同一 MOD 同时只能有一条操作/u,
  /独立 ID 命名空间、安装目录、任务和状态存储/u,
  /本期不支持断点续传/u,
  /断网、进入后台或进程退出后中断/u,
  /重试时从 0 创建新任务/u,
  /更新中断保留旧版本和原启用状态/u,
  /app_mods_profile_view_all/u,
  /AC-12\|更新状态/u,
  /AC-20\|海外包/u
]) assert.match(markdown, rule, `PRD 缺少规则：${rule}`);

for (const removedRule of [
  /检查更新/u,
  /恢复网络后续传/u,
  /保留任务 ID 和已完成进度/u
]) assert.doesNotMatch(markdown, removedRule, `PRD 仍包含已移除规则：${removedRule}`);

const proseLines = markdown
  .split(/\r?\n/u)
  .map(line => line.trim())
  .filter(line => line.length >= 24 && !line.startsWith('|') && !line.startsWith('![') && !line.startsWith('`'));
assert.equal(new Set(proseLines).size, proseLines.length, 'PRD 存在整行重复说明');

const imageRefs = [...markdown.matchAll(/!\[([^\]]+)\]\((https:\/\/[^)]+\/public\/prd\/app-mods\/([^)]+\.png))\)/gu)];
assert.equal(imageRefs.length, imageNames.length, `PRD 图片数量应为 ${imageNames.length}`);
assert.deepEqual(
  imageRefs.map(match => match[3]).sort(),
  [...imageNames].sort(),
  'PRD 图片文件集合不正确'
);
assert(imageRefs.every(match => !/^图\s*\d/u.test(match[1])), '图片标题不得包含图号');
assert(imageRefs.every(match => !/[：:]/u.test(match[1])), '图片标题不得包含冒号');
assert(imageRefs.every(match => match[1].length <= 20), '图片标题必须简短');

const imageShas = imageRefs.map(match => new URL(match[2]).pathname.match(/@([0-9a-f]{40})\//u)?.[1]);
assert(imageShas.every(Boolean), '图片 URL 未固定到 40 位提交 SHA');
assert.equal(new Set(imageShas).size, 1, '同一 PRD 图片必须使用同一资产提交 SHA');
const expectedSha = imageShas[0];

const demoMatch = markdown.match(/https:\/\/htmlpreview\.github\.io\/\?https:\/\/github\.com\/z36358631-ship-it\/-\/blob\/([0-9a-f]{40})\/demos\/[^`\s]+APP%E7%AB%AFMODS%E5%8A%9F%E8%83%BDdemo\.html/u);
assert(demoMatch, 'Demo 必须使用固定提交的 htmlpreview 地址');
assert.equal(demoMatch[1], expectedSha, 'Demo 与图片必须固定到同一资产提交');

const detailTableStart = markdown.indexOf('|模块名称|图示|展示与交互|');
const detailTableEnd = markdown.indexOf('#### 4.2.9 创意工坊隔离');
assert(detailTableStart >= 0 && detailTableEnd > detailTableStart, '4.2 页面表格范围缺失');
const detailTable = markdown.slice(detailTableStart, detailTableEnd);
assert.equal((detailTable.match(/!\[/gu) || []).length, imageNames.length, '图片没有全部放在 4.2 图示列');

const detailRuleNumbers = [...markdown.matchAll(/^#### 4\.2\.(\d+) /gmu)].map(match => Number(match[1]));
assert.deepEqual(detailRuleNumbers, [9, 10, 11, 12, 13, 14, 15], '4.2 规则章节编号不连续');

for (const imageName of imageNames) {
  const localImage = path.join(root, 'public', 'prd', 'app-mods', imageName);
  assert.equal(fs.existsSync(localImage), true, `本地截图缺失：${imageName}`);
  assert(fs.statSync(localImage).size > 12000, `截图体积异常：${imageName}`);
}

console.log(`PASS: APP MODS PRD 结构、精简语言、规则与 ${imageNames.length} 张固定图片`);

if (verifyRemote) {
  const userAgents = [
    ['default', 'Mozilla/5.0'],
    ['feishu', 'Lark/7.0 FeishuDocsImageImporter']
  ];
  const checks = imageRefs.flatMap(([, , url]) => userAgents.map(async ([name, userAgent]) => {
    const response = await fetch(url, {
      headers: { 'user-agent': userAgent },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000)
    });
    assert.equal(response.status, 200, `${url} ${name} HTTP ${response.status}`);
    assert.equal(response.headers.get('content-type')?.split(';')[0], 'image/png', `${url} ${name} Content-Type 异常`);
    const bytes = await response.arrayBuffer();
    assert(bytes.byteLength > 12000, `${url} ${name} 图片体积异常`);
    return `${name} ${path.basename(new URL(url).pathname)}`;
  }));
  const results = await Promise.all(checks);
  for (const result of results) console.log(`PASS: ${result} -> 200 image/png`);
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolsDir, '..');
const prdPath = path.join(
  repoRoot,
  'prd',
  'ai生成',
  '【Prd】《盖世游戏》GOG平台接入需求.md',
);
const prd = fs.readFileSync(prdPath, 'utf8');

const requiredStructure = [
  '# 【Prd】《盖世游戏》GOG平台接入需求',
  '## 一、版本信息',
  '## 二、背景与目标',
  '### 2.1 需求背景',
  '### 2.2 目标与成功指标',
  '### 2.3 范围与不做事项',
  '## 三、故事介绍',
  '### 3.1 用户与运营场景',
  '### 3.2 价值分析',
  '### 3.3 核心体验路径',
  '### 3.4 产品指标预测',
  '### 3.5 路径规划',
  '## 四、概要设计',
  '### 4.1 模块设计',
  '### 4.2 详细设计（C端）',
  '## 五、非功能需求',
  '## 六、埋点需求',
  '### 6.1 埋点事件表',
  '### 6.2 埋点参数表',
  '## 七、运营需求',
  '## 八、来自功能上线后的更新',
  '## 九、验收与待确认项',
  '### 9.1 验收标准',
  '### 9.2 待确认项',
  '## 十、自检记录',
  '## 十一、模拟评审结果',
];
for (const heading of requiredStructure) {
  assert(prd.includes(heading), `Missing PRD heading: ${heading}`);
}
assert(
  !prd.includes('### 4.3 详细设计（B端）'),
  'C-side-only PRD must not contain an empty B-side chapter',
);
console.log('PASS structure');

const requiredRules = [
  '我的页',
  'GOG 官方登录',
  '游戏库',
  '游戏详情',
  '切换启动平台',
  '搜索结果',
  'sourcePlatform',
  'sourcePlatform=gog',
  'gameId',
  'platformAppId',
  'Steam > EPIC > GOG',
  '不保存 GOG 邮箱或密码',
  '国内包',
  '海外包',
  'loading',
  'empty',
  'error',
  'expired',
  'cancelled',
  'cached',
  '本 PRD 无图示；交互与页面状态以同目录交付的单文件标注 Demo 为准。',
];
for (const token of requiredRules) {
  assert(prd.includes(token), `Missing PRD rule: ${token}`);
}
assert(!prd.includes('sourcePlatform=GOG'), 'sourcePlatform enum must use lowercase gog');
console.log('PASS rules');

const forbiddenPlaceholders = [
  'T' + 'BD',
  'T' + 'ODO',
  '待补充',
  '稍后完善',
];
for (const token of forbiddenPlaceholders) {
  assert(!prd.includes(token), `PRD contains prohibited placeholder: ${token}`);
}
console.log('PASS placeholders');

const markdownImage = /!\[[^\]]*\]\([^)]*\)/;
const htmlImage = /<img\b/i;
const localUrl = /(?:file:\/\/|localhost|127\.0\.0\.1|data:image|[A-Za-z]:\\)/i;
assert(!markdownImage.test(prd), 'PRD must not contain Markdown images');
assert(!htmlImage.test(prd), 'PRD must not contain HTML images');
assert(!localUrl.test(prd), 'PRD contains a prohibited local URL or path');
console.log('PASS images');

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

function pass(name) {
  console.log(`PASS ${name}`);
}

function structure() {
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
  pass('structure');
}

function rules() {
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
  pass('rules');
}

function currentPageRules() {
  const requiredCurrentPageRules = [
    '新版游戏库',
    'EPIC → GOG → 导入游戏',
    'Demo 共 10 个页面视图',
    '游戏库首页：竖屏',
    '游戏库首页：横屏',
    'GOG 账号游戏库：竖屏',
    'GOG 账号游戏库：横屏',
    '搜索结果：竖屏',
    '搜索结果：横屏',
    '游戏详情：竖屏',
    '游戏详情：横屏',
    'GOG 不展示账号价值；页面不渲染标题、数值、骨架或占位空间，也不以 0 或“--”代替。',
  ];
  for (const token of requiredCurrentPageRules) {
    assert(prd.includes(token), `Missing current-page rule: ${token}`);
  }

  const forbiddenLegacyRules = [
    '用户名、账号价值',
    '账号价值不可计算',
    '账号价值缺失显示',
    'GOG 可返回的账号价值',
    '账号价值模型是否覆盖 GOG',
    '¥6.8k',
    '九个页面',
    '9 个页面',
  ];
  for (const token of forbiddenLegacyRules) {
    assert(!prd.includes(token), `Forbidden legacy value or page rule: ${token}`);
  }
  pass('currentPageRules');
}

function placeholders() {
  const forbiddenPlaceholders = [
    'T' + 'BD',
    'T' + 'ODO',
    '待补充',
    '稍后完善',
  ];
  for (const token of forbiddenPlaceholders) {
    assert(!prd.includes(token), `PRD contains prohibited placeholder: ${token}`);
  }
  pass('placeholders');
}

function images() {
  const markdownImage = /!\[[^\]]*\]\([^)]*\)/;
  const htmlImage = /<img\b/i;
  const localUrl = /(?:file:\/\/|localhost|127\.0\.0\.1|data:image|[A-Za-z]:\\)/i;
  assert(!markdownImage.test(prd), 'PRD must not contain Markdown images');
  assert(!htmlImage.test(prd), 'PRD must not contain HTML images');
  assert(!localUrl.test(prd), 'PRD contains a prohibited local URL or path');
  pass('images');
}

const checks = { structure, rules, currentPageRules, placeholders, images };
const mode = process.argv[2] || 'all';
if (mode === 'all') {
  Object.values(checks).forEach(check => check());
} else if (checks[mode]) {
  checks[mode]();
} else {
  throw new Error(`Unknown mode: ${mode}`);
}

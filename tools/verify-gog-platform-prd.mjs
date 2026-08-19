import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prdPath = path.join(
  repoRoot,
  'prd',
  'ai生成',
  '【Prd】《盖世游戏》GOG平台接入需求.md',
);
const prd = fs.readFileSync(prdPath, 'utf8');

function includesAll(name, values) {
  for (const value of values) {
    assert(prd.includes(value), `${name}: missing ${value}`);
  }
  console.log(`PASS ${name}`);
}

function structure() {
  includesAll('structure', [
    '# 【Prd】《盖世游戏》GOG平台接入需求',
    '## 一、版本信息',
    '## 二、背景、目标与范围',
    '## 三、用户与核心流程',
    '## 四、概要与详细设计',
    '### 4.1 公共规则',
    '### 4.2 详细设计（C端）',
    '### 4.3 状态与恢复',
    '## 五、横竖屏与包体差异',
    '## 六、数据、埋点与非功能要求',
    '## 七、上线准备',
    '## 八、验收标准',
    '## 九、待确认项',
  ]);
  assert(!prd.includes('详细设计（B端）'), 'C-side-only PRD contains B-side section');
}

function concise() {
  const lineCount = prd.split(/\r?\n/).length;
  assert(lineCount <= 220, `PRD is still too long: ${lineCount} lines`);
  for (const token of [
    '自检记录',
    '模拟评审',
    '已自动补充',
    'V1.4 最新生效口径',
    '字段覆盖清单',
    '本 PRD 无图示',
    '高风险假设',
  ]) {
    assert(!prd.includes(token), `process-style copy remains: ${token}`);
  }
  for (const token of ['GOG ID', '同步时间', '账号价值']) {
    assert.equal(prd.split(token).length - 1, 1, `duplicated rule: ${token}`);
  }
  console.log('PASS concise');
}

function productRules() {
  includesAll('productRules', [
    'EPIC → GOG → 导入游戏',
    'sourcePlatform=gog',
    'Steam > EPIC > GOG',
    '中英文名称和别名只用于候选匹配',
    '搜索结果始终按平台版本分条展示',
    '竖屏一行两张游戏卡',
    '平台标识叠加在封面左下角',
    'GOG 没有评分时显示“暂无评分”',
    '“获取游戏”的平台标识表示获取渠道',
    'PC 游戏引擎标题右侧不展示平台胶囊',
    '`3.8` 与星星同行',
    '点击详情中的任一平台图标只打开“切换平台”弹窗',
    '点击“+”进入 GOG 官方授权',
    '“移除账号”为禁用态',
    '不保存、不上报邮箱、密码',
    '国内包“盖世游戏”',
    '海外包“GameHub”',
  ]);
  for (const state of ['loading', 'empty', 'error', 'expired', 'cancelled', 'cached']) {
    assert(prd.includes(`\`${state}\``), `missing state: ${state}`);
  }
  assert(!prd.includes('sourcePlatform=GOG'), 'platform enum must use lowercase gog');
}

function images() {
  const imagePattern = /!\[([^\]]+)\]\((https:\/\/[^)]+)\)/g;
  const images = [...prd.matchAll(imagePattern)];
  assert.equal(images.length, 12, `expected 12 images, got ${images.length}`);
  assert.equal(new Set(images.map(([, , url]) => url)).size, 12, 'image URLs must be unique');
  const sha = '4d14ee8045ca536301f177d9f68ca3d6c6857db4';
  for (const [, title, url] of images) {
    assert(title.length > 0 && title.length <= 12, `image title is not concise: ${title}`);
    assert(
      url.startsWith(`https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@${sha}/public/prd/gog-platform-integration/`),
      `image URL is not pinned: ${url}`,
    );
    assert(url.endsWith('.png'), `image is not PNG: ${url}`);
  }
  assert(!/(?:file:\/\/|localhost|127\.0\.0\.1|data:image|[A-Za-z]:\\)/i.test(prd));
  console.log('PASS images');
}

function tracking() {
  const events = [
    'gog_entry_view',
    'gog_authorization_result',
    'gog_initial_sync_result',
    'gog_library_view',
    'search_platform_result_click',
    'platform_switch_result',
    'platform_launch_result',
  ];
  const parameters = [
    'entry_page',
    'orientation',
    'app_package',
    'bind_status',
    'result',
    'failure_type',
    'duration_ms',
    'game_count',
    'request_state',
    'game_id',
    'platform_app_id',
    'platform',
    'from_platform',
    'source_platform',
    'selected_platform',
  ];
  includesAll('trackingEvents', events.map(value => `\`${value}\``));
  for (const parameter of parameters) {
    const count = prd.split(`\`${parameter}\``).length - 1;
    assert(count >= 2, `tracking parameter lacks event or definition: ${parameter}`);
  }
  console.log('PASS trackingParameters');
}

function acceptance() {
  for (let i = 1; i <= 12; i += 1) {
    assert(prd.includes(`AC${String(i).padStart(2, '0')}`), `missing acceptance case AC${i}`);
  }
  includesAll('acceptance', ['| M1 |', '| M2 |', '| M3 |', '| M4 |']);
}

structure();
concise();
productRules();
images();
tracking();
acceptance();

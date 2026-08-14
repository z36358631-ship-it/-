import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(scriptDir, '..');
const manifestPath = path.join(skillDir, 'assets', 'source-manifest.json');
const outputPath = path.join(skillDir, 'assets', 'screen-catalog.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const facts = [
  ['R-01','新手与账号','portrait-flow','首次展示','首次隐私政策弹窗'],
  ['R-02','新手与账号','portrait-flow','欢迎分流','新用户欢迎分流'],
  ['R-03','新手与账号','portrait-flow','游戏选择','新手选游戏列表'],
  ['R-02','新手与账号','portrait-flow','来源选择','导入或绑定 Steam'],
  ['R-04','新手与账号','portrait-sheet','盖世登录','盖世账号登录 Sheet'],
  ['R-04','新手与账号','portrait-sheet','Steam 登录','Steam 账号登录 Sheet'],
  ['R-11','游戏库','portrait-shell','Epic 未绑定','文件名写登录，画面事实为 Epic 未绑定'],
  ['R-05','首页与发现','portrait-shell','首页默认','竖屏首页 Feed'],
  ['R-06','首页与发现','portrait-shell','搜索默认','右侧内容存在实机越界，生成时修复'],
  ['R-07','首页与发现','portrait-detail','详情默认','竖屏游戏详情'],
  ['R-08','玩游戏','portrait-shell','云游戏频道','玩游戏云游戏'],
  ['R-08','玩游戏','portrait-shell','PC 游戏频道','玩游戏 PC 游戏'],
  ['R-08','玩游戏','portrait-shell','组队频道','云游组队竖屏单列'],
  ['R-08','玩游戏','portrait-shell','复古频道','复古游戏竖屏三列'],
  ['R-09','充值','portrait-page','时长页','套餐区状态不明确，必须显式加载/空/失败'],
  ['R-10','排行榜','portrait-shell','首屏展开','排行榜大标题态'],
  ['R-10','排行榜','portrait-shell','滚动折叠','排行榜分类折叠态'],
  ['R-11','游戏库','portrait-shell','PC 有内容','PC 游戏库'],
  ['R-11','游戏库','portrait-shell','Steam 未绑定','Steam 游戏库未绑定'],
  ['R-11','游戏库','portrait-shell','Epic 未绑定','Epic 游戏库未绑定'],
  ['R-11','游戏库','portrait-shell','复古空库','复古游戏库空态'],
  ['R-12','游戏管理','portrait-dialog','导入选择','本地游戏与 Steam 两入口'],
  ['R-07','首页与发现','portrait-detail','PC 详情','正文绿色为渲染异常，仅取结构'],
  ['R-13','游戏管理','portrait-sheet','更多菜单','减弱实机异常光晕'],
  ['R-13','游戏管理','portrait-page','秒玩设置','分组设置列表'],
  ['R-13','游戏管理','portrait-sheet','版本切换','单选确认 Sheet'],
  ['R-13','游戏管理','portrait-dialog','移除确认','危险确认弹窗'],
  ['R-13','游戏管理','portrait-page','编辑信息','名称与封面表单'],
  ['R-14','游戏管理','portrait-page','布局图库','双列布局卡'],
  ['R-15','我的与系统','portrait-shell','我的默认','个人、平台账号与设备'],
  ['R-16','我的与系统','portrait-page','设备中心','双列设备卡'],
  ['R-17','我的与系统','portrait-page','设置','现行设置分组列表'],
  ['R-17','我的与系统','portrait-page','关于','协议与版本'],
  ['R-18','我的与系统','portrait-page','下载管理','蓝紫环境背景仅限本页'],
  ['R-19','我的与系统','portrait-sheet','模式选择','探索/掌机模式选择'],
  ['R-20','掌机横屏','landscape-shell','首页默认','掌机首页双 Hero'],
  ['R-08','掌机横屏','landscape-shell','云游戏频道','横屏云游戏多列'],
  ['R-08','掌机横屏','landscape-shell','PC 游戏频道','横屏 PC 游戏轨道'],
  ['R-08','掌机横屏','landscape-shell','组队频道','横屏组队双列'],
  ['R-08','掌机横屏','landscape-shell','复古频道','横屏复古六列'],
  ['R-22','掌机横屏','landscape-shell','单游戏稀疏','留白是稀疏数据结果，不是固定规范'],
  ['R-21','掌机横屏','landscape-shell','排行榜','右缘文字硬裁切需修复'],
  ['R-21','掌机横屏','landscape-shell','搜索默认','左热搜与右推荐双面板'],
  ['R-23','掌机横屏','landscape-detail','详情默认','掌机沉浸式详情'],
  ['R-19','我的与系统','portrait-shell','切回结果','只证明切回后的竖屏首页，不证明动画']
];

if (facts.length !== 45) throw new Error(`expected 45 page facts, got ${facts.length}`);

const screens = manifest.deviceScreens.map((screen, index) => {
  const [recipe, family, shell, status, note] = facts[index];
  return {
    id: screen.id,
    index: screen.index,
    title: screen.name.replace(/^\d+-/, '').replace(/\.png$/i, ''),
    orientation: screen.orientation,
    width: screen.width,
    height: screen.height,
    family,
    recipe,
    shell,
    status,
    sourcePath: screen.path,
    sha256: screen.sha256,
    knownIssue: note,
    sourceRole: 'original-evidence',
    implementationClaim: false
  };
});

const payload = {
  schemaVersion: 2,
  product: 'GameHub APP',
  productVersion: 'V6.1.1',
  generatedFrom: path.relative(skillDir, manifestPath).replaceAll('\\', '/'),
  sourceManifestSha256: crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex'),
  counts: {
    total: screens.length,
    portrait: screens.filter(screen => screen.orientation === 'portrait').length,
    landscape: screens.filter(screen => screen.orientation === 'landscape').length
  },
  screens
};

const json = `${JSON.stringify(payload, null, 2)}\n`;
fs.writeFileSync(outputPath, json, 'utf8');
console.log(`WROTE ${outputPath}`);
console.log(`PASS screenCatalog (${payload.counts.total}/45, portrait ${payload.counts.portrait}/36, landscape ${payload.counts.landscape}/9)`);

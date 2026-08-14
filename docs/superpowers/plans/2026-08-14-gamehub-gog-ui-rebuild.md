# GameHub GOG UI Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有 GOG 业务交互的前提下，把 10 页单文件 Demo 重建为严格遵循 GameHub 实机图和新版游戏库 UI 稿的横竖屏高保真页面，并输出可复核的视觉证据。

**Architecture:** 继续使用 `盖世游戏GOG平台接入-交互标注版.html` 内现有状态对象、路由和事件委托，把表现层拆成共享图标/媒体、竖屏 Shell、横屏 Shell、页面渲染器和状态槽五组职责。验证脚本先定义结构、离线、几何和交互契约，再逐页替换 DOM/CSS；截图脚本输出固定视口页面与关键状态，视觉比较脚本只对存在真实基准的页面给出机器结果。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、内联 SVG/数据 URI、Node.js、Playwright Core、本地 Chrome、Python Pillow/scikit-image（只用于读取与比较截图，不编辑产品图片）。

---

## File Structure

- `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`：10 个页面、共享状态、离线媒体、可访问组件和交互标注的唯一运行文件。
- `tools/verify-gog-platform-demo.mjs`：静态结构、离线依赖、禁止伪图标、页面来源标记和 JavaScript 语法契约。
- `tools/verify-gog-platform-demo-ui.mjs`：浏览器中的页面几何、横竖 Shell、账号操作、授权、平台路由、搜索、详情与异常恢复契约。
- `tools/capture-gog-platform-demo.mjs`：固定 `402 × 874` 与 `874 × 402` 视口的 10 页、关键弹层和标注工作台截图。
- `tools/compare-gog-platform-visuals.py`：读取真实基准和截图，生成同尺寸实现、50% 叠加、绝对差异、热图及 JSON 指标；不改写产品媒体。
- `.tmp/gog-platform-demo-captures/`：运行时截图。
- `.tmp/gog-platform-demo-visual-report/`：运行时视觉证据与报告。

### Task 1: 锁定离线、来源和几何契约

**Files:**
- Modify: `tools/verify-gog-platform-demo.mjs`
- Modify: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 在静态验证中增加离线与来源检查**

新增并注册 `offlineAssets()` 和 `visualSourceContracts()`：

```js
function offlineAssets() {
  assert(!/(?:src|href)=["']https?:\/\//i.test(html), 'Runtime remote asset remains');
  assert(!/@import\s+url\(/i.test(html), 'Remote CSS import remains');
  assert(!/<(?:iframe|canvas)\b/i.test(html), 'iframe/canvas is forbidden');
  pass('offlineAssets');
}
function visualSourceContracts() {
  for (const token of [
    'data-source-status="measured"',
    'data-source-status="derived"',
    'data-source-status="missing-source"',
    'portrait-app-shell',
    'handheld-app-shell',
  ]) assert(html.includes(token), `Missing visual source token: ${token}`);
  assert(!/class="[^"]*platform-icon[^"]*"[^>]*>[SEG]</.test(html), 'Text platform icon remains');
  pass('visualSourceContracts');
}
```

将两项加入 `tasks`，确保 `node tools/verify-gog-platform-demo.mjs all` 在旧 Demo 上先失败。

- [ ] **Step 2: 在浏览器验证中增加页面几何契约**

为 10 页逐页检查：

```js
const visualContracts = {
  'profile-portrait': { orientation:'portrait', width:402, height:874 },
  'gog-login': { orientation:'portrait', width:402, height:874 },
  'library-home-portrait': { orientation:'portrait', width:402, height:874 },
  'library-home-landscape': { orientation:'landscape', width:874, height:402 },
  'gog-library-portrait': { orientation:'portrait', width:402, height:874 },
  'gog-library-landscape': { orientation:'landscape', width:874, height:402 },
  'search-portrait': { orientation:'portrait', width:402, height:874 },
  'search-landscape': { orientation:'landscape', width:874, height:402 },
  'detail-portrait': { orientation:'portrait', width:402, height:874 },
  'detail-landscape': { orientation:'landscape', width:874, height:402 },
};
```

竖屏必须存在 `.portrait-app-shell` 和底部导航或详情固定操作；横屏必须存在 `.handheld-app-shell`，且不得存在 `.portrait-bottom-nav`。

- [ ] **Step 3: 运行测试确认新增契约失败**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs offlineAssets
node tools/verify-gog-platform-demo.mjs visualSourceContracts
node tools/verify-gog-platform-demo-ui.mjs all
```

Expected: 静态离线/来源检查失败；现有业务浏览器用例继续通过，形成视觉重建前基线。

- [ ] **Step 4: 提交契约**

```powershell
git add -- tools/verify-gog-platform-demo.mjs tools/verify-gog-platform-demo-ui.mjs
git commit -m "test: lock GOG demo visual contracts"
```

### Task 2: 建立真实 GameHub Shell 与离线资产层

**Files:**
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`

- [ ] **Step 1: 替换视觉令牌与工作台样式**

保留三栏标注工作台，App 内令牌统一为：

```css
:root{
  --gh-bg:#0b0b0d;--gh-surface:#171719;--gh-elevated:#242427;
  --gh-line:rgba(255,255,255,.11);--gh-text:#f5f5f5;--gh-muted:#8d8d92;
  --gh-cyan:#03bff2;--gh-orange:#ff8c24;--gh-radius-card:12px;
  --portrait-w:402px;--portrait-h:874px;--landscape-w:874px;--landscape-h:402px;
}
.app-viewport[data-orientation="portrait"]{width:var(--portrait-w);height:var(--portrait-h)}
.app-viewport[data-orientation="landscape"]{width:var(--landscape-w);height:var(--landscape-h)}
.portrait-app-shell,.handheld-app-shell{position:relative;overflow:hidden;background:var(--gh-bg)}
```

移除 App 内紫色通用渐变、文字导航符号和竖屏 DOM 的横屏缩放规则。

- [ ] **Step 2: 增加共享几何图标与来源化媒体**

新增 `icon(name)`，只返回返回、搜索、更多、排序、列表、库、手柄、星球、排行、我的、时长、云等通用几何 SVG：

```js
function icon(name, className='ui-icon') {
  const paths = {
    back:'<path d="M15 18l-6-6 6-6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  };
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||''}</svg>`;
}
```

平台品牌图标通过 `renderPlatformMark(platform)` 读取已登记的数据 URI；GOG 源缺失时返回带 `data-source-status="missing-source"` 的空图标容器和可访问名称，不返回单字母。

- [ ] **Step 3: 把运行时图片变为离线数据 URI**

将当前 `src="https://..."` 的 Hero、封面和头像替换为在构建时取得并内联的数据 URI；保留交互事件中的普通外链字符串，但页面加载不能请求网络。每个媒体节点增加 `data-source-status="measured"` 或 `derived`。

- [ ] **Step 4: 运行静态测试**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs offlineAssets
node tools/verify-gog-platform-demo.mjs syntax
```

Expected: `PASS offlineAssets` 与 `PASS syntax`。

- [ ] **Step 5: 提交 Shell 与资产层**

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m "refactor: rebuild GameHub demo shells"
```

### Task 3: 重建我的页与 GOG 官方授权页

**Files:**
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Test: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 按 `30-我的.png` 重写我的页 DOM**

页面顺序固定为状态栏、右上操作、头像/昵称/UID、平台同步卡、运营 Banner、我的设备、底部五栏导航。平台卡保持 Steam/EPIC/GOG Tab，GOG 未绑定和已绑定共用同一外框；已绑定卡包含 `…` 菜单，GOG 不渲染账号价值或“喜加一”。

- [ ] **Step 2: 重写授权页并标注来源缺失**

授权页使用浏览器顶栏、安全说明、官方输入区域示意、取消、成功和失败模拟；根节点写入：

```html
<section class="app-viewport login-page portrait-app-shell"
  data-screen="gog-login" data-orientation="portrait"
  data-source-status="missing-source">
```

不得使用 “G” 字母作为 Logo，不宣称是 GOG 原稿复刻。

- [ ] **Step 3: 运行账号与授权测试**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs accountMenu
node tools/verify-gog-platform-demo.mjs gogCapabilities
node tools/verify-gog-platform-demo-ui.mjs profile
```

Expected: 全部 PASS；菜单不越界，更新防重，切换失败保留旧账号，退出只影响 GOG，EPIC 独有“喜加一”。

- [ ] **Step 4: 提交我的页与授权页**

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m "feat: rebuild profile and GOG authorization views"
```

### Task 4: 重建游戏库首页与 GOG 账号库

**Files:**
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Test: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 重建竖屏游戏库首页**

按新版 `01-library-home-portrait.png` 实现 PC 游戏标题、入口区、我的游戏标题/工具和两列真实游戏卡，底部导航保持 GameHub 五栏。入口顺序通过 DOM 和 `data-library-entry` 固定为：

```js
['epic','gog','import']
```

- [ ] **Step 2: 重建横屏游戏库首页**

按新版 `02-library-home-landscape.png` 实现掌机顶部导航、横向焦点封面、详情按钮、横向平台入口。根节点必须使用 `.handheld-app-shell`，入口卡不得复用竖屏尺寸。

- [ ] **Step 3: 重建竖屏 GOG 账号库**

按 `04-epic-library-portrait.png` 重建返回/标题/账号操作、头像/ID/在线状态、游戏数与总时长统计、标题工具栏和两列游戏卡。标题使用 `GOG库`，不出现 Steam 库、账号价值或“喜加一”。

- [ ] **Step 4: 重建横屏 GOG 账号库**

按 `03-epic-library-landscape.png` 重建横向账号头、统计、工具和四列卡片；不保留被删除能力的空白槽。

- [ ] **Step 5: 运行游戏库测试**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs platformModel
node tools/verify-gog-platform-demo-ui.mjs library
```

Expected: 全部 PASS；横竖入口顺序一致，未绑定进入授权，已绑定进入对应方向账号库，游戏卡携带 `sourcePlatform=gog`。

- [ ] **Step 6: 提交游戏库页面**

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m "feat: rebuild portrait and handheld GOG libraries"
```

### Task 5: 重建搜索与详情页面

**Files:**
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Test: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 重建竖屏搜索结果**

沿用 `09-竖版搜索默认页.png` 的状态栏、搜索框和 Tab 视觉；结果页改成两列卡片。每张卡必须是：

```html
<button class="search-result" data-search-result>
  <span class="search-result__cover-wrap">
    <img class="search-result__cover" alt="">
    <span class="search-result__platform" data-source-status="derived"></span>
  </span>
  <span class="search-result__body"></span>
</button>
```

EPIC/GOG 角标在封面左下角，同一游戏的不同平台版本分别渲染。

- [ ] **Step 2: 重建横屏搜索结果**

按 `43-掌机模式-搜索.png` 实现横向搜索框、左侧历史/热门搜索和右侧结果列表；平台标识仍位于封面左下角，结果数据与竖屏一致。

- [ ] **Step 3: 重建竖屏详情**

按 `10-竖版游戏详情.png` 实现视频/图集区、游戏摘要、标签、发行信息、PC 游戏引擎卡、正文和固定底部操作。PC 游戏引擎卡包含平台切换、游戏时长、云存档和获取游戏；底部启动按钮使用当前 `selectedPlatform`。

- [ ] **Step 4: 重建横屏详情**

按 `44-掌机模式-游戏详情.png` 实现全屏 Hero、左侧标题/标签/操作和底部四项指标。平台切换弹层与竖屏共享状态但使用独立几何位置。

- [ ] **Step 5: 运行搜索与详情测试**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs searchAndDetailCopy
node tools/verify-gog-platform-demo.mjs fullGameplayScope
node tools/verify-gog-platform-demo-ui.mjs detailSearch
```

Expected: 全部 PASS；竖屏两列、封面内平台角标、GOG 暂无评分、来源优先、无来源 Steam > EPIC > GOG、来源不可用不静默切换。

- [ ] **Step 6: 提交搜索与详情**

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m "feat: rebuild GOG search and detail views"
```

### Task 6: 把异常状态嵌入真实页面 Shell

**Files:**
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Test: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 将状态渲染改为页面内状态槽**

把通用 `state-page` 替换为 `renderPageStateSlot(page, kind, ...)`。竖屏保留对应顶部/底部 Shell，横屏保留掌机导航；`loading`、`empty`、`error`、`expired`、`cancelled`、`cached` 只替换内容区。

- [ ] **Step 2: 保留恢复动作与缓存语义**

加载不可重复提交；空态显示重新同步；无缓存失败显示重试和返回；有缓存失败显示游戏卡、缓存时间和重新同步；过期进入重新登录；取消返回来源页。

- [ ] **Step 3: 运行状态与全交互测试**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs states
node tools/verify-gog-platform-demo-ui.mjs all
```

Expected: 全部 PASS，无浏览器运行时错误。

- [ ] **Step 4: 提交异常状态**

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m "refactor: integrate GOG states into real page shells"
```

### Task 7: 生成截图和严格视觉证据

**Files:**
- Modify: `tools/capture-gog-platform-demo.mjs`
- Create: `tools/compare-gog-platform-visuals.py`
- Generate: `.tmp/gog-platform-demo-captures/*.png`
- Generate: `.tmp/gog-platform-demo-visual-report/**/*`

- [ ] **Step 1: 扩展截图脚本**

继续输出 10 页和 4 个关键状态，新增每页 `computed-layout.json`，记录画布、导航、标题、入口、网格、卡片和固定操作的边界框。页面截图仍严格为 `402 × 874` 或 `874 × 402`。

- [ ] **Step 2: 创建视觉比较脚本**

脚本使用明确映射：

```python
REFERENCE_MAP = {
    '03-library-home-portrait.png': 'assets/reference/gog-platform-real-pages/01-library-home-portrait.png',
    '04-library-home-landscape.png': 'assets/reference/gog-platform-real-pages/02-library-home-landscape.png',
    '05-gog-library-portrait.png': 'assets/reference/gog-platform-real-pages/04-epic-library-portrait.png',
    '06-gog-library-landscape.png': 'assets/reference/gog-platform-real-pages/03-epic-library-landscape.png',
    '07-search-portrait.png': '_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/09-竖版搜索默认页.png',
    '08-search-landscape.png': '_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/43-掌机模式-搜索.png',
    '09-detail-portrait.png': '_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/10-竖版游戏详情.png',
    '10-detail-landscape.png': '_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/44-掌机模式-游戏详情.png',
}
```

对参考图与实现按相同视口裁切/缩放后输出 reference、implementation、overlay、absolute-diff、heatmap 和 `metrics.json`。授权页和派生 GOG 差异只报告结构，不伪造 1:1 分数。

- [ ] **Step 3: 运行截图和比较**

Run:

```powershell
node tools/capture-gog-platform-demo.mjs
python -X utf8 tools/compare-gog-platform-visuals.py
```

Expected: 15 张产品/状态截图生成；8 组有基准页面生成完整视觉证据，报告明确列出 PASS、FAIL 与 `missing-source`。

- [ ] **Step 4: 人工审图并修正**

逐页原尺寸检查导航位置、内容密度、卡片比例、平台角标、固定操作、横竖 Shell 和弹层；任何肉眼明显结构差异都继续修正，即使机器结果 PASS。

- [ ] **Step 5: 提交验证工具**

```powershell
git add -- tools/capture-gog-platform-demo.mjs tools/compare-gog-platform-visuals.py
git commit -m "test: add GOG visual regression evidence"
```

### Task 8: 最终回归与交付

**Files:**
- Verify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Verify: `tools/verify-gog-platform-demo.mjs`
- Verify: `tools/verify-gog-platform-demo-ui.mjs`
- Verify: `tools/capture-gog-platform-demo.mjs`
- Verify: `tools/compare-gog-platform-visuals.py`

- [ ] **Step 1: 运行完整回归**

```powershell
node tools/verify-gog-platform-demo.mjs all
node tools/verify-gog-platform-demo-ui.mjs all
node tools/capture-gog-platform-demo.mjs
python -X utf8 tools/compare-gog-platform-visuals.py
git diff --check -- `
  'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html' `
  tools/verify-gog-platform-demo.mjs `
  tools/verify-gog-platform-demo-ui.mjs `
  tools/capture-gog-platform-demo.mjs `
  tools/compare-gog-platform-visuals.py
```

Expected: 静态与浏览器契约全部 PASS；截图完整；视觉报告中每项都有实际证据，不出现手填分数。

- [ ] **Step 2: 检查禁用内容**

```powershell
rg -n "src=['\"]https?://|href=['\"]https?://|<iframe|<canvas|official-login__logo[^>]*>[SEG]<|accountValue.*gog|GOG.*喜加一" `
  'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
```

Expected: 无运行时远程资源、iframe/canvas、单字母平台图标、GOG 账号价值或 GOG“喜加一”匹配。

- [ ] **Step 3: 最终提交仅包含本任务文件**

```powershell
git add -- `
  'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html' `
  tools/verify-gog-platform-demo.mjs `
  tools/verify-gog-platform-demo-ui.mjs `
  tools/capture-gog-platform-demo.mjs `
  tools/compare-gog-platform-visuals.py
git commit -m "feat: deliver high-fidelity GameHub GOG demo"
```

只提交以上 GOG 任务路径；工作区其他用户改动全部保留且不纳入提交。


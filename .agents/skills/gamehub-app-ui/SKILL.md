---
name: gamehub-app-ui
description: 为盖世游戏（GameHub）APP 创建或修改高保真 UI Demo。用户要求依据 Figma、实机截图、现有 HTML 或产品需求还原页面，统一组件与样式，制作竖屏与掌机横屏布局、离线单文件 HTML、页面配方或组件展厅时使用；尤其适用于先还原现有 APP 页面，再自然加入新功能并输出来源、冲突与严格视觉证据。
---

# GameHub APP UI

目标不是“做一套像 GameHub 的界面”，而是先证明现有页面是什么，再在同一骨架中完成最小改动。

## 强制工作顺序

1. 读取用户提供的需求、截图、现有 Demo 和目标路径。
2. 读取 [来源注册表](references/source-registry.md) 与 [冲突政策](references/conflict-policy.md)。
3. 从 `assets/screen-catalog.json` 的 45 张实机图中选择基准页；不得从空白画布自由发挥。
4. 从 `assets/figma-components.json` 选择组件，并保留 `measured`、`derived` 或 `missing-source` 状态。
5. 修改已有页面时，先检查现有 DOM、交互和同版本实机图；只改本期范围。
6. 先完成原页面骨架，再加入新增内容；横竖屏必须使用独立 Shell。
7. 生成原稿、实现、50% 叠加、绝对差异、热图和组件裁切证据。
8. 所有机器门槛分别通过后再人工审图；人工可否决机器 PASS。

## 任务路由

- 视觉、字体、间距、安全区、横竖布局：读 [基础规范](references/foundations.md)。
- 导航、按钮、Tab、输入、弹层和反馈：读 [核心组件](references/components-core.md)。
- 游戏卡、平台、账号和引擎元数据：读 [领域组件](references/components-domain.md)。
- 新手、首页、搜索、竖屏详情：读 [新手与发现配方](references/recipes-onboarding-discovery.md)。
- 玩游戏、排行榜、游戏库：读 [游戏与游戏库配方](references/recipes-play-library.md)。
- 我的、设置、掌机横屏：读 [个人中心与横屏配方](references/recipes-profile-landscape.md)。
- 社区、CDKEY、MODS、任务商城、组队：读 [Figma 扩展配方](references/recipes-figma-extensions.md)。
- 命令、输入输出、排错和交付：读 [使用说明](references/usage.md)。
- 回归用例与当前真实状态：读 [前向测试](references/forward-tests.md)。

## 来源优先级

1. 用户本轮明确要求和已确认决策。
2. 同版本实机图：页面骨架、内容密度、安全区和真实布局。
3. 最新有效 Figma：新增功能、组件状态和精确视觉属性。
4. 现有 HTML：已实现交互与可复用代码，但不能覆盖更新证据。
5. 历史 PRD/Demo：只补充业务语义。
6. 废弃页：只作为反例。

证据冲突时记录采用项、弃用项、理由、影响范围和置信度。无法唯一裁决时，选更贴近现有页面、改动更小、用户心智更稳定的方案，并明确标记假设。

## 不可违反

- 不新增用户没有要求的页面、弹窗、Toast、入口、字段或流程。
- 不把整页截图当背景并叠加热区冒充实现。
- 原稿只出现在“原稿证据”视图，不得标为 DOM 实现。
- Hero、封面、Banner、头像和产品图标可复用已登记的真实局部资产；文字、按钮、Tab、卡片结构和交互仍须由可访问 DOM 构成。
- 缺少原始 SVG 或精确属性时标记 `missing-source`，不得用 Emoji、通用字标或临时图标冒充。
- 不使用 CDN、远程字体、远程图片、iframe、Canvas 或联网运行时。
- 未知数值显示“暂无数据/暂无评分”或对应空态，不渲染为 `0`。
- 不旋转、拉伸或整体缩放竖屏 DOM 生成横屏。

## 横竖屏基准

- 源画布：竖屏 `1080×2400`，掌机横屏 `2400×1080`。
- 预览视窗仅用于查看：竖屏约 `402×893`，横屏约 `874×393`。
- 竖屏使用底部五栏导航和纵向内容流；搜索结果一排 2 个，平台标识在封面上。
- 横屏使用顶部导航、横向轨道、多列或左右面板和手柄焦点；不得复用竖屏底栏。

## 三个证据工作区

离线预览必须包含：

1. 页面事实：完整浏览 45 张实机原稿，标记“原稿证据，非实现”。
2. 组件展厅：左栏原稿证据，右栏真实 DOM/来源化媒体；显示来源、状态、变体和严格结论。
3. 回归证据：原稿、实现、50% 叠加、绝对差异、热图和失败原因。

“使用方法”可作为第四个说明页签，但不能代替以上三个工作区。

## 严格视觉门槛

- 原稿和实现必须同尺寸、同方向、全分辨率比较。
- 使用原尺寸 RGB MAE、Canny 边缘 XOR、均匀窗口 SSIM、CIEDE2000 P95 和组件几何。
- 禁止高斯预模糊、短边缩放到 180px 或以平均分覆盖失败项。
- RGB、边缘、SSIM 均须 `≥95%`；ΔE2000 P95 须 `≤3`；组件几何误差须 `≤2px`。
- 页面和每个登记组件分别过门；任一失败即保留 `FAIL`。
- 只有原尺寸肉眼检查通过后，才可把 `manualReview.status` 改为 `pass`。
- 不得手填、估算或在 HTML 中覆盖评分。

## 生成与验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .agents/skills/gamehub-app-ui/scripts/build-manifest.ps1
node .agents/skills/gamehub-app-ui/scripts/build-screen-catalog.mjs
python .agents/skills/gamehub-app-ui/scripts/build-visual-assets.py
node .agents/skills/gamehub-app-ui/scripts/build-preview.mjs
node .agents/skills/gamehub-app-ui/scripts/capture-visuals.mjs
python .agents/skills/gamehub-app-ui/scripts/compare-visuals.py
node .agents/skills/gamehub-app-ui/scripts/build-preview.mjs
node .agents/skills/gamehub-app-ui/scripts/validate.mjs all
python -X utf8 C:/Users/z3635/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/gamehub-app-ui
```

`compare-visuals.py` 返回失败时，表示当前实现没有达到门槛；继续看叠加图、差异图、热图和组件报告，不得改低阈值。

## 交付内容

交付时一次列清：

- 生成或修改的页面及方向。
- 采用的基准页、组件 ID、Figma/实机来源。
- 新增功能如何融入现有页面。
- 默认、加载、空、失败、禁用、未绑定或冲突状态。
- 预览文件和使用命令。
- 机器门槛、人工审图、失败组件和已知限制。
- 未实现范围与冲突裁决。

禁止用“约 95%”“肉眼差不多”或整页背景带来的高分代替组件证据。

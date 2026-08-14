---
name: gamehub-app-ui
description: 为盖世游戏（GameHub）APP 创建或修改高保真 UI Demo。用户要求依据 Figma、实机截图、现有 HTML 或产品需求还原页面，统一组件与样式，制作竖屏与掌机横屏布局、离线单文件 HTML、页面配方或组件展厅时使用；尤其适用于在现有 APP 页面基础上自然加入新功能并输出来源与冲突记录。
---

# 盖世游戏 APP UI 模板

先还原现行页面，再以最小改动加入本期内容。把实机图视为真实产品骨架，把 Figma 视为新增功能、组件状态与精确视觉规则的主要证据。

## 开始前

1. 读取用户提供的需求、截图、现有 Demo 和目标输出路径。
2. 读取 [来源注册表](references/source-registry.md) 与 [冲突政策](references/conflict-policy.md)。
3. 按任务加载最少必要参考：
   - 视觉、横竖布局与令牌：读 [基础规范](references/foundations.md)。
   - 导航、按钮、弹层与反馈：读 [核心组件](references/components-core.md)。
   - 游戏、平台、账号和业务模块：读 [领域组件](references/components-domain.md)。
   - 新手、首页、搜索和竖屏详情：读 [新手与发现配方](references/recipes-onboarding-discovery.md)。
   - 玩游戏、排行榜、游戏库和管理：读 [游戏与游戏库配方](references/recipes-play-library.md)。
   - 我的、设置与掌机横屏：读 [个人中心与横屏配方](references/recipes-profile-landscape.md)。
   - 社区、CDKEY、MODS、任务商城、组队等后续能力：读 [Figma 扩展配方](references/recipes-figma-extensions.md)。
4. 需要命令、输入输出范式或排错时，读 [使用说明](references/usage.md)。需要回归检查时，读 [前向测试报告](references/forward-tests.md)。

## 判断任务

- 修改已有页面时，先检查现有 DOM、交互和对应实机图，不要重做整套视觉。
- 新建页面时，先选最接近的页面配方，再组合组件；不要从空白画布自由发挥。
- 同时输出横竖版时，共享业务数据和状态，分别实现竖屏 APP Shell 与掌机横屏 Shell。
- 只需要组件时，保持组件契约完整，不要附带未要求的页面或流程。
- 来源冲突时，执行冲突政策并记录采用项、弃用项、理由、影响范围和置信度。

## 生成流程

1. 列出目标页面、方向、状态和明确不在范围内的能力。
2. 选择页面配方与组件 ID，保留对应来源引用。
3. 从 `assets/gamehub-app-tokens.css` 复制三层令牌，不要在页面内创建另一套颜色和间距体系。
4. 从 `assets/app-demo-template.html` 开始生成离线单文件 Demo；使用真实 DOM 和内联 SVG。
5. 先完成原页面的结构、信息层级、导航、安全区和滚动，再加入本期功能。
6. 实现默认、加载、空、失败、禁用、未绑定或冲突中与需求相关的状态。
7. 为所有显式控件实现可观察反馈；弹窗可开关，Tab 可切换，菜单可展开，横竖切换应切换布局配方。
8. 在交付物内或旁附“使用的页面配方、组件、来源、冲突裁决和未实现范围”。
9. 运行预览与验证器，修复全部失败后再交付。

## 横竖屏规则

- 竖屏默认按 `402×874` 设计，使用底部导航、单列纵向流和触控交互。
- 掌机横屏默认按 `874×402` 设计，使用顶部导航、横向轨道、多列或左右面板和手柄焦点。
- 不要旋转、拉伸或整体缩放竖屏 DOM 生成横屏。
- 不要把横屏掌机布局当成 Mac 桌面布局；Mac 需要独立 Skill 或平台适配层。

## 来源裁决

1. 服从用户本轮明确要求和已确认决策。
2. 页面骨架、真实截断、安全区和滚动采用同版本实机图。
3. 本期新增功能、组件精确状态与视觉规则采用最新有效 Figma。
4. 历史 Demo 和旧 PRD 只补充业务，不覆盖更新证据。
5. 废弃页只用于识别反例，不作为默认模板。
6. 证据仍不能唯一裁决时，选择更贴近现有页面、改动更小、用户心智更稳定的方案并标记假设。

## 禁止事项

- 不要擅自新增页面、弹窗、Toast、流程、字段、入口或产品能力。
- 不要用整页截图作为背景并叠加热区冒充可编辑页面。
- 有原稿时不要用渐变色块、随机图片或通用占位图替代原稿中的 Hero、封面、Banner、头像等复杂媒体。
- 实现视图禁止绘制、嵌入或 Canvas 重放整页原稿；原稿只能出现在独立的“原稿”证据视图。
- 导航、按钮、文字、卡片、Tab、账号区、状态区必须由真实可复用 DOM 构成，并使用稳定的 `data-component-id`。
- 不要把缺失数据渲染成 `0`；使用“暂无数据”“暂无评分”或对应空态。
- 不要用 Emoji 代替产品图标；使用内联 SVG 或项目内图标。
- 不要引用 CDN、远程字体、远程图片、iframe 或需要联网的运行时。
- 不要复制实机图中的渲染异常、内容越界、文本硬裁切和未确认空白状态。
- 不要保存 Figma Token；使用当前授权浏览器、用户导出或公开数据。

## 视觉保真硬门槛

1. 原稿、实现和差异图必须使用相同画布尺寸；竖屏与横屏分别取各自原生布局，不允许旋转或整体缩放复用。
2. Hero、封面、Banner、头像等媒体只能使用 `assets/visual-baselines.json` 显式登记的局部裁片；裁片不得等于整页，也不得把可复用 UI 当作图片展示。
3. 每个代表页必须生成页面级“原稿 / 实现 / 差异图”，每个登记组件必须生成组件级实现图与差异图。
4. 页面和组件的感知相似度均不得低于 `95%`。任一项低于门槛即为 `FAIL`，不得写成已完成或可交付。
5. 所有分数必须由 `scripts/compare-visuals.py` 计算并写入 `assets/visual-report.json`；禁止手填、估算或在 HTML 中覆盖分数。
6. 交付前人工检查差异图，排除整页截图复用、文字重影、裁片接缝、横竖屏压缩和浏览器侧栏遮挡。

## 验收与交付

运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .agents/skills/gamehub-app-ui/scripts/build-manifest.ps1
python .agents/skills/gamehub-app-ui/scripts/build-visual-assets.py
node .agents/skills/gamehub-app-ui/scripts/build-preview.mjs
node .agents/skills/gamehub-app-ui/scripts/capture-visuals.mjs
python .agents/skills/gamehub-app-ui/scripts/compare-visuals.py
node .agents/skills/gamehub-app-ui/scripts/build-preview.mjs
node .agents/skills/gamehub-app-ui/scripts/validate.mjs all
python C:/Users/z3635/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/gamehub-app-ui
```

交付时列出生成或修改的页面与方向、使用的页面配方和组件、来源与冲突裁决、状态与交互、预览路径、验证结果、未纳入异常和已知限制。

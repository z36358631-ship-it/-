# 使用说明

## 1. 调用 Skill

工作区 Skill 位于：

```text
.agents/skills/gamehub-app-ui/
```

在 Codex 会话中直接写 `$gamehub-app-ui`。推荐同时给出目标页面、方向、现有 Demo/截图、本期修改点、禁止增加的能力和输出路径。

## 2. 打开最终预览

```text
demos/UI规范/盖世游戏APP-UI模板与页面配方预览.html
```

预览完全离线，包含四个页签：

- 页面事实：45 张 V6.1.1 实机图，可筛选横竖屏和搜索；全部标记“原稿证据，非实现”。
- 组件展厅：16 个组件；左栏原稿证据，右栏 DOM/来源化媒体；可切换登记状态，并显示来源和严格结论。
- 回归证据：原稿、实现、50% 叠加、绝对差异、热图；右侧列出 RGB、边缘、SSIM、ΔE、几何和失败原因。
- 使用方法：常用 Prompt、生成命令、输出要求和禁止项。

组件或页面显示 `FAIL / 待审` 是真实开发状态，不是预览故障。

## 3. 常用 Prompt

### 修改已有 Demo

```text
使用 $gamehub-app-ui 修改 demos/xxx.html。先根据 screen-xx 和现有 DOM 还原原页面，只完成本期修改；同时提供横竖版，不新增弹窗、Toast 或其他流程。输出页面、组件、来源、冲突和严格视觉证据。
```

### 新建页面

```text
使用 $gamehub-app-ui，按 screen-xx 的现行页面配方创建竖屏离线单文件 Demo。先还原现有结构，再加入本期入口；列出组件 ID、Figma/实机来源、异常状态和未实现范围。
```

### 横竖双版

```text
使用 $gamehub-app-ui 生成搜索结果横竖版。共享业务数据，竖屏一排 2 个且平台标识在封面；掌机横屏使用独立顶部导航和结果布局，不得整体缩放竖屏 DOM。
```

### 只做组件

```text
使用 $gamehub-app-ui 输出 C-BUTTON-GLOW、D-ACCOUNT-CARD 和 D-GAME-CARD 组件展厅。每个组件左栏显示原稿证据，右栏显示真实 DOM 和状态；缺少原始 SVG 时标记 missing-source，不生成近似图标。
```

### 本期 GOG 约束示例

```text
使用 $gamehub-app-ui，在现有游戏库、搜索结果和详情入口中增加 GOG。搜索结果竖屏一排 2 个，平台标识位于封面；GOG 账号卡不显示账号价值，低频切换/解绑收进“…”；若详情本期只要求“获得游戏”标识，不新增 GOG 启动、云存档或时长。
```

## 4. 生成流程

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

`compare-visuals.py` 会在任何严格门槛失败时返回非零；不要用 `|| true` 隐藏，也不要调低阈值。仍可重新运行 `build-preview.mjs`，让预览显示最新失败证据。

## 5. 证据目录

```text
.tmp/gamehub-app-ui/visual-captures/      实现截图
.tmp/gamehub-app-ui/component-captures/   组件实现裁切
.tmp/gamehub-app-ui/geometry/             2px 几何报告
.tmp/gamehub-app-ui/visual-overlays/      50% 叠加
.tmp/gamehub-app-ui/visual-diffs/         原始绝对差异
.tmp/gamehub-app-ui/visual-heatmaps/      增强热图
.tmp/gamehub-app-ui/component-diffs/      组件差异
```

## 6. 交付清单

1. 离线单文件 HTML 或修改后的现有文件。
2. 页面与组件效果清单。
3. 横竖版和状态覆盖清单。
4. 来源引用、冲突裁决和置信度。
5. 页面级五类证据和组件级差异证据。
6. `visual-report.json` 中的真实页面/组件结果。
7. 自动门槛与人工审图状态；失败项必须列出。
8. 未实现范围和静态证据无法证明的行为。

## 7. 常见问题

- 预览不存在：运行 `build-preview.mjs`。
- 45 页数量或哈希失败：运行 `build-manifest.ps1` 与 `build-screen-catalog.mjs`，确认源图是否被替换。
- Figma 无法读取：使用当前登录浏览器或用户导出；不要把 Token 写入 Skill。
- 页面像新产品：说明跳过了实机页骨架，返回页面事实库重新选基准。
- 横屏像压扁竖屏：改用 C-SHELL-L 和横屏页面配方重新排版。
- 组件肉眼不一致但整页分数高：查看组件裁切、叠加和热图，以组件 FAIL 为准。
- 字体导致文字组件失败：先匹配真实字体和行高；仍无法复现时保留失败，不使用文字截图。
- 平台图标缺失：取得原始 SVG 前保持 `missing-source`。

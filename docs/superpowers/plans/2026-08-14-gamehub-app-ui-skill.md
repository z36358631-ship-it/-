# GameHub APP UI Template Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a source-traceable GameHub APP UI Skill that standardizes components and full-page recipes across portrait and handheld landscape demos.

**Architecture:** Use one thin orchestrator Skill with progressively loaded references. Keep immutable source metadata in JSON, reusable UI contracts in component references, full-page structure in recipe references, and deterministic generation/validation in scripts.

**Tech Stack:** Markdown, JSON, CSS custom properties, vanilla HTML/CSS/JavaScript, Node.js, PowerShell, Playwright Core, Python Skill Creator validation.

---

## 目标

实现 `gamehub-app-ui` Skill、完整来源清单、组件/页面配方、离线预览和确定性校验，让后续 APP Demo 基于统一规范生成。

## 文件结构

- `.agents/skills/gamehub-app-ui/SKILL.md`：触发、路由、流程、完成门槛和禁止项。
- `.agents/skills/gamehub-app-ui/agents/openai.yaml`：技能列表显示信息。
- `.agents/skills/gamehub-app-ui/assets/source-manifest.json`：11 个 Figma 页签和 45 张实机图元数据。
- `.agents/skills/gamehub-app-ui/assets/gamehub-app-tokens.css`：三层令牌。
- `.agents/skills/gamehub-app-ui/assets/app-demo-template.html`：离线单文件页面骨架。
- `.agents/skills/gamehub-app-ui/references/*.md`：基础、组件、页面配方、来源、冲突和使用说明。
- `.agents/skills/gamehub-app-ui/scripts/build-manifest.ps1`：确定性生成实机图 Manifest。
- `.agents/skills/gamehub-app-ui/scripts/build-preview.mjs`：生成离线预览。
- `.agents/skills/gamehub-app-ui/scripts/validate.mjs`：结构、覆盖、离线、来源和浏览器运行校验。
- `demos/UI规范/盖世游戏APP-UI模板与页面配方预览.html`：用户可直接查看的成品。

## 任务

### Task 1: 初始化技能与失败契约

**Files:**
- Create: `.agents/skills/gamehub-app-ui/**`
- Create: `.agents/skills/gamehub-app-ui/scripts/validate.mjs`

- [ ] 使用 `init_skill.py gamehub-app-ui --path .agents/skills --resources scripts,references,assets` 初始化标准目录。
- [ ] 编写校验器，先断言 `figmaPages.length === 11`、`deviceScreens.length === 45`、所有引用存在、预览无远程依赖。
- [ ] 运行 `node .agents/skills/gamehub-app-ui/scripts/validate.mjs all`，确认因资源尚未建立而失败。

### Task 2: 建立来源 Manifest 与覆盖矩阵

**Files:**
- Create: `.agents/skills/gamehub-app-ui/scripts/build-manifest.ps1`
- Create: `.agents/skills/gamehub-app-ui/assets/source-manifest.json`
- Create: `.agents/skills/gamehub-app-ui/references/source-registry.md`
- Create: `.agents/skills/gamehub-app-ui/references/conflict-policy.md`

- [ ] 读取 45 张 PNG 的尺寸和 SHA-256，按 01–45 生成稳定 JSON。
- [ ] 登记 Figma 11 个页签、页签 node-id、功能区域、处理结论和代表画板。
- [ ] 逐项记录 `component`、`recipe`、`rule` 或 `deprecated-reference` 处理结果。
- [ ] 运行来源覆盖校验，预期 `PASS figmaCoverage (11/11)`、`PASS deviceImageCoverage (45/45)`。

### Task 3: 实现设计令牌与组件契约

**Files:**
- Create: `.agents/skills/gamehub-app-ui/assets/gamehub-app-tokens.css`
- Create: `.agents/skills/gamehub-app-ui/references/foundations.md`
- Create: `.agents/skills/gamehub-app-ui/references/components-core.md`
- Create: `.agents/skills/gamehub-app-ui/references/components-domain.md`

- [ ] 从实机图和 Figma 组件母版固化三层颜色、排版、间距、圆角、阴影、模糊、容器和动效令牌。
- [ ] 定义框架、按钮、Tab、卡片、菜单、弹窗、抽屉、游戏内容、账号平台、反馈状态和扩展业务组件。
- [ ] 每个组件写清 anatomy、variants、states、events、sourceRefs 和禁止变化。
- [ ] 运行组件引用与硬编码色值校验。

### Task 4: 实现页面配方

**Files:**
- Create: `.agents/skills/gamehub-app-ui/references/recipes-onboarding-discovery.md`
- Create: `.agents/skills/gamehub-app-ui/references/recipes-play-library.md`
- Create: `.agents/skills/gamehub-app-ui/references/recipes-profile-landscape.md`
- Create: `.agents/skills/gamehub-app-ui/references/recipes-figma-extensions.md`

- [ ] 为实机 01–45 建立六类页面配方映射。
- [ ] 为 Figma 八个业务页签建立社区、CDKEY/广告/MODS、任务商城、控制器、组队、版本优化和活动扩展配方。
- [ ] 每个配方写清 direction、shell、sections、components、states、interactions、sourceRefs、conflicts 和 acceptance。
- [ ] 运行页面配方与 45 张图双向引用校验。

### Task 5: 编写总控 Skill 与使用说明

**Files:**
- Modify: `.agents/skills/gamehub-app-ui/SKILL.md`
- Create: `.agents/skills/gamehub-app-ui/references/usage.md`
- Modify: `.agents/skills/gamehub-app-ui/agents/openai.yaml`

- [ ] 用祈使句写触发、输入、按需加载、冲突裁决、生成步骤、自检、输出和禁止项。
- [ ] 用法覆盖新建页面、修改已有 Demo、横竖双版、只取组件、输出来源和冲突报告。
- [ ] 生成 `display_name`、`short_description` 和显式包含 `$gamehub-app-ui` 的默认 Prompt。
- [ ] 运行 `quick_validate.py`。

### Task 6: 生成离线组件与页面预览

**Files:**
- Create: `.agents/skills/gamehub-app-ui/assets/app-demo-template.html`
- Create: `.agents/skills/gamehub-app-ui/scripts/build-preview.mjs`
- Create: `demos/UI规范/盖世游戏APP-UI模板与页面配方预览.html`

- [ ] 用真实 DOM 实现令牌、按钮、Tab、卡片、平台入口、账号卡、菜单、弹窗和状态展厅。
- [ ] 实现代表性竖屏首页/游戏库/详情/我的页与横屏首页/游戏库/详情配方。
- [ ] 实现左侧分类、搜索、方向筛选、状态/变体切换和右侧来源/用法面板。
- [ ] 扫描并拒绝 CDN、iframe、emoji、远程字体和远程图片。

### Task 7: 自动验证、截图与前向测试

**Files:**
- Modify: `.agents/skills/gamehub-app-ui/scripts/validate.mjs`
- Create: `.tmp/gamehub-app-ui/**`

- [ ] 用 Playwright 遍历所有预览入口，验证 0 `pageerror`、按钮有反馈、横竖视口无意外滚动。
- [ ] 截取组件、竖屏页面和横屏页面代表性截图并人工检查。
- [ ] 使用五个真实 Prompt 进行独立前向测试，检查正确引用配方、组件和来源。
- [ ] 运行两次完整构建，确认输出稳定。

### Task 8: 提交与任务板交付

**Files:**
- Stage only files listed above.

- [ ] 运行 `git diff --check` 和全部验收命令。
- [ ] 提交 Skill、预览与验证工具，不带入其他工作区改动。
- [ ] 读取 `GUANWANGGAID-29` 最新版本，添加覆盖和验证证据评论。
- [ ] 使用最新版本把 Issue 移到 `in_review`，不得直接移到 `done`。

1. 用 Skill Creator 初始化 `.agents/skills/gamehub-app-ui`，包含 `agents`、`assets`、`references`、`scripts`。
2. 生成 `source-manifest.json`：登记 Figma 11 个页签、代表节点、45 张实机图的尺寸、方向、类别和 SHA-256。
3. 编写来源注册表与冲突政策，明确实机骨架、Figma 新功能/组件、废弃反例的职责。
4. 编写三层 Design Tokens 与 APP 基础规范。
5. 按应用框架、通用控件、游戏内容、账号平台、反馈状态和业务扩展编写组件契约。
6. 按六类实机页面与八类 Figma 扩展业务编写页面配方。
7. 提供可复制的离线 HTML 模板和内联 SVG 图标集。
8. 编写预览生成脚本，生成组件与页面配方展厅。
9. 编写来源覆盖、引用、禁止项、离线和浏览器 Smoke Test 校验器。
10. 运行 Skill 快速验证、预览校验、截图审查和五个真实 Prompt 前向测试。
11. 只提交本任务文件，更新 Issue 评论并移动到 `in_review`。

## 验收命令

```powershell
node .agents/skills/gamehub-app-ui/scripts/build-preview.mjs
node .agents/skills/gamehub-app-ui/scripts/validate.mjs all
python C:/Users/z3635/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/gamehub-app-ui
```

预期输出：

```text
PASS figmaCoverage (11/11)
PASS deviceImageCoverage (45/45)
PASS sourceTraceability
PASS pageRecipes
PASS componentCatalog
PASS conflictPolicy
PASS offlinePreview
PASS browserRuntime
PASS skillStructure
```

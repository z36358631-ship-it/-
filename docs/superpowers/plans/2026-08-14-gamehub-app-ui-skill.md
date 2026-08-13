# GameHub APP UI 模板 Skill 实施计划

## 目标

实现 `gamehub-app-ui` Skill、完整来源清单、组件/页面配方、离线预览和确定性校验，让后续 APP Demo 基于统一规范生成。

## 任务

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

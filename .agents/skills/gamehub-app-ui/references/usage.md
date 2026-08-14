# 使用说明

## 1. 安装与发现

Skill 位于工作区：

```text
.agents/skills/gamehub-app-ui/
```

在支持工作区 Skill 的 Codex 会话中直接使用 `$gamehub-app-ui`。若客户端未自动发现工作区 Skill，把该目录复制到个人 Skills 目录后重启会话。

## 2. 预览成品

直接双击或用浏览器打开：

```text
demos/UI规范/盖世游戏APP-UI模板与页面配方预览.html
```

预览无需联网。左侧切换代表页，中间展示页面，右侧查看来源、组件和自动评分。顶部可切换“原稿 / 实现 / 差异图”；实现视图中的导航、按钮、文字、卡片、Tab、账号区和状态区都是真实 DOM。

重新生成：

```powershell
node .agents/skills/gamehub-app-ui/scripts/build-preview.mjs
```

## 3. 常用调用

### 新建页面

```text
使用 $gamehub-app-ui，按现行盖世游戏 APP 首页配方创建竖屏离线单文件 Demo。先还原原页面，再增加本期入口；列出页面配方、组件、来源和冲突裁决。
```

### 修改已有 Demo

```text
使用 $gamehub-app-ui 修改 demos/xxx.html。保留现有结构和交互，只在 EPIC 与导入游戏之间增加 GOG；同时提供横竖版，不新增其他流程。
```

### 横竖双版

```text
使用 $gamehub-app-ui 生成搜索结果横竖版。共享数据但分别采用竖屏双列和掌机横屏双面板配方，不允许整体缩放。
```

### 只输出组件

```text
使用 $gamehub-app-ui 输出平台入口卡、账号卡和搜索结果卡组件展厅，包含默认、未绑定、同步中、失败和空状态，并标注来源。
```

## 4. 推荐输入信息

- 目标页面和方向。
- 现有 Demo 路径或截图。
- 本期新增/修改点。
- 明确不能增加的能力。
- 目标输出路径。

信息可从本地文件发现时，Skill 会先自行读取；只有会改变业务流程且无法发现的选择才需要询问。

## 5. 输出结构

每次交付至少包含：

1. 离线单文件 HTML 或被修改的现有文件。
2. 页面与组件效果清单。
3. 横竖版和状态覆盖清单。
4. 来源引用与冲突记录。
5. 页面级原稿、实现、差异图和组件级差异证据。
6. 从 `assets/visual-report.json` 读取的页面/组件自动评分；任一项低于 95% 必须明确标为失败。
7. 验证命令和结果。
8. 已知限制，不把静态图无法证明的行为写成事实。

## 6. 五个回归 Prompt

1. `使用 $gamehub-app-ui，生成游戏库首页横竖两版单文件 Demo。保留现有平台入口和游戏列表，只在 EPIC 与导入游戏之间增加 GOG，不新增其他流程，并列出模板、组件和来源。`
2. `使用 $gamehub-app-ui，按现行“我的页”生成 GOG 已绑定账号卡。低频账号操作放入右上角“…”菜单，不显示账号价值或占位，同时输出异常状态和来源说明。`
3. `使用 $gamehub-app-ui，创建搜索结果横竖版：同一游戏的 EPIC 与 GOG 版本分条展示，GOG 无评分时显示“暂无评分”，横竖共享数据但不能整体缩放。`
4. `使用 $gamehub-app-ui，生成掌机横屏游戏详情页。在“获得游戏”区域的 Steam 旁增加 GOG 标识，不新增 GOG 启动、云存档或时长能力。`
5. `使用 $gamehub-app-ui，制作离线组件展厅，展示顶部栏、底部导航、平台入口、账号卡、游戏卡、按钮、菜单、加载/空/失败状态及来源。`

## 7. 验证

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

期望看到 Figma `11/11`、实机图 `45/45`、视觉资产、视觉截图、组件 DOM 覆盖、视觉保真、来源、组件、配方、方向、冲突、离线预览、浏览器运行和前向 Prompt 全部 `PASS`。视觉证据位于：

```text
.tmp/gamehub-app-ui/visual-captures/
.tmp/gamehub-app-ui/visual-diffs/
.tmp/gamehub-app-ui/component-captures/
.tmp/gamehub-app-ui/component-diffs/
```

## 8. 常见问题

- 预览不存在：运行 `build-preview.mjs`。
- Manifest 哈希失败：确认 45 张源图是否被替换，再重建 Manifest 并重新审计。
- Figma 无法读取：使用当前登录浏览器或用户导出，不要把 Token 写进 Skill。
- 页面看起来像新产品：检查是否跳过了真实页面配方，恢复原骨架再加入需求。
- 横屏像压扁竖屏：改用 C-SHELL-L 与横屏页面配方重新排版。
- 页面或组件低于 95%：打开对应差异图，优先修正大块媒体、布局坐标和背景色，再校正字体、边框与阴影；不要手改评分。
- 横屏右侧变黑或组件缺失：确保截图视口能完整容纳 2400px 画布与预览侧栏，再重新运行 `capture-visuals.mjs`。

# GUANWANGGAID-21 谷歌版提审

## 基本信息

- 阶段：方案 C Demo 待用户验收
- 最后更新时间：2026-08-27
- 当前范围：本地离线单文件 Demo；未进入 Android 实现或 Google Play 提交

## 已确认决策

- D-001：本地导入不支持 SAF，产品方案按申请 `MANAGE_EXTERNAL_STORAGE` 设计。
- D-002：审核员与正式用户体验保持一致，不使用审核专版、远程开关或通过后隐藏。
- D-003：底部“游戏库”永久更名为“文件库”；文件库内固定为“文件｜PC游戏｜复古游戏”，冷启动默认进入“文件”。
- D-004：只删除文件类型筛选中的“游戏文件”；`type:'game'` 数据、游戏图标、PC游戏、复古游戏和添加能力全部保留。
- D-005：底部固定为“首页｜玩游戏｜排行榜｜文件库｜我的”，原首页和游戏内容继续保留。

## 基线与规格

- 视觉基线：盖世游戏 V6.1.1 `screen-08`（竖版首页）、`screen-18`（游戏库-PC）、`screen-22`（导入游戏）。
- 规格：`docs/superpowers/specs/2026-08-27-google-play-consistent-file-library-design.md`
- 实施计划：`docs/superpowers/plans/2026-08-27-google-play-consistent-file-library-demo.md`
- 规格提交：`37e96e16`、`72d9754b`
- 计划提交：`bbfb0b5f`

## Demo 与验证证据

- Demo：`C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html`
- 静态验证脚本：`scripts/validate-google-play-file-library-demo.ps1`
- 静态验收：PASS。
- 独立只读验收：8/8 PASS；发现并修复单文件操作 Sheet 缺少复制、移动、重命名和删除点击绑定后复核通过。
- 内联 JavaScript 语法：PASS。
- 离线检查：PASS；未发现远程 URL、iframe、Canvas、外链 JavaScript 或外链样式。
- 范围检查：PASS；未修改 Android App、Manifest，未生成 AAB，未提交 Google Play。
- 浏览器交互验收：待用户验收。自动化控制本地 `file://` 页面时被浏览器安全策略阻止，未绕过限制。
- 截图证据：未生成；不以旧版截图或静态推断冒充最终视觉证据。
- 严格视觉状态：待审。新增文件页没有同构像素基线，不能声明 RGB、边缘或 SSIM 达到 95%。

## 当前实现结果

- 冷启动固定进入“文件库—文件”，底部第四项选中。
- 文件库三 Tab 均有内容；文件 Tab 保留搜索、存储切换、类型筛选、文件列表和多选操作。
- 文件类型筛选不再出现“游戏文件”，其他游戏相关内容和能力继续存在。
- 权限拒绝状态成为文件渲染前置条件；搜索、筛选和存储切换不会重新显示文件。
- USB 未连接时隐藏；多选栏和单文件操作均包含重命名，并保留添加到 PC/复古游戏能力。
- A/B、Hash、双 Manager 和审核前后差异逻辑已经移除。

## 外部风险与限制

- Google Play 是否认可游戏应用将“所有文件访问权限”作为核心用途，仍是未验证的外部审核风险。
- 本 Demo 只能验证产品表达和交互方案，不能代表 Google 真实审核结果，也不提供 95% 通过率承诺。
- 玩游戏、排行榜、我的在本 Demo 中维持原页面入口语义，Demo 仅重点实现首页与文件库路由。

## 下一步

1. 用户刷新并体验本地 Demo，确认文件库默认页、首页返回、三 Tab、权限拒绝与文件操作。
2. 用户确认 Demo 后，再决定是否进入 Android 实现、权限声明、商店素材与审核视频阶段。

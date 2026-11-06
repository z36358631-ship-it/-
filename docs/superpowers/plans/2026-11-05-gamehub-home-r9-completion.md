# 盖世7.0首页续改 Implementation Plan

> **For agentic workers:** 按本文件逐项执行，员工仅修改已分配模块，主管负责整合与验收。

**Goal:** 完成中断对话的首页、后台、签到任务和精简文档，并落实横屏右上角工具栏。

**Architecture:** 沿用 homepage-lab 独立横竖 Shell、离线媒体和模块脚本。首页、后台、任务、文档分别维护；统一构建后截图，Word从同版Markdown导出。

**Tech Stack:** HTML/CSS/JavaScript、Python构建、Playwright、Markdown、Word。

## 当前有效要求

- 首页导航： 首页、社区、游戏库、排行榜、我的。
- 竖屏：搜索→继续按钮及右侧游戏图标→频道→资源位→金刚位；继续文字在播放图标下方，上划后缩到右上角。
- 横屏和平板：无继续游戏；横屏搜索为放大镜，与签到、消息同处主导航右侧。沿用已有设备入口和系统地区限制。
- 左栏支持显示继续游玩、显示资源位。后台三层新增样式、签到积分和每日/成长任务沿用用户截图与既有业务。
- 横屏合集按最新反馈改为120px紧凑横条，左标题右六图标同排，背景减弱；窄预览142px上下排，竖屏和平板保持。
- PRD简短，使用现行六要素结构；Markdown和Word规则、图片一致。

## Task 1: 首页整合（主管）

Files: `work/GUANWANGGAID-64/homepage-lab/app.js`、`resume.css`、`verify.cjs`。

- [x] 恢复两条历史对话、截图、状态卡及中断代码，确认最新追加要求。
- [x] 将 `topTools(wide=false)` 在宽屏输出 `.land-tools`，搜索仅图标；放入 `.land-nav` 右侧并删除重复搜索行。
- [x] 保持竖屏 `.app-top` 与 `recentGames()` 竖屏条件，返回与切换方向不残留收起按钮。
- [x] Playwright断言三工具位于主导航右侧且同排，搜索/签到可达并返回，窄视窗不遮挡。

## Task 2: 后台与任务（独立员工）

Files: `admin.js/css`、`tasks-revision.js/css`，各自专项证据。

- [x] 核对三张后台截图及签到截图，修复已有实现中的真实差异。
- [x] 运行 `python -X utf8 work/GUANWANGGAID-64/homepage-lab/build-admin.py`，同步离线后台到公开目录的本地副本。
- [x] 验证三层配置、保存取消和样式预览，以及签到、更多积分、每日/成长任务、重复签到和返回。

## Task 3: 构建与文档（主管和文档员工）

Files: `public/gamehub-home-lab/`、`outputs/gamehub-home-prd-20261105/`、对应正式PRD目录。

- [x] 运行 `python -X utf8 work/GUANWANGGAID-64/homepage-lab/build.py`。
- [x] 运行 `node work/GUANWANGGAID-64/homepage-lab/verify.cjs`，各系统地区×三形态及窄窗口验证通过。
- [x] 最新DOM截图后同步精简PRD与Word，渲染逐页检查。
- [x] 核对截图与构建哈希，回写状态和真实验证结果；发布状态与本地完成分开陈述。

## 验收边界

本次为HTML评审Demo；积分金额、成长任务内容、真实签到结算及线上服务不凭空补齐。未执行的外部发布、飞书导入、真机测试不标为通过。既有原PC体验稿不在本轮改动范围。

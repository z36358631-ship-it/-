# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-file HTML demo for the 盖世游戏 (Geek Game) virtual layout editor — a 900×400 px landscape "phone" container that lets users edit, switch, and preview two virtual gamepad layouts.

## File Structure

- `layout-demo.html` — The entire demo: CSS + HTML + JS in one file. Open directly in any browser, no build step needed.
- `index.html` — Separate marketing/landing page for the game product.
- `产品demo设计.txt` — PRD annotation system specification (how to add orange numbered badges + draggable tooltips to UI pages for developer handoff).
- `demos/社区2.0demo.html` — 社区前端 demo（关注/游戏圈 + 5tab底部导航），含分区管理、分区详情子页面、管理权限测试。
- `demos/社区后台demo.html` — 社区后台管理系统 demo，含分区/身份/话题/动态/举报/操作记录等模块。

## Architecture of 社区2.0demo.html

### 分区管理页 (`#page-preference`)
- 顶部已置顶栏 + 搜索框 + "全部分区/我加入的"双Tab + 列表
- 置顶上限5个，操作为置顶（非关注）
- 点击分区 icon 进入独立分区详情子页面 (`#page-partition-detail`)

### 分区详情子页面 (`#page-partition-detail`)
- 头部: icon + 名称 + 描述(与首页分区头部通过`getPartitionDesc()`取同一份数据) + 加入按钮
- 子Tab: 综合/官方/求助/攻略（与首页分区header一致）
- 帖子列表，横屏强制单列

### 管理权限测试
- 容器外右上角 toggle 开关 (`adminMode` 全局变量)
- 开启后帖子 `···` 更多菜单和详情页操作面板追加管理操作
- 管理操作: 置顶/静默/删除(二次确认弹窗)/板块调整(综合/求助/攻略)
- 规则: 官方帖子仅可置顶，不可静默/删除/移动；非官方帖子不可移到官方板块

### 关键数据结构
- `allPartitionsData[]` — 分区列表 `{name, desc, icon}`
- `pinnedPartitions[]` — 已置顶分区名数组
- `joinedPartitions` — Set，已加入分区
- `mockPosts[]` — 帖子数据，含 `isHelp/isGuide/isOfficial/isPinned/isMuted` 分类与状态字段

## Architecture of 社区后台demo.html

### 动态管理 (`#page-post`)
- 帖子分类Tab: 全部/综合/官方/求助/攻略 (`switchPostCatTab` 切换过滤)
- 表格含"分类"列，显示当前分类标签
- 操作列含"移动"按钮，打开页面内 modal 弹窗选择目标分类
- `getPostCategoryAdmin(p)` 判断帖子分类
- `movePostCategory(id, newCat)` 执行分类移动

## Architecture of layout-demo.html

All logic lives in a single `<script>` block. Key state variables:

| Variable | Purpose |
|---|---|
| `hasSubLayout` | Whether a sub-layout (布局2) has been created |
| `curLayout` | Active layout index: `1` or `2` |
| `editState` | Deep-cloned layout data `{1: {name, btns[]}, 2?: ...}` |
| `swWidget` | The draggable cycle-widget object `{x%, y%, s}` or `null` |
| `undoStack / redoStack` | Operation history for undo/redo |

### Two views inside `.phone`
- `#ed` — Editor view (default active): canvas + toolbar + add panel + selection popover
- `#gm` — Game preview view: static background + controls overlay `#gm-ctrl`

### Button data model
Each button `b` in `editState[n].btns`:
```js
{ id, t: 'c'|'joy'|'r', x: %, y: %, s: px, ic?: iconKey }
```
- `joy` = joystick (large circle with arrows)
- `c` = standard circle button
- `r` = rectangular button (height = s × 0.52)

### Key render functions
- `renderEditor()` — Clears and rebuilds `#ed-canvas` from `editState[curLayout]` + optional `swWidget`
- `renderGame(animate)` — Rebuilds `#gm-ctrl` from `editState[curLayout]`; if `hasSubLayout && swWidget`, appends cycle button
- `updateToolbar()` — Swaps the `#tb-sw-area` between "新建子布局" and "切换+删除" based on `hasSubLayout`

### Sub-layout lifecycle
`createSubLayout()` → sets `hasSubLayout=true`, initialises `editState[2]`, sets `swWidget` to default position → `updateToolbar()` + `renderEditor()`  
`deleteSubLayout()` → resets all state to initial, `curLayout=1`, `swWidget=null` → `updateToolbar()` + `renderEditor()`

### PRD撰写规范
写PRD时必须对照 `prd/PRD自查清单-前端展示易遗漏项.md` 逐条落实涉及的场景，不可遗漏。

### PRD Annotation System
See `产品demo设计.txt` for full spec. Key rules when adding annotations:
- Orange badge: `background: rgb(250,173,20)`, white 10px bold text, `padding:0 4px`, `border-radius:2px`
- Tooltip: `background:#f0efef`, `width:450px`, draggable, close via X only
- Badges must be mounted on `body` (not inside `.phone`) because `.phone` has `overflow:hidden`
- Position via `getBoundingClientRect` after load + on resize

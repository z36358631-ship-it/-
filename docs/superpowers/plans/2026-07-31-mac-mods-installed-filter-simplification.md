# Mac MODS Installed Filter Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Mac MODS“已安装”页筛选精简为“全部、可更新”，并同步标准 PRD。

**Architecture:** 保留现有单文件 HTML 的 `dispatch → reducer → derive → render` 状态流，只收敛已安装筛选枚举、过滤函数和渲染选项。启用值和启停管理仍由卡片详情状态处理，不与列表筛选绑定。

**Tech Stack:** HTML、CSS、原生 JavaScript、Markdown、Node.js、Playwright Core

---

### Task 1: 收敛已安装筛选状态

**Files:**

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/verify-mac-mods-discovery.mjs`

- [ ] **Step 1: 先更新筛选断言**

```javascript
assert.deepEqual(
  await page.locator('[data-action="set-installed-filter"]')
    .evaluateAll(items => items.map(item => item.dataset.value)),
  ['all', 'update']
);
assert.equal(
  await page.locator('[data-action="set-installed-filter"]', { hasText: /已启用|未启用/ }).count(),
  0
);
```

- [ ] **Step 2: 运行旧版确认红灯**

Run:

```powershell
node .tmp/verify-mac-mods-discovery.mjs
```

Expected: FAIL，旧版仍返回 `all / enabled / disabled / update`。

- [ ] **Step 3: 修改最小实现**

`installedFilters` 只保留：

```javascript
const installedFilters = {
  all: () => true,
  update: mod => mod.update_fact === 'update_available'
    || activeTask(current, mod)?.task_state === 'failed'
};
```

`SET_INSTALLED_FILTER` 只接受：

```javascript
next.ui.installedFilter = ['all', 'update'].includes(action.value)
  ? action.value
  : 'all';
next.ui.scrollTopByTab.installed = 0;
```

渲染选项只保留：

```javascript
[
  ['all', '全部'],
  ['update', '可更新']
]
```

- [ ] **Step 4: 运行筛选验证**

Run:

```powershell
node .tmp/verify-mac-mods-discovery.mjs
node .tmp/verify-mac-mods-dom-flow.mjs
```

Expected: 两项筛选、点击流和无结果状态均 PASS。

- [ ] **Step 5: 补齐空状态与更新失败详情**

当当前设备没有已安装 MOD 时，显示“当前设备尚未安装 MOD”和“浏览可用 MOD”；更新失败详情继续显示启用或停用入口。加入自动化断言，确保筛选切换回到列表顶部。

### Task 2: 输出标准 PRD

**Files:**

- Create: `prd/ai生成/【Prd】《盖世游戏》Mac端MODS已安装筛选精简需求.md`
- Modify: `prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md`

- [ ] **Step 1: 在主 PRD 追加 V1.4 变更记录**

明确 Mac 已安装页只保留“全部、可更新”，APP 规则不变；启用值与启停操作继续存在。

- [ ] **Step 2: 生成聚焦 PRD**

PRD 包含版本信息、背景目标、核心路径、C 端详细设计、边界、埋点复用、国内海外差异和验收标准；不包含 B 端章节和图片。

- [ ] **Step 3: 自查 PRD**

Run:

```powershell
rg -n "待补充|待确认|本地路径|localhost|file://" "prd/ai生成/【Prd】《盖世游戏》Mac端MODS已安装筛选精简需求.md"
```

Expected: 无匹配。

### Task 3: 回归、提交和推送

**Files:**

- Test: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `prd/ai生成/【Prd】《盖世游戏》Mac端MODS已安装筛选精简需求.md`

- [ ] **Step 1: 运行全量回归**

```powershell
node .tmp/verify-mac-mods-discovery.mjs
node .tmp/verify-mac-mods-reference.mjs
node .tmp/verify-mac-mods-dom-flow.mjs
node tools/verify-dst-mods-demos.mjs --only=mac
git diff --check
```

Expected: 全部 PASS。

- [ ] **Step 2: 精确暂存**

```powershell
git add -- "demos/Mod与发行人/Mod功能Mac端demo.html" "prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md" "prd/ai生成/【Prd】《盖世游戏》Mac端MODS已安装筛选精简需求.md" "docs/superpowers/specs/2026-07-31-mac-mods-installed-filter-simplification-design.md" "docs/superpowers/plans/2026-07-31-mac-mods-installed-filter-simplification.md"
git diff --cached --check
```

Expected: 暂存区仅包含本次五个文件。

- [ ] **Step 3: 提交并推送**

```powershell
git commit -m "refine(mods): simplify installed filters"
$commit = git rev-parse HEAD
git worktree add -b publish/mods-filter-20260731 .tmp/mods-filter-publish refs/remotes/origin/main
git -C .tmp/mods-filter-publish checkout $commit -- "demos/Mod与发行人/Mod功能Mac端demo.html" "prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md" "prd/ai生成/【Prd】《盖世游戏》Mac端MODS已安装筛选精简需求.md" "docs/superpowers/specs/2026-07-31-mac-mods-installed-filter-simplification-design.md" "docs/superpowers/plans/2026-07-31-mac-mods-installed-filter-simplification.md"
git -C .tmp/mods-filter-publish commit -m "refine(mods): simplify installed filters"
git -C .tmp/mods-filter-publish push origin HEAD:main
```

Expected: 提交成功，远端默认分支 `origin/main` 仅新增本次五个文件的最终版本。

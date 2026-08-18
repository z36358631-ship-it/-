# 暗黑系列预热页弹窗进入行为 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“查看适配进度”改为仅关闭弹窗并进入当前预热页，不再自动滚动。

**Architecture:** 保留现有弹窗 DOM、文案和视觉，仅删除 CTA 点击事件中的锚点定位调用。使用静态源码检查和浏览器行为检查验证弹窗关闭、滚动位置不变及视频轮播无回归。

**Tech Stack:** 单文件 HTML、原生 JavaScript、浏览器 DOM API

---

### Task 1: 修正弹窗 CTA 行为

**Files:**
- Modify: `demos/暗黑系列/暗黑系列适配进度预热demo.html:100`

- [ ] **Step 1: 记录修改前行为**

Run: `rg -n "popupCta|scrollIntoView" "demos/暗黑系列/暗黑系列适配进度预热demo.html"`

Expected: CTA 点击事件同时包含隐藏弹窗和 `scrollIntoView`。

- [ ] **Step 2: 实施最小修改**

将事件改为：

```js
document.querySelector('#popupCta').addEventListener('click',()=>{
  document.querySelector('#popup').style.display='none';
});
```

- [ ] **Step 3: 执行静态检查**

Run: `rg -n "popupCta|scrollIntoView" "demos/暗黑系列/暗黑系列适配进度预热demo.html"`

Expected: CTA 点击事件只隐藏弹窗，文件中不存在 `scrollIntoView`。

### Task 2: 回归交互

**Files:**
- Test: `demos/暗黑系列/暗黑系列适配进度预热demo.html`

- [ ] **Step 1: 启动本地静态服务**

Run: `python -m http.server 4173 --directory demos/暗黑系列`

Expected: 预热页返回 HTTP 200。

- [ ] **Step 2: 验证 CTA**

打开预热页，记录点击前 `scrollY`，点击“查看适配进度”，再次读取 `scrollY`。

Expected: 弹窗关闭，点击前后 `scrollY` 相同。

- [ ] **Step 3: 验证既有交互**

点击实机视频左右切换和圆点。

Expected: 暗黑4与暗黑3视频信息正常切换，无控制台错误。

### Task 3: 同步 PRD

**Files:**
- Create: `prd/ai生成/【Prd】《盖世游戏》暗黑系列适配预热H5与正式支持详情页需求.md`

- [ ] **Step 1: 按当前两阶段口径生成 PRD**

PRD 明确预热页与正式支持详情页的状态门禁、页面内容、弹窗文案、按钮行为、异常边界、埋点及验收标准；本期不含运营活动。

- [ ] **Step 2: 自检**

Run: `rg -n "仅关闭|不自动滚动|不含运营活动|Battle.net|虚拟手柄" "prd/ai生成/【Prd】《盖世游戏》暗黑系列适配预热H5与正式支持详情页需求.md"`

Expected: 关键业务与交互口径均有明确条目，无占位词。

- [ ] **Step 3: 提交**

```powershell
git add -- "demos/暗黑系列/暗黑系列适配进度预热demo.html" "docs/superpowers/specs/2026-08-18-diablo-preheat-popup-entry-design.md" "docs/superpowers/plans/2026-08-18-diablo-preheat-popup-entry.md" "prd/ai生成/【Prd】《盖世游戏》暗黑系列适配预热H5与正式支持详情页需求.md"
git commit -m "fix: align Diablo preheat popup entry behavior"
```

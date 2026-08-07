# Mac Steam Icon Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Mac 版本管理 Demo 中失真的 Steam 近似图标替换为标准、可缩放且继承场景颜色的 Steam SVG 标志。

**Architecture:** 保留当前单文件 HTML 和所有调用位置，只修改公共 `#i-steam` Symbol，因此封面、搜索、详情、账号、设置与弹窗会同步更新。自动测试直接约束 Symbol 的结构和官方轮廓数据，浏览器测试负责验证交互无回归，截图负责验证 12–22px 的实际可辨识度。

**Tech Stack:** 单文件 HTML、内联 SVG Symbol、CSS `currentColor`、Node.js `node:test`、Playwright 浏览器验收

---

## 文件结构

- 修改：`tests/mac-native-version-demo.test.mjs`——新增 Steam Symbol 结构与轮廓回归测试。
- 修改：`demos/PC与Mac端/Mac原生游戏版本管理demo.html`——仅替换 `#i-steam` 的内部 SVG 图形。
- 生成验收证据：`test-results/mac-native-version-switch/`——保留浏览器流程截图；不作为产品代码依赖。

### Task 1: 用测试锁定标准 Steam Symbol

**Files:**
- Modify: `tests/mac-native-version-demo.test.mjs`
- Test: `tests/mac-native-version-demo.test.mjs`

- [ ] **Step 1: 写入失败测试**

在现有示例测试前加入：

```js
test('Steam 图标使用标准单路径轮廓并继承场景颜色', () => {
  const symbol = html.match(/<symbol id="i-steam"[^>]*>([\s\S]*?)<\/symbol>/)?.[1] ?? '';
  const expectedPath = 'M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z';

  assert.match(symbol, /<path\b[^>]*fill="currentColor"[^>]*stroke="none"/i, 'Steam 图形未继承 currentColor');
  assert.strictEqual((symbol.match(/<path\b/g) ?? []).length, 1, 'Steam 图形不是单一路径');
  assert.strictEqual(/<circle\b|--steam-cut/.test(symbol), false, '仍使用圆形与线段近似图标');
  assert.strictEqual(symbol.includes(`d="${expectedPath}"`), true, 'Steam 标准轮廓数据不一致');
});
```

- [ ] **Step 2: 运行测试并确认先失败**

Run: `node --test tests/mac-native-version-demo.test.mjs`

Expected: 新增用例 FAIL，失败信息为 `Steam 图形未继承 currentColor` 或 `仍使用圆形与线段近似图标`；既有用例仍通过。

- [ ] **Step 3: 提交测试基线**

```bash
git add tests/mac-native-version-demo.test.mjs
git commit -m "test: lock Steam icon geometry"
```

### Task 2: 替换公共 Steam SVG Symbol

**Files:**
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html:73`
- Test: `tests/mac-native-version-demo.test.mjs`

- [ ] **Step 1: 将旧 Symbol 替换为标准轮廓**

将 `#i-steam` 改为：

```html
<symbol id="i-steam" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/></symbol>
```

- [ ] **Step 2: 运行静态测试并确认通过**

Run: `node --test tests/mac-native-version-demo.test.mjs`

Expected: 全部用例 PASS，新增用例证明图标为单路径、使用 `currentColor`、不再包含旧圆形近似。

- [ ] **Step 3: 运行浏览器流程测试**

Run: `node --test tests/mac-native-version-demo.browser.test.mjs`

Expected: 全部用例 PASS，版本切换、安装、取消下载与再次切换流程无回归，页面错误数组为空。

- [ ] **Step 4: 检查外部依赖和补丁质量**

Run: `rg -n "https?://|<iframe|<link[^>]+href=|<script[^>]+src=" "demos/PC与Mac端/Mac原生游戏版本管理demo.html"`

Expected: 无输出。

Run: `git diff --check -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html" "tests/mac-native-version-demo.test.mjs"`

Expected: 无输出。

- [ ] **Step 5: 提交实现**

```bash
git add "demos/PC与Mac端/Mac原生游戏版本管理demo.html" tests/mac-native-version-demo.test.mjs
git commit -m "fix: replace Steam icon in Mac demo"
```

### Task 3: 浏览器逐场景视觉验收

**Files:**
- Verify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Evidence: `test-results/mac-native-version-switch/`

- [ ] **Step 1: 打开本地 Demo 并检查错误日志**

在真实浏览器打开该 HTML，确认页面加载完成，控制台 `error` 数量为 `0`。

- [ ] **Step 2: 检查小尺寸图标**

在游戏库和搜索页检查约 `12px`、`15px` 的 Steam 图标，确认圆环、连杆、手柄端点仍能区分，没有裁切、糊成圆点或溢出角标。

- [ ] **Step 3: 检查中等尺寸图标**

在账号区、详情主按钮、平台信息与安装弹窗检查约 `13–18px` 图标：深色背景显示浅色，白色主按钮显示深色，轮廓均清楚。

- [ ] **Step 4: 检查大尺寸图标**

打开版本切换弹窗与设置页，检查约 `19px`、`22px` 图标；版本弹窗保持 `36×36px` 蓝灰底、`9px` 圆角和白色 glyph。

- [ ] **Step 5: 对照截图确认非目标元素未变化**

检查 Epic、GOG、Apple/Mac 原生图标、按钮、文字、间距和交互位置未改变；保留最终浏览器页面供用户直接体验。

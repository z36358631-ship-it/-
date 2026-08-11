# Mac Install Path Left Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让安装位置收起态的文件夹图标、路径和容量形成清晰的同行对齐，不改变第二行操作和下拉交互。

**Architecture:** 沿用现有 CSS Grid 结构，只改图标的网格行和文字组对齐方式。通过 Playwright 读取元素边界框，验证图标中心、文字基线及第二行右对齐。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Playwright Core、Node.js Test Runner、Markdown

---

### Task 1: 增加左侧对齐可视化测试

**Files:**
- Modify: `tools/capture-mac-native-v17.mjs`
- Test: `test-results/mac-native-v17-browser-report.json`

- [ ] **Step 1: 写入对齐断言**

```js
const pathIconBox = await page.locator('#installPathTrigger > .install-path-icon').boundingBox();
const pathValueBox = await page.locator('#selectedInstallPath').boundingBox();
const pathMetaBox = await page.locator('#selectedInstallPathMeta').boundingBox();
checks.pathIconCenterDelta = Math.abs(
  (pathIconBox.y + pathIconBox.height / 2) - (pathValueBox.y + pathValueBox.height / 2)
);
checks.pathTextBottomDelta = Math.abs(
  (pathValueBox.y + pathValueBox.height) - (pathMetaBox.y + pathMetaBox.height)
);
assert.ok(checks.pathIconCenterDelta <= 1, '文件夹图标应与路径文字垂直居中');
assert.ok(checks.pathTextBottomDelta <= 2, '路径和可用空间应按文字基线对齐');
```

- [ ] **Step 2: 运行截图脚本并确认测试失败**

Run: `node tools/capture-mac-native-v17.mjs`

Expected: FAIL，文件夹图标与路径文字中心偏差大于 1 px。

### Task 2: 修复图标和文字对齐

**Files:**
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`

- [ ] **Step 1: 将图标限定在第一行并统一文字基线**

```css
.install-path-icon{
  grid-row:1;
  align-self:center;
}
.install-path-copy{
  align-items:baseline;
}
```

- [ ] **Step 2: 重跑截图脚本**

Run: `node tools/capture-mac-native-v17.mjs`

Expected: PASS；`pathIconCenterDelta <= 1`、`pathTextBottomDelta <= 2`、`pathHintOnSeparateLine = true`、`pathHintRightAligned = true`。

- [ ] **Step 3: 视觉检查收起态和展开态**

Open:
- `public/prd/mac-native-version-management/04-path-largest-default.png`
- `public/prd/mac-native-version-management/08-path-dropdown-expanded.png`

Expected: 左侧图标与路径成为一组；容量不与路径重叠；右侧操作和箭头位置不变。

### Task 3: 更新 PRD 与固定图片地址

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md`
- Modify: `tests/mac-native-prd-v15.test.mjs`
- Modify: `public/prd/mac-native-version-management/04-path-largest-default.png`
- Modify: `public/prd/mac-native-version-management/08-path-dropdown-expanded.png`

- [ ] **Step 1: 追加 V1.9 版本记录**

```markdown
|2026-08-11|V1.9|郑群超|调整安装位置左侧对齐：文件夹图标与路径同行居中，路径与容量基线对齐|当前执行版本|
```

- [ ] **Step 2: 先提交更新后的两张截图**

```powershell
git add -- 'public/prd/mac-native-version-management/04-path-largest-default.png' 'public/prd/mac-native-version-management/08-path-dropdown-expanded.png'
git commit -m "docs(mac): refresh install path alignment screenshots"
```

- [ ] **Step 3: 将 PRD 的 8 张图统一切换到图片提交 SHA**

Expected: 16 处 Markdown 图片引用对应 8 张图，均使用同一个 40 位固定提交 SHA。

- [ ] **Step 4: 运行全量测试**

Run: `node --test tests/mac-native-install-interaction-v16.test.mjs tests/mac-native-install-path-v17.test.mjs tests/mac-native-prd-v15.test.mjs`

Expected: 13 tests passed，0 failed。

- [ ] **Step 5: 验证图片链接**

Expected: 8 个唯一图片地址均返回 HTTP 200 与 `image/png`。

- [ ] **Step 6: 提交并推送 Demo、PRD 和测试**

```powershell
git add -- 'demos/PC与Mac端/Mac原生游戏版本管理demo.html' 'prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md' 'tools/capture-mac-native-v17.mjs' 'test-results/mac-native-v17-browser-report.json' 'tests/mac-native-prd-v15.test.mjs'
git commit -m "fix(mac): align install path icon and text"
git push origin codex/guanwanggaid-5-prd-feishu-20260810
```

Expected: 远程分支指向最终提交，新的 RawGitHack 预览地址可访问。

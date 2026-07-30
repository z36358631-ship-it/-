# GameHub 新手引流第三页进度条 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在国内、海外“我是新手”分支的第3页补齐三段全亮进度条，同时保持“我有游戏想玩”分支和现有业务交互不变。

**Architecture:** 继续使用单文件 Demo 的现有 `.onboarding-progress` 组件，不新增状态或脚本逻辑。国内进度条直接放入 `page2 .page-body`；海外进度条通过专属 `.gh-guide__progress` 安全区容器放入 `page2b .gh-guide`，避免影响状态栏和轮播布局。现有 Playwright 脚本负责验证页面范围、三段完成态和无回归。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 24、`playwright-core`

---

## 文件结构

**修改文件：**

- `tools/verify-onboarding-source-integration-ui.mjs`：增加国内、海外新手第3页进度条和“有游戏想玩”分支不展示的浏览器验收。
- `demos/新手引导完整链路demo.html`：在 `page2`、`page2b` 增加三段全亮进度条，并为海外页增加专属安全区容器。

**不修改：**

- `page0`、`pageSource` 现有进度条。
- `page1`“有游戏想玩”分支。
- 礼包浮层、海外轮播、导入扫描、完成页及来源状态机。
- 两份 PRD 和现有 PRD 截图。

---

### Task 1: 为第三页进度条建立失败验收

**Files:**

- Modify: `tools/verify-onboarding-source-integration-ui.mjs`
- Test: `demos/新手引导完整链路demo.html`

- [ ] **Step 1: 验证“有游戏想玩”分支不显示第3步进度条**

在提交来源后、`#page1.active` 断言之后增加：

```js
assert.equal(
  await page.locator('#page1 .onboarding-progress').count(),
  0,
  'the has-game branch must not receive the beginner third-step progress'
);
```

- [ ] **Step 2: 验证国内新手第3页为三段完成态**

在 `#page2.active` 断言之后增加：

```js
assert.equal(
  await page.locator('#page2 .onboarding-progress span').count(),
  3,
  'the domestic beginner landing page must show three progress segments'
);
assert.equal(
  await page.locator('#page2 .onboarding-progress span.is-active').count(),
  3,
  'all domestic third-step progress segments must be active'
);
assert.equal(
  await page.locator('#page2 .onboarding-progress').getAttribute('aria-label'),
  '独立新手引流，第3步，共3步'
);
```

- [ ] **Step 3: 验证海外新手第3页安全区和三段完成态**

在 `#page2b.active` 断言之后增加：

```js
assert.equal(
  await page.locator('#page2b .gh-guide__progress').count(),
  1,
  'the overseas beginner landing page must use its dedicated progress safe area'
);
assert.equal(
  await page.locator('#page2b .onboarding-progress span').count(),
  3,
  'the overseas beginner landing page must show three progress segments'
);
assert.equal(
  await page.locator('#page2b .onboarding-progress span.is-active').count(),
  3,
  'all overseas third-step progress segments must be active'
);
assert.equal(
  await page.locator('#page2b .onboarding-progress').getAttribute('aria-label'),
  'GameHub onboarding, step 3 of 3'
);
```

- [ ] **Step 4: 运行验收并确认按预期失败**

Run:

```powershell
node tools/verify-onboarding-source-integration-ui.mjs
```

Expected: FAIL，首个失败信息为 `the domestic beginner landing page must show three progress segments`，实际数量为 `0`。

- [ ] **Step 5: 提交失败验收**

```powershell
git add -- 'tools/verify-onboarding-source-integration-ui.mjs'
git commit -m "test(onboarding): require third-step progress"
```

---

### Task 2: 在国内、海外新手第3页复用进度条

**Files:**

- Modify: `demos/新手引导完整链路demo.html`
- Test: `tools/verify-onboarding-source-integration-ui.mjs`

- [ ] **Step 1: 增加海外进度条安全区样式**

在 `.gh-guide` 后、`.gh-guide__viewport` 前增加：

```css
.gh-guide__progress{
  flex:0 0 auto;
  padding:72px 24px 0;
}
.gh-guide__progress .onboarding-progress{
  margin-bottom:0;
}
```

- [ ] **Step 2: 在国内新手第3页增加三段完成态**

将 `page2 .page-body` 开头改为：

```html
<div class="page-body" style="padding-top:56px">
  <div class="onboarding-progress" aria-label="独立新手引流，第3步，共3步">
    <span class="is-active"></span><span class="is-active"></span><span class="is-active"></span>
  </div>
  <div class="page-title" style="margin-bottom:16px">选一款试试</div>
```

- [ ] **Step 3: 在海外新手第3页增加安全区和三段完成态**

将 `page2b .gh-guide` 开头改为：

```html
<div class="gh-guide">
  <div class="gh-guide__progress">
    <div class="onboarding-progress" aria-label="GameHub onboarding, step 3 of 3">
      <span class="is-active"></span><span class="is-active"></span><span class="is-active"></span>
    </div>
  </div>
  <div class="gh-guide__viewport">
```

- [ ] **Step 4: 运行真实交互和静态回归**

Run:

```powershell
node tools/verify-onboarding-source-integration-ui.mjs
node tools/verify-personalization-acquisition-wizard.mjs onboardingSource
node tools/verify-personalization-acquisition-wizard.mjs syntax
```

Expected:

```text
PASS onboardingSourceUi
PASS onboardingSource
PASS syntax
```

- [ ] **Step 5: 生成国内、海外第3页视觉证据**

Run:

```powershell
$env:TASK_PROGRESS_OUTPUT=(New-Item -ItemType Directory -Force '.tmp\onboarding-third-step-progress').FullName
@'
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=process.cwd();
const file=path.join(root,'demos','新手引导完整链路demo.html');
const executablePath=[
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find(fs.existsSync);
if(!executablePath) throw new Error('Local Chrome not found');

const browser=await chromium.launch({executablePath,headless:true});
const page=await browser.newPage({viewport:{width:1180,height:940}});
await page.goto(pathToFileURL(file).href);
await page.evaluate(()=>localStorage.clear());
await page.reload();
await page.locator('#page0 .opt-card').nth(1).click();
await page.locator('[data-onboarding-source-code="other_or_unknown"]').click();
await page.locator('[data-action="submit-onboarding-source"]').click();
await page.waitForTimeout(2200);
await page.locator('.phone').screenshot({
  path:path.join(process.env.TASK_PROGRESS_OUTPUT,'domestic-third-step.png')
});

await page.evaluate(()=>localStorage.clear());
await page.reload();
await page.locator('#regionBtn').click();
await page.locator('#page0 .opt-card').nth(1).click();
await page.locator('[data-onboarding-source-code="youtube"]').click();
await page.locator('[data-action="submit-onboarding-source"]').click();
await page.waitForTimeout(450);
await page.locator('.phone').screenshot({
  path:path.join(process.env.TASK_PROGRESS_OUTPUT,'overseas-third-step.png')
});

await browser.close();
console.log(process.env.TASK_PROGRESS_OUTPUT);
'@ | node --input-type=module -
```

Expected:

```text
C:\Users\z3635\官网改动\.tmp\onboarding-third-step-progress
```

使用 `view_image` 分别检查：

- 国内进度条位于“选一款试试”上方，三段全亮，礼包浮层关闭后无内容遮挡。
- 海外进度条位于状态栏下方，三段全亮，轮播内容和底部按钮均完整。

- [ ] **Step 6: 提交实现**

```powershell
git add -- 'demos/新手引导完整链路demo.html'
git commit -m "feat(onboarding): show progress on beginner landing pages"
```

---

### Task 3: 最终回归与交付

**Files:**

- Test: `demos/新手引导完整链路demo.html`
- Test: `tools/verify-onboarding-source-integration-ui.mjs`

- [ ] **Step 1: 运行最终回归**

```powershell
node tools/verify-onboarding-source-integration-ui.mjs
node tools/verify-personalization-acquisition-wizard.mjs
git diff --check HEAD~2..HEAD
```

Expected:

```text
PASS onboardingSourceUi
PASS shell
PASS games
PASS sources
PASS state
PASS onboardingSource
PASS syntax
```

- [ ] **Step 2: 检查提交范围**

```powershell
git show --stat --oneline HEAD~1..HEAD
git show --stat --oneline HEAD~2..HEAD~1
```

Expected:

- 测试提交只修改 `tools/verify-onboarding-source-integration-ui.mjs`。
- 实现提交只修改 `demos/新手引导完整链路demo.html`。

- [ ] **Step 3: 交付本地结果**

交付内容：

- 本地 Demo：`demos/新手引导完整链路demo.html`
- 国内、海外视觉证据：`.tmp/onboarding-third-step-progress/`
- 两个提交 SHA。
- 真实交互、静态合同和语法校验结果。

本计划不推送远端；如需更新在线预览，取得用户发布授权后再基于最新远端 `master` 快进发布，禁止强推。

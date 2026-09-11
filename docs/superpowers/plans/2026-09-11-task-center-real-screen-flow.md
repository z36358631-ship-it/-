# Task Center Real-Screen Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 PRD 中的抽象流程卡片替换为由当前 Demo 实际状态截取的 7 张竖屏界面，以 4+3 两行布局合成一张流程图并更新固定 Git SHA 链接。

**Architecture:** 复用 `tools/verify-task-center-v2.mjs` 中的 Playwright 本地 Demo 会话，通过稳定选择器与 `window.demoApi` 进入每个业务状态，将 `data-demo-root` 截图 Buffer 作为 data URL 嵌入独立合成页。合成页只负责标题、步骤标签、两行网格和分支连线，实际手机界面像素不重绘。

**Tech Stack:** Node.js、`playwright-core`、HTML/CSS/SVG、PNG、Markdown、Git。

---

### Task 1: 为真实流程截图增加失败验收

**Files:**
- Modify: `tools/verify-task-center-v2.mjs`

- [ ] **Step 1: 在新流程生成器调用前声明七个状态契约**

```js
const expectedFlowSteps = [
  '01-task-center',
  '02-claim-success',
  '03-points-income',
  '04-redemption-store',
  '05-redeem-confirm',
  '06a-virtual-issued',
  '06b-physical-address'
];
```

- [ ] **Step 2: 对现有抽象 `createFlowImage(context)` 运行契约检查**

Run: `rg -n "expectedFlowSteps|02-claim-success|06a-virtual-issued|06b-physical-address" tools/verify-task-center-v2.mjs`

Expected: no matches before implementation, proving the seven real-state flow contract is not implemented yet.

- [ ] **Step 3: 保留现有 Demo 和 PRD 静态契约**

```js
assert(!/<script[^>]+src=/i.test(demo), 'C demo must not load external scripts');
assert(!/<img\b[^>]*\bsrc=/i.test(demo), 'C demo must not depend on image resources');
assert(!/https?:\/\//i.test(demo), 'C demo must be completely offline');
```

### Task 2: 截取 7 个 Demo 真实竖屏状态

**Files:**
- Modify: `tools/verify-task-center-v2.mjs`

- [ ] **Step 1: 增加返回 PNG Buffer 的步骤截图函数**

```js
async function captureFlowStep(page, id, title, assertState) {
  if (assertState) await assertState();
  const png = await page.locator('[data-demo-root]').screenshot({
    animations: 'disabled',
    type: 'png'
  });
  return { id, title, src: `data:image/png;base64,${png.toString('base64')}` };
}
```

- [ ] **Step 2: 截取 01–03 任务与入账状态**

```js
const flowSteps = [];
await page.evaluate(() => window.demoApi.reset());
flowSteps.push(await captureFlowStep(page, '01', '进入任务中心'));
await page.locator('[data-task-id="daily-sign"] [data-action="claim"]').click();
assert.equal((await page.evaluate(() => window.demoApi.getState())).points, 5002);
flowSteps.push(await captureFlowStep(page, '02', '完成并领取'));
await page.evaluate(() => window.demoApi.showView('points'));
assert((await page.locator('[data-view="points"]').innerText()).includes('+2'));
flowSteps.push(await captureFlowStep(page, '03', '盖世积分入账'));
```

- [ ] **Step 3: 截取 04–05 商城与确认状态**

```js
await page.evaluate(() => { window.demoApi.reset(); window.demoApi.showView('store'); });
flowSteps.push(await captureFlowStep(page, '04', '浏览兑换商城'));
await page.locator('[data-product-id="cloud-30"] [data-action="open-product"]').click();
await page.locator('[data-dialog="redeem"].is-open').waitFor();
flowSteps.push(await captureFlowStep(page, '05', '确认兑换'));
```

- [ ] **Step 4: 截取 06A 虚拟权益与 06B 实物履约状态**

```js
await page.locator('[data-action="confirm-redeem"]').click();
await page.evaluate(() => window.demoApi.showView('orders'));
assert((await page.locator('[data-view="orders"]').innerText()).includes('已发放'));
flowSteps.push(await captureFlowStep(page, '06A', '虚拟权益发放'));
await page.evaluate(() => { window.demoApi.reset(); window.demoApi.showView('store'); window.demoApi.openRedeem('x5-lite'); });
await page.locator('[data-action="confirm-redeem"]').click();
await page.locator('[data-dialog="address"].is-open').waitFor();
flowSteps.push(await captureFlowStep(page, '06B', '实物履约'));
```

- [ ] **Step 5: 断言截图数量与顺序**

```js
assert.deepEqual(flowSteps.map(({ id }) => id), ['01', '02', '03', '04', '05', '06A', '06B']);
```

### Task 3: 将真实界面合成为 4+3 单图流程

**Files:**
- Modify: `tools/verify-task-center-v2.mjs`
- Modify: `public/prd/task-center-v2/00-product-flow.png`
- Modify: `docs/evidence/task-center-v2/verification.json`

- [ ] **Step 1: 将 `createFlowImage` 改为接收 `flowSteps`**

```js
async function createFlowImage(context, flowSteps) {
  assert.equal(flowSteps.length, 7, 'Flow image requires seven real portrait screenshots');
  // Render the supplied screenshots; do not redraw app UI.
}
```

- [ ] **Step 2: 建立固定 4+3 网格**

```css
.flow-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 92px 64px; }
.step:nth-child(n + 5) { grid-row: 2; }
.step:nth-child(5) { grid-column: 1; }
.step:nth-child(6) { grid-column: 2; }
.step:nth-child(7) { grid-column: 3; }
.phone { width: 100%; aspect-ratio: 390 / 844; object-fit: contain; }
```

- [ ] **Step 3: 绘制换行与分支连线**

```html
<svg class="connectors" viewBox="0 0 2048 1900" aria-hidden="true">
  <path data-edge="04-05" d="M 1760 820 C 1990 900, 1990 1010, 290 1080" />
  <path data-edge="05-06A" d="M 420 1510 L 690 1510" />
  <path data-edge="05-06B" d="M 420 1510 C 560 1630, 950 1630, 1040 1510" />
</svg>
```

实际坐标以渲染后的卡片边界计算为准；连线只位于截图之间的留白区，并显示“按商品类型分流”。

- [ ] **Step 4: 记录新流程图尺寸与哈希**

```js
screenshots.push({
  path: 'public/prd/task-center-v2/00-product-flow.png',
  width: 2048,
  height: 1900,
  sha256: sha256(filePath)
});
```

- [ ] **Step 5: 生成并验证**

Run: `node tools/verify-task-center-v2.mjs`

Expected: `PASS: task center v2 static, interaction, flow and screenshot verification completed` and `00-product-flow.png` is larger than 10 KB.

### Task 4: 视觉检查与 PRD 固定链接更新

**Files:**
- Modify: `prd/【Prd】《盖世游戏》任务中心与兑换商城需求.md`

- [ ] **Step 1: 检查合成图像素和布局**

Run: `node -e "const fs=require('fs'); const b=fs.readFileSync('public/prd/task-center-v2/00-product-flow.png'); if(b.length<10000) process.exit(1); console.log(b.length)"`

Expected: prints a byte length greater than 10000; visual inspection shows four screens on row one and three on row two.

- [ ] **Step 2: 提交生成器、新 PNG 和验证证据**

Run: `git add tools/verify-task-center-v2.mjs public/prd/task-center-v2/00-product-flow.png docs/evidence/task-center-v2/verification.json docs/superpowers/specs/2026-09-11-task-center-real-screen-flow-design.md docs/superpowers/plans/2026-09-11-task-center-real-screen-flow.md && git commit -m "docs: replace task center flow with real screens"`

Expected: creates a commit containing the exact PNG later referenced by the PRD.

- [ ] **Step 3: 使用图片提交的 40 位 SHA 替换 PRD 流程图链接**

```md
![产品流程](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@<IMAGE_COMMIT_SHA>/public/prd/task-center-v2/00-product-flow.png)
```

`<IMAGE_COMMIT_SHA>` 必须由上一步的 `git rev-parse HEAD` 返回值原样写入，不得使用分支名、短 SHA 或相对路径。

- [ ] **Step 4: 提交 PRD 链接**

Run: `git add "prd/【Prd】《盖世游戏》任务中心与兑换商城需求.md" && git commit -m "docs: pin real-screen task flow image"`

Expected: PRD references the immutable commit that already contains the new image.

- [ ] **Step 5: 运行最终检查**

Run: `node tools/verify-task-center-v2.mjs`

Expected: PASS.

Run: `git diff --check`

Expected: no output.

Run: `rg -n "00-product-flow\.png" "prd/【Prd】《盖世游戏》任务中心与兑换商城需求.md"`

Expected: exactly one URL containing a 40-character hexadecimal commit SHA.

### Task 5: 推送并验证公网图片

**Files:**
- No file changes expected.

- [ ] **Step 1: 确认待推送范围**

Run: `git status --short`

Expected: only the pre-existing untracked `.tmp/` and workflow lock may remain; neither is staged.

- [ ] **Step 2: 推送当前分支**

Run: `git push origin HEAD`

Expected: origin advances to the PRD-link commit.

- [ ] **Step 3: 验证固定图片 URL**

Run: `curl.exe -L -I "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@<IMAGE_COMMIT_SHA>/public/prd/task-center-v2/00-product-flow.png"`

Expected: HTTP 200 and `content-type: image/png`.

## Self-Review

- Spec coverage: 真实 Demo 截图、竖屏、每行 4 步、4+3 布局、虚拟/实物分支、固定 Git SHA 与公网图片验证均有明确任务。
- Placeholder scan: 文档中的 `<IMAGE_COMMIT_SHA>` 是由真实提交值替换的操作说明，不是将要保留在 PRD 的占位符；实施人必须使用 `git rev-parse HEAD` 输出。
- Type consistency: `flowSteps` 始终使用 `id/title/src`，顺序始终为 `01/02/03/04/05/06A/06B`，截图视口与 Demo 容器均为 390:844。

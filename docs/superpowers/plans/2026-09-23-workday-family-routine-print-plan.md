# Workday Family Routine A4 Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生成一张可直接打印的 `3508 × 2480 px` A4 横向工作日家庭作息表 PNG，并保留可修改的 HTML 源文件和自动校验脚本。

**Architecture:** 使用单文件 HTML 承载最终排版，页面固定为 A4 横向 300 DPI 等效像素。Node.js + Playwright 加载本地 HTML，检查关键文案和元素边界后截取 `.sheet`，再读取 PNG IHDR 校验像素尺寸。

**Tech Stack:** HTML/CSS、Node.js、Playwright Core、Chromium、PNG IHDR 校验

---

## 文件结构

- `output/family-routine/workday-family-routine-a4.html`：最终可编辑的 A4 页面源文件。
- `output/family-routine/workday-family-routine-a4.png`：供用户打印的最终图片。
- `tools/render-workday-family-routine.mjs`：渲染、尺寸检查、关键文案检查和溢出检查。

### Task 1: 创建 A4 横向页面

**Files:**
- Create: `output/family-routine/workday-family-routine-a4.html`

- [x] **Step 1: 创建固定尺寸页面骨架**

使用以下页面约束，确保截图和打印比例一致：

```css
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; width: 3508px; height: 2480px; }
.sheet {
  width: 3508px;
  height: 2480px;
  padding: 88px 96px;
  overflow: hidden;
  background: #fff;
  font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
}
```

- [x] **Step 2: 实现共同早晨**

页面必须按以下顺序展示，且 `08:10` 为最终出门时间：

```html
<div class="morning-item"><time>07:25</time><span>温和叫醒</span></div>
<div class="morning-item"><time>07:30–07:45</time><span>如厕、洗脸、穿衣</span></div>
<div class="morning-item"><time>07:45–08:00</time><span>早餐</span></div>
<div class="morning-item"><time>08:00–08:05</time><span>刷牙、梳头、检查书包</span></div>
<div class="morning-item"><time>08:05–08:10</time><span>穿鞋、出门</span></div>
```

- [x] **Step 3: 实现两条晚间主流程**

左侧标题必须为 `普通日 · 周二 / 周三 / 周五`，展示普通日晚间完整时间轴；右侧标题必须为 `课外班日 · 周一 / 周四`，顶部用两个轻量差异块展示周一写字课和周四画画课，其下只展示一次共同流程。

```html
<section class="plan normal-plan">
  <h2>普通日 · 周二 / 周三 / 周五</h2>
  <!-- 19:00接回至21:15熄灯 -->
</section>
<section class="plan class-plan">
  <h2>课外班日 · 周一 / 周四</h2>
  <div class="course-differences">
    <div>周一 · 写字课｜19:30–20:30</div>
    <div>周四 · 画画课｜19:00–20:30</div>
  </div>
  <!-- 返程至21:25–21:30熄灯 -->
</section>
```

- [x] **Step 4: 实现底部辅助区**

底部依次展示统一话术、共同底线和两周10个勾选格。所有接送与陪同文案必须使用“爸爸或妈妈”。

- [x] **Step 5: 在浏览器打开源文件检查排版**

Run:

```powershell
Start-Process "output/family-routine/workday-family-routine-a4.html"
```

Expected: 页面为横向单页；两条主流程和底部辅助区完整显示，无大面积空白。

### Task 2: 创建渲染与自动校验脚本

**Files:**
- Create: `tools/render-workday-family-routine.mjs`
- Create: `output/family-routine/workday-family-routine-a4.png`

- [x] **Step 1: 写入关键文案与边界检查**

脚本加载本地 HTML 后检查：

```js
const requiredText = [
  '07:25',
  '08:10',
  '普通日 · 周二 / 周三 / 周五',
  '课外班日 · 周一 / 周四',
  '爸爸或妈妈',
  '21:15 熄灯',
  '21:25–21:30 熄灯'
];

for (const text of requiredText) {
  if (!(await page.locator('body').innerText()).includes(text)) {
    throw new Error(`Missing required text: ${text}`);
  }
}

const overflow = await page.locator('.sheet').evaluate((sheet) => ({
  width: sheet.scrollWidth - sheet.clientWidth,
  height: sheet.scrollHeight - sheet.clientHeight
}));
if (overflow.width > 0 || overflow.height > 0) {
  throw new Error(`Sheet overflow: ${JSON.stringify(overflow)}`);
}
```

- [x] **Step 2: 截取固定像素图片**

```js
await page.locator('.sheet').screenshot({
  path: outputPath,
  animations: 'disabled'
});
```

- [x] **Step 3: 校验 PNG IHDR 尺寸**

```js
const png = readFileSync(outputPath);
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
if (width !== 3508 || height !== 2480) {
  throw new Error(`Unexpected PNG size: ${width}x${height}`);
}
```

- [x] **Step 4: 运行渲染脚本**

Run:

```powershell
node tools/render-workday-family-routine.mjs
```

Expected:

```text
PASS workday-family-routine-a4.png 3508x2480
```

### Task 3: 视觉验收与交付

**Files:**
- Verify: `output/family-routine/workday-family-routine-a4.png`

- [x] **Step 1: 检查最终图片**

使用图片查看工具检查以下项目：

```text
1. 标题、共同早晨、两条晚间主流程和底部辅助区均完整。
2. 07:25叫醒、08:10出门清晰可见。
3. 周二/三/五只出现一套普通日流程。
4. 周一/四只显示课程差异，共同流程不重复。
5. 无文字重叠、裁切、大面积空白或过小字号。
```

- [x] **Step 2: 提交实现文件**

```powershell
git add -- `
  output/family-routine/workday-family-routine-a4.html `
  output/family-routine/workday-family-routine-a4.png `
  tools/render-workday-family-routine.mjs
git commit -m "feat: add printable family routine chart"
```

- [x] **Step 3: 向用户提供图片链接**

最终回复使用绝对路径嵌入图片，并同时提供本地文件链接，方便打开和打印。

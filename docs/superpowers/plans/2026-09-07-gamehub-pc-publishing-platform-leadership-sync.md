# GameHub PC Publishing Platform Leadership Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build six readable 1920×1080 PNG pages that explain the full GameHub PC publishing-platform shape to company leadership using current Demo screenshots and explicit delivery-status labels.

**Architecture:** Keep source-page capture, slide content, slide rendering, PNG optimization, and verification separate. A structured JSON file is the single content source; Playwright captures current local Demo pages and exports each HTML slide; Pillow performs lossless PNG optimization for Feishu compatibility.

**Tech Stack:** HTML5, CSS, Node.js 22, `playwright-core`, Python 3, Pillow, `node:test`.

---

## File map

| Path | Responsibility |
|---|---|
| `prd/发行平台专项/领导同步/deck-data.json` | Titles, conclusions, stages, status labels, screenshot IDs and captions |
| `prd/发行平台专项/领导同步/capture-demo-pages.mjs` | Capture current Demo states at 1600×900 |
| `prd/发行平台专项/领导同步/build-leadership-sync.mjs` | Render the structured data into six slide sections |
| `prd/发行平台专项/领导同步/leadership-sync.css` | 1920×1080 layout, typography, status and screenshot-card styles |
| `prd/发行平台专项/领导同步/leadership-sync.html` | Generated local preview containing six slides |
| `prd/发行平台专项/领导同步/export-slides.mjs` | Export each `.leadership-slide` to a PNG |
| `prd/发行平台专项/领导同步/optimize-pngs.py` | Losslessly optimize PNG output and report size |
| `prd/发行平台专项/领导同步/assets/screens/*.png` | Current Demo evidence screenshots |
| `prd/发行平台专项/领导同步/output/*.png` | Six final leadership-sync images |
| `tests/developer-backend/leadership-sync.test.mjs` | Content, route, render, dimensions, size and forbidden-copy checks |

Do not modify the existing Demo or PRD files while producing this material. If a source page is unsuitable, replace the screenshot choice instead of changing product behavior.

### Task 1: Create the content contract and a failing structural test

**Files:**
- Create: `prd/发行平台专项/领导同步/deck-data.json`
- Create: `tests/developer-backend/leadership-sync.test.mjs`

- [ ] **Step 1: Write the six-slide content contract**

Create `deck-data.json` with this top-level shape and exact slide IDs:

```json
{
  "version": "2026-09-07",
  "canvas": { "width": 1920, "height": 1080 },
  "statusLegend": [
    { "id": "ready", "label": "已有 PRD＋Demo" },
    { "id": "prototype", "label": "已有 Demo，待 PRD" },
    { "id": "dependency", "label": "依赖专项／外部确认" },
    { "id": "later", "label": "后续能力" }
  ],
  "slides": [
    { "id": "01-product-landscape", "title": "盖世游戏 PC 发行平台", "subtitle": "从厂商入驻到游戏经营的一体化平台" },
    { "id": "02-onboarding-and-game", "title": "厂商准入与游戏建档" },
    { "id": "03-integration-test-release", "title": "开发接入、测试与发布" },
    { "id": "04-commerce-and-operation", "title": "商品交易与发行经营" },
    { "id": "05-operations-and-scope", "title": "平台运营与交付边界" },
    { "id": "06-enterprise-certification", "title": "企业认证详细流程" }
  ]
}
```

Fill each slide with the approved conclusion, cards, lifecycle stages, status and screenshot IDs from the design spec. Use `dev@xiaoji.com` only where the certification exception path needs contact information.

- [ ] **Step 2: Write the failing contract test**

The test must load the JSON and assert six unique slide IDs, four exact status labels, no placeholder language, and no message-center or work-order screenshots:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workDir = path.join(root, 'prd', '发行平台专项', '领导同步');
const dataFile = path.join(workDir, 'deck-data.json');

test('领导同步材料内容契约完整', () => {
  const deck = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.deepEqual(deck.canvas, { width: 1920, height: 1080 });
  assert.equal(deck.slides.length, 6);
  assert.equal(new Set(deck.slides.map(item => item.id)).size, 6);
  assert.deepEqual(deck.statusLegend.map(item => item.label), [
    '已有 PRD＋Demo', '已有 Demo，待 PRD', '依赖专项／外部确认', '后续能力'
  ]);
  const content = JSON.stringify(deck);
  for (const forbidden of ['TBD', 'TODO', 'APK 加固', '工单系统', '完整功能已交付']) {
    assert.equal(content.includes(forbidden), false, `不得出现：${forbidden}`);
  }
});
```

- [ ] **Step 3: Run the test and confirm the render assertions still fail**

Run:

```powershell
node --test tests/developer-backend/leadership-sync.test.mjs
```

Expected: the content-contract test passes; later HTML/PNG tests fail because render files do not exist.

- [ ] **Step 4: Commit the content contract only**

```powershell
git add -- 'prd/发行平台专项/领导同步/deck-data.json' 'tests/developer-backend/leadership-sync.test.mjs'
git commit -m "test: define leadership sync deck contract"
```

### Task 2: Capture current Demo evidence

**Files:**
- Create: `prd/发行平台专项/领导同步/capture-demo-pages.mjs`
- Create: `prd/发行平台专项/领导同步/assets/screens/*.png`

- [ ] **Step 1: Implement a deterministic capture helper**

Use the existing Chrome/Edge discovery pattern and disable animation/networking:

```js
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = process.cwd();
const demoDir = path.join(root, 'demos', '开发者后台一期');
const outputDir = path.join(root, 'prd', '发行平台专项', '领导同步', 'assets', 'screens');
const browserPath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find(file => file && fs.existsSync(file));
if (!browserPath) throw new Error('未找到 Chrome 或 Edge');
fs.mkdirSync(outputDir, { recursive: true });

const demoUrl = (file, hash) => {
  const url = pathToFileURL(path.join(demoDir, file));
  url.hash = hash;
  return url.href;
};
```

For every case, create a fresh context at `1600×900`, clear local storage where needed, wait for the page heading or stable root, inject `*{animation:none!important;transition:none!important}`, and reject page errors, console errors or remote requests.

- [ ] **Step 2: Capture the approved developer evidence states**

Capture these IDs and states:

```js
const developerCases = [
  ['developer-home', '01-开发者平台与资料demo.html', '/P01-01'],
  ['enterprise-pending', '01-开发者平台与资料demo.html', '/P01-03?preview=pending'],
  ['game-management', '06-游戏创建与发行资料demo.html', '/P06-01'],
  ['create-game', '06-游戏创建与发行资料demo.html', '/P06-02'],
  ['store-profile', '06-游戏创建与发行资料demo.html', '/P06-04'],
  ['release-scope', '06-游戏创建与发行资料demo.html', '/P06-06'],
  ['appid-environment', '07-开发接入与资源中心demo.html', '/P07-02'],
  ['test-accounts', '07-开发接入与资源中心demo.html', '/P07-03'],
  ['build-upload', '03-包体测试与发布demo.html', '/P03-03'],
  ['release-rollback', '03-包体测试与发布demo.html', '/P03-12'],
  ['cdkey-overview', '02-CDKEY商品与供给demo.html', '/P02-01'],
  ['key-channel-api', '02-CDKEY商品与供给demo.html', '/P02-05'],
  ['operation-dashboard', '04-精准投放与数据demo.html', '/P04-01'],
  ['settlement-dashboard', '04-精准投放与数据demo.html', '/P04-02']
];
```

When a route opens the correct shell but not the required subview, use the visible tab/button used by the current Demo; do not query hidden review controls.

- [ ] **Step 3: Capture the approved operations evidence states**

```js
const operationsCases = [
  ['enterprise-review', '01-开发者平台与资料demo.html', '/P01-08'],
  ['game-review-detail', '06-游戏创建与发行资料demo.html', '/P06-09'],
  ['version-review', '03-包体测试与发布demo.html', '/P03-09'],
  ['key-reconciliation', '02-CDKEY商品与供给demo.html', '/P02-06']
];
```

For `enterprise-pending`, click the `厂商设置` tab after navigation. Capture only after the application status bar becomes visible.

- [ ] **Step 4: Capture the six enterprise-certification appendix states**

Reuse `developer-home`, then capture:

1. Login dialog after clicking `登录`.
2. Entry choice after completing the demo login.
3. Certification introduction after clicking `申请认证`.
4. Certification form after clicking `开始填写资料`.
5. Submitted state from `/P01-03?preview=pending`, with `厂商设置` selected.

Name them `cert-login.png`, `cert-entry.png`, `cert-intro.png`, `cert-form.png`, and `cert-pending.png`.

- [ ] **Step 5: Run the capture script and verify evidence count**

Run:

```powershell
node 'prd/发行平台专项/领导同步/capture-demo-pages.mjs'
```

Expected: `23 screenshots captured; 0 page errors; 0 console errors; 0 remote requests`.

- [ ] **Step 6: Commit capture source and evidence**

```powershell
git add -- 'prd/发行平台专项/领导同步/capture-demo-pages.mjs' 'prd/发行平台专项/领导同步/assets/screens'
git commit -m "docs: capture leadership sync demo evidence"
```

### Task 3: Build the six-slide HTML preview

**Files:**
- Create: `prd/发行平台专项/领导同步/build-leadership-sync.mjs`
- Create: `prd/发行平台专项/领导同步/leadership-sync.css`
- Create: `prd/发行平台专项/领导同步/leadership-sync.html`

- [ ] **Step 1: Add fixed visual tokens and slide geometry**

Use these exact base tokens and keep each slide self-contained:

```css
:root {
  --ink:#102a43;
  --muted:#62748a;
  --line:#d9e3ee;
  --paper:#f4f8fc;
  --card:#ffffff;
  --cyan:#19a7b8;
  --blue:#2b6cb0;
  --ready:#16856b;
  --prototype:#2772c8;
  --dependency:#b26a00;
  --later:#77869a;
}
*{box-sizing:border-box}
html,body{margin:0;background:#dfe8f2;font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif;color:var(--ink)}
.leadership-slide{position:relative;width:1920px;height:1080px;overflow:hidden;background:linear-gradient(135deg,#f8fbfe 0%,#eef5fb 100%);padding:54px 60px 48px}
.slide-title{font-size:42px;line-height:1.2;margin:0;font-weight:800}
.slide-conclusion{font-size:22px;line-height:1.55;color:var(--muted);margin:12px 0 26px}
.screen-title{font-size:24px;line-height:1.3;font-weight:750}
.screen-frame{overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--card);box-shadow:0 12px 34px rgba(30,64,95,.12)}
.screen-frame img{display:block;width:100%;height:100%;object-fit:cover;object-position:top left}
```

Body copy must be at least 18px. Use two-by-two evidence grids for slides 2–5. Slide 1 uses the three-end relationship plus lifecycle, and slide 6 uses a three-by-two flow grid matching the approved reference.

- [ ] **Step 2: Implement the HTML builder**

Read `deck-data.json`, escape all text, and render one section per slide:

```js
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[char]));

const renderScreen = item => `
  <article class="screen-card">
    <header><span>${escapeHtml(item.number)}</span><h3>${escapeHtml(item.title)}</h3></header>
    <div class="screen-frame"><img src="assets/screens/${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}"></div>
    <p>${escapeHtml(item.caption)}</p>
  </article>`;

const renderSlide = slide => `<section class="leadership-slide" id="${escapeHtml(slide.id)}" data-slide-id="${escapeHtml(slide.id)}">...</section>`;
```

The builder writes a complete UTF-8 HTML document with a relative stylesheet and no remote font, image, script or iframe.

- [ ] **Step 3: Encode the five core page layouts**

- Slide 1: three role cards, ten-stage value flow, support layer and status legend; one developer-home visual anchor only.
- Slide 2: developer home/login, enterprise state, game creation and store/release evidence.
- Slide 3: APPID/environment, test accounts, Build upload, release/rollback.
- Slide 4: double-Key supply, channel API, business dashboard, settlement dashboard.
- Slide 5: enterprise review, game review, version review, Key reconciliation plus the four delivery-state groups.

Each core slide has one conclusion and no more than four evidence frames.

- [ ] **Step 4: Encode the certification appendix**

Render the six approved states in this exact order:

```text
开发者首页 → 登录／自动注册 → 选择企业认证
认证介绍 → 填写资料 → 提交后审核中
```

Use short arrow labels only: `点击登录`、`登录成功`、`申请企业认证`、`开始填写`、`提交审核`.

- [ ] **Step 5: Build and inspect the static file**

Run:

```powershell
node 'prd/发行平台专项/领导同步/build-leadership-sync.mjs'
```

Expected: `Built 6 leadership slides.` and a parseable `leadership-sync.html` containing six `.leadership-slide` sections.

- [ ] **Step 6: Commit the HTML source**

```powershell
git add -- 'prd/发行平台专项/领导同步/build-leadership-sync.mjs' 'prd/发行平台专项/领导同步/leadership-sync.css' 'prd/发行平台专项/领导同步/leadership-sync.html'
git commit -m "docs: build leadership sync slide preview"
```

### Task 4: Export and optimize the final PNG pages

**Files:**
- Create: `prd/发行平台专项/领导同步/export-slides.mjs`
- Create: `prd/发行平台专项/领导同步/optimize-pngs.py`
- Create: `prd/发行平台专项/领导同步/output/*.png`

- [ ] **Step 1: Implement exact-size Playwright export**

Open the local HTML at a `1920×1080` viewport and capture each section by ID:

```js
const slides = await page.locator('.leadership-slide').all();
for (const slide of slides) {
  const id = await slide.getAttribute('data-slide-id');
  const box = await slide.boundingBox();
  if (!box || Math.round(box.width) !== 1920 || Math.round(box.height) !== 1080) {
    throw new Error(`${id}: slide size is not 1920×1080`);
  }
  await slide.screenshot({ path: path.join(outputDir, `${id}.png`), animations:'disabled' });
}
```

Reject missing images, console errors, page errors and remote requests before export.

- [ ] **Step 2: Implement lossless PNG optimization**

Use Pillow without resizing or palette reduction:

```python
from pathlib import Path
from PIL import Image

output_dir = Path(__file__).resolve().parent / "output"
for file in sorted(output_dir.glob("*.png")):
    with Image.open(file) as image:
        if image.size != (1920, 1080):
            raise SystemExit(f"{file.name}: expected 1920x1080, got {image.size}")
        image.save(file, format="PNG", optimize=True, compress_level=9)
    print(f"{file.name}\t{file.stat().st_size}")
```

- [ ] **Step 3: Export and optimize all six pages**

Run:

```powershell
node 'prd/发行平台专项/领导同步/export-slides.mjs'
& 'C:\Users\z3635\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'prd/发行平台专项/领导同步/optimize-pngs.py'
```

Expected: six PNG files, each exactly `1920×1080`, each below `5 MB`.

- [ ] **Step 4: Commit export source and final PNG files**

```powershell
git add -- 'prd/发行平台专项/领导同步/export-slides.mjs' 'prd/发行平台专项/领导同步/optimize-pngs.py' 'prd/发行平台专项/领导同步/output'
git commit -m "docs: export leadership sync image set"
```

### Task 5: Complete automated and visual verification

**Files:**
- Modify: `tests/developer-backend/leadership-sync.test.mjs`
- Create: `prd/发行平台专项/领导同步/README.md`

- [ ] **Step 1: Add HTML content and asset assertions**

Assert all screenshot paths resolve, the HTML has six slides, every core slide has at most four `.screen-card` nodes, and the appendix has exactly six.

```js
test('HTML 与截图映射完整', () => {
  const html = fs.readFileSync(path.join(workDir, 'leadership-sync.html'), 'utf8');
  assert.equal((html.match(/class="leadership-slide"/g) || []).length, 6);
  for (const image of [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(match => match[1])) {
    assert.ok(fs.existsSync(path.join(workDir, image)), `缺少截图：${image}`);
  }
});
```

- [ ] **Step 2: Add PNG dimension and size assertions**

Parse bytes 16–23 from the PNG IHDR chunk:

```js
const pngSize = file => {
  const bytes = fs.readFileSync(file);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

test('六张 PNG 适合飞书查看', () => {
  const files = fs.readdirSync(path.join(workDir, 'output')).filter(name => name.endsWith('.png'));
  assert.equal(files.length, 6);
  for (const name of files) {
    const file = path.join(workDir, 'output', name);
    assert.deepEqual(pngSize(file), { width: 1920, height: 1080 });
    assert.ok(fs.statSync(file).size < 5 * 1024 * 1024, `${name} 超过 5 MB`);
  }
});
```

- [ ] **Step 3: Run all deterministic checks**

Run:

```powershell
node --test tests/developer-backend/leadership-sync.test.mjs
git diff --check -- 'prd/发行平台专项/领导同步' 'tests/developer-backend/leadership-sync.test.mjs'
```

Expected: all tests pass and `git diff --check` prints no errors.

- [ ] **Step 4: Review all six images at original size**

For each PNG, verify:

- title and conclusion are readable without zoom;
- no clipping, overlap or stretched screenshots;
- each screenshot supports the page conclusion;
- all product status labels are visible and consistent;
- no message center, work order, APK hardening or unresolved contract page appears;
- operations UI is Chinese;
- Page 1 clearly shows developer → platform → player value flow and dependencies.

If any item fails, fix `deck-data.json` or `leadership-sync.css`, rebuild, re-export, optimize and re-run the test.

- [ ] **Step 5: Add usage notes**

Create `README.md` with the local preview path, six output filenames, build commands, status-label meanings, source Demo versions and the statement: `本材料展示目标产品形态与当前 Demo 证据，不代表全部能力已上线。`

- [ ] **Step 6: Commit verification and usage notes**

```powershell
git add -- 'tests/developer-backend/leadership-sync.test.mjs' 'prd/发行平台专项/领导同步/README.md' 'prd/发行平台专项/领导同步/leadership-sync.html' 'prd/发行平台专项/领导同步/output'
git commit -m "test: verify leadership sync image delivery"
```

### Task 6: Prepare the local handoff

**Files:**
- Verify only: `prd/发行平台专项/领导同步/**`

- [ ] **Step 1: Confirm no unrelated files are staged**

```powershell
git diff --cached --name-only
git status --short -- 'prd/发行平台专项/领导同步' 'tests/developer-backend/leadership-sync.test.mjs'
```

Expected: only leadership-sync source, tests and outputs appear.

- [ ] **Step 2: Open the HTML preview and first PNG in Codex**

Open:

```text
prd/发行平台专项/领导同步/leadership-sync.html
prd/发行平台专项/领导同步/output/01-product-landscape.png
```

- [ ] **Step 3: Report actual delivery state**

Report source files, test result, visual-review result and local commit IDs separately. State that Git push, public preview, PRD update and external Feishu upload were not performed unless the user separately authorizes them.

---

## Self-review result

- Spec coverage: all five core pages, the enterprise-certification appendix, status labels, actual Demo evidence, output size and Feishu compatibility have implementation tasks.
- Scope: no Demo behavior, PRD content, public hosting or remote repository is changed.
- Ambiguity removed: the deck is six PNG files, not one oversized flow image; “已有 PRD＋Demo” never means “已上线”.
- Forbidden content: message center, work order, APK hardening, unresolved contract pages and fixed software-copyright requirements are excluded from screenshots.

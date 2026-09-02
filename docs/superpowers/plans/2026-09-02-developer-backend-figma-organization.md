# 开发者后台一期 Figma 文件组织重整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变 37 个开发者后台一期页面业务内容的前提下，将 Figma 重整为人工稿式的业务域 Page、中文标题条和横向任务流结构。

**Architecture:** `frame-map.json` 继续是 37 个业务 Frame 的唯一契约；新增 `figma-page-map.json` 仅描述 Figma 文件导航。源生成器从两份映射文件生成 00 索引、01—04 业务 Page 与组件母版的可编辑 SVG，随后将它们导入已有 Figma 文件；旧根 Frame 只迁移到历史 Page，不执行删除。

**Tech Stack:** Node.js ESM、Playwright/Chromium、结构化 SVG、Figma 桌面/网页编辑器、Node Test、Python SVG 校验器。

---

## 文件边界

| 文件 | 责任 |
|---|---|
| `Figma/开发者后台一期/frame-map.json` | 37 个 Frame 的 ID、模块、角色、路由、标题和 `1440 × 900` 尺寸；本次不改变业务 Frame。 |
| `Figma/开发者后台一期/figma-page-map.json` | 新增：Figma Page 名称、类型、显示顺序、来源和业务模块归属。 |
| `Figma/开发者后台一期/build-figma-source.mjs` | 生成按 Figma Page 导入的可编辑 SVG 和更新后的源清单。 |
| `Figma/开发者后台一期/source/figma-pages/` | 新增：00、01、02、03、04、组件母版六份导入源。 |
| `Figma/开发者后台一期/source/source-manifest.json` | 记录六份导入源、37 页契约和历史根稿来源。 |
| `tests/developer-backend/figma-organization.test.mjs` | 新增：锁定文件导航、标题条、横向顺序、37 页不变契约。 |
| `Figma/开发者后台一期/figma-delivery.md` | 更新最终 Page 目录、Frame 定位、历史处理和验收结果。 |
| `Figma/开发者后台一期/evidence/` | 更新 Figma 画布、业务页、可编辑图层截图和哈希清单。 |
| `prd/workflow-state/LOCAL-20260901-developer-backend-prd.md` | 记录本次 Figma 文件组织交付与新的验收事实。 |

### Task 1: 先写 Figma Page 组织契约测试

**Files:**

- Create: `tests/developer-backend/figma-organization.test.mjs`
- Create: `Figma/开发者后台一期/figma-page-map.json`
- Test: `tests/developer-backend/figma-organization.test.mjs`

- [ ] **Step 1: 写失败测试，锁定 Page 导航与不变业务 Frame。**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const pageMapPath = 'Figma/开发者后台一期/figma-page-map.json';
const sourceDir = path.join(root, 'Figma/开发者后台一期/source');

test('Figma 按已确认的 6 个正式 Page 组织，37 个业务 Frame 仍完整', () => {
  const pageMap = readJson(pageMapPath);
  const frameMap = readJson('Figma/开发者后台一期/frame-map.json');
  assert.deepEqual(pageMap.pages.map(page => page.name), [
    '00 全局流程索引', '01 开发者平台与资料', '02 CDKEY 商品与供给',
    '03 包体测试与发布', '04 精准投放与数据', '组件母版',
  ]);
  assert.equal(frameMap.totals.businessFrames, 37);
  assert.deepEqual(frameMap.totals.byModule, { '01': 9, '02': 6, '03': 13, '04': 9 });
  assert.equal(pageMap.history.name, '废弃／历史');
  assert.equal(pageMap.history.deleteLegacyRoot, false);
});

test('生成源具有中文标题条、业务页横向排列和逐页可编辑 ID', () => {
  execFileSync(process.execPath, ['Figma/开发者后台一期/build-figma-source.mjs'], { stdio: 'pipe' });
  const manifest = readJson('Figma/开发者后台一期/source/source-manifest.json');
  assert.equal(manifest.frameCount, 37);
  assert.deepEqual(manifest.figmaPages.map(page => page.name), [
    '00 全局流程索引', '01 开发者平台与资料', '02 CDKEY 商品与供给',
    '03 包体测试与发布', '04 精准投放与数据', '组件母版',
  ]);
  for (const page of manifest.figmaPages) {
    const svg = fs.readFileSync(path.join(sourceDir, page.svg), 'utf8');
    assert.match(svg, /fill="#2FD7EF"/);
    assert.match(svg, new RegExp(page.name));
    for (const frameId of page.frameIds) assert.match(svg, new RegExp(`id="${frameId}"`));
  }
  const releaseSvg = fs.readFileSync(path.join(sourceDir, 'figma-pages/03-包体测试与发布.svg'), 'utf8');
  assert.ok(releaseSvg.indexOf('id="P03-01"') < releaseSvg.indexOf('id="P03-13"'));
});
```

- [ ] **Step 2: 运行测试，确认它因为新增映射不存在而失败。**

Run: `node --test tests/developer-backend/figma-organization.test.mjs`

Expected: FAIL，错误为 `ENOENT` 且路径包含 `figma-page-map.json`。

- [ ] **Step 3: 提交失败测试。**

```powershell
git add tests/developer-backend/figma-organization.test.mjs
git commit -m "test: define figma page organization contract"
```

### Task 2: 生成六份可导入的 Figma Page 源

**Files:**

- Create: `Figma/开发者后台一期/figma-page-map.json`
- Modify: `Figma/开发者后台一期/build-figma-source.mjs`
- Modify: `Figma/开发者后台一期/source/source-manifest.json`
- Create: `Figma/开发者后台一期/source/figma-pages/00-全局流程索引.svg`
- Create: `Figma/开发者后台一期/source/figma-pages/01-开发者平台与资料.svg`
- Create: `Figma/开发者后台一期/source/figma-pages/02-CDKEY 商品与供给.svg`
- Create: `Figma/开发者后台一期/source/figma-pages/03-包体测试与发布.svg`
- Create: `Figma/开发者后台一期/source/figma-pages/04-精准投放与数据.svg`
- Create: `Figma/开发者后台一期/source/figma-pages/组件母版.svg`
- Test: `tests/developer-backend/figma-organization.test.mjs`

- [ ] **Step 1: 写入唯一的 Page 导航配置。**

```json
{
  "schemaVersion": 1,
  "pages": [
    {"id":"00","name":"00 全局流程索引","kind":"index","frameIds":[],"source":"figma-pages/00-全局流程索引.svg"},
    {"id":"01","name":"01 开发者平台与资料","kind":"business","moduleId":"01","source":"figma-pages/01-开发者平台与资料.svg"},
    {"id":"02","name":"02 CDKEY 商品与供给","kind":"business","moduleId":"02","source":"figma-pages/02-CDKEY 商品与供给.svg"},
    {"id":"03","name":"03 包体测试与发布","kind":"business","moduleId":"03","source":"figma-pages/03-包体测试与发布.svg"},
    {"id":"04","name":"04 精准投放与数据","kind":"business","moduleId":"04","source":"figma-pages/04-精准投放与数据.svg"},
    {"id":"components","name":"组件母版","kind":"components","frameIds":[],"source":"figma-pages/组件母版.svg"}
  ],
  "history": {"name":"废弃／历史","legacyRoot":"gamehub-developer-backend-phase1","deleteLegacyRoot":false}
}
```

- [ ] **Step 2: 让生成器读取 `figma-page-map.json`，并以单列横向布局输出业务 Page。**

在 `build-figma-source.mjs` 中读取 `figmaPageMap`；以如下函数替换业务 Page 的三列 `sectionLayout` 计算。`titleBar()` 只放在 Figma 导入源上，业务 Frame 保持原始尺寸与 DOM 抽取结果。

```js
function horizontalPageLayout(frames) {
  const gapX = 160;
  const left = 120;
  const top = 260;
  return {
    width: left * 2 + frames.length * viewport.width + Math.max(0, frames.length - 1) * gapX,
    height: top + viewport.height + 120,
    left, top, gapX,
  };
}

function titleBar(name, frameCount, width) {
  return `<g id="page-title-${safeId(name)}"><rect x="80" y="80" width="${width - 160}" height="96" rx="16" fill="#2FD7EF"/><text x="120" y="140" font-family="Microsoft YaHei, Arial, sans-serif" font-size="32" font-weight="800" fill="#101828">${escapeXml(name)}</text><text x="${width - 290}" y="140" font-family="Microsoft YaHei, Arial, sans-serif" font-size="20" font-weight="600" fill="#0B6271">${frameCount} 个业务页</text></g>`;
}
```

每个业务 Frame 使用 `x = layout.left + index * (viewport.width + layout.gapX)`、`y = layout.top`，并保留 `<g id="Pxx-xx" data-frame-id="Pxx-xx">`。索引 Page 输出四段只读流程说明和 37 个编号；组件 Page 复用原有 `designSystemSection()` 但将可见英文组件标题替换为中文组件名。

- [ ] **Step 3: 扩展源清单，写入正式 Page 与历史根稿定位。**

```js
const manifest = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  frameCount: routes.length,
  frameSize: viewport,
  figmaPages: figmaPageMap.pages.map(page => ({
    id: page.id,
    name: page.name,
    kind: page.kind,
    frameIds: page.kind === 'business'
      ? frameMap.sections.find(section => section.moduleId === page.moduleId).frames.map(frame => frame.id)
      : [],
    svg: page.source,
  })),
  history: figmaPageMap.history,
  pages: routes.map(route => ({ id: route.id, title: route.title, role: route.role, templateId: route.templateId, svg: `pages/${route.id}.svg` })),
};
```

- [ ] **Step 4: 运行新契约测试，确认通过。**

Run: `node --test tests/developer-backend/figma-organization.test.mjs`

Expected: PASS，2 个测试通过；`source/figma-pages/` 含 6 个 SVG。

- [ ] **Step 5: 提交生成器与导入源。**

```powershell
git add Figma/开发者后台一期/figma-page-map.json Figma/开发者后台一期/build-figma-source.mjs Figma/开发者后台一期/source/source-manifest.json Figma/开发者后台一期/source/figma-pages tests/developer-backend/figma-organization.test.mjs
git commit -m "feat: organize developer backend figma pages"
```

### Task 3: 做本地 SVG 与 Demo 回归

**Files:**

- Modify: `Figma/开发者后台一期/source/figma-pages/*.svg`（仅在校验失败时由生成器重建）
- Test: `tests/developer-backend/*.test.mjs`
- Test: `C:/Users/z3635/.codex/skills/gamehub-figma/tests/test_verify_figma_source.py`

- [ ] **Step 1: 验证 37 个单页源保持可编辑、唯一且无外部资源。**

Run: `node C:/Users/z3635/.codex/skills/gamehub-figma/scripts/verify-figma-source.mjs Figma/开发者后台一期/source/gamehub-developer-backend-phase1.svg --pages P01-01,P01-02,P01-03,P01-04,P01-05,P01-06,P01-07,P01-08,P01-09,P02-01,P02-02,P02-03,P02-04,P02-05,P02-06,P03-01,P03-02,P03-03,P03-04,P03-05,P03-06,P03-07,P03-08,P03-09,P03-10,P03-11,P03-12,P03-13,P04-01,P04-02,P04-03,P04-04,P04-05,P04-06,P04-07,P04-08,P04-09`

Expected: PASS；37/37 页面有效，无外部资源、脚本或整页截图覆盖。

- [ ] **Step 2: 验证 SVG 校验器本身。**

Run: `python -X utf8 C:/Users/z3635/.codex/skills/gamehub-figma/tests/test_verify_figma_source.py`

Expected: PASS，20 个测试通过。

- [ ] **Step 3: 运行全部 Demo 测试与截图回归。**

Run: `node demos/开发者后台一期/build.mjs; node --test tests/developer-backend/*.test.mjs; node scripts/capture-developer-backend.mjs`

Expected: 构建 5 个自包含 HTML；测试总数在新增 Figma 组织测试后全部通过；41/41 截图有效，页面错误、控制台错误、远程请求和横向溢出均为 0。

- [ ] **Step 4: 提交通过的回归证据。**

```powershell
git add test-results/developer-backend Figma/开发者后台一期/source
git commit -m "test: verify developer backend figma organization"
```

### Task 4: 写入已有 Figma 文件，不删除历史稿

**Files:**

- Modify: 云端文件 [盖世游戏｜开发者后台一期](https://www.figma.com/design/arz12KT0WQ7UsHHglFtReN/)
- Source: `Figma/开发者后台一期/source/figma-pages/*.svg`
- Source: `Figma/开发者后台一期/source/gamehub-developer-backend-phase1.svg`

- [ ] **Step 1: 在 Figma 新建并按此顺序命名 Page。**

`00 全局流程索引`、`01 开发者平台与资料`、`02 CDKEY 商品与供给`、`03 包体测试与发布`、`04 精准投放与数据`、`组件母版`、`废弃／历史`。

- [ ] **Step 2: 向前六个 Page 分别导入同名 `figma-pages/*.svg`。**

导入后确认标题条在每个业务 Page 的顶部；每个业务 Frame 仍为 `1440 × 900`；其 Frame 名为 `Pxx-xx｜中文标题`；`P03-01` 到 `P03-13` 从左至右递增。禁止导入 HTML 截图、PNG 整页或外部图片链接。

- [ ] **Step 3: 将当前单根长画板迁移到 `废弃／历史`。**

保留其名称 `gamehub-developer-backend-phase1` 和历史 Node 信息；不删除该画板，不删除四个云端诊断备份，不覆盖任何用户已有 Page。

- [ ] **Step 4: 检查 Figma 图层可编辑性和业务不变契约。**

在 `P01-02`、`P03-13`、`P04-04` 各选择一条文字和一个矢量；分别核对 `P01` 9 页、`P02` 6 页、`P03` 13 页、`P04` 9 页。若某页的 ID、文本、矢量或尺寸不符，停止并重新导入该 Page，不删除历史稿。

### Task 5: 证据、交付记录与最终复核

**Files:**

- Modify: `Figma/开发者后台一期/evidence/figma-canvas-final.png`
- Modify: `Figma/开发者后台一期/evidence/figma-layers-expanded.png`
- Create: `Figma/开发者后台一期/evidence/figma-page-01-platform.png`
- Create: `Figma/开发者后台一期/evidence/figma-page-03-release.png`
- Create: `Figma/开发者后台一期/evidence/figma-page-04-targeting.png`
- Modify: `Figma/开发者后台一期/evidence/figma-editable-text.png`
- Modify: `Figma/开发者后台一期/evidence/figma-editable-vector.png`
- Modify: `Figma/开发者后台一期/evidence/evidence-manifest.json`
- Modify: `Figma/开发者后台一期/figma-delivery.md`
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.md`

- [ ] **Step 1: 截取最终 Figma 证据。**

截图必须证明：七个 Page 的顺序；四个业务 Page 的标题条；`P03-13` 与 `P04-04` 画板；可编辑文字和矢量图层。每张 PNG 写入 `evidence/` 后读取 PNG 的 IHDR 宽高和 SHA-256。

- [ ] **Step 2: 更新证据清单与交付记录。**

`evidence-manifest.json` 的 `figma` 对象写入 Page 名称列表、各业务模块数、历史根画板为非正式定位信息；对每张证据写入真实 `bytes`、`dimensions`、`sha256`。`figma-delivery.md` 删除“唯一正式根 Frame”的旧描述，改为“六个正式设计 Page + 一个历史 Page”，并链接新的截图。

- [ ] **Step 3: 更新状态卡。**

新增一条 2026-09-02 记录：Figma 文件组织已按人工稿重整；37 个 Frame 仍为 9／6／13／9；旧根稿未删除；列出构建、测试、截图和 Figma 图层证据结果。

- [ ] **Step 4: 做最终完整检查。**

Run: `node --test tests/developer-backend/*.test.mjs; node scripts/capture-developer-backend.mjs; git diff --check`

Expected: 所有测试通过；41/41 截图有效；错误、远程请求和溢出均为 0；`git diff --check` 无输出。

- [ ] **Step 5: 提交交付证据和记录。**

```powershell
git add Figma/开发者后台一期/evidence Figma/开发者后台一期/figma-delivery.md prd/workflow-state/LOCAL-20260901-developer-backend-prd.md test-results/developer-backend
git commit -m "docs: deliver organized developer backend figma"
```

## 自检结论

- 覆盖性：规格中的 Page 结构、标题条、横向阅读、组件母版、历史保留、37 页不变和证据要求均对应具体任务。
- 范围：不改 PRD、Demo 页面、官网入口或业务流程；不删除 Figma 内容。
- 一致性：所有验证均以 `frame-map.json` 的 37 页、`9 / 6 / 13 / 9` 和 `1440 × 900` 为基准；旧根 Node 不再充当正式验收锚点。

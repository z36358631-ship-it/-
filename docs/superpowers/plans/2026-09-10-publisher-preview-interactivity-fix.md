# Publisher Preview Interactivity Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让发行人计划 C 端和 B 端固定提交公网预览能够执行现有 JavaScript 并响应全部既有点击。

**Architecture:** 保留两个 `.js` 文件作为维护源，把其完整内容机械内嵌到对应 HTML 的 `data-maintenance-source` 脚本块。静态合同校验 HTML 不再引用外部脚本，并保证内嵌脚本与维护源逐字节一致；既有离线 UI 回归验证业务无变化，新增公网预览验证脚本检查真实 HTTPS 点击链路。

**Tech Stack:** 单文件 HTML、原生 JavaScript、Node.js、`node:assert/strict`、Playwright Core、Chrome、Git、htmlpreview.github.io、jsDelivr

---

## 文件结构

- Modify: `tools/verify-publisher-plan-v2.mjs` — 增加单文件脚本合同，防止再次提交不能被预览服务执行的外链脚本。
- Modify: `demos/Mod与发行人/发行人计划demo.html` — 内嵌 C 端维护源脚本。
- Modify: `demos/Mod与发行人/发行人计划-后台demo.html` — 内嵌 B 端维护源脚本。
- Create: `tools/verify-publisher-plan-public-preview.mjs` — 对固定提交公网地址执行 C/B 端真实点击验证。
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md` — 记录根因、修复提交和公开预览证据。

### Task 1: 建立失败的单文件脚本合同

**Files:**
- Modify: `tools/verify-publisher-plan-v2.mjs:13`
- Test: `tools/verify-publisher-plan-v2.mjs`

- [ ] **Step 1: 在现有合同辅助函数后加入脚本一致性断言**

```js
const assertInlineScriptMatches = (html, js, sourceName, label) => {
  const openingTag = `<script data-maintenance-source="${sourceName}">`;
  assert(!html.includes(`<script src="${sourceName}"></script>`), `${label} still loads external script`);
  const start = html.indexOf(openingTag);
  assert.notEqual(start, -1, `${label} missing inline script marker`);
  const contentStart = start + openingTag.length;
  const end = html.indexOf('</script>', contentStart);
  assert.notEqual(end, -1, `${label} missing inline script closing tag`);
  let embedded = html.slice(contentStart, end);
  if (embedded.startsWith('\r\n')) embedded = embedded.slice(2);
  else if (embedded.startsWith('\n')) embedded = embedded.slice(1);
  assert.equal(embedded, js, `${label} inline script differs from maintenance source`);
};

assertInlineScriptMatches(cHtml, cJs, '发行人计划demo.js', 'C demo');
assertInlineScriptMatches(bHtml, bJs, '发行人计划-后台demo.js', 'B demo');
```

- [ ] **Step 2: 运行合同并确认先失败**

Run: `node tools/verify-publisher-plan-v2.mjs`

Expected: FAIL，错误包含 `C demo still loads external script`。

### Task 2: 将前后台交互脚本内嵌到 HTML

**Files:**
- Modify: `demos/Mod与发行人/发行人计划demo.html:286`
- Modify: `demos/Mod与发行人/发行人计划-后台demo.html:121`
- Source: `demos/Mod与发行人/发行人计划demo.js`
- Source: `demos/Mod与发行人/发行人计划-后台demo.js`

- [ ] **Step 1: 执行确定性的机械内嵌**

在仓库根目录执行以下 PowerShell；它只替换两个已确认的 `<script src>` 标签，找不到标签时直接失败：

```powershell
$targets = @(
  @{ Html = 'demos/Mod与发行人/发行人计划demo.html'; Js = 'demos/Mod与发行人/发行人计划demo.js'; Source = '发行人计划demo.js' },
  @{ Html = 'demos/Mod与发行人/发行人计划-后台demo.html'; Js = 'demos/Mod与发行人/发行人计划-后台demo.js'; Source = '发行人计划-后台demo.js' }
)
$utf8 = New-Object System.Text.UTF8Encoding($false)
foreach ($target in $targets) {
  $html = [System.IO.File]::ReadAllText($target.Html)
  $js = [System.IO.File]::ReadAllText($target.Js)
  $old = '<script src="' + $target.Source + '"></script>'
  if (-not $html.Contains($old)) { throw "未找到待替换脚本标签：$($target.Html)" }
  $eol = if ($html.Contains("`r`n")) { "`r`n" } else { "`n" }
  $new = '<script data-maintenance-source="' + $target.Source + '">' + $eol + $js + '</script>'
  [System.IO.File]::WriteAllText($target.Html, $html.Replace($old, $new), $utf8)
}
```

- [ ] **Step 2: 运行静态合同并确认通过**

Run: `node tools/verify-publisher-plan-v2.mjs`

Expected: `PASS: publisher plan V2 static contract`。

- [ ] **Step 3: 检查差异只包含合同和两个脚本块**

Run: `git diff --check && git diff --stat`

Expected: 无空白错误；只有 `tools/verify-publisher-plan-v2.mjs` 和两个发行人计划 HTML 发生变化。

- [ ] **Step 4: 提交单文件修复**

```bash
git add tools/verify-publisher-plan-v2.mjs "demos/Mod与发行人/发行人计划demo.html" "demos/Mod与发行人/发行人计划-后台demo.html"
git commit -m "fix: make publisher previews interactive"
```

### Task 3: 执行离线交互与视觉回归

**Files:**
- Test: `tools/verify-publisher-plan-v2-ui.mjs`
- Verify unchanged: `public/prd/publisher-plan-v2/*.png`
- Verify unchanged: `docs/evidence/publisher-plan-v2/verification.json`

- [ ] **Step 1: 运行现有离线 UI 回归**

Run: `node tools/verify-publisher-plan-v2-ui.mjs`

Expected: 输出 PASS；C 端玩法说明、钱包、兑换商城与兑换流程通过；B 端京东卡商品、库存、告警设置与兑换订单通过；`externalRequests`、`pageErrors`、`consoleErrors` 均为 0。

- [ ] **Step 2: 再次运行静态合同**

Run: `node tools/verify-publisher-plan-v2.mjs`

Expected: `PASS: publisher plan V2 static contract`。

- [ ] **Step 3: 检查 UI 回归未改变截图或业务证据**

Run: `git status --short`

Expected: 任务 2 已提交后工作区保持干净；如图片或 `verification.json` 仅因确定性时间字段变化，必须先查明原因，不能把变化带入本次修复。

### Task 4: 增加公网固定提交交互验证器

**Files:**
- Create: `tools/verify-publisher-plan-public-preview.mjs`

- [ ] **Step 1: 创建固定 SHA 公网验证脚本**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const sha = process.argv[2];
assert.match(sha ?? '', /^[0-9a-f]{40}$/, 'usage: node tools/verify-publisher-plan-public-preview.mjs <40-char-sha>');

const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].find(fs.existsSync);
assert(chrome, 'Local Chrome not found');

const preview = file => `https://htmlpreview.github.io/?https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@${sha}/demos/Mod%E4%B8%8E%E5%8F%91%E8%A1%8C%E4%BA%BA/${file}`;
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const errors = [];

try {
  const c = await browser.newPage({ viewport: { width: 520, height: 980 } });
  c.on('pageerror', error => errors.push(`C pageerror: ${error.message}`));
  c.on('console', message => { if (message.type() === 'error') errors.push(`C console: ${message.text()}`); });
  await c.goto(preview('%E5%8F%91%E8%A1%8C%E4%BA%BA%E8%AE%A1%E5%88%92demo.html'), { waitUntil: 'networkidle', timeout: 60_000 });
  await c.getByText('钱包', { exact: true }).click();
  await c.locator('#view-earnings.active').waitFor({ state: 'visible' });
  await c.getByText('兑换商城', { exact: true }).first().click();
  await c.locator('#view-card-store.active').waitFor({ state: 'visible' });

  const b = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  b.on('pageerror', error => errors.push(`B pageerror: ${error.message}`));
  b.on('console', message => { if (message.type() === 'error') errors.push(`B console: ${message.text()}`); });
  await b.goto(preview('%E5%8F%91%E8%A1%8C%E4%BA%BA%E8%AE%A1%E5%88%92-%E5%90%8E%E5%8F%B0demo.html'), { waitUntil: 'networkidle', timeout: 60_000 });
  await b.getByText('京东卡管理', { exact: true }).click();
  await b.getByText('京东电子卡商品', { exact: true }).waitFor({ state: 'visible' });
  await b.getByText('兑换订单', { exact: true }).first().click();
  assert.equal(await b.locator('#page-title').innerText(), '兑换订单');

  assert.deepEqual(errors, []);
  console.log(`PASS: publisher public previews are interactive at ${sha}`);
} finally {
  await browser.close();
}
```

- [ ] **Step 2: 提交公网验证器**

```bash
git add tools/verify-publisher-plan-public-preview.mjs
git commit -m "test: verify publisher public preview interactions"
```

### Task 5: 推送、验证并回写交付证据

**Files:**
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md`
- Verify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json`

- [ ] **Step 1: 推送当前功能分支**

Run: `git push origin codex/guanwanggaid-41-publisher-plan-v2-20260910`

Expected: 远端分支更新成功。

- [ ] **Step 2: 获取固定提交并执行公网点击验证**

```powershell
$previewSha = git rev-parse HEAD
node tools/verify-publisher-plan-public-preview.mjs $previewSha
```

Expected: `PASS: publisher public previews are interactive at <sha>`。

- [ ] **Step 3: 更新状态卡**

在 `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md` 中追加本轮记录：根因为 htmlpreview 不执行 jsDelivr 外链脚本；两个 HTML 已改为自包含脚本；静态、离线 UI、公网 C/B 点击通过；记录修复提交 SHA 和两个固定 SHA 预览地址。业务决定 D-001 至 D-010 不变，PRD 和截图标记为“无需修改”。

- [ ] **Step 4: 提交并推送状态卡**

```bash
git add prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md
git commit -m "docs: record publisher preview verification"
git push origin codex/guanwanggaid-41-publisher-plan-v2-20260910
```

- [ ] **Step 5: 核对远端与本地提交**

```powershell
$localSha = git rev-parse HEAD
$remoteSha = git ls-remote origin refs/heads/codex/guanwanggaid-41-publisher-plan-v2-20260910 | ForEach-Object { ($_ -split "`t")[0] }
if ($localSha -ne $remoteSha) { throw "远端提交与本地不一致" }
```

Expected: 命令无错误，本地 HEAD 与远端分支 SHA 一致。

## 自检结果

- 规格覆盖：根因、单文件架构、脚本一致性、离线回归、公网点击、固定 SHA、状态回写均有对应任务。
- 占位检查：计划不包含待补内容；所有命令、路径、断言和预期结果已明确。
- 类型一致性：维护源文件名、HTML 标记、验证器参数和固定提交 SHA 在各任务中一致。

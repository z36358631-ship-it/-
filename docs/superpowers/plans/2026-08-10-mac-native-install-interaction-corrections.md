# Mac 原生标识与安装交互修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正 Mac 原生平台标识、安装路径默认选择和安装弹窗提交行为，并同步 PRD、截图与 Git 预览。

**Architecture:** 保持现有单文件 HTML 的页面结构，仅调整平台角标模板、最近路径状态和后台下载状态。安装弹窗只完成路径选择与任务提交；下载进度移到详情主按钮展示。PRD 更新为 V1.6，受影响的三张功能图重新截取并使用同一固定提交 SHA。

**Tech Stack:** HTML、CSS、原生 JavaScript、localStorage、Node.js Test Runner、Playwright Core、Microsoft Edge、Markdown、Git、jsDelivr

---

### Task 1: 为新交互增加失败测试

**Files:**
- Create: `tests/mac-native-install-interaction-v16.test.mjs`
- Verify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Verify: `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md`

- [ ] **Step 1: 编写静态契约测试**

```js
test('游戏卡片的 Mac 原生角标只显示苹果图标', () => {
  const nativeChips = [...demo.matchAll(/<span class="native-chip[^"]*"[^>]*>([\s\S]*?)<\/span><\/span>/g)];
  assert.ok(nativeChips.length >= 3);
  for (const [, content] of nativeChips) {
    assert.match(content, /<use href="#i-apple"\/>/);
    assert.doesNotMatch(content, /Mac 原生/);
  }
});

test('安装位置优先恢复上一次成功安装路径', () => {
  assert.match(demo, /lastUsedInstallPathId/);
  assert.match(demo, /localStorage\.getItem\('gamehub-last-install-path'\)/);
  assert.match(demo, /pathEligibility\(remembered,version\)\.eligible/);
});

test('安装提交关闭弹窗并转入后台下载', () => {
  assert.doesNotMatch(demo, /id="progress"|id="progressBar"|取消下载/);
  assert.match(demo, /startBackgroundDownload\(selected\)/);
  assert.match(demo, /closeInstall\(\)/);
  assert.match(demo, /正在下载/);
});
```

- [ ] **Step 2: 编写 PRD V1.6 契约测试**

```js
test('PRD V1.6 与最近路径和后台下载口径一致', () => {
  assert.match(prd, /\|2026-08-10\|V1\.6\|/);
  assert.match(prd, /上一次成功安装/);
  assert.match(prd, /路径.*不合格.*可用空间最大/);
  assert.match(prd, /安装弹窗.*立即关闭/);
  assert.doesNotMatch(prd, /安装弹窗[^\n]*取消下载|安装弹窗[^\n]*进度条/);
});
```

- [ ] **Step 3: 运行测试并确认改动前失败**

Run: `node --test tests/mac-native-install-interaction-v16.test.mjs`

Expected: FAIL，缺少 V1.6、最近路径恢复与后台下载规则，旧角标仍包含文字。

### Task 2: 修改 Demo 状态与交互

**Files:**
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Test: `tests/mac-native-install-interaction-v16.test.mjs`

- [ ] **Step 1: 将 Mac 原生角标收敛为苹果图标**

将 `.native-chip` 调整为与 `.platform-chip` 同尺寸的图标容器，并删除游戏卡片模板中的 `<span>Mac 原生</span>`；保留 `title` 和 `aria-label`。

- [ ] **Step 2: 增加最近安装路径持久化**

```js
const LAST_INSTALL_PATH_KEY='gamehub-last-install-path';
function readLastUsedInstallPath(){
  try{return localStorage.getItem(LAST_INSTALL_PATH_KEY)||'applications'}catch{return 'applications'}
}
function rememberLastUsedInstallPath(id){
  state.lastUsedInstallPathId=id;
  try{localStorage.setItem(LAST_INSTALL_PATH_KEY,id)}catch{}
}
```

在 `state` 中加入 `lastUsedInstallPathId:readLastUsedInstallPath()`。

- [ ] **Step 3: 修改安装路径默认选择规则**

```js
function ensureSelectedPath(version,{force=false}={}){
  const current=installPaths.find(path=>path.id===state.selectedPathId);
  if(!force&&pathEligibility(current,version).eligible)return state.selectedPathId;
  const remembered=installPaths.find(path=>path.id===state.lastUsedInstallPathId);
  state.selectedPathId=pathEligibility(remembered,version).eligible
    ? remembered.id
    : sortedInstallPaths(version).find(path=>pathEligibility(path,version).eligible)?.id??null;
  return state.selectedPathId;
}
```

- [ ] **Step 4: 将下载任务移出安装弹窗**

删除安装弹窗内的进度条 DOM、相关 CSS 和“取消下载”分支。安装复验成功后调用 `rememberLastUsedInstallPath(path.id)`、`startBackgroundDownload(selected)`、`closeInstall()`；后台计时器更新详情主按钮，完成后更新已安装版本和当前启动版本。

- [ ] **Step 5: 运行静态测试**

Run: `node --test tests/mac-native-install-interaction-v16.test.mjs`

Expected: Demo 相关测试 PASS，PRD V1.6 测试仍 FAIL。

### Task 3: 更新 PRD V1.6

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md`
- Modify: `tests/mac-native-prd-v15.test.mjs`
- Test: `tests/mac-native-install-interaction-v16.test.mjs`

- [ ] **Step 1: 追加 V1.6 版本记录**

在版本表追加 `2026-08-10 | V1.6`，说明苹果图标、最近路径和后台下载三项调整，不删除 V1.5。

- [ ] **Step 2: 更新 4.2 C 端汇总表**

将平台标识规则改为“Mac 原生仅显示苹果图标”；将安装路径默认规则改为“最近成功路径优先，失效后回退最大可用空间”；将下载规则改为“安装提交成功后弹窗关闭，后台下载，详情主按钮展示状态”。

- [ ] **Step 3: 同步概要、埋点和验收**

保留 `install_path_type`，不采集本地绝对路径；下载开始事件在后台任务创建成功时触发。验收表覆盖最近路径有效、最近路径失效、提交后关闭弹窗和重复提交保护。

- [ ] **Step 4: 更新 V1.5 结构测试为兼容 V1.6**

保留九章结构、单个 C 端大表、图片数量和埋点参数对齐检查；增加 V1.6 版本行断言，移除旧“最大空间默认”和“弹窗内取消”断言。

- [ ] **Step 5: 运行文档测试**

Run: `node --test tests/mac-native-prd-v15.test.mjs tests/mac-native-install-interaction-v16.test.mjs`

Expected: 全部 PASS。

### Task 4: 真实浏览器验证并更新功能图

**Files:**
- Create: `tools/capture-mac-native-v16.mjs`
- Modify: `public/prd/mac-native-version-management/04-path-largest-default.png`
- Modify: `public/prd/mac-native-version-management/06-download-locked.png`
- Modify: `public/prd/mac-native-version-management/07-game-library-platform-badges.png`
- Create: `test-results/mac-native-v16-browser-report.json`

- [ ] **Step 1: 编写 Playwright Core 验证脚本**

脚本使用 `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe` 打开本地 Demo，覆盖游戏库角标、上次路径恢复、安装提交关闭弹窗、详情后台下载状态和完成后的版本状态；监听 `pageerror` 与控制台错误。

- [ ] **Step 2: 截取三张更新图**

图 07 截取仅含苹果图标的平台角标；图 04 截取上一次路径为 `/Applications/GameHub/` 且被默认选中的安装弹窗；图 06 截取安装弹窗关闭后的详情后台下载状态。

- [ ] **Step 3: 运行真实浏览器验证**

Run: `node tools/capture-mac-native-v16.mjs`

Expected: 输出三张 PNG 和 JSON 报告；`pageErrors`、`consoleErrors` 均为空，全部断言通过。

### Task 5: 发布固定图片并完成交付

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md`
- Modify: `test-results/mac-native-prd-publish-report.md`
- Publish: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Publish: `public/prd/mac-native-version-management/*.png`
- Publish: `tests/*.test.mjs`
- Publish: `tools/capture-mac-native-v16.mjs`

- [ ] **Step 1: 提交 Demo、测试和七张图片**

Run: `git add -- demos/PC与Mac端/Mac原生游戏版本管理demo.html tests tools/capture-mac-native-v16.mjs public/prd/mac-native-version-management && git commit -m "feat(mac): refine native install workflow"`

Expected: 生成包含全部七张图片的 40 位提交 SHA。

- [ ] **Step 2: 将 PRD 的七张图片统一替换为新 SHA**

运行 `$imageSha = (git rev-parse HEAD).Trim()` 获取实际 40 位提交号，再把 PRD 中旧图片提交号统一替换为 `$imageSha`。最终地址格式为 `https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$imageSha/public/prd/mac-native-version-management/图片文件名.png`，不得保留旧 SHA。

- [ ] **Step 3: 验证远程图片与文档**

逐张请求七个固定地址，要求 HTTP 200 且 `Content-Type: image/png`；运行全部 Node 测试和 `git diff --check`。

- [ ] **Step 4: 提交 PRD 与验证报告并推送**

Run: `git add -- prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md test-results/mac-native-prd-publish-report.md docs/superpowers/plans/2026-08-10-mac-native-install-interaction-corrections.md && git commit -m "docs(mac): publish native install PRD v1.6" && git push origin codex/guanwanggaid-5-prd-feishu-20260810`

Expected: 分支推送成功，raw.githack Demo 预览返回 HTTP 200。

- [ ] **Step 5: 更新任务板交付记录**

读取 `GUANWANGGAID-5` 最新版本，追加改动与验证评论；完成自验后使用最新 `version` 将状态改为 `in_review`，不直接改为 `done`。

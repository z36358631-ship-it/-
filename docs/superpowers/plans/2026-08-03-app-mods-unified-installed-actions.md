# APP MODS Unified Installed Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已安装列表、Steam 个人中心和 MOD 详情的操作统一为“更新｜卸载｜启停开关”，去掉黄色圆点与断点续传规则。

**Architecture:** 单文件 Demo 使用共用 `renderInstalledActions()` 生成三处操作，并将可更新状态从静态 MOD 数据拷贝到 `state.availableUpdates`。卸载弹窗按 `confirmUninstallModId` 绑定具体 MOD；更新和启停通过同一状态源重绘三处界面。自动化验证覆盖结构、操作隔离、卸载目标、横竖屏布局、PRD 规则和固定 Git 资产链接。

**Tech Stack:** HTML/CSS/Vanilla JavaScript, Node.js, Playwright Core, Markdown, GitHub raw/CDN links

---

### Task 1: Lock the interaction contract with failing tests

**Files:**
- Modify: `tools/verify-app-mods-demo.mjs`
- Modify: `tools/verify-app-mods-prd.mjs`

- [ ] **Step 1: Add failing static contracts**

```js
assert.match(html, /function renderInstalledActions/u);
assert.match(html, /data-installed-update/u);
assert.match(html, /class="action-update-dot"/u);
assert.doesNotMatch(html, /class="update-dot"/u);
assert.doesNotMatch(html, />检查更新</u);
```

- [ ] **Step 2: Add failing browser contracts for all three surfaces**

```js
for (const surface of ['installed-list', 'steam-profile', 'detail']) {
  const actions = page.locator(`[data-installed-actions="${surface}"]`);
  assert.deepEqual(
    await actions.locator('button').evaluateAll(items => items.map(item => item.textContent.trim())),
    ['更新', '卸载', '']
  );
}
assert.equal(await page.locator('.update-dot').count(), 0);
```

- [ ] **Step 3: Add failing behavior contracts**

```js
assert.equal(await page.locator('[data-installed-update][data-mod-id="storage-box"] .action-update-dot').count(), 1);
assert.equal(await page.locator('[data-installed-update][data-mod-id="minimap"]').isDisabled(), true);
await page.locator('[data-action="open-uninstall"][data-mod-id="storage-box"]').click();
assert.match(await page.locator('.confirm-card h3').textContent(), /智能储物箱/u);
```

- [ ] **Step 4: Replace PRD continuation assertions with interruption assertions**

```js
for (const pattern of [/不支持断点续传/u, /进入后台.*中断/u, /重试时从 0/u]) {
  assert.match(markdown, pattern);
}
assert.doesNotMatch(markdown, /恢复网络后续传/u);
```

- [ ] **Step 5: Run tests and verify the new contracts fail**

Run: `node tools/verify-app-mods-demo.mjs`

Expected: FAIL because the common renderer, red update dot, and target-bound uninstall state do not exist yet.

Run: `node tools/verify-app-mods-prd.mjs`

Expected: FAIL because the PRD still specifies continuation and the old detail actions.

- [ ] **Step 6: Commit the test contract**

```bash
git add tools/verify-app-mods-demo.mjs tools/verify-app-mods-prd.mjs
git commit -m "test(mods): define unified installed actions"
```

### Task 2: Implement the shared installed actions in the Demo

**Files:**
- Modify: `demos/Mod与发行人/APP端MODS功能demo.html`

- [ ] **Step 1: Add mutable update and uninstall-target state**

```js
availableUpdates: MODS.filter(mod => mod.update).map(mod => mod.id),
confirmUninstallModId: null,
```

- [ ] **Step 2: Filter installed updates from the shared state**

```js
visibleMods = visibleMods.filter(mod => state.availableUpdates.includes(mod.id));
```

- [ ] **Step 3: Add one renderer for all installed surfaces**

```js
function renderInstalledActions(mod, surface) {
  const enabled = state.enabled.includes(mod.id);
  const canUpdate = state.availableUpdates.includes(mod.id);
  return `<div class="installed-actions" data-installed-actions="${surface}">
    <button class="installed-action" type="button" data-installed-update data-action="update" data-mod-id="${mod.id}" ${canUpdate ? '' : 'disabled'}>更新${canUpdate ? '<i class="action-update-dot" aria-hidden="true"></i>' : ''}</button>
    <button class="installed-action danger" type="button" data-action="open-uninstall" data-mod-id="${mod.id}">卸载</button>
    <div class="installed-switch"><span>${enabled ? '已启用' : '已停用'}</span><button class="enable-switch" type="button" role="switch" aria-checked="${enabled}" aria-label="${enabled ? '停用' : '启用'} ${mod.name}" data-enable-switch data-action="toggle-enabled" data-mod-id="${mod.id}"></button></div>
  </div>`;
}
```

- [ ] **Step 4: Use the common renderer on installed cards, profile cards, and detail**

```js
${installed ? renderInstalledActions(mod, 'installed-list') : installAction}
${renderInstalledActions(mod, 'steam-profile')}
${installed ? renderInstalledActions(mod, 'detail') : installAction}
```

- [ ] **Step 5: Bind update and uninstall events to the current MOD**

```js
case 'OPEN_UNINSTALL':
  state.confirmUninstallModId = event.modId;
  break;
case 'CONFIRM_UNINSTALL': {
  const modId = state.confirmUninstallModId;
  state.installed = state.installed.filter(id => id !== modId);
  state.enabled = state.enabled.filter(id => id !== modId);
  state.availableUpdates = state.availableUpdates.filter(id => id !== modId);
  state.confirmUninstallModId = null;
  break;
}
case 'UPDATE':
  state.availableUpdates = state.availableUpdates.filter(id => id !== event.modId);
  break;
```

- [ ] **Step 6: Prevent all three card actions from opening details**

```js
if (['update', 'open-uninstall', 'toggle-enabled'].includes(action)) event.stopPropagation();
if (action === 'update') dispatch({ type: 'UPDATE', modId });
if (action === 'open-uninstall') dispatch({ type: 'OPEN_UNINSTALL', modId });
```

- [ ] **Step 7: Replace yellow-dot and detail-state styles with compact shared actions**

```css
.installed-actions { position:absolute; right:12px; bottom:10px; left:12px; display:grid; grid-template-columns:1fr 1fr 1.35fr; gap:8px; }
.installed-action { position:relative; min-width:0; height:38px; border-radius:10px; color:#fff; background:#3a393f; }
.installed-action:disabled { color:#77767c; background:#302f34; }
.action-update-dot { position:absolute; top:7px; right:8px; width:6px; height:6px; border-radius:50%; background:#ff4d67; }
.installed-switch { height:38px; display:flex; align-items:center; justify-content:center; gap:6px; border-radius:10px; background:#302f34; }
```

- [ ] **Step 8: Run the Demo verification**

Run: `node tools/verify-app-mods-demo.mjs`

Expected: `PASS` for static structure and browser interaction assertions.

- [ ] **Step 9: Commit the working Demo**

```bash
git add "demos/Mod与发行人/APP端MODS功能demo.html" tools/verify-app-mods-demo.mjs
git commit -m "feat(mods): unify installed actions"
```

### Task 3: Refresh and inspect PRD screenshots

**Files:**
- Modify: `public/prd/app-mods/03-installed-portrait.png`
- Modify: `public/prd/app-mods/04-detail-portrait.png`
- Modify: `public/prd/app-mods/06-detail-landscape.png`
- Modify: `public/prd/app-mods/07-installed-landscape.png`
- Modify: `public/prd/app-mods/09-steam-profile-mods-portrait.png`
- Modify: `public/prd/app-mods/10-steam-profile-mods-landscape.png`

- [ ] **Step 1: Generate all ten deterministic screenshots**

Run: `node tools/verify-app-mods-demo.mjs --screenshots`

Expected: `PASS: 十张 APP MODS PRD 截图已生成`.

- [ ] **Step 2: Inspect the six affected screenshots**

Verify: every installed card/detail shows three complete controls; the red dot is inside only enabled update buttons; portrait and landscape layouts have no clipping or overlap; no yellow corner dot remains.

- [ ] **Step 3: Commit and push fixed assets**

```bash
git add public/prd/app-mods tools/verify-app-mods-demo.mjs
git commit -m "docs(mods): refresh unified action screenshots"
git push origin HEAD:main
```

- [ ] **Step 4: Record the resulting 40-character commit SHA**

Run: `git rev-parse HEAD`

Expected: a 40-character SHA used by every PRD image and Demo URL.

### Task 4: Rewrite the PRD to the final behavior

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》APP端MODS需求.md`
- Modify: `tools/verify-app-mods-prd.mjs`

- [ ] **Step 1: Replace the old action matrix**

```markdown
| 状态 | 更新 | 卸载 | 启停 |
|---|---|---|---|
| 有更新 | 可点，按钮内显示红点 | 可点 | 开关可用 |
| 无更新或未知 | 禁用，无红点 | 可点 | 开关可用 |
```

- [ ] **Step 2: Specify the same actions on all three surfaces**

```markdown
已安装列表、Steam 个人中心和 MOD 详情统一展示“更新｜卸载｜启停开关”。操作按钮不触发卡片详情。Steam 个人中心不支持安装新 MOD，可更新当前设备已安装 MOD。
```

- [ ] **Step 3: Replace continuation with interruption rules**

```markdown
本期不支持断点续传。下载和更新仅在 APP 前台执行；断网、进入后台或进程退出后中断并清理临时进度，返回后不自动恢复，重试时从 0 创建新任务。更新中断保留旧版本和原启用状态。
```

- [ ] **Step 4: Replace every screenshot and Demo URL with the fixed SHA**

Use `https://raw.githubusercontent.com/<owner>/<repo>/<40-char-sha>/...` for images and the project’s verified HTMLPreview format for the Demo.

- [ ] **Step 5: Run local and remote PRD verification**

Run: `node tools/verify-app-mods-prd.mjs`

Expected: `PASS` for content, fixed SHA, and referenced local assets.

Run: `node tools/verify-app-mods-prd.mjs --remote`

Expected: all image URLs return `200 image/png`; the Demo URL returns usable HTML.

- [ ] **Step 6: Commit and push the PRD**

```bash
git add "prd/ai生成/【Prd】《盖世游戏》APP端MODS需求.md" tools/verify-app-mods-prd.mjs
git commit -m "docs(mods): finalize unified installed actions"
git push origin HEAD:main
```

### Task 5: Verify the published handoff

**Files:**
- Verify: `demos/Mod与发行人/APP端MODS功能demo.html`
- Verify: `prd/ai生成/【Prd】《盖世游戏》APP端MODS需求.md`

- [ ] **Step 1: Open the exact published HTMLPreview URL in Chromium**

Verify: HTTP load succeeds and the rendered page contains `[data-demo-root]`.

- [ ] **Step 2: Click through installed list, profile, and detail**

Verify: update clears its red dot, uninstall names the selected MOD, cancel preserves it, confirm removes it, and the switch changes without a success Toast.

- [ ] **Step 3: Verify repository state**

Run: `git status --short`

Expected: only the pre-existing untracked `.superpowers/` directory remains; all deliverable files are committed and pushed to `origin/main`.


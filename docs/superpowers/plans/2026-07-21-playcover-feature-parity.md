# PlayCover Feature Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the existing annotated Mac demo, PRD, and Feishu feature list so the App library and IPA library match PlayCover 3.1.0 functions while retaining GameHub's confirmed import-safety flow.

**Architecture:** Keep the product demo as one self-contained HTML file and extend its existing state/render/action pattern. Add isolated state branches for App settings, context menus, view modes, source navigation, and refresh lifecycles; reuse one modal shell but use separate content renderers. Update the single PRD and one-line feature list from the same behavior definitions.

**Tech Stack:** Single-file HTML/CSS/JavaScript, PowerShell validation, built-in browser smoke tests, Markdown PRD.

---

### Task 1: Lock the new behavior with smoke checks

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html`

- [ ] **Step 1: Add failing checks to `runSmoke()`**

Add checks equivalent to:

```javascript
check('no-category-navigation', !$('.category-nav') && !document.body.textContent.includes('创意'));
check('app-refresh-present', Boolean($('[data-action="refresh-apps"]')));
check('app-view-toggle-present', Boolean($('[data-action="set-app-view"]')));
check('ipa-source-tree-present', Boolean($('#ipaSourceTree')));
check('ipa-view-toggle-present', Boolean($('[data-action="set-resource-view"]')));
openContextMenu('app', 'ish', 400, 300);
check('app-context-actions', ['设置','显示应用数据','在访达中查看','清除应用数据','清除应用偏好设置','清除 PlayChain 数据','卸载应用'].every(text => $('#contextMenu').textContent.includes(text)));
check('no-keymap-import-export', !$('#contextMenu').textContent.includes('导入键盘映射') && !$('#contextMenu').textContent.includes('导出键盘映射'));
openContextMenu('resource', 'delta', 400, 300);
check('ipa-context-info-only', $$('#contextMenu button').length === 1 && $('#contextMenu').textContent.includes('应用信息'));
```

- [ ] **Step 2: Run smoke and confirm failure**

Run:

```powershell
Start-Process "http://127.0.0.1:8765/Mac%E7%AB%AFdemo/mac%E7%AB%AF%E7%A7%9F%E5%8F%B7%E5%8A%9F%E8%83%BD/%E7%9B%96%E4%B8%96%E6%B8%B8%E6%88%8FMac%E7%AB%AF-iOS%E5%BA%94%E7%94%A8%E4%B8%8EIPA%E8%B5%84%E6%BA%90%E5%BA%93demo-%E6%A0%87%E6%B3%A8%E7%89%88.html?smoke=1"
```

Expected: new checks report `false` before implementation.

- [ ] **Step 3: Commit the test contract with the implementation in Tasks 2–4**

Do not create a failing-only commit on `master`; keep these checks staged with the feature implementation.

### Task 2: Refactor the shared demo state and shell

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html`

- [ ] **Step 1: Remove category state and rendering**

Delete `categories`, `state.category`, `renderCategoryNav()`, `set-category`, and category matching in `filterResources()`. Change batch-selection copy and logic to describe only current source, search, and status scope.

- [ ] **Step 2: Add explicit shared state**

Add the following keys to the existing `state` object and reset path:

```javascript
appView: 'grid',
resourceView: 'grid',
activeSourceId: 'all',
selectedAppId: '',
selectedResourceId: '',
contextMenu: null,
refreshingApp: false,
refreshingSourceId: '',
settingsTab: 'keymap',
appSettings: createDefaultAppSettings()
```

- [ ] **Step 3: Add a reusable native context-menu shell**

Implement `renderContextMenu()`, `openContextMenu(kind,id,x,y)`, and `closeContextMenu()` so the menu is positioned inside the client window, closes on blank click, `Escape`, Tab switch, resize, and action, and binds actions to the right-clicked item ID.

- [ ] **Step 4: Add list/grid base styles**

Create `.library-grid`, `.library-list`, `.library-row`, `.view-switch`, `.native-context-menu`, `.source-tree`, `.source-node`, `.settings-window`, and `.confirm-dialog` styles that reuse the current GameHub dark tokens and macOS spacing.

- [ ] **Step 5: Verify syntax**

Run:

```powershell
node --check .tmp/playcover-demo-script.js
```

Expected: `Exit code 0` after extracting the inline script to the temporary read-only check file.

### Task 3: Implement the App library parity surface

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html`

- [ ] **Step 1: Replace the App toolbar**

Render search, permanent “导入 IPA”, `refresh-apps`, disabled-until-selected settings, and `set-app-view` grid/list buttons. Preserve search and view state while refreshing.

- [ ] **Step 2: Render App grid and list from one dataset**

Use `renderMyAppItem(item, viewMode)` for both layouts. Grid shows icon/name/state; list shows icon/name/version/state. Single click selects, blank click clears, double click starts the launch progress state.

- [ ] **Step 3: Add the App context menu**

Render these exact actions in order:

```javascript
[
  '设置',
  '显示应用数据',
  '在访达中查看',
  'separator',
  '清除应用数据',
  '清除应用偏好设置',
  '清除 PlayChain 数据',
  'separator',
  '卸载应用'
]
```

Do not render keymap import/export.

- [ ] **Step 4: Implement five App settings tabs**

Create renderers `renderKeymapSettings()`, `renderGraphicsSettings()`, `renderBypassSettings()`, `renderMiscSettings()`, and `renderAppInfoSettings()`. Use controlled inputs bound to `state.appSettings`; implement the PlayChain/debug, LLDB/terminal, resolution/custom size/aspect ratio, and keymap/sensitivity dependencies.

- [ ] **Step 5: Implement settings reset and capability states**

“重置设置” restores `createDefaultAppSettings()`, “重置键盘映射” restores only keymap fields, and “好” closes the window. Apps without PlayTools disable keymap, graphics, bypass, and dependent misc fields but keep Info available.

- [ ] **Step 6: Implement destructive confirmations**

Use separate copy and state for clearing app data, preferences, PlayChain, and uninstall. The uninstall dialog includes optional PlayChain, Entitlements, app settings, keymap, and app-data cleanup controls; confirm removes the app fixture and refreshes the view.

- [ ] **Step 7: Verify App behavior**

Expected manual results:

```text
grid/list both render -> right-click target is correct -> settings opens five tabs
clear actions require confirmation -> cancel preserves data -> confirm shows result
refresh preserves search and view -> removed selected app clears selection
```

### Task 4: Implement the IPA library parity surface

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html`

- [ ] **Step 1: Replace the source dropdown with a source tree**

Render root node `IPA 资源库` and one child per enabled source. Bind selection to `sourceId`, not display name. Root aggregates sources by Bundle ID; child nodes show only that source.

- [ ] **Step 2: Replace the IPA toolbar**

Render search, add source, refresh, disabled-until-selected info, alphabetical toggle, and grid/list switch. Root refresh sets `refreshingSourceId='all'`; child refresh uses the selected stable source ID.

- [ ] **Step 3: Render grid/list and version states**

Grid shows icon, name, version marker, and progress. List shows state icon, app icon, name, and right-aligned version. Distinguish icon metadata loading/failure from IPA validity.

- [ ] **Step 4: Implement IPA selection and context menu**

Single click selects, blank click clears, double click enters download/overwrite flow, and right click shows exactly one “应用信息” action.

- [ ] **Step 5: Replace the detail popover with the parity information window**

Display Bundle name, Bundle ID, version, iTunes lookup, IPA URL, checksum, source, size, compatibility, and risk. The same renderer must serve the toolbar info and context menu.

- [ ] **Step 6: Complete source management**

Provide enable, disable, delete, move up, move down, and refresh. If the active source becomes unavailable, return to root. Refresh failure keeps cached resources and shows the last-success timestamp.

- [ ] **Step 7: Preserve the GameHub import safety flow**

Keep 500 ms validation, second-level resource selection, final confirmation, checksum warning, and task recovery. Source creation updates the tree only after final confirmation.

- [ ] **Step 8: Verify IPA behavior**

Expected manual results:

```text
root aggregates -> child filters -> same-name sources remain separate
grid/list persist -> right-click only shows app info -> double click downloads
root refreshes all -> child refreshes one -> failed refresh shows cache
```

### Task 5: Update the product documents

**Files:**
- Modify: `prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md`
- Modify: `prd/【飞书功能点】盖世游戏Mac端-iOS应用与IPA资源库.md`

- [ ] **Step 1: Add a new PRD version row**

Record the removal of category navigation and addition of PlayCover parity functions without deleting the V1.0 history.

- [ ] **Step 2: Reconcile scope and detailed design**

Remove category requirements and the previous exclusion of resolution/device/keymap settings. Add the two refresh meanings, App context menu, five settings tabs, IPA source tree, right-click info, list/grid, and destructive confirmation behavior.

- [ ] **Step 3: Update acceptance criteria and event tracking**

Add events for view switch, context action, settings update/reset, source-node switch, app refresh, source refresh, and destructive confirmation. Add acceptance checks matching the ten points in the design spec.

- [ ] **Step 4: Update the Feishu one-line feature list**

Write exactly one function per Markdown list line. Remove category lines and add every new App/IPA function and boundary.

- [ ] **Step 5: Run document scans**

Run:

```powershell
rg -n "全部、游戏、工具、娱乐、社交、创意、其他|分类筛选" prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md prd/【飞书功能点】盖世游戏Mac端-iOS应用与IPA资源库.md
rg -n "右键|列表|网格|刷新|清除 PlayChain|图像设置|来源树" prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md
```

Expected: no active seven-category requirements; every new feature has at least one PRD definition.

### Task 6: Validate, commit, and publish

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html`
- Modify: `prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md`
- Modify: `prd/【飞书功能点】盖世游戏Mac端-iOS应用与IPA资源库.md`

- [ ] **Step 1: Run the built-in smoke test**

Expected: all old compatible checks plus the new parity checks pass.

- [ ] **Step 2: Run targeted browser interactions**

Verify both view switches, both right-click menus, all five settings tabs, four destructive confirmations, source-tree selection, root/child refresh, and information dialogs.

- [ ] **Step 3: Check the exact diff**

Run:

```powershell
git diff --check -- "Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html" "prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md" "prd/【飞书功能点】盖世游戏Mac端-iOS应用与IPA资源库.md"
```

Expected: no whitespace errors and no unrelated files staged.

- [ ] **Step 4: Commit the implementation**

```powershell
git add -- "Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html" "prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md" "prd/【飞书功能点】盖世游戏Mac端-iOS应用与IPA资源库.md" "docs/superpowers/plans/2026-07-21-playcover-feature-parity.md"
git commit -m "feat: align Mac iOS libraries with PlayCover"
```

- [ ] **Step 5: Push and verify GitHub Pages**

```powershell
git push origin master
```

Expected: remote `master` advances and the encoded GitHub Pages URL returns HTTP 200 with the updated smoke test passing.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

Static HTML demo files, no build system. Open any file directly in a browser. Files are deployed via GitHub Pages from the `main` branch.

- `官网改动/index.html` — 盖世游戏 official website (CN/EN bilingual, scroll-animation driven)
- `demos/` — standalone interactive demo pages, each self-contained HTML
- `demos/pc-emulator-demo.html` — PC engine settings demo (primary active demo)
- `demos/storage-demo.html` — storage management demo

After editing a demo, copy it to `demos/` and push to `main` to deploy. The source files live in `c:\Users\z3635\官网改动\储存\demo\` locally.

## pc-emulator-demo.html architecture

### Page layer stack (z-index order)
All layers use `position: absolute; inset: 0` inside `.device-frame`. Showing a layer sets `display: flex`; closing sets `display: none`.

```
main settings (base)
  └─ recommend-page     z:550  推荐方案全屏页
       └─ detail-page   z:600  方案详情（只读）
            └─ edit-page z:610  方案编辑
  └─ trans-args-page    z:700  转译参数（从edit-page进入）
loading-overlay         z:2500 应用方案时的进度遮罩
input/import/publish dialogs z:2000
```

`closeFullPage(id)` only hides the named layer — it does not restore the layer beneath it. The back button on detail-page and edit-page both call `closeFullPage` on themselves only.

### Layout mode (portrait ↔ landscape)
`.device-frame` starts with `.portrait` class (414×850px). `toggleLayout()` toggles the class (896×414px) **and** calls `renderMainContent()`.

- **Portrait**: `#main-content-area` visible, single-column scrolling list of all local-only setting items
- **Landscape**: `#landscape-layout` visible, left nav (`landscapeNavCats = ['通用','Steam','开发者选项','触屏按键']`) + right content panel. Active category stored in `currentLandscapeCat`.

The `兼容性` category is intentionally excluded from the main settings page (shared-only items, shown only in scheme detail/edit views).

### Data model

**`configData`** — array of category objects, each with `items[]`. Each item has:
- `share: true/false` — `false` = local-only (shown on main settings page); `true` = shareable (shown in scheme detail/edit pages)
- `type`: `toggle | select | input | action | link`
- Special `link` items (`trans_args`, `touch_layout`) trigger `handleRowClick(id)` which opens a sub-page or toast

**`listData`** — scheme lists by key: `recommend`, `official`, `mine`, `cloud`. `official` data exists but is not surfaced in any tab after the refactor (tabs are: 推荐 / 我的方案 / 我的云分享).

**State variables:**
- `currentRecTab` — active tab in recommend-page (`'recommend'|'mine'|'cloud'`)
- `currentInUseScheme` — scheme name currently applied; shown with `in-use-tag` badge
- `currentLandscapeCat` — active left-nav category in landscape mode

### Key interaction flows

**Applying a scheme**: card ••• → `openActionModal` → 应用 → `handleAction('应用')` → shows `loading-overlay` with animated progress → on complete: updates `currentInUseScheme`, calls `renderRecContent()`, closes detail-page.

**Creating a scheme**: floating pill ➕ → `openInputDialog('create')` → confirm → `openEditPage(title)` → save → `closeFullPage('edit-page')`.

**Copying a scheme**: ••• → 复制 → `openInputDialog('copy', title)` → confirm → pushes to `listData.mine`, switches rec-page tab to 我的方案.

**Trans args drill-down**: only reachable from edit-page or detail-page when clicking the `trans_args` link row → `openTransArgsPage()` → `trans-args-page` at z:700.

### Known interaction gaps
- `closeFullPage('recommend-page')` does not reset `currentRecTab` or scroll position — re-opening the recommend page resumes previous tab state (intentional for continuity, but worth noting).
- `action-modal` action buttons call `getActionsForCurrentTab()` which reads `currentRecTab` — if the modal is opened from detail-page after tab context changes, the action set may not match the card's origin tab.
- `trans-args-page` has no close/back that returns to edit-page; `closeFullPage('trans-args-page')` returns visually to edit-page only because edit-page is still `display:flex` underneath.
- Search input in recommend-page is UI-only (no filtering logic implemented).
- `doc-badge` elements use `pointer-events: none` so they don't interfere with clicks, but they overlap the header layout at narrow widths.

### Portrait action-modal behaviour
On `.portrait`, `#action-modal` uses `align-items: flex-end` and the `.action-modal` gets `border-radius: 24px 24px 0 0` to create a bottom sheet. On landscape, it's a centered modal. This is CSS-only, driven by `.device-frame.portrait` selectors.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-file HTML demo for the 盖世游戏 (Geek Game) virtual layout editor — a 900×400 px landscape "phone" container that lets users edit, switch, and preview two virtual gamepad layouts.

## File Structure

- `layout-demo.html` — The entire demo: CSS + HTML + JS in one file. Open directly in any browser, no build step needed.
- `index.html` — Separate marketing/landing page for the game product.
- `产品demo设计.txt` — PRD annotation system specification (how to add orange numbered badges + draggable tooltips to UI pages for developer handoff).

## Architecture of layout-demo.html

All logic lives in a single `<script>` block. Key state variables:

| Variable | Purpose |
|---|---|
| `hasSubLayout` | Whether a sub-layout (布局2) has been created |
| `curLayout` | Active layout index: `1` or `2` |
| `editState` | Deep-cloned layout data `{1: {name, btns[]}, 2?: ...}` |
| `swWidget` | The draggable cycle-widget object `{x%, y%, s}` or `null` |
| `undoStack / redoStack` | Operation history for undo/redo |

### Two views inside `.phone`
- `#ed` — Editor view (default active): canvas + toolbar + add panel + selection popover
- `#gm` — Game preview view: static background + controls overlay `#gm-ctrl`

### Button data model
Each button `b` in `editState[n].btns`:
```js
{ id, t: 'c'|'joy'|'r', x: %, y: %, s: px, ic?: iconKey }
```
- `joy` = joystick (large circle with arrows)
- `c` = standard circle button
- `r` = rectangular button (height = s × 0.52)

### Key render functions
- `renderEditor()` — Clears and rebuilds `#ed-canvas` from `editState[curLayout]` + optional `swWidget`
- `renderGame(animate)` — Rebuilds `#gm-ctrl` from `editState[curLayout]`; if `hasSubLayout && swWidget`, appends cycle button
- `updateToolbar()` — Swaps the `#tb-sw-area` between "新建子布局" and "切换+删除" based on `hasSubLayout`

### Sub-layout lifecycle
`createSubLayout()` → sets `hasSubLayout=true`, initialises `editState[2]`, sets `swWidget` to default position → `updateToolbar()` + `renderEditor()`  
`deleteSubLayout()` → resets all state to initial, `curLayout=1`, `swWidget=null` → `updateToolbar()` + `renderEditor()`

### PRD撰写规范
写PRD时必须对照 `prd/PRD自查清单-前端展示易遗漏项.md` 逐条落实涉及的场景，不可遗漏。

### PRD Annotation System
See `产品demo设计.txt` for full spec. Key rules when adding annotations:
- Orange badge: `background: rgb(250,173,20)`, white 10px bold text, `padding:0 4px`, `border-radius:2px`
- Tooltip: `background:#f0efef`, `width:450px`, draggable, close via X only
- Badges must be mounted on `body` (not inside `.phone`) because `.phone` has `overflow:hidden`
- Position via `getBoundingClientRect` after load + on resize

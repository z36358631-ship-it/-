# GameHub APP UI Visual Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the conceptual GameHub APP UI preview with source-accurate representative pages and make 95% visual fidelity a verifiable Skill requirement.

**Architecture:** Keep the thin Skill orchestrator, but add an immutable local visual asset pack, original-resolution page scenes, and a Playwright/Python comparison pipeline. Use cropped source media only for complex artwork; render all reusable UI controls as DOM and expose source/implementation/difference modes in the offline gallery.

**Tech Stack:** HTML/CSS/vanilla JavaScript, Node.js, Playwright Core, Python Pillow/OpenCV/scikit-image when available, PowerShell, Markdown, JSON.

---

## 文件结构

- Modify: `.agents/skills/gamehub-app-ui/SKILL.md` — add mandatory source-first and visual fidelity workflow.
- Create: `.agents/skills/gamehub-app-ui/assets/visual-sources/` — deterministic local crops and reference images for representative pages.
- Create: `.agents/skills/gamehub-app-ui/assets/visual-baselines.json` — source frame, DOM anchors, crop provenance and thresholds.
- Modify: `.agents/skills/gamehub-app-ui/assets/app-demo-template.html` — replace placeholder surfaces with source-accurate scenes and comparison viewer.
- Create: `.agents/skills/gamehub-app-ui/scripts/build-visual-assets.py` — crop and normalize media assets from immutable source screenshots.
- Create: `.agents/skills/gamehub-app-ui/scripts/capture-visuals.mjs` — capture exact-size implementation frames.
- Create: `.agents/skills/gamehub-app-ui/scripts/compare-visuals.py` — produce metrics and difference images.
- Modify: `.agents/skills/gamehub-app-ui/scripts/validate.mjs` — require visual report and 95% threshold.
- Modify: `.agents/skills/gamehub-app-ui/references/usage.md` — document visual generation and debugging.
- Modify: `demos/UI规范/盖世游戏APP-UI模板与页面配方预览.html` — regenerated offline artifact.

### Task 1: Establish the failing visual contract

- [ ] Add `visual-baselines.json` entries for screen-08, 09, 10, 18, 20, 30, 36, 41 and 44 with exact source dimensions and page keys.
- [ ] Extend `validate.mjs` to require `visual-report.json`, per-page source/implementation/difference files and `fidelity >= 0.95`.
- [ ] Run `node .agents/skills/gamehub-app-ui/scripts/validate.mjs visual` and verify it fails because captures do not yet exist.

### Task 2: Build deterministic source assets

- [ ] Implement `build-visual-assets.py` with explicit crop rectangles for Hero, cover, Banner and avatar media.
- [ ] Generate WebP/PNG assets into `assets/visual-sources/` and record source file plus crop rectangle in `visual-baselines.json`.
- [ ] Verify repeated execution produces identical SHA-256 hashes.

### Task 3: Rebuild portrait scenes at 1080×2400

- [ ] Rebuild screen-08 Home, screen-09 Search, screen-10 Detail, screen-18 PC Library, screen-20 EPIC unbound and screen-30 Profile using source-size CSS coordinates.
- [ ] Replace generic placeholder covers and Emoji with cropped media and inline SVG.
- [ ] Keep reusable navigation, search, tabs, game cards, platform account card, empty state, PC engine and bottom actions as DOM.
- [ ] Capture each scene at 1080×2400 and fix visible geometry/text hierarchy deviations.

### Task 4: Rebuild landscape scenes at 2400×1080

- [ ] Rebuild screen-36 Home, screen-41 Library and screen-44 Detail with independent top navigation, information density and controller focus rules.
- [ ] Reuse only data and component contracts from portrait; do not scale portrait DOM.
- [ ] Capture each scene at 2400×1080 and fix visible deviations.

### Task 5: Add source / implementation / difference viewer

- [ ] Add gallery controls for Original, Implementation and Difference.
- [ ] Display the page-level metric, source ID, exact canvas size and crop provenance.
- [ ] Keep gallery chrome separate from the page capture root so comparisons include only the APP canvas.

### Task 6: Calculate visual fidelity

- [ ] Implement same-size normalization, edge/structure, color histogram and SSIM-like scores in `compare-visuals.py`.
- [ ] Mask only known dynamic status-bar values and explicitly documented media-frame regions; never mask reusable UI components.
- [ ] Generate `visual-report.json` and absolute difference PNGs.
- [ ] Continue refinement until all representative pages and critical components pass 0.95 or report an honest failure.

### Task 7: Upgrade the Skill and documentation

- [ ] Require real source assets, original-resolution scenes and visual comparison before a Demo can be called high fidelity.
- [ ] Prohibit gradient placeholders when a source asset exists.
- [ ] Document commands, outputs, thresholds and failure investigation in `usage.md`.
- [ ] Append the new preference and workflow to the image-to-prototype learning log.

### Task 8: Verify and deliver

- [ ] Run source, static, browser and visual validation.
- [ ] Run Skill Creator validation with UTF-8 enabled.
- [ ] Inspect at least one portrait and one landscape source/implementation/difference set at original detail.
- [ ] Commit only task files, post evidence to GUANWANGGAID-29 and return it to `in_review` only after the visual gate passes.

## 验收命令

```powershell
python .agents/skills/gamehub-app-ui/scripts/build-visual-assets.py
node .agents/skills/gamehub-app-ui/scripts/build-preview.mjs
node .agents/skills/gamehub-app-ui/scripts/capture-visuals.mjs
python .agents/skills/gamehub-app-ui/scripts/compare-visuals.py
node .agents/skills/gamehub-app-ui/scripts/validate.mjs all
$env:PYTHONUTF8='1'
python C:/Users/z3635/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/gamehub-app-ui
```

预期新增：

```text
PASS visualAssets
PASS visualCaptures
PASS visualFidelity (all representative pages >= 95%)
```

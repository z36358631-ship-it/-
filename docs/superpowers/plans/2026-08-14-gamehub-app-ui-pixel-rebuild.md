# GameHub APP UI Pixel Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `gamehub-app-ui` into a source-traceable component and page-fact library with strict full-resolution visual validation and an offline preview covering all 45 device screens.

**Architecture:** Separate immutable evidence, reusable DOM components, page recipes, and validation artifacts. Figma component properties drive reusable controls; 45 V6.1.1 screenshots drive page structure. The preview exposes page facts, component implementations, and regression evidence as distinct views.

**Tech Stack:** Markdown, JSON, CSS custom properties, vanilla HTML/CSS/JavaScript, Node.js, Playwright Core, Python Pillow/OpenCV/scikit-image, PowerShell.

---

## File map

- Modify: `.agents/skills/gamehub-app-ui/SKILL.md` — source routing, strict workflow, completion rules.
- Modify: `.agents/skills/gamehub-app-ui/agents/openai.yaml` — UI metadata aligned with rebuilt Skill.
- Create: `.agents/skills/gamehub-app-ui/assets/figma-components.json` — measured component properties and provenance.
- Create: `.agents/skills/gamehub-app-ui/assets/screen-catalog.json` — 45-page facts and recipe mapping.
- Modify: `.agents/skills/gamehub-app-ui/assets/gamehub-app-tokens.css` — measured primitive, semantic, and component tokens.
- Replace: `.agents/skills/gamehub-app-ui/assets/app-demo-template.html` — page-fact browser, component gallery, evidence viewer.
- Replace: `.agents/skills/gamehub-app-ui/assets/visual-baselines.json` — strict page/component regression configuration.
- Modify: `.agents/skills/gamehub-app-ui/references/*.md` — exact component contracts, page facts, usage, validation and conflict policy.
- Modify: `.agents/skills/gamehub-app-ui/scripts/build-preview.mjs` — embed page sources, catalogs and evidence.
- Create: `.agents/skills/gamehub-app-ui/scripts/build-screen-catalog.mjs` — deterministic 45-page catalog generation/check.
- Replace: `.agents/skills/gamehub-app-ui/scripts/compare-visuals.py` — full-resolution metrics, overlays and heatmaps.
- Modify: `.agents/skills/gamehub-app-ui/scripts/capture-visuals.mjs` — exact-size captures and geometry manifests.
- Replace: `.agents/skills/gamehub-app-ui/scripts/validate.mjs` — reject legacy scoring and require honest pass/fail evidence.
- Regenerate: `demos/UI规范/盖世游戏APP-UI模板与页面配方预览.html` — final offline preview.

### Task 1: Lock the strict failing contract

**Files:**
- Modify: `.agents/skills/gamehub-app-ui/scripts/validate.mjs`
- Replace: `.agents/skills/gamehub-app-ui/assets/visual-baselines.json`

- [ ] **Step 1: Add checks that reject the legacy metric**

Require `schemaVersion >= 4`, forbid `GaussianBlur`, forbid short-side downsampling, and require `overlay`, `difference`, `heatmap`, `rgbScore`, `edgeScore`, `structureScore`, `geometryPassed`, and `manualReview` fields.

- [ ] **Step 2: Run the visual validator and confirm failure**

Run:

```powershell
node .agents/skills/gamehub-app-ui/scripts/validate.mjs visual
```

Expected: `FAIL visual report schema is legacy` or another strict-evidence failure before implementation is changed.

- [ ] **Step 3: Commit the contract**

```powershell
git add -- .agents/skills/gamehub-app-ui/scripts/validate.mjs .agents/skills/gamehub-app-ui/assets/visual-baselines.json
git commit -m "test: enforce strict GameHub visual evidence"
```

### Task 2: Build the 45-page fact catalog

**Files:**
- Create: `.agents/skills/gamehub-app-ui/scripts/build-screen-catalog.mjs`
- Create: `.agents/skills/gamehub-app-ui/assets/screen-catalog.json`
- Modify: `.agents/skills/gamehub-app-ui/references/source-registry.md`

- [ ] **Step 1: Generate page facts from the existing source manifest**

The script must map all 45 `screen-*` entries to `title`, `orientation`, `width`, `height`, `family`, `recipe`, `shell`, `status`, `knownIssue`, and `sourcePath`, preserving SHA-256 provenance.

- [ ] **Step 2: Assert complete coverage**

Run:

```powershell
node .agents/skills/gamehub-app-ui/scripts/build-screen-catalog.mjs
node -e "const x=require('./.agents/skills/gamehub-app-ui/assets/screen-catalog.json');if(x.screens.length!==45||x.screens.filter(s=>s.orientation==='portrait').length!==36||x.screens.filter(s=>s.orientation==='landscape').length!==9)process.exit(1)"
```

Expected: exit code `0` and stable JSON on a second build.

- [ ] **Step 3: Commit the catalog**

```powershell
git add -- .agents/skills/gamehub-app-ui/scripts/build-screen-catalog.mjs .agents/skills/gamehub-app-ui/assets/screen-catalog.json .agents/skills/gamehub-app-ui/references/source-registry.md
git commit -m "feat: catalog all GameHub APP screens"
```

### Task 3: Record real component provenance and tokens

**Files:**
- Create: `.agents/skills/gamehub-app-ui/assets/figma-components.json`
- Modify: `.agents/skills/gamehub-app-ui/assets/gamehub-app-tokens.css`
- Modify: `.agents/skills/gamehub-app-ui/references/foundations.md`
- Modify: `.agents/skills/gamehub-app-ui/references/components-core.md`
- Modify: `.agents/skills/gamehub-app-ui/references/components-domain.md`

- [ ] **Step 1: Register component sources**

For every registered component, record `id`, `name`, `sourceType`, `figmaPage`, `nodeOrLayer`, `dimensions`, `radius`, `border`, `fills`, `typography`, `variants`, `states`, `iconSource`, and `confidence`. Use `null` plus `status: "missing-source"` for unavailable properties; do not insert guessed values.

- [ ] **Step 2: Replace generic component tokens**

Remove unverified global values and define explicit portrait/landscape shell, navigation, button, Tab, input, card, dialog, Sheet, platform, account and feedback tokens. Preserve source-specific variants instead of averaging them.

- [ ] **Step 3: Validate references**

Run:

```powershell
node .agents/skills/gamehub-app-ui/scripts/validate.mjs static
```

Expected: component provenance and token-reference checks pass; missing-source components remain visibly incomplete rather than silently passing.

- [ ] **Step 4: Commit component data**

```powershell
git add -- .agents/skills/gamehub-app-ui/assets/figma-components.json .agents/skills/gamehub-app-ui/assets/gamehub-app-tokens.css .agents/skills/gamehub-app-ui/references/foundations.md .agents/skills/gamehub-app-ui/references/components-core.md .agents/skills/gamehub-app-ui/references/components-domain.md
git commit -m "feat: add source-backed GameHub UI components"
```

### Task 4: Replace the misleading preview with three explicit workspaces

**Files:**
- Replace: `.agents/skills/gamehub-app-ui/assets/app-demo-template.html`
- Modify: `.agents/skills/gamehub-app-ui/scripts/build-preview.mjs`
- Regenerate: `demos/UI规范/盖世游戏APP-UI模板与页面配方预览.html`

- [ ] **Step 1: Implement the page-fact browser**

Embed all 45 original screenshots as evidence assets. Provide text search, portrait/landscape filters, page-family filters, previous/next navigation, exact source size, recipe, component list, source path, known issue, and horizontal counterpart. Label this view `页面事实 · 原稿证据` and never `实现`.

- [ ] **Step 2: Implement the component gallery**

Render source-backed DOM examples for Shell, top bar, bottom/top navigation, button, icon button, Tab, Chip, input, dialog, Sheet, menu, feedback, game card, platform badge, platform entry, account card and engine metadata. Add deterministic state controls and stable `data-component-id` attributes.

- [ ] **Step 3: Implement the evidence viewer**

Support `原稿 / 实现 / 50%叠加 / 差异 / 热图` for each registered regression item. Show raw metrics and manual status; never display the invalid legacy score.

- [ ] **Step 4: Build and smoke test**

Run:

```powershell
node .agents/skills/gamehub-app-ui/scripts/build-preview.mjs
node .agents/skills/gamehub-app-ui/scripts/validate.mjs browser
```

Expected: 45 page entries, every component entry interactive, zero page errors, and zero HTTP requests.

- [ ] **Step 5: Commit the preview**

```powershell
git add -- .agents/skills/gamehub-app-ui/assets/app-demo-template.html .agents/skills/gamehub-app-ui/scripts/build-preview.mjs demos/UI规范/盖世游戏APP-UI模板与页面配方预览.html
git commit -m "feat: rebuild GameHub UI evidence gallery"
```

### Task 5: Implement strict full-resolution visual comparison

**Files:**
- Replace: `.agents/skills/gamehub-app-ui/scripts/compare-visuals.py`
- Modify: `.agents/skills/gamehub-app-ui/scripts/capture-visuals.mjs`
- Create: `.tmp/gamehub-app-ui/visual-overlays/**`
- Create: `.tmp/gamehub-app-ui/visual-heatmaps/**`
- Create: `.tmp/gamehub-app-ui/geometry/**`

- [ ] **Step 1: Capture exact-size DOM and geometry**

For every regression target, capture the unscaled root at the source canvas size and write each component bounding box to JSON. Reject coordinate, width or height errors above 2px.

- [ ] **Step 2: Compute independent metrics without blur/downsampling**

Use original-size RGB MAE, edge-map similarity, SSIM, ΔE2000 distribution and geometry checks. Generate a raw absolute difference, 50% alpha overlay and enhanced heatmap.

- [ ] **Step 3: Write honest report schema v4**

Each item must contain all metric values, file paths, automatic pass/fail, manual review state and failure reasons. Passing requires all gates; no weighted average can override a failed gate.

- [ ] **Step 4: Run comparison**

```powershell
node .agents/skills/gamehub-app-ui/scripts/capture-visuals.mjs
python .agents/skills/gamehub-app-ui/scripts/compare-visuals.py
```

Expected: exact-size artifacts are generated. Any visually unmatched implementation exits non-zero and is displayed as `FAIL`.

- [ ] **Step 5: Commit the comparator**

```powershell
git add -- .agents/skills/gamehub-app-ui/scripts/capture-visuals.mjs .agents/skills/gamehub-app-ui/scripts/compare-visuals.py .agents/skills/gamehub-app-ui/assets/visual-report.json
git commit -m "fix: replace GameHub legacy visual scoring"
```

### Task 6: Rewrite Skill workflow and usage

**Files:**
- Modify: `.agents/skills/gamehub-app-ui/SKILL.md`
- Modify: `.agents/skills/gamehub-app-ui/references/conflict-policy.md`
- Modify: `.agents/skills/gamehub-app-ui/references/usage.md`
- Modify: `.agents/skills/gamehub-app-ui/references/forward-tests.md`
- Modify: `.agents/skills/gamehub-app-ui/agents/openai.yaml`

- [ ] **Step 1: Make source-first behavior mandatory**

Require selection of an existing page fact before generating, require measured component variants, prohibit guesses and legacy scores, and require strict evidence before the phrase `高保真` may be used.

- [ ] **Step 2: Document effects and use cases**

List all page families, all reusable components, supported states, portrait/landscape behavior, five regression prompts, preview path, commands, output artifacts and known limits.

- [ ] **Step 3: Regenerate Skill metadata and validate**

Run:

```powershell
python C:/Users/z3635/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py .agents/skills/gamehub-app-ui --interface "display_name=盖世游戏 APP UI" --interface "short_description=依据 Figma 与实机图生成可追溯的高保真 APP Demo" --interface "default_prompt=使用 $gamehub-app-ui，先选择现行页面基准，再以真实组件最小改动生成横竖版 Demo，并输出原稿、实现、叠加和差异证据。"
$env:PYTHONUTF8='1'
python C:/Users/z3635/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/gamehub-app-ui
```

Expected: `Skill is valid!`.

- [ ] **Step 4: Commit Skill documentation**

```powershell
git add -- .agents/skills/gamehub-app-ui/SKILL.md .agents/skills/gamehub-app-ui/references/conflict-policy.md .agents/skills/gamehub-app-ui/references/usage.md .agents/skills/gamehub-app-ui/references/forward-tests.md .agents/skills/gamehub-app-ui/agents/openai.yaml
git commit -m "docs: require source-accurate GameHub UI generation"
```

### Task 7: Run full verification and visual review

**Files:**
- Modify as failures require: only `.agents/skills/gamehub-app-ui/**` and the generated preview.

- [ ] **Step 1: Run the complete pipeline**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .agents/skills/gamehub-app-ui/scripts/build-manifest.ps1
node .agents/skills/gamehub-app-ui/scripts/build-screen-catalog.mjs
python .agents/skills/gamehub-app-ui/scripts/build-visual-assets.py
node .agents/skills/gamehub-app-ui/scripts/build-preview.mjs
node .agents/skills/gamehub-app-ui/scripts/capture-visuals.mjs
python .agents/skills/gamehub-app-ui/scripts/compare-visuals.py
node .agents/skills/gamehub-app-ui/scripts/build-preview.mjs
node .agents/skills/gamehub-app-ui/scripts/validate.mjs all
$env:PYTHONUTF8='1'
python C:/Users/z3635/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/gamehub-app-ui
```

- [ ] **Step 2: Inspect original-resolution evidence**

Open at least one portrait component, one landscape component, one page overlay and one heatmap. Mark `manualReview: pass` only when there is no visible structural, font, icon, spacing, crop or seam error; otherwise leave the target as `FAIL` and report it honestly.

- [ ] **Step 3: Check repository scope**

```powershell
git diff --check -- .agents/skills/gamehub-app-ui demos/UI规范/盖世游戏APP-UI模板与页面配方预览.html docs/superpowers/specs/2026-08-14-gamehub-app-ui-pixel-rebuild-design.md docs/superpowers/plans/2026-08-14-gamehub-app-ui-pixel-rebuild.md
git status --short
```

Expected: no whitespace errors; unrelated dirty-worktree files remain untouched and unstaged.

### Task 8: Taskboard handoff

**Files:**
- No repository file changes.

- [ ] **Step 1: Read the latest issue and comments**

```powershell
taskctl.cmd issue get GUANWANGGAID-29 --json
taskctl.cmd comment list GUANWANGGAID-29 --json
```

- [ ] **Step 2: Post evidence and move to review only after self-verification**

Add a comment listing changed architecture, 45-page coverage, component coverage, preview path, exact validation results, manual review result and remaining failures. Then reread the current version and move the issue from `in_progress` to `in_review` with `--if-version`. Never move it directly to `done`.

- [ ] **Step 3: Open the final preview in Codex**

Open `demos/UI规范/盖世游戏APP-UI模板与页面配方预览.html` in the in-app browser so the user can inspect the delivered Skill without locating the file manually.

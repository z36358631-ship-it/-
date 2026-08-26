# GameHub Game Blind Box Demo and PRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline interactive Android portrait/landscape GameHub game-blind-box demo and a matching executable PRD for GUANWANGGAID-38.

**Architecture:** Use one HTML template as the source of truth, a small build script to inline local GameHub media as data URIs, and a browser test/capture script to verify the current-library modal interaction and create screenshots. The PRD references the same modal states and rules as the demo, while remote Feishu image URLs remain blocked until the user authorizes Git publication.

**Tech Stack:** HTML/CSS/vanilla JavaScript, Node.js 24, playwright-core, PowerShell PRD validators.

---

### Task 1: Persist requirement state and source decisions

**Files:**
- Modify: `prd/workflow-state/GUANWANGGAID-38-game-blind-box.md`
- Create: `prd/workflow-state/GUANWANGGAID-38-game-blind-box.run.json`

- [ ] **Step 1:** Record D-001 through D-014 from the approved design, the `screen-18` and `screen-41` baselines, the cross-platform de-duplication conflict, and authorized deliverables.
- [ ] **Step 2:** Start the atomic workflow with S1-S8 required because this turn changes UI and documentation.
- [ ] **Step 3:** Mark S1-S3 passed with taskboard, design spec, and source registry evidence.

### Task 2: Build the offline interactive Demo

**Files:**
- Create: `demos/首页与探索/游戏盲盒demo.template.html`
- Create: `tools/build-game-blind-box-demo.mjs`
- Generate: `demos/首页与探索/游戏盲盒demo.html`

- [ ] **Step 1:** Implement independent portrait and landscape shells based on the two user-provided current-version screenshots; retain their navigation, shortcut areas, library hierarchy and dark surfaces.
- [ ] **Step 2:** Add the blind-box entry to each direction's existing shortcut area; clicking opens a centered modal over the current library without page navigation.
- [ ] **Step 3:** Implement a deterministic demo candidate pool with installed, instant-play, and uninstalled Steam results; de-duplicate by `gameId`, apply 2× recency weighting, cap the uninstalled group at 30%, and prevent repeats inside one page session.
- [ ] **Step 4:** Implement one fixed modal container: cycle the candidate cover, name and status for about two seconds, then stop on one result; keep only “查看详情/再抽一次” for every result state.
- [ ] **Step 5:** Add controls for orientation, locale, result type, network failure, pool shortage, and reduced motion so reviewers can inspect all required states.
- [ ] **Step 6:** Inline `library-portrait--cover.webp`, `home-portrait--game-a.webp`, `home-portrait--game-b.webp`, and `home-portrait--game-c.webp` as data URIs; assert that the built file contains no HTTP dependency.

### Task 3: Browser-test and capture the current Demo

**Files:**
- Create: `tests/game-blind-box-demo.browser.test.mjs`
- Create: `tools/capture-game-blind-box-demo.mjs`
- Create: `public/prd/game-blind-box/01-library-entry-portrait.png`
- Create: `public/prd/game-blind-box/02-result-portrait.png`
- Create: `public/prd/game-blind-box/03-library-entry-landscape.png`
- Create: `public/prd/game-blind-box/04-result-landscape.png`

- [ ] **Step 1:** Test that an eligible portrait library shows the shortcut entry and that a click opens a modal over the unchanged library.
- [ ] **Step 2:** Test in-container candidate cycling, one-result rendering, no-repeat redraw, fixed actions for installed/uninstalled results, and modal close behavior.
- [ ] **Step 3:** Test that fewer than two candidates hides the entrance, Steam-unbound state shows no login prompt, and network failure supports retry/return.
- [ ] **Step 4:** Test all five locales for overflow and both independent orientation shells for console/page errors.
- [ ] **Step 5:** Capture entry and result screenshots for portrait and landscape at source aspect ratios.

### Task 4: Write the executable PRD from the current Demo

**Files:**
- Create: `prd/ai生成/【Prd】《盖世游戏》游戏盲盒需求.md`

- [ ] **Step 1:** Use the standard/complex `to-prd` template with one C-end three-column detail table and public rule identifiers R-01 through R-09.
- [ ] **Step 2:** Define object, trigger, preconditions, behavior, success, failure/recovery, conflict priority, cross-orientation differences, locale scope, and existing launch-flow reuse.
- [ ] **Step 3:** Define the metric formulas, event table, and matching parameter table, including 24-hour attribution and five-minute effective play.
- [ ] **Step 4:** Add acceptance rows for the main flow, pool boundaries, weighting, repeat prevention, status revalidation, both orientations, and all locales.
- [ ] **Step 5:** In the image cells, name the corresponding current Demo screenshots and mark fixed public Feishu URLs as blocked until Git publication is authorized; do not use local paths as Markdown images.

### Task 5: Validate and reconcile all artifacts

**Files:**
- Modify: `prd/workflow-state/GUANWANGGAID-38-game-blind-box.md`
- Modify: `prd/workflow-state/GUANWANGGAID-38-game-blind-box.run.json`

- [ ] **Step 1:** Run `node --test tests/game-blind-box-demo.browser.test.mjs`; expect all cases to pass.
- [ ] **Step 2:** Run `powershell -ExecutionPolicy Bypass -File scripts/validate-prd-quality.ps1 -Path 'prd/ai生成/【Prd】《盖世游戏》游戏盲盒需求.md'`; expect PASS.
- [ ] **Step 3:** Search the built HTML for `https://`, `http://`, `<iframe`, `<canvas`, and unresolved asset placeholders; expect zero matches.
- [ ] **Step 4:** Open the captured portrait and landscape screenshots at original size for product and visual review; record any strict source-baseline differences honestly.
- [ ] **Step 5:** Mark S4-S8 with actual evidence, update the state card artifact registry, and leave Git/public preview/remote Feishu resources as not executed unless separately authorized.

### Task 6: Refine the entry semantics and modal metadata

**Files:**
- Modify: `demos/首页与探索/游戏盲盒demo.template.html`
- Generate: `demos/首页与探索/游戏盲盒demo.html`
- Modify: `tests/game-blind-box-demo.browser.test.mjs`
- Modify: `docs/superpowers/specs/2026-08-25-gamehub-game-blind-box-design.md`
- Modify: `prd/ai生成/【Prd】《盖世游戏》游戏盲盒需求.md`
- Modify: `prd/workflow-state/GUANWANGGAID-38-game-blind-box.md`
- Modify: `prd/workflow-state/GUANWANGGAID-38-game-blind-box.run.json`

- [ ] **Step 1:** Add failing browser assertions that the blind-box entry is outside the Steam/Epic/import source shortcuts in both orientations.
- [ ] **Step 2:** Add failing browser assertions that drawing and result states contain cover, name, rating and two type tags, but no install state, result count or hit badge.
- [ ] **Step 3:** Move the portrait entry to the “我的游戏” heading and the landscape entry to the selected-game action area; restore the source shortcut groups to three and four items respectively.
- [ ] **Step 4:** Keep the fixed modal and action buttons, but cycle only cover, name, rating and at most two existing game type tags.
- [ ] **Step 5:** Rebuild, run browser tests, recapture all four screenshots, run strict visual comparison, and inspect the source-size images manually.
- [ ] **Step 6:** Append V1.2 to the PRD, record D-018/D-019 in the state card, and reconcile the workflow run with actual evidence.

### Task 7: Use a first-position game card and stabilize the draw animation

**Files:**
- Modify: `demos/首页与探索/游戏盲盒demo.template.html`
- Generate: `demos/首页与探索/游戏盲盒demo.html`
- Modify: `tests/game-blind-box-demo.browser.test.mjs`
- Modify: `docs/superpowers/specs/2026-08-25-gamehub-game-blind-box-design.md`
- Modify: `prd/ai生成/【Prd】《盖世游戏》游戏盲盒需求.md`
- Modify: `prd/workflow-state/GUANWANGGAID-38-game-blind-box.md`
- Modify: `prd/workflow-state/GUANWANGGAID-38-game-blind-box.run.json`

- [ ] **Step 1:** Add failing assertions that the blind-box entry is the first functional card in the portrait game grid and landscape game-card track, but is excluded from the user game count.
- [ ] **Step 2:** Add failing assertions that the page shell, modal shell and slot container keep the same DOM identity while preview games change.
- [ ] **Step 3:** Replace the heading/action-area entry with a distinct blind-box functional card at the first game position in each orientation.
- [ ] **Step 4:** Render the modal once, then update only its cover, name, rating and type tags at a controlled cadence; keep the backdrop, modal frame, header and actions static.
- [ ] **Step 5:** Rebuild, run the browser and PRD validators, recapture the four screenshots, and inspect both orientations at source size.
- [ ] **Step 6:** Append V1.3 to the PRD, record the superseding decisions, reconcile the workflow state, and return the taskboard issue to review.

### Task 8: Align the portrait header, add a cover collage, and accelerate the local draw animation

**Files:**
- Modify: `demos/首页与探索/游戏盲盒demo.template.html`
- Generate: `demos/首页与探索/游戏盲盒demo.html`
- Modify: `tests/game-blind-box-demo.browser.test.mjs`
- Modify: `docs/superpowers/specs/2026-08-25-gamehub-game-blind-box-design.md`
- Modify: `prd/ai生成/【Prd】《盖世游戏》游戏盲盒需求.md`
- Modify: `prd/workflow-state/GUANWANGGAID-38-game-blind-box.md`
- Modify: `prd/workflow-state/GUANWANGGAID-38-game-blind-box.run.json`

- [ ] **Step 1:** Assert that the portrait “我的游戏 + count” copy and all four tools share one vertically aligned row.
- [ ] **Step 2:** Replace the empty blind-box card media with a four-cover collage built from the existing offline game assets, plus a dark overlay and box mark.
- [ ] **Step 3:** Accelerate production cycling from 320ms to 100ms per candidate, shorten the overall draw to about 1.2s, and add local cover/info motion without rebuilding the modal.
- [ ] **Step 4:** Preserve the reduced-motion branch and the fixed page, backdrop, modal frame, title, close button and actions.
- [ ] **Step 5:** Rebuild, run browser and PRD checks, recapture screenshots, compare visuals and inspect both orientations at source size.
- [ ] **Step 6:** Append V1.4, record the layout/animation/collage decisions, reconcile the workflow state and return the issue to review.

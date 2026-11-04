# Homepage Play-first Implementation Plan

**Goal:** Make the existing independent demo homepage lead with returning play and game discovery.

**Architecture:** Append homeplay.js/css after the native-header module, reuse existing console routes and homepage secondary modules, then paint review controls. Embed one official gameplay clip and poster. Preserve the original main demo byte-for-byte.

**Tech Stack:** DOM/CSS/JavaScript, Python packaging, Playwright, isolated Git index.

### Task 1: Scope and media
- [x] Record approved scope and landscape library-first correction in the design.
- [x] Obtain an official Hades gameplay excerpt and record source, crop and SHA.

### Task 2: Existing homepage and routes
- [x] Add `outputs/gamehub-pc-console-20261104/homeplay.js` and `homeplay.css` for profile state, compact continue row, focused game selector, media lifecycle and conditional existing detail/launch routes.
- [x] Update build module lists and embed `assets/homeplay/hades-gameplay.mp4` and poster. Retain Android/iOS and all four shells.
- [x] Extend existing shell/panel with review-only audience buttons. Set initial page to home. Wide navigation starts with game library; portrait order stays unchanged.

### Task 3: Verification and publication
- [x] Extend `verify-revision.cjs` for the new module order and navigation; add `verify-homeplay.cjs` covering profiles, selection, both CTA paths, cancellation, preserved editorial independence, four layouts and media lifecycle.
- [x] Run `python outputs/gamehub-pc-console-20261104/build.py`, then both verification scripts. Review screenshots at original dimensions and fix overlap or clipping.
- [ ] Normal push whitelisted source/demo/assets only, preserve real HEAD/index and original homepage. Check fixed public body against local/Git and execute live interaction checks.
- [ ] Update state card and current workflow evidence with actual results and limitations.

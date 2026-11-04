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
- [x] Normal push whitelisted source/demo/assets only, preserve real HEAD/index and original homepage. Check fixed public body against local/Git and execute live interaction checks.
- [x] Update state card and current workflow evidence with actual results and limitations.

### Task 4: D045 compact cards
- [x] Update the continue row DOM to screenshot-based left artwork / middle metadata / circular play, keeping the original launch action and fixture history.
- [x] Compact homepage feature metadata into three short rows with the action beside them; retain official preview and all device layouts.
- [x] Assert portrait feature height <=215px, continue height <=92px, art-left/play-right geometry, playback and route regressions; inspect four forms.
- [ ] Whitelist ordinary push, verify current fixed public bytes and interactions, and update workflow/state evidence.

### Task 5: D046—047 theme and review placement
- [x] Add `app-dark.css` after home CSS, using community charcoal surfaces across app chrome, homepage/PC cards and internal routes; no new theme selector.
- [x] Put the preview left and controls right in `review.css`; stack preview first on narrow screens.
- [x] Verify dark surface values, left/right desktop and narrow order, all device/profile interactions and source preservation; review final screenshots.
- [ ] Publish to the same fixed address and validate live current-version hashes and interactions.

### Task 6: D048 wide homepage correction
- [x] Remove continue game from landscape/tablet home only; retain portrait/Duo and existing PC behavior.
- [x] Put playable and editorial modules side by side; use scene-overlay information in the wide game card.
- [x] Verify no wide continue, side-by-side geometry and visible CTA; independently review both wide forms and launch/cancel paths.
- [ ] Publish together with compact cards, dark surfaces and right-side controls; verify the final fixed URL.

### Task 7: D049 latest placement
- [x] Restore original controls-left / demo-right desktop CSS and controls-first narrow stacking; retain the approved app changes.
- [ ] Verify final placement, device/profile controls and compact dark homepage, then publish and confirm the fixed URL.

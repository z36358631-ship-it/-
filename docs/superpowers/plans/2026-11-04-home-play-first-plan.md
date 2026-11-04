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
- [x] Whitelist ordinary push, verify current fixed public bytes and interactions, and update workflow/state evidence.

### Task 5: D046—047 theme and review placement
- [x] Add `app-dark.css` after home CSS, using community charcoal surfaces across app chrome, homepage/PC cards and internal routes; no new theme selector.
- [x] Put the preview left and controls right in `review.css`; stack preview first on narrow screens.
- [x] Verify dark surface values, left/right desktop and narrow order, all device/profile interactions and source preservation; review final screenshots.
- [x] Publish to the same fixed address and validate live current-version hashes and interactions. D049 supersedes D047 placement below.

### Task 6: D048 wide homepage correction
- [x] Remove continue game from landscape/tablet home only; retain portrait/Duo and existing PC behavior.
- [x] Put playable and editorial modules side by side; use scene-overlay information in the wide game card.
- [x] Verify no wide continue, side-by-side geometry and visible CTA; independently review both wide forms and launch/cancel paths.
- [x] Publish together with compact cards and dark surfaces; final controls-left placement follows D049. Verify the final fixed URL.

### Task 7: D049 latest placement
- [x] Restore original controls-left / demo-right desktop CSS and controls-first narrow stacking; retain the approved app changes.
- [x] Verify final placement, device/profile controls and compact dark homepage, then publish and confirm the fixed URL. Final commit c5ba65a38ffc0b70550df2124c387c3ac149aa6a; live body matches local/Git; 7 checks and 7 combinations pass with zero JS errors.

### Task 8: D050—051 direct wide cards and back navigation
- [x] In `homeplay.js`, generate a separate two-column/four-card wide module and guard swipe to portrait/Duo only. D053 replaces playable platform and start actions with a single title and whole-card existing detail route; continue keeps Steam and direct play.
- [x] In `homeplay.css`, style compact scene cards with a single name per D053; retain `app-dark.css`, first-row community and no wide continue.
- [x] In `header.js`/`header.css`, remove the two business-more entries, replace subpage back labels with existing SVG and remove duplicate body back controls without changing route handlers.
- [x] Normalize retained section-list entries to title-adjacent right-arrow buttons, keeping dataset actions and accessible names; D054 places calendar arrow after date and removes duplicate icon. Verify actual geometry and original routes.
- [x] Extend `verify-homeplay.cjs` with no wide carousel/gesture, all four card-to-detail actions, new-user and empty states, no business-more, arrow-only headers and working back navigation. Local suite and existing regression each pass 8 groups across 7 combinations; current screenshots reviewed.
- [x] Publish only whitelisted independent-demo files with isolated index and normal push; fixed public bytes match local/Git at 11ea892006abfc8fe205cb395942b96e9464c668. Live 8-group/7-combination suite passes, JS0/one document request. Review/evidence/limitations recorded.

### Task 9: D053 title-only playable cards
- [x] Remove platform, genre, hook and start CTA from every playable card; show each title once and remove duplicate labels in portrait/Duo thumbnail pickers.
- [x] Reuse `homeplay-detail` for a whole-card accessible hit area, keep video pause separate, and suppress click after a portrait swipe. Installed games can launch from existing details, new/unadded games retain the previous restriction.
- [x] Recheck compact cards, all wide cards, media controls, swipe versus open behavior, detail/back/launch/cancel, and current arrow conventions; inspect final screenshots before fixed-address publication.

### Task 10: D054 remove picker and place calendar arrow after date
- [x] Stop generating the thumbnail picker and bottom previous/next controls; preserve portrait/Duo swipe and next-card peek, leaving wide grid static.
- [x] Normalize calendar heading to title, muted month/day, then right arrow; remove duplicate today text and calendar icon while preserving `release-open`.
- [x] Verify no picker in any form, real portrait forward/back swipe without accidental detail opening, title/date/arrow order and original calendar route; current screenshots reviewed and final combined D050–055 published.

### Task 11: D055 one wide module per row
- [x] Override wide homepage layout to one full-width module per row, including separate secondary business modules; use a single four-card playable row and retain community internal banner/text split.
- [x] Verify all eight modules full-width geometry/order, four cards in the same row without horizontal overflow or swipe, preserved portrait/Duo and current D050–054 interactions. Final wide screenshots independently reviewed; combined final version published and checked live.

### Task 12: D056 compatibility label
- [x] Add a cover-only “完美兼容” fixture badge in `homeplay.js` and compact green styling in `homeplay.css`; keep wide names, media source/pause and Duo upper media unobstructed. Unknown/no-results and continue stay unlabelled.
- [x] Run existing homepage suite with badge text/count/cover geometry across seven system/form combinations, inspect portrait/wide/Duo screenshots, then publish to the same fixed URL and verify the live body and interactions.

### Task 13: D057 screenshot status row
- [x] Extract only the four compatibility icons from the supplied crop, embed locally in homeplay.js, remove homepage media-source markup; place status bottom-right, move portrait/Duo pause to top-right and reserve wide title space.
- [x] Update homepage checks for icon loading, source removal, bottom-right geometry and no name/control overlap across seven combinations; inspect current screenshots.
- [ ] Publish to fixed address, verify live body and homepage suite, update state card.

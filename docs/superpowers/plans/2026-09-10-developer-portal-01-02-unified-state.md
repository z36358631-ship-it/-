# Developer Portal 01/02 Unified State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one self-contained developer portal that combines the current 01 account/enterprise-verification experience with the 02 game creation/release workspace and derives every publishing permission from the active 01 account state.

**Architecture:** Both legacy entry files will be generated from one route/runtime/style bundle and will expose the five current P01 routes plus P02-01. New focused runtime modules will normalize account context and derive immutable access capabilities; `app.js`, templates, and the game-profile controller will consume those capabilities instead of checking module IDs or assigning enterprise status.

**Tech Stack:** Vanilla JavaScript, single-file HTML build script, localStorage/sessionStorage/IndexedDB, Node.js `node:test`, Playwright Core, CSS.

---

## File map

- Create `demos/开发者后台一期/src/runtime/publisher-access-policy.js`: normalize enterprise status and derive page capabilities.
- Create `demos/开发者后台一期/src/runtime/publisher-account-context.js`: validate session/handoff data and read/write account-and-game-scoped workspaces.
- Modify `demos/开发者后台一期/src/modules.json`: rename module 02, declare the shared route set and legacy output alias.
- Modify `demos/开发者后台一期/src/routes.json`: give P02-01 the game creation and release meaning.
- Modify `demos/开发者后台一期/build.mjs`: build 01 and 02 with identical routes, scripts and styles; emit the legacy 02 alias.
- Modify `demos/开发者后台一期/src/runtime/app.js`: remove forced enterprise initialization, use shared context, guard routes/actions and refresh permissions.
- Modify `demos/开发者后台一期/src/runtime/templates.js`: hide vendor management and render account-specific game workspace content.
- Modify `demos/开发者后台一期/src/runtime/publisher-game-profile.js`: render and bind the three Tabs with explicit capabilities.
- Modify `demos/开发者后台一期/src/styles/templates.css`: style account restriction/empty-state treatments in the console shell.
- Modify `demos/开发者后台一期/src/styles/publisher-game-profile.css`: style the version and qualification restriction banners and read-only cards.
- Create `tests/developer-backend/publisher-access-policy.test.mjs`: unit-test the six account states.
- Create `tests/developer-backend/publisher-account-context.test.mjs`: unit-test session/handoff validation, migration and data isolation.
- Create `tests/developer-backend/developer-portal-state-matrix.browser.test.mjs`: browser-test 01/02 identity continuity and page permissions.
- Modify `tests/developer-backend/build.test.mjs`, `manifest.test.mjs`, `prd01-current-scope.browser.test.mjs`: assert the unified artifact contract.

### Task 1: Add the account access policy

**Files:**
- Create: `demos/开发者后台一期/src/runtime/publisher-access-policy.js`
- Create: `tests/developer-backend/publisher-access-policy.test.mjs`

- [ ] **Step 1: Write the failing six-state unit test**

Create a VM-based test following `game-qualifications.test.mjs` and assert this matrix:

```js
const cases = [
  ['signed-out', false, 'unsubmitted', false, false, false, false, false],
  ['personal', true, 'unsubmitted', true, true, false, false, false],
  ['pending', true, 'pending', true, true, false, false, false],
  ['rejected', true, 'rejected', true, true, false, false, false],
  ['enterprise', true, 'approved', true, true, true, true, false],
  ['suspended', true, 'delisted', false, false, false, false, true],
];
for (const [name, authenticated, status, canCreate, canEdit, canSubmit, canManage, readOnly] of cases) {
  test(name, () => {
    const access = rules.derive({ authenticated, qualification: { status } });
    assert.equal(access.canCreateGameDraft, canCreate);
    assert.equal(access.canEditReleaseDraft, canEdit);
    assert.equal(access.canSubmitRelease, canSubmit);
    assert.equal(access.canManageGameQualifications, canManage);
    assert.equal(access.isPublisherReadOnly, readOnly);
  });
}
```

- [ ] **Step 2: Run the policy test and verify it fails**

Run: `node --test tests/developer-backend/publisher-access-policy.test.mjs`

Expected: FAIL because `publisher-access-policy.js` does not exist.

- [ ] **Step 3: Implement the policy module**

Expose one immutable result from `window.PublisherAccessPolicy`:

```js
(function register(scope) {
  const known = new Set(['unsubmitted', 'pending', 'rejected', 'approved', 'delisted']);
  const derive = ({ authenticated = false, qualification = {} } = {}) => {
    const qualificationStatus = known.has(qualification.status) ? qualification.status : 'unsubmitted';
    const enterpriseApproved = Boolean(authenticated && qualificationStatus === 'approved');
    const suspended = Boolean(authenticated && qualificationStatus === 'delisted');
    const canPrepare = Boolean(authenticated && !suspended);
    return Object.freeze({
      authenticated: Boolean(authenticated),
      qualificationStatus,
      accountKind: enterpriseApproved ? 'enterprise' : suspended ? 'suspended' : 'personal',
      canCreateGameDraft: canPrepare,
      canEditReleaseDraft: canPrepare,
      canSubmitRelease: enterpriseApproved,
      canViewReleaseHistory: Boolean(authenticated),
      canManageGameQualifications: enterpriseApproved,
      canManageVendor: enterpriseApproved,
      isPublisherReadOnly: suspended,
    });
  };
  scope.PublisherAccessPolicy = { derive };
})(window);
```

- [ ] **Step 4: Run the policy test and verify it passes**

Run: `node --test tests/developer-backend/publisher-access-policy.test.mjs`

Expected: 6 passing tests.

- [ ] **Step 5: Commit the policy**

```bash
git add demos/开发者后台一期/src/runtime/publisher-access-policy.js tests/developer-backend/publisher-access-policy.test.mjs
git commit -m "feat: derive publisher access from enterprise status"
```

### Task 2: Add account-scoped session and workspace storage

**Files:**
- Create: `demos/开发者后台一期/src/runtime/publisher-account-context.js`
- Create: `tests/developer-backend/publisher-account-context.test.mjs`

- [ ] **Step 1: Write failing tests for context validation and isolation**

Test `readHandoff`, `normalizeSession`, `loadWorkspace`, `saveWorkspace` and `clearSession` with in-memory storage. Include these assertions:

```js
const handoff = context.readHandoff(JSON.stringify({
  source: 'gamehub-developer-platform', version: 1, authenticated: true,
  accountKey: 'phone:13800138001', vendorId: 'V-01', activeGameId: 'GAME-A',
  qualificationStatus: 'pending', expiresAt: now + 60_000,
}), now);
assert.equal(handoff.accountKey, 'phone:13800138001');
assert.equal(handoff.qualificationStatus, 'pending');
assert.equal(context.readHandoff('{"expiresAt":0}', now), null);

context.saveWorkspace(storage, 'account-a', 'game-a', { marker: 'A/A' });
context.saveWorkspace(storage, 'account-a', 'game-b', { marker: 'A/B' });
context.saveWorkspace(storage, 'account-b', 'game-a', { marker: 'B/A' });
assert.equal(context.loadWorkspace(storage, 'account-a', 'game-b').marker, 'A/B');
assert.equal(context.loadWorkspace(storage, 'account-b', 'game-a').marker, 'B/A');
```

Also seed `gamehub-developer-publisher-workspace-v1`, migrate it once to the active account/game and assert the legacy key is no longer used for writes.

- [ ] **Step 2: Run the context test and verify it fails**

Run: `node --test tests/developer-backend/publisher-account-context.test.mjs`

Expected: FAIL because the context module does not exist.

- [ ] **Step 3: Implement the context module**

Use versioned keys and account/game nesting:

```js
const SESSION_KEY = 'gamehub-developer-session-v2';
const ACCOUNTS_KEY = 'gamehub-developer-publisher-accounts-v2';
const LEGACY_WORKSPACE_KEY = 'gamehub-developer-publisher-workspace-v1';
const pathFor = (accountKey, gameId) => [String(accountKey || ''), String(gameId || '')];
```

`normalizeSession` must reject missing account keys, unauthenticated data and expired data. `readHandoff` must require `source`, `version`, `authenticated`, `accountKey` and `expiresAt`, accept all five enterprise statuses and return a fresh plain object. `saveWorkspace` must clone its input and never write when account or game is missing. `migrateLegacyWorkspace` must write the legacy object beneath `accounts[accountKey].publisherWorkspaces[gameId]` and remove the legacy key only after the new write succeeds.

- [ ] **Step 4: Run context and policy tests**

Run: `node --test tests/developer-backend/publisher-account-context.test.mjs tests/developer-backend/publisher-access-policy.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Commit context storage**

```bash
git add demos/开发者后台一期/src/runtime/publisher-account-context.js tests/developer-backend/publisher-account-context.test.mjs
git commit -m "feat: isolate publisher state by account and game"
```

### Task 3: Build 01 and 02 as one application bundle

**Files:**
- Modify: `demos/开发者后台一期/src/modules.json`
- Modify: `demos/开发者后台一期/src/routes.json`
- Modify: `demos/开发者后台一期/build.mjs`
- Modify: `tests/developer-backend/build.test.mjs`
- Modify: `tests/developer-backend/manifest.test.mjs`
- Modify: `tests/developer-backend/prd01-current-scope.browser.test.mjs`

- [ ] **Step 1: Change build tests to describe the unified contract**

Assert both formal 01/02 outputs expose this ordered route set:

```js
const unifiedRoutes = ['P01-01', 'P01-03', 'P01-08', 'P01-09', 'P01-10', 'P02-01'];
assert.deepEqual(routeIdsFrom('01-开发者平台与资料demo.html'), unifiedRoutes);
assert.deepEqual(routeIdsFrom('02-游戏创建与发行demo.html'), unifiedRoutes);
assert.equal(
  fs.readFileSync(path.join(demoDir, '02-CDKEY商品与供给demo.html'), 'utf8'),
  fs.readFileSync(path.join(demoDir, '02-游戏创建与发行demo.html'), 'utf8'),
);
```

Update the formal output list to use `02-游戏创建与发行demo.html`; assert the alias separately. Keep the 37-source-route PRD assertion unchanged because the alias and repeated routes are artifact concerns, not new PRD pages.

- [ ] **Step 2: Run the build and manifest tests and verify they fail**

Run: `node --test tests/developer-backend/build.test.mjs tests/developer-backend/manifest.test.mjs`

Expected: FAIL on the old 02 name and the old 5/6 artifact route counts.

- [ ] **Step 3: Declare unified route IDs and the legacy alias**

Set both modules 01 and 02 to the six-route list. Set module 02 to:

```json
{
  "id": "02",
  "name": "游戏创建与发行",
  "description": "创建游戏项目，维护版本发布、发布记录与游戏资质认证。",
  "output": "02-游戏创建与发行demo.html",
  "aliases": ["02-CDKEY商品与供给demo.html"],
  "defaultRoute": "P02-01",
  "routeIds": ["P01-01", "P01-03", "P01-08", "P01-09", "P01-10", "P02-01"]
}
```

Change P02-01 title to `游戏创建、版本发布与资质管理页`.

- [ ] **Step 4: Make the builder resolve explicit cross-module route IDs**

Replace module-ID-only filtering with ordered explicit lookup:

```js
const routesForModule = module => module.routeIds
  ? module.routeIds.map(id => routes.find(route => route.id === id)).filter(Boolean)
  : routes.filter(route => route.moduleId === module.id);
```

For modules 01 and 02, load both sets of publisher styles and scripts plus the new policy/context scripts before `app.js`. After writing the formal output, write the same HTML to every `module.aliases` entry.

- [ ] **Step 5: Run builder tests and verify deterministic output**

Run: `node --test tests/developer-backend/build.test.mjs tests/developer-backend/manifest.test.mjs tests/developer-backend/prd01-current-scope.browser.test.mjs`

Expected: all tests pass; 01, formal 02 and the old 02 alias are self-contained single-script HTML files.

- [ ] **Step 6: Commit the unified build**

```bash
git add demos/开发者后台一期/src/modules.json demos/开发者后台一期/src/routes.json demos/开发者后台一期/build.mjs tests/developer-backend/build.test.mjs tests/developer-backend/manifest.test.mjs tests/developer-backend/prd01-current-scope.browser.test.mjs demos/开发者后台一期/01-开发者平台与资料demo.html demos/开发者后台一期/02-游戏创建与发行demo.html demos/开发者后台一期/02-CDKEY商品与供给demo.html
git commit -m "feat: combine developer account and publishing demos"
```

### Task 4: Restore the real account and guard unified routes

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Create: `tests/developer-backend/developer-portal-state-matrix.browser.test.mjs`

- [ ] **Step 1: Write failing browser tests for entry and state restoration**

Create helpers that seed `gamehub-developer-session-v1` and `gamehub-developer-account-states-v1`, then open both the 01 and 02 formal outputs. Verify:

```js
await page.goto(demoUrl('02-游戏创建与发行demo.html', '/P02-01'));
assert.match(page.url(), /#\/P01-01$/); // no session

await seedAccount(page, { accountKey: 'personal', qualificationStatus: 'unsubmitted' });
await page.goto(demoUrl('02-游戏创建与发行demo.html', '/P02-01'));
assert.equal(await page.locator('[data-publisher-access="personal"]').count(), 1);

await seedAccount(page, { accountKey: 'enterprise', qualificationStatus: 'approved' });
await page.goto(demoUrl('01-开发者平台与资料demo.html', '/P02-01'));
assert.equal(await page.locator('[data-publisher-access="enterprise"]').count(), 1);
```

Add cases for pending, rejected and delisted; assert refresh preserves the same state, logout returns to P01-01 and browser back does not restore protected content.

- [ ] **Step 2: Run the new browser test and verify it fails**

Run: `node --test tests/developer-backend/developer-portal-state-matrix.browser.test.mjs`

Expected: FAIL because 02 still forces `authenticated`, `enterprise` and `approved`.

- [ ] **Step 3: Replace module-ID initialization with route-capability initialization**

Delete the `if (moduleConfig.id === '02')` assignments that force login and enterprise approval. Parse a valid handoff for all qualification states, copy its account/game identifiers into session state, clear `window.name`, and call:

```js
const publisherAccess = () => window.PublisherAccessPolicy.derive({
  authenticated: memory.session.authenticated,
  registration: memory.registration,
  qualification: memory.qualification,
});
```

Initialize P02-01 whenever `routes.some(route => route.id === 'P02-01')`. Restore only the workspace belonging to `memory.session.accountKey` and `activeGameId`; fall back to the game list when no valid game is selected.

- [ ] **Step 4: Fix enterprise status restoration**

Replace progress-based promotion with approved-only promotion:

```js
const restoredRegistration = {
  accountTier: restoredQualification.status === 'approved' ? 'enterprise' : (storedRegistration?.accountTier === 'unselected' ? 'unselected' : 'registered'),
  registeredAt: storedRegistration?.registeredAt || restoredQualification.submittedAt || '',
  consoleTab: storedRegistration?.consoleTab || 'games',
};
```

Keep pending/rejected/delisted as separate qualification states; do not overwrite them with account tier.

- [ ] **Step 5: Guard routes and account transitions**

Apply the route rules independent of `moduleConfig.id`:

```js
if (route.role === 'developer' && route.id !== 'P01-01' && !memory.session.authenticated) {
  route = routes.find(item => item.id === 'P01-01');
}
if (route.id === 'P02-01' && !memory.session.authenticated) {
  route = routes.find(item => item.id === 'P01-01');
}
```

Do not redirect authenticated personal developers away from P02-01. Recompute access after login, logout, enterprise submit/withdraw/review, `focus`, `storage` and valid handoff restore. Persist the last game and section with the account-scoped context module.

- [ ] **Step 6: Run state restoration tests**

Run: `node --test tests/developer-backend/developer-portal-state-matrix.browser.test.mjs tests/developer-backend/prd01-current-scope.browser.test.mjs`

Expected: all entry, refresh, logout and account-state cases pass.

- [ ] **Step 7: Commit state restoration**

```bash
git add demos/开发者后台一期/src/runtime/app.js tests/developer-backend/developer-portal-state-matrix.browser.test.mjs demos/开发者后台一期/*.html
git commit -m "fix: carry developer identity into game publishing"
```

### Task 5: Differentiate the three Tabs and enforce actions

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/templates.js`
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-profile.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/styles/templates.css`
- Modify: `demos/开发者后台一期/src/styles/publisher-game-profile.css`
- Modify: `tests/developer-backend/developer-portal-state-matrix.browser.test.mjs`

- [ ] **Step 1: Extend browser tests with the exact Tab matrix**

For personal, pending and rejected accounts assert:

```js
assert.equal(await page.getByRole('button', { name: '保存草稿', exact: true }).isEnabled(), true);
assert.equal(await page.getByRole('button', { name: '提交发布审核', exact: true }).isDisabled(), true);
await openSection(page, 'versions');
assert.match(await page.locator('[data-personal-release-empty]').innerText(), /提交版本后生成发布记录/);
await openSection(page, 'qualifications');
assert.equal(await page.locator('[data-qualification-editor], input[type="file"]:visible').count(), 0);
```

Assert the banner action text is respectively `申请开发者认证`, `查看认证进度`, `修改认证资料`. For approved enterprise assert no restriction banner, release submit can become enabled when the existing completeness rules pass, qualification upload/manage actions exist and vendor settings is visible. For delisted assert all write/submit/withdraw controls are disabled or absent while history remains visible.

- [ ] **Step 2: Run the Tab matrix test and verify it fails**

Run: `node --test tests/developer-backend/developer-portal-state-matrix.browser.test.mjs`

Expected: FAIL because every account currently receives enterprise UI.

- [ ] **Step 3: Pass access capabilities through render boundaries**

Add `access` to the state passed through `renderPublisherWorkspace`, `renderPublisherGameConsole` and `PublisherGameProfile.render/bind`. Mark the workspace root for testability:

```js
<section data-publisher-access="${e(access.accountKind)}" data-qualification-status="${e(access.qualificationStatus)}">
```

Hide the vendor sidebar section unless `access.canManageVendor`; if qualification is delisted, show a read-only vendor status entry instead of editable settings.

- [ ] **Step 4: Render the personal/pending/rejected restriction banner**

Use a single status map:

```js
const restriction = {
  unsubmitted: ['提交发布审核前，请先完成企业认证', '申请开发者认证'],
  pending: ['企业认证审核中，审核通过后可提交发布审核', '查看认证进度'],
  rejected: ['企业认证未通过，请按审核意见修改', '修改认证资料'],
  delisted: ['企业发行权限已暂停，暂不能新建或提交', '查看资格状态'],
}[access.qualificationStatus];
```

Show it on version release and qualification pages. The action navigates inside the unified HTML to P01-03 while preserving account/game context. A normal page route change scrolls to the document top.

- [ ] **Step 5: Render different version-record and qualification content**

When `!access.canSubmitRelease` and there are no true submissions, render a `data-personal-release-empty` state instead of demo fixture records. Preserve real historical records for pending/rejected/delisted accounts. In the qualification Tab, render requirement cards and existing status read-only when `!access.canManageGameQualifications`; omit upload inputs, editor open actions, submit and withdraw.

Replace the embedded qualification editor in `release-workspace` with a compact effective-version reference:

```js
const qualificationReference = `<section data-release-qualification-reference>
  <h3>资质版本</h3>
  <p>${activeVersion ? `当前引用 ${esc(activeVersion.id)}` : '尚无已生效资质版本'}</p>
  <button type="button" data-profile-section-link="qualifications">前往资质认证</button>
</section>`;
```

- [ ] **Step 6: Enforce capabilities in event handlers**

Before every mutation, check the capability again. At minimum guard add game, save release draft, submit/withdraw release, open/edit/upload/submit/withdraw qualification and vendor editing. Disabled controls are presentation; handlers are the authority:

```js
if (!access.canSubmitRelease) return;
if (!access.canManageGameQualifications) return;
if (!access.canEditReleaseDraft) return;
```

Preserve approved-enterprise validation for required fields and active qualification versions. Do not loosen existing game-material rules.

- [ ] **Step 7: Run focused UI tests**

Run: `node --test tests/developer-backend/developer-portal-state-matrix.browser.test.mjs tests/developer-backend/game-profile-version-records.browser.test.mjs tests/developer-backend/game-profile-qualifications.browser.test.mjs tests/developer-backend/game-profile-release-demo.browser.test.mjs`

Expected: all tests pass at 1440px and 390px with no page errors or root horizontal overflow.

- [ ] **Step 8: Commit the differentiated UI**

```bash
git add demos/开发者后台一期/src/runtime/templates.js demos/开发者后台一期/src/runtime/publisher-game-profile.js demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/src/styles/templates.css demos/开发者后台一期/src/styles/publisher-game-profile.css tests/developer-backend/developer-portal-state-matrix.browser.test.mjs demos/开发者后台一期/*.html
git commit -m "feat: differentiate personal and enterprise publishing"
```

### Task 6: Verify compatibility, language, navigation and global regressions

**Files:**
- Modify: `tests/developer-backend/developer-portal-state-matrix.browser.test.mjs`
- Modify: `tests/developer-backend/platform-console-cdkey.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/runtime/shell.js` only if a remaining cross-file compatibility link exists
- Modify: `demos/开发者后台一期/src/runtime/app.js` only for failures found by the focused tests

- [ ] **Step 1: Add compatibility scenarios**

Test that the formal 02 file and legacy alias render byte-equivalent unified content, and that both 01 and 02 can reach P01-03 and P02-01 using hash navigation without leaving the current file. Replace the obsolete test expecting the old 02 alias to expose four CDKEY tabs with an assertion that paused CDKEY pages are absent from the unified sidebar.

Add these browser assertions:

```js
assert.equal(await page.getByRole('button', { name: '英语', exact: true }).isVisible(), true);
await page.getByRole('button', { name: '英语', exact: true }).click();
assert.equal(await page.getByText('Version release', { exact: true }).isVisible(), true);
await page.getByRole('button', { name: /申请开发者认证|查看认证进度|修改认证资料/ }).click();
assert.match(page.url(), /#\/P01-03/);
assert.equal(await page.evaluate(() => scrollY), 0);
```

Use a local HTTP server fixture to emulate an HTMLPreview-style `<base>` and prove no relative cross-file navigation is used.

- [ ] **Step 2: Run the compatibility tests**

Run: `node --test tests/developer-backend/platform-console-cdkey.browser.test.mjs tests/developer-backend/developer-portal-state-matrix.browser.test.mjs`

Expected: all compatibility, language and scroll assertions pass.

- [ ] **Step 3: Run the complete developer-backend suite**

Run: `node --test tests/developer-backend/*.test.mjs`

Expected: all developer-backend tests pass. Existing paused data-center tests may remain scoped to their own artifacts; no new data-center functionality is expected.

- [ ] **Step 4: Build twice and verify generated artifacts are stable**

Run:

```powershell
node demos/开发者后台一期/build.mjs
$before = (Get-FileHash -Algorithm SHA256 -LiteralPath 'demos/开发者后台一期/02-游戏创建与发行demo.html').Hash
node demos/开发者后台一期/build.mjs
$after = (Get-FileHash -Algorithm SHA256 -LiteralPath 'demos/开发者后台一期/02-游戏创建与发行demo.html').Hash
if ($before -ne $after) { throw 'non-deterministic build' }
```

Expected: no exception and identical SHA-256 hashes.

- [ ] **Step 5: Capture final visual evidence**

Capture 1440×900 screenshots for personal version release, personal qualification requirements, enterprise version release, enterprise qualifications and the unified 01 enterprise-certification page. Capture 390×844 personal and enterprise release pages. Store only these final images under `tests/developer-backend/evidence/developer-portal-state-matrix/`.

- [ ] **Step 6: Review the final diff for unrelated changes**

Run:

```powershell
git status --short -- demos/开发者后台一期 tests/developer-backend docs/superpowers
git diff --check
```

Expected: only files named in this plan and generated evidence are changed; `git diff --check` prints nothing.

- [ ] **Step 7: Commit final verification changes**

```bash
git add demos/开发者后台一期 tests/developer-backend/developer-portal-state-matrix.browser.test.mjs tests/developer-backend/platform-console-cdkey.browser.test.mjs tests/developer-backend/evidence/developer-portal-state-matrix
git commit -m "test: verify unified developer publishing states"
```

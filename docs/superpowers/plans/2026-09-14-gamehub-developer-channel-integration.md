# GameHub Developer Channel Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the approved developer channel-distribution pages into the existing self-contained `开发者平台demo.html`, reached from one game's console and rendered with the original developer-platform design system.

**Architecture:** Keep `P02-01` as the only authenticated developer workspace route. Add a focused `PublisherChannelDistribution` runtime that owns fixtures and rendering for four in-game sections, expose those sections through the existing single-game navigation, and let the current workspace state/router handle switching. `build.mjs` concatenates the new runtime and stylesheet into the same offline HTML; operations, channel API and player redemption outputs remain separate.

**Tech Stack:** Vanilla JavaScript, CSS, existing publisher runtime/components, Node.js build and test runner, Playwright Core with local Chrome or Edge.

---

## File map

### Create

- `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js` — aligned developer fixtures, four-section renderer and event-safe view helpers.
- `demos/开发者后台一期/src/styles/publisher-channel-distribution.css` — channel pages using existing publisher tokens, responsive shell and content-table behavior.
- `tests/developer-backend/publisher-channel-integration.browser.test.mjs` — one-address flow, navigation, interactions, language, offline and viewport regression.
- `tests/developer-backend/evidence/gamehub-key-channel-integrated/` — desktop and mobile review screenshots.

### Modify

- `demos/开发者后台一期/build.mjs` — include the new publisher runtime and stylesheet for modules 01 and 02.
- `demos/开发者后台一期/src/runtime/templates.js` — register four channel sections and delegate their body to `PublisherChannelDistribution`.
- `demos/开发者后台一期/src/runtime/app.js` — accept channel section transitions and bind batch/detail/export interactions.
- `demos/开发者后台一期/src/styles/templates.css` — only if the current single-game navigation needs a group separator; prefer the focused new stylesheet.
- `demos/开发者后台一期/README.md` — document the integrated route and retire the standalone developer file as the final entry.

### Generated output

- `demos/开发者后台一期/开发者平台demo.html`

Do not modify `02-CDKEY商品与供给demo.html` as PRD-13 evidence. Do not merge the operations, API or player pages into the developer HTML.

---

### Task 1: Lock the single-address contract with failing browser tests

**Files:**
- Create: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`
- Test: `demos/开发者后台一期/开发者平台demo.html`

- [ ] **Step 1: Write the failing one-address navigation test**

```js
test('原开发者平台同一地址进入单游戏渠道分销', async () => {
  await page.goto(demoUrl('/P02-01'));
  await page.getByRole('button', { name: /进入星海远征控制台/ }).click();
  await page.getByRole('button', { name: '渠道分销' }).click();
  await page.getByRole('heading', { name: '渠道分销总览' }).waitFor();
  assert.match(page.url(), /开发者平台demo\.html#\/P02-01/);
  assert.equal(await page.locator('body').getByText('盖世游戏开发者平台').count() > 0, true);
});
```

- [ ] **Step 2: Add the failing section and boundary assertions**

```js
for (const [button, heading] of [
  ['Key 批次', 'Key 批次'],
  ['渠道数据', '渠道数据'],
  ['结算汇总', '结算汇总'],
]) {
  await page.getByRole('button', { name: button, exact: true }).click();
  await page.getByRole('heading', { name: heading, exact: true }).waitFor();
}
const body = await page.locator('body').innerText();
for (const token of ['CH-001', 'KP-202609-001', 'APP-7F3A9C', 'USD 16,467.32']) assert.match(body, new RegExp(token.replace('.', '\\.')));
assert.doesNotMatch(await page.content(), /GH26-DEMO-2026-9K2Q|ghs_demo_not_a_real_secret/);
```

- [ ] **Step 3: Run the focused test and verify it fails**

Run:

```powershell
node --test tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: FAIL because the original single-game console has no `渠道分销` section.

- [ ] **Step 4: Commit the failing contract**

```powershell
git add -- tests/developer-backend/publisher-channel-integration.browser.test.mjs
git commit -m "test: define integrated channel distribution flow"
```

---

### Task 2: Add the focused channel-distribution runtime and original-platform styling

**Files:**
- Create: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Create: `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`
- Modify: `demos/开发者后台一期/build.mjs`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: Define the shared developer fixture without secrets**

```js
(() => {
  const fixture = Object.freeze({
    channel:{ id:'CH-001', name:'NovaPlay Store', currency:'USD', status:'合作中' },
    program:{ id:'KP-202609-001', appId:'APP-7F3A9C', sku:'BASE-GLOBAL', quota:5000, used:1640 },
    batch:{ id:'KB-202609-0008', quantity:2000, available:360, exposed:372, redeemed:1268 },
    settlement:{ id:'ST-202609-CH001', sold:1282, refunds:14, chargebacks:0, net:1268, amount:'16,467.32' },
  });
  window.PublisherChannelDistribution = { fixture };
})();
```

The runtime must contain only masked values such as `GH26-••••-••••-9K2Q`; never include the demo plaintext Key or Secret used by the separate API/player outputs.

- [ ] **Step 2: Implement four render functions using existing components**

```js
const sections = {
  'channel-overview': renderOverview,
  'channel-batches': renderBatches,
  'channel-data': renderChannelData,
  'channel-settlement': renderSettlement,
};
const render = ({ section, language, components, icon }) => {
  const selected = sections[section] || renderOverview;
  return `<section class="publisher-channel" data-publisher-channel="${section}">${selected({ language, components, icon, fixture })}</section>`;
};
window.PublisherChannelDistribution = { fixture, render };
```

Each renderer must expose these visible facts:

- Overview: one invited channel, 1,282 sales, 1,268 redemptions, 14 refunds, USD 16,467.32 receivable.
- Batches: generated, available, exposed and redeemed as separate columns; exposed is marked irreversible.
- Channel data: masked Key, allocation, reception, sale and redemption as separate states.
- Settlement: `1,282 - 14 - 0 = 1,268`; distribution or redemption does not create revenue; locked statements use next-period adjustments.

- [ ] **Step 3: Style with the existing publisher tokens**

```css
.publisher-channel{display:grid;gap:20px;color:var(--text-primary)}
.publisher-channel__metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.publisher-channel__card{background:var(--surface-primary);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:20px}
.publisher-channel__table-wrap{max-width:100%;overflow:auto;border:1px solid var(--border-default);border-radius:var(--radius-md)}
@media(max-width:900px){.publisher-channel__metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.publisher-channel__metrics{grid-template-columns:1fr}.publisher-channel__card{padding:16px}}
```

Use only variables already defined by `tokens.css`; if a variable is absent, map it once in `.publisher-channel` instead of introducing a second palette.

- [ ] **Step 4: Include the files in `build.mjs`**

```js
const publisherStyleFiles = [
  // existing entries
  'publisher-channel-distribution.css',
];
const publisherRuntimeFiles = [
  // existing entries
  'publisher-channel-distribution.js',
];
```

Load `publisher-channel-distribution.js` before `templates.js` consumes it at render time; the generated HTML must remain a classic single script with no remote dependency.

- [ ] **Step 5: Build and run syntax checks**

Run:

```powershell
node --check demos/开发者后台一期/src/runtime/publisher-channel-distribution.js
node demos/开发者后台一期/build.mjs --module=02
```

Expected: both commands exit 0 and rebuild `开发者平台demo.html` plus existing compatibility aliases.

- [ ] **Step 6: Commit the focused runtime**

```powershell
git add -- demos/开发者后台一期/src/runtime/publisher-channel-distribution.js demos/开发者后台一期/src/styles/publisher-channel-distribution.css demos/开发者后台一期/build.mjs
git commit -m "feat: add publisher channel distribution module"
```

---

### Task 3: Integrate the four sections into the existing single-game console

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/templates.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: Add four sections to the existing game navigation**

Extend `publisherGameConsoleSections` with one group after existing release/store/service entries:

```js
['channel-overview', '渠道分销', 'key', '渠道 授权 计划 销售 兑换 结算'],
['channel-batches', 'Key 批次', 'key', 'Key 批次 额度 状态 有效期'],
['channel-data', '渠道数据', 'chart', '渠道 SKU 地区 销售 兑换 退款'],
['channel-settlement', '结算汇总', 'finance', '月结 应收 退款 拒付 调整'],
```

Render a single `发行与供给` group label before `channel-overview`. The first item is the business entry; the three following items are its direct child pages in the same navigation, not new platform-level tabs.

- [ ] **Step 2: Delegate channel bodies to the focused runtime**

```js
const channelSections = new Set(['channel-overview','channel-batches','channel-data','channel-settlement']);
const detail = channelSections.has(gameSection) && window.PublisherChannelDistribution
  ? window.PublisherChannelDistribution.render({
      section:gameSection,
      language,
      components:c,
      icon,
      game,
      access,
    })
  : gameSection === 'analytics'
    ? renderPublisherData(state, language, access, game)
    : profileComponent
      ? profileComponent.render(publicationDraft, language, { section:gameSection, game, access, demoReleaseStatus:demoState.releaseStatus || '' })
      : renderPublisherReleaseProfile(game);
```

- [ ] **Step 3: Accept channel section transitions in the existing state handler**

```js
if (route.id === 'P02-01' && action === 'game-console-section') {
  const requested = event.currentTarget.dataset.gameSection || 'release-workspace';
  const allowed = new Set(['release-workspace','versions','qualifications','analytics','channel-overview','channel-batches','channel-data','channel-settlement']);
  if (!allowed.has(requested)) return;
  updatePublisherWorkspace({ workspaceView:'game', gameSection:requested, gameTab:requested });
  return;
}
```

Do not create a new public route ID. Keeping `P02-01` preserves login, account isolation and the one-address requirement.

- [ ] **Step 4: Bind only required channel actions**

```js
if (route.id === 'P02-01' && action === 'channel-export') {
  resultMessage(route.id, '数据已导出', '已按当前渠道、SKU、地区和月份生成脱敏数据。', 'success');
  return;
}
if (route.id === 'P02-01' && action === 'channel-batch-detail') {
  updatePublisherWorkspace({ channelDialog:'batch-detail' }, { preserveScroll:true });
  return;
}
if (route.id === 'P02-01' && action === 'channel-dialog-close') {
  updatePublisherWorkspace({ channelDialog:'' }, { preserveScroll:true });
  return;
}
```

The detail dialog must display batch counts and the irreversible-exposure rule. Do not add approval, plaintext export or channel-management actions to the developer side.

- [ ] **Step 5: Build and run the focused browser test**

Run:

```powershell
node demos/开发者后台一期/build.mjs --module=02
node --test tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: PASS for same-address navigation, four sections, masked data, interactions and responsive widths.

- [ ] **Step 6: Commit the integration**

```powershell
git add -- demos/开发者后台一期/src/runtime/templates.js demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/开发者平台demo.html tests/developer-backend/publisher-channel-integration.browser.test.mjs
git commit -m "feat: integrate channel distribution into developer console"
```

---

### Task 4: Run regression, visual review and publish the local address

**Files:**
- Modify: `demos/开发者后台一期/README.md`
- Create: `tests/developer-backend/evidence/gamehub-key-channel-integrated/*.png`
- Test: existing developer backend browser tests

- [ ] **Step 1: Add responsive, language and network assertions**

```js
for (const width of [320,390,1280,1440]) {
  await page.setViewportSize({ width, height:width < 500 ? 844 : 900 });
  await page.goto(demoUrl('/P02-01'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
}
assert.equal(remoteRequests.length, 0);
await page.goto(demoUrl('/P02-01', 'lang=en'));
await page.getByRole('button', { name:'Channel distribution' }).waitFor();
```

- [ ] **Step 2: Run existing high-risk regression suites**

Run:

```powershell
node --test tests/developer-backend/build.test.mjs tests/developer-backend/prd01-current-scope.browser.test.mjs tests/developer-backend/publisher-vendor-settings.browser.test.mjs tests/developer-backend/publisher-data-dashboard.browser.test.mjs tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: all tests PASS; original login, qualification, game management, vendor settings and data dashboard remain available.

- [ ] **Step 3: Capture visual evidence**

Capture at least:

- `channel-overview-1440.png`
- `channel-batches-1280.png`
- `channel-data-390.png`
- `channel-settlement-1440.png`

Review the images at original size for duplicated shells, inconsistent colors, clipped navigation, table overflow, masked-value wrapping and hidden primary actions. Fix any must-fix defect before proceeding.

- [ ] **Step 4: Update README and verify the local URL**

Document that `开发者平台demo.html#/P01-01` remains the single entry and channel distribution is reached after login through a game console. Start the existing local static server and require HTTP 200 for:

```text
http://127.0.0.1:57679/demos/开发者后台一期/开发者平台demo.html#/P01-01
```

- [ ] **Step 5: Commit evidence and documentation**

```powershell
git add -- demos/开发者后台一期/README.md tests/developer-backend/evidence/gamehub-key-channel-integrated
git commit -m "docs: verify integrated channel distribution demo"
```

---

## Completion checklist

- [ ] One HTML address contains the original developer journey and the four channel sections.
- [ ] Channel distribution lives inside a selected game's console under `发行与供给`.
- [ ] Existing developer platform components, colors, spacing, language and responsive behavior are reused.
- [ ] Login and publisher access rules still guard the channel pages.
- [ ] No external requests, iframe, second shell or plaintext Key/Secret exists in the developer output.
- [ ] Business facts match the operations, API and player demos.
- [ ] Existing developer-platform regression suites and the new focused test pass.
- [ ] Desktop and mobile screenshots pass original-size visual review.

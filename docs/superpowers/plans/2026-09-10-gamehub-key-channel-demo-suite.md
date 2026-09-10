# GameHub Key Channel Demo Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four offline, self-contained HTML demos for developer management, platform operations, channel API integration, and player redemption under the approved GameHub Key consignment model.

**Architecture:** Keep PRD-13 separate from the existing dual-Key module. A shared fixture/model/shell package supplies the same channel, contract, Program, Batch, Key, sale, refund, redemption, entitlement, and statement facts to four independent demo apps. `build-next.mjs` concatenates shared CSS/runtime and app-specific files into four HTML outputs that run directly from `file://` without network requests.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js build scripts, Node test runner, Playwright Core with local Chrome/Edge.

---

## File map

### Create

- `demos/开发者后台一期/src/demo13-shared/model.js` — states, event reducer, totals, validation, immutable sample transitions.
- `demos/开发者后台一期/src/demo13-shared/fixtures.js` — aligned fixtures used by all four apps; contains masked demo keys only.
- `demos/开发者后台一期/src/demo13-shared/shell.js` — escaping, icons, navigation, modal, toast, scenario switcher, hash router.
- `demos/开发者后台一期/src/demo13-shared/styles.css` — shared desktop/mobile shell and component styles.
- `demos/开发者后台一期/src/demo13-developer/app.js` — developer overview, batches, channel data, settlement summary.
- `demos/开发者后台一期/src/demo13-developer/styles.css` — developer-only layout.
- `demos/开发者后台一期/src/demo13-operations/app.js` — channels, contract snapshots, Programs, approvals, batches, reconciliation, incidents.
- `demos/开发者后台一期/src/demo13-operations/styles.css` — operations-only layout.
- `demos/开发者后台一期/src/demo13-channel/app.js` — allocation, query, confirm, sale, refund, chargeback API simulator.
- `demos/开发者后台一期/src/demo13-channel/styles.css` — request/response and event timeline layout.
- `demos/开发者后台一期/src/demo13-redeem/app.js` — player login context, Key redemption, success and failure states.
- `demos/开发者后台一期/src/demo13-redeem/styles.css` — responsive player redemption layout.
- `tests/developer-backend/gamehub-key-channel-model.test.mjs` — pure model and rule tests.
- `tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs` — four-output interaction, responsive, accessibility and network tests.
- `tests/developer-backend/capture-gamehub-key-channel-demo.mjs` — approved evidence screenshots.

### Modify

- `demos/开发者后台一期/build-next.mjs` — add four module-13 outputs and prepend shared demo13 runtime/CSS.
- `demos/开发者后台一期/README.md` — document the four demos, routes, scope and commands.
- `tests/developer-backend/build.test.mjs` — assert the four outputs are self-contained and contain no remote dependency.

### Generated outputs

- `demos/开发者后台一期/13-开发者渠道分销demo.html`
- `demos/开发者后台一期/13-平台运营渠道分销demo.html`
- `demos/开发者后台一期/13-渠道接口联调demo.html`
- `demos/开发者后台一期/13-玩家Key兑换demo.html`

Existing `02-CDKEY商品与供给demo.html` remains unchanged during this implementation. It contains the older dual-Key concept and must not be presented as PRD-13 evidence.

---

### Task 1: Lock the shared domain model with failing tests

**Files:**
- Create: `tests/developer-backend/gamehub-key-channel-model.test.mjs`
- Create: `demos/开发者后台一期/src/demo13-shared/model.js`

- [ ] **Step 1: Write the failing model tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

await import(pathToFileURL(path.resolve('demos/开发者后台一期/src/demo13-shared/model.js')));
const model = globalThis.GameHubKeyModel;

test('only sale_confirmed creates receivable quantity', () => {
  const result = model.deriveStatement([
    { id:'e1', type:'allocated', quantity:1 },
    { id:'e2', type:'delivery_confirmed', quantity:1 },
    { id:'e3', type:'sale_confirmed', quantity:1, unitPriceMinor:1299 },
    { id:'e4', type:'redeemed', quantity:1 },
  ]);
  assert.deepEqual(result, { sold:1, refunded:0, chargeback:0, net:1, amountMinor:1299 });
});

test('refund and chargeback cannot both reduce the same sale', () => {
  const events = [
    { id:'s1', type:'sale_confirmed', quantity:1, unitPriceMinor:1299 },
    { id:'r1', type:'refund_confirmed', originalEventId:'s1', quantity:1 },
    { id:'c1', type:'chargeback_lost', originalEventId:'s1', quantity:1 },
  ];
  assert.throws(() => model.deriveStatement(events), /DUPLICATE_NEGATIVE_ADJUSTMENT/);
});

test('exposed keys never return to available', () => {
  assert.throws(() => model.transitionKey('exposed', 'available'), /ILLEGAL_KEY_TRANSITION/);
  assert.equal(model.transitionKey('exposed', 'voided'), 'voided');
});

test('same channel order cannot receive two allocations', () => {
  const state = model.allocate(model.createState(), {
    channelId:'CH-001', requestId:'REQ-1', channelOrderRef:'ORDER-1', fulfillmentSeq:1,
  });
  assert.throws(() => model.allocate(state, {
    channelId:'CH-001', requestId:'REQ-2', channelOrderRef:'ORDER-1', fulfillmentSeq:1,
  }), /CHANNEL_ORDER_ALREADY_ALLOCATED/);
});

test('same request id with changed content is rejected', () => {
  const state = model.allocate(model.createState(), {
    channelId:'CH-001', requestId:'REQ-1', channelOrderRef:'ORDER-1', fulfillmentSeq:1,
  });
  assert.throws(() => model.allocate(state, {
    channelId:'CH-001', requestId:'REQ-1', channelOrderRef:'ORDER-2', fulfillmentSeq:1,
  }), /IDEMPOTENCY_CONFLICT/);
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```powershell
node --test tests/developer-backend/gamehub-key-channel-model.test.mjs
```

Expected: FAIL because `model.js` or `globalThis.GameHubKeyModel` does not exist.

- [ ] **Step 3: Implement the minimal shared model**

```js
(() => {
  const keyTransitions = {
    available: new Set(['allocation_pending','exposed','expired','voided']),
    allocation_pending: new Set(['exposed','expired','voided']),
    exposed: new Set(['redeemed','expired','voided']),
    redeemed: new Set(), expired: new Set(), voided: new Set(),
  };
  const transitionKey = (from, to) => {
    if (!keyTransitions[from]?.has(to)) throw new Error('ILLEGAL_KEY_TRANSITION');
    return to;
  };
  const createState = () => ({ allocations:[] });
  const allocate = (state, input) => {
    const existingRequest = state.allocations.find(item =>
      item.channelId === input.channelId && item.requestId === input.requestId);
    if (existingRequest) {
      const sameBusiness = existingRequest.channelOrderRef === input.channelOrderRef
        && existingRequest.fulfillmentSeq === input.fulfillmentSeq;
      if (!sameBusiness) throw new Error('IDEMPOTENCY_CONFLICT');
      return state;
    }
    const existingOrder = state.allocations.find(item =>
      item.channelId === input.channelId &&
      item.channelOrderRef === input.channelOrderRef &&
      item.fulfillmentSeq === input.fulfillmentSeq);
    if (existingOrder && existingOrder.requestId !== input.requestId) {
      throw new Error('CHANNEL_ORDER_ALREADY_ALLOCATED');
    }
    return { ...state, allocations:[...state.allocations, { ...input, allocationId:`AL-${state.allocations.length + 1}` }] };
  };
  const deriveStatement = events => {
    const sales = events.filter(item => item.type === 'sale_confirmed');
    const negativeBySale = new Map();
    for (const event of events.filter(item => ['refund_confirmed','chargeback_lost'].includes(item.type))) {
      if (negativeBySale.has(event.originalEventId)) throw new Error('DUPLICATE_NEGATIVE_ADJUSTMENT');
      negativeBySale.set(event.originalEventId, event.type);
    }
    const negatives = events.filter(item => ['refund_confirmed','chargeback_lost'].includes(item.type));
    const refunded = negatives.filter(item => item.type === 'refund_confirmed').reduce((sum, item) => sum + item.quantity, 0);
    const chargeback = negatives.filter(item => item.type === 'chargeback_lost').reduce((sum, item) => sum + item.quantity, 0);
    const sold = sales.reduce((sum, item) => sum + item.quantity, 0);
    const amountMinor = sales.reduce((sum, sale) => sum + sale.quantity * sale.unitPriceMinor, 0)
      - negatives.reduce((sum, negative) => {
          const sale = sales.find(item => item.id === negative.originalEventId);
          return sum + (sale ? negative.quantity * sale.unitPriceMinor : 0);
        }, 0);
    return { sold, refunded, chargeback, net:sold-refunded-chargeback, amountMinor };
  };
  globalThis.GameHubKeyModel = { transitionKey, createState, allocate, deriveStatement };
})();
```

- [ ] **Step 4: Run the tests and verify they pass**

Run the Step 2 command. Expected: 5 tests PASS.

- [ ] **Step 5: Commit the model and tests**

```powershell
git add -- demos/开发者后台一期/src/demo13-shared/model.js tests/developer-backend/gamehub-key-channel-model.test.mjs
git commit -m "test: lock GameHub key channel rules"
```

---

### Task 2: Add aligned fixtures and shared offline shell

**Files:**
- Create: `demos/开发者后台一期/src/demo13-shared/fixtures.js`
- Create: `demos/开发者后台一期/src/demo13-shared/shell.js`
- Create: `demos/开发者后台一期/src/demo13-shared/styles.css`
- Modify: `tests/developer-backend/gamehub-key-channel-model.test.mjs`

- [ ] **Step 1: Add a failing fixture contract test**

```js
await import(pathToFileURL(path.resolve('demos/开发者后台一期/src/demo13-shared/fixtures.js')));
const fx = globalThis.GameHubKeyFixtures;
test('all four surfaces share the same identifiers and masked data', () => {
  assert.equal(fx.channel.channelId, 'CH-GLOBAL-001');
  assert.equal(fx.program.contractSnapshotId, fx.contract.snapshotId);
  assert.equal(fx.program.skuId, fx.product.skuId);
  assert.equal(fx.key.masked, 'GHK-9F3A-****-7C21');
  assert.equal(JSON.stringify(fx).includes('GHK-9F3A-REAL'), false);
});
```

- [ ] **Step 2: Run the model test and verify the new case fails**

Run the Task 1 test command. Expected: FAIL because fixtures are absent.

- [ ] **Step 3: Implement fixtures with one consistent scenario**

Define and freeze these exact records in `fixtures.js`:

```js
globalThis.GameHubKeyFixtures = Object.freeze({
  channel:{ channelId:'CH-GLOBAL-001', name:'NovaPlay Global', region:'新加坡', status:'合作中', currency:'USD' },
  contract:{ snapshotId:'CTR-SNAP-20260910-01', version:'V1.0', validFrom:'2026-09-10', validTo:'2027-09-09', unitPriceMinor:1299 },
  product:{ appId:'APP-48291', productId:'PROD-STAR-01', skuId:'SKU-STAR-STD', name:'星海远征 标准版' },
  program:{ programId:'GHP-20260910-01', contractSnapshotId:'CTR-SNAP-20260910-01', skuId:'SKU-STAR-STD', totalQuota:5000, usedQuota:1260, status:'生效' },
  batch:{ batchId:'GHB-20260910-01', deliveryMode:'channel_api', generated:1000, available:640, pending:12, exposed:268, redeemed:72, expired:4, voided:4 },
  key:{ keyId:'KEY-000072', masked:'GHK-9F3A-****-7C21', status:'redeemed' },
  allocation:{ allocationId:'AL-000072', requestId:'REQ-NOVA-000072', channelOrderRef:'NP-ORDER-88201', status:'confirmed' },
  sale:{ eventId:'SALE-000072', type:'sale_confirmed', unitPriceMinor:1299, currency:'USD' },
  redemption:{ redemptionId:'RDM-000072', status:'succeeded', accountMasked:'GH***91' },
  entitlement:{ entitlementId:'ENT-000072', status:'active' },
  statement:{ statementId:'STM-202609', period:'2026-09', status:'待确认' },
});
```

The batch values must satisfy `1000 = 640 + 12 + 268 + 72 + 4 + 4`.

- [ ] **Step 4: Implement the shared shell**

Create helpers with these stable attributes:

```js
globalThis.GameHubKeyShell = (() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const route = fallback => decodeURIComponent(location.hash.replace(/^#\/?/, '').split('?')[0] || fallback);
  const go = path => { location.hash = `#/${path}`; };
  const status = (label, tone='neutral') => `<span class="status status--${tone}">${escapeHtml(label)}</span>`;
  const money = minor => `$${(Number(minor) / 100).toFixed(2)}`;
  const modal = ({ title, body, confirmAction, confirmLabel='确认' }) => `<div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><div class="modal__card"><h2>${escapeHtml(title)}</h2>${body}<footer><button data-action="close-modal">取消</button><button class="primary" data-action="${confirmAction}">${escapeHtml(confirmLabel)}</button></footer></div></div>`;
  return { escapeHtml, route, go, status, money, modal };
})();
```

Create a light GameHub admin shell in `styles.css`: 64px top bar, 224px desktop sidebar, max-width 1440px content, white cards, `#ff6b35` primary, `#f5f7fa` canvas, 8/12/16/24/32px spacing scale, visible focus ring, and a 390px breakpoint that converts the sidebar to a horizontal overflow nav without root overflow.

- [ ] **Step 5: Run tests and syntax checks**

```powershell
node --check demos/开发者后台一期/src/demo13-shared/model.js
node --check demos/开发者后台一期/src/demo13-shared/fixtures.js
node --check demos/开发者后台一期/src/demo13-shared/shell.js
node --test tests/developer-backend/gamehub-key-channel-model.test.mjs
```

Expected: all syntax checks exit 0; all model tests PASS.

- [ ] **Step 6: Commit shared demo infrastructure**

```powershell
git add -- demos/开发者后台一期/src/demo13-shared tests/developer-backend/gamehub-key-channel-model.test.mjs
git commit -m "feat: add shared GameHub key demo model"
```

---

### Task 3: Generate four self-contained HTML outputs

**Files:**
- Modify: `demos/开发者后台一期/build-next.mjs`
- Modify: `tests/developer-backend/build.test.mjs`
- Create: eight minimal app/style files listed in the file map; each app initially renders its title and route nav.

- [ ] **Step 1: Add failing build assertions**

```js
for (const file of [
  '13-开发者渠道分销demo.html',
  '13-平台运营渠道分销demo.html',
  '13-渠道接口联调demo.html',
  '13-玩家Key兑换demo.html',
]) {
  const html = fs.readFileSync(path.join(demoDir, file), 'utf8');
  assert.match(html, /GameHubKeyModel/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|https?:\/\//i);
}
```

- [ ] **Step 2: Run the build test and verify it fails**

```powershell
node --test tests/developer-backend/build.test.mjs
```

Expected: FAIL because the four outputs do not exist.

- [ ] **Step 3: Extend `build-next.mjs`**

Add four module records:

```js
const demo13 = { sharedCss:read('demo13-shared','styles.css'), sharedRuntime:[read('demo13-shared','model.js'), read('demo13-shared','fixtures.js'), read('demo13-shared','shell.js')].join('\n\n') };
modules.push(
  { source:'demo13-developer', output:'13-开发者渠道分销demo.html', title:'开发者渠道分销', demo13:true },
  { source:'demo13-operations', output:'13-平台运营渠道分销demo.html', title:'平台运营渠道分销', demo13:true },
  { source:'demo13-channel', output:'13-渠道接口联调demo.html', title:'渠道接口联调', demo13:true },
  { source:'demo13-redeem', output:'13-玩家Key兑换demo.html', title:'盖世 Key 兑换', demo13:true },
);
```

Inside the module loop, use:

```js
const css = module.demo13
  ? `${sharedCss}\n\n${demo13.sharedCss}\n\n${read(module.source, 'styles.css')}`
  : `${sharedCss}\n\n${read(module.source, 'styles.css')}`;
const runtime = module.demo13
  ? `${sharedRuntime}\n\n${demo13.sharedRuntime}\n\n${read(module.source, 'app.js')}`
  : `${sharedRuntime}\n\n${read(module.source, 'app.js')}`;
```

- [ ] **Step 4: Add minimal accessible roots to each app**

Each app must render into `#app`, contain one `<h1>`, a role-specific `<nav aria-label="主导航">`, and a route fallback. Do not add business interactions in this task.

- [ ] **Step 5: Build and run assertions**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/build.test.mjs
```

Expected: four `Built 13-...` lines; build tests PASS.

- [ ] **Step 6: Commit the builder and four shells**

```powershell
git add -- demos/开发者后台一期/build-next.mjs demos/开发者后台一期/src/demo13-* demos/开发者后台一期/13-* tests/developer-backend/build.test.mjs
git commit -m "feat: scaffold GameHub key demo suite"
```

---

### Task 4: Implement the developer channel distribution demo

**Files:**
- Modify: `demos/开发者后台一期/src/demo13-developer/app.js`
- Modify: `demos/开发者后台一期/src/demo13-developer/styles.css`
- Create: `tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs`

- [ ] **Step 1: Add failing developer-flow browser test**

```js
test('developer demo separates quota, sales, redemption and settlement facts', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await page.goto(demoUrl('13-开发者渠道分销demo.html', '/overview'));
  for (const label of ['授权额度','已向渠道交付','渠道已售','玩家已兑换','待结算金额']) {
    assert.equal(await page.getByText(label, { exact:true }).isVisible(), true);
  }
  await page.getByRole('link', { name:'Key 批次' }).click();
  assert.match(await page.locator('main').innerText(), /批次 ID|交付方式|不可回库/);
  await page.getByRole('link', { name:'渠道数据' }).click();
  assert.match(await page.locator('main').innerText(), /销售回传完整率|兑换率|退款/);
  await page.getByRole('link', { name:'结算概览' }).click();
  assert.match(await page.locator('main').innerText(), /实际售出|下期调整|待确认/);
  await page.close();
});
```

- [ ] **Step 2: Run the browser test and verify it fails**

```powershell
node --test tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs
```

Expected: FAIL because the business pages are not implemented.

- [ ] **Step 3: Implement routes and content**

Use routes `overview`, `batches`, `channel-data`, `settlement`. The overview must show five separate metrics and this fixed explanation:

```js
const metrics = [
  ['授权额度','5,000'], ['已向渠道交付','280'], ['渠道已售','246'],
  ['玩家已兑换','72'], ['待结算金额','$3,104.61'],
];
```

The batch page shows masked IDs, delivery mode, quantity equation and “已向渠道暴露的 Key 不可回库”；channel data shows sale callback completeness, redemption, refund and anomaly counts; settlement shows unit price, sold quantity, refunds, prior adjustments and net amount. Developer actions are limited to viewing, exporting masked aggregates and requesting a new batch within the Program quota.

- [ ] **Step 4: Add developer scenarios**

Scenario buttons must switch between `正常`, `额度不足`, `渠道暂停`, `对账差异`. Each scenario updates metrics and the top status banner without changing the underlying role or exposing Key plaintext.

- [ ] **Step 5: Build and verify**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs --test-name-pattern="developer demo"
```

Expected: developer test PASS; no console errors; no remote requests.

- [ ] **Step 6: Commit the developer demo**

```powershell
git add -- demos/开发者后台一期/src/demo13-developer demos/开发者后台一期/13-开发者渠道分销demo.html tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs
git commit -m "feat: add developer channel distribution demo"
```

---

### Task 5: Implement platform operations channels and contract snapshots

**Files:**
- Modify: `demos/开发者后台一期/src/demo13-operations/app.js`
- Modify: `demos/开发者后台一期/src/demo13-operations/styles.css`
- Modify: `tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs`

- [ ] **Step 1: Add failing channel-management test**

```js
test('operations demo records an immutable channel contract snapshot', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await page.goto(demoUrl('13-平台运营渠道分销demo.html', '/channels'));
  await page.getByRole('button', { name:'查看渠道' }).first().click();
  const dialog = page.getByRole('dialog', { name:'渠道详情' });
  for (const text of ['合同版本 V1.0','固定单 Key 结算价','$12.99','渠道为面向玩家的销售方','证据附件']) {
    assert.match(await dialog.innerText(), new RegExp(text.replace('$','\\$')));
  }
  await page.close();
});
```

- [ ] **Step 2: Verify failure**

Run the operations test pattern. Expected: FAIL because the channel list/detail is absent.

- [ ] **Step 3: Implement channel list, filters and detail**

List columns: channel ID/name, legal region, contract version, authorized games/SKUs, settlement currency, status, risk, updated time. Filters: keyword, region, status, contract expiry, risk. Detail groups: legal entity/KYC, contacts, contract snapshot, authorized scope, settlement, tax/refund/chargeback responsibility, evidence and audit.

Saving a new contract version creates `CTR-SNAP-*`; the old version stays read-only. Do not create an online contract approval flow.

- [ ] **Step 4: Implement pause and terminate confirmations**

Pause requires a reason and stops new allocations; terminate requires a second confirmation, stops generation/allocation, and explicitly retains sales, redemptions, entitlements and statements.

- [ ] **Step 5: Build, test and commit**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs --test-name-pattern="contract snapshot"
git add -- demos/开发者后台一期/src/demo13-operations demos/开发者后台一期/13-平台运营渠道分销demo.html tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs
git commit -m "feat: add channel contract operations demo"
```

Expected: contract test PASS.

---

### Task 6: Implement Program, batch approval and Key exposure controls

**Files:**
- Modify: `demos/开发者后台一期/src/demo13-operations/app.js`
- Modify: `tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs`

- [ ] **Step 1: Add failing Program and batch test**

```js
test('quota requests auto-generate inside Program and escalate risky requests', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await page.goto(demoUrl('13-平台运营渠道分销demo.html', '/programs'));
  await page.getByRole('button', { name:'新建授权计划' }).click();
  assert.match(await page.getByRole('dialog').innerText(), /合同快照|SKU|授权地区|总额度|单 Key 结算价/);
  await page.getByRole('link', { name:'批次与交付' }).click();
  await page.getByRole('button', { name:'切换为高风险申请' }).click();
  assert.equal(await page.getByText('需人工审批', { exact:true }).isVisible(), true);
  assert.match(await page.locator('main').innerText(), /批量文件|双人复核|首次访问即视为已暴露/);
  await page.getByRole('button', { name:'凭据管理' }).click();
  await page.getByRole('button', { name:'轮换 Secret' }).click();
  assert.equal(await page.locator('[data-one-time-secret]').isVisible(), true);
  await page.getByRole('button', { name:'撤销凭据' }).click();
  await page.getByRole('button', { name:'确认撤销' }).click();
  assert.equal(await page.getByText('已撤销', { exact:true }).isVisible(), true);
  await page.close();
});
```

- [ ] **Step 2: Verify failure**

Run the matching test. Expected: FAIL.

- [ ] **Step 3: Implement Program list and editor**

Fields: contract snapshot, channel, APPID, Product, SKU/DLC, purpose, delivery mode, region, valid time, total/day/per-request quota, unit price, currency and status. In-quota API batches display “自动生成”; new channel, excess quota, export, special purpose, sensitive region or risk status display “需人工审批”.

- [ ] **Step 4: Implement batch state controls**

Show `草稿／额度锁定／生成中／可用／暂停／耗尽／过期／作废／生成失败`. Pause and void require reasons. A simulated encrypted export opens a one-time panel; closing or reloading removes plaintext and keeps only the masked artifact ID. The copy must say “首次授权访问即视为已暴露，不能回库”.

Add credential management with channel, Client ID, Secret suffix, Scope, valid time, last call and `正常／暂停／撤销／过期` status. Create and rotate show the complete demo Secret once; pause can resume; revoke requires confirmation and cannot resume. Closing, reloading or leaving the credential panel removes the one-time Secret.

- [ ] **Step 5: Build, test and commit**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs --test-name-pattern="Program and batch"
git add -- demos/开发者后台一期/src/demo13-operations demos/开发者后台一期/13-平台运营渠道分销demo.html tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs
git commit -m "feat: add key Program and batch controls"
```

Expected: Program/batch test PASS.

---

### Task 7: Implement channel API simulator

**Files:**
- Modify: `demos/开发者后台一期/src/demo13-channel/app.js`
- Modify: `demos/开发者后台一期/src/demo13-channel/styles.css`
- Modify: `tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs`

- [ ] **Step 1: Add failing API workflow test**

```js
test('channel simulator restores allocation and posts sale/refund facts', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await page.goto(demoUrl('13-渠道接口联调demo.html', '/allocate'));
  await page.getByRole('button', { name:'发送分配请求' }).click();
  assert.match(await page.locator('[data-response]').innerText(), /AL-000073|allocation_pending/);
  await page.getByRole('button', { name:'模拟响应丢失' }).click();
  await page.getByRole('button', { name:'按原 request_id 查询' }).click();
  assert.match(await page.locator('[data-response]').innerText(), /恢复原分配结果/);
  await page.getByRole('link', { name:'销售与退款回传' }).click();
  await page.getByRole('button', { name:'回传销售成功' }).click();
  assert.match(await page.locator('[data-event-log]').innerText(), /sale_confirmed/);
  await page.getByRole('button', { name:'回传退款成功' }).click();
  assert.match(await page.locator('[data-event-log]').innerText(), /refund_confirmed/);
  await page.close();
});
```

- [ ] **Step 2: Verify failure**

Run the channel simulator test pattern. Expected: FAIL.

- [ ] **Step 3: Implement allocation/query/confirm**

Use routes `allocate`, `events`, `logs`. Show request editor, fixed masked credentials, signature summary, response and timeline. Provide buttons for success, lost response recovery, duplicate request, changed-body conflict, invalid signature, insufficient quota and rate limit. Never display a real Key; use `GHK-9F3A-DEMO-7C21` with a permanent “演示码，不可兑换” label.

- [ ] **Step 4: Implement sale/refund/chargeback callbacks**

Sale posts `event_id`, `channel_order_ref`, `allocation_id`, SKU, sale region, sold time, quantity, unit settlement price and currency. Refund/chargeback must reference the original sale event. A second negative adjustment for the same sale returns `DUPLICATE_NEGATIVE_ADJUSTMENT`.

- [ ] **Step 5: Build, test and commit**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs --test-name-pattern="channel simulator"
git add -- demos/开发者后台一期/src/demo13-channel demos/开发者后台一期/13-渠道接口联调demo.html tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs
git commit -m "feat: add channel API integration demo"
```

Expected: channel simulator test PASS.

---

### Task 8: Implement player Key redemption demo

**Files:**
- Modify: `demos/开发者后台一期/src/demo13-redeem/app.js`
- Modify: `demos/开发者后台一期/src/demo13-redeem/styles.css`
- Modify: `tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs`

- [ ] **Step 1: Add failing redemption test**

```js
test('player redeems a channel key and receives the matching entitlement', async () => {
  const page = await browser.newPage({ viewport:{ width:390, height:844 } });
  await page.goto(demoUrl('13-玩家Key兑换demo.html', '/redeem'));
  await page.getByLabel('盖世 Key').fill('GHK-9F3A-DEMO-7C21');
  await page.getByRole('button', { name:'校验并兑换' }).click();
  assert.match(await page.locator('main').innerText(), /星海远征 标准版|兑换成功|已加入游戏库|前往下载/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
  await page.getByRole('button', { name:'模拟 DLC 缺少本体' }).click();
  assert.match(await page.locator('main').innerText(), /需先拥有游戏本体/);
  await page.close();
});
```

- [ ] **Step 2: Verify failure**

Run the redemption test pattern. Expected: FAIL.

- [ ] **Step 3: Implement login context, preview and confirmation**

The page shows the signed-in masked account and region, a Key input, validation result, game cover placeholder, game/SKU/DLC, publisher, supported OS, authorized region and an explicit confirm button. Do not create a separate login flow; provide a “切换演示账号” scenario control.

- [ ] **Step 4: Implement result scenarios**

Provide scenario buttons for `兑换成功`, `格式错误`, `已过期`, `已作废`, `已兑换`, `地区不符`, `DLC 缺少本体`, `权益处理中`. Success shows the same Product/SKU and an accessible “前往下载” action. `权益处理中` must not claim success and must explain that retrying will restore the same result without consuming another Key.

- [ ] **Step 5: Build, test and commit**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs --test-name-pattern="player redeems"
git add -- demos/开发者后台一期/src/demo13-redeem demos/开发者后台一期/13-玩家Key兑换demo.html tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs
git commit -m "feat: add player GameHub key redemption demo"
```

Expected: redemption test PASS at 390×844.

---

### Task 9: Implement reconciliation and risk incidents

**Files:**
- Modify: `demos/开发者后台一期/src/demo13-operations/app.js`
- Modify: `tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs`

- [ ] **Step 1: Add failing reconciliation test**

```js
test('operations reconciliation keeps inventory, sales and settlement separate', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  await page.goto(demoUrl('13-平台运营渠道分销demo.html', '/reconciliation'));
  for (const formula of [
    '生成数 = 可用 + 分配待确认 + 已暴露未兑换 + 已兑换 + 已过期 + 已作废',
    '净结算数量 = 已售 - 有效退款 - 有效拒付 + 历史调整',
  ]) assert.match(await page.locator('main').innerText(), new RegExp(formula.replace(/[+]/g, '\\+')));
  await page.getByRole('button', { name:'模拟已兑换但未回传销售' }).click();
  assert.match(await page.locator('[data-incident]').innerText(), /待补报|24 小时|暂停新分配/);
  await page.getByRole('button', { name:'模拟凭据泄露' }).click();
  assert.match(await page.locator('[data-incident]').innerText(), /暂停渠道|撤销凭据|轮换 Secret|停止新分配/);
  await page.close();
});
```

- [ ] **Step 2: Verify failure**

Run the reconciliation test pattern. Expected: FAIL.

- [ ] **Step 3: Implement statement and reconciliation views**

Show statement `STM-202609`, contract V1.0, sold/refunded/chargeback/prior adjustment/net counts, unit price, net amount, `待确认` status, line-item drawer, dispute action and lock action. Locking requires confirmation and says late adjustments enter the next period.

- [ ] **Step 4: Implement incident scenarios**

Scenarios: redeemed without sale callback, confirmation timeout, entitlement unknown, credential leak, batch leak, contract expiry and inventory equation mismatch. Each incident shows severity, affected objects, automatic action, manual owner and immutable audit timeline. No action may return an exposed Key to available.

- [ ] **Step 5: Build, test and commit**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs --test-name-pattern="reconciliation"
git add -- demos/开发者后台一期/src/demo13-operations demos/开发者后台一期/13-平台运营渠道分销demo.html tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs
git commit -m "feat: add channel reconciliation and incidents"
```

Expected: reconciliation test PASS.

---

### Task 10: Complete responsive, accessibility and offline verification

**Files:**
- Modify: `tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs`
- Modify: four app-specific CSS files as test failures require.

- [ ] **Step 1: Add viewport and network assertions**

```js
for (const [file, route] of [
  ['13-开发者渠道分销demo.html','/overview'],
  ['13-平台运营渠道分销demo.html','/channels'],
  ['13-渠道接口联调demo.html','/allocate'],
  ['13-玩家Key兑换demo.html','/redeem'],
]) {
  for (const viewport of [{ width:1440, height:900 }, { width:390, height:844 }]) {
    test(`${file} ${viewport.width} has no overflow or remote request`, async () => {
      const page = await browser.newPage({ viewport });
      const remote = [];
      page.on('request', request => { if (/^https?:/.test(request.url())) remote.push(request.url()); });
      await page.goto(demoUrl(file, route));
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
      assert.deepEqual(remote, []);
      await page.close();
    });
  }
}
```

- [ ] **Step 2: Run the full browser test and observe failures**

```powershell
node --test tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs
```

Expected before fixes: any overflow, clipped dialog, inaccessible action or console error fails with the exact file/viewport.

- [ ] **Step 3: Fix responsive and keyboard behavior**

At 390px: convert side navigation to a top scrollable nav, stack metrics and forms, make tables use labeled cards, keep modal actions sticky and full-width, and ensure 44px minimum interactive height. Add `:focus-visible` to buttons, links and inputs. Every dialog requires `role="dialog"`, `aria-modal="true"`, Escape close and focus restoration.

- [ ] **Step 4: Run complete verification**

```powershell
node demos/开发者后台一期/build-next.mjs
node --check demos/开发者后台一期/src/demo13-shared/model.js
node --check demos/开发者后台一期/src/demo13-shared/fixtures.js
node --check demos/开发者后台一期/src/demo13-shared/shell.js
node --check demos/开发者后台一期/src/demo13-developer/app.js
node --check demos/开发者后台一期/src/demo13-operations/app.js
node --check demos/开发者后台一期/src/demo13-channel/app.js
node --check demos/开发者后台一期/src/demo13-redeem/app.js
node --test tests/developer-backend/gamehub-key-channel-model.test.mjs tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs tests/developer-backend/build.test.mjs
```

Expected: all checks exit 0 and all tests PASS.

- [ ] **Step 5: Commit responsive and accessibility fixes**

```powershell
git add -- demos/开发者后台一期/src/demo13-* demos/开发者后台一期/13-* tests/developer-backend/gamehub-key-channel-demo.browser.test.mjs
git commit -m "test: verify GameHub key demos across viewports"
```

---

### Task 11: Capture evidence and document usage

**Files:**
- Create: `tests/developer-backend/capture-gamehub-key-channel-demo.mjs`
- Modify: `demos/开发者后台一期/README.md`

- [ ] **Step 1: Implement deterministic screenshot capture**

Capture these exact files at 1440×900, plus player success at 390×844:

```js
const captures = [
  ['13-开发者渠道分销demo.html','/overview','13-developer-overview-1440.png'],
  ['13-平台运营渠道分销demo.html','/channels','13-operations-channels-1440.png'],
  ['13-平台运营渠道分销demo.html','/reconciliation','13-operations-reconciliation-1440.png'],
  ['13-渠道接口联调demo.html','/allocate','13-channel-api-1440.png'],
  ['13-玩家Key兑换demo.html','/redeem?scenario=success','13-player-redeem-390.png'],
];
```

Save under `tests/developer-backend/evidence/gamehub-key-channel/` after waiting for `document.fonts.ready` and two animation frames. Do not capture any real Key or Secret.

- [ ] **Step 2: Update README**

Add a “13 盖世 Key 与渠道分销” section listing each HTML file, routes, scenario buttons, scope boundary, build command and test command. State explicitly that the old 02 dual-Key demo is not PRD-13 evidence.

- [ ] **Step 3: Run capture and inspect screenshots**

```powershell
node tests/developer-backend/capture-gamehub-key-channel-demo.mjs
```

Expected: five PNG files with no clipped headers, dialogs, tables, buttons or masked-value overflow.

- [ ] **Step 4: Run final verification**

Run the complete command from Task 10 Step 4. Expected: all tests PASS.

- [ ] **Step 5: Commit evidence and docs**

```powershell
git add -- demos/开发者后台一期/README.md tests/developer-backend/capture-gamehub-key-channel-demo.mjs tests/developer-backend/evidence/gamehub-key-channel
git commit -m "docs: add GameHub key demo evidence"
```

---

## Completion checklist

- [ ] Four offline HTML demos open directly from disk.
- [ ] No demo loads remote CSS, JavaScript, font, image, API or iframe.
- [ ] Developer, operations, channel and player fixtures use the same IDs and totals.
- [ ] Allocated, delivered, sold, redeemed and settled are visibly separate facts.
- [ ] Exposed Key never returns to available in any scenario.
- [ ] Sale is the only positive receivable event; refund and chargeback never double-adjust.
- [ ] The player success route creates the matching entitlement; processing never claims success.
- [ ] Desktop and 390px views have no root overflow or clipped primary action.
- [ ] All keys and secrets are masked or explicitly labeled non-production demo values.
- [ ] Full model, browser and build test suite passes.

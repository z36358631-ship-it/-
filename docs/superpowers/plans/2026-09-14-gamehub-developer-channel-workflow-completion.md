# GameHub Developer Channel Workflow Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the developer-side channel-distribution journey inside the integrated developer-platform HTML without adding new first-level navigation.

**Architecture:** Keep the four existing in-game sections and expand the focused `PublisherChannelDistribution` runtime into a small state-driven UI. `app.js` owns transient demo state and actions, while `shell.js` reuses the existing Demo-state panel for channel and batch scenarios. The generated HTML stays offline and never contains plaintext Keys, channel Secrets, player identity or platform-to-channel settlement actions.

**Tech Stack:** Vanilla JavaScript, CSS, existing developer-platform runtime/components, Node.js build scripts, Playwright Core.

---

## File map

- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js` — render opening state, plan detail, batch request/results, delivery/sales/anomaly data and developer settlement.
- Modify: `demos/开发者后台一期/src/styles/publisher-channel-distribution.css` — responsive forms, tabs, state strips and dialogs.
- Modify: `demos/开发者后台一期/src/runtime/templates.js` — rename `结算汇总` to `收益与结算` and pass channel state to the focused runtime.
- Modify: `demos/开发者后台一期/src/runtime/app.js` — process plan, batch, data-tab, settlement and Demo-state actions.
- Modify: `demos/开发者后台一期/src/runtime/shell.js` — display channel scenarios in the existing floating Demo-state panel only while a channel section is active.
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs` — lock the complete journey and security boundaries.
- Modify: `demos/开发者后台一期/README.md` — describe the completed integrated workflow.
- Generate: `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`.
- Generate: `tests/developer-backend/evidence/gamehub-key-channel-integrated/*.png`.

---

### Task 1: Lock the missing developer journey with browser tests

**Files:**
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: Add authorization-plan and channel-state assertions**

```js
await page.getByRole('button',{name:'渠道分销',exact:true}).click();
await page.getByRole('button',{name:'查看计划详情',exact:true}).click();
await page.getByRole('dialog',{name:'授权计划详情'}).getByText('KP-202609-001').waitFor();
await switchChannelScenario(page,'unopened');
await page.getByText('邀请制渠道合作').waitFor();
assert.equal(await page.getByRole('button',{name:'创建 Key 批次'}).isDisabled(),true);
```

- [ ] **Step 2: Add the batch request and all result-state assertions**

```js
await switchChannelScenario(page,'active');
await page.getByRole('button',{name:'Key 批次',exact:true}).click();
await page.getByRole('button',{name:'创建 Key 批次'}).click();
await page.getByRole('dialog',{name:'创建 Key 批次'}).getByLabel('申请数量').fill('500');
await page.getByRole('button',{name:'提交批次申请'}).click();
await page.getByText('批次已生成').waitFor();
for(const state of ['pending','rejected','failed']) await switchBatchScenario(page,state);
```

- [ ] **Step 3: Add delivery, anomaly and developer-settlement assertions**

```js
await page.getByRole('button',{name:'渠道数据',exact:true}).click();
for(const tab of ['交付记录','销售与兑换','异常记录']) await page.getByRole('tab',{name:tab}).click();
await page.getByRole('button',{name:'查看异常'}).click();
await page.getByRole('dialog',{name:'异常详情'}).waitFor();
await page.getByRole('button',{name:'收益与结算',exact:true}).click();
assert.doesNotMatch(await page.locator('.publisher-channel').innerText(),/待渠道确认|固定单价/);
```

- [ ] **Step 4: Run the test and verify the new assertions fail**

Run: `node --test tests/developer-backend/publisher-channel-integration.browser.test.mjs`

Expected: FAIL because plan details, batch creation/results, data tabs and developer-settlement boundaries do not yet exist.

---

### Task 2: Expand the focused channel runtime

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`

- [ ] **Step 1: Define developer-visible channel and batch states**

```js
const channelState=state.channelStatus||'active';
const submission=state.channelSubmission||null;
const canCreate=channelState==='active';
const batchLabels={generated:'可用',pending:'审核中',rejected:'已拒绝',failed:'生成失败'};
```

- [ ] **Step 2: Add plan detail and batch-create dialogs**

```js
const dialogs={
  'plan-detail':renderPlanDialog,
  'batch-create':renderBatchCreateDialog,
  'batch-detail':renderBatchDetailDialog,
  'anomaly-detail':renderAnomalyDialog,
  'settlement-detail':renderSettlementDialog,
};
```

The create form must show the fixed authorized plan, remaining quota `3,360`, quantity, purpose, delivery mode and expiry. It must not expose a free channel selector, plaintext Key or Secret.

- [ ] **Step 3: Render batch result recovery actions**

```js
const actions={
  rejected:'<button data-portal-action="channel-batch-edit">修改后重提</button>',
  failed:'<button data-portal-action="channel-batch-retry">重试生成</button>',
};
```

- [ ] **Step 4: Split channel data into three accessible tabs**

```js
const dataTabs=[['delivery','交付记录'],['sales','销售与兑换'],['anomalies','异常记录']];
```

- [ ] **Step 5: Replace channel-internal settlement controls with developer-visible results**

Show monthly channel sales net and adjustment facts, plus a clear note that final developer receivable, invoice and payment are handled in the finance module. Do not render `待渠道确认`, platform-to-channel contract unit price or a developer confirmation action.

- [ ] **Step 6: Add responsive styles and run syntax check**

Run: `node --check demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`

Expected: exit 0.

---

### Task 3: Wire channel actions and the existing Demo-state panel

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/runtime/shell.js`
- Modify: `demos/开发者后台一期/src/runtime/templates.js`

- [ ] **Step 1: Pass channel state to the renderer and rename the fourth section**

```js
['channel-settlement','收益与结算','finance','月结 收益 退款 拒付 调整']
```

- [ ] **Step 2: Add channel state to `demoState`**

```js
const channelMode=route.id==='P02-01'&&String(memory.page['P02-01']?.gameSection||'').startsWith('channel-');
demoState.channelMode=channelMode;
demoState.channelStatus=memory.demoPreview.channelStatus||'active';
demoState.channelBatchOutcome=memory.demoPreview.channelBatchOutcome||'generated';
```

- [ ] **Step 3: Reuse the floating panel for channel scenarios**

```js
if(demoState.channelMode){
  return renderScenarioPanel([
    ['channelStatus','渠道合作状态',['unopened','active','paused']],
    ['channelBatchOutcome','批次处理结果',['generated','pending','rejected','failed']],
  ]);
}
```

- [ ] **Step 4: Bind plan, batch, data-tab, anomaly and settlement actions**

```js
if(action==='channel-batch-submit'){
  updatePublisherWorkspace({channelDialog:'',channelSubmission:{status:memory.demoPreview.channelBatchOutcome||'generated',quantity:500}});
  return;
}
if(action==='channel-batch-retry'){
  updatePublisherWorkspace({channelSubmission:{status:'generated',quantity:500}});
  return;
}
```

- [ ] **Step 5: Build and run the focused tests**

Run:

```powershell
node demos/开发者后台一期/build-developer-channel.mjs
node --test tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: all focused tests PASS.

---

### Task 4: Visual review, documentation and local delivery

**Files:**
- Modify: `demos/开发者后台一期/README.md`
- Generate: `tests/developer-backend/evidence/gamehub-key-channel-integrated/*.png`

- [ ] **Step 1: Capture the complete journey**

Capture desktop plan detail, desktop batch create, pending/rejected/failed batch states, desktop anomalies, desktop settlement and 390px batch-create/channel-data screenshots.

- [ ] **Step 2: Review security and layout**

Run:

```powershell
rg -n -i '<script[^>]+src|<link[^>]+href|<iframe|GH26-DEMO-2026-9K2Q|ghs_demo_not_a_real_secret' demos/开发者后台一期/13-开发者平台与渠道分销demo.html
```

Expected: no matches.

- [ ] **Step 3: Update README and verify HTTP**

Run:

```powershell
Invoke-WebRequest 'http://127.0.0.1:57679/demos/%E5%BC%80%E5%8F%91%E8%80%85%E5%90%8E%E5%8F%B0%E4%B8%80%E6%9C%9F/13-%E5%BC%80%E5%8F%91%E8%80%85%E5%B9%B3%E5%8F%B0%E4%B8%8E%E6%B8%A0%E9%81%93%E5%88%86%E9%94%80demo.html' -UseBasicParsing
```

Expected: HTTP 200.

- [ ] **Step 4: Report unrelated regression blockers accurately**

If the legacy all-module build still fails because the current `03` PRD contains zero parsed pages or another user-owned source is syntactically incomplete, record it as an unrelated workspace blocker. Do not overwrite or revert those files.

---

## Completion checklist

- [ ] The same HTML covers authorization, batch request, result recovery, delivery, sales, anomalies and developer settlement.
- [ ] Four in-game navigation entries remain; no second shell or extra first-level navigation appears.
- [ ] All channel and batch Demo states are reachable through the existing floating Demo-state tool.
- [ ] Developer pages contain no plaintext Key, Secret, player identity or platform-to-channel confirmation action.
- [ ] Desktop and 320/390px mobile layouts have no root overflow or clipped primary action.
- [ ] Focused browser tests, syntax checks, offline scan and local HTTP check pass.

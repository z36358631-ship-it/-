# Mac Rental Expiry Renewal And Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Complete the Mac rental lifecycle from pre-expiry reminders through renewal, immediate expiry enforcement and expired-package launch blocking, while correcting checkout pricing and adding a searchable, immutable admin audit page.

**Architecture:** Keep the existing self-contained HTML Demo and its in-memory data model; add pure lifecycle, renewal, launch-eligibility and audit helpers before connecting them to renderers and delegated events. Treat server time and expire_at as the only rental-validity clock, extend the original service order on successful renewal, and keep rerental as a separate new-order path. Update the structured annotations, embedded smoke suite, PRD and screenshot pipeline only after the interactive behavior is green.

**Tech Stack:** HTML, CSS, vanilla JavaScript, embedded browser smoke tests, Playwright screenshot automation, Markdown, PowerShell, Git.

---

## File map and implementation boundaries

- Modify Mac端demo/mac端租号功能/Mac端租号功能-标注版.html
  - Owns Demo state, lifecycle helpers, client and admin renderers, delegated events, annotations and the final effective window.__demoSmoke definition.
- Modify tools/capture-mac-rental-prd-screenshots.js
  - Owns deterministic capture setup and the new expiry, launch-block and audit screenshots.
- Modify prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md
  - Owns the final product rules, state transitions, event definitions, acceptance criteria and published image references.
- Modify prd/【盖世游戏Mac】游戏租号需求/功能拆分版/00-项目总览.md, 01-功能索引.md, 02-客户端导航.md and 03-服务端导航.md
  - Owns cross-feature discovery and the client/server entry map.
- Modify feature files F002, F003, F004, F005, F007, F008 and F009 under 功能拆分版/features; create F012-运营操作审计.md
  - Owns implementation-ready requirements for pricing, payment, launch, renewal, resource release, fulfillment, stats and the new independent audit feature.
- Create or update files under prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图
  - Generated screenshot artifacts only; never hand-edit image binaries.

Do not split the current single-file Demo during this delivery. Its duplicate renderAdminProducts and window.__demoSmoke definitions are existing hazards: remove the obsolete first smoke definition, and always edit the later effective implementation until the duplicate is removed. Do not stage unrelated dirty-worktree changes; use git add -p for the HTML file and explicit paths for every other commit.

### Task 1: Establish A Deterministic Smoke Baseline

**Files:**
- Modify: Mac端demo/mac端租号功能/Mac端租号功能-标注版.html: existing duplicate window.__demoSmoke definitions near the end of the file

- [ ] **Step 1: Record the existing file diff without changing it**

Run:

~~~powershell
git diff -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
rg -n "window\.__demoSmoke|async function boot|data-smoke-status" 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
~~~

Expected: two window.__demoSmoke assignments are reported; the later assignment is the effective suite. Save the diff output for comparison and do not reset or overwrite existing changes.

- [ ] **Step 2: Run the current baseline smoke**

~~~powershell
New-Item -ItemType Directory -Force '.tmp' | Out-Null
$path = (Resolve-Path 'Mac端demo\mac端租号功能\Mac端租号功能-标注版.html').Path
$url = ([System.Uri]::new($path).AbsoluteUri) + '?smoke=1'
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --disable-gpu --virtual-time-budget=8000 --dump-dom $url |
  Set-Content '.tmp\mac-rental-expiry-smoke.html' -Encoding utf8
Select-String '.tmp\mac-rental-expiry-smoke.html' -Pattern 'data-smoke-status="pass"'
Select-String '.tmp\mac-rental-expiry-smoke.html' -Pattern '"pass":false'
~~~

Expected before clock stabilization: the current known baseline is 156/158. The two failures are refund-form-modal and no-reason-over-playtime because those checks use the real current time and the fixture has crossed the 72-hour window. No other baseline failure is accepted.

- [ ] **Step 3: Remove only the obsolete first smoke definition and stabilize test time**

Delete the earlier window.__demoSmoke block and keep the later block plus boot(). Do not merge old assertions into the live suite because the later suite already supersedes them.

At the top of the final suite define a fixed clock and pass it to every existing no-reason-refund eligibility call:

~~~js
const SMOKE_NOW = Date.parse('2026-07-15T12:00:00+08:00');
const eligible = noReasonRefundEligibility(order, SMOKE_NOW);
~~~

If the helper does not currently accept now, change its signature to noReasonRefundEligibility(order, now = Date.now()) and replace internal Date.now() reads with now. Production callers remain unchanged while smoke callers inject SMOKE_NOW.

- [ ] **Step 4: Re-run the smoke**

Run the commands from Step 2.

Expected after the fixed clock: 158/158, one data-smoke-status="pass" match and no "pass":false match.

- [ ] **Step 5: Commit the cleanup hunk only**

~~~powershell
git add -p -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git diff --cached --check
git commit -m "test: remove obsolete mac rental smoke suite"
~~~

Expected: the staged diff contains only the obsolete smoke deletion.

### Task 2: Add Rental Clock, State Fields And Pure Lifecycle Helpers

**Files:**
- Modify: Mac端demo/mac端租号功能/Mac端租号功能-标注版.html: orders seed data, state, price/time helper section, final smoke suite

- [ ] **Step 1: Add failing helper assertions to the final smoke suite**

Insert the following checks before any lifecycle mutation:

~~~js
const fixedNow = Date.parse('2026-07-16T10:00:00+08:00');
state.serverNowOverride = fixedNow;
const lifecycleFixture = {
  id:'GS-LIFE-001',
  status:'renting',
  expireAt:fixedNow + 15 * 60 * 1000,
  expiry15mRemindedAt:null,
  expiry5mRemindedAt:null,
  renewalStatus:'none',
  renewalOrderId:'',
  forceExitAt:null,
  sessionRevokedAt:null,
  accountReleasedAt:null,
  expiryEndResult:null
};
check('server-clock', serverNow() === fixedNow);
check('rental-seconds-left', rentalSecondsLeft(lifecycleFixture, fixedNow) === 900);
check('lifecycle-fields', [
  'expireAt','expiry15mRemindedAt','expiry5mRemindedAt','renewalStatus',
  'renewalOrderId','forceExitAt','sessionRevokedAt','accountReleasedAt',
  'expiryEndResult'
].every(key => key in lifecycleFixture));
~~~

- [ ] **Step 2: Run smoke and verify the new checks fail**

Run the Task 1 smoke command.

Expected: FAIL contains server-clock or "serverNow is not defined".

- [ ] **Step 3: Replace hard-coded expired active-order timestamps with relative seeds**

When initializing the current renting order, use a future relative expireAt so boot-time polling cannot immediately end the demo:

~~~js
const DEMO_BOOT_TIME = Date.now();
const activeExpireAt = DEMO_BOOT_TIME + 3 * 24 * 60 * 60 * 1000;
~~~

Add these fields to every order seed, using null or 'none' when not applicable:

~~~js
expireAt: activeExpireAt,
expiry15mRemindedAt: null,
expiry5mRemindedAt: null,
renewalStatus: 'none',
renewalOrderId: '',
forceExitAt: null,
sessionRevokedAt: null,
accountReleasedAt: null,
expiryEndResult: null
~~~

Keep display-only validUntil synchronized from expireAt; do not use validUntil for access decisions.

- [ ] **Step 4: Add state clock and pure helpers**

Add state.serverNowOverride with a default of null and state.serverTimeOffsetMs with a default of 0, then add:

~~~js
function serverNow(){
  return state.serverNowOverride === null
    ? Date.now() + state.serverTimeOffsetMs
    : state.serverNowOverride;
}
function rentalSecondsLeft(order, now = serverNow()){
  return Math.max(0, Math.ceil((Number(order.expireAt) - now) / 1000));
}
function isRentalActive(order, now = serverNow()){
  return Boolean(order && order.status === 'renting' && Number(order.expireAt) > now);
}
function checkoutDurationMs(){
  const units = {hour:3600000, day:86400000, week:604800000};
  if(state.checkout.period === 'permanent') return 0;
  return state.checkout.period === 'hour'
    ? checkoutHours() * units.hour
    : units[state.checkout.period];
}
function checkoutNewExpireAt(order){
  return Number(order.expireAt) + checkoutDurationMs();
}
~~~

Permanent rental is not a renewable duration; renewalAvailability() in Task 4 must reject it.

- [ ] **Step 5: Re-run smoke**

Expected: server-clock, rental-seconds-left and lifecycle-fields all pass.

- [ ] **Step 6: Commit only the lifecycle model hunks**

~~~powershell
git add -p -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git diff --cached --check
git commit -m "feat: add deterministic rental lifecycle clock"
~~~

### Task 3: Implement 15-Minute And 5-Minute Top-Center Reminders

**Files:**
- Modify: Mac端demo/mac端租号功能/Mac端租号功能-标注版.html: CSS, shell DOM layers, lifecycle helpers, delegated actions, final smoke suite

- [ ] **Step 1: Add failing reminder assertions**

~~~js
orders.push(lifecycleFixture);
state.serverNowOverride = fixedNow;
let lifecycleResult = refreshRentalLifecycle(fixedNow);
check('expiry-15m-once',
  lifecycleResult.reminded15.includes(lifecycleFixture.id) &&
  Boolean(lifecycleFixture.expiry15mRemindedAt) &&
  document.querySelectorAll('[data-expiry-reminder="15"]').length === 1
);
lifecycleResult = refreshRentalLifecycle(fixedNow + 1000);
check('expiry-15m-idempotent', lifecycleResult.reminded15.length === 0);
lifecycleResult = refreshRentalLifecycle(fixedNow + 10 * 60 * 1000);
check('expiry-5m-once',
  lifecycleResult.reminded5.includes(lifecycleFixture.id) &&
  Boolean(lifecycleFixture.expiry5mRemindedAt) &&
  document.querySelectorAll('[data-expiry-reminder="5"]').length === 1
);
check('no-expiry-1m-reminder',
  !document.querySelector('[data-expiry-reminder="1"]') &&
  !document.body.textContent.includes('1分钟后到期')
);
~~~

- [ ] **Step 2: Run smoke and verify failure**

Expected: FAIL with refreshRentalLifecycle not defined.

- [ ] **Step 3: Add the top-center reminder layer and styles**

Add a fixed layer outside #canvas so it remains visible on Mac and admin renders:

~~~html
<div id="expiryReminderLayer" class="expiry-reminder-layer" aria-live="assertive"></div>
~~~

~~~css
.expiry-reminder-layer{position:fixed;z-index:1800;top:18px;left:50%;transform:translateX(-50%);display:grid;gap:8px;width:min(560px,calc(100vw - 32px));pointer-events:none}
.expiry-reminder{pointer-events:auto;display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid #3c4149;border-radius:10px;background:#202327;color:#fff;box-shadow:0 12px 36px rgba(0,0,0,.35)}
.expiry-reminder-copy{flex:1;font-size:13px}.expiry-reminder-copy b{display:block;margin-bottom:3px}
~~~

- [ ] **Step 4: Implement idempotent reminder selection**

~~~js
function showExpiryReminder(order, stage, now = serverNow()){
  const layer = document.getElementById('expiryReminderLayer');
  const copy = stage === 15
    ? '租期将在15分钟后到期，是否续租？'
    : '租期仅剩5分钟，未续租将在到期后结束游戏';
  layer.innerHTML =
    '<div class="expiry-reminder" data-expiry-reminder="' + stage + '" data-order-id="' + order.id + '">' +
      '<div class="expiry-reminder-copy"><b>' + copy + '</b><span>到期时间：' + formatDateTime(order.expireAt) + '</span></div>' +
      '<button class="mac-btn ghost" data-action="dismiss-expiry-reminder">知道了</button>' +
      '<button class="mac-btn green" data-action="renew-from-reminder" data-id="' + order.id + '">立即续租</button>' +
    '</div>';
  const field = stage === 15 ? 'expiry15mRemindedAt' : 'expiry5mRemindedAt';
  order[field] = now;
  state.macHistory.push({event:'rental_expiry_reminder_show',orderId:order.id,reminderStage:stage,remainingSeconds:rentalSecondsLeft(order,now)});
}
function refreshRentalLifecycle(now = serverNow()){
  const result = {reminded15:[],reminded5:[],expired:[]};
  orders.filter(order => order.status === 'renting').forEach(order => {
    const left = rentalSecondsLeft(order, now);
    if(left === 0){
      expireRentalOrder(order, now);
      result.expired.push(order.id);
      return;
    }
    if(left <= 300 && !order.expiry5mRemindedAt){
      showExpiryReminder(order, 5, now);
      result.reminded5.push(order.id);
      return;
    }
    if(left <= 900 && !order.expiry15mRemindedAt){
      showExpiryReminder(order, 15, now);
      result.reminded15.push(order.id);
    }
  });
  return result;
}
~~~

The single return after the 5-minute reminder prevents sleep recovery from replaying both missed reminders. Task 5 defines expireRentalOrder.

- [ ] **Step 5: Wire actions and polling**

Add dismiss-expiry-reminder and renew-from-reminder branches. Dismiss clears the layer only; renew records rental_expiry_reminder_action and calls renewalOrder(order). Extend the existing one-second timer so refreshPaymentCountdowns() and refreshRentalLifecycle() both run. Also run refreshRentalLifecycle() on visibilitychange when document.visibilityState becomes visible.

- [ ] **Step 6: Run smoke and commit**

Expected: 15-minute and 5-minute reminders each appear once; no 1-minute reminder exists.

~~~powershell
git add -p -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git diff --cached --check
git commit -m "feat: add mac rental expiry reminders"
~~~

### Task 4: Separate Renewal Payment From New Rental Fulfillment

**Files:**
- Modify: Mac端demo/mac端租号功能/Mac端租号功能-标注版.html: checkout helpers, checkout renderer, confirm-payment and renew-order actions, final smoke suite

- [ ] **Step 1: Add failing renewal assertions**

~~~js
const renewalOrderFixture = orders.find(order => order.status === 'renting');
const originalExpireAt = renewalOrderFixture.expireAt;
const originalAccountId = renewalOrderFixture.accountId;
const originalOrderCount = orders.length;
state.checkout.renewalOrderId = renewalOrderFixture.id;
state.checkout.period = 'hour';
state.checkout.hours = 2;
check('renewal-availability', renewalAvailability(renewalOrderFixture).allowed === true);
check('renewal-expire-preview', checkoutNewExpireAt(renewalOrderFixture) === originalExpireAt + 7200000);
const renewalPayment = completeRenewalPayment(renewalOrderFixture, fixedNow);
check('renewal-extends-original',
  renewalPayment.ok &&
  renewalOrderFixture.expireAt === originalExpireAt + 7200000 &&
  renewalOrderFixture.accountId === originalAccountId &&
  orders.length === originalOrderCount
);
check('renewal-creates-transaction',
  state.renewalTransactions.some(item => item.serviceOrderId === renewalOrderFixture.id && item.status === 'paid')
);
~~~

- [ ] **Step 2: Run smoke and verify failure**

Expected: FAIL with renewalAvailability or completeRenewalPayment not defined.

- [ ] **Step 3: Add renewal transaction state and availability rules**

Add state.renewalTransactions as an empty array. Implement:

~~~js
function currentRenewalOrder(){
  return orders.find(order => order.id === state.checkout.renewalOrderId) || null;
}
function renewalOrder(order){
  if(!isRentalActive(order)) return {ok:false,reason:'租期已结束，请重新租用'};
  state.checkout.renewalOrderId = order.id;
  state.checkout.gameId = order.gameId;
  state.checkout.version = order.version;
  state.checkout.period = 'hour';
  state.checkout.hours = 2;
  navigate('mac','checkout');
  return {ok:true};
}
function renewalAvailability(order, now = serverNow()){
  if(!isRentalActive(order, now)) return {allowed:false,reason:'租期已结束，请重新租用'};
  if(state.checkout.period === 'permanent') return {allowed:false,reason:'永久套餐不支持续租'};
  const account = accounts.find(item => item.id === order.accountId);
  if(!account) return {allowed:false,reason:'原租赁账号不存在'};
  const availableUntil = Number.isFinite(Number(account.availableUntil))
    ? Number(account.availableUntil)
    : Infinity;
  const nextExpireAt = checkoutNewExpireAt(order);
  if(availableUntil <= Number(order.expireAt)) return {allowed:false,reason:'当前账号后续时段已被预约，暂时无法续租'};
  if(nextExpireAt > availableUntil){
    return {allowed:false,reason:'最多可续租至' + formatDateTime(availableUntil),maxExpireAt:availableUntil};
  }
  return {allowed:true,nextExpireAt};
}
~~~

Seed one account with availableUntil for full-conflict smoke coverage and another with a finite partial window.

- [ ] **Step 4: Implement renewal payment success**

~~~js
function completeRenewalPayment(order, paidAt = serverNow()){
  const availability = renewalAvailability(order, paidAt);
  if(!availability.allowed) return {ok:false,reason:availability.reason};
  const transactionId = 'RN' + paidAt;
  const oldExpireAt = Number(order.expireAt);
  const newExpireAt = checkoutNewExpireAt(order);
  state.renewalTransactions.unshift({
    id:transactionId,
    serviceOrderId:order.id,
    accountId:order.accountId,
    amount:getCheckoutPayablePrice(),
    status:'paid',
    paidAt,
    oldExpireAt,
    newExpireAt
  });
  order.expireAt = newExpireAt;
  order.validUntil = formatDateTime(newExpireAt);
  order.renewalStatus = 'success';
  order.renewalOrderId = transactionId;
  order.expiry15mRemindedAt = null;
  order.expiry5mRemindedAt = null;
  state.checkout.renewalOrderId = '';
  state.macHistory.push({event:'rental_renewal_result',orderId:order.id,renewalOrderId:transactionId,result:'success'});
  return {ok:true,transactionId,newExpireAt};
}
~~~

- [ ] **Step 5: Branch confirm-payment before the existing new-order path**

At the beginning of confirm-payment, resolve currentRenewalOrder(). If present, call completeRenewalPayment(). On success show the new expiry and return to orders or the running game without creating an order, assigning an account, downloading, logging in again or exiting. On failure keep the original order active and show the reason plus remaining time.

The new-rental branch must keep its current account allocation behavior.

- [ ] **Step 6: Close unpaid renewal at T0 and reject late callbacks**

When renewal starts, create a pending transaction and set order.renewalStatus='pending'. In expireRentalOrder(), change any pending renewal transaction to closed with closeReason='service_order_expired'. A simulated callback for a closed transaction must append a refund-required result and must not change expireAt or account ownership.

Add smoke checks for:

~~~js
check('renewal-conflict-blocked', renewalAvailability(conflictFixture).allowed === false);
check('renewal-late-callback-no-extension',
  lateResult.refundRequired === true && expiredFixture.expireAt === expireBeforeLateCallback
);
~~~

- [ ] **Step 7: Render renewal context**

When state.checkout.renewalOrderId is set, title the page “续租订单” and show original expiry, selected duration, new expiry and the original account's available-until limit. For an ended order, use “重新租用”; clear renewalOrderId and follow the normal new-rental flow.

- [ ] **Step 8: Run smoke and commit**

Expected: renewal extends the original order, creates an independent transaction, never changes accountId and blocks conflicts or late callbacks.

~~~powershell
git add -p -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git diff --cached --check
git commit -m "feat: complete rental renewal payment flow"
~~~

### Task 5: Enforce Immediate Expiry And Release The Rental Account

**Files:**
- Modify: Mac端demo/mac端租号功能/Mac端租号功能-标注版.html: lifecycle helpers, expiry dialog, order rendering, final smoke suite

- [ ] **Step 1: Add failing expiry assertions**

~~~js
const expiring = {
  ...lifecycleFixture,
  id:'GS-EXPIRE-001',
  status:'renting',
  expireAt:fixedNow,
  accountId:originalAccountId,
  gameRunning:true,
  renewalStatus:'none'
};
orders.push(expiring);
const accountBeforeExpiry = accounts.find(item => item.id === expiring.accountId);
accountBeforeExpiry.status = 'occupied';
accountBeforeExpiry.orderId = expiring.id;
refreshRentalLifecycle(fixedNow);
check('expiry-immediate-end',
  expiring.status === 'ended' &&
  expiring.forceExitAt === fixedNow &&
  expiring.sessionRevokedAt === fixedNow &&
  expiring.accountReleasedAt === fixedNow
);
check('expiry-account-released',
  accountBeforeExpiry.status === 'rentable' && accountBeforeExpiry.orderId === ''
);
check('expiry-no-grace-period', rentalSecondsLeft(expiring,fixedNow) === 0);
check('expiry-dialog-actions',
  document.body.textContent.includes('租期已结束，游戏已退出') &&
  Boolean(document.querySelector('[data-action="rerent-expired-order"]')) &&
  Boolean(document.querySelector('[data-action="navigate-home"]'))
);
~~~

- [ ] **Step 2: Run smoke and verify failure**

Expected: FAIL because expireRentalOrder is absent or does not set the end fields.

- [ ] **Step 3: Implement idempotent expiry**

~~~js
function expireRentalOrder(order, now = serverNow()){
  if(!order || order.status !== 'renting') return {ended:false,reason:'already_terminal'};
  const account = accounts.find(item => item.id === order.accountId);
  const exitResult = order.gameRunning ? 'game_exited' : 'game_not_running';
  order.gameRunning = false;
  order.status = 'ended';
  order.forceExitAt = now;
  order.sessionRevokedAt = now;
  order.accountReleasedAt = now;
  order.expiryEndResult = {exit:exitResult,session:'revoked',account:'released'};
  if(account && account.orderId === order.id){
    account.status = 'rentable';
    account.orderId = '';
  }
  state.steamSession = 'personal';
  state.macHistory.push({
    event:'rental_expiry_force_exit',
    orderId:order.id,
    exitResult,
    sessionRevokeResult:'revoked',
    accountReleaseResult:'released'
  });
  renderExpiredEndDialog(order);
  return {ended:true,exitResult};
}
~~~

The first status guard makes timer retries safe. Do not delete downloadedGameIds, config or saves.

- [ ] **Step 4: Render the terminal dialog**

Use the existing confirm/modal layer. Exact copy: “租期已结束，游戏已退出”. Buttons: “重新租用” and “返回首页”. rerent-expired-order clears renewalOrderId, restores the old game/version in checkout, defaults to two-hour rental, and navigates to checkout. navigate-home goes to explore.

- [ ] **Step 5: Run smoke and commit**

Expected: T0 changes the order to ended, releases the account, revokes the rental session, exits the game exactly once and offers rerental.

~~~powershell
git add -p -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git diff --cached --check
git commit -m "feat: enforce immediate rental expiry"
~~~

### Task 6: Block Launching An Expired Installed Package

**Files:**
- Modify: Mac端demo/mac端租号功能/Mac端租号功能-标注版.html: gameAccessState, launch helpers, detail/order actions, guard dialog, final smoke suite

- [ ] **Step 1: Add failing launch matrix assertions**

~~~js
const expiredInstalled = {
  ...expiring,
  id:'GS-EXPIRED-INSTALLED',
  gameId:'elden-ring',
  version:'standard',
  status:'ended',
  expireAt:fixedNow - 1000
};
orders.push(expiredInstalled);
state.downloadedGameIds.add(expiredInstalled.gameId);
state.launchValidationOnline = true;
state.steamSession = 'rental';
check('expired-installed-blocked',
  launchEligibility(expiredInstalled.gameId,'standard',fixedNow).reason === 'expired_rental'
);
state.launchValidationOnline = false;
check('validation-failure-blocked',
  launchEligibility(expiredInstalled.gameId,'standard',fixedNow).reason === 'validation_failed'
);
state.steamSession = 'personal';
state.personalOwnedGameIds.add(expiredInstalled.gameId);
check('personal-owner-bypass',
  launchEligibility(expiredInstalled.gameId,'standard',fixedNow).allowed === true
);
~~~

- [ ] **Step 2: Run smoke and verify failure**

Expected: FAIL with launchEligibility not defined.

- [ ] **Step 3: Add explicit launch eligibility**

Add state.launchValidationOnline default true and:

~~~js
function launchEligibility(gameId, version, now = serverNow()){
  if(state.steamSession === 'personal' && state.personalOwnedGameIds.has(gameId)){
    return {allowed:true,mode:'personal_owner'};
  }
  if(!state.launchValidationOnline){
    return {allowed:false,reason:'validation_failed'};
  }
  const active = orders.find(order =>
    order.gameId === gameId &&
    order.version === version &&
    isRentalActive(order, now)
  );
  if(active) return {allowed:true,mode:'active_rental',order:active};
  const expired = orders.find(order =>
    order.gameId === gameId &&
    order.version === version &&
    Number(order.expireAt) <= now
  );
  if(expired && state.downloadedGameIds.has(gameId)){
    return {allowed:false,reason:'expired_rental',order:expired};
  }
  return {allowed:false,reason:'not_rented'};
}
~~~

- [ ] **Step 4: Route every launch entry through the helper**

Before launch-order, guard-game-action and complete-launch performs a rental launch, call launchEligibility(). Personal ownership launches normally. validation_failed shows “租赁状态验证失败，请检查网络后重试”. expired_rental calls renderExpiredLaunchGuard(order). No blocked branch starts Steam or mutates gameRunning.

- [ ] **Step 5: Add expired launch guard and rerental reuse**

Exact guard copy: “该游戏租期已结束，重新租用后可继续游戏”. Buttons: “取消” and “重新租用”. On rerental success:

~~~js
function shouldDownloadAfterRerent(sourceOrder, newOrder){
  return !state.downloadedGameIds.has(newOrder.gameId) || sourceOrder.version !== newOrder.version;
}
~~~

If false, establish the new rental session and launch directly without another full download. If true, show an update/download action.

- [ ] **Step 6: Run smoke and commit**

Expected: expired installed packages and validation failures are blocked; personal owners bypass rental blocking; same-version rerental reuses the package.

~~~powershell
git add -p -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git diff --cached --check
git commit -m "feat: guard expired rental package launches"
~~~

### Task 7: Correct Checkout Price Hierarchy

**Files:**
- Modify: Mac端demo/mac端租号功能/Mac端租号功能-标注版.html: checkout CSS, price helpers, renderMacCheckout, final smoke suite

- [ ] **Step 1: Add failing price assertions**

~~~js
state.checkout.renewalOrderId = '';
state.checkout.isFirstOrder = true;
navigate('mac','checkout');
await nextPaint();
const checkout = canvas.querySelector('.checkout-modal');
check('game-list-price-red-not-struck',
  Boolean(checkout.querySelector('.checkout-game-list-price')) &&
  getComputedStyle(checkout.querySelector('.checkout-game-list-price')).textDecorationLine === 'none'
);
check('first-order-tag-near-amount',
  Boolean(checkout.querySelector('.checkout-price .first-order-tag')) &&
  !checkout.querySelector('.checkout-game .first-order-tag')
);
check('first-order-price-pair',
  Boolean(checkout.querySelector('.checkout-standard-price s')) &&
  Boolean(checkout.querySelector('.checkout-payable-price'))
);
state.checkout.isFirstOrder = false;
renderApp();
check('normal-price-no-promotion',
  !canvas.querySelector('.first-order-tag') &&
  !canvas.querySelector('.checkout-standard-price s')
);
~~~

- [ ] **Step 2: Run smoke and verify failure**

Expected: the tag-location and price-pair checks fail.

- [ ] **Step 3: Separate standard and payable amounts**

Keep getCheckoutPrice() as the standard rental price and add:

~~~js
function isFirstOrderCheckout(){
  return !state.checkout.renewalOrderId && state.checkout.isFirstOrder !== false;
}
function getCheckoutPayablePrice(){
  const standard = getCheckoutPrice();
  return isFirstOrderCheckout() ? Math.round(standard * 50) / 100 : standard;
}
~~~

Ensure confirm-payment and renewal transaction amounts use getCheckoutPayablePrice(). Renewal always returns false from isFirstOrderCheckout().

- [ ] **Step 4: Replace checkout markup and CSS**

Remove the first-order tag from .checkout-game. Add game body price as:

~~~html
<span class="checkout-game-list-price">游戏原价 ¥198</span>
~~~

Style it red with no line-through. In .checkout-price render:

~~~html
<div class="checkout-price-title">
  <span>订单金额</span>
  <span class="first-order-tag">首单5折</span>
</div>
<span class="checkout-standard-price"><s>¥6.8</s></span>
<strong class="checkout-payable-price">¥3.4</strong>
~~~

Render the tag and standard-price s only for first-order checkout. For non-first-order and renewal, render only the normal payable amount. Never use the game body price as the crossed-out rental price.

- [ ] **Step 5: Run smoke and commit**

Expected: game original price is red and not struck; first-order tag sits by order amount; standard rental price is struck and payable price is enlarged red; normal and renewal checkouts show no first-order presentation.

~~~powershell
git add -p -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git diff --cached --check
git commit -m "feat: clarify first-order checkout pricing"
~~~

### Task 8: Replace The Audit Drawer With A Dedicated Admin Page

**Files:**
- Modify: Mac端demo/mac端租号功能/Mac端租号功能-标注版.html: audit CSS/DOM, state, ADMIN_PAGES, adminFrame, renderers, delegated events, final smoke suite

- [ ] **Step 1: Add failing audit-page smoke assertions**

~~~js
navigate('admin','audit');
await nextPaint();
check('audit-nav-page', state.page === 'audit' && Boolean(canvas.querySelector('[data-anno-target="audit-table"]')));
check('audit-filter-controls', [
  'audit-from','audit-to','audit-operator','audit-module','audit-action',
  'audit-result','audit-object-id','audit-keyword'
].every(key => Boolean(canvas.querySelector('[data-change="' + key + '"],[data-input="' + key + '"]'))));
check('audit-log-immutable',
  !canvas.querySelector('[data-action="edit-audit"],[data-action="delete-audit"]')
);
~~~

- [ ] **Step 2: Run smoke and verify failure**

Expected: audit-nav-page fails because audit is not in ADMIN_PAGES.

- [ ] **Step 3: Replace state and navigation**

Replace auditLog/auditOpen with:

~~~js
auditLogs: seedAuditLogs(),
auditRetentionDays:180,
auditFilters:{
  from:'',to:'',operator:'all',module:'all',action:'all',result:'all',
  objectId:'',keyword:'',page:1,pageSize:10
},
auditDetailId:''
~~~

Add ['audit','操作记录','history'] to ADMIN_PAGES and SCREEN_RENDERERS.admin.audit=renderAdminAudit. Remove #auditLayer, old .audit-drawer styles, showAudit(), the adminFrame bottom show-audit button, the flow-nav duplicate shortcut, the show-audit action and auditOpen cleanup. Keep “系统设置” in the bottom area.

- [ ] **Step 4: Add complete audit seed records**

Implement seedAuditLogs() with records covering product, account, order, stats and system modules; include success, failed, sensitive_view, export and a partially failed batch. Every record must use:

~~~js
{
  id:'AUD-20260716-001',
  occurredAt:'2026-07-16 10:10:00',
  operator:{id:'OP-1001',name:'王敏'},
  module:{code:'product',name:'租号商品管理'},
  action:{code:'product_update',name:'编辑商品'},
  object:{type:'product',id:'GAME-1001',name:'艾尔登法环 标准版'},
  changes:[{field:'hourPrice',label:'时租价格',before:'3.4',after:'3.8'}],
  result:'success',
  errorCode:'',
  failureReason:'',
  remark:'调整标准版时租价格',
  requestId:'req-audit-001',
  batch:null
}
~~~

Do not put credentials, payment secrets or full device fingerprints in changes or remark.

- [ ] **Step 5: Implement filtering and pagination helpers**

~~~js
function filteredAuditLogs(){
  const f = state.auditFilters;
  const keyword = f.keyword.trim().toLowerCase();
  const retentionFloor = serverNow() - state.auditRetentionDays * 86400000;
  return state.auditLogs.filter(log => {
    const occurred = Date.parse(log.occurredAt.replace(' ','T') + '+08:00');
    if(occurred < retentionFloor) return false;
    const fromOk = !f.from || occurred >= Date.parse(f.from + 'T00:00:00+08:00');
    const toOk = !f.to || occurred <= Date.parse(f.to + 'T23:59:59+08:00');
    const operatorOk = f.operator === 'all' || log.operator.id === f.operator;
    const moduleOk = f.module === 'all' || log.module.code === f.module;
    const actionOk = f.action === 'all' || log.action.code === f.action;
    const resultOk = f.result === 'all' || log.result === f.result;
    const objectOk = !f.objectId || log.object.id === f.objectId.trim();
    const haystack = [log.object.name,log.action.name,log.remark].join(' ').toLowerCase();
    return fromOk && toOk && operatorOk && moduleOk && actionOk &&
      resultOk && objectOk && (!keyword || haystack.includes(keyword));
  });
}
function pagedAuditLogs(){
  const all = filteredAuditLogs();
  const start = (state.auditFilters.page - 1) * state.auditFilters.pageSize;
  return {total:all.length,rows:all.slice(start,start + state.auditFilters.pageSize)};
}
~~~

Render “日志默认保留180天” next to the page description and add:

~~~js
check('audit-retention-default', state.auditRetentionDays === 180 && canvas.textContent.includes('默认保留180天'));
~~~

The HTML Demo filters expired seed records to model the retention window. Production retention must be enforced by the server-side audit store, not by the browser.

- [ ] **Step 6: Render the page and detail drawer**

Reuse .admin-toolbar, .filter-row, .a-input, .a-select, .data-card and .data-table. Table columns: operation time, operator/ID, module, action, object/ID, result, remark and details. Add combined filters, reset, current-filter export and pagination.

renderAuditDetail() must show changes before/after, requestId, error code/reason and batch total/success/failed/failedObjects. It must have only a close button; no edit/delete control.

- [ ] **Step 7: Wire filter and page actions**

In global input/change handlers, support all audit keys and reset page to 1 whenever a filter changes. Add reset-audit-filters, audit-prev-page, audit-next-page, open-audit-detail, close-audit-detail and export-audit actions. Navigation, filtering, reset and paging must not call addAdminAudit().

- [ ] **Step 8: Run smoke and commit**

Expected: audit is a dedicated navigable page; all eight filter inputs exist; log detail is readable and immutable.

~~~powershell
git add -p -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git diff --cached --check
git commit -m "feat: add admin audit log page"
~~~

### Task 9: Record Admin Success, Failure, Sensitive View And Export Events

**Files:**
- Modify: Mac端demo/mac端租号功能/Mac端租号功能-标注版.html: audit helper and admin action branches, final smoke suite

- [ ] **Step 1: Add failing audit-behavior checks**

~~~js
const auditCount = state.auditLogs.length;
state.auditFilters.keyword = '艾尔登';
renderApp();
check('audit-filter-does-not-log', state.auditLogs.length === auditCount);
dispatchAction('export-audit',{dataset:{}});
dispatchAction('confirm-yes',{dataset:{}});
check('audit-export-logged',
  state.auditLogs.length === auditCount + 1 &&
  state.auditLogs[0].action.code === 'rental_audit_log_export'
);
dispatchAction('open-order',{dataset:{id:orders[0].id}});
check('sensitive-view-logged',
  state.auditLogs.some(log => log.action.code === 'order_sensitive_view' && log.object.id === orders[0].id)
);
~~~

- [ ] **Step 2: Run smoke and verify failure**

Expected: export and sensitive-view checks fail.

- [ ] **Step 3: Replace the generic client audit helper**

Do not reuse old addAudit() for Mac user behavior. Add:

~~~js
function addAdminAudit(entry){
  const allowedModules = new Set(['product','account','order','stats','system']);
  if(!allowedModules.has(entry.module.code)) return null;
  const log = {
    id:'AUD-' + serverNow() + '-' + (state.auditLogs.length + 1),
    occurredAt:formatDateTime(serverNow()),
    operator:entry.operator || {id:'OP-1001',name:'王敏'},
    module:entry.module,
    action:entry.action,
    object:entry.object,
    changes:entry.changes || [],
    result:entry.result,
    errorCode:entry.errorCode || '',
    failureReason:entry.failureReason || '',
    remark:entry.remark || '',
    requestId:entry.requestId || 'req-' + serverNow(),
    batch:entry.batch || null
  };
  state.auditLogs.unshift(log);
  return log;
}
~~~

- [ ] **Step 4: Connect the five admin modules**

Add addAdminAudit() calls only after these admin actions resolve:

- Product: create, copy, permanent toggle, sync, export, bulk price, bulk/single online/offline.
- Account: add, sync, detect, release, online/offline and batch actions.
- Order: replace account, compensate, force end, export, refund create/approve/reject/complete and release-failed result.
- Stats: export.
- System: refund-risk setting changes and audit export.

Also record failures currently shown only as toast: duplicate third-party ID, no same-version replacement stock and release failure. Use result:'failed', stable errorCode and a readable failureReason. For partial batch failure, write one main log with result:'failed' or 'partial' consistently and include batch:{total,success,failed,failedObjects}.

- [ ] **Step 5: Record sensitive detail views**

The order detail action that exposes device fields must write action.code='order_sensitive_view'. If account detail exposes credentials or health diagnostics, log account_sensitive_view. Never copy the sensitive field values into changes or remark.

- [ ] **Step 6: Implement filtered audit export**

export-audit opens the existing confirmation modal. On confirm, create an export task ID, summarize only active filters, and log:

~~~js
addAdminAudit({
  module:{code:'system',name:'系统设置'},
  action:{code:'rental_audit_log_export',name:'导出操作记录'},
  object:{type:'audit_export',id:exportTaskId,name:'操作记录导出任务'},
  result:'success',
  remark:'按当前筛选条件导出',
  changes:[{field:'filterSummary',label:'筛选条件',before:'',after:filterSummary}]
});
~~~

- [ ] **Step 7: Add sensitive-value negative assertions**

~~~js
const forbiddenAuditText = ['password=','access_token','完整设备指纹','payment_secret'];
check('audit-sensitive-values-redacted',
  forbiddenAuditText.every(value => !canvas.textContent.toLowerCase().includes(value.toLowerCase()))
);
~~~

- [ ] **Step 8: Run smoke and commit**

Expected: admin mutations, failures, sensitive views and exports are traceable; ordinary browsing and filtering add no logs; forbidden values are absent.

~~~powershell
git add -p -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git diff --cached --check
git commit -m "feat: connect rental admin audit events"
~~~

### Task 10: Remove Stats Comparison Without Removing KPI Trends

**Files:**
- Modify: Mac端demo/mac端租号功能/Mac端租号功能-标注版.html: state.stats, renderAdminStats, dispatchAction, annotations, final smoke suite

- [ ] **Step 1: Replace the obsolete comparison smoke**

Delete the current dispatchAction('compare-stats') and state.stats.compare assertion. Add:

~~~js
state.stats.range = '30d';
navigate('admin','stats');
await nextPaint();
check('stats-compare-removed', !canvas.querySelector('[data-action="compare-stats"]'));
check('stats-export-retained', Boolean(canvas.querySelector('[data-action="export-stats"]')));
check('stats-kpi-trends-retained',
  canvas.textContent.includes('↑ 18.6%') &&
  canvas.textContent.includes('↑ 21.3%') &&
  canvas.textContent.includes('↓ 0.5%')
);
~~~

- [ ] **Step 2: Run smoke and verify failure**

Expected: stats-compare-removed fails.

- [ ] **Step 3: Remove comparison state and behavior**

Delete stats.compare from state, remove the comparison button from renderAdminStats(), render KPI trend copy directly, and delete the compare-stats action branch. Keep range filters, export and every existing KPI trend percentage.

- [ ] **Step 4: Update stats annotation copy**

Replace “修改筛选或环比” and “切换周期或环比” with wording that only refers to filter and period changes. Do not remove stats annotation targets.

- [ ] **Step 5: Run smoke and commit**

Expected: no comparison button or state remains; export and KPI percentage trends remain.

~~~powershell
git add -p -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git diff --cached --check
git commit -m "feat: remove stats period comparison control"
~~~

### Task 11: Complete Structured Annotations And End-To-End Smoke Coverage

**Files:**
- Modify: Mac端demo/mac端租号功能/Mac端租号功能-标注版.html: annotations, annotationDetails, final smoke suite

- [ ] **Step 1: Add annotation targets for the new flows**

Add matching data-anno-target nodes and annotation entries for:

- expiry-reminder
- renewal-checkout
- expired-launch-guard
- checkout-price
- audit-filter
- audit-table
- audit-detail

Each annotation must define trigger, display and interaction. Do not add an annotation entry without a renderer target on the same mode/page.

- [ ] **Step 2: Add full lifecycle assertions to the final effective smoke**

The final suite must cover these exact outcomes:

~~~js
check('reminders-15-and-5-only', reminderStages.join(',') === '15,5');
check('renewal-from-original-expiry', renewed.expireAt === originalExpireAt + durationMs);
check('renewal-keeps-account', renewed.accountId === originalAccountId);
check('t0-ends-without-grace', ended.status === 'ended' && ended.forceExitAt === ended.expireAt);
check('expired-package-blocks-launch', expiredLaunch.reason === 'expired_rental');
check('same-version-rerent-skips-download', shouldDownloadAfterRerent(source,newOrder) === false);
check('personal-owner-launches', personalLaunch.allowed === true);
check('checkout-promotion-rules', firstOrderOk && normalOrderOk && renewalOrderOk);
check('audit-combined-filters', combinedRows.every(row => row.operator.id === 'OP-1001' && row.result === 'failed'));
check('audit-no-edit-delete', !canvas.querySelector('[data-action="edit-audit"],[data-action="delete-audit"]'));
check('stats-compare-removed', !canvas.querySelector('[data-action="compare-stats"]'));
~~~

Use fixed now arguments or state.serverNowOverride in every time-sensitive assertion; never wait 15 real minutes.

- [ ] **Step 3: Test reset, pagination and detail**

Set pageSize=1, verify next/previous changes the visible ID, reset restores every filter and page=1, and detail displays before, after, requestId, failure reason and batch failed objects.

- [ ] **Step 4: Preserve smoke fixture cleanup**

Remove temporary orders, transactions and seed mutations at the end of each scenario or snapshot/restore the affected arrays and sets. Reset state.serverNowOverride=null, state.serverTimeOffsetMs=0, launchValidationOnline=true, steamSession and checkout fields before the existing navigation/annotation validations.

- [ ] **Step 5: Run the full smoke twice**

Run the Task 1 command twice.

Expected on both runs: exactly one data-smoke-status="pass" match and no "pass":false match. Repetition guards against leaked state and non-idempotent timers.

- [ ] **Step 6: Check annotations and source hazards**

~~~powershell
rg -n "window\.__demoSmoke" 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
rg -n "compare-stats|stats\.compare|1分钟后到期|show-audit|auditOpen" 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
~~~

Expected: exactly one window.__demoSmoke definition; no obsolete comparison, one-minute reminder, audit drawer or auditOpen references.

- [ ] **Step 7: Commit**

~~~powershell
git add -p -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git diff --cached --check
git commit -m "test: cover rental expiry renewal and audit flows"
~~~

### Task 12: Synchronize The PRD, Events And Acceptance Criteria

**Files:**
- Modify: prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md: overview, checkout, order lifecycle, launch guard, admin, events, acceptance and screenshot sections
- Modify: prd/【盖世游戏Mac】游戏租号需求/功能拆分版/00-项目总览.md
- Modify: prd/【盖世游戏Mac】游戏租号需求/功能拆分版/01-功能索引.md
- Modify: prd/【盖世游戏Mac】游戏租号需求/功能拆分版/02-客户端导航.md
- Modify: prd/【盖世游戏Mac】游戏租号需求/功能拆分版/03-服务端导航.md
- Modify: prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F002-游戏详情与版本租期.md
- Modify: prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F003-下单支付与资源锁定.md
- Modify: prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F004-Steam一键上号.md
- Modify: prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F005-用户订单续租与售后.md
- Modify: prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F007-账号资源管理.md
- Modify: prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F008-订单与售后工作台.md
- Modify: prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F009-租号效果统计.md
- Create: prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F012-运营操作审计.md

- [ ] **Step 1: Add V2.3 and update lifecycle requirements**

Add a V2.3 version-history entry. In 2.4, 3.3 and 4.2.7 document expire_at as the only validity clock, server_time-based countdowns, 15-minute and 5-minute top-center reminders, missed-reminder recovery, no 1-minute reminder, original-expiry renewal extension, reservation conflict handling, pending-renewal close at T0, late-payment refund handling, immediate game exit, session revocation and account release.

- [ ] **Step 2: Update launch and rerental requirements**

Add the launch decision table for personal ownership, valid rental, expired installed package and validation failure. State that same-version rerental reuses the local package and that local packages, settings and saves are not deleted at expiry.

- [ ] **Step 3: Correct checkout pricing language**

Replace any requirement that says the game original price is struck. State: game original price is red without line-through; first-order label is next to order amount; standard rental amount is struck; discounted payable amount is red/enlarged; normal orders and renewals show neither first-order tag nor struck rental price.

- [ ] **Step 4: Add dedicated audit-page requirements**

Describe five covered modules, success/failure/sensitive-view/export logging, excluded browsing/search/filter events, immutable 180-day retention, combined filters, pagination, detail, current-filter export, batch results and secret redaction.

- [ ] **Step 5: Remove stats comparison wording**

Remove the “环比对比” control and interaction state from product requirements and screenshots. Keep export and existing KPI increase/decrease percentages.

- [ ] **Step 6: Add exact events**

Add or update:

~~~text
rental_expiry_reminder_show
rental_expiry_reminder_action
rental_renewal_submit
rental_renewal_result
rental_expiry_force_exit
rental_expired_launch_block
rental_rerent_result
rental_audit_log_export
~~~

For each, document trigger time and the fields from the approved design spec.

- [ ] **Step 7: Add acceptance criteria**

Mirror the design spec's 14 acceptance outcomes and explicitly include: 15/5 once each, no 1-minute reminder, no grace period, original-order extension, account unchanged, conflict and late callback behavior, personal-owner bypass, same-version package reuse, checkout promotion variants, audit immutability/filtering and stats comparison removal.

- [ ] **Step 8: Synchronize the split PRD**

Apply the same final terms rather than copying whole chapters:

- 00–03: add the lifecycle and audit feature to the overview, index and client/server navigation.
- F002: red, non-struck game original price.
- F003: first-order tag and standard/payable rental-price hierarchy.
- F004: T0 exit, expired-package validation, offline failure and personal-owner bypass.
- F005: 15/5 reminders, original-expiry renewal, reservation conflict, late callback and rerental.
- F007: account available-until conflict, T0 release and release-failure handling.
- F008: force-exit, session-revoke and account-release outcome fields.
- F009: remove comparison, retain export and KPI trends.
- F012: define the five audit modules, record schema, exclusions, combined filters, detail/export, failures, batch child results, redaction, immutability and 180-day retention.

Add F012 to 01-功能索引.md and 03-服务端导航.md so the new file is discoverable.

- [ ] **Step 9: Run document consistency searches**

~~~powershell
rg -n "游戏原价.*删除线|支持.*筛选和对比|环比对比|已开启环比|审计记录抽屉|1分钟.*提醒|宽限" 'prd\【盖世游戏Mac】游戏租号需求'
rg -n "15分钟|5分钟|expire_at|重新租用|操作记录|180天|rental_audit_log_export" 'prd\【盖世游戏Mac】游戏租号需求'
~~~

Expected: the first search has no stale positive requirements; the second finds every new subject.

- [ ] **Step 10: Commit the PRD only**

~~~powershell
git add -- 'prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md'
git add -- 'prd/【盖世游戏Mac】游戏租号需求/功能拆分版'
git diff --cached --check
git commit -m "docs: specify mac rental expiry renewal and audit"
~~~

### Task 13: Capture And Reference The New PRD Screens

**Files:**
- Modify: tools/capture-mac-rental-prd-screenshots.js
- Modify: prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md
- Create or update: prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/*.png

- [ ] **Step 1: Add deterministic capture setup**

Before each new capture, set Demo state through page.evaluate(): use a fixed serverNowOverride, a known order expireAt, known reminder flags, known launch validation and known audit filters. Never rely on wall-clock timing or a previous capture's state.

- [ ] **Step 2: Add five lifecycle captures and replace four affected existing captures**

Regenerate the existing 20-shot set, add five new shots, and finish with exactly 25 images. Add:

~~~js
await capture('c10-expiry-reminder-15m.png', async page => {
  await prepareExpiry(page,15);
});
await capture('c10-expiry-reminder-5m.png', async page => {
  await prepareExpiry(page,5);
});
await capture('c11-renewal-checkout.png', async page => {
  await prepareRenewalCheckout(page);
});
await capture('c12-expired-launch-block.png', async page => {
  await prepareExpiredLaunchGuard(page);
});
await capture('c13-expiry-ended-result.png', async page => {
  await prepareExpiredEndResult(page);
});
~~~

Replace c02-package-and-checkout.png, b03-order-fulfillment.png, b05-rental-statistics.png and b06-operation-audit.png with the new implemented UI. Configure b06-operation-audit.png with the detail drawer open so one image proves both list and detail. Use the script's existing openPage/capture helpers and existing Mac 1076x734/admin 1800x1300 viewport conventions.

- [ ] **Step 3: Run screenshot generation**

~~~powershell
node 'tools\capture-mac-rental-prd-screenshots.js'
~~~

Expected: exit code 0, 25 filenames are printed, no Page errors occur and every file has a non-zero size.

- [ ] **Step 4: Inspect the generated screenshots**

Open each image and verify:

- reminder is top-center and says 15 minutes;
- the second reminder says 5 minutes and neither image shows a 1-minute reminder;
- renewal shows original expiry and the extended expiry;
- expiry-ended result says the game exited and offers rerental;
- expired launch is visibly blocked and offers rerental;
- checkout game price is red without strike and first-order amount hierarchy is correct;
- audit filters/table/detail are legible and contain no edit/delete controls or secrets;
- stats has export and KPI trends but no comparison button.

- [ ] **Step 5: Update local PRD captions**

Update captions to describe the implemented state and remove obsolete game-price strike-through, audit drawer or comparison-button wording. Leave fixed-CDN URL replacement for Task 14, after the immutable asset commit exists.

- [ ] **Step 6: Run final smoke and content checks**

Run the Task 1 smoke command, then:

~~~powershell
Get-ChildItem 'prd\【盖世游戏Mac】游戏租号需求\图片和附件\PRD截图' -Filter '*.png' | Measure-Object
git diff --check
~~~

Expected: smoke passes, Count is 25 and git diff --check is clean.

- [ ] **Step 7: Commit generated assets and references**

~~~powershell
git add -- 'tools/capture-mac-rental-prd-screenshots.js'
git add -- 'prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图'
git diff --cached --check
git commit -m "docs: refresh mac rental lifecycle screenshots"
~~~

### Task 14: Publish The Demo And Immutable Screenshot Assets

**Files:**
- Publish copy: Mac端demo/mac端租号功能/Mac端租号功能-标注版.html
- Publish copy: prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/*.png
- Modify: prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md

- [ ] **Step 1: Obtain explicit push approval**

Show the local smoke result, 25-image inspection result, target branches and exact commands below. Do not execute git push until the user explicitly authorizes external publication.

- [ ] **Step 2: Fetch and create the isolated Demo publish worktree**

~~~powershell
git fetch origin
git worktree add -b publish/mac-rental-demo-20260716 '.tmp/mac-rental-demo-publish' refs/remotes/origin/master
~~~

Expected: worktree is created from refs/remotes/origin/master, not an ambiguous local origin/master branch.

- [ ] **Step 3: Copy only the verified Demo into the publish worktree**

~~~powershell
$source = (Resolve-Path 'Mac端demo\mac端租号功能\Mac端租号功能-标注版.html').Path
$destination = Join-Path (Resolve-Path '.tmp\mac-rental-demo-publish').Path 'Mac端demo\mac端租号功能\Mac端租号功能-标注版.html'
New-Item -ItemType Directory -Force (Split-Path -Parent $destination) | Out-Null
Copy-Item -LiteralPath $source -Destination $destination -Force
git -C '.tmp/mac-rental-demo-publish' status --short
git -C '.tmp/mac-rental-demo-publish' diff --check
~~~

Expected: only Mac端demo/mac端租号功能/Mac端租号功能-标注版.html is modified.

- [ ] **Step 4: Commit and publish the Demo**

~~~powershell
git -C '.tmp/mac-rental-demo-publish' add -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git -C '.tmp/mac-rental-demo-publish' commit -m "feat: publish mac rental expiry renewal and audit"
git -C '.tmp/mac-rental-demo-publish' push origin HEAD:refs/heads/master
~~~

Expected: push succeeds without force. Verify the established online Demo URL returns HTTP 200 and its ?smoke=1 result passes under the fixed smoke clock.

- [ ] **Step 5: Create the isolated asset publish worktree**

~~~powershell
git fetch origin
git worktree add -b publish/mac-rental-prd-assets-20260716 '.tmp/mac-rental-assets-publish' refs/remotes/origin/publish/mac-rental-prd-assets-20260715
~~~

Expected: the worktree is based on the last Mac rental asset branch.

- [ ] **Step 6: Replace only the Mac rental asset directory**

~~~powershell
$sourceDir = (Resolve-Path 'prd\【盖世游戏Mac】游戏租号需求\图片和附件\PRD截图').Path
$worktreeRoot = (Resolve-Path '.tmp\mac-rental-assets-publish').Path
$destinationDir = Join-Path $worktreeRoot 'public\prd\mac-rental'
if(-not $destinationDir.StartsWith($worktreeRoot,[System.StringComparison]::OrdinalIgnoreCase)){ throw 'Asset destination escaped publish worktree' }
New-Item -ItemType Directory -Force $destinationDir | Out-Null
Get-ChildItem -LiteralPath $sourceDir -Filter '*.png' -File | Copy-Item -Destination $destinationDir -Force
(Get-ChildItem -LiteralPath $destinationDir -Filter '*.png' -File | Measure-Object).Count
git -C '.tmp/mac-rental-assets-publish' status --short
git -C '.tmp/mac-rental-assets-publish' diff --check
~~~

Expected: the count is 25 and changes are limited to public/prd/mac-rental.

- [ ] **Step 7: Commit and publish immutable assets**

~~~powershell
git -C '.tmp/mac-rental-assets-publish' add -- 'public/prd/mac-rental'
git -C '.tmp/mac-rental-assets-publish' commit -m "docs: publish mac rental lifecycle screenshots"
git -C '.tmp/mac-rental-assets-publish' push origin HEAD:refs/heads/publish/mac-rental-prd-assets-20260716
$assetSha = git -C '.tmp/mac-rental-assets-publish' rev-parse HEAD
~~~

Expected: assetSha is a full 40-character commit hash.

- [ ] **Step 8: Replace PRD screenshot URLs with the immutable SHA**

Construct every affected image URL from the real asset SHA:

~~~powershell
$cdnBase = 'https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@' + $assetSha + '/public/prd/mac-rental/'
$cdnBase
~~~

Expected: the printed base contains the actual 40-character assetSha from Step 7. Append the exact screenshot filename in each Markdown image URL; no branch URL, latest URL or local path is allowed.

- [ ] **Step 9: Verify all CDN objects**

Request all 25 URLs.

Expected for every response: HTTP 200 and Content-Type image/png. Retry CDN propagation checks without changing the SHA; do not substitute a mutable branch URL.

- [ ] **Step 10: Commit the immutable PRD references**

~~~powershell
git add -- 'prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md'
git diff --cached --check
git commit -m "docs: pin mac rental screenshots"
~~~

### Task 15: Final Regression And Delivery Audit

**Files:**
- Verify only: Mac端demo/mac端租号功能/Mac端租号功能-标注版.html
- Verify only: tools/capture-mac-rental-prd-screenshots.js
- Verify only: prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md

- [ ] **Step 1: Run the embedded smoke from a clean browser process**

Run the Task 1 smoke command with virtual-time-budget=10000.

Expected: one data-smoke-status="pass" match and zero "pass":false matches.

- [ ] **Step 2: Run static stale-copy checks**

~~~powershell
rg -n "compare-stats|stats\.compare|show-audit|auditOpen|1分钟后到期" 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
rg -n "游戏原价.*删除线|环比对比按钮|到期.*宽限" 'prd\【盖世游戏Mac】游戏租号需求\【Prd】《盖世游戏Mac》游戏租号需求.md'
rg -n "file://|[A-Za-z]:\\\\|图片和附件/PRD截图" 'prd\【盖世游戏Mac】游戏租号需求\【Prd】《盖世游戏Mac》游戏租号需求.md'
~~~

Expected: no stale implementation references, stale positive requirements or local image links.

- [ ] **Step 3: Verify coverage against the design spec**

Check every acceptance item in docs/superpowers/specs/2026-07-16-mac-rental-expiry-renewal-audit-design.md against at least one passing smoke assertion or a visually inspected screenshot. Record any environment-only item, such as real macOS system overlays or server-side atomic reservation, as a production integration requirement rather than claiming the HTML Demo proves it.

- [ ] **Step 4: Verify repository hygiene**

~~~powershell
git diff --check
git status --short
git log --oneline -12
~~~

Expected: no whitespace errors; only known pre-existing unrelated worktree changes remain; recent commits correspond to the scoped tasks.

- [ ] **Step 5: Produce the delivery note**

Report completed behavior, smoke result, screenshots inspected, PRD synchronization, production-only integration limits and any pre-existing unrelated dirty files left untouched.

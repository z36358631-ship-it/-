# APP QR Login Review Revisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 更新盖世游戏 App 扫码登录 Mac 的标注 Demo 与最终 PRD，落实扫描结果页、跨区拦截、多账号默认全选可取消、分阶段有效期和端到端加密边界。

**Architecture:** 保留现有单文件三栏标注 Demo 和 Mac/App 页面骨架，用统一状态名驱动左侧导航、中间页面和右侧规则；在 App 本地页态与跨端请求态之间建立明确映射。PRD 继续使用一个最终规则源，截图先由 Demo 自动生成，再整理到发布目录；GitHub 推送、远程图片验证和飞书群发送保留为执行时确认门禁。

**Tech Stack:** 离线 HTML/CSS/JavaScript、Node.js、`playwright-core`、SVG、PowerShell、Markdown、`taskctl`。

---

## 文件结构

### Demo 工作树 `C:\Users\z3635\官网改动-prd-quality`

- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录Mac端交互标注版demo.html`：页面、状态、账号选择、标注和演示逻辑。
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录功能流程图.svg`：最终跨端数据流与异常分支。
- Generate: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录功能流程图.png`：SVG 对应 PNG。
- Modify: `tools/verify-mac-qr-login-result-states.mjs`：DOM、交互、状态、账号集合、计时和截图回归。
- Generate: `.../图片和附件/image 13.png`：扫描结果页。
- Generate: `.../图片和附件/image 14.png`：区服不一致。
- Generate: `.../图片和附件/image 15.png`：多账号选择确认页。

### 主工作树 `C:\Users\z3635\官网改动`

- Modify: `prd/最终文档/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`：V1.1 最终规则、黄色修改标记、截图与埋点。
- Create: `public/prd/mac-qr-login/*.png`：19 张固定发布图片，供 PRD 使用不可变提交 SHA。
- Create: `prd/最终文档/【Prd】《盖世游戏》移动端扫码登录Mac端需求/评审修改记录-2026.08.17.md`：飞书群编号修改记录。

## Task 1: 先扩展 Demo 回归测试

**Files:**
- Modify: `C:\Users\z3635\官网改动-prd-quality\tools\verify-mac-qr-login-result-states.mjs`
- Test: `C:\Users\z3635\官网改动-prd-quality\tools\verify-mac-qr-login-result-states.mjs`

- [ ] **Step 1: 把场景断言改为统一状态名**

将现有场景数组替换为：

```js
const scenarios = [
  'waiting_scan',
  'scanning',
  'scan_result',
  'region_mismatch',
  'permission_denied',
  'pending_confirm',
  'authorizing',
  'ready_to_claim',
  'used',
  'authorization_failed',
  'expired',
  'cancelled',
];

for (const scenario of scenarios) {
  await select(scenario);
}
```

- [ ] **Step 2: 增加扫描结果页失败用例**

在状态循环之后增加：

```js
await select('scan_result');
assert.equal(await page.locator('#scanResultTitle').textContent(), '扫描结果');
assert.equal(await page.locator('#scanResultLink').textContent(), 'https://www.baidu.com');
assert.equal(await page.locator('#scanResultLink').getAttribute('href'), 'https://www.baidu.com');
assert.equal(await page.locator('#scanResultText:visible').count(), 0);
assert.equal(await page.locator('#scanResultLink').getAttribute('target'), '_blank');
assert.equal(await page.locator('#scanResultLink').getAttribute('rel'), 'noopener noreferrer');
assert.equal(await page.evaluate(() => window.__qrLoginDemo.getRequestState()), 'waiting_scan');

await page.evaluate(() => window.__qrLoginDemo.showScanResult('javascript:alert(1)'));
assert.equal(await page.locator('#scanResultLink:visible').count(), 0);
assert.equal(await page.locator('#scanResultText').textContent(), 'javascript:alert(1)');

await page.locator('#scanResultCloseBtn').click();
assert(await page.locator('#minePage').evaluate((element) => element.classList.contains('show')));
assert.equal(await page.evaluate(() => window.__qrLoginDemo.getRequestState()), 'waiting_scan');
```

- [ ] **Step 3: 增加区服不一致失败用例**

```js
await select('region_mismatch');
assert.equal(
  await page.locator('#scanResultText').textContent(),
  '当前 App 与 Mac 端地区版本不一致，无法登录，请使用同地区版本重新扫码。',
);
assert.equal(await page.locator('#scanResultLink:visible').count(), 0);
assert.equal(await page.evaluate(() => window.__qrLoginDemo.getRequestState()), 'waiting_scan');
```

- [ ] **Step 4: 增加多账号选择失败用例**

```js
await select('pending_confirm');
assert.equal(await page.locator('.account-choice').count(), 7);
assert.equal(await page.locator('.account-choice:checked').count(), 7);
assert.equal(await page.locator('#accountSelectionSummary').textContent(), '本次将登录 7 个平台账号');
assert(
  await page.locator('#mobilePlatforms').evaluate((element) => element.scrollHeight > element.clientHeight),
  '超过 5 个账号时容器必须可滚动',
);

await page.locator('.account-choice').nth(1).uncheck();
await page.locator('.account-choice').nth(5).uncheck();
assert.equal(await page.locator('#accountSelectionSummary').textContent(), '本次将登录 5 个平台账号');

for (const checkbox of await page.locator('.account-choice').all()) {
  await checkbox.uncheck();
}
assert.equal(await page.locator('#accountSelectionSummary').textContent(), '本次仅登录盖世账号');
assert.equal(await page.locator('#confirmLoginBtn').isEnabled(), true);

await page.locator('.account-choice').nth(0).check();
await page.locator('.account-choice').nth(3).check();
await page.locator('#confirmLoginBtn').click();
assert.deepEqual(
  await page.evaluate(() => window.__qrLoginDemo.getSubmittedPlatformAccountIds()),
  ['steam-main', 'epic-main'],
);
```

- [ ] **Step 5: 增加分阶段计时失败用例**

```js
await select('waiting_scan');
const waitingLifecycle = await page.evaluate(() => window.__qrLoginDemo.getLifecycleSnapshot());
await page.waitForTimeout(20);
await select('pending_confirm');
const confirmLifecycle = await page.evaluate(() => window.__qrLoginDemo.getLifecycleSnapshot());
assert.equal(waitingLifecycle.requestState, 'waiting_scan');
assert.equal(confirmLifecycle.requestState, 'pending_confirm');
assert(confirmLifecycle.stageVersion > waitingLifecycle.stageVersion);
assert(confirmLifecycle.startedAt > waitingLifecycle.startedAt);

await page.evaluate(() => window.__qrLoginDemo.expireCurrentStage());
assert.equal(await page.evaluate(() => window.__qrLoginDemo.getRequestState()), 'expired');
```

- [ ] **Step 6: 增加截图输出**

```js
await select('scan_result');
await page.locator('.phone').screenshot({ path: path.join(assetDir, 'image 13.png') });
await select('region_mismatch');
await page.locator('.phone').screenshot({ path: path.join(assetDir, 'image 14.png') });
await select('pending_confirm');
await page.locator('.phone').screenshot({ path: path.join(assetDir, 'image 15.png') });
```

- [ ] **Step 7: 运行测试确认先失败**

Run:

```powershell
node tools/verify-mac-qr-login-result-states.mjs
```

Expected: FAIL，首个错误为 `scan_result 状态未激活`、`#scanResultTitle` 缺失或 `.account-choice` 数量为 `0`。

- [ ] **Step 8: 提交测试**

```powershell
git add -- tools/verify-mac-qr-login-result-states.mjs
git commit -m "test: cover qr login review revisions"
```

## Task 2: 统一 Demo 场景名和请求生命周期

**Files:**
- Modify: `C:\Users\z3635\官网改动-prd-quality\prd\【Prd】《盖世游戏》移动端扫码登录Mac端需求\图片和附件\扫码登录Mac端交互标注版demo.html`
- Test: `C:\Users\z3635\官网改动-prd-quality\tools\verify-mac-qr-login-result-states.mjs`

- [ ] **Step 1: 统一所有 `data-scenario` 值**

按下表替换左侧导航、顶部状态按钮、`stateLabels`、`detailContent` 和测试调用：

| 旧值 | 新值 |
|---|---|
| `wait` | `waiting_scan` |
| `permissionDenied` | `permission_denied` |
| `confirm` | `pending_confirm` |
| `readyToClaim` | `ready_to_claim` |
| `success` | `used` |
| `authorizationFailed` | `authorization_failed` |

`scanning`、`authorizing`、`expired`、`cancelled` 保持不变；新增 `scan_result` 和 `region_mismatch`。

- [ ] **Step 2: 增加请求生命周期控制器**

在 `setScenario` 之前加入：

```js
const TIMED_REQUEST_STATES = new Set(['waiting_scan', 'pending_confirm']);
const FINAL_REQUEST_STATES = new Set(['used', 'authorization_failed', 'expired', 'cancelled']);
let currentRequestState = 'waiting_scan';
let requestStageTimer = 0;
let requestStageStartedAt = 0;
let requestStageVersion = 0;

function enterRequestState(state) {
  window.clearTimeout(requestStageTimer);
  currentRequestState = state;
  requestStageStartedAt = Date.now();
  requestStageVersion += 1;
  if (TIMED_REQUEST_STATES.has(state)) {
    requestStageTimer = window.setTimeout(function() {
      setScenario('expired');
    }, 120000);
  }
}

function expireCurrentStage() {
  if (TIMED_REQUEST_STATES.has(currentRequestState)) setScenario('expired');
}
```

- [ ] **Step 3: 只让跨端请求态推进生命周期**

在 `setScenario(type, options)` 内使用：

```js
if (TIMED_REQUEST_STATES.has(type) || FINAL_REQUEST_STATES.has(type) || type === 'authorizing' || type === 'ready_to_claim') {
  enterRequestState(type);
}
```

`scanning`、`scan_result`、`region_mismatch`、`permission_denied` 不调用 `enterRequestState`，因此不会占用或终止 Mac challenge。

- [ ] **Step 4: 更新刷新逻辑和调试接口**

```js
function refreshQr() {
  window.clearTimeout(autoLoginTimer);
  currentRequestId += 1;
  qrChallengeSeed += 1;
  qrShell.dataset.challengeId = 'QR-DEMO-' + qrChallengeSeed;
  drawQr(qrChallengeSeed);
  setScenario('waiting_scan');
}

window.__qrLoginDemo = {
  setScenario,
  refreshQr,
  expireCurrentStage,
  getRequestState: function() { return currentRequestState; },
  getLifecycleSnapshot: function() {
    return {
      requestId: currentRequestId,
      requestState: currentRequestState,
      startedAt: requestStageStartedAt,
      stageVersion: requestStageVersion,
    };
  },
  getNotifiedResultCount: function() { return notifiedResults.size; },
  getCurrentRequestId: function() { return currentRequestId; },
};
```

- [ ] **Step 5: 运行测试确认状态名通过、页面功能仍失败**

Run: `node tools/verify-mac-qr-login-result-states.mjs`

Expected: 场景名检查通过，随后 FAIL 于 `#scanResultTitle` 或账号选择断言。

- [ ] **Step 6: 提交生命周期改动**

```powershell
git add -- 'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录Mac端交互标注版demo.html'
git commit -m "refactor: align qr login demo states"
```

## Task 3: 实现扫描结果页与跨区结果

**Files:**
- Modify: `C:\Users\z3635\官网改动-prd-quality\prd\【Prd】《盖世游戏》移动端扫码登录Mac端需求\图片和附件\扫码登录Mac端交互标注版demo.html`
- Test: `C:\Users\z3635\官网改动-prd-quality\tools\verify-mac-qr-login-result-states.mjs`

- [ ] **Step 1: 增加结果页 CSS**

在扫码页样式之后加入：

```css
.scan-result-page {
  padding: 54px 0 0;
  color: #111;
  background: #fff;
}
.scan-result-page.show { display: block; }
.scan-result-header {
  height: 66px;
  display: grid;
  grid-template-columns: 66px 1fr 66px;
  align-items: center;
  background: #f1f1f1;
  border-bottom: 1px solid #e6e6e6;
}
.scan-result-close {
  width: 44px;
  height: 44px;
  margin-left: 8px;
  position: relative;
  background: transparent;
}
.scan-result-close::before,
.scan-result-close::after {
  content: '';
  position: absolute;
  left: 11px;
  top: 21px;
  width: 24px;
  height: 2px;
  background: #111;
}
.scan-result-close::before { transform: rotate(45deg); }
.scan-result-close::after { transform: rotate(-45deg); }
.scan-result-header h2 { text-align: center; font-size: 18px; font-weight: 600; }
.scan-result-content {
  max-height: calc(100% - 66px);
  padding: 18px 16px 40px;
  overflow-y: auto;
  font-size: 16px;
  line-height: 24px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.scan-result-content a { color: #0000ee; text-decoration: underline; }
```

- [ ] **Step 2: 增加结果页 DOM**

在扫码页之后、确认页之前加入：

```html
<section class="phone-page scan-result-page" id="scanResultPage">
  <header class="scan-result-header">
    <button class="scan-result-close" id="scanResultCloseBtn" type="button" aria-label="关闭扫描结果"></button>
    <h2 id="scanResultTitle">扫描结果</h2>
    <span aria-hidden="true"></span>
  </header>
  <div class="scan-result-content">
    <a id="scanResultLink" target="_blank" rel="noopener noreferrer"></a>
    <span id="scanResultText"></span>
  </div>
</section>
```

- [ ] **Step 3: 实现安全内容渲染**

```js
function showScanResult(value) {
  const rawValue = String(value ?? '');
  const link = document.getElementById('scanResultLink');
  const text = document.getElementById('scanResultText');
  const isSafeUrl = /^https?:\/\//i.test(rawValue);
  link.hidden = !isSafeUrl;
  text.hidden = isSafeUrl;
  link.textContent = isSafeUrl ? rawValue : '';
  link.href = isSafeUrl ? rawValue : '';
  text.textContent = isSafeUrl ? '' : rawValue;
  showPhonePage('scanResult');
}
```

把 `scanResult: document.getElementById('scanResultPage')` 加入 `pages`，并在 `setScenario` 中使用：

```js
if (type === 'scan_result') showScanResult('https://www.baidu.com');
if (type === 'region_mismatch') {
  showScanResult('当前 App 与 Mac 端地区版本不一致，无法登录，请使用同地区版本重新扫码。');
}
```

- [ ] **Step 4: 实现关闭行为**

```js
document.getElementById('scanResultCloseBtn').addEventListener('click', function() {
  showPhonePage('mine');
  document.querySelectorAll('.scenario').forEach(function(button) {
    button.classList.toggle('active', button.dataset.scenario === 'waiting_scan');
  });
  renderDetail('waiting_scan');
  document.getElementById('phoneState').textContent = '我的页扫一扫';
});
```

将 `showScanResult` 暴露到 `window.__qrLoginDemo`。

- [ ] **Step 5: 运行扫描结果测试**

Run: `node tools/verify-mac-qr-login-result-states.mjs`

Expected: 扫描结果、危险协议、关闭和区服不一致断言 PASS；账号选择断言仍 FAIL。

- [ ] **Step 6: 提交结果页**

```powershell
git add -- 'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录Mac端交互标注版demo.html'
git commit -m "feat: add qr scan result states"
```

## Task 4: 实现多平台账号默认全选可取消

**Files:**
- Modify: `C:\Users\z3635\官网改动-prd-quality\prd\【Prd】《盖世游戏》移动端扫码登录Mac端需求\图片和附件\扫码登录Mac端交互标注版demo.html`
- Test: `C:\Users\z3635\官网改动-prd-quality\tools\verify-mac-qr-login-result-states.mjs`

- [ ] **Step 1: 把确认账号容器限制为五行并增加选择样式**

```css
.confirm-platform-list {
  max-height: 322px;
  overflow-y: auto;
  scrollbar-width: thin;
  padding-right: 2px;
}
.selectable-account { cursor: pointer; }
.selectable-account:focus-within {
  border-color: rgba(85,189,240,.72);
  box-shadow: 0 0 0 2px rgba(85,189,240,.14);
}
.account-choice {
  width: 20px;
  height: 20px;
  accent-color: #1296db;
}
.account-selection-summary {
  margin-top: 10px;
  color: rgba(126,205,255,.88);
  font-size: 12px;
  line-height: 18px;
  text-align: left;
}
```

- [ ] **Step 2: 更新确认页文案和摘要节点**

把“已绑定账号”改为“本次登录账号”，删除“确认后将在此 Mac 自动登录以上全部平台”，加入：

```html
<p class="account-selection-summary" id="accountSelectionSummary" aria-live="polite">
  本次将登录 7 个平台账号
</p>
```

- [ ] **Step 3: 使用完整数据模型渲染七个账号**

```js
const platformAccounts = [
  { id: 'steam-main', platform: 'Steam', nickname: '盖世玩家11837' },
  { id: 'steam-cn', platform: 'Steam', nickname: 'Steam_CN_02' },
  { id: 'steam-jp', platform: 'Steam', nickname: 'Steam_JP_03' },
  { id: 'epic-main', platform: 'Epic', nickname: 'EpicPlayer_11837' },
  { id: 'steam-family', platform: 'Steam', nickname: 'FamilySteam_04' },
  { id: 'epic-alt', platform: 'Epic', nickname: 'EpicAlt_02' },
  { id: 'steam-test', platform: 'Steam', nickname: 'Steam_Test_05' },
];
let selectedPlatformAccountIds = new Set(platformAccounts.map((account) => account.id));
let submittedPlatformAccountIds = [];

function renderSelectableAccounts() {
  mobilePlatforms.innerHTML = platformAccounts.map(function(account) {
    const checked = selectedPlatformAccountIds.has(account.id) ? ' checked' : '';
    const platformClass = account.platform.toLowerCase();
    return '<label class="platform-card selectable-account">' +
      '<span class="platform-logo ' + platformClass + '-logo">' + account.platform.slice(0, 1) + '</span>' +
      '<span><strong>' + account.nickname + '</strong><small>' + account.platform + ' 已绑定</small></span>' +
      '<input class="account-choice" type="checkbox" value="' + account.id + '" aria-label="选择 ' + account.platform + ' 账号 ' + account.nickname + '"' + checked + '>' +
      '</label>';
  }).join('');
  bindAccountChoices();
  updateAccountSelectionSummary();
}

function bindAccountChoices() {
  document.querySelectorAll('.account-choice').forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
      if (checkbox.checked) selectedPlatformAccountIds.add(checkbox.value);
      else selectedPlatformAccountIds.delete(checkbox.value);
      updateAccountSelectionSummary();
    });
  });
}

function updateAccountSelectionSummary() {
  const count = selectedPlatformAccountIds.size;
  document.getElementById('accountSelectionSummary').textContent = count
    ? '本次将登录 ' + count + ' 个平台账号'
    : '本次仅登录盖世账号';
}
```

- [ ] **Step 4: 在进入确认页时重置为默认全选**

```js
function resetPlatformAccountSelection() {
  selectedPlatformAccountIds = new Set(platformAccounts.map((account) => account.id));
  renderSelectableAccounts();
}
```

仅在新的 `pending_confirm` 请求进入时调用；用户在同一确认页内切换状态不得无故重置。

- [ ] **Step 5: 提交选中集合并锁定 UI**

```js
document.getElementById('confirmLoginBtn').addEventListener('click', function() {
  submittedPlatformAccountIds = platformAccounts
    .filter((account) => selectedPlatformAccountIds.has(account.id))
    .map((account) => account.id);
  document.querySelectorAll('.account-choice').forEach((checkbox) => { checkbox.disabled = true; });
  setScenario('authorizing');
  window.clearTimeout(autoLoginTimer);
  autoLoginTimer = window.setTimeout(function() {
    setScenario('ready_to_claim');
    autoLoginTimer = window.setTimeout(function() { setScenario('used'); }, 1000);
  }, 1000);
});
```

向 `window.__qrLoginDemo` 增加：

```js
getSubmittedPlatformAccountIds: function() { return [...submittedPlatformAccountIds]; },
```

- [ ] **Step 6: 运行完整自动测试**

Run: `node tools/verify-mac-qr-login-result-states.mjs`

Expected: `mac qr login result states: PASS`。

- [ ] **Step 7: 提交账号选择功能**

```powershell
git add -- 'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录Mac端交互标注版demo.html'
git commit -m "feat: allow qr platform account selection"
```

## Task 5: 更新标注、流程图和视觉证据

**Files:**
- Modify: `C:\Users\z3635\官网改动-prd-quality\prd\【Prd】《盖世游戏》移动端扫码登录Mac端需求\图片和附件\扫码登录Mac端交互标注版demo.html`
- Modify: `C:\Users\z3635\官网改动-prd-quality\prd\【Prd】《盖世游戏》移动端扫码登录Mac端需求\图片和附件\扫码登录功能流程图.svg`
- Modify: `C:\Users\z3635\官网改动-prd-quality\tools\verify-mac-qr-login-result-states.mjs`
- Generate: `C:\Users\z3635\官网改动-prd-quality\prd\【Prd】《盖世游戏》移动端扫码登录Mac端需求\图片和附件\扫码登录功能流程图.png`
- Generate: `...\图片和附件\image 13.png`
- Generate: `...\图片和附件\image 14.png`
- Generate: `...\图片和附件\image 15.png`

- [ ] **Step 1: 增加左侧导航和顶部状态按钮**

在 `scanning` 后插入 `scan_result` 和 `region_mismatch`，重新连续编号 1—12；副标题分别使用“读取普通二维码内容”和“国内/海外版本不一致”。

- [ ] **Step 2: 补齐右侧交互与边界标注**

`detailContent.scan_result` 必须包含：页面结构、关闭返回、HTTP/HTTPS 手动打开、纯文本显示；边界包含危险协议不可点击、长内容滚动、Mac challenge 不变。

`detailContent.region_mismatch` 必须包含：按产品地区字段判断、不使用 IP、不会占用 challenge、正确地区 App 仍可继续扫码。

`detailContent.pending_confirm` 必须替换“全部自动继承、不提供开关”为：默认全选、允许取消、0 个平台账号时只登录盖世账号、最多可见五行但全量数据不截断。

- [ ] **Step 3: 更新流程图文字与分支**

将流程图关键文字改为：

```xml
<text class="subtitle" x="80" y="124">一次性 challenge · 同地区校验 · 本次账号选择 · 端到端加密中转</text>
```

扫码步骤增加“普通二维码 → 扫描结果页”“地区不一致 → 不占用 challenge”；确认步骤改为“平台账号默认全选，可取消个别账号”；服务端部分改为“盖世账号签发 + 平台凭证密文中转，服务端不可解密”。异常区明确 `waiting_scan` 和 `pending_confirm` 分别 2 分钟。

- [ ] **Step 4: 让验证脚本重新渲染 SVG**

在 Demo 测试完成后加入：

```js
const flowSvgPath = path.join(assetDir, '扫码登录功能流程图.svg');
const flowPngPath = path.join(assetDir, '扫码登录功能流程图.png');
await page.setViewportSize({ width: 1600, height: 2280 });
await page.goto(pathToFileURL(flowSvgPath).href, { waitUntil: 'load' });
await page.locator('svg').screenshot({ path: flowPngPath });
```

- [ ] **Step 5: 运行测试并生成四张图片**

Run: `node tools/verify-mac-qr-login-result-states.mjs`

Expected: `mac qr login result states: PASS`，并更新流程图 PNG、`image 13.png`、`image 14.png`、`image 15.png`。

- [ ] **Step 6: 使用浏览器人工审图**

用本地 HTTP 服务打开 Demo，在 `1920×1080` 检查：

- 三栏布局无重叠。
- 扫描结果页与用户截图结构一致。
- 七账号确认页不超出手机容器，列表出现内部滚动。
- 左侧导航、右侧 Tab、标注切换和 Mac 页面完整。

Expected: 无横向裁切、无页面溢出、无控制台错误。新增结果页以用户截图为结构证据，不宣称已有 GameHub 组件严格视觉 PASS。

- [ ] **Step 7: 提交 Demo、流程图和截图**

```powershell
git add -- 'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录Mac端交互标注版demo.html' `
  'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录功能流程图.svg' `
  'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录功能流程图.png' `
  'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 13.png' `
  'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 14.png' `
  'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 15.png' `
  tools/verify-mac-qr-login-result-states.mjs
git commit -m "feat: document qr login review states"
```

## Task 6: 修订最终 PRD 与埋点口径

**Files:**
- Modify: `C:\Users\z3635\官网改动\prd\最终文档\【Prd】《盖世游戏》移动端扫码登录Mac端需求\【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`
- Test: `C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1`

- [ ] **Step 1: 追加 V1.1 版本记录**

```markdown
|<span style="background-color: #FEF794;">2026\.08\.17</span>|<span style="background-color: #FEF794;">V1\.1</span>|<span style="background-color: #FEF794;">郑群超</span>|<span style="background-color: #FEF794;">增加扫描结果页、同地区校验和平台账号选择；调整分阶段有效期、设备信息来源及端到端加密边界</span>|<span style="background-color: #FEF794;">影响 2\.2、3\.1、4\.2、4\.3、五、六 //2026.8.17修改</span>|
```

- [ ] **Step 2: 修改范围和核心流程**

最终规则必须明确：

```markdown
|平台范围|<span style="background-color: #FEF794;">盖世账号固定登录；Steam、Epic 具体账号默认全选，用户可取消任意部分或全部平台账号；全部取消后仅登录盖世账号 //2026.8.17修改</span>|
|地区范围|<span style="background-color: #FEF794;">国内 App 仅登录国内 Mac，海外 App 仅登录海外 Mac；按产品地区字段判断，不使用 IP 判断 //2026.8.17修改</span>|
```

核心流程改为：

```markdown
<span style="background-color: #FEF794;">`Mac 展示二维码 → App 扫码并校验内容/地区 → App 选择本次平台账号并确认 → 平台凭证端到端加密中转 → Mac 领取、解密并持久化 → Mac ACK → 双端返回结果` //2026.8.17修改</span>
```

- [ ] **Step 3: 修改 C 端主表**

在扫码页之后增加“App－扫描结果”和“App－区服不一致”两行；把登录确认行替换为默认全选可取消规则；把过期规则改为 `waiting_scan` 与 `pending_confirm` 分别 2 分钟；国内展示市级位置、海外隐藏位置。

每个新增或替换单元格只包裹目标文字，并以 `//2026.8.17修改` 结尾。

- [ ] **Step 4: 修改服务端状态与关键规则**

状态表使用唯一枚举：

```markdown
waiting_scan / pending_confirm / authorizing / ready_to_claim / used / authorization_failed / expired / cancelled / invalid
```

增加同地区校验不占用 challenge、`pending_confirm` 重新计时、选中账号集合作为本次授权范围；把“服务端签发全部平台会话”替换为“盖世账号设备会话由服务端签发，选中平台凭证以目标 Mac 可解密的密文包中转”。

- [ ] **Step 5: 修复事件表和参数表一致性**

增加事件：

```markdown
|`mobile_qr_scan_result_show`|普通二维码结果页曝光|识别到可解析但非盖世登录二维码|`scanned_content_type`|
|`mobile_qr_region_mismatch`|扫码地区不一致|登录二维码地区与 App 产品地区不一致|`source_region`, `target_region`|
|`mobile_qr_account_selection_change`|本次平台账号选择变化|用户选择或取消具体平台账号|`available_platform_account_count`, `selected_platform_account_count`|
```

参数表增加 `app_version`、`expire_seconds`、`scanned_content_type`、`source_region`、`target_region`、`available_platform_account_count`、`selected_platform_account_count`；为原有 `device_name`、`login_city`、`device_type`、`permission_result`、`current_uid`、`target_uid` 找到实际引用或删除未使用定义。账号昵称、第三方账号 ID 和选中账号明细不得进入埋点。

- [ ] **Step 6: 运行质量校验确认只剩图片发布问题**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1' `
  -Path 'C:\Users\z3635\官网改动\prd\最终文档\【Prd】《盖世游戏》移动端扫码登录Mac端需求\【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
```

Expected: 埋点一致性错误为 0；图片仍使用相对路径时，只允许保留 `INVALID_IMAGE_URL`，不得出现状态、事件或参数错误。

## Task 7: 生成固定图片资产并替换 PRD 图片链接

**Files:**
- Create: `C:\Users\z3635\官网改动\public\prd\mac-qr-login\01-flow.png` 至 `19-region-mismatch.png`
- Modify: `C:\Users\z3635\官网改动\prd\最终文档\【Prd】《盖世游戏》移动端扫码登录Mac端需求\【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`

- [ ] **Step 1: 按固定语义名称复制现有和新增截图**

使用以下映射，目标全部位于 `public/prd/mac-qr-login/`：

| 目标 | 来源 |
|---|---|
| `01-flow.png` | quality 工作树 `扫码登录功能流程图.png` |
| `02-mac-wait.png` | quality `image 7.png` |
| `03-app-profile.png` | quality `image.png` |
| `04-permission-guide.png` | quality `image 5.png` |
| `05-scanner.png` | quality `image 1.png` |
| `06-confirm-account-selection.png` | quality `image 15.png` |
| `07-mac-pending-confirm.png` | quality `image 4.png` |
| `08-app-authorizing.png` | quality `image 9.png` |
| `09-app-ready-to-claim.png` | quality `image 11.png` |
| `10-app-success.png` | quality `image 8.png` |
| `11-app-auth-failed.png` | main 最终文档图片目录 `image 2.png` |
| `12-app-cancelled.png` | main 最终文档图片目录 `image 1.png` |
| `13-app-expired.png` | main 最终文档图片目录 `image.png` |
| `14-mac-return.png` | quality `image 6.png` |
| `15-mac-auth-failed.png` | quality `image 10.png` |
| `16-mac-cancelled.png` | quality `image 3.png` |
| `17-mac-expired.png` | quality `image 12.png` |
| `18-scan-result.png` | quality `image 13.png` |
| `19-region-mismatch.png` | quality `image 14.png` |

- [ ] **Step 2: 提交固定图片资产**

```powershell
git add -- public/prd/mac-qr-login
git diff --cached --name-only
git commit -m "assets: add mac qr login prd images"
$assetCommitSha = git rev-parse HEAD
$assetCommitSha
```

Expected: 输出一个 40 位提交 SHA，且暂不推送。

- [ ] **Step 3: 用实际 SHA 替换全部 Markdown 图片**

每张图使用同一个 `$assetCommitSha`，文件名逐一取自上表。首张图的完整形式为：

```text
https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@${assetCommitSha}/public/prd/mac-qr-login/01-flow.png
```

图片短标题使用“核心流程”“等待扫码”“扫码入口”“相机权限”“扫码页”“登录确认”“等待确认”“授权中”“待 Mac 领取”“登录成功”“授权失败”“登录取消”“二维码过期”“返回业务页”“Mac 授权失败”“Mac 登录取消”“Mac 二维码过期”“扫描结果”“区服不一致”。

- [ ] **Step 4: 本地验证固定 URL 格式**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-images.ps1' `
  -PrdPath 'C:\Users\z3635\官网改动\prd\最终文档\【Prd】《盖世游戏》移动端扫码登录Mac端需求\【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
```

Expected: `status: PASS`、`imageCount: 19`、无 `INVALID_IMAGE_URL`；此时 `remoteVerified` 仍为 0。

- [ ] **Step 5: 运行 PRD 完整质量校验**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1' `
  -Path 'C:\Users\z3635\官网改动\prd\最终文档\【Prd】《盖世游戏》移动端扫码登录Mac端需求\【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
```

Expected: `result: Pass`、`errorCount: 0`；允许保留“当前替代方式/成功指标”非阻塞警告时，必须在交付中原样说明。

- [ ] **Step 6: 提交 PRD**

```powershell
git add -- 'prd/最终文档/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md'
git diff --cached --name-only
git commit -m "docs: revise app mac qr login prd"
```

## Task 8: 生成飞书修改记录并完成本地验收

**Files:**
- Create: `C:\Users\z3635\官网改动\prd\最终文档\【Prd】《盖世游戏》移动端扫码登录Mac端需求\评审修改记录-2026.08.17.md`

- [ ] **Step 1: 写入一行一个改动点的编号记录**

文件内容固定为：

```markdown
# APP 扫码登录 Mac 端需求评审修改记录（2026.08.17）

1. 非盖世登录二维码改为进入独立“扫描结果”页，URL 仅在用户主动点击后打开，其他内容按纯文本展示。
2. 增加国内与海外版本一致性校验，地区不一致时不占用二维码并提示使用同地区版本重新扫码。
3. 盖世账号固定登录；Steam、Epic 具体账号默认全部选中，用户可取消部分或全部平台账号。
4. 平台账号列表最多可见 5 行，超过后容器内滚动，展示高度不影响完整账号数据和本次授权范围。
5. `waiting_scan` 和 `pending_confirm` 分别计算 2 分钟有效期，进入待确认后重新计时，终态继续手动刷新二维码。
6. 设备名称、登录位置和地区由 Mac 创建二维码时提供；国内展示市级位置，海外不展示位置。
7. 盖世账号会话由服务端签发，选中平台凭证使用目标 Mac 可解密的端到端加密包中转，服务端不记录明文凭证。
8. 同步补充扫描结果、跨区、多账号选择、分阶段超时和安全边界的埋点及验收规则。
```

- [ ] **Step 2: 运行黄色修改标记检查**

Run:

```powershell
$prd = Get-Content -LiteralPath 'prd\最终文档\【Prd】《盖世游戏》移动端扫码登录Mac端需求\【Prd】《盖世游戏》移动端扫码登录Mac端需求.md' -Raw -Encoding UTF8
if ($prd -notmatch '2026\.8\.17修改') { throw '缺少 2026.8.17 修改标记' }
if ($prd -match '==[^=]+==|<mark>') { throw '发现飞书不兼容高亮语法' }
if ($prd -notmatch '<span style="background-color: #FEF794;">') { throw '缺少飞书黄色高亮' }
```

Expected: 命令退出码 0。

- [ ] **Step 3: 检查两个工作树只包含本任务文件**

Run:

```powershell
git status --short -- 'docs/superpowers' 'public/prd/mac-qr-login' 'prd/最终文档/【Prd】《盖世游戏》移动端扫码登录Mac端需求'
git -C 'C:\Users\z3635\官网改动-prd-quality' status --short -- `
  'tools/verify-mac-qr-login-result-states.mjs' `
  'prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求'
```

Expected: 本任务应提交文件无未提交改动；其他用户文件保持原状。

- [ ] **Step 4: 提交飞书修改记录**

```powershell
git add -- 'prd/最终文档/【Prd】《盖世游戏》移动端扫码登录Mac端需求/评审修改记录-2026.08.17.md'
git commit -m "docs: summarize qr login review changes"
```

## Task 9: 外部发布、飞书同步和任务板送审

**Files:**
- Read: `C:\Users\z3635\官网改动\prd\最终文档\【Prd】《盖世游戏》移动端扫码登录Mac端需求\评审修改记录-2026.08.17.md`
- Read: `C:\Users\z3635\官网改动\prd\最终文档\【Prd】《盖世游戏》移动端扫码登录Mac端需求\【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`

- [ ] **Step 1: 在外部操作前向用户确认两个精确动作**

确认内容必须包含：

1. 是否允许把当前包含 `public/prd/mac-qr-login` 图片资产的提交推送到 GitHub `origin`，用于生成飞书可抓取的固定 CDN 图片地址。
2. 指定需要发送的飞书群名称，并确认发送“8 条修改记录 + PRD 文件或链接”。

未获得确认时停止在本地已验证状态，不推送、不发送。

- [ ] **Step 2: 获得 GitHub 推送确认后推送当前分支**

```powershell
git branch --show-current
git push origin HEAD
```

Expected: push 成功，远端包含图片资产提交和 PRD 提交。

- [ ] **Step 3: 远程验证 19 张图片**

```powershell
powershell -ExecutionPolicy Bypass -File 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-images.ps1' `
  -PrdPath 'C:\Users\z3635\官网改动\prd\最终文档\【Prd】《盖世游戏》移动端扫码登录Mac端需求\【Prd】《盖世游戏》移动端扫码登录Mac端需求.md' `
  -VerifyRemote
```

Expected: `status: PASS`、`imageCount: 19`、`remoteVerified: 19`。

- [ ] **Step 4: 获得飞书群确认后发送编号修改记录和 PRD**

发送正文必须与 `评审修改记录-2026.08.17.md` 的 8 条内容一致，不追加敏感信息、账号凭证或内部路径。发送后保存成功界面证据。

- [ ] **Step 5: 向任务板添加完成评论**

先读取最新版本和评论，再执行：

```powershell
taskctl.cmd comment add GUANWANGGAID-33 --body "已完成 APP 扫码登录评审修改：更新标注 Demo、流程图、V1.1 PRD 和飞书修改记录；Demo 自动回归通过，PRD 质量与 19 张远程图片验证通过；飞书群同步已完成。剩余风险：真实端到端加密算法仍需研发与安全评审。" --json
```

- [ ] **Step 6: 将任务移到 `in_review`**

```powershell
$issue = taskctl.cmd issue get GUANWANGGAID-33 --json | ConvertFrom-Json
$issueVersion = $issue.task.version
taskctl.cmd issue move GUANWANGGAID-33 --status in_review --if-version $issueVersion --json
```

Expected: 任务状态为 `in_review`，不得直接移动到 `done`。

## 最终验收清单

- [ ] 普通二维码进入独立扫描结果页，URL 不自动打开，危险协议不可点击。
- [ ] 地区不一致不占用 challenge，正确地区 App 仍可扫码。
- [ ] 七账号默认全选，可取消任意部分或全部，0 个平台账号仍可确认。
- [ ] 列表最多可见五行但完整数据不截断。
- [ ] `waiting_scan` 与 `pending_confirm` 各自两分钟并分别重置。
- [ ] Demo 左中右三栏联动、原业务流程和键盘操作通过。
- [ ] 流程图与 PRD 使用同一状态、账号授权和加密口径。
- [ ] PRD 修改内容使用飞书黄色高亮并带 `//2026.8.17修改`。
- [ ] 埋点事件与参数一一对应，无账号明细进入埋点。
- [ ] 本地图片格式校验和 PRD 质量校验通过。
- [ ] 经用户确认后，远程图片 19/19 验证通过并完成飞书群同步。
- [ ] 任务板有完成评论并进入 `in_review`，未直接进入 `done`。

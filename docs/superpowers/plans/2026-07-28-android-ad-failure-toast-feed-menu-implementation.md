# Android 广告失败 Toast 与信息流菜单 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为四个激励广告场景补齐失败 Toast 和来源状态恢复，并将 M1/T1 信息流广告菜单收敛为单一“不感兴趣”操作。

**Architecture:** 以 `demos/Android广告接入-交互标注版.template.html` 作为唯一业务源码，通过独立 `deviceToast()` 将技术失败提示渲染在模拟设备内部；现有 `toast()` 继续承担 Demo 外壳与后台提示。信息流菜单沿用现有 `community.menuPlacement` 和 `hiddenAds` 状态，只删除举报分支及多余业务选项，最后通过构建脚本生成成品 HTML。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、Node.js 构建脚本、Playwright 浏览器验收

---

### Task 1: 先用自动化测试锁定失败反馈与菜单范围

**Files:**
- Modify: `tools/verify-android-ad-demo.mjs`
- Modify: `tools/verify-android-ad-demo-ui.mjs`

- [ ] **Step 1: 为静态检查增加新规则**

在 `tools/verify-android-ad-demo.mjs` 的激励和社区断言中加入：

```js
assert(html.includes('广告播放失败，请稍后重试'), 'Reward failure toast copy missing');
assert(html.includes('对此广告不感兴趣'), 'Single community dislike action missing');
assert(!html.includes('data-action="community-ad-report"'), 'Community report action should be removed');
assert(!html.includes('向平台反馈问题'), 'Legacy community report copy should be removed');
```

- [ ] **Step 2: 为浏览器测试增加失败 Toast 与状态恢复断言**

在 `tools/verify-android-ad-demo-ui.mjs` 中让 G1 失败用例依次验证：

```js
await page.click('[data-action="g1-watch"]');
await page.click('.scene-tools [data-action="reward-sim-fail"]');
assert.equal(await page.locator('.system-dialog').count(), 1, 'G1 prompt did not recover after ad failure');
assert.equal(await page.locator('.device .device-toast').count(), 1, 'Reward failure toast is not inside device');
assert((await text('.device .device-toast')).includes('广告播放失败，请稍后重试'));
```

把社区菜单用例改为：

```js
await page.locator('[data-action="community-ad-menu"]').click();
assert((await text('#modalBox')).includes('对此广告不感兴趣'));
assert(!(await text('#modalBox')).includes('举报广告'));
assert.equal(await page.locator('#modalBox [data-action="community-ad-hide"]').count(), 1);
assert.equal(await page.locator('#modalBox [data-action="community-ad-report"]').count(), 0);
```

- [ ] **Step 3: 运行测试并确认先失败**

Run:

```powershell
node tools/build-android-ad-demo.mjs
node tools/verify-android-ad-demo.mjs
node tools/verify-android-ad-demo-ui.mjs
```

Expected: 静态检查或浏览器测试因缺少 `deviceToast`、新 Toast 文案或旧“举报广告”仍存在而失败。

### Task 2: 实现设备内失败 Toast 与四场景状态恢复

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`
- Generate: `demos/Android广告接入-交互标注版.html`

- [ ] **Step 1: 添加设备内 Toast 样式**

在现有 `.toast` 样式附近增加：

```css
.device-toast{
  position:absolute;z-index:300;left:50%;bottom:26px;
  max-width:calc(100% - 40px);padding:11px 16px;
  border:1px solid #ffffff1f;border-radius:10px;
  background:#1d2029eb;color:#fff;box-shadow:0 8px 24px #0008;
  transform:translate(-50%,16px);opacity:0;transition:.2s;
  pointer-events:none;white-space:nowrap;font-size:12px
}
.device-toast.show{transform:translate(-50%,0);opacity:1}
```

- [ ] **Step 2: 添加独立的 `deviceToast()`**

在现有 `toast()` 后增加：

```js
function deviceToast(msg){
  const host=$('.device');
  if(!host){toast(msg);return}
  host.querySelector('.device-toast')?.remove();
  const node=document.createElement('div');
  node.className='device-toast';
  node.setAttribute('role','status');
  node.textContent=msg;
  host.appendChild(node);
  requestAnimationFrame(()=>node.classList.add('show'));
  setTimeout(()=>node.remove(),1800);
}
```

- [ ] **Step 3: 修改模拟失败处理**

将失败事件改为先恢复来源页面，再显示设备内 Toast：

```js
if(a==='reward-sim-fail'){
  state.rewardAd=null;
  render();
  deviceToast('广告播放失败，请稍后重试');
}
```

不改变 `state.c1`、`state.g1`、`state.q1` 或 `state.r1` 的权益字段，从而保证：

- C1 仍停留在签到成功结果层。
- G1 重新显示原“提示”弹窗。
- Q1 保留原排队状态。
- R1 不增加抽奖次数。

- [ ] **Step 4: 更新右侧交互标注**

在 C1、G1、Q1、R1 的异常说明中明确增加：

```text
广告加载或播放失败后关闭广告层、恢复来源页面，并提示“广告播放失败，请稍后重试”；不发奖励、不扣领取资格。
```

- [ ] **Step 5: 重新生成成品 HTML**

Run:

```powershell
node tools/build-android-ad-demo.mjs
```

Expected: `demos/Android广告接入-交互标注版.html` 更新且不再包含 `/* ASSET_BUNDLE */`。

### Task 3: 收敛 M1/T1 信息流广告菜单

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`
- Generate: `demos/Android广告接入-交互标注版.html`

- [ ] **Step 1: 更新 M1/T1 标注**

将 M1/T1 交互说明统一为：

```text
点击“查看详情”进入落地页；更多菜单本期只提供“对此广告不感兴趣”。
```

异常说明补充：

```text
点击“不感兴趣”只隐藏本次页面中的当前广告；点击菜单外区域只关闭菜单。
```

- [ ] **Step 2: 将菜单改为单一业务操作**

将 `community-ad-menu` 分支替换为：

```js
if(a==='community-ad-menu'){
  state.community.menuPlacement=b.dataset.placement;
  openModal(`<h2>广告选项</h2><p>你可以减少此类广告在当前页面的展示。</p><div class="actions"><button class="secondary" data-action="community-ad-hide">对此广告不感兴趣</button></div>`);
}
```

点击遮罩继续使用现有 `#modal` 事件关闭菜单，不新增“取消”业务按钮。

- [ ] **Step 3: 删除举报处理**

删除以下事件分支：

```js
if(a==='community-ad-report'){
  state.community.menuPlacement=null;
  closeModal();
  toast('已记录广告反馈');
}
```

- [ ] **Step 4: 重新生成成品 HTML**

Run:

```powershell
node tools/build-android-ad-demo.mjs
```

Expected: 成品仅保留 `community-ad-hide`，不包含 `community-ad-report` 或“举报广告”。

### Task 4: 同步 PRD 并完成验收

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》Android广告接入需求-V2.0.md`
- Test: `tools/verify-android-ad-demo.mjs`
- Test: `tools/verify-android-ad-demo-ui.mjs`

- [ ] **Step 1: 更新 PRD 的 M1/T1 交互规则**

将两个信息流资源位的菜单说明修改为：

```text
更多菜单本期只提供“对此广告不感兴趣”；点击后隐藏本次页面中的当前广告。点击遮罩只关闭菜单。本期不提供“举报广告”。
```

- [ ] **Step 2: 更新 PRD 的激励失败规则**

在 C1/G1/Q1/R1 全屏激励链路及异常边界中增加：

```text
广告加载或播放失败后关闭广告层，恢复来源页面并 Toast 提示“广告播放失败，请稍后重试”；不发奖励、不扣领取资格。用户主动提前关闭按 SDK 提前关闭规则处理，不展示技术失败 Toast。
```

- [ ] **Step 3: 运行格式与残留扫描**

Run:

```powershell
git diff --check -- demos/Android广告接入-交互标注版.template.html demos/Android广告接入-交互标注版.html tools/verify-android-ad-demo.mjs tools/verify-android-ad-demo-ui.mjs prd/ai生成/【Prd】《盖世游戏》Android广告接入需求-V2.0.md
rg -n "community-ad-report|举报广告|向平台反馈问题" -- demos/Android广告接入-交互标注版.template.html demos/Android广告接入-交互标注版.html
```

Expected: `git diff --check` 无错误，`rg` 无匹配。

- [ ] **Step 4: 运行完整自动验收**

Run:

```powershell
node tools/verify-android-ad-demo.mjs
node tools/verify-android-ad-demo-ui.mjs
```

Expected:

```text
PASS shell
PASS scenes
PASS admin
PASS assets
PASS uiSyntax
PASS o1Flow
PASS contentSurfaces
PASS communitySurfaces
PASS rewardFlows
PASS adminCrud
PASS browserRuntime
```

- [ ] **Step 5: 截取失败 Toast 和单选菜单证据**

Run:

```powershell
node tools/capture-android-ad-demo.mjs
```

Expected: `.tmp/android-ad-demo-captures` 中生成包含设备内失败 Toast 和信息流单选菜单的验收截图，页面无裁断、重叠或残留举报入口。

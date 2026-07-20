# Android Ad Demo Interaction Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the single-file Android ad demo with TapTap-style `Ad` labels, a complete check-in interaction, an original-page queue acceleration flow, and a full-screen PC startup ad background that preserves launch status.

**Architecture:** Keep all styles, embedded assets, render functions, state, and delegated click handling inside `demos/Android广告接入-交互标注版.html`. Extend the existing state-driven renderer instead of adding dependencies. Treat the user-provided queue image as a missing preferred asset: rebuild the fallback to match its composition and keep the existing source warning until the exact file is saved locally.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, PowerShell and Node.js syntax checks.

---

### Task 1: Apply TapTap-style passive ad disclosure

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html:16-24,116,132,153,163,172`

- [ ] **Step 1: Add a static disclosure scan that currently fails**

Run:

```powershell
$p='demos/Android广告接入-交互标注版.html'
$html=Get-Content -LiteralPath $p -Raw -Encoding utf8
if($html -match '<span class="(?:native-disclosure|disclosure|ad-flag)">广告'){ throw 'passive disclosure still uses Chinese label' }
```

Expected: FAIL because H1, S1, P1 and O1 still contain a passive `广告` label.

- [ ] **Step 2: Replace only passive labels and soften their visual treatment**

Use `Ad` in H1, S1, P1, O1 and the new L1 background creative. Keep active reward copy such as `看广告再领 60 分钟`, annotations, placement names and admin navigation in Chinese. Replace the orange badge treatment with this shared visual language:

```css
.native-disclosure,.native-card .disclosure,.ad-flag,.l1-ad-mark{
  position:absolute;z-index:20;padding:2px 6px;border:1px solid #ffffff42;
  border-radius:4px;background:#101116b8;color:#fff;font-size:9px;
  font-weight:700;line-height:1.2;letter-spacing:.2px;box-shadow:0 1px 4px #0008
}
```

- [ ] **Step 3: Re-run the disclosure scan**

Expected: PASS with no output. Also run `rg -n '>Ad<|Ad ·' demos/Android广告接入-交互标注版.html` and confirm O1/H1/S1/P1/L1 are present.

### Task 2: Complete the original check-in button journey

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html:63-67,164-169,197,217-221`

- [ ] **Step 1: Add a failing static check for the check-in completion state**

Run:

```powershell
$html=Get-Content -LiteralPath 'demos/Android广告接入-交互标注版.html' -Raw -Encoding utf8
@('closed:false','data-action="c1-checkin"','基础签到奖励已到账','看广告再领 60 分钟') | ForEach-Object {
  if(-not $html.Contains($_)){ throw "missing C1 contract: $_" }
}
```

Expected: FAIL on `closed:false`.

- [ ] **Step 2: Preserve earned state after the result layer closes**

Initialize and reset C1 with:

```js
c1:{base:false,double:false,ad:false,closed:false,rewardId:null}
```

On first `c1-checkin`, set `base=true`, `closed=false` and the reward id. On `c1-done`, keep `base=true`, set `closed=true`, and never enable the original button again until the global demo reset. Render `c1Dialog()` only when `state.c1.base && !state.c1.closed`.

- [ ] **Step 3: Align the hotspot to the screenshot's real button**

Use the original `20260521-152127.jpg` as the background and place the transparent hotspot over the visible button:

```html
<button class="hotspot checkin-hotspot" data-action="c1-checkin" aria-label="签到"></button>
```

```css
.checkin-hotspot{left:42.5%;top:63.5%;width:7.5%;height:10%}
.checkin-hotspot[disabled]{pointer-events:none}
```

Disable it after the base reward is issued. Do not show a `普通签到 / 广告签到` choice before granting the base reward.

- [ ] **Step 4: Verify the C1 contract**

Re-run Step 1. Expected: PASS. Verify the click handler contains a `!state.c1.base` guard and `c1-done` no longer resets `base` to `false`.

### Task 3: Restore the queue page and add confirmation before rewarded video

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html:20-23,65,86,171,190,197,224`

- [ ] **Step 1: Add a failing static check for the queue offer flow**

Run:

```powershell
$html=Get-Content -LiteralPath 'demos/Android广告接入-交互标注版.html' -Raw -Encoding utf8
@('data-action="q1-offer"','data-action="q1-watch"','完整观看广告后','暂不加速') | ForEach-Object {
  if(-not $html.Contains($_)){ throw "missing Q1 contract: $_" }
}
if($html.Contains('glass queue-action')){ throw 'legacy persistent queue card remains' }
```

Expected: FAIL because the current page still uses the persistent `glass queue-action` card.

- [ ] **Step 2: Rebuild the queue fallback to match the supplied GTA V composition**

Keep `A.queue.preferred` behavior. When false, render a dark GTA-style collage fallback with a centered orange ring, `免费通道`, `第 822 位`, the top estimate, the original gold `加速排队` button and the left `退出排队` control. Mark the source as fallback through the existing `sourceLabel()` behavior; do not claim pixel-perfect reproduction until the exact source file is local.

- [ ] **Step 3: Remove the persistent ad card and register the original button hotspot**

The default Q1 page must contain only the original queue UI and:

```html
<button class="queue-boost-hotspot" data-action="q1-offer" aria-label="加速排队"></button>
```

On `q1-offer`, open a confirmation layer with:

```html
<h2>看广告加速排队</h2>
<p>完整观看广告后进入加速通道，并获得 5 分钟云游时长。</p>
<button class="primary" data-action="q1-watch">观看广告</button>
<button class="secondary" data-action="modal-close">暂不加速</button>
```

- [ ] **Step 4: Remove the hard-coded video duration for Q1**

Make `openRewardVideo(kind)` render `广告播放中 · 时长以当前素材为准` for Q1. Keep queue heartbeat and position copy visible in the modal. `q1-complete` is the only action that sets `awarded=true`; closing or failing leaves queue state unchanged.

- [ ] **Step 5: Verify the Q1 contract**

Re-run Step 1. Expected: PASS. Confirm `rg -n 'glass queue-action|约 15 秒 · 加速'` returns no Q1 implementation matches.

### Task 4: Replace the PC startup side card with a full-screen static ad background

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html:20,65,87,172,197,206,225`

- [ ] **Step 1: Add a failing static check for the L1 layout**

Run:

```powershell
$html=Get-Content -LiteralPath 'demos/Android广告接入-交互标注版.html' -Raw -Encoding utf8
@('l1-ad-screen','l1-status-layer','data-action="l1-close-ad"','data-action="l1-cta"') | ForEach-Object {
  if(-not $html.Contains($_)){ throw "missing L1 contract: $_" }
}
if($html.Contains('class="l1-ad"')){ throw 'legacy side card remains' }
```

Expected: FAIL because L1 still renders a 204×140 side card.

- [ ] **Step 2: Add full-screen creative and protected status styles**

Implement these layout roles:

```css
.l1-ad-screen{position:absolute;inset:0;z-index:11;overflow:hidden;background:linear-gradient(135deg,#182c4a,#5b214f 55%,#11131b);color:#fff}
.l1-status-layer{position:absolute;z-index:18;left:24px;right:24px;bottom:18px;padding:12px 16px;border:1px solid #ffffff38;border-radius:12px;background:#07080cce;backdrop-filter:blur(10px)}
.l1-ad-close{position:absolute;z-index:21;right:16px;top:16px}
.l1-ad-cta{position:absolute;z-index:21;right:24px;bottom:82px}
```

The background itself is not a button. Only the CTA uses the ad landing action.

- [ ] **Step 3: Render the running and fallback states**

When `state.l1.visible && state.adFill`, render the full-screen static creative, `Ad` mark, close control and CTA before the protected status layer. When hidden or unfilled, render the original stage screenshot/fallback. The status layer always contains the stage name and simulated progress while the launch is running.

- [ ] **Step 4: Separate ad close from launch completion**

Use:

```js
if(a==='l1-close-ad'){state.l1.visible=false;toast('广告已关闭，游戏继续启动');render()}
if(a==='l1-cta')adLanding()
if(a==='l1-hide'){state.l1.visible=false;toast('启动完成或失败，广告立即撤出');render()}
```

Changing firmware/client stages must keep the same `requestId` and `creativeId`. Reset restores the first stage and the ad.

- [ ] **Step 5: Verify the L1 contract**

Re-run Step 1. Expected: PASS. Verify `rg -n '204×140|右侧素材|class="l1-ad"' demos/Android广告接入-交互标注版.html` has no runtime copy or legacy component.

### Task 5: Run syntax and interaction regression checks

**Files:**
- Verify: `demos/Android广告接入-交互标注版.html`

- [ ] **Step 1: Validate embedded JavaScript syntax**

Run:

```powershell
@'
const fs=require('fs');
const html=fs.readFileSync('demos/Android广告接入-交互标注版.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
for(const [i,code] of scripts.entries()) new Function(code);
console.log(`PASS ${scripts.length} scripts`);
'@ | node -
```

Expected: `PASS 2 scripts`.

- [ ] **Step 2: Run static contract checks together**

Run Tasks 1-4 PowerShell checks. Expected: all commands exit 0 with no thrown errors.

- [ ] **Step 3: Perform browser interaction regression**

Open the HTML and verify:

1. H1/S1/P1/O1/L1 passive disclosure reads `Ad`; active rewarded buttons remain Chinese.
2. C1 opens on the original page, the visible sign-in button grants the base reward once, `完成` closes the result without making the button claimable again, and full viewing adds exactly one extra reward.
3. Q1 has no persistent glass card; the original gold button opens confirmation, cancel returns unchanged, full viewing updates acceleration and early close leaves queue position unchanged.
4. L1 fills the device screen with a static creative while the launch status remains visible; CTA opens the simulated landing page; closing the ad restores the original stage; switching stages does not change request or creative ids.
5. O1/H1/S1/P1/G1 and all three admin pages still render and respond.

- [ ] **Step 4: Review the final diff**

Run:

```powershell
git diff --check -- 'demos/Android广告接入-交互标注版.html'
git diff --stat -- 'demos/Android广告接入-交互标注版.html'
```

Expected: no whitespace errors; only the intended single HTML file is modified.

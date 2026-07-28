# 微信 H5 精品游戏音频与测试门禁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为《世界缝补师》补齐真实轻量音频，并确保三款普通入口无法使用测试参数或测试接口改变规则。

**Architecture:** 音频使用单文件内的单例 `SoundBus`，只在明确用户手势中惰性解锁；所有失败无声降级。测试配置统一由 `test=1` 门控，普通入口只暴露只读 `window.__GAME_META__`，自动测试对象只在测试模式挂载。

**Tech Stack:** 原生 JavaScript、Web Audio API、URLSearchParams、Playwright Core、HTML5 Canvas。

---

### Task 1: 为生产门禁写失败测试

**Files:**
- Modify: `tools/verify-wechat-h5-premium-games.mjs:82-105`
- Modify: `tools/verify-wechat-h5-premium-games.mjs:451-480`
- Modify: `tools/verify-wechat-h5-premium-games.mjs:921-945`
- Test: `test-results/wechat-h5-premium-games/verification.json`

- [ ] **Step 1: 增加普通入口门禁场景**

新增：

```js
async function verifyProductionGuards(browser, origin, entry) {
  if (!entry.game) return null;
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  await page.goto(`${origin}${demoRoot}/${entry.file}?speed=40&seed=1&mute=1`);
  const result = await page.evaluate(() => ({
    testApi: typeof window.__GAME_TEST__,
    meta: window.__GAME_META__,
    testBadgeVisible: Boolean(document.querySelector('[data-test-badge]:not([hidden])'))
  }));
  await context.close();
  assert.equal(result.testApi, 'undefined', `${entry.id} 普通入口暴露测试接口`);
  assert.equal(result.meta?.testMode, false, `${entry.id} 普通入口误入测试模式`);
  assert.equal(result.meta?.timeScale, 1, `${entry.id} 普通入口 speed 改变规则`);
  assert.equal(result.testBadgeVisible, false, `${entry.id} 普通入口显示测试标记`);
  return result;
}
```

- [ ] **Step 2: 把场景加入结果**

在 HTTP 和 `direct-file` 循环之后运行三款 `verifyProductionGuards()`，结果写入报告的 `productionGuards` 字段。

- [ ] **Step 3: 运行并验证失败**

```powershell
node tools/verify-wechat-h5-premium-games.mjs
```

Expected: 《世界缝补师》《裂隙猎人》因 `timeScale` 或测试接口失败；报告仍保留已执行结果。

- [ ] **Step 4: 提交失败测试**

```powershell
git add -- tools/verify-wechat-h5-premium-games.mjs
git commit -m "test: enforce production game guards"
```

### Task 2: 统一三款测试配置

**Files:**
- Modify: `demos/微信H5精品游戏/01-five-seconds-later.html:450-462`
- Modify: `demos/微信H5精品游戏/02-world-mender.html:118-121`
- Modify: `demos/微信H5精品游戏/03-rift-hunter.html:190-195`
- Test: `tools/verify-wechat-h5-premium-games.mjs`

- [ ] **Step 1: 《五秒之后》统一门禁**

```js
const params = new URLSearchParams(location.search);
const testMode = params.get('test') === '1';
const requestedSpeed = Number(params.get('speed'));
const timeScale = testMode && Number.isFinite(requestedSpeed)
  ? Math.max(1, Math.min(30, requestedSpeed))
  : 1;
const seedParam = testMode ? Number(params.get('seed')) : NaN;
const initialSeed = Number.isFinite(seedParam) ? seedParam >>> 0 : Date.now() >>> 0;
const forcedMute = testMode && params.get('mute') === '1';
window.__GAME_META__ = Object.freeze({
  schemaVersion: 1, gameId: GAME_ID, testMode, timeScale
});
```

把状态初始静音改为使用 `forcedMute`。

- [ ] **Step 2: 《世界缝补师》统一门禁**

```js
const TEST = params.get('test') === '1';
const requestedSpeed = Number(params.get('speed'));
const SPEED = TEST && Number.isFinite(requestedSpeed)
  ? Math.max(1, Math.min(30, requestedSpeed))
  : 1;
const forcedMute = TEST && params.get('mute') === '1';
const requestedSeed = TEST ? Number(params.get('seed')) : NaN;
let seed = (Number.isFinite(requestedSeed) ? requestedSeed : Date.now()) >>> 0;
window.__GAME_META__ = Object.freeze({
  schemaVersion: 1, gameId: GAME_ID, testMode: TEST, timeScale: SPEED
});
```

- [ ] **Step 3: 《裂隙猎人》统一门禁**

```js
const TEST = qs.get('test') === '1';
const requestedSpeed = Number(qs.get('speed'));
const TIME_SCALE = TEST && Number.isFinite(requestedSpeed)
  ? Math.max(1, Math.min(40, requestedSpeed))
  : 1;
const MUTED_BY_QUERY = TEST && qs.get('mute') === '1';
const requestedSeed = TEST ? Number(qs.get('seed')) : NaN;
const SEED = (Number.isFinite(requestedSeed) ? requestedSeed : Date.now()) >>> 0;
window.__GAME_META__ = Object.freeze({
  schemaVersion: 1, gameId: GAME_ID, testMode: TEST, timeScale: TIME_SCALE
});
```

- [ ] **Step 4: 运行门禁测试**

```powershell
node tools/verify-wechat-h5-premium-games.mjs
```

Expected: 普通入口 `timeScale=1`；此时仍会因测试对象常驻而失败。

- [ ] **Step 5: 提交**

```powershell
git add -- demos/微信H5精品游戏 tools/verify-wechat-h5-premium-games.mjs
git commit -m "fix: gate game query parameters"
```

### Task 3: 仅在测试模式挂载自动验收接口

**Files:**
- Modify: `demos/微信H5精品游戏/01-five-seconds-later.html:1667-1684`
- Modify: `demos/微信H5精品游戏/02-world-mender.html:544-558`
- Modify: `demos/微信H5精品游戏/03-rift-hunter.html:671-680`
- Test: `tools/verify-wechat-h5-premium-games.mjs`

- [ ] **Step 1: 门控三款接口**

三款分别在现有对象赋值前后增加条件块，不改动对象内部现有方法和签名：

```js
if (testMode) {
  window.__GAME_TEST__ = {
```

在《五秒之后》现有对象的结束 `};` 后追加：

```js
}
```

《世界缝补师》现有 `window.__GAME_TEST__={` 改为：

```js
if (TEST) {
  window.__GAME_TEST__ = {
```

在现有对象结束后追加：

```js
}
```

《裂隙猎人》按同样方式把现有对象包入条件：

```js
if (TEST) {
  window.__GAME_TEST__ = {
```

在现有对象结束后追加：

```js
}
```

删除测试对象内部已经冗余的逐方法 `if(TEST)`，但不改变返回类型。

- [ ] **Step 2: 保持测试 URL**

确认主验收、无障碍、短时性能和长时性能的游戏 URL 都包含：

```text
?test=1&seed=20260728&speed=20&mute=1
```

普通大厅链接不追加测试参数。

- [ ] **Step 3: 运行主验收**

```powershell
node tools/verify-wechat-h5-premium-games.mjs
```

Expected: 原有 16/16 PASS，三款 `productionGuards` PASS。

- [ ] **Step 4: 提交**

```powershell
git add -- demos/微信H5精品游戏 tools/verify-wechat-h5-premium-games.mjs test-results/wechat-h5-premium-games/verification.json
git commit -m "fix: hide game test APIs in normal mode"
```

### Task 4: 实现《世界缝补师》SoundBus

**Files:**
- Modify: `demos/微信H5精品游戏/02-world-mender.html:118-178`
- Modify: `demos/微信H5精品游戏/02-world-mender.html:264-326`
- Modify: `demos/微信H5精品游戏/02-world-mender.html:492-528`
- Modify: `demos/微信H5精品游戏/02-world-mender.html:544-562`
- Test: `tools/verify-wechat-h5-premium-games.mjs`

- [ ] **Step 1: 增加测试态声音断言入口**

测试对象增加：

```js
sound: () => SoundBus.getState()
```

主验收在静音测试模式中断言：

```js
const sound = await page.evaluate(() => window.__GAME_TEST__.sound());
assert.equal(sound.contextCount, 0, '静音测试不应创建 AudioContext');
assert.equal(sound.activeVoices, 0, '静音测试存在活动声音节点');
```

运行测试，Expected: FAIL with `SoundBus is not defined`。

- [ ] **Step 2: 实现单例 SoundBus**

在 `GamePlatform` 前加入：

```js
const SoundBus = (() => {
  let context = null;
  let master = null;
  let muted = forcedMute;
  let suspended = false;
  let activeVoices = 0;
  let contextCount = 0;
  const cueCounts = Object.create(null);
  let lastLifeSavedAt = 0;

  function unlock() {
    if (muted) return false;
    try {
      if (!context) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return false;
        context = new AudioCtor();
        contextCount += 1;
        master = context.createGain();
        master.gain.value = .045;
        master.connect(context.destination);
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
      suspended = false;
      return true;
    } catch (_) {
      return false;
    }
  }

  function voice(frequency, duration, offset = 0, type = 'sine') {
    if (!context || !master || muted || suspended) return false;
    const now = context.currentTime + offset;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.7, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    activeVoices += 1;
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      activeVoices = Math.max(0, activeVoices - 1);
    };
    oscillator.start(now);
    oscillator.stop(now + duration + .02);
    return true;
  }

  function cue(name) {
    if (muted || suspended || !unlock()) return false;
    cueCounts[name] = (cueCounts[name] || 0) + 1;
    if (name === 'stitch_ok') {
      voice(440, .11); voice(660, .13, .07);
    } else if (name === 'stitch_invalid') {
      voice(190, .12, 0, 'triangle'); voice(145, .12, .05, 'triangle');
    } else if (name === 'life_saved') {
      const now = performance.now();
      if (now - lastLifeSavedAt < 180) return true;
      lastLifeSavedAt = now;
      voice(784, .15);
    } else if (name === 'run_won') {
      voice(523, .18); voice(659, .2, .08); voice(784, .22, .16);
    } else if (name === 'run_lost') {
      voice(220, .2, 0, 'triangle'); voice(165, .24, .11, 'triangle');
    }
    return true;
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (master && context) master.gain.setValueAtTime(muted ? 0 : .045, context.currentTime);
  }

  function suspend() {
    suspended = true;
    context?.suspend?.().catch(() => {});
  }

  function resume() {
    if (muted) return false;
    suspended = false;
    return unlock();
  }

  return {
    unlock, cue, setMuted, suspend, resume,
    getState: () => ({
      supported: Boolean(window.AudioContext || window.webkitAudioContext),
      contextCount, contextState: context?.state || 'uncreated',
      muted, suspended, activeVoices, cueCounts: { ...cueCounts }
    })
  };
})();
```

- [ ] **Step 3: 接入四类反馈**

在现有函数的幂等状态写入后调用：

```js
// stitch() 成功
SoundBus.cue('stitch_ok');

// invalidFeedback()
SoundBus.cue('stitch_invalid');

// saveLife()
SoundBus.cue('life_saved');

// finish()
SoundBus.cue(won ? 'run_won' : 'run_lost');
```

- [ ] **Step 4: 接入手势、静音和生命周期**

```js
$('startBtn').addEventListener('click', () => {
  SoundBus.unlock();
  startRun();
});
canvas.addEventListener('pointerdown', event => {
  SoundBus.unlock();
  beginDrag(event);
});
$('muteBtn').addEventListener('click', () => {
  state.mute = !state.mute;
  SoundBus.setMuted(state.mute);
  if (!state.mute) SoundBus.unlock();
  $('muteBtn').textContent = state.mute ? '静音' : '声音';
  GamePlatform.saveLocal('mute', state.mute);
});
```

`pauseGame()` 调用 `SoundBus.suspend()`；`resumeGame()` 只在继续按钮手势内调用 `SoundBus.resume()`；页面重新可见只显示继续层，不自动恢复声音。

- [ ] **Step 5: 运行静音自动验收**

```powershell
node tools/verify-wechat-h5-premium-games.mjs
```

Expected: 主验收 PASS；`contextCount=0`、`activeVoices=0`。

- [ ] **Step 6: 运行可听浏览器人工检查**

Run:

```powershell
python -m http.server 8080
```

打开：

```text
http://127.0.0.1:8080/demos/微信H5精品游戏/02-world-mender.html
```

Expected: 有效、无效、获救和胜负声音可区分；静音立即生效；重玩不叠音；浏览器拒绝音频时玩法仍可完成。

- [ ] **Step 7: 提交**

```powershell
git add -- demos/微信H5精品游戏/02-world-mender.html tools/verify-wechat-h5-premium-games.mjs test-results/wechat-h5-premium-games/verification.json
git commit -m "feat: add world mender audio feedback"
```

### Task 5: 性能与文档回归

**Files:**
- Modify: `demos/微信H5精品游戏/README.md`
- Modify: `docs/superpowers/specs/2026-07-28-wechat-h5-premium-games-qa.md`
- Test: `tools/profile-wechat-h5-premium-games.mjs`
- Test: `tools/profile-wechat-h5-longrun.mjs`

- [ ] **Step 1: 运行短时性能**

```powershell
node tools/profile-wechat-h5-premium-games.mjs
```

Expected: 三款无硬失败；P95 不超过 34ms；Long Task 0。

- [ ] **Step 2: 运行长时性能**

```powershell
node tools/profile-wechat-h5-longrun.mjs
```

Expected: 三款完成各 120 秒、13 个采样点；无硬失败。CDP Nodes 预警保留为浏览器线索，不隐藏。

- [ ] **Step 3: 更新 README 与 QA**

明确写入：

```markdown
- 普通入口忽略 `seed/speed/mute` 测试参数，且不挂载 `window.__GAME_TEST__`。
- 自动验收必须使用 `test=1`。
- 《世界缝补师》使用首次手势解锁的程序合成短音效；无音频能力时无声降级。
- 微信 iOS/Android 的音频解锁、硬件静音和后台恢复仍需真机验证。
```

- [ ] **Step 4: 提交**

```powershell
git add -- demos/微信H5精品游戏/README.md docs/superpowers/specs/2026-07-28-wechat-h5-premium-games-qa.md test-results/wechat-h5-premium-games
git diff --cached --check
git commit -m "docs: record audio and production guard validation"
```

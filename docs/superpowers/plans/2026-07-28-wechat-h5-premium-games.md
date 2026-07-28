# 微信 H5 精品游戏三款纵切片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 制作《五秒之后》《世界缝补师》《裂隙猎人》三款竖屏单手 H5 游戏纵切片及统一大厅、验收脚本与微信接入说明。

**Architecture:** 每款游戏是独立单文件 HTML，内部包含 Canvas 游戏核心、少量 DOM 状态层、统一平台适配器和事件协议。游戏大厅通过 `postMessage` 接收本地体验事件；Playwright 使用固定种子和加速模式验证三分钟完整流程。

**Tech Stack:** HTML5 Canvas、原生 JavaScript、CSS、Web Audio、localStorage、Pointer Events、Node.js、playwright-core。

---

### Task 1: 固化公共运行约定

**Files:**
- Create: `demos/微信H5精品游戏/index.html`
- Test: `tools/verify-wechat-h5-premium-games.mjs`

- [ ] **Step 1: 定义统一事件信封**

```js
function createEvent(gameId, runId, event, payload = {}) {
  return {
    source: "wechat-h5-premium-games",
    version: 1,
    gameId,
    runId,
    event,
    ts: Date.now(),
    payload
  };
}
```

- [ ] **Step 2: 定义平台适配器行为**

```js
const GamePlatform = {
  getEnv() {
    return window.__wxjs_environment === "miniprogram" ? "miniprogram" : "web";
  },
  emit(event, payload = {}) {
    const message = createEvent(GAME_ID, state.runId, event, payload);
    if (window.parent && window.parent !== window) window.parent.postMessage(message, "*");
    if (window.opener && !window.opener.closed) window.opener.postMessage(message, "*");
    return message;
  },
  saveLocal(key, value) {
    localStorage.setItem(`premium-h5:${GAME_ID}:${key}`, JSON.stringify(value));
  },
  loadLocal(key, fallback) {
    const raw = localStorage.getItem(`premium-h5:${GAME_ID}:${key}`);
    return raw === null ? fallback : JSON.parse(raw);
  },
  pause() { state.paused = true; },
  resume() { state.paused = false; },
  requestShare() { return Promise.resolve({ supported: false }); }
};
```

- [ ] **Step 3: 实现大厅**

大厅展示三张游戏卡、各自核心幻想、预计时长、完成状态和最近事件；按钮打开对应 HTML。仅接收 `source`、`version` 和 `gameId` 均合法的事件，完成条件为收到 `first_input`、`mechanic_reveal`、`core_payoff`。

- [ ] **Step 4: 建立验证脚本骨架**

启动只服务工作区文件的本地 HTTP 服务，依次访问大厅和三款游戏；使用本机 Chrome 或 Edge，捕获 `console.error`、`pageerror` 和外部网络请求。

- [ ] **Step 5: 运行骨架验证**

Run: `node tools/verify-wechat-h5-premium-games.mjs`

Expected: 大厅通过；尚未创建的三个游戏以明确的 HTTP 404 失败。

### Task 2: 实现《五秒之后》

**Files:**
- Create: `demos/微信H5精品游戏/01-five-seconds-later.html`

- [ ] **Step 1: 创建竖屏画布和状态机**

状态必须覆盖 `intro`、`playing`、`paused`、`won`、`lost`，使用固定时间步 `1/60` 秒、DPR 上限 2 和 `ResizeObserver`。

- [ ] **Step 2: 实现单指路径输入**

Pointer 按下后把画布坐标设为角色目标点；每 50ms 记录一个轨迹点；首次有效移动发送 `first_input`。

- [ ] **Step 3: 实现五秒回声**

每五秒封存当前轨迹并生成循环回声；不足两个点时使用当前位置生成静止回声；最多四条，第五条替换最旧回声。首次生成发送 `mechanic_reveal`。

- [ ] **Step 4: 实现目标、双机关和终局核心**

普通目标靠近自动受击；双机关只有两个不同角色同时进入才激活；终局四层护盾分别绑定四个时间门。

- [ ] **Step 5: 实现伤害、胜负和结算**

时间障碍接触当前角色扣除能量；核心击毁触发 `core_payoff` 和 `run_end`；能量归零触发失败；结算包含回声数、协作机关数和完成时间。

- [ ] **Step 6: 实现重玩与测试接口**

```js
window.__GAME_TEST__ = {
  getState: () => structuredClone(publicState()),
  reset: () => resetRun(true)
};
```

重玩生成新 `runId`，不刷新页面，并发送 `replay_start`。

- [ ] **Step 7: 浏览器手测**

Run: 在浏览器打开 `demos/微信H5精品游戏/01-five-seconds-later.html`

Expected: 五秒产生第一条回声；双机关需要协作；四回声可辨；胜负后可重玩。

### Task 3: 实现《世界缝补师》

**Files:**
- Create: `demos/微信H5精品游戏/02-world-mender.html`

- [ ] **Step 1: 创建锚点图和场景状态**

每个锚点包含 `id/x/y/type`，每条允许连接包含起点、终点、长度、用途和激活阶段。所有连接均来自固定图，不进行自由线碰撞。

- [ ] **Step 2: 实现拖动缝线**

Pointer 必须在锚点命中半径内开始，在有效相邻锚点命中半径内结束；成功扣除线长并生成针脚，无效操作播放红色回弹且不扣线。

- [ ] **Step 3: 实现桥梁与屏障**

桥梁改变生命路径图的可通行边；屏障把风沙区从危险改为安全。首次完成桥梁发送 `mechanic_reveal`，首次形成屏障发送 `phase_change`。

- [ ] **Step 4: 实现三批生命与崩裂脚本**

十二个生命按时间批次出现并沿当前可通行路径移动；未建立安全路径时停在危险边缘，倒计时结束后记为未获救。

- [ ] **Step 5: 实现撤销、胜负和结算**

撤销只移除最近针脚并返还原始线长；救出至少九个生命且连接中心花园则胜利；结算展示获救、未获救、剩余线长和两种针脚用途。

- [ ] **Step 6: 实现生命周期和测试接口**

页面隐藏时暂停生命、崩裂和计时；恢复后由继续按钮恢复。测试接口与 Task 2 保持同名同形。

- [ ] **Step 7: 浏览器手测**

Run: 在浏览器打开 `demos/微信H5精品游戏/02-world-mender.html`

Expected: 锚点命中稳定；桥梁和屏障均能改变生命结果；错误连线不消耗资源；结算可重玩。

### Task 4: 实现《裂隙猎人》

**Files:**
- Create: `demos/微信H5精品游戏/03-rift-hunter.html`

- [ ] **Step 1: 创建战斗世界和对象池**

建立玩家、子弹、普通敌人、冲锋敌人、远程敌人、精英、掉落和粒子池；为每类设置硬上限，超限时复用最旧的非关键对象。

- [ ] **Step 2: 实现移动、自动攻击和掉落**

Pointer 控制玩家目标位置；每次射击选择有效范围内最近敌人；击杀生成经验和战利品；首次移动发送 `first_input`。

- [ ] **Step 3: 实现武器三段形态**

经验达到固定阈值时从单发升级为双发，再升级为穿透散射；每次升级播放明显的形态变化反馈，首次升级发送 `mechanic_reveal`。

- [ ] **Step 4: 实现危险值和敌人导演**

危险值由局内时间单调增加，统一控制生成频率、敌人移速和掉落价值；保证同一个测试种子产生相同波次。

- [ ] **Step 5: 实现撤离窗口**

90 秒与 150 秒生成绿色撤离区；玩家连续停留三秒才能成功撤离，离开即重置进度。第一次开放时发送 `phase_change`。

- [ ] **Step 6: 实现坍缩、死亡和结算**

150 秒后生成精英追击并缩小安全区；成功撤离保留全部战利品，死亡只保留最高价值物品；结算分栏展示带出和遗失。

- [ ] **Step 7: 浏览器手测**

Run: 在浏览器打开 `demos/微信H5精品游戏/03-rift-hunter.html`

Expected: 自动攻击、两次武器升级、两次撤离窗口、站位撤离、死亡损失和重玩均成立。

### Task 5: 自动化与视觉验收

**Files:**
- Modify: `tools/verify-wechat-h5-premium-games.mjs`
- Create: `docs/superpowers/specs/2026-07-28-wechat-h5-premium-games-qa.md`

- [ ] **Step 1: 增加三档移动视口**

覆盖 `360×800`、`390×844`、`430×932`，检查横向溢出、Canvas 尺寸、可见按钮和小于 `44×44` 的触控目标。

- [ ] **Step 2: 增加流程断言**

通过 `?test=1&seed=20260728&speed=20&mute=1` 完成三款全流程，轮询 `window.__GAME_TEST__.getState()`，断言核心阶段、结算和重玩状态。

- [ ] **Step 3: 增加生命周期断言**

模拟 `visibilitychange`，验证隐藏期间局内时间变化不超过 100ms，恢复前状态保持暂停。

- [ ] **Step 4: 增加截图**

每款保存开局、核心机制和结算截图到 `test-results/wechat-h5-premium-games/`；输出 `verification.json`，包含布局、事件、错误和帧率采样。

- [ ] **Step 5: 运行完整验证**

Run: `node tools/verify-wechat-h5-premium-games.mjs`

Expected: 所有页面、视口和流程 PASS；控制台错误、页面异常、外部请求、横向溢出均为 0。

- [ ] **Step 6: 完成视觉审查**

逐张检查九张关键截图，记录并修复层级混乱、文字遮挡、核心角色不清、结算信息不完整和主题区分不足的问题。

- [ ] **Step 7: 记录真实验证边界**

QA 文档分别标记浏览器自动化、人工视觉审查和未执行的微信真机项目，不把桌面模拟结果写成真机通过。

### Task 6: 微信接入说明与最终交付

**Files:**
- Create: `demos/微信H5精品游戏/README.md`

- [ ] **Step 1: 写明本地打开方式**

说明可直接双击单个 HTML，完整事件大厅建议通过本地 HTTP 服务访问：

```powershell
python -m http.server 8080
```

- [ ] **Step 2: 写明 WebView 接入**

给出小程序 `web-view` 使用备案 HTTPS 地址承载游戏的最小示例，注明个人主体限制、业务域名配置和自动铺满页面边界。

- [ ] **Step 3: 写明后续小游戏迁移边界**

明确可复用规则、数值、事件和 Canvas 资源规范；登录、广告、支付、分享、排行榜和平台 UI 需使用小游戏 API 重新实现。

- [ ] **Step 4: 完成三角色评审**

产品经理检查功能闭环，交互设计师检查单手路径和反馈，开发工程师检查对象上限、生命周期和测试接口。必须修问题全部解决后再进入最终验收。

- [ ] **Step 5: 运行最终回归**

Run: `node tools/verify-wechat-h5-premium-games.mjs`

Expected: 退出码 0，`verification.json` 全部 PASS。

- [ ] **Step 6: 分范围提交**

只暂存本任务新增的设计、计划、三款游戏、大厅、README、验证脚本和 QA 文档，不包含当前工作区其他改动。

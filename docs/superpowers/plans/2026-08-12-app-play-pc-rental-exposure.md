# APP「玩游戏 → PC游戏」租号露出 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 APP「玩游戏 → PC游戏」横竖屏卡片中增加统一租号摘要，并保证整卡进入详情、原启动操作不误跳详情。

**Architecture:** 复用现有 `resolveGameDisplayModel()` 作为唯一状态与价格来源，用一份 PC 游戏展示目录驱动横竖屏卡片。卡片容器负责进入详情，内部原操作控件使用独立 `play-card-action` 事件；摘要失败只收起租号信息，不影响原列表和操作。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Node.js 构建脚本、Playwright 自动化验证、Markdown PRD、GitHub Pages

---

## 文件结构

- 修改 `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`：新增 PC 游戏展示目录、摘要/人数渲染、卡片交互和横竖屏样式。
- 生成 `demos/APP租号功能/盖世游戏APP租号功能demo.html`：由构建脚本从模板生成，不手工维护业务代码。
- 修改并生成 `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`：同步普通 Demo 业务代码，并补充 PC游戏租号卡标注。
- 修改 `tools/build-app-rental-demo.mjs`：把新摘要、事件和标注签名加入构建一致性门禁。
- 修改 `tools/verify-app-rental-demo.mjs`：增加四类状态、价格格式、降级、点击隔离与返回恢复的自动化验收。
- 修改 `tools/capture-app-rental-prd-screenshots.mjs`：保证「玩游戏」截图固定打开 PC游戏 Tab。
- 修改 `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`：追加 V2.7，并更新 4.2「2. 玩游戏」和 9.1 验收规则。
- 更新 `public/prd/app-rental/09-play-portrait.png` 与 `public/prd/app-rental/09-play-landscape.png`：发布本轮 PC游戏横竖屏证据。

### Task 1: 先锁定 PC 游戏卡业务契约

**Files:**
- Modify: `tools/verify-app-rental-demo.mjs`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 新增源码契约并让测试先失败**

在现有源码门禁后增加 `PLAY_PC_RENTAL_SOURCE`，明确检查统一目录、摘要渲染、独立操作动作和截图态：

```js
const playPcRentalSourceChecks = [
  ['PC游戏统一目录', templateSource.includes('PLAY_PC_GAMES')],
  ['复用统一租号摘要', templateSource.includes('renderPlayRentalSummary') && templateSource.includes('getDiscoveryDisplay(gameId)')],
  ['仅PC游戏展示', templateSource.includes("state.playTab === 'pc'")],
  ['独立操作热区', templateSource.includes('data-action="play-card-action"')],
  ['截图默认PC游戏', templateSource.includes("state.playTab = 'pc'")],
];
const failedPlayPcRentalSourceChecks = playPcRentalSourceChecks.filter(([, passed]) => !passed).map(([name]) => name);
assert(failedPlayPcRentalSourceChecks.length === 0, `PLAY_PC_RENTAL 源码契约未通过：${failedPlayPcRentalSourceChecks.join('、')}`);
process.stdout.write(`PLAY_PC_RENTAL_SOURCE ${playPcRentalSourceChecks.length}/${playPcRentalSourceChecks.length} PASS\n`);
```

- [ ] **Step 2: 运行验证并确认新门禁失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: FAIL，错误包含 `PLAY_PC_RENTAL 源码契约未通过`。

- [ ] **Step 3: 提交测试契约**

```powershell
git add -- tools/verify-app-rental-demo.mjs
git commit -m "test: lock PC游戏租号卡契约"
```

### Task 2: 实现统一 PC 游戏目录与租号摘要

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/build-app-rental-demo.mjs`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 定义横竖屏共用的 PC 游戏目录**

在游戏配置区增加以下只读目录。目录只提供游戏、原操作和真实在租人数；状态继续由统一摘要返回：

```js
const PLAY_PC_GAMES = Object.freeze([
  { id: 'red-dead-2', name: '荒野大镖客：救赎 2', action: '启动', demand: '在租 99+' },
  { id: 'forza-5', name: '极限竞速：地平线 5', action: '启动', demand: '' },
  { id: 'hogwarts', name: '霍格沃茨之遗', action: '下载', demand: '在租 36+' },
  { id: 'witcher-3', name: '巫师 3：狂猎', action: '启动', demand: '' },
]);
```

补齐以上游戏的 `discoveryContexts`，使 Demo 可分别得到：

```js
// red-dead-2：有效同游戏租赁 → 已租号
// forza-5：已有直接权益 → 可畅玩
// hogwarts：可售标准版租号 SKU → ¥9.9 · 租号
// witcher-3：priceResolved=false → 不展示摘要
```

- [ ] **Step 2: 增加只负责展示的摘要函数**

摘要函数必须调用现有 `getDiscoveryDisplay()`，不得另写一套状态或跨商品比价：

```js
function renderPlayRentalSummary(gameId, demand = '') {
  const model = getDiscoveryDisplay(gameId);
  if (model.displayType === DISCOVERY_DISPLAY_TYPES.NONE) return '';
  const demandLine = demand ? `<span class="play-rental-demand">${demand}</span>` : '';
  return `<div class="play-rental-summary" data-play-rental-summary="${model.displayType}"><strong>${model.displayText}</strong>${demandLine}</div>`;
}
```

人数只在有真实值时显示；不得填充默认 `99+`，不得显示剩余租期、订单进度或权益来源。

- [ ] **Step 3: 改造竖屏 PC游戏卡**

保留云游戏、复古游戏原结构；仅当 `state.playTab === 'pc'` 时：

```html
<article class="feature-card play-game-card" data-action="navigate" data-screen="detail" data-game-id="red-dead-2" data-play-game-id="red-dead-2">
  <!-- 原封面 -->
  <div class="feature-info play-game-copy">
    <strong>荒野大镖客：救赎 2</strong>
    <span class="play-game-meta">动作冒险 · 评分 9.6</span>
    <!-- renderPlayRentalSummary(...) -->
  </div>
  <button class="small-pill" type="button" data-action="play-card-action" data-play-action="启动">启动</button>
</article>
```

热门横卡和全部游戏列表都按“游戏名 → 原类型/评分 → 租号主信息 → 可选在租人数”展示；无摘要时不留空白。

- [ ] **Step 4: 改造横屏 PC游戏卡**

`renderLandscapePlay()` 复用 `PLAY_PC_GAMES` 与 `renderPlayRentalSummary()`。最近常玩、人气热游的 PC 卡片按内容自然增高；云游戏和复古游戏不增加摘要：

```js
const showRentalSummary = state.playTab === 'pc';
const rentalSummary = showRentalSummary ? renderPlayRentalSummary(game.id, game.demand) : '';
```

- [ ] **Step 5: 完成视觉样式**

新增样式保持原卡片体系，不使用按钮、胶囊或额外标签表现租号信息：

```css
.play-game-card { cursor: pointer; }
.play-game-copy { min-width: 0; }
.play-game-meta { color: var(--text-muted); font-size: 10px; }
.play-rental-summary { display: flex; flex-direction: column; gap: 1px; margin-top: 5px; }
.play-rental-summary > strong { color: #ff9c42; font-family: var(--font-number); font-size: 12px; line-height: 16px; }
.play-rental-demand { color: var(--text-muted); font-size: 9px; line-height: 13px; }
.landscape-hot-card .play-rental-summary,
.landscape-recent-item .play-rental-summary { padding: 0 7px 7px; }
```

- [ ] **Step 6: 隔离原操作控件与整卡点击**

在根节点点击代理中优先处理操作动作：

```js
if (action === 'play-card-action') {
  event.preventDefault();
  event.stopPropagation();
  showToast(`${target.dataset.playAction || '启动'}操作已触发`);
  return;
}
```

卡片非操作区继续使用 `navigate + data-game-id` 进入统一详情；`data-play-game-id` 仅作为验证与埋点定位属性，不参与状态判断。

- [ ] **Step 7: 把新签名加入构建一致性门禁**

在 `requiredBusinessSignatures` 增加：

```js
'PLAY_PC_GAMES',
'renderPlayRentalSummary',
'play-card-action',
'data-play-rental-summary',
```

- [ ] **Step 8: 构建并运行验证**

Run: `node tools/build-app-rental-demo.mjs`

Expected: 输出 `BUILD ...demo.html` 与 `SYNC ...标注版.html`。

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `PLAY_PC_RENTAL_SOURCE 5/5 PASS`，原有门禁保持 PASS。

- [ ] **Step 9: 提交客户端实现**

```powershell
git add -- demos/APP租号功能/盖世游戏APP租号功能demo.template.html demos/APP租号功能/盖世游戏APP租号功能demo.html demos/APP租号功能/盖世游戏APP租号功能-标注版.html tools/build-app-rental-demo.mjs
git commit -m "feat: expose rental summary in APP PC游戏"
```

### Task 3: 补齐真实交互与异常自动化验收

**Files:**
- Modify: `tools/verify-app-rental-demo.mjs`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 增加四类状态与金额断言**

使用公开测试 API 打开 `play` 并切到 `pc`，断言：

```js
assert.deepEqual(summaryTypes.sort(), ['playable', 'rental-price', 'rented']);
assert(summaryTexts.includes('已租号'));
assert(summaryTexts.includes('可畅玩'));
assert(summaryTexts.includes('¥9.9 · 租号'));
assert(!playText.includes('剩余'));
assert(!playText.includes('账号分配'));
```

另断言 `witcher-3` 卡片没有 `[data-play-rental-summary]`，卡片内容不留空摘要容器。

- [ ] **Step 2: 增加整卡与操作热区隔离断言**

```js
await page.locator('[data-play-game-id="hogwarts"] .small-pill').click();
assert((await page.evaluate(() => window.__appRentalDemo.snapshot().screen)) === 'play');
await page.locator('[data-play-game-id="hogwarts"] .play-game-copy').click();
assert((await page.evaluate(() => window.__appRentalDemo.snapshot().screen)) === 'detail');
```

- [ ] **Step 3: 增加返回恢复断言**

进入详情前将 PC游戏列表滚动到非零位置，返回后断言：

```js
assert(snapshot.playTab === 'pc');
assert(restoredScrollTop > 0);
```

若页面当前没有额外筛选器，仅验证 Tab 与列表位置；不得为满足测试新增筛选功能。

- [ ] **Step 4: 增加摘要降级与非目标 Tab 无回归断言**

把 `hogwarts` 的 `priceResolved`、`inventoryResolved` 或 `eligibilityResolved` 设为 `false`，断言摘要收起但卡片及操作按钮仍存在；随后分别切到 `cloud`、`retro`，断言不存在 `[data-play-rental-summary]`。

- [ ] **Step 5: 增加横竖屏布局约束**

断言横竖屏卡片、摘要和原操作按钮都在设备与卡片边界内，按钮点击热区不小于 44×44，长游戏名不与摘要重叠。

- [ ] **Step 6: 运行完整回归并提交**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 新增 `PLAY_PC_RENTAL` 全部 PASS，原 `FULL_PAGE_MATRIX 36/36`、`ANNOTATION` 等门禁继续 PASS。

```powershell
git add -- tools/verify-app-rental-demo.mjs test-results/app-rental-verification/contract-results.json
git commit -m "test: verify APP PC游戏租号露出"
```

### Task 4: 同步标注说明与 APP PRD V2.7

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`
- Modify: `tools/capture-app-rental-prd-screenshots.mjs`

- [ ] **Step 1: 补充玩游戏 PC 卡片标注**

在 `discovery` 组增加一项，不改标注版三栏结构：

```js
{ id: '2A', type: 'interaction', group: 'discovery', title: 'PC游戏卡租号摘要',
  portraitSelector: '.play-game-card[data-play-game-id]',
  landscapeSelector: '.landscape-hot-card[data-play-game-id]',
  trigger: '进入玩游戏并切换到PC游戏。',
  portrait: '游戏名和原类型/评分下方展示一条租号摘要；有真实人数时再显示在租人数。',
  landscape: '最近常玩与人气热游复用同一摘要，卡片按内容自然增高。',
  feedback: '点击卡片非操作区进入详情；点击启动或下载仍执行原操作。',
  dependency: '优先级为已租号→可畅玩→最低有效租号价→无新增信息。',
  exception: '价格、库存、资格或摘要失败时隐藏新增信息，不影响原列表和操作。' },
```

- [ ] **Step 2: 追加 PRD V2.7 版本记录**

新增版本行，使用黄色背景和蓝色加粗标记：

```markdown
| 2026.08.12 | V2.7 | 郑群超 | <span style="background-color: #FEF794;"><span style="color:#3370FF;"><strong>玩游戏→PC游戏横竖屏卡片新增统一租号摘要；整卡进入详情，原启动/下载操作保持独立</strong></span></span> | <span style="background-color: #FEF794;"><span style="color:#3370FF;"><strong>云游戏、复古游戏和游戏库不变；摘要失败不影响原卡片</strong></span></span> |
```

- [ ] **Step 3: 更新 4.2「2. 玩游戏」**

保持“触发入口 / 展示 / 交互 / 异常情况”及每段从①开始的小序号：

```markdown
**触发入口**
① 用户进入“玩游戏”并切换“PC游戏”。

**展示**
① 每张 PC 游戏卡最多展示一条“已租号 / 可畅玩 / ¥X.X · 租号 / 无新增信息”，优先级依次降低。
② 金额保留一位小数；有真实人数时显示“在租 X+”；不展示剩余租期、订单进度、权益来源或订单类型。
③ 云游戏、复古游戏和游戏库不增加该摘要。

**交互**
① 点击卡片非操作区进入统一详情；点击原启动、秒玩或下载控件执行原操作，不进入详情。
② 从详情返回恢复 PC游戏 Tab、列表位置和已有筛选状态。

**异常情况**
① 人数未知只隐藏人数；价格、库存或资格未知不猜价；摘要整体失败时收起摘要，原卡片和操作仍可用。
```

- [ ] **Step 4: 更新 9.1 验收条目**

把原「2. 玩游戏」验收改为同时覆盖国内/海外入口差异、四类摘要、点击隔离、降级和非目标 Tab 无回归。

- [ ] **Step 5: 保证截图固定打开 PC游戏**

`openCaptureState('play')` 或截图脚本的 `setShotState()` 必须在截图前设置：

```js
state.playTab = 'pc';
```

然后重新构建标注版并检查 PRD 不含占位内容、本地图片地址或旧业务冲突。

- [ ] **Step 6: 运行文档与构建验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Run: `git diff --check`

Expected: 全部 PASS，APP PRD 为 V2.7，标注版包含 `2A · PC游戏卡租号摘要`。

```powershell
git add -- demos/APP租号功能/盖世游戏APP租号功能-标注版.html prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md tools/capture-app-rental-prd-screenshots.mjs
git commit -m "docs: specify APP PC游戏租号卡"
```

### Task 5: 截图、视觉复核、发布与任务板回填

**Files:**
- Modify: `public/prd/app-rental/09-play-portrait.png`
- Modify: `public/prd/app-rental/09-play-landscape.png`
- Modify: `test-results/app-rental-capture/capture-results.json`
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`

- [ ] **Step 1: 生成横竖屏截图**

Run: `node tools/capture-app-rental-prd-screenshots.mjs`

Expected: `CAPTURE 36/36 PASS`，`09-play-portrait.png` 为 390×844，`09-play-landscape.png` 为 874×402，且两张都处于 PC游戏 Tab。

- [ ] **Step 2: 原尺寸人工视觉复核**

逐张检查：

```text
09-play-portrait.png：游戏名、原类型/评分、租号摘要、在租人数、原操作按钮均无重叠或截断。
09-play-landscape.png：最近常玩与人气热游卡片自然增高，按钮完整位于卡片内，不强行拉满整条。
```

如发现溢出、按钮越界、信息重复或租号摘要像按钮，先修模板再重跑构建、验证与截图。

- [ ] **Step 3: 提交截图证据**

```powershell
git add -- public/prd/app-rental/09-play-portrait.png public/prd/app-rental/09-play-landscape.png test-results/app-rental-capture/capture-results.json
git commit -m "test: capture APP PC游戏租号卡"
```

- [ ] **Step 4: 在干净发布 worktree 合并本轮提交并发布 Pages**

使用已存在的 `C:\Users\z3635\官网改动\.tmp\rental-pages-publish-20260812`，只带入本轮相关提交和文件；推送 Pages `master` 后记录实际包含新截图的 40 位 SHA。

- [ ] **Step 5: 固定 PRD 图片地址并远程验收**

把 APP PRD 中本轮截图地址替换为实际新 SHA；逐个请求全部 PRD 图片，要求 HTTP 200 且 PNG 返回 `image/png`。线上普通 Demo、标注版和 PRD 文件都要求 HTTP 200。

- [ ] **Step 6: 最终全量回归**

Run: `node tools/verify-app-rental-demo.mjs`

Run: `git diff --check`

Expected: 新增 PC游戏契约、原 36 页面矩阵、标注版、订单、会员、登录与售后回归全部 PASS。

- [ ] **Step 7: 回填 GUANWANGGAID-3 并进入评审**

先读取任务当前版本，然后添加评论，内容必须包含：实现结果、四类状态、点击隔离、横竖屏截图、验证结果、Pages 提交与线上地址、剩余风险。再使用最新版本将状态从 `in_progress` 移到 `in_review`，不得直接 `done`。

## 自检结果

- 规格覆盖：状态优先级、一位小数、人数降级、点击隔离、返回恢复、横竖屏、非目标 Tab、埋点验收均已映射到任务。
- 占位扫描：无待补内容、延后实现或引用其他任务代替具体步骤的语句。
- 类型一致性：统一使用 `PLAY_PC_GAMES`、`renderPlayRentalSummary()`、`play-card-action`、`data-play-rental-summary`，测试与实现命名一致。
- 范围控制：不新增租号按钮、弹窗、订单状态或新页面；不修改云游戏、复古游戏和游戏库业务。

# 微信 H5 V2 AI 资深玩家评审与交付实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 集成三款高保真游戏，执行有证据支撑的 AI 资深玩家评审并形成保留/返工/淘汰决定，验证微信 `web-view` 承载链路，最终生成可验证防篡改的非生产评审包。

**架构：** 三款游戏继续作为可独立加载的应用，由共享大厅和小程序壳统一承载。自动门禁先产出机器证据，六类 AI 玩家再从普通入口分别对三款游戏完成三局盲评；确定性评分器执行已确认的保留/返工/淘汰规则，只有判定为保留的游戏才能进入基于 Git blob 构建的交付包。

**技术栈：** Node.js ESM、TypeScript、Vite、PixiJS、Playwright Core、PowerShell、Git、JSON、Markdown、微信小程序文件

---

## 前置条件与文件图

以下计划全部通过各自完成门禁后，再执行本计划：

- `2026-07-29-wechat-h5-v2-runtime-art-pipeline.md`
- `2026-07-29-ricochet-crew-game.md`
- `2026-07-29-monster-night-market-game.md`
- `2026-07-29-three-lane-squad-game.md`

上述计划必须全部达到各自的完成标准。

```text
games/wechat-h5-v2/
├─ apps/hub/
├─ apps/ricochet-crew/
├─ apps/monster-night-market/
├─ apps/three-lane-squad/
├─ wechat-miniprogram-shell/
├─ tools/
│  ├─ verify-portfolio.mjs
│  ├─ run-ai-playtest-session.mjs
│  ├─ validate-ai-playtest-report.mjs
│  ├─ summarize-ai-playtests.mjs
│  ├─ build-delivery.ps1
│  └─ verify-delivery.mjs
├─ test-results/
│  ├─ portfolio/
│  └─ ai-playtests/
└─ delivery-allowlist.json
docs/wechat-h5-v2/
├─ README.md
├─ team-collaboration-log.md
├─ ai-playtest-method.md
├─ ai-playtest-decision.md
└─ release-checklist.md
```

目录树只描述预期归属，不授权重复创建已经由共享计划建立的目录；执行前先用 `Test-Path` 核对，缺少前置目录时应停止并回到对应前置计划。

### Task 1: 核对三款游戏组合契约

**文件：**
- 创建：`games/wechat-h5-v2/tools/verify-portfolio.mjs`
- 测试：`games/wechat-h5-v2/tests/integration/portfolio-contract.test.ts`

- [ ] **Step 1: 编写共享大厅目录契约的失败测试**

```ts
import { expect, it } from 'vitest';
import { GAME_CATALOG } from '../../apps/hub/src/catalog';

it('exposes three independent high-fidelity games', () => {
  expect(GAME_CATALOG.map(game => game.id)).toEqual([
    'ricochet-crew',
    'monster-night-market',
    'three-lane-squad'
  ]);
  expect(GAME_CATALOG.map(game => game.href)).toEqual([
    '../ricochet-crew/',
    '../monster-night-market/',
    '../three-lane-squad/'
  ]);
  expect(GAME_CATALOG.every(game => /^\.\/assets\/[a-z-]+\.webp$/u.test(game.art))).toBe(true);
  expect(new Set(GAME_CATALOG.map(game => game.coreInput)).size).toBe(3);
  expect(GAME_CATALOG.every(game => game.duration.length > 0)).toBe(true);
});
```

- [ ] **Step 2: 运行测试并确认验证器尚未实现**

```powershell
npm.cmd --prefix games/wechat-h5-v2 run test -- tests/integration/portfolio-contract.test.ts
```

预期：共享 `catalog.ts` 自身测试通过；组合测试因 `verify-portfolio.mjs` 尚未实现而失败。不得要求共享目录增加额外字段。

- [ ] **Step 3: 固定只读共享接口，不修改大厅目录**

```ts
import {
  GAME_CATALOG,
  type GameCatalogItem,
} from "../../apps/hub/src/catalog";

const catalog: readonly GameCatalogItem[] = GAME_CATALOG;
```

`apps/hub/src/catalog.ts` 由共享运行时计划拥有。本计划只导入 `GAME_CATALOG` 和 `GameCatalogItem`，不得修改该文件，也不得建立第二份目录常量。封面、角色头像和单局范围由各游戏资产清单与玩法规格验证，不塞回大厅目录。

- [ ] **Step 4: 实现静态组合验证**

`verify-portfolio.mjs` 必须检查：

- 三个目录项及其 `href` 指向的构建 HTML 全部存在；
- 每款游戏都有严格资产清单；
- 资产清单不指向 `http:`、`https:`、Emoji、data URI 或缺失文件；
- 普通入口在没有 `test=1` 时忽略 `seed`、`speed` 和 `mute`；
- 三款游戏的 `coreInput` 互不相同；
- 嵌套工程声明了全部必需验证命令。

- [ ] **Step 5: 运行并精确提交**

```powershell
npm.cmd --prefix games/wechat-h5-v2 run test -- tests/integration/portfolio-contract.test.ts
node games/wechat-h5-v2/tools/verify-portfolio.mjs
git add -- games/wechat-h5-v2/tools/verify-portfolio.mjs games/wechat-h5-v2/tests/integration/portfolio-contract.test.ts
git commit -m "feat: define high fidelity game portfolio"
```

预期：测试和验证器均通过；`git diff -- apps/hub/src/catalog.ts` 没有输出。

### Task 2: 共享大厅与三局入口流程

**文件：**
- 修改：`games/wechat-h5-v2/apps/hub/src/main.ts`
- 创建：`games/wechat-h5-v2/apps/hub/src/portfolio-progress.ts`
- 测试：`games/wechat-h5-v2/tests/e2e/hub.e2e.mjs`

- [ ] **Step 1: 编写大厅端到端测试**

在 360×800、390×844 和 430×932 下断言：

- 三张高保真卡图正常渲染且文字不重叠；
- 每张卡展示标题、玩法动词、单局时长、本地游玩次数和最近游玩状态；
- 点击卡片打开其共享 `href` 对应路由；
- 返回后保留大厅滚动位置和上次游玩卡片焦点；
- 完成一局后更新 `hub:recent-games`，无需重载大厅；
- 卡片不声称云存档、排行榜或生产批准。

- [ ] **Step 2: 实现进度投影**

```ts
import type { GameCatalogItem } from "./catalog";

export interface PortfolioProgress {
  gameId: GameCatalogItem['id'];
  completedRuns: number;
  masteryLabel: string;
  dailyState: 'not-started' | 'attempted' | 'completed';
  lastPlayedAt: number | null;
}
```

沿用共享大厅已经使用的 `hub:recent-games` 本地记录，只保存 `lastPlayedAt` 和 `runs`。不得假设 `@gamehub/h5-save` 暴露跨游戏公共摘要，也不得从大厅读取或修改游戏私有存档负载。`dailyState` 若没有正式跨应用公开事件，只能保持 `not-started`，不得从私有数据推断。

- [ ] **Step 3: 完善高保真大厅**

只使用目录中的单个 `art` 卡图字段，不引用目录不存在的封面或头像字段。增加减弱动态和低性能档变体；卡片与控件保留 DOM 语义，CSS 仅用于非游戏动画。

- [ ] **Step 4: 运行并精确提交**

```powershell
npm.cmd --prefix games/wechat-h5-v2 run test:e2e -- hub.e2e.mjs
git add -- games/wechat-h5-v2/apps/hub/src/main.ts games/wechat-h5-v2/apps/hub/src/portfolio-progress.ts games/wechat-h5-v2/tests/e2e/hub.e2e.mjs
git commit -m "feat: integrate v2 game portfolio hub"
```

### Task 3: 微信小程序 `web-view` 承载壳

**文件：**
- 创建文件：`games/wechat-h5-v2/wechat-miniprogram-shell/app.js`
- 创建文件：`games/wechat-h5-v2/wechat-miniprogram-shell/app.json`
- 创建文件：`games/wechat-h5-v2/wechat-miniprogram-shell/app.wxss`
- 创建文件：`games/wechat-h5-v2/wechat-miniprogram-shell/project.config.json`
- 创建文件：`games/wechat-h5-v2/wechat-miniprogram-shell/sitemap.json`
- 创建文件：`games/wechat-h5-v2/wechat-miniprogram-shell/pages/index/index.{js,json,wxml,wxss}`
- 创建文件：`games/wechat-h5-v2/wechat-miniprogram-shell/pages/game/game.{js,json,wxml,wxss}`
- 创建：`games/wechat-h5-v2/tools/verify-miniprogram-shell.mjs`
- 测试：`games/wechat-h5-v2/tests/integration/miniprogram-shell.test.mjs`

- [ ] **Step 1: 编写承载壳契约测试**

断言：

- 所有必需文件存在且 JSON 均可解析；
- `project.config.json` 使用 `touristappid`；
- 路由 `ricochet`、`nightmarket` 和 `squad` 精确映射三款目录项；
- 基础 URL 不是 HTTPS 或仍为示例占位地址时必须拒绝；
- 路由输出绝不包含 `OpenID`、`session_key`、手机号、cookie、token 或 authorization；
- 基础 URL 未配置时不加载 `web-view`；
- 承载壳文案明确声明 `touristappid` 不可用于发布。

- [ ] **Step 2: 运行并确认红灯**

预期：测试失败，原因是 V2 承载壳文件尚不存在；若前置计划已建立空目录，不得删除后重建目录。

- [ ] **Step 3: 实现路由解析**

```js
const ROUTES = Object.freeze({
  ricochet: '/games/ricochet-crew/',
  nightmarket: '/games/monster-night-market/',
  squad: '/games/three-lane-squad/'
});

function resolveGameUrl(baseUrl, key) {
  if (!/^https:\/\/[^/]+/u.test(baseUrl)) return null;
  const route = ROUTES[key] || ROUTES.ricochet;
  return `${baseUrl.replace(/\/+$/u, '')}${route}`;
}
```

不得追加身份或凭证查询参数。

- [ ] **Step 4: 实现选择页与错误状态**

首页用本地卡图列出三款游戏。游戏页只在 URL 配置有效时渲染 `web-view`；否则渲染中文配置错误和返回按钮。

- [ ] **Step 5: 运行并精确提交**

```powershell
node games/wechat-h5-v2/tools/verify-miniprogram-shell.mjs
npm.cmd --prefix games/wechat-h5-v2 run test -- tests/integration/miniprogram-shell.test.mjs
git add -- games/wechat-h5-v2/wechat-miniprogram-shell games/wechat-h5-v2/tools/verify-miniprogram-shell.mjs games/wechat-h5-v2/tests/integration/miniprogram-shell.test.mjs
git commit -m "feat: add v2 WeChat web view shell"
```

### Task 4: 三款游戏组合自动验收

**文件：**
- 创建：`games/wechat-h5-v2/tools/verify-games.mjs`
- 创建：`games/wechat-h5-v2/tests/e2e/portfolio.e2e.mjs`
- 生成：`games/wechat-h5-v2/test-results/portfolio/verification.json`

- [ ] **Step 1: 编码跨游戏验收矩阵**

每款游戏在每个视口下都执行：

```text
normal-entry
first-input
first-payoff
deterministic-win
deterministic-loss
replay-with-new-run-id
lifecycle-pause-resume
save-persist-and-recover
reduced-motion
low-performance-tier
```

瞄准、行列滑动、部署、换路和集火必须使用真实 CDP 触摸事件。

- [ ] **Step 2: 增加生产入口保护**

普通入口必须证明：

```js
window.__GAME_TEST__ === undefined
window.__GAME_DEBUG__ === undefined
state.testMode === false
state.timeScale === 1
```

验证器必须记录控制台错误、页面错误、请求失败、外部请求、敏感字符串和资产失败。

- [ ] **Step 3: 生成原子化机器报告**

使用 `@gamehub/h5-testing` 元数据：

```json
{
  "schemaVersion": 1,
  "gitCommit": "<40 hex>",
  "sourceState": {
    "testedPathsDirty": false,
    "testedPathCount": 1,
    "statusCheck": "git-status-porcelain-v1"
  },
  "exitCode": 0,
  "summary": {
    "pass": 0,
    "fail": 0
  }
}
```

真实报告在运行时写入实际计数和提交；被测路径不干净或 Git 元数据不可用时，必须返回非零退出码并写入失败报告。

- [ ] **Step 4: 运行并提交验证器**

```powershell
node games/wechat-h5-v2/tools/verify-games.mjs
git add -- games/wechat-h5-v2/tools/verify-games.mjs games/wechat-h5-v2/tests/e2e/portfolio.e2e.mjs
git commit -m "test: verify v2 game portfolio"
```

冻结任务开始前不得提交生成报告。

### Task 5: AI 试玩会话证据工具

**文件：**
- 创建：`games/wechat-h5-v2/tools/run-ai-playtest-session.mjs`
- 创建：`games/wechat-h5-v2/tools/validate-ai-playtest-report.mjs`
- 创建：`games/wechat-h5-v2/tools/validate-ai-playtest-matrix.mjs`
- 创建：`games/wechat-h5-v2/tests/integration/ai-playtest-evidence.test.mjs`
- 创建：`docs/wechat-h5-v2/ai-playtest-method.md`

- [ ] **Step 1: 编写证据校验测试**

构造一份有效合成报告并断言通过，同时增加以下拒绝用例：

- 局数不等于三；
- 入口 URL 包含 `test=1`；
- 缺少首次输入或首次爽点时间戳；
- 必需截图少于六张；
- 没有浏览器 trace；
- 给出分数但没有三项具体优点和三项具体问题；
- 声称真实试玩但 `interactionMode !== "browser-touch"`；
- 缺少 `wouldReplay` 投票。

- [ ] **Step 2: 定义评审报告结构**

```ts
export type PlaytestRoundId = 'baseline' | 'rework-1' | 'rework-2';
export type ReviewerRole = 'action' | 'roguelite' | 'casual' | 'puzzle'
  | 'tower-defense' | 'skeptical-generalist';
export type PlaytestGameId =
  | 'ricochet-crew' | 'monster-night-market' | 'three-lane-squad';

export interface AiPlaytestReport {
  schemaVersion: 1;
  roundId: PlaytestRoundId;
  matrixCellId: `${PlaytestRoundId}:${ReviewerRole}:${PlaytestGameId}`;
  reviewerId: string;
  reviewerRole: ReviewerRole;
  gameId: PlaytestGameId;
  buildCommit: string;
  interactionMode: 'browser-touch' | 'evidence-review';
  startedAt: string;
  finishedAt: string;
  runs: [{
    runId: string;
    outcome: 'win' | 'loss';
    firstInputMs: number;
    firstPayoffMs: number;
    strategyTag: string;
    screenshotPaths: string[];
    tracePath: string;
    eventLogPath: string;
  }, {
    runId: string;
    outcome: 'win' | 'loss';
    firstInputMs: number;
    firstPayoffMs: number;
    strategyTag: string;
    screenshotPaths: string[];
    tracePath: string;
    eventLogPath: string;
  }, {
    runId: string;
    outcome: 'win' | 'loss';
    firstInputMs: number;
    firstPayoffMs: number;
    strategyTag: string;
    screenshotPaths: string[];
    tracePath: string;
    eventLogPath: string;
  }];
  scores: {
    first30Seconds: number;
    inputFeedback: number;
    decisionAgency: number;
    threeRunVariety: number;
    failureReplayUrge: number;
    audiovisualQuality: number;
    metaReturnReason: number;
    completeness: number;
  };
  wouldReplay: boolean;
  positives: string[];
  problems: Array<{ severity: 'P0' | 'P1' | 'P2'; evidence: string }>;
  facts: string[];
  inferences: string[];
  unverified: string[];
}
```

所有分数均为 0–100 的整数。

- [ ] **Step 3: 实现会话运行器**

运行器接受：

使用不可覆盖的轮次路径：

```powershell
node games/wechat-h5-v2/tools/run-ai-playtest-session.mjs --round baseline --game ricochet-crew --reviewer action --output games/wechat-h5-v2/test-results/ai-playtests/baseline/action-ricochet-crew
```

它从普通构建入口启动，记录 Playwright trace、截图、控制台/页面/请求错误、运行时事件、三个唯一 `runId` 和机器会话清单。运行器不生成主观分数；评审者必须查看证据后再填写。`validate-ai-playtest-matrix.mjs` 按 `roundId/reviewerRole/gameId` 建立笛卡尔矩阵，拒绝缺格、重复格、非三局报告、跨报告重复 `runId`、混合提交和目录轮次与报告轮次不一致。

- [ ] **Step 4: 编写中文评审方法**

文档明确分为两批：

```text
批次一：动作手感、轻度休闲、解谜策略
批次二：Roguelite构筑、塔防阵型、挑剔综合
```

每名评审者在不阅读设计文档的情况下，对每款游戏恰好完成三局。若无法使用浏览器触摸，必须选择 `evidence-review`；该模式不得计入保留门禁的主动再玩票。

- [ ] **Step 5: 运行测试并精确提交**

```powershell
npm.cmd --prefix games/wechat-h5-v2 run test -- tests/integration/ai-playtest-evidence.test.mjs
git add -- games/wechat-h5-v2/tools/run-ai-playtest-session.mjs games/wechat-h5-v2/tools/validate-ai-playtest-report.mjs games/wechat-h5-v2/tools/validate-ai-playtest-matrix.mjs games/wechat-h5-v2/tests/integration/ai-playtest-evidence.test.mjs docs/wechat-h5-v2/ai-playtest-method.md
git commit -m "test: add evidence backed AI playtest harness"
```

### Task 6: 六类 AI 资深玩家执行 54 局盲评

**文件：**
- 生成：`games/wechat-h5-v2/test-results/ai-playtests/<round>/<reviewer>-<game>/`
- 创建：`docs/wechat-h5-v2/ai-player-prompts.md`

- [ ] **Step 1: 保存精确评审指令**

每份提示词必须包含：

```text
你是资深游戏玩家，不是项目成员。不要先读设计文档。
从普通入口用移动视口和触控完成三局。
第一局不使用提示；第二局主动换策略；第三局判断变化是否真实。
引用截图、trace、事件和具体操作作为证据。
分别列事实、推断、个人评价和未验证项。
给八个0–100整数分、是否愿意主动再玩，并至少列三项优点和三项问题。
不要因为画面精美忽略玩法无聊，也不要因为自动化通过而给高分。
```

六类已确认角色各增加一段岗位专属关注点。

- [ ] **Step 2: 派发第一批 27 局**

安排三名评审员工：

- 动作评审员拥有全部 `action-*` 报告；
- 轻度休闲评审员拥有全部 `casual-*` 报告；
- 解谜评审员拥有全部 `puzzle-*` 报告。

每项任务必须包含普通入口 URL、固定构建提交、输出目录、恰好三局、证据条件和禁止修改源码。第一批矩阵为 3 名评审 × 3 款游戏 × 3 局 = 27 局、9 份报告。

- [ ] **Step 3: 校验第一批**

运行：

```powershell
Get-ChildItem games/wechat-h5-v2/test-results/ai-playtests -Filter 'report.json' -Recurse | ForEach-Object {
  node games/wechat-h5-v2/tools/validate-ai-playtest-report.mjs $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "AI playtest report invalid: $($_.FullName)" }
}
node games/wechat-h5-v2/tools/validate-ai-playtest-matrix.mjs --root games/wechat-h5-v2/test-results/ai-playtests/baseline --round baseline --roles action,casual,puzzle --games ricochet-crew,monster-night-market,three-lane-squad --expected-reports 9 --expected-runs 27
```

预期：三名评审 × 三款游戏 = 9 份有效报告；每份恰好 3 个唯一 `runId`，合计 27 局。

- [ ] **Step 4: 派发并校验第二批 27 局**

对 `roguelite`、`tower-defense` 和 `skeptical-generalist` 重复执行。基线轮累计必须严格等于 18 份有效游戏评审、54 个互不重复的 `runId`，且完整覆盖 6 角色 × 3 游戏的 18 个矩阵格；多一份、少一份、重复矩阵格或跨报告复用 `runId` 都必须失败。

```powershell
node games/wechat-h5-v2/tools/validate-ai-playtest-matrix.mjs --root games/wechat-h5-v2/test-results/ai-playtests/baseline --round baseline --roles action,casual,puzzle,roguelite,tower-defense,skeptical-generalist --games ricochet-crew,monster-night-market,three-lane-squad --expected-reports 18 --expected-runs 54
```

- [ ] **Step 5: 只提交提示词**

评审报告只能在评分完成并冻结源码状态后提交。

```powershell
git add -- docs/wechat-h5-v2/ai-player-prompts.md
git commit -m "docs: define AI senior player panel"
```

### Task 7: 确定性保留/返工/淘汰评分器

**文件：**
- 创建：`games/wechat-h5-v2/tools/summarize-ai-playtests.mjs`
- 测试：`games/wechat-h5-v2/tests/integration/ai-playtest-scoring.test.mjs`
- 生成：`games/wechat-h5-v2/test-results/ai-playtests/summary.json`
- 生成：`docs/wechat-h5-v2/ai-playtest-decision.md`

- [ ] **Step 1: 编写评分测试**

使用以下精确加权公式：

```js
const WEIGHTS = {
  first30Seconds: 0.15,
  inputFeedback: 0.15,
  decisionAgency: 0.15,
  threeRunVariety: 0.15,
  failureReplayUrge: 0.10,
  audiovisualQuality: 0.15,
  metaReturnReason: 0.10,
  completeness: 0.05
};
```

断言：

- RETAIN requires weighted mean ≥75, every dimension mean ≥60, at least 4/6 `wouldReplay`, zero P0/P1;
- REWORK covers total 60–74, any core dimension below 60, 2–3 replay votes, or any P1;
- DROP covers total below 60, 0–1 replay votes, or two failed rework rounds;
- `evidence-review` reports remain visible but cannot contribute a replay vote;
- 缺少任一评审者时输出 `INCOMPLETE`，不得形成保留或淘汰决定。

- [ ] **Step 2: 实现聚合**

先按 `roundId` 分区，再按游戏和评审角色分组；同一轮内拒绝重复报告、混合构建提交、缺失证据、非法分数范围和未经验证的报告。基线轮只有在 18 个矩阵格全部存在、每份恰好三局且合计 54 个唯一 `runId` 时才允许评分；返工轮只要求被返工游戏的 6 个角色格完整、共 6 份报告和 18 个唯一 `runId`。每款游戏只使用其最新完整轮次形成当前决定，同时保留之前轮次的不可变分数和决定。输出各维度均值、加权总分、主动再玩票、问题计数、评审分歧和决定原因。

- [ ] **Step 3: 生成中文决定报告**

Markdown 报告必须：

- 列出全部六名评审者及其交互模式；
- 分开记录事实、推断、意见和未验证项；
- 展示每项分数和加权计算；
- 展示 `RETAIN`、`REWORK`、`DROP` 或 `INCOMPLETE`；
- 为每款游戏写明精确下一步；
- 单独记录真实用户测试状态。

- [ ] **Step 4: 运行并精确提交**

```powershell
npm.cmd --prefix games/wechat-h5-v2 run test -- tests/integration/ai-playtest-scoring.test.mjs
node games/wechat-h5-v2/tools/summarize-ai-playtests.mjs games/wechat-h5-v2/test-results/ai-playtests docs/wechat-h5-v2/ai-playtest-decision.md
git add -- games/wechat-h5-v2/tools/summarize-ai-playtests.mjs games/wechat-h5-v2/tests/integration/ai-playtest-scoring.test.mjs
git commit -m "test: score AI senior player reviews"
```

只有在决定与原始证据逐项核对后，才能提交生成报告。

### Task 8: 最多两轮返工与决定强制执行

**文件：**
- 创建：`games/wechat-h5-v2/tools/enforce-retention-decision.mjs`
- 测试：`games/wechat-h5-v2/tests/integration/retention-decision.test.mjs`
- Modify only the game-specific files named in a failed report during rework

- [ ] **Step 1: 编写决定强制测试**

断言：

- 包构建必须拒绝任何状态为 `REWORK`、`DROP` 或 `INCOMPLETE` 的游戏；
- `RETAIN` 决定必须绑定与源报告相同的构建提交；
- a second REWORK for the same game changes the only legal next state to DROP;
- a game cannot be manually overridden to RETAIN without new six-role evidence.

- [ ] **Step 2: 实现决定强制逻辑**

```js
export function assertRetainedGames(summary, requestedGameIds) {
  for (const gameId of requestedGameIds) {
    const result = summary.games.find(game => game.gameId === gameId);
    if (!result || result.decision !== 'RETAIN') {
      throw new Error(`[AI_PLAYTEST_BLOCKED] ${gameId}: ${result?.decision || 'MISSING'}`);
    }
  }
}
```

- [ ] **Step 3: 执行有证据支撑的返工**

对每款判定为 `REWORK` 的游戏：

1. 选择至少两名评审共同支持、严重度最高的问题；
2. 增加能够证明该问题的失败领域、端到端、视觉或性能测试；
3. 实现最小玩法或反馈修正；
4. 执行该游戏全部门禁；
5. 在新提交上重新执行六类评审，每类恰好三局，即每款返工游戏每轮 6 份报告、18 局；
6. 把 `roundId`、被测提交、问题 ID、修复提交和前后分数写入 `roundHistory`。

每款游戏最多执行 `rework-1`、`rework-2` 两轮。第二轮仍未达到 `RETAIN` 时必须转为 `DROP`；不得创建 `rework-3`，不得手工改写决定。核心主动性或三局变化失败时，不得用增加美术或内容数量掩盖问题。

- [ ] **Step 4: 运行并精确提交**

```powershell
npm.cmd --prefix games/wechat-h5-v2 run test -- tests/integration/retention-decision.test.mjs
git add -- games/wechat-h5-v2/tools/enforce-retention-decision.mjs games/wechat-h5-v2/tests/integration/retention-decision.test.mjs
git commit -m "test: enforce AI playtest retention decisions"
```

### Task 9: 团队协作证据与真实四小时门禁

**文件：**
- 创建：`docs/wechat-h5-v2/team-collaboration-log.md`
- 创建：`games/wechat-h5-v2/tools/verify-collaboration-log.mjs`
- 测试：`games/wechat-h5-v2/tests/integration/collaboration-log.test.mjs`

- [ ] **Step 1: 定义协作日志契约**

每行包含：

```text
startedAt | finishedAt | activeMinutes | role | agent/task | objective | inputs | output | evidencePath | evidenceSha256 | reviewer
```

日志从第一项被接受的 V2 重做任务开始，不计入被否决 V1 的浸泡时间。每行必须对应真实代理消息、文件、截图、报告或提交；`activeMinutes` 必须等于该行可由证据证明的实际工作分钟数，等待、闲置和仅有墙钟跨度不得计入。

- [ ] **Step 2: 编写验证器测试**

必须拒绝：

- 按时间区间求并集后的有证据主动协作时间少于 240 分钟；
- 用最早开始到最晚结束的墙钟跨度冒充主动协作时长；
- 不同职能角色少于六类；
- 任一行结束时间早于开始时间；
- 同一文件所有权重叠且没有明确交接；
- 缺少证据路径或证据哈希；
- 声称完成试玩但没有通过校验的报告。

- [ ] **Step 3: 实现并运行验证器**

验证器必须解析每行 ISO-8601 时间，校验 `activeMinutes <= finishedAt-startedAt`，验证 `evidencePath` 存在且 SHA-256 等于 `evidenceSha256`，再对所有已验证主动区间求并集，避免多个并行员工把同一分钟重复累计。输出同时包含 `wallClockMinutes`、`verifiedActiveUnionMinutes`、角色数、证据行数和无效行数。

```powershell
node games/wechat-h5-v2/tools/verify-collaboration-log.mjs docs/wechat-h5-v2/team-collaboration-log.md
```

仅在真实门禁满足后，预期输出：

```text
COLLABORATION PASS · >=4h · >=6 roles · evidence complete
```

- [ ] **Step 4: 只提交真实可追溯记录**

```powershell
git add -- docs/wechat-h5-v2/team-collaboration-log.md games/wechat-h5-v2/tools/verify-collaboration-log.mjs games/wechat-h5-v2/tests/integration/collaboration-log.test.mjs
git commit -m "docs: record v2 AI game team collaboration"
```

### Task 10: 产品文档

**文件：**
- 创建：`docs/wechat-h5-v2/README.md`
- 创建：`docs/wechat-h5-v2/release-checklist.md`
- 创建：`prd/ai生成/【Prd】《微信H5高保真游戏V2》三款游戏制作人总方案.md`

- [ ] **Step 1: 编写中文开始指南**

使用以下精确执行顺序：

```text
核对ZIP及包外SHA-256
→ 解压并运行包内完整性验证
→ 保留只读母包并复制工作副本
→ 打开统一大厅试玩
→ 安装Node依赖并重跑自动验收
→ 阅读AI资深玩家评分与保留决定
→ 部署HTTPS资源
→ 配置微信业务域名和正式AppID
→ 开发者工具、iOS/Android真机、弱网与后台恢复
→ 真实用户测试
→ 灰度、监控、回滚和审核
```

写明 Node 版本、`npm.cmd ci`、Edge/Chrome 依赖、精确路径、精确命令和生产边界。

- [ ] **Step 2: 编写 PRD**

必须包含：

- 三款产品定义及其组合角色；
- 核心循环和内容边界；
- 高保真资产清单；
- 事件字典和指标公式；
- AI retain/rework/drop results;
- 真实用户状态；
- 12-week productization roadmap;
- 生产 Go/No-Go 要求。

不得把旧 V1 的声明或名称复制进 V2 产品章节。

- [ ] **Step 3: 编写发布清单**

以下门禁必须分开记录：

```text
browser-review
AI-playtest
real-user
WeChat-developer-tools
iOS
Android
HTTPS-domain
CDN
monitoring
gray-release
rollback
platform-review
```

任何未勾选或没有证据的门禁都标为 `NOT EXECUTED`，不得标为 `PASS`。

- [ ] **Step 4: 校验链接并精确提交**

```powershell
node games/wechat-h5-v2/tools/verify-doc-links.mjs docs/wechat-h5-v2/README.md
git add -- docs/wechat-h5-v2/README.md docs/wechat-h5-v2/release-checklist.md 'prd/ai生成/【Prd】《微信H5高保真游戏V2》三款游戏制作人总方案.md'
git commit -m "docs: add v2 game portfolio delivery guide"
```

### Task 11: 严格 V2 交付白名单

**文件：**
- 创建：`games/wechat-h5-v2/delivery-allowlist.json`
- 创建：`games/wechat-h5-v2/tools/export-git-snapshot.mjs`
- 创建：`games/wechat-h5-v2/tools/verify-delivery.mjs`
- 创建：`games/wechat-h5-v2/tools/build-delivery.ps1`
- 测试：`games/wechat-h5-v2/tests/integration/delivery-security.test.mjs`

- [ ] **Step 1: 编写对抗性交付测试**

必须拒绝：

- 额外文件、符号链接、小程序私有配置、密钥、证书、归档、source map、凭证或未列入白名单的资产；
- 路径穿越、绝对路径、反斜杠、重复路径和大小写不同的重复路径；
- a report with nonzero exit, dirty tested paths, unavailable commit, or mixed commit;
- a RETAIN decision bound to another commit;
- 被测提交之后出现运行时代码变化；
- 基线矩阵不是恰好 18 份报告、54 个唯一 `runId`；
- 任一保留游戏缺少其最新完整六角色轮次，或返工次数超过两轮；
- 协作报告的 `verifiedActiveUnionMinutes` 少于 240；
- 微信壳报告、AI 决定、协作报告与 `testedSourceCommit` 不一致；
- a package self-consistent with a forged manifest but not matching trusted Git;
- 输出位于工作区 `dist/v2` 之外；
- 目标 ZIP 或 sidecar 已存在。

- [ ] **Step 2: 定义白名单结构**

```json
{
  "schemaVersion": 1,
  "scope": "wechat-h5-v2-non-production-review",
  "files": [],
  "runtimePaths": [],
  "reports": [],
  "decisionReport": "games/wechat-h5-v2/test-results/ai-playtests/summary.json",
  "baselineMatrixReport": "games/wechat-h5-v2/test-results/ai-playtests/baseline/matrix.json",
  "collaborationReport": "games/wechat-h5-v2/test-results/portfolio/collaboration.json",
  "miniProgramShellReport": "games/wechat-h5-v2/test-results/portfolio/miniprogram-shell.json",
  "documentation": []
}
```

实施时，从已审阅路径生成显式排序文件数组，再提交字面量 JSON。验证器在验证时不得对工作区使用 glob。

- [ ] **Step 3: 实现 Git blob 导出与验证**

从 `git cat-file blob <packageCommit>:<path>` 构建，不得从工作区构建。清单字段：

```text
packageCommit
testedSourceCommit
buildTime
files[{path,bytes,sha256}]
verificationReports
AI decision summary
sourceDiff
```

没有可信仓库时，只能输出 `INTEGRITY PASS · UNAUTHENTICATED`。使用 `--trusted-repo` 时，必须把包内每个字节与 `packageCommit` 对比、证明提交祖先关系，并重新执行运行时代码差异检查，之后才可输出 `AUTHENTICATED DELIVERY PASS`。

- [ ] **Step 4: 实现原子 PowerShell 构建**

构建流程：

1. rejects dirty allowlisted paths;
2. exports exact Git blobs to an OS temp directory;
3. builds manifest and sums;
4. creates a candidate ZIP;
5. extracts and trusted-verifies it;
6. computes the package-level SHA-256;
7. atomically moves ZIP and sidecar into `dist/v2`;
8. never overwrites existing output.

- [ ] **Step 5: 运行对抗测试并精确提交**

```powershell
npm.cmd --prefix games/wechat-h5-v2 run test -- tests/integration/delivery-security.test.mjs
git add -- games/wechat-h5-v2/delivery-allowlist.json games/wechat-h5-v2/tools/export-git-snapshot.mjs games/wechat-h5-v2/tools/verify-delivery.mjs games/wechat-h5-v2/tools/build-delivery.ps1 games/wechat-h5-v2/tests/integration/delivery-security.test.mjs
git commit -m "build: secure v2 game delivery package"
```

### Task 12: 证据冻结与最终评审包

**文件：**
- 生成并提交：`games/wechat-h5-v2/test-results/portfolio/verification.json`
- 生成并提交：`games/wechat-h5-v2/test-results/portfolio/accessibility.json`
- 生成并提交：`games/wechat-h5-v2/test-results/portfolio/performance.json`
- 生成并提交：`games/wechat-h5-v2/test-results/portfolio/longrun.json`
- 生成并提交：`games/wechat-h5-v2/test-results/portfolio/miniprogram-shell.json`
- 生成并提交：`games/wechat-h5-v2/test-results/ai-playtests/`
- 生成：`dist/v2/wechat-h5-high-fidelity-games-review-<commit>.zip`
- 生成：`dist/v2/wechat-h5-high-fidelity-games-review-<commit>.zip.sha256`

- [ ] **Step 1: 冻结被测源码**

运行全部单元、端到端、无障碍、视觉、性能、长时、微信壳、协作和 AI 决定门禁。先提交源码和测试工具，再从干净提交重新生成报告，使每份报告均写入 `testedPathsDirty=false` 并绑定同一个 `testedSourceCommit`。

- [ ] **Step 2: 审阅并提交证据**

独立检查截图、trace、评分报告、警告和报告元数据。只提交精确证据路径；不得使用 `git add -A`。

```powershell
git add -- games/wechat-h5-v2/test-results/portfolio/verification.json games/wechat-h5-v2/test-results/portfolio/accessibility.json games/wechat-h5-v2/test-results/portfolio/performance.json games/wechat-h5-v2/test-results/portfolio/longrun.json games/wechat-h5-v2/test-results/portfolio/miniprogram-shell.json games/wechat-h5-v2/test-results/ai-playtests
git commit -m "test: freeze v2 portfolio review evidence"
```

预期：提交成功；`git diff --name-only HEAD^ HEAD` 只包含上述证据路径，且所有 JSON 的 `testedSourceCommit` 完全一致。

- [ ] **Step 3: 从已提交 blob 构建**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File games/wechat-h5-v2/tools/build-delivery.ps1
```

预期：

```text
AUTHENTICATED DELIVERY PASS
AI PLAYTEST RETAIN PASS
COLLABORATION PASS
ZIP SHA-256: <64 lowercase hex>
```

- [ ] **Step 4: 独立篡改检查**

解压到新的临时目录，同时执行完整性验证和可信验证。然后复制两份解压内容：

- 修改一个 HTML 字节；
- 增加 `project.private.config.json`。

两份副本都必须验证失败。正式 ZIP 和 sidecar 在测试前后必须保持字节完全一致。

- [ ] **Step 5: 最终真实性检查**

独立需求验收员必须分别标记：

- 浏览器高保真评审；
- AI senior-player review;
- 真实用户验证；
- WeChat production.

只有已被证据证明的门禁才能称为 `READY`。未执行真实用户或微信生产检查时，其状态必须保持 `NOT EXECUTED` 或 `NO-GO`。

## 计划完成标准

- 三款游戏均可从大厅和小程序壳独立加载。
- 跨游戏自动化、三局稳定性、高保真视觉证据和真实四小时协作门禁全部通过。
- 基线轮完整覆盖 6 类玩家 × 3 款游戏 × 3 局，严格生成 54 局、18 份有效评审；进入交付包的每款游戏最终决定均为 `RETAIN`。
- `REWORK`、`DROP` 或 `INCOMPLETE` 游戏不能进入交付白名单；每款游戏最多两轮返工。
- 最终 ZIP 从固定 Git blob 构建，具有匹配 sidecar，通过可信验证并能拒绝篡改。
- 最终沟通明确区分 AI 内部评审、真实用户验证和微信生产证据。

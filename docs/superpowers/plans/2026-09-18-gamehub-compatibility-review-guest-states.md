# GameHub 兼容性评价客态实例 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 C 端兼容性评价列表中自然混排其他玩家实例，完整覆盖 G-01～G-07，并保证只有“3～5 星＋有效快照＋评价归属匹配”的记录展示可进入方案详情的入口。

**Architecture:** 保持现有单文件 HTML 与一对一快照仓不变，只扩充 C 端种子数据并在渲染时实时校验星级、快照状态和 `reviewId` 归属；隐藏评价在统计与列表渲染前统一过滤。一次性 seed revision 迁移负责为旧缓存补齐静态客态和快照，同时原位保留非种子用户数据；Playwright 契约直接验证 DOM 不存在、筛选纯净、旧缓存升级和入口到详情的一对一链路，截图脚本补充一张 390×844 客态自然混排证据。

**Tech Stack:** 单文件 HTML/CSS/原生 JavaScript、Node.js `node:test`、Playwright Core、本地 Chrome/Edge、PowerShell、Git、GameHub 产品工作流脚本、`taskctl`

---

## 文件结构与职责

- `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`：补齐其他玩家评价与快照种子、迁移旧缓存、统一过滤后台隐藏评价、实时判断方案入口是否可展示。
- `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`：新增 G-01～G-07、旧缓存幂等迁移、实时归属校验及“全部／同配置／我的”筛选契约，并保留现有编辑、降星、删除和完整旅程回归。
- `tools/capture-compatibility-review-v1.2.mjs`：新增一张 390×844 客态自然混排截图及截图前置断言。
- `test-results/compatibility-review-v1.2/11-c-guest-review-states-390x844.png`：记录其他玩家有效方案与普通评价自然混排的当前视觉证据。
- `prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md`：登记 D-009、产物、测试数量、截图数量和本轮边界。
- `C:/Users/z3635/.codex/state/gamehub-product-workflow/runs/GUANWANGGAID-25-current.json`：按 S3～S8 记录本轮变化编译、基线、执行、机器验证、专业判断和交付对账；此运行状态不纳入 Git。

明确不修改：

- `demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html`
- 启动失败流程、全平台累计 30 分钟门槛、邀评频控、星级口径
- 个人云方案、成功率、验证次数、多人聚合信息
- 方案详情加载失败、失效、设备不兼容等演示入口
- `.superpowers/` 下的本地对比页和临时文件

### Task 1: 先定义客态失败契约并重开工作流

**Files:**
- Modify: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`
- Update outside Git: `C:/Users/z3635/.codex/state/gamehub-product-workflow/runs/GUANWANGGAID-25-current.json`

- [ ] **Step 1: 将已通过的 S3～S8 标记为需要重跑**

Run:

```powershell
$workflowScript = 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1'
$runPath = 'C:\Users\z3635\.codex\state\gamehub-product-workflow\runs\GUANWANGGAID-25-current.json'
$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action rerun -RunPath $runPath -StepId S3 -ExpectedRevision $revision
$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action start-step -RunPath $runPath -StepId S3 -InputPaths @(
  'C:\Users\z3635\官网改动\docs\superpowers\specs\2026-09-18-gamehub-compatibility-review-guest-states-design.md'
) -ExpectedRevision $revision
$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action pass -RunPath $runPath -StepId S3 -Outputs @(
  '只补 C 端客态自然混排与入口显隐校验',
  'G-01 至 G-07 进入自动化契约',
  'B 端与既有业务规则不变'
) -Evidence @(
  '用户确认方案 A：自然混排',
  '用户确认仅补客态，不增加状态标签或异常详情页'
) -Message '客态实例变化已编译，S4-S8 需要重新验证。' -ExpectedRevision $revision
```

Expected: S3 回到 `passed`，S4～S8 为 `stale`，总体状态为 `in_progress`；运行修订号每次写入递增。

- [ ] **Step 2: 添加加载全部评价的测试辅助函数**

在 `submitSharedReview` 后插入：

```js
async function showEveryReview(page) {
  await page.click('#openCompatibilityReviews');
  await page.click('#chipsLs [data-view="all"]');
  while (await page.locator('#loadMoreLs').isVisible()) {
    await page.click('#loadMoreLs');
  }
}
```

- [ ] **Step 3: 添加 G-01～G-07 客态矩阵契约**

在现有“有效快照可打开详情”用例前插入：

```js
test('客态 G-01～G-07 自然混排且仅有效同归属快照展示入口', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await showEveryReview(page);
    const expectations = new Map([
      ['s1', 1], // G-01：有效且归属匹配
      ['s3', 0], // G-02：未分享
      ['s4', 0], // G-03：deprecated
      ['s8', 0], // G-04：invalid
      ['s6', 0], // G-05：1～2 星仍残留快照引用
      ['s9', 0], // G-06：快照归属不匹配
    ]);

    for (const [reviewId, expectedCards] of expectations) {
      const review = page.locator(`[data-feedback-id="${reviewId}"]`);
      assert.equal(await review.count(), 1, `${reviewId} 应作为其他玩家评价出现`);
      assert.equal(
        await review.locator('button.review-solution-card').count(),
        expectedCards,
        `${reviewId} 的方案入口数量不符合客态规则`,
      );
    }

    assert.equal(await page.locator('[data-feedback-id="s10"]').count(), 0, '后台隐藏评价不得进入 C 端 DOM');
    assert.match(
      await page.locator('[data-feedback-id="s6"]').innerText(),
      /Huawei Mate 70 Pro · HarmonyOS 5[\s\S]*GPU：Adreno 750[\s\S]*有部分问题[\s\S]*容易闪退/,
      '2 星问题评价必须保留设备、兼容类型和问题描述',
    );

    const validCard = page.locator('[data-feedback-id="s1"] .review-solution-card');
    assert.equal(await validCard.evaluate((element) => element.tabIndex >= 0), true);
    assert.match(await validCard.innerText(), /本次启动方案[\s\S]*本次游玩 18分42秒/);
    await validCard.click();
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), true);
    assert.match(await page.locator('#solutionShareSummary').innerText(), /Pixel用户_洛圣都 · 本次游玩 18分42秒/);
    assertNoPageErrors(errors, '客态 G-01～G-07');
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 4: 添加快照归属实时校验契约**

```js
test('评价列表每次渲染都校验快照 reviewId 归属', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await showEveryReview(page);
    assert.equal(await page.locator('[data-feedback-id="s1"] .review-solution-card').count(), 1);
    await page.evaluate(() => {
      const storageKey = 'gh_review_snapshots_v1';
      const snapshots = window.compatibilityDemo.getReviewSnapshots();
      snapshots.review_snapshot_s1.reviewId = 'foreign-review';
      localStorage.setItem(storageKey, JSON.stringify(snapshots));
      window.refreshPanel('ls');
    });
    assert.equal(await page.locator('[data-feedback-id="s1"] .review-solution-card').count(), 0);
    assert.equal(await page.locator('[data-feedback-id="s1"] button[aria-label="打开本次启动方案"]').count(), 0);
    assertNoPageErrors(errors, '快照归属实时校验');
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 5: 添加筛选纯净度契约**

```js
test('客态进入全部与同配置但不会混入我的筛选', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await page.click('#openCompatibilityReviews');
    assert.ok(await page.locator('#listLs [data-owner="other"]').count() > 0, '同配置应包含其他玩家');
    assert.equal(await page.locator('[data-feedback-id="s5"]').count(), 0, 'Dimensity 9400 不属于当前同 GPU');

    await page.click('#chipsLs [data-view="all"]');
    while (await page.locator('#loadMoreLs').isVisible()) await page.click('#loadMoreLs');
    assert.equal(await page.locator('[data-feedback-id="s5"]').count(), 1, '全部应包含其他 GPU 评价');

    await page.click('#chipsLs [data-view="mine"]');
    assert.equal(await page.locator('#listLs [data-owner="other"]').count(), 0, '我的筛选不得混入客态');
    assertNoPageErrors(errors, '客态筛选纯净度');
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 6: 运行新增契约并确认先失败**

Run:

```powershell
node --test --test-name-pattern="客态 G-01|快照 reviewId|客态进入全部" tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: 进程非零退出；至少“客态 G-01～G-07”因 `s8/s9/s10` 尚不存在而失败，“快照 reviewId”因当前渲染未校验 `snapshot.reviewId` 而失败；不得出现测试文件语法错误。

### Task 2: 实现客态种子、隐藏过滤与实时入口校验

**Files:**
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 启动并通过 S4 原页面基线步骤**

Run:

```powershell
$workflowScript = 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1'
$runPath = 'C:\Users\z3635\.codex\state\gamehub-product-workflow\runs\GUANWANGGAID-25-current.json'
$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action start-step -RunPath $runPath -StepId S4 -InputPaths @(
  'C:\Users\z3635\官网改动\demos\游戏详情\GUANWANGGAID-25-兼容性评价改版-C端demo.html',
  'C:\Users\z3635\官网改动\docs\superpowers\specs\2026-09-18-gamehub-compatibility-review-guest-states-design.md'
) -ExpectedRevision $revision
$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action pass -RunPath $runPath -StepId S4 -Outputs @(
  '保留现有评价列表结构、卡片组件、方案详情与筛选组件'
) -Evidence @(
  '当前 C 端 Demo 为同版本实现基线',
  '用户确认复用现有样式并采用自然混排'
) -Reviewer 'Codex 产品与界面基线复核' -Message '原页面结构与交互基线已确认。' -ExpectedRevision $revision
```

Expected: S4 为 `passed`，S5 成为可执行步骤。

- [ ] **Step 2: 扩充快照种子以覆盖 G-04、G-05 和 G-06**

在 `SEED_REVIEW_SNAPSHOTS` 的 `review_snapshot_s4` 后增加以下三个对象；每个对象继续使用现有白名单配置分组，不增加新模型字段：

```js
    review_snapshot_s6: Object.freeze({
        reviewSnapshotId: 'review_snapshot_s6',
        reviewId: 's6',
        solutionName: '本次启动方案',
        status: 'available',
        gameId: 'gta5',
        platform: 'android',
        gpuModel: 'Adreno 750',
        gpu: { id: 'adreno-750', displayName: 'Adreno 750' },
        runtimeArchitecture: 'arm64',
        engineVersion: 'demo-engine-v1',
        schemaVersion: '1',
        canonicalizerVersion: '1',
        configHash: 'cfg_low_star_residual_v1',
        sourceType: 'review_snapshot',
        reviewAuthorDisplayName: '华为用户_特雷弗',
        playSessionId: 'seed_session_s6',
        durationSeconds: 731,
        sharedAt: '2025-04-15T11:20:00.000Z',
        configGroups: createSeedSolutionConfigGroups(),
        actions: { canApply: true, applyDisabledReason: '', canCopy: true, copyDisabledReason: '' }
    }),
    review_snapshot_s8: Object.freeze({
        reviewSnapshotId: 'review_snapshot_s8',
        reviewId: 's8',
        solutionName: '本次启动方案',
        status: 'invalid',
        gameId: 'gta5',
        platform: 'android',
        gpuModel: 'Adreno 750',
        gpu: { id: 'adreno-750', displayName: 'Adreno 750' },
        runtimeArchitecture: 'arm64',
        engineVersion: 'demo-engine-v1',
        schemaVersion: '1',
        canonicalizerVersion: '1',
        configHash: 'cfg_invalid_guest_v1',
        sourceType: 'review_snapshot',
        reviewAuthorDisplayName: 'ROG玩家_老崔',
        playSessionId: 'seed_session_s8',
        durationSeconds: 1286,
        sharedAt: '2025-04-10T08:15:00.000Z',
        configGroups: createSeedSolutionConfigGroups(),
        actions: { canApply: false, applyDisabledReason: '方案已不可用', canCopy: false, copyDisabledReason: '方案已不可用' }
    }),
    review_snapshot_s9: Object.freeze({
        reviewSnapshotId: 'review_snapshot_s9',
        reviewId: 'foreign-review',
        solutionName: '本次启动方案',
        status: 'available',
        gameId: 'gta5',
        platform: 'android',
        gpuModel: 'Adreno 750',
        gpu: { id: 'adreno-750', displayName: 'Adreno 750' },
        runtimeArchitecture: 'arm64',
        engineVersion: 'demo-engine-v1',
        schemaVersion: '1',
        canonicalizerVersion: '1',
        configHash: 'cfg_foreign_owner_v1',
        sourceType: 'review_snapshot',
        reviewAuthorDisplayName: 'iQOO玩家_尼克',
        playSessionId: 'seed_session_s9',
        durationSeconds: 1540,
        sharedAt: '2025-04-08T13:40:00.000Z',
        configGroups: createSeedSolutionConfigGroups(),
        actions: { canApply: true, applyDisabledReason: '', canCopy: true, copyDisabledReason: '' }
    })
```

- [ ] **Step 3: 扩充评价种子以覆盖无效、错绑和隐藏状态**

将 `s6` 增加残留快照引用，并在 `SEEDS` 尾部加入 `s8/s9/s10`：

```js
    { id:'s6', uid:'u6', name:'华为用户_特雷弗', avatar:AVATARS[5], device:'Huawei Mate 70 Pro · HarmonyOS 5', gpu:'Adreno 750', memoryGB:12, appVersion:'v6.0.2', stars:2, tags:['有部分问题'], text:'GTA在线模式进服务器时容易闪退，已经发生三次了，希望能修复。', date:'2025-04-15', likes:5, reviewState:'none', reviewSnapshotId:'review_snapshot_s6', durationSeconds:731 },
    { id:'s8', uid:'u8', name:'ROG玩家_老崔', avatar:'', device:'ROG Phone 9 · Android 15', gpu:'Adreno 750', memoryGB:16, appVersion:'v6.1.0', stars:4, tags:['完美兼容'], text:'画面和操作都很稳定，连续游玩没有明显掉帧。', date:'2025-04-10', likes:9, reviewState:'unavailable', reviewSnapshotId:'review_snapshot_s8', durationSeconds:1286 },
    { id:'s9', uid:'u9', name:'iQOO玩家_尼克', avatar:'', device:'iQOO 13 · Android 15', gpu:'Adreno 750', memoryGB:16, appVersion:'v6.1.0', stars:5, tags:['完美兼容'], text:'启动和游玩体验正常，手柄按键映射准确。', date:'2025-04-08', likes:14, reviewState:'valid', reviewSnapshotId:'review_snapshot_s9', durationSeconds:1540 },
    { id:'s10', uid:'u10', name:'已隐藏玩家', avatar:'', device:'RedMagic 10 Pro · Android 15', gpu:'Adreno 750', memoryGB:16, appVersion:'v6.1.0', stars:5, tags:['完美兼容'], text:'这条评价已被后台隐藏，不应出现在 C 端。', date:'2025-04-06', likes:2, hidden:true }
```

保留原 `s1～s5/s7` 的文案、设备、排序和快照引用不变。

- [ ] **Step 3A: 为旧缓存增加一次性双仓迁移**

在存储 key 区增加：

```js
const SEED_DATA_REVISION_KEY = 'gh_compat_seed_revision_gta5_v12';
const SEED_DATA_REVISION = 'guest-states-v1';
```

在 `SEEDS` 后增加，并分别在 `getFeedbacks()` 与 `getReviewSnapshots()` 的第一行调用 `migrateSeedDataIfNeeded()`：

```js
function cloneSeedValue(value) {
    return JSON.parse(JSON.stringify(value));
}

function migrateSeedDataIfNeeded() {
    if (localStorage.getItem(SEED_DATA_REVISION_KEY) === SEED_DATA_REVISION) return;

    let storedFeedbacks = [];
    let storedSnapshots = {};
    try {
        const parsedFeedbacks = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
        if (Array.isArray(parsedFeedbacks)) storedFeedbacks = parsedFeedbacks;
    } catch(e) {}
    try {
        const parsedSnapshots = JSON.parse(localStorage.getItem(REVIEW_SNAPSHOTS_KEY) || '{}');
        if (parsedSnapshots && !Array.isArray(parsedSnapshots) && typeof parsedSnapshots === 'object') {
            storedSnapshots = parsedSnapshots;
        }
    } catch(e) {}

    const seedFeedbacksById = new Map(SEEDS.map(review => [review.id, review]));
    const migratedFeedbacks = [];
    const migratedSeedIds = new Set();
    storedFeedbacks.forEach(review => {
        const seed = review && seedFeedbacksById.get(review.id);
        if (!seed) {
            migratedFeedbacks.push(review);
            return;
        }
        if (migratedSeedIds.has(seed.id)) return;
        migratedFeedbacks.push(cloneSeedValue(seed));
        migratedSeedIds.add(seed.id);
    });
    SEEDS.forEach(seed => {
        if (migratedSeedIds.has(seed.id)) return;
        migratedFeedbacks.push(cloneSeedValue(seed));
        migratedSeedIds.add(seed.id);
    });

    const migratedSnapshots = {};
    Object.entries(storedSnapshots).forEach(([reviewSnapshotId, snapshot]) => {
        migratedSnapshots[reviewSnapshotId] = cloneSeedValue(
            SEED_REVIEW_SNAPSHOTS[reviewSnapshotId] || snapshot
        );
    });
    Object.entries(SEED_REVIEW_SNAPSHOTS).forEach(([reviewSnapshotId, snapshot]) => {
        if (Object.prototype.hasOwnProperty.call(migratedSnapshots, reviewSnapshotId)) return;
        migratedSnapshots[reviewSnapshotId] = cloneSeedValue(snapshot);
    });

    try {
        localStorage.setItem(LS_KEY, JSON.stringify(migratedFeedbacks));
        localStorage.setItem(REVIEW_SNAPSHOTS_KEY, JSON.stringify(migratedSnapshots));
        localStorage.setItem(SEED_DATA_REVISION_KEY, SEED_DATA_REVISION);
    } catch(e) {}
}
```

迁移同时读写评价仓和快照仓，因此无调用顺序依赖；revision 只在双仓写入成功后记录。已有静态种子按 ID 原位更新，缺失种子追加，非种子评价和快照保留，二次调用不再改写缓存。

- [ ] **Step 3B: 添加旧缓存升级与幂等回归契约**

新增用例必须先构造仅含 `s1～s7`、旧快照和两条非种子评价的缓存，移除 revision 后 reload；断言：

```js
assert.equal(await page.locator('#ovCountLs').innerText(), '9 条玩家评价');
assert.equal(await page.locator('#ovScoreLs').innerText(), '4.1');
assert.equal(await page.locator('[data-feedback-id="s8"]').count(), 1);
assert.equal(await page.locator('[data-feedback-id="s9"]').count(), 1);
assert.equal(await page.locator('[data-feedback-id="s10"]').count(), 0);
assert.equal(await page.locator('[data-feedback-id="s6"] .review-solution-card').count(), 0);
assert.equal(migrated.legacyReviewA?.text, '旧缓存评价A应被保留。');
assert.equal(migrated.legacyReviewB?.text, '旧缓存评价B应被保留。');
assert.ok(migrated.legacyOrder[0] < migrated.legacyOrder[1], '非种子评价的相对顺序不得改变');
assert.equal(migrated.legacySnapshot?.reviewId, 'legacy-user-review-a');
assert.deepEqual(
  migrated.migratedSeedSnapshotIds,
  ['review_snapshot_s6', 'review_snapshot_s8', 'review_snapshot_s9'],
);
assert.equal(migrated.revision, 'guest-states-v1');
assert.equal(rerun.feedbackCache, migrated.feedbackCache, '评价迁移必须幂等');
assert.equal(rerun.snapshotCache, migrated.snapshotCache, '快照迁移必须幂等');
```

Expected: 修复前因 reload 后仍为 7 条而失败；修复后客态与迁移契约 4/4 通过，全量测试由 33 条增至 34 条。

- [ ] **Step 4: 统一过滤后台隐藏与已删除评价**

在 `getFeedbacks` 后增加：

```js
function getVisibleFeedbacks() {
    return getFeedbacks().filter(review => review && review.hidden !== true && review.deleted !== true);
}
```

将 `refreshEntryCard` 和 `refreshPanel` 中的列表来源都改为：

```js
const list = getVisibleFeedbacks();
```

这样 G-07 同时从评分统计、数量、分布条和列表 DOM 中消失；编辑、删除等按 ID 访问原始数据的函数继续使用 `getFeedbacks()`。

- [ ] **Step 5: 把方案入口显隐和点击收敛为实时完整校验**

将 `renderReviewSolution` 改为：

```js
function canRenderReviewSolution(review, snapshot) {
    return Number(review?.stars || 0) >= 3
        && Boolean(snapshot)
        && snapshot.status === 'available'
        && snapshot.reviewId === review.id
        && snapshot.reviewSnapshotId === review.reviewSnapshotId;
}

function renderReviewSolution(review) {
    const snapshot = resolveReviewSnapshot(review);
    if (!canRenderReviewSolution(review, snapshot)) return '';
    return '<button class="review-solution-card" type="button" data-action="open-review-solution" aria-label="打开本次启动方案"><span class="review-solution-heading"><strong>本次启动方案</strong><b aria-hidden="true">›</b></span><span class="review-solution-meta">本次游玩 ' + formatDuration(snapshot.durationSeconds) + '</span></button>';
}

function handleReviewSolutionAction(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button[data-action="open-review-solution"]');
    if (!button) return;
    const item = button.closest('.compat-item');
    const list = button.closest('#listLs, #listPt');
    const reviewId = item?.dataset.feedbackId || '';
    const review = getVisibleFeedbacks().find(candidate => candidate.id === reviewId);
    const snapshot = resolveReviewSnapshot(review);
    if (!canRenderReviewSolution(review, snapshot)) {
        if (list) refreshPanel(list.id === 'listPt' ? 'pt' : 'ls');
        return;
    }
    openSolutionDetail(snapshot.reviewSnapshotId);
}

function bindReviewSolutionActions() {
    ['listLs', 'listPt'].forEach(listId => {
        const list = document.getElementById(listId);
        if (!list || list.dataset.reviewSolutionBound === 'true') return;
        list.addEventListener('click', handleReviewSolutionAction);
        list.dataset.reviewSolutionBound = 'true';
    });
}
```

在 `bindCompatibilityV12Demo()` 中调用 `bindReviewSolutionActions()`。`reviewState` 继续只作为评价卡数据属性存在，不参与方案入口权限判断；按钮不拼接动态 ID 或内联脚本，点击时重新读取并复验当前评价与快照，校验失败只静默刷新当前列表，不新增 Toast。

- [ ] **Step 5A: 固化错绑、注入与陈旧缓存安全契约**

新增三个失败后转绿的用例，测试名分别为：

- `方案入口拒绝快照内部 ID 与评价引用不一致`
- `恶意快照 ID 不进入可执行字符串且点击安全`
- `已渲染方案入口点击时重新校验当前快照`

三个用例分别断言：内部 `reviewSnapshotId` 不一致时入口不生成；恶意 ID 不产生 `onclick` 或脚本副作用；按钮渲染后快照归属被替换时，点击不打开详情、不应用、不新增 Toast，并静默刷新移除入口。

- [ ] **Step 6: 运行新增契约并确认通过**

Run:

```powershell
node --test --test-name-pattern="客态 G-01|快照 reviewId|客态进入全部|方案入口拒绝|恶意快照 ID|已渲染方案入口" tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: 客态、筛选和安全契约全部通过，无 `pageerror`；G-01 进入现有完整方案详情，G-02～G-06 无方案按钮，G-07 不进入 DOM；动态快照 ID 不进入可执行字符串。

- [ ] **Step 7: 运行 C 端关键回归**

Run:

```powershell
node --test --test-name-pattern="查看并应用他人快照|编辑评价文字|有效快照可打开详情|C 端 390x844|C 端 844x390" tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: 关键回归全部通过；“我的”独立快照、编辑保留快照、降为 2 星删除快照、应用／复制和两个方向的布局均不回归。

- [ ] **Step 8: 提交通过的契约与 C 端实现**

```powershell
git add -- 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' 'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs'
git commit --only -m "feat: add guest compatibility review states" -- 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' 'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs'
```

Expected: 只提交 C 端 Demo 和浏览器契约，工作区其他改动不进入提交。

### Task 3: 增加客态截图并完成原尺寸视觉检查

**Files:**
- Modify: `tools/capture-compatibility-review-v1.2.mjs`
- Create: `test-results/compatibility-review-v1.2/11-c-guest-review-states-390x844.png`
- Replace by script: `test-results/compatibility-review-v1.2/01-*.png` through `10-*.png`

- [ ] **Step 1: 新增客态截图函数**

在 `captureBLinkedFilter` 前插入：

```js
async function captureGuestReviewStates() {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 390, height: 844 });
  try {
    await domClick(page, '#openCompatibilityReviews', '兼容性评价入口');
    await domClick(page, '#chipsLs [data-view="all"]', '全部评价筛选');
    await requireOne(page, '[data-feedback-id="s1"] .review-solution-card', '客态有效方案入口');
    await requireOne(page, '[data-feedback-id="s3"]', '客态未分享普通评价');
    if (await page.locator('[data-feedback-id="s3"] .review-solution-card').count() !== 0) {
      throw new Error('未实现契约：未分享评价错误展示方案入口');
    }
    const visibleListText = await page.locator('#listLs').innerText();
    if (/未分享|方案失效|方案无效|归属不一致/.test(visibleListText)) {
      throw new Error('未实现契约：客态列表暴露技术状态说明');
    }
    await shot(page, '11-c-guest-review-states-390x844.png');
    assertNoPageErrors(errors, 'C 端客态自然混排截图');
  } finally {
    await page.close();
  }
}
```

- [ ] **Step 2: 将新截图纳入脚本主流程**

将脚本尾部改为：

```js
try {
  await captureCConnectedJourney();
  await captureBLinkedFilter();
  await captureGuestReviewStates();
  if (captured.length !== 11) throw new Error(`截图数量错误：预期 11，实际 ${captured.length}`);
} finally {
  await browser.close();
}
```

- [ ] **Step 3: 生成 11 张当前截图**

Run:

```powershell
node tools/capture-compatibility-review-v1.2.mjs
(Get-ChildItem -LiteralPath 'test-results\compatibility-review-v1.2' -Filter '*.png').Count
```

Expected: 截图脚本退出码为 0，计数为 `11`，新增文件名为 `11-c-guest-review-states-390x844.png`。

- [ ] **Step 4: 按原始分辨率审查新增截图**

使用 `view_image` 以 `detail: "original"` 打开：

`C:/Users/z3635/官网改动/test-results/compatibility-review-v1.2/11-c-guest-review-states-390x844.png`

逐项确认：

1. 390×844 手机容器无横向溢出、遮挡或裁切。
2. 其他玩家评价自然混排，不出现客态状态标签、测试说明或交互标注。
3. `s1` 显示“本次启动方案＋本次游玩 18分42秒”。
4. `s3` 保持普通评价，没有空方案卡、额外留白或残留箭头。
5. 原有头像线框、星级、设备、GPU、正文、日期和支持操作保持既有视觉层级。

Expected: 五项全部通过；发现影响演示的问题时只修复 C 端对应样式或截图驱动状态，并重新执行 Step 3 和 Step 4。

- [ ] **Step 5: 提交截图脚本与视觉证据**

```powershell
git add -- 'tools/capture-compatibility-review-v1.2.mjs' 'test-results/compatibility-review-v1.2'
git commit --only -m "test: capture guest review states" -- 'tools/capture-compatibility-review-v1.2.mjs' 'test-results/compatibility-review-v1.2'
```

Expected: 只提交截图脚本和 11 张当前截图；不提交 `.superpowers/`。

### Task 4: 全量验证、状态回写与任务板对账

**Files:**
- Verify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`
- Verify unchanged: `demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html`
- Verify: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`
- Verify: `tools/capture-compatibility-review-v1.2.mjs`
- Modify: `prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md`
- Update outside Git: `C:/Users/z3635/.codex/state/gamehub-product-workflow/runs/GUANWANGGAID-25-current.json`

- [ ] **Step 1: 运行语法、全量浏览器契约与静态检查**

Run:

```powershell
node --check tools/capture-compatibility-review-v1.2.mjs
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git diff --check -- 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' 'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs' 'tools/capture-compatibility-review-v1.2.mjs' 'prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md'
```

Expected: `node --check` 通过；浏览器契约 37/37 通过；`git diff --check` 无错误。

- [ ] **Step 2: 执行禁止项、筛选与离线静态检查**

Run:

```powershell
rg -n "客态|未分享方案|方案失效|方案无效|归属不一致|测试说明|交互说明|成功率|次验证|最近验证|社区共同验证" 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html'
rg -n "https?://|<iframe|<canvas|秒玩|prd-badge|prd-tooltip" 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html'
git diff --quiet HEAD -- 'demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html'
```

Expected: 第一条只允许测试种子正文“这条评价已被后台隐藏，不应出现在 C 端”之外的业务数据或既有方案详情异常文案，不得在可见评价列表新增技术标签；第二条不得新增远程运行依赖、`iframe`、`canvas`、“秒玩”或 Demo 标注节点；第三条退出码为 0，证明 B 端未改。

- [ ] **Step 3: 按产品、交互、开发三个视角完成 S7 快速评审**

评审证据统一指向当前 C 端 Demo、37/37 测试日志和 `11-c-guest-review-states-390x844.png`：

- 产品：G-01～G-07、全部／同配置／我的、进入现有方案详情链路完整，未扩展异常详情页。
- 交互：只有有效且归属匹配的快照出现可聚焦按钮；隐藏态无留白、热区、焦点和技术说明。
- 开发：每次渲染读取快照并校验 `stars/status/reviewId`，不依赖 `reviewState`；隐藏评价同时从统计和列表过滤。

Expected: 三个视角均无“必须修”问题；若发现问题，修复后重新执行 Task 2 Step 6～7 和 Task 3 Step 3～4。

- [ ] **Step 4: 回写状态卡**

在“已确认决策”新增：

```markdown
| D-009 | 客态评价自然混排；仅 3～5 星、快照 `available` 且 `snapshot.reviewId=review.id` 时展示“本次启动方案”；未分享、废弃、无效、1～2 星、错绑均不展示入口，后台隐藏评价整条不展示 | 用户确认客态方案 A 与状态矩阵 | 2026-09-18 | 补充 D-004、D-006、D-007 的 C 端展示边界 |
```

在“产物登记”更新：

```markdown
| 客态设计规格 | `docs/superpowers/specs/2026-09-18-gamehub-compatibility-review-guest-states-design.md` | 已同步 | 用户确认自然混排与 G-01～G-07 |
| 客态实施计划 | `docs/superpowers/plans/2026-09-18-gamehub-compatibility-review-guest-states.md` | 已同步 | TDD、C 端显隐、筛选、截图与回写步骤已覆盖 |
| 浏览器契约 | `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs` | 已同步 | `node --test`：37/37 通过 |
| 视觉证据 | `test-results/compatibility-review-v1.2/` | 已同步 | 11 张当前截图；新增 390×844 客态自然混排图人工审图通过 |
```

在“修改与验证”新增：

```markdown
| 2026-09-18 | 仅补客态，采用自然混排并穷举其他玩家方案入口状态 | C 端补齐 G-01～G-07，实时校验星级、快照状态、内部 ID 与评价归属；点击时重新校验并移除动态内联脚本；隐藏评价从统计和列表过滤；旧缓存通过幂等迁移补齐客态并保留非种子数据 | C 端 Demo、浏览器契约、截图、状态卡 | 37/37 浏览器契约通过；11/11 截图成功；客态原尺寸人工审图通过；B 端无需修改 |
```

- [ ] **Step 5: 完成 S5～S8 工作流回写**

按当前修订号逐步执行，不复用旧修订号：

```powershell
$workflowScript = 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1'
$runPath = 'C:\Users\z3635\.codex\state\gamehub-product-workflow\runs\GUANWANGGAID-25-current.json'

$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action start-step -RunPath $runPath -StepId S5 -InputPaths @(
  'C:\Users\z3635\官网改动\docs\superpowers\specs\2026-09-18-gamehub-compatibility-review-guest-states-design.md',
  'C:\Users\z3635\官网改动\demos\游戏详情\GUANWANGGAID-25-兼容性评价改版-C端demo.html'
) -ExpectedRevision $revision
$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action pass -RunPath $runPath -StepId S5 -Outputs @(
  'C 端客态自然混排与 G-01 至 G-07',
  '客态浏览器契约',
  '390x844 客态截图脚本'
) -Evidence @('功能提交与截图提交') -Message '仅修改已确认的 C 端客态范围。' -ExpectedRevision $revision

$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action start-step -RunPath $runPath -StepId S6 -InputPaths @(
  'C:\Users\z3635\官网改动\tests\compatibility-review-v1.2\compatibility-review-v1.2.browser.test.mjs',
  'C:\Users\z3635\官网改动\tools\capture-compatibility-review-v1.2.mjs'
) -ExpectedRevision $revision
$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action pass -RunPath $runPath -StepId S6 -Outputs @('37/37 浏览器契约通过','11/11 截图成功','静态检查通过') -Evidence @('node --test 日志','截图脚本日志','git diff --check') -Message '机器验证通过。' -ExpectedRevision $revision

$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action start-step -RunPath $runPath -StepId S7 -InputPaths @(
  'C:\Users\z3635\官网改动\test-results\compatibility-review-v1.2\11-c-guest-review-states-390x844.png',
  'C:\Users\z3635\官网改动\demos\游戏详情\GUANWANGGAID-25-兼容性评价改版-C端demo.html'
) -ExpectedRevision $revision
$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action pass -RunPath $runPath -StepId S7 -Outputs @('产品、交互、开发三视角通过') -Evidence @('390x844 原尺寸客态截图','G-01 至 G-07 浏览器契约') -Reviewer 'Codex 产品／交互／开发复核' -Message '客态自然混排、显隐边界和筛选纯净度通过专业判断。' -ExpectedRevision $revision

$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action start-step -RunPath $runPath -StepId S8 -InputPaths @(
  'C:\Users\z3635\官网改动\prd\workflow-state\GUANWANGGAID-25-compatibility-review-v1-2.md'
) -ExpectedRevision $revision
$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action pass -RunPath $runPath -StepId S8 -Outputs @('状态卡与产物证据完成对账') -Evidence @('源文件已同步','机器验证通过','专业判断通过','Git 已提交','公开预览未执行','远程资源未执行') -Message '客态补充完成交付对账，仍待用户验收。' -ExpectedRevision $revision
```

Expected: S3～S8 均为 `passed`，总体状态恢复为 `passed`；S8 六类证据口径完整。

- [ ] **Step 6: 提交状态卡并只暂存本任务文件**

```powershell
git add -- 'prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md'
git commit --only -m "docs: record guest review evidence" -- 'prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md'
git status --short
```

Expected: 状态卡单独提交；`git status --short` 可继续显示用户或其他任务的无关改动，但本计划未将其纳入任何提交。

- [ ] **Step 7: 在任务板追加验证评论并保持 `in_review`**

Run:

```powershell
taskctl issue get GUANWANGGAID-25 --json
taskctl comment add GUANWANGGAID-25 --body "已补齐 C 端客态自然混排：覆盖 G-01～G-07，方案入口实时校验 3～5 星、available、快照内部 ID 与 reviewId 归属，点击时再次校验且无动态内联脚本；旧缓存幂等迁移保留非种子数据；我的筛选保持纯净，B 端未改。机器验证 37/37 通过，截图 11/11 成功，新增 11-c-guest-review-states-390x844.png 已完成原尺寸审图。已知边界：未新增方案详情异常演示页，仍待用户最终验收。" --json
$issue = taskctl issue get GUANWANGGAID-25 --json | ConvertFrom-Json
if ($issue.task.status -ne 'in_review') {
  taskctl issue move GUANWANGGAID-25 --status in_review --if-version $issue.task.version --json
}
```

Expected: 任务板存在本轮变更、验证和风险评论，最终状态为 `in_review`；未经用户最终验收不移动到 `done`。

## 自检结论

- 规格覆盖：Task 1～2 对应 G-01～G-07、旧缓存幂等迁移以及全部／同配置／我的；Task 3 覆盖新增 390×844 客态截图；Task 4 覆盖现有编辑、降星、删除、布局、全量测试、视觉评审和状态回写。
- 字段一致：全链路统一使用 `reviewSnapshotId`、`reviewId`、`status`、`durationSeconds`、`hidden`；方案入口只接受 `stars >= 3 && snapshot && status === 'available' && snapshot.reviewId === review.id && snapshot.reviewSnapshotId === review.reviewSnapshotId`，点击时复用同一 guard。
- DOM 边界：G-02～G-06 返回空字符串，不生成 `.review-solution-card`；G-07 在统计和渲染前过滤；“我的”仅按 `uid === MY_UID` 展示。
- 范围一致：不修改 B 端、启动失败、30 分钟门槛、邀评频控、星级口径、个人云方案、成功率、验证次数、多人聚合或详情异常演示页。
- 提交边界：三个提交只包含本任务明确列出的文件；`.superpowers/` 与其他工作区改动始终排除。

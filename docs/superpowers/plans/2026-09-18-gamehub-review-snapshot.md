# GameHub 兼容性评价独立快照 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将兼容性评价中的公共方案池改为“每条评价一份独立、不可变、可跨设备读取的云端配置快照”，并同步 C 端、B 端、测试和截图证据。

**Architecture:** C 端单文件 Demo 使用 `gh_review_snapshots_v1` 模拟服务端快照仓库，`review_id` 与 `review_snapshot_id` 一对一，列表只保存快照引用与当次时长，详情按快照 ID 读取白名单正文。B 端继续以评价为管理主体，只读展示关联快照与导出字段，不新增快照编辑、上下架或独立删除能力。

**Tech Stack:** 离线单文件 HTML/CSS/JavaScript、localStorage 模拟云端数据、Node.js `node:test`、Playwright Core、PowerShell、Git。

---

## 文件职责

- `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`：评价弹窗、评价列表、独立快照仓库、快照详情、应用和复制完整旅程。
- `demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html`：关联快照筛选、只读追溯、生命周期说明和评价导出。
- `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`：业务契约、存储生命周期、白名单和异常状态回归。
- `tools/capture-compatibility-review-v1.2.mjs`：10 张当前旅程截图和截图前置断言。
- `test-results/compatibility-review-v1.2/`：当前 Demo 的视觉证据，不保留被替代的旧流程截图。
- `prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md`：当前有效决定、产物、验证和风险状态。

### Task 1: 用失败契约锁定独立快照模型

**Files:**
- Modify: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 将公共方案池断言替换为独立快照断言**

在连续旅程用例提交评价后读取评价与快照仓，断言一对一绑定、固定标题与当次时长：

```js
const result = await page.evaluate(() => {
  const review = window.getFeedbacks().find((item) => item.uid === 'me_demo_user');
  const snapshots = window.compatibilityDemo.getReviewSnapshots();
  return { review, snapshot: snapshots[review.reviewSnapshotId] };
});
assert.ok(result.review.reviewSnapshotId);
assert.equal(result.snapshot.reviewId, result.review.id);
assert.equal(result.snapshot.solutionName, '本次启动方案');
assert.equal(result.snapshot.durationSeconds, 1122);
assert.equal(result.snapshot.sourceType, 'review_snapshot');
assert.equal(result.snapshot.playSessionId, 'play_demo_recent_success');
assert.equal(result.snapshot.configHash, 'cfg_adreno750_stable_v1');
```

- [ ] **Step 2: 增加“相同配置也创建不同快照”的失败用例**

```js
test('两条评价分享相同配置时仍创建两个不可复用的快照', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    const pair = await page.evaluate(() => {
      const first = window.compatibilityDemo.createReviewSnapshotForTest('review_a', {
        ...window.compatibilityDemo.getSessionSnapshot(),
        playSessionId: 'session_a',
      });
      const second = window.compatibilityDemo.createReviewSnapshotForTest('review_b', {
        ...window.compatibilityDemo.getSessionSnapshot(),
        playSessionId: 'session_b',
      });
      return { first, second, snapshots: window.compatibilityDemo.getReviewSnapshots() };
    });
    assert.notEqual(pair.first.reviewSnapshotId, pair.second.reviewSnapshotId);
    assert.equal(pair.snapshots[pair.first.reviewSnapshotId].reviewId, 'review_a');
    assert.equal(pair.snapshots[pair.second.reviewSnapshotId].reviewId, 'review_b');
    await assertNoPageErrors(errors, '独立快照不去重');
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 3: 增加不可变与删除生命周期失败用例**

```js
const lifecycle = await page.evaluate(() => {
  const original = window.compatibilityDemo.createReviewSnapshotForTest('review_immutable', {
    ...window.compatibilityDemo.getSessionSnapshot(),
    configHash: 'immutable_hash',
    playSessionId: 'immutable_session',
  });
  const overwrite = window.compatibilityDemo.createReviewSnapshotForTest('review_immutable', {
    ...window.compatibilityDemo.getSessionSnapshot(),
    configHash: 'changed_hash',
    playSessionId: 'changed_session',
  });
  const beforeDelete = window.compatibilityDemo.getReviewSnapshots()[original.reviewSnapshotId];
  window.compatibilityDemo.deleteReviewSnapshot(original.reviewSnapshotId, 'review_immutable');
  const afterDelete = window.compatibilityDemo.getReviewSnapshots()[original.reviewSnapshotId] || null;
  return { original, overwrite, beforeDelete, afterDelete };
});
assert.equal(lifecycle.overwrite.reviewSnapshotId, lifecycle.original.reviewSnapshotId);
assert.equal(lifecycle.beforeDelete.configHash, 'immutable_hash');
assert.equal(lifecycle.beforeDelete.playSessionId, 'immutable_session');
assert.equal(lifecycle.afterDelete, null);
```

- [ ] **Step 4: 运行专项测试并确认旧实现失败**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: FAIL，失败信息至少包含 `getReviewSnapshots is not a function`、`reviewSnapshotId` 缺失或公共池旧文案仍存在。

- [ ] **Step 5: 提交测试红灯**

```powershell
git add -- tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git commit -m "test: define immutable review snapshot contract"
```

### Task 2: 在 C 端实现一对一不可变快照仓库

**Files:**
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 用快照键和固定数据契约替换公共池常量**

```js
const REVIEW_SNAPSHOTS_KEY = 'gh_review_snapshots_v1';
const REVIEW_SNAPSHOT_DIMENSIONS = Object.freeze({
  gameId: 'gta5',
  platform: 'android',
  gpuModel: 'Adreno 750',
  runtimeArchitecture: 'arm64',
  engineVersion: 'demo-engine-v1',
  schemaVersion: '1',
});

function createReviewSnapshotId(reviewId) {
  return `review_snapshot_${encodeURIComponent(String(reviewId))}`;
}
```

- [ ] **Step 2: 实现克隆、读取、创建和删除函数**

```js
function cloneReviewSnapshot(value) {
  return value ? JSON.parse(JSON.stringify(value)) : null;
}

function getReviewSnapshots() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REVIEW_SNAPSHOTS_KEY) || '{}');
    return parsed && !Array.isArray(parsed) && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveReviewSnapshots(snapshots) {
  localStorage.setItem(REVIEW_SNAPSHOTS_KEY, JSON.stringify(snapshots || {}));
}

function createReviewSnapshot(reviewId, source) {
  if (!reviewId || !source?.playSessionId || !source?.configHash) return null;
  const configGroups = normalizeSolutionConfigGroups(source.configGroups);
  if (!configGroups) return null;
  const snapshots = getReviewSnapshots();
  const existing = Object.values(snapshots).find((item) => item?.reviewId === reviewId);
  if (existing) return cloneReviewSnapshot(existing);
  const reviewSnapshotId = createReviewSnapshotId(reviewId);
  const snapshot = {
    reviewSnapshotId,
    reviewId,
    solutionName: '本次启动方案',
    status: 'available',
    ...REVIEW_SNAPSHOT_DIMENSIONS,
    gpu: { id: 'adreno-750', displayName: source.gpuModel || 'Adreno 750' },
    sourceType: 'review_snapshot',
    reviewAuthorDisplayName: '我',
    playSessionId: String(source.playSessionId),
    durationSeconds: Number(source.durationSeconds || 0),
    configHash: String(source.configHash),
    sharedAt: new Date().toISOString(),
    configGroups,
    actions: { canApply: true, applyDisabledReason: '', canCopy: true, copyDisabledReason: '' },
  };
  snapshots[reviewSnapshotId] = cloneReviewSnapshot(snapshot);
  saveReviewSnapshots(snapshots);
  return snapshot;
}

function deleteReviewSnapshot(reviewSnapshotId, reviewId) {
  const snapshots = getReviewSnapshots();
  const snapshot = snapshots[reviewSnapshotId];
  if (!snapshot || snapshot.reviewId !== reviewId) return false;
  delete snapshots[reviewSnapshotId];
  saveReviewSnapshots(snapshots);
  return true;
}
```

- [ ] **Step 3: 将种子评价迁移为有效、无快照和不可用三种状态**

有效种子使用 `reviewSnapshotId: 'review_snapshot_s1'`，种子快照正文固定保存到 `gh_review_snapshots_v1`；无快照种子不保存 ID；不可用种子保留 `reviewSnapshotId`，对应记录状态为 `deprecated`，列表隐藏入口但旧链接可展示“方案已不可用”。

```js
const SEEDS = [
  { id: 's1', stars: 5, reviewSnapshotId: 'review_snapshot_s1', reviewState: 'valid', durationSeconds: 1122 },
  { id: 's3', stars: 5, reviewSnapshotId: '', reviewState: 'unlinked' },
  { id: 's4', stars: 3, reviewSnapshotId: 'review_snapshot_s4', reviewState: 'unavailable', durationSeconds: 863 },
];
```

- [ ] **Step 4: 运行独立快照专项测试**

Run:

```powershell
node --test --test-name-pattern="独立快照|不可变|删除生命周期" tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: PASS，0 failed。

- [ ] **Step 5: 提交 C 端数据层**

```powershell
git add -- demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git commit -m "feat: store immutable snapshots per review"
```

### Task 3: 改造 C 端提交、卡片和详情体验

**Files:**
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`
- Modify: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 先补充界面文案和禁止聚合信息的失败断言**

```js
assert.equal(await page.locator('#feedbackNoteLabel').innerText(), '补充说明（选填）');
assert.equal(await page.locator('#feedbackImageLimit').innerText(), '最多上传9张图片');
await page.click('[data-review-state="valid"] .review-solution-card');
const detailText = await page.locator('#solutionDetailPage').innerText();
assert.match(detailText, /本次启动方案/);
assert.match(detailText, /Pixel用户_洛圣都 · 本次游玩 18分42秒/);
assert.doesNotMatch(detailText, /成功率|验证次数|次验证|最近验证|社区共同验证|样本较少/);
```

- [ ] **Step 2: 改造提交和编辑生命周期**

提交时先保存评价，显式勾选且 3～5 星时创建独立快照；快照创建失败不回滚评价。编辑评价文字或图片保留已有快照；取消分享或降到 1～2 星删除快照；删除评价删除快照。

```js
const keepsSnapshot = wantsShare && existingReview?.reviewSnapshotId;
let reviewSnapshot = keepsSnapshot
  ? findReviewSnapshot(existingReview.reviewSnapshotId)
  : wantsShare
    ? createReviewSnapshot(savedReviewId, journeyState.sessionSnapshot)
    : null;
if (existingReview?.reviewSnapshotId && !wantsShare) {
  deleteReviewSnapshot(existingReview.reviewSnapshotId, existingReview.id);
  reviewSnapshot = null;
}
const reviewSnapshotId = reviewSnapshot?.reviewSnapshotId || '';
const reviewState = reviewSnapshot
  ? (reviewSnapshot.status === 'available' ? 'valid' : 'unavailable')
  : (fbStarVal < 3 ? 'none' : 'unlinked');
```

- [ ] **Step 3: 卡片只显示固定标题和当次时长**

```js
function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  return `${Math.floor(total / 60)}分${String(total % 60).padStart(2, '0')}秒`;
}

function renderReviewSolution(review) {
  const snapshot = findReviewSnapshot(review.reviewSnapshotId);
  if (review.stars < 3 || snapshot?.status !== 'available') return '';
  return `<button class="review-solution-card" type="button"
    aria-label="打开本次启动方案"
    onclick="openSolutionDetail('${snapshot.reviewSnapshotId}')">
    <span class="review-solution-heading"><strong>本次启动方案</strong><b aria-hidden="true">›</b></span>
    <span class="review-solution-meta">本次游玩 ${formatDuration(snapshot.durationSeconds)}</span>
  </button>`;
}
```

- [ ] **Step 4: 详情按快照 ID 读取并只展示当前分享人信息**

```js
function buildSolutionDetailViewModel(record) {
  if (!record || record.status !== 'available') return null;
  if (!SUPPORTED_SOLUTION_SCHEMA_VERSIONS.has(String(record.schemaVersion || ''))) {
    throw new Error('方案字段版本无法解析');
  }
  const configGroups = normalizeSolutionConfigGroups(record.configGroups);
  if (!configGroups) throw new Error('方案配置正文缺失或包含非白名单字段');
  return {
    reviewSnapshotId: record.reviewSnapshotId,
    reviewId: record.reviewId,
    solutionName: '本次启动方案',
    status: record.status,
    gpu: { displayName: record.gpu?.displayName || '' },
    reviewAuthorDisplayName: record.reviewAuthorDisplayName,
    durationSeconds: record.durationSeconds,
    configHash: record.configHash,
    configGroups,
    actions: getEffectiveSolutionActions(record),
  };
}

document.getElementById('solutionShareSummary').textContent =
  `${viewModel.reviewAuthorDisplayName} · 本次游玩 ${formatDuration(viewModel.durationSeconds)}`;
```

- [ ] **Step 5: 保留应用与复制现有流程，仅切换引用字段**

应用成功保存 `reviewSnapshotId` 与快照配置并返回游戏详情，不自动启动；复制成功创建个人副本，`sourceReviewSnapshotId` 指向来源快照，`cloudShared:false`，并展示既有 Toast。

```js
copies.push({
  id: `copy_${Date.now()}`,
  sourceReviewSnapshotId: currentDetailRecord.reviewSnapshotId,
  name,
  configGroups: cloneSolutionConfigGroups(currentDetailRecord.configGroups),
  cloudShared: false,
});
```

- [ ] **Step 6: 运行 C 端完整契约**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: C 端相关用例 PASS；页面内不出现 `社区共同验证`、`成功率`、`次验证`、`最近验证` 或 `样本较少`。

- [ ] **Step 7: 提交 C 端体验层**

```powershell
git add -- demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git commit -m "feat: present per-review launch snapshots"
```

### Task 4: 同步 B 端关联快照口径

**Files:**
- Modify: `demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html`
- Modify: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 先将静态契约改为快照术语和字段**

```js
for (const field of ['review_snapshot_id', 'snapshot_status', 'duration_seconds', 'snapshot_shared_at']) {
  assert.match(exportFields ?? '', new RegExp(field), `导出预览缺少 ${field}`);
}
assert.match(await page.locator('#dom-fb-solution-linked').evaluate((node) => node.previousElementSibling?.textContent || ''), /快照/);
assert.match(await page.locator('#compat-solution-detail-title').innerText(), /关联快照/);
```

- [ ] **Step 2: 将种子和筛选字段统一为 snapshot**

```js
snapshot: {
  reviewSnapshotId: 'review_snapshot_cf1',
  status: 'available',
  durationSeconds: 1122,
  sharedAt: '2026-09-12 14:32',
  solutionName: '本次启动方案',
}
```

状态标签只使用 `有效`、`已废弃`、`无效` 和 `无关联`；评价隐藏时仍可在 B 端只读追溯，评价删除后按现有审核留存规则展示历史快照，不提供编辑、上下架或独立删除操作。

- [ ] **Step 3: 替换抽屉和生命周期说明**

```js
const snapshotState = feedback.snapshot ? getCompatSnapshotStatusLabel(feedback.snapshot) : '无关联快照';
note.textContent = feedback.hidden && feedback.snapshot
  ? `评价已隐藏，C 端停止展示快照入口；后台保留${snapshotState}快照用于追溯。`
  : feedback.snapshot?.status === 'available'
    ? '评价显示中，关联快照仅供查看和追溯。'
    : `快照${snapshotState}，评价仍然保留。`;
```

- [ ] **Step 4: 替换导出字段与数据行**

```js
const headers = [
  '评价ID', '游戏名称', '用户UID', '设备', '客户端版本', '星级', '标签', '反馈内容',
  '支持数', '评价状态', '创建时间', 'review_snapshot_id', 'snapshot_status',
  'duration_seconds', 'snapshot_shared_at',
];

const snapshotColumns = [
  item.snapshot?.reviewSnapshotId || '',
  item.snapshot?.status || '',
  item.snapshot?.durationSeconds ?? '',
  item.snapshot?.sharedAt || '',
];
```

- [ ] **Step 5: 运行 B 端筛选、抽屉和导出契约**

Run:

```powershell
node --test --test-name-pattern="B 端|后台|导出" tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: PASS，0 failed；B 端界面不再出现“关联方案”“方案状态”或 `solution_id` 等旧字段。

- [ ] **Step 6: 提交 B 端同步**

```powershell
git add -- demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git commit -m "feat: align admin review snapshot tracking"
```

### Task 5: 更新截图证据并完成全量验证

**Files:**
- Modify: `tools/capture-compatibility-review-v1.2.mjs`
- Replace: `test-results/compatibility-review-v1.2/*.png`
- Modify: `prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md`

- [ ] **Step 1: 更新截图脚本前置断言**

```js
await requireOne(page, '#solutionShareSummary', '当前评价人与本次游玩时长');
const detailText = await page.locator('#solutionDetailPage').innerText();
if (!/本次启动方案/.test(detailText) || !/本次游玩 18分42秒/.test(detailText)) {
  throw new Error('未实现契约：详情未展示固定快照标题与当次游玩时长');
}
if (/社区共同验证|成功率|次验证|最近验证|样本较少/.test(detailText)) {
  throw new Error('未实现契约：详情仍包含多人聚合信息');
}
```

提交后的截图断言改为 `mine.reviewSnapshotId` 存在，且对应快照的 `reviewId` 等于评价 ID。

- [ ] **Step 2: 生成 10 张当前截图**

Run:

```powershell
node tools/capture-compatibility-review-v1.2.mjs
```

Expected: 输出 10 个 PNG 路径，进程退出码为 0；重点人工检查 `08-c-proactive-review-390x844.png`、`09-c-my-linked-review-390x844.png` 和 `10-b-linked-filter-solution-drawer-1440x900.png`。

- [ ] **Step 3: 运行全量自动验证**

Run:

```powershell
node --check tools/capture-compatibility-review-v1.2.mjs
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git diff --check
```

Expected: JavaScript 语法检查 PASS；浏览器契约全部 PASS；`git diff --check` 无错误。

- [ ] **Step 4: 执行离线、禁止项与布局检查**

```powershell
rg -n "https?://|<iframe|<canvas|秒玩|社区共同验证|成功率|次验证|最近验证|样本较少|prd-badge|prd-tooltip" demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html
rg -n "关联方案|solution_id|solution_status|solution_source|solution_linked_at" demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html
```

Expected: C 端除脚本允许的本地复制 URL 逻辑外无远程运行依赖和禁用文案；B 端无旧关联字段；390×844 与 844×390 浏览器契约记录 `scrollWidth <= clientWidth` 且无 `pageerror`。

- [ ] **Step 5: 回写状态卡**

将 C/B 端 Demo、浏览器契约和视觉证据从 `stale` 更新为 `已同步`，记录实际测试数量、截图数量、人工审图结论和未宣称的严格像素门槛。

- [ ] **Step 6: 提交实现、证据和状态**

```powershell
git add -- demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs tools/capture-compatibility-review-v1.2.mjs test-results/compatibility-review-v1.2 prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md
git commit -m "feat: deliver immutable review snapshots"
```

## 自检结论

- 规格覆盖：计划包含弹窗文案、独立快照、上传失败不阻断评价、同配置不复用、不可变、删除生命周期、卡片和详情去聚合、应用／复制、B 端字段、截图和工作流回写。
- 类型一致：全链路统一使用 `reviewSnapshotId`、`review_snapshot_id`、`status`、`durationSeconds`、`sharedAt`；C 端状态为 `available | deprecated | invalid`。
- 范围约束：不创建个人云方案，不恢复启动失败流程，不新增公共方案池、多人聚合、快照编辑页或 Demo 说明层。

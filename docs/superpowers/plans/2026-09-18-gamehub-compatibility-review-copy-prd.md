# Compatibility Review Copy and PRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将评价绑定快照的用户可见名称统一为“本次启动配置”，并交付与当前 Demo 同源、图片可公网访问、可直接评审和研发执行的兼容性评价改版最终 PRD。

**Architecture:** 展示层使用一个固定文案常量覆盖新旧快照的显示值，内部字段名和快照模型保持不变；C/B 端 Demo、测试和截图先完成回归，再从当前截图生成 PRD 公共资产。资产先提交以获得不可变提交 SHA，随后写入最终 PRD 的固定 HTTPS 图片地址，最后更新状态卡、原子工作流和任务板并推送当前分支。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Node.js `node:test`、Playwright Core、PowerShell `System.Drawing`、Markdown、Git、`taskctl`、GameHub 产品工作流脚本。

---

## 文件结构与职责

- `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`：C 端固定展示文案、新建快照名称和旧数据展示兼容。
- `demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html`：B 端同一评价快照的只读名称与预览展示。
- `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`：文案边界、完整旅程、B 端预览与全量回归契约。
- `tools/capture-compatibility-review-v1.2.mjs`：当前 Demo 的 11 张截图与文案断言。
- `tools/generate-compatibility-review-v1.2-prd-assets.ps1`：把当前截图复制为稳定 PRD 资产，并生成唯一横向产品流程合成图。
- `public/prd/compatibility-review-v1.2/`：PRD 页面图和横向流程图的公开源文件。
- `prd/【PRD】《盖世游戏》兼容性评价改版V1.2需求.md`：当前唯一现行 PRD。
- `prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md`：D-010、当前 PRD、验证、提交和推送证据。
- `C:/Users/z3635/.codex/state/gamehub-product-workflow/runs/GUANWANGGAID-25-current.json`：S3～S8 重跑状态与六层交付证据。

### Task 1: 重开变更链路并以失败契约锁定文案边界

**Files:**
- Modify: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs:153-205`
- Reference: `docs/superpowers/specs/2026-09-18-gamehub-compatibility-review-copy-prd-design.md`
- Reference: `prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md`

- [ ] **Step 1: 将 S3～S8 标记为需要重跑**

```powershell
$workflowScript = 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1'
$runPath = 'C:\Users\z3635\.codex\state\gamehub-product-workflow\runs\GUANWANGGAID-25-current.json'
$revision = (Get-Content -Raw -LiteralPath $runPath | ConvertFrom-Json).revision
& $workflowScript -Action rerun -RunPath $runPath -StepId S3 -ExpectedRevision $revision
```

Expected: S1、S2 保持 `passed`；S3 为 `pending`；S4～S8 为 `stale`。

- [ ] **Step 2: 更新连续旅程契约中的目标文案**

在 `查看并应用他人快照后，可启动、横屏退出并分享本次独立快照` 用例中使用以下断言：

```js
assert.match(await card.innerText(), /本次启动配置/);
assert.doesNotMatch(await card.innerText(), /本次启动方案/);

await card.click();
assert.equal(await page.locator('#solutionDetailSchemeName').innerText(), '本次启动配置');

await page.click('#applySolutionButton');
assert.match(await page.locator('#currentAppliedSolution').innerText(), /本次启动配置/);

assert.equal(result.snapshot.solutionName, '本次启动配置');
assert.match(
  await page.locator('[data-owner="me"] .review-solution-card').innerText(),
  /本次启动配置[\s\S]*本次游玩 18分42秒/,
);
```

- [ ] **Step 3: 新增旧快照展示兼容与正式方案实体保护用例**

```js
test('旧快照仍显示本次启动配置且正式启动方案实体不改名', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端');
  try {
    await showEveryReview(page);
    await page.evaluate(() => {
      const key = 'gh_review_snapshots_v1';
      const snapshots = window.compatibilityDemo.getReviewSnapshots();
      snapshots.review_snapshot_s1.solutionName = '本次启动方案';
      localStorage.setItem(key, JSON.stringify(snapshots));
      window.refreshPanel('ls');
    });

    const card = page.locator('[data-feedback-id="s1"] .review-solution-card');
    assert.match(await card.innerText(), /本次启动配置/);
    assert.doesNotMatch(await card.innerText(), /本次启动方案/);
    assert.equal(await card.getAttribute('aria-label'), '打开本次启动配置');

    await card.click();
    assert.equal(await page.locator('#solutionDetailSchemeName').innerText(), '本次启动配置');
    assert.match(await page.locator('#copySolutionButton').innerText(), /复制/);
    assert.match(await page.locator('#applySolutionButton').innerText(), /应用/);

    await page.click('#copySolutionButton');
    await page.click('#confirmCopySolutionButton');
    await page.waitForFunction(() => document.getElementById('toast')?.classList.contains('show'));
    assert.match(await page.locator('#toast').innerText(), /正在前往“启动方案”/);
    assertNoPageErrors(errors, '单次配置文案兼容');
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 4: 更新 B 端快照预览目标文案**

```js
assert.match(await page.locator('#compat-solution-detail-fields').innerText(), /本次启动配置/);
assert.doesNotMatch(await page.locator('#compat-solution-detail-fields').innerText(), /本次启动方案/);
```

- [ ] **Step 5: 运行文案契约并确认先失败**

Run:

```powershell
node --test --test-name-pattern="查看并应用他人快照|旧快照仍显示|B 端可按快照状态" tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: 进程非零；至少一个断言因当前仍显示“本次启动方案”失败；不得出现测试文件语法错误。

### Task 2: 最小实现 C/B 端“本次启动配置”展示

**Files:**
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html:1245,1470-1595,1820-1840,2026-2030,2234,2380,2914-3045,3083-3150,3198`
- Modify: `demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html:7607-7616,7750-7760,8035-8050`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 在 C 端定义固定展示名称**

在快照常量区增加：

```js
const REVIEW_SNAPSHOT_DISPLAY_NAME = '本次启动配置';
```

- [ ] **Step 2: 让 C 端卡片和详情不再信任历史名称**

将评价卡渲染固定为：

```js
return '<button class="review-solution-card" type="button" data-action="open-review-solution" aria-label="打开' + REVIEW_SNAPSHOT_DISPLAY_NAME + '"><span class="review-solution-heading"><strong>' + REVIEW_SNAPSHOT_DISPLAY_NAME + '</strong><b aria-hidden="true">›</b></span><span class="review-solution-meta">本次游玩 ' + formatDuration(snapshot.durationSeconds) + '</span></button>';
```

将 `buildSolutionDetailViewModel(record)` 中的名称固定为：

```js
solutionName: REVIEW_SNAPSHOT_DISPLAY_NAME,
```

将所有新建种子和用户提交快照中的固定值改为：

```js
solutionName: REVIEW_SNAPSHOT_DISPLAY_NAME,
```

Expected: 旧本地缓存保留原始字段值也不会在卡片和详情显示旧文案；新建快照保存新文案。

- [ ] **Step 3: 保留正式方案实体文案**

保持以下产品行为和文案不变：

```js
showToast('复制成功，正在前往“启动方案”');
```

`#applySolutionButton` 与 `#copySolutionButton` 仍显示“应用”“复制”；复制后仍创建个人副本并跳转“启动方案”页占位，不改为“启动配置页”。

- [ ] **Step 4: 在 B 端固定同一快照的展示名称**

在 B 端评价快照模块定义：

```js
const REVIEW_SNAPSHOT_DISPLAY_NAME = '本次启动配置';
```

列表单元格、详情字段与演示数据统一使用该常量；详情字段保持“标题”字段但值固定为 `REVIEW_SNAPSHOT_DISPLAY_NAME`。不改 `reviewSnapshotId`、`solutionName` 字段名及导出字段。

- [ ] **Step 5: 运行文案专项契约**

Run:

```powershell
node --test --test-name-pattern="查看并应用他人快照|旧快照仍显示|B 端可按快照状态" tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: 文案专项全部通过，无 `pageerror`；正式“启动方案”跳转提示仍通过。

- [ ] **Step 6: 执行静态边界扫描**

Run:

```powershell
rg -n --fixed-strings '本次启动方案' `
  'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' `
  'demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html'
```

Expected: 只允许保留正式方案实体语境，例如 Toast“正在前往‘启动方案’”；评价卡、快照详情、快照预览和固定 `solutionName` 不得命中。

- [ ] **Step 7: 提交 Demo 与契约**

```powershell
git add -- `
  'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' `
  'demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html' `
  'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs'
git commit --only -m "feat: rename review snapshot copy" -- `
  'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' `
  'demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html' `
  'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs'
```

Expected: 只提交以上三个文件。

### Task 3: 刷新截图并固化视觉证据

**Files:**
- Modify: `tools/capture-compatibility-review-v1.2.mjs:107-121`
- Modify: `test-results/compatibility-review-v1.2/*.png`

- [ ] **Step 1: 更新截图脚本中的标题断言**

```js
if (!/本次启动配置/.test(detailText) || !/Pixel用户_洛圣都 · 本次游玩 18分42秒/.test(detailText)) {
  throw new Error('未实现契约：快照详情未展示固定标题、当前评价人与当次游玩时长');
}

if (!/本次启动配置/.test(await page.locator('#currentAppliedSolution').innerText())) {
  throw new Error('未实现契约：游戏详情未展示当前已应用配置');
}
```

- [ ] **Step 2: 生成 11 张当前截图**

Run:

```powershell
node --check tools/capture-compatibility-review-v1.2.mjs
node tools/capture-compatibility-review-v1.2.mjs
```

Expected: 输出 `01`～`11` 共 11 条绝对路径，进程退出码为 0。

- [ ] **Step 3: 原尺寸检查关键截图**

逐张以原尺寸检查：

- `03-c-solution-detail-390x844.png`：标题为“本次启动配置”。
- `04-c-applied-solution-detail-390x844.png`：当前应用区域显示“本次启动配置”。
- `09-c-my-linked-review-390x844.png`：我的评价卡显示“本次启动配置”。
- `10-b-linked-filter-solution-drawer-1440x900.png`：后台快照预览显示“本次启动配置”。
- `11-c-guest-review-states-390x844.png`：有效配置卡和普通评价自然混排，无技术标签。

Expected: 无溢出、遮挡、错位或“本次启动方案”残留；正式方案跳转不在这些截图中误改。

- [ ] **Step 4: 提交截图脚本与证据**

```powershell
git add -- 'tools/capture-compatibility-review-v1.2.mjs' 'test-results/compatibility-review-v1.2'
git commit --only -m "test: refresh compatibility review visuals" -- `
  'tools/capture-compatibility-review-v1.2.mjs' `
  'test-results/compatibility-review-v1.2'
```

Expected: 只提交截图脚本和 11 张当前证据。

### Task 4: 生成并提交 PRD 公共图片资产

**Files:**
- Create: `tools/generate-compatibility-review-v1.2-prd-assets.ps1`
- Create: `public/prd/compatibility-review-v1.2/flow-compatibility-review-v1.2.png`
- Create: `public/prd/compatibility-review-v1.2/c01-game-detail.png`
- Create: `public/prd/compatibility-review-v1.2/c02-review-list.png`
- Create: `public/prd/compatibility-review-v1.2/c03-config-detail.png`
- Create: `public/prd/compatibility-review-v1.2/c04-game-running.png`
- Create: `public/prd/compatibility-review-v1.2/c05-exit-confirm.png`
- Create: `public/prd/compatibility-review-v1.2/c06-review-dialog.png`
- Create: `public/prd/compatibility-review-v1.2/c07-my-review.png`
- Create: `public/prd/compatibility-review-v1.2/b01-review-snapshot.png`

- [ ] **Step 1: 创建资产生成脚本**

脚本固定复制以下来源映射：

```powershell
$assetMap = [ordered]@{
  '01-c-game-detail-wireframe-390x844.png' = 'c01-game-detail.png'
  '11-c-guest-review-states-390x844.png' = 'c02-review-list.png'
  '03-c-solution-detail-390x844.png' = 'c03-config-detail.png'
  '06-c-gameplay-device-1440x900.png' = 'c04-game-running.png'
  '07-c-exit-confirm-device-1440x900.png' = 'c05-exit-confirm.png'
  '08-c-proactive-review-390x844.png' = 'c06-review-dialog.png'
  '09-c-my-linked-review-390x844.png' = 'c07-my-review.png'
  '10-b-linked-filter-solution-drawer-1440x900.png' = 'b01-review-snapshot.png'
}
```

脚本使用 `System.Drawing` 创建 `3040×940` 流程图，按左到右绘制七个步骤：

```powershell
$steps = @(
  @{ Title = '1 游戏详情'; File = 'c01-game-detail.png' },
  @{ Title = '2 查看评价'; File = 'c02-review-list.png' },
  @{ Title = '3 应用配置'; File = 'c03-config-detail.png' },
  @{ Title = '4 启动游戏'; File = 'c04-game-running.png' },
  @{ Title = '5 退出游戏'; File = 'c05-exit-confirm.png' },
  @{ Title = '6 提交评价'; File = 'c06-review-dialog.png' },
  @{ Title = '7 查看我的评价'; File = 'c07-my-review.png' }
)
```

每个步骤使用宽 `360`、高 `780` 的等比缩放图，标题位于卡片顶部；步骤之间绘制向右箭头。输出固定为 `flow-compatibility-review-v1.2.png`。脚本开始前验证输出目录位于 `public/prd/compatibility-review-v1.2`，不得删除其他目录。

- [ ] **Step 2: 运行资产脚本并核对数量**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/generate-compatibility-review-v1.2-prd-assets.ps1
(Get-ChildItem -LiteralPath 'public/prd/compatibility-review-v1.2' -Filter '*.png').Count
```

Expected: 输出 `9`；所有文件大小大于 0；流程图为横向，七步标题均可读。

- [ ] **Step 3: 提交公共资产**

```powershell
git add -- 'tools/generate-compatibility-review-v1.2-prd-assets.ps1' 'public/prd/compatibility-review-v1.2'
git commit --only -m "docs: add compatibility review prd assets" -- `
  'tools/generate-compatibility-review-v1.2-prd-assets.ps1' `
  'public/prd/compatibility-review-v1.2'
git rev-parse HEAD
```

Expected: 记录 40 位资产提交 SHA；该 SHA 用于 PRD 中全部 jsDelivr 固定链接。

### Task 5: 使用 `/to-prd` 输出当前唯一现行 PRD

**Files:**
- Create: `prd/【PRD】《盖世游戏》兼容性评价改版V1.2需求.md`
- Reference: `prd/ai生成/APP兼容性评价改版需求.md`
- Reference: `prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md`
- Reference: `docs/superpowers/specs/2026-09-18-gamehub-compatibility-review-copy-prd-design.md`
- Reference: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`
- Reference: `demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html`

- [ ] **Step 1: 用固定资产提交 SHA 写入图片地址**

全部图片使用：

```text
https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@资产提交的40位SHA/public/prd/compatibility-review-v1.2/文件名.png
```

其中“资产提交的40位SHA”必须替换为 Task 4 `git rev-parse HEAD` 的真实输出，不得使用分支名、短 SHA、本地路径或占位域名。

- [ ] **Step 2: 写入修订记录、背景、边界和术语**

修订记录固定为：

```markdown
| 修订日期 | 修订内容 | 版本 | 修订人 |
|---|---|---|---|
| 2026/9/18 | 基于当前确认方案重建兼容性评价改版 PRD，统一“本次启动配置”口径 | V1.2 | 郑群超 |
```

需求边界必须明确：

- 产品边界：国内 APP C 端竖屏详情／评价与横屏运行退出；B 端评价管理和快照追溯。
- 业务边界：评价查看、配置查看应用、退出邀评、评价提交、单次配置快照、后台管理；不改启动失败流程。
- 运营边界：仅使用现有后台评价管理，无新增灰度、标签配置或运营活动。
- 人力边界：客户端负责页面、横竖屏与会话采集；服务端负责门槛、冷却、评价、快照、导出和生命周期；设计负责现有组件内的最小文案更新；测试覆盖 C/B 端全链路。

术语必须定义：兼容性评价、本次启动配置、评价快照、同配置、邀评冷却。

- [ ] **Step 3: 写入产品说明和唯一横向流程图**

2.1 明确目标用户、核心目标、使用场景和 C/B 能力关系。2.2 只插入一张 `flow-compatibility-review-v1.2.png`，图注写：

```markdown
*图 2.2-1：用户从游戏详情查看并应用其他玩家的本次启动配置，启动与退出游戏后提交自己的兼容性评价和本次启动配置。*
```

- [ ] **Step 4: 写入六个 C 端页面六要素**

按以下页面顺序，每页仅保留一张 `要素｜内容说明` 六要素表：

1. 游戏详情页：兼容性入口、当前应用配置、“启动游戏”。
2. 玩家兼容性评价页：综合评分、全部／同配置／我的筛选、客态 G-01～G-07、卡片显示规则。
3. 本次启动配置详情页：评价人、本次时长、完整只读配置、应用／复制及不可用状态。
4. 横屏游戏运行与退出：横屏手机壳、退出确认、返回竖屏。
5. 兼容性评价弹窗：1～5 星映射、补充说明、最多 9 张图片、3～5 星分享项、1～2 星不显示、评价先保存后处理快照。
6. 我的评价：提交结果、快照上传失败、编辑保留、降星／取消关联／删除生命周期。

每页需求描述必须使用：

```markdown
**展示说明：**<br>1. 页面沿用当前 Demo 的导航、内容层级和固定操作区。<br>2. 评价绑定快照统一显示“本次启动配置”和当前评价人的本次游玩时长。<br>**交互说明：**<br>1. 用户点击“本次启动配置”后进入完整只读配置详情。<br>2. 配置可用时允许应用或复制；配置不可用时隐藏入口或禁用对应操作并显示固定原因。
```

规则必须写清：

- 全平台累计游戏时长达到 30 分钟才可评价；本期不修改门槛。
- 邀评全局冷却默认 7 天、次数支持配置；A 游戏曝光后冷却期内 B 游戏不曝光且不增加 B 游戏曝光次数。
- 1 星不可玩、2 星有部分问题、3 星基本可玩、4～5 星完美兼容。
- “同配置”沿用同游戏＋同 GPU；无结果不自动切到“全部”。
- 只有 3～5 星、快照存在、状态 `available`、快照内部 ID 与引用 ID 一致且 `snapshot.reviewId=review.id` 时显示“本次启动配置”。
- 评价卡只显示当前评价人的“本次启动配置”和当次时长，不显示成功率、验证次数、最近验证或社区共同验证。
- 分享只创建评价绑定的一对一不可变云端快照，不创建个人云分享方案，不跨评价复用或去重。
- 应用后返回游戏详情，由用户主动启动；复制创建个人副本，随后跳转“启动方案”页，Demo 使用现有 Toast 占位。

- [ ] **Step 5: 写入 B 端页面六要素**

B 端只保留“玩家兼容性评价管理”一页六要素表，覆盖：评价筛选、关联快照筛选、快照状态、只读完整配置、隐藏保留追溯、删除级联快照、CSV 字段 `review_snapshot_id`／`snapshot_status`／`duration_seconds`／`snapshot_shared_at`，以及权限、失败恢复和审计要求。

- [ ] **Step 6: 写入技术边界、数据结论和待确认项**

第四章只保留命中内容：

- 数据结论：不涉及，本期不新增埋点。
- 安全与存储：快照只接受白名单配置组；总大小不超过 8KB；限制字段长度；拒绝账号、令牌、存档、文件、设备唯一标识和本地绝对路径；评价先持久化，快照上传失败不阻断评价。
- 兼容：历史快照展示层统一显示“本次启动配置”，不迁移内部字段或旧记录。

第五章固定写“无”。附录登记当前 C/B Demo、状态卡、当前规格、旧 PRD，并标记旧 PRD“历史资料，不作为当前实现依据”。

- [ ] **Step 7: 执行 PRD 机械校验**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1' `
  -Path 'prd/【PRD】《盖世游戏》兼容性评价改版V1.2需求.md'
```

Expected: 质量校验通过；无目录、功能优先级、独立验收章、开发计划链接、目标上线时间、空章节或模板占位符。

- [ ] **Step 8: 执行全部图片公网校验**

先推送资产提交：

```powershell
git push origin HEAD
```

再运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-images.ps1' `
  -PrdPath 'prd/【PRD】《盖世游戏》兼容性评价改版V1.2需求.md' `
  -VerifyRemote
```

Expected: 全部图片返回 HTTP 200、正确图片 MIME 且大小大于 0；只记录“公网验证通过”，不声明飞书已完成真实转存。

- [ ] **Step 9: 提交最终 PRD**

```powershell
git add -- 'prd/【PRD】《盖世游戏》兼容性评价改版V1.2需求.md'
git commit --only -m "docs: add compatibility review v1.2 prd" -- `
  'prd/【PRD】《盖世游戏》兼容性评价改版V1.2需求.md'
```

Expected: 只提交最终 PRD。

### Task 6: 全量验证、状态回写和 Git 推送

**Files:**
- Modify: `prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md`
- Verify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`
- Verify: `demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html`
- Verify: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`
- Verify: `tools/capture-compatibility-review-v1.2.mjs`
- Verify: `prd/【PRD】《盖世游戏》兼容性评价改版V1.2需求.md`

- [ ] **Step 1: 运行全量机器验证**

```powershell
node --check tools/capture-compatibility-review-v1.2.mjs
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
node tools/capture-compatibility-review-v1.2.mjs
git diff --check -- `
  'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' `
  'demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html' `
  'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs' `
  'tools/capture-compatibility-review-v1.2.mjs' `
  'public/prd/compatibility-review-v1.2' `
  'prd/【PRD】《盖世游戏》兼容性评价改版V1.2需求.md' `
  'prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md'
```

Expected: 浏览器契约全部通过；截图 11/11；`node --check` 和 `git diff --check` 通过。

- [ ] **Step 2: 执行 PRD 语义复核**

检查研发、测试、设计、运营和数据是否仍需猜测以下内容：触发、30 分钟门槛、7 天全局冷却、星级映射、筛选、G-01～G-07、快照上传失败、旧快照、隐藏／删除、应用／复制、B 端导出和异常恢复。

Expected: 无两套口径、无旧“本次启动方案”快照标题、无“同设备”“支持最多”“多人验证”“成功率”作为当前规则；旧 PRD 只在附录标记为历史资料。

- [ ] **Step 3: 更新状态卡**

新增 D-010：

```markdown
| D-010 | 评价绑定的单次配置快照统一显示“本次启动配置”；正式“启动方案”实体与应用／复制流程保持原名；内部字段和历史数据不迁移 | 用户确认方案 A | 2026-09-18 | 替代 D-004、补充 D-009 的展示文案 |
```

产物登记新增最终 PRD、公共图片和本轮提交；修改与验证记录文案更新、PRD 验证、图片公网校验、Git 推送结果。旧 PRD 标记为“历史资料，无需修改”。

- [ ] **Step 4: 提交状态卡**

```powershell
git add -- 'prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md'
git commit --only -m "docs: record compatibility prd delivery" -- `
  'prd/workflow-state/GUANWANGGAID-25-compatibility-review-v1-2.md'
```

- [ ] **Step 5: 完成 S3～S8 工作流回写**

依次 `start-step` 和 `pass` S3～S8，每次重新读取最新 `revision`。S3 记录 D-010 与 PRD 路由；S4 记录当前 Demo 和用户截图基线；S5 记录 Demo、资产和 PRD；S6 记录全量契约、截图、质量校验和公网图片校验；S7 记录原尺寸审图与 PRD 语义复核；S8 记录以下六层证据：

```text
源文件｜通过：C/B Demo、测试、截图脚本、公共图片、最终 PRD、状态卡已同步
机器验证｜通过：全量浏览器契约、11/11 截图、PRD 质量与图片公网校验、静态检查
专业判断｜通过：原尺寸截图与 PRD 五角色语义复核
Git｜通过：本轮提交已推送当前远端分支
公开预览｜未执行：用户未要求发布独立预览站点
远程资源｜通过：PRD 图片固定 SHA 链接返回 HTTP 200 和正确 MIME；飞书真实转存未验证
```

Expected: S1～S8 全部 `passed`，总体 `status=passed`。

- [ ] **Step 6: 推送所有本轮提交并核对远端**

```powershell
git push origin HEAD
git status -sb
git rev-parse HEAD
git rev-parse '@{u}'
```

Expected: push 成功；本地 `HEAD` 与上游相同；本任务目标文件无未提交变化。工作区其他既有修改保持不动。

- [ ] **Step 7: 更新任务板并进入评审**

```powershell
$latest = taskctl issue get GUANWANGGAID-25 --json | ConvertFrom-Json
taskctl comment add GUANWANGGAID-25 --body '已完成“本次启动配置”文案统一和兼容性评价改版 V1.2 最终 PRD：内部字段与快照模型未改，正式启动方案实体保留；C/B Demo、浏览器契约、11 张截图、横向流程图、公共图片、状态卡和 PRD 已同步。全量机器验证、原尺寸审图、PRD 质量与公网图片校验通过；飞书真实转存未验证。全部本轮提交已推送，等待产品验收。' --json
$latest = taskctl issue get GUANWANGGAID-25 --json | ConvertFrom-Json
taskctl issue move GUANWANGGAID-25 --status in_review --if-version $latest.task.version --json
```

Expected: 评论成功，事项为 `in_review`，不移动到 `done`。

## 自检结论

- 规格覆盖：Task 1～3 覆盖精确改名、旧数据展示兼容、正式方案实体保护和视觉证据；Task 4～5 覆盖固定 SHA 公共图片、唯一横向流程图和最终 PRD；Task 6 覆盖全量验证、工作流、任务板与推送。
- 类型一致：内部继续使用 `solutionName`、`reviewSnapshotId`、`reviewSnapshotId` 引用关系；只改变固定展示值，不引入第二套数据结构。
- 范围一致：不改启动失败流程、30 分钟门槛、个人云方案、快照去重、多次验证、成功率和最近验证。
- 占位符检查：计划未保留未决标记、空测试体或未定义函数；资产 SHA 在执行时由 Task 4 的真实提交生成，并按明确公式写入 PRD。

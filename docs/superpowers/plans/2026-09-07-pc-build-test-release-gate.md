# PC Build Test Release Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在开发者端展示包体测试状态，并在运营发布审核中以“全部必测包体通过”为最终发布门禁，随后同步标准 PRD、截图和固定 Git 图片地址。

**Architecture:** 02 继续以 `PublisherGameBuilds` 管理包体数据，新增独立于解析状态的测试状态；提交发布时只把未提审包体置为待测试，历史有效通过记录可保留。09 在现有右侧半屏审核详情内完成测试结论和发布门禁，不新增一级测试中心。PRD 以当前两个 Demo 为事实源，图片统一发布到 `public/prd/genuine-game-distribution-phase1/developer-backend-final/03/`。

**Tech Stack:** 单文件 HTML、原生 JavaScript/CSS、IndexedDB、Node.js `node:test`、Playwright、Markdown、PowerShell 校验脚本。

---

### Task 1: 开发者端包体测试状态

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-builds.js`
- Modify: `demos/开发者后台一期/src/runtime/publisher-profile-store.js`
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-profile.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-game-builds.css`
- Test: `tests/developer-backend/game-profile-release-demo.browser.test.mjs`

- [ ] **Step 1: 写失败用例**

```js
assert.match(await buildRow.innerText(), /解析通过/);
assert.match(await buildRow.innerText(), /待提审/);
assert.equal(saved.buildPackages[0].testStatus, 'pending');
assert.match(await snapshot.innerText(), /测试状态/);
```

- [ ] **Step 2: 运行用例确认失败**

```powershell
node --test tests/developer-backend/game-profile-release-demo.browser.test.mjs
```

Expected: FAIL，现有包体没有 `testStatus` 与测试结果展示。

- [ ] **Step 3: 实现最小状态模型与展示**

```js
const TEST_STATUSES = ['not_submitted', 'pending', 'testing', 'passed', 'failed'];
const normalizeTestStatus = value => TEST_STATUSES.includes(value) ? value : 'not_submitted';
const submitForTest = build => build.testStatus === 'not_submitted'
  ? { ...build, testStatus: 'pending', testReason: '', testedAt: '', tester: '' }
  : build;
```

列表同时展示解析状态、测试状态和不通过原因；开发者端只读。提交发布时仅转换未提审包体，已通过且未变化的包体保留结论；版本快照保存并展示测试状态。

- [ ] **Step 4: 构建并运行用例**

```powershell
node "demos/开发者后台一期/build.mjs" --module=02
node --test tests/developer-backend/game-profile-release-demo.browser.test.mjs
```

Expected: 全部 PASS，输出开发者端包体状态截图。

### Task 2: 运营后台测试与发布门禁

**Files:**
- Modify: `demos/开发者后台一期/09-发行审核后台demo.html`
- Test: `tests/developer-backend/admin-review-completeness.browser.test.mjs`

- [ ] **Step 1: 写失败用例**

```js
assert.equal(await page.getByRole('button', { name: '通过' }).isDisabled(), true);
await page.getByRole('button', { name: '测试通过' }).click();
assert.equal(await page.getByRole('button', { name: '通过' }).isEnabled(), true);
```

- [ ] **Step 2: 实现审核详情**

在现有 Drawer 增加 PC 包体测试区，区分解析和测试状态；不通过必填原因，可选附件；全部必测包体通过后才启用发布通过。左侧仅保留三类审核，区域切换移至筛选区，刷新放查询旁且无 Toast。

- [ ] **Step 3: 运行后台用例**

```powershell
node --test tests/developer-backend/admin-review-completeness.browser.test.mjs
```

Expected: 全部 PASS，覆盖门禁、失败恢复、滚动和区域筛选。

### Task 3: 视觉与交互证据

**Files:**
- Create: `public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-build-test-flow.png`
- Create: `public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-developer-build-status.png`
- Create: `public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-admin-build-test.png`
- Create: `public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-release-gate-blocked.png`
- Create: `public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-release-gate-passed.png`

- [ ] **Step 1: 截取当前 Demo 页面**

运行 Playwright 用例生成开发者端和运营端截图，检查布局、状态文案、禁用态和可操作路径。

- [ ] **Step 2: 合成单张横向流程图**

流程固定为：上传整包／增量包 → 解析通过 → 提交发布审核 → 包体测试 → 运营审核 → 发布通过；测试不通过回到补传包体。

- [ ] **Step 3: 人工审图**

确认图片无裁切、遮挡、溢出、旧导航和无关 Toast；图片来自当前 Demo。

### Task 4: PRD 与 Git 发布

**Files:**
- Modify: `prd/发行平台专项/开发者后台PRD/03-游戏包体、测试审核与版本发布PRD.md`

- [ ] **Step 1: 按 `/to-prd` 重写当前规则**

PRD 使用六要素、C/B 分端和一张横向流程图；明确整包／增量包、解析状态、测试状态、重传失效、发布门禁、权限、日志和异常恢复；删除旧方案的重复与未确认扩展。

- [ ] **Step 2: 运行质量校验**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-prd-quality.ps1 -Path 'prd/发行平台专项/开发者后台PRD/03-游戏包体、测试审核与版本发布PRD.md'
```

Expected: PASS。

- [ ] **Step 3: 仅提交本需求文件并推送**

```powershell
git add -- <本计划列出的文件>
git commit -m "feat: add pc build test release gate"
git push
```

- [ ] **Step 4: 将 PRD 图片换为固定 SHA 地址并复验**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-prd-images.ps1 -PrdPath 'prd/发行平台专项/开发者后台PRD/03-游戏包体、测试审核与版本发布PRD.md' -VerifyRemote
```

Expected: 所有图片返回成功状态和图片 MIME；未实际导入飞书时只声明公网验证通过。

# Community Vest Relationship Editor and PRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将马甲号批量设置从“新增/解除双模式”改为统一关系编辑，并在两个 Tab 中支持全选当前筛选结果，同时把已确认规则补入正式 PRD。

**Architecture:** 继续使用现有单文件 HTML Demo。批量弹窗保存 `baselineIds` 和 `draftIds` 两个集合：前者表示打开或切换操作对象时的初始关系，后者表示当前勾选状态；提交时计算新增与解除差异。PRD 在现有 V1.1 基础上追加 V1.2，只追加和标记本次变更，不删除历史内容。

**Tech Stack:** HTML、CSS、原生 JavaScript、Node.js、Playwright Core、Markdown。

---

## 文件结构

- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`
    - 批量关系编辑状态、全选、差异摘要、保存与解除确认。
- Modify: `tools/verify-community-vest-batch-assignment.mjs`
    - 统一关系编辑、两个 Tab 全选、筛选外选择保留和权限回归。
- Modify: `prd/最终文档/【Prd】《盖世游戏》社区文章与马甲号运营后台需求/【Prd】《盖世游戏》社区文章与马甲号运营后台需求.md`
    - 正式 PRD V1.2。
- Modify: `prd/ai生成/【Prd】《盖世游戏》社区文章与马甲号运营后台需求.md`
    - 同步本地生成版，避免两份 PRD 口径不同。
- Reference: `docs/superpowers/specs/2026-07-27-community-vest-account-batch-assignment-design.md`

### Task 1: 建立统一关系编辑的失败验收

**Files:**
- Modify: `tools/verify-community-vest-batch-assignment.mjs`
- Test: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 更新静态标记断言**

移除对 `data-batch-mode="add"` 和 `data-batch-mode="remove"` 的依赖，增加以下标记：

```javascript
for (const token of [
  'data-batch-select-all',
  '全选当前筛选结果',
  'baselineIds',
  'draftIds',
  '保存设置'
]) assert(html.includes(token), `缺少关系编辑标记：${token}`);
```

- [ ] **Step 2: 增加“按人员分马甲号”验收**

```javascript
await page.click('[data-action="open-vest-batch"]');
await page.selectOption('#vest-batch-operator', 'OP003');
assert.equal(await page.locator('[data-batch-target]').count(), 4);
assert.equal(await page.locator('[data-batch-target="10008718"]').isChecked(), true);
assert.equal(await page.locator('[data-batch-target="10008621"]').isChecked(), false);
await page.check('[data-batch-target="10008621"]');
assert((await page.locator('.batch-summary').innerText()).includes('新增 1'));
```

- [ ] **Step 3: 增加筛选后全选验收**

```javascript
await page.fill('#vest-batch-target-search', '盖世');
await page.check('[data-batch-select-all]');
assert.equal(await page.locator('[data-batch-target="10008621"]').isChecked(), true);
assert.equal(await page.locator('[data-batch-target="10008702"]').isChecked(), true);
await page.fill('#vest-batch-target-search', '');
assert.equal(await page.locator('[data-batch-target="10008718"]').isChecked(), true);
assert.equal(await page.locator('[data-batch-target="10008635"]').isChecked(), false);
```

- [ ] **Step 4: 增加“按马甲号分人员”验收**

```javascript
await page.click('[data-batch-tab="by-vest"]');
await page.selectOption('#vest-batch-vest', '10008621');
assert.equal(await page.locator('[data-batch-target="OP001"]').isChecked(), true);
assert.equal(await page.locator('[data-batch-target="OP002"]').isChecked(), true);
await page.uncheck('[data-batch-target="OP001"]');
assert((await page.locator('.batch-summary').innerText()).includes('解除 1'));
```

- [ ] **Step 5: 运行并确认红灯**

Run:

```powershell
node tools/verify-community-vest-batch-assignment.mjs
```

Expected: FAIL，提示缺少 `data-batch-select-all` 或旧模式按钮仍存在。

### Task 2: 实现统一关系编辑和两端全选

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`
- Test: `tools/verify-community-vest-batch-assignment.mjs`

- [ ] **Step 1: 替换批量弹窗状态**

```javascript
let vestBatchState = {
  tab:'by-operator',
  anchorId:'',
  baselineIds:[],
  draftIds:[],
  query:''
};

function resetVestBatchStateV2(tab = 'by-operator') {
  vestBatchState = { tab, anchorId:'', baselineIds:[], draftIds:[], query:'' };
}

function setVestBatchAnchorV2(anchorId) {
  const baselineIds = getVestBaselineIdsV2(vestBatchState.tab, anchorId);
  vestBatchState = {
    ...vestBatchState,
    anchorId,
    baselineIds:[...baselineIds],
    draftIds:[...baselineIds],
    query:''
  };
  refreshVestBatchBodyV2();
}
```

- [ ] **Step 2: 展示全部候选**

```javascript
function getVestBatchCandidatesV2(state = vestBatchState) {
  if (!state.anchorId) return [];
  if (state.tab === 'by-operator') {
    return getAccessibleVestAccounts().map(vest => ({
      id:vest.uid,
      label:vest.nickname,
      meta:`UID ${vest.uid} · ${vest.mark}`
    }));
  }
  const assignedIds = new Set(vestAssignments[state.anchorId] || []);
  return vestOperators
    .filter(operator => operator.id !== 'SUPER' && (operator.status === 'active' || assignedIds.has(operator.id)))
    .map(operator => ({
      id:operator.id,
      label:operator.name,
      meta:`${operator.account}${operator.status === 'disabled' ? ' · 已停用，仅可解除' : ''}`,
      disabled:operator.status === 'disabled' && !assignedIds.has(operator.id)
    }));
}
```

- [ ] **Step 3: 计算差异和全选状态**

```javascript
function getVestBatchDiffV2(state = vestBatchState) {
  const baseline = new Set(state.baselineIds);
  const draft = new Set(state.draftIds);
  return {
    add:[...draft].filter(id => !baseline.has(id)),
    remove:[...baseline].filter(id => !draft.has(id))
  };
}

function getFilteredVestBatchCandidatesV2() {
  const query = vestBatchState.query.trim().toLowerCase();
  return getVestBatchCandidatesV2().filter(item =>
    !query || `${item.label} ${item.meta}`.toLowerCase().includes(query)
  );
}

function getVestBatchSelectAllStateV2() {
  const visibleIds = getFilteredVestBatchCandidatesV2().filter(item => !item.disabled).map(item => item.id);
  const selected = new Set(vestBatchState.draftIds);
  const selectedVisible = visibleIds.filter(id => selected.has(id)).length;
  return {
    checked:visibleIds.length > 0 && selectedVisible === visibleIds.length,
    indeterminate:selectedVisible > 0 && selectedVisible < visibleIds.length,
    disabled:visibleIds.length === 0
  };
}
```

- [ ] **Step 4: 实现全选当前筛选结果**

```javascript
function toggleVestBatchSelectAllV2(checked) {
  const visibleIds = getFilteredVestBatchCandidatesV2().filter(item => !item.disabled).map(item => item.id);
  const draft = new Set(vestBatchState.draftIds);
  visibleIds.forEach(id => checked ? draft.add(id) : draft.delete(id));
  vestBatchState.draftIds = [...draft];
  refreshVestBatchBodyV2();
}
```

弹窗候选区头部使用：

```html
<label class="batch-select-all">
  <input type="checkbox"
    data-batch-select-all
    onchange="toggleVestBatchSelectAllV2(this.checked)">
  全选当前筛选结果
</label>
```

渲染后同步 `checked`、`indeterminate` 和 `disabled`。

- [ ] **Step 5: 更新单项勾选和摘要**

```javascript
function toggleVestBatchTargetV2(id, checked) {
  const validIds = new Set(getVestBatchCandidatesV2().filter(item => !item.disabled).map(item => item.id));
  if (!validIds.has(id)) return;
  const draft = new Set(vestBatchState.draftIds);
  checked ? draft.add(id) : draft.delete(id);
  vestBatchState.draftIds = [...draft];
  refreshVestBatchBodyV2();
}

function buildVestBatchSummaryV2() {
  const diff = getVestBatchDiffV2();
  return `本次将新增 <strong>${diff.add.length}</strong> 条、解除 <strong>${diff.remove.length}</strong> 条分配关系。`;
}
```

- [ ] **Step 6: 运行测试**

Run:

```powershell
node tools/verify-community-vest-batch-assignment.mjs
```

Expected: 进入保存和二次确认断言；若提交逻辑未更新，在按钮或确认文案处失败。

### Task 3: 实现统一保存、解除确认和审计

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`
- Test: `tools/verify-community-vest-batch-assignment.mjs`

- [ ] **Step 1: 构建新增和解除关系**

```javascript
function getVestBatchChangesV2(state = vestBatchState) {
  const diff = getVestBatchDiffV2(state);
  const mapPair = targetId => state.tab === 'by-operator'
    ? { uid:targetId, operatorId:state.anchorId }
    : { uid:state.anchorId, operatorId:targetId };
  return {
    addPairs:diff.add.map(mapPair),
    removePairs:diff.remove.map(mapPair)
  };
}
```

- [ ] **Step 2: 更新保存按钮**

```javascript
function updateVestBatchSubmitV2() {
  const {addPairs, removePairs} = getVestBatchChangesV2();
  const count = addPairs.length + removePairs.length;
  const confirm = document.querySelector('#modal-footer-area .btn-primary');
  confirm.disabled = !vestBatchState.anchorId || count === 0 || !canManageVestAssignments();
  confirm.textContent = `保存设置（${count} 项变更）`;
}
```

- [ ] **Step 3: 仅在包含解除时二次确认**

```javascript
function submitVestBatchV2() {
  const snapshot = JSON.parse(JSON.stringify(vestBatchState));
  const changes = getVestBatchChangesV2(snapshot);
  if (!changes.addPairs.length && !changes.removePairs.length) return;
  if (changes.removePairs.length) {
    openVestBatchConfirmV2(snapshot, changes);
    return;
  }
  applyVestBatchChangesV2(snapshot, changes);
}
```

确认弹窗按钮为“取消”和“确认保存”；取消时恢复原批量弹窗和草稿，不清空选择。

- [ ] **Step 4: 分别应用新增和解除**

```javascript
function applyVestBatchChangesV2(snapshot, changes) {
  const operations = [
    ...changes.addPairs.map(pair => ({...pair, action:'add'})),
    ...changes.removePairs.map(pair => ({...pair, action:'remove'}))
  ];
  operations.forEach(({uid, operatorId, action}) => {
    const current = new Set(vestAssignments[uid] || []);
    action === 'add' ? current.add(operatorId) : current.delete(operatorId);
    vestAssignments[uid] = [...current];
  });
  saveVestAssignments();
  appendVestAssignmentAudit(operations, snapshot);
  closeModal();
  renderVestTable();
}
```

- [ ] **Step 5: 补充审计**

日志详情保存每条关系的 `action`、操作前状态、操作后状态和结果；摘要显示“新增 X、解除 Y、共 Z 条变更”。

- [ ] **Step 6: 运行完整自动化**

Run:

```powershell
node tools/verify-community-vest-batch-assignment.mjs
```

Expected:

```text
PASS community vest batch assignment
```

### Task 4: 更新正式 PRD

**Files:**
- Modify: `prd/最终文档/【Prd】《盖世游戏》社区文章与马甲号运营后台需求/【Prd】《盖世游戏》社区文章与马甲号运营后台需求.md`
- Modify: `prd/ai生成/【Prd】《盖世游戏》社区文章与马甲号运营后台需求.md`

- [ ] **Step 1: 追加版本信息**

```markdown
|2026\.07\.27|V1\.2|郑群超|<span style="background-color: #FEF794;"><strong><span style="color: #3370FF;">新增马甲号人员分配、双向批量设置、全选当前筛选结果、对象级权限和操作日志规则</span></strong> //2026.7.27修改</span>|<span style="background-color: #FEF794;">2026.7.27修改</span>|
```

- [ ] **Step 2: 更新权限矩阵和通用规则**

明确：

- 超级管理员及拥有“马甲号分配”权限的人员管理全部关系。
- 普通人员只能查看、编辑、启停、删除和使用已分配马甲号。
- 列表、操作记录、详情和写接口均执行对象级校验。
- 国内、海外分别配置和保存关系，不跨区服复用。

- [ ] **Step 3: 更新 F002 马甲号管理**

追加：

- 三张统计卡，移除“今日代操作”。
- 分配人员筛选和列表列。
- 批量设置双 Tab。
- 已分配默认勾选；勾选新增、取消解除。
- 两个 Tab 均支持全选当前筛选结果。
- 统一保存差异；含解除时二次确认。

- [ ] **Step 4: 更新 F003 操作记录和边界**

追加：

- 日志结果包含成功、部分成功、失败。
- 详情包含操作前后关系、每条新增/解除明细及失败原因。
- 普通人员只能查看已分配马甲号相关日志。
- 补充搜索全选、并发基准变化、部分失败和权限变更边界。

- [ ] **Step 5: 同步两份 PRD**

正式文档和 `prd/ai生成` 文档的 V1.2 变更内容保持一致；不得覆盖两份文件中已有的其他差异内容。

### Task 5: 视觉、回归与文档自检

**Files:**
- Test: `demos/社区/社区文章与马甲号运营后台demo.html`
- Test: `tools/verify-community-vest-batch-assignment.mjs`
- Test: 两份 PRD

- [ ] **Step 1: 运行代码检查**

```powershell
node --check tools/verify-community-vest-batch-assignment.mjs
node tools/verify-community-vest-batch-assignment.mjs
git diff --check -- demos/社区/社区文章与马甲号运营后台demo.html tools/verify-community-vest-batch-assignment.mjs
```

- [ ] **Step 2: 浏览器视觉检查**

在 1920×1080 下检查：

- 两个 Tab 没有新增/解除模式按钮。
- 全选、已选数量、新增/解除摘要在同一候选区内清晰可读。
- 半选态可见，搜索后隐藏选择数量准确。
- 解除确认展示新增和解除数量，底部按钮不遮挡。

- [ ] **Step 3: 权限回归**

检查普通人员：

- 只能看到已分配马甲号。
- 无批量设置入口。
- 无法通过直接函数调用修改关系。
- 操作记录不显示未分配马甲号。

- [ ] **Step 4: PRD 自检**

检查：

- 版本表追加 V1.2，旧版本保留。
- 新增内容使用黄色背景和蓝色加粗关键词。
- 覆盖列表、筛选、多选、三态全选、权限、操作反馈、并发、部分失败、国内海外隔离。
- 不写 UI 数值参数和程序字段名。
- Markdown 表格和图片格式保持飞书兼容。

- [ ] **Step 5: 最终差异检查**

```powershell
git diff --check -- `
  demos/社区/社区文章与马甲号运营后台demo.html `
  tools/verify-community-vest-batch-assignment.mjs `
  "prd/最终文档/【Prd】《盖世游戏》社区文章与马甲号运营后台需求/【Prd】《盖世游戏》社区文章与马甲号运营后台需求.md" `
  "prd/ai生成/【Prd】《盖世游戏》社区文章与马甲号运营后台需求.md"
```

Expected: 无空白错误。

# Community Vest Account Batch Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有社区运营后台 Demo 中移除“今日代操作”，并实现人员与马甲号之间可新增、可解除、可审计的双向批量分配。

**Architecture:** 保持现有单文件 HTML 架构，在社区运营扩展脚本中增加后台人员数据、马甲号—人员多对多关系和批量弹窗状态。页面继续复用全局弹窗、Toast、操作记录和马甲号渲染能力；使用稳定的 `data-*` 标记支持自动验收，不重构社区其他模块。

**Tech Stack:** HTML、CSS、原生 JavaScript、Node.js、Playwright Core、本地 Chrome。

---

## 文件结构

- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`
    - 页面结构、分配数据、列表渲染、双向批量弹窗、权限判断、操作日志。
- Create: `tools/verify-community-vest-batch-assignment.mjs`
    - 静态结构检查和浏览器交互验收。
- Reference: `docs/superpowers/specs/2026-07-27-community-vest-account-batch-assignment-design.md`
    - 已确认的页面、权限、异常和验收规则。

### Task 1: 先建立失败的自动验收

**Files:**
- Create: `tools/verify-community-vest-batch-assignment.mjs`
- Test: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 创建静态和浏览器验收脚本**

写入以下脚本：

```javascript
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, 'demos', '社区', '社区文章与马甲号运营后台demo.html');
const html = fs.readFileSync(demo, 'utf8');

assert(!html.includes('今日代操作'), '“今日代操作”仍存在');
for (const token of [
  '批量设置',
  '分配人员',
  'data-action="open-vest-batch"',
  'data-batch-tab="by-operator"',
  'data-batch-tab="by-vest"',
  'data-batch-mode="add"',
  'data-batch-mode="remove"',
  'vestOperators',
  'vestAssignments',
  'appendVestAssignmentAudit'
]) assert(html.includes(token), `缺少功能标记：${token}`);

const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
];
const executablePath = chromeCandidates.find(fs.existsSync);
assert(executablePath, '未找到本地 Chrome');

const browser = await chromium.launch({ executablePath, headless:true });
const page = await browser.newPage({ viewport:{ width:1920, height:1080 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => localStorage.removeItem('communityVestAssignments'));
await page.goto(pathToFileURL(demo).href);
await page.waitForSelector('#ops-menu-vest');
await page.click('#ops-menu-vest');

assert.equal(await page.getByText('今日代操作').count(), 0);
assert.equal(await page.locator('.vest-stats .stat-card').count(), 3);
assert.equal(await page.locator('[data-column="assigned-operators"]').count(), 1);

await page.click('[data-action="open-vest-batch"]');
assert.equal(await page.locator('[data-batch-tab="by-operator"]').count(), 1);
assert.equal(await page.locator('[data-batch-tab="by-vest"]').count(), 1);

await page.selectOption('#vest-batch-operator', 'OP003');
await page.check('[data-batch-target="10008621"]');
await page.click('#modal-footer-area .btn-primary');
await page.waitForTimeout(50);
assert((await page.locator('[data-vest-uid="10008621"] [data-role="assigned-operators"]').innerText()).includes('陈晨'));

await page.click('[data-action="open-vest-batch"]');
await page.click('[data-batch-tab="by-vest"]');
await page.click('[data-batch-mode="remove"]');
await page.selectOption('#vest-batch-vest', '10008621');
await page.check('[data-batch-target="OP003"]');
await page.click('#modal-footer-area .btn-primary');
assert.equal(await page.getByText('确认解除分配').count(), 1);
await page.click('#modal-footer-area .btn-primary');
await page.waitForTimeout(50);
assert(!(await page.locator('[data-vest-uid="10008621"] [data-role="assigned-operators"]').innerText()).includes('陈晨'));

await page.evaluate(() => {
  window.setVestOperatorView('OP001');
  window.renderVestTable();
});
assert.equal(await page.locator('#vest-table-body tr[data-vest-uid]').count(), 2);

await page.locator('.menu-item').filter({ hasText:'操作记录' }).first().click();
assert((await page.locator('#audit-table-body').innerText()).includes('解除分配'));
assert.deepEqual(errors, []);
await browser.close();
console.log('PASS community vest batch assignment');
```

- [ ] **Step 2: 运行验收并确认失败**

Run:

```powershell
node tools/verify-community-vest-batch-assignment.mjs
```

Expected: FAIL，首个错误为“`“今日代操作”仍存在`”。

- [ ] **Step 3: 提交测试基线**

```powershell
git add tools/verify-community-vest-batch-assignment.mjs
git commit -m "test: cover vest account batch assignment"
```

### Task 2: 调整马甲号页面和分配数据

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html:206-218`
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html:2481-2555`
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html:3151-3161`
- Test: `tools/verify-community-vest-batch-assignment.mjs`

- [ ] **Step 1: 增加三列数据卡和人员标签样式**

在现有运营后台样式区增加：

```css
.stats-grid.vest-stats { grid-template-columns:repeat(3,minmax(0,1fr)); }
.assigned-operators { display:flex; align-items:center; gap:4px; flex-wrap:wrap; min-width:140px; }
.operator-chip { display:inline-flex; align-items:center; padding:2px 7px; border-radius:10px; background:#e6f7ff; color:#1677ff; font-size:12px; }
.operator-chip-more { background:#f5f5f5; color:#595959; }
.operator-unassigned { color:#bfbfbf; }
.batch-layout { display:grid; grid-template-columns:150px minmax(0,1fr); gap:14px; }
.batch-mode-group { display:flex; gap:8px; margin-bottom:16px; }
.batch-mode { padding:7px 14px; border:1px solid #d9d9d9; border-radius:4px; background:#fff; cursor:pointer; }
.batch-mode.active { color:#1677ff; border-color:#1677ff; background:#e6f7ff; }
.batch-target-list { border:1px solid #f0f0f0; border-radius:6px; max-height:260px; overflow:auto; }
.batch-target-row { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #f5f5f5; }
.batch-target-row:last-child { border-bottom:0; }
.batch-summary { margin-top:12px; padding:10px 12px; border-radius:6px; background:#f5f7fa; color:#595959; }
```

- [ ] **Step 2: 增加后台人员和多对多分配数据**

紧接 `vestAccounts` 后增加：

```javascript
const vestOperators = [
  { id:'SUPER', name:'SuperAdmin', account:'superadmin', status:'active', canAssign:true },
  { id:'OP001', name:'李明', account:'liming', status:'active', canAssign:false },
  { id:'OP002', name:'王璐', account:'wanglu', status:'active', canAssign:false },
  { id:'OP003', name:'陈晨', account:'chenchen', status:'active', canAssign:false },
  { id:'OP004', name:'赵敏', account:'zhaomin', status:'disabled', canAssign:false }
];
let currentVestOperatorId = 'SUPER';
let vestAssignments = JSON.parse(localStorage.getItem('communityVestAssignments') || 'null') || {
  '10008621':['OP001','OP002'],
  '10008635':['OP001'],
  '10008702':['OP002'],
  '10008718':['OP003']
};

function saveVestAssignments() {
  localStorage.setItem('communityVestAssignments', JSON.stringify(vestAssignments));
}
function getVestOperator(id) {
  return vestOperators.find(item => item.id === id) || null;
}
function getAssignedOperators(uid) {
  return (vestAssignments[uid] || []).map(getVestOperator).filter(Boolean);
}
function canAccessVest(uid, operatorId = currentVestOperatorId) {
  const operator = getVestOperator(operatorId);
  return Boolean(operator && (operator.id === 'SUPER' || operator.canAssign || (vestAssignments[uid] || []).includes(operatorId)));
}
function canManageVestAssignments(operatorId = currentVestOperatorId) {
  const operator = getVestOperator(operatorId);
  return Boolean(operator && (operator.id === 'SUPER' || operator.canAssign));
}
window.setVestOperatorView = id => {
  currentVestOperatorId = id;
  const page = document.getElementById('page-vest-account');
  if (page) {
    page.innerHTML = buildVestPage();
    renderVestTable();
  }
};
```

- [ ] **Step 3: 改造页面结构**

修改 `buildVestPage()`：

- 删除“今日代操作”卡片。
- 给统计区增加 `vest-stats`。
- 在“批量导入”和“创建马甲号”之间增加：

```html
${canManageVestAssignments() ? `
  <button class="btn btn-default" data-action="open-vest-batch" onclick="openVestBatchModal()">
    <i class="fas fa-users-cog"></i> 批量设置
  </button>` : ''}
```

- 在筛选区增加：

```html
${canManageVestAssignments() ? `
  <div class="filter-item">
    分配人员：
    <select id="vest-operator-filter">
      <option value="">全部人员</option>
      ${vestOperators.filter(item => item.status === 'active' && item.id !== 'SUPER')
        .map(item => `<option value="${item.id}">${opsEscapeHtml(item.name)}</option>`).join('')}
    </select>
  </div>` : ''}
```

- 在“隐私设置”和“状态”之间增加：

```html
<th data-column="assigned-operators">分配人员</th>
```

- [ ] **Step 4: 改造列表筛选和人员展示**

在 `renderVestTable()` 中加入：

```javascript
const operatorFilter = document.getElementById('vest-operator-filter')?.value || '';
const viewer = getVestOperator(currentVestOperatorId);
const rows = vestAccounts.filter(item =>
  canAccessVest(item.uid) &&
  (!key || `${item.uid} ${item.nickname}`.toLowerCase().includes(key)) &&
  (!status || item.status === status) &&
  (!visible || String(item.visible) === visible) &&
  (!operatorFilter || (vestAssignments[item.uid] || []).includes(operatorFilter))
);
```

在每行“隐私设置”后插入：

```javascript
<td data-role="assigned-operators">
  <div class="assigned-operators">
    ${(() => {
      const people = getAssignedOperators(item.uid);
      if (!people.length) return '<span class="operator-unassigned">未分配</span>';
      const shown = people.slice(0, 2).map(person => `<span class="operator-chip">${opsEscapeHtml(person.name)}</span>`).join('');
      const more = people.length > 2 ? `<span class="operator-chip operator-chip-more">+${people.length - 2}</span>` : '';
      return shown + more;
    })()}
  </div>
</td>
```

给表格行增加 `data-vest-uid="${item.uid}"`，空状态 `colspan` 从 `8` 调整为 `9`。

在 `resetVestFilter()` 中增加：

```javascript
const operatorFilter = document.getElementById('vest-operator-filter');
if (operatorFilter) operatorFilter.value = '';
```

- [ ] **Step 5: 运行验收确认进入下一个失败点**

Run:

```powershell
node tools/verify-community-vest-batch-assignment.mjs
```

Expected: FAIL，提示缺少批量弹窗 Tab 或无法找到 `data-batch-tab`。

- [ ] **Step 6: 提交页面与数据**

```powershell
git add demos/社区/社区文章与马甲号运营后台demo.html
git commit -m "feat: add vest assignment data and list column"
```

### Task 3: 实现双向新增和解除分配

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html:3151-3173`
- Test: `tools/verify-community-vest-batch-assignment.mjs`

- [ ] **Step 1: 增加批量弹窗状态**

在马甲号管理函数区增加：

```javascript
let vestBatchState = { tab:'by-operator', mode:'add', anchorId:'', targetIds:[] };

function resetVestBatchState() {
  vestBatchState = { tab:'by-operator', mode:'add', anchorId:'', targetIds:[] };
}
function getVestBatchCandidates() {
  if (!vestBatchState.anchorId) return [];
  if (vestBatchState.tab === 'by-operator') {
    return vestAccounts.filter(vest => {
      const assigned = (vestAssignments[vest.uid] || []).includes(vestBatchState.anchorId);
      return vestBatchState.mode === 'add' ? !assigned : assigned;
    }).map(vest => ({ id:vest.uid, label:vest.nickname, meta:`UID ${vest.uid}` }));
  }
  const assignedIds = vestAssignments[vestBatchState.anchorId] || [];
  return vestOperators.filter(operator => operator.id !== 'SUPER' && (
    vestBatchState.mode === 'add'
      ? operator.status === 'active' && !assignedIds.includes(operator.id)
      : assignedIds.includes(operator.id)
  )).map(operator => ({ id:operator.id, label:operator.name, meta:operator.account }));
}
```

- [ ] **Step 2: 增加弹窗渲染和切换函数**

增加：

```javascript
function buildVestBatchBody() {
  const byOperator = vestBatchState.tab === 'by-operator';
  const anchorOptions = byOperator
    ? vestOperators.filter(item => item.status === 'active' && item.id !== 'SUPER')
    : vestAccounts;
  const candidates = getVestBatchCandidates();
  const anchorLabel = byOperator ? '后台人员' : '马甲号';
  const targetLabel = byOperator ? '马甲号' : '后台人员';
  return `
    <div class="tabs">
      <div class="tab-item ${byOperator ? 'active' : ''}" data-batch-tab="by-operator" onclick="switchVestBatchTab('by-operator')">按人员分配马甲号</div>
      <div class="tab-item ${!byOperator ? 'active' : ''}" data-batch-tab="by-vest" onclick="switchVestBatchTab('by-vest')">按马甲号分配人员</div>
    </div>
    <div class="batch-mode-group">
      <button class="batch-mode ${vestBatchState.mode === 'add' ? 'active' : ''}" data-batch-mode="add" onclick="switchVestBatchMode('add')">新增分配</button>
      <button class="batch-mode ${vestBatchState.mode === 'remove' ? 'active' : ''}" data-batch-mode="remove" onclick="switchVestBatchMode('remove')">解除分配</button>
    </div>
    <div class="form-group">
      <label class="required">${anchorLabel}</label>
      <select class="form-control" id="${byOperator ? 'vest-batch-operator' : 'vest-batch-vest'}" onchange="setVestBatchAnchor(this.value)">
        <option value="">请选择${anchorLabel}</option>
        ${anchorOptions.map(item => `<option value="${byOperator ? item.id : item.uid}" ${vestBatchState.anchorId === (byOperator ? item.id : item.uid) ? 'selected' : ''}>${opsEscapeHtml(byOperator ? `${item.name}（${item.account}）` : `${item.nickname}（${item.uid}）`)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="required">${targetLabel}（已选 ${vestBatchState.targetIds.length} 项）</label>
      <div class="batch-target-list">
        ${candidates.length ? candidates.map(item => `
          <label class="batch-target-row">
            <span><strong>${opsEscapeHtml(item.label)}</strong><small class="article-id">${opsEscapeHtml(item.meta)}</small></span>
            <input type="checkbox" data-batch-target="${item.id}" ${vestBatchState.targetIds.includes(item.id) ? 'checked' : ''} onchange="toggleVestBatchTarget('${item.id}', this.checked)">
          </label>`).join('') : '<div class="empty-state">当前没有可选择对象</div>'}
      </div>
    </div>
    <div class="batch-summary">${vestBatchState.mode === 'add' ? '新增分配不会移除已有关系。' : '解除分配只影响本次选中的关系。'}</div>`;
}

function refreshVestBatchBody() {
  document.getElementById('modal-body-content').innerHTML = buildVestBatchBody();
}
function switchVestBatchTab(tab) {
  vestBatchState = { tab, mode:'add', anchorId:'', targetIds:[] };
  refreshVestBatchBody();
}
function switchVestBatchMode(mode) {
  vestBatchState.mode = mode;
  vestBatchState.targetIds = [];
  refreshVestBatchBody();
}
function setVestBatchAnchor(anchorId) {
  vestBatchState.anchorId = anchorId;
  vestBatchState.targetIds = [];
  refreshVestBatchBody();
}
function toggleVestBatchTarget(id, checked) {
  vestBatchState.targetIds = checked
    ? [...new Set([...vestBatchState.targetIds, id])]
    : vestBatchState.targetIds.filter(item => item !== id);
  refreshVestBatchBody();
}
function openVestBatchModal() {
  resetVestBatchState();
  openModal('批量设置', buildVestBatchBody(), submitVestBatch);
}
```

- [ ] **Step 3: 实现新增、解除和二次确认**

增加：

```javascript
function getVestBatchPairs() {
  if (vestBatchState.tab === 'by-operator') {
    return vestBatchState.targetIds.map(uid => ({ uid, operatorId:vestBatchState.anchorId }));
  }
  return vestBatchState.targetIds.map(operatorId => ({ uid:vestBatchState.anchorId, operatorId }));
}

function submitVestBatch() {
  if (!vestBatchState.anchorId || !vestBatchState.targetIds.length) {
    showToast('请选择操作对象','error');
    return;
  }
  if (vestBatchState.mode === 'remove') {
    const snapshot = JSON.parse(JSON.stringify(vestBatchState));
    const anchor = snapshot.tab === 'by-operator' ? getVestOperator(snapshot.anchorId)?.name : getVest(snapshot.anchorId)?.nickname;
    const targetType = snapshot.tab === 'by-operator' ? '个马甲号' : '名后台人员';
    openModal('确认解除分配', `<p>将解除<strong>${opsEscapeHtml(anchor)}</strong>与 <strong>${snapshot.targetIds.length}</strong> ${targetType}的分配关系。</p><p style="color:#8c8c8c">解除后，相关人员将无法查看、编辑、停用、删除或使用这些账号发布内容。</p>`, () => {
      vestBatchState = snapshot;
      applyVestBatch();
    });
    return;
  }
  applyVestBatch();
}

function applyVestBatch() {
  const pairs = getVestBatchPairs();
  pairs.forEach(({ uid, operatorId }) => {
    const current = new Set(vestAssignments[uid] || []);
    if (vestBatchState.mode === 'add') current.add(operatorId);
    else current.delete(operatorId);
    vestAssignments[uid] = [...current];
  });
  saveVestAssignments();
  appendVestAssignmentAudit(pairs);
  closeModal();
  renderVestTable();
  showToast(`${vestBatchState.mode === 'add' ? '新增' : '解除'}分配成功，共处理 ${pairs.length} 条关系`);
}
```

- [ ] **Step 4: 运行新增和解除交互验收**

Run:

```powershell
node tools/verify-community-vest-batch-assignment.mjs
```

Expected: 继续执行至操作记录检查；若日志尚未实现，则在日志断言失败。

- [ ] **Step 5: 提交批量弹窗**

```powershell
git add demos/社区/社区文章与马甲号运营后台demo.html
git commit -m "feat: add bidirectional vest batch assignment"
```

### Task 4: 补齐权限视角、操作日志和异常结果

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html:2543-2555`
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html:3154-3177`
- Test: `tools/verify-community-vest-batch-assignment.mjs`

- [ ] **Step 1: 增加批量分配操作日志**

增加：

```javascript
function appendVestAssignmentAudit(pairs) {
  const people = [...new Set(pairs.map(pair => getVestOperator(pair.operatorId)?.name).filter(Boolean))];
  const vestUids = [...new Set(pairs.map(pair => pair.uid))];
  appendAuditLog({
    module:'马甲号管理',
    action:vestBatchState.mode === 'add' ? '新增分配' : '解除分配',
    objectId:`${pairs.length}条关系`,
    vestUid:vestUids.length === 1 ? vestUids[0] : '-',
    result:'成功',
    before:vestBatchState.mode === 'remove' ? { operators:people, vestUids } : null,
    after:vestBatchState.mode === 'add' ? { operators:people, vestUids } : null
  });
}
```

- [ ] **Step 2: 给马甲号操作入口增加对象权限校验**

增加：

```javascript
function requireVestAccess(uid) {
  if (canAccessVest(uid)) return true;
  showToast('无权查看或操作该马甲号','error');
  return false;
}
```

在 `useVestToPublish`、`openVestEditor`、`toggleVestStatus`、`deleteVestAccount` 的对象操作开始位置加入：

```javascript
if (uid && !requireVestAccess(uid)) return;
```

`renderVestTable()` 已通过 `canAccessVest()` 过滤普通人员数据；未分配时空状态改为：

```javascript
const emptyText = viewer?.id === 'SUPER' || viewer?.canAssign
  ? '暂无匹配马甲号'
  : '暂无可管理的马甲号，请联系管理员分配';
```

- [ ] **Step 3: 处理停用人员和失效对象**

用以下完整实现替换 Task 3 的 `applyVestBatch()`，提交前重新过滤有效关系：

```javascript
function applyVestBatch() {
  const requestedPairs = getVestBatchPairs();
  const validPairs = requestedPairs.filter(({ uid, operatorId }) => {
    const vest = getVest(uid);
    const operator = getVestOperator(operatorId);
    if (!vest || !operator) return false;
    return vestBatchState.mode === 'remove' || operator.status === 'active';
  });
  validPairs.forEach(({ uid, operatorId }) => {
    const current = new Set(vestAssignments[uid] || []);
    if (vestBatchState.mode === 'add') current.add(operatorId);
    else current.delete(operatorId);
    vestAssignments[uid] = [...current];
  });
  saveVestAssignments();
  appendVestAssignmentAudit(validPairs);
  closeModal();
  renderVestTable();
  const failed = requestedPairs.length - validPairs.length;
  if (failed) {
    showToast(`已处理 ${validPairs.length} 条，${failed} 条因对象失效未处理`, 'error');
  } else {
    showToast(`${vestBatchState.mode === 'add' ? '新增' : '解除'}分配成功，共处理 ${validPairs.length} 条关系`);
  }
}
```

- [ ] **Step 4: 运行完整自动验收**

Run:

```powershell
node tools/verify-community-vest-batch-assignment.mjs
```

Expected:

```text
PASS community vest batch assignment
```

- [ ] **Step 5: 提交权限和审计**

```powershell
git add demos/社区/社区文章与马甲号运营后台demo.html tools/verify-community-vest-batch-assignment.mjs
git commit -m "feat: enforce vest assignment permissions and audit"
```

### Task 5: 浏览器视觉验收和回归

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`
- Test: `tools/verify-community-vest-batch-assignment.mjs`

- [ ] **Step 1: 启动本地静态服务**

Run:

```powershell
Start-Process -FilePath python -ArgumentList '-m','http.server','8765' -WorkingDirectory 'C:\Users\z3635\官网改动' -WindowStyle Hidden
```

Expected: `http://localhost:8765/demos/社区/社区文章与马甲号运营后台demo.html` 可访问。

- [ ] **Step 2: 检查马甲号管理页**

检查：

- 三张数据卡等宽，无第四张空位。
- “分配人员”列位于“隐私设置”和“状态”之间。
- 人员标签最多显示两名，超出显示“+N”。
- 筛选区在 1920×1080 下不遮挡查询和重置按钮。

- [ ] **Step 3: 检查双向批量弹窗**

检查：

- 两个 Tab 切换后清空未提交选择。
- “新增分配”和“解除分配”候选对象互斥。
- 多选列表可滚动，长名称不挤压复选框。
- 解除确认文案显示对象和影响数量。

- [ ] **Step 4: 回归社区运营后台其他页面**

依次打开内容发布、马甲号管理和操作记录，确认：

- 页面切换无 JavaScript 报错。
- 原有内容发布、马甲号编辑、批量导入、操作详情仍可操作。
- 国内和海外后台导航均可进入对应页面。

- [ ] **Step 5: 再次运行自动验收**

Run:

```powershell
node tools/verify-community-vest-batch-assignment.mjs
```

Expected:

```text
PASS community vest batch assignment
```

- [ ] **Step 6: 提交视觉修正**

仅在 Step 2 至 Step 4 产生修正时执行：

```powershell
git add demos/社区/社区文章与马甲号运营后台demo.html
git commit -m "fix: polish vest batch assignment interactions"
```

## 实施注意事项

- 当前 Demo 文件已有用户未提交改动，实施时必须在现有内容上局部修改，禁止回退或覆盖其他社区功能。
- 不新建独立权限页面，不拆分细粒度权限，不扩展到内容审核和风险事件模块。
- 批量关系使用 `localStorage` 仅服务 Demo 刷新持久化；正式后端仍需使用对象级权限校验、唯一关系约束和审计日志。
- 发布到 Git 前只提交本计划涉及的 Demo、验证脚本和设计文档，不带入工作区其他改动。

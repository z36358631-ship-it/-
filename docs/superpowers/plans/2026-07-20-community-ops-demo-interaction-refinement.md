# Community Operations Demo Interaction Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将社区运营 Demo 收敛为内容发布与马甲号管理两个核心页面，把马甲号选择合并到发布详情，并补齐两个页面全部可见交互。

**Architecture:** 保持单文件 HTML 架构，删除草稿、风险和全局当前身份状态，新增编辑器局部状态 `editorVestUid` 与内容类型状态 `editorContentType`。内容列表、发布详情、马甲号管理和操作记录共用页面内数据数组；静态检查负责结构约束，Edge CDP 测试负责真实点击和状态闭环。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 24、Microsoft Edge DevTools Protocol。

---

## 文件结构

- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`：删除页面并重构内容发布、发布详情、马甲号管理和操作记录。
- Modify: `scripts/check-community-ops-demo.mjs`：更新必需与禁止结构检查。
- Modify: `scripts/check-community-ops-browser.mjs`：更新真实浏览器主流程测试。
- Reference only: `docs/superpowers/specs/2026-07-20-community-ops-demo-interaction-refinement-design.md`：本次变更规格。

### Task 1: 先更新静态约束测试

**Files:**
- Modify: `scripts/check-community-ops-demo.mjs`

- [ ] **Step 1: 将旧页面标记为禁止项**

新增以下禁止 token：

```js
const forbiddenStructure = [
  'ops-menu-drafts',
  'page-drafts',
  'ops-menu-risk',
  'page-risk',
  'acting-identity-bar',
  'saveDraft()',
  '自动保存'
];

for (const token of forbiddenStructure) {
  if (html.includes(token)) {
    throw new Error(`Removed structure still exists: ${token}`);
  }
}
```

- [ ] **Step 2: 更新必需 token**

将 `required` 更新为：

```js
const required = [
  'page-official-post',
  'page-vest-account',
  'page-log',
  'article-editor-workspace',
  'editor-vest-selector',
  'content-type-tabs',
  'copyArticle',
  'useVestToPublish',
  'switchEditorContentType',
  'validateArticle',
  'submitArticle',
  'renderArticleTable',
  'renderVestTable',
  'renderAuditTable'
];
```

- [ ] **Step 3: 运行测试确认失败**

Run:

```powershell
node scripts/check-community-ops-demo.mjs
```

Expected: FAIL，首先报告 `Removed structure still exists: ops-menu-drafts`。

### Task 2: 删除草稿、风险和全局身份上下文

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 删除侧栏和页面安装代码**

从 `installOpsNavigation()` 中删除草稿箱、风险事件菜单和页面容器，只保留马甲号菜单：

```js
official.insertAdjacentHTML('afterend', `
  <div class="menu-item" id="ops-menu-vest" onclick="switchMenu('vest-account', this, '国内')">
    <i class="fas fa-user-secret"></i> 马甲号管理
  </div>
`);
```

删除 `acting-identity-bar` 注入逻辑，页面容器只补充：

```html
<div class="page" id="page-vest-account"></div>
```

- [ ] **Step 2: 删除旧数据和函数**

删除以下状态和函数：

```text
draftRows
riskRows
currentVestUid
editingDraftId
autoSaveTimer
renderActingIdentity
openIdentityPicker
filterIdentityList
renderIdentityOptions
selectVest
clearVestIdentity
requireVestIdentity
buildDraftPage
renderDraftTable
resetDraftFilter
continueDraft
copyDraft
deleteDraft
buildRiskPage
renderRiskTable
openRiskDetail
addRiskNote
resolveRisk
```

- [ ] **Step 3: 建立编辑器局部状态**

```js
let editorVestUid = null;
let editorContentType = 'article';
let editorSourceId = null;
let editorMode = 'create';
let editorDirty = false;
```

`appendAuditLog()` 不再读取全局身份：

```js
function appendAuditLog(entry) {
  auditRows.unshift({
    time: opsNow(),
    operator: '李明',
    vestUid: entry.vestUid || '-',
    requestId: `req_${Date.now().toString(36)}`,
    before: null,
    after: null,
    ...entry
  });
  renderAuditTable();
}
```

- [ ] **Step 4: 运行静态检查确认进入下一项失败**

Run:

```powershell
node scripts/check-community-ops-demo.mjs
```

Expected: 不再报告草稿或风险 token，报告缺少 `editor-vest-selector`。

### Task 3: 补齐内容列表全部交互

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 为文章数据增加内容类型**

每条内容使用以下字段：

```js
{
  id: 'ART20260720001',
  type: 'article',
  title: '本周值得体验的 5 款合作游戏',
  author: '盖世攻略君',
  authorUid: '10008621',
  status: 'published',
  views: 12860,
  likes: 426,
  comments: 87
}
```

类型映射固定为：

```js
const contentTypeLabels = { image: '图文', article: '文章', video: '视频' };
let articleListType = 'all';
```

- [ ] **Step 2: 让顶部三个发布入口直接打开详情**

```html
<button class="btn btn-default" onclick="openArticleEditor({ type: 'image' })">发布图文</button>
<button class="btn btn-primary" onclick="openArticleEditor({ type: 'article' })">发布文章</button>
<button class="btn btn-default" onclick="openArticleEditor({ type: 'video' })">发布视频</button>
```

- [ ] **Step 3: 实现列表类型 Tab**

```js
function setArticleListType(type) {
  articleListType = type;
  document.querySelectorAll('#content-type-tabs .toolbar-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.type === type);
  });
  renderArticleTable();
}
```

`renderArticleTable()` 增加 `articleListType === 'all' || item.type === articleListType` 过滤，并在表格中展示类型标签。

- [ ] **Step 4: 增加复制与操作记录入口**

```js
function copyArticle(id) {
  const source = articleRows.find(item => item.id === id);
  if (!source) return;
  openArticleEditor({
    mode: 'copy',
    sourceId: id,
    type: source.type,
    vestUid: source.authorUid
  });
}

function openArticleAudit(id) {
  switchMenu('log', findDomesticMenu('log'), '国内');
  document.getElementById('audit-object').value = id;
  renderAuditTable();
}
```

列表每行操作完整包含：

```html
<a onclick="previewArticle('${item.id}')">预览</a>
<a onclick="editArticle('${item.id}')">编辑</a>
<a onclick="copyArticle('${item.id}')">复制</a>
<a onclick="showReviewResult('${item.id}')">审核详情</a>
<a onclick="openArticleAudit('${item.id}')">操作记录</a>
```

- [ ] **Step 5: 为分页增加反馈**

```js
function goArticlePage(direction) {
  showToast(direction === 'next' ? '已是最后一页' : '已是第一页');
}
```

### Task 4: 将发布马甲号合并到发布详情

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 重构工作台内容类型 Tab**

```html
<div class="toolbar-tabs" id="editor-content-type-tabs">
  <div class="toolbar-tab" data-type="image" onclick="switchEditorContentType('image')">发布图文</div>
  <div class="toolbar-tab" data-type="article" onclick="switchEditorContentType('article')">发布文章</div>
  <div class="toolbar-tab" data-type="video" onclick="switchEditorContentType('video')">发布视频</div>
</div>
```

```js
function switchEditorContentType(type) {
  editorContentType = type;
  document.querySelectorAll('#editor-content-type-tabs .toolbar-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.type === type);
  });
  renderTypeSpecificFields();
  syncArticlePreview();
  editorDirty = true;
}
```

- [ ] **Step 2: 在详情第一项增加马甲号选择器**

```html
<div class="form-group" id="editor-vest-selector">
  <label class="required">发布马甲号</label>
  <div style="flex:1">
    <div id="editor-vest-selected"></div>
    <button class="btn btn-default" onclick="openEditorVestPicker()">选择马甲号</button>
    <button class="btn btn-default" onclick="clearEditorVest()">清除</button>
    <div class="editor-error" id="error-editor-vest"></div>
  </div>
</div>
```

```js
function chooseEditorVest(uid) {
  const account = getVest(uid);
  if (!account || account.status !== 'active') {
    showToast('停用账号不能用于发布', 'error');
    return;
  }
  editorVestUid = uid;
  renderEditorVestSelection();
  closeModal();
  syncArticlePreview();
}
```

- [ ] **Step 3: 实现三种内容类型的专属上传区**

`renderTypeSpecificFields()` 使用固定结构：

```js
function renderTypeSpecificFields() {
  const box = document.getElementById('type-specific-fields');
  if (editorContentType === 'image') box.innerHTML = buildImageUploader();
  if (editorContentType === 'article') box.innerHTML = buildArticleCoverUploader();
  if (editorContentType === 'video') box.innerHTML = buildVideoUploader();
}
```

图文上传支持添加和删除模拟图片；文章支持封面选择；视频支持上传文件和选择视频封面。每个按钮改变对应前端状态并同步预览。

- [ ] **Step 4: 重构打开、复制和编辑逻辑**

```js
function openArticleEditor(options = {}) {
  editorMode = options.mode || 'create';
  editorSourceId = options.sourceId || null;
  editorContentType = options.type || 'article';
  editorVestUid = options.vestUid || null;
  // 编辑或复制时回填来源数据；复制模式标题追加“（副本）”。
  // 新建时清空所有内容字段和类型专属素材。
  renderEditorVestSelection();
  switchEditorContentType(editorContentType);
  syncArticlePreview();
  document.getElementById('article-editor-workspace').classList.add('show');
}
```

- [ ] **Step 5: 移除草稿按钮并更新提交校验**

编辑器底部只保留：

```html
<button class="btn btn-default" onclick="requestCloseEditor()">取消</button>
<button class="btn btn-default" onclick="syncArticlePreview(true)">预览</button>
<button class="btn btn-primary" onclick="submitArticle()">提交审核</button>
```

`validateArticle()` 首先校验 `editorVestUid`，再按 `editorContentType` 校验专属素材。提交确认展示类型、标题、发布马甲号；复制提交生成新 ID，互动数据清零。

### Task 5: 补齐马甲号管理交互

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 将切换身份改为使用该身份发布**

```js
function useVestToPublish(uid) {
  const account = getVest(uid);
  if (!account || account.status !== 'active') {
    showToast('停用账号不能用于发布', 'error');
    return;
  }
  openArticleEditor({ type: 'article', vestUid: uid });
}
```

按钮文案改为“使用该身份发布”，停用账号使用 `disabled` 属性而不是仅靠 CSS 阻止点击。

- [ ] **Step 2: 确保所有账号动作写入日志**

创建、编辑、启用、停用、删除和批量导入调用 `appendAuditLog()`，并显式传入 `vestUid`：

```js
appendAuditLog({
  module: '马甲号管理',
  action: '编辑马甲号',
  objectId: uid,
  vestUid: uid,
  result: '成功',
  before,
  after
});
```

- [ ] **Step 3: 验证列表事件**

手动验证查询、重置、创建、编辑、启停、删除、点击导入、拖放导入和使用该身份发布；每次操作必须更新页面或显示明确反馈。

### Task 6: 收敛操作记录

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 清理模拟日志**

`auditRows` 仅保留 `内容发布` 与 `马甲号管理` 两类示例，不再出现 `身份切换`、`内容审核` 和 `风险事件`。

- [ ] **Step 2: 限定模块筛选**

```html
<select id="audit-module">
  <option value="">全部模块</option>
  <option>内容发布</option>
  <option>马甲号管理</option>
</select>
```

- [ ] **Step 3: 验证内容列表跳转日志**

点击某条内容的“操作记录”后，操作记录页激活，`#audit-object` 自动填入内容 ID，并只展示匹配记录；无匹配记录时展示空状态而不是报错。

### Task 7: 更新浏览器测试并完成验收

**Files:**
- Modify: `scripts/check-community-ops-browser.mjs`
- Modify: `scripts/check-community-ops-demo.mjs`
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 更新首屏断言**

断言：

```js
assert(!document.getElementById('page-drafts'), 'Draft page still exists');
assert(!document.getElementById('page-risk'), 'Risk page still exists');
assert(!document.getElementById('acting-identity-bar'), 'Global identity bar still exists');
```

- [ ] **Step 2: 更新发布闭环测试**

真实浏览器流程固定为：

1. 点击“发布文章”。
2. 确认编辑器已打开且尚未选择马甲号。
3. 填写标题、正文和分区。
4. 直接提交，断言出现马甲号校验错误。
5. 打开编辑器内马甲号选择器并选择 `10008621`。
6. 再次提交，确认新记录状态为 `reviewing`。
7. 从内容列表复制该内容，断言标题包含“（副本）”。
8. 提交复制内容，断言生成不同 ID 且互动数据为 0。

- [ ] **Step 3: 覆盖三种内容类型和马甲号页事件**

测试图文、文章、视频三个入口打开后的 `editorContentType`；测试四个列表 Tab；测试“使用该身份发布”预选正确 UID；测试停用账号按钮不可用；测试创建、编辑、启停和导入后的页面反馈。

- [ ] **Step 4: 运行全部检查**

Run:

```powershell
node scripts/check-community-ops-demo.mjs
node scripts/check-community-ops-browser.mjs
```

Expected:

```text
PASS: community operations structure validated
PASS: browser flow validated inline vest selection, three content types, copy, vest management and audit log
```

- [ ] **Step 5: 检查改动边界并提交**

Run:

```powershell
git status --short -- 'demos/社区/社区文章与马甲号运营后台demo.html' 'scripts/check-community-ops-demo.mjs' 'scripts/check-community-ops-browser.mjs' 'docs/superpowers/plans/2026-07-20-community-ops-demo-interaction-refinement.md'
```

Expected: 只显示上述四个文件；原 `demos/社区/社区后台demo.html` 无修改。

Commit:

```powershell
git add -- 'demos/社区/社区文章与马甲号运营后台demo.html' 'scripts/check-community-ops-demo.mjs' 'scripts/check-community-ops-browser.mjs' 'docs/superpowers/plans/2026-07-20-community-ops-demo-interaction-refinement.md'
git commit -m "feat: streamline community operations demo flow"
```

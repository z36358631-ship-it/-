# Community Article and Vest Account Admin Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于现有社区后台，新建一个可直接打开、以运营后台为主的社区文章发布与马甲号运营交互 Demo。

**Architecture:** 复制现有单文件后台作为视觉和公共组件基线，在新文件中增量加入身份上下文、内容发布工作台、草稿、马甲号、审计和风险模块。所有数据保存在页面内 JavaScript 状态对象中，使用 DOM 更新模拟业务闭环，不改动原 Demo，也不依赖服务端。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、现有 Font Awesome CDN、PowerShell/Node.js 静态验证。

---

## 文件结构

- Create: `demos/社区/社区文章与马甲号运营后台demo.html`：唯一交付 Demo，包含结构、样式、模拟数据和交互逻辑。
- Create: `scripts/check-community-ops-demo.mjs`：读取 HTML，检查页面、核心按钮、函数和脚本语法。
- Reference only: `demos/社区/社区后台demo.html`：现有视觉及公共交互基线，不修改。
- Reference only: `docs/superpowers/specs/2026-07-20-community-article-vest-admin-demo-design.md`：范围、页面和验收标准。

### Task 1: 建立新 Demo 基线和运营导航

**Files:**
- Create: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 复制原 Demo 为新文件**

Run:

```powershell
Copy-Item -LiteralPath 'demos\社区\社区后台demo.html' -Destination 'demos\社区\社区文章与马甲号运营后台demo.html'
```

Expected: 新文件存在，原文件哈希不变。

- [ ] **Step 2: 调整文档标题和侧栏入口**

在新文件中将页面标题改为“盖世游戏 - 社区内容运营中心”，并在国内社区菜单加入以下入口：

```html
<div class="menu-item" onclick="switchMenu('official-post', this, '国内')">
  <i class="fas fa-pen-nib"></i><span>内容发布</span>
</div>
<div class="menu-item" onclick="switchMenu('drafts', this, '国内')">
  <i class="fas fa-file-alt"></i><span>草稿箱</span>
</div>
<div class="menu-item" onclick="switchMenu('vest-account', this, '国内')">
  <i class="fas fa-user-secret"></i><span>马甲号管理</span>
</div>
<div class="menu-item" onclick="switchMenu('risk', this, '国内')">
  <i class="fas fa-shield-alt"></i><span>风险事件</span>
</div>
```

将 `switchMenu` 标题映射增加：

```js
'drafts': '草稿箱',
'vest-account': '马甲号管理',
'risk': '风险事件'
```

- [ ] **Step 3: 增加页面占位容器并验证切换**

```html
<div class="page" id="page-drafts"></div>
<div class="page" id="page-vest-account"></div>
<div class="page" id="page-risk"></div>
```

Run:

```powershell
rg -n "page-(official-post|drafts|vest-account|risk)" 'demos\社区\社区文章与马甲号运营后台demo.html'
```

Expected: 四个页面 ID 均至少出现一次。

### Task 2: 建立马甲号身份上下文

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 添加顶部当前身份栏**

在主内容顶部增加 `#acting-identity-bar`，其默认结构为：

```html
<div class="acting-identity-bar" id="acting-identity-bar">
  <div class="identity-empty" id="identity-empty">
    <i class="fas fa-user-secret"></i>
    <span>当前未选择代操作身份</span>
    <button class="btn btn-primary" onclick="openIdentityPicker()">选择马甲号</button>
  </div>
  <div class="identity-current hidden" id="identity-current"></div>
</div>
```

- [ ] **Step 2: 定义统一身份数据和渲染函数**

```js
const vestAccounts = [
  { uid: '10008621', nickname: '盖世攻略君', mark: '攻略内容', status: 'active', visible: true, avatar: '攻' },
  { uid: '10008635', nickname: '新游情报站', mark: '新游资讯', status: 'active', visible: true, avatar: '新' },
  { uid: '10008702', nickname: '盖世福利酱', mark: '活动福利', status: 'disabled', visible: true, avatar: '福', disabledReason: '账号资料待复核' }
];
let currentVestUid = null;

function getCurrentVest() {
  return vestAccounts.find(item => item.uid === currentVestUid) || null;
}

function selectVest(uid) {
  const account = vestAccounts.find(item => item.uid === uid);
  if (!account || account.status !== 'active') {
    showToast('该马甲号已停用，无法切换');
    return;
  }
  currentVestUid = uid;
  renderActingIdentity();
  closeModal('identity-picker-modal');
  showToast(`已切换为 ${account.nickname}`);
}

function clearVestIdentity() {
  currentVestUid = null;
  renderActingIdentity();
  showToast('已退出代操作身份');
}
```

- [ ] **Step 3: 添加身份选择弹窗和搜索**

实现 `openIdentityPicker()`、`filterIdentityList(keyword)` 和 `renderIdentityOptions(list)`。停用账号按钮必须禁用并显示停用原因；启用账号点击后调用 `selectVest(uid)`。

- [ ] **Step 4: 验证身份限制**

在发布入口统一调用：

```js
function requireVestIdentity(nextAction) {
  if (!getCurrentVest()) {
    showToast('请先选择马甲号');
    openIdentityPicker();
    return false;
  }
  if (typeof nextAction === 'function') nextAction();
  return true;
}
```

Expected: 未选身份时不能进入文章编辑，选中启用身份后顶部、编辑作者和提交确认信息一致。

### Task 3: 重构内容发布列表和文章编辑工作台

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 替换内容发布页为文章运营列表**

列表数据使用：

```js
const articleRows = [
  { id: 'ART20260720001', title: '本周值得体验的 5 款合作游戏', author: '盖世攻略君', section: '游戏推荐', topic: '#多人联机', status: 'published', views: 12860, likes: 426, comments: 87, updatedAt: '2026-07-20 10:32' },
  { id: 'ART20260720002', title: '新游测试资格领取指南', author: '新游情报站', section: '新游资讯', topic: '#测试招募', status: 'reviewing', views: 0, likes: 0, comments: 0, updatedAt: '2026-07-20 11:08' },
  { id: 'ART20260719018', title: '周末组队福利活动说明', author: '盖世福利酱', section: '活动中心', topic: '#周末福利', status: 'rejected', views: 0, likes: 0, comments: 0, updatedAt: '2026-07-19 18:42', rejectReason: '活动规则中的时间描述不完整，请补充活动时区。' }
];
```

页面需包含内容类型按钮、筛选区、状态统计卡和文章表格。`预览`、`编辑`、`查看审核`按钮均可打开对应弹窗或工作台。

- [ ] **Step 2: 添加双栏文章工作台**

工作台根节点使用 `#article-editor-workspace`，左侧包含 `#article-title`、`#article-body`、分区、话题、封面和游戏卡片；右侧使用 `#phone-preview`。

工具栏按钮必须通过 `execEditorCommand(command)` 改变选区样式，图片、链接和游戏卡片按钮打开模拟选择弹窗。

- [ ] **Step 3: 实现实时预览**

```js
function syncArticlePreview() {
  const vest = getCurrentVest();
  document.getElementById('preview-author-name').textContent = vest ? vest.nickname : '未选择身份';
  document.getElementById('preview-title').textContent = document.getElementById('article-title').value || '请输入文章标题';
  document.getElementById('preview-body').innerHTML = document.getElementById('article-body').innerHTML || '<p class="preview-placeholder">正文内容将在这里实时显示</p>';
  document.getElementById('preview-topic').textContent = document.getElementById('article-topic').value || '#选择话题';
  renderPreviewGameCards();
}
```

标题、正文、话题和游戏卡片变化时调用 `syncArticlePreview()`；“刷新预览”按钮也调用该函数并显示 Toast。

- [ ] **Step 4: 实现自动保存、离开保护和提交校验**

```js
function validateArticle() {
  const errors = [];
  if (!getCurrentVest()) errors.push({ field: 'identity', message: '请选择发布身份' });
  if (!document.getElementById('article-title').value.trim()) errors.push({ field: 'article-title', message: '请输入文章标题' });
  if (!document.getElementById('article-body').innerText.trim()) errors.push({ field: 'article-body', message: '请输入文章正文' });
  if (!document.getElementById('article-section').value) errors.push({ field: 'article-section', message: '请选择内容分区' });
  return errors;
}
```

输入后将状态改为“保存中”，600ms 后显示“已自动保存 HH:mm:ss”。点击保存草稿写入 `draftRows`。点击提交审核时先渲染字段错误；无错误时打开确认弹窗，确认后向 `articleRows` 增加 `reviewing` 记录并写入审计日志。

- [ ] **Step 5: 验证主流程**

Expected: 选择身份 → 进入编辑 → 输入内容 → 预览同步 → 保存草稿 → 提交审核 → 返回列表看到“审核中”记录。

### Task 4: 实现草稿箱和马甲号管理

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 添加草稿数据和列表渲染**

```js
const draftRows = [
  { id: 'DRF20260720008', title: '暑期多人游戏推荐', source: '自动保存', authorUid: '10008621', operator: '李明', updatedAt: '2026-07-20 11:26' },
  { id: 'DRF20260719003', title: '七月新游盘点', source: '手动保存', authorUid: '10008635', operator: '王璐', updatedAt: '2026-07-19 16:40' }
];
```

实现标题、创建人、马甲号和更新时间筛选；继续编辑回填工作台；复制草稿生成新 ID；删除草稿先二次确认再更新数组。

- [ ] **Step 2: 实现马甲号统计、筛选和表格**

渲染总账号数、启用数、停用数和今日代操作次数。表格必须展示头像、昵称、UID、内部标识、备注、前台可见、状态、最近使用和操作按钮。

- [ ] **Step 3: 实现创建、编辑、启停和删除**

`saveVestAccount()` 校验昵称和内部标识；新建时生成唯一 UID；编辑时 UID 只读。停用当前身份后必须同步退出身份。删除使用二次确认，已被文章引用的账号改为阻止删除并提示停用。

- [ ] **Step 4: 实现批量导入模拟**

选择 `.csv` 或 `.xlsx` 后显示进度，再展示：成功 6 条、重复 UID 1 条、缺少昵称 1 条、格式错误 1 条。导入结果仅影响账号管理，不出现任何批量互动入口。

### Task 5: 扩展操作记录并增加风险事件

**Files:**
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 定义审计日志数据**

```js
const auditRows = [
  { time: '2026-07-20 11:08:21', operator: '李明', vestUid: '10008635', module: '内容发布', action: '提交审核', objectId: 'ART20260720002', result: '成功', requestId: 'req_0720_a81d', before: null, after: { status: 'reviewing' } },
  { time: '2026-07-20 10:43:06', operator: '王璐', vestUid: '10008702', module: '身份切换', action: '切换马甲号', objectId: '10008702', result: '失败', requestId: 'req_0720_f39b', failureReason: '目标马甲号已停用' }
];
```

筛选真实操作人、马甲号 UID、模块、动作、结果、对象 ID 和时间。详情抽屉以格式化 JSON 展示 before/after，并展示 request_id 和失败原因。

- [ ] **Step 2: 实现风险统计和事件列表**

风险事件至少包含停用账号发布、频繁切换身份、连续发布失败和越权编辑四类。操作按钮支持查看详情、添加备注和标记已处理，并同步更新待处理统计。

- [ ] **Step 3: 将关键动作写入审计日志**

选择身份、退出身份、保存草稿、提交审核、启停马甲号、删除草稿和处理风险事件均调用：

```js
function appendAuditLog(entry) {
  auditRows.unshift({
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
    operator: '李明',
    vestUid: currentVestUid || '-',
    requestId: `req_${Date.now().toString(36)}`,
    ...entry
  });
  renderAuditTable();
}
```

### Task 6: 增加静态检查并完成验收

**Files:**
- Create: `scripts/check-community-ops-demo.mjs`
- Modify: `demos/社区/社区文章与马甲号运营后台demo.html`

- [ ] **Step 1: 编写失败的结构检查**

```js
import fs from 'node:fs';
import vm from 'node:vm';

const file = 'demos/社区/社区文章与马甲号运营后台demo.html';
const html = fs.readFileSync(file, 'utf8');
const required = [
  'page-official-post', 'page-drafts', 'page-vest-account', 'page-log', 'page-risk',
  'acting-identity-bar', 'article-editor-workspace', 'phone-preview',
  'openIdentityPicker', 'selectVest', 'validateArticle', 'syncArticlePreview',
  'saveDraft', 'submitArticle', 'renderVestTable', 'renderAuditTable'
];

for (const token of required) {
  if (!html.includes(token)) throw new Error(`Missing required token: ${token}`);
}

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
for (const [index, source] of scripts.entries()) {
  new vm.Script(source, { filename: `${file}#script-${index + 1}` });
}

console.log(`PASS: ${required.length} required tokens and ${scripts.length} inline scripts validated`);
```

- [ ] **Step 2: 运行检查并修复失败项**

Run:

```powershell
node scripts/check-community-ops-demo.mjs
```

Expected: `PASS: 16 required tokens and 1 inline scripts validated`，脚本数量以实际输出为准但不得为 0。

- [ ] **Step 3: 检查原文件未变化**

Run:

```powershell
git status --short -- 'demos/社区/社区后台demo.html' 'demos/社区/社区文章与马甲号运营后台demo.html' 'scripts/check-community-ops-demo.mjs'
```

Expected: 原文件无新增修改标记；只显示新 Demo 和检查脚本。

- [ ] **Step 4: 手动浏览器验收**

依次验证：

1. 左侧五个目标模块均可进入。
2. 未选身份时发布被拦截。
3. 启用身份可选，停用身份不可选。
4. 编辑字段可同步到手机预览。
5. 保存草稿和提交审核会更新列表与 Toast。
6. 马甲号增删改、启停和批量导入弹窗可操作。
7. 操作记录筛选和详情抽屉可操作。
8. 风险事件可标记处理并更新统计。
9. 浏览器控制台无 JavaScript 错误。

- [ ] **Step 5: 提交本次实现**

```powershell
git add -- 'demos/社区/社区文章与马甲号运营后台demo.html' 'scripts/check-community-ops-demo.mjs' 'docs/superpowers/plans/2026-07-20-community-article-vest-admin-demo.md'
git commit -m "feat: add community content operations demo"
```

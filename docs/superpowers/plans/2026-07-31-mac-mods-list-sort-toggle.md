# Mac MODS 列表、排序与启用开关 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 更新 Mac MODS Demo 与 PRD，使排序、卡片信息、详情元数据和设备级启用开关符合用户确认口径。

**Architecture:** 保留单文件 HTML 的既有状态机和渲染结构，在 MOD 数据中补齐趋势与发布时间，在派生层集中排序，在卡片和详情层复用同一个开关渲染函数。启用值仍由设备级 `enabled_value` 驱动，事件层隔离开关与整卡点击。

**Tech Stack:** HTML、CSS、原生 JavaScript、Markdown、Next.js Sites 包装层、Node.js 静态校验

---

### Task 1: 更新 Demo 数据合同与排序

**Files:**
- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`

- [ ] **Step 1: 给每个 MOD 补齐趋势与发布时间**

```javascript
trend_growth_24h: 38.6,
published_at: '2026-07-29T16:20:00.000Z',
```

- [ ] **Step 2: 把浏览排序收敛为三个稳定比较器**

```javascript
const browseComparators = {
  trend: (a, b) =>
    (b.trend_growth_24h ?? 0) - (a.trend_growth_24h ?? 0)
    || (b.download_count ?? 0) - (a.download_count ?? 0)
    || (b.published_at || '').localeCompare(a.published_at || '')
    || a.mod_id.localeCompare(b.mod_id),
  downloads: (a, b) =>
    (b.download_count ?? 0) - (a.download_count ?? 0)
    || (b.published_at || '').localeCompare(a.published_at || '')
    || a.mod_id.localeCompare(b.mod_id),
  published: (a, b) =>
    (b.published_at || '').localeCompare(a.published_at || '')
    || (b.download_count ?? 0) - (a.download_count ?? 0)
    || a.mod_id.localeCompare(b.mod_id)
};
```

- [ ] **Step 3: 更新默认值和排序控件**

```javascript
browseSort: 'trend'
```

```javascript
[
  ['trend', '热门趋势'],
  ['downloads', '下载量'],
  ['published', '最新发布']
]
```

- [ ] **Step 4: 运行静态排序断言**

Run:

```powershell
node tools/verify-mods-demo.mjs
```

Expected: 输出 `PASS: sort options = trend, downloads, published; default = trend`。

### Task 2: 更新卡片和详情信息层级

**Files:**
- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`

- [ ] **Step 1: 更新入口与浏览页文案**

```html
<span class="mods-subtitle">热门组件</span>
```

删除 `.mods-source-badge` 节点和浏览页 `data-catalog-summary` 文案节点，保留“仅此设备”设备边界。

- [ ] **Step 2: 把详情摘要改为标题下单行元数据**

```html
<p class="detail-title-meta">
  <span>作者 ${escapeHtml(mod.author)}</span>
  <span>${formatDownloads(mod.download_count)} 次下载</span>
  <span>${escapeHtml(mod.file_size)}</span>
</p>
```

删除 `detail-metrics` 宫格、兼容性展示和最新版本展示。

- [ ] **Step 3: 调整 CSS**

```css
.detail-title-block {
  min-width: 0;
}

.detail-title-meta {
  margin-top: 8px;
  display: flex;
  gap: 34px;
  color: #8f8d94;
  font-size: 18px;
}
```

- [ ] **Step 4: 运行文案与 DOM 断言**

Run:

```powershell
node tools/verify-mods-demo.mjs
```

Expected: 输出 `PASS: copy and detail metadata`，且无“共 128 个，当前加载”“非官方”徽标、“最新版本”“兼容性”展示。

### Task 3: 增加三处同步启用开关

**Files:**
- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`

- [ ] **Step 1: 创建复用开关渲染函数**

```javascript
function renderEnabledSwitch(mod, context) {
  const enabled = mod.enabled_value === 'enabled';
  return `
    <label class="enabled-switch" data-switch-context="${context}">
      <span>${enabled ? '已启用' : '未启用'}</span>
      <button type="button"
        role="switch"
        aria-checked="${enabled}"
        data-action="toggle-enabled"
        data-mod-id="${mod.mod_id}">
        <i></i>
      </button>
    </label>`;
}
```

- [ ] **Step 2: 在浏览已安装卡和已安装 Tab 卡片中渲染开关**

```javascript
const installedControls = installed
  ? `<div class="card-installed-controls">
       <span class="installed-pill">${icon('box', 'small')}已安装</span>
       ${renderEnabledSwitch(mod, viewModel.activeTab)}
     </div>`
  : '';
```

- [ ] **Step 3: 在详情底部渲染同一开关**

```javascript
<div class="detail-enabled-control">
  ${renderEnabledSwitch(mod, 'detail')}
</div>
```

- [ ] **Step 4: 隔离开关点击并增加回滚事件**

```javascript
if (action === 'toggle-enabled') {
  event.stopPropagation();
  const mod = state.mods[modId];
  const previousValue = mod.enabled_value;
  dispatch({
    type: 'ENABLE_CHANGED',
    modId,
    value: previousValue === 'enabled' ? 'disabled' : 'enabled'
  });
}
```

```javascript
case 'ENABLE_CHANGE_FAILED':
  if (!mod || mod.installation_fact !== 'installed') return next;
  mod.enabled_value = action.previousValue;
  return next;
```

- [ ] **Step 5: 运行状态同步与点击隔离断言**

Run:

```powershell
node tools/verify-mods-demo.mjs
```

Expected: 输出 `PASS: enabled switches synchronized and isolated`。

### Task 4: 同步两份 PRD

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》DST本地MODS跨平台需求.md`
- Modify: `prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md`

- [ ] **Step 1: 更新 Mac 入口、浏览、已安装和详情页面规则**

```markdown
排序仅显示“热门趋势、下载量、最新发布”，默认“热门趋势”。热门趋势按近 24 小时激增百分比降序。
```

- [ ] **Step 2: 更新数据字段和状态规则**

```markdown
详情标题下单行显示作者、下载量、文件大小；不展示兼容性和最新版本。浏览已安装卡、已安装 Tab 和详情使用同一设备级启用开关。
```

- [ ] **Step 3: 增加验收标准**

```markdown
三处开关状态一致；开关点击不进入详情；写入失败恢复操作前值并提示；排序严格为三项且默认热门趋势。
```

- [ ] **Step 4: 运行 PRD 关键词校验**

Run:

```powershell
rg -n "热门趋势|最新发布|作者、下载量、文件大小|启用开关|写入失败" "prd/ai生成/【Prd】《盖世游戏》DST本地MODS跨平台需求.md" "prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md"
```

Expected: 两份 PRD 都命中全部新增规则。

### Task 5: 视觉验证、提交与发布

**Files:**
- Modify: `sites/mods-mac-demo/public/Mod功能Mac端demo.html`（由复制脚本生成）
- Modify: `.openai/hosting.json`（仅当构建脚本需要规范化）

- [ ] **Step 1: 复制 Demo 并构建 Sites**

Run:

```powershell
npm --prefix sites/mods-mac-demo run build
```

Expected: 构建成功，站点产物包含最新 Demo。

- [ ] **Step 2: 截图检查浏览、已安装和详情**

Run:

```powershell
node tools/capture-mods-demo.mjs
```

Expected: 生成浏览、已安装、详情三张截图，无布局遮挡或误点击。

- [ ] **Step 3: 提交并推送**

Run:

```powershell
git add demos prd docs sites .openai
git commit -m "refine(mods): simplify sorting and add enable switches"
git push
```

Expected: 远端分支包含当前 `HEAD`。

- [ ] **Step 4: 保存并部署 Sites 新版本**

使用 `.openai/hosting.json` 中的既有 `project_id`，以当前已推送 `HEAD` 保存版本并部署该版本。

Expected: 原在线地址更新为本轮内容，部署状态为成功。

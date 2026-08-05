# Onboarding Copy and User Source Dictionary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 更新新手引流欢迎文案与选游戏按钮，并在同一 Demo 中补齐“系统配置 → 字典管理 → 用户来源”的完整后台配置流程。

**Architecture:** 保留现有单文件 HTML 结构，在用户端原节点上做定点修改；运营后台沿用现有侧边栏和内容区，增加来源分析/字典管理两个内部视图及弹窗层。字典数据仅用于 Demo 内交互，使用内存状态维护并由统一渲染函数更新列表。

**Tech Stack:** 单文件 HTML、CSS、Vanilla JavaScript、Markdown PRD、Playwright 验证脚本。

---

### Task 1: 更新欢迎文案与选游戏按钮

**Files:**
- Modify: `demos/新手引导完整链路demo.html`

- [ ] **Step 1: 修改欢迎页中英文文案和平台特色**

中文固定为：

```html
<h1 id="welcomeTitle">为了您的绝佳体验</h1>
<p id="welcomeDesc">请与我们分享您的游玩经验～</p>
```

中文平台特色第一条固定为：

```html
<div class="gh-feature-item">&#x1F3AE; 与 Steam、Epic 数据互通，海量大作应有尽有</div>
```

`applyRegionPresentation()` 中同步使用：

```js
document.getElementById('welcomeTitle').textContent='为了您的绝佳体验';
document.getElementById('welcomeDesc').textContent='请与我们分享您的游玩经验～';
featureItems[0].innerHTML='&#x1F3AE; 与 Steam、Epic 数据互通，海量大作应有尽有';
```

海外版使用：

```js
document.getElementById('welcomeTitle').textContent='For Your Best Experience';
document.getElementById('welcomeDesc').textContent='Tell us about your gaming experience.';
featureItems[0].innerHTML='&#x1F3AE; Sync your data with Steam and Epic and access more PC games';
```

- [ ] **Step 2: 修改非新用户选游戏规则**

静态按钮改为：

```html
<button type="button" class="existing-primary" data-action="submit-existing-games" disabled>选好了</button>
```

渲染和提交规则改为：

```js
submit.disabled=existingFlow.selectedGames.length===0;
submit.textContent='选好了';

function submitExistingGames(){
  if(existingFlow.selectedGames.length===0||existingFlow.selectedGames.length>9) return;
  existingFlow.gameTerminal='submitted';
  saveExistingFlow();
  nextExistingStep();
}
```

页面说明改为“最多选择9款，我们会据此优化推荐内容。”。

- [ ] **Step 3: 执行静态检查**

Run:

```powershell
rg -n "为了您的绝佳体验|分享您的游玩经验|与 Steam、Epic 数据互通|submit.disabled=existingFlow.selectedGames.length===0|submit.textContent='选好了'" "demos/新手引导完整链路demo.html"
```

Expected: 五类修改均命中，文件中不再出现“选好了（0/9）”和“至少选择3款”。

### Task 2: 增加字典管理页面与弹窗结构

**Files:**
- Modify: `demos/新手引导完整链路demo.html`

- [ ] **Step 1: 扩展后台导航和内部视图**

在后台侧边栏保留“来源分析”，新增：

```html
<div class="admin-nav-label">系统配置</div>
<button type="button" class="admin-nav-item" data-admin-page="dictionary">字典管理</button>
```

现有来源分析内容包入 `data-admin-panel="analytics"`，新增 `data-admin-panel="dictionary"`，字典页包含：字典名称、字典编码、重置、查询、新建字典、字典列表。

- [ ] **Step 2: 增加字典列表和用户来源初始数据**

列表固定列：ID、字典名称、字典编码、字典描述、多语言、创建时间、更新时间、操作。初始字典：

```js
var dictionaryState={
  dictionaries:[{
    id:1001,
    name:'用户来源',
    code:'userSource',
    description:'新手引导用户来源选项',
    languageCount:2,
    createdAt:'2026-08-05 10:24:00',
    updatedAt:'2026-08-05 10:24:00'
  }],
  activeDictionaryId:1001,
  filters:{name:'',code:'',itemValue:''}
};
```

- [ ] **Step 3: 增加四类弹窗**

在后台壳体末尾增加统一遮罩 `#adminModalLayer`，支持以下弹窗：

1. 新建/编辑字典：字典名称、字典编码、字典描述、多语言参数、取消、确定。
2. 字典子项管理：子项值筛选、重置、查询、新建字典子项、子项列表。
3. 新建/编辑字典子项：子项名、子项值、字典项描述、排序、多语言参数、取消、确定。
4. 多语言配置：简体中文、English 输入，取消、确定。

所有必填项使用原生表单校验；重复编码或重复子项值显示字段内错误，不新增 Toast。

### Task 3: 实现字典 CRUD、多语言和筛选交互

**Files:**
- Modify: `demos/新手引导完整链路demo.html`

- [ ] **Step 1: 增加用户来源子项数据**

```js
var userSourceItems=[
  ['抖音','douyin','国内短视频平台',10,'抖音','Douyin'],
  ['哔哩哔哩','bilibili','国内视频社区',20,'哔哩哔哩','Bilibili'],
  ['小红书','xiaohongshu','国内内容社区',30,'小红书','Xiaohongshu'],
  ['应用商店','app_store','应用商店自然来源',40,'应用商店','App Store'],
  ['YouTube','youtube','海外视频平台',50,'YouTube','YouTube'],
  ['TikTok','tiktok','海外短视频平台',60,'TikTok','TikTok'],
  ['Reddit','reddit','海外社区',70,'Reddit','Reddit'],
  ['Discord','discord','海外社群',80,'Discord','Discord'],
  ['朋友推荐','friend_referral','好友推荐',90,'朋友推荐','Friends'],
  ['其他／不记得','other_or_unknown','其他或无法回忆',100,'其他／不记得','Other / I don’t remember']
].map(function(item,index){
  return {id:2001+index,name:item[0],value:item[1],description:item[2],sort:item[3],languageCount:2,zh:item[4],en:item[5],createdAt:'2026-08-05 10:24:00',updatedAt:'2026-08-05 10:24:00'};
});
```

- [ ] **Step 2: 实现页面切换和列表渲染**

新增 `switchAdminPage(page)`、`renderDictionaryTable()`、`renderDictionaryItems()`；导航只切换后台内部视图，不退出运营后台。字典筛选使用包含匹配，重置清空输入并立即刷新。

- [ ] **Step 3: 实现新增、编辑、删除和多语言保存**

新增 `openDictionaryEditor()`、`saveDictionary()`、`openDictionaryItems()`、`openDictionaryItemEditor()`、`saveDictionaryItem()`、`openLanguageEditor()`、`saveLanguages()`、`closeAdminModal()`。删除使用现有样式确认弹窗，确认后从内存数组删除并重绘；取消不改数据。

- [ ] **Step 4: 接入统一事件代理**

在现有 `document.addEventListener('click', ...)` 中处理 `data-admin-page`、`data-dictionary-action`、`data-item-action`、`data-modal-action`；后台表单 `submit` 阻止页面刷新并调用对应保存函数。

### Task 4: 同步 PRD

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md`

- [ ] **Step 1: 追加版本记录**

新增一行 2026-08-05 版本，说明欢迎页文案、选游戏按钮和用户来源字典配置。

- [ ] **Step 2: 更新 C 端规则**

将欢迎页中文文案记录为“为了您的绝佳体验／请与我们分享您的游玩经验～”；平台特色第一条记录为“与 Steam、Epic 数据互通，海量大作应有尽有”；非新用户选游戏改为 1～9 款可提交、按钮文案固定“选好了”。同步修改埋点说明和 AC-09。

- [ ] **Step 3: 增加 B 端字典管理描述**

在 4.3 中增加“系统配置 → 字典管理”，写明筛选区、列表字段、新建/编辑字典、字典子项管理、多语言配置、必填校验、重复值校验和删除反馈。

- [ ] **Step 4: 更新验收标准和自检记录**

增加字典查询、重置、CRUD、多语言保存及异常校验验收项；更新 C/B 端完整性和模拟评审结果，不删除历史版本记录。

### Task 5: 自动化验证

**Files:**
- Create: `tools/verify-onboarding-user-source-demo.mjs`

- [ ] **Step 1: 编写 Playwright 验证脚本**

脚本使用本地 `github/four-experiment-pilot/node_modules/playwright` 打开 Demo，验证：

1. 中文欢迎标题、说明和平台特色文案。
2. 非新用户 0 款禁用、选择 1 款启用且文案固定。
3. 运营后台可进入字典管理。
4. 用户来源字典存在，可打开子项列表和多语言弹窗。
5. 新建字典必填校验、取消不保存。

- [ ] **Step 2: 运行验证**

Run:

```powershell
node tools/verify-onboarding-user-source-demo.mjs
```

Expected: 输出 `PASS onboarding user source demo`，退出码为 0。

- [ ] **Step 3: 最终差异检查**

Run:

```powershell
git diff --check -- "demos/新手引导完整链路demo.html" "prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md" "tools/verify-onboarding-user-source-demo.mjs"
```

Expected: 无输出，退出码为 0。

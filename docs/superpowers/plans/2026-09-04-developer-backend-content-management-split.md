# Developer Backend Content Management Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将运营后台的企业认证内容与帮助中心拆为独立页面，补齐文章、导航目录和目录子文档的双语 CRUD、帮助中心排序及发布闭环。

**Architecture:** 保留现有单文件 HTML 构建链和 `managedContent` 发布存储，在应用启动时把旧版字段归一化为 `certificationArticles`、`helpNavigations`、`helpDocuments` 三类稳定对象。P01-09 渲染企业认证文章列表，P01-10 渲染帮助中心双 Tab；发布时再同步回开发者端读取的认证字段和帮助文章结构，保证已有公开页面不另建一套数据源。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node.js 构建脚本、Playwright Core、Node test、Markdown PRD、PowerShell 质量校验。

---

### Task 1: 先用浏览器测试冻结新信息架构

**Files:**
- Modify: `tests/developer-backend/prd01-current-scope.browser.test.mjs`

- [ ] **Step 1: 将路由断言改为五个业务路由**

断言值改为：

```js
['P01-01', 'P01-03', 'P01-08', 'P01-09', 'P01-10']
```

- [ ] **Step 2: 增加企业认证内容列表用例**

用例打开 `P01-09?role=operations`，断言存在文章位置“认证介绍、保密协议、合作协议”，存在搜索、新建、编辑、删除，不存在“帮助中心”二级 Tab和任何排序按钮；点击编辑后断言唯一编号只读、中文／English 可切换、正文为富文本。

- [ ] **Step 3: 增加帮助中心双 Tab 用例**

用例打开 `P01-10?role=operations`，断言“导航目录／目录子文档”两个 Tab；导航列表可搜索、新建、编辑、删除、上移、下移；子文档列表可搜索、按导航筛选、新建、编辑、删除和同导航排序。

- [ ] **Step 4: 增加数据约束用例**

测试创建导航和子文档后生成不同的 `HC-NAV-`、`HC-DOC-` 编号；删除仍有子文档的导航出现失败提示；删除子文档后导航可删除；切换中英文后创建内容仍保留。

- [ ] **Step 5: 增加移动端断言**

320px 和 390px 分别访问 P01-09、P01-10，断言根节点无横向溢出、列表变为卡片、两个帮助 Tab 完整可见、主要操作按钮可见。

- [ ] **Step 6: 运行测试确认旧实现失败**

Run:

```powershell
node --test "tests/developer-backend/prd01-current-scope.browser.test.mjs"
```

Expected: FAIL，至少报告 P01-10 未暴露、帮助中心独立入口不存在或新列表元素缺失。

### Task 2: 扩展第一份 Demo 路由与后台导航

**Files:**
- Modify: `demos/开发者后台一期/src/modules.json`
- Modify: `demos/开发者后台一期/src/routes.json`
- Modify: `demos/开发者后台一期/src/prd-page-map.json`
- Modify: `demos/开发者后台一期/src/runtime/shell.js`

- [ ] **Step 1: 第一模块加入 P01-10**

将第一模块 `routeIds` 改为：

```json
["P01-01", "P01-03", "P01-08", "P01-09", "P01-10"]
```

- [ ] **Step 2: 重命名运营路由**

P01-09 标题改为“企业认证内容配置”，P01-10 标题改为“帮助中心”，两者使用 T07 且角色均为 `operations`。

- [ ] **Step 3: 增加左侧独立入口**

运营侧导航固定为：

```js
[
  ['P01-08', 'vendor', '企业认证审核'],
  ['P01-09', 'file', '企业认证内容配置'],
  ['P01-10', 'info', '帮助中心'],
]
```

- [ ] **Step 4: 把两个内容配置路由都视为无上下文栏页面**

`renderPageHeader`、`isConfiguration` 和 `showContext` 同时覆盖 P01-09、P01-10，避免出现游戏上下文面包屑。

### Task 3: 归一化三类内容对象并保持旧数据兼容

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/app.js`

- [ ] **Step 1: 增加稳定 ID 生成器**

分别生成 `CERT-ARTICLE-`、`HC-NAV-`、`HC-DOC-` 前缀编号；扫描草稿与已发布数据后从未使用序号开始，删除后不在本次会话内复用。

- [ ] **Step 2: 增加旧数据归一化函数**

首次加载时从 `introTitle/introDescription`、`ndaTitle/ndaBody`、`distributionTitle/distributionBody` 生成三个认证文章；从帮助 FAQ 的分类生成导航，并按 FAQ 的 `id/category/question/body` 生成子文档。中文和 English 通过稳定 ID 合并。

- [ ] **Step 3: 初始化新的编辑状态**

`contentEditor` 包含：

```js
{
  language: 'zh',
  view: 'list',
  entity: '',
  helpTab: 'navigation',
  selectedId: '',
  search: '',
  navigationFilter: '',
  draft: normalizedManagedContent,
}
```

- [ ] **Step 4: 发布时同步公开字段**

发布前把认证文章映射回三个认证位置字段，把帮助导航和子文档按排序映射为中文／English `help.faq`；`navigationId` 和 `parentId` 使用稳定关系，公开帮助中心不依赖可变名称。

### Task 4: 实现企业认证文章列表与编辑

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/templates.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/styles/templates.css`

- [ ] **Step 1: 渲染企业认证文章列表**

列表显示文章标题／唯一编号、文章位置、双语状态、更新时间和操作；提供搜索和“新建文章”。页面不渲染排序按钮。

- [ ] **Step 2: 实现创建与编辑页**

创建时只允许选择尚未占用的位置并生成只读编号；编辑时位置只读。当前语言编辑标题与富文本正文，语言切换前收集输入。

- [ ] **Step 3: 实现删除确认**

删除前展示文章标题和位置，确认后从草稿删除并返回列表；取消不变更。三个位置缺失时发布校验阻止生效。

- [ ] **Step 4: 实现搜索与反馈**

按当前语言标题、另一语言标题或编号匹配；无结果显示空态。创建、保存、删除分别展示成功提示，三个位置已占满时展示可恢复提示。

### Task 5: 实现帮助中心导航目录与子文档

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/templates.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/runtime/shell.js`
- Modify: `demos/开发者后台一期/src/styles/templates.css`

- [ ] **Step 1: 渲染帮助中心二级 Tab**

“导航目录”和“目录子文档”保持同一路由 P01-10；切换 Tab 返回各自列表并保留当前语言。

- [ ] **Step 2: 实现导航 CRUD**

导航列表支持搜索、新建、编辑、删除、上移、下移；编辑页按当前语言配置名称并只读显示编号。删除前检查 `helpDocuments.navigationId`，被引用时提示阻止。

- [ ] **Step 3: 实现目录子文档 CRUD**

子文档列表支持标题／编号搜索和导航筛选；创建或编辑页包含所属导航、只读编号、当前语言标题与富文本正文。修改导航后把文档放到目标导航末尾。

- [ ] **Step 4: 实现同导航排序**

上移／下移只在同一 `navigationId` 的文档中交换 `sortOrder`；边界按钮禁用。导航排序使用相同规则但作用于全部导航。

- [ ] **Step 5: 更新公开帮助中心**

开发者侧按 `helpNavigations.sortOrder` 渲染分组、按同导航 `helpDocuments.sortOrder` 渲染文章；搜索与关键词高亮继续匹配双语标题和正文。

### Task 6: 完成双语原子发布与校验

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/app.js`

- [ ] **Step 1: 更新表单收集**

按 `entity + selectedId + language` 收集认证文章、导航或子文档字段，不再读取旧四内容 Tab 的路径。

- [ ] **Step 2: 更新校验函数**

校验三个认证位置唯一且齐全、导航双语名称、子文档有效导航关联、双语标题和正文；正文先经过既有 HTML 清理逻辑。

- [ ] **Step 3: 更新发布结果**

校验通过后保存规范化数据及公开字段，版本号加一；失败时定位到对象和语言，保留上一已发布版本。对外邮箱继续固定为 `dev@xiaoji.com`。

### Task 7: 响应式、构建与视觉证据

**Files:**
- Modify: `demos/开发者后台一期/src/styles/templates.css`
- Modify: `demos/开发者后台一期/src/styles/shell.css`
- Modify: `demos/开发者后台一期/README.md`
- Build: `demos/开发者后台一期/01-开发者平台与资料demo.html`
- Modify: `public/prd/genuine-game-distribution-phase1/developer-backend-final/01/P01-09-list.png`
- Create: `public/prd/genuine-game-distribution-phase1/developer-backend-final/01/P01-10-help-navigation.png`
- Create: `public/prd/genuine-game-distribution-phase1/developer-backend-final/01/P01-10-help-document.png`

- [ ] **Step 1: 完成桌面和手机布局**

桌面使用南京后台风格的卡片列表；760px 以下表格转卡片，操作可换行；420px 以下帮助中心二级 Tab 等宽两列，编辑器与按钮占满可用宽度。

- [ ] **Step 2: 重建单文件 Demo**

Run:

```powershell
node "demos/开发者后台一期/build.mjs"
```

Expected: 4 个单文件 HTML 构建成功，第一份含 5 个公开路由。

- [ ] **Step 3: 运行聚焦浏览器测试并截图**

Run:

```powershell
$env:CAPTURE_PRD_ASSET='1'
node --test "tests/developer-backend/prd01-current-scope.browser.test.mjs"
Remove-Item Env:CAPTURE_PRD_ASSET
```

Expected: 全部 PASS，并生成 P01-09、P01-10 桌面截图。

- [ ] **Step 4: 复核 320px 与 390px 实图**

人工确认无根节点横向溢出、当前入口与二级 Tab 完整可见、卡片内容不重叠、富文本工具栏可换行。

### Task 8: 同步 PRD、状态卡和工作流

**Files:**
- Modify: `prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md`
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.md`
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.run.json`

- [ ] **Step 1: PRD 追加修订记录**

正文以最终规则替换旧“同页四 Tab／父子文档树”描述：P01-09 为企业认证文章列表，P01-10 为帮助中心双 Tab，并明确企业认证内容不排序。

- [ ] **Step 2: 更新页面六要素和原型索引**

分别补齐两页的展示、交互、成功、失败、恢复、删除引用约束、双语原子发布和移动端表现；Demo 详细设计仍在简介下一行和 6.2 索引保留同一固定预览地址。

- [ ] **Step 3: 运行 PRD 质量校验**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-prd-quality.ps1 -Path "prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md"
```

Expected: PASS，0 error／0 warning。

- [ ] **Step 4: 回写决定与证据**

新增 D-026，记录两个独立后台入口、帮助双 Tab、帮助排序、认证内容不排序、稳定 ID 和双语配置；工作流 S5～S8 依次以新产物和验证证据通过。

### Task 9: 精确提交、公开发布与远程校验

**Files:**
- Modify: 上述本轮文件，不包含工作区其他改动

- [ ] **Step 1: 检查差异**

Run:

```powershell
git diff --check -- "demos/开发者后台一期" "tests/developer-backend/prd01-current-scope.browser.test.mjs" "prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md" "public/prd/genuine-game-distribution-phase1/developer-backend-final/01" "prd/workflow-state/LOCAL-20260901-developer-backend-prd.md" "prd/workflow-state/LOCAL-20260901-developer-backend-prd.run.json"
```

Expected: 无输出。

- [ ] **Step 2: 精确暂存并提交**

只使用逐路径 `git add -- <path>`，禁止 `git add .`；提交信息使用 `feat: split certification and help content management`。

- [ ] **Step 3: 发布固定 Git SHA**

沿用已授权的独立分支发布方式；原生 push 超时时使用 GitHub Git Data API，只发布本轮精确文件。记录 40 位提交 SHA。

- [ ] **Step 4: 回写 PRD 固定地址并再次发布**

把 PRD 中第一份 Demo 地址和全部本轮图片地址替换为新固定 SHA，再精确提交和发布；不使用浮动分支地址。

- [ ] **Step 5: 验证远程资源**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-prd-images.ps1 -PrdPath "prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md" -VerifyRemote
```

Expected: 全部图片 HTTP 200 且 MIME 为图片；再用浏览器验证 HTML Preview 标题、五路由、P01-09、P01-10 和控制台错误为 0。飞书真实图片转存继续如实标记为未验证。


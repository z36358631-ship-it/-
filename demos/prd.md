# PC引擎设置页面需求文档

---

[1] ## 页面标题与进入状态（主页面 Header 区域）

**背景**：用户反馈改动过大，不知道在哪里找到本机设置，因此调整为默认直接展示本机设置。

**页面标题**

修改为 **「PC引擎设置」**（原为「PC配置方案」）。

**默认进入状态**

- 打开页面时**默认直接展示本机设置内容**
- **移除**顶部「云端方案库 / 本机设置」Segmented Control，不再需要两步才能找到本机设置

**「推荐」按钮**

- 位于 Header **右上角**，样式：蓝色半透明背景 `rgba(78,115,255,0.15)`，`#4e73ff` 文字色，蓝色描边
- 点击调用 `openRecommendPage()`，以 `z-index: 550` 全屏覆盖层形式打开推荐方案页
- 按钮与「切换布局」按钮分离——切换布局按钮已移至容器外（见需求 [2]）

---

[2] ## 切换布局按钮（容器外定位）

**定位变更**

- **原位置：** Header 内右侧 icon-btn
- **新位置：** `.device-frame` 容器**外部**，`<body>` 层级，`position: fixed`

**CSS 定位**

`position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 9999`

始终悬浮在设备模拟框顶部居中，不随页面内容滚动。

**交互**

- 点击触发 `toggleLayout()`
- 切换 `.device-frame` 的 `.portrait` class（横 **896×414px** ↔ 竖 **414×850px**）
- 切换后立即调用 `renderMainContent()` 重新渲染内容区（横竖版分别走不同渲染路径）

---

[3] ## 推荐方案页 Header（全屏页头部导航）

**布局调整（左对齐）**

- ~~原设计：标题居中 + 右上角 ✕ 关闭按钮~~
- **新设计：** 左侧箭头返回按钮 + 标题「推荐方案」左对齐，与 App 内其他全屏页保持一致

> 背景：用户反馈居中标题 + ✕ 关闭的方案与 App 内其他全屏页交互不一致，统一改为左对齐箭头返回。

**返回按钮**

- 样式使用 `.back-btn` class，含 SVG 左箭头图标
- 按钮文字即为页面标题 **「推荐方案」**（图标 + 文字一体，左对齐）
- 点击调用 `closeFullPage('recommend-page')`，关闭全屏层，回到本机设置主页

**状态保留**

关闭后不重置 `currentRecTab` 状态，重新打开时恢复上次 Tab 位置（保持连续性）。

---

[4] ## 推荐方案页 Tabs 与卡片内容

**Tab 列表（共 3 项，按顺序）**

1. **推荐** (`currentRecTab = 'recommend'`) — 默认激活，`#rec-search-area` 搜索框显示
2. **我的方案** (`currentRecTab = 'mine'`) — 搜索框隐藏
3. **我的云分享** (`currentRecTab = 'cloud'`) — 搜索框隐藏

~~官方推荐 Tab 已移除~~（`listData.official` 数据保留但不在任何 Tab 中展示）

**搜索框显示逻辑**

`switchRecTab()` 执行时：`tab === 'recommend'` → `display: block`，否则 `display: none`

> 当前为 UI 展示，搜索输入无过滤效果，功能未实现。

**卡片操作菜单（••• 按钮触发 `openActionModal()`）**

- 推荐 Tab：`['应用', '编辑', '复制', '分享']`
- 我的方案 / 我的云分享 Tab：`['应用', '编辑', '复制', '云分享', '删除']`

**底部悬浮操作栏（`#fab-rec-create`）**

- 「📥 导入配置」→ `openImportDialog()`
- 「➕ 创建方案」→ `openInputDialog('create', '')`

**异常与边界**

- 删除后过滤 `listData[cat]` 并调用 `renderRecContent()` 刷新列表
- 复制后新增至 `listData.mine`，自动切换至「我的方案」Tab 并刷新

---

[5] ## 本机设置内容区（竖版与横版布局）

~~「💡 以下配置专属于您的设备，不会受他人分享方案影响」~~ 顶部提示文案已移除。

**竖版（portrait）布局**

- 渲染容器：`#main-content-area`（`display: block`）
- 遍历 `configData`，**跳过「兼容性」分类**
- 每分类只渲染 `share: false` 的本机设置项
- 若某分类下无本机项，该分类整体不渲染（不留空组）

**横版（landscape）布局**

- 渲染容器：`#landscape-layout`（`display: flex`），左右分栏

左侧导航 `#landscape-nav`（宽 **140px**）固定展示 4 个分类：

- **通用 / Steam / 开发者选项 / 触屏按键**
- 激活样式：左侧 3px 蓝色竖条 + `rgba(78,115,255,0.08)` 背景
- 状态变量：`currentLandscapeCat`（默认 `'通用'`）

右侧内容区 `#landscape-content`：

- 根据 `currentLandscapeCat` 从 `configData.find()` 匹配对应分类
- 渲染该分类下 `share: false` 的设置项
- 若无本机设置项，显示「暂无本机设置项」

**异常处理**

- `configData.find()` 未命中 → 右侧内容区静默不渲染，无报错
- `toggleLayout()` 切换时重新调用 `renderMainContent()` 完整刷新双区域

---

[6] ## 方案共享内容定义与推荐显示条件

**GPU 驱动移出分享配置**

- `gpu_drv`（GPU 驱动）的 `share` 字段由 `true` 改为 **`false`**
- 该项**不再出现**在方案详情页（只读态）和方案编辑页的可编辑字段中
- GPU 驱动属于本机硬件相关配置，不同设备驱动差异大，不适合跨设备共享

**方案详情页：副标题显示 GPU（处理器型号）**

- ~~原格式：`分享人：XX GPU：XX 下载次数: N`（GPU 显示固定文字 XX）~~
- **新格式：`分享人：XX GPU：[cpu字段] 下载次数: N`**
- GPU 即处理器型号，动态读取 `listData` 对应方案的 `cpu` 字段（如 Snapdragon 8 Gen 3）
- 若 `cpu` 字段为空，则不显示「GPU：」部分，直接显示下载次数
- 本地创建方案（`dl === 0`）显示「本地创建方案」，不显示分享人/GPU 信息

> GPU 与处理器是同一概念（移动端 SoC），如 Snapdragon 8 Gen 3 既是 CPU 也是 GPU。

**推荐方案显示条件变更**

- ~~原条件：同游戏 + 同 GPU 型号~~
- **新条件：仅同游戏（`item.game === currentGame`）**
- 过滤逻辑位于 `renderRecContent()`，仅作用于 `currentRecTab === 'recommend'` 时
- 我的方案 / 我的云分享 Tab **不受此过滤影响**，展示全量数据

**空态处理**

- 过滤后 `items.length === 0` → 显示「暂无该游戏的配置方案」
- 其他 Tab 无数据 → 显示「暂无配置方案」

**数据结构变更（`listData` 条目新增字段）**

- `game`：string，方案所属游戏名称（用于推荐过滤）
- `cpu`：string，分享者处理器型号（用于详情页展示）

# 个人中心、系统与掌机横屏页面配方

## R-15 我的

- Direction：竖屏。Shell：C-SHELL-P。
- Sections：用户头部、下载/设置快捷项、平台账号、社区 Banner、设备状态。
- Components：C-TOPBAR, C-SECTION, D-ACCOUNT-CARD, C-MENU, C-FEEDBACK。
- States：游客、已登录、平台未绑定/已绑定/同步失败、无设备。
- Interactions：登录、进入设置、绑定平台、打开账号更多菜单。
- Source refs：screen-30, figma-01 (`50732-8811`), figma-04 (`84199-3291`)。
- Conflict：低频切换/解绑折叠进 `…`；GOG 不展示账号价值及占位。
- Acceptance：主信息首屏可见，账号卡状态明确。

## R-16 设备中心

- Direction：竖屏。
- Sections：顶部栏、双列设备产品卡、空/绑定状态。
- Components：C-TOPBAR, C-SECTION, C-FEEDBACK。
- States：有设备、无设备、加载、失败。
- Interactions：查看设备、绑定/管理（仅现行业务存在时）。
- Source refs：screen-31。
- Conflict：不要从产品展示卡推断新增购买流程。
- Acceptance：双列卡对齐，图片与型号层级明确。

## R-17 设置与关于

- Direction：竖屏。
- Sections：标题栏、分组列表、当前值、协议/版本、退出。
- Components：C-TOPBAR, C-SECTION, C-BUTTON, C-DIALOG。
- States：默认、检查更新、退出确认。
- Interactions：进入二级项、检查更新、退出。
- Source refs：screen-32, screen-33, figma-11 (`63479-1834`) 仅作废弃反例。
- Conflict：不采用 figma-11 旧设置结构。
- Acceptance：分组清楚，危险操作与普通列表分开。

## R-18 下载管理

- Direction：竖屏；掌机需要时另排横屏。
- Sections：环境背景、下载列表或空态、控制项。
- Components：D-DOWNLOAD, C-FEEDBACK。
- States：空、等待、下载、暂停、完成、失败。
- Interactions：暂停、继续、重试、取消。
- Source refs：screen-34, figma-05 (`84642-3807`)。
- Conflict：screen-34 蓝紫环境背景仅限该场景，不成为全局背景。
- Acceptance：状态与操作一致，进度可读。

## R-19 模式切换

- Direction：竖屏选择态 + 目标方向结果态。
- Sections：底部选择 Sheet、探索模式/掌机模式单选、确认。
- Components：C-SHEET, C-BUTTON, C-SHELL-P, C-SHELL-L。
- States：当前竖屏、选择掌机、切回竖屏。
- Interactions：选择并确认；转入对应独立布局。
- Source refs：screen-35, screen-45。
- Conflict：screen-45 只证明切回后的首页，动画不在证据范围。
- Acceptance：不旋转页面；状态切换后使用对应 Shell。

## R-20 掌机首页

- Direction：横屏。Shell：C-SHELL-L。
- Sections：顶部导航/状态、双 Hero、推荐封面轨道、手柄提示。
- Components：C-NAV, C-SECTION, D-GAME-CARD。
- States：默认、焦点、加载。
- Interactions：切导航、横向移动、打开 Hero/游戏。
- Source refs：screen-36。
- Conflict：与 screen-08 共享内容语义但不共享页面排版。
- Acceptance：双 Hero 首屏稳定，焦点环不被裁切。

## R-21 掌机搜索与排行榜

- Direction：横屏。Shell：C-SHELL-L。
- Sections：搜索全宽输入 + 左热搜/右推荐；排行榜分类 + 双列排名。
- Components：C-INPUT, C-TAB-CHIP, D-SEARCH-RESULT, D-RANK-ROW。
- States：默认、输入、结果、分类、加载、空。
- Interactions：搜索、切 Tab/分类、打开游戏。
- Source refs：screen-42, screen-43。
- Conflict：修复 screen-42 右侧裁切。
- Acceptance：双面板/双列互不溢出，手柄焦点顺序自然。

## R-22 掌机游戏库

- Direction：横屏。Shell：C-SHELL-L。
- Sections：平台选择、游戏网格、选中详情摘要、视图按钮。
- Components：D-PLATFORM-ENTRY, D-GAME-CARD, C-FEEDBACK。
- States：未绑定、空、单游戏稀疏、多游戏、同步失败。
- Interactions：切平台、移动焦点、查看详情。
- Source refs：screen-41, figma-04 (`84199-3291`)。
- Conflict：不把单游戏后的留白固定为组件尺寸。
- Acceptance：数据增加时自动扩展网格，稀疏态有明确上下文。

## R-23 掌机沉浸式详情

- Direction：横屏。Shell：C-SHELL-L 沉浸变体。
- Sections：全幅 Hero、返回、标题与标签、秒玩/平台登录/更多、兼容性/存档/时长/评分。
- Components：D-DETAIL-HERO, D-ENGINE-META, C-BUTTON, C-MENU。
- States：默认、已拥有、未拥有、媒体加载、更多菜单。
- Interactions：启动、授权、更多、切信息焦点。
- Source refs：screen-44, figma-01 (`50732-8811`), figma-07 (`63884-1506`)。
- Conflict：本期只要求“获得游戏”中 Steam 旁增加 GOG 时，不扩张为 GOG 启动、云存档或时长。
- Acceptance：首屏信息可读，操作与能力严格对应。


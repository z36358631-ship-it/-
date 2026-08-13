# 新手、首页与发现页面配方

统一字段：`ID / Direction / Shell / Sections / Components / States / Interactions / Source refs / Conflict / Acceptance`。

## R-01 首次隐私政策

- Direction：竖屏。Shell：无底栏首启页。
- Sections：暗色环境背景、居中政策弹窗、协议链接、双按钮。
- Components：C-DIALOG, C-BUTTON。
- States：首次展示、打开协议、同意、不同意。
- Interactions：同意进入下一步；不同意遵循现行业务，不擅自新增退出说明。
- Source refs：screen-01。
- Conflict：实机结构优先，文本以最新法务版本为准。
- Acceptance：弹窗可聚焦、主次按钮明确、正文可滚动。

## R-02 新用户欢迎分流

- Direction：竖屏。Shell：无底栏新手流程。
- Sections：顶部跳过、游戏拼图 Hero、标题、两张玻璃选择卡、特色说明。
- Components：C-BUTTON, D-GAME-CARD。
- States：默认、选择触达、跳过。
- Interactions：选择“选游戏”或“导入/绑定”，不新增第三条路径。
- Source refs：screen-02, screen-04, figma-04 (`84199-3291`)。
- Conflict：screen-02/04 背景与 screen-03 不同，按流程阶段保留差异。
- Acceptance：主路径首屏可见，玻璃层不降低文字对比。

## R-03 新手选游戏

- Direction：竖屏。Shell：流程页顶部栏。
- Sections：返回、说明、单列游戏行、底部继续。
- Components：C-TOPBAR, D-GAME-CARD, C-BUTTON, C-FEEDBACK。
- States：未选择、已选择、加载、无结果。
- Interactions：选择/取消，满足规则后继续。
- Source refs：screen-03, figma-04 (`84199-3291`)。
- Conflict：实机图含即时反馈，但不要在每次选择时额外发明 Toast。
- Acceptance：状态不只依赖颜色，游戏列表可滚动。

## R-04 账号与平台登录

- Direction：竖屏。Shell：背景页 + 登录 Sheet。
- Sections：品牌/二维码、手机号或平台凭证、协议、主按钮、备用入口。
- Components：C-SHEET, C-INPUT, C-BUTTON, D-PLATFORM-ENTRY。
- States：默认、输入中、错误、提交、扫码等待。
- Interactions：登录、切换扫码、游客进入（仅盖世账号原流程）。
- Source refs：screen-05, screen-06。
- Conflict：screen-07 不是登录 Sheet，归入游戏库未绑定配方。
- Acceptance：敏感输入正确标记，错误就地显示，不用空白或 0 代替。

## R-05 竖屏首页 Feed

- Direction：竖屏。Shell：C-SHELL-P。
- Sections：搜索/继续玩、每日推荐 Hero、推荐轨道、资讯、游戏、热榜、底栏。
- Components：C-TOPBAR, C-NAV, C-SECTION, D-GAME-CARD, D-RANK-ROW。
- States：默认、下拉刷新、加载、部分区块空。
- Interactions：搜索、打开 Hero、横向浏览、进入详情/榜单。
- Source refs：screen-08, screen-45, figma-01 (`50732-8811`)。
- Conflict：screen-45 只作为切回后的结果态，不据此发明切换动画。
- Acceptance：底栏不遮挡 Feed，区块顺序保持现行产品。

## R-06 搜索发现与结果

- Direction：竖屏与横屏独立配方。Shell：C-SHELL-P 或 C-SHELL-L。
- Sections：搜索输入、历史、热门/推荐 Tab、热搜榜、推荐或结果。
- Components：C-INPUT, C-TAB-CHIP, D-SEARCH-RESULT, D-PLATFORM-BADGE。
- States：默认、输入、加载、空、失败、有结果。
- Interactions：搜索、清除、切换 Tab、打开对应平台详情。
- Source refs：screen-09, screen-43, figma-01 (`50732-8811`), figma-07 (`63884-1506`)。
- Conflict：修复 screen-09 右侧越界；竖屏结果固定每排 2 个；横屏使用左热搜/右推荐双面板。
- Acceptance：同游戏 EPIC/GOG 分条，平台标识位于封面；GOG 无评分显示“暂无评分”。

## R-07 竖屏游戏详情

- Direction：竖屏。Shell：沉浸顶部 + 固定底部操作。
- Sections：媒体、视频/图集 Tab、标题评分标签、引擎/元数据、长文、获取/启动操作。
- Components：D-DETAIL-HERO, D-ENGINE-META, C-TAB-CHIP, C-BUTTON, C-SHEET。
- States：媒体加载、默认、平台切换、未拥有、详情折叠。
- Interactions：切媒体、切平台、启动/获取、打开更多。
- Source refs：screen-10, screen-23, figma-01 (`50732-8811`), figma-07 (`63884-1506`)。
- Conflict：screen-23 绿色正文为渲染异常，只参考结构。
- Acceptance：固定操作不遮挡正文；能力缺失明确显示，不伪造数据。


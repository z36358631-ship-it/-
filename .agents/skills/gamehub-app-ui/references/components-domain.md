# 领域组件契约

## D-GAME-CARD：游戏卡

- Anatomy：封面、平台标识、游戏名、元数据、可选操作。
- Variants：竖版封面、横版封面、列表行、Hero、排行榜行、房间游戏。
- States：默认、聚焦、加载、不可用、下载中。
- Events：进入详情、秒玩、下载、查看房间。
- Source refs：screen-03, screen-08, screen-12, screen-14, screen-38, screen-40。
- 约束：竖屏搜索结果每排 2 张；GOG/EPIC 等标识显示在封面上。

## D-SEARCH-RESULT：搜索结果卡

- Anatomy：封面、平台角标、名称、评分/时长、可选秒玩。
- Variants：竖屏双列、横屏列表/卡片。
- States：有评分、暂无评分、已拥有、可获取、加载。
- Events：打开对应平台详情。
- Source refs：screen-09, screen-43, figma-07 (`63884-1506`)。
- 约束：同一 PC 游戏多平台时分条展示；不得把多个平台合并成一个不可区分结果。

## D-PLATFORM-BADGE：平台标识

- Anatomy：平台字标或内联 SVG、对比背景。
- Variants：Steam、EPIC、GOG、PC、本地、复古。
- States：默认、拥有、未绑定、不可用。
- Events：通常无；作为平台 Tab 时执行切换。
- Source refs：screen-18 至 screen-21, figma-04 (`84199-3291`), 用户已确认 GOG 规则。
- 约束：GOG 无评分显示“暂无评分”；不得出现账号价值。

## D-PLATFORM-ENTRY：游戏平台入口

- Anatomy：平台图标、名称、说明、绑定/数量状态。
- Variants：Steam、EPIC、GOG、导入游戏、复古游戏。
- States：未绑定、同步中、已绑定、失败、空库。
- Events：授权绑定、进入游戏库、重试同步。
- Source refs：screen-04, screen-18 至 screen-21, figma-04 (`84199-3291`)。
- 约束：游戏库顺序为 PC / Steam / EPIC / GOG / 复古或导入，具体以现有入口结构为基准；新增 GOG 时不改其他入口。

## D-ACCOUNT-CARD：平台账号卡

- Anatomy：平台图标、账号名、绑定状态、游戏数量/时长摘要、更多按钮。
- Variants：Steam、EPIC、GOG。
- States：未绑定、已绑定、同步中、同步失败、账号冲突。
- Events：绑定、重试；切换账号/解绑等低频操作放入 `…` 菜单。
- Source refs：screen-30, figma-04 (`84199-3291`), figma-09 (`5504-639`)。
- 约束：GOG 卡不展示账号价值，也不保留其占位。

## D-DETAIL-HERO：游戏详情 Hero

- Anatomy：媒体背景、返回/分享、标题、标签、平台与操作。
- Variants：竖屏媒体区、掌机横屏全幅沉浸。
- States：图片、视频、加载、媒体失败。
- Events：播放、切换媒体、启动、更多。
- Source refs：screen-10, screen-23, screen-44, figma-01 (`50732-8811`), figma-07 (`63884-1506`)。

## D-ENGINE-META：引擎与元数据

- Anatomy：平台启动方式、兼容性、云存档、游戏时长、评分。
- Variants：Steam、EPIC、GOG；横竖密度。
- States：已拥有、未拥有、未绑定、暂无数据、不可用。
- Events：切换平台、启动、授权。
- Source refs：screen-10, screen-44, figma-09 (`5504-639`)。
- 约束：按已拥有平台优先 `Steam > EPIC > GOG`；从某平台游戏库进入时默认该平台。不要把“获取游戏区新增 GOG”扩张为 GOG 启动、云存档或时长能力。

## D-ROOM-CARD：云游戏房间卡

- Anatomy：游戏、房主、人数、语音/状态、加入按钮。
- Variants：竖屏单列、横屏双列、已加入、满员。
- States：可加入、满员、进行中、密码房、加载。
- Events：加入、查看、快速加入。
- Source refs：screen-13, screen-39, figma-06 (`64479-692`)。

## D-RANK-ROW：排行行

- Anatomy：名次、封面、名称、分类/描述、评分或热度。
- Variants：前三、普通、竖屏单列、横屏双列。
- States：默认、聚焦、加载。
- Events：进入详情、切换分类。
- Source refs：screen-16, screen-17, screen-42。
- 约束：文本使用省略或换行，不允许越过屏幕右缘。

## D-DOWNLOAD：下载与同步

- Anatomy：标题、进度、速度、剩余、控制按钮、错误说明。
- Variants：队列、插件、边玩边下、空态。
- States：等待、下载、暂停、完成、失败、空间不足。
- Events：暂停、继续、重试、取消。
- Source refs：screen-34, figma-05 (`84642-3807`), figma-09 (`5504-639`)。

## D-COMMUNITY / D-MODS / D-TASK / D-CDKEY

- Anatomy：按对应页面配方组合内容卡、状态、操作和来源标识。
- Variants：社区 Feed/详情、MOD 详情/管理、任务/商城、CDKEY/订单。
- States：默认、加载、空、失败、不可参与、已完成。
- Events：浏览、加入、下载、兑换、提交。
- Source refs：figma-01 (`50732-8811`), figma-02 (`51374-15897`), figma-03 (`88688-6274`), figma-08 (`38095-6672`)。
- 约束：只有需求明确包含这些业务时才加载，不得自动出现在基础游戏页面。


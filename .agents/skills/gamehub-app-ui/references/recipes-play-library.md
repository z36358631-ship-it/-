# 玩游戏、排行榜与游戏库页面配方

## R-08 玩游戏频道族

- Direction：竖屏与横屏独立。Shell：C-SHELL-P / C-SHELL-L。
- Sections：频道 Tab、频道摘要、主内容轨道/网格、状态区。
- Components：C-NAV, C-TAB-CHIP, C-SECTION, D-GAME-CARD, D-ROOM-CARD。
- States：默认、加载、空、网络失败。
- Interactions：切频道、浏览、进入详情、加入房间、下载。
- Source refs：screen-11（云游戏竖）、screen-12（PC 竖）、screen-13（组队竖）、screen-14（复古竖）、screen-37（云游戏横）、screen-38（PC 横）、screen-39（组队横）、screen-40（复古横）。
- Conflict：竖屏组队单列、复古三列；横屏组队双列、复古六列，不机械缩放。
- Acceptance：频道状态独立，横屏焦点清晰。

## R-09 云游戏时长与充值

- Direction：竖屏，横屏若需求明确则引用 Figma 扩展。
- Sections：余额摘要、套餐、权益、购买说明。
- Components：C-TOPBAR, C-SECTION, C-BUTTON, C-FEEDBACK。
- States：加载、可购买、余额不足、空、失败。
- Interactions：选套餐、购买、查看说明。
- Source refs：screen-15, figma-07 (`63884-1506`)。
- Conflict：screen-15 套餐区空白状态不明确；输出必须显式选择加载/空/失败之一。
- Acceptance：价格和权益对应，不以空白代替数据状态。

## R-10 排行榜

- Direction：竖屏与横屏独立。Shell：C-SHELL-P / C-SHELL-L。
- Sections：标题、榜单 Tab、分类 Chip、排名列表。
- Components：C-TAB-CHIP, D-RANK-ROW, C-FEEDBACK。
- States：首屏展开、滚动折叠、分类选中、加载、空。
- Interactions：切榜、筛选、打开游戏。
- Source refs：screen-16, screen-17, screen-42。
- Conflict：16/17 解释为同页展开/折叠态；42 的右缘裁切必须修复。
- Acceptance：竖屏单列、横屏双列，前三样式可辨，文字不越界。

## R-11 游戏库状态矩阵

- Direction：竖屏与横屏独立。
- Shell：竖屏 C-SHELL-P；横屏 C-SHELL-L。
- Sections：平台 Tab、账号状态、搜索/筛选/导入、游戏内容、空态。
- Components：C-TAB-CHIP, D-PLATFORM-ENTRY, D-GAME-CARD, D-ACCOUNT-CARD, C-FEEDBACK。
- States：未绑定、同步中、失败、空库、有游戏、稀疏库。
- Interactions：切平台、绑定、重试、筛选、进入详情、导入。
- Source refs：screen-07, screen-18, screen-19, screen-20, screen-21, screen-41, figma-04 (`84199-3291`)。
- Conflict：screen-07 归为 Epic 未绑定；screen-41 仅作为单游戏稀疏态。
- Acceptance：矩阵覆盖平台 × 绑定状态 × 方向；新增 GOG 时放在 EPIC 与后续非平台入口之间，未绑定文案为“GOG 数据同步功能需绑定账号，查看个人游戏库数据”，按钮“绑定 GOG 账号”。

## R-12 导入游戏弹窗

- Direction：竖屏，可按横屏 Shell 重排但不得缩放。
- Sections：遮罩、标题、本地游戏/Steam 库两张入口卡。
- Components：C-DIALOG, D-PLATFORM-ENTRY。
- States：默认、入口不可用。
- Interactions：选择入口、取消。
- Source refs：screen-22。
- Conflict：保持两个现行入口，不自动加入 GOG。
- Acceptance：焦点限制在弹窗，卡片整块可操作。

## R-13 游戏管理弹层套件

- Direction：竖屏为主。
- Sections：更多菜单、秒玩设置、版本单选、移除确认、编辑表单。
- Components：C-MENU, C-SHEET, C-DIALOG, C-INPUT, C-BUTTON。
- States：默认、选择、提交、错误、危险确认。
- Interactions：按对应弹层执行；取消必须可返回。
- Source refs：screen-24, screen-25, screen-26, screen-27, screen-28。
- Conflict：screen-24 光晕只作环境装饰，不继承过强泄漏。
- Acceptance：危险操作二次确认；关闭后回到原上下文。

## R-14 按键与布局图库

- Direction：竖屏；横屏扩展参考 Figma 控制器页。
- Sections：功能 Tab、搜索、双列布局卡、类型标签、下载量。
- Components：C-TAB-CHIP, C-INPUT, C-SECTION, C-FEEDBACK。
- States：默认、搜索、加载、空、下载中。
- Interactions：筛选、搜索、打开、下载。
- Source refs：screen-29, figma-05 (`84642-3807`)。
- Conflict：控制器映射的新状态以 Figma 为准。
- Acceptance：双列卡等宽，长名称与下载量不冲突。


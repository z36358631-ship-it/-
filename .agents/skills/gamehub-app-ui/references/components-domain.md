# 领域组件契约

## D-GAME-CARD：游戏卡

- Anatomy：封面、平台标识、游戏名、元数据、可选操作。
- Variants：portrait-cover / landscape-cover / row / hero / ranking / room。
- States：default / focused / loading / unavailable / downloading。
- Events：进入详情、启动、下载、查看房间。
- Source refs：screen-03、screen-08、screen-12、screen-14、screen-38、screen-40、screen-41。
- 约束：竖屏搜索结果一排 2 个；Steam/EPIC/GOG 标识在封面上；同一 PC 游戏多平台时按平台拆成多条。
- 回归登记：`library-landscape/D-GAME-CARD`。

## D-PLATFORM-BADGE：平台角标

- Anatomy：平台原始 SVG、可选拥有/未绑定状态。
- Variants：Steam / EPIC / GOG / PC / local / retro。
- States：default / owned / unbound / unavailable。
- Events：通常无独立事件；随卡片或平台入口进入。
- Source refs：screen-18、screen-19、screen-20、figma-04。
- 当前状态：`missing-source`。缺少原始平台 SVG 时不得用通用文字徽标冒充。

## D-ACCOUNT-CARD：平台账号卡

- Anatomy：平台图标、账号、绑定/同步状态、游戏摘要、更多菜单。
- Variants：Steam / EPIC / GOG。
- States：unbound / bound / syncing / failed / conflict。
- Events：绑定、重试、打开更多菜单；切换/解绑折叠进更多菜单。
- Source refs：screen-30、figma-04、figma-09。
- 约束：GOG 没有“账号价值”，页面不保留占位；低频账号操作不直接占据主卡操作区。

## D-ENGINE-META：游戏引擎与元数据

- Anatomy：平台/引擎、拥有状态、云存档、游戏时长、可选启动入口。
- Variants：Steam / EPIC / GOG / portrait / landscape。
- States：owned / unowned / unbound / no-data / unavailable。
- Events：启动、切换平台、绑定。
- Source refs：screen-10、screen-44、figma-09。
- 优先级：用户同时拥有时按 Steam > EPIC > GOG 展示。
- 范围约束：若本期只要求“在获得游戏区域增加 GOG 标识”，不得顺带新增 GOG 启动、云存档或时长。

## 组合规则

- 游戏库平台 Tab：Steam / EPIC / GOG；未绑定时展示绑定引导，绑定后展示封面、游戏名和时长。
- 入口差异：从哪个平台游戏库进入，默认采用该平台启动方式。
- 游戏归类：按中英文游戏名归类；无法可靠归类时作为不同详情。
- 搜索结果：同一 PC 游戏存在多个平台时展示成多条；平台角标位于封面。
- 详情页平台切换：只在需求明确时通过详情卡 Tab 和平台弹窗切换数据与启动方式。
- 新功能必须复用现有 Shell、卡片层级和状态模式，不得为 GOG 另造一套视觉系统。

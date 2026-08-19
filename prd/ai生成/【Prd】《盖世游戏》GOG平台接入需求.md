# 【Prd】《盖世游戏》GOG平台接入需求

## 一、版本信息

| 时间 | 版本 | 变更人 | 主要变更内容 | 备注 |
|---|---|---|---|---|
| 2026.08.11 | V1.0 | 郑群超 | 新增 GOG 账号绑定、游戏库、搜索、详情及启动能力 | 仅 C 端 |
| 2026.08.11 | V1.1 | 郑群超 | 按现行横竖页面调整为 10 个视图 | 游戏库入口顺序确定 |
| 2026.08.13 | V1.2 | 郑群超 | 补充账号菜单、多平台搜索分条、详情启动与游戏归类 | 与交互标注 Demo 一致 |
| 2026.08.13 | V1.3 | 郑群超 | 调整搜索卡片和“获取游戏”文案 | 竖屏搜索一行两卡 |
| 2026.08.18 | V1.4 | 郑群超 | 调整个人信息卡、账号切换、平台切换、评分和引擎区域 | 以最终 UI 为准 |
| 2026.08.19 | V1.5 | 郑群超 | 精简重复内容，将最终规则统一回写正文，并在 4.2 补充页面图 | 不改变需求范围 |

## 二、背景、目标与范围

### 2.1 背景

现有产品已接入 Steam、EPIC，但搜索和详情缺少 GOG 平台信息。本期在现有页面基础上增加 GOG，完成绑定、查看、搜索和启动链路。

当前处理方式：GOG 用户需通过 GOG Galaxy 或官网查看游戏资产。

### 2.2 目标

- 用户可绑定 GOG，并在“我的”和游戏库查看账号及游戏。
- 搜索结果可区分 EPIC、GOG 平台版本。
- 游戏详情可展示并切换 Steam、EPIC、GOG，按所选平台启动。
- 横竖屏、国内包和海外包使用同一套业务规则。
- 成功指标：绑定、首次同步、游戏库展示和 GOG 启动链路可用，且不影响 Steam、EPIC 数据。

### 2.3 范围

| 类型 | 内容 |
|---|---|
| 本期范围 | 我的页、GOG 官方授权、游戏库首页、GOG 游戏库、搜索结果、游戏详情、账号切换、平台切换、横竖屏适配 |
| 保留不变 | Steam、EPIC 现有结构和核心流程；现有页面导航、列表规则和返回逻辑 |
| 不做事项 | 不新增 B 端后台、平台管理中心或 GOG 评分；不合并搜索中的多平台结果 |
| 端与地区 | C 端；国内包“盖世游戏”和海外包“GameHub” |
| 依赖 | GOG 官方授权、账号与游戏库接口、游戏映射服务、各平台启动能力 |

## 三、用户与核心流程

1. 绑定：我的页或游戏库 GOG 入口 → GOG 官方授权 → 首次同步 → 返回原入口或进入 GOG 游戏库。
2. 游戏库：游戏库首页 → GOG → 选择游戏 → 携带 GOG 来源进入详情 → GOG 启动。
3. 搜索：探索页搜索 → 选择带平台标识的结果 → 携带对应平台来源进入详情。
4. 平台切换：游戏详情 → 点击平台图标 → 在弹窗中选择平台 → 更新平台数据和启动方式。
5. 账号切换：GOG 游戏库右上角“切换账号” → 选择当前账号或点击“+”重新授权。

## 四、概要与详细设计

### 4.1 公共规则

| 编号 | 规则 | 最终定义 |
|---|---|---|
| R1 | 页面基础 | 先保留现行页面结构、样式和交互，再增加 GOG；不得顺带增加入口、弹窗或流程。 |
| R2 | 平台来源 | 从平台游戏库或搜索进入详情时，默认使用该平台。来源不可用时保留当前来源并引导重新登录或手动切换，不自动改用其他平台。无来源时按 Steam > EPIC > GOG 选择已拥有且账号可用的平台。 |
| R3 | 游戏归类 | `gameId` 表示同一游戏，`platform + platformAppId` 表示平台版本。中英文名称和别名只用于候选匹配；无法可靠归类时按不同详情处理。搜索结果始终按平台版本分条展示。 |
| R4 | 数据隔离 | GOG 的绑定、刷新、切换、退出和异常处理只影响 GOG，不改变 Steam、EPIC。新账号授权并完成首次同步后，才替换旧账号。 |
| R5 | 评分与启动 | EPIC 评分按 5 分制乘 2 转为 10 分制；GOG 没有评分时显示“暂无评分”。“获取游戏”的平台标识表示获取渠道，启动由详情页当前平台的启动按钮完成。 |
| R6 | 横竖屏 | 横竖屏共用账号、来源和业务状态，页面分别布局，不使用整体旋转或缩放生成。切换方向后保留列表位置和当前平台。 |

### 4.2 详细设计（C端）

| 模块名称 | 图示 | 展示&交互说明 |
|---|---|---|
| 我的页 | ![我的页](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4d14ee8045ca536301f177d9f68ca3d6c6857db4/public/prd/gog-platform-integration/01-profile-portrait.png)<br>图 1 GOG 个人信息 | ① 未绑定时展示绑定说明和按钮，点击进入 GOG 官方授权。<br>② 已绑定卡片第一行为“GOG个人信息”和 `…`；第二行为 GOG 头像、昵称；第三行左侧为游玩时长，右侧为游戏数量。<br>③ 不展示 GOG ID、同步时间、账号价值及占位。<br>④ 点击 `…` 展示“更新数据 / 切换账号 / 退出账号”；菜单外点击关闭。更新中禁止重复提交；退出需二次确认。仅 EPIC 保留“喜加一”按钮。 |
| GOG 授权 | ![GOG授权](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4d14ee8045ca536301f177d9f68ca3d6c6857db4/public/prd/gog-platform-integration/02-gog-login.png)<br>图 2 官方授权 | ① 入口包括我的页、游戏库及重新登录。<br>② 使用 GOG 官方页面完成登录授权，客户端不提供本地账号密码输入框。<br>③ 成功后首次同步；取消、拒绝、网络失败或超时后返回原入口。存在旧账号时保留旧账号。 |
| 游戏库首页 | ![游戏库竖屏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4d14ee8045ca536301f177d9f68ca3d6c6857db4/public/prd/gog-platform-integration/03-library-home-portrait.png)<br>![游戏库横屏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4d14ee8045ca536301f177d9f68ca3d6c6857db4/public/prd/gog-platform-integration/04-library-home-landscape.png)<br>图 3 游戏库横竖屏 | ① GOG 插入现有入口，顺序为 EPIC → GOG → 导入游戏；其他入口不调整。<br>② 未绑定点击 GOG 进入授权；已绑定进入对应方向的 GOG 游戏库。<br>③ 横竖屏切换保留绑定状态、当前入口和滚动位置。 |
| GOG 游戏库 | ![GOG库竖屏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4d14ee8045ca536301f177d9f68ca3d6c6857db4/public/prd/gog-platform-integration/05-gog-library-portrait.png)<br>![GOG库横屏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4d14ee8045ca536301f177d9f68ca3d6c6857db4/public/prd/gog-platform-integration/06-gog-library-landscape.png)<br>图 4 GOG 游戏库 | ① 复用 EPIC 游戏库的信息层级，展示头像、昵称、游戏数量、总时长和游戏列表。<br>② 列表展示封面、游戏名、GOG 标识和游玩时长；排序、加载、空态和返回位置沿用现有游戏库。<br>③ 点击游戏携带 `gameId`、`platformAppId`、`sourcePlatform=gog` 进入同方向详情。<br>④ 右上角入口为“切换账号”，点击后先打开账号弹窗。 |
| 搜索结果 | ![搜索竖屏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4d14ee8045ca536301f177d9f68ca3d6c6857db4/public/prd/gog-platform-integration/07-search-portrait.png)<br>![搜索横屏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4d14ee8045ca536301f177d9f68ca3d6c6857db4/public/prd/gog-platform-integration/08-search-landscape.png)<br>图 5 搜索结果 | ① 新增 EPIC、GOG 平台结果；同一游戏有多个平台版本时分别展示。<br>② 竖屏一行两张游戏卡；横屏按现有布局展示。平台标识叠加在封面左下角。<br>③ 点击整张卡进入对应平台详情，平台标识不设置独立点击区域。<br>④ GOG 无评分时显示“暂无评分”。 |
| 游戏详情 | ![详情竖屏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4d14ee8045ca536301f177d9f68ca3d6c6857db4/public/prd/gog-platform-integration/09-detail-portrait.png)<br>![详情横屏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4d14ee8045ca536301f177d9f68ca3d6c6857db4/public/prd/gog-platform-integration/10-detail-landscape.png)<br>图 6 游戏详情 | ① Steam、EPIC、GOG 平台图标位于游戏类型标签之前。<br>② 按当前平台展示游戏时长、云存档和启动按钮；选择其他平台后同步更新。启动失败时保留详情数据和当前平台。<br>③ PC 游戏引擎标题右侧不展示平台胶囊；兼容性评价中的 `3.8` 与星星同行。<br>④ “获取游戏”增加 Steam、EPIC、GOG 标识，页面不出现“获得游戏”。 |
| 账号与平台切换 | ![账号切换](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4d14ee8045ca536301f177d9f68ca3d6c6857db4/public/prd/gog-platform-integration/11-account-switch-dialog.png)<br>![平台切换](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4d14ee8045ca536301f177d9f68ca3d6c6857db4/public/prd/gog-platform-integration/12-platform-switch-dialog.png)<br>图 7 切换弹窗 | ① 账号弹窗展示当前头像、昵称和“当前使用”；点击当前账号或关闭不改变账号；点击“+”进入 GOG 官方授权；“移除账号”为禁用态。<br>② 点击详情中的任一平台图标只打开“切换平台”弹窗，不立即切换。弹窗纵向展示当前游戏可用的平台，当前平台右侧显示勾；选择平台后才更新数据和启动方式。<br>③ 未绑定或授权过期的平台展示绑定/重新登录状态；没有该平台版本时不展示。关闭弹窗不改变当前平台。 |

### 4.3 状态与恢复

| 状态 | 页面表现 | 可执行操作 | 处理结果 |
|---|---|---|---|
| `unbound` | 展示绑定说明 | 绑定、返回 | 进入官方授权或返回 |
| `loading` | 展示加载状态，提交按钮禁用 | 返回 | 成功进入内容；失败进入相应异常状态 |
| `bound` | 展示账号和游戏数据 | 刷新、切换、退出、浏览 | 只更新 GOG 数据 |
| `empty` | 接口成功但没有游戏 | 刷新、返回 | 有数据后展示列表 |
| `error` | 请求失败且无缓存 | 重试、返回 | 成功后恢复目标页面 |
| `cached` | 请求失败但有可用缓存 | 浏览缓存、重试、返回 | 成功后替换缓存并更新时间 |
| `expired` | 授权失效 | 重新登录、返回 | 成功后回到原入口 |
| `cancelled` | 用户取消授权或切换 | 再次操作、返回 | 恢复进入前的账号和页面状态 |

## 五、横竖屏与包体差异

| 场景 | 竖屏 | 横屏 | 国内包 | 海外包 |
|---|---|---|---|---|
| 我的页、GOG 授权 | 使用现行竖屏页面 | 本期不新增独立横屏视图 | 品牌名“盖世游戏”，固定中文 | 品牌名“GameHub”，支持现有多语言 |
| 游戏库、搜索、详情 | 使用竖屏布局 | 使用独立横屏布局 | GOG 规则与海外包一致 | GOG 规则与国内包一致 |
| 方向切换 | 保留账号、列表位置和当前平台 | 同左 | 不改变业务状态 | 不改变业务状态 |

## 六、数据、埋点与非功能要求

### 6.1 关键数据

| 字段 | 含义 | 规则 |
|---|---|---|
| `gameId` | 盖世游戏统一游戏标识 | 同一游戏跨平台一致 |
| `platform` | 平台 | `steam`、`epic`、`gog` |
| `platformAppId` | 平台侧游戏标识 | 与 `platform` 组合后唯一 |
| `sourcePlatform` | 进入详情的来源平台 | 明确平台入口必须传；无来源传空 |
| `selectedPlatform` | 详情当前平台 | 按 R2 计算，用户选择后更新 |
| `bindStatus` | 绑定状态 | `unbound`、`loading`、`bound`、`expired`、`error` |
| `requestState` | 页面请求状态 | `normal`、`loading`、`empty`、`error`、`expired`、`cancelled`、`cached` |

### 6.2 埋点事件

| 事件名 | 触发时机 | 参数 | 用途 |
|---|---|---|---|
| `gog_entry_view` | 我的页或游戏库 GOG 入口完成展示 | `entry_page`、`orientation`、`app_package`、`bind_status` | 入口曝光 |
| `gog_authorization_result` | 官方授权结束 | `entry_page`、`result`、`failure_type`、`duration_ms` | 授权成功率与失败原因 |
| `gog_initial_sync_result` | 首次同步结束 | `result`、`failure_type`、`duration_ms`、`game_count` | 首次同步成功率 |
| `gog_library_view` | GOG 游戏库展示完成 | `request_state`、`game_count`、`orientation` | 游戏库使用与异常占比 |
| `search_platform_result_click` | 点击平台搜索结果 | `game_id`、`platform_app_id`、`platform`、`orientation` | 搜索到详情转化 |
| `platform_switch_result` | 确认或取消平台切换 | `game_id`、`from_platform`、`selected_platform`、`result` | 平台切换行为 |
| `platform_launch_result` | 平台启动返回结果 | `game_id`、`platform_app_id`、`source_platform`、`selected_platform`、`result`、`failure_type`、`duration_ms` | 启动成功率与失败原因 |

### 6.3 埋点参数

| 参数名 | 类型 | 业务含义 | 枚举或示例 |
|---|---|---|---|
| `entry_page` | string | 入口页面 | `profile`、`library` |
| `orientation` | string | 页面方向 | `portrait`、`landscape` |
| `app_package` | string | 包体 | `domestic`、`overseas` |
| `bind_status` | string | GOG 绑定状态 | 见 6.1 |
| `result` | string | 操作结果 | `success`、`failed`、`cancelled`、`timeout` |
| `failure_type` | string | 不含敏感信息的失败分类 | `network`、`authorization_denied`、`token_expired`、`sync_failed`、`launch_failed` |
| `duration_ms` | integer | 操作耗时，毫秒 | `1830` |
| `game_count` | integer | GOG 游戏数量 | `126` |
| `request_state` | string | 页面请求状态 | 见 6.1 |
| `game_id` | string | 统一游戏标识 | `cyberpunk-2077` |
| `platform_app_id` | string | 平台游戏标识 | `gog-1423049311` |
| `platform` | string | 结果所属平台 | `steam`、`epic`、`gog` |
| `from_platform` | string | 切换前平台 | `steam`、`epic`、`gog` |
| `source_platform` | string 或空 | 详情来源平台 | `steam`、`epic`、`gog`、空 |
| `selected_platform` | string 或空 | 详情当前平台 | `steam`、`epic`、`gog`、空 |

### 6.4 非功能要求

| 类型 | 要求 |
|---|---|
| 安全 | 账号密码只在 GOG 官方页面输入；客户端不读取、不保存、不上报邮箱、密码、Cookie、授权令牌原文或官方页面内容。授权域名使用允许名单。 |
| 性能 | 账号卡、游戏库和搜索性能不低于同版本 EPIC 同类页面；记录授权、同步和启动耗时。 |
| 兼容 | 覆盖国内包、海外包及现有横竖屏支持范围；不出现标识截断、区域重叠或状态丢失。 |
| 数据清理 | 退出 GOG 后清除 GOG 令牌和账号缓存；Steam、EPIC 数据不受影响。 |

## 七、上线准备

| 项目 | 完成条件 | 时间 |
|---|---|---|
| GOG 能力验证 | 确认授权、回调、令牌刷新、账号退出、游戏库字段和允许域名 | 开发前 |
| 游戏映射 | 用真实样本核对 `gameId` 与 `platformAppId`；低置信度不合并 | 联调前 |
| 多语言 | 国内包中文、海外包现有语言校对完成 | 提测前 |
| 安全与回退 | 完成存储、日志、埋点和域名检查；可关闭 GOG 入口和新绑定 | 灰度前 |

## 八、验收标准

| 编号 | 对应功能 | 前置条件 | 操作 | 预期结果 | 异常结果 |
|---|---|---|---|---|---|
| AC01 | 我的页 | GOG 已绑定 | 查看 GOG 卡片 | 字段、顺序和菜单符合 4.2；不出现禁止字段 | 刷新失败保留旧数据 |
| AC02 | 官方授权 | 从我的页或游戏库进入 | 完成或取消授权 | 成功后首次同步；取消后返回原入口 | 不替换旧账号，不影响其他平台 |
| AC03 | 游戏库首页 | 横竖屏分别进入 | 查看并点击 GOG | 入口顺序为 EPIC → GOG → 导入游戏；进入正确页面 | 未绑定进入授权 |
| AC04 | GOG 游戏库 | 已绑定且有游戏 | 浏览并点击游戏 | 横竖布局正确；详情收到 GOG 来源和正确游戏标识 | 空、失败、缓存和过期状态符合 4.3 |
| AC05 | 账号切换 | GOG 游戏库已打开 | 点击右上角入口和“+” | 先打开账号弹窗；“+”才进入授权 | 取消或失败保留旧账号 |
| AC06 | 搜索结果 | 同一游戏含 EPIC、GOG 版本 | 查看并点击结果 | 多平台分条；竖屏一行两卡；标识位于封面左下角；详情保留来源 | GOG 无评分显示“暂无评分” |
| AC07 | 详情来源 | 从 GOG 游戏库或搜索进入 | 查看详情并启动 | 默认选中 GOG，展示对应时长、云存档和启动方式 | 来源不可用时不自动切换 |
| AC08 | 平台切换 | 游戏有多个平台版本 | 点击图标并在弹窗中选择 | 点击图标只打开弹窗；确认后才切换数据和启动方式 | 关闭弹窗保持当前平台 |
| AC09 | 详情展示 | 进入横竖详情 | 查看平台区、引擎区和“获取游戏” | 平台图标在类型标签前；无引擎平台胶囊；`3.8` 与星星同行；文案正确 | 启动失败保留详情和当前平台 |
| AC10 | 游戏归类 | 存在同名、别名或低置信度候选 | 执行映射和搜索 | 已确认映射进入同一详情，搜索仍按平台分条 | 无法确认时保持不同详情 |
| AC11 | 横竖屏 | 已选择账号、游戏或平台 | 切换方向 | 保留账号、列表位置、来源和当前平台 | 不出现重置或串平台 |
| AC12 | 安全 | 完成绑定、启动和退出 | 检查存储、日志和埋点 | 无密码、令牌原文或官方页面内容；退出后 GOG 数据按规则清理 | 非允许域名中止授权 |

## 九、待确认项

| 编号 | 事项 | 建议 | 影响 |
|---|---|---|---|
| M1 | GOG 官方可用于生产的授权、游戏库、令牌刷新和退出能力 | 开发前使用真实账号完成技术验证 | 架构、开发和上线 |
| M2 | GOG 实际可返回的头像、昵称、游戏数量、总时长、单游戏时长和云存档字段 | 未获得的字段不伪造；云存档缺失显示“未获取” | 页面字段和接口 |
| M3 | 一个盖世账号可同时保留的 GOG 账号数量 | 首版只保留一个生效账号 | 账号切换和数据迁移 |
| M4 | 游戏映射样本、异常映射处理人和灰度准入标准 | 低置信度不合并，产品确认后再调整 | 搜索、详情和启动 |

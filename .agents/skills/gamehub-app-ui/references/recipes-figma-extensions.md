# Figma 后续功能页面配方

这些配方只在需求明确命中相应业务时加载。实机图没有覆盖的部分以最新有效 Figma 为目标稿，并在交付中注明“目标设计，非实机事实”。

## X-01 社区与社区搜索

- Direction：竖屏为主，横屏详情使用独立布局。
- Shell：C-SHELL-P / C-SHELL-L。
- Sections：社区 Feed、文章/马甲号、搜索综合/社区/游戏、详情社区区块。
- Components：D-COMMUNITY, C-TAB-CHIP, C-INPUT, C-FEEDBACK。
- States：刷新、加载、空、失败、发布者身份。
- Interactions：搜索、切类目、打开内容、刷新。
- Source refs：figma-01 `612社区` (`50732-8811`)。
- Conflict：社区能力不得自动加入普通详情页，除非需求明确。
- Acceptance：内容身份、平台游戏信息与社区信息不混淆。

## X-02 CDKEY、广告、MODS 与订单

- Direction：横竖按对应 Frame 分别实现。
- Shell：内容页、管理页或遮罩广告页。
- Sections：CDKEY 提交/结果、开屏广告、搜索原生广告、MOD 详情/管理、订单详情。
- Components：D-CDKEY, D-MODS, C-DIALOG, C-FEEDBACK, C-BUTTON。
- States：有效、无效、已兑换、广告关闭、MOD 下载/更新、订单状态。
- Interactions：提交、关闭、下载、管理、查看订单。
- Source refs：figma-02 `CDKEY&开屏广告&mods` (`51374-15897`)。
- Conflict：广告必须保持广告可识别性，不伪装为普通内容卡。
- Acceptance：状态和动作一一对应，不新增变现入口。

## X-03 任务中心、商城与发行人计划

- Direction：竖屏与横屏按 Frame 独立。
- Sections：任务列表、兑换商城、获取记录、盖世币、发行人计划。
- Components：D-TASK, C-TAB-CHIP, C-FEEDBACK, C-DIALOG。
- States：可领取、进行中、已完成、库存不足、兑换成功/失败。
- Interactions：做任务、领取、兑换、查看记录。
- Source refs：figma-03 `社区2期-发行人商城任务` (`88688-6274`)。
- Conflict：不把任务/商城入口塞入基础首页，除非需求指定入口。
- Acceptance：货币、库存与状态清晰，高风险兑换有确认。

## X-04 新手优化、游戏库布局与新手福利

- Direction：竖屏为主，游戏库横屏遵循 R-22。
- Sections：登录优化、引流引导、防沉迷、库布局、新手套装。
- Components：C-SHEET, C-DIALOG, D-PLATFORM-ENTRY, C-FEEDBACK。
- States：新用户、已完成、未绑定、不可领取、已领取。
- Interactions：引导、绑定、领取。
- Source refs：figma-04 `610新手优化引导&游戏库布局&新手福利` (`84199-3291`)。
- Conflict：新布局不覆盖同版本真实导航和安全区。
- Acceptance：新增内容自然嵌入现有流程，允许跳过时必须保留跳过。

## X-05 控制器映射、边玩边下与复古授权

- Direction：按对应竖/横 Frame。
- Sections：控制器映射、下载进度、可见游戏、复古授权、插件下载。
- Components：D-DOWNLOAD, C-FEEDBACK, C-DIALOG, C-BUTTON。
- States：未授权、授权中、已授权、下载、失败、空间不足。
- Interactions：授权、下载、暂停、重试、管理映射。
- Source refs：figma-05 `610-控制器映射&边玩边下&复古游戏授权` (`84642-3807`)。
- Conflict：能力未接入时不要展示可点击入口。
- Acceptance：下载和授权状态完整，手柄焦点可见。

## X-06 云游戏组队

- Direction：竖屏单列、横屏双列。
- Sections：大厅、创建房间、房间内、语音、世界频道。
- Components：D-ROOM-CARD, C-SHEET, C-INPUT, C-FEEDBACK。
- States：可加入、满员、密码房、房主/成员、静音、断线。
- Interactions：创建、加入、离开、语音、聊天。
- Source refs：figma-06 `606云游戏组队` (`64479-692`), screen-13, screen-39。
- Conflict：Figma 细状态优先，实机图布局密度优先。
- Acceptance：角色权限明确，离开/解散等危险动作有确认。

## X-07 搜索、秒玩、详情与充值优化

- Direction：横竖独立。
- Sections：搜索、秒玩按钮、横屏骨架、详情优化、充值中心。
- Components：D-SEARCH-RESULT, D-DETAIL-HERO, C-FEEDBACK, C-BUTTON。
- States：搜索中、骨架、可秒玩、不可用、充值状态。
- Interactions：搜索、秒玩、购买、详情导航。
- Source refs：figma-07 `604 & 605版本优化` (`63884-1506`)。
- Conflict：骨架只在加载时使用；不得成为静态页面背景。
- Acceptance：按钮能力与用户拥有状态一致。

## X-08 运营活动与公告

- Direction：跟随承载页。
- Sections：补偿模块、运营弹窗、公告封面、下线通知、活动素材。
- Components：C-DIALOG, C-FEEDBACK, C-SECTION。
- States：未读、已读、可领取、已领取、过期。
- Interactions：查看、关闭、领取。
- Source refs：figma-08 `运营活动-6.0.2后` (`38095-6672`)。
- Conflict：运营色与环境图只限该活动，不进入基础令牌。
- Acceptance：关闭路径明确，过期状态不可误操作。

## X-09 组件、品牌与废弃反例

- 组件母版：figma-09 `5504-639`，用于按钮、导航、兼容性、同步与弹层精确规则。
- Logo：figma-10 `31115-6473`，用于 APP 图标与品牌标识，不擅自重绘。
- 废弃：figma-11 `63479-1834`，只记录旧设置、旧下载、旧组队、旧菜单反例，不进入默认生成。


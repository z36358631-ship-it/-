# GUANWANGGAID-17 验收问题记录

验收基线：测试环境；NX729J 真机；GameHub 6.1.1 (123)；Global 渠道；海外测试账号。两项需求共核对 215 条测试场景（游戏库 97 条、控制器映射 118 条），覆盖竖横屏、主要空态/筛选/排序/搜索/返回、Steam/Epic/导入页，以及简中、英文、俄语、日语、巴西葡萄牙语下的游戏库和控制器深层链路。

|模块|问题描述|期望表现|截图|提交人|优先级|指派给|状态|环境/机型|
|---|---|---|---|---|---|---|---|---|
|控制器映射-侧边栏结构|游戏内右侧边缘左滑后，侧边栏仍为“虚拟手柄映射 + 单一映射方案”结构，缺少PRD要求的虚拟/物理设备分组、独立方案、激活状态及统一总开关语义；关闭映射后的结构反馈也不清晰。|侧边栏按PRD展示控制器映射标题、总开关、虚拟/物理设备分组、各自方案与激活状态；禁用后隐藏虚拟按键并折叠设备区，Toast明确反馈。|![验收截图](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@ae9886c40344ed8fac5ce4690f66cfdf902cf416/public/prd/gamehub-v611-acceptance/01-controller-sidebar-prd-mismatch.png)|@郑群超|P0||待认领|测试环境 / NX729J真机 / GameHub 6.1.1 (123) / Global|
|游戏库-竖屏布局与筛选|Steam、Epic、导入入口缺少副标题；筛选实测仅有“全部”（部分旧页面为全部/冒险/动作），缺少“独立、角色扮演”；复古游戏入口与PRD固定入口卡片布局不一致。|入口卡片显示完整主副标题；PC筛选固定为全部/动作/独立/角色扮演；复古游戏仅保留“导入复古游戏（手动添加）”固定入口且无排序按钮。|![验收截图](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@ae9886c40344ed8fac5ce4690f66cfdf902cf416/public/prd/gamehub-v611-acceptance/02-library-home-prd-mismatch.png)|@郑群超|P1||待认领|测试环境 / NX729J真机 / GameHub 6.1.1 (123) / Global|
|游戏库-横屏布局|横屏游戏库仍沿用单个最近游戏大背景及底部平台入口，缺少PRD要求的最近游戏4卡区、居中二级Tab、入口副标题和标准游戏列表；横竖屏信息架构不一致。|横屏按PRD展示顶部导航、最近游戏4卡、居中PC/复古二级Tab、带副标题入口和自适应游戏网格；旋转后保持当前Tab与数据状态。|![验收截图](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@ae9886c40344ed8fac5ce4690f66cfdf902cf416/public/prd/gamehub-v611-acceptance/03-library-landscape-prd-mismatch.png)|@郑群超|P1||待认领|测试环境 / NX729J真机 / GameHub 6.1.1 (123) / Global|
|游戏库-Steam已绑定页|Steam已绑定页仍使用“Steam数据/成就/创意工坊”结构，好友为独立按钮，未形成PRD要求的“数据/Steam好友/成就/创意工坊”四个并列Tab。|按PRD提供四个并列Tab，头部使用刷新与更多菜单，账号数据、统计和游戏列表结构与设计一致。|![验收截图](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@ae9886c40344ed8fac5ce4690f66cfdf902cf416/public/prd/gamehub-v611-acceptance/04-steam-tabs-prd-mismatch.png)|@郑群超|P1||待认领|测试环境 / NX729J真机 / GameHub 6.1.1 (123) / Global|
|游戏库-Epic未绑定态|Epic未绑定页仅显示登录说明和按钮，缺少平台图标、“绑定Epic账号”标题及完整绑定收益说明，且与Steam未绑定态不一致。|垂直居中展示Epic图标、绑定标题、完整说明和“立即绑定”主按钮；未绑定态不显示头像。|![验收截图](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@ae9886c40344ed8fac5ce4690f66cfdf902cf416/public/prd/gamehub-v611-acceptance/05-epic-unbound-empty-state.png)|@郑群超|P2||待认领|测试环境 / NX729J真机 / GameHub 6.1.1 (123) / Global|
|Global本地化-简体中文控制器链路|Global简体中文下，控制器侧边栏与映射方案广场仍整页显示英文系统文案，语言设置只在浅层页面生效。|简中下侧边栏、方案广场、详情、创建、编辑、空态和反馈全部使用简体中文；仅游戏名与用户自定义名称保留原文。|![验收截图](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@ae9886c40344ed8fac5ce4690f66cfdf902cf416/public/prd/gamehub-v611-acceptance/07-zh-controller-english.png)|@郑群超|P1||待认领|测试环境 / NX729J真机 / GameHub 6.1.1 (123) / Global|
|Global本地化-日本语两项需求|日本语下首页/游戏库仍有搜索占位、推荐栏目、资讯栏目等大量英文；进入控制器侧边栏、方案广场及详情后也基本回退英文。|日语保存并杀进程重启后，游戏库与控制器映射全链路系统栏目、说明、按钮、空态和反馈均使用日语。|![验收截图](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@ae9886c40344ed8fac5ce4690f66cfdf902cf416/public/prd/gamehub-v611-acceptance/08-ja-home-english.png)|@郑群超|P1||待认领|测试环境 / NX729J真机 / GameHub 6.1.1 (123) / Global|
|Global本地化-巴西葡萄牙语游戏库|巴西葡萄牙语下游戏库深层交互可操作，但首页/游戏库仍显示“PC Games”“Your Next Favorite”“News & Updates”等英文系统栏目，且筛选只提供“Todos”。|葡语下两项需求全链路系统文案均使用巴西葡萄牙语；游戏库筛选完整提供全部/动作/独立/角色扮演。|![验收截图](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@ae9886c40344ed8fac5ce4690f66cfdf902cf416/public/prd/gamehub-v611-acceptance/09-ptbr-library-english.png)|@郑群超|P1||待认领|测试环境 / NX729J真机 / GameHub 6.1.1 (123) / Global|
|Global本地化-俄语长文案|俄语控制器侧边栏核心标题“Маппинг виртуального контроллера”被截断为“Маппинг виртуального конт...”，用户无法完整识别开关用途。|俄语等长文案通过足够宽度、合理字号或换行完整显示，不遮挡开关与辅助入口。|![验收截图](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@ae9886c40344ed8fac5ce4690f66cfdf902cf416/public/prd/gamehub-v611-acceptance/10-ru-controller-truncation.png)|@郑群超|P2||待认领|测试环境 / NX729J真机 / GameHub 6.1.1 (123) / Global|
|控制器映射-入口可发现性|游戏内没有可见的边缘把手、箭头或首次手势引导；只有预先知道“从屏幕右侧边缘左滑”的用户才能发现控制器映射入口。|首次进入支持映射的游戏时提供一次轻量手势引导，或保留不遮挡游戏的边缘把手；用户可关闭且后续不重复打扰。|![验收截图](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@ae9886c40344ed8fac5ce4690f66cfdf902cf416/public/prd/gamehub-v611-acceptance/11-controller-entry-discoverability.png)|@郑群超|P2||待认领|测试环境 / NX729J真机 / GameHub 6.1.1 (123) / Global|

## 未覆盖说明

- 无外接实体手柄：热插拔、型号识别、物理/虚拟激活切换及物理手柄独立方案未执行。
- Epic账号未绑定：Epic已绑定态、头像菜单、切换/退出账号未执行。
- 未执行会删除好友、退出Steam账号等破坏性操作；未使用有效分享码，未发布云分享，避免产生外部数据。

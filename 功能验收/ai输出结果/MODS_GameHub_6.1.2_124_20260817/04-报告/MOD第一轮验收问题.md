# GameHub 6.1.2（124）MOD 第一轮验收问题

> 验收结论：暂不通过。真机已完成国内中文核心链路、Global 多语言页面和一次游戏内 MOD 运行验证；当前仍有 7 条可直接判定问题，1 条环境阻塞，1 条文档口径冲突。139 条用例未全部闭环，不把未验证场景视为通过。
>
> 包体：6.1.2（124）｜Git SHA：f94091a97｜环境：测试环境｜机型：Android 真机 NX729J｜ADB：192.168.50.154:41355（未启动 MuMu 模拟器）

| 模块 | 问题描述 | 期望表现 | 截图 | 提交人 | 优先级 | 指派给 | 状态 | 环境/机型 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MOD浏览/已安装 | 浏览页和已安装页均未展示刷新入口，见图1。 | 浏览页、已安装页都提供可见刷新操作，点击后重新读取当前数据。 | ![图1](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/01-mod-browse-portrait.png) | @郑群超 | P1 | 待认领 | 待处理 | Official / 中文 / 测试环境 / Android 真机 NX729J |
| MOD浏览/已安装 | 同一问题补充证据，见图2。 | 同上。 | ![图2](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/02-mod-installed-portrait.png) | @郑群超 | P1 | 待认领 | 待处理 | Official / 中文 / 测试环境 / Android 真机 NX729J |
| MOD浏览/已安装 | 同一问题补充证据，见图3。 | 同上。 | ![图3](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/03-mod-installed-landscape.png) | @郑群超 | P1 | 待认领 | 待处理 | Official / 中文 / 测试环境 / Android 真机 NX729J |
| MOD浏览-横屏布局 | 横屏搜索框在右上，排序在下一行，搜索、排序、刷新未按同一行布局，见图1。 | 横屏下搜索、排序和刷新同排；空间不足时压缩搜索框，排序区可横向滚动且刷新始终可见。 | ![图1](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/04-mod-browse-landscape.png) | @郑群超 | P2 | 待认领 | 待处理 | Official / 中文 / 测试环境 / Android 真机 NX729J |
| MOD搜索 | 搜索框输入超过 50 个字符仍可保留，实测 XML 长度为 55，见图1。 | 最多保留 50 个字符，超出部分不可继续输入。 | ![图1](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/05-mod-search-55-chars.png) | @郑群超 | P2 | 待认领 | 待处理 | Official / 中文 / 测试环境 / Android 真机 NX729J |
| MOD详情-操作区 | 已安装详情底部删除、更新、启停三个操作位宽度不一致，删除按钮明显偏窄，见图1。 | 三个操作位等宽铺满整行，启停固定在最右。 | ![图1](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/06-mod-detail-actions-portrait.png) | @郑群超 | P2 | 待认领 | 待处理 | Official / 中文 / 测试环境 / Android 真机 NX729J |
| MOD详情-操作区 | 同一问题补充证据，见图2。 | 同上。 | ![图2](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/07-mod-detail-actions-landscape.png) | @郑群超 | P2 | 待认领 | 待处理 | Official / 中文 / 测试环境 / Android 真机 NX729J |
| MOD卸载确认 | 卸载确认弹窗标题为“提示”，确认按钮为“卸载”，未带当前 MOD 名称，见图1。 | 标题显示“卸载“{MOD名称}”？”，按钮为“取消 / 确认卸载”。 | ![图1](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/08-mod-uninstall-dialog.png) | @郑群超 | P2 | 待认领 | 待处理 | Official / 中文 / 测试环境 / Android 真机 NX729J |
| Steam个人中心-MOD | 游戏分组右上显示“查看详情”，与用例要求的“查看全部”不一致，见图1。 | 每个游戏分组使用“查看全部”，进入该游戏完整 MOD 浏览页。 | ![图1](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/09-steam-profile-mod.png) | @郑群超 | P2 | 待认领 | 待处理 | Official / 中文 / 测试环境 / Android 真机 NX729J |
| Steam个人中心-MOD | 同一问题补充证据，见图2。 | 同上。 | ![图2](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/10-steam-profile-mod-jump.png) | @郑群超 | P2 | 待认领 | 待处理 | Official / 中文 / 测试环境 / Android 真机 NX729J |
| Steam个人中心-MOD | 游戏名与 MOD 数量直接拼接为“Slay the Spire 23”，数量缺少分隔，见图1。 | 游戏名和数量分开展示，例如“Slay the Spire 2（3）”。 | ![图1](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/09-steam-profile-mod.png) | @郑群超 | P2 | 待认领 | 待处理 | Official / 中文 / 测试环境 / Android 真机 NX729J |
| MOD运行状态 | MOD 页面显示 3 个已安装项，进入游戏后右下角提示“已加载 4 个 MOD”，安装清单与引擎加载数量不一致，见图1。 | 页面安装清单、设备文件和游戏引擎实际加载数量保持一致，并能追溯差异原因。 | ![图1](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/11-global-installed-russian.png) | @郑群超 | P1 | 待认领 | 待处理 | Global / 俄语 / 测试环境 / Android 真机 NX729J |
| MOD运行状态 | 同一问题补充证据，见图2。 | 同上。 | ![图2](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/12-game-mod-loaded.png) | @郑群超 | P1 | 待认领 | 待处理 | Global / 俄语 / 测试环境 / Android 真机 NX729J |
| Global环境前置 | Global 杀进程重启后进入“玩游戏”持续显示“网络连接断开”，点击重试仍未恢复；后续 MOD 数据只能通过缓存游戏详情进入，见图1。 | Global 测试环境接口可正常加载游戏库，重启后可从正常入口获取 MOD 数据。 | ![图1](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/13-global-network-after-restart.png) | @郑群超 | P1 | 后端/环境确认 | 环境阻塞 | Global / 中文 / 测试环境 / Android 真机 NX729J |
| Global环境前置 | 同一问题补充证据，见图2。 | 同上。 | ![图2](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/14-global-network-after-retry.png) | @郑群超 | P1 | 后端/环境确认 | 环境阻塞 | Global / 中文 / 测试环境 / Android 真机 NX729J |
| MOD卡片字段-待确认 | 浏览/已安装卡片实际展示简介，但未看到更新时间；旧 APP MOD PRD/CSV要求不展示简介且展示更新时间，见图1。 | 先冻结验收基准；按最终基准统一卡片字段，避免旧 APP PRD 与新版 DST MODS PRD 互相冲突。 | ![图1](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/01-mod-browse-portrait.png) | @郑群超 | P2 | 产品确认 | 待产品确认 | Official / 中文 / 测试环境 / Android 真机 NX729J |
| MOD卡片字段-待确认 | 同一问题补充证据，见图2。 | 同上。 | ![图2](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@c0a5b299be8aaa77997499307890727a9d1e3b03/public/prd/gamehub-v612-mod-round1/04-mod-browse-landscape.png) | @郑群超 | P2 | 产品确认 | 待产品确认 | Official / 中文 / 测试环境 / Android 真机 NX729J |

## 已验证通过的核心行为

- Steam《杀戮尖塔2》可从详情更多菜单进入 MOD；浏览页、已安装页、详情页均可打开。
- 竖屏浏览单列、横屏浏览双列；横屏详情为居中宽弹窗，竖屏详情为底部大弹层。
- 已安装 MOD 可快捷启用/停用；成功切换未出现成功 Toast，取消卸载不改变状态，确认卸载后详情和列表状态同步。
- Global 英文、日语、巴西葡萄牙语、俄语的 MOD 浏览/启停/安装等系统文案会跟随语言切换；游戏固有 MOD 标题和内容仍保留原数据语言。
- 游戏运行验证中出现“已启动 MOD 模式，已加载 4 个 MOD”，证明引擎识别到了 MOD；但与页面安装数量不一致，已单列问题。

## 未闭环场景

依赖组件弹窗、空间/网络/安装/启停/更新/卸载失败回滚、同 MOD 冲突、切页/旋转/后台/杀进程任务、断网恢复、多设备隔离、内容审核、加载失败、旧版脚本升级、导入游戏目录选择器，以及 Global 正常接口下的全量安装链路均未完成闭环。当前证据覆盖约 22%～28%，不能据此判定 139 条用例全部通过。

## 文档口径冲突

- 旧 APP MOD PRD/CSV 与较新的 DST MODS PRD 对卡片简介、横竖屏列数、目录选择器形态存在冲突。
- 用户已明确目录选择属于导入游戏，Steam 游戏不展示目录入口；本轮未把 Steam 缺少目录入口判为缺陷。
- 目录选择/更改目录相关场景未进入当前 139 条 CSV 用例，需要补充适用游戏和验收基准后再测。

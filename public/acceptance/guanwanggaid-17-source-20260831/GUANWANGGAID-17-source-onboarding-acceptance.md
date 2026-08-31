# GUANWANGGAID-17 首次启动来源采集验收问题

> 验收日期：2026-08-31  
> 环境：GameHub 6.2.0（125）/ 测试环境 / MuMu DCO-AL00 Android 12 + USB真机 NX729J Android 15 / Official、Global / 中文、英文  
> 用例结果：69条，PASS 33、FAIL 14、BLOCKED 22。14条失败归并为9个问题；阻塞项主要缺Mock、特殊游客/账号预置、可用云游戏或Steam闭环及后台兴趣偏好查询。  
> 公开图片固定提交：`043ecf34d746df71df19f77c233168a6aacda6aa`。图片均为无红框原图，可直接导入飞书。

| 模块 | 问题描述 | 期望表现 | 截图 | 提交人 | 优先级 | 指派给 | 状态 | 环境/机型 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 首次启动-来源选项 | 国内来源列表混入王者荣耀、微博、快手、盖世游戏、吃鸡等非需求项，部分图标异常。 | 国内仅展示需求约定的来源渠道，名称和图标一一对应。 | ![国内来源配置异常](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@043ecf34d746df71df19f77c233168a6aacda6aa/public/acceptance/guanwanggaid-17-source-20260831/images/01-official-extra-sources.png) | @郑群超 | P1 | 客户端/后台配置 | 待处理 | GameHub 6.2.0（125）/ 测试环境 / Official / MuMu / 竖屏 |
| 首次启动-步骤进度 | 来源页、准备方式页和分支页均没有显示1/3、2/3、3/3。 | 三个步骤分别显示1/3、2/3、3/3；欢迎页不占步骤。 | ![步骤进度缺失](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@043ecf34d746df71df19f77c233168a6aacda6aa/public/acceptance/guanwanggaid-17-source-20260831/images/02-step-progress-missing.png) | @郑群超 | P1 | 客户端 | 待处理 | GameHub 6.2.0（125）/ 测试环境 / Official、Global / MuMu / 竖屏 |
| 首次启动-来源页横屏 | 来源页切到横屏后，所有来源卡片消失，只剩标题和按钮。 | 横屏完整展示来源卡片，保留当前选择和滚动位置。 | ![横屏来源卡片消失](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@043ecf34d746df71df19f77c233168a6aacda6aa/public/acceptance/guanwanggaid-17-source-20260831/images/03-source-landscape-options-missing.png) | @郑群超 | P1 | 客户端 | 待处理 | GameHub 6.2.0（125）/ 测试环境 / Official / MuMu / 横屏 |
| 首次启动-来源草稿 | 来源页选择来源但未提交时，强杀重启后选择结果丢失，来源顺序也重新随机。 | 恢复原来源选择和顺序，不要求用户重新选择。 | ![来源草稿丢失](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@043ecf34d746df71df19f77c233168a6aacda6aa/public/acceptance/guanwanggaid-17-source-20260831/images/04-source-draft-lost-after-restart.png) | @郑群超 | P1 | 客户端 | 待处理 | GameHub 6.2.0（125）/ 测试环境 / Official / MuMu / 竖屏 |
| 首次启动-海外品牌 | Global切换为中文后，欢迎页显示“盖世游戏”。 | Global各语言统一使用GameHub品牌。 | ![海外中文品牌错误](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@043ecf34d746df71df19f77c233168a6aacda6aa/public/acceptance/guanwanggaid-17-source-20260831/images/05-global-chinese-brand.png) | @郑群超 | P2 | 客户端 | 待处理 | GameHub 6.2.0（125）/ 测试环境 / Global / 中文 / MuMu / 竖屏 |
| 首次启动-海外来源文案 | Global中文把TikTok显示为“抖音”。 | Global各语言保留TikTok品牌名。 | ![海外来源名称错误](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@043ecf34d746df71df19f77c233168a6aacda6aa/public/acceptance/guanwanggaid-17-source-20260831/images/06-global-chinese-source-labels.png) | @郑群超 | P2 | 客户端/本地化 | 待处理 | GameHub 6.2.0（125）/ 测试环境 / Global / 中文 / MuMu / 竖屏 |
| 首次启动-海外来源布局 | Global英文来源卡片的“Recommended by friends”“Other or don't remember”被截断。 | 长文案完整展示，不裁切来源名称。 | ![海外英文文案裁切](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@043ecf34d746df71df19f77c233168a6aacda6aa/public/acceptance/guanwanggaid-17-source-20260831/images/08-global-english-labels-clipped.png) | @郑群超 | P1 | 客户端 | 待处理 | GameHub 6.2.0（125）/ 测试环境 / Global / English / MuMu / 竖屏 |
| 首次启动-海外新手分支 | Global选择I'm a Beginner后进入新手游戏列表，并直接写完成态回首页，没有两页操作引导和Get Started。 | 进入两页操作引导；仅点击最后一页Get Started后写完成态并进入首页。 | ![海外新手分支错误](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@043ecf34d746df71df19f77c233168a6aacda6aa/public/acceptance/guanwanggaid-17-source-20260831/images/07-global-beginner-wrong-route.png) | @郑群超 | P0 | 客户端 | 待处理 | GameHub 6.2.0（125）/ 测试环境 / Global / English / MuMu / 竖屏 |
| 首次启动-横屏适配 | 新手引导横屏仍使用竖屏窄画布居中，内容被截断，左右空间空置。 | 横屏按可用宽度重新排版，内容完整展示。 | ![新手引导横屏布局异常](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@043ecf34d746df71df19f77c233168a6aacda6aa/public/acceptance/guanwanggaid-17-source-20260831/images/09-new-user-landscape-narrow.png) | @郑群超 | P1 | 客户端 | 待处理 | GameHub 6.2.0（125）/ 测试环境 / Official / MuMu / 横屏 |

## 验收结论

- 结论：验收不通过。
- 已验证主链路：国内Official三轮、Global中英文三轮、来源单选/随机排序/返回保留、在线与断网提交、三种准备方式、国内/海外分支、取消恢复、终态、横竖屏、前后台与强杀恢复；USB真机交叉确认已完成正式账号不重复展示引导。
- 阻塞22条：本地保存失败、跳转失败、列表失败/空数据Mock；新建/历史游客及赠送时长；可用云游戏、Steam绑定与可导入游戏成功闭环；后台兴趣偏好结果查询。


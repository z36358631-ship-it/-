# GameHub 6.2.0（125）兼容性诊断与首页整合验收问题

> 结论：验收不通过。环境为 Official / 测试环境 / Android 真机（NX729J，Android 15），已覆盖首页整合的横竖屏、点击、滑动、返回、连续切换和异常交互。兼容性诊断已完成游戏导入与启动入口验证，但被 PC 引擎插件安装失败前置阻断，诊断弹窗、推荐方案、反馈提交、二次确认、兜底、多语言和埋点链路本轮不能判定通过。

| 模块 | 问题描述 | 期望表现 | 截图 | 提交人 | 优先级 | 指派给 | 状态 | 环境/机型 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 兼容性诊断-游戏启动 | PC 引擎插件安装失败，游戏无法启动，兼容性诊断全链路被阻断。 | PC 引擎插件正常安装并启动游戏；游戏异常退出后进入兼容性诊断流程。 | ![PC引擎插件安装失败](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/01-pc-engine-install-failed.png) | @郑群超 | P0 | 待认领 | 待处理 | Official / 测试环境 / Android 真机（NX729J，Android 15） |
| 兼容性诊断-失败提示 | 失败后只短暂提示“PC引擎插件安装失败”，没有失败原因、修复建议和重试入口。 | 明确说明失败原因，并提供重试或修复指引。 | ![失败提示信息不足](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/01-pc-engine-install-failed.png) | @郑群超 | P1 | 待认领 | 待处理 | Official / 测试环境 / Android 真机（NX729J，Android 15） |
| 兼容性诊断-组件下载 | 插件安装失败后再次启动，仍重新下载整包组件，重复消耗流量和等待时间。 | 下载成功的组件应复用；失败后只重试安装或补下载损坏内容。 | ![重复进入组件下载](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/02-pc-engine-downloading.png) | @郑群超 | P1 | 待认领 | 待处理 | Official / 测试环境 / Android 真机（NX729J，Android 15） |
| 首页整合-二级Tab | 实际顺序为“推荐 / PC云游戏 / PC游戏 / 云游组队玩 / 复古游戏”，与需求的“推荐 / PC游戏 / 云游戏 / 云游组队玩 / 复古游戏”不一致。 | Tab 名称、顺序与需求保持一致。 | ![Tab顺序和名称不一致](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/03-tab-order-landscape.png) | @郑群超 | P1 | 待认领 | 待处理 | Official / 测试环境 / Android 真机（NX729J，Android 15） |
| 首页整合-竖屏Tab | 竖屏右侧“复古游戏”Tab 被屏幕裁切，名称显示不完整。 | 5个Tab完整可见；空间不足时提供明确、可操作的横滑或适配方案。 | ![复古游戏Tab被裁切](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/04-retro-tab-clipped-portrait.png) | @郑群超 | P1 | 待认领 | 待处理 | Official / 测试环境 / Android 真机（NX729J，Android 15） |
| 首页整合-横竖屏切换 | 横竖屏模式切换后没有保持推荐页浏览位置，切回时跳到另一段内容。 | 横竖屏切换后保持当前Tab和浏览位置。 | ![切屏后浏览位置变化](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/05-mode-after-portrait.png) | @郑群超 | P1 | 待认领 | 待处理 | Official / 测试环境 / Android 真机（NX729J，Android 15） |
| 首页整合-Banner | Banner 实际显示6个分页点，设计规范要求5段分页器。 | 分页器按5段展示，长度比例为16 / 8 / 8 / 8 / 8。 | ![Banner显示6个分页点](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/06-banner-six-indicators.png) | @郑群超 | P2 | 待认领 | 待处理 | Official / 测试环境 / Android 真机（NX729J，Android 15） |
| 首页整合-资讯详情 | 资讯详情页顶部留白过大，同一“游戏入口”重复出现，链接仍是原始蓝色网页样式。 | 详情内容从顶部正常排布；相同入口只保留一次，并使用App统一的按钮和链接样式。 | ![资讯详情布局异常](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/07-news-detail-layout.png) | @郑群超 | P2 | 待认领 | 待处理 | Official / 测试环境 / Android 真机（NX729J，Android 15） |
| 首页整合-滑动切Tab | PC游戏横滑卡片会吞掉左右滑切Tab手势；只有在标题空白区滑动才能切换Tab。 | 左右滑切Tab在内容区保持可用；横滑卡片与切Tab手势边界清晰、结果可预期。 | ![卡片区域滑动未切Tab](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/08-carousel-swipe-stays-pc-game.png) | @郑群超 | P1 | 待认领 | 待处理 | Official / 测试环境 / Android 真机（NX729J，Android 15） |
| 首页整合-内链卡片 | 横屏内链推荐卡片主体点击无响应，只有最右侧箭头能进入目标页。 | 卡片主体和箭头使用同一点击区域，点击任意位置都能进入目标页。 | ![卡片主体点击无响应](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/09-internal-link-body-no-response.png) | @郑群超 | P1 | 待认领 | 待处理 | Official / 测试环境 / Android 真机（NX729J，Android 15） |

## 补充截图

- 问题3图2：上一轮启动同样重新进入组件下载。  
  ![问题3图2-上一轮重新下载](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/02-pc-engine-redownload-round1.png)
- 问题6图2：切换前掌机横屏的推荐页浏览位置。  
  ![问题6图2-切换前浏览位置](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/05-mode-before-landscape.png)
- 问题9图2：在标题空白区执行相同方向滑动后可以切到“云游组队玩”。  
  ![问题9图2-空白区可切Tab](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/08-header-swipe-switches-tab.png)
- 问题10图2：操作前的两张内链推荐卡片。  
  ![问题10图2-操作前](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/09-internal-link-before.png)
- 问题10图3：点击最右侧箭头后成功进入目标页。  
  ![问题10图3-箭头可进入](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e5da1b29753f7b03aacbd22709e948a33a42920/public/prd/guanwanggaid-17-compat-home-acceptance/09-internal-link-arrow-result.png)

## 已验证通过

- PC游戏卡片进入详情后返回，当前Tab和滚动位置保持。
- 连续快速切换二级Tab未崩溃，最终展示最后一次选择的Tab。
- 横屏非横滑内容区域左右滑可切换Tab。
- Banner自动轮播、手动滑动后重新计时、静音切换正常。
- `GTAVLauncher.exe` 可导入并进入游戏详情，导入过程未导致App闪退。


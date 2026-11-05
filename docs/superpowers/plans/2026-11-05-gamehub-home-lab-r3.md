# 首页完整内容方向 Implementation Plan

**Goal:** 在同一个固定实验地址交付三套独有主内容且融合第一版服务的完整首页。
**Architecture:** 根控制器负责Shell、状态与返回栈；concepts负责三方向与文章；retention负责第一版模块与承接。离线媒体统一提取，单文件构建。
**Tech Stack:** 原生HTML/CSS/JS、Python、Playwright。

- [x] 1. 核对r2与原第一版DOM、截图和有效规则；记录D063—D065，重跑S3下游。
- [x] 2. 工程师分别创建concepts.js/css与retention.js/css；独立文件所有权，不修改根控制器。
- [x] 3. 根控制器合并文章、恢复模块路由、增加focusGame/demoNow、控制区边界，构建串接模块。
- [x] 4. 从原ASSETS追加商品/秒玩组队/日历素材并登记hash；不抓取新实时优惠。
- [x] 5. node --check各脚本；构建r3，浏览器检查3方向×4场景×3形态及窄屏。
- [x] 6. 逐页验证日历/订阅、折扣/官方链接、喜加一三平台/组件、任务、秒玩组队、文章与返回；明确不执行外部交易。
- [x] 7. 审查三方向首屏与下滚内容，独立复核差异、完整性与横屏；修正并做受影响回归。
- [x] 8. 临时Git索引仅推本轮目录、计划/设计与HTML，保留原HEAD/索引/原Demo；核验线上目标版本与交互。

命令：python -X utf8 work/GUANWANGGAID-64/homepage-lab/build.py；node work/GUANWANGGAID-64/homepage-lab/verify.cjs；python -X utf8 work/GUANWANGGAID-64/homepage-lab/publish.py。

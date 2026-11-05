# 三方向首页归位 Implementation Plan

**Goal:** 恢复付费转化、本机开玩、内容活跃三方向，并交付与实现一致的设计话术。
**Architecture:** conversion.js/css负责源租号样例与套餐承接；concepts负责三种首页主体；purchase保留优惠辅助；根app负责控制、状态与路由。单文件离线构建。
**Tech Stack:** 原生HTML/CSS/JS、Python、Playwright。

- [x] 1. 核对r4及历史租号源，记录D070—D073，固化设计/计划与来源，重跑S3/S4。
- [x] 2. 新建conversion.js/css实现付费主模块及来源资格；concepts.js/css仅重做三方向首页，去除逐款攻略主体；独立文件所有权。
- [x] 3. app.js去掉deals方向、接入conversion路由与首租资格；app.html增加外侧设计说明；build.py更新模块与r5；设计话术保存design-rationale.md。
- [x] 4. verify.cjs保留相关旧回归并更新方向契约，新增资格/会员/非真实购买/无攻略依赖验证；静态检查、构建、本地浏览器验证。
- [x] 5. 用户/开发/商业独立审图与主管复核，修正具体问题；不冒充真实用户反馈。
- [ ] 6. 仅本轮路径发布到原固定地址，HTTP+SHA+线上浏览器验证，回写状态及交付。

- [x] 7. 按D074补五个首页参考、每方向一个运营位及签到入口；核对配置与数据边界、失效隐藏、租号标签与落地一致，重跑机器与专业评审。


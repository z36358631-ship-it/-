# 首页好价入库 Implementation Plan

**Goal:** 新增能比较内容和购买路径的第四首页方向，并把四个快捷入口放入各方向首屏。
**Architecture:** purchase.js/css独立处理价格数据、预算、关注、详情及租号占位；根app负责方向与路由，concepts组合内容，build合并离线资源。
**Tech Stack:** 原生HTML/CSS/JS、Python、Playwright。

- [x] 1. 固化r3基线与价格API返回，记录D067/D068/D069，重跑S3/S4。
- [x] 2. 新建work/GUANWANGGAID-64/homepage-lab/purchase.js/css；实现home、shortcuts、page、handle接口，采用真实价格快照，无史低或截止时间臆造。
- [x] 3. app.js增加deals方向、purchase模块及路由标题；concepts.js插入四方向快捷区和第四主体；app.html更新四方向外层说明；build.py添加新模块并更新r4。
- [x] 4. verify.cjs扩展四方向组合与预算/关注/适配/详情/租号/快捷区返回行为；执行node --check、python build.py、node verify.cjs。
- [x] 5. 查看四方向首屏和第四方向横竖/平板/下滚图；从用户、开发、商业视角检查，不声称真实用户反馈。
- [x] 6. review.md写入当前SHA与证据；publish.py限定路径发布；线上HTTP+SHA及浏览器复验；回写状态和交付。

文件范围：work/GUANWANGGAID-64/homepage-lab/、public/gamehub-home-lab/index.html、本设计和计划。禁止覆盖其他任务、原PC Demo、PRD或使用git add .。
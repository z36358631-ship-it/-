# 本机开玩首页实施计划

**Goal:** 落实已确认方案2和横屏4:1顶部布局。

**Architecture:** concepts维护可配置首页；timeline隔离两个日期列表；compatibility维护筛选列表；app接线路由和导航。构建离线单文件，定向提交避免覆盖其他工作。

**Tech Stack:** 原生JavaScript、CSS、Python构建、Playwright验证。

- [x] concepts.js/css：删除大卡、视频及延期商业位；合集、最新兼容、Banner/金刚4:1、配置隐藏排序。
- [x] timeline.js/css：月份、今天、日期分组及两个独立订阅状态。
- [x] compatibility.js/css：默认本机、机型和类型筛选，未知状态无虚假兼容。
- [x] app.js/html/css、retention.js、build.py：默认选中方案2、导航顺序、频道与红点；去除旧评审描述；两平台喜加一；模块接线。
- [x] verify.cjs：覆盖首页范围、4:1实测、三形态、场景空态、筛选、月份/今天、订阅、返回、配置隐藏排序及原社区/任务/福利有效回归。
- [x] 实际截图审阅，记录当前HTML SHA，定向提交推送并核验线上同SHA及交互。

执行：`python -X utf8 work/GUANWANGGAID-64/homepage-lab/build.py`；`node work/GUANWANGGAID-64/homepage-lab/verify.cjs`；`python -X utf8 work/GUANWANGGAID-64/homepage-lab/publish.py`。失败先修复，不复用r5通过证据。

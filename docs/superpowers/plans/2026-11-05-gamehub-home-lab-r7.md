# 合集卡及频道纠正实施计划

**Goal:** 让本机可玩采用双排图标合集，恢复首页原频道并插入兼容游戏。

**Architecture:** 在现有concepts中调整合集DOM/CSS，共享兼容样例IDs保持合集和频道列表一致。app集中维护频道路由与选中；恢复组队/复古入口并复用已有列表能力。

**Tech Stack:** 原生JS/CSS，Python构建，Playwright检查。

- [x] 修改concepts.js/css：标题副标题、两排图标、渐变和底部文字；保留设备过滤与空态。
- [x] 修改app.js/css及compatibility.js：六频道与选中、恢复已有组队/复古内容入口；候选与准备分离。
- [x] 增量验证频道顺序/切换、图标双排、筛选/空态、横屏4:1，保留日期和社区回归。
- [x] 构建、实际截图审图、记录HTML SHA，更新原Git/Pages固定地址并核验同版本。

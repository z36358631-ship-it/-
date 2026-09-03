# Developer Backend Demo From Latest PRD Implementation Plan

**Goal:** 冻结现有 Figma，不修改任何 Figma 文件；以 4 份最新 PRD 为唯一业务基线重建开发者后台一期离线 Demo。

**Architecture:** 新增 PRD 页面映射和 Markdown 解析层，在构建时从 4 份 PRD 读取 37 个业务页面的功能简介、展示说明、交互说明和边界，再与 CDKEY 专用交互 Fixture 合并。Demo 路由按最新 PRD 调整为 `10／6／13／8`，构建过程只读 PRD，不读取或写入 Figma。

**Tech Stack:** Node.js ESM、原生 HTML/CSS/JavaScript、node:test、playwright-core、本机 Chrome/Edge

### Task 1: 固化最新 PRD 页面契约

- [x] 新增 `prd-page-map.json`，登记 4 份 PRD、37 个页面、角色、模板和主动作。
- [x] 新增 PRD 解析器，校验 4 份文档页数为 `10／6／13／8`，并生成运行时页面内容。
- [x] 删除 `build.mjs` 对 Figma 页面分配与 SVG 哈希的构建依赖，改为 PRD 契约校验。

### Task 2: 更新页面与交互

- [x] 更新 01 为双登录、开发者注册、APPID／SDK、资料结果、账号映射和两类线下结果共 10 页。
- [x] 保留 02 的 CDKEY 自助生成、渠道 API 与双账本能力，并同步最新页面名称。
- [x] 更新 03 为 Windows／macOS／Linux、Build／Manifest／Chunk、测试、发布指针和历史回滚。
- [x] 将 04 改为整体经营、交易结算、Key、客户端下载、Campaign／UTM、人工资源、渠道归因和聚合导出共 8 页。

### Task 3: 回归与证据

- [x] 更新内容、路由、浏览器和证据脚本，明确 Figma 冻结且不再作为本轮 Demo 契约。
- [x] 重建 5 份单文件 HTML，执行 37 路由双尺寸、五态、关键交互与无远程依赖验收。
- [x] 生成最新关键页截图和视觉验收记录，只提交本轮 Demo、测试、计划与状态文件。

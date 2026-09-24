# 兼容性评价局部修复实施计划

**Goal:** 补全自己的评价编辑入口，将同配置空结果改为自动切至全部。

**Architecture:** 复用 editMyReview；在 refreshPanel 筛选入口处理空结果并同步 viewMode、分页与 Tab。现有单文件结构不变。

**Tech Stack:** 单文件 HTML / JavaScript；node:test + Playwright。

- [x] C 端 Demo：菜单增加编辑；筛选空结果切 all，pages[side] = 1，同步 data-view 高亮；通用空态按当前筛选显示。
- [x] 浏览器契约：既有编辑生命周期测试改为点击菜单；新增同配置有数据、无数据（含隐藏/删除）、全部空、我的空、删除最后一条和分页重置断言。
- [x] 执行 node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs；保存本轮菜单、编辑弹窗、自动兜底截图并原尺寸检查。
- [x] 同步现行规格、PRD 受影响文字及状态卡，记录验证证据。本轮无外部发送、推送或发布授权，仅本地交付。

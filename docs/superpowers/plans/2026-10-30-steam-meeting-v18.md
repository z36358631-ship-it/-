# Steam 会议补充实施计划

**Goal:** 更新 V1.8 文档、Demo、页面流程和 Word，资源位独立描述。

**Architecture:** 沿用现有单文件 Demo 构建模块、页面级 PRD 和截图流程。新增网络/同步评审状态；不接真实 SDK，不新增收费和资源位交互。

**Tech Stack:** JavaScript、Playwright、Markdown、python-docx。

- [x] 文档：更新 `outputs/steam-integration-20261028/Steam接入PRD-Draft.md` 与 `方案与功能清单.md`，独立输出 `资源位独立需求说明.md`。网络采购、同步接口和删除传播保持待确认。
- [x] Demo：在现有库和账号模块添加分类、双向同步、网络失败恢复，评审面板可触发模拟结果；浏览器刷新仍从游戏库首次体验开始。
- [x] 验证：执行 `verify-meeting-v18.cjs` 和受影响回归，横竖屏截图人工检查，确认账号隔离、失败快照保留、重试和模拟重开。
- [x] 流程：`build-page-flow.mjs` 增加游戏同步与网络状态图，更新原生入口替换和账号同步描述。
- [x] 产物：生成固定SHA图片链接，校验PRD与图片，更新 `export-word.py` 生成V1.8内嵌Word，保留渲染/飞书未验证说明。
- [x] 发布：构建 `public/steam-integration`，仅推送本需求文件，验证Pages正文和新增Demo状态；回写状态卡与交付地址。

范围依据：用户确认会议Steam补充，并要求更新Demo；资源位与本需求不耦合。视觉基线为本轮修改前Demo，新增分类沿用其Tab，不覆盖原有登录、模式、协议、悬浮球和启动页规则。

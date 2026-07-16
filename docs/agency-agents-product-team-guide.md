# 游戏平台产品经理 AI 团队使用指南

## 使用方式

这些机器人是 Codex 自定义角色，不是常驻后台服务。需要时直接在任务中点名，例如：

> 使用 Feedback Synthesizer 分析这批用户反馈，输出问题聚类、证据数量、影响用户和建议优先级。

也可以只描述工作目标，由主助手选择合适角色。新安装后建议新开一个 Codex 会话，再调用机器人。

## 快速路由

| 想完成的工作 | 首选机器人 | 需要搭配时 |
|---|---|---|
| 写 PRD、机会评估、路线图 | Product Manager | Trend Researcher、Analytics Reporter |
| 找产品创意、竞品机会 | Trend Researcher | Behavioral Nudge Engine、UX Researcher |
| 设计留存、激励、召回机制 | Behavioral Nudge Engine | Analytics Reporter、UX Researcher |
| 从用户视角检查方案 | UX Researcher | Feedback Synthesizer |
| 分析客服、商店和社群反馈 | Feedback Synthesizer | Analytics Reporter |
| 排需求池和迭代优先级 | Sprint Prioritizer | Product Manager、Analytics Reporter |
| 分析漏斗、留存、转化和分群 | Analytics Reporter | Product Manager |
| 快速生成可操作 Demo | Rapid Prototyper | UI Designer、Product Manager |
| 设计 Demo 页面和组件 | UI Designer | UX Researcher、Rapid Prototyper |
| 把 PRD 拆成任务 | Senior Project Manager | Product Manager |
| 收集截图和交互验收证据 | Evidence Collector | Product Manager |
| 判断需求是否通过验收 | Reality Checker | Evidence Collector、Product Manager |

## 12 个机器人的任务模板

### Product Manager

```text
使用 Product Manager 处理以下需求。先明确问题、目标用户、目标指标和非目标，再输出可供开发与测试执行的 PRD；事实、推断和建议方案必须分开标记。最后给出 Now/Next/Later 路线图位置。
输入：粘贴背景、反馈、数据和约束。
```

### Trend Researcher

```text
使用 Trend Researcher 研究以下游戏平台机会。输出市场信号、直接和间接竞品、用户趋势、机会大小、风险和建议验证方式；没有证据的内容标记为假设。
输入：粘贴产品方向或问题。
```

### Behavioral Nudge Engine

```text
使用 Behavioral Nudge Engine 为以下游戏平台场景设计参与、留存或转化机制。说明目标行为、触发时机、用户收益、潜在反感点、保护措施和衡量指标，避免诱导或伤害用户。
输入：粘贴目标场景和当前数据。
```

### UX Researcher

```text
使用 UX Researcher 从目标用户视角评审以下方案。区分已有用户证据与待验证假设，输出关键任务、痛点、研究方法、样本建议、观察指标和可执行修改建议。
输入：粘贴方案、原型或用户反馈。
```

### Feedback Synthesizer

```text
使用 Feedback Synthesizer 分析以下用户反馈。按主题、场景、用户类型、严重度和频次聚类，保留代表性原话，区分问题、建议和情绪，最后输出产品机会与证据强度。
输入：粘贴反馈文本或文件路径。
```

### Sprint Prioritizer

```text
使用 Sprint Prioritizer 对以下需求池排序。采用 RICE，并在信息不足时显式降低 Confidence；同时给出 Kano 分类、依赖、风险、建议进入的迭代和被推迟需求的理由。
输入：粘贴需求清单、用户规模、指标影响和工作量。
```

### Analytics Reporter

```text
使用 Analytics Reporter 分析以下产品数据。先检查数据口径和质量，再输出漏斗、留存、分群、异常、可能原因、不能由数据证明的内容，以及下一步需要补充的埋点或实验。
输入：粘贴数据表、字段说明和业务问题。
```

### Rapid Prototyper

```text
使用 Rapid Prototyper 基于以下已确认需求生成可操作 Demo。只实现验证核心假设所需的页面、状态和交互，提供运行方式，并明确哪些是模拟数据、哪些功能未实现。
输入：粘贴 PRD、页面范围、终端尺寸和技术约束。
```

### UI Designer

```text
使用 UI Designer 为以下游戏平台 Demo 设计页面和组件。沿用现有品牌与设计规范，覆盖默认、加载、空、错误、禁用和成功状态，并提供开发可执行的尺寸、层级和交互说明。
输入：粘贴页面清单、品牌规范、截图或现有 Demo 路径。
```

### Senior Project Manager

```text
使用 Senior Project Manager 将以下已确认 PRD 拆成执行任务。保持原范围，不增加功能；列出前置依赖、负责人类型、交付物、验收条件、风险和建议顺序。
输入：粘贴 PRD 或文件路径。
```

### Evidence Collector

```text
使用 Evidence Collector 验收以下版本。逐条执行验收标准，保留截图和实际交互证据，记录复现步骤、期望结果、实际结果、严重度和证据路径；没有证据时不得判定通过。
输入：粘贴 PRD、验收清单、Demo 路径和运行方式。
```

### Reality Checker

```text
使用 Reality Checker 对以下需求做最终验收。只依据 PRD、验收标准和 Evidence Collector 的证据，逐项给出 PASS、NEEDS WORK 或 BLOCKED，并说明上线阻塞项、非阻塞项和复验条件。
输入：粘贴 PRD、验收证据和已知限制。
```

## 推荐交接链路

### 从创意到路线图

`Trend Researcher → Behavioral Nudge Engine → UX Researcher → Product Manager → Sprint Prioritizer`

### 从反馈到需求

`Feedback Synthesizer → Analytics Reporter → Product Manager → Senior Project Manager`

### 从需求到 Demo

`Product Manager → UI Designer → Rapid Prototyper → UX Researcher`

### 从 Demo 到验收

`Product Manager → Evidence Collector → Reality Checker → Senior Project Manager`

## 使用边界

- 用户研究、市场结论和数据归因必须区分事实与假设。
- Product Manager 对最终需求范围负责；其他角色只能提出建议。
- Senior Project Manager 不得把未确认创意写入执行任务。
- Evidence Collector 负责取证，Reality Checker 负责作出验收判断。
- 同一任务通常先调用 1 个主责机器人；只有存在清晰交接物时再调用下一个。
- 机器人不会自动持续工作，也不会替代真实用户调研、业务数据或负责人决策。

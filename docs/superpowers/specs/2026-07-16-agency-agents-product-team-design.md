# 游戏平台产品经理 AI 团队设计

## 1. 目标

从本地 `agency-agents` 仓库中选择并安装一组适合游戏平台高级产品经理的 Codex 自定义机器人，覆盖创意研究、用户洞察、Demo、PRD、优先级、路线图、数据分析、用户反馈、任务拆解和需求验收。

机器人安装后按需调用，不默认同时运行。Codex 主助手负责理解当前任务，用户也可以直接点名某个机器人。

## 2. 来源与目标位置

- 原始仓库：`C:\Users\z3635\官网改动\github\agency-agents-main\agency-agents-main`
- 原始格式：各业务目录中的 Markdown 机器人定义
- Codex 中间产物：`integrations\codex\agents\<slug>.toml`
- Codex 全局安装目录：`C:\Users\z3635\.codex\agents`
- 配套中文使用指南：工作区 `docs` 目录中的独立 Markdown 文档

原始英文机器人定义是职责判断的权威来源。网页中文说明只用于辅助理解，不以其中的机翻措辞作为机器人名称或安装依据。

## 3. 团队成员

| 机器人 | 原始文件 | 核心职责 | 典型交付物 |
|---|---|---|---|
| Product Manager | `product/product-manager.md` | 产品总控、需求定义、路线图与上线复盘 | PRD、机会评估、Now/Next/Later 路线图、上线方案 |
| Trend Researcher | `product/product-trend-researcher.md` | 市场趋势、竞品和机会研究 | 趋势报告、竞品分析、机会清单 |
| Behavioral Nudge Engine | `product/product-behavioral-nudge-engine.md` | 留存、参与和转化机制创意 | 行为引导方案、激励与召回策略 |
| UX Researcher | `design/design-ux-researcher.md` | 用户研究、可用性验证和用户视角 | 研究计划、用户画像、用户旅程、研究结论 |
| Feedback Synthesizer | `product/product-feedback-synthesizer.md` | 多渠道反馈归类、归因和洞察 | 反馈主题、问题证据、机会与优先级建议 |
| Sprint Prioritizer | `product/product-sprint-prioritizer.md` | 需求池和迭代优先级 | RICE、Kano、价值/成本矩阵、迭代清单 |
| Analytics Reporter | `support/support-analytics-reporter.md` | 指标体系、漏斗、分群和经营分析 | 指标看板定义、分析报告、决策建议 |
| Rapid Prototyper | `engineering/engineering-rapid-prototyper.md` | 快速构建可操作 Demo 和 MVP | HTML/前端原型、验证版 Demo、迭代建议 |
| UI Designer | `design/design-ui-designer.md` | Demo 视觉、交互组件和设计规范 | 页面方案、组件规范、视觉与交互说明 |
| Senior Project Manager | `project-management/project-manager-senior.md` | 将规格转换为可执行任务并控制范围 | 任务清单、依赖、范围说明、交付计划 |
| Evidence Collector | `testing/testing-evidence-collector.md` | 基于截图和实际交互收集验收证据 | 截图证据、交互结果、缺陷记录 |
| Reality Checker | `testing/testing-reality-checker.md` | 对照需求和证据执行最终质量判断 | 验收结论、差距清单、上线准备度 |

## 4. 职责边界

- Product Manager 对最终产品定义负责，其他机器人为其提供研究、数据、设计、交付和验收输入。
- Trend Researcher 负责外部市场与竞品，Feedback Synthesizer 负责内部用户反馈，两者不得把推测写成用户事实。
- UX Researcher 负责真实研究方案和用户证据；缺少样本时只能输出待验证假设。
- Rapid Prototyper 负责把方案做成可运行 Demo，UI Designer 负责视觉与交互质量，两者通过明确页面清单和状态说明交接。
- Evidence Collector 负责取证和问题记录，Reality Checker 负责根据需求与证据作出通过、需要改进或阻塞判断。
- Senior Project Manager 只拆解已确认范围，不擅自给 PRD 增加功能。

## 5. 工作流与交接

### 5.1 创意与机会

1. Trend Researcher 提供市场、竞品和趋势依据。
2. Behavioral Nudge Engine 从游戏平台参与、留存和转化角度形成机制创意。
3. UX Researcher 检查创意是否符合目标用户场景，并标出需要验证的假设。
4. Product Manager 汇总为机会评估，明确目标、非目标和成功指标。

### 5.2 需求定义与排期

1. Feedback Synthesizer 整理用户反馈证据。
2. Analytics Reporter 补充指标现状、漏斗或分群结论。
3. Product Manager 编写或完善 PRD。
4. Sprint Prioritizer 对候选需求执行 RICE、Kano 或价值/成本排序。
5. Senior Project Manager 把确认后的 PRD 拆成可执行任务和依赖。

### 5.3 Demo 验证

1. Product Manager 给出核心场景、页面范围和验收目标。
2. UI Designer 产出页面结构、组件与关键状态说明。
3. Rapid Prototyper 生成可操作 Demo。
4. UX Researcher 从用户任务完成角度评审 Demo，意见回流给 Product Manager。

### 5.4 需求验收

1. Product Manager 提供 PRD、验收标准和待验版本。
2. Evidence Collector 操作实际页面，记录截图、交互结果和缺陷。
3. Reality Checker 对照 PRD 与证据给出最终结论。
4. 未通过项返回 Senior Project Manager，转为明确的修复任务。

## 6. 调用方式

安装后的机器人使用原始英文名称，避免 Codex 路由与源仓库更新时发生名称偏差。中文使用指南提供以下两种入口：

- 直接点名：例如“使用 Feedback Synthesizer 分析这批用户反馈”。
- 按任务描述：例如“帮我判断这些需求的优先级”，由主助手选择 Sprint Prioritizer。

团队不是常驻后台服务。机器人只在被调用时参与当前任务，输出通过文档或明确的交接摘要传给下一角色。

## 7. 不纳入首批安装的机器人

- Game Designer：偏玩法、数值、关卡和游戏经济系统，不匹配游戏平台产品主线。
- Agents Orchestrator：面向开发—测试自动流水线，内置较强的工程流程假设，不作为日常产品总控。
- Experiment Tracker：有明确 A/B 测试需求后再增加。
- Persona Walkthrough Specialist：主要面向网页分屏和转化评审，使用场景较窄。
- Test Results Analyzer：适合已有大批结构化测试结果时使用。
- Executive Summary Generator、Meeting Notes Specialist：属于效率扩展，不是本次九类核心工作所必需。

## 8. 安装和冲突处理

- 只生成和安装上述 12 个机器人，不全量安装仓库中的 230 多个机器人。
- 安装前记录目标目录中已有文件；同名文件存在时先比较内容，不静默覆盖。
- 转换失败时保留原始 Markdown，不产生半成品 TOML。
- 单个机器人失败不影响其他机器人校验，但整体结果必须明确列出成功、跳过和失败项。
- 不修改仓库原始机器人定义，不修改工作区中与本任务无关的文件。

## 9. 验收与测试

安装完成需满足以下条件：

1. `C:\Users\z3635\.codex\agents` 中存在 12 个目标 TOML 文件。
2. 每个 TOML 均可解析，并包含非空的 `name`、`description` 和 `developer_instructions`。
3. 每个 TOML 的名称、描述和正文均能追溯到对应原始 Markdown。
4. 目标目录中的既有非目标机器人未被修改或删除。
5. 中文使用指南完整列出 12 个机器人、适用场景、示例指令和推荐交接顺序。
6. 安装结果报告明确说明 Codex 何时能够识别新机器人；若需要开启新会话，应在报告中提示。

## 10. 成功标准

- 用户能根据日常产品任务在 30 秒内找到合适的机器人。
- 九类目标工作均有明确主责机器人，不依赖职责猜测。
- Demo、PRD 和验收形成可追溯的交接链路。
- 不以增加角色数量为目标；新增机器人必须对应新的稳定工作场景。

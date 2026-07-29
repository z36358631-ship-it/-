# AI 资深玩家盲评方法

## 当前状态

`NOT EXECUTED`。工具与契约测试已存在，但当前没有完整的基线矩阵：必须恰好有 6 类评审 × 3 款游戏 = 18 份报告，每份恰好 3 局，共 54 个互不重复的 `runId`。现有预检截图不能替代正式报告。

AI 评审只能形成内部产品假设，不能替代真实用户研究、微信真机或生产数据。

## 评审角色与批次

批次一：

1. `action`：动作手感、瞄准、碰撞、即时反馈。
2. `casual`：上手成本、轻度节奏、短局重玩动机。
3. `puzzle`：规则可读性、规划空间、失败可归因性。

批次二：

4. `roguelite`：局内构筑、路线差异、三局变化。
5. `tower-defense`：阵型、换路、集火和救场决策。
6. `skeptical-generalist`：挑剔综合审查，重点识别“画面好但玩法空”。

每名评审者在不阅读设计文档的情况下，对三款游戏分别完成恰好三局：

- 第一局：不使用提示，观察 30 秒内是否理解目标。
- 第二局：主动更换策略。
- 第三局：判断变化是否真实，并在失败后决定是否愿意主动再玩。

优先使用移动视口和真实浏览器触摸。无法进行浏览器触摸时必须将 `interactionMode` 写为 `evidence-review`；该模式保留意见，但不得贡献主动再玩票。

## 每份报告的证据

每份 `report.json` 必须包含：

- 固定 `buildCommit`、`roundId`、角色、游戏和唯一矩阵格；
- `interactionMode`；
- 三个唯一 `runId`；
- 每局胜负、首次输入时间、首次正反馈时间和策略标签；
- 截图、Playwright trace、事件日志路径；
- 页面错误、控制台错误、请求失败与外部请求记录；
- 八项 0–100 整数分；
- `wouldReplay`；
- 至少三项优点、三项问题；
- 事实、推断、个人评价与未验证项分开记录。

运行器只收集机器证据，不自动生成主观分数。

## 八项评分与决定

权重：

| 维度 | 权重 |
| --- | ---: |
| 前 30 秒吸引力 `first30Seconds` | 15% |
| 输入反馈 `inputFeedback` | 15% |
| 决策主动性 `decisionAgency` | 15% |
| 三局变化 `threeRunVariety` | 15% |
| 失败后重玩冲动 `failureReplayUrge` | 10% |
| 视听质量 `audiovisualQuality` | 15% |
| 局外返回理由 `metaReturnReason` | 10% |
| 完整度 `completeness` | 5% |

决定规则：

- `RETAIN`：加权均分 ≥75、所有维度均分 ≥60、至少 4/6 个有效主动再玩票、无 P0/P1。
- `REWORK`：总分 60–74、任一核心维度 <60、只有 2–3 个有效再玩票，或出现 P1。
- `DROP`：总分 <60、只有 0–1 个有效再玩票，或两轮返工后仍失败。
- `INCOMPLETE`：缺少任何角色、游戏、三局证据或构建一致性；不得形成保留或淘汰决定。

每款游戏最多 `rework-1`、`rework-2` 两轮，不允许 `rework-3` 或人工改写为 `RETAIN`。

## 执行命令

示例会话：

```powershell
node games/wechat-h5-v2/tools/run-ai-playtest-session.mjs --round baseline --game ricochet-crew --reviewer action --output games/wechat-h5-v2/test-results/ai-playtests/baseline/action-ricochet-crew
```

单份报告校验：

```powershell
node games/wechat-h5-v2/tools/validate-ai-playtest-report.mjs <report.json>
```

完整基线矩阵校验：

```powershell
node games/wechat-h5-v2/tools/validate-ai-playtest-matrix.mjs --root games/wechat-h5-v2/test-results/ai-playtests/baseline --round baseline --roles action,casual,puzzle,roguelite,tower-defense,skeptical-generalist --games ricochet-crew,monster-night-market,three-lane-squad --expected-reports 18 --expected-runs 54
```

在矩阵校验通过之前，不运行正式汇总，不发布保留决定。

## 与真实用户的边界

当前：

- AI 六角色完整盲评：`NOT EXECUTED`
- 真实目标用户可用性测试：`NOT EXECUTED`
- D1/D7 留存、三局完成率和主动重玩率：`NOT EXECUTED`
- 微信生产环境用户行为：`NOT EXECUTED`

后续真实用户测试必须独立招募、知情同意、记录任务成功率和定性反馈；不得把 AI 角色票数当作用户样本量。

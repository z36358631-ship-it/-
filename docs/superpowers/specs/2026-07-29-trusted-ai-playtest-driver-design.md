# 微信 H5 V2 可信 AI 试玩闭环设计

**状态：** 已批准  
**批准日期：** 2026-07-29  
**适用项目：** `games/wechat-h5-v2`  
**批准方向：** 方案 A——原子 runner、白名单本机 IPC、完整证据链和单游戏三局试点

## 1. 背景

三款微信 H5 游戏已经具备正式试玩 runner、报告校验器和交付校验器，但独立审计发现当前绿色测试仍不能证明“AI 确实通过普通入口看画面并完成真实触摸”：

1. 合成 PNG、简化事件和伪造 trace 仍可能组成可通过交付校验的报告。
2. runner 对输出目录采用“先检查、后创建”，两个同矩阵单元的进程可能混合截图、事件和 trace。
3. runner 生成的 `session-evidence.json` 没有进入正式报告和最终交付的哈希引用链。
4. trace 只按固定文件名计入体积限制，改名可能绕过限制；现有截图型 trace 又可能超过实际交付上限。
5. runner 独占浏览器页面，但没有安全接口让外部 AI 玩家查看画面并提交真实触摸。

本设计建立一个最小、可审计、可失败关闭的闭环。只有该闭环通过“1 个角色 × 1 款游戏 × 3 局”试点后，才允许扩展至 18 个矩阵单元和 54 局正式试玩。

## 2. 目标与非目标

### 2.1 目标

- AI 玩家只能看到普通用户可见的截图、可见文字和可见控件位置。
- AI 玩家只能提交真实触摸，不得调用任意页面脚本、CDP、debug、存档、固定 seed 或加速。
- runner 始终独占 browser、context、page、tracing、遥测和证据写入。
- 每个矩阵单元只能被一个 runner 原子占有，所有证据文件不可覆盖。
- 正式报告必须哈希引用 runner 的会话证明、入口截图、三局截图、事件和 trace。
- 校验器从生产事件和会话证明重新计算关键事实，不采信报告自报。
- 任何缺失、竞态、越权、断线、第四局或证据不一致都使整个三局单元 `INCOMPLETE`。

### 2.2 非目标

- 不把 AI 玩家意见描述为真实用户研究、D1/D7 留存或微信生产验证。
- 本阶段不实现公网远程控制、多人同时控制同一页面或自动求解器。
- 本阶段不声称本地执行证据具有第三方不可伪造性。
- 可信 CI 签名属于后续增强层，不替代本设计的可见信息与触摸权限约束。

## 3. 信任边界与术语

### 3.1 参与者

- **主管：** 冻结提交、启动服务、派发 AI 玩家、复核报告和决定是否扩展矩阵。
- **runner：** 唯一持有浏览器对象，负责 URL、源码、dist、遥测、截图、trace 和证据生命周期。
- **AI driver：** 外部 AI 玩家的受限客户端，只调用白名单动作。
- **报告校验器：** 重新验证会话证明和所有引用证据，并重新计算机器事实。
- **交付校验器：** 验证 Git 快照、允许文件、矩阵完整性、体积和哈希。

### 3.2 真实性等级

最终交付必须区分：

- `packageAuthenticated=true`：包内每个字节与固定 Git 提交一致。
- `executionTrust="local-audited"`：本地 runner 证据通过完整契约校验。
- `independentlyAttested=false`：没有可信 CI 或第三方签名，不得描述为独立不可伪造执行。

原有含糊的 `authenticated` 字段不得被解释为“试玩行为经过第三方认证”。

## 4. 总体架构

```text
主管
 ├─ 固定 Git commit + 单一 4173 dist 服务
 ├─ runner
 │   ├─ browser/context/page
 │   ├─ 三局生命周期状态机
 │   ├─ 遥测、PNG、trace、动作审计
 │   ├─ 本机白名单 IPC
 │   └─ 原子、不可覆盖的会话目录
 └─ AI driver
     ├─ capture
     ├─ visible
     ├─ touch tap/gesture
     └─ heartbeat

runner evidence
  → report.json 哈希引用
  → 单报告校验
  → 18 格 matrix 校验
  → Git 快照交付校验
```

runner 和 AI driver 不共享 page handle、browser endpoint、CDP endpoint 或任意 `evaluate` 能力。

## 5. runner 原子生命周期

### 5.1 单元占有

1. runner 要求输出父目录已经存在。
2. runner 使用 `mkdir(output, { recursive: false })` 原子创建最终单元目录。
3. 目录已存在时立即失败，不执行浏览器启动。
4. 同一目录内所有固定文件通过临时文件加独占创建写入，再原子重命名；目标存在时失败。
5. 不使用先 `pathExists()` 再创建的检查方式。

这样第二个同 cell runner 无法进入，截图、事件和 trace 也不能被另一会话覆盖。

### 5.2 资源清理

从第一次 `chromium.launch()` 前开始进入统一 `try/finally`：

- browser、context、page 和 tracing 分阶段记录是否成功创建；
- 初始化任一步失败都关闭已创建资源；
- tracing stop 失败不能阻止 `session-evidence.json` 落盘；
- 缺失 trace 时证据状态固定为 `INCOMPLETE`，并记录原始错误；
- 清理错误追加到诊断数组，不覆盖首个失败原因。

### 5.3 结束状态

- `CAPTURED`：恰好三局、所有证据完整、首尾源码与 dist 证明一致。
- `INCOMPLETE`：任一门禁失败、driver 失联、资源异常、证据缺失或三局状态机不完整。

无论成功或失败，runner 都尝试以不可覆盖方式写入 `session-evidence.json`。只有 `CAPTURED` 会话可以被提升为正式报告。

## 6. 白名单本机 IPC

### 6.1 传输

- runner 只监听 `127.0.0.1` 的随机空闲端口。
- 每个会话生成 256 位随机 bearer token 和独立 `sessionId`。
- 连接描述文件写入操作系统临时目录，不进入证据目录、Git 或交付包。
- 描述文件通过独占创建写入；会话结束后删除。
- 请求必须同时包含 token、sessionId、递增请求序号和唯一 `actionId`。

本阶段信任同一 Windows 用户，token 用于隔离并发会话和阻止误连，不宣称能抵御拥有本机管理员权限的攻击者。

### 6.2 允许的读取

- `ready`：返回 `sessionId`、`gameId`、390×844 视口、`frameSeq`、允许动作和当前三局阶段。
- `capture`：生成当前页面 PNG，返回新 `frameSeq` 和图片路径。
- `visible`：返回当前可见的 `body.innerText`，以及可见交互控件的临时编号、可见名称、enabled 状态和视口矩形。
- `heartbeat`：维持 driver 租约，不改变游戏状态。

`visible` 不返回 HTML、selector、隐藏元素、dataset、localStorage、页面全局变量或 Canvas 内部对象。

### 6.3 允许的触摸

- `touchTap(x, y, frameSeq, actionId)`
- `touchBegin(x, y, frameSeq, actionId)`
- `touchMove(x, y, gestureId, actionId)`
- `touchEnd(x, y, gestureId, actionId)`
- `touchCancel(gestureId, actionId)`

约束：

- 所有坐标必须位于 390×844 视口。
- `touchTap` 使用 Playwright touchscreen；连续手势由 runner 使用浏览器触摸输入实现。
- 旧 `frameSeq`、重复 `actionId`、并发动作、第三局结束后的动作和第四局请求全部拒绝。
- 同一时间最多一个手势；手势租约固定为 2 秒，超时自动 cancel 并使该动作失败。
- 夜市允许在 `touchMove` 后、`touchEnd` 前调用一次 `capture` 读取可见预演。
- 每次触摸都写入不可覆盖的动作审计记录，包括请求时间、执行时间、坐标、对应 `frameSeq`、结果和当时的 runId；不记录页面内部状态。

### 6.4 心跳与断线

- driver 每 2 秒发送一次 heartbeat。
- 连续 10 秒无 heartbeat 时关闭动作入口，取消未完成手势并把单元标为 `INCOMPLETE`。
- runner 不自动续玩、不自动重试动作、不替 AI 选择策略。

## 7. 三局与截图竞态控制

runner 的遥测轮询仍是三局权威：

1. 观察到新 `run_start` 后，动作入口进入对应 run。
2. runner 截取 `run-N-start.png` 后才向 driver 返回 `runStarted(N)`。
3. 观察到 `run_end` 后立即关闭触摸，等待页面稳定至少 1 秒，再截取 `run-N-result.png`。
4. `run-N-result.png` 写入成功并完成事件封存后，才返回 `runRecorded(N)`。
5. 前两局只有收到 `runRecorded` 才允许 driver 点击重玩。
6. 第三局 `runRecorded(3)` 后永久关闭动作入口。

同一次首次轮询同时发现同一 run 的 start 和 end 仍按快局竞态作废，不补拍、不推断。

## 8. 正式证据结构

每个有效矩阵单元固定包含：

```text
entry.png
session-evidence.json
session-actions.jsonl
session-trace.zip
report.json
run-1-start.png
run-1-result.png
run-1-events.json
run-2-start.png
run-2-result.png
run-2-events.json
run-3-start.png
run-3-result.png
run-3-events.json
```

`report-draft.json` 只用于填写过程，正式提升前移动到矩阵根目录之外的草稿区，不进入最终单元或交付包。

正式 `report.json` 新增强制字段：

```json
{
  "sessionEvidencePath": "session-evidence.json",
  "sessionEvidenceSha256": "64位小写SHA-256",
  "entryScreenshotPath": "entry.png",
  "entryScreenshotSha256": "64位小写SHA-256",
  "actionLogPath": "session-actions.jsonl",
  "actionLogSha256": "64位小写SHA-256",
  "tracePath": "session-trace.zip",
  "traceSha256": "64位小写SHA-256"
}
```

三局共享且只能共享规范路径 `session-trace.zip`，不能改名规避体积规则。

## 9. 证据校验

### 9.1 会话证明

校验器必须验证并哈希匹配：

- `status === "CAPTURED"`
- 精确普通入口 `http://127.0.0.1:4173/<gameId>/`
- `expectedCommit`、首尾 HEAD 和报告 `buildCommit` 完全一致
- 首尾源码 clean
- 首尾 served-dist 文件集合、逐文件 SHA-256 和 aggregate 一致
- 恰好三组 run、三个唯一 runId
- `testMode=false`、`timeScale` 未暴露或为 1
- IPC 未出现越权动作、重复 actionId、旧 frameSeq、超时手势或断线

### 9.2 生产事件

每个事件必须完整包含并校验：

- `schemaVersion`
- `eventId`
- `sessionId`
- `gameId`
- `runId`
- `seq`
- `event`
- `clientAt`
- `testMode`
- `payload`

校验器要求 eventId 唯一、sessionId/gameId/runId 一致、seq 严格递增、clientAt 非递减、首尾边界唯一，并重新计算 outcome、firstInputMs 和 firstPayoffMs。

### 9.3 PNG

所有正式 PNG 必须：

- 完整解析 PNG signature、chunk 长度、CRC、单个 IHDR 和 IEND；
- 宽高严格为 390×844；
- 解码成功且像素数据非空；
- 同一局开始/结算图 SHA-256 不同；
- 六张局截图路径和哈希全局唯一；
- 单图不超过 8 MiB。

1×1 占位图、截断 PNG、错误 CRC 和只有 IHDR 的合成文件全部拒绝。

### 9.4 Playwright trace

runner 使用：

```text
screenshots=false
snapshots=true
sources=false
```

独立开始/结算 PNG 和动作日志承担可见画面证据，trace 用于证明页面生命周期、导航、网络和动作时序，避免 Canvas 连续截图造成数百 MiB 文件。

校验器必须解压并解析真实 Playwright trace JSONL，验证：

- `trace.trace`、`trace.network`、`trace.stacks` 和 `resources/*` 非空；
- 存在 context-options、page/navigation、普通入口 URL 和时间范围；
- trace 时间范围覆盖三局会话；
- 网络请求只访问允许的 127.0.0.1:4173 资源；
- trace 中的页面生命周期与 session evidence 一致；
- ZIP 条目无重复、路径穿越、加密、数据描述符欺骗或异常压缩比。

单 trace 上限保持 128 MiB，18 单元总 trace 上限保持 1 GiB。Ricochet 试点必须证明关闭 trace screenshots 后低于该上限，否则不得启动正式矩阵。

### 9.5 动作审计

`session-actions.jsonl` 必须：

- 每行是完整 JSON；
- actionId 全局唯一，请求序号严格递增；
- frameSeq 不倒退；
- 坐标在视口内；
- 触摸事务成对结束或取消；
- 三局结束后没有成功动作；
- 每局至少一个成功真实触摸，并与生产 `first_input` 的时间关系合理。

动作日志只能证明 runner 执行了触摸请求，不作为游戏 outcome 的来源。

## 10. 报告、矩阵与交付

- 单报告 validator 先验证 `session-evidence.json`，再验证报告和所有引用文件。
- matrix 只接受 18 个精确 `<role>-<game>/report.json`，并重新检查 18 个 sessionId 和 54 个 runId 全部唯一。
- delivery 只允许矩阵、正式报告及其精确引用文件；`entry.png`、`session-evidence.json` 和动作日志必须进入包。
- delivery 按报告引用识别 trace，而不是按任意扩展名或宽松正则识别。
- 所有允许文件必须来自固定 Git commit；包侧验证重新执行完整 matrix 校验。
- 输出报告明确写出 `packageAuthenticated`、`executionTrust` 和 `independentlyAttested`，不混淆包完整性与执行真实性。

## 11. 错误处理与作废

以下任一情况作废整个三局单元：

- 输出目录已存在或发生任意独占写冲突；
- 源码、URL、dist、session evidence 或哈希不一致；
- IPC token/session 不一致、重复 actionId、旧 frameSeq、手势超时或 driver 失联；
- 任意非白名单读取或动作请求；
- 少于或多于三局、生命周期重叠/重复/乱序、第四局或快局竞态；
- 任一局缺少 `first_input`、开始/结算 PNG、事件或 trace；
- PNG、事件、trace 或动作日志解析失败；
- browser/context/page/tracing 初始化或清理异常。

作废单元保留在正式矩阵根目录之外的 `invalid/<timestamp>/`，不得删除、覆盖或拼接重用。

## 12. 测试策略

### 12.1 单元与集成负例

必须先写失败测试覆盖：

- 两个 runner 同时争夺同一输出目录；
- 固定截图、trace 和 JSON 的覆盖尝试；
- browser、context、page、tracing 各初始化阶段异常后的清理；
- trace stop 失败仍写出 `INCOMPLETE`；
- 旧 frameSeq、重复 actionId、错误 token、并发动作、手势超时和断线；
- 1×1、截断、错误 CRC、同图冒充首末截图；
- 缺生产事件字段、seq/clientAt 异常、session/game/run 不一致；
- 伪造 ZIP、改名 trace、恶意压缩比和缺真实 trace 记录；
- 缺失或篡改 session evidence、动作日志和入口截图；
- 包完整性字段冒充执行真实性。

### 12.2 最小真实试点

固定选择：

- 游戏：`ricochet-crew`
- 角色：`casual`
- 入口：`http://127.0.0.1:4173/ricochet-crew/`
- 局数：恰好 3 局
- 视口：390×844

AI 玩家必须通过 CLI 调用白名单 IPC，主管使用返回的 PNG 进行可见画面复核。试点验收：

1. 三局均有 `run_start → first_input → run_end`。
2. 产生六张有效 390×844 PNG。
3. trace 小于 128 MiB，且包含可解析的真实 Playwright 生命周期。
4. session evidence、动作日志和报告哈希一致。
5. 单报告 validator、matrix 的单元级夹具和 delivery 负例全部通过。
6. 尝试 CDP、evaluate、旧 frameSeq、重复动作和第四局均被拒绝。
7. driver 断线试验只得到 `INCOMPLETE`，runner 不自动续玩。

试点未通过时只修复闭环，不开始其余 17 个矩阵单元。

## 13. 推广顺序

1. 实现原子 runner 与资源清理。
2. 实现白名单 IPC 和动作审计。
3. 扩展 session evidence、报告 schema、validator 和 delivery。
4. 补齐 PNG、事件和 trace 严格解析。
5. 完成 Ricochet casual 三局真实试点。
6. 在新固定 commit 上重新构建并校验 dist。
7. 分三批执行 6 类玩家 × 3 游戏 × 3 局。
8. 三款均达到 `RETAIN` 后继续完成 480 分钟真实主动协作门禁。
9. 生成非生产评审 ZIP 和 SHA-256。

## 14. 最终边界

即使 54 局 AI 试玩和本地交付全部通过，最终仍必须明确：

- 真实目标用户测试：`NOT EXECUTED`
- 微信开发者工具/真机：`NOT EXECUTED`
- HTTPS 生产域名：`NOT EXECUTED`
- 微信生产上线：`NO-GO`
- 第三方独立执行签名：`NOT EXECUTED`

AI 玩家结论只用于内部产品筛选和返工决策。

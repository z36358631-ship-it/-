# Codex Turn 启动通知缓冲设计

## 背景

个人产品经理工作台在真实 Codex 0.130.0 联调中，连续复用同一 Requirement Thread 执行三个 Workflow。前两个 Turn 完成后，第三个 `turn/start` 在响应返回前收到上一 Turn 的迟到通知。

当前 `RunManager` 在 Active Run 尚无 `turnId` 时，会把同一 Thread 上第一条带 `turnId` 的通知直接绑定为新 Turn。迟到通知因此抢占新 Run，随后与 `turn/start` 响应中的权威 Turn ID 不一致，Run 失败：

```text
Codex turn/start response did not match the notification turn id
```

该问题发生在真实只读链路；写入链路尚未开始，受保护 Demo、PRD 和候选文件均未变化。

## 目标

- 以 `turn/start` 响应中的 Turn ID 为唯一权威身份。
- 支持合法通知早于 `turn/start` 响应到达，包括快速完成。
- 隔离同一 Thread 上旧 Turn 的迟到或乱序通知。
- 缓冲必须有界、可清理、可诊断，不能静默丢失当前 Turn 的事件。
- 三类 Run 共用同一实现：只读 Run、结构化 Workflow、写入 Run。

## 非目标

- 不修改 Codex App Server 协议。
- 不改变 Requirement 与 Thread 的绑定策略。
- 不放宽并发限制、审批策略或文件安全边界。
- 不实现跨 Broker 的通知恢复；Broker 重启仍按现有 interrupted/recovery ledger 处理。

## 方案

### 1. 启动期状态

每个 Active Run 增加仅存在于内存的启动缓冲：

- `turnStartPending`：`turn/start` 请求是否尚未取得响应。
- `pendingNotifications`：按到达顺序保存通知。
- `pendingNotificationBytes`：缓冲的近似 JSON 字节数。
- `staleNotificationCount`：响应后被判定为其他 Turn 的通知数量。

缓冲上限固定为：

- 最多 512 条通知。
- 序列化后最多 1 MiB。

任一上限超出时，当前 Run 以明确错误失败，并沿用既有 finalization 清理计时器、Active Map 和审批状态。不得截断后继续。

### 2. 通知接收

`#onNotification` 按以下顺序路由：

1. 已通过 `activeByTurn` 找到 Active Run：按现有逻辑处理。
2. 尚无权威 `turnId`，但 `activeByThread` 找到正在启动的 Run：
   - 仅接收 Thread ID 精确匹配且包含 Turn ID 的通知。
   - 不绑定 `active.turnId`，只进行有界缓冲。
3. 其他通知忽略，不跨 Thread 推断归属。

缓冲期间不持久化事件，避免旧 Turn 通知写入新 Run。

### 3. 响应确认与回放

`turn/start` 响应返回后：

1. 解析响应中的 Turn ID。
2. 将其写入 Active Run、`activeByTurn` 和数据库。
3. 停止启动缓冲。
4. 按原始到达顺序检查缓冲：
   - Turn ID 与响应一致：交回正常通知处理器。
   - Turn ID 不一致：丢弃并累计 `staleNotificationCount`。
5. 若存在丢弃项，写一条不包含通知正文的诊断事件：

```json
{
  "type": "workbench/stale-turn-notifications-dropped",
  "payload": {
    "count": 1
  }
}
```

匹配的 `turn/completed` 可在回放时正常完成 Run。此时启动方法返回数据库中的终态 Run，不再重新注册 Active Turn。

### 4. 清理

以下路径必须清空缓冲并释放引用：

- `turn/start` 成功并完成回放。
- `turn/start` 失败或超时。
- 用户取消。
- Run 超时。
- App Server 退出。
- Run 正常或异常 finalization。

不在数据库中保存通知正文。

## 错误处理

- 缓冲超限：Run 失败，错误文本明确包含 `turn/start notification buffer exceeded`。
- 响应缺少 Turn ID：沿用现有协议错误，缓冲随 Run 清理。
- 响应后只有旧 Turn 通知：记录丢弃数量，新 Turn 继续等待自己的通知。
- 匹配通知在回放中完成 Run：只 finalization 一次。
- 真正属于当前 Turn 但响应 ID 不匹配：以响应 ID 为权威，不接受通知侧覆盖。

## 测试

必须新增自动化测试：

1. 第三 Turn 启动前收到第二 Turn 的迟到通知，旧 ID 被丢弃，新 ID 正常绑定。
2. 当前 Turn 的 `turn/completed` 早于响应，响应后回放并只完成一次。
3. 多条当前 Turn 通知按原顺序持久化。
4. 旧、新 Turn 通知交错时只回放新 Turn。
5. 条数上限与字节上限分别 fail-closed。
6. 启动失败、取消和超时后缓冲为空且 Active Map 释放。
7. 只读、Workflow、写入三条启动路径共享相同行为。

修复后执行：

```powershell
npm.cmd run workbench:test
node tools/verify-personal-codex-workbench-real.mjs
npm.cmd run workbench:verify-ui
```

真实联调验收必须满足：

- 只读 Run 完成。
- 三个结构化 Workflow 连续复用同一 Requirement Thread 并完成。
- 隔离候选文件生成、审批、差异、验证完成。
- 候选文件通过工作台恢复，最终不存在。
- 已登记 Demo、PRD 的前后 SHA-256 一致。

## 风险与回退

- 风险：缓冲过小会使极快 Turn 失败。512 条、1 MiB 只覆盖响应前短窗口；超限显式失败比静默丢事件安全。
- 风险：回放递归再次进入启动缓冲。实现必须先关闭 `turnStartPending` 并绑定权威 Turn ID，再回放。
- 回退：该改动只影响启动期路由；可单独回退，不涉及数据库迁移和文件恢复数据。

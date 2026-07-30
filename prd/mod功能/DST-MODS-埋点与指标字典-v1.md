# DST MODS 埋点与指标字典 v1

## 1. 文档范围与权威性

本文定义《饥荒联机版》DST 外部非官方 MODS 在 Mac、APP 竖屏、APP 横屏和 APP 运行中旋转场景下的事件、字段、枚举、触发点、去重键和指标公式。

- 适用游戏固定为 `game_id = steam:322330`。
- 本版只定义本文列出的 11 个客户端业务事件，不新增创意工坊、账号或内容发布事件。
- 设备安装、任务、启动清单和实际加载证据分别以当前设备状态库、任务管理器、`ResolvedLaunchManifest` 和 `ActualLoadEvidence` 为事实源。
- 安装成功、启用、进入启动清单和实际加载是四个不同事实，不得互相替代。
- 本文是 Task 5 的线上计算与验收权威。本文与主 PRD V1.3 出现差异时停止放量，以本文口径排查并把同一口径回写主 PRD；完成同版本评审后再恢复。
- 所有比例结果保留分子、分母、样本状态和字典版本，不只保存最终百分比。

## 2. 事件清单

V1 事件总数固定为 11：

```text
mods_entry_view
mods_detail_view
mods_install_click
mods_download_result
mods_install_result
mods_enable_change
mods_update_result
mods_uninstall_result
mods_preflight_result
mods_launch_result
mods_recovery_action
```

没有列入本清单的 `mods_*` 名称不得直接进入 V1 生产表。新增、拆分或改名必须提升字典版本，并同步主 PRD、客户端、数据仓库、看板和验收用例。

## 3. 公共上报合同

### 3.1 所有事件都必须携带的字段

所有 11 个事件的 payload 都必须出现下表字段。允许为空的字段也必须显式传 `null`，不得省略或用空字符串代替。

|字段|类型|是否可空|规则|
|---|---|---:|---|
|`event_id`|UUID string|否|一次业务触发生成一次并持久化；网络重传、进程恢复和批量补传必须复用原值|
|`event_name`|本字典 11 个事件之一|否|必须与对应事件名完全一致|
|`schema_version`|string|否|本版固定为 `dst_mods_analytics_v1`|
|`event_time`|带时区 ISO 8601 string|否|客户端业务事实发生时间，不得用服务端入库时间代替|
|`event_timezone`|IANA timezone string|否|事件发生时设备时区，用于完整自然日归属|
|`game_id`|string|否|固定为 `steam:322330`|
|`mod_id`|string 或 null|是|入口级、启动级或整轮失败事件可为 `null`；MOD 级事件必填|
|`mod_version`|string 或 null|是|安装、更新和启动清单项使用本地目标版本；入口级或整轮事件可为 `null`|
|`device_installation_id`|string|否|当前设备级安装标识，不得用账号 ID、广告 ID 或其他设备的标识代替|
|`device_platform`|`mac` 或 `app`|否|客户端平台|
|`screen_orientation`|`portrait`、`landscape` 或 `not_applicable`|否|Mac 固定为 `not_applicable`；APP 取业务触发时方向|
|`channel_package`|string|否|取不可变构建元数据；Mac 使用 `mac`，APP 使用实际 `official`、国内渠道标识、`Global` 或 `GooglePlay`|
|`language`|BCP 47 string|否|业务触发时客户端界面语言，例如 `zh-CN`、`en-US`|
|`client_build`|string|否|可唯一定位二进制的构建号或构建哈希|
|`source_id`|string 或 null|是|MOD 级事件必填；入口级或无法解析来源的整轮失败事件可为 `null`|
|`source_mod_id`|string 或 null|是|与 `source_id` 同时出现；MOD 级事件必填|
|`task_id`|string 或 null|是|根任务 ID；下载、校验、安装和更新结果必填；未产生任务的取消点击可为 `null`|
|`package_hash`|SHA-256 小写十六进制 string 或 null|是|下载包、安装、更新和启动清单项必填；多 MOD 启动汇总事件可为 `null`|
|`launch_id`|string 或 null|是|启动检查项、启动结果和已执行恢复动作关联的启动必填|
|`manifest_id`|string 或 null|是|已生成启动清单的预检查项和启动结果必填|
|`operation`|本文定义的 operation enum|否|表示本次业务动作，不从页面文案推断|
|`result`|`success`、`failure`、`cancelled`、`skipped` 或 `risk`|否|必须使用对应事件允许的子集|
|`failure_reason`|本文 3.3 的枚举或 null|是|`success` 时必须为 `null`；`failure`、`cancelled`、`skipped`、`risk` 时必须填写|

### 3.2 公共扩展字段

下表字段只在对应事件要求时必填，其他事件传 `null` 或空数组。

|字段|类型|用途|
|---|---|---|
|`view_session_id`|string 或 null|一次可见页面/详情会话；旋转和页面框架重建时保持不变|
|`operation_id`|string 或 null|一次用户业务操作；同一次操作的 UI 回调、任务回调和补传复用原值|
|`operation_attempt`|positive integer 或 null|同一任务的用户显式尝试序号，从 1 开始；自动重试不递增|
|`root_mod_id`|string 或 null|依赖包事件所属的根 MOD；根 MOD 自身事件与 `mod_id` 相同|
|`package_task_id`|string 或 null|共享依赖或单包任务 ID；根任务仍使用 `task_id`|
|`task_state`|任务状态 enum 或 null|记录结果产生时任务状态|
|`terminal_stage`|终态阶段 enum 或 null|失败分布和任务终态去重使用|
|`retry_count`|non-negative integer 或 null|任务管理器已执行的自动重试次数|
|`downloaded_bytes`|non-negative integer 或 null|下载终态已确认的有效字节数|
|`previous_enabled_value`|`enabled` 或 `disabled` 或 null|启停提交前值|
|`new_enabled_value`|`enabled` 或 `disabled` 或 null|启停成功后的持久化值；失败时等于回滚后的真实值|
|`update_fact`|`no_update`、`update_available`、`source_unknown` 或 null|当前设备更新事实|
|`preflight_round_id`|string 或 null|一次启动前检查轮次；旋转和页面重建时保持不变|
|`preflight_result`|`effective`、`skipped`、`risk` 或 null|`ResolvedLaunchItem.preflight_result` 原值|
|`load_decision`|`load`、`skip` 或 null|`ResolvedLaunchItem.load_decision` 原值|
|`reason_code`|本文 3.3 的枚举或 null|启动清单项原因；无原因时为 `null`|
|`dependency_chain`|string array|从根 MOD 到首个阻塞依赖的最短链；非依赖错误为空数组|
|`risk_confirmed`|boolean 或 null|风险项是否已由用户确认|
|`manifest_mod_count`|non-negative integer 或 null|`ResolvedLaunchManifest.items.length`，不只计算 `load` 项|
|`manifest_changed`|boolean 或 null|本次清单相对最近成功清单是否发生新安装、重新启用、版本或依赖变化|
|`launch_phase`|`startup`、`exit` 或 null|启动请求结果使用 `startup`；游戏进程退出结果使用 `exit`|
|`exit_type`|`running`、`normal`、`abnormal`、`not_started` 或 null|启动成功时先为 `running`；退出阶段为 `normal` 或 `abnormal`；未拉起为 `not_started`|
|`recovery_action_id`|string 或 null|一次已执行恢复动作的稳定 ID|
|`trigger_launch_id`|string 或 null|触发恢复建议的异常启动 ID|
|`recovery_action`|恢复动作 enum 或 null|三种允许的恢复动作之一|

数组统一按稳定顺序上报。`dependency_chain` 等数组顺序变化但内容未变时，不得生成新业务事件。

### 3.3 结果、状态与失败原因枚举

`result` 的公共全集为：

```text
success
failure
cancelled
skipped
risk
```

`failure_reason` 只能使用下列值：

|类别|允许值|适用说明|
|---|---|---|
|用户动作|`USER_CANCELLED`|用户取消风险确认或启动；未确认卸载和未执行恢复动作不产生结果事件|
|网络与下载|`NETWORK_UNAVAILABLE`、`DOWNLOAD_FAILED`、`DOWNLOAD_INTERRUPTED`|`DOWNLOAD_INTERRUPTED` 仅在 2 秒、5 秒、10 秒三次自动重试均失败后产生|
|来源|`MOD_DEPENDENCY_UNAVAILABLE`、`MOD_PLATFORM_INCOMPATIBLE`、`SOURCE_UNAVAILABLE`|目录服务来源、依赖或平台错误|
|依赖|`DEPENDENCY_UNRESOLVED`、`DEPENDENCY_VERSION_CONFLICT`|硬依赖闭包缺失；或 H1 已提交后后到根任务仍要求 H2|
|兼容与风险|`PLATFORM_INCOMPATIBLE`、`SOFT_CONFLICT`、`COMPATIBILITY_UNKNOWN`|软冲突和兼容未知对应 `result = risk`|
|空间|`STORAGE_INSUFFICIENT`、`SPACE_METADATA_MISSING`|三阶段空间不足；或任一闭包项缺少合法空间元数据|
|文件与路径|`PACKAGE_HASH_MISMATCH`、`PACKAGE_STRUCTURE_INVALID`、`ARCHIVE_PATH_ESCAPE`、`ATOMIC_SWITCH_FAILED`、`LOCAL_FILE_MISSING`|`ARCHIVE_PATH_ESCAPE` 覆盖绝对路径、盘符、`..`、越界、符号链接和硬链接|
|任务与卸载|`TASK_CONFLICT`、`UNINSTALL_PARTIAL`|任务冲突必须绑定原任务，不创建新任务|
|启动与证据|`PREFLIGHT_FAILED`、`GAME_LAUNCH_FAILED`、`GAME_ABNORMAL_EXIT`、`LOG_EVIDENCE_MISSING`|日志不可读、缺项或版本不符不能记实际生效|
|恢复|`RECOVERY_ACTION_FAILED`|恢复动作执行器未能完成选定动作|

以下两个值是正交状态，不是 `result`，也不得直接写入 `failure_reason`：

- `update_fact = source_unknown`：来源检查失败后的更新事实。它不等于“无更新”，不得显示可执行缓存更新；底层失败仍使用 `NETWORK_UNAVAILABLE` 或 `SOURCE_UNAVAILABLE`。
- `task_state = paused_by_system`：APP 被操作系统暂停后的非终态。进入该状态不触发 `mods_download_result`；回前台自动续传或用户继续仍沿用原 `task_id`、断点和事件链。

依赖冲突与空间/路径错误必须保留原始枚举，不得归并成 `UNKNOWN`、`OTHER` 或自由文本。

任务状态 enum：

```text
queued
downloading
paused_by_system
verifying
installing
succeeded
failed
cancelled
```

终态阶段 enum：

```text
dependency_resolution
space_check_download
download
space_check_unpack
verification
structure_validation
unpack
space_check_commit
atomic_switch
record_commit
cleanup
preflight
launch
recovery
```

operation enum：

```text
view_entry
view_detail
install
download
enable
disable
update
uninstall
preflight
launch
recovery_disable_changes
recovery_no_mod
recovery_keep_current
```

## 4. 幂等、重试和旋转总规则

1. 业务触发时先生成并持久化 `event_id`，再进入上报队列。网络重试、离线补传、进程恢复、批次重发和服务端重放必须复用同一 `event_id`。
2. 明细层先按 `event_id` 去重，再按每个事件定义的业务去重键去重；同一业务键出现多个不同 `event_id` 时只保留最早的合法记录，并产生埋点质量告警。
3. APP 旋转和页面框架重建沿用原 `view_session_id`、`operation_id`、`task_id`、`preflight_round_id`、`manifest_id`、`launch_id` 和 `recovery_action_id`，不得仅因方向变化再次触发事件。
4. 任务管理器的 2 秒、5 秒、10 秒自动重试、回前台唯一一次自动续传、断点续传和上传传输重试均不是新的用户业务尝试，不递增 `operation_attempt`，不生成新的点击或终态事件。
5. 用户在失败终态后明确点击“继续”“重试安装”或“重试更新”，仍复用合同规定的原 `task_id`，`operation_attempt` 加 1。该尝试可产生一次新的结果记录；同一尝试内的自动重试不能重复产生。
6. 事件迟到允许回补原自然日，不能改写 `event_time`。比例看板必须按业务去重键重算，不能把重传计为新增样本。

## 5. 事件字典

### 5.1 MODS 入口曝光

mods_entry_view

|合同项|定义|
|---|---|
|唯一触发点|DST 游戏详情进入 MODS 后，MODS 页面容器首次完成可见帧提交时触发；列表数据成功或失败不改变该触发点|
|必填扩展字段|`view_session_id`；`operation = view_entry`；入口级 `mod_id`、`mod_version`、`source_id`、`source_mod_id`、`task_id`、`package_hash`、`launch_id`、`manifest_id` 均为 `null`|
|允许的 `result`|仅 `success`；`failure_reason = null`|
|业务去重键|`device_installation_id + game_id + view_session_id + event_name`|
|重试/旋转不重复|同一页面会话的加载重试、返回前台、竖横屏切换和框架重建复用 `view_session_id`，不重复触发；用户离开 MODS 后再次主动进入创建新会话并触发一次|

### 5.2 MOD 详情曝光

mods_detail_view

|合同项|定义|
|---|---|
|唯一触发点|指定 MOD 的详情正文或已安装缓存详情首次完成可见帧提交时触发；只显示加载占位或错误页不触发|
|必填扩展字段|`view_session_id`、`mod_id`、`mod_version`、`source_id`、`source_mod_id`；`operation = view_detail`|
|允许的 `result`|仅 `success`；`failure_reason = null`|
|业务去重键|`device_installation_id + game_id + view_session_id + mod_id + event_name`|
|重试/旋转不重复|详情请求重试成功后只在首次正文可见时触发；同一详情会话的图片切换、滚动、旋转和重建不重复；关闭后再次主动打开创建新 `view_session_id`|

### 5.3 安装点击处理结果

mods_install_click

|合同项|定义|
|---|---|
|唯一触发点|用户点击“安装”后，该次操作首次得到确定处理结果时触发：创建/复用有效根任务、用户取消风险确认或请求失败三者之一|
|必填扩展字段|`operation_id`、`operation_attempt`、`root_mod_id`、`mod_id`、`mod_version`、`source_id`、`source_mod_id`；`operation = install`；成功时 `task_id` 和根 MOD `package_hash` 必填|
|允许的 `result`|任务已创建或复用为 `success`；用户取消风险确认为 `cancelled`；处理失败为 `failure`|
|业务去重键|`device_installation_id + game_id + operation_id + event_name`|
|重试/旋转不重复|连续点击、旋转、页面重建和同一操作回调复用 `operation_id`；自动重试不新增点击。用户从失败终态明确重试可生成新 `operation_id`，但继续复用原 `task_id`，安装成功率按唯一 `task_id` 去重|

门禁阻塞导致按钮不可执行时不产生本事件。`result = cancelled` 或 `failure` 且未产生有效任务时，`task_id = null`，不进入一键安装成功率分母。

### 5.4 下载终态

mods_download_result

|合同项|定义|
|---|---|
|唯一触发点|一个根任务所引用的一个包下载尝试首次进入确定成功、确定失败或用户取消终态时触发；`paused_by_system` 不是终态|
|必填扩展字段|`task_id`、`package_task_id`、`operation_attempt`、`root_mod_id`、当前包 `mod_id`、`mod_version`、`package_hash`、`task_state`、`terminal_stage = download`、`retry_count`、`downloaded_bytes`；`operation = download`|
|允许的 `result`|`success`、`failure`、`cancelled`|
|业务去重键|`task_id + package_task_id + operation_attempt + terminal_stage + event_name`|
|重试/旋转不重复|三次自动重试、断点续传、系统暂停恢复、旋转和进程恢复都沿用原尝试，不在中间失败时触发；仅该尝试最终结果触发一次。用户从可续传失败终态点击“继续”后 `operation_attempt` 加 1，可产生下一条终态|

共享硬依赖只有一个 `package_task_id` 和一次物理下载。它对每个不同根 `task_id` 各上报一条引用结果，表示该根任务收到同一包结果；这些记录共享 `package_task_id`，不得生成第二个包任务或第二次网络下载。重复任务指标按物理 `package_task_id` 和活动区间判定，不把不同根引用误判为重复任务。

### 5.5 安装终态

mods_install_result

|合同项|定义|
|---|---|
|唯一触发点|`operation = install` 的根任务尝试首次完成本地记录提交，或首次进入不可继续的失败/取消终态时触发|
|必填扩展字段|`task_id`、`operation_attempt`、`root_mod_id = mod_id`、`mod_version`、根 MOD `package_hash`、`task_state`、`terminal_stage`、`source_id`、`source_mod_id`；`operation = install`|
|允许的 `result`|`success`、`failure`、`cancelled`|
|业务去重键|`task_id + operation + operation_attempt + event_name`|
|重试/旋转不重复|旋转、页面重建、事务日志恢复和成功回调重放不新增结果；自动下载重试不新增安装尝试。用户从失败终态明确重试时 `operation_attempt` 加 1；成功率仍按唯一 `task_id` 计算|

只有原子切换、文件清单和本地安装事实均提交成功才允许 `result = success`。校验成功、文件复制完成或进入 `installing` 均不得提前上报成功。

### 5.6 启用值变更

mods_enable_change

|合同项|定义|
|---|---|
|唯一触发点|一次启用或停用请求的设备级 `enabled_value` 持久化成功，或失败并完成 UI 回滚后触发|
|必填扩展字段|`operation_id`、`mod_id`、`mod_version`、`package_hash`、`source_id`、`source_mod_id`、`previous_enabled_value`、`new_enabled_value`；`operation = enable` 或 `disable`|
|允许的 `result`|`success`、`failure`|
|业务去重键|`device_installation_id + game_id + operation_id + event_name`|
|重试/旋转不重复|一次控件操作只创建一个 `operation_id`；旋转、跨页面状态刷新和本地状态通知不重复触发。用户再次明确切换才创建新的 `operation_id`|

失败时 `new_enabled_value` 必须是回滚后真实持久化值，不得写成用户期望值。安装成功后的默认启用由 `mods_install_result` 表达，不额外伪造用户启用点击。

### 5.7 更新终态

mods_update_result

|合同项|定义|
|---|---|
|唯一触发点|`operation = update` 的根任务尝试首次完成新版本原子切换和记录提交，或首次进入不可继续的失败/取消终态时触发|
|必填扩展字段|`task_id`、`operation_attempt`、`root_mod_id = mod_id`、目标 `mod_version`、目标 `package_hash`、`task_state`、`terminal_stage`、`update_fact`、`source_id`、`source_mod_id`；`operation = update`|
|允许的 `result`|`success`、`failure`、`cancelled`|
|业务去重键|`task_id + operation + operation_attempt + event_name`|
|重试/旋转不重复|旋转、页面重建、自动下载重试和事务恢复不新增终态；用户明确“重试更新”时 `operation_attempt` 加 1，仍复用合同规定的原 `task_id`|

更新失败时必须保留旧版事实和最近启用值，且 `update_fact = update_available`。来源检查失败导致 `source_unknown` 时不得把缓存版本当成可执行更新，也不得上报伪成功。

### 5.8 卸载终态

mods_uninstall_result

|合同项|定义|
|---|---|
|唯一触发点|用户确认卸载后，受控程序文件与本地事实提交完成，或失败后目录重扫得到确定真实状态时触发|
|必填扩展字段|`operation_id`、卸载前 `mod_id`、`mod_version`、`package_hash`、`source_id`、`source_mod_id`、`terminal_stage = cleanup`；`operation = uninstall`|
|允许的 `result`|`success`、`failure`|
|业务去重键|`device_installation_id + game_id + operation_id + event_name`|
|重试/旋转不重复|卸载确认提交后禁用重复操作；旋转、页面重建、目录重扫和回调重放复用 `operation_id`。用户关闭确认框不产生本事件；失败后再次明确重试创建新 `operation_id`|

部分卸载失败必须使用 `failure_reason = UNINSTALL_PARTIAL`，并以上报时目录重扫后的真实本地事实为准。存档和用户 MOD 配置不得作为卸载文件。

### 5.9 启动前检查项结果

mods_preflight_result

|合同项|定义|
|---|---|
|唯一触发点|一次 `ResolvedLaunchManifest` 成功持久化后，对其中每个最终清单项各触发一次；若整轮在清单生成前失败，只触发一条 `mod_id = null` 的整轮失败记录|
|必填扩展字段|清单项：`preflight_round_id`、`manifest_id`、`launch_id`、`mod_id`、`mod_version`、`package_hash`、`source_id`、`source_mod_id`、`preflight_result`、`load_decision`、`reason_code`、`dependency_chain`、`risk_confirmed`；整轮失败：`preflight_round_id` 和 `terminal_stage = preflight`；`operation = preflight`|
|允许的 `result`|`preflight_result = effective` 映射为 `success`；`skipped` 映射为 `skipped`；`risk` 映射为 `risk`；整轮失败为 `failure`|
|业务去重键|清单项为 `preflight_round_id + manifest_id + mod_id + mod_version + event_name`；整轮失败为 `preflight_round_id + __round__ + event_name`|
|重试/旋转不重复|同一检查轮次的旋转、重建和结果重放沿用 `preflight_round_id`；不得重复生成清单或事件。用户点击“重试检查”才创建新轮次、新 `manifest_id` 和新 `launch_id`|

空清单 `items = []` 不产生伪 MOD 项；基础启动由 `mods_launch_result` 记录 `manifest_mod_count = 0`。
清单项为 `skipped` 或 `risk` 时，`failure_reason` 必须与 `reason_code` 一致；整轮失败使用 `PREFLIGHT_FAILED` 或可定位的底层枚举。

### 5.10 游戏启动终态

mods_launch_result

|合同项|定义|
|---|---|
|唯一触发点|同一 `launch_id` 最多有两个确定阶段：启动请求首次成功、失败或取消时触发一条 `launch_phase = startup`；游戏进程随后首次正常或异常退出时触发一条 `launch_phase = exit`|
|必填扩展字段|`launch_id`、`manifest_id`、`manifest_mod_count`、`manifest_changed`、`launch_phase`、`exit_type`；`operation = launch`；从恢复动作发起时 `recovery_action_id` 必填|
|允许的 `result`|启动阶段进入约定可操作状态为 `success`，未拉起为 `failure`，用户取消为 `cancelled`；退出阶段正常退出为 `success`，异常退出为 `failure`|
|业务去重键|`device_installation_id + game_id + launch_id + launch_phase + event_name`|
|重试/旋转不重复|启动按钮防重、旋转、页面重建、前后台切换和同一阶段回调重放均复用 `launch_id + launch_phase`；每个阶段最多一条。用户再次发起启动必须生成新 `launch_id`|

`manifest_mod_count` 是清单所有项目数。多 MOD 启动汇总时公共 `mod_id`、`mod_version`、`package_hash` 为 `null`；单项事实由 `mods_preflight_result` 与 `ActualLoadEvidence` 关联。启动阶段成功使用 `exit_type = running`；未拉起使用 `not_started`；退出阶段只能使用 `normal` 或 `abnormal`。`exit_type = abnormal` 时 `failure_reason = GAME_ABNORMAL_EXIT`。

### 5.11 恢复动作执行结果

mods_recovery_action

|合同项|定义|
|---|---|
|唯一触发点|用户明确选择并执行三种恢复动作之一后，动作执行器首次返回已执行或失败时触发；只浏览、关闭页面或取消二次确认不触发|
|必填扩展字段|`recovery_action_id`、`trigger_launch_id`、`recovery_action`、`operation_id`；动作被接受后生成的 `launch_id` 必填，`manifest_id` 在清单成功生成后由后续预检查与启动结果携带|
|允许的 `result`|动作已执行为 `success`；执行器失败为 `failure`|
|业务去重键|`device_installation_id + game_id + recovery_action_id + event_name`|
|重试/旋转不重复|旋转、页面重建、执行回调重放和随后启动回调不新增恢复动作；失败后用户再次明确执行才生成新 `recovery_action_id`|

`recovery_action` 与 `operation` 映射固定为：

|页面动作|`recovery_action`|`operation`|
|---|---|---|
|停用本次变化后重试|`disable_changes_and_retry`|`recovery_disable_changes`|
|无 MOD 启动|`launch_without_mods`|`recovery_no_mod`|
|保持当前设置继续尝试|`retry_with_current_settings`|`recovery_keep_current`|

`mods_recovery_action.result = success` 只表示动作已执行，不表示恢复成功。恢复成功必须用同一 `recovery_action_id` 关联 30 分钟内的 `mods_launch_result(result = success)`。

## 6. 实际加载证据合同

已启用 MOD 实际生效率不直接读取任一埋点事件的 `result`，而是按端到端合同读取 `ActualLoadEvidence`：

```text
ActualLoadEvidence.loaded_match
```

规范解释为 `ActualLoadEvidence.items[].result = loaded_match`，且必须同时满足：

1. `ActualLoadEvidence.manifest_id`、`launch_id`、`game_id` 和 `device_installation_id` 与对应 `ResolvedLaunchManifest` 完全一致。
2. 证据项 `mod_id` 与清单项一致。
3. `logged_local_version` 与清单项 `local_version` 一致。
4. `parse_status = parsed`。

`missing`、`version_mismatch`、`unexpected_loaded`、`log_unreadable` 和 `parser_failed` 均不得计入实际生效。安装成功、文件存在、`enabled_value = enabled`、`preflight_result = effective` 或进入 `resolved_launch_manifest` 都不能替代 `ActualLoadEvidence.loaded_match`。

## 7. 指标统一计算规则

### 7.1 时间窗与样本状态

- 除“安装完成后 7 日内再次使用率”和两项零容忍指标外，比例与分布统一使用最近 7 个完整自然日，不包含查询当日。
- 自然日按事件发生时 `event_timezone` 归属；服务端入库时间只用于迟到监控，不改变业务日期。
- 安装完成后 7 日内再次使用率按首次安装日形成成熟队列，只纳入已经拥有完整第 1–7 日观察期的设备。
- 两项零容忍指标同时实时计算和滚动 7 日计算；实时表示事实进入监控流即判定，不等待自然日闭合，不受最小样本限制。
- 分母未达到最小样本时，状态统一为“样本不足”，只展示分子、分母和比例，不得据此决定放量。
- 百分比使用去重后的分子除以去重后的分母；分母为 0 时展示“无样本”，不得展示 `0%`。
- 所有任务、启动、恢复和设备主键在聚合前先按本文业务去重键清洗。

### 7.2 指标总表

|指标|分子|分母|去重主键|观察窗|最小样本|门槛与动作|
|---|---|---|---|---|---:|---|
|一键安装成功率|`mods_install_result(result = success)` 的唯一根 `task_id` 数|产生有效 `task_id` 的 `mods_install_click` 唯一根任务数|`task_id`|最近 7 个完整自然日|分母 100|不低于 95%|
|下载、校验和安装失败原因分布|每个失败 `terminal_stage + failure_reason` 的唯一失败根任务数|所有有终态的唯一根任务数|`task_id + terminal_stage`|最近 7 个完整自然日|分母 100|用于定位，不单独作为放量门槛|
|已启用 MOD 实际生效率|游戏或引擎日志中 `ActualLoadEvidence.items[].result = loaded_match` 的唯一 MOD 实例数|`resolved_launch_manifest` 中 `preflight_result = effective` 的唯一 MOD 实例数|`launch_id + device_installation_id + mod_id + local_version`|最近 7 个完整自然日|分母 100|不低于 90%|
|携带 MOD 的游戏启动成功率|`mods_launch_result(launch_phase = startup, result = success, manifest_mod_count > 0)` 的唯一启动数|`mods_launch_result(launch_phase = startup, manifest_mod_count > 0)` 的所有唯一启动数|`launch_id`|最近 7 个完整自然日|分母 100|不低于 90%|
|MOD 变化后的异常退出率|`launch_phase = exit`、`manifest_changed = true` 且 `exit_type = abnormal` 的唯一启动数|`launch_phase = startup` 且 `manifest_changed = true` 的所有唯一启动数|`launch_id`|最近 7 个完整自然日|分母 100|只监控趋势；停止线由灰度方案定义|
|异常退出后的恢复成功率|执行恢复动作后 30 分钟内关联到 `mods_launch_result(launch_phase = startup, result = success)` 的唯一恢复动作数|所有 `mods_recovery_action(result = success)` 的唯一已执行恢复动作数|`recovery_action_id`|最近 7 个完整自然日|分母 20|不低于 90%|
|安装完成后 7 日内再次使用率|首次安装成功后第 1–7 日再次出现在 `ResolvedLaunchManifest.items` 中的唯一设备数|完成首次安装且已拥有完整 7 日观察期的唯一设备数|`device_installation_id`|按首次安装日形成成熟队列|分母 50|不低于 20%|
|无 MOD 降级启动成功率|恢复场景中 `launch_phase = startup`、`manifest_mod_count = 0` 且 `mods_launch_result(result = success)` 的唯一启动数|恢复场景中 `launch_phase = startup` 且 `manifest_mod_count = 0` 的所有唯一启动数|`launch_id`|最近 7 个完整自然日|分母 20|不低于 99%|
|重复下载或重复安装任务数|同一设备、游戏、MOD 在时间上重叠的活动任务对数|不适用，直接计数|`device_installation_id + game_id + mod_id + 重叠时间段`|实时与滚动 7 日|不适用|零容忍；发现 1 个立即停止灰度|
|游戏存档或用户配置丢失事件数|经文件证据确认的丢失事件数|不适用，直接计数|`事件 ID + device_installation_id`|实时与滚动 7 日|不适用|零容忍；发现 1 个立即停止灰度|

### 7.3 逐项集合公式

#### 一键安装成功率

```text
D = DISTINCT task_id
    FROM mods_install_click
    WHERE task_id IS NOT NULL
      AND event_time 位于最近 7 个完整自然日

N = DISTINCT task_id
    FROM mods_install_result
    WHERE result = success
      AND task_id IN D
      AND event_time 位于最近 7 个完整自然日

一键安装成功率 = |N| / |D|
```

同一 `task_id` 失败后由用户重试并最终成功，只在分母和成功分子中各计一次；自动重试、旋转和重传不增加样本。

#### 下载、校验和安装失败原因分布

```text
D = DISTINCT (task_id, terminal_stage)
    FROM mods_download_result / mods_install_result / mods_update_result
    WHERE 已进入终态
      AND event_time 位于最近 7 个完整自然日

N(stage, reason) = DISTINCT (task_id, terminal_stage)
                   WHERE result = failure
                     AND terminal_stage = stage
                     AND failure_reason = reason

失败原因占比(stage, reason) = |N(stage, reason)| / |D|
```

必须单列 `DEPENDENCY_UNRESOLVED`、`DEPENDENCY_VERSION_CONFLICT`、`STORAGE_INSUFFICIENT`、`SPACE_METADATA_MISSING`、`PACKAGE_HASH_MISMATCH`、`PACKAGE_STRUCTURE_INVALID`、`ARCHIVE_PATH_ESCAPE`、`ATOMIC_SWITCH_FAILED` 和 `DOWNLOAD_INTERRUPTED`，不得合并成“其他”。

#### 已启用 MOD 实际生效率

```text
D = DISTINCT (launch_id, device_installation_id, mod_id, local_version)
    FROM ResolvedLaunchManifest.items
    WHERE preflight_result = effective
      AND manifest.generated_at 位于最近 7 个完整自然日

N = D INNER JOIN ActualLoadEvidence.items
    ON manifest_id、launch_id、device_installation_id、mod_id、local_version 全部一致
    WHERE ActualLoadEvidence.parse_status = parsed
      AND ActualLoadEvidence.items[].result = loaded_match

已启用 MOD 实际生效率 = |N| / |D|
```

实际生效只认 `ActualLoadEvidence.loaded_match`。任何客户端推断、安装事件或预检查事件都不能补齐分子。

#### 携带 MOD 的游戏启动成功率

```text
D = DISTINCT launch_id
    FROM mods_launch_result
    WHERE launch_phase = startup
      AND manifest_mod_count > 0
      AND event_time 位于最近 7 个完整自然日

N = D WHERE result = success

携带 MOD 的游戏启动成功率 = |N| / |D|
```

`manifest_mod_count` 使用完整清单项目数，包括 `effective`、`skipped` 和 `risk` 项；不得只数最终加载项。

#### MOD 变化后的异常退出率

```text
D = DISTINCT launch_id
    FROM mods_launch_result
    WHERE launch_phase = startup
      AND manifest_changed = true
      AND event_time 位于最近 7 个完整自然日

N = D INNER JOIN mods_launch_result AS exit_event
    ON exit_event.launch_id = D.launch_id
    WHERE exit_event.launch_phase = exit
      AND exit_event.exit_type = abnormal
      AND exit_event.result = failure
      AND exit_event.failure_reason = GAME_ABNORMAL_EXIT

MOD 变化后的异常退出率 = |N| / |D|
```

无清单变化的异常退出不得进入分子或分母，不得归因给 MOD。

#### 异常退出后的恢复成功率

```text
D = DISTINCT recovery_action_id
    FROM mods_recovery_action
    WHERE result = success
      AND event_time 位于最近 7 个完整自然日

N = D 中存在同一 recovery_action_id 的 mods_launch_result
    且 launch.launch_phase = startup
    且 launch.result = success
    且 launch.event_time ∈ [recovery.event_time, recovery.event_time + 30 分钟]

异常退出后的恢复成功率 = |N| / |D|
```

同一恢复动作关联多个回调或启动结果时只取时间上最早的合法成功启动，仍只计一个 `recovery_action_id`。

#### 安装完成后 7 日内再次使用率

```text
D = 每个 device_installation_id 的首次 mods_install_result(result = success) 日期
    且查询时已完整经历首次安装后的第 1–7 个自然日

N = D 中在首次安装后的第 1–7 个自然日
    至少一次出现在 ResolvedLaunchManifest.items 的 DISTINCT device_installation_id

安装完成后 7 日内再次使用率 = |N| / |D|
```

“再次使用”按设备进入启动清单判定，不要求实际加载成功，也不按账号或用户 ID 去重；首次安装当天第 0 日不计再次使用。

#### 无 MOD 降级启动成功率

```text
D = DISTINCT launch_id
    FROM mods_launch_result
    WHERE recovery_action_id 关联 recovery_action = launch_without_mods
      AND launch_phase = startup
      AND manifest_mod_count = 0
      AND event_time 位于最近 7 个完整自然日

N = D WHERE result = success

无 MOD 降级启动成功率 = |N| / |D|
```

普通的无已启用 MOD 基线启动不进入该恢复指标。

#### 重复下载或重复安装任务数

```text
对每个 (device_installation_id, game_id, mod_id)，
若两个不同 task_id 或 package_task_id 的活动区间在
queued / downloading / paused_by_system / verifying / installing 任一状态发生重叠，
则按“任务对 + 最大重叠区间”计 1 个重复任务。
```

同一任务的自动重试、断点续传、旋转和进程恢复不算重复任务；共享依赖只有一个 `package_task_id` 时不算重复。该指标实时发现 1 个即停止灰度。

#### 游戏存档或用户配置丢失事件数

```text
安装、更新、回退、取消、卸载或恢复动作前后，
若经独立文件证据确认游戏存档或用户 MOD 配置出现非用户操作导致的
删除、覆盖、移动、缺失或不可恢复损坏，则计 1 个丢失事件。
```

按安全证据系统的稳定事件 ID 与 `device_installation_id` 去重。截图、页面报错或仅文件时间变化不能单独确认丢失；确认 1 个即实时停止灰度。

## 8. 数据质量与验收查询

上线前和每日数据质量检查至少包含：

1. 11 个事件的公共字段完整率为 100%，可空字段显式为 `null`。
2. `game_id != steam:322330`、未知 `event_name`、未知 `result`、未知 `operation` 和自由文本 `failure_reason` 的记录数为 0。
3. Mac 的 `screen_orientation != not_applicable` 为 0；APP 的 `screen_orientation = not_applicable` 为 0。
4. `result = success` 且 `failure_reason IS NOT NULL` 为 0；非成功结果缺少 `failure_reason` 为 0。
5. 下载、安装、更新结果缺少 `task_id` 的记录数为 0；启动结果缺少 `launch_id` 或 `manifest_id` 的记录数为 0。
6. `mods_preflight_result` 清单项缺少 `mod_id + mod_version + package_hash` 的记录数为 0。
7. 同一业务去重键对应多个不同 `event_id` 的记录单列告警，聚合前按本文规则去重。
8. `source_unknown` 被写入 `failure_reason`、`paused_by_system` 被当作下载终态、依赖/空间/路径错误被归并为自由文本的记录数均为 0。
9. 实际生效分子中不存在非 `ActualLoadEvidence.loaded_match` 记录。
10. 两项零容忍指标使用实时流和滚动 7 日批处理交叉核对；任一侧发现 1 个均按停止灰度处理。

数据验收必须按 `device_platform + channel_package + client_build + language` 保留可下钻维度。国内官方包、国内代表渠道、`Global`、`GooglePlay` 和 Mac 样本不得互相替代；APP 竖屏、横屏和运行中旋转也不得互相替代。

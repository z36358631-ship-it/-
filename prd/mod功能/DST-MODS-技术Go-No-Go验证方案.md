# DST MODS 技术 Go/No-Go 验证方案

## 1. 文档状态与结论

|项目|内容|
|---|---|
|状态|状态：未执行|
|版本|V1.0|
|日期|2026-07-30|
|验证游戏|《饥荒联机版》DST，`game_id = steam:322330`|
|验证对象|Mac 客户端、APP 客户端、目录服务、本地任务管理器、DST 启动链路、游戏或引擎日志|
|优先级|本文全部用例均为 P0|
|当前闸门结论|No-Go；尚未执行真实设备验证，也没有可核验的游戏或引擎日志证据，因此不具备判定 Go 的条件|

本文用于在完整页面开发和用户灰度前，验证 DST 本地 MODS 的最小真实运行链路与高风险技术不变量。本文只定义可执行方法和判定标准，不代表任何设备、构建或用例已经通过。

## 2. Go/No-Go 总规则

Go 必须同时满足：

1. 本文全部 P0 用例均执行并通过。
2. Mac 与 APP 分别使用目标构建、目标设备和对应平台包完成安装、启用、启动。
3. Mac 与 APP 的每个计划加载项均有可关联到同一 `manifest_id`、`launch_id`、`game_id` 和 `device_installation_id` 的游戏或引擎原始日志。
4. 日志中的 `mod_id` 和本地版本与 `resolved_launch_manifest` 完全一致，解析结果为 `loaded_match`。
5. 存档和用户 MOD 配置的操作前后哈希不变。

No-Go 规则：

- 任何 P0 失败均为 No-Go。
- 任何 P0 未执行、被阻塞或证据缺失均不得判为 Go。
- 任一端无法用游戏或引擎日志证明实际加载均为 No-Go。
- 文件已下载、复制完成、安装成功、启用成功或进入 `resolved_launch_manifest` 均不能替代实际加载日志。
- 任何一项失败均为 No-Go；先修复运行链路，再启动完整页面开发。

## 3. 执行前置与禁止事项

### 3.1 环境前置

执行负责人必须先冻结并记录：

- 一台目标 Mac 的设备型号、系统版本、`device_installation_id`、客户端构建号和 DST 构建号。
- 一台目标 APP 设备的型号、系统版本、包体、渠道、`device_installation_id`、客户端构建号和 DST 构建号。
- 一个在 Mac 与 APP 均有独立可用包的 MOD，记录 `source_id`、`source_mod_id`、`mod_id`、平台包版本、下载地址、`package_hash`、三项空间元数据和硬依赖闭包。
- 可控制下载限速、系统暂停、进程结束、OS 可用空间、来源失败、包内容、声明哈希和依赖解析结果的测试桩；测试桩只负责注入条件，不得伪造客户端、游戏或引擎的结果日志。
- 可读取的设备级状态库、任务状态时间线、事务日志、版本指针、文件清单、`resolved_launch_manifest`、游戏或引擎原始日志和解析结果。
- DST 存档目录与用户 MOD 配置目录的操作前基线哈希。

### 3.2 证据保存规则

每轮执行使用不可复用的 `execution_record_id`，证据目录按下列结构保存：

```text
{execution_record_id}/
├─ environment.json
├─ client/
├─ task/
├─ filesystem/
├─ manifest/
├─ game-log/
└─ result.json
```

所有证据必须带 ISO 8601 时间及时区。原始日志只读归档；解析结果必须保留匹配行和解析器版本。截图或录屏只能证明页面行为，不能替代任务日志、文件证据或游戏侧日志。

### 3.3 通用执行记录字段

每条用例的执行记录必须包含：

```text
execution_record_id
case_id
priority
status
result
executor
reviewer
started_at
finished_at
mac_build
app_build
dst_build
device_installation_id
device_model
os_version
package_flavor
channel
game_id
source_id
source_mod_id
mod_id
local_version
package_hash
task_id
root_task_id
manifest_id
launch_id
evidence_paths
observed_result
failed_stage
failure_code
defect_id
review_conclusion
```

未执行时，`status` 必须写“未执行”，其余尚未产生的结果字段写“未记录（未执行）”，不得填写“通过”或虚构编号、设备和日志路径。

## 4. 基础真实链路闸门

### 4.1 GATE-MAC-001：Mac 安装、启用与启动

- 优先级与状态：P0；未执行。
- 前置条件：目标 Mac 已安装冻结构建；目标 MOD 的 Mac 包、三项空间元数据、依赖闭包和声明 `package_hash` 均可用；当前设备无该 MOD 活动任务。
- 注入：使用已冻结的正常 Mac 包，不注入失败；记录下载前、解包前和切换前的真实环境快照。
- 操作：点击一次安装，等待下载、哈希校验、结构检查、原子安装和默认启用完成；执行启动前检查并启动 DST。
- 必须证据：构建号、设备与系统信息、`mod_id`、版本、`package_hash`、唯一 `task_id`、三阶段空间快照、事务日志、当前版本指针、本地文件清单、`LocalModRecord`、`resolved_launch_manifest`、客户端日志、游戏或引擎原始日志。
- 唯一通过条件：只有一个根任务完成；本地安装事实为 `installed`、启用值为 `enabled`，指针与文件清单均有效；清单项为 `load`；游戏或引擎日志出现同一 `mod_id` 和本地版本并解析为 `loaded_match`。
- 执行记录字段：通用字段，加 `space_snapshot_paths`、`active_version_pointer`、`installed_files_hash`、`actual_load_result`。

### 4.2 GATE-APP-001：APP 安装、启用与启动

- 优先级与状态：P0；未执行。
- 前置条件：目标 APP 设备已安装冻结包体；目标 MOD 的 APP 包、三项空间元数据、依赖闭包和声明 `package_hash` 均可用；当前设备无该 MOD 活动任务。
- 注入：使用已冻结的正常 APP 包，不注入失败；安装期间保持前台和固定方向。
- 操作：点击一次安装，等待下载、哈希校验、结构检查、原子安装和默认启用完成；执行启动前检查并启动 DST。
- 必须证据：APP 包体与渠道、构建号、设备与系统信息、`mod_id`、版本、`package_hash`、唯一 `task_id`、三阶段空间快照、事务日志、当前版本指针、本地文件清单、`LocalModRecord`、`resolved_launch_manifest`、客户端日志、游戏或引擎原始日志。
- 唯一通过条件：只有一个根任务完成；当前 APP 设备生成有效安装记录且默认启用；Mac 或其他 APP 的本地事实未被改写；清单项为 `load`；游戏或引擎日志出现同一 `mod_id` 和本地版本并解析为 `loaded_match`。
- 执行记录字段：通用字段，加 `space_snapshot_paths`、`active_version_pointer`、`installed_files_hash`、`other_device_record_hash_before`、`other_device_record_hash_after`、`actual_load_result`。

### 4.3 GATE-LOG-001：两端实际加载证据

- 优先级与状态：P0；未执行。
- 前置条件：GATE-MAC-001 与 GATE-APP-001 分别生成包含至少一个 `load_decision = load` 项的清单，并实际启动 DST。
- 注入：不注入客户端“加载成功”结果；只读取真实游戏或引擎原始日志，并用冻结版本解析器解析。
- 操作：分别收集 Mac 与 APP 原始日志；按各端 `manifest_id`、`launch_id`、`game_id`、`device_installation_id`、`mod_id` 和版本关联并解析。
- 必须证据：两端原始日志路径与文件哈希、解析器版本、两端 `resolved_launch_manifest`、两端 `ActualLoadEvidence`、所有匹配日志行和未匹配项。
- 唯一通过条件：两端 `parse_status = parsed`；每个计划加载项均存在同 `mod_id` 且版本一致的 `loaded_match`；不存在 `missing`、`version_mismatch`、`unexpected_loaded` 或清单外加载。
- 执行记录字段：通用字段，加 `raw_log_sha256`、`parser_version`、`parse_status`、`actual_load_items`、`unexpected_loaded_items`。

### 4.4 GATE-ROTATE-001：任务期间横竖屏切换

- 优先级与状态：P0；未执行。
- 前置条件：APP 设备未安装目标 MOD；设备级任务管理器可观测；网络限速可让任务稳定停留在下载、校验和安装阶段。
- 注入：限速并分别在下载约 20%、下载约 60%、`verifying`、`installing` 时触发竖转横再转竖。
- 操作：点击一次安装；按注入点旋转；每次旋转后返回同一卡片或详情并记录任务、请求和进度。
- 必须证据：唯一 `task_id`、状态与字节时间线、页面状态快照、目录与详情请求日志、下载请求日志、安装提交日志、旋转时间点。
- 唯一通过条件：全程 `task_id` 不变、已下载字节不倒退；目录与详情不因旋转重复请求；只有一个活动下载和一个安装提交；已完成阶段不重跑，最终任务只产生一个终态。
- 执行记录字段：通用字段，加 `orientation_timeline`、`downloaded_bytes_timeline`、`directory_request_count`、`detail_request_count`、`download_task_count`、`install_commit_count`。

### 4.5 GATE-BG-001：系统暂停与前后台恢复

- 优先级与状态：P0；未执行。
- 前置条件：APP 下载任务达到约 30%，事务日志已落盘，存在有效 `resume_token`，测试桩能触发操作系统暂停。
- 注入：APP 进入后台时强制系统暂停任务并写入 `paused_by_system`；网络在回前台时恢复可用。
- 操作：记录暂停前 `task_id` 和字节数；进入后台；确认暂停状态；回前台并观察唯一一次自动续传直至终态。
- 必须证据：生命周期日志、状态时间线、`task_id`、`resume_token`、暂停原因、已下载字节、自动续传调用次数、网络 Range 或等价续传证据、最终状态。
- 唯一通过条件：任务确定进入 `paused_by_system`；回前台只自动续传一次并复用原 `task_id`、有效字节和 staging；字节不重复下载；不创建第二个下载或安装任务。
- 执行记录字段：通用字段，加 `pause_reason`、`resume_token_hash`、`auto_resume_count`、`bytes_before_pause`、`bytes_after_resume`、`duplicate_task_count`。

### 4.6 GATE-ROLLBACK-001：更新哈希失败保留旧版

- 优先级与状态：P0；未执行。
- 前置条件：当前设备有已启用且经日志证明可加载的旧版；服务端提供新版本；旧版指针、文件清单、启用值、存档和用户 MOD 配置已取基线哈希。
- 注入：新包内容与服务端声明 `package_hash` 不一致，使校验确定返回 `PACKAGE_HASH_MISMATCH`。
- 操作：点击更新；等待校验失败；核对指针、文件和状态；随后使用旧版启动 DST 并读取游戏或引擎日志。
- 必须证据：新旧包信息、错误码与失败阶段、更新前后指针、本地文件清单和启用值、staging 清理记录、存档与配置前后哈希、旧版启动清单及原始游戏日志。
- 唯一通过条件：任务仅以 `PACKAGE_HASH_MISMATCH` 失败；新指针从未提交，临时错误包被清理；旧版指针、文件清单和最近启用值不变，`update_fact = update_available`；旧版仍在游戏或引擎日志中以原版本 `loaded_match`。
- 执行记录字段：通用字段，加 `old_pointer`、`pointer_after_failure`、`old_files_hash_before`、`old_files_hash_after`、`save_hash_before_after`、`config_hash_before_after`、`rollback_actual_load_result`。

### 4.7 GATE-BASELINE-001：无 MOD 基线启动

- 优先级与状态：P0；未执行。
- 前置条件：分别在 Mac 与 APP 确认当前设备没有已启用 MOD；基础 DST 构建可启动。
- 注入：不注入 MOD；清单输入集合为空。
- 操作：两端分别点击启动 DST，记录启动前 UI、生成清单和游戏启动结果。
- 必须证据：两端设备级启用集合、`resolved_launch_manifest`、启动链路日志、DST 成功进入可操作状态的日志或受控运行证据。
- 唯一通过条件：两端都不增加 MOD 确认页；均生成 `items = []` 的清单；基础游戏成功启动；本地安装与启用值未被修改。
- 执行记录字段：通用字段，加 `enabled_set_before`、`manifest_item_count`、`confirmation_page_count`、`game_launch_result`、`local_state_hash_before_after`。

### 4.8 GATE-RECOVERY-001：变化后异常退出恢复建议

- 优先级与状态：P0；未执行。
- 前置条件：存在最近一次启动成功且有确定实际加载证据的清单；本次通过新安装、重新启用、版本或依赖变化产生不同清单。
- 注入：本次变化后让 DST 产生可核验的异常退出；不注入自动恢复选择。
- 操作：重新进入启动链路；查看恢复建议和默认选择；关闭页面；分别检查三个可选动作的说明，但本轮不确认任何动作。
- 必须证据：最近成功清单、本次变化清单、异常退出日志、恢复页录屏、页面默认选择、操作前后 `LocalModRecord`、存档与配置哈希。
- 唯一通过条件：页面只提供“停用本次变化后重试”“无 MOD 启动”“保持当前设置继续尝试”三项；默认不执行；关闭页面不改变安装、启用、文件、存档或配置；无清单变化的异常退出不得归因给 MOD。
- 执行记录字段：通用字段，加 `last_success_manifest_id`、`changed_manifest_id`、`manifest_diff`、`crash_evidence_path`、`recovery_options`、`selected_action_before_confirmation`、`state_hash_before_after`。

## 5. 共享依赖并发闸门

### 5.1 GATE-DEP-SAMEHASH-001：共享依赖相同哈希

- 优先级与状态：P0；未执行。
- 前置条件：根 MOD A、B 均依赖同一硬依赖 D，两个版本约束存在共同可满足版本且统一解析为同一 H1。
- 注入：用并发屏障让 A、B 在 D 取包锁前同时到达；保持 D 的下载与安装正常。
- 操作：同时开始 A、B 安装；观察统一解析、包锁、共享引用、D 下载与提交，再等待两个根任务结束。
- 必须证据：两个根 `task_id`、依赖解析结果、唯一包锁记录、D 的包任务 ID、`target_package_hash = H1`、引用变化、下载请求数、提交日志及两个根任务终态。
- 唯一通过条件：取锁前统一解析到 H1；D 只有一个包任务和一个锁，去重引用为 2；H1 只下载和提交一次；A、B 各自继续并成功，不产生重复依赖文件或双指针。
- 执行记录字段：通用字段，加 `root_task_ids`、`resolved_dependency_hash`、`package_task_id`、`package_lock_key`、`reference_count_timeline`、`dependency_download_count`、`dependency_commit_count`。

### 5.2 GATE-DEP-DIFFHASH-COMMITTED-001：异哈希且先任务已提交

- 优先级与状态：P0；未执行。
- 前置条件：根任务 A 需要依赖 D 的 H1，根任务 B 需要 D 的 H2，`H1 != H2`，且不存在共同可满足版本。
- 注入：并发屏障使 A 先取得 D 的基础锁；控制 A 正常提交 H1，B 在此期间到达。
- 操作：同时开始 A、B；让 B 等待；让 A 完成依赖与根任务提交；观察 B 重新解析和终态。
- 必须证据：A、B 的依赖约束与解析结果、锁持有记录、B 的 `queued` 时间线、H1 提交记录、B 的失败码、D 指针和 A 的启用值。
- 唯一通过条件：锁中只运行 H1；B 等待时不得加入 H1 引用；H1 提交后 B 返回 `DEPENDENCY_VERSION_CONFLICT` 并转为 `dependency_blocked`；H2 不下载、不安装、不提交；H1 指针、A 的成功状态和启用值不变。
- 执行记录字段：通用字段，加 `h1`、`h2`、`lock_holder_task_id`、`b_queued_interval`、`b_reference_to_h1`、`b_failure_code`、`h2_download_count`、`h1_pointer_before_after`、`a_enabled_before_after`。

### 5.3 GATE-DEP-DIFFHASH-UNCOMMITTED-001：异哈希且先任务未提交

- 优先级与状态：P0；未执行。
- 前置条件：A 需要 H1、B 需要 H2，`H1 != H2` 且不存在共同版本；能够分别在 H1 提交前注入取消和失败。
- 注入：执行两个独立轮次：轮次一在 H1 提交前取消 A；轮次二在 H1 提交前让 A 失败。两轮均让 B 在锁外保持 `queued`。
- 操作：每轮同时开始 A、B；确认 B 等待；注入 A 取消或失败；确认 H1 未提交；观察 B 取得基础锁、重新检查门禁与空间并安装 H2。
- 必须证据：每轮 A、B 状态时间线、H1 未提交证明、锁交接记录、门禁与空间复查、H2 下载和提交、最终版本指针。
- 唯一通过条件：两个轮次都必须通过；B 先等待且不加入 H1 引用；A 结束且 H1 未提交后 B 才取得锁；最终只提交 H2，不存在 H1 指针、双活动版本或双成功结果。
- 执行记录字段：通用字段，加 `injection_variant`、`h1_commit_state`、`lock_handoff_at`、`b_gate_recheck`、`b_space_recheck`、`final_dependency_pointer`、`active_version_count`。

## 6. 空间与目录安全闸门

三阶段空间检查统一使用目标卷操作系统实时 `available_capacity_bytes`，不得再次加入或扣除非 MODS 文件、其他 MOD、当前版、回退版或已落盘任务文件。每次安全余量为 `max(当前阶段 required_new_bytes × 10%, 512 MiB)`。

### 6.1 GATE-SPACE-DOWNLOAD-001：下载前空间不足

- 优先级与状态：P0；未执行。
- 前置条件：主 MOD 与硬依赖的 `compressed_size_bytes`、`unpacked_size_bytes`、`peak_staging_size_bytes` 均合法；当前版、回退版和其他 MOD 已存在并可取体积。
- 注入：下载前把 OS `available_capacity_bytes` 设置为“待下载闭包压缩量 + 待写最终目录解包量 + 剩余额外 staging 峰值 + 安全余量”少 1 字节。
- 操作：点击安装并捕获第一次空间快照、任务和网络写入。
- 必须证据：逐包元数据、闭包求和、OS 原始可用字节、`required_new_bytes`、安全余量、失败阶段、网络请求和受控目录差异。
- 唯一通过条件：第一次检查以 `STORAGE_INSUFFICIENT` 结束且不下载；公式不重复计算当前版、回退版、其他 MOD或已落盘共享文件；本地事实、指针和用户文件不变。
- 执行记录字段：通用字段，加 `space_phase`、`os_available_capacity_bytes`、`required_new_bytes`、`safety_margin_bytes`、`download_request_count`、`filesystem_diff`。

### 6.2 GATE-SPACE-UNPACK-001：解包前空间不足

- 优先级与状态：P0；未执行。
- 前置条件：闭包压缩包已完整下载；存在独占 staging 和引用仍大于 0 的共享文件；旧版与回退版可核验。
- 注入：开始解包前把 OS `available_capacity_bytes` 设置为“待写最终目录解包量 + 解包阶段剩余额外 staging 峰值 + 安全余量”少 1 字节。
- 操作：触发解包前复查并观察失败清理和共享引用。
- 必须证据：完整包与字节数、OS 原始可用字节、空间快照、失败阶段、staging 清理记录、共享引用、指针与启用值。
- 唯一通过条件：第二次检查以 `STORAGE_INSUFFICIENT` 结束；已下载压缩包不重复计入需求；只清理本任务独占 staging；共享引用仍大于 0 的文件、当前版、回退版、指针和启用值全部保留。
- 执行记录字段：通用字段，加 `space_phase`、`os_available_capacity_bytes`、`required_new_bytes`、`safety_margin_bytes`、`exclusive_staging_removed`、`shared_reference_count_before_after`、`pointer_hash_before_after`。

### 6.3 GATE-SPACE-COMMIT-001：切换前空间不足

- 优先级与状态：P0；未执行。
- 前置条件：新版本目录已写入但未提交，旧指针与最近启用值有效。
- 注入：切换前把 OS `available_capacity_bytes` 设置为固定 `16 MiB` 提交需求加 `512 MiB` 安全余量少 1 字节。
- 操作：触发第三次复查并观察事务、目录清理和指针。
- 必须证据：OS 原始可用字节、空间快照、新版本目录清单、`new_pointer_switched`、失败阶段、清理日志、旧指针、回退指针和启用值。
- 唯一通过条件：第三次检查以 `STORAGE_INSUFFICIENT` 结束；`required_new_bytes = 16 MiB` 且新版本目录不重复计入；本任务未提交的新版本目录和独占 staging 被删除；旧版、回退版、共享文件、指针和最近启用值保留。
- 执行记录字段：通用字段，加 `space_phase`、`os_available_capacity_bytes`、`required_new_bytes`、`safety_margin_bytes`、`uncommitted_version_dir_removed`、`new_pointer_switched`、`old_pointer_hash_before_after`。

### 6.4 GATE-PATH-ESCAPE-001：恶意解包路径

- 优先级与状态：P0；未执行。
- 前置条件：目标设备受控 staging、受控版本目录、存档目录和用户 MOD 配置目录均已取基线清单与哈希。
- 注入：分四轮准备含绝对路径或盘符路径、含 `..`、符号链接、硬链接的包；每轮使用独立任务。
- 操作：逐包执行安装直至路径安全检查结束；核对错误码、清理范围和受控目录外文件差异。
- 必须证据：四个恶意包的文件表、规范化结果、客户端安全日志、错误码、staging 清理日志、受控目录外前后清单、存档与配置前后哈希、旧版指针。
- 唯一通过条件：四轮全部以 `ARCHIVE_PATH_ESCAPE` 拒绝且不进入结构检查后的写入；独占 staging 被清理；受控目录外无新增、覆盖、移动或删除；旧版、存档和配置哈希不变。
- 执行记录字段：通用字段，加 `archive_variant`、`archive_manifest_path`、`normalized_path_result`、`outside_controlled_root_diff`、`save_hash_before_after`、`config_hash_before_after`、`old_pointer_hash_before_after`。

## 7. 事务恢复与来源状态闸门

### 7.1 GATE-PROCESS-001：APP 进程恢复

- 优先级与状态：P0；未执行。
- 前置条件：APP 设备已有可用旧版；任务管理器在每个阶段切换前后落盘 `InstallTransactionLog`，包含 `task_id`、包锁、哈希、字节、staging、旧指针、`new_pointer_switched` 和 `local_record_committed`。
- 注入：执行五个独立轮次，分别在 `queued`、`downloading` 或 `paused_by_system`、`verifying`、`installing` 且指针未切换、`installing` 且指针已切换但记录未提交时强制结束 APP 进程。
- 操作：每轮确认事务日志落盘后结束进程；重启 APP；观察先读取日志、取得包锁、绑定原任务并完成确定恢复。
- 必须证据：每轮进程结束点、重启日志、事务日志前后快照、包锁、`task_id`、`resume_token`、已下载字节、staging、指针、文件哈希、本地记录提交结果和重复任务计数。
- 唯一通过条件：五轮均必须满足对应唯一结果：`queued` 重查门禁、空间和锁；下载或系统暂停阶段校验断点后以原任务续传，断点不一致时仍用原任务从 0 下载；`verifying` 有完整包时从头重校验且不重下；指针未切换时删除未完成目录并复用已验证 staging 重装；指针已切换但记录未提交时校验通过则补交记录，不通过则恢复旧指针并失败。所有轮次在恢复完成前不创建新任务，`task_id` 不变。
- 执行记录字段：通用字段，加 `killed_stage`、`transaction_log_before_after`、`package_lock_acquired_at`、`resume_token_hash`、`downloaded_bytes_before_after`、`new_pointer_switched`、`local_record_committed`、`recovery_branch`、`duplicate_task_count`。

### 7.2 GATE-SOURCE-UNKNOWN-001：更新状态未知

- 优先级与状态：P0；未执行。
- 前置条件：当前设备有可启动的已安装版本；来源检查前有一条带时间的历史摘要；本地版本、指针和启用值可核验。
- 注入：让目录或详情来源检查失败，但不返回可执行下载地址；随后分别注入一次检查恢复成功和一次继续失败。
- 操作：刷新更新状态；查看卡片与详情操作；尝试启动已安装版；点击“重新检查更新”；核对成功和失败两个分支。
- 必须证据：来源请求与错误、`LocalModRecord` 前后快照、UI 录屏、历史摘要、按钮可用性、是否发起下载、启动清单及游戏或引擎原始日志。
- 唯一通过条件：首次失败后 `update_fact = source_unknown`，只显示“更新状态未知”和不可执行历史摘要；不显示“更新”，不得使用缓存版本或地址创建任务；已安装版仍可启停、启动和卸载；启动时日志仍能证明本地版本实际加载；重新检查成功只转为 `no_update` 或 `update_available`，再次失败保持 `source_unknown`。
- 执行记录字段：通用字段，加 `source_request_id`、`source_error`、`update_fact_timeline`、`cached_summary`、`update_action_visible`、`download_request_count`、`recheck_result`、`installed_version_actual_load_result`。

## 8. 执行登记

下表是本文当前唯一执行登记。未附真实设备、任务、文件和游戏侧证据时，任何行都不得改为“通过”。

|用例 ID|优先级|状态|结果|证据|缺陷|
|---|---|---|---|---|---|
|GATE-MAC-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-APP-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-LOG-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-ROTATE-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-BG-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-ROLLBACK-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-BASELINE-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-RECOVERY-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-DEP-SAMEHASH-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-DEP-DIFFHASH-COMMITTED-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-DEP-DIFFHASH-UNCOMMITTED-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-SPACE-DOWNLOAD-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-SPACE-UNPACK-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-SPACE-COMMIT-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-PATH-ESCAPE-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-PROCESS-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|
|GATE-SOURCE-UNKNOWN-001|P0|未执行|未记录（未执行）|未记录（未执行）|未记录（未执行）|

## 9. 最终签署

只有执行负责人和独立复核人逐项核对原始证据后，才可填写最终签署。最终结论只允许：

```text
Go：全部 P0 通过，且 Mac 与 APP 的游戏或引擎日志均证明确实加载。
No-Go：任何 P0 失败、未执行、阻塞或证据缺失；任一端无法确认实际加载；无 MOD 基线失败；更新失败破坏旧版；旋转、前后台或进程恢复产生重复任务；存档或 MOD 配置丢失。
```

当前签署状态：

```text
执行负责人：未记录（未执行）
独立复核人：未记录（未执行）
签署时间：未记录（未执行）
最终结论：No-Go（未执行，未取得真实设备和游戏或引擎日志证据）
```

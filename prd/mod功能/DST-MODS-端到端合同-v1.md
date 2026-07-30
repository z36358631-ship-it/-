# DST MODS 端到端合同 v1

## 1. 合同范围与规范级别

本文是《饥荒联机版》DST（`game_id = steam:322330`）外部非官方 MOD 在目录服务、Mac 客户端、APP 客户端、本地任务管理器、DST 启动链路和日志核对之间的统一合同。它不适用于创意工坊，也不定义 MOD 发布、审核或跨设备同步。

本文使用以下规范词：

- “必须”表示实现和验收不可省略。
- “不得”表示明确禁止。
- “可”表示符合前置条件时允许。
- 所有时间均为带时区的 ISO 8601 字符串。
- 所有 `*_bytes` 均为非负安全整数，单位为字节。
- `package_hash` 使用服务端声明的 SHA-256 小写十六进制值。
- `null` 表示该字段在当前事实下不适用或没有已确认值；不得用空字符串代替。

权威边界如下：

|事实|权威来源|
|---|---|
|目录、详情、来源状态、版本、平台包、依赖和冲突|目录服务|
|安装事实、启用值、更新事实、文件清单和版本指针|当前设备本地状态库|
|任务进度、续传信息、包锁、共享引用和事务恢复|当前设备任务管理器与事务日志|
|本次计划加载、跳过和风险项|`ResolvedLaunchManifest`|
|游戏是否实际加载 MOD|游戏或引擎原始日志及 `ActualLoadEvidence`|

安装成功、启用、进入启动清单和日志确认是四个不同事实。任何一方不得用其中一个事实替代另一个事实。

## 2. 公共类型

以下 TypeScript 是规范性数据模型。接口实现可以使用其他语言，但字段名、枚举值、可空规则和约束必须一致。

```typescript
type GameId = 'steam:322330';
type ClientPlatform = 'mac' | 'app';
type Iso8601DateTime = string;
type Sha256Hex = string;

type SourceStatus =
  | 'active'
  | 'removed'
  | 'unavailable'
  | 'wrong_game';

type CompatibilityStatus =
  | 'compatible'
  | 'incompatible'
  | 'unknown';

type DependencyKind = 'hard' | 'soft';

type InstallationFact = 'not_installed' | 'installed';
type EnabledValue = 'enabled' | 'disabled' | 'not_applicable';
type UpdateFact = 'no_update' | 'update_available' | 'source_unknown';
type InstallGate = 'allowed' | 'dependency_blocked' | 'incompatible';

type InstallTaskState =
  | 'queued'
  | 'downloading'
  | 'paused_by_system'
  | 'verifying'
  | 'installing'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

type FailureStage =
  | 'dependency_resolution'
  | 'space_check_download'
  | 'download'
  | 'space_check_unpack'
  | 'verification'
  | 'structure_validation'
  | 'unpack'
  | 'space_check_commit'
  | 'atomic_switch'
  | 'record_commit'
  | 'cleanup';

type ResumeCapability =
  | 'not_applicable'
  | 'automatic_once'
  | 'manual'
  | 'restart_from_zero';

type PreflightResult = 'effective' | 'skipped' | 'risk';
type LoadDecision = 'load' | 'skip';

type ModLifecycleState =
  | 'available'
  | 'dependency_blocked'
  | 'queued'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'enabled'
  | 'disabled'
  | 'update_available'
  | 'failed'
  | 'incompatible';
```

`ModLifecycleState` 仅用于 UI 派生，不得持久化为唯一业务事实。`paused_by_system` 保存在 `InstallTask.state` 中，UI 对自动续传未完成的任务显示“系统已暂停”，对自动续传失败的任务显示“下载已暂停”；它不被压缩进 `ModLifecycleState`。

## 3. 外部目录数据

### 3.1 平台包与 MOD 记录

```typescript
interface DependencyConstraint {
  mod_id: string;
  kind: DependencyKind;
  version_range: string;
}

interface KnownConflict {
  conflicting_mod_id: string;
  severity: 'soft';
  description: string;
}

interface PlatformPackage {
  platform: ClientPlatform;
  download_url: string;
  package_hash: Sha256Hex;
  compressed_size_bytes: number;
  unpacked_size_bytes: number;
  peak_staging_size_bytes: number;
  supported_engine_versions: string[];
}

interface ExternalModRecord {
  source_id: string;
  source_mod_id: string;
  mod_id: string;
  game_id: GameId;
  name: string;
  author: string;
  summary: string;
  preview_images: string[];
  version: string;
  updated_at: Iso8601DateTime;
  packages: PlatformPackage[];
  dependencies: DependencyConstraint[];
  known_conflicts: KnownConflict[];
  compatibility_status: Record<ClientPlatform, CompatibilityStatus>;
  installation_notes: string;
  changelog: string;
  source_status: SourceStatus;
}
```

字段约束：

1. `source_id + source_mod_id` 是来源同步键；同一来源记录改名、改简介或发新版本时保持 `mod_id` 不变。
2. `mod_id` 是盖世游戏内部稳定 ID。不同来源记录只有经人工确认是同一 MOD 后才可合并为同一 `mod_id`。
3. `PlatformPackage` 是各平台下载地址、包哈希和三项空间元数据的唯一权威；`ExternalModRecord` 及其他响应位置不得复制这些字段。
4. 目录、详情和依赖闭包汇总必须从 `packages` 中读取 `platform` 与请求平台相同的唯一 `PlatformPackage`。没有匹配包时返回 `MOD_PLATFORM_INCOMPATIBLE`；匹配包多于一个时判定为上游合同错误，该记录不得提供安装操作，安装门禁返回 `SPACE_METADATA_MISSING` 并记录合同告警。
5. `PlatformPackage.compressed_size_bytes`、`PlatformPackage.unpacked_size_bytes`、`PlatformPackage.peak_staging_size_bytes` 均必填且为非负整数。任一根 MOD或硬依赖缺失、非法，或服务端闭包总量与逐包求和不一致，安装门禁返回 `SPACE_METADATA_MISSING`，不得创建任务。
6. `peak_staging_size_bytes` 只表示压缩包和最终版本目录以外的额外临时峰值，不得包含前两项。
7. 依赖、兼容或冲突信息不完整时，客户端显示“来源未提供”。兼容性未知是风险项，不得伪装为已检测兼容。
8. 来源文本均按不可执行文本处理；客户端不得执行安装说明、简介或更新记录中的命令、脚本和链接内容。

### 3.2 目录接口

```http
GET /v1/games/{game_id}/mods?platform={platform}&sort={sort}&query={query}&page_token={page_token}
```

请求规则：

|参数|位置|必填|值与行为|
|---|---|---|---|
|`game_id`|path|是|本合同只接受 `steam:322330`|
|`platform`|query|是|`mac` 或 `app`|
|`sort`|query|是|`popular`、`latest`、`recently_updated`|
|`query`|query|否|UTF-8 名称或作者模糊搜索词；空值等同全量|
|`page_token`|query|否|服务端返回的不透明分页令牌；第一页省略|

```typescript
interface ModDirectoryResponse {
  request_id: string;
  game_id: GameId;
  platform: ClientPlatform;
  items: ExternalModRecord[];
  next_page_token: string | null;
  synced_at: Iso8601DateTime;
}
```

- 只返回 `source_status = active`、属于 DST 且请求平台存在唯一 `PlatformPackage` 的记录；列表大小和安装门禁空间数据均从该包读取。
- 同一分页令牌同时只允许一个进行中的请求。客户端按 `mod_id` 去重，设备本地事实覆盖卡片缓存中的操作状态。
- `next_page_token = null` 表示没有更多数据；接口不承诺总页数。
- 默认热门排序；排序值相同则按 `updated_at` 倒序，再按 `mod_id` 升序保证稳定。
- 首次失败不得显示空状态；追加失败必须保留已加载条目和已有操作。

成功响应为 HTTP `200`。参数非法为 `400`，不支持的游戏为 `404`，服务不可用为 `503`；错误体使用 3.4 的 `ApiError`。

### 3.3 详情接口

```http
GET /v1/games/{game_id}/mods/{mod_id}?platform={platform}
```

```typescript
interface ModDetailResponse {
  request_id: string;
  game_id: GameId;
  platform: ClientPlatform;
  item: ExternalModRecord;
  synced_at: Iso8601DateTime;
}
```

- 活跃且请求平台存在唯一 `PlatformPackage` 的记录返回 HTTP `200`；详情大小、下载地址、哈希和空间数据均从该包读取。
- 已删除、转移到其他游戏或从未存在的记录对新用户返回 HTTP `404`。
- 下载源失效时返回 HTTP `410` 和 `SOURCE_UNAVAILABLE`，不得返回可执行的缓存下载地址。
- 客户端可为已安装用户展示此前缓存的不可执行来源文本，但启停、启动和卸载始终基于本地事实。
- 详情加载中或失败时，安装、更新、启停和卸载按钮不可用；只有关闭和重试可用。

### 3.4 接口错误体

```typescript
interface ApiError {
  request_id: string;
  code: ModErrorCode;
  message: string;
  retryable: boolean;
  failed_mod_id: string | null;
  dependency_chain: string[];
}
```

`dependency_chain` 按根 MOD 到首个阻塞依赖的最短路径排列；非依赖错误为空数组。

## 4. 来源同步、删除与失效

同步写入以 `source_id + source_mod_id` 做 upsert，以 `mod_id` 维持内部引用：

1. 名称、作者、简介、图片、版本和包字段变化时更新原记录，不新建重复 MOD。
2. 同版本的 `package_hash` 发生变化时，服务端立即禁止该包的新安装和更新，等待重新准入；客户端不得把新哈希静默覆盖为可更新包。
3. `removed` 表示来源记录已删除：从可用列表下架，已安装文件仍可使用；重新安装和更新统一返回 `SOURCE_UNAVAILABLE`。
4. `unavailable` 表示记录仍可识别但详情或下载地址失效：禁止重新安装和更新，不自动卸载，不删除本地版本，不修改启用值。
5. `wrong_game` 表示记录转移到其他游戏或 DLC：停止向 DST 新用户展示；已安装用户保留本地文件并在启动检查中按不兼容跳过。
6. 下架和失效只影响目录供给与新操作。客户端不得通过远程响应卸载本地 MOD。

## 5. 当前设备本地记录

```typescript
interface LocalModRecord {
  device_installation_id: string;
  game_id: GameId;
  mod_id: string;
  source_id: string;
  source_mod_id: string;

  installation_fact: InstallationFact;
  installed_version: string | null;
  installed_package_hash: Sha256Hex | null;
  active_version_pointer: string | null;
  rollback_version_pointer: string | null;
  installed_files: string[];

  enabled_value: EnabledValue;
  update_fact: UpdateFact;
  latest_version: string | null;
  latest_package_hash: Sha256Hex | null;
  update_checked_at: Iso8601DateTime | null;

  install_gate: InstallGate;
  gate_reason_code: ModErrorCode | null;
  current_task_id: string | null;
  installed_at: Iso8601DateTime | null;
  state_changed_at: Iso8601DateTime;
}
```

正交约束：

- `installation_fact = not_installed` 时，`installed_version`、`installed_package_hash`、两个版本指针和 `installed_at` 必须为 `null`，`installed_files` 必须为空，`enabled_value` 必须为 `not_applicable`。
- `installation_fact = installed` 时，当前版本指针、版本、哈希和文件清单必须全部有效，`enabled_value` 只能为 `enabled` 或 `disabled`。
- `update_fact` 独立于安装事实和启用值。更新失败后仍为 `update_available`；来源检查失败时为 `source_unknown`。
- `source_unknown` 只允许显示上次检查时间和不可执行摘要，不允许使用缓存地址更新。
- `current_task_id` 只指向当前活动或等待用户处理的失败任务。成功提交、取消或清理后置为 `null`。
- `installed_files` 只保存受控版本目录下的相对路径；不得保存绝对路径、存档路径或用户 MOD 配置路径。
- 入口、列表、详情、已安装页、启动检查和恢复建议页必须读取同一条 `LocalModRecord`、同一任务和同一事务日志。

本地持久化唯一键是：

```text
device_installation_id + game_id + mod_id
```

登录、退出、切换账号、APP 旋转和页面重建均不得改写这个设备事实。

## 6. UI 派生合同

UI 派生输出允许同时表达主状态和并行标识：

```typescript
interface DerivedModUiState {
  primary_state: ModLifecycleState;
  badges: ModLifecycleState[];
}

interface DerivedLifecycleInput {
  local: LocalModRecord;
  task: InstallTask | null;
}
```

派生优先级：

1. 活动任务映射为 `queued`、`downloading`、`verifying` 或 `installing`；`paused_by_system` 使用第 2 节规定的暂停文案。
2. 失败任务映射为 `failed`，同时保留旧版安装、启用和更新标识。
3. 已安装记录的主状态由 `enabled_value` 派生为 `enabled` 或 `disabled`。
4. `update_fact = update_available` 时在 `badges` 增加 `update_available`，不得覆盖 `enabled` 或 `disabled`。
5. 未安装且门禁阻塞时派生 `dependency_blocked` 或 `incompatible`；其余为 `available`。

更新任务进行中时，旧版启停控件必须常驻。新版本提交时继承用户最后一次写入的 `enabled_value`，不得恢复任务创建时的快照。

## 7. 根任务、续传与事务日志

### 7.1 任务数据

```typescript
interface InstallTransactionLog {
  log_id: string;
  task_id: string;
  root_task_id: string;
  package_lock_key: string;
  shared_reference_count: number;
  target_mod_id: string;
  target_version: string;
  target_package_hash: Sha256Hex;
  state: InstallTaskState;
  downloaded_bytes: number;
  staging_path: string;
  old_version_pointer: string | null;
  new_version_pointer: string | null;
  new_pointer_switched: boolean;
  local_record_committed: boolean;
  updated_at: Iso8601DateTime;
}

interface InstallTask {
  task_id: string;
  idempotency_key: string;
  device_installation_id: string;
  game_id: GameId;
  root_mod_id: string;
  operation: 'install' | 'update';
  mod_ids: string[];
  target_versions: Record<string, string>;
  target_package_hashes: Record<string, Sha256Hex>;
  state: InstallTaskState;
  progress_percent: number;
  downloaded_bytes: number;
  retry_count: number;
  resume_token: string | null;
  resume_capability: ResumeCapability;
  failure_stage: FailureStage | null;
  failure_code: ModErrorCode | null;
  transaction_log: InstallTransactionLog;
  created_at: Iso8601DateTime;
  updated_at: Iso8601DateTime;
}
```

约束：

- 本地任务幂等键是 `device_installation_id + game_id + root_mod_id`。同一幂等键同时最多有一个活动或待续传任务；重复点击、页面重建和旋转必须返回原 `task_id`。
- 幂等范围持续到任务成功、取消或用户清理失败任务。终态归档后，同一根 MOD 的后续人工更新可创建新任务。
- `mod_ids` 是统一解析后的完整硬依赖闭包，按底层依赖到根 MOD排列，最后一项必须为 `root_mod_id`。
- `progress_percent` 为 0 至 100 的整数，并由任务管理器计算，页面不得反向写入。
- `failure_stage` 和 `failure_code` 仅在 `state = failed` 时非空；其他状态均为 `null`。
- `paused_by_system` 必须保留原 `task_id`、`downloaded_bytes`、`staging_path` 和 `resume_token`。
- 回前台只自动续传一次，期间 `resume_capability = automatic_once`；自动续传失败后保持 `paused_by_system` 并改为 `manual`。
- 下载初始请求失败后按 2 秒、5 秒、10 秒自动重试三次。第三次仍失败时以 `DOWNLOAD_INTERRUPTED` 进入可手动续传的 `failed`。
- `queued`、`downloading`、`paused_by_system` 可取消；`verifying`、`installing` 不可取消。
- 每次状态变更前后必须落盘事务日志。页面缓存不是恢复依据。

### 7.2 进程恢复

|日志状态|取得包锁后的恢复动作|
|---|---|
|`queued`|重查门禁、空间和锁；满足后以原任务开始，否则按确定错误失败|
|`downloading` / `paused_by_system`|校验临时文件长度和 `resume_token`；一致则续传，不一致则删除损坏片段并以原任务从 0 下载|
|`verifying`|完整包存在则从头重跑哈希，不重新下载；包缺失则失败|
|`installing` 且指针未切换|删除未完成版本目录，复用已验证 staging 从安装阶段重跑|
|`installing` 且指针已切换、记录未提交|校验新目录和哈希；通过则补交记录，不通过则恢复旧指针并失败|
|`failed`|保留失败阶段、原因、续传能力和旧版事实，等待用户继续、重试或清理|

恢复完成前，页面只绑定原任务并展示恢复状态，不得创建新任务。

## 8. 共享硬依赖合同

```typescript
interface ResolvedDependencyPackage {
  mod_id: string;
  target_version: string;
  target_package_hash: Sha256Hex;
  required_by_root_task_ids: string[];
}

interface DependencyResolution {
  root_task_id: string;
  packages: ResolvedDependencyPackage[];
  blocking_code: ModErrorCode | null;
  blocking_chain: string[];
}

interface PackageLockRecord {
  package_lock_key: string;
  device_installation_id: string;
  game_id: GameId;
  mod_id: string;
  holder_package_task_id: string;
  target_package_hash: Sha256Hex;
  root_task_references: string[];
  reference_count: number;
  committed: boolean;
}
```

统一规则：

1. 根任务在取包锁前完成依赖版本统一解析，寻找所有并发根任务约束可共同满足的版本和唯一 `package_hash`。
2. 包锁键为 `device_installation_id + game_id + mod_id`。同一包锁一次只能处理一个目标哈希。
3. 两个根任务解析到同一哈希时，共用一个包任务；`root_task_references` 按根任务去重，`reference_count` 必须等于数组长度。
4. 后到根任务需要 H2 而锁中正在处理 H1 时，后到任务保持 `queued` 并显示“等待依赖任务”，不得加入 H1 的共享引用。
5. H1 成功提交后重新解析。若后到任务仍需要 H2，则返回 `DEPENDENCY_VERSION_CONFLICT`，根任务转为 `dependency_blocked`；不得下载或提交 H2，不得改变 H1 指针，先完成根任务的成功状态和启用值不变。
6. H1 在提交前取消或失败时，后到任务才可取得锁，重新检查门禁和空间后安装 H2。
7. 根任务取消或主 MOD失败只释放自己的共享引用。引用仍大于 0 时，共享包任务继续。
8. 共享包任务失败时，所有仍引用它的根任务使用同一失败码和依赖链结束，主 MOD 均不得安装。
9. 至少一个根任务成功提交依赖后，该依赖成为设备级安装事实；其他根任务失败不得回滚或卸载它。
10. 所有引用在提交前降为 0 时，取消共享包任务并清理其 staging；已有旧版依赖和指针保持不变。

`MOD_DEPENDENCY_UNAVAILABLE` 是目录服务对缺失、删除或失效硬依赖的错误；客户端持久化和启动检查统一映射为 `DEPENDENCY_UNRESOLVED`。`MOD_PLATFORM_INCOMPATIBLE` 是目录服务错误；客户端统一映射为 `PLATFORM_INCOMPATIBLE`。

## 9. 空间与受控目录

```typescript
type SpaceCheckPhase = 'before_download' | 'before_unpack' | 'before_commit';

interface SpaceCheckSnapshot {
  phase: SpaceCheckPhase;
  available_capacity_bytes: number;
  pending_compressed_size_bytes: number;
  pending_unpacked_size_bytes: number;
  remaining_peak_staging_size_bytes: number;
  required_new_bytes: number;
  safety_margin_bytes: number;
  checked_at: Iso8601DateTime;
}
```

每次检查直接读取目标卷操作系统实时返回的 `available_capacity_bytes`。该值已经反映非 MODS 文件、其他 MOD、当前版、回退版和已落盘任务文件，不得重复加减这些占用。

- 下载前 `required_new_bytes` = 待下载闭包压缩量 + 待写最终目录解包量 + 剩余额外 staging 峰值。
- 解包前 `required_new_bytes` = 待写最终目录解包量 + 解包阶段剩余额外 staging 峰值；已下载包不重复计算。
- 切换前 `required_new_bytes` 固定为 16 MiB，用于事务日志、文件清单和指针提交；已写新版本目录不重复计算。
- `safety_margin_bytes` = `max(required_new_bytes × 10%, 512 MiB)`。
- 三次均要求 `available_capacity_bytes >= required_new_bytes + safety_margin_bytes`，否则返回 `STORAGE_INSUFFICIENT`。
- 第三次失败还必须删除本任务未提交的新版本目录；旧版、回退版、共享引用仍大于 0 的文件和最近启用值保留。

目录规则：

- 下载只能写入应用受控的任务 staging 目录。
- 解包后的程序文件只能写入“当前设备 / DST / MOD ID / 版本”的受控版本目录。
- 指针、文件清单和事务日志只能写入受控元数据目录。
- 游戏存档和用户 MOD 配置不属于受控目录，任何安装、更新、回退、取消和卸载均不得改写。
- 解包前逐项规范化路径。绝对路径、盘符路径、包含 `..`、规范化后越出目标目录、符号链接或硬链接均返回 `ARCHIVE_PATH_ESCAPE`。
- 路径安全通过但缺少 DST 必要目录或文件时返回 `PACKAGE_STRUCTURE_INVALID`。

## 10. 安装、更新和卸载时序

规范摘要必须保持为：

```text
检查空间 → staging 下载 → `package_hash` 校验 → 目录结构检查 → 新版本目录 → 原子切换指针 → 文件清单 → 默认启用
```

完整安装时序：

1. 读取目录详情，校验来源、平台、引擎、空间元数据和硬依赖。
2. 执行依赖版本统一解析；不可满足时返回最短原因链，不创建任务。
3. 创建或复用根任务，按闭包顺序取得包锁和共享引用。
4. 执行下载前空间复查。
5. 下载到各包受控 staging，记录续传标识和事务日志。
6. 全部下载完成后执行解包前空间复查。
7. 校验每个 `package_hash`。
8. 先做路径安全检查，再做 DST 目录结构检查。
9. 按依赖从底层到上层写入新版本目录，根 MOD 最后。
10. 执行切换前空间复查。
11. 原子切换当前版本指针，写入本地文件清单和安装事实。
12. 首次安装把 `enabled_value` 写为 `enabled`；更新继承用户最近一次启用值。
13. 提交事务日志，释放锁和引用，任务变为 `succeeded`。

更新规则：

- 只有用户点击“更新”才创建任务，不静默自动更新。
- 同版本但哈希变化也执行完整更新，不原地覆盖。
- 新包提交前旧指针、旧文件清单、旧安装事实和旧启用值持续有效。
- 任一更新阶段失败时，旧版本指针和文件清单保持不变，`update_fact` 仍为 `update_available`。
- 原子切换失败时恢复旧指针，新目录不得被加载。
- 成功后保留最近一个成功版本作为回退版。

卸载规则：

- 二次确认必须列出依赖该 MOD 的已启用 MOD，并显示“只卸载当前设备中的 MOD 文件，不影响其他设备”。
- 确认后先写 `enabled_value = disabled`，再删除受控程序文件和文件清单，最后写 `installation_fact = not_installed` 与 `enabled_value = not_applicable`。
- 不删除存档和用户 MOD 配置；不自动卸载或停用依赖它的其他 MOD。
- 其他 MOD 在下次启动检查因硬依赖缺失而 `skipped`。
- 部分失败时返回 `UNINSTALL_PARTIAL`，扫描受控目录后重建实际本地事实。

## 11. 启动清单与日志证据

### 11.1 启动清单

```typescript
interface ResolvedLaunchItem {
  mod_id: string;
  local_version: string;
  package_hash: Sha256Hex;
  load_order: number;
  preflight_result: PreflightResult;
  load_decision: LoadDecision;
  reason_code: ModErrorCode | null;
  dependency_chain: string[];
  risk_confirmed: boolean;
}

interface ResolvedLaunchManifest {
  manifest_id: string;
  launch_id: string;
  game_id: GameId;
  device_installation_id: string;
  generated_at: Iso8601DateTime;
  items: ResolvedLaunchItem[];
}
```

生成规则：

1. 只读取当前设备 `installation_fact = installed` 且 `enabled_value = enabled` 的 MOD。
2. 校验本地文件清单和哈希，解析完整硬依赖闭包，检查平台、引擎和已知冲突。
3. 文件、闭包和兼容均正常为 `effective + load`。
4. 文件损坏、硬依赖不完整或不兼容为 `skipped + skip`，并填写错误码和最短依赖链。
5. 软冲突或兼容未知为 `risk`；用户确认后为 `load` 且 `risk_confirmed = true`。用户未确认不得启动，也不得改写启用值。
6. 没有已启用 MOD 时仍生成 `items = []` 的清单并直接启动，不显示额外确认页。
7. DST 只能从当前清单中 `load_decision = load` 的完整受控版本目录加载 MOD。

### 11.2 实际加载证据

```typescript
type EvidenceParseStatus = 'parsed' | 'log_unreadable' | 'parser_failed';
type EvidenceResult =
  | 'loaded_match'
  | 'missing'
  | 'version_mismatch'
  | 'unexpected_loaded';

interface ActualLoadEvidenceItem {
  mod_id: string;
  expected_local_version: string | null;
  logged_local_version: string | null;
  result: EvidenceResult;
  matched_log_lines: string[];
}

interface ActualLoadEvidence {
  evidence_id: string;
  manifest_id: string;
  launch_id: string;
  game_id: GameId;
  device_installation_id: string;
  log_source: 'game' | 'engine';
  raw_log_path: string;
  parse_status: EvidenceParseStatus;
  collected_at: Iso8601DateTime;
  items: ActualLoadEvidenceItem[];
}
```

证据一致性规则：

- `ActualLoadEvidence.manifest_id`、`launch_id`、`game_id` 和 `device_installation_id` 必须与对应清单完全一致。
- 每个 `load_decision = load` 的清单项都必须有一条同 `mod_id` 的证据项；日志版本与 `local_version` 相同才是 `loaded_match`。
- 清单为 `skip` 但日志实际加载，或日志出现清单外 MOD，记录 `unexpected_loaded`，启动不得判为合同一致。
- 日志不可读、解析失败、缺少 MOD 或版本不一致时返回 `LOG_EVIDENCE_MISSING`，保存原始日志路径和解析结果，不计入“实际生效”。
- 文件复制、安装成功、启用值、预检查通过或进入清单均不得生成 `loaded_match`。
- 最近成功清单只允许由启动成功且所有计划加载项均有确定证据的记录更新。

恢复建议通过本次清单与最近成功清单比较新安装、重新启用、版本和依赖变化。系统只在清单有变化且异常退出时显示“停用本次变化后重试”“无 MOD 启动”“保持当前设置继续尝试”；默认不执行，不自动修改状态。

## 12. 错误码

```typescript
type ModErrorCode =
  | 'NETWORK_UNAVAILABLE'
  | 'MOD_DEPENDENCY_UNAVAILABLE'
  | 'MOD_PLATFORM_INCOMPATIBLE'
  | 'DEPENDENCY_UNRESOLVED'
  | 'DEPENDENCY_VERSION_CONFLICT'
  | 'PLATFORM_INCOMPATIBLE'
  | 'STORAGE_INSUFFICIENT'
  | 'SPACE_METADATA_MISSING'
  | 'DOWNLOAD_FAILED'
  | 'DOWNLOAD_INTERRUPTED'
  | 'PACKAGE_HASH_MISMATCH'
  | 'PACKAGE_STRUCTURE_INVALID'
  | 'ARCHIVE_PATH_ESCAPE'
  | 'ATOMIC_SWITCH_FAILED'
  | 'SOURCE_UNAVAILABLE'
  | 'TASK_CONFLICT'
  | 'LOCAL_FILE_MISSING'
  | 'LOG_EVIDENCE_MISSING'
  | 'UNINSTALL_PARTIAL';
```

|错误码|产生位置|任务与本地事实|可恢复动作|
|---|---|---|---|
|`NETWORK_UNAVAILABLE`|目录、详情或下载开始前无网络|不覆盖本地状态|重试目录或详情；已有版本仍可管理|
|`MOD_DEPENDENCY_UNAVAILABLE`|目录服务发现硬依赖缺失、删除或失效|不创建任务|展示最短原因链|
|`MOD_PLATFORM_INCOMPATIBLE`|目录服务发现平台或引擎不兼容|不创建任务|查看原因|
|`DEPENDENCY_UNRESOLVED`|客户端安装门禁或启动检查的硬依赖闭包不完整|安装禁止；启动项跳过|来源恢复后重查|
|`DEPENDENCY_VERSION_CONFLICT`|H1 已提交，后到根任务仍要求 H2|后到任务阻塞；H1 与先任务不变|依赖约束变化后重新解析|
|`PLATFORM_INCOMPATIBLE`|客户端门禁或启动检查不兼容|安装禁止；已安装项跳过|使用兼容包或平台|
|`STORAGE_INSUFFICIENT`|任一阶段空间复查失败|清理独占临时内容；旧版与启用值不变|清理空间后重试|
|`SPACE_METADATA_MISSING`|任一闭包项空间字段缺失或非法|不创建任务、不下载|服务端补齐并重新准入|
|`DOWNLOAD_FAILED`|不可续传的下载失败|任务失败；旧版不变|从 0 重试|
|`DOWNLOAD_INTERRUPTED`|三次自动重试后仍中断|任务失败并保留有效断点|继续或取消|
|`PACKAGE_HASH_MISMATCH`|哈希不一致|删除本次临时包；旧版不变|重新下载|
|`PACKAGE_STRUCTURE_INVALID`|安全路径内的 DST 包结构不合法|不切换指针|更换合法包|
|`ARCHIVE_PATH_ESCAPE`|绝对路径、`..`、越界或链接|拒绝解包并清理独占 staging|来源更换安全包|
|`ATOMIC_SWITCH_FAILED`|版本指针提交失败|恢复旧指针；新目录不可加载|重试更新|
|`SOURCE_UNAVAILABLE`|来源删除、失效或下载地址不可用|禁止重新安装和更新；不自动卸载|等待来源恢复或使用已安装版|
|`TASK_CONFLICT`|同一幂等键已有任务|返回原任务，不新增任务|绑定原任务|
|`LOCAL_FILE_MISSING`|文件清单或哈希校验失败|启动项跳过|重新安装|
|`LOG_EVIDENCE_MISSING`|日志不可读、缺项或版本不符|不计实际生效|保留日志并排查|
|`UNINSTALL_PARTIAL`|卸载未完整提交|重扫目录后显示事实|重试卸载|

## 13. 端到端示例

示例只使用本合同已定义字段。

```typescript
const localRecord: LocalModRecord = {
  device_installation_id: 'device-app-01',
  game_id: 'steam:322330',
  mod_id: 'mod.quick-stack',
  source_id: 'source.community-a',
  source_mod_id: '8842',
  installation_fact: 'installed',
  installed_version: '1.4.0',
  installed_package_hash: '4dd0f88ab21f1e91f7a98d584d04c0b63822d331740420d0806cb1d73f343def',
  active_version_pointer: 'mods/mod.quick-stack/1.4.0',
  rollback_version_pointer: 'mods/mod.quick-stack/1.3.2',
  installed_files: ['modinfo.lua', 'modmain.lua'],
  enabled_value: 'enabled',
  update_fact: 'no_update',
  latest_version: '1.4.0',
  latest_package_hash: '4dd0f88ab21f1e91f7a98d584d04c0b63822d331740420d0806cb1d73f343def',
  update_checked_at: '2026-07-30T16:30:00+08:00',
  install_gate: 'allowed',
  gate_reason_code: null,
  current_task_id: null,
  installed_at: '2026-07-30T16:20:00+08:00',
  state_changed_at: '2026-07-30T16:20:00+08:00'
};

const manifest: ResolvedLaunchManifest = {
  manifest_id: 'manifest-01',
  launch_id: 'launch-01',
  game_id: 'steam:322330',
  device_installation_id: 'device-app-01',
  generated_at: '2026-07-30T16:40:00+08:00',
  items: [
    {
      mod_id: 'mod.quick-stack',
      local_version: '1.4.0',
      package_hash: '4dd0f88ab21f1e91f7a98d584d04c0b63822d331740420d0806cb1d73f343def',
      load_order: 1,
      preflight_result: 'effective',
      load_decision: 'load',
      reason_code: null,
      dependency_chain: [],
      risk_confirmed: false
    }
  ]
};

const evidence: ActualLoadEvidence = {
  evidence_id: 'evidence-01',
  manifest_id: 'manifest-01',
  launch_id: 'launch-01',
  game_id: 'steam:322330',
  device_installation_id: 'device-app-01',
  log_source: 'game',
  raw_log_path: 'logs/launch-01/game.log',
  parse_status: 'parsed',
  collected_at: '2026-07-30T16:41:00+08:00',
  items: [
    {
      mod_id: 'mod.quick-stack',
      expected_local_version: '1.4.0',
      logged_local_version: '1.4.0',
      result: 'loaded_match',
      matched_log_lines: ['Loaded mod.quick-stack version 1.4.0']
    }
  ]
};
```

该示例中只有 `evidence.items[0].result = loaded_match` 能证明实际加载。`localRecord.enabled_value` 和 `manifest.items[0].preflight_result` 只分别证明用户启用事实和启动前判定。

## 14. 验收不变量

实现进入联调前必须同时满足：

1. 目录与详情响应通过 `source_id + source_mod_id` 保持同一 MOD 关系，改名不生成重复条目。
2. Mac 和每台 APP 使用不同 `device_installation_id`，不得同步本地安装、启用、更新和任务事实。
3. 任一 MOD和硬依赖均有三个合法空间字段；三次空间检查使用 OS 实时可用字节且不重复计数。
4. 同一根任务幂等键只有一个活动任务；同一包锁只有一个目标哈希和一个活动包任务。
5. 异哈希且 H1 已提交时，H2 必须以 `DEPENDENCY_VERSION_CONFLICT` 阻塞，H1 不被替换。
6. 系统暂停、旋转、页面重建和进程恢复均复用原 `task_id`、断点和事务日志。
7. 更新失败时旧版本指针和文件清单保持不变，旧版启用值与 `update_available` 保持不变。
8. 恶意路径或链接以 `ARCHIVE_PATH_ESCAPE` 拒绝，受控目录外无文件变化。
9. 来源删除或失效时停止曝光、新安装和更新；已安装文件仍可使用，禁止重新安装和更新，不自动卸载。
10. 每个计划加载项都能用相同清单 ID 和启动 ID 关联日志证据；缺少匹配日志不得计为实际生效。
11. 无 MOD 启动生成空 `ResolvedLaunchManifest`，不新增确认页，不修改本地启用值。
12. 安装、更新、取消、卸载和恢复不得删除或覆盖游戏存档及用户 MOD 配置。

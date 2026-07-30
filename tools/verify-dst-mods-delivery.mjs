import { pathToFileURL } from 'node:url';
import { validateRules } from './lib/dst-mods-delivery-validator.mjs';

const rules = [
  {
    path: 'prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md',
    required: [
      /^# 【PRD】《盖世游戏》DST本地MODS跨平台需求$/m,
      /^## 1\. 文档信息$/m,
      /^## 4\. 范围与非目标$/m,
      /^## 6\. 业务规则$/m,
      /^## 7\. Mac 页面与交互$/m,
      /^## 8\. APP 竖屏页面与交互$/m,
      /^## 9\. APP 横屏页面与交互$/m,
      /^## 10\. 横竖屏切换规则$/m,
      /^## 11\. 状态与异常$/m,
      /^## 12\. 验收标准$/m,
      /Steam App ID：322330/,
      /仅此设备/,
      /安装（含 N 个必要依赖）/,
      /resolved_launch_manifest/,
      /不自动修改用户状态/
    ]
  },
  {
    path: 'prd/mod功能/DST-MODS-端到端合同-v1.md',
    required: [
      /^# DST MODS 端到端合同 v1$/m,
      /type ClientPlatform = 'mac' \| 'app';/,
      /type ModLifecycleState =/,
      /`ModLifecycleState` 仅用于 UI 派生/,
      /type InstallationFact = 'not_installed' \| 'installed';/,
      /type EnabledValue = 'enabled' \| 'disabled' \| 'not_applicable';/,
      /type UpdateFact = 'no_update' \| 'update_available' \| 'source_unknown';/,
      /interface PlatformPackage/,
      /interface ExternalModRecord/,
      /interface LocalModRecord/,
      /interface InstallTask/,
      /interface InstallTransactionLog/,
      /interface ResolvedLaunchManifest/,
      /interface ActualLoadEvidence/,
      /compressed_size_bytes: number;/,
      /unpacked_size_bytes: number;/,
      /peak_staging_size_bytes: number;/,
      /installation_fact: InstallationFact;/,
      /enabled_value: EnabledValue;/,
      /update_fact: UpdateFact;/,
      /paused_by_system/,
      /failure_stage: FailureStage \| null;/,
      /resume_capability: ResumeCapability;/,
      /transaction_log: InstallTransactionLog;/,
      /GET \/v1\/games\/\{game_id\}\/mods/,
      /GET \/v1\/games\/\{game_id\}\/mods\/\{mod_id\}/,
      /source_id \+ source_mod_id/,
      /device_installation_id \+ game_id \+ root_mod_id/,
      /依赖版本统一解析/,
      /包锁/,
      /共享引用/,
      /检查空间 → staging 下载 → `package_hash` 校验 → 目录结构检查 → 新版本目录 → 原子切换指针 → 文件清单 → 默认启用/,
      /旧版本指针和文件清单保持不变/,
      /从可用列表下架，已安装文件仍可使用/,
      /禁止重新安装和更新，不自动卸载/,
      /MOD_DEPENDENCY_UNAVAILABLE/,
      /MOD_PLATFORM_INCOMPATIBLE/,
      /STORAGE_INSUFFICIENT/,
      /DOWNLOAD_FAILED/,
      /DOWNLOAD_INTERRUPTED/,
      /PACKAGE_HASH_MISMATCH/,
      /PACKAGE_STRUCTURE_INVALID/,
      /DEPENDENCY_VERSION_CONFLICT/,
      /SPACE_METADATA_MISSING/,
      /ARCHIVE_PATH_ESCAPE/,
      /ATOMIC_SWITCH_FAILED/,
      /SOURCE_UNAVAILABLE/,
      /LOG_EVIDENCE_MISSING/
    ],
    forbidden: [
      /compressed_size_bytes: Record<ClientPlatform, number>;/,
      /unpacked_size_bytes: Record<ClientPlatform, number>;/,
      /peak_staging_size_bytes: Record<ClientPlatform, number>;/
    ]
  },
  {
    path: 'prd/mod功能/DST-MODS-技术Go-No-Go验证方案.md',
    required: [
      /^# DST MODS 技术 Go\/No-Go 验证方案$/m,
      /状态：未执行/,
      /game_id = steam:322330/,
      /前置条件/,
      /注入/,
      /操作/,
      /必须证据/,
      /唯一通过条件/,
      /执行记录字段/,
      /GATE-MAC-001/,
      /GATE-APP-001/,
      /GATE-LOG-001/,
      /GATE-ROTATE-001/,
      /GATE-BG-001/,
      /GATE-ROLLBACK-001/,
      /GATE-BASELINE-001/,
      /GATE-RECOVERY-001/,
      /GATE-DEP-SAMEHASH-001/,
      /GATE-DEP-DIFFHASH-COMMITTED-001/,
      /GATE-DEP-DIFFHASH-UNCOMMITTED-001/,
      /GATE-SPACE-DOWNLOAD-001/,
      /GATE-SPACE-UNPACK-001/,
      /GATE-SPACE-COMMIT-001/,
      /GATE-PATH-ESCAPE-001/,
      /GATE-PROCESS-001/,
      /GATE-SOURCE-UNKNOWN-001/,
      /DEPENDENCY_VERSION_CONFLICT/,
      /available_capacity_bytes/,
      /16 MiB/,
      /ARCHIVE_PATH_ESCAPE/,
      /paused_by_system/,
      /source_unknown/,
      /任何 P0 失败均为 No-Go/,
      /无法用游戏或引擎日志证明实际加载均为 No-Go/,
      /任何一项失败均为 No-Go/
    ]
  },
  {
    path: 'prd/mod功能/DST-MODS-埋点与指标字典-v1.md',
    required: [
      /^# DST MODS 埋点与指标字典 v1$/m,
      /^mods_entry_view$/m,
      /^mods_detail_view$/m,
      /^mods_install_click$/m,
      /^mods_download_result$/m,
      /^mods_install_result$/m,
      /^mods_enable_change$/m,
      /^mods_update_result$/m,
      /^mods_uninstall_result$/m,
      /^mods_preflight_result$/m,
      /^mods_launch_result$/m,
      /^mods_recovery_action$/m,
      /event_time/,
      /game_id/,
      /mod_id/,
      /mod_version/,
      /device_installation_id/,
      /device_platform/,
      /screen_orientation/,
      /task_id/,
      /package_hash/,
      /result/,
      /failure_reason/,
      /source_id/,
      /source_mod_id/,
      /launch_id/,
      /manifest_id/,
      /channel_package/,
      /language/,
      /client_build/,
      /operation/,
      /ActualLoadEvidence\.loaded_match/,
      /source_unknown/,
      /paused_by_system/,
      /DEPENDENCY_UNRESOLVED/,
      /DEPENDENCY_VERSION_CONFLICT/,
      /STORAGE_INSUFFICIENT/,
      /SPACE_METADATA_MISSING/,
      /ARCHIVE_PATH_ESCAPE/,
      /一键安装成功率/,
      /下载、校验和安装失败原因分布/,
      /已启用 MOD 实际生效率/,
      /携带 MOD 的游戏启动成功率/,
      /MOD 变化后的异常退出率/,
      /异常退出后的恢复成功率/,
      /安装完成后 7 日内再次使用率/,
      /无 MOD 降级启动成功率/,
      /重复下载或重复安装任务数/,
      /游戏存档或用户配置丢失事件数/,
      /最近 7 个完整自然日/,
      /零容忍/
    ]
  }
];

export async function verifyDstModsDelivery(root = process.cwd()) {
  return validateRules(root, rules);
}

async function main() {
  const errors = await verifyDstModsDelivery();
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log('DST MODS delivery verified');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

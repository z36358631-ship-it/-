# DST Local MODS Product Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的 DST 本地 MODS 跨平台设计转化为 Mac、APP、服务端、数据和测试团队可直接评审与执行的纯文字交付包。

**Architecture:** 以已批准的产品设计为唯一上游，主 PRD 统一业务口径，端到端合同统一状态、接口和字段，技术 Go/No-Go、埋点、验收用例与灰度方案分别承担技术可行性、可观测性和放量决策。当前工作区没有盖世游戏 Mac/APP 客户端源码，因此本计划不虚构业务代码路径，也不修改旧 HTML Demo；取得真实源码仓库后，必须再分别生成 Mac、APP、服务端代码实施计划。

**Tech Stack:** Markdown、CSV、Node.js 20+ 内置测试框架、PowerShell、Git

---

## 范围与文件结构

已确认的上游设计：

- Read: `docs/superpowers/specs/2026-07-30-dst-local-mods-cross-platform-design.md`

本计划创建：

- Create: `tools/lib/dst-mods-delivery-validator.mjs` — 文本交付物通用校验函数
- Create: `test/dst-mods/delivery-validator.test.mjs` — 校验函数单元测试
- Create: `tools/verify-dst-mods-delivery.mjs` — MODS 交付包合同清单与命令行校验入口
- Create: `prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md` — 唯一业务规则与交互来源
- Create: `prd/mod功能/DST-MODS-端到端合同-v1.md` — 服务端数据、客户端本地状态、安装任务、启动清单和错误码
- Create: `prd/mod功能/DST-MODS-技术Go-No-Go验证方案.md` — 真实设备运行链路闸门
- Create: `prd/mod功能/DST-MODS-埋点与指标字典-v1.md` — 事件、字段和指标口径
- Create: `测试用例/测试文件/盖世游戏-DST-MODS-跨端验收.csv` — Mac、APP 横竖屏和异常链路用例
- Create: `prd/mod功能/DST-MODS-灰度与监控方案.md` — 20–50 个 MOD、20–50 名用户的灰度决策规则

明确不修改：

- `demos/Mod与发行人/Mod功能Mac端demo.html`
- `demos/Mod与发行人/Mod功能APP端demo.html`
- `demos/Mod与发行人/Mod功能APP端-场景联动demo.html`
- `prd/mod功能/APP创意工坊参考图/**`
- `prd/mod功能/Mac端mod图片/**`
- `prd/mod功能/创意工坊参考图/**`
- `prd/mod功能/竞品功能参考图/**`

客户端代码计划的进入条件：

1. 提供真实 Mac 客户端仓库路径和构建、测试命令。
2. 提供真实 APP 客户端仓库路径、目标系统和构建、测试命令。
3. 提供 MOD 目录服务或同步服务仓库路径、接口框架和测试命令。
4. 在上述仓库中确认游戏启动、设备级任务管理、日志读取和本地持久化的现有实现位置。

进入条件满足后分成三份独立计划；任何一份计划都必须使用仓库内真实文件路径，不以本计划中的合同文件代替代码勘察。

### Task 1: 建立交付包校验基础

**Files:**

- Create: `tools/lib/dst-mods-delivery-validator.mjs`
- Create: `test/dst-mods/delivery-validator.test.mjs`

- [ ] **Step 1: 编写缺失实现时失败的单元测试**

创建 `test/dst-mods/delivery-validator.test.mjs`：

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateCsvHeader,
  validateRules
} from '../../tools/lib/dst-mods-delivery-validator.mjs';

test('validateRules reports missing files and missing contract text', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dst-mods-validator-'));
  await writeFile(join(root, 'present.md'), '# 标题\n仅此设备\n', 'utf8');

  const errors = await validateRules(root, [
    {
      path: 'present.md',
      required: [/^# 标题$/m, /resolved_launch_manifest/]
    },
    {
      path: 'missing.md',
      required: [/内容/]
    }
  ]);

  assert.deepEqual(errors, [
    'present.md: missing /resolved_launch_manifest/',
    'missing.md: file not found'
  ]);
});

test('validateRules accepts matching UTF-8 content', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dst-mods-validator-'));
  await mkdir(join(root, 'nested'), { recursive: true });
  await writeFile(
    join(root, 'nested', 'contract.md'),
    '# 合同\n仅此设备\nresolved_launch_manifest\n',
    'utf8'
  );

  const errors = await validateRules(root, [
    {
      path: 'nested/contract.md',
      required: [/^# 合同$/m, /仅此设备/, /resolved_launch_manifest/]
    }
  ]);

  assert.deepEqual(errors, []);
});

test('validateCsvHeader compares the exact ordered header', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dst-mods-validator-'));
  await writeFile(join(root, 'cases.csv'), '用例ID,端,预期结果\nA-001,Mac,通过\n', 'utf8');

  assert.deepEqual(
    await validateCsvHeader(root, 'cases.csv', ['用例ID', '端', '预期结果']),
    []
  );
  assert.deepEqual(
    await validateCsvHeader(root, 'cases.csv', ['用例ID', '平台', '预期结果']),
    ['cases.csv: CSV header mismatch']
  );
});
```

- [ ] **Step 2: 运行测试并确认失败原因**

Run:

```powershell
node --test test/dst-mods/delivery-validator.test.mjs
```

Expected: FAIL，错误指向 `tools/lib/dst-mods-delivery-validator.mjs` 不存在。

- [ ] **Step 3: 实现最小校验函数**

创建 `tools/lib/dst-mods-delivery-validator.mjs`：

```javascript
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function readUtf8(root, relativePath) {
  try {
    return await readFile(resolve(root, relativePath), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function validateRules(root, rules) {
  const errors = [];

  for (const rule of rules) {
    const content = await readUtf8(root, rule.path);
    if (content === null) {
      errors.push(`${rule.path}: file not found`);
      continue;
    }

    for (const pattern of rule.required ?? []) {
      if (!pattern.test(content)) {
        errors.push(`${rule.path}: missing ${pattern}`);
      }
    }

    for (const pattern of rule.forbidden ?? []) {
      if (pattern.test(content)) {
        errors.push(`${rule.path}: forbidden ${pattern}`);
      }
    }
  }

  return errors;
}

export async function validateCsvHeader(root, relativePath, expectedColumns) {
  const content = await readUtf8(root, relativePath);
  if (content === null) return [`${relativePath}: file not found`];

  const firstLine = content.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0];
  return firstLine === expectedColumns.join(',')
    ? []
    : [`${relativePath}: CSV header mismatch`];
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run:

```powershell
node --test test/dst-mods/delivery-validator.test.mjs
```

Expected: 3 tests PASS，0 tests FAIL。

- [ ] **Step 5: 提交校验基础**

```powershell
git add -- 'tools/lib/dst-mods-delivery-validator.mjs' 'test/dst-mods/delivery-validator.test.mjs'
git commit -m 'test(mods): add delivery contract validator'
```

### Task 2: 输出开发可执行主 PRD

**Files:**

- Create: `prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md`
- Create: `tools/verify-dst-mods-delivery.mjs`

- [ ] **Step 1: 创建只校验主 PRD 的失败合同**

创建 `tools/verify-dst-mods-delivery.mjs`：

```javascript
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
```

- [ ] **Step 2: 运行合同并确认主 PRD 缺失**

Run:

```powershell
node tools/verify-dst-mods-delivery.mjs
```

Expected: FAIL，唯一文件级错误为主 PRD `file not found`。

- [ ] **Step 3: 按固定结构创建主 PRD**

从 `docs/superpowers/specs/2026-07-30-dst-local-mods-cross-platform-design.md` 复用已确认内容，不改变下列已确认决策，并按以下结构创建主 PRD：

```markdown
# 【PRD】《盖世游戏》DST本地MODS跨平台需求

## 1. 文档信息
## 2. 背景与问题
## 3. 目标与成功标准
## 4. 范围与非目标
## 5. 用户角色与核心场景
## 6. 业务规则
### 6.1 MODS 与创意工坊隔离
### 6.2 设备级安装边界
### 6.3 一键安装与依赖
### 6.4 更新、回退与卸载
### 6.5 启动前检查与实际加载证据
### 6.6 异常退出与恢复建议
## 7. Mac 页面与交互
## 8. APP 竖屏页面与交互
## 9. APP 横屏页面与交互
## 10. 横竖屏切换规则
## 11. 状态与异常
## 12. 验收标准
## 13. 数据与灰度
## 14. 依赖、风险与发布前置
```

文档信息必须写明：

```text
验证游戏：《饥荒联机版》DST
Steam App ID：322330
覆盖端：Mac、APP 竖屏、APP 横屏、APP 运行中旋转
内容来源：外部非官方 MOD 来源
状态边界：安装、启用、停用、更新、卸载均跟当前设备走
```

“MODS 与创意工坊隔离”必须使用以下对照：

| 维度 | 本期 MODS | 创意工坊 |
|---|---|---|
| 来源 | 外部非官方来源 | 官方接入渠道 |
| 用户动作 | 下载、校验、安装、启停、更新、卸载 | 订阅、取消订阅 |
| 本期处理 | 完整设计并落地 | 不改造，仅参考信息布局 |
| 数据与文件 | 独立数据表、接口命名和本地目录 | 不与 MODS 复用 |

“设备级安装边界”必须使用以下文案：

```text
已安装 · 已启用 · 仅此设备
已安装 · 未启用 · 仅此设备
只卸载当前设备中的 MOD 文件，不影响其他设备。
```

“一键安装与依赖”必须明确：

1. 点击一次“安装”后自动完成下载、`package_hash` 校验、原子安装和默认启用。
2. 硬依赖可用时按钮为“安装（含 N 个必要依赖）”，一次安装完整依赖闭包。
3. 硬依赖缺失、失效或本端不兼容时禁止安装主 MOD。
4. 软依赖、软冲突或兼容性未知时允许安装，但必须在安装前提示风险。
5. 更新失败继续使用旧版，不静默自动更新。

Mac、APP 竖屏和 APP 横屏章节都要逐页写出入口、列表、详情、已安装、启动检查、恢复建议的元素、动作、状态和异常。APP 横竖屏切换章节必须明确保留当前页签、搜索词、排序、当前 MOD、阅读章节、列表位置和安装任务，且旋转不得重发接口、下载或安装。

状态表必须完整定义：

```text
available
dependency_blocked
queued
downloading
verifying
installing
enabled
disabled
update_available
failed
incompatible
```

启动规则必须说明只检查当前设备已启用 MOD，生成 `resolved_launch_manifest`；进入游戏后读取游戏或引擎日志确认实际加载。异常退出后只提供“停用本次变化后重试”“无 MOD 启动”“保持当前设置继续尝试”，不自动修改用户状态，不删除游戏存档或 MOD 配置。

- [ ] **Step 4: 运行主 PRD 合同**

Run:

```powershell
node tools/verify-dst-mods-delivery.mjs
```

Expected: PASS，输出 `DST MODS delivery verified`。

- [ ] **Step 5: 提交主 PRD**

```powershell
git add -- 'prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md' 'tools/verify-dst-mods-delivery.mjs'
git commit -m 'docs(mods): add cross-platform product requirements'
```

### Task 3: 固化端到端状态与数据合同

**Files:**

- Create: `prd/mod功能/DST-MODS-端到端合同-v1.md`
- Modify: `tools/verify-dst-mods-delivery.mjs`

- [ ] **Step 1: 先扩展合同清单**

向 `rules` 追加：

```javascript
{
  path: 'prd/mod功能/DST-MODS-端到端合同-v1.md',
  required: [
    /^# DST MODS 端到端合同 v1$/m,
    /type ClientPlatform = 'mac' \| 'app'/,
    /type ModLifecycleState =/,
    /interface ExternalModRecord/,
    /interface LocalModRecord/,
    /interface InstallTask/,
    /interface ResolvedLaunchManifest/,
    /MOD_DEPENDENCY_UNAVAILABLE/,
    /PACKAGE_HASH_MISMATCH/,
    /SOURCE_UNAVAILABLE/
  ]
}
```

- [ ] **Step 2: 运行合同并确认端到端合同缺失**

Run:

```powershell
node tools/verify-dst-mods-delivery.mjs
```

Expected: FAIL，仅新增端到端合同报告 `file not found`。

- [ ] **Step 3: 创建统一类型合同**

在合同中定义并始终复用以下类型名和字段名：

```typescript
type ClientPlatform = 'mac' | 'app';

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

type PreflightResult = 'effective' | 'skipped' | 'risk';

interface PlatformPackage {
  platform: ClientPlatform;
  download_url: string;
  package_hash: string;
  file_size_bytes: number;
  supported_engine_versions: string[];
}

interface ExternalModRecord {
  source_id: string;
  source_mod_id: string;
  mod_id: string;
  game_id: 'steam:322330';
  name: string;
  author: string;
  summary: string;
  preview_images: string[];
  version: string;
  updated_at: string;
  packages: PlatformPackage[];
  hard_dependencies: string[];
  soft_dependencies: string[];
  known_conflicts: string[];
  installation_notes: string;
  changelog: string;
  source_status: 'active' | 'removed' | 'unavailable';
}

interface LocalModRecord {
  device_installation_id: string;
  game_id: 'steam:322330';
  mod_id: string;
  source_id: string;
  source_mod_id: string;
  installed_version: string;
  installed_package_hash: string;
  active_version_pointer: string;
  installed_files: string[];
  state: ModLifecycleState;
  enabled: boolean;
  installed_at: string;
  updated_at: string;
}

interface InstallTask {
  task_id: string;
  device_installation_id: string;
  game_id: 'steam:322330';
  root_mod_id: string;
  mod_ids: string[];
  target_versions: Record<string, string>;
  state: 'queued' | 'downloading' | 'verifying' | 'installing' | 'succeeded' | 'failed' | 'cancelled';
  progress_percent: number;
  failure_code: string | null;
  created_at: string;
  updated_at: string;
}

interface ResolvedLaunchItem {
  mod_id: string;
  local_version: string;
  package_hash: string;
  load_order: number;
  preflight_result: PreflightResult;
  reason_code: string | null;
}

interface ResolvedLaunchManifest {
  manifest_id: string;
  game_id: 'steam:322330';
  device_installation_id: string;
  generated_at: string;
  items: ResolvedLaunchItem[];
}
```

合同还必须包含：

- 目录接口：`GET /v1/games/{game_id}/mods`
- 详情接口：`GET /v1/games/{game_id}/mods/{mod_id}`
- 同步键：`source_id + source_mod_id`
- 本地任务幂等键：`device_installation_id + game_id + root_mod_id`
- 安装顺序：空间检查 → staging 下载 → `package_hash` 校验 → 目录结构检查 → 新版本目录 → 原子切换指针 → 文件清单 → 默认启用
- 更新失败规则：旧版本指针和文件清单保持不变
- 来源删除规则：从可用列表下架，已安装文件仍可使用
- 来源失效规则：禁止重新安装和更新，不自动卸载
- 错误码：`MOD_DEPENDENCY_UNAVAILABLE`、`MOD_PLATFORM_INCOMPATIBLE`、`STORAGE_INSUFFICIENT`、`DOWNLOAD_FAILED`、`PACKAGE_HASH_MISMATCH`、`PACKAGE_STRUCTURE_INVALID`、`ATOMIC_SWITCH_FAILED`、`SOURCE_UNAVAILABLE`

- [ ] **Step 4: 运行合同和类型名一致性检查**

Run:

```powershell
node tools/verify-dst-mods-delivery.mjs
rg -n 'ResolvedLaunchManifest|device_installation_id|installed_package_hash|root_mod_id' 'prd/mod功能/DST-MODS-端到端合同-v1.md'
```

Expected: 校验器 PASS；四个关键类型或字段均有定义且被后续流程引用。

- [ ] **Step 5: 提交端到端合同**

```powershell
git add -- 'prd/mod功能/DST-MODS-端到端合同-v1.md' 'tools/verify-dst-mods-delivery.mjs'
git commit -m 'docs(mods): define end-to-end contracts'
```

### Task 4: 定义技术 Go/No-Go 闸门

**Files:**

- Create: `prd/mod功能/DST-MODS-技术Go-No-Go验证方案.md`
- Modify: `tools/verify-dst-mods-delivery.mjs`

- [ ] **Step 1: 扩展技术闸门合同**

向 `rules` 追加：

```javascript
{
  path: 'prd/mod功能/DST-MODS-技术Go-No-Go验证方案.md',
  required: [
    /^# DST MODS 技术 Go\/No-Go 验证方案$/m,
    /GATE-MAC-001/,
    /GATE-APP-001/,
    /GATE-LOG-001/,
    /GATE-ROLLBACK-001/,
    /GATE-BASELINE-001/,
    /状态：未执行/,
    /任何一项失败均为 No-Go/
  ]
}
```

- [ ] **Step 2: 运行合同并确认技术闸门缺失**

Run:

```powershell
node tools/verify-dst-mods-delivery.mjs
```

Expected: FAIL，仅技术 Go/No-Go 文件报告 `file not found`。

- [ ] **Step 3: 创建真实设备验证矩阵**

技术验证方案必须先写 `状态：未执行`，不得在没有设备、构建包和游戏日志时预填“通过”。使用以下固定用例：

| 用例ID | 设备 | 操作 | 必须保留的证据 | 通过条件 |
|---|---|---|---|---|
| GATE-MAC-001 | 一台目标 Mac | 安装、校验、启用并启动一个 DST MOD | 构建号、设备系统、`mod_id`、版本、`package_hash`、客户端日志 | 一键安装完成且生成当前设备记录 |
| GATE-APP-001 | 一台目标 APP 设备 | 安装、校验、启用并启动同一 DST MOD | 构建号、设备系统、`mod_id`、版本、`package_hash`、客户端日志 | 一键安装完成且生成当前设备记录 |
| GATE-LOG-001 | Mac 与 APP | 读取游戏或引擎日志 | 各端原始日志片段和解析结果 | 两端均出现实际加载的 `mod_id` 和版本 |
| GATE-ROTATE-001 | APP | 下载、校验、安装期间反复横竖屏切换 | 唯一 `task_id`、状态时间线 | 每个阶段均只有一个任务且进度连续 |
| GATE-BG-001 | APP | 下载中进入后台再回前台 | `task_id`、暂停或继续原因、最终状态 | 不重复创建任务，系统暂停后可续传 |
| GATE-ROLLBACK-001 | Mac 或 APP | 注入错误 `package_hash` 执行更新 | 旧版和新版路径、指针切换记录、错误码 | 更新失败且旧版仍能启动 |
| GATE-BASELINE-001 | Mac 与 APP | 无 MOD 启动 DST | `resolved_launch_manifest` 和启动结果 | 清单为空且基础游戏成功启动 |
| GATE-RECOVERY-001 | Mac 或 APP | 变更 MOD 后制造异常退出 | 前后两次实际加载清单、恢复选择 | 只给建议，不自动修改启用状态 |

结果规则必须写明：

```text
Go：全部 8 项通过，且日志证明确实加载。
No-Go：任一端无法确认实际加载、无 MOD 基线失败、更新失败破坏旧版、旋转产生重复任务、存档或 MOD 配置丢失。
结论：任何一项失败均为 No-Go；先修复运行链路，再启动完整页面开发。
```

- [ ] **Step 4: 运行技术闸门合同**

Run:

```powershell
node tools/verify-dst-mods-delivery.mjs
```

Expected: PASS，且文件状态仍为“未执行”，没有虚构设备结果。

- [ ] **Step 5: 提交技术闸门**

```powershell
git add -- 'prd/mod功能/DST-MODS-技术Go-No-Go验证方案.md' 'tools/verify-dst-mods-delivery.mjs'
git commit -m 'docs(mods): add technical go-no-go gate'
```

### Task 5: 固化埋点与指标口径

**Files:**

- Create: `prd/mod功能/DST-MODS-埋点与指标字典-v1.md`
- Modify: `tools/verify-dst-mods-delivery.mjs`

- [ ] **Step 1: 扩展埋点合同**

向 `rules` 追加：

```javascript
{
  path: 'prd/mod功能/DST-MODS-埋点与指标字典-v1.md',
  required: [
    /^# DST MODS 埋点与指标字典 v1$/m,
    /mods_entry_view/,
    /mods_install_result/,
    /mods_preflight_result/,
    /mods_launch_result/,
    /mods_recovery_action/,
    /device_installation_id/,
    /screen_orientation/,
    /一键安装成功率/,
    /已启用 MOD 实际生效率/
  ]
}
```

- [ ] **Step 2: 运行合同并确认埋点字典缺失**

Run:

```powershell
node tools/verify-dst-mods-delivery.mjs
```

Expected: FAIL，仅埋点字典报告 `file not found`。

- [ ] **Step 3: 创建事件和字段字典**

所有事件必须包含：

| 字段 | 类型 | 规则 |
|---|---|---|
| `event_time` | ISO 8601 string | 客户端事件发生时间 |
| `game_id` | string | DST 固定为 `steam:322330` |
| `mod_id` | string 或 null | 入口级事件允许为 null |
| `mod_version` | string 或 null | 安装或启动时为本地目标版本 |
| `device_installation_id` | string | 设备级安装标识，不使用账号代替 |
| `device_platform` | `mac` 或 `app` | 客户端平台 |
| `screen_orientation` | `portrait`、`landscape` 或 `not_applicable` | Mac 使用 `not_applicable` |
| `task_id` | string 或 null | 下载、校验、安装、更新事件必填 |
| `package_hash` | string 或 null | 安装、更新、启动清单事件必填 |
| `result` | `success`、`failure`、`cancelled`、`skipped` 或 `risk` | 与事件阶段一致 |
| `failure_reason` | string 或 null | 失败、跳过、风险时必填 |

事件必须逐项定义触发时机、必填扩展字段和去重键：

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

指标公式必须使用以下分子和分母：

```text
一键安装成功率 = mods_install_result(result=success) 的唯一 task_id 数 / mods_install_click 的唯一 task_id 数
已启用 MOD 实际生效率 = 实际日志确认加载的 mod_id 数 / resolved_launch_manifest 中 preflight_result=effective 的 mod_id 数
携带 MOD 的游戏启动成功率 = mods_launch_result(result=success, manifest_mod_count>0) / mods_launch_result(manifest_mod_count>0)
MOD 变化后异常退出率 = MOD 清单变化后的异常退出启动数 / MOD 清单发生变化的启动数
恢复成功率 = 执行恢复动作后成功启动数 / mods_recovery_action 数
7 日再次使用率 = 安装成功后 7 日内再次进入启动清单的用户数 / 安装成功用户数
```

- [ ] **Step 4: 校验事件、字段和指标**

Run:

```powershell
node tools/verify-dst-mods-delivery.mjs
rg -n '^mods_[a-z_]+$|task_id|failure_reason|manifest_mod_count' 'prd/mod功能/DST-MODS-埋点与指标字典-v1.md'
```

Expected: 校验器 PASS；11 个事件、公共字段和指标辅助字段均可定位。

- [ ] **Step 5: 提交埋点字典**

```powershell
git add -- 'prd/mod功能/DST-MODS-埋点与指标字典-v1.md' 'tools/verify-dst-mods-delivery.mjs'
git commit -m 'docs(mods): define analytics contract'
```

### Task 6: 建立跨端验收用例

**Files:**

- Create: `测试用例/测试文件/盖世游戏-DST-MODS-跨端验收.csv`
- Modify: `tools/verify-dst-mods-delivery.mjs`

- [ ] **Step 1: 扩展 CSV 合同**

在校验脚本中导入 `validateCsvHeader`，并在 `verifyDstModsDelivery()` 中追加：

```javascript
const csvErrors = await validateCsvHeader(
  root,
  '测试用例/测试文件/盖世游戏-DST-MODS-跨端验收.csv',
  ['用例ID', '优先级', '端', '屏幕方向', '前置条件', '操作步骤', '预期结果', '证据']
);
return [...await validateRules(root, rules), ...csvErrors];
```

同时向 `rules` 追加：

```javascript
{
  path: '测试用例/测试文件/盖世游戏-DST-MODS-跨端验收.csv',
  required: [
    /ENTRY-001/,
    /ISOLATION-001/,
    /DEVICE-001/,
    /INSTALL-001/,
    /DEPENDENCY-002/,
    /ROTATE-003/,
    /UPDATE-002/,
    /PREFLIGHT-003/,
    /LOG-001/,
    /RECOVERY-001/,
    /SAFETY-001/
  ]
}
```

- [ ] **Step 2: 运行合同并确认验收 CSV 缺失**

Run:

```powershell
node tools/verify-dst-mods-delivery.mjs
```

Expected: FAIL，验收 CSV 同时报告文件缺失和 CSV 头缺失。

- [ ] **Step 3: 创建固定列和关键用例**

使用以下完整 CSV 内容：

```csv
用例ID,优先级,端,屏幕方向,前置条件,操作步骤,预期结果,证据
"ENTRY-001","P0","Mac","不适用","已安装含 MODS 功能的 Mac 构建且进入 DST 游戏详情","查看 MODS 卡片；记录安装数和启用数；点击查看全部","MODS 卡片独立存在；数量来自当前 Mac；成功进入 DST MODS 列表","页面录屏；本地状态记录"
"ENTRY-002","P0","APP","竖屏和横屏","已安装含 MODS 功能的 APP 构建且进入 DST 游戏详情","打开更多菜单；点击 MODS；分别在竖屏和横屏重复","两种方向均从详情进入独立 DST MODS 全屏页；不新增一级导航","页面录屏；路由日志"
"ISOLATION-001","P0","Mac和APP","全部","MODS 与创意工坊入口均可识别","检查 MODS 入口、列表、详情、已安装页全部动作和状态文案","MODS 仅使用安装、启用、停用、更新、卸载；不显示订阅或取消订阅","页面文案清单"
"DEVICE-001","P0","Mac到APP","全部","同一账号登录 Mac 与 APP；目标 MOD 两端均未安装","仅在 Mac 安装并启用目标 MOD；随后在 APP 查看同一 MOD","Mac 显示已安装且仅此设备；APP 仍显示安装且不自动下载","两端页面录屏；两端本地记录"
"DEVICE-002","P0","APP到Mac","全部","同一账号登录 Mac 与 APP；目标 MOD 两端均未安装","仅在 APP 安装并启用目标 MOD；随后在 Mac 查看同一 MOD","APP 显示已安装且仅此设备；Mac 仍显示安装且不自动下载","两端页面录屏；两端本地记录"
"INSTALL-001","P0","Mac和APP","全部","网络和空间充足；目标 MOD 无阻塞依赖","点击一次安装；等待下载、校验和安装结束","同一 task_id 完成下载、package_hash 校验和原子安装；结束后默认启用","任务状态时间线；本地文件清单"
"INSTALL-002","P0","Mac和APP","全部","将设备可用空间调整到小于安装所需空间","点击安装","下载前终止；返回 STORAGE_INSUFFICIENT；不创建可被游戏加载的半成品","客户端日志；staging 与正式目录记录"
"DEPENDENCY-001","P0","Mac和APP","全部","主 MOD 有两个可用且兼容的硬依赖","点击安装（含 2 个必要依赖）；等待任务结束","单个根任务安装两个依赖和主 MOD；三者均通过校验；主 MOD 默认启用","task_id；依赖闭包；本地记录"
"DEPENDENCY-002","P0","Mac和APP","全部","主 MOD 的一个硬依赖缺失、失效或本端不兼容","进入详情并尝试安装","安装按钮不可执行；显示最短阻塞原因链；主 MOD 不进入下载队列","页面录屏；任务列表"
"DEPENDENCY-003","P1","Mac和APP","全部","主 MOD 存在软冲突或兼容性未知","点击安装；阅读风险说明；确认继续","先展示风险；确认后允许安装；风险信息写入安装结果事件","页面录屏；mods_install_result"
"STATE-001","P0","Mac和APP","全部","目标 MOD 已安装并启用","依次查看游戏详情入口、MODS 列表、MOD 详情和启动检查","四处均读取相同的设备级状态、版本和启用值；均显示仅此设备","页面录屏；LocalModRecord"
"ROTATE-001","P0","APP","竖屏切横屏再切竖屏","目标 MOD 未安装且网络被限速","开始下载；在进度 20% 和 60% 时旋转屏幕","旋转前后 task_id 不变；进度连续；下载请求和安装任务各只有一个","任务状态时间线；网络请求日志"
"ROTATE-002","P1","APP","竖屏和横屏","打开长内容 MOD 详情并滚动到更新记录","旋转到另一方向；再旋回","当前 mod_id 和阅读章节保持；详情不返回顶部；不重发详情接口","页面录屏；接口日志"
"ROTATE-003","P1","APP","竖屏和横屏","在已安装页设置搜索词、排序并滚动列表","旋转到另一方向","页签、搜索词、排序、列表位置保持；布局按方向重排","页面录屏；页面状态快照"
"BACKGROUND-001","P0","APP","任意","目标 MOD 下载中且系统允许将 APP 切到后台","记录 task_id；进入后台；等待系统处理；返回前台","任务继续或显示系统暂停原因；回前台恢复同一 task_id；不重复下载或安装","生命周期日志；任务状态时间线"
"UPDATE-001","P0","Mac和APP","全部","目标 MOD 已安装旧版且服务端提供 hash 不同的新版本","点击更新；等待 staging 校验和原子切换完成","新版校验通过后才切换 active_version_pointer；新版本可被启动检查读取","更新日志；新旧版本目录；本地记录"
"UPDATE-002","P0","Mac和APP","全部","目标 MOD 已安装旧版；新包配置错误 package_hash","点击更新；等待校验失败；随后启动游戏","返回 PACKAGE_HASH_MISMATCH；旧版指针不变；旧版继续进入实际加载清单","更新日志；指针记录；游戏日志"
"UNINSTALL-001","P0","Mac和APP","全部","MOD A 已启用且 MOD B 硬依赖 A","卸载 A；查看影响清单；确认；执行下一次启动检查","确认页列出 B；A 仅从当前设备卸载；B 在下次启动检查中被 skipped","确认页录屏；本地记录；启动清单"
"PREFLIGHT-001","P0","Mac和APP","全部","当前设备有两个完整、兼容且依赖闭包完整的已启用 MOD","点击启动 DST","resolved_launch_manifest 两项均为 effective；按钮为启动游戏","启动清单；客户端日志"
"PREFLIGHT-002","P0","Mac和APP","全部","当前设备有一个完整 MOD 和一个本地文件损坏 MOD 且两者已启用","点击启动 DST；确认跳过损坏项后继续","损坏 MOD 为 skipped 且显示原因；完整 MOD 仍为 effective；游戏可启动","启动清单；游戏日志"
"PREFLIGHT-003","P0","Mac和APP","全部","当前设备有一个兼容性未知或软冲突 MOD 且已启用","点击启动 DST；查看风险；点击仍要启动","该 MOD 为 risk；确认后继续启动；取消时不改变安装或启用状态","启动清单；页面录屏；本地记录"
"LOG-001","P0","Mac和APP","全部","resolved_launch_manifest 至少包含一个 effective MOD","启动 DST；读取游戏或引擎日志；与清单核对","日志包含实际加载的 mod_id 和 local_version；文件复制完成不被当作生效证据","原始游戏日志；解析结果"
"RECOVERY-001","P0","Mac和APP","全部","已保存最近一次成功清单；本次变更 MOD 后制造异常退出","再次启动；查看恢复建议；逐一检查三个选项","只提供停用本次变化后重试、无 MOD 启动、保持当前设置继续尝试；默认不执行任何一项","前后清单差异；页面录屏；本地记录"
"BASELINE-001","P0","Mac和APP","全部","当前设备没有已启用 MOD","点击启动 DST","不增加启动确认页；resolved_launch_manifest items 为空；基础游戏成功启动","启动清单；游戏日志"
"SAFETY-001","P0","Mac和APP","全部","准备可校验的 DST 存档和 MOD 用户配置；目标 MOD 可更新和卸载","记录文件哈希；执行更新失败、卸载和恢复建议；再次计算哈希","DST 存档和用户 MOD 配置均未删除或改写；只变化受控 MOD 程序文件","操作前后文件哈希；客户端日志"
```

- [ ] **Step 4: 校验 CSV 结构和关键覆盖**

Run:

```powershell
node tools/verify-dst-mods-delivery.mjs
$rows = Import-Csv -LiteralPath '测试用例/测试文件/盖世游戏-DST-MODS-跨端验收.csv'
if ($rows.Count -lt 25) { throw "Expected at least 25 cases, got $($rows.Count)" }
if (($rows | Group-Object 用例ID | Where-Object Count -gt 1).Count -gt 0) { throw 'Duplicate case id' }
'DST MODS acceptance CSV verified'
```

Expected: 校验器 PASS，PowerShell 输出 `DST MODS acceptance CSV verified`。

- [ ] **Step 5: 提交验收用例**

```powershell
git add -- '测试用例/测试文件/盖世游戏-DST-MODS-跨端验收.csv' 'tools/verify-dst-mods-delivery.mjs'
git commit -m 'test(mods): add cross-platform acceptance cases'
```

### Task 7: 定义灰度、监控和停止线

**Files:**

- Create: `prd/mod功能/DST-MODS-灰度与监控方案.md`
- Modify: `tools/verify-dst-mods-delivery.mjs`

- [ ] **Step 1: 扩展灰度合同**

向 `rules` 追加：

```javascript
{
  path: 'prd/mod功能/DST-MODS-灰度与监控方案.md',
  required: [
    /^# DST MODS 灰度与监控方案$/m,
    /20–50 个精选 MOD/,
    /20–50 名用户/,
    /一键安装成功率不低于 95%/,
    /无 MOD 降级启动成功率不低于 99%/,
    /重复下载或重复安装任务为 0/,
    /游戏存档或用户配置丢失事件为 0/,
    /立即停止灰度/
  ]
}
```

- [ ] **Step 2: 运行合同并确认灰度方案缺失**

Run:

```powershell
node tools/verify-dst-mods-delivery.mjs
```

Expected: FAIL，仅灰度与监控方案报告 `file not found`。

- [ ] **Step 3: 创建分阶段灰度规则**

灰度方案必须定义：

```text
内容池：20–50 个精选且两端包、依赖、哈希和日志加载均已验证的 DST MOD。
用户池：20–50 名用户，Mac 与 APP 均有实际参与者。
阶段 0：内部技术验证，只执行 Go/No-Go。
阶段 1：5 个 MOD、5 名内部用户，观察至少 2 个完整工作日。
阶段 2：20–50 个 MOD、20–50 名灰度用户，观察至少 7 个自然日。
阶段 3：达到全部门槛后提交扩大灰度评审，不自动全量。
```

放量门槛：

```text
一键安装成功率不低于 95%
已启用 MOD 进入实际加载清单的比例不低于 90%
携带 MOD 的游戏启动成功率不低于 90%
无 MOD 降级启动成功率不低于 99%
异常退出后恢复成功率不低于 90%
安装用户 7 日内再次使用 MODS 的比例不低于 20%
重复下载或重复安装任务为 0
游戏存档或用户配置丢失事件为 0
```

立即停止灰度的条件：

1. 任何存档或用户配置丢失。
2. 更新失败后旧版不可启动。
3. 横竖屏切换或前后台切换产生重复安装任务。
4. 无 MOD 降级启动率低于 99%。
5. 实际日志无法证明清单中的 MOD 被游戏加载。
6. 外部来源大面积失效且客户端无法阻止重新安装或更新。

停止后动作只包括停止新增曝光和新安装、保留用户已安装可用版本、提供无 MOD 启动与恢复建议、收集日志；不得远程自动卸载或修改用户启用状态。

- [ ] **Step 4: 运行灰度合同**

Run:

```powershell
node tools/verify-dst-mods-delivery.mjs
```

Expected: PASS，输出 `DST MODS delivery verified`。

- [ ] **Step 5: 提交灰度方案**

```powershell
git add -- 'prd/mod功能/DST-MODS-灰度与监控方案.md' 'tools/verify-dst-mods-delivery.mjs'
git commit -m 'docs(mods): add rollout and monitoring gates'
```

### Task 8: 完整自检与客户端计划交接

**Files:**

- Test: `tools/lib/dst-mods-delivery-validator.mjs`
- Test: `test/dst-mods/delivery-validator.test.mjs`
- Test: `tools/verify-dst-mods-delivery.mjs`
- Test: `prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md`
- Test: `prd/mod功能/DST-MODS-端到端合同-v1.md`
- Test: `prd/mod功能/DST-MODS-技术Go-No-Go验证方案.md`
- Test: `prd/mod功能/DST-MODS-埋点与指标字典-v1.md`
- Test: `测试用例/测试文件/盖世游戏-DST-MODS-跨端验收.csv`
- Test: `prd/mod功能/DST-MODS-灰度与监控方案.md`

- [ ] **Step 1: 运行自动化校验**

Run:

```powershell
node --test test/dst-mods/delivery-validator.test.mjs
node tools/verify-dst-mods-delivery.mjs
```

Expected: 3 tests PASS；交付包输出 `DST MODS delivery verified`。

- [ ] **Step 2: 检查规格覆盖**

逐项把上游设计第 1–15 节映射到交付物：

| 上游设计章节 | 必须覆盖的交付物 |
|---|---|
| 1–5 背景、目标、决策、架构、流程 | 主 PRD |
| 6 Mac/APP 页面与旋转 | 主 PRD、验收 CSV |
| 7–10 状态、安装、启动、恢复 | 主 PRD、端到端合同、验收 CSV |
| 11 外部数据合同 | 端到端合同 |
| 12 数据指标 | 埋点与指标字典 |
| 13 验证与灰度 | 技术 Go/No-Go、灰度与监控方案 |
| 14 风险 | 主 PRD、技术 Go/No-Go、灰度与监控方案 |
| 15 后续交付 | 本实施计划全部文件 |

Expected: 每节至少映射到一个文件；页面、状态、接口、日志证据、异常恢复和灰度均有可验收条目。

- [ ] **Step 3: 检查未完成标记与术语一致性**

Run:

```powershell
$terms = @(
  ('T' + 'ODO'),
  ('T' + 'BD'),
  '待补充',
  '后续完善',
  '酌情处理'
)
$files = @(
  'prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md',
  'prd/mod功能/DST-MODS-端到端合同-v1.md',
  'prd/mod功能/DST-MODS-技术Go-No-Go验证方案.md',
  'prd/mod功能/DST-MODS-埋点与指标字典-v1.md',
  'prd/mod功能/DST-MODS-灰度与监控方案.md',
  '测试用例/测试文件/盖世游戏-DST-MODS-跨端验收.csv'
)
$hits = Select-String -LiteralPath $files -Pattern $terms -SimpleMatch
if ($hits) { $hits; throw 'Unresolved marker found' }
```

Expected: 无命中。

人工确认全套文件始终使用：

```text
game_id = steam:322330
device_installation_id
mod_id
task_id
package_hash
resolved_launch_manifest
available → queued → downloading → verifying → installing → enabled
```

并确认“订阅/取消订阅”只出现在创意工坊差异说明中，不作为本期 MODS 用户动作。

- [ ] **Step 4: 检查差异和工作区边界**

Run:

```powershell
git diff --check -- `
  'tools/lib/dst-mods-delivery-validator.mjs' `
  'test/dst-mods/delivery-validator.test.mjs' `
  'tools/verify-dst-mods-delivery.mjs' `
  'prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md' `
  'prd/mod功能/DST-MODS-端到端合同-v1.md' `
  'prd/mod功能/DST-MODS-技术Go-No-Go验证方案.md' `
  'prd/mod功能/DST-MODS-埋点与指标字典-v1.md' `
  '测试用例/测试文件/盖世游戏-DST-MODS-跨端验收.csv' `
  'prd/mod功能/DST-MODS-灰度与监控方案.md'
git status --short
```

Expected: 无空白错误；旧 Demo、参考图和其他用户文件没有因本计划执行而新增修改。

- [ ] **Step 5: 最终提交和客户端计划交接**

如果 Task 1–7 已按各自提交点完成，本步骤不重复提交；若执行时采用单提交策略，只暂存本计划列出的 9 个交付文件：

```powershell
git add -- `
  'tools/lib/dst-mods-delivery-validator.mjs' `
  'test/dst-mods/delivery-validator.test.mjs' `
  'tools/verify-dst-mods-delivery.mjs' `
  'prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md' `
  'prd/mod功能/DST-MODS-端到端合同-v1.md' `
  'prd/mod功能/DST-MODS-技术Go-No-Go验证方案.md' `
  'prd/mod功能/DST-MODS-埋点与指标字典-v1.md' `
  '测试用例/测试文件/盖世游戏-DST-MODS-跨端验收.csv' `
  'prd/mod功能/DST-MODS-灰度与监控方案.md'
git commit -m 'docs(mods): add cross-platform delivery package'
```

交接结论必须明确：

```text
当前完成：产品、合同、技术闸门、数据、验收和灰度的纯文字交付。
当前未执行：真实 Mac、APP、服务端业务代码实现和真实设备 Go/No-Go。
下一进入条件：提供三个真实源码仓库位置与构建测试命令。
下一计划拆分：Mac 本地安装与启动、APP 横竖屏和设备任务、服务端目录与外部同步。
```

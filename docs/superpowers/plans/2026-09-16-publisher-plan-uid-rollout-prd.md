# Publisher Plan UID Rollout PRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将发行人计划灰度从设备／账号混合判断统一为仅登录 UID 稳定分桶，并把未登录、切号、存量权益、缩量、数据和测试规则同步到独立方案与主 PRD。

**Architecture:** 以服务端 UID 灰度结果作为新入口和新业务关系的唯一准入依据；实名认证、创作者认证、余额和风控继续作为独立业务校验；服务端已有任务、参与、投稿、奖励余额和兑换订单作为存量兜底，不受当前灰度影响。

**Tech Stack:** Markdown PRD、PowerShell PRD 校验脚本、Git。

---

### Task 1: 重写独立灰度方案

**Files:**
- Modify: `prd/ai生成/【方案】《盖世游戏》发行人计划灰度发布方案.md`

- [ ] **Step 1: 删除设备 ID 和未登录灰度旧口径**

将身份规则统一为：未登录不展示；登录后按 UID 判断；UID 未命中但有存量时仅保留本人记录和资产入口。

- [ ] **Step 2: 写入 UID 稳定分桶与嵌套比例**

```text
bucket = stable_hash(feature_key + rollout_round + uid) % 10000
20% = 0～1999
50% = 0～4999
100% = 0～9999
```

- [ ] **Step 3: 补齐存量、缩量、异常、数据和测试规则**

明确已生成任务、参与关系、投稿、奖励余额和兑换订单属于存量；浏览、本地草稿不属于存量；配置异常停止新增但继续履约。

### Task 2: 更新主 PRD 最终规则

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md`

- [ ] **Step 1: 追加 V2.8 修订记录并统一术语**

追加“灰度统一按 UID 稳定分桶；未登录不展示；存量权益继续履约”，统一使用 `uid`，删除 `installation_id` 和未登录主体口径。

- [ ] **Step 2: 更新 C 端页面六要素**

在找任务、任务详情、做任务、提交投稿、创建发行任务、钱包和兑换商城中写清登录前置、UID 命中、新增操作、切号清缓存和存量入口。

- [ ] **Step 3: 更新 B 端灰度配置**

保持关闭、20%、50%、100%四档及现有界面；将分桶规则改为 UID 0～9999 稳定桶，灰度轮次只读，配置失败不影响存量。

- [ ] **Step 4: 更新数据和技术要求**

灰度准入事件统一携带 `uid`、`bucket`、`rollout_percent`、`gray_hit`、`business_allowed`、`rollout_round`、`config_version`；删除 `subject_type`，指标统一按 UID 去重。

- [ ] **Step 5: 更新质量保障**

覆盖未登录、切号、同 UID 多设备、桶边界、缩量、关闭、旧客户端残留按钮、配置失败和存量资产兑换。

### Task 3: 回写状态卡

**Files:**
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md`

- [ ] **Step 1: 新增当前决定**

新增 D-021：未登录不展示发行人计划；登录后仅按 UID 稳定分桶；UID 未命中但有存量时保留履约和资产入口。

- [ ] **Step 2: 更新产物与验证状态**

登记独立灰度方案、V2.8 PRD和本轮验证；明确 Demo 与图片无界面变化，无需修改。

### Task 4: 运行校验并修复硬伤

**Files:**
- Test: `prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md`
- Test: `prd/ai生成/【方案】《盖世游戏》发行人计划灰度发布方案.md`

- [ ] **Step 1: 检查旧口径残留**

Run:

```powershell
rg -n "installation_id|设备 ID|未登录安装|subject_type|account_id" "prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md" "prd/ai生成/【方案】《盖世游戏》发行人计划灰度发布方案.md"
```

Expected: 无旧设备灰度或 `account_id` 残留；“设备 ID”仅可出现在明确不采用的说明中。

- [ ] **Step 2: 运行 PRD 质量校验**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File ".agents/skills/to-prd/scripts/validate-prd-quality.ps1" -Path "prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md"
```

Expected: 0 错误、0 警告。

- [ ] **Step 3: 运行图片公网校验**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File ".agents/skills/to-prd/scripts/validate-prd-images.ps1" -PrdPath "prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md" -VerifyRemote
```

Expected: 28 张图片语法、HTTP 状态和 MIME 全部通过；不声明飞书转存已验证。

- [ ] **Step 4: 检查差异和文件范围**

Run:

```powershell
git diff --check
git status --short
```

Expected: 仅方案、PRD、状态卡和本计划产生预期改动；`.tmp/` 与锁文件不提交。

### Task 5: 提交文档

**Files:**
- Modify: `prd/ai生成/【方案】《盖世游戏》发行人计划灰度发布方案.md`
- Modify: `prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md`
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md`
- Create: `docs/superpowers/plans/2026-09-16-publisher-plan-uid-rollout-prd.md`

- [ ] **Step 1: 提交本轮文档**

```powershell
git add -- "docs/superpowers/plans/2026-09-16-publisher-plan-uid-rollout-prd.md" "prd/ai生成/【方案】《盖世游戏》发行人计划灰度发布方案.md" "prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md" "prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md"
git commit -m "docs: define publisher uid rollout prd"
```

Expected: 本地提交成功；不推送远端。

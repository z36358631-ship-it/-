# 【PRD】PC 发行平台开发者后台—游戏包体、测试审核与版本发布

## 修订记录

| 修订日期 | 修订内容 | 版本 | 修订人 |
|---|---|---|---|
| 2026/9/1 | 建立包体上传、测试审核、正式发布和线上处置草稿 | V0.9 | 郑群超 |
| 2026/9/1 | 纳入开发者后台专项并补充 Steamworks／WeGame 参考 | V1.0 | 郑群超 |
| 2026/9/2 | 按 9 月 1 日进度会结论重构多系统 Build、Manifest／Chunk 更新、测试白名单、发布指针与回滚规则 | V1.1 | 郑群超 |
| 2026/9/2 | 统一 Release Pointer 三字段主键，并将发布执行方式字段改为 `publish_mode` | V1.2 | 郑群超 |

**备注：** 搜2026.9.2修改

## 一、文档概述

### 1.1 背景概述

- **解决对象：** 已签约游戏厂商的开发者、平台测试人员与发行运营。
- **核心问题：** 当前缺少从多系统包体上传、人工测试到发布／回滚的一致对象模型；若继续按“覆盖旧包、为版本两两生成补丁、发布后删除旧包”的方式建设，将无法支持任意历史版本更新与可追溯回滚。
- **当前方式：** 包体、测试和线下上架结论由多人线下协作，状态、证据与线上实际版本没有统一关联。
- **本期目标：** 以不可变 Build、Manifest、Chunk 为基础，让 Windows、macOS、Linux 包体完成上传、人工测试、上架结论录入、发布指针切换及同系统／架构历史回滚；任何失败不得破坏当前可用线上版本。
- **平台参考：** 借鉴 Steam 的 Depot／Build／Branch 对象分层与 WeGame 的 QA／Beta／Default 分工，但一期只保留一条测试到正式发布链路，不复制复杂多分支或灰度系统。

### 1.2 需求边界

| 边界 | 一期范围 | 一期不做 |
|---|---|---|
| 产品边界 | 开发者后台、测试后台和发行运营后台的包体、测试、发布及回滚能力；C 端只消费结果 | 新增 C 端页面、移动端或主机发行 |
| 业务边界 | 已签约 PC 游戏从 Build 上传到正式指针切换的闭环 | 广告灰度、开放测试招募、在线合同／定价审批 |
| 运营边界 | 平台运营配置测试、录入线下结论、发布、回滚和可用性处置；开发者无正式发布权限 | 开发者自助正式发布、绕过测试或上架门禁 |
| 人力边界 | 开发者交包、测试人员给人工结论、发行运营控制门禁；商务／法务在线下形成结论 | 本期建设独立法务、财务、自动化测试团队工作台 |
| 平台 | Windows、macOS、Linux PC 游戏；系统及 CPU 架构按实际包体配置 | Android、iOS、主机平台 |
| 包体 | 分系统／架构组件，断点上传，基础 Hash、文件完整性和入口存在校验，不可变 Build／Manifest／Chunk | 病毒自动扫描、自动冒烟、Crash 收集、开发者可配置差分算法 |
| 更新 | 比较本地 Manifest 与目标 Manifest，只下载缺失 Chunk；Manifest 缺失或校验失败时全量兜底 | 为任意两个历史版本生成 O(n²) 成对补丁、P2P、智能 CDN 调度 |
| 测试 | 白名单账号、测试订单／权益、人工“通过／不通过＋原因＋证据链接” | 问题单系统、开放测试招募、自动化测试平台 |
| 上架 | 后台录入合同、定价、上架审核的线下结论、责任人、时间、原因和证据引用 | 合同在线审批、在线定价审批、法务工作流 |
| 发布 | 立即／定时发布、按 `app_id + OS + 架构` 切换唯一 Release Pointer、历史回滚、停止新下载／新授权 | 广告式灰度、人群发布、复杂多分支、开发者自助正式发布 |
| 离线 | SDK 首次启动联网鉴权成功后允许离线运行；处置对已离线实例下次联网时生效 | 依靠持续在线心跳、承诺即时中止已离线游戏 |

### 1.3 术语定义

| 术语 | 定义与口径 |
|---|---|
| 发行主键 | `vendor_id + game_id + app_id`。所有 Build、测试、发布和数据事件均须携带，服务端以登录账号可访问的 `vendor_id` 校验数据范围。 |
| Release Version | 一次面向用户的发行版本，包含版本号、更新说明和计划发布的 OS／架构矩阵；可关联多个 Build。 |
| Depot／组件 | Release Version 下按 OS、架构或可选内容拆分的交付单元；一期界面统一称“系统组件”。 |
| Build | 一次上传和校验成功后生成的不可变构建对象；发布、测试和回滚均引用 `build_id`，不得覆盖原文件。 |
| Manifest | 描述 Build 所需文件、Chunk、Hash、大小和路径的不可变清单；由 `manifest_id` 唯一标识。 |
| Chunk | 内容寻址的不可变分块；相同 Hash 的 Chunk 可复用，但不得原地修改。 |
| Release Pointer | `app_id + OS + 架构` 下唯一指向当前正式 Build 的线上指针。切换成功才代表该系统／架构发布生效。 |
| Rollback Action | 将指定 OS／架构 Release Pointer 原子切回一个符合条件的历史 Build 的操作记录。 |
| 测试轮次 | 对一个确定 `build_id` 发起的一次人工测试；重新上传或改变入口配置后必须创建新轮次，旧结果只读留存。 |
| 测试订单／权益 | 仅供白名单账号取得测试包的隔离对象；不得进入真实收入、库存、销量、领取或结算统计。 |

## 二、产品方案

### 2.1 产品／方案简介

#### 2.1.1 对象关系

| 上层对象 | 下层对象 | 基数与约束 | 关键结果 |
|---|---|---|---|
| `vendor_id + game_id + app_id` | Release Version | 1:N；同一 `app_id` 内版本号唯一 | 汇总本次发行说明及目标矩阵 |
| Release Version | 系统组件 | 1:N；每行必须指定 OS 与架构 | 明确要测试和发布的交付范围 |
| 系统组件 | Build | 1:N；上传成功生成新 `build_id`，旧 Build 永久只读 | 形成可测试、可发布候选 |
| Build | Manifest／Chunk | 1:1、1:N；内容不可变 | 支持完整性校验与按缺失 Chunk 更新 |
| Build | 测试轮次 | 1:N；一个轮次只绑定一个 Build | 最新有效轮次决定该 Build 是否通过 |
| `app_id + OS + 架构` | Release Pointer | 1:1；任何时刻最多一个正式 Build | 客户端查询当前目标 Build |
| Release Pointer | 发布／回滚记录 | 1:N；每次切换记录前后 Build 与结果 | 可审计、可失败恢复 |

#### 2.1.2 不可变存储与更新

1. Build、Manifest 和 Chunk 一经上传成功即不可覆盖、不可删除；修订必须生成新对象。
2. 已发布 Build 及其依赖的 Manifest／Chunk 永久保留。未发布对象的归档周期属于存储策略待确认项，但不得影响测试与发布审计。
3. 客户端从任意历史版本升级时，只比较“本地有效 Manifest”和“目标 Build Manifest”，按 Chunk Hash 下载本地缺失内容；服务端不得预生成历史版本之间的成对补丁。
4. 本地 Manifest 缺失、签名／Hash 校验失败，或目标 Manifest 不可用时，客户端进入全量下载兜底并明确展示原因；不得把未知状态当作无需更新。
5. Chunk 下载完成后先校验 Hash，再按 Manifest 组装／替换文件；失败保留原可运行版本并允许重试。

#### 2.1.3 测试、上架与发布门禁

| 门禁 | 通过条件 | 不通过处理 |
|---|---|---|
| 包体门禁 | 目标矩阵每行均有上传完成 Build；Manifest 可读；Hash、文件完整性、入口文件存在校验通过 | 保持待提交或上传失败，不生成测试任务 |
| 测试门禁 | 每个拟发布 Build 的最新有效人工测试结果均为“通过” | 返回版本修订；新 Build 必须重新测试 |
| 上架门禁 | 合同、定价、上架审核线下结论均为“通过／已确认”，且责任人、记录时间、原因／备注、证据引用齐全 | 后台只展示缺项并阻塞发布，不发起线上审批 |
| 业务门禁 | 目标 OS／架构仍在有效授权地区及发行范围内；停止新下载／新授权不阻塞修复版本发布 | 授权范围失效则发布失败，当前 Release Pointer 不变；可用性开关保持原值 |
| 执行门禁 | 发布动作的目标 Build、测试结果和结论快照未发生变化 | 以 `action_id` 幂等失败，运营刷新后重新确认 |

测试人员只提交“通过”或“不通过”。“不通过”必须填写原因；两种结果均至少填写一个可访问的证据链接。本文不建设问题单，后续修复通过版本备注与新测试轮次关联。

#### 2.1.4 发布、回滚与线上可用性

1. 发布操作覆盖该 Release Version 定义的完整 OS／架构目标矩阵，不允许临时漏选；全部校验通过后原子切换所有对应 Release Pointer，任一失败则所有指针保持原值。若不同系统需分批上线，应分别创建只包含当批目标矩阵的 Release Version。
2. 可回滚目标必须同时满足：历史上已发布、Build 与 Manifest／Chunk 完整、与目标 Pointer 的 OS／架构一致、仍在当前授权范围。回滚不修改 Release Version 或 Build，只新增 Rollback Action 并切换指针。
3. 回滚前显示当前 Build、目标 Build、影响 OS／架构、版本差异和强制原因；回滚成功后客户端仍按 Manifest 缺失 Chunk 规则升级或降级。
4. “停止新下载”阻止创建新的下载／更新任务，已创建任务的续传策略由客户端下载 PRD处理；“停止新授权”阻止新的购买／领取／测试外权益生成。
5. 首次联网鉴权成功的本地实例可离线运行。下架、停止新授权或资格撤销不承诺即时影响离线实例，其状态在下次联网鉴权时生效，并记录服务端判定时间。

#### 2.1.5 状态定义

| 对象 | 状态 | 允许迁移 |
|---|---|---|
| Release Version | 草稿、上传中、待提交、测试中、测试不通过、测试通过、待发布、已发布、已撤回 | 测试不通过可生成新 Build 后重提；完整目标矩阵原子发布成功才进入已发布，失败仍为待发布；已发布版本不可删除，指针被后续发布／回滚替换后保留历史发布标记 |
| Build | 上传中、上传失败、校验中、校验失败、待测试、测试中、测试不通过、测试通过、已发布、已归档 | 只向前流转；重新上传生成新 Build，不回写旧状态 |
| 测试任务 | 待分配、待测试、测试中、通过、不通过、已终止 | 终态不可覆盖；重测创建新轮次 |
| 发布动作 | 待执行、执行中、成功、失败、已取消 | `action_id` 幂等；失败不改变 Pointer |
| 可用性 | 正常、停止新下载、停止新授权、停止新下载及新授权 | 开关独立于 Build；恢复需填写原因并留痕 |

### 2.2 产品流程

![包体测试发布流程](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-build-release-flow.png)

*图 2.2-1：开发者、测试人员与发行运营共用的一条包体测试、发布和回滚链路结构参考；对象与回滚规则以本次 V1.1 正文为准。*

## 三、功能需求

#### C 端影响（无新增页面）

本文不新增 C 端页面。客户端只消费当前 OS／架构 Release Pointer、Manifest、下载可用性和首次鉴权结果；具体下载、安装、更新、离线提示由 C 端专项 PRD 定义。

### 3.2 B 端页面需求

#### P03-01 版本列表

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 查看本厂商指定 `app_id` 的 Release Version、系统覆盖、测试与发布状态。 |
| 场景描述 | 开发者跟踪首发和后续版本；运营查看当前各 OS／架构正式指针。 |
| 输入／前置条件 | 已登录；服务端校验 `vendor_id + game_id + app_id` 归属。 |
| 需求描述 | **图示：**<br>![版本列表](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-version-list.png)<br>*图 3.2.1-1：版本列表结构参考；系统矩阵与 Pointer 字段以 V1.1 为准。*<br>**详细说明：** 页面统一承载当前正式指针、候选版本和历史发行记录。<br>**展示说明：**<br>1. 顶部展示游戏、`app_id`、各 OS／架构当前版本和下载／授权可用性。<br>2. 列表展示版本号、目标矩阵、Build、测试、上架结论、发布时间、操作人和更新时间；未知字段为 `--`。<br>3. 默认处理中优先，其余按创建时间倒序，每页 20 条。<br>**交互说明：**<br>1. 版本号、OS、架构和状态筛选组合生效，变化后回到第 1 页。<br>2. 行内动作按状态进入创建／编辑、上传、测试详情或只读发布记录。<br>3. 加载失败保留筛选；越权时不返回对象是否存在。 |
| 输出／后置条件 | 进入创建／编辑、上传、测试详情或只读发布记录。 |
| 补充说明 | 已发布版本、Build、Manifest、Chunk 无删除入口；列表状态不等同于某个 Pointer 当前指向。 |

#### P03-02 创建／编辑版本

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 创建 Release Version 并配置发布说明及 OS／架构矩阵。 |
| 场景描述 | 开发者准备新版本，或测试不通过后在原版本下增加新 Build。 |
| 输入／前置条件 | 游戏已接入且账号有编辑权；版本处于草稿、待提交或测试不通过。 |
| 需求描述 | **图示：**<br>![版本编辑](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-version-editor.png)<br>*图 3.2.2-1：版本编辑结构参考；本期新增多系统／架构矩阵。*<br>**详细说明：** Release Version 保存发行说明并组织一个或多个系统组件。<br>**展示说明：**<br>1. 展示版本号、用户更新说明和系统组件列表，OS 仅 Windows、macOS、Linux。<br>2. 每行展示架构、入口配置和当前 Build；同一 OS＋架构不得重复。<br>3. 已进入测试的 Build 配置只读。<br>**交互说明：**<br>1. 保存时校验必填、`app_id` 内版本号唯一和矩阵重复。<br>2. 修改入口或组件内容时创建新 Build，不覆盖旧对象。<br>3. 并发版本冲突时拒绝覆盖并要求刷新。 |
| 输出／后置条件 | 保存草稿或进入对应系统组件上传。 |
| 补充说明 | 不提供移动端、多正式分支、用户灰度、人群比例配置。 |

#### P03-03 包体上传与 Build 详情

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 上传系统组件并查看不可变 Build、Manifest 与基础校验结果。 |
| 场景描述 | 开发者首次上传、断点续传或测试不通过后上传修订包。 |
| 输入／前置条件 | 已选择 Release Version、OS、架构和入口文件规则。 |
| 需求描述 | **图示：**<br>![Build 上传](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-build-upload.png)<br>*图 3.2.3-1：上传与校验结构参考；Build、Manifest、Chunk 按不可变对象落库。*<br>**详细说明：** 上传成功形成新 Build，并保留可追溯的 Manifest 与 Chunk 摘要。<br>**展示说明：**<br>1. 上传区展示文件、大小、分片进度、速率、剩余时间和续传状态。<br>2. 详情展示 `build_id`、`manifest_id`、总大小、Chunk 数、创建人／时间、校验及关联记录。<br>3. 基础校验仅含上传完整、Hash、Manifest、路径安全和入口存在。<br>**交互说明：**<br>1. 网络中断后按同一上传会话续传，失效时重新创建会话。<br>2. 成功后对象只读；修订必须重新上传形成新 Build。<br>3. 校验失败展示阶段和重试入口，不生成待测试结果。 |
| 输出／后置条件 | Build 校验通过进入待测试；失败显示失败阶段和重试入口。 |
| 补充说明 | 不执行病毒自动扫描、自动冒烟或 Crash 收集；上传限制见待确认项。 |

#### P03-04 提交测试确认

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 将确定的 OS／架构 Build 集合提交为新人工测试轮次。 |
| 场景描述 | 开发者确认本次拟发布内容后请求平台测试。 |
| 输入／前置条件 | 目标 Build 基础校验通过、未绑定进行中轮次；版本资料完整。 |
| 需求描述 | **图示：**<br>![提交测试](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-submit-test.png)<br>*图 3.2.4-1：提交测试确认结构参考。*<br>**详细说明：** 一次提交锁定本轮全部 OS／架构 Build 快照。<br>**展示说明：**<br>1. 逐行展示 OS、架构、`build_id`、Manifest、入口、大小和校验结果。<br>2. 明确提示提交后本轮对象不可替换。<br>3. 失效项就地标红并说明原因。<br>**交互说明：**<br>1. 提交时重新校验全部 Build，任一失效则整体不提交。<br>2. 成功后创建不可变轮次和待分配任务。<br>3. 重复 `action_id` 返回首次提交结果。 |
| 输出／后置条件 | Release Version 进入测试中，形成不可变测试轮次。 |
| 补充说明 | 测试不通过后的再次提交必须选择新 Build 并创建新轮次。 |

#### P03-05 测试不通过详情

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 向开发者呈现失败轮次、原因和证据。 |
| 场景描述 | 开发者根据平台人工测试结论修订包体。 |
| 输入／前置条件 | 最新轮次终态为不通过且属于当前厂商。 |
| 需求描述 | **图示：**<br>![测试不通过详情](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-test-rejection.png)<br>*图 3.2.5-1：测试失败详情结构参考。*<br>**详细说明：** 开发者只读取结论与证据，并从原版本创建修订 Build。<br>**展示说明：**<br>1. 按 OS／架构展示轮次、Build、测试人、时间、原因与证据链接。<br>2. 历史轮次只读，不出现问题单、回复、指派或关闭状态。<br>3. 证据无权限或失效时显示真实错误。<br>**交互说明：**<br>1. 点击证据先校验权限，再打开受控链接。<br>2. 点击“创建新 Build”返回对应系统组件上传。<br>3. 运营补录证据后刷新显示最新引用，但不改测试终态。 |
| 输出／后置条件 | 开发者进入上传修订或返回版本列表。 |
| 补充说明 | 原 Build、Manifest、Chunk 和失败结果永久保留，不得覆盖。 |

#### P03-06 待测任务列表

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 供运营／测试查看待分配、待测试和测试中的人工任务。 |
| 场景描述 | 运营分配测试人，测试人员领取本人任务。 |
| 输入／前置条件 | 平台测试或运营角色；按角色限制数据范围。 |
| 需求描述 | **图示：**<br>![待测任务列表](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-test-task-list.png)<br>*图 3.2.6-1：待测任务列表结构参考。*<br>**详细说明：** 运营分配任务，测试人员只处理本人有效任务。<br>**展示说明：**<br>1. 展示任务号、游戏、版本、OS／架构、Build、轮次、状态、负责人和等待时长。<br>2. 默认待分配、待测试、测试中优先。<br>3. 已终止与终态任务只读展示。<br>**交互说明：**<br>1. 游戏、系统、状态和负责人筛选组合生效。<br>2. 运营可分配或改派未结束任务；测试人员只可开始本人任务。<br>3. 冲突更新时不覆盖最新负责人并提示刷新。 |
| 输出／后置条件 | 进入任务详情或完成负责人分配。 |
| 补充说明 | 任务终止须记录原因；如仍需测试，由运营创建同轮次接续任务，不改写旧任务。 |

#### P03-07 测试任务详情

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 查看本轮 Build 快照并为白名单测试账号取得测试包。 |
| 场景描述 | 测试人员核对目标环境、安装包和已有历史结果后执行人工测试。 |
| 输入／前置条件 | 任务分配给当前测试人员，或运营具有只读权限。 |
| 需求描述 | **图示：**<br>![测试任务详情](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-test-task-detail.png)<br>*图 3.2.7-1：测试任务和取包结构参考。*<br>**详细说明：** 任务锁定 Build 快照，并依靠白名单与隔离测试权益取包。<br>**展示说明：**<br>1. 展示版本、OS／架构、Build／Manifest、入口、说明、基础校验和历史轮次。<br>2. 展示白名单及测试订单／权益状态，不展示真实交易数据。<br>3. 取包链接只在权限校验后短时返回。<br>**交互说明：**<br>1. 运营配置白名单后生成 `is_test=true` 的测试订单／权益。<br>2. 测试人员点击取包时重新校验任务、白名单和 Build。<br>3. 生成失败保持任务状态并显示可恢复原因。 |
| 输出／后置条件 | 测试人员取得正确包体并进入结果提交。 |
| 补充说明 | 测试订单／权益标记 `is_test=true`，不得进入真实收入、库存、结算、销量或领取统计。 |

#### P03-08 测试结果提交

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 提交人工测试的通过／不通过终态。 |
| 场景描述 | 测试人员完成目标 Build 验证后记录可发布性。 |
| 输入／前置条件 | 当前任务处于测试中且 Build 快照未变化。 |
| 需求描述 | **图示：**<br>![测试结果提交](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-test-result.png)<br>*图 3.2.8-1：人工测试结果结构参考；本期不建设问题单。*<br>**详细说明：** 每个任务只允许写入一个“通过／不通过”终态。<br>**展示说明：**<br>1. 只读展示任务、OS／架构、Build 和测试轮次。<br>2. 两种结果均需证据链接；不通过还需原因。<br>3. 已提交结果展示操作人和时间且不可编辑。<br>**交互说明：**<br>1. 提交前二次确认目标 Build 并校验必填项。<br>2. 首个成功终态生效，并发请求不得覆盖。<br>3. 失败保留输入和测试中状态，可按同一动作重试。 |
| 输出／后置条件 | 全部目标 Build 通过则版本进入测试通过，否则进入测试不通过。 |
| 补充说明 | 不在本页创建问题单、缺陷等级、修复人或 SLA。 |

#### P03-09 版本审核列表

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 运营集中查看测试通过但尚未满足全部线下上架结论的版本。 |
| 场景描述 | 发行运营检查合同、定价、上架审核等发布前门禁。 |
| 输入／前置条件 | 平台发行运营角色；目标版本测试通过或待发布。 |
| 需求描述 | **图示：**<br>![版本审核列表](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-ops-version-list.png)<br>*图 3.2.9-1：版本审核列表结构参考。*<br>**详细说明：** 列表聚合测试通过结果和三类线下上架结论。<br>**展示说明：**<br>1. 展示版本、系统矩阵、测试通过时间、合同／定价／上架结论、缺失项和负责人。<br>2. 缺失或撤销结论明确标记阻塞。<br>3. 默认阻塞待处理项优先。<br>**交互说明：**<br>1. 游戏、结论状态和计划发布时间筛选组合生效。<br>2. 行内只进入结论录入或发布配置，不提供在线审批。<br>3. 状态变化时刷新门禁，不覆盖线下事实。 |
| 输出／后置条件 | 定位缺失门禁并进入 P03-10／P03-12。 |
| 补充说明 | 线下真实结论是事实来源，后台不得推导或替代。 |

#### P03-10 线下上架结论录入

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 结构化记录合同、定价和上架审核的线下结论。 |
| 场景描述 | 运营把已在线下完成的审批事实同步到发行后台。 |
| 输入／前置条件 | 有结论录入权限；关联 `vendor_id + game_id + app_id` 与 Release Version。 |
| 需求描述 | **图示：**<br>![线下结论录入](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-ops-version-detail.png)<br>*图 3.2.10-1：线下结论与门禁详情结构参考。*<br>**详细说明：** 后台只录入已经在线下形成的合同、定价和上架审核事实。<br>**展示说明：**<br>1. 每类展示结论、责任人、实际确认时间、原因／备注和证据引用。<br>2. 页面固定提示“仅录入线下事实，不代表在本系统审批”。<br>3. 当前有效修订与历史修订分区展示。<br>**交互说明：**<br>1. 保存时校验审计字段齐全并新增修订。<br>2. 撤销结论须填写新原因和证据，成功后门禁立即失效。<br>3. 并发修改以首个修订成功结果为准。 |
| 输出／后置条件 | 三类结论齐全且有效时，版本具备进入待发布的条件。 |
| 补充说明 | 证据只保存受控链接或文件引用，不在日志记录合同正文与敏感信息。 |

#### P03-11 待发布列表

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 展示门禁齐全的候选版本和已预约发布动作。 |
| 场景描述 | 运营安排正式发布并识别即将失效的候选。 |
| 输入／前置条件 | 发行运营角色；至少一条 Release Version 通过全部门禁。 |
| 需求描述 | **图示：**<br>![待发布列表](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-release-list.png)<br>*图 3.2.11-1：待发布动作列表结构参考。*<br>**详细说明：** 发布候选和执行动作分开显示，预约不等于发布。<br>**展示说明：**<br>1. 展示版本、系统矩阵、当前／目标 Build、门禁快照、方式、时间和动作结果。<br>2. 门禁变化标记“需重新确认”；失败显示原因且版本仍待发布。<br>3. 默认临近执行与失败待处理项优先。<br>**交互说明：**<br>1. 点击配置进入发布／回滚页。<br>2. 未执行定时动作可取消，执行中或已执行动作不可取消。<br>3. 重试时重新校验门禁，失败不改变线上指针。 |
| 输出／后置条件 | 进入发布配置或查看动作结果。 |
| 补充说明 | 列表不得把“已预约”展示为“已发布”。 |

#### P03-12 发布与回滚配置

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 原子切换正式 Release Pointer，或切回合格历史 Build。 |
| 场景描述 | 运营立即／定时发布新版本，线上异常时执行同 OS／架构回滚。 |
| 输入／前置条件 | 发布目标通过全部门禁；回滚目标满足历史已发布、对象完整、系统／架构一致及授权有效。 |
| 需求描述 | **图示：**<br>![发布与回滚配置](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-release-config.png)<br>*图 3.2.12-1：发布配置结构参考；V1.1 在同页增加合格历史 Build 回滚。*<br>**详细说明：** 发布和回滚都以 Release Pointer 原子切换为唯一生效结果。<br>**展示说明：**<br>1. 发布逐行展示完整目标矩阵的 OS／架构、当前 Build、目标 Build、差异和门禁，不提供临时漏选。<br>2. 发布支持立即或带时区定时；回滚只列同 OS／架构合格历史 Build。<br>3. 回滚显示完整性、历史发布和授权校验结果；停止新下载／新授权期间发布成功仍继承原开关。<br>**交互说明：**<br>1. 回滚必填原因并二次确认影响。<br>2. 多行使用同一 `action_id` 原子执行，任一失败则全部 Pointer 不变。<br>3. 定时执行时重新校验门禁并记录前后指针。 |
| 输出／后置条件 | Pointer 切换成功并生成发布／回滚记录，或失败且当前线上版本不变。 |
| 补充说明 | 回滚不是复制旧包或新建版本；客户端按 Manifest 比较处理升级／降级。 |

#### P03-13 线上版本处置

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 管理游戏级新下载、新授权可用性并查看各系统线上指针。 |
| 场景描述 | 合同、合规或严重线上问题发生时，运营限制新增获取，同时保留审计和恢复能力。 |
| 输入／前置条件 | 发行运营角色；游戏至少存在一个历史发布记录。 |
| 需求描述 | **图示：**<br>![线上版本处置](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/04-build-release/04-live-disposal.png)<br>*图 3.2.13-1：线上版本处置结构参考；V1.1 只保留新下载与新授权开关。*<br>**详细说明：** 处置修改新增获取门禁，不删除版本和本地实例。<br>**展示说明：**<br>1. 展示各 OS／架构当前 Build、最近切换、下载和授权开关。<br>2. 明确提示离线实例在下次联网时才消费处置结果。<br>3. 展示每次操作的原因、证据和生效时间。<br>**交互说明：**<br>1. 停止或恢复新下载／新授权均必填原因、证据并二次确认。<br>2. 服务端成功后才更新页面，失败保持原开关。<br>3. 已离线实例不推送即时中止指令。 |
| 输出／后置条件 | 新下载／新授权门禁更新并写入统一日志；离线实例等待下次联网判定。 |
| 补充说明 | 不删除已发布 Build、用户本地文件、历史订单或已存在权益；权益后续处置由交易／权益 PRD定义。 |

### 3.3 统一日志与数据状态

| 日志类型 | 必记字段 | 查询要求 |
|---|---|---|
| Build 日志 | 发行主键、Release Version、OS、架构、`build_id`、`manifest_id`、动作、结果、失败阶段、操作者、时间 | 可从版本、Build 双向查询 |
| 测试日志 | 发行主键、轮次、任务、Build、负责人、白名单／测试权益引用、结果、原因、证据、时间 | 终态不可编辑；敏感取包地址不入日志 |
| 上架结论日志 | 发行主键、版本、结论类型、修订、结论、责任人、确认时间、原因、证据引用、录入人 | 展示当前有效结论及完整历史 |
| 发布／回滚日志 | 发行主键、OS、架构、`action_id`、前后 Build／Pointer、方式、计划／实际时间、结果、失败原因 | 可按 Pointer 还原任意时刻生效 Build |
| 可用性日志 | 发行主键、开关、前后值、原因、证据、操作者、时间 | 与 Build 状态分离查询 |

所有列表和详情必须区分真实空值、加载失败与真实零值；数据延迟或不可得显示 `--`，不得伪造默认成功状态。

## 四、数据埋点

**数据结论：** 涉及新增、改造和复用埋点，事件用于验证 Build、测试、发布、回滚及可用性动作是否形成闭环。

### 4.1 事件清单

| 事件 | 页面／类型 | 触发与成功 | 参数 |
|---|---|---|---|
| `build_upload_result` | P03-03／新增 | Build 上传或续传得到终态；Build、Manifest 写入且基础校验完成记成功 | `event_id, action_id, vendor_id, game_id, app_id, release_version_id, os, architecture, build_id, manifest_id, result, failure_type, operator_role, occurred_at` |
| `build_test_result` | P03-08／新增 | 人工测试终态首次写入；结果、原因／证据完整且绑定正确 Build 记成功 | `event_id, action_id, vendor_id, game_id, app_id, test_round_id, task_id, os, architecture, build_id, test_result, result, failure_type, operator_role, occurred_at` |
| `offline_listing_result_recorded` | P03-10／新增 | 线下结论修订保存；新修订及审计字段完整写入记成功 | `event_id, action_id, vendor_id, game_id, app_id, release_version_id, listing_result_type, listing_result, revision_id, result, failure_type, operator_role, occurred_at` |
| `release_pointer_change_result` | P03-12／新增 | 发布动作完成；目标 OS／架构 Pointer 全部原子切换记成功 | `event_id, action_id, vendor_id, game_id, app_id, os, architecture, from_build_id, to_build_id, publish_mode, result, failure_type, operator_role, occurred_at` |
| `release_rollback_result` | P03-12／新增 | 回滚动作完成；Pointer 原子切至合格历史 Build 记成功 | `event_id, action_id, vendor_id, game_id, app_id, os, architecture, from_build_id, to_build_id, result, failure_type, operator_role, occurred_at` |
| `release_availability_change_result` | P03-13／新增 | 下载／授权开关变更完成；服务端新值和审计日志同时落库记成功 | `event_id, action_id, vendor_id, game_id, app_id, availability_type, from_value, to_value, result, failure_type, operator_role, occurred_at` |

### 4.2 公共参数

| 参数 | 类型／必填 | 说明 | 枚举／示例 |
|---|---|---|---|
| `event_id` | string／是 | 单次事件唯一标识 | `evt_20260902_0001` |
| `action_id` | string／是 | 用户或系统动作幂等标识 | `act_20260902_0001` |
| `vendor_id` | string／是 | 厂商唯一标识 | `vendor_10001` |
| `game_id` | string／是 | 游戏项目唯一标识 | `game_40001` |
| `app_id` | string／是 | PC 应用唯一标识 | `app_50001` |
| `release_version_id` | string／条件必填 | Release Version 唯一标识 | `release_60001` |
| `test_round_id` | string／条件必填 | 人工测试轮次唯一标识 | `round_70001` |
| `task_id` | string／条件必填 | 测试任务唯一标识 | `task_71001` |
| `os` | enum／条件必填 | 包体或指针对应系统 | `windows`＝Windows；`macos`＝macOS；`linux`＝Linux |
| `architecture` | string／条件必填 | 平台架构字典值 | `x64` |
| `build_id` | string／条件必填 | 不可变 Build 唯一标识 | `build_80001` |
| `manifest_id` | string／条件必填 | 不可变 Manifest 唯一标识 | `manifest_81001` |
| `test_result` | enum／条件必填 | 人工测试结果 | `passed`＝通过；`failed`＝不通过 |
| `listing_result_type` | enum／条件必填 | 线下结论类型 | `contract`＝合同；`pricing`＝定价；`listing_review`＝上架审核 |
| `listing_result` | enum／条件必填 | 当前结论 | `confirmed`＝已确认；`rejected`＝不通过；`revoked`＝已撤销 |
| `revision_id` | string／条件必填 | 线下结论修订唯一标识 | `revision_90001` |
| `from_build_id` | string／条件必填 | 指针切换前 Build；首次发布可空 | `build_80001` |
| `to_build_id` | string／条件必填 | 指针切换目标 Build | `build_80002` |
| `publish_mode` | enum／条件必填 | 发布执行方式 | `immediate`＝立即；`scheduled`＝定时 |
| `availability_type` | enum／条件必填 | 可用性开关类型 | `new_download`＝新下载；`new_authorization`＝新授权 |
| `from_value` | boolean／条件必填 | 变更前开关值 | `true` |
| `to_value` | boolean／条件必填 | 变更后开关值 | `false` |
| `result` | enum／是 | 业务动作结果 | `success`＝成功；`failure`＝失败 |
| `failure_type` | enum／是 | 归一失败类型 | `none`＝无失败；`validation_failed`＝校验失败；`permission_denied`＝无权限；`state_conflict`＝状态冲突；`object_incomplete`＝对象不完整；`gate_invalid`＝门禁失效；`service_error`＝服务失败 |
| `operator_role` | enum／是 | 操作主体 | `developer`＝开发者；`tester`＝测试人员；`platform_ops`＝发行运营；`system`＝系统任务 |
| `occurred_at` | datetime／是 | 服务端事件时间，带时区 ISO 8601 | `2026-09-02T12:00:00+08:00` |

### 4.3 指标口径

| 指标 | 计算口径 | 排除项 |
|---|---|---|
| Build 上传成功率 | 成功 `build_upload_result` 动作数 ÷ 上传终态动作数 | 用户未开始上传、重复幂等回包 |
| 首次测试通过率 | 每个 Build 首轮为 passed 的 Build 数 ÷ 已产生首轮终态的 Build 数 | 已终止任务、无终态任务 |
| 发布成功率 | 成功发布动作数 ÷ 已执行发布动作数 | 已取消定时动作、回滚动作 |
| 回滚成功率 | 成功回滚动作数 ÷ 已执行回滚动作数 | 仅打开配置页、校验未提交 |

## 五、待确认项与上线约束

### 5.1 非功能要求

| 项目 | 要求 |
|---|---|
| 权限 | 开发者只访问本 `vendor_id`；测试取包使用白名单与短期凭证；运营权限分为结论录入、发布、回滚、可用性处置。 |
| 一致性 | Pointer 切换、发布记录和事件写入在同一事务或可补偿一致性边界内；失败不得出现页面成功但客户端仍读旧值。 |
| 幂等 | 上传完成、测试提交、发布、回滚、可用性变更均用 `action_id`；重复请求返回首次终态。 |
| 审计 | 已发布对象和终态结果不可物理删除；所有变更记录前后值、主体、时间、原因和证据引用。 |
| 安全 | 包体下载地址不长期暴露；Manifest 路径防穿越；日志不记录凭证、合同正文或用户个人信息。 |

### 5.2 待确认项

| 问题 | 默认建议 | 影响 | 是否阻塞 |
|---|---|---|---|
| 单文件、单 Build、Chunk 大小与并发上传限制 | 以现有对象存储和 CDN 压测结果定值，前端从服务端动态读取 | 影响上传提示、失败码和容量规划 | 阻塞接口冻结，不阻塞流程评审 |
| 首款游戏实际支持的 OS／架构 | 由商务与厂商逐项确认；未提供包体的矩阵行不创建 | 影响首发测试设备与发布范围 | 阻塞首款发布 |
| macOS 签名／公证、Linux 包格式与依赖规范 | 平台输出独立接入规范；本 PRD 仅做入口存在与文件完整性校验 | 影响对应系统是否可测试 | 阻塞对应系统上线 |
| 首次鉴权成功后的离线资格失效条件 | 建议由授权有效期、客户端安全能力和合同共同确定，并在首次鉴权时下发可解释策略 | 影响离线可运行时长及处置生效时间 | 阻塞离线规则冻结 |
| 未发布 Build 的长期归档周期 | 建议测试终态与审计元数据永久保留，文件至少保留一个可回溯周期后再由平台归档 | 影响存储成本，不影响已发布对象永久保留 | 不阻塞一期 |

## 六、参考资料

| 资料 | 用途 |
|---|---|
| `prd/发行平台专项/PC 发行平台功能清单（交付版）.md` | 一期总体模块、角色与平台范围 |
| `prd/发行平台专项/PC游戏发行平台-项目Handoff.md` | 历史决策与文档关系；冲突时以 2026/9/1 进度会结论为准 |
| https://partner.steamgames.com/doc/sdk/uploading | SteamPipe、Depot、Build、Branch 的对象参考 |
| https://developer.wegame.com/developer/game-wiki/help/doc/getting-started-overview/zh_CN | WeGame 开发者接入、测试与发布分工参考 |
| https://developer.wegame.com/developer/game-wiki/help/doc/build-manage-build-manage-process-trad/zh_CN | WeGame 首次全量、后续差量、QA 与发布流程参考；其公开回退只明确上一版本，不能替代本项目任意历史回滚要求 |
| https://developer.wegame.com/developer/game-wiki/help/doc/build-manage-rail-setup-tool/zh_CN | GUI／CLI 差量上传及 base build 选择参考；本项目一期只做网页上传，客户端 Chunk 更新独立实现 |
| https://developer.wegame.com/developer/game-wiki/help/doc/build-manage-branches/zh_CN | QA／Beta／Default 的测试与正式分工参考；本项目不照搬复杂多分支 |

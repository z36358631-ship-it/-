# 【PRD】PC 发行平台开发者后台—游戏商品与双 Key 供给管理需求

## 修订记录

| 修订日期 | 修订内容 | 版本 | 修订人 |
|---|---|---|---|
| 2026/9/1 | 创建 CDKEY 商品、SKU、供应来源关联、可售门禁及供给异常处置规则 | V1.0 | 郑群超 |
| 2026/9/1 | 纳入开发者后台专项，补充 Steamworks／WeGame 借鉴与现有 CDKEY 供给边界 | V1.1 | 郑群超 |
| 2026/9/2 | 在开发者侧增加盖世 Key 批次、渠道 API 与接口说明 | V1.2 | 郑群超 |
| 2026/9/2 | 按进度会与业务确认拆分外部 Key 入站、盖世 Key 出站两套库存账本；统一 APPID／商品／SKU 关系，保留发行方自助生成盖世 Key 和渠道 API | V1.3 | 郑群超 |
| 2026/9/2 | 冻结盖世 Key 批次／单码／渠道交付三层状态，补齐渠道 API 契约、幂等恢复和防重放；外部 Key 一期收敛为受控导入 | V1.4 | 郑群超 |

**备注：** 搜2026.9.2修改

## 一、文档概述

### 1.1 背景概述

- **需求背景：** 新发行平台既要销售 Steam、Epic、GOG 等外部平台激活 Key，又要为盖世直接发行游戏提供盖世 Key 批次和渠道 API。两类 Key 的生成方、绑定商品、履约终点和风险完全不同，必须建立两条独立供给链。
- **当前方式：** 外部 Key 一期由运营受控批量导入，面向平台订单完成预留和交付；供应商 API 只有在具体供应商、字段和 SLA 确认后才单独接入。盖世 Key 由发行方在平台预授权范围内自助生成，经批次下载或渠道 API 分配，最终由用户兑换为盖世权益。
- **核心问题：** 旧版将两类 Key 写入同一“Key 批次／供给库存”概念，未明确外部 Key 入站与盖世 Key 出站的对象 ID、状态、权限和对账边界，可能造成跨账本混扣、错误作废、明文泄露和历史履约被改写。
- **业务证据：** 2026-09-01《游戏平台进度会》确认合同、定价和上架结论在线下完成，后台只录入或消费结果；用户进一步确认发行方自助生成盖世 Key 与渠道 API 为一期必备。现有 CDKEY 订单链继续承接外部 Key 的购买、支付、交付和退款。

### 1.2 需求边界

| 边界类型 | 范围说明 |
|---|---|
| 产品边界 | [已确认] 本文只包含 B 端 6 个业务页面：开发者双链供给总览、外部 Key 异常详情、平台商品／SKU 总览、外部 Key 入站供给配置、盖世 Key 计划／批次／渠道 API、双账本异常与对账。不新增 C 端页面。 |
| 业务边界 | [已确认] 覆盖外部 Key 入站和盖世 Key 出站两条链；前者服务第三方平台激活订单，后者服务盖世直接发行渠道分配、用户兑换和权益授予。两链共享五级业务 ID，但库存、状态、权限和对账完全隔离。 |
| 运营边界 | 平台运营配置 Product／SKU、外部供应来源、盖世 Key 计划和启停；发行方只在预授权范围内自助创建盖世批次和渠道凭据。合同、资质、定价和上架只消费线下结果，不在本后台审批。 |
| 人力边界 | 发行方维护授权内盖世 Key 批次／渠道；发行运营维护商品、供给、计划、异常和对账；商务／法务／财务在线下提供商业结论；服务端、安全、测试和数据分别负责账本隔离、密钥安全、验收和事件采集。 |
| 对象边界 | [已确认] 两条链固定使用 `vendor_id + game_id + app_id + product_id + sku_id` 关联业务对象。外部链增加 `external_key_batch_id`；盖世链增加 `gamehub_key_program_id + gamehub_key_batch_id + channel_id`。 |
| 外部链边界 | [已确认] `External Key Supply`：外部平台或供应商生成 Key → 运营受控批量导入 → 外部 Key 库存 → 平台订单预留 → 向用户交付第三方平台激活 Key。供应商 API 不属于当前已确认范围；盖世不生成 Steam、Epic、GOG 等外部 Key。 |
| 盖世链边界 | [已确认] `GameHub Key Distribution`：发行方在预授权范围内创建计划和批次 → 盖世兑换服务生成 Key → 一次性安全交付或渠道 API 分配 → 用户兑换 → 授予 `app_id + product_id + sku_id` 权益。仅绑定盖世直接发行商品。 |
| 商业边界 | 合同、主体资质、定价和上架审核在线下完成；本后台只展示结果、来源与时间并将其作为启用门禁，不建设在线价格审批或上架审批。启用、暂停和恢复仍由运营执行并留痕。 |
| 数据边界 | 两条链使用独立库存账本、批次状态、单 Key 状态、权限和对账。允许在同一页面分 Tab 展示，但禁止跨账本互转、混扣、合并库存或混合对账。 |

#### 一期明确不包含

1. 由盖世生成、猜测或补发 Steam、Epic、GOG 等外部平台 Key。
2. 将外部 Key 转换为盖世 Key，或在两套库存账本之间调拨、冲销和替换。
3. 开发者自助定价、上架审批、发布、停售或恢复商品；发行方自助生成盖世 Key 不改变商品运营权限。
4. 重做 C 端商品详情、订单、支付、外部 Key 展示、退款或盖世权益库页面。
5. 重复查看、复制或导出已关闭一次性窗口的完整 Key／`client_secret`。
6. 多供应商智能路由、自动比价、自动切换、复杂分账和线上合同流程。

### 1.3 术语定义

| 术语／缩写 | 英文全称 | 定义与判断口径 |
|---|---|---|
| 外部 Key 入站 | External Key Supply | 外部平台或供应商生成的激活 Key 一期通过运营受控批量导入进入平台，再由平台订单预留和交付的供给链。 |
| 盖世 Key 出站 | GameHub Key Distribution | 盖世兑换服务生成 Key，经发行方批次交付或渠道 API 分配，最终兑换为盖世直接发行权益的分发链。 |
| 外部 Key 批次 | External Key Batch | 外部 Key 入站的最小批次对象，唯一标识为 `external_key_batch_id`；一期记录来源平台、区域、受控导入结果和外部库存账本。 |
| 盖世 Key 计划 | GameHub Key Program | 平台对 `vendor_id + game_id + app_id + product_id + sku_id`、用途、渠道、区域、总配额和有效期的预授权对象，唯一标识为 `gamehub_key_program_id`。 |
| 盖世 Key 批次 | GameHub Key Batch | 发行方在计划范围内创建、由盖世兑换服务生成的 Key 集合，唯一标识为 `gamehub_key_batch_id`。 |
| 渠道 API 凭据 | Channel API Credential | 某 `channel_id` 调用盖世 Key 分配接口所需的 `client_id` 与 `client_secret`；Secret 仅创建或轮换成功时展示一次。 |
| 兑换权益 | Redeemed Entitlement | 用户成功兑换盖世 Key 后获得的 `app_id + product_id + sku_id` 权益；兑换与权益授予必须原子完成或可幂等恢复。 |
| 外部 Key 单码状态 | External Key State | 只使用可用、预留、已交付、已揭示、作废、替换；已交付／已揭示记录不可被批次作废反向改写。 |
| 盖世 Key 单码状态 | GameHub Key State | 只使用可用、分配待确认、已交付、已兑换、已过期、已作废；已暴露 Key 不得回到可用，已兑换记录不可被批次作废反向改写。 |
| 渠道交付记录状态 | Channel Delivery State | 只使用分配待确认、已确认、确认超时、已撤销、失败；用于描述渠道是否确认收到原分配结果，不与单 Key 状态混用。 |
| 幂等请求 | Idempotent Request | 同一 `request_id` 且业务内容一致时返回同一分配／兑换结果，不重复扣减；内容冲突时拒绝。 |
| 双账本对账 | Dual-ledger Reconciliation | 分别核对外部库存与订单履约、盖世批次／渠道分配与兑换权益；两套结果不合并为一个库存数。 |

## 二、产品说明

### 2.1 产品／方案简介

| 项目 | 说明 |
|---|---|
| 产品／方案定位 | 为签约发行方和平台运营提供两条可追溯的 Key 供给链：外部 Key 安全入站并服务平台订单，盖世 Key 在授权范围内自助生成并服务渠道分发与用户兑换。 |
| 目标用户 | 独立开发者账号、平台发行运营、受授权第三方渠道，以及负责线下商业结论的商务／法务／财务人员。 |
| 核心目标 | 消除双链混账风险；让发行方无需逐批找运营即可生成盖世 Key 和管理渠道 API；保证 Key、Secret、配额、订单、兑换与权益可控、可审计。 |
| 使用场景 | 外部激活商品由平台接收供应商 Key 并完成订单履约；盖世直接发行商品由运营开通计划，发行方创建批次或凭据，渠道按接口分配，用户兑换后获得盖世权益。 |
| 功能概述 | 商品／SKU 映射、外部 Key 入站、盖世 Key 计划与批次、渠道 API、用户兑换、双账本异常和独立对账组成完整闭环。 |

#### 竞品借鉴结论

| 竞品 | 已核对能力 | 一期可借鉴 | 一期不采用 |
|---|---|---|---|
| Steamworks | Steam Keys 的申请、获取、查询、标记与禁用 | 在明确产品和用途范围内生成批次；敏感明文一次性交付；已激活历史不可被批次操作覆盖 | 由盖世生成 Steam Key，或照搬全部 Steam Key 类型体系 |
| WeGame 开发者平台 | 游戏、商品、开发接入和发行能力按项目组织 | 以 Game／APPID 为上下文呈现商品、供给、状态和文档；平台保留上架控制 | 公众开放入驻、在线商务审批、复杂组织权限和超出一期的开放能力 |
| WeGame CDKey／渠道数据 | 官方文档可见营销 Key 的数量、有效期、激活时长、备注及邮件发放，以及采购 Key 后按渠道／批次统计的模型；后者文档同时注明当时无实际游戏案例 | 借鉴用途、到期、批次标签、渠道与销售／激活分层，不把营销免费 Key 等同商品库存 | 照搬每游戏 500 个额度、邮件发送明文，或把无实际案例的数据模型当成熟履约事实 |
| 本期方案 | 双 Key 链服务两种发行方式 | 共用对象 ID，不共用库存账本；盖世 Key 支持计划内自助与渠道 API | 不把外部平台 Key 伪装成盖世生成，不用一个库存数覆盖两条链 |

#### 对象关系与强约束

| 关系 | 外部 Key 入站 | 盖世 Key 出站 |
|---|---|---|
| 业务主键 | `vendor_id + game_id + app_id + product_id + sku_id + external_key_batch_id` | `vendor_id + game_id + app_id + product_id + sku_id + gamehub_key_program_id + gamehub_key_batch_id + channel_id` |
| SKU 类型 | 仅绑定“第三方平台激活”SKU，并记录外部平台、版本、区域 | 仅绑定“盖世直接发行”SKU 和平台 APPID |
| Key 生成方 | Steam／Epic／GOG／供应商等外部主体 | 盖世兑换服务 |
| 入出库依据 | 一期受控导入；订单预留／交付 | 计划配额生成；批次下载或渠道 API 分配；用户兑换 |
| 历史保护 | 已交付／已揭示不可回退为可用，替换码与原码双向关联 | 已暴露 Key 不可回退为可用；已兑换不可回退或被批次作废 |
| 禁止关系 | 禁止转换、调拨或混扣至盖世账本 | 禁止作为第三方平台激活 Key 或补充外部库存 |

#### 双链状态

| 对象 | 状态 | 状态规则 |
|---|---|---|
| 外部 Key 单码 | 可用 → 预留 → 已交付 → 已揭示；可用／预留可按规则进入作废；异常补码进入替换 | 预留超时可在未支付且无履约占用时释放；已交付／已揭示只读。揭示仅在用户主动请求并成功返回明文后发生；替换必须记录原码、替换码、订单与原因。 |
| 外部 Key 批次 | 校验中、部分失败、可用、已阻塞、已关闭 | 部分失败只接收通过校验且已原子入账的记录；失败明细不进入可售库存。批次关闭不改写已交付 Key。 |
| 盖世 Key 单码 | 可用 → 分配待确认 → 已交付 → 已兑换；受控批次下载可从可用直接进入已交付；未兑换时可进入已过期／已作废 | 分配待确认和已交付不得再次分配；已兑换永久保留兑换与权益证据。确认超时不自动回库。 |
| 盖世 Key 批次 | 生成中、生成失败、可用、已暂停、已耗尽、已过期、已作废 | 生成失败不产生半批次或扣减计划配额；批次作废只影响仍可用的 Key。 |
| 渠道凭据 | 正常、已暂停、已撤销、已过期 | 暂停可恢复；撤销不可恢复；创建和轮换后的 Secret 仅本次展示。 |

#### 商业与启用门禁

| 门禁 | 通过条件 | 未通过处理 |
|---|---|---|
| 对象门禁 | `vendor_id + game_id + app_id + product_id + sku_id` 关系有效，SKU 类型与 Key 链一致 | 禁止入库、生成、分配、兑换或启用；不自动改绑 |
| 线下商业门禁 | 合同、授权地区、定价／领取条件、分成、结算责任和上架结果均已在线下确认并录入来源与时间 | 后台仅显示缺失项；不提供在线审批或自动商务结论 |
| 外部供给门禁 | 外部来源有效、批次校验完成、区域匹配且存在可用 Key | 停止新增销售／预留；不影响已交付订单 |
| 盖世计划门禁 | 计划启用、范围与渠道匹配、配额充足、当前时间在有效期内 | 禁止新批次和新分配；不改写已兑换权益 |
| 启用门禁 | 上述适用条件均通过且由平台发行运营执行启用 | 失败不产生半启用状态；记录缺失项和操作结果 |

### 2.2 产品流程

两条链共享 Game／APPID／商品／SKU 上下文，但从入库到对账始终分开：

- **A 外部 Key 入站：** 线下商业结果已确认 → 平台配置第三方激活 Product／SKU → 运营受控批量导入 → 格式、重复、平台、区域与安全校验 → 写入外部库存账本 → 平台销售订单预留 → 支付后安全交付 → 外部库存与订单履约独立对账。
- **B 盖世 Key 出站：** 线下商业结果已确认 → 平台配置盖世直接发行 Product／SKU／APPID → 运营开通盖世 Key 计划 → 发行方生成批次并受控下载，或创建渠道凭据 → 渠道以 `request_id` 幂等分配 → Key 进入分配待确认 → 渠道确认或用户兑换形成交付佐证 → 用户兑换 → 原子授予盖世权益 → 批次／单 Key／渠道交付／兑换权益独立对账。

![CDKEY供给流程](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-cdkey-supply-flow.png)

*图 2.2-1：V1.2 旧图只表达单供给链；V1.4 视觉验收前须替换为左右并列的外部 Key 入站与盖世 Key 出站，并画出两套独立对账终点。*

## 三、功能需求

### 3.2 B 端功能需求

#### 3.2.1 开发者双链供给总览页

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 在同一 Game 上下文内分 Tab 查看“外部 Key 入站”和“盖世 Key 出站”的商品、授权、库存摘要和可操作入口。 |
| 场景描述 | 发行方查看本厂商两类供给状态，并在盖世 Key 计划授权内进入批次或渠道 API 操作。 |
| 输入／前置条件 | 独立开发者账号已登录；每次读取校验 `vendor_id + game_id + app_id`，商品摘要再校验 `product_id + sku_id`。 |
| 需求描述 | **图示：**<br>![开发者供给状态](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-developer-supply-status.png)<br>*图 3.2.1-1：V1.2 旧图仅用于布局参考；V1.4 视觉稿须改为双链 Tab 与两套授权摘要。*<br>**界面文字与布局：** 顶部固定展示 Game、APPID、Product、SKU 和线下商业结果摘要；下方为“外部 Key 入站”“盖世 Key 出站”两个一级 Tab。各 Tab 使用独立库存、批次、异常和更新时间卡片，不展示合计库存。<br>**详细说明：** 页面只统一入口与上下文，不合并两套库存；外部链只读，盖世链只开放计划授权内自助操作。<br>**展示说明：**<br>1. 外部 Tab 展示外部平台、`external_key_batch_id`、可用／预留／已交付数量、来源方式、最近导入和外部异常入口；只读，不提供外部 Key 生成。<br>2. 盖世 Tab 展示 `gamehub_key_program_id`、计划配额、可用／分配待确认／已交付／已兑换数量、有效渠道、暂停原因，并提供批次和渠道 API 入口。<br>3. 两个 Tab 分别展示线下定价／上架结果的来源与时间；缺失时只提示联系平台，不出现在线审批按钮。<br>4. Key 明文、完整 Secret、外部供应商凭据和用户个人数据不在总览展示。<br>**交互说明：**<br>1. 切换 Tab 保留当前 Game；刷新保留所选 Tab。跨链跳转时重新校验 SKU 类型，类型不匹配时阻止进入。<br>2. 外部异常进入 3.2.2；盖世批次或渠道操作进入 3.2.5。发行方无商品启停、外部入库和对账处置权限。<br>3. 数据加载失败时各 Tab 独立失败，不用另一账本数据兜底；越权时不返回对象是否存在。 |
| 输出／后置条件 | 发行方获得两条供给链的独立状态，并进入有权限的异常详情或盖世 Key 自助页面。 |
| 补充说明 | 同一 SKU 只能归属一条 Key 链。双 Tab 只是信息架构，不代表两账本可合并；页面任何总计都必须标注 Key 链。 |

#### 3.2.2 外部 Key 异常详情页

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 开发者查看本厂商外部 Key 入站、库存、订单预留或交付异常的脱敏详情和处理进度。 |
| 场景描述 | 外部平台 Key 批次部分失败、导入中断、库存不足、预留冲突或交付失败时，发行方判断是否需要联系供应方补充。 |
| 输入／前置条件 | 异常、`external_key_batch_id`、Product／SKU 均归属当前 `vendor_id + game_id + app_id`；平台已生成开发者可见摘要。 |
| 需求描述 | **图示：**<br>![供给异常详情](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-supply-error-detail.png)<br>*图 3.2.2-1：沿用异常详情布局，但仅展示外部 Key 链。*<br>**界面文字与布局：** 顶部展示外部链标识和影响结论；主体展示批次、外部平台、区域、异常类型、时间线和开发者建议动作；右侧展示安全边界。<br>**详细说明：** 页面只返回归一、脱敏后的外部供给异常，不提供会改变库存或订单状态的开发者操作。<br>**展示说明：**<br>1. 展示 `external_key_batch_id`、外部平台、区域、异常类型、影响数量和处理时间线。<br>2. 一期异常覆盖批次部分失败、重复 Key、区域不匹配、导入失败、库存不足、预留冲突和交付失败。<br>3. 只显示数量与归一原因，不显示 Key 明文、原始文件内容、供应商凭据或其他厂商信息。<br>**交互说明：**<br>1. 开发者可刷新状态、返回对应批次或按线下方式联系平台。<br>2. 开发者不可重新导入、释放预留、替换、作废或恢复销售。<br>3. 异常已合并时跳转新记录并保留历史关联；无权限时不返回目标摘要。 |
| 输出／后置条件 | 开发者获得外部链影响和配合事项；不改变库存、订单或异常状态。 |
| 补充说明 | 外部异常不得显示盖世计划配额或兑换数据。已交付 Key 的异常处置必须走替换／退款规则，不得回退库存。 |

#### 3.2.3 平台商品／SKU 总览页

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 平台运营维护 Product／SKU 与 Game／APPID 的关系、Key 链类型、线下商业结果和启用状态。 |
| 场景描述 | 运营为签约 Game 配置第三方激活 SKU 或盖世直接发行 SKU，并进入对应供给链。 |
| 输入／前置条件 | 运营有权限；Game 资料已确认且 APPID 正常；定价和上架允许尚未确认时保存草稿，但不可启用。 |
| 需求描述 | **图示：**<br>![运营商品列表](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-ops-product-list.png)<br>*图 3.2.3-1：V1.3 在旧列表基础上增加 APPID、Key 链和线下结果来源。*<br>**界面文字与布局：** 列表展示 `vendor_id`、`game_id`、`app_id`、`product_id`、SKU 数、发行方式、Key 链、线下定价／上架结果、供给状态、启用状态和异常。<br>**详细说明：** Product／SKU 是两条链的共同业务索引，但每个 SKU 只能选择一种与发行方式一致的 Key 链。<br>**展示说明：**<br>1. 第三方激活 SKU 只可选择外部 Key 入站；盖世直接发行 SKU 只可选择盖世 Key 出站。已保存后 Key 链类型不可直接切换。<br>2. 线下结果展示结论、来源、完成时间和录入时间；页面不提供定价或上架审批。<br>3. 行内操作按类型展示“外部供给配置”或“盖世 Key 计划”，以及“启用”“暂停”“查看对账”。<br>**交互说明：**<br>1. 创建／编辑时校验五级 ID 关系、发行方式、地区和 SKU 唯一性；失败不生成半对象。<br>2. 启用时重新读取线下结果和对应账本门禁；暂停只影响后续销售／生成／分配，不删除已交付或已兑换历史。<br>3. 已产生履约的 SKU 不可删除或改换 Key 链，只能停用并新建正确 SKU。并发修改以对象版本控制。 |
| 输出／后置条件 | Product／SKU 形成明确 Key 链并进入外部入站或盖世出站配置；启停状态写入审计。 |
| 补充说明 | 商品页只消费 01 的已确认资料与线下商业结果。运营可做字段校验，但不能在本页补造定价、合同或上架结论。 |

#### 3.2.4 外部 Key 入站供给配置页

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 通过运营受控批量导入接收外部平台 Key，完成批次校验、入账和供给启停。 |
| 场景描述 | 运营关联供应商商品并同步 Key，或按已批准安全流程导入发行方／供应商交付的外部 Key 批次。 |
| 输入／前置条件 | 目标 SKU 为第三方平台激活；五级 ID 关系有效；外部平台、区域、供应主体和接收方式已批准。 |
| 需求描述 | **图示：**<br>![供应来源关联](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-ops-supply-link.png)<br>*图 3.2.4-1：V1.2 旧图仅覆盖来源关联；V1.4 须补受控导入、批次校验和部分失败。*<br>**界面文字与布局：** 顶部展示 Product／SKU、外部平台和区域；一期供给方式固定为“受控批量导入”；下方展示批次列表、校验结果、外部库存摘要和启停。<br>**详细说明：** 导入结果只写入外部 Key 账本；盖世不生成外部 Key，页面不提供普通明文粘贴。<br>**展示说明：**<br>1. 受控导入记录 `external_key_batch_id`、交付方、外部平台、版本、区域、数量、文件哈希、加密方式和接收人；不得在普通表单粘贴明文 Key。<br>2. 校验包含格式、空值、批内重复、跨批重复、外部平台、区域、SKU、已交付历史和恶意公式／文件类型；结果分通过、失败和重复数量。<br>3. 部分失败时只有通过校验且成功原子写入的 Key 进入可用库存；失败明细通过受控文件返回，不在页面展示明文。<br>**交互说明：**<br>1. 受控导入携带 `action_id`；重复提交同一文件哈希／外部批次号返回原结果，不重复入库。<br>2. 导入过程中断时批次保持校验中或失败，不得把未提交记录计入库存；重试先查询原动作结果。<br>3. 停用批次只阻止可用 Key 新预留；已预留按订单状态释放或交付，已交付不变。作废与替换须逐码留痕。 |
| 输出／后置条件 | 生成 `external_key_batch_id` 和独立外部库存记录；可用 Key 可被平台订单预留／交付，失败 Key 不入账。 |
| 补充说明 | Key 原文加密存储，解密仅发生在授权履约路径；明文、解密密钥、供应商 Secret 不进入页面、导出、埋点、Fixture、普通日志或截图。 |

##### 外部 Key 状态与订单规则

| 状态 | 进入／退出 | 操作与结果 | 历史保护 |
|---|---|---|---|
| 可用 | 校验并原子入账成功；被订单预留后退出 | 可供新订单预留；可在无占用时作废 | 同一 Key 全局去重，不得跨 SKU／账本复用 |
| 预留 | 有效订单原子占用；交付、取消或超时后退出 | 支付成功进入已交付；未支付释放回可用 | 释放前校验订单未支付且无履约记录 |
| 已交付 | Key 已安全交付给用户 | 只读；异常时创建替换关联或退款记录 | 永不回退为可用，不受批次停用／作废改写 |
| 已揭示 | 用户主动请求并成功查看 Key 明文 | 只读；无效／重复时创建替换关联或退款记录 | 不得再次计为首次揭示；记录用户、订单、时间、IP／设备摘要和结果 |
| 作废 | 未交付 Key 被平台确认不可使用 | 永久停止预留 | 原批次、原因、操作人和时间保留 |
| 替换 | 原已交付 Key 经核验无效并交付替换 Key | 原码和新码均只读，订单保持双向关联 | 替换码只能从同 SKU／区域的可用外部库存原子扣减 |

#### 3.2.5 盖世 Key 计划／批次／渠道 API 页

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 平台开通盖世 Key 计划后，发行方自助创建批次、受控下载，并管理渠道 API 凭据、分配、交付确认和结果恢复。 |
| 场景描述 | 盖世直接发行游戏需要线下渠道发码或系统对接时，发行方在授权范围内完成供给，不必逐批找运营。 |
| 输入／前置条件 | SKU 为盖世直接发行且绑定正常 APPID；`gamehub_key_program_id` 已启用；用途、渠道、区域、配额和有效期在预授权范围内。 |
| 需求描述 | **图示：**<br>![供应来源关联](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-ops-supply-link.png)<br>*图 3.2.5-1：V1.2 图片不包含盖世 Key 计划／渠道 API，V1.4 须重新出图。*<br>**界面文字与布局：** 页面按“计划授权”“Key 批次”“渠道 API”“接口说明”四个页内 Tab 展示；顶部始终显示五级 ID、`gamehub_key_program_id`、总配额、剩余配额、有效期和状态。<br>**详细说明：** 发行方只在预授权计划内自助；平台控制范围和启停，盖世兑换服务负责 Key 生成、渠道交付状态和权益授予。<br>**展示说明：**<br>1. 批次字段包含 `gamehub_key_batch_id`、名称、用途、`channel_id`、区域、数量、有效期、批次状态、可用／分配待确认／已交付／已兑换数量和受控下载状态。<br>2. 凭据列表显示名称、`channel_id`、`client_id`、Secret 末四位、Scope、配额、有效期、最近调用和状态；完整 Secret 只在创建／轮换成功时展示一次。<br>3. 接口说明展示正式版本、请求／响应、HMAC 签名、时间戳与随机数、防重放、`request_id` 幂等、限流、分配／查询／确认、错误码和响应丢失恢复；示例不得包含生产 Secret、真实 Key 或真实用户数据。<br>**交互说明：**<br>1. 发行方创建批次时提交名称、用途、渠道、区域、数量和有效期；服务端按计划原子校验并扣减可生成配额。生成失败不产生半批次、不扣配额。<br>2. 受控批次下载完成后，文件内 Key 直接进入“已交付”且不可再次展示；下载响应未完成时可用同一 `action_id` 查询并恢复原下载任务，系统不得重新生成一批 Key。成功后遗失只能作废未兑换 Key 并新建批次。<br>3. 渠道凭据支持创建、轮换、暂停、恢复和撤销；Scope 不得超出计划。暂停拒绝新分配；撤销不可恢复，但不反向改写历史分配与兑换。<br>4. 渠道按 `channel_id + request_id` 调用分配接口；内容一致时在幂等保留期内返回原 Key 与状态，内容冲突拒绝。首次成功原子扣减可用 Key 并进入“分配待确认”；确认后进入“已交付”，确认超时只告警、不自动回库。<br>5. 用户可兑换“分配待确认”或“已交付”且仍有效的 Key；成功后 Key、兑换记录和 `app_id + product_id + sku_id` 权益原子写入。若兑换早于渠道确认，交付记录同时记为“已确认／兑换佐证”；服务异常先查询原兑换结果再幂等重试。 |
| 输出／后置条件 | 生成盖世 Key 批次或渠道凭据；渠道获得可恢复的唯一分配结果并完成交付确认；用户兑换成功后获得唯一盖世权益并形成审计链。 |
| 补充说明 | 1. 批次暂停默认只阻止新生成、下载和分配；已进入“分配待确认”或“已交付”的 Key 在自身有效期内仍可兑换。版权／安全紧急停用须执行单 Key 作废并记录原因。<br>2. 确认超时的 Key 不自动回到可用；人工撤销仅适用于未兑换 Key，撤销后 Key 进入“已作废”且不得重新分配。<br>3. 同一用户已拥有等价权益时返回“已拥有”，不重复授予；同一 Key 只能成功兑换一次。<br>4. Key 明文和 Secret 不进入埋点、Fixture、普通日志、截图或常规导出。 |

##### 渠道 API 方法

| 方法 | 路径 | 用途 | 幂等与安全结果 |
|---|---|---|---|
| POST | `/openapi/v1/gamehub-keys/allocate` | 按渠道订单分配一个盖世 Key | `channel_id + request_id` 内容一致返回原 Key 与原状态；首次成功原子扣减一个可用 Key 并进入“分配待确认” |
| GET | `/openapi/v1/gamehub-keys/allocations/{request_id}` | 恢复原分配结果并查询交付状态 | 仅同一渠道下具备原 Scope 的当前有效凭据可查；Key 恢复窗口内返回原 Key，窗口结束后只返回掩码和状态，不产生再次扣减 |
| POST | `/openapi/v1/gamehub-keys/allocations/{request_id}/confirm` | 确认渠道已安全收到原分配结果 | 首次成功将交付记录改为“已确认”、Key 改为“已交付”；重复确认返回原结果，不改变 Key 或配额 |

##### 请求与响应契约

| 操作 | 请求字段 | 成功响应 | 失败与恢复 |
|---|---|---|---|
| 分配 | Header 带鉴权字段；Body 必填 `request_id`、`app_id`、`product_id`、`sku_id`、`channel_order_ref`，一期固定 `quantity=1` | `allocation_id`、原 `request_id`、`gamehub_key_batch_id`、`key`、`key_status=allocation_pending_confirmation`、`expires_at`、`confirm_deadline_at`、`key_retrieval_deadline_at` | HTTP 状态、`error_code`、`message`、`request_id`、`trace_id`、`retryable`；网络结果未知时先用原 `request_id` 查询或重试，不得换新 ID |
| 查询 | 路径带原 `request_id`；Header 为同渠道且具备原 Scope 的当前有效凭据 | 原 `allocation_id`、Key／掩码、单 Key 状态、交付记录状态、三个截止时间；结果不存在返回明确错误 | 同渠道、同 Scope 内按原结果恢复；超过 Key 恢复窗口仍可查状态，但不再返回明文 |
| 确认 | 路径带原 `request_id`；Body 必填 `allocation_id`、`received_at`，可选不含个人信息的 `delivery_reference` | 原 `allocation_id`、`delivery_status=confirmed`、`key_status=delivered`、`confirmed_at` | 内容一致重复确认返回原结果；ID 或渠道不匹配拒绝，不得改变原状态 |

##### 鉴权、幂等与防重放

| 规则 | 一期约定 | 拒绝条件 | 审计与恢复 |
|---|---|---|---|
| 传输与身份 | 公网仅使用 TLS 1.2+；Header 使用 `X-Client-Id`、`X-Timestamp`、`X-Nonce`、`X-Signature`，Secret 不进 URL 或 Body | 非 HTTPS、凭据暂停／撤销／过期、Scope 或五级 ID 不匹配 | 记录脱敏 `credential_id`、渠道、Scope、结果和 `trace_id` |
| 签名 | `HMAC-SHA256(client_secret, method + "\n" + path + "\n" + timestamp + "\n" + nonce + "\n" + SHA256(body))`，十六进制小写 | 签名不一致或规范化内容不一致 | 失败不返回对象存在性、Key、Secret 或签名原文 |
| 防重放 | `[建议方案]` 时间戳允许服务端时间前后 300 秒；同 `credential_id + nonce` 10 分钟内只接受一次 | 时间超窗或 Nonce 重复 | 返回 `REPLAY_REJECTED`；渠道校时后使用新 Nonce、原 `request_id` 重试 |
| 业务幂等 | `[建议方案]` `channel_id + request_id` 保留 7 天；原请求摘要同时保存 | 同一键请求体不一致 | 返回 `IDEMPOTENCY_CONFLICT`；不得分配新 Key或覆盖原结果 |
| Key 恢复 | `[建议方案]` 同渠道且具备原 Scope 的当前有效凭据可在分配后 24 小时内通过原 `request_id` 恢复同一 Key；之后只返回掩码和状态 | 跨渠道、跨 Scope 或超过恢复窗口请求明文 | 每次明文恢复单独审计并记录实际 `credential_id`；遗失且超窗时人工作废未兑换 Key 并新建请求 |
| 限流 | `[建议方案]` 默认每 `client_id` 60 次／分钟、突发 10 次；平台可按渠道下调 | 超过渠道限额 | HTTP 429，返回 `RATE_LIMITED` 与 `Retry-After`；重试沿用原 `request_id` |

##### 统一错误码

| HTTP | `error_code` | 场景 | 是否可重试 |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | 缺字段、格式错误或 `quantity` 不是 1 | 修正请求后使用新 `request_id` |
| 401 | `AUTH_INVALID`／`SIGNATURE_INVALID` | 凭据或签名无效 | 修复鉴权后使用原 `request_id` |
| 403 | `SCOPE_DENIED` | 渠道、APPID、SKU 或接口 Scope 越权 | 不可自动重试 |
| 409 | `REPLAY_REJECTED` | 时间戳或 Nonce 命中防重放规则 | 校时并换 Nonce，沿用原 `request_id` |
| 409 | `IDEMPOTENCY_CONFLICT` | 同一 `request_id` 的请求体与原请求不同 | 不可自动重试；人工核对渠道订单 |
| 409 | `PROGRAM_UNAVAILABLE` | 计划／批次暂停、过期、作废或授权失效 | 状态恢复前不可重试 |
| 409 | `QUOTA_INSUFFICIENT`／`KEY_UNAVAILABLE` | 渠道配额不足或无可用 Key | 补充配额或 Key 后沿用原业务订单并新建 `request_id` |
| 404 | `ALLOCATION_NOT_FOUND` | 当前渠道下不存在原 `request_id` | 核对环境与请求 ID，不泄露其他渠道记录 |
| 429 | `RATE_LIMITED` | 超过渠道限流 | 按 `Retry-After` 重试，沿用原 `request_id` |
| 503 | `SERVICE_UNAVAILABLE` | 服务暂不可用且分配结果未知 | 先查询原 `request_id`；不得直接换 ID 重试 |

##### 盖世 Key 批次状态

| 状态 | 进入／退出 | 可执行操作 | 失败与历史保护 |
|---|---|---|---|
| 草稿 | 发行方保存未提交配置；提交生成后退出 | 编辑、删除草稿、提交生成 | 删除不占配额；生成校验失败仍保留草稿 |
| 生成中 | 原子锁定配额并创建任务 | 查看进度，不可下载／分配 | 失败转生成失败并释放未实际生成配额 |
| 可用 | 全量生成成功且至少一个 Key 可用 | 受控下载、渠道 API 分配、暂停、作废 | 单 Key 状态独立推进；批次操作不覆盖历史交付／兑换 |
| 已暂停 | 有权限角色暂停 | 查看、恢复、作废；拒绝新下载／分配 | 已分配待确认、已交付 Key 默认仍可兑换 |
| 已耗尽 | 不再有可用 Key | 查看、对账 | 不代表全部 Key 已兑换；不得回退已暴露 Key |
| 已过期 | 批次有效期结束 | 查看、对账 | 未兑换 Key 按自身到期转已过期；历史交付／兑换保留 |
| 已作废 | 有权限角色终止剩余供给 | 查看、对账 | 只影响可用 Key；已暴露 Key需逐码处置并留痕 |
| 生成失败 | 生成任务未原子完成 | 查看原因、基于原配置重新发起新任务 | 不产生半批次；原失败任务只读 |

##### 渠道交付记录状态

| 状态 | 进入／退出 | 对应单 Key | 超时、撤销与恢复 |
|---|---|---|---|
| 分配待确认 | 分配接口首次成功；确认、兑换佐证、超时或人工撤销后退出 | 分配待确认 | 同一 `request_id` 恢复原结果；不得再次分配 |
| 已确认 | 渠道确认，或用户先兑换形成交付佐证 | 已交付或已兑换 | 终态只读；重复确认返回原结果 |
| 确认超时 | 到 `confirm_deadline_at` 仍未确认且未兑换 | 仍为分配待确认 | 只告警、不自动回库；查询仍返回原状态，人工核对后确认或撤销 |
| 已撤销 | 人工确认未兑换且决定废弃原分配 | 已作废 | 已暴露 Key 永不回到可用；补发必须新 `request_id`、新 Key |
| 失败 | 鉴权、校验或原子分配失败且未暴露 Key | 无单 Key 或仍可用 | 可按错误码修复；不得留下半分配记录 |

##### 盖世 Key 状态与兑换规则

| 状态 | 进入／退出 | 操作与结果 | 历史保护 |
|---|---|---|---|
| 可用 | 完整批次生成后进入；下载或 API 分配后退出 | 可分配、过期或作废 | 同一 Key 不得重复生成或进入外部账本 |
| 分配待确认 | 渠道 API 首次成功且 Key 已返回 | 可查询原结果、确认、兑换、超时或人工撤销；不得再次分配 | 保留批次、渠道、凭据、`request_id`、请求摘要和分配时间 |
| 已交付 | 受控批次下载完成，或渠道确认收到原分配结果 | 可由用户兑换；不得再次分配 | 保留交付方式、确认来源和时间 |
| 已兑换 | 用户兑换与权益授予原子成功 | 只读，不可作废或回退 | 永久保留用户脱敏标识、权益和结果证据 |
| 已过期 | 可用、分配待确认或已交付 Key 超过自身有效期且未兑换 | 拒绝分配和兑换 | 已兑换历史不受批次过期影响 |
| 已作废 | 可用 Key 被批量作废，或已暴露未兑换 Key 经人工撤销／紧急停用 | 拒绝分配和兑换，不得回到可用 | 已交付／已兑换事实不被批次作废反向改写 |

#### 3.2.6 双账本异常与对账页

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 平台运营分别处理外部库存／订单异常和盖世批次／渠道／兑换异常，并执行独立对账。 |
| 场景描述 | 日常巡检或定时任务发现数量差异、状态冲突、交付未确认、兑换未授予权益等问题时，运营定位并恢复。 |
| 输入／前置条件 | 操作人具有平台发行运营权限；异常携带明确 `key_chain`、五级 ID、批次／计划／渠道或订单／兑换关联。 |
| 需求描述 | **图示：**<br>![库存供给异常](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@f25bc4a2427cdc0061d6919c61dc13781166adc6/public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-ops-stock-error.png)<br>*图 3.2.6-1：V1.2 单库存异常图仅用于布局；V1.4 视觉稿须改为双账本筛选与独立差异结果。*<br>**界面文字与布局：** 顶部必须先选择“外部 Key 账本”或“盖世 Key 账本”；指标卡、筛选、异常列表、对账批次和处置动作随账本切换，不提供两账本合计。<br>**详细说明：** 页面统一异常处置入口但不合并数据；任何修复只作用于当前选定账本并追加补偿事实。<br>**展示说明：**<br>1. 外部异常包含导入失败、重复、库存差异、长期预留、交付失败和替换异常；对账维度为批次 Key 数、状态汇总、订单预留和交付记录。<br>2. 盖世异常包含生成失败、计划超额、重复分配、凭据异常、分配待确认、确认超时、兑换与权益不一致；对账维度为计划配额、批次状态、单 Key 状态、渠道交付记录、兑换和权益。<br>3. 所有列表只显示 Key 掩码或哈希标识，不显示明文、Secret、签名、完整供应商报文或用户个人信息。<br>**交互说明：**<br>1. 定时或人工对账生成独立 `reconciliation_id`；失败可重试但使用新 `action_id`，不得用另一账本数据补平差异。<br>2. 外部链可执行导入结果复核、释放符合条件的超时预留、批次阻塞和替换处置；盖世链可执行计划／批次／凭据暂停、交付确认／撤销、幂等补授权益和作废未兑换 Key。<br>3. 每个处置在提交时重新校验状态；失败不产生半修复。高风险处置要求原因，结果记录前后值、操作者和时间。<br>4. 已暴露或已兑换记录禁止直接改回可用；确需业务补偿时新增替换、退款、作废或补授记录，不修改原事实。 |
| 输出／后置条件 | 异常保持生效、进入待人工确认或完成修复；两套对账各自输出差异数和结果，不产生跨账本调整。 |
| 补充说明 | 启停由运营执行并留痕；线下定价／上架结果失效时停止后续动作，但不删除历史订单、分配、兑换或权益。 |

### 3.3 统一操作日志规则

所有尝试均记录成功或失败。固定字段为 `log_id`、`action_id`、`key_chain`、五级业务 ID、批次／计划／渠道／订单／兑换关联 ID、动作、前值、后值、原因、操作者、角色、来源、`result`、`failure_type` 和 `occurred_at`。创建失败且对象未生成时允许目标 ID 为空，但父级 ID 与 `action_id` 必填。

| 动作组 | 必记对象 | 关键结果 | 禁止记录 |
|---|---|---|---|
| 外部入站 | `external_key_batch_id`、来源方式、外部平台、区域、数量、文件哈希 | 校验、重复、部分失败、入账、阻塞、作废 | Key 明文、解密密钥、供应商 Secret、完整报文 |
| 外部履约 | Product／SKU、订单、Key 哈希标识 | 预留、释放、交付、替换及前后状态 | 用户个人信息和完整 Key |
| 盖世计划／批次 | `gamehub_key_program_id`、`gamehub_key_batch_id`、用途、渠道、数量 | 创建、生成、下载、暂停、恢复、过期、作废 | Key 明文和一次性下载地址 |
| 渠道凭据／分配 | `channel_id`、`credential_id`、`request_id` | 创建、轮换、暂停、恢复、撤销、分配、查询、确认 | `client_secret`、签名原文、完整响应 Key |
| 兑换与权益 | 兑换 ID、Key 哈希标识、权益 ID | 兑换、重复兑换、过期／作废拒绝、权益授予／补授 | 用户明文标识和完整 Key |
| 双账本对账 | `reconciliation_id`、`key_chain`、统计快照 | 差异类型、差异数、处置结果 | 将两账本差异互相冲抵 |

## 四、支撑及非功能需求

### 4.1 埋点与数据需求

**数据结论：** 新增。服务端采集外部 Key 入站／履约、盖世计划／批次／渠道、用户兑换／权益和双账本对账事件。任何事件均不得包含 Key 明文、Secret、生产签名、一次性下载地址、供应商完整报文或用户个人信息。

#### 4.1.1 指标口径

| 指标名称 | 口径 | 去重与窗口 | 决策用途 |
|---|---|---|---|
| 外部批次有效入账率 | 成功入账 Key 数 ÷ 本批次提交且完成格式读取的 Key 数 | 按 `external_key_batch_id + Key 哈希` 去重；按批次统计 | 识别来源数据质量，不与盖世批次合并 |
| 外部 Key 交付成功率 | 成功交付的外部订单数 ÷ 已支付且进入外部 Key 履约的订单数 | 按订单去重；自然日 | 判断外部库存与履约稳定性 |
| 盖世渠道分配成功率 | `channel_key_allocate_result` 中成功请求数 ÷ 全部有效分配请求数 | 按 `channel_id + request_id` 去重；自然日 | 判断渠道接入与计划配额质量 |
| 盖世交付确认及时率 | 截止时间内进入“已确认”的交付记录数 ÷ 当日到达确认截止时间的成功分配记录数 | 按 `channel_id + request_id` 去重；自然日；用户先兑换形成的确认计入分子 | 识别渠道响应丢失、未确认和需人工核对的积压 |
| 盖世兑换权益一致率 | 成功兑换且对应权益存在的兑换数 ÷ 成功兑换数 | 按 `redemption_id` 去重；自然日终快照 | 必须为 100%；否则触发高优异常和幂等补授 |
| 双账本差异数 | 外部账本差异条数与盖世账本差异条数分别展示 | 按 `reconciliation_id`；每次对账 | 禁止相加为“总库存差异”或相互冲抵 |

#### 4.1.2 埋点事件

| 事件 | 页面／类型 | 触发与成功 | 参数 |
|---|---|---|---|
| `product_sku_config_result` | B 端平台商品／SKU 总览页／新增 | Product／SKU 创建、编辑或启停提交后；目标版本原子写入记成功 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, event_action, result, failure_type, operator_role, occurred_at` |
| `external_key_batch_ingest_result` | B 端外部 Key 入站供给配置页／新增 | 外部批次受控导入完成后；通过记录原子入账并保存部分失败结果记成功 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, external_key_batch_id, source_type, batch_status, result, failure_type, operator_role, occurred_at` |
| `external_key_reserve_result` | 服务端外部订单履约／新增 | 订单预留或释放提交后；单 Key 与订单关系原子写入记成功 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, external_key_batch_id, key_status, event_action, result, failure_type, operator_role, occurred_at` |
| `external_key_delivery_result` | 服务端外部订单履约／新增 | 外部 Key 安全交付或替换完成后；履约证据写入记成功 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, external_key_batch_id, key_status, event_action, result, failure_type, operator_role, occurred_at` |
| `external_key_reveal_result` | C 端 Key 保险库／复用补充 | 用户主动揭示 Key 后上报；服务端首次成功解密并返回明文记成功，重复查看不重复计首次揭示 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, external_key_batch_id, key_status, event_action, result, failure_type, operator_role, occurred_at` |
| `external_key_exception_state_change` | B 端双账本异常与对账页／新增 | 外部异常发现、阻塞、待确认或恢复时 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, external_key_batch_id, event_action, result, failure_type, operator_role, occurred_at` |
| `gamehub_key_program_create_result` | B 端盖世 Key 计划／批次／渠道 API 页／新增 | 盖世 Key 计划创建或编辑后 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, gamehub_key_program_id, event_action, result, failure_type, operator_role, occurred_at` |
| `gamehub_key_batch_generate_result` | B 端盖世 Key 计划／批次／渠道 API 页／新增 | 批次生成任务结束后；完整批次生成且计划配额提交成功记成功 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, gamehub_key_program_id, gamehub_key_batch_id, channel_id, quantity, batch_status, result, failure_type, operator_role, occurred_at` |
| `gamehub_key_batch_download_result` | B 端盖世 Key 计划／批次／渠道 API 页／新增 | 受控下载／交付请求结束后；完整文件响应完成且批内 Key 原子进入已交付记成功 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, gamehub_key_program_id, gamehub_key_batch_id, channel_id, quantity, key_status, event_action, result, failure_type, operator_role, occurred_at` |
| `gamehub_key_batch_state_change` | B 端盖世 Key 计划／批次／渠道 API 页／新增 | 批次暂停、恢复、过期、耗尽或作废后 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, gamehub_key_program_id, gamehub_key_batch_id, batch_status, event_action, result, failure_type, operator_role, occurred_at` |
| `channel_credential_state_change` | B 端盖世 Key 计划／批次／渠道 API 页／新增 | 渠道凭据创建、轮换、暂停、恢复、撤销或过期后 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, gamehub_key_program_id, channel_id, credential_id, event_action, result, failure_type, operator_role, occurred_at` |
| `channel_key_allocate_result` | 渠道 OpenAPI／新增 | 渠道分配请求完成后；Key、配额和 `request_id` 原子写入且 Key 进入“分配待确认”记成功 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, gamehub_key_program_id, gamehub_key_batch_id, channel_id, credential_id, request_id, allocation_id, key_status, delivery_status, result, failure_type, operator_role, occurred_at` |
| `channel_allocation_query_result` | 渠道 OpenAPI／新增 | 渠道查询或恢复原分配结果后 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, gamehub_key_program_id, gamehub_key_batch_id, channel_id, credential_id, request_id, allocation_id, key_status, delivery_status, result, failure_type, operator_role, occurred_at` |
| `channel_allocation_confirm_result` | 渠道 OpenAPI／兑换服务／新增 | 渠道确认接收、兑换佐证确认、确认超时或人工撤销后 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, gamehub_key_program_id, gamehub_key_batch_id, channel_id, credential_id, request_id, allocation_id, key_status, delivery_status, event_action, result, failure_type, operator_role, occurred_at` |
| `gamehub_key_redeem_result` | C 端兑换服务／新增 | 用户兑换完成后；Key 状态与兑换记录原子写入记成功 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, gamehub_key_program_id, gamehub_key_batch_id, channel_id, redemption_id, key_status, result, failure_type, operator_role, occurred_at` |
| `gamehub_entitlement_grant_result` | 服务端权益服务／新增 | 权益授予或幂等补授结束后 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, redemption_id, entitlement_id, event_action, result, failure_type, operator_role, occurred_at` |
| `dual_ledger_reconciliation_result` | B 端双账本异常与对账页／新增 | 单一账本对账完成后；差异快照保存记成功 | `event_id, action_id, vendor_id, game_id, app_id, product_id, sku_id, key_chain, reconciliation_id, event_action, result, failure_type, operator_role, occurred_at` |

#### 4.1.3 参数说明

| 参数 | 类型／必填 | 说明 | 枚举／示例 |
|---|---|---|---|
| `event_id` | string／是 | 事件唯一标识；数据层按此字段去重 | `evt_20260902_00001` |
| `action_id` | string／是 | 一次动作去重标识 | `act_20260902_00001` |
| `vendor_id` | string／是 | 厂商唯一标识 | `vendor_10001` |
| `game_id` | string／是 | Game 唯一标识 | `game_40001` |
| `app_id` | string／是 | 新发行平台 APPID | `app_50001` |
| `product_id` | string／条件必填 | Product 唯一标识；创建失败且尚未生成时可空 | `product_60001` |
| `sku_id` | string／条件必填 | SKU 唯一标识；Product 首次创建且尚无 SKU 时可空 | `sku_70001` |
| `key_chain` | enum／是 | Key 账本 | `external`＝外部 Key 入站；`gamehub`＝盖世 Key 出站 |
| `external_key_batch_id` | string／条件必填 | 外部链批次标识 | `ext_batch_80001` |
| `gamehub_key_program_id` | string／条件必填 | 盖世 Key 计划标识 | `gh_program_90001` |
| `gamehub_key_batch_id` | string／条件必填 | 盖世 Key 批次标识；生成失败且未分配时可空 | `gh_batch_91001` |
| `channel_id` | string／条件必填 | 渠道标识；线下无指定渠道批次可使用平台约定值 | `channel_10001` |
| `credential_id` | string／条件必填 | 渠道凭据标识；创建失败且未生成时可空 | `credential_11001` |
| `request_id` | string／条件必填 | 渠道分配、查询与确认的业务幂等标识 | `req_partner_order_001` |
| `allocation_id` | string／条件必填 | 首次成功分配生成的唯一记录；分配失败且未生成时可空 | `allocation_11501` |
| `redemption_id` | string／条件必填 | 用户兑换唯一标识 | `redeem_12001` |
| `entitlement_id` | string／条件必填 | 盖世权益唯一标识；授予失败且未生成时可空 | `entitlement_13001` |
| `reconciliation_id` | string／条件必填 | 单一账本对账批次标识 | `recon_14001` |
| `source_type` | enum／条件必填 | 一期外部 Key 入站方式 | `controlled_batch_import`＝受控批量导入 |
| `quantity` | int／条件必填 | 批次生成或受控下载包含的 Key 数量，须大于 0 | `1000` |
| `key_status` | enum／条件必填 | 对应账本的动作后单 Key 状态 | 外部：`available`＝可用；`reserved`＝预留；`delivered`＝已交付；`revealed`＝已揭示；`voided`＝作废；`replaced`＝替换。盖世：`available`＝可用；`allocation_pending_confirmation`＝分配待确认；`delivered`＝已交付；`redeemed`＝已兑换；`expired`＝已过期；`voided`＝已作废 |
| `delivery_status` | enum／条件必填 | 渠道交付记录状态；渠道 API 事件必填 | `pending_confirmation`＝分配待确认；`confirmed`＝已确认；`confirmation_timed_out`＝确认超时；`revoked`＝已撤销；`failed`＝失败 |
| `batch_status` | enum／条件必填 | 对应账本批次状态 | 外部：`validating`＝校验中；`partial_failed`＝部分失败；`available`＝可用；`blocked`＝已阻塞；`closed`＝已关闭。盖世：`draft`＝草稿；`generating`＝生成中；`failed`＝生成失败；`available`＝可用；`paused`＝已暂停；`exhausted`＝已耗尽；`expired`＝已过期；`voided`＝已作废 |
| `event_action` | enum／条件必填 | 当前事件动作 | `create`＝创建；`edit`＝编辑；`enable`＝启用；`disable`＝停用；`import`＝导入；`generate`＝生成；`reserve`＝预留；`release`＝释放；`deliver`＝交付；`replace`＝替换；`download`＝下载；`pause`＝暂停；`resume`＝恢复；`rotate`＝轮换；`revoke`＝撤销；`exhaust`＝耗尽；`expire`＝过期；`void`＝作废；`query`＝查询；`confirm`＝确认；`timeout`＝确认超时；`redeem`＝兑换；`grant`＝授予权益；`reconcile`＝对账 |
| `result` | enum／是 | 技术处理结果 | `success`＝目标状态完整写入；`failure`＝目标状态未写入 |
| `failure_type` | enum／是 | 失败分类；成功传 `none` | `none`＝无失败；`permission_denied`＝无权限；`validation_failed`＝校验失败；`state_conflict`＝状态冲突；`duplicate_key`＝Key 重复；`scope_mismatch`＝授权范围不匹配；`quota_insufficient`＝配额不足；`key_unavailable`＝无可用 Key；`credential_invalid`＝凭据无效；`signature_invalid`＝签名无效；`replay_rejected`＝防重放拒绝；`idempotency_conflict`＝幂等内容冲突；`rate_limited`＝限流；`redemption_conflict`＝兑换幂等冲突；`service_error`＝服务异常 |
| `operator_role` | enum／是 | 操作来源角色 | `developer`＝发行方开发者；`platform_ops`＝平台发行运营；`channel`＝第三方渠道；`user`＝兑换用户；`system`＝系统任务 |
| `occurred_at` | datetime／是 | 业务动作取得当前结果的服务端时间；使用带时区 ISO 8601 | `2026-09-02T12:00:00+08:00` |

### 4.2 技术需求

| 需求项 | 具体要求 |
|---|---|
| 平台隔离 | 使用 01 定义的独立域名、独立开发者账号和独立数据库；每次请求校验五级 ID，渠道请求再校验计划、渠道和凭据。 |
| 安全 | Key 原文与 `client_secret` 使用 KMS 封套加密存储，传输全程加密；Secret 只在创建／轮换时展示一次。明文、Secret、签名和临时下载地址不得进入普通日志、埋点、Fixture、截图或常规导出。 |
| 一致性 | 外部预留／交付、盖世计划扣减／分配、兑换／权益分别使用原子事务或可验证的事务发件箱（Transactional Outbox）；失败不产生半库存、半分配或“已兑换无权益”。 |
| 幂等 | 导入按外部批次号／文件哈希幂等；渠道分配按 `channel_id + request_id` 幂等；兑换按 Key 哈希与 `redemption_id` 幂等；冲突内容拒绝。 |
| 数据存储 | 两账本物理或逻辑强隔离，表和状态枚举不可混用；所有历史以追加事实和状态变更记录保存，禁止直接覆盖已交付／已兑换事实。 |
| 可观测性 | 对外部批次导入、盖世批次生成、下载、渠道分配／查询／确认、兑换、权益授予和对账建立成功率、延迟与差异告警；告警只携带脱敏标识。 |

### 4.3 运营需求

| 需求项 | 具体要求 |
|---|---|
| 商品配置 | 平台运营维护 Product／SKU 与 Key 链类型，消费线下确认的定价、授权和上架结果；不在后台进行在线商务审批。 |
| 外部供给 | 一期由运营执行受控批量导入，处理重复、部分失败、预留和交付异常；不得查看或导出普通页面中的完整 Key。供应商 API 需按具体合作方另行确认后增补。 |
| 盖世供给 | 运营开通计划范围、总配额、渠道、区域、有效期与启停；发行方在范围内自助建批次和凭据，运营不代替逐批发码。 |
| 对账处置 | 外部账本与盖世账本分别定时对账；差异处置须有 owner、原因、结果和完成时间，不允许跨账本补平。 |

### 4.4 财务、法务、版权与合规需求

| 需求项 | 具体要求 |
|---|---|
| 财务 | 正式启用前读取线下确认的定价／领取条件、分成和结算责任；本文不建设在线价格审批、自动结算、税务、发票、复杂分账或提款。 |
| 法务 | 发行授权须覆盖 Game、SKU、Key 类型、区域、渠道和有效期。授权失效后停止新增入库／生成／分配／销售，历史已交付和已兑换事实保留。 |
| 版权 | 外部平台 Key 必须由有权主体提供；盖世 Key 只授予已获授权的盖世直接发行权益。平台资料校验不替代发行方责任。 |
| 合规 | Key、凭据、合同结果和用户兑换记录按最小权限处理；导出与一次性交付需可追溯。数据保留与删除周期由法务和安全确认。 |

## 五、待确认项

| 待确认问题 | 推荐方案 | 未确认的影响 | 是否阻塞 |
|---|---|---|---|
| 后续是否接入外部供应商 API | 一期先用受控批量导入；只有具体供应商、商品映射、取码方式和 SLA 确认后才增补 API | 不影响一期受控导入；仅影响对应供应商自动补货 | 不阻塞一期 |
| 受控批量导入的文件格式、加密通道和责任人 | 使用模板化加密文件、受控对象存储／安全传输、文件哈希、一次性接收权限和双人复核 | 影响格式校验、部分失败回执和安全验收 | 阻塞批量导入上线 |
| 盖世 Key 长度、字符集、碰撞空间、加密和一次性下载窗口 | 由兑换服务与安全评审冻结；下载窗口短时有效，成功后立即关闭 | 影响生成、兑换、安全测试和客服识别 | 阻塞盖世 Key 上线 |
| 渠道 API 正式域名、凭据轮换周期及安全默认值复核 | 以本文 HMAC-SHA256、前后 300 秒、Nonce 10 分钟、幂等 7 天、Key 恢复 24 小时、60 次／分钟为联调默认值；安全评审只能在外部联调前形成单一替换版本 | 不影响按当前契约开发；影响正式渠道联调文档和安全验收 | 阻塞外部联调，不阻塞内部开发 |
| 线下定价／上架结果的来源字段和有效期 | 复用 01 的结果来源、线下完成时间、录入时间和有效状态，商品页只读消费 | 影响商品启用门禁与历史追溯 | 阻塞商品启用，不阻塞供给开发 |
| V1.2 流程图与页面图何时替换为双链 V1.4 | 按本文 6 页统一重画双 Tab、两账本、盖世计划／渠道和独立对账 | 现有图片会误导研发继续实现单库存链 | 阻塞视觉验收，不阻塞文字评审 |

## 六、附录

### 6.1 参考文档

| 文档名称 | 文档链接／位置 | 说明 |
|---|---|---|
| 开发者平台、厂商与游戏资料需求 | `prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md` | 独立账号、Game→APPID、三系统、线下结果与五级对象上游 |
| PC 发行平台功能清单（交付版） | `prd/发行平台专项/PC 发行平台功能清单（交付版）.md` | 发行平台模块范围与一期交付边界 |
| CDKEY 售卖需求评审记录 | `prd/需求评审/APP/cdkey.md` | 既有购买、支付、外部 Key 履约与退款边界 |
| Steamworks Steam Keys | https://partner.steamgames.com/doc/features/keys?l=schinese | 批次申请、获取、查询、标记和禁用的生命周期参考 |
| WeGame 开发接入概览 | https://developer.wegame.com/developer/game-wiki/help/doc/getting-started-overview/zh_CN | 借鉴 Game／APPID 上下文内的开发接入与能力导航，不直接复制开放生态范围 |
| WeGame 开发者平台 | https://developer.wegame.com/ | 游戏、开发接入、商品与发行能力的信息架构参考 |
| WeGame CDKey 申请 | https://developer.wegame.com/developer/game-wiki/help/doc/discounts-and-free-weekend-cdkey/zh_CN | 数量、过期时间、激活时长、备注和申请记录参考；属于营销 Key，不等同商品供给 |
| WeGame 运营数据中心 | https://developer.wegame.com/developer/game-wiki/help/doc/operation-data-center-overview/zh_CN | 采购 Key 后按渠道／批次统计的公开模型；官方说明当时尚无实际游戏，不能作为成熟案例证据 |

# 【PRD】PC发行平台—游戏创建、资料、包体与发行审核

## 修订记录

| 修订日期 | 修订内容 | 版本 | 修订人 |
|---|---|---|---|
| 2026/9/1 | 建立包体上传、测试与发布审核方案 | V1.0 | 郑群超 |
| 2026/9/7 | 增加双区域资质、提交校验与撤销审核 | V1.5 | 郑群超 |
| 2026/9/8 | 增加包体测试门禁、审核记录与投放兴趣 | V1.8 | 郑群超 |
| 2026/9/8 | 合并游戏管理至完整发行链路；统一采用 02 开发者端和 09 审核后台 Demo | V1.9 | 郑群超 |

**备注：** 搜2026.9.8修改

## 一、文档概述

### 1.1 背景概述

- **需求背景：** 开发者完成企业认证后，需要从创建游戏走到发布审核结果。
- **当前方式：** 游戏管理、资料、包体和审核分散在多份方案中，页面入口、状态及截图口径不一致。
- **问题：** 开发者无法按一条主线完成发布，运营也可能在包体未完成测试时通过审核。
- **证据：** 9 月 1 日游戏平台进度会结论，以及开发者端 02 Demo、运营审核 09 Demo 的多轮评审。

### 1.2 需求边界

| 边界类型 | 范围说明 |
|---|---|
| 产品边界 | 涉及开发者端游戏管理、添加游戏、版本发布、发布记录、资质认证；涉及运营端游戏发布审核、资质认证审核、包体测试和审核记录。不涉及厂商管理、玩家商城、支付和退款。 |
| 业务边界 | 覆盖游戏创建、资料准备、PC 整包／增量包、商品与 SKU、发行设置、资质、提审、测试和审核结果。不含 CDKEY 供给、真实上线、下架、恢复及回滚执行。 |
| 运营边界 | 测试人员提交包体测试结论；发行运营处理发布审核；资质审核员处理游戏资质。本 PRD 不定义企业资质认证审核字段和动作。 |
| 人力边界 | 产品和设计维护页面口径；前后端实现提审与状态回写；测试人员执行包体测试；运营和资质审核员给出结论；法务确认国内发行材料。 |

### 1.3 术语定义

| 术语／缩写 | 英文全称（按需） | 定义与判断口径 |
|---|---|---|
| Game ID／APPID | Game ID／Application ID | 创建游戏后生成的唯一游戏标识和接入标识。 |
| 当前修订 | Current revision | 一次发布提审冻结的只读内容，包含资料、包体、SKU、发行设置和资质引用。 |
| 必测包体 | Required build | 当前修订新增或替换，且被本次发布引用的包体。 |
| 解析通过 | Parse passed | 文件结构、完整性和启动项校验通过，不代表游戏可运行。 |
| 包体测试结论 | Package test result | 测试人员对当前修订全部必测包给出的整次结论。 |
| 审核状态 | Review status | 草稿、审核中、需补资料、未通过、已撤销、已通过。 |
| 发行状态 | Release status | 未上线、已上线、已下架；与审核状态分开。 |

## 二、产品说明

### 2.1 产品／方案简介

| 项目 | 说明 |
|---|---|
| 产品／方案定位 | 将游戏创建、版本准备、资质和发布审核合为一条开发者发行链路，并以包体测试作为审核门禁。 |
| 目标用户 | 游戏开发者、平台测试人员、发行运营、资质审核员。 |
| 核心目标 | 开发者可完成发布；未测试或测试失败的包体不能通过发布审核；全过程可追溯。 |
| 使用场景 | 首次创建游戏、版本更新、资质提审、补传包体、发布提审和审核回溯。 |
| 功能概述 | 开发者提交不可变版本快照；测试人员完成包体测试；运营核对资料、SKU、发行设置和资质后通过或退回。 |

### 2.2 产品流程

![发行流程](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-release-flow.png)

## 三、功能需求

### 3.1 C 端功能需求

#### 3.1.1 游戏管理

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 查看和进入当前主体的游戏。 |
| 场景描述 | 已通过企业认证的开发者继续管理游戏或添加新游戏。 |
| 输入／前置条件 | 已登录且企业认证有效。 |
| 需求描述 | **图示（1张）：**<br>![游戏管理](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-dev-game-management.png)<br>*图 3.1.1-1：游戏管理。*<br>**详细说明：**<br>**展示说明：**<br>1. 页面顶部只显示“游戏管理”和“添加游戏”；游戏卡片两列排列，单个游戏占半行。<br>2. 卡片展示游戏名、Game ID、平台、审核状态、发行状态和更新时间；正常状态不显示企业认证提示。<br>3. 企业认证被禁用时，列表上方显示一行异常提示，并引导邮件联系 dev@xiaoji.com。<br>**交互说明：**<br>1. 点击卡片任意非操作区进入游戏详情；不设置“详情”按钮。<br>2. “···”提供删除；只有无审核、订单和发行记录的草稿游戏可删，确认删除前须二次确认。<br>3. 点击“添加游戏”进入创建页；列表加载失败时保留页面框架并提供重试。 |
| 输出／后置条件 | 进入所选游戏的版本发布页，或进入添加游戏页。 |
| 补充说明 | 删除失败时不移除卡片，按钮恢复可点并显示失败原因。 |

#### 3.1.2 添加游戏

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 创建游戏后台项目。 |
| 场景描述 | 开发者首次在平台发行一款游戏。 |
| 输入／前置条件 | 企业认证有效且有创建权限。 |
| 需求描述 | **图示（1张）：**<br>![添加游戏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-dev-create-game.png)<br>*图 3.1.2-1：添加游戏。*<br>**详细说明：**<br>**展示说明：**<br>1. 字段为后台项目名称（英文）、游戏类型、当前主体跟该游戏的关系、发布平台、当前发布计划。<br>2. 游戏类型必填且支持多选；主体关系必填，可选开发商、发行商、开发商和发行商。仅选发行商时显示选填的开发商名称。<br>3. 发布平台至少选择一项，可选 Windows、macOS、Linux，默认 Windows。当前发布计划单选“先开放预约、先开放测试、准备上线”。<br>**交互说明：**<br>1. 点击“创建游戏”校验全部必填项；失败时原位提示并定位首个字段，已填内容保留。<br>2. 请求期间按钮禁用，重复点击只提交一次；失败后恢复可点。<br>3. 创建成功生成 Game ID、APPID 和首个版本草稿，直接进入版本发布；不返回列表，不显示成功弹窗。 |
| 输出／后置条件 | 新增游戏及首个版本草稿，进入该游戏的版本发布页。 |
| 补充说明 | 游戏名称（英文）用于后台识别；商店多语言名称在游戏资料中维护。 |

#### 3.1.3 版本发布

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 在一个长页完成游戏资料、PC 包体、商品与 SKU、发行设置和资质准备。 |
| 场景描述 | 开发者首次发布、更新版本或按审核意见补资料后重提。 |
| 输入／前置条件 | 已进入有编辑权限的游戏；当前申请未处于审核中。 |
| 需求描述 | **图示（3张）：**<br>![版本发布](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-dev-version-release.png)<br>*图 3.1.3-1：版本发布长页。*<br><br>![PC包体与商品](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-dev-builds-and-sku.png)<br>*图 3.1.3-2：PC 包体、商品与 SKU。*<br><br>![发行设置与资质](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-dev-release-and-qualification.png)<br>*图 3.1.3-3：发行设置与资质。*<br>**详细说明：**<br>**展示说明：**<br>1. 单游戏一级导航只有“版本发布、发布记录、资质认证”。版本发布内五项仅作页内定位，点击后滚动至对应模块。<br>2. 游戏资料包含商店资料语言、游戏名称、短介绍、完整介绍、分类标签、开发商／发行商、官网、玩家群、图标、封面和截图；文本与素材按商店资料语言保存，默认语言必填。<br>3. 商品与 SKU 包含商品名称、免费／买断、售价、币种、折扣和关联 PC 包体；支持基础游戏与 DLC。每个可售 SKU 必须关联有效包体，CDKEY 不在本 PRD。<br>4. 发行设置包含中国大陆／全球服、国家和地区、发行状态、生效时间、目标用户游戏兴趣。全球服可选香港、澳门及其他国家和地区；兴趣至少选一项，可多选。说明文案为“用于精准分发，匹配近期体验或下载过相似游戏的用户。”<br>5. 五个定位项显示本模块缺失数，数量为 0 时隐藏；合计与“还差 N 项”一致。页面只保留一组“保存草稿／提交上架审核”。<br>**交互说明：**<br>1. 点击定位项只滚动当前长页；随滚动同步高亮，不切换页面。<br>2. 点击“提交上架审核”校验全页；失败时展开可处理缺失项，切换定位项，滚动并聚焦首个错误。PC 包体错误定位“从本地上传”。<br>3. 编辑、上传或删除后实时重算缺失数；内部校验项不展示名称，但仍计入对应模块并阻断提交。<br>4. 校验通过后生成唯一提交编号及不可变快照，页面改为只读并仅显示“撤销审核”。撤销须二次确认；确认后恢复编辑，取消不改变状态。 |
| 输出／后置条件 | 保存更新草稿；提审生成 submissionId、revisionId 和只读提交快照，进入运营审核队列。 |
| 补充说明 | 目标用户游戏兴趣本期不配置权重、不展示预估人群、不承诺流量。提交失败时保留全部输入并恢复按钮。 |

#### 3.1.4 PC 包体上传

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 上传整包或增量包，查看解析和测试状态。 |
| 场景描述 | 开发者为首次发布或版本更新准备 PC 包体。 |
| 输入／前置条件 | 当前版本可编辑。 |
| 需求描述 | **图示（2张）：**<br>![PC包体](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-dev-builds.png)<br>*图 3.1.4-1：包体列表。*<br><br>![上传包体](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-dev-build-upload.png)<br>*图 3.1.4-2：本地上传。*<br>**详细说明：**<br>**展示说明：**<br>1. 页面提供“从包体库选择”和“从本地上传”。包体库入口本期只作占位。<br>2. 上传字段为平台、上传类型、包体文件、启动项、版本号、更新日志；平台支持 Windows、macOS、Linux，上传类型支持游戏整包、增量上传。<br>3. 增量上传增加“基础整包”，只列同平台且解析通过的整包；无可用整包时不可保存。<br>4. 包体列表分开显示解析状态和测试状态。提交前显示“未进入测试”，提交后显示待测试、测试中、测试通过或测试不通过。<br>**交互说明：**<br>1. 点击“从本地上传”打开上传弹窗，再在“包体文件”中选择本地文件；保存前校验必填项，失败时定位字段并保留输入。更新日志最多 500 字，不提供“游戏启动参数”。<br>2. 上传中显示进度，支持断点续传；中断后可继续，失败项可重试，取消未完成上传不生成包体。<br>3. 上传完成后进入完整性和结构解析；解析失败显示原因并允许重传，解析通过后可关联 SKU。<br>4. 点击“从包体库选择”只提示“包体库选择流程后续补充”，不打开新页面。 |
| 输出／后置条件 | 生成包体记录；解析通过后可被当前发布引用，提审后进入包体测试队列。 |
| 补充说明 | 解析通过不等于测试通过。测试不通过显示原因和附件；补传后生成新包体和新修订，旧记录只读。 |

#### 3.1.5 资质认证

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 独立管理中国大陆与全球发行资质。 |
| 场景描述 | 开发者先提审资质、随版本提审，或发布后变更资质。 |
| 输入／前置条件 | 已创建游戏；单独资质提审不要求同时提交版本。 |
| 需求描述 | **图示（2张）：**<br>![版本内资质](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-dev-release-qualification.png)<br>*图 3.1.5-1：版本发布内资质。*<br><br>![独立资质认证](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-dev-independent-qualification.png)<br>*图 3.1.5-2：独立资质认证。*<br>**详细说明：**<br>**展示说明：**<br>1. 中国大陆与全球（不含中国大陆）分别显示状态、附件数、申请编号和操作；香港、澳门归全球区域。<br>2. 中国大陆填写游戏版号并上传审批、权属或授权材料。软件著作权可作辅助证明，不替代版号。<br>3. 全球资质以权属或发行授权附件为主，支持多份附件；软件著作权不是统一必填项。<br>4. 列表区分初次认证和资质变更。两个区域独立出结果，不互相锁定。<br>**交互说明：**<br>1. 单独提审生成独立资质申请；审核中的区域只读，另一地区仍可编辑。<br>2. 版本提审已有有效资质时引用其快照；没有有效资质时，开发者须在版本发布的资质模块补齐材料。提交上架审核时，同一请求创建发布申请和关联资质申请；任一创建失败则整体失败。<br>3. 发布后修改生成“资质变更”申请；审核期间旧有效资质继续生效，新资质通过后替换。<br>4. 撤销审核须二次确认；确认后恢复编辑，取消不改变状态。 |
| 输出／后置条件 | 审核通过生成生效资质版本；发布申请引用提交时的资质快照。 |
| 补充说明 | 驳回、需补资料或撤销均不替换旧有效资质，也不改变历史发布快照。 |

#### 3.1.6 发布记录

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 查询发布申请、结果和只读提交快照。 |
| 场景描述 | 开发者查看进度、失败原因或历史版本。 |
| 输入／前置条件 | 当前游戏至少提交过一次发布审核。 |
| 需求描述 | **图示（2张）：**<br>![发布记录](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-dev-version-records.png)<br>*图 3.1.6-1：发布记录。*<br><br>![提交快照](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-dev-version-snapshot.png)<br>*图 3.1.6-2：只读提交快照。*<br>**详细说明：**<br>**展示说明：**<br>1. 列表每页 20 条，分列展示审核状态和发行状态。审核通过显示“审核通过／未上线”，不能显示“已上线”。<br>2. 快照展示游戏资料、PC 包体、商品与 SKU、发行设置、兴趣标签、资质引用、测试结果、审核意见、操作人和时间。<br>3. 每次重提生成新记录，旧快照不被当前草稿或新结果覆盖。<br>4. 国内发行审核结果通过盖世游戏短信通知；海外发行通过邮件通知。通过只通知审核通过，失败或需补资料引导登录开发者中心查看原因。<br>**交互说明：**<br>1. 点击记录打开只读快照；返回后保留页码和滚动位置。<br>2. 审核中、已撤销、已取消不发结果通知，只在页面展示。<br>3. 加载失败保留筛选和页码，点击重试后重新查询。 |
| 输出／后置条件 | 开发者可追溯每次提交、包体测试和审核结果。 |
| 补充说明 | 通知失败不回滚审核结果；服务端记录失败并按通知策略重试。 |

### 3.2 B 端功能需求

#### 3.2.1 审核管理

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 查询国内或海外的审核申请。 |
| 场景描述 | 运营和测试人员定位申请并进入详情。 |
| 输入／前置条件 | 已登录运营后台，且拥有对应审核类型和发行区域权限。 |
| 需求描述 | **图示（1张）：**<br>![发布审核列表](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-admin-release-list.png)<br>*图 3.2.1-1：游戏发布审核。*<br>**详细说明：**<br>**展示说明：**<br>1. 左侧只保留“审核管理、审核记录”。审核管理平铺“企业认证审核、游戏发布审核、资质认证审核”三个 Tab；本 PRD 不定义企业认证审核详情。<br>2. 每个 Tab 标题后直接显示“待审核量 N”，不使用参数卡片。右上通过“发行区域”下拉切换国内发行和海外发行；中国大陆归国内，香港、澳门归海外。<br>3. 筛选包含关键词、审核状态、提交时间；时间支持昨日、今日、近 7 天、近 30 天和自定义。<br>4. 列表显示申请编号、申请方、版本或类型、发行范围、提交时间、最后操作时间、最后操作人、审核状态、发行状态和操作；每页 20 条。<br>**交互说明：**<br>1. 切换审核类型、发行区域或筛选条件后回到第 1 页并重新查询。<br>2. 点击详情从右侧打开半屏抽屉；关闭后保留筛选和页码。<br>3. 页面不设“领取”或“开始审核”。刷新失败保留原列表和筛选，并显示重试入口。 |
| 输出／后置条件 | 打开所选申请详情；审核结果回写开发者端对应记录。 |
| 补充说明 | 越权时不返回申请数据；空结果显示“没有匹配的申请”。 |

#### 3.2.2 发布审核详情

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 查看提交快照、完成包体测试并给出发布审核结论。 |
| 场景描述 | 测试人员验证包体，发行运营核对本次发布。 |
| 输入／前置条件 | 申请为待审核、审核中或需补资料，且当前用户有对应权限。 |
| 需求描述 | **图示（3张）：**<br>![审核详情](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-admin-release-drawer.png)<br>*图 3.2.2-1：右侧半屏审核详情。*<br><br>![待确认测试结论](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-admin-package-ready.png)<br>*图 3.2.2-2：全部必测包通过，等待提交整次结论。*<br><br>![发布审核解锁](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-admin-package-passed.png)<br>*图 3.2.2-3：包体测试通过后解锁发布审核。*<br>**详细说明：**<br>**展示说明：**<br>1. 抽屉头部和底部固定，正文独立滚动；正文展示提交快照、PC 包体测试和本申请审核记录。<br>2. 单包状态为待测试、测试中、测试通过、测试不通过；整次结论为待确认、通过、失效。旧修订标记“不参与门禁”。<br>3. 各包体卡片内显示“开始测试／标记通过／标记不通过”；门禁区依次显示未完成包体、等待提交整次结论、可进行上架审核。<br>4. 底部只承载整次“包体测试通过”、要求补资料、拒绝申请或“上架审核通过”。<br>**交互说明：**<br>1. 测试人员在包体卡片点击“开始测试”后可标记单包通过或不通过；不通过须填写原因，可上传多份测试附件。<br>2. 当前修订全部必测包解析成功且单包通过后，底部“包体测试通过”启用；点击后二次确认并生成绑定当前 revisionId 的整次结论。<br>3. 整次结论通过后，发行运营才能点击“上架审核通过”；服务端再次校验包体、资料、SKU、发行设置和有效资质，不满足时不改变状态。<br>4. 要求补资料或拒绝须填写原因；补资料可由运营取消，取消须二次确认并记录原因。<br>5. 审核通过只进入发布执行模块，不直接改变发行状态。 |
| 输出／后置条件 | 测试和审核记录写入；通过申请进入发布执行模块，退回申请回到开发者端修改。 |
| 补充说明 | 新增、替换包体或生成新修订后，旧整次测试结论失效。并发操作以首个成功终态为准，其他请求返回最新状态。 |

#### 3.2.3 资质认证审核

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 审核初次资质或资质变更。 |
| 场景描述 | 资质审核员处理单独提审、随版本提审或发布后变更。 |
| 输入／前置条件 | 拥有对应发行区域的资质审核权限。 |
| 需求描述 | **图示（2张）：**<br>![资质审核列表](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-admin-qualification-list.png)<br>*图 3.2.3-1：资质认证审核列表。*<br><br>![资质审核详情](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-admin-qualification-drawer.png)<br>*图 3.2.3-2：资质认证审核详情。*<br>**详细说明：**<br>**展示说明：**<br>1. 列表标明初次认证／资质变更、国内／海外、提交时间、最后操作人和审核状态。<br>2. 详情展示本次附件、适用区域、历史有效资质、版本发布引用关系和操作记录。<br>3. 发布审核详情同步展示引用资质快照和当前资质状态；无有效资质时“上架审核通过”禁用。<br>**交互说明：**<br>1. 审核员可通过、拒绝或要求补资料；拒绝和补资料须填写原因，补资料可人工取消并二次确认。<br>2. 资质通过后自动重算关联发布申请门禁；资质变更通过后替换旧生效版本。<br>3. 申请已被撤销或被他人处理时，当前操作失败并刷新最新状态。 |
| 输出／后置条件 | 生成资质审核结果并回写开发者端；通过后更新生效资质版本。 |
| 补充说明 | 拒绝、需补资料或撤销不替换旧有效资质；审核记录不可删除。 |

#### 3.2.4 审核记录

| 要素 | 内容说明 |
|---|---|
| 功能简介 | 查询企业认证、游戏发布和资质认证的每次审核操作。 |
| 场景描述 | 运营、测试或管理人员回溯申请。 |
| 输入／前置条件 | 已登录并具有对应数据权限。 |
| 需求描述 | **图示（1张）：**<br>![审核记录](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@e3d8d021daf2851bdaaf37d2039a5be4ecf49675/public/prd/genuine-game-distribution-phase1/developer-backend-final/03/03-v19-admin-audit-records.png)<br>*图 3.2.4-1：统一审核记录。*<br>**详细说明：**<br>**展示说明：**<br>1. 筛选项为关键词、审核类型、发行区域、操作人、审核时间；时间支持昨日、今日、近 7 天、近 30 天和自定义。<br>2. 列表展示审核类型、申请对象与编号、动作、结果或状态变化、操作人、审核时间和操作；每页 20 条。<br>3. 记录范围包括企业认证、游戏发布、资质认证、单包测试、整次测试、补资料、取消补资料、拒绝、撤销和审核通过。<br>**交互说明：**<br>1. 组合筛选后回到第 1 页；重置清空条件并重新查询。<br>2. 点击记录打开对应申请详情；关闭后保留筛选。<br>3. 加载失败保留当前结果并显示重试入口。 |
| 输出／后置条件 | 用户可定位每一步的申请、动作、结果、操作人和时间。 |
| 补充说明 | 记录只读，不可编辑、覆盖或删除；业务操作失败不写成功记录。 |

## 四、支撑及非功能需求

### 4.1 埋点与数据需求

**数据结论：** 新增

#### 4.1.1 埋点事件

| 事件 | 页面／类型 | 触发与成功 | 参数 |
|---|---|---|---|
| publisher_game_create_result | C 端／添加游戏 | 创建请求返回时上报；result=success 表示 Game ID 和 APPID 已生成 | event_time, user_id, session_id, game_id, page_name, platforms, result, failure_code |
| publisher_release_page_view | C 端／版本发布 | 页面数据加载完成后上报一次 | event_time, user_id, session_id, game_id, page_name, revision_id |
| publisher_build_upload_result | C 端／PC 包体 | 单个包体上传任务结束时上报；以服务端任务结果为准 | event_time, user_id, session_id, game_id, page_name, revision_id, build_platform, build_type, result, failure_code |
| publisher_release_submit_result | C 端／版本发布 | 发布提审请求返回时上报；success 表示发布申请及关联资质申请均已创建 | event_time, user_id, session_id, game_id, page_name, submission_id, revision_id, release_region, target_user_interests, result, failure_code |
| publisher_review_withdraw_result | C 端／版本发布或资质认证 | 用户确认撤销且请求返回时上报 | event_time, user_id, session_id, game_id, page_name, submission_id, review_type, result, failure_code |
| publisher_qualification_submit_result | C 端／资质认证 | 独立资质提审请求返回时上报 | event_time, user_id, session_id, game_id, page_name, qualification_submission_id, release_region, qualification_type, result, failure_code |
| publisher_release_record_view | C 端／发布记录 | 提交快照加载完成后上报 | event_time, user_id, session_id, game_id, page_name, submission_id, review_status, release_status |
| admin_build_test_result | B 端／发布审核详情 | 单包结果或整次测试结论提交完成后上报 | event_time, user_id, session_id, game_id, page_name, submission_id, revision_id, build_platform, action_type, result, failure_code |
| admin_review_result | B 端／发布或资质审核 | 通过、拒绝、要求补资料或取消补资料完成后上报 | event_time, user_id, session_id, game_id, page_name, submission_id, review_type, release_region, action_type, result, failure_code |
| admin_audit_record_view | B 端／审核记录 | 审核记录列表加载完成后上报一次 | event_time, user_id, session_id, game_id, page_name, review_type, release_region |

#### 4.1.2 参数说明

| 参数 | 类型／必填 | 说明 | 枚举／示例 |
|---|---|---|---|
| event_time | datetime／是 | 事件时间，ISO 8601 | 2026-09-08T15:30:00+08:00 |
| user_id | string／是 | 当前账号 ID | U-1024 |
| session_id | string／是 | 当前登录会话 ID | S-20260908-01 |
| game_id | string／否 | 游戏 ID；创建失败时可为空 | GAME-48290 |
| page_name | string／是 | 页面标识 | game_create, version_release, qualification, release_record, release_review, audit_record |
| platforms | array<string>／否 | 创建时选择的平台 | windows, macos, linux |
| submission_id | string／否 | 发布或审核申请编号 | REL-D-20260908-01 |
| qualification_submission_id | string／否 | 资质申请编号 | QUAL-G-20260908-01 |
| revision_id | string／否 | 当前提交修订 ID | REV-01 |
| release_region | string／否 | 发行区域 | mainland＝中国大陆；global＝全球（不含中国大陆） |
| target_user_interests | array<string>／否 | 提交时选择的游戏兴趣编码 | role_playing, action, strategy, simulation, casual, shooter, sports_racing, adventure_puzzle |
| build_platform | string／否 | 包体平台 | windows, macos, linux |
| build_type | string／否 | 包体类型 | full＝整包；incremental＝增量包 |
| review_type | string／否 | 审核类型 | release＝游戏发布；qualification＝资质认证 |
| qualification_type | string／否 | 资质提交类型 | initial＝初次；change＝变更；with_release＝随版本提交 |
| review_status | string／否 | 审核状态 | draft, reviewing, changes_required, rejected, withdrawn, approved |
| release_status | string／否 | 发行状态 | offline, online, delisted |
| action_type | string／否 | 本次操作 | start_test, build_pass, build_fail, revision_pass, approve, reject, request_changes, cancel_changes |
| result | string／是 | 请求或业务处理结果 | success, fail |
| failure_code | string／否 | 失败码；result=fail 时必填，不上传自由文本原因 | validation_failed, network_error, permission_denied, state_conflict, server_error |

### 4.2 技术需求

| 需求项 | 具体要求 |
|---|---|
| 权限 | 开发者仅访问本主体游戏；测试、发行运营和资质审核员按角色及国内／海外范围访问。 |
| 一致性 | 02 开发者端提交真实快照和包体供 09 审核后台读取；09 的测试与审核结果回写 02 发布记录。 |
| 数据存储 | 每次提审生成 submissionId 与 revisionId；补件重提生成新编号，历史快照、附件和结论不可覆盖。 |
| 安全 | 包体、资质和测试附件使用鉴权地址；日志不记录下载凭证。 |
| 并发 | 重复点击只处理一次；并发审核以首个成功终态为准，其他请求返回最新状态。 |

### 4.3 运营需求

| 需求项 | 具体要求 |
|---|---|
| 测试执行 | 平台准备 Windows、macOS、Linux 测试环境；单包结果绑定包体，整次结论绑定当前修订。 |
| 审核协同 | 游戏资料、SKU、发行设置、资质和包体测试可并行；发布审核通过前统一校验。 |
| 通知 | 国内发行发送盖世游戏短信，海外发行发送邮件；仅通知审核结果，失败原因在开发者中心查看。 |

### 4.4 财务、法务、版权与合规需求

| 需求项 | 具体要求 |
|---|---|
| 财务 | 本需求不新增结算规则；售价与币种沿用支付结算方案。 |
| 法务 | 国内发行需核验游戏版号及审批材料；具体清单由法务确认。 |
| 版权 | 中国大陆和全球均须提供权属或发行授权材料；软件著作权仅作辅助证明。 |
| 其他合规 | 中国大陆与全球资质独立；香港、澳门按海外发行处理。 |

## 五、待确认项

| 待确认问题 | 默认建议 | 未确认的影响 | 是否阻塞 |
|---|---|---|---|
| 包体格式、大小、数量与并发上限 | 由存储／CDN方案和压测结果确定，前端读取服务端配置 | 影响上传校验和接口参数 | 阻塞接口冻结，不阻塞流程评审 |
| 测试附件格式、大小与数量上限 | 复用平台通用附件规则 | 影响附件校验 | 阻塞附件接口冻结 |
| 包体库选择流程 | 后续独立补充，本期只保留入口提示 | 不影响本地上传 | 不阻塞 |

## 六、附录

### 6.1 参考文档

| 文档名称 | 文档链接／位置 | 说明 |
|---|---|---|
| PC 发行平台功能清单（交付版） | prd/发行平台专项/PC 发行平台功能清单（交付版）.md | 一期范围及 9 月 1 日会议基准。 |
| WeGame 开发者文档 | https://developer.wegame.com/developer/game-wiki/help/doc/getting-started-overview/zh_CN | PC 游戏接入与发布参考。 |
| Steamworks 上手文档 | https://partner.steamgames.com/doc/gettingstarted | PC 游戏发行对象与流程参考。 |

### 6.2 原型／Demo 索引

| 原型／Demo 名称 | 链接／位置 | 说明 |
|---|---|---|
| 开发者端 Demo | 公网预览<br>[打开 02 Demo](https://htmlpreview.github.io/?https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@b6bfd4229f077b21807291dc279a1740e1fa645d/demos/%E5%BC%80%E5%8F%91%E8%80%85%E5%90%8E%E5%8F%B0%E4%B8%80%E6%9C%9F/02-CDKEY%E5%95%86%E5%93%81%E4%B8%8E%E4%BE%9B%E7%BB%99demo.html#/P02-01) | 本 PRD 的开发者端唯一有效原型。 |
| 运营审核 Demo | 公网预览<br>[打开游戏发布审核](https://htmlpreview.github.io/?https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75308c1c9a4aacca85d1eaa4214ef979ba2ad308/demos/%E5%BC%80%E5%8F%91%E8%80%85%E5%90%8E%E5%8F%B0%E4%B8%80%E6%9C%9F/09-%E5%8F%91%E8%A1%8C%E5%AE%A1%E6%A0%B8%E5%90%8E%E5%8F%B0demo.html#/management/release) | 发布审核与包体测试。 |
| 审核记录 | 公网预览<br>[打开审核记录](https://htmlpreview.github.io/?https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75308c1c9a4aacca85d1eaa4214ef979ba2ad308/demos/%E5%BC%80%E5%8F%91%E8%80%85%E5%90%8E%E5%8F%B0%E4%B8%80%E6%9C%9F/09-%E5%8F%91%E8%A1%8C%E5%AE%A1%E6%A0%B8%E5%90%8E%E5%8F%B0demo.html#/records) | 三类审核记录。 |

# 正版发行平台一期七份 PRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依据已确认的 2026 年 11 月一期产品规格，交付七份可供产品、设计、研发、测试、运营和数据直接评审的正版发行平台 PRD。

**Architecture:** 七份 PRD 按“总纲与对象 → 开发者入驻和游戏资料 → CDKEY 供给 → 包体测试发布 → 用户权益 → 本地交付 → 精准投放与数据”顺序编写。每份文档独立闭环，跨文档只复用稳定对象和既有 CDKEY 用户侧规则，不用远程引用替代本端必要规则；图片先在本地冻结，再以固定 40 位提交 SHA 写入 PRD。

**Tech Stack:** Markdown、Mermaid／PNG 横向流程图、PowerShell PRD 校验脚本、Git

---

## 0. 已确认范围与执行约束

### 输入资料

- `C:\Users\z3635\官网改动\docs\superpowers\specs\2026-09-01-genuine-game-distribution-platform-phase1-design.md`
- `C:\Users\z3635\Downloads\游戏分发平台建设构想.md`
- `C:\Users\z3635\官网改动\会议记录\聊聊盖世正版发行平台建设-文字记录-2026-08-31.md`
- `C:\Users\z3635\官网改动\prd\需求评审\APP\cdkey.md`
- `C:\Users\z3635\官网改动\储存\cdkey_prd_clean.md`
- `C:\Users\z3635\官网改动\docs\superpowers\specs\2026-07-31-cdkey-prd-review-revision-design.md`

### 一期硬边界

- 目标版本为 2026 年 11 月一期 MVP，不输出程序预研、接口设计和研发排期。
- CDKEY 分销与盖世包体发行并存；所有用户触点明确展示 `第三方平台激活` 或 `盖世直接下载`。
- CDKEY 用户购买、支付、订单、Key 交付、激活指引和退款复用既有 PRD；本次新增供应来源、SKU 关联、库存状态、开发者只读状态和平台异常处理。
- 包体发行仅覆盖 1 个受邀签约厂商、1 款 Windows 游戏、单一正式发布分支，包含首版发布和后续正式版本更新。
- 开发者平台包含受邀登录、厂商资料、固定模板厂商主页、游戏创建、供给或包体提交、投放需求和数据查看；不开放公众注册、复杂权限和自助发布。
- 精准投放采用已确认的方案 A：开发者提交素材、目标和期望人群，平台运营使用现有资源位与现有数据规则圈选、配置、排期，开发者只读查看效果。
- 发行授权、销售地区、定价、分成和结算责任是商品或游戏发布前置条件；不在本期建设自动结算系统。

### 七份正式 PRD 文件

1. `C:\Users\z3635\官网改动\prd\最终文档\正版发行平台一期\01-正版发行平台一期产品总纲.md`
2. `C:\Users\z3635\官网改动\prd\最终文档\正版发行平台一期\02-开发者平台、厂商主页与游戏创建PRD.md`
3. `C:\Users\z3635\官网改动\prd\最终文档\正版发行平台一期\03-游戏商品与CDKEY供给管理PRD.md`
4. `C:\Users\z3635\官网改动\prd\最终文档\正版发行平台一期\04-游戏包体、测试审核与版本发布PRD.md`
5. `C:\Users\z3635\官网改动\prd\最终文档\正版发行平台一期\05-用户购买、权益与游戏库PRD.md`
6. `C:\Users\z3635\官网改动\prd\最终文档\正版发行平台一期\06-游戏下载、安装、启动与更新PRD.md`
7. `C:\Users\z3635\官网改动\prd\最终文档\正版发行平台一期\07-精准化投放与发行数据看板PRD.md`

### 图片目录

- `C:\Users\z3635\官网改动\public\prd\genuine-game-distribution-phase1\00-baseline\`
- `C:\Users\z3635\官网改动\public\prd\genuine-game-distribution-phase1\01-overview\`
- `C:\Users\z3635\官网改动\public\prd\genuine-game-distribution-phase1\02-developer\`
- `C:\Users\z3635\官网改动\public\prd\genuine-game-distribution-phase1\03-cdkey-supply\`
- `C:\Users\z3635\官网改动\public\prd\genuine-game-distribution-phase1\04-build-release\`
- `C:\Users\z3635\官网改动\public\prd\genuine-game-distribution-phase1\05-entitlement-library\`
- `C:\Users\z3635\官网改动\public\prd\genuine-game-distribution-phase1\06-install-launch-update\`
- `C:\Users\z3635\官网改动\public\prd\genuine-game-distribution-phase1\07-targeting-dashboard\`

### 每份 PRD 的统一质量门禁

- 使用 `to-prd` 唯一模板：四列修订记录、文档概述、产品说明、C／B 分端页面六要素、支撑需求、待确认项和按需附录；不生成目录、功能优先级、研发执行状态、独立验收章或独立数据校验表。
- 每个实际涉及的页面只写一张六要素主表：功能简介、场景描述、输入／前置条件、需求描述、输出／后置条件、补充说明。
- `需求描述` 中的展示说明和交互说明分别换行并从 `1.` 编号；页面主图按前置页面 → 当前页面 → 后续页面排列，当前页面必填。
- 每份文档均属复杂需求，`2.2 产品流程` 必须放且只放一张从左到右的横向合成图；页面图不代替状态、异常、恢复和冲突规则。
- 已有页面先收集现状证据再写改动；缺少现状页面或新页面结构依据时停止该页定稿，先补截图、现有组件基线或经确认的低保真结构图，不凭空增加入口、弹窗、提示、字段和操作。
- 新建 B 端页面的低保真结构图只表达已确认字段、状态和动作，不写无依据的尺寸、颜色、接口、数据库字段或性能阈值。
- 页面内存在审核、发布、暂停、失败、下架、退款或撤销等状态时，紧跟页面六要素表补状态表；涉及权限、SKU、上传、列表或数据时只增加命中的风险表。
- 数据结论为新增、改造或复用时同时输出指标、事件和参数表；事件中的参数与参数表逐项一致，枚举写清业务定义，指标写清分子、分母、去重对象和时间窗口。
- 任何未决项使用 `[待确认]` 并写默认建议、影响范围和阻塞性；不得写未决占位语句。
- 文档只使用固定提交 SHA 的 HTTPS 图片直链。未获 Git 推送授权前不得推送；仅完成公网响应校验时必须写明“飞书转存未验证”。

---

### Task 1: 建立页面与图片证据基线

**Files:**
- Create: `docs/superpowers/evidence/genuine-game-distribution-phase1-page-baseline.md`
- Create when the source exists: `public/prd/genuine-game-distribution-phase1/00-baseline/c-game-detail-existing.png`
- Create when the source exists: `public/prd/genuine-game-distribution-phase1/00-baseline/c-checkout-existing.png`
- Create when the source exists: `public/prd/genuine-game-distribution-phase1/00-baseline/c-order-result-existing.png`
- Create when the source exists: `public/prd/genuine-game-distribution-phase1/00-baseline/c-game-library-existing.png`
- Create when the source exists: `public/prd/genuine-game-distribution-phase1/00-baseline/c-download-task-existing.png`
- Create when the source exists: `public/prd/genuine-game-distribution-phase1/00-baseline/c-recommendation-slot-existing.png`
- Create when the source exists: `public/prd/genuine-game-distribution-phase1/00-baseline/b-list-existing.png`
- Create when the source exists: `public/prd/genuine-game-distribution-phase1/00-baseline/b-detail-existing.png`
- Create when the source exists: `public/prd/genuine-game-distribution-phase1/00-baseline/b-review-existing.png`
- Create when the source exists: `public/prd/genuine-game-distribution-phase1/00-baseline/b-placement-existing.png`
- Create when the source exists: `public/prd/genuine-game-distribution-phase1/00-baseline/b-dashboard-existing.png`
- Read: `codex-clipboard-c31cbca9-e773-4119-b181-5860e62413a4.png`
- Read: `prd/需求评审/APP/cdkey.md`
- Read: `储存/cdkey_prd_clean.md`

- [ ] **Step 1: 盘点所有来源及可见页面**

  在证据基线文档中按 `来源｜可证明事实｜对应 PRD／页面｜证据文件｜确定性` 五项拆成两张不超过四列的表，分别记录“来源与事实”和“页面与证据”。只使用 `[已确认]`、`[推导]`、`[建议方案]`、`[待确认]`、`[高风险假设]` 五种确定性标记。

- [ ] **Step 2: 恢复既有 C 端页面基线**

  从用户附件、现有 CDKEY PRD、可访问的当前产品页面中收集游戏详情、结算确认、订单结果、游戏库、下载任务和现有推荐资源位；每张图记录原页面、来源日期和本期仅改区域。若附件仅能证明局部页面，不把局部截图扩写成完整页面规则。

- [ ] **Step 3: 恢复既有 B 端或管理后台基线**

  搜索仓库和已打开资料中的列表、详情、审核、素材配置、资源位配置和数据看板组件。现有页面不存在时，在证据基线文档中明确写“新页面，无现状页面”，并把可复用组件和字段依据分别列出。

- [ ] **Step 4: 建立页面证据矩阵**

  为后续每个页面写清三种结论之一：`现状截图可用`、`新页面且结构已由产品规格确认`、`缺少依据，阻塞定稿`。第三种结论必须在对应 PRD 的待确认项中保留，不能用竞品页面冒充盖世现状。

- [ ] **Step 5: 校验基线文件**

  Run:

  ```powershell
  rg -n "现状截图可用|新页面且结构已由产品规格确认|缺少依据，阻塞定稿" "docs/superpowers/evidence/genuine-game-distribution-phase1-page-baseline.md"
  git diff --check -- "docs/superpowers/evidence/genuine-game-distribution-phase1-page-baseline.md" "public/prd/genuine-game-distribution-phase1/00-baseline"
  ```

  Expected: 每个计划页面均有一条证据结论；`git diff --check` 无输出。

- [ ] **Step 6: 提交证据基线**

  ```powershell
  git add -- "docs/superpowers/evidence/genuine-game-distribution-phase1-page-baseline.md" "public/prd/genuine-game-distribution-phase1/00-baseline"
  git commit -m "docs: capture publishing platform page baseline"
  ```

---

### Task 2: 编写《正版发行平台一期产品总纲》

**Files:**
- Create: `prd/最终文档/正版发行平台一期/01-正版发行平台一期产品总纲.md`
- Create: `public/prd/genuine-game-distribution-phase1/01-overview/01-end-to-end-flow.mmd`
- Create: `public/prd/genuine-game-distribution-phase1/01-overview/01-end-to-end-flow.png`
- Create: `public/prd/genuine-game-distribution-phase1/01-overview/02-platform-surfaces.png`

- [ ] **Step 1: 写文档概述和一期边界**

  明确四类用户：已签约厂商、平台发行运营、测试人员、盖世用户；当前问题是厂商资料、CDKEY 供给、包体测试发布、用户交付和投放数据尚未形成统一发行闭环。产品、业务、运营和人力边界必须完整写入，逐项列出一期不包含项。

- [ ] **Step 2: 定义共享业务对象和交付方式**

  写清厂商、游戏项目、商品、SKU、CDKEY 供给、包体版本、用户权益、投放计划和数据归属。交付方式只有 `第三方平台激活` 和 `盖世直接下载` 两种，并写清二者在详情、结算、订单和游戏库的统一表现约束。

- [ ] **Step 3: 生成横向全链路产品流程图**

  图内从左到右覆盖：合作方账号 → 厂商与游戏资料 → 选择 CDKEY／包体分支 → 供给关联或上传测试 → 平台发布 → 精准投放 → 用户详情 → CDKEY 交付或盖世权益 → 下载启动或第三方激活 → 数据回流。分支在同一张图内汇合，图中不得加入算法、预算、开放注册或多版本分支。

  Run:

  ```powershell
  npx --yes @mermaid-js/mermaid-cli -i "public/prd/genuine-game-distribution-phase1/01-overview/01-end-to-end-flow.mmd" -o "public/prd/genuine-game-distribution-phase1/01-overview/01-end-to-end-flow.png" -w 2800 -H 900 -b transparent
  ```

  Expected: 输出一张横向 PNG，所有步骤和两种交付方式在 100% 缩放下可辨认。

- [ ] **Step 4: 按页面写平台入口六要素**

  C 端写“游戏详情交付方式入口概览”“游戏库交付入口概览”；B 端写“开发者工作台首页”“平台发行运营总览”“测试任务总览”。只定义入口、角色可见对象和全局状态，不重复后续 PRD 的字段级规则。

- [ ] **Step 5: 写共享状态、异常和成功口径**

  就地写游戏项目、包体版本和投放计划三组状态流转，以及越权、库存不足、上传中断、测试驳回、发布失败、权益未生成、下载失败、空人群、游戏下架和数据延迟的恢复原则。成功形态同时覆盖 CDKEY 分支、包体分支和精准投放分支。

- [ ] **Step 6: 冻结图片并写入固定 SHA 地址**

  ```powershell
  git add -- "public/prd/genuine-game-distribution-phase1/01-overview"
  git commit -m "docs: add publishing platform overview visuals"
  $overviewAssetSha = (git rev-parse HEAD).Trim()
  $overviewAssetBaseUrl = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$overviewAssetSha/public/prd/genuine-game-distribution-phase1/01-overview"
  $overviewAssetSha.Length
  ```

  Expected: 最后一行输出 `40`。使用 `$overviewAssetSha` 生成 jsDelivr 固定提交地址并写入 PRD，图片标题使用 16 字以内短标题，图号和详细说明单独换行。

- [ ] **Step 7: 校验并提交总纲**

  ```powershell
  powershell -ExecutionPolicy Bypass -File "C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1" -Path "prd/最终文档/正版发行平台一期/01-正版发行平台一期产品总纲.md"
  git diff --check -- "prd/最终文档/正版发行平台一期/01-正版发行平台一期产品总纲.md"
  git add -- "prd/最终文档/正版发行平台一期/01-正版发行平台一期产品总纲.md"
  git commit -m "docs: add publishing platform phase one overview PRD"
  ```

  Expected: 质量校验通过，`git diff --check` 无输出，只提交本任务文件。

---

### Task 3: 编写《开发者平台、厂商主页与游戏创建 PRD》

**Files:**
- Create: `prd/最终文档/正版发行平台一期/02-开发者平台、厂商主页与游戏创建PRD.md`
- Create: `public/prd/genuine-game-distribution-phase1/02-developer/02-developer-flow.mmd`
- Create: `public/prd/genuine-game-distribution-phase1/02-developer/02-developer-flow.png`
- Create: `public/prd/genuine-game-distribution-phase1/02-developer/02-vendor-home.png`
- Create: `public/prd/genuine-game-distribution-phase1/02-developer/02-game-publisher-entry.png`
- Create: `public/prd/genuine-game-distribution-phase1/02-developer/02-developer-login.png`
- Create: `public/prd/genuine-game-distribution-phase1/02-developer/02-developer-home.png`
- Create: `public/prd/genuine-game-distribution-phase1/02-developer/02-vendor-profile.png`
- Create: `public/prd/genuine-game-distribution-phase1/02-developer/02-game-list.png`
- Create: `public/prd/genuine-game-distribution-phase1/02-developer/02-game-editor.png`
- Create: `public/prd/genuine-game-distribution-phase1/02-developer/02-review-result.png`
- Create: `public/prd/genuine-game-distribution-phase1/02-developer/02-partner-account.png`
- Create: `public/prd/genuine-game-distribution-phase1/02-developer/02-vendor-review.png`
- Create: `public/prd/genuine-game-distribution-phase1/02-developer/02-game-review.png`

- [ ] **Step 1: 明确端、角色与数据范围**

  C 端只覆盖固定模板厂商主页及游戏详情中的厂商入口；B 端覆盖受邀合作方和平台发行运营。合作方只能查看本厂商资料、游戏和数据，不能自行创建成员、配置权限、签在线合同、设置结算账户或直接发布。

- [ ] **Step 2: 生成开发者建档横向流程图**

  从左到右覆盖：平台创建合作方账号 → 合作方登录 → 维护厂商资料 → 平台审核 → 创建游戏 → 提交资料与标签 → 平台审核／驳回 → 资料通过 → 进入 CDKEY 供给或包体版本流程。驳回和重新提交作为同图回路。

  Run:

  ```powershell
  npx --yes @mermaid-js/mermaid-cli -i "public/prd/genuine-game-distribution-phase1/02-developer/02-developer-flow.mmd" -o "public/prd/genuine-game-distribution-phase1/02-developer/02-developer-flow.png" -w 2800 -H 900 -b transparent
  ```

  Expected: 输出一张从受邀账号到资料通过的横向 PNG，驳回回路清晰可辨。

- [ ] **Step 3: 写 C 端页面六要素**

  页面清单：`固定模板厂商主页`、`游戏详情厂商信息区`。写清 Logo、名称、简介、官网、已发布游戏列表、游戏卡片交付方式；未发布、已下架或无游戏时的空态与跳转结果必须明确。

- [ ] **Step 4: 写开发者侧 B 端页面六要素**

  页面清单：`受邀账号登录页`、`开发者工作台首页`、`厂商资料页`、`游戏列表页`、`创建／编辑游戏页`、`资料审核结果页`。列表补数据源、搜索筛选、排序、分页、加载、空态和失败态；表单补字段来源、校验时机、保存草稿、重复提交、退出和失败恢复。

- [ ] **Step 5: 写平台运营侧 B 端页面六要素**

  页面清单：`合作方账号配置页`、`厂商资料审核页`、`游戏资料审核页`。写清账号创建权限、厂商数据范围、审核进入与退出、驳回原因、重新提交、操作日志及越权反馈；发行授权、地区和合同范围是游戏资料通过或发布的前置校验。

- [ ] **Step 6: 写游戏字段、标签和状态规则**

  覆盖基本资料、宣传素材、语言、地区、系统要求、游戏标签和发行方式。标签由开发者提交、平台运营审核或修正后生效；已发布游戏修改关键资料时，线上内容保持不变，修改稿重新审核。

- [ ] **Step 7: 冻结页面图与流程图**

  仅基于 Task 1 的现状证据或已确认字段生成页面图；新页面图标记为产品低保真结构，不补充未经确认的入口和控件。提交图片目录并记录 40 位 SHA，随后在 PRD 中写入该 SHA 对应的固定 HTTPS 图片地址。

  ```powershell
  git add -- "public/prd/genuine-game-distribution-phase1/02-developer"
  git commit -m "docs: add developer platform PRD visuals"
  $developerAssetSha = (git rev-parse HEAD).Trim()
  $developerAssetBaseUrl = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$developerAssetSha/public/prd/genuine-game-distribution-phase1/02-developer"
  $developerAssetSha.Length
  ```

  Expected: 最后一行输出 `40`；PRD 中的图片地址全部使用 `$developerAssetSha` 对应的固定提交地址。

- [ ] **Step 8: 校验并提交 PRD**

  ```powershell
  powershell -ExecutionPolicy Bypass -File "C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1" -Path "prd/最终文档/正版发行平台一期/02-开发者平台、厂商主页与游戏创建PRD.md"
  git diff --check -- "prd/最终文档/正版发行平台一期/02-开发者平台、厂商主页与游戏创建PRD.md" "public/prd/genuine-game-distribution-phase1/02-developer"
  git add -- "prd/最终文档/正版发行平台一期/02-开发者平台、厂商主页与游戏创建PRD.md"
  git commit -m "docs: add developer onboarding and game creation PRD"
  ```

---

### Task 4: 编写《游戏商品与 CDKEY 供给管理 PRD》

**Files:**
- Create: `prd/最终文档/正版发行平台一期/03-游戏商品与CDKEY供给管理PRD.md`
- Create: `public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-cdkey-supply-flow.mmd`
- Create: `public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-cdkey-supply-flow.png`
- Create: `public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-developer-supply-status.png`
- Create: `public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-supply-error-detail.png`
- Create: `public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-ops-product-list.png`
- Create: `public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-ops-sku-editor.png`
- Create: `public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-ops-supply-link.png`
- Create: `public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-ops-stock-error.png`
- Reference: `prd/需求评审/APP/cdkey.md`

- [ ] **Step 1: 固定本 PRD 边界**

  本文只新增供给侧和平台衔接，不重写用户购买、支付、订单、Key 交付、激活指引和退款。B 端角色为开发者和平台发行运营；若没有新增 C 端页面，删除 C 端章节，不为满足模板虚构页面。

- [ ] **Step 2: 生成供给管理横向流程图**

  从左到右覆盖：游戏资料通过 → 建商品与 SKU → 绑定激活平台和销售地区 → 关联供应来源 → 校验发行授权、定价、分成和结算责任 → 检查库存／供给状态 → 可售发布 → 缺货、异常或停售 → 开发者只读查看状态。

  Run:

  ```powershell
  npx --yes @mermaid-js/mermaid-cli -i "public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-cdkey-supply-flow.mmd" -o "public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-cdkey-supply-flow.png" -w 2800 -H 900 -b transparent
  ```

  Expected: 输出一张横向 PNG，供给关联、商业前置校验和异常停售处于同一流程。

- [ ] **Step 3: 写开发者侧 B 端页面六要素**

  页面清单：`游戏商品与供给状态页`、`供给异常详情页`。开发者只能查看本厂商游戏、SKU、激活平台、地区、供应来源类型、可售库存状态、审核和异常原因；不得查看明文 Key、其他厂商供给或供应商敏感信息。

- [ ] **Step 4: 写平台运营侧 B 端页面六要素**

  页面清单：`游戏商品列表页`、`商品／SKU 配置页`、`供应来源关联页`、`库存与供给异常页`。写清数据源、筛选排序、价格和地区来源、供应状态、生效／失效、停售、恢复、权限和操作日志。

- [ ] **Step 5: 写供应方式和异常规则**

  默认复用现有供应商 API 供货模式；直接供 Key 只能作为受控供给类型补充，不在开发者平台新增批量明文上传。库存不足或供应异常时停止新的可售曝光，已产生订单和退款仍按既有 CDKEY PRD 处理。

- [ ] **Step 6: 写 SKU、地区、权益与历史规则**

  明确一个商品和多个 SKU 的关系、激活平台与销售地区约束、价格来源、上下架、库存状态、旧订单不受新停售状态反向改写，以及商品配置与游戏详情 `第三方平台激活` 标签的一致性。

- [ ] **Step 7: 冻结图片、校验并提交**

  先提交 `public/prd/genuine-game-distribution-phase1/03-cdkey-supply` 并记录 40 位 SHA，再把固定地址写入 PRD。

  ```powershell
  git add -- "public/prd/genuine-game-distribution-phase1/03-cdkey-supply"
  git commit -m "docs: add CDKEY supply PRD visuals"
  $cdkeySupplyAssetSha = (git rev-parse HEAD).Trim()
  $cdkeySupplyAssetBaseUrl = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$cdkeySupplyAssetSha/public/prd/genuine-game-distribution-phase1/03-cdkey-supply"
  if ($cdkeySupplyAssetSha.Length -ne 40) { throw "Unexpected asset commit SHA" }
  powershell -ExecutionPolicy Bypass -File "C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1" -Path "prd/最终文档/正版发行平台一期/03-游戏商品与CDKEY供给管理PRD.md"
  git diff --check -- "prd/最终文档/正版发行平台一期/03-游戏商品与CDKEY供给管理PRD.md" "public/prd/genuine-game-distribution-phase1/03-cdkey-supply"
  git add -- "prd/最终文档/正版发行平台一期/03-游戏商品与CDKEY供给管理PRD.md"
  git commit -m "docs: add CDKEY supply management PRD"
  ```

---

### Task 5: 编写《游戏包体、测试审核与版本发布 PRD》

**Files:**
- Create: `prd/最终文档/正版发行平台一期/04-游戏包体、测试审核与版本发布PRD.md`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-build-release-flow.mmd`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-build-release-flow.png`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-version-list.png`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-version-editor.png`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-build-upload.png`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-submit-test.png`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-test-rejection.png`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-test-task-list.png`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-test-task-detail.png`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-test-result.png`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-ops-version-list.png`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-ops-version-detail.png`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-release-list.png`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-release-config.png`
- Create: `public/prd/genuine-game-distribution-phase1/04-build-release/04-live-disposal.png`

- [ ] **Step 1: 固定单游戏版本模型**

  写清 1 个受邀签约厂商、1 款 Windows 游戏、单一正式发布分支、一个当前线上版本、首版和后续正式更新；不包含多端、多正式分支、预载、开发者自助灰度和开发者自助回滚。

- [ ] **Step 2: 生成版本全流程横向图**

  从左到右覆盖：创建版本 → 填写版本资料 → 上传包体 → 提交测试 → 测试人员取包 → 测试不通过／重新提交或测试通过 → 平台待发布 → 立即／定时发布 → 用户获得新版本 → 重大问题暂停下载或启动。所有回路在一张图内表达。

  Run:

  ```powershell
  npx --yes @mermaid-js/mermaid-cli -i "public/prd/genuine-game-distribution-phase1/04-build-release/04-build-release-flow.mmd" -o "public/prd/genuine-game-distribution-phase1/04-build-release/04-build-release-flow.png" -w 3200 -H 1000 -b transparent
  ```

  Expected: 输出一张横向 PNG，驳回重提、测试通过、发布和重大问题处置均可辨认。

- [ ] **Step 3: 写开发者侧 B 端页面六要素**

  页面清单：`版本列表页`、`创建／编辑版本页`、`包体上传页`、`提交测试确认页`、`测试驳回详情页`。写清版本号、更新说明、启动文件、启动参数、运行说明、保存草稿、上传中断、继续／重传、重复提交和当前线上版本表现。

- [ ] **Step 4: 写测试侧 B 端页面六要素**

  页面清单：`待测任务列表页`、`测试任务详情页`、`测试结果提交页`。写清任务分配、包体和说明获取、测试轮次、通过／不通过、问题说明、再次提交后新轮次、权限和操作记录。

- [ ] **Step 5: 写平台运营侧 B 端页面六要素**

  页面清单：`版本审核列表页`、`版本审核详情页`、`待发布列表页`、`发布配置页`、`线上版本处置页`。写清已签约项目校验、测试通过前置、立即／定时发布、撤回未发布版本、游戏下架、暂停下载／启动、发布失败保留原线上版本和平台重试。

- [ ] **Step 6: 写版本状态机、上传与发布异常**

  状态必须覆盖 `草稿 → 上传中 → 待提交 → 测试中 → 测试不通过／测试通过 → 待发布 → 已发布 → 已撤回`。逐状态定义进入、退出、可见内容、可执行操作、失败恢复和终态；已发布版本不能直接删除。

- [ ] **Step 7: 冻结图片、校验并提交**

  先提交图片目录并记录 40 位 SHA，再写固定图片地址。

  ```powershell
  git add -- "public/prd/genuine-game-distribution-phase1/04-build-release"
  git commit -m "docs: add build test and release PRD visuals"
  $buildReleaseAssetSha = (git rev-parse HEAD).Trim()
  $buildReleaseAssetBaseUrl = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$buildReleaseAssetSha/public/prd/genuine-game-distribution-phase1/04-build-release"
  if ($buildReleaseAssetSha.Length -ne 40) { throw "Unexpected asset commit SHA" }
  powershell -ExecutionPolicy Bypass -File "C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1" -Path "prd/最终文档/正版发行平台一期/04-游戏包体、测试审核与版本发布PRD.md"
  git diff --check -- "prd/最终文档/正版发行平台一期/04-游戏包体、测试审核与版本发布PRD.md" "public/prd/genuine-game-distribution-phase1/04-build-release"
  git add -- "prd/最终文档/正版发行平台一期/04-游戏包体、测试审核与版本发布PRD.md"
  git commit -m "docs: add game build test and release PRD"
  ```

---

### Task 6: 编写《用户购买、权益与游戏库 PRD》

**Files:**
- Create: `prd/最终文档/正版发行平台一期/05-用户购买、权益与游戏库PRD.md`
- Create: `public/prd/genuine-game-distribution-phase1/05-entitlement-library/05-entitlement-flow.mmd`
- Create: `public/prd/genuine-game-distribution-phase1/05-entitlement-library/05-entitlement-flow.png`
- Create: `public/prd/genuine-game-distribution-phase1/05-entitlement-library/05-game-detail.png`
- Create: `public/prd/genuine-game-distribution-phase1/05-entitlement-library/05-purchase-confirm.png`
- Create: `public/prd/genuine-game-distribution-phase1/05-entitlement-library/05-transaction-result.png`
- Create: `public/prd/genuine-game-distribution-phase1/05-entitlement-library/05-library-list.png`
- Create: `public/prd/genuine-game-distribution-phase1/05-entitlement-library/05-library-detail.png`
- Create: `public/prd/genuine-game-distribution-phase1/05-entitlement-library/05-entitlement-error.png`
- Create: `public/prd/genuine-game-distribution-phase1/05-entitlement-library/05-ops-entitlement-search.png`
- Create: `public/prd/genuine-game-distribution-phase1/05-entitlement-library/05-ops-entitlement-handle.png`
- Reference: `prd/需求评审/APP/cdkey.md`

- [ ] **Step 1: 生成两种交付方式的横向用户流程图**

  从游戏详情开始分成两路：CDKEY 路径为确认限制 → 购买 → 订单与 Key 状态 → 第三方激活指引；包体路径为购买或零价领取 → 生成盖世权益 → 进入游戏库 → 盖世下载。两路均回到游戏库统一展示，但按钮和下一步操作不得混用。

  Run:

  ```powershell
  npx --yes @mermaid-js/mermaid-cli -i "public/prd/genuine-game-distribution-phase1/05-entitlement-library/05-entitlement-flow.mmd" -o "public/prd/genuine-game-distribution-phase1/05-entitlement-library/05-entitlement-flow.png" -w 2800 -H 900 -b transparent
  ```

  Expected: 输出一张横向 PNG，两种交付方式从详情到游戏库的入口和结果无混用。

- [ ] **Step 2: 写 C 端游戏详情页六要素**

  写清封面、素材、简介、类型、系统要求、厂商、价格或领取条件，以及 `第三方平台激活`／`盖世直接下载` 标签。CDKEY 同时展示激活平台、地区和退款边界；包体同时展示支持系统、下载大小和更新要求。

- [ ] **Step 3: 写 C 端结算和结果页六要素**

  页面清单：`购买／领取确认页`、`订单／领取结果页`。付款或领取前再次展示交付方式和限制；CDKEY 结果页复用既有 Key 交付状态，包体结果页写权益生成中、成功和失败恢复，任何失败不得导致重复扣款。

- [ ] **Step 4: 写 C 端游戏库页面六要素**

  页面清单：`游戏库列表页`、`游戏库游戏详情页`、`权益异常状态页`。统一展示名称、封面、交付方式、权益状态和下一步操作；CDKEY 不展示盖世下载，包体不展示 Key 激活入口，同一游戏不得同时出现冲突入口。

- [ ] **Step 5: 写平台运营侧 B 端权益处理页面**

  页面清单：`用户权益查询页`、`权益异常处理页`。写清查询权限、数据范围、购买／领取来源、权益状态、退款或违规撤销、原因记录、用户侧表现、操作日志和越权反馈。

- [ ] **Step 6: 写 SKU、权益、下架与历史规则**

  商品下架停止新用户获取但不自动删除已有有效权益；退款、合同或违规撤销必须有明确原因和用户可理解结果。写清已支付但权益未生成、重复领取、重复回调、商品状态与旧订单冲突时的覆盖关系。

- [ ] **Step 7: 冻结图片、校验并提交**

  先提交图片目录并记录 40 位 SHA，再写固定图片地址。

  ```powershell
  git add -- "public/prd/genuine-game-distribution-phase1/05-entitlement-library"
  git commit -m "docs: add entitlement and library PRD visuals"
  $entitlementAssetSha = (git rev-parse HEAD).Trim()
  $entitlementAssetBaseUrl = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$entitlementAssetSha/public/prd/genuine-game-distribution-phase1/05-entitlement-library"
  if ($entitlementAssetSha.Length -ne 40) { throw "Unexpected asset commit SHA" }
  powershell -ExecutionPolicy Bypass -File "C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1" -Path "prd/最终文档/正版发行平台一期/05-用户购买、权益与游戏库PRD.md"
  git diff --check -- "prd/最终文档/正版发行平台一期/05-用户购买、权益与游戏库PRD.md" "public/prd/genuine-game-distribution-phase1/05-entitlement-library"
  git add -- "prd/最终文档/正版发行平台一期/05-用户购买、权益与游戏库PRD.md"
  git commit -m "docs: add purchase entitlement and library PRD"
  ```

---

### Task 7: 编写《游戏下载、安装、启动与更新 PRD》

**Files:**
- Create: `prd/最终文档/正版发行平台一期/06-游戏下载、安装、启动与更新PRD.md`
- Create: `public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-local-delivery-flow.mmd`
- Create: `public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-local-delivery-flow.png`
- Create: `public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-install-path.png`
- Create: `public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-download-task.png`
- Create: `public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-download-manager.png`
- Create: `public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-install-result.png`
- Create: `public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-library-launch-state.png`
- Create: `public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-required-update.png`
- Create: `public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-update-task.png`
- Create: `public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-launch-recovery.png`
- Create: `public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-game-management.png`
- Create: `public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-repair.png`
- Create: `public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-uninstall.png`

- [ ] **Step 1: 固定本地交付范围**

  只覆盖已获得盖世包体权益的 Windows 用户；不包含 CDKEY 游戏下载、预载、P2P、多下载分支、离线设备管理、高级 DRM 和开发者自助版本回滚。

- [ ] **Step 2: 生成本地交付横向流程图**

  从左到右覆盖：游戏库点击下载 → 选择安装位置 → 下载暂停／继续／取消／重试 → 完整性校验 → 安装 → 启动前权益和版本校验 → 启动 → 发现正式更新 → 更新后启动，并在同图表示修复和卸载分支。

  Run:

  ```powershell
  npx --yes @mermaid-js/mermaid-cli -i "public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-local-delivery-flow.mmd" -o "public/prd/genuine-game-distribution-phase1/06-install-launch-update/06-local-delivery-flow.png" -w 3200 -H 1000 -b transparent
  ```

  Expected: 输出一张横向 PNG，下载、安装、启动、强制更新、修复和卸载关系清晰。

- [ ] **Step 3: 写 C 端下载与安装页面六要素**

  页面清单：`安装位置选择页`、`下载任务页`、`下载管理页`、`安装进度与结果页`。写清空间和路径校验、任务状态、进度展示、暂停、继续、取消、失败重试、校验失败、安装失败和可恢复状态。

- [ ] **Step 4: 写 C 端启动与更新页面六要素**

  页面清单：`游戏库启动状态页`、`必须更新提示页`、`更新任务页`、`启动失败恢复页`。启动前校验有效权益和必要版本；强制更新完成前不能启动；更新失败保留当前可运行版本和重试入口。

- [ ] **Step 5: 写 C 端修复与卸载页面六要素**

  页面清单：`游戏管理页`、`修复确认与进度页`、`卸载确认页`。写清触发入口、确认信息、任务冲突、修复结果、卸载结果、取消和失败恢复；不得顺带新增备份、云存档和多安装目录管理。

- [ ] **Step 6: 写任务状态、冲突和数据口径**

  逐项定义等待、下载中、暂停、校验中、安装中、已安装、更新中、失败和已取消；同一游戏多任务、退出客户端、磁盘空间不足、网络中断、游戏运行中更新和游戏下架时写明冲突处理。埋点至少能区分开始下载、下载成功、安装成功、首次启动、更新成功和失败阶段。

- [ ] **Step 7: 冻结图片、校验并提交**

  先提交图片目录并记录 40 位 SHA，再写固定图片地址。

  ```powershell
  git add -- "public/prd/genuine-game-distribution-phase1/06-install-launch-update"
  git commit -m "docs: add local delivery PRD visuals"
  $localDeliveryAssetSha = (git rev-parse HEAD).Trim()
  $localDeliveryAssetBaseUrl = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$localDeliveryAssetSha/public/prd/genuine-game-distribution-phase1/06-install-launch-update"
  if ($localDeliveryAssetSha.Length -ne 40) { throw "Unexpected asset commit SHA" }
  powershell -ExecutionPolicy Bypass -File "C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1" -Path "prd/最终文档/正版发行平台一期/06-游戏下载、安装、启动与更新PRD.md"
  git diff --check -- "prd/最终文档/正版发行平台一期/06-游戏下载、安装、启动与更新PRD.md" "public/prd/genuine-game-distribution-phase1/06-install-launch-update"
  git add -- "prd/最终文档/正版发行平台一期/06-游戏下载、安装、启动与更新PRD.md"
  git commit -m "docs: add game install launch and update PRD"
  ```

---

### Task 8: 编写《精准化投放与发行数据看板 PRD》

**Files:**
- Create: `prd/最终文档/正版发行平台一期/07-精准化投放与发行数据看板PRD.md`
- Create: `public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-targeting-flow.mmd`
- Create: `public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-targeting-flow.png`
- Create: `public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-resource-slot.png`
- Create: `public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-landing-state.png`
- Create: `public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-developer-campaign-list.png`
- Create: `public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-campaign-editor.png`
- Create: `public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-campaign-detail.png`
- Create: `public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-developer-dashboard.png`
- Create: `public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-ops-plan-list.png`
- Create: `public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-material-review.png`
- Create: `public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-audience-editor.png`
- Create: `public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-placement-schedule.png`
- Create: `public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-campaign-monitor.png`

- [ ] **Step 1: 固定方案 A 与一期边界**

  开发者只提交素材、推广目标、期望人群和期望时间；平台运营审核后配置现有资源位、规则人群、排除条件、时间、频次和优先顺序；开发者只读查看自身游戏效果。明确不做广告竞价、预算消耗、开发者自助启动、推荐算法、Steam 游戏库导入和第三方画像抓取。

- [ ] **Step 2: 生成投放到数据回流的横向流程图**

  从左到右覆盖：开发者提交投放需求 → 平台审核素材和落地页 → 选择既有资源位 → 配置／预估人群 → 检查地区和系统要求 → 排期 → 投放 → 用户进入游戏详情 → 购买／领取 → CDKEY 成功交付或包体下载／首次启动 → T+1 看板。空人群、游戏下架和素材失效作为同图停止分支。

  Run:

  ```powershell
  npx --yes @mermaid-js/mermaid-cli -i "public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-targeting-flow.mmd" -o "public/prd/genuine-game-distribution-phase1/07-targeting-dashboard/07-targeting-flow.png" -w 3200 -H 1000 -b transparent
  ```

  Expected: 输出一张横向 PNG，开发者提交、运营配置、用户转化和 T+1 回流属于同一闭环。

- [ ] **Step 3: 写 C 端既有资源位和落地页六要素**

  页面清单：`现有推荐资源位曝光单元`、`游戏详情投放落地状态`。只写现有资源位内新增的目标人群控制和曝光归因，不新增客户端入口；落地页必须完整展示交付方式，不因精准投放弱化地区、系统和激活限制。

- [ ] **Step 4: 写开发者侧 B 端页面六要素**

  页面清单：`投放需求列表页`、`创建／编辑投放需求页`、`投放需求详情页`、`发行数据看板页`。写清素材、目标、期望人群和时间的字段、校验、草稿、提交、驳回、只读配置结果和数据权限。

- [ ] **Step 5: 写平台运营侧 B 端页面六要素**

  页面清单：`投放计划列表页`、`素材与落地页审核页`、`人群规则配置页`、`资源位与排期页`、`投放监控页`。写清现有资源位、条件与排除条件、命中预估、空人群拦截、频次、优先顺序、冲突处理、启动、暂停、结束、驳回和操作日志。

- [ ] **Step 6: 写游戏标签与用户圈选规则**

  游戏标签覆盖类型、题材、玩法、适配设备、支持系统和系统要求，平台审核后才可用于投放。用户圈选只使用已有地区、语言、设备／系统、已获得游戏、详情浏览、购买／领取、下载、启动和平台已有合法兴趣标签；不满足地区或系统要求的用户必须排除。

- [ ] **Step 7: 写指标、事件和参数表**

  指标覆盖曝光人数／次数、点击人数／次数、详情访问人数、购买／领取人数、包体下载人数、首次启动人数和 CDKEY 成功交付人数。CDKEY 激活仅在真实可取数据存在时展示；所有数据按 `campaign_id + game_id` 归集，默认 T+1，并显示更新时间和异常状态，未知数据不能填 0。

- [ ] **Step 8: 核对埋点参数一致性**

  事件至少覆盖曝光、点击、详情访问、购买／领取成功、Key 成功交付、下载成功和首次启动。参数表必须定义每个事件引用的 `campaign_id`、`game_id`、`delivery_type`、`placement_id`、`user_segment_id` 等业务参数；枚举值逐项写业务定义，事件与参数双向无孤项。

- [ ] **Step 9: 冻结图片、校验并提交**

  先提交图片目录并记录 40 位 SHA，再写固定图片地址。

  ```powershell
  git add -- "public/prd/genuine-game-distribution-phase1/07-targeting-dashboard"
  git commit -m "docs: add targeting and dashboard PRD visuals"
  $targetingAssetSha = (git rev-parse HEAD).Trim()
  $targetingAssetBaseUrl = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$targetingAssetSha/public/prd/genuine-game-distribution-phase1/07-targeting-dashboard"
  if ($targetingAssetSha.Length -ne 40) { throw "Unexpected asset commit SHA" }
  powershell -ExecutionPolicy Bypass -File "C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1" -Path "prd/最终文档/正版发行平台一期/07-精准化投放与发行数据看板PRD.md"
  git diff --check -- "prd/最终文档/正版发行平台一期/07-精准化投放与发行数据看板PRD.md" "public/prd/genuine-game-distribution-phase1/07-targeting-dashboard"
  git add -- "prd/最终文档/正版发行平台一期/07-精准化投放与发行数据看板PRD.md"
  git commit -m "docs: add targeted distribution and analytics PRD"
  ```

---

### Task 9: 跨文档对象、状态、页面文案和数据一致性复核

**Files:**
- Modify: `prd/最终文档/正版发行平台一期/01-正版发行平台一期产品总纲.md`
- Modify: `prd/最终文档/正版发行平台一期/02-开发者平台、厂商主页与游戏创建PRD.md`
- Modify: `prd/最终文档/正版发行平台一期/03-游戏商品与CDKEY供给管理PRD.md`
- Modify: `prd/最终文档/正版发行平台一期/04-游戏包体、测试审核与版本发布PRD.md`
- Modify: `prd/最终文档/正版发行平台一期/05-用户购买、权益与游戏库PRD.md`
- Modify: `prd/最终文档/正版发行平台一期/06-游戏下载、安装、启动与更新PRD.md`
- Modify: `prd/最终文档/正版发行平台一期/07-精准化投放与发行数据看板PRD.md`

- [ ] **Step 1: 核对发行方式文案**

  ```powershell
  rg -n "第三方平台激活|盖世直接下载" "prd/最终文档/正版发行平台一期"
  ```

  Expected: 游戏详情、确认、订单／结果和游戏库四类触点使用完全一致的两种文案；投放文档未出现弱化或第三种交付方式。

- [ ] **Step 2: 核对业务对象和归属**

  人工逐份检查厂商、游戏、商品、SKU、供应来源、包体版本、权益、投放计划的主数据归属与唯一标识。开发者的数据范围始终是本厂商，运营按授权角色查看，测试仅查看分配任务。

- [ ] **Step 3: 核对状态机和跨文档触发**

  对照总纲检查游戏资料通过后才能进入供给或版本流程、测试通过后才能待发布、发布后才能投放、包体权益有效后才能下载、下架后投放停止且旧权益按规则保留。

- [ ] **Step 4: 核对 CDKEY 复用边界**

  确认第 3 份只新增供给侧，第 5 份只补交付方式一致性和游戏库表现；用户购买、支付、Key 交付、激活指引和退款没有被重新定义出第二套冲突规则。

- [ ] **Step 5: 核对精准投放数据链路**

  曝光、点击、详情、购买／领取、Key 成功交付、下载和首次启动事件中的 `campaign_id + game_id` 可贯通；交付方式枚举只有两种；CDKEY 激活在无数据来源时不进入默认漏斗。

- [ ] **Step 6: 修复发现的冲突并提交**

  ```powershell
  git diff --check -- "prd/最终文档/正版发行平台一期"
  git add -- "prd/最终文档/正版发行平台一期"
  git commit -m "docs: align publishing platform PRD suite"
  ```

  Expected: 只提交七份 PRD 的一致性修正，不提交工作区其他改动。

---

### Task 10: 执行七份 PRD 的机械质量门禁

**Files:**
- Verify: `prd/最终文档/正版发行平台一期/*.md`

- [ ] **Step 1: 逐份执行质量校验**

  ```powershell
  $prdQualityValidator = "C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1"
  Get-ChildItem -LiteralPath "prd/最终文档/正版发行平台一期" -Filter "*.md" | Sort-Object Name | ForEach-Object {
    powershell -ExecutionPolicy Bypass -File $prdQualityValidator -Path $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "PRD quality validation failed: $($_.FullName)" }
  }
  ```

  Expected: 七份文档全部返回通过，循环不中断。

- [ ] **Step 2: 扫描结构禁项和未决占位语句**

  ```powershell
  rg -n "功能优先级|独立验收|研发评估状态|执行准备度|目标上线时间|详见 B 端|同 C 端|按设计稿|实现后补|后续补充|待后续确认" "prd/最终文档/正版发行平台一期"
  ```

  Expected: 无输出；若命中业务引用而非禁项，人工核对并改写为无歧义表述。

- [ ] **Step 3: 核对流程图数量和图片标题**

  每份 PRD 的 `2.2 产品流程` 只出现一张横向合成图；每个页面当前图必填；图片标题不超过 16 个字符，不含图号、章节号或冒号；产品流程图之外的页面图均位于对应页面六要素表内。

- [ ] **Step 4: 核对页面六要素与四列表格**

  每个实际页面恰有一张 `要素｜内容说明` 主表，六个要素齐全；成稿所有表格不超过四列；展示和交互各自从 `1.` 编号，补充说明中的两条以上规则按项换行。

- [ ] **Step 5: 核对待确认项**

  首款包体游戏付费／免费类型、实际 CDKEY 供给方式、可复用资源位和可直接使用用户标签若仍无业务事实，则在对应 PRD 写默认建议、影响范围和阻塞性；不得把它们伪写为已确认事实。

---

### Task 11: 经授权发布图片并验证飞书可导入性

**Files:**
- Verify: `public/prd/genuine-game-distribution-phase1/**/*.{png,jpg,webp}`
- Verify: `prd/最终文档/正版发行平台一期/*.md`

- [ ] **Step 1: 在外部发布前请求明确授权**

  向用户列出将推送的当前分支、仅包含本需求的提交和图片目录。未取得明确授权时不执行 `git push`，并将交付状态写为“本地 PRD 已完成；远程图片与飞书转存未验证”。

- [ ] **Step 2: 授权后推送包含图片的提交**

  使用当前仓库已配置的远程和当前分支执行非强制推送；不得包含工作区无关未提交改动，不得改写远程历史。

- [ ] **Step 3: 逐份执行远程图片校验**

  ```powershell
  $prdImageValidator = "C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-images.ps1"
  Get-ChildItem -LiteralPath "prd/最终文档/正版发行平台一期" -Filter "*.md" | Sort-Object Name | ForEach-Object {
    powershell -ExecutionPolicy Bypass -File $prdImageValidator -PrdPath $_.FullName -VerifyRemote
    if ($LASTEXITCODE -ne 0) { throw "PRD image validation failed: $($_.FullName)" }
  }
  ```

  Expected: 所有图片最终响应为 `200`，MIME 为支持的图片类型，文件大小大于 0，地址使用固定提交 SHA。

- [ ] **Step 4: 经授权进行单图飞书真实导入冒烟**

  选择总纲横向流程图，将包含标准 Markdown 图片语法的最小内容导入用户指定的飞书测试文档；只有在飞书实际显示转存后的图片时，才能记录“飞书转存验证通过”。若失败，保留 Markdown 和原图目录，按标题、固定提交和缓存差异排查，不用公网 `200` 代替真实导入结论。

- [ ] **Step 5: 冒烟通过后再批量导入或交付**

  用户未要求代为写入飞书时，只交付七份 Markdown、固定链接和验证结论；不得擅自新建或覆盖飞书文档。

---

### Task 12: 最终角色复核与交付

**Files:**
- Verify: `docs/superpowers/specs/2026-09-01-genuine-game-distribution-platform-phase1-design.md`
- Verify: `prd/最终文档/正版发行平台一期/*.md`

- [ ] **Step 1: 按规格章节逐项映射**

  对照规格第 3—10 章，逐项确认混合发行、开发者平台、固定厂商主页、CDKEY 供给、包体测试发布、权益、下载启动更新、规则式精准投放、状态、异常和三条验收分支分别落在一份主 PRD 中，没有遗漏或相互矛盾。

- [ ] **Step 2: 完成角色门禁**

  - 研发：触发、权限、状态、数据来源、异常、降级和冲突均无需猜测。
  - 测试：主链路、分支、边界、失败反馈、历史数据和恢复结果可直接转成用例。
  - 设计：现状证据、保留项、改动范围、页面层级和全部状态已明确，未擅自增加入口或弹窗。
  - 运营：配置字段、默认值、生效／失效、权限、日志和 C 端表现一致。
  - 数据：指标公式、事件、参数、枚举、去重和时间窗口一致。

- [ ] **Step 3: 检查仓库差异**

  ```powershell
  git status --short
  git diff --check
  git log --oneline -15
  ```

  Expected: 本需求提交可单独识别；无空白错误；无关脏文件未被加入提交。

- [ ] **Step 4: 形成最终交付结论**

  向用户只报告七份文件路径、每份核心范围、质量校验结果、远程图片验证结果、飞书真实导入结果和仍阻塞的业务待确认项。若图片未推送或飞书未做真实导入，必须明确区分“本地完成”“公网验证”和“飞书转存验证”三种状态。

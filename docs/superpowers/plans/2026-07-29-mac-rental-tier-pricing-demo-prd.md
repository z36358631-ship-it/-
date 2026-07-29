# Mac Rental Tier Pricing Demo and PRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的三档成本、时租/周租引流价和永久盈利价同步到 Mac 租号标注版 Demo 与正式 PRD。

**Architecture:** Demo 在商品版本上保存成本档、成本快照、逐小时时租表、周租价和永久价，客户端只读取最终售价；订单创建时保存价格快照。PRD 在原有单文档内追加 V2.4 变更并修订冲突口径，旧功能拆分版标记为历史归档。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Markdown、浏览器 Smoke Test、Git。

---

### Task 1: 更新 Demo 定价数据

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: 增加三档定价配置**

新增低、标准、高成本档配置，包含 2/6/12/18/24 小时时租和周租价格；给各游戏分配成本档。

- [ ] **Step 2: 生成逐小时时租表**

根据五个锚点生成 2～24 小时的演示价格表，金额保留 1 位小数；`getCheckoutPrice()` 只读取该表。

- [ ] **Step 3: 更新永久价**

永久价按 Steam 非促销原价的 25% 生成，所有现有 SKU 默认上线；永久不进入首单 5 折。

- [ ] **Step 4: 保存订单价格快照**

新订单保存成本档、取号成本、展示标准价、实付价、是否首单、价格版本和锁价时间。

### Task 2: 更新 Demo 页面和后台

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: 调整确认订单套餐**

移除日租，保留时租、周租、永久；24 小时继续显示时租控件。

- [ ] **Step 2: 调整首单展示**

时租、周租显示首单 5 折；永久、续租、重新租用和非首单只显示标准实付金额。

- [ ] **Step 3: 调整商品管理**

版本价格区展示内部成本、同步时间、价格版本、五个时租锚点、周租和永久；新建商品表单使用相同字段。

- [ ] **Step 4: 更新标注和演示文案**

删除“日租”“永久预埋”等旧文案，注明成本档仅 B 端可见、订单创建后锁价。

### Task 3: 更新 Demo 自动检查

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: 替换旧套餐断言**

将“时租、日租、周租”和“24 小时转日租”断言替换为“时租、周租、永久”和“24 小时仍为时租”。

- [ ] **Step 2: 增加价格断言**

验证低/标准/高三档锚点、逐小时价格递增、平均小时价递减、周租价和永久25%价格。

- [ ] **Step 3: 增加促销和锁价断言**

验证永久不打折，新订单保存完整价格快照，续租和重新租用按最新标准价结算。

- [ ] **Step 4: 运行浏览器 Smoke Test**

打开 Demo，执行内置检查；预期所有检查通过且无控制台错误。

### Task 4: 更新正式 PRD

**Files:**
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`

- [ ] **Step 1: 追加 V2.4 版本记录**

记录三档成本、时租/周租新价格、永久上线、首单范围、每日同步和订单锁价。

- [ ] **Step 2: 统一套餐与价格口径**

将新订单套餐统一为时租、周租、永久；加入三档完整价表和中间小时配置规则，保留历史日租兼容说明。

- [ ] **Step 3: 更新 C 端和 B 端规则**

明确 C 端不显示成本，B 端展示成本档、同步时间、价格版本、地区原价、永久系数和异常状态。

- [ ] **Step 4: 更新服务端、埋点和运营**

补充成本同步、创单锁价、续租重定价、永久60%封顶、成本高于 ¥8 的处理，以及相应埋点参数。

- [ ] **Step 5: 标记旧拆分附录为历史归档**

正式开发与测试只以主 PRD 和最新 Demo 为准，避免旧“日租/永久预埋”口径继续被引用。

### Task 5: 校验并提交

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`
- Create: `docs/superpowers/specs/2026-07-29-mac-rental-tier-pricing-design.md`
- Create: `docs/superpowers/plans/2026-07-29-mac-rental-tier-pricing-demo-prd.md`

- [ ] **Step 1: 扫描旧口径**

运行：

```powershell
rg -n "日租|永久.*预埋|24 小时.*日租|24小时.*日租|时租/日租/周租" "Mac端demo/mac端租号功能/Mac端租号功能-标注版.html" "prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md"
```

预期：仅历史订单兼容说明中允许出现“日租”。

- [ ] **Step 2: 校验 PRD 图片**

确认所有 Markdown 图片仍使用固定 40 位提交 SHA 的公开 HTTPS 地址；若截图内容更新，先生成本地 PNG，获得发布授权后再推送并替换 SHA。

- [ ] **Step 3: 检查差异范围**

运行：

```powershell
git diff --check -- "Mac端demo/mac端租号功能/Mac端租号功能-标注版.html" "prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md"
```

预期：无空白错误；不包含其他文件修改。

- [ ] **Step 4: 提交**

仅暂存本计划列出的四个文件并创建本地提交；不推送远端。

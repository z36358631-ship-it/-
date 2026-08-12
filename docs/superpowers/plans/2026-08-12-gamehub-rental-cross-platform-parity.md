# GameHub Rental Cross-Platform Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 APP 与 Mac 在租号售卖、会员、订单、履约、提醒和凭据安全上使用同一套功能规则，同时保留平台布局与支付载体差异。

**Architecture:** 以 APP 最终业务常量和状态映射为交易基线，更新 Mac 单文件 Demo 与 PRD；以 Mac 会员使用单和凭据生命周期为安全基线，补齐 APP 模板。新增跨端静态契约，复用两端 Playwright 回归验证运行时行为。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Node.js、Playwright Core、Markdown PRD、taskctl。

---

### Task 1: 建立跨端一致性失败契约

**Files:**
- Create: `tools/verify-rental-cross-platform-parity.mjs`
- Test: `tools/verify-rental-cross-platform-parity.mjs`

- [ ] **Step 1: 增加源码规则矩阵**

读取 APP 模板、APP 后台片段、Mac 标注 Demo 和两端 PRD，逐项断言：`time-rental/entitlement`、标准版、周/月/季、租号介绍、会员首次说明、五种订单状态、15 分钟单次提醒、第三方凭据、会员使用单切换、5 分钟短时授权和 60 秒条件清理。

- [ ] **Step 2: 增加旧口径禁用扫描**

Mac 当前正向实现不得出现 `年度会员`、`永久会员`、`资源分配中`、`5分钟提醒`、三版本选择和搜索在租人数；历史兼容说明允许保留并必须明确为历史快照。

- [ ] **Step 3: 运行并确认测试先失败**

```powershell
node tools/verify-rental-cross-platform-parity.mjs
```

Expected: 输出未统一项名称并以非零状态退出。

### Task 2: 统一 Mac 商品、会员和说明

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Test: `tools/verify-mac-rental-membership.cjs`
- Test: `tools/verify-rental-cross-platform-parity.mjs`

- [ ] **Step 1: 改造商品与确认订单**

增加稳定售卖模式；热门游戏展示按小时、日租、周租，非热门游戏展示首次体验、单游戏永久、开会员畅玩。客户端只发布标准版，删除版本选择控件但保留订单快照版本字段。

- [ ] **Step 2: 改造会员中心**

将套餐改为周卡、月卡、季卡；增加每会话一次的关于会员弹窗、四项权益、云存档信息区和生效有效期；删除远程协助正向文案。

- [ ] **Step 3: 增加租号介绍**

确认订单右上角增加 `租号介绍`，弹窗展示作用、使用方法、注意事项三组问答；保留五项租号权益与 3 天无理由规则入口。

- [ ] **Step 4: 更新 Mac Smoke 契约**

把 `monthly,annual,lifetime`、三版本、旧权益选择和 15/5 分钟断言替换为新规则；保留扫码支付、Steam 置顶助手和可租号筛选断言。

- [ ] **Step 5: 运行 Mac 回归**

```powershell
node tools/verify-mac-rental-membership.cjs
```

Expected: Smoke 和截图契约全部通过，无页面脚本错误。

### Task 3: 统一 Mac 状态、动作、履约与提醒

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Test: `tools/verify-mac-rental-membership.cjs`

- [ ] **Step 1: 收敛发现和搜索状态**

使用 `已租号 → 可畅玩 → 最低租号价` 优先级；搜索不显示剩余时长、权益来源和在租人数。Mac 找游戏可租号筛选继续保留。

- [ ] **Step 2: 收敛订单中心**

Tab 改为全部订单、待支付、可使用；用户可见状态映射为待支付、租赁中、退款中、已退款、已结束。列表过滤申请售后，详情保留。

- [ ] **Step 3: 删除客户端账号分配中**

支付成功可履约直接进入租赁中；最终无资源进入退款中。单游戏永久不再用超长租期绑定账号，启动时创建短时使用单。

- [ ] **Step 4: 补齐第三方凭据和动作互斥**

按游戏配置展示 Rockstar Games 等第三方信息；免费获取不显示租号，终态根据权益显示可畅玩或租号开玩。

- [ ] **Step 5: 统一临期提醒**

只保留剩余时间首次跨入 15 分钟的一次提醒，删除 5 分钟分支并保留 T0 回收。

### Task 4: 补齐 APP 会员切换和凭据安全

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/build-app-rental-demo.mjs`
- Modify: `tools/verify-app-rental-demo.mjs`
- Generated: `demos/APP租号功能/盖世游戏APP租号功能demo.html`
- Generated: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`

- [ ] **Step 1: 增加会员使用单状态机**

同一用户只允许一个活动会员使用单；切换游戏先结束旧使用单、撤销会话和释放账号。释放失败返回原使用单并禁止准备第二个账号。

- [ ] **Step 2: 增加敏感凭据生命周期**

账号、密码和验证码读取 5 分钟短时授权；复制值 60 秒后执行条件清理；退后台、关闭、到期、退款和换号立即关闭敏感视图并使授权失效。

- [ ] **Step 3: 扩展测试 API 与 Playwright 断言**

测试连续启动两款会员游戏、释放失败、短时授权过期、复制值条件清理和退后台清理；确认一键上号 Demo 仍只演示成功。

- [ ] **Step 4: 构建和运行 APP 回归**

```powershell
node tools/build-app-rental-demo.mjs
node tools/verify-app-rental-demo.mjs
```

Expected: 构建成功，既有全部分组和新增会员切换/凭据安全分组通过。

### Task 5: 同步后台与两端 PRD

**Files:**
- Modify: `demos/APP租号功能/app-rental-admin.fragment.html`
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`

- [ ] **Step 1: 更新后台 Mac 数据**

Mac Tab 商品改为稳定双售卖模式和当前标准版；会员套餐改为周卡、月卡、季卡。历史年度/永久会员数据仅作为历史订单快照，不进入新购配置。

- [ ] **Step 2: 更新 Mac PRD**

版本表追加 2026-08-12 修订行；正文用当前规则覆盖旧正向说明，明确历史套餐和多版本兼容、15 分钟单次提醒、无分配中、会员首次说明、租号介绍和第三方凭据。

- [ ] **Step 3: 更新 APP PRD**

补充会员使用单切换、释放失败保护、5 分钟短时授权和 60 秒条件清理；保持已有售卖、会员、订单与 15 分钟规则不变。

- [ ] **Step 4: 执行 PRD 自查**

检查状态、异常、并发、时间、金额、敏感信息、国内外差异、历史兼容和验收条目；不生成或发布新截图 URL。

### Task 6: 最终验证与任务板回写

**Files:**
- Test: `tools/verify-rental-cross-platform-parity.mjs`
- Test: `tools/verify-app-rental-demo.mjs`
- Test: `tools/verify-mac-rental-membership.cjs`
- Taskboard: `GUANWANGGAID-3`

- [ ] **Step 1: 执行三组自动验证**

```powershell
node tools/verify-rental-cross-platform-parity.mjs
node tools/build-app-rental-demo.mjs
node tools/verify-app-rental-demo.mjs
node tools/verify-mac-rental-membership.cjs
git diff --check -- "demos/APP租号功能" "Mac端demo/mac端租号功能/Mac端租号功能-标注版.html" "prd/【盖世游戏APP】游戏租号需求" "prd/【盖世游戏Mac】游戏租号需求" tools
```

Expected: 跨端契约、APP 回归、Mac Smoke 全部通过，目标文件无空白错误。

- [ ] **Step 2: 视觉检查关键页面**

检查 Mac 确认订单、会员首次弹窗、会员中心、订单中心、第三方凭据、15 分钟提醒；检查 APP 会员切换结果和凭据关闭。不得出现按钮越界、遮挡、旧套餐或账号分配中文案。

- [ ] **Step 3: 回写任务板并提交评审**

读取 `GUANWANGGAID-3` 最新版本，添加本轮变更、自动验证、视觉证据和剩余风险评论；再用最新 `version` 移到 `in_review`，不直接置为 `done`。

## 完成判定

- 两端相同业务上下文得到相同售卖、SKU、资格、状态和动作。
- 两端新购只显示标准版、周卡/月卡/季卡和 15 分钟单次提醒。
- Mac 已具备会员首次说明、租号介绍、第三方凭据和无分配中的五状态订单。
- APP 已具备会员单活动使用单和等价凭据安全能力。
- 两端 Demo、后台、PRD和自动验证一致，平台布局差异保留。

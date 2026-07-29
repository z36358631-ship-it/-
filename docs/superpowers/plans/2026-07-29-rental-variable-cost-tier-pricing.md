# Rental Variable Cost Tier Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将租号测算从固定¥5取号价改为供应商浮动成本分档，并下调时租、周租引流价后重新计算一期Mac与二期APP利润。

**Architecture:** 供应商Top11～50按低、标准、高三档成本测算，后台每日同步成本并锁定订单价格快照；自建账号使用低价档，供应商账号按成本档展示不同价格。时租、周租全部支持首单5折并允许一次拉新补贴，永久继续执行供应商成本不超过实付60%的规则。

**Tech Stack:** Markdown、PowerShell金额校验、Git。

---

### Task 1: 更新浮动成本与引流价格

**Files:**
- Modify: `prd/最终文档/【商业测算】《盖世游戏》租号业务国内与美国市场测算.md`

- [ ] **Step 1: 将固定取号价改为三档成本**

写入低档¥3、标准档¥5、高档¥8的测算口径。按订单热度使用高档50%、标准档30%、低档20%的基准权重，避免按游戏数量平均后低估热门游戏成本。

- [ ] **Step 2: 更新引流套餐价格**

写入已确认的低、标准、高三档时租和周租价格；所有档位均支持首单5折。

- [ ] **Step 3: 写清价格同步规则**

供应商成本每日同步，价格档位每日最多更新一次；订单创建后保存价格快照，租期内不跟随供应商调价。

### Task 2: 区分引流与盈利成本规则

**Files:**
- Modify: `prd/最终文档/【商业测算】《盖世游戏》租号业务国内与美国市场测算.md`

- [ ] **Step 1: 更新引流规则**

时租、周租允许首单取号成本超过实付60%，差额计入拉新成本；非首单售价至少覆盖一次取号成本。

- [ ] **Step 2: 保留永久规则**

永久套餐继续使用：

```text
最大供应商取号次数 = floor（永久实付 × 60% ÷ 单次取号价）
```

- [ ] **Step 3: 增加成本异常处理**

供应商单次取号价高于¥8时不自动进入更高售价，优先转自建池或人工评估。

### Task 3: 重算一期与二期

**Files:**
- Modify: `prd/最终文档/【商业测算】《盖世游戏》租号业务国内与美国市场测算.md`

- [ ] **Step 1: 更新客单价与GMV**

按时租时长结构40%、25%、15%、10%、10%，以及时租75%、周租20%、永久5%的订单结构计算新客单价。

- [ ] **Step 2: 更新方案对比**

一期Mac按295单/月重算；二期APP按25,744单/月重算。分别输出按次付费与6:4分成的供应商成本、平台月贡献利润和方案差额。

- [ ] **Step 3: 增加降价目标**

计算降价后维持原月贡献利润所需的订单增幅，作为引流价格是否有效的上线判断指标。

### Task 4: 校验并提交

**Files:**
- Modify: `prd/最终文档/【商业测算】《盖世游戏》租号业务国内与美国市场测算.md`

- [ ] **Step 1: 校验金额勾稽**

逐行检查：

```text
平台月贡献利润 + 供应商成本 + 5%支付成本 = 月GMV
```

- [ ] **Step 2: 扫描陈旧口径**

确认正文不再将所有供应商游戏固定按¥5计费，不残留美元金额，不把登录次数当作取号次数。

- [ ] **Step 3: 提交**

```bash
git add docs/superpowers/plans/2026-07-29-rental-variable-cost-tier-pricing.md "prd/最终文档/【商业测算】《盖世游戏》租号业务国内与美国市场测算.md"
git commit -m "docs: model variable rental supplier pricing"
```

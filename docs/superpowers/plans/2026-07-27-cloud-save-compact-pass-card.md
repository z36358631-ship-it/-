# Cloud Save Compact Pass Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将存档广场顶部的云存档月度套餐卡片压缩到原高度约一半，移除两行冗余说明，同时保留套餐购买、续费和 ¥6 单买能力。

**Architecture:** 仅调整客户端单文件 Demo 中的套餐卡片 CSS 与 `renderPackageCard()` 输出，不修改已有套餐状态机和购买函数。随后更新 PRD 对应页面说明与截图，图片继续使用固定 Git 提交的 jsDelivr 地址。

**Tech Stack:** HTML、CSS、原生 JavaScript、Markdown、Microsoft Edge Headless、Git

---

## File Structure

- Modify: `demos/充值与商城/云存档付费demo.html` — 套餐卡片视觉与四种状态按钮。
- Modify: `public/prd/cloud-save-monthly/02-monthly-pass-plaza.png` — 精简后顶部套餐卡截图。
- Modify: `demos/【Prd】《盖世游戏》云存档付费需求/【Prd】《盖世游戏》云存档付费需求.md` — 界面规则和固定图片地址。

### Task 1: 精简顶部套餐卡

**Files:**
- Modify: `demos/充值与商城/云存档付费demo.html:54-62`
- Modify: `demos/充值与商城/云存档付费demo.html:265-282`

- [ ] **Step 1: 记录修改前静态检查结果**

Run:

```powershell
rg -n "package-meta|购买后立即生效|原 ¥6 单个存档永久购买仍可选择|package-action" "demos/充值与商城/云存档付费demo.html"
```

Expected: 顶部卡片渲染仍包含 `.package-meta` 和两行待删除文案。

- [ ] **Step 2: 将卡片改为左右两栏紧凑布局**

将套餐卡样式调整为以下结构：

```css
.package-card{
  min-height:92px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:10px 12px;
}
.package-main{min-width:0;flex:1}
.package-side{
  width:92px;
  flex:0 0 92px;
  display:flex;
  flex-direction:column;
  align-items:flex-end;
  gap:7px;
}
.package-action{
  width:80px;
  min-height:44px;
  padding:7px 8px;
}
```

保留现有黑金渐变、促销标签、圆角和装饰图形。

- [ ] **Step 3: 精简四种状态输出**

`renderPackageCard()` 仅输出以下可见信息：

```text
左侧：试运营优惠 / 云存档月度套餐 / 全部存档 30 天不限次使用
右侧：¥18/30天 / 开通、续费或已续费按钮
```

按钮文案与行为：

```text
未开通：开通 → openPackagePurchase('buy')
有效：续费 → openPackagePurchase('renew')
已到期：续费 → openPackagePurchase('renew')
已提前续费：已续费 → 置灰且不可点击
```

删除 `.package-meta` 及以下两行：

```text
购买后立即生效 · 30 天有效 · 非自动续费
原 ¥6 单个存档永久购买仍可选择
```

- [ ] **Step 4: 运行静态回归检查**

Run:

```powershell
rg -n "package-main|package-side|min-height:92px|openPackagePurchase\\('buy'\\)|openPackagePurchase\\('renew'\\)" "demos/充值与商城/云存档付费demo.html"
rg -n "package-meta|原 ¥6 单个存档永久购买仍可选择" "demos/充值与商城/云存档付费demo.html"
```

Expected: 第一条命中新布局和原购买逻辑；第二条不再命中顶部卡片实现。

### Task 2: 截图与视觉检查

**Files:**
- Modify: `public/prd/cloud-save-monthly/02-monthly-pass-plaza.png`

- [ ] **Step 1: 使用 Edge Headless 打开 Demo**

Run:

```powershell
& "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe" --headless --disable-gpu --hide-scrollbars --window-size=1440,1000 --screenshot=".tmp/cloud-save-compact-card-full.png" "file:///C:/Users/z3635/官网改动/demos/充值与商城/云存档付费demo.html"
```

Expected: 生成可读取的 PNG 页面截图。

- [ ] **Step 2: 检查卡片**

视觉检查：

```text
卡片高度 88～96px
左右两栏无重叠
价格与按钮单行
按钮点击热区不小于 72×44px
两行待删除说明不可见
首排存档内容上移
```

- [ ] **Step 3: 更新 PRD 截图**

将包含顶部套餐卡片的手机区域保存为：

```text
public/prd/cloud-save-monthly/02-monthly-pass-plaza.png
```

保持 PNG 格式和清晰度，不改动其他 16 张 PRD 图片。

### Task 3: 同步 PRD

**Files:**
- Modify: `demos/【Prd】《盖世游戏》云存档付费需求/【Prd】《盖世游戏》云存档付费需求.md:145`

- [ ] **Step 1: 更新套餐权益卡说明**

PRD 明确以下规则：

```text
卡片位于存档广场顶部；
采用左右两栏紧凑布局，高度 88～96px；
左侧展示促销标签、套餐名称和“全部存档 30 天不限次使用”；
右侧展示 ¥18/30天及开通、续费或已续费按钮；
顶部卡片不展示购买生效、非自动续费和 ¥6 单买说明；
¥6 永久购买入口仍保留在存档详情页。
```

- [ ] **Step 2: 发布截图并更新固定地址**

先单独提交更新后的图片，取得真实完整提交哈希：

```powershell
git add -- "public/prd/cloud-save-monthly/02-monthly-pass-plaza.png"
git commit -m "docs: refresh compact cloud save pass image"
git rev-parse HEAD
```

再把 PRD 中 `02-monthly-pass-plaza.png` 的 jsDelivr 地址替换为该真实完整哈希。

- [ ] **Step 3: 检查 Markdown**

Run:

```powershell
rg -n "02-monthly-pass-plaza.png|88～96px|左右两栏|顶部卡片不展示" "demos/【Prd】《盖世游戏》云存档付费需求/【Prd】《盖世游戏》云存档付费需求.md"
```

Expected: 新规则和唯一图片地址均命中。

### Task 4: 联合验证与提交

**Files:**
- Verify: `demos/充值与商城/云存档付费demo.html`
- Verify: `public/prd/cloud-save-monthly/02-monthly-pass-plaza.png`
- Verify: `demos/【Prd】《盖世游戏》云存档付费需求/【Prd】《盖世游戏》云存档付费需求.md`

- [ ] **Step 1: 检查业务边界**

Run:

```powershell
rg -n "永久拥有此存档|¥6永久购买|doBuy\\(\\)" "demos/充值与商城/云存档付费demo.html"
```

Expected: 详情页 ¥6 单买入口和函数仍存在。

- [ ] **Step 2: 检查变更范围**

Run:

```powershell
git status --short -- "demos/充值与商城/云存档付费demo.html" "public/prd/cloud-save-monthly/02-monthly-pass-plaza.png" "demos/【Prd】《盖世游戏》云存档付费需求/【Prd】《盖世游戏》云存档付费需求.md" "docs/superpowers/plans/2026-07-27-cloud-save-compact-pass-card.md"
```

Expected: 仅显示本计划列出的目标文件，不纳入工作区其他改动。

- [ ] **Step 3: 验证飞书图片地址**

对最终 jsDelivr 地址执行 HEAD 请求：

```powershell
$prd = Get-Content -Raw -LiteralPath "demos/【Prd】《盖世游戏》云存档付费需求/【Prd】《盖世游戏》云存档付费需求.md"
$url = [regex]::Match($prd, "https://cdn\.jsdelivr\.net/gh/z36358631-ship-it/-@[^)]+/public/prd/cloud-save-monthly/02-monthly-pass-plaza\.png").Value
Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing
```

Expected: `StatusCode = 200` 且 `Content-Type = image/png`。

- [ ] **Step 4: 精确提交并推送**

仅提交本需求文件，推送到 `origin/master`；如远端已有新提交，使用基于最新远端的独立临时工作树合并，禁止覆盖或暂存工作区其他文件。

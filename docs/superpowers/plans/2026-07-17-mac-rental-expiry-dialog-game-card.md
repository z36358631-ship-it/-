# Mac 租号到期弹窗游戏卡片实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让未租用拦截、过期安装包启动拦截和到期退出结果三类弹窗统一展示游戏封面、游戏名与当前最低时租价，并移除卡片中的平台及操作副文案。

**Architecture:** 在现有单文件 Demo 中新增 `rentalStartingPrice(gameId)` 和 `renderRentalGameCard(gameId)` 两个小型辅助函数，三类弹窗共用同一 DOM 结构与 CSS。业务按钮、重新租用跳转和订单计价逻辑保持不变；嵌入式 Smoke 先增加失败断言，再完成最小实现。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、内嵌 Smoke、Chrome/Playwright Core、Markdown PRD、PNG 截图。

---

## 文件结构与职责

- `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`：统一卡片样式、参考价辅助函数、三类弹窗渲染和嵌入式 Smoke。
- `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`：主 PRD 的弹窗内容、价格口径与验收标准。
- `prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F004-Steam一键上号.md`：未租用与过期启动拦截的客户端规则。
- `prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F005-用户订单续租与售后.md`：到期退出结果弹窗的客户端规则。
- `prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c05-non-target-guard.png`：此前未租用拦截去掉副文案后的证据。
- `prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c12-expired-launch-block.png`：过期启动拦截增加卡片后的证据。
- `prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c13-expiry-ended-result.png`：到期退出结果增加卡片后的证据。

### Task 1: 先用 Smoke 固化三类弹窗契约

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html:680-706,762-767`

- [ ] **Step 1: 为到期退出结果弹窗增加失败断言**

在现有 `expiry-terminal-dialog-exact-actions` 检查后加入：

```js
const expiryCard=expiryLayer.querySelector('.rental-game-card'),expiryGame=gameById(currentOrder.gameId),expiryProduct=productForGame(currentOrder.gameId),expiryPrice=expiryProduct?Math.min(...expiryProduct.versions.map(version=>version.prices.hour)):expiryGame.price;
check('expiry-terminal-dialog-game-card',Boolean(expiryCard)&&expiryCard.querySelector('img')?.alt===expiryGame.name&&expiryCard.querySelector('strong')?.textContent.trim()===expiryGame.name&&expiryCard.querySelector('.rental-game-card-price')?.textContent.trim()===`${money(expiryPrice)} 租号`&&!expiryCard.querySelector('span')&&!['Steam ·','启动游戏','下载 783M','获取游戏'].some(text=>expiryCard.textContent.includes(text)));
```

- [ ] **Step 2: 为过期安装包启动拦截增加失败断言**

在 `launch-order-expired-blocked-no-state-side-effects` 检查之后、`closeConfirm()` 之前取得卡片并检查：

```js
const expiredLaunchCard=launchLayer.querySelector('.expired-launch-dialog .rental-game-card'),expiredLaunchGame=gameById(expiredOrder.gameId),expiredLaunchProduct=productForGame(expiredOrder.gameId),expiredLaunchPrice=expiredLaunchProduct?Math.min(...expiredLaunchProduct.versions.map(version=>version.prices.hour)):expiredLaunchGame.price;
check('expired-launch-dialog-game-card',Boolean(expiredLaunchCard)&&expiredLaunchCard.querySelector('img')?.alt===expiredLaunchGame.name&&expiredLaunchCard.querySelector('strong')?.textContent.trim()===expiredLaunchGame.name&&expiredLaunchCard.querySelector('.rental-game-card-price')?.textContent.trim()===`${money(expiredLaunchPrice)} 租号`&&!expiredLaunchCard.querySelector('span')&&!['Steam ·','启动游戏','下载 783M','获取游戏'].some(text=>expiredLaunchCard.textContent.includes(text)));
```

- [ ] **Step 3: 替换此前未租用弹窗对旧副文案的断言**

在 `non-target-owned-guard` 后加入“启动游戏”分支的统一卡片检查：

```js
const ownedGuardCard=rentDialog.querySelector('.rental-game-card'),ownedGuardGame=gameById('forza6'),ownedGuardProduct=productForGame('forza6'),ownedGuardPrice=ownedGuardProduct?Math.min(...ownedGuardProduct.versions.map(version=>version.prices.hour)):ownedGuardGame.price;
check('non-target-owned-guard-game-card',Boolean(ownedGuardCard)&&ownedGuardCard.querySelector('img')?.alt===ownedGuardGame.name&&ownedGuardCard.querySelector('strong')?.textContent.trim()===ownedGuardGame.name&&ownedGuardCard.querySelector('.rental-game-card-price')?.textContent.trim()===`${money(ownedGuardPrice)} 租号`&&!ownedGuardCard.querySelector('span')&&!['Steam ·','启动游戏','下载 783M','获取游戏'].some(text=>ownedGuardCard.textContent.includes(text)));
```

再把 `non-target-unowned-guard` 中要求出现 `Steam · 获取游戏` 的条件替换为统一卡片检查：

```js
const unownedGuardCard=rentDialog.querySelector('.rental-game-card'),unownedGuardGame=gameById(unownedTarget),unownedGuardProduct=productForGame(unownedTarget),unownedGuardPrice=unownedGuardProduct?Math.min(...unownedGuardProduct.versions.map(version=>version.prices.hour)):unownedGuardGame.price;
check('non-target-unowned-guard',state.guardOperation==='acquire'&&Boolean(rentDialog)&&rentDialog.textContent.includes('当前游戏未租用')&&Boolean(unownedGuardCard)&&unownedGuardCard.querySelector('img')?.alt===unownedGuardGame.name&&unownedGuardCard.querySelector('strong')?.textContent.trim()===unownedGuardGame.name&&unownedGuardCard.querySelector('.rental-game-card-price')?.textContent.trim()===`${money(unownedGuardPrice)} 租号`&&!unownedGuardCard.querySelector('span')&&!['Steam ·','启动游戏','下载 783M','获取游戏'].some(text=>unownedGuardCard.textContent.includes(text)));
```

- [ ] **Step 4: 运行 Smoke，确认新契约在实现前失败**

Run:

```powershell
$path=(Resolve-Path 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html').Path
$url=([System.Uri]::new($path).AbsoluteUri)+'?smoke=1'
$dom=(& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --disable-gpu --virtual-time-budget=20000 --dump-dom $url 2>$null)-join "`n"
$encoded=[regex]::Match($dom,'<pre id="smokeResult" hidden="">(.*?)</pre>','Singleline').Groups[1].Value
$result=([System.Net.WebUtility]::HtmlDecode($encoded)|ConvertFrom-Json)
$result.results|Where-Object{-not $_.pass}|Select-Object -ExpandProperty name
```

Expected: 至少输出 `expiry-terminal-dialog-game-card`、`expired-launch-dialog-game-card`、`non-target-owned-guard-game-card` 和 `non-target-unowned-guard`；Chrome 进程正常完成。

### Task 2: 实现可复用游戏租号卡片

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html:74-75,255-256,319-326`

- [ ] **Step 1: 用统一卡片样式替换旧的未租用卡片样式**

删除 `.rent-confirm-game`、`.rent-confirm-game img`、`.rent-confirm-game strong`、`.rent-confirm-game span` 和 `.rent-confirm-price` 规则，加入：

```css
.rental-game-card{display:grid;grid-template-columns:112px minmax(0,1fr) auto;align-items:center;gap:13px;margin-top:20px;padding:12px;border:1px solid #333638;border-radius:7px;background:#252627}
.rental-game-card img{width:112px;height:68px;object-fit:cover;border-radius:5px}
.rental-game-card strong{min-width:0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rental-game-card-price{color:#ff6268;font-size:15px;white-space:nowrap}
```

保留 `.rent-confirm-dialog`、`.rent-confirm-actions`、`.order-confirm-dialog` 和其他确认弹窗样式；支付确认、取消订单等 `.order-confirm-game` 不在本次范围内。

- [ ] **Step 2: 新增参考起租价与卡片渲染辅助函数**

在 `renderDetailGuard` 之前加入：

```js
function rentalStartingPrice(gameId){const g=gameById(gameId),p=productForGame(gameId),prices=(p?.versions||[]).map(version=>Number(version.prices?.hour)).filter(Number.isFinite);return prices.length?Math.min(...prices):g.price}
function renderRentalGameCard(gameId){const g=gameById(gameId);return `<div class="rental-game-card"><img src="${g.image}" alt="${g.name}" onerror="imageFallback(this)"><strong>${g.name}</strong><b class="rental-game-card-price">${money(rentalStartingPrice(gameId))} 租号</b></div>`}
```

- [ ] **Step 3: 让此前未租用弹窗使用统一卡片**

把 `renderDetailGuard` 改为只保留 `continueLabel`，并用辅助函数替换旧卡片：

```js
function renderDetailGuard(targetGame){const continueLabel={acquire:'获取',download:'下载',launch:'启动'}[state.guardOperation]||'操作';return `<div class="detail-guard-overlay" data-anno-target="detail-guard">${marker('29')}<section class="rent-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="rentConfirmTitle"><button class="rent-confirm-close" data-action="close-detail-guard" title="关闭">${icon('x',16)}</button><div class="rent-confirm-head"><div class="rent-confirm-icon">${icon('package',21)}</div><div><h2 id="rentConfirmTitle">当前游戏未租用</h2><p>是否进行租用？完成租号后即可继续${continueLabel}。</p></div></div>${renderRentalGameCard(targetGame.id)}<div class="rent-confirm-actions"><button class="mac-btn ghost" data-action="close-detail-guard">暂不租用</button><button class="mac-btn green" data-action="rent-guard-target" data-game="${targetGame.id}">${icon('arrow-right',14)} 去租号</button></div></section></div>`}
```

- [ ] **Step 4: 给两个到期弹窗加入统一卡片**

标题区之后、按钮区之前分别插入：

```js
${renderRentalGameCard(order.gameId)}
```

最终调用关系必须是：

```js
renderExpiredLaunchGuard(order) -> renderRentalGameCard(order.gameId)
renderExpiredEndDialog(order) -> renderRentalGameCard(order.gameId)
```

不修改两处弹窗现有标题、说明、按钮顺序或 `data-id`。

- [ ] **Step 5: 连续运行两次完整 Smoke**

Run twice:

```powershell
$path=(Resolve-Path 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html').Path
$url=([System.Uri]::new($path).AbsoluteUri)+'?smoke=1'
$dom=(& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --disable-gpu --virtual-time-budget=20000 --dump-dom $url 2>$null)-join "`n"
$encoded=[regex]::Match($dom,'<pre id="smokeResult" hidden="">(.*?)</pre>','Singleline').Groups[1].Value
$result=([System.Net.WebUtility]::HtmlDecode($encoded)|ConvertFrom-Json)
"$(@($result.results|Where-Object{$_.pass}).Count)/$(@($result.results).Count) status=$($result.pass)"
$result.results|Where-Object{-not $_.pass}|Select-Object -ExpandProperty name
```

Expected: 两次均为全量通过；新增三个检查后基线应为 `290/290 status=True`，且不输出失败检查名。

- [ ] **Step 6: 单独提交 Demo 与 Smoke**

```powershell
git add -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git commit --only -m "feat: unify mac rental dialog game cards" -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
```

Expected: 提交只包含一个 HTML 文件。

### Task 3: 同步主 PRD 与功能拆分文档

**Files:**
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md:210-221,341-348,420-437,971-975`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F004-Steam一键上号.md:39-52,118-129`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F005-用户订单续租与售后.md:37-50,124-139`

- [ ] **Step 1: 在主 PRD 写明统一弹窗卡片规则**

在游戏操作矩阵后加入：

```markdown
**拦截弹窗游戏卡片：** “当前游戏未租用”、过期本地包启动拦截和 T0 到期退出结果三类弹窗均展示当前游戏封面、游戏名及红色 `¥X 租号`；不展示 `Steam · 启动游戏/下载/获取游戏`、版本或订单状态等第二行副文案。`¥X` 为当前可售版本中的最低小时套餐参考价，最终应付金额以确认订单页实时计算为准。
```

把过期本地包矩阵行补充为“弹窗同时展示统一游戏卡片”，把到期退出说明补充为“结果弹窗展示统一游戏卡片”。

- [ ] **Step 2: 增加主 PRD 验收标准**

在现有 AC 表末尾加入：

```markdown
| AC-32 | 拦截弹窗游戏卡片 | 未租用拦截、过期安装包启动拦截和到期退出结果均展示对应游戏的封面、名称及当前最低时租价 `¥X 租号`；三类卡片均无平台、操作、版本或订单状态副文案 |
```

- [ ] **Step 3: 同步 F004 与 F005**

在 F004 客户端规则与验收标准中加入：

```markdown
- `[已确认]` 当前游戏未租用及过期本地包启动拦截均展示封面、游戏名与当前最低时租价 `¥X 租号`，不展示平台或操作副文案。
- `AC-F004-11 [客户端]` 两类启动拦截卡片的游戏信息和当前最低时租价准确，且不存在 `Steam · 启动游戏/下载/获取游戏` 副文案。
```

在 F005 到期处理规则与验收标准中加入：

```markdown
- `[已确认]` T0 到期退出结果弹窗展示封面、游戏名与当前最低时租价 `¥X 租号`，不展示平台、操作、版本或订单状态副文案。
- `AC-F005-15 [客户端]` 到期退出结果弹窗的游戏卡片与未租用、过期启动拦截样式及价格口径一致。
```

- [ ] **Step 4: 检查文档口径**

Run:

```powershell
rg -n "拦截弹窗游戏卡片|AC-32|AC-F004-11|AC-F005-15|最低时租价|Steam · 启动游戏" 'prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md' 'prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F004-Steam一键上号.md' 'prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F005-用户订单续租与售后.md'
```

Expected: 三份文档均出现新规则和新增 AC；`Steam · 启动游戏` 只作为“不得展示”的反例出现。

- [ ] **Step 5: 单独提交 PRD 文案**

```powershell
git add -- 'prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md' 'prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F004-Steam一键上号.md' 'prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F005-用户订单续租与售后.md'
git commit --only -m "docs: align mac rental dialog game cards" -- 'prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md' 'prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F004-Steam一键上号.md' 'prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F005-用户订单续租与售后.md'
```

Expected: 提交只包含三份 Markdown 文档。

### Task 4: 刷新截图并完成视觉验收

**Files:**
- Modify: `prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c05-non-target-guard.png`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c12-expired-launch-block.png`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c13-expiry-ended-result.png`

- [ ] **Step 1: 重新生成完整截图集**

Run:

```powershell
node tools/capture-mac-rental-prd-screenshots.js
```

Expected: 输出 25 个 PNG 文件名，最后一行为 `ERROR_COUNTS console=0 page=0 request=0`。

- [ ] **Step 2: 人工检查三个目标截图**

分别打开 `c05-non-target-guard.png`、`c12-expired-launch-block.png`、`c13-expiry-ended-result.png`，确认：

- 三张图均有封面、游戏名和右侧红色 `¥X 租号`。
- 卡片中均没有第二行灰色副文案。
- 两张到期图的标题、说明和按钮未被卡片挤压、截断或遮挡。
- `c12` 保留“取消、重新租用”，`c13` 保留“重新租用、返回首页”。

- [ ] **Step 3: 再运行一次完整 Smoke**

使用 Task 2 Step 5 命令。

Expected: `290/290 status=True`，无失败检查名。

- [ ] **Step 4: 只提交三张目标截图**

```powershell
git add -- 'prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c05-non-target-guard.png' 'prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c12-expired-launch-block.png' 'prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c13-expiry-ended-result.png'
git commit --only -m "docs: refresh mac rental dialog screenshots" -- 'prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c05-non-target-guard.png' 'prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c12-expired-launch-block.png' 'prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c13-expiry-ended-result.png'
```

Expected: 提交只包含三个 PNG 文件，不包含截图脚本重生成的其他文件。

### Task 5: 发布前证据与范围检查

**Files:**
- Verify only; no additional files.

- [ ] **Step 1: 检查本次提交范围**

```powershell
git show --stat --oneline HEAD~3..HEAD
git status --short
```

Expected: 本次功能提交只涉及一个 HTML、三份 PRD Markdown 和三个目标 PNG；工作区其他 Android 广告或既有修改仍保持原状态且未混入提交。

- [ ] **Step 2: 汇总本地验收证据**

交付内容必须包含：

- 最终 Smoke 通过数。
- 截图脚本错误计数。
- 三张截图的视觉检查结论。
- Demo、PRD 和截图提交 SHA。
- 尚未执行远端发布的明确说明。

- [ ] **Step 3: 在远端发布前取得用户授权**

向用户说明将推送 Demo、PRD 与三张资产图片，并等待明确的“推送/发布”确认；未获得确认时不执行 `git push`、GitHub Pages 更新或 CDN 链接替换。

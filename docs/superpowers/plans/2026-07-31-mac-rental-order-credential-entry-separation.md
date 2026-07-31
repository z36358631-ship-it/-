# Mac 租号订单登录信息入口拆分 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复订单“登录信息”的独立凭据弹窗，同时保持“登录游戏 → 手动登录”和游戏库入口使用 Steam 双栏登录窗。

**Architecture:** 在现有单文件 Demo 内将“独立查看凭据”和“Steam 手动登录”拆成两个明确函数，并让两种展示共用当前使用单、账号、验证码和敏感授权。独立弹窗通过 `surface='standalone'` 局部重绘，Steam 浮层通过 `surface='steam'` 局部重绘，任何凭据操作都不能重写 Steam 表单。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Node.js、Playwright、Markdown PRD、GitHub Pages、jsDelivr 固定提交图片。

---

## File map

- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html` — 入口路由、独立凭据弹窗、Steam 双栏窗、状态与 Smoke Test。
- Modify: `tools/verify-mac-rental-membership.cjs` — 浏览器级入口隔离验证与截图生成。
- Create: `public/prd/mac-rental/c07-order-login-information.png` — 订单独立登录信息弹窗截图。
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md` — V3.9、入口职责、异常、安全、埋点、验收和图示。
- Modify: `docs/superpowers/specs/2026-07-31-mac-rental-order-credential-entry-separation-design.md` — 仅在实现发现设计矛盾时修正，不扩大范围。

### Task 1: 先用测试锁定两个入口

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`，`window.__demoSmoke`
- Modify: `tools/verify-mac-rental-membership.cjs`

- [ ] **Step 1: 在 Demo Smoke Test 增加订单独立入口失败用例**

在现有 `credentialOrder` 用例中，进入订单详情后先触发：

```js
dispatchAction('open-manual-login',{dataset:{id:credentialOrder.id}});
await nextPaint();
const standaloneDialog=document.querySelector('.standalone-credential-dialog');
check(
  'order-credential-entry-opens-standalone-dialog',
  standaloneDialog
    && !standaloneDialog.querySelector('.steam-account-column')
    && !standaloneDialog.querySelector('.steam-qr-column')
    && standaloneDialog.textContent.includes('Steam 登录信息')
);
check(
  'standalone-credentials-masked-by-default',
  standaloneDialog
    && !standaloneDialog.textContent.includes(credentialAccount.loginName)
    && !standaloneDialog.textContent.includes(credentialAccount.loginPassword)
    && standaloneDialog.querySelector('[data-action="copy-login-account"]')
    && standaloneDialog.querySelector('[data-action="copy-login-password"]')
);
closeConfirm();
```

- [ ] **Step 2: 在 Playwright 验证脚本增加入口隔离断言**

订单详情点击 `[data-action="open-manual-login"]` 后返回：

```js
return {
  hasStandalone: Boolean(document.querySelector('.standalone-credential-dialog')),
  hasSteamWindow: Boolean(document.querySelector('.steam-account-column')),
  hasQrColumn: Boolean(document.querySelector('.steam-qr-column')),
  title: document.querySelector('.standalone-credential-dialog h3')?.textContent.trim(),
  hasAccountCopy: Boolean(document.querySelector('[data-action="copy-login-account"]')),
  hasPasswordCopy: Boolean(document.querySelector('[data-action="copy-login-password"]')),
};
```

断言：

```js
assert(result.hasStandalone, '订单登录信息未打开独立凭据弹窗');
assert(!result.hasSteamWindow && !result.hasQrColumn, '订单登录信息错误拉起 Steam 双栏窗');
assert(result.title === 'Steam 登录信息', '独立凭据弹窗标题不正确');
assert(result.hasAccountCopy && result.hasPasswordCopy, '独立凭据复制操作不完整');
```

- [ ] **Step 3: 运行测试并确认当前实现失败**

Run:

```powershell
node tools/verify-mac-rental-membership.cjs
```

Expected: FAIL，错误包含“订单登录信息未打开独立凭据弹窗”。

- [ ] **Step 4: 提交测试**

```powershell
git add -- "Mac端demo/mac端租号功能/Mac端租号功能-标注版.html" "tools/verify-mac-rental-membership.cjs"
git commit -m "test(rental): separate credential and Steam login entries"
```

### Task 2: 实现独立凭据弹窗与入口路由

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: 增加独立弹窗样式**

在 Steam 登录样式之后增加：

```css
.standalone-credential-dialog{width:min(620px,calc(100% - 32px));padding:22px;overflow:hidden}
.standalone-credential-dialog .credential-panel{display:grid;gap:8px;margin-top:18px}
.standalone-credential-dialog .credential-row{display:grid;grid-template-columns:88px minmax(0,1fr) auto;align-items:center;gap:10px;min-height:54px;padding:10px 12px;border:1px solid #35393b;border-radius:8px;background:#292b2c}
.standalone-credential-dialog .credential-countdown{grid-column:2/4}
.standalone-credential-dialog .credential-note{margin-top:12px;padding:10px;border:1px solid rgba(255,184,77,.18);border-radius:8px;background:rgba(255,184,77,.07);color:#d7bc88;font-size:10px;line-height:1.6}
.standalone-credential-dialog .credential-footer{min-height:26px;margin-top:10px;color:#777f82;font-size:9px}
```

- [ ] **Step 2: 明确凭据展示场景**

将 `state.credentialView` 扩展为：

```js
state.credentialView={
  orderId:'',
  surface:'',
  panelOpen:false,
  accountVisible:false,
  passwordVisible:false,
  guardCodeVisible:false,
  guardRequestStatus:'',
  copiedField:'',
  accessExpireAt:0
};
```

`surface` 只允许 `''`、`'standalone'`、`'steam'`。

- [ ] **Step 3: 将 Steam 函数重命名并固定场景**

将：

```js
function openManualLoginDialog(orderId,{refreshAccess=true}={})
```

改为：

```js
function openSteamManualLoginDialog(orderId,{refreshAccess=true}={})
```

函数成功校验后设置：

```js
Object.assign(state.credentialView,{
  orderId,
  surface:'steam',
  panelOpen:false,
  accountVisible:false,
  passwordVisible:false,
  copiedField:''
});
```

- [ ] **Step 4: 新增独立弹窗函数**

新增：

```js
function openStandaloneCredentialDialog(orderId,{refreshAccess=true}={}){
  const access=credentialAccess(orderId),now=serverNow();
  if(!access.ok){
    recordCredentialEvent('rental_credential_view',orderId,{
      result:'failed',
      errorCode:access.reason,
      action:'order_entry'
    });
    clearCredentialView(orderId);
    return showToast('登录信息已失效，请重新取号','error');
  }
  if(refreshAccess||Number(state.credentialView.accessExpireAt)<=now){
    state.credentialView.accessExpireAt=Math.min(
      Number(access.order.expireAt),
      now+5*60000
    );
  }
  Object.assign(state.credentialView,{
    orderId,
    surface:'standalone',
    panelOpen:false,
    accountVisible:false,
    passwordVisible:false,
    copiedField:''
  });
  return renderStandaloneCredentialDialog(orderId);
}
```

- [ ] **Step 5: 新增独立弹窗局部渲染**

新增：

```js
function renderStandaloneCredentialDialog(orderId=state.credentialView.orderId){
  const now=serverNow(),access=credentialAccess(orderId,now);
  const authorized=Number(state.credentialView.accessExpireAt)>now;
  if(!access.ok||!authorized){
    clearCredentialView(orderId);
    showToast('登录信息授权已失效','error');
    return false;
  }
  const {account,order}=access,g=gameById(order.gameId);
  const accountText=state.credentialView.accountVisible
    ?escapeHTML(account.loginName)
    :escapeHTML(maskLoginName(account.loginName));
  const passwordText=state.credentialView.passwordVisible
    ?escapeHTML(account.loginPassword)
    :'••••••••••';
  const guardActive=Boolean(
    state.credentialView.guardCodeVisible
    &&account.guardCode
    &&Number(account.guardExpireAt)>now
  );
  const guardText=guardActive?escapeHTML(account.guardCode):'未获取';
  const guardRemaining=guardActive
    ?Math.max(1,Math.ceil((Number(account.guardExpireAt)-now)/1000))
    :0;
  const layer=document.getElementById('confirmLayer');
  layer.hidden=false;
  layer.innerHTML=`<section class="order-confirm-dialog standalone-credential-dialog" role="dialog" aria-modal="true" aria-labelledby="standaloneCredentialTitle" data-anno-target="standalone-login-credentials">
    <button class="order-confirm-close" data-action="confirm-no" title="关闭">${icon('x',16)}</button>
    <div class="order-confirm-head">
      <div class="order-confirm-icon">${icon('key-round',21)}</div>
      <div>
        <h3 id="standaloneCredentialTitle">Steam 登录信息</h3>
        <p>${escapeHTML(g.name)} · 可复制后在 Steam 客户端或其他支持 Steam 登录的界面使用</p>
      </div>
    </div>
    <div class="credential-panel">
      <div class="credential-row">
        <span>Steam 账号</span>
        <b class="credential-value">${accountText}</b>
        <div class="credential-actions">
          <button class="credential-icon-btn" data-action="toggle-account-visibility" data-id="${escapeHTML(orderId)}">${icon(state.credentialView.accountVisible?'eye-off':'eye',13)} ${state.credentialView.accountVisible?'隐藏':'查看'}</button>
          <button class="credential-icon-btn" data-action="copy-login-account" data-id="${escapeHTML(orderId)}">${icon('copy',13)} 复制</button>
        </div>
      </div>
      <div class="credential-row">
        <span>Steam 密码</span>
        <b class="credential-value">${passwordText}</b>
        <div class="credential-actions">
          <button class="credential-icon-btn" data-action="toggle-password-visibility" data-id="${escapeHTML(orderId)}">${icon(state.credentialView.passwordVisible?'eye-off':'eye',13)} ${state.credentialView.passwordVisible?'隐藏':'查看'}</button>
          <button class="credential-icon-btn" data-action="copy-login-password" data-id="${escapeHTML(orderId)}">${icon('copy',13)} 复制</button>
        </div>
      </div>
      <div class="credential-row">
        <span>令牌验证码</span>
        <b class="credential-value guard" data-guard-value>${guardText}</b>
        <div class="credential-actions">
          <button class="credential-icon-btn" data-action="request-guard-code" data-id="${escapeHTML(orderId)}">${icon(guardActive?'refresh-cw':'shield-keyhole',13)} ${guardActive?'刷新':'获取验证码'}</button>
          ${guardActive?`<button class="credential-icon-btn" data-action="copy-guard-code" data-id="${escapeHTML(orderId)}">${icon('copy',13)} 复制</button>`:''}
        </div>
        <small class="credential-countdown" data-guard-countdown>${guardActive?`${guardRemaining} 秒后失效`:'点击后获取当前验证码'}</small>
      </div>
    </div>
    <div class="credential-note">仅供当前订单登录《${escapeHTML(g.name)}》使用，订单结束后失效；请勿分享、转售或修改账号安全信息。</div>
    <div class="credential-footer">授权查看至 ${escapeHTML(formatDateTime(state.credentialView.accessExpireAt))}</div>
  </section>`;
  refreshIcons();
  return true;
}
```

若 `guardRequestStatus` 为 `loading`、`error`、`expired` 或 `blocked`，令牌行分别将按钮文案改为“正在获取”“重试获取”“重新获取”“暂不可获取”；账号密码行不得被替换。弹窗不包含 Steam 双栏、二维码、“已完成登录”或“返回选择”。

- [ ] **Step 6: 让凭据操作按场景局部刷新**

新增：

```js
function renderActiveCredentialSurface(orderId=state.credentialView.orderId){
  if(state.credentialView.surface==='standalone'){
    return renderStandaloneCredentialDialog(orderId);
  }
  if(state.credentialView.surface==='steam'){
    return renderCredentialPopover(orderId);
  }
  return false;
}
```

将 `toggle-account-visibility`、`toggle-password-visibility`、复制、验证码请求和倒计时的刷新统一改为 `renderActiveCredentialSurface(id)`。

验证码异步回调的存活条件改为：

```js
if(!current.ok||!state.credentialView.surface)return;
```

不能继续只依赖 `panelOpen`，否则独立弹窗无法获得验证码。

- [ ] **Step 7: 拆分入口路由**

将路由改为：

```js
if(action==='open-manual-login'){
  const id=el.dataset.id;
  state.selectedOrderId=id;
  recordCredentialEvent('rental_credential_view',id,{action:'order_entry'});
  return openStandaloneCredentialDialog(id);
}
if(action==='choose-manual-login'){
  const id=el.dataset.id;
  state.selectedOrderId=id;
  recordCredentialEvent('rental_login_method_select',id,{action:'manual'});
  return openSteamManualLoginDialog(id);
}
if(action==='open-library-steam-login'){
  // 保留原有效使用单校验和埋点
  return openSteamManualLoginDialog(order.id);
}
```

- [ ] **Step 8: 修正关闭、退后台和倒计时**

`clearCredentialView` 同时关闭 `.standalone-credential-dialog` 与 `.manual-login-dialog`。

`refreshCredentialCountdown`：

```js
const hasCredentialSurface=Boolean(
  document.querySelector('.standalone-credential-dialog')
  ||document.querySelector('.manual-login-dialog')
);
if(!hasCredentialSurface||!orderId)return false;
```

退后台：

```js
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){
    state.credentialView.accountVisible=false;
    state.credentialView.passwordVisible=false;
    if(state.credentialView.surface==='standalone')clearCredentialView();
    else closeCredentialPopover({restoreFocus:false});
  }else refreshRentalTimers();
});
```

点击独立弹窗外部时关闭：

```js
document.addEventListener('click',e=>{
  if(
    state.credentialView.surface==='standalone'
    &&e.target===document.getElementById('confirmLayer')
  ){
    closeConfirm();
  }
});
```

Esc 规则改为：

```js
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(state.credentialView.panelOpen){
    e.preventDefault();
    e.stopPropagation();
    closeCredentialPopover();
    return;
  }
  if(state.credentialView.surface==='standalone'){
    e.preventDefault();
    closeConfirm();
  }
});
```

- [ ] **Step 9: 运行自动化并确认通过**

Run:

```powershell
node tools/verify-mac-rental-membership.cjs
git diff --check
```

Expected: 全部 Smoke Test 通过；截图脚本无页面错误；`git diff --check` 无错误。

- [ ] **Step 10: 提交实现**

```powershell
git add -- "Mac端demo/mac端租号功能/Mac端租号功能-标注版.html" "tools/verify-mac-rental-membership.cjs"
git commit -m "feat(rental): restore standalone credential dialog"
```

### Task 3: 生成并检查独立凭据截图

**Files:**
- Modify: `tools/verify-mac-rental-membership.cjs`
- Create: `public/prd/mac-rental/c07-order-login-information.png`

- [ ] **Step 1: 增加截图任务**

在验证脚本中增加：

```js
await capture(page,'c07-order-login-information.png','order-detail',async()=>{
  await page.evaluate(async()=>{
    state.selectedOrderId='GS20260713001';
    navigate('mac','order-detail');
    await nextPaint();
    document.querySelector('[data-action="open-manual-login"]')?.click();
    await nextPaint();
  });
});
```

- [ ] **Step 2: 截图前清除账号密码与验证码明文**

截图状态必须保持账号、密码遮罩，验证码显示“未获取”，避免把 Demo 凭据写入 PRD 图片。

- [ ] **Step 3: 生成截图**

Run:

```powershell
node tools/verify-mac-rental-membership.cjs
```

Expected: 输出 `CAPTURE c07-order-login-information.png`，自动化全部通过。

- [ ] **Step 4: 人工查看截图**

Run:

```powershell
Get-Item "public/prd/mac-rental/c07-order-login-information.png" |
  Select-Object Name,Length,LastWriteTime
```

使用图像查看工具检查：

- 弹窗标题和说明完整；
- 账号密码默认遮罩；
- 三行操作对齐；
- 无 Steam 双栏、二维码、底部完成按钮；
- 页面无滚动条和遮挡。

- [ ] **Step 5: 提交截图**

```powershell
git add -- "tools/verify-mac-rental-membership.cjs" "public/prd/mac-rental/c07-order-login-information.png"
git commit -m "test(rental): capture standalone credential dialog"
```

记录该提交的40位 SHA，供 PRD 固定图片地址使用。

### Task 4: 更新 PRD V3.9

**Files:**
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`

- [ ] **Step 1: 读取 `/to-prd` 约束**

完整读取：

```text
prd/Skills/输出规范/PRD自查清单-前端展示易遗漏项.md
prd/Skills/输出规范/盖世游戏APP国内海外差异.txt
prd/Skills/输出规范/飞书标准化md.txt
prd/Skills/prd模版文档/【Prd】《盖世游戏》云存档付费需求.md
```

- [ ] **Step 2: 增加 V3.9 版本记录**

新增一行并使用飞书黄色高亮：

```markdown
| 2026.07.31 | V3.9 | 郑群超 | <span style="background-color: #FEF794;">拆分订单“登录信息”与 Steam 手动登录职责：</span><span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">订单恢复独立凭据弹窗</span><span style="background-color: #FEF794;">，登录游戏与游戏库入口继续使用 Steam 双栏登录窗；两条路径共用同一账号和验证码，不重复取号</span> | <span style="background-color: #FEF794;">登录信息入口职责修正</span> |
```

当前开发依据更新为 V3.9。

- [ ] **Step 3: 更新 C 端大表**

先读取截图提交 SHA：

```powershell
$imageSha=(git rev-parse HEAD).Trim()
$imageUrl="https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@${imageSha}/public/prd/mac-rental/c07-order-login-information.png"
```

在“用户订单与详情”之后增加同一张 C 端大表连续行：

```markdown
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">用户订单登录信息</span>|使用 `$imageUrl` 生成标准 Markdown 图片语法，图题为“图4.2.7-3：订单独立登录信息弹窗”|<span style="background-color: #FEF794;">① 有效使用单展示“登录信息”；点击后打开独立凭据弹窗，不拉起或聚焦 Steam。<br>② 弹窗展示账号、密码和按需获取的令牌验证码，支持查看、隐藏、复制和刷新；只保留右上角关闭按钮。<br>③ 用户可复制后在 Steam 客户端或其他支持 Steam 登录的界面使用；复制不代表扩大权益，账号仍只允许使用订单目标游戏。<br>④ 该入口与 Steam 手动登录共用同一使用单、账号、未过期验证码和安全规则，不重复取号，不因关闭弹窗判定登录成功。</span>|
```

原临期提醒图号顺延，或将新增截图作为“用户订单与详情”现有图示的第二张，确保单元格最多2张图。

- [ ] **Step 4: 更新正文、异常、安全和埋点**

明确：

- `登录游戏` → 登录方式选择 → 手动登录 → Steam 双栏登录窗。
- `登录信息` → 独立凭据弹窗。
- `scene=order` 与 `scene=steam`。
- 独立弹窗加载失败、验证码失败/过期、订单失效和退后台处理。
- 登录结果仍由 Steam 会话、下载或启动校验确认。

- [ ] **Step 5: 更新自检和模拟评审**

记录：

- 订单凭据入口与 Steam 手动登录入口已隔离；
- 独立弹窗不拉起 Steam；
- 两条路径共用同一账号和验证码；
- 自动化测试全部通过。

- [ ] **Step 6: 统一固定图片提交 SHA**

将 PRD 全部图片地址统一替换为 Task 3 的40位图片提交 SHA；禁止本地路径、相对路径、`@master` 和 `@main`。

- [ ] **Step 7: 运行 PRD 静态检查**

Expected:

```text
所有图片引用均为公开 HTTPS
所有图片引用均含40位固定 SHA
Markdown 图片数 = 固定 SHA 图片数
无本地图片路径
无旧版图片提交 SHA
```

- [ ] **Step 8: 提交 PRD**

```powershell
git add -- "prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md"
git commit -m "docs(rental): separate order credential entry"
```

### Task 5: 发布、远程验证并同步主工作区

**Files:**
- Published: Demo、验证脚本、独立截图、PRD、设计说明、实施计划
- Sync to: `C:\Users\z3635\官网改动`

- [ ] **Step 1: 确认工作树只包含本需求提交**

Run:

```powershell
git status --short
git log -6 --oneline
```

Expected: 工作树为空；提交只包含本需求相关文件。

- [ ] **Step 2: 核对远端 master**

Run:

```powershell
git fetch origin
git ls-remote origin refs/heads/master
git merge-base --is-ancestor "$(git ls-remote origin refs/heads/master | ForEach-Object {($_ -split \"`t\")[0]})" HEAD
```

Expected: 远端 `master` 是当前 HEAD 的祖先；否则先基于远端最新提交整合，不强推。

- [ ] **Step 3: 推送**

Run:

```powershell
git push origin HEAD:refs/heads/master
```

Expected: fast-forward 成功。

- [ ] **Step 4: 验证线上 Demo**

请求：

```text
https://z36358631-ship-it.github.io/-/Mac%E7%AB%AFdemo/mac%E7%AB%AF%E7%A7%9F%E5%8F%B7%E5%8A%9F%E8%83%BD/Mac%E7%AB%AF%E7%A7%9F%E5%8F%B7%E5%8A%9F%E8%83%BD-%E6%A0%87%E6%B3%A8%E7%89%88.html
```

Expected:

```text
HTTP 200
Content-Type: text/html
包含 standalone-credential-dialog
包含 openSteamManualLoginDialog
包含 openStandaloneCredentialDialog
```

- [ ] **Step 5: 验证 PRD 全部图片**

逐张请求最终 Markdown 图片 URL。Expected:

```text
HTTP 200
Content-Type: image/png
通过数 = PRD 图片数
```

- [ ] **Step 6: 同步到主工作区**

只同步：

```text
Mac端demo/mac端租号功能/Mac端租号功能-标注版.html
tools/verify-mac-rental-membership.cjs
public/prd/mac-rental/c07-order-login-information.png
prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md
docs/superpowers/specs/2026-07-31-mac-rental-order-credential-entry-separation-design.md
docs/superpowers/plans/2026-07-31-mac-rental-order-credential-entry-separation.md
```

复制前检查主工作区对应文件差异；复制后逐个比较 SHA256。

- [ ] **Step 7: 最终回报**

提供：

- 在线预览地址；
- Demo、PRD 本地路径；
- 最终提交 SHA；
- 自动化测试通过数；
- PRD 图片 HTTP 200 / `image/png` 通过数；
- “登录信息”与“登录游戏”最终职责说明。

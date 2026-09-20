# APP 会员状态入口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让游戏库“会员游戏”Tab 顶部会员状态条在未开通、已过期和已开通状态下都可整条点击进入会员中心，并同步 Demo、标注版、PRD、截图和公网预览。

**Architecture:** 继续以 `盖世游戏APP租号功能demo.template.html` 作为唯一业务源，将状态条渲染为单一原生 `button`，复用现有 `navigate('membership')` 路由，不增加弹窗或订单逻辑。构建脚本生成普通版和标注版；验证脚本分别覆盖未开通与已开通状态、横竖屏和无嵌套操作；PRD与截图从同一 Demo 更新。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Node.js ESM、Playwright、Markdown PRD、PowerShell 校验脚本、GitHub Pages。

---

## 文件边界

- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html` — 会员状态条唯一渲染源与横竖屏样式。
- Modify: `tools/verify-app-rental-demo.mjs` — 未开通／已开通整条入口的源码与运行时契约。
- Generated: `demos/APP租号功能/盖世游戏APP租号功能demo.html` — 构建生成的普通版。
- Generated: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html` — 构建生成的标注版。
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md` — V3.4 修订记录及游戏库交互说明。
- Generated: `public/prd/app-rental/15-member-library-portrait.png` — 最新竖屏会员状态入口截图。
- Generated: `public/prd/app-rental/15-member-library-landscape.png` — 最新横屏会员状态入口截图。
- Modify: `prd/workflow-state/GUANWANGGAID-3-app-rental.md` — 决策、产物状态和验证证据。
- Preserve: `.superpowers/`、`prd/workflow-state/GUANWANGGAID-3-app-rental.run.json.lock`、`test-results/app-rental-capture/staging/` 等已有未跟踪内容，不纳入提交。

### Task 1: 先补入口契约，使旧 Demo 明确失败

**Files:**
- Modify: `tools/verify-app-rental-demo.mjs:1893-1938`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 在有效会员检查中改为整条入口契约**

在 `memberLibrary` 运行时快照中加入：

```js
const statusEntry = document.querySelector('[data-member-status-entry]');
return {
  // 保留现有字段
  statusEntryCount: document.querySelectorAll('[data-member-status-entry]').length,
  statusEntryTarget: statusEntry?.dataset.screen || '',
  statusEntryState: statusEntry?.dataset.memberStatus || '',
  statusEntryText: statusEntry?.innerText.replace(/\s+/g, ' ').trim() || '',
  nestedInteractiveCount: statusEntry?.querySelectorAll('button, [role="button"], [data-action]').length || 0,
};
```

有效会员断言固定为：入口只有一个、目标为 `membership`、状态为 `active`、包含有效期和“续费”、内部没有嵌套操作。

- [ ] **Step 2: 增加未开通状态的运行时契约**

在每个横竖屏循环中增加：

```js
const inactiveStatusRoute = await page.evaluate(() => {
  const api = window.__appRentalDemo;
  api.setScenario('not-member-library', { shouldRender: false });
  api.openMemberLibrary({ remember: true });
  const entry = document.querySelector('[data-member-status-entry]');
  const before = {
    exists: Boolean(entry),
    target: entry?.dataset.screen || '',
    state: entry?.dataset.memberStatus || '',
    text: entry?.innerText.replace(/\s+/g, ' ').trim() || '',
    nestedInteractiveCount: entry?.querySelectorAll('button, [role="button"], [data-action]').length || 0,
  };
  entry?.click();
  return { before, screen: api.snapshot().screen };
});
check(
  inactiveStatusRoute.before.exists
    && inactiveStatusRoute.before.target === 'membership'
    && inactiveStatusRoute.before.state === 'inactive'
    && inactiveStatusRoute.before.text.includes('会员未开通')
    && inactiveStatusRoute.before.text.includes('去开通')
    && inactiveStatusRoute.before.nestedInteractiveCount === 0
    && inactiveStatusRoute.screen === 'membership',
  `${orientation} 未开通会员状态条未整条进入会员中心：${JSON.stringify(inactiveStatusRoute)}`,
);
```

- [ ] **Step 3: 运行旧 Demo，确认新增契约失败**

Run:

```powershell
node tools/verify-app-rental-demo.mjs
```

Expected: 退出码非 0，失败信息包含“会员状态条”或 `data-member-status-entry` 对应断言；其他既有契约仍继续执行并输出结果。

### Task 2: 将会员状态条改为统一入口

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:382-386`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:4782-4789`
- Generated: `demos/APP租号功能/盖世游戏APP租号功能demo.html`
- Generated: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 把状态容器改为原生按钮样式**

将 `.member-library-status` 补齐按钮重置、可点击与键盘焦点样式，并删除仅服务旧内部按钮的 `.member-library-renewal`：

```css
.member-library-status {
  display: flex;
  width: 100%;
  min-height: 48px;
  appearance: none;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgb(255 210 92 / 18%);
  border-radius: 14px;
  background: rgb(255 204 67 / 7%);
  color: #fff;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.member-library-status:focus-visible { outline: 2px solid #ffd56f; outline-offset: 2px; }
.member-library-status-action { color: #ffd56f; font-size: 11px; font-weight: 700; white-space: nowrap; }
```

- [ ] **Step 2: 用一个按钮渲染两种会员状态**

将 `renderMemberLibraryStatus()` 改为：

```js
function renderMemberLibraryStatus() {
  const validity = formatMembershipValidity();
  const active = hasActiveMembership();
  const title = active ? '会员权益生效中' : '会员未开通';
  const detail = active ? validity : '开通后可畅玩会员游戏';
  const actionLabel = active ? '续费 ›' : '去开通 ›';
  const ariaLabel = active ? `${title}，${validity}，续费` : `${title}，去开通`;
  return `<button class="member-library-status" type="button" data-action="navigate" data-screen="membership" data-member-status-entry data-member-status="${active ? 'active' : 'inactive'}" aria-label="${escapeAttribute(ariaLabel)}"><strong>${title}</strong><span class="member-library-status-actions"><span>${detail}</span><b class="member-library-status-action">${actionLabel}</b></span></button>`;
}
```

不保留嵌套按钮，不调用创单函数，不新增 Toast。

- [ ] **Step 3: 构建普通版和标注版**

Run:

```powershell
node tools/build-app-rental-demo.mjs
```

Expected: 输出普通版和标注版构建成功；两份文件都包含 `data-member-status-entry`，且不再包含 `member-library-renewal`。

- [ ] **Step 4: 运行全量 Demo 契约**

Run:

```powershell
node tools/verify-app-rental-demo.mjs
```

Expected: 退出码 0；`APP_LIBRARY_CONVERGENCE`、`FULL_PAGE_MATRIX`、普通版和标注版契约全部 `PASS`。

### Task 3: 同步 PRD 与会员游戏截图

**Files:**
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md:5-13`
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md:112-119`
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md:176-185`
- Generated: `public/prd/app-rental/15-member-library-portrait.png`
- Generated: `public/prd/app-rental/15-member-library-landscape.png`
- Test: `scripts/validate-prd-quality.ps1`
- Test: `tools/capture-app-rental-prd-screenshots.mjs`

- [ ] **Step 1: 追加 V3.4 修订记录**

在修订表最后追加：

```markdown
| 2026.09.20 | 会员游戏Tab顶部会员状态条改为整条可点击，未开通、已过期和已开通均统一进入会员中心 | V3.4 | 郑群超 |
```

并将备注改为 `**备注：搜2026.9.20修改。**`。

- [ ] **Step 2: 更新游戏库页面交互说明**

在“3.1.5 游戏库”的交互说明增加：

```text
3. 会员游戏Tab顶部会员状态条整条可点击，统一进入会员中心；会员游戏Tab内不直接创建会员订单。
```

- [ ] **Step 3: 收敛会员游戏Tab的状态入口规则**

将“3.1.11 游戏库·会员游戏Tab”的展示和交互改成最终规则：

```text
展示说明：
1. 已开通时显示“会员权益生效中”、具体到期时间和“续费 ›”；未开通或已过期时显示“会员未开通”“开通后可畅玩会员游戏”和“去开通 ›”。

交互说明：
2. 点击顶部会员状态条任意位置进入会员中心；已开通用于查看或续费，未开通或已过期用于开通。会员游戏Tab内不直接创建订单。
```

搜索和游戏卡规则保持原编号顺序，不扩展其他功能。

- [ ] **Step 4: 重新生成截图并检查目标页**

Run:

```powershell
node tools/capture-app-rental-prd-screenshots.mjs
```

Expected: `36/36 PASS`；重点人工检查 `15-member-library-portrait.png` 与 `15-member-library-landscape.png`，状态条文字、箭头、边界和卡片均无溢出或重叠。

- [ ] **Step 5: 执行 PRD 质量校验**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-prd-quality.ps1 -Path 'prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md'
```

Expected: `0 error`；如仍有历史重复结构提醒，只记录既有 warning，不新增 error。

### Task 4: 回写状态、提交、推送并更新公网 Demo

**Files:**
- Modify: `prd/workflow-state/GUANWANGGAID-3-app-rental.md`
- Verify: `prd/workflow-state/GUANWANGGAID-3-app-rental.run.json`
- Publish: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 回写状态卡**

新增决定 `D-008`：会员游戏Tab顶部会员状态条整条进入会员中心；未开通／已过期用于开通，已开通用于查看或续费。补充 2026-09-20 修改记录、最新契约数量、截图和 PRD 校验结果。

- [ ] **Step 2: 检查提交范围**

Run:

```powershell
git status --short
git diff --check
git diff --name-only
```

Expected: 仅包含本计划列出的模板、生成 Demo、验证脚本、PRD、15号截图、状态卡和计划文件；不包含已有未跟踪目录与锁文件。

- [ ] **Step 3: 提交并推送功能分支**

Run:

```powershell
git add -- 'demos/APP租号功能/盖世游戏APP租号功能demo.template.html' 'demos/APP租号功能/盖世游戏APP租号功能demo.html' 'demos/APP租号功能/盖世游戏APP租号功能-标注版.html' 'tools/verify-app-rental-demo.mjs' 'prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md' 'public/prd/app-rental/15-member-library-portrait.png' 'public/prd/app-rental/15-member-library-landscape.png' 'prd/workflow-state/GUANWANGGAID-3-app-rental.md' 'docs/superpowers/plans/2026-09-20-app-member-status-entry.md'
git commit -m "feat: route APP member status to membership center"
git push origin codex/app-rental-prd-flow-v31-20260910
```

Expected: 远程分支快进到新提交；未跟踪文件未被提交。

- [ ] **Step 4: 发布普通版到 GitHub Pages**

在现有 Pages 发布工作树中先快进 `origin/master`，再只把最终功能提交中的普通版 Demo 恢复到 `master` 并提交：

```powershell
$featureSha = git rev-parse HEAD
git -C 'C:/Users/z3635/官网改动/.codex-tmp/pages-app-rental-20260918' fetch origin master
git -C 'C:/Users/z3635/官网改动/.codex-tmp/pages-app-rental-20260918' rebase origin/master
git -C 'C:/Users/z3635/官网改动/.codex-tmp/pages-app-rental-20260918' restore --source=$featureSha -- 'demos/APP租号功能/盖世游戏APP租号功能demo.html'
git -C 'C:/Users/z3635/官网改动/.codex-tmp/pages-app-rental-20260918' add -- 'demos/APP租号功能/盖世游戏APP租号功能demo.html'
git -C 'C:/Users/z3635/官网改动/.codex-tmp/pages-app-rental-20260918' commit -m "fix(app-rental): publish member status entry"
git -C 'C:/Users/z3635/官网改动/.codex-tmp/pages-app-rental-20260918' push origin HEAD:master
```

`$featureSha` 必须解析为 Step 3 生成的完整 40 位提交 SHA，不得使用分支名或未提交工作树。

- [ ] **Step 5: 验证公网直链**

打开带新提交查询参数的 GitHub Pages 地址，分别验证：

```text
未开通：游戏库 → 会员游戏 → 点击状态条 → 会员中心
已开通：购买周卡 → 返回会员游戏 → 点击状态条 → 会员中心显示当前套餐和有效期
```

Expected: HTTP 200、标题为“盖世游戏 APP 租号功能 Demo”、两条链路均成功、页面无图片加载失败和控制台错误。

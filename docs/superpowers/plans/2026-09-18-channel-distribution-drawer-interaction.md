# Channel Distribution Drawer Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将渠道与批次的创建、编辑、查看及 API 接入统一为右侧抽屉，同时保留删除、停用和 Secret 轮换的居中确认弹窗。

**Architecture:** 复用现有 `drawerShell`，补齐底部操作区和右侧进入动画；表单、详情及 API 接入只更换外层容器，字段、事件名和业务状态不变。浏览器测试通过容器类名、操作流和多断点尺寸验证抽屉与确认弹窗边界。

**Tech Stack:** 原生 JavaScript、CSS、单文件 HTML 构建脚本、Node.js test runner、Playwright。

---

## 文件结构

- `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`：渠道分销页面渲染；扩展抽屉壳并切换各操作的承载容器。
- `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`：抽屉三段式布局、底部操作区、进入动画和移动端规则。
- `tests/developer-backend/publisher-channel-integration.browser.test.mjs`：抽屉、确认弹窗和响应式回归。
- `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`：由构建脚本生成的最终可预览文件。

### Task 1: 用测试固定抽屉与确认弹窗边界

**Files:**
- Modify: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 添加失败测试**

在渠道 CRUD 和批次 CRUD 用例中补充容器断言：

```js
const expectDrawer = async (page, title) => {
  const drawer = page.locator('.publisher-channel-drawer');
  await drawer.waitFor();
  assert.equal(await drawer.getByRole('heading', { name: title, exact: true }).count(), 1);
  assert.equal(await page.locator('.publisher-channel-dialog').count(), 0);
};

const expectConfirmDialog = async (page, title) => {
  const dialog = page.locator('.publisher-channel-dialog');
  await dialog.waitFor();
  assert.equal(await dialog.getByRole('heading', { name: title, exact: true }).count(), 1);
  assert.equal(await page.locator('.publisher-channel-drawer').count(), 0);
};
```

分别验证：

```js
await page.getByRole('button', { name: '创建渠道', exact: true }).click();
await expectDrawer(page, '创建渠道');
await page.getByRole('button', { name: '取消', exact: true }).click();

await channelRow(page, 'NovaPlay Store').getByRole('button', { name: '查看', exact: true }).click();
await expectDrawer(page, '渠道详情');
await page.getByRole('button', { name: '关闭', exact: true }).click();

await page.getByRole('tab', { name: '批次管理', exact: true }).click();
await page.getByRole('button', { name: '创建批次', exact: true }).click();
await expectDrawer(page, '创建批次');
await page.getByRole('button', { name: '取消', exact: true }).click();

await batchRow(page, 'NovaPlay 本体 API').getByRole('button', { name: '管理接入', exact: true }).click();
await expectDrawer(page, 'API 接入信息');
await page.getByRole('button', { name: '关闭', exact: true }).click();

await page.getByRole('tab', { name: '渠道管理', exact: true }).click();
await channelRow(page, 'NovaPlay Store').getByRole('button', { name: '停用', exact: true }).click();
await expectConfirmDialog(page, '停用渠道');
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
node --test --test-concurrency=1 tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: FAIL，创建、查看或 API 接入仍匹配 `.publisher-channel-dialog`，找不到 `.publisher-channel-drawer`。

- [ ] **Step 3: 提交测试**

```powershell
git add -- 'tests/developer-backend/publisher-channel-integration.browser.test.mjs'
git commit -m "test: define channel drawer interaction boundaries"
```

### Task 2: 将表单、详情和 API 接入切换为右侧抽屉

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-channel-distribution.js`

- [ ] **Step 1: 为抽屉壳增加底部操作区**

将 `drawerShell` 改为接收可选 `footer`：

```js
const drawerShell = (language, id, title, body, footer = '') => `<div class="publisher-channel-drawer-layer"><button type="button" class="publisher-channel-dialog-backdrop" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭浮层','Close overlay')}"></button><aside class="publisher-channel-drawer" role="dialog" aria-modal="true" aria-labelledby="${e(id)}"><header><h2 id="${e(id)}">${e(title)}</h2><button type="button" data-portal-action="channel-dialog-close" aria-label="${tx(language,'关闭抽屉','Close drawer')}">×</button></header><div class="publisher-channel-drawer__body">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}</aside></div>`;
```

- [ ] **Step 2: 切换渠道表单和详情**

保持表单 `body`、提交事件和字段不变，只替换返回壳：

```js
return drawerShell(
  language,
  `channel-${mode}-title`,
  title,
  body,
  `${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(mode === 'edit' ? tx(language,'保存','Save') : tx(language,'创建','Create'),submitAction,{channelId:channel?.id})}`
);
```

渠道详情使用：

```js
return drawerShell(
  language,
  'channel-detail-title',
  tx(language,'渠道详情','Channel details'),
  body,
  button(tx(language,'关闭','Close'),'channel-dialog-close',{secondary:true})
);
```

- [ ] **Step 3: 切换批次表单和详情**

批次创建、编辑和查看采用与渠道相同的 `drawerShell(language, id, title, body, footer)` 调用；保留 `batch-create-submit`、`batch-edit-submit`、数量上限、字段锁定和时间选择逻辑。

```js
return drawerShell(
  language,
  `batch-${mode}-title`,
  title,
  body,
  `${button(tx(language,'取消','Cancel'),'channel-dialog-close',{secondary:true})}${button(mode === 'edit' ? tx(language,'保存','Save') : tx(language,'创建','Create'),submitAction,{batchId:batch?.id})}`
);
```

- [ ] **Step 4: 将 API 接入切换为抽屉**

保留凭证、调用记录、复制、模拟取码和轮换 Secret 逻辑，只替换最外层返回值：

```js
return drawerShell(
  language,
  'batch-api-access-title',
  tx(language,'API 接入信息','API access information'),
  body,
  `${button(tx(language,'关闭','Close'),'channel-dialog-close',{secondary:true})}${simulate}${primary}`
);
```

`renderDownloadRecordDialog` 继续使用现有抽屉；`renderConfirmDialog` 和 `renderApiRotateDialog` 继续使用 `dialogShell`。

- [ ] **Step 5: 运行语法检查和目标测试**

Run:

```powershell
node --check 'demos/开发者后台一期/src/runtime/publisher-channel-distribution.js'
node --test --test-concurrency=1 tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: 语法检查通过；渠道分销浏览器测试全部 PASS。

- [ ] **Step 6: 提交运行时改动**

```powershell
git add -- 'demos/开发者后台一期/src/runtime/publisher-channel-distribution.js'
git commit -m "feat: move channel workflows into drawers"
```

### Task 3: 完成抽屉布局、动画和响应式规则

**Files:**
- Modify: `demos/开发者后台一期/src/styles/publisher-channel-distribution.css`

- [ ] **Step 1: 改为头部、内容、底部三段布局**

```css
.publisher-channel-drawer{
  position:relative;
  z-index:1;
  display:grid;
  grid-template-rows:auto minmax(0,1fr) auto;
  width:min(760px,calc(100% - 48px));
  height:100%;
  background:var(--surface);
  box-shadow:-18px 0 52px rgba(11,18,32,.2);
  overscroll-behavior:contain;
  animation:publisherChannelDrawerIn .22s ease-out;
}

.publisher-channel-drawer>footer{
  display:flex;
  align-items:center;
  justify-content:flex-end;
  gap:10px;
  flex-wrap:wrap;
  padding:14px 22px;
  border-top:1px solid var(--line);
  background:var(--surface);
}

@keyframes publisherChannelDrawerIn{
  from{transform:translateX(100%)}
  to{transform:translateX(0)}
}

@media(prefers-reduced-motion:reduce){
  .publisher-channel-drawer{animation:none}
}
```

- [ ] **Step 2: 补充手机端底部按钮规则**

在 `@media(max-width:620px)` 中加入：

```css
.publisher-channel-drawer>footer{
  display:grid;
  grid-template-columns:1fr;
  padding:12px 17px;
}
.publisher-channel-drawer>footer button{width:100%}
```

- [ ] **Step 3: 运行目标测试**

Run:

```powershell
node --test --test-concurrency=1 tests/developer-backend/publisher-channel-integration.browser.test.mjs
```

Expected: 抽屉交互及 320px、390px、1280px、1440px 响应式用例全部 PASS。

- [ ] **Step 4: 提交样式改动**

```powershell
git add -- 'demos/开发者后台一期/src/styles/publisher-channel-distribution.css' 'tests/developer-backend/publisher-channel-integration.browser.test.mjs'
git commit -m "style: align channel workflows with drawer layout"
```

### Task 4: 构建单文件 Demo 并完整回归

**Files:**
- Modify: `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`

- [ ] **Step 1: 构建最终 HTML**

Run:

```powershell
node 'demos/开发者后台一期/build-developer-channel.mjs'
```

Expected: 输出 `Built 13-开发者平台与渠道分销demo.html`。

- [ ] **Step 2: 运行渠道、账号和权限回归**

Run:

```powershell
node --test --test-concurrency=1 tests/developer-backend/publisher-channel-integration.browser.test.mjs tests/developer-backend/publisher-account-context.test.mjs tests/developer-backend/publisher-access-policy.test.mjs
```

Expected: 相关测试全部 PASS，FAIL 为 0。

- [ ] **Step 3: 浏览器视觉检查**

在渠道管理和批次管理中依次检查：创建、编辑、查看、API 接入、下载记录从右侧打开；删除、停用、Secret 轮换居中展示。分别检查 390px 和 1280px，确认标题、滚动内容及底部按钮可见。

- [ ] **Step 4: 检查并提交构建产物**

```powershell
git diff --check
git add -- 'demos/开发者后台一期/13-开发者平台与渠道分销demo.html'
git commit -m "build: refresh channel distribution demo"
```

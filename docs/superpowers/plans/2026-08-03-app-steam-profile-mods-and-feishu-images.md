# APP Steam Profile MODS and Feishu Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 APP MODS 单文件 Demo 中补齐 Steam 个人中心已安装概览、修正详情启停操作栏，并更新独立 APP PRD 及全部飞书配图。

**Architecture:** 继续使用现有单一状态树维护游戏详情、MODS 列表、MOD 详情和设备安装状态，新增 `steam-profile` 页面但不新增第二套安装事实。个人中心按游戏聚合当前设备安装清单；“查看全部”通过类型化路由进入对应游戏详情的 `MODS > 浏览`。截图发布仍使用固定 Git SHA，PRD 图片改用短标题的标准 Markdown，并由校验器逐张验证远程响应。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Node.js、Playwright Core、Markdown、Git、jsDelivr、raw.githack。

---

## 文件结构

- Modify: `demos/Mod与发行人/APP端MODS功能demo.html` — Demo 页面、状态、路由和交互的唯一实现文件。
- Modify: `tools/verify-app-mods-demo.mjs` — 静态契约、浏览器交互、布局和截图校验。
- Create: `tools/update-app-mods-prd-assets.mjs` — 用资产提交 SHA 批量生成短标题图片链接和固定 Demo 地址。
- Modify: `tools/verify-app-mods-prd.mjs` — PRD 结构、短图片标题、统一 SHA、远程响应和飞书抓取近似请求校验。
- Modify: `public/prd/app-mods/04-detail-portrait.png` — 修订后的竖屏详情操作栏。
- Modify: `public/prd/app-mods/06-detail-landscape.png` — 修订后的横屏详情操作栏。
- Create: `public/prd/app-mods/09-steam-profile-mods-portrait.png` — 竖屏个人中心 MODS。
- Create: `public/prd/app-mods/10-steam-profile-mods-landscape.png` — 横屏个人中心 MODS。
- Modify: `prd/ai生成/【Prd】《盖世游戏》APP端MODS需求.md` — 个人中心、详情启停、验收和飞书图片。

---

### Task 1: 为 Steam 个人中心补失败测试

**Files:**
- Modify: `tools/verify-app-mods-demo.mjs`
- Test: `tools/verify-app-mods-demo.mjs`

- [ ] **Step 1: 增加静态契约断言**

在读取 HTML 后加入以下断言：

```js
for (const copy of [
  'Steam数据',
  '成就',
  '创意工坊',
  'MODS',
  '仅显示当前设备已安装的 MOD',
  '已安装 4 个',
  '查看全部'
]) assert.match(html, new RegExp(copy, 'u'), `缺少个人中心文案：${copy}`);

assert.match(html, /data-screen="steam-profile"/u);
assert.match(html, /data-profile-tab="mods"/u);
assert.match(html, /data-action="profile-view-all"/u);
```

- [ ] **Step 2: 增加个人中心浏览器路径断言**

在游戏详情入口截图之后打开个人中心，验证只出现本机已安装概览：

```js
await page.locator('[data-review-action="profile"]').click();
assert.equal(await page.locator('[data-screen="steam-profile"]').count(), 1);
assert.deepEqual(
  await page.locator('[data-profile-tab]').evaluateAll(items => items.map(item => item.textContent.trim())),
  ['Steam数据', '成就', '创意工坊', 'MODS']
);
assert.equal(await page.locator('[data-profile-tab="mods"]').getAttribute('aria-selected'), 'true');
assert.equal(await page.locator('[data-profile-search], [data-profile-sort], [data-profile-download]').count(), 0);
assert.equal(await page.locator('[data-profile-group="dst"] [data-profile-mod-card]').count(), 4);
assert.equal(await page.locator('[data-action="profile-view-all"]').textContent(), '查看全部');

const profileTabsLayout = await page.locator('.steam-profile-tabs').evaluate(tabs => ({
  singleLine: [...tabs.children].every(item => item.getBoundingClientRect().top === tabs.firstElementChild.getBoundingClientRect().top),
  overflowMode: getComputedStyle(tabs).overflowX
}));
assert.equal(profileTabsLayout.singleLine, true);
assert.match(profileTabsLayout.overflowMode, /auto|scroll/u);
```

- [ ] **Step 3: 增加“查看全部”路由和返回断言**

```js
await page.locator('[data-profile-scroll]').evaluate(element => { element.scrollTop = 96; });
await page.locator('[data-action="profile-view-all"][data-game-id="dst"]').click();
const browseState = await page.evaluate(() => window.__APP_MODS_DEMO__.getState());
assert.equal(browseState.screen, 'mods');
assert.equal(browseState.tab, 'browse');
assert.equal(browseState.activeGameId, 'dst');
assert.equal(browseState.modsReturnTarget, 'steam-profile');
await page.locator('[data-action="back-game"]').click();
assert.equal(await page.locator('[data-screen="steam-profile"]').count(), 1);
assert.equal(await page.locator('[data-profile-scroll]').evaluate(element => element.scrollTop), 96);
```

- [ ] **Step 4: 增加无安装空状态断言**

```js
await page.evaluate(() => {
  const api = window.__APP_MODS_DEMO__;
  for (const modId of [...api.getState().installed]) {
    api.dispatch({ type: 'OPEN_DETAIL', modId });
    api.dispatch({ type: 'OPEN_UNINSTALL' });
    api.dispatch({ type: 'CONFIRM_UNINSTALL' });
  }
  api.dispatch({ type: 'OPEN_STEAM_PROFILE' });
});
assert.equal(await page.locator('[data-profile-group]').count(), 0);
assert.equal(await page.locator('.profile-empty strong').textContent(), '当前设备暂未安装 MOD');
assert.equal(await page.locator('[data-action="profile-supported-games"]').textContent(), '查看支持 MODS 的游戏');
await page.evaluate(() => window.__APP_MODS_DEMO__.dispatch({ type: 'RESET' }));
```

- [ ] **Step 5: 运行测试确认失败**

Run:

```powershell
node tools/verify-app-mods-demo.mjs
```

Expected: FAIL，缺少 `steam-profile` 页面、个人中心评审入口或查看全部路由。

- [ ] **Step 6: 提交测试**

```powershell
git add -- tools/verify-app-mods-demo.mjs
git commit -m "test(mods): cover steam profile installed overview"
```

---

### Task 2: 实现个人中心 MODS 已安装概览

**Files:**
- Modify: `demos/Mod与发行人/APP端MODS功能demo.html`
- Test: `tools/verify-app-mods-demo.mjs`

- [ ] **Step 1: 扩展状态模型**

在 `initialState()` 中增加：

```js
activeGameId: 'dst',
profileTab: 'mods',
profileScroll: 0,
modsReturnTarget: 'game'
```

在 `saveScroll()` 中保存个人中心滚动位置：

```js
const profile = root.querySelector('[data-profile-scroll]');
if (profile) state.profileScroll = profile.scrollTop;
```

- [ ] **Step 2: 增加个人中心状态事件**

在 `dispatch(event)` 中加入：

```js
case 'OPEN_STEAM_PROFILE':
  state.screen = 'steam-profile';
  state.profileTab = 'mods';
  state.activeModId = null;
  break;
case 'PROFILE_VIEW_ALL':
  state.screen = 'mods';
  state.tab = 'browse';
  state.activeGameId = event.gameId;
  state.modsReturnTarget = 'steam-profile';
  state.activeModId = null;
  break;
case 'BACK_FROM_MODS':
  state.screen = state.modsReturnTarget === 'steam-profile' ? 'steam-profile' : 'game';
  state.modsReturnTarget = 'game';
  state.activeModId = null;
  break;
case 'CLOSE_STEAM_PROFILE':
case 'PROFILE_SUPPORTED_GAMES':
  state.screen = 'game';
  state.activeModId = null;
  break;
```

原 `BACK_GAME` 改为分发 `BACK_FROM_MODS` 的同一逻辑，避免个人中心跳转后错误返回游戏详情。

- [ ] **Step 3: 渲染个人中心页面**

新增 `renderSteamProfile()`，先派生当前设备安装集合：

```js
const installedMods = MODS.filter(mod => state.installed.includes(mod.id));
```

页面结构固定为：

```html
<section class="screen steam-profile-screen" data-screen="steam-profile">
  <header class="steam-profile-header">
    <button class="icon-button" type="button" data-action="profile-back" aria-label="返回">${icon('back')}</button>
    <h1>Steam</h1>
  </header>
  <nav class="steam-profile-tabs" role="tablist" aria-label="Steam 个人中心">
    <button data-profile-tab="data" role="tab" aria-selected="false">Steam数据</button>
    <button data-profile-tab="achievements" role="tab" aria-selected="false">成就</button>
    <button data-profile-tab="workshop" role="tab" aria-selected="false">创意工坊</button>
    <button data-profile-tab="mods" role="tab" aria-selected="true">MODS</button>
  </nav>
  <div class="profile-device-note">仅显示当前设备已安装的 MOD</div>
  <div class="steam-profile-scroll" data-profile-scroll>
    <section class="profile-game-group" data-profile-group="dst">
      <header>
        <div><strong>饥荒联机版</strong><span>已安装 ${installedMods.length} 个</span></div>
        <button type="button" data-action="profile-view-all" data-game-id="dst">查看全部</button>
      </header>
      <div class="profile-mod-grid">${installedMods.map(renderProfileCard).join('')}</div>
    </section>
  </div>
</section>
```

卡片从 `state.installed` 派生，复用 `MODS` 元数据，卡片显示名称、作者、下载量、文件大小和快捷启停；不渲染搜索、排序、筛选、刷新或下载按钮。无安装时改为：

```html
<div class="profile-empty">
  <strong>当前设备暂未安装 MOD</strong>
  <button type="button" data-action="profile-supported-games">查看支持 MODS 的游戏</button>
</div>
```

`profile-supported-games` 返回游戏库中支持 MODS 的游戏入口，不进入创意工坊。

新增卡片渲染函数，复用现有卡片点击和启停动作：

```js
function renderProfileCard(mod) {
  const enabled = state.enabled.includes(mod.id);
  return `
    <article class="profile-mod-card" tabindex="0" data-profile-mod-card data-mod-card data-mod-id="${mod.id}">
      <div class="mod-art ${mod.art}"></div>
      <div class="profile-mod-content">
        <h2>${mod.name}</h2>
        <div class="card-meta"><span>${mod.author}</span><span>${formatDownloads(mod.downloads)} 次下载</span><span>${mod.size}</span></div>
      </div>
      <div class="enable-switch-wrap">
        <span>${enabled ? '已启用' : '已停用'}</span>
        <button class="enable-switch" type="button" role="switch" aria-checked="${enabled}" aria-label="${enabled ? '停用' : '启用'} ${mod.name}" data-enable-switch data-action="toggle-enabled" data-mod-id="${mod.id}"></button>
      </div>
    </article>
  `;
}
```

- [ ] **Step 4: 接入渲染和评审控制台**

在快速场景中加入：

```html
<button class="review-button" type="button" data-review-action="profile">打开 Steam 个人中心</button>
```

将根渲染改为显式映射：

```js
const screens = {
  game: renderGame,
  mods: renderMods,
  'steam-profile': renderSteamProfile
};
root.innerHTML = screens[state.screen]();
```

评审控制台的 `profile` 动作分发 `OPEN_STEAM_PROFILE`。

根点击代理增加：

```js
if (action === 'profile-back') dispatch({ type: 'CLOSE_STEAM_PROFILE' });
if (action === 'profile-supported-games') dispatch({ type: 'PROFILE_SUPPORTED_GAMES' });
if (action === 'profile-view-all') dispatch({ type: 'PROFILE_VIEW_ALL', gameId: control.dataset.gameId });
```

- [ ] **Step 5: 实现横竖屏布局和返回恢复**

竖屏使用创意工坊同类分组卡片宽度；横屏增加单行卡片数量，不增加新控件。`render()` 后恢复：

```js
const profile = root.querySelector('[data-profile-scroll]');
if (profile) profile.scrollTop = state.profileScroll;
```

一级 Tab 宽度不足时容器使用 `overflow-x:auto`，四个 Tab 不换行。

- [ ] **Step 6: 运行测试确认通过**

Run:

```powershell
node tools/verify-app-mods-demo.mjs
```

Expected: 个人中心静态契约、已安装卡片数量、查看全部路由和返回位置 PASS。

- [ ] **Step 7: 提交实现**

```powershell
git add -- "demos/Mod与发行人/APP端MODS功能demo.html"
git commit -m "feat(mods): add steam profile installed overview"
```

---

### Task 3: 为详情操作栏和静默启停补失败测试

**Files:**
- Modify: `tools/verify-app-mods-demo.mjs`
- Test: `tools/verify-app-mods-demo.mjs`

- [ ] **Step 1: 断言按钮顺序和等宽铺满**

打开已安装 MOD 详情后加入：

```js
assert.deepEqual(
  await page.locator('.detail-actionbar .detail-action').evaluateAll(buttons =>
    buttons.map(button => button.textContent.trim())
  ),
  ['检查更新', '卸载', '已停用']
);

const actionLayout = await page.locator('.detail-actionbar').evaluate(bar => {
  const buttons = [...bar.querySelectorAll('.detail-action')];
  const widths = buttons.map(button => button.getBoundingClientRect().width);
  const barBox = bar.getBoundingClientRect();
  const first = buttons[0].getBoundingClientRect();
  const last = buttons.at(-1).getBoundingClientRect();
  const style = getComputedStyle(bar);
  return {
    equalWidths: Math.max(...widths) - Math.min(...widths) <= 1,
    fillsRow: Math.abs(first.left - (barBox.left + parseFloat(style.paddingLeft))) <= 1
      && Math.abs(last.right - (barBox.right - parseFloat(style.paddingRight))) <= 1,
    stateIsRightmost: buttons.at(-1).matches('[data-detail-enabled]')
  };
});
assert.deepEqual(actionLayout, {
  equalWidths: true,
  fillsRow: true,
  stateIsRightmost: true
});
```

- [ ] **Step 2: 断言启停成功无 Toast**

```js
await page.locator('[data-detail-enabled]').click();
assert.equal(await page.locator('[data-detail-enabled]').textContent(), '已启用');
assert.equal(await page.locator('.toast').count(), 0);

await page.locator('[data-action="close-detail"]').click();
await page.locator('[data-enable-switch][data-mod-id="minimap"]').click();
assert.equal(await page.locator('.toast').count(), 0);
```

- [ ] **Step 3: 运行测试确认失败**

Run:

```powershell
node tools/verify-app-mods-demo.mjs
```

Expected: FAIL，旧顺序为状态、更新、卸载，按钮未等分，启停仍出现 Toast。

- [ ] **Step 4: 提交测试**

```powershell
git add -- tools/verify-app-mods-demo.mjs
git commit -m "test(mods): cover silent toggle and full action row"
```

---

### Task 4: 实现详情三按钮和静默启停

**Files:**
- Modify: `demos/Mod与发行人/APP端MODS功能demo.html`
- Test: `tools/verify-app-mods-demo.mjs`

- [ ] **Step 1: 调整详情按钮顺序**

将已安装详情操作区改为：

```html
<button class="detail-action" type="button" data-action="update" data-mod-id="${mod.id}">${mod.update ? '更新' : '检查更新'}</button>
<button class="detail-action danger" type="button" data-action="open-uninstall">卸载</button>
<button class="detail-action detail-state ${enabled ? 'is-enabled' : 'is-disabled'}" type="button" data-detail-enabled data-action="detail-toggle" data-mod-id="${mod.id}">${enabled ? '已启用' : '已停用'}</button>
```

- [ ] **Step 2: 让三个按钮等分铺满**

```css
.detail-action {
  flex: 1 1 0;
  min-width: 0;
  height: 48px;
  padding: 0 12px;
}
```

保留原操作栏左右内边距和按钮间距，禁止添加空白占位元素。

- [ ] **Step 3: 移除启停成功 Toast**

点击代理改为：

```js
if (action === 'toggle-enabled') {
  event.stopPropagation();
  dispatch({ type: 'TOGGLE_ENABLED', modId });
}
if (action === 'detail-toggle') {
  dispatch({ type: 'TOGGLE_ENABLED', modId });
}
```

不修改刷新、安装完成、更新、卸载等其他 Toast。

- [ ] **Step 4: 运行完整 Demo 校验**

Run:

```powershell
node tools/verify-app-mods-demo.mjs
git diff --check
```

Expected: 个人中心、按钮顺序、等宽铺满、静默启停、焦点、旋转和原有任务测试全部 PASS。

- [ ] **Step 5: 提交实现**

```powershell
git add -- "demos/Mod与发行人/APP端MODS功能demo.html"
git commit -m "fix(mods): refine detail actions and toggle feedback"
```

---

### Task 5: 生成并审查新截图

**Files:**
- Modify: `tools/verify-app-mods-demo.mjs`
- Modify: `public/prd/app-mods/04-detail-portrait.png`
- Modify: `public/prd/app-mods/06-detail-landscape.png`
- Create: `public/prd/app-mods/09-steam-profile-mods-portrait.png`
- Create: `public/prd/app-mods/10-steam-profile-mods-landscape.png`

- [ ] **Step 1: 增加个人中心截图步骤**

```js
await page.locator('[data-review-action="profile"]').click();
await page.locator('[data-review-action="portrait"]').click();
await capture('09-steam-profile-mods-portrait.png');
await page.locator('[data-review-action="landscape"]').click();
await capture('10-steam-profile-mods-landscape.png');
```

- [ ] **Step 2: 更新截图完成提示**

```js
if (shouldCapture) console.log('PASS: 十张 APP MODS PRD 截图已生成');
```

- [ ] **Step 3: 生成截图**

Run:

```powershell
node tools/verify-app-mods-demo.mjs --screenshots
```

Expected: 10 张 PNG 均生成；04、06 显示新三按钮；09、10 显示个人中心 MODS 已安装概览。

- [ ] **Step 4: 逐张视觉审查变更图**

使用图片查看工具检查 04、06、09、10：

- 三个详情按钮同宽且铺满。
- 最右为绿色或灰色启停状态按钮。
- 个人中心只显示已安装分组和 `查看全部`，没有搜索、排序、下载。
- 竖屏无横向溢出，横屏无多余空白。

- [ ] **Step 5: 提交截图和测试**

```powershell
git add -- tools/verify-app-mods-demo.mjs public/prd/app-mods
git commit -m "test(mods): capture steam profile and detail actions"
```

---

### Task 6: 发布 Demo 与图片资产提交

**Files:**
- No additional file changes.

- [ ] **Step 1: 运行发布前校验**

```powershell
node tools/verify-app-mods-demo.mjs
git diff --check
git status --short
```

Expected: Demo PASS；除视觉伴侣目录 `.superpowers/` 外无未提交的本次文件。

- [ ] **Step 2: 推送资产提交**

```powershell
git push origin HEAD:main
git rev-parse HEAD
```

Expected: 返回 40 位资产提交 SHA，且该提交实际包含新 Demo 和 10 张截图。

- [ ] **Step 3: 验证固定在线 Demo**

用刚推送的提交拼出固定地址并验证：

```powershell
$assetSha = (git rev-parse HEAD).Trim()
$demoUrl = "https://raw.githack.com/z36358631-ship-it/-/$assetSha/demos/Mod%E4%B8%8E%E5%8F%91%E8%A1%8C%E4%BA%BA/APP%E7%AB%AFMODS%E5%8A%9F%E8%83%BDdemo.html"
$response = Invoke-WebRequest -UseBasicParsing $demoUrl
if ($response.StatusCode -ne 200) { throw "Demo HTTP $($response.StatusCode)" }
```

随后用 Playwright 打开 `$demoUrl` 并确认 `window.__APP_MODS_DEMO__` 可用。

---

### Task 7: 更新独立 APP PRD 和飞书图片链接

**Files:**
- Create: `tools/update-app-mods-prd-assets.mjs`
- Modify: `prd/ai生成/【Prd】《盖世游戏》APP端MODS需求.md`
- Modify: `tools/verify-app-mods-prd.mjs`
- Test: `tools/verify-app-mods-prd.mjs`

- [ ] **Step 1: 先扩展 PRD 失败校验**

图片文件集合改为 10 张：

```js
const imageNames = [
  '01-game-more-menu-portrait.png',
  '08-game-more-menu-landscape.png',
  '02-browse-portrait.png',
  '03-installed-portrait.png',
  '04-detail-portrait.png',
  '05-browse-landscape.png',
  '06-detail-landscape.png',
  '07-installed-landscape.png',
  '09-steam-profile-mods-portrait.png',
  '10-steam-profile-mods-landscape.png'
];
```

增加短标题和个人中心规则断言：

```js
const imageRefs = [...markdown.matchAll(/!\[([^\]]+)\]\((https:\/\/[^)]+\/public\/prd\/app-mods\/([^)]+\.png))\)/gu)];
assert.equal(imageRefs.length, imageNames.length);
assert(imageRefs.every(match => !/^图\s*\d/u.test(match[1])), '图片标题不得包含图号');
assert(imageRefs.every(match => !/[：:]/u.test(match[1])), '图片标题不得包含冒号');
assert(imageRefs.every(match => match[1].length <= 20), '图片标题必须简短');
assert.match(markdown, /Steam个人中心.*MODS/u);
assert.match(markdown, /仅显示当前设备已安装/u);
assert.match(markdown, /查看全部.*MODS\s*>\s*浏览/u);
assert.match(markdown, /更新.*卸载.*已启用/u);
assert.match(markdown, /启停成功后.*不显示\s*Toast/u);
assert.deepEqual(detailRuleNumbers, [9, 10, 11, 12, 13, 14, 15, 16, 17]);
assert.doesNotMatch(markdown, /旨在|赋能|助力|沉浸式|提升体验|打造.{0,8}闭环/u);

const proseLines = markdown
  .split(/\r?\n/u)
  .map(line => line.trim())
  .filter(line => line.length >= 24 && !line.startsWith('|') && !line.startsWith('!['));
assert.equal(new Set(proseLines).size, proseLines.length, 'PRD 存在整行重复说明');
```

- [ ] **Step 2: 运行 PRD 校验确认失败**

Run:

```powershell
node tools/verify-app-mods-prd.mjs
```

Expected: FAIL，旧 PRD 只有 8 张图、图片标题含图号和冒号，缺少个人中心及新详情规则。

- [ ] **Step 3: 创建资产链接更新脚本**

脚本接受真实 40 位 SHA，逐个文件替换图片 URL 和短标题：

```js
const sha = process.argv[2];
assert.match(sha, /^[0-9a-f]{40}$/u, '必须传入 40 位资产提交 SHA');

const images = new Map([
  ['01-game-more-menu-portrait.png', '竖屏更多菜单'],
  ['08-game-more-menu-landscape.png', '横屏更多菜单'],
  ['02-browse-portrait.png', '竖屏MOD浏览'],
  ['03-installed-portrait.png', '竖屏已安装'],
  ['04-detail-portrait.png', '竖屏MOD详情'],
  ['05-browse-landscape.png', '横屏MOD浏览'],
  ['07-installed-landscape.png', '横屏已安装'],
  ['06-detail-landscape.png', '横屏MOD详情'],
  ['09-steam-profile-mods-portrait.png', '竖屏个人中心MODS'],
  ['10-steam-profile-mods-landscape.png', '横屏个人中心MODS']
]);

for (const [fileName, alt] of images) {
  const url = `https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@${sha}/public/prd/app-mods/${fileName}`;
  const pattern = new RegExp(`!\\[[^\\]]+\\]\\(https://[^)]+/public/prd/app-mods/${fileName.replaceAll('.', '\\.')}\\)`, 'gu');
  markdown = markdown.replace(pattern, `![${alt}](${url})`);
}
```

脚本在个人中心行不存在时先把 4.2 规则章节从 4.2.8–4.2.16 顺延为 4.2.9–4.2.17，再插入使用真实 SHA 的个人中心行：

```js
const assetBase = `https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@${sha}/public/prd/app-mods`;
const profileRow = `|4.2.8 Steam个人中心 MODS|![竖屏个人中心MODS](${assetBase}/09-steam-profile-mods-portrait.png)<br>![横屏个人中心MODS](${assetBase}/10-steam-profile-mods-landscape.png)|① 顶部新增独立 MODS Tab，与创意工坊分开。<br>② 只展示当前设备已安装 MOD，按游戏分组；分组显示游戏名、已安装数量和“查看全部”。<br>③ 点击卡片进入 MOD 详情；快捷启停成功后直接变更状态，不显示 Toast。<br>④ 点击“查看全部”进入对应游戏详情的 MODS > 浏览，返回后恢复原分组和滚动位置。<br>⑤ 页面不提供搜索、排序、筛选和直接下载。|`;

if (!markdown.includes('|4.2.8 Steam个人中心 MODS|')) {
  markdown = markdown.replace(
    /^#### 4\.2\.(\d+) /gmu,
    (_, number) => `#### 4.2.${Number(number) + 1} `
  );
  const marker = '\n#### 4.2.9 入口与业务隔离';
  assert(markdown.includes(marker), '找不到 4.2 规则插入位置');
  markdown = markdown.replace(marker, `\n${profileRow}\n${marker}`);
}
```

脚本同时把功能 Demo 更新为固定 raw.githack 地址，不允许 `blob`、`@main`、`@master` 或 `htmlpreview.github.io`：

```js
const encodedDemoPath = 'demos/Mod%E4%B8%8E%E5%8F%91%E8%A1%8C%E4%BA%BA/APP%E7%AB%AFMODS%E5%8A%9F%E8%83%BDdemo.html';
const demoUrl = `https://raw.githack.com/z36358631-ship-it/-/${sha}/${encodedDemoPath}`;
markdown = markdown.replace(/https:\/\/(?:htmlpreview\.github\.io|raw\.githack\.com)[^`\s]+APP%E7%AB%AFMODS%E5%8A%9F%E8%83%BDdemo\.html/gu, demoUrl);
```

- [ ] **Step 4: 按 to-prd 规范修订 PRD**

在版本表追加以下实际行，不删除旧记录：

```markdown
|2026.08.03|V1.7|产品团队|<mark><span style="color:#3370ff"><strong>新增 Steam 个人中心 MODS 已安装概览；查看全部进入对应游戏 MODS 浏览；详情操作栏改为三等分，启停成功不显示 Toast；全部配图改为飞书短标题固定链接</strong></span></mark>|个人中心与飞书配图修订|
```

在 4.1 模块表增加：

```markdown
|Steam个人中心 MODS|仅展示当前设备已安装 MOD，按游戏分组并回到对应游戏的 MODS 浏览|
```

正文增加以下明确规则：

- 个人中心新增独立 `MODS` 一级 Tab，与创意工坊分开。
- 个人中心仅按游戏分组展示当前设备已安装 MOD。
- 每组展示已安装数量和 `查看全部`；点击进入对应游戏详情 `MODS > 浏览`。
- 个人中心无搜索、排序、筛选和直接下载。
- 卡片保留快捷启停，成功后不显示 Toast。
- MOD 详情底部三个按钮等宽铺满，顺序为更新 / 卸载 / 启停，启停位于最右。
- 国内包使用“盖世游戏”；海外包使用“GameHub”，MODS 能力一致且不依赖海外不存在的云游戏。
- 增加空状态、读取失败、路由失败、返回滚动位置和横竖屏规则。

精简现有正文时执行以下规则：

- 背景只保留现状、问题和本期结论，不复述完整功能清单。
- 故事介绍只保留“个人中心查看已安装 → 查看全部 → 游戏详情浏览”及现有安装管理两条核心路径。
- 删除“提升体验、形成闭环、强化认知”等无验收结果的价值套话。
- 4.2 页面表只写页面元素、用户动作、成功结果和异常；跨页面章节只写设备状态、任务互斥、横竖屏和国内海外等共用规则，不重复页面表内容。
- 同一条规则只出现一次，验收表引用规则结论，不再复制长段背景。
- 保留开发和测试必需的状态、异常、埋点、验收、固定图片地址及国内海外差异。

在 4.2 图示表新增个人中心行；资产更新脚本使用真实 `sha` 生成完整图片链接和交互说明，避免临时占位链接。已有图片全部改成短标题。修改内容使用现有黄色背景和蓝色加粗标记规则。

- [ ] **Step 5: 增加验收项**

新增：

```text
AC-APP-PROFILE-01 个人中心独立 MODS Tab
AC-APP-PROFILE-02 仅展示当前设备已安装并按游戏分组
AC-APP-PROFILE-03 查看全部进入对应游戏 MODS > 浏览
AC-APP-PROFILE-04 快捷启停成功无 Toast
AC-APP-DETAIL-04 三按钮等宽铺满且启停在最右
AC-APP-FEISHU-01 十张图使用短标题、固定 SHA 和公开 HTTPS 原图
```

- [ ] **Step 6: 用资产 SHA 更新全部链接**

Run:

```powershell
$assetSha = (git rev-parse HEAD).Trim()
node tools/update-app-mods-prd-assets.mjs $assetSha
```

Expected: Demo 地址和 10 张图片统一固定到真实资产提交；所有 Markdown 图片方括号内均为短界面名。

---

### Task 8: 验证飞书配图可导入条件

**Files:**
- Modify: `tools/verify-app-mods-prd.mjs`
- Test: `tools/verify-app-mods-prd.mjs`

- [ ] **Step 1: 移除硬编码旧 SHA**

从 Markdown 图片 URL 提取 SHA，并要求只有一个：

```js
const imageShas = imageRefs.map(match => new URL(match[2]).pathname.match(/@([0-9a-f]{40})\//u)?.[1]);
assert(imageShas.every(Boolean), '图片 URL 未固定到 40 位提交 SHA');
assert.equal(new Set(imageShas).size, 1, '同一 PRD 图片必须使用同一资产提交 SHA');
const expectedSha = imageShas[0];
```

- [ ] **Step 2: 扩展远程图片校验**

`--remote` 下对每张最终 URL 执行两次 GET：默认请求和飞书近似 User-Agent。

```js
for (const [, url] of imageRefs) {
  for (const headers of [{}, { 'user-agent': 'Lark/7.0 FeishuDocsImageImporter' }]) {
    const response = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(20000)
    });
    assert.equal(response.status, 200, `${url} HTTP ${response.status}`);
    assert.equal(response.headers.get('content-type')?.split(';')[0], 'image/png');
    const bytes = await response.arrayBuffer();
    assert(bytes.byteLength > 12000, `${url} 图片体积异常`);
  }
}
```

- [ ] **Step 3: 扫描飞书不兼容写法**

```js
assert.doesNotMatch(markdown, /<img\b|file:\/\/|localhost|data:image|github\.com\/[^)]+\/blob\//u);
assert.doesNotMatch(markdown, /!\[图\s*\d|!\[[^\]]*[：:]/u);
assert.equal((markdown.match(/^!\[/gmu) || []).length + (markdown.match(/\|!\[/gu) || []).length > 0, true);
```

- [ ] **Step 4: 运行本地和远程校验**

```powershell
node tools/verify-app-mods-demo.mjs
node tools/verify-app-mods-prd.mjs
node tools/verify-app-mods-prd.mjs --remote
git diff --check
```

Expected: Demo PASS；PRD 结构 PASS；10/10 图片在两种请求头下均返回 `200 image/png` 且大小正常。

- [ ] **Step 5: 保留飞书失败兜底**

PRD 图片仍保存在 `public/prd/app-mods/` 原尺寸目录。最终交付明确：已完成短标题、固定 SHA 和远程抓取验证；若无飞书文档写入权限，不能虚构飞书转存成功，用户可将同名原图直接拖入失败占位块。

---

### Task 9: PRD 自检、三视角评审与最终发布

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》APP端MODS需求.md`
- Modify: `tools/verify-app-mods-prd.mjs`
- Modify: `tools/update-app-mods-prd-assets.mjs`

- [ ] **Step 1: 执行 to-prd 自检**

逐项检查：入口、展示数量、长标题截断、空状态、加载失败、设备读取失败、快捷启停成功/失败、查看全部路由、返回位置、横竖屏、国内/海外、埋点和验收标准。PRD 末尾自检记录补充本轮新增项。

- [ ] **Step 2: 执行前端、测试、运营三视角评审**

重点检查：

- 前端：个人中心与游戏详情是否使用同一设备状态；返回栈是否唯一。
- 测试：无安装、读取失败、启停失败、路由失败、旋转和多设备是否可验收。
- 运营：个人中心无新运营配置；外部内容仍沿用现有同步链路。

发现硬伤时先补正文和验收，再重新运行校验。

- [ ] **Step 3: 提交 PRD**

```powershell
git add -- "prd/ai生成/【Prd】《盖世游戏》APP端MODS需求.md" tools/verify-app-mods-prd.mjs tools/update-app-mods-prd-assets.mjs docs/superpowers/plans/2026-08-03-app-steam-profile-mods-and-feishu-images.md
git commit -m "docs(mods): update steam profile and feishu images"
```

- [ ] **Step 4: 推送最终提交**

```powershell
git push origin HEAD:main
git rev-parse HEAD
```

Expected: `origin/main` 包含 Demo、截图、验证器和最新 PRD。

- [ ] **Step 5: 最终验收**

```powershell
node tools/verify-app-mods-demo.mjs
node tools/verify-app-mods-prd.mjs --remote
git status --short
```

Expected: 全部 PASS；除忽略或未纳入版本控制的视觉伴侣临时目录外无本次未提交文件。

- [ ] **Step 6: 交付地址和证据**

最终回复包含：

- 固定提交的在线 Demo 地址。
- APP 独立 PRD 本地路径。
- 10 张图片的资产提交 SHA。
- `10/10 HTTP 200 + image/png` 验证结果。
- 飞书图片已改为短标题标准 Markdown；若无法执行真实飞书导入冒烟测试，明确说明并提供原图目录兜底。

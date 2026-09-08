# Publisher Validation Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让开发者在版本发布页直接看到各模块缺失数，并在提交失败后自动定位首个问题，同时隐藏内部字段名 `activeVersion`。

**Architecture:** 继续复用 `validate()` 作为唯一校验来源，在展示层增加“五个定位模块”的显式归并和计数。`missingHTML()` 只过滤内部资质键，不改变校验门禁；提交失败先重绘缺失面板，再通过现有 `focusField()` 聚焦首错。

**Tech Stack:** 原生 JavaScript、CSS、单文件 HTML 构建、Node.js、Playwright。

---

## 文件职责

- `demos/开发者后台一期/src/runtime/publisher-game-profile.js`：校验结果归并、定位角标、缺失列表和提交失败定位。
- `demos/开发者后台一期/src/styles/publisher-game-profile.css`：红色数量角标样式。
- `tests/developer-backend/game-profile-release-demo.browser.test.mjs`：浏览器交互回归。
- `demos/开发者后台一期/02-CDKEY商品与供给demo.html`：通过构建脚本生成，不手工改内联源码。

### Task 1: 增加失败用例

**Files:**
- Modify: `tests/developer-backend/game-profile-release-demo.browser.test.mjs`

- [ ] **Step 1: 增加模块计数测试**

在现有 Demo 02 浏览器测试中增加用例，进入“暮光边境”的版本发布页，读取五个 `[data-release-locator]`：

```js
const badges = await page.locator('[data-release-locator] [data-release-missing-count]').evaluateAll(nodes =>
  nodes.map(node => ({ module: node.parentElement.dataset.releaseLocator, count: Number(node.textContent) }))
);
assert.ok(badges.some(item => item.module === 'profile' && item.count > 0));
const remainingText = await page.locator('[data-profile-show-missing] small').textContent();
const remaining = Number(remainingText.match(/\d+/)?.[0] || 0);
assert.equal(badges.reduce((sum, item) => sum + item.count, 0), remaining);
```

- [ ] **Step 2: 增加动态更新测试**

填写一个当前缺失的普通文本字段后，断言对应模块角标减一；完成该模块最后一个缺失项后，断言角标隐藏：

```js
const before = Number(await page.locator('[data-release-locator="profile"] [data-release-missing-count]').textContent());
await page.getByLabel('一句话介绍').fill('探索失落大陆，重建远征据点。');
await page.getByLabel('一句话介绍').blur();
await page.waitForFunction(expected => Number(document.querySelector('[data-release-locator="profile"] [data-release-missing-count]')?.textContent) === expected, before - 1);
assert.equal(Number(await page.locator('[data-release-locator="profile"] [data-release-missing-count]').textContent()), before - 1);
```

- [ ] **Step 3: 增加提交定位和内部字段过滤测试**

```js
await page.getByRole('button', { name: '提交上架审核' }).click();
await page.locator('[data-profile-missing]').waitFor({ state: 'visible' });
assert.doesNotMatch(await page.locator('[data-profile-missing]').innerText(), /activeVersion/);
assert.ok(await page.evaluate(() => document.activeElement?.matches('[data-profile-field], [data-profile-array], [data-profile-upload], [data-qualification-editor], [data-qualification-cards]')));
```

- [ ] **Step 4: 运行新增用例并确认失败**

Run:

```powershell
node --test "tests/developer-backend/game-profile-release-demo.browser.test.mjs"
```

Expected: 新增的角标或提交定位断言失败，原有测试结果不因测试代码语法而中断。

### Task 2: 实现模块计数与提交定位

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-profile.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-game-profile.css`

- [ ] **Step 1: 增加五模块归并函数**

在 `completion()` 附近增加显式映射，禁止直接使用九类 `sectionOf()` 作为定位 id：

```js
const releaseModuleOf = key => {
  const section = sectionOf(key);
  if (['basic', 'classification', 'developer', 'assets', 'settings'].includes(section)) return 'profile';
  if (section === 'builds') return 'builds';
  if (section === 'pricing') return 'catalog';
  if (section === 'publication') return 'release';
  return 'qualification';
};

const releaseMissingCounts = done => Object.fromEntries(
  ['profile', 'builds', 'catalog', 'release', 'qualification'].map(module => [
    module,
    done.missing.filter(item => releaseModuleOf(item.key) === module).length,
  ])
);
```

- [ ] **Step 2: 给五个定位项渲染角标**

`render()` 取得 `done` 后计算 `missingCounts`，在定位按钮中加入：

```js
const count = missingCounts[id];
const badge = `<span class="pgp-release-locator__count" data-release-missing-count${count ? '' : ' hidden'}>${count || ''}</span>`;
```

按钮的 `aria-label` 同步为“游戏资料，缺失 5 项”；无缺失时只读模块名。

- [ ] **Step 3: 实时同步角标**

在 `updateSummary()` 中复用 `completion(draft)` 和 `releaseMissingCounts(done)`：

```js
root.querySelectorAll('[data-release-locator]').forEach(button => {
  const count = counts[button.dataset.releaseLocator] || 0;
  const badge = button.querySelector('[data-release-missing-count]');
  badge.hidden = count === 0;
  badge.textContent = count ? String(count) : '';
  const label = button.dataset.releaseLabel;
  button.setAttribute('aria-label', count ? `${label}，缺失 ${count} 项` : label);
});
```

- [ ] **Step 4: 过滤内部资质字段**

`missingHTML()` 的展示列表排除 `qualifications.activeVersion`：

```js
const hiddenMissingKeys = new Set(['qualifications.activeVersion']);
const missing = Object.entries(draft.errors).filter(([key]) =>
  !['save', 'submit', 'withdraw', 'upload'].includes(key) && !hiddenMissingKeys.has(key)
);
```

只过滤列表，不从 `validate()`、总缺失数或资质角标中删除。

- [ ] **Step 5: 调整提交失败重绘顺序**

将提交失败分支改为：

```js
if (Object.keys(draft.errors).length) {
  draft.ui.showMissing = true;
  const firstError = Object.keys(draft.errors)[0];
  repaint(null, null, { focus: firstError });
  return;
}
```

若现有 `repaint()` 不接受第三个参数，则保持其签名不变：先将 `state.focus = firstError`，再调用 `repaint()`。不得在旧 DOM 上直接调用 `focusField()`。

- [ ] **Step 6: 增加角标样式**

```css
.pgp-release-locator button { position: relative; }
.pgp-release-locator__count {
  display: inline-grid;
  min-width: 16px;
  height: 16px;
  margin-left: 6px;
  place-items: center;
  border-radius: 999px;
  background: #e5484d;
  color: #fff;
  font-size: 10px;
  line-height: 1;
}
.pgp-release-locator__count[hidden] { display: none; }
```

- [ ] **Step 7: 运行语法检查和浏览器回归**

```powershell
node --check "demos/开发者后台一期/src/runtime/publisher-game-profile.js"
node --test "tests/developer-backend/game-profile-release-demo.browser.test.mjs"
```

Expected: JS 语法通过；新增三个场景通过。若旧用例仍引用已废弃状态或导航，单独标注，不通过修改产品代码迎合旧断言。

### Task 3: 构建、视觉检查与交付

**Files:**
- Generate: `demos/开发者后台一期/02-CDKEY商品与供给demo.html`

- [ ] **Step 1: 构建 Demo 02**

```powershell
node "demos/开发者后台一期/build.mjs" --module=02
```

Expected: 输出 `Built 1 public-facing self-contained HTML files with 6 routes.`。

- [ ] **Step 2: 浏览器检查**

在 1440×900 视口检查：

1. 五个定位项无换行，红色角标不挤压标题。
2. 角标总数等于“还差 N 项”。
3. 点击提交后缺失面板出现，页面定位到首错。
4. 缺失清单不存在 `activeVersion`。
5. 点击“资质认证”可到达资质填写区。

- [ ] **Step 3: 精确暂存并提交**

```powershell
git add -- "demos/开发者后台一期/src/runtime/publisher-game-profile.js" "demos/开发者后台一期/src/styles/publisher-game-profile.css" "demos/开发者后台一期/02-CDKEY商品与供给demo.html" "tests/developer-backend/game-profile-release-demo.browser.test.mjs" "docs/superpowers/plans/2026-09-08-publisher-validation-navigation.md"
git diff --cached --check
git commit -m "fix: improve publisher validation navigation"
```

- [ ] **Step 4: 推送并验证固定地址**

```powershell
git push origin HEAD
git rev-parse HEAD
```

使用返回的 40 位 SHA 生成 Demo 02 固定预览地址，并验证 HTTP 200。

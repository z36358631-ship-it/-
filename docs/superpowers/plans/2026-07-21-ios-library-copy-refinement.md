# IOS Library Copy Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将一级 Tab 统一命名为“PC游戏库”，并从 ACE 风险弹窗中删除内部评审说明。

**Architecture:** 仅更新用户可见文案及其对应的标注、PRD 和截图，不改动页面结构、事件和 ACE 检测规则。截图先独立提交以取得固定哈希，PRD 再引用该哈希并发布。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Node.js、Playwright Core、Markdown、GitHub Pages、jsDelivr。

---

### Task 1: 增加文案回归测试

**Files:**
- Create: `.tmp/verify-ios-copy-refinement.cjs`
- Test: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html`

- [ ] **Step 1: Write the failing test**

```js
await page.goto(`${base}?preview=apps`);
assert.deepEqual(await page.locator('.library-tabs .tab').allTextContents(), ['PC游戏库', 'IOS应用库']);
await page.goto(`${base}?preview=ace-warning`);
const copy = await page.locator('.dialog-body').innerText();
assert.equal(copy.includes('最终文案'), false);
assert.equal(copy.includes('评审结果为准'), false);
assert.equal(copy.includes('账号封禁损失'), true);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node ".tmp/verify-ios-copy-refinement.cjs" "Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html"
```

Expected: FAIL，当前 Tab 仍为“PC 游戏”或弹窗仍包含“最终文案”。

### Task 2: 更新 Demo 与标注文案

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html:88`
- Test: `.tmp/verify-ios-copy-refinement.cjs`

- [ ] **Step 1: Apply the minimal copy changes**

```js
<button class="tab ...">PC游戏库</button>
```

ACE 免责段落改为：

```html
<p class="ace-legal">继续安装即表示你已了解上述风险。盖世游戏不承担因使用第三方 IPA 导致的账号封禁损失。</p>
```

同步将左侧流程导航和右侧交互标注中的“PC 游戏”改为“PC游戏库”。

- [ ] **Step 2: Run the regression tests**

Run:

```powershell
node ".tmp/verify-ios-copy-refinement.cjs" "Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html"
node ".tmp/verify-game-library-ios-ace.cjs" "Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html"
```

Expected: 文案回归测试和原 ACE 流程测试全部 PASS，无 JavaScript 错误。

### Task 3: 同步 PRD 与飞书功能点

**Files:**
- Modify: `prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md`
- Modify: `prd/【飞书功能点】盖世游戏Mac端-iOS应用与IPA资源库.md`

- [ ] **Step 1: Append PRD version V2.6**

```markdown
|2026.07.21|V2.6|郑群超|🟨 **一级 Tab“PC 游戏”改为“PC游戏库”；ACE 风险弹窗删除内部评审说明**|本次变更|
```

- [ ] **Step 2: Update current UI labels and user-visible copy**

将当前方案中的一级 Tab 统一为“PC游戏库 / IOS应用库”；将 C 端弹窗说明改为只保留风险与免责文案。PRD 的上线准备、国内/海外法务与安全评审要求保留。

### Task 4: 重新生成并审查截图

**Files:**
- Modify: `public/prd/mac-ios-library/00-pc-game-library.png`
- Modify: `public/prd/mac-ios-library/01-app-library.png`
- Modify: `public/prd/mac-ios-library/02-app-context-menu.png`
- Modify: `public/prd/mac-ios-library/03-app-settings.png`
- Modify: `public/prd/mac-ios-library/04-local-ipa-import.png`
- Modify: `public/prd/mac-ios-library/05-ipa-source-tree.png`
- Modify: `public/prd/mac-ios-library/06-add-ipa-source.png`
- Modify: `public/prd/mac-ios-library/07-source-manager.png`
- Modify: `public/prd/mac-ios-library/08-ipa-resource-states.png`
- Modify: `public/prd/mac-ios-library/09-ipa-app-info.png`
- Modify: `public/prd/mac-ios-library/10-uninstall-confirm.png`
- Modify: `public/prd/mac-ios-library/11-app-empty.png`
- Modify: `public/prd/mac-ios-library/12-ipa-empty.png`
- Modify: `public/prd/mac-ios-library/13-ios-app-library.png`
- Modify: `public/prd/mac-ios-library/14-ace-warning.png`

- [ ] **Step 1: Capture all documented states**

Run:

```powershell
node ".tmp/capture-mac-ios-prd.cjs" "Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html" "public/prd/mac-ios-library"
```

Expected: 生成 `00` 至 `14` 的 15 张 PNG。

- [ ] **Step 2: Inspect the two affected screenshots**

检查 `13-ios-app-library.png` 显示“PC游戏库”，`14-ace-warning.png` 不显示“最终文案”或“评审结果为准”。

### Task 5: 提交、更新固定图片链接并发布

**Files:**
- Modify: `prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md`

- [ ] **Step 1: Commit Demo and PNG assets**

```powershell
git add -- "Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html" "public/prd/mac-ios-library"
git commit -m "fix: refine IOS library user-facing copy"
```

- [ ] **Step 2: Replace PRD image hashes and commit docs**

将 PRD 中 `public/prd/mac-ios-library/*.png` 的 jsDelivr 链接统一替换为上一步的固定提交哈希。

```powershell
git add -- "prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md" "prd/【飞书功能点】盖世游戏Mac端-iOS应用与IPA资源库.md"
git commit -m "docs: sync IOS library copy refinement"
```

- [ ] **Step 3: Publish and verify**

发布后验证：

- GitHub Pages 返回 HTTP 200，且页面包含“PC游戏库”。
- 页面不包含“最终文案以法务与安全评审结果为准”。
- PRD 全部唯一图片链接返回 HTTP 200、`image/png` 且 `Content-Length > 0`。

## Self-Review

- Spec coverage: 两处文案、Demo 标注、PRD、飞书功能点、截图与发布均有对应任务。
- Placeholder scan: 无 `TBD`、`TODO` 或“后续处理”等占位描述。
- Consistency: Tab 名称固定为“PC游戏库”，ACE 弹窗删除的只是用户可见评审说明。

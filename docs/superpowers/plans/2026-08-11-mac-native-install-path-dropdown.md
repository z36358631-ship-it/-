# Mac 原生安装位置下拉交互 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将安装位置从平铺路径列表恢复为原单路径下拉框，并在收起态常驻展示“安装到其他位置”，同时保持最近路径、最大空间回退和后台下载逻辑。

**Architecture:** 继续使用现有单文件 HTML 和原生 JavaScript。安装位置由一个可展开的组合控件承载：收起态展示当前路径、状态、引导文案和箭头；展开态展示候选路径及“安装到其他位置”。Demo 用预置自定义路径模拟 macOS 文件夹选择器返回结果，不新增真实系统依赖。

**Tech Stack:** HTML、CSS、原生 JavaScript、localStorage、Node.js Test Runner、Playwright Core、Markdown、Git、jsDelivr

---

### Task 1: 固化 V1.7 交互契约

**Files:**
- Create: `tests/mac-native-install-path-v17.test.mjs`
- Verify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Verify: `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md`

- [ ] **Step 1: 增加 Demo 静态契约测试**

```js
assert.match(demo, /id="installPathField"/);
assert.match(demo, />安装到其他位置</);
assert.match(demo, /data-action="toggle-install-path"/);
assert.match(demo, /data-action="choose-custom-install-path"/);
assert.doesNotMatch(demo, /<div class="install-path-list" id="installPathList" role="radiogroup"/);
assert.doesNotMatch(demo, /platform-badges:has(.native-chip.show)/);
```

- [ ] **Step 2: 增加 PRD V1.7 契约测试**

```js
assert.match(prd, /|2026-08-11|V1.7|/);
assert.match(prd, /收起态[^\n]*安装到其他位置/);
assert.match(prd, /macOS 文件夹选择器/);
assert.doesNotMatch(prd, /安装弹窗平铺全部候选路径/);
```

- [ ] **Step 3: 运行测试确认改动前失败**

Run: `node --test tests/mac-native-install-path-v17.test.mjs`

Expected: FAIL，现有 Demo 仍平铺路径，PRD 仍为 V1.6。

### Task 2: 更新安装位置组合控件

**Files:**
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Test: `tests/mac-native-install-path-v17.test.mjs`

- [ ] **Step 1: 调整 DOM 与样式**

将 `install-path-list` 改为 `install-path-field` 与内部 `install-path-menu`；收起态保留文件夹图标、当前路径和可用空间，右侧固定展示“安装到其他位置”和箭头。删除平台角标父容器的合并胶囊样式，Steam 与 Apple 图标各自保留独立背景和描边。

- [ ] **Step 2: 渲染当前路径与候选菜单**

```js
function renderInstallPathField(version, downloading) {
  const selectedPath = installPaths.find(path => path.id === state.selectedPathId);
  const paths = sortedInstallPaths(version);
  // 收起态展示 selectedPath；展开菜单展示 paths 与自定义位置入口。
}
```

候选路径继续按合格状态和空间排序；不合格项禁用并显示“空间不足”或“路径不可用”。

- [ ] **Step 3: 模拟 macOS 文件夹选择器**

```js
function chooseCustomInstallPath() {
  const customPath = { id: 'custom', path: '/Volumes/My Games/GameHub/', availableBytes: 320000000000, status: 'available', order: 4 };
  const index = installPaths.findIndex(path => path.id === customPath.id);
  if (index >= 0) installPaths[index] = customPath;
  else installPaths.push(customPath);
  state.selectedPathId = customPath.id;
  state.installPathOpen = false;
  renderInstall();
}
```

点击下拉框任意位置均展开；点击菜单内“安装到其他位置”模拟选择器返回结果。该入口不作为收起态的独立按钮或额外热区。

- [ ] **Step 4: 保持安装提交逻辑**

安装前继续复验路径；成功后保存最近路径、关闭弹窗并开始后台下载。关闭弹窗、切换版本或按 Escape 时关闭路径菜单。

- [ ] **Step 5: 运行静态测试**

Run: `node --test tests/mac-native-install-path-v17.test.mjs tests/mac-native-install-interaction-v16.test.mjs`

Expected: Demo 断言全部 PASS。

### Task 3: 更新 PRD 为 V1.7

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md`
- Test: `tests/mac-native-install-path-v17.test.mjs`

- [ ] **Step 1: 新增 V1.7 版本记录**

记录独立 Steam/Apple 图标、单路径下拉框、收起态引导和自定义文件夹选择器；使用飞书兼容黄色高亮。

- [ ] **Step 2: 修改 C 端大表**

“安装路径与默认选择”明确：默认路径在收起态展示；右侧文案和箭头属于同一个下拉控件；展开后可选候选路径或自定义位置；自定义位置拉起 macOS 文件夹选择器。

- [ ] **Step 3: 同步异常、埋点和附录**

无合格路径时仍允许通过“安装到其他位置”重新选择目录；增加路径选择来源参数 `install_path_source`，只上报枚举，不上报绝对路径；群同步素材改为下拉框口径。

- [ ] **Step 4: 运行文档测试**

Run: `node --test tests/mac-native-prd-v15.test.mjs tests/mac-native-install-interaction-v16.test.mjs tests/mac-native-install-path-v17.test.mjs`

Expected: 全部 PASS，事件表与参数表字段一致。

### Task 4: 浏览器验证与截图

**Files:**
- Create: `tools/capture-mac-native-v17.mjs`
- Modify: `public/prd/mac-native-version-management/04-path-largest-default.png`
- Create: `public/prd/mac-native-version-management/08-path-dropdown-expanded.png`
- Modify: `public/prd/mac-native-version-management/07-game-library-platform-badges.png`
- Create: `test-results/mac-native-v17-browser-report.json`

- [ ] **Step 1: 验证收起态**

确认 `/Applications/GameHub/` 被恢复为默认路径，收起态可见“安装到其他位置”，且点击文案或箭头均展开同一菜单。

- [ ] **Step 2: 验证展开态与自定义位置**

确认候选路径状态完整；点击菜单内“安装到其他位置”后选中模拟自定义路径；安装提交后弹窗关闭并转入后台下载。

- [ ] **Step 3: 验证独立图标与页面错误**

确认 Steam 和 Apple 角标各自为独立 20px 图标容器，不存在共同胶囊；`pageerror` 和控制台错误均为空。

- [ ] **Step 4: 截图并输出报告**

Run: `node tools/capture-mac-native-v17.mjs`

Expected: 三张图更新成功，JSON 中全部检查为通过。

### Task 5: 固定图片、推送与飞书同步

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md`
- Modify: `test-results/mac-native-prd-publish-report.md`
- Publish: 本计划涉及的 Demo、测试、脚本、图片和 PRD

- [ ] **Step 1: 提交 Demo、测试和图片**

Run: `git add -- demos/PC与Mac端/Mac原生游戏版本管理demo.html tests/mac-native-install-path-v17.test.mjs tools/capture-mac-native-v17.mjs public/prd/mac-native-version-management test-results/mac-native-v17-browser-report.json docs/superpowers/plans/2026-08-11-mac-native-install-path-dropdown.md && git commit -m "feat(mac): restore install path dropdown"`

- [ ] **Step 2: 将 PRD 图片统一锁定到上一步 40 位提交 SHA**

所有图片地址使用 `https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@<SHA>/public/prd/mac-native-version-management/<filename>.png`，逐张验证 HTTP 200 和 `image/png`。

- [ ] **Step 3: 提交 PRD、推送并验证预览**

Run: `git add -- prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md test-results/mac-native-prd-publish-report.md && git commit -m "docs(mac): publish native install PRD v1.7" && git push origin codex/guanwanggaid-5-prd-feishu-20260810`

Expected: raw.githack Demo 与固定图片均返回 HTTP 200。

- [ ] **Step 4: 同步原飞书页面**

先用版本历史恢复目标页面的完整稳定版本，再通过飞书原生 Markdown 导入生成临时文档，验证表格、黄色高亮和图片后，将原生块同步回原 Wiki 页面；不得直接粘贴外部 HTML。

- [ ] **Step 5: 最终复核**

确认原 Wiki 地址不变、V1.7 可见、C 端大表未拆散、图示位于表格内且全部可加载，并输出 Demo 预览、PRD 本地路径和飞书地址。

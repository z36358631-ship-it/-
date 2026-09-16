# Compatibility Review Detail Reuse Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将评价分享项移动到表单末尾，并把评价方案入口从简化详情替换为现有完整“启动方案详情”形态，同时保持已通过的连续旅程、公共方案池和 B 端能力不变。

**Architecture:** 继续使用现有单文件 C 端 Demo；评价表单只调整 DOM 顺序。方案详情增加一个 `solution_id → readonly view-model` 适配层，详情 UI 只消费方案本身保存的白名单配置、可信度和既有动作状态；应用、复制、异常态作为同一详情组件的状态，不另建第二套页面。

**Tech Stack:** 单文件 HTML/CSS/原生 JavaScript、Node.js `node:test`、Playwright Core、PowerShell 静态检查。

---

## 文件结构

- 修改：`demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`——评价字段顺序、完整方案详情、只读配置 view-model、复制确认与详情异常态。
- 修改：`tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`——分享位置、完整参数详情、样本门槛、复制确认、返回与异常态回归。
- 修改：`tools/capture-compatibility-review-v1.2.mjs`——让第 03 张证据校验并截取完整方案详情。
- 生成：`test-results/compatibility-review-v1.2/*.png`——仍保持 10 张证据，由截图脚本统一重建。
- 修改：`docs/superpowers/specs/2026-09-16-gamehub-compatibility-review-v1.2-design.md`——验证完成后更新阶段。
- 不修改：B 端 Demo、四个历史参考 Demo 和公共方案去重规则。

### Task 1: 用失败测试锁定分享位置和完整详情契约

**Files:**
- Modify: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs:191-218`
- Modify: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs:392-416`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 为方案 A 增加 DOM 顺序测试**

在“星级与兼容类型双向联动”测试的 5 星状态后加入：

```js
const shareOrder = await page.evaluate(() => {
  const body = document.querySelector('#modalFeedback .modal-body');
  const remarkRow = document.getElementById('fbEditor')?.closest('.fb-row');
  const media = document.getElementById('fbMediaList');
  const share = document.getElementById('fbSolutionSection');
  const footer = document.querySelector('#modalFeedback .modal-footer');
  return {
    shareIsLastBodyField: body?.lastElementChild === share,
    followsRemark: Boolean(remarkRow?.compareDocumentPosition(share) & Node.DOCUMENT_POSITION_FOLLOWING),
    followsMedia: Boolean(media?.compareDocumentPosition(share) & Node.DOCUMENT_POSITION_FOLLOWING),
    precedesFooter: Boolean(share?.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING),
  };
});
assert.deepEqual(shareOrder, {
  shareIsLastBodyField: true,
  followsRemark: true,
  followsMedia: true,
  precedesFooter: true,
}, '分享项必须位于补充说明和图片之后、固定提交栏之前');
assert.equal(await page.locator('#shareSessionCheckbox').isChecked(), false,
  '分享项默认不得勾选');
```

- [ ] **Step 2: 将旧简化详情测试改为完整参数详情测试**

把原 `#solutionCompatibilityDiff` 契约替换为：

```js
await requireOne(page, '#solutionDetailSchemeName', '方案名称');
await requireOne(page, '#solutionDetailGpu', 'GPU 标签');
await requireOne(page, '#solutionTrustSummary', '社区共同验证摘要');
await requireOne(page, '#solutionConfigGroups', '完整白名单配置分组');
assert.match(await page.locator('#solutionTrustSummary').innerText(), /社区共同验证.*成功率.*38 次验证.*最近验证/s);
assert.equal(await page.getByText(/分享者[:：]/).count(), 0, '公共方案不得显示个人分享者');
assert.ok(await page.locator('#solutionConfigGroups .solution-config-section').count() >= 3,
  '完整详情至少展示通用、兼容性和一个扩展分组');
assert.ok(await page.locator('#solutionConfigGroups .solution-config-row').count() >= 10,
  '完整详情不得退化为 GPU／架构摘要');
assert.equal(await page.getByText('同配置，可直接应用', { exact: true }).count(), 0,
  '不得保留旧简化详情结论');
for (const text of ['环境变量', '启动参数', '启动文件路径（仅展示）', '兼容层', 'Dinput 函数库', 'DXVK 版本']) {
  assert.equal(await page.getByText(text, { exact: true }).count(), 1, `完整详情缺少参数：${text}`);
}
```

- [ ] **Step 3: 增加长内容与底栏遮挡测试**

```js
await page.locator('#solutionDetailBody').evaluate((element) => {
  element.scrollTop = element.scrollHeight;
});
const geometry = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#solutionConfigGroups .solution-config-row')];
  const lastRow = rows.at(-1)?.getBoundingClientRect();
  const footer = document.getElementById('solutionDetailActions')?.getBoundingClientRect();
  return { lastBottom: lastRow?.bottom ?? 0, footerTop: footer?.top ?? 0 };
});
assert.ok(geometry.lastBottom <= geometry.footerTop,
  `最后一个参数被固定操作栏遮挡：${JSON.stringify(geometry)}`);
```

- [ ] **Step 4: 增加少样本、复制确认和异常态测试**

```js
await page.click('#solutionDetailBack');
await page.click('[data-review-state="low-sample"] .review-solution-card');
assert.match(await page.locator('#solutionTrustSummary').innerText(), /社区共同验证.*样本较少/s);
assert.doesNotMatch(await page.locator('#solutionTrustSummary').innerText(), /成功率/);

await page.click('#copySolutionButton');
assert.equal(await page.locator('#copySolutionDialog').isVisible(), true,
  '复制必须先进入现有命名确认流程');
assert.equal(await page.evaluate(() => window.compatibilityDemo.getCopiedSolutions().length), 0,
  '确认前不得创建个人副本');
await page.click('#confirmCopySolutionButton');
assert.equal(await page.evaluate(() => window.compatibilityDemo.getCopiedSolutions().length), 1);

await page.evaluate(() => window.compatibilityDemo.setSolutionDetailScenario('load-error'));
await page.evaluate(() => window.openSolutionDetail('community_cfg_adreno750_stable_v1'));
assert.match(await page.locator('#solutionDetailState').innerText(), /加载失败.*重新加载/s);
assert.equal(await page.locator('#applySolutionButton').isDisabled(), true);
assert.equal(await page.locator('#copySolutionButton').isDisabled(), true);
```

- [ ] **Step 5: 运行测试并确认先失败**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: 既有 13 条用例中的详情用例失败，错误指向缺少 `#solutionDetailSchemeName`、`#solutionConfigGroups`、`#copySolutionDialog` 或分享项 DOM 顺序不符；B 端用例继续通过。

### Task 2: 移动分享项并实现方案详情 view-model

**Files:**
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html:787-829`
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html:1158-1178`
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html:1208-1259`
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html:1300-1452`
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html:2313-2399`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 把分享区移到表单正文末尾**

删除兼容类型后的 `#fbSolutionSection`，在补充说明的 `.fb-row` 后加入：

```html
<section id="fbSolutionSection" class="fb-solution-section" hidden>
  <div class="fb-divider"></div>
  <div id="fbSolutionContent" class="fb-row"></div>
</section>
```

保留 `renderFeedbackSolution()`、默认不勾选和 1～2 星隐藏逻辑，不增加公开机制、隐私说明或交互标注。

- [ ] **Step 2: 为公共方案保存完整白名单配置正文**

在 `SEEDS` 之前定义可序列化配置组，并把深拷贝写入两个有效种子方案与每次成功会话快照：

```js
const DEFAULT_SOLUTION_CONFIG_GROUPS = Object.freeze([
  { key:'general', label:'通用', items:[
    { key:'env', label:'环境变量', description:'配置容器环境变量，匹配特定程序需求', valueType:'text', displayValue:'未配置' },
    { key:'args', label:'启动参数', description:'添加程序启动参数，用于启用特定功能或解决兼容性问题', valueType:'text', displayValue:'-dx11' },
    { key:'exe_path', label:'启动文件路径（仅展示）', description:'选择要运行的游戏或程序的 .exe 文件路径', valueType:'text', displayValue:'未配置' },
  ]},
  { key:'compatibility', label:'兼容性', items:[
    { key:'wine_ver', label:'兼容层', description:'选择 Wine 版本，不同版本的兼容性支持程度不同', valueType:'text', displayValue:'proton10.0-arm64x-2' },
    { key:'dinput', label:'Dinput 函数库', description:'决定 dinput.dll 和 dinput8.dll 优先使用游戏自带还是 Wine 内置版本', valueType:'text', displayValue:'优先原装' },
    { key:'skip_video', label:'跳过音视频解码', description:'用于处理部分游戏启动视频的兼容问题', valueType:'boolean', displayValue:'禁用' },
    { key:'surface', label:'表面格式', description:'影响图形表面兼容性', valueType:'text', displayValue:'R8G8B8A8' },
    { key:'audio_drv', label:'音频驱动', description:'控制容器音频输出', valueType:'text', displayValue:'PulseAudio' },
    { key:'dxvk', label:'DXVK 版本', description:'将 DirectX 转译为 Vulkan', valueType:'text', displayValue:'2.3（异步编译）' },
    { key:'vkd3d', label:'VKD3D 版本', description:'将 DirectX 12 转译为 Vulkan', valueType:'text', displayValue:'2.11.1' },
    { key:'cpu_trans', label:'CPU 转译器', description:'负责 x86 到 ARM64 指令转译', valueType:'text', displayValue:'FEX-Emu' },
    { key:'cpu_core', label:'CPU 核心限制', description:'控制运行时可使用的核心数量', valueType:'text', displayValue:'不限制' },
    { key:'vram', label:'显存限制', description:'设置容器显存上限', valueType:'text', displayValue:'4096 MB' },
  ]},
  { key:'dependencies', label:'组件依赖', items:[
    { key:'cjkfonts', label:'CJK 字体组件', description:'为游戏提供中日韩字体', valueType:'boolean', displayValue:'已启用' },
  ]},
  { key:'steam', label:'Steam', items:[
    { key:'steam_input_exp', label:'Steam Input（实验性）', description:'通过 Steam 输入层运行手柄配置', valueType:'boolean', displayValue:'已启用' },
  ]},
]);

function cloneSolutionConfigGroups(groups = DEFAULT_SOLUTION_CONFIG_GROUPS) {
  return JSON.parse(JSON.stringify(groups));
}
```

`upsertCommunityProfile()` 创建或命中公共方案时执行：

```js
current.configGroups = cloneSolutionConfigGroups(
  normalizedSnapshot.configGroups || current.configGroups || DEFAULT_SOLUTION_CONFIG_GROUPS,
);
```

两个 `SEEDS[].solution` 增加 `configGroups: cloneSolutionConfigGroups()`；`journeyState.sessionSnapshot`、`startGame()` 创建的新快照和 `resetJourney()` 的快照同样增加 `configGroups: cloneSolutionConfigGroups()`，保证详情正文与参与去重的同一会话方案一起存储。

- [ ] **Step 3: 建立 `solution_id → readonly view-model` 适配层**

```js
function buildSolutionDetailViewModel(solution) {
  if (!solution || solution.status !== 'published') return null;
  const configGroups = cloneSolutionConfigGroups(solution.configGroups || []);
  if (!configGroups.length) throw new Error('方案配置正文缺失');
  const verificationCount = Number(solution.validationCount ?? solution.samples ?? 0);
  return {
    solutionId: solution.id,
    solutionName: solution.name,
    status: 'available',
    gpu: { displayName: solution.gpuModel || COMMUNITY_PROFILE_DIMENSIONS.gpuModel },
    runtimeArchitecture: solution.runtimeArchitecture,
    engineVersion: solution.engineVersion,
    sourceType: 'community',
    trustSummary: {
      verificationCount,
      successRate: verificationCount >= 10 ? solution.successRate : null,
      lastVerifiedDays: Number(solution.lastVerifiedDays || 0),
      sampleSufficient: verificationCount >= 10,
    },
    configGroups,
    actions: {
      canApply: solutionApplicationMode !== 'hard',
      applyDisabledReason: solutionApplicationMode === 'hard' ? '当前设备 GPU 或运行架构不兼容' : '',
      canCopy: true,
      copyDisabledReason: '',
    },
  };
}
```

不得从评价卡的文字摘要生成 `configGroups`；配置正文缺失时进入异常态，不展示假参数。

- [ ] **Step 4: 运行测试确认数据契约通过、UI 仍失败**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: 分享位置测试通过；详情用例仍因旧 DOM 未替换而失败。

### Task 3: 复用图 4 的完整详情视觉与操作状态

**Files:**
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html:795-829`
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html:1158-1178`
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html:2313-2399`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 用完整详情 DOM 替换简化详情卡**

```html
<section id="solutionDetailPage" class="solution-detail-page" hidden aria-label="启动方案详情">
  <header class="solution-detail-header">
    <button id="solutionDetailBack" class="flow-back" type="button" aria-label="返回评价列表" onclick="closeSolutionDetail()">‹</button>
    <div class="flow-title">方案详情</div>
    <button id="refreshSolutionDetail" class="solution-refresh" type="button" aria-label="刷新方案详情" onclick="reloadSolutionDetail()">↻</button>
  </header>
  <div id="solutionDetailBody" class="solution-detail-body">
    <div id="solutionDetailState" class="solution-detail-state" hidden></div>
    <div id="solutionDetailContent">
      <h2 id="solutionDetailSchemeName"></h2>
      <div id="solutionDetailGpu" class="solution-gpu-tag"></div>
      <div id="solutionTrustSummary" class="solution-trust-summary"></div>
      <div id="solutionConfigGroups"></div>
      <div id="solutionApplyResult" aria-live="polite"></div>
    </div>
  </div>
  <div id="solutionDetailActions" class="flow-actions solution-detail-actions">
    <button id="applySolutionButton" class="primary" type="button" onclick="applyCurrentSolution()">应用</button>
    <button id="copySolutionButton" type="button" onclick="copyCurrentSolution()">复制</button>
  </div>
</section>
```

- [ ] **Step 2: 增加与图 4 一致的分组卡样式**

```css
.solution-detail-page { position:absolute; inset:0; z-index:1200; display:flex; flex-direction:column; background:#0f1115; }
.solution-detail-header { min-height:58px; padding:11px 14px; display:grid; grid-template-columns:32px 1fr 32px; align-items:center; gap:12px; }
.solution-detail-header .flow-title { text-align:center; }
.solution-refresh { width:32px; height:32px; border:0; background:transparent; color:#e7edf1; font-size:26px; cursor:pointer; }
.solution-detail-body { flex:1; min-height:0; overflow-y:auto; padding:18px 18px 28px; }
#solutionDetailSchemeName { margin:12px 0 14px; font-size:28px; line-height:1.2; }
.solution-gpu-tag { display:inline-flex; padding:7px 10px; border-radius:8px; background:rgba(255,255,255,.08); color:#e7edf1; }
.solution-trust-summary { margin:18px 0 26px; color:#9ca6ad; font-size:13px; }
.solution-config-section { margin-bottom:24px; }
.solution-config-title { margin:0 0 12px; padding-left:12px; position:relative; font-size:18px; }
.solution-config-title::before { content:''; position:absolute; left:0; top:4px; width:3px; height:16px; border-radius:3px; background:#2ca8ff; }
.solution-config-card { overflow:hidden; border:1px solid rgba(255,255,255,.1); border-radius:16px; background:#15181c; }
.solution-config-row { padding:15px 16px; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:18px; border-bottom:1px solid rgba(255,255,255,.06); }
.solution-config-row:last-child { border-bottom:0; }
.solution-config-label { color:#eef3f6; font-size:15px; font-weight:700; }
.solution-config-description { margin-top:5px; color:#7f8991; font-size:12px; line-height:1.45; }
.solution-config-value { max-width:150px; color:#e9eef1; font-size:14px; text-align:right; overflow-wrap:anywhere; }
.solution-detail-actions { flex:none; margin:0; padding:14px 18px calc(14px + env(safe-area-inset-bottom)); background:rgba(15,17,21,.97); border-top:1px solid rgba(255,255,255,.08); }
.solution-detail-actions button { min-height:46px; flex:1; }
```

底栏参与 flex 布局而非覆盖正文；`solution-detail-body` 自己滚动，保证最后一个参数不会被遮挡。

- [ ] **Step 3: 渲染可信度、分组和值**

```js
function renderSolutionTrust(summary) {
  const sample = summary.sampleSufficient && Number.isFinite(summary.successRate)
    ? `成功率 ${summary.successRate}% · ${summary.verificationCount} 次验证`
    : summary.sampleSufficient
      ? `${summary.verificationCount} 次验证`
      : `${summary.verificationCount} 次验证 · 样本较少`;
  return `社区共同验证 · ${sample} · 最近验证 ${summary.lastVerifiedDays} 天前`;
}

function renderSolutionConfigGroups(groups) {
  return groups.map((group) => `
    <section class="solution-config-section" data-config-group="${group.key}">
      <h3 class="solution-config-title">${group.label}</h3>
      <div class="solution-config-card">
        ${group.items.map((item) => `
          <div class="solution-config-row" data-config-key="${item.key}">
            <div>
              <div class="solution-config-label">${item.label}</div>
              <div class="solution-config-description">${item.description}</div>
            </div>
            <div class="solution-config-value">${item.displayValue || '未配置'}</div>
          </div>`).join('')}
      </div>
    </section>`).join('');
}
```

详情顶部只能出现“社区共同验证”，不得渲染头像、用户昵称或“分享者”。

- [ ] **Step 4: 收敛打开、刷新、返回和动作状态**

```js
let currentDetailSolutionId = '';
let solutionDetailScenario = 'ready';

function openSolutionDetail(solutionId) {
  const solution = findSolutionById(solutionId);
  currentDetailSolution = solution;
  currentDetailSolutionId = solutionId;
  document.getElementById('solutionDetailPage').hidden = false;
  renderSolutionDetailState(solutionDetailScenario);
}

function reloadSolutionDetail() {
  solutionDetailScenario = 'ready';
  if (currentDetailSolutionId) openSolutionDetail(currentDetailSolutionId);
}

function setSolutionDetailActions({ canApply = false, canCopy = false } = {}) {
  document.getElementById('applySolutionButton').disabled = !canApply;
  document.getElementById('copySolutionButton').disabled = !canCopy;
}

function renderSolutionDetailState(scenario) {
  const state = document.getElementById('solutionDetailState');
  const content = document.getElementById('solutionDetailContent');
  const result = document.getElementById('solutionApplyResult');
  const showState = (message, retry = false) => {
    state.hidden = false;
    state.innerHTML = `<p>${message}</p>${retry ? '<button id="retrySolutionDetailButton" type="button" onclick="reloadSolutionDetail()">重新加载</button>' : ''}`;
    content.hidden = true;
    setSolutionDetailActions();
  };

  if (scenario === 'loading') return showState('正在加载方案详情');
  if (scenario === 'load-error') return showState('加载失败，请重新加载', true);
  if (scenario === 'invalid' || !currentDetailSolution || currentDetailSolution.status !== 'published') {
    return showState('方案已不可用');
  }

  let viewModel;
  try {
    viewModel = buildSolutionDetailViewModel(currentDetailSolution);
  } catch (error) {
    return showState('方案配置异常，暂时无法使用');
  }
  state.hidden = true;
  state.textContent = '';
  content.hidden = false;
  document.getElementById('solutionDetailSchemeName').textContent = viewModel.solutionName;
  document.getElementById('solutionDetailGpu').textContent = `GPU：${viewModel.gpu.displayName}`;
  document.getElementById('solutionTrustSummary').textContent = renderSolutionTrust(viewModel.trustSummary);
  document.getElementById('solutionConfigGroups').innerHTML = renderSolutionConfigGroups(viewModel.configGroups);
  result.textContent = viewModel.actions.applyDisabledReason || '';
  setSolutionDetailActions(viewModel.actions);
}

function closeSolutionDetail() {
  document.getElementById('solutionDetailPage').hidden = true;
  currentDetailSolution = null;
  currentDetailSolutionId = '';
  pendingAuxiliaryConfirmation = false;
}
```

`setApplicationMode('hard')` 继续调用 `renderSolutionDetailState('ready')`；参数仍可查看，但“应用”禁用并显示现有硬条件校验原因。

- [ ] **Step 5: 运行完整详情测试**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: 分享位置、完整参数、样本门槛、滚动和应用测试通过；复制确认测试仍因确认弹窗未实现而失败。

### Task 4: 复用确认式复制并补齐异常测试钩子

**Files:**
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`
- Modify: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 增加复制命名确认弹窗**

```html
<div id="copySolutionDialog" class="modal-mask" onclick="closeCopySolutionDialog(event)">
  <div class="modal-box copy-solution-box" role="dialog" aria-modal="true" aria-labelledby="copySolutionDialogTitle" onclick="event.stopPropagation()">
    <div class="modal-hdr">
      <div id="copySolutionDialogTitle" class="modal-hdr-title">复制并保存方案</div>
      <button class="modal-x" type="button" aria-label="关闭" onclick="closeCopySolutionDialog()">×</button>
    </div>
    <div class="modal-body">
      <p class="flow-copy">方案将保存到“我的方案”中。</p>
      <input id="copySolutionName" class="copy-solution-input" maxlength="30" aria-label="方案名称">
    </div>
    <div class="modal-footer">
      <button class="btn-cancel" type="button" onclick="closeCopySolutionDialog()">取消</button>
      <button id="confirmCopySolutionButton" class="btn-submit" type="button" onclick="confirmCopyCurrentSolution()">确认复制</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: 只有确认后才创建个人副本**

```js
const COPIED_SOLUTIONS_KEY = 'gh_copied_solutions_v1';

function getCopiedSolutions() {
  try { return JSON.parse(localStorage.getItem(COPIED_SOLUTIONS_KEY) || '[]'); }
  catch (error) { return []; }
}

function closeCopySolutionDialog(event) {
  const dialog = document.getElementById('copySolutionDialog');
  if (event && event.target !== dialog) return;
  dialog.classList.remove('show');
}

function copyCurrentSolution() {
  if (!currentDetailSolution) return;
  document.getElementById('copySolutionName').value = `${currentDetailSolution.name} - 副本`;
  document.getElementById('copySolutionDialog').classList.add('show');
}

function confirmCopyCurrentSolution() {
  if (!currentDetailSolution) return;
  const input = document.getElementById('copySolutionName');
  const name = input.value.trim() || `${currentDetailSolution.name} - 副本`;
  const copies = getCopiedSolutions();
  copies.push({ id:`copy_${Date.now()}`, sourceSolutionId:currentDetailSolution.id, name });
  localStorage.setItem(COPIED_SOLUTIONS_KEY, JSON.stringify(copies));
  closeCopySolutionDialog();
  showToast('已复制到“我的方案”');
}
```

该流程只创建个人副本，不创建云分享方案，不自动发布，也不退出当前详情。

- [ ] **Step 3: 暴露无界面异常态测试 API**

在现有 `window.compatibilityDemo` 中加入：

```js
getCopiedSolutions: () => JSON.parse(JSON.stringify(getCopiedSolutions())),
setSolutionDetailScenario: (scenario) => {
  solutionDetailScenario = ['ready', 'loading', 'load-error', 'invalid'].includes(scenario)
    ? scenario
    : 'ready';
},
```

主流程默认永远是 `ready`；不得在产品 Demo 中增加场景切换按钮或说明。

- [ ] **Step 4: 运行全部浏览器测试**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: 13 条既有用例和本轮新增断言全部通过，无 `pageerror`；390×844 与 844×390 均无水平溢出。

### Task 5: 更新视觉证据并完成回归收尾

**Files:**
- Modify: `tools/capture-compatibility-review-v1.2.mjs`
- Generate: `test-results/compatibility-review-v1.2/*.png`
- Modify: `docs/superpowers/specs/2026-09-16-gamehub-compatibility-review-v1.2-design.md`

- [ ] **Step 1: 强化第 03 张完整详情证据契约**

在截取 `03-c-solution-detail-390x844.png` 前加入：

```js
await requireOne(page, '#solutionDetailSchemeName', '完整方案名称');
await requireOne(page, '#solutionDetailGpu', '方案 GPU 标签');
await requireOne(page, '#solutionTrustSummary', '社区共同验证信息');
if (await page.locator('#solutionConfigGroups .solution-config-section').count() < 3) {
  throw new Error('未实现契约：方案详情未展示完整参数分组');
}
if (await page.getByText(/分享者[:：]/).count() > 0) {
  throw new Error('未实现契约：公共方案详情仍展示个人分享者');
}
```

文件名和总数量仍保持现有 10 张，不新增演示说明图。

- [ ] **Step 2: 运行截图脚本并检查证据数量**

Run:

```powershell
node tools/capture-compatibility-review-v1.2.mjs
(Get-ChildItem 'test-results/compatibility-review-v1.2' -Filter '*.png').Count
```

Expected: 截图脚本成功，输出数字 `10`。

- [ ] **Step 3: 视觉审查 03、08 和 09**

- `03-c-solution-detail-390x844.png`：顶部为方案名称、GPU 与“社区共同验证”，正文为图 4 形态的参数分组，底部“应用／复制”固定且无遮挡。
- `08-c-proactive-review-390x844.png`：分享项位于补充说明和图片之后、提交栏之前，默认不勾选，无额外解释文案。
- `09-c-my-linked-review-390x844.png`：提交后的评价仍显示关联方案入口，完整旅程未断裂。

- [ ] **Step 4: 更新规格阶段**

全部自动化和视觉证据通过后，将规格顶部阶段改为：

```markdown
**阶段：** 评价分享位置与现有方案详情复用已实现并完成回归验收
```

- [ ] **Step 5: 执行最终验证**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
node --check tools/capture-compatibility-review-v1.2.mjs
git diff --check -- 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' 'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs' 'tools/capture-compatibility-review-v1.2.mjs' 'docs/superpowers/specs/2026-09-16-gamehub-compatibility-review-v1.2-design.md'
```

Expected: 浏览器测试全部通过、截图脚本语法通过、四个目标文件无空白错误。

- [ ] **Step 6: 执行禁止项和历史保护检查**

```powershell
$demo = 'demos\游戏详情\GUANWANGGAID-25-兼容性评价改版-C端demo.html'
$html = Get-Content -Raw -LiteralPath $demo
if ($html -match '(?i)<iframe\b|<canvas\b|https?://') { throw '发现远程资源、iframe 或 Canvas' }
if ($html -match 'demo-scenario-rail|prd-badge|prd-tooltip|交互说明|操作说明|秒玩') { throw '发现禁止的演示说明或错误业务文案' }
$ids = [regex]::Matches($html, '(?i)\bid\s*=\s*["'']([^"'']+)["'']') | ForEach-Object { $_.Groups[1].Value }
$duplicates = $ids | Group-Object | Where-Object Count -gt 1
if ($duplicates) { throw "发现重复 ID：$($duplicates.Name -join ', ')" }

$expected = @{
  'demos\游戏详情\游戏详情兼容性评价demo.html'='C4CF4A780E29C8ADCBDB06C934C9A749D2469425CD3C70DC5179780728090678'
  'demos\后台管理\admin-兼容性评价后台.html'='F4698B67D852E4E5EFA3B579A09443C8B454CD09E2D9F670C88A1A17944A3294'
  'demos\兼容性诊断引导demo.html'='ED829144BA16E4CBE785EE966617C701D02C08DDD0676F2DA46432FE4ADA53DF'
  'demos\PC与Mac端\PC模拟器优化.html'='520FAB1E86D6C1AEF5D2318EBE9F59C8974EE787F2AA0ED186F25EC094A74D89'
}
$expected.GetEnumerator() | ForEach-Object {
  $actual = (Get-FileHash -LiteralPath $_.Key -Algorithm SHA256).Hash
  if ($actual -ne $_.Value) { throw "历史 Demo 被修改：$($_.Key)" }
}
```

Expected: 无输出，退出码为 0。

- [ ] **Step 7: 同步任务板并请求产品复核**

写入评论：方案 A 位置、完整详情复用、社区共同验证、测试结果、10 张证据、历史哈希与剩余限制；事项从 `in_progress` 移回 `in_review`，不得直接标记 `done`。

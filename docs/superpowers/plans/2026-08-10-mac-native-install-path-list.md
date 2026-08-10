# Mac 原生游戏安装路径平铺 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Mac 原生游戏安装弹窗改为完整路径平铺列表，并默认选择可用空间最大的合格路径。

**Architecture:** 保持单文件 Demo 结构，在现有安装弹窗中用 `installPaths[] + selectedPathId` 替换循环路径字符串；把容量、合格判断、排序、默认选择和提交前复验拆成独立函数。静态测试验证结构和状态模型，真实浏览器测试验证选择、禁用、无合格路径、下载锁定与路径状态突变，PRD 以 V1.2 增量口径覆盖旧路径规则。

**Tech Stack:** 单文件 HTML/CSS/原生 JavaScript、Node.js `node:test`、Playwright Core、Markdown、taskctl CLI

---

## File map

- `demos/PC与Mac端/Mac原生游戏版本管理demo.html` — 安装路径列表的视觉、数据、选择和安装校验。
- `tests/mac-native-version-demo.test.mjs` — HTML 结构、CSS、状态模型和函数级静态回归。
- `tests/mac-native-version-demo.browser.test.mjs` — 真实浏览器交互、截图和异常状态回归。
- `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md` — V1.2 当前执行口径和增量验收标准。
- `tests/mac-native-prd.test.mjs` — V1.2 PRD 规则和历史口径优先级校验。
- `test-results/mac-native-version-switch/*.png` — 可评审的路径列表状态截图。
- `test-results/mac-native-install-path-delivery.json` — Delivery manifest，仅用于送审流程。

### Task 1: 认领返工并用静态测试锁定路径列表契约

**Files:**
- Modify: `tests/mac-native-version-demo.test.mjs`
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html:54-56,163-166,171-250`

- [ ] **Step 1: 读取唯一任务和全部评论，再以最新 version 进入返工状态**

Run:

```powershell
$issue = taskctl.cmd issue get 25a7d4d0-b596-4e3b-a409-746ac5410d00 --json | ConvertFrom-Json
taskctl.cmd comment list 25a7d4d0-b596-4e3b-a409-746ac5410d00 --json
if ($issue.task.identifier -ne 'GUANWANGGAID-5' -or $issue.task.projectId -ne 'guanwang-gaidong') { throw '任务范围不匹配' }
if ($issue.task.status -notin @('todo','in_review')) { throw "任务状态不允许返工：$($issue.task.status)" }
taskctl.cmd issue move 25a7d4d0-b596-4e3b-a409-746ac5410d00 --status in_progress --if-version $issue.task.version --json
```

Expected: 只更新 `GUANWANGGAID-5`，返回状态 `in_progress`；若 version 冲突或状态不匹配，立即停止，不修改文件。

- [ ] **Step 2: 写入失败的静态契约测试**

在 `tests/mac-native-version-demo.test.mjs` 的“下载期间锁定”测试前加入：

```js
test('安装位置平铺完整路径并默认选择最大合格空间', () => {
  const model = script.match(/const installPaths=\[([\s\S]*?)\];/)?.[1] ?? '';
  const stateDeclaration = script.match(/const state=\{([\s\S]*?)\};/)?.[1] ?? '';
  const sorter = functionSource('sortedInstallPaths');
  const defaultSelector = functionSource('ensureSelectedPath');

  assert.strictEqual(html.includes('id="installPathList"'), true, '缺少安装路径平铺列表');
  assert.strictEqual(html.includes('role="radiogroup"'), true, '路径列表缺少单选语义');
  assert.strictEqual(html.includes('id="pathField"'), false, '仍保留单路径字段');
  assert.strictEqual(/cyclePath|state\.installPath/.test(script), false, '仍使用循环路径状态');
  assert.match(model, /path:\s*['"]\/Volumes\/external_disk\/Gamehub\/['"]/);
  assert.match(model, /path:\s*['"]\/Applications\/GameHub\/['"]/);
  assert.match(model, /availableBytes:\s*512000000000/);
  assert.match(stateDeclaration, /selectedPathId:\s*null/);
  assert.match(sorter, /availableBytes/);
  assert.match(defaultSelector, /selectedPathId/);
});

test('异常路径禁用且无合格路径时不能安装', () => {
  const eligibility = functionSource('pathEligibility');
  const renderPaths = functionSource('renderInstallPaths');
  const install = functionSource('install');

  assert.match(eligibility, /status\s*!==\s*['"]available['"]/);
  assert.match(eligibility, /availableBytes\s*<\s*version\.requiredBytes/);
  assert.match(renderPaths, /路径不可用/);
  assert.match(renderPaths, /空间不足/);
  assert.match(renderPaths, /disabled/);
  assert.match(install, /pathEligibility/);
  assert.match(install, /selectedPathId\s*=\s*null/);
});
```

- [ ] **Step 3: 运行测试，确认新契约失败**

Run:

```powershell
node --test tests/mac-native-version-demo.test.mjs
```

Expected: FAIL，至少报告“缺少安装路径平铺列表”或缺少 `sortedInstallPaths`。

- [ ] **Step 4: 用平铺列表替换单路径字段并加入路径样式**

将安装位置 HTML 替换为：

```html
<div class="field-label" id="installPathLabel">安装位置</div>
<div class="install-path-list" id="installPathList" role="radiogroup" aria-labelledby="installPathLabel"></div>
<div class="install-path-message" id="installPathMessage"></div>
```

在现有安装弹窗样式后加入：

```css
.install-path-list{display:grid;gap:7px;max-height:222px;overflow-y:auto;scrollbar-width:none}
.install-path-list::-webkit-scrollbar{display:none}
.install-path-option{width:100%;min-height:54px;border:1px solid rgba(255,255,255,.11);border-radius:11px;background:rgba(255,255,255,.025);display:grid;grid-template-columns:20px minmax(0,1fr) 18px;align-items:center;gap:11px;padding:9px 14px;color:#aeb8bc;text-align:left}
.install-path-option:hover:not(:disabled){background:rgba(255,255,255,.045)}
.install-path-option.selected{border-color:#cfe7fb;background:rgba(207,231,251,.08)}
.install-path-option:disabled{opacity:.48;cursor:default}
.install-path-icon{width:20px;height:20px;color:#bcd7e7}
.install-path-icon svg{width:19px;height:19px}
.install-path-copy{min-width:0;display:grid;gap:4px}
.install-path-value{font-size:11px;line-height:15px;color:#dce4e7;white-space:normal;overflow-wrap:anywhere}
.install-path-meta{font-size:10px;line-height:14px;color:#89969b}
.install-path-option:disabled .install-path-meta{color:#ff8585}
.install-path-radio{width:16px;height:16px;border:1px solid #69777e;border-radius:50%;display:grid;place-items:center}
.install-path-option.selected .install-path-radio{border-color:#cfe7fb}
.install-path-option.selected .install-path-radio:after{content:'';width:8px;height:8px;border-radius:50%;background:#cfe7fb}
.install-path-message{min-height:16px;padding-top:5px;color:#ff8585;font-size:10px}
.install-path-list.locked{opacity:.58}
```

- [ ] **Step 5: 建立数值容量、排序和默认选择模型**

将版本和路径状态替换为：

```js
const versions={
  steam:{id:'steam',name:'Steam',size:'250.3 MB',requiredBytes:250300000,native:false},
  native:{id:'native',name:'Mac 原生版',size:'284.6 MB',requiredBytes:284600000,native:true}
};
const installPaths=[
  {id:'external',path:'/Volumes/external_disk/Gamehub/',availableBytes:512000000000,status:'available',order:0},
  {id:'applications',path:'/Applications/GameHub/',availableBytes:128000000000,status:'available',order:1},
  {id:'small',path:'/Volumes/SmallDisk/Gamehub/',availableBytes:128000000,status:'available',order:2},
  {id:'offline',path:'/Volumes/OfflineDisk/Gamehub/',availableBytes:0,status:'missing',order:3}
];
const state={page:'library',activeVersion:'steam',selectedVersion:'steam',selectedInstallVersion:'steam',installedVersions:new Set(['steam']),selectedPathId:null,downloadState:'idle',downloadProgress:0,downloadTimer:null};
```

在 `renderInstall()` 前加入：

```js
function formatBytes(bytes){
  if(bytes>=1000000000)return `${Number((bytes/1000000000).toFixed(1))} GB`;
  return `${Number((bytes/1000000).toFixed(1))} MB`;
}
function pathEligibility(path,version){
  if(!path||path.status!=='available')return {eligible:false,reason:'路径不可用'};
  if(path.availableBytes<version.requiredBytes)return {eligible:false,reason:'空间不足'};
  return {eligible:true,reason:`可用空间 ${formatBytes(path.availableBytes)}`};
}
function sortedInstallPaths(version){
  const rank=path=>{const result=pathEligibility(path,version);return result.eligible?0:path.status==='available'?1:2};
  return [...installPaths].sort((left,right)=>rank(left)-rank(right)||right.availableBytes-left.availableBytes||left.order-right.order);
}
function ensureSelectedPath(version,{force=false}={}){
  const current=installPaths.find(path=>path.id===state.selectedPathId);
  if(!force&&pathEligibility(current,version).eligible)return state.selectedPathId;
  state.selectedPathId=sortedInstallPaths(version).find(path=>pathEligibility(path,version).eligible)?.id??null;
  return state.selectedPathId;
}
function renderInstallPaths(version,downloading){
  const paths=sortedInstallPaths(version);
  $('#installPathList').classList.toggle('locked',downloading);
  $('#installPathList').innerHTML=paths.map(path=>{
    const result=pathEligibility(path,version),selected=path.id===state.selectedPathId;
    const meta=result.eligible?`可用空间 ${formatBytes(path.availableBytes)}`:result.reason;
    return `<button class="install-path-option ${selected?'selected':''}" data-action="select-install-path" data-path-id="${path.id}" role="radio" aria-checked="${selected}" ${downloading||!result.eligible?'disabled':''}><span class="install-path-icon"><svg><use href="#i-folder"/></svg></span><span class="install-path-copy"><strong class="install-path-value">${path.path}</strong><small class="install-path-meta">${meta}</small></span><span class="install-path-radio"></span></button>`;
  }).join('');
  $('#installPathMessage').textContent=paths.some(path=>pathEligibility(path,version).eligible)?'':'没有可用且空间足够的安装位置';
}
```

- [ ] **Step 6: 接入渲染、打开弹窗和版本切换**

将 `renderInstall()` 改为：

```js
function renderInstall(){
  const selected=versions[state.selectedInstallVersion];
  const downloading=state.downloadState==='downloading';
  const installed=state.installedVersions.has(selected.id);
  const selectedPath=installPaths.find(path=>path.id===state.selectedPathId);
  const selectedPathEligible=pathEligibility(selectedPath,selected).eligible;
  $('#summarySize').textContent=selected.size;
  $('#summaryPlatform').innerHTML=selected.native?`${icons.steam}${icons.nativeLabel}`:icons.steam;
  $('#selectedVersionIcon').innerHTML=selected.native?'<svg style="width:18px;height:18px;fill:currentColor"><use href="#i-apple"/></svg>':'<svg style="width:18px;height:18px"><use href="#i-steam"/></svg>';
  $('#selectedVersionName').textContent=selected.name;
  $('#versionMenu').innerHTML=Object.values(versions).map(v=>`<button class="version-option ${v.id===selected.id?'selected':''}" data-action="select-install-version" data-version="${v.id}" ${downloading?'disabled':''}><span class="version-icon ${v.native?'native':''}">${v.native?'<svg><use href="#i-apple"/></svg>':'<svg><use href="#i-steam"/></svg>'}</span><strong>${v.name}</strong><small>${v.size}${state.installedVersions.has(v.id)?' · 已安装':''}</small></button>`).join('');
  renderInstallPaths(selected,downloading);
  $('#versionField').classList.toggle('disabled',downloading);
  $('#versionField').setAttribute('aria-disabled',String(downloading));
  $$('#versionField [data-action="toggle-version"]').forEach(button=>{button.disabled=downloading});
  if(downloading)$('#versionField').classList.remove('open');
  $('#installBtn').textContent=downloading?'取消下载':installed?(selected.id===state.activeVersion?'当前使用':'切换版本'):'安装游戏';
  $('#installBtn').disabled=!downloading&&((installed&&selected.id===state.activeVersion)||(!installed&&!selectedPathEligible));
}
```

将 `openInstall()` 改为显式重算默认路径：

```js
function openInstall(id){
  if(!versions[id])return;
  installReturnFocus=$('#detailCta');
  state.selectedInstallVersion=id;
  state.downloadState='idle';
  state.downloadProgress=0;
  ensureSelectedPath(versions[id],{force:true});
  $('#installError').textContent='';
  $('#progress').classList.remove('show');
  $('#progressBar').style.width='0';
  $('#installOverlay').classList.add('show');
  renderInstall();
  setTimeout(()=>{$('#installOverlay').classList.contains('show')&&$('#installOverlay .modal-close')?.focus()},0);
}
```

删除 `cyclePath()`，并把版本选择分支改为：

```js
if(a==='select-install-version'&&state.downloadState!=='downloading'&&versions[t.dataset.version]){
  state.selectedInstallVersion=t.dataset.version;
  ensureSelectedPath(versions[t.dataset.version]);
  $('#versionField').classList.remove('open');
  $('#installError').textContent='';
  renderInstall();
}
```

- [ ] **Step 7: 运行静态测试并提交第一阶段**

Run:

```powershell
node --test tests/mac-native-version-demo.test.mjs
git diff --check -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html" "tests/mac-native-version-demo.test.mjs"
```

Expected: 静态测试全部 PASS，`git diff --check` 无输出。

Commit:

```powershell
git add -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html" "tests/mac-native-version-demo.test.mjs"
git commit -m "feat(mac): flatten install path selection"
```

### Task 2: 完成路径选择、安装复验和真实浏览器回归

**Files:**
- Modify: `tests/mac-native-version-demo.browser.test.mjs:50-86`
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html:218-251`
- Create: `test-results/mac-native-version-switch/06-path-list-default-largest.png`
- Create: `test-results/mac-native-version-switch/07-path-list-no-eligible.png`
- Create: `test-results/mac-native-version-switch/08-path-list-download-locked.png`

- [ ] **Step 1: 用浏览器测试定义默认、异常、空状态与锁定行为**

把现有 `#pathField` 循环路径测试块替换为：

```js
    const pathRows = page.locator('#installPathList .install-path-option');
    assert.equal(await pathRows.count(), 4);
    assert.equal(await page.evaluate(() => state.selectedPathId), 'external');
    assert.deepStrictEqual(
      await pathRows.evaluateAll(rows => rows.map(row => row.dataset.pathId)),
      ['external', 'applications', 'small', 'offline']
    );
    assert.equal((await page.locator('[data-path-id="external"] .install-path-value').textContent())?.trim(), '/Volumes/external_disk/Gamehub/');
    assert.equal(await page.locator('[data-path-id="small"]').isDisabled(), true);
    assert.match((await page.locator('[data-path-id="small"] .install-path-meta').textContent()) ?? '', /空间不足/);
    assert.equal(await page.locator('[data-path-id="offline"]').isDisabled(), true);
    assert.match((await page.locator('[data-path-id="offline"] .install-path-meta').textContent()) ?? '', /路径不可用/);
    await page.screenshot({ path: path.join(resultDir, '06-path-list-default-largest.png') });

    await page.locator('[data-path-id="applications"]').click();
    assert.equal(await page.evaluate(() => state.selectedPathId), 'applications');
    assert.equal(await page.locator('[data-path-id="applications"]').getAttribute('aria-checked'), 'true');

    await page.evaluate(() => {
      installPaths.forEach(pathItem => {
        pathItem.status = pathItem.id === 'offline' ? 'missing' : 'available';
        if (pathItem.id !== 'offline') pathItem.availableBytes = 100000000;
      });
      state.selectedPathId = null;
      ensureSelectedPath(versions[state.selectedInstallVersion], { force: true });
      renderInstall();
    });
    assert.equal(await page.evaluate(() => state.selectedPathId), null);
    assert.equal(await page.locator('#installBtn').isDisabled(), true);
    assert.match((await page.locator('#installPathMessage').textContent()) ?? '', /没有可用且空间足够/);
    await page.screenshot({ path: path.join(resultDir, '07-path-list-no-eligible.png') });

    await page.evaluate(() => {
      const external = installPaths.find(pathItem => pathItem.id === 'external');
      const applications = installPaths.find(pathItem => pathItem.id === 'applications');
      external.status = 'available';
      external.availableBytes = 512000000000;
      applications.status = 'available';
      applications.availableBytes = 128000000000;
      ensureSelectedPath(versions[state.selectedInstallVersion], { force: true });
      renderInstall();
    });
    await page.evaluate(() => { installPaths.find(pathItem => pathItem.id === 'external').status = 'missing'; });
    await page.locator('#installBtn').click();
    assert.equal(await page.evaluate(() => state.selectedPathId), null);
    assert.match((await page.locator('#installError').textContent()) ?? '', /安装位置不可用/);

    await page.evaluate(() => {
      installPaths.find(pathItem => pathItem.id === 'external').status = 'available';
      ensureSelectedPath(versions[state.selectedInstallVersion], { force: true });
      renderInstall();
    });
    await page.locator('#installBtn').click();
    assert.equal(await page.locator('#installPathList .install-path-option').first().isDisabled(), true);
    assert.equal(await page.locator('#selectedVersionName').isDisabled(), true);
    const lockedPath = await page.evaluate(() => state.selectedPathId);
    await page.evaluate(() => selectInstallPath('applications'));
    assert.equal(await page.evaluate(() => state.selectedPathId), lockedPath);
    await page.screenshot({ path: path.join(resultDir, '08-path-list-download-locked.png') });
```

保留其后的取消、重新下载、安装成功和切回 Steam 断言。

- [ ] **Step 2: 运行浏览器测试，确认交互实现尚未完整**

Run:

```powershell
node --test tests/mac-native-version-demo.browser.test.mjs
```

Expected: FAIL，报告缺少 `selectInstallPath` 或提交前路径突变没有清空选择。

- [ ] **Step 3: 实现路径点击、下载锁定和提交前复验**

在 `ensureSelectedPath()` 后加入：

```js
function selectInstallPath(id){
  if(state.downloadState==='downloading')return;
  const selected=versions[state.selectedInstallVersion];
  const path=installPaths.find(candidate=>candidate.id===id);
  if(!pathEligibility(path,selected).eligible)return;
  state.selectedPathId=id;
  $('#installError').textContent='';
  renderInstall();
}
```

将 `install()` 改为：

```js
function install(){
  const selected=versions[state.selectedInstallVersion];
  if(!selected)return;
  if(state.installedVersions.has(selected.id)){
    state.activeVersion=selected.id;
    state.selectedVersion=selected.id;
    closeInstall();
    return;
  }
  const path=installPaths.find(candidate=>candidate.id===state.selectedPathId);
  const result=pathEligibility(path,selected);
  if(!result.eligible){
    state.selectedPathId=null;
    $('#installError').textContent=path?.status==='available'?`存储空间不足，安装至少需要 ${selected.size}`:'安装位置不可用，请重新选择路径';
    renderInstall();
    return;
  }
  state.downloadState='downloading';
  state.downloadProgress=0;
  $('#installError').textContent=`正在下载 ${selected.name}…`;
  $('#progress').classList.add('show');
  renderInstall();
  state.downloadTimer=setInterval(()=>{
    state.downloadProgress+=10;
    $('#progressBar').style.width=`${state.downloadProgress}%`;
    if(state.downloadProgress>=100){
      clearInterval(state.downloadTimer);
      state.downloadTimer=null;
      state.installedVersions.add(selected.id);
      state.activeVersion=selected.id;
      state.selectedVersion=selected.id;
      state.downloadState='success';
      $('#installError').textContent='安装完成，已设为默认启动版本；原版本已保留';
      render();
      setTimeout(()=>{showPage('detail');closeInstall()},700);
    }
  },500);
}
```

在全局点击监听器中删除 `cycle-path` 分支并加入：

```js
if(a==='select-install-path')selectInstallPath(t.dataset.pathId);
```

在 `cancelDownload()` 的 `renderInstall()` 前加入：

```js
ensureSelectedPath(versions[state.selectedInstallVersion]);
```

- [ ] **Step 4: 运行浏览器与静态回归并提交第二阶段**

Run:

```powershell
node --test tests/mac-native-version-demo.test.mjs tests/mac-native-version-demo.browser.test.mjs
git diff --check -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html" "tests/mac-native-version-demo.test.mjs" "tests/mac-native-version-demo.browser.test.mjs"
```

Expected: 所有 Demo 静态和浏览器测试 PASS；生成 3 张新截图；`pageerror` 为 0。

Commit:

```powershell
git add -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html" "tests/mac-native-version-demo.test.mjs" "tests/mac-native-version-demo.browser.test.mjs" "test-results/mac-native-version-switch/06-path-list-default-largest.png" "test-results/mac-native-version-switch/07-path-list-no-eligible.png" "test-results/mac-native-version-switch/08-path-list-download-locked.png"
git commit -m "test(mac): verify install path selection states"
```

### Task 3: 将路径规则写入 PRD V1.2

**Files:**
- Modify: `tests/mac-native-prd.test.mjs`
- Modify: `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md:5-24,320-331`

- [ ] **Step 1: 先写 V1.2 失败测试**

在 `tests/mac-native-prd.test.mjs` 的 V1.1 测试前加入：

```js
test('V1.2 明确路径平铺、最大空间默认选择和异常禁用', () => {
  assert.match(prd, /\|2026-08-10\|V1\.2\|/);
  assert.match(prd, /V1\.2 与 V1\.1 冲突时以 V1\.2 为准/);
  assert.match(prd, /完整展示绝对路径和可用空间/);
  assert.match(prd, /按可用空间从大到小排列/);
  assert.match(prd, /默认选中可用空间最大的路径/);
  assert.match(prd, /空间不足和路径不可用的候选项不可选择/);
  assert.match(prd, /没有合格路径时.*“安装游戏”不可点击/);
});
```

- [ ] **Step 2: 运行 PRD 测试确认失败**

Run:

```powershell
node --test tests/mac-native-prd.test.mjs
```

Expected: FAIL，报告缺少 V1.2 修订记录。

- [ ] **Step 3: 增加 V1.2 当前执行口径和验收表**

在修订记录顶部加入：

```markdown
|2026-08-10|V1.2|郑群超|<span style="background-color: #FEF794;"><span style="color: #3370FF; font-weight: 700;">安装位置改为完整路径平铺列表，默认选择可用空间最大的合格路径；补充异常路径禁用与无合格路径规则</span></span>|根据用户对安装路径呈现和默认选择的确认方案补充；V1.2 与 V1.1 冲突时以 V1.2 为准|
```

在 V1.1 口径前加入：

```markdown
### 1.1 V1.2 当前执行口径

<span style="background-color: #FEF794;"><span style="color: #3370FF; font-weight: 700;">V1.2 只覆盖安装弹窗中的路径呈现、排序和选择规则；版本切换、下载取消、双版本保留等规则继续沿用 V1.1。</span></span>

|范围|V1.2 当前执行规则|
|---|---|
|路径呈现|安装位置区域平铺全部候选项，每项完整展示绝对路径和可用空间，不使用下拉或循环切换|
|排序与默认|合格路径按可用空间从大到小排列，默认选中可用空间最大的路径|
|异常路径|空间不足和路径不可用的候选项不可选择，置于合格路径之后并标明原因|
|无合格路径|不默认选择任何路径，显示“没有可用且空间足够的安装位置”，“安装游戏”不可点击|
|版本与下载|切换游戏版本后重新校验路径；下载中锁定路径列表；安装提交前再次校验路径和空间|

### 1.2 V1.1 历史执行口径
```

将原 `### 1.1 V1.1 当前执行口径` 标题替换为上面的 V1.1 历史标题，并把其开头说明及表头改为：

```markdown
<span style="background-color: #FEF794;"><span style="color: #3370FF; font-weight: 700;">以下规则为 V1.1 阶段的开发与验收依据，覆盖 V1.0 中“设置页直接下载并切换、空间管理和卸载”的冲突描述；与 V1.2 冲突时以 V1.2 为准。</span></span>

|范围|V1.1 阶段规则|覆盖的 V1.0 描述|
```

在现有 V1.1 增量验收标准后追加：

```markdown
### 9.4 V1.2 增量验收标准

|验收项|前置条件|操作|预期结果|优先级|
|---|---|---|---|---|
|路径平铺|存在多个候选安装位置|打开安装路径弹窗|同时显示完整绝对路径和可用空间，无需展开或循环切换|P0|
|最大空间默认|至少两个路径空间足够|打开安装路径弹窗|合格路径按空间降序，默认选中空间最大的路径|P0|
|异常路径禁用|存在空间不足或已失效路径|查看并点击异常项|异常项标明原因且不可选择|P0|
|无合格路径|全部路径空间不足或不可用|打开安装路径弹窗|无选中路径，安装按钮不可点击并显示原因|P0|
|下载中锁定|下载已开始|尝试选择其他路径|全部路径选项不可操作，实际下载路径不变|P0|
|提交前复验|已选路径在点击安装前失效|点击安装游戏|不开始下载，清空失效选择并提示重新选择，当前版本不变|P0|
```

- [ ] **Step 4: 运行 PRD 和全套测试并提交文档阶段**

Run:

```powershell
node --test tests/mac-native-version-demo.test.mjs tests/mac-native-version-demo.browser.test.mjs tests/mac-native-prd.test.mjs
git diff --check -- "prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md" "tests/mac-native-prd.test.mjs"
```

Expected: `19/19` PASS，PRD 无不可交付图片链接，`git diff --check` 无输出。

Commit:

```powershell
git add -- "prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md" "tests/mac-native-prd.test.mjs"
git commit -m "docs(mac): specify install path priority"
```

### Task 4: 视觉复核和完整回归

**Files:**
- Verify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Verify: `test-results/mac-native-version-switch/06-path-list-default-largest.png`
- Verify: `test-results/mac-native-version-switch/07-path-list-no-eligible.png`
- Verify: `test-results/mac-native-version-switch/08-path-list-download-locked.png`

- [ ] **Step 1: 运行完整自动化验证**

Run:

```powershell
node --test tests/mac-native-version-demo.test.mjs tests/mac-native-version-demo.browser.test.mjs tests/mac-native-prd.test.mjs
git diff --check
```

Expected: `19/19` PASS；真实 Chrome/Edge `pageerror` 为 0；相关差异无空白错误。

- [ ] **Step 2: 逐张检查截图**

检查标准：

```text
06：四条路径全部可见；external_disk 位于首位且为唯一选中项；完整路径不截断。
07：无路径被选中；空间不足与路径不可用原因可辨认；安装按钮禁用。
08：下载中路径行和游戏版本均锁定；弹窗按钮、进度和文字无重叠。
共同：弹窗在 1440×900 与 1280×800 下不溢出，路径列表需要滚动时只滚动列表。
```

发现视觉问题时只调整现有弹窗 CSS，并重复 Step 1 和 Step 2，不新增流程或组件。

- [ ] **Step 3: 核对任务范围内差异**

Run:

```powershell
git status --short
git diff --stat -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html" "tests/mac-native-version-demo.test.mjs" "tests/mac-native-version-demo.browser.test.mjs" "prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md" "tests/mac-native-prd.test.mjs" "docs/superpowers/specs/2026-08-10-mac-native-install-path-list-design.md" "docs/superpowers/plans/2026-08-10-mac-native-install-path-list.md" "test-results/mac-native-version-switch"
```

Expected: 只解释和提交上述范围文件；工作区其他脏文件保持原样。

### Task 5: 创建结构化 Delivery 并重新送审

**Files:**
- Create: `test-results/mac-native-install-path-delivery.json`
- Deliver: Demo、PRD、设计、计划和 3 张截图

- [ ] **Step 1: 写入用户可读的 Delivery manifest**

创建 `test-results/mac-native-install-path-delivery.json`：

```json
{
  "conclusion": "ready",
  "summaryItems": [
    "安装位置改为完整路径平铺列表，可直接比较全部候选路径",
    "合格路径按可用空间降序排列，并默认选择空间最大的路径",
    "空间不足和路径不可用的候选项禁用并明确标注原因",
    "补齐无合格路径、版本变化、下载锁定和安装前复验",
    "PRD 更新为 V1.2 当前执行口径并补齐自动化验收"
  ],
  "acceptanceSteps": [
    "打开 Demo，从详情页选择未安装的 Mac 原生版并点击下载主按钮",
    "确认安装弹窗平铺四条完整路径，external_disk 位于首位且默认选中",
    "确认空间不足和路径不可用项不可点击，并能手动选择 Applications 路径",
    "开始下载后确认路径和游戏版本锁定，取消后当前启动版本保持不变",
    "对照 PRD V1.2 增量验收表检查无合格路径和提交前路径失效状态"
  ],
  "attentionItems": [
    "Demo 的容量、磁盘状态和下载进度均为本地模拟，不读取真实磁盘",
    "本次不包含目录浏览、路径创建、空间清理或其他空间管理能力"
  ],
  "technicalDetails": "容量统一使用十进制字节口径；状态模型采用 installPaths、selectedPathId 和 requiredBytes。验证命令：node --test tests/mac-native-version-demo.test.mjs tests/mac-native-version-demo.browser.test.mjs tests/mac-native-prd.test.mjs，19/19 通过；真实浏览器 pageerror 为 0；git diff --check 通过。"
}
```

- [ ] **Step 2: 按顺序创建 Delivery 并登记每个产物**

Run:

```powershell
$deliveryResult = taskctl.cmd delivery create GUANWANGGAID-5 --manifest-file "test-results/mac-native-install-path-delivery.json" --json | ConvertFrom-Json
$deliveryId = $deliveryResult.delivery.id
taskctl.cmd delivery artifact add $deliveryId --title "Mac 原生游戏版本管理可操作 Demo" --kind demo --path "demos/PC与Mac端/Mac原生游戏版本管理demo.html" --content-type "text/html" --json
taskctl.cmd delivery artifact add $deliveryId --title "Mac 原生游戏版本管理 PRD V1.2" --kind markdown --path "prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md" --content-type "text/markdown" --json
taskctl.cmd delivery artifact add $deliveryId --title "安装路径平铺设计" --kind markdown --path "docs/superpowers/specs/2026-08-10-mac-native-install-path-list-design.md" --content-type "text/markdown" --json
taskctl.cmd delivery artifact add $deliveryId --title "安装路径平铺实施计划" --kind markdown --path "docs/superpowers/plans/2026-08-10-mac-native-install-path-list.md" --content-type "text/markdown" --json
taskctl.cmd delivery artifact add $deliveryId --title "默认选择最大空间路径" --kind image --path "test-results/mac-native-version-switch/06-path-list-default-largest.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "无合格安装路径" --kind image --path "test-results/mac-native-version-switch/07-path-list-no-eligible.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "下载中路径锁定" --kind image --path "test-results/mac-native-version-switch/08-path-list-download-locked.png" --content-type "image/png" --json
```

Expected: 创建一个 `ready` Delivery；7 个产物的 `validationStatus` 均为 `ready`。

- [ ] **Step 3: 重新读取最新 version 后提交 Delivery**

Run:

```powershell
$latest = taskctl.cmd issue get 25a7d4d0-b596-4e3b-a409-746ac5410d00 --json | ConvertFrom-Json
if ($latest.task.status -ne 'in_progress') { throw "送审前状态异常：$($latest.task.status)" }
taskctl.cmd delivery submit $deliveryId --if-version $latest.task.version --json
taskctl.cmd issue get 25a7d4d0-b596-4e3b-a409-746ac5410d00 --json
```

Expected: Delivery 状态为 `submitted`；任务通过 `delivery submit` 进入 `in_review` 并增加 version。不得使用 `issue move --status in_review`，不得移动到 `done`。

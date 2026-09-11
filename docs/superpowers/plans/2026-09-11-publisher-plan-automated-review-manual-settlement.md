# 发行人计划机器审核与人工结算 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的“实名发布、任务机器审核自动上架、投稿自动取数校验、系统只读计奖、任务级人工结算”完整同步到发行人计划 C/B Demo、PRD、流程图、验证证据和固定提交公网预览。

**Architecture:** 保留现有离线单文件 C/B Demo 和页面骨架，在维护源 JS 中增加确定性的身份、任务、投稿、预算预留与结算状态模型，再把维护源同步进 HTML 内嵌脚本。静态合同先锁定业务正反向口径，Playwright 离线验证覆盖关键交互并生成 24 张页面证据，PRD 使用截图固定提交 SHA，最后更新工作流状态并推送同一分支。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 断言、Playwright、Python Pillow/scikit-image、PowerShell PRD 校验脚本、Git。

---

## 文件结构与职责

| 文件 | 职责 | 本轮动作 |
|---|---|---|
| `demos/Mod与发行人/发行人计划demo.js` | C 端业务状态、任务浏览、发布、投稿、钱包与兑换交互维护源 | 修改 |
| `demos/Mod与发行人/发行人计划demo.html` | C 端离线单文件页面、样式和内嵌维护源 | 修改 |
| `demos/Mod与发行人/发行人计划-后台demo.js` | B 端任务异常处理、投稿处理、人工结算与创作者认证维护源 | 修改 |
| `demos/Mod与发行人/发行人计划-后台demo.html` | B 端离线单文件页面、样式和内嵌维护源 | 修改 |
| `tools/sync-publisher-plan-inline-scripts.mjs` | 将两份维护源 JS 确定性写回对应 HTML 的 `data-maintenance-source` 脚本块 | 新建 |
| `tools/verify-publisher-plan-v2.mjs` | 静态业务口径、禁项、内嵌脚本一致性和 PRD 完整性合同 | 修改 |
| `tools/verify-publisher-plan-v2-ui.mjs` | 离线交互、异常边界、截图、流程图和证据 JSON | 修改 |
| `tools/build-publisher-plan-v2-visual-evidence.py` | 未改组件的视觉回归与证据汇总 | 仅在确有基线变化时修改，否则只运行 |
| `tools/verify-publisher-plan-public-preview.mjs` | 固定提交的 C/B 公网交互验证 | 修改 |
| `prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md` | V2.3 C/B 端开发、测试、运营、数据、财务和合规规则 | 修改 |
| `public/prd/publisher-plan-v2/00-product-flow.png` | 8 步完整发行链路，实际竖版页面按每行 4 步排布 | 重生成 |
| `public/prd/publisher-plan-v2/01-task-plaza.png` 至 `23-card-alert-settings.png` | PRD 页面证据 | 重生成；重点变化为 03/04/05/06/14/15/16/17/19 |
| `docs/evidence/publisher-plan-v2/verification.json` | 离线交互、截图哈希、视觉校验与环境证据 | 重生成 |
| `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md` | 当前结论、产物、验证、Git SHA 和公网地址 | 修改 |
| `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json` | 工作流执行状态和证据哈希 | 修改；不得提交同目录 `.lock` |

## 统一字段和状态合同

所有 Demo、PRD 和测试使用同一组字段，不另起别名：

```js
const identityState = {
  realNameVerified: true,
  creatorCertified: true,
  creatorTag: null,
};

const taskRule = {
  coinPerLike: 2,
  perSubmissionCap: 10000,
  budgetCoin: 50000,
  reservedCoin: 10000,
  submitDeadline: '2026-06-25',
  likeSnapshotDeadline: '2026-06-28 23:59',
  ruleVersion: 1,
};

const calculateReward = (likes, coinPerLike, perSubmissionCap) =>
  Math.min(likes * coinPerLike, perSubmissionCap);
```

任务状态统一为：

```text
草稿 → 机器审核中 → 进行中 → 提前结束／普通下架／风险下架／自然到期 → 待人工结算 → 已结算／已结束
机器明确拒绝 → 审核不通过
机器结果不确定 → 机器审核中／人工异常处理
用户在机器审核中取消 → 已取消
```

投稿状态统一为：

```text
已提交 → 数据抓取中 → 数据校验通过，待人工结算／抓取重试／人工处理 → 已结算／已驳回／风险挂起
```

---

### Task 1: 先扩展静态业务合同并确认失败

**Files:**
- Modify: `tools/verify-publisher-plan-v2.mjs:42-140`
- Test: `tools/verify-publisher-plan-v2.mjs`

- [ ] **Step 1: 为 C 端添加新正向口径**

在现有 C Demo `mustContain` 中加入以下完整字符串：

```js
mustContain(cHtml + cJs, [
  '每 1 个赞奖励',
  '单篇最高',
  '实名认证',
  '创作者认证',
  '机器审核通过后自动发布',
  '每天最多提交 10 个任务',
  '最低 5,000 盖世币，最高 10,000,000 盖世币',
  '上传任务图片',
  '数据校验通过，待人工结算',
  '按单稿奖励上限预留',
  '最终以点赞统计截止时间的数据快照及人工结算结果为准',
  '当前任务奖池名额已满'
], 'C publishing flow');
```

- [ ] **Step 2: 为 B 端添加异常处置、结算和认证正向口径**

```js
mustContain(bHtml + bJs, [
  '机器审核记录',
  '人工异常处理',
  '普通下架',
  '风险下架',
  '重新抓取',
  '风险挂起',
  '任务级结算批次',
  '系统计算金额不可修改',
  '结算快照点赞数',
  '规则版本',
  '实名状态',
  '认证创作者',
  '定向邀请专属标签'
], 'B review and settlement flow');
```

- [ ] **Step 3: 锁定旧口径禁项**

```js
mustNotContain(cHtml + cJs + bHtml + bJs + prd, [
  '提交审核（预计24小时内）',
  '提交成功，等待审核',
  '按任务设定的阶梯规则计算奖励',
  '单条上限 = 单价 × 100',
  '自动计算: 单价×100且≥500',
  '任务到期后第3天系统自动抓取视频数据',
  '后续每隔固定周期补发新增点赞奖励',
  '身份标签已下发',
  '个人发布的任务需24小时内审核通过后上架',
  '视频不可访问</td><td>该条按0结算',
  '自定义金额'
], 'retired publisher rules');
```

- [ ] **Step 4: 锁定 PRD V2.3 必备口径**

```js
mustContain(prd, [
  'V2.3',
  '同一实名主体按北京时间自然日最多成功提交 10 个任务',
  '单任务预算下限为 5,000 盖世币',
  '单任务预算上限为 10,000,000 盖世币',
  '预计奖励 = min（当前点赞数 × 每赞单价，单稿奖励上限）',
  '结算奖励 = min（结算快照点赞数 × 每赞单价，单稿奖励上限）',
  '投稿数据校验通过时，系统按该任务的单稿奖励上限预留预算',
  '任务 ID、结算批次和投稿 ID',
  '创作者认证通过后只授予“认证创作者”身份与投稿权限',
  '专属标签是独立状态'
], 'PRD V2.3');
```

- [ ] **Step 5: 运行静态合同并确认红灯**

Run:

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: FAIL，第一条缺失信息应来自 `C publishing flow`，证明新合同能拦住当前旧实现。

- [ ] **Step 6: 提交合同红灯**

```powershell
git add tools/verify-publisher-plan-v2.mjs
git commit -m "test: lock publisher automated review rules"
```

---

### Task 2: 改造 C 端任务、身份与奖励展示模型

**Files:**
- Modify: `demos/Mod与发行人/发行人计划demo.js:1-125`
- Modify: `demos/Mod与发行人/发行人计划demo.html:1-300`
- Test: `tools/verify-publisher-plan-v2.mjs`

本任务保持“任何已登录用户可保存任务草稿、完成实名认证后可提交发布；投稿另需创作者认证”的权限边界。

- [ ] **Step 1: 将任务字段从阶梯奖励改成每赞单价和单稿上限**

删除每个任务的 `tiers`，保留现有 `reward` 和 `maxReward` 属性以控制改动规模，但统一解释为 `reward=每赞单价`、`maxReward=单稿奖励上限`。示例数据改为：

```js
const tasks=[
  {
    id:1,
    title:'中奖概率倍儿高啊啊',
    gameId:1,
    badge:'官方',
    platforms:['douyin','bilibili'],
    reward:2,
    maxReward:10000,
    pool:87100,
    reserved:30000,
    submissions:51,
    deadline:'2026-06-15',
    snapshotDeadline:'2026-06-18 23:59',
    status:'进行中',
    ruleVersion:1,
    productIntro:'超刺激的转盘抽奖小游戏，每次转动都有惊喜！玩法简单上手快，适合各年龄段玩家。',
    requirements:['视频时长≥15秒','需包含游戏实际游玩画面','投稿内容必须为视频内容']
  }
];

function calculateReward(likes,reward,maxReward){
  return Math.min(Math.max(0,Number(likes)||0)*reward,maxReward);
}
```

其余任务使用以下锁定示例值并补齐 `status`、`snapshotDeadline`、`reserved`、`ruleVersion`；不再出现 `tiers`：

| id | reward | maxReward | pool | reserved |
|---:|---:|---:|---:|---:|
| 2 | 1 | 8,000 | 50,000 | 16,000 |
| 3 | 3 | 6,000 | 30,000 | 12,000 |
| 4 | 2 | 5,000 | 25,000 | 10,000 |
| 5 | 5 | 15,000 | 60,000 | 15,000 |

- [ ] **Step 2: 增加身份和资格状态**

```js
const identityState={
  realNameVerified:true,
  creatorCertified:true,
  creatorTag:null
};

function requirePublisherIdentity(){
  if(identityState.realNameVerified) return true;
  showModal('完成实名认证','发布任务前需要先完成实名认证。',()=>{
    identityState.realNameVerified=true;
    showToast('实名认证已完成');
  });
  return false;
}

function requireSubmissionIdentity(){
  if(!identityState.realNameVerified){
    showModal('完成实名认证','投稿前需要先完成实名认证。',()=>{
      identityState.realNameVerified=true;
      showToast('实名认证已完成，请继续创作者认证');
    });
    return false;
  }
  if(!identityState.creatorCertified){
    showModal('完成创作者认证','投稿需通过创作者认证；认证门槛为社区动态不少于 5 篇且粉丝达到运营配置值。',()=>showToast('已进入创作者认证申请'));
    return false;
  }
  return true;
}
```

- [ ] **Step 3: 改写任务卡和详情奖励文案**

任务卡固定显示：

```js
`<span class="task-card-reward">${CI} 每赞 ${t.reward}</span>`
```

详情统计与规则固定显示：

```js
`<div class="num">${CI}${currentTask.reward}</div><div class="label">每赞奖励</div>`
`<div class="rule-copy">每 1 个赞奖励 ${currentTask.reward} 盖世币，单篇最高 ${currentTask.maxReward.toLocaleString()} 盖世币。</div>`
`<div class="rule-copy">预计奖励 = min（当前点赞数 × 每赞单价，单稿奖励上限）。最终以点赞统计截止时间 ${currentTask.snapshotDeadline} 的数据快照及人工结算结果为准。</div>`
```

删除阶梯表、周期补发和“奖池不足按交稿时间优先发放”；奖池资格改为单稿上限预留。

- [ ] **Step 4: 让详情投稿入口执行资格和预算检查**

```js
function beginSubmission(){
  if(!requireSubmissionIdentity()) return;
  const available=currentTask.pool-currentTask.reserved;
  if(available<currentTask.maxReward){
    showToast('当前任务奖池名额已满');
    return;
  }
  showView('submit');
}
```

把详情底部按钮绑定改为 `btn.onclick=beginSubmission`。

- [ ] **Step 5: 更新玩法说明为机器审核与人工结算口径**

`#view-rules` 的“如何参与”和“结算规则”逐字改为：

```html
<div class="section"><div class="section-title">如何参与？</div><div class="rule-copy">1. 浏览可参与任务<br>2. 完成实名认证与创作者认证<br>3. 按要求发布外站作品并提交链接<br>4. 系统抓取作品数据并自动校验<br>5. 数据校验通过后等待任务级人工结算<br>6. 结算所得盖世币可进入兑换商城</div></div>
<div class="section"><div class="section-title">结算规则</div><div class="rule-copy">发布者自行设置每赞单价和单稿奖励上限；系统按点赞统计截止时间的快照计算，运营只确认系统结果，不修改点赞、单价、上限或金额。抓取失败、作品删除、转私密或命中风险时进入重试或人工处理，不按 0 点赞结算。</div></div>
```

- [ ] **Step 6: 运行合同确认旧阶梯口径已经消失**

Run:

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: 仍 FAIL，但不再报告阶梯奖励、自动单稿上限或详情旧结算文案。

- [ ] **Step 7: 提交 C 端任务浏览与资格模型**

```powershell
git add "demos/Mod与发行人/发行人计划demo.js" "demos/Mod与发行人/发行人计划demo.html"
git commit -m "feat: align publisher task rewards and eligibility"
```

---

### Task 3: 实现 C 端发布任务机器审核流程

**Files:**
- Modify: `demos/Mod与发行人/发行人计划demo.js:110-205`
- Modify: `demos/Mod与发行人/发行人计划demo.html:150-300`
- Test: `tools/verify-publisher-plan-v2-ui.mjs`

- [ ] **Step 1: 增加提交次数、图片与审核状态**

```js
const publisherState={
  beijingDate:'2026-09-11',
  submittedToday:9,
  submitPending:false,
  uploadedImages:[]
};

function addTaskImage(input){
  const file=input.files&&input.files[0];
  if(!file) return;
  publisherState.uploadedImages=[{
    name:file.name,
    uploadStatus:'上传成功',
    machineStatus:'内容安全通过',
    ocrStatus:'OCR 敏感词通过'
  }];
  renderTaskImages();
}

function removeTaskImage(){
  publisherState.uploadedImages=[];
  renderTaskImages();
}

function renderTaskImages(){
  const container=document.getElementById('cr-image-list');
  if(!container) return;
  container.innerHTML=publisherState.uploadedImages.map(image=>`<div class="upload-file"><span>${image.name}</span><small>${image.uploadStatus} · ${image.machineStatus} · ${image.ocrStatus}</small><button type="button" onclick="removeTaskImage()">删除</button></div>`).join('');
}
```

- [ ] **Step 2: 在创建表单增加图片、用户输入上限和两个截止时间**

表单使用以下实际控件，不再调用 `calcMax()`，`cr-max` 不只读：

```html
<div class="form-group"><div class="form-label">上传任务图片（选填）</div><label class="upload-box" for="cr-image">上传任务图片</label><input id="cr-image" type="file" accept="image/*" onchange="addTaskImage(this)" hidden><div id="cr-image-list"></div><div class="form-tip">图片将进行内容安全与 OCR 敏感词检测，全部明确通过后才可发布。</div></div>
<div class="form-row"><div class="form-group"><div class="form-label">每赞单价（盖世币／赞） *</div><input class="form-input" id="cr-price" type="number" min="1" step="1"></div><div class="form-group"><div class="form-label">单稿奖励上限（盖世币） *</div><input class="form-input" id="cr-max" type="number" min="1" step="1"></div></div>
<div class="form-tip">发布者自行设置单价和单稿上限，系统只按该单价计算并展示奖励。</div>
<div class="form-group"><div class="form-label">任务总预算（盖世币） *</div><input class="form-input" id="cr-pool" type="number" min="5000" max="10000000" step="1"><div class="form-tip">最低 5,000 盖世币，最高 10,000,000 盖世币；提交后足额冻结。</div></div>
<div class="form-group"><div class="form-label">投稿截止时间 *</div><input class="form-input" id="cr-submit-deadline" type="datetime-local"></div>
<div class="form-group"><div class="form-label">点赞统计截止时间 *</div><input class="form-input" id="cr-like-deadline" type="datetime-local"></div>
<button class="btn-primary" id="submit-task-btn" onclick="submitCreate(false)">提交并进行机器审核</button>
```

- [ ] **Step 3: 增加完整字段、额度、次数和余额校验**

```js
function readPositiveInt(id){
  const value=Number(document.getElementById(id).value);
  return Number.isInteger(value)&&value>0?value:0;
}

function validateTaskDraft(){
  const reward=readPositiveInt('cr-price');
  const maxReward=readPositiveInt('cr-max');
  const pool=readPositiveInt('cr-pool');
  if(!requirePublisherIdentity()) return null;
  if(publisherState.submittedToday>=10){showToast('同一实名主体每天最多提交 10 个任务');return null;}
  if(!document.getElementById('cr-name').value.trim()){showToast('请输入任务名称');return null;}
  if(!selectedGameId){showToast('请选择推广游戏');return null;}
  if(!reward){showToast('每赞单价必须为正整数');return null;}
  if(!maxReward){showToast('单稿奖励上限必须为正整数');return null;}
  if(pool<5000||pool>10000000){showToast('任务预算需为 5,000～10,000,000 盖世币');return null;}
  if(maxReward>pool){showToast('单稿奖励上限不能高于任务总预算');return null;}
  if(pool>wallet.totalBalance){showToast('盖世币余额不足，请先充值');return null;}
  if(publisherState.uploadedImages.some(image=>image.uploadStatus!=='上传成功'||image.machineStatus!=='内容安全通过'||image.ocrStatus!=='OCR 敏感词通过')){
    showToast('请等待任务图片完成上传与机器审核');return null;
  }
  return {reward,maxReward,pool};
}
```

- [ ] **Step 4: 实现幂等提交、冻结和自动发布模拟**

```js
function taskMachineScenario(task){
  if(task.title.includes('[敏感词]')) return 'reject';
  if(task.title.includes('[超时]')) return 'manual';
  return 'pass';
}

function runTaskMachineReview(task){
  if(task.status!=='机器审核中') return;
  const scenario=taskMachineScenario(task);
  if(scenario==='reject'){
    task.status='审核不通过';
    task.reviewReason='任务名称命中敏感词';
    wallet.totalBalance+=task.pool;
    return showToast('机器审核不通过，预算已按原来源退回');
  }
  if(scenario==='manual'){
    task.status='人工异常处理';
    task.reviewReason='审核服务结果不确定';
    return showToast('机器审核结果不确定，已转人工异常处理');
  }
  task.status='进行中';
  tasks.unshift(task);
  showToast('机器审核通过后自动发布，任务已上架');
}

function submitCreate(isEdit){
  if(isEdit){showToast('进行中任务只允许追加预算或延长时间');return;}
  if(publisherState.submitPending) return;
  const draft=validateTaskDraft();
  if(!draft) return;
  publisherState.submitPending=true;
  publisherState.submittedToday+=1;
  wallet.totalBalance-=draft.pool;
  const task={
    id:Date.now(),title:document.getElementById('cr-name').value.trim(),gameId:selectedGameId,
    badge:null,platforms:['douyin','bilibili'],reward:draft.reward,maxReward:draft.maxReward,
    pool:draft.pool,reserved:0,submissions:0,deadline:'2026-06-25',snapshotDeadline:'2026-06-28 23:59',
    status:'机器审核中',statusColor:'#1890ff',ruleVersion:1,productIntro:'',requirements:['投稿内容必须为视频内容']
  };
  myPublished.unshift(task);
  showToast('任务已提交，机器审核中');
  setTimeout(()=>{
    runTaskMachineReview(task);
    publisherState.submitPending=false;
    renderMyTasks();
  },500);
}
```

- [ ] **Step 5: 将充值改成固定 SKU**

删除自定义金额输入、`calcCustom()` 和自定义金额分支。充值只从后台配置 SKU 读取：

```js
const rechargeSkus=[1000,5000,10000,50000,100000,500000];

function doRecharge(){
  if(!document.getElementById('agree-check').checked){showToast('请先同意充值协议');return;}
  const amount=Number(document.querySelector('.ra-item.selected')?.dataset.amount)||0;
  if(!rechargeSkus.includes(amount)){showToast('请选择后台配置的充值档位');return;}
  wallet.totalBalance+=amount;
  wallet.rechargeBalance+=amount;
  earnRecords.unshift({name:'充值',time:'2026-09-11 10:20',amount:`+${amount.toLocaleString()}`,type:'recharge'});
  showToast('充值成功，所得盖世币仅可用于发布任务');
  setTimeout(()=>showView('earnings'),800);
}
```

- [ ] **Step 6: 按任务状态限制管理动作**

```js
function publishedActions(task){
  if(task.status==='机器审核中') return `<span class="act-btn cancel" onclick="event.stopPropagation();cancelPendingTask(${task.id})">取消</span>`;
  if(task.status==='进行中'&&task.submissions===0) return `<span class="act-btn edit" onclick="event.stopPropagation();openTaskAdjustment(${task.id})">追加／延期</span><span class="act-btn cancel" onclick="event.stopPropagation();endTaskEarly(${task.id})">提前结束</span>`;
  if(task.status==='进行中'&&task.submissions>0) return `<span class="act-btn edit" onclick="event.stopPropagation();openTaskAdjustment(${task.id})">追加／延期</span><span class="act-btn cancel" onclick="event.stopPropagation();endTaskEarly(${task.id})">申请提前结束</span>`;
  return '';
}

function openTaskAdjustment(taskId){
  const task=myPublished.find(item=>item.id===taskId);
  if(!task||task.status!=='进行中') return showToast('仅进行中任务可追加预算或延长时间');
  document.getElementById('modal-title').textContent='追加预算／延长时间';
  document.getElementById('modal-content').innerHTML=`<div class="form-tip">每赞单价 ${task.reward}、单稿上限 ${task.maxReward.toLocaleString()} 和核心投稿要求已锁定，不可降低或修改。</div><input id="adjust-budget" class="form-input" type="number" min="0" step="1" placeholder="追加预算盖世币"><input id="adjust-deadline" class="form-input" type="date" min="${task.deadline}" value="${task.deadline}">`;
  document.getElementById('modal-confirm').onclick=()=>confirmTaskAdjustment(taskId);
  document.getElementById('modal').classList.add('show');
}

function confirmTaskAdjustment(taskId){
  const task=myPublished.find(item=>item.id===taskId);
  const extra=Number(document.getElementById('adjust-budget').value)||0;
  const deadline=document.getElementById('adjust-deadline').value;
  if(!Number.isInteger(extra)||extra<0){showToast('追加预算必须为非负整数');return;}
  if(extra>wallet.totalBalance){showToast('盖世币余额不足');return;}
  if(extra===0&&deadline===task.deadline){showToast('请追加预算或延长时间');return;}
  wallet.totalBalance-=extra;
  task.pool+=extra;
  task.deadline=deadline;
  closeModal();
  showToast('已追加预算／延长时间，原奖励规则保持不变');
  renderMyTasks();
}

function cancelPendingTask(taskId){
  const task=myPublished.find(item=>item.id===taskId);
  if(!task||task.status!=='机器审核中') return showToast('任务状态已变化，请刷新后重试');
  task.status='已取消';
  wallet.totalBalance+=task.pool;
  showToast('任务已取消，预算按原来源退回；当日提交次数不返还');
  renderMyTasks();
}

function endTaskEarly(taskId){
  const task=myPublished.find(item=>item.id===taskId);
  if(!task||task.status!=='进行中') return showToast('任务状态已变化，请刷新后重试');
  task.status=task.submissions>0?'待人工结算':'已结束';
  showToast(task.submissions>0?'已停止新增投稿，已有投稿继续人工结算':'任务已提前结束，未使用预算按来源退回');
  renderMyTasks();
}
```

机器审核中不显示编辑；进行中不显示直接取消。取消机器审核中任务时预算原路退回且当日次数不返还。

- [ ] **Step 7: 运行静态合同观察剩余缺口**

Run:

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: C 端发布新文案通过；仍因投稿、B 端和 PRD 缺失而 FAIL。

- [ ] **Step 8: 提交 C 端发布流程**

```powershell
git add "demos/Mod与发行人/发行人计划demo.js" "demos/Mod与发行人/发行人计划demo.html"
git commit -m "feat: add automated publisher task review flow"
```

---

### Task 4: 实现 C 端投稿取数、预计奖励和预算预留

**Files:**
- Modify: `demos/Mod与发行人/发行人计划demo.js:190-260`
- Modify: `demos/Mod与发行人/发行人计划demo.html:210-300`
- Test: `tools/verify-publisher-plan-v2-ui.mjs`

- [ ] **Step 1: 增加投稿数据模型**

```js
const submissions=[
  {
    id:'SUB001',taskId:1,platform:'douyin',contentId:'7382xxx',link:'https://www.douyin.com/video/7382xxx',
    title:'转盘挑战实录',description:'挑战中奖概率',tags:['游戏','转盘'],duration:36,likes:3800,
    fetchedAt:'2026-09-11 10:30',expectedReward:7600,reservedCoin:10000,
    status:'数据校验通过，待人工结算',risk:'正常'
  }
];

function normalizeContentId(link){
  try{
    const url=new URL(link);
    const parts=url.pathname.split('/').filter(Boolean);
    return parts.at(-1)||'';
  }catch{return '';}
}

const platformHosts={
  douyin:['douyin.com'],
  bilibili:['bilibili.com'],
  kuaishou:['kuaishou.com'],
  xiaohongshu:['xiaohongshu.com']
};

function linkMatchesPlatform(link,platform){
  try{
    const host=new URL(link).hostname.toLowerCase();
    return (platformHosts[platform]||[]).some(domain=>host===domain||host.endsWith(`.${domain}`));
  }catch{return false;}
}
```

- [ ] **Step 2: 在投稿页展示状态和计算口径**

```html
<div class="submission-data-card" id="submission-data-card">
  <div class="form-tip">提交后系统抓取标题、描述、标签、发布时间、时长和点赞数；抓取失败不会按 0 点赞结算。</div>
  <div class="form-tip">预计奖励随点赞数据变化，最终以点赞统计截止时间的数据快照及人工结算结果为准。</div>
</div>
```

- [ ] **Step 3: 实现正常自动校验和预留预算**

```js
function submitVideo(){
  if(!requireSubmissionIdentity()) return;
  const link=document.getElementById('video-link').value.trim();
  const selectedPlatform=document.querySelector('#submit-platforms .pm-item.selected')?.dataset.p||'';
  const contentId=normalizeContentId(link);
  if(!link){showToast('请粘贴视频链接');return;}
  if(!contentId){showToast('链接格式不正确');return;}
  if(!linkMatchesPlatform(link,selectedPlatform)){showToast('该链接非指定平台');return;}
  if(submissions.some(item=>item.platform===selectedPlatform&&item.contentId===contentId&&item.status!=='已驳回')){
    showToast('该作品已提交过，不能重复投稿');return;
  }
  const scenario=submissionScenario(link);
  if(scenario!=='normal'){
    submissions.unshift({
      id:`SUB${Date.now()}`,taskId:currentTask.id,platform:selectedPlatform,contentId,link,
      title:'',description:'',tags:[],duration:null,likes:null,fetchedAt:'—',expectedReward:null,reservedCoin:0,
      status:scenario,risk:scenario==='风险挂起'?'作品删除或转私密':scenario==='人工处理'?'基础风险命中':'抓取超时'
    });
    showToast(scenario==='抓取重试'?'外站数据暂未取全，已进入抓取重试':`${scenario}，不会按 0 点赞结算`);
    return;
  }
  const available=currentTask.pool-currentTask.reserved;
  if(available<currentTask.maxReward){showToast('当前任务奖池名额已满');return;}
  const likes=3800;
  const expectedReward=calculateReward(likes,currentTask.reward,currentTask.maxReward);
  currentTask.reserved+=currentTask.maxReward;
  submissions.unshift({
    id:`SUB${Date.now()}`,taskId:currentTask.id,platform:selectedPlatform,contentId,link,
    title:'抓取成功的作品标题',description:'抓取成功的作品描述',tags:['游戏'],duration:36,likes,
    fetchedAt:'2026-09-11 10:30',expectedReward,reservedCoin:currentTask.maxReward,
    status:'数据校验通过，待人工结算',risk:'正常'
  });
  myJoined.unshift({taskId:currentTask.id,status:'数据校验通过，待人工结算',statusColor:'#1890ff',note:`3,800 赞 · 预计 ${expectedReward.toLocaleString()} 盖世币`});
  showToast(`数据校验通过，待人工结算；已按单稿奖励上限预留 ${currentTask.maxReward.toLocaleString()} 盖世币`);
  setTimeout(()=>showView('mytask'),900);
}
```

- [ ] **Step 4: 在 Demo 中提供确定性的异常模拟入口**

链接包含以下关键词时进入指定状态，便于测试而不真实请求外站：

```js
const submissionScenario=link=>
  link.includes('timeout')?'抓取重试':
  link.includes('private')?'风险挂起':
  link.includes('risk')?'人工处理':'normal';
```

`抓取重试`、`人工处理`、`风险挂起` 均不得创建预计奖励和结算结果；只有自动校验完整通过才预留单稿上限。

- [ ] **Step 5: 验证当前静态合同只剩 B 端和 PRD 缺口**

Run:

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: C 端所有新口径满足；FAIL 仅来自 B 端或 PRD。

- [ ] **Step 6: 提交 C 端投稿流程**

```powershell
git add "demos/Mod与发行人/发行人计划demo.js" "demos/Mod与发行人/发行人计划demo.html"
git commit -m "feat: add automatic submission data checks"
```

---

### Task 5: 将 B 端任务审核改成机器记录与人工异常处理

**Files:**
- Modify: `demos/Mod与发行人/发行人计划-后台demo.js:1-170`
- Modify: `demos/Mod与发行人/发行人计划-后台demo.html:1-250`
- Test: `tools/verify-publisher-plan-v2-ui.mjs`

- [ ] **Step 1: 用机器审核记录替代常规人工通过队列**

```js
const taskReviewRecords=[
  {id:'TR001',taskId:'TASK006',title:'我的世界建筑大赛',publisher:'张三(u10086)',textCheck:'通过',imageCheck:'通过',ocrCheck:'通过',accountCheck:'通过',budgetCheck:'通过',status:'自动发布',submitTime:'2026-09-11 09:10'},
  {id:'TR002',taskId:'TASK007',title:'蛋仔派对新皮肤推广',publisher:'王五(u20088)',textCheck:'通过',imageCheck:'超时',ocrCheck:'待处理',accountCheck:'通过',budgetCheck:'通过',status:'人工异常处理',submitTime:'2026-09-11 09:15'}
];
```

保留侧栏名称“任务审核”以避免新增导航层级，但页面标题和说明改为“任务机器审核记录”，不提供正常任务逐条人工通过。

- [ ] **Step 2: 改写 `renderAuditTasks()`**

```js
function renderAuditTasks(){
  return `<div class="card"><div class="card-title">任务机器审核记录</div>
  <div class="status-note">文字、图片、OCR、账号、次数与预算全部明确通过后自动发布；只有超时、无响应或结果不确定进入人工异常处理。</div>
  <table><tr><th>记录 ID</th><th>任务</th><th>发布者</th><th>文字</th><th>图片</th><th>OCR</th><th>预算</th><th>状态</th><th>操作</th></tr>
  ${taskReviewRecords.map(item=>`<tr><td>${item.id}</td><td>${item.title}</td><td>${item.publisher}</td><td>${item.textCheck}</td><td>${item.imageCheck}</td><td>${item.ocrCheck}</td><td>${item.budgetCheck}</td><td>${item.status}</td><td>${item.status==='人工异常处理'?`<button class="btn btn-sm" onclick="retryTaskReview('${item.id}')">重新检测</button> <button class="btn btn-sm btn-danger" onclick="openRejectModal('${item.title}')">驳回</button>`:'自动完成'}</td></tr>`).join('')}</table></div>`;
}

function retryTaskReview(id){
  const record=taskReviewRecords.find(item=>item.id===id);
  if(!record||record.status!=='人工异常处理') return showToast('记录状态已变化');
  record.imageCheck='通过';
  record.ocrCheck='通过';
  record.status='自动发布';
  showToast('重新检测通过，任务已自动发布');
  renderPage('audit-task');
}
```

- [ ] **Step 3: 在任务管理增加普通下架和风险下架**

```js
let pendingTaskDown=null;

function openTaskDownModal(taskId,mode){
  const task=tasks.find(item=>item.id===taskId);
  const isRisk=mode==='risk';
  pendingTaskDown={taskId,mode};
  confirmAction(
    `${isRisk?'风险下架':'普通下架'}「${task.title}」？${isRisk?'停止新增投稿并挂起未结算投稿。':'停止新增投稿，已有投稿继续人工结算。'}操作将记录原因、操作人、时间和规则快照。`,
    ()=>confirmTaskDown()
  );
}

function confirmTaskDown(){
  const request=pendingTaskDown;
  pendingTaskDown=null;
  const task=request&&tasks.find(item=>item.id===request.taskId);
  if(!task) return showToast('任务状态已变化');
  task.status=request.mode==='risk'?'风险下架':'普通下架';
  showToast(`${task.status}成功，审计记录已保存`);
  renderPage('tasks');
}
```

任务列表中，进行中任务显示“普通下架”“风险下架”，不再显示“终止后已结算部分不退”的旧动作。

- [ ] **Step 4: 修正风控中心的 0 点赞规则**

将“视频不可访问→该条按 0 结算”改成：

```html
<tr><td>作品删除或转私密</td><td>结算前无法取得有效最终数据</td><td>风险挂起并保留预留预算，支持重新抓取、驳回或恢复；不得按 0 点赞结算</td></tr>
```

- [ ] **Step 5: 运行静态合同观察剩余缺口**

Run:

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: 任务机器审核、异常处理和下架口径通过；仍因投稿、结算、认证或 PRD 缺失而 FAIL。

- [ ] **Step 6: 提交 B 端任务审核与下架**

```powershell
git add "demos/Mod与发行人/发行人计划-后台demo.js" "demos/Mod与发行人/发行人计划-后台demo.html"
git commit -m "feat: replace manual task review with machine records"
```

---

### Task 6: 实现 B 端投稿处置与任务级人工结算

**Files:**
- Modify: `demos/Mod与发行人/发行人计划-后台demo.js:12-175`
- Modify: `demos/Mod与发行人/发行人计划-后台demo.html:1-260`
- Test: `tools/verify-publisher-plan-v2-ui.mjs`

- [ ] **Step 1: 改造投稿记录字段**

```js
const auditVideos=[
  {id:'SUB001',taskId:'TASK001',task:'中奖概率倍儿高啊啊',creator:'小明(u30001)',platform:'抖音',contentId:'7382xxx',link:'https://www.douyin.com/video/7382xxx',likes:3800,fetchedAt:'2026-09-11 10:30',coinPerLike:2,perSubmissionCap:10000,expectedReward:7600,reservedCoin:10000,risk:'正常',status:'数据校验通过，待人工结算'},
  {id:'SUB002',taskId:'TASK001',task:'中奖概率倍儿高啊啊',creator:'阿花(u30055)',platform:'B站',contentId:'BV1xxx',link:'https://www.bilibili.com/video/BV1xxx',likes:null,fetchedAt:'—',coinPerLike:2,perSubmissionCap:10000,expectedReward:null,reservedCoin:0,risk:'抓取超时',status:'抓取重试'},
  {id:'SUB003',taskId:'TASK002',task:'凡人修仙模拟器宣传',creator:'老王(u30102)',platform:'B站',contentId:'BV2xxx',link:'https://www.bilibili.com/video/BV2xxx',likes:9200,fetchedAt:'2026-09-11 10:35',coinPerLike:1,perSubmissionCap:8000,expectedReward:8000,reservedCoin:8000,risk:'异常点赞',status:'风险挂起'}
];
```

- [ ] **Step 2: 改写投稿审核页为数据处理页**

保留侧栏“视频审核”名称，但页内标题改成“投稿数据与人工处理”。表格至少展示：投稿 ID、任务、创作者、平台／内容 ID、点赞快照、抓取时间、每赞单价、单稿上限、预计奖励、预留金额、风险、状态和操作。

```js
function submissionActions(item){
  if(item.status==='抓取重试') return `<button class="btn btn-sm" onclick="refetchSubmission('${item.id}')">重新抓取</button> <button class="btn btn-sm btn-danger" onclick="rejectSubmission('${item.id}')">驳回</button>`;
  if(item.status==='风险挂起') return `<button class="btn btn-sm" onclick="refetchSubmission('${item.id}')">重新抓取</button> <button class="btn btn-sm btn-success" onclick="resumeSubmission('${item.id}')">通过</button> <button class="btn btn-sm btn-danger" onclick="rejectSubmission('${item.id}')">驳回</button>`;
  return `<button class="btn btn-sm" onclick="holdSubmission('${item.id}')">挂起</button> <button class="btn btn-sm btn-danger" onclick="rejectSubmission('${item.id}')">驳回</button>`;
}

function refetchSubmission(id){
  const item=auditVideos.find(value=>value.id===id);
  if(!item) return showToast('投稿不存在');
  item.likes=3800;
  item.fetchedAt='2026-09-11 11:20';
  item.expectedReward=Math.min(item.likes*item.coinPerLike,item.perSubmissionCap);
  item.reservedCoin=item.perSubmissionCap;
  item.risk='正常';
  item.status='数据校验通过，待人工结算';
  showToast('重新抓取成功，已进入待人工结算');
  renderPage('audit-video');
}

function holdSubmission(id){
  const item=auditVideos.find(value=>value.id===id);
  if(!item) return;
  item.status='风险挂起';
  item.risk='人工挂起';
  showToast('投稿已挂起，预留预算继续保留');
  renderPage('audit-video');
}

function resumeSubmission(id){
  const item=auditVideos.find(value=>value.id===id);
  if(!item) return;
  item.status='数据校验通过，待人工结算';
  item.risk='人工确认正常';
  showToast('投稿已恢复待人工结算');
  renderPage('audit-video');
}

function rejectSubmission(id){
  const item=auditVideos.find(value=>value.id===id);
  if(!item) return;
  item.status='已驳回';
  item.reservedCoin=0;
  showToast('投稿已驳回，预留预算已释放');
  renderPage('audit-video');
}
```

- [ ] **Step 3: 使用任务级结算批次模型**

```js
const settlementBatches=[
  {
    id:'BATCH20260911001',taskId:'TASK001',task:'中奖概率倍儿高啊啊',ruleVersion:1,
    budgetCoin:100000,reservedCoin:20000,settledCoin:0,estimatedReturnCoin:80000,
    status:'待人工结算',createdAt:'2026-09-11 11:00',
    items:[
      {submissionId:'SUB001',creator:'小明(u30001)',contentId:'7382xxx',snapshotLikes:5800,snapshotAt:'2026-09-11 10:59',coinPerLike:2,perSubmissionCap:10000,calculatedReward:10000,status:'待确认'},
      {submissionId:'SUB004',creator:'Nine9(u30200)',contentId:'7399xxx',snapshotLikes:1200,snapshotAt:'2026-09-11 10:59',coinPerLike:2,perSubmissionCap:10000,calculatedReward:2400,status:'待确认'}
    ]
  }
];

function calculateSettlement(item){
  return Math.min(item.snapshotLikes*item.coinPerLike,item.perSubmissionCap);
}
```

- [ ] **Step 4: 将结算页改成批次级只读复核**

```js
function assertBatchAmounts(batch){
  return batch.items.every(item=>item.calculatedReward===calculateSettlement(item));
}

function settleBatch(batchId){
  const batch=settlementBatches.find(item=>item.id===batchId);
  if(!batch||batch.status!=='待人工结算') return showToast('该结算批次已处理，请勿重复操作');
  if(batch.items.some(item=>item.status==='风险挂起')) return showToast('批次仍有风险挂起投稿，不能确认结算');
  if(!assertBatchAmounts(batch)) return showToast('系统计算结果异常，请重新抓取后处理');
  batch.status='已结算';
  batch.items.forEach(item=>{if(item.status!=='已驳回') item.status='已结算';});
  showToast('人工确认完成，系统已按任务 ID＋结算批次＋投稿 ID 幂等入账');
  renderPage('settlement');
}

function handleSettlementItem(batchId,submissionId,action){
  const batch=settlementBatches.find(value=>value.id===batchId);
  const item=batch&&batch.items.find(value=>value.submissionId===submissionId);
  if(!item||batch.status!=='待人工结算') return showToast('结算记录状态已变化');
  if(action==='refetch'){
    item.snapshotAt='2026-09-11 11:30';
    item.calculatedReward=calculateSettlement(item);
    item.status='待确认';
    return showToast('最终点赞快照已重新抓取，系统金额已重算');
  }
  if(action==='hold'){
    item.status='风险挂起';
    return showToast('投稿已挂起，预留预算继续保留');
  }
  if(action==='reject'){
    item.status='已驳回';
    return showToast('投稿已驳回，预留与实际金额差额将按账务规则释放');
  }
  showToast('不支持的结算操作');
}
```

结算详情里的点赞、单价、单稿上限、创作者、规则版本和系统金额全部以文本展示；不得渲染可编辑 `input`。

- [ ] **Step 5: 在结算页固定显示人工权限边界**

```html
<div class="status-note"><strong>系统计算金额不可修改。</strong>结算人员只能确认、驳回、挂起或重新抓取；不得修改结算快照点赞数、每赞单价、单稿上限、创作者、盖世币来源或系统计算金额。</div>
```

- [ ] **Step 6: 运行静态合同观察剩余认证和 PRD 缺口**

Run:

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: 投稿处理和人工结算口径通过；FAIL 只来自创作者认证、PRD 或内嵌脚本同步。

- [ ] **Step 7: 提交 B 端投稿与结算**

```powershell
git add "demos/Mod与发行人/发行人计划-后台demo.js" "demos/Mod与发行人/发行人计划-后台demo.html"
git commit -m "feat: add manual publisher settlement batches"
```

---

### Task 7: 修正创作者实名认证、认证身份与专属标签关系

**Files:**
- Modify: `demos/Mod与发行人/发行人计划-后台demo.js:492-620`
- Modify: `demos/Mod与发行人/发行人计划-后台demo.html:615-744`
- Test: `tools/verify-publisher-plan-v2.mjs`

- [ ] **Step 1: 扩展创作者申请数据**

```js
const creatorApps=[
  {id:'CA001',uid:'u10086',name:'张三',avatar:'ZS',realNameStatus:'已实名',applyTime:'2026-09-10 14:30',direction:'游戏攻略',posts:56,fans:2300,requiredFans:500,status:'待审核',creatorTag:null},
  {id:'CA004',uid:'u30102',name:'老王',avatar:'LW',realNameStatus:'已实名',applyTime:'2026-09-09 10:20',direction:'游戏评测',posts:89,fans:12000,requiredFans:500,status:'已通过',creatorTag:null},
  {id:'CA005',uid:'u30200',name:'Nine9',avatar:'N9',realNameStatus:'已实名',applyTime:'2026-09-08 16:40',direction:'MOD制作',posts:23,fans:3400,requiredFans:500,status:'已通过',creatorTag:'优质视频创作者'}
];
```

- [ ] **Step 2: 展示实名、门槛与标签状态**

创作者列表和详情增加“实名状态”“当前粉丝门槛”“专属标签”三项；申请不足 5 篇或粉丝低于 `requiredFans` 时通过按钮禁用并显示“未达门槛”。

- [ ] **Step 3: 修正认证通过文案**

```js
if(action==='pass'){
  if(a.realNameStatus!=='已实名'||a.posts<5||a.fans<a.requiredFans){
    showToast('实名或创作者认证门槛未满足');
    return;
  }
  a.status='已通过';
  showToast(`已通过 ${a.name} 的创作者认证，仅授予认证身份与投稿权限`);
}
```

- [ ] **Step 4: 增加独立标签邀请动作**

```js
function inviteCreatorTag(id){
  const creator=creatorApps.find(item=>item.id===id);
  if(!creator||creator.status!=='已通过') return showToast('仅认证创作者可定向邀请专属标签');
  creator.creatorTag='优质视频创作者';
  showToast(`已根据产出表现定向邀请 ${creator.name} 获得专属标签`);
  renderPage('creator-audit');
}
```

只有已通过且尚无标签的记录显示“定向邀请专属标签”；认证通过动作不得调用本函数。

- [ ] **Step 5: 运行静态合同**

Run:

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: 如果内嵌 JS 尚未同步，则只因 `inline script differs from maintenance source` 失败；业务字符串均满足。

- [ ] **Step 6: 提交创作者认证改造**

```powershell
git add "demos/Mod与发行人/发行人计划-后台demo.js" "demos/Mod与发行人/发行人计划-后台demo.html"
git commit -m "feat: separate creator certification and invited tags"
```

---

### Task 8: 增加内嵌脚本同步工具并恢复单文件一致性

**Files:**
- Create: `tools/sync-publisher-plan-inline-scripts.mjs`
- Modify: `demos/Mod与发行人/发行人计划demo.html`
- Modify: `demos/Mod与发行人/发行人计划-后台demo.html`
- Test: `tools/verify-publisher-plan-v2.mjs`

- [ ] **Step 1: 新建确定性同步工具**

`tools/sync-publisher-plan-inline-scripts.mjs` 使用以下完整实现：

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const pairs=[
  ['demos/Mod与发行人/发行人计划demo.html','demos/Mod与发行人/发行人计划demo.js','发行人计划demo.js'],
  ['demos/Mod与发行人/发行人计划-后台demo.html','demos/Mod与发行人/发行人计划-后台demo.js','发行人计划-后台demo.js']
];

for(const [htmlRelative,jsRelative,sourceName] of pairs){
  const htmlPath=path.join(root,htmlRelative);
  const jsPath=path.join(root,jsRelative);
  const html=fs.readFileSync(htmlPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  const opening=`<script data-maintenance-source="${sourceName}">`;
  const start=html.indexOf(opening);
  assert.notEqual(start,-1,`${htmlRelative} missing ${opening}`);
  const contentStart=start+opening.length;
  const end=html.indexOf('</script>',contentStart);
  assert.notEqual(end,-1,`${htmlRelative} missing closing script tag`);
  const eol=html.includes('\r\n')?'\r\n':'\n';
  const normalizedJs=js.replace(/\r?\n/g,eol);
  const next=`${html.slice(0,contentStart)}${eol}${normalizedJs}${html.slice(end)}`;
  fs.writeFileSync(htmlPath,next,'utf8');
  console.log(`synced ${sourceName}`);
}
```

- [ ] **Step 2: 运行同步工具**

Run:

```powershell
node tools/sync-publisher-plan-inline-scripts.mjs
```

Expected:

```text
synced 发行人计划demo.js
synced 发行人计划-后台demo.js
```

- [ ] **Step 3: 运行静态合同确认业务改造仍需 PRD**

Run:

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected: 内嵌脚本一致性通过；FAIL 只来自 PRD V2.3 缺失。

- [ ] **Step 4: 提交同步工具和单文件**

```powershell
git add tools/sync-publisher-plan-inline-scripts.mjs "demos/Mod与发行人/发行人计划demo.html" "demos/Mod与发行人/发行人计划-后台demo.html"
git commit -m "build: sync publisher demo inline scripts"
```

---

### Task 9: 扩展离线 UI 验证并重做完整发行流程图

**Files:**
- Modify: `tools/verify-publisher-plan-v2-ui.mjs:1-448`
- Modify: `public/prd/publisher-plan-v2/00-product-flow.png`
- Modify: `public/prd/publisher-plan-v2/03-task-detail.png`
- Modify: `public/prd/publisher-plan-v2/04-my-tasks.png`
- Modify: `public/prd/publisher-plan-v2/05-submit-work.png`
- Modify: `public/prd/publisher-plan-v2/06-create-task.png`
- Modify: `public/prd/publisher-plan-v2/08-recharge.png`
- Modify: `public/prd/publisher-plan-v2/14-task-management.png`
- Modify: `public/prd/publisher-plan-v2/15-task-review.png`
- Modify: `public/prd/publisher-plan-v2/16-video-review.png`
- Modify: `public/prd/publisher-plan-v2/17-settlement.png`
- Modify: `public/prd/publisher-plan-v2/19-creator-review.png`
- Modify: `docs/evidence/publisher-plan-v2/verification.json`
- Test: `tools/verify-publisher-plan-v2-ui.mjs`

- [ ] **Step 1: 增加奖励公式、资格和固定 SKU 断言**

```js
assert.equal(await page.evaluate(() => calculateReward(3800,2,10000)),7600);
assert.equal(await page.evaluate(() => calculateReward(8000,2,10000)),10000);
assert.equal(await page.getByText('每 1 个赞奖励 2 盖世币', {exact:false}).count()>0,true);
assert.equal(await page.getByText('单篇最高 10,000 盖世币', {exact:false}).count()>0,true);
assert.equal(await page.locator('#custom-amt').count(),0,'充值不得支持自定义金额');
```

用独立页面实例把 `identityState.realNameVerified=false` 后点击发布，断言实名认证弹窗出现；把 `creatorCertified=false` 后点击投稿，断言创作者认证弹窗出现。

- [ ] **Step 2: 增加任务发布边界断言**

使用创建任务表单依次覆盖：

```js
await page.evaluate(() => { publisherState.submittedToday=10; });
await page.locator('#submit-task-btn').click();
assert.equal(await page.getByText('同一实名主体每天最多提交 10 个任务',{exact:true}).count(),1);

await page.evaluate(() => { publisherState.submittedToday=9; });
await page.locator('#cr-pool').fill('4999');
await page.locator('#submit-task-btn').click();
assert.equal(await page.getByText('任务预算需为 5,000～10,000,000 盖世币',{exact:true}).count(),1);

await page.locator('#cr-pool').fill('10000001');
await page.locator('#submit-task-btn').click();
assert.equal(await page.getByText('任务预算需为 5,000～10,000,000 盖世币',{exact:true}).count(),1);
```

正常提交后断言状态先为“机器审核中”，再等待 500ms 断言“进行中”和“机器审核通过后自动发布，任务已上架”。

- [ ] **Step 3: 增加投稿和预算预留断言**

```js
const beforeReserved=await page.evaluate(() => currentTask.reserved);
await page.locator('#video-link').fill('https://www.douyin.com/video/valid-001');
await page.getByRole('button',{name:'提交投稿'}).click();
assert.equal(await page.getByText('数据校验通过，待人工结算',{exact:false}).count()>0,true);
const submissionResult=await page.evaluate(() => ({
  status:submissions[0].status,
  likes:submissions[0].likes,
  expectedReward:submissions[0].expectedReward,
  reservedDelta:currentTask.reserved-beforeReserved
}));
assert.deepEqual(submissionResult,{status:'数据校验通过，待人工结算',likes:3800,expectedReward:7600,reservedDelta:10000});
```

再用 `timeout`、重复 content ID 和不足单稿上限三个用例，分别断言“抓取重试”“该作品已提交过，不能重复投稿”“当前任务奖池名额已满”，且未新增结算奖励。

- [ ] **Step 4: 增加 B 端人工边界断言**

```js
await adminPage.evaluate(() => switchPage('audit-task'));
assert.equal(await adminPage.getByText('任务机器审核记录',{exact:true}).count(),1);
assert.equal(await adminPage.getByRole('button',{name:'通过'}).count(),0,'正常任务不得进入人工发布通过队列');

await adminPage.evaluate(() => switchPage('audit-video'));
for(const text of ['数据校验通过，待人工结算','抓取重试','风险挂起','重新抓取']){
  assert.equal(await adminPage.getByText(text,{exact:false}).count()>0,true,`missing ${text}`);
}

await adminPage.evaluate(() => switchPage('settlement'));
assert.equal(await adminPage.getByText('任务级结算批次',{exact:false}).count()>0,true);
assert.equal(await adminPage.locator('input[data-settlement-amount]').count(),0);
const beforeStatus=await adminPage.evaluate(() => settlementBatches[0].status);
await adminPage.evaluate(() => settleBatch('BATCH20260911001'));
const afterFirst=await adminPage.evaluate(() => settlementBatches[0].status);
await adminPage.evaluate(() => settleBatch('BATCH20260911001'));
const afterSecond=await adminPage.evaluate(() => settlementBatches[0].status);
assert.deepEqual([beforeStatus,afterFirst,afterSecond],['待人工结算','已结算','已结算']);
```

- [ ] **Step 5: 增加认证与专属标签断言**

```js
await adminPage.evaluate(() => switchPage('creator-audit'));
assert.equal(await adminPage.getByText('实名状态',{exact:true}).count()>0,true);
await adminPage.evaluate(() => auditCreator('CA001','pass'));
assert.equal(await adminPage.evaluate(() => creatorApps.find(item=>item.id==='CA001').creatorTag),null);
await adminPage.evaluate(() => inviteCreatorTag('CA001'));
assert.equal(await adminPage.evaluate(() => creatorApps.find(item=>item.id==='CA001').creatorTag),'优质视频创作者');
```

- [ ] **Step 6: 将产品流程图改成 8 个实际竖版步骤、每行 4 步**

流程步骤固定为：

```js
const flowSteps=[
  ['1','实名后创建任务','06-create-task.png'],
  ['2','配置图片与奖励','06-create-task.png'],
  ['3','机器审核自动发布','04-my-tasks.png'],
  ['4','认证创作者查看任务','03-task-detail.png'],
  ['5','提交外站作品链接','05-submit-work.png'],
  ['6','数据校验并预留预算','04-my-tasks.png'],
  ['7','任务级人工结算','04-my-tasks.png'],
  ['8','盖世币奖励到账','07-wallet.png']
];
```

合成容器改成 `grid-template-columns:repeat(4,1fr)`，宽 1800px；每个步骤只用脚本本次实际截图生成的竖版 App 页面，第一行 1—4、第二行 5—8。使用卡片之间的标准箭头，不绘制跨屏幕的折线；第 4 步到第 5 步使用向下箭头。最终 `00-product-flow.png` 必须是一张图。

- [ ] **Step 7: 运行离线 UI 验证与截图生成**

Run:

```powershell
node tools/verify-publisher-plan-v2-ui.mjs
```

Expected:

```text
PASS: publisher plan V2 UI, 24 screenshots captured
```

并确认 `docs/evidence/publisher-plan-v2/verification.json` 中：

```json
{
  "status": "pass",
  "contract": {
    "dailyTaskLimit": 10,
    "taskBudgetMin": 5000,
    "taskBudgetMax": 10000000,
    "rewardFormula": "min(likes * coinPerLike, perSubmissionCap)",
    "submissionReserve": "perSubmissionCap",
    "taskReview": "machine-auto-publish",
    "settlement": "manual-confirm-system-calculated"
  }
}
```

- [ ] **Step 8: 生成视觉证据**

Run:

```powershell
python tools/build-publisher-plan-v2-visual-evidence.py
```

Expected: `PASS: visual evidence generated; strict component passed`。如果钱包顶部栏未改，其几何误差仍须 `<= 2px`。

- [ ] **Step 9: 原尺寸审图**

逐张查看 `00-product-flow.png` 和重点页面 `03/04/05/06/14/15/16/17/19`，确认：文字不截断、按钮无重叠、状态可辨识、流程图每行正好 4 个竖版页面、图中无旧阶梯／自动结算／人工任务通过入口。

- [ ] **Step 10: 提交交互验证和页面证据**

```powershell
git add tools/verify-publisher-plan-v2-ui.mjs tools/build-publisher-plan-v2-visual-evidence.py public/prd/publisher-plan-v2 docs/evidence/publisher-plan-v2
git commit -m "test: verify publisher review and settlement journeys"
```

---

### Task 10: 将 PRD 升级为 V2.3 并通过质量合同

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md:1-405`
- Test: `.agents/skills/to-prd/scripts/validate-prd-quality.ps1`
- Test: `.agents/skills/to-prd/scripts/validate-prd-images.ps1`
- Test: `tools/verify-publisher-plan-v2.mjs`

- [ ] **Step 1: 增加 V2.3 修订记录和版本备注**

```markdown
| 2026/9/11 | 放开所有实名用户发布任务；任务改为机器审核自动发布；投稿改为自动取数校验；奖励由每赞单价与单稿上限计算；增加单稿预算预留、任务级人工结算、下架边界、实名与专属标签规则 | V2.3 | 郑群超 |

**备注：** 搜2026.9.11修改；本次增量见 V2.3。
```

- [ ] **Step 2: 更新文档概述、术语和完整流程**

新增或修订术语：实名主体、认证创作者、专属标签、机器审核、标准化平台内容 ID、数据校验通过、预算预留、点赞统计截止时间、结算批次、普通下架、风险下架。产品流程图说明固定为：

```markdown
*产品流程：1 实名后创建任务 → 2 配置图片与奖励 → 3 机器审核通过后自动发布 → 4 已实名且已认证创作者查看任务 → 5 提交外站作品链接 → 6 系统抓取数据、校验并按单稿上限预留预算 → 7 运营按任务级批次人工确认系统计算结果 → 8 发行任务奖励盖世币到账。异常任务、投稿和结算进入人工处置，不默认放行或按 0 点赞结算。*
```

- [ ] **Step 3: 按页面六要素更新 C 端 3.1.1—3.1.8**

每个页面继续保留“功能简介、场景描述、输入／前置条件、需求描述、输出／后置条件、补充说明”六要素；按下表逐页写入明确规则：

| 页面 | 必须写入 |
|---|---|
| 找任务 | 卡片展示每赞单价、单稿上限、奖池；机器审核明确通过的任务才出现 |
| 玩法说明 | 发布实名、投稿双认证、机器审核、自动取数、人工结算和完整异常口径 |
| 任务详情 | 每赞单价、单稿上限、预计奖励公式、两个截止时间、按单稿上限保障名额 |
| 做任务 | 机器审核中只能取消；进行中不能直接取消；投稿状态不得简写为审核通过 |
| 提交投稿 | 标准化内容 ID、完整数据、敏感词、重复、风险、预算预留、失败重试 |
| 创建发行任务 | 图片安全与 OCR、自然日 10 次、5,000～10,000,000、正整数单价和上限、冻结、自动发布 |
| 钱包 | 发行任务结算来源可兑换，充值来源和退回来源不改变现有规则 |
| 充值 | 只支持后台固定 SKU；100 盖世币＝1 元只作充值与预算口径，不承诺兑回 |

- [ ] **Step 4: 按页面六要素更新 B 端 3.2.2—3.2.7**

| 页面 | 必须写入 |
|---|---|
| 任务管理 | 规则快照、奖励字段、普通／风险下架、已有投稿与预算处理 |
| 任务审核 | 改为机器审核记录和人工异常处理；删除常规人工通过 SLA |
| 视频审核 | 改为投稿数据与人工处理；展示点赞、取数时间、预计奖励、预留、风险和重抓 |
| 结算管理 | 任务级批次、最终快照、系统只读公式、人工动作边界和幂等入账 |
| 风控中心 | 抓取失败、删除、私密、异常点赞均挂起，不按 0 点赞结算 |
| 创作者审核 | 实名、5 篇、粉丝后台门槛；认证只授予身份；标签按产出定向邀请 |

- [ ] **Step 5: 增加任务与投稿状态表和公式**

PRD 逐字包含：

```text
预计奖励 = min（当前点赞数 × 每赞单价，单稿奖励上限）
结算奖励 = min（结算快照点赞数 × 每赞单价，单稿奖励上限）
```

并写清“点赞数、单价、单稿上限和盖世币均为整数；不增加固定奖励、阶梯奖励、风险系数或人工调整项”。

- [ ] **Step 6: 增加一致的埋点事件**

在保留京东卡事件的基础上新增以下唯一事件名：

| 事件 | 触发 | 参数 |
|---|---|---|
| `publisher_task_submit` | 任务提交成功进入机器审核且完成次数计数和预算冻结 | uid, task_id, daily_submit_count, coin_per_like, per_submission_cap, budget_coin, image_count, result_status, fail_reason |
| `publisher_task_machine_review_result` | 机器审核得到明确通过、明确拒绝或转人工结果 | task_id, rule_version, text_check_result, image_check_result, ocr_check_result, result_status, fail_reason |
| `publisher_submission_submit` | 唯一投稿记录创建成功 | uid, task_id, submission_id, platform, content_id |
| `publisher_submission_check_result` | 抓取与自动校验进入待结算、重试、人工或挂起 | task_id, submission_id, content_id, likes, fetched_at, expected_reward, reserved_coin, result_status, fail_reason |
| `publisher_task_end_action` | 发布者提前结束或运营普通／风险下架成功 | task_id, operator_role, action_type, task_status, affected_submission_count |
| `publisher_settlement_batch_action` | 运营确认、驳回、挂起或重抓结算批次 | batch_id, task_id, submission_count, settlement_coin, action_type, result_status, fail_reason |
| `publisher_creator_certification_action` | 运营通过、驳回或撤销创作者认证 | uid, application_id, real_name_status, posts, fans, required_fans, action_type, result_status |
| `publisher_creator_tag_invite` | 运营基于产出定向邀请专属标签 | uid, tag_id, operator_id, result_status |

参数表逐一给出类型、必填性和枚举，`result_status` 复用时按事件列明合法值，不能用一个模糊枚举覆盖所有流程。

- [ ] **Step 7: 更新技术、运营、测试与待确认项**

技术需求写入：北京时间自然日限次、实名主体聚合、幂等提交、冻结／预留／释放／结算账务、外站取数证据、任务规则版本、任务 ID＋批次＋投稿 ID 幂等、人工只读字段和操作审计。

待确认项只保留真正影响正式开发或上线的配置：支持外站与取数接口、敏感词／图片服务和超时重试次数、粉丝门槛初值、高金额是否双人复核、正式充值 SKU、既有京东卡事项。不得把本轮已确认的“任何人可发布”“机器审核”“人工结算”“单价和上限由发布者设置”重新列为待确认。

- [ ] **Step 8: 运行静态合同**

Run:

```powershell
node tools/verify-publisher-plan-v2.mjs
```

Expected:

```text
PASS: publisher plan V2 static contract
```

- [ ] **Step 9: 运行 PRD 质量校验**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/to-prd/scripts/validate-prd-quality.ps1 -Path "prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md"
```

Expected: `0 错误，0 警告`。

- [ ] **Step 10: 运行本地图片引用校验**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/to-prd/scripts/validate-prd-images.ps1 -Path "prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md"
```

Expected: 24 张图片引用全部通过，且不存在占位 SHA。

- [ ] **Step 11: 提交 PRD 内容，但暂不改图片 SHA**

```powershell
git add "prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md"
git commit -m "docs: update publisher plan v2.3 requirements"
```

---

### Task 11: 固定图片提交、更新 PRD 图片地址并验证公网资源

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md`
- Test: `.agents/skills/to-prd/scripts/validate-prd-images.ps1`

- [ ] **Step 1: 取得包含新截图的固定提交 SHA**

Run:

```powershell
git rev-parse HEAD
```

Expected: 返回 40 位小写十六进制 SHA，记为本轮图片提交 SHA；不得使用分支名、短 SHA 或未来提交。

- [ ] **Step 2: 将 PRD 中 24 张图片 URL 统一替换为该固定 SHA**

所有图片地址统一满足：

```text
https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@<40位图片提交SHA>/public/prd/publisher-plan-v2/<图片文件名>.png
```

只替换 `@` 后的 SHA，不改变文件名；飞书无法识别相对路径或本地路径，所以 PRD 不得引用 `file://`、工作区绝对路径或分支型 URL。

- [ ] **Step 3: 提交固定图片地址**

```powershell
git add "prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md"
git commit -m "docs: pin publisher plan v2.3 images"
```

- [ ] **Step 4: 推送当前分支，使固定图片提交公网可读**

```powershell
git push origin codex/guanwanggaid-41-publisher-plan-v2-20260910
```

Expected: 推送成功，远端包含截图提交和 PRD 固定图片地址提交。

- [ ] **Step 5: 验证 24 张远程图片**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/to-prd/scripts/validate-prd-images.ps1 -Path "prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md" -VerifyRemote
```

Expected: 24/24 返回 HTTP 成功，MIME 为 `image/png`，没有 jsDelivr 404 或 HTML 响应。

- [ ] **Step 6: 复跑静态与 PRD 质量合同**

Run:

```powershell
node tools/verify-publisher-plan-v2.mjs
powershell -ExecutionPolicy Bypass -File .agents/skills/to-prd/scripts/validate-prd-quality.ps1 -Path "prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md"
```

Expected: 静态合同 PASS；PRD 质量 `0 错误，0 警告`。

---

### Task 12: 固定公网 Demo、更新状态卡并完成最终对账

**Files:**
- Modify: `tools/verify-publisher-plan-public-preview.mjs:1-60`
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md`
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json`
- Test: `tools/verify-publisher-plan-public-preview.mjs`

- [ ] **Step 1: 扩展公网验证器的 C 端关键点击**

在固定 SHA 页面中验证：

```js
await c.goto(preview('%E5%8F%91%E8%A1%8C%E4%BA%BA%E8%AE%A1%E5%88%92demo.html'),{waitUntil:'networkidle',timeout:60000});
await c.getByText('发行人计划',{exact:true}).waitFor();
await c.evaluate(() => openDetail(1));
assert.equal(await c.getByText('每 1 个赞奖励 2 盖世币',{exact:false}).count()>0,true);
await c.evaluate(() => showView('create'));
assert.equal(await c.getByText('提交并进行机器审核',{exact:true}).count(),1);
await c.evaluate(() => showView('submit'));
assert.equal(await c.getByText('最终以点赞统计截止时间的数据快照及人工结算结果为准',{exact:false}).count()>0,true);
```

- [ ] **Step 2: 扩展公网验证器的 B 端关键点击**

```js
await b.goto(preview('%E5%8F%91%E8%A1%8C%E4%BA%BA%E8%AE%A1%E5%88%92-%E5%90%8E%E5%8F%B0demo.html'),{waitUntil:'networkidle',timeout:60000});
await b.evaluate(() => switchPage('audit-task'));
assert.equal(await b.getByText('任务机器审核记录',{exact:true}).count(),1);
await b.evaluate(() => switchPage('audit-video'));
assert.equal(await b.getByText('重新抓取',{exact:false}).count()>0,true);
await b.evaluate(() => switchPage('settlement'));
assert.equal(await b.getByText('系统计算金额不可修改',{exact:false}).count()>0,true);
await b.evaluate(() => switchPage('creator-audit'));
assert.equal(await b.getByText('定向邀请专属标签',{exact:false}).count()>0,true);
```

- [ ] **Step 3: 提交公网验证器并推送**

```powershell
git add tools/verify-publisher-plan-public-preview.mjs
git commit -m "test: verify public publisher review journeys"
git push origin codex/guanwanggaid-41-publisher-plan-v2-20260910
```

- [ ] **Step 4: 用最终 40 位 SHA 运行公网验证**

Run:

```powershell
$publisherCommit = git rev-parse HEAD
node tools/verify-publisher-plan-public-preview.mjs $publisherCommit
```

Expected: C/B 固定提交页面核心点击全部通过，页面脚本错误和 HTTP 失败资源均为 0。

- [ ] **Step 5: 更新状态卡**

新增 D-012 至 D-018，逐项记录：任何实名用户可发布、双认证投稿、机器审核自动发布、日 10 次及预算范围、按单稿上限预留、人工任务级结算、认证身份与专属标签分离。把当前阶段改为“发行人计划 V2.3 已实施并推送，待用户验收”。

产物登记写入：设计提交、实施计划提交、C/B Demo 最终 SHA、V2.3 PRD、24 张图片固定 SHA、验证结果和新的 C/B 公网地址。修改与验证表新增 2026-09-11 本轮记录。不得把飞书文档上传标记为已完成；本轮只保证 PRD 使用公网固定图片 URL。

- [ ] **Step 6: 更新运行状态 JSON**

将 `revision` 加 1，`updatedAt` 写为实际 UTC 时间，`status` 保持 `passed`；更新 contract 中的 goal、changes、inScope，并让 S3—S8 的输出和证据引用本轮 Demo、PRD、截图、验证与 Git SHA。不得加入或提交 `.run.json.lock`。

- [ ] **Step 7: 最终全量验证**

Run:

```powershell
node tools/verify-publisher-plan-v2.mjs
node tools/verify-publisher-plan-v2-ui.mjs
python tools/build-publisher-plan-v2-visual-evidence.py
powershell -ExecutionPolicy Bypass -File .agents/skills/to-prd/scripts/validate-prd-quality.ps1 -Path "prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md"
powershell -ExecutionPolicy Bypass -File .agents/skills/to-prd/scripts/validate-prd-images.ps1 -Path "prd/ai生成/【Prd】《盖世游戏》发行人计划需求.md" -VerifyRemote
```

Expected: 静态 PASS、UI 24 张截图 PASS、严格组件视觉 PASS、PRD `0 错误 0 警告`、远程图片 24/24 PASS。

- [ ] **Step 8: 检查工作区只包含预期变更**

Run:

```powershell
git status --short
git diff --check
```

Expected: `git diff --check` 无输出；只允许原有未跟踪 `.tmp/` 和 `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json.lock` 留在工作区，二者都不得加入提交。

- [ ] **Step 9: 提交状态卡并推送**

```powershell
git add "prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md" "prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.run.json"
git commit -m "docs: record publisher plan v2.3 delivery"
git push origin codex/guanwanggaid-41-publisher-plan-v2-20260910
```

- [ ] **Step 10: 最终交付信息**

向用户提供：最终分支、最终 40 位 SHA、C 端固定预览、B 端固定预览、V2.3 PRD 文件、24 张图的固定图片 SHA、静态／UI／PRD／远程图片／公网点击验证结果，并明确飞书文档上传不在本轮已执行范围。

---

## 自检清单

- [ ] 身份：发布只要求实名；投稿同时要求实名和创作者认证；标签不作为投稿资格。
- [ ] 任务：文字、描述、要求、标签、图片和 OCR 机器审核；明确通过自动发布；不确定不放行。
- [ ] 限制：同一实名主体北京时间自然日 10 次；提交后取消或驳回不返还；预算 5,000～10,000,000。
- [ ] 奖励：发布者设置每赞单价和单稿上限；公式只有 `min(点赞×单价, 上限)`；无阶梯、固定奖励、风险系数或人工改价。
- [ ] 投稿：取得完整有效数据后自动进入“数据校验通过，待人工结算”；失败、缺失、重复、删除、私密和风险有明确分流。
- [ ] 预算：通过时按单稿上限预留；余额不足停止投稿；结算差额释放；风险挂起继续占用。
- [ ] 结算：任务级人工确认；系统金额只读；任务 ID＋批次＋投稿 ID 幂等；任务奖励来源可兑换，充值和退回来源不变。
- [ ] 取消：审核中可取消；进行中无投稿可提前结束；有投稿不得直接取消；普通与风险下架处理不同。
- [ ] 认证：通过只授予认证身份和投稿权限；专属标签由运营根据产出定向邀请。
- [ ] 充值：只支持固定 SKU；没有自定义金额。
- [ ] 图文一致：C/B Demo、PRD、24 张图、8 步 4+4 流程图、验证器和状态卡使用同一口径。
- [ ] 飞书兼容：PRD 图片只引用已推送的 40 位固定 SHA 公网 PNG；不引用本地路径、相对路径或分支 URL。
- [ ] Git：不提交 `.tmp/` 和 `.run.json.lock`；最终推送后再运行固定提交公网点击验证。

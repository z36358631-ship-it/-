const tasks=[
{id:'TASK001',title:'中奖概率倍儿高啊啊',game:'转盘小游戏',type:'official',status:'进行中',platforms:'抖音/B站',reward:10,maxReward:1000,pool:87100,poolTotal:100000,submissions:51,claimed:68,deadline:'2026-06-15',created:'2026-05-10'},
{id:'TASK002',title:'凡人修仙模拟器宣传',game:'凡人修仙模拟器',type:'personal',status:'进行中',platforms:'B站',reward:10,maxReward:1000,pool:48830,poolTotal:50000,submissions:11,claimed:23,deadline:'2026-06-10',created:'2026-05-12'},
{id:'TASK003',title:'233购物街可摆摊收打赏啦',game:'233购物街',type:'official',status:'进行中',platforms:'抖音/快手/小红书',reward:5,maxReward:500,pool:3625,poolTotal:5000,submissions:7,claimed:12,deadline:'2026-06-01',created:'2026-05-08'},
{id:'TASK004',title:'测测你是热梗王吗推广',game:'热梗王',type:'personal',status:'进行中',platforms:'全部',reward:5,maxReward:500,pool:3455,poolTotal:5000,submissions:7,claimed:15,deadline:'2026-06-08',created:'2026-05-14'},
{id:'TASK005',title:'polo小球角色分享',game:'polo小球',type:'personal',status:'已结束',platforms:'小红书',reward:10,maxReward:1000,pool:0,poolTotal:12000,submissions:24,claimed:35,deadline:'2026-05-20',created:'2026-05-01'},
];

const taskReviewRecords=[
{id:'TR001',taskId:'TASK006',title:'我的世界建筑大赛',publisher:'张三(u10086)',textCheck:'通过',imageCheck:'通过',ocrCheck:'通过',accountCheck:'通过',budgetCheck:'通过',status:'自动发布',submitTime:'2026-09-11 09:10'},
{id:'TR002',taskId:'TASK007',title:'蛋仔派对新皮肤推广',publisher:'王五(u20088)',textCheck:'通过',imageCheck:'超时',ocrCheck:'待处理',accountCheck:'通过',budgetCheck:'通过',status:'人工异常处理',submitTime:'2026-09-11 09:15'}
];

const auditVideos=[
{id:'SUB001',taskId:'TASK001',task:'中奖概率倍儿高啊啊',creator:'小明(u30001)',platform:'抖音',contentId:'7382xxx',link:'https://www.douyin.com/video/7382xxx',likes:3800,fetchedAt:'2026-09-11 10:30',coinPerLike:2,perSubmissionCap:10000,expectedReward:7600,reservedCoin:10000,risk:'正常',status:'数据校验通过，待人工结算'},
{id:'SUB002',taskId:'TASK001',task:'中奖概率倍儿高啊啊',creator:'阿花(u30055)',platform:'B站',contentId:'BV1xxx',link:'https://www.bilibili.com/video/BV1xxx',likes:null,fetchedAt:'—',coinPerLike:2,perSubmissionCap:10000,expectedReward:null,reservedCoin:0,risk:'抓取超时',status:'抓取重试'},
{id:'SUB003',taskId:'TASK002',task:'凡人修仙模拟器宣传',creator:'老王(u30102)',platform:'B站',contentId:'BV2xxx',link:'https://www.bilibili.com/video/BV2xxx',likes:9200,fetchedAt:'2026-09-11 10:35',coinPerLike:1,perSubmissionCap:8000,expectedReward:8000,reservedCoin:8000,risk:'异常点赞',status:'风险挂起'}
];

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

const ALLOWED_ROLLOUT_PERCENTS=[20,50,100];
const publisherRolloutConfig={
  enabled:true,
  rolloutPercent:20,
  rolloutSeed:'publisher-plan-round-1',
  configVersion:1,
  updatedBy:'李四',
  updatedAt:'2026-09-14 11:30'
};
const publisherRolloutChangeLog=[];
let pendingTaskDown=null;

const jdCardProducts=[
{id:'JD10',name:'京东E卡 10元',faceValue:10,cost:1000,stock:8,limit:2,status:'已上架',image:'已配置',instructions:'兑换成功后自动发放电子卡密，请在京东账户内绑定使用。'},
{id:'JD20',name:'京东E卡 20元',faceValue:20,cost:2000,stock:5,limit:1,status:'已上架',image:'已配置',instructions:'兑换成功后自动发放电子卡密，请在京东账户内绑定使用。'},
{id:'JD50',name:'京东E卡 50元',faceValue:50,cost:5000,stock:0,limit:1,status:'已下架',image:'已配置',instructions:'兑换成功后自动发放电子卡密，请在京东账户内绑定使用。'},
{id:'JD100',name:'京东E卡 100元',faceValue:100,cost:10000,stock:2,limit:1,status:'已上架',image:'已配置',instructions:'兑换成功后自动发放电子卡密，请在京东账户内绑定使用。'},
];

const cardInventory=[
{id:'KC0001',productId:'JD10',code:'JDE8-****-****-X6W3',status:'已发放',orderId:'EX20260830001'},
{id:'KC0002',productId:'JD10',code:'JDE8-****-****-A2B5',status:'未使用',orderId:'—'},
{id:'KC0003',productId:'JD20',code:'JDE8-****-****-C7D9',status:'已预占',orderId:'EX20260831002'},
{id:'KC0004',productId:'JD20',code:'JDE8-****-****-Q1R4',status:'待核对',orderId:'EX20260831003'},
{id:'KC0005',productId:'JD50',code:'JDE8-****-****-Z8K2',status:'作废',orderId:'—'},
];

const cardExchangeOrders=[
{id:'EX20260830001',uid:'u30001',productId:'JD10',card:'京东E卡 10元',cost:1000,time:'2026-08-30 18:20',status:'已发放',codeId:'KC0001'},
{id:'EX20260831002',uid:'u30150',productId:'JD20',card:'京东E卡 20元',cost:2000,time:'2026-08-31 09:18',status:'待发放',codeId:'KC0003'},
{id:'EX20260831003',uid:'u30200',productId:'JD20',card:'京东E卡 20元',cost:2000,time:'2026-08-31 09:40',status:'待核对',codeId:'KC0004'},
{id:'EX20260829006',uid:'u30055',productId:'JD10',card:'京东E卡 10元',cost:1000,time:'2026-08-29 12:10',status:'已退回',codeId:'—'},
{id:'EX20260828004',uid:'u30301',productId:'JD100',card:'京东E卡 100元',cost:10000,time:'2026-08-28 16:05',status:'发放失败',codeId:'—'},
];

const cardAlertSettings={
  threshold:3,
  repeatHours:24,
  maskedWebhooks:['https://open.feishu.cn/open-apis/bot/v2/hook/****lert'],
};
const cardAlertState=new Map();
let lastCardAlertSimulation={lowProductIds:[],notifyProductIds:[],reason:'尚未检查'};

let currentCardAdminTab='products';
let cardInventoryFilter={productId:'',status:''};
let cardOrderFilter={keyword:'',productId:'',status:'',date:''};

const riskItems=[
{id:'R001',creator:'黑号001(u99001)',task:'中奖概率倍儿高啊啊',video:'https://www.douyin.com/video/fake1',likes:15000,comments:3,likeRate:'0.02%',type:'疑似刷量',status:'待处理'},
{id:'R002',creator:'小号A(u99010)',task:'凡人修仙模拟器宣传',video:'https://www.bilibili.com/video/fake2',likes:8000,comments:5,likeRate:'0.06%',type:'关联账号',status:'待处理'},
{id:'R003',creator:'测试号(u99020)',task:'233购物街推广',video:'https://www.kuaishou.com/fake3',likes:0,comments:0,likeRate:'-',type:'视频不可访问',status:'已处理'},
];

const pageTitles={dashboard:'数据看板',tasks:'任务管理','audit-task':'任务审核','audit-video':'视频审核',settlement:'结算管理','jd-cards':'京东卡管理','card-orders':'兑换订单',risk:'风控中心','creator-audit':'创作者审核'};

function switchPage(name){
  document.querySelectorAll('.menu-item').forEach(m=>m.classList.remove('active'));
  const target=typeof event!=='undefined'&&event.currentTarget&&event.currentTarget.classList.contains('menu-item')
    ?event.currentTarget
    :[...document.querySelectorAll('.menu-item')].find(item=>item.getAttribute('onclick')===`switchPage('${name}')`);
  if(target) target.classList.add('active');
  document.getElementById('page-title').textContent=pageTitles[name];
  renderPage(name);
}

function renderPage(name){
  const c=document.getElementById('page-content');
  switch(name){
    case 'dashboard':c.innerHTML=renderDashboard();break;
    case 'tasks':c.innerHTML=renderTasks();break;
    case 'audit-task':c.innerHTML=renderAuditTasks();break;
    case 'audit-video':c.innerHTML=renderAuditVideos();break;
    case 'settlement':c.innerHTML=renderSettlement();break;
    case 'jd-cards':c.innerHTML=renderJdCards();break;
    case 'card-orders':c.innerHTML=renderCardOrders();break;
    case 'risk':c.innerHTML=renderRisk();break;
    case 'creator-audit':c.innerHTML=renderCreatorAudit();break;
  }
}

function renderDashboard(){
  return `<div class="card" id="publisher-rollout-card">
  <div class="card-title-row">
    <div><div class="card-title">发行人计划外放设置</div><div class="status-note info" style="margin:8px 0 0">只控制发行人计划功能的新曝光和新参与；已发布任务、已投稿内容和待结算记录继续处理。</div></div>
    <button id="open-publisher-rollout-settings" class="btn btn-primary" onclick="openPublisherRolloutSettings()">设置</button>
  </div>
  <div class="rollout-summary">
    <span class="tag ${publisherRolloutConfig.enabled?'tag-green':'tag-red'}">${publisherRolloutConfig.enabled?`已开启 · ${publisherRolloutConfig.rolloutPercent}%`:'已关闭'}</span>
    <span>配置版本：V${publisherRolloutConfig.configVersion}</span>
    <span>最后修改：${publisherRolloutConfig.updatedBy} · ${publisherRolloutConfig.updatedAt}</span>
  </div>
</div>
<div class="stats-grid">
<div class="stat-card"><div class="sc-num">5</div><div class="sc-label">进行中任务</div><div class="sc-change up">↑ 2 本周新增</div></div>
<div class="stat-card"><div class="sc-num">153</div><div class="sc-label">累计领取人次</div><div class="sc-change up">↑ 23% 较上周</div></div>
<div class="stat-card"><div class="sc-num">100</div><div class="sc-label">累计投稿数</div><div class="sc-change up">↑ 18% 较上周</div></div>
<div class="stat-card"><div class="sc-num">142,010</div><div class="sc-label">累计消耗盖世币</div><div class="sc-change up">↑ 35,000 本周</div></div>
</div>
<div class="stats-grid">
<div class="stat-card"><div class="sc-num">65.4%</div><div class="sc-label">领取→提交转化率</div></div>
<div class="stat-card"><div class="sc-num">89.2%</div><div class="sc-label">视频审核通过率</div></div>
<div class="stat-card"><div class="sc-num">2,840</div><div class="sc-label">平均单视频点赞</div></div>
<div class="stat-card"><div class="sc-num">¥0.05</div><div class="sc-label">单次点赞成本</div></div>
</div>
<div class="card"><div class="card-title">任务效果排行</div>
<table><tr><th>任务名称</th><th>类型</th><th>领取数</th><th>投稿数</th><th>总点赞</th><th>消耗盖世币</th><th>单赞成本</th></tr>
<tr><td>中奖概率倍儿高啊啊</td><td><span class="tag tag-orange">官方</span></td><td>68</td><td>51</td><td>89,200</td><td>12,900</td><td>¥0.014</td></tr>
<tr><td>凡人修仙模拟器宣传</td><td><span class="tag tag-blue">个人</span></td><td>23</td><td>11</td><td>32,100</td><td>1,170</td><td>¥0.004</td></tr>
<tr><td>233购物街推广</td><td><span class="tag tag-orange">官方</span></td><td>12</td><td>7</td><td>8,500</td><td>1,375</td><td>¥0.016</td></tr>
<tr><td>测测你是热梗王吗</td><td><span class="tag tag-blue">个人</span></td><td>15</td><td>7</td><td>12,300</td><td>1,545</td><td>¥0.013</td></tr>
<tr><td>polo小球角色分享</td><td><span class="tag tag-blue">个人</span></td><td>35</td><td>24</td><td>45,600</td><td>12,000</td><td>¥0.026</td></tr>
</table></div>
<div class="card"><div class="card-title">平台投稿分布</div>
<table><tr><th>平台</th><th>投稿数</th><th>占比</th><th>平均点赞</th><th>效果评级</th></tr>
<tr><td>抖音</td><td>42</td><td>42%</td><td>3,200</td><td><span class="tag tag-green">优</span></td></tr>
<tr><td>B站</td><td>31</td><td>31%</td><td>2,800</td><td><span class="tag tag-green">优</span></td></tr>
<tr><td>快手</td><td>18</td><td>18%</td><td>1,900</td><td><span class="tag tag-orange">良</span></td></tr>
<tr><td>小红书</td><td>9</td><td>9%</td><td>2,100</td><td><span class="tag tag-orange">良</span></td></tr>
</table></div>`;
}

function renderTasks(){
  return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><div class="card-title" style="margin:0;padding:0;border:none">任务列表</div><button class="btn btn-primary" onclick="openCreateTask()">+ 创建官方任务</button></div>
<div class="filter-bar"><input placeholder="搜索任务名称" id="task-search"><select id="task-type-filter"><option value="">全部类型</option><option value="official">官方</option><option value="personal">个人</option></select><select id="task-status-filter"><option value="">全部状态</option><option>进行中</option><option>已结束</option></select><button class="btn" onclick="showToast('查询成功')">查询</button><button class="btn" onclick="showToast('已重置')">重置</button></div>
<table><tr><th>任务ID</th><th>任务名称</th><th>游戏</th><th>类型</th><th>状态</th><th>平台</th><th>单价</th><th>奖池余额/总额</th><th>领取/投稿</th><th>截止日期</th><th>操作</th></tr>
${tasks.map(t=>`<tr><td>${t.id}</td><td>${t.title}</td><td>${t.game}</td><td><span class="tag ${t.type==='official'?'tag-orange':'tag-blue'}">${t.type==='official'?'官方':'个人'}</span></td><td><span class="tag ${t.status==='进行中'?'tag-green':'tag-gray'}">${t.status}</span></td><td>${t.platforms}</td><td>${t.reward}</td><td>${t.pool.toLocaleString()}/${t.poolTotal.toLocaleString()}</td><td>${t.claimed}/${t.submissions}</td><td>${t.deadline}</td><td><button class="btn btn-sm" onclick="showToast('查看详情')">详情</button> ${t.status==='进行中'?`<button class="btn btn-sm" onclick="openTaskDownModal('${t.id}','normal')">普通下架</button> <button class="btn btn-sm btn-danger" onclick="openTaskDownModal('${t.id}','risk')">风险下架</button>`:''}</td></tr>`).join('')}
</table></div>`;
}

function openTaskDownModal(taskId,mode){
  const task=tasks.find(item=>item.id===taskId);
  if(!task)return showToast('任务不存在');
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
  if(!task)return showToast('任务状态已变化');
  task.status=request.mode==='risk'?'风险下架':'普通下架';
  showToast(`${task.status}成功，审计记录已保存`);
  renderPage('tasks');
}

function renderAuditTasks(){
  return `<div class="card"><div class="card-title">任务机器审核记录</div>
  <div class="status-note">文字、图片、OCR、账号、次数与预算全部明确通过后自动发布；只有超时、无响应或结果不确定进入人工异常处理。</div>
  <table><tr><th>记录 ID</th><th>任务</th><th>发布者</th><th>文字</th><th>图片</th><th>OCR</th><th>预算</th><th>状态</th><th>操作</th></tr>
  ${taskReviewRecords.map(item=>`<tr><td>${item.id}</td><td>${item.title}</td><td>${item.publisher}</td><td>${item.textCheck}</td><td>${item.imageCheck}</td><td>${item.ocrCheck}</td><td>${item.budgetCheck}</td><td>${item.status}</td><td>${item.status==='人工异常处理'?`<button class="btn btn-sm" onclick="retryTaskReview('${item.id}')">重新检测</button> <button class="btn btn-sm btn-danger" onclick="openRejectModal('${item.title}')">驳回</button>`:'自动完成'}</td></tr>`).join('')}</table></div>`;
}

function retryTaskReview(id){
  const record=taskReviewRecords.find(item=>item.id===id);
  if(!record||record.status!=='人工异常处理')return showToast('记录状态已变化');
  record.imageCheck='通过';
  record.ocrCheck='通过';
  record.status='自动发布';
  showToast('重新检测通过，任务已自动发布');
  renderPage('audit-task');
}

function renderAuditVideos(){
  return `<div class="card"><div class="card-title">投稿数据与人工处理</div>
<div class="status-note info">系统自动获取作品内容与数据；完整获取并校验通过后进入待人工结算，异常记录只允许重新抓取、挂起、恢复或驳回。</div>
<div class="filter-bar"><select><option value="">全部状态</option><option>数据校验通过，待人工结算</option><option>抓取重试</option><option>风险挂起</option></select><input placeholder="搜索创作者"><button class="btn" onclick="showToast('查询成功')">查询</button></div>
<table><tr><th>投稿 ID</th><th>任务</th><th>创作者</th><th>平台／内容 ID</th><th>点赞快照</th><th>抓取时间</th><th>每赞单价</th><th>单稿上限</th><th>预计奖励</th><th>预留金额</th><th>风险</th><th>状态</th><th>操作</th></tr>
${auditVideos.map(v=>`<tr><td>${v.id}</td><td>${v.task}</td><td>${v.creator}</td><td>${v.platform}<br><a href="${v.link}" target="_blank" style="color:#1890ff;font-size:12px">${v.contentId} ↗</a></td><td>${v.likes===null?'—':v.likes.toLocaleString()}</td><td>${v.fetchedAt}</td><td>${v.coinPerLike}</td><td>${v.perSubmissionCap.toLocaleString()}</td><td>${v.expectedReward===null?'—':v.expectedReward.toLocaleString()}</td><td>${v.reservedCoin.toLocaleString()}</td><td>${v.risk}</td><td><span class="tag ${v.status==='数据校验通过，待人工结算'?'tag-green':v.status==='抓取重试'?'tag-orange':'tag-red'}">${v.status}</span></td><td>${submissionActions(v)}</td></tr>`).join('')}
</table></div>`;
}

function submissionActions(item){
  if(item.status==='抓取重试')return `<button class="btn btn-sm" onclick="refetchSubmission('${item.id}')">重新抓取</button> <button class="btn btn-sm btn-danger" onclick="rejectSubmission('${item.id}')">驳回</button>`;
  if(item.status==='风险挂起')return `<button class="btn btn-sm" onclick="refetchSubmission('${item.id}')">重新抓取</button> <button class="btn btn-sm btn-success" onclick="resumeSubmission('${item.id}')">通过</button> <button class="btn btn-sm btn-danger" onclick="rejectSubmission('${item.id}')">驳回</button>`;
  return `<button class="btn btn-sm" onclick="holdSubmission('${item.id}')">挂起</button> <button class="btn btn-sm btn-danger" onclick="rejectSubmission('${item.id}')">驳回</button>`;
}

function refetchSubmission(id){
  const item=auditVideos.find(value=>value.id===id);
  if(!item)return showToast('投稿不存在');
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
  if(!item)return;
  item.status='风险挂起';
  item.risk='人工挂起';
  showToast('投稿已挂起，预留预算继续保留');
  renderPage('audit-video');
}

function resumeSubmission(id){
  const item=auditVideos.find(value=>value.id===id);
  if(!item)return;
  item.status='数据校验通过，待人工结算';
  item.risk='人工确认正常';
  showToast('投稿已恢复待人工结算');
  renderPage('audit-video');
}

function rejectSubmission(id){
  const item=auditVideos.find(value=>value.id===id);
  if(!item)return;
  item.status='已驳回';
  item.reservedCoin=0;
  showToast('投稿已驳回，预留预算已释放');
  renderPage('audit-video');
}

function renderSettlement(){
  return `<div class="card"><div class="card-title">任务级结算批次</div>
<div class="status-note"><strong>系统计算金额不可修改。</strong>结算人员只能确认、驳回、挂起或重新抓取；不得修改结算快照点赞数、每赞单价、单稿上限、创作者、盖世币来源或系统计算金额。</div>
${settlementBatches.map(batch=>`<div class="settlement-batch"><div class="card-title-row"><div><strong>${batch.task}</strong><div class="rollout-help">${batch.id} · 规则版本 V${batch.ruleVersion} · 创建 ${batch.createdAt}</div></div><span class="tag ${batch.status==='已结算'?'tag-green':'tag-orange'}">${batch.status}</span></div>
<div class="rollout-summary"><span>任务预算 ${batch.budgetCoin.toLocaleString()}</span><span>预留 ${batch.reservedCoin.toLocaleString()}</span><span>预计退回 ${batch.estimatedReturnCoin.toLocaleString()}</span></div>
<table><tr><th>投稿 ID</th><th>创作者</th><th>内容 ID</th><th>结算快照点赞数</th><th>快照时间</th><th>每赞单价</th><th>单稿上限</th><th>系统金额</th><th>状态</th><th>操作</th></tr>
${batch.items.map(item=>`<tr><td>${item.submissionId}</td><td>${item.creator}</td><td>${item.contentId}</td><td>${item.snapshotLikes.toLocaleString()}</td><td>${item.snapshotAt}</td><td>${item.coinPerLike}</td><td>${item.perSubmissionCap.toLocaleString()}</td><td style="color:#ff8c00;font-weight:600">${item.calculatedReward.toLocaleString()}</td><td>${item.status}</td><td>${batch.status==='待人工结算'?`<button class="btn btn-sm" onclick="handleSettlementItem('${batch.id}','${item.submissionId}','refetch')">重新抓取</button> <button class="btn btn-sm" onclick="handleSettlementItem('${batch.id}','${item.submissionId}','hold')">挂起</button> <button class="btn btn-sm btn-danger" onclick="handleSettlementItem('${batch.id}','${item.submissionId}','reject')">驳回</button>`:'—'}</td></tr>`).join('')}</table>
<div class="form-actions"><button class="btn btn-primary" ${batch.status!=='待人工结算'?'disabled':''} onclick="settleBatch('${batch.id}')">人工确认整批结算</button></div></div>`).join('')}</div>`;
}

function calculateSettlement(item){
  return Math.min(item.snapshotLikes*item.coinPerLike,item.perSubmissionCap);
}

function assertBatchAmounts(batch){
  return batch.items.every(item=>item.calculatedReward===calculateSettlement(item));
}

function settleBatch(batchId){
  const batch=settlementBatches.find(item=>item.id===batchId);
  if(!batch||batch.status!=='待人工结算')return showToast('该结算批次已处理，请勿重复操作');
  if(batch.items.some(item=>item.status==='风险挂起'))return showToast('批次仍有风险挂起投稿，不能确认结算');
  if(!assertBatchAmounts(batch))return showToast('系统计算结果异常，请重新抓取后处理');
  batch.status='已结算';
  batch.items.forEach(item=>{if(item.status!=='已驳回')item.status='已结算';});
  showToast('人工确认完成，系统已按任务 ID＋结算批次＋投稿 ID 幂等入账');
  renderPage('settlement');
}

function handleSettlementItem(batchId,submissionId,action){
  const batch=settlementBatches.find(value=>value.id===batchId);
  const item=batch&&batch.items.find(value=>value.submissionId===submissionId);
  if(!item||batch.status!=='待人工结算')return showToast('结算记录状态已变化');
  if(action==='refetch'){
    item.snapshotAt='2026-09-11 11:30';
    item.calculatedReward=calculateSettlement(item);
    item.status='待确认';
    showToast('最终点赞快照已重新抓取，系统金额已重算');
  }else if(action==='hold'){
    item.status='风险挂起';
    showToast('投稿已挂起，预留预算继续保留');
  }else if(action==='reject'){
    item.status='已驳回';
    showToast('投稿已驳回，预留与实际金额差额将按账务规则释放');
  }else{
    showToast('不支持的结算操作');
  }
  renderPage('settlement');
}

function cardStatusTag(status){
  return status==='未使用'?'tag-green':status==='已预占'?'tag-blue':status==='已发放'?'tag-gray':status==='待核对'?'tag-orange':'tag-red';
}

function orderStatusTag(status){
  return status==='已发放'?'tag-green':status==='待发放'?'tag-blue':status==='待核对'?'tag-orange':status==='发放失败'?'tag-red':'tag-gray';
}

function productName(productId){
  const product=jdCardProducts.find(item=>item.id===productId);
  return product?product.name:productId;
}

function getLowStockProducts(threshold=cardAlertSettings.threshold){
  return jdCardProducts.filter(item=>item.status==='已上架'&&item.stock<=threshold);
}

function simulateCardInventoryAlerts(nowMs=Date.now(),reason='库存变化'){
  const lowProducts=getLowStockProducts();
  const lowIds=new Set(lowProducts.map(item=>item.id));
  const notifyProductIds=[];
  for(const product of jdCardProducts){
    const previous=cardAlertState.get(product.id);
    if(!lowIds.has(product.id)){
      cardAlertState.set(product.id,{low:false,lastNotifiedAt:null});
      continue;
    }
    const repeatMs=cardAlertSettings.repeatHours*60*60*1000;
    const shouldNotify=!previous||!previous.low||previous.lastNotifiedAt===null||nowMs-previous.lastNotifiedAt>=repeatMs;
    if(shouldNotify)notifyProductIds.push(product.id);
    cardAlertState.set(product.id,{low:true,lastNotifiedAt:shouldNotify?nowMs:previous.lastNotifiedAt});
  }
  lastCardAlertSimulation={reason,lowProductIds:[...lowIds],notifyProductIds};
  return lastCardAlertSimulation;
}

function isFeishuWebhook(value){
  if(cardAlertSettings.maskedWebhooks.includes(value))return true;
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&['open.feishu.cn','open.larksuite.com'].includes(url.hostname)&&/^\/open-apis\/bot\/v2\/hook\/[^/]+$/.test(url.pathname);
  }catch{
    return false;
  }
}

function maskWebhook(value){
  const url=new URL(value);
  const token=url.pathname.split('/').pop()||'';
  const maskedToken=token.length<=4?'*'.repeat(token.length):`${'*'.repeat(token.length-4)}${token.slice(-4)}`;
  return `${url.origin}/open-apis/bot/v2/hook/${maskedToken}`;
}

function buildCardAlertPreview(threshold=cardAlertSettings.threshold){
  const products=[...jdCardProducts].filter(item=>item.status==='已上架').sort((a,b)=>a.stock-b.stock);
  const product=products.find(item=>item.stock<=threshold)||products[0];
  if(!product)return '暂无已上架的京东卡 SKU，当前不会触发库存告警。';
  const status=product.stock<=threshold?'已达到':'尚未达到';
  return `<strong>【京东卡库存告警】</strong><br>${product.name} 当前可用卡密剩余 <strong>${product.stock}</strong> 张，${status}全局预警阈值 <strong>${threshold}</strong> 张。触发后请及时补充库存。<br><span style="color:#1677ff">[进入后台]</span>`;
}

function renderJdCards(){
  const productsActive=currentCardAdminTab==='products';
  return `<div class="page-tabs" role="tablist" aria-label="京东卡管理">
    <button class="${productsActive?'active':''}" role="tab" aria-selected="${productsActive}" onclick="switchCardAdminTab(this,'products')">商品配置</button>
    <button class="${productsActive?'':'active'}" role="tab" aria-selected="${!productsActive}" onclick="switchCardAdminTab(this,'inventory')">卡密库存</button>
  </div>
  <div class="status-note info">京东卡仅支持发行任务结算奖励盖世币兑换；充值盖世币与任务中心盖世积分不可兑换。</div>
  <div id="card-products-panel" class="card-admin-panel" style="display:${productsActive?'block':'none'}">${renderCardProducts()}</div>
  <div id="card-inventory-panel" class="card-admin-panel" style="display:${productsActive?'none':'block'}">${renderCardInventory()}</div>`;
}

function renderCardProducts(){
  return `<div class="card">
    <div class="card-title-row"><div class="card-title">京东电子卡商品</div><button class="btn btn-primary" onclick="openCardProductModal()">+ 新增商品</button></div>
    <div class="status-note info">库存高亮使用卡密库存页的全局阈值，并按每个已上架 SKU 的可用库存分别判断。</div>
    <div class="table-wrap"><table><thead><tr><th>商品ID</th><th>名称</th><th>面额</th><th>兑换价格</th><th>可用库存</th><th>单人限兑</th><th>状态</th><th>操作</th></tr></thead><tbody>
    ${jdCardProducts.map(item=>`<tr><td>${item.id}</td><td>${item.name}</td><td>¥${item.faceValue}</td><td>${item.cost.toLocaleString()} 盖世币</td><td style="color:${item.status==='已上架'&&item.stock<=cardAlertSettings.threshold?'#ff4d4f':'inherit'}">${item.stock}</td><td>${item.limit}次</td><td><span class="tag ${item.status==='已上架'?'tag-green':'tag-gray'}">${item.status}</span></td><td><button class="btn btn-sm" onclick="openCardProductModal('${item.id}')">编辑</button></td></tr>`).join('')}
    </tbody></table></div>
  </div>`;
}

function renderCardInventory(){
  const rows=cardInventory.filter(item=>(!cardInventoryFilter.productId||item.productId===cardInventoryFilter.productId)&&(!cardInventoryFilter.status||item.status===cardInventoryFilter.status));
  return `<div class="card">
    <div class="card-title-row"><div class="card-title">卡密库存</div><div class="setting-actions"><button id="card-alert-settings" class="btn" onclick="openCardAlertSettings()">库存告警设置</button><button class="btn btn-primary" onclick="openCardImportModal()">批量导入卡密</button></div></div>
    <div class="status-note">卡密加密存储，列表、普通日志和导出文件只展示脱敏值。同一卡密只能关联一个成功或待核对订单。</div>
    <div class="status-note info">全局阈值作用于所有已上架京东卡 SKU，但分别判断每个 SKU 的可用库存，不汇总不同面额。可用库存仅包含未使用且未预占、未发放、未作废的卡密。</div>
    <div class="filter-bar">
      <select id="inventory-product-filter"><option value="">全部商品</option>${jdCardProducts.map(item=>`<option value="${item.id}" ${cardInventoryFilter.productId===item.id?'selected':''}>${item.name}</option>`).join('')}</select>
      <select id="inventory-status-filter"><option value="">全部状态</option>${['未使用','已预占','已发放','待核对','作废'].map(status=>`<option ${cardInventoryFilter.status===status?'selected':''}>${status}</option>`).join('')}</select>
      <button class="btn" onclick="applyInventoryFilter()">查询</button><button class="btn" onclick="resetInventoryFilter()">重置</button>
    </div>
    <div class="table-wrap"><table><thead><tr><th>卡密ID</th><th>所属商品</th><th>脱敏卡密</th><th>状态</th><th>关联订单</th><th>操作</th></tr></thead><tbody>
    ${rows.length?rows.map(item=>`<tr><td>${item.id}</td><td>${productName(item.productId)}</td><td class="mono">${item.code}</td><td><span class="tag ${cardStatusTag(item.status)}">${item.status}</span></td><td>${item.orderId}</td><td><button class="btn btn-sm" onclick="viewCardInventory('${item.id}')">查看详情</button></td></tr>`).join(''):'<tr><td colspan="6"><div class="empty">暂无符合条件的卡密</div></td></tr>'}
    </tbody></table></div>
  </div>`;
}

function switchCardAdminTab(button,tab){
  currentCardAdminTab=tab;
  document.querySelectorAll('.page-tabs button').forEach(item=>{item.classList.remove('active');item.setAttribute('aria-selected','false')});
  button.classList.add('active');
  button.setAttribute('aria-selected','true');
  document.getElementById('card-products-panel').style.display=tab==='products'?'block':'none';
  document.getElementById('card-inventory-panel').style.display=tab==='inventory'?'block':'none';
}

function applyInventoryFilter(){
  cardInventoryFilter={productId:document.getElementById('inventory-product-filter').value,status:document.getElementById('inventory-status-filter').value};
  currentCardAdminTab='inventory';
  renderPage('jd-cards');
}

function resetInventoryFilter(){
  cardInventoryFilter={productId:'',status:''};
  currentCardAdminTab='inventory';
  renderPage('jd-cards');
}

function renderCardOrders(){
  const rows=cardExchangeOrders.filter(order=>{
    const keyword=cardOrderFilter.keyword.trim().toLowerCase();
    return (!keyword||order.id.toLowerCase().includes(keyword)||order.uid.toLowerCase().includes(keyword))
      &&(!cardOrderFilter.productId||order.productId===cardOrderFilter.productId)
      &&(!cardOrderFilter.status||order.status===cardOrderFilter.status)
      &&(!cardOrderFilter.date||order.time.startsWith(cardOrderFilter.date));
  });
  const statuses=['待发放','已发放','发放失败','已退回','待核对'];
  return `<div class="stats-grid" style="grid-template-columns:repeat(5,1fr)">
    ${statuses.map(status=>`<div class="stat-card"><div class="sc-num">${cardExchangeOrders.filter(item=>item.status===status).length}</div><div class="sc-label">${status}</div></div>`).join('')}
  </div>
  <div class="status-note info">兑换订单只扣减参与发行任务并结算获得的盖世币；充值获得的盖世币和任务中心盖世积分均不会进入京东卡兑换流程。</div>
  <div class="status-note">待核对表示发放结果不确定：冻结对应卡密和扣减结果，由有权限人员核实卡密是否已暴露，禁止自动退款或补发。</div>
  <div class="card"><div class="card-title">京东卡兑换订单</div>
    <div class="filter-bar">
      <input id="order-keyword-filter" placeholder="订单号/UID" value="${cardOrderFilter.keyword}">
      <select id="order-product-filter"><option value="">全部面额</option>${jdCardProducts.map(item=>`<option value="${item.id}" ${cardOrderFilter.productId===item.id?'selected':''}>${item.name}</option>`).join('')}</select>
      <input id="order-date-filter" type="date" value="${cardOrderFilter.date}" aria-label="兑换日期">
      <select id="order-status-filter"><option value="">全部状态</option>${statuses.map(status=>`<option ${cardOrderFilter.status===status?'selected':''}>${status}</option>`).join('')}</select>
      <button class="btn" onclick="applyCardOrderFilter()">查询</button><button class="btn" onclick="resetCardOrderFilter()">重置</button><button class="btn" style="margin-left:auto" onclick="showToast('导出文件仅包含脱敏卡密')">导出</button>
    </div>
    <div class="table-wrap"><table><thead><tr><th>订单号</th><th>UID</th><th>兑换内容</th><th>消耗盖世币</th><th>兑换时间</th><th>状态</th><th>卡密ID</th><th>操作</th></tr></thead><tbody>
    ${rows.length?rows.map(order=>`<tr><td>${order.id}</td><td>${order.uid}</td><td>${order.card}</td><td>${order.cost.toLocaleString()}</td><td>${order.time}</td><td><span class="tag ${orderStatusTag(order.status)}">${order.status}</span></td><td>${order.codeId}</td><td>${order.status==='待核对'?`<button class="btn btn-sm btn-primary" onclick="openOrderReview('${order.id}')">核对要求</button>`:`<button class="btn btn-sm" onclick="viewCardOrder('${order.id}')">详情</button>`}</td></tr>`).join(''):'<tr><td colspan="8"><div class="empty">暂无符合条件的订单</div></td></tr>'}
    </tbody></table></div>
  </div>`;
}

function applyCardOrderFilter(){
  cardOrderFilter={keyword:document.getElementById('order-keyword-filter').value,productId:document.getElementById('order-product-filter').value,status:document.getElementById('order-status-filter').value,date:document.getElementById('order-date-filter').value};
  renderPage('card-orders');
}

function resetCardOrderFilter(){
  cardOrderFilter={keyword:'',productId:'',status:'',date:''};
  renderPage('card-orders');
}

function openCardAlertSettings(){
  document.getElementById('modal-box').innerHTML=`
    <div class="modal-header"><span>库存告警设置</span><span class="modal-close" onclick="closeModal()">×</span></div>
    <div class="form-row"><label>全局库存预警阈值</label><input id="card-alert-threshold" type="number" min="1" step="1" value="${cardAlertSettings.threshold}" oninput="refreshCardAlertPreview()"><div class="form-help">所有已上架京东卡 SKU 共用，库存小于或等于该值时按 SKU 独立告警。</div></div>
    <div class="form-row"><label>飞书机器人 Webhook</label><textarea id="card-alert-webhooks" rows="4" placeholder="每行一个 HTTPS 飞书机器人地址"></textarea><div class="form-help">保存时去重并脱敏展示；全部清空并保存后停止外部告警。Demo 不会真实请求飞书。</div></div>
    <div class="form-row"><label>重复提醒间隔</label><input id="card-alert-repeat-hours" type="number" min="1" step="1" value="${cardAlertSettings.repeatHours}"><div class="form-help">单位：小时。同一 SKU 持续低库存时按该间隔去重，默认 24 小时。</div></div>
    <div class="form-row"><label>消息预览</label><div id="card-alert-preview" class="alert-preview" aria-live="polite"></div></div>
    <div id="card-alert-error" class="form-error" role="alert"></div>
    <div class="form-actions"><button class="btn" onclick="closeModal()">取消</button><button id="save-card-alert-settings" class="btn btn-primary" onclick="saveCardAlertSettings()">保存设置</button></div>`;
  document.getElementById('card-alert-webhooks').value=cardAlertSettings.maskedWebhooks.join('\n');
  document.getElementById('modal').classList.add('show');
  refreshCardAlertPreview();
}

function refreshCardAlertPreview(){
  const input=document.getElementById('card-alert-threshold');
  const preview=document.getElementById('card-alert-preview');
  if(preview)preview.innerHTML=buildCardAlertPreview(Number(input&&input.value)||cardAlertSettings.threshold);
}

function showCardAlertError(message){
  const error=document.getElementById('card-alert-error');
  error.textContent=message;
  error.classList.add('show');
}

function saveCardAlertSettings(){
  const error=document.getElementById('card-alert-error');
  error.textContent='';
  error.classList.remove('show');
  const threshold=Number(document.getElementById('card-alert-threshold').value);
  const repeatHours=Number(document.getElementById('card-alert-repeat-hours').value);
  const webhooks=[...new Set(document.getElementById('card-alert-webhooks').value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean))];
  if(!Number.isInteger(threshold)||threshold<1){
    showCardAlertError('全局库存预警阈值必须为大于 0 的整数');
    return;
  }
  if(!Number.isInteger(repeatHours)||repeatHours<1){
    showCardAlertError('重复提醒间隔必须为大于 0 的整数小时');
    return;
  }
  const invalidWebhook=webhooks.find(value=>!isFeishuWebhook(value));
  if(invalidWebhook){
    showCardAlertError('Webhook 必须是有效的 HTTPS 飞书机器人地址');
    return;
  }
  cardAlertSettings.threshold=threshold;
  cardAlertSettings.repeatHours=repeatHours;
  cardAlertSettings.maskedWebhooks=[...new Set(webhooks.map(value=>cardAlertSettings.maskedWebhooks.includes(value)?value:maskWebhook(value)))];
  const result=simulateCardInventoryAlerts(Date.now(),'保存设置后立即检查');
  closeModal();
  currentCardAdminTab='inventory';
  renderPage('jd-cards');
  const suffix=cardAlertSettings.maskedWebhooks.length?`检测到 ${result.lowProductIds.length} 个低库存 SKU，Demo 未发送飞书消息`:'外部告警已停用';
  showToast(`库存告警设置已保存；${suffix}`);
}

function openCardProductModal(productId){
  const product=jdCardProducts.find(item=>item.id===productId);
  document.getElementById('modal-box').innerHTML=`
    <div class="modal-header"><span>${product?'编辑':'新增'}京东电子卡商品</span><span class="modal-close" onclick="closeModal()">×</span></div>
    <div class="form-row"><label>商品名称</label><input value="${product?product.name:''}" placeholder="例如：京东E卡 20元"></div>
    <div class="form-row"><label>商品主图</label><input value="${product?product.image:''}" placeholder="上传后显示配置状态" readonly style="background:#f5f5f5"></div>
    <div class="form-row"><label>卡面额（元）</label><input type="number" min="1" value="${product?product.faceValue:''}"></div>
    <div class="form-row"><label>兑换所需盖世币</label><input type="number" min="1" value="${product?product.cost:''}"></div>
    <div class="form-row"><label>单用户限兑次数</label><input type="number" min="1" value="${product?product.limit:1}"></div>
    <div class="form-row"><label>上下架状态</label><select><option ${!product||product.status==='已上架'?'selected':''}>已上架</option><option ${product&&product.status==='已下架'?'selected':''}>已下架</option></select></div>
    <div class="form-row"><label>使用说明</label><textarea>${product?product.instructions:''}</textarea></div>
    <div class="form-actions"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="closeModal();showToast('商品配置已保存')">保存</button></div>`;
  document.getElementById('modal').classList.add('show');
}

function openCardImportModal(){
  document.getElementById('modal-box').innerHTML=`
    <div class="modal-header"><span>批量导入卡密</span><span class="modal-close" onclick="closeModal()">×</span></div>
    <div class="form-row"><label>所属商品</label><select>${jdCardProducts.map(item=>`<option value="${item.id}">${item.name}</option>`).join('')}</select></div>
    <div class="form-row"><label>卡密（每行一条）</label><textarea placeholder="粘贴待导入卡密；原文仅进入加密存储，不写入普通日志"></textarea></div>
    <div class="status-note">导入前校验空值、格式和重复卡密。校验未通过时整批不入库，并仅返回行号和错误原因。</div>
    <div class="form-actions"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="closeModal();showToast('校验通过，卡密已加密导入')">校验并导入</button></div>`;
  document.getElementById('modal').classList.add('show');
}

function viewCardInventory(id){
  const item=cardInventory.find(card=>card.id===id);
  if(!item)return;
  document.getElementById('modal-box').innerHTML=`
    <div class="modal-header"><span>卡密库存详情</span><span class="modal-close" onclick="closeModal()">×</span></div>
    <table class="modal-detail"><tr><td>卡密ID</td><td>${item.id}</td></tr><tr><td>所属商品</td><td>${productName(item.productId)}</td></tr><tr><td>脱敏卡密</td><td class="mono">${item.code}</td></tr><tr><td>库存状态</td><td><span class="tag ${cardStatusTag(item.status)}">${item.status}</span></td></tr><tr><td>关联订单</td><td>${item.orderId}</td></tr></table>
    <div class="status-note">本 Demo 仅展示脱敏卡密；查看行为记入审计记录，明文不进入普通日志或导出文件。</div>
    <div class="form-actions"><button class="btn" onclick="closeModal()">关闭</button></div>`;
  document.getElementById('modal').classList.add('show');
}

function viewCardOrder(id){
  const order=cardExchangeOrders.find(item=>item.id===id);
  if(!order)return;
  document.getElementById('modal-box').innerHTML=`
    <div class="modal-header"><span>兑换订单详情</span><span class="modal-close" onclick="closeModal()">×</span></div>
    <table class="modal-detail"><tr><td>订单号</td><td>${order.id}</td></tr><tr><td>用户UID</td><td>${order.uid}</td></tr><tr><td>兑换内容</td><td>${order.card}</td></tr><tr><td>消耗盖世币</td><td>${order.cost.toLocaleString()}</td></tr><tr><td>兑换时间</td><td>${order.time}</td></tr><tr><td>状态</td><td><span class="tag ${orderStatusTag(order.status)}">${order.status}</span></td></tr><tr><td>卡密ID</td><td>${order.codeId}</td></tr></table>
    <div class="form-actions"><button class="btn" onclick="closeModal()">关闭</button></div>`;
  document.getElementById('modal').classList.add('show');
}

function openOrderReview(id){
  const order=cardExchangeOrders.find(item=>item.id===id);
  if(!order)return;
  const inventory=cardInventory.find(item=>item.id===order.codeId);
  document.getElementById('modal-box').innerHTML=`
    <div class="modal-header"><span>待核对订单</span><span class="modal-close" onclick="closeModal()">×</span></div>
    <table class="modal-detail"><tr><td>订单号</td><td>${order.id}</td></tr><tr><td>用户UID</td><td>${order.uid}</td></tr><tr><td>兑换内容</td><td>${order.card}</td></tr><tr><td>脱敏卡密</td><td class="mono">${inventory?inventory.code:'—'}</td></tr><tr><td>当前状态</td><td><span class="tag tag-orange">待核对</span></td></tr></table>
    <div class="status-note"><strong>禁止自动退款或补发。</strong>发放结果不确定时必须保持积分扣减和卡密冻结，避免同一订单获得重复卡密或同时退款。</div>
    <div style="font-size:13px;font-weight:600">人工核对要求</div><ol class="boundary-list"><li>核对发放服务结果与用户查看记录。</li><li>确认卡密是否已向用户暴露。</li><li>仅在确认未暴露后，才可进入退回或释放库存的后续处理。</li><li>核对结论和操作人写入审计记录。</li></ol>
    <div class="form-actions"><button class="btn" onclick="closeModal()">关闭</button></div>`;
  document.getElementById('modal').classList.add('show');
}

function renderRisk(){
  return `<div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
<div class="stat-card"><div class="sc-num" style="color:#ff4d4f">2</div><div class="sc-label">待处理风险</div></div>
<div class="stat-card"><div class="sc-num">1</div><div class="sc-label">已处理</div></div>
<div class="stat-card"><div class="sc-num">3</div><div class="sc-label">累计风险事件</div></div>
</div>
<div class="card"><div class="card-title">风险事件列表</div>
<div class="filter-bar"><select><option value="">全部类型</option><option>疑似刷量</option><option>关联账号</option><option>视频不可访问</option></select><select><option value="">全部状态</option><option>待处理</option><option>已处理</option></select><button class="btn" onclick="showToast('查询成功')">查询</button></div>
<table><tr><th>ID</th><th>创作者</th><th>关联任务</th><th>视频链接</th><th>点赞量</th><th>评论数</th><th>互动率</th><th>风险类型</th><th>状态</th><th>操作</th></tr>
${riskItems.map(r=>`<tr><td>${r.id}</td><td>${r.creator}</td><td>${r.task}</td><td><a href="${r.video}" target="_blank" style="color:#1890ff;font-size:12px">查看 ↗</a></td><td>${r.likes.toLocaleString()}</td><td>${r.comments}</td><td>${r.likeRate}</td><td><span class="tag tag-red">${r.type}</span></td><td><span class="tag ${r.status==='待处理'?'tag-orange':'tag-gray'}">${r.status}</span></td><td>${r.status==='待处理'?`<button class="btn btn-sm btn-danger" onclick="confirmAction('确认标记为作弊？该创作者将被冻结接单资格7天，本次结算金额归零。',()=>showToast('已处理，账号已冻结'))">标记作弊</button> <button class="btn btn-sm" onclick="confirmAction('确认标记为正常？将恢复正常结算。',()=>showToast('已标记正常'))">正常</button>`:'已处理'}</td></tr>`).join('')}
</table></div>
<div class="card"><div class="card-title">风控规则说明</div>
<table><tr><th>规则</th><th>触发条件</th><th>处理方式</th></tr>
<tr><td>疑似刷量</td><td>点赞量>10000 但评论数<10（互动率<0.1%）</td><td>自动标记，转人工复核，暂停结算</td></tr>
<tr><td>关联账号</td><td>同一设备ID/手机号关联的多账号对同一任务提交</td><td>仅结算最早提交者，其余标记</td></tr>
<tr><td>作品删除或转私密</td><td>结算前无法取得有效最终数据</td><td>风险挂起并保留预留预算，支持重新抓取、驳回或恢复；不得按 0 点赞结算</td></tr>
<tr><td>重复视频</td><td>同一视频链接被不同用户提交</td><td>仅最早提交者有效，后续驳回</td></tr>
</table></div>`;
}

function openPublisherRolloutSettings(){
  const box=document.getElementById('modal-box');
  box.innerHTML=`
    <div class="modal-header"><span>发行人计划外放设置</span><span class="modal-close" onclick="closeModal()">×</span></div>
    <div class="form-row"><label><input id="publisher-rollout-enabled" type="checkbox" ${publisherRolloutConfig.enabled?'checked':''} onchange="togglePublisherRolloutPercent()"> 功能开关</label></div>
    <div class="form-row"><label>灰度比例</label><select id="publisher-rollout-percent" ${publisherRolloutConfig.enabled?'':'disabled'}>
      ${ALLOWED_ROLLOUT_PERCENTS.map(value=>`<option value="${value}" ${value===publisherRolloutConfig.rolloutPercent?'selected':''}>${value}%</option>`).join('')}
    </select><div class="rollout-help">支持 20%、50%、100%；关闭时停止发行人计划功能的新曝光和新参与，不影响存量任务履约。</div></div>
    <div class="form-actions"><button class="btn" onclick="closeModal()">取消</button><button id="save-publisher-rollout-settings" class="btn btn-primary" onclick="savePublisherRolloutSettings()">保存设置</button></div>`;
  document.getElementById('modal').classList.add('show');
}

function togglePublisherRolloutPercent(){
  const enabled=document.getElementById('publisher-rollout-enabled').checked;
  document.getElementById('publisher-rollout-percent').disabled=!enabled;
}

function savePublisherRolloutSettings(){
  const enabled=document.getElementById('publisher-rollout-enabled').checked;
  const percent=Number(document.getElementById('publisher-rollout-percent').value);
  if(!ALLOWED_ROLLOUT_PERCENTS.includes(percent))return showToast('灰度比例无效，未保存');
  const before={...publisherRolloutConfig};
  publisherRolloutConfig.enabled=enabled;
  publisherRolloutConfig.rolloutPercent=percent;
  publisherRolloutConfig.configVersion+=1;
  publisherRolloutConfig.updatedBy='李四';
  publisherRolloutConfig.updatedAt='2026-09-14 11:45';
  publisherRolloutChangeLog.unshift({before,after:{...publisherRolloutConfig}});
  closeModal();
  renderPage('dashboard');
  showToast(`外放设置已保存：${enabled?`${percent}%`:'已关闭'}`);
}

function openCreateTask(){
  document.getElementById('modal-box').innerHTML=`
<div class="modal-header"><span>创建官方任务</span><span class="modal-close" onclick="closeModal()">✕</span></div>
<div class="form-row"><label>任务名称</label><input placeholder="输入任务名称"></div>
<div class="form-row"><label>推广游戏</label><select><option value="">选择游戏</option><option>转盘小游戏</option><option>凡人修仙模拟器</option><option>233购物街</option><option>热梗王</option><option>polo小球</option><option>我的世界</option><option>蛋仔派对</option></select></div>
<div class="form-row"><label>投稿平台</label><select multiple style="height:80px"><option selected>抖音</option><option selected>B站</option><option>快手</option><option>小红书</option></select></div>
<div class="form-row"><label>每赞单价（盖世币／赞）</label><input type="number" min="1" step="1" value="2"></div>
<div class="form-row"><label>单稿奖励上限（盖世币）</label><input type="number" min="1" step="1" value="10000"></div>
<div class="form-row"><label>任务总预算（盖世币）</label><input type="number" min="5000" max="10000000" placeholder="5,000～10,000,000"></div>
<div class="form-row"><label>投稿与点赞统计截止时间</label><div style="display:flex;gap:8px"><input type="date" value="2026-09-25" style="flex:1"><span style="line-height:36px">至</span><input type="date" value="2026-09-28" style="flex:1"></div></div>
<div class="form-row"><label>视频要求</label><textarea placeholder="每行一条要求，如：&#10;视频时长≥15秒&#10;需包含游戏实际画面&#10;投稿内容必须为视频"></textarea></div>
<div class="form-actions"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="closeModal();showToast('官方任务创建成功，已直接上架')">创建并上架</button></div>`;
  document.getElementById('modal').classList.add('show');
}

function openRejectModal(name){
  document.getElementById('modal-box').innerHTML=`
<div class="modal-header"><span>驳回「${name}」</span><span class="modal-close" onclick="closeModal()">✕</span></div>
<div class="form-row"><label>驳回原因（将通知发布者/创作者）</label><textarea placeholder="请输入驳回原因，如：视频内容与任务游戏不符"></textarea></div>
<div class="form-actions"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="closeModal();showToast('已驳回，已通知对方')">确认驳回</button></div>`;
  document.getElementById('modal').classList.add('show');
}

function confirmAction(msg,cb){
  document.getElementById('modal-box').innerHTML=`
<div class="modal-header"><span>操作确认</span><span class="modal-close" onclick="closeModal()">✕</span></div>
<div style="padding:16px 0;font-size:14px;color:#666">${msg}</div>
<div class="form-actions"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="closeModal();(${cb.toString()})()">确认</button></div>`;
  document.getElementById('modal').classList.add('show');
}

function closeModal(){document.getElementById('modal').classList.remove('show')}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2000)}

// ================= 创作者审核模块 =================
const creatorApps=[
  {id:'CA001',uid:'u10086',name:'张三',avatar:'ZS',realNameStatus:'已实名',applyTime:'2026-09-10 14:30',direction:'游戏攻略',desc:'B站游戏区UP主，专注RPG攻略制作。',platform:'https://space.bilibili.com/12345',posts:56,fans:2300,requiredFans:500,likes:8900,status:'待审核',creatorTag:null},
  {id:'CA002',uid:'u20088',name:'王五',avatar:'WW',realNameStatus:'已实名',applyTime:'2026-09-10 09:15',direction:'配置分享',desc:'盖世社区配置帖作者。',platform:'',posts:34,fans:890,requiredFans:500,likes:4500,status:'待审核',creatorTag:null},
  {id:'CA003',uid:'u30055',name:'阿花',avatar:'AH',realNameStatus:'未实名',applyTime:'2026-09-09 18:00',direction:'视频实况',desc:'抖音游戏主播。',platform:'https://www.douyin.com/user/xxx',posts:12,fans:560,requiredFans:500,likes:2100,status:'待审核',creatorTag:null},
  {id:'CA004',uid:'u30102',name:'老王',avatar:'LW',realNameStatus:'已实名',applyTime:'2026-09-09 10:20',direction:'游戏评测',desc:'从业5年的游戏媒体人。',platform:'https://space.bilibili.com/67890',posts:89,fans:12000,requiredFans:500,likes:45000,status:'已通过',creatorTag:null},
  {id:'CA005',uid:'u30200',name:'Nine9',avatar:'N9',realNameStatus:'已实名',applyTime:'2026-09-08 16:40',direction:'MOD制作',desc:'资深MOD制作者。',platform:'https://www.nexusmods.com/users/xxx',posts:23,fans:3400,requiredFans:500,likes:15600,status:'已通过',creatorTag:'优质视频创作者'},
  {id:'CA006',uid:'u99001',name:'黑号测试',avatar:'HH',realNameStatus:'已实名',applyTime:'2026-09-08 08:00',direction:'游戏攻略',desc:'测试账号。',platform:'',posts:1,fans:0,requiredFans:500,likes:0,status:'已驳回',creatorTag:null}
];

function creatorEligible(creator){
  return creator.realNameStatus==='已实名'&&creator.posts>=5&&creator.fans>=creator.requiredFans;
}

function renderCreatorAudit(){
  const pending=creatorApps.filter(a=>a.status==='待审核').length;
  const passed=creatorApps.filter(a=>a.status==='已通过').length;
  const rejected=creatorApps.filter(a=>a.status==='已驳回').length;

  let html=`
  <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);">
    <div class="stat-card"><div class="stat-label">待审核</div><div class="stat-value" style="color:#fa8c16;">${pending}</div></div>
    <div class="stat-card"><div class="stat-label">已通过</div><div class="stat-value" style="color:#52c41a;">${passed}</div></div>
    <div class="stat-card"><div class="stat-label">已驳回</div><div class="stat-value" style="color:#ff4d4f;">${rejected}</div></div>
  </div>
  <div class="card">
    <div class="card-title">创作者认证申请</div>
    <div class="filter-bar">
      <input placeholder="用户UID/昵称" style="width:160px">
      <select><option>全部状态</option><option>待审核</option><option>已通过</option><option>已驳回</option></select>
      <select><option>全部方向</option><option>游戏攻略</option><option>配置分享</option><option>游戏评测</option><option>视频实况</option><option>MOD制作</option></select>
      <button class="btn btn-primary" onclick="showToast('查询成功')">查询</button>
      <button class="btn" onclick="showToast('已重置')">重置</button>
    </div>
    <table>
      <thead><tr>
        <th>申请ID</th><th>用户信息</th><th>实名状态</th><th>创作方向</th><th>社区数据／门槛</th><th>专属标签</th><th>申请时间</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>`;

  creatorApps.forEach(a=>{
    const statusTag=a.status==='待审核'?'tag-orange':a.status==='已通过'?'tag-green':'tag-red';
    const eligible=creatorEligible(a);
    html+=`<tr>
      <td>${a.id}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="avatar-initial avatar-sm" aria-hidden="true">${a.avatar}</div>
          <div><div style="font-weight:500;">${a.name}</div><div style="font-size:11px;color:#999;">${a.uid}</div></div>
        </div>
      </td>
      <td><span class="tag ${a.realNameStatus==='已实名'?'tag-green':'tag-red'}">${a.realNameStatus}</span></td>
      <td><span class="tag tag-blue">${a.direction}</span></td>
      <td>
        <div style="font-size:12px;line-height:1.6;">
          发布 <b>${a.posts}</b> 篇 · 粉丝 <b>${a.fans>=1000?(a.fans/1000).toFixed(1)+'k':a.fans}</b><br>门槛：动态 ≥5 篇、粉丝 ≥${a.requiredFans}
        </div>
      </td>
      <td>${a.creatorTag?`<span class="tag tag-blue">${a.creatorTag}</span>`:'—'}</td>
      <td style="font-size:12px;">${a.applyTime}</td>
      <td><span class="tag ${statusTag}">${a.status}</span></td>
      <td>
        ${a.status==='待审核'?`
          <button class="btn btn-success btn-sm" ${eligible?'':`disabled title="未达门槛"`} onclick="auditCreator('${a.id}','pass')">${eligible?'通过':'未达门槛'}</button>
          <button class="btn btn-danger btn-sm" onclick="auditCreator('${a.id}','reject')">驳回</button>
          <button class="btn btn-sm" onclick="viewCreatorDetail('${a.id}')">详情</button>
        `:a.status==='已通过'?`
          <button class="btn btn-sm" onclick="viewCreatorDetail('${a.id}')">详情</button>
          ${a.creatorTag?'':`<button class="btn btn-primary btn-sm" onclick="inviteCreatorTag('${a.id}')">定向邀请专属标签</button>`}
          <button class="btn btn-danger btn-sm" onclick="auditCreator('${a.id}','revoke')">撤销</button>
        `:`
          <button class="btn btn-sm" onclick="viewCreatorDetail('${a.id}')">详情</button>
        `}
      </td>
    </tr>`;
  });

  html+=`</tbody></table></div>`;
  return html;
}

function auditCreator(id, action){
  const a=creatorApps.find(x=>x.id===id);
  if(!a) return;
  if(action==='pass'){
    if(!creatorEligible(a)){
      showToast('实名或创作者认证门槛未满足');
      return;
    }
    a.status='已通过';
    showToast(`已通过 ${a.name} 的创作者认证，仅授予认证身份与投稿权限`);
  } else if(action==='reject'){
    a.status='已驳回';
    showToast('已驳回 '+a.name+' 的申请');
  } else if(action==='revoke'){
    a.status='已驳回';
    showToast('已撤销 '+a.name+' 的创作者身份');
  }
  renderPage('creator-audit');
}

function inviteCreatorTag(id){
  const creator=creatorApps.find(item=>item.id===id);
  if(!creator||creator.status!=='已通过')return showToast('仅认证创作者可定向邀请专属标签');
  creator.creatorTag='优质视频创作者';
  showToast(`已根据产出表现定向邀请 ${creator.name} 获得专属标签`);
  renderPage('creator-audit');
}

function viewCreatorDetail(id){
  const a=creatorApps.find(x=>x.id===id);
  if(!a) return;
  const box=document.getElementById('modal-box');
  box.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h3 style="margin:0;">创作者申请详情</h3>
      <span style="cursor:pointer;font-size:20px;color:#999;" onclick="closeModal()">×</span>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #f0f0f0;">
      <div class="avatar-initial avatar-lg" aria-hidden="true">${a.avatar}</div>
      <div>
        <div style="font-size:16px;font-weight:bold;">${a.name}</div>
        <div style="font-size:12px;color:#999;">${a.uid} · 申请时间：${a.applyTime}</div>
      </div>
      <span class="tag ${a.status==='待审核'?'tag-orange':a.status==='已通过'?'tag-green':'tag-red'}" style="margin-left:auto;">${a.status}</span>
    </div>
    <table style="margin-bottom:16px;">
      <tr><td style="color:#999;width:100px;">创作方向</td><td><span class="tag tag-blue">${a.direction}</span></td></tr>
      <tr><td style="color:#999;">实名状态</td><td>${a.realNameStatus}</td></tr>
      <tr><td style="color:#999;">当前粉丝门槛</td><td>${a.requiredFans}</td></tr>
      <tr><td style="color:#999;">专属标签</td><td>${a.creatorTag||'未获得'}</td></tr>
      <tr><td style="color:#999;">个人简介</td><td>${a.desc}</td></tr>
      <tr><td style="color:#999;">其他平台</td><td>${a.platform?'<a href="'+a.platform+'" target="_blank" style="color:#1890ff;">'+a.platform+'</a>':'未填写'}</td></tr>
      <tr><td style="color:#999;">发布动态数</td><td><b>${a.posts}</b> 篇</td></tr>
      <tr><td style="color:#999;">粉丝数</td><td><b>${a.fans}</b></td></tr>
      <tr><td style="color:#999;">获赞数</td><td><b>${a.likes}</b></td></tr>
    </table>
    ${a.status==='待审核'?`
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn btn-danger" onclick="closeModal();auditCreator('${a.id}','reject')">驳回申请</button>
      <button class="btn btn-primary" ${creatorEligible(a)?'':`disabled title="未达门槛"`} onclick="closeModal();auditCreator('${a.id}','pass')">${creatorEligible(a)?'通过认证':'未达门槛'}</button>
    </div>
    `:`
    <div style="text-align:right;">
      <button class="btn" onclick="closeModal()">关闭</button>
    </div>
    `}
  `;
  document.getElementById('modal').classList.add('show');
}

// Init
renderPage('dashboard');

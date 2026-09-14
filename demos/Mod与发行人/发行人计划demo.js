const games=[
{id:1,name:'中奖概率倍儿高啊啊',icon:'🎰',color:'#ff6b6b'},
{id:2,name:'凡人修仙模拟器',icon:'⚔️',color:'#667eea'},
{id:3,name:'233购物街',icon:'🛒',color:'#f093fb'},
{id:4,name:'测测你是热梗王吗',icon:'🧠',color:'#4facfe'},
{id:5,name:'polo小球',icon:'⚽',color:'#a8edea'},
{id:6,name:'植物大战僵尸',icon:'🌻',color:'#52c41a'},
{id:7,name:'我的世界',icon:'⛏️',color:'#8b5e3c'},
{id:8,name:'蛋仔派对',icon:'🥚',color:'#ffb800'}
];
const platformMap={douyin:'抖音',bilibili:'B站',kuaishou:'快手',xiaohongshu:'小红书'};
const CI='<span class="coin-icon">G</span>';

const tasks=[
{id:1,title:'中奖概率倍儿高啊啊',gameId:1,badge:'官方',platforms:['douyin','bilibili'],reward:2,maxReward:10000,pool:87100,reserved:30000,submissions:51,deadline:'2026-06-15',snapshotDeadline:'2026-06-18 23:59',status:'进行中',ruleVersion:1,productIntro:'超刺激的转盘抽奖小游戏，每次转动都有惊喜！玩法简单上手快，适合各年龄段玩家。',
requirements:['视频时长≥15秒','需包含游戏实际游玩画面','投稿内容必须为视频内容']},
{id:2,title:'凡人修仙模拟器宣传',gameId:2,badge:null,platforms:['bilibili'],reward:1,maxReward:8000,pool:50000,reserved:16000,submissions:11,deadline:'2026-06-10',snapshotDeadline:'2026-06-13 23:59',status:'进行中',ruleVersion:1,productIntro:'国风修仙放置类RPG，从凡人一步步修炼成仙。画面精美，剧情丰富，适合喜欢修仙题材的玩家。建议展示核心战斗和升级系统。',
requirements:['视频时长≥30秒','需展示游戏核心玩法','标题需包含游戏名称','投稿内容必须为视频']},
{id:3,title:'233购物街可摆摊收打赏啦',gameId:3,badge:'官方',platforms:['douyin','kuaishou','xiaohongshu'],reward:3,maxReward:6000,pool:30000,reserved:12000,submissions:7,deadline:'2026-06-01',snapshotDeadline:'2026-06-04 23:59',status:'进行中',ruleVersion:1,productIntro:'模拟经营类游戏，玩家可以开店摆摊、装修店铺、与好友互动。新版本上线了打赏功能，社交玩法更丰富。',
requirements:['视频时长≥15秒','需展示摆摊和打赏功能','投稿内容必须为视频']},
{id:4,title:'测测你是热梗王吗推广',gameId:4,badge:null,platforms:['douyin','bilibili','kuaishou','xiaohongshu'],reward:2,maxReward:5000,pool:25000,reserved:10000,submissions:7,deadline:'2026-06-08',snapshotDeadline:'2026-06-11 23:59',status:'进行中',ruleVersion:1,productIntro:'趣味答题游戏，涵盖最新网络热梗。答对越多排名越高，适合拍摄"挑战类"短视频，容易引发观众互动。',
requirements:['视频时长≥15秒','需展示答题过程和结果','推荐使用相关话题标签','投稿内容必须为视频']},
{id:5,title:'polo小球角色分享',gameId:5,badge:null,platforms:['xiaohongshu'],reward:5,maxReward:15000,pool:60000,reserved:15000,submissions:7,deadline:'2026-06-20',snapshotDeadline:'2026-06-23 23:59',status:'进行中',ruleVersion:1,productIntro:'休闲竞技小球对战游戏，角色造型可爱多样。适合在小红书分享角色外观和精彩对战瞬间。',
requirements:['视频时长≥10秒','需展示角色外观或对战画面','投稿内容必须为视频']}
];

function calculateReward(likes,reward,maxReward){
  return Math.min(Math.max(0,Number(likes)||0)*reward,maxReward);
}

const rankData=[
{name:'Nine9',avatar:'😎',reward:340,link:'https://www.douyin.com/video/example1'},
{name:'晓晓',avatar:'🎭',reward:205,link:'https://www.bilibili.com/video/example2'},
{name:'昼雨',avatar:'🌧',reward:110,link:'https://www.douyin.com/video/example3'}
];

const myPublished=[
{id:101,title:'我的世界建筑大赛',status:'机器审核中',statusColor:'#1890ff',gameId:7,reward:10,maxReward:1000,pool:20000,reserved:0,submissions:0,platforms:['bilibili','douyin'],deadline:'2026-09-30 23:59',snapshotDeadline:'2026-10-03 23:59',ruleVersion:1,productIntro:'分享有创意的建筑作品。',requirements:['投稿内容必须为视频内容'],budgetSources:{recharge:20000,reward:0}},
{id:102,title:'蛋仔派对新皮肤推广',status:'进行中',statusColor:'#ff8c00',gameId:8,reward:5,maxReward:500,pool:10000,reserved:2000,submissions:4,platforms:['douyin','kuaishou'],deadline:'2026-09-25 23:59',snapshotDeadline:'2026-09-28 23:59',ruleVersion:1,productIntro:'展示新皮肤及局内效果。',requirements:['投稿内容必须为视频内容'],budgetSources:{recharge:10000,reward:0}}
];
const myJoined=[
{taskId:1,status:'进行中',statusColor:'#ff8c00',note:'剩余48小时'},
{taskId:2,status:'数据校验通过，待人工结算',statusColor:'#1890ff',note:'已预留 8,000 盖世币'},
{taskId:3,status:'已结算',statusColor:'#52c41a',note:'+150盖世币'}
];
const earnRecords=[
{name:'中奖概率倍儿高 · 结算',time:'2026-05-23 14:30',amount:'+500',type:'income'},
{name:'发布任务「蛋仔派对」· 冻结预算',time:'2026-05-22 18:00',amount:'-10,000',type:'expense'},
{name:'充值',time:'2026-05-22 09:00',amount:'+10,000',type:'recharge'},
{name:'凡人修仙模拟器 · 结算',time:'2026-05-18 16:42',amount:'+1,200',type:'income'},
{name:'发布任务「我的世界」· 冻结预算',time:'2026-05-16 11:00',amount:'-20,000',type:'expense'},
{name:'充值',time:'2026-05-15 08:30',amount:'+30,000',type:'recharge'},
{name:'233购物街推广 · 结算',time:'2026-05-15 09:20',amount:'+150',type:'income'},
{name:'测测你是热梗王 · 结算',time:'2026-05-10 11:33',amount:'+800',type:'income'}
];

const wallet={
  totalBalance:3650,
  redeemableBalance:2650,
  rechargeBalance:1000
};

const rechargeSkus=[1000,5000,10000,50000,100000,500000];

const publisherState={
  beijingDate:'2026-09-11',
  submittedToday:9,
  submitPending:false,
  uploadedImages:[]
};

const submissions=[
  {
    id:'SUB001',taskId:1,platform:'douyin',contentId:'7382xxx',link:'https://www.douyin.com/video/7382xxx',
    title:'转盘挑战实录',description:'挑战中奖概率',tags:['游戏','转盘'],duration:36,likes:3800,
    fetchedAt:'2026-09-11 10:30',expectedReward:7600,reservedCoin:10000,
    status:'数据校验通过，待人工结算',risk:'正常'
  }
];

const platformHosts={
  douyin:['douyin.com'],
  bilibili:['bilibili.com'],
  kuaishou:['kuaishou.com'],
  xiaohongshu:['xiaohongshu.com']
};

function normalizeContentId(link){
  try{
    const url=new URL(link);
    const parts=url.pathname.split('/').filter(Boolean);
    return parts.at(-1)||'';
  }catch{return '';}
}

function linkMatchesPlatform(link,platform){
  try{
    const host=new URL(link).hostname.toLowerCase();
    return (platformHosts[platform]||[]).some(domain=>host===domain||host.endsWith(`.${domain}`));
  }catch{return false;}
}

const submissionScenario=link=>
  link.includes('timeout')?'抓取重试':
  link.includes('private')?'风险挂起':
  link.includes('risk')?'人工处理':'normal';

const jdCards=[
  {id:'JD10',name:'京东E卡 10元',faceValue:10,cost:1000,stock:8,limit:2},
  {id:'JD20',name:'京东E卡 20元',faceValue:20,cost:2000,stock:5,limit:1},
  {id:'JD50',name:'京东E卡 50元',faceValue:50,cost:5000,stock:0,limit:1},
  {id:'JD100',name:'京东E卡 100元',faceValue:100,cost:10000,stock:2,limit:1}
];

const cardOrders=[
  {id:'EX20260830001',cardId:'JD10',cardName:'京东E卡 10元',cost:1000,time:'2026-08-30 18:20',status:'已发放',code:'JDE8-K2M9-P4Q7-X6W3'}
];

let currentTask=null,currentMyTab='joined',currentEarnTab='all',editingTask=null;
let selectedCardId=null,rulesReturnView='plaza',lastDialogTrigger=null,toastTimer=null;
const identityState={
  realNameVerified:true,
  creatorCertified:true,
  creatorTag:null
};
const ALLOWED_ROLLOUT_PERCENTS=[20,50,100];
const publisherRollout={
  enabled:true,
  rolloutPercent:20,
  rolloutSeed:'publisher-plan-round-1',
  configVersion:1,
  updatedBy:'运营管理员',
  updatedAt:'2026-09-14 11:30'
};
const publisherRolloutSubject={accountId:'u10002',installationId:'install-demo-001',loggedIn:true};

function stableRolloutBucket(value){
  let hash=2166136261;
  for(let i=0;i<value.length;i+=1){
    hash^=value.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return (hash>>>0)%100;
}

function hasExistingPublisherRelationship(){
  return myPublished.length>0||myJoined.length>0;
}

function getPublisherRolloutDecision({
  subjectId=publisherRolloutSubject.loggedIn?publisherRolloutSubject.accountId:publisherRolloutSubject.installationId,
  hasExistingRelation=hasExistingPublisherRelationship(),
  config=publisherRollout
}={}){
  const percent=ALLOWED_ROLLOUT_PERCENTS.includes(config.rolloutPercent)?config.rolloutPercent:0;
  const bucket=stableRolloutBucket(`${subjectId}|publisher_plan|${config.rolloutSeed}`);
  const canStartNew=Boolean(config.enabled)&&bucket<percent;
  return {
    bucket,
    canStartNew,
    canManageExisting:Boolean(hasExistingRelation),
    configVersion:config.configVersion,
    rolloutPercent:percent
  };
}

function canStartNewPublisherAction(){
  return getPublisherRolloutDecision().canStartNew;
}

function openCreateTask(){
  if(!canStartNewPublisherAction())return false;
  if(!requirePublisherIdentity(()=>openCreateTask()))return false;
  editingTask=null;
  document.getElementById('create-title').textContent='创建发行任务';
  renderCreateForm();
  showView('create');
  return true;
}
function G(id){return games.find(g=>g.id===id)}

function requirePublisherIdentity(onVerified){
  if(identityState.realNameVerified)return true;
  showModal('完成实名认证','发布任务前需要先完成实名认证。',()=>{
    identityState.realNameVerified=true;
    showToast('实名认证已完成');
    if(typeof onVerified==='function')onVerified();
  },'去认证');
  return false;
}

function requireRedeemIdentity(onVerified){
  if(identityState.realNameVerified)return true;
  showModal('完成实名认证','兑换前需要先完成实名认证。',()=>{
    identityState.realNameVerified=true;
    showToast('实名认证已完成');
    if(typeof onVerified==='function')onVerified();
  },'去认证');
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

function beginSubmission(){
  if(!canStartNewPublisherAction())return false;
  if(!requireSubmissionIdentity())return;
  const available=currentTask.pool-currentTask.reserved;
  if(available<currentTask.maxReward){
    showToast('当前任务奖池名额已满');
    return;
  }
  showView('submit');
}

function renderTaskList(){
  document.getElementById('task-list').innerHTML=tasks.map(t=>{
    const g=G(t.gameId),pn=t.platforms.map(p=>platformMap[p]).join('/');
    return `<div class="task-card" onclick="openDetail(${t.id})"><div class="task-card-img" style="background:linear-gradient(135deg,${g.color},${g.color}cc)"><span style="font-size:36px">${g.icon}</span>${t.badge?`<div class="badge">${t.badge}</div>`:''}</div><div class="task-card-body"><div class="task-card-title">${t.title}</div><div class="task-card-info"><span class="task-card-meta">${pn}</span><span class="task-card-reward">${CI} 每赞 ${t.reward}</span></div><div class="task-card-footer"><span>${t.submissions}个投稿</span><span style="color:#ff8c00;font-weight:600">奖池 ${CI}${t.pool.toLocaleString()}</span></div></div></div>`;
  }).join('');
}

function openDetail(id){
  currentTask=tasks.find(t=>t.id===id);const g=G(currentTask.gameId);
  const pn=currentTask.platforms.map(p=>platformMap[p]).join(' / ');
  document.getElementById('detail-content').innerHTML=`
<div class="detail-banner" style="background:linear-gradient(135deg,${g.color},${g.color}cc)"><span style="font-size:44px">${g.icon}</span><div class="game-name">${currentTask.title}</div></div>
<div class="section"><div class="detail-stats"><div class="detail-stat-item"><div class="num">${currentTask.submissions}</div><div class="label">已投稿</div></div><div class="detail-stat-item"><div class="num">${CI}${currentTask.reward}</div><div class="label">每赞奖励</div></div><div class="detail-stat-item"><div class="num">${CI}${currentTask.pool.toLocaleString()}</div><div class="label">任务奖池</div></div></div></div>
<div class="section"><div class="section-title">产品介绍</div><div style="font-size:13px;color:#666;line-height:1.8">${currentTask.productIntro||'暂无产品介绍'}</div></div>
<div class="section"><div class="section-title">投稿平台</div><div style="font-size:13px;color:#666">${pn}</div></div>
<div class="section"><div class="section-title">投稿要求</div><ul class="requirement-list">${currentTask.requirements.map(r=>`<li>${r}</li>`).join('')}</ul></div>
<div class="section"><div class="section-title">奖励与结算</div><div class="rule-copy">每 1 个赞奖励 ${currentTask.reward} 盖世币，单篇最高 ${currentTask.maxReward.toLocaleString()} 盖世币。</div><div class="rule-copy">预计奖励 = min（当前点赞数 × 每赞单价，单稿奖励上限）。最终以点赞统计截止时间 ${currentTask.snapshotDeadline} 的数据快照及人工结算结果为准。</div><div class="rule-copy">投稿数据校验通过时按单稿奖励上限预留奖池；可用预算不足一个单稿上限时停止接收新投稿。</div></div>
<div class="section"><div class="section-title">收入排行</div>${rankData.map((r,i)=>`<div class="rank-item"><div class="rank-num t${i+1}">${i+1}</div><div class="rank-avatar">${r.avatar}</div><div class="rank-info"><div class="rn">${r.name}</div><div class="rr">投稿奖励 ${CI}${r.reward}</div></div><div class="rank-view" onclick="event.stopPropagation();showToast('打开作品链接')">查看投稿 ›</div></div>`).join('')}</div>
<div style="height:70px"></div>`;
  const btn=document.getElementById('btn-claim');
  btn.textContent='上传参与作品';
  btn.onclick=beginSubmission;
  showView('detail');
}


function renderMyTasks(){
  const c=document.getElementById('my-task-content');
  if(currentMyTab==='joined'){
    c.innerHTML=myJoined.map(j=>{const t=tasks.find(x=>x.id===j.taskId),g=G(t.gameId);
      return `<div class="my-task-item" onclick="openDetail(${t.id})"><div class="thumb" style="background:${g.color}22">${g.icon}</div><div class="info"><div class="name">${t.title}</div><div class="meta" style="color:${j.statusColor}">${j.status}${j.note?' · '+j.note:''}</div></div></div>`;}).join('');
  } else {
    c.innerHTML=myPublished.map(p=>{const g=G(p.gameId);
      return `<div class="my-task-item"><div class="thumb" style="background:${g.color}22">${g.icon}</div><div class="info"><div class="name">${p.title}</div><div class="meta" style="color:${p.statusColor}">${p.status}${p.submissions?` · ${p.submissions} 个投稿`:''}</div></div><div class="actions"><span class="act-btn view" onclick="event.stopPropagation();showToast('查看任务详情')">查看</span>${publishedActions(p)}</div></div>`;}).join('');
  }
}

function publishedActions(task){
  if(task.status==='机器审核中')return `<span class="act-btn cancel" onclick="event.stopPropagation();cancelPendingTask(${task.id})">取消</span>`;
  if(task.status==='进行中'&&task.submissions===0)return `<span class="act-btn edit" onclick="event.stopPropagation();openTaskAdjustment(${task.id})">追加／延期</span><span class="act-btn cancel" onclick="event.stopPropagation();endTaskEarly(${task.id})">提前结束</span>`;
  if(task.status==='进行中'&&task.submissions>0)return `<span class="act-btn edit" onclick="event.stopPropagation();openTaskAdjustment(${task.id})">追加／延期</span><span class="act-btn cancel" onclick="event.stopPropagation();endTaskEarly(${task.id})">申请提前结束</span>`;
  return '';
}

function openTaskAdjustment(taskId){
  const task=myPublished.find(item=>item.id===taskId);
  if(!task||task.status!=='进行中')return showToast('仅进行中任务可追加预算或延长时间');
  const currentDeadline=task.deadline.replace(' ','T');
  document.getElementById('modal-title').textContent='追加预算／延长时间';
  document.getElementById('modal-content').innerHTML=`<div class="form-tip adjustment-lock">每赞单价 ${task.reward}、单稿上限 ${task.maxReward.toLocaleString()} 和核心投稿要求已锁定，不可降低或修改。</div><label class="adjustment-label" for="adjust-budget">追加预算（盖世币）</label><input id="adjust-budget" class="form-input" type="number" min="0" step="1" placeholder="输入追加预算"><label class="adjustment-label" for="adjust-deadline">投稿截止时间</label><input id="adjust-deadline" class="form-input" type="datetime-local" min="${currentDeadline}" value="${currentDeadline}">`;
  document.getElementById('modal-confirm').onclick=()=>confirmTaskAdjustment(taskId);
  document.getElementById('modal').classList.add('show');
}

function confirmTaskAdjustment(taskId){
  const task=myPublished.find(item=>item.id===taskId);
  if(!task||task.status!=='进行中')return showToast('任务状态已变化，请刷新后重试');
  const extraValue=document.getElementById('adjust-budget').value;
  const extra=extraValue===''?0:Number(extraValue);
  const deadline=document.getElementById('adjust-deadline').value;
  const normalizedDeadline=deadline.replace('T',' ');
  if(!Number.isInteger(extra)||extra<0){showToast('追加预算必须为非负整数');return;}
  if(!deadline||normalizedDeadline<task.deadline){showToast('投稿截止时间只能延长');return;}
  if(normalizedDeadline>=task.snapshotDeadline){showToast('投稿截止时间必须早于点赞统计截止时间');return;}
  if(extra===0&&normalizedDeadline===task.deadline){showToast('请追加预算或延长时间');return;}
  const sources=extra?freezeTaskBudget(extra):{recharge:0,reward:0};
  if(extra&&!sources){showToast('盖世币余额不足');return;}
  task.budgetSources=task.budgetSources||{recharge:0,reward:0};
  task.budgetSources.recharge+=sources.recharge;
  task.budgetSources.reward+=sources.reward;
  task.pool+=extra;
  task.deadline=normalizedDeadline;
  closeModal();
  showToast('已追加预算／延长时间，原奖励规则保持不变');
  renderMyTasks();
}

function cancelPendingTask(taskId){
  const task=myPublished.find(item=>item.id===taskId);
  if(!task||task.status!=='机器审核中')return showToast('任务状态已变化，请刷新后重试');
  task.status='已取消';
  task.statusColor='#999';
  refundFrozenBudget(task);
  showToast('任务已取消，预算按原来源退回；当日提交次数不返还');
  renderMyTasks();
}

function endTaskEarly(taskId){
  const task=myPublished.find(item=>item.id===taskId);
  if(!task||task.status!=='进行中')return showToast('任务状态已变化，请刷新后重试');
  if(task.submissions>0){
    task.status='待人工结算';
    task.statusColor='#722ed1';
    showToast('已停止新增投稿，已有投稿继续人工结算');
  }else{
    task.status='已结束';
    task.statusColor='#999';
    refundFrozenBudget(task);
    showToast('任务已提前结束，未使用预算按来源退回');
  }
  renderMyTasks();
}

function renderEarnList(){
  document.getElementById('wallet-total').textContent=wallet.totalBalance.toLocaleString();
  const filtered=currentEarnTab==='all'?earnRecords:earnRecords.filter(r=>r.type===currentEarnTab);
  document.getElementById('earn-list').innerHTML=filtered.map(r=>{
    const isPos=r.amount.startsWith('+');
    return `<div class="earn-item"><div class="left"><div class="name">${r.name}</div><div class="time">${r.time}</div></div><div class="right ${isPos?'pos':'neg'}">${r.amount}</div></div>`;
  }).join('')||'<div style="text-align:center;padding:40px;color:#ccc">暂无记录</div>';
}

function renderRecharge(){
  document.getElementById('recharge-content').innerHTML=`
<div class="section"><div style="text-align:center;margin-bottom:16px"><div style="font-size:12px;color:#999">当前余额</div><div style="font-size:26px;font-weight:700;color:#ff8c00;margin-top:4px">${CI} ${wallet.totalBalance.toLocaleString()} 盖世币</div><div style="font-size:12px;color:#999;margin-top:4px">充值所得仅可用于发布任务，不计入兑换余额</div></div>
<div class="section-title">选择充值档位</div>
<div class="recharge-grid">${rechargeSkus.map((a,i)=>`<div class="ra-item${i===1?' selected':''}" data-amount="${a}" onclick="selectRA(this)"><div class="ra-coin">${a>=10000?(a/10000)+'万':a.toLocaleString()}</div><div class="ra-price">¥${(a/100).toFixed(0)}</div></div>`).join('')}</div>
<div class="form-tip">充值仅支持后台配置的固定 SKU，不支持自定义金额。</div></div>
<div class="section"><div class="section-title">支付方式</div><div class="pay-method"><div class="pay-item selected" onclick="selectPay(this)"><div class="pay-icon">微信</div><div class="pay-name">微信支付</div><div class="pay-check">✓</div></div></div></div>
<div style="padding:0 16px"><div class="agree-row"><input type="checkbox" id="agree-check"><label for="agree-check">我已阅读并同意</label><a href="javascript:void(0)" onclick="showToast('查看充值协议')">《盖世币充值服务协议》</a></div><button class="btn-primary" id="recharge-btn" onclick="doRecharge()">确认充值</button></div>`;
}

function selectRA(el){document.querySelectorAll('.ra-item').forEach(i=>i.classList.remove('selected'));el.classList.add('selected')}
function selectPay(el){document.querySelectorAll('.pay-item').forEach(i=>{i.classList.remove('selected');i.querySelector('.pay-check').textContent=''});el.classList.add('selected');el.querySelector('.pay-check').textContent='✓'}
function doRecharge(){
  if(!document.getElementById('agree-check').checked){showToast('请先同意充值协议');return}
  const amount=Number(document.querySelector('.ra-item.selected')?.dataset.amount)||0;
  if(!rechargeSkus.includes(amount)){showToast('请选择后台配置的充值档位');return}
  wallet.totalBalance+=amount;
  wallet.rechargeBalance+=amount;
  earnRecords.unshift({name:'充值',time:'2026-09-11 10:20',amount:`+${amount.toLocaleString()}`,type:'recharge'});
  showToast('充值成功，所得盖世币仅可用于发布任务');setTimeout(()=>showView('earnings'),800);
}

function freezeTaskBudget(amount){
  if(!Number.isInteger(amount)||amount<=0||amount>wallet.totalBalance)return null;
  const recharge=Math.min(wallet.rechargeBalance,amount);
  const reward=amount-recharge;
  if(reward>wallet.redeemableBalance)return null;
  wallet.rechargeBalance-=recharge;
  wallet.redeemableBalance-=reward;
  wallet.totalBalance-=amount;
  return {recharge,reward};
}

function refundFrozenBudget(task){
  if(task.budgetRefunded)return;
  const sources=task.budgetSources||{recharge:task.pool,reward:0};
  wallet.rechargeBalance+=sources.recharge;
  wallet.redeemableBalance+=sources.reward;
  wallet.totalBalance+=sources.recharge+sources.reward;
  task.budgetRefunded=true;
}

function renderCreateForm(){
  document.getElementById('create-content').innerHTML=`<div style="padding:16px">
<div class="form-group"><div class="form-label">任务名称 *</div><input class="form-input" id="cr-name" placeholder="输入任务名称"></div>
<div class="form-group"><div class="form-label">推广游戏 *</div><div class="game-search"><input id="game-search-input" class="form-input" placeholder="搜索游戏名称" oninput="searchGame(this.value)" onfocus="searchGame(this.value)"><div class="game-results" id="game-results"></div></div><div id="selected-game-area"></div></div>
<div class="form-group"><div class="form-label">产品介绍（选填）</div><textarea class="form-input" id="cr-intro" style="height:70px;resize:vertical" placeholder="简要介绍推广的游戏亮点，帮助创作者了解产品卖点"></textarea><div class="form-tip">任务名称、产品介绍和投稿要求均会进行敏感词过滤。</div></div>
<div class="form-group"><div class="form-label">投稿要求 *</div><textarea class="form-input" id="cr-requirements" style="height:70px;resize:vertical">投稿内容必须为视频内容</textarea><div class="form-tip">每行一项要求，发布后核心投稿要求锁定。</div></div>
<div class="form-group"><div class="form-label">上传任务图片（选填）</div><label class="upload-box" for="cr-image">＋ 上传任务图片</label><input id="cr-image" type="file" accept="image/*" onchange="addTaskImage(this)" hidden><div id="cr-image-list"></div><div class="form-tip">图片将进行内容安全与 OCR 敏感词检测，全部明确通过后才可发布。</div></div>
<div class="form-group"><div class="form-label">投稿平台（可多选，默认全部） *</div><div class="platform-multi" id="create-platforms"><div class="pm-item selected" data-p="all" onclick="toggleCP(this)">全部</div><div class="pm-item" data-p="douyin" onclick="toggleCP(this)">抖音</div><div class="pm-item" data-p="bilibili" onclick="toggleCP(this)">B站</div><div class="pm-item" data-p="kuaishou" onclick="toggleCP(this)">快手</div><div class="pm-item" data-p="xiaohongshu" onclick="toggleCP(this)">小红书</div></div></div>
<div class="form-group"><div class="form-label">任务目标 *</div><div style="font-size:14px;color:#333;padding:8px 0;font-weight:500">📊 点赞量</div></div>
<div class="form-row"><div class="form-group"><div class="form-label">每赞单价（盖世币／赞） *</div><input class="form-input" id="cr-price" type="number" min="1" step="1" placeholder="如：2"></div><div class="form-group"><div class="form-label">单稿奖励上限（盖世币） *</div><input class="form-input" id="cr-max" type="number" min="1" step="1" placeholder="如：10000"></div></div>
<div class="form-tip">发布者自行设置单价和单稿上限，系统只按该单价计算并显示奖励。</div>
<div class="form-group" style="margin-top:12px"><div class="form-label">任务总预算（盖世币） *</div><input class="form-input" id="cr-pool" type="number" min="5000" max="10000000" step="1" placeholder="如：50000"><div class="form-tip">最低 5,000 盖世币，最高 10,000,000 盖世币；提交后足额冻结。</div></div>
<div class="form-group"><div class="form-label">投稿截止时间 *</div><input class="form-input" id="cr-submit-deadline" type="datetime-local" value="2026-09-30T23:59"></div>
<div class="form-group"><div class="form-label">点赞统计截止时间 *</div><input class="form-input" id="cr-like-deadline" type="datetime-local" value="2026-10-03T23:59"><div class="form-tip">最终以点赞统计截止时间的数据快照及人工结算结果为准。</div></div>
<div class="form-tip">今日已提交 ${publisherState.submittedToday} 个；同一实名主体每天最多提交 10 个任务，取消或审核不通过不返还次数。</div>
<div style="padding:16px 0"><button class="btn-primary" id="submit-task-btn" onclick="submitCreate(false)">提交并进行机器审核</button><div class="form-tip" style="text-align:center">机器审核通过后自动发布；超时或结果不确定时转人工处理，不默认放行。</div></div></div>`;
  selectedGameId=null;
  renderTaskImages();
}

let selectedGameId=null;
function searchGame(val){const r=document.getElementById('game-results');if(!val){r.classList.remove('show');return}const f=games.filter(g=>g.name.includes(val));if(!f.length){r.classList.remove('show');return}r.innerHTML=f.map(g=>`<div class="game-result-item" onclick="selectGame(${g.id})"><div class="gi" style="background:${g.color}22">${g.icon}</div><div class="gn">${g.name}</div></div>`).join('');r.classList.add('show')}
function selectGame(id){selectedGameId=id;const g=G(id);document.getElementById('game-results').classList.remove('show');document.getElementById('game-search-input').value='';document.getElementById('selected-game-area').innerHTML=`<div class="selected-game"><div class="gi" style="background:${g.color}22">${g.icon}</div><div class="gn">${g.name}</div><span class="remove" onclick="removeGame()">✕</span></div>`}
function removeGame(){selectedGameId=null;document.getElementById('selected-game-area').innerHTML=''}
function toggleCP(el){const p=el.dataset.p;if(p==='all'){document.querySelectorAll('#create-platforms .pm-item').forEach(i=>i.classList.remove('selected'));el.classList.add('selected')}else{document.querySelector('#create-platforms [data-p="all"]').classList.remove('selected');el.classList.toggle('selected');if(!document.querySelectorAll('#create-platforms .pm-item.selected:not([data-p="all"])').length)document.querySelector('#create-platforms [data-p="all"]').classList.add('selected')}}

function addTaskImage(input){
  const file=input.files&&input.files[0];
  if(!file)return;
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
  const input=document.getElementById('cr-image');
  if(input)input.value='';
  renderTaskImages();
}

function renderTaskImages(){
  const container=document.getElementById('cr-image-list');
  if(!container)return;
  container.innerHTML=publisherState.uploadedImages.map(image=>`<div class="upload-file"><span>${image.name}</span><small>${image.uploadStatus} · ${image.machineStatus} · ${image.ocrStatus}</small><button type="button" onclick="removeTaskImage()">删除</button></div>`).join('');
}

function readPositiveInt(id){
  const value=Number(document.getElementById(id).value);
  return Number.isInteger(value)&&value>0?value:0;
}

function selectedTaskPlatforms(){
  if(document.querySelector('#create-platforms [data-p="all"]').classList.contains('selected'))return Object.keys(platformMap);
  return Array.from(document.querySelectorAll('#create-platforms .pm-item.selected')).map(item=>item.dataset.p);
}

function validateTaskDraft(){
  const title=document.getElementById('cr-name').value.trim();
  const productIntro=document.getElementById('cr-intro').value.trim();
  const requirements=document.getElementById('cr-requirements').value.split('\n').map(item=>item.trim()).filter(Boolean);
  const platforms=selectedTaskPlatforms();
  const reward=readPositiveInt('cr-price');
  const maxReward=readPositiveInt('cr-max');
  const pool=readPositiveInt('cr-pool');
  const submitDeadline=document.getElementById('cr-submit-deadline').value;
  const snapshotDeadline=document.getElementById('cr-like-deadline').value;
  if(!requirePublisherIdentity())return null;
  if(publisherState.submittedToday>=10){showToast('同一实名主体每天最多提交 10 个任务');return null;}
  if(!title){showToast('请输入任务名称');return null;}
  if(!selectedGameId){showToast('请选择推广游戏');return null;}
  if(!requirements.length){showToast('请输入投稿要求');return null;}
  if(!platforms.length){showToast('请至少选择一个投稿平台');return null;}
  if(!reward){showToast('每赞单价必须为正整数');return null;}
  if(!maxReward){showToast('单稿奖励上限必须为正整数');return null;}
  if(pool<5000||pool>10000000){showToast('任务预算需为 5,000～10,000,000 盖世币');return null;}
  if(maxReward>pool){showToast('单稿奖励上限不能高于任务总预算');return null;}
  if(pool>wallet.totalBalance){showToast('盖世币余额不足，请先充值');return null;}
  if(!submitDeadline||!snapshotDeadline){showToast('请填写投稿与点赞统计截止时间');return null;}
  if(Date.parse(submitDeadline)<=Date.parse(`${publisherState.beijingDate}T00:00`)){showToast('投稿截止时间必须晚于当前时间');return null;}
  if(Date.parse(snapshotDeadline)<=Date.parse(submitDeadline)){showToast('点赞统计截止时间必须晚于投稿截止时间');return null;}
  if(publisherState.uploadedImages.some(image=>image.uploadStatus!=='上传成功'||image.machineStatus!=='内容安全通过'||image.ocrStatus!=='OCR 敏感词通过')){
    showToast('请等待任务图片完成上传与机器审核');return null;
  }
  return {title,productIntro,requirements,platforms,reward,maxReward,pool,submitDeadline,snapshotDeadline};
}

function taskMachineScenario(task){
  const reviewText=[task.title,task.productIntro,...task.requirements,...task.images.map(image=>image.name)].join(' ');
  if(reviewText.includes('[敏感词]'))return 'reject';
  if(reviewText.includes('[超时]'))return 'manual';
  return 'pass';
}

function runTaskMachineReview(task){
  if(task.status!=='机器审核中')return;
  const scenario=taskMachineScenario(task);
  if(scenario==='reject'){
    task.status='审核不通过';
    task.statusColor='#ff4d4f';
    task.reviewReason='任务文字或图片命中敏感词';
    refundFrozenBudget(task);
    showToast('机器审核不通过，预算已按原来源退回');
    return;
  }
  if(scenario==='manual'){
    task.status='人工异常处理';
    task.statusColor='#fa8c16';
    task.reviewReason='审核服务超时或结果不确定';
    showToast('机器审核结果不确定，已转人工异常处理');
    return;
  }
  task.status='进行中';
  task.statusColor='#ff8c00';
  if(!tasks.some(item=>item.id===task.id))tasks.unshift(task);
  showToast('机器审核通过后自动发布，任务已上架');
}

function submitCreate(isEdit){
  if(isEdit){showToast('进行中任务只允许追加预算或延长时间');return;}
  if(publisherState.submitPending)return;
  const draft=validateTaskDraft();
  if(!draft)return;
  const budgetSources=freezeTaskBudget(draft.pool);
  if(!budgetSources){showToast('预算冻结失败，请刷新余额后重试');return;}
  publisherState.submitPending=true;
  publisherState.submittedToday+=1;
  const task={
    id:Date.now(),title:draft.title,gameId:selectedGameId,badge:null,platforms:draft.platforms,
    reward:draft.reward,maxReward:draft.maxReward,pool:draft.pool,reserved:0,submissions:0,
    deadline:draft.submitDeadline.replace('T',' '),snapshotDeadline:draft.snapshotDeadline.replace('T',' '),
    status:'机器审核中',statusColor:'#1890ff',ruleVersion:1,productIntro:draft.productIntro,
    requirements:draft.requirements,images:publisherState.uploadedImages.map(image=>({...image})),budgetSources
  };
  myPublished.unshift(task);
  publisherState.uploadedImages=[];
  editingTask=null;
  document.getElementById('create-title').textContent='创建发行任务';
  currentMyTab='published';
  document.querySelectorAll('.my-tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.t==='published'));
  showView('mytask');
  showToast('任务已提交，机器审核中');
  setTimeout(()=>{
    runTaskMachineReview(task);
    publisherState.submitPending=false;
    renderMyTasks();
  },500);
}

function submitVideo(){
  if(!requireSubmissionIdentity())return;
  const link=document.getElementById('video-link').value.trim();
  const selectedPlatform=document.querySelector('#submit-platforms .pm-item.selected')?.dataset.p||'';
  const contentId=normalizeContentId(link);
  if(!link){showToast('请粘贴视频链接');return;}
  if(!contentId){showToast('链接格式不正确');return;}
  if(!linkMatchesPlatform(link,selectedPlatform)){showToast('该链接非指定平台');return;}
  if(submissions.some(item=>item.platform===selectedPlatform&&item.contentId===contentId&&item.status!=='已驳回')){
    showToast('该作品已提交过，不能重复投稿');
    return;
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
  document.getElementById('video-link').value='';
  showToast(`数据校验通过，待人工结算；已按单稿奖励上限预留 ${currentTask.maxReward.toLocaleString()} 盖世币`);
  setTimeout(()=>showView('mytask'),900);
}

function getRedeemedCount(cardId){
  return cardOrders.filter(order=>order.cardId===cardId&&order.status==='已发放').length;
}

function getCardDisabledReason(card){
  if(card.stock<=0)return '已兑完';
  if(getRedeemedCount(card.id)>=card.limit)return '已达限兑次数';
  if(wallet.redeemableBalance<card.cost)return `还差 ${(card.cost-wallet.redeemableBalance).toLocaleString()}`;
  return '';
}

function renderCardStore(){
  document.getElementById('redeemable-balance').textContent=wallet.redeemableBalance.toLocaleString();
  document.getElementById('jd-card-grid').innerHTML=jdCards.map(card=>{
    const disabledReason=getCardDisabledReason(card);
    return `<button type="button" class="jd-card-item${disabledReason?' disabled':''}" data-card-id="${card.id}" ${disabledReason?'disabled':''} onclick="openCardRedeem('${card.id}')" aria-label="${card.name}，${disabledReason||'立即兑换'}">
      <span class="jd-brand">京东E卡</span><strong>¥${card.faceValue}</strong>
      <span class="jd-cost">${CI}${card.cost.toLocaleString()} 盖世币</span>
      <span class="jd-limit">每人限兑 ${card.limit} 次 · 库存 ${card.stock}</span>
      <em>${disabledReason||'立即兑换'}</em>
    </button>`;
  }).join('');
}

function openCardRedeem(cardId){
  const card=jdCards.find(item=>item.id===cardId);
  if(!card||getCardDisabledReason(card))return false;
  if(!requireRedeemIdentity(()=>openCardRedeem(cardId)))return false;
  selectedCardId=cardId;
  lastDialogTrigger=document.activeElement;
  document.getElementById('card-redeem-content').innerHTML=`<div class="modal-title" id="card-redeem-title">确认兑换</div>
    <div class="card-confirm-name">${card.name}</div>
    <div class="card-confirm-row"><span>所需盖世币</span><strong>${card.cost.toLocaleString()}</strong></div>
    <div class="card-confirm-row"><span>当前可兑换</span><strong>${wallet.redeemableBalance.toLocaleString()}</strong></div>
    <p>兑换成功后自动发放卡密；只有参与发行任务并结算获得的盖世币可兑换，充值获得的盖世币不可兑换。</p>
    <div class="modal-actions"><button type="button" class="modal-cancel" onclick="closeCardRedeem()">取消</button><button type="button" id="confirm-card-redeem" class="modal-confirm" onclick="confirmCardRedeem()">确认兑换</button></div>`;
  const modal=document.getElementById('card-redeem-modal');
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  setTimeout(()=>document.getElementById('confirm-card-redeem')?.focus(),0);
  return true;
}

function confirmCardRedeem(){
  const card=jdCards.find(item=>item.id===selectedCardId);
  const button=document.getElementById('confirm-card-redeem');
  if(!card||!button||button.disabled)return;
  if(!identityState.realNameVerified){
    const cardId=selectedCardId;
    closeCardRedeem();
    requireRedeemIdentity(()=>openCardRedeem(cardId));
    return;
  }
  button.disabled=true;
  const disabledReason=getCardDisabledReason(card);
  if(disabledReason){
    button.disabled=false;
    renderCardStore();
    showToast(disabledReason);
    return;
  }
  wallet.redeemableBalance-=card.cost;
  wallet.totalBalance-=card.cost;
  card.stock-=1;
  const order={
    id:`EX${Date.now()}`,cardId:card.id,cardName:card.name,cost:card.cost,
    time:'2026-08-31 10:30',status:'已发放',code:`JDE8-${card.id}-P4Q7-X6W3`
  };
  cardOrders.unshift(order);
  document.getElementById('wallet-total').textContent=wallet.totalBalance.toLocaleString();
  document.getElementById('card-redeem-content').innerHTML=`<div class="card-success-mark" aria-hidden="true">✓</div><div class="modal-title" id="card-redeem-title">发放成功</div>
    <p>${order.cardName}已自动发放，可在兑换记录中再次查看。</p>
    <div class="card-code" id="current-card-code" data-code="${order.code}">${maskCardCode(order.code)}</div>
    <div class="modal-actions"><button type="button" class="modal-cancel" onclick="revealCardCode('current-card-code')">查看卡密</button><button type="button" class="modal-confirm" onclick="copyCardCode('current-card-code')">复制卡密</button></div>
    <button type="button" class="result-close" onclick="closeCardRedeem()">完成</button>`;
  renderCardStore();
  setTimeout(()=>document.querySelector('#card-redeem-modal .result-close')?.focus(),0);
}

function maskCardCode(code){
  return `****-****-****-${code.slice(-4)}`;
}

function revealCardCode(elementId){
  const element=document.getElementById(elementId);
  if(element)element.textContent=element.dataset.code;
}

async function copyCardCode(elementId){
  const element=document.getElementById(elementId);
  if(!element)return;
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(element.dataset.code);
    }else{
      const input=document.createElement('textarea');
      input.value=element.dataset.code;
      input.style.position='fixed';
      input.style.opacity='0';
      document.body.appendChild(input);
      input.select();
      const copied=document.execCommand('copy');
      input.remove();
      if(!copied)throw new Error('copy command rejected');
    }
    showToast('卡密已复制');
  }catch{
    showToast('复制失败，请长按卡密复制');
  }
}

function closeCardRedeem(){
  selectedCardId=null;
  const modal=document.getElementById('card-redeem-modal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  lastDialogTrigger?.focus?.();
  lastDialogTrigger=null;
}

function openCardHistory(){
  lastDialogTrigger=document.activeElement;
  document.getElementById('card-history-list').innerHTML=cardOrders.map((order,index)=>`<div class="card-order-item">
    <div class="card-order-head"><strong>${order.cardName}</strong><em>${order.status}</em></div>
    <div class="card-order-meta">${order.time}<br>消耗 ${CI}${order.cost.toLocaleString()} 盖世币 · 订单 ${order.id}</div>
    <div class="card-code" id="history-code-${index}" data-code="${order.code}">${maskCardCode(order.code)}</div>
    <div class="card-order-actions"><button type="button" onclick="revealCardCode('history-code-${index}')">查看卡密</button><button type="button" onclick="copyCardCode('history-code-${index}')">复制卡密</button></div>
  </div>`).join('');
  const modal=document.getElementById('card-history-modal');
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  setTimeout(()=>modal.querySelector('.card-history-close')?.focus(),0);
}

function closeCardHistory(){
  const modal=document.getElementById('card-history-modal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  lastDialogTrigger?.focus?.();
  lastDialogTrigger=null;
}

function showRules(from='plaza'){rulesReturnView=from;showView('rules')}
function closeRules(){showView(rulesReturnView)}

function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const v=document.getElementById('view-'+name);if(v)v.classList.add('active');
  if(name==='mytask')renderMyTasks();
  if(name==='earnings')renderEarnList();
  if(name==='card-store')renderCardStore();
  if(name==='recharge')renderRecharge();
  if(name==='create'&&!editingTask){document.getElementById('create-title').textContent='创建发行任务';renderCreateForm(null)}
}
function switchNav(el,view){document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));el.classList.add('active');showView(view)}
function showToast(msg){const t=document.getElementById('toast');clearTimeout(toastTimer);t.textContent=msg;t.classList.add('show');toastTimer=setTimeout(()=>t.classList.remove('show'),2000)}
function showModal(title,content,onConfirm,confirmText='确认'){document.getElementById('modal-title').textContent=title;document.getElementById('modal-content').textContent=content;const confirm=document.getElementById('modal-confirm');confirm.textContent=confirmText;confirm.onclick=()=>{closeModal();onConfirm()};document.getElementById('modal').classList.add('show')}
function closeModal(){document.getElementById('modal').classList.remove('show')}

document.addEventListener('click',e=>{const gr=document.getElementById('game-results');if(gr&&!e.target.closest('.game-search'))gr.classList.remove('show')});
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(document.getElementById('card-history-modal').classList.contains('show'))closeCardHistory();else if(document.getElementById('card-redeem-modal').classList.contains('show'))closeCardRedeem()});
document.querySelectorAll('.my-tab').forEach(tab=>tab.addEventListener('click',function(){document.querySelectorAll('.my-tab').forEach(t=>t.classList.remove('active'));this.classList.add('active');currentMyTab=this.dataset.t;renderMyTasks()}));
document.querySelectorAll('.earn-tab').forEach(tab=>tab.addEventListener('click',function(){document.querySelectorAll('.earn-tab').forEach(t=>t.classList.remove('active'));this.classList.add('active');currentEarnTab=this.dataset.et;renderEarnList()}));
document.querySelectorAll('#submit-platforms .pm-item').forEach(item=>item.addEventListener('click',function(){document.querySelectorAll('#submit-platforms .pm-item').forEach(i=>i.classList.remove('selected'));this.classList.add('selected')}));

renderTaskList();

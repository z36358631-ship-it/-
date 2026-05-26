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
{id:1,title:'中奖概率倍儿高啊啊',gameId:1,badge:'官方',platforms:['douyin','bilibili'],reward:10,maxReward:1000,pool:87100,submissions:51,deadline:'2026-06-15',productIntro:'超刺激的转盘抽奖小游戏，每次转动都有惊喜！玩法简单上手快，适合各年龄段玩家。视频拍摄建议突出"中奖瞬间"的惊喜感。',
requirements:['视频时长≥15秒','需包含游戏实际游玩画面','视频中需提及"中奖概率倍儿高"相关内容','不可使用他人素材或录屏拼接','投稿内容必须为视频内容，图文内容无效'],
tiers:[{t:'点赞 ≥ 100',a:5},{t:'点赞 ≥ 500',a:20},{t:'点赞 ≥ 1000',a:50},{t:'点赞 ≥ 5000',a:200}]},
{id:2,title:'凡人修仙模拟器宣传',gameId:2,badge:null,platforms:['bilibili'],reward:10,maxReward:1000,pool:48830,submissions:11,deadline:'2026-06-10',productIntro:'国风修仙放置类RPG，从凡人一步步修炼成仙。画面精美，剧情丰富，适合喜欢修仙题材的玩家。建议展示核心战斗和升级系统。',
requirements:['视频时长≥30秒','需展示游戏核心玩法','标题需包含游戏名称','投稿内容必须为视频'],
tiers:[{t:'点赞 ≥ 100',a:5},{t:'点赞 ≥ 500',a:20},{t:'点赞 ≥ 1000',a:50},{t:'点赞 ≥ 5000',a:200}]},
{id:3,title:'233购物街可摆摊收打赏啦',gameId:3,badge:'官方',platforms:['douyin','kuaishou','xiaohongshu'],reward:5,maxReward:500,pool:3625,submissions:7,deadline:'2026-06-01',productIntro:'模拟经营类游戏，玩家可以开店摆摊、装修店铺、与好友互动。新版本上线了打赏功能，社交玩法更丰富。',
requirements:['视频时长≥15秒','需展示摆摊和打赏功能','投稿内容必须为视频'],
tiers:[{t:'点赞 ≥ 50',a:3},{t:'点赞 ≥ 200',a:10},{t:'点赞 ≥ 1000',a:30}]},
{id:4,title:'测测你是热梗王吗推广',gameId:4,badge:null,platforms:['douyin','bilibili','kuaishou','xiaohongshu'],reward:5,maxReward:500,pool:3455,submissions:7,deadline:'2026-06-08',productIntro:'趣味答题游戏，涵盖最新网络热梗。答对越多排名越高，适合拍摄"挑战类"短视频，容易引发观众互动。',
requirements:['视频时长≥15秒','需展示答题过程和结果','推荐使用相关话题标签','投稿内容必须为视频'],
tiers:[{t:'点赞 ≥ 100',a:5},{t:'点赞 ≥ 500',a:15},{t:'点赞 ≥ 2000',a:50}]},
{id:5,title:'polo小球角色分享',gameId:5,badge:null,platforms:['xiaohongshu'],reward:10,maxReward:1000,pool:12000,submissions:7,deadline:'2026-06-20',productIntro:'休闲竞技小球对战游戏，角色造型可爱多样。适合在小红书分享角色外观和精彩对战瞬间。',
requirements:['视频时长≥10秒','需展示角色外观或对战画面','投稿内容必须为视频'],
tiers:[{t:'点赞 ≥ 50',a:5},{t:'点赞 ≥ 300',a:20},{t:'点赞 ≥ 1000',a:80}]}
];

const rankData=[
{name:'Nine9',avatar:'😎',reward:340,link:'https://www.douyin.com/video/example1'},
{name:'晓晓',avatar:'🎭',reward:205,link:'https://www.bilibili.com/video/example2'},
{name:'昼雨',avatar:'🌧',reward:110,link:'https://www.douyin.com/video/example3'}
];

const myPublished=[
{id:101,title:'我的世界建筑大赛',status:'审核中',statusColor:'#1890ff',gameId:7,reward:10,maxReward:1000,pool:20000,platforms:['bilibili','douyin'],deadline:'2026-07-01'},
{id:102,title:'蛋仔派对新皮肤推广',status:'进行中',statusColor:'#ff8c00',gameId:8,reward:5,maxReward:500,pool:10000,platforms:['douyin','kuaishou'],deadline:'2026-06-15'}
];
const myJoined=[
{taskId:1,status:'进行中',statusColor:'#ff8c00',note:'剩余48小时'},
{taskId:2,status:'审核中',statusColor:'#1890ff',note:''},
{taskId:3,status:'已结算',statusColor:'#52c41a',note:'+150盖世币'}
];
const earnRecords=[
{name:'中奖概率倍儿高 · 结算',time:'2026-05-23 14:30',amount:'+500',type:'income'},
{name:'发布任务「蛋仔派对」· 冻结预算',time:'2026-05-22 18:00',amount:'-10,000',type:'expense'},
{name:'充值',time:'2026-05-22 09:00',amount:'+10,000',type:'recharge'},
{name:'提现到支付宝',time:'2026-05-20 10:15',amount:'-3,650',type:'withdraw'},
{name:'凡人修仙模拟器 · 结算',time:'2026-05-18 16:42',amount:'+1,200',type:'income'},
{name:'发布任务「我的世界」· 冻结预算',time:'2026-05-16 11:00',amount:'-20,000',type:'expense'},
{name:'充值',time:'2026-05-15 08:30',amount:'+30,000',type:'recharge'},
{name:'233购物街推广 · 结算',time:'2026-05-15 09:20',amount:'+150',type:'income'},
{name:'测测你是热梗王 · 结算',time:'2026-05-10 11:33',amount:'+800',type:'income'}
];

let currentTask=null,currentMyTab='joined',currentEarnTab='all',editingTask=null;
function G(id){return games.find(g=>g.id===id)}

function renderTaskList(){
  document.getElementById('task-list').innerHTML=tasks.map(t=>{
    const g=G(t.gameId),pn=t.platforms.map(p=>platformMap[p]).join('/');
    return `<div class="task-card" onclick="openDetail(${t.id})"><div class="task-card-img" style="background:linear-gradient(135deg,${g.color},${g.color}cc)"><span style="font-size:36px">${g.icon}</span>${t.badge?`<div class="badge">${t.badge}</div>`:''}</div><div class="task-card-body"><div class="task-card-title">${t.title}</div><div class="task-card-info"><span class="task-card-meta">${pn}</span><span class="task-card-reward">${CI} 单价 ${t.reward}</span></div><div class="task-card-footer"><span>${t.submissions}个投稿</span><span style="color:#ff8c00;font-weight:600">奖池 ${CI}${t.pool.toLocaleString()}</span></div></div></div>`;
  }).join('');
}

function openDetail(id){
  currentTask=tasks.find(t=>t.id===id);const g=G(currentTask.gameId);
  const pn=currentTask.platforms.map(p=>platformMap[p]).join(' / ');
  document.getElementById('detail-content').innerHTML=`
<div class="detail-banner" style="background:linear-gradient(135deg,${g.color},${g.color}cc)"><span style="font-size:44px">${g.icon}</span><div class="game-name">${currentTask.title}</div></div>
<div class="section"><div class="detail-stats"><div class="detail-stat-item"><div class="num">${currentTask.submissions}</div><div class="label">已投稿</div></div><div class="detail-stat-item"><div class="num">${CI}${currentTask.reward}</div><div class="label">奖金单价</div></div><div class="detail-stat-item"><div class="num">${CI}${currentTask.pool.toLocaleString()}</div><div class="label">奖池剩余</div></div></div></div>
<div class="section"><div class="section-title">产品介绍</div><div style="font-size:13px;color:#666;line-height:1.8">${currentTask.productIntro||'暂无产品介绍'}</div></div>
<div class="section"><div class="section-title">投稿平台</div><div style="font-size:13px;color:#666">${pn}</div></div>
<div class="section"><div class="section-title">投稿要求</div><ul class="requirement-list">${currentTask.requirements.map(r=>`<li>${r}</li>`).join('')}</ul></div>
<div class="section"><div class="section-title">结算说明</div><div style="font-size:12px;color:#666;line-height:1.8">1. 审核通过后7个工作日内按点赞量发放奖励<br>2. 后续每隔固定周期统计新增点赞补发<br>3. 活动结束后发放最终统计奖励<br>4. 奖池不足时按交稿时间优先发放</div></div>
<div class="section"><div class="section-title">收入排行</div>${rankData.map((r,i)=>`<div class="rank-item"><div class="rank-num t${i+1}">${i+1}</div><div class="rank-avatar">${r.avatar}</div><div class="rank-info"><div class="rn">${r.name}</div><div class="rr">投稿奖励 ${CI}${r.reward}</div></div><div class="rank-view" onclick="event.stopPropagation();showToast('打开作品链接')">查看投稿 ›</div></div>`).join('')}</div>
<div style="height:70px"></div>`;
  const btn=document.getElementById('btn-claim');
  btn.textContent='上传参与作品';
  btn.onclick=()=>showView('submit');
  showView('detail');
}


function renderMyTasks(){
  const c=document.getElementById('my-task-content');
  if(currentMyTab==='joined'){
    c.innerHTML=myJoined.map(j=>{const t=tasks.find(x=>x.id===j.taskId),g=G(t.gameId);
      return `<div class="my-task-item" onclick="openDetail(${t.id})"><div class="thumb" style="background:${g.color}22">${g.icon}</div><div class="info"><div class="name">${t.title}</div><div class="meta" style="color:${j.statusColor}">${j.status}${j.note?' · '+j.note:''}</div></div></div>`;}).join('');
  } else {
    c.innerHTML=myPublished.map(p=>{const g=G(p.gameId);
      return `<div class="my-task-item"><div class="thumb" style="background:${g.color}22">${g.icon}</div><div class="info"><div class="name">${p.title}</div><div class="meta" style="color:${p.statusColor}">${p.status}</div></div><div class="actions"><span class="act-btn view" onclick="event.stopPropagation();showToast('查看任务详情')">查看</span><span class="act-btn edit" onclick="event.stopPropagation();editTask(${p.id})">编辑</span><span class="act-btn cancel" onclick="event.stopPropagation();cancelPublished('${p.title}')">取消</span></div></div>`;}).join('');
  }
}

function cancelPublished(name){showModal('取消任务',`确认取消「${name}」？\n已审核通过的视频正常结算，剩余预算退回余额。`,()=>showToast('任务已取消，预算已退回'))}

function editTask(id){
  editingTask=myPublished.find(p=>p.id===id);const g=G(editingTask.gameId);
  document.getElementById('create-title').textContent='编辑任务';
  renderCreateForm(editingTask);
  showView('create');
}

function renderEarnList(){
  const filtered=currentEarnTab==='all'?earnRecords:earnRecords.filter(r=>r.type===currentEarnTab);
  document.getElementById('earn-list').innerHTML=filtered.map(r=>{
    const isPos=r.amount.startsWith('+');
    return `<div class="earn-item"><div class="left"><div class="name">${r.name}</div><div class="time">${r.time}</div></div><div class="right ${isPos?'pos':'neg'}">${r.amount}</div></div>`;
  }).join('')||'<div style="text-align:center;padding:40px;color:#ccc">暂无记录</div>';
}

function renderRecharge(){
  const amounts=[1000,5000,10000,50000,100000,500000];
  document.getElementById('recharge-content').innerHTML=`
<div class="section"><div style="text-align:center;margin-bottom:16px"><div style="font-size:12px;color:#999">当前余额</div><div style="font-size:26px;font-weight:700;color:#ff8c00;margin-top:4px">${CI} 3,650 盖世币</div><div style="font-size:12px;color:#999;margin-top:4px">汇率：${CI}100 = ¥1</div></div>
<div class="section-title">选择充值金额</div>
<div class="recharge-grid">${amounts.map((a,i)=>`<div class="ra-item${i===1?' selected':''}" onclick="selectRA(this)"><div class="ra-coin">${a>=10000?(a/10000)+'万':a.toLocaleString()}</div><div class="ra-price">¥${(a/100).toFixed(0)}</div></div>`).join('')}</div>
<div style="margin-top:12px"><div class="form-label">自定义金额</div><input id="custom-amt" class="form-input" type="number" placeholder="输入盖世币数量（最低100）" oninput="calcCustom()"><div style="font-size:12px;color:#999;margin-top:4px">= ¥<span id="custom-price">0</span></div></div></div>
<div class="section"><div class="section-title">支付方式</div><div class="pay-method"><div class="pay-item selected" onclick="selectPay(this)"><div class="pay-icon">💚</div><div class="pay-name">微信支付</div><div class="pay-check">✓</div></div><div class="pay-item" onclick="selectPay(this)"><div class="pay-icon">🔵</div><div class="pay-name">支付宝</div><div class="pay-check"></div></div></div></div>
<div style="padding:0 16px"><div class="agree-row"><input type="checkbox" id="agree-check"><label for="agree-check">我已阅读并同意</label><a href="javascript:void(0)" onclick="showToast('查看充值协议')">《盖世币充值服务协议》</a></div><button class="btn-primary" id="recharge-btn" onclick="doRecharge()">确认充值</button></div>`;
}

function selectRA(el){document.querySelectorAll('.ra-item').forEach(i=>i.classList.remove('selected'));el.classList.add('selected');document.getElementById('custom-amt').value='';document.getElementById('custom-price').textContent='0'}
function selectPay(el){document.querySelectorAll('.pay-item').forEach(i=>{i.classList.remove('selected');i.querySelector('.pay-check').textContent=''});el.classList.add('selected');el.querySelector('.pay-check').textContent='✓'}
function calcCustom(){const v=parseInt(document.getElementById('custom-amt').value)||0;document.getElementById('custom-price').textContent=(v/100).toFixed(v%100?2:0)}
function doRecharge(){
  if(!document.getElementById('agree-check').checked){showToast('请先同意充值协议');return}
  const custom=parseInt(document.getElementById('custom-amt')?.value);
  if(custom&&custom<100){showToast('最低充值100盖世币');return}
  showToast('充值成功');setTimeout(()=>showView('earnings'),800);
}

function renderCreateForm(data){
  const isEdit=!!data;const g=isEdit?G(data.gameId):null;
  document.getElementById('create-content').innerHTML=`<div style="padding:16px">
<div class="form-group"><div class="form-label">任务名称 *</div><input class="form-input" id="cr-name" placeholder="输入任务名称" value="${isEdit?data.title:''}"></div>
<div class="form-group"><div class="form-label">推广游戏 *</div><div class="game-search"><input id="game-search-input" class="form-input" placeholder="搜索游戏名称" oninput="searchGame(this.value)" onfocus="searchGame(this.value)" ${isEdit?'disabled':''}><div class="game-results" id="game-results"></div></div><div id="selected-game-area">${isEdit?`<div class="selected-game"><div class="gi" style="background:${g.color}22">${g.icon}</div><div class="gn">${g.name}</div></div>`:''}</div>${isEdit?'<div class="form-tip">已发布任务不可修改推广游戏</div>':''}</div>
<div class="form-group"><div class="form-label">产品介绍（选填）</div><textarea class="form-input" style="height:70px;resize:vertical;padding:10px 12px;border:1px solid #e8e8e8;border-radius:10px" placeholder="简要介绍推广的游戏亮点，帮助创作者了解产品卖点">${isEdit?'':''}</textarea><div class="form-tip">填写后将展示在任务详情页，帮助创作者更好地理解游戏</div></div>
<div class="form-group"><div class="form-label">投稿平台（可多选，默认全部） *</div><div class="platform-multi" id="create-platforms"><div class="pm-item${!isEdit?' selected':''}" data-p="all" onclick="toggleCP(this)">全部</div><div class="pm-item${isEdit&&data.platforms.includes('douyin')?' selected':''}" data-p="douyin" onclick="toggleCP(this)">抖音</div><div class="pm-item${isEdit&&data.platforms.includes('bilibili')?' selected':''}" data-p="bilibili" onclick="toggleCP(this)">B站</div><div class="pm-item${isEdit&&data.platforms.includes('kuaishou')?' selected':''}" data-p="kuaishou" onclick="toggleCP(this)">快手</div><div class="pm-item${isEdit&&data.platforms.includes('xiaohongshu')?' selected':''}" data-p="xiaohongshu" onclick="toggleCP(this)">小红书</div></div></div>
<div class="form-group"><div class="form-label">任务目标 *</div><div style="font-size:14px;color:#333;padding:8px 0;font-weight:500">📊 点赞量</div></div>
<div class="form-row"><div class="form-group"><div class="form-label">奖金单价（${CI}盖世币） *</div><input class="form-input" id="cr-price" type="number" placeholder="如：10" value="${isEdit?data.reward:''}" oninput="calcMax()"></div><div class="form-group"><div class="form-label">单条奖金上限</div><input class="form-input" id="cr-max" type="number" readonly style="background:#f9f9f9" value="${isEdit?data.maxReward:''}"></div></div>
<div class="form-tip">单条上限 = 单价 × 100，且不低于 ${CI}500</div>
<div class="form-group" style="margin-top:12px"><div class="form-label">奖池预算（${CI}盖世币） *</div><input class="form-input" id="cr-pool" type="number" placeholder="如：50000" value="${isEdit?data.pool:''}"><div class="form-tip">提交后从余额冻结对应盖世币</div></div>
<div class="form-group"><div class="form-label">任务有效期 *</div><div class="form-row" style="gap:8px"><input class="form-input" type="date" value="2026-05-25" style="flex:1"><span style="line-height:44px;color:#999">至</span><input class="form-input" type="date" value="${isEdit?data.deadline:'2026-06-25'}" style="flex:1"></div></div>
<div style="padding:16px 0"><button class="btn-primary" onclick="submitCreate(${isEdit})">${isEdit?'保存修改':'提交审核（预计24小时内）'}</button></div></div>`;
  if(isEdit)selectedGameId=data.gameId;else selectedGameId=null;
}

let selectedGameId=null;
function searchGame(val){const r=document.getElementById('game-results');if(!val){r.classList.remove('show');return}const f=games.filter(g=>g.name.includes(val));if(!f.length){r.classList.remove('show');return}r.innerHTML=f.map(g=>`<div class="game-result-item" onclick="selectGame(${g.id})"><div class="gi" style="background:${g.color}22">${g.icon}</div><div class="gn">${g.name}</div></div>`).join('');r.classList.add('show')}
function selectGame(id){selectedGameId=id;const g=G(id);document.getElementById('game-results').classList.remove('show');document.getElementById('game-search-input').value='';document.getElementById('selected-game-area').innerHTML=`<div class="selected-game"><div class="gi" style="background:${g.color}22">${g.icon}</div><div class="gn">${g.name}</div><span class="remove" onclick="removeGame()">✕</span></div>`}
function removeGame(){selectedGameId=null;document.getElementById('selected-game-area').innerHTML=''}
function toggleCP(el){const p=el.dataset.p;if(p==='all'){document.querySelectorAll('#create-platforms .pm-item').forEach(i=>i.classList.remove('selected'));el.classList.add('selected')}else{document.querySelector('#create-platforms [data-p="all"]').classList.remove('selected');el.classList.toggle('selected');if(!document.querySelectorAll('#create-platforms .pm-item.selected:not([data-p="all"])').length)document.querySelector('#create-platforms [data-p="all"]').classList.add('selected')}}
function calcMax(){const p=parseInt(document.getElementById('cr-price').value)||0;document.getElementById('cr-max').value=p>0?Math.max(p*100,500):''}
function submitCreate(isEdit){
  const name=document.getElementById('cr-name').value.trim();
  if(!name){showToast('请输入任务名称');return}
  if(!selectedGameId){showToast('请选择推广游戏');return}
  if(!(parseInt(document.getElementById('cr-price').value)>0)){showToast('请输入奖金单价');return}
  if(!(parseInt(document.getElementById('cr-pool').value)>0)){showToast('请输入奖池预算');return}
  showToast(isEdit?'修改已保存':'任务已提交审核，预计24小时内反馈');
  editingTask=null;document.getElementById('create-title').textContent='创建发行任务';
  setTimeout(()=>showView('mytask'),1000);
}

function submitVideo(){const l=document.getElementById('video-link').value.trim();if(!l){showToast('请粘贴视频链接');return}if(!l.startsWith('http')){showToast('链接格式不正确');return}showToast('提交成功，等待审核');document.getElementById('video-link').value='';setTimeout(()=>showView('mytask'),1000)}
function handleWithdraw(){showModal('确认提现','提现金额: ¥36.50\n到账方式: 支付宝\n预计1-3个工作日到账\n\n满1000盖世币（¥10）可提现\n单月累计≥¥800将代扣20%个税',()=>showToast('提现申请已提交'))}
function showRules(){showView('rules')}

function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const v=document.getElementById('view-'+name);if(v)v.classList.add('active');
  if(name==='mytask')renderMyTasks();
  if(name==='earnings')renderEarnList();
  if(name==='recharge')renderRecharge();
  if(name==='create'&&!editingTask){document.getElementById('create-title').textContent='创建发行任务';renderCreateForm(null)}
}
function switchNav(el,view){document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));el.classList.add('active');showView(view)}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2000)}
function showModal(title,content,onConfirm){document.getElementById('modal-title').textContent=title;document.getElementById('modal-content').textContent=content;document.getElementById('modal-confirm').onclick=()=>{closeModal();onConfirm()};document.getElementById('modal').classList.add('show')}
function closeModal(){document.getElementById('modal').classList.remove('show')}

document.addEventListener('click',e=>{const gr=document.getElementById('game-results');if(gr&&!e.target.closest('.game-search'))gr.classList.remove('show')});
document.querySelectorAll('.my-tab').forEach(tab=>tab.addEventListener('click',function(){document.querySelectorAll('.my-tab').forEach(t=>t.classList.remove('active'));this.classList.add('active');currentMyTab=this.dataset.t;renderMyTasks()}));
document.querySelectorAll('.earn-tab').forEach(tab=>tab.addEventListener('click',function(){document.querySelectorAll('.earn-tab').forEach(t=>t.classList.remove('active'));this.classList.add('active');currentEarnTab=this.dataset.et;renderEarnList()}));
document.querySelectorAll('#submit-platforms .pm-item').forEach(item=>item.addEventListener('click',function(){document.querySelectorAll('#submit-platforms .pm-item').forEach(i=>i.classList.remove('selected'));this.classList.add('selected')}));

renderTaskList();

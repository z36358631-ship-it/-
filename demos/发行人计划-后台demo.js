const tasks=[
{id:'TASK001',title:'中奖概率倍儿高啊啊',game:'转盘小游戏',type:'official',status:'进行中',platforms:'抖音/B站',reward:10,maxReward:1000,pool:87100,poolTotal:100000,submissions:51,claimed:68,deadline:'2026-06-15',created:'2026-05-10'},
{id:'TASK002',title:'凡人修仙模拟器宣传',game:'凡人修仙模拟器',type:'personal',status:'进行中',platforms:'B站',reward:10,maxReward:1000,pool:48830,poolTotal:50000,submissions:11,claimed:23,deadline:'2026-06-10',created:'2026-05-12'},
{id:'TASK003',title:'233购物街可摆摊收打赏啦',game:'233购物街',type:'official',status:'进行中',platforms:'抖音/快手/小红书',reward:5,maxReward:500,pool:3625,poolTotal:5000,submissions:7,claimed:12,deadline:'2026-06-01',created:'2026-05-08'},
{id:'TASK004',title:'测测你是热梗王吗推广',game:'热梗王',type:'personal',status:'进行中',platforms:'全部',reward:5,maxReward:500,pool:3455,poolTotal:5000,submissions:7,claimed:15,deadline:'2026-06-08',created:'2026-05-14'},
{id:'TASK005',title:'polo小球角色分享',game:'polo小球',type:'personal',status:'已结束',platforms:'小红书',reward:10,maxReward:1000,pool:0,poolTotal:12000,submissions:24,claimed:35,deadline:'2026-05-20',created:'2026-05-01'},
];

const auditTasks=[
{id:'AT001',title:'我的世界建筑大赛',game:'我的世界',publisher:'张三(u10086)',submitTime:'2026-05-24 18:30',reward:10,pool:20000,platforms:'B站/抖音'},
{id:'AT002',title:'蛋仔派对新皮肤推广',game:'蛋仔派对',publisher:'王五(u20088)',submitTime:'2026-05-25 09:15',reward:5,pool:10000,platforms:'抖音/快手'},
];

const auditVideos=[
{id:'AV001',task:'中奖概率倍儿高啊啊',creator:'小明(u30001)',platform:'抖音',link:'https://www.douyin.com/video/7382xxx',submitTime:'2026-05-24 14:20',status:'待审核'},
{id:'AV002',task:'中奖概率倍儿高啊啊',creator:'阿花(u30055)',platform:'B站',link:'https://www.bilibili.com/video/BV1xxx',submitTime:'2026-05-24 16:45',status:'待审核'},
{id:'AV003',task:'凡人修仙模拟器宣传',creator:'老王(u30102)',platform:'B站',link:'https://www.bilibili.com/video/BV2xxx',submitTime:'2026-05-25 10:30',status:'待审核'},
{id:'AV004',task:'233购物街推广',creator:'Nine9(u30200)',platform:'快手',link:'https://www.kuaishou.com/short-video/3xxx',submitTime:'2026-05-23 20:10',status:'已通过'},
{id:'AV005',task:'测测你是热梗王吗',creator:'昼雨(u30301)',platform:'抖音',link:'https://www.douyin.com/video/7399xxx',submitTime:'2026-05-22 11:00',status:'已驳回'},
];

const settlements=[
{id:'ST001',task:'233购物街推广',creator:'Nine9(u30200)',video:'https://www.kuaishou.com/short-video/3xxx',likes:1580,reward:30,status:'已结算',time:'2026-05-23'},
{id:'ST002',task:'测测你是热梗王吗',creator:'晓晓(u30150)',video:'https://www.douyin.com/video/73xx',likes:3200,reward:50,status:'已结算',time:'2026-05-22'},
{id:'ST003',task:'中奖概率倍儿高啊啊',creator:'Nine9(u30200)',video:'https://www.douyin.com/video/74xx',likes:5800,reward:200,status:'已结算',time:'2026-05-21'},
{id:'ST004',task:'中奖概率倍儿高啊啊',creator:'小明(u30001)',video:'https://www.douyin.com/video/75xx',likes:12000,reward:200,status:'待结算',time:'2026-05-25'},
];

const riskItems=[
{id:'R001',creator:'黑号001(u99001)',task:'中奖概率倍儿高啊啊',video:'https://www.douyin.com/video/fake1',likes:15000,comments:3,likeRate:'0.02%',type:'疑似刷量',status:'待处理'},
{id:'R002',creator:'小号A(u99010)',task:'凡人修仙模拟器宣传',video:'https://www.bilibili.com/video/fake2',likes:8000,comments:5,likeRate:'0.06%',type:'关联账号',status:'待处理'},
{id:'R003',creator:'测试号(u99020)',task:'233购物街推广',video:'https://www.kuaishou.com/fake3',likes:0,comments:0,likeRate:'-',type:'视频不可访问',status:'已处理'},
];

const pageTitles={dashboard:'数据看板',tasks:'任务管理','audit-task':'任务审核','audit-video':'视频审核',settlement:'结算管理',risk:'风控中心','creator-audit':'创作者审核'};

function switchPage(name){
  document.querySelectorAll('.menu-item').forEach(m=>m.classList.remove('active'));
  event.currentTarget.classList.add('active');
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
    case 'risk':c.innerHTML=renderRisk();break;
    case 'creator-audit':c.innerHTML=renderCreatorAudit();break;
  }
}

function renderDashboard(){
  return `<div class="stats-grid">
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
${tasks.map(t=>`<tr><td>${t.id}</td><td>${t.title}</td><td>${t.game}</td><td><span class="tag ${t.type==='official'?'tag-orange':'tag-blue'}">${t.type==='official'?'官方':'个人'}</span></td><td><span class="tag ${t.status==='进行中'?'tag-green':'tag-gray'}">${t.status}</span></td><td>${t.platforms}</td><td>${t.reward}</td><td>${t.pool.toLocaleString()}/${t.poolTotal.toLocaleString()}</td><td>${t.claimed}/${t.submissions}</td><td>${t.deadline}</td><td><button class="btn btn-sm" onclick="showToast('查看详情')">详情</button> ${t.status==='进行中'?`<button class="btn btn-sm btn-danger" onclick="confirmAction('确认终止任务「${t.title}」？已结算部分不退。',()=>showToast('任务已终止'))">终止</button>`:''}</td></tr>`).join('')}
</table></div>`;
}

function renderAuditTasks(){
  return `<div class="card"><div class="card-title">待审核任务（个人发布）<span style="font-size:12px;color:#999;margin-left:8px">承诺24小时内完成审核</span></div>
${auditTasks.length?`<table><tr><th>ID</th><th>任务名称</th><th>游戏</th><th>发布者</th><th>平台</th><th>单价</th><th>预算</th><th>提交时间</th><th>操作</th></tr>
${auditTasks.map(t=>`<tr><td>${t.id}</td><td>${t.title}</td><td>${t.game}</td><td>${t.publisher}</td><td>${t.platforms}</td><td>${t.reward}</td><td>${t.pool.toLocaleString()}</td><td>${t.submitTime}</td><td><button class="btn btn-sm btn-success" onclick="confirmAction('确认通过「${t.title}」？通过后将直接上架。',()=>showToast('已通过，任务已上架'))">通过</button> <button class="btn btn-sm btn-danger" onclick="openRejectModal('${t.title}')">驳回</button></td></tr>`).join('')}
</table>`:'<div class="empty">暂无待审核任务</div>'}</div>`;
}

function renderAuditVideos(){
  return `<div class="card"><div class="card-title">视频审核队列</div>
<div class="filter-bar"><select><option value="">全部状态</option><option>待审核</option><option>已通过</option><option>已驳回</option></select><input placeholder="搜索创作者"><button class="btn" onclick="showToast('查询成功')">查询</button></div>
<table><tr><th>ID</th><th>关联任务</th><th>创作者</th><th>平台</th><th>视频链接</th><th>提交时间</th><th>状态</th><th>操作</th></tr>
${auditVideos.map(v=>`<tr><td>${v.id}</td><td>${v.task}</td><td>${v.creator}</td><td>${v.platform}</td><td><a href="${v.link}" target="_blank" style="color:#1890ff;font-size:12px">查看视频 ↗</a></td><td>${v.submitTime}</td><td><span class="tag ${v.status==='待审核'?'tag-orange':v.status==='已通过'?'tag-green':'tag-red'}">${v.status}</span></td><td>${v.status==='待审核'?`<button class="btn btn-sm btn-success" onclick="confirmAction('确认通过该视频？',()=>showToast('已通过'))">通过</button> <button class="btn btn-sm btn-danger" onclick="openRejectModal('视频 ${v.id}')">驳回</button>`:'—'}</td></tr>`).join('')}
</table></div>`;
}

function renderSettlement(){
  return `<div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
<div class="stat-card"><div class="sc-num">480</div><div class="sc-label">已结算盖世币</div></div>
<div class="stat-card"><div class="sc-num">200</div><div class="sc-label">待结算盖世币</div></div>
<div class="stat-card"><div class="sc-num">4</div><div class="sc-label">结算记录数</div></div>
</div>
<div class="card"><div class="card-title">结算记录</div>
<div class="filter-bar"><select><option value="">全部状态</option><option>已结算</option><option>待结算</option></select><input placeholder="搜索创作者"><button class="btn" onclick="showToast('查询成功')">查询</button><button class="btn" style="margin-left:auto">导出CSV</button></div>
<table><tr><th>ID</th><th>关联任务</th><th>创作者</th><th>视频链接</th><th>点赞量</th><th>结算盖世币</th><th>状态</th><th>结算时间</th><th>操作</th></tr>
${settlements.map(s=>`<tr><td>${s.id}</td><td>${s.task}</td><td>${s.creator}</td><td><a href="${s.video}" target="_blank" style="color:#1890ff;font-size:12px">查看 ↗</a></td><td>${s.likes.toLocaleString()}</td><td style="color:#ff8c00;font-weight:600">${s.reward}</td><td><span class="tag ${s.status==='已结算'?'tag-green':'tag-orange'}">${s.status}</span></td><td>${s.time}</td><td>${s.status==='待结算'?`<button class="btn btn-sm btn-primary" onclick="confirmAction('确认执行结算？将向创作者发放 ${s.reward} 盖世币。',()=>showToast('结算完成'))">执行结算</button>`:'—'}</td></tr>`).join('')}
</table></div>`;
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
<tr><td>视频不可访问</td><td>结算时视频链接返回404或私密</td><td>该条按0结算，通知创作者</td></tr>
<tr><td>重复视频</td><td>同一视频链接被不同用户提交</td><td>仅最早提交者有效，后续驳回</td></tr>
</table></div>`;
}

function openCreateTask(){
  document.getElementById('modal-box').innerHTML=`
<div class="modal-header"><span>创建官方任务</span><span class="modal-close" onclick="closeModal()">✕</span></div>
<div class="form-row"><label>任务名称</label><input placeholder="输入任务名称"></div>
<div class="form-row"><label>推广游戏</label><select><option value="">选择游戏</option><option>转盘小游戏</option><option>凡人修仙模拟器</option><option>233购物街</option><option>热梗王</option><option>polo小球</option><option>我的世界</option><option>蛋仔派对</option></select></div>
<div class="form-row"><label>投稿平台</label><select multiple style="height:80px"><option selected>抖音</option><option selected>B站</option><option>快手</option><option>小红书</option></select></div>
<div class="form-row"><label>奖金单价（盖世币）</label><input type="number" value="10"></div>
<div class="form-row"><label>单条奖金上限（盖世币）- 自动计算: 单价×100且≥500</label><input type="number" value="1000" readonly style="background:#f5f5f5"></div>
<div class="form-row"><label>奖池预算（盖世币）</label><input type="number" placeholder="如：100000"></div>
<div class="form-row"><label>任务有效期</label><div style="display:flex;gap:8px"><input type="date" value="2026-05-25" style="flex:1"><span style="line-height:36px">至</span><input type="date" value="2026-06-25" style="flex:1"></div></div>
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
  {id:'CA001',uid:'u10086',name:'张三',avatar:'ZS',applyTime:'2026-05-24 14:30',direction:'游戏攻略',desc:'B站游戏区UP主，粉丝2.3万，专注RPG攻略制作3年。',platform:'https://space.bilibili.com/12345',posts:56,fans:2300,likes:8900,status:'待审核'},
  {id:'CA002',uid:'u20088',name:'王五',avatar:'WW',applyTime:'2026-05-25 09:15',direction:'配置分享',desc:'盖世社区配置帖达人，发布过30+篇配置方案，帮助500+用户成功启动游戏。',platform:'',posts:34,fans:890,likes:4500,status:'待审核'},
  {id:'CA003',uid:'u30055',name:'阿花',avatar:'AH',applyTime:'2026-05-23 18:00',direction:'视频实况',desc:'抖音游戏主播，日均直播4小时，擅长FPS和动作类游戏。',platform:'https://www.douyin.com/user/xxx',posts:12,fans:560,likes:2100,status:'待审核'},
  {id:'CA004',uid:'u30102',name:'老王',avatar:'LW',applyTime:'2026-05-22 10:20',direction:'游戏评测',desc:'从业5年的游戏媒体人，Steam库500+游戏。',platform:'https://space.bilibili.com/67890',posts:89,fans:12000,likes:45000,status:'已通过'},
  {id:'CA005',uid:'u30200',name:'Nine9',avatar:'N9',applyTime:'2026-05-21 16:40',direction:'MOD制作',desc:'资深MOD制作者，作品累计下载10万+。',platform:'https://www.nexusmods.com/users/xxx',posts:23,fans:3400,likes:15600,status:'已通过'},
  {id:'CA006',uid:'u99001',name:'黑号测试',avatar:'HH',applyTime:'2026-05-20 08:00',direction:'游戏攻略',desc:'测试账号。',platform:'',posts:1,fans:0,likes:0,status:'已驳回'},
];

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
        <th>申请ID</th><th>用户信息</th><th>创作方向</th><th>社区数据</th><th>申请时间</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>`;

  creatorApps.forEach(a=>{
    const statusTag=a.status==='待审核'?'tag-orange':a.status==='已通过'?'tag-green':'tag-red';
    html+=`<tr>
      <td>${a.id}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${a.avatar}" style="width:32px;height:32px;border-radius:50%;">
          <div><div style="font-weight:500;">${a.name}</div><div style="font-size:11px;color:#999;">${a.uid}</div></div>
        </div>
      </td>
      <td><span class="tag tag-blue">${a.direction}</span></td>
      <td>
        <div style="font-size:12px;line-height:1.6;">
          发布 <b>${a.posts}</b> 篇 · 粉丝 <b>${a.fans>=1000?(a.fans/1000).toFixed(1)+'k':a.fans}</b> · 获赞 <b>${a.likes>=1000?(a.likes/1000).toFixed(1)+'k':a.likes}</b>
        </div>
      </td>
      <td style="font-size:12px;">${a.applyTime}</td>
      <td><span class="tag ${statusTag}">${a.status}</span></td>
      <td>
        ${a.status==='待审核'?`
          <button class="btn btn-success btn-sm" onclick="auditCreator('${a.id}','pass')">通过</button>
          <button class="btn btn-danger btn-sm" onclick="auditCreator('${a.id}','reject')">驳回</button>
          <button class="btn btn-sm" onclick="viewCreatorDetail('${a.id}')">详情</button>
        `:a.status==='已通过'?`
          <button class="btn btn-sm" onclick="viewCreatorDetail('${a.id}')">详情</button>
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
    a.status='已通过';
    showToast('已通过 '+a.name+' 的创作者认证申请，身份标签已下发');
  } else if(action==='reject'){
    a.status='已驳回';
    showToast('已驳回 '+a.name+' 的申请');
  } else if(action==='revoke'){
    a.status='已驳回';
    showToast('已撤销 '+a.name+' 的创作者身份');
  }
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
      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${a.avatar}" style="width:48px;height:48px;border-radius:50%;">
      <div>
        <div style="font-size:16px;font-weight:bold;">${a.name}</div>
        <div style="font-size:12px;color:#999;">${a.uid} · 申请时间：${a.applyTime}</div>
      </div>
      <span class="tag ${a.status==='待审核'?'tag-orange':a.status==='已通过'?'tag-green':'tag-red'}" style="margin-left:auto;">${a.status}</span>
    </div>
    <table style="margin-bottom:16px;">
      <tr><td style="color:#999;width:100px;">创作方向</td><td><span class="tag tag-blue">${a.direction}</span></td></tr>
      <tr><td style="color:#999;">个人简介</td><td>${a.desc}</td></tr>
      <tr><td style="color:#999;">其他平台</td><td>${a.platform?'<a href="'+a.platform+'" target="_blank" style="color:#1890ff;">'+a.platform+'</a>':'未填写'}</td></tr>
      <tr><td style="color:#999;">发布动态数</td><td><b>${a.posts}</b> 篇</td></tr>
      <tr><td style="color:#999;">粉丝数</td><td><b>${a.fans}</b></td></tr>
      <tr><td style="color:#999;">获赞数</td><td><b>${a.likes}</b></td></tr>
    </table>
    ${a.status==='待审核'?`
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn btn-danger" onclick="closeModal();auditCreator('${a.id}','reject')">驳回申请</button>
      <button class="btn btn-primary" onclick="closeModal();auditCreator('${a.id}','pass')">通过认证</button>
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

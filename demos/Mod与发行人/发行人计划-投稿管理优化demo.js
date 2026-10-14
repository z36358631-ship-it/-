// 现行人工审核、截止点赞录入的本地演示。任务名与昵称是示例，不连接真实后台。
const tasks=[
  {id:'1046',name:'游戏推广任务1046（示例）',status:'进行中',statsAt:'2026-10-28 17:20:17'},
  {id:'1033',name:'游戏推广任务1033（示例）',status:'待结算',statsAt:'2026-10-12 18:00:00'},
  {id:'1045',name:'游戏推广任务1045（示例）',status:'已结算',statsAt:'2026-10-11 18:00:00'},
  {id:'1044',name:'游戏推广任务1044（示例）',status:'待结算',statsAt:'2026-10-12 18:00:00'},
  {id:'1040',name:'游戏推广任务1040（示例）',status:'进行中',statsAt:'2026-10-28 18:00:00'},
  {id:'1042',name:'游戏推广任务1042（示例）',status:'进行中',statsAt:'2026-10-12 18:00:00'},
  {id:'1041',name:'游戏推广任务1041（示例）',status:'进行中',statsAt:'2026-10-12 18:00:00'},
  {id:'998',name:'游戏推广任务998（示例）',status:'待结算',statsAt:'2026-10-12 18:00:00'}
];
const submissions=[
  ['735','1046','10006927','昵称示例A','douyin','合格',0,200,null,4],
  ['734','1033','10000528','昵称示例B','douyin','待人工审核',0,0,null,1],
  ['733','1045','10000528','昵称示例B','douyin','已结算',0,0,0,3],
  ['732','1045','10000994','昵称示例C','bilibili','已结算',1000,0,1000,3],
  ['731','1044','10002301','昵称示例D','bilibili','合格',0,5000,null,2],
  ['730','1040','10002301','昵称示例D','bilibili','合格',0,5000,null,2],
  ['729','1042','10006927','昵称示例A','kuaishou','驳回',0,0,null,2],
  ['728','1041','10006927','昵称示例A','bilibili','驳回',0,0,null,2],
  ['727','998','10002301','昵称示例D','bilibili','合格',0,1000,null,2]
].map(([id,taskId,uid,nickname,platform,status,reward,reserved,likes,version])=>({
  id,taskId,uid,nickname,platform,status,reward,reserved,likes,version,mode:'manual-likes-v1',
  contentId:'url:e54ec35180baafdf2935858220d831581e44b73feda506edd68fbca8973f573f',
  link:'https://github.com/gamesir123/GameHubKMP/issues/3138',title:null,taskVersion:1,
  requirements:'+95+95+9+6+62',recordedAt:null,basis:'1212',likesBasis:'',history:[],
  initialHistory:id==='735'?'#58 版本 4：通过，1212\n操作人 UID：1000233；待人工审核 → 合格；时间：2026/10/13 17:23:52（北京时间）\n\n#57 版本 2：驳回，1212\n操作人 UID：1000233；待人工审核 → 驳回；时间：2026/10/13 17:23:08（北京时间）':null
}));
const operatorUID='1000233';
let hasLikesPermission=true;
let hasReviewPermission=true;
const reviewObjectIds=new Set(submissions.map(v=>v.id));
let canReviewAll=true;
// 金额均为演示配置；真实值必须取现行任务预算与计奖配置。
tasks.forEach(t=>{t.singleCap=({1046:200,1033:2000,1045:1000,1044:5000,1040:5000,1042:1000,1041:1000,998:1000})[t.id];t.budgetRemaining=20000;});
// 日期仅演示任务配置，不能由点赞截止时点反推真实任务时间。
tasks.forEach(t=>{t.startsAt='2026-10-01 10:00:00';t.endsAt=t.id==='1046'||t.id==='1040'?'2026-10-28 17:00:00':'2026-10-12 17:00:00';});
let filter={uid:'',taskId:'',platform:'',status:''};
let preview=null,feedback=null,activeSubmissionId=null,activeModal=null,uploadGeneration=0;
let screen='list',importContext=null,pasteDraft='',fileName='';
const selectedIds=new Set(),linkResults=new Map();
const importAudit=[];
const operationAudit=[];
let operationSequence=0;
function nextOperationRequest(){return 'demo-request-'+(++operationSequence);}
function recordOperation(data){
  const record={id:'DEMO-'+(operationAudit.length+1),requestId:nextOperationRequest(),at:nowBeijing(),operator:operatorUID,operatorName:'郑群超',module:'投稿管理',type:'',objectType:'投稿',objectName:'',detail:'',requestPath:'/demo/submission/update',region:'国内',result:'成功',failureReason:'',before:null,after:null,delta:null,objectIds:[],taskIds:[],transactionId:'',businessReference:'',source:'',consumptionAmount:null,isExample:false,...data};
  const old=operationAudit.find(v=>v.requestId===record.requestId||(record.type==='盖世币消耗'&&record.transactionId&&v.type==='盖世币消耗'&&v.transactionId===record.transactionId));
  if(old&&record.type!=='盖世币消耗')return old;
  if(record.type==='盖世币消耗'){
    const confirmed=record.result==='成功'&&Number.isSafeInteger(record.consumptionAmount)&&record.consumptionAmount>0&&Number.isSafeInteger(record.before)&&Number.isSafeInteger(record.after)&&record.before>=record.consumptionAmount&&record.after>=0&&record.before-record.after===record.consumptionAmount&&!!record.transactionId;
    if(!confirmed){if(record.result==='成功'){record.result='待核对';record.failureReason='缺少已成功扣币的完整流水，不能确认实际消耗。';}record.consumptionAmount=null;record.before=null;record.after=null;record.delta=null;record.detail=(record.isExample?'只读示例：':'')+'盖世币消耗'+record.result+'；实际扣币数与前后余额未确认';}
    else{record.delta=-record.consumptionAmount;record.detail=(record.isExample?'只读示例：':'')+'成功消耗 '+record.consumptionAmount+' 盖世币；余额 '+record.before+' → '+record.after+'；对象 '+operationObjectText(record)+'；流水 '+record.transactionId+(record.businessReference?'；关联 '+record.businessReference:'');}
  }
  // 消费核对只更新原待核对记录；已确认成功不会被重复或迟到结果覆盖。
  if(old){if(old.type==='盖世币消耗'&&old.result==='待核对'&&record.result==='成功')Object.assign(old,record,{id:old.id,requestId:old.requestId});return old;}
  operationAudit.push(record);return record;
}
// 仅展示消费流水结构；不调用扣币接口，也不修改马甲号余额、稿件或任务预算。
recordOperation({requestId:'demo-readonly-consumption-request-001',at:'2026-10-14 15:20:00',module:'钱包审计',type:'盖世币消耗',objectType:'示例钱包',objectName:'只读消费样例',objectIds:['DEMO-WALLET-001'],taskIds:['1033'],transactionId:'DEMO-CONSUMPTION-001',businessReference:'任务 1033 / DEMO-BUSINESS-001（示例关联）',source:'只读示例流水；真实消费模块未接入',consumptionAmount:200,before:1200,after:1000,isExample:true,requestPath:'/demo/readonly/consumption'});
const pendingRequests=new Map();
const csvHeaders=['投稿ID','任务ID','任务名称','投稿人UID','投稿人昵称','平台','内容ID','视频链接','点赞数','任务开始时间','任务结束时间'];
const banner='作品仍须人工审核：通过只预留预算，不立即发奖。按赞模式由运营确认截止点赞后统一结算；旧固定奖励模式单独保留。平台数据不自动抓取。';
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function taskFor(item){return tasks.find(t=>t.id===item.taskId);}
function nowBeijing(){return new Date(Date.now()+8*3600000).toISOString().slice(0,19).replace('T',' ');}
function eligibility(item){
  const task=taskFor(item);
  if(!hasLikesPermission)return '无点赞录入权限';
  if(item.mode!=='manual-likes-v1')return '固定奖励模式不支持录入截止点赞';
  if(item.status==='已结算')return '已结算，不可修改';
  if(item.status!=='合格')return '投稿尚未合格或已驳回';
  if(!task||!['进行中','待结算'].includes(task.status))return '任务状态不允许录入';
  if(!task.statsAt)return '未配置统计时点';
  if(nowBeijing()<task.statsAt)return '尚未到点赞截止';
  return '';
}
function tag(status){return `<span class="status-tag ${status==='合格'?'approved':status==='待人工审核'?'pending':status==='已结算'?'settled':'rejected'}">${escapeHtml(status)}</span>`;}
function alertBox(text,type=''){return `<div class="alert ${type}" role="status"><span class="alert-icon">i</span><span>${escapeHtml(text)}</span></div>`;}

function visibleRows(){return submissions.filter(v=>(!filter.uid||v.uid===filter.uid)&&(!filter.taskId||v.taskId===filter.taskId)&&(!filter.platform||v.platform===filter.platform)&&(!filter.status||v.status===filter.status));}
function selectedRows(){return submissions.filter(v=>selectedIds.has(v.id));}
function selectionTask(){const ids=[...new Set(selectedRows().map(v=>v.taskId))];return ids.length===1?tasks.find(t=>t.id===ids[0]):null;}
function operationTask(){return selectedIds.size?selectionTask():tasks.find(t=>t.id===filter.taskId);}
function toggleRow(id,checked){checked?selectedIds.add(id):selectedIds.delete(id);render();}
function toggleAll(checked){visibleRows().forEach(v=>checked?selectedIds.add(v.id):selectedIds.delete(v.id));render();}
function switchPage(next){closeDrawer();screen=next;uploadGeneration++;preview=null;importContext=null;feedback=null;render();}
function updatePageNavigation(){const active=screen==='import'?'list':screen;for(const [id,target] of [['submission-tab','list'],['vest-tab','vest'],['operation-tab','vest-log']]){const el=document.getElementById(id);if(el){el.classList.toggle('selected',active===target);el.setAttribute('aria-selected',String(active===target));}}for(const [id,target] of [['submission-menu','list'],['vest-menu','vest'],['operation-menu','vest-log']]){const el=document.getElementById(id);if(el){el.classList.toggle('selected',active===target);active===target?el.setAttribute('aria-current','page'):el.removeAttribute('aria-current');}}}
function render(){
  updatePageNavigation();
  if(screen==='vest'){renderVestPage();return;}
  if(screen==='vest-log'){renderVestAudit();return;}
  if(screen==='import'){renderImportPage();return;}
  const task=tasks.find(t=>t.id===filter.taskId),opTask=operationTask(),rows=visibleRows();
  const count=selectedIds.size||(opTask?submissions.filter(v=>v.taskId===opTask.id).length:0);
  document.getElementById('content').innerHTML='<div class="panel-head"><h1>'+ (task?'任务投稿 · '+escapeHtml(task.name):'投稿管理')+'</h1><button onclick="refreshList()">刷新</button></div><div class="panel-body">'+alertBox(banner)+
  '<div class="filter-row"><div class="filter-field uid"><label for="uid-filter">投稿人 UID</label><input id="uid-filter" value="'+escapeHtml(filter.uid)+'"></div><div class="filter-field task"><label for="task-filter">任务 ID</label><input id="task-filter" value="'+escapeHtml(filter.taskId)+'" list="task-options" placeholder="输入或选择任务 ID"><datalist id="task-options">'+tasks.map(t=>'<option value="'+t.id+'">'+escapeHtml(t.name)+'</option>').join('')+'</datalist></div><div class="filter-field inline"><label for="platform-filter">平台</label><select id="platform-filter"><option value="">全部</option>'+['douyin','bilibili','kuaishou','xiaohongshu'].map(p=>'<option '+(filter.platform===p?'selected':'')+'>'+p+'</option>').join('')+'</select></div><div class="filter-field inline"><label for="status-filter">状态</label><select id="status-filter"><option value="">全部</option>'+['待人工审核','合格','驳回','已结算'].map(s=>'<option '+(filter.status===s?'selected':'')+'>'+s+'</option>').join('')+'</select></div><button class="primary" onclick="queryList()">查询投稿</button></div>'+
  '<div class="batch-actions"><div><span class="batch-title">'+(opTask?escapeHtml(opTask.id+' · '+opTask.name):'稿件操作')+'</span><span class="batch-caption">已选 '+selectedIds.size+' 条'+'</span></div><div class="actions"><button id="export-button" '+(!selectedIds.size&&!opTask?'disabled':'')+' onclick="exportTask()">导出'+(selectedIds.size?'选中 '+count:'全部 '+count)+' 条</button><button id="import-button" class="primary" onclick="openImport()">导入点赞</button><button id="approve-button" class="primary" '+(!selectedIds.size?'disabled':'')+' onclick="openApprove([...selectedIds])">批量通过'+(selectedIds.size?' '+selectedIds.size+' 条':'')+'</button><button id="reject-button" class="danger" '+(!selectedIds.size?'disabled':'')+' onclick="openReject([...selectedIds])">批量驳回'+(selectedIds.size?' '+selectedIds.size+' 条':'')+'</button></div><div class="batch-note">勾选用于导出、批量通过与批量驳回。导入无需勾选，按文件或粘贴内容匹配稿件。</div></div>'+(feedback?alertBox(feedback.text,feedback.error?'error':'success'):'')+
  '<div class="table-wrap"><table class="data-table" id="submission-table"><colgroup>'+[48,82,82,195,110,120,100,250,260,155,75,110,130].map(w=>'<col style="width:'+w+'px">').join('')+'</colgroup><thead><tr><th><input id="select-all" type="checkbox" aria-label="全选当前结果" '+(rows.length&&rows.every(v=>selectedIds.has(v.id))?'checked':'')+' onchange="toggleAll(this.checked)"></th>'+['投稿 ID','任务 ID','任务名称','投稿人 UID','投稿人昵称','平台','内容 ID','视频链接','奖励金额（盖世币）','预留','状态','操作'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(v=>'<tr><td><input type="checkbox" aria-label="勾选投稿 '+v.id+'" '+(selectedIds.has(v.id)?'checked':'')+' onchange="toggleRow(\''+v.id+'\',this.checked)"></td><td>'+v.id+'</td><td><button class="link-button" onclick="openTask(\''+v.taskId+'\')">'+v.taskId+'</button></td><td><span class="ellipsis" title="'+escapeHtml(taskFor(v).name)+'">'+escapeHtml(taskFor(v).name)+'</span></td><td>'+v.uid+'</td><td>'+escapeHtml(v.nickname)+'</td><td>'+v.platform+'</td><td><span class="ellipsis" title="'+escapeHtml(v.contentId)+'">'+escapeHtml(v.contentId)+'</span></td><td><span class="ellipsis" title="'+escapeHtml(v.link)+'">'+escapeHtml(v.link||'—')+'</span></td><td>'+v.reward+'</td><td>'+v.reserved+'</td><td>'+tag(v.status)+'</td><td><button onclick="openDrawer(\''+v.id+'\')">详情/审核</button></td></tr>').join('')+(rows.length?'':'<tr><td colspan="13" class="empty-state">暂无符合条件的投稿</td></tr>')+'</tbody></table></div><p class="source-note">本地评审演示，操作刷新即重置，不连接真实后台。任务名称、昵称、开始/结束时间均为示例；#735 尚未到 2026-10-28 点赞截止，可选任务 1044 演示录入。</p></div>';
}
function resetSelection(){selectedIds.clear();preview=null;feedback=null;importContext=null;screen='list';uploadGeneration++;}
function queryList(){filter={uid:document.getElementById('uid-filter').value.trim(),taskId:document.getElementById('task-filter').value.trim(),platform:document.getElementById('platform-filter').value,status:document.getElementById('status-filter').value};resetSelection();render();}
function refreshList(){resetSelection();render();}
function openTask(id){filter={uid:'',taskId:id,platform:'',status:''};resetSelection();render();}
function csvCell(value){let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
function exportRow(item){const task=taskFor(item);return [item.id,item.taskId,task.name,item.uid,item.nickname,item.platform,item.contentId,item.link,item.likes??'',task.startsAt,task.endsAt];}
function buildCsv(taskId,ids=null){return '\ufeff'+[csvHeaders,...submissions.filter(v=>ids?ids.includes(v.id):v.taskId===taskId).map(exportRow)].map(row=>row.map(csvCell).join(',')).join('\r\n');}
function exportTask(){
  const ids=selectedIds.size?[...selectedIds]:null,task=operationTask();if(!ids&&!task)return;
  const url=URL.createObjectURL(new Blob([buildCsv(task?.id??null,ids)],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=ids?'所选稿件-点赞.csv':'任务'+task.id+'-稿件点赞.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  recordOperation({type:'导出',detail:'导出 '+(ids?ids.length+' 条选中稿件':'任务 '+task.id+' 全部稿件')+'，11列CSV',objectIds:ids||submissions.filter(v=>v.taskId===task.id).map(v=>v.id),taskIds:ids?[...new Set(selectedRows().map(v=>v.taskId))]:[task.id],requestPath:'/demo/submission/export'});
}

function openImport(){importContext={};pasteDraft='';fileName='';preview=null;screen='import';uploadGeneration++;closeDrawer();render();}
function previewScope(){return preview?.taskId?'任务 '+preview.taskId+' · '+preview.rows.length+' 条记录':'按输入中的任务 ID 匹配稿件';}
function renderImportPage(){
  document.getElementById('content').innerHTML='<div class="panel-head"><h1>导入点赞</h1><button onclick="cancelImport()">返回投稿管理</button></div><div class="panel-body">'+alertBox('无需勾选稿件。选择文件或粘贴数据，下方预览后确认；每次只导入一个任务。')+'<div class="import-inputs"><section class="import-input-card"><h2>选择文件</h2><label for="csv-file">CSV UTF-8 文件</label><input type="file" id="csv-file" accept=".csv" onchange="readFile(this)"><p id="chosen-file" class="hint">'+escapeHtml(fileName||'选择文件后自动校验')+'</p></section><section class="import-input-card"><h2>粘贴数据</h2><label for="paste-data">一行一条记录</label><textarea id="paste-data" rows="4" oninput="invalidateInput()" placeholder="粘贴 CSV 或 Excel 复制的表格，可带表头或不带表头">'+escapeHtml(pasteDraft)+'</textarea><button id="preview-paste" onclick="previewPaste()">校验并预览</button></section></div><p class="hint template-order">'+csvHeaders.join('、')+'。仅修改点赞数，视频链接保留原文。</p><section id="import-preview" class="import-preview"><div class="import-preview-head"><h2>导入预览</h2><span id="preview-source" class="muted"></span></div><div id="preview-content" class="import-preview-body"></div><div class="import-preview-actions"><button onclick="cancelImport()">取消</button><button id="confirm-import" class="primary" disabled onclick="confirmImport()">确认导入</button></div></section></div>';
  renderInlinePreview();
}
function renderInlinePreview(){
  const source=document.getElementById('preview-source'),body=document.getElementById('preview-content'),button=document.getElementById('confirm-import');if(!body)return;
  source.textContent=preview?previewScope()+' · '+preview.source+(preview.fileName?' · '+preview.fileName:''):'';
  button.disabled=!preview||preview.errors.length>0||!preview.changes.length;button.textContent=preview?'确认导入 '+preview.changes.length+' 条':'确认导入';
  if(!preview){body.innerHTML='<div class="empty-state">选择文件或粘贴数据后，在这里查看预览</div>';return;}
  body.innerHTML='<div class="preview-summary"><strong>'+preview.changes.length+' 条待更新</strong> · '+preview.skips+' 条跳过 · '+preview.errors.length+' 条错误</div><p class="hint">确认后以导入值更新，请核对当前点赞。再次输入会替换本次预览。</p>'+(preview.errors.length?alertBox(preview.errors.join('；'),'error'):'')+'<div class="table-wrap"><table class="data-table preview-table"><thead><tr>'+['数据行','投稿 ID','当前点赞','导入点赞','校验结果'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+preview.rows.map(r=>'<tr><td>'+r.line+'</td><td>'+escapeHtml(r.id)+'</td><td>'+(r.old==null?'未录入':r.old)+'</td><td>'+escapeHtml(r.next)+'</td><td>'+escapeHtml(r.outcome)+'</td></tr>').join('')+'</tbody></table></div>';
}
function invalidateInput(){pasteDraft=document.getElementById('paste-data').value;uploadGeneration++;preview=null;renderInlinePreview();}

// 解析带引号、换行和双引号转义的 CSV；拒绝不闭合引号和格式歧义。
function parseCsv(text,separator=','){
  const input=text.replace(/^\ufeff/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(quoted){if(c==='"'){if(input[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
    if(c==='"'){if(cell||closed)throw Error('CSV 引号格式错误');quoted=true;continue;}
    if(c===separator){row.push(cell);cell='';closed=false;continue;}
    if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';closed=false;continue;}
    if(closed)throw Error('CSV 引号后存在多余字符');cell+=c;
  }
  if(quoted)throw Error('CSV 引号未闭合');
  if(cell||row.length||closed){row.push(cell);rows.push(row);}
  return rows.filter(r=>r.some(c=>c!==''));
}

function itemSnapshot(item){return JSON.stringify([exportRow(item),item.version,item.mode,item.status,taskFor(item).status,taskFor(item).statsAt,item.reward,item.reserved,hasLikesPermission]);}
function parseDelimited(text,delimiter=','){return parseCsv(text,delimiter);}
function inputDelimiter(text){
  let quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){i++;continue;}quoted=!quoted;continue;}
    if(!quoted){if(c==='\t')return '\t';if(c==='\r'||c==='\n')break;}
  }return ',';
}

function validateCsv(text,taskId=null,ids=null,source='文件导入',allowNoHeader=false){
  const result={taskId,rows:[],errors:[],changes:[],skips:0,source};let data;
  try{data=parseDelimited(text,inputDelimiter(text));}catch(e){result.errors.push(e.message);return result;}
  if(!data.length){result.errors.push('没有稿件记录');return result;}
  const header=JSON.stringify(data[0])===JSON.stringify(csvHeaders);
  if(!header&&!allowNoHeader){result.errors.push('表头与11列导出模板不一致');return result;}
  if(!header&&data[0].some(v=>csvHeaders.includes(v))){result.errors.push('表头与11列导出模板不一致');return result;}
  const records=header?data.slice(1):data;if(!records.length){result.errors.push('没有稿件记录');return result;}
  if(!taskId){const taskIds=[...new Set(records.filter(row=>row.length===11).map(row=>row[1]))];if(taskIds.length===1)result.taskId=taskIds[0];else if(taskIds.length>1)result.errors.push('一次只能导入一个任务，请拆分数据');}
  const seen=new Set();records.forEach((row,index)=>{
    const line=index+(header?2:1);let error='',item=null,likes=null;
    if(row.length!==11)error='每行须为11列，与模板顺序一致';
    else if(!result.taskId||row[1]!==result.taskId)error='数据混入其他任务';
    else if(!tasks.some(t=>t.id===result.taskId))error='任务 ID 不存在';
    else if(seen.has(row[0]))error='同一投稿 ID 重复出现';
    else{seen.add(row[0]);item=submissions.find(v=>v.id===row[0]&&v.taskId===result.taskId);
      if(!item)error='投稿 ID 不存在或不属于该任务';
      else{const current=exportRow(item).map(v=>String(v??''));
        if(row.some((v,i)=>i!==8&&v!==current[i]&&v!==csvCell(current[i]).slice(1,-1).replace(/""/g,'"')))error='身份、原视频链接或任务时间不一致，请重新导出';
        else if(row[8].trim()===''){result.skips++;result.rows.push({line,id:item.id,old:item.likes,next:'跳过',outcome:'跳过（未填写点赞）'});return;}
        else if(!/^\d+$/.test(row[8].trim())||!Number.isSafeInteger(Number(row[8])))error='点赞数须为有效非负整数';
        else{likes=Number(row[8]);if(likes===item.likes){result.skips++;result.rows.push({line,id:item.id,old:item.likes,next:likes,outcome:'跳过（数据未修改）'});return;}error=eligibility(item);if(!error)result.changes.push({id:item.id,likes,old:item.likes,snapshot:itemSnapshot(item)});}
      }
    }
    if(error)result.errors.push('第 '+line+' 行：'+error);
    result.rows.push({line,id:row[0]||'—',old:item?.likes,next:likes??row[8]??'—',outcome:error||'待更新'});
  });return result;
}
async function readFile(input){
  if(!importContext)return;const file=input.files[0];
  if(!file){uploadGeneration++;fileName='';preview=null;document.getElementById('chosen-file').textContent='选择文件后自动校验';renderInlinePreview();return;}
  pasteDraft=document.getElementById('paste-data').value;const generation=++uploadGeneration;fileName=file.name;preview=null;renderInlinePreview();document.getElementById('chosen-file').textContent=fileName+' · 正在校验';
  try{if(!/\.csv$/i.test(file.name))throw Error('仅支持 CSV UTF-8 文件');const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());if(generation!==uploadGeneration||screen!=='import')return;preview=validateCsv(text,null,null,'文件导入');preview.fileName=file.name;}
  catch(e){if(generation!==uploadGeneration||screen!=='import')return;preview={taskId:null,rows:[],errors:[e.message.includes('encoded')?'文件不是 UTF-8 编码，请另存 CSV UTF-8':e.message],changes:[],skips:0,source:'文件导入',fileName:file.name};}
  document.getElementById('chosen-file').textContent=fileName;renderInlinePreview();
}
function previewPaste(){pasteDraft=document.getElementById('paste-data').value;uploadGeneration++;preview=validateCsv(pasteDraft,null,null,'文本粘贴',true);renderInlinePreview();}
function cancelImport(){preview=null;importContext=null;screen='list';uploadGeneration++;render();}
function confirmImport(){
  if(!preview||preview.errors.length||!preview.changes.length)return;const oldPreview=preview;
  const conflict=!importContext||oldPreview.changes.some(c=>{const v=submissions.find(v=>v.id===c.id);return !v||v.taskId!==oldPreview.taskId||itemSnapshot(v)!==c.snapshot||eligibility(v);});
  if(conflict){const reason='稿件、权限或任务状态已变化，未更新任何数据，请重新校验。';preview.errors.push(reason);recordOperation({type:'批量录入截止点赞',result:'失败',failureReason:reason,detail:reason,objectIds:oldPreview.changes.map(c=>c.id),taskIds:[oldPreview.taskId],requestPath:'/demo/submission/import-likes'});renderInlinePreview();return;}
  const at=nowBeijing();oldPreview.changes.forEach(c=>{const item=submissions.find(v=>v.id===c.id);item.likes=c.likes;item.likesBasis=oldPreview.source+'（仅操作来源）';item.recordedAt=at;item.version++;const audit={type:'批量录入截止点赞',source:oldPreview.source,operator:operatorUID,at,old:c.old,next:c.likes,basis:item.likesBasis,version:item.version};item.history.push(audit);importAudit.push({taskId:item.taskId,id:item.id,...audit});});
  recordOperation({at,type:'批量录入截止点赞',detail:oldPreview.source+'：更新 '+oldPreview.changes.length+' 条截止点赞',objectIds:oldPreview.changes.map(c=>c.id),taskIds:[oldPreview.taskId],before:oldPreview.changes.map(c=>({id:c.id,likes:c.old})),after:oldPreview.changes.map(c=>({id:c.id,likes:c.likes})),requestPath:'/demo/submission/import-likes'});
  feedback={text:'已更新 '+oldPreview.changes.length+' 条，跳过 '+oldPreview.skips+' 条；审核状态、预留及已发奖励保持不变。',error:false};preview=null;screen='list';importContext=null;uploadGeneration++;render();
}

function availableTaskBudget(task){return task.budgetRemaining-submissions.filter(v=>v.taskId===task.id).reduce((sum,v)=>sum+v.reserved,0);}
function approvalReserve(item){return item.mode==='manual-likes-v1'?taskFor(item)?.singleCap:item.mode==='fixed-v1'?item.fixedReward:undefined;}
function approvalEligibility(item){
  if(!hasReviewPermission)return '无审核权限';
  if(!canReviewAll&&!reviewObjectIds.has(item.id))return '稿件不在审核范围';
  if(item.status!=='待人工审核')return '仅待人工审核稿件可通过';
  if(item.reward!==0||item.reserved!==0)return '稿件已发奖或已有预留，请先核对';
  const task=taskFor(item);
  if(!task||!['进行中','待结算'].includes(task.status))return '任务状态不允许审核通过';
  const reserve=approvalReserve(item);
  if(!Number.isSafeInteger(reserve)||reserve<=0)return '缺少有效的原计奖预留配置';
  if(!Number.isSafeInteger(availableTaskBudget(task))||availableTaskBudget(task)<0)return '任务预算数据无效';
  return '';
}
function approvalSnapshot(item){const task=taskFor(item);return JSON.stringify([item.id,item.taskId,item.version,item.status,item.mode,item.reward,item.reserved,task?.status,task?.singleCap,item.fixedReward,task?.budgetRemaining,task?availableTaskBudget(task):null,hasReviewPermission,canReviewAll,reviewObjectIds.has(item.id)]);}
function approvalPlan(ids){
  const items=ids.map(id=>submissions.find(v=>v.id===id)),errors=[],byTask=new Map();
  if(!ids.length||new Set(ids).size!==ids.length)errors.push('请选择不重复的稿件');
  items.forEach((item,i)=>{if(!item){errors.push('#'+ids[i]+' 稿件不存在');return;}const error=approvalEligibility(item);if(error){errors.push('#'+item.id+'：'+error);return;}const task=taskFor(item),sum=(byTask.get(task.id)?.required||0)+approvalReserve(item);byTask.set(task.id,{id:task.id,name:task.name,required:sum,available:availableTaskBudget(task)});});
  for(const task of byTask.values()){if(!Number.isSafeInteger(task.required)||task.required>task.available)errors.push('任务 '+task.id+' 可用预算 '+task.available+'，本批需预留 '+task.required+' 盖世币，预算不足');}
  return {items,errors,tasks:[...byTask.values()]};
}
function openApprove(ids){
  const plan=approvalPlan(ids);if(!ids.length)return;
  activeModal={type:'approve',ids:[...ids],requestId:nextOperationRequest(),snapshots:plan.items.map(v=>v?approvalSnapshot(v):null)};
  showModal('<div class="modal-head"><h2>'+(ids.length===1?'通过稿件 #'+ids[0]:'批量通过 '+ids.length+' 条')+'</h2><button class="close-button" aria-label="关闭通过" onclick="closeModal()">×</button></div><div class="modal-body">'+alertBox('确认后标记合格并足额预留预算，不录入点赞、不立即发奖；任一稿件或任务不符条件，整批不通过。')+'<div class="reject-records">'+plan.items.map((v,i)=>'<p>#'+escapeHtml(ids[i])+(v?' · 任务 '+v.taskId+' · '+escapeHtml(v.status)+(approvalEligibility(v)?' · '+escapeHtml(approvalEligibility(v)):' → 合格 · 预留 '+approvalReserve(v)+' 盖世币'):' · 稿件不存在')+'</p>').join('')+'</div><div class="table-wrap"><table class="budget-table"><thead><tr><th>任务</th><th>可用预算</th><th>本批预留</th></tr></thead><tbody>'+plan.tasks.map(t=>'<tr><td>'+t.id+'</td><td>'+t.available+'</td><td>'+t.required+'</td></tr>').join('')+'</tbody></table></div><p id="approve-error" class="form-error">'+escapeHtml(plan.errors.join('；'))+'</p><p class="hint small">预算与单稿上限为演示配置。真实审核沿现行接口；待结算只处理存量稿件。</p></div><div class="modal-footer"><button onclick="closeModal()">取消</button><button id="confirm-approve" class="primary" '+(plan.errors.length?'disabled':'')+' onclick="confirmApprove()">确认通过 '+ids.length+' 条</button></div>');
  document.getElementById('modal').classList.add('approve-modal');
}
function confirmApprove(){
  if(activeModal?.type!=='approve')return;const modal=activeModal;
  const plan=approvalPlan(modal.ids);
  if(plan.errors.length||plan.items.some((v,i)=>!v||approvalSnapshot(v)!==modal.snapshots[i])){const reason=plan.errors.join('；')||'稿件、权限或任务预算已变化，未通过任何稿件，请关闭后重新选择。';document.getElementById('approve-error').textContent=reason;document.getElementById('confirm-approve').disabled=true;recordOperation({requestId:modal.requestId,type:modal.ids.length===1?'通过':'批量通过',result:'失败',failureReason:reason,detail:reason,objectIds:modal.ids,taskIds:[...new Set(plan.items.filter(Boolean).map(v=>v.taskId))],requestPath:'/demo/submission/approve'});return;}
  const at=nowBeijing(),before=plan.items.map(v=>({id:v.id,status:v.status,reserved:v.reserved}));
  plan.items.forEach(v=>{const from=v.status;v.status='合格';v.reserved=approvalReserve(v);v.basis='';v.version++;v.history.push({type:'审核通过',from,next:'合格',reserved:v.reserved,operator:operatorUID,at,version:v.version});});
  recordOperation({requestId:modal.requestId,at,type:plan.items.length===1?'通过':'批量通过',detail:'通过 '+plan.items.length+' 条稿件；预留 '+plan.tasks.reduce((sum,t)=>sum+t.required,0)+' 盖世币；未发奖',objectIds:modal.ids,taskIds:plan.tasks.map(t=>t.id),before,after:plan.items.map(v=>({id:v.id,status:v.status,reserved:v.reserved})),requestPath:'/demo/submission/approve'});
  closeModal();selectedIds.clear();feedback={text:'已通过 '+plan.items.length+' 条，足额预留预算；未发奖。',error:false};render();if(activeSubmissionId)renderDrawer();
}
function rejectionEligibility(item){
  if(!hasReviewPermission)return '无审核权限';
  if(!canReviewAll&&!reviewObjectIds.has(item.id))return '稿件不在审核范围';
  if(item.status==='已结算'||item.reward>0)return '已结算或已发奖励，不可驳回';
  if(!['待人工审核','合格'].includes(item.status))return '仅待人工审核或合格稿件可驳回';
  if(['已结算','已关闭'].includes(taskFor(item).status))return '任务已结算或关闭';
  return '';
}
function reviewSnapshot(item){return JSON.stringify([item.id,item.version,item.status,item.reward,item.reserved,taskFor(item).status,hasReviewPermission]);}
function openReject(ids){
  const items=ids.map(id=>submissions.find(v=>v.id===id));if(!items.length||items.some(v=>!v))return;
  activeModal={type:'reject',ids:[...ids],requestId:nextOperationRequest(),snapshots:items.map(reviewSnapshot)};
  const errors=items.map(v=>rejectionEligibility(v)?'#'+v.id+'：'+rejectionEligibility(v):'').filter(Boolean);
  showModal('<div class="modal-head"><h2>'+(ids.length===1?'驳回稿件 #'+ids[0]:'批量驳回 '+ids.length+' 条')+'</h2><button class="close-button" aria-label="关闭驳回" onclick="closeModal()">×</button></div><div class="modal-body">'+alertBox('确认后标记为驳回，违规内容不发奖励；释放未发预算预留，保留原点赞与已发记录。','warning')+'<div class="reject-records">'+items.map(v=>'<p>#'+v.id+' · 任务 '+v.taskId+' · '+escapeHtml(v.status)+(rejectionEligibility(v)?' · 不可驳回':' → 驳回 · 释放预留 '+v.reserved+' 盖世币')+'</p>').join('')+'</div><div class="form-field"><label for="reject-reason" class="required">驳回原因</label><textarea id="reject-reason">违规内容</textarea></div><p id="reject-error" class="form-error">'+escapeHtml(errors.join('；'))+'</p></div><div class="modal-footer"><button onclick="closeModal()">取消</button><button id="confirm-reject" class="danger" '+(errors.length?'disabled':'')+' onclick="confirmReject()">确认驳回 '+ids.length+' 条</button></div>');
}
function confirmReject(){
  if(activeModal?.type!=='reject')return;const modal=activeModal,reason=document.getElementById('reject-reason').value.trim();
  if(!reason){document.getElementById('reject-error').textContent='请填写驳回原因';return;}
  const items=modal.ids.map(id=>submissions.find(v=>v.id===id));
  if(items.some((v,i)=>!v||rejectionEligibility(v)||reviewSnapshot(v)!==modal.snapshots[i])){const reason='稿件、权限或预算状态已变化，未驳回任何稿件，请关闭后重新选择。';document.getElementById('reject-error').textContent=reason;document.getElementById('confirm-reject').disabled=true;recordOperation({requestId:modal.requestId,type:modal.ids.length===1?'驳回':'批量驳回',result:'失败',failureReason:reason,detail:reason,objectIds:modal.ids,taskIds:[...new Set(items.filter(Boolean).map(v=>v.taskId))],requestPath:'/demo/submission/reject'});return;}
  const at=nowBeijing();items.forEach(v=>{const from=v.status,released=v.reserved;v.status='驳回';v.reserved=0;v.basis=reason;v.version++;v.history.push({type:'违规驳回',from,next:'驳回',released,basis:reason,operator:operatorUID,at,version:v.version});});
  recordOperation({requestId:modal.requestId,at,type:items.length===1?'驳回':'批量驳回',detail:'驳回 '+items.length+' 条稿件；依据：'+reason,objectIds:items.map(v=>v.id),taskIds:[...new Set(items.map(v=>v.taskId))],before:modal.ids.map((id,i)=>{const old=JSON.parse(modal.snapshots[i]);return {id,status:old[2],reserved:old[4]};}),after:items.map(v=>({id:v.id,status:v.status,reserved:v.reserved})),requestPath:'/demo/submission/reject'});
  closeModal();selectedIds.clear();preview=null;feedback={text:'已驳回 '+items.length+' 条违规稿件，释放预算预留，不发奖励。',error:false};render();if(activeSubmissionId)renderDrawer();
}
function identifyVideoLink(raw,expected=''){
  const invalid=reason=>({state:'检测失败',reason,platform:'',candidateId:'',kind:'invalid'});let url;
  try{url=new URL(raw.trim());}catch{return invalid('链接格式无效，请核对原作品链接');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||/[\\\s]/.test(raw))return invalid('仅支持无账号信息的标准 HTTP/HTTPS 平台链接');
  const hosts={'douyin.com':'douyin','www.douyin.com':'douyin','iesdouyin.com':'douyin','www.iesdouyin.com':'douyin','v.douyin.com':'douyin','bilibili.com':'bilibili','www.bilibili.com':'bilibili','b23.tv':'bilibili','kuaishou.com':'kuaishou','www.kuaishou.com':'kuaishou','v.kuaishou.com':'kuaishou','xiaohongshu.com':'xiaohongshu','www.xiaohongshu.com':'xiaohongshu','xhslink.com':'xiaohongshu','www.xhslink.com':'xiaohongshu'};
  const platform=hosts[url.hostname];if(!platform)return invalid('不属于抖音、B站、小红书、快手的许可域名');
  if(expected&&platform!==expected)return invalid('链接平台与投稿平台不一致');
  const short=['v.douyin.com','b23.tv','v.kuaishou.com','xhslink.com','www.xhslink.com'].includes(url.hostname);
  const path=url.pathname;let match=null,candidateId='';
  if(short){if(!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\/?$/.test(path))return invalid('分享短链格式无效');return {state:'待核验',reason:'已识别分享短链；需还原实际终点并重新校验同平台作品路径',platform,candidateId:'',kind:'short'};}
  if(platform==='douyin'){match=path.match(/^\/video\/(\d+)\/?$/);if(match)candidateId=match[1];else if(['iesdouyin.com','www.iesdouyin.com'].includes(url.hostname)){match=path.match(/^\/share\/video\/([^/]+)\/?$/);if(match)candidateId=match[1];}}
  if(platform==='bilibili'){match=path.match(/^\/video\/(BV[1-9A-HJ-NP-Za-km-z]{10}|av\d+)\/?$/);if(match)candidateId=match[1];}
  if(platform==='kuaishou'){match=path.match(/^\/short-video\/([A-Za-z0-9_-]+)\/?$/);if(match)candidateId=match[1];}
  if(platform==='xiaohongshu'){match=path.match(/^\/(?:explore|discovery\/item)\/([a-fA-F0-9]{24})\/?$/);if(match)candidateId=match[1].toLowerCase();}
  if(!match){if(path==='/'||/^\/(?:user|profile|live|shop|search|read|article|note|activity)(?:\/|$)/.test(path))return invalid('首页、用户页、直播、商品或非作品页不能作为视频链接');return {state:'待核验',reason:'平台域名已识别，当前路径需真实分享链接联调，不能判定为视频',platform,candidateId:'',kind:'unknown'};}
  return {state:'待核验',reason:platform==='xiaohongshu'?'已识别笔记格式；须核验是否视频，type=video 等参数不能作为证据':'已识别作品路径与候选ID；可访问性和真实视频类型尚需核验',platform,candidateId,kind:'candidate'};
}
function detectSubmissionLink(id){
  const item=submissions.find(v=>v.id===id),result=identifyVideoLink(item.link,item.platform);
  result.duplicates=result.candidateId?submissions.filter(v=>v.id!==id).filter(v=>{const other=identifyVideoLink(v.link,v.platform);return other.platform===result.platform&&other.candidateId===result.candidateId;}).map(v=>v.id):[];
  result.at=nowBeijing();linkResults.set(id,result);renderDrawer();
}
function linkDetectionSection(item){
  const result=linkResults.get(item.id),short=result?.kind==='short',candidate=!!result?.candidateId,invalid=result?.kind==='invalid';
  const steps=[['格式识别',result?(invalid?'失败':'已识别'):'未检测'],['短链还原',result?(short?'待服务端还原':invalid?'未执行':'当前为完整链接'):'未检测'],['作品身份',candidate?'候选ID：'+result.candidateId:'待核验'],['视频类型','待平台元数据或人工核验'],['重复检查',result?.duplicates?.length?'重复线索：#'+result.duplicates.join('、#'):candidate?'候选ID未命中；别名映射待核验':'身份确认后检查']];
  return '<section class="detail-section"><h3>视频链接检测</h3><div class="section-content"><p class="evidence-link">原链接：'+escapeHtml(item.link)+'</p><button id="detect-link" onclick="detectSubmissionLink(\''+item.id+'\')">'+(result?'重新检测':'检测视频链接')+'</button>'+(result?'<p class="detection-result">'+escapeHtml(result.state+'：'+result.reason)+'</p>':'')+'<ol class="detection-steps">'+steps.map(s=>'<li><strong>'+s[0]+'</strong><span>'+escapeHtml(s[1])+'</span></li>').join('')+'</ol><p class="hint">支持抖音、B站、小红书、快手。离线 Demo 仅识别格式，不在线还原短链或核验视频；历史 url:hash 不是已解析作品ID。检测不改变审核、点赞或奖励。</p></div></section>';
}
function historyMarkup(a){return '<div class="audit-item">'+escapeHtml(a.type)+' · 版本 '+a.version+'<br>'+(a.type==='违规驳回'?escapeHtml(a.from)+' → 驳回；释放预留 '+a.released+' 盖世币':a.type==='审核通过'?escapeHtml(a.from)+' → 合格；预留 '+a.reserved+' 盖世币':'截止点赞 '+(a.old===null?'未录入':a.old)+' → '+a.next)+(a.type==='审核通过'?'':'；依据/来源：'+escapeHtml(a.basis))+'<br>操作人 UID：'+a.operator+'；'+a.at+'（北京时间）</div>';}
function openDrawer(id){activeSubmissionId=id;renderDrawer();document.getElementById('drawer-mask').style.display='block';document.getElementById('drawer').style.display='flex';}
function closeDrawer(){closeModal();activeSubmissionId=null;document.getElementById('drawer-mask').style.display='none';document.getElementById('drawer').style.display='none';}

function renderDrawer(){
  const item=submissions.find(v=>v.id===activeSubmissionId);if(!item)return;
  const task=taskFor(item);const detail=[['状态',item.status,'版本',item.version],['投稿时任务版本',item.taskVersion,'投稿时要求快照',item.requirements],['点赞截止（北京时间）',task.statsAt,'实际录入时点',item.recordedAt||'未录入或未提供'],['任务 ID',item.taskId,'任务名称',task.name],['任务开始（示例）',task.startsAt,'任务结束（示例）',task.endsAt],['投稿人 UID',item.uid,'投稿人昵称',item.nickname],['平台',item.platform,'内容 ID',item.contentId],['奖励金额（已发金额）',item.reward,'计奖模式',item.mode],['人工点赞数',item.likes===null?'未录入':item.likes,'预留金额',item.reserved],['标题',item.title||'未提供','作品链接',item.link],['审核依据',item.basis||'—','点赞依据/操作来源',item.likesBasis||'未录入']];
  document.getElementById('drawer').innerHTML='<div class="drawer-head"><button class="close-button" aria-label="关闭投稿详情" onclick="closeDrawer()">×</button><h2>投稿详情 #'+item.id+'</h2></div><div class="drawer-body"><div class="drawer-actions"><button onclick="openReconcile(\''+item.id+'\')">核对未确认操作</button><button onclick="openLikes(\''+item.id+'\')" '+(eligibility(item)?'disabled title="'+escapeHtml(eligibility(item))+'"':'')+'>录入 / 修正截止点赞</button><button class="danger" onclick="openReject([\''+item.id+'\'])" '+(rejectionEligibility(item)?'disabled title="'+escapeHtml(rejectionEligibility(item))+'"':'')+'>驳回</button></div><div class="details-grid">'+detail.flatMap(row=>row.map((cell,i)=>'<div class="'+(i%2?'value':'label')+'">'+escapeHtml(cell)+'</div>')).join('')+'</div>'+linkDetectionSection(item)+'<section class="detail-section"><h3>人工审核材料</h3><div class="section-content">未提供审核材料</div></section><section class="audit-history"><h3>审核历史</h3><div class="history-body">'+(item.initialHistory?'<div class="audit-item" style="white-space:pre-line">'+escapeHtml(item.initialHistory)+'</div>':'<p>当前截图未提供该稿件的审核历史</p>')+item.history.map(historyMarkup).join('')+'</div></section>'+(eligibility(item)?'<p class="hint">'+escapeHtml(eligibility(item))+'</p>':'')+'<div class="drawer-footer">'+(item.status==='待人工审核'?'<button class="primary" onclick="openApprove([\''+item.id+'\'])">通过</button>':'')+'</div></div>';
}

function showModal(content){document.getElementById('modal').innerHTML=content;document.getElementById('modal-mask').style.display='block';document.getElementById('modal').style.display='flex';}
function closeModal(){activeModal=null;document.getElementById('modal-mask').style.display='none';document.getElementById('modal').style.display='none';document.getElementById('modal').classList.remove('vest-modal','vest-audit-modal','audit-modal','approve-modal');}
function openLikes(id){
  const item=submissions.find(v=>v.id===id);activeModal={type:'likes',id,snapshot:itemSnapshot(item)};
  const pending=pendingRequests.get(id);const task=taskFor(item);
  showModal(`<div class="modal-head"><h2>确认截止点赞 #${id}</h2><button class="close-button" aria-label="关闭录入" onclick="closeModal()">×</button></div><div class="modal-body">${alertBox('仅确认人工截止数据，不立即发奖。未确认操作在当前标签页会话中保留，关闭后可核对原请求。')}${alertBox('原请求仅保存在当前标签页会话；刷新或重开后需手动核对，不会自动提交。请勿关闭标签页或清空存储。')}<p class="readonly-line">统计时点（只读，北京时间）：${task.statsAt}</p><div class="form-field"><label for="single-likes">截止点赞数</label><input id="single-likes" inputmode="numeric" value="${pending?.likes??item.likes??''}" oninput="saveDraft('${id}')"></div><div class="form-field"><label for="single-basis">确认依据</label><textarea id="single-basis" oninput="saveDraft('${id}')">${escapeHtml(pending?.basis??item.likesBasis)}</textarea></div><p class="conditions">需具备点赞权限、按赞模式作品已通过未结算，任务处于进行中或待结算，且已到点赞截止。</p><p id="single-error" class="form-error">${escapeHtml(eligibility(item))}</p></div><div class="modal-footer"><button onclick="closeModal()">关闭</button><button onclick="openLikes('${id}')">重新查询状态</button><button id="confirm-single" class="primary" ${eligibility(item)?'disabled':''} onclick="confirmSingle('${id}')">确认录入</button></div>`);
}
function saveDraft(id){pendingRequests.set(id,{likes:document.getElementById('single-likes').value,basis:document.getElementById('single-basis').value});try{sessionStorage.setItem('publisher-pending-demo',JSON.stringify([...pendingRequests]));}catch{}}
function confirmSingle(id){
  const item=submissions.find(v=>v.id===id);const likes=document.getElementById('single-likes').value.trim(),basis=document.getElementById('single-basis').value.trim();
  const error=eligibility(item)||(!/^\d+$/.test(likes)||!Number.isSafeInteger(Number(likes))?'截止点赞数须为有效非负整数':'')||(!basis?'请填写确认依据':'')||(itemSnapshot(item)!==activeModal?.snapshot?'稿件版本已变化，请重新查询状态':'');
  if(error){document.getElementById('single-error').textContent=error;if(eligibility(item)||itemSnapshot(item)!==activeModal?.snapshot)recordOperation({type:'录入截止点赞',result:'失败',failureReason:error,detail:error,objectIds:[id],taskIds:[item.taskId],requestPath:'/demo/submission/likes'});return;}
  const at=nowBeijing(),old=item.likes;item.likes=Number(likes);item.likesBasis=basis;item.recordedAt=at;item.version++;item.history.push({type:'录入截止点赞',old,next:item.likes,basis,operator:operatorUID,at,version:item.version});pendingRequests.delete(id);try{sessionStorage.setItem('publisher-pending-demo',JSON.stringify([...pendingRequests]));}catch{}
  recordOperation({at,type:'录入截止点赞',detail:'#'+id+' 截止点赞 '+(old===null?'未录入':old)+' → '+item.likes+'；依据：'+basis,objectIds:[id],taskIds:[item.taskId],before:{likes:old},after:{likes:item.likes},requestPath:'/demo/submission/likes'});
  closeModal();renderDrawer();feedback={text:'截止点赞已录入，审核状态、预留及已发奖励保持不变。',error:false};render();
}
function openReconcile(id){
  const pending=pendingRequests.get(id);activeModal={type:'reconcile',id};
  showModal(`<div class="modal-head"><h2>核对投稿未确认操作 #${id}</h2><button class="close-button" aria-label="关闭核对" onclick="closeModal()">×</button></div><div class="modal-body">${alertBox('原请求仅保存在当前标签页会话；刷新或重开后需手动核对，不会自动提交。请勿关闭标签页或清空存储。')}<p>${pending?`有一份待核对的录入草稿：截止点赞 ${escapeHtml(pending.likes||'未填写')}，依据 ${escapeHtml(pending.basis||'未填写')}。`:'当前账号在此资源没有待核对记录'}</p></div><div class="modal-footer"><button onclick="closeModal()">关闭</button><button onclick="openReconcile('${id}')">重新查询状态</button><button ${pending?'':'disabled'} onclick="openLikes('${id}')">${pending?'核对并继续录入':'确认提交'}</button></div>`);
}
// --- V1.6 马甲号与通用操作记录 ---
// 本地马甲号管理片段：余额均为明确示例，不连接线上钱包；不修改投稿、奖励或任务预算。
// 集成：主render按screen==='vest'调用renderVestPage()，screen==='vest-log'调用renderVestAudit()。
let hasCoinPermission=true,canManageAllVest=true,hasVestAuditPermission=false;
const vestAccounts=[
  ['22245178','渔游界','游戏推荐001','大世界风云变幻 小游戏其乐无穷',10,'2026-10-14 05:58:56',[],'渔'],
  ['22274566','3DM游戏网','授权搬运账号_3DM','',28,'2026-10-14 05:50:23',['1000231'],'3D'],
  ['22274568','Galgame批评','授权搬运账号_Galgame','',12,'2026-10-14 05:44:20',['1000231'],'G'],
  ['22274567','indienova','授权搬运账号_indienova','',13,'2026-10-14 03:16:53',['1000231'],'i'],
  ['22273965','科技每日推送','授权搬运账号_科技每日推送','',2,'2026-10-14 03:04:30',['1000231'],'科'],
  ['22445180','折扣情报小官人','折扣搬运001','游戏大放送啦—线情报速递官在此',5,'2026-10-13 03:16:45',[],'折'],
  ['22274570','盖世游戏官方','盖世游戏官方账号','',1205,'2026-10-08 08:29:38',['1000231'],'GH'],
  ['22274565','触乐','授权搬运账号_触乐','',15,'2026-10-08 03:08:16',['1000231'],'触'],
  ['22274569','情报姬','授权搬运账号_情报姬','',6,'2026-10-08 03:05:13',['1000231'],'情']
].map(([uid,name,internal,intro,fans,lastUsed,assignedOperators,avatar],i)=>({uid,name,internal,intro,remark:'',fans,following:0,lastUsed,assignedOperators,avatar,color:['#d7b321','#eecb70','#c9876e','#1890ff','#68b523','#8a9acc','#1b3968','#ff6552','#dbb7bc'][i],privacy:'隐私保护',status:'启用',coinBalance:1000,version:1,deleted:false}));
const vestCoinAudit=[];
let vestFilters={search:'',status:'',privacy:''},vestAuditFilters={from:'',to:'',operator:'',module:'',type:'',detail:'',path:''},vestEditSession=null,vestFeedback=null,vestRequestSequence=0;
function vestInScope(account){return !!account&&!account.deleted&&(canManageAllVest||account.assignedOperators.includes(operatorUID));}
function vestVisibleAccounts(){return vestAccounts.filter(vestInScope);}
function vestMoneyPermission(account){return hasCoinPermission&&vestInScope(account);}
function vestAvatar(account){return '<span class="vest-avatar" style="--avatar-color:'+account.color+'" aria-label="示例头像">'+escapeHtml(account.avatar)+'</span>';}
function vestGo(screenName){closeModal();screen=screenName;render();}
function renderVestPage(){
  const rows=vestVisibleAccounts().filter(a=>(!vestFilters.search||a.uid.includes(vestFilters.search)||a.name.includes(vestFilters.search))&&(!vestFilters.status||a.status===vestFilters.status)&&(!vestFilters.privacy||a.privacy===vestFilters.privacy));
  document.getElementById('content').innerHTML='<div class="vest-root"><div class="vest-breadcrumb">发行人计划 <span>/</span> 马甲号管理</div><div class="vest-page-head"><h1>马甲号管理</h1><div class="action-group"><button onclick="vestGo(\'vest-log\')">操作记录</button><button disabled title="原入口，本轮不演示">批量导入</button><button disabled title="原入口，本轮不演示">批量设置</button><button class="primary" disabled title="原入口，本轮不演示">＋ 创建马甲号</button></div></div><p class="vest-rule">按分配关系控制账号可见与操作范围；分配变更会记录真实操作者和完整对象。</p><div class="vest-stats"><div><span>账号总数</span><strong>1,322</strong></div><div><span>启用账号</span><strong class="vest-positive">1,322</strong></div><div><span>停用账号</span><strong class="vest-negative">0</strong></div></div><p class="vest-source">统计来自提供的后台截图；下方为 '+vestVisibleAccounts().length+' 条可见演示样例，盖世币初始余额均为示例值 1,000。</p><div class="vest-filters"><label>UID/用户名：<input id="vest-search" placeholder="输入 UID 或用户名" value="'+escapeHtml(vestFilters.search)+'"></label><label>状态：<select id="vest-status"><option value="">全部状态</option><option '+(vestFilters.status==='启用'?'selected':'')+'>启用</option><option '+(vestFilters.status==='停用'?'selected':'')+'>停用</option></select></label><label>隐私设置：<select id="vest-privacy"><option value="">全部</option><option '+(vestFilters.privacy==='隐私保护'?'selected':'')+'>隐私保护</option><option '+(vestFilters.privacy==='公开数据'?'selected':'')+'>公开数据</option></select></label><button class="primary" onclick="queryVestPage()">查询</button><button onclick="resetVestFilters()">重置</button></div><section class="vest-list-card"><div class="vest-list-head"><h2>马甲号列表</h2><span class="muted">余额单位：盖世币</span></div>'+(vestFeedback?alertBox(vestFeedback.text,vestFeedback.error?'error':'success'):'')+'<div class="table-wrap"><table class="data-table vest-table"><colgroup>'+[40,185,125,145,85,82,145,60,144,92,100,235].map(w=>'<col style="width:'+w+'px">').join('')+'</colgroup><thead><tr>'+['','马甲号','内部标识','个人简介','后台备注','粉丝 / 关注','隐私设置','状态','最近使用时间','分配人员','盖世币余额','操作'].map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>'+rows.map(a=>'<tr><td><input type="checkbox" disabled aria-label="原批量选择入口"></td><td><div class="vest-identity">'+vestAvatar(a)+'<div><strong>'+escapeHtml(a.name)+'</strong><span>UID '+a.uid+'</span></div></div></td><td><span class="vest-blue-tag ellipsis" title="'+escapeHtml(a.internal)+'">'+escapeHtml(a.internal)+'</span></td><td><span class="ellipsis" title="'+escapeHtml(a.intro)+'">'+escapeHtml(a.intro||'—')+'</span></td><td>'+escapeHtml(a.remark||'—')+'</td><td>'+a.fans+' / '+a.following+'</td><td><div class="vest-privacy-name">'+escapeHtml(a.privacy)+'</div><div class="vest-privacy-hint">主页可进入，隐藏粉丝/关注列表和游戏卡片</div></td><td><span class="status-tag approved">'+a.status+'</span></td><td>'+a.lastUsed+'</td><td>'+a.assignedOperators.map(uid=>'<span class="vest-blue-tag">#'+uid+'</span>').join(' ')+'</td><td><strong class="vest-balance">'+a.coinBalance.toLocaleString('en-US')+'</strong></td><td><div class="vest-row-actions"><button class="primary" disabled>使用该身份发布</button><button class="btn-link" onclick="openVestEdit(\''+a.uid+'\')">编辑</button><button class="btn-link danger" disabled>停用</button><button class="btn-link danger" disabled>删除</button></div></td></tr>').join('')+(rows.length?'':'<tr><td colspan="12" class="empty-state">暂无可管理的马甲号，请联系管理员分配</td></tr>')+'</tbody></table></div><div class="vest-list-foot">本页展示 '+rows.length+' 条演示样例；原头像和账号数据依照截图建立，缩略头像为本地示意。</div></section></div>';
}
function queryVestPage(){vestFilters={search:document.getElementById('vest-search').value.trim(),status:document.getElementById('vest-status').value,privacy:document.getElementById('vest-privacy').value};renderVestPage();}
function resetVestFilters(){vestFilters={search:'',status:'',privacy:''};renderVestPage();}
function vestObjectSnapshot(account){return JSON.stringify(account);}
function vestParseBalance(raw){const text=String(raw).trim();return /^\d+$/.test(text)&&Number.isSafeInteger(Number(text))?{ok:true,value:Number(text)}:{ok:false,message:'盖世币余额须为有效非负整数，支持 0'};}
function openVestEdit(uid){
  const account=vestAccounts.find(a=>a.uid===uid);if(!vestInScope(account)){vestFeedback={text:'当前账号无权编辑此马甲号，请重新查询。',error:true};renderVestPage();return;}
  vestEditSession={uid,snapshot:vestObjectSnapshot(account),version:account.version,balance:account.coinBalance,coinAllowed:vestMoneyPermission(account),requestId:'vest-demo-'+(++vestRequestSequence),saving:false,done:false};
  showModal('<div class="modal-head"><h2>编辑马甲号</h2><button class="close-button" aria-label="关闭马甲号编辑" onclick="closeModal()">×</button></div><div class="modal-body vest-edit-body"><div class="vest-form-row"><label>头像</label><div class="vest-form-control vest-avatar-field">'+vestAvatar(account)+'<button disabled title="沿用原头像，本轮不演示上传">选择头像</button></div></div><div class="vest-form-row"><label class="required" for="vest-name">用户名（前台显示）</label><div class="vest-form-control"><input id="vest-name" value="'+escapeHtml(account.name)+'"></div></div><div class="vest-form-row"><label for="vest-uid">UID</label><div class="vest-form-control"><input id="vest-uid" value="'+account.uid+'" disabled></div></div><div class="vest-form-row"><label for="vest-intro">个人简介</label><div class="vest-form-control"><textarea id="vest-intro" placeholder="请输入前台展示的个人简介">'+escapeHtml(account.intro)+'</textarea></div></div><div class="vest-form-row"><label class="required" for="vest-internal">内部标识</label><div class="vest-form-control"><input id="vest-internal" value="'+escapeHtml(account.internal)+'"></div></div><div class="vest-form-row"><label for="vest-remark">后台备注</label><div class="vest-form-control vest-remark-control"><textarea id="vest-remark" placeholder="仅后台运营人员可见">'+escapeHtml(account.remark)+'</textarea><p>后台备注只用于运营识别账号用途，不在客户端展示。</p></div></div><div class="vest-form-row"><label for="vest-edit-privacy">隐私设置</label><div class="vest-form-control"><select id="vest-edit-privacy"><option '+(account.privacy==='隐私保护'?'selected':'')+'>隐私保护</option><option '+(account.privacy==='公开数据'?'selected':'')+'>公开数据</option></select><p class="hint">隐私保护下仍可进入账号主页，并可正常关注；仅隐藏粉丝/关注列表和游戏卡片。</p></div></div><div class="vest-form-row"><label>状态</label><div class="vest-form-control"><select disabled><option>'+account.status+'</option></select></div></div><div class="vest-form-row vest-coin-row"><label for="vest-coin-balance">盖世币余额</label><div class="vest-form-control"><input id="vest-coin-balance" inputmode="numeric" value="'+account.coinBalance+'" '+(vestEditSession.coinAllowed?'':'readonly')+' oninput="updateVestCoinPreview()"><div id="vest-coin-preview" class="vest-coin-preview"></div><p class="hint">设置保存后的目标余额；初始 1,000 为演示样例。'+(vestEditSession.coinAllowed?'与资料同一次保存；余额未变化不记资金操作记录。':'无盖世币余额调整权限，余额只读。')+'</p></div></div><p id="vest-edit-error" class="form-error" role="alert"></p></div><div class="modal-footer"><button onclick="closeModal()">取消</button><button id="vest-save" class="primary" onclick="saveVestEdit()">确定</button></div>');
  document.getElementById('modal').classList.add('vest-modal');updateVestCoinPreview();
}
function updateVestCoinPreview(){
  const session=vestEditSession,el=document.getElementById('vest-coin-preview'),input=document.getElementById('vest-coin-balance');if(!session||!el||!input)return;
  const parsed=vestParseBalance(input.value);if(!parsed.ok){el.className='vest-coin-preview invalid';el.textContent=parsed.message;return;}
  const delta=parsed.value-session.balance;el.className='vest-coin-preview '+(delta>0?'increase':delta<0?'decrease':'unchanged');el.textContent=session.balance.toLocaleString('en-US')+' → '+parsed.value.toLocaleString('en-US')+' 盖世币（'+(delta>0?'增加 +'+delta:delta<0?'减少 '+delta:'增减 0，余额不变')+'）';
}
function saveVestEdit(){
  const session=vestEditSession;if(!session||session.saving||session.done||document.getElementById('modal').style.display==='none')return;
  const errorEl=document.getElementById('vest-edit-error'),account=vestAccounts.find(a=>a.uid===session.uid),parsed=vestParseBalance(document.getElementById('vest-coin-balance').value);
  const nextFields={name:document.getElementById('vest-name').value.trim(),intro:document.getElementById('vest-intro').value,internal:document.getElementById('vest-internal').value.trim(),remark:document.getElementById('vest-remark').value,privacy:document.getElementById('vest-edit-privacy').value};
  let error=!vestInScope(account)?'权限或分配范围已变化，本次资料和余额均未保存。':!parsed.ok?parsed.message:!nextFields.name?'请填写用户名':!nextFields.internal?'请填写内部标识':!['隐私保护','公开数据'].includes(nextFields.privacy)?'隐私设置无效，请重新选择':'';
  if(!error&&vestAccounts.some(a=>a.uid!==session.uid&&!a.deleted&&a.internal===nextFields.internal))error='内部标识已使用，请修改后再保存';
  const balanceChanged=parsed.ok&&parsed.value!==session.balance;
  if(!error&&(session.coinAllowed&&!vestMoneyPermission(account)||balanceChanged&&(!session.coinAllowed||!vestMoneyPermission(account))))error='盖世币调整权限已变化，本次资料和余额均未保存。';
  if(!error&&(account.version!==session.version||account.coinBalance!==session.balance||vestObjectSnapshot(account)!==session.snapshot))error='账号资料或余额已变化，本次未保存，请关闭后重新编辑。';
  if(error){errorEl.textContent=error;if(/权限|范围|已变化/.test(error)){recordOperation({requestId:session.requestId,module:'马甲号管理',type:parsed.ok&&parsed.value!==session.balance?'编辑马甲号（盖世币调整）':'编辑马甲号',objectType:'马甲号',objectName:nextFields.name,objectIds:[session.uid],vestUid:session.uid,result:'失败',failureReason:error,detail:error,requestPath:'/demo/vest/edit'});document.getElementById('vest-save').disabled=true;}return;}
  session.saving=true;document.getElementById('vest-save').disabled=true;
  // 本地同一次提交完成资料、余额与资金日志；不触碰其他业务对象。
  const old={...account},auditLength=vestCoinAudit.length,operationLength=operationAudit.length;
  try{
    const next={...account,...nextFields,coinBalance:parsed.value,version:account.version+1};
    const delta=parsed.value-account.coinBalance,profileChanged=Object.keys(nextFields).some(key=>nextFields[key]!==account[key]);
    const audit=balanceChanged?{id:session.requestId,at:nowBeijing(),operator:operatorUID,operatorName:'郑群超',module:'马甲号管理',type:'编辑马甲号（盖世币调整）',vestUid:account.uid,vestName:nextFields.name,objectType:'马甲号',objectName:nextFields.name,requestId:session.requestId,detail:'编辑 '+nextFields.name+'（UID '+account.uid+'），盖世币余额 '+account.coinBalance+' → '+parsed.value+'，'+(delta>0?'增加 +':'减少 ')+delta,requestPath:'/demo/vest/edit',region:'国内',result:'成功',before:account.coinBalance,after:parsed.value,delta,objectIds:[account.uid],taskIds:[]}:null;
    if(audit){vestCoinAudit.push(audit);recordOperation(audit);}else if(profileChanged){recordOperation({id:session.requestId,at:nowBeijing(),operator:operatorUID,operatorName:'郑群超',module:'马甲号管理',type:'编辑马甲号',vestUid:account.uid,vestName:nextFields.name,objectType:'马甲号',objectName:nextFields.name,requestId:session.requestId,detail:'编辑 '+nextFields.name+'（UID '+account.uid+'）账号资料；盖世币余额未变化',requestPath:'/demo/vest/edit',region:'国内',result:'成功',before:Object.fromEntries(Object.keys(nextFields).map(key=>[key,account[key]])),after:nextFields,delta:null,objectIds:[account.uid],taskIds:[]});}Object.assign(account,next);session.done=true;session.saving=false;vestFeedback={text:balanceChanged?'马甲号资料和盖世币余额已保存，资金操作记录同步写入。':'马甲号资料已保存；盖世币余额未变化，不生成资金操作记录。',error:false};closeModal();renderVestPage();
  }catch{
    Object.assign(account,old);vestCoinAudit.splice(auditLength);operationAudit.splice(operationLength);session.saving=false;document.getElementById('vest-save').disabled=false;errorEl.textContent='保存失败，资料和余额均未更新，请重试。';
  }
}
function vestAuditVisible(log){if(canManageAllVest||hasVestAuditPermission)return true;const vestId=log.vestUid||(log.objectType==='马甲号'?(log.objectIds||[])[0]:null);if(vestId)return vestInScope(vestAccounts.find(a=>a.uid===vestId));return log.operator===operatorUID;}
const operationModules=['钱包审计','创作者管理','规则与外放设置','充值档位','任务管理','任务异常审核','投稿管理','统一结算','马甲号管理'];
const operationBaseTypes=['新增','编辑','启用','停用','删除','充值','资金调整','盖世币消耗','通过','批量通过','驳回','批量驳回','录入截止点赞','批量录入截止点赞','导入','导出','结算','编辑马甲号','编辑马甲号（盖世币调整）'];
const operationFields=[['操作时间','操作发生的北京时间，精确到秒'],['操作人','真实后台登录账号，不是被操作的马甲号'],['操作模块','所属的发行人计划业务菜单'],['操作类型','本次实际执行的动作'],['操作详情','操作对象与变更摘要；资金调整记录前后余额和差额；消耗记录成功扣币金额与流水'],['操作结果','实际执行结果：成功、失败或待核对'],['区域','本次操作所属区域'],['操作','查看本次操作的完整记录']];
function operationTypes(){return [...new Set([...operationBaseTypes,...operationAudit.filter(vestAuditVisible).map(a=>a.type)])];}
function operationObjectText(record){const type=record.objectType||(record.vestUid?'马甲号':record.module==='投稿管理'?'投稿':'业务对象'),name=record.objectName||record.vestName||'',ids=(record.objectIds||[]).join('、');return [type,name,ids?'ID '+ids:''].filter(Boolean).join(' / ');}
function renderVestAudit(){
  const f=vestAuditFilters,from=f.from?operationTimeNumber(f.from):null,to=f.to?operationTimeNumber(f.to):null;
  const logs=operationAudit.filter(vestAuditVisible).filter(a=>(from===null||operationTimeNumber(a.at)>=from)&&(to===null||operationTimeNumber(a.at)<=to)&&(!f.operator||(a.operatorName+' '+a.operator).includes(f.operator))&&(!f.module||a.module===f.module)&&(!f.type||a.type===f.type)&&(!f.detail||a.detail.includes(f.detail))&&(!f.path||(a.requestPath||'').includes(f.path)));
  document.getElementById('content').innerHTML='<div class="vest-root"><div class="vest-breadcrumb">发行人计划 <span>/</span> 操作记录</div><div class="vest-page-head"><h1>操作记录</h1></div><p class="vest-rule">发行人计划统一操作记录；真实后台账号留痕，操作时间为北京时间。当前包含投稿、马甲操作与一条只读消费示例；真实消费模块未接入，示例不改余额或任务预算。其他模块筛选可查看空态；演示路径不代表真实接口。</p><div class="operation-filters"><div class="operation-filter-row"><label>操作时间：<div class="operation-time-range"><input id="operation-from" type="datetime-local" step="1" aria-label="操作开始时间" value="'+escapeHtml(f.from.replace(' ','T'))+'"><span>→</span><input id="operation-to" type="datetime-local" step="1" aria-label="操作结束时间" value="'+escapeHtml(f.to.replace(' ','T'))+'"></div></label><label>操作人：<input id="operation-operator" placeholder="输入姓名/账号" value="'+escapeHtml(f.operator)+'"></label><label>操作模块：<select id="operation-module"><option value="">全部</option>'+operationModules.map(m=>'<option '+(f.module===m?'selected':'')+'>'+m+'</option>').join('')+'</select></label><label>操作类型：<select id="operation-type"><option value="">全部</option>'+operationTypes().map(t=>'<option '+(f.type===t?'selected':'')+'>'+escapeHtml(t)+'</option>').join('')+'</select></label></div><div class="operation-filter-row operation-filter-bottom"><label>操作详情：<input id="operation-detail" placeholder="输入操作内容关键词" value="'+escapeHtml(f.detail)+'"></label><label>请求路径：<input id="operation-path" placeholder="输入请求路径关键词" value="'+escapeHtml(f.path)+'"></label><div class="spacer"></div><button onclick="resetVestAudit()">重置</button><button class="primary" onclick="queryVestAudit()">查询</button></div><p id="operation-filter-error" class="form-error" role="alert"></p></div><section class="vest-list-card operation-list-card"><div class="vest-list-head"><h2>操作记录</h2><button disabled title="原入口，未接入真实导出接口">导出数据</button></div><div class="table-wrap"><table class="data-table operation-table"><colgroup>'+[175,155,145,190,390,90,80,75].map(w=>'<col style="width:'+w+'px">').join('')+'</colgroup><thead><tr>'+operationFields.map(([name,note])=>'<th title="'+escapeHtml(note)+'">'+name+'<span class="operation-field-note" aria-label="'+escapeHtml(note)+'">ⓘ</span></th>').join('')+'</tr></thead><tbody>'+logs.slice().reverse().map(a=>'<tr><td>'+a.at+'</td><td><strong>'+escapeHtml(a.operatorName)+'</strong><div class="muted">UID '+escapeHtml(a.operator)+'</div></td><td><span class="status-tag">'+escapeHtml(a.module)+'</span></td><td class="blue">'+escapeHtml(a.type)+'</td><td>'+escapeHtml(a.detail)+'</td><td><span class="status-tag '+(a.result==='成功'?'approved':a.result==='失败'?'rejected':'pending')+'">'+escapeHtml(a.result||'待核对')+'</span></td><td><span class="vest-blue-tag">'+escapeHtml(a.region)+'</span></td><td><button class="btn-link" onclick="openOperationDetail(\''+escapeHtml(a.id)+'\')">详情</button></td></tr>').join('')+(logs.length?'':'<tr><td colspan="8" class="empty-state">暂无可见操作记录</td></tr>')+'</tbody></table></div><div class="vest-list-foot">共 '+logs.length+' 条本地演示操作记录。余额未变化不会生成资金操作记录；预算预留与人工余额调整不属于盖世币消耗。</div></section></div>';
}
function operationTimeNumber(value){
  const text=value.replace('T',' ').replace(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})$/,'$1:00');if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text))return NaN;
  const time=Date.parse(text.replace(' ','T')+'+08:00');if(!Number.isFinite(time))return NaN;
  return new Date(time+8*3600000).toISOString().slice(0,19).replace('T',' ')===text?time:NaN;
}
function queryVestAudit(){
  const next={from:document.getElementById('operation-from').value.trim().replace('T',' '),to:document.getElementById('operation-to').value.trim().replace('T',' '),operator:document.getElementById('operation-operator').value.trim(),module:document.getElementById('operation-module').value,type:document.getElementById('operation-type').value,detail:document.getElementById('operation-detail').value.trim(),path:document.getElementById('operation-path').value.trim()};
  const error=next.from&&!Number.isFinite(operationTimeNumber(next.from))||next.to&&!Number.isFinite(operationTimeNumber(next.to))?'请输入有效的北京时间，格式为 YYYY-MM-DD HH:mm:ss':next.from&&next.to&&operationTimeNumber(next.from)>operationTimeNumber(next.to)?'开始时间不能晚于结束时间':'';
  if(error){document.getElementById('operation-filter-error').textContent=error;return;}vestAuditFilters=next;renderVestAudit();
}
function resetVestAudit(){vestAuditFilters={from:'',to:'',operator:'',module:'',type:'',detail:'',path:''};renderVestAudit();}
function operationValueText(value){if(value===null||value===undefined)return '—';if(Array.isArray(value))return value.map(operationValueText).join('\n');if(typeof value==='object'){const labels={id:'投稿ID',status:'状态',reserved:'预留（盖世币）',likes:'截止点赞',name:'用户名',intro:'个人简介',internal:'内部标识',remark:'后台备注',privacy:'隐私设置'};return Object.entries(value).map(([key,v])=>(labels[key]||key)+'：'+(v===null?'未录入':String(v===''?'—':v))).join('；');}return String(value);}
function openOperationDetail(id){
  const record=operationAudit.find(a=>a.id===id);if(!record||!vestAuditVisible(record)){document.getElementById('operation-filter-error').textContent='当前无权查看此操作记录，请重新查询。';return;}
  const data=[['记录ID',record.id],['请求ID',record.requestId||record.id],['操作时间（北京时间）',record.at],['真实后台操作人',record.operatorName+' / UID '+record.operator],['操作对象',operationObjectText(record)],['操作模块',record.module],['操作类型',record.type],['操作详情',record.detail],['区域',record.region],['结果',record.result],['请求路径',record.requestPath||'未接入'],['任务ID',(record.taskIds||[]).join('、')||'—'],['变更前',operationValueText(record.before)],['变更后',operationValueText(record.after)],['增加 / 减少数',typeof record.delta==='number'?(record.delta>0?'增加 +'+record.delta:record.delta<0?'减少 '+record.delta:'增减 0'):'—']];
  if(record.type==='盖世币消耗')data.splice(-3);
  if(record.failureReason)data.push(['失败 / 待核对原因',record.failureReason]);
  if(record.type==='盖世币消耗')data.push(['流水标识',record.transactionId||'—'],['关联业务',record.businessReference||'—'],['成功扣币数（盖世币）',typeof record.consumptionAmount==='number'?record.consumptionAmount:'—'],['消费前余额（盖世币）',operationValueText(record.before)],['消费后余额（盖世币）',operationValueText(record.after)],['记录来源',record.source||'未提供'],['数据性质',record.isExample?'只读示例；不修改账户余额或任务预算':'业务操作记录']);
  showModal('<div class="modal-head"><h2>操作记录详情</h2><button class="close-button" aria-label="关闭操作记录详情" onclick="closeModal()">×</button></div><div class="modal-body"><div class="operation-detail-grid">'+data.map(([k,v])=>'<div class="label">'+k+'</div><div class="value">'+escapeHtml(v)+'</div>').join('')+'</div><p class="hint">本地演示记录；/demo/ 路径仅为示例，不代表真实后台接口。操作人始终为真实后台登录人员。</p></div><div class="modal-footer"><button onclick="closeModal()">关闭</button></div>');document.getElementById('modal').classList.add('vest-audit-modal');
}

try{const drafts=JSON.parse(sessionStorage.getItem('publisher-pending-demo')||'[]');for(const [id,draft] of drafts)pendingRequests.set(id,draft);}catch{}
document.getElementById('drawer-mask').onclick=closeDrawer;
document.getElementById('modal-mask').onclick=closeModal;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(activeModal)closeModal();else closeDrawer();}});
render();

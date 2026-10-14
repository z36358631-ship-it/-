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
// 日期仅演示任务配置，不能由点赞截止时点反推真实任务时间。
tasks.forEach(t=>{t.startsAt='2026-10-01 10:00:00';t.endsAt=t.id==='1046'||t.id==='1040'?'2026-10-28 17:00:00':'2026-10-12 17:00:00';});
let filter={uid:'',taskId:'',platform:'',status:''};
let preview=null,feedback=null,activeSubmissionId=null,activeModal=null,uploadGeneration=0;
let screen='list',importContext=null,pasteDraft='',fileName='';
const selectedIds=new Set(),linkResults=new Map();
const importAudit=[];
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
function render(){
  if(screen==='import'){renderImportPage();return;}
  const task=tasks.find(t=>t.id===filter.taskId),opTask=operationTask(),rows=visibleRows();
  const count=selectedIds.size||(opTask?submissions.filter(v=>v.taskId===opTask.id).length:0);
  document.getElementById('content').innerHTML='<div class="panel-head"><h1>'+ (task?'任务投稿 · '+escapeHtml(task.name):'投稿管理')+'</h1><button onclick="refreshList()">刷新</button></div><div class="panel-body">'+alertBox(banner)+
  '<div class="filter-row"><div class="filter-field uid"><label for="uid-filter">投稿人 UID</label><input id="uid-filter" value="'+escapeHtml(filter.uid)+'"></div><div class="filter-field task"><label for="task-filter">任务 ID</label><input id="task-filter" value="'+escapeHtml(filter.taskId)+'" list="task-options" placeholder="输入或选择任务 ID"><datalist id="task-options">'+tasks.map(t=>'<option value="'+t.id+'">'+escapeHtml(t.name)+'</option>').join('')+'</datalist></div><div class="filter-field inline"><label for="platform-filter">平台</label><select id="platform-filter"><option value="">全部</option>'+['douyin','bilibili','kuaishou','xiaohongshu'].map(p=>'<option '+(filter.platform===p?'selected':'')+'>'+p+'</option>').join('')+'</select></div><div class="filter-field inline"><label for="status-filter">状态</label><select id="status-filter"><option value="">全部</option>'+['待人工审核','合格','驳回','已结算'].map(s=>'<option '+(filter.status===s?'selected':'')+'>'+s+'</option>').join('')+'</select></div><button class="primary" onclick="queryList()">查询投稿</button></div>'+
  '<div class="batch-actions"><div><span class="batch-title">'+(opTask?escapeHtml(opTask.id+' · '+opTask.name):'稿件操作')+'</span><span class="batch-caption">已选 '+selectedIds.size+' 条'+(selectedIds.size&&!opTask?' · 勾选跨任务，暂不可导出':'')+'</span></div><div class="actions"><button id="export-button" '+(!opTask?'disabled':'')+' onclick="exportTask()">导出'+(selectedIds.size?'选中 '+count:'全部 '+count)+' 条</button><button id="import-button" class="primary" onclick="openImport()">导入点赞</button><button id="reject-button" class="danger" '+(!selectedIds.size?'disabled':'')+' onclick="openReject([...selectedIds])">批量驳回'+(selectedIds.size?' '+selectedIds.size+' 条':'')+'</button></div><div class="batch-note">勾选用于导出与批量驳回。导入无需勾选，按文件或粘贴内容匹配稿件。</div></div>'+(feedback?alertBox(feedback.text,feedback.error?'error':'success'):'')+
  '<div class="table-wrap"><table class="data-table" id="submission-table"><colgroup>'+[48,82,82,195,110,120,100,250,260,155,75,110,130].map(w=>'<col style="width:'+w+'px">').join('')+'</colgroup><thead><tr><th><input id="select-all" type="checkbox" aria-label="全选当前结果" '+(rows.length&&rows.every(v=>selectedIds.has(v.id))?'checked':'')+' onchange="toggleAll(this.checked)"></th>'+['投稿 ID','任务 ID','任务名称','投稿人 UID','投稿人昵称','平台','内容 ID','视频链接','奖励金额（盖世币）','预留','状态','操作'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(v=>'<tr><td><input type="checkbox" aria-label="勾选投稿 '+v.id+'" '+(selectedIds.has(v.id)?'checked':'')+' onchange="toggleRow(\''+v.id+'\',this.checked)"></td><td>'+v.id+'</td><td><button class="link-button" onclick="openTask(\''+v.taskId+'\')">'+v.taskId+'</button></td><td><span class="ellipsis" title="'+escapeHtml(taskFor(v).name)+'">'+escapeHtml(taskFor(v).name)+'</span></td><td>'+v.uid+'</td><td>'+escapeHtml(v.nickname)+'</td><td>'+v.platform+'</td><td><span class="ellipsis" title="'+escapeHtml(v.contentId)+'">'+escapeHtml(v.contentId)+'</span></td><td><span class="ellipsis" title="'+escapeHtml(v.link)+'">'+escapeHtml(v.link||'—')+'</span></td><td>'+v.reward+'</td><td>'+v.reserved+'</td><td>'+tag(v.status)+'</td><td><button onclick="openDrawer(\''+v.id+'\')">详情/审核</button></td></tr>').join('')+(rows.length?'':'<tr><td colspan="13" class="empty-state">暂无符合条件的投稿</td></tr>')+'</tbody></table></div><p class="source-note">本地评审演示，操作刷新即重置，不连接真实后台。任务名称、昵称、开始/结束时间均为示例；#735 尚未到 2026-10-28 点赞截止，可选任务 1044 演示录入。</p></div>';
}
function resetSelection(){selectedIds.clear();preview=null;feedback=null;importContext=null;screen='list';uploadGeneration++;}
function queryList(){filter={uid:document.getElementById('uid-filter').value.trim(),taskId:document.getElementById('task-filter').value.trim(),platform:document.getElementById('platform-filter').value,status:document.getElementById('status-filter').value};resetSelection();render();}
function refreshList(){resetSelection();render();}
function openTask(id){filter={uid:'',taskId:id,platform:'',status:''};resetSelection();render();}
function csvCell(value){let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
function exportRow(item){const task=taskFor(item);return [item.id,item.taskId,task.name,item.uid,item.nickname,item.platform,item.contentId,item.link,item.likes??'',task.startsAt,task.endsAt];}
function buildCsv(taskId,ids=null){return '\ufeff'+[csvHeaders,...submissions.filter(v=>v.taskId===taskId&&(!ids||ids.includes(v.id))).map(exportRow)].map(row=>row.map(csvCell).join(',')).join('\r\n');}
function exportTask(){const task=operationTask();if(!task)return;const url=URL.createObjectURL(new Blob([buildCsv(task.id,selectedIds.size?[...selectedIds]:null)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='任务'+task.id+'-稿件点赞.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

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
  if(conflict){preview.errors.push('稿件、权限或任务状态已变化，未更新任何数据，请重新校验。');renderInlinePreview();return;}
  const at=nowBeijing();oldPreview.changes.forEach(c=>{const item=submissions.find(v=>v.id===c.id);item.likes=c.likes;item.likesBasis=oldPreview.source+'（仅操作来源）';item.recordedAt=at;item.version++;const audit={type:'批量录入截止点赞',source:oldPreview.source,operator:operatorUID,at,old:c.old,next:c.likes,basis:item.likesBasis,version:item.version};item.history.push(audit);importAudit.push({taskId:item.taskId,id:item.id,...audit});});
  feedback={text:'已更新 '+oldPreview.changes.length+' 条，跳过 '+oldPreview.skips+' 条；审核状态、预留及已发奖励保持不变。',error:false};preview=null;screen='list';importContext=null;uploadGeneration++;render();
}

function rejectionEligibility(item){
  if(!hasReviewPermission)return '无审核权限';
  if(item.status==='已结算'||item.reward>0)return '已结算或已发奖励，不可驳回';
  if(!['待人工审核','合格'].includes(item.status))return '仅待人工审核或合格稿件可驳回';
  if(['已结算','已关闭'].includes(taskFor(item).status))return '任务已结算或关闭';
  return '';
}
function reviewSnapshot(item){return JSON.stringify([item.id,item.version,item.status,item.reward,item.reserved,taskFor(item).status,hasReviewPermission]);}
function openReject(ids){
  const items=ids.map(id=>submissions.find(v=>v.id===id));if(!items.length||items.some(v=>!v))return;
  activeModal={type:'reject',ids:[...ids],snapshots:items.map(reviewSnapshot)};
  const errors=items.map(v=>rejectionEligibility(v)?'#'+v.id+'：'+rejectionEligibility(v):'').filter(Boolean);
  showModal('<div class="modal-head"><h2>'+(ids.length===1?'驳回稿件 #'+ids[0]:'批量驳回 '+ids.length+' 条')+'</h2><button class="close-button" aria-label="关闭驳回" onclick="closeModal()">×</button></div><div class="modal-body">'+alertBox('确认后标记为驳回，违规内容不发奖励；释放未发预算预留，保留原点赞与已发记录。','warning')+'<div class="reject-records">'+items.map(v=>'<p>#'+v.id+' · 任务 '+v.taskId+' · '+escapeHtml(v.status)+(rejectionEligibility(v)?' · 不可驳回':' → 驳回 · 释放预留 '+v.reserved+' 盖世币')+'</p>').join('')+'</div><div class="form-field"><label for="reject-reason" class="required">驳回原因</label><textarea id="reject-reason">违规内容</textarea></div><p id="reject-error" class="form-error">'+escapeHtml(errors.join('；'))+'</p></div><div class="modal-footer"><button onclick="closeModal()">取消</button><button id="confirm-reject" class="danger" '+(errors.length?'disabled':'')+' onclick="confirmReject()">确认驳回 '+ids.length+' 条</button></div>');
}
function confirmReject(){
  if(activeModal?.type!=='reject')return;const modal=activeModal,reason=document.getElementById('reject-reason').value.trim();
  if(!reason){document.getElementById('reject-error').textContent='请填写驳回原因';return;}
  const items=modal.ids.map(id=>submissions.find(v=>v.id===id));
  if(items.some((v,i)=>!v||rejectionEligibility(v)||reviewSnapshot(v)!==modal.snapshots[i])){document.getElementById('reject-error').textContent='稿件、权限或预算状态已变化，未驳回任何稿件，请关闭后重新选择。';document.getElementById('confirm-reject').disabled=true;return;}
  const at=nowBeijing();items.forEach(v=>{const from=v.status,released=v.reserved;v.status='驳回';v.reserved=0;v.basis=reason;v.version++;v.history.push({type:'违规驳回',from,next:'驳回',released,basis:reason,operator:operatorUID,at,version:v.version});});
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
function historyMarkup(a){return '<div class="audit-item">'+escapeHtml(a.type)+' · 版本 '+a.version+'<br>'+(a.type==='违规驳回'?escapeHtml(a.from)+' → 驳回；释放预留 '+a.released+' 盖世币':'截止点赞 '+(a.old===null?'未录入':a.old)+' → '+a.next)+'；依据/来源：'+escapeHtml(a.basis)+'<br>操作人 UID：'+a.operator+'；'+a.at+'（北京时间）</div>';}
function openDrawer(id){activeSubmissionId=id;renderDrawer();document.getElementById('drawer-mask').style.display='block';document.getElementById('drawer').style.display='flex';}
function closeDrawer(){closeModal();activeSubmissionId=null;document.getElementById('drawer-mask').style.display='none';document.getElementById('drawer').style.display='none';}

function renderDrawer(){
  const item=submissions.find(v=>v.id===activeSubmissionId);if(!item)return;
  const task=taskFor(item);const detail=[['状态',item.status,'版本',item.version],['投稿时任务版本',item.taskVersion,'投稿时要求快照',item.requirements],['点赞截止（北京时间）',task.statsAt,'实际录入时点',item.recordedAt||'未录入或未提供'],['任务 ID',item.taskId,'任务名称',task.name],['任务开始（示例）',task.startsAt,'任务结束（示例）',task.endsAt],['投稿人 UID',item.uid,'投稿人昵称',item.nickname],['平台',item.platform,'内容 ID',item.contentId],['奖励金额（已发金额）',item.reward,'计奖模式',item.mode],['人工点赞数',item.likes===null?'未录入':item.likes,'预留金额',item.reserved],['标题',item.title||'未提供','作品链接',item.link],['审核依据',item.basis,'点赞依据/操作来源',item.likesBasis||'未录入']];
  document.getElementById('drawer').innerHTML='<div class="drawer-head"><button class="close-button" aria-label="关闭投稿详情" onclick="closeDrawer()">×</button><h2>投稿详情 #'+item.id+'</h2></div><div class="drawer-body"><div class="drawer-actions"><button onclick="openReconcile(\''+item.id+'\')">核对未确认操作</button><button onclick="openLikes(\''+item.id+'\')" '+(eligibility(item)?'disabled title="'+escapeHtml(eligibility(item))+'"':'')+'>录入 / 修正截止点赞</button><button class="danger" onclick="openReject([\''+item.id+'\'])" '+(rejectionEligibility(item)?'disabled title="'+escapeHtml(rejectionEligibility(item))+'"':'')+'>驳回</button></div><div class="details-grid">'+detail.flatMap(row=>row.map((cell,i)=>'<div class="'+(i%2?'value':'label')+'">'+escapeHtml(cell)+'</div>')).join('')+'</div>'+linkDetectionSection(item)+'<section class="detail-section"><h3>人工审核材料</h3><div class="section-content">未提供审核材料</div></section><section class="audit-history"><h3>审核历史</h3><div class="history-body">'+(item.initialHistory?'<div class="audit-item" style="white-space:pre-line">'+escapeHtml(item.initialHistory)+'</div>':'<p>当前截图未提供该稿件的审核历史</p>')+item.history.map(historyMarkup).join('')+'</div></section>'+(eligibility(item)?'<p class="hint">'+escapeHtml(eligibility(item))+'</p>':'')+'<div class="drawer-footer">'+(item.status==='待人工审核'?'<button disabled title="通过流程沿用现有后台，本轮不模拟">通过</button>':'')+'</div></div>';
}

function showModal(content){document.getElementById('modal').innerHTML=content;document.getElementById('modal-mask').style.display='block';document.getElementById('modal').style.display='flex';}
function closeModal(){activeModal=null;document.getElementById('modal-mask').style.display='none';document.getElementById('modal').style.display='none';}
function openLikes(id){
  const item=submissions.find(v=>v.id===id);activeModal={type:'likes',id,snapshot:itemSnapshot(item)};
  const pending=pendingRequests.get(id);const task=taskFor(item);
  showModal(`<div class="modal-head"><h2>确认截止点赞 #${id}</h2><button class="close-button" aria-label="关闭录入" onclick="closeModal()">×</button></div><div class="modal-body">${alertBox('仅确认人工截止数据，不立即发奖。未确认操作在当前标签页会话中保留，关闭后可核对原请求。')}${alertBox('原请求仅保存在当前标签页会话；刷新或重开后需手动核对，不会自动提交。请勿关闭标签页或清空存储。')}<p class="readonly-line">统计时点（只读，北京时间）：${task.statsAt}</p><div class="form-field"><label for="single-likes">截止点赞数</label><input id="single-likes" inputmode="numeric" value="${pending?.likes??item.likes??''}" oninput="saveDraft('${id}')"></div><div class="form-field"><label for="single-basis">确认依据</label><textarea id="single-basis" oninput="saveDraft('${id}')">${escapeHtml(pending?.basis??item.likesBasis)}</textarea></div><p class="conditions">需具备点赞权限、按赞模式作品已通过未结算，任务处于进行中或待结算，且已到点赞截止。</p><p id="single-error" class="form-error">${escapeHtml(eligibility(item))}</p></div><div class="modal-footer"><button onclick="closeModal()">关闭</button><button onclick="openLikes('${id}')">重新查询状态</button><button id="confirm-single" class="primary" ${eligibility(item)?'disabled':''} onclick="confirmSingle('${id}')">确认录入</button></div>`);
}
function saveDraft(id){pendingRequests.set(id,{likes:document.getElementById('single-likes').value,basis:document.getElementById('single-basis').value});try{sessionStorage.setItem('publisher-pending-demo',JSON.stringify([...pendingRequests]));}catch{}}
function confirmSingle(id){
  const item=submissions.find(v=>v.id===id);const likes=document.getElementById('single-likes').value.trim(),basis=document.getElementById('single-basis').value.trim();
  const error=eligibility(item)||(!/^\d+$/.test(likes)||!Number.isSafeInteger(Number(likes))?'截止点赞数须为有效非负整数':'')||(!basis?'请填写确认依据':'')||(itemSnapshot(item)!==activeModal?.snapshot?'稿件版本已变化，请重新查询状态':'');
  if(error){document.getElementById('single-error').textContent=error;return;}
  const at=nowBeijing(),old=item.likes;item.likes=Number(likes);item.likesBasis=basis;item.recordedAt=at;item.version++;item.history.push({type:'录入截止点赞',old,next:item.likes,basis,operator:operatorUID,at,version:item.version});pendingRequests.delete(id);try{sessionStorage.setItem('publisher-pending-demo',JSON.stringify([...pendingRequests]));}catch{}
  closeModal();renderDrawer();feedback={text:'截止点赞已录入，审核状态、预留及已发奖励保持不变。',error:false};render();
}
function openReconcile(id){
  const pending=pendingRequests.get(id);activeModal={type:'reconcile',id};
  showModal(`<div class="modal-head"><h2>核对投稿未确认操作 #${id}</h2><button class="close-button" aria-label="关闭核对" onclick="closeModal()">×</button></div><div class="modal-body">${alertBox('原请求仅保存在当前标签页会话；刷新或重开后需手动核对，不会自动提交。请勿关闭标签页或清空存储。')}<p>${pending?`有一份待核对的录入草稿：截止点赞 ${escapeHtml(pending.likes||'未填写')}，依据 ${escapeHtml(pending.basis||'未填写')}。`:'当前账号在此资源没有待核对记录'}</p></div><div class="modal-footer"><button onclick="closeModal()">关闭</button><button onclick="openReconcile('${id}')">重新查询状态</button><button ${pending?'':'disabled'} onclick="openLikes('${id}')">${pending?'核对并继续录入':'确认提交'}</button></div>`);
}
try{const drafts=JSON.parse(sessionStorage.getItem('publisher-pending-demo')||'[]');for(const [id,draft] of drafts)pendingRequests.set(id,draft);}catch{}
document.getElementById('drawer-mask').onclick=closeDrawer;
document.getElementById('modal-mask').onclick=closeModal;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(activeModal)closeModal();else closeDrawer();}});
render();

/* Virtual, in-memory file transfer prototype. No filesystem or network access. */
function macFilesInit(){
 if(s.macFileDevice!==s.device){s.macFileDevice=s.device;s.macFilePaths={local:'/Users/mac/Documents',remote:device().os==='macOS'?'/Users/remote/Documents':'此电脑'};s.macFileHistory={local:[],remote:[]};s.macFileSelected={local:[],remote:[]};s.macFileTasks=[];s.macFileNotice='';s.macFileReceived={};}
}
function macFileEntries(side){
 const path=s.macFilePaths[side];let items=[];
 if(side==='local'){
  if(path==='/Users/mac/Documents')items=[['项目资料','folder','—'],['图片','folder','—'],['工作计划.docx','file','128 KB'],['产品说明.pdf','file','2.4 MB'],['演示截图.png','file','860 KB']];
  else if(path==='/Users/mac')items=[['Documents','folder','—'],['Downloads','folder','—'],['Desktop','folder','—']];
  else if(path==='/Users')items=[['mac','folder','—']];
  else if(path==='/')items=[['Users','folder','—']];
  else items=[['项目记录.txt','file','12 KB'],['资料归档.zip','file','8.6 MB']];
 }else if(device().os==='macOS'){
  if(path==='/')items=[['Users','folder','—'],['Applications','folder','—']];
  else if(path==='/Users')items=[['remote','folder','—']];
  else if(path==='/Users/remote')items=[['Documents','folder','—'],['Downloads','folder','—'],['Desktop','folder','—']];
  else items=[['项目资料','folder','—'],['会议纪要.pages','file','256 KB'],['项目方案.pdf','file','3.2 MB'],['桌面截图.png','file','1.1 MB']];
 }else{
  if(path==='此电脑')items=[['Windows (C:)','drive','—'],['Data (D:)','drive','—'],['文档','folder','—'],['桌面','folder','—'],['图片','folder','—'],['下载','folder','—']];
  else items=[['共享资料','folder','—'],['会议纪要.docx','file','256 KB'],['项目方案.pdf','file','3.2 MB'],['桌面截图.png','file','1.1 MB']];
 }
 return items.map((a,i)=>({name:a[0],type:a[1],size:a[2],id:String(i),date:a[1]==='drive'?'—':'2026/09/24 15:06'})).concat((s.macFileReceived[side+':'+path]||[]).map((f,i)=>({...f,id:'received'+i})));
}
function macFileButton(label,action,disabled=false,cls=''){return '<button type="button" class="'+cls+'" data-action="'+action+'"'+(disabled?' disabled':'')+'>'+label+'</button>';}
function macFilePane(side){
 const local=side==='local',path=s.macFilePaths[side],items=macFileEntries(side),sel=s.macFileSelected[side];
 return '<section class="mac-file-pane"><div class="mac-file-device"><strong>'+esc(local?'我的 Mac':device().name)+'</strong><span>'+(local?'本机':'远端')+'</span></div><div class="mac-file-toolbar">'+macFileButton(icon('back'),'mac-file-back:'+side,!s.macFileHistory[side].length,'icon-btn')+macFileButton('↑','mac-file-up:'+side,path===(local||device().os==='macOS'?'/':'此电脑'),'icon-btn')+macFileButton(icon('refresh'),'mac-file-refresh:'+side,false,'icon-btn')+'<div class="mac-file-path" title="'+esc(path)+'">'+icon('folder')+esc(path)+'</div></div><div class="mac-file-table"><table><thead><tr><th><input type="checkbox" aria-label="选择'+(local?'本机':'远端')+'全部文件" data-mac-file-all="'+side+'" '+(items.filter(f=>f.type==='file').length&&items.filter(f=>f.type==='file').every(f=>sel.includes(f.id))?'checked':'')+'></th><th>名称</th><th>修改日期</th><th>类型</th><th>大小</th></tr></thead><tbody>'+items.map(f=>'<tr class="'+(sel.includes(f.id)?'is-selected':'')+'"><td>'+(f.type==='file'?'<input type="checkbox" aria-label="选择 '+esc(f.name)+'" data-mac-file-side="'+side+'" data-mac-file-id="'+f.id+'" '+(sel.includes(f.id)?'checked':'')+'>':'')+'</td><td>'+macFileButton(icon(f.type==='file'?'file':'folder')+esc(f.name),f.type==='file'?'mac-file-select:'+side+':'+f.id:'mac-file-open:'+side+':'+f.id,false,'mac-file-name')+'</td><td>'+f.date+'</td><td>'+(f.type==='file'?'文件':f.type==='drive'?'磁盘':'文件夹')+'</td><td>'+f.size+'</td></tr>').join('')+'</tbody></table></div><div class="mac-file-pane-foot">'+items.length+' 项'+(sel.length?' · 已选择 '+sel.length+' 个文件':'')+'</div></section>';
}
function macFileTaskRows(){
 const labels={running:'传输中',paused:'已暂停',done:'已完成',cancelled:'已取消',waiting:'等待设备上线'};
 return s.macFileTasks.map(t=>'<tr><td>'+esc(t.name)+'</td><td><span>'+labels[t.status]+(t.status==='running'?' '+t.progress+'%':'')+'</span><progress value="'+t.progress+'" max="100"></progress></td><td>'+t.size+'</td><td title="'+esc(t.source)+'">'+esc(t.source)+'</td><td title="'+esc(t.target)+'">'+esc(t.target)+'</td><td class="mac-file-task-actions">'+(['running','paused','waiting'].includes(t.status)?macFileButton(t.status==='running'?'暂停':'继续','mac-file-task:'+(t.status==='running'?'pause':'resume')+':'+t.id,(!device().online||device().blocked)&&t.status!=='running')+macFileButton('取消','mac-file-task:cancel:'+t.id):'—')+'</td></tr>').join('');
}
function macFiles(){
 macFilesInit();const online=device().online&&!device().blocked,tasks=s.macFileTasks;
 return '<header class="head mac-file-heading">'+ib('返回上一页','file-back','back')+'<h1>文件传输</h1><span class="mac-file-demo-note">演示文件</span></header><main class="mac-files-content">'+(!online?'<div class="mac-file-offline">'+(device().blocked?'该设备暂不支持文件传输。':'设备已离线，暂时无法传输文件。')+'</div>':'')+'<div class="mac-file-sendbar">'+macFileButton('发送 →','mac-file-send:local',!online||s.macFilePaths.remote==='此电脑'||!s.macFileSelected.local.length)+macFileButton('← 发送','mac-file-send:remote',!online||!s.macFileSelected.remote.length)+'</div><div class="mac-file-panes">'+macFilePane('local')+macFilePane('remote')+'</div><section class="mac-file-transfers"><header><h2>传输列表</h2><div>'+macFileButton('全部开始','mac-file-batch:resume',!online||!tasks.some(t=>['paused','waiting'].includes(t.status)))+macFileButton('全部暂停','mac-file-batch:pause',!tasks.some(t=>t.status==='running'))+macFileButton('全部取消','mac-file-batch:cancel',!tasks.some(t=>['paused','running','waiting'].includes(t.status)))+macFileButton('清除完成任务','mac-file-batch:clear',!tasks.some(t=>['done','cancelled'].includes(t.status)))+'</div></header><div class="mac-file-task-table"><table><thead><tr><th>名称</th><th>状态</th><th>大小</th><th>发送路径</th><th>接收路径</th><th>操作</th></tr></thead><tbody>'+macFileTaskRows()+'</tbody></table>'+(!tasks.length?'<p class="mac-file-empty">暂无传输任务 · 选择文件后点击发送</p>':'')+'</div></section><p class="mac-file-notice" role="status">'+esc(s.macFileNotice||(s.macFilePaths.remote==='此电脑'?'请先打开远端目标文件夹，再发送本机文件。':''))+'</p></main>';
}
function macFileNavigate(side,path){s.macFileHistory[side].push(s.macFilePaths[side]);s.macFilePaths[side]=path;s.macFileSelected[side]=[];}
function macFileSetTask(t,verb){if(verb==='cancel'&&['running','paused','waiting'].includes(t.status))t.status='cancelled';if(verb==='pause'&&t.status==='running')t.status='paused';if(verb==='resume'&&device().online&&!device().blocked&&['paused','waiting'].includes(t.status))t.status='running';}
function macFilesAction(a){
 if(!a.startsWith('mac-file-'))return false;macFilesInit();const [op,side,id]=a.split(':');
 if(op==='mac-file-select'){const sel=s.macFileSelected[side];s.macFileSelected[side]=sel.includes(id)?sel.filter(x=>x!==id):sel.concat(id);}
 if(op==='mac-file-open'){const f=macFileEntries(side).find(f=>f.id===id);if(f&&f.type!=='file')macFileNavigate(side,(s.macFilePaths[side]==='/'?'':s.macFilePaths[side])+'/'+f.name);}
 if(op==='mac-file-up'){const p=s.macFilePaths[side];const parent=p.slice(0,p.lastIndexOf('/'));macFileNavigate(side,parent||(side==='local'||device().os==='macOS'?'/':'此电脑'));}
 if(op==='mac-file-back'&&s.macFileHistory[side].length){s.macFilePaths[side]=s.macFileHistory[side].pop();s.macFileSelected[side]=[];}
 if(op==='mac-file-refresh'){s.macFileSelected[side]=[];s.macFileNotice=(side==='local'?'本机':'远端')+'文件列表已刷新';}
 if(op==='mac-file-send'&&device().online&&!device().blocked&&!(side==='local'&&s.macFilePaths.remote==='此电脑')){const targetSide=side==='local'?'remote':'local';const selected=macFileEntries(side).filter(f=>f.type==='file'&&s.macFileSelected[side].includes(f.id));for(const f of selected)s.macFileTasks.push({id:Date.now()+'-'+Math.random().toString(36).slice(2,7),name:f.name,size:f.size,source:s.macFilePaths[side],target:s.macFilePaths[targetSide],targetSide,status:'running',progress:0});s.macFileSelected[side]=[];s.macFileNotice=selected.length?'已添加 '+selected.length+' 个传输任务':'';}
 if(op==='mac-file-task'){const task=s.macFileTasks.find(t=>t.id===id);if(task)macFileSetTask(task,side);}
 if(op==='mac-file-batch'){if(side==='clear')s.macFileTasks=s.macFileTasks.filter(t=>!['done','cancelled'].includes(t.status));else s.macFileTasks.forEach(t=>macFileSetTask(t,side));}
 render();return true;
}
document.addEventListener('change',e=>{const input=e.target;if(!input.matches('[data-mac-file-side],[data-mac-file-all]'))return;macFilesInit();const side=input.dataset.macFileSide||input.dataset.macFileAll;if(input.dataset.macFileAll)s.macFileSelected[side]=input.checked?macFileEntries(side).filter(f=>f.type==='file').map(f=>f.id):[];else{const id=input.dataset.macFileId;s.macFileSelected[side]=input.checked?[...new Set(s.macFileSelected[side].concat(id))]:s.macFileSelected[side].filter(x=>x!==id);}render();});
setInterval(()=>{
 if(typeof s==='undefined'||s.platform!=='mac'||s.page!=='files'||s.modal||!s.macFileTasks)return;let changed=false;
 for(const t of s.macFileTasks){if(t.status!=='running')continue;if(!device().online||device().blocked){t.status='waiting';changed=true;continue;}t.progress=Math.min(100,t.progress+10);changed=true;if(t.progress===100){t.status='done';const key=t.targetSide+':'+t.target;s.macFileReceived[key]??=[];if(!s.macFileReceived[key].some(f=>f.name===t.name))s.macFileReceived[key].push({name:t.name,type:'file',size:t.size,date:'2026/09/27 15:06'});}}
 if(changed)render();
},1200);

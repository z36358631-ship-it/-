/* Virtual, in-memory file transfer prototype. No filesystem or network access. */
function macFilesInit(){
 if(s.macFileDevice!==s.device){s.macFileDevice=s.device;s.macFilePaths={local:'/Users/mac/Documents',remote:device().os==='macOS'?'/Users/remote/Documents':'此电脑'};s.macFileHistory={local:[],remote:[]};s.macFileSelected={local:[],remote:[]};s.macFileTasks=[];s.macFileNotice='';s.macFileReceived={};s.macFileDirectories={};}
}
function macFileEntries(side,path=s.macFilePaths[side]){
 let items=[];
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
  else if(path.split('/').filter(Boolean).length>3)items=[['项目记录.txt','file','12 KB'],['资料归档.zip','file','8.6 MB']];
  else items=[['项目资料','folder','—'],['会议纪要.pages','file','256 KB'],['项目方案.pdf','file','3.2 MB'],['桌面截图.png','file','1.1 MB']];
 }else{
  if(path==='此电脑')items=[['Windows (C:)','drive','—'],['Data (D:)','drive','—'],['文档','folder','—'],['桌面','folder','—'],['图片','folder','—'],['下载','folder','—']];
  else if(path.split('/').length>2)items=[['项目记录.txt','file','12 KB'],['资料归档.zip','file','8.6 MB']];
  else items=[['共享资料','folder','—'],['会议纪要.docx','file','256 KB'],['项目方案.pdf','file','3.2 MB'],['桌面截图.png','file','1.1 MB']];
 }
 const base=s.macFileDirectories?.[side+':'+path]||items.map(a=>({name:a[0],type:a[1],size:a[2],date:a[1]==='drive'?'—':'2026/09/24 15:06'}));
 return base.map((f,i)=>({...f,id:String(i)})).concat((s.macFileReceived[side+':'+path]||[]).map((f,i)=>({...f,id:'received'+i})));
}
function macFileButton(label,action,disabled=false,cls=''){return '<button type="button" class="'+cls+'" data-action="'+action+'"'+(disabled?' disabled':'')+'>'+label+'</button>';}
function macFilePane(side){
 const local=side==='local',path=s.macFilePaths[side],items=macFileEntries(side),sel=s.macFileSelected[side],selectable=items.filter(f=>f.type==='file'||f.type==='folder');
 const selectedAll=selectable.length&&selectable.every(f=>sel.includes(f.id));
 return '<section class="mac-file-pane"><div class="mac-file-device"><strong>'+esc(local?'我的 Mac':device().name)+'</strong><span>'+(local?'本机':'远端')+'</span></div><div class="mac-file-toolbar">'+macFileButton(icon('back'),'mac-file-back:'+side,!s.macFileHistory[side].length,'icon-btn')+macFileButton('↑','mac-file-up:'+side,path===(local||device().os==='macOS'?'/':'此电脑'),'icon-btn')+macFileButton(icon('refresh'),'mac-file-refresh:'+side,false,'icon-btn')+'<div class="mac-file-path" title="'+esc(path)+'">'+icon('folder')+esc(path)+'</div></div><div class="mac-file-table"><table><thead><tr><th><input type="checkbox" aria-label="选择'+(local?'本机':'远端')+'全部项目" data-mac-file-all="'+side+'" '+(selectedAll?'checked':'')+'></th><th>名称</th><th>修改日期</th><th>类型</th><th>大小</th></tr></thead><tbody>'+items.map(f=>'<tr class="'+(sel.includes(f.id)?'is-selected':'')+'"><td>'+((f.type==='file'||f.type==='folder')?'<input type="checkbox" aria-label="选择 '+esc(f.name)+'" data-mac-file-side="'+side+'" data-mac-file-id="'+f.id+'" '+(sel.includes(f.id)?'checked':'')+'>':'')+'</td><td>'+macFileButton(icon(f.type==='file'?'file':f.type==='drive'?'drive':'folder')+esc(f.name),f.type==='file'?'mac-file-select:'+side+':'+f.id:'mac-file-open:'+side+':'+f.id,false,'mac-file-name')+'</td><td>'+f.date+'</td><td>'+(f.type==='file'?'文件':f.type==='drive'?'磁盘':'文件夹')+'</td><td>'+f.size+'</td></tr>').join('')+'</tbody></table></div><div class="mac-file-pane-foot">'+items.length+' 项'+(sel.length?' · 已选择 '+sel.length+' 个项目':'')+'</div></section>';
}
function macFileTaskRows(){
 const labels={running:'传输中',paused:'已暂停',done:'已完成',cancelled:'已取消',skipped:'已跳过',waiting:'等待设备上线',conflict:'等待处理同名文件',failed:'传输失败'};
 return s.macFileTasks.map(t=>'<tr><td>'+esc(t.outputName||t.name)+(t.kind==='folder'?'<small class="mac-file-task-kind">文件夹</small>':'')+'</td><td><span>'+labels[t.status]+(t.status==='running'?' '+t.progress+'%':'')+'</span>'+(['running','paused'].includes(t.status)?'<progress value="'+t.progress+'" max="100"></progress>':'')+'</td><td>'+t.size+'</td><td title="'+esc(t.source)+'">'+esc(t.source)+'</td><td title="'+esc(t.target)+'">'+esc(t.target)+'</td><td class="mac-file-task-actions">'+(t.status==='conflict'?macFileButton('跳过','mac-file-conflict:skip:'+t.id)+macFileButton('保留两者','mac-file-conflict:keep:'+t.id):(['running','paused','waiting','failed'].includes(t.status)?macFileButton(t.status==='running'?'暂停':t.status==='failed'?'重试':'继续','mac-file-task:'+(t.status==='running'?'pause':'resume')+':'+t.id,(!device().online||device().blocked)&&t.status!=='running')+macFileButton('取消','mac-file-task:cancel:'+t.id):'—'))+'</td></tr>').join('');
}
function macFiles(){
 macFilesInit();const online=device().online&&!device().blocked,tasks=s.macFileTasks;
 return '<header class="head mac-file-heading">'+ib('返回上一页','file-back','back')+'<h1>文件传输</h1><span class="mac-file-demo-note">演示文件</span></header><main class="mac-files-content">'+(!online?'<div class="mac-file-offline">'+(device().blocked?'该设备暂不支持文件传输。':'设备已离线，暂时无法传输文件。')+'</div>':'')+'<div class="mac-file-sendbar">'+macFileButton('发送 →','mac-file-send:local',!online||s.macFilePaths.remote==='此电脑'||!s.macFileSelected.local.length)+macFileButton('← 发送','mac-file-send:remote',!online||!s.macFileSelected.remote.length)+'</div><div class="mac-file-panes">'+macFilePane('local')+macFilePane('remote')+'</div><section class="mac-file-transfers"><header><h2>传输列表</h2><div>'+macFileButton('全部开始','mac-file-batch:resume',!online||!tasks.some(t=>['paused','waiting','failed'].includes(t.status)))+macFileButton('全部暂停','mac-file-batch:pause',!tasks.some(t=>t.status==='running'))+macFileButton('全部取消','mac-file-batch:cancel',!tasks.some(t=>['paused','running','waiting','failed','conflict'].includes(t.status)))+macFileButton('清除完成任务','mac-file-batch:clear',!tasks.some(t=>['done','cancelled','skipped'].includes(t.status)))+'</div></header><div class="mac-file-task-table"><table><thead><tr><th>名称</th><th>状态</th><th>大小</th><th>发送路径</th><th>接收路径</th><th>操作</th></tr></thead><tbody>'+macFileTaskRows()+'</tbody></table>'+(!tasks.length?'<p class="mac-file-empty">暂无传输任务 · 选择文件后点击发送</p>':'')+'</div></section><p class="mac-file-notice" role="status">'+esc(s.macFileNotice||(s.macFilePaths.remote==='此电脑'?'请先打开远端目标文件夹，再发送本机文件。':''))+'</p></main>';
}
function macFileNavigate(side,path){s.macFileHistory[side].push(s.macFilePaths[side]);s.macFilePaths[side]=path;s.macFileSelected[side]=[];}
function macFileSetTask(t,verb){if(verb==='cancel'&&['running','paused','waiting','failed','conflict'].includes(t.status))t.status='cancelled';if(verb==='pause'&&t.status==='running')t.status='paused';if(verb==='resume'&&device().online&&!device().blocked&&['paused','waiting','failed'].includes(t.status))t.status='running';}
function macFilesAction(a){
 if(!a.startsWith('mac-file-'))return false;macFilesInit();const [op,side,id]=a.split(':');
 if(op==='mac-file-conflict'){const task=s.macFileTasks.find(t=>t.id===id);if(task&&task.status==='conflict'){if(side==='skip'){task.status='skipped';s.macFileNotice='已跳过同名项目「'+task.name+'」';}if(side==='keep'){task.outputName=macFileUniqueName(task);task.conflictAction='keep';task.status=macFileOnline()?'running':'waiting';s.macFileNotice='将保留副本「'+task.outputName+'」';}}}
 if(op==='mac-file-select'){const sel=s.macFileSelected[side];s.macFileSelected[side]=sel.includes(id)?sel.filter(x=>x!==id):sel.concat(id);}
 if(op==='mac-file-open'){const f=macFileEntries(side).find(f=>f.id===id);if(f&&f.type!=='file')macFileNavigate(side,(s.macFilePaths[side]==='/'?'':s.macFilePaths[side])+'/'+f.name);}
 if(op==='mac-file-up'){const p=s.macFilePaths[side];const parent=p.slice(0,p.lastIndexOf('/'));macFileNavigate(side,parent||(side==='local'||device().os==='macOS'?'/':'此电脑'));}
 if(op==='mac-file-back'&&s.macFileHistory[side].length){s.macFilePaths[side]=s.macFileHistory[side].pop();s.macFileSelected[side]=[];}
 if(op==='mac-file-refresh'){s.macFileSelected[side]=[];s.macFileNotice=(side==='local'?'本机':'远端')+'文件列表已刷新';}
 if(op==='mac-file-send'&&device().online&&!device().blocked&&!(side==='local'&&s.macFilePaths.remote==='此电脑')){const targetSide=side==='local'?'remote':'local';const targetPath=s.macFilePaths[targetSide];const selected=macFileEntries(side).filter(f=>(f.type==='file'||f.type==='folder')&&s.macFileSelected[side].includes(f.id));for(const f of selected){const conflict=macFileNameTaken(targetSide,targetPath,f.name);s.macFileTasks.push({id:Date.now()+'-'+Math.random().toString(36).slice(2,7),name:f.name,size:f.type==='folder'?'目录':f.size,kind:f.type,source:s.macFilePaths[side],target:targetPath,targetSide,status:conflict?'conflict':'running',progress:0,conflictAction:null,tree:f.type==='folder'?macFileSnapshot(side,macFileJoin(s.macFilePaths[side],f.name)):null});}s.macFileSelected[side]=[];s.macFileNotice=selected.length?'已添加 '+selected.length+' 个传输任务':'';}
 if(op==='mac-file-task'){const task=s.macFileTasks.find(t=>t.id===id);if(task)macFileSetTask(task,side);}
 if(op==='mac-file-batch'){if(side==='clear')s.macFileTasks=s.macFileTasks.filter(t=>!['done','cancelled','skipped'].includes(t.status));else s.macFileTasks.forEach(t=>macFileSetTask(t,side));}
 render();return true;
}
document.addEventListener('change',e=>{const input=e.target;if(!input.matches('[data-mac-file-side],[data-mac-file-all]'))return;macFilesInit();const side=input.dataset.macFileSide||input.dataset.macFileAll;if(input.dataset.macFileAll)s.macFileSelected[side]=input.checked?macFileEntries(side).filter(f=>f.type==='file'||f.type==='folder').map(f=>f.id):[];else{const id=input.dataset.macFileId;s.macFileSelected[side]=input.checked?[...new Set(s.macFileSelected[side].concat(id))]:s.macFileSelected[side].filter(x=>x!==id);}render();});
// Reservations include queued/running tasks, not just completed files.
function macFileOnline(){return device().online&&!device().blocked;}
function macFileJoin(path,name){return (path==='/'?'':path)+'/'+name;}
function macFileNameTaken(side,path,name,exclude=''){
 return macFileEntries(side,path).some(f=>f.name===name)||s.macFileTasks.some(t=>t.id!==exclude&&t.targetSide===side&&t.target===path&&!['done','cancelled','skipped','conflict'].includes(t.status)&&(t.outputName||t.name)===name);
}
function macFileUniqueName(t){let name=t.name,n=1;const dot=t.kind!=='folder'?t.name.lastIndexOf('.'):-1,stem=dot>0?t.name.slice(0,dot):t.name,ext=dot>0?t.name.slice(dot):'';while(macFileNameTaken(t.targetSide,t.target,name,t.id))name=stem+' ('+(n++)+')'+ext;return name;}
function macFileSnapshot(side,path,depth=0){return macFileEntries(side,path).map(f=>({...f,children:f.type==='folder'&&depth<12?macFileSnapshot(side,macFileJoin(path,f.name),depth+1):null}));}
function macFileInstallTree(side,path,tree){s.macFileDirectories??={};s.macFileDirectories[side+':'+path]=tree.map(({children,...f})=>f);for(const f of tree)if(f.type==='folder')macFileInstallTree(side,macFileJoin(path,f.name),f.children||[]);}
function macFilesTick(){
 if(!s.macFileTasks||s.macFileDevice!==s.device)return false;let changed=false;
 for(const t of s.macFileTasks){if(t.status!=='running')continue;if(!macFileOnline()){t.status='waiting';changed=true;continue;}t.progress=Math.min(100,t.progress+10);changed=true;if(t.progress===100){const name=t.outputName||t.name;if(macFileNameTaken(t.targetSide,t.target,name,t.id)){t.status='conflict';t.progress=0;continue;}t.status='done';const key=t.targetSide+':'+t.target;s.macFileReceived[key]??=[];s.macFileReceived[key].push({name,type:t.kind||'file',size:t.size,date:'2026/09/27 15:06'});if(t.kind==='folder')macFileInstallTree(t.targetSide,macFileJoin(t.target,name),t.tree||[]);}}
 return changed;
}
setInterval(()=>{if(typeof s==='undefined'||s.platform!=='mac')return;if(macFilesTick()&&s.page==='files'&&!s.modal)render();},1200);

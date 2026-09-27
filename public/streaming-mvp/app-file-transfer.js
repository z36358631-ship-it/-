/* APP transfer demo. Files, folders, selections and saved copies stay in memory. */
function appFilesReset(){
 s.appSavedFiles={};s.appFilePending=null;s.appFileNotice='';s.appPickerDevice='';s.appFileSequence=0;
}
function appFilesInit(){
 if(!Array.isArray(s.files))s.files=[];
 if(!s.appSavedFiles||typeof s.appSavedFiles!=='object')s.appSavedFiles={};
 if(!Number.isFinite(s.appFileSequence))s.appFileSequence=0;
 for(const f of s.files){
  if(!f.deviceId)f.deviceId=s.device;
  if(!f.direction)f.direction=f.kind==='received'?'download':'file';
  f.progress=Math.max(0,Math.min(100,Number(f.progress)||0));
  if(f.failed)f.paused=true;
  if(['sent','received'].includes(f.kind)&&!f.appSaved){appFileSave(f);f.appSaved=true;}
 }
}
function appFileDirection(direction){return direction==='download'?'download':'upload';}
function appFileSavedKey(deviceId,direction){return JSON.stringify([String(deviceId),appFileDirection(direction)]);}
function appFileSaved(deviceId,direction){
 const key=appFileSavedKey(deviceId,direction);
 if(!Object.prototype.hasOwnProperty.call(s.appSavedFiles,key))s.appSavedFiles[key]=[];
 return s.appSavedFiles[key];
}
function appFileSave(f){
 const saved=appFileSaved(f.deviceId||s.device,f.direction|| (f.kind==='received'?'download':'file'));
 if(!saved.some(x=>x.name===f.name))saved.push({name:String(f.name),size:String(f.size||''),type:f.type||'file'});
}
function appFileTarget(deviceId=s.device){return devices.find(d=>d.id===deviceId);}
function appFileAllowed(deviceId=s.device){const d=appFileTarget(deviceId);return !!d&&d.online&&!d.blocked&&!(['Android','iOS'].includes(d.os));}
function appFileUnavailable(deviceId=s.device){const d=appFileTarget(deviceId);return !d?'设备已移除，无法传输文件。':!d.online?'设备已离线，等待设备上线后手动继续。':'该设备暂不允许文件传输。';}
function appFileCurrent(){appFilesInit();return s.files.filter(f=>f.deviceId===s.device);}
function appFileNames(deviceId,direction,excludeId){
 const dir=appFileDirection(direction),saved=appFileSaved(deviceId,direction).map(f=>f.name);
 const active=s.files.filter(f=>f.deviceId===deviceId&&f.kind==='running'&&appFileDirection(f.direction)===dir&&String(f.id)!==String(excludeId)).map(f=>f.name);
 return new Set(saved.concat(active));
}
function appFileCopyName(file){
 const names=appFileNames(file.deviceId,file.direction),name=String(file.name),dot=file.type==='folder'?-1:name.lastIndexOf('.');
 const stem=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';let n=1,candidate=name;
 while(names.has(candidate))candidate=stem+' ('+(n++)+')'+ext;
 return candidate;
}
function appFileCandidates(){
 if(s.pick==='media')return [{id:'default',name:'示例图片.png',size:'11 KB',type:'file'},{id:'video',name:'演示视频.mp4',size:'54 KB',type:'file'}];
 return [{id:'default',name:'项目说明.txt',size:'84 B',type:'file'},{id:'pdf',name:'产品说明.pdf',size:'2.4 MB',type:'file'},{id:'folder',name:'项目资料',size:'84 B · 1 个文件',type:'folder'}];
}
function appFileButton(label,action,cls='',ic='',disabled=false){return btn(label,action,cls,ic).replace('<button','<button type="button"'+(disabled?' disabled':''));}
function appFileNotice(text){s.appFileNotice=text;}
function appFileSection(kind,title){
 const list=appFileCurrent().filter(f=>f.kind===kind),allowed=appFileAllowed();
 return '<section class="file-section" data-file-kind="'+kind+'"><div class="file-title"><span>'+title+'（'+list.length+'）</span>'+(list.length?appFileButton(kind==='running'?'批量管理':'清空记录','file-manage:'+kind):'')+'</div>'+list.map(f=>{
  const waiting=!!f.waiting,status=f.failed?'传输失败':waiting?(allowed?'等待继续传输':'等待设备上线'):f.paused?'已暂停':kind==='running'?'传输中 '+f.progress+'%':kind==='sent'?'已发送':'已接收';
  const resume=!!f.failed||waiting||!!f.paused,label=f.failed?'重新传输':resume?'继续传输':'暂停传输';
  const actionButtons=kind==='running'?'<div class="app-file-row-actions">'+appFileButton(label,(f.failed?'file-retry:':'file-pause:')+f.id,'ghost','',resume&&!allowed)+appFileButton('取消','file-cancel:'+f.id,'ghost danger')+'</div>':'';
  return '<div class="file-item" data-file-id="'+esc(f.id)+'"><div class="row">'+icon(f.type==='folder'?'folder':'file')+'<div class="grow"><h3>'+esc(f.name)+'</h3><small>'+esc(f.size||'')+' · '+status+'</small>'+(f.failed?'<small class="app-file-reason">'+esc(f.error||'连接中断，请重新传输。')+'</small>':waiting?'<small class="app-file-reason">'+esc(allowed?'设备已恢复上线，请点击继续传输。':appFileUnavailable(f.deviceId))+'</small>':'')+'</div>'+actionButtons+'</div>'+(kind==='running'?'<div class="progress"><i style="width:'+f.progress+'%"></i></div>':'')+'</div>';
 }).join('')+'</section>';
}
function appFiles(){
 appFilesInit();const allowed=appFileAllowed();
 return head('文件传输',false,ib('返回上一页','file-back','back'))+'<main class="content file-content app-file-content"><div><div class="file-top">'+appFileButton('发送照片 & 视频','file-pick:media','','upload',!allowed)+appFileButton('发送文件','file-pick:file','','file',!allowed)+appFileButton('从电脑下载文件到手机','file-pick:download','','download',!allowed)+'</div>'+(!allowed?'<p class="app-file-availability" role="status">'+esc(appFileUnavailable())+'</p>':'')+'</div><div>'+appFileSection('running','传输中')+appFileSection('received','已接收')+appFileSection('sent','已发送')+'<p class="app-file-notice" role="status">'+esc(s.appFileNotice||'')+'</p><p class="file-footer">电脑文件保存位置<br>'+esc(device()?.os==='macOS'?'/Users/remote/Downloads/GameHub':'C:\\Users\\Public\\Downloads\\GameHub')+'</p></div></main>';
}
function appFileDialog(title,body,buttons){return '<div class="modal-shade app-file-shade"><section class="dialog app-file-dialog" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><h2>'+esc(title)+'</h2><div class="app-file-dialog-body">'+body+'</div><div class="actions">'+buttons+'</div></section></div>';}
function appFilePreviewConflict(){
 if(s.appFilePending||s.source!=='conflict')return;
 const sample={...appFileCandidates()[0],deviceId:s.device,direction:s.pick||'file'};
 appFileSave(sample);s.appFilePending=sample;
}
function appFileModal(){
 if(s.platform==='mac'||!['picker','conflict','clear-records','file-manage'].includes(s.modal))return null;
 appFilesInit();const cancel=appFileButton('取消','cancel','ghost'),allowed=appFileAllowed();
 if(s.modal==='picker'){
  const entries=appFileCandidates(),title=s.pick==='download'?'电脑文件':s.pick==='media'?'选择照片与视频':'选择文件';
  const body='<p class="app-file-picker-note">选择要'+(s.pick==='download'?'下载':'发送')+'的演示'+(s.pick==='media'?'照片或视频':'文件或文件夹')+'</p><div class="panel app-file-picker-list">'+entries.map(f=>appFileButton('<span class="grow"><strong>'+esc(f.name)+'</strong><small>'+esc(f.size)+'</small></span>',f.id==='default'?'file-selected':'file-selected:'+f.id,'line',f.type==='folder'?'folder':'file',!allowed)).join('')+'</div>'+(!allowed?'<p class="app-file-availability">'+esc(appFileUnavailable())+'</p>':'');
  return appFileDialog(title,body,cancel);
 }
 if(s.modal==='conflict'){
  appFilePreviewConflict();const f=s.appFilePending;
  return appFileDialog('文件已存在','<p>目标位置'+(f?'已有「'+esc(f.name)+'」':'已有同名文件')+'，请选择本次传输的处理方式。</p>'+(!allowed?'<p class="app-file-availability">'+esc(appFileUnavailable())+'</p>':''),appFileButton('跳过','file-skip')+appFileButton('保留两者','file-keep','primary','',!allowed));
 }
 if(s.modal==='clear-records')return appFileDialog('清空记录','<p>仅清空'+(s.clearKind==='received'?'已接收':'已发送')+'的传输记录，不删除已保存的文件。</p>',appFileButton('清空记录','clear-confirm','primary')+cancel);
 const running=appFileCurrent().filter(f=>f.kind==='running'),canPause=running.some(f=>!f.paused&&!f.failed&&!f.waiting),canResume=allowed&&running.some(f=>f.paused||f.failed||f.waiting);
 return appFileDialog('批量管理','<p>管理当前设备的传输任务。</p>',appFileButton('暂停全部','pause-all','','',!canPause)+appFileButton('继续全部','resume-all','','',!canResume)+appFileButton('取消全部','cancel-all','danger','',!running.length)+cancel);
}
function appFileQueue(file){
 if(!appFileAllowed(file.deviceId)){appFileNotice(appFileUnavailable(file.deviceId));return false;}
 const next={id:'app-'+Date.now()+'-'+(++s.appFileSequence),name:String(file.name),size:String(file.size||''),type:file.type||'file',deviceId:file.deviceId,direction:file.direction,kind:'running',progress:0,paused:false,waiting:false,failed:false};
 s.files.push(next);s.appFilePending=null;s.modal='';s.pending='';appFileNotice('已添加「'+next.name+'」');return true;
}
function appFileResume(f){
 if(!appFileAllowed(f.deviceId)){appFileNotice(appFileUnavailable(f.deviceId));return;}
 if(f.failed)f.progress=0;
 f.paused=false;f.waiting=false;f.failed=false;f.error='';
}
function appFileAction(a){
 if(s.platform==='mac')return false;
 const [op,id]=a.split(':'),ops=['file-pick','file-selected','file-pause','file-retry','file-cancel','file-manage','clear-confirm','pause-all','resume-all','cancel-all','file-skip','file-keep'];
 if(!ops.includes(op)&&!(op==='cancel'&&['picker','conflict','clear-records','file-manage'].includes(s.modal)))return false;
 appFilesInit();
 if(op==='cancel'){s.appFilePending=null;s.modal='';s.pending='';s.pendingAction='';}
 if(op==='file-pick'){
  if(!appFileAllowed())appFileNotice(appFileUnavailable());
  else{s.pick=['media','download'].includes(id)?id:'file';s.appPickerDevice=s.device;s.appFilePending=null;s.pending='file';s.modal=device().busy?'takeover':'picker';s.appFileNotice='';}
 }
 if(op==='file-selected'&&s.modal==='picker'){
  const selected=appFileCandidates().find(f=>f.id===(id||'default'));
  if(selected){
   const file={...selected,deviceId:s.device,direction:s.pick||'file'};
   if(!appFileAllowed())appFileNotice(appFileUnavailable());
   else if(s.appPickerDevice&&s.appPickerDevice!==s.device){s.modal='';appFileNotice('设备已切换，请重新选择文件。');}
   else if(appFileNames(s.device,file.direction).has(file.name)){s.appFilePending=file;s.modal='conflict';}
   else appFileQueue(file);
  }
 }
 if(op==='file-skip'&&s.modal==='conflict'){const name=s.appFilePending?.name;s.appFilePending=null;s.modal='';s.pending='';appFileNotice(name?'已跳过「'+name+'」':'已跳过同名文件');}
 if(op==='file-keep'&&s.modal==='conflict'){
  appFilePreviewConflict();const file=s.appFilePending;
  if(file&&appFileAllowed(file.deviceId)&&file.deviceId===s.device)appFileQueue({...file,name:appFileCopyName(file)});
  else appFileNotice(appFileUnavailable(file?.deviceId));
 }
 if(['file-pause','file-retry','file-cancel'].includes(op)){
  const f=appFileCurrent().find(f=>String(f.id)===id&&f.kind==='running');
  if(f){
   if(op==='file-cancel'){s.files=s.files.filter(x=>x!==f);appFileNotice('已取消「'+f.name+'」');}
   else if(op==='file-retry'||f.paused||f.failed||f.waiting)appFileResume(f);
   else f.paused=true;
  }
 }
 if(op==='file-manage'&&['running','received','sent'].includes(id)){s.clearKind=id;s.modal=id==='running'?'file-manage':'clear-records';}
 if(op==='clear-confirm'&&s.modal==='clear-records'&&['sent','received'].includes(s.clearKind)){
  s.files=s.files.filter(f=>f.deviceId!==s.device||f.kind!==s.clearKind);s.modal='';appFileNotice('传输记录已清空，已保存的文件仍保留。');
 }
 if(['pause-all','resume-all','cancel-all'].includes(op)&&s.modal==='file-manage'){
  const running=appFileCurrent().filter(f=>f.kind==='running');
  if(op==='cancel-all'){s.files=s.files.filter(f=>f.deviceId!==s.device||f.kind!=='running');appFileNotice('已取消当前设备的全部传输任务。');}
  else for(const f of running){if(op==='pause-all'){if(!f.failed&&!f.waiting)f.paused=true;}else if(f.paused||f.waiting||f.failed)appFileResume(f);}
  s.modal='';
 }
 render();return true;
}
function appFilesTick(){
 if(typeof s==='undefined'||s.platform==='mac')return false;
 appFilesInit();let changed=false;
 for(const f of s.files){
  if(f.kind!=='running'||f.failed||f.waiting||f.paused)continue;
  if(!appFileAllowed(f.deviceId)){f.waiting=true;f.paused=true;changed=true;continue;}
  f.progress=Math.min(100,f.progress+8);changed=true;
  if(f.progress===100){f.kind=f.direction==='download'?'received':'sent';f.waiting=false;f.paused=false;appFileSave(f);f.appSaved=true;}
 }
 return changed;
}

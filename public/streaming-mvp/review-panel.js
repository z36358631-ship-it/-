// Review tools are separate from product UI. Show one category at a time.
const fallbackGroups={
 '设备列表':[['loading','加载中'],['empty','暂无设备'],['load-error','加载失败']],
 '设备详情':[['offline','电脑离线'],['blocked','设备禁止远控'],['unsupported-phone','设备类型不支持']],
 '远程会话':[['connecting','连接中'],['failed','连接失败'],['ended','会话已结束']],
 '文件传输':[['files','暂无传输记录'],['file-offline','电脑离线'],['file-failed','传输失败']],
 '远程开机':[['wake-idle','尚未开机'],['wake-loading','等待上线'],['wake-failed','开机失败'],['wake-pending','设置待生效']]
};
function currentReviewGroup(){if(s.page==='wake-guide'||s.powerKind==='boot'&&s.modal.startsWith('power-'))return '远程开机';if(s.page==='session'||s.page==='ended')return '远程会话';if(s.page==='files')return '文件传输';if(['detail','properties','more','quicklaunch'].includes(s.page))return '设备详情';return '设备列表';}
function reviewSettings(){return '<p class="review-hint">切换使用场景与预览设备。</p><div class="mode-switch">'+['normal','game','office'].map((id,i)=>btn(['普通模式','游戏模式','AI办公模式'][i],'mode:'+id,s.mode===id?'active':'')).join('')+'</div><label class="review-field">预览布局<select id="platform"><option value="app" '+(s.platform==='app'?'selected':'')+'>APP 竖屏</option><option value="landscape" '+(s.platform==='landscape'?'selected':'')+'>APP 横屏</option><option value="mac" '+(s.platform==='mac'?'selected':'')+'>Mac</option></select></label>'+btn(s.compare?'关闭 UU 对照':'打开 UU 实机对照','compare','review-compare')+'<p class="review-links"><a href="prd.html">查看 PRD</a> · <a href="comparison.html">逐项比对与差异</a></p>';}
const reviewItems={
 '设备与详情':[['设备列表','list'],['设备详情','detail'],['设备属性','properties']],
 '远程桌面':[['远程桌面','session'],['操作面板','operation'],['显示设置','display'],['安全设置','security'],['键盘输入','keyboard'],['悬浮鼠标','mouse'],['办公窗口','windows']],
 '开机流程':[['远程开机','wake-idle']],
 '文件与工具':[['文件传输','files'],['更多工具','more']],
 '入口位置对比':[['游戏库入口','entry-library'],['我的设备入口','entry-profile']]
};
function reviewPageGroup(){return ({'设备列表':'设备与详情','设备详情':'设备与详情','远程会话':'远程桌面','文件传输':'文件与工具','远程开机':'开机流程'})[currentReviewGroup()];}
function review(){const group=reviewItems[s.reviewGroup]?s.reviewGroup:reviewPageGroup();let rows=reviewItems[group];if(s.platform!=='mac'&&group==='文件与工具')rows=[...rows,['ChatGPT','gpt']];if(s.platform==='mac'&&group==='远程桌面')rows=[...rows.filter(x=>x[1]!=='mouse'),['连接信号','net-good'],['连接不稳定','net-unstable'],['弱网提示','net-weak'],['网络恢复','net-recovered']];return '<aside class="review organized-review"><div class="row spread"><h2>状态预览</h2>'+ib('关闭状态面板','review','close')+'</div>'+(s.reviewTab==='settings'?btn('返回页面状态','review-tab:pages','review-back')+reviewSettings():'<label class="review-field">页面分类<select id="review-group">'+Object.keys(reviewItems).map(n=>'<option '+(n===group?'selected':'')+'>'+n+'</option>').join('')+'</select></label><div class="review-item-list">'+rows.map(([name,id])=>'<section class="review-item"><div class="review-item-row"><strong>'+name+'</strong>'+btn('缺省','review-preset:'+id+':default','review-default')+btn('穷举','review-preset:'+id+':full')+'</div></section>').join('')+'</div>'+btn('演示设置','review-tab:settings','review-compare'))+'</aside>';}
function applyReviewPreset(id,full){if(id==='gpt'){applyState('gpt');delete s.gptDevices[s.device];gptStore().selected=full?'plan':'new';s.gptHistory=false;s.gptFile='';render();return;}
 if(id.startsWith('net-')){applyState(full?id:'net-good');if(full){s.macNetOpen=id==='net-good';if(id==='net-recovered'){s.macReduced=true;s.macPreviousQuality={quality:'自动',fps:'60'};s.quality='流畅 2M';s.fps='30';}}render();return;}
 const target=id==='list'?(full?'list':'empty'):id==='detail'?(full?'busy':'detail'):id==='wake-idle'?(full?'wake-failed':'wake-idle'):id;
 applyState(target);
 s.reviewPresetFull=full;
 if(id==='detail')s.expanded=full;
 if(id==='properties'&&full)device().name='办公室的 Windows 电脑 · 设计与 AI 办公';
 if(id==='session'){s.desktop=!full;s.mouseOpen=false;if(full){s.activeWindow='doc';s.doc='项目讨论记录\n\n一、待办事项\n整理会议记录，完善方案并同步进度。\n\n二、AI 办公\n在电脑浏览器打开 AI 工具，继续编辑提示词和文档。';}}
 if(id==='security'){s.page='session';s.panel=s.platform==='mac'?'operation':'security';if(s.platform==='mac')s.macControlCategory='security';s.macLockAfter=full;s.macMuteHost=full;s.macRestoreSound=full;}
 if(id==='display'){if(s.platform==='mac'){s.panel='operation';s.macControlCategory='screen';}s.quality=full?'自定义':'自动';s.customBitrate=full?30:8;s.macBitrate=full?30:8;s.scale=full?'125%':'100%';}
 if(id==='operation'){s.mapping=full;if(s.platform==='mac')s.macControlCategory=full?'quality':'';}
 if(id==='keyboard'){s.keyboard=full?'电脑键盘':'输入法';if(full)s.doc='这是一段从手机输入到电脑的示例文字。';}
 if(id==='mouse')s.mouseOpen=full;
 if(id==='windows')s.previewEmptyWindows=!full;
 if(id==='files'&&full)s.files=[{...sampleFile('running'),name:'方案文档.docx',size:'12 MB',progress:36},{...sampleFile('running',true),name:'会议录音.mp3',size:'8 MB',progress:65},{...sampleFile('running',true),name:'附件.zip',size:'24 MB',failed:true},{...sampleFile('received'),name:'会议纪要.txt'},{...sampleFile('sent'),name:'产品截图.png'}];
 if(id==='files'&&s.platform==='mac'){macFilesInit();s.macFileTasks=full?[{id:'preview-running',name:'方案文档.docx',size:'12 MB',source:'/Users/demo/Documents/方案文档.docx',target:'C:/Users/Public/Documents',targetSide:'remote',status:'running',progress:36},{id:'preview-paused',name:'会议录音.mp3',size:'8 MB',source:'C:/Users/Public/Documents/会议录音.mp3',target:'/Users/demo/Documents',targetSide:'local',status:'paused',progress:65},{id:'preview-done',name:'产品截图.png',size:'2 MB',source:'/Users/demo/Documents/产品截图.png',target:'C:/Users/Public/Documents',targetSide:'remote',status:'done',progress:100},{id:'preview-failed',name:'附件.zip',size:'24 MB',source:'/Users/mac/Documents',target:'此电脑/文档',targetSide:'remote',status:'failed',progress:0},{id:'preview-conflict',name:'项目方案.pdf',size:'3.2 MB',source:'/Users/mac/Documents',target:'此电脑/文档',targetSide:'remote',status:'conflict',progress:0}]:[];}
 if(id==='more'&&!full)s.device='off';
 if(id==='entry-library'||id==='entry-profile')s.empty=!full;
 render();
}
function reviewAction(a){const[k,v,w]=a.split(':');if(k==='review-preset'){applyReviewPreset(v,w==='full');return true;}if(k==='review-tab'){s.reviewTab=v;render();return true;}if(k==='review'&&!s.review){s.reviewTab='pages';s.reviewGroup=reviewPageGroup();}return false;}
document.addEventListener('change',e=>{if(e.target.id==='review-group'){s.reviewGroup=e.target.value;render();}});

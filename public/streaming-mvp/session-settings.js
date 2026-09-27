// Session settings are simulated locally; no host configuration is changed.
const sessionResolutions=['3840 × 2160','2560 × 1440','1920 × 1080','1600 × 900','1366 × 768','1280 × 720','1024 × 768'];
function resetSessionSettings(){Object.assign(s,{resolution:'1920 × 1080',scale:'100%',rotation:'横向',customBitrate:8,macBitrate:8,macWindowOpacity:'100%',superScreen:false,previousScreen:null,macLockAfter:false,macMuteHost:false,macRestoreSound:false,macSendKeys:false,macHideFloat:false,autoUnlock:false,privacyPreset:'默认屏保'});}
function sessionSettingHeader(title,back='operation'){return '<div class="row">'+ib('返回'+(back==='display'?'显示':'操作'),'panel:'+back,'back')+'<h3 class="grow">'+title+'</h3>'+ib('收起面板','panel-close','close')+'</div>';}
function bitrateSlider(id,value){return '<label class="session-bitrate"><span>码率</span><input type="range" id="'+id+'" min="1" max="50" value="'+value+'" aria-label="码率"><output>'+value+' Mbps</output></label>';}
function sessionDisplayPanel(){return sessionSettingHeader('显示')+'<p class="title-section">帧率</p>'+seg('fps',['30','60','90','144'])+'<p class="title-section">画质</p>'+seg('quality',['自动','清晰 2M','高清 8M','原画 20M','自定义'])+(s.quality==='自定义'?bitrateSlider('session-bitrate',s.customBitrate||8):'')+'<p class="settings-note">流量会随实际画面与网络变化</p>'+line(s.superScreen?'超级屏':'显示屏 1','screen-select','monitor','<small>'+(s.superScreen?'虚拟屏幕':'物理屏幕')+'</small>')+line('分辨率','settings-resolution','monitor','<small>'+esc(s.resolution)+'</small>')+'<p class="title-section">缩放</p>'+seg('scale',['100%','125%','150%','175%'])+'<p class="title-section">屏幕方向</p>'+seg('rotation',['横向','纵向'])+line(s.superScreen?'切回物理显示屏':'切换使用超级屏','settings-super','screen');}
function sessionSecurityPanel(){return sessionSettingHeader('安全')+securityOptions();}
function securityOptions(){return (device().os==='Windows'?toggle('autoUnlock','自动解锁被控端'):'')+toggle('macLockAfter','远控结束后，被控端自动锁屏')+toggle('macMuteHost','被控端静音运行')+'<p class="settings-note">被控端静音后，控制端仍可播放声音。</p>'+toggle('macRestoreSound','结束后恢复被控端声音设置')+'<p class="title-section">被控端防窥模式</p>'+seg('macPrivacy',device().os==='Windows'?['关闭','黑屏','自定义屏保']:['关闭','自定义屏保'])+(s.macPrivacy==='自定义屏保'?line('设置隐私屏保','settings-privacy','image','<small>'+s.privacyPreset+'</small>'):'');}
function sessionSettingsModal(){let title='',body='',actions='';
 if(s.modal==='settings-resolution'){title='分辨率';body='<div class="settings-options">'+['跟随当前显示屏','跟随被控端',...sessionResolutions].map(v=>btn((s.resolution===v?'✓ ':'')+v,'settings-resolution-set:'+v,s.resolution===v?'active':'')).join('')+'</div>';}
 else if(s.modal==='settings-super'){title=s.superScreen?'切回物理显示屏？':'使用超级屏？';body=s.superScreen?'恢复使用物理显示屏及此前的分辨率。':'内容将适配至超级屏，同时关闭被控端显示屏。超级屏与虚拟副屏不能同时使用。';actions=btn('确定','settings-super-confirm','primary');}
 else if(s.modal==='settings-unlock'){title='自动解锁被控端';body='<label class="settings-password">Windows 开机密码<input id="settings-password" type="password" autocomplete="off" placeholder="请输入密码" aria-label="Windows 开机密码"></label><p class="settings-note">本次仅预览设置流程，不保存或发送输入内容。</p>';actions=btn('开启','settings-unlock-confirm','primary').replace('<button','<button disabled');}
 else if(s.modal==='settings-privacy'){title='隐私屏保';body='<div class="privacy-preview">'+icon('shield')+'<span>电脑正在远程使用</span></div><div class="settings-options">'+['默认屏保','纯黑屏保'].map(v=>btn((s.privacyPreset===v?'✓ ':'')+v,'settings-privacy-set:'+v,s.privacyPreset===v?'active':'')).join('')+'</div>';}
 else return null;
 return '<div class="modal-shade"><section class="dialog settings-dialog" role="dialog" aria-modal="true" aria-label="'+title+'"><h2>'+title+'</h2><div class="settings-body">'+body+'</div><div class="actions">'+actions+btn('取消','cancel','ghost')+'</div></section></div>';
}
function sessionSettingsAction(a){const [k,v,w]=a.split(':');
 if(['settings-resolution','mac-screen-resolution'].includes(k))s.modal='settings-resolution';
 else if(k==='settings-resolution-set'){if(!['跟随当前显示屏','跟随被控端',...sessionResolutions].includes(v))return true;s.resolution=v;s.modal='';}
 else if(['settings-super','mac-super-resolution'].includes(k))s.modal='settings-super';
 else if(k==='settings-super-confirm'){if(!s.superScreen){s.previousScreen={resolution:s.resolution,scale:s.scale,macVirtual:s.macVirtual,macScreen:s.macScreen};s.superScreen=true;s.resolution='2480 × 1116';s.scale='100%';s.macVirtual=false;s.macScreen='super';}else{Object.assign(s,s.previousScreen||{resolution:'1920 × 1080',scale:'100%',macScreen:'physical'});s.superScreen=false;s.previousScreen=null;}s.modal='';}
 else if(k==='toggle'&&v==='autoUnlock'){if(s.autoUnlock)s.autoUnlock=false;else s.modal='settings-unlock';}
 else if(k==='settings-unlock-confirm'){if(!document.querySelector('#settings-password')?.value.trim())return true;s.autoUnlock=true;s.modal='';}
 else if(k==='settings-privacy')s.modal='settings-privacy';
 else if(k==='settings-privacy-set'){s.privacyPreset=v;s.modal='';}
 else if(k==='set'&&['resolution','scale','rotation','quality','fps','macPrivacy'].includes(v)){s[v]=w;if(v==='quality'||v==='fps'){s.macReduced=false;s.macPreviousQuality=null;}}
 else return false;
 render();return true;
}
function sessionScreenStyle(){return '--remote-scale:'+parseInt(s.scale||'100%')/100+';--remote-aspect:'+(s.rotation==='纵向'?'9/16':'16/9')+';';}
document.addEventListener('input',e=>{if(e.target.id==='session-bitrate'){s.customBitrate=Number(e.target.value);e.target.parentElement.querySelector('output').textContent=s.customBitrate+' Mbps';}if(e.target.id==='settings-password'){const b=document.querySelector('[data-action="settings-unlock-confirm"]');if(b)b.disabled=!e.target.value.trim();}});

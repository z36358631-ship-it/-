// Portrait mobile scanner. Camera frames are decoded locally and never uploaded.
const remoteScanState={phase:'camera',id:'',error:'',stream:null,timer:null,generation:0};
function remoteScanStop(){remoteScanState.generation++;clearTimeout(remoteScanState.timer);remoteScanState.timer=null;for(const track of remoteScanState.stream?.getTracks()||[])track.stop();remoteScanState.stream=null;}
function remoteScanReset(){remoteScanStop();Object.assign(remoteScanState,{phase:'camera',id:'',error:''});}
function remoteScanActive(){return mobileAuth.loggedIn&&s.page==='scan-login';}
function remoteScanFail(message){remoteScanStop();remoteScanState.phase='error';remoteScanState.error=message;render();}
function remoteScanRead(raw){
 if(!remoteScanActive())return;
 const payload=RemoteQrDemo.parse(raw);
 if(!payload){remoteScanFail('请扫描盖世远程电脑端的登录二维码。');return;}
 if(payload.region!==mobileAuth.region){remoteScanFail('登录地区不同，请在两端选择同一地区后重新扫码。');return;}
 const record=RemoteQrDemo.get(payload.id);
 if(!record){remoteScanFail('此码无法在当前演示中校验。真实跨设备扫码需要接入账号服务，可用页面外的模拟入口体验流程。');return;}
 if(record.region!==payload.region||!['waiting','scanned'].includes(record.state)){remoteScanFail('二维码已失效，请在电脑端刷新后重新扫描。');return;}
 remoteScanStop();remoteScanState.id=record.id;remoteScanState.phase='confirm';remoteScanState.error='';RemoteQrDemo.update(record.id,'scanned');render();
}
function remoteScanClose(cancel=true){if(cancel&&remoteScanState.id&&remoteScanState.phase==='confirm')RemoteQrDemo.update(remoteScanState.id,'cancelled');remoteScanReset();s.page=s.mobileScanReturn||'mobile-profile';render();}
function remoteScanPage(){
 const t=remoteScanState;
 const header='<header class="head remote-scan-head">'+ib('关闭扫一扫','remote-scan-close','back')+'<h1>扫一扫</h1></header>';
 if(t.phase==='confirm')return header+'<main class="content remote-scan-confirm"><div class="remote-scan-mark">'+icon('monitor')+'</div><h2>登录电脑端盖世远程</h2><p>请确认这是你本人发起的电脑登录</p><div class="remote-scan-account"><span>当前盖世账号</span><strong>'+esc(mobileMaskedPhone(mobileAuth.accountPhone))+'</strong></div><p class="remote-scan-helper">确认仅用于登录，不会自动连接或控制电脑。</p><p class="remote-scan-error" role="status">'+esc(t.error)+'</p>'+btn('确认登录','remote-scan-confirm','primary remote-scan-primary')+btn('取消登录','remote-scan-cancel','ghost remote-scan-primary')+'</main>';
 if(t.phase==='done')return header+'<main class="content remote-scan-confirm"><div class="remote-scan-mark">'+icon('check')+'</div><h2>已确认本次登录</h2><p>请返回电脑查看登录结果</p><p class="remote-scan-helper">本次为演示授权，真实跨设备登录待接入账号服务。</p>'+btn('完成','remote-scan-done','primary remote-scan-primary')+'</main>';
 return header+'<main class="content remote-scan-camera"><p>扫描电脑端盖世远程登录二维码</p><div class="remote-scan-viewfinder"><video id="remote-scan-video" autoplay muted playsinline aria-label="扫码摄像头预览"></video><span class="remote-scan-corners" aria-hidden="true"></span>'+(!t.stream?'<span class="remote-scan-camera-label">'+icon('screen')+'<span>将电脑登录二维码放入框内</span></span>':'')+'</div><p class="remote-scan-error" role="status">'+esc(t.error)+'</p>'+btn(t.phase==='error'?'重新扫一扫':t.stream?'关闭摄像头':'开启摄像头',t.stream?'remote-scan-camera-off':'remote-scan-camera','primary remote-scan-primary')+'<p class="remote-scan-helper">摄像头需你授权；二维码仅在本地识别，不上传画面。</p></main>';
}
async function remoteScanCamera(){
 if(!remoteScanActive())return;remoteScanStop();remoteScanState.phase='camera';remoteScanState.error='';
 const generation=remoteScanState.generation;
 if(!navigator.mediaDevices?.getUserMedia){remoteScanState.error='当前浏览器无法调用摄像头，请使用支持摄像头权限的 HTTPS 浏览器。';render();return;}
 let stream;
 try{stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});}
 catch{if(generation===remoteScanState.generation&&remoteScanActive()){remoteScanState.error='未获得摄像头权限，请在浏览器中允许后重试。';render();}return;}
 if(generation!==remoteScanState.generation||!remoteScanActive()){stream.getTracks().forEach(track=>track.stop());return;}
 remoteScanState.stream=stream;render();
 const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true});
 function tick(){
  if(generation!==remoteScanState.generation||!remoteScanActive()||!remoteScanState.stream)return;
  const video=document.getElementById('remote-scan-video');
  if(video?.readyState>=2&&video.videoWidth){
   canvas.width=Math.min(video.videoWidth,720);canvas.height=Math.round(video.videoHeight*canvas.width/video.videoWidth);context.drawImage(video,0,0,canvas.width,canvas.height);
   const frame=context.getImageData(0,0,canvas.width,canvas.height);const result=jsQR(frame.data,frame.width,frame.height,{inversionAttempts:'dontInvert'});
   if(result){remoteScanRead(result.data);return;}
  }
  remoteScanState.timer=setTimeout(tick,250);
 }
 remoteScanState.timer=setTimeout(tick,250);
}
function remoteScanConfirm(){
 if(!remoteScanActive()||remoteScanState.phase!=='confirm')return;
 const record=RemoteQrDemo.get(remoteScanState.id);
 if(!record||record.state!=='scanned'||record.region!==mobileAuth.region){remoteScanFail('二维码已失效，请在电脑端刷新后重新扫描。');return;}
 if(!record.consent){remoteScanState.error='请先勾选协议';render();return;}
 const confirmed=RemoteQrDemo.update(record.id,'confirmed',mobileMaskedPhone(mobileAuth.accountPhone),remoteAccountUid(mobileAuth.accountPhone,mobileAuth.region));if(!confirmed){remoteScanFail('二维码已失效，请在电脑端刷新后重新扫描。');return;}remoteScanState.error='';remoteScanState.phase='done';render();
}
const remoteScanBaseClear=mobileClearAccountState;
mobileClearAccountState=function(){if(remoteScanState.phase==='confirm')RemoteQrDemo.update(remoteScanState.id,'cancelled');remoteScanReset();return remoteScanBaseClear();};
const remoteScanBaseTools=mobilePreviewTools;
mobilePreviewTools=function(){return remoteScanBaseTools()+(remoteScanActive()?'<div class="mobile-preview-tools remote-scan-review"><span>扫码流程演示 · 真实异机登录待接账号服务</span>'+btn('模拟扫描电脑登录码','remote-scan-demo','ghost')+'</div>':'');};
const remoteScanBaseRender=renderContent;
renderContent=function(){if(!remoteScanActive()&&remoteScanState.stream)remoteScanStop();remoteScanBaseRender();const video=document.getElementById('remote-scan-video');if(video&&remoteScanState.stream){video.srcObject=remoteScanState.stream;video.play().catch(()=>{});}};
const remoteScanBaseAction=action;
action=function(value){
 if(value==='remote-scan-open'){if(!mobileAuth.loggedIn)return;remoteScanReset();s.mobileAccountMenu=false;s.page='scan-login';render();return;}
 if(value==='remote-scan-close'||value==='remote-scan-cancel'){remoteScanClose();return;}
 if(value==='remote-scan-done'){remoteScanClose(false);return;}
 if(value==='remote-scan-camera'){remoteScanCamera();return;}
 if(value==='remote-scan-camera-off'){remoteScanStop();render();return;}
 if(value==='remote-scan-confirm'){remoteScanConfirm();return;}
 if(value==='remote-scan-demo'){if(!remoteScanActive()||remoteScanState.phase==='done')return;const id=RemoteQrDemo.create(mobileAuth.region);remoteScanRead(RemoteQrDemo.payload(id));return;}
 return remoteScanBaseAction(value);
};
window.addEventListener('storage',e=>{if(e.key!==RemoteQrDemo.prefix+remoteScanState.id||!remoteScanActive()||remoteScanState.phase!=='confirm')return;const record=RemoteQrDemo.get(remoteScanState.id);if(!record||!['waiting','scanned','confirmed'].includes(record.state))remoteScanFail('二维码已失效，请在电脑端刷新后重新扫描。');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&remoteScanActive())remoteScanClose();});
window.addEventListener('pagehide',remoteScanStop);
if(params.get('scan')&&mobileAuth.loggedIn){remoteScanReset();s.page='scan-login';const id=params.get('scan');const record=RemoteQrDemo.get(id);remoteScanRead(record?RemoteQrDemo.payload(id):'');}else render();

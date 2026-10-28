// Offline review fragment. The illustrated code is deliberately not a Steam QR token.
export const loginCss = String.raw`
.steam-login.qr-login{display:flex;flex-direction:column;gap:0;max-width:340px;margin:14px auto 18px;padding:0 3px}
.qr-login .qr-section{text-align:center;padding:0}
.qr-login .qr-section h2,.qr-login .login-form h2{font-size:18px;font-weight:600;line-height:1.4;margin:0 0 12px}
.qr-login .qr-frame{width:148px;height:148px;border-radius:10px;margin:0 auto;background:#fff;color:#263b4d;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
.qr-login .demo-qr{display:block;width:100%;height:100%;flex:none}
.qr-login .qr-caption{font-size:11px;line-height:1.7;color:#a8bbc9;margin:10px 0 0}
.qr-login .qr-state{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:9px;background:#eaf0f4;color:#20374b;padding:12px;font-size:12px;text-align:center}
.qr-login .qr-state strong{font-size:13px;line-height:1.4}
.qr-login .qr-state small{font-size:11px;line-height:1.5;color:#5a6b7a}
.qr-login .qr-refresh{background:#1c80a5;border:0;border-radius:6px;color:white;padding:7px 12px;min-height:32px;font-size:11px}
.qr-login .qr-spinner{width:25px;height:25px;border:3px solid #c7d4df;border-top-color:#157ca2;border-radius:50%;animation:qr-spin .8s linear infinite}
.qr-login .qr-check{width:32px;height:32px;border-radius:50%;background:#1685a8;color:white;font-size:21px;line-height:32px}
.qr-login .login-divider{height:1px;background:#ffffff18;margin:20px 0}
.qr-login .login-form{display:flex;flex-direction:column;gap:7px;text-align:left;padding:0}
.qr-login .login-form h2{margin:0 0 4px;font-size:16px}
.qr-login .login-form>label{font-size:12px;color:#b9ccd9}
.qr-login .login-form>input{height:42px;min-height:42px;padding:10px 12px;margin:0 0 5px;width:100%;border:1px solid #526475;border-radius:7px;background:#0d1e2b;color:#fff;font-size:13px}
.qr-login .login-form>input::placeholder{color:#7b91a3}
.qr-login .login-form .btn{min-height:43px;margin-top:6px}
.qr-login .login-form .err{margin-top:3px;font-size:11px}
.landscape .steam-login.qr-login{display:grid;grid-template-columns:220px minmax(0,1fr);gap:38px;max-width:660px;margin:4px auto;padding:0;align-items:center}
.landscape .qr-login .qr-section{padding:0}
.landscape .qr-login .qr-section h2{font-size:17px;margin-bottom:10px}
.landscape .qr-login .qr-frame{width:140px;height:140px}
.landscape .qr-login .qr-caption{font-size:10px;margin-top:8px}
.landscape .qr-login .login-divider{display:none}
.landscape .qr-login .login-form{gap:5px;border-left:1px solid #ffffff18;padding-left:28px}
.landscape .qr-login .login-form h2{font-size:16px;margin-bottom:4px}
.landscape .qr-login .login-form>input{height:36px;min-height:36px;margin-bottom:3px;padding:7px 10px}
.landscape .qr-login .login-form .btn{min-height:38px;margin-top:4px;padding:8px}
@keyframes qr-spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.qr-login .qr-spinner{animation:none}}
`;

export const loginFunctions = String.raw`
function renderDemoQr(){
  let cells='';
  const inFinder=(x,y)=>((x<8&&y<8)||(x>16&&y<8)||(x<8&&y>16));
  for(let y=0;y<25;y++)for(let x=0;x<25;x++){
    if(inFinder(x,y)||(x>=9&&x<=15&&y>=10&&y<=14))continue;
    if(((x*17+y*13+x*y*3)%11)<5)cells+='<rect x="'+(x+3)+'" y="'+(y+3)+'" width="1" height="1"/>';
  }
  for(const p of [[3,3],[21,3],[3,21]])cells+='<rect x="'+p[0]+'" y="'+p[1]+'" width="7" height="7"/><rect x="'+(p[0]+1)+'" y="'+(p[1]+1)+'" width="5" height="5" fill="white"/><rect x="'+(p[0]+2)+'" y="'+(p[1]+2)+'" width="3" height="3"/>';
  return '<svg class="demo-qr" viewBox="0 0 31 31" role="img" aria-label="演示二维码，不用于真实登录"><rect width="31" height="31" fill="white"/><g fill="#172b3a">'+cells+'</g><text x="15.5" y="16.8" text-anchor="middle" fill="#172b3a" font-family="Arial,sans-serif" font-size="2.6" font-weight="700">DEMO</text></svg>';
}
function renderQrState(){
  const status=state.qrStatus||'ready';
  if(status==='loading')return '<div class="qr-state" role="status"><i class="qr-spinner" aria-hidden="true"></i><strong>正在加载</strong></div>';
  if(status==='scanned')return '<div class="qr-state" role="status"><span class="qr-check" aria-hidden="true">✓</span><strong>已扫码</strong><small>请在手机上确认</small></div>';
  if(status==='expired'||status==='error')return '<div class="qr-state" role="status"><strong>'+(status==='expired'?'二维码已过期':'二维码加载失败')+'</strong><button class="qr-refresh" data-action="qr-refresh" '+(state.loginPending?'disabled':'')+'>'+(status==='expired'?'刷新二维码':'重试')+'</button></div>';
  return '';
}
function renderLogin(){
  const pending=!!state.loginPending;
  return '<div class="steam-login qr-login"><section class="qr-section" aria-label="扫码登录"><h2>扫码登录</h2><div class="qr-frame">'+renderDemoQr()+renderQrState()+'</div><p class="qr-caption">使用 Steam 手机 App 扫码</p></section><div class="login-divider" aria-hidden="true"></div><section class="login-form" aria-label="账号密码登录"><h2>账号密码登录</h2><label for="loginUser">账号名称</label><input id="loginUser" autocomplete="off" spellcheck="false" placeholder="Steam 账号" value="'+escapeHtml(state.loginUser||'')+'" '+(pending?'disabled':'')+'><label for="loginPassword">密码</label><input id="loginPassword" type="password" autocomplete="off" placeholder="输入密码" value="'+escapeHtml(state.loginPassword||'')+'" '+(pending?'disabled':'')+'><button class="btn primary full" data-action="submit-login" '+(pending||!state.loginUser.trim()||!state.loginPassword?'disabled':'')+'>'+(pending&&state.loginMethod!=='qr'?'正在登录…':'登录')+'</button>'+(state.error&&state.loginMethod!=='qr'?'<div class="err" role="alert">登录失败，请重试</div>':'')+'</section></div>';
}
`;

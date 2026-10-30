// 注销确认演示：仅清理本地账号会话，不请求真实账号删除接口。/2026.10.30修改
const remoteDeleteState={host:'',session:'',busy:false};
function remoteDeleteText(zh,en){return document.documentElement.lang==='en'?en:zh;}
function remoteDeleteSession(host){
 if(host==='mobile')return typeof mobileAuth!=='undefined'&&mobileAuth.loggedIn?'mobile|'+mobileAuth.generation+'|'+mobileAuth.accountPhone:'';
 return typeof standaloneMac!=='undefined'&&standaloneMac.signed?'mac|'+standaloneMac.generation+'|'+standaloneMac.accountUid:'';
}
function remoteDeleteReset(){remoteDeleteState.host='';remoteDeleteState.session='';remoteDeleteState.busy=false;}
function remoteAccountDeleteButton(host){return '<button type="button" class="personal-delete-account" data-action="'+host+'-account:delete">'+remoteDeleteText('注销账号','Delete account')+'</button>';}
function remoteAccountDeleteModal(host){
 if(remoteDeleteState.host!==host)return '';
 if(!remoteDeleteState.session||remoteDeleteState.session!==remoteDeleteSession(host)){remoteDeleteReset();return '';}
 return '<div class="remote-delete-overlay"><section class="remote-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="remote-delete-title" aria-describedby="remote-delete-description"><h2 id="remote-delete-title">'+remoteDeleteText('注销账号？','Delete your account?')+'</h2><p id="remote-delete-description">'+remoteDeleteText('确认后将注销当前盖世账号，并返回登录页。','Confirm to delete the current GameHub account and return to sign in.')+'</p><small>'+remoteDeleteText('Demo 仅模拟注销，不会删除真实账号。','This demo simulates deletion. No real account will be deleted.')+'</small><div class="remote-delete-actions"><button type="button" class="ghost" data-action="remote-delete:cancel">'+remoteDeleteText('取消','Cancel')+'</button><button type="button" class="danger" data-action="remote-delete:confirm">'+remoteDeleteText('确认注销','Confirm deletion')+'</button></div></section></div>';
}
function remoteDeleteDismiss(){const host=remoteDeleteState.host;remoteDeleteReset();render();requestAnimationFrame(()=>document.querySelector('[data-action="'+host+'-account:delete"]')?.focus());}
function remoteAccountDeleteAction(value,host,commit){
 if(value===host+'-account:delete'||value===host+'-support:cancel-account'){
  const session=remoteDeleteSession(host);if(!session)return true;
  remoteUpdateCancel();remoteSupportState.logout='';Object.assign(remoteDeleteState,{host,session,busy:false});render();
  requestAnimationFrame(()=>document.querySelector('[data-action="remote-delete:cancel"]')?.focus());return true;
 }
 if(value==='remote-delete:cancel'){if(remoteDeleteState.host===host)remoteDeleteDismiss();return true;}
 if(value==='remote-delete:confirm'){
  if(remoteDeleteState.host!==host||remoteDeleteState.busy)return true;
  if(!remoteDeleteState.session||remoteDeleteState.session!==remoteDeleteSession(host)){remoteDeleteReset();render();return true;}
  remoteDeleteState.busy=true;remoteDeleteState.host='';remoteDeleteState.session='';commit();remoteDeleteState.busy=false;return true;
 }
 return false;
}
document.addEventListener('keydown',e=>{
 if(!document.querySelector('.remote-delete-overlay'))return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();remoteDeleteDismiss();}
 else if(e.key==='Tab'){const nodes=[...document.querySelectorAll('.remote-delete-dialog button')];const next=(nodes.indexOf(document.activeElement)+(e.shiftKey?-1:1)+nodes.length)%nodes.length;e.preventDefault();nodes[next]?.focus();}
},true);

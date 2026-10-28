/* Local image transfer interaction demo. No real computer clipboard or AI upload. */
(()=>{
 const L=(zh,en)=>document.documentElement.lang==='en'?en:zh;
 let owner='',generation=0,notice='',clipboardOpen=false,streamPanel=false,pending=null,sequence=0;
 const clipboards=new Map(),urls=new Set();
 const account=()=>mobileAuth.loggedIn?mobileAuth.region+'|'+mobileAuth.accountPhone:'';
 const context=()=>{const office=window.RemoteOfficeMobile;if(!office||!mobileAuth.loggedIn)return null;const state=office.state,t=office.data(s.device).threads.find(x=>x.id===state.thread&&x.app===state.app);return {office,state,t,device:devices.find(d=>d.id===s.device)};};
 function sync(){if(owner===account())return;for(const url of urls)URL.revokeObjectURL(url);urls.clear();clipboards.clear();owner=account();generation++;pending=null;notice='';clipboardOpen=false;streamPanel=false;}
 function allowed(c=context()){return !!c?.t&&c.device?.online&&!c.device.blocked&&!s.view&&c.office.data(s.device).windows[c.state.app]&&['office-native','session'].includes(s.page);}
 function button(text,action,disabled=false){return '<button type="button" data-action="phone-media:'+action+'"'+(disabled?' disabled':'')+'>'+text+'</button>';}
 function thumbnail(file,remove=false){return '<figure><img src="'+esc(file.url)+'" alt="'+esc(file.name)+'"><figcaption>'+esc(file.name)+'</figcaption>'+(remove?button(L('移除','Remove'),'remove:'+file.id):'')+'</figure>';}
 function composer(t){sync();if(!t)return '';const enabled=allowed(),files=t.imageDraft||[],clip=clipboards.get(s.device);return '<div class="phone-media-composer"><div class="phone-media-actions">'+button(icon('plus')+L('图片附件','Attach image'),'pick:attachment',!enabled)+button(icon('monitor')+L('传到电脑','Send to computer'),'pick:clipboard',!enabled)+button(L('电脑剪贴板','Computer clipboard'),'clipboard')+'</div>'+(files.length?'<div class="phone-media-drafts">'+files.map(f=>thumbnail(f,true)).join('')+'</div>':'')+(clipboardOpen?'<section class="phone-media-clipboard" aria-label="'+L('电脑剪贴板','Computer clipboard')+'"><strong>'+esc(device()?.name||'')+' · '+L('剪贴板','Clipboard')+'</strong>'+(clip?thumbnail(clip)+'<p>'+L('图片已传到此电脑的剪贴板，可在远端应用中粘贴（演示）。','Image sent to this computer’s clipboard; paste it in a remote app (demo).')+'</p>'+button(L('粘贴为 AI 附件','Paste as AI attachment'),'paste',!enabled):'<p>'+L('尚未传入图片','No image sent yet')+'</p>')+'</section>':'')+(notice?'<p class="phone-media-notice" role="status">'+esc(notice)+'</p>':'')+'<input class="phone-media-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="'+L('选择手机图片','Choose a phone image')+'" hidden></div>';}
 function message(m){return m.images?.length?'<div class="phone-media-message">'+m.images.map(f=>thumbnail(f)).join('')+'</div>':'';}
 function send(t,text){sync();if(!allowed()||!t?.imageDraft?.length)return false;t.messages.push({role:'user',text,images:t.imageDraft.map(f=>({...f}))});t.imageDraft=[];notice=L('图片已随消息添加到当前 AI 会话（演示）。','Image added to this AI conversation with the message (demo).');return true;}
 window.RemotePhoneMedia={composer,message,send,hasAttachments:t=>!!t?.imageDraft?.length,snapshot:()=>({owner,clipboard:[...clipboards.keys()],notice})};
 const baseAction=action;
 action=function(value){if(!value.startsWith('phone-media:'))return baseAction(value);sync();const [,kind,arg]=value.split(':'),c=context();if(!c)return;
  if(kind==='panel'){streamPanel=!streamPanel;render();return;}
  if(kind==='clipboard'){clipboardOpen=!clipboardOpen;render();return;}
  if(kind==='remove'){c.t.imageDraft=(c.t.imageDraft||[]).filter(f=>f.id!==arg);notice='';render();return;}
  if(!allowed(c))return;
  if(kind==='send'){baseAction('office-send');streamPanel=false;render();return;}
  if(kind==='pick'&&['attachment','clipboard'].includes(arg)){pending={target:arg,owner,generation,device:s.device,thread:c.t};document.querySelector('.phone-media-file')?.click();return;}
  if(kind==='paste'){const file=clipboards.get(s.device);if(file){c.t.imageDraft||=[];c.t.imageDraft.push({...file,id:'phone-image-'+(++sequence)});notice=L('已粘贴到当前 AI 附件，发送后提交。','Pasted into the current AI attachments. Send to submit.');render();}return;}
 };
 document.addEventListener('change',event=>{if(!event.target.matches('.phone-media-file'))return;sync();const chosen=event.target.files?.[0],request=pending;pending=null;if(!chosen||!request||request.owner!==owner||request.generation!==generation||request.device!==s.device||request.thread!==context()?.t||!allowed())return;
  if(!['image/png','image/jpeg','image/webp','image/gif'].includes(chosen.type)){notice=L('请选择 PNG、JPG、WebP 或 GIF 图片。','Choose a PNG, JPG, WebP or GIF image.');render();return;}
  const url=URL.createObjectURL(chosen);urls.add(url);const file={id:'phone-image-'+(++sequence),name:chosen.name,url,type:chosen.type};
  if(request.target==='clipboard'){clipboards.set(s.device,file);clipboardOpen=true;notice=L('已发送到当前电脑剪贴板（演示）。','Sent to this computer’s clipboard (demo).');}
  else{request.thread.imageDraft||=[];request.thread.imageDraft.push(file);notice=L('已添加图片，可输入修改意见后一起发送。','Image attached. Add your feedback and send together.');}render();
 });
 document.addEventListener('input',event=>{if(event.target.id==='phone-media-feedback'&&allowed())context().t.draft=event.target.value;});
 const baseRender=renderContent;renderContent=function(){sync();baseRender();const c=context();if(!c)return;if(s.page==='session'&&['vscode','claude','workbuddy'].includes(c.state.capture)){
  document.querySelector('.office-stream-head')?.insertAdjacentHTML('beforeend',button(L('图片','Images'),'panel'));
  if(streamPanel)document.querySelector('.office-stream')?.insertAdjacentHTML('beforeend','<section class="phone-stream-media"><div class="row spread"><strong>'+L('手机图片与修改意见','Phone images and feedback')+'</strong>'+button(L('收起','Close'),'panel')+'</div>'+composer(c.t)+'<textarea id="phone-media-feedback" aria-label="'+L('附加修改意见','Add feedback')+'" placeholder="'+L('输入修改意见，可与图片一起发送','Add feedback to send with the image')+'"'+(!allowed()?' readonly':'')+'>'+esc(c.t?.draft||'')+'</textarea>'+button(L('发送到 AI','Send to AI'),'send',!allowed())+'</section>');
 }};
 render();
})();

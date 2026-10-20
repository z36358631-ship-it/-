/* Local governance demonstration. No accounts, messages or published data leave this page. */
(() => {
  'use strict';
  const GH=window.GH;
  const esc=value=>GH.esc(String(value??''));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const roleLabels={reader:'只读体验',contributor:'普通用户',editor:'初级精编',manager:'高级精编'};
  const writingRoles=['contributor','editor','manager'];
  const grants={
    'entry.create':['editor','manager'],'entry.edit':writingRoles,'entry.delete':['editor','manager'],
    'data.create':writingRoles,'data.edit':writingRoles,'data.batch':['editor','manager'],'data.delete':['manager'],
    'home.create':['editor','manager'],'home.edit':['editor','manager'],'home.delete':['manager'],'home.reorder':['manager'],
    'schema.configure':['manager'],'blacklist.manage':['manager'],'roles.manage':['manager'],'html.manage':['manager'],
    'review.data':['editor','manager'],'review.editor':['manager']
  };
  const pages=[['overview','权限总览',null],['blacklist','黑名单','blacklist.manage'],['roles','精编管理','roles.manage'],['html','HTML 模板权限','html.manage'],['data-review','数据审核','review.data'],['editor-review','精编审核','review.editor']];
  const accountSeeds=[
    {id:'demo-self',name:'当前演示账号',role:'manager',templateAccess:true},
    {id:'editor-a',name:'精编示例 A',role:'editor',templateAccess:false},
    {id:'player-b',name:'玩家示例 B',role:'contributor',templateAccess:false},
    {id:'applicant-c',name:'申请示例 C',role:'contributor',templateAccess:false}
  ];
  let state;
  function reset(){state={tab:'overview',accounts:clone(accountSeeds),blacklist:[],reviews:{},applications:[{id:'application-c',actorId:'applicant-c',text:'希望协助整理载具资料。此申请为本地模拟数据。',status:'pending',reason:''}],notice:null,drafts:{},reviewFilter:'all',query:'',previewActor:'demo-self',previewOpen:false};}
  reset();
  const can=(action,role)=>!!grants[action]?.includes(role);
  const isBlocked=(actorId='demo-self')=>state.blacklist.some(item=>item.actorId===actorId);
  const account=id=>state.accounts.find(item=>item.id===id);
  const actorName=id=>account(id)?.name||id;
  const applicantId='player-b';
  function editorApplication(){
    const actor=account(applicantId),application=state.applications.filter(item=>item.actorId===applicantId).at(-1)||null;
    return clone({actorId:applicantId,role:actor?.role||'contributor',blocked:isBlocked(applicantId),application});
  }
  function applyEditor(text){
    const current=editorApplication();
    if(current.blocked)return {ok:false,code:'forbidden',message:'当前账号暂不能提交申请。'};
    if(current.role==='editor'||current.role==='manager')return {ok:false,code:'already-editor',message:'你已拥有精编身份。'};
    if(current.application?.status==='pending')return {ok:false,code:'pending',message:'申请正在审核中，请勿重复提交。'};
    if(!validReason(text))return {ok:false,code:'validation',message:'请填写申请说明，最多200字。'};
    const application={id:'application-player-b-'+(state.applications.filter(item=>item.actorId===applicantId).length+1),actorId:applicantId,text:text.trim(),status:'pending',reason:''};
    state.applications.push(application);
    return {ok:true,code:'success',application:clone(application)};
  }
  const notice=(kind,text)=>{state.notice={kind,text};};
  const paint=()=>GH.render();
  const field=(id,label,control)=>`<label class="gg-field"><span>${esc(label)}</span>${control}</label>`;
  const draft=(key,fallback='')=>state.drafts[key]??fallback;
  const reason=(key,placeholder)=>`<textarea data-gg-draft="${esc(key)}" maxlength="200" rows="2" placeholder="${esc(placeholder)}">${esc(draft(key))}</textarea>`;
  const form=(type,id,body)=>`<form data-gg-form="${type}" data-gg-id="${esc(id)}" novalidate>${body}</form>`;
  const button=(text,action,extra='')=>`<button type="button" data-gg-action="${action}" ${extra}>${esc(text)}</button>`;
  const accountOptions=(selected,items=state.accounts)=>items.map(item=>`<option value="${esc(item.id)}" ${item.id===selected?'selected':''}>${esc(item.name)}（${esc(item.id)}）</option>`).join('');
  const empty=text=>`<div class="gg-empty" data-gg-empty>${esc(text)}</div>`;
  function overview(){
    const rows=[
      ['词条','创建词条','entry.create'],['词条','编辑词条','entry.edit'],['词条','删除词条','entry.delete'],
      ['实体数据','新增、编辑数据','data.edit'],['实体数据','批量编辑','data.batch'],['实体数据','删除数据','data.delete'],
      ['黑名单','管理黑名单','blacklist.manage'],['精编','管理精编身份','roles.manage'],
      ['首页','新增、编辑金刚位','home.edit'],['首页','删除、排序金刚位','home.reorder'],
      ['HTML 模板','管理模板访问权限','html.manage'],['审核','核对已发布数据','review.data'],['审核','审核精编申请','review.editor']
    ];
    return `<section class="gg-panel"><h2>权限总览</h2><p>工作台身份用于演示操作边界。下表对应本地账号能力，线上身份仍需服务端校验。</p><div class="gg-table-wrap" tabindex="0" aria-label="横向查看权限表"><table data-gg-permissions><thead><tr><th>类别</th><th>操作</th>${writingRoles.map(role=>`<th>${esc(roleLabels[role])}</th>`).join('')}</tr></thead><tbody>${rows.map(([group,label,action])=>`<tr><th>${esc(group)}</th><td>${esc(label)}</td>${writingRoles.map(role=>`<td aria-label="${esc(roleLabels[role])}${can(action,role)?'允许':'不可用'}">${can(action,role)?'✓':'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="gg-caption">只读体验不能写入。精编角色管理、黑名单及模板权限仅作用于本地示例账号。</p></section>`;
  }
  function blacklist(){
    const available=state.accounts.filter(item=>!isBlocked(item.id));
    return `<section class="gg-panel"><h2>黑名单管理</h2><p>加入后，该示例账号不能提交词条和配置写入。高级精编保留解除入口。</p>${available.length?form('blacklist-add','',field('actor','示例账号',`<select data-gg-draft="blacklist-actor">${accountOptions(draft('blacklist-actor',available[0].id),available)}</select>`)+field('reason','加入原因（必填）',reason('blacklist-reason','写明需限制的行为，最多 200 字'))+'<button type="submit" class="gg-primary">加入黑名单</button>'):empty('全部示例账号已加入黑名单，可从下方解除。')}<div class="gg-list" data-gg-blacklist>${state.blacklist.map(item=>`<article class="gg-item" data-gg-blocked="${esc(item.actorId)}"><div class="gg-item-heading"><strong>${esc(actorName(item.actorId))}</strong><small>${esc(item.actorId)}</small></div><p>${esc(item.reason)}</p>${button('移出黑名单','blacklist-remove',`data-gg-id="${esc(item.actorId)}"`)}</article>`).join('')||empty('当前没有黑名单账号。')}</div></section>`;
  }
  function roles(){return `<section class="gg-panel"><h2>精编管理</h2><p>为本地示例账号调整身份；始终保留至少一名高级精编。当前工作台的演示身份由顶部选择器切换。</p><div class="gg-list">${state.accounts.map(item=>form('role-save',item.id,`<div class="gg-item-heading"><strong>${esc(item.name)}</strong><small>${esc(item.id)}</small></div>`+field('role','账号身份',`<select data-gg-draft="role-${esc(item.id)}">${writingRoles.map(role=>`<option value="${role}" ${draft('role-'+item.id,item.role)===role?'selected':''}>${esc(roleLabels[role])}</option>`).join('')}</select>`)+`<button type="submit">保存身份</button><span class="gg-pill">当前：${esc(roleLabels[item.role])}</span>`)).join('')}</div></section>`;}
  function html(){
    const actor=account(state.previewActor)||state.accounts[0],record=GH.guideStore?.get('article-beginner');
    return `<section class="gg-panel"><h2>HTML 模板权限</h2><p>管理已登记示例账号对本地固定模板的访问权限。模板预览使用现有资料卡片。</p><div class="gg-list">${state.accounts.map(item=>form('template-save',item.id,`<div class="gg-item-heading"><strong>${esc(item.name)}</strong><small>${esc(item.id)}</small></div><label class="gg-check"><input type="checkbox" data-gg-template-account="${esc(item.id)}" ${draft('template-'+item.id,item.templateAccess)?'checked':''}>允许访问固定模板</label><button type="submit">保存权限</button><span class="gg-pill">当前：${item.templateAccess?'允许':'未授权'}</span>`)).join('')}</div><div class="gg-template-test"><h3>固定模板预览</h3>${field('preview','验证账号',`<select data-gg-preview-actor>${accountOptions(actor.id)}</select>`)}${button(state.previewOpen?'收起预览':'验证并预览','template-preview')}${state.previewOpen?(actor.templateAccess&&!isBlocked(actor.id)?`<div class="gg-safe-preview" data-gg-safe-preview inert>${record&&GH.guideRender?GH.guideRender(record,{preview:true}):empty('当前没有可预览的固定模板资料。')}</div>`:`<p class="gg-inline-error" data-gg-template-denied>该账号${isBlocked(actor.id)?'已在黑名单中':'尚未获得模板访问权限'}，无法打开预览。</p>`):''}</div></section>`;
  }
  function historyRows(){const store=GH.guideStore;if(!store)return [];return store.list().flatMap(record=>(store.history(record.id)||[]).map(item=>({key:record.id+'@'+item.revision,id:record.id,title:record.title,revision:item.revision,author:item.author||'本地示例',summary:item.changeSummary||item.note||'内容更新',time:item.time||'',timestamp:item.timestamp||0}))).sort((a,b)=>b.timestamp-a.timestamp||a.title.localeCompare(b.title,'zh-CN'));}
  function dataReview(){
    const all=historyRows(),query=state.query.trim().toLocaleLowerCase(),rows=all.filter(row=>(!query||[row.title,row.author,row.summary].join(' ').toLocaleLowerCase().includes(query))&&(state.reviewFilter==='all'||(state.reviews[row.key]?.status||'pending')===state.reviewFilter));
    const labels={pending:'待核对',checked:'已核对',correction:'需修正'};
    return `<section class="gg-panel"><h2>数据审核</h2><p>核对已经发布的公共资料历史。保存仍直接生效；核对结果只记录意见，不回滚内容。</p><div class="gg-review-filters">${field('search','检索公开变更',`<input data-gg-review-search value="${esc(state.query)}" placeholder="标题、修改说明或贡献者">`)}${field('filter','核对状态',`<select data-gg-review-filter>${Object.entries({all:'全部',...labels}).map(([id,label])=>`<option value="${id}" ${state.reviewFilter===id?'selected':''}>${label}</option>`).join('')}</select>`)}</div><p class="gg-caption" data-gg-review-count>${rows.length} / ${all.length} 条已发布版本</p><div class="gg-list" data-gg-review-list>${rows.map(row=>{const review=state.reviews[row.key],status=review?.status||'pending';return form('data-review',row.key,`<div class="gg-item-heading"><strong>${esc(row.title)}</strong><span class="gg-pill gg-${status}">${labels[status]}</span></div><small>修订 ${row.revision} · ${esc(row.author)}</small><p>${esc(row.summary)}</p>${review?.reason?`<p class="gg-review-reason">核对意见：${esc(review.reason)}</p>`:''}${field('review-reason','修正原因（标记需修正时必填）',reason('review-'+row.key,'说明需要修正的位置和原因'))}<div class="gg-actions"><button type="submit" name="decision" value="checked">标记已核对</button><button type="submit" name="decision" value="correction">标记需修正</button></div>`);}).join('')||empty(all.length?'没有符合条件的公开变更。':'暂无公共资料历史；保存词条后会在此显示。')}</div></section>`;
  }
  function editorReview(){return `<section class="gg-panel"><h2>精编审核</h2><p>下方申请为本地模拟数据。通过后将示例账号设为初级精编，不发送通知。</p><div class="gg-list">${state.applications.map(item=>{const labels={pending:'待审核',approved:'已通过',rejected:'已驳回'};return `<article class="gg-item" data-gg-application="${esc(item.id)}"><div class="gg-item-heading"><strong>${esc(actorName(item.actorId))}</strong><span class="gg-pill">${labels[item.status]}</span></div><small>${esc(item.actorId)} · 模拟申请</small><p>${esc(item.text)}</p>${item.status==='pending'?form('application',item.id,field('reason','驳回原因（驳回时必填）',reason('application-'+item.id,'说明需要补充的内容'))+'<div class="gg-actions"><button type="submit" name="decision" value="approve" class="gg-primary">通过申请</button><button type="submit" name="decision" value="reject">驳回申请</button></div>'):`<p class="gg-review-reason">${item.status==='approved'?'已赋予初级精编身份。':'驳回原因：'+esc(item.reason)}</p>`}</article>`;}).join('')||empty('当前没有待处理的模拟申请。')}</div></section>`;}
  function render(role='reader'){
    const allowed=pages.filter(([, ,permission])=>!permission||can(permission,role));
    if(!allowed.some(([id])=>id===state.tab))state.tab='overview';
    const content={overview,blacklist,roles,html,'data-review':dataReview,'editor-review':editorReview}[state.tab];
    return `<div class="gg-governance" data-gg-role="${esc(role)}"><header class="gg-header"><h1>共建治理</h1><span class="gg-pill">${esc(roleLabels[role]||roleLabels.reader)}</span></header><p class="gg-local-note">本地会话演示 · 示例账号与操作记录在刷新后重置</p><nav class="gg-tabs" aria-label="共建治理栏目">${allowed.map(([id,label])=>`<button type="button" data-gg-tab="${id}" aria-current="${state.tab===id?'page':'false'}">${esc(label)}</button>`).join('')}</nav>${state.notice?`<p class="gg-notice gg-notice-${esc(state.notice.kind)}" data-gg-status="${esc(state.notice.kind)}" role="status">${esc(state.notice.text)}</p>`:''}${isBlocked()?'<p class="gg-block-note">当前演示账号已在黑名单中，词条和配置不能写入。高级精编可在黑名单中解除。</p>':''}${content()}</div>`;
  }
  function validReason(value){return typeof value==='string'&&value.trim().length>0&&value.trim().length<=200;}
  function submit(type,id,decision,role){
    const permission={ 'blacklist-add':'blacklist.manage','role-save':'roles.manage','template-save':'html.manage','data-review':'review.data',application:'review.editor'}[type];
    if(!permission||!can(permission,role)){notice('error','当前身份没有该操作权限。');return;}
    if(type==='blacklist-add'){
      const available=state.accounts.filter(item=>!isBlocked(item.id)),actorId=draft('blacklist-actor',available[0]?.id),why=draft('blacklist-reason');
      if(!account(actorId)){notice('error','请选择已登记的示例账号。');return;}
      if(isBlocked(actorId)){notice('error','该账号已在黑名单中，请勿重复加入。');return;}
      if(!validReason(why)){notice('error','请填写加入原因，最多 200 字。');return;}
      state.blacklist.push({actorId,reason:why.trim()});delete state.drafts['blacklist-reason'];delete state.drafts['blacklist-actor'];notice('success','已加入本地黑名单。');return;
    }
    if(type==='role-save'){
      const item=account(id),roleValue=draft('role-'+id,item?.role);
      if(!item||!writingRoles.includes(roleValue)){notice('error','示例账号或身份无效。');return;}
      if(item.role===roleValue){notice('error','身份没有变化。');return;}
      if(item.role==='manager'&&roleValue!=='manager'&&state.accounts.filter(item=>item.role==='manager').length<=1){notice('error','至少保留一名高级精编，请先设置其他高级精编。');return;}
      item.role=roleValue;delete state.drafts['role-'+id];notice('success','示例账号身份已保存。');return;
    }
    if(type==='template-save'){
      const item=account(id);if(!item){notice('error','示例账号不存在。');return;}
      const allowed=draft('template-'+id,item.templateAccess);if(item.templateAccess===allowed){notice('error','模板权限没有变化。');return;}
      item.templateAccess=!!allowed;delete state.drafts['template-'+id];notice('success','固定模板访问权限已保存。');return;
    }
    if(type==='data-review'){
      if(!historyRows().some(item=>item.key===id)){notice('error','该公开版本已不可用，请重新查看。');return;}
      if(!['checked','correction'].includes(decision)){notice('error','请选择有效的核对结果。');return;}
      const why=draft('review-'+id).trim();if(decision==='correction'&&!validReason(why)){notice('error','标记需修正时，请填写修正原因，最多 200 字。');return;}
      if(why.length>200){notice('error','修正原因不能超过 200 字。');return;}
      if(state.reviews[id]?.status===decision&&state.reviews[id]?.reason===why){notice('error','该核对结果已记录。');return;}
      state.reviews[id]={status:decision,reason:why,reviewerRole:role};notice('success',decision==='checked'?'已记录核对结果。':'已记录修正意见，公开内容仍保留。');return;
    }
    const item=state.applications.find(item=>item.id===id),target=item&&account(item.actorId);
    if(!item||!target){notice('error','该模拟申请已不可用。');return;}
    if(item.status!=='pending'){notice('error','该申请已处理，请勿重复审核。');return;}
    if(decision==='approve'){
      if(isBlocked(target.id)){notice('error','该账号已在黑名单中，请先解除限制。');return;}
      item.status='approved';if(target.role!=='manager')target.role='editor';notice('success','申请已通过，示例账号已获得初级精编身份。');return;
    }
    if(decision!=='reject'){notice('error','请选择有效的审核结果。');return;}
    const why=draft('application-'+id);if(!validReason(why)){notice('error','请填写驳回原因，最多 200 字。');return;}
    item.status='rejected';item.reason=why.trim();notice('success','已驳回这条模拟申请。');
  }
  function bind(host,role='reader'){
    const root=host.querySelector('.gg-governance');if(!root)return;
    root.querySelectorAll('[data-gg-tab]').forEach(el=>el.onclick=()=>{const page=pages.find(([id])=>id===el.dataset.ggTab);if(!page||page[2]&&!can(page[2],role))return;state.tab=page[0];state.notice=null;paint();});
    root.querySelectorAll('[data-gg-draft]').forEach(el=>{const event=el.tagName==='SELECT'?'onchange':'oninput';el[event]=()=>{state.drafts[el.dataset.ggDraft]=el.value;};});
    root.querySelectorAll('[data-gg-template-account]').forEach(el=>el.onchange=()=>{state.drafts['template-'+el.dataset.ggTemplateAccount]=el.checked;});
    root.querySelectorAll('[data-gg-form]').forEach(el=>el.onsubmit=event=>{event.preventDefault();submit(el.dataset.ggForm,el.dataset.ggId,event.submitter?.value,role);paint();});
    root.querySelectorAll('[data-gg-action]').forEach(el=>el.onclick=()=>{
      if(el.dataset.ggAction==='blacklist-remove'){
        if(!can('blacklist.manage',role)){notice('error','当前身份不能管理黑名单。');paint();return;}
        if(!isBlocked(el.dataset.ggId)){notice('error','该账号已移出黑名单。');paint();return;}
        state.blacklist=state.blacklist.filter(item=>item.actorId!==el.dataset.ggId);notice('success','已移出本地黑名单。');paint();return;
      }
      if(el.dataset.ggAction==='template-preview'&&can('html.manage',role)){state.previewOpen=!state.previewOpen;state.notice=null;paint();}
    });
    const actor=root.querySelector('[data-gg-preview-actor]');if(actor)actor.onchange=()=>{if(account(actor.value))state.previewActor=actor.value;state.previewOpen=false;paint();};
    const filter=root.querySelector('[data-gg-review-filter]');if(filter)filter.onchange=()=>{state.reviewFilter=['all','pending','checked','correction'].includes(filter.value)?filter.value:'all';paint();};
    const query=root.querySelector('[data-gg-review-search]');if(query)query.oninput=()=>{const start=query.selectionStart;state.query=query.value;paint();const next=document.querySelector('.gg-governance [data-gg-review-search]');next?.focus({preventScroll:true});next?.setSelectionRange(start,start);};
  }
  GH.guideGovernance=Object.freeze({render,bind,reset,isBlocked,can,editorApplication,applyEditor,inspect:()=>clone(state)});
})();

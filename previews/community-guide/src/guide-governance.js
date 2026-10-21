/* Local governance demonstration. No accounts, messages or published data leave this page. */
(() => {
  'use strict';
  const GH=window.GH;
  const esc=value=>GH.esc(String(value??''));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const roleLabels={reader:'只读用户',contributor:'普通用户',editor:'初级精编',manager:'高级精编'};
  const writingRoles=['contributor','editor','manager'];
  const communitySections=[{id:'gamehub',label:'盖世游戏',parent:'社区'},{id:'gta5',label:'GTA 5',parent:'盖世游戏'},{id:'steam',label:'Steam',parent:'盖世游戏'},{id:'wukong',label:'黑神话：悟空',parent:'盖世游戏'}];
  const section=id=>communitySections.find(item=>item.id===id);
  const regions={mainland:'国内',overseas:'海外'};
  const grants={
    'entry.create':['editor','manager'],'entry.edit':writingRoles,'entry.delete':['editor','manager'],
    'data.create':writingRoles,'data.edit':writingRoles,'data.batch':['editor','manager'],'data.delete':['manager'],
    'home.create':['editor','manager'],'home.edit':['editor','manager'],'home.delete':['manager'],'home.reorder':['manager'],
    'schema.configure':['manager'],'blacklist.manage':['manager'],'roles.manage':['manager'],'review.editor':['manager']
  };
  const permissionRows=[['词条','创建词条','entry.create'],['词条','编辑词条','entry.edit'],['词条','删除词条','entry.delete'],['黑名单','管理黑名单','blacklist.manage'],['精编','管理精编身份','roles.manage'],['首页','新增、编辑版块与项目','home.edit'],['首页','删除、排序版块与项目','home.reorder'],['审核','审核精编申请','review.editor']];
  const permissionAliases={'home.create':'home.edit','home.delete':'home.reorder'};
  const pages=[['overview','权限总览',null],['blacklist','黑名单','blacklist.manage'],['roles','身份分级与成员','roles.manage'],['editor-review','精编申请','review.editor']];
  const accountSeeds=[
    {id:'demo-self',name:'内容管理员',role:'manager'},
    {id:'ops-admin',name:'内部运营管理员',role:'manager'},
    {id:'editor-a',name:'精编阿辰',role:'editor'},
    {id:'player-b',name:'玩家北岛',role:'contributor'},
    {id:'applicant-c',name:'玩家初夏',role:'contributor'}
  ];
  let state;
  function reset(){state={tab:'overview',detail:null,accounts:clone(accountSeeds),blacklist:[],wikiPolicies:{},wikiGrants:{},permissionDrafts:{},applications:[{id:'application-c',actorId:'applicant-c',text:'希望协助整理载具资料，补充获取方式与版本差异。',form:{contact:'初夏',plan:'希望协助整理载具资料，补充获取方式与版本差异。',wikiExperience:'平时会查阅 GTA 5 载具资料与任务攻略。',writingExperience:'collaborative',translationAbility:'basic'},status:'pending',reason:''}],notice:null,drafts:{},query:'',applicationFilter:'all'};}
  reset();
  const can=(action,role,scope)=>!!currentGrants(scope)[permissionAliases[action]||action]?.includes(role);
  const isBlocked=(actorId=GH.guideConsole?.actor()?.id||'demo-self')=>state.blacklist.some(item=>item.actorId===actorId);
  const account=id=>state.accounts.find(item=>item.id===id);
  const wikiScope=value=>value===undefined?(GH.guideStore?.context?.()||{region:'mainland',sectionId:'gta5'}):value;
  const validWikiScope=value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.hasOwn(regions,value.region)&&!!section(value.sectionId);
  const wikiKey=scope=>scope.region+':'+scope.sectionId;
  function currentGrants(scope){
    scope=wikiScope(scope);
    const result=clone(grants),saved=validWikiScope(scope)&&state.wikiGrants[wikiKey(scope)];
    if(saved)Object.assign(result,clone(saved));
    result['home.create']=[...result['home.edit']];result['home.delete']=[...result['home.reorder']];
    return result;
  }
  function permissionMatrix(scope){const values=currentGrants(scope);return Object.fromEntries(permissionRows.map(([, ,action])=>[action,[...values[action]]]));}
  function identityManagersRemain(accounts=state.accounts,blocked=state.blacklist,matrices=state.wikiGrants){
    const candidates=[permissionMatrix(),...Object.values(matrices)];
    return candidates.every(matrix=>(matrix['roles.manage']||[]).some(role=>accounts.some(item=>item.role===role&&!blocked.some(value=>value.actorId===item.id))));
  }
  function setPermissions(input,role,scope=wikiScope()) {
    if(!canSetWikiPolicy(role))return {ok:false,code:'forbidden',message:'仅当前已登录且未被封禁的高级精编或运营管理员可以修改权限。'};
    if(!validWikiScope(scope)||wikiKey(scope)!==wikiKey(wikiScope()))return {ok:false,code:'validation',message:'百科已切换，请重新编辑权限。'};
    const actions=permissionRows.map(([, ,action])=>action);
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==actions.length||Object.keys(input).some(action=>!actions.includes(action))||actions.some(action=>!Array.isArray(input[action])||new Set(input[action]).size!==input[action].length||input[action].some(value=>!writingRoles.includes(value))))return {ok:false,code:'validation',message:'权限配置格式无效，请重新选择。'};
    const next=Object.fromEntries(actions.map(action=>[action,writingRoles.filter(value=>input[action].includes(value))])),key=wikiKey(scope);
    if(!identityManagersRemain(state.accounts,state.blacklist,{...state.wikiGrants,[key]:next}))return {ok:false,code:'validation',message:'至少保留一个有可用成员的身份管理角色。'};
    if(JSON.stringify(next)===JSON.stringify(permissionMatrix(scope))){delete state.permissionDrafts[key];return {ok:false,code:'unchanged',message:'权限没有变化。'};}
    state.wikiGrants[key]=next;delete state.permissionDrafts[key];
    return {ok:true,code:'success',message:'权限已保存，当前百科各身份的操作权限已生效。'};
  }
  function wikiPolicy(scope){scope=wikiScope(scope);return validWikiScope(scope)&&state.wikiPolicies[wikiKey(scope)]==='editors'?'editors':'all';}
  function canAccessWiki(scope,role,actorId){
    scope=wikiScope(scope);
    // Visibility and writes are separate: blacklist enforcement stays at each model mutation.
    return validWikiScope(scope)&&(['editor','manager'].includes(role)||role==='contributor'&&wikiPolicy(scope)==='all');
  }
  function canSetWikiPolicy(role){
    const actor=GH.guideConsole?.actor?.();
    return role==='manager'&&actor?.role==='manager'&&account(actor.id)?.role==='manager'&&GH.guideConsole?.authorized?.('manager')===true&&!isBlocked(actor.id);
  }
  function setWikiPolicy(scope,policy,role){
    if(!canSetWikiPolicy(role))return {ok:false,code:'forbidden',message:'仅当前已登录且未被封禁的管理员或高级精编可以修改百科编辑范围。'};
    if(!validWikiScope(scope)||!['all','editors'].includes(policy))return {ok:false,code:'validation',message:'请选择有效百科和编辑范围。'};
    const key=wikiKey(scope);
    if(wikiPolicy(scope)===policy)return {ok:false,code:'unchanged',message:'百科编辑范围没有变化。'};
    if(policy==='all')delete state.wikiPolicies[key];else state.wikiPolicies[key]=policy;
    delete state.drafts['wiki-policy-'+key];
    return {ok:true,code:'success',message:'百科编辑范围已保存；公开阅读保持开放，后台访问与写入立即按新范围生效。',policy};
  }
  const actorName=id=>account(id)?.name||id;
  const applicantId='player-b';
  function editorApplication(){
    const actor=account(applicantId),application=state.applications.filter(item=>item.actorId===applicantId).at(-1)||null;
    return clone({actorId:applicantId,role:actor?.role||'contributor',blocked:isBlocked(applicantId),application});
  }
  const applicationChoices={writingExperience:{independent:'独立完成过',collaborative:'合作完成过',none:'没有经验'},translationAbility:{familiar:'我很熟悉',basic:'基本上可以',difficult:'有些难度'}};
  function applicationForm(value={}){
    const data=value.form||value;
    return {contact:typeof data.contact==='string'?data.contact:'',plan:typeof data.plan==='string'?data.plan:typeof value.text==='string'?value.text:'',wikiExperience:typeof data.wikiExperience==='string'?data.wikiExperience:'',writingExperience:typeof data.writingExperience==='string'?data.writingExperience:'',translationAbility:typeof data.translationAbility==='string'?data.translationAbility:''};
  }
  function applicationDetails(item){
    const data=applicationForm(item),fields=[['联系方式',data.contact],['成为精编后会做什么',data.plan],['浏览 Wiki／数据库／百科的情况',data.wikiExperience],['攻略或图鉴编写经验',applicationChoices.writingExperience[data.writingExperience]],['外文检索与翻译能力',applicationChoices.translationAbility[data.translationAbility]]];
    return `<dl class="gr-application-details">${fields.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value||'未填写')}</dd></div>`).join('')}</dl>`;
  }
  function applicationPermissions(){
    const rows=[['词条管理','新增','entry.create'],['词条管理','编辑','entry.edit'],['词条管理','删除','entry.delete'],['模板数据','新增与编辑','data.edit'],['模板数据','批量修改','data.batch'],['模板数据','删除','data.delete'],['首页管理','新增与编辑','home.edit'],['首页管理','删除与排序','home.reorder'],['管理能力','黑名单与精编管理','roles.manage'],['审核','精编申请','review.editor']];
    return `<div class="gr-application-permissions" tabindex="0" aria-label="普通用户与精编权限对照"><table><caption>编辑与管理权限</caption><thead><tr><th>分类</th><th>功能</th>${writingRoles.map(role=>`<th>${esc(roleLabels[role])}</th>`).join('')}</tr></thead><tbody>${rows.map(([group,label,action])=>`<tr><th>${esc(group)}</th><td>${esc(label)}</td>${writingRoles.map(role=>`<td aria-label="${esc(roleLabels[role])}${can(action,role)?'允许':'不可用'}">${can(action,role)?'✓':'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function applyEditor(input){
    const current=editorApplication();
    if(current.blocked)return {ok:false,code:'forbidden',message:'当前账号暂不能提交申请。'};
    if(current.role==='editor'||current.role==='manager')return {ok:false,code:'already-editor',message:'你已拥有精编身份。'};
    if(current.application?.status==='pending')return {ok:false,code:'pending',message:'申请正在审核中，请勿重复提交。'};
    const legacy=typeof input==='string',form=applicationForm(legacy?{text:input}:input&&typeof input==='object'?input:{});
    const moderation=GH.guideStore?.moderationError?.(form);if(moderation)return {ok:false,code:'validation',message:moderation};
    if(!validReason(form.plan))return {ok:false,code:'validation',message:'请填写申请说明，最多200字。'};
    if(!legacy){
      if(!validReason(form.contact))return {ok:false,code:'validation',message:'请填写联系方式，最多200字。'};
      if(form.wikiExperience.length>200)return {ok:false,code:'validation',message:'Wiki 使用情况最多200字。'};
      if(!Object.hasOwn(applicationChoices.writingExperience,form.writingExperience))return {ok:false,code:'validation',message:'请选择攻略或图鉴编写经验。'};
      if(!Object.hasOwn(applicationChoices.translationAbility,form.translationAbility))return {ok:false,code:'validation',message:'请选择外文检索与翻译能力。'};
    }
    form.contact=form.contact.trim();form.plan=form.plan.trim();form.wikiExperience=form.wikiExperience.trim();
    const application={id:'application-player-b-'+(state.applications.filter(item=>item.actorId===applicantId).length+1),actorId:applicantId,text:form.plan,form,status:'pending',reason:''};
    state.applications.push(application);
    return {ok:true,code:'success',application:clone(application)};
  }
  const notice=(kind,text)=>{state.notice={kind,text:String(text||'').replace(/^(?:国内|海外)区/,'')};};
  const paint=()=>{if(!state.pendingRole&&state.detail?.kind!=='policy')releaseOverlay();GH.render();};
  const field=(id,label,control)=>`<label class="gg-field"><span>${esc(label)}</span>${control}</label>`;
  const draft=(key,fallback='')=>state.drafts[key]??fallback;
  const reason=(key,placeholder)=>`<textarea data-gg-draft="${esc(key)}" maxlength="200" rows="3" placeholder="${esc(placeholder)}">${esc(draft(key))}</textarea>`;
  const form=(type,id,body)=>`<form data-gg-form="${type}" data-gg-id="${esc(id)}" novalidate>${body}</form>`;
  const button=(text,action,extra='')=>`<button type="button" data-gg-action="${action}" ${extra}>${esc(text)}</button>`;
  const accountOptions=(selected,items=state.accounts)=>items.map(item=>`<option value="${esc(item.id)}" ${item.id===selected?'selected':''}>${esc(item.name)}（${esc(item.id)}）</option>`).join('');
  const empty=text=>`<div class="gg-empty" data-gg-empty>${esc(text)}</div>`;
  const labels={pending:'待审核',approved:'已通过',rejected:'已驳回'};
  const matches=(...values)=>!state.query.trim()||values.join(' ').toLowerCase().includes(state.query.trim().toLowerCase());
  const back=()=>button('‹ 返回列表','list','class="gg-back"');
  const table=(heads,rows,kind)=>`<div class="gg-table-wrap gg-record-table" tabindex="0"><table data-gg-list="${kind}"><thead><tr>${heads.map(head=>`<th>${esc(head)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${heads.length}">${empty(state.query?'没有匹配记录，请调整搜索条件。':'暂无记录')}</td></tr>`}</tbody></table></div>`;
  function toolbar(count,extra=''){return `<div class="gg-list-toolbar"><span>${count} 条记录</span><div>${extra}<input type="search" data-gg-search aria-label="搜索当前列表" placeholder="搜索名称或 ID" value="${esc(state.query)}"></div></div>`;}
  function wikiPolicyForm(role){
    const scope=state.detail?.scope||wikiScope(),valid=validWikiScope(scope),policy=wikiPolicy(scope),key=valid?wikiKey(scope):'',editable=valid&&canSetWikiPolicy(role),selected=draft('wiki-policy-'+key,policy);
    return `<div class="gg-overlay gg-drawer-overlay" data-gg-overlay><section class="gg-panel gg-detail gg-policy-drawer" role="dialog" aria-modal="true" aria-labelledby="gg-policy-title" tabindex="-1" data-gg-drawer data-gg-overlay-key="policy"><header class="gg-overlay-heading"><h2 id="gg-policy-title">百科编辑范围</h2>${button('×','policy-cancel','class="gg-overlay-close" aria-label="关闭百科编辑范围"')}</header><div class="gg-drawer-body">${state.notice?.kind==='error'?`<p class="gg-notice gg-notice-error" role="alert">${esc(state.notice.text)}</p>`:''}<div class="gg-detail-meta"><strong>${esc(section(scope.sectionId)?.label||'未选择百科')}</strong><span>${esc(scope.sectionId)}</span></div><form data-gg-wiki-policy-form data-gg-wiki-region="${esc(scope.region)}" data-gg-wiki-section="${esc(scope.sectionId)}"><fieldset ${editable?'':'disabled'}><legend>谁可以进入此百科后台并编辑</legend>${[['all','所有人可编辑','普通用户和精编均可进入，操作范围按身份权限。'],['editors','仅精编可编辑','仅精编及管理员可进入此百科后台。']].map(([value,label,description])=>`<label class="gg-policy-option"><input type="radio" name="wiki-policy" data-gg-wiki-choice value="${value}" ${selected===value?'checked':''}><span><strong>${label}</strong><small>${description}</small></span></label>`).join('')}</fieldset><div class="gg-drawer-actions">${button('取消','policy-cancel')}${editable?'<button type="submit" class="gg-primary" data-gg-wiki-policy-save>保存修改</button>':''}</div></form></div></section></div>`;
  }
  function overview(role){
    const scope=wikiScope(),key=wikiKey(scope),values=state.permissionDrafts[key]||permissionMatrix(scope),editable=canSetWikiPolicy(role);
    return `<section class="gg-panel"><div class="gg-panel-heading"><h2>权限总览</h2>${editable?`<div class="gg-actions gg-matrix-actions">${button('取消修改','permissions-cancel')}${button('保存修改','permissions-save','class="gg-primary"')}</div>`:''}</div><div class="gg-table-wrap"><table data-gg-permissions data-gg-wiki-key="${esc(key)}"><thead><tr><th>类别</th><th>操作</th>${writingRoles.map(value=>`<th>${esc(roleLabels[value])}</th>`).join('')}</tr></thead><tbody>${permissionRows.map(([group,label,action])=>`<tr data-gg-permission-row="${action}"><th>${esc(group)}</th><td>${esc(label)}</td>${writingRoles.map(value=>`<td><input type="checkbox" data-gg-permission="${action}" data-gg-permission-role="${value}" aria-label="${esc(roleLabels[value]+'：'+label)}" ${values[action].includes(value)?'checked':''} ${editable?'':'disabled'}></td>`).join('')}</tr>`).join('')}</tbody></table></div><h3 class="gg-subheading">百科编辑范围</h3>${table(['百科','当前范围','操作'],[`<tr><td>${esc(section(scope.sectionId)?.label||scope.sectionId)}</td><td>${wikiPolicy(scope)==='editors'?'仅精编可编辑':'所有人可编辑'}</td><td>${button(canSetWikiPolicy(role)?'编辑':'查看','policy-open')}</td></tr>`],'wiki-policy')}</section>${state.detail?.kind==='policy'?wikiPolicyForm(role):''}`;
  }
  function blacklist(){
    const detail=state.detail;
    if(detail?.kind==='blacklist-add'){
      return `${back()}<section class="gg-panel gg-detail"><h2>加入黑名单</h2>${form('blacklist-add','',field('actor','账号 UID *',`<input type="text" data-gg-draft="blacklist-actor" maxlength="100" autocomplete="off" list="gg-account-uids" value="${esc(draft('blacklist-actor'))}" placeholder="输入账号 UID"><datalist id="gg-account-uids">${state.accounts.filter(item=>!isBlocked(item.id)).map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</datalist>`)+field('reason','加入原因 *',reason('blacklist-reason','填写限制原因，最多 200 字'))+'<button type="submit" class="gg-primary">确认加入</button>')}</section>`;
    }
    if(detail?.kind==='blacklist'){
      const item=state.blacklist.find(row=>row.actorId===detail.id);
      if(!item){state.detail=null;return blacklist();}
      return `${back()}<section class="gg-panel gg-detail"><h2>黑名单详情</h2><dl class="gg-detail-fields"><div><dt>账号名称</dt><dd>${esc(actorName(item.actorId))}</dd></div><div><dt>账号 ID</dt><dd>${esc(item.actorId)}</dd></div><div><dt>加入原因</dt><dd>${esc(item.reason)}</dd></div></dl>${button('移出黑名单','blacklist-remove',`data-gg-id="${esc(item.actorId)}"`)}</section>`;
    }
    const rows=state.blacklist.filter(item=>matches(item.actorId,actorName(item.actorId),item.reason));
    return `<section class="gg-panel"><div class="gg-panel-heading"><h2>黑名单</h2>${button('＋ 加入黑名单','blacklist-add-open','class="gg-primary"')}</div>${toolbar(rows.length)}${table(['账号 ID','账号名称','加入原因','操作'],rows.map(item=>`<tr data-gg-blocked="${esc(item.actorId)}"><td><code>${esc(item.actorId)}</code></td><td>${esc(actorName(item.actorId))}</td><td class="gg-summary-cell">${esc(item.reason)}</td><td>${button('查看','blacklist-open',`data-gg-id="${esc(item.actorId)}"`)}</td></tr>`),'blacklist')}</section>`;
  }
  function roles(){
    if(state.detail?.kind==='role'){
      const item=account(state.detail.id);if(!item){state.detail=null;return roles();}
      return `${back()}<section class="gg-panel gg-detail"><h2>成员详情</h2><dl class="gg-detail-fields"><div><dt>账号名称</dt><dd>${esc(item.name)}</dd></div><div><dt>账号 ID</dt><dd>${esc(item.id)}</dd></div><div><dt>当前身份</dt><dd>${esc(roleLabels[item.role])}</dd></div><div><dt>账号状态</dt><dd>${isBlocked(item.id)?'已加入黑名单':'正常'}</dd></div></dl>${form('role-save',item.id,field('role','调整身份',`<select data-gg-draft="role-${esc(item.id)}">${writingRoles.map(value=>`<option value="${value}" ${draft('role-'+item.id,item.role)===value?'selected':''}>${esc(roleLabels[value])}</option>`).join('')}</select>`)+`<button type="submit" class="gg-primary">保存身份</button>`)}</section>`;
    }
    const rows=state.accounts.filter(item=>matches(item.name,item.id,roleLabels[item.role]));
    return `<section class="gg-panel"><h2>身份分级与成员</h2>${toolbar(rows.length)}${table(['账号 ID','账号名称','身份','账号状态','操作'],rows.map(item=>`<tr data-gg-member="${esc(item.id)}"><td><code>${esc(item.id)}</code></td><td>${esc(item.name)}</td><td>${esc(roleLabels[item.role])}</td><td>${isBlocked(item.id)?'已加入黑名单':'正常'}</td><td>${button('查看 / 编辑','role-open',`data-gg-id="${esc(item.id)}"`)}</td></tr>`),'roles')}</section>`;
  }
  function editorReviewAll(){
    if(state.detail?.kind==='application'){
      const item=state.applications.find(row=>row.id===state.detail.id);if(!item){state.detail=null;return editorReviewAll();}
      return `${back()}<section class="gg-panel gg-detail" data-gg-application="${esc(item.id)}"><div class="gg-panel-heading"><h2>精编申请详情</h2><span class="gg-pill">${labels[item.status]}</span></div><div class="gg-detail-meta"><strong>${esc(actorName(item.actorId))}</strong><span>${esc(item.actorId)}</span></div>${applicationDetails(item)}${item.status==='pending'?form('application',item.id,field('reason','驳回原因（驳回时必填）',reason('application-'+item.id,'说明需要补充的内容'))+'<div class="gg-actions"><button type="submit" name="decision" value="approve" class="gg-primary">通过申请</button><button type="submit" name="decision" value="reject">驳回申请</button></div>'):`<p class="gg-review-reason">${item.status==='approved'?'已获得初级精编身份。':'驳回原因：'+esc(item.reason)}</p>`}</section>`;
    }
    const rows=state.applications.filter(item=>matches(actorName(item.actorId),item.actorId,applicationForm(item).plan)&&(state.applicationFilter==='all'||item.status===state.applicationFilter));
    return `<section class="gg-panel"><h2>精编申请</h2>${toolbar(rows.length,`<select data-gg-application-filter aria-label="申请状态">${Object.entries({all:'全部状态',...labels}).map(([id,label])=>`<option value="${id}" ${state.applicationFilter===id?'selected':''}>${label}</option>`).join('')}</select>`)}${table(['申请 ID','申请人','申请说明','状态','操作'],rows.map(item=>`<tr data-gg-application-row="${esc(item.id)}"><td><code>${esc(item.id)}</code></td><td>${esc(actorName(item.actorId))}</td><td class="gg-summary-cell">${esc(applicationForm(item).plan)}</td><td><span class="gg-pill">${labels[item.status]}</span></td><td>${button(item.status==='pending'?'查看 / 审核':'查看','application-open',`data-gg-id="${esc(item.id)}"`)}</td></tr>`),'applications')}</section>`;
  }
  function roleConfirmation(){const change=state.pendingRole;if(!change)return '';return `<div class="gg-overlay gg-modal-overlay" data-gg-overlay><section class="gg-role-confirm" role="alertdialog" aria-modal="true" aria-labelledby="gg-role-confirm-title" aria-describedby="gg-role-confirm-description" tabindex="-1" data-gg-dialog data-gg-overlay-key="role"><h3 id="gg-role-confirm-title">确认调整身份？</h3><p id="gg-role-confirm-description">${esc(actorName(change.id))}：<strong>${esc(roleLabels[change.from])} → ${esc(roleLabels[change.to])}</strong></p><div class="gg-actions">${button('取消','role-cancel','data-gg-overlay-autofocus')}${button('确认调整','role-confirm','class="gg-primary"')}</div></section></div>`;}
  function confirmRole(role){
    if(!authorized(role)||!can('roles.manage',role))return;
    const change=state.pendingRole,item=change&&account(change.id);
    if(!change||!item||item.role!==change.from||draft('role-'+item.id)!==change.to){state.pendingRole=null;notice('error','身份选择已变化，请重新发起调整。');return;}
    if(!identityManagersRemain(state.accounts.map(value=>value.id===item.id?{...value,role:change.to}:value))){state.pendingRole=null;notice('error','至少保留一名可用的身份管理员。');return;}
    item.role=change.to;delete state.drafts['role-'+item.id];state.pendingRole=null;notice('success','身份已调整。');
  }
  function render(role='reader'){
    const allowed=pages.filter(([, ,permission])=>!permission||can(permission,role));
    if(!allowed.some(([id])=>id===state.tab)){state.tab='overview';state.detail=null;}
    const content={overview,blacklist,roles,'editor-review':editorReviewAll}[state.tab];
    return `<div class="gg-governance" data-gg-role="${esc(role)}" data-gg-view="${state.detail&&state.detail.kind!=='policy'?'detail':'list'}"><header class="gg-header"><h1>权限与审核</h1></header><nav class="gg-tabs" aria-label="权限与审核">${allowed.map(([id,label])=>`<button type="button" data-gg-tab="${id}" aria-current="${state.tab===id?'page':'false'}">${esc(label)}</button>`).join('')}</nav>${state.notice?`<p class="gg-notice gg-notice-${esc(state.notice.kind)}" data-gg-status="${esc(state.notice.kind)}" role="status">${esc(state.notice.text)}</p>`:''}${isBlocked()?'<p class="gg-block-note">当前账号已在黑名单中，暂不能保存词条和配置。</p>':''}${content(role)}${roleConfirmation()}</div>`;
  }
  function validReason(value){return typeof value==='string'&&value.trim().length>0&&value.trim().length<=200;}
  function authorized(role){const actor=GH.guideConsole?.actor?.();return !!actor&&actor.role===role&&account(actor.id)?.role===role&&GH.guideConsole.authorized(role)===true&&!isBlocked(actor.id);}
  function submit(type,id,decision,role){
    if(!authorized(role)){notice('error','当前账号没有该操作权限。');return;}
    const permission={'blacklist-add':'blacklist.manage','role-save':'roles.manage',application:'review.editor'}[type];
    if(!permission||!can(permission,role)){notice('error','当前身份没有该操作权限。');return;}
    if(type==='blacklist-add'){
      const value=draft('blacklist-actor'),actorId=typeof value==='string'?value.trim():'',why=draft('blacklist-reason');
      if(typeof value!=='string'||value.length>100||! /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(actorId)){notice('error','请输入有效账号 UID，最多 100 位字母、数字、下划线或短横线。');return;}
      if(isBlocked(actorId)){notice('error','该账号已在黑名单中。');return;}
      if(!validReason(why)){notice('error','请填写加入原因，最多 200 字。');return;}
      const moderation=GH.guideStore?.moderationError?.(why);if(moderation){notice('error',moderation);return;}
      if(!identityManagersRemain(state.accounts,[...state.blacklist,{actorId}])){notice('error','至少保留一名可用的身份管理员。');return;}
      state.blacklist.push({actorId,reason:why.trim()});delete state.drafts['blacklist-reason'];delete state.drafts['blacklist-actor'];state.detail=null;notice('success','已加入黑名单。');return;
    }
    if(type==='role-save'){
      const item=account(id),roleValue=draft('role-'+id,item?.role);
      if(!item||!writingRoles.includes(roleValue)){notice('error','账号或身份无效。');return;}
      if(item.role===roleValue){notice('error','身份没有变化。');return;}
      if(!identityManagersRemain(state.accounts.map(value=>value.id===item.id?{...value,role:roleValue}:value))){notice('error','至少保留一名可用的身份管理员。');return;}
      state.pendingRole={id,from:item.role,to:roleValue};state.notice=null;return;
    }
    const item=state.applications.find(value=>value.id===id),target=item&&account(item.actorId);
    if(!item||!target){notice('error','该申请已不可用。');return;}
    if(item.status!=='pending'){notice('error','该申请已处理。');return;}
    if(decision==='approve'){
      if(isBlocked(target.id)){notice('error','该账号已在黑名单中，请先解除限制。');return;}
      item.status='approved';if(target.role!=='manager')target.role='editor';notice('success','申请已通过，已获得初级精编身份。');return;
    }
    if(decision!=='reject'){notice('error','请选择审核结果。');return;}
    const why=draft('application-'+id);if(!validReason(why)){notice('error','请填写驳回原因，最多 200 字。');return;}
    const moderation=GH.guideStore?.moderationError?.(why);if(moderation){notice('error',moderation);return;}
    item.status='rejected';item.reason=why.trim();notice('success','申请已驳回。');
  }
  let overlayKeydown=null,lastOverlayKey=null;
  function releaseOverlay(){if(overlayKeydown)document.removeEventListener('keydown',overlayKeydown,true);overlayKeydown=null;document.body.classList.remove('gg-overlay-open');}
  function bindOverlay(root){
    if(overlayKeydown)document.removeEventListener('keydown',overlayKeydown,true);
    const dialog=root.querySelector('[data-gg-dialog],[data-gg-drawer]');
    document.body.classList.toggle('gg-overlay-open',!!dialog);
    if(!dialog){if(lastOverlayKey){root.querySelector(lastOverlayKey==='role'?'[data-gg-form="role-save"] button[type="submit"]':'[data-gg-action="policy-open"]')?.focus({preventScroll:true});lastOverlayKey=null;}return;}
    lastOverlayKey=dialog.dataset.ggOverlayKey;
    [...root.children].forEach(child=>{if(!child.hasAttribute('data-gg-overlay'))child.inert=true;});
    const focusable=()=>[...dialog.querySelectorAll('button,input,select,textarea,[tabindex]')].filter(item=>!item.disabled&&item.tabIndex>=0);
    overlayKeydown=event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dialog.querySelector(lastOverlayKey==='role'?'[data-gg-action="role-cancel"]':'[data-gg-action="policy-cancel"]')?.click();return;}
      if(event.key!=='Tab')return;
      const items=focusable(),first=items[0],last=items.at(-1);
      if(!first){event.preventDefault();dialog.focus();return;}
      if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',overlayKeydown,true);
    (dialog.querySelector('[data-gg-overlay-autofocus]')||dialog.querySelector('input:checked')||focusable()[0]||dialog).focus({preventScroll:true});
  }
  function bind(host,role='reader'){
    const root=host.querySelector('.gg-governance');if(!root)return;
    const policyForm=root.querySelector('[data-gg-wiki-policy-form]');
    if(policyForm){const scope={region:policyForm.dataset.ggWikiRegion,sectionId:policyForm.dataset.ggWikiSection},key=wikiKey(scope);policyForm.querySelectorAll('[data-gg-wiki-choice]').forEach(input=>input.onchange=()=>{if(canSetWikiPolicy(role))state.drafts['wiki-policy-'+key]=input.value;});policyForm.onsubmit=event=>{event.preventDefault();const current=wikiScope();if(!validWikiScope(current)||wikiKey(current)!==key){notice('error','百科已切换，请重新打开编辑范围。');paint();return;}const result=setWikiPolicy(scope,draft('wiki-policy-'+key,wikiPolicy(scope)),role),done=result.ok||result.code==='unchanged';if(done){state.detail=null;delete state.drafts['wiki-policy-'+key];}notice(done?'success':'error',result.message);paint();};}
    const permissions=root.querySelector('[data-gg-permissions]');
    permissions?.querySelectorAll('[data-gg-permission]').forEach(input=>input.onchange=()=>{const scope=wikiScope(),key=wikiKey(scope);if(!canSetWikiPolicy(role)||permissions.dataset.ggWikiKey!==key)return;const action=input.dataset.ggPermission,value=input.dataset.ggPermissionRole;if(!permissionRows.some(row=>row[2]===action)||!writingRoles.includes(value))return;const matrix=state.permissionDrafts[key]||(state.permissionDrafts[key]=permissionMatrix(scope));matrix[action]=writingRoles.filter(candidate=>candidate===value?input.checked:matrix[action].includes(candidate));});
    root.querySelectorAll('[data-gg-tab]').forEach(el=>el.onclick=()=>{const page=pages.find(([id])=>id===el.dataset.ggTab);if(!page||page[2]&&!can(page[2],role))return;state.tab=page[0];state.detail=null;state.pendingRole=null;state.notice=null;state.query='';paint();});
    root.querySelectorAll('[data-gg-draft]').forEach(el=>{const event=el.tagName==='SELECT'?'onchange':'oninput';el[event]=()=>{state.drafts[el.dataset.ggDraft]=el.value;};});
    root.querySelectorAll('[data-gg-form]').forEach(el=>el.onsubmit=event=>{event.preventDefault();submit(el.dataset.ggForm,el.dataset.ggId,event.submitter?.value,role);paint();});
    root.querySelectorAll('[data-gg-action]').forEach(el=>el.onclick=()=>{
      const action=el.dataset.ggAction,id=el.dataset.ggId;
      if(action==='list'){state.detail=null;state.pendingRole=null;state.notice=null;paint();return;}
      if(action==='policy-open'){state.detail={kind:'policy',scope:clone(wikiScope())};state.notice=null;paint();return;}
      if(action==='policy-cancel'){const scope=state.detail?.scope;if(validWikiScope(scope))delete state.drafts['wiki-policy-'+wikiKey(scope)];state.detail=null;state.notice=null;paint();return;}
      if(action==='role-cancel'){const change=state.pendingRole;if(change)delete state.drafts['role-'+change.id];state.pendingRole=null;state.notice=null;paint();return;}
      if(action==='permissions-cancel'){delete state.permissionDrafts[wikiKey(wikiScope())];state.notice=null;paint();return;}
      if(action==='permissions-save'){const scope=wikiScope(),result=setPermissions(state.permissionDrafts[wikiKey(scope)]||permissionMatrix(scope),role,scope);notice(result.ok||result.code==='unchanged'?'success':'error',result.message);paint();return;}
      if(!authorized(role)){notice('error','当前账号没有该操作权限。');paint();return;}
      if(action==='role-open'&&can('roles.manage',role)&&account(id))state.detail={kind:'role',id};
      else if(action==='blacklist-add-open'&&can('blacklist.manage',role))state.detail={kind:'blacklist-add'};
      else if(action==='blacklist-open'&&can('blacklist.manage',role)&&isBlocked(id))state.detail={kind:'blacklist',id};
      else if(action==='application-open'&&can('review.editor',role)&&state.applications.some(item=>item.id===id))state.detail={kind:'application',id};
      else if(action==='role-confirm'){confirmRole(role);paint();return;}
      else if(action==='blacklist-remove'){
        if(!can('blacklist.manage',role)){notice('error','当前身份不能管理黑名单。');paint();return;}
        if(!isBlocked(id)){notice('error','该账号已移出黑名单。');paint();return;}
        state.blacklist=state.blacklist.filter(item=>item.actorId!==id);state.detail=null;notice('success','已移出黑名单。');paint();return;
      }
      state.notice=null;paint();
    });
    const filter=root.querySelector('[data-gg-application-filter]');if(filter)filter.onchange=()=>{state.applicationFilter=['all','pending','approved','rejected'].includes(filter.value)?filter.value:'all';paint();};
    const query=root.querySelector('[data-gg-search]');if(query)query.oninput=()=>{const start=query.selectionStart;state.query=query.value;paint();const next=document.querySelector('.gg-governance [data-gg-search]');next?.focus({preventScroll:true});next?.setSelectionRange(start,start);};
    bindOverlay(root);
  }
  GH.guideGovernance=Object.freeze({render,bind,reset,isBlocked,can,currentGrants,setPermissions,wikiPolicy,canAccessWiki,setWikiPolicy,editorApplication,applyEditor,applicationForm,applicationDetails,applicationPermissions,setTab(id){if(pages.some(([key])=>key===id)){state.tab=id;state.detail=null;state.pendingRole=null;state.notice=null;state.query='';}},communitySections:()=>clone(communitySections),regions:clone(regions),applicationChoices:clone(applicationChoices),inspect:()=>clone(state)});
})();

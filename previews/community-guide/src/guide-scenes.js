/* Page-local preview states. Fixtures never enter guideStore or reader drafts. */
(()=>{
'use strict';
const GH=window.GH;if(!GH?.guideConsole)return;
const E=GH.esc,states=new Map(),contributionExamples=new Set();
const templates={article:'富文本词条',table:'数据表格',gallery:'资料图鉴',album:'图片图册',entity:'实体资料',version:'版本索引'};
const readerTitles={portal:'攻略首页',category:'资料分类',post:'攻略原帖',record:'词条详情',search:'搜索资料',history:'词条编辑历史',contributions:'共建贡献榜',profile:'个人中心',favorites:'我的收藏','editor-application':'成为精编',compose:'发布攻略'};
const governanceTitles={overview:'权限总览','editor-review':'精编申请审核',roles:'身份分级与成员',blacklist:'黑名单管理'};
function current(){
 const account=GH.guideConsole.inspect(),scope=GH.guideStore.context(),scopeKey=scope.region+':'+scope.sectionId+':'+(GH.guideStore.language?.()||'zh-CN');
 if(GH.workspace==='author'){
  if(!account.session)return {key:'b:login:'+account.loginRegion,side:'b',view:'login',title:'后台扫码登录',scope};
  if(!account.wikiSelected)return {key:'b:'+account.session.id+':'+scope.region+':wiki-list',side:'b',view:'wiki-list',title:'百科列表',scope};
  const studio=GH.guideStudio.inspect();let view=account.page,title={config:'首页配置',edit:'词条配置',history:'编辑记录',governance:'权限与审核'}[view]||'编辑后台',suffix='';
  if(view==='edit'){view=studio.creating?'entry-create':studio.internalMode==='data'?'data':studio.listView?'entry-list':'entry-edit';title=view==='entry-create'?'新建词条':view==='data'?'模板数据':view==='entry-list'?'词条列表':'编辑词条';suffix=view==='entry-edit'?':'+studio.id:'';}
  if(view==='config'){suffix=':'+String(studio.configTitle||'list');title=studio.configTitle?'首页配置 · '+studio.configTitle:title;}
  if(view==='history'&&account.historyDetail){view='revision';title='历史版本';suffix=':'+(account.historyRevision?.id||'')+':'+(account.historyRevision?.revision||'');}
  if(view==='governance'){const governance=GH.guideGovernance.inspect();suffix=':'+(governance.tab||'overview')+':'+(governance.detail?governance.detail.kind+':'+(governance.detail.id||''):'list');title=governanceTitles[governance.tab]||title;}
  return {key:'b:'+account.session.id+':'+scopeKey+':'+view+suffix,side:'b',view,title,scope,governanceTab:GH.guideGovernance.inspect().tab,template:studio.draft?.record?.template||'article'};
 }
 if(GH.workspace!=='demo'||GH.route!=='guide')return {key:'other',side:'other',view:'other',title:'当前模块'};
 const reader=GH.modules.guide.inspect();let view=reader.view,title=readerTitles[view]||'攻略页面',suffix='';
 if(reader.zoom){view='zoom';title='图册大图';suffix=':'+reader.zoom.id+':'+reader.zoom.index;}
 else if(view==='record'){title=reader.snapshot?'词条历史快照':templates[reader.currentRecord?.template]||title;suffix=':'+reader.id+':'+(reader.panel||'content')+(reader.snapshot?':snapshot':'');}
 else if(view==='category')suffix=':'+reader.category;
 else if(view==='post')suffix=':'+reader.postId;
 else if(view==='history')suffix=':'+reader.id;
 else if(view==='contributions'){suffix=':'+(reader.contributionTab||'board');if(reader.contributionAuthor){title='编辑者贡献历史';suffix+=':author:'+reader.contributionAuthor;}}
 else if(['profile','favorites'].includes(view))suffix=':'+(reader.profileTab||'posts')+':'+(reader.favoriteTab||'posts');
 return {key:'c:'+scopeKey+':'+view+suffix,side:'c',view,title,scope,template:reader.currentRecord?.template||'article',reader};
}
function options(){const page=current();if(page.side==='other')return [['actual','当前会话内容']];const choices=[['actual','恢复当前会话内容'],['all','完整内容'],['empty','缺省 / 暂无内容'],['loading','加载中'],['failed','加载失败']];if(['wiki-list','search','category','history','entry-list','data','config','governance','contributions','favorites','profile'].includes(page.view))choices.push(['noresults','搜索无结果']);if(['entry-create','entry-edit','compose','editor-application'].includes(page.view))choices.push(['validation','填写校验失败']);if(page.view==='entry-edit')choices.push(['conflict','版本冲突']);if(page.view==='login')choices.push(['expired','二维码已过期'],['scanned','已扫码 · 等待确认']);return choices;}
function contributionKey(){const page=current();return page.side==='c'&&page.view==='contributions'?'contributions:'+page.scope.region+':'+page.scope.sectionId+':'+(GH.guideStore.language?.()||'zh-CN'):null;}
function contributionFull(){const key=contributionKey();return !!key&&contributionExamples.has(key);}
function selected(){return states.get(current().key)||(contributionFull()?'all':'actual');}
function set(value){const aliases={full:'actual',initial:'empty','search-empty':'noresults'};value=aliases[value]||value;if(!options().some(([id])=>id===value))return false;const key=current().key,group=contributionKey();if(group&&(value==='all'||value==='actual')){contributionExamples[value==='all'?'add':'delete'](group);const prefix=key.slice(0,key.indexOf(':contributions')+':contributions'.length);for(const saved of states.keys())if(saved.startsWith(prefix))states.delete(saved);}else if(value==='actual')states.delete(key);else states.set(key,value);GH.render();return true;}
function stateMarkup(page,state){
 const labels={empty:['暂无内容','当前页面暂时没有可展示的内容。'],loading:['正在加载','请稍候。'],failed:['加载失败','暂时无法获取内容，请重试。'],noresults:['没有匹配结果','请调整关键词或筛选条件。'],validation:['请完善填写内容','请检查必填项、图片格式和修改说明。'],conflict:['版本冲突','公开版本已更新，载入最新版本后再核对修改。'],expired:['二维码已过期','请刷新二维码后重新扫码。'],scanned:['已扫码','请在 APP 中确认登录。']};
 const [title,detail]=labels[state]||labels.empty;
 return `<section class="gsc-state" data-gsc-state="${E(state)}" aria-live="polite" ${state==='loading'?'aria-busy="true"':''}><span class="gsc-state-symbol ${state==='loading'?'loading':''}" aria-hidden="true">${state==='failed'?'!':state==='loading'?'':state==='scanned'?'✓':'—'}</span><h2>${title}</h2><p>${detail}</p>${state==='loading'?'<div class="gsc-skeleton"><span></span><span></span><span></span></div>':''}<button type="button" data-gsc-restore>${['failed','expired'].includes(state)?'重试':'恢复当前会话内容'}</button></section>`;
}
function apply(){
 const page=current(),state=selected();if(page.side==='other'||state==='actual'||state==='all')return;
 const target=page.side==='b'?document.querySelector(page.view==='login'?'.gc-login-qr-main':'.gc-content'):document.querySelector(page.view==='zoom'?'.gr-lightbox figure':page.view==='contributions'?'.gr-contributions':'.gr-scroll');if(!target)return;
 if(target.dataset.gscRendered===page.key+':'+state)return;target.dataset.gscRendered=page.key+':'+state;
  const chrome=page.view==='contributions'?'.gr-contribution-tabs,.gr-contribution-scope':['profile','favorites'].includes(page.view)?'header.gr-subheader,.gr-personal-header,.gr-personal-tabs,.gr-favorite-tabs':'header.gr-subheader',preserved=page.side==='c'&&page.view!=='zoom'?[...target.children].filter(node=>node.matches(chrome)):[];target.replaceChildren(...preserved);target.insertAdjacentHTML('beforeend',stateMarkup(page,state));
  if(page.side==='c')document.querySelector('[data-gr-record-dock]')?.setAttribute('inert','');
 target.querySelectorAll('[data-gsc-restore]').forEach(button=>button.onclick=()=>set('actual'));
}
GH.guideScenes=Object.freeze({current,options,selected,set,apply,contributionFull,inspect:()=>({current:current(),selected:selected(),states:Object.fromEntries(states),fixtureOnly:false})});
})();

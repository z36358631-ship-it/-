(() => {
  'use strict';
  function create(ctx){
    const {state,action,gameGrid}=ctx;
    state.fitDevice ||= 'current'; state.fitGenre ||= 'all';
    function page(name){
      if(name!=='compatibility')return null;
      const matched=state.fitDevice==='current'&&state.capability==='local'&&state.match==='matched';
      const ids=matched?['hades','elden'].filter(id=>state.fitGenre==='all'||(state.fitGenre==='rogue'?id==='hades':id==='elden')):[];
      return `<div class="fit-page"><div class="fit-filters"><label>机型<select data-fit="device" aria-label="机型"><option value="current" ${state.fitDevice==='current'?'selected':''}>本机</option><option value="other" ${state.fitDevice==='other'?'selected':''}>其他机型</option></select></label><label>游戏类型<select data-fit="genre" aria-label="游戏类型">${[['all','全部类型'],['rogue','肉鸽'],['rpg','角色扮演']].map(([value,name])=>`<option value="${value}" ${state.fitGenre===value?'selected':''}>${name}</option>`).join('')}</select></label></div>${ids.length?gameGrid(ids,{compact:true}):`<div class="empty-card"><h3>${state.fitDevice==='other'?'暂无该机型数据':state.match==='unknown'?'尚未识别当前设备':'暂无匹配的兼容记录'}</h3></div>`}</div>`;
    }
    function handle(name){if(name!=='compatibility')return false;ctx.go('compatibility');return true;}
    return {page,handle};
  }
  window.LAB_COMPATIBILITY={create};
})();

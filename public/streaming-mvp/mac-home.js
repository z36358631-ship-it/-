/* Screenshot-led Mac home; only the requested remote-computer entry is interactive. */
function macHome(){
  const media=MAC_HOME_MEDIA;
  const tool=(label,name,extra='',action='no-action')=>`<button type="button" class="mn-tool ${extra}" data-action="${action}" aria-label="${label}" title="${label}">${icon(name)}</button>`;
  const art=(key,label,cls='')=>`<img class="${cls}" src="${media[key]}" alt="${label}" draggable="false">`;
  const cards=[['divinity','推荐度 98%','8.5'],['stray','编辑精选','8.5'],['dave','支持下载','7.8'],['risk','支持下载','7.8']];
  return `<div class="mac-native-home" aria-label="盖世游戏 Mac 首页">
    <header class="mn-windowbar">
      <div class="mn-traffic" aria-hidden="true"><i></i><i></i><i></i></div>
      ${tool('返回','back')}${tool('刷新','refresh')}
      <div class="mn-search" aria-label="搜索游戏">${icon('search')}<span>Reviews:</span></div>
      <div class="mn-window-actions">${tool('远程电脑','monitor','mn-remote','enter-remote')}${tool('下载','download')}${tool('消息','chat')}${tool('通知','bell')}${tool('设置','settings')}<button type="button" class="mn-avatar" data-action="no-action" aria-label="个人中心">${art('avatar','个人头像')}</button></div>
    </header>
    <aside class="mn-sidebar" aria-label="主导航">
      <div class="mn-brand">${art('logo','盖世游戏')}</div>
      ${tool('主页','home','mn-side-active')}${tool('云游戏','wifi')}${tool('应用','grid')}${tool('设备','screen')}
      <div class="mn-side-games">${['sideOne','sideTwo','sideThree'].map((key,i)=>`<button type="button" data-action="no-action" aria-label="最近游戏 ${i+1}">${art(key,'')}</button>`).join('')}</div>
      <div class="mn-sidebar-space"></div><button type="button" class="mn-collapse" data-action="no-action" aria-label="展开侧栏">${icon('chevron')}${icon('chevron')}</button>
    </aside>
    <main class="mn-main">
      <nav class="mn-tabs" aria-label="内容分类"><button type="button" class="mn-tab-selected" data-action="no-action" aria-current="page">${icon('game')}精选</button><button type="button" data-action="no-action">${icon('game')}排行榜</button><button type="button" data-action="no-action">${icon('game')}游戏库</button><button type="button" data-action="no-action">${icon('chat')}【新游戏】专题页</button></nav>
      <section class="mn-hero" aria-label="编辑今日主推">
        ${art('heroSky','雪山游戏场景','mn-hero-sky')}${art('heroFigure','背剑人物游戏画面','mn-hero-figure')}<div class="mn-hero-shade"></div>
        <div class="mn-hero-copy"><p class="mn-pick">${icon('bolt')}编辑部今日主推</p><h1>Assassin's Creed Valhalla</h1><p class="mn-description">踏入维京时代的开放世界。完整支持本机运行与秒玩，适合长线探索。</p><div class="mn-metadata"><span>特别好评 <b>8.5</b></span><span>已发行</span><span>动作 · 冒险</span></div><button type="button" class="mn-play" data-action="no-action">秒玩</button></div>
        <div class="mn-hero-thumbs">${[['dyson','戴森球计划'],['witcher','巫师 3：狂猎'],['nightmares','小小梦魇'],['divinityThumb','神界：原罪 2']].map(([key,label],i)=>`<button type="button" class="${i===1?'mn-thumb-selected':''}" data-action="no-action" aria-label="${label}">${art(key,label)}</button>`).join('')}</div>
      </section>
      <section class="mn-editor" aria-labelledby="mn-editor-title"><header class="mn-editor-header"><div><h2 id="mn-editor-title">编辑精选</h2><p>结合玩家口碑、设备兼容性和平台热度推荐</p></div><div class="mn-editor-actions"><button type="button" data-action="no-action">查看全部 ${icon('chevron')}</button>${tool('上一组','back')}${tool('下一组','chevron')}</div></header>
        <div class="mn-card-track">${cards.map(([key,badge,score])=>`<article class="mn-card"><div class="mn-card-cover">${art(key,key==='divinity'?'神界：原罪 2':key==='stray'?'Stray':key==='dave'?'潜水员戴夫':'雨中冒险 2')}<span class="mn-card-badge">${badge}</span></div><div class="mn-card-copy"><div class="mn-card-name"><h3>Assassin's Creed Valhalla</h3><b>${score}</b></div><p>高口碑动作冒险，本周玩家增长最快。</p><button type="button" data-action="no-action">查看详情 ${icon('chevron')}</button></div></article>`).join('')}</div>
      </section>
    </main>
  </div>`;
}

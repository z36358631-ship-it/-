(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const n of o)if(n.type==="childList")for(const a of n.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function c(o){const n={};return o.integrity&&(n.integrity=o.integrity),o.referrerPolicy&&(n.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?n.credentials="include":o.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(o){if(o.ep)return;o.ep=!0;const n=c(o);fetch(o.href,n)}})();function m(e){return[...e.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(r=>r.getClientRects().length>0)}function g(e){let r=e.matchReducedMotion?.()??matchMedia("(prefers-reduced-motion: reduce)").matches;const c=new Set;let i=null,o=null;const n=()=>{e.root.dataset.reducedMotion=String(r)},a=()=>({reducedMotion:r}),f=t=>{if(t.key!=="Tab"||!i)return;const s=m(i);if(s.length===0){t.preventDefault(),i.focus();return}const p=s[0],h=s[s.length-1];t.shiftKey&&document.activeElement===p?(t.preventDefault(),h?.focus()):!t.shiftKey&&document.activeElement===h&&(t.preventDefault(),p?.focus())};return n(),{snapshot:a,subscribe(t){return c.add(t),()=>c.delete(t)},setReducedMotion(t){r=t,n(),c.forEach(s=>s(a()))},announce(t,s="polite"){e.liveRegion.setAttribute("aria-live",s),e.liveRegion.textContent="",queueMicrotask(()=>{e.liveRegion.textContent=t})},activateModal(t,s){o=document.activeElement,i=t,t.setAttribute("role","dialog"),t.setAttribute("aria-modal","true"),document.addEventListener("keydown",f),queueMicrotask(()=>(s??m(t)[0]??t).focus())},deactivateModal(t,s){i===t&&(document.removeEventListener("keydown",f),t.removeAttribute("aria-modal"),i=null,(s??o)?.focus(),o=null)},dispose(){document.removeEventListener("keydown",f),i=null,c.clear()}}}const y=[{id:"ricochet-crew",title:"弹珠暴走团",kicker:"一发改写整条弹道",description:"瞄准、松手、途中发动角色技，在机械遗迹里撞出连锁爆破。",coreInput:"战术弹射",duration:"约 5 分钟",art:"./assets/ricochet-card.webp",href:"../ricochet-crew/",accent:"#61e7ff"},{id:"monster-night-market",title:"怪兽夜市",kicker:"一步同时端出三道菜",description:"滑动整行或整列，为怪兽顾客规划配方、留料和连灶庆典。",coreInput:"行列滑动",duration:"4–5 分钟",art:"./assets/night-market-card.webp",href:"../monster-night-market/",accent:"#ffbd55"},{id:"three-lane-squad",title:"三路小队",kicker:"拆阵换路，极限救场",description:"部署、进化、换路和集火，在三条防线上主动打断巨兽。",coreInput:"拖放调兵",duration:"约 6 分钟",art:"./assets/three-lane-card.webp",href:"../three-lane-squad/",accent:"#b7a5ff"}],l=document.querySelector("#app"),b=document.querySelector("#live-region");if(!l||!b)throw new Error("HUB_DOM_MISSING");const u=g({root:l,liveRegion:b});l.style.setProperty("--hub-key-art",'url("./assets/hub-key-art.webp")');let d={};try{d=JSON.parse(localStorage.getItem("hub:recent-games")??"{}")}catch{localStorage.removeItem("hub:recent-games")}l.innerHTML=`
  <header class="hero">
    <p class="eyebrow">GAMEHUB ORIGINALS · H5 PLAYGROUND</p>
    <h1>奇想游乐场</h1>
    <p class="hero-copy">三种完全不同的手感。选一款，先玩三局再下判断。</p>
    <button class="motion-toggle" type="button" aria-pressed="${u.snapshot().reducedMotion}">
      减少动态效果
    </button>
  </header>
  <section class="game-list" aria-label="可试玩游戏">
    ${y.map((e,r)=>{const c=d[e.id];return`
        <article class="game-card" style="--accent:${e.accent}">
          <img src="${e.art}" width="960" height="540" alt="" decoding="${r===0?"sync":"async"}" fetchpriority="${r===0?"high":"low"}">
          <div class="card-shade"></div>
          <div class="card-copy">
            <p class="kicker">${e.kicker}</p>
            <h2>${e.title}</h2>
            <p>${e.description}</p>
            <div class="meta"><span>${e.coreInput}</span><span>${e.duration}</span></div>
            <a class="play" data-game-id="${e.id}" href="${e.href}">
              ${c?`继续挑战 · 已玩 ${c.runs} 局`:"开始试玩"}
            </a>
          </div>
        </article>`}).join("")}
  </section>
  <footer>本地试玩不会要求微信登录、支付或分享。</footer>
`;l.querySelector(".motion-toggle")?.addEventListener("click",e=>{const r=!u.snapshot().reducedMotion;u.setReducedMotion(r),e.currentTarget.setAttribute("aria-pressed",String(r)),u.announce(r?"已减少动态效果":"已恢复完整动态效果")});l.querySelectorAll("[data-game-id]").forEach(e=>{e.addEventListener("click",()=>{const r=e.dataset.gameId;if(!r)return;const c=d[r];d[r]={lastPlayedAt:Date.now(),runs:c?.runs??0},localStorage.setItem("hub:recent-games",JSON.stringify(d))})});

import fs from 'node:fs';
const sources={
 android:'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html',
 mac:'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-Mac端demo.html',
 admin:'demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html'
};
const pages=Object.fromEntries(Object.entries(sources).map(([key,path])=>[key,fs.readFileSync(path,'utf8')]));
function startSuite(pages){
 const labels={android:'Android 端',mac:'Mac 端',admin:'后台'};
 let cleanup=null;
 window.showCompatibilityTab=function(key){
  if(!pages[key])return;
  if(document.querySelector('#modalFeedback.show')&&typeof window.closeFeedbackModal==='function')window.closeFeedbackModal();
  if(cleanup)cleanup();
  const code=[];
  let html=pages[key].replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi,(_,js)=>{code.push(js);return '';});
  const nav='<nav id="compatibilitySuiteTabs" aria-label="演示端切换">'+Object.entries(labels).map(([id,label])=>`<button type="button" role="tab" aria-selected="${id===key}" onclick="showCompatibilityTab('${id}')">${label}</button>`).join('')+'</nav>';
  const css='<style>html{scroll-padding-top:60px}body{margin-top:60px!important;min-height:calc(100vh - 60px)!important}#compatibilitySuiteTabs{position:fixed;top:0;left:0;right:0;height:60px;z-index:2147483647;background:#16191f;display:flex;align-items:center;justify-content:center;gap:8px;border-bottom:1px solid #353b45;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}#compatibilitySuiteTabs button{font:inherit;cursor:pointer;border:1px solid transparent;border-radius:8px;padding:9px 26px;background:transparent;color:#aeb6c4}#compatibilitySuiteTabs button[aria-selected="true"]{background:#253c52;color:#70c9ff;border-color:#3c647e}#compatibilitySuiteTabs button:focus-visible{outline:2px solid #70c9ff;outline-offset:2px}</style>';
  html=html.replace('</head>',css+'</head>').replace(/(<body\b[^>]*>)/i,'$1'+nav);
  document.open();document.write(html);document.close();
  const timers=[];const intervals=[];const listeners=[];const exports=[];
  const timeout=(fn,ms,...args)=>{const id=window.setTimeout(fn,ms,...args);timers.push(id);return id;};
  const interval=(fn,ms,...args)=>{const id=window.setInterval(fn,ms,...args);intervals.push(id);return id;};
  const scopeWindow=new Proxy(window,{get(target,prop){
   if(prop==='setTimeout')return timeout;if(prop==='setInterval')return interval;
   if(prop==='addEventListener')return (type,fn,options)=>{listeners.push([type,fn,options]);target.addEventListener(type,fn,options);};
   const value=target[prop];return typeof value==='function'&&!Object.prototype.hasOwnProperty.call(target,prop)?value.bind(target):value;
  },set(target,prop,value){if(!['showCompatibilityTab'].includes(prop))exports.push(prop);target[prop]=value;return true;}});
  const joined=code.join('\n');
  const names=[...new Set([...joined.matchAll(/^\s*(?:async\s+)?function\s+([\w$]+)\s*\(/gm)].map(m=>m[1]))];
  const expose=names.map(n=>`if(typeof ${n}==='function')window[${JSON.stringify(n)}]=${n};`).join('\n');
  cleanup=()=>{timers.forEach(clearTimeout);intervals.forEach(clearInterval);listeners.forEach(args=>window.removeEventListener(...args));exports.forEach(name=>{try{delete window[name];}catch{}});};
  new Function('window','setTimeout','setInterval',joined+'\n'+expose)(scopeWindow,timeout,interval);
  document.documentElement.dataset.demoPlatform=key;
  if(key==='admin'){
   if(typeof window.openAdminSection==='function')window.openAdminSection('page-compat-domestic');
  }
 };
 const initial=new URLSearchParams(location.search).get('platform');
 window.showCompatibilityTab(pages[initial]?initial:'android');
}
const html='<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><title>兼容性评价 · Android / Mac / 后台</title><script>('+startSuite.toString()+')('+JSON.stringify(pages).replace(/</g,'\\u003c')+');</script></html>';
for(const path of ['demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-整合demo.html','previews/compatibility-review-v1.2/index.html'])fs.writeFileSync(path,html);
console.log('Built offline three-tab compatibility demo');

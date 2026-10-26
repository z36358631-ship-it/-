// Front-end demonstration transport only. Contains no real account tokens.
const RemoteQrDemo=(()=>{
 const prefix='gamehub-remote-demo-qr:';
 const memory=new Map();
 function get(id){if(!/^[a-z0-9-]{12,80}$/i.test(id||''))return null;let r;try{r=JSON.parse(localStorage.getItem(prefix+id)||'null')||memory.get(id)||null;}catch{r=memory.get(id)||null;}if(r&&r.expiresAt&&Date.now()>r.expiresAt&&['blocked','waiting','scanned','confirmed'].includes(r.state))r={...r,state:'expired'};return r;}
 function put(record){memory.set(record.id,record);try{localStorage.setItem(prefix+record.id,JSON.stringify(record));}catch{}return record;}
 function create(region){const id=typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);put({kind:'gamehub-remote-login-demo',id,region,state:'waiting',createdAt:Date.now(),expiresAt:Date.now()+120000});return id;}
 function update(id,state,account=''){const record=get(id);if(!record)return null;return put({...record,state,account:account||record.account||''});}
 function payload(id){const r=get(id);return r?JSON.stringify({kind:r.kind,id:r.id,region:r.region}):'';}
 function parse(raw){try{const p=JSON.parse(raw);return p.kind==='gamehub-remote-login-demo'&&['domestic','overseas'].includes(p.region)&&/^[a-z0-9-]{12,80}$/i.test(p.id)?p:null;}catch{return null;}}
 return {prefix,get,create,update,payload,parse};
})();

/* 兑换记录：只读运营查询原型，不连接兑换或权益服务。 */
((namespace) => {
  'use strict';
  if (!namespace?.templates || !namespace?.shell) return;
  const ROUTE = 'P01-11', PAGE_SIZE = 20;
  const e = namespace.components.escapeHtml;
  const copy = value => JSON.parse(JSON.stringify(value));
  const labels = { success:'成功', failed:'失败', pending:'待核对' };
  const emptyFilters = () => ({ uid:'', identifier:'', game:'', from:'', to:'', result:'' });
  const fixtures = Array.from({ length:24 }, (_, index) => {
    const n = index + 1, key = String(n).padStart(4,'0'), success = n % 5 !== 0, pending = n === 3 || n === 8;
    const unknown = n === 5, game = n % 3 === 0 ? 'TEVI' : '星海远征';
    return {
      id:`RDM-DEMO-${key}`, requestId:`REQ-REDEEM-DEMO-${key}`, uid:n < 4 ? '10006927' : String(10000520 + n),
      codeId:unknown ? '' : `CID-DEMO-${key}`, maskedCode:unknown ? '' : `•••• •••• ${key}`,
      gameId:unknown ? '' : game === 'TEVI' ? 'GAME-TEVI-DEMO' : 'GAME-48291', game:unknown ? '' : game,
      product:unknown ? '' : game !== 'TEVI' && n % 4 === 0 ? '远航季票 · DLC' : '标准版 · 游戏本体', skuId:unknown ? '' : game === 'TEVI' ? 'TEVI-BASE-DEMO' : n % 4 === 0 ? 'DLC-SEASON-01' : 'BASE-GLOBAL',
      channel:unknown ? '' : n % 2 ? 'NovaPlay Store' : 'ArcadeX 文件渠道', channelId:unknown ? '' : n % 2 ? 'CH-240901' : 'CH-240902',
      batchId:unknown ? '' : `BT-DEMO-${game === 'TEVI' ? 'TEVI-BASE' : n % 4 === 0 ? 'ODYSSEY-DLC' : 'ODYSSEY-BASE'}-${n % 2 ? 'API' : 'FILE'}`,
      requestedAt:`2026-10-15 ${String(11 - Math.floor(index / 4)).padStart(2,'0')}:${String(50 - index % 4 * 10).padStart(2,'0')}:00`,
      completedAt:!pending && success ? `2026-10-15 ${String(11 - Math.floor(index / 4)).padStart(2,'0')}:${String(50 - index % 4 * 10).padStart(2,'0')}:02` : '',
      result:pending ? 'pending' : success ? 'success' : 'failed',
      claimId:!pending && success ? `CLAIM-DEMO-${key}` : '', entitlementId:!pending && success ? `ENT-DEMO-${key}` : '',
      updatedAt:`2026-10-15 ${String(11 - Math.floor(index / 4)).padStart(2,'0')}:${String(51 - index % 4 * 10).padStart(2,'0')}:00`,
      reason:pending ? (n === 8 ? '账号已拥有对应权益，未新增发放；核销结果待核对。' : '兑换请求结果尚未确认，权益发放结果待核对。') : success ? '' : unknown ? '未能识别产品代码，无法归属游戏、商品或批次。' : '该码已失效，本次未核销，未发放权益。',
    };
  });
  // 两条同秒样例，用记录ID稳定排序，不改变原事务标识。
  fixtures[1].requestedAt = fixtures[0].requestedAt;
  fixtures[1].completedAt = fixtures[0].completedAt;
  const state = { records:copy(fixtures), filters:emptyFilters(), draft:emptyFilters(), page:1, error:'', allowed:false, demoOpen:false };
  const beijingTime = value => {
    const text = String(value || '').trim().replace('T',' ').replace(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})$/,'$1:00');
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) return NaN;
    const time = Date.parse(text.replace(' ','T') + '+08:00');
    return Number.isFinite(time) && new Date(time + 8 * 3600000).toISOString().slice(0,19).replace('T',' ') === text ? time : NaN;
  };
  const visibleRecords = () => {
    if (!state.allowed) return [];
    const f = state.filters;
    return state.records.filter(row => (!f.uid || row.uid === f.uid) && (!f.identifier || row.id === f.identifier || row.codeId === f.identifier) && (!f.game || row.gameId === f.game) && (!f.result || row.result === f.result) && (!f.from || beijingTime(row.requestedAt) >= beijingTime(f.from)) && (!f.to || beijingTime(row.requestedAt) <= beijingTime(f.to)))
      .sort((a,b) => beijingTime(b.requestedAt) - beijingTime(a.requestedAt) || b.id.localeCompare(a.id,'en'));
  };
  const query = values => {
    if (!state.allowed) return false;
    const next = Object.fromEntries(Object.keys(emptyFilters()).map(key => [key,String(values[key] || '').trim()]));
    state.draft = next;
    state.error = next.from && !Number.isFinite(beijingTime(next.from)) || next.to && !Number.isFinite(beijingTime(next.to)) ? '请输入有效的北京时间。' : next.from && next.to && beijingTime(next.from) > beijingTime(next.to) ? '开始时间不能晚于结束时间。' : '';
    if (state.error) return false;
    state.filters = copy(next); state.page = 1; return true;
  };
  // 仅用于演示原请求结果核对；白名单不保存明文代码，也不执行核销或发放。
  const reconcile = data => {
    if (!data?.requestId || !data.id || !['success','failed','pending'].includes(data.result)) return null;
    const fields = Object.keys(fixtures[0]), record = Object.fromEntries(fields.map(key => [key,String(data[key] ?? '')]));
    if (!Number.isFinite(beijingTime(record.requestedAt))) return null;
    if (record.result === 'success' && (!record.claimId || !record.entitlementId || !Number.isFinite(beijingTime(record.completedAt)))) {record.result='pending';record.reason=record.reason || '核销或权益发放凭据尚未确认。';}
    if (record.result === 'success') record.reason='';
    if (record.result !== 'success') {record.completedAt='';record.entitlementId='';if(record.result==='failed')record.claimId='';}
    const old = state.records.find(row => row.requestId === record.requestId);
    if (old) {
      if (old.result !== 'pending' || record.uid !== old.uid || record.codeId !== old.codeId) return copy(old);
      Object.assign(old,record,{ id:old.id, requestId:old.requestId, requestedAt:old.requestedAt });
      return copy(old);
    }
    if (state.records.some(row => row.id === record.id)) return null;
    state.records.push(record); return copy(record);
  };
  const status = row => `<span class="rr-status rr-status--${e(row.result)}">${labels[row.result] || '待核对'}</span>`;
  const cell = value => e(value || '—');
  const option = (value,label,current) => `<option value="${e(value)}"${current === value ? ' selected' : ''}>${e(label)}</option>`;
  const games = () => [...new Map(state.records.filter(row => row.gameId).map(row => [row.gameId,row.game])).entries()];
  const filterMarkup = () => {
    const f = state.draft;
    return `<form class="rr-filters" data-rr-filter-form><div class="rr-filter-grid"><label>玩家 UID<input name="uid" value="${e(f.uid)}" placeholder="精确查询玩家 UID" autocomplete="off"></label><label class="rr-identifier">记录 ID / 内部码标识<input name="identifier" value="${e(f.identifier)}" placeholder="精确查询，不支持明文兑换码" autocomplete="off"></label><label>游戏<select name="game">${option('','全部游戏',f.game)}${games().map(([id,name]) => option(id,name,f.game)).join('')}</select></label><label>兑换结果<select name="result">${option('','全部结果',f.result)}${Object.entries(labels).map(([id,name]) => option(id,name,f.result)).join('')}</select></label><label class="rr-date">请求时间（北京时间）<span class="rr-time-range"><input type="datetime-local" name="from" step="1" aria-label="请求开始时间" value="${e(f.from.replace(' ','T'))}"><span>至</span><input type="datetime-local" name="to" step="1" aria-label="请求结束时间" value="${e(f.to.replace(' ','T'))}"></span></label><div class="rr-query-actions"><button type="button" data-rr-action="reset">重置</button><button type="submit" class="is-primary">查询</button></div></div><p class="rr-filter-error" role="alert" data-rr-error>${e(state.error)}</p></form>`;
  };
  const tableMarkup = () => {
    const rows = visibleRecords(), pages = Math.max(1,Math.ceil(rows.length/PAGE_SIZE));state.page = Math.min(state.page,pages);
    const pageRows = rows.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE);
    return `<section class="rr-card"><header class="rr-card-head"><h2>兑换记录</h2><span>共 ${rows.length} 条</span></header><div class="rr-table-scroll"><table class="rr-table"><colgroup>${[160,100,145,190,200,220,255].map(width => `<col style="width:${width}px">`).join('')}</colgroup><thead><tr>${['记录 ID','玩家 UID','脱敏码标识','游戏 / 商品权益','批次 / 渠道','时间（北京时间）','结果 / 异常原因'].map(label=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${pageRows.map(row=>`<tr data-rr-row="${e(row.id)}"><td class="rr-mono">${cell(row.id)}</td><td>${cell(row.uid)}</td><td><strong class="rr-mono">${cell(row.maskedCode)}</strong><small class="rr-mono">${cell(row.codeId)}</small></td><td><strong>${cell(row.game)}</strong><small class="rr-mono">${cell(row.gameId)}</small><small>${cell(row.product)}</small><small class="rr-mono">${cell(row.skuId)}</small></td><td><strong class="rr-mono">${cell(row.batchId)}</strong><small>${cell(row.channel)}</small></td><td class="rr-time"><span class="rr-time-line"><span class="rr-time-label">请求</span>${cell(row.requestedAt)}</span><span class="rr-time-line"><span class="rr-time-label">完成</span>${cell(row.result==='success'?row.completedAt:'')}</span></td><td>${status(row)}${row.result!=='success'&&row.reason?`<p class="rr-reason">${cell(row.reason)}</p>`:''}</td></tr>`).join('') || '<tr><td colspan="7"><div class="rr-empty"><strong>暂无兑换记录</strong><p>请调整筛选条件后重新查询。</p></div></td></tr>'}</tbody></table></div><footer class="rr-pagination"><span>每页 20 条</span><button type="button" data-rr-action="previous"${state.page===1?' disabled':''} aria-label="上一页">‹</button><span>第 ${state.page} / ${pages} 页</span><button type="button" data-rr-action="next"${state.page===pages?' disabled':''} aria-label="下一页">›</button></footer></section>`;
  };
  const demoMarkup = () => `<details class="rr-demo-note"${state.demoOpen?' open':''}><summary>Demo 演示说明</summary><p>当前为本地只读样例，不连接客户端、兑换核销或权益发放服务。TEVI 仅为样例游戏，不与客户端任意代码演示关联。刷新恢复样例。</p><p>本页继承现有运营角色入口与权限空态；真实账号认证、对象查看范围及服务端授权尚未联调。原请求核对仅更新演示记录，不执行核销或补发。</p></details>`;
  const renderPage = () => `<section class="rr-page" data-redemption-records><nav class="rr-breadcrumb">发行平台后台 <span>/</span> 兑换记录</nav><header class="rr-page-head"><h1>兑换记录</h1><p>查询玩家兑换结果，核对产品代码与游戏权益的关联记录。</p></header>${state.allowed ? `${filterMarkup()}${tableMarkup()}` : '<section class="rr-card rr-empty" data-rr-permission><strong>暂无查看权限</strong><p>请使用具备权限的运营账号查看兑换记录。</p></section>'}${demoMarkup()}</section>`;
  const rerender = () => {const current=document.querySelector('[data-redemption-records]');if(current)current.outerHTML=renderPage();};
  document.addEventListener('submit',event=>{const form=event.target.closest('[data-rr-filter-form]');if(!form)return;event.preventDefault();if(!state.allowed)return;query(Object.fromEntries(new FormData(form)));rerender();});
  document.addEventListener('input',event=>{const form=event.target.closest('[data-rr-filter-form]');if(form&&event.target.name in state.draft)state.draft[event.target.name]=event.target.value;});
  document.addEventListener('change',event=>{const form=event.target.closest('[data-rr-filter-form]');if(form&&event.target.name in state.draft)state.draft[event.target.name]=event.target.value;});
  document.addEventListener('toggle',event=>{if(event.target.matches?.('.rr-demo-note'))state.demoOpen=event.target.open;},true);
  document.addEventListener('click',event=>{
    const control=event.target.closest('[data-rr-action]');
    if(!control)return;
    if(!state.allowed)return;const action=control.dataset.rrAction;
    if(action==='reset'){state.filters=emptyFilters();state.draft=emptyFilters();state.error='';state.page=1;rerender();}
    if(action==='previous'||action==='next'){state.page+=action==='next'?1:-1;rerender();document.querySelector('.rr-card-head')?.scrollIntoView({block:'start'});}
  });
  const originalRender=namespace.templates.render.bind(namespace.templates);
  namespace.templates.render=options=>{
    if(options.route?.id!==ROUTE){state.allowed=false;return originalRender(options);}
    const preview=new URLSearchParams(location.hash.split('?')[1]||'');
    state.allowed=options.route.role==='operations'&&options.state!=='permission'&&preview.get('state')!=='permission'&&(!preview.get('role')||preview.get('role')==='operations');
    return renderPage();
  };
  const originalShell=namespace.shell.renderBusiness.bind(namespace.shell);
  namespace.shell.renderBusiness=options=>{
    let html=originalShell(options);
    if(options.role!=='operations'||!options.routes.some(route=>route.id===ROUTE))return html;
    const link=`<a class="nav-item${options.route.id===ROUTE?' is-active':''}" href="#/${ROUTE}"${options.route.id===ROUTE?' aria-current="page"':''}>${namespace.icons.render('key')}<span>兑换记录</span></a>`;
    return html.replace(/(<aside class="side-nav side-nav--operations"[\s\S]*?<nav class="nav-list" aria-label="发行平台后台">)([\s\S]*?)(<\/nav><\/aside>)/,(_match,start,items,end)=>`${start}${items}${link}${end}`);
  };
  window.__publisherRedemptionRecordsDemo={snapshot:()=>copy({records:state.allowed?state.records:[],filters:state.filters,draft:state.draft,page:state.page,error:state.error,allowed:state.allowed}),visible:()=>copy(visibleRecords()),query,reconcile,beijingTime};
})(window.GameHubDeveloperPortal);

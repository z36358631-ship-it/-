(function () {
  'use strict';
  const GH=window.GH;
  const chars=value=>Array.from(String(value??'')).filter(char=>! /\s/u.test(char));
  const same=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);

  function segments(record) {
    const result=[];
    const add=(key,family,value,atomic=false)=>{
      const tokens=atomic?(value===undefined||value===null||value===''?[]:[String(value)]):chars(value);
      if(tokens.length)result.push({key,family,tokens});
    };
    const text=(key,value,family='text')=>add(key,family,value);
    const atom=(key,value,family)=>add(key,family,value,true);
    for(const block of record?.blocks||[]) {
      const key='block:'+block.id;
      if(['heading','paragraph','callout','quote','link','related'].includes(block.type))text(key+':text',block.text);
      if(block.type==='quote')text(key+':cite',block.cite,'cite');
      if(block.type==='link')atom(key+':href',block.href,'destination');
      if(block.type==='image'||block.type==='video') {
        atom(key+':media',block.type==='image'?block.asset:block.src,'media:'+block.type);
        text(key+':caption',block.caption,'caption');
      }
      if(block.type==='list')(block.items||[]).forEach((value,index)=>text(key+':item:'+index,value));
      if(block.type==='table') {
        (block.headers||[]).forEach((value,column)=>text(key+':header:'+column,value,'table-header'));
        (block.rows||[]).forEach((row,index)=>row.forEach((value,column)=>text(key+':cell:'+index+':'+column,value,'table-cell')));
      }
      if(block.type==='related')(block.ids||[]).forEach(id=>atom(key+':related:'+id,id,'destination'));
      if(block.type==='component') {
        text(key+':title',block.title,'component-title');
        for(const item of block.items||[]) {
          const itemKey=key+':item:'+item.id;
          text(itemKey+':title',item.title,'component-item-title');
          atom(itemKey+':cover',item.cover,'media:image');
          atom(itemKey+':target',item.targetType==='external'?item.url:item.targetId,'destination');
        }
      }
    }
    for(const [field,value] of Object.entries(record?.values||{}).sort(([a],[b])=>a.localeCompare(b)))text('value:'+field,value,'value:'+field);
    for(const item of record?.items||[]) {
      atom('album:'+item.id+':asset',item.asset,'media:image');
      text('album:'+item.id+':caption',item.caption,'caption');
    }
    for(const child of record?.children||[]) {
      text('child:'+child.id+':label',child.label,'version-label');
      text('child:'+child.id+':date',child.date,'version-date');
    }
    for(const [index,reference] of (record?.references||[]).entries()) {
      text('reference:'+index+':quote',reference.quote,'reference-quote');
      text('reference:'+index+':label',reference.label,'reference-label');
      atom('reference:'+index+':url',reference.url,'destination');
    }
    return result;
  }

  function lowerBound(list,value) {
    let lo=0,hi=list.length;
    while(lo<hi){const mid=(lo+hi)>>>1;if(list[mid]<value)lo=mid+1;else hi=mid;}
    return lo;
  }

  // Exact LCS for small edits; unique anchors and an indexed fallback bound long rewrites.
  function retained(a,b,budget) {
    const matches=new Map();
    function range(a0,a1,b0,b1,depth) {
      while(a0<a1&&b0<b1&&a[a0]===b[b0])matches.set(b0++,a0++);
      while(a0<a1&&b0<b1&&a[a1-1]===b[b1-1])matches.set(--b1,--a1);
      const n=a1-a0,m=b1-b0;
      if(!n||!m)return;
      if(n*m<=Math.min(180000,budget.cells)) {
        budget.cells-=n*m;
        const rows=Array.from({length:n+1},()=>new Uint32Array(m+1));
        for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)rows[i][j]=a[a0+i]===b[b0+j]?rows[i+1][j+1]+1:Math.max(rows[i+1][j],rows[i][j+1]);
        let i=0,j=0;
        while(i<n&&j<m){if(a[a0+i]===b[b0+j]){matches.set(b0+j,a0+i);i++;j++;}else if(rows[i+1][j]>=rows[i][j+1])i++;else j++;}
        return;
      }
      if(depth<3&&n>=8&&m>=8) {
        const windows=(tokens,start,end)=>{
          const map=new Map();
          for(let i=start;i<=end-8;i++){const key=JSON.stringify(tokens.slice(i,i+8));map.set(key,map.has(key)?-1:i);}
          return map;
        };
        const oldWindows=windows(a,a0,a1),newWindows=windows(b,b0,b1),pairs=[];
        for(const [key,index] of newWindows){const old=oldWindows.get(key);if(index>=0&&old>=0)pairs.push({old,index});}
        pairs.sort((x,y)=>x.index-y.index);
        const tails=[],tailIndices=[],previous=[];
        pairs.forEach((pair,index)=>{const place=lowerBound(tails,pair.old);previous[index]=place?tailIndices[place-1]:-1;tails[place]=pair.old;tailIndices[place]=index;});
        const anchors=[];
        for(let at=tailIndices[tails.length-1];at!==undefined&&at>=0;at=previous[at])anchors.push(pairs[at]);
        anchors.reverse();
        const disjoint=[];
        for(const anchor of anchors)if(!disjoint.length||anchor.old>=disjoint[disjoint.length-1].old+8&&anchor.index>=disjoint[disjoint.length-1].index+8)disjoint.push(anchor);
        if(disjoint.length) {
          let ai=a0,bi=b0;
          for(const anchor of disjoint){range(ai,anchor.old,bi,anchor.index,depth+1);for(let i=0;i<8;i++)matches.set(anchor.index+i,anchor.old+i);ai=anchor.old+8;bi=anchor.index+8;}
          range(ai,a1,bi,b1,depth+1);return;
        }
      }
      budget.approximate=true;
      const positions=new Map();
      for(let i=a0;i<a1;i++){if(!positions.has(a[i]))positions.set(a[i],[]);positions.get(a[i]).push(i);}
      let next=a0;
      for(let j=b0;j<b1;j++){const list=positions.get(b[j]);if(!list)continue;const at=lowerBound(list,next);if(at<list.length){matches.set(j,list[at]);next=list[at]+1;}}
    }
    range(0,a.length,0,b.length,0);
    return matches;
  }

  function reconcile(previous,record,actorId,budget) {
    const next=segments(record),used=new Set(),paired=new Map();
    const pair=(index,old)=>{paired.set(index,old);used.add(old);};
    const signature=segment=>segment.family+'|'+JSON.stringify(segment.tokens);
    const exactByKey=new Map(previous.map((segment,index)=>[segment.key+'|'+signature(segment),index]));
    next.forEach((segment,index)=>{const old=exactByKey.get(segment.key+'|'+signature(segment));if(old!==undefined&&!used.has(old))pair(index,old);});
    const exact=new Map();
    previous.forEach((segment,index)=>{if(used.has(index))return;const key=signature(segment);if(!exact.has(key))exact.set(key,[]);exact.get(key).push(index);});
    next.forEach((segment,index)=>{if(paired.has(index))return;const old=exact.get(signature(segment));if(old?.length)pair(index,old.shift());});
    const byKey=new Map(previous.map((segment,index)=>[segment.key,index]));
    next.forEach((segment,index)=>{if(paired.has(index))return;const old=byKey.get(segment.key);if(old!==undefined&&!used.has(old)&&previous[old].family===segment.family)pair(index,old);});
    const byFamily=new Map();
    previous.forEach((segment,index)=>{if(used.has(index))return;if(!byFamily.has(segment.family))byFamily.set(segment.family,[]);byFamily.get(segment.family).push(index);});
    next.forEach((segment,index)=>{if(paired.has(index))return;const old=byFamily.get(segment.family);if(old?.length)pair(index,old.shift());});
    return next.map((segment,index)=>{
      const old=paired.has(index)?previous[paired.get(index)]:null;
      if(old&&same(old.tokens,segment.tokens))return {...segment,owners:old.owners.slice()};
      const owners=segment.tokens.map(()=>actorId);
      if(old)for(const [to,from] of retained(old.tokens,segment.tokens,budget))owners[to]=old.owners[from];
      return {...segment,owners};
    });
  }

  function ownership(history,{currentRecord}={}) {
    const rows=(Array.isArray(history)?history:[]).filter(row=>row&&(row.record||row.blocks)).slice().sort((a,b)=>(a.record?.revision??a.revision??0)-(b.record?.revision??b.revision??0)||(a.timestamp||0)-(b.timestamp||0));
    const names=new Map(),budget={cells:750000,approximate:false};
    let state=[],started=false,deleted=false;
    for(const row of rows) {
      const record=row.record||row;
      // A locale's first save can begin at revision >1 with a source-language fallback.
      if(row.beforeRecord)state=reconcile(state,row.beforeRecord,null,budget);
      else if(!started&&(record.revision||1)>1)state=reconcile([],record,null,budget);
      const actorId=row.isSeed?null:row.actorId??row.authorId??null;
      if(actorId!==null)names.set(actorId,row.author||row.name||String(actorId));
      state=row.deleted?[]:reconcile(state,record,actorId,budget);
      started=true;deleted=!!row.deleted;
    }
    if(currentRecord)state=reconcile(state,currentRecord,null,budget);
    else if(deleted)state=[];
    const counts=new Map();let totalUnits=0;
    for(const segment of state)for(const actorId of segment.owners){totalUnits++;if(actorId!==null&&actorId!==undefined)counts.set(actorId,(counts.get(actorId)||0)+1);}
    const ownedUnits=[...counts.values()].reduce((sum,value)=>sum+value,0);
    const shares=[...counts].map(([actorId,units])=>({actorId,name:names.get(actorId)||String(actorId),units,share:ownedUnits?units/ownedUnits:0})).sort((a,b)=>b.units-a.units||String(a.actorId).localeCompare(String(b.actorId)));
    return {shares,totalUnits,ownedUnits,unassignedUnits:totalUnits-ownedUnits,approximate:budget.approximate};
  }
  GH.guideContributionMath=Object.freeze({ownership});
})();

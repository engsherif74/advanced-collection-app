import {st,esc,refresh,renderBuilding} from './browse.js';
import {keyOf as key} from './ledger.js';
import {fz} from './names.js';
import {quad} from './dialog.js';
import {money} from '../core/utils.js';
let q='',mode='name',nums=['','','',''];
export async function renderSearch(el){
  document.getElementById('back').hidden=true;await refresh();
  el.innerHTML=`<div class="card"><div class="tools"><button class="btn sm ${mode==='name'?'':'ghost'}" id="mN">بالاسم</button><button class="btn sm ${mode==='no'?'':'ghost'}" id="mK">برقم المشترك</button></div>${mode==='name'?`<input id="q" class="srch" placeholder="اكتب اسم العميل…" value="${esc(q)}" autocomplete="off">`:`<div class="rt4" dir="ltr" id="qd"><input placeholder="قطاع" value="${nums[0]}" inputmode="numeric"><input placeholder="بلوك" value="${nums[1]}" inputmode="numeric"><input placeholder="عمارة" value="${nums[2]}" inputmode="numeric"><input placeholder="شقة" value="${nums[3]}" inputmode="numeric"></div>`}</div><div id="sr" class="blist"></div>`;
  const draw=()=>{
    const sr=el.querySelector('#sr');let m;
    if(mode==='name'){const ws=fz(q).split(' ').filter(Boolean);if(!ws.length){sr.innerHTML='';return;}m=st.S.filter(s=>!st.paid.has(key(s))&&ws.every(w=>fz(s.name||'').includes(w)));}
    else{if(!nums.some(Boolean)){sr.innerHTML='';return;}m=st.S.filter(s=>!st.paid.has(key(s))&&[s.sector,s.blk,s.bld,s.apt].every((v,i)=>!nums[i]||v===nums[i]));}
    const g={};m.forEach(s=>(g[`${s.sector}|${s.blk}|${s.bld}`]??=[]).push(s));
    sr.innerHTML=Object.entries(g).slice(0,40).map(([k,a])=>{const[x,b,d]=k.split('|');return `<button class="brow srow" data-g="${k}"><b>قطاع ${x} · بلوك ${b} · عمارة ${d}</b><span>${a.slice(0,3).map(s=>esc(s.name||'بدون اسم')).join('، ')}${a.length>3?` +${a.length-3}`:''}</span><span>${a[0].inRoute?'':'<em class="tag">خارج خط سيري</em>'}</span><strong>${money(a.reduce((t,s)=>t+s.value,0))}</strong></button>`;}).join('')||'<div class="card empty">لا نتائج.</div>';
    sr.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{const[x,bl,d]=b.dataset.g.split('|');st.sector=x;st.blk=bl;st.bld=d;st.all=true;st.sel.clear();history.pushState({v:'bld'},'');renderBuilding(el);});
  };
  el.querySelector('#mN').onclick=()=>{mode='name';renderSearch(el);};el.querySelector('#mK').onclick=()=>{mode='no';renderSearch(el);};
  if(mode==='name')el.querySelector('#q').oninput=e=>{q=e.target.value;draw();};else quad(el.querySelector('#qd'),v=>{nums=v;draw();});
  draw();
}

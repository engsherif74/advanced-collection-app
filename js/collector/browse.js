import {all,get,put} from '../core/db.js';
import {money} from '../core/utils.js';
import {list,pay,addAdvance,undo,canUndo,ldate,keyOf as key} from './ledger.js';
import {totals} from './payment.js';
import {getManual} from './names.js';
import {openPage} from './buttons.js';
import {modal} from './dialog.js';
export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const st={S:[],by:new Map(),paid:new Set(),adv:new Map(),sel:new Set(),sector:'',blk:'',bld:null,open:null,pager:false,all:false,cycle:'',who:'',no:'0',focus:'',again:null};
const srt=(a,b)=>Number(a)-Number(b),back=v=>{document.getElementById('back').hidden=!v;},num=s=>+String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const due=s=>Math.max(0,s.value-(st.adv.get(key(s))||0)),tot=a=>totals(a,due);
export const ltr=(s,b,d,a)=>`<bdi dir="ltr">${s}/${b}/${d}/${a}</bdi>`;
export async function refresh(){
  const mn=await getManual();st.S=await all('subscribers');st.S.forEach(s=>{const n=mn[key(s)];if(n)s.name=n;});
  st.by=new Map(st.S.map(s=>[key(s),s]));const e=await list();st.paid=new Set(e.filter(x=>x.type==='pay').map(x=>x.key));
  st.adv=new Map((await all('advance')).map(v=>[v.key,v.balance]));
}
export const work=()=>st.S.filter(s=>(st.all||s.inRoute)&&!st.paid.has(key(s)));
export const toast=t=>{const e=document.getElementById('toast');e.textContent=t;e.className='show';setTimeout(()=>e.className='',2600);};
const info=(k,x={})=>{const s=st.by.get(k);return new URLSearchParams({n:s.name||'',s:s.sector,b:s.blk,d:s.bld,a:s.apt,v:s.value,r:st.adv.get(k)||0,q:due(s),c:s.count,m:st.cycle,u:st.who,k,...x}).toString();};
const openReading=k=>openPage('reading.html',info(k)),openPrint=(k,x)=>openPage('print.html',info(k,x));
function payDialog(s,again){
  const k=key(s),d0=due(s),m=modal(`<h3>${esc(s.name||'بدون اسم')}</h3><p class="mute">شقة ${s.apt} · المطلوب ${money(d0)} جنيه</p><label class="field"><span>المبلغ المدفوع</span><input id="pa" inputmode="decimal" value="${d0}"></label><p class="mute" id="pv"></p><div class="actions"><button class="btn ok" id="pc">تأكيد</button><button class="btn ghost" id="px">إلغاء</button></div>`);
  const inp=m.querySelector('#pa'),pv=m.querySelector('#pv');
  const calc=()=>{const a=num(inp.value);pv.textContent=!(a>0)?'':a<d0?`سداد مقدم ${money(a)} (تبقى الشقة غير مسددة)`:a===d0?'سداد كامل':`سداد كامل + مقدم ${money(a-d0)}`;};
  inp.oninput=calc;calc();inp.select();m.querySelector('#px').onclick=()=>m.remove();
  m.querySelector('#pc').onclick=async()=>{const a=num(inp.value);if(!(a>0))return;m.remove();
    if(a<d0)await addAdvance(st.no,s,a);else{await pay(st.no,[s],st.adv);if(a>d0)await addAdvance(st.no,s,a-d0);await put('lastPosition','last',{sector:st.sector,blk:st.blk,bld:st.bld});}
    st.sel.delete(k);await refresh();toast(a<d0?`سُجّل مقدم ${money(a)} جنيه`:`تم سداد شقة ${s.apt} (${money(a)} جنيه)`);again();};
}
function aptsView(a){
  const ch=a.filter(s=>st.sel.has(key(s))),ct=tot(ch),rest=tot(a).value-ct.value;
  const html=`<div class="bh"><h2>قطاع ${st.sector} · بلوك ${st.blk} · عمارة ${st.bld}</h2><label class="chk"><input type="checkbox" id="all" ${ch.length===a.length?'checked':''}> تحديد الكل</label></div><div class="alist">`+a.map(s=>{const k=key(s),b=st.adv.get(k)||0;return `<div class="ar ${st.sel.has(k)?'on':''}"><div class="ln"><button class="nmb" data-rd="${k}">${esc(s.name||'بدون اسم')}</button></div><div class="l1"><input type="checkbox" data-k="${k}" ${st.sel.has(k)?'checked':''} aria-label="تحديد"><span class="an">شقة ${s.apt}</span><span class="ct">العدد: ${s.count}${b?` · رصيد مقدم ${money(b)}`:''}</span><button class="btn ok vbtn" data-p="${k}">${money(due(s))}</button></div><div class="l2"><button class="lnk" data-pr="${k}">طباعة</button></div></div>`;}).join('')+'</div>';
  return {html,ch,ct,rest};
}
const bar=v=>`<div class="bar"><div><small>المبلغ المطلوب</small><b>${money(v.ct.value)}</b></div><div><small>المتبقي من العمارة</small><b>${money(v.rest)}</b></div><button class="btn" id="pay" ${v.ch.length?'':'disabled'}>سداد</button></div>`;
function bind(el,a,v,again){
  st.again=again;
  el.querySelectorAll('[data-k]').forEach(c=>c.onchange=()=>{c.checked?st.sel.add(c.dataset.k):st.sel.delete(c.dataset.k);again();});
  el.querySelector('#all').onchange=e=>{a.forEach(s=>e.target.checked?st.sel.add(key(s)):st.sel.delete(key(s)));again();};
  el.querySelectorAll('[data-rd]').forEach(b=>b.onclick=()=>openReading(b.dataset.rd));
  el.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>openPrint(b.dataset.pr));
  el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>payDialog(st.by.get(b.dataset.p),again));
  const p=el.querySelector('#pay');if(p)p.onclick=async()=>{const amt=v.ct.value;await pay(st.no,v.ch,st.adv);await put('lastPosition','last',{sector:st.sector,blk:st.blk,bld:st.bld});st.sel.clear();await refresh();toast(`تم سداد ${v.ch.length} شقة (${money(amt)} جنيه)`);again();};
}
export async function renderHome(el,keep=true){
  const y=scrollY;back(false);if(!st.pager)st.bld=null;const w=work();
  if(!st.S.length)return el.innerHTML='<div class="card empty">لا توجد بيانات بعد. من تبويب «ما تم تحصيله» اضغط «تحديث الملف».</div>';
  const secs=[...new Set(w.map(s=>s.sector))].sort(srt);
  if(!secs.length)return el.innerHTML='<div class="card empty">لا يوجد عملاء غير مسددين في خط سيرك. ما شاء الله.</div>';
  if(!secs.includes(st.sector))st.sector=secs[0];
  const blks=[...new Set(w.filter(s=>s.sector===st.sector).map(s=>s.blk))].sort(srt);if(!blks.includes(st.blk))st.blk=blks[0];
  const rows=w.filter(s=>s.sector===st.sector&&s.blk===st.blk),g={};rows.forEach(s=>(g[s.bld]??=[]).push(s));
  const order=Object.keys(g).sort(srt),t=tot(rows),last=await get('lastPosition','last'),hasLast=last&&w.some(s=>s.sector===last.sector&&s.blk===last.blk&&s.bld===last.bld);
  const opt=(a,v)=>a.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');let top='',ov=null;
  if(st.pager&&st.open&&g[st.open]){st.bld=st.open;const a=g[st.open].sort((p,q)=>srt(p.apt,q.apt)),i=order.indexOf(st.open);ov={a,v:aptsView(a)};
    top=`<div class="card apts">${ov.v.html}<div class="pgnav"><button class="btn ghost sm" id="pPrev" ${i>0?'':'disabled'}>→ السابقة</button><input id="pNum" inputmode="numeric" placeholder="رقم العمارة"><button class="btn ghost sm" id="pGo">اذهب</button><button class="btn ghost sm" id="pNext" ${i<order.length-1?'':'disabled'}>التالية ←</button></div></div>`;}
  el.innerHTML=top+`<div class="pick"><label class="field"><span>القطاع</span><select id="sSec">${opt(secs,st.sector)}</select></label><label class="field"><span>البلوك</span><select id="sBlk">${opt(blks,st.blk)}</select></label></div><div class="tools"><button class="btn ghost sm" id="pg">${st.pager?'إيقاف عرض الصفحات':'عرض كصفحات'}</button>${hasLast?`<button class="btn sm" id="rs">استكمال من آخر عمارة (${last.sector}-${last.blk}-${last.bld})</button>`:''}</div><p class="sum">${t.n} شقة · ${t.count} فاتورة · <b>${money(t.value)}</b> جنيه</p><div class="blist">`+order.map(b=>{const x=tot(g[b]),o=st.pager&&st.open===b,c=`<b>عمارة ${b}</b><span>${x.n} شقة</span><span>${x.count} فاتورة</span><strong>${money(x.value)}</strong>`;return st.pager?`<div class="brow prow ${o?'open':''}" data-b="${b}" role="button" tabindex="0">${c}</div>`:`<button class="brow" data-b="${b}">${c}</button>`;}).join('')+'</div>'+(ov?bar(ov.v):'');
  const go=async b=>{st.open=b;st.sel.clear();await renderHome(el,false);scrollTo(0,0);};
  el.querySelector('#sSec').onchange=e=>{st.sector=e.target.value;st.open=null;renderHome(el);};
  el.querySelector('#sBlk').onchange=e=>{st.blk=e.target.value;st.open=null;renderHome(el);};
  el.querySelector('#pg').onclick=()=>{st.pager=!st.pager;st.open=null;st.sel.clear();renderHome(el);};
  const rs=el.querySelector('#rs');if(rs)rs.onclick=()=>{st.sector=last.sector;st.blk=last.blk;st.sel.clear();if(st.pager)go(last.bld);else{st.bld=last.bld;history.pushState({v:'bld'},'');renderBuilding(el);}};
  el.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{if(st.pager)go(b.dataset.b);else{st.sel.clear();st.bld=b.dataset.b;history.pushState({v:'bld'},'');renderBuilding(el);}});
  if(ov){bind(el,ov.a,ov.v,()=>renderHome(el));const i=order.indexOf(st.open);
    el.querySelector('#pPrev').onclick=()=>go(order[i-1]);el.querySelector('#pNext').onclick=()=>go(order[i+1]);
    el.querySelector('#pGo').onclick=()=>{const v=String(num(el.querySelector('#pNum').value)).padStart(2,'0');order.includes(v)?go(v):toast('لا توجد عمارة غير مسددة بهذا الرقم');};}
  if(keep)scrollTo(0,y);
}
export function renderBuilding(el){
  back(true);const a=work().filter(s=>s.sector===st.sector&&s.blk===st.blk&&s.bld===st.bld).sort((p,q)=>srt(p.apt,q.apt));
  if(!a.length)return history.back();const v=aptsView(a);el.innerHTML=`<div class="card">${v.html}</div>${bar(v)}`;bind(el,a,v,()=>renderBuilding(el));
}
export async function renderLedger(el,reload,exp){
  back(false);await refresh();const e=await list(),td=e.filter(x=>ldate(x.time)===ldate(new Date())),sum=td.reduce((s,x)=>s+x.amount,0),inv=td.filter(x=>x.type==='pay').reduce((s,x)=>s+x.count,0);
  st.again=()=>renderLedger(el,reload,exp);
  el.innerHTML=`<div class="card"><h2>اليوم: ${td.length} عملية · ${inv} فاتورة · ${money(sum)} جنيه</h2></div><div class="alist card">`+(e.map(x=>{const s=st.by.get(x.key)||{},adv=x.type==='advance';return `<div class="ar"><div class="ln"><button class="nmb" data-rd="${x.key}">${esc(s.name||'بدون اسم')}</button></div><div class="l1"><span class="an">شقة ${s.apt||'?'}</span><span class="ct">قطاع ${s.sector} · بلوك ${s.blk} · عمارة ${s.bld}</span>${adv?`<button class="btn ghost vbtn" data-adv="1">سداد مقدم · ${money(x.amount)}</button>`:`<strong class="paid">${money(x.amount)}</strong>`}</div><div class="l2"><span class="ct">${new Date(x.time).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'})}</span>${adv?'':`<button class="lnk" data-pe="${x.id}">طباعة</button>`}${canUndo(x)?`<button class="btn ghost sm" data-u="${x.id}">تراجع</button>`:'<small class="fin">نهائي</small>'}</div></div>`;}).join('')||'<p class="mute">لا توجد تحصيلات بعد.</p>')+'</div><div class="card"><div class="actions"><button class="btn" id="ex">إرسال الملف للأدمن</button><button class="btn ghost" id="rl">تحديث الملف</button></div></div>';
  el.querySelectorAll('[data-rd]').forEach(b=>{if(st.by.get(b.dataset.rd))b.onclick=()=>openReading(b.dataset.rd);});
  el.querySelectorAll('[data-pe]').forEach(b=>b.onclick=()=>{const x=e.find(y=>y.id===b.dataset.pe);openPrint(x.key,{t:'paid',p:x.amount});});
  el.querySelectorAll('[data-adv]').forEach(b=>b.onclick=()=>{st.focus='adv';document.querySelector('#tabs [data-t=details]').click();});
  el.querySelectorAll('[data-u]').forEach(b=>b.onclick=async()=>{if(confirm('التراجع عن هذه العملية؟')){await undo(e.find(x=>x.id===b.dataset.u));renderLedger(el,reload,exp);}});
  el.querySelector('#rl').onclick=reload;el.querySelector('#ex').onclick=exp;
}

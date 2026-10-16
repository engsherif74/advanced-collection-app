import {all,put,del,get,putMany} from '../core/db.js';
import {money} from '../core/utils.js';
import {pack,unpack} from '../core/crypto.js';
import {st,esc,toast} from './browse.js';
import {ldate} from './ledger.js';
import {choose,modal,quad} from './dialog.js';
import {fz} from './names.js';
export {choose};
export async function sendFile(file){
  if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:file.name});return 'shared';}catch{}}
  const l=document.createElement('a');l.href=URL.createObjectURL(file);l.download=file.name;l.click();return 'downloaded';
}
const num=s=>+String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)),rid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const tb=(h,r)=>`<div class="wrap"><table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${r.map(c=>'<tr>'+c.map(x=>`<td>${x}</td>`).join('')+'</tr>').join('')}</table></div>`;
let lastDel=null;
async function pickCustomer(){
  return new Promise(res=>{
    const m=modal(`<h3>إضافة عميل</h3><div class="actions"><button class="btn sm" id="mN">بالاسم</button><button class="btn sm ghost" id="mK">برقم المشترك</button></div><div id="pb"></div><button class="btn ghost sm" id="mC">إلغاء</button>`),B=m.querySelector('#pb'),done=v=>{m.remove();res(v);};
    m.querySelector('#mC').onclick=()=>done(null);
    const byName=()=>{B.innerHTML='<input id="nq" class="srch" placeholder="اكتب الاسم…" autocomplete="off"><div id="nr"></div>';const nr=B.querySelector('#nr'),q=B.querySelector('#nq');
      q.oninput=()=>{const ws=fz(q.value).split(' ').filter(Boolean);if(!ws.length){nr.innerHTML='';return;}const mt=st.S.filter(s=>ws.every(w=>fz(s.name||'').includes(w))).slice(0,8);
        nr.innerHTML=mt.map((s,i)=>`<div class="lrow2"><span>${esc(s.name)}</span><button class="lnk" data-d="${i}">تفاصيل</button><button class="btn sm" data-c="${i}">اختيار</button></div>`).join('')+'<button class="btn ghost sm" id="free">استخدم الاسم كما كتبته</button>';
        nr.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const s=mt[b.dataset.d];alert(`${s.name}\nقطاع ${s.sector} · بلوك ${s.blk} · عمارة ${s.bld} · شقة ${s.apt}\nالعدد ${s.count} · القيمة ${money(s.value)}`);});
        nr.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>done({name:mt[b.dataset.c].name}));nr.querySelector('#free').onclick=()=>done(q.value.trim()?{name:q.value.trim()}:null);};};
    const byNo=()=>{B.innerHTML='<div class="rt4" dir="ltr"><input placeholder="قطاع" inputmode="numeric"><input placeholder="بلوك" inputmode="numeric"><input placeholder="عمارة" inputmode="numeric"><input placeholder="شقة" inputmode="numeric"></div><div id="kr"></div>';
      quad(B.querySelector('.rt4'),v=>{const kr=B.querySelector('#kr');if(v.some(x=>!x)){kr.innerHTML='';return;}const s=st.S.find(x=>x.sector===v[0]&&x.blk===v[1]&&x.bld===v[2]&&x.apt===v[3]);
        kr.innerHTML=s?`<div class="lrow2"><span>${esc(s.name||'بدون اسم')}</span><button class="btn sm" id="ok">اختيار</button></div>`:'<p class="mute">لا يوجد مشترك بهذا الرقم.</p>';if(s)kr.querySelector('#ok').onclick=()=>done({name:s.name||'بدون اسم'});});};
    m.querySelector('#mN').onclick=byName;m.querySelector('#mK').onclick=byNo;byName();
  });
}

export async function personalCards(el,entries,again){
  const D=(await all('personalDealings')).sort((a,b)=>a.date<b.date?1:-1),P=(await all('personalPayments')).sort((a,b)=>a.payDate<b.payDate?1:-1);
  const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0),L=d=>d.dir==='له'?d.amount:0,R=d=>d.dir==='عليه'?d.amount:0,net={};
  D.forEach(d=>{net[d.name]=(net[d.name]||0)+L(d)-R(d);});
  el.insertAdjacentHTML('beforeend',`<div class="card warn"><b>هذه الجداول محفوظة على هاتفك فقط. حمّلها ولو مرة أسبوعياً حتى لا تفقدها.</b><div class="actions"><button class="btn" id="bk">تحميل نسخة احتياطية</button><button class="btn ghost" id="rst">استرجاع نسخة</button><input type="file" id="rstIn" hidden></div></div>
<div class="card"><h2>جدول التعاملات الشخصية</h2><div class="actions"><button class="btn sm" id="addD">إضافة</button>${lastDel?'<button class="btn ghost sm" id="undoD">تراجع عن آخر حذف</button>':''}</div>${tb(['العميل','له عندي','عليه لي','التاريخ','ملاحظة',''],D.map(d=>[esc(d.name)+(d.src&&P.some(p=>p.src===d.src)?' ⚠':''),money(L(d)),money(R(d)),d.date,esc(d.note||''),`<button class="lnk" data-ed="${d.id}">تعديل</button><button class="lnk" data-dd="${d.id}">حذف</button>`]).concat([['المجموع',money(sum(D,L)),money(sum(D,R)),'','','']]))}${Object.keys(net).length?'<p class="mute">الصافي: '+Object.entries(net).map(([n,v])=>`${esc(n)} ${money(v)}`).join(' · ')+'</p>':''}</div>
<div class="card"><h2>جدول السداد الشخصي</h2>${tb(['العميل','المبلغ','تاريخ السداد','تاريخ التسوية',''],P.map(p=>[esc(p.name)+(p.src&&D.some(d=>d.src===p.src)?' ⚠':''),money(p.amount),p.payDate,p.settleDate||'—',(p.settleDate?'':`<button class="lnk" data-st="${p.id}">تمت التسوية</button>`)+`<button class="lnk" data-dp="${p.id}">حذف من الجدول</button>`]).concat([['المجموع',money(sum(P,p=>p.amount)),'','','']]))}<p class="mute">الحذف من هذا الجدول لا يمس أرشيف السداد.</p></div>`);
  const $=s=>el.querySelector(s),on=(s,f)=>el.querySelectorAll(s).forEach(f);
  $('#addD').onclick=async()=>{const cu=await pickCustomer();if(!cu||!cu.name)return;const name=cu.name;const c=await choose('النوع',['له عندي (استلمت منه)','عليه لي (دفعت عنه)']);if(c<0)return;const a=num(prompt('المبلغ'));if(a>0){const id=rid();await put('personalDealings',id,{id,name,dir:c?'عليه':'له',amount:a,date:ldate(new Date()),note:prompt('ملاحظة (اختياري)')||''});again();}};
  on('[data-ed]',b=>b.onclick=async()=>{const d=D.find(x=>x.id===b.dataset.ed),a=num(prompt('المبلغ الجديد',d.amount));if(a>0){await put('personalDealings',d.id,{...d,amount:a});again();}});
  on('[data-dd]',b=>b.onclick=async()=>{if(confirm('تأكيد حذف العميل من الجدول بعد التسوية؟')){lastDel=D.find(x=>x.id===b.dataset.dd);await del('personalDealings',lastDel.id);again();}});
  if($('#undoD'))$('#undoD').onclick=async()=>{await put('personalDealings',lastDel.id,lastDel);lastDel=null;again();};
  on('[data-st]',b=>b.onclick=async()=>{const p=P.find(x=>x.id===b.dataset.st);await put('personalPayments',p.id,{...p,settleDate:ldate(new Date())});again();});
  on('[data-dp]',b=>b.onclick=async()=>{if(confirm('حذف من الجدول؟')){await del('personalPayments',b.dataset.dp);again();}});
  on('[data-pd]',b=>b.onclick=async()=>{
    const e=entries.find(x=>x.id===b.dataset.pd),s=st.by.get(e.key)||{},name=s.name||'بدون اسم',c=await choose('إضافة تفاصيل',['سداد شخصي (سددت كامل مديونيته من جيبي)','تعاملات: له عندي','تعاملات: عليه لي']);if(c<0)return;const id=rid();
    if(c===0)await put('personalPayments',id,{id,key:e.key,name,amount:e.due,payDate:ldate(e.time),settleDate:null,src:e.id});
    else{const a=num(prompt('المبلغ',e.due));if(!(a>0))return;await put('personalDealings',id,{id,name,dir:c===1?'له':'عليه',amount:a,date:ldate(new Date()),note:'',src:e.id});}
    toast('تمت الإضافة');again();});
  $('#bk').onclick=async()=>{const a=await get('meta','auth'),name=`جداول المديونيات ${ldate(new Date())}.bin`,r=await sendFile(new File([await pack({v:1,dealings:D,payments:P},a.userKey)],name));toast(r==='shared'?'تمت المشاركة: '+name:`تم التحميل باسم «${name}» غالباً في مجلد التنزيلات`);};
  $('#rst').onclick=()=>$('#rstIn').click();
  $('#rstIn').onchange=async e=>{try{const a=await get('meta','auth'),x=await unpack(new Uint8Array(await e.target.files[0].arrayBuffer()),a.userKey);await putMany('personalDealings',x.dealings.map(d=>[d.id,d]));await putMany('personalPayments',x.payments.map(p=>[p.id,p]));toast('تم الاسترجاع');again();}catch{toast('تعذر فتح النسخة');}};
}

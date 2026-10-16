import {unpack} from '../core/crypto.js';
import {put,get,clear,putMany} from '../core/db.js';
import {cmpNum} from '../core/utils.js';
import {getBin} from './unlock.js';
const inRoute=(r,rt)=>r.sector===rt.sector&&cmpNum([r.blk,r.bld,r.apt],rt.from)>=0&&cmpNum([r.blk,r.bld,r.apt],rt.to)<=0;
export async function fetchNew(a,say=()=>{}){
  say('تحميل الملف الكامل…');
  const full=await unpack(await getBin('data/full.bin'),a.master);let routes=[],buttons=[];
  try{const s=await unpack(await getBin(`data/settings_${encodeURIComponent(a.name)}_${a.no}.bin`),a.userKey);routes=s.routes||[];buttons=s.buttons||[];}catch{say('تنبيه: لم يُحمَّل ملف الإعدادات (خط السير)');}
  const pairs=[],names=[];
  for(const [cat,c] of Object.entries(full.categories))for(const sec in c.sectors)for(const blk in c.sectors[sec])for(const bld in c.sectors[sec][blk])for(const apt in c.sectors[sec][blk][bld]){
    const [count,value]=c.sectors[sec][blk][bld][apt],r={cat,sector:sec,blk,bld,apt,count,value,name:c.names[sec+blk+bld+apt]||''};
    r.inRoute=routes.some(rt=>inRoute(r,rt));const k=[cat,sec,blk,bld,apt].join('|');pairs.push([k,r]);if(r.name)names.push([k,r.name]);
  }
  return {full,routes,buttons,pairs,names};
}
export async function commit(n){
  await clear('subscribers');await putMany('subscribers',n.pairs);await putMany('namesDirectory',n.names);
  await put('meta','file',{cycle:n.full.cycle,created:n.full.created,loaded:new Date().toISOString(),routes:n.routes,buttons:n.buttons});
  const per={};n.pairs.forEach(([,r])=>{if(r.inRoute)per[r.sector]=(per[r.sector]||0)+r.value;});
  if(!(await get('snapshot',n.full.cycle)))await put('snapshot',n.full.cycle,{cycle:n.full.cycle,per,at:new Date().toISOString()});
  try{await put('meta','ver',await (await fetch('version.json',{cache:'no-store'})).json());}catch{}
}
export async function loadFiles(a,say,hook){const n=await fetchNew(a,say);if(hook)await hook(n);await commit(n);return n.pairs.length;}

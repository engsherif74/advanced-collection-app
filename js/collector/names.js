import {get,put} from '../core/db.js';
import {searchKey} from '../core/normalize.js';
export const getManual=async()=>(await get('settings','manualNames'))||{};
export const saveManual=async(k,n)=>{const m=await getManual();m[k]=n;await put('settings','manualNames',m);};
export const fz=s=>searchKey(s).replace(/[خج]/g,'ح').replace(/ذ/g,'د');

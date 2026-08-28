import {openDB,uuid,getById,getSettings} from "./db.js";
import {getLocalToday} from "./date-utils.js";
export async function isCompletedOn(itemType,itemId,date=getLocalToday()){
  const db=await openDB();return new Promise((res,rej)=>{
    const r=db.transaction("completions").objectStore("completions").index("uniqueKey").get([itemType,itemId,date]);
    r.onsuccess=()=>res(!!r.result);r.onerror=()=>rej(r.error);
  });
}
export async function getCompletionsForDate(date=getLocalToday()){
  const db=await openDB();return new Promise((res,rej)=>{
    const r=db.transaction("completions").objectStore("completions").index("byDate").getAll(date);
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
  });
}
export async function getAllCompletions(){
  const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction("completions").objectStore("completions").getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
}
export async function completeItem(itemType,itemId,date=getLocalToday()){
  const item=await getById(itemType==="habit"?"habits":"tasks",itemId);
  if(!item)throw new Error("Item not found.");
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(["completions","settings"],"readwrite");
    const c=tx.objectStore("completions"),s=tx.objectStore("settings");
    let result={success:false,alreadyCompleted:false,xpAwarded:0};
    const rec={id:uuid(),itemType,itemId,date,xpAwarded:Number(item.xp),timestamp:Date.now()};
    const add=c.add(rec);
    add.onerror=e=>{
      if(add.error?.name==="ConstraintError"){e.preventDefault();e.stopPropagation();result={success:true,alreadyCompleted:true,xpAwarded:0};}
    };
    add.onsuccess=()=>{
      const g=s.get("app-settings");
      g.onsuccess=()=>{g.result.totalXP+=rec.xpAwarded;s.put(g.result);result={success:true,alreadyCompleted:false,xpAwarded:rec.xpAwarded}};
    };
    tx.oncomplete=()=>resolve(result);
    tx.onerror=()=>reject(tx.error||new Error("Completion transaction failed."));
    tx.onabort=()=>reject(tx.error||new Error("Completion transaction aborted."));
  });
}
export async function getTodayXP(date=getLocalToday()){const rows=await getCompletionsForDate(date);return rows.reduce((sum,r)=>sum+r.xpAwarded,0)}

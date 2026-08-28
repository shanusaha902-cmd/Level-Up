const DB_NAME="LEVEL_UP_DB",DB_VERSION=1;
let dbPromise;
export function openDB(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      const habits=db.createObjectStore("habits",{keyPath:"id"});
      habits.createIndex("active","active",{unique:false});habits.createIndex("createdAt","createdAt",{unique:false});
      const tasks=db.createObjectStore("tasks",{keyPath:"id"});
      tasks.createIndex("date","date",{unique:false});
      const c=db.createObjectStore("completions",{keyPath:"id"});
      c.createIndex("uniqueKey",["itemType","itemId","date"],{unique:true});
      c.createIndex("byDate","date",{unique:false});
      db.createObjectStore("settings",{keyPath:"id"});
    };
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });return dbPromise;
}
export function uuid(){return crypto.randomUUID()}
export async function ensureSettings(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction("settings","readwrite"),s=tx.objectStore("settings");
    const get=s.get("app-settings");
    get.onsuccess=()=>{if(get.result)resolve(get.result);else s.add({id:"app-settings",totalXP:0,theme:"dark",schemaVersion:1,createdAt:new Date().toISOString()}).onsuccess=()=>resolve({id:"app-settings",totalXP:0,theme:"dark",schemaVersion:1})};
    get.onerror=()=>reject(get.error);tx.onerror=()=>reject(tx.error);
  });
}
export async function getSettings(){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction("settings").objectStore("settings").get("app-settings");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
export async function getAll(store){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
export async function getById(store,id){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
export async function put(store,value){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store,"readwrite").objectStore(store).put(value);r.onsuccess=()=>res(value);r.onerror=()=>rej(r.error)})}
export async function remove(store,id){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store,"readwrite").objectStore(store).delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}

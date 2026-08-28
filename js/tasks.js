import {getAll,getById,put,remove,uuid} from "./db.js";
import {getLocalToday,isValidDateString} from "./date-utils.js";
function validate(t){if(!t.name?.trim())throw new Error("Task name is required.");if(!(Number(t.xp)>0))throw new Error("Task XP must be positive.");if(!isValidDateString(t.date))throw new Error("Task date is invalid.");if(t.time!==null&&t.time!==""&&!/^\d{2}:\d{2}$/.test(t.time))throw new Error("Task time is invalid.")}
export async function createTask({name,xp,date,time=null}){const t={id:uuid(),name:name.trim(),xp:Number(xp),date,time:time||null,category:null,createdAt:getLocalToday()};validate(t);return put("tasks",t)}
export const getTask=(id)=>getById("tasks",id);
export const getAllTasks=()=>getAll("tasks");
export async function updateTask(t){validate(t);return put("tasks",t)}
export const deleteTask=(id)=>remove("tasks",id);

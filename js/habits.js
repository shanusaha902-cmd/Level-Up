import {getAll,getById,put,remove,uuid} from "./db.js";
import {getLocalToday,getWeekdayNumber} from "./date-utils.js";
function validate(h){if(!h.name?.trim())throw new Error("Habit name is required.");if(!(Number(h.xp)>0))throw new Error("Habit XP must be positive.");if(h.schedule?.type==="weekdays"&&(!Array.isArray(h.schedule.days)||!h.schedule.days.length||h.schedule.days.some(d=>d<0||d>6)))throw new Error("Choose at least one valid weekday.")}
export async function createHabit({name,icon="✓",xp,schedule={type:"daily",days:[]}}){const h={id:uuid(),name:name.trim(),icon,xp:Number(xp),schedule,category:null,difficulty:null,active:true,createdAt:getLocalToday(),order:0};validate(h);return put("habits",h)}
export const getHabit=(id)=>getById("habits",id);
export const getAllHabits=()=>getAll("habits");
export async function updateHabit(h){validate(h);return put("habits",h)}
export const deleteHabit=(id)=>remove("habits",id);
export function isHabitScheduledToday(h,date=getLocalToday()){if(!h.active)return false;if(h.schedule.type==="daily")return true;return h.schedule.days.includes(getWeekdayNumber(date))}

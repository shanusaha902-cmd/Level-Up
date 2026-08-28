import {getAllCompletions} from "./completions.js";
import {getLocalToday,subtractDays,isConsecutiveDay} from "./date-utils.js";
export async function getCompletedDates(){const rows=await getAllCompletions();return [...new Set(rows.map(r=>r.date))].sort((a,b)=>b.localeCompare(a))}
export async function calculateCurrentStreak(today=getLocalToday()){
  const dates=new Set(await getCompletedDates());if(!dates.size)return 0;
  let start=dates.has(today)?today:subtractDays(today,1);if(!dates.has(start))return 0;
  let count=1,cur=start;while(dates.has(subtractDays(cur,1))){cur=subtractDays(cur,1);count++}return count;
}
export async function calculateBestStreak(){
  const dates=(await getCompletedDates()).sort();
  if(!dates.length)return 0;let best=1,current=1;
  for(let i=1;i<dates.length;i++){if(isConsecutiveDay(dates[i-1],dates[i]))current++;else current=1;best=Math.max(best,current)}
  return best;
}

import {getAllHabits,isHabitScheduledToday} from "./habits.js";
import {getAllTasks} from "./tasks.js";
import {getCompletionsForDate,getTodayXP} from "./completions.js";
import {getSettings} from "./db.js";
import {getLocalToday} from "./date-utils.js";
import {getRank,getNextRank,getXPIntoCurrentRank,getXPRequiredForNextRank,getRankProgress} from "./xp.js";
import {calculateCurrentStreak} from "./streaks.js";
export async function render(){
  const today=getLocalToday(),[settings,habits,tasks,completions,todayXP,streak]=await Promise.all([
    getSettings(),getAllHabits(),getAllTasks(),getCompletionsForDate(today),getTodayXP(today),calculateCurrentStreak(today)
  ]);
  const done=new Set(completions.map(c=>`${c.itemType}:${c.itemId}`)),rank=getRank(settings.totalXP),next=getNextRank(settings.totalXP);
  document.querySelector("#rankName").textContent=rank[0];document.querySelector("#rankBadge").textContent=rank[0].toUpperCase();
  document.querySelector("#totalXP").textContent=settings.totalXP;document.querySelector("#todayXP").textContent=todayXP;
  document.querySelector("#currentStreak").textContent=streak;
  document.querySelector("#xpBar").style.width=`${getRankProgress(settings.totalXP)*100}%`;
  document.querySelector("#xpProgressText").textContent=next?`${getXPIntoCurrentRank(settings.totalXP)} / ${getXPRequiredForNextRank(settings.totalXP)} XP`:"MAX RANK";
  document.querySelector("#nextRankText").textContent=next?next[0]:"Legendary";
  const h=habits.filter(x=>isHabitScheduledToday(x,today)&&x.active);
  const t=tasks.filter(x=>x.date===today);
  renderList("#habitList",h,"habit",done);
  renderList("#taskList",t,"task",done);
}
function renderList(sel,items,type,done){
  const el=document.querySelector(sel);el.innerHTML="";
  if(!items.length){el.innerHTML='<div class="muted">Nothing scheduled here.</div>';return}
  for(const item of items){
    const key=`${type}:${item.id}`,isDone=done.has(key),row=document.createElement("div");row.className="item";
    const b=document.createElement("button");b.className=`check ${isDone?"done":""}`;b.textContent=isDone?"✓":"";
    b.disabled=isDone;b.setAttribute("aria-label",isDone?"Completed":"Complete");
    b.dataset.itemType=type;b.dataset.itemId=item.id;
    const main=document.createElement("div");main.className="item-main";
    const name=document.createElement("div");name.className="item-name";name.textContent=`${item.icon||"•"} ${item.name}`;
    const meta=document.createElement("div");meta.className="item-meta";meta.textContent=type==="habit"?"Recurring habit":(item.time?`Today • ${item.time}`:"Today");
    main.append(name,meta);const xp=document.createElement("div");xp.className="xp-pill";xp.textContent=`+${item.xp} XP`;
    row.append(b,main,xp);el.append(row);
  }
}

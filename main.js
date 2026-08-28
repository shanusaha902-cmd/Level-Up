import {ensureSettings,getAll} from "./db.js";
import {createHabit} from "./habits.js";
import {createTask} from "./tasks.js";
import {completeItem} from "./completions.js";
import {render} from "./render.js";
import {getLocalToday} from "./date-utils.js";

async function seed(){
  const habits=await getAll("habits");
  if(habits.length)return;
  await createHabit({name:"Study",icon:"📚",xp:50,schedule:{type:"daily",days:[]}});
  await createHabit({name:"Workout",icon:"💪",xp:40,schedule:{type:"daily",days:[]}});
  await createHabit({name:"Read",icon:"📖",xp:20,schedule:{type:"daily",days:[]}});
  await createHabit({name:"No mindless scrolling",icon:"📵",xp:30,schedule:{type:"daily",days:[]}});
  await createHabit({name:"Sleep on time",icon:"🌙",xp:30,schedule:{type:"daily",days:[]}});
}
function setupUI(){
  document.querySelector("#addHabitBtn").onclick=()=>document.querySelector("#habitDialog").showModal();
  document.querySelector("#addTaskBtn").onclick=()=>{
    document.querySelector("#taskDate").value=getLocalToday();
    document.querySelector("#taskDialog").showModal();
  };
  document.querySelector("#habitSchedule").onchange=e=>document.querySelector("#weekdayPicker").hidden=e.target.value!=="weekdays";
  document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
  document.querySelector("#habitForm").onsubmit=async e=>{
    e.preventDefault();
    try{
      const scheduleType=document.querySelector("#habitSchedule").value;
      const days=[...document.querySelectorAll("#weekdayPicker input:checked")].map(x=>Number(x.value));
      if(scheduleType==="weekdays"&&!days.length)throw new Error("Select at least one weekday.");
      await createHabit({name:habitName.value,xp:Number(habitXP.value),schedule:{type:scheduleType,days}});
      e.target.closest("dialog").close();e.target.reset();await render();
    }catch(err){showMessage(err.message)}
  };
  document.querySelector("#taskForm").onsubmit=async e=>{
    e.preventDefault();
    try{
      await createTask({name:taskName.value,xp:Number(taskXP.value),date:taskDate.value,time:taskTime.value||null});
      e.target.closest("dialog").close();e.target.reset();await render();
    }catch(err){showMessage(err.message)}
  };
  document.addEventListener("click",async e=>{
    const b=e.target.closest(".check");if(!b||b.disabled)return;
    try{const r=await completeItem(b.dataset.itemType,b.dataset.itemId);if(r.xpAwarded)showMessage(`+${r.xpAwarded} XP`);await render()}catch(err){showMessage(err.message)}
  });
}
function showMessage(text){const el=document.querySelector("#message");el.textContent=text;clearTimeout(showMessage.t);showMessage.t=setTimeout(()=>el.textContent="",1800)}
async function init(){
  await ensureSettings();await seed();setupUI();await render();
  if("serviceWorker" in navigator){try{await navigator.serviceWorker.register("./service-worker.js")}catch(e){console.warn("Service worker registration failed:",e)}}
}
init().catch(e=>{console.error(e);showMessage("App failed to initialize. Check the console.")});

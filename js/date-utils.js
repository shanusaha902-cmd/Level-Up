export function getLocalDateString(d=new Date()){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
export function getLocalToday(){return getLocalDateString(new Date())}
function parseLocal(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
export function addDays(s,n){const d=parseLocal(s);d.setDate(d.getDate()+n);return getLocalDateString(d)}
export function subtractDays(s,n){return addDays(s,-n)}
export function getYesterday(s){return subtractDays(s,1)}
export function getWeekdayNumber(s){return parseLocal(s).getDay()}
export function compareDates(a,b){return a===b?0:(a<b?-1:1)}
export function isConsecutiveDay(a,b){return addDays(a,1)===b}
export function getWeekDates(s){
  const d=parseLocal(s), mondayOffset=(d.getDay()+6)%7, monday=addDays(s,-mondayOffset);
  return Array.from({length:7},(_,i)=>addDays(monday,i))
}
export function isValidDateString(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&getLocalDateString(parseLocal(s))===s}

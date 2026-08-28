export const RANKS=[
  ["Kickoff",0],["Bronze",150],["Silver",500],["Gold",1200],["Pro",2500],
  ["Elite",5000],["Prime",9000],["Titan",15000],["Mythic",25000],["Legendary",52000]
];
export function getRank(totalXP){let current=RANKS[0];for(const r of RANKS)if(totalXP>=r[1])current=r;return current}
export function getNextRank(totalXP){const i=RANKS.findIndex(r=>r[0]===getRank(totalXP)[0]);return RANKS[i+1]||null}
export function getXPIntoCurrentRank(totalXP){return totalXP-getRank(totalXP)[1]}
export function getXPRequiredForNextRank(totalXP){const n=getNextRank(totalXP);return n?n[1]-getRank(totalXP)[1]:0}
export function getRankProgress(totalXP){const next=getNextRank(totalXP);if(!next)return 1;return Math.max(0,Math.min(1,getXPIntoCurrentRank(totalXP)/getXPRequiredForNextRank(totalXP)))}

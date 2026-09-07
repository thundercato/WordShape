import {createRound,seededRandom,shuffle,ALPHABET} from './engine.mjs?v=4';
export const DAILY_VERSION=1;
export const PROGRESS_KEY='letteramble-progress-v1';
export const SESSION_KEY='letteramble-quickfire-daily-v1';
export const GAME_IDS=['quickfire','make-the-cut','crack-the-case'];
export function dayKey(now=new Date()) {const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');}
export function hash(text){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function priorDay(day){const date=new Date(`${day}T12:00:00Z`);date.setUTCDate(date.getUTCDate()-1);return date.toISOString().slice(0,10);}
export function streak(progress,game,today=dayKey()) {const dates=new Set(Object.keys(progress.days||{}).filter(day=>game==='ultimate'?GAME_IDS.every(id=>progress.days[day]?.[id]?.completed):progress.days[day]?.[game]?.completed));let day=dates.has(today)?today:priorDay(today),count=0;while(dates.has(day)){count++;day=priorDay(day);}return count;}
export function recordCompletion(progress,game,day,details={}) {if(!GAME_IDS.includes(game))throw new Error('Unknown game');progress.schemaVersion=1;progress.days??={};progress.days[day]??={};progress.days[day][game]??={...details,completed:true};return progress;}
export function medalFor(score){return score>=38?'gold':score>=24?'silver':'bronze';}
export function dailyRound(dictionary,day,index){
 if(!Number.isInteger(index)||index<0||index>2)throw new Error('Daily board outside 1–3');
 const seed=hash(`quickfire:${DAILY_VERSION}:${day}:${index}`),rng=seededRandom(seed);
 const shapes=shuffle(['square','circle','plus','ring'],seededRandom(hash(day)));
 if(index!==1)return createRound({dictionary,rng,round:index+1,shape:shapes[index===0?0:1]});
 // A letter is eligible only when its geometry and vocabulary can produce the
 // complete mission. Stable ordering means everyone gets the same daily agent.
 const agents=shuffle([...ALPHABET],rng);
 for(const agentLetter of agents){try{return createRound({dictionary,rng:seededRandom(hash(`${seed}:${agentLetter}`)),round:2,shape:agentLetter,agentLetter});}catch{}}
 throw new Error('No complete agent mission is available.');
}
export function packSession(session){return JSON.stringify(session);}
export function readSession(raw,day){try{const s=JSON.parse(raw);if(s?.version!==DAILY_VERSION||s.day!==day||!Array.isArray(s.results)||s.results.length>3||!s.results.every(r=>r&&['gold','silver','bronze'].includes(r.medal)&&Number.isFinite(r.total))||!Array.isArray(s.actions)||s.actions.length>2000||!s.actions.every(a=>a&&['letter','hint','pass','timeout'].includes(a.type)&&(a.type!=='letter'||Number.isInteger(a.slot)&&a.slot>=0&&a.slot<16))||!Number.isFinite(s.elapsedMs)||s.elapsedMs<0||!Number.isFinite(s.remainingMs)||s.remainingMs<0||s.remainingMs>30000)return null;return s;}catch{return null;}}

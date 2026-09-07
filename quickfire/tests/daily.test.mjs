import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dailyRound,dayKey,streak,recordCompletion,medalFor,readSession,hash} from '../daily.mjs';
import {act,assignRack,seededRandom,finishRound} from '../engine.mjs';
import {themedBomb,BOMB_THEMES} from '../bomb-themes.mjs';
const dictionary=new Set(fs.readFileSync(new URL('../words.txt',import.meta.url),'utf8').split(/\s+/));
test('daily boards are deterministic, ordered, solvable and agent answers obey the rule',()=>{
 for(let day=1;day<=28;day++)for(let i=0;i<3;i++){
  const date=`2026-09-${String(day).padStart(2,'0')}`,s=dailyRound(dictionary,date,i);
  assert.equal(s.order.length,15);assert.equal(!!s.agentLetter,i===1);
  if(i===1)for(const p of s.planted)assert.ok(p.word.startsWith(s.agentLetter)||p.word.endsWith(s.agentLetter));
  if(day===1)assert.deepEqual(s,dailyRound(dictionary,date,i));
  let n=0;while(!s.ended){const assignment=assignRack(s.board,s.rack,s.rackUsed,dictionary,s.options);assert.ok(assignment);const e=act(s,n++%5===0?{type:'timeout'}:{type:'letter',slot:assignment.get(s.active)},dictionary);assert.ok(['correct','automatic'].includes(e.kind));if(i===1)for(const w of e.words)assert.ok(w.word.startsWith(s.agentLetter)||w.word.endsWith(s.agentLetter));}
  assert.equal(s.filled,15);
 }
});
test('replaying persisted inputs restores hints, passes, rack, score and current gap',()=>{
 const day='2026-09-07',s=dailyRound(dictionary,day,1),actions=[];
 for(let i=0;i<9;i++){const a=i===0?{type:'hint'}:i===1?{type:'pass'}:{type:'letter',slot:assignRack(s.board,s.rack,s.rackUsed,dictionary,s.options).get(s.active)};actions.push(a);act(s,a,dictionary,seededRandom(hash(`${day}:1:${i}`)));}
 const restored=dailyRound(dictionary,day,1);actions.forEach((a,i)=>act(restored,a,dictionary,seededRandom(hash(`${day}:1:${i}`))));assert.deepEqual(restored,s);
 assert.equal(readSession('{',day),null);assert.equal(readSession(JSON.stringify({version:1,day,results:[],actions:[null],elapsedMs:0,remainingMs:30000}),day),null);
});
test('UK dates, individual medals, idempotent completions and ultimate streak require all games',()=>{
 assert.equal(dayKey(new Date('2026-09-07T23:30:00Z')),'2026-09-08');
 assert.equal(dayKey(new Date('2026-12-07T23:30:00Z')),'2026-12-07');
 assert.deepEqual([0,23,24,37,38,48].map(medalFor),['bronze','bronze','silver','silver','gold','gold']);
 const p={days:{}};for(const d of ['2026-09-06','2026-09-07']){recordCompletion(p,'quickfire',d);recordCompletion(p,'make-the-cut',d);}
 assert.equal(streak(p,'quickfire','2026-09-07'),2);assert.equal(streak(p,'ultimate','2026-09-07'),0);
 for(const d of ['2026-09-06','2026-09-07'])recordCompletion(p,'crack-the-case',d);
 assert.equal(streak(p,'ultimate','2026-09-08'),2);assert.equal(streak(p,'ultimate','2026-09-09'),0);
 const before=JSON.stringify(p);recordCompletion(p,'quickfire','2026-09-07',{score:999});assert.equal(JSON.stringify(p),before);
});
test('theme bank supplies 365 distinct daily six-wire sets, with valid lengths and words',()=>{
 const seen=new Set();for(let i=0;i<365;i++){const d=new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),b=themedBomb(d,dictionary);seen.add(`${b.themeId}:${b.words.join(',')}`);assert.equal(b.words.length,6);}assert.equal(seen.size,365);
 for(const theme of BOMB_THEMES)theme.words.forEach((pair,i)=>pair.forEach(w=>{assert.equal(w.length,i+3);assert.ok(dictionary.has(w),w);}));
});

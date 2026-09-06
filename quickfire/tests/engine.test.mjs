import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SIZE,SHAPES,shapeMask,wordRuns,findWords,allSolutions,createRound,act,assignRack,timeAllowance,speedBonus,finishRound,seededRandom} from '../engine.mjs';
import {RoundClock} from '../clock.mjs';
import {CountdownCues,sparkDuration,vibrate} from '../feedback.mjs';
const full=new Set(fs.readFileSync(new URL('../words.txt',import.meta.url),'utf8').trim().split('\n'));
function fixture({rows=[],cols=[],rack=['P','A','E'],words=['HAPPY'],answers=[]}={}){
 const board=Array(SIZE*SIZE).fill(undefined),occupied=board.map(()=>false);
 for(const [direction,entries] of [['across',rows],['down',cols]])for(const [r,c,text] of entries)[...text].forEach((l,i)=>{const id=(r+(direction==='down'?i:0))*SIZE+c+(direction==='across'?i:0);board[id]=l==='?'?null:l;occupied[id]=true;});
 const dictionary=new Set(words),options=allSolutions(board,dictionary,occupied),order=[...options.keys()];
 const expected=new Map(order.map((id,i)=>[id,answers[i]||[...options.get(id).keys()][0]]));
 const state={board,occupied,options,rack:[...rack],rackUsed:rack.map(()=>null),answers:expected,order,active:order[0],gaps:Object.fromEntries(order.map((id,i)=>[id,{misses:0,shownMisses:0,visits:0,reward:null,ordinal:i+1,allowance:timeAllowance(i+1)}])),found:[],score:0,totalWords:0,roundPoints:0,roundWords:0,manualSolved:0,automaticSolved:0,filled:0,ended:false,bonusAwarded:false,hintsLeft:3,passesLeft:3,hintSlots:[],hintGap:null};
 return {state,dictionary};
}
const matching=(s,d)=>assignRack(s.board,s.rack,s.rackUsed,d,s.options,s.answers);
test('THERE counts once; contained THE, HER and ERE do not score',()=>{
 const {state,dictionary}=fixture({rows:[[3,2,'TH?RE']],words:['THERE','THE','HER','ERE'],rack:['E']});
 const event=act(state,{type:'letter',slot:0},dictionary);assert.deepEqual(event.words.map(w=>w.word),['THERE']);assert.equal(event.points,2);
});
test('invalid full joined runs are rejected even when they contain real words',()=>{
 for(const word of ['OTTE?A','AOTTE?A']){const {state,dictionary}=fixture({rows:[[3,1,word]],words:['OTTER','ERA'],rack:['R']});assert.deepEqual(findWords(state.board,state.active,'R',dictionary,state.occupied),[]);}
});
test('background filler does not extend a bounded word or form extra highlights',()=>{
 const {state,dictionary}=fixture({rows:[[3,2,'OTTE?']],words:['OTTER','ERA'],rack:['R']});state.board[3*SIZE+1]='A';state.board[3*SIZE+7]='A';
 assert.deepEqual(act(state,{type:'letter',slot:0},dictionary).words.map(w=>w.word),['OTTER']);
});
test('true crossings show shortest first and earn five points',()=>{
 const {state,dictionary}=fixture({rows:[[5,2,'OTTE?']],cols:[[4,6,'E?A']],words:['OTTER','ERA'],rack:['R','X']});
 const event=act(state,{type:'letter',slot:0},dictionary);assert.equal(event.points,5);assert.equal(event.colour,'gold');assert.deepEqual(event.words.map(w=>w.word),['ERA','OTTER']);assert.equal(new Set(event.words.map(w=>w.direction)).size,2);
});
test('every perpendicular run must also be valid, including rejecting two-letter joins',()=>{
 for(const vertical of ['X?Z','X?']){const {state,dictionary}=fixture({rows:[[5,2,'C?T']],cols:[[4,3,vertical]],words:['CAT'],rack:['A']});assert.equal(findWords(state.board,state.active,'A',dictionary,state.occupied).length,0);}
});
test('no backwards, diagonal or wrapping matches',()=>{
 const {state,dictionary}=fixture({rows:[[1,1,'T?C']],words:['CAT'],rack:['A']});assert.equal(findWords(state.board,state.active,'A',dictionary,state.occupied).length,0);
 const board=Array(SIZE*SIZE).fill(undefined);board[SIZE-2]='C';board[SIZE-1]=null;board[SIZE]='T';assert.equal(findWords(board,SIZE-1,'A',dictionary).length,0);
});
test('three manual passes requeue gaps; a fourth cannot change anything',()=>{
 const {state,dictionary}=fixture({rows:[[1,1,'C?T']],words:['CAT'],rack:['A','X']});
 for(let n=1;n<=3;n++){assert.equal(act(state,{type:'pass'},dictionary).kind,'pass');assert.equal(state.passesLeft,3-n);assert.equal(state.gaps[state.active].misses,n);assert.equal(state.filled,0);}
 const before=structuredClone(state);assert.equal(act(state,{type:'pass'},dictionary).kind,'ignored');assert.deepEqual(state,before);
 assert.equal(act(state,{type:'letter',slot:0},dictionary).points,0);
});
test('one missed opportunity returns amber for one point; no available answer means no pass penalty',()=>{
 let {state,dictionary}=fixture({rows:[[1,1,'C?T']],words:['CAT'],rack:['A','X']});act(state,{type:'pass'},dictionary);const event=act(state,{type:'letter',slot:0},dictionary);assert.equal(event.colour,'amber');assert.equal(event.points,1);
 ({state,dictionary}=fixture({rows:[[1,1,'C?T']],words:['CAT'],rack:['X']}));assert.equal(act(state,{type:'pass'},dictionary).penalised,false);assert.equal(state.gaps[state.active].misses,0);
});
test('first timeout immediately reveals and consumes the answer for zero without spending a pass',()=>{
 const {state,dictionary}=fixture({rows:[[5,2,'OTTE?']],cols:[[4,6,'E?A']],words:['OTTER','ERA'],rack:['R','X']});
 const id=state.active,event=act(state,{type:'timeout'},dictionary);assert.equal(event.kind,'automatic');assert.equal(event.points,0);assert.equal(event.reason,'timeout');assert.equal(state.gaps[id].reward,'red');assert.equal(state.rackUsed[0],'automatic');assert.equal(state.passesLeft,3);assert.ok(state.found.every(w=>w.automatic));assert.ok(state.ended);
});
test('wrong letters stay in the rack, advance, and do not spend a manual pass',()=>{
 const {state,dictionary}=fixture({rows:[[1,1,'C?T'],[4,1,'HAP?Y']],words:['CAT','HAPPY'],rack:['A','P','X']});
 const first=state.active;assert.equal(act(state,{type:'letter',slot:2},dictionary).kind,'wrong');assert.notEqual(state.active,first);assert.equal(state.rackUsed[2],null);assert.equal(state.passesLeft,3);
 act(state,{type:'letter',slot:1},dictionary);assert.equal(state.active,first);assert.equal(act(state,{type:'letter',slot:0},dictionary).points,1);
});
test('fixed rack consumes physical duplicates once and never refills',()=>{
 const {state,dictionary}=fixture({rows:[[1,1,'C?T'],[4,1,'H?T']],words:['CAT','HAT'],rack:['A','A','X']});
 const before=[...state.rack];act(state,{type:'letter',slot:0},dictionary);assert.equal(act(state,{type:'letter',slot:0},dictionary).kind,'ignored');assert.deepEqual(state.rack,before);assert.equal(matching(state,dictionary).get(state.active),1);assert.equal(act(state,{type:'letter',slot:1},dictionary).kind,'correct');
});
test('unexpected whole dictionary words are accepted if the remaining rack still solves the board',()=>{
 const {state,dictionary}=fixture({rows:[[2,1,'C?T']],words:['CAT','COT'],rack:['O','A'],answers:['A']});assert.equal(act(state,{type:'letter',slot:0},dictionary).words[0].word,'COT');
});
test('blocking alternative answers neither consume a letter nor penalise the player',()=>{
 const {state,dictionary}=fixture({rows:[[1,1,'C?T'],[4,1,'D?G']],words:['CAT','COT','DOG'],rack:['A','O','X'],answers:['A','O']});
 const id=state.active;assert.equal(act(state,{type:'letter',slot:1},dictionary).kind,'reserved');assert.equal(state.active,id);assert.equal(state.gaps[id].misses,0);assert.deepEqual(state.rackUsed,[null,null,null]);
 const hint=act(state,{type:'hint'},dictionary,seededRandom(3));assert.deepEqual(hint.slots,[0]);
});
test('hints include a safe answer, use roughly thirty percent of unused tiles, and cannot reroll',()=>{
 const s=createRound({dictionary:full,rng:seededRandom(7)});
 for(let n=0;n<7;n++)act(s,{type:'letter',slot:matching(s,full).get(s.active)},full);
 const first=s.active,event=act(s,{type:'hint'},full,seededRandom(8));assert.equal(event.slots.length,3);assert.equal(new Set(event.slots).size,3);assert.ok(event.slots.every(i=>!s.rackUsed[i]));assert.ok(event.slots.includes(matching(s,full).get(s.active)));assert.equal(s.active,first);assert.equal(s.hintsLeft,2);
 assert.equal(act(s,{type:'hint'},full).kind,'ignored');assert.equal(s.hintsLeft,2);
 for(let n=0;n<2;n++){act(s,{type:'letter',slot:matching(s,full).get(s.active)},full);assert.deepEqual(s.hintSlots,[]);assert.equal(act(s,{type:'hint'},full).kind,'hint');}
 act(s,{type:'letter',slot:matching(s,full).get(s.active)},full);assert.equal(s.hintsLeft,0);assert.equal(act(s,{type:'hint'},full).kind,'ignored');
});
test('countdown allows thirty to fifteen seconds; pauses and revisits work without duplicate cues',()=>{
 const allowances=Array.from({length:15},(_,i)=>timeAllowance(i+1));assert.equal(allowances[0],30);assert.equal(allowances[14],15);assert.equal(allowances.reduce((a,b)=>a+b),337);
 const clock=new RoundClock();clock.begin(30,1000);clock.tick(6000);assert.equal(clock.remainingMs,25000);clock.pause(7000);clock.tick(100000);assert.equal(clock.elapsedMs,6000);clock.resume(100000);assert.equal(clock.tick(124000),true);assert.equal(clock.elapsedMs,30000);assert.equal(clock.tick(150000),false);
 const cues=new CountdownCues();let pulses=0;for(let ms=6000;ms>=0;ms-=50)if(cues.sample(ms))pulses++;assert.equal(pulses,5);assert.equal(cues.sample(1000),false);cues.reset();assert.equal(cues.sample(5000),true);
 assert.ok(sparkDuration(1000,30)<sparkDuration(15000,30));assert.ok(sparkDuration(15000,30)<sparkDuration(30000,30));
});
test('haptic adapter supports pulse patterns and safely ignores unavailable hardware',()=>{
 const calls=[],device={vibrate:p=>{calls.push(p);return true;}};vibrate(device,30);vibrate(device,[35,45,70]);vibrate(device,0);assert.deepEqual(calls,[30,[35,45,70],0]);assert.equal(vibrate({},30),false);assert.equal(vibrate({vibrate(){throw Error('unsupported');}},30),false);
});
test('overall speed bonus is capped by manual solves and awarded once',()=>{
 assert.ok(speedBonus(100000,15)>speedBonus(250000,15));assert.equal(speedBonus(0,0),0);assert.equal(speedBonus(400000,15),0);
 const {state,dictionary}=fixture({rows:[[1,1,'C?T']],words:['CAT'],rack:['A','X']});act(state,{type:'letter',slot:0},dictionary);const result=finishRound(state,1000),score=state.score;assert.equal(result.total,3);finishRound(state,0);assert.equal(state.score,score);
});
test('all twelve masks retain their shape and boards avoid immediate repeats',()=>{
 assert.equal(shapeMask('plus').filter(Boolean).length,SIZE*SIZE-64);assert.equal(shapeMask('ring')[7*SIZE+7],false);assert.equal(shapeMask('circle')[0],false);assert.ok(shapeMask('square').every(Boolean));
 const first=createRound({dictionary:full,rng:seededRandom(1)}),next=createRound({dictionary:full,rng:seededRandom(1),previousShape:first.shape,previousTheme:first.theme});assert.notEqual(next.shape,first.shape);assert.notEqual(next.theme,first.theme);
});
test('720 shaped boards have fifteen solvable gaps, a crossing and only valid maximal runs',()=>{
 for(const shape of SHAPES)for(let seed=1;seed<=60;seed++){
  const s=createRound({dictionary:full,shape,rng:seededRandom(seed)});assert.equal(s.answers.size,15);assert.equal(s.rack.length,16);assert.equal(s.board.filter(l=>l===null).length,15);assert.equal(matching(s,full).size,15);
  const solved=[...s.board];for(const [id,letter] of s.answers){assert.ok(s.options.get(id).has(letter));solved[id]=letter;}
  const seen=new Set();s.occupied.forEach((occupied,id)=>{if(!occupied)return;assert.ok(s.mask[id]);for(const run of wordRuns(s.occupied,id)){const key=run.direction+run.cells[0];if(seen.has(key))continue;seen.add(key);assert.ok(run.cells.length>=3);assert.ok(full.has(run.cells.map(i=>solved[i]).join('')));assert.equal(run.cells.filter(i=>s.answers.has(i)).length,1);}});
  assert.equal(seen.size,16);assert.equal(s.options.get(s.shared).get(s.answers.get(s.shared)).length,2);
  s.mask.forEach((shown,id)=>{if(!shown)assert.equal(s.board[id],undefined);});
 }
});
test('complete games mixing hints, passes, alternative words and timeouts cannot strand the rack',()=>{
 for(const shape of SHAPES)for(let seed=81;seed<=83;seed++){
  const rng=seededRandom(seed),s=createRound({dictionary:full,shape,rng});let turns=0;
  while(!s.ended&&turns++<100){
   const assignment=matching(s,full);assert.ok(assignment);assert.equal(s.rackUsed.filter(x=>!x).length,16-s.filled);
   if(s.hintsLeft&&rng()<.3)act(s,{type:'hint'},full,rng);
   if(s.passesLeft&&rng()<.3)act(s,{type:'pass'},full);
   else if(rng()<.25)act(s,{type:'timeout'},full);
   else{const choices=s.rack.map((_,i)=>i).filter(i=>!s.rackUsed[i]&&s.options.get(s.active).has(s.rack[i]));const event=act(s,{type:'letter',slot:choices[Math.floor(rng()*choices.length)]},full);if(event.kind==='reserved')act(s,{type:'letter',slot:assignment.get(s.active)},full);}
  }
  assert.ok(s.ended);assert.equal(s.filled,15);assert.equal(s.rackUsed.filter(x=>!x).length,1);assert.equal(s.manualSolved+s.automaticSolved,15);
 }
});

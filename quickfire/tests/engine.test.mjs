import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findWords,allSolutions,createRound,act,assignRack,orderedWords,timeAllowance,speedBonus,finishRound,seededRandom} from '../engine.mjs';
import {RoundClock} from '../clock.mjs';
const full=new Set(fs.readFileSync(new URL('../words.txt',import.meta.url),'utf8').trim().split('\n'));
function fixture({rows=[],cols=[],rack=['P','A','E'],words=['HAPPY'],answers=[]}={}){
 const board=Array(144).fill('Z');
 for(const [r,c,text] of rows)[...text].forEach((l,i)=>board[r*12+c+i]=l==='?'?null:l);
 for(const [r,c,text] of cols)[...text].forEach((l,i)=>board[(r+i)*12+c]=l==='?'?null:l);
 const dictionary=new Set(words),options=allSolutions(board,dictionary),order=[...options.keys()];
 const expected=new Map(order.map((id,i)=>[id,answers[i]||[...options.get(id).keys()][0]]));
 const state={board,options,rack:[...rack],rackUsed:rack.map(()=>null),answers:expected,order,active:order[0],gaps:Object.fromEntries(order.map((id,i)=>[id,{misses:0,shownMisses:0,visits:0,reward:null,ordinal:i+1,allowance:timeAllowance(i+1)}])),found:[],score:0,totalWords:0,roundPoints:0,roundWords:0,manualSolved:0,automaticSolved:0,filled:0,ended:false,bonusAwarded:false};
 return {state,dictionary};
}
test('embedded words, no backwards words, row wrapping or two-letter matches',()=>{
 const {state,dictionary}=fixture({rows:[[3,2,'XHAP?YT']]});assert.deepEqual(findWords(state.board,42,'P',dictionary).map(w=>w.word),['HAPPY']);
 const board=Array(144).fill('Z');board[10]='C';board[11]=null;board[12]='T';assert.equal(findWords(board,11,'A',new Set(['CAT','CA','AT'])).length,0);
 board[24]='T';board[25]=null;board[26]='C';assert.equal(findWords(board,25,'A',new Set(['CAT'])).length,0);
});
test('OTTER and ERA in one row earn five and reveal ERA first',()=>{
 const {state,dictionary}=fixture({rows:[[3,1,'OTTE?A']],words:['OTTER','ERA'],rack:['R','A']});
 const event=act(state,{type:'letter',slot:0},dictionary);
 assert.equal(event.points,5);assert.equal(event.colour,'gold');assert.deepEqual(event.words.map(w=>w.word),['ERA','OTTER']);
 assert.deepEqual(event.words[0].cells,[40,41,42]);assert.deepEqual(event.words[1].cells,[37,38,39,40,41]);
 assert.equal(state.score,5);assert.equal(state.filled,1);assert.equal(state.totalWords,2);
});
test('crossing words also earn five; auto-fill always overrides gold to zero',()=>{
 const setup=()=>fixture({rows:[[4,2,'C?T']],cols:[[3,3,'H?T']],words:['CAT','HAT'],rack:['A','E']});
 let {state,dictionary}=setup();assert.equal(act(state,{type:'letter',slot:0},dictionary).points,5);
 ({state,dictionary}=setup());act(state,{type:'pass'},dictionary);const event=act(state,{type:'pass'},dictionary);assert.equal(event.kind,'automatic');assert.equal(event.points,0);assert.equal(event.colour,'red');
});
test('fixed rack letters are consumed once, retain their letters and cannot be reused',()=>{
 const {state,dictionary}=fixture({rows:[[1,1,'C?T'],[4,1,'HAP?Y']],words:['CAT','HAPPY'],rack:['A','P','X']});
 const before=[...state.rack];act(state,{type:'letter',slot:0},dictionary);assert.deepEqual(state.rack,before);assert.equal(state.rackUsed[0],'used');
 const active=state.active;assert.equal(act(state,{type:'letter',slot:0},dictionary).kind,'ignored');assert.equal(state.active,active);
});
test('first pass revisits for amber; second pass consumes the matching slot in red',()=>{
 const {state,dictionary}=fixture({rows:[[1,1,'C?T'],[4,1,'HAP?Y']],words:['CAT','HAPPY'],rack:['A','P','X']});
 const first=state.active;act(state,{type:'pass'},dictionary);assert.equal(state.gaps[first].misses,1);assert.equal(state.gaps[first].shownMisses,0);
 act(state,{type:'letter',slot:1},dictionary);assert.equal(state.active,first);assert.equal(state.gaps[first].shownMisses,1);
 const event=act(state,{type:'pass'},dictionary);assert.equal(event.kind,'automatic');assert.equal(state.rackUsed[0],'automatic');assert.equal(state.gaps[first].reward,'red');assert.equal(state.ended,true);
});
test('timeout follows exactly the same two-opportunity rule as a pass',()=>{
 const {state,dictionary}=fixture({rows:[[2,1,'HAP?Y']],rack:['P','X']});
 assert.equal(act(state,{type:'timeout'},dictionary).kind,'timeout');const event=act(state,{type:'timeout'},dictionary);assert.equal(event.kind,'automatic');assert.equal(event.reason,'timeout');assert.equal(event.points,0);
});
test('a wrong first choice stays in the rack and advances; a second miss auto-fills',()=>{
 const {state,dictionary}=fixture({rows:[[2,1,'HAP?Y']],rack:['P','X']});
 assert.equal(act(state,{type:'letter',slot:1},dictionary).kind,'wrong');assert.equal(state.rackUsed[1],null);
 assert.equal(act(state,{type:'letter',slot:1},dictionary).kind,'automatic');assert.equal(state.rackUsed[0],'automatic');assert.equal(state.rackUsed[1],null);
});
test('unexpected valid answers count when they leave a complete solution',()=>{
 const {state,dictionary}=fixture({rows:[[2,1,'C?T']],words:['CAT','COT'],rack:['O','A'],answers:['A']});
 const event=act(state,{type:'letter',slot:0},dictionary);assert.equal(event.kind,'correct');assert.equal(event.words[0].word,'COT');assert.equal(event.points,2);
});
test('valid but blocking answers are explained without consuming letters or a chance',()=>{
 const {state,dictionary}=fixture({rows:[[1,1,'C?T'],[4,1,'D?G']],words:['CAT','COT','DOG'],rack:['A','O','X'],answers:['A','O']});
 const index=state.active,event=act(state,{type:'letter',slot:1},dictionary);assert.equal(event.kind,'reserved');assert.equal(state.gaps[index].misses,0);assert.equal(state.active,index);assert.deepEqual(state.rackUsed,[null,null,null]);assert.equal(state.board[index],null);
 assert.equal(act(state,{type:'letter',slot:0},dictionary).kind,'correct');assert.equal(act(state,{type:'letter',slot:1},dictionary).kind,'correct');assert.ok(state.ended);
});
test('rack matching reallocates duplicates and honours remaining alternatives',()=>{
 const {state,dictionary}=fixture({rows:[[1,1,'C?T'],[4,1,'D?G'],[7,1,'H?T']],words:['CAT','COT','DOG','HAT'],rack:['A','A','O','X']});
 const assignment=assignRack(state.board,state.rack,state.rackUsed,dictionary);assert.equal(assignment.size,3);assert.equal(new Set(assignment.values()).size,3);
});
test('fifteen decreasing allowances reach 30 and 15, and remain assigned to the gap',()=>{
 const allowances=Array.from({length:15},(_,i)=>timeAllowance(i+1));assert.equal(allowances[0],30);assert.equal(allowances[14],15);assert.equal(allowances.reduce((a,b)=>a+b),337);assert.ok(allowances.every((x,i)=>i===0||x<allowances[i-1]));
 const {state,dictionary}=fixture({rows:[[1,1,'C?T']],words:['CAT'],rack:['A','X']});act(state,{type:'pass'},dictionary);assert.equal(state.gaps[state.active].allowance,30);
});
test('active clock excludes pauses and animation time, and expires once',()=>{
 const clock=new RoundClock();clock.begin(30,1000);assert.equal(clock.tick(6000),false);assert.equal(clock.remainingMs,25000);clock.pause(7000);assert.equal(clock.elapsedMs,6000);clock.tick(100000);assert.equal(clock.elapsedMs,6000);clock.resume(100000);assert.equal(clock.tick(124000),true);assert.equal(clock.elapsedMs,30000);assert.equal(clock.tick(150000),false);
 clock.begin(29,150000);clock.tick(153000);assert.equal(clock.elapsedMs,33000);assert.equal(clock.remainingMs,26000);
});
test('speed bonus uses overall time, is capped by manual solves, and awards once',()=>{
 assert.ok(speedBonus(100000,15)>speedBonus(250000,15));assert.equal(speedBonus(0,0),0);assert.equal(speedBonus(0,4),4);assert.equal(speedBonus(400000,15),0);
 const {state,dictionary}=fixture({rows:[[1,1,'C?T']],words:['CAT'],rack:['A','X']});act(state,{type:'letter',slot:0},dictionary);
 const summary=finishRound(state,1000),total=state.score;assert.equal(summary.bonus,1);assert.equal(summary.total,3);finishRound(state,0);assert.equal(state.score,total);
});
test('every generated board has exactly 15 answerable gaps and 16 correctly counted rack letters',()=>{
 for(let seed=1;seed<=60;seed++){
  const s=createRound({dictionary:full,rng:seededRandom(seed)});assert.equal(s.board.filter(l=>l===null).length,15);assert.equal(s.rack.length,16);assert.equal(s.answers.size,15);assert.equal(s.order.length,15);
  assert.equal(assignRack(s.board,s.rack,s.rackUsed,full,s.options).size,15);
  for(const [id,answer] of s.answers)assert.ok(s.options.get(id).has(answer));
  const cross=s.options.get(s.shared).get(s.answers.get(s.shared));assert.equal(new Set(cross.map(w=>w.direction)).size,2);
 }
});
test('complete games with alternatives, passes, timeouts and auto-fills never exhaust the rack early',()=>{
 let plays=0;
 for(let seed=101;seed<=130;seed++){
  const rng=seededRandom(seed),s=createRound({dictionary:full,rng});let steps=0;
  while(!s.ended&&steps++<180){
   assert.equal(s.rackUsed.filter(x=>!x).length,16-s.filled);
   const assignment=assignRack(s.board,s.rack,s.rackUsed,full,s.options,s.answers);assert.ok(assignment);
   let event;
   if(rng()<.25)event=act(s,{type:rng()<.5?'pass':'timeout'},full);
   else{
    const choices=s.rack.map((_,i)=>i).filter(i=>!s.rackUsed[i]&&s.options.get(s.active).has(s.rack[i]));
    event=act(s,{type:'letter',slot:choices[Math.floor(rng()*choices.length)]},full);
    if(event.kind==='reserved')event=act(s,{type:'letter',slot:assignment.get(s.active)},full);
   }
   if(event.kind==='correct'||event.kind==='automatic')plays++;
   assert.equal(s.ended,s.filled===15);
  }
  assert.ok(s.ended);assert.equal(s.filled,15);assert.equal(s.rackUsed.filter(x=>!x).length,1);assert.equal(s.manualSolved+s.automaticSolved,15);
 }
 assert.equal(plays,450);
});

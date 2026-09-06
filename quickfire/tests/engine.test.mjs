import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findWords,solutionsFor,allSolutions,availableMoves,createRound,rewardFor,act,seededRandom,SIZE} from '../engine.mjs';
const full=new Set(fs.readFileSync(new URL('../words.txt',import.meta.url),'utf8').trim().split('\n'));
function fixture({rows=[],cols=[],rack=['P','A','E','I','O','U','R','S','T','L','N','D'],words=['HAPPY'],active}={}) {
  const board=Array(144).fill('Z');
  for(const [r,c,text] of rows)[...text].forEach((l,i)=>board[r*12+c+i]=l==='?'?null:l);
  for(const [r,c,text] of cols)[...text].forEach((l,i)=>board[(r+i)*12+c]=l==='?'?null:l);
  const dictionary=new Set(words),options=allSolutions(board,dictionary),order=[...options.keys()];
  const state={board,options,rack:[...rack],order,active:active??order[0],gaps:Object.fromEntries(order.map(i=>[i,{misses:0,shownMisses:0,visits:0,reward:null}])),found:[],score:0,totalWords:0,roundPoints:0,roundWords:0,filled:0,ended:false};
  return {state,dictionary};
}
test('recognises embedded HAPPY, not just a whole row',()=>{
  const {state,dictionary}=fixture({rows:[[3,2,'XHAP?YT']]});
  const matches=findWords(state.board,42,'P',dictionary);
  assert.deepEqual(matches.map(w=>w.word),['HAPPY']);assert.deepEqual(matches[0].cells,[39,40,41,42,43]);
});
test('never wraps a row, reads backwards or accepts two-letter words',()=>{
  const board=Array(144).fill('Z');board[10]='C';board[11]=null;board[12]='T';
  assert.equal(findWords(board,11,'A',new Set(['CAT','CA','AT'])).length,0);
  board[24]='T';board[25]=null;board[26]='C';assert.equal(findWords(board,25,'A',new Set(['CAT'])).length,0);
});
test('accepts an unexpected valid answer and every same-direction substring',()=>{
  const {state,dictionary}=fixture({rows:[[2,2,'C?TCH']],words:['CATCH','CAT'],rack:['A','P','E']});
  const result=act(state,{type:'letter',slot:0},dictionary,seededRandom(1));
  assert.equal(result.kind,'correct');assert.deepEqual(result.words.map(w=>w.word).sort(),['CAT','CATCH']);assert.equal(result.points,2);assert.equal(state.rack.length,3);assert.equal(state.board[27],'A');
});
test('valid alternative rack letters make a pass avoidable',()=>{
  const {state,dictionary}=fixture({rows:[[2,2,'C?T'],[6,2,'HAP?Y']],words:['CAT','COT','HAPPY'],rack:['O','P','E']});
  const index=state.active;act(state,{type:'pass'},dictionary);assert.equal(state.gaps[index].misses,1);assert.equal(state.gaps[index].shownMisses,0);
  act(state,{type:'pass'},dictionary);assert.equal(state.active,index);assert.equal(state.gaps[index].shownMisses,1);
  const result=act(state,{type:'letter',slot:0},dictionary);assert.equal(result.colour,'amber');assert.equal(result.points,1);
});
test('passing without a usable rack letter carries no penalty',()=>{
  const {state,dictionary}=fixture({rows:[[1,1,'HAP?Y'],[4,1,'C?T']],words:['HAPPY','CAT'],rack:['A','E','I']});
  const index=state.active;const result=act(state,{type:'pass'},dictionary);assert.equal(result.penalised,false);assert.equal(state.gaps[index].misses,0);
});
test('incorrect letters stay in the rack and advance fairly',()=>{
  const {state,dictionary}=fixture({rows:[[1,1,'HAP?Y'],[4,1,'C?T']],words:['HAPPY','CAT'],rack:['A','P','E']});
  const before=[...state.rack],index=state.active;
  assert.equal(act(state,{type:'letter',slot:0},dictionary).kind,'wrong');assert.deepEqual(state.rack,before);assert.notEqual(state.active,index);assert.equal(state.gaps[index].misses,1);
  state.rack=['E','I','O'];const next=state.active;act(state,{type:'letter',slot:0},dictionary);assert.equal(state.gaps[next].misses,0);
});
test('third opportunity is red, scores zero and still refills',()=>{
  const {state,dictionary}=fixture({rows:[[1,1,'HAP?Y']],words:['HAPPY'],rack:['P','A','E']});
  const index=state.active;act(state,{type:'pass'},dictionary);act(state,{type:'pass'},dictionary);
  const result=act(state,{type:'letter',slot:0},dictionary,seededRandom(5));assert.equal(result.colour,'red');assert.equal(result.points,0);assert.equal(state.board[index],'P');assert.match(result.replacement,/^[A-Z]$/);assert.equal(state.rack.length,3);assert.equal(state.filled,1);
});
test('crossing placement earns five once, overriding missed opportunities',()=>{
  const {state,dictionary}=fixture({rows:[[4,2,'C?T']],cols:[[3,3,'H?T']],words:['CAT','HAT'],rack:['A','E','I']});
  act(state,{type:'pass'},dictionary);act(state,{type:'pass'},dictionary);act(state,{type:'pass'},dictionary);
  const result=act(state,{type:'letter',slot:0},dictionary);assert.equal(result.colour,'gold');assert.equal(result.points,5);assert.equal(state.score,5);assert.equal(result.words.length,2);
});
test('W?LK?NG must become WALK before WALKING; other gaps stop words',()=>{
  const {state,dictionary}=fixture({rows:[[2,1,'W?LK?NG']],words:['WALK','WALKING'],rack:['A','I','X']});
  const [first,second]=state.order;assert.equal(solutionsFor(state.board,second,dictionary).size,0);
  let event=act(state,{type:'letter',slot:0},dictionary,()=>.99);assert.deepEqual(event.words.map(w=>w.word),['WALK']);assert.equal(state.active,second);
  event=act(state,{type:'letter',slot:1},dictionary,()=>.99);assert.deepEqual(event.words.map(w=>w.word),['WALKING']);assert.equal(state.filled,2);assert.equal(state.ended,true);
});
test('board ends only after replacing a letter and checking all remaining gaps',()=>{
  const {state,dictionary}=fixture({rows:[[1,1,'C?T'],[5,1,'D?G']],words:['CAT','DOG'],rack:['A','X','X']});
  const event=act(state,{type:'letter',slot:0},dictionary,()=>0);
  assert.equal(event.replacement,'O');assert.equal(state.ended,false);assert.ok(availableMoves(state).length>0);
  act(state,{type:'letter',slot:0},dictionary,()=>0);assert.equal(state.ended,true);assert.equal(availableMoves(state).length,0);
});
test('unsolvable red herrings do not prevent completion',()=>{
  const {state,dictionary}=fixture({rows:[[1,1,'C?T'],[5,1,'Z?Z']],words:['CAT'],rack:['A','X','X']});
  act(state,{type:'letter',slot:0},dictionary,()=>.99);assert.equal(state.ended,true);assert.equal(state.board.filter(x=>x===null).length,1);
});
test('dictionary contains British words and all playable lengths',()=>{
  assert.equal(full.size,72825);for(const w of ['COLOUR','FAVOUR','HAPPY','WALK','WALKING','ORGANISE'])assert.ok(full.has(w),w);
  assert.ok([...full].every(w=>/^[A-Z]{3,12}$/.test(w)));
});
test('generated boards preserve every planted word, double, staged extension and rack',()=>{
  for(const density of [10,15,20])for(let seed=1;seed<=30;seed++){
    const s=createRound({density,dictionary:full,rng:seededRandom(seed)});
    assert.equal(s.board.length,144);assert.equal(s.planted.length,density);assert.equal(s.rack.length,12);assert.ok(availableMoves(s).length>0);assert.ok(s.options.get(s.active).has(s.answers.get(s.active)));
    assert.ok(s.rack.includes(s.answers.get(s.active)));
    for(const p of s.planted){assert.ok(full.has(p.word));assert.equal(p.cells.length,p.word.length);for(let n=0;n<p.cells.length;n++){const id=p.cells[n];assert.ok(id>=0&&id<144);assert.equal(s.board[id]??s.answers.get(id),p.word[n],`${density}/${seed}/${p.word}`);}}
    const cross=s.options.get(s.shared).get(s.answers.get(s.shared));assert.equal(new Set(cross.map(w=>w.direction)).size,2);
    const [first,second]=s.chain;const target=s.answers.get(first);assert.ok(s.options.get(first).has(target));
    const board=[...s.board];board[first]=target;assert.ok(findWords(board,second,s.answers.get(second),full).some(w=>s.planted.some(p=>p.type==='extension'&&p.word===w.word)));
  }
});
test('complete simulated games keep scoring consistent and terminate correctly',()=>{
  let placements=0;
  for(const density of [10,15,20])for(let seed=101;seed<111;seed++){
    const rng=seededRandom(seed),s=createRound({density,dictionary:full,rng});let steps=0,points=0;
    while(!s.ended&&steps++<1000){
      const moves=availableMoves(s),move=moves.find(m=>m.index===s.active);
      if(!move){act(s,{type:'pass'},full,rng);continue;}
      const event=act(s,{type:'letter',slot:s.rack.indexOf(move.letter)},full,rng);assert.equal(event.kind,'correct');points+=event.points;placements++;
      assert.equal(s.score,points);assert.equal(s.rack.length,12);assert.equal(s.totalWords,s.found.length);assert.equal(s.ended,availableMoves(s).length===0);
    }
    assert.ok(steps<1000);assert.ok(s.ended);assert.equal(availableMoves(s).length,0);
  }
  assert.ok(placements>250);
});

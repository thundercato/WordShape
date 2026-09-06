/* Word Ramble v2. Pure rules, search and match transitions; no DOM or storage. */
(function(root){
'use strict';
const key=(r,c)=>r+','+c, clone=x=>JSON.parse(JSON.stringify(x));
const count=a=>{const x={};for(const l of a)x[l]=(x[l]||0)+1;return x;};
const fits=(need,rack)=>Object.keys(need).every(l=>(rack[l]||0)>=need[l]);
const shuffle=(a,rng=Math.random)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const DIRECTIONS=[[0,1],[1,0]],NEIGHBOURS=[[0,1],[1,0],[0,-1],[-1,0]];
const BAG='AAAAAAAEEEEEEEEIIIIIOOOOOUUURRRRRSSSSSTTTTTLLLLNNNNDDDGCMHPBY';
function randomFill(retained,capacity,rng=Math.random){const rack=[...retained];while(rack.length<capacity)rack.push(BAG[Math.floor(rng()*BAG.length)]);return shuffle(rack,rng);}
const cell=(b,r,c)=>b.cells[r]?.[c];
function baseValidate(b,draft,dict,rack){
 const bad=error=>({ok:false,error});
 if(!Array.isArray(draft)||!draft.length)return bad('Place at least one tile first.');
 const added=new Map();
 for(const t of draft){if(!Number.isInteger(t.r)||!Number.isInteger(t.c)||!cell(b,t.r,t.c)?.playable)return bad('Every tile must be on a playable square. Words cannot cross the edge or a gap.');
 if(cell(b,t.r,t.c).letter)return bad('That square already has a locked letter.');if(added.has(key(t.r,t.c)))return bad('Two tiles cannot share one square.');if(!/^[A-Z]$/.test(t.letter))return bad('Tiles must contain one letter.');added.set(key(t.r,t.c),t.letter);}
 if(rack&&!fits(count(draft.map(t=>t.letter)),count(rack)))return bad('Your rack does not contain enough copies of those letters.');
 const row=draft.every(t=>t.r===draft[0].r),col=draft.every(t=>t.c===draft[0].c);
 if(!row&&!col)return bad('Place all new tiles in one row or one column.');
 const letter=(r,c)=>cell(b,r,c)?.playable?(added.get(key(r,c))||cell(b,r,c).letter):null;
 const dr=row?0:1,dc=row?1:0;
 const sorted=[...draft].sort((a,b)=>row?a.c-b.c:a.r-b.r);
 for(let r=sorted[0].r,c=sorted[0].c;r<=sorted.at(-1).r&&c<=sorted.at(-1).c;r+=dr,c+=dc)if(!letter(r,c))return bad('Fill the gap between your tiles. Existing letters may join them.');
 if(!draft.some(t=>[[1,0],[-1,0],[0,1],[0,-1]].some(([a,z])=>cell(b,t.r+a,t.c+z)?.letter)))return bad('Connect your word to a letter already on the board.');
 const sequences=new Map();
 for(const t of draft)for(const [dr,dc] of [[0,1],[1,0]]){let r=t.r,c=t.c;while(letter(r-dr,c-dc)){r-=dr;c-=dc;}const start=key(r,c)+':'+dr;let word='',positions=[];while(letter(r,c)){word+=letter(r,c);positions.push({r,c});r+=dr;c+=dc;}if(word.length>=2)sequences.set(start,{word,positions});}
 if(!sequences.size)return bad('Make a word of at least two letters.');
 for(const s of sequences.values())if(!dict.has(s.word))return bad('“'+s.word+'” is not in this dictionary. Check the full word and its crossings.');
 const words=[...sequences.values()];return {ok:true,words,score:words.reduce((s,w)=>s+w.word.length**2,0)+5*(words.length-1)};
}
function makeLex(words){const set=new Set(words),byLength={},index={};for(const word of set){(byLength[word.length]??=[]).push(word);for(let i=0;i<word.length;i++)(index[word.length+':'+i+':'+word[i]]??=[]).push(word);}return {set,byLength,index};}
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
/* Complete segment enumeration: full-word boundaries, fixed letters, perpendicular
   masks, rack multiplicities. Cooperative yields are NOT no-move verdicts. */
async function search(b,lex,dict,{capacity=8,rack=null,retained=[],limit=Infinity,onProgress=()=>{},deadline=Infinity,check=baseValidate}={}){
 const result=[],seen=new Set(),rc=rack?count(rack):null,keep=count(retained);let steps=0,last=Date.now();
 if(Date.now()>=deadline)return {moves:[],complete:false,interrupted:true};
 for(const [dr,dc] of [[0,1],[1,0]]){
 const masks=new Map();
 for(let r=0;r<b.cells.length;r++)for(let c=0;c<b.cells[0].length;c++)if(cell(b,r,c)?.playable&&!cell(b,r,c).letter){
  let pre='',post='',rr=r-dc,cc=c-dr;while(cell(b,rr,cc)?.letter){pre=cell(b,rr,cc).letter+pre;rr-=dc;cc-=dr;}rr=r+dc;cc=c+dr;while(cell(b,rr,cc)?.letter){post+=cell(b,rr,cc).letter;rr+=dc;cc+=dr;}
  if(pre||post)masks.set(key(r,c),new Set([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(l=>dict.has(pre+l+post))));
 }
 for(let r=0;r<b.cells.length;r++)for(let c=0;c<b.cells[0].length;c++){
  if(!cell(b,r,c)?.playable||cell(b,r-dr,c-dc)?.letter)continue;
  let fixed=[],blanks=[],connected=false;
  for(let len=1;len<=15;len++){
   const rr=r+dr*(len-1),cc=c+dc*(len-1),sq=cell(b,rr,cc);if(!sq?.playable)break;
   if(sq.letter){fixed.push([len-1,sq.letter]);connected=true;}else{blanks.push({r:rr,c:cc,i:len-1,mask:masks.get(key(rr,cc))});if([[1,0],[-1,0],[0,1],[0,-1]].some(([a,z])=>cell(b,rr+a,cc+z)?.letter))connected=true;}
   if(blanks.length>capacity)break;
   if(len<2||!blanks.length||!connected||cell(b,rr+dr,cc+dc)?.letter)continue;
   let candidates=lex.byLength[len]||[];
   for(const [i,l] of fixed){const v=lex.index[len+':'+i+':'+l]||[];if(v.length<candidates.length)candidates=v;}
   for(const t of blanks)if(t.mask){const v=[...t.mask].flatMap(l=>lex.index[len+':'+t.i+':'+l]||[]);if(v.length<candidates.length)candidates=v;}
   for(const word of candidates){steps++;
    if(steps%512===0&&Date.now()-last>8){onProgress(steps);await pause();last=Date.now();if(last>=deadline)return {moves:result,complete:false,interrupted:true,steps};}
    if(fixed.some(([i,l])=>word[i]!==l)||blanks.some(t=>t.mask&&!t.mask.has(word[t.i])))continue;
    const needs=count(blanks.map(t=>word[t.i]));if(rc&&!fits(needs,rc))continue;
    if(Object.keys(needs).reduce((sum,l)=>sum+Math.max(0,needs[l]-(keep[l]||0)),retained.length)>capacity)continue;
    const draft=blanks.map(t=>({r:t.r,c:t.c,letter:word[t.i]})),id=draft.map(t=>key(t.r,t.c)+t.letter).sort().join('|');if(seen.has(id))continue;
    const checked=check(b,draft,dict,rack);if(!checked.ok)continue;
    seen.add(id);result.push({word,draft,needs,score:checked.score,words:checked.words.map(w=>w.word)});
    if(result.length>=limit)return {moves:result,complete:false,steps};
   }
   if(Date.now()-last>8){onProgress(steps);await pause();last=Date.now();if(last>=deadline)return {moves:result,complete:false,interrupted:true,steps};}
  }
 }
 }
 return {moves:result,complete:true,steps};
}
function addSeed(b,word,r,c,dr=0,dc=1){
 const id='seed-'+b.seedWords.length,positions=[...word].map((letter,i)=>({r:r+dr*i,c:c+dc*i,letter}));
 if(positions.some(t=>!cell(b,t.r,t.c)?.playable||cell(b,t.r,t.c).letter))return false;
 if(positions.some(t=>NEIGHBOURS.some(([a,z])=>cell(b,t.r+a,t.c+z)?.letter)))return false;
 for(const t of positions)Object.assign(cell(b,t.r,t.c),{letter:t.letter,seedId:id});
 b.seedWords.push({id,word,positions:positions.map(({r,c})=>({r,c}))});return true;
}
function makeBoard(type='smiley',shapeSeed=1){
 const rng=seeded(shapeSeed),pick=a=>a[Math.floor(rng()*a.length)];
 const rows=type==='smiley'?15:pick([11,13,15,17]),cols=type==='smiley'?15:pick([11,13,15,17]);
 const cy=(rows-1)/2,cx=(cols-1)/2,variant=pick(['island','diamond','cloud','cross']),tint=pick(['#b8dbe6','#b8dfe0','#d4d9f2','#e4d3b1']);
 const laneR=[Math.floor(rows/3),Math.floor(rows*2/3)],laneC=[Math.floor(cols/3),Math.floor(cols*2/3)],wobble=Array.from({length:rows},()=>rng()*.12);
 const cells=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>{
 let playable;if(type==='smiley')playable=(r-7)**2+(c-7)**2<=49;
 else if(type==='hashtag')playable=laneR.includes(r)||laneC.includes(c);
 else {const x=Math.abs(c-cx)/cx,y=Math.abs(r-cy)/cy;
  playable=variant==='diamond'?x+y<=1.18:variant==='cross'?(x<.34||y<.34||x+y<1.05):variant==='cloud'?x*x+y*y<=.82+.15*Math.cos(r*.9):x*x+y*y<=.87+wobble[r];}
 const eye=type==='smiley'&&r>=4&&r<=6&&(c===4||c===10),edge=type==='smiley'&&r===10&&(c===4||c===10),mouth=type==='smiley'&&r===11&&c>=5&&c<=9;
 return {playable:playable&&!edge,decorative:edge,colour:type==='smiley'?(eye||edge||mouth?'#172b38':'#f5cc4d'):tint,letter:null,owner:null,seedId:null};
 }));
 const b={type,shapeSeed,variant:type==='random'?variant:type,cells,seedWords:[],opening:true};
 if(type==='smiley'){addSeed(b,'EYE',4,4,1,0);addSeed(b,'EYE',4,10,1,0);addSeed(b,'SMILE',11,5);}
 else if(type==='hashtag'){
  const word=pick(['SMILE','HAPPY','DREAM','MUSIC']);addSeed(b,word,laneR[0],Math.max(0,laneC[0]-1));
  addSeed(b,pick(['PLAY','GLOW','CALM']),laneR[1],Math.max(0,laneC[1]-2));
 }else {
  // Keep only the central connected component of a generated silhouette.
  const seen=new Set(),queue=[[Math.round(cy),Math.round(cx)]];
  while(queue.length){const [r,c]=queue.pop(),k=key(r,c);if(seen.has(k)||!cell(b,r,c)?.playable)continue;seen.add(k);for(const [dr,dc]of NEIGHBOURS)queue.push([r+dr,c+dc]);}
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(!seen.has(key(r,c)))cells[r][c].playable=false;
  for(const word of shuffle(['HAPPY','DREAM','SMILE','PLAY','CALM','GLOW','MUSIC','STORY'],rng)){
   const options=[];for(let r=1;r<rows-1;r++)for(let c=1;c<cols-1;c++)for(const [dr,dc]of DIRECTIONS){
    const spots=[...word].map((l,i)=>[r+dr*i,c+dc*i]);
    if(spots.every(([rr,cc])=>cell(b,rr,cc)?.playable&&!cell(b,rr,cc).letter)&&spots.some(([rr,cc])=>cell(b,rr-dc,cc-dr)?.playable&&cell(b,rr+dc,cc+dr)?.playable))options.push([r,c,dr,dc]);}
   for(const pos of shuffle(options,rng))if(addSeed(b,word,...pos))break;
   if(b.seedWords.length===3)break;
  }
 }
 return b;
}
function sequences(b){
 const out=[];for(let r=0;r<b.cells.length;r++)for(let c=0;c<b.cells[0].length;c++)for(const [dr,dc]of DIRECTIONS){
 if(!cell(b,r,c)?.letter||cell(b,r-dr,c-dc)?.letter)continue;let word='',positions=[],rr=r,cc=c;
 while(cell(b,rr,cc)?.letter){word+=cell(b,rr,cc).letter;positions.push({r:rr,c:cc});rr+=dr;cc+=dc;}
 if(word.length>=2)out.push({word,positions,dr,dc});}return out;
}
function openingBoard(b,draft){
 if(!b.opening)return {ok:true,board:b,kept:[],removed:[]};
 if(!draft.length)return {ok:false,error:'Place at least one tile first.'};
 if(draft.some(t=>!Number.isInteger(t.r)||!Number.isInteger(t.c)||!cell(b,t.r,t.c)?.playable||cell(b,t.r,t.c).letter||!/^[A-Z]$/.test(t.letter)))return {ok:false,error:'Use empty playable squares. The starting letters cannot be overwritten.'};
 const row=draft.every(t=>t.r===draft[0].r),col=draft.every(t=>t.c===draft[0].c);
 if(!row&&!col)return {ok:false,error:'Place all new tiles in one row or column.'};
 const newLetters=new Map(draft.map(t=>[key(t.r,t.c),t.letter]));
 const letter=(r,c)=>cell(b,r,c)?.playable&&(newLetters.get(key(r,c))||cell(b,r,c).letter);
 const directions=draft.length===1?DIRECTIONS:row?[[0,1]]:[[1,0]],kept=new Set();
 for(const [dr,dc]of directions){let {r,c}=draft[0];while(letter(r-dr,c-dc)){r-=dr;c-=dc;}while(letter(r,c)){const sq=cell(b,r,c);if(sq.seedId)kept.add(sq.seedId);r+=dr;c+=dc;}}
 if(!kept.size)return {ok:false,error:'For your first word, use a starting letter in the word itself. Placing a word beside it is not enough.'};
 const effective=clone(b),removed=b.seedWords.filter(s=>!kept.has(s.id)).map(s=>s.id);
 for(const row of effective.cells)for(const sq of row)if(sq.seedId&&!kept.has(sq.seedId)){sq.letter=null;sq.seedId=null;sq.owner=null;}
 effective.opening=false;return {ok:true,board:effective,kept:[...kept],removed};
}
function validate(b,draft,dict,rack){
 if(!Array.isArray(draft))return {ok:false,error:'Place at least one tile first.'};
 const opening=openingBoard(b,draft);if(!opening.ok)return opening;
 const result=baseValidate(opening.board,draft,dict,rack);
 return result.ok?{...result,effectiveBoard:opening.board,keptSeeds:opening.kept,removedSeeds:opening.removed}:result;
}
function ownership(b,draft,result){
 const reused=new Set(),claimed=new Set();
 for(const w of result.words)for(const p of w.positions){claimed.add(key(p.r,p.c));if(cell(b,p.r,p.c)?.letter)reused.add(key(p.r,p.c));}
 // Only directly reused words are captured. No recursive flood along crossings.
 for(const w of sequences(b))if(w.positions.some(p=>reused.has(key(p.r,p.c))))for(const p of w.positions)claimed.add(key(p.r,p.c));
 return claimed;
}
function tally(b){const out={player:0,computer:0,neutral:0};for(const row of b.cells)for(const sq of row)if(sq.letter)out[sq.owner||'neutral']++;return out;}
async function searchMoves(b,lex,dict,options={}){
 if(!b.opening)return search(b,lex,dict,options);
 const all=[],seen=new Set(),groups=b.seedWords;let complete=true,steps=0;
 for(let bits=1;bits<(1<<groups.length);bits++){
  const selectedGroups=groups.filter((_,i)=>bits&(1<<i));
  // A straight main word can only retain seed groups sharing a row or column.
  const canShareLine=['r','c'].some(axis=>selectedGroups[0].positions.some(p=>selectedGroups.every(g=>g.positions.some(q=>q[axis]===p[axis]))));
  const canBridge=selectedGroups[0].positions.some(p=>NEIGHBOURS.some(([dr,dc])=>{const r=p.r+dr,c=p.c+dc;return cell(b,r,c)?.playable&&!cell(b,r,c).letter&&selectedGroups.every(g=>g.positions.some(q=>Math.abs(q.r-r)+Math.abs(q.c-c)===1));}));
  if(!canShareLine&&!canBridge)continue;
  const kept=selectedGroups.map(g=>g.id),variant=clone(b);
  for(const row of variant.cells)for(const sq of row)if(sq.seedId&&!kept.includes(sq.seedId)){sq.letter=null;sq.seedId=null;}
  variant.opening=false;
  const checked=(vb,draft,dict,rack)=>{const result=validate(b,draft,dict,rack);return result.ok&&result.keptSeeds.length===kept.length&&result.keptSeeds.every(id=>kept.includes(id))?result:{ok:false};};
  const result=await search(variant,lex,dict,{...options,check:checked,limit:Math.min(options.perVariantLimit||Infinity,options.limit===undefined?Infinity:options.limit-all.length)});
  steps+=result.steps||0;complete=complete&&result.complete;
  for(const m of result.moves){const id=m.draft.map(t=>key(t.r,t.c)+t.letter).sort().join('|');if(!seen.has(id)){seen.add(id);all.push(m);}}
  if(result.interrupted)return {moves:all,complete:false,interrupted:true,steps};
  if(all.length>=(options.limit||Infinity))return {moves:all,complete:false,steps};
 }
 return {moves:all,complete,steps};
}
function createEngine(data){
 const lex=makeLex(data.words),common=makeLex(data.common),friendly=makeLex([...data.common,...data.stretch]);const dict=lex.set,cache=new WeakMap();
 async function friendlyMoves(b,capacity,deadline=Infinity){let entry=cache.get(b);if(entry?.capacity===capacity)return entry.result;
  const result=await searchMoves(b,friendly,dict,{capacity,deadline,...(b.opening?{perVariantLimit:220}:{limit:2200})});if(!result.interrupted)cache.set(b,{capacity,result});return result;
 }
 async function generate(b,retained,capacity,difficulty='easy',rng=Math.random,deadline=Infinity){
  if(retained.length>capacity)throw Error('Too many retained tiles');
  const kc=count(retained),compatible=m=>retained.length+Object.keys(m.needs).reduce((s,l)=>s+Math.max(0,m.needs[l]-(kc[l]||0)),0)<=capacity;
  const friendlyResult=await friendlyMoves(b,capacity,deadline);let all=friendlyResult.moves,candidates=all.filter(compatible),fallback=false;
  if(!candidates.length){if(friendlyResult.interrupted)return {status:'unknown'};
   const broad=await searchMoves(b,lex,dict,{capacity,retained,limit:48,deadline});candidates=broad.moves;fallback=true;
   if(!candidates.length){if(!broad.complete)return {status:'unknown'};
    const any=all.length?{moves:all,complete:true}:await searchMoves(b,lex,dict,{capacity,limit:1,deadline});
    return {status:any.moves.length?'retained-block':any.complete?'exhausted':'unknown'};
   }
  }
  const choices=shuffle(candidates,rng).slice(0,difficulty==='easy'?24:difficulty==='normal'?16:10);let best=null;
  for(const target of choices){let rack=[...retained],have=count(rack);for(const l of Object.keys(target.needs))for(let n=have[l]||0;n<target.needs[l];n++)rack.push(l);
   for(const m of shuffle(candidates,rng).slice(0,32)){if(m.word===target.word)continue;have=count(rack);const extra=[];for(const l of Object.keys(m.needs))for(let n=have[l]||0;n<m.needs[l];n++)extra.push(l);if(rack.length+extra.length<=capacity)rack.push(...extra);}
   rack=randomFill(rack,capacity,rng);have=count(rack);const legal=candidates.filter(m=>fits(m.needs,have)),distinct=new Set(legal.map(m=>m.word)),familiar=new Set(legal.filter(m=>common.set.has(m.word)).map(m=>m.word));
   const quality=difficulty==='easy'?familiar.size*5+distinct.size:difficulty==='normal'?distinct.size+familiar.size*.7:Math.min(distinct.size,4)+(common.set.has(target.word)?0:6)+rng()*3;
   if(!best||quality>best.quality)best={rack,quality,target,choices:distinct.size};
   if(Date.now()>=deadline)break;
  }
  if(!validate(b,best.target.draft,dict,best.rack).ok)throw Error('Generator verification failed');
  return {status:'ready',rack:best.rack,verified:best.target,choices:best.choices,fallback};
 }
 async function rackMoves(b,rack,deadline=Infinity){
  const f=await friendlyMoves(b,rack.length,deadline),moves=f.moves.filter(m=>fits(m.needs,count(rack)));
  if(moves.length)return {moves,complete:f.complete};if(f.interrupted)return {moves:[],complete:false};
  return searchMoves(b,lex,dict,{rack,capacity:rack.length,limit:80,deadline});
 }
 async function findMove(b,rack){return (await rackMoves(b,rack)).moves[0]||null;}
 function fresh(type='smiley',difficulty='easy',capacity=8,shapeSeed=Math.floor(Math.random()*4294967296)){
  return {version:2,board:makeBoard(type,shapeSeed),difficulty,capacity,racks:{player:[],computer:[]},shots:{player:0,computer:0},phase:'player-refill',lastMove:null,history:[],revision:0,botSeed:shapeSeed,botStartedAt:null,rackNote:null};
 }
 async function newMatch(type='smiley',difficulty='easy',capacity=8,shapeSeed=Math.floor(Math.random()*4294967296)){
  for(let i=0;i<8;i++){
   const state=fresh(type,difficulty,capacity,(shapeSeed+i)>>>0);
   if(!state.board.seedWords.length||sequences(state.board).some(w=>!dict.has(w.word)))continue;
   const out=await generate(state.board,[],capacity,difficulty,seeded(shapeSeed+i));
   if(out.status==='ready'){state.racks.player=out.rack;state.phase='player';return state;}
  }
  throw Error('No verified opening found. Please choose another board.');
 }
 function finishIfNeeded(state){if(state.shots.player>=10&&state.shots.computer>=10){state.phase='finished';state.finishReason='Ten turns each';}return state;}
 function advance(state,actor,event){
  const s={...state,racks:{...state.racks},shots:{...state.shots,[actor]:state.shots[actor]+1},revision:state.revision+1,lastMove:{...event,by:actor}};
  s.history=[...state.history,s.lastMove].slice(-20);
  if(actor==='player'){s.phase='computer';s.botStartedAt=Date.now();s.botSeed=(Math.imul(state.botSeed,1664525)+1013904223)>>>0;}else{s.phase='player-refill';s.botStartedAt=null;}
  return finishIfNeeded(s);
 }
 function commit(state,draft,actor='player'){
  if(state.phase!==(actor==='player'?'player':'computer')||state.shots[actor]>=10)return {ok:false,error:'It is not your turn.'};
  const checked=validate(state.board,draft,dict,state.racks[actor]);if(!checked.ok)return checked;
  const b=clone(checked.effectiveBoard),claimed=ownership(checked.effectiveBoard,draft,checked),rack=[...state.racks[actor]];
  for(const t of draft){rack.splice(rack.indexOf(t.letter),1);cell(b,t.r,t.c).letter=t.letter;}
  for(const k of claimed){const [r,c]=k.split(',').map(Number);cell(b,r,c).owner=actor;}
  const before=tally(state.board),after=tally(b),event={kind:'play',words:checked.words.map(w=>w.word),claimed:[...claimed],gained:after[actor]-before[actor],removedSeeds:checked.removedSeeds};
  const s=advance({...state,board:b,racks:{...state.racks,[actor]:rack},rackNote:null},actor,event);
  return {ok:true,result:checked,state:s};
 }
 async function pass(state,indices,allowUnverified=false,rng=Math.random){
  if(state.phase!=='player'||state.shots.player>=10)return {ok:false,error:'It is not your turn.'};
  if(new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=state.racks.player.length))return {ok:false,error:'Choose valid rack letters to keep.'};
  const kept=indices.map(i=>state.racks.player[i]);let result;
  if(kept.length===state.capacity)result={status:'ready',rack:[...kept]};
  else result=await generate(state.board,kept,state.capacity,state.difficulty,rng);
  if(result.status==='exhausted')return {ok:true,state:{...state,phase:'finished',finishReason:'No legal placements remain'},result};
  if(!result.rack&&!allowUnverified)return {ok:false,reason:result.status,error:result.status==='retained-block'?'Those kept letters leave no room for a verified playable rack. Keep fewer, or pass with them anyway.':'The search is incomplete. Try again, or pass with these letters anyway.'};
  const rack=result.rack||randomFill(kept,state.capacity,rng);
  return {ok:true,state:advance({...state,racks:{...state.racks,player:rack},rackNote:null},'player',{kind:'pass',kept:kept.length,unverified:!result.rack}),result};
 }
 async function refillPlayer(state,rng=Math.random){
  if(state.phase!=='player-refill')return state;
  const result=await generate(state.board,state.racks.player,state.capacity,state.difficulty,rng);
  if(result.status==='exhausted')return {...state,phase:'finished',finishReason:'No legal placements remain'};
  return {...state,phase:'player',racks:{...state.racks,player:state.racks.player.length===state.capacity?[...state.racks.player]:result.rack||randomFill(state.racks.player,state.capacity,rng)},rackNote:result.rack?null:'Your retained letters currently have no verified move. You can pass and choose which letters to replace.'};
 }
 function recognition(word,difficulty){
  const tier=common.set.has(word)?'familiar':friendly.set.has(word)?'stretch':'unfamiliar';
  return {easy:{familiar:.84,stretch:.1,unfamiliar:.015},normal:{familiar:.96,stretch:.5,unfamiliar:.12},hard:{familiar:.995,stretch:.9,unfamiliar:.68}}[difficulty][tier];
 }
 function chooseComputerMove(state,moves,rng=Math.random){
  // Recognition is sampled once per DISTINCT word, never once per placement.
  const grouped=new Map();for(const m of moves){if(!grouped.has(m.word))grouped.set(m.word,[]);grouped.get(m.word).push(m);}
  const opportunities=shuffle([...grouped],rng).slice(0,{easy:4,normal:8,hard:16}[state.difficulty]),recognised=[];
  for(const [word,placements]of opportunities)if(rng()<recognition(word,state.difficulty))for(const move of placements){
   const checked=validate(state.board,move.draft,dict,state.racks.computer);if(!checked.ok)continue;
   const claim=ownership(checked.effectiveBoard,move.draft,checked);let value=0;for(const k of claim){const [r,c]=k.split(',').map(Number),owner=cell(checked.effectiveBoard,r,c)?.owner;value+=owner==='player'?2:owner==='computer'?0:1;}
   recognised.push({...move,value});
  }
  if(!recognised.length)return null;
  if(state.difficulty==='easy')return recognised[Math.floor(rng()*recognised.length)];
  recognised.sort((a,b)=>b.value-a.value);return recognised[Math.floor(rng()*Math.min(state.difficulty==='hard'?2:6,recognised.length))];
 }
 async function computerTurn(state,{deadline=Date.now()+14000,rng=seeded(state.botSeed)}={}){
  if(state.phase!=='computer'||state.shots.computer>=10)return state;
  let s={...state,racks:{...state.racks}},generation=await generate(s.board,s.racks.computer,s.capacity,s.difficulty,rng,deadline);
  if(generation.status==='exhausted')return {...s,phase:'finished',finishReason:'No legal placements remain'};
  if(generation.rack)s.racks.computer=generation.rack;
  else s.racks.computer=randomFill(s.racks.computer,s.capacity,rng);
  let move=null,reason='Could not find a word';
  if(generation.status==='ready'&&Date.now()<deadline){const found=await rackMoves(s.board,s.racks.computer,deadline);move=chooseComputerMove(s,found.moves,rng);}
  if(move){const result=commit(s,move.draft,'computer');if(result.ok)return result.state;}
  if(Date.now()>=deadline)reason='Passed before the thinking limit';
  // A computer pass discards its rack for regeneration on its next turn.
  return advance({...s,racks:{...s.racks,computer:[]}},'computer',{kind:'pass',reason});
 }
 function restore(raw){try{
  const s=JSON.parse(raw),validRack=a=>Array.isArray(a)&&a.length<=s.capacity&&a.every(l=>/^[A-Z]$/.test(l));
  if(s.version!==2||!['smiley','hashtag','random'].includes(s.board?.type)||!['easy','normal','hard'].includes(s.difficulty)||!Number.isInteger(s.capacity)||s.capacity<6||s.capacity>12||!validRack(s.racks?.player)||!validRack(s.racks?.computer)||!['player','player-refill','computer','finished'].includes(s.phase)||!Number.isInteger(s.board.shapeSeed)||s.board.shapeSeed<0||s.board.shapeSeed>4294967295||!Number.isInteger(s.revision)||s.revision<0||!Number.isInteger(s.botSeed)||!Array.isArray(s.history)||s.history.length>20)return null;
  const validEvent=x=>x&&['player','computer'].includes(x.by)&&['play','pass'].includes(x.kind)&&(x.kind==='pass'||Array.isArray(x.words)&&x.words.every(w=>typeof w==='string'&&dict.has(w))&&Array.isArray(x.claimed)&&x.claimed.every(k=>/^\d+,\d+$/.test(k)));
  if(s.lastMove!==null&&!validEvent(s.lastMove)||s.history.some(x=>!validEvent(x)))return null;
  if(!['player','computer'].every(a=>Number.isInteger(s.shots?.[a])&&s.shots[a]>=0&&s.shots[a]<=10))return null;
  const delta=s.shots.player-s.shots.computer;if(delta<0||delta>1||s.phase==='computer'&&delta!==1||['player','player-refill'].includes(s.phase)&&(delta!==0||s.shots.player>=10))return null;
  if(s.phase==='computer'&&(!Number.isFinite(s.botStartedAt)||s.botStartedAt<0))return null;
  if(s.phase==='player'&&s.racks.player.length!==s.capacity)return null;
  const b=makeBoard(s.board.type,s.board.shapeSeed);if(typeof s.board.opening!=='boolean'||s.board.cells.length!==b.cells.length)return null;
  b.opening=s.board.opening;let played=false;
  for(let r=0;r<b.cells.length;r++){if(s.board.cells[r].length!==b.cells[r].length)return null;for(let c=0;c<b.cells[r].length;c++){
   const saved=s.board.cells[r][c],sq=b.cells[r][c];
   if(saved.playable!==sq.playable||saved.letter!==null&&!/^[A-Z]$/.test(saved.letter)||saved.letter&&!sq.playable||![null,'player','computer'].includes(saved.owner)||saved.owner&&!saved.letter)return null;
   if(b.opening&&(saved.letter!==sq.letter||saved.owner!==null))return null;
   if(!b.opening&&saved.letter&&!saved.owner)return null;
   sq.letter=saved.letter;sq.owner=saved.owner;sq.seedId=sq.letter&&saved.seedId===sq.seedId?sq.seedId:null;if(saved.owner)played=true;
  }}
  if(!b.opening&&!played)return null;
  if(sequences(b).some(w=>!dict.has(w.word)))return null;
  if(!b.opening){const letters=[];for(let r=0;r<b.cells.length;r++)for(let c=0;c<b.cells[r].length;c++)if(cell(b,r,c).letter)letters.push([r,c]);
   const seen=new Set(),queue=[letters[0]];while(queue.length){const [r,c]=queue.pop();if(seen.has(key(r,c)))continue;seen.add(key(r,c));for(const [dr,dc]of NEIGHBOURS)if(cell(b,r+dr,c+dc)?.letter&&!seen.has(key(r+dr,c+dc)))queue.push([r+dr,c+dc]);}if(seen.size!==letters.length)return null;}
  return {...s,board:b};
 }catch{return null;}}
 return {dict,lex,common,friendly,generate,rackMoves,findMove,fresh,newMatch,commit,pass,refillPlayer,computerTurn,chooseComputerMove,recognition,restore,validate:(b,d,r)=>validate(b,d,dict,r)};
}
const api={makeBoard,cell,key,count,fits,shuffle,seeded,clone,tally,sequences,openingBoard,ownership,validate,baseValidate,makeLex,search,searchMoves,createEngine};
if(typeof module!=='undefined')module.exports=api;else root.WordRamble=api;
})(typeof window!=='undefined'?window:this);

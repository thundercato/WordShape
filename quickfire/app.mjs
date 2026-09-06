import {createRound,act,SIZE} from './engine.mjs';

const $=id=>document.getElementById(id);
const board=$('board'),rack=$('rack'),pass=$('pass-button'),help=$('help-dialog'),feedback=$('feedback');
const overlay=$('board-overlay'),overlayTitle=$('overlay-title'),overlayCopy=$('overlay-copy'),overlayButton=$('overlay-button');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let dictionary,state,locked=true,started=false,pendingDensity=10,generation=0;
let tiles=[],rackButtons=[],elapsed=0,lastTick=performance.now(),audioContext,muted=false;
try{muted=localStorage.getItem('letteramble-quickfire-muted')==='true';}catch{}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,reduced?Math.min(ms,120):ms));
const fmt=ms=>{const s=Math.floor(ms/1000);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
const icons={sound:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>',mute:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="m16 9 5 6m0-6-5 6"/></svg>'};
function soundButton(){const b=$('sound-button');b.innerHTML=muted?icons.mute:icons.sound;b.setAttribute('aria-pressed',String(muted));b.setAttribute('aria-label',muted?'Turn sound on':'Mute sound');b.title=muted?'Turn sound on':'Mute sound';}
function unlockAudio(){
  if(muted)return;
  try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});}catch{}
}
function sound(kind){
  if(muted||!audioContext||audioContext.state!=='running')return;
  const ctx=audioContext,t=ctx.currentTime;
  function note(frequency,start,duration,type='sine',volume=.13){
    const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,t+start);gain.gain.setValueAtTime(.0001,t+start);gain.gain.exponentialRampToValueAtTime(volume,t+start+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+start+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(t+start);osc.stop(t+start+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  if(kind==='correct'){note(659,0,.18);note(988,.075,.28);}
  if(kind==='gold'){[659,831,988,1318].forEach((f,i)=>note(f,i*.07,.32,'sine',.10));}
  if(kind==='wrong'){note(247,0,.15,'triangle',.13);note(165,.14,.22,'triangle',.13);}
  if(kind==='new'){[392,523,659].forEach((f,i)=>note(f,i*.055,.2,'sine',.06));}
  if(kind==='pass'){
    const duration=.18,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(2400,t);filter.frequency.exponentialRampToValueAtTime(450,t+duration);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.12,t+.035);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(t);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
}
function say(text,kind=''){feedback.textContent=text;feedback.className=`feedback ${kind}`;}
function setLocked(value){locked=value;const disabled=value||help.open||!state||state.ended;pass.disabled=disabled;rackButtons.forEach(b=>b.disabled=disabled);}
function buildBoard(){
  board.replaceChildren();tiles=[];board.className='board';
  for(let r=0;r<SIZE;r++){
    const row=document.createElement('div');row.className='board-row';row.setAttribute('role','row');row.setAttribute('aria-rowindex',r+1);
    for(let c=0;c<SIZE;c++){
      const index=r*SIZE+c,tile=document.createElement('div');tile.className='tile';tile.setAttribute('role','gridcell');tile.setAttribute('aria-colindex',c+1);tile.dataset.index=index;
      tile.style.setProperty('--delay',`${r*24+Math.random()*95}ms`);
      tile.style.setProperty('--tx',`${(c-5.5)*30+(Math.random()-.5)*45}px`);
      tile.style.setProperty('--ty',`${(r-5.5)*30-45}px`);
      tile.style.setProperty('--rot',`${(Math.random()-.5)*140}deg`);
      tile.style.setProperty('--explode-delay',`${Math.random()*80}ms`);
      row.append(tile);tiles.push(tile);
    }
    board.append(row);
  }
}
function buildRack(){
  rack.replaceChildren();rackButtons=[];
  for(let slot=0;slot<12;slot++){
    const b=document.createElement('button');b.className='rack-tile';b.disabled=true;b.addEventListener('click',()=>handle({type:'letter',slot}));rack.append(b);rackButtons.push(b);
  }
}
function render({drop=false}={}){
  const found=new Set(state.found.flatMap(w=>w.cells));
  for(let i=0;i<tiles.length;i++){
    const tile=tiles[i],letter=state.board[i],gap=state.gaps[i],active=i===state.active&&!state.ended;
    let className='tile';
    if(letter===null)className+=' gap';
    if(found.has(i))className+=' found';
    if(gap?.reward)className+=` reward ${gap.reward}`;
    else if(letter===null&&gap?.shownMisses)className+=gap.shownMisses===1?' amber':' red';
    if(active)className+=' active';
    if(drop)className+=' bounce';
    tile.className=className;tile.textContent=letter??'?';
    if(active)tile.setAttribute('aria-current','true');else tile.removeAttribute('aria-current');
    const status=gap?.reward?`, solved ${gap.reward}`:letter===null&&gap?.shownMisses?`, ${gap.shownMisses===1?'1 point':'0 points'} available`:'';
    tile.setAttribute('aria-label',`${letter??'Gap'}, row ${Math.floor(i/SIZE)+1}, column ${i%SIZE+1}${active?', active':''}${status}`);
  }
  rackButtons.forEach((b,i)=>{b.textContent=state.rack[i];b.setAttribute('aria-label',`Place ${state.rack[i]}`);b.className='rack-tile';});
  $('score').textContent=state.score;$('word-count').textContent=state.totalWords;$('board-number').textContent=String(state.round).padStart(2,'0');
  $('gap-count').textContent=`${state.board.filter(l=>l===null).length} gaps left`;
  document.querySelectorAll('[data-density]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.density)===pendingDensity));b.classList.toggle('pending',Number(b.dataset.density)===pendingDensity&&pendingDensity!==state.density);});
  setLocked(locked);
}
function overlayMessage(title,copy,buttonText=null,callback=null){overlay.hidden=false;overlayTitle.textContent=title;overlayCopy.textContent=copy;overlayButton.hidden=!buttonText;overlayButton.textContent=buttonText||'';overlayButton.onclick=callback;}
function celebrate(event){
  const el=$('celebration');el.replaceChildren();
  const longest=[...event.words].sort((a,b)=>b.word.length-a.word.length);
  const displayed=event.colour==='gold'?[longest[0],longest.find(w=>w.direction!==longest[0].direction)]:[longest[0]];
  const label=document.createElement('span');label.textContent=displayed.filter(Boolean).map(w=>w.word).join(' + ');
  const points=document.createElement('b');points.textContent=event.colour==='gold'?'DOUBLE! +5':event.points?`+${event.points}`:'Fresh letter!';
  el.append(label,points);el.className=`celebration show ${event.colour}`;
}
async function newRound({first=false}={}){
  const token=++generation;setLocked(true);
  try{
    await new Promise(resolve=>requestAnimationFrame(resolve));
    state=createRound({density:pendingDensity,dictionary,score:state?.score||0,totalWords:state?.totalWords||0,round:first?1:(state?.round||0)+1});
    if(token!==generation)return;
    buildBoard();render({drop:true});overlay.hidden=true;$('celebration').className='celebration';
    say('Find a word through the sparkling ?');sound('new');
    await wait(900);
    if(token!==generation)return;
    tiles.forEach(t=>t.classList.remove('bounce'));setLocked(false);started=true;lastTick=performance.now();
  }catch(error){console.error(error);overlayMessage('Those letters got tangled.','Let’s shuffle another board.','Try again',()=>newRound({first}));}
}
async function completeRound(token){
  setLocked(true);
  const allDone=state.board.every(l=>l!==null);
  overlayMessage(allDone?'Board cleared!':'Board complete!',`${state.roundWords} words · ${state.roundPoints} points. ${allDone?'Every gap filled.':'No gaps match your rack.'}`);
  say('Fresh letters coming up…');
  await wait(2300);
  // Do not replace a board while the player is reading instructions or away.
  if(token!==generation)return;
  if(help.open||document.hidden){overlayButton.hidden=false;overlayButton.textContent='Next board';overlayButton.onclick=()=>transitionRound(token);return;}
  await transitionRound(token);
}
async function transitionRound(token){
  if(token!==generation)return;
  overlay.hidden=true;board.classList.add('exploding');sound('pass');
  await wait(680);
  if(token===generation)await newRound();
}
async function handle(action){
  if(locked||help.open||!state||state.ended)return;
  unlockAudio();setLocked(true);const token=generation;
  const event=act(state,action,dictionary);
  if(event.kind==='ignored'){setLocked(false);return;}
  if(event.kind==='wrong'){
    sound('wrong');tiles[event.index].classList.add('wobble');rackButtons[event.slot].classList.add('wobble');say('Not a word this time. Try the next gap.','error');
    await wait(300);if(token!==generation)return;render();
  }else if(event.kind==='pass'){
    sound('pass');render();say('Next gap. You can come back to that one.');await wait(80);
  }else{
    sound(event.colour==='gold'?'gold':'correct');render();
    // Keep the next active square quiet while the completed word celebrates.
    if(state.active!==null)tiles[state.active].classList.remove('active');
    const cells=new Set(event.words.flatMap(w=>w.cells));cells.forEach(i=>tiles[i].classList.add('word-pop'));rackButtons[event.slot].classList.add('replacing');celebrate(event);
    const words=[...new Set(event.words.map(w=>w.word))].sort((a,b)=>b.length-a.length);
    say(`${words.join(' + ')}${event.colour==='gold'?' · Double!':''} · ${event.points?`+${event.points}`:'Fresh letter'}`,event.colour==='gold'?'double':'success');
    await wait(event.colour==='gold'?740:600);if(token!==generation)return;
    cells.forEach(i=>tiles[i].classList.remove('word-pop'));rackButtons[event.slot].classList.remove('replacing');$('celebration').className='celebration';
    if(state.active!==null&&!state.ended)tiles[state.active].classList.add('active');
  }
  if(token!==generation)return;
  if(state.ended)await completeRound(token);else setLocked(false);
}
async function load(){
  overlayMessage('Getting the letters ready…','A little word spotting. A lot of quick thinking.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(new URL('./words.txt',import.meta.url),{signal:controller.signal});if(!response.ok)throw new Error('Dictionary could not be loaded.');
    const text=await response.text();dictionary=new Set(text.split(/\s+/).filter(w=>/^[A-Z]{3,12}$/.test(w)));
    if(dictionary.size<50000||!dictionary.has('HAPPY')||!dictionary.has('WALKING'))throw new Error('Incomplete dictionary.');
    await newRound({first:true});
  }catch(error){console.error(error);overlayMessage('The dictionary hasn’t arrived.','Check your connection, then try again.','Retry',load);}finally{clearTimeout(timeout);}
}
pass.addEventListener('click',()=>handle({type:'pass'}));
$('sound-button').addEventListener('click',()=>{muted=!muted;try{localStorage.setItem('letteramble-quickfire-muted',String(muted));}catch{}soundButton();if(!muted){unlockAudio();setTimeout(()=>sound('correct'),70);}});
$('help-button').addEventListener('click',()=>{help.showModal();$('game').classList.add('paused');setLocked(locked);});
const closeHelp=()=>help.close();$('close-help').addEventListener('click',closeHelp);$('play-button').addEventListener('click',closeHelp);
help.addEventListener('close',()=>{$('game').classList.remove('paused');lastTick=performance.now();setLocked(locked);unlockAudio();});
help.addEventListener('click',e=>{if(e.target===help){const r=help.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeHelp();}});
document.querySelectorAll('[data-density]').forEach(b=>b.addEventListener('click',async()=>{
  if(locked)return;
  const chosen=Number(b.dataset.density);if(chosen===pendingDensity)return;pendingDensity=chosen;
  if(state&&state.filled===0&&Object.values(state.gaps).every(g=>g.misses===0)){
    state.round=Math.max(0,state.round-1);await newRound();
  }else{render();say(`${chosen} planted words on your next board.`);}
}));
document.addEventListener('keydown',e=>{
  if(help.open||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
  if(e.code==='Space'){
    // Space still activates focussed help/settings controls normally.
    if(document.activeElement?.matches('button:not(.rack-tile):not(.pass-button)'))return;
    e.preventDefault();handle({type:'pass'});
  }else if(/^[a-z]$/i.test(e.key)&&state){const slot=state.rack.indexOf(e.key.toUpperCase());if(slot!==-1){e.preventDefault();handle({type:'letter',slot});}}
});
document.addEventListener('pointerdown',unlockAudio,{passive:true});
document.addEventListener('visibilitychange',()=>{lastTick=performance.now();});
setInterval(()=>{const now=performance.now();if(started&&!help.open&&!document.hidden&&state&&!state.ended)elapsed+=now-lastTick;lastTick=now;$('timer').textContent=fmt(elapsed);},250);
soundButton();buildRack();load();
